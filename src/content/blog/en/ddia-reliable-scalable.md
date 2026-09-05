---
title: "Reliable, Scalable, Maintainable: The Three Goals of a Data System"
date: 2026-07-11
category: tech
description: "DDIA opens with a fundamental question: what should a good data system actually pursue? The answer is three non-functional requirements — reliable (keeps working when things go wrong), scalable (holds up as load grows), maintainable (lets people work on it well). Features decide whether a system is usable; these three decide whether it survives. This is the origin of the whole series, and of reliability engineering."
tags:
  - distributed-systems
  - book-notes
series: "Designing Data-Intensive Applications — Reading Notes"
seriesOrder: 1
comments: true
draft: false
translationOf: ddia-reliable-scalable
---
Starting a new series: reading Martin Kleppmann's *Designing Data-Intensive Applications* (DDIA). It complements [[fode-1|FoDE]] — FoDE is the practical map of data engineering, DDIA is the theory of *why distributed data systems look the way they do*. And the skeleton of the whole book is a fundamental question the first chapter asks: **what should a good data system actually pursue?** The answer is three goals: reliable, scalable, maintainable. This post also happens to be the theoretical source of the reliability line I'm writing in the [[sre-intro|SRE]] series.

## Modern systems compete on data, not compute

Start with the *data-intensive* in the title. For most applications today, the bottleneck **isn't a CPU that can't compute fast enough — it's data**: the volume of it, its complexity, the speed at which it changes. Your system has to store data, query it, remember results, move it between services. So the hard part is no longer "how fast is the algorithm" but "with this much data, how do I store it reliably, query it fast enough, and still be able to change it". That's exactly what the three goals answer.

## The three goals that decide success

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="The three goals of a data system. Reliability means the system keeps working when things go wrong: the point is fault tolerance rather than the absence of faults, a fault is not a failure, and faults are deliberately injected to test. Scalability means the system holds up as load grows: describe the load first, measure performance with percentiles, and choose between scaling up and scaling out. Maintainability means people can work on the system well: operability, avoiding accidental complexity, and evolvability." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="16" y="34" width="176" height="150" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/>
    <text x="104" y="56" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">Reliability</text>
    <text x="104" y="72" fill="#9aa4b2" font-size="8.5" text-anchor="middle">keeps working when things go wrong</text>
    <text x="30" y="98" fill="#e6e6e6" font-size="8.7" text-anchor="start">· fault-tolerant, not fault-free</text>
    <text x="30" y="118" fill="#e6e6e6" font-size="8.7" text-anchor="start">· fault ≠ failure</text>
    <text x="30" y="138" fill="#e6e6e6" font-size="8.7" text-anchor="start">· deliberately inject faults</text>
    <text x="30" y="158" fill="#9aa4b2" font-size="8" text-anchor="start">hardware / software / human error</text>
    <rect x="202" y="34" width="176" height="150" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="290" y="56" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">Scalability</text>
    <text x="290" y="72" fill="#9aa4b2" font-size="8.5" text-anchor="middle">holds up as load grows</text>
    <text x="216" y="98" fill="#e6e6e6" font-size="8.7" text-anchor="start">· describe the load first</text>
    <text x="216" y="118" fill="#e6e6e6" font-size="8.7" text-anchor="start">· measure with percentiles</text>
    <text x="216" y="138" fill="#e6e6e6" font-size="8.7" text-anchor="start">· scale up vs scale out</text>
    <text x="216" y="158" fill="#9aa4b2" font-size="8" text-anchor="start">know the load before adding machines</text>
    <rect x="388" y="34" width="176" height="150" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.6"/>
    <text x="476" y="56" fill="#d6a45c" font-size="11" text-anchor="middle" font-weight="bold">Maintainability</text>
    <text x="476" y="72" fill="#9aa4b2" font-size="8.5" text-anchor="middle">lets people work on it well</text>
    <text x="402" y="98" fill="#e6e6e6" font-size="8.7" text-anchor="start">· Operability</text>
    <text x="402" y="118" fill="#e6e6e6" font-size="8.7" text-anchor="start">· Simplicity</text>
    <text x="402" y="138" fill="#e6e6e6" font-size="8.7" text-anchor="start">· Evolvability</text>
    <text x="402" y="158" fill="#9aa4b2" font-size="8" text-anchor="start">complexity is paid for by others</text>
    <text x="290" y="204" fill="#9aa4b2" font-size="8.7" text-anchor="middle">Three non-functional requirements — features decide if it works; these decide if it survives</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The whole book is really these three goals unfolded: replication, partitioning and consistency later on all exist to achieve reliable, scalable and maintainable at the same time, in a world where there's a lot of data and machines break</figcaption>
