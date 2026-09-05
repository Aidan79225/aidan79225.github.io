---
title: "Why Indexes Are Fast — and Why They Stop Working"
date: 2026-07-11
category: tech
description: "Add an index and a query gets hundreds of times faster, but sometimes you add one and nothing happens — the key is understanding its data structure, the B-tree. Without an index it's a full table scan, O(n); with one it's a walk down the tree, O(log n). But indexes aren't free (they slow writes), composite indexes follow the leftmost-prefix rule, and wrapping a column in a function or using a leading wildcard quietly disables them."
tags:
  - sql
  - performance
series: "SQL: I Thought I Knew It"
seriesOrder: 9
comments: true
draft: false
translationOf: sql-index
---
A change of topic: the engine and performance. The first thing to understand is **indexes** — why adding one makes a query hundreds of times faster, and why sometimes you add one and it seems to do nothing. The answer to both questions hides in its data structure: the **B-tree**.

## No index vs index: full scan vs direct hit

Without an index, a query like `WHERE id = 500` can only do a **Seq Scan (full table scan)** — start at the first row and compare one by one until it's found. With an index, the database maintains an extra **sorted B-tree**, and the lookup becomes a few steps down from the root:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 236" role="img" aria-label="On the left, no index means a Seq Scan, scanning row by row down the whole table until the target is found, complexity O(n); on the right, an index is a B-tree, walking from the root through one node to the target leaf, complexity O(log n)" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="ix" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#e0733a"/></marker></defs>
    <text x="140" y="26" fill="#e0733a" font-size="11" text-anchor="middle" font-weight="bold">No index: Seq Scan (full table)</text>
    <rect x="64" y="42" width="140" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="134" y="57" fill="#9aa4b2" font-size="9" text-anchor="middle">row 1</text>
    <rect x="64" y="68" width="140" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="134" y="83" fill="#9aa4b2" font-size="9" text-anchor="middle">row 2</text>
    <rect x="64" y="94" width="140" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="134" y="109" fill="#9aa4b2" font-size="9" text-anchor="middle">row 3</text>
    <rect x="64" y="120" width="140" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="134" y="135" fill="#9aa4b2" font-size="9" text-anchor="middle">row 4</text>
    <rect x="64" y="146" width="140" height="22" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="134" y="161" fill="#e6e6e6" font-size="9" text-anchor="middle">row 5 ← target</text>
    <rect x="64" y="172" width="140" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="134" y="187" fill="#9aa4b2" font-size="9" text-anchor="middle">row 6</text>
    <line x1="52" y1="44" x2="52" y2="196" stroke="#e0733a" stroke-width="1.6" marker-end="url(#ix)"/>
    <text x="140" y="214" fill="#9aa4b2" font-size="8.5" text-anchor="middle">scan every row to find it → O(n), slower as data grows</text>
    <text x="440" y="26" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">With an index: B-tree</text>
    <rect x="405" y="42" width="76" height="24" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="443" y="58" fill="#e6e6e6" font-size="9" text-anchor="middle">root</text>
    <rect x="346" y="96" width="64" height="24" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="378" y="112" fill="#9aa4b2" font-size="9" text-anchor="middle">node</text>
    <rect x="456" y="96" width="64" height="24" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="488" y="112" fill="#e6e6e6" font-size="9" text-anchor="middle">node</text>
    <rect x="332" y="150" width="46" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="355" y="166" fill="#9aa4b2" font-size="8.5" text-anchor="middle">leaf</text>
    <rect x="384" y="150" width="46" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="407" y="166" fill="#9aa4b2" font-size="8.5" text-anchor="middle">leaf</text>
    <rect x="452" y="150" width="46" height="24" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="475" y="166" fill="#e6e6e6" font-size="8" text-anchor="middle">target</text>
    <rect x="504" y="150" width="46" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="527" y="166" fill="#9aa4b2" font-size="8.5" text-anchor="middle">leaf</text>
    <line x1="430" y1="66" x2="382" y2="96" stroke="#3a4154" stroke-width="1.1"/>
    <line x1="456" y1="66" x2="488" y2="96" stroke="#54b890" stroke-width="1.6"/>
    <line x1="470" y1="120" x2="360" y2="150" stroke="#3a4154" stroke-width="1.1"/>
    <line x1="384" y1="120" x2="407" y2="150" stroke="#3a4154" stroke-width="1.1"/>
    <line x1="484" y1="120" x2="475" y2="150" stroke="#54b890" stroke-width="1.6"/>
    <line x1="500" y1="120" x2="527" y2="150" stroke="#3a4154" stroke-width="1.1"/>
    <text x="440" y="214" fill="#9aa4b2" font-size="8.5" text-anchor="middle">a few steps down the tree → O(log n)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">An index is like a sorted table of contents: no page-by-page flipping, just binary-search your way in. And because the leaves are <b>ordered</b>, range queries (<code>&gt;</code>, <code>BETWEEN</code>), <code>ORDER BY</code> and prefix <code>LIKE 'abc%'</code> all benefit too — find the starting point, then walk along the leaves</figcaption>
</figure>

Remember it in one sentence: **no index means "search row by row"; an index means "home in using a sorted structure".** That's also why an index speeds up more than `=` — ranges and sorting benefit too, because the B-tree's leaves are themselves sorted.

## Indexes aren't free

If they're this fast, why not index every column? Because **an index trades space for time, and it slows writes**: every `INSERT` / `UPDATE` / `DELETE` has to **maintain every relevant index at the same time** (inserting the new value into the right place in that sorted tree). More indexes means slower writes and more space. So indexes go **where they cut** — columns often used to filter in `WHERE`, to `JOIN`, to `ORDER BY` — not mindlessly on every column. **A read-heavy, write-light table deserves more indexes; a write-hot table calls for restraint.**

