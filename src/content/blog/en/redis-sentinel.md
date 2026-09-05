---
title: "High Availability: How Sentinel Fails Over Automatically"
date: 2026-07-20
category: tech
tags:
  - redis
  - high-availability
series: "Redis — Learning Notes"
seriesOrder: 9
comments: true
draft: false
translationOf: redis-sentinel
---
[[redis-replication|The previous post]]'s replication gave you copies, but left a big hole: **when the master dies, nobody takes over automatically.** You have to crawl out of bed at night, promote some replica to master by hand, repoint the other replicas at it, then tell every client to switch addresses — a whole scramble. **Sentinel** is the watchdog that automates that procedure: it detects the master's death automatically, fails over automatically, and tells clients where the new master is, automatically.

## What one automatic failover looks like

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 216" role="img" aria-label="The flow of a Sentinel automatic failover. Step one, monitor: the Sentinels keep pinging the master. Step two, subjectively down, SDOWN: one Sentinel sees the master not responding. Step three, objectively down, ODOWN: a majority of Sentinels agree the master is really dead. Step four, elect a Sentinel leader, which picks the most complete replica and promotes it to the new master, and points the remaining replicas at it. Step five, notify clients of the new master's address." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="sf" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">The five steps of Sentinel automatic failover</text>
    <rect x="16" y="34" width="120" height="52" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="76" y="53" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">① monitor</text><text x="76" y="68" fill="#9aa4b2" font-size="7.4" text-anchor="middle">keeps pinging master</text><text x="76" y="80" fill="#9aa4b2" font-size="7.4" text-anchor="middle">and replicas</text>
    <rect x="152" y="34" width="120" height="52" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="212" y="53" fill="#d6a45c" font-size="8.8" text-anchor="middle" font-weight="bold">② subjectively down</text><text x="212" y="68" fill="#9aa4b2" font-size="7.4" text-anchor="middle">one Sentinel sees</text><text x="212" y="80" fill="#9aa4b2" font-size="7.4" text-anchor="middle">no response (SDOWN)</text>
    <rect x="288" y="34" width="130" height="52" rx="7" fill="#3a2626" stroke="#e05a7d" stroke-width="1.5"/><text x="353" y="53" fill="#e05a7d" font-size="8.8" text-anchor="middle" font-weight="bold">③ objectively down</text><text x="353" y="68" fill="#9aa4b2" font-size="7.4" text-anchor="middle">majority agree "really dead"</text><text x="353" y="80" fill="#e05a7d" font-size="7.4" text-anchor="middle">(ODOWN)</text>
    <line x1="136" y1="60" x2="150" y2="60" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#sf)"/>
    <line x1="272" y1="60" x2="286" y2="60" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#sf)"/>
    <line x1="353" y1="86" x2="353" y2="108" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sf)"/>
    <rect x="150" y="112" width="270" height="52" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/><text x="285" y="131" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">④ elect a Sentinel leader → promote a replica</text><text x="285" y="146" fill="#9aa4b2" font-size="7.4" text-anchor="middle">pick the most complete replica as the new master</text><text x="285" y="158" fill="#9aa4b2" font-size="7.4" text-anchor="middle">point the other replicas at the new master</text>
    <line x1="150" y1="138" x2="140" y2="138" stroke="#9aa4b2" stroke-width="1.2"/><line x1="140" y1="138" x2="140" y2="190" stroke="#9aa4b2" stroke-width="1.2"/><line x1="140" y1="190" x2="150" y2="190" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#sf)"/>
    <rect x="152" y="176" width="270" height="30" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="287" y="195" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">⑤ tell clients the new master's address</text>
    <text x="490" y="150" fill="#9aa4b2" font-size="7.8" text-anchor="middle">clients ask</text><text x="490" y="163" fill="#9aa4b2" font-size="7.8" text-anchor="middle">Sentinel</text><text x="490" y="176" fill="#9aa4b2" font-size="7.8" text-anchor="middle">"who is the</text><text x="490" y="189" fill="#9aa4b2" font-size="7.8" text-anchor="middle">master now?"</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The key to the whole flow is the step from <b style="color:#d6a45c">②</b> to <b style="color:#e05a7d">③</b>: a single Sentinel thinking the master is dead is only <b style="color:#d6a45c">subjectively down (SDOWN)</b> — its own network may just have hiccuped. Only when <b style="color:#e05a7d">a majority of Sentinels agree</b> does it escalate to <b style="color:#e05a7d">objectively down (ODOWN)</b> and actually start the failover. A leader is then elected to drive it, the most complete <b style="color:#54b890">replica is promoted to the new master</b>, and the new address is broadcast. <b>"Detecting" is much harder than "switching" — the hard part is being sure it's really dead, not that the network burped</b></figcaption>
