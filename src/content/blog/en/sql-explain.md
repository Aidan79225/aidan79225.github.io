---
title: "Reading EXPLAIN: How the Optimizer Actually Runs Your Query"
date: 2026-07-11
category: tech
description: "The previous post asked \"is the index actually being used?\" — the answer is in EXPLAIN. This is the SQL sibling of the Spark execution-plan post: the same read-the-plan, find-the-bottleneck thinking. It teaches you to read EXPLAIN, recognise the three scan types and three JOIN algorithms (nested loop / hash / merge), and why cost is only an estimate while EXPLAIN ANALYZE is the fact."
tags:
  - sql
  - performance
series: "SQL: I Thought I Knew It"
seriesOrder: 10
comments: true
draft: false
translationOf: sql-explain
---
[[sql-index|The previous post]] left a question: is the index actually being used? The answer is in `EXPLAIN`. This post is the SQL sibling of the [[spark-explain|Spark execution-plan post]] I wrote earlier — **the same "read the plan, find the bottleneck" thinking, on a different engine**. Learn to read `EXPLAIN` and you upgrade from "guessing why it's slow" to "opening it up and looking".

## EXPLAIN: laying the optimizer's plan open

`EXPLAIN <query>` prints how the optimizer **intends** to run the query — without actually executing it; a static estimate. `EXPLAIN ANALYZE` **really runs it once** and attaches each step's actual time and actual row count. Read it as in the Spark post: **the deepest indentation runs first (inside out)**, layer by layer up to the final result.

