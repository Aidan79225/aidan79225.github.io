---
title: "The Truth About JOIN: Cartesian Product First, Then Filter"
date: 2026-07-08
category: tech
description: "Many people picture JOIN as \"gluing two tables together\" and then memorise what INNER/LEFT/RIGHT each do. You only need one model: every JOIN first lists every combination of rows from both tables (the Cartesian product), then filters with ON. Understand that, and even the trap nearly everyone has hit — a LEFT JOIN quietly turned back into INNER by WHERE — is seen through at once."
tags:
  - sql
  - concept
series: "SQL: I Thought I Knew It"
seriesOrder: 2
comments: true
draft: false
translationOf: sql-joins
---
[[sql-execution-order|The previous post]] made clear that "the order you write isn't the order it runs". This post uses the same key to open up JOIN. Many people picture JOIN as "gluing two tables together" and then rote-learn what INNER/LEFT/RIGHT/FULL each do. But they all **share one model**: list every combination of rows from both tables (the Cartesian product), then filter with `ON`. Understand that sentence and even the most common LEFT JOIN trap is seen through at once.

## Every JOIN is one model

Conceptually, `A JOIN B ON condition` does two things: **① pair every row of A with every row of B (the Cartesian product); ② keep only the combinations where the "condition" holds.** The only difference is "after filtering, do we pad a row for the ones that matched nothing":

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 296" role="img" aria-label="The left table has three users A, B, C; the right table has three orders belonging to A, A, B. Pairing every left row with every right row gives a 3 by 3 grid; the three cells where the keys match are green (A matches two cells, B one, C none). INNER keeps only the green cells, three rows; LEFT also pads one NULL row for the unmatched C, four rows" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="271" y="24" fill="#9aa4b2" font-size="9.5" text-anchor="middle">Right table R: orders (user column)</text>
    <text x="189" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">A</text>
    <text x="271" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">A</text>
    <text x="353" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">B</text>
    <text x="20" y="158" fill="#9aa4b2" font-size="9.5" text-anchor="middle" transform="rotate(-90 20 158)">Left table L: users</text>
    <text x="92" y="98" fill="#e6e6e6" font-size="9.5" text-anchor="middle">user A</text>
    <text x="92" y="162" fill="#e6e6e6" font-size="9.5" text-anchor="middle">user B</text>
    <text x="92" y="226" fill="#e6e6e6" font-size="9.5" text-anchor="middle">user C</text>
    <rect x="150" y="64" width="78" height="60" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="189" y="98" fill="#54b890" font-size="10" text-anchor="middle">✓</text>
    <rect x="232" y="64" width="78" height="60" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="271" y="98" fill="#54b890" font-size="10" text-anchor="middle">✓</text>
    <rect x="314" y="64" width="78" height="60" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="4 3"/>
    <rect x="150" y="128" width="78" height="60" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="4 3"/>
    <rect x="232" y="128" width="78" height="60" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="4 3"/>
    <rect x="314" y="128" width="78" height="60" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="353" y="162" fill="#54b890" font-size="10" text-anchor="middle">✓</text>
    <rect x="150" y="192" width="78" height="60" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="4 3"/>
    <rect x="232" y="192" width="78" height="60" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="4 3"/>
    <rect x="314" y="192" width="78" height="60" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="4 3"/>
    <text x="404" y="90" fill="#54b890" font-size="8.5" text-anchor="start">A matches 2 rows</text>
    <text x="404" y="102" fill="#9aa4b2" font-size="8" text-anchor="start">→ A appears twice</text>
    <text x="404" y="160" fill="#9aa4b2" font-size="8.5" text-anchor="start">B matches 1 row</text>
    <text x="404" y="212" fill="#9aa4b2" font-size="8.5" text-anchor="start">C matches none →</text>
    <text x="404" y="224" fill="#9aa4b2" font-size="8" text-anchor="start">INNER drops it</text>
    <text x="404" y="236" fill="#d6a45c" font-size="8" text-anchor="start">LEFT pads (C, NULL)</text>
    <rect x="150" y="266" width="13" height="11" rx="2" fill="#2e4a40" stroke="#54b890" stroke-width="1.2"/><text x="169" y="276" fill="#9aa4b2" font-size="8.5" text-anchor="start">ON holds (kept)</text>
    <rect x="300" y="266" width="13" height="11" rx="2" fill="#1f2330" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="3 2"/><text x="319" y="276" fill="#9aa4b2" font-size="8.5" text-anchor="start">doesn't hold (dropped)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Pair every left row with every right row (9 cells), then keep the ones where the keys are equal with <code>ON</code> (green). <b>INNER</b> = green cells only (3 rows); <b>LEFT</b> = green cells + one padded <code>NULL</code> row for the unmatched C (4 rows). Note in passing: A matches two rows, so A appears twice in the result — that's the join's "amplification" side effect</figcaption>
