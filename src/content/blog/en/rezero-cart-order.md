---
title: "From Cart to Order: The State Machine the Hosts Ripped Out"
date: 2026-07-26
category: tech
description: "Closing out the transaction spine: two carts in one table, the cart operation log a rebuild would add, the three layers of cross-round merged checkout (paying, fulfilment and accounting each get one), why an order's status is five columns rather than a state machine — and the state machine the hosts really did rip out."
tags:
  - war-story
  - live-commerce
  - system-design
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 6
comments: true
draft: false
translationOf: rezero-cart-order
---
The last stop on the transaction spine: how an order travels from cart to order. [[rezero-comment-order|Comments]] made it into the cart, [[rezero-identity|identities]] hold the orders, [[rezero-inventory|stock]] pinned the invariant down — this chapter aggregates all of it into something that can be paid for, shipped and invoiced. The title isn't a metaphor: there really was a state machine in this system, and the hosts ripped it out by their actions.

## Two carts, one table

[[rezero-overview|The overview]] said there are two carts: the live-stream one that **reserves stock** and the storefront one that **doesn't**. The data model's answer already showed its face in the identity chapter: **one cart item table, with content type + object id (a generic foreign key) marking the source**. Whether it reserves, whether it uses the live price or the storefront price, is decided by the source; quantity adjustment, checkout and clearing all run the same logic.

That makes the edges of quantity adjustment clean too. To **increase** a reserving order is just running the stock chapter's conditional update again — you only get it if it's there; to **decrease** is a release, returning the difference to the counts. An LWW amendment from a comment, a customer adjusting it themselves, support adjusting on their behalf — three paths, the same set of actions, only a different trigger.

## The table a rebuild would add: the cart's operation log

We just counted the cart's writers: LWW amendments, the customer, support, plus the stock chapter's round settlement and re-call reset — one table, five ways in. But the five leave badly asymmetric traces. Changes arriving by comment have full provenance (that msg → cart item chain: structured, joinable). Changes made by people weren't unrecorded — we **wrote operations into Django's built-in log table by hand** — the problem is that table is **a catch-all for the entire system**: cart adjustments, product edits and every miscellaneous operation share one table, whose columns are generic enough to mean only "who, touched which thing, some text". Answering "how did this order end up like this?" means fishing text out of a junk drawer: finding it is luck, and when you do there's no before-and-after quantity, no delta, nothing that lines up with a recomputation. Support hearing "why does my cart look like this?" could trace the comment half and only excavate the human half. The lesson is very concrete: **"we have logs" and "we have logs you can query" are two different things** — a generic log table reassures everyone when writing and amounts to nothing when reading.

In a rebuild I'd open a dedicated **operation log table** for cart items — not "start logging", but moving the log out of the junk drawer and giving it structure: on every change, append a row inside the same transaction, with the trigger (which comment, the customer, which support agent, round settlement, a re-call), before-and-after quantities and the delta, in fixed columns you can join. Three points of care:

