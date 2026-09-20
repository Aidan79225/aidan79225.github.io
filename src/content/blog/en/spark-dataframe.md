---
title: "Spark DataFrames in Practice: Read, Transform, Write and Spark SQL"
date: 2026-06-21
category: tech
description: "Nine tenths of day-to-day work uses DataFrames rather than RDDs, because a DataFrame is declarative and gets optimized while an RDD is imperative and leaves performance to you. This post transforms a dataset hands-on: read it in (give it a schema), clean, aggregate, write the same thing in Spark SQL, and use partitionBy to make a re-run idempotent."
tags:
  - spark
  - data-engineering
  - pyspark
series: "Spark — Learning Notes"
seriesOrder: 2
comments: true
draft: false
translationOf: spark-dataframe
---
[[spark-intro|Part one]] covered Spark's concepts: driver and executors, partitions, lazy evaluation, shuffle. This post actually transforms a dataset with a **DataFrame** — read it in, clean it, aggregate it, write it out — and looks at how **Spark SQL** and the DataFrame API arrive at the same place by different routes.

## Why it's nearly always a DataFrame and not an RDD

[[spark-intro|Part one]] mentioned that the RDD is the lowest-level abstraction. But nine tenths of day-to-day work uses a **DataFrame**, because it has two things an RDD doesn't:

- **A schema (columns and types)**: it's a table with structure, and reading it feels like reading SQL.
- **The Catalyst optimizer**: you write *what you want*, and Catalyst works out *how to do it fastest* (reordering, pushing filters down…). An RDD does exactly what you told it to, in the order you said, with nobody optimizing on your behalf.

Put differently: **a DataFrame is declarative and optimized; an RDD is imperative and leaves performance to you.** Unless you need very fine-grained control, the DataFrame is both faster and easier to read.

## Reading: give it a schema

```python
from pyspark.sql import SparkSession, functions as F

spark = SparkSession.builder.appName("orders").getOrCreate()

# parquet carries its own schema and types — faster and more accurate than csv inferSchema
df = spark.read.parquet("orders.parquet")
df.printSchema()   # look at the columns and types
```

CSV works too (`spark.read.csv(..., header=True, inferSchema=True)`), but `inferSchema` costs an extra pass over the data and can still guess a type wrong; for a real pipeline I use parquet, or state the schema explicitly.

## Common transformations: like working on a table

```python
monthly = (
    df.filter(F.col("status") == "paid")                         # filter (narrow)
      .withColumn("month", F.date_format("order_date", "yyyy-MM"))  # add a column
      .groupBy("month")                                          # group (wide, needs a shuffle)
      .agg(
          F.sum("amount").alias("revenue"),
          F.countDistinct("customer_id").alias("buyers"),
      )
      .orderBy("month")
)
monthly.show()
```

`select` / `withColumn` / `filter` are **narrow**: each partition does its own work with no data crossing nodes, so they're nearly free. `groupBy` / `join` are **wide**: pulling one group's rows together means a shuffle — the "most expensive operation there is" from [[spark-intro|part one]].

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 520 210" role="img" aria-label="A narrow transformation maps each partition to itself with no data movement, while a wide transformation redistributes rows across partitions through a shuffle." style="width:100%;max-width:580px;height:auto;margin:0 auto;">
    <defs><marker id="d2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="10" y="52" fill="#9aa4b2" font-size="11" text-anchor="start">narrow</text>
    <text x="10" y="66" fill="#9aa4b2" font-size="9" text-anchor="start">filter/select</text>
    <line x1="142" y1="42" x2="142" y2="66" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#d2)"/>
    <line x1="247" y1="42" x2="247" y2="66" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#d2)"/>
    <line x1="352" y1="42" x2="352" y2="66" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#d2)"/>
    <rect x="112" y="20" width="60" height="22" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="142" y="35" fill="#e6e6e6" font-size="10" text-anchor="middle">part 1</text>
    <rect x="217" y="20" width="60" height="22" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="247" y="35" fill="#e6e6e6" font-size="10" text-anchor="middle">part 2</text>
    <rect x="322" y="20" width="60" height="22" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="352" y="35" fill="#e6e6e6" font-size="10" text-anchor="middle">part 3</text>
    <rect x="112" y="68" width="60" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="142" y="83" fill="#e6e6e6" font-size="10" text-anchor="middle">part 1</text>
    <rect x="217" y="68" width="60" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="247" y="83" fill="#e6e6e6" font-size="10" text-anchor="middle">part 2</text>
    <rect x="322" y="68" width="60" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="352" y="83" fill="#e6e6e6" font-size="10" text-anchor="middle">part 3</text>
    <text x="440" y="58" fill="#9aa4b2" font-size="9.5" text-anchor="middle">1-to-1, no move</text>
    <text x="10" y="150" fill="#9aa4b2" font-size="11" text-anchor="start">wide</text>
    <text x="10" y="164" fill="#9aa4b2" font-size="9" text-anchor="start">groupBy/join</text>
    <rect x="112" y="118" width="60" height="22" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="142" y="133" fill="#e6e6e6" font-size="10" text-anchor="middle">part 1</text>
    <rect x="217" y="118" width="60" height="22" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="247" y="133" fill="#e6e6e6" font-size="10" text-anchor="middle">part 2</text>
    <rect x="322" y="118" width="60" height="22" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="352" y="133" fill="#e6e6e6" font-size="10" text-anchor="middle">part 3</text>
    <rect x="92" y="150" width="310" height="20" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="247" y="164" fill="#e6e6e6" font-size="10.5" text-anchor="middle">shuffle: redistributed across partitions</text>
    <rect x="112" y="180" width="60" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="142" y="195" fill="#e6e6e6" font-size="10" text-anchor="middle">out 1</text>
    <rect x="217" y="180" width="60" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="247" y="195" fill="#e6e6e6" font-size="10" text-anchor="middle">out 2</text>
    <rect x="322" y="180" width="60" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="352" y="195" fill="#e6e6e6" font-size="10" text-anchor="middle">out 3</text>
    <line x1="142" y1="140" x2="200" y2="150" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="247" y1="140" x2="247" y2="150" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="352" y1="140" x2="294" y2="150" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="200" y1="170" x2="142" y2="180" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#d2)"/>
    <line x1="247" y1="170" x2="247" y2="180" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#d2)"/>
    <line x1="294" y1="170" x2="352" y2="180" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#d2)"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">narrow: each partition works alone, nothing moves; wide: a shuffle redistributes the rows across partitions</figcaption>
