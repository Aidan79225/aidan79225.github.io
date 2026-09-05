---
title: "Reconciliation: We Never Built It, So Why Did the Books Balance?"
date: 2026-08-01
category: tech
description: "This chapter was supposed to be how we reconciled three ledgers. Checking the record turned up something else: there was no reconciliation in the system at all — and the books were almost never wrong. The answer is scattered across the previous fifteen chapters: the whole system is an unbundled database, and the way we restored consistency wasn't by writing reconciliation code, it was materialising less and deriving more, leaving drift nowhere to happen."
tags:
  - war-story
  - live-commerce
  - data-consistency
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 16
comments: true
draft: false
translationOf: rezero-reconciliation
---
In the plan this chapter was called "the three ledgers: stock, orders, payments", and it was going to be about how we reconciled them. As usual I went back to check what we actually did before writing — and the answer is: **we didn't reconcile.** There was no reconciliation job in the system, no balancing at the end of a round, and after launch we barely ever handled a wrong figure.

A system handling real money, with no reconciliation mechanism, whose books were almost never wrong — that sentence deserves more explanation than any reconciliation architecture. The answer is scattered across the previous fifteen chapters, and this one gathers it up.

## An unbundled database

Start with a realisation that only surfaced halfway through the series. One day I was staring at the whole system and it suddenly looked familiar: **everything we built is a scaled-up version of a database's internals.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 288" role="img" aria-label="An unbundled database: the left column is a database's internals and the right column is our system's counterpart, matched row by row. Write-ahead logging corresponds to comments being landed after cleaning; a log consumer building indexes corresponds to the FSM batch building carts; a materialised view corresponds to the sold-quantity count; a view computed at read time corresponds to payment and order status derived on read; a redo log corresponds to the replayable allocation records; a built-in scheduler corresponds to heartbeat table scans; and repair corresponds to the hourly recomputation of sold quantities. The conclusion at the bottom: the price of unbundling is having to restore, one by one, the transactional guarantees a database gives you for free." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="145" y="24" fill="#4f6df5" font-size="8.4" text-anchor="middle" font-weight="bold">Inside a database</text>
    <text x="435" y="24" fill="#9ccc65" font-size="8.4" text-anchor="middle" font-weight="bold">Our system</text>
    <rect x="30" y="36" width="230" height="22" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/>
    <text x="145" y="51" fill="#e6e6e6" font-size="6.8" text-anchor="middle">WAL: write the log before anything else</text>
    <rect x="320" y="36" width="230" height="22" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="435" y="51" fill="#e6e6e6" font-size="6.8" text-anchor="middle">comments cleaned, then appended and landed</text>
    <line x1="260" y1="47" x2="320" y2="47" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <rect x="30" y="64" width="230" height="22" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/>
    <text x="145" y="79" fill="#e6e6e6" font-size="6.8" text-anchor="middle">log consumer: digest the log, build indexes</text>
    <rect x="320" y="64" width="230" height="22" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="435" y="79" fill="#e6e6e6" font-size="6.8" text-anchor="middle">FSM batch digests comments, builds carts</text>
    <line x1="260" y1="75" x2="320" y2="75" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <rect x="30" y="92" width="230" height="22" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/>
    <text x="145" y="107" fill="#e6e6e6" font-size="6.8" text-anchor="middle">materialised view: computed and stored</text>
    <rect x="320" y="92" width="230" height="22" rx="4" fill="#1f2330" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="435" y="107" fill="#e6e6e6" font-size="6.8" text-anchor="middle">sold-quantity count (the only materialisation)</text>
    <line x1="260" y1="103" x2="320" y2="103" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <rect x="30" y="120" width="230" height="22" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/>
    <text x="145" y="135" fill="#e6e6e6" font-size="6.8" text-anchor="middle">view: computed at read time</text>
    <rect x="320" y="120" width="230" height="22" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="435" y="135" fill="#e6e6e6" font-size="6.8" text-anchor="middle">payment / order status derived on read</text>
    <line x1="260" y1="131" x2="320" y2="131" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <rect x="30" y="148" width="230" height="22" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/>
    <text x="145" y="163" fill="#e6e6e6" font-size="6.8" text-anchor="middle">redo log: a replayable history of change</text>
    <rect x="320" y="148" width="230" height="22" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="435" y="163" fill="#e6e6e6" font-size="6.8" text-anchor="middle">allocation log: rebuildable end to end</text>
    <line x1="260" y1="159" x2="320" y2="159" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <rect x="30" y="176" width="230" height="22" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/>
    <text x="145" y="191" fill="#e6e6e6" font-size="6.8" text-anchor="middle">built-in scheduler: vacuum, checkpoint</text>
    <rect x="320" y="176" width="230" height="22" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="435" y="191" fill="#e6e6e6" font-size="6.8" text-anchor="middle">heartbeat scans: chasing payment, settlement</text>
    <line x1="260" y1="187" x2="320" y2="187" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <rect x="30" y="204" width="230" height="22" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/>
    <text x="145" y="219" fill="#e6e6e6" font-size="6.8" text-anchor="middle">repair: fix it back from the facts</text>
    <rect x="320" y="204" width="230" height="22" rx="4" fill="#1f2330" stroke="#54b890" stroke-width="1.2"/>
    <text x="435" y="219" fill="#e6e6e6" font-size="6.8" text-anchor="middle">hourly recomputation of sold quantities</text>
    <line x1="260" y1="215" x2="320" y2="215" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="290" y="252" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">The price of unbundling: restoring, one by one, the guarantees a database gives you free</text>
    <text x="290" y="272" fill="#9aa4b2" font-size="6.8" text-anchor="middle">And this chapter answers how we restored the one called "consistency"</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The whole system is a database taken apart and laid out on a table — every component has its counterpart.</figcaption>
