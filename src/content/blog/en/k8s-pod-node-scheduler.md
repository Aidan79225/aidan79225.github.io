---
title: "Pod, Node, Scheduler: The Three Atoms of a Kubernetes Cluster"
date: 2026-07-06
category: tech
description: "The previous post's reconcile loop keeps \"I want 3\" true for you — but 3 of what, landing on which machine, decided by whom? This post covers K8s's three most basic atoms — Pod, Node, Scheduler — and explains why Pods are short-lived."
tags:
  - kubernetes
  - concept
series: "Kubernetes — Learning Notes"
seriesOrder: 2
comments: true
draft: false
translationOf: k8s-pod-node-scheduler
---
[[k8s-intro|The previous post]] covered the soul of K8s: you declare a desired state, and the reconcile loop keeps pulling reality towards it. But that "I want 3" — **3 of what? Landing on which machine? Who decides where?** This post makes the cluster's three most basic atoms clear: **Pod, Node, Scheduler.**

## Pod: the smallest unit, and not a "container"

The first counter-intuitive point: **the smallest unit K8s schedules and scales isn't a container; it's a Pod.** A Pod wraps **one (or a few) containers** so they **live and die together and share network and storage**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 480 224" role="img" aria-label="Pod anatomy: a Pod wraps one or more containers (the app and an optional sidecar), which share one IP (talking to each other over localhost) and shared Volumes" style="width:100%;max-width:520px;height:auto;margin:0 auto;">
    <rect x="50" y="34" width="380" height="176" rx="12" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="240" y="56" fill="#4f6df5" font-size="12.5" font-weight="bold" text-anchor="middle">Pod</text>
    <text x="240" y="71" fill="#9aa4b2" font-size="8.5" text-anchor="middle">smallest deployable unit · the unit of scheduling and scaling</text>
    <rect x="78" y="86" width="150" height="60" rx="7" fill="#1f2330" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="153" y="112" fill="#e6e6e6" font-size="10.5" text-anchor="middle">container: app</text>
    <text x="153" y="128" fill="#9aa4b2" font-size="8" text-anchor="middle">your service</text>
    <rect x="252" y="86" width="150" height="60" rx="7" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3"/>
    <text x="327" y="112" fill="#e6e6e6" font-size="10.5" text-anchor="middle">container: sidecar</text>
    <text x="327" y="128" fill="#9aa4b2" font-size="8" text-anchor="middle">optional (log / proxy)</text>
    <rect x="78" y="158" width="324" height="38" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="240" y="181" fill="#54b890" font-size="9.5" text-anchor="middle">shared: one IP (talk over localhost) · shared Volumes</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">A Pod wraps one or more containers that "live and die together" into a single unit, sharing network (one IP) and storage. Most Pods have exactly one container; the sidecar is optional</figcaption>
</figure>

Why the extra wrapper? Because some containers **naturally belong together** — a main service plus a sidecar that collects its logs or acts as a proxy; they need to share a network, be scheduled together, live and die together. **But don't overuse it: most Pods are one container.** Just remember this: **the container is "what runs"; the Pod is the unit K8s actually moves, replicates and schedules.**

In YAML, a Pod with "app + sidecar sharing a scratch volume" looks like this — `containers` is an **array** (you can list several), and the disk defined under `volumes` can be mounted by both:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web
spec:
  containers:
    - name: app                     # main container: your service
      image: myrepo/web:1.0
      volumeMounts:
        - { name: shared, mountPath: /var/log/app }
    - name: log-agent               # sidecar: collects its logs on the side
      image: fluent-bit:latest
      volumeMounts:
        - { name: shared, mountPath: /logs }   # same disk mounted, so it can read what app wrote
  volumes:
    - name: shared
      emptyDir: {}                  # scratch space shared by both containers (gone when the Pod goes)
