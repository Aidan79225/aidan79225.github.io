---
title: "What Spark Performance Actually Is: Shuffle and Tuning"
date: 2026-06-21
category: tech
description: "Spark performance is shuffle. This post takes it apart — why it's expensive, how it cuts a job into stages, and four moves that genuinely shuffle less: filter and select early to shrink the data, broadcast the small side of a join, get the partition count right, and know when AQE and cache actually help."
tags:
  - spark
  - data-engineering
  - performance
series: "Spark — Learning Notes"
seriesOrder: 3
comments: true
draft: false
translationOf: spark-shuffle
---
[[spark-intro|Part one]] and [[spark-dataframe|part two]] both ended on the same line: **Spark performance is shuffle**. This post takes it apart — why shuffle is expensive, how it cuts a job into stages, and four moves that genuinely shuffle less and run faster.

## Why shuffle is so expensive

Wide transformations like `groupBy`, `join` and `distinct` need the rows for one key gathered together. But those rows start out scattered across different partitions on different executors, so Spark has to **write the data to disk → move it over the network to other nodes → read it back and regroup it**. Disk plus network plus serialization: every one of those is orders of magnitude slower than computing in memory.

Shuffle also cuts **stage boundaries**: Spark splits a job into stages at each shuffle, chaining narrow transformations together inside one stage (a pipeline) and starting a new stage whenever it hits a wide one.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 168" role="img" aria-label="Spark cuts a job into stages at each shuffle: read and filter run together in stage one, and the shuffle before groupBy starts stage two." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="sh1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="12" y="50" width="212" height="74" rx="8" fill="none" stroke="#3a4154" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="118" y="44" fill="#9aa4b2" font-size="11" text-anchor="middle">Stage 1</text>
    <rect x="26" y="68" width="86" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="69" y="91" fill="#e6e6e6" font-size="12" text-anchor="middle">read</text>
    <rect x="124" y="68" width="88" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="168" y="91" fill="#e6e6e6" font-size="12" text-anchor="middle">filter</text>
    <line x1="112" y1="87" x2="124" y2="87" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#sh1)"/>
    <line x1="240" y1="34" x2="240" y2="130" stroke="#4f6df5" stroke-width="1.5" stroke-dasharray="4 4"/>
    <text x="240" y="26" fill="#4f6df5" font-size="11" text-anchor="middle">shuffle</text>
    <line x1="212" y1="87" x2="284" y2="87" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#sh1)"/>
    <rect x="276" y="50" width="272" height="74" rx="8" fill="none" stroke="#3a4154" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="412" y="44" fill="#9aa4b2" font-size="11" text-anchor="middle">Stage 2</text>
    <rect x="290" y="68" width="104" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="342" y="91" fill="#e6e6e6" font-size="12" text-anchor="middle">groupBy</text>
    <rect x="406" y="68" width="128" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="470" y="91" fill="#e6e6e6" font-size="12" text-anchor="middle">write</text>
    <line x1="394" y1="87" x2="406" y2="87" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#sh1)"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The narrow steps (read/filter) chain inside one stage; hitting a wide one (groupBy) means a shuffle and a new stage</figcaption>
</figure>

So the first principle of tuning is simple: **don't shuffle if you can avoid it, and when you must, move less.** All four moves below circle that.

## 1. Filter and select early, so less data reaches the shuffle

The cheapest and most effective thing there is: cut the data down **before** the wide transformation. Half as much data into the shuffle is half the network and half the disk. Catalyst does some of this for you (filter pushdown), but writing the `filter` and selecting only the columns you need up front is both the clearest statement of intent and the safest bet.

## 2. Broadcast join: don't shuffle the big table to join a small one

