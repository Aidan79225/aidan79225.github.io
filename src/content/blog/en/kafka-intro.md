---
title: "What Is Apache Kafka? From Message Queue to Event Streaming"
date: 2026-06-24
category: tech
description: "Don't think of Kafka as a queue that drops a message once it's delivered — think of it as a log that keeps being appended to and can be read from the beginning again. That shift is the key to every design decision in it. Starting from N² system integration: why adding one consumer shouldn't mean going back to change the producer."
tags:
  - kafka
  - data-engineering
series: "Kafka — Learning Notes"
seriesOrder: 1
comments: true
draft: false
translationOf: kafka-intro
---
## What Kafka is

In one sentence: **Apache Kafka is a distributed event streaming platform — it collects the events flowing between systems into a High-throughput, durable, replayable log, so that many producers keep writing and many consumers each read independently.** It came out of LinkedIn (2011), became a top-level Apache project, and is now the backbone of almost every real-time data pipeline.

The key realisation: **don't picture Kafka as a traditional message queue (deliver the message, then drop it) — picture it as an event log that keeps being appended to and can be read from the beginning again.** That shift is the key to every design decision in it.

### What it solves: from N² direct connections to one hub

Once you have a few systems, "who needs whose data" explodes. The order system has to notify inventory, fulfilment, recommendations, risk control, reporting… wire every pair together directly and the number of integrations is on the order of **N²** — add one new consumer and you go back and change the producer. Fragile, and miserable to maintain.

Kafka collapses that mesh into a hub: **producers only write events in; consumers each subscribe to what they want; neither knows the other exists.** The systems are decoupled from that point on.

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 560 210" role="img" aria-label="On the left, several systems wired point to point form a mesh with N squared connections. On the right, every system connects to Kafka once as a hub: producers write in and consumers each subscribe." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
 <text x="130" y="20" fill="#9aa4b2" font-size="11" text-anchor="middle">point to point: N² lines</text>
 <circle cx="70" cy="55" r="20" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
 <circle cx="190" cy="55" r="20" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
 <circle cx="60" cy="140" r="20" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
 <circle cx="160" cy="155" r="20" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
 <circle cx="210" cy="130" r="20" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
 <line x1="70" y1="55" x2="190" y2="55" stroke="#3a4154" stroke-width="1.2"/>
 <line x1="70" y1="55" x2="60" y2="140" stroke="#3a4154" stroke-width="1.2"/>
 <line x1="70" y1="55" x2="160" y2="155" stroke="#3a4154" stroke-width="1.2"/>
 <line x1="70" y1="55" x2="210" y2="130" stroke="#3a4154" stroke-width="1.2"/>
 <line x1="190" y1="55" x2="60" y2="140" stroke="#3a4154" stroke-width="1.2"/>
 <line x1="190" y1="55" x2="160" y2="155" stroke="#3a4154" stroke-width="1.2"/>
 <line x1="190" y1="55" x2="210" y2="130" stroke="#3a4154" stroke-width="1.2"/>
 <line x1="60" y1="140" x2="160" y2="155" stroke="#3a4154" stroke-width="1.2"/>
 <line x1="160" y1="155" x2="210" y2="130" stroke="#3a4154" stroke-width="1.2"/>
 <text x="430" y="20" fill="#9aa4b2" font-size="11" text-anchor="middle">hub: each connects once</text>
 <rect x="392" y="88" width="76" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
 <text x="430" y="113" fill="#e6e6e6" font-size="12" text-anchor="middle">Kafka</text>
 <circle cx="330" cy="55" r="18" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
 <circle cx="330" cy="160" r="18" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
 <circle cx="530" cy="55" r="18" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
 <circle cx="530" cy="160" r="18" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
 <line x1="346" y1="62" x2="394" y2="92" stroke="#4f6df5" stroke-width="1.3"/>
 <line x1="346" y1="152" x2="394" y2="124" stroke="#9aa4b2" stroke-width="1.3"/>
 <line x1="466" y1="92" x2="516" y2="62" stroke="#9aa4b2" stroke-width="1.3"/>
 <line x1="466" y1="124" x2="516" y2="152" stroke="#9aa4b2" stroke-width="1.3"/>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">On the left every new system means a fistful of new wires; on the right each system connects to Kafka once, and producing is fully decoupled from consuming</figcaption>
</figure>

### The core mental model: a replayable log, not a queue

A traditional message queue (the RabbitMQ family) works like this: a consumer takes the message, processes it, and it **disappears from the queue**. Kafka is nothing like that — an event written in is **appended to a log that only grows**, and it stays there for the whole retention period. Consumers don't take messages away; each holds a bookmark — an **offset (which record it has read up to)** — and reads down the log.

That gives you two things a traditional queue can't:

- **Consumers are independent of each other**: the reporting team, the risk team and the recommendation team can all read the same log at the same time, each tracking its own offset, without interfering or competing.
- **Replay**: you shipped a bug, or a new consumer wants the historical data — wind the offset back and read again. The data is still there.

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 540 180" role="img" aria-label="Kafka as an append-only log: the producer writes to the tail while several consumers each mark how far they have read with their own offset." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <text x="20" y="44" fill="#9aa4b2" font-size="11" text-anchor="start">producer appends at the tail →</text>
 <rect x="40" y="54" width="46" height="40" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="63" y="79" fill="#9aa4b2" font-size="11" text-anchor="middle">0</text>
 <rect x="88" y="54" width="46" height="40" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="111" y="79" fill="#9aa4b2" font-size="11" text-anchor="middle">1</text>
 <rect x="136" y="54" width="46" height="40" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="159" y="79" fill="#9aa4b2" font-size="11" text-anchor="middle">2</text>
 <rect x="184" y="54" width="46" height="40" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="207" y="79" fill="#e6e6e6" font-size="11" text-anchor="middle">3</text>
 <rect x="232" y="54" width="46" height="40" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="255" y="79" fill="#e6e6e6" font-size="11" text-anchor="middle">4</text>
 <rect x="280" y="54" width="46" height="40" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="303" y="79" fill="#e6e6e6" font-size="11" text-anchor="middle">5</text>
 <rect x="328" y="54" width="46" height="40" rx="5" fill="none" stroke="#3a4154" stroke-width="1.3" stroke-dasharray="3 3"/><text x="351" y="79" fill="#9aa4b2" font-size="11" text-anchor="middle">6</text>
 <text x="420" y="79" fill="#9aa4b2" font-size="10" text-anchor="start">new events…</text>
 <line x1="159" y1="118" x2="159" y2="96" stroke="#d4af37" stroke-width="1.6" marker-end="url(#kf1)"/>
 <text x="159" y="134" fill="#d4af37" font-size="10" text-anchor="middle">consumer A</text>
 <text x="159" y="148" fill="#9aa4b2" font-size="9" text-anchor="middle">offset=2</text>
 <line x1="303" y1="118" x2="303" y2="96" stroke="#4f6df5" stroke-width="1.6" marker-end="url(#kf2)"/>
 <text x="303" y="134" fill="#4f6df5" font-size="10" text-anchor="middle">consumer B</text>
 <text x="303" y="148" fill="#9aa4b2" font-size="9" text-anchor="middle">offset=5</text>
 <defs><marker id="kf1" markerWidth="8" markerHeight="8" refX="4" refY="1" orient="auto"><path d="M0,8 L4,0 L8,8 z" fill="#d4af37"/></marker><marker id="kf2" markerWidth="8" markerHeight="8" refX="4" refY="1" orient="auto"><path d="M0,8 L4,0 L8,8 z" fill="#4f6df5"/></marker></defs>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">One log: consumer A has read to offset 2, consumer B to 5 — separate bookmarks, no interference, and the data doesn't vanish because someone read it</figcaption>
</figure>

### How it differs from a database and from a message queue

| | Traditional message queue | Database | **Kafka** |
|---|---|---|---|
| Data model | transient messages | queryable current state | **append-only event log** |
| After reading | the message is gone | data stays, can be changed | **stays and can be replayed, but not changed** |
| Multiple consumers | they compete | each queries | **each reads independently, no interference** |
| Primary query | take the next one | arbitrary conditions | **read forward by offset** |
| Good at | dispatching tasks | the truth of current state | **High-throughput event streams, decoupling, replay** |

One line to remember it by: **a database stores "what the state is now", Kafka stores "what happened".** They complement each other; neither replaces the other.

### What it's good at, and what it isn't

- **Good at**: High-throughput event streams, decoupling systems, sharing one set of events across teams, anything that needs replay, and being the intake for stream processing.
- **Not good at**: being your primary database (it isn't designed for arbitrary queries), low-latency request-response interaction, or small message volumes that need complex routing — a traditional queue or a direct API call fits those better.

## Reflection

### Treat Kafka as a log of facts, not a pipe for messages

The biggest turn for me while learning Kafka was to stop thinking about it in the frame of "message delivery". Once you see it as **an immutable log recording what happened**, a lot of the design suddenly makes sense: why the data stays after being read, why several teams can each have their own view, why you can rewind and recompute. The problem with a traditional queue is that a consumed message is gone; Kafka treats an **event as a fact worth keeping**, not a notification to be used once and discarded. Turn that lens and what it can and can't do becomes obvious.

### Its value is decoupling, and decoupling has a price

Kafka's most concrete benefit is prising "who produces" fully apart from "who consumes" — add a new consumer and you touch nothing upstream. In a multi-team system that's worth a great deal. But I also remind myself not to romanticise it: putting a Kafka in the middle means one more piece of infrastructure to operate, monitor, and understand — partitions, offsets and all. **Two or three services passing the occasional message are usually better served by a direct API call or a lightweight queue than by carrying a whole Kafka.** It was built for the scale where there are many events, many consumers, and a need to replay — the same attitude I took writing about [[airflow-intro|Airflow]] and [[spark-intro|Spark]]: **[[pain-before-power|confirm the pain has reached that scale before you bring in the heavy weapons]].**

### It happens to connect to the pipeline I'd been learning

Kafka isn't a standalone thing; it completes the jigsaw of my recent notes. In the [[medallion-architecture|Medallion architecture]] it's the most common entry point for pouring real-time events into the **Bronze layer**; and [[spark-running|Spark Structured Streaming]] is often hanging off the back of Kafka, consuming that log in real time and turning it into Silver and Gold. Compared with [[airflow-scheduling|Airflow]]'s batch scheduling, Kafka represents the other axis — **from "run it every hour" to "handle it the moment it happens"**. Seeing that axis clearly is what this series goes on to unfold.