## Composite indexes: the leftmost prefix

One index can cover several columns (a composite index), but it has a rule you must understand: **the leftmost prefix** — it can only be used starting from the leftmost column, contiguously:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 212" role="img" aria-label="An index on the two columns last name and first name, with data sorted by last name then first name like a phone book. WHERE last name equals Wang uses the index; WHERE last name equals Wang and first name equals An also uses it; but WHERE first name equals An skips the last name, and knowing only the first name you can't locate anything in a phone book, so the index is useless" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <rect x="140" y="18" width="280" height="42" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="280" y="37" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">INDEX (last_name, first_name)</text>
    <text x="280" y="52" fill="#9aa4b2" font-size="8" text-anchor="middle">data sorted by last_name → first_name (like a phone book)</text>
    <rect x="60" y="72" width="440" height="38" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="80" y="95" fill="#54b890" font-size="13" text-anchor="middle">✓</text>
    <text x="104" y="90" fill="#e6e6e6" font-size="9.5" text-anchor="start">WHERE last_name = 'Wang'</text>
    <text x="104" y="103" fill="#9aa4b2" font-size="8" text-anchor="start">flip to the "Wang" section → index used</text>
    <rect x="60" y="116" width="440" height="38" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="80" y="139" fill="#54b890" font-size="13" text-anchor="middle">✓</text>
    <text x="104" y="134" fill="#e6e6e6" font-size="9.5" text-anchor="start">WHERE last_name = 'Wang' AND first_name = 'An'</text>
    <text x="104" y="147" fill="#9aa4b2" font-size="8" text-anchor="start">last name then first name, pinpointed → index used</text>
    <rect x="60" y="160" width="440" height="38" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/>
    <text x="80" y="183" fill="#e0733a" font-size="13" text-anchor="middle">✗</text>
    <text x="104" y="178" fill="#e6e6e6" font-size="9.5" text-anchor="start">WHERE first_name = 'An' (skips last_name)</text>
    <text x="104" y="191" fill="#e0733a" font-size="8" text-anchor="start">only the first name: can't locate it anywhere in the book → index unusable</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">A composite index is like a phone book sorted "last name → first name": knowing the last name lets you flip there, last + first pinpoints it; but given only the "first name", you'd have to read the whole book — the index can't help. So the column order in a composite index decides which queries it can serve</figcaption>
</figure>

## When an index quietly stops working

The biggest trap with indexes is that they often end up **"added, but never used"** — with no error. The most common situations that disable one:

- **Wrapping the column in a function or arithmetic**: `WHERE DATE(created_at) = '2026-07-11'` or `WHERE amount * 2 > 100` — the index stores the column's **raw value**, not the value of `DATE(...)` or `amount*2`, so it can't be used. Rewrite so the column stands alone on one side (`WHERE created_at >= '2026-07-11' AND created_at < '2026-07-12'`).
- **A leading wildcard**: `LIKE '%abc'` can't use the index (no idea which letter to start from), but `LIKE 'abc%'` can.
- **Implicit conversion from a type mismatch**: the column is a string but you write `WHERE phone = 0912345678` (a number), and the database may be forced to cast and give up the index.
- **Selectivity too low**: a column like "gender" with only two values barely narrows the rows, and the optimizer may prefer a full scan — **an index only pays off on columns that "drastically narrow the range"**.

One more advanced but practical concept: a **covering index** — if the columns the query needs all happen to be in the index, the database needn't go back to the table at all (an index-only scan), faster still.

So how do you confirm whether an index is actually being used? **Look at `EXPLAIN`** — which is exactly the next post's subject, the counterpart to [[spark-explain|the Spark execution-plan post]]: whether the plan says `Index Scan` or `Seq Scan` is plain to see.

## Reflections

### An index trades space for time — no free lunch

I've seen plenty of people reflexively add an index whenever a query is slow, until writes became painfully slow and nobody knew why. An index's speed-up has a price — **it takes space and slows every write**. So now, when I see "slow query → add index", I always ask one more thing: is this table read-heavy or write-heavy? Is this query really frequent enough to be worth growing a tree for? **Adding an index isn't a free optimisation, it's an investment to be costed** — like [[sql-time-scd|whether Type 2 keeps history]], like any engineering trade-off, the key is seeing clearly what you're trading for what.

### "Don't wrap the column in a function" is a rule that crosses tools

`WHERE func(col)` disables the index for a simple reason: the index stores `col`'s raw value, not `func(col)`'s. Interestingly, this is **the same thing** as [[spark-shuffle|Spark's filter pushdown]] being blocked by a function — wrap the column in arithmetic and the optimizer can't use "the column's original form" to speed things up. So I've built a habit: when writing filter conditions, let **the column stand alone on one side** as far as possible (`col >= x` rather than `func(col) = y`), and move the arithmetic to the constant side. That small habit gives indexes and pushdowns the chance to kick in — **how you write a condition directly decides whether the engine can help you.**

### The leftmost prefix forces you to think about "the shape of your queries" first

The composite index's leftmost-prefix rule looks like a limitation on the surface, but in practice it forces you to think about something more important: **how do I actually query this table?** An index isn't built for "the table", it's built for "the query pattern" — the column order depends on which columns you most often filter together and which is most selective. That makes me inventory the actual queries before building an index, rather than combining a few columns by feel. **Understand how you query before you decide how to build** — the line fits indexes best, and it holds for every design done for performance.
