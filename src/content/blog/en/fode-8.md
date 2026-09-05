---
title: "Making Data Useful: Queries, Modeling and Transformation, Reading Fundamentals of Data Engineering, Ch. 8"
date: 2026-07-03
category: tech
description: "Once data is in and stored, how does it become something genuinely useful? This post takes apart Ch. 8 of Fundamentals of Data Engineering — the three pillars of queries, modeling and transformation — with a star schema diagram and a normalized-vs-wide-table diagram to explain how analytical data models are designed."
tags:
  - data-engineering
  - book-notes
  - data-modeling
series: "Fundamentals of Data Engineering — Reading Notes"
seriesOrder: 8
comments: true
draft: false
translationOf: fode-8
---
Data has been [[fode-7|ingested]] and [[fode-6|stored]]; the next question is: **how do you turn it into something genuinely useful?** This chapter gives three pillars — **queries, modeling, transformation**. Together they turn "a pile of raw data" into "a model the business can ask questions of, and that answers fast". Of the three, **modeling is the one engineers underrate most and the one that matters most**, so that's where this post puts its weight.

## Queries: SQL is the lingua franca, and the optimizer does the work

The core of querying is **SQL** — you say declaratively "what I want", and the **query optimizer** decides "how to get it" (whether to use an index, join order, how much to scan). So half the skill of writing queries is **not getting in the optimizer's way, and not forcing it into stupid moves**:

| Common landmine | What to do instead |
|---|---|
| Full table scan | Use partitions / indexes / columnar; read only what you need |
| `SELECT *` | Take only the columns you need (especially noticeable in columnar warehouses) |
| Joining a pile of big tables carelessly | Join is the most expensive step (see [[spark-shuffle\|shuffle]]); filter first, then join |
| Wrapping a column in a function in the where clause | Let the predicate be **pushed down** to the lowest layer |

In one line: **SQL is declarative, but performance isn't automatic** — you have to give the optimizer room to work.

## Modeling: translating "the business" into "tables"

Modeling is **deciding what shape the data takes**. Why does it matter? Because the structure decides whether queries are easy to write, whether they run fast, and **whether non-engineers can query on their own**. The first trade-off to face is how far to normalize:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 250" role="img" aria-label="Normalized versus denormalized: on the left, normalized is many small tables joined together, with little duplication and consistent writes, but queries need many joins, suited to OLTP; on the right, denormalized is one wide table with lots of duplication but few joins in queries, suited to OLAP analytics on columnar warehouses" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="m8" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto-start-reverse"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="20" x2="290" y2="205" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 5"/>
    <text x="150" y="28" fill="#e6e6e6" font-size="11.5" font-weight="bold" text-anchor="middle">Normalized</text>
    <rect x="55" y="44" width="84" height="32" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="97" y="64" fill="#e6e6e6" font-size="9.5" text-anchor="middle">orders</text>
    <rect x="170" y="44" width="84" height="32" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="212" y="64" fill="#e6e6e6" font-size="9.5" text-anchor="middle">customers</text>
    <rect x="112" y="106" width="84" height="32" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="154" y="126" fill="#e6e6e6" font-size="9.5" text-anchor="middle">products</text>
    <line x1="139" y1="60" x2="170" y2="60" stroke="#9aa4b2" stroke-width="1"/>
    <line x1="97" y1="76" x2="140" y2="106" stroke="#9aa4b2" stroke-width="1"/>
    <line x1="212" y1="76" x2="172" y2="106" stroke="#9aa4b2" stroke-width="1"/>
    <text x="150" y="168" fill="#9aa4b2" font-size="9" text-anchor="middle">little duplication · consistent writes</text>
    <text x="150" y="184" fill="#9aa4b2" font-size="9" text-anchor="middle">but queries need many joins</text>
    <text x="435" y="28" fill="#e6e6e6" font-size="11.5" font-weight="bold" text-anchor="middle">Denormalized · wide table</text>
    <rect x="350" y="44" width="170" height="108" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <rect x="350" y="44" width="170" height="22" fill="#4f6df5" fill-opacity="0.18"/>
    <text x="435" y="59" fill="#e6e6e6" font-size="9.5" text-anchor="middle">one big table</text>
    <line x1="384" y1="66" x2="384" y2="152" stroke="#3a4154" stroke-width="1"/>
    <line x1="418" y1="66" x2="418" y2="152" stroke="#3a4154" stroke-width="1"/>
    <line x1="452" y1="66" x2="452" y2="152" stroke="#3a4154" stroke-width="1"/>
    <line x1="486" y1="66" x2="486" y2="152" stroke="#3a4154" stroke-width="1"/>
    <line x1="350" y1="94" x2="520" y2="94" stroke="#3a4154" stroke-width="1"/>
    <line x1="350" y1="123" x2="520" y2="123" stroke="#3a4154" stroke-width="1"/>
    <text x="435" y="172" fill="#9aa4b2" font-size="9" text-anchor="middle">lots of duplication, but few joins</text>
    <text x="435" y="188" fill="#9aa4b2" font-size="9" text-anchor="middle">suits columnar warehouse analytics</text>
    <line x1="60" y1="222" x2="520" y2="222" stroke="#9aa4b2" stroke-width="1.3" marker-start="url(#m8)" marker-end="url(#m8)"/>
    <text x="60" y="240" fill="#9aa4b2" font-size="9" text-anchor="start">OLTP transactions (write-heavy)</text>
    <text x="520" y="240" fill="#9aa4b2" font-size="9" text-anchor="end">OLAP analytics (read-heavy)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Normalized splits into many small tables (little duplication, good for transactional writes); analytics goes the other way, using wide tables to buy fewer joins and faster queries — don't carry the OLTP normalization instinct into analytics</figcaption>
