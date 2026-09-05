---
title: "Distributed Consensus: How Machines That Crash Agree on One Thing"
date: 2026-07-14
category: tech
description: "Who is the leader? Who holds the lock? What's the latest value? In a world where machines crash, networks partition and clocks can't be trusted, getting a group of machines to agree on \"one thing\" is among the hardest problems in distributed systems. This post covers two things: why homebrew leader election with heartbeat + timeout ends in split brain the moment the network cuts, with data diverging beyond repair; and the core mechanism of consensus — majority voting — and why any two majorities must overlap, so conflicting decisions can never both stand. Conclusion: don't build your own consensus; use etcd, ZooKeeper and the other proven ones."
tags:
 - sre
 - distributed-systems
series: "Google SRE — Reading Notes"
seriesOrder: 14
comments: true
draft: false
translationOf: sre-consensus
---
A group of machines agreeing on "one thing" — **who is the leader? who holds this lock? what's the latest value?** — sounds simple, yet it's one of the **hardest** problems in distributed systems. Why? Because machines crash, networks partition, clocks can't be trusted, and under all that you need everyone to reach consensus on one answer, and **never diverge**.

## Why "rolling your own" goes wrong: split brain

The most intuitive homebrew solution: everyone sends heartbeats, whoever stops responding is treated as dead, and a new leader is elected. Fine on ordinary days, but **the moment the network cuts**, it breaks:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 208" role="img" aria-label="Homebrew leader election hits a network partition and splits its brain. One cluster is cut down the middle into two halves. On the left, Node A declares itself leader and accepts a write X equals 1. On the right, Node B also declares itself leader and accepts a write X equals 2. When the network heals, is X 1 or 2? Both sides believe they're right; the data has diverged and can't be reconciled." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Homebrew leader election: the network cuts, each side rules itself</text>
 <path d="M290,32 L282,52 L296,70 L286,92 L298,112 L290,132" fill="none" stroke="#e0733a" stroke-width="1.8" stroke-dasharray="1 0"/>
 <text x="290" y="150" fill="#e0733a" font-size="8.4" text-anchor="middle">network cut ✂</text>
 <rect x="40" y="44" width="200" height="88" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
 <text x="140" y="66" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">Left half: Node A</text>
 <text x="140" y="84" fill="#e6e6e6" font-size="8.6" text-anchor="middle">"no word from B → I'm leader"</text>
 <rect x="70" y="94" width="140" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="140" y="111" fill="#e6e6e6" font-size="8.6" text-anchor="middle">write arrives: X = 1</text>
 <rect x="340" y="44" width="200" height="88" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
 <text x="440" y="66" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">Right half: Node B</text>
 <text x="440" y="84" fill="#e6e6e6" font-size="8.6" text-anchor="middle">"no word from A → I'm leader"</text>
 <rect x="370" y="94" width="140" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="440" y="111" fill="#e6e6e6" font-size="8.6" text-anchor="middle">write arrives: X = 2</text>
 <rect x="120" y="164" width="340" height="34" rx="7" fill="#3a2626" stroke="#e0733a" stroke-width="1.4"/>
 <text x="290" y="179" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">Network heals: is X 1 or 2?</text>
 <text x="290" y="192" fill="#9aa4b2" font-size="8" text-anchor="middle">both think they're right → data diverges, unrecoverable (split brain)</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b>Split brain</b> is the classic death of homebrew consensus: the network partitions, each side "reasonably" concludes "the other is dead, I'll take over", and both accept writes at once. The frightening part isn't that someone died; it's that <b>both sides are alive and both believe they're right</b> — when the network heals, two contradictory copies of the data refuse to yield to each other, and the damage may be irreparable</figcaption>
</figure>

The root of the problem: **"the other side didn't respond" and "the other side is dead" are indistinguishable to you** — maybe the network just cut, and the other side is perfectly alive. The homebrew algorithm treats "can't hear you" as "dead", so under a partition both sides conclude "I should be leader". To cure it you need a mechanism that mathematically guarantees "never diverges".

## The core of consensus: majority (quorum)

