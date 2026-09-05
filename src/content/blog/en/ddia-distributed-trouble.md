---
title: "The Trouble with Distributed Systems: Unreliable Networks, Untrustworthy Clocks, and Half-Dead Nodes"
date: 2026-07-24
category: tech
description: "DDIA Ch8 is the most philosophical and the most practical chapter in the book: on a single machine things are either all working or all broken; in a distributed world the normal state is partial failure — half-dead. Three unreliabilities run through the chapter: the network (a request gets no response, and you can never tell which of four reasons is why; a timeout is only a guess), clocks (time-of-day clocks jump backwards, nodes are never in sync, and ordering events by timestamp silently loses data), and the process itself (a GC pause lets a node believe it's still alive). The conclusion allows one road only: you cannot be sure of any single node's state, so truth can only be decided by a majority."
tags:
  - distributed-systems
  - book-notes
  - reliability
series: "Designing Data-Intensive Applications — Reading Notes"
seriesOrder: 8
comments: true
draft: false
translationOf: ddia-distributed-trouble
---
[[ddia-transactions|The previous post]] ended on a hook: once a system spans several machines, even "locks" and "validation" themselves become unreliable. This chapter is the full reckoning of that "unreliable" — and, I think, the chapter in the whole book most worth reading closely. The core in one sentence: **a single machine is deterministic, either all working or all broken; in a distributed world the normal state is "partial failure" — some parts broken, the rest still running, and you often can't tell which is which.** Three unreliabilities, each deeper than the last: the network, clocks, then the node itself.

## Unreliable networks: "no response" has four causes, and you can't tell them apart

You send a request, and no response comes — **what happened?** The most important diagram in this chapter is the answer to that question: **you don't know, and in principle you can't.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 234" role="img" aria-label="Four indistinguishable reasons a request gets no response. Your node sends a request and waits; it could be: one, the request was lost on the network and the other side never received it; two, the other node crashed; three, the other side is merely slow, say in a GC pause, and will handle it shortly; four, the other side finished but the response was lost on the way back. All four look identical from your end: no response. Your only tool is a timeout, but when it fires it only means you decided to stop waiting, not that you know what happened — the other side may still be processing, or may already be done." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="dt8" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="20" y="80" width="110" height="56" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="75" y="104" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">your node</text>
    <text x="75" y="121" fill="#9aa4b2" font-size="7.4" text-anchor="middle">sent request, waiting…</text>
    <line x1="130" y1="100" x2="196" y2="52" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#dt8)"/>
    <line x1="130" y1="106" x2="196" y2="100" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#dt8)"/>
    <line x1="130" y1="112" x2="196" y2="148" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#dt8)"/>
    <line x1="130" y1="118" x2="196" y2="196" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#dt8)"/>
    <rect x="200" y="34" width="356" height="36" rx="6" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="212" y="49" fill="#e05a7d" font-size="8.2" text-anchor="start" font-weight="bold">① request lost on the network</text><text x="212" y="62" fill="#9aa4b2" font-size="7" text-anchor="start">the other side never received it</text>
    <rect x="200" y="82" width="356" height="36" rx="6" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="212" y="97" fill="#e05a7d" font-size="8.2" text-anchor="start" font-weight="bold">② the other node crashed</text><text x="212" y="110" fill="#9aa4b2" font-size="7" text-anchor="start">actually dead</text>
    <rect x="200" y="130" width="356" height="36" rx="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="212" y="145" fill="#d6a45c" font-size="8.2" text-anchor="start" font-weight="bold">③ the other side is just slow (overloaded, in a GC pause)</text><text x="212" y="158" fill="#9aa4b2" font-size="7" text-anchor="start">it'll handle it in a moment — may be handling it right now</text>
    <rect x="200" y="178" width="356" height="36" rx="6" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="212" y="193" fill="#e05a7d" font-size="8.2" text-anchor="start" font-weight="bold">④ it finished, but the "response" was lost on the way back</text><text x="212" y="206" fill="#9aa4b2" font-size="7" text-anchor="start">the action already happened, and you think it didn't</text>
    <text x="75" y="158" fill="#e0733a" font-size="7.6" text-anchor="middle" font-weight="bold">from your end:</text>
    <text x="75" y="172" fill="#e0733a" font-size="7.6" text-anchor="middle" font-weight="bold">all four identical</text>
    <text x="75" y="186" fill="#9aa4b2" font-size="7" text-anchor="middle">= no response</text>
    <text x="290" y="228" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">A timeout firing means "you decided to stop waiting", not "you know what happened"</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The four reasons a request gets no response — <b style="color:#e05a7d">the request was lost, the other side died, the response was lost</b>, or <b style="color:#d6a45c">the other side is merely slow</b> — <b>look exactly the same</b> from your end. Your only tool is the <b>timeout</b>, and it's a cruel compromise: too short, and you misjudge a merely slow node as dead (then resend the request, possibly doing the thing twice — the very root of the <a href="/blog/kafka-delivery/">exactly-once problem</a>); too long, and when it really is dead you sit waiting. The nastiest is ④: <b>the action already happened, and you think it didn't</b>. This diagram is where every distributed-systems trouble begins</figcaption>