The default join shuffles **both tables** by key. But when one side is a small dimension table there's no need for that — **copy the small table whole (broadcast it) to every executor**, and each partition of the big table joins where it already is, with the big table never moving.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 212" role="img" aria-label="A shuffle join redistributes both tables over the network, while a broadcast join copies only the small table so the big one is joined in place." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="sh2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="12" y="30" fill="#9aa4b2" font-size="11" text-anchor="start">shuffle join</text>
    <rect x="16" y="40" width="70" height="26" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="51" y="58" fill="#e6e6e6" font-size="11" text-anchor="middle">big</text>
    <rect x="16" y="72" width="70" height="26" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="51" y="90" fill="#e6e6e6" font-size="11" text-anchor="middle">small</text>
    <line x1="86" y1="53" x2="156" y2="62" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sh2)"/>
    <line x1="86" y1="85" x2="156" y2="76" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sh2)"/>
    <rect x="158" y="46" width="150" height="46" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="233" y="65" fill="#e6e6e6" font-size="11" text-anchor="middle">shuffle</text><text x="233" y="80" fill="#9aa4b2" font-size="9" text-anchor="middle">both repartitioned by key</text>
    <line x1="308" y1="69" x2="344" y2="69" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sh2)"/>
    <rect x="346" y="52" width="70" height="34" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="381" y="73" fill="#e6e6e6" font-size="11" text-anchor="middle">join</text>
    <text x="428" y="73" fill="#9aa4b2" font-size="10" text-anchor="start">big moves → slow</text>
    <text x="12" y="132" fill="#9aa4b2" font-size="11" text-anchor="start">broadcast join</text>
    <rect x="16" y="142" width="70" height="26" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="51" y="160" fill="#e6e6e6" font-size="11" text-anchor="middle">small</text>
    <line x1="86" y1="155" x2="186" y2="155" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sh2)"/>
    <text x="136" y="148" fill="#9aa4b2" font-size="9" text-anchor="middle">broadcast copy</text>
    <rect x="188" y="132" width="244" height="52" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="310" y="153" fill="#e6e6e6" font-size="11" text-anchor="middle">each executor: big partition + small copy</text><text x="310" y="170" fill="#9aa4b2" font-size="9.5" text-anchor="middle">joined in place, big table stays</text>
    <text x="452" y="162" fill="#9aa4b2" font-size="10" text-anchor="start">fast</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Shuffle join: both tables are redistributed over the network; broadcast join: only the small table is copied, and the big one is joined in place</figcaption>
</figure>

```python
from pyspark.sql.functions import broadcast

big = spark.read.parquet("orders.parquet")      # big
dim = spark.read.parquet("customers.parquet")   # small dimension table

joined = big.join(broadcast(dim), on="customer_id", how="left")
```

Just don't let the small side get too big: Spark has a `spark.sql.autoBroadcastJoinThreshold` (about 10MB by default) that broadcasts small enough tables on its own, and manually `broadcast()`-ing an oversized one will blow out the driver's or executors' memory.

## 3. Partition count: `spark.sql.shuffle.partitions`

How many partitions should the data be cut into after a shuffle? The default is **200**. Too many → each partition is so small that scheduling overhead swamps the actual work; too few → each partition is too big for memory and spills to disk. The rule of thumb is to land each partition in the **one-to-two-hundred MB** range.

```python
spark.conf.set("spark.sql.shuffle.partitions", 64)   # scale it to your data; don't cling to 200
```

## 4. AQE and cache

**AQE (adaptive query execution)** is on by default in Spark 3, and it adjusts the shuffle partition count **at run time** from the actual data volume, coalesces partitions that came out too small, and even handles a skewed join. Trust it first, and only reach for manual tuning when it genuinely isn't enough:

```python
spark.conf.set("spark.sql.adaptive.enabled", True)   # already on by default in Spark 3
```

**cache / persist**: as [[spark-intro|part one]] noted, under lazy evaluation calling several actions on the same pipeline **recomputes it from scratch**. If an intermediate result is used many times, cache it:

```python
paid = df.filter(F.col("status") == "paid").cache()
paid.count()                 # first time: actually computes, and stores it in memory
paid.groupBy("month").count()  # reused after that: served from cache, not recomputed
paid.unpersist()             # release it when you're done
```

But cache cuts both ways: **don't cache something you use once** — it occupies memory for nothing and can push out data that deserved to stay.

## Reflection

### Think "shuffle less" before you think "tune a parameter"

I've watched plenty of people meet a slow Spark job and immediately start spinning `shuffle.partitions` and adding memory. But nine performance problems in ten come from too much shuffle or too big a shuffle, not from a badly set parameter. My order is fixed: can I **filter/select the data smaller**, can I **broadcast one of these joins away**, can I drop a `groupBy` — push the *volume* of shuffle down, and the payoff dwarfs haggling over settings. Parameters are the last fine adjustment, not the first move.

### Broadcast join is the highest-value single trick

"Big fact table joined to a small dimension table" is a pattern you meet constantly in practice, and a broadcast solves nearly all of them. One `broadcast(dim)` and the entire shuffle of the big table goes away — the single highest-return move I learned while tuning Spark. The one thing to remember is to keep an eye on the small side's size, and not broadcast a table that isn't actually small and blow up memory.

### Don't optimize early — let the Spark UI find the bottleneck

Same attitude I take to [[airflow-intro|Airflow]] and to any piece of infrastructure: **[[pain-before-power|confirm the pain first]], then act.** Get the logic right, run it once, open the Spark UI, see which stage is slowest and which shuffle reads and writes the most, and go after that one — rather than adjusting things everywhere on a hunch. Since AQE arrived, a lot of what used to need manual tuning is handled automatically; rather than wrestling with it, spend the effort on the more upstream question of whether this shuffle needs to exist at all.
