---
title: "The Kafka Ecosystem: Connect, Schema Registry and Streams"
date: 2026-06-26
category: tech
description: "A broker does one thing: store the log reliably and serve the log. But every real pipeline keeps hitting the same three needs — data has to be moved in and out (Connect), someone has to own what an event looks like (Schema Registry), and you want to compute on the stream (Streams). This post draws the lines: what each one solves, and when you should actually reach for it."
tags:
 - kafka
 - data-engineering
 - stream-processing
series: "Kafka — Learning Notes"
seriesOrder: 4
comments: true
draft: false
translationOf: kafka-ecosystem
---
The first three posts were all about the Kafka broker itself — [[kafka-intro|the replayable log]], [[kafka-topics|the core model]], [[kafka-delivery|delivery guarantees]]. But in the real world you almost never run "just a broker": data has to be pulled in from other systems, someone has to own what an event looks like, and you need transformations and aggregations on the stream. The broker does none of that — a ring of ecosystem components fills it in. This post covers the three that matter most: **Kafka Connect, Schema Registry, Kafka Streams**.

## The broker only stores and serves; the rest is the ecosystem

Draw the line first: **a Kafka broker does one thing — store the log reliably and serve the log.** It has no idea where your data came from, what it looks like, or what it should be turned into. But every real pipeline keeps hitting the same three needs, each matching one ecosystem component:

| Need | What you'd do without the ecosystem | Component |
|---|---|---|
| Move data from/to external systems | write a pile of producer/consumer glue yourself | **Kafka Connect** |
| Make everyone agree on what an event looks like | agree on fields verbally, break downstream on any change | **Schema Registry** |
| Transform / aggregate / join on the event stream | manage state, fault tolerance and exactly-once yourself | **Kafka Streams** |

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 600 250" role="img" aria-label="The Kafka broker sits in the middle: a Connect source brings data in from external systems and a Connect sink pushes it downstream, Schema Registry supplies schemas from above, and Kafka Streams below reads the stream, computes and writes the result back." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
 <defs><marker id="ke1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <rect x="232" y="100" width="136" height="50" rx="10" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
 <text x="300" y="122" fill="#e6e6e6" font-size="13" text-anchor="middle">Kafka</text>
 <text x="300" y="138" fill="#9aa4b2" font-size="9.5" text-anchor="middle">topics / log</text>
 <rect x="14" y="102" width="96" height="46" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
 <text x="62" y="121" fill="#e6e6e6" font-size="10.5" text-anchor="middle">MySQL / API</text>
 <text x="62" y="136" fill="#9aa4b2" font-size="9" text-anchor="middle">sources</text>
 <rect x="490" y="102" width="96" height="46" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
 <text x="538" y="121" fill="#e6e6e6" font-size="10.5" text-anchor="middle">DW / ES / S3</text>
 <text x="538" y="136" fill="#9aa4b2" font-size="9" text-anchor="middle">downstream</text>
 <line x1="110" y1="125" x2="230" y2="125" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#ke1)"/>
 <text x="170" y="116" fill="#d4af37" font-size="9.5" text-anchor="middle">Connect source</text>
 <line x1="368" y1="125" x2="488" y2="125" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#ke1)"/>
 <text x="428" y="116" fill="#d4af37" font-size="9.5" text-anchor="middle">Connect sink</text>
 <rect x="222" y="18" width="156" height="40" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3"/>
 <text x="300" y="42" fill="#e6e6e6" font-size="11" text-anchor="middle">Schema Registry</text>
 <line x1="300" y1="58" x2="300" y2="98" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="3 3"/>
 <rect x="222" y="192" width="156" height="42" rx="8" fill="#262b3a" stroke="#d4af37" stroke-width="1.4"/>
 <text x="300" y="210" fill="#e6e6e6" font-size="11" text-anchor="middle">Kafka Streams</text>
 <text x="300" y="225" fill="#9aa4b2" font-size="9" text-anchor="middle">read → compute → write back</text>
 <line x1="280" y1="152" x2="280" y2="190" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ke1)"/>
 <line x1="320" y1="190" x2="320" y2="152" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ke1)"/>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The broker in the middle only stores and serves; Connect handles in and out, Schema Registry supplies the shared structure, Streams computes on the stream and writes back</figcaption>
</figure>

## Kafka Connect: moving data without writing code

To sync MySQL changes into Kafka, or pour a topic into Elasticsearch, you could of course write your own producer and consumer — but that's a pile of repeated glue: retries, offset management, batching, fault tolerance, rewritten for every integration. **Connect folds that layer into a framework where you declare "which system, which table" in JSON and write no code.**

Two directions:

- **Source connector**: external system → Kafka. Debezium, for instance, reads MySQL's binlog and turns every insert/update/delete into an event stream — that's CDC, change data capture.
- **Sink connector**: Kafka → external system. Continuously writing the `orders` topic into a data warehouse or Elasticsearch, say.

Connect is itself distributed: a connector is split into several **tasks** running in parallel, **offsets and progress are managed by the framework**, and when a worker dies its tasks are reassigned and resume from the last position — all the fiddly parts of moving data correctly are handled for you.