In the plan, first recognise the "scan type" — which connects straight to [[sql-index|the previous post's indexes]]:

- **Seq Scan**: full table scan (no index used).
- **Index Scan**: walk the index to find the location, then go back to the table for the data.
- **Index Only Scan**: every column needed is in the index, so the table isn't touched at all (covering index).
- **Bitmap Heap Scan**: when the matching rows are neither few nor many, use the index to collect a batch first, then read them in one go.

## Three JOIN algorithms

The most worthwhile thing to understand in a plan is which algorithm the `JOIN` used. This also completes the thread left in [[sql-joins|post 2]] on join memory — the optimizer picks one of three based on table size, sort order and indexes:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 190" role="img" aria-label="Three JOIN algorithms compared: Nested Loop looks up the inner table once per outer row, suited to small tables or an indexed inner table; Hash Join builds the small table into an in-memory hash table and streams the big table past it to probe, suited to big equality joins; Merge Join sorts both sides first and then merges them like a zipper, suited to data that's already sorted or indexed" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="jj" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="193" y1="16" x2="193" y2="178" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="387" y1="16" x2="387" y2="178" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="100" y="28" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">Nested Loop</text>
    <rect x="24" y="42" width="40" height="16" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="44" y="54" fill="#9aa4b2" font-size="8" text-anchor="middle">outer</text>
    <rect x="24" y="64" width="40" height="16" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="44" y="76" fill="#9aa4b2" font-size="8" text-anchor="middle">outer</text>
    <rect x="24" y="86" width="40" height="16" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="44" y="98" fill="#9aa4b2" font-size="8" text-anchor="middle">outer</text>
    <rect x="118" y="52" width="62" height="42" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="149" y="70" fill="#e6e6e6" font-size="8.5" text-anchor="middle">inner</text><text x="149" y="83" fill="#9aa4b2" font-size="7.5" text-anchor="middle">(faster if indexed)</text>
    <line x1="64" y1="50" x2="116" y2="62" stroke="#9aa4b2" stroke-width="1" marker-end="url(#jj)"/>
    <line x1="64" y1="72" x2="116" y2="72" stroke="#9aa4b2" stroke-width="1" marker-end="url(#jj)"/>
    <line x1="64" y1="94" x2="116" y2="84" stroke="#9aa4b2" stroke-width="1" marker-end="url(#jj)"/>
    <text x="100" y="150" fill="#9aa4b2" font-size="8.3" text-anchor="middle">each outer row → one inner lookup</text>
    <text x="100" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">suits: small tables / indexed inner</text>
    <text x="291" y="28" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">Hash Join</text>
    <rect x="212" y="44" width="46" height="18" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/><text x="235" y="57" fill="#e6e6e6" font-size="8.5" text-anchor="middle">small</text>
    <rect x="292" y="42" width="78" height="22" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="331" y="57" fill="#e6e6e6" font-size="8.3" text-anchor="middle">hash table (memory)</text>
    <line x1="258" y1="53" x2="290" y2="53" stroke="#9aa4b2" stroke-width="1" marker-end="url(#jj)"/>
    <rect x="212" y="88" width="46" height="18" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="235" y="101" fill="#9aa4b2" font-size="8.5" text-anchor="middle">big</text>
    <line x1="258" y1="97" x2="326" y2="68" stroke="#9aa4b2" stroke-width="1" marker-end="url(#jj)"/>
    <text x="291" y="150" fill="#9aa4b2" font-size="8.3" text-anchor="middle">small builds hash, big probes</text>
    <text x="291" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">suits: big tables, equality joins</text>
    <text x="483" y="28" fill="#d6a45c" font-size="10.5" text-anchor="middle" font-weight="bold">Merge Join</text>
    <rect x="416" y="42" width="34" height="16" rx="3" fill="#262b3a" stroke="#d6a45c" stroke-width="1.1"/><text x="433" y="54" fill="#e6e6e6" font-size="8" text-anchor="middle">1</text>
    <rect x="416" y="62" width="34" height="16" rx="3" fill="#262b3a" stroke="#d6a45c" stroke-width="1.1"/><text x="433" y="74" fill="#e6e6e6" font-size="8" text-anchor="middle">3</text>
    <rect x="416" y="82" width="34" height="16" rx="3" fill="#262b3a" stroke="#d6a45c" stroke-width="1.1"/><text x="433" y="94" fill="#e6e6e6" font-size="8" text-anchor="middle">5</text>
    <rect x="516" y="42" width="34" height="16" rx="3" fill="#262b3a" stroke="#d6a45c" stroke-width="1.1"/><text x="533" y="54" fill="#e6e6e6" font-size="8" text-anchor="middle">2</text>
    <rect x="516" y="62" width="34" height="16" rx="3" fill="#262b3a" stroke="#d6a45c" stroke-width="1.1"/><text x="533" y="74" fill="#e6e6e6" font-size="8" text-anchor="middle">4</text>
    <rect x="516" y="82" width="34" height="16" rx="3" fill="#262b3a" stroke="#d6a45c" stroke-width="1.1"/><text x="533" y="94" fill="#e6e6e6" font-size="8" text-anchor="middle">6</text>
    <path d="M450,50 C480,50 486,90 514,90" fill="none" stroke="#9aa4b2" stroke-width="1"/>
    <path d="M450,70 C480,70 486,50 514,50" fill="none" stroke="#9aa4b2" stroke-width="1"/>
    <text x="483" y="150" fill="#9aa4b2" font-size="8.3" text-anchor="middle">sort both sides, merge like a zipper</text>
    <text x="483" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">suits: already sorted / indexed</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">No JOIN algorithm is absolutely better, only better suited: <b style="color:#4f6df5">Nested Loop</b> is fast for small tables (or an indexed inner table), <b style="color:#54b890">Hash Join</b> handles big equality joins, <b style="color:#d6a45c">Merge Join</b> saves effort when the data is already sorted. The same set of concepts as Spark's broadcast vs sort-merge</figcaption>
</figure>

## Reading a real plan

Put it together and look at how to read the plan for `orders JOIN customers`:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 200" role="img" aria-label="An EXPLAIN plan: at the top a Hash Join; one branch is a Seq Scan on orders, a full scan of a big table worth asking whether to index; the other branch under Hash is an Index Scan on customers, a small table that used its index. Read it with the deepest indentation running first; cost is an estimate, and EXPLAIN ANALYZE gives the real actual figures" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="30" y="42" fill="#54b890" font-size="11" text-anchor="start" font-weight="bold">Hash Join</text>
    <text x="118" y="42" fill="#9aa4b2" font-size="9.5" text-anchor="start">(cost=… rows=500)</text>
    <line x1="300" y1="38" x2="332" y2="38" stroke="#54b890" stroke-width="1" stroke-dasharray="3 2"/>
    <text x="338" y="41" fill="#54b890" font-size="8.7" text-anchor="start">Hash Join (small side builds, big side probes)</text>
    <text x="56" y="76" fill="#9aa4b2" font-size="10" text-anchor="start">-&gt;</text>
    <text x="92" y="76" fill="#e0733a" font-size="10.5" text-anchor="start" font-weight="bold">Seq Scan on orders</text>
    <line x1="300" y1="72" x2="332" y2="72" stroke="#e0733a" stroke-width="1" stroke-dasharray="3 2"/>
    <text x="338" y="75" fill="#e0733a" font-size="8.7" text-anchor="start">full scan of orders — should this be indexed?</text>
    <text x="56" y="110" fill="#9aa4b2" font-size="10" text-anchor="start">-&gt;  Hash</text>
    <text x="80" y="144" fill="#9aa4b2" font-size="10" text-anchor="start">-&gt;</text>
    <text x="116" y="144" fill="#4f6df5" font-size="10.5" text-anchor="start" font-weight="bold">Index Scan on customers</text>
    <line x1="332" y1="140" x2="360" y2="140" stroke="#4f6df5" stroke-width="1" stroke-dasharray="3 2"/>
    <text x="366" y="143" fill="#4f6df5" font-size="8.7" text-anchor="start">customers used its index ✓</text>
    <line x1="30" y1="164" x2="590" y2="164" stroke="#3a4154" stroke-width="1"/>
    <text x="310" y="184" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Reading: deepest indentation runs first; cost is the optimizer's "estimate", EXPLAIN ANALYZE gives real actual time / rows</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Read inside out: scan customers (via index) to build the hash, scan orders to probe, and the Hash Join combines them at the top. A big-table <code>Seq Scan</code> should make you ask "is an index missing here" — that's how a performance problem becomes a line you can point at on screen</figcaption>
</figure>

The three things to look for when reading a plan: **① a `Seq Scan` where an index should have been used?** (missing index, or [[sql-index|disabled by a function/type mismatch]]) **② was the right JOIN algorithm chosen?** (a small-table join using Nested Loop over a big table is a disaster) **③ do the estimated `rows` differ from `EXPLAIN ANALYZE`'s actual by orders of magnitude?** — a big gap means **stale statistics**; the optimizer holding wrong estimates picks the wrong plan, and running `ANALYZE` to refresh the statistics often fixes it outright.

## Reflections

### Reading the plan turns "guessing" into "seeing"

The takeaway from this post is almost word for word the same as [[spark-explain|the Spark post]]: **before you can read a plan, performance is mysticism; after, it's lines on a screen you can understand.** I used to debug slow queries by experience and by trial and error; now the first step is always `EXPLAIN ANALYZE`, letting the plan tell me directly which step is the bottleneck, how many rows it scanned, how the join was done. This discipline of "read the plan before touching anything" is fully shared between SQL and Spark — **the underlying thinking crosses engines; learn one and you're halfway through the other.**

### Cost is an estimate; ANALYZE is the fact

`EXPLAIN`'s `rows` and `cost` are the optimizer's **guesses from statistics**, not reality. I've been burned staring at a pretty cost and assuming all was well, only for the real run to be dreadfully slow — because the statistics were stale, the optimizer estimated a step with a million rows at a thousand, and the plan went completely sideways. So now I only trust `EXPLAIN ANALYZE`'s `actual`. There's a bigger truth here: **however clever the optimizer, it's only as accurate as the statistics in its hands.** Estimates drifting from reality is the root of many "inexplicably slow" incidents — and the fix is often laughably plain: refresh the statistics.

### No JOIN algorithm is best, only best suited

Nested Loop, Hash and Merge each have their home ground, and the optimizer usually picks right. But "usually" isn't "always" — when its estimates are off, it can run Nested Loop over a big table and be a thousand times slower. You need to be able to read "why it chose this, and what it should have been" to judge whether the optimizer got it wrong. That requires genuinely understanding the temperament of the three algorithms, and that knowledge is **the same set** as [[sql-joins|post 2's join memory]] and Spark's broadcast vs sort-merge — in the end, "how data gets matched" is the same physics on one machine and across many. Learn it thoroughly once and it serves you on every engine.
