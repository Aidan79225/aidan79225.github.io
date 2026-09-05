---
title: "Airflow + Spark on K8s: How Different Nodes Run Different Pods"
date: 2026-06-30
category: tech
tags:
  - kubernetes
  - airflow
  - spark
  - data-engineering
series: "Kubernetes — Learning Notes"
seriesOrder: 8
comments: true
draft: false
translationOf: airflow-spark-on-k8s
---
[[airflow-intro|Airflow]] handles "**when, and in what order**" jobs run; [[spark-running|Spark]] handles "**getting the big data computed**". When both move onto Kubernetes, the most common confusion is: **what exactly is running, is each thing a pod, and which machine did it get thrown onto?** This post draws it out in two diagrams — how different nodes on K8s carry the various Airflow and Spark pods.

## Nail down three words first: Node, Pod, Scheduler

In the K8s world, remember three roles and everything else connects:

- **Node**: a real machine (on the cloud, usually a VM). It's a **relatively long-lived** hardware resource with fixed CPU and memory ceilings.
- **Pod**: K8s's smallest deployable unit, running one (or a few) containers. It's **disposable** — finishing, dying, being rescheduled are all normal.
- **Scheduler** (in the control plane): looks at how much each pod asks for (`requests`) and any stated preferences (affinity / nodeSelector), then decides **which node this pod goes into**.

In one line: **the Node is the house, the Pod is the tenant, the Scheduler is the agent.** Everything about Airflow and Spark on K8s is "who spawns which pods, and which node the Scheduler assigns them to".

