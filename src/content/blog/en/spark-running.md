---
title: "Getting Spark Running: From Your Laptop to a Cluster and a Managed Platform"
date: 2026-06-23
category: tech
description: "The same code running on your laptop and running on a cluster of dozens of machines — what's actually different? Get the three roles straight first (driver, executor, cluster manager), then look at where spark-submit's client and cluster modes put the driver — and why you probably won't build a cluster yourself."
tags:
  - spark
  - data-engineering
  - deployment
series: "Spark — Learning Notes"
seriesOrder: 4
comments: true
draft: false
translationOf: spark-running
---
The first three posts were about **how to write Spark and how to make it fast** ([[spark-intro|what it is]], [[spark-dataframe|DataFrames in practice]], [[spark-shuffle|shuffle and tuning]]). But what actually happens between running that same code on your laptop and running it on a cluster of dozens of machines? This post is about **runtime and deployment** — from a single local machine through `spark-submit` and cluster mode, to the managed platform you'll most likely really use.

## Get the execution architecture straight: driver, executor, cluster manager

Wherever it runs, a Spark application is always these three roles:

- **Driver**: runs your `main` program, compiles the transformations into a DAG, cuts stages and tasks, and then **schedules** them. It's the brain, and it does none of the heavy lifting.
- **Executor**: the worker processes that do the real work — running tasks and holding [[spark-shuffle|cached]] data in their own memory. One application has many executors running in parallel.
- **Cluster manager**: the landlord of resources — the driver asks it for CPU and memory, and it starts executors on machines.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 520 232" role="img" aria-label="Spark's execution architecture: the driver asks the cluster manager for resources, the cluster manager launches the executors, and the driver then sends tasks straight to them." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rn1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="186" y="12" width="148" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="260" y="33" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Driver</text>
    <text x="260" y="48" fill="#9aa4b2" font-size="9.5" text-anchor="middle">schedules tasks</text>
    <line x1="260" y1="56" x2="260" y2="86" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#rn1)"/>
    <text x="334" y="75" fill="#9aa4b2" font-size="9.5" text-anchor="middle">① ask for resources</text>
    <rect x="176" y="88" width="168" height="40" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.5" stroke-dasharray="4 3"/>
    <text x="260" y="113" fill="#e6e6e6" font-size="12" text-anchor="middle">Cluster Manager</text>
    <line x1="200" y1="128" x2="92" y2="170" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#rn1)"/>
    <line x1="260" y1="128" x2="260" y2="170" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#rn1)"/>
    <line x1="320" y1="128" x2="428" y2="170" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#rn1)"/>
    <text x="122" y="140" fill="#9aa4b2" font-size="9.5" text-anchor="middle">② launch</text>
    <rect x="24" y="172" width="130" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="89" y="193" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Executor</text>
    <text x="89" y="208" fill="#9aa4b2" font-size="9" text-anchor="middle">task + cache</text>
    <rect x="195" y="172" width="130" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="260" y="193" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Executor</text>
    <text x="260" y="208" fill="#9aa4b2" font-size="9" text-anchor="middle">task + cache</text>
    <rect x="366" y="172" width="130" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="431" y="193" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Executor</text>
    <text x="431" y="208" fill="#9aa4b2" font-size="9" text-anchor="middle">task + cache</text>
    <path d="M186 40 C 120 70, 70 120, 80 168" fill="none" stroke="#4f6df5" stroke-width="1.3" stroke-dasharray="3 3" marker-end="url(#rn1)"/>
    <text x="40" y="110" fill="#4f6df5" font-size="9.5" text-anchor="middle">③ send tasks</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The driver asks the cluster manager for resources and the cluster manager launches the executors; after that the driver sends tasks straight to the executors and collects the results</figcaption>
</figure>

**Changing deployment target only changes the cluster manager and where the driver sits — your transformation code barely moves.** That's the spine running through everything below.

## Local: one machine is enough

The simplest starting point: `pip install pyspark` and set master to `local[*]`. There's no real cluster at all here — driver and executors are crammed into **one JVM**, simulating parallelism with N local threads.

```python
from pyspark.sql import SparkSession

spark = (SparkSession.builder
         .master("local[*]")     # * = use every CPU core
         .appName("dev")
         .getOrCreate())
```

It suits development, testing and small data. **Don't write it off** — for a few GB or less, writing logic and debugging it, local mode is entirely sufficient and saves you a cluster's worth of trouble. You move to a cluster because the data is too big for one machine to hold or finish, not because you want practice with Spark.

## Submitting to a cluster: `spark-submit`

When the data really does need a cluster, the single entry point for submitting is `spark-submit`: you write the program as a `.py` and throw it out along with its resource requirements.

