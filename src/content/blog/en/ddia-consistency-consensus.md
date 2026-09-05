---
title: "Consistency and Consensus: Linearizability, the Honest Version of CAP, and Total Order Broadcast"
date: 2026-07-24
category: tech
description: "Ch8 concluded that truth is decided by a majority; Ch9 is about how a majority decides safely — the theoretical climax of DDIA. Three pillars: linearizability (the strongest guarantee, making the system look like a single copy of the data — shockingly expensive, and needed in fewer places than you think), the honest version of CAP (partitions aren't something you choose, they're a fault that happens; \"pick two of three\" is misleading), and the most beautiful equivalence in the book: total order broadcast ≡ consensus — consensus sounds mystical, but it's just \"everyone agreeing on the order of one log\", and Raft's log, a Kafka partition, and a database's replication stream are all the same shape."
tags:
  - distributed-systems
  - book-notes
  - consistency
series: "Designing Data-Intensive Applications — Reading Notes"
seriesOrder: 9
comments: true
draft: false
translationOf: ddia-consistency-consensus
---
[[ddia-distributed-trouble|The previous post]] concluded that no single node's judgment can be trusted, so **truth can only be decided by a majority**. This chapter is about how a majority decides **safely** — the theoretical climax of DDIA. The algorithmic details (how Raft, Paxos and Zab vote and change terms) I took apart in the [[sre-consensus|SRE consensus post]]; this one takes the three pillars unique to Ch9: **what the strongest consistency guarantee looks like, what CAP actually says, and the true face of that mystical word "consensus"**.

## Linearizability: making the system "look like a single copy of the data"

The ceiling of consistency guarantees is called **linearizability**, and its definition can be put plainly: **the whole system behaves as if there were only "one" copy of the data, and every operation is atomic** — once **anyone** has read the new value, **everyone afterwards** must read the new value and never see the old one again. DDIA explains it with a football match:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 224" role="img" aria-label="A scene where linearizability breaks. The match ends and the referee writes the result to the leader. Alice queries, hits a replica that has caught up, sees the final score, and excitedly tells Bob it's over. Bob refreshes but hits another replica that hasn't caught up and sees the match still in progress. Seen from outside the system: after Alice has already read the new value, Bob's read returns the old one — a read that happened later in time saw an older state, and the illusion of a single copy shatters. Linearizability demands: once anyone has read the new value, everyone must read the new value." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="cc9" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Final whistle: result written, but two replicas at different progress</text>
    <path d="M232 36 v22 a58 6 0 0 0 116 0 v-22" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><ellipse cx="290" cy="36" rx="58" ry="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="290" y="54" fill="#4f6df5" font-size="8" text-anchor="middle" font-weight="bold">leader: 2 : 1 final</text>
    <rect x="96" y="86" width="150" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="171" y="105" fill="#54b890" font-size="8" text-anchor="middle">replica 1 (caught up): 2:1 final</text>
    <rect x="334" y="86" width="150" height="30" rx="6" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.4"/><text x="409" y="105" fill="#e0733a" font-size="8" text-anchor="middle">replica 2 (lagging): 1:1 playing</text>
    <line x1="252" y1="62" x2="186" y2="84" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#cc9)"/><line x1="328" y1="62" x2="394" y2="84" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#cc9)"/>
    <rect x="60" y="140" width="220" height="30" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/><text x="170" y="159" fill="#e6e6e6" font-size="8" text-anchor="middle">① Alice sees "final 2:1" → tells Bob</text>
    <rect x="300" y="140" width="220" height="30" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.4"/><text x="410" y="159" fill="#e05a7d" font-size="8" text-anchor="middle" font-weight="bold">② Bob refreshes → "still playing"?!</text>
    <line x1="171" y1="118" x2="171" y2="138" stroke="#54b890" stroke-width="1.1" marker-end="url(#cc9)"/><line x1="409" y1="118" x2="409" y2="138" stroke="#e05a7d" stroke-width="1.1" marker-end="url(#cc9)"/>
    <line x1="282" y1="155" x2="298" y2="155" stroke="#9aa4b2" stroke-width="1" marker-end="url(#cc9)"/>
    <rect x="60" y="186" width="460" height="28" rx="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="290" y="204" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">A "later" read sees an "older" state → the single-copy illusion shatters = not linearizable</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The final result is written; Alice hits the <b style="color:#54b890">replica that has caught up</b>, sees 2:1, and excitedly tells Bob; Bob refreshes and hits the <b style="color:#e0733a">lagging replica</b> — "still playing". Note this isn't just a replay of the <a href="/blog/ddia-replication/">replication-lag anomalies</a>: Bob's read <b>happens after Alice's in time</b>, yet sees an older state — the illusion that "the whole system holds one copy" shatters on the spot. <b>Linearizability is the guarantee that protects that illusion: once anyone has read the new value, everyone afterwards must read the new value</b></figcaption>
