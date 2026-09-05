---
title: "Service: A Fixed Address in Front of Short-Lived Pods"
date: 2026-07-07
category: tech
description: "Pods get replaced at any moment and their IPs change, so how do other services find them reliably? The answer is a Service — a fixed IP and DNS name standing in front of a group of Pods that come and go, automatically spreading traffic across the healthy ones. This post covers the Service, the Endpoints list behind it, and the types for exposing it outside."
tags:
  - kubernetes
  - concept
  - networking
series: "Kubernetes — Learning Notes"
seriesOrder: 4
comments: true
draft: false
translationOf: k8s-service
---
[[k8s-pod-node-scheduler|The second post]] left a question open: if Pods are short-lived and get a **new IP** when replaced, how do other services find them reliably? You can't hard-code one Pod's IP into a config — it might be gone the next second. This post's protagonist, the **Service**, is K8s's answer to that question: **a fixed address standing in front of a group of Pods that keep changing.**

## See the problem clearly first: Pod IPs can't be remembered

Every rolling update in [[k8s-deployment|the previous post]] replaces all the old Pods with new ones — **and new Pods have new IPs.** When a ReplicaSet replaces a crashed Pod, the replacement also has a **brand-new IP**. In other words, a Pod's IP **is inherently floating**. Any approach of "look up the backend Pod's IP, remember it, connect to it" is doomed to break after some reschedule or some rollout. You need something **that doesn't change** to act as the intermediary.

## Service: one fixed IP + one DNS name

The Service is that unchanging intermediary. You give it a **label selector** (say `app=web`), and it stands for **every Pod carrying that label**; outwardly it has a **fixed virtual IP (the ClusterIP)** and a **fixed DNS name**. Callers always hit this address, and the Service **load-balances** the traffic across the healthy Pods behind it:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 250" role="img" aria-label="The caller only hits the Service's fixed IP and DNS name; the Service selects a group of Pods with selector app=web and load-balances traffic across them. Behind it Pods come and go, an IP changes from .8 to .31, and the caller notices nothing" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="sv" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="20" y="95" width="110" height="60" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="75" y="120" fill="#e6e6e6" font-size="11" text-anchor="middle">caller</text>
    <text x="75" y="137" fill="#9aa4b2" font-size="8.5" text-anchor="middle">knows only the name web</text>
    <line x1="130" y1="125" x2="186" y2="125" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sv)"/>
    <rect x="188" y="86" width="192" height="80" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="284" y="107" fill="#4f6df5" font-size="11.5" font-weight="bold" text-anchor="middle">Service: web</text>
    <text x="284" y="124" fill="#9aa4b2" font-size="8" text-anchor="middle">fixed IP 10.96.0.10 · DNS web.*.svc</text>
    <text x="284" y="140" fill="#54b890" font-size="8.5" text-anchor="middle">selector: app=web</text>
    <text x="284" y="155" fill="#9aa4b2" font-size="8" text-anchor="middle">load-balances to healthy Pods</text>
    <line x1="380" y1="120" x2="436" y2="46" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#sv)"/>
    <line x1="380" y1="127" x2="436" y2="122" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#sv)"/>
    <line x1="380" y1="134" x2="436" y2="198" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#sv)"/>
    <rect x="438" y="24" width="150" height="44" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="513" y="42" fill="#e6e6e6" font-size="10" text-anchor="middle">Pod · 10.1.2.7</text>
    <text x="513" y="57" fill="#54b890" font-size="8.5" text-anchor="middle">✓ healthy</text>
    <rect x="438" y="100" width="150" height="44" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="513" y="118" fill="#e6e6e6" font-size="10" text-anchor="middle">Pod · IP changes</text>
    <text x="513" y="133" fill="#d6a45c" font-size="8.5" text-anchor="middle">died, replaced: .8 → .31</text>
    <rect x="438" y="176" width="150" height="44" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="513" y="194" fill="#e6e6e6" font-size="10" text-anchor="middle">Pod · 10.1.4.2</text>
    <text x="513" y="209" fill="#54b890" font-size="8.5" text-anchor="middle">✓ healthy</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The caller always hits the Service's fixed address; Pods behind it come and go and IPs keep changing, and it notices nothing — that's the Service's core value: a stable abstraction shielding a changing reality</figcaption>
</figure>

Declaring a Service is short; the point is that selector:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    app: web           # select every Pod with this label (however many, whatever their IPs)
  ports:
    - port: 80         # the port the Service exposes
      targetPort: 8080 # the port it actually forwards to on the Pod
```

With it, other services in the cluster connect by **name** — `http://web` (same namespace) or `http://web.default.svc.cluster.local` (the full form across namespaces). **Nobody needs to know which Pods are behind it, how many there are, or what their IPs are.**

## Behind it: a list that updates itself

How does the Service know which Pods should get traffic right now? Behind it sits an **Endpoints list (EndpointSlice in newer versions)** of "**the Pod IPs that currently match the selector and pass their health check**". And you don't maintain that list — **it's the reconcile loop again:**

- Pods added, removed, rescheduled, rolled out → the controller updates the list immediately.
- A Pod not yet ready (readiness probe failing) → **not added to the list**, no traffic sent to it.