</figure>

Landing comments after cleaning is the WAL ([[rezero-comment-order|#3]]); the FSM batch digesting comments into carts is a log consumer building indexes; the sold quantity is a materialised view ([[rezero-inventory|#5]]); payment status derived on read is a view ([[rezero-payment|#7]]); the allocation log being rebuildable end to end is a redo log ([[rezero-fulfillment|#8]]); heartbeat table scans are the built-in scheduler ([[rezero-ops|#15]]); and the hourly recomputation is repair. [[ddia-future|DDIA's final chapter]] calls this an **unbundled database** — take a database apart and reassemble it out of individual components. We'd never read that chapter, and spent a year and a half building it.

Unbundling isn't free. Inside a database an index always keeps up with the heap, a materialised view has refresh guarantees, and a transaction covers everything; unbundled, **those guarantees are yours to restore**. Reconciliation is in theory the last line of "restoring consistency yourself" — so "we didn't reconcile" needs an accounting.

## Three ledgers, and which of them drifts

Lay out the three ledgers and their sources of truth:

- **The stock ledger**: cap plus sold quantity, [[rezero-inventory|one dedicated table, two columns]].
- **The order ledger**: order and order item, with amounts [[rezero-cart-order|frozen into accounting facts]] at the moment of sale.
- **The payment ledger**: orders payment, backed by [[rezero-payment|per-provider payment fact tables]].

For a ledger to go wrong, the necessary condition is **the same fact existing in two places, each updated separately** — only redundancy drifts. Measure the three ledgers with that ruler and it gets interesting:

**The order and payment ledgers carry almost no redundancy.** An order's "status" isn't a column, it's derived from facts at read time; payment progress isn't a boolean, it's the sum of per-provider fact tables. [[rezero-promotion|Promotion amounts]] use floor-and-subtract, where the totals matching is guaranteed by the algorithm rather than checked afterwards. **With no second ledger that can drift, there's no ledger to reconcile** — that isn't us reconciling well, it's these two ledgers structurally abolishing the need.

**The stock ledger has exactly one redundancy.** The sold quantity is the one number in the whole system deliberately materialised — for the speed of a live moment, there was no alternative. And it really did drift: [[rezero-inventory|the oversell after that migration]] is exactly this number knocked out of true by a requirement change. Its line of defence is the hourly recomputation: recompute the count wholesale from the facts in carts and orders. **One redundancy, one repair loop, balanced.**

So the first layer of the answer to "no reconciliation": **the need for reconciliation is proportional to materialised redundancy.** We squeezed redundancy down to one, and reconciliation shrank to one scheduled job — so quiet that nobody ever called it reconciliation.

## The real reconciliation happens outside the system

The second layer: reconciliation did exist, just not in the system — **it was in the accounting department**.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="The reconciliation process outside the system. The system exports orders in the format accounting requires; the accounting department reconciles after each round ends; on finding a discrepancy they ask the CTO to assign an engineer to investigate, after which the fix takes one of two paths: if we undercharged, an engineer adjusts the database so the amounts line up, absorbed internally; if we overcharged, support contacts the customer and refunds loyalty points or cash, compensated externally. A note: after launch we barely remember handling a wrong figure at all." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="30" y="40" width="150" height="46" rx="6" fill="#1f2330" stroke="#9ccc65" stroke-width="1.2"/>
    <text x="105" y="59" fill="#e6e6e6" font-size="7" text-anchor="middle">the system's job</text>
    <text x="105" y="74" fill="#9ccc65" font-size="6.6" text-anchor="middle">export orders as accounting asks</text>
    <line x1="180" y1="63" x2="240" y2="63" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 236 59 L 242 63 L 236 67 Z" fill="#9aa4b2"/>
    <text x="210" y="54" fill="#9aa4b2" font-size="6.2" text-anchor="middle">translation</text>
    <rect x="242" y="40" width="150" height="46" rx="6" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="317" y="59" fill="#e6e6e6" font-size="7" text-anchor="middle">accounting department</text>
    <text x="317" y="74" fill="#9aa4b2" font-size="6.6" text-anchor="middle">reconciles after each round</text>
    <line x1="392" y1="63" x2="452" y2="63" stroke="#e05a7d" stroke-width="1.2"/>
    <path d="M 448 59 L 454 63 L 448 67 Z" fill="#e05a7d"/>
    <text x="422" y="54" fill="#e05a7d" font-size="6.2" text-anchor="middle">mismatch</text>
    <rect x="454" y="40" width="96" height="46" rx="6" fill="#3a2632" stroke="#e05a7d" stroke-width="1.2"/>
    <text x="502" y="59" fill="#e6e6e6" font-size="6.8" text-anchor="middle">CTO assigns</text>
    <text x="502" y="74" fill="#9aa4b2" font-size="6.4" text-anchor="middle">an engineer to look</text>
    <line x1="502" y1="86" x2="502" y2="106" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="160" y1="106" x2="502" y2="106" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="160" y1="106" x2="160" y2="126" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="420" y1="106" x2="420" y2="126" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="60" y="128" width="200" height="56" rx="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="160" y="147" fill="#d6a45c" font-size="7" text-anchor="middle" font-weight="bold">undercharged: absorbed</text>
    <text x="160" y="162" fill="#e6e6e6" font-size="6.6" text-anchor="middle">an engineer adjusts the DB to match</text>
    <text x="160" y="176" fill="#9aa4b2" font-size="6.2" text-anchor="middle">the company eats it, quietly</text>
    <rect x="320" y="128" width="200" height="56" rx="6" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.2"/>
    <text x="420" y="147" fill="#9b6ff0" font-size="7" text-anchor="middle" font-weight="bold">overcharged: compensated</text>
    <text x="420" y="162" fill="#e6e6e6" font-size="6.6" text-anchor="middle">support contacts the customer</text>
    <text x="420" y="176" fill="#9aa4b2" font-size="6.2" text-anchor="middle">loyalty points refunded, or cash</text>
    <text x="290" y="216" fill="#54b890" font-size="7.2" text-anchor="middle" font-weight="bold">The actual record: after launch, we barely remember handling a wrong figure</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Mechanism to the system (the export), policy to people (how to fix it, who pays) — and the direction of the error decides the currency.</figcaption>
</figure>

The system's responsibility ends at **the export**: organising orders the way accounting wants them. That's really a translation layer — turning an engineer's fact tables into accounting's language. Execution, judgment and correction all happen in the human world: accounting finds a mismatch and asks the CTO to assign an engineer to investigate; once investigated, the fix depends on the direction — **undercharged, an engineer adjusts the DB so the amounts line up and the company absorbs it internally; overcharged, support contacts the customer and refunds loyalty points or cash as external compensation.**

That asymmetry is worth a look. Undercharging is the company's loss with no effect on the customer, so it's handled quietly and internally; overcharging touched a customer's money, so it goes through the most expensive channel (a support call) with the most sincere compensation. **The direction of the correction decides who pays and in what currency** — [[rezero-fulfillment|mechanism to the system, policy to people]], again: the system supplies facts and people decide justice.

And the actual record of all that: **after launch, we barely remember handling a wrong figure.** Even [[rezero-cart-order|closing a round]], a settlement touching thousands of rows at once, only did blocklisting, cart clearing and unpaid-order clearing — no balancing, and it ran surprisingly smoothly regardless. At the time we credited that to obediently following 3NF; now I can put it more precisely: **3NF *is* the discipline of "one fact stored once", and it strangles drift at the source.**

## The rebuild: turning "almost never wrong" into "provably right"

So would a rebuild still do nothing about reconciliation? No. Between "the books were almost never wrong" and "the books can be proven right" lies the same gap [[rezero-ops|#15]] described: our peace of mind was "we got used to nothing going wrong", not "the numbers say nothing is wrong". A rebuild adds three small things, all growing along the existing structure:

1. **Self-reconciliation queries, on a schedule.** The invariants are already writable: each order's amount equals the sum of its order items, each orders payment's receipts are at least the orders it covers, sold quantity equals the sum of reserving carts and orders. Run them daily on [[airflow-reliability|a schedule]], silent when green and alerting when red — a few lines of SQL bought in exchange for turning "should be fine" into "verified fine".
2. **Fix the books with a compensating entry, not by adjusting the DB.** Back then undercharging was fixed by adjusting the DB to match — understandable, but strictly speaking it's **rewriting history**: six months later nobody remembers why that number looks the way it does. Accounting's own rule is the right one: don't erase an error, add a reversing entry. The history of the books is a fact too, and this series' iron law — [[rezero-payment|append facts, derive status]] — shouldn't get an exemption at correction time.
3. **Manage the export format as a contract.** Accounting's requirements change, and the export is the only interface between the system and them — version it, keep samples, review format changes, and treat it like an API.

Just those three. No reconciliation platform, no daily full comparison — **in a system with exactly one redundancy, building a bigger reconciliation system is fighting an enemy that doesn't exist.**

## Reflections

**The best reconciliation is leaving the books no chance to be wrong.** The need for reconciliation is proportional to materialised redundancy — each extra copy of a derived number is another ledger that can drift and another checking job to write. Leaving derived data on the read side is the cheapest consistency there is: it makes the word "reconciliation" nearly disappear from the system's vocabulary. We weren't good at reconciling; we designed away the reasons to reconcile, one at a time.

**"Nothing went wrong" isn't "provably nothing is wrong".** This is #15's credit argument replayed on data: our books were clean, but no measurement could prove they were clean — the same silence as [[rezero-risk|the risk chapter]]'s "no complaints received". The design dividend was real, but a dividend needs a report card, and three invariant queries buy exactly that.

**The deepest lesson this system taught me is this chapter's title read backwards.** "We never built X, so why did nothing go wrong?" — substitute reconciliation, the state machine, the notification abstraction layer, and the previous fifteen chapters keep showing the same structure: **not building it, because the structure made it unnecessary.** Engineering maturity isn't ticking off everything on the list, it's knowing which items your structure already gave you free and which you must restore by hand. On the unbundled database laid out across the table, the piece restored most successfully is precisely the one where it looks like nothing was done at all.

Next chapter, something smaller and prettier: images. Uploading takes an afternoon; deleting takes a lifetime — the life and death of a resource.
