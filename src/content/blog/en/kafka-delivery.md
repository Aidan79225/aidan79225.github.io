---
title: "Kafka's Delivery Guarantees: acks, ISR and At-Least-Once / Exactly-Once"
date: 2026-06-25
category: tech
description: "After a crash and restart, does an event get processed twice or vanish? First see the three places an event's journey can go wrong, then see which one acks, ISR and commit timing each cover. Three delivery semantics in one table — exactly-once isn't magic, it's two pieces bolted together."
tags:
 - kafka
 - data-engineering
 - reliability
series: "Kafka — Learning Notes"
seriesOrder: 3
comments: true
draft: false
translationOf: kafka-delivery
---
[[kafka-topics|Part two]] finished with how events are laid out and who reads them, and left a sharper question open: after a crash and restart, does an event get **processed twice** or **lost**? This post takes Kafka's reliability apart — **acks, replicas and ISR, commit timing, and the three delivery semantics: at-most-once / at-least-once / exactly-once**.

## An event's journey has three places it can go wrong

Before talking about guarantees, you need to see the legs an event travels from being produced to being processed, and how each one breaks:

1. **Producer → broker**: the network drops, the broker hasn't acked yet — the producer has no idea whether the write landed. Resend and you may **duplicate**; don't resend and you may **lose** it.
2. **The broker itself**: the machine that took the event dies — if there's only one copy, the data goes with it.
3. **Broker → consumer**: the consumer reads, and crashes halfway through processing — where it picks up on restart decides whether it **redoes** that event or **skips** it.

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 560 150" role="img" aria-label="An event travels from producer through broker to consumer, with one failure point on each leg: write acknowledgement, replica storage, and the consumer's offset commit." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
 <defs><marker id="kd1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <rect x="14" y="50" width="104" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
 <text x="66" y="71" fill="#e6e6e6" font-size="12" text-anchor="middle">Producer</text>
 <text x="66" y="86" fill="#9aa4b2" font-size="9" text-anchor="middle">acks?</text>
 <rect x="228" y="50" width="104" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
 <text x="280" y="71" fill="#e6e6e6" font-size="12" text-anchor="middle">Broker</text>
 <text x="280" y="86" fill="#9aa4b2" font-size="9" text-anchor="middle">replicas / ISR</text>
 <rect x="442" y="50" width="104" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
 <text x="494" y="71" fill="#e6e6e6" font-size="12" text-anchor="middle">Consumer</text>
 <text x="494" y="86" fill="#9aa4b2" font-size="9" text-anchor="middle">when to commit</text>
 <line x1="118" y1="73" x2="226" y2="73" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#kd1)"/>
 <line x1="332" y1="73" x2="440" y2="73" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#kd1)"/>
 <text x="172" y="40" fill="#d4af37" font-size="10" text-anchor="middle">① lost / duplicated</text>
 <text x="280" y="130" fill="#d4af37" font-size="10" text-anchor="middle">② lost when a broker dies?</text>
 <text x="494" y="130" fill="#d4af37" font-size="10" text-anchor="middle">③ redo / skip</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Three legs, three failure points — acks covers the first, replicas and ISR the second, commit timing the third</figcaption>
</figure>

Map those three legs onto three settings and Kafka's reliability comes apart cleanly.

## The producing side: `acks` decides how far a write must get to count

Once a producer sends an event, how far does it wait before calling it a success? That's `acks`:

- **`acks=0`**: sent is successful, no acknowledgement awaited. Fastest, but if the broker never got it you'll never know — it can be **lost**.
- **`acks=1`**: the leader has written it, so it counts. But if the leader dies after writing and before the replicas catch up, that record is gone — still losable.
- **`acks=all`** (or `-1`): it counts only once the leader **and every in-sync replica** have written it. Slowest, but as long as one in-sync replica survives, the data is there.

If you don't want to lose data, `acks=all` is the starting point. But `acks=all` on its own does nothing — it leans on the replication mechanism below, and the two have to be discussed together.

## Replicas and ISR: how many copies, and who gets a vote

Every partition has a **replication factor** — 3, say — meaning the same log is stored on three brokers. One of them is the **leader** and handles all reads and writes; the rest are **followers**, continuously pulling from the leader to keep up.

The key concept is the **ISR (in-sync replicas)**: **the replicas currently keeping pace with the leader.** A follower that falls too far behind is dropped from the ISR, and rejoins once it catches up.

The "all" in `acks=all` means **the replicas in the ISR**, not all replicas. So there's one more setting to pair with it:

- **`min.insync.replicas`**: how many replicas the ISR must hold for a write to be accepted. Set it to 2 and a write counts only when the leader plus one in-sync replica have it; when the ISR falls to 1, writes are rejected outright (better to refuse data than to accept a copy with no backup).

