---
title: "Master-Replica Replication: Read/Write Splitting and the Oddities of Replication Lag"
date: 2026-07-20
category: tech
tags:
  - redis
  - distributed-systems
series: "Redis — Learning Notes"
seriesOrder: 8
comments: true
draft: false
translationOf: redis-replication
---
However fast one Redis is, it has ceilings on memory and traffic, and when it dies the data hangs in mid-air. The first foundation on the road to high availability is **replication**: one **master** handles writes, several **replicas** each hold a copy and share the read traffic. It's also the underlying prototype for each shard of [[redis-cluster|Cluster]] later, and for Sentinel's automatic failover. Understand it and you've actually understood the common skeleton of every replication system.

## Master-replica topology: one writes, many read

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Redis master-replica topology. The application's writes go to the single master, which handles reads and writes. The master replicates data asynchronously to several replicas, which are read-only. The application's reads can be spread across the replicas, achieving read/write splitting and horizontal scaling of reads. Key points: there is only one master, the single write point; there can be many replicas, read-only, sharing read traffic; and replication is asynchronous, the master replying to the client without waiting for replica acknowledgement." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="rpa" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#d6a45c"/></marker></defs>
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">One master writes, many replicas read</text>
    <rect x="20" y="80" width="96" height="52" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="68" y="100" fill="#e6e6e6" font-size="9" text-anchor="middle">application</text><text x="68" y="113" fill="#9aa4b2" font-size="7.4" text-anchor="middle">write → master</text><text x="68" y="125" fill="#9aa4b2" font-size="7.4" text-anchor="middle">read → replicas</text>
    <rect x="200" y="78" width="120" height="56" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="2"/><text x="260" y="100" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">Master</text><text x="260" y="116" fill="#e6e6e6" font-size="8" text-anchor="middle">read/write · sole write point</text><text x="260" y="128" fill="#9aa4b2" font-size="7" text-anchor="middle">only one</text>
    <line x1="116" y1="98" x2="198" y2="98" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#rp)"/><text x="157" y="91" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">write</text>
    <rect x="420" y="34" width="140" height="46" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="490" y="54" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Replica 1</text><text x="490" y="69" fill="#9aa4b2" font-size="7.4" text-anchor="middle">read-only</text>
    <rect x="420" y="132" width="140" height="46" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="490" y="152" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Replica 2</text><text x="490" y="167" fill="#9aa4b2" font-size="7.4" text-anchor="middle">read-only</text>
    <line x1="320" y1="98" x2="418" y2="60" stroke="#d6a45c" stroke-width="1.4" marker-end="url(#rpa)"/><line x1="320" y1="112" x2="418" y2="150" stroke="#d6a45c" stroke-width="1.4" marker-end="url(#rpa)"/><text x="372" y="94" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">async replication</text>
    <path d="M68 132 C 68 175, 420 175, 480 178" fill="none" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#rp)"/><text x="250" y="196" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">read</text><text x="250" y="208" fill="#9aa4b2" font-size="7.4" text-anchor="middle">reads spread over the replicas → scale reads horizontally</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The <b style="color:#4f6df5">Master</b> is the <b>sole write point</b> (every write goes through it); <b style="color:#54b890">Replicas</b> can be many, <b>read-only</b> by default, spreading read traffic out to scale. And the master syncing data to the replicas is <b style="color:#d6a45c">asynchronous</b> — it <b>replies to the client without waiting for replica acknowledgement</b>. That "asynchronous" buys write speed, but plants the oddity in the next section</figcaption>
</figure>

Setup is simple; one line on the replica hooks it up:

```bash
REPLICAOF 10.0.0.1 6379   # make this instance a replica of 10.0.0.1:6379 (formerly SLAVEOF)
INFO replication          # role:master/slave, connected_slaves, each side's offset and lag
```

## The price of asynchronous replication, and that oddity

