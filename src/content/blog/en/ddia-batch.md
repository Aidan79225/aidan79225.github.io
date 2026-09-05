---
title: "Batch Processing: The Spirit of MapReduce, Two Roads to a Join, and the Virtue of Immutable Inputs"
date: 2026-07-24
category: tech
description: "Part III opens: data starts flowing between systems, and the oldest, most reliable way for it to flow is batch. DDIA Ch10 presents MapReduce as \"a Unix pipe across a thousand machines\" — small tools, a uniform interface, immutable inputs. Three points: the anatomy of map–shuffle–reduce (shuffle is the expensive step), the two roads to a batch join (reduce-side sort-merge is general but heavy; map-side broadcast is fast but the small table must fit in memory — the ancestor of Spark's broadcast join), and batch's most underrated virtue: inputs are immutable and outputs can be recomputed, so human error gets a lifeline."
tags:
  - distributed-systems
  - book-notes
  - data-engineering
series: "Designing Data-Intensive Applications — Reading Notes"
seriesOrder: 10
comments: true
draft: false
translationOf: ddia-batch
---
[[ddia-consistency-consensus|Part II]] held consistency together inside a single system; Part III's theme switches to **data flowing between systems** — and the oldest, most reliable way for it to flow is **batch**. DDIA's way into MapReduce is distinctive: it starts with the **Unix philosophy** — small tools, each doing one thing well, connected by pipes through a uniform interface (files and streams). Then it names the theme in one line: **MapReduce is a Unix pipe across a thousand machines** — immutable inputs, output written as new files, tools linked by a uniform format. That spirit has outlived MapReduce itself by a long way.

## Anatomy of MapReduce: map, shuffle, reduce — the expensive one is in the middle

Take "count clicks per URL" as the example; three steps and done:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="The three-step anatomy of MapReduce. The input is log shards scattered across machines. Step one, map: each machine processes its own shard in place, record by record, extracting key value pairs such as a URL and a 1, without moving data. Step two, shuffle: redistribute by key, so all data for the same key moves across the network to the same reducer and is sorted — the only step that moves data at scale, and the most expensive step of the whole job. Step three, reduce: each reducer aggregates the gathered records for each key and writes an output file. Note below: every distributed compute engine spends its cost in the shuffle; understand it and you understand half of performance tuning." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="mr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker><marker id="mrO" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e0733a"/></marker></defs>
    <text x="80" y="22" fill="#9aa4b2" font-size="8.4" text-anchor="middle" font-weight="bold">input (immutable)</text>
    <rect x="30" y="32" width="100" height="22" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="80" y="47" fill="#9aa4b2" font-size="7" text-anchor="middle">log shard 1</text>
    <rect x="30" y="60" width="100" height="22" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="80" y="75" fill="#9aa4b2" font-size="7" text-anchor="middle">log shard 2</text>
    <rect x="30" y="88" width="100" height="22" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="80" y="103" fill="#9aa4b2" font-size="7" text-anchor="middle">log shard 3</text>
    <text x="212" y="22" fill="#4f6df5" font-size="8.4" text-anchor="middle" font-weight="bold">① map (in place, parallel)</text>
    <rect x="162" y="32" width="100" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="212" y="47" fill="#e6e6e6" font-size="6.8" text-anchor="middle" font-family="monospace">(/a,1)(/b,1)…</text>
    <rect x="162" y="60" width="100" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="212" y="75" fill="#e6e6e6" font-size="6.8" text-anchor="middle" font-family="monospace">(/a,1)(/c,1)…</text>
    <rect x="162" y="88" width="100" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="212" y="103" fill="#e6e6e6" font-size="6.8" text-anchor="middle" font-family="monospace">(/b,1)(/a,1)…</text>
    <line x1="130" y1="43" x2="160" y2="43" stroke="#9aa4b2" stroke-width="1" marker-end="url(#mr)"/><line x1="130" y1="71" x2="160" y2="71" stroke="#9aa4b2" stroke-width="1" marker-end="url(#mr)"/><line x1="130" y1="99" x2="160" y2="99" stroke="#9aa4b2" stroke-width="1" marker-end="url(#mr)"/>
    <text x="212" y="126" fill="#9aa4b2" font-size="6.8" text-anchor="middle">extract (key, value) per record, no data moved</text>
    <text x="357" y="22" fill="#e0733a" font-size="8.4" text-anchor="middle" font-weight="bold">② shuffle (redistribute by key)</text>
    <path d="M262 43 C 300 43, 310 52, 336 56" fill="none" stroke="#e0733a" stroke-width="1.2" marker-end="url(#mrO)"/>
    <path d="M262 71 C 300 71, 310 60, 336 60" fill="none" stroke="#e0733a" stroke-width="1.2" marker-end="url(#mrO)"/>
    <path d="M262 99 C 300 99, 310 92, 336 88" fill="none" stroke="#e0733a" stroke-width="1.2" marker-end="url(#mrO)"/>
    <text x="357" y="128" fill="#e0733a" font-size="6.8" text-anchor="middle" font-weight="bold">same key → same node, sorted</text>
    <text x="357" y="140" fill="#e0733a" font-size="6.8" text-anchor="middle" font-weight="bold">the only big move = most expensive</text>
    <text x="470" y="22" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">③ reduce (aggregate groups)</text>
    <rect x="404" y="46" width="132" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="470" y="62" fill="#e6e6e6" font-size="6.8" text-anchor="middle" font-family="monospace">/a:(1,1,1)→ /a=3</text>
    <rect x="404" y="78" width="132" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="470" y="94" fill="#e6e6e6" font-size="6.8" text-anchor="middle" font-family="monospace">/b:(1,1)→ /b=2 …</text>
    <line x1="470" y1="70" x2="470" y2="76" stroke="#9aa4b2" stroke-width="0"/>
    <rect x="404" y="152" width="132" height="22" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="470" y="167" fill="#d6a45c" font-size="7" text-anchor="middle">output: written as "new" files</text>
    <line x1="470" y1="102" x2="470" y2="150" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#mr)"/>
    <rect x="30" y="192" width="520" height="36" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="207" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-weight="bold">map runs in place (bring compute to the data) · shuffle is the only big move, and where all the cost lives</text>
    <text x="290" y="222" fill="#9aa4b2" font-size="7.4" text-anchor="middle">groupBy, join, dedupe… every "same key must meet" operation is a shuffle underneath</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">map</b> extracts (key, value) record by record <b>in place</b>, on the machine where the data lives — bring the computation to the data, not the data to the computation; <b style="color:#e0733a">shuffle</b> gathers all the data for <b>the same key</b> onto one node across the network and sorts it — <b>the only big move in the whole job, and the most expensive step</b>; <b style="color:#54b890">reduce</b> aggregates each gathered key group and writes the output as <b>new files</b> (the input is never touched). <a href="/blog/spark-intro/">Spark</a>'s stage boundaries and half the work of performance tuning live in the shuffle — <b>every operation where "the same key must meet" (groupBy, join, dedupe) is a shuffle underneath</b></figcaption>