</figure>

**OLTP loves normalization (little duplication, consistent writes); analytics often goes the opposite way** — because [[fode-6|columnar storage is cheap and fast]], duplication doesn't hurt, and one join fewer saves a lot. That's the modeling-layer extension of [[fode-5|Ch. 5]]'s "don't run analytics directly on OLTP".

### The classic of analytical modeling: the star schema

Kimball's **dimensional modeling** is the most universal move in analytics: split data into two kinds of table — the **fact table** records additive measures, the **dimension tables** describe context:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 370" role="img" aria-label="Star schema: a central fact table (order lines, recording additive measures like quantity and amount plus the keys of each dimension), surrounded by four dimension tables — date, product, store, customer — each connected to the fact table by a line" style="width:100%;max-width:560px;height:auto;margin:0 auto;">
    <line x1="280" y1="150" x2="280" y2="78" stroke="#3a4154" stroke-width="1.5"/>
    <line x1="280" y1="240" x2="280" y2="292" stroke="#3a4154" stroke-width="1.5"/>
    <line x1="205" y1="195" x2="148" y2="190" stroke="#3a4154" stroke-width="1.5"/>
    <line x1="355" y1="195" x2="412" y2="190" stroke="#3a4154" stroke-width="1.5"/>
    <rect x="218" y="24" width="124" height="54" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="280" y="46" fill="#e6e6e6" font-size="10.5" text-anchor="middle">dim · date</text><text x="280" y="63" fill="#9aa4b2" font-size="8.5" text-anchor="middle">year / month / week</text>
    <rect x="218" y="292" width="124" height="54" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="280" y="314" fill="#e6e6e6" font-size="10.5" text-anchor="middle">dim · customer</text><text x="280" y="331" fill="#9aa4b2" font-size="8.5" text-anchor="middle">name / region</text>
    <rect x="24" y="163" width="124" height="54" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="86" y="185" fill="#e6e6e6" font-size="10.5" text-anchor="middle">dim · product</text><text x="86" y="202" fill="#9aa4b2" font-size="8.5" text-anchor="middle">category / brand</text>
    <rect x="412" y="163" width="124" height="54" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="474" y="185" fill="#e6e6e6" font-size="10.5" text-anchor="middle">dim · store</text><text x="474" y="202" fill="#9aa4b2" font-size="8.5" text-anchor="middle">region / store type</text>
    <rect x="205" y="150" width="150" height="90" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="280" y="173" fill="#4f6df5" font-size="12" font-weight="bold" text-anchor="middle">Fact table</text>
    <text x="280" y="191" fill="#e6e6e6" font-size="10.5" text-anchor="middle">order lines</text>
    <text x="280" y="208" fill="#9aa4b2" font-size="8.5" text-anchor="middle">quantity · amount (additive)</text>
    <text x="280" y="224" fill="#9aa4b2" font-size="8.5" text-anchor="middle">+ the key of each dimension</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Fact table = additive measures (long, and always growing); dimension tables = context (who/what/when/where, shorter, used to filter and group). Join a few dimensions at query time and you can slice any way you like</figcaption>