Distributed consensus (Paxos, Raft and Zab are several implementations of it) rests on a principle you learned in primary school — **majority vote**: any decision must win the agreement of "more than half" the nodes to count. And "more than half" has one key property:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 210" role="img" aria-label="Majority: any two more-than-half sets must overlap. Five nodes N1 to N5, majority is three. Proposal A gets N1, N2, N3, three votes, passes. Proposal B wants N3, N4, N5, but N3 already agreed to A and refuses B, so B can't reach a majority and is blocked. Any two majorities must share at least one node, and that node refuses the second conflicting proposal, so two contradictory decisions can never both stand. Five nodes tolerate two failures; odd counts are the most economical." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Majority: any two "more than half" sets must overlap</text>
 <line x1="90" y1="58" x2="290" y2="58" stroke="#54b890" stroke-width="1.6"/><line x1="90" y1="58" x2="90" y2="78" stroke="#54b890" stroke-width="1.6"/><line x1="290" y1="58" x2="290" y2="78" stroke="#54b890" stroke-width="1.6"/>
 <text x="190" y="50" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">Proposal A → N1 N2 N3 (3 votes) ✓ passes</text>
 <line x1="290" y1="150" x2="490" y2="150" stroke="#e0733a" stroke-width="1.6"/><line x1="290" y1="130" x2="290" y2="150" stroke="#e0733a" stroke-width="1.6"/><line x1="490" y1="130" x2="490" y2="150" stroke="#e0733a" stroke-width="1.6"/>
 <text x="390" y="168" fill="#e0733a" font-size="8.6" text-anchor="middle" font-weight="bold">Proposal B → N3 N4 N5: N3 already took A → rejected ✗</text>
 <circle cx="90" cy="104" r="19" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="90" y="108" fill="#e6e6e6" font-size="9" text-anchor="middle">N1</text>
 <circle cx="190" cy="104" r="19" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="190" y="108" fill="#e6e6e6" font-size="9" text-anchor="middle">N2</text>
 <circle cx="290" cy="104" r="21" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.8"/><text x="290" y="101" fill="#e6e6e6" font-size="9" text-anchor="middle">N3</text><text x="290" y="114" fill="#d6a45c" font-size="6.6" text-anchor="middle">overlap</text>
 <circle cx="390" cy="104" r="19" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="390" y="108" fill="#e6e6e6" font-size="9" text-anchor="middle">N4</text>
 <circle cx="490" cy="104" r="19" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="490" y="108" fill="#e6e6e6" font-size="9" text-anchor="middle">N5</text>
 <text x="290" y="196" fill="#9aa4b2" font-size="8.3" text-anchor="middle">5 nodes → majority 3 · any two majorities share ≥1 node → no conflicting decisions · survives 2 down · use odd counts</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Why does a majority cure split brain? Because <b>any two majority sets must share at least one node</b> — and that node won't say yes to two conflicting proposals. So even under a partition, at most the side "holding the majority" can decide; the other side is automatically disabled, and two leaders can never coexist. It's also why consensus systems always use odd counts (3, 5): <code>2f+1</code> nodes tolerate <code>f</code> failures while keeping a majority</figcaption>
</figure>

With majorities, a consensus system gives two key guarantees: **safety — there will never be two contradictory decisions, and this holds under every circumstance**; and **liveness — as long as a majority of nodes are alive and can communicate, a conclusion will eventually be reached**. Note that safety is unconditional: even if the network is so broken that only half can talk, the system would rather stop (be unavailable) than **ever give a wrong answer** — which is exactly CAP's "choose consistency under partition".

## Three implementations of one problem: Paxos, Raft, Zab

