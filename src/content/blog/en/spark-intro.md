---
title: "What Is Apache Spark? Distributed Data Processing in One Post"
date: 2026-06-14
category: tech
description: "Spark takes data too big for one machine to hold or finish crunching, cuts it into pieces, and computes across a whole cluster in parallel. But the point isn't that Spark is stronger — it's scale. While the data still fits on one machine, pandas or DuckDB are faster and simpler; only once you genuinely exceed a single machine does the price of going distributed start to pay off."
tags:
 - spark
 - data-engineering
 - pyspark
series: "Spark — Learning Notes"
seriesOrder: 1
comments: true
draft: false
translationOf: spark-intro
---
## What Spark is

In one sentence: **Apache Spark is an engine that takes data too big for one machine to hold or finish crunching, cuts it into many pieces, and computes them in parallel across a whole cluster**. It came out of UC Berkeley in 2009 and became an Apache project in 2014; its headline feature is **computing with the data held in memory**, which makes it far faster than the older Hadoop MapReduce for work that reads the same data over and over (report aggregation, machine-learning iterations).

You write Python / SQL / Scala that looks like you're manipulating one big table, and behind the scenes Spark breaks it into tasks, spreads them over dozens of machines, and gathers the results back.

### How is this different from pandas or a single-machine program?

| Dimension | pandas (single machine) | Spark (distributed) |
|---|---|---|
| Data size | bounded by one machine's memory | scales out across a cluster |
| Execution | runs immediately | **lazy**: builds a plan, runs on an action |
| Parallelism | one machine (several cores at best) | many machines × many cores, parallel by **partition** |
| Failure recovery | yours to handle | built in (a failed task is recomputed) |
| Fits | a few MB to a few GB | tens of GB to TB/PB |

The point isn't that Spark is stronger, it's **scale**: while the data fits on one machine, pandas / DuckDB / SQL are faster and simpler; only when the data genuinely exceeds a single machine, or you need to scale out, do Spark's distributed mechanics start to pay off.

### Core concepts

| Concept | What it is |
|---|---|
| **Driver** | where your main program runs — creates the `SparkSession`, compiles your code into an execution plan (a DAG), schedules tasks |
| **Executor** | the processes scattered across cluster nodes that do the actual work, holding data **partitions** and running tasks |
| **Cluster manager** | allocates resources and decides where executors start (YARN / Kubernetes / standalone) |
| **RDD** | the lowest layer, a "resilient distributed dataset" — fault-tolerant, recomputable |
| **DataFrame** | a distributed table with a schema (the mainstay of PySpark, and what you want); the Catalyst optimizer sits behind it |
| **Partition** | the small chunks the data is cut into — the unit of parallel computation |
| **Transformation** | `filter`, `select`, `groupBy`, `join`… **lazy**, they only build the plan |
| **Action** | `count`, `show`, `collect`, `write`… they **trigger** the whole plan to actually run |
| **Shuffle** | `groupBy`, `join` and anything else that moves data across partitions — the most expensive operation there is |

### Architecture: what moves when your program runs

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 540 230" role="img" aria-label="Spark's architecture: the driver requests resources through the cluster manager and schedules work onto several executors." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <defs><marker id="sp" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <line x1="186" y1="46" x2="336" y2="46" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#sp)"/>
 <line x1="96" y1="70" x2="92" y2="158" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#sp)"/>
 <line x1="120" y1="70" x2="262" y2="158" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#sp)"/>
 <line x1="140" y1="70" x2="432" y2="158" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#sp)"/>
 <rect x="28" y="24" width="158" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="107" y="44" fill="#e6e6e6" font-size="13" text-anchor="middle">Driver</text>
 <text x="107" y="60" fill="#9aa4b2" font-size="10" text-anchor="middle">SparkSession · DAG</text>
 <rect x="338" y="24" width="174" height="46" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
 <text x="425" y="44" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Cluster Manager</text>
 <text x="425" y="60" fill="#9aa4b2" font-size="10" text-anchor="middle">YARN / K8s</text>
 <rect x="30" y="160" width="124" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="92" y="181" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Executor</text>
 <text x="92" y="197" fill="#9aa4b2" font-size="10" text-anchor="middle">tasks + partitions</text>
 <rect x="200" y="160" width="124" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="262" y="181" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Executor</text>
 <text x="262" y="197" fill="#9aa4b2" font-size="10" text-anchor="middle">tasks + partitions</text>
 <rect x="370" y="160" width="124" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="432" y="181" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Executor</text>
 <text x="432" y="197" fill="#9aa4b2" font-size="10" text-anchor="middle">tasks + partitions</text>
 <text x="261" y="38" fill="#9aa4b2" font-size="9.5" text-anchor="middle">request resources</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The driver breaks the plan into tasks, gets resources through the cluster manager, and hands them to the executors to run in parallel, one partition at a time</figcaption>
</figure>

### Lazy evaluation: transformation vs action