## One diagram: who is a pod, and which node it lands on

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 450" role="img" aria-label="In a K8s cluster, the control plane scheduler places different pods on different nodes: Node 1 is the on-demand pool running Airflow's long-lived pods and the Metadata DB on a PersistentVolume; Node 2 and Node 3 are the spot pool running Spark driver and executor pods; executors then read from and write to the Business DB outside the cluster" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="kp1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker><marker id="kp2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#54b890"/></marker><marker id="kp3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto-start-reverse"><path d="M0,0 L0,6 L8,3 z" fill="#a679d6"/></marker></defs>
    <rect x="180" y="10" width="240" height="44" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4" stroke-dasharray="5 4"/>
    <text x="300" y="30" fill="#e6e6e6" font-size="12" text-anchor="middle">K8s Control Plane · Scheduler</text>
    <text x="300" y="45" fill="#9aa4b2" font-size="8.5" text-anchor="middle">places pods by resource request / affinity</text>
    <line x1="300" y1="54" x2="108" y2="98" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kp1)"/>
    <line x1="300" y1="54" x2="300" y2="98" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kp1)"/>
    <line x1="300" y1="54" x2="492" y2="98" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kp1)"/>
    <rect x="18" y="100" width="174" height="222" rx="10" fill="none" stroke="#3a4154" stroke-width="1.5"/>
    <rect x="213" y="100" width="174" height="222" rx="10" fill="none" stroke="#3a4154" stroke-width="1.5"/>
    <rect x="408" y="100" width="174" height="222" rx="10" fill="none" stroke="#3a4154" stroke-width="1.5"/>
    <text x="105" y="122" fill="#e6e6e6" font-size="12" text-anchor="middle">Node 1</text>
    <text x="105" y="137" fill="#9aa4b2" font-size="9" text-anchor="middle">on-demand pool (stable)</text>
    <text x="300" y="122" fill="#e6e6e6" font-size="12" text-anchor="middle">Node 2</text>
    <text x="300" y="137" fill="#9aa4b2" font-size="9" text-anchor="middle">spot pool</text>
    <text x="495" y="122" fill="#e6e6e6" font-size="12" text-anchor="middle">Node 3</text>
    <text x="495" y="137" fill="#9aa4b2" font-size="9" text-anchor="middle">spot pool</text>
    <rect x="33" y="150" width="144" height="32" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="105" y="170" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Airflow Scheduler</text>
    <rect x="33" y="190" width="144" height="32" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="105" y="210" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Airflow Webserver</text>
    <rect x="33" y="230" width="144" height="32" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="105" y="250" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Airflow Triggerer</text>
    <path d="M71 276 v26 a34 6 0 0 0 68 0 v-26" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><ellipse cx="105" cy="276" rx="34" ry="6" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="105" y="297" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Metadata DB</text><text x="105" y="316" fill="#9aa4b2" font-size="7.5" text-anchor="middle">PersistentVolume (stateful)</text>
    <rect x="228" y="150" width="144" height="32" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/><text x="300" y="170" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Spark Driver</text>
    <rect x="228" y="190" width="144" height="32" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="300" y="210" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Spark Executor</text>
    <rect x="423" y="150" width="144" height="32" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="495" y="170" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Spark Executor</text>
    <rect x="423" y="190" width="144" height="32" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="495" y="210" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Spark Executor</text>
    <rect x="423" y="230" width="144" height="32" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="495" y="250" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Spark Executor</text>
    <path d="M372 200 C 398 230, 400 175, 421 168" fill="none" stroke="#54b890" stroke-width="1.3" stroke-dasharray="3 3" marker-end="url(#kp2)"/>
    <text x="300" y="300" fill="#9aa4b2" font-size="8.5" text-anchor="middle">executors the Driver requests are spread across nodes by the Scheduler</text>
    <path d="M470 324 C 430 344, 384 348, 356 352" fill="none" stroke="#a679d6" stroke-width="1.4" marker-start="url(#kp3)" marker-end="url(#kp3)"/>
    <text x="300" y="340" fill="#9aa4b2" font-size="8.5" text-anchor="middle">executors read the source / write results back</text>
    <path d="M222 356 v30 a78 8 0 0 0 156 0 v-30" fill="#262b3a" stroke="#a679d6" stroke-width="1.5"/><ellipse cx="300" cy="356" rx="78" ry="8" fill="#262b3a" stroke="#a679d6" stroke-width="1.5"/><text x="300" y="375" fill="#e6e6e6" font-size="11" text-anchor="middle">Business DB</text><text x="300" y="390" fill="#9aa4b2" font-size="8" text-anchor="middle">outside the cluster · source / sink</text>
    <rect x="30" y="420" width="15" height="12" rx="2" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="50" y="430" fill="#9aa4b2" font-size="8.5" text-anchor="start">Airflow pod</text>
    <rect x="150" y="420" width="15" height="12" rx="2" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="170" y="430" fill="#9aa4b2" font-size="8.5" text-anchor="start">Spark Driver</text>
    <rect x="278" y="420" width="15" height="12" rx="2" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="298" y="430" fill="#9aa4b2" font-size="8.5" text-anchor="start">Spark Executor</text>
    <rect x="412" y="420" width="15" height="12" rx="2" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="432" y="430" fill="#9aa4b2" font-size="8.5" text-anchor="start">Metadata DB</text>
    <rect x="520" y="420" width="15" height="12" rx="2" fill="#262b3a" stroke="#a679d6" stroke-width="1.4"/><text x="540" y="430" fill="#9aa4b2" font-size="8.5" text-anchor="start">Business DB</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">One cluster: the Scheduler puts Airflow's long-lived pods (including the Metadata DB on a PersistentVolume) on stable on-demand nodes, and spreads the re-runnable Spark executors across cheap spot nodes; executors then read and write the real operational data in the Business DB outside the cluster</figcaption>
</figure>

This diagram is the mental model for the whole post: **the cluster is a pool of nodes, Airflow and Spark are just "applications that spawn pods", and what actually decides who runs on which machine is the Scheduler.** The next two sections look at which pods Airflow and Spark each spawn.

## Which pods Airflow has on K8s

Airflow's pods come in two lifespans: **long-lived core components**, and **disposable tasks**.

**Long-lived pods** (Node 1 in the diagram; they run and never stop):

