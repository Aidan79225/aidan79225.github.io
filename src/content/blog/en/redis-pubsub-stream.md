---
title: "Pub/Sub vs Stream: Redis's Version of a Messaging System"
date: 2026-07-21
category: tech
tags:
  - redis
  - distributed-systems
series: "Redis — Learning Notes"
seriesOrder: 12
comments: true
draft: false
translationOf: redis-pubsub-stream
---
Redis can serve as a messaging system too, but it has **two completely different** things for it, and using the wrong one means mysteriously dropped messages or a sledgehammer for a nut: **Pub/Sub** (broadcast; gone is gone) and **Stream** (a kept log, like a miniature Kafka). This is the finale of the whole Redis series, and it happens to connect back to [[kafka-intro|Kafka]] — because Stream is very nearly Kafka's core concepts condensed into one Redis data structure.

## One drops it, one keeps it and can replay

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 220" role="img" aria-label="Redis Pub/Sub versus Stream. Left, Pub/Sub: a publisher sends a message to a channel, and only subscribers subscribed at that moment receive it; two online subscribers got it, one offline subscriber missed it, and the message isn't stored, with no replay and no ack. Right, Stream: a producer appends messages to a log with XADD, messages m1 to m5 are all kept, a consumer can read from any position and catch up from where it left off after being offline, and there are consumer groups and acks." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ps" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="26" x2="290" y2="196" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="42" fill="#e0733a" font-size="9.6" text-anchor="middle" font-weight="bold">Pub/Sub: broadcast, gone is gone</text>
    <rect x="30" y="52" width="212" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="136" y="68" fill="#e6e6e6" font-size="7.8" text-anchor="middle">PUBLISH news "…"</text>
    <line x1="136" y1="76" x2="136" y2="88" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ps)"/>
    <rect x="30" y="90" width="212" height="22" rx="5" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.3"/><text x="136" y="105" fill="#e0733a" font-size="7.8" text-anchor="middle">channel: news (not stored)</text>
    <line x1="70" y1="112" x2="63" y2="130" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ps)"/><line x1="146" y1="112" x2="146" y2="130" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ps)"/><line x1="210" y1="112" x2="228" y2="130" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ps)"/>
    <rect x="26" y="132" width="72" height="34" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="62" y="147" fill="#54b890" font-size="7.6" text-anchor="middle">Sub online</text><text x="62" y="159" fill="#9aa4b2" font-size="7" text-anchor="middle">✓ got it</text>
    <rect x="110" y="132" width="72" height="34" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="146" y="147" fill="#54b890" font-size="7.6" text-anchor="middle">Sub online</text><text x="146" y="159" fill="#9aa4b2" font-size="7" text-anchor="middle">✓ got it</text>
    <rect x="194" y="132" width="76" height="34" rx="5" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="232" y="147" fill="#e05a7d" font-size="7.6" text-anchor="middle">Sub offline</text><text x="232" y="159" fill="#e05a7d" font-size="7" text-anchor="middle">✗ missed</text>
    <text x="146" y="186" fill="#9aa4b2" font-size="7.6" text-anchor="middle">nobody listening → gone · no persistence · no replay · no ack</text>
    <text x="434" y="42" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">Stream: a kept log, replayable</text>
    <rect x="318" y="52" width="232" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="434" y="68" fill="#e6e6e6" font-size="7.8" text-anchor="middle">XADD stream * … (append)</text>
    <line x1="434" y1="76" x2="434" y2="86" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ps)"/>
    <rect x="322" y="90" width="42" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="343" y="105" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m1</text><rect x="368" y="90" width="42" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="389" y="105" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m2</text><rect x="414" y="90" width="42" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="435" y="105" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m3</text><rect x="460" y="90" width="42" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="481" y="105" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m4</text><rect x="506" y="90" width="42" height="22" rx="3" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="527" y="105" fill="#9aa4b2" font-size="7.4" text-anchor="middle">m5</text>
    <line x1="343" y1="130" x2="343" y2="114" stroke="#54b890" stroke-width="1.2" marker-end="url(#ps)"/><line x1="481" y1="130" x2="481" y2="114" stroke="#d6a45c" stroke-width="1.2" marker-end="url(#ps)"/>
    <text x="343" y="142" fill="#54b890" font-size="7" text-anchor="middle">old consumer</text><text x="481" y="142" fill="#d6a45c" font-size="7" text-anchor="middle">another reads from here</text>
    <text x="434" y="164" fill="#9aa4b2" font-size="7.6" text-anchor="middle">messages kept (MAXLEN cap optional)</text>
    <text x="434" y="186" fill="#9aa4b2" font-size="7.6" text-anchor="middle">re-read anywhere · catch up after being offline · groups + ack</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e0733a">Pub/Sub</b> is pure broadcast: a message goes to a channel and only those <b>subscribed at that moment</b> receive it; the offline and the late all <b>miss it</b> — no storage, no replay, no ack (fire-and-forget). <b style="color:#4f6df5">Stream</b> is an <b>append-only log</b>: once <code>XADD</code>ed, a message <b>stays</b> (with an optional MAXLEN cap), consumers can read from any position and catch up from where they left off after being offline, with consumer groups and acks on top. This "gone is gone vs kept on the books" difference is the same axis as <a href="/blog/infra-rabbitmq/">RabbitMQ's queue vs Kafka's log</a></figcaption>
