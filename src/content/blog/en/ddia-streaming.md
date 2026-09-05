---
title: "Stream Processing: The Dual-Write Trap, CDC, and Stream–Table Duality"
date: 2026-07-24
category: tech
description: "The other half of batch: data no longer arrives a batch at a time, it keeps coming. Kafka's log and delivery guarantees, stream windows and watermarks, I've covered in other series; DDIA Ch11's real specialty is three more fundamental ideas: the dual-write trap (the same data written separately to DB, cache and search index — partial failure and reordering make them diverge permanently, the most common silent data incident), CDC (exposing the database's replication log so every downstream becomes its follower), and stream–table duality (a table is a stream folded up to now, a stream is a table's changelog — one equivalence that explains materialized views, log compaction and replication streams all at once)."
tags:
  - distributed-systems
  - book-notes
  - streaming
series: "Designing Data-Intensive Applications — Reading Notes"
seriesOrder: 11
comments: true
draft: false
translationOf: ddia-streaming
---
[[ddia-batch|Batch]] processes data that has "all arrived"; streaming processes data that "keeps coming". Much of the groundwork for this chapter I've laid elsewhere: logs and offsets in the [[kafka-intro|Kafka series]], delivery guarantees in [[kafka-delivery|the delivery post]], windows and event time in [[spark-streaming|Spark Streaming]] — none of it repeated here. DDIA Ch11's real specialty is three more fundamental ideas: **why "writing two copies separately" is doomed, how to make the database itself the source of events (CDC), and how "stream" and "table" are two faces of the same thing.**

## The dual-write trap: the same data, written separately to three systems

In real systems the same data often has to live in several places at once: the DB as primary store, Redis as cache, Elasticsearch as search index. The intuitive approach is for **the application to write all three itself (dual write)** — and that's the source of the most common silent data incident:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 250" role="img" aria-label="Dual write versus log first. Left, dual write: the application writes the same update separately to three systems: database, cache and search index. Two diseases: one, partial failure — the application crashes after writing the DB, the cache and index never get the write, and no transaction can roll back across systems; two, reordering — two concurrent requests arrive at the three systems in different orders, the DB receiving A then B while the cache receives B then A, so they converge to different final values. Result: the three systems diverge permanently and silently. Right, log first: write to one place only, a log or a database, and every downstream consumes the same log in the same order; cache and index are followers, order is consistent, anything lost can be replayed, and everything eventually converges." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="dw" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e05a7d"/></marker><marker id="dwg" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <line x1="290" y1="14" x2="290" y2="200" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#e05a7d" font-size="9.4" text-anchor="middle" font-weight="bold">✗ Dual write: the app writes three copies</text>
    <rect x="96" y="36" width="100" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="146" y="52" fill="#e6e6e6" font-size="7.4" text-anchor="middle">application</text>
    <line x1="116" y1="60" x2="72" y2="88" stroke="#e05a7d" stroke-width="1.2" marker-end="url(#dw)"/><line x1="146" y1="60" x2="146" y2="88" stroke="#e05a7d" stroke-width="1.2" marker-end="url(#dw)"/><line x1="176" y1="60" x2="220" y2="88" stroke="#e05a7d" stroke-width="1.2" marker-end="url(#dw)"/>
    <rect x="32" y="90" width="80" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="72" y="106" fill="#e6e6e6" font-size="7.2" text-anchor="middle">DB</text>
    <rect x="106" y="90" width="80" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="146" y="106" fill="#e6e6e6" font-size="7.2" text-anchor="middle">cache</text>
    <rect x="180" y="90" width="80" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="220" y="106" fill="#e6e6e6" font-size="7.2" text-anchor="middle">search index</text>
    <rect x="26" y="128" width="240" height="28" rx="5" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="146" y="140" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">disease 1: crash halfway → some written, some not</text>
    <text x="146" y="151" fill="#9aa4b2" font-size="6.6" text-anchor="middle">no transaction can roll back across three systems</text>
    <rect x="26" y="162" width="240" height="28" rx="5" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="146" y="174" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">disease 2: concurrent writes arrive in different orders</text>
    <text x="146" y="185" fill="#9aa4b2" font-size="6.6" text-anchor="middle">DB gets A then B, cache gets B then A → different values</text>
    <text x="146" y="200" fill="#e05a7d" font-size="7.4" text-anchor="middle" font-weight="bold">→ three systems diverge permanently, silently</text>
    <text x="434" y="26" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">✓ Log first: write to one place only</text>
    <rect x="384" y="36" width="100" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="434" y="52" fill="#e6e6e6" font-size="7.4" text-anchor="middle">application</text>
    <line x1="434" y1="60" x2="434" y2="84" stroke="#54b890" stroke-width="1.4" marker-end="url(#dwg)"/><text x="478" y="76" fill="#54b890" font-size="6.8" text-anchor="middle">only writes here</text>
    <rect x="334" y="86" width="200" height="26" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/><text x="434" y="103" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">one ordered log (source of truth)</text>
    <line x1="374" y1="112" x2="356" y2="138" stroke="#54b890" stroke-width="1.1" marker-end="url(#dwg)"/><line x1="434" y1="112" x2="434" y2="138" stroke="#54b890" stroke-width="1.1" marker-end="url(#dwg)"/><line x1="494" y1="112" x2="512" y2="138" stroke="#54b890" stroke-width="1.1" marker-end="url(#dwg)"/>
    <rect x="318" y="140" width="76" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="356" y="156" fill="#e6e6e6" font-size="7" text-anchor="middle">DB</text>
    <rect x="398" y="140" width="76" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="436" y="156" fill="#e6e6e6" font-size="7" text-anchor="middle">cache</text>
    <rect x="478" y="140" width="76" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="516" y="156" fill="#e6e6e6" font-size="7" text-anchor="middle">search index</text>
    <text x="434" y="182" fill="#54b890" font-size="7.2" text-anchor="middle" font-weight="bold">all consume in the "same order" → consistent, replayable</text>
    <text x="434" y="197" fill="#9aa4b2" font-size="6.8" text-anchor="middle">every downstream is a follower, converging to one state</text>
    <rect x="30" y="212" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="229" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">One dataset into N systems? Pick one source of truth, make all the rest followers</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e05a7d">Dual write</b>'s two diseases have no cure: <b>partial failure</b> (the app crashes after writing the DB, the cache never catches up — no transaction can roll back across systems) and <b>reordering</b> (two concurrent writes arrive at the three systems in different orders, each converging to a different value) — the three systems <b>diverge permanently, and silently</b>. <b style="color:#54b890">Log first</b> eliminates the problem structurally: write to one place only (one ordered log), and every downstream consumes it in <b>the same order</b> — consistent ordering, and anything lost is replayed from an offset. This is really the leader–follower of the <a href="/blog/ddia-replication/">replication</a> chapter, generalised across heterogeneous systems: <b>pick one source of truth, and make everything else a follower</b></figcaption>
