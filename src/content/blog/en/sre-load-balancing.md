---
title: "Load Balancing: Pick the Right Datacenter, Then the Right Machine"
date: 2026-07-14
category: tech
description: "Incoming traffic has to answer two questions at two levels: which datacenter? and once inside, which machine? Those are two different layers of load balancing. This post covers what the frontend and in-datacenter layers each care about, and a trap many have stepped in — Round Robin's even-handed sharing looks fair, but it assumes every request weighs the same, every machine is equally strong, and none is broken; all three assumptions are wrong, so \"evenly distributed\" isn't \"evenly loaded\". The most counter-intuitive trap: a machine that fails fast looks the least busy, and so attracts the most traffic."
tags:
  - sre
  - networking
series: "Google SRE — Reading Notes"
seriesOrder: 13
comments: true
draft: false
translationOf: sre-load-balancing
---
Between a user sending a request and the request being handled, it passes through **two layers** of load balancing, answering two questions at different levels: **which datacenter?** and, once inside, **which machine?** The two layers care about completely different things, and load balancing gets much clearer once you look at them separately.

## Two layers: pick the datacenter, then the machine

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 206" role="img" aria-label="A request passes through two layers of load balancing. The user first reaches the frontend load balancer, which picks one of several datacenters by geography, health and capacity, using DNS, Anycast and VIPs. Inside the datacenter, the in-datacenter load balancer hands the request to a backend task based on real load and health. The two layers answer different questions: the frontend decides which datacenter, the in-datacenter layer decides which machine." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="lb" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">One request, two layers of load balancing</text>
    <rect x="12" y="58" width="72" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="48" y="79" fill="#e6e6e6" font-size="9" text-anchor="middle">user</text><text x="48" y="94" fill="#9aa4b2" font-size="7.6" text-anchor="middle">anywhere</text>
    <line x1="84" y1="81" x2="106" y2="81" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#lb)"/>
    <rect x="108" y="50" width="132" height="62" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="174" y="70" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">① Frontend LB</text><text x="174" y="86" fill="#e6e6e6" font-size="8" text-anchor="middle">which datacenter?</text><text x="174" y="101" fill="#9aa4b2" font-size="7.4" text-anchor="middle">DNS · Anycast · VIP</text>
    <text x="174" y="128" fill="#9aa4b2" font-size="7.8" text-anchor="middle">by geography / health / capacity</text>
    <line x1="240" y1="81" x2="262" y2="81" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#lb)"/>
    <rect x="264" y="58" width="64" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="296" y="78" fill="#e6e6e6" font-size="8.6" text-anchor="middle">datacenter</text><text x="296" y="93" fill="#9aa4b2" font-size="7.6" text-anchor="middle">(chosen)</text>
    <line x1="328" y1="81" x2="350" y2="81" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#lb)"/>
    <rect x="352" y="50" width="132" height="62" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.5"/><text x="418" y="70" fill="#54b890" font-size="9.6" text-anchor="middle" font-weight="bold">② In-datacenter LB</text><text x="418" y="86" fill="#e6e6e6" font-size="8" text-anchor="middle">which machine?</text><text x="418" y="101" fill="#9aa4b2" font-size="7.4" text-anchor="middle">by real load / health</text>
    <line x1="484" y1="70" x2="512" y2="61" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lb)"/>
    <line x1="484" y1="81" x2="512" y2="81" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lb)"/>
    <line x1="484" y1="92" x2="512" y2="101" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lb)"/>
    <rect x="514" y="52" width="54" height="18" rx="4" fill="#262b3a" stroke="#54b890" stroke-width="1"/><text x="541" y="65" fill="#e6e6e6" font-size="7.4" text-anchor="middle">task 1</text>
    <rect x="514" y="72" width="54" height="18" rx="4" fill="#262b3a" stroke="#54b890" stroke-width="1"/><text x="541" y="85" fill="#e6e6e6" font-size="7.4" text-anchor="middle">task 2</text>
    <rect x="514" y="92" width="54" height="18" rx="4" fill="#262b3a" stroke="#54b890" stroke-width="1"/><text x="541" y="105" fill="#e6e6e6" font-size="7.4" text-anchor="middle">task 3</text>
    <text x="174" y="164" fill="#9aa4b2" font-size="8.2" text-anchor="middle">handles "across datacenters":</text><text x="174" y="178" fill="#9aa4b2" font-size="8.2" text-anchor="middle">proximity, avoid dead sites, spread capacity</text>
    <text x="418" y="164" fill="#9aa4b2" font-size="8.2" text-anchor="middle">handles "inside the datacenter":</text><text x="418" y="178" fill="#9aa4b2" font-size="8.2" text-anchor="middle">don't overload one, don't feed the broken</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The <b style="color:#4f6df5">frontend LB</b> uses DNS / Anycast / VIPs to steer users to the best datacenter — but DNS has built-in limits (it gets cached, doesn't update until the TTL expires, can't see backend health), so you can't rely on it alone. The <b style="color:#54b890">in-datacenter LB</b> is where the real per-request, live-load, health-aware fine-grained distribution happens. This layer is exactly what a K8s <a href="/blog/k8s-service/">Service</a> does: it stands in front of a group of Pods and sends traffic only to the healthy ones</figcaption>