</figure>

## Two roads to a batch join: move everything, or bring a cheat sheet

The most common heavy lifting in the batch world is the **join** (click logs joined with a user table). [[sql-joins|Single-machine join algorithms]] I covered in the SQL series; the core question of the distributed version becomes: **two datasets are scattered across different machines — how do rows with the same key meet?** Two roads:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 234" role="img" aria-label="Two roads to a distributed batch join. Left, reduce-side join, sort-merge: both sides are shuffled by the join key, so log rows and user rows with the same key meet on the same reducer and are merged; general, no preconditions, but both sides move at scale, the heaviest option. Right, map-side join, broadcast: if one side is small enough, say the user table fits in memory, the whole small table is copied to every mapper as a cheat sheet, and the big table joins in place by looking it up, with no shuffle at all, far faster; but the precondition is that the small table must fit in memory. Below: Spark's broadcast join is this road, and the criterion is one question: does the small table fit in memory." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="bj" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e0733a"/></marker><marker id="bjg" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <line x1="290" y1="14" x2="290" y2="186" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#e0733a" font-size="9.4" text-anchor="middle" font-weight="bold">reduce-side (sort-merge): move both</text>
    <rect x="36" y="40" width="92" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="82" y="56" fill="#9aa4b2" font-size="7" text-anchor="middle">click log (big)</text>
    <rect x="160" y="40" width="92" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="206" y="56" fill="#9aa4b2" font-size="7" text-anchor="middle">user table (big)</text>
    <line x1="82" y1="64" x2="126" y2="102" stroke="#e0733a" stroke-width="1.3" marker-end="url(#bj)"/>
    <line x1="206" y1="64" x2="162" y2="102" stroke="#e0733a" stroke-width="1.3" marker-end="url(#bj)"/>
    <text x="146" y="88" fill="#e0733a" font-size="7" text-anchor="middle" font-weight="bold">both shuffled by user_id</text>
    <rect x="76" y="106" width="140" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="146" y="125" fill="#e6e6e6" font-size="7.2" text-anchor="middle">same key meets on one reducer</text>
    <text x="146" y="158" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">✓ general: no preconditions</text>
    <text x="146" y="174" fill="#e0733a" font-size="7.4" text-anchor="middle">✗ both sides move at scale, heaviest</text>
    <text x="434" y="26" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">map-side (broadcast): bring a cheat sheet</text>
    <rect x="324" y="40" width="92" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="370" y="56" fill="#9aa4b2" font-size="7" text-anchor="middle">click log (big)</text>
    <rect x="448" y="40" width="100" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="498" y="56" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">user table (small)</text>
    <line x1="486" y1="64" x2="400" y2="100" stroke="#54b890" stroke-width="1.2" stroke-dasharray="3 2" marker-end="url(#bjg)"/><line x1="498" y1="64" x2="470" y2="100" stroke="#54b890" stroke-width="1.2" stroke-dasharray="3 2" marker-end="url(#bjg)"/>
    <text x="504" y="88" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">copied whole to every node</text>
    <rect x="332" y="104" width="100" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="382" y="116" fill="#e6e6e6" font-size="6.8" text-anchor="middle">mapper 1</text><text x="382" y="128" fill="#9aa4b2" font-size="6.4" text-anchor="middle">joins in place via lookup</text>
    <rect x="444" y="104" width="100" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="494" y="116" fill="#e6e6e6" font-size="6.8" text-anchor="middle">mapper 2</text><text x="494" y="128" fill="#9aa4b2" font-size="6.4" text-anchor="middle">joins in place via lookup</text>
    <text x="434" y="158" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">✓ no shuffle at all, far faster</text>
    <text x="434" y="174" fill="#e0733a" font-size="7.4" text-anchor="middle">✗ requires: small table fits in memory</text>
    <rect x="30" y="196" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="213" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">Spark's broadcast join is the right-hand road — the one criterion: "does the small table fit in memory?"</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e0733a">Reduce-side join</b>: both sides are shuffled by the join key, rows with the same key meet on the same reducer and are sort-merged — <b>general</b> (no preconditions), but both sides move at scale, the heaviest option. <b style="color:#54b890">Map-side broadcast join</b>: if one side is small enough, <b>copy it whole to every mapper</b> as a "cheat sheet", and the big table joins in place by lookup — <b>skipping the shuffle entirely</b>, far faster, but the small table must fit in memory. <a href="/blog/spark-intro/">Spark</a>'s broadcast join is this road's direct descendant; the criterion for choosing is one question: <b>does the small side fit in memory?</b></figcaption>
