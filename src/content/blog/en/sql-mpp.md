---
title: "When SQL Runs on MPP: Greenplum and Cloudberry"
date: 2026-07-11
category: tech
description: "The SQL series finale: what happens when the single-node PostgreSQL of the previous 11 posts moves onto MPP (massively parallel processing)? The syntax barely changes (Cloudberry is Greenplum's open-source successor, and GP descends from PG), but you gain one thing that has to be settled at table-creation time — which node the data lives on. Pick the wrong distribution key and you get data skew and data moving between nodes, and that movement is MPP's version of the shuffle."
tags:
  - sql
  - data-engineering
series: "SQL: I Thought I Knew It"
seriesOrder: 12
comments: true
draft: false
translationOf: sql-mpp
---
The finale of the whole SQL series. The previous 11 posts all ran on **single-node PostgreSQL**; this one puts the same SQL onto **MPP (Massively Parallel Processing)** — **Greenplum**, and its open-source successor **Apache Cloudberry** (incubating at Apache). The good news: because Cloudberry descends from Greenplum and Greenplum descends from PostgreSQL, **the syntax barely changes**, and everything in the previous 11 posts applies directly; the bad news: you gain one thing the single-node era never made you think about — **which node the data lives on**. And that decision governs the speed of every query you run.

## From one node to MPP: a coordinator plus a pile of segments

The MPP architecture is intuitive: one **coordinator** (the brain) receives queries, plans and dispatches; below it a pile of **segments** (each really an independent PostgreSQL instance) each holds a share of the data and processes its own share in parallel. How a table is spread across the segments is decided by the **distribution key**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="MPP architecture: one coordinator at the top receives queries, plans and dispatches; three segments below are each an independent PostgreSQL instance, each holding a share of the data and processing in parallel. The whole table is spread across segments by a hash of the distribution key. If the distribution key is uneven, one segment ends up with far more data, causing skew, and the slowest node drags down the whole query." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="mp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="205" y="22" width="170" height="40" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="290" y="41" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">Coordinator</text>
    <text x="290" y="55" fill="#9aa4b2" font-size="8" text-anchor="middle">receives, plans, dispatches</text>
    <line x1="290" y1="62" x2="105" y2="98" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#mp)"/>
    <line x1="290" y1="62" x2="290" y2="98" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#mp)"/>
    <line x1="290" y1="62" x2="475" y2="98" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#mp)"/>
    <rect x="30" y="100" width="150" height="72" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="105" y="117" fill="#54b890" font-size="9.5" text-anchor="middle" font-weight="bold">Segment 1</text>
    <rect x="44" y="126" width="122" height="9" rx="2" fill="#2e4a40"/><rect x="44" y="139" width="122" height="9" rx="2" fill="#2e4a40"/><rect x="44" y="152" width="122" height="9" rx="2" fill="#2e4a40"/>
    <rect x="215" y="100" width="150" height="72" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="290" y="117" fill="#54b890" font-size="9.5" text-anchor="middle" font-weight="bold">Segment 2</text>
    <rect x="229" y="126" width="122" height="9" rx="2" fill="#2e4a40"/><rect x="229" y="139" width="122" height="9" rx="2" fill="#2e4a40"/><rect x="229" y="152" width="122" height="9" rx="2" fill="#2e4a40"/>
    <rect x="400" y="100" width="150" height="72" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="475" y="117" fill="#54b890" font-size="9.5" text-anchor="middle" font-weight="bold">Segment 3</text>
    <rect x="414" y="126" width="122" height="9" rx="2" fill="#2e4a40"/><rect x="414" y="139" width="122" height="9" rx="2" fill="#2e4a40"/><rect x="414" y="152" width="122" height="9" rx="2" fill="#2e4a40"/>
    <text x="290" y="192" fill="#9aa4b2" font-size="8.5" text-anchor="middle">DISTRIBUTED BY (key): hash(key) decides which segment each row lands on; queries run on every node in parallel</text>
    <text x="290" y="212" fill="#d6a45c" font-size="8.5" text-anchor="middle">⚠ uneven key → one segment overloaded (skew), parallelism lost, the slowest node drags down all</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">MPP = one coordinator directing, a crowd of segments working in parallel. The speed comes from "everyone doing their share at once", so if one node is especially slow (data skew) the whole thing is held back by it — the distribution key's first duty is to spread the data <b>evenly</b></figcaption>