Spark's most important mental model: **the chain of transformations you write doesn't run as you write it**. It only accumulates a plan — a DAG of "how this should be computed" — and not until you call an **action** does Spark optimize the whole plan and throw it at the cluster.

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 540 150" role="img" aria-label="Spark's lazy evaluation: read, filter and groupBy are all transformations that only build a plan, and the count action is what actually runs it." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <defs><marker id="sl" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <line x1="116" y1="52" x2="148" y2="52" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#sl)"/>
 <line x1="248" y1="52" x2="280" y2="52" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#sl)"/>
 <line x1="394" y1="52" x2="426" y2="52" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#sl)"/>
 <rect x="18" y="30" width="98" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="67" y="57" fill="#e6e6e6" font-size="13" text-anchor="middle">read</text>
 <rect x="150" y="30" width="98" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="199" y="57" fill="#e6e6e6" font-size="13" text-anchor="middle">filter</text>
 <rect x="282" y="30" width="112" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="338" y="57" fill="#e6e6e6" font-size="13" text-anchor="middle">groupBy</text>
 <rect x="428" y="30" width="104" height="44" rx="8" fill="#4f6df5" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="480" y="57" fill="#ffffff" font-size="13" text-anchor="middle">count</text>
 <text x="199" y="96" fill="#9aa4b2" font-size="10" text-anchor="middle">transformation (lazy)</text>
 <text x="338" y="110" fill="#9aa4b2" font-size="10" text-anchor="middle">transformation</text>
 <text x="338" y="22" fill="#9aa4b2" font-size="9.5" text-anchor="middle">shuffle</text>
 <text x="480" y="96" fill="#4f6df5" font-size="10" text-anchor="middle">action triggers it</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">read → filter → groupBy only build the plan; calling count (an action) is what actually runs it; groupBy needs a shuffle in between (moving data across partitions)</figcaption>
</figure>

## A PySpark example

### DataFrame: like working on one big table

```python
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

spark = SparkSession.builder.appName("sales").getOrCreate()

# read it in (swap for parquet / jdbc / kafka…)
df = spark.read.csv("orders.csv", header=True, inferSchema=True)

# a chain of transformations — all lazy, just accumulating a "plan"
daily = (
 df.filter(F.col("status") == "paid")
 .groupBy("date")
 .agg(F.sum("amount").alias("revenue"))
 .orderBy("date")
)

# an action — only this line fires the whole pipeline off on the cluster
daily.show()
```

`filter`, `groupBy`, `agg` and `orderBy` are all transformations — when execution reaches those lines, **nothing has been computed yet**; not until the `daily.show()` action does Spark hand the whole plan to Catalyst to optimize and then spread it over the executors.

### RDD: seeing the line between transformation and action

```python
rdd = spark.sparkContext.parallelize([1, 2, 3, 4, 5])

# transformations (lazy, just stacking up a plan)
doubled = rdd.map(lambda x: x * 2).filter(lambda x: x > 4)

# an action (this is what fires, and pulls the result back to the driver)
print(doubled.collect()) # [6, 8, 10]
```

`map` and `filter` return "a new RDD plan", not data; `collect()` is what actually executes, and it **pulls the result back to the driver** (which is why `collect()` is dangerous on big data — you can blow up one driver's memory with the whole cluster's worth of rows).

## Reflection

### Most people's "big data" isn't that big

The most common misuse I see is reaching for Spark at a few hundred MB or a few GB. Distributed isn't free: JVM startup, cluster scheduling, serialization, shuffling over the network — while the data still fits on one machine, those fixed costs dwarf the time they save. **If it fits on one machine, use pandas / Polars / DuckDB / SQL**: faster, and far easier to debug. Spark only starts paying off once the data genuinely exceeds a single machine, or you need to scale throughput out. Confirm the premise — the data really is too big for one box — before you shoulder that complexity. Same attitude I take to Airflow, and to any piece of infrastructure.

### The cost you're actually fighting is shuffle

Four fifths of performance instinct in Spark comes down to one thing: **shuffle less**. `groupBy`, `join`, `distinct` and the other wide dependencies drag data between nodes, and they're the slowest part of any job. The moves that actually work in practice all circle it: `filter` early so there's less data to compute on, use a broadcast join for a small table to avoid a big shuffle, and watch that your partition count is neither too high nor too low. Thinking shuffle through beats memorizing a pile of APIs.

### Lazy evaluation cuts both ways

Laziness is what lets Spark optimize globally, and it drops beginners into two holes: first, **you can't tell which line is actually running when you debug** (the answer is the action); second, **calling several actions on the same pipeline** (a `count()` then a `show()`, say) recomputes it from scratch every time — that's when you want `cache()` / `persist()` to hold the intermediate result. Understanding the line between plan and execution is the precondition for writing Spark correctly.

### Let someone else run it

Same as Airflow: running your own Spark cluster — resource scheduling, versions, tuning — is expensive. For most teams a managed platform (Databricks / EMR / Glue) works out better, and the energy goes into the data logic instead of babysitting a cluster. A tool is there to multiply what the team ships, not to hand you another operations debt.
