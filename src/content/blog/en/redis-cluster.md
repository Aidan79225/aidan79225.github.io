---
title: "Redis Cluster: How 16384 Slots Shard and Rescale"
date: 2026-07-20
category: tech
tags:
  - redis
  - distributed-systems
series: "Redis — Learning Notes"
seriesOrder: 10
comments: true
draft: false
translationOf: redis-cluster
---
[[redis-single-thread|The single-thread post]] said one Redis's bottleneck is memory and the network. When one machine can't hold the data, or traffic hits the single-machine ceiling, you **shard** the data across several machines — that's **Redis Cluster**. But its sharding has personality: no consistent hashing; instead the whole key space is cut into **a fixed 16384 hash slots**. That odd-looking number is actually the key to its scaling being fast and clean.

## Which node a key lands on: CRC16 → 16384 slots → node

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 230" role="img" aria-label="The Redis Cluster sharding model. A key user:1000 is first hashed with CRC16, then taken modulo 16384, giving slot 5798. The 16384 slots are divided among three master nodes: Node A owns 0 to 5460, Node B owns 5461 to 10922, Node C owns 10923 to 16383. Slot 5798 falls in B's range, so Node B holds this key. Key point below: the 16384 fixed slots are a middle layer, a node just claims a range of slots, so moving data means moving slots, and scaling stays clean and controllable." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rc" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Where a key lands: CRC16 → 16384 slots → node</text>
    <rect x="30" y="36" width="150" height="30" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="105" y="55" fill="#e6e6e6" font-size="9" text-anchor="middle">key: "user:1000"</text>
    <line x1="180" y1="51" x2="214" y2="51" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#rc)"/>
    <rect x="216" y="34" width="180" height="34" rx="6" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.4"/><text x="306" y="49" fill="#9b6ff0" font-size="8.6" text-anchor="middle" font-weight="bold">CRC16(key) % 16384</text><text x="306" y="62" fill="#9aa4b2" font-size="7.6" text-anchor="middle">= slot 5798</text>
    <line x1="306" y1="68" x2="306" y2="92" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#rc)"/>
    <rect x="24" y="98" width="168" height="60" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="108" y="118" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">Node A</text><text x="108" y="134" fill="#9aa4b2" font-size="8" text-anchor="middle">slot 0 – 5460</text><text x="108" y="149" fill="#9aa4b2" font-size="7.4" text-anchor="middle">(+ one replica)</text>
    <rect x="206" y="98" width="168" height="60" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="2"/><text x="290" y="118" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">Node B ✓</text><text x="290" y="134" fill="#e6e6e6" font-size="8" text-anchor="middle">slot 5461 – 10922</text><text x="290" y="149" fill="#54b890" font-size="7.6" text-anchor="middle">5798 is here → B holds it</text>
    <rect x="388" y="98" width="168" height="60" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="472" y="118" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">Node C</text><text x="472" y="134" fill="#9aa4b2" font-size="8" text-anchor="middle">slot 10923 – 16383</text><text x="472" y="149" fill="#9aa4b2" font-size="7.4" text-anchor="middle">(+ one replica)</text>
    <line x1="290" y1="92" x2="290" y2="96" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rc)"/>
    <text x="290" y="184" fill="#9aa4b2" font-size="8" text-anchor="middle">the 16384 fixed slots are a "middle layer"; a node just claims a range of slots</text>
    <text x="290" y="202" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">so moving data = moving slots; scaling stays clean, no recomputing every key's place</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Finding a key's home takes three steps: <b>CRC16(key) % 16384</b> gives the slot number, then see which node has <b>claimed</b> that slot. The clever part is that layer of <b style="color:#9b6ff0">fixed 16384 slots</b> — key→slot never changes; what changes is only "which node claims which slots". So when scaling you move <b>whole ranges of slots (with the keys inside)</b>, rather than recomputing a pile of keys' destinations as consistent hashing would. It's the same "fixed shard unit" wisdom as <a href="/blog/infra-kafka/">Kafka's partitions</a></figcaption>
</figure>

Verifying it yourself is easy: `CLUSTER KEYSLOT user:1000` returns that key's slot number. **key→slot is a pure function and never changes; slot→node is the half that changes with the cluster.**

## Clients don't get lost: MOVED and ASK

Once sharded, how does a client know which node to hit? The answer: **the nodes correct you.** Hit any node; if that key's slot isn't its responsibility, it doesn't forward for you but replies **`MOVED <slot> <correct node>`** — a smart client, on receiving that, **caches the whole slot→node map**, and from then on hits the right node directly without detours.