This is exactly what lets a [[k8s-deployment|rolling update]] be "uninterrupted": a new Pod has to be **genuinely ready** before it enters the list and receives traffic, and an old one is removed only after it has drained. The pattern you saw in [[k8s-intro|the first post]] — declare a desired state, let the loop converge reality — shows up here once more; this time the thing being converged is "which Pods should receive traffic".

## From inside the cluster to the public internet: Service types

The ClusterIP above is reachable **only inside the cluster**. But some services have to be reachable from outside, so Services come in several types of increasing "exposure":

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 240" role="img" aria-label="Four ways to expose, from inside out: ClusterIP is cluster-internal only; NodePort opens a port on every Node; LoadBalancer gets a public IP from the cloud; Ingress is the L7 smart entry that routes by host or path to many Services" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <rect x="40" y="18" width="452" height="42" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="70" y="44" fill="#4f6df5" font-size="11" font-weight="bold" text-anchor="start">ClusterIP</text>
    <text x="180" y="44" fill="#9aa4b2" font-size="8.8" text-anchor="start">default · reachable only inside the cluster (backend to backend)</text>
    <rect x="40" y="68" width="452" height="42" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.7"/>
    <text x="70" y="94" fill="#54b890" font-size="11" font-weight="bold" text-anchor="start">NodePort</text>
    <text x="180" y="94" fill="#9aa4b2" font-size="8.8" text-anchor="start">a port on every Node; reach it via Node:Port (handy for testing)</text>
    <rect x="40" y="118" width="452" height="42" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.7"/>
    <text x="70" y="144" fill="#d6a45c" font-size="11" font-weight="bold" text-anchor="start">LoadBalancer</text>
    <text x="180" y="144" fill="#9aa4b2" font-size="8.8" text-anchor="start">the cloud provisions a public IP / LB; the production way</text>
    <rect x="40" y="168" width="452" height="42" rx="7" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.7"/>
    <text x="70" y="194" fill="#9b6ff0" font-size="11" font-weight="bold" text-anchor="start">Ingress</text>
    <text x="180" y="194" fill="#9aa4b2" font-size="8.8" text-anchor="start">L7 entry: one IP routes by host/path to many Services</text>
    <line x1="524" y1="24" x2="524" y2="204" stroke="#3a4154" stroke-width="1.4" marker-end="url(#ex)"/>
    <defs><marker id="ex" markerWidth="9" markerHeight="9" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="548" y="100" fill="#9aa4b2" font-size="9" text-anchor="middle" transform="rotate(90 548 110)">more exposed</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Layer by layer, the service is pushed from inside the cluster towards the public internet. In practice external exposure is mostly "an Ingress behind a LoadBalancer, routing traffic by path to the various ClusterIP Services" — they all end up pointing at the same kind of internal address</figcaption>
</figure>

The most common combination in practice is **one external [[k8s-ingress-dns|Ingress]] (or LoadBalancer) + a bunch of internal ClusterIP Services**: only one entry is opened to the outside, and traffic is routed by URL to each service once inside (how L7 routing and TLS termination work is the subject of post 9). As for one variant of ClusterIP — the **headless Service** (no virtual IP, no load balancing; instead DNS gives you **every** Pod directly) — stateful services (databases, [[k8s-pod-node-scheduler|StatefulSets]]) use it, and post 6 covers it.

## Reflections

### "A stable abstraction in front of a changing reality" is K8s's signature move

The more I think about the Service design, the more beautiful I find it: it didn't make Pods more stable; it **accepted that Pods will change**, then put a permanent address in front of them. It's the other face of the same philosophy as [[k8s-pod-node-scheduler|the second post]]'s "Pods are cattle, not pets" — you don't tame the thing that changes; you put an unchanging interface in front of it. I enjoyed the benefit in the [[airflow-spark-on-k8s|Airflow + Spark on K8s]] post: Spark executors come and go, but the driver they need to find is reachable by one fixed Service name, regardless of which node the driver Pod landed on or what its IP is. **Once you're used to the pattern of "wrap short-lived entities in a stable abstraction", the rest of K8s — Volume, StatefulSet, Ingress — is variations on it.**

### Services recognise each other by "name", not by IP

Moving from hard-coded IPs to connecting by DNS name is a bigger shift than it looks. The most painful part of microservices calling each other used to be the brittle coupling of "that machine's IP changed, that port moved"; in K8s, the name `http://web` is **valid almost forever**, however the Pods underneath move, scale up or down. It changes how I think about service boundaries entirely — **what I depend on is a stable contract (name + port), not a fragile location (IP).** It's also why, looking at any system now, my first question is: "is the coupling here to a name or to a location?" Coupling to a location sooner or later pays the price of that location changing.

### The reconcile loop again — only with a different thing being converged

Writing this post made me more certain of [[k8s-intro|the first post]]'s judgment: **the reconcile loop is the master key to understanding K8s.** A Deployment converges "the number of Pods"; the Endpoints behind a Service converge "which Pods should receive traffic"; it's the same loop in essence. That's especially useful for debugging: when "the service can't reach its backend", I don't guess blindly; I go straight to that list — are the Endpoints empty? Odds are a selector label is misspelled, or a Pod's readiness probe never passed so it never made the list. **Reduce every feature to "who is converging what", and problems stop being voodoo and become a line you can follow on the map.**
