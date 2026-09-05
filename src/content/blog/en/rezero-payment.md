---
title: "Third-Party Payments: Three Textbook Pitfalls, and Terrain That Has None"
date: 2026-07-26
category: tech
description: "First chapter on money and goods: two banks, smart transfers and cards, a partial payment split across five transfers — how per-provider fact tables plus derive-on-read make the webhook's duplicate, out-of-order and never-arrives pitfalls lose their attack surface entirely, and the observer pattern that followed nobody using our refund API."
tags:
  - war-story
  - live-commerce
  - payment
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 7
comments: true
draft: false
translationOf: rezero-payment
---
[[rezero-cart-order|The last chapter]] aggregated orders into three layers; now we have to collect the money. Payments are the first time this system hands "being correct" to somebody else — the payment happens at the bank, and you only learn the result across an [[ddia-distributed-trouble|unreliable network]]. The textbook warns you of three pitfalls: notifications will duplicate, arrive out of order, and never arrive at all. What this chapter is about is that we **fell into none of them** — not through luck, but because the design picked terrain that has no pits.

## The payment landscape we had

Four payment methods: **two banks** offering **smart transfer** and **credit card**, plus a custom **cash payment** (operations collecting offline and marking it received). And one hard requirement that existed from the start: **partial payment** — a transfer caps at 30,000 per transaction, so a checkout of 150,000 means the customer pays across five transfers.

That requirement is a death sentence for an `is_paid` boolean: money arrives **in instalments, across channels, asynchronously**. The data model was this:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 292" role="img" aria-label="The architecture of payment facts. At the top is orders payment, whose status is not stored but derived on read by aggregating facts: paid means the sum of received facts is at least the amount due. In the middle are four independent fact tables: Bank A smart transfer facts, Bank A card facts, Bank B payment facts, and cash receipts marked by operations. On the left, partial payment is annotated: a payment of one hundred and fifty thousand, against a per-transfer cap of thirty thousand, becomes five transfer facts. At the bottom are two write channels: webhooks for live notification and polling to query actively, both writing into the same fact tables — because facts are idempotent, overlap is harmless and each backs up the other." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rpu" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rpg" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <rect x="130" y="16" width="320" height="46" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="290" y="35" fill="#4f6df5" font-size="9.2" text-anchor="middle" font-weight="bold">orders payment</text>
    <text x="290" y="52" fill="#9aa4b2" font-size="7" text-anchor="middle">status not stored, aggregated on read: paid = SUM(facts) ≥ due</text>
    <line x1="147" y1="112" x2="220" y2="64" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rpu)"/>
    <line x1="275" y1="112" x2="268" y2="64" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rpu)"/>
    <line x1="403" y1="112" x2="312" y2="64" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rpu)"/>
    <line x1="520" y1="112" x2="360" y2="64" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rpu)"/>
    <rect x="88" y="116" width="118" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="147" y="134" fill="#e6e6e6" font-size="7.2" text-anchor="middle" font-weight="bold">Bank A · smart transfer</text>
    <text x="147" y="149" fill="#9aa4b2" font-size="6.4" text-anchor="middle">fact table</text>
    <rect x="216" y="116" width="118" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="275" y="134" fill="#e6e6e6" font-size="7.2" text-anchor="middle" font-weight="bold">Bank A · card</text>
    <text x="275" y="149" fill="#9aa4b2" font-size="6.4" text-anchor="middle">fact table</text>
    <rect x="344" y="116" width="118" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="403" y="134" fill="#e6e6e6" font-size="7.2" text-anchor="middle" font-weight="bold">Bank B · payment</text>
    <text x="403" y="149" fill="#9aa4b2" font-size="6.4" text-anchor="middle">fact table</text>
    <rect x="472" y="116" width="96" height="44" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="520" y="134" fill="#d6a45c" font-size="7.2" text-anchor="middle" font-weight="bold">cash receipt</text>
    <text x="520" y="149" fill="#9aa4b2" font-size="6.4" text-anchor="middle">ops-marked</text>
    <rect x="14" y="112" width="62" height="52" rx="5" fill="none" stroke="#9b6ff0" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="45" y="130" fill="#9b6ff0" font-size="6.2" text-anchor="middle">150,000</text>
    <text x="45" y="142" fill="#9b6ff0" font-size="6.2" text-anchor="middle">cap 30k each</text>
    <text x="45" y="154" fill="#9b6ff0" font-size="6.2" text-anchor="middle">= 5 facts</text>
    <rect x="120" y="212" width="160" height="40" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="200" y="228" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">webhook (live)</text>
    <text x="200" y="243" fill="#9aa4b2" font-size="6.4" text-anchor="middle">the bank pushes it</text>
    <rect x="300" y="212" width="160" height="40" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="380" y="228" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">polling (backstop)</text>
    <text x="380" y="243" fill="#9aa4b2" font-size="6.4" text-anchor="middle">scheduled queries</text>
    <line x1="200" y1="212" x2="240" y2="162" stroke="#54b890" stroke-width="1.1" marker-end="url(#rpg)"/>
    <line x1="380" y1="212" x2="350" y2="162" stroke="#54b890" stroke-width="1.1" marker-end="url(#rpg)"/>
    <text x="290" y="278" fill="#9aa4b2" font-size="7.4" text-anchor="middle">Both channels write the same fact tables — facts are idempotent, so overlap is harmless and each backs the other</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">One fact table per provider, insert-only; the payment's status is computed at read time, not updated by anyone.</figcaption>