- **It's a change log, not a source of truth.** The cart table remains the transactional fact and still guards against overselling inside a synchronous transaction — this is not turning the cart into event sourcing. Overselling is a hard invariant and the check has to happen before the write; moving "check then decrement" into an event store and deriving state through projections saves none of the hard serialisation decisions, it just changes their clothes.
- **Appending in the same transaction costs almost nothing and buys three things**: complaints can be reconstructed, support operations have an audit trail (the [[rezero-console|console chapter]]'s rebuild list wanted that anyway), and when the hourly recomputation finds a difference there's finally somewhere to investigate — a non-zero difference means some incremental path has a bug, and this table is the case file.
- **It isn't an invention, it's giving the order the discipline the goods already had.** The fulfilment system already had a picking log and could rebuild stock movements entirely from events ([[rezero-fulfillment|the shipping chapter]] covers it) — what the goods got, the order deserves. The day chasing payment, risk or analytics wants the cart's change stream, this table becomes an outbox: an evolution, not a rewrite.

## Merged checkout: three layers, each answering to a reality

Checkout had one brutal requirement supported from the start: **merged checkout across rounds** — buy things from different rounds and different hosts, pay once. That forced a three-layer structure:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 300" role="img" aria-label="The three layers of merged checkout. At the top are the two carts: the reserving live-stream cart, which can span several rounds, and the non-reserving storefront cart, both entering merged checkout. Below that is orders payment, the unit of paying, settling several rounds at once and aggregating third-party payment facts. Beneath the payment, orders are split out per round as the unit of fulfilment, each following that round's arrival and shipping rhythm, with round-limited promotions recorded at this layer. Beneath each order is the order item, the accounting unit, whose amount is frozen at the moment of sale and which invoices and refunds follow." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rco" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker></defs>
    <rect x="55" y="16" width="215" height="40" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="162" y="32" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">reserving cart (live)</text>
    <text x="162" y="47" fill="#9aa4b2" font-size="6.6" text-anchor="middle">can span several rounds / hosts</text>
    <rect x="310" y="16" width="215" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="417" y="32" fill="#e6e6e6" font-size="8.2" text-anchor="middle" font-weight="bold">non-reserving cart (storefront)</text>
    <text x="417" y="47" fill="#9aa4b2" font-size="6.6" text-anchor="middle">same cart item table, polymorphic source</text>
    <line x1="162" y1="56" x2="252" y2="82" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rco)"/>
    <line x1="417" y1="56" x2="328" y2="82" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rco)"/>
    <rect x="190" y="86" width="200" height="24" rx="12" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="290" y="102" fill="#4f6df5" font-size="8.4" text-anchor="middle" font-weight="bold">merged checkout</text>
    <line x1="290" y1="110" x2="290" y2="126" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rco)"/>
    <rect x="165" y="130" width="250" height="42" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="290" y="147" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">orders payment —— the unit of paying</text>
    <text x="290" y="162" fill="#9aa4b2" font-size="6.8" text-anchor="middle">pay once across rounds · aggregates payment facts</text>
    <line x1="220" y1="172" x2="130" y2="196" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rco)"/>
    <line x1="290" y1="172" x2="290" y2="196" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rco)"/>
    <line x1="360" y1="172" x2="450" y2="196" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rco)"/>
    <rect x="45" y="200" width="170" height="40" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="130" y="216" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">order (round A)</text>
    <text x="130" y="231" fill="#9aa4b2" font-size="6.4" text-anchor="middle">fulfilment unit · round coupons here</text>
    <rect x="225" y="200" width="130" height="40" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="290" y="216" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">order (round B)</text>
    <text x="290" y="231" fill="#9aa4b2" font-size="6.4" text-anchor="middle">split by round</text>
    <rect x="365" y="200" width="170" height="40" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="450" y="216" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">order (round C)</text>
    <text x="450" y="231" fill="#9aa4b2" font-size="6.4" text-anchor="middle">its own shipping rhythm</text>
    <line x1="130" y1="240" x2="130" y2="256" stroke="#54b890" stroke-width="1.1" marker-end="url(#rco)"/>
    <line x1="290" y1="240" x2="290" y2="256" stroke="#54b890" stroke-width="1.1" marker-end="url(#rco)"/>
    <line x1="450" y1="240" x2="450" y2="256" stroke="#54b890" stroke-width="1.1" marker-end="url(#rco)"/>
    <rect x="120" y="260" width="340" height="26" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="290" y="277" fill="#e6e6e6" font-size="7.6" text-anchor="middle">order item —— the accounting unit: amount frozen at sale</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The three layers aren't architectural fastidiousness: paying, fulfilling and accounting are three realities on different rhythms, and each needs a layer.</figcaption>
</figure>

Each layer's reason to exist is more practical than "normalisation":

- **payment is the unit of paying.** The customer doesn't care about your rounds, they want to settle once — so the aggregating layer has to exist. Its state is aggregated from third-party payment facts (partial payments, multiple channels; the fun is saved for the next chapter).
- **order is the unit of fulfilment, split by round.** Personal-shopping goods arrive by round and ship by round, so the after-sales rhythm is naturally bounded by rounds; round-limited coupons are recorded at this layer too.
- **order item is the unit of accounting.** The amount freezes at the moment of sale — invoices, refunds and reconciliation all stand on a number that never moves again.

And the shape of the "cart **to** order" action itself already trails the next section: checkout doesn't change a cart item's status — payment **inserts an order item**, completed in the **same transaction** as the ledger's "cart quantity becomes order quantity". A state transition expressed as a new record, which naturally extends the provenance chain by one link: **msg → cart item → order item**, so any completed sale can be traced all the way back to the comment that started it.

## An order's "status": five columns, zero state machines