- **Scheduler**: parses DAGs, decides which task should run now — Airflow's brain.
- **Webserver**: the UI.
- **Triggerer**: runs deferrable operators (waiting on external events without occupying a worker).
- **Metadata DB**: stores the state of every DAG / task, usually Postgres. It's the only **stateful** role in all of Airflow — on K8s it runs as a StatefulSet with a **PersistentVolume** (the cylinder on Node 1), so the data survives a reschedule or restart. In practice it's more common to **hook up a managed database** (RDS / Cloud SQL) and hand the "keep this DB healthy" responsibility to the cloud provider. It's the exact opposite extreme from the disposable Spark pods: **one must remember everything; a crowd can vanish at any moment.**

**Task pods** take the shape of your **executor** choice, the first decision to understand for Airflow on K8s:

| Approach | What one task is | Good for |
|---|---|---|
| **KubernetesExecutor** | The Scheduler starts a pod **per task**, deleted when done | Bursty task volume, wanting full isolation |
| **CeleryExecutor** | Tasks go to long-lived worker pods (a fixed group of workers) | Steady task volume, saving pod start-up latency |
| **KubernetesPodOperator** | You write explicitly in the DAG "this task starts a pod running some image" | Tasks that are themselves containerised programs |

The key difference: **KubernetesExecutor is "Airflow automatically wraps every task in a pod"; KubernetesPodOperator is "you actively tell Airflow to start a pod".** The former governs where a task runs, the latter what a task runs.

## Which pods Spark has on K8s

[[spark-running|The earlier Spark post]] covered that Spark is always the Driver + Executor + Cluster Manager triangle. Moved onto K8s, only one thing changes: **the Cluster Manager is K8s itself**, and Driver and Executors all become pods.

On submit, `--master` points at the cluster's API server:

```bash
spark-submit \
  --master k8s://https://<api-server>:6443 \
  --deploy-mode cluster \
  --conf spark.executor.instances=4 \
  --conf spark.kubernetes.container.image=myrepo/spark:3.5 \
  jobs/daily_etl.py
```

What happens next:

1. K8s first creates a **Driver pod** (Node 2 in the diagram).
2. Once the Driver starts, it **calls the K8s API directly to ask for executors**, as many as `spark.executor.instances` says.
3. K8s creates **Executor pods**, spread by the Scheduler onto nodes with room (both Node 2 and Node 3 in the diagram).
4. When the job finishes, **all Spark pods are deleted; the nodes stay for the next job**.

So one Spark job's pods **naturally span several nodes** — which is exactly why it scales horizontally. When there are more executors than one machine can hold, they spill onto the next.

One more thing that's easy to overlook: **the "data" Spark computes on isn't in the cluster.** Once executors are up, they go to the external **Business DB / data source** (the operational Postgres, MySQL, warehouse or object storage) to pull data in, compute, and write results back (the cylinder at the bottom of diagram one). It's **a completely different DB** from the Airflow Metadata DB above; don't confuse them:

| | **Metadata DB** | **Business DB** |
|---|---|---|
| What it stores | Airflow's DAG / task scheduling state | The actual business data to be processed |
| Who uses it | Airflow Scheduler | Spark Executors reading / writing back |
| Where | In-cluster (StatefulSet) or managed externally | Almost always outside the cluster, run by the data team / cloud provider |
| In one line | Remembers "how far the schedule got" | Remembers "what happened in the business" |

## Putting it together: the pod lifecycle of one DAG run

