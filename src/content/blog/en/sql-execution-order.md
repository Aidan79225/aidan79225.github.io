---
title: "Your SQL Doesn't Run in the Order You Wrote It"
date: 2026-07-07
category: tech
description: "Everyone writes SQL starting with SELECT, so everyone assumes it starts running from SELECT — but SELECT is almost the last thing to execute. Understand the real logical order, FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY→LIMIT, and a whole pile of \"why does this fail\" puzzles resolve at once."
tags:
  - sql
  - concept
series: "SQL: I Thought I Knew It"
seriesOrder: 1
comments: true
draft: false
translationOf: sql-execution-order
---
When you write SQL, you almost always start with `SELECT`. Write it long enough and it feels natural to assume: it **starts running from `SELECT`**. It doesn't — SQL is declarative; you write "what you want", the engine decides "how to run it, in what order", and **the order it runs in is very different from the order you wrote**. This post carves that order into your head, and a whole pile of "why does this fail" puzzles that follow resolve in one go.

## You write it this way, it doesn't run this way

The writing order you're used to is `SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT`. But the engine's real **logical query processing order** is this:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 330" role="img" aria-label="The left column is the order you write, with SELECT at the top; the right column is the actual logical processing order, FROM① → WHERE② → GROUP BY③ → HAVING④ → SELECT⑤ → ORDER BY⑥ → LIMIT⑦. SELECT is written first but runs fifth, marked by a blue line showing the big jump" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="99" y="24" fill="#9aa4b2" font-size="10.5" text-anchor="middle" font-weight="bold">You write</text>
    <text x="461" y="24" fill="#9aa4b2" font-size="10.5" text-anchor="middle" font-weight="bold">The DB runs (logical order)</text>
    <line x1="174" y1="54" x2="386" y2="214" stroke="#4f6df5" stroke-width="1.9"/>
    <line x1="174" y1="94" x2="386" y2="54" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="174" y1="134" x2="386" y2="94" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="174" y1="174" x2="386" y2="134" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="174" y1="214" x2="386" y2="174" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="174" y1="254" x2="386" y2="254" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="174" y1="294" x2="386" y2="294" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="24" y="38" width="150" height="32" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="99" y="59" fill="#4f6df5" font-size="11.5" text-anchor="middle" font-weight="bold">SELECT</text>
    <rect x="24" y="78" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="99" y="99" fill="#e6e6e6" font-size="11" text-anchor="middle">FROM / JOIN</text>
    <rect x="24" y="118" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="99" y="139" fill="#e6e6e6" font-size="11" text-anchor="middle">WHERE</text>
    <rect x="24" y="158" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="99" y="179" fill="#e6e6e6" font-size="11" text-anchor="middle">GROUP BY</text>
    <rect x="24" y="198" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="99" y="219" fill="#e6e6e6" font-size="11" text-anchor="middle">HAVING</text>
    <rect x="24" y="238" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="99" y="259" fill="#e6e6e6" font-size="11" text-anchor="middle">ORDER BY</text>
    <rect x="24" y="278" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="99" y="299" fill="#e6e6e6" font-size="11" text-anchor="middle">LIMIT</text>
    <rect x="386" y="38" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="461" y="59" fill="#e6e6e6" font-size="11" text-anchor="middle">① FROM / JOIN</text>
    <rect x="386" y="78" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="461" y="99" fill="#e6e6e6" font-size="11" text-anchor="middle">② WHERE</text>
    <rect x="386" y="118" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="461" y="139" fill="#e6e6e6" font-size="11" text-anchor="middle">③ GROUP BY</text>
    <rect x="386" y="158" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="461" y="179" fill="#e6e6e6" font-size="11" text-anchor="middle">④ HAVING</text>
    <rect x="386" y="198" width="150" height="32" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="461" y="219" fill="#4f6df5" font-size="11.5" text-anchor="middle" font-weight="bold">⑤ SELECT</text>
    <rect x="386" y="238" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="461" y="259" fill="#e6e6e6" font-size="11" text-anchor="middle">⑥ ORDER BY</text>
    <rect x="386" y="278" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="461" y="299" fill="#e6e6e6" font-size="11" text-anchor="middle">⑦ LIMIT</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">You're used to starting with <code>SELECT</code>, but it runs almost last (fifth). The real order is FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY→LIMIT — remember this line, and the "why does this fail" cases below solve themselves</figcaption>
