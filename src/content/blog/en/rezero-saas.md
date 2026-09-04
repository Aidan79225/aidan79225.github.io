---
title: "A Parallel World: What If It Had Become a SaaS"
date: 2026-08-02
category: tech
description: "Every one of us took a pay cut to board this ship, and the ship we were promised was this SaaS — which never left the vision deck before the voyage ended. This chapter finishes the design that was never drawn: bidding key collisions, tenant-level blocklists, fairness under a peak, four stations from one Cloud SQL to a distributed database, and capacity and cost computed from real measured numbers — what 10, 100 and 1,000 merchants actually burn."
tags:
  - war-story
  - live-commerce
  - system-design
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 20
comments: true
draft: false
translationOf: rezero-saas
---
First, something nineteen chapters never mentioned: **every one of us took a pay cut to join.** What the pay cut bought was a promise — the live-commerce platform we were building was only the first stop, and what we were really building was a SaaS: selling the whole system to every merchant who wanted to do live commerce.

The ship stayed on the vision deck; the voyage ended on that day in [[rezero-microservices|the last chapter]]. So this is the series' only parallel world: **finishing the design that was never drawn.** Every anchor comes from the real system and real numbers of the previous nineteen chapters; the design is me today; and the numbers are an engineer's Fermi estimate — orders of magnitude, not decimal places.

Pin the setup down first: **a tenant is a merchant** — one host's whole operation (host, assistant, operations, support) running their own live-commerce business on our platform.

## A quick pass: what surfaces the moment you go multi-tenant

The first wall you hit is the smallest thing: **the bidding key.** `2601` is a scarf at merchant A and an earring at merchant B — the key's namespace goes from global to `(tenant, key)`. The [[rezero-comment-order|FSM]] needs not one line changed (it parses text); what changes is the lookup end: the bidding key query carries a `tenant_id`. **The lookup-as-validation dividend returns: validation logic lives in the DB query, so going multi-tenant only touches the query, never the parser.**

Then a comprehensive `tenant_id` tour: rounds, products, carts, orders, payment fact tables, allocation logs, image_metadata — **every table carries it**. Finishing the tour surfaces a fact nobody had noticed: **this system's business is naturally tenant-local.** Every transaction happens between "one merchant and their customers" — orders by comment happen in that merchant's stream, [[rezero-cart-order|cross-round merged checkout]] merges that merchant's rounds, [[rezero-cart-order|closing a round]] clears their own carts. Not one business flow crosses merchants. That observation is the foundation for every section below.

## Identity and blocklists: at which level do you draw the line?