</figure>

The core idea of **Reliability** is that the goal isn't "no errors" but "**keeps working despite errors**" — fault-tolerant, not fault-eliminating. There's an important distinction here: **a fault is one component deviating from its spec; a failure is the system as a whole stopping to serve users.** You can't stop faults from happening (hardware dies, people slip, software has bugs), but you can design so that a fault doesn't turn into a failure. The most counter-intuitive and most powerful move is **deliberately inducing faults** — like Netflix's Chaos Monkey randomly killing production machines, forcing you to get fault tolerance right on ordinary days. That whole way of thinking is the theoretical foundation of the [[sre-intro|SRE]] line.

**Scalability** is a system's ability to keep coping as load grows. Its most counter-intuitive point: before you talk about scaling, you have to be able to **describe concretely what the load looks like** — read/write ratio, where the hot spots are, how big the fan-out is; without measuring those first, "add machines" has nothing to start from. This is the lead-in to the book's entire Part II, so I'll expand on it in its own section below.

**Maintainability** is often neglected, but it decides a system's long-term cost. Three design principles: **Operability** (make operations easy — good monitoring, enough automation, echoing [[sre-toil|eliminating toil]]), **Simplicity** (manage complexity, cut the "accidental complexity"), and **Evolvability** (make the system easy to change, because requirements will).

Of the three, scalability drags in the most questions, so it deserves its own section.

## Scalability: first ask what the load looks like

Most people hear "scaling" and think "add machines". But DDIA's insight is: **the first step in scaling isn't adding machines, it's describing your load parameters** — read/write ratio, requests per second, the data's fan-out, the distribution of hot spots. Without understanding the load first, you can't pick the right architecture. The book's classic example is the two ways of building Twitter's home timeline:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Two kinds of fan-out for Twitter's timeline. Fan-out on read: posting writes one row, and when a reader opens their timeline the tweets of everyone they follow are merged on the spot — reads are expensive and writes are cheap. Fan-out on write: posting pushes the tweet into every follower's inbox — writes are expensive and reads are cheap. Which to pick depends on the read/write ratio and the fan-out distribution, and Twitter uses a hybrid." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="dd" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="16" x2="290" y2="172" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="28" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">Fan-out on read</text>
    <rect x="30" y="46" width="60" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="60" y="62" fill="#9aa4b2" font-size="8" text-anchor="middle">tweet</text>
    <rect x="30" y="84" width="60" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="60" y="100" fill="#9aa4b2" font-size="8" text-anchor="middle">tweet</text>
    <rect x="30" y="122" width="60" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="60" y="138" fill="#9aa4b2" font-size="8" text-anchor="middle">tweet</text>
    <rect x="182" y="72" width="76" height="48" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="220" y="92" fill="#e6e6e6" font-size="8.7" text-anchor="middle">reader</text><text x="220" y="106" fill="#9aa4b2" font-size="7.5" text-anchor="middle">timeline</text>
    <line x1="92" y1="58" x2="180" y2="88" stroke="#9aa4b2" stroke-width="1" marker-end="url(#dd)"/>
    <line x1="92" y1="96" x2="180" y2="96" stroke="#9aa4b2" stroke-width="1" marker-end="url(#dd)"/>
    <line x1="92" y1="134" x2="180" y2="104" stroke="#9aa4b2" stroke-width="1" marker-end="url(#dd)"/>
    <text x="150" y="164" fill="#9aa4b2" font-size="8.2" text-anchor="middle">merge all follows on read → reads cost, writes cheap</text>
    <text x="430" y="28" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">Fan-out on write</text>
    <rect x="302" y="72" width="70" height="48" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="337" y="92" fill="#e6e6e6" font-size="8.7" text-anchor="middle">author</text><text x="337" y="106" fill="#9aa4b2" font-size="7.5" text-anchor="middle">one tweet</text>
    <rect x="474" y="46" width="76" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="512" y="62" fill="#9aa4b2" font-size="7.8" text-anchor="middle">follower inbox</text>
    <rect x="474" y="84" width="76" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="512" y="100" fill="#9aa4b2" font-size="7.8" text-anchor="middle">follower inbox</text>
    <rect x="474" y="122" width="76" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="512" y="138" fill="#9aa4b2" font-size="7.8" text-anchor="middle">follower inbox</text>
    <line x1="372" y1="88" x2="472" y2="58" stroke="#9aa4b2" stroke-width="1" marker-end="url(#dd)"/>
    <line x1="372" y1="96" x2="472" y2="96" stroke="#9aa4b2" stroke-width="1" marker-end="url(#dd)"/>
    <line x1="372" y1="104" x2="472" y2="134" stroke="#9aa4b2" stroke-width="1" marker-end="url(#dd)"/>
    <text x="430" y="164" fill="#9aa4b2" font-size="8.2" text-anchor="middle">push to every follower on write → writes cost, reads cheap</text>
    <text x="290" y="196" fill="#9aa4b2" font-size="8.2" text-anchor="middle">Pick by load shape (read/write ratio, fan-out). Twitter's hybrid: on write for most, on read for celebrities</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The same feature (viewing a timeline), two fan-outs, two cost structures — and which one is right depends entirely on the shape of the load. That's why "describe the load first" is step one of scaling: without measuring the read/write ratio, you can't pick the right approach at all</figcaption>