Chaining Airflow triggering Spark, the common tool is **`SparkKubernetesOperator`**: an Airflow task submits a Spark job to K8s, the Driver comes up and spawns Executors, and the Executors finally write the computed results into the **Business DB**. The whole chain:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 604 140" role="img" aria-label="Flow: an Airflow task pod submits a Spark job, creating a Spark Driver pod; the Driver requests Executor pods; the Executors read from and write to the Business DB outside the cluster" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="kf1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="8" y="70" width="78" height="42" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="47" y="88" fill="#e6e6e6" font-size="11" text-anchor="middle">Airflow</text><text x="47" y="102" fill="#9aa4b2" font-size="7.5" text-anchor="middle">task pod</text>
    <rect x="134" y="70" width="78" height="42" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5" stroke-dasharray="4 3"/><text x="173" y="88" fill="#e6e6e6" font-size="11" text-anchor="middle">Spark</text><text x="173" y="102" fill="#9aa4b2" font-size="7.5" text-anchor="middle">spark-submit</text>
    <rect x="260" y="70" width="78" height="42" rx="7" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/><text x="299" y="88" fill="#e6e6e6" font-size="11" text-anchor="middle">Driver</text><text x="299" y="102" fill="#9aa4b2" font-size="7.5" text-anchor="middle">Spark pod</text>
    <rect x="386" y="70" width="78" height="42" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="425" y="88" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Executor</text><text x="425" y="102" fill="#9aa4b2" font-size="7.5" text-anchor="middle">×N pods</text>
    <path d="M516 76 v30 a35 6 0 0 0 70 0 v-30" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5"/><ellipse cx="551" cy="76" rx="35" ry="6" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5"/><text x="551" y="97" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Business DB</text>
    <line x1="88" y1="91" x2="132" y2="91" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kf1)"/><text x="110" y="84" fill="#9aa4b2" font-size="7.5" text-anchor="middle">submit job</text>
    <line x1="214" y1="91" x2="258" y2="91" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kf1)"/><text x="236" y="84" fill="#9aa4b2" font-size="7.5" text-anchor="middle">create</text>
    <line x1="340" y1="91" x2="384" y2="91" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kf1)"/><text x="362" y="84" fill="#9aa4b2" font-size="7.5" text-anchor="middle">request</text>
    <line x1="466" y1="91" x2="510" y2="91" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kf1)"/><text x="488" y="84" fill="#9aa4b2" font-size="7.5" text-anchor="middle">read / write</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">One job's data flow: Airflow triggers → submits the Spark job → creates the Driver pod → the Driver starts Executors → Executors read and write the Business DB. Every box in between is one pod (or a group); only the Business DB on the far right is outside the cluster</figcaption>
</figure>

Every box on the chain (except the Business DB outside the cluster on the far right) is one pod or a group of pods. Laying the same chain out on a timeline shows most clearly "**who is long-lived, who is disposable**":

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 250" role="img" aria-label="Pod lifecycle timeline: the Airflow Scheduler, Webserver and Triggerer run the whole time; the task pod, Spark Driver and Executors exist only for the duration of the job and vanish when it finishes" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="kt2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="120" y="44" fill="#9aa4b2" font-size="9.5" text-anchor="end">Scheduler</text>
    <rect x="130" y="34" width="420" height="14" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="120" y="72" fill="#9aa4b2" font-size="9.5" text-anchor="end">Webserver</text>
    <rect x="130" y="62" width="420" height="14" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="120" y="100" fill="#9aa4b2" font-size="9.5" text-anchor="end">Triggerer</text>
    <rect x="130" y="90" width="420" height="14" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="120" y="128" fill="#9aa4b2" font-size="9.5" text-anchor="end">task pod</text>
    <rect x="220" y="118" width="120" height="14" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3" stroke-dasharray="4 3"/>
    <text x="120" y="156" fill="#9aa4b2" font-size="9.5" text-anchor="end">Spark Driver</text>
    <rect x="300" y="146" width="180" height="14" rx="3" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/>
    <text x="120" y="184" fill="#9aa4b2" font-size="9.5" text-anchor="end">Executor ×N</text>
    <rect x="330" y="174" width="130" height="14" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <line x1="130" y1="210" x2="560" y2="210" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kt2)"/>
    <text x="555" y="228" fill="#9aa4b2" font-size="9.5" text-anchor="end">time →</text>
    <line x1="220" y1="30" x2="220" y2="210" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 4"/>
    <text x="220" y="24" fill="#9aa4b2" font-size="8" text-anchor="middle">DAG triggered</text>
    <line x1="480" y1="30" x2="480" y2="210" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 4"/>
    <text x="480" y="24" fill="#9aa4b2" font-size="8" text-anchor="middle">job done</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The long blue bars are Airflow's long-lived pods, running without stopping; the short bars are disposable pods — the task pod spawns the Spark Driver, the Driver spawns Executors, and the moment the job completes they all vanish</figcaption>
</figure>

