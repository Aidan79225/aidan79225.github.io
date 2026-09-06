---
title: "Window Functions: Aggregation Without Collapsing"
date: 2026-07-09
category: tech
description: "Whether someone knows window functions is close to the dividing line for how deep their SQL goes. They differ from GROUP BY by one thing: no collapsing — keep every row, and compute a \"whole-group\" value beside each one. Master the three knobs of OVER (PARTITION BY, ORDER BY, frame) and ranking, period-over-period, running totals and top N per group all unlock."
tags:
  - sql
  - concept
  - window-function
series: "SQL: I Thought I Knew It"
seriesOrder: 5
comments: true
draft: false
translationOf: sql-window
---
[[sql-group-by|The previous post]]'s `GROUP BY` collapses each group into one row. But you've surely met this need: **"I want a whole-group computation, and I want to keep every row."** For example — beside each order, mark what share it is of that customer's total; or beside each month's revenue, mark the difference from last month. Collapsing can't do it, because once collapsed you don't even have "each row" any more. That's the window function: **aggregation without collapsing**. It's the dividing line between SQL that "works" and SQL that's "good", and the foundation for a pile of analytical moves later in this series.

## Window function = aggregation without collapsing

Same data, same `SUM`; the difference between `GROUP BY` and `OVER` is exactly one thing: **whether the rows get collapsed**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 282" role="img" aria-label="The same four order rows A100 A250 B80 B120: GROUP BY customer collapses them into two rows, A total 350 and B total 200; SUM OVER PARTITION BY customer doesn't collapse, still four rows, each just gaining a column with its group total 350 or 200" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="wm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="18" fill="#9aa4b2" font-size="9.5" text-anchor="middle" font-weight="bold">Input (orders): 4 rows</text>
    <rect x="112" y="28" width="92" height="30" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.3"/><text x="158" y="47" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A · 100</text>
    <rect x="210" y="28" width="92" height="30" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.3"/><text x="256" y="47" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A · 250</text>
    <rect x="308" y="28" width="92" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="354" y="47" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B · 80</text>
    <rect x="406" y="28" width="92" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="452" y="47" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B · 120</text>
    <line x1="250" y1="58" x2="150" y2="92" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#wm)"/>
    <line x1="330" y1="58" x2="430" y2="92" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#wm)"/>
    <text x="146" y="106" fill="#e6e6e6" font-size="10" text-anchor="middle" font-weight="bold">GROUP BY (collapses)</text>
    <rect x="72" y="116" width="150" height="32" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="147" y="136" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A · SUM 350</text>
    <rect x="72" y="154" width="150" height="32" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="147" y="174" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B · SUM 200</text>
    <text x="147" y="210" fill="#9aa4b2" font-size="8.5" text-anchor="middle">4 rows → 2 rows (one per group)</text>
    <text x="432" y="106" fill="#e6e6e6" font-size="10" text-anchor="middle" font-weight="bold">SUM() OVER (no collapsing)</text>
    <rect x="348" y="116" width="180" height="28" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/><text x="358" y="134" fill="#e6e6e6" font-size="9" text-anchor="start">A · 100</text><text x="518" y="134" fill="#d6a45c" font-size="9" text-anchor="end">group 350</text>
    <rect x="348" y="148" width="180" height="28" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/><text x="358" y="166" fill="#e6e6e6" font-size="9" text-anchor="start">A · 250</text><text x="518" y="166" fill="#d6a45c" font-size="9" text-anchor="end">group 350</text>
    <rect x="348" y="180" width="180" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="358" y="198" fill="#e6e6e6" font-size="9" text-anchor="start">B · 80</text><text x="518" y="198" fill="#d6a45c" font-size="9" text-anchor="end">group 200</text>
    <rect x="348" y="212" width="180" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="358" y="230" fill="#e6e6e6" font-size="9" text-anchor="start">B · 120</text><text x="518" y="230" fill="#d6a45c" font-size="9" text-anchor="end">group 200</text>
    <text x="438" y="258" fill="#9aa4b2" font-size="8.5" text-anchor="middle">4 rows → 4 rows (each gains a whole-group value)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">On the left, <code>GROUP BY</code> collapses the rows away; on the right, <code>SUM() OVER (PARTITION BY customer)</code> keeps every row and just computes a "group total" alongside. With each row and its group total side by side, you can compute "what % of the group is this row" — something collapsing can never do</figcaption>
</figure>

In one sentence: **`GROUP BY` is "many rows become one"; a window function is "beside each row, one more value computed over the whole group".** The rows are still there, so you can compare "one row vs the whole group".

## The three knobs of OVER

A window function's power is all inside the `OVER (...)` parentheses, which break down into three knobs:

```sql
SUM(amount) OVER (
  PARTITION BY customer    -- ① group: but don't collapse (omit it and the whole table is one group)
  ORDER BY order_date      -- ② order within the group: defines "so far"
  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW  -- ③ frame: which range each row looks at
)
```