</figure>

There's one more key to describing "performance", and it echoes the diagram I drew in the [[sre-monitoring|SRE monitoring]] post directly: **look at response time as a percentile (p99), not an average** — an average hides the tail, the group of users with the worst experience. That isn't a coincidence; DDIA and SRE are describing the same thing, one from system design and one from operations. Only then does *how* to scale come up — scale up (a stronger machine) vs scale out (more machines) — and all the hard problems scaling out brings (where does the data live, how does it sync, what happens when it breaks) are the entire content of the book's Part II.

## Reflections

### The "three -ilities" are my default checklist for any system

Reliable, scalable, maintainable — these three non-functional requirements decide a system's long-term life or death more than "can the feature be built" does. A buggy feature can be fixed, but a system that isn't reliable, won't scale and nobody dares change will slowly drag the team down. When I review architecture now I deliberately run these three as a checklist: what happens when it hits a fault? What happens when load grows tenfold? Can someone else take it over and change it in three months? **Plenty of designs that look clever in the moment fall apart under those three questions** — the most practical pair of glasses I took from this chapter.

### The first step in scaling isn't "add machines", it's "describe the load"

An engineer's reflex when scaling comes up is machines, sharding, Kubernetes. DDIA's reminder is the step before that: **you have to be able to describe your load quantitatively** — what's the read/write ratio? Where are the hot spots? How big is the fan-out? The Twitter example says it best: without first establishing "reads vastly outnumber writes, but celebrity fan-out explodes", you can't even choose between fan-out on read and fan-out on write, and no number of machines will help. That's the same sentence as what I keep saying in [[pain-before-power|confirm the pain before you bring in the heavy weapons]] — **measure the problem first, or the solution means nothing.**

### Accidental complexity is maintainability's enemy number one

DDIA splits complexity into two kinds: **essential complexity** (the problem itself is hard) and **accidental complexity** (what we made ourselves). The first can't be avoided; the second can be cut — and most of it comes from over-design, abstractions added to show off, and "flexibility" prepared for things that haven't happened yet. That's the same belief as SRE's Simplicity and as [[sre-toil|eliminating toil]]: **keep it simple when you can, because the cost of complexity is paid by everyone who maintains it later.** I increasingly believe the mark of seniority isn't "how complex a system I can build" but "how simply I can build what needs building" — leaving a system that the me of three months from now, or the colleague who inherits it, can read and change.
