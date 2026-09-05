---
title: "Advanced Scheduling: Getting Pods onto the Right Node"
date: 2026-07-17
category: tech
tags:
  - kubernetes
  - scheduling
series: "Kubernetes — Learning Notes"
seriesOrder: 7
comments: true
draft: false
translationOf: k8s-scheduling-advanced
---
[[k8s-pod-node-scheduler|The second post]] covered how the Scheduler picks a node for a Pending Pod in two steps: **filter first (fits, rules allow), then score (pick the best).** Back then I said "the knobs behind filtering and scoring get their own post" — this is it. The default Scheduler is already smart, and most of the time you don't touch anything; but when you need "this batch of Pods on the GPU machines", "don't squeeze in next to that noisy neighbour", or "this pool of machines is reserved for one service", you reach for these knobs. They're also the real mechanism behind "pin the Airflow core to stable nodes, throw Spark executors onto spot nodes" in [[airflow-spark-on-k8s|Airflow + Spark on K8s]].

First, the mental model most easily confused: **who is choosing whom?**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 250" role="img" aria-label="Three scheduling relationships: affinity and nodeSelector are the Pod choosing a node by its labels (pull); a taint is the node driving away Pods without a matching toleration (push); a toleration only makes the Pod immune to a taint and doesn't attract it" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="pull" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#54b890"/></marker><marker id="push" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#e0733a"/></marker></defs>
    <rect x="34" y="80" width="168" height="104" rx="11" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="118" y="104" fill="#4f6df5" font-size="12.5" font-weight="bold" text-anchor="middle">Pod</text>
    <text x="118" y="126" fill="#9aa4b2" font-size="9" text-anchor="middle">nodeSelector / affinity</text>
    <text x="118" y="140" fill="#9aa4b2" font-size="9" text-anchor="middle">"I want a disk=ssd node"</text>
    <rect x="46" y="152" width="144" height="22" rx="5" fill="#1f2330" stroke="#54b890" stroke-width="1.3"/>
    <text x="118" y="167" fill="#54b890" font-size="8.5" text-anchor="middle">toleration: immune to gpu taint</text>
    <rect x="358" y="80" width="168" height="104" rx="11" fill="#262b3a" stroke="#54b890" stroke-width="1.9"/>
    <text x="442" y="104" fill="#54b890" font-size="12.5" font-weight="bold" text-anchor="middle">Node</text>
    <text x="442" y="126" fill="#9aa4b2" font-size="9" text-anchor="middle">label: disk=ssd</text>
    <rect x="370" y="140" width="144" height="34" rx="5" fill="#1f2330" stroke="#e0733a" stroke-width="1.3"/>
    <text x="442" y="156" fill="#e0733a" font-size="8.5" text-anchor="middle">taint: gpu=true:NoSchedule</text>
    <text x="442" y="169" fill="#9aa4b2" font-size="7.5" text-anchor="middle">non-immune Pods are driven off</text>
    <path d="M202 108 C 270 92, 300 92, 356 108" fill="none" stroke="#54b890" stroke-width="1.8" marker-end="url(#pull)"/>
    <text x="279" y="86" fill="#54b890" font-size="9.5" text-anchor="middle">pull: Pod picks a node by label</text>
    <path d="M356 158 C 300 176, 270 176, 204 160" fill="none" stroke="#e0733a" stroke-width="1.8" marker-end="url(#push)"/>
    <text x="279" y="200" fill="#e0733a" font-size="9.5" text-anchor="middle">push: node drives off non-immune Pods</text>
    <text x="279" y="222" fill="#9aa4b2" font-size="8.5" text-anchor="middle">a toleration is only immunity; it doesn't "attract" the Pod</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Don't mix up the three relationships: <b>affinity / nodeSelector</b> is the Pod actively choosing a node (pull); a <b>taint</b> is the node driving Pods away (push); a <b>toleration</b> only makes the Pod immune to a given taint — "immune" isn't "attracted", the most common misunderstanding</figcaption>
</figure>

## Prerequisite: requests decide "does it fit"