</figure>

What **truly can't do without it**? The list is short: **uniqueness constraints** (two people grabbing the same username or the last seat at once — at heart "everyone must agree on who was first"), **[[redis-sentinel|leader election]]** (two nodes must never both believe they're the leader), and timing dependencies across systems. And it's **shockingly expensive**: synchronous single-leader replication is slow, [[ddia-replication|Dynamo-style quorums]] strictly speaking aren't linearizable either (unless you add synchronous read repair), and during a partition you have to sacrifice availability — which brings us to that over-quoted theorem.

## The honest version of CAP: a partition isn't something you "choose"

CAP is usually told as "consistency, availability, partition tolerance — pick two". DDIA is blunt about this, and its criticism deserves to be carried over in spirit: **a network partition (P) is not an option you can decline; it's a fault that "will happen".** You can't "choose not to have partitions" any more than you can choose not to have earthquakes. So the real trade-off is:

- **When a partition happens**: you can only choose between **C** (refuse service to stay consistent) and **A** (keep serving, possibly inconsistently) — this is the only thing CAP says.
- **In normal times without a partition** (the vast majority of the time): CAP says nothing at all; what you're really trading is **consistency vs latency** (linearizable reads and writes need cross-node coordination, and that's slow).

So coarse labels like "we're an AP system" or "that's a CP database" mostly don't survive a follow-up question — different operations in the same system often sit at different points. **Rather than memorising three letters, ask two concrete questions: during those minutes of partition, what do you protect? In normal times, how much latency will you pay for how much consistency?**

## The true face of consensus: total order broadcast is "everyone agreeing on the same log"

"Consensus" sounds mystical; DDIA gives it an equivalent form any engineer grasps instantly — **total order broadcast**: every node receives **the same sequence of messages** in **the same order**, none lost, none duplicated. And that's **the same problem** as consensus: agreeing on message order = doing consensus repeatedly (what's message 1? what's message 2? …). Its power lies here:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="Total order broadcast and state machine replication. Write requests from various nodes first go into the consensus module, which arranges them into one totally ordered log everyone agrees on: first x=1, second y=2, third x=3. Three nodes each apply this log entry by entry in the same order; because they start from the same state, receive the same input sequence, and apply deterministically, all three must end in the same state. Below: this shape is Raft's replicated log, the total order within a single Kafka partition, and a database's replication stream — the core of a consensus system is one log protected by a majority." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="tob" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="70" y="30" fill="#9aa4b2" font-size="8" text-anchor="middle">write requests</text>
    <rect x="30" y="40" width="80" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="70" y="54" fill="#e6e6e6" font-size="7.2" text-anchor="middle" font-family="monospace">x=1</text>
    <rect x="30" y="66" width="80" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="70" y="80" fill="#e6e6e6" font-size="7.2" text-anchor="middle" font-family="monospace">y=2</text>
    <rect x="30" y="92" width="80" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="70" y="106" fill="#e6e6e6" font-size="7.2" text-anchor="middle" font-family="monospace">x=3</text>
    <line x1="110" y1="76" x2="150" y2="76" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#tob)"/>
    <rect x="152" y="52" width="112" height="48" rx="8" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.7"/>
    <text x="208" y="72" fill="#9b6ff0" font-size="8.8" text-anchor="middle" font-weight="bold">consensus module</text>
    <text x="208" y="88" fill="#9aa4b2" font-size="6.6" text-anchor="middle">orders messages so all agree</text>
    <line x1="264" y1="76" x2="304" y2="76" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#tob)"/>
    <rect x="306" y="56" width="240" height="40" rx="6" fill="#33291a" stroke="#d6a45c" stroke-width="1.6"/>
    <text x="426" y="72" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">one "totally ordered" log (all agree)</text>
    <text x="426" y="88" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-family="monospace">① x=1 → ② y=2 → ③ x=3</text>
    <line x1="360" y1="96" x2="300" y2="130" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#tob)"/><line x1="426" y1="96" x2="426" y2="130" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#tob)"/><line x1="492" y1="96" x2="552" y2="130" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#tob)"/>
    <rect x="234" y="132" width="130" height="38" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="299" y="148" fill="#e6e6e6" font-size="7.6" text-anchor="middle">node 1: apply in order</text><text x="299" y="162" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">x=3, y=2</text>
    <rect x="374" y="132" width="104" height="38" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="426" y="148" fill="#e6e6e6" font-size="7.6" text-anchor="middle">node 2: same order</text><text x="426" y="162" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">x=3, y=2</text>
    <rect x="488" y="132" width="88" height="38" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="532" y="148" fill="#e6e6e6" font-size="7.6" text-anchor="middle">node 3: same</text><text x="532" y="162" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">x=3, y=2</text>
    <text x="290" y="192" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">Same start + same order + deterministic apply = same state (state machine replication)</text>
    <rect x="46" y="202" width="488" height="24" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="218" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">One shape: Raft's replicated log · a single Kafka partition's total order · a DB's replication stream</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Everyone's writes first pass through the <b style="color:#9b6ff0">consensus module</b> and are arranged into <b style="color:#d6a45c">one log whose order everyone agrees on</b>; each node applies it entry by entry, deterministically, in the same order — <b>same start + same sequence = same state, necessarily</b> (state machine replication). That's the engineering face of consensus: <b>not a voting ritual, but "everyone sharing the same log"</b>. You've seen this shape before: <a href="/blog/sre-consensus/">Raft</a>'s replicated log, <a href="/blog/kafka-topics/">the total order within a single Kafka partition</a>, a database's replication stream — <a href="/blog/zookeeper/">ZooKeeper</a>/etcd are essentially "one log protected by a majority + one state machine"</figcaption>