</figure>

The star schema works because it cleanly separates "**what to compute** (facts)" from "**what angle to cut by** (dimensions)". Want "sales by region by month"? Join the store and date dimensions and sum the amount — even a non-engineer can slice it. The book also covers the other schools, each with its own position:

| School | In one line |
|---|---|
| **Kimball** | Bottom-up, dimensional modeling, star schema (the most universal) |
| **Inmon** | Top-down, build a normalized enterprise warehouse first, then cut data marts |
| **Data Vault** | Hubs / links / satellites, built for traceability and evolution |
| **One Big Table** | Flatten everything into one giant table and let the columnar engine chew it |

No need to memorise which is "right" — **they're different trade-offs**: Kimball is understandable and self-serviceable, Inmon prioritises governance, Data Vault prioritises traceability, the wide table prioritises query speed.

## Transformation: turning raw data into the model, and the T moved

With the model's blueprint in hand, **transformation** does the actual shaping of raw data into it. The biggest change here is **ETL → ELT**:

- **ETL**: transform first, then load into the warehouse (the warehouse is expensive, so only clean data goes in).
- **ELT**: load as-is first, **then transform inside the warehouse with SQL** (storage is cheap and the warehouse is strong enough, so let it carry the work).

ELT wins because, at root, [[fode-6|compute and storage separated and storage got cheap]]: storing first costs nothing, so hand transformation to the warehouse's SQL. That's also the underlying premise of [[medallion-architecture|Medallion layering]] and tools like dbt — layer after layer of SQL inside the warehouse, turning Bronze raw data step by step into Gold models. Transformation isn't only batch either: streaming transformation (see [[spark-streaming|Structured Streaming]]) computes and shapes the data as it flows past. As for **views vs materialized**, that's another classic trade-off: a view computes fresh at every query (saves space, slow); materialization precomputes and stores (fast, takes space, needs refreshing).

## Reflections

### Modeling is translating the business into tables — the most underrated soft skill

What I felt most writing this chapter: **the hard part of modeling isn't technical at all, it's understanding the business.** The star schema is beautiful not because the technique is flashy but because it forces you to think through "what are this business's **measures**, and which **angles** does it cut by". I've seen too many data projects stall not because the engine was too slow but because **nobody translated the business question into a clean model** — the tables looked like a backend OLTP schema, and analysts had to join seven tables for every number and often got it wrong. Modeling data so that non-engineers can self-serve is, I think, the skill data teams most need to practise and least often do.

### I prefer ELT + layering + dbt, and the reasons chain all the way back

Over these posts my position has become consistent: **land raw data in cheap storage first (the L of ELT), then transform layer by layer in SQL (the T).** It isn't chasing fashion — it connects straight back to [[fode-6|compute/storage separation]] and [[medallion-architecture|Medallion's immutable, replayable Bronze]]. Transforming in SQL rather than a pile of scattered scripts gives you version control, testability and readability for everyone (dbt turned that into an engineering standard). ETL isn't wrong, but in today's "storage cheap, warehouse strong" world, ELT is my default.

### Don't carry the OLTP normalization instinct into analytics

This is a hole I fell into when I was younger: coming from backend, duplicated data made my skin crawl, so I normalized the analytics tables beautifully — and every report joined furiously and crawled. Only later did it click: **[[fode-6|on a columnar warehouse, duplication is cheap and one join fewer is a big win]].** The question for analytical modeling isn't "is it normalized enough" but "are queries easy to write and fast to run". It's exactly [[fode-4|Ch. 4]]'s "every choice is a trade-off; pick sides by workload" — normalization is a virtue for writes, and analytics wants a different set.
