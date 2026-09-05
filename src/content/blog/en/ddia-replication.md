---
title: "Replication: Single-Leader, Multi-Leader, Leaderless, and Three Replication-Lag Anomalies"
date: 2026-07-24
category: tech
description: "Keeping the same data on several machines (replication) buys three things: high availability, low latency, read scaling. The hard part was never copying — it's that data changes. DDIA Ch5 collapses every replication scheme in the world into three topologies: single-leader (all writes go through one leader, conflicts eliminated at the source, but failover is hard), multi-leader (each datacenter accepts writes, so write conflicts must be resolved), leaderless (clients write to several replicas directly, relying on w+r>n quorum overlap). Then it names the anomalies of asynchronous replication as three diseases: read-your-writes, monotonic reads, consistent prefix — once they have names, you can prescribe for them."
tags:
  - distributed-systems
  - book-notes
  - replication
series: "Designing Data-Intensive Applications — Reading Notes"
seriesOrder: 5
comments: true
draft: false
translationOf: ddia-replication
---
Into Part II, and data starts crossing machines. The first move is **replication**: the same data on several nodes, for three reasons — **serve on when one machine dies (high availability), keep data close to users (low latency), spread read traffic (read scaling)**. If data never changed, replication would be copy-paste; **all the difficulty is in "data changes" — how does a change reach every replica?** I took apart one flavour of this (single-leader, asynchronous) in practice in the [[redis-replication|Redis replication]] post; this one climbs to DDIA's altitude: **every replication scheme in the world is one of three topologies**, and what distinguishes them is "where you handle write conflicts".