The design is the same thinking as [[airflow-providers|Airflow's operators and hooks]]: **take "integrate with an external system" and turn it into reusable, configurable components instead of hand-writing it every time.** The difference is that Airflow's are scheduled batch tasks, while Connect is a long-running streaming mover.

## Schema Registry: getting producers and consumers to agree on what an event looks like

A Kafka event is bytes; the broker doesn't care what's inside. Which leads to this: one day a producer adds a field, or changes `amount` from an integer to a string, and **the consumer's deserialization blows up on the spot** — in production, after the fact.

**Schema Registry takes "the structure of an event" out of everyone's individual code and moves it somewhere central and version-controlled.** How it works:

- Before sending, a producer registers its schema (Avro / Protobuf / JSON Schema) with the registry, and the message itself only carries a **schema id**; the consumer takes that id back to the registry, gets the schema, and deserializes.
- The registry uses **compatibility rules** to block dangerous changes: `BACKWARD` (a new consumer can read old data — adding a field with a default is allowed), `FORWARD` (an old consumer can read new data), `FULL` (both). An incompatible schema is rejected at registration, not when something downstream explodes.

Put another way: **it turns "will changing this field wreck someone else?" from a runtime accident into a gate at registration time.**

## Kafka Streams: compute on the stream without standing up another cluster

Read a topic, aggregate or join, write back to another topic — write that "compute on the stream" yourself with a consumer and a producer and you're handling state, fault tolerance and duplicates by hand. **Kafka Streams is a client library — not another cluster — that runs inside your Java or Scala application** and packages all of that:

- **Stateful computation**: aggregations, windowing and joins are all supported. State lives in a local state store and is simultaneously written to a **changelog topic** back in Kafka — when an instance dies and moves to another machine, the state is rebuilt from the changelog.
- **Exactly-once**: it plugs straight into the transactions from [[kafka-delivery|the last post]], making "read → compute → write back" one atomic operation.
- **Two abstractions**: a `KStream` is "a stream of individual events", a `KTable` is "a snapshot table updated by key" — the same topic viewed as a stream or as a table, each suiting different computations (a KTable fits "the latest state of each user", for example).

### Kafka Streams vs Spark Structured Streaming

Both do stream processing, but they sit in very different places:

| Dimension | Kafka Streams | Spark Structured Streaming |
|---|---|---|
| Deployment | embedded in your app, **no extra cluster** | a separate Spark cluster |
| Latency | per record, milliseconds | micro-batch, usually higher |
| Language | mainly Java / Scala | friendly to Python / SQL |
| Fits | moderate throughput, low-latency computation inside a service | huge volumes, and wanting **one API across batch and stream** |
| Sources | Kafka only | Kafka, files, many sources |

Short version: **staying inside Kafka, want low latency, don't want another cluster to feed → Streams; enormous volumes, shared logic with your batch jobs, a Python/SQL team → Spark.** Which echoes [[spark-running|the Spark post]] — Structured Streaming commonly takes Kafka as its input source, so the two cooperate rather than compete.

## Reflection

### On a real Kafka project, nine tenths of the time goes on the ecosystem, not the broker

Looking at where my own and my team's hours actually go on Kafka: the broker's own settings (partitions, replicas, retention) get worked out once and barely move after that; **it's the connector tuning in Connect, the schema versions evolving, and the state and restarts in Streams that we touch every day.** So if the first three posts left you feeling you know Kafka, you've really only reached the foundation — what makes a system run, and stop breaking every other day, is this ring of components. Don't stop learning Kafka at the broker.

### Schema Registry is badly underrated blast protection, and it should go in early

This is the one I most want to shout back at my past self. Early projects took the fast road: shove JSON into the event, agree on fields verbally. Lovely at first — right up to the day someone changed a field's type and a crowd of downstream consumers went down together in the middle of the night, with no easy way to tell who had changed it. **The value of Schema Registry isn't serialization efficiency, it's that it turns "will a structural change hurt someone?" into a gate that stops you at registration time.** It takes some effort to bring in up front, but what it blocks is exactly the kind of production incident that's hardest to debug and most damaging to trust. My position now: the moment events are consumed by more than one team, Schema Registry goes in from day one — don't wait for the incident.

### If Connect can do it, don't write your own consumer

I've seen too many teams hand-roll a long-running consumer just to "write Kafka data into ES or a database", then slowly grow retries, offset management, batching and monitoring inside it — and six months later it's a thing nobody dares touch, which is really just half a broken Connect. **Connect solved those problems long ago, and solved them better than whatever you put together in a hurry.** My default: for standard "move data in and out", look for an existing connector first, and only write your own when the requirement is genuinely odd (complex transformation, an unusual protocol). Spend the engineering time on business logic, not on rebuilding the moving van.

### Streams or Spark — start from what you already have

It's easy to fall into arguing which is technically stronger, when the question that matters in practice is **where your team and your environment already are**: a [[spark-running|Spark cluster]] already running, a team that writes Python and SQL, huge volumes and logic shared with batch — then Spark Structured Streaming follows naturally. The other way round, if you just need a low-latency aggregation inside Kafka and don't want another cluster to run and operate, Streams embedded in the app wins on simplicity. **Neither is better in the abstract; what matters is the fit with the stack you already have** — the same note the whole series keeps hitting: the Kafka ecosystem hands you a set of tools, and which one you pick depends on the shape of the problem you're solving.
