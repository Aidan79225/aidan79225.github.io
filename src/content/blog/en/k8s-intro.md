---
title: "What Is Kubernetes? From 'Running Containers' to 'Declaring the State You Want'"
date: 2026-07-06
category: tech
description: "K8s is hard to learn, usually because people memorise the API before the concept. This post starts from the beginning: what problem it actually solves, and the one core idea that ties everything together — a declared desired state plus a reconcile loop. This is the foundation of the whole series."
tags:
  - kubernetes
  - concept
series: "Kubernetes — Learning Notes"
seriesOrder: 1
comments: true
draft: false
translationOf: k8s-intro
---
Many people find Kubernetes (K8s) hard because they're buried from day one under `kubectl`, a pile of YAML fields, and dozens of resource names. But K8s really has **one core idea**; grasp it and everything after is a variation on the same sentence. This series starts from that idea — **a declared desired state, plus a reconcile loop that keeps pulling reality towards it.**

## First ask: what problem does it actually solve

Say you already know Docker and have a containerised service. When you take it to Production you run into a pile of chores:

- A container dies. Who **restarts it automatically**?
- Traffic grows. Who **opens more copies**, and **takes them back** when traffic falls?
- A whole machine dies. Where do the containers on it **move to**?
- Shipping a new version: how do you roll it out **without downtime**, and **roll back** when it breaks?

Running `docker run` by hand one at a time, SSH-ing in to rescue things when they break — fine for a few machines, a disaster at a few dozen. **K8s is the "container orchestrator" that looks after your containers** — it automates "a pile of containers has to run on a pile of machines, stay alive, scale, and change versions".

## The core idea: declare the desired state, let it converge

But what's really clever about K8s isn't "lots of features"; it's **how it achieves them**. You never issue step-by-step commands like "restart this container" or "start one on that machine"; you only **declare the end state you want**, and K8s works out how to get there — and **keeps it there**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 240" role="img" aria-label="The reconcile loop: you declare a desired state (3 Pods), the Controller reads it, observes the actual state (currently 2), acts on the gap (creates 1), and keeps pulling actual towards desired" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rl" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="24" y="92" width="140" height="58" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="94" y="116" fill="#e6e6e6" font-size="11.5" text-anchor="middle">desired state</text>
    <text x="94" y="134" fill="#9aa4b2" font-size="9" text-anchor="middle">you declare: replicas = 3</text>
    <rect x="210" y="86" width="140" height="70" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="280" y="112" fill="#4f6df5" font-size="12" font-weight="bold" text-anchor="middle">Controller</text>
    <text x="280" y="130" fill="#9aa4b2" font-size="9" text-anchor="middle">control loop</text>
    <text x="280" y="144" fill="#9aa4b2" font-size="9" text-anchor="middle">compare &amp; correct</text>
    <rect x="396" y="92" width="140" height="58" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/>
    <text x="466" y="116" fill="#e6e6e6" font-size="11.5" text-anchor="middle">actual state</text>
    <text x="466" y="134" fill="#9aa4b2" font-size="9" text-anchor="middle">only 2 right now</text>
    <line x1="164" y1="121" x2="208" y2="121" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#rl)"/>
    <text x="186" y="112" fill="#9aa4b2" font-size="8.5" text-anchor="middle">① read</text>
    <line x1="350" y1="110" x2="394" y2="110" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#rl)"/>
    <text x="372" y="102" fill="#9aa4b2" font-size="8.5" text-anchor="middle">② act</text>
    <line x1="394" y1="136" x2="350" y2="136" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#rl)"/>
    <text x="372" y="150" fill="#9aa4b2" font-size="8.5" text-anchor="middle">③ observe</text>
    <text x="466" y="176" fill="#54b890" font-size="9" text-anchor="middle">2 → create 1 → 3 ✓</text>
    <text x="280" y="212" fill="#9aa4b2" font-size="10" text-anchor="middle">reconcile loop: keep comparing desired with actual, fix the gap — this is the soul of K8s</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">You only declare "I want 3"; the Controller keeps watching the actual state and fills any gap it finds. One container dies, one gets replaced; a machine breaks, things start elsewhere — all of it falls out of this loop</figcaption>
</figure>

**This reconcile loop is the soul of all of K8s.** Deployment, Service, every resource you'll meet later — behind each is the same thing: you declare a desired state, and some controller keeps pulling reality towards it. Every post in this series comes back to that sentence.

## Imperative vs declarative: why the difference matters

Another angle on the shift:

| | Imperative (the past) | Declarative (K8s) |
|---|---|---|
| What you do | Issue step-by-step commands: start this, stop that | Describe the **result you want**: 3 copies, this version |
| Who maintains the state | You (rescue it yourself when it breaks) | The system (converges automatically, self-heals) |
| Repeatable | Hard (commands have order and side effects) | Idempotent (apply as many times as you like, same result) |
| Version-controllable | Hard | **Yes**: one YAML file is your desired state |

The biggest dividend of the declarative model is that **your "desired state" becomes a file you can version-control**. What the whole cluster should look like lives in Git, can be reviewed, can be traced — that's the foundation of GitOps.

A minimal "desired state" looks like this:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3                # I want 3
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: web
          image: myrepo/web:1.0   # run this image
