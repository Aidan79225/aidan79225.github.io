---
title: "Where to Store Data: The Storage Hierarchy and Its Abstractions, Reading Fundamentals of Data Engineering, Ch. 6"
date: 2026-07-01
category: tech
tags:
 - data-engineering
 - book-notes
series: "Fundamentals of Data Engineering — Reading Notes"
seriesOrder: 6
comments: true
draft: false
translationOf: fode-6
---
[[fode-5|The previous post]] was about data being born at the source. The first thing after it's born: **where does it go?** This chapter is about storage — and its most counter-intuitive point is that **storage isn't "one thing"; it's a whole hierarchy from nanoseconds to hours, from astronomically expensive to dirt cheap.** Understand that hierarchy and every later decision about "where to put it, how long, at what cost" has a basis.

## Storage is a hierarchy, not an option

The book stacks upward from the most basic physical materials: CPU cache, RAM, SSD, HDD, object storage, cold storage. The difference between them isn't "better or worse" but **different points on the same trade-off** — faster means more expensive and smaller; cheaper means slower and bigger. Between levels, **unit price and latency each differ by several orders of magnitude**.

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 560 300" role="img" aria-label="The storage hierarchy, top to bottom: CPU cache, RAM, SSD, HDD, object storage, cold storage; higher is faster, pricier and smaller, lower is slower, cheaper and bigger; object storage is the centre of gravity for data engineering" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
 <text x="280" y="18" fill="#9aa4b2" font-size="9.5" text-anchor="middle">↑ higher: faster, pricier, smaller</text>
 <rect x="215" y="30" width="130" height="34" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="280" y="52" fill="#e6e6e6" font-size="10" text-anchor="middle">CPU cache</text><text x="548" y="52" fill="#9aa4b2" font-size="8.5" text-anchor="end">~1 ns</text>
 <rect x="193" y="70" width="175" height="34" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="280" y="92" fill="#e6e6e6" font-size="10" text-anchor="middle">RAM</text><text x="548" y="92" fill="#9aa4b2" font-size="8.5" text-anchor="end">~100 ns · volatile</text>
 <rect x="168" y="110" width="225" height="34" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="280" y="132" fill="#e6e6e6" font-size="10" text-anchor="middle">SSD</text><text x="548" y="132" fill="#9aa4b2" font-size="8.5" text-anchor="end">~0.1 ms</text>
 <rect x="138" y="150" width="285" height="34" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="280" y="172" fill="#e6e6e6" font-size="10" text-anchor="middle">HDD (spinning disk)</text><text x="548" y="172" fill="#9aa4b2" font-size="8.5" text-anchor="end">~10 ms</text>
 <rect x="100" y="190" width="360" height="34" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/><text x="280" y="212" fill="#e6e6e6" font-size="10.5" text-anchor="middle">object storage (S3 / GCS)</text><text x="548" y="212" fill="#9aa4b2" font-size="8.5" text-anchor="end">~100 ms · very cheap</text>
 <rect x="55" y="230" width="410" height="34" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3"/><text x="280" y="252" fill="#e6e6e6" font-size="10" text-anchor="middle">archive / cold storage</text><text x="548" y="252" fill="#9aa4b2" font-size="8.5" text-anchor="end">mins–hrs · cheapest</text>
 <text x="280" y="286" fill="#9aa4b2" font-size="9.5" text-anchor="middle">↓ lower: slower, cheaper, bigger</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Storage is a speed↔cost hierarchy, with unit price and latency each spanning several orders of magnitude; data engineering's centre of gravity is the cheapest, near-unlimited object storage (blue)</figcaption>
</figure>

This hierarchy is also the principle behind a **cache**: move hot data up (fast, expensive), leave cold data below (slow, cheap). [[spark-shuffle|Spark caching data in memory]], a database using RAM as a buffer — the same move: trade expensive space for speed.

## The layer that matters most to data engineering: object storage

The upper levels (RAM, SSD) are mostly hidden underneath by databases and engines; you rarely touch them directly. What a DE faces every day is **system-level storage**, three kinds side by side:

| Type | Like | Typical use |
|---|---|---|
| **File storage** | A normal filesystem, folders | Development, small volumes, mounts |
| **Block storage** | A raw disk (EBS) | Underneath databases / VMs |
| **Object storage** | One enormous key-value warehouse | Massive unstructured data |

The star of the three is **object storage (S3, GCS, Azure Blob)**; modern data lakes are nearly all built on it, and the book spends the most pages on it. Why? **Near-unlimited scale, pay-per-use and very cheap, immutable objects (ideal as a replayable raw layer), and inherently separated from compute.** That last point leads to the chapter's biggest theme.