The textbook teaches you to draw the order a pretty state machine: created → awaiting payment → paid → picking → shipped → complete. That isn't what we had — an order's "status" was **five independent columns**: payment status, invoice status, refund status, shipping status, support flag — each **updated to follow a fact, with no transition rules at all**.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="A comparison between one state machine and multi-column status. On the left, crossed out: cramming payment, invoice, refund, shipping and support into one state machine gives a state count that is the Cartesian product of five dimensions, hundreds of combinations each needing transition rules — while in reality hosts change whatever they want, and the model loses. On the right, ticked: five orthogonal status columns on one order, each following its own source of fact — payment status follows payment facts, invoice status follows invoice receipts, refund status follows refund facts, shipping status follows courier updates, and the support flag follows support actions; recording only, never enforcing." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rcg" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <line x1="290" y1="14" x2="290" y2="230" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="145" y="26" fill="#e05a7d" font-size="9" text-anchor="middle" font-weight="bold">✗ One big state machine</text>
    <rect x="30" y="40" width="230" height="76" rx="8" fill="#3a2632" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="145" y="62" fill="#e05a7d" font-size="7.8" text-anchor="middle" font-weight="bold">payment × invoice × refund × shipping × support</text>
    <text x="145" y="80" fill="#e6e6e6" font-size="7.2" text-anchor="middle">= hundreds of combined states</text>
    <text x="145" y="96" fill="#9aa4b2" font-size="6.6" text-anchor="middle">each needing a "who can go to whom" rule</text>
    <text x="145" y="136" fill="#e05a7d" font-size="7.2" text-anchor="middle">and hosts change things at will —</text>
    <text x="145" y="150" fill="#e05a7d" font-size="7.2" text-anchor="middle">on a reality you can't govern, rules are friction</text>
    <text x="145" y="176" fill="#9aa4b2" font-size="6.8" text-anchor="middle">(the bidding system really built one,</text>
    <text x="145" y="189" fill="#9aa4b2" font-size="6.8" text-anchor="middle">and it got ripped out)</text>
    <text x="435" y="26" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">✓ Five orthogonal fields, following facts</text>
    <rect x="316" y="40" width="112" height="180" rx="8" fill="#233528" stroke="#54b890" stroke-width="1.4"/>
    <text x="372" y="58" fill="#54b890" font-size="8.2" text-anchor="middle" font-weight="bold">order</text>
    <rect x="326" y="68" width="92" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="372" y="83" fill="#e6e6e6" font-size="6.8" text-anchor="middle">payment</text>
    <rect x="326" y="96" width="92" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="372" y="111" fill="#e6e6e6" font-size="6.8" text-anchor="middle">invoice</text>
    <rect x="326" y="124" width="92" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="372" y="139" fill="#e6e6e6" font-size="6.8" text-anchor="middle">refund</text>
    <rect x="326" y="152" width="92" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="372" y="167" fill="#e6e6e6" font-size="6.8" text-anchor="middle">shipping</text>
    <rect x="326" y="180" width="92" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="372" y="195" fill="#e6e6e6" font-size="6.8" text-anchor="middle">support flag</text>
    <line x1="540" y1="79" x2="420" y2="79" stroke="#54b890" stroke-width="1" marker-end="url(#rcg)"/><text x="482" y="72" fill="#9aa4b2" font-size="6.2" text-anchor="middle">payment facts</text>
    <line x1="540" y1="107" x2="420" y2="107" stroke="#54b890" stroke-width="1" marker-end="url(#rcg)"/><text x="482" y="100" fill="#9aa4b2" font-size="6.2" text-anchor="middle">invoice receipt</text>
    <line x1="540" y1="135" x2="420" y2="135" stroke="#54b890" stroke-width="1" marker-end="url(#rcg)"/><text x="482" y="128" fill="#9aa4b2" font-size="6.2" text-anchor="middle">refund facts</text>
    <line x1="540" y1="163" x2="420" y2="163" stroke="#54b890" stroke-width="1" marker-end="url(#rcg)"/><text x="482" y="156" fill="#9aa4b2" font-size="6.2" text-anchor="middle">courier updates</text>
    <line x1="540" y1="191" x2="420" y2="191" stroke="#54b890" stroke-width="1" marker-end="url(#rcg)"/><text x="482" y="184" fill="#9aa4b2" font-size="6.2" text-anchor="middle">support actions</text>
    <text x="435" y="236" fill="#9aa4b2" font-size="6.8" text-anchor="middle">record, don't enforce — status is the shadow of a fact</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Cram five dimensions into one state machine and the state count is a Cartesian product; store them orthogonally and each follows its own fact.</figcaption>