</figure>

With this model the four JOINs need no memorising; they differ only in "which side is kept after filtering":

- **INNER**: only the green cells (matched on both sides).
- **LEFT**: guarantees **every left row appears at least once**; pad `NULL` where the right side matched nothing.
- **RIGHT**: the reverse — every right row is guaranteed.
- **FULL**: both sides guaranteed; whoever didn't match gets `NULL` padding.
- **CROSS**: no filtering at all — the complete Cartesian product (all 9 cells).

And one side effect you must remember: **one-to-many multiplies the row count (fan-out).** In the diagram A matches 2 orders, so A appears as 2 rows. When you `SUM` after a join, this **double counts** — the classic culprit behind report totals that mysteriously grow.

## Doesn't the Cartesian product blow up memory?

This is the scariest part of "Cartesian product then filter": two tables of a million rows each multiply to 10^12 rows — if that were actually computed, what machine could take it? **The good news: the product is a "logical model", there to help you reason about the answer; the engine never actually materialises it.** The optimizer picks a join algorithm that **discards non-matches as it pairs, so the product never lands anywhere**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 200" role="img" aria-label="On the left, the logical model in your head: all N by M combinations expanded then filtered, with a note that the engine never actually computes this table; on the right, what the engine really does, using Hash Join as the example: build the small table into a hash table in memory, probe row by row with the big table and emit matches, so memory is proportional to the small table rather than N by M" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="jm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="300" y1="28" x2="300" y2="184" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="5 4"/>
    <text x="150" y="40" fill="#9aa4b2" font-size="10.5" text-anchor="middle" font-weight="bold">The model in your head (logical)</text>
    <rect x="38" y="56" width="224" height="86" rx="8" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="5 4"/>
    <text x="150" y="94" fill="#9aa4b2" font-size="17" text-anchor="middle">N × M</text>
    <text x="150" y="114" fill="#9aa4b2" font-size="8.8" text-anchor="middle">expand every combination → filter with ON</text>
    <text x="150" y="170" fill="#d6a45c" font-size="9.5" text-anchor="middle">⚠ the engine never computes this table</text>
    <text x="452" y="40" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">What the engine does (e.g. Hash Join)</text>
    <rect x="322" y="56" width="76" height="30" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="360" y="75" fill="#e6e6e6" font-size="9.5" text-anchor="middle">small R</text>
    <line x1="400" y1="71" x2="428" y2="71" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#jm)"/>
    <rect x="432" y="56" width="150" height="30" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="507" y="75" fill="#e6e6e6" font-size="8.8" text-anchor="middle">build hash table (in memory)</text>
    <rect x="322" y="104" width="76" height="30" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="360" y="123" fill="#e6e6e6" font-size="9.5" text-anchor="middle">big L</text>
    <line x1="400" y1="119" x2="428" y2="119" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#jm)"/>
    <rect x="432" y="104" width="150" height="30" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="507" y="123" fill="#e6e6e6" font-size="8.5" text-anchor="middle">probe row by row → emit matches</text>
    <line x1="507" y1="104" x2="507" y2="88" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#jm)"/>
    <text x="452" y="170" fill="#54b890" font-size="9.5" text-anchor="middle">memory ∝ small table, not N × M ✓</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">That N×M table on the left exists only in your head, to help you derive the answer; the engine actually picks an algorithm (Hash Join here) and discards as it pairs, so the product never lands. A single join therefore doesn't use N×M memory</figcaption>
