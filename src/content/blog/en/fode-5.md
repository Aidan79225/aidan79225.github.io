---
title: "Where Data Comes From: Source Systems and Data Generation, Reading Fundamentals of Data Engineering, Ch. 5"
date: 2026-06-30
category: tech
tags:
  - data-engineering
  - book-notes
series: "Fundamentals of Data Engineering — Reading Notes"
seriesOrder: 5
comments: true
draft: false
translationOf: fode-5
---
The first four chapters were the big picture — the [[fode-2|lifecycle]], [[fode-3|architecture]], [[fode-4|choosing technology]]. From this chapter on, the book walks step by step into each stage of the lifecycle. The first stop is the very front, and the one engineers most easily underrate: **how, and where, is data actually born?** The line to remember from this chapter — **data is born in systems you don't own; you are always downstream.**

## Setting the tone: you're downstream, and someone else controls the source

Data engineers rarely **generate** data; we **receive** it — from app developers, SaaS, sensors, other teams. That leads to a fact that runs through the whole chapter: **those source systems aren't yours to manage; you can't stop them changing their schema, their logic, their format.** What you can do is **understand them thoroughly** and **build resilience** to their changes.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 280" role="img" aria-label="The starting point of data engineering: on the left are various source systems (application databases, APIs and SaaS, files and logs, IoT, message streams), owned by others and changing on their own; after crossing your boundary they flow into the ingestion stage you're responsible for" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="src" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="119" y="16" fill="#9aa4b2" font-size="9.5" text-anchor="middle">Source systems — owned by others, change on their own</text>
    <rect x="14" y="24" width="210" height="236" rx="10" fill="none" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="5 4"/>
    <rect x="30" y="44" width="178" height="32" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="119" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">application DB (OLTP)</text>
    <rect x="30" y="86" width="178" height="32" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="119" y="106" fill="#e6e6e6" font-size="10.5" text-anchor="middle">API / SaaS</text>
    <rect x="30" y="128" width="178" height="32" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="119" y="148" fill="#e6e6e6" font-size="10.5" text-anchor="middle">files / logs</text>
    <rect x="30" y="170" width="178" height="32" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="119" y="190" fill="#e6e6e6" font-size="10.5" text-anchor="middle">IoT / sensors</text>
    <rect x="30" y="212" width="178" height="32" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="119" y="232" fill="#e6e6e6" font-size="10.5" text-anchor="middle">message queues / streams</text>
    <line x1="300" y1="28" x2="300" y2="258" stroke="#3a4154" stroke-width="1.3" stroke-dasharray="4 5"/>
    <text x="300" y="16" fill="#9aa4b2" font-size="9.5" text-anchor="middle">your boundary</text>
    <line x1="208" y1="60" x2="370" y2="132" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#src)"/>
    <line x1="208" y1="102" x2="370" y2="140" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#src)"/>
    <line x1="208" y1="144" x2="370" y2="144" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#src)"/>
    <line x1="208" y1="186" x2="370" y2="150" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#src)"/>
    <line x1="208" y1="228" x2="370" y2="158" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#src)"/>
    <rect x="372" y="116" width="150" height="56" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="447" y="140" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Ingestion</text>
    <text x="447" y="156" fill="#9aa4b2" font-size="8.5" text-anchor="middle">your lifecycle starts here</text>
    <line x1="522" y1="144" x2="572" y2="144" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#src)"/>
    <text x="552" y="134" fill="#4f6df5" font-size="8.5" text-anchor="middle">downstream</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The starting point of data engineering: data is born in systems you don't own. Before it crosses the boundary into the ingestion you're responsible for, all you can do is understand it and build resilience to its changes</figcaption>
</figure>

## What kinds of sources there are

The book takes stock of the common source systems. The point of remembering the list is that **each has its own temperament**, and the ingestion strategy follows:

| Source | In one line | Watch out for in ingestion |
|---|---|---|
| **Application DB (OLTP)** | The backend store of an online system, mostly CRUD | Don't run analytics on it directly (see below) |
| **API / SaaS** | A third-party service's public interface | Rate limits, pagination, the schema is their call |
| **Files / logs** | CSV, JSON, log files | Messy formats, no schema guarantee |
| **IoT / sensors** | Signals devices emit continuously | Huge volume, out of order, disconnect and resend |
| **Message queues / streams** | Events flowing through in real time | Delivery semantics and ordering (see [[kafka-delivery\|Kafka delivery guarantees]]) |

The book also mentions a source that's easy to miss: **analog to digital**. The true origin of much data is the physical world (a sentence, an action), born only at the moment some system "digitises" it — and how that step is done decides the quality of the data you get downstream.

## Source databases: they're OLTP, don't analyse on them directly

The most common source is the database behind some app, and it's almost always **OLTP** — optimised for "lots of small, fast transactions" (place an order, change an address, hit like), with **ACID** guaranteeing each transaction either succeeds or rolls back. It is **not** designed for "scan hundreds of millions of rows and aggregate". **Running analytical queries on a Production OLTP database means fighting live users for resources** — the classic beginner's disaster.

Another distinction to get straight is **how data leaves a trail**:

- **CRUD**: modify in place, delete in place. After an `UPDATE`, the old value **simply disappears** — you see only now, never history.
- **Insert-only**: every change **adds a row**, and old versions are all kept. The price is a table that keeps growing, but you get full history and replayability.

**CRUD saves space but loses history; insert-only keeps history but grows fast.** That trade-off affects how you build snapshots downstream and whether you can go back in time — the same nerve as [[medallion-architecture|Medallion]] guarding an "immutable, replayable" Bronze.

## Two roads out of the source database: batch queries vs CDC

If you shouldn't keep hammering the OLTP with queries, how does data get out? The book covers two main approaches, and the difference is worth drawing clearly:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 220" role="img" aria-label="Two roads out of the source database: on top, periodic batch queries that only capture the current snapshot and load the OLTP; below, CDC reading the database's change log, streaming out each insert, update and delete near real time without loading the primary" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="cd1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker><marker id="cd2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#54b890"/></marker></defs>
    <path d="M24 84 v52 a40 7 0 0 0 80 0 v-52" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><ellipse cx="64" cy="84" rx="40" ry="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="64" y="110" fill="#e6e6e6" font-size="11" text-anchor="middle">App DB</text><text x="64" y="125" fill="#9aa4b2" font-size="8" text-anchor="middle">OLTP</text>
    <line x1="104" y1="98" x2="188" y2="50" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#cd1)"/><text x="140" y="58" fill="#9aa4b2" font-size="8.5" text-anchor="middle">pull current</text>
    <rect x="190" y="26" width="156" height="46" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="268" y="46" fill="#e6e6e6" font-size="10.5" text-anchor="middle">periodic batch query</text><text x="268" y="61" fill="#9aa4b2" font-size="8" text-anchor="middle">snapshot</text>
    <text x="356" y="44" fill="#9aa4b2" font-size="8.5" text-anchor="start">grab the current state every N min</text>
    <text x="356" y="58" fill="#9aa4b2" font-size="8.5" text-anchor="start">→ misses changes between, loads the DB</text>
    <line x1="104" y1="122" x2="188" y2="170" stroke="#54b890" stroke-width="1.3" marker-end="url(#cd2)"/><text x="140" y="162" fill="#54b890" font-size="8.5" text-anchor="middle">read change log</text>
    <rect x="190" y="148" width="156" height="46" rx="7" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="268" y="168" fill="#e6e6e6" font-size="10.5" text-anchor="middle">CDC (read the DB log)</text><text x="268" y="183" fill="#9aa4b2" font-size="8" text-anchor="middle">log-based</text>
    <text x="356" y="166" fill="#9aa4b2" font-size="8.5" text-anchor="start">every insert / update / delete</text>
    <text x="356" y="180" fill="#9aa4b2" font-size="8.5" text-anchor="start">→ near real time, no load on the DB</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">A batch query only sees the current snapshot and misses the changes between two runs; CDC reads the database's change log and streams out every change — also the most common feed for an event stream</figcaption>