</figure>

Remember it in one sentence: **first decide "where it comes from and which rows stay", then "group and filter groups", only then "compute the columns you asked for", and finally sort and take.** `SELECT` is merely what you wrote first; it actually comes fifth.

## Three "whys" solved at once

This order isn't trivia; it directly explains three traps almost everyone has fallen into.

**Why can't `WHERE` use an alias defined in `SELECT`?** Because `WHERE` (②) runs before `SELECT` (⑤), and the alias **doesn't exist yet** at that point:

```sql
SELECT price * qty AS revenue
FROM orders
WHERE revenue > 1000;   -- ❌ revenue hasn't been computed yet

SELECT price * qty AS revenue
FROM orders
WHERE price * qty > 1000;  -- ✅ write the expression (or wrap in a subquery/CTE)
```

**Why can `ORDER BY` use the very same alias?** Because `ORDER BY` (⑥) runs **after** `SELECT` (⑤), by which time `revenue` has been born:

```sql
SELECT price * qty AS revenue
FROM orders
ORDER BY revenue DESC;   -- ✅ the alias exists by the time we sort
```

**Why can't a window function go in `WHERE`?** Same reason — window functions are computed in the `SELECT` (⑤) stage, and at `WHERE` (②) they simply haven't happened yet:

```sql
-- ❌ wants "only the top-ranked per category", but rn isn't computed at WHERE time
SELECT *, ROW_NUMBER() OVER (PARTITION BY cat ORDER BY sales DESC) AS rn
FROM products
WHERE rn = 1;

-- ✅ the standard fix: wrap in a subquery and filter in the outer layer
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY cat ORDER BY sales DESC) AS rn
  FROM products
) t
WHERE rn = 1;
```

That age-old question, "why does a window function always need a subquery around it", is answered by this diagram: it's computed later than `WHERE`. (Window functions are the subject of [[sql-window|post 5 in the series]]; for now just know where they sit.)

## WHERE filters rows, HAVING filters groups

The order also settles the difference between `WHERE` and `HAVING` once and for all: one runs before grouping, the other after, so they filter completely different things:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 230" role="img" aria-label="Top row: WHERE filters row by row before grouping, and two of five rows are removed; middle: GROUP BY collapses the remaining rows into groups; bottom row: HAVING filters group by group after grouping, and one of three groups is removed for an insufficient total" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="24" y="28" fill="#54b890" font-size="11" text-anchor="start" font-weight="bold">WHERE · per row (before grouping ②)</text>
    <rect x="150" y="40" width="60" height="30" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="180" y="59" fill="#e6e6e6" font-size="9.5" text-anchor="middle">row ✓</text>
    <rect x="218" y="40" width="60" height="30" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="248" y="59" fill="#e6e6e6" font-size="9.5" text-anchor="middle">row ✓</text>
    <rect x="286" y="40" width="60" height="30" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/><text x="316" y="59" fill="#9aa4b2" font-size="9.5" text-anchor="middle">row ✗</text>
    <rect x="354" y="40" width="60" height="30" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="384" y="59" fill="#e6e6e6" font-size="9.5" text-anchor="middle">row ✓</text>
    <rect x="422" y="40" width="60" height="30" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/><text x="452" y="59" fill="#9aa4b2" font-size="9.5" text-anchor="middle">row ✗</text>
    <line x1="300" y1="78" x2="300" y2="104" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#go)"/>
    <defs><marker id="go" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="312" y="96" fill="#9aa4b2" font-size="9" text-anchor="start">GROUP BY collapses into groups (③)</text>
    <text x="24" y="140" fill="#d6a45c" font-size="11" text-anchor="start" font-weight="bold">HAVING · per group (after grouping ④)</text>
    <rect x="150" y="154" width="118" height="40" rx="6" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="209" y="171" fill="#e6e6e6" font-size="9.5" text-anchor="middle">group A</text><text x="209" y="185" fill="#9aa4b2" font-size="8.5" text-anchor="middle">SUM=1500 ✓</text>
    <rect x="286" y="154" width="118" height="40" rx="6" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="345" y="171" fill="#e6e6e6" font-size="9.5" text-anchor="middle">group B</text><text x="345" y="185" fill="#9aa4b2" font-size="8.5" text-anchor="middle">SUM=1200 ✓</text>
    <rect x="422" y="154" width="118" height="40" rx="6" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/><text x="481" y="171" fill="#9aa4b2" font-size="9.5" text-anchor="middle">group C</text><text x="481" y="185" fill="#9aa4b2" font-size="8.5" text-anchor="middle">SUM=300 ✗</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><code>WHERE</code> cuts "rows", before grouping; <code>HAVING</code> cuts "groups", after grouping. Different position, different powers</figcaption>