</figure>

MapReduce itself has a big drawback: **every job's output has to be fully materialised to HDFS and read back by the next job** — a ten-step pipeline writes and reads disk ten times. The later **dataflow engines** ([[spark-intro|Spark]], Flink) evolved precisely against this: draw the whole pipeline as a DAG of operators, keep intermediate results in memory as far as possible, and recover from failure by recomputing locally from lineage. **MapReduce the "product" was replaced, but its spirit — partitioned parallelism, bringing compute to the data, concentrating cost in the shuffle — lives on unchanged in every modern engine.**

## Batch's most underrated virtue: inputs are immutable, so mistakes can be redone

There's an observation in this chapter that's easy to skip and that I consider the most important: batch processing inherits Unix's best character trait — **inputs are read-only, outputs are written somewhere new**. That gives a capability the author calls **"human fault tolerance"**: the code was wrong, the logic had a bug, yesterday's report came out broken — **fix the code and rerun against the untouched input**. Errors don't accumulate, don't pollute the source; the worst case is a wasted round of computation. Compare a pipeline that UPDATEs the database directly: one bug corrupts the only truth, and recovery takes backups and tears. **Rerunnability is the greatest gift batch gave data engineering** — [[medallion-architecture|Medallion keeping an immutable Bronze layer]], [[airflow-reliability|Airflow's idempotency and backfill]], are all modern incarnations of this virtue.

## Reflections

### "Human fault tolerance" is the line I most want to say on batch's behalf

People call batch old and slow, but after years in data what I'm most grateful to it for is precisely this unsexy virtue: **people will make mistakes, and batch makes mistakes reversible.** Logic wrong? Fix and rerun. Yesterday's dimension table broken? Rebuild from Bronze. That sense of safety — "if it's wrong, you can go back to the start" — costs ten times the effort to obtain in the streaming world (once an event has flowed past, it's gone). So the discipline I give teams has always been: **the raw layer is read-only and kept forever, and every downstream is treated as a derivative that can be "burned down and rebuilt at any time"** — that's the soul of [[medallion-architecture|Medallion]], and its theoretical basis is in this chapter. System fault tolerance relies on replicas; **human fault tolerance relies on immutability** — the latter is discussed far too little and causes far more incidents.

### Shuffle is the rent of distributed computing — understand it and tuning has a map

Of MapReduce's three steps, map and reduce both run "in place"; only the shuffle moves data — and **nearly the entire cost of distributed computing lives in that step**. Once that clicks, a pile of scattered practical knowledge snaps into place: why [[infra-spark|Spark]]'s stages are cut at shuffle boundaries, why data skew is deadly (all of one key's data crammed onto one node), why broadcast join is fast (it skips the shuffle entirely), why filtering before a groupBy saves so much (shrink before you move). Now, faced with any slow batch job, my first question is always: **how much data does it shuffle? Can it move less, shrink earlier, or just bring a cheat sheet and not move at all?** That one question is half of tuning.

### The tool died, the philosophy lives — learn things down to that layer

MapReduce as a product has been retired, but the chapter reads as anything but dated, because it teaches three ideas that are still alive: **bring the computation to the data** (not the reverse), **use immutable files as the uniform interface between tools** (the Unix pipe writ large), and **concentrate cross-machine complexity in one place, the shuffle**. Spark is their new shell; dbt's model chains and [[medallion-architecture|Medallion]]'s layering are, underneath, the same "each step reads an immutable input and writes a new output". It confirms once more the order in which I learn technology: **APIs change every year or two, architectures every three to five, but design ideas at this level serve you for twenty.** That's the point of reading a book like DDIA — when the next new tool ships, you recognise at a glance "oh, that idea again in new clothes". The next post covers its other half: when data no longer arrives "a batch at a time" but "all the time" — streams.
