---
title: "Operating and Deploying Kafka: KRaft, Retention/Compaction and Monitoring"
date: 2026-06-26
category: tech
description: "What happens once Kafka is actually in production: KRaft finally frees it from ZooKeeper, turning two systems into one; retention and compaction decide how long the log is kept and how many versions survive per key; which metrics to watch, and how to size a cluster — how many brokers, how many partitions."
tags:
 - kafka
 - data-engineering
 - operations
series: "Kafka — Learning Notes"
seriesOrder: 5
comments: true
draft: false
translationOf: kafka-ops
---
The first four posts were about how to use Kafka — [[kafka-intro|the replayable log]], [[kafka-topics|the core model]], [[kafka-delivery|delivery guarantees]], [[kafka-ecosystem|the ecosystem]]. This one closes the series from a different angle: once Kafka is really in production and has to run steadily for years, what do you need to know on the **operations** side? Four pieces — **KRaft (how the cluster manages itself), retention and compaction (how the log stays bounded without losing what matters), monitoring (what to watch), and capacity planning (how many machines, how many partitions)**.

## KRaft: Kafka finally sheds ZooKeeper

For a long time, one Kafka setup was really **two systems**: brokers for the data, plus a separate **ZooKeeper** cluster holding all the metadata — who's the controller, where partitions are assigned, which replicas are in the ISR. That brought three pains: two systems to operate, ZooKeeper as an extra failure point, and its metadata handling turning into a bottleneck once the partition count got large.

**KRaft (Kafka Raft) brings that inside**: metadata moves to one of Kafka's own internal logs (`__cluster_metadata`) managed with the Raft protocol, and **the controller becomes a role a broker plays — no external ZooKeeper needed**. The wins are direct:

- **One system**: deployment, upgrades and monitoring are all just Kafka now.
- **Metadata scales further**: the supported partition count goes up an order of magnitude, and failover and startup get faster (a new controller doesn't slowly load from ZK, it reads its own log).

Recent Kafka versions default to KRaft and ZooKeeper mode is formally retired — from here on a new cluster doesn't have to learn ZooKeeper at all, which is a genuine reduction in operational load.

## Retention: the log doesn't grow forever, and you decide how long it keeps

Kafka is a log, not a queue — an event that's been read doesn't disappear. But disk is finite, so every topic has a **retention policy** deciding when old data is cleaned up. Physically, each partition is cut into **segment** files on disk, and cleanup works a whole segment at a time:

- **By time**: `retention.ms` (7 days by default) — past that, deleted.
- **By size**: `retention.bytes` — once a partition passes the cap, the oldest segments go.

There's a point here that echoes the whole series: **how far back you can replay is exactly how long your retention is set.** Want a newly connected consumer to read the past 30 days? Retention has to be ≥ 30 days — replay isn't free, it converts directly into disk cost.

## Log compaction: keep only the latest value per key

`delete` cuts old data by time or size; but for some topics what you want isn't "the last 7 days", it's "**the latest state of each key, kept forever**" — each user's current settings, say. That's the other retention policy: **compaction**.

How it works: a background cleaner sweeps the log and **keeps only the last value for each key**, squashing the older ones; if a key's latest value is `null` (a **tombstone**), that key is deleted.

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 560 200" role="img" aria-label="Log compaction before and after: before, one key has several historical values in the log; after, only the last value of each key remains." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <defs><marker id="ko1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <text x="40" y="40" fill="#9aa4b2" font-size="11" text-anchor="start">before</text>
 <rect x="40" y="50" width="58" height="34" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="69" y="71" fill="#9aa4b2" font-size="10.5" text-anchor="middle">k1:a</text>
 <rect x="102" y="50" width="58" height="34" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="131" y="71" fill="#9aa4b2" font-size="10.5" text-anchor="middle">k2:x</text>
 <rect x="164" y="50" width="58" height="34" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="193" y="71" fill="#9aa4b2" font-size="10.5" text-anchor="middle">k1:b</text>
 <rect x="226" y="50" width="58" height="34" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="255" y="71" fill="#9aa4b2" font-size="10.5" text-anchor="middle">k3:p</text>
 <rect x="288" y="50" width="58" height="34" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="317" y="71" fill="#9aa4b2" font-size="10.5" text-anchor="middle">k2:y</text>
 <rect x="350" y="50" width="58" height="34" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="379" y="71" fill="#e6e6e6" font-size="10.5" text-anchor="middle">k1:c</text>
 <line x1="224" y1="104" x2="224" y2="128" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ko1)"/>
 <text x="248" y="122" fill="#d4af37" font-size="10" text-anchor="start">cleaner: last value per key</text>
 <text x="40" y="156" fill="#9aa4b2" font-size="11" text-anchor="start">after</text>
 <rect x="40" y="166" width="58" height="34" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="69" y="187" fill="#e6e6e6" font-size="10.5" text-anchor="middle">k3:p</text>
 <rect x="102" y="166" width="58" height="34" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="131" y="187" fill="#e6e6e6" font-size="10.5" text-anchor="middle">k2:y</text>
 <rect x="164" y="166" width="58" height="34" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="193" y="187" fill="#e6e6e6" font-size="10.5" text-anchor="middle">k1:c</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Compaction: k1's a and b are squashed away and only the latest c survives — the result is a snapshot of "the current value of every key"</figcaption>
