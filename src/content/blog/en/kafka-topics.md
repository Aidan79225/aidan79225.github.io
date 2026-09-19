---
title: "Kafka's Core Model: Topic, Partition, Offset and Consumer Group"
date: 2026-06-24
category: tech
description: "The thing that's genuinely append-only is the partition, not the topic — a topic is just the set of those partitions. The partition is the unit of everything parallel and everything ordered in Kafka: how a producer decides where an event lands, how an offset marks a position, how a consumer group divides the work, and why the ordering guarantee only holds inside one partition."
tags:
  - kafka
  - data-engineering
series: "Kafka — Learning Notes"
seriesOrder: 2
comments: true
draft: false
translationOf: kafka-topics
---
[[kafka-intro|Part one]] pinned Kafka's mental model to a single line: **a replayable event log**. But how is that log actually laid out, how does it parallelise, and how does a crowd of consumers split the work? This post takes the four core nouns apart — **topic, partition, offset, consumer group** — and between them they decide throughput, ordering and scale.

## Topic and partition: how one log becomes many parallel ones

A **topic** is a named event stream, a logical category — `orders`, `clicks`. But if a topic were literally "one log", its throughput would be pinned to a single file on a single machine.

So Kafka cuts every topic into several **partitions**: **the thing that is genuinely append-only is the partition, not the topic.** "Topic" is just the name for the set of those partitions. The partition is the unit of everything parallel and everything ordered in Kafka — different partitions sit on different brokers and are written and read at the same time, so throughput scales with the partition count.

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 560 210" role="img" aria-label="The topic named orders is split into three partitions, each an independently ordered log, and the producer hashes the key to decide which partition an event lands in." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
 <defs><marker id="kt1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <rect x="12" y="84" width="92" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
 <text x="58" y="103" fill="#e6e6e6" font-size="12" text-anchor="middle">Producer</text>
 <text x="58" y="118" fill="#9aa4b2" font-size="9" text-anchor="middle">key → hash</text>
 <rect x="150" y="16" width="398" height="184" rx="10" fill="none" stroke="#3a4154" stroke-width="1.5" stroke-dasharray="5 4"/>
 <text x="206" y="34" fill="#9aa4b2" font-size="11" text-anchor="middle">Topic: orders</text>
 <text x="174" y="74" fill="#9aa4b2" font-size="11" text-anchor="middle">P0</text>
 <rect x="200" y="55" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="220" y="75" fill="#9aa4b2" font-size="10" text-anchor="middle">0</text>
 <rect x="244" y="55" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="264" y="75" fill="#9aa4b2" font-size="10" text-anchor="middle">1</text>
 <rect x="288" y="55" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="308" y="75" fill="#9aa4b2" font-size="10" text-anchor="middle">2</text>
 <rect x="332" y="55" width="40" height="30" rx="4" fill="none" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="3 3"/><text x="352" y="75" fill="#9aa4b2" font-size="10" text-anchor="middle">3</text>
 <text x="174" y="122" fill="#9aa4b2" font-size="11" text-anchor="middle">P1</text>
 <rect x="200" y="103" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="220" y="123" fill="#9aa4b2" font-size="10" text-anchor="middle">0</text>
 <rect x="244" y="103" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="264" y="123" fill="#9aa4b2" font-size="10" text-anchor="middle">1</text>
 <rect x="288" y="103" width="40" height="30" rx="4" fill="none" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="3 3"/><text x="308" y="123" fill="#9aa4b2" font-size="10" text-anchor="middle">2</text>
 <text x="174" y="170" fill="#9aa4b2" font-size="11" text-anchor="middle">P2</text>
 <rect x="200" y="151" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="220" y="171" fill="#9aa4b2" font-size="10" text-anchor="middle">0</text>
 <rect x="244" y="151" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="264" y="171" fill="#9aa4b2" font-size="10" text-anchor="middle">1</text>
 <rect x="288" y="151" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="308" y="171" fill="#9aa4b2" font-size="10" text-anchor="middle">2</text>
 <rect x="332" y="151" width="40" height="30" rx="4" fill="none" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="3 3"/><text x="352" y="171" fill="#9aa4b2" font-size="10" text-anchor="middle">3</text>
 <line x1="104" y1="100" x2="168" y2="70" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kt1)"/>
 <line x1="104" y1="106" x2="168" y2="118" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kt1)"/>
 <line x1="104" y1="112" x2="168" y2="166" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kt1)"/>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The topic is the name; the partition is the log that's actually ordered — throughput scales with the partition count, each appending at its own tail</figcaption>
</figure>

## How a producer decides which partition an event goes to

On write, **whether you set a key decides where the event lands — and therefore what ordering you get**:

- **With a key**: Kafka hashes the key and takes it modulo the partition count, so **the same key always goes to the same partition**. Use `order_id` as the key and every event for one order is guaranteed to sit in one log, strictly ordered.
- **Without a key**: events spread evenly across partitions (round-robin / sticky) for maximum throughput, giving up ordering between events.

This is Kafka's single most consequential design choice: **which events are ordered relative to each other is something you decide with the key — it isn't something Kafka hands you for free.**

## Offset: an event's position inside a partition