A special variant appears **during a rescaling migration**: while a slot is being moved from an old node to a new one, for "keys already moved" the old node replies **`ASK`** (temporary, redirects this one request) rather than `MOVED` (permanent, update the map). That `MOVED` / `ASK` division matches the scaling diagram below.

## One restriction: multi-key operations and hash tags

Sharding brings an unavoidable restriction: **multi-key operations across slots aren't allowed.** `MGET a b c`, a `MULTI` transaction, a Lua script touching several keys — if those keys fall in different slots (most likely different nodes), Redis returns an error outright, because it doesn't coordinate across nodes.

The fix is the **hash tag**: wrap a segment of the key in braces `{}`, and Redis **computes the slot from only the braced part**. Bind related keys to the same tag and they're guaranteed to land in the same slot, on the same machine:

```bash
# user:1000's several keys, tied to one slot with {1000}
SET {user:1000}:profile "..."
SET {user:1000}:cart    "..."
MGET {user:1000}:profile {user:1000}:cart   # ✓ same slot, multi-key allowed
```

**To operate atomically on a group of keys, tie them together with a hash tag when designing the keys** — the habit most worth internalising when programming against Cluster.

## The operations: build, scale out, scale in

The main event. Cluster's day-to-day operations almost all go through the `redis-cli --cluster` toolset:

```bash
# build the cluster: 6 nodes, 1 replica per master (→ 3 masters, 3 replicas)
redis-cli --cluster create \
  10.0.0.1:6379 10.0.0.2:6379 10.0.0.3:6379 \
  10.0.0.4:6379 10.0.0.5:6379 10.0.0.6:6379 \
  --cluster-replicas 1

# inspect (-c makes redis-cli follow MOVED/ASK redirects automatically)
redis-cli -c -p 6379 CLUSTER INFO       # cluster status; look for cluster_state:ok
redis-cli -c -p 6379 CLUSTER NODES      # each node's id, role (master/replica), slots owned
redis-cli -c -p 6379 CLUSTER SLOTS      # slot range → node map
redis-cli -c CLUSTER KEYSLOT user:1000  # which slot a key falls in

# scale out: add a node → move some slots (with their keys) over
redis-cli --cluster add-node 10.0.0.7:6379 10.0.0.1:6379   # join first (a master with 0 slots by default)
redis-cli --cluster reshard  10.0.0.1:6379                 # interactive: how many slots, from whom, to whom
redis-cli --cluster rebalance 10.0.0.1:6379               # or spread slots evenly across all masters automatically

# scale in: move every slot off first, then remove the node (del-node on a node that still owns slots breaks things)
redis-cli --cluster reshard 10.0.0.1:6379 --cluster-from <retiring-node-id> --cluster-to <other-node-id> --cluster-slots 16384 --cluster-yes
redis-cli --cluster del-node 10.0.0.1:6379 <retiring-node-id>

# health check
redis-cli --cluster check 10.0.0.1:6379   # are all slots covered, any inconsistencies
```

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 216" role="img" aria-label="Scaling Redis Cluster out means moving slots. Originally three masters A, B and C each own a range of slots. After a new Node D joins, a reshard hands a portion of slots, with the keys inside, from each of A, B and C to D. During the move, the old node answers ASK for keys already moved, redirecting that one request to D; after the move the map updates and it goes back to MOVED. Key point below: because the shard unit is the fixed slot, scaling out or in is just moving slots, with precise control over where and how much." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rc2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#d6a45c"/></marker></defs>
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Scaling out = moving slots: add D, hand over a range from each of A/B/C</text>
    <rect x="26" y="40" width="120" height="46" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="86" y="60" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Node A</text><text x="86" y="75" fill="#9aa4b2" font-size="7.4" text-anchor="middle">0 – 5460</text>
    <rect x="156" y="40" width="120" height="46" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="216" y="60" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Node B</text><text x="216" y="75" fill="#9aa4b2" font-size="7.4" text-anchor="middle">5461 – 10922</text>
    <rect x="286" y="40" width="120" height="46" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="346" y="60" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Node C</text><text x="346" y="75" fill="#9aa4b2" font-size="7.4" text-anchor="middle">10923 – 16383</text>
    <rect x="430" y="40" width="124" height="46" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="2" stroke-dasharray="5 3"/><text x="492" y="60" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">Node D (new)</text><text x="492" y="75" fill="#9aa4b2" font-size="7.4" text-anchor="middle">claims the moved slots</text>
    <path d="M86 86 C 120 120, 400 120, 452 88" fill="none" stroke="#d6a45c" stroke-width="1.3" marker-end="url(#rc2)"/>
    <path d="M216 88 C 280 118, 410 116, 456 88" fill="none" stroke="#d6a45c" stroke-width="1.3" marker-end="url(#rc2)"/>
    <path d="M346 88 C 380 108, 430 104, 460 88" fill="none" stroke="#d6a45c" stroke-width="1.3" marker-end="url(#rc2)"/>
    <text x="290" y="140" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">reshard: hand a range of slots (with their keys) from each to D</text>
    <rect x="70" y="156" width="440" height="44" rx="8" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="174" fill="#9aa4b2" font-size="8" text-anchor="middle">during the move: the old node answers <tspan fill="#e0733a" font-weight="bold">ASK &lt;D&gt;</tspan> for keys already moved (redirect this once)</text>
    <text x="290" y="190" fill="#9aa4b2" font-size="8" text-anchor="middle">after: the map updates, and it goes back to a permanent <tspan fill="#e6e6e6" font-weight="bold">MOVED</tspan></text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Scaling out is in essence <b style="color:#d6a45c">moving slots</b>: add a <b style="color:#4f6df5">Node D</b>, then <code>reshard</code> to hand a range of slots (with the keys inside) from each existing node to it. Because the shard unit is <b>the fixed slot</b>, you can decide precisely "how many, from whom, to whom"; scaling in is the reverse — <code>reshard</code> all of the retiring node's slots away, then <code>del-node</code>. For a key mid-move, the old node uses <b style="color:#e0733a">ASK</b> to redirect the request temporarily to its new home, and only after the move goes back to <b>MOVED</b>, with no service interruption throughout</figcaption>