The first two are easy; the third, the **frame**, is the one most people never get straight and most often get bitten by. The frame decides "when computing this row, which rows of the group are included". Take a running total: each row's frame is "from the start to the current row", so the sum grows row by row:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 244" role="img" aria-label="Customer A's four rows sorted by date: 2/01 100, 2/02 50, 2/03 80, 2/04 30. When the current row is 2/03, the frame is drawn with a dashed box around the three rows from the start to this one, and the running SUM is 100 plus 50 plus 80 equals 230. The running-total column reads 100, 150, 230, 260" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="fm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="280" y="20" fill="#9aa4b2" font-size="9.5" text-anchor="middle" font-weight="bold">Customer A's rows, sorted by date (one PARTITION)</text>
    <rect x="150" y="36" width="150" height="108" rx="8" fill="none" stroke="#d6a45c" stroke-width="1.5" stroke-dasharray="5 4"/>
    <rect x="160" y="42" width="130" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="225" y="61" fill="#e6e6e6" font-size="9.5" text-anchor="middle">2/01 · 100</text>
    <rect x="160" y="76" width="130" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="225" y="95" fill="#e6e6e6" font-size="9.5" text-anchor="middle">2/02 · 50</text>
    <rect x="160" y="110" width="130" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/><text x="225" y="129" fill="#e6e6e6" font-size="9.5" text-anchor="middle">2/03 · 80 ← current</text>
    <rect x="160" y="150" width="130" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="225" y="169" fill="#e6e6e6" font-size="9.5" text-anchor="middle">2/04 · 30</text>
    <text x="112" y="92" fill="#d6a45c" font-size="9" text-anchor="middle">frame</text>
    <text x="112" y="105" fill="#9aa4b2" font-size="7.5" text-anchor="middle">start → current</text>
    <text x="360" y="30" fill="#9aa4b2" font-size="9" text-anchor="middle">running SUM</text>
    <text x="360" y="61" fill="#9aa4b2" font-size="9.5" text-anchor="middle">100</text>
    <text x="360" y="95" fill="#9aa4b2" font-size="9.5" text-anchor="middle">150</text>
    <text x="360" y="129" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">230</text>
    <text x="360" y="169" fill="#9aa4b2" font-size="9.5" text-anchor="middle">260</text>
    <line x1="292" y1="125" x2="342" y2="125" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#fm)"/>
    <text x="280" y="206" fill="#d6a45c" font-size="8.8" text-anchor="middle">With 2/03 current, the frame spans start → this row → running total = 100 + 50 + 80 = 230</text>
    <text x="280" y="226" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Change the frame to ROWS BETWEEN 2 PRECEDING AND CURRENT ROW and it becomes a 3-day moving average</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The frame is a window that slides with the "current row". A running total is "start → current row"; a moving average is "N rows back → current row" — change the frame and you change the meaning of the whole computation</figcaption>
</figure>

**One trap you must remember here: the frame's default.** When you write `ORDER BY` but no frame, the default is "start → current row" (a running total); with no `ORDER BY`, the default is "the whole partition" (a group total). So `SUM() OVER (PARTITION BY c)` is a **group total**, but `SUM() OVER (PARTITION BY c ORDER BY d)` becomes a **running total** — one `ORDER BY` changes the meaning, and many people silently compute the wrong thing here.

## The three most-used kinds of window function

- **Ranking**: `ROW_NUMBER()` (1,2,3… always unique), `RANK()` (ties share a rank and skip: 1,1,3), `DENSE_RANK()` (ties share a rank, no skipping: 1,1,2).
- **Offset**: `LAG()` / `LEAD()` fetch the previous / next row's value. Period-over-period in one line: `sales - LAG(sales) OVER (ORDER BY month)`.
- **Aggregates as windows**: `SUM` / `AVG` / `COUNT` plus `OVER`, with a frame, for running totals, moving averages, shares.

## The classic move: top N per group

"Top 3 by sales in each category" is the most iconic use of window functions, and it lands right on [[sql-execution-order|the first post]]'s processing order — a window function is computed in the `SELECT` (⑤) stage, so **it can't go directly in `WHERE` (②)**; compute the rank in a subquery first, then filter in the outer layer:

```sql
SELECT * FROM (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY sales DESC) AS rn
  FROM products
) t
WHERE rn <= 3;   -- top 3 per category
```

That old question, "why must it be wrapped in a subquery", is again answered by the processing order: by the time `ROW_NUMBER` is computed, `WHERE` has long since run.

## Reflections

### The words "no collapsing" open up a whole new territory

I still remember the first time I used a window function — SQL suddenly "levelled up". A lot of things that used to mean joining back to yourself or hand-building piles of correlated subqueries (each row's share, comparison with the previous row, ranking within a group) were solved by one `OVER`, fast and readable. The key insight extends [[sql-group-by|the previous post]]: `GROUP BY` collapses the rows away, and you lose "the single row"; a window function keeps every row, which is what makes "this row vs its group" comparisons possible. **The essence of many analytical requirements is "the relationship between a row and the group it belongs to", and that's exactly what window functions were born to do.**

### The frame default is the trap I've seen the most people fall into

Is `SUM() OVER (PARTITION BY c ORDER BY d)` a group total or a running total? The only difference is whether you wrote `ORDER BY`, and the results are worlds apart. It's exactly the spirit of [[sql-null|the NULL post]]: **if you don't understand the default behaviour, you'll write queries that "run, look right, and are wrong".** When I write running or group totals now, I always spell the frame out (`ROWS BETWEEN ...`) rather than relying on the default — one extra line, in exchange for eliminating a whole class of hard-to-catch bugs. A bargain.

### Window functions are the dividing line of analytical SQL

Honestly, whether someone knows window functions is close to the line I use to judge how deep their SQL goes. It's not just a convenient function; it's **a way of looking at data** — putting each row back into the group and sequence it belongs to. The next several moves in this series — dedupe to the latest, contiguous ranges (gaps and islands), slowly changing dimensions (SCD) — are all, underneath, applications of window functions. So **get fluent with the three knobs of `OVER`, and your SQL has truly entered the door of analytics.**