## The chapter's biggest theme: separation of compute and storage

In a traditional database or Hadoop, **compute and storage are bound to the same machine** — want more compute, you add disks with it; want more capacity, you add CPUs with it; the two always scale together, and one side is usually full while the other idles. The cloud era took them apart:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 600 250" role="img" aria-label="Before and after separating compute and storage: traditionally compute and disk are bound on the same machine and scale together; the modern approach puts data in shared object storage, and multiple compute engines spin up on demand, shut down when done, and scale independently" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
 <defs><marker id="st1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <line x1="300" y1="30" x2="300" y2="232" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 5"/>
 <text x="150" y="22" fill="#9aa4b2" font-size="10.5" text-anchor="middle">Traditional: compute bound to storage</text>
 <rect x="64" y="48" width="80" height="96" rx="6" fill="none" stroke="#3a4154" stroke-width="1.4"/>
 <rect x="72" y="56" width="64" height="40" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="104" y="80" fill="#e6e6e6" font-size="9" text-anchor="middle">Compute</text>
 <rect x="72" y="100" width="64" height="38" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="104" y="123" fill="#e6e6e6" font-size="9" text-anchor="middle">Disk</text>
 <rect x="168" y="48" width="80" height="96" rx="6" fill="none" stroke="#3a4154" stroke-width="1.4"/>
 <rect x="176" y="56" width="64" height="40" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="208" y="80" fill="#e6e6e6" font-size="9" text-anchor="middle">Compute</text>
 <rect x="176" y="100" width="64" height="38" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="208" y="123" fill="#e6e6e6" font-size="9" text-anchor="middle">Disk</text>
 <text x="150" y="172" fill="#9aa4b2" font-size="8.5" text-anchor="middle">more compute means more disks,</text>
 <text x="150" y="186" fill="#9aa4b2" font-size="8.5" text-anchor="middle">more capacity means more CPUs</text>
 <text x="150" y="204" fill="#e6e6e6" font-size="8.5" text-anchor="middle">→ locked together, one side wasted</text>
 <text x="450" y="22" fill="#9aa4b2" font-size="10.5" text-anchor="middle">Modern: compute / storage separated</text>
 <rect x="340" y="56" width="66" height="42" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="373" y="81" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Spark</text>
 <rect x="417" y="56" width="66" height="42" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="450" y="81" fill="#e6e6e6" font-size="9.5" text-anchor="middle">SQL engine</text>
 <rect x="494" y="56" width="66" height="42" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.3" stroke-dasharray="4 3"/><text x="527" y="81" fill="#e6e6e6" font-size="9.5" text-anchor="middle">ad-hoc job</text>
 <line x1="373" y1="98" x2="392" y2="148" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#st1)"/>
 <line x1="450" y1="98" x2="450" y2="148" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#st1)"/>
 <line x1="527" y1="98" x2="508" y2="148" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#st1)"/>
 <rect x="336" y="150" width="228" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/><text x="450" y="170" fill="#e6e6e6" font-size="10" text-anchor="middle">object storage (shared · durable)</text><text x="450" y="185" fill="#9aa4b2" font-size="8" text-anchor="middle">cheap, near unlimited</text>
 <text x="450" y="214" fill="#9aa4b2" font-size="8.5" text-anchor="middle">scale independently · start on demand · gone when done</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Separating compute from storage is the biggest shift of the cloud era: data sits in cheap, durable object storage, compute engines spin up on demand and shut down when done, and neither side binds the other</figcaption>
</figure>

That split explains why a whole pile of architectures from the last decade look the way they do: one copy of the data in object storage, **to run Spark you start a batch of [[airflow-spark-on-k8s|executor pods]], to run SQL you call a query engine, and when it's done you shut everything down and keep only the data**. You no longer keep machines all year for "how much compute do we need at peak", nor are you forced to add CPUs because the data grew. [[spark-running|Spark's on-demand driver/executor scaling]], the lakehouse, serverless queries — the foundation of all of them is this one line.

### But don't misread it: sometimes bound together is the right answer

Separation wins for workloads like "elasticity, cost, the lake" — not all of them. **MPP databases (Greenplum, Teradata, classic Redshift) deliberately bind compute and storage**, and for good reason: each segment node stores its slice of data on local disk and computes in place, and the distribution key makes joins happen locally without redistributing across the network. What that buys is **stable low latency and high concurrency** that the separated model can't offer — BI dashboards, queries with an SLA, lots of complex joins; local disk plus a deeply integrated optimizer is hard to beat.