</figure>

Sentinel is its own set of independent processes (usually 3 or more, an odd number), running on its own port:

```bash
# sentinel.conf: monitor the master named mymaster; the trailing 2 is the quorum
sentinel monitor mymaster 10.0.0.1 6379 2
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster   # clients ask: who is the master now
redis-cli -p 26379 SENTINEL replicas mymaster                  # see the replicas it manages
```

## Subjective vs objective down: why a majority is required

That "majority" above isn't arbitrary; it's the safety core of the whole mechanism. Imagine it weren't there: any Sentinel that couldn't reach the master would promote some replica on its own — then **under a network partition, each side promotes one, you have two masters (split brain), and the data forks outright**. The majority exists to slam that door:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 210" role="img" aria-label="Why Sentinel requires a majority. Three Sentinels S1, S2 and S3 monitor one master plus two replicas. A network partition splits them in two. The minority side on the left has only the master and the single Sentinel S1, which can't form a majority, so it dares not fail over. The majority side on the right has Sentinels S2 and S3 plus the replicas; two votes make a majority, so they confirm the master is dead and promote a replica to new master. Because only the majority side can elect a new master, two masters never appear at once, avoiding split brain." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Under a partition, only the "majority" side can promote a new master</text>
    <line x1="290" y1="28" x2="290" y2="168" stroke="#e0733a" stroke-width="1.6" stroke-dasharray="5 4"/><text x="290" y="182" fill="#e0733a" font-size="7.8" text-anchor="middle" font-weight="bold">network partition</text>
    <text x="140" y="42" fill="#9aa4b2" font-size="8.6" text-anchor="middle" font-weight="bold">minority side (1 Sentinel)</text>
    <rect x="40" y="52" width="90" height="34" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="85" y="72" fill="#e6e6e6" font-size="8" text-anchor="middle">Master (isolated)</text>
    <rect x="150" y="52" width="90" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="195" y="72" fill="#e6e6e6" font-size="8" text-anchor="middle">S1</text>
    <rect x="40" y="100" width="200" height="46" rx="7" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="140" y="119" fill="#e05a7d" font-size="8.4" text-anchor="middle" font-weight="bold">1 vote, no majority</text><text x="140" y="134" fill="#9aa4b2" font-size="7.6" text-anchor="middle">→ no failover (even if master unreachable)</text>
    <text x="430" y="42" fill="#9aa4b2" font-size="8.6" text-anchor="middle" font-weight="bold">majority side (2 Sentinels)</text>
    <rect x="330" y="52" width="70" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="365" y="72" fill="#e6e6e6" font-size="8" text-anchor="middle">S2</text>
    <rect x="410" y="52" width="70" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="445" y="72" fill="#e6e6e6" font-size="8" text-anchor="middle">S3</text>
    <rect x="490" y="52" width="66" height="34" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="523" y="68" fill="#54b890" font-size="7.6" text-anchor="middle">replica</text><text x="523" y="80" fill="#9aa4b2" font-size="6.6" text-anchor="middle">×2</text>
    <rect x="330" y="100" width="226" height="46" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="443" y="119" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">2 votes, majority → confirm ODOWN</text><text x="443" y="134" fill="#9aa4b2" font-size="7.6" text-anchor="middle">→ promote a replica to new master ✓</text>
    <text x="290" y="200" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">only one side can hold a majority at a time → never two masters → no split brain</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The partition cuts the cluster in half: the <b style="color:#e05a7d">minority side</b> (only 1 Sentinel), however much it wants to fail over, <b>can't form a majority</b> and can only wait; the <b style="color:#54b890">majority side</b> (2 Sentinels) has two votes, confirms ODOWN, and promotes a replica to new master. Because <b>only one side can form a majority at any one time</b>, two masters can never appear at once. It's the same theorem wearing different faces as <a href="/blog/sre-consensus/">a consensus algorithm's quorum</a> and <a href="/blog/redis-cluster/">Cluster's majority failover</a> — <b>the majority isn't for efficiency; it's so that when the network tears, there is still only one truth</b></figcaption>