</figure>

Drop it into an example and it's obvious:

```sql
SELECT customer_id, SUM(amount) AS total
FROM orders
WHERE amount > 0             -- ② first remove invalid rows (refunds, zero amounts)
GROUP BY customer_id
HAVING SUM(amount) > 1000;   -- ④ after grouping, keep only the "groups" over a thousand
```

There's a performance principle hiding here too: **rows you can cut with `WHERE` shouldn't be left to `HAVING`.** `WHERE` shrinks the data before grouping, so there's less to group and less to compute afterwards; handing it to `HAVING` means a pile of rows destined to be discarded go through grouping first — wasted work. This "filter as early as possible" instinct is the same thing as "filter to shrink the data before you shuffle" in [[spark-shuffle|the Spark post]].

## Reflections

### Remember the running order, and half of SQL's puzzles solve themselves

When I started writing SQL, I treated "aliases can't be used in WHERE", "window functions need a subquery" and "what's the difference between WHERE and HAVING anyway" as three separate rules to memorise. Only later did I realise they're **three faces of the same thing** — the order you write isn't the order it runs. Once that processing-order diagram is carved into your head, these stop being rules to memorise and become "of course it works that way" deductions. Now when someone asks me "why does this query error", my first reflex is to run `FROM→WHERE→GROUP BY→…` in my head, and eight times out of ten I can see on the spot which stage referenced something that hadn't been born yet. **Reducing rules to mechanism is the first step in how I learn anything**, and SQL is no exception.

### This is really the other face of "declarative"

SQL's "written order ≠ execution order" is, at heart, the same thing as the **declarative** idea I keep coming back to in [[k8s-intro|K8s]] and [[spark-dataframe|Spark DataFrames]]: you describe "what", the engine decides "how, and in what order". The upside is you don't manage execution details and the engine can optimise for you; the price is — **you can't assume it runs in the literal order you wrote.** That's why "understanding the execution model" matters so much for SQL: without it, you write queries that "look right but are wrong" or "run, but are inexplicably slow"; with it, you can predict, and therefore tune. All declarative tools are like this: the flip side of convenience is the effort of understanding the engine that makes decisions on your behalf.

### "Shrink the data first" is a shared instinct across tools

`WHERE` before `HAVING`, cut rows as early as you can — this small SQL habit holds when scaled up to any data system. Spark wants you to [[spark-explain|filter before shuffling and push filters down to the scan]]; here it's `WHERE` before `GROUP BY`. Behind both is the same sentence: **the later data is processed, the more each row costs** (it has to survive every earlier stage first). So whenever I look at a piece of data processing — SQL, Spark, a whole pipeline — I ask the same first question: **can the step that filters out the most data be moved earlier?** It's the most reliably rewarding kind of optimisation — no cleverness required, just the right order.