</figure>

Three design decisions, and notice how they interlock:

- **One fact table per third party.** Bank A's transfers, Bank A's cards, Bank B, cash — each raw fact stored on its own, rather than crammed into one "generic payment table" with columns forced to fit. Adding a payment method means adding a fact table and an aggregation rule, and "cash" is simply a provider whose receipts are marked by operations.
- **The payment's status is derived, computed at read time.** Paid or not = the sum of received facts against the amount due. There is no status column being UPDATEd.
- **Do both webhook and polling, writing the same fact tables.** The textbook asks you to choose between "live but may miss" and "reliable but slow" — here we take both.

## The textbook's three pitfalls

Let's be clear about the pitfalls, because they're real and the industry falls into them daily. In a world where **the callback updates status**:

1. **Duplicate notification**: the bank re-sends "payment succeeded" and your status transitions twice — dirty logs at best, duplicate shipments and duplicate invoices at worst. Hence idempotency keys.
2. **Out of order**: "payment succeeded" arrives before the internal processing of "order created", or two partial-payment notifications swap places — the state machine goes the wrong way and may never come back. Hence sequence numbers, buffers, compensating logic.
3. **Never arrives**: the network dropped it, the bank forgot, and your order sits in "awaiting payment" until the end of time. Hence an active query as a backstop.

Three pitfalls, three sets of defences, each one extra code and extra test surface — that's daily life in most payment integrations.

## Terrain that has no pits

In the system we had, the felt experience of those three was "**we don't seem to have run into any problems**". Substitute the architecture above and the reason is plain:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 234" role="img" aria-label="A comparison of two worlds. On the left, crossed out: the world where a callback updates status, with the webhook running an UPDATE directly on the order status — a duplicate notification transitions the state twice, an out-of-order one sends the status backwards, and a missing one leaves the status stuck forever, each pitfall needing its own defence. On the right, ticked: the world where a callback only writes a fact and status is derived on read — a duplicate is the same fact landing again and is harmless, ordering doesn't matter because the aggregate is computed at read time, and a missing notification is filled in by polling. The three pitfalls lose their attack surface, because there is no status to break." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="290" y1="14" x2="290" y2="210" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="145" y="28" fill="#e05a7d" font-size="9" text-anchor="middle" font-weight="bold">✗ Callback updates status</text>
    <rect x="40" y="40" width="210" height="26" rx="5" fill="#3a2632" stroke="#e05a7d" stroke-width="1.2"/>
    <text x="145" y="57" fill="#e6e6e6" font-size="7.2" text-anchor="middle">webhook → UPDATE a status column</text>
    <text x="145" y="92" fill="#e05a7d" font-size="7.4" text-anchor="middle">duplicate → the state transitions twice</text>
    <text x="145" y="116" fill="#e05a7d" font-size="7.4" text-anchor="middle">out of order → status runs backwards</text>
    <text x="145" y="140" fill="#e05a7d" font-size="7.4" text-anchor="middle">never arrives → stuck on "awaiting payment"</text>
    <text x="145" y="176" fill="#9aa4b2" font-size="6.8" text-anchor="middle">each pit needs its own defence:</text>
    <text x="145" y="190" fill="#9aa4b2" font-size="6.8" text-anchor="middle">idempotency keys, buffers, compensating queries</text>
    <text x="435" y="28" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">✓ Callbacks write facts, status derived on read</text>
    <rect x="330" y="40" width="210" height="26" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="435" y="57" fill="#e6e6e6" font-size="7.2" text-anchor="middle">webhook / polling → INSERT a fact</text>
    <text x="435" y="92" fill="#54b890" font-size="7.4" text-anchor="middle">duplicate → same fact, land it any number of times</text>
    <text x="435" y="116" fill="#54b890" font-size="7.4" text-anchor="middle">out of order → the sum is computed on read</text>
    <text x="435" y="140" fill="#54b890" font-size="7.4" text-anchor="middle">never arrives → polling fills the fact in</text>
    <text x="435" y="176" fill="#9aa4b2" font-size="6.8" text-anchor="middle">there is no status that can be broken,</text>
    <text x="435" y="190" fill="#9aa4b2" font-size="6.8" text-anchor="middle">so all three pits lose their attack surface</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The same three threats, two kinds of terrain: on one you build three forts, on the other there's nothing to attack.</figcaption>