</figure>

The maths first, then the people. **The maths**: these five things evolve independently — payment completing doesn't determine whether an invoice can be issued, and a refund can happen at any stage of shipping. Force them into one state machine and the state count is the Cartesian product of five dimensions, most of whose hundreds of combinations carry no business meaning while each still demands an answer to "who can transition to whom". Orthogonal things should be stored orthogonally.

**The people**: that state machine wasn't hypothetical — a colleague on the bidding system really did build transition rules, and then discovered that **hosts change whatever they want**. Every time a status change was blocked it read to them as friction rather than protection, and in the end the state machine was ripped out. I think that's a healthy surrender, but it's worth taking a sharper lesson: **a state machine suits a process you control, not a reality you're merely recording.** There are two kinds of thing in a system — **hard invariants** (never oversell, the money has to add up), guarded to death by database-level constraints that nobody can route around; and **soft status** (the progress of human work), recorded but never enforced, because the realities of hosts, suppliers and support were never yours to govern. The shape we ended with happened to be right: overselling locked down, status left free. Plenty of systems make exactly the opposite mistake — pinning human processes down and letting the constraints on money go slack.

## The life cycle of a price: check the fact before the commitment, freeze it after

Price has a clear life line in this system:

- **In the cart: don't store it, always read the current price.** The host prices things live and operations backfills amounts afterwards — if the price were copied into the cart item at add-to-cart time, every backfill would need a mass rewrite. Reading the current price means zero backfill. [[ddia-data-models|Normalisation]]'s advantage appears for the third time (the first two: the denormalisation test in the identity chapter, and the round's big clean in the stock chapter). Because a cart item carries its source, the live price and the storefront price separate naturally — the same product, two channels, two prices, with no special handling at all.
- **At the moment of sale: freeze.** The order item stores the amount for good — not only because invoices and refunds need a number that stops moving, but because of **the customer's psychological contract**: what you've paid for doesn't get to change. Promotions settle at that moment too: coupons and free shipping, some recorded on the order item and some at the round layer (round-limited coupons), each leaving its own fact.

One line to close: **a snapshot happens only at the point of commitment — always read the fact before it, never change it after.** The cart is intent, the order is a commitment, and their price strategies are opposites, and both are right.

## Reflections

### The state machine losing to the hosts is the healthiest surrender I've seen

Engineers have a natural infatuation with state machines — they're precise, provable, and beautiful on a whiteboard. But the fate of the bidding system's state machine reminds me: **a model's job is to serve reality, not to correct it.** Hosts aren't undisciplined; their work is genuinely full of exceptions — stock lands unexpectedly, a price changes on the spot, a customer swaps at the last minute. Every exception is reasonable, and together they add up to "change whatever you want". Build transition rules on top of that reality and everything you block is a legitimate operation. The right way to spend is to put the entire "enforce" budget on money and stock and leave "record" for everything else — constraints are a scarce resource, and they belong where breaching them costs the most.

### The three layers aren't fastidiousness; three realities each need one

If those three layers — payment, order, order item — had been split to look architecturally tidy, they probably wouldn't have survived the first requirement change. They held because each sits on top of an **independently varying reality**: the customer settles once (the paying rhythm), goods arrive by round (the fulfilment rhythm), and the books have to survive invoicing and refunds (the accounting rhythm). As complicated requirements arrived one after another — cross-round merging, partial payment, round-limited coupons — the structure absorbed all of them. **Complicated requirements don't kill a structure with simple responsibilities; they kill a clever, muddled one.** The test for adding a layer was never "the textbook says so", it's "does the reality behind this layer vary independently of the others?"

### This chapter is "boring" because the earlier chapters paid the debt

Writing this one I noticed something: there's no incident to tell. No oversell-grade explosion, no flattened API — checkout just ran, steadily. In hindsight that isn't luck: one polymorphic cart table meant merged checkout never had to stitch two sets of logic together; orders hanging off identities meant nobody's checkout required moving data; the ledger's two counts meant cart→order transferred in a single transaction. **Checkout is just the aggregate of facts the earlier chapters got right.** The most underrated compliment in system design is "boring" — chapters that explode are easy to write, and boring chapters are hard-won. May your checkout flow be boring too.