</figure>

**CDC (change data capture)** is the chapter's key concept: instead of querying the whole table over and over, **read the change log the database already writes for itself** (the log that exists for recovery anyway) and stream out every `insert / update / delete` continuously. It's near real time and adds almost no load to the primary, which is why it's so often the upstream of an event stream like [[kafka-intro|Kafka]] — turning a CRUD database's changes into a replayable stream of events.

## Schema drift: data engineering's eternal pain

The source isn't yours, and the most concrete pain is that **the schema will change**. One day an app engineer renames `user_name`, changes a field from string to object, quietly adds a nesting level — **and your downstream pipeline silently breaks or gets polluted.** The book distinguishes two kinds of source: **fixed schema** (relational databases, structure enforced at write time) and **schemaless** (much NoSQL / JSON, structure hidden in the data and liable to drift at any time). The latter is especially dangerous.

The pragmatic response, where the book and my experience agree: **don't assume the source is stable.** Negotiate a **data contract** for critical sources, **monitor schema changes** at the ingestion entry point, and make what breaks an alert rather than a report quietly wrong for a week. That's exactly the "data quality" and "monitoring" undercurrents of the [[fode-2|lifecycle]] landing concretely at the very top of the stream.

## Messages and streams, and "time"

If the source is real-time events, you'll meet two kinds of infrastructure — the book's distinction matches my [[kafka-intro|Kafka series]] exactly: **message queues** (a message is deleted once consumed) vs **event streaming platforms** (events are retained and replayable). I took the details apart in [[kafka-topics|Topics/Partitions]] and [[kafka-delivery|delivery guarantees]], so I won't repeat them.

The last concept, easy to overlook yet one that bites repeatedly, is **time**. The same event has three times: **event time** (when it actually happened), **ingestion time** (when it entered your system), **processing time** (when you computed it). The three are almost never equal — networks delay, devices come back online and resend. **Confuse them and you'll compute wrong** (using processing time as event time for a daily rollup, say), which is why I stressed watching event time and watermarks in the [[spark-streaming|Structured Streaming]] post.

## Reflections

### Realising "you don't own the source" changed how I write pipelines

What hit me hardest in this chapter was that it nailed down something I vaguely knew but had never said outright: **the source belongs to someone else, and it will change without me being told.** Early on I wrote ingestion assuming "the format upstream gives is the format", and one quiet column rename left a report wrong for days before anyone noticed. Now my stance is completely reversed — **receive data defensively**: validate the schema at the entry point, negotiate data contracts for critical sources, and prefer to argue at the boundary (an alert) over letting errors flow silently downstream. It's the same wariness as [[fode-4|Ch. 4]]'s "keep the changeable swappable", moved to the data layer.

### CDC is the best value-for-effort move I've seen

The "don't keep hammering the OLTP" rule I learned the sweet way, through CDC. Replacing a batch that scanned a full table every ten minutes — heavy, and missing changes anyway — with a CDC reading the database log, **the load on the primary dropped and data freshness went up**, and along the way it became a replayable event stream feeding downstream. Its beauty is "**borrowing what the database already writes**" — the log that exists for recovery became our source of truth for changes. Once you see this move, many "real time vs don't load the primary" dilemmas simply dissolve.

### The problems at the very top are often people problems, not technical ones

After writing this chapter I'm more certain: at the source, **the real difficulty is collaboration, not code.** Because the source belongs to another team, when the schema changes and why is a communication problem, not an engineering one. Now I go to the upstream app engineers proactively to align on "which columns are the contract and can't be changed casually", and put myself into their change process, rather than waiting passively for things to break. That echoes the softest yet most critical undercurrent in the [[fode-2|lifecycle]] — data engineering is, in the end, a cross-team discipline, and it starts at the very top of the stream.