"Asynchronous" is the key to every master-replica oddity: the master finishes the write and **doesn't wait** for replicas; it tells you "success" right away. That's fast, but it has two consequences — **first**, if the master dies suddenly, writes that haven't reached a replica **are simply lost**; **second**, replicas always lag the master by half a beat, which produces this classic scene:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 196" role="img" aria-label="The replication-lag oddity. On the timeline, the application first writes x equals 1 to the master, which replies success immediately. The application then reads x from the replica right away, but replication hasn't caught up, so the replica still has the old value 0 and returns stale data; that's read-your-writes failing. A little later replication catches up and the replica's x becomes 1 too. The gap in between is the replication lag window." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rl" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Write, then read the replica right away → stale value</text>
    <text x="40" y="52" fill="#4f6df5" font-size="8.6" text-anchor="middle" font-weight="bold">Master</text>
    <rect x="70" y="42" width="130" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="135" y="57" fill="#e6e6e6" font-size="7.8" text-anchor="middle">① write x=1 → OK</text>
    <text x="40" y="106" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">Replica</text>
    <rect x="70" y="96" width="150" height="22" rx="4" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="145" y="111" fill="#e05a7d" font-size="7.6" text-anchor="middle">② read x → still old 0 ✗</text>
    <rect x="300" y="96" width="150" height="22" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="375" y="111" fill="#e6e6e6" font-size="7.6" text-anchor="middle">③ replication catches up → x=1</text>
    <line x1="200" y1="53" x2="240" y2="53" stroke="#d6a45c" stroke-width="1.3" stroke-dasharray="3 2" marker-end="url(#rl)"/><path d="M240 53 C 270 60, 270 90, 245 100" fill="none" stroke="#d6a45c" stroke-width="1.3" stroke-dasharray="3 2" marker-end="url(#rl)"/><text x="285" y="76" fill="#d6a45c" font-size="7.4" text-anchor="middle">replicating…</text>
    <rect x="70" y="130" width="380" height="1" fill="#3a4154"/><line x1="220" y1="128" x2="220" y2="150" stroke="#3a4154" stroke-width="1" stroke-dasharray="2 2"/><line x1="300" y1="128" x2="300" y2="150" stroke="#3a4154" stroke-width="1" stroke-dasharray="2 2"/><text x="260" y="145" fill="#9aa4b2" font-size="7.4" text-anchor="middle">lag window</text>
    <line x1="70" y1="160" x2="470" y2="160" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#rl)"/><text x="470" y="174" fill="#9aa4b2" font-size="8" text-anchor="end">time →</text>
    <text x="290" y="190" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">need "read what you just wrote" → send that read to master, or WAIT, or tolerate staleness</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">You write <code>x=1</code> on the <b style="color:#4f6df5">master</b>, get a success reply, and immediately read <code>x</code> from the <b style="color:#54b890">replica</b> — and get the <b style="color:#e05a7d">stale value</b>, because replication hasn't caught up. This is <b>read-your-writes failing</b>: not a bug, but the physical inevitability of asynchronous replication. The fix isn't to eliminate the lag (you can't); it's to <b>classify your reads</b>: critical reads that need "see what I just wrote" go to the master; reads that can tolerate slight staleness can safely go to replicas. That's exactly the replication consistency levels <a href="/blog/ddia-reliable-scalable/">DDIA</a> describes</figcaption>
</figure>

For stronger guarantees, Redis gives half a toolkit: `WAIT 1 100` makes the write **block until at least 1 replica acknowledges** (or times out); paired with `min-replicas-to-write`, you can demand "refuse writes unless enough replicas are keeping up". But these all trade **latency** for **safety**; they aren't free — in essence you're picking a point between the speed of asynchronous and the steadiness of synchronous.

## Reconnecting without starting over: PSYNC partial resync

The connection between replica and master occasionally drops (network jitter). In early versions, a drop meant **starting from scratch** — the master saved an RDB and transferred the whole thing to the replica, very painful on big instances. Today's **PSYNC** is much smarter: the master keeps a **replication backlog** buffer, and the replica remembers the **offset** it replicated up to. On reconnect:

- **A short drop** (the missing data is still in the backlog) → **partial resync**: the master sends only the small slice after that offset.
- **Too long a drop / first connection / offsets don't match** (`FULLRESYNC`) → only then a full sync: transfer the whole RDB.

So that **`master_repl_offset`** you see in `INFO replication` is the yardstick of master-replica progress; the difference between the two sides' offsets is the live replication lag.

## Reflections

### Asynchronous replication is Redis's "be fast" character extended to the replication layer

Redis choosing asynchronous replication (rather than waiting for every replica to acknowledge before replying) is the same character as its [[redis-persistence|persistence not fsyncing always by default]]: **it puts "fast" ahead of "zero loss".** That fits its positioning as a hot data layer — in most scenarios, a few milliseconds of replication lag and losing the last few writes on failure are acceptable prices for its signature low latency. But it's also a reminder: **a system's defaults hide its values.** Before using Redis, you have to agree with its "speed first" stance; if your data can't lose a single entry, either patch with `WAIT` or don't treat it as the source of truth in the first place. A tool's character has to match your needs; you can't force it.

### Replication lag isn't a bug, it's physics; the engineer's job is "classifying reads"

The first time you hit "wrote it, can't read it right away", you think Redis is broken; in fact it's **a physical law of distribution** — as long as replication is asynchronous and data has to cross a distance, there is a lag window. Once that clicked, my way of handling it changed completely: **stop dreaming of eliminating the lag, and classify each kind of read** — which ones "must see what I just wrote" (viewing an order right after placing it, logging in right after changing a password), send those to the master; which ones "slightly stale is fine" (viewing a leaderboard, browsing a product list), send those confidently to replicas for scale. This "route reads by consistency requirement" thinking is the most practical lesson [[ddia-reliable-scalable|DDIA]] gave me, and it applies to every system with read/write splitting, not just Redis.

### Master-replica is the "prototype skeleton" of every high-availability system

Writing this post made me surer of one thing: **the skeleton of Redis master-replica — one primary copy + several replicas + asynchronous sync + a lag trade-off — is very nearly the universal prototype of every replication system.** [[infra-kafka|Kafka's partition + ISR]], Postgres primary/standby, MySQL binlog replication, even [[sre-consensus|etcd]]'s Raft (just synchronous and majority-based) — same skeleton, differing only in a few knobs: "synchronous or asynchronous, majority or not, who can be the write point". So I never learn a system's replication in isolation; I hang it back on this common skeleton — **see what it chose on each of those knobs and you understand its trade-offs.** Learn Redis's simplest master-replica pair thoroughly, and Kafka's and the databases' replication are variations on the same story. Which is why I say: understand this, and you understand far more than Redis.