</figure>

The power of parallelism rests on "every node has about the same amount of work". So the distribution key's worst enemy is **data skew** — if you pick a column with concentrated values (say "country", where 80% of rows are one country) as the key, that whole country crowds into one segment, the others sit idle while it works itself to death, and parallelism is written off.

## Pick the wrong distribution key and data "moves between nodes"

Beyond skew, the distribution key has a second, more hidden duty: **deciding whether a join / group by has to move data between nodes**. When you join two tables, if "the data to be matched" happens to be on the same segment, each node can **join locally**; if it's scattered across segments, the data has to be moved together over the network first — MPP calls that movement a **Motion**, and it's the MPP version of the [[spark-shuffle|Spark shuffle]]:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Left, distribution key equals join key: tables A and B are both spread by the join key, so both tables' data for the same key naturally lands on the same segment, each segment joins locally, and nothing moves. Right, distribution key differs from join key: the B row to match sits on another segment and must be moved over the network to A's segment; that's a Redistribute Motion, MPP's shuffle." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="mo" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e0733a"/></marker></defs>
    <line x1="290" y1="16" x2="290" y2="176" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="28" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">distribution key = join key ✓</text>
    <rect x="34" y="42" width="210" height="46" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="52" y="58" fill="#9aa4b2" font-size="8" text-anchor="start">Segment 1</text>
    <rect x="52" y="64" width="60" height="18" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1"/><text x="82" y="77" fill="#e6e6e6" font-size="8" text-anchor="middle">A k=1</text>
    <rect x="118" y="64" width="60" height="18" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1"/><text x="148" y="77" fill="#e6e6e6" font-size="8" text-anchor="middle">B k=1</text>
    <text x="216" y="77" fill="#54b890" font-size="8" text-anchor="middle">local</text>
    <rect x="34" y="98" width="210" height="46" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="52" y="114" fill="#9aa4b2" font-size="8" text-anchor="start">Segment 2</text>
    <rect x="52" y="120" width="60" height="18" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1"/><text x="82" y="133" fill="#e6e6e6" font-size="8" text-anchor="middle">A k=2</text>
    <rect x="118" y="120" width="60" height="18" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1"/><text x="148" y="133" fill="#e6e6e6" font-size="8" text-anchor="middle">B k=2</text>
    <text x="216" y="133" fill="#54b890" font-size="8" text-anchor="middle">local</text>
    <text x="150" y="166" fill="#9aa4b2" font-size="8.2" text-anchor="middle">same key, same node by nature → no motion</text>
    <text x="430" y="28" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">distribution key ≠ join key ✗</text>
    <rect x="316" y="42" width="210" height="46" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="334" y="58" fill="#9aa4b2" font-size="8" text-anchor="start">Segment 1</text>
    <rect x="334" y="64" width="60" height="18" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1"/><text x="364" y="77" fill="#e6e6e6" font-size="8" text-anchor="middle">A k=1</text>
    <rect x="400" y="64" width="72" height="18" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 2"/><text x="436" y="77" fill="#9aa4b2" font-size="7.5" text-anchor="middle">no B k=1</text>
    <rect x="316" y="98" width="210" height="46" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="334" y="114" fill="#9aa4b2" font-size="8" text-anchor="start">Segment 2</text>
    <rect x="400" y="120" width="60" height="18" rx="3" fill="#3a2626" stroke="#e0733a" stroke-width="1.1"/><text x="430" y="133" fill="#e6e6e6" font-size="8" text-anchor="middle">B k=1</text>
    <path d="M430,120 C430,100 430,96 400,84" fill="none" stroke="#e0733a" stroke-width="1.4" marker-end="url(#mo)"/>
    <text x="430" y="166" fill="#9aa4b2" font-size="8.2" text-anchor="middle">matches on different nodes → move over the network (Motion) = shuffle</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Left: both tables distributed by the join key, so the same key naturally shares a segment — local join, zero movement. Right: the distribution key doesn't line up, the B row to join is on another node, and it has to be moved across the network (<b>Redistribute Motion</b>) — MPP's shuffle. There's also <b>Broadcast Motion</b>, which copies a small table to every node (Spark's broadcast join)</figcaption>