## Three topologies: conflicts don't disappear, they move

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="Three replication topologies. Left, single-leader: all writes go through the one leader and are replicated to followers; write conflicts are eliminated at the source because there is one write point; the price is that when the leader dies you need failover, and failover is hard. Middle, multi-leader: common across datacenters, each datacenter has its own leader accepting writes and the leaders sync with each other; the price is that both sides can modify the same record at once, so write conflicts must be resolved afterwards. Right, leaderless: no leader, clients write to several replicas at once and read from several too, relying on w plus r greater than n quorum overlap to guarantee reading the new value; the price is complex read and write paths and read repair." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rp5" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker><marker id="rp5g" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <line x1="193" y1="14" x2="193" y2="208" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="387" y1="14" x2="387" y2="208" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="97" y="26" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">Single-leader</text>
    <rect x="62" y="38" width="70" height="26" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="97" y="55" fill="#4f6df5" font-size="8" text-anchor="middle" font-weight="bold">Leader</text>
    <rect x="30" y="96" width="60" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="60" y="112" fill="#9aa4b2" font-size="7" text-anchor="middle">follower</text>
    <rect x="104" y="96" width="60" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="134" y="112" fill="#9aa4b2" font-size="7" text-anchor="middle">follower</text>
    <line x1="88" y1="64" x2="66" y2="94" stroke="#9aa4b2" stroke-width="1" marker-end="url(#rp5)"/><line x1="106" y1="64" x2="128" y2="94" stroke="#9aa4b2" stroke-width="1" marker-end="url(#rp5)"/>
    <line x1="97" y1="20" x2="97" y2="36" stroke="#54b890" stroke-width="1.4" marker-end="url(#rp5g)"/><text x="124" y="33" fill="#54b890" font-size="6.6" text-anchor="middle">all writes</text>
    <text x="97" y="140" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">conflicts: killed at source (one writer)</text>
    <text x="97" y="156" fill="#e0733a" font-size="7.4" text-anchor="middle">price: failover is hard (who takes over?)</text>
    <text x="97" y="172" fill="#9aa4b2" font-size="6.8" text-anchor="middle">MySQL / Postgres / Redis / Kafka</text>
    <text x="290" y="26" fill="#d6a45c" font-size="9.6" text-anchor="middle" font-weight="bold">Multi-leader</text>
    <rect x="212" y="44" width="70" height="26" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/><text x="247" y="61" fill="#d6a45c" font-size="7.4" text-anchor="middle" font-weight="bold">Leader A</text>
    <rect x="298" y="44" width="70" height="26" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/><text x="333" y="61" fill="#d6a45c" font-size="7.4" text-anchor="middle" font-weight="bold">Leader B</text>
    <text x="247" y="86" fill="#9aa4b2" font-size="6.4" text-anchor="middle">datacenter 1</text><text x="333" y="86" fill="#9aa4b2" font-size="6.4" text-anchor="middle">datacenter 2</text>
    <path d="M282 52 C 290 48, 290 48, 296 52" fill="none" stroke="#9aa4b2" stroke-width="1" marker-end="url(#rp5)"/><path d="M296 62 C 290 66, 290 66, 282 62" fill="none" stroke="#9aa4b2" stroke-width="1" marker-end="url(#rp5)"/>
    <line x1="247" y1="26" x2="247" y2="42" stroke="#54b890" stroke-width="1.2" marker-end="url(#rp5g)"/><line x1="333" y1="26" x2="333" y2="42" stroke="#54b890" stroke-width="1.2" marker-end="url(#rp5g)"/>
    <rect x="216" y="100" width="148" height="22" rx="4" fill="#3a2626" stroke="#e05a7d" stroke-width="1.2"/><text x="290" y="115" fill="#e05a7d" font-size="7" text-anchor="middle">both edit the same row → conflict!</text>
    <text x="290" y="140" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">gain: write locally, survive a netsplit</text>
    <text x="290" y="156" fill="#e0733a" font-size="7.4" text-anchor="middle">price: resolve write conflicts later</text>
    <text x="290" y="172" fill="#9aa4b2" font-size="6.8" text-anchor="middle">multi-DC / offline editing / collaborative docs</text>
    <text x="483" y="26" fill="#9b6ff0" font-size="9.6" text-anchor="middle" font-weight="bold">Leaderless</text>
    <rect x="410" y="52" width="44" height="22" rx="4" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.3"/><text x="432" y="67" fill="#9aa4b2" font-size="6.8" text-anchor="middle">replica</text>
    <rect x="462" y="52" width="44" height="22" rx="4" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.3"/><text x="484" y="67" fill="#9aa4b2" font-size="6.8" text-anchor="middle">replica</text>
    <rect x="514" y="52" width="44" height="22" rx="4" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.3"/><text x="536" y="67" fill="#9aa4b2" font-size="6.8" text-anchor="middle">replica</text>
    <text x="484" y="38" fill="#54b890" font-size="6.6" text-anchor="middle">client writes n copies at once</text>
    <line x1="462" y1="42" x2="436" y2="50" stroke="#54b890" stroke-width="1.1" marker-end="url(#rp5g)"/><line x1="484" y1="42" x2="484" y2="50" stroke="#54b890" stroke-width="1.1" marker-end="url(#rp5g)"/><line x1="506" y1="42" x2="532" y2="50" stroke="#54b890" stroke-width="1.1" marker-end="url(#rp5g)"/>
    <rect x="414" y="96" width="140" height="24" rx="4" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.2"/><text x="484" y="112" fill="#9b6ff0" font-size="7.6" text-anchor="middle" font-weight="bold">quorum: w + r > n</text>
    <text x="483" y="140" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">gain: no leader, no failover</text>
    <text x="483" y="156" fill="#e0733a" font-size="7.4" text-anchor="middle">price: complex paths, read repair</text>
    <text x="483" y="172" fill="#9aa4b2" font-size="6.8" text-anchor="middle">Dynamo / Cassandra</text>
    <rect x="30" y="218" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="235" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">Three answers to one question: block conflicts at the source, resolve later, or reconcile on read?</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">Single-leader</b>: all writes go through the one leader — conflicts are <b>eliminated at the source</b> (one write point); the price is that <b>failover</b> when the leader dies is hard (<a href="/blog/redis-sentinel/">who notices, who takes over, how do you avoid split brain</a>). <b style="color:#d6a45c">Multi-leader</b>: each datacenter has its own leader accepting local writes, and they sync with each other — you can write through a network partition, but when <b>both sides edit the same row</b> the conflict has to be resolved afterwards (who wins? how do you merge?). <b style="color:#9b6ff0">Leaderless</b>: no leader; clients write to several replicas at once and read from several, relying on the overlap of <b>w + r &gt; n</b> to guarantee they see the new value — no failover, but the read/write paths get complicated (a stale read triggers read repair to write the new value back). <b>Conflicts don't disappear, they move</b> — the three topologies are a choice of where they go</figcaption>