Understand this diagram and you've grasped K8s's biggest value for data engineering: **resources are occupied only while something is actually computing.** With no job running, the cluster holds only a few lightweight long-lived Airflow pods; at peak, Executors sprout all at once and are deleted when done. The cost structure is completely different from the traditional approach of keeping a crowd of idle workers around.

## Controlling who runs on which node

By default the Scheduler just picks a node "with room", but in data-engineering scenarios you usually want to **arrange things deliberately**. The common knobs:

- **`requests` / `limits`**: how much CPU/memory each pod declares. The Scheduler bin-packs by `requests`; **get this number wrong and either nothing schedules or a node gets crammed**.
- **nodeSelector / affinity**: pin "Spark executors" to a "Spark-only node pool" so they don't fight the Airflow core for resources.
- **taints + tolerations**: "lock" certain nodes so only pods with a matching toleration can enter — for instance, reserve a pool of high-memory machines for Spark alone.
- **Cluster Autoscaler**: when executor pods are stuck pending because no node can take them, add nodes automatically; scale back down when idle.

The most practical pattern is the **node pooling** drawn in diagram one:

| Node pool | Runs | Why |
|---|---|---|
| **on-demand (stable)** | Airflow Scheduler / Webserver, Metadata DB, Spark Driver | If these die **the whole batch of jobs is toast** (especially the stateful DB); they can't run on machines that get reclaimed |
| **spot / preemptible (cheap)** | Spark Executor | A single executor dying means Spark recomputes that piece — tolerable, in exchange for big savings |

**Whether it can die, and whether it can recover if it does, decides which kind of node it should run on.** That's the design principle to think through most carefully once Airflow + Spark move onto K8s.

## Reflections

### "Everything is a pod" is this architecture's greatest liberation

The change I felt most: [[spark-running|Spark on YARN]] and Airflow's workers used to be two completely different resource worlds — one tuned via YARN queues, the other via Celery worker counts, each with its own temperament. On K8s, **they become the same kind of thing: pods that declare `requests` and get placed on some node by the Scheduler.** Monitoring, scheduling, scaling, isolation all converge into one K8s vocabulary. Learn it once, and Airflow, Spark, even dbt containers are managed the same way. That satisfaction of "one abstraction over heterogeneous workloads" is the main reason I'd recommend a team go this way.

### Separating long-lived from ephemeral is where you save money and where things blow up

The dividing line in diagram two — "long blue bars vs short bars" — I only truly learned after getting burned: **to save money I once threw the Airflow Scheduler onto spot nodes too, and the moment the cloud reclaimed the node the whole schedule stopped and half-run DAGs ended up in a confused state.** The lesson is simple — Executors can run on machines that disappear, because Spark recomputes; but roles like the Scheduler and Driver, where "if it dies nobody takes over", must be pinned to stable on-demand nodes. The criterion is one sentence: **if this pod dies, can the system recover by itself?** If yes, put it on spot and save money; if no, pay for stability.

### Disposable pods force you to build up observability

K8s's most counter-intuitive side effect: **the executor pod that failed has usually already been deleted by the time you want its logs.** In the YARN days I'd SSH in and dig through logs; that move is useless here. So the moment you go onto K8s, logs and metrics have to be **shipped out in real time** (centralised logging, a Spark History Server and the like); you can't rely on "fetch them from the machine afterwards". It's the same thinking as the idempotency and re-runnability in the [[airflow-scheduling|Airflow post]] — a Production system can't assume any machine or any pod will still be there afterwards.

### Same as always: confirm the pain before going onto K8s

Cold water to finish. K8s makes this architecture sound beautiful, but it is itself **a mountain that needs operating**. When the data isn't yet big enough to span machines and the team has no K8s background, forcing it in just swaps the trouble of "tuning Spark" for the double trouble of "tuning Spark + fixing K8s". My priority is always [[pain-before-power|confirm the pain first, then bring in the heavy weapons]]: use a managed platform (Databricks, EMR, Glue) as long as it holds up; only when you truly need to pack many kinds of workload into one elastic pool, and have people who can look after it, is it K8s's moment to shine. **The unified abstraction is its reward; the operating cost is its entry fee — count both.**
