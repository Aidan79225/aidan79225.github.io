---
title: "GROUP BY: Collapsing Many Rows into One"
date: 2026-07-08
category: tech
description: "Nearly everyone has been stopped by the error \"column must appear in the GROUP BY clause\". The real reason is simple: GROUP BY collapses each group's many rows into one, and aggregate functions squeeze \"many values in a group\" into one number — after collapsing, a non-key column has several values and SQL doesn't know which to emit. Understand this collapsing model and bare columns, WHERE vs HAVING and ROLLUP all fall into place."
tags:
  - sql
  - concept
series: "SQL: I Thought I Knew It"
seriesOrder: 4
comments: true
draft: false
translationOf: sql-group-by
---
Everyone can write `GROUP BY`, but nearly everyone has also been stopped by `column "..." must appear in the GROUP BY clause`, often without understanding "I'm just selecting a column, why not?" The answer, as in the earlier posts, hides in a simple model: **what `GROUP BY` does is "collapse" each group's many rows into one.** Get that collapsing straight, and the bare-column error, the difference between `WHERE` and `HAVING`, even multi-level subtotals in one pass, all line up.

## What GROUP BY does: collapsing

Think of `GROUP BY customer` as: first sort the rows into piles by `customer`, then **squash each pile into one row**. The aggregate functions (`COUNT`, `SUM`…) are the "compressor" — they compute one number from the many values a column has within a group:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="On the left, five order rows split by customer into two rows for A and three for B; GROUP BY customer collapses each group into one row: A becomes COUNT 2 SUM 350, B becomes COUNT 3 SUM 250. Note below: a non-key column like amount has several values per group, so it can't be selected directly and must be squeezed into one number by an aggregate function" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="gm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="110" y="30" fill="#9aa4b2" font-size="10" text-anchor="middle" font-weight="bold">raw rows (orders)</text>
    <rect x="40" y="42" width="140" height="28" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="110" y="60" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A · amount 100</text>
    <rect x="40" y="74" width="140" height="28" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="110" y="92" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A · amount 250</text>
    <rect x="40" y="118" width="140" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="110" y="136" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B · amount 80</text>
    <rect x="40" y="150" width="140" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="110" y="168" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B · amount 120</text>
    <rect x="40" y="182" width="140" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="110" y="200" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B · amount 50</text>
    <text x="290" y="120" fill="#9aa4b2" font-size="9.5" text-anchor="middle">GROUP BY</text>
    <text x="290" y="134" fill="#9aa4b2" font-size="9.5" text-anchor="middle">customer</text>
    <line x1="182" y1="84" x2="376" y2="72" stroke="#54b890" stroke-width="1.2" marker-end="url(#gm)"/>
    <line x1="182" y1="164" x2="376" y2="164" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#gm)"/>
    <text x="470" y="30" fill="#9aa4b2" font-size="10" text-anchor="middle" font-weight="bold">collapsed: one row per group</text>
    <rect x="378" y="50" width="180" height="44" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/><text x="468" y="70" fill="#e6e6e6" font-size="10" text-anchor="middle">customer = A</text><text x="468" y="85" fill="#54b890" font-size="9" text-anchor="middle">COUNT=2 · SUM=350</text>
    <rect x="378" y="142" width="180" height="44" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/><text x="468" y="162" fill="#e6e6e6" font-size="10" text-anchor="middle">customer = B</text><text x="468" y="177" fill="#4f6df5" font-size="9" text-anchor="middle">COUNT=3 · SUM=250</text>
    <text x="290" y="238" fill="#d6a45c" font-size="9" text-anchor="middle">amount has several values per group (100/250) → can't select it bare; aggregate (SUM/AVG…) into one number</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><code>GROUP BY</code> collapses each group's many rows into one; an aggregate function squeezes a column's many values within a group into a single result. After collapsing, a group has room for only one row</figcaption>
</figure>