"Majority" is the principle, but turning it into an algorithm that actually runs and doesn't go wrong has a terrifying amount of detail. Consensus isn't one algorithm but a family; the three names you hear most — **Paxos, Raft, Zab** — solve the same problem (use majority agreement to assemble an ordered log) but have very different personalities:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 214" role="img" aria-label="Three implementations of consensus compared. Paxos: proposed by Lamport in 1989, the theoretical origin, symmetric with no fixed leader, correct but notoriously hard to understand and implement, used by Chubby and Spanner. Raft: from Stanford in 2014, strong leader, the log flows one way from leader to followers, designed to be understandable, used by etcd, Consul, KRaft and CockroachDB. Zab: built into ZooKeeper, strong leader, orders state changes with zxid, centred on atomic broadcast with total order, optimised for coordination services; ZooKeeper in turn underpins old Kafka and HBase. All three solve the same problem; they differ in leader model and understandability, and modern systems mostly pick Raft." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">One problem, three implementations</text>
 <rect x="12" y="34" width="180" height="140" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="102" y="56" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">Paxos</text>
 <text x="26" y="82" fill="#e6e6e6" font-size="8" text-anchor="start">· 1989 · Lamport, the original</text>
 <text x="26" y="104" fill="#e6e6e6" font-size="8" text-anchor="start">· symmetric, no fixed leader</text>
 <text x="26" y="126" fill="#e6e6e6" font-size="8" text-anchor="start">· correct, but notoriously hard</text>
 <text x="26" y="156" fill="#9aa4b2" font-size="7.8" text-anchor="start">used by: Chubby, Spanner</text>
 <rect x="200" y="34" width="180" height="140" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
 <text x="290" y="56" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">Raft</text>
 <text x="214" y="82" fill="#e6e6e6" font-size="8" text-anchor="start">· 2014 · Stanford</text>
 <text x="214" y="104" fill="#e6e6e6" font-size="8" text-anchor="start">· strong leader, one-way log</text>
 <text x="214" y="126" fill="#e6e6e6" font-size="8" text-anchor="start">· built to be understandable</text>
 <text x="214" y="156" fill="#9aa4b2" font-size="7.8" text-anchor="start">used by: etcd, Consul, KRaft</text>
 <rect x="388" y="34" width="180" height="140" rx="8" fill="#2b2540" stroke="#9b6ff0" stroke-width="1.5"/>
 <text x="478" y="56" fill="#9b6ff0" font-size="11" text-anchor="middle" font-weight="bold">Zab</text>
 <text x="402" y="82" fill="#e6e6e6" font-size="8" text-anchor="start">· built into ZooKeeper</text>
 <text x="402" y="104" fill="#e6e6e6" font-size="8" text-anchor="start">· strong leader, zxid ordering</text>
 <text x="402" y="126" fill="#e6e6e6" font-size="8" text-anchor="start">· atomic broadcast (total order)</text>
 <text x="402" y="156" fill="#9aa4b2" font-size="7.8" text-anchor="start">used by: ZooKeeper → old Kafka</text>
 <text x="290" y="196" fill="#9aa4b2" font-size="8.3" text-anchor="middle">All three solve the same problem (majority → one ordered log); they differ in leader model and understandability</text>
 <text x="290" y="210" fill="#d6a45c" font-size="8" text-anchor="middle">Modern systems mostly pick Raft — you can actually implement it, and get it right</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Three roads to the same place: all use majority agreement to assemble a log every replica accepts, in the same order. The real differences are the <b>leader model</b> (classic Paxos is symmetric; Raft and Zab both have a strong leader) and <b>understandability</b> — which sounds soft, yet is the key to Raft overtaking the others to become the modern default: an algorithm you implement correctly beats one that's theoretically prettier but riddled with traps</figcaption>
</figure>

### Paxos: the theoretical origin, correct but hard to handle

Proposed by Leslie Lamport in 1989, it's the theoretical source of distributed consensus, mathematically proven correct. But it's **notoriously hard to understand**: the original paper only covers "reaching consensus on a single value" (basic Paxos), while real systems need consensus on "a sequence of values" (a log) — **Multi-Paxos** — and the paper is vague on that part, so every implementation looks different and the details are full of traps. Google's paper "Paxos Made Live" is entirely about "how much unwritten blood and tears lie between the paper and a shippable product". It's used by heavyweights like Google's Chubby and Spanner.

### Raft: born to be "understandable"