```

You can see how the Pod's two kinds of "sharing" land: both containers **mount the same `shared` volume** (so the sidecar can read the files the app writes), and being in one Pod they **share one network** (they reach each other on `localhost`). In practice, though, you **rarely write a Pod by itself** — you let a [[k8s-deployment|Deployment]]'s `template` generate them; the standalone Pod here is just to show the structure clearly.

## Node: a machine

**A Node is a real machine** (on the cloud, usually a VM). [[k8s-intro|The previous post]] mentioned the cluster has two halves:

- **Control Plane (the brain)**: decides what to run, where to place it, keeps correcting the gap.
- **Worker Nodes (the workers)**: the machines that actually run your Pods. Each has a **kubelet** that looks after the Pods on that machine and reports status back to the brain.

So what "I want 3 Pods" actually looks like is those 3 Pods assigned to some Nodes and running there. And what decides "which Pod goes to which Node" is the third atom.

## Scheduler: decides which Node a Pod lands on

When the reconcile loop needs a new Pod, that Pod starts out **Pending** (no Node yet). The **Scheduler**'s job is to pick a Node for it to land on:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 250" role="img" aria-label="Scheduling flow: a Pending new Pod needs 2 CPU; the Scheduler first filters nodes that can fit it and whose rules allow it, then scores to pick the best. Node A is full and can't fit it, Node C is blocked by a taint, so Node B with 4 CPU left is chosen" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="sc" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker><marker id="scg" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4f6df5"/></marker></defs>
    <rect x="20" y="98" width="120" height="56" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5" stroke-dasharray="4 3"/>
    <text x="80" y="120" fill="#e6e6e6" font-size="10.5" text-anchor="middle">new Pod</text>
    <text x="80" y="137" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Pending · needs 2 CPU</text>
    <line x1="140" y1="126" x2="176" y2="126" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sc)"/>
    <rect x="178" y="92" width="140" height="68" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="248" y="114" fill="#4f6df5" font-size="11.5" font-weight="bold" text-anchor="middle">Scheduler</text>
    <text x="248" y="131" fill="#9aa4b2" font-size="8.5" text-anchor="middle">① filter: fits, rules allow</text>
    <text x="248" y="145" fill="#9aa4b2" font-size="8.5" text-anchor="middle">② score: pick the best</text>
    <rect x="378" y="22" width="200" height="54" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="478" y="44" fill="#9aa4b2" font-size="10" text-anchor="middle">Node A · full ✗</text>
    <text x="478" y="61" fill="#9aa4b2" font-size="8.5" text-anchor="middle">0.5 CPU left → won't fit</text>
    <rect x="378" y="96" width="200" height="54" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="478" y="118" fill="#e6e6e6" font-size="10" text-anchor="middle">Node B · chosen ✓</text>
    <text x="478" y="135" fill="#9aa4b2" font-size="8.5" text-anchor="middle">4 CPU left → bind here</text>
    <rect x="378" y="170" width="200" height="54" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="478" y="192" fill="#9aa4b2" font-size="10" text-anchor="middle">Node C · blocked by taint ✗</text>
    <text x="478" y="209" fill="#9aa4b2" font-size="8.5" text-anchor="middle">tainted; Pod has no toleration</text>
    <line x1="318" y1="120" x2="376" y2="55" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 3" marker-end="url(#sc)"/>
    <line x1="318" y1="126" x2="376" y2="123" stroke="#4f6df5" stroke-width="1.6" marker-end="url(#scg)"/>
    <line x1="318" y1="132" x2="376" y2="192" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 3" marker-end="url(#sc)"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The Scheduler first "filters" the nodes that can fit the Pod and whose rules allow it, then "scores" them and binds the Pod to the best — when the reconcile loop replaces a Pod for you, that's how the new one finds its home</figcaption>
</figure>

The knobs behind filtering and scoring — **requests/limits, node affinity, taints and tolerations** — are the key to controlling "who runs where"; [[k8s-scheduling-advanced|the advanced scheduling post]] in this series covers them properly. For now, know this: **where a Pod lands isn't random; the Scheduler computes it from resources and rules.**

## The key mindset: Pods are short-lived

One last idea you must build right now: **Pods are disposable.** When one dies, gets rescheduled, or gets replaced by a rolling update, the old Pod simply disappears and the reconcile loop starts a **brand-new** Pod in its place — **and the new Pod has a new IP.**

Which means: **you should never remember a Pod's IP, and never store state inside a Pod.** Pods are cattle, not pets — when one breaks you replace it, you don't nurse it. That leads to two later topics: if Pod IPs change, how do other services find them reliably? (→ [[k8s-service|Service]], post 4); and if a Pod's data goes with it, what about stateful things like databases? (→ [[k8s-storage|Volumes and StatefulSets]], post 6).

## Reflections

### Once "a Pod is not a container" clicks, everything flows

What I got stuck on longest when learning K8s was "if it runs containers, why the extra Pod?" Then it clicked: **the Pod is K8s's scheduling unit; the container is the execution unit.** What K8s moves, replicates and places is the Pod; whether a Pod holds one container or several is a design choice about "do these things need to live and die together". Ninety percent of the time it's one Pod, one container — don't cram in sidecars to show off. Get the "unit" straight and everything after lines up at once: Deployments manage Pods, Services point at Pods, scheduling schedules Pods.

### Short-lived Pods are a feature, not a bug

"A Pod can vanish at any moment and its IP will change" sounds unsettling, but it's actually the **precondition** for K8s self-healing, not a flaw. Precisely because Pods are treated as disposable, a broken one can be swapped painlessly. It's the same thinking as the "executors are deleted when done" I kept repeating in the [[spark-running|Spark]] and [[airflow-spark-on-k8s|Spark on K8s]] posts — **treat compute units as cattle, not pets**. Once you accept that, you stop doing things like "remember a particular Pod" that are destined to hurt, and turn instead to the stable abstractions K8s gives you (Service, Volume).

### The Scheduler decides "where" for you, but you can step in

The default Scheduler picks a node with room automatically, and most of the time you don't need to care. But when you have needs like "this batch of Pods should run on high-memory machines" or "don't squeeze in next to that noisy neighbour", requests, affinity and taints are how you step in — in [[airflow-spark-on-k8s|Airflow + Spark on K8s]] I used them to pin the Airflow core to stable nodes and throw Spark executors onto cheap spot nodes; same principle. **Let the Scheduler place things automatically first, and only reach in when you actually need to** — that's my attitude to every advanced K8s feature: the defaults are enough; don't use something just to use it.