</figure>

This "indistinguishability" isn't sloppy engineering, it's **the nature of an asynchronous network** — no mechanism can guarantee a message arrives within any bound. That's why [[redis-sentinel|Sentinel]] distinguishes subjective down (I think it's dead = my timeout fired) from objective down (**a majority** think it's dead), and why retries must be paired with [[airflow-reliability|idempotency]] — because the request you're resending **may already have succeeded the first time**.

## Untrustworthy clocks: if you want order, use sequence numbers, not time

The second unreliability is sneakier, because most of the time it looks perfectly normal. First separate the two kinds of clock on a machine, then look at the disaster of misusing them:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 238" role="img" aria-label="Two kinds of clock and the disaster of misusing timestamps. Top half: a time-of-day clock answers what time it is, gets corrected by NTP and may jump backwards, so it can only be used to label a moment; a monotonic clock only guarantees it moves forward, and is what you use to measure elapsed time — always use it for durations. Bottom half: the disaster of LWW deciding the winner by timestamp — node A's clock is 3 seconds fast, and its earlier write x=1 carries the timestamp 10:00:05; node B's clock is accurate, and its later write x=2 carries 10:00:03; LWW compares timestamps, and x=2, the newer write, is silently dropped because its timestamp is smaller. Conclusion: if you want order, use a monotonically increasing sequence number such as a log offset or fencing token, not the wall clock." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="20" y="16" width="266" height="70" rx="8" fill="#1f2330" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="153" y="36" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">time-of-day clock: "what time is it?"</text>
    <text x="153" y="54" fill="#9aa4b2" font-size="7.4" text-anchor="middle">corrected by NTP, may "jump backwards"</text>
    <text x="153" y="72" fill="#e0733a" font-size="7.2" text-anchor="middle" font-weight="bold">only for labelling a moment — never for ordering or timing</text>
    <rect x="294" y="16" width="266" height="70" rx="8" fill="#1f2330" stroke="#54b890" stroke-width="1.4"/>
    <text x="427" y="36" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">monotonic clock: "how long has it been?"</text>
    <text x="427" y="54" fill="#9aa4b2" font-size="7.4" text-anchor="middle">only guaranteed to move forward, never back</text>
    <text x="427" y="72" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">timeouts and durations: always this one</text>
    <text x="290" y="108" fill="#e6e6e6" font-size="9.4" text-anchor="middle" font-weight="bold">The disaster of misuse: LWW picks the winner by timestamp</text>
    <rect x="36" y="120" width="240" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="156" y="136" fill="#e6e6e6" font-size="7.8" text-anchor="middle">node A (clock 3s fast): writes x=1</text>
    <text x="156" y="152" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-family="monospace">timestamp = 10:00:05 (happened first)</text>
    <rect x="304" y="120" width="240" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="424" y="136" fill="#e6e6e6" font-size="7.8" text-anchor="middle">node B (clock accurate): writes x=2</text>
    <text x="424" y="152" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-family="monospace">timestamp = 10:00:03 (happened later)</text>
    <rect x="120" y="172" width="340" height="30" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.5"/>
    <text x="290" y="191" fill="#e05a7d" font-size="8.6" text-anchor="middle" font-weight="bold">LWW compares timestamps: x=2 (the newer write) silently dropped 💥</text>
    <text x="290" y="222" fill="#54b890" font-size="8.2" text-anchor="middle" font-weight="bold">Want order → a monotonic "sequence number" (log offset, fencing token), not the wall clock</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The top half is basics: a <b style="color:#4f6df5">time-of-day clock</b> gets corrected by NTP and <b>may jump backwards</b> — measure a duration with it and you can get a negative number; for timeouts and intervals always use the <b style="color:#54b890">monotonic clock</b>. The bottom half is the real disaster: multi-leader replication often uses <b>LWW (last write wins)</b> with timestamps to decide which conflicting write wins, but clocks across nodes are <b>never in sync</b> — a node whose clock is 3 seconds fast stamps its earlier write as "newer", so <b style="color:#e05a7d">the genuinely newer write is silently dropped</b>, no error, no alert. Carve this into the bone: <b>if you want the order of events, use a monotonically increasing sequence number (a Kafka offset, a fencing token) and never trust the wall clock</b></figcaption>
</figure>

## Half-dead nodes: you can't even be sure you're alive yourself

The third layer is the most philosophical: **even a node's own judgment can't be trusted.** A process can be paused between any two lines of code — a stop-the-world GC, a suspended VM, a page fault that won't finish — **for seconds or even minutes, with no awareness of it**. The moment it wakes, it believes it's still the leader, still holds the lock, but the world has long since moved on. That's exactly the scene I drew in the [[redis-distributed-lock|distributed lock]] post: a GC pause exceeds the TTL, and two clients "hold" the lock at once — and the fix (**fencing tokens**, a monotonically increasing number checked by the resource itself) was covered there too, so I won't redraw it here.

Put the three layers together and Ch8's conclusion emerges: **no single node's judgment — including its judgment of itself — can be trusted; so in a distributed system "truth" can only be the result of a majority vote (a quorum).** Even if a node believes it's alive, once a majority declares it dead, it *is* dead and must step aside. That's the thread laid all the way from [[redis-sentinel|Sentinel's majority]] to [[redis-cluster|Cluster's majority]] — and "how a majority safely reaches one decision" is exactly the subject of the next chapter, **consensus**. (As for Byzantine faults, where nodes lie: unless you're building a blockchain or flight systems, **assume nodes are honest but break** in your own datacenter — don't pay design tax for a threat model you'll never face.)

## Reflections

### A timeout isn't knowledge, it's a decision — once that clicks, retries and idempotency become articles of faith

That "four indistinguishable causes" diagram is the one I'd frame from the whole of DDIA. It punctures a common engineer's illusion: timeout fired = the other side is dead. No — **a timeout firing only means "you decided to stop waiting"; you still don't know whether the request never arrived, was half done, or was done with the response lost**. That "don't know" derives two practical rules I hold as discipline: first, **retries are mandatory, so idempotency isn't optional** (the foundation of the [[airflow-reliability|reliability post]] turns out to be rooted here); second, **any single node's verdict on life or death is only a guess, so to act you need a majority** ([[redis-sentinel|SDOWN→ODOWN]] turns out to have its theory here). One chapter gathered three practical habits scattered across Airflow, Redis and SRE into corollaries of the same axiom.

### "Want order? Use sequence numbers, not clocks" — data engineering uses this line every day

The scene where LWW drops data on timestamps should sting people in data especially, because we wrestle with its variants daily: [[spark-streaming|event time vs processing time]], late events, merge-sorting logs across datacenters. This chapter gave me one unified answer: **the wall clock is only for "rough labelling"; wherever correctness depends on order, use a monotonically increasing sequence number** — Kafka offsets, database LSNs, fencing tokens, all incarnations of this one principle. Now, designing any pipeline, when I see "use timestamp to decide which is newer" I stop and ask: **do these two timestamps come from the same clock?** If not, switch to a sequence number, or accept the approximation. The line is cheap, memorable, and blocks a whole class of silent data corruption.

### Partial failure isn't a bug to fix, it's a worldview to accept

After this chapter my respect for the word "distributed" went a layer deeper: **a single machine is the deterministic world of "all good or all broken"; distributed is the probabilistic world of "some part is always half-dead"** — and the latter isn't engineering that's not good enough, it's the nature of the thing. That gives me lessons on two levels. Downward, it explains why the [[k8s-intro|K8s reconcile loop]] and [[sre-cascading-failures|everything in SRE design]] revolve around "expect failure" — in this worldview reliability isn't "nothing goes wrong", it's **the system still converges when something does**. Upward, it endorses [[pain-before-power|confirm the pain first]] once more: **every machine you step beyond moves you from the deterministic world into the probabilistic one**, and that's a whole cognitive tax — network, clocks, quorums, fencing, all to be learned. If one machine can carry it, don't rush to distribute; if you truly must, treat this chapter as the entry ticket and read every word before setting out.