</figure>

So does a join use memory or not? It does, but the cost isn't in "the product" — it's in these two places.

**One: the join algorithm itself.** The optimizer picks an approach based on table sizes, indexes and existing sort order, and their memory appetites differ a lot:

- **Nested Loop**: for each outer row, search the inner table one by one. Almost no extra memory, but slow without an index — suited to small tables, or when the inner table happens to have an index to look up.
- **Hash Join**: build the **smaller side** into a hash table in memory, stream the big table past it to probe. Memory ∝ **the small table's size** — the most common place a join eats memory.
- **Merge Join**: requires both sides **already sorted**; if not, they have to be sorted first, and the sort buffer costs memory too.

(How to recognise these three in `EXPLAIN`, and what the optimizer bases its choice on, gets its own post later in this series. For now grab one sentence: **a join's memory comes mainly from hash tables and sorts, not from the product.**)

**Two: fan-out inflates the result.** The join itself doesn't materialise the product, but one-to-many inflating the **output** row count is very real: A matches 100 rows, the result has 100 rows. That inflated result genuinely exists, and when you then `ORDER BY` or `GROUP BY` it, sorting and aggregation have more data to handle. **So a join's memory pain is often not in the join step itself, but in the step downstream that receives the inflated output.**

In **PostgreSQL**, how much memory hash tables and sorts may use is governed by the `work_mem` parameter. **Exceed the cap and it spills to disk** (writing temp files) — the result is slowdown, not an outright OOM; that's its safety valve. The thing to watch is the other end: set `work_mem` too high, with many nodes running in parallel, and the sum can genuinely exhaust the whole machine's memory.

You've actually seen the extreme version of this in [[spark-shuffle|the Spark post]]: **a broadcast join copies the small table to every executor**, which is essentially "the build side of a Hash Join" moved to a distributed setting — if the small table is too big, every node's memory blows together. A single machine's `work_mem` spill and a distributed broadcast limit are the same principle at two scales.

## The LEFT JOIN trap nearly everyone has fallen into

You want to "list **all** users, along with their **paid** orders, keeping users with no orders too". The natural way to write it:

```sql
SELECT u.id, o.amount
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.status = 'paid';   -- ❌ users with no orders get cut right here
```

Run it and you'll find **all the users with no orders have vanished**, as if the LEFT JOIN did nothing. The reason is exactly the processing-order diagram from [[sql-execution-order|the previous post]] — **`WHERE` runs after `JOIN`**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 186" role="img" aria-label="LEFT JOIN first produces A, A, B and a NULL-padded C. With the condition in WHERE, which runs after the join, C's NULL fails the status condition and is cut, degrading to INNER; with the condition in ON, filtering happens during the join, C is kept, and it's still a LEFT join" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="20" y="46" fill="#e0733a" font-size="11" text-anchor="start" font-weight="bold">Condition in WHERE</text>
    <text x="20" y="61" fill="#9aa4b2" font-size="8" text-anchor="start">WHERE runs after the join</text>
    <rect x="300" y="34" width="40" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="320" y="52" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A</text>
    <rect x="346" y="34" width="40" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="366" y="52" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A</text>
    <rect x="392" y="34" width="40" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="412" y="52" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B</text>
    <rect x="438" y="34" width="52" height="28" rx="4" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="4 3"/><text x="464" y="52" fill="#9aa4b2" font-size="8.5" text-anchor="middle">C·NULL ✗</text>
    <text x="500" y="52" fill="#e0733a" font-size="9.5" text-anchor="start" font-weight="bold">❌ now INNER</text>
    <line x1="20" y1="92" x2="580" y2="92" stroke="#3a4154" stroke-width="1"/>
    <text x="20" y="122" fill="#54b890" font-size="11" text-anchor="start" font-weight="bold">Condition in ON</text>
    <text x="20" y="137" fill="#9aa4b2" font-size="8" text-anchor="start">ON filters during the join</text>
    <rect x="300" y="110" width="40" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="320" y="128" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A</text>
    <rect x="346" y="110" width="40" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="366" y="128" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A</text>
    <rect x="392" y="110" width="40" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="412" y="128" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B</text>
    <rect x="438" y="110" width="52" height="28" rx="4" fill="#262b3a" stroke="#d6a45c" stroke-width="1.3" stroke-dasharray="4 3"/><text x="464" y="128" fill="#d6a45c" font-size="8.5" text-anchor="middle">C·NULL ✓</text>
    <text x="500" y="128" fill="#54b890" font-size="9.5" text-anchor="start" font-weight="bold">✅ still LEFT</text>
    <text x="20" y="170" fill="#9aa4b2" font-size="8.5" text-anchor="start">Same query; where the condition sits changes the kind of join — because the filter happens at a different moment</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">LEFT JOIN first pads <code>NULL</code> for C, who has no orders. With the condition in <code>WHERE</code> it runs after the join, <code>NULL = 'paid'</code> doesn't hold, C is cut → it quietly becomes INNER. Put it in <code>ON</code>, the filter happens during the join, and C stays</figcaption>
</figure>

The fix is to move "the condition on the right table" into `ON`, so it takes part in filtering during the join rather than being cut by `WHERE` afterwards:

```sql
SELECT u.id, o.amount
FROM users u
LEFT JOIN orders o
  ON o.user_id = u.id AND o.status = 'paid';  -- ✅ every user stays
```

One rule of thumb to remember: **filters on the side you "want to keep in full" (the left table of a LEFT) are fine in `WHERE`; filters on the "optional" side (the right table) go in `ON`, or you knock the LEFT back to INNER.**

## Reflections

### JOIN isn't "gluing tables", it's "combine, then filter"

When I first learned SQL, INNER/LEFT/RIGHT/FULL were four separate rules to memorise, and I regularly mixed up which side LEFT kept. What finally stopped me memorising was switching to the single model "Cartesian product, then filter" — the four JOINs are just four choices of "which side to keep after filtering". It's the same kind of gain as [[sql-execution-order|the previous post]]: **reduce a pile of rote rules to one mechanism you can derive from.** Once the model is right, you don't merely "remember" how LEFT works, you can "compute" what any join will emit — including the weird edge cases.

### LEFT JOIN degrading to INNER is the bug I catch most often in code review

What makes this trap insidious: **it runs, it doesn't error, the numbers even "look right"** — it's just quietly missing a batch of data. When I review someone's report SQL, the moment I see "LEFT JOIN + a WHERE filter on a right-table column" I almost always stop and ask "are you sure you don't want to keep the unmatched ones?" Seven or eight times out of ten it's a bug. And its root is [[sql-execution-order|the processing order]]: `WHERE` runs after the join. That's why the processing-order post matters so much — **many SQL bugs aren't syntax errors, they're your intuition about "when it happens" being wrong.**

### Count the rows before you SUM after a join

Fan-out (one-to-many multiplying the row count) is another classic "runs but computes wrong". I've built a habit: **before any join, ask "is this key unique in the right table?"** If not, the left side's rows will be duplicated after the join, and a direct `SUM` double counts. The fix is usually "aggregate the right table to one row first, then join", or switch to a window function. This habit of "confirm cardinality before joining" has caught too many mysteriously mismatched totals for me — **in the world of data, producing a number has never meant the number is right.**