</figure>

There are several kinds of Motion, matching exactly the moves you learned in [[spark-shuffle|Spark]]: **Redistribute Motion** (both tables re-hashed and spread by the join key, = shuffle join), **Broadcast Motion** (a small table copied to every segment, = broadcast join), **Gather Motion** (collecting each segment's results back to the coordinator). And in the [[sql-explain|execution plan]] these Motions are listed plainly — seeing a big table Redistributed is, like seeing `Seq Scan` in PG or `Exchange` in Spark, the signal to stop and ask "can this movement be avoided".

## Principles for choosing a distribution key

Putting it together, choosing a distribution key has two goals, and they sometimes fight:

- **Spread evenly (avoid skew)**: pick a **high-cardinality, evenly distributed** column (`user_id`, `order_id`), not one with concentrated values (country, status, boolean).
- **Match locally (avoid motion)**: pick **the column most often used to join** as the key. Especially for **big-table-to-big-table joins**, give both tables **the same join key** as their distribution key — then data for the same key is on the same segment by nature, the join moves nothing, and that's the single most important move for MPP performance.

When you truly can't have both (the join key happens to be badly skewed), you trade off, or use Broadcast to copy the small table away. **The moment you write `DISTRIBUTED BY` on a table, you've decided the fate of a whole pile of future queries** — the biggest way MPP differs from a single node.

## Reflections

### Every MPP difficulty comes back to one sentence: move less data

Distribution key, motion, skew — a pile of terms, but underneath only one thing: **where the data is, and whether it has to move**. That's fundamentally the same physics as the [[spark-shuffle|Spark shuffle]] — put "data that will be joined / grouped together" together and nothing moves; put it wrong and it has to cross the network, and network movement is always the most expensive step in distributed computing. Coming to MPP after learning the Spark shuffle is nearly painless: new names (Exchange → Motion, broadcast join → Broadcast Motion), identical reasoning. **The physics of performance is shared across engines** — which is why I keep saying that learning one distributed engine thoroughly gets you most of the way with the others.

### The difficulty of distributed isn't syntax, it's "location"

The biggest takeaway of this post: from a single node to MPP, **the SQL barely changes, but you gain a whole extra layer to think about — the "location" of data**. On one node you only worry about "how to write the query"; on MPP you first worry about "how the data is distributed, where the computation happens, whether it has to move". And that decision is fixed **at table creation**; get it wrong and everything after is slow. It confirms something for me: the real difficulty of distributed systems is never the API, it's **location and movement** — where data lives, where it's computed, when it has to cross a boundary. That's exactly the central proposition of the [[fode-6|separation of compute and storage]] post I've been writing and DDIA's partitioning chapter; MPP is just one very concrete miniature of it.

### The whole series is really about one thing: don't be fooled by "it runs"

Writing the last post and looking back at these twelve, the shared theme is really one sentence: **SQL is very easy to "get running", but "running right, running fast" requires seeing through the mechanism underneath.** Processing order, how JOIN matches, NULL's three-valued logic, how windows compute, how indexes look up, how to read EXPLAIN, how MVCC isolates, how MPP distributes — every post takes apart something "you thought you understood, but could merely use". Only after seeing through the mechanism do you go from "can write SQL" to "understand SQL". That's what this series' name means — **SQL: I thought I knew it**; and having read this round, I hope you, like me, really know it a little better.