An **offset** is the monotonically increasing sequence number of each event *within its own partition* (0, 1, 2…). It only means anything inside a single partition; comparing offsets across partitions is meaningless.

Back to the bookmark picture from part one: where a consumer has read to is "I'm at offset 5 in P0 and offset 3 in P1". That position gets **committed**, so a consumer that restarts picks up where it left off — and *when* you commit is exactly the source of the "duplicated or dropped" problem the next post is about.

## Consumer group: how consumers divide and scale

One consumer can't keep up — now what? Put several consumers into one **consumer group**, and Kafka **assigns** the partitions across its members so they share the load.

There are only two rules, and both matter:

- **Within one group, each partition is assigned to exactly one consumer.** So consumers in a group *split* a topic between them — which makes Kafka behave like a horizontally scalable **queue**.
- **Different groups each read everything, independently.** Billing has its group, recommendations has its own, and both see every single event — which makes Kafka a **broadcast** at the same time.

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 540 200" role="img" aria-label="A topic's three partitions are assigned to the two consumers in a consumer group: partitions 0 and 1 go to consumer 1, partition 2 goes to consumer 2." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <defs><marker id="kt2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <rect x="18" y="28" width="112" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="74" y="52" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Partition 0</text>
 <rect x="18" y="84" width="112" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="74" y="108" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Partition 1</text>
 <rect x="18" y="140" width="112" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="74" y="164" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Partition 2</text>
 <rect x="300" y="18" width="224" height="164" rx="10" fill="none" stroke="#3a4154" stroke-width="1.5" stroke-dasharray="5 4"/>
 <text x="412" y="36" fill="#9aa4b2" font-size="11" text-anchor="middle">Consumer Group: billing</text>
 <rect x="332" y="50" width="160" height="40" rx="8" fill="#262b3a" stroke="#d4af37" stroke-width="1.5"/><text x="412" y="74" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Consumer 1</text>
 <rect x="332" y="122" width="160" height="40" rx="8" fill="#262b3a" stroke="#d4af37" stroke-width="1.5"/><text x="412" y="146" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Consumer 2</text>
 <line x1="130" y1="47" x2="332" y2="62" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kt2)"/>
 <line x1="130" y1="103" x2="332" y2="78" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kt2)"/>
 <line x1="130" y1="159" x2="332" y2="142" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kt2)"/>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Inside one group each partition goes to exactly one consumer (split the load); a different group reads all of it independently (broadcast)</figcaption>
</figure>

Two corollaries you'll actually use:

- **Your ceiling on parallelism is the partition count.** More consumers in a group than partitions and the extras just sit idle — one partition is never fed to two members at once.
- **Membership changes trigger a rebalance.** A consumer joins or dies and Kafka redistributes the partitions. Consumption pauses briefly during a rebalance, and you feel it when there are many partitions and many members — a cost worth knowing about before you're operating it.

## The ordering guarantee holds inside a partition, and nowhere else

Boiling all of the above into the one line worth remembering: **Kafka guarantees strict ordering within a single partition, and guarantees nothing across partitions.**

So ordering in Kafka is designed, not default: **whichever events you want ordered, give them the same key so they land in the same partition.** Global ordering across a whole topic? That means forcing the partition count to 1 — giving up parallelism entirely, and rarely worth it. In practice you take a step back and ask "what's the unit I actually need ordered?" — usually "one order" or "one user", not "the whole world".

## Reflection

### The partition count is the most important early decision, and the hardest to walk back

The partition count decides three things at once: **the ceiling on throughput, the ceiling on consumer parallelism, and the granularity of ordering**. And it only goes up — adding partitions later is easy, but it scrambles where existing keys hash to (a key can move to a different partition, and its history no longer joins up). So my habit is to **pick a number with room to grow, but not an absurd one, at the start** — better slightly generous on day one than discovering in production that you're pinned and can't move. It's one of the few places in Kafka where not thinking it through up front really hurts later.

### Choosing a key is designing your ordering and your load distribution

I think the partition key is badly underrated — on the surface it's just "which log does this row go into", and in reality it decides ordering and load balance in one stroke. Pick a key that's too coarse (a constant, say) and everything piles into one partition: a hotspot, parallelism gone. Pick it well (`order_id`) and you keep "one order stays ordered" while spreading the load evenly. **Work out what your unit of ordering is first, then go back and pick the key** — the ordering requirement drives the key, not whichever column came to hand.

### The consumer group is what lets Kafka be a queue and a broadcast at once

When I was learning this I kept getting stuck on: is Kafka a queue or is it publish-subscribe? The answer, it turns out, is hidden in the consumer group design — **split the load inside a group (like a queue), broadcast between groups (like pub/sub).** Need one service to consume faster? Add consumers to its group. Need a new team on the same events? Give them a new group. One mechanism, two uses — the prettiest part of Kafka's model, to my eye.

### But ordering and assignment still don't answer "can it duplicate or drop?"

This post is about how events are laid out and who reads them, and there's a sharper question it hasn't touched: when a consumer commits its offset decides whether a crash-and-restart means **reprocessing** or **losing** events. That's the part of [[kafka-intro|Kafka]]-as-infrastructure that most deserves to be taken seriously — **delivery guarantees** — and the next post covers at-least-once, exactly-once and replication in one go.
