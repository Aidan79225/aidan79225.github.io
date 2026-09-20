---
title: "Structured Streaming: Treating a Stream as One Unbounded Table"
date: 2026-06-29
category: tech
description: "Structured Streaming's core abstraction is one sentence: a stream is a table that keeps growing taller. So the query you run against it is identical to the one you'd run against a static DataFrame — you write a batch query and Spark turns it into a continuous job. What you actually have to learn are the three problems only streams have, and that micro-batch is really just \"batch, but fast\"."
tags:
 - spark
 - data-engineering
 - stream-processing
series: "Spark — Learning Notes"
seriesOrder: 5
comments: true
draft: false
translationOf: spark-streaming
---
The first four posts were all about **batch** Spark — [[spark-intro|what it is]], [[spark-dataframe|DataFrames in practice]], [[spark-shuffle|shuffle and tuning]], [[spark-running|getting it running]]. But data doesn't wait until you've assembled a batch: orders, clicks and logs **flow in continuously**. This post is about how Spark handles streams — **Structured Streaming** — and its cleverest move is telling you that **you don't have to learn a new streaming API at all**.

## The core idea: a stream is a table that keeps growing taller

Traditional streaming frameworks make you think in a completely different way from batch — event by event, callbacks, state you manage by hand. Structured Streaming inverts that, and its core abstraction is a single sentence:

**Think of a stream as an unbounded input table: every new batch of data that arrives is a few more rows appended at the tail.**

So the query you run against it is **identical** to the one you'd run against a static DataFrame — `select`, `filter`, `groupBy`, `join`. Behind the scenes Spark turns that query into a continuous job that recomputes incrementally and updates the result whenever new data lands. **You write a batch query, and Spark makes it a stream.**

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 520 210" role="img" aria-label="A stream is modelled as an unbounded table with new data appended at the tail, and the same query runs over it continuously to produce a result table." style="width:100%;max-width:560px;height:auto;margin:0 auto;">
 <defs><marker id="ss1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <text x="90" y="22" fill="#9aa4b2" font-size="11" text-anchor="middle">unbounded input table</text>
 <rect x="30" y="32" width="120" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="90" y="49" fill="#9aa4b2" font-size="10" text-anchor="middle">t1 batch</text>
 <rect x="30" y="62" width="120" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="90" y="79" fill="#9aa4b2" font-size="10" text-anchor="middle">t2 batch</text>
 <rect x="30" y="92" width="120" height="26" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="90" y="109" fill="#e6e6e6" font-size="10" text-anchor="middle">t3 just arrived</text>
 <rect x="30" y="122" width="120" height="26" rx="4" fill="none" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="3 3"/><text x="90" y="139" fill="#9aa4b2" font-size="10" text-anchor="middle">…keeps appending</text>
 <line x1="90" y1="152" x2="90" y2="186" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ss1)"/><text x="90" y="200" fill="#9aa4b2" font-size="9.5" text-anchor="middle">the table grows taller</text>
 <rect x="210" y="70" width="104" height="44" rx="8" fill="#262b3a" stroke="#d4af37" stroke-width="1.5"/><text x="262" y="89" fill="#e6e6e6" font-size="11" text-anchor="middle">same query</text><text x="262" y="104" fill="#9aa4b2" font-size="9" text-anchor="middle">groupBy/agg…</text>
 <line x1="150" y1="92" x2="208" y2="92" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#ss1)"/>
 <text x="430" y="22" fill="#9aa4b2" font-size="11" text-anchor="middle">result table (kept updated)</text>
 <rect x="370" y="62" width="120" height="26" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="430" y="79" fill="#e6e6e6" font-size="10" text-anchor="middle">aggregate</text>
 <rect x="370" y="92" width="120" height="26" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="430" y="109" fill="#e6e6e6" font-size="10" text-anchor="middle">result</text>
 <line x1="314" y1="92" x2="368" y2="92" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#ss1)"/>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">A stream is an unbounded table being appended to at the tail; put the same batch query on top and Spark recomputes incrementally, keeping the result up to date</figcaption>
</figure>

## A minimal streaming program looks almost exactly like the batch one

Side by side it's obvious. Batch, reading a file:

```python
df = spark.read.format("json").load("/data/events")
counts = df.groupBy("user_id").count()
counts.write.format("console").save()
```

As a stream, only `read → readStream` and `write → writeStream` change; the query in between is **untouched**:

```python
df = spark.readStream.format("kafka").option(...).load()
counts = df.groupBy("user_id").count() # exactly the same transformation
query = counts.writeStream.outputMode("complete").format("console").start()
query.awaitTermination()
```

