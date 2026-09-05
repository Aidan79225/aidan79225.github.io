---
title: "Deployments and Self-Healing: The Reconcile Loop in Practice"
date: 2026-07-06
category: tech
description: "You almost never create a Pod by hand — what you actually declare is a Deployment. This post looks at the reconcile loop's most practical incarnation: how Deployment → ReplicaSet → Pod self-heals, and how it rolls out a new version with zero downtime and rolls back in one step."
tags:
  - kubernetes
  - concept
series: "Kubernetes — Learning Notes"
seriesOrder: 3
comments: true
draft: false
translationOf: k8s-deployment
---
[[k8s-intro|The first post]] gave the soul (the reconcile loop), [[k8s-pod-node-scheduler|the second]] gave the atom (the Pod). But in practice you **almost never create a Pod by hand** — what you declare is a **Deployment**, and it's the reconcile loop's most practical, most common incarnation. This post looks at how it **self-heals** and how it **changes versions with zero downtime**.

## Why not just create Pods

Because **a bare Pod that dies has nobody to save it.** Create a Pod by hand, and the moment it crashes or its node breaks, it's simply gone — nothing remembers "there was supposed to be one of these". What you want isn't "start a Pod"; it's "**always keep N healthy Pods**". That's exactly the kind of thing that needs a controller watching it, and Deployment is that controller:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 262" role="img" aria-label="A Deployment manages a ReplicaSet, which manages 3 Pods; one Pod dies, the ReplicaSet sees only 2 left and immediately creates a new one to get back to 3" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="dp" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="170" y="16" width="220" height="48" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="280" y="38" fill="#4f6df5" font-size="11.5" font-weight="bold" text-anchor="middle">Deployment</text>
    <text x="280" y="54" fill="#9aa4b2" font-size="8.5" text-anchor="middle">desired: replicas = 3 · image v1</text>
    <line x1="280" y1="64" x2="280" y2="90" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#dp)"/>
    <rect x="170" y="92" width="220" height="48" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="280" y="114" fill="#e6e6e6" font-size="11" text-anchor="middle">ReplicaSet</text>
    <text x="280" y="130" fill="#9aa4b2" font-size="8.5" text-anchor="middle">makes sure there are always 3 Pods</text>
    <line x1="280" y1="140" x2="113" y2="176" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#dp)"/>
    <line x1="280" y1="140" x2="260" y2="176" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#dp)"/>
    <line x1="280" y1="140" x2="447" y2="176" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#dp)"/>
    <rect x="66" y="178" width="94" height="50" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="113" y="200" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Pod</text>
    <text x="113" y="216" fill="#54b890" font-size="9" text-anchor="middle">✓ healthy</text>
    <rect x="213" y="178" width="94" height="50" rx="7" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3"/>
    <text x="260" y="200" fill="#9aa4b2" font-size="10.5" text-anchor="middle">Pod</text>
    <text x="260" y="216" fill="#9aa4b2" font-size="9" text-anchor="middle">✗ died</text>
    <rect x="400" y="178" width="94" height="50" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="447" y="200" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Pod</text>
    <text x="447" y="216" fill="#54b890" font-size="9" text-anchor="middle">✓ healthy</text>
    <text x="280" y="250" fill="#54b890" font-size="9.5" text-anchor="middle">one short → ReplicaSet sees the gap → creates a new one, back to 3</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">You declare a Deployment; through a ReplicaSet it keeps "always 3 Pods" true; one dies, one is created automatically — that's the reconcile loop's self-healing</figcaption>
</figure>

The division of labour is clear: the **Deployment** manages versions and update strategy; the **ReplicaSet** beneath it does exactly one thing — **watch the actual Pod count; create when short, kill when over.** You only declare "I want 3 copies of v1"; everything else is that loop running.

## What this "desired state" looks like in YAML