This diagram directly explains that error: **after collapsing, a group has only one row, but a non-key column like `amount` has several values within the group (100, 250), and SQL doesn't know which to emit**, so it won't let you select it bare. You have exactly two options: put it in `GROUP BY` (making it part of the grouping), or squeeze it into one value with an aggregate (`SUM(amount)`, `MAX(amount)`…).

This also connects to [[sql-execution-order|the first post]]'s processing order: `SELECT` (⑤) runs **after** `GROUP BY` (③) — by the time `SELECT` computes columns, the rows have long been collapsed, so naturally only "grouping keys" and "aggregate results" are left to choose from.

## Aggregate functions: squeezing many values into one number

The common ones are just these: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`. Two things to remember, both tied to [[sql-null|the previous post's NULL]]:

- **Aggregates ignore NULL**. `AVG(score)`'s denominator is "the number of non-NULL rows", not NULL-as-zero — the average you compute may not be the one you think.
- **`COUNT(*)` counts rows; `COUNT(col)` counts only non-NULLs**. Subtract one from the other and you have the column's NULL count.

One more detail you'll meet even without `GROUP BY`: **the moment an aggregate appears in `SELECT`, the whole table is treated as "one group"**. So `SELECT COUNT(*), MAX(amount) FROM orders` returns one row — that's just "collapsing without grouping".

## WHERE filters rows, HAVING filters groups

With the collapsing model, the division of labour between `WHERE` and `HAVING` follows naturally: **`WHERE` filters row by row before collapsing; `HAVING` filters group by group after.** So only `HAVING` can use an aggregate result as a condition — because that result exists only once collapsing is done:

```sql
SELECT customer, SUM(amount) AS total
FROM orders
WHERE amount > 0            -- ② before collapsing: remove invalid rows first
GROUP BY customer
HAVING SUM(amount) > 1000;  -- ④ after collapsing: keep only the "groups" over a thousand
```

`WHERE SUM(amount) > 1000` errors outright — collapsing hasn't happened, `SUM` doesn't exist (the [[sql-execution-order|processing order]] again). And the reverse performance principle: **rows you can cut with `WHERE` shouldn't be left to `HAVING`**; the earlier the data shrinks, the less there is to collapse and compute later.

## Multi-level subtotals in one pass: ROLLUP

Finally, something very practical that many people don't know. To get "detail + subtotal per region + grand total" you'd normally write three `GROUP BY` blocks and `UNION` them. With `GROUP BY ROLLUP(...)` it's done in one pass — **the extra subtotal/total rows use `NULL` to mark which level was rolled up**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 520 244" role="img" aria-label="Result of GROUP BY ROLLUP(region, product): North A 10 and North B 20 are detail rows, North NULL 30 is the North subtotal, South A 15 detail, South NULL 15 subtotal, and finally NULL NULL 45 is the grand total. Subtotal and total rows are marked with NULL" style="width:100%;max-width:560px;height:auto;margin:0 auto;">
    <text x="230" y="26" fill="#9aa4b2" font-size="10" text-anchor="middle" font-weight="bold">GROUP BY ROLLUP(region, product)</text>
    <text x="95" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">region</text>
    <text x="215" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">product</text>
    <text x="315" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">SUM</text>
    <rect x="40" y="60" width="340" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="95" y="77" fill="#e6e6e6" font-size="9.5" text-anchor="middle">North</text><text x="215" y="77" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A</text><text x="315" y="77" fill="#e6e6e6" font-size="9.5" text-anchor="middle">10</text>
    <rect x="40" y="88" width="340" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="95" y="105" fill="#e6e6e6" font-size="9.5" text-anchor="middle">North</text><text x="215" y="105" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B</text><text x="315" y="105" fill="#e6e6e6" font-size="9.5" text-anchor="middle">20</text>
    <rect x="40" y="116" width="340" height="26" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.4"/><text x="95" y="133" fill="#e6e6e6" font-size="9.5" text-anchor="middle">North</text><text x="215" y="133" fill="#d6a45c" font-size="9" text-anchor="middle">NULL</text><text x="315" y="133" fill="#d6a45c" font-size="9.5" text-anchor="middle">30</text>
    <rect x="40" y="144" width="340" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="95" y="161" fill="#e6e6e6" font-size="9.5" text-anchor="middle">South</text><text x="215" y="161" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A</text><text x="315" y="161" fill="#e6e6e6" font-size="9.5" text-anchor="middle">15</text>
    <rect x="40" y="172" width="340" height="26" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.4"/><text x="95" y="189" fill="#e6e6e6" font-size="9.5" text-anchor="middle">South</text><text x="215" y="189" fill="#d6a45c" font-size="9" text-anchor="middle">NULL</text><text x="315" y="189" fill="#d6a45c" font-size="9.5" text-anchor="middle">15</text>
    <rect x="40" y="200" width="340" height="26" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="95" y="217" fill="#4f6df5" font-size="9" text-anchor="middle">NULL</text><text x="215" y="217" fill="#4f6df5" font-size="9" text-anchor="middle">NULL</text><text x="315" y="217" fill="#4f6df5" font-size="9.5" text-anchor="middle">45</text>
    <text x="416" y="133" fill="#d6a45c" font-size="8.5" text-anchor="start">← North subtotal</text>
    <text x="416" y="189" fill="#d6a45c" font-size="8.5" text-anchor="start">← South subtotal</text>
    <text x="416" y="217" fill="#4f6df5" font-size="8.5" text-anchor="start">← grand total</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><code>ROLLUP</code> gives you detail + each level's subtotal + grand total in one go; a subtotal row carries <code>NULL</code> in the column that was rolled up. For every combination of dimensions (not just the hierarchy), use <code>CUBE</code>; to name specific groupings, <code>GROUPING SETS</code></figcaption>
</figure>

No need to memorise the syntax; just remember "this exists": when a report needs detail and per-level subtotals at once, `ROLLUP` / `CUBE` / `GROUPING SETS` compute it in one pass, no hand-built `UNION`.

## Reflections

### Think "collapsing" through, and bare columns stop being a mystery

When I was learning SQL, `must appear in the GROUP BY clause` was the error I hit most and most often "fixed" by throwing random columns into GROUP BY — which quietly wrecked the grouping logic. What actually solved it wasn't memorising a rule but the picture: **after grouping, each group is squashed into one row.** Once that collapsing picture is in my head, I naturally know "what's left to select" after collapsing — the grouping keys, and aggregates that squeeze many values into one. It's the same epiphany as the [[sql-execution-order|processing order]] post: **see the shape of the data at each stage, and the rules become self-evident.**

### Where aggregation goes wrong most: still NULL and fan-out

`GROUP BY` traps are rarely syntax; they're mostly "wrong numbers, no error" — and the culprits are usually the two from the previous posts. One is [[sql-null|NULL]]: `AVG` ignores NULL, `COUNT(col)` skips NULL, so the denominator you think you have isn't the one you got. The other is [[sql-joins|JOIN fan-out]]: a join inflates the row count first, then `SUM` double counts. Now whenever I see "a join followed by `GROUP BY ... SUM`", I stop and confirm the join didn't duplicate fact rows — **aggregation is the last step, and whatever earlier step dirtied the data, it will faithfully add the error up for you.**

### Most "write a few more queries" chores already have a move in SQL

`ROLLUP` taught me a habit: **when I find myself `UNION`ing several near-identical queries that differ only in grouping level, stop and check whether there's a ready-made move.** SQL is an old, mature language, and the common needs — "detail plus subtotals", "top N per group", "contiguous ranges" — almost all have a tool designed for them (`ROLLUP`, window functions, `GROUPING SETS`). Rather than brute-forcing it with a pile of subqueries, slow and hard to read, spend ten minutes finding the right tool — which is what this series is about: **don't just brute-force `SELECT`; pick up what the language actually gives you.**