</figure>

The frontend layer deals with problems at the level of "geography and disaster": steer the user to a datacenter that's **near them, still alive, and has room**. The usual tools are DNS, Anycast, VIPs — but DNS has an inherent weakness: it's cached layer upon layer, doesn't update until the TTL runs out, and **can't see whether the backend is healthy right now**. So DNS can only do coarse-grained splitting; the fine work is left to the in-datacenter layer.

## Why Round Robin isn't good enough

Inside the datacenter, the most intuitive method is **Round Robin** — requests go to each machine in turn, everyone gets an equal share. Sounds fair, but it quietly assumes three things, and in reality **all three are wrong**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Round Robin versus weighting by real load. Left, Round Robin takes turns: every machine gets the same number of requests, but requests differ in weight, machines differ in strength, and some are broken, so some machines overload while others sit idle, uneven load. Right, weight by real load: use the utilisation the backends report to decide who gets what, busy ones get less, weak ones get less, unhealthy ones get none, load truly balanced. Trap: a fast-failing machine looks the least busy and gets buried instead." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rb" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="16" x2="290" y2="158" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="28" fill="#e0733a" font-size="9.5" text-anchor="middle" font-weight="bold">Round Robin (take turns)</text>
    <rect x="24" y="40" width="252" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="150" y="57" fill="#e6e6e6" font-size="8.2" text-anchor="middle">every machine gets "the same request count"</text>
    <rect x="24" y="72" width="252" height="42" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="150" y="89" fill="#9aa4b2" font-size="8" text-anchor="middle">but requests differ in weight, machines in strength,</text><text x="150" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">and some are simply broken</text>
    <line x1="150" y1="116" x2="150" y2="126" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rb)"/>
    <rect x="24" y="128" width="252" height="28" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="150" y="146" fill="#e0733a" font-size="8.8" text-anchor="middle" font-weight="bold">some overloaded, some idle → uneven load</text>
    <text x="430" y="28" fill="#54b890" font-size="9.5" text-anchor="middle" font-weight="bold">Weight by real load</text>
    <rect x="304" y="40" width="252" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="430" y="57" fill="#e6e6e6" font-size="8.2" text-anchor="middle">decide by the utilisation backends report</text>
    <rect x="304" y="72" width="252" height="42" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="430" y="89" fill="#9aa4b2" font-size="8" text-anchor="middle">busy ones get less, weak ones get less,</text><text x="430" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">unhealthy ones get none</text>
    <line x1="430" y1="116" x2="430" y2="126" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rb)"/>
    <rect x="304" y="128" width="252" height="28" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="430" y="146" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">load truly balanced</text>
    <text x="290" y="182" fill="#d6a45c" font-size="8.8" text-anchor="middle" font-weight="bold">⚠ Trap: a "fast-failing" machine looks the least busy</text>
    <text x="290" y="198" fill="#9aa4b2" font-size="8.3" text-anchor="middle">→ so it attracts the most traffic and gets buried (failure attracts traffic)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Round Robin evens out the "request count", but what we actually want to even out is "load" — and requests come light and heavy, machines strong and weak, so the two aren't equivalent at all. Hence weighting by the <b>live utilisation the backends report</b>. The most insidious trap: a broken machine that "returns errors instantly" looks the most attractive to a "pick the least busy" strategy, so all the traffic pours in and makes things worse</figcaption>