</figure>

One easily confused detail is worth spelling out: the `quorum` in the config (the `2` above) only decides "**how many Sentinels must agree for ODOWN**"; but actually **starting the failover and electing the leader to drive it** needs authorisation from **a majority of all Sentinels**. So the total number of Sentinels should be **odd and ≥ 3** — both to force out a clear majority when opinions split.

## Elect a leader, pick a replica, switch over

Once ODOWN is confirmed, the Sentinels first run a round of **Raft-like majority voting** to elect a leader, which alone drives this failover (so several Sentinels don't each switch independently). The leader then picks the **most suitable replica** to promote — preferring the **most complete replication** (newest offset, least data lost), then the configured priority. Once promoted, it `REPLICAOF`s the remaining replicas to the new master and broadcasts a `+switch-master` event over pub/sub. A **Sentinel-aware client** doesn't hard-code the master's address; it first asks Sentinel "who is the master now", and on receiving the event automatically reconnects to the new address — the **service discovery** Sentinel provides as a bonus.

## Reflections

### What Sentinel taught me: detection is harder than switching, and misjudgment costs more than inaction

The technical act of failover is actually easy — promote a replica, change a few pointers, a few lines and it's done. Sentinel's real weight sits entirely on the `SDOWN → ODOWN` step: **how do you "know for sure" the master is really dead, rather than the network jittering or the Sentinel's own line dropping?** That's the shared difficulty of every automated remediation mechanism — auto-healing, auto-restart, circuit breaking; the actions are easy to write, the judgment is hard. And the cost of misjudging is often **greater than doing nothing**: the master is actually alive, you misjudge and fail over, and you've manufactured an outage that wouldn't otherwise have happened, or even a double master. So Sentinel puts a safety on detection with "only a majority counts". It gives me one more measure of respect for any "auto-repair" — **first ask how it avoids misjudging, then talk about how well it repairs.**

### Majority is the immune system of distributed systems

Sentinel hides **two layers of majority**: judging ODOWN needs one, electing the leader needs another. Both guard against the same thing — **a minority of nodes (or the side cut off by a partition) acting on their own and causing split brain.** Writing this post, I increasingly see "majority" as a near-universal immune mechanism of the distributed world: [[sre-consensus|consensus algorithms]] rely on it, [[redis-cluster|Cluster]] relies on it, etcd / ZooKeeper rely on it, even a relatively plain HA like Sentinel relies on it. Its spirit fits in one sentence: **when the nodes disagree, or the network tears everyone in two, let only the side that "can form a majority" act, and the system always has exactly one truth.** It's not for running fast; it's for not splitting at the most chaotic moment. Understand the majority and you hold the universal key to almost all distributed HA.

### Sentinel solves "availability", not "capacity" — don't use it for the wrong thing

Finally, the positioning, so you don't pick the wrong tool. Sentinel competently solves **availability**: the master dies, someone takes over automatically, no one firefights at night. But it **doesn't solve capacity** — the whole setup still has one master carrying all the writes, so the ceiling on data volume and write throughput is the same as a single machine; and failover has a **seconds-long gap**, and under asynchronous replication may lose the last few writes that never replicated. So its division of labour with [[redis-cluster|Cluster]] is clear: **for "someone takes over when it dies", use Sentinel (master-replica + automatic failover); only for "one machine can't hold it or can't write fast enough" go to Cluster (sharding + master-replica per shard).** Recognise that "Sentinel solves availability; Cluster solves availability + capacity", and you won't shoulder Cluster's multi-key restrictions and complexity when you only need the former, nor keep propping up Sentinel when the data has long since outgrown one machine. **First see whether you lack "no interruptions" or "enough room", and the answer surfaces by itself.**