</figure>

## Pub/Sub: broadcast, for real-time notifications where "missing one is fine"

The Pub/Sub model in three sentences: `SUBSCRIBE` a channel, `PUBLISH` to the channel, and every subscriber **online at that moment** receives it immediately. It's **fire-and-forget** — the broker doesn't record who received what, doesn't resend, doesn't store. So it's inherently suited only to **real-time broadcasts where "missing one or two doesn't matter"**: online presence, live notifications, cross-node cache-invalidation broadcasts (tell everyone to drop a key).

```bash
SUBSCRIBE news          # subscribe (this connection enters subscribe mode)
PUBLISH news "hello"    # another connection publishes; only subscribers online right now receive it
```

**Never use it for task dispatch that "must not be dropped"** — during the few seconds a subscriber restarts, or a network hiccup, the messages from that window are gone forever, and you won't even know they were dropped.

## Stream: a kept log + consumer groups, like a lightweight Kafka

For "must not drop, replayable, several workers sharing the load", use a **Stream**. It's an append-only log: `XADD` writes, every entry gets an increasing ID; more importantly it has **consumer groups**, whose behaviour is very nearly a copy of Kafka's:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 196" role="img" aria-label="Redis Stream consumer groups and acks. One stream holds six messages m1 to m6. A consumer group called workers has two consumers C1 and C2; the group hands messages to its members with each message going to exactly one, C1 getting m1, m3 and m5, C2 getting m2 and m6. When done, a consumer must XACK; acked messages leave pending. m4 was handed to C2 but not acked, for example because C2 died, so it stays in the pending entries list and is later reassigned to another consumer and redelivered, achieving at-least-once." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="st" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Stream + consumer group: share the work, ack, redeliver if not acked</text>
    <text x="40" y="44" fill="#9aa4b2" font-size="8" text-anchor="middle">stream</text>
    <rect x="70" y="32" width="60" height="24" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="100" y="48" fill="#e6e6e6" font-size="7.6" text-anchor="middle">m1</text><rect x="134" y="32" width="60" height="24" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="164" y="48" fill="#e6e6e6" font-size="7.6" text-anchor="middle">m2</text><rect x="198" y="32" width="60" height="24" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="228" y="48" fill="#e6e6e6" font-size="7.6" text-anchor="middle">m3</text><rect x="262" y="32" width="60" height="24" rx="3" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.3"/><text x="292" y="48" fill="#d6a45c" font-size="7.6" text-anchor="middle">m4</text><rect x="326" y="32" width="60" height="24" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="356" y="48" fill="#e6e6e6" font-size="7.6" text-anchor="middle">m5</text><rect x="390" y="32" width="60" height="24" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="420" y="48" fill="#e6e6e6" font-size="7.6" text-anchor="middle">m6</text>
    <rect x="70" y="96" width="200" height="70" rx="8" fill="none" stroke="#54b890" stroke-width="1.4"/><text x="170" y="112" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">group: workers</text>
    <rect x="86" y="122" width="76" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="124" y="141" fill="#e6e6e6" font-size="8" text-anchor="middle">C1</text>
    <rect x="178" y="122" width="76" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="216" y="141" fill="#e6e6e6" font-size="8" text-anchor="middle">C2</text>
    <line x1="100" y1="56" x2="120" y2="120" stroke="#54b890" stroke-width="1" marker-end="url(#st)"/><line x1="228" y1="56" x2="128" y2="120" stroke="#54b890" stroke-width="1" marker-end="url(#st)"/>
    <line x1="164" y1="56" x2="212" y2="120" stroke="#9aa4b2" stroke-width="1" marker-end="url(#st)"/><line x1="420" y1="56" x2="222" y2="120" stroke="#9aa4b2" stroke-width="1" marker-end="url(#st)"/>
    <text x="124" y="164" fill="#9aa4b2" font-size="6.8" text-anchor="middle">m1·m3·m5</text><text x="216" y="164" fill="#9aa4b2" font-size="6.8" text-anchor="middle">m2·m6</text>
    <line x1="292" y1="56" x2="360" y2="92" stroke="#d6a45c" stroke-width="1.2" stroke-dasharray="3 2" marker-end="url(#st)"/>
    <rect x="330" y="94" width="230" height="34" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="445" y="110" fill="#e05a7d" font-size="7.8" text-anchor="middle" font-weight="bold">m4 went to C2 but no XACK (C2 died)</text><text x="445" y="122" fill="#9aa4b2" font-size="7" text-anchor="middle">→ stays pending (PEL) → reassigned, redelivered</text>
    <text x="445" y="150" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">XACK when done → leaves pending</text>
    <text x="445" y="166" fill="#9aa4b2" font-size="7.6" text-anchor="middle">anything unacked is redelivered → at-least-once</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Several consumers in one <b style="color:#54b890">consumer group</b> (workers) <b>share</b> the consumption of one stream — each message goes to exactly one member (C1 gets m1/m3/m5, C2 gets m2/m6), so adding consumers scales horizontally. When done you must <code>XACK</code>; <b style="color:#e05a7d">unacked messages</b> (like m4, which C2 took and then died) stay in <b>pending (PEL)</b> and are later reassigned and <b>redelivered</b> — that's at-least-once. See it? This is very nearly a miniature <a href="/blog/kafka-intro/">Kafka consumer group</a></figcaption>