</figure>

## CDC: making the database itself the source of events

"Log first" sounds like rewriting the whole application — but there's a clever shortcut: **the database already has an ordered log of writes** (the [[ddia-storage-engines|WAL]] / binlog, which is what replication followers sync from). **CDC (change data capture) takes that internal replication log and turns it into an event stream anyone can subscribe to** — tools like Debezium pose as a replication follower and write every change into [[kafka-ecosystem|Kafka]]. The application changes not a line and keeps writing the DB as before; cache, index and warehouse all switch to consuming the stream. **The DB remains the source of truth, but every one of its heartbeats is heard by the whole world** — and that's the mainstream way modern data platforms feed OLTP data into the [[ddia-batch|analytics side]].

## Stream–table duality: a table is the integral of a stream, a stream is the derivative of a table

The most beautiful idea in the chapter is that **a stream and a table are two faces of the same thing**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 218" role="img" aria-label="Stream–table duality. On the left is a changelog stream: four events in order, k1 set to a, k2 set to x, k1 changed to b, k2 deleted. Folding it rightwards, applying each event up to now, yields the table: k1 equals b and k2 does not exist — a table is the stream folded up to the present. Going leftwards, emitting an event for every change to the table recovers the stream — a stream is the table's changelog. Below: log compaction is a stream keeping only the last entry per key, the smallest stream that can rebuild the table; materialized views, Redis's replication stream and Kafka's compacted topics are all incarnations of this equivalence." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="sd" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker><marker id="sd2" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#d6a45c"/></marker></defs>
    <text x="146" y="24" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">Stream: a changelog</text>
    <rect x="36" y="36" width="220" height="24" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="146" y="52" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-family="monospace">① k1=a</text>
    <rect x="36" y="66" width="220" height="24" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="146" y="82" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-family="monospace">② k2=x</text>
    <rect x="36" y="96" width="220" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="146" y="112" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-family="monospace">③ k1=b (overwrites a)</text>
    <rect x="36" y="126" width="220" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="146" y="142" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-family="monospace">④ k2=∅ (delete)</text>
    <text x="146" y="168" fill="#9aa4b2" font-size="7.2" text-anchor="middle">every "change" is an event, in order</text>
    <path d="M266 78 C 310 70, 330 70, 368 78" fill="none" stroke="#54b890" stroke-width="1.6" marker-end="url(#sd)"/>
    <text x="318" y="62" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">fold up to now (apply each)</text>
    <path d="M368 110 C 330 118, 310 118, 266 110" fill="none" stroke="#d6a45c" stroke-width="1.6" marker-end="url(#sd2)"/>
    <text x="318" y="132" fill="#d6a45c" font-size="7.4" text-anchor="middle" font-weight="bold">emit one per change (changelog)</text>
    <text x="470" y="24" fill="#54b890" font-size="9.6" text-anchor="middle" font-weight="bold">Table: the state right now</text>
    <rect x="386" y="52" width="168" height="64" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.6"/>
    <text x="470" y="76" fill="#e6e6e6" font-size="8.4" text-anchor="middle" font-family="monospace">k1 = b</text>
    <text x="470" y="98" fill="#9aa4b2" font-size="8" text-anchor="middle" font-family="monospace">(k2 deleted)</text>
    <text x="470" y="138" fill="#9aa4b2" font-size="7.2" text-anchor="middle">the same information, frozen at "now"</text>
    <rect x="30" y="184" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="201" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">log compaction = keep only the last entry per key (smallest stream that rebuilds the table) · materialized view = a table that keeps folding</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">A <b style="color:#4f6df5">stream</b> is the sequence of "every change"; <b style="color:#54b890">fold it (apply in order)</b> from start to end and you get the <b style="color:#54b890">table</b> — the state right now. Conversely, <b style="color:#d6a45c">emit every change to the table as an event</b> and you recover the stream. The engineer's phrasing: <b>a table is the integral of a stream, a stream is the derivative of a table</b>. A pile of things you've seen are its incarnations: <a href="/blog/kafka-delivery/">log compaction</a> (keep only the last entry per key = the smallest stream that rebuilds the table), materialized views (a table that keeps folding), <a href="/blog/redis-replication/">replication streams</a> (turn the leader's table back into a stream, send it to the follower, fold it back into a table). <a href="/blog/ddia-consistency-consensus/">State machine replication</a> is it too: the log is the stream, each node's state is the table</figcaption>
</figure>

The practical consequence of this equivalence: **you can keep the "stream" forever and treat the "table" as a derivative that can be thrown away and rebuilt at any time.** Cache broken? Fold it again from the log. Want a new search index? Replay the log from the start and a new follower grows. [[ddia-batch|The batch chapter's "human fault tolerance"]] — immutable inputs, rerun when wrong — is carried intact into the streaming world by the log: **as long as the log is there, all state is just a cache.**

## Reflections

### "Who is the source of truth?" — one question that stumps nine out of ten data architectures

That dual-write diagram is the incident archetype I've seen most often at work: DB and cache disagree, the ES index doesn't match the primary, warehouse numbers are off from production — trace it to the root, and nearly always **somewhere is writing two copies separately, and nobody is anybody's follower**. So now, looking at any data architecture, my first question is always: **who is the source of truth for this data? Do the other copies "follow the same ordered log", or "each write their own and pray they agree"?** If it's the latter, it just hasn't broken yet. And CDC is elegant precisely because it doesn't ask you to rewrite the application — **it promotes the database's existing replication mechanism from internal plumbing to a public interface**, turning "add a follower" from a big project into subscribing to a stream.

### "A table is the integral of a stream" — the third equivalence that unlocks a whole class

That's the third "one equivalence, a whole class understood" I've collected in this series: [[ddia-consistency-consensus|consensus = one log everyone agrees on]], [[ddia-batch|batch = a pure function over immutable input]], and now **table = the fold of a stream**. In one stroke it strings scattered things together: why a Kafka compacted topic can back a KTable, why a materialized view is called "materialized" (freezing a stream into a table), why [[redis-replication|Redis replication]] sends a stream of commands instead of the whole dataset, why Kafka Streams dares to keep its state store local (the changelog is in Kafka, fold it again if it's lost). Even [[medallion-architecture|Medallion]] can be retold in its terms: Bronze is the archived stream, Silver and Gold are folds of different depths. **An abstract equivalence is the highest compression ratio knowledge has.**

### "As long as the log is there, all state is just a cache" — that sentence is worth an architecture

Having written this post, I want to pull out the single most powerful sentence in the series: **treat the immutable log as the only truth, and all state (cache, index, report, even the database itself) as a rebuildable derivative.** It reduces the hardest question, "what do we do when it breaks", to "replay the log once"; it reduces "we want a new view" from a migration project to "start a new consumer from the beginning". That's the final payoff of the [[infra-rabbitmq|log vs queue]] axis — choosing "keep it" over "take it" back then is what earns the right to say "everything can be rebuilt" today. It isn't free, of course: how long to retain the log, a schema that can [[ddia-encoding|evolve]], replays that are idempotent — all taxes to pay. But as an architecture's **default leaning**, I'm now entirely on the log's side. The next post is the book's final chapter: assembling these pieces into Kleppmann's vision of the future of data systems.