```bash
spark-submit \
  --master yarn \
  --deploy-mode cluster \
  --num-executors 10 \
  --executor-cores 4 \
  --executor-memory 8g \
  jobs/daily_etl.py
```

The flags you'll use most: `--master` (which cluster manager takes it), `--deploy-mode` (where the driver sits — next section), and the `--num-executors` / `--executor-cores` / `--executor-memory` trio that decides how much you ask the cluster for. **Those numbers set your parallelism and your bill directly**, which makes them the knobs most worth understanding after the performance ones.

## `client` vs `cluster`: where the driver actually runs

`--deploy-mode` is the setting people mix up most in practice, and the easiest one to get burned by. The difference is one sentence: **does the driver run on the machine you submitted from, or inside the cluster?**

| | `client` mode | `cluster` mode |
|---|---|---|
| Driver location | the machine you submitted from (laptop / edge node) | some node inside the cluster |
| Logs | streamed straight back to your terminal | you fetch them from the cluster / platform |
| Close the terminal | **the job dies with it** | unaffected, keeps running |
| Fits | interactive work, development, `spark-shell` | scheduled Production jobs |

The classic beginner disaster is a job that runs beautifully in local `client` mode and then, moved to Production behind a scheduler, either dies with its session or has logs nobody can find. **Production jobs should nearly always use `cluster` mode** — let the driver live in the cluster instead of depending on a machine that gets shut down. Production triggering usually goes to a scheduler like [[airflow-scheduling|Airflow]], and what a scheduler wants is exactly `cluster` mode's "submit it and don't hang around".

## The cluster managers you'll meet

Whatever follows `--master`. Three common ones:

| Cluster manager | Where it fits |
|---|---|
| **Standalone** | Spark's own simple manager — the quickest start for a small or self-hosted cluster |
| **YARN** | tied to the Hadoop ecosystem, the mainstream in traditional enterprise big-data platforms |
| **Kubernetes** | the cloud-native mainstream, with Spark running as pods and elastic scaling made easy |

(There was also Mesos in the early years; it has faded.)  Which one you're on usually isn't your decision — it follows the infrastructure the company already has.

## Managed platforms: you probably won't build a cluster yourself

All of the above sounds hard, and frankly: **most teams shouldn't be standing up a Spark cluster from scratch at all**. Managed platforms in the cloud handle starting and stopping the cluster, autoscaling and version maintenance, and you just throw the job or the notebook at them.

| Platform | In a line |
|---|---|
| **Databricks** | the managed platform from Spark's own creators — notebooks, automatic clusters and a lakehouse in one |
| **AWS EMR** | managed Hadoop/Spark clusters on AWS, integrated with S3 and IAM |
| **AWS Glue** | serverless Spark — no cluster to manage at all, good for pure ETL |
| **GCP Dataproc** | managed Spark/Hadoop on GCP, fast to start and billed by the second |

The trade-off between them comes down to **how much you want to manage**: from EMR (you can still see the cluster) to Glue (the cluster is abstracted away entirely). What doesn't change is that everything you learned in the first three posts about DataFrames and shuffle applies identically on every one of them.

## Reflection

### Spark's most beautiful abstraction is decoupling the code from where it runs

Writing this post made me surer of one thing: Spark's genuinely valuable design is that **the same transformation logic goes from local `local[*]` to a ten-machine YARN cluster with essentially not a character changed** — all that moves is `--master` and `--deploy-mode`. That lets me get the logic right on a laptop with small data, test it, and then throw it at a cluster untouched to scale up. The precondition for enjoying that is never hard-coding anything environment-bound into the program (paths, parallelism, resources) — leave all of it to the submit-time parameters.

### `deploy-mode` is the trap I warn people about most

"Works locally, explodes in Production" traces back to `client` vs `cluster` eight times out of ten — the driver in the wrong place, so the job dies with the terminal or the logs vanish into thin air. My rule is simple: **`client` for interactive debugging, `cluster` for anything scheduled.** Same thinking as the idempotence and re-runnability in [[airflow-scheduling|the Airflow post]] — a Production job cannot depend on one particular person's machine happening to be on.

### Don't build a cluster just to be using Spark

Exactly the attitude I take to [[airflow-intro|Airflow]] and to any piece of infrastructure: **[[pain-before-power|confirm the pain before you bring out the heavy weapons]].** While the data is still a few GB, local PySpark — or even [[dbt-intro|dbt]] plus a warehouse — handles it, and forcing a cluster into existence just buys you operations work. And when you do hit the "one machine can't hold it or finish it" wall, reach for a managed platform first — save the energy you'd spend building clusters, tuning YARN and chasing OOMs, and spend it on getting the data logic right. Running your own cluster is a means, not an achievement.