Proposed by Stanford in 2014, its motivation is right in the paper's title: "In Search of an Understandable Consensus Algorithm" — it had had enough of Paxos being too hard, and was **deliberately designed to be understandable**. The approach is a **strong leader** model: all changes flow only from leader to followers (one way), and the problem is split into three digestible sub-problems — leader election, log replication, safety. It has one very elegant small trick too: **randomised election timeouts**, which naturally avoid the split-vote deadlock of everyone running for leader at once. Raft gives the same guarantees as Multi-Paxos, but you can actually implement it and not easily get it wrong, so it became the modern default — etcd, Consul, TiKV, CockroachDB, and Kafka's [[kafka-ops|KRaft]] all use it.

### Zab: ZooKeeper's dedicated engine

Zab (ZooKeeper Atomic Broadcast) is the protocol behind Apache ZooKeeper, older than Raft and similar in style (also strong leader). It's tailored to the specific scenario of a "coordination service", centred on **atomic broadcast** — guaranteeing that all state changes are applied on every machine in **exactly the same order**; the leader numbers each change with a monotonically increasing **zxid**, and the design revolves around "how to recover cleanly after the primary crashes". You may never have used it directly, but you've almost certainly depended on it indirectly — ZooKeeper underpinned old Kafka, HBase, Hadoop and a whole crowd of systems.

## What consensus is for: a log everyone agrees on

The most common use of consensus is producing an **operation log that all replicas agree on, in the same order** (a replicated log). Every replica applies the same operations in the same order, and their states naturally match — that's a replicated state machine. On top of that you can build a stack of critical facilities:

- **Leader election**: there's always exactly one leader, never split brain.
- **Distributed locks**: the whole cluster agrees on who truly holds the lock.
- **Configuration / metadata storage**: the whole system's "source of truth".

And SRE's most important piece of advice is: **don't build your own consensus.** The correctness of consensus algorithms is extremely subtle, and a homebrew version almost certainly has hidden bugs. In practice, use a proven off-the-shelf system — the infrastructure you use every day is built on them: K8s entrusts its entire cluster state to [[k8s-intro|etcd]], which runs Raft; Kafka's new [[kafka-ops|KRaft]] is Raft by name; inside Google it's Chubby.

## Reflections

### "Don't build your own consensus" is a belief I paid tuition for

When I was younger I really did "elect a leader with a flag column in the database plus a periodic heartbeat", and at the time it felt clever and cheap. The result was that during one network hiccup, two instances both grabbed "I'm the leader" and each ran a round of tasks that were supposed to be mutually exclusive; the clean-up took a long time. **Consensus is the kind of thing that's right ten thousand times in a row and wrong on the ten-thousand-and-first edge case — and in distributed systems, rare edge cases happen every day.** Since then I hold to one rule: any requirement involving "a group of machines agreeing on something", I reach for etcd / ZooKeeper instead of assembling my own. That's not laziness; it's admitting one thing — **this problem is an order of magnitude harder than it looks, and someone else has already solved it correctly.**

### What split brain taught me: the most dangerous failure is "everyone believing they're right"

Split brain gave my picture of "failure" a new dimension. I used to think failure meant "the thing died, no response", which is actually the easy case — at least you know it's broken. What's truly frightening is split brain: **nobody died, every node is alive and well and working normally, each making a "reasonable" judgment from the partial information it can see, and the whole collapses.** It's the same shadow as the "partial failure" [[ddia-reliable-scalable|DDIA describes]] — the difficulty of distributed systems is often not a single point breaking, but **the absence of a god's-eye view**: every node sees only its part, yet has to make a globally consistent decision. The elegance of the majority is precisely that it uses the geometric property of "overlap" to impose a single truth on this crowd of independent nodes.

### Consensus isn't free, so use it where it cuts

Majority voting sounds beautiful, but it has a price: every decision waits for **a round trip of confirmation from a majority of nodes**, a very real latency and throughput bottleneck. So good architecture doesn't shove everything through consensus; it **routes only the most critical, least-allowed-to-fail sliver of state through it** (who is the leader, locks, key configuration), and the large bulk of data through cheaper replication. It echoes what I keep coming back to: reliability was never "crank everything to maximum", but **knowing which places are worth paying the expensive price and which aren't** — and reserving the strongest guarantee for the line you truly can't afford to lose.