**`acks=all` + `replication.factor=3` + `min.insync.replicas=2`** is the usual "don't lose data" combination: one broker can die and you still have two copies and can still write. The three only mean something set together — `acks=all` with `min.insync.replicas=1` still permits "one copy stored, call it a success", and that guarantee is hollow.

## The consuming side: commit timing decides duplicate vs dropped

A consumer remembers where it has read by committing an offset. The whole question is **whether the commit comes before or after the work is actually done**:

- **Commit first, then process**: crash halfway through and the offset has already moved on — on restart you start from the next record, so **this one is skipped (lost)**. That's **at-most-once**.
- **Process first, then commit**: the offset only advances once the work is done. Crash after processing but before committing and you **read the same record again (duplicate)** on restart. That's **at-least-once**.

There's no free option — you only get to choose "rather drop it" or "rather do it twice". And nearly every system picks **at-least-once**: duplicates can be absorbed with **idempotence**, whereas data you dropped usually can't be recovered.

## Three delivery semantics in one table

| Semantics | Meaning | How you get it | Price |
|---|---|---|---|
| **at-most-once** | at most once, may drop | commit before processing | you lose data |
| **at-least-once** | at least once, may duplicate | process before committing | downstream must deduplicate |
| **exactly-once** | no duplicates, no drops | idempotent producer + transactions | fiddly config, a performance cost |

## Exactly-once isn't magic, it's two pieces bolted together

Plenty of people imagine exactly-once is a switch you flip. It's really two mechanisms stacked, and **its scope is limited**:

- **Idempotent producer** (`enable.idempotence=true`): the broker gives each producer a PID and numbers each message, so it **automatically drops duplicates caused by retries**. That covers "the first leg's retries wrote it twice".
- **Transactions**: wrap "read a batch, process, write the result, advance the offset" into one atomic unit — either the whole batch takes effect or none of it does. That's what lets a read-process-write loop **inside** Kafka (Kafka Streams, typically) be exactly-once.

But draw the line clearly: **Kafka's exactly-once only holds inside the closed loop of "in from Kafka, out to Kafka".** The moment your consumer writes the result into an external database or calls an external API, that step is outside Kafka's transaction — exactly-once beyond Kafka's boundary always comes back to **being idempotent at the business layer** (deduplicate on a unique key like `order_id`, `upsert` instead of `insert`).

## Reflection

### The pragmatic default is at-least-once plus downstream idempotence, not exactly-once

I've watched plenty of teams chase exactly-once out of the gate and end up with fiddly config, worse performance, and duplicates anyway — because their endpoint is an external database, and that leg was never inside Kafka's transaction. My default is always **at-least-once (process, then commit), and idempotence on the consuming side**: deduplicate on the business's own unique key, `upsert` wherever you can instead of `insert`. It's simple and it holds, and "the processing itself is re-enterable" pays off everywhere else too — retries, backfills, replaying history. **Rather than chasing events that arrive exactly once, make your processing produce the same result however many times it runs.** The second one is entirely in your hands; the first isn't.

### `acks=all` without `min.insync.replicas` is the most common fake guarantee

This is the trap I keep meeting in post-mortems: someone sets `acks=all`, assumes they're covered, and leaves `min.insync.replicas` at its default of 1. That reads as "as long as one replica in the ISR — the leader itself — has written it, return success" — and when that machine dies, the unbacked data goes anyway. **`acks=all` is the promise; `min.insync.replicas` is the floor that makes good on it.** Read them together or it's just reassurance. When I review config now and see `acks=all`, the next question is automatic: and what's `min.insync.replicas`?

### Reliability costs money, so grade it by how much the data matters

Dialling every topic to the maximum guarantee (`acks=all`, three replicas, transactions) sounds safe, but throughput and latency are on the bill. I prefer to **grade it by how much the data matters**: payments and orders, where a single wrong record is unacceptable, get the full treatment; clickstream and behavioural logs, where losing a few is harmless but the volume is enormous, get `acks=1` and a lower replication factor in exchange for throughput. **Reliability isn't better the higher you push it — it's right when it matches what the data is worth.** Spend the budget where things genuinely can't go wrong.

### The question to ask first is which your business can afford: dropping or duplicating

It's easy to disappear into parameter details when learning delivery guarantees, but I step back to this question at every design. The answer is almost always "duplicates I can handle — just deduplicate — but I can't pay for what's lost" — so at-least-once wins on its own, and the acks, the replicas and the commit timing all exist to serve that conclusion. **Define what you're afraid of first, then pick the mechanism** — rather than being led around by a pile of parameters. It matches the tone of the whole series: what Kafka gives you is never a free guarantee, it's a set of tools where whatever you want, you have to design it yourself.