Before any node is chosen, the first filter is always resources. Every Pod can declare `requests` (I need at least this much) and `limits` (I'll use at most this much), but for scheduling **only `requests` matters**:

- The Scheduler **adds up the `requests` of every Pod on each node**, sees what's left, and decides whether the new Pod fits.
- It **does not look at the node's actual utilisation**, and **does not look at `limits`**. Even if the Pods on a node are using only 10% CPU, if their `requests` already add up to full, the new Pod won't schedule.

That leads to two common pits: **`requests` set too high** → the Pod is stuck Pending (the machine is clearly idle, yet nothing fits); **`requests` too low or missing** → a node gets crammed and everyone fights over resources and drags each other down. `requests` is the basis for scheduling; `limits` is the runtime ceiling — **scheduling only recognises the former.**

## Let the Pod pick the node: nodeSelector and node affinity

To send a Pod to "a certain kind of node", the node has to carry a **label** first (`kubectl label node node1 disk=ssd`). Then, from simple to expressive, three ways to write it:

- **nodeSelector**: simplest; the Pod says `nodeSelector: {disk: ssd}`, meaning "**only** nodes whose label matches exactly". Hard, equality only.
- **node affinity (required)**: `requiredDuringSchedulingIgnoredDuringExecution` — just as hard a "must go there", but more expressive, supporting operators like `In / NotIn / Exists` (e.g. "disk is ssd **or** nvme").
- **node affinity (preferred)**: `preferredDuringSchedulingIgnoredDuringExecution` — a **soft preference** with a weight. Matching nodes get priority, **but with none available it still schedules**, no Pending.

That long, ugly name is actually two pieces of information: `requiredDuringScheduling` = a hard requirement at scheduling time; `IgnoredDuringExecution` = **once scheduled**, even if the node's label is changed afterwards, **the running Pod isn't evicted**. Remember that suffix and you understand that affinity's scope is only "the moment of scheduling".

## Let the node pick the pod: taints and tolerations

Affinity is the Pod actively choosing; **a taint is the node repelling Pods in reverse.** You mark a node with a taint (`kubectl taint node node1 gpu=true:NoSchedule`), and by default **no Pod without a matching toleration may schedule onto it**. There are three effects, increasing in force:

| effect | Pods not yet scheduled | Pods already running |
|---|---|---|
| `PreferNoSchedule` | try not to schedule here (soft) | untouched |
| `NoSchedule` | may not schedule here (hard) | untouched |
| `NoExecute` | may not schedule here | **even running ones are evicted** (unless they tolerate) |

The Pod writes a matching **toleration** and gets its "this taint can't stop me" ticket. Here's the one thing to remember from the whole post: **a toleration is only "immunity", not "attraction".** A Pod with a GPU toleration is not therefore **pulled to** the GPU node — it merely "may" go there, and the Scheduler is free to put it on some other empty ordinary node. To truly achieve "this pool is **only** for this kind of Pod, and this kind of Pod **always** comes here", all three knobs go on together:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 280" role="img" aria-label="The dedicated-node combo: the GPU node carries a NoSchedule taint. Pod A has no toleration, is blocked, and lands on an ordinary node; Pod B has a toleration but no affinity, so although it can enter the GPU node it may also be scheduled onto an ordinary node; Pod C has a toleration plus nodeAffinity=gpu, and only it reliably lands on the GPU node" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="ok" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#54b890"/></marker><marker id="no" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="410" y="24" width="192" height="96" rx="10" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.8"/>
    <text x="506" y="46" fill="#9b6ff0" font-size="11.5" font-weight="bold" text-anchor="middle">GPU node</text>
    <text x="506" y="63" fill="#9aa4b2" font-size="8.5" text-anchor="middle">label: hw=gpu</text>
    <text x="506" y="78" fill="#e0733a" font-size="8.5" text-anchor="middle">taint: gpu=true:NoSchedule</text>
    <text x="506" y="100" fill="#9aa4b2" font-size="8" text-anchor="middle">reserved for Pods that need a GPU</text>
    <rect x="410" y="176" width="192" height="80" rx="10" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.5"/>
    <text x="506" y="200" fill="#e6e6e6" font-size="11.5" text-anchor="middle">ordinary node</text>
    <text x="506" y="217" fill="#9aa4b2" font-size="8.5" text-anchor="middle">no taint</text>
    <text x="506" y="234" fill="#9aa4b2" font-size="8" text-anchor="middle">anyone can schedule here</text>
    <rect x="14" y="24" width="196" height="34" rx="7" fill="#1f2330" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="112" y="39" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Pod A · no toleration</text>
    <text x="112" y="52" fill="#9aa4b2" font-size="8" text-anchor="middle">blocked by taint → ordinary node</text>
    <rect x="14" y="112" width="196" height="34" rx="7" fill="#1f2330" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="112" y="127" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Pod B · toleration</text>
    <text x="112" y="140" fill="#9aa4b2" font-size="8" text-anchor="middle">may enter, but no affinity → might not</text>
    <rect x="14" y="200" width="196" height="34" rx="7" fill="#1f2330" stroke="#54b890" stroke-width="1.6"/>
    <text x="112" y="215" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Pod C · toleration + affinity</text>
    <text x="112" y="228" fill="#54b890" font-size="8" text-anchor="middle">immune + pulled → reliably on GPU node</text>
    <path d="M210 45 C 300 70, 330 190, 408 205" fill="none" stroke="#54b890" stroke-width="1.5" marker-end="url(#ok)"/>
    <path d="M210 36 C 300 30, 330 30, 408 40" fill="none" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 3" marker-end="url(#no)"/>
    <text x="322" y="20" fill="#9aa4b2" font-size="8" text-anchor="middle">✗ blocked</text>
    <path d="M210 129 C 300 118, 330 90, 408 78" fill="none" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#no)"/>
    <path d="M210 138 C 300 175, 330 200, 408 210" fill="none" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#no)"/>
    <text x="330" y="150" fill="#9aa4b2" font-size="8" text-anchor="middle">either is possible</text>
    <path d="M210 217 C 300 210, 340 90, 408 74" fill="none" stroke="#54b890" stroke-width="1.8" marker-end="url(#ok)"/>
    <text x="322" y="256" fill="#54b890" font-size="8" text-anchor="middle">✓ always lands on the GPU node</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The "dedicated node" combo: the <b>taint</b> keeps stray Pods out (Pod A), the <b>toleration</b> gives the right Pods a ticket in (Pod B), and <b>node affinity</b> actually pulls them in (Pod C). Without affinity, an immune Pod may still wander elsewhere — only all three together lock it down</figcaption>
</figure>

## Last resort: manual scheduling with nodeName

If you don't even want to go through the Scheduler, write `nodeName: node1` directly in the Pod — this is the machine I've chosen, **bypass the whole scheduling flow**, and the kubelet starts it right there. The price: it **does no checks at all**; if that machine doesn't have room the Pod is stuck dead (Pending forever, with nobody swapping in another node), and if the node dies it won't be rescheduled elsewhere. It's an escape hatch for debugging or very special needs; **normally, always let the Scheduler decide** — hand "where" to the thing that can compute it; you describe the constraints, don't dictate the answer.

> Incidentally, besides Pods choosing nodes, Pods can choose **Pods**: `podAffinity` (gather related Pods in the same zone to cut cross-zone latency), `podAntiAffinity` (**spread** one service's replicas across different nodes, so one node dying doesn't take them all), and `topologySpreadConstraints` (finer-grained even distribution across zones / nodes). The principle is the same "pull" and "push" as node affinity, only this time what's being chosen is other Pods, not nodes. When you really need to spread high-availability replicas, `podAntiAffinity` is the go-to move.

## In YAML: all three knobs at once

Turning the "dedicated node" combo diagram into declarations. First taint the GPU node (these are commands, not YAML):

```bash
kubectl label node gpu-1 hw=gpu                          # label: so affinity can find it
kubectl taint node gpu-1 gpu=true:NoSchedule             # taint: drive off Pods without immunity
```

Then, in the Pod template, write all three knobs — `resources.requests` (the capacity basis for scheduling), `nodeAffinity` (pull: I want an `hw=gpu` node), `tolerations` (immunity: I can withstand that taint):

```yaml
    spec:
      containers:
        - name: trainer
          image: myrepo/trainer:1.0
          resources:
            requests: { cpu: "2", memory: "8Gi" }   # the Scheduler uses this to judge whether it fits
      affinity:
        nodeAffinity:                               # pull: hard requirement for an hw=gpu node
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - { key: hw, operator: In, values: [ "gpu" ] }
      tolerations:                                  # immunity: tolerate gpu=true:NoSchedule
        - { key: gpu, operator: Equal, value: "true", effect: NoSchedule }
```

Each of the three sections maps to one link in the diagram: without `tolerations`, the Pod is blocked at the door by the taint; without `nodeAffinity`, an immune Pod may still drift elsewhere. **Only both together lock in "this node only for this kind of Pod, and this kind of Pod always comes here".** `requests` is the foundation you must get right regardless — it's the scheduler's ledger.

## Reflections

### Separate "pull, push, immunity" and taint/toleration stops being a maze

What I got stuck on longest was treating a toleration as "the spell that sends a Pod to that node" — I'd taint the node, add the toleration, and the Pod would run off somewhere else, baffling me. The moment it clicked was simple: **a toleration only answers "may it enter", not "will it come".** The taint is the security guard at the door (push), the toleration is the pass (immunity), and affinity is the actual invitation that brings someone through the door (pull). Each does its own job; drop one and something leaks. Every time I design a "dedicated machine pool" now, I run this diagram in my head: **who guards the door, who holds a pass, who is responsible for pulling the right people in** — set right the first time, no more trial and error.

### Most of the time, the best scheduling strategy is "don't"

Having written up all these knobs, my actual advice is **avoid them when you can**. The default Scheduler's bin-packing already handles ninety percent of cases, and every extra affinity / taint you bind adds coupling that "will blow up later when the node pool changes or a label gets renamed". I've seen teams pin a pile of Pods hard to specific nodes, and then one day that batch of machines had to be retired and everything pulled on everything else. **Let the Scheduler place things automatically first; act only when there's a real pain point (need a GPU, isolate a noisy neighbour, spread HA replicas)** — consistent with my attitude to every advanced K8s feature: the defaults are enough; don't use it to show you know how. The fewer constraints you add, the more room the system has to find its own optimum.

### requests is the truth of scheduling, not CPU usage

The most counter-intuitive point, and the one that most often keeps people debugging into the night: **the Scheduler never looks at actual utilisation, only at the sum of `requests`.** I stepped in it once — monitoring showed node CPU at barely 30%, yet a new Pod flatly refused to schedule; it took ages to find that a few Pods on it had `requests` set too generously and had used up the "paper quota". Since then I write `requests` as **a resource contract signed with the node**, not a number filled in casually: too high and nothing schedules, too low and you crowd everyone else out. Getting it accurate needs feedback from observed real usage — which comes back to [[airflow-spark-on-k8s|going onto K8s means building up observability]]. **Scheduling schedules the numbers you declare, not the amount you really use; report the ledger accurately and the cluster schedules accurately.**