The first genuine design question. The same Facebook buyer will buy from ten merchants — is [[rezero-identity|#4]]'s laboriously built identity system ten independent copies, or one at platform level? [[rezero-risk|#13]]'s blocklist sharpens it: **if merchant A blocklists a bad customer, does merchant B see it?**

The platform-level temptation is concrete: bind once and use everywhere (N times less support work), and a shared blocklist becomes a credit bureau for the whole industry — a selling point, even. But my answer is: **tenant level.**

- **Customer relationships are the merchant's asset.** The list, the phone numbers, the purchase history, who the bad customers are — the merchant earned all of that. A platform using A's blocklist to protect B is subsidising A's competitor with A's asset; the moment merchants realise it, trust in the platform is gone.
- **False positives amplify across tenants.** #13 said the value of graduated sanctions is that false positives get absorbed structurally — inside one merchant, a mistaken one-month lock is recoverable. Platform-level association amplifies one false positive into "banned across an entire industry", and no structure absorbs that.
- **Legal and privacy** become a completely different order of problem the moment personal data is shared across tenants.

Technically it means identity, bindings and banned users all carry `tenant_id`; the same Facebook user at two merchants is two identities that have never met. The platform **is technically able** to correlate them underneath (the same Facebook app's ASIDs match), but "can" and "should" stay separate — keep the capability, don't ship the product. The only platform-level blocklist is for **attackers on the platform itself** (API abuse, quota hammering): that's the platform's own asset, and the platform manages it.

## Fairness under a peak: everyone silts in their own queue

[[rezero-flash-crowd|#14]]'s virtue becomes unfairness under multi-tenancy. Picture prime time: a big host opens bidding and a flood of 200 comments a second pours into the FSM batch; three minutes later a small host's customer types `2601+1` — and those 5 comments queue behind eight thousand. **A small merchant's customers are paying latency for a big merchant's success.**

With one tenant, "silts but doesn't fall" is a virtue, because the queue you silt is your own and the latency you pay is your own; multi-tenant, **who pays in the currency of latency** becomes a fairness question — and fairness is exactly what a SaaS SLA is. The answer is a ladder you climb with scale:

1. **Per-tenant queues with fair consumption**: comments queue by tenant, the batch round-robins each pass, and each tenant gets at most N per pass — a big host's flood silts only their own queue, and the small host's 5 comments are handled next pass. It's a small change (fetching already knows which tenant a comment belongs to), and it buys "each merchant's latency depends only on their own volume".
2. **Dedicated workers for large tenants**: a big host on the enterprise plan gets their own consumer process — a silo at the compute layer.
3. **Per-tenant adaptive fetching rhythm**: [[rezero-comment-order|#3]]'s adaptive fetching was per-source anyway, so it fits naturally.

One line for this section: **isolation isn't for performance, it's for fairness.**

## How one Cloud SQL grows into a distributed database

The question every engineer wants: how does that 8-core Cloud SQL grow to a thousand merchants? Four stations, each with an explicit trigger — **the trigger matters more than the technology choice, because for most SaaS the correct answer is stopping at an early station.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 292" role="img" aria-label="Four stations in a database's move towards distribution. Station one: a single instance plus tenant id, with every table carrying the tenant column and leading composite indexes — the terminus for most SaaS; the trigger for moving on is connection count, data volume and noisy neighbours, not a feeling. Station two: read/write separation, with replicas absorbing reporting and storefront read traffic, buying time. Station three: a pool plus silo hybrid, with small merchants sharing a pooled shard and big hosts on their own database — simultaneously the database-layer answer to noisy neighbours and the commercial tiering of an enterprise plan, with per-tenant backup and restore as the killer advantage. Station four: real sharding, Citus-style by tenant id or NewSQL, with the honest note that most live-commerce SaaS never reach it." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="24" y="28" width="256" height="104" rx="7" fill="#1f2330" stroke="#54b890" stroke-width="1.3"/>
    <text x="152" y="48" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">Station 1: one instance + tenant_id</text>
    <text x="152" y="66" fill="#e6e6e6" font-size="6.4" text-anchor="middle">every table carries tenant_id · leading composite index</text>
    <text x="152" y="80" fill="#9aa4b2" font-size="6.2" text-anchor="middle">the terminus for most SaaS</text>
    <text x="152" y="100" fill="#d6a45c" font-size="6.2" text-anchor="middle">trigger to move on: connections, data volume,</text>
    <text x="152" y="112" fill="#d6a45c" font-size="6.2" text-anchor="middle">noisy neighbours — not "it feels time to distribute"</text>
    <rect x="300" y="28" width="256" height="104" rx="7" fill="#1f2330" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="428" y="48" fill="#4f6df5" font-size="7.4" text-anchor="middle" font-weight="bold">Station 2: read/write separation</text>
    <text x="428" y="66" fill="#e6e6e6" font-size="6.4" text-anchor="middle">replicas absorb reporting and storefront reads</text>
    <text x="428" y="80" fill="#9aa4b2" font-size="6.2" text-anchor="middle">writes still single-point; this station buys time</text>
    <text x="428" y="100" fill="#d6a45c" font-size="6.2" text-anchor="middle">trigger: reads overwhelm writes, reports disturb trading</text>
    <rect x="24" y="152" width="256" height="120" rx="7" fill="#1f2330" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="152" y="172" fill="#d6a45c" font-size="7.4" text-anchor="middle" font-weight="bold">Station 3: pool + silo hybrid</text>
    <text x="152" y="190" fill="#e6e6e6" font-size="6.4" text-anchor="middle">small merchants share a pooled shard · big hosts get their own DB</text>
    <text x="152" y="204" fill="#9aa4b2" font-size="6.2" text-anchor="middle">the DB-layer answer to noisy neighbours = enterprise tiering</text>
    <text x="152" y="218" fill="#9aa4b2" font-size="6.2" text-anchor="middle">per-tenant backup/restore = the silo's killer advantage</text>
    <text x="152" y="238" fill="#d6a45c" font-size="6.2" text-anchor="middle">upgrading tiers means a move: one merchant's downtime,</text>
    <text x="152" y="250" fill="#d6a45c" font-size="6.2" text-anchor="middle">affecting only them, scheduled late at night</text>
    <rect x="300" y="152" width="256" height="120" rx="7" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.3"/>
    <text x="428" y="172" fill="#9b6ff0" font-size="7.4" text-anchor="middle" font-weight="bold">Station 4: real sharding</text>
    <text x="428" y="190" fill="#e6e6e6" font-size="6.4" text-anchor="middle">Citus-style shard by tenant_id / NewSQL</text>
    <text x="428" y="204" fill="#9aa4b2" font-size="6.2" text-anchor="middle">needed only when the pool itself must scale out</text>
    <text x="428" y="224" fill="#e05a7d" font-size="6.4" text-anchor="middle" font-weight="bold">honestly:</text>
    <text x="428" y="238" fill="#e05a7d" font-size="6.2" text-anchor="middle">most live-commerce SaaS never reach this station</text>
    <line x1="280" y1="80" x2="300" y2="80" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 296 76 L 302 80 L 296 84 Z" fill="#9aa4b2"/>
    <line x1="428" y1="132" x2="428" y2="140" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="428" y1="140" x2="152" y2="140" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="152" y1="140" x2="152" y2="152" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 148 148 L 152 154 L 156 148 Z" fill="#9aa4b2"/>
    <line x1="280" y1="212" x2="300" y2="212" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 296 208 L 302 212 L 296 216 Z" fill="#9aa4b2"/>
    <text x="290" y="288" fill="#e6e6e6" font-size="7" text-anchor="middle" font-weight="bold">Every station has a trigger — untriggered, you stay put; evolution is a response, not an interest</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">From one 8-core Cloud SQL to distributed, in four stations — most SaaS need only the first two for a lifetime, and that's a good thing.</figcaption>
</figure>

The stations' details are in the diagram; what's worth expanding is **what breaks after sharding** — because that list is the final acceptance test of nineteen chapters of discipline:

- **Cross-shard transactions**: the most expensive thing in a distributed database. And this system **has almost none** — as the quick pass said, all the business is tenant-local, and even identity and blocklists went tenant-level; shard the data by `tenant_id` and **every transaction naturally lands inside a single shard**. Not finding one business flow needing a cross-tenant transaction isn't luck, it's terrain accumulated by [[rezero-cart-order|3NF]], [[rezero-payment|fact tables]] and [[rezero-identity|identity layering]].
- **Globally unique IDs**: a DB sequence stops working across shards, so switch to per-tenant sequences or a snowflake algorithm — a small change, but one to finish before sharding.
- **Fleet migration**: one schema migration has to run across N databases, needing tooling (rolling per shard, recording versions) — the invisible operational tax after station 3.
- **Repair loops parallelise naturally**: [[rezero-inventory|hourly recomputation]], [[rezero-asset-lifecycle|the daily sweep]] and friends are all per-tenant loops, so after sharding they simply run per shard in parallel — [[rezero-reconciliation|#16]]'s "unbundled database" splits along the tenant's grain in every component, so **an unbundled database shards better than a real one**.
- **The only cross-tenant needs are the platform's own**: operational reports, billing, platform-wide analytics — all of which go through ELT into a warehouse and never touch the transactional database. The platform's analytics and the merchants' transactions should be two separate roads from day one.

## Capacity and cost: what does this ship burn?

Every engineer's SaaS dream ends up at this gate: **how many machines, how much money, how much revenue keeps you alive.** This section walks it as a Fermi estimate, and we have a rare luxury: the anchor isn't a guess, it's measured in [[rezero-flash-crowd|#14]].

**The anchor (measured then)**: one large merchant at full load = 13,000 viewers online, 200 comments a second at peak, carried by one **e2-custom-8-21504** (8 vCPU, 21 GB — the actual machine type) plus one **8-core Cloud SQL**. List-price magnitudes: about $200/month for the VM, about $400/month for Cloud SQL — **one large-merchant unit (with sundries) around $700/month.** Every number below is built on that unit, assumed fully allocated; substitute your own if you like.

**Distribution assumptions**: merchant sizes follow a power law — 5% large (tens of thousands online), 15% medium (thousands, load around a tenth of a large one), 80% small (hundreds, around a hundredth); streams cluster in prime time, so take **30% streaming concurrently at peak**.

| Scale | Peak load (large-merchant units) | App VMs (e2-8) | DB | Monthly cost magnitude | Per merchant |
|---|---|---|---|---|---|
| 10 merchants | ~0.4 | 2 (minimum) | pool ×1 | ~$1,000 | ~$100 |
| 100 merchants | ~2.7 | 6 | silo ×5 + pool ×3 | ~$5,000 | ~$50 |
| 1,000 merchants | ~22 | 30 | silo ×50 + pool ×25 | ~$40,000 | ~$40 |

Three conclusions read out of that table matter more than the table:

1. **Falling per-merchant cost is exactly where SaaS margin comes from** — but it falls more slowly than you'd think, because **silo databases dominate the cost** (at 1,000 merchants, the DB is three quarters of it). The pricing answer is written directly into the cost structure: a small merchant's subscription needs to land around NT$3,000/month for healthy margin; a big host's silo and dedicated workers are the cost basis for enterprise pricing — or go straight to a GMV cut and let revenue grow with the merchant's peaks. [[rezero-permission|#10]]'s cost monitor role is promoted here from an internal role into a per-tenant billing table: **#14 said the bill is an attack surface; this chapter adds that the bill is also the business model.**
2. **The table's most sensitive parameter is concurrency.** Move 30% to 60% (imagine an anniversary sale where everyone adds streams) and capacity demand doubles. With one tenant, [[rezero-flash-crowd|the business model shaved its own peak]] (the host's spoken rhythm is natural flow control); at the SaaS layer the same theorem reappears: **not every merchant streaming at once is capacity's salvation** — and it can even be productised: a scheduling calendar, a discount for off-peak streaming, selling capacity management to merchants.
3. Compared with back then: the whole storefront, one VM and one DB, burned under a thousand dollars a month. SaaS money isn't spent on technical upgrades, **it's spent replicating one merchant's miracle a thousand times.**

## The most expensive part: turning internal tools into a product

Everything above is estimable cost. What's genuinely expensive is the part you can't estimate.

[[rezero-console|#9]] described this system's operational philosophy: five roles, five interfaces, with "exotic requirements" answered by **a rough draft plus admin filling the gap** — build half of an uncertain requirement and have an engineer support the rest by hand in Django admin. In a single tenant that's wisdom: how much you invest in an interface equals how certain the requirement is, and uncertain things don't deserve complete interfaces.

**SaaS kills that pattern outright.** An engineer cannot run admin for 500 merchants; "shout if it breaks", "we'll teach you verbally", "permissions run on trust" — every implicit premise of internal tooling assumes users and developers under one roof. As a product, every one of those has to be filled in: self-service configuration screens, error messages written for outsiders, an onboarding flow, documentation, [[rezero-permission|#10]]'s role model becoming each tenant's own permission management, audit logs becoming operation history the merchant can see. All five interfaces have to be ground from "usable internally" to "an outsider can use it alone".

That's where the headcount goes. A distributed database is a **solved problem** — there's Citus, there's the cloud, there's a four-station roadmap to follow; grinding internal tools into a product has **no off-the-shelf package at all**, only one interface and one document at a time. And it forces you to face a discipline that a single-tenant era could dodge: every exotic requirement now has to be decided as "productise it, or don't do it" — **that comfortable middle state called admin no longer exists.**

## Reflections

**A system that splits easily is compound interest on discipline.** Every design question in this chapter has a suspiciously short answer: identity was already layered, the business is already tenant-local, repair loops already parallelise, cross-shard transactions simply don't exist. It's not that SaaS is easy — it's that nineteen chapters paid the hard parts off in advance. **Architectural evolvability isn't a future feature, it's past discipline**; every extra fact you store today and every state you decline to materialise is helping the version of you who has to shard in three years.

**The business model shaves its own peak, for the second time.** With one tenant, the host's spoken rhythm was natural flow control; at the SaaS layer, merchants streaming at different times naturally flattens capacity. Both times the lesson is the same: **page one of capacity planning isn't machines, it's the shape of the business model** — read it correctly and you save more machines than any optimisation.

**The point of a parallel world isn't regret, it's an acceptance test.** Finishing this chapter I noticed something quiet: the ship's blueprints were there all along — every decision across nineteen chapters, identity layering, fact tables, tenant locality, the unbundled database, is one of the ship's planks. The ship never sailed, but it could have carried the weight of the dream. That sentence is for everyone who took a pay cut to board it.

That's the end of the parallel world. Back to the real timeline — next chapter, the finale: **what "Re:" actually means.**