</figure>

```bash
XADD orders * item book qty 2                 # write one entry (* = auto-generate an increasing ID)
XGROUP CREATE orders workers 0                 # create a group starting from the beginning
XREADGROUP GROUP workers c1 COUNT 10 STREAMS orders >   # c1 fetches new messages
XACK orders workers 1699-0                      # done processing, acknowledge this one (else it stays in the PEL)
XPENDING orders workers                         # see what's been "taken but not acked"
```

## So when should you go straight to Kafka?

If Stream is this much like Kafka, what's Kafka for? The line is **scale and positioning**:

- **Use Redis Stream**: a lightweight message / task queue, volume not outrageous, short retention, you **already have Redis** and don't want to stand up a whole Kafka for one queue.
- **Go straight to [[infra-kafka|Kafka]]**: very high throughput, **long retention** (TB-scale, days to weeks, replayable for recomputation), **massive fan-out** (dozens of consumer groups each reading a copy), the ecosystem (Kafka Connect, Streams), harder durability guarantees. **Redis Stream's data lives in memory** (persisted via [[redis-persistence|RDB/AOF]], and usually truncated with MAXLEN); it was never designed to "retain vast history".

In one sentence: **Redis Stream is "a handy lightweight queue", not "a Kafka replacement".** While the need is small, don't shoulder a Kafka for one queue; but when you truly need what Kafka offers, forcing Stream to cope is rebuilding a crippled Kafka.

## Reflections

### "Gone is gone" or "kept on the books" — ask this first

The choice between Pub/Sub and Stream comes down to one question: **if one message is missed, can you bear it?** If yes (real-time notifications, presence broadcasts), Pub/Sub is light and simple; if no (orders, debits, task dispatch), you need something that stores, replays and acks — Stream. It's the same thinking as the "kept vs taken away" line in my [[infra-rabbitmq|RabbitMQ]] post and Kafka's "log vs queue" — **before choosing a messaging solution, think through "what happens if one is missed", and the answer picks the tool for you.** I've seen too many incidents whose root cause was sending "absolutely can't be dropped" messages through something fire-and-forget, while everyone kept thinking something else was broken.

### Good abstractions "grow into the same shape"

One thing about Redis Stream struck me: it's very nearly Kafka's core — append log, offset, consumer group, ack, pending — **condensed into one Redis data structure**. Two teams, two completely different implementations, and the skeletons they grew are strikingly alike. Which shows those concepts **aren't Kafka's property; they're the natural solution to the problem of "reliable durable messaging"** — anyone who works at it seriously grows the same log + offset + group + ack shape. It's also why learning gets cheaper for me over time: **understand one good abstraction and you understand a whole batch.** Learn Kafka's consumer groups thoroughly, and Redis Stream and other messaging systems are the same story in a different skin.

### Closing: every face of Redis proves "it's not just a cache"

With this post, the whole [[redis-intro|Redis series]] comes full circle. Looking back over the road — data structures, the single thread, persistence, expiration and eviction, the three cache disasters, distributed locks, replication, Sentinel, Cluster, transactions and Lua, and now messaging — every face has been proving the opening line: **Redis is an in-memory data structure server, and "cache" is just its most famous use.** It can be a lock, a queue, a leaderboard, a counter, a lightweight message log, because it gives you a set of **fast, atomic data structures**, and the rest is how you combine them. Which is also the one line I most want to leave you with after the whole series: **don't box Redis into the little "cache" compartment** — once you start treating it as "a data structure server on call at your elbow", a lot of problems that used to need big machinery to solve suddenly become light and simple.