K8s is declarative: you don't issue step-by-step commands; you write a YAML describing "what I want" and hand it to the reconcile loop — which is why people say K8s has an **Infrastructure as Code** flavour. That whole self-healing setup above is declared in just these lines:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3                       # desired: always keep 3 copies
  selector:
    matchLabels: { app: web }       # which Pods this Deployment manages
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1             # at most this many unavailable during a rollout
      maxSurge: 1                   # at most this many extra new ones during a rollout
  template:                         # ↓ below: the template for "what each Pod looks like"
    metadata:
      labels: { app: web }          # the Pod's labels, must be matched by the selector above
    spec:
      containers:
        - name: web
          image: myrepo/web:1.0
          resources:                # basis for scheduling and QoS
            requests: { cpu: "100m", memory: "128Mi" }
            limits:   { cpu: "500m", memory: "256Mi" }
          readinessProbe:           # not passing → not added to the Service's traffic list
            httpGet: { path: /healthz, port: 8080 }
```

Three places are key to understanding a Deployment:

- **`replicas: 3` is your "desired state"** — the ReplicaSet watches it all day; short, create; over, kill. Change it to 5, `kubectl apply`, and the loop fills up to 5; you never issued a "start two containers" command.
- **`selector` and `template.labels` must match** — that's how the Deployment recognises "which Pods are mine". If the labels don't line up, `apply` is rejected outright.
- **`template` is the Pod template, and also the trigger for a rolling update** — change any field inside it (image, env, resources…) and a rollout starts; changing only `replicas` isn't a rollout, just a count adjustment. (Which is also why editing a referenced [[k8s-config-secret|ConfigMap/Secret]] doesn't roll out automatically — it never touched this template.)

## Self-healing: the reconcile loop is always running

So-called "K8s self-heals" isn't mysterious at all once you take it apart; it's the reconcile loop doing its job:

- You declare **desired** = 3 Pods.
- The ReplicaSet controller keeps comparing **actual**: how many healthy ones right now?
- A Pod crashes, or a whole node dies → actual drops to 2 → **gap** → create a new Pod, back to 3.

**You don't get woken up at night to restart the service, because the loop did it for you.** It's also why [[k8s-pod-node-scheduler|the previous post]] said short-lived Pods are a feature: precisely because they're disposable, a broken one can be swapped for a new one painlessly.

## Rolling updates: turning "deployment" into routine

The other half of what makes a Deployment valuable is **changing versions without interrupting service**. Change the image from v1 to v2, and it doesn't kill everything and restart at once; instead **new ones come up one by one, old ones retire one by one**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 220" role="img" aria-label="Rolling update at three moments: at the start three v1; mid-update two v1 and one v2; at the end three v2. New ones come up one at a time, old ones retire one at a time, service never stops" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="ru" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="88" y="24" fill="#9aa4b2" font-size="10" text-anchor="middle">start</text>
    <text x="290" y="24" fill="#9aa4b2" font-size="10" text-anchor="middle">updating</text>
    <text x="492" y="24" fill="#9aa4b2" font-size="10" text-anchor="middle">done</text>
    <rect x="53" y="36" width="70" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="88" y="56" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v1</text>
    <rect x="53" y="74" width="70" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="88" y="94" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v1</text>
    <rect x="53" y="112" width="70" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="88" y="132" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v1</text>
    <rect x="255" y="36" width="70" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="290" y="56" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v1</text>
    <rect x="255" y="74" width="70" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="290" y="94" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v1</text>
    <rect x="255" y="112" width="70" height="30" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="290" y="132" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v2</text>
    <rect x="457" y="36" width="70" height="30" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="492" y="56" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v2</text>
    <rect x="457" y="74" width="70" height="30" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="492" y="94" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v2</text>
    <rect x="457" y="112" width="70" height="30" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="492" y="132" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v2</text>
    <line x1="130" y1="89" x2="248" y2="89" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ru)"/>
    <line x1="332" y1="89" x2="450" y2="89" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ru)"/>
    <text x="88" y="176" fill="#4f6df5" font-size="9" text-anchor="middle">■ old v1</text>
    <text x="200" y="176" fill="#54b890" font-size="9" text-anchor="middle">■ new v2</text>
    <text x="290" y="198" fill="#9aa4b2" font-size="9.5" text-anchor="middle">one new up, one old down → service never stops; broke? kubectl rollout undo, back in one step</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Rolling update: swap a little at a time, old and new hand over, service never stops; underneath, the Deployment starts a new ReplicaSet (v2) and slowly scales the old one (v1) down to 0</figcaption>
</figure>

The mechanism underneath is the same one again: during an update the Deployment starts a **new ReplicaSet (v2)**, scaling it up while scaling the old ReplicaSet (v1) down. What if it breaks? Because the old ReplicaSet is still there, **one `kubectl rollout undo` takes you back to v1 in seconds.**

Day-to-day operation is really just these few lines, all of them "change the desired state":

```bash
kubectl apply -f web.yaml                    # declare desired state (3 copies of v1)
kubectl set image deploy/web web=web:2.0     # change version → triggers a rolling update
kubectl rollout undo deploy/web              # broke → one-step rollback
kubectl scale deploy/web --replicas=5        # change the count → loop fills up to 5
```

Notice: from start to finish you **never issued a single "start container" or "stop container" command** — you just kept updating that "desired state", and the reconcile loop converged reality onto it.

> **A common pit: if I change a ConfigMap / Secret, do the Pods swap automatically? No.** The reconcile loop watches the Deployment's **Pod template**; when you `kubectl edit` a referenced [[k8s-config-secret|ConfigMap/Secret]], the template itself hasn't changed, so the Deployment **won't trigger a rolling update**. Pods injected via env **keep the old values** until you run `kubectl rollout restart deploy/web` by hand (or add a content-hash annotation to the template so the template changes whenever the value does, rolling automatically). Files mounted via volume do get updated by the kubelet, but **the application has to re-read them** for the change to take effect. In one sentence: **a rolling update only asks "did the template change", never "did the thing the template points at change".**

## Reflections

### "Self-healing" isn't magic; it's that loop running all the time

The first time you see a Pod get killed and reappear on its own a few seconds later, it really does feel magical. But take it apart and there's nothing mystical: **the ReplicaSet controller just keeps asking "how many actually? how far from desired?" and acts on any difference.** Once that clicked, K8s's "resilience" stopped being black magic for me and became a very plain loop — which also gives my debugging direction: if a service isn't being pulled back, odds are this loop is stuck on something (not enough resources to schedule, a health check failing forever…), not "voodoo". **Reducing the magical to its mechanism is the first step in how I learn any system.**

### Rolling updates turn "deployment" from a tense event into routine

I'm all in on this. Deployment used to be a big event: pick the middle of the night, everyone on standby, terrified of interrupting service. With a Deployment's rolling update plus one-step rollback, deploying becomes **a low-risk routine action** — the new version slowly takes over, and if it breaks you're back in seconds. It's the same sense of safety as the "Production jobs must be idempotent and re-runnable" I described in the [[airflow-scheduling|Airflow]] post: **make "change" reversible and controllable, and people dare to move forward in frequent small steps**, instead of hoarding a giant bundle and betting it all once.

### You declare "what you want", not "how to do it" — Deployment is the best demonstration

The spine of the whole series is most concrete in this post: what you give a Deployment is always a **target state** (3 copies, v2), never **steps** (start this first, then stop that). That "desired state" can also go into Git, be versioned, be reviewed — the declarative + GitOps dividend from [[k8s-intro|the first post]]. Service, StatefulSet, HPA — everything you meet later is the same pattern applied differently. **Hold on to "declare the desired state, let the loop converge", and the rest of K8s is variations on a theme.**