</figure>

A few common "fake consensuses" are also exposed in this chapter: **2PC is not consensus** — when the coordinator dies after prepare, all participants **block waiting**, and the loss of a single point halts the whole game; consensus algorithms cure precisely this with **a majority + the ability to change leader**. **Lamport timestamps** can produce a total order after the fact, but can't answer "do we grant this username" **right now** — for an immediate ruling you still need consensus. And the **epoch / term number** in consensus algorithms (which stops a stale leader waking up and causing havoc) should look familiar — it's a relative of the [[redis-distributed-lock|fencing token]]: **once again a monotonically increasing number plus a majority; the final answer of distributed systems is always those two ingredients.**

## Reflections

### The places that need linearizability are an order of magnitude fewer than you think

This chapter first makes the strongest guarantee sound tempting, then honestly tells you how expensive it is — and my practical conclusion is: **what truly can't do without linearizability is almost only two categories, "uniqueness" and "who's the leader"**, and what they share is "the whole world must agree on one ruling immediately". For everything else, the cheap dishes on the [[ddia-replication|consistency menu]] (read-your-writes, causal) are almost always enough. It also makes me ask one more question of any "our system needs strong consistency" requirement: **which operation, which ruling needs it?** Eight times out of ten, digging down leaves a single uniqueness constraint — so fence the expensive guarantee around that small patch (hand it to a database unique index or a [[zookeeper|coordination service]]) and relax the rest. **Consistency is like safety stock: maxing it out everywhere is waste; stocking it at the critical points is skill.**

### "Consensus = one log everyone agrees on" — this equivalence let me see five systems as one

Total order broadcast ≡ consensus is the biggest "aha" I got from DDIA. Consensus went from "mysterious voting algorithm" to one sentence: **everyone shares the same log whose order is beyond dispute, and each copies it faithfully.** That instantly connected five points on my map that had been isolated: Raft's replicated log, [[zookeeper|ZooKeeper]]'s zxid sequence, the offset order of a [[kafka-topics|Kafka partition]], a database's WAL replication stream, even [[redis-replication|Redis's replication stream]] — **all the shape "one log + apply in order", differing only in how strictly that log is protected** (majority consensus, a single leader, or best effort). Once you recognise the shape, you can nearly guess a new system's replication docs: find where its log is, who decides the order, what protects that order. **One equivalence beats ten architecture documents.**

### What CAP taught me isn't theory, it's the discipline of refusing coarse labels

The biggest thing I took from DDIA's criticism of CAP is a **discipline of questioning**. "We're an AP system" sounds professional in an architecture meeting and says nothing at all — during a partition, which operation degrades? How? How much latency is paid for consistency in normal times? This merges with what I've found all along: [[ddia-replication|consistency is a menu, not a switch]], [[ddia-transactions|isolation levels are a spectrum, not a boolean]] — **nearly every important property of distributed systems is "per operation, in tiers", and any phrasing that compresses it into one letter is dodging the real design decision.** Now, when the three-letter theorem gets wheeled out, I ask two questions: during those minutes of partition, what do you protect? In normal times, how much latency do you pay? Only if you can answer have you actually thought about it. DDIA Part II ends here — the network drops, clocks drift, nodes play dead, and with one log protected by a majority we've built small islands of determinism in a probabilistic world. In the next part, data starts flowing between systems.