```

Then `kubectl apply -f web.yaml`. You never told it "start three containers"; you only said "I want 3 of `web:1.0`" — the rest is up to the reconcile loop.

## What a cluster looks like: the brain and the workers

So where does "the Controller keeps converging" actually happen? A K8s cluster has two halves:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 270" role="img" aria-label="A K8s cluster has two halves: the Control Plane is the brain, with the API Server, Scheduler, Controller Manager and etcd; below are Worker Nodes, each running a kubelet and Pods. You send your desired state to the API Server with kubectl apply" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="ca" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="300" y="16" fill="#9aa4b2" font-size="9.5" text-anchor="middle">you: kubectl apply (the YAML declaring your desired state)</text>
    <line x1="300" y1="22" x2="300" y2="40" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ca)"/>
    <rect x="30" y="42" width="540" height="86" rx="10" fill="none" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="44" y="60" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="start">Control Plane · the brain</text>
    <rect x="44" y="70" width="118" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="103" y="90" fill="#e6e6e6" font-size="9.5" text-anchor="middle">API Server</text><text x="103" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">the only entry point</text>
    <rect x="172" y="70" width="118" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="231" y="90" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Scheduler</text><text x="231" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">where each pod goes</text>
    <rect x="300" y="70" width="138" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="369" y="90" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Controller Mgr</text><text x="369" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">runs the reconcile loops</text>
    <rect x="448" y="70" width="108" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="502" y="90" fill="#e6e6e6" font-size="9.5" text-anchor="middle">etcd</text><text x="502" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">state store</text>
    <line x1="300" y1="128" x2="120" y2="168" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ca)"/>
    <line x1="300" y1="128" x2="300" y2="168" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ca)"/>
    <line x1="300" y1="128" x2="480" y2="168" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ca)"/>
    <rect x="34" y="170" width="172" height="86" rx="8" fill="none" stroke="#3a4154" stroke-width="1.4"/>
    <text x="120" y="188" fill="#e6e6e6" font-size="10" text-anchor="middle">Worker Node</text>
    <text x="120" y="202" fill="#9aa4b2" font-size="8" text-anchor="middle">kubelet</text>
    <circle cx="95" cy="228" r="12" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="95" y="231" fill="#9aa4b2" font-size="8" text-anchor="middle">Pod</text>
    <circle cx="145" cy="228" r="12" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="145" y="231" fill="#9aa4b2" font-size="8" text-anchor="middle">Pod</text>
    <rect x="214" y="170" width="172" height="86" rx="8" fill="none" stroke="#3a4154" stroke-width="1.4"/>
    <text x="300" y="188" fill="#e6e6e6" font-size="10" text-anchor="middle">Worker Node</text>
    <text x="300" y="202" fill="#9aa4b2" font-size="8" text-anchor="middle">kubelet</text>
    <circle cx="300" cy="228" r="12" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="300" y="231" fill="#9aa4b2" font-size="8" text-anchor="middle">Pod</text>
    <rect x="394" y="170" width="172" height="86" rx="8" fill="none" stroke="#3a4154" stroke-width="1.4"/>
    <text x="480" y="188" fill="#e6e6e6" font-size="10" text-anchor="middle">Worker Node</text>
    <text x="480" y="202" fill="#9aa4b2" font-size="8" text-anchor="middle">kubelet</text>
    <circle cx="455" cy="228" r="12" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="455" y="231" fill="#9aa4b2" font-size="8" text-anchor="middle">Pod</text>
    <circle cx="505" cy="228" r="12" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="505" y="231" fill="#9aa4b2" font-size="8" text-anchor="middle">Pod</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The Control Plane is the brain (decides what to run, where to place it, keeps correcting the gap; all state lives in etcd); Worker Nodes are the workers, each running one kubelet that looks after the Pods on it</figcaption>
</figure>

- **Control Plane (the brain)**: `kubectl apply` goes to the single entry point, the **API Server**; the **Scheduler** decides which machine a new pod lands on; the **Controller Manager** runs those reconcile loops; **etcd** stores the state of the whole cluster.
- **Worker Nodes (the workers)**: the machines that actually run your Pods, each with one **kubelet** looking after the pods on that machine.

You don't need to memorise these components now — **Pod, Node and Scheduler** are the stars of [[airflow-spark-on-k8s|the next post]]. For this one, just carve that loop into your head.

## Reflections

### K8s is hard, usually because people learn it in the wrong order

I've watched many people (myself included, back then) learn K8s **starting from the API** — memorising `kubectl` commands, YAML fields, a pile of resource types — and it hurt, and nothing connected. Later it clicked: **grasp the reconcile loop first, then go back and look at each resource.** Once you know "everything is: you declare a desired state, a controller pulls reality towards it", the seemingly unrelated names — Deployment, ReplicaSet, Service, HPA — instantly become different applications of one pattern. **Mental model first; only then do details have somewhere to hang.** It's exactly what I felt reading about the [[fode-2|data engineering lifecycle]].

### "Declarative + version control" is what I admire most about K8s

What makes K8s beautiful to me isn't that it auto-restarts containers; it's that **it turns "what the cluster should look like" into a version-controlled file**. The desired state of the whole system lives in Git, can be reviewed, traced, rebuilt in one step — the same victory of engineering discipline as [[dbt-intro|dbt]] turning data transformations into version-controlled code: **move "the things that change" out of people's heads and ad-hoc operations into a trackable declaration.** The imperative world relies on "someone remembers how to fix it"; the declarative world relies on "a desired state everyone can see".

### But don't adopt K8s because it's fashionable

The customary cold water at the end: K8s is powerful, but it's itself **a mountain that needs operating**. When you have one or two services and a team without a K8s background, forcing it in just swaps the trouble of "looking after containers" for the double trouble of "looking after containers + looking after K8s". My priority has always been [[pain-before-power|confirm the pain first, then bring in the heavy weapons]]: ask "do I really have so many, such messy things that I need an orchestrator" before deciding whether to walk into this mountain. Understanding its value and judging whether you should use it are two different things — this series helps with the former; the latter still comes back to your own pain.