| | Bound together (MPP) | Separated (object storage + elastic compute) |
|---|---|---|
| Optimised for | Stable low latency, high concurrency | Elasticity, idle cost, independent scaling |
| Data locality | Built in | Recovered through caching |
| Pain points | Can't be shut down, adding nodes means redistribution, cold data occupies expensive compute | Network latency, kept alive by caches |

And the line is **converging through caching**: the separated camp caches hot data on local NVMe (Snowflake's local cache, Databricks' disk cache) to restore locality after the fact. What everyone's really fighting for is **data locality** — MPP has it natively, the lakehouse gets it back later. In practice the common pattern is **both**: the lake holds massive raw/cold data, and an MPP or warehouse is the high-concurrency serving layer — which lines up with the abstraction layers and data temperature in the next section.

## Three storage abstractions for data engineering

On top of the object-storage foundation, a DE faces three higher-level abstractions. Their differences came up in [[medallion-architecture|the Medallion post]] too; here's a table to pin them down:

| Abstraction | In one line | When schema applies |
|---|---|---|
| **Data warehouse** | Structured, optimised for analytics | schema-on-write (must match the format on the way in) |
| **Data lake** | A raw pool where everything gets dumped first | schema-on-read (structure applied when reading) |
| **Data lakehouse** | The lake's flexibility + the warehouse's management | Both converge (ACID and schema added on top of the lake) |

The direction of evolution is clear: **the lake is too messy (everything dumped in, hard to govern), the warehouse too rigid (expensive, only takes structured data), and the lakehouse wants both sides' advantages** — restoring transactional guarantees and schema management on top of cheap object storage.

## Data has a temperature: hot/cold tiering and retention

One last practical concept: **data temperature**. Not all data belongs in the same tier.

- **Hot**: queried often, on a fast tier (SSD / memory / standard object storage), expensive but fast.
- **Warm**: queried occasionally, on a somewhat cheaper tier.
- **Cold**: almost never queried but kept for compliance or backup, thrown into archive (cold storage), cheapest and slowest to retrieve.

Paired with **retention**: data isn't kept forever just because it was stored; it should have a lifecycle — when to cool it down, when to delete it. That's both **saving money** (don't let cold data occupy an expensive tier) and **compliance** (what should be deleted gets deleted). Same thinking as [[kafka-ops|Kafka's retention / compaction]]: **storage has to be actively managed, not an infinite backlog.**

## Reflections

### What "separation of compute and storage" really taught me is to pick sides by workload

This chapter spelled out something I use daily but had never condensed into one line. Resources used to be machines of "CPU paired with disk", bought together and idle together; after separation, **data goes to object storage and compute spins up on demand**, and the whole cost structure changed — almost no compute spend when nothing's running, and only at peak do you fill up the [[airflow-spark-on-k8s|executors]]. The "delete when done" I kept repeating in [[spark-running|Spark deployment]] and [[airflow-spark-on-k8s|Spark on K8s]] is, at root, this principle landing.

But I once treated it as "progress vs backward", and a counterexample corrected me: **plenty of people run Greenplum and still keep compute inside the DB**, and they're right. For high-concurrency serving queries that need stable low latency, MPP's "data is right here on the local disk, compute in place" is faster — bound together isn't old-fashioned, it's a trade-off for locality. So my judgement now isn't "default to separation" but **look at the workload first**: elastic, cost-sensitive, lots of cold data → separate; high concurrency, stable latency → bind (or separate and restore locality through caching). It's the same sentence as [[fode-4|Ch. 4]]'s "architecture before tools, every choice is a trade-off" — separation is a powerful default, not a universal answer.

### The storage foundation I bet on is still object storage

Looking back at [[fode-4|Ch. 4]]'s "bet on the immutable foundation", my bets at the storage layer are consistent: **raw data always lands in object storage first**, immutable and replayable, and the engines above come and go freely. That's two faces of the same decision as [[medallion-architecture|Medallion]] guarding an immutable Bronze. Object storage is so cheap that "store it first, ask later" barely hurts, and it'll probably still be here in ten years — putting the most important asset on the most stable, cheapest tier is a choice I get more comfortable with the longer I do this.

### Data temperature was taught to me by the bill

"Hot/cold tiering" sounds basic, but I only started managing it seriously after a cloud storage bill scared me. A pile of old data queried less than once a year was lying in the standard tier burning money by the day. Once lifecycle rules were set (auto-cool, auto-archive, purge on expiry), the bill slimmed down immediately. The lesson: **the cost of storage isn't in "storing", it's in "forgetting to manage".** Now, whenever I build a data layer, retention and tiering rules are designed together with the data itself, rather than patched in after the bill explodes — the same attitude I take to [[pain-before-power|tools]]: design the trade-off deliberately, don't let defaults decide your costs.