</figure>

## Gossip and failover

How do the nodes know each other's state? Through the **gossip protocol** — every node continually exchanges "who's alive, who owns which slots" with the others over the cluster bus, with no central coordinator. When **a majority of masters** consider some master dead (objectively down), its **replica is promoted** to take over that range of slots — [[sre-consensus|majority voting]] showing up in a real system once more. So the recommended number of Cluster masters is odd, and every master should have a replica; otherwise a master disappears along with its slots and the whole cluster refuses service because "some slots have no owner".

## Reflections

### 16384 fixed slots is a classic victory of "add a layer of indirection"

The first time I saw "16384 slots" it seemed bizarre — why not just hash keys straight to nodes? Once it clicked I was very impressed: **it inserts a fixed slot layer between key and node**, and that layer of indirection buys the whole cleanliness of rescaling. key→slot never changes; scaling only changes slot→node ownership, and you can say precisely "move these 1000 slots from A to D", instead of consistent hashing's "add a node, and a pile of keys get their destinations recomputed as a side effect". It confirms that old line of computer science — **"any problem can be solved by adding a layer of indirection"**. The slot is that layer, turning "sharding", an inherently messy business, into "moving tidy boxes". When I design any system that has to shard and rebalance now, I first ask: **what should my "slot" be?** Find that fixed intermediate unit, and the difficulty of rescaling is half solved.

### Distribution's convenience always charges at the boundary

Cluster gives you horizontal scaling, but at the multi-key boundary it posts a clear price: no operating across slots together. It reminds me of a recurring law — **the capabilities of distributed systems almost always charge you at some boundary.** On a single Redis you can `MULTI` any pile of keys; on Cluster you have to tie related keys together with hash tags first or forget it. That isn't a Redis defect; it's the nature of sharding: the data is cut up and placed on different machines, so "operating together" necessarily costs something. So before adopting any distributed solution now, I ask one question: **at which boundary does it collect for the convenience?** — multi-key, cross-shard transactions, or cross-region latency? See the toll booth clearly, and the bill won't shock you after launch.

### Confirm you actually need Cluster first

Cold water to finish, as usual. Cluster is powerful, but it complicates a lot: multi-key restrictions, clients must support redirects, operations gain the slot-migration chore. **Many scenarios that seem to need Cluster are actually solved by [[redis-single-thread|one big enough machine]] + replicas** — a single Redis handling hundreds of thousands of requests a second with tens of GB of memory is routine. You truly need Cluster when **the data is too large for one machine's memory**, or **write throughput is more than one core can take** — those two are hard boundaries; reach them, then adopt. Before that, adding memory, adding replicas for reads, and optimising big keys is usually the better deal. **Confirm the pain is "one machine really isn't enough" before walking into the mountain of sharding** — a principle I apply to Redis exactly as to every other heavy weapon.