</figure>

Which lands right on the **KTable** from [[kafka-ecosystem|the last post]] — a compacted topic is, at bottom, a table updated by key stored as a log. Both policies in one table:

| | `delete` | `compact` |
|---|---|---|
| Keeps | **every event** within a time/size window | the **latest value** of each key |
| Removes | expired old segments | older values of the same key |
| Fits | event streams (orders, clicks) | state snapshots (settings, current balance) |

## Monitoring: which metrics to watch

Kafka rarely fails by "the whole thing going down" — usually some metric quietly degrades. The ones most worth watching, in three layers:

- **Consumer lag (the most important)**: `offset at the tail of the log − the consumer's committed offset`, i.e. how many records the consumer is behind the producer. Rising steadily = consumption can't keep up, and the delay compounds. It's the first number I look at.
- **Under-replicated partitions**: ISR size < replica count, meaning some replica isn't keeping up with the leader. That directly eats into the "don't lose data" guarantee from [[kafka-delivery|two posts back]] — anything above 0 deserves attention, because you're close to real data loss risk.
- **Broker resources**: disk usage (badly set retention will fill it), network throughput, request latency.

One line to hold on to: **consumer lag watches "is it fast enough", under-replicated watches "can it lose data"** — keep an eye on those two and most incidents get caught early.

## Capacity planning: how many brokers, how many partitions

This part is rules of thumb, not arithmetic, but there are anchors:

- **Partition count**: enough for your throughput and parallelism (from [[kafka-topics|part two]]: the parallelism ceiling is the partition count), but don't go wild — too many partitions drags on metadata and rebalancing (KRaft raised the ceiling, but it isn't infinite).
- **Replication factor**: `3` is the usual starting point (one machine can die and two copies remain).
- **Disk**: roughly ≈ `daily throughput × retention days × replication factor`, plus headroom. Stretch retention and the disk grows in proportion.
- **Broker count**: at least the replication factor, then more according to throughput and how far you want the risk spread.

## Reflection

### Consumer lag is the first metric I watch, and the one most worth watching

If I could keep one Kafka metric on the dashboard, it'd be consumer lag. It **reflects the health of both sides at once**: lag climbing could be a consumer that's slowed down, died, or is stuck on a poison record — or an upstream that suddenly spiked. Either way, users feel "the data is late" soon after. And it's a **leading indicator**: lag rises before it has become an incident, which buys you reaction time. My habit is two thresholds on it, one for a nudge and one for an alert — don't wait for downstream to complain before looking.

### Retention is replay capability reconciled against disk cost, so discuss it as a business decision

Retention looks like a technical parameter and is really an invoice: **the longer you keep, the more you can replay and backfill, and the more disk you pay for.** I've seen both extremes — a team leaving the 7-day default alone and then discovering, the one time they needed to recompute history, that the data was long gone; and a team turning on 90 days "to be safe", quietly multiplying their disk bill for something they never used. I now treat it as a decision to settle with the team: **for this topic's data, what's the worst case we need to read back to?** That answer drives retention, not whatever the default happened to be. Replay is Kafka's headline feature, but it's bought with disk.

### Before KRaft, ZooKeeper was the corner everyone ignored and the one that kept breaking

Looking back, ZooKeeper was always the thing in Kafka operations that nobody thinks about until it hurts a lot — the team's attention is all on brokers and topics, and forgets there's a whole coordination system underneath needing its own care; its disk fills up or its connections blow out, and all of Kafka wobbles with it. **KRaft removes that long-standing hidden failure point outright**, which I'd call the most tangible operational improvement Kafka has made in years. A new cluster on KRaft is one entire system less to maintain and one fewer reason to be woken at 3am.

### The operating mindset: Kafka doesn't break on its own — a promise went unmonitored

Boiling the whole series into a line: every guarantee Kafka gives you has a setting behind it that you have to hold — `acks=all` needs `min.insync.replicas`, not losing data depends on a healthy ISR, replaying depends on retention being long enough. **All of those promises hold on the day you ship, and quietly drift afterwards** — replicas fall out of the ISR, disk creeps toward the cap, lag accumulates slowly. Operating is, at bottom, **using monitoring to keep confirming that the promises you set up still hold**. Kafka seldom breaks by itself; what breaks is usually the promise nobody was watching. Which is the note this whole series has been playing: what Kafka gives you is never a free guarantee, it's a set of tools you have to design properly yourself — and then keep holding.