</figure>

- **Duplicate notification?** The callback only writes down the fact that "Bank A says this transfer landed" — write the same fact any number of times and the aggregate gives the same answer.
- **Out of order?** Which of five partial payments arrives first doesn't matter at all — each fact lands on its own, and the `SUM` happens at read time.
- **Never arrives?** The polling schedule fills in the missing fact — and because it's idempotent, polling overlapping with the webhook is harmless, so the two channels back each other up.

The cost of three defences drops to zero, because **there is no status that can be broken**. This is the final payoff of the series' recurring theme of appending facts and deriving state: the same principle taught you at [[rezero-comment-order|the comment layer]] that a fact only counts if it's wired to a path (raw lying in a warehouse, replay never fired), gave you reconciliation at [[rezero-inventory|the stock layer]], and at the payment layer simply makes the nastiest class of bug extinct.

Reconciliation follows the same structure in tiers: one bank's payment records carry the orders payment id and **reconcile automatically**; cash relies on operations marking it — another "automatic takes the bulk, humans take the residue" funnel, isomorphic to the binding funnel in [[rezero-identity|the identity chapter]].

## An aside: the status column everyone kept wanting to add

This "derive status on read" design wasn't unanimously applauded — it was **held off**. More than once the CTO and several colleagues wanted to add an order status column: a `status` you could query and filter directly, very convenient on a list page. I stubbornly refused, with the same reason every time: **that status is by nature an aggregate of other columns and facts — building the column means building a cache.** Once a cache exists it has to answer everything a cache has to answer: who updates it, which write paths must remember to sync it, and who wins when it drifts. And we had no performance problem at all. **Don't build a cache until you actually have a performance problem.**

That position isn't a dogmatic refusal to materialise — [[rezero-inventory|the stock chapter]]'s sold count *is* a materialised derived value, because it sits on the hot path of ordering (every comment has to check the invariant) and came with hourly recomputation as self-repair. Both decisions used the same ruler: **the only legitimate reason to materialise a derived value is a measured read cost; and once you have, you must admit it's a cache and give it recomputation and reconciliation.** "It's convenient to query" isn't on the list of legitimate reasons — the price of that convenience is one more column that can lie to you.

## Refunds: the system retreats to the observer's seat

The refund story is a sibling of [[rezero-cart-order|the state machine lesson]]. We built a proper refund API — wired to the bank, the flow packaged up — and **operations didn't like using it**. They were used to opening the bank's own console and hitting refund: fast, familiar, with the balance right there.

After some struggle, the decision was to let go. Operations pressed the bank's button, then marked the order "refunding" — and **a scheduled job took over, syncing the refund's actual progress**. The system stepped back from being the executor to being the observer: **a human acts, the system reconciles.**

That abdication is of a piece with the whole chapter's architecture: refund progress is just another set of facts, who triggered it doesn't matter, and the system's job is to chase the fact down and derive the status correctly. Insisting operations go through your API is, at bottom, building your self-worth on whether other people use your interface; giving the system the ability to catch up with reality is spending engineering where it counts.

## Reflections

### The best defence is choosing the terrain

Most writing on payment integration teaches you how to guard the three pitfalls: how to design idempotency keys, how to buffer out-of-order events, how often to run compensating queries. All correct — but they're **techniques for fighting on the wrong terrain**. The system we had none of those defences and none of those wounds, because "facts are insert-only, status is derived on read" means the pits don't exist. The long-run lesson for me: when you meet a recurring class of bug, don't rush to add defences — **ask whether there's a data model in which that class of bug has no foothold.** Defences are interest; terrain is the principal.

### In a system that handles money, humility beats cleverness

Two retreats in this chapter: no transition rules on status (follow the facts), and refunds not going through our own API (let operations use the bank). Both are the system bowing to reality — and in hindsight both were right. Money flows between the bank, operations and the customer, and your system is only ever one participant. Positioning yourself as "a faithful ledger of every monetary fact" rather than "the only entrance to the money process" makes correctness *easier* to hold. **A ledger doesn't need to control the world, only to record it faithfully.**

### "We didn't run into problems" is the highest grade of result

Payments should be the most incident-prone part of the whole system — the most external dependencies, an unreliable network, the highest cost of getting money wrong — and it's the calmest chapter in the series so far. Two boring chapters in a row ([[rezero-cart-order|the last one]]'s checkout too), boring for the same reason: get the relationship between facts and derivations right early, and complexity never grows later. Which is also the most unfair thing in engineering: **the reward for good architecture is paid out in the form of "no stories"** — everyone can see the person fighting the fire, and nobody gets a medal for the fire that never started. A large part of my later job as an EM was learning to see, and reward, the people with no stories.