</figure>

The leaderless **quorum** deserves one more line: with n replicas, a write needs **w** acknowledgements and a read asks **r** replicas; as long as **w + r > n** (say n=3, w=2, r=2), the read set and write set **must overlap**, so you're guaranteed to hit at least one replica with the latest value (and pick the newest among them). The maths is beautiful — but DDIA honestly lists the edges: ordering concurrent writes is hard, a partially failed write isn't rolled back, and sloppy quorums loosen the guarantee. **It's a probabilistically strong engineering guarantee, not an absolute mathematical proof** — a distinction we'll return to in the [[sre-consensus|consensus]] chapter.

## Three replication-lag anomalies: name them, then prescribe for them

As long as replication is asynchronous (nearly all of it is, for the trade-offs in [[redis-replication|the Redis post]]), replicas are always half a beat behind, and all sorts of "what the hell" read results appear. DDIA's most valuable contribution is **giving these anomalies names** — three diseases, three prescriptions:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 246" role="img" aria-label="Three replication-lag anomalies. First, read-your-writes: you write and immediately read, but hit a replica that hasn't caught up, so you can't see your own comment; the cure is to read your own data from the leader. Second, monotonic reads: two reads hit different replicas, the first sees new data and the second sees older data, like time going backwards, a comment appearing then vanishing; the cure is to pin each user to the same replica. Third, consistent prefix: a question and its answer replicate at different speeds, so an observer sees the answer before the question, causality reversed; the cure is to write causally related writes to the same partition or track causality." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="193" y1="14" x2="193" y2="200" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="387" y1="14" x2="387" y2="200" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="97" y="28" fill="#e05a7d" font-size="9.2" text-anchor="middle" font-weight="bold">① Can't read your own write</text>
    <text x="97" y="42" fill="#9aa4b2" font-size="7" text-anchor="middle">read-your-writes</text>
    <rect x="26" y="54" width="142" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="97" y="70" fill="#e6e6e6" font-size="7.2" text-anchor="middle">I comment → written to leader ✓</text>
    <rect x="26" y="84" width="142" height="24" rx="4" fill="#3a2626" stroke="#e05a7d" stroke-width="1.2"/><text x="97" y="100" fill="#e05a7d" font-size="7.2" text-anchor="middle">refresh → comment is gone?!</text>
    <text x="97" y="126" fill="#9aa4b2" font-size="6.8" text-anchor="middle">(hit a replica that hasn't caught up)</text>
    <rect x="26" y="140" width="142" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="97" y="157" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">cure: own data → read the leader</text>
    <text x="290" y="28" fill="#d6a45c" font-size="9.2" text-anchor="middle" font-weight="bold">② Time goes backwards</text>
    <text x="290" y="42" fill="#9aa4b2" font-size="7" text-anchor="middle">monotonic reads</text>
    <rect x="220" y="54" width="142" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="290" y="70" fill="#e6e6e6" font-size="7.2" text-anchor="middle">1st read: see comment (fresh replica)</text>
    <rect x="220" y="84" width="142" height="24" rx="4" fill="#3a2626" stroke="#e05a7d" stroke-width="1.2"/><text x="290" y="100" fill="#e05a7d" font-size="7.2" text-anchor="middle">2nd read: comment gone (stale replica)</text>
    <text x="290" y="126" fill="#9aa4b2" font-size="6.8" text-anchor="middle">(two reads hit replicas at different progress)</text>
    <rect x="220" y="140" width="142" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="290" y="157" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">cure: pin each user to one replica</text>
    <text x="483" y="28" fill="#9b6ff0" font-size="9.2" text-anchor="middle" font-weight="bold">③ Causality reversed</text>
    <text x="483" y="42" fill="#9aa4b2" font-size="7" text-anchor="middle">consistent prefix</text>
    <rect x="414" y="54" width="142" height="24" rx="4" fill="#3a2626" stroke="#e05a7d" stroke-width="1.2"/><text x="483" y="70" fill="#e05a7d" font-size="7.2" text-anchor="middle">observer first sees: "A: No"</text>
    <rect x="414" y="84" width="142" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="483" y="100" fill="#e6e6e6" font-size="7.2" text-anchor="middle">then sees: "Q: Have you eaten?"</text>
    <text x="483" y="126" fill="#9aa4b2" font-size="6.8" text-anchor="middle">(Q and A on different partitions, lag differs)</text>
    <rect x="414" y="140" width="142" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="483" y="157" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">cure: causal writes → same partition</text>
    <rect x="30" y="212" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="229" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">The anomalies are physics, you can't remove them — but each has a cheap targeted cure, no full strong consistency needed</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Three anomalies, three prescriptions: <b style="color:#e05a7d">① read-your-writes</b> — you just commented, refreshed, and it's gone (you read a lagging replica); the cure is "<b>read your own data from the leader</b>, everyone else's from anywhere". <b style="color:#d6a45c">② monotonic reads</b> — two reads hit replicas at different progress, things appear then vanish, like time going backwards; the cure is "<b>pin each user to the same replica</b>" (pick the replica by user id, say). <b style="color:#9b6ff0">③ consistent prefix</b> — question and answer go to different partitions replicating at different speeds, so an observer sees the answer before the question; the cure is "<b>causally related writes go to the same partition</b>". Note that each prescription <b>treats only that disease, at low cost</b> — that's the spirit of tiered consistency: prescribe on demand, rather than reaching for the most expensive strong consistency because of an anomaly</figcaption>
</figure>

The three prescriptions together are the folk version of **causal consistency**: don't chase "the whole world in sync", just guarantee that "**the part that concerns you and is causally connected** looks right". That's what most products actually want — and it's vastly cheaper than strong consistency.

## Reflections

### Three topologies are three choices of where to put the conflict

Having read the chapter, I compress the three topologies into one line: **write conflicts don't disappear, they move — you're only choosing where they go.** Single-leader kills conflicts at the source (one write point) and moves the difficulty to failover ([[redis-sentinel|who notices, who takes over, how do you avoid split brain]]); multi-leader lets every site write and moves the difficulty to after-the-fact conflict resolution (LWW silently drops data; merge logic is the application's pain); leaderless skips leaders and moves the difficulty into every read and write path (quorums, read repair). This "**conservation of difficulty**" lens is the same thinking as "there's no truly stateless system, only systems that push state elsewhere" from the [[infra-spark|infra series]]. So when choosing a replication scheme my question changed from "which is best" to "**which of these three pains can my team swallow best?**" — for most teams the answer is single-leader, because the failover pain is carried for you by Sentinel, K8s and managed services, while the conflict-resolution pain you can only swallow yourself.

### Naming the anomalies is this chapter's most underrated contribution

read-your-writes, monotonic reads, consistent prefix — on first read they look like academic vocabulary, but once you've been in the trenches you know: **these names are handles that turn superstition into tickets.** A user reports "my comment disappeared, then reappeared on refresh" — someone who hasn't read this chapter treats it as a haunting and restarts the service; someone who has says at once "that's monotonic reads broken, pin the user to one replica" — **a disease with a name has a prescription, and a price estimate**. It's the same power as the "state → cause" lookup table in [[k8s-troubleshooting|K8s troubleshooting]]: a big part of engineering ability is having a "symptom → disease → cure" dictionary in your head. This chapter is the few pages of that dictionary for replication lag; memorise it and it repays the whole book's price.

### Consistency is a menu, not a switch

The most practical mindset this chapter taught me: consistency **isn't on/off, it's a tiered menu** — everything (strong consistency) is the most expensive, nothing (eventual consistency) is the cheapest but anomaly-ridden, and in between sits a row of "single-point cures": own data from the leader, one user pinned to one replica, causal writes in the same partition. **Most products don't want "the whole world consistent in real time", they want "the part that concerns me looks right"** — two or three cheap prescriptions cover that, no need to upgrade the whole system to synchronous replication or distributed consensus. It's a brake I hit often in architecture reviews: someone meets a lag anomaly and shouts "go strongly consistent", and I first ask — **which of the three diseases are your users actually hitting?** Prescribe for that one and the cost is often a tenth. Scenarios that truly need strong guarantees wait for the [[sre-consensus|consensus]] chapter later; until then, remember this: **buying consistency is like buying insurance — buy the items you need, not the full package.**