A `readStream` source is commonly **Kafka** (picking up [[kafka-ecosystem|the Kafka ecosystem post]]: Spark is one of Kafka's most typical downstream consumers), a file directory, or a socket. The `groupBy().count()` in the middle is the same DataFrame API as batch — every [[spark-shuffle|shuffle]] and wide-versus-narrow instinct you built applies unchanged in a stream.

## Three problems only streams have

Treating a stream as a table is lovely, but "data keeps coming, and some of it arrives late" brings three problems batch doesn't have:

### 1. Output mode: what to emit each time

The result table keeps changing, so which rows do you write downstream?

- **Append**: only rows newly settled this round that won't change again. Suits transformations without aggregation, or aggregations paired with a watermark.
- **Complete**: emit the **whole result table** each time. Suits cases that need the full aggregate (as long as the result table can't grow without bound).
- **Update**: only the rows that changed this round. The cheapest, and common for stateful aggregations written to an updatable sink.

### 2. Event time and watermarks: what to do about late data

The key distinction: **event time (when the thing actually happened)** vs **processing time (when Spark received it)**. Network delay and offline devices mean an event that "happened at 10:00" can arrive at 10:05 — and if you want to window by event time (orders per minute, say), you have to handle that **lateness**.

A **watermark** is a promise you make to Spark: "anything more than N minutes behind the largest event time I've seen, I consider too late and stop waiting for". It draws a moving line:

- Late data still inside the line → correctly folded into its time window.
- Too late, past the line → dropped.

It resolves a very practical dilemma: **without a watermark, Spark has to keep the state of every time window forever in case a late row that may never come turns up → state explodes and OOMs.** A watermark lets expired windows close safely and release their state.

### 3. Checkpoints: how it picks up after a crash

A stream is a long-lived job, and it will be restarted at some point. Structured Streaming uses a **checkpoint** (written to reliable storage such as HDFS or S3) to record how far it has read and what its aggregation state is. Paired with a replayable source (Kafka can re-read by offset), that gives **exactly-once** end to end — after a crash it resumes from the checkpoint with nothing duplicated and nothing lost. Same thinking as [[kafka-delivery|the Kafka delivery guarantees post]]: **a replayable source plus a consumer that remembers its progress = nothing lost, nothing duplicated.**

## Micro-batch: it's really "batch, but fast"

One misconception to clear up: by default Structured Streaming does **not** process event by event — it uses **micro-batches**, cutting the incoming flow into very small batches (triggered as soon as data is there, by default) and running each through the Spark engine. That's how it reuses the whole batch optimization stack (Catalyst, Tungsten, AQE), at the price of latency in the **hundreds of milliseconds to seconds**, rather than true per-record milliseconds.

Which is the biggest dividing line between it and **Kafka Streams** from [[kafka-ecosystem|the previous series]]: Kafka Streams is embedded in your app, per record, milliseconds; Spark Structured Streaming is cluster-scale micro-batch, and **what you get in exchange is one set of DataFrame code covering batch and streaming, plus enormous throughput**. (Spark also has a low-latency Continuous Processing mode, but it's limited in what it supports and rarely used in practice.)

## Reflection

### "A stream is an unbounded table" is one of the finest abstractions I've met

When I first came to streaming I assumed I'd have to relearn how to think — and Structured Streaming told me: the batch you already know *is* the stream. That abstraction — **hiding the time dimension inside a table that grows** — let me carry my existing DataFrame, SQL and shuffle instincts over wholesale. What I took from it later is that a good abstraction doesn't give you more new concepts, it **saves you from learning new concepts**: it buries the hard parts (incremental computation, state management, fault tolerance) underneath, and what surfaces is still the table you know. That's worth more than any feature the framework has.

### The hard part isn't the API, it's event time and lateness

Writing `readStream.groupBy` isn't hard. Working out **which time you're counting by, and how late you'll tolerate** is. The streaming bugs I've seen most aren't syntax errors — they're **using processing time while pretending it's event time**, so the moment data arrives late the numbers are quietly wrong and almost impossible to spot. A watermark looks like an OOM-prevention knob and is really a way of forcing you to answer a business question head on: **how late can data be and still count?** There's no default answer to that; you have to settle it with the business. I now ask it before writing any streaming code.

### Not everything called "real time" needs a stream

Streaming is seductive, but it's a long-lived job — checkpoints, state, monitoring, restarts — and its operational cost sits a notch above batch. My test is to **ask first whether the latency requirement is seconds or minutes**. Plenty of requirements that call themselves "real time" are entirely satisfied by a batch job every 5 minutes ([[airflow-scheduling|scheduled with Airflow]]), which is easier to maintain and far easier to debug. Only when you genuinely need to get down to seconds, on a sustained High-throughput feed, is it worth paying streaming's operations tax. **Confirm you really need a stream before you build one** — the same note this whole series keeps hitting: a tool is there to multiply output, not to add debt.