</figure>

So the better approach is to have backends **actively report their live utilisation**, and let the LB weight by it (Weighted Round Robin) — busy ones get less, weak ones get less, unhealthy ones get none. And that trap of "fast failure attracts traffic" is in essence a form of [[sre-cascading-failures|cascading failure]]: the broken node not only isn't isolated, it's rewarded with more traffic.

## Two practical details that are easy to overlook

- **Subsetting**: if every client opens connections to **every** backend, `N × M` connections blow up. In practice each client connects only to a **subset** — saving a great deal of connection and health-check cost without giving up much balance.
- **Lame duck state**: when taking a machine out of service, don't just kill it — it may have requests half-processed. The right way is to enter "lame duck" first: **tell the LB to stop sending new requests, but finish the ones in hand**, drain, and only then shut down. Healthy → lame duck (draining) → dead, not a clean chop. It's the same thinking as K8s readiness probes plus graceful shutdown.

## Reflections

### "Evenly distributed" isn't "evenly loaded" — a trap I've stepped in

Round Robin's most seductive quality is that it **looks so fair** — each machine takes one in turn; what could be more even? But I've been burned by it myself: years ago I built a service with Round Robin in front, the load-test numbers looked great, and after launch there were always one or two machines with unusually high CPU and occasional timeouts. It took a long dig to understand that the problem wasn't the machines; it was **that I'd evened out the wrong thing**: I balanced "request count", but some requests ran a very heavy query and some returned instantly, and the machine specs were a mix of new and old. **Equal counts, wildly different load.** Since then, for any "even split" mechanism I ask one more question: **is the unit I'm splitting the same thing as what I actually want to balance?** Splitting requests, connections, partitions — these are often not the same as splitting "real work".

### Broken things attracting traffic is the most counter-intuitive failure

"Pick the least busy machine" sounds unquestionably right, until you realise: **a machine spraying errors at top speed is, in the eyes of "pick the least busy", the least busy one** — it responds fast (with errors, but fast) and its queue is empty. So the load balancer cheerfully steers all the traffic there, which amounts to escorting every user into the fire. That trap taught me: health can't be judged by "responds quickly" alone; it has to be "**actually did the job right**". Fast failure that isn't correctly marked unhealthy is more dangerous than slowness — it disguises itself as high performance. It's also why health checks ([[sre-monitoring|monitoring]]) have to look at **success rate**, not latency alone.

### Graceful exit is the dividing line of a mature system

The lame duck concept struck a chord, because "how to take a machine down safely" looks small yet best separates mature systems from immature ones. An immature system takes machines down with **a clean chop** — every half-finished request becomes an error in a user's eyes; a mature system **blocks new work first, finishes the old, and leaves only once drained**. I've felt the same thing repeatedly on K8s: when a Pod is about to be replaced, it first gets removed from the [[k8s-service|Service]]'s list and stops taking new traffic, then gets a grace period to wrap up. **Whether you can exit gracefully often shows more skill than whether you can launch impressively** — because on exit you're facing "real traffic in flight", and that can't be faked.
