---
title: "Partitioning: Range or Hash, Where Secondary Indexes Live, and How to Rebalance"
date: 2026-07-24
category: tech
description: "Replication keeps the same data on several machines; partitioning (sharding) splits the data so each machine holds only a part — the only way out when one node can't hold it or can't take the writes. DDIA Ch6 works through partitioning's three hard problems: how to split (range keeps order but invites hot spots, hash scatters hot spots but loses range scans), where secondary indexes live (local is cheap to write but reads scatter/gather, global reads precisely but writes cross partitions), and how to rebalance when nodes come and go (never hash mod N; a fixed number of partitions is the mainstream answer — Redis Cluster's 16384 slots are the living example)."
tags:
  - distributed-systems
  - book-notes
  - partitioning
series: "Designing Data-Intensive Applications — Reading Notes"
seriesOrder: 6
comments: true
draft: false
translationOf: ddia-partitioning
---
[[ddia-replication|Replication]] keeps the same data on several machines; **partitioning (also called sharding) splits the data so each machine holds only a part** — when the dataset won't fit on one node, or one node can't take the write throughput, it's the only way out. The two are almost always **used together**: data is first cut into partitions, and each partition then does its own leader-follower replication. You've already met several partitioned systems: [[redis-cluster|Redis Cluster's 16384 slots]], [[kafka-topics|Kafka's partitions]], [[sql-mpp|the shards of an MPP database]] — what this chapter gives you is the three hard problems they all share: **how to split, where the index lives, and how to rebalance.**

## Problem one: how to split — range keeps order, hash breaks up hot spots