</figure>

## Spark SQL: the same data, written as SQL

Register the DataFrame as a temporary view and you can write SQL against it — and the result is **exactly equivalent** to the DataFrame version above:

```python
df.createOrReplaceTempView("orders")

monthly = spark.sql("""
    select date_format(order_date, 'yyyy-MM') as month,
           sum(amount)                        as revenue,
           count(distinct customer_id)        as buyers
    from orders
    where status = 'paid'
    group by 1
    order by 1
""")
```

Why are the two equivalent? Because **Catalyst** compiles both into the same physical execution plan:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 180" role="img" aria-label="Both the DataFrame API and Spark SQL are compiled by Catalyst into the same execution plan, which is then spread over the executors." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="d1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="166" y1="52" x2="208" y2="78" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#d1)"/>
    <line x1="166" y1="126" x2="208" y2="100" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#d1)"/>
    <line x1="350" y1="89" x2="384" y2="89" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#d1)"/>
    <rect x="16" y="30" width="150" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="91" y="51" fill="#e6e6e6" font-size="12" text-anchor="middle">DataFrame API</text>
    <text x="91" y="66" fill="#9aa4b2" font-size="9.5" text-anchor="middle">filter / groupBy</text>
    <rect x="16" y="104" width="150" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="91" y="125" fill="#e6e6e6" font-size="12" text-anchor="middle">Spark SQL</text>
    <text x="91" y="140" fill="#9aa4b2" font-size="9.5" text-anchor="middle">SELECT …</text>
    <rect x="210" y="65" width="140" height="48" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="2"/>
    <text x="280" y="86" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Catalyst</text>
    <text x="280" y="102" fill="#9aa4b2" font-size="9.5" text-anchor="middle">optimizer</text>
    <rect x="386" y="65" width="140" height="48" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="456" y="86" fill="#e6e6e6" font-size="12" text-anchor="middle">one execution plan</text>
    <text x="456" y="102" fill="#9aa4b2" font-size="9.5" text-anchor="middle">spread over executors</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The DataFrame API and Spark SQL get to the same place by different routes — Catalyst compiles both into the same physical plan</figcaption>
</figure>

## Writing out: partitionBy makes a re-run idempotent

```python
monthly.write \
    .mode("overwrite") \
    .partitionBy("month") \
    .parquet("out/monthly")
```

`partitionBy("month")` splits the output into a folder per month; paired with `mode("overwrite")`, re-running one month overwrites only that month's partition. Which lands exactly on the **idempotence** from [[airflow-scheduling|the Airflow scheduling post]]: recompute the same slice of data and the result replaces the old one instead of doubling it. Spark does the computing, Airflow does the scheduling, and only when both sides hold idempotence can the pipeline be backfilled and re-run at all.

## Reflection

### Don't pick a side between DataFrames and SQL — pick readability

I've never understood the dogma of "always use the DataFrame API" or "always write SQL". They compile to the same plan and perform identically, so there's exactly one criterion left: **which one makes this piece of logic easier to read and maintain**. Complex multi-step transformations, something I'll split into reusable functions — DataFrame API. A plain aggregation query — SQL is shorter and clearer, and everyone on the team can read SQL. Mix them where mixing helps; don't impose a rule on yourself.

### Performance instinct still comes back to shuffle, four times out of five

After writing a pile of DataFrame operations, what actually drags is almost always a wide transformation. My habit is to ask three things first: can I **filter the data down before** the groupBy/join? Is the other side of the join a small table I can **broadcast** to skip the shuffle? Is the output partition count sensible? Getting those right pays far better than agonising over how to write a select. Same conclusion as [[spark-intro|part one]]: **shuffling less is what Spark performance actually is.**

### The point of declarative is handing optimization to something smarter than you

The most worthwhile thing to absorb about DataFrames is "I describe what I want, Catalyst decides how". That's a different posture from hand-carving every step as an RDD and owning the ordering yourself. Most of the time, trusting the optimizer and spending your attention on "is the logic right, is there too much shuffle" beats line-by-line tuning — and it's where modern data tooling is heading in general: **free people from implementation detail so they can work on intent.**