The goal of partitioning is to **spread** data and load evenly; the enemy is **skew** — everything crowding into one partition (a hot spot), so the split achieves nothing. The two mainstream ways of splitting are exactly a pair of trade-offs:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="Two partitioning strategies compared. Left, by key range: like the volumes of an encyclopedia, A to F in one partition, G to R in another, S to Z in a third; keys stay ordered, so range scans are efficient; but if the key is a timestamp, all of today's writes land on the last partition, a severe hot spot. Right, by hash of key: the hash sprays adjacent keys evenly across partitions, so load is even and hot spots are scattered; but ordering is lost and a range scan has to ask every partition. Below: Cassandra's compromise is a compound primary key, the first column hashed to choose the partition and the rest sorted within it; and hashing can't save a single extremely hot key, which the application must salt and spread." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="290" y1="14" x2="290" y2="176" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">By key range</text>
    <rect x="30" y="38" width="70" height="30" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="65" y="57" fill="#e6e6e6" font-size="8" text-anchor="middle">A–F</text>
    <rect x="110" y="38" width="70" height="30" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="145" y="57" fill="#e6e6e6" font-size="8" text-anchor="middle">G–R</text>
    <rect x="190" y="38" width="70" height="30" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="225" y="57" fill="#e6e6e6" font-size="8" text-anchor="middle">S–Z</text>
    <text x="146" y="86" fill="#9aa4b2" font-size="7" text-anchor="middle">like encyclopedia volumes, keys ordered</text>
    <text x="146" y="106" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">✓ range scans efficient (one contiguous read)</text>
    <rect x="36" y="118" width="220" height="28" rx="5" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="146" y="130" fill="#e05a7d" font-size="7.2" text-anchor="middle" font-weight="bold">✗ key is a timestamp → today's writes</text>
    <text x="146" y="141" fill="#e05a7d" font-size="7.2" text-anchor="middle" font-weight="bold">all hit the last partition (hot spot)</text>
    <text x="146" y="164" fill="#9aa4b2" font-size="6.8" text-anchor="middle">HBase / early Bigtable</text>
    <text x="434" y="26" fill="#d6a45c" font-size="9.6" text-anchor="middle" font-weight="bold">By hash of key</text>
    <rect x="318" y="38" width="70" height="30" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="353" y="57" fill="#e6e6e6" font-size="8" text-anchor="middle">partition 0</text>
    <rect x="398" y="38" width="70" height="30" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="433" y="57" fill="#e6e6e6" font-size="8" text-anchor="middle">partition 1</text>
    <rect x="478" y="38" width="70" height="30" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="513" y="57" fill="#e6e6e6" font-size="8" text-anchor="middle">partition 2</text>
    <text x="434" y="86" fill="#9aa4b2" font-size="7" text-anchor="middle">hash sprays adjacent keys evenly</text>
    <text x="434" y="106" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">✓ load even, hot spots scattered</text>
    <rect x="324" y="118" width="220" height="28" rx="5" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="434" y="130" fill="#e05a7d" font-size="7.2" text-anchor="middle" font-weight="bold">✗ order lost → a range scan</text>
    <text x="434" y="141" fill="#e05a7d" font-size="7.2" text-anchor="middle" font-weight="bold">must ask every partition</text>
    <text x="434" y="164" fill="#9aa4b2" font-size="6.8" text-anchor="middle">Cassandra / Redis Cluster (CRC16) / Kafka</text>
    <rect x="30" y="186" width="520" height="44" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="203" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">Compromise: compound key (hash first column → partition, sort the rest within it) — Cassandra's signature</text>
    <text x="290" y="220" fill="#9aa4b2" font-size="7.4" text-anchor="middle">Hash can't save a single extremely hot key (the celebrity problem) — salt it in the app, split one key into many</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">Range partitioning</b> is like the volumes of an encyclopedia: keys are ordered, so a <b>range scan</b> like "all orders in July" reads one contiguous stretch and is extremely efficient; but if the key is a timestamp, today's writes <b>all hit the last volume</b> — a hot spot. <b style="color:#d6a45c">Hash partitioning</b> sprays adjacent keys evenly: load is flat, but <b>order is gone</b>, and a range scan has to ask every partition. The compromise is a <b>compound primary key</b> (hash picks the partition, the remaining columns sort within it). And one thing nobody can save: <b>a single extremely hot key</b> (a celebrity's post, a viral product) — however even the hash, the same key lands in the same partition, and the only fix is to "salt" it in the application and split it up, a cousin of the <a href="/blog/redis-cache-patterns/">cache breakdown</a> problem</figcaption>
</figure>

## Problem two: where secondary indexes live — local or global

Primary-key lookups are easy (key → partition); the trouble is **secondary indexes**: "find all the red cars" — red cars are scattered across every partition, so where does the index go? Two answers, and again a pair of trade-offs:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="Two ways to place a secondary index. Left, local index, partitioned by document: each partition indexes only its own data, so a write touches one partition and is cheap; but querying color equals red, with red cars scattered across partitions, must scatter gather across every partition and merge. Right, global index, partitioned by term: the index itself is partitioned, with the term red owned by one partition and blue by another, so a query asks only the partition owning red, a precise read; but a write touching several terms must update the index on several partitions, usually asynchronously. Below: local means cheap writes and expensive reads, global means cheap reads and expensive writes — the same bill, choosing when to pay." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="pt6" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e0733a"/></marker><marker id="pt6g" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <line x1="290" y1="14" x2="290" y2="176" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">Local index (each partition its own)</text>
    <rect x="30" y="58" width="70" height="42" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="65" y="74" fill="#e6e6e6" font-size="7" text-anchor="middle">partition 0</text><text x="65" y="90" fill="#9aa4b2" font-size="6.2" text-anchor="middle">red: 2 cars</text>
    <rect x="110" y="58" width="70" height="42" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="145" y="74" fill="#e6e6e6" font-size="7" text-anchor="middle">partition 1</text><text x="145" y="90" fill="#9aa4b2" font-size="6.2" text-anchor="middle">red: 1 car</text>
    <rect x="190" y="58" width="70" height="42" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="225" y="74" fill="#e6e6e6" font-size="7" text-anchor="middle">partition 2</text><text x="225" y="90" fill="#9aa4b2" font-size="6.2" text-anchor="middle">red: 3 cars</text>
    <rect x="96" y="26" width="100" height="16" rx="4" fill="#262b3a" stroke="#e0733a" stroke-width="1.2"/><text x="146" y="37" fill="#e0733a" font-size="6.8" text-anchor="middle">query color=red</text>
    <line x1="118" y1="42" x2="70" y2="56" stroke="#e0733a" stroke-width="1.1" marker-end="url(#pt6)"/><line x1="146" y1="42" x2="146" y2="56" stroke="#e0733a" stroke-width="1.1" marker-end="url(#pt6)"/><line x1="174" y1="42" x2="222" y2="56" stroke="#e0733a" stroke-width="1.1" marker-end="url(#pt6)"/>
    <text x="146" y="118" fill="#e05a7d" font-size="7.4" text-anchor="middle" font-weight="bold">read: scatter/gather every partition, merge ✗</text>
    <text x="146" y="134" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">write: touches only its own partition ✓</text>
    <text x="146" y="158" fill="#9aa4b2" font-size="6.8" text-anchor="middle">MongoDB / Cassandra / Elasticsearch</text>
    <text x="434" y="26" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">Global index (partitioned by term)</text>
    <rect x="330" y="58" width="86" height="42" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="373" y="74" fill="#d6a45c" font-size="7" text-anchor="middle" font-weight="bold">"red" lives here</text><text x="373" y="90" fill="#9aa4b2" font-size="6.2" text-anchor="middle">full list of red cars</text>
    <rect x="452" y="58" width="86" height="42" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.1"/><text x="495" y="74" fill="#9aa4b2" font-size="7" text-anchor="middle">"blue" lives here</text><text x="495" y="90" fill="#9aa4b2" font-size="6.2" text-anchor="middle">full list of blue cars</text>
    <rect x="384" y="26" width="100" height="16" rx="4" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/><text x="434" y="37" fill="#54b890" font-size="6.8" text-anchor="middle">query color=red</text>
    <line x1="414" y1="42" x2="380" y2="56" stroke="#54b890" stroke-width="1.3" marker-end="url(#pt6g)"/>
    <text x="434" y="118" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">read: ask only the partition owning "red" ✓</text>
    <text x="434" y="134" fill="#e05a7d" font-size="7.2" text-anchor="middle" font-weight="bold">write: many terms → cross-partition (mostly async) ✗</text>
    <text x="434" y="158" fill="#9aa4b2" font-size="6.8" text-anchor="middle">DynamoDB GSI (asynchronous)</text>
    <rect x="30" y="186" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="203" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-weight="bold">local = cheap write, costly read (scatter/gather) · global = cheap read, costly write — again, where to pay</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">Local index</b>: each partition indexes only <b>its own</b> data — a write touches one partition and is cheap; but "find all the red cars" needs <b>scatter/gather</b>: ask every partition, each searches its own, then merge — the more partitions, the costlier the read. <b style="color:#d6a45c">Global index</b>: partition the index itself, but <b>by term</b> — the complete list for "red" is owned by one partition, and a query <b>asks only that one</b>; the price is that a write touching several terms has to update the index on several partitions (so in practice it's mostly <b>asynchronous</b>, like DynamoDB's GSI — the index lags half a beat). <b>Local charges the bill to reads, global charges it to writes</b> — the same multiple-choice question as "when do you pay the organising fee" in <a href="/blog/ddia-storage-engines/">the storage-engines post</a></figcaption>
</figure>

## Problem three: nodes came and went — how do you rebalance

Add a machine, replace a machine, and partitions have to move with it — **rebalancing** has one iron rule: **never use `hash mod N`.** Change N and nearly **every** key's home changes, which is a whole-database move. The mainstream solution you've already seen live in the [[redis-cluster|Redis Cluster]] post:

- **A fixed number of partitions**: create far more partitions than nodes from the start (Redis Cluster's **16384 slots**, Kafka's partitions, Elasticsearch's shards); when nodes come and go, **only whole partitions change ownership**, and key→partition never changes. **Add a level of indirection, and moving becomes moving tidy boxes.**
- **Dynamic partitioning**: a partition splits when it grows past a threshold and merges when it shrinks (HBase) — the partition count grows with the data.
- **Automatic vs manual**: fully automatic rebalancing is tempting, but DDIA warns of its dark side — **when a node is merely overloaded and slow, automation that misjudges it as dead and starts moving data adds the load of the move itself on top**, the exact script of a [[sre-cascading-failures|cascading failure]]. So mature systems mostly "propose automatically, **a human presses confirm**".

Finally, **routing**: how does a request find the right partition? Three ways — ask any node and let it forward, put a routing tier in front (with the partition table in [[zookeeper|ZooKeeper]]), or **the client knows itself** (Redis Cluster's `MOVED` is this type, letting the client cache the slot table).

## Reflections

### "Keep order" and "break up hot spots" can't both be had — the compound key is my favourite compromise

I've hit the range-vs-hash trade-off in real data: time-series data partitioned by time range, with the result that **all current writes forever hit the last partition** — ten partitions, nine of them sunbathing. Only after this chapter did I see the beauty of Cassandra's compound primary key: **hash decides "which partition" (scattering hot spots), the remaining columns sort "within" it (preserving range scans)** — each requirement gets half, but each half in the right dimension. It also explains why [[kafka-topics|Kafka's key→partition]] and [[redis-cluster|Redis's hash tags]] look the way they do: **first divide the household fairly by hash, then keep order inside the house.** Faced with a "must be both even and ordered" requirement, first ask "can the two requirements be split across two levels" — it often solves it.

### The same "where do you pay" question, for the third time

Local vs global index — I laughed halfway through: **isn't this [[ddia-storage-engines|LSM vs B-tree]], the same question all along: the same cost, do you pay it at write time or at read time?** A local index is cheap to write (touch only your own partition) and hangs the bill on every read's scatter/gather; a global index reads precisely and hangs the bill on cross-partition writes (which is why it mostly dares only to be asynchronous, the index half a beat behind). The criterion is the same as before too: **the read/write ratio decides everything** — reads far outnumber writes with a concentrated query pattern, global pays off; write-heavy with queries that can tolerate scatter, local is simple and reliable. A pattern that shows up three times in one book isn't a fact to learn, it's **the gravity of the field** — internalise it and you'll skim new tools' docs ten lines at a time.

### Automatic migration under overload is the classic script of good intentions gone wrong

The warning about "fully automatic" rebalancing hit my SRE nerve: **node overloaded and slow → automation misjudges it dead → starts moving its partitions away → the move eats more bandwidth and I/O → other nodes slow down too → more misjudgement, more moving** — a textbook [[sre-cascading-failures|cascading failure]], and every step is "for your own good". Same root as "a false positive costs more than doing nothing" in the [[redis-sentinel|Sentinel]] post, but the data-migration version is nastier, because **moving data is itself heavy load**. So my position on "automation in the data tier" is one notch more conservative than for the stateless tier: a dead Pod replaced automatically, fine; **but a decision to move data at scale gets proposed by the machine and confirmed by a human** — in the most chaotic moment, keep the right to "hit the gas" with a person. This chapter used one mechanism design to explain an entire operations philosophy.
