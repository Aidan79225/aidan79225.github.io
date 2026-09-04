---
title: "Pre-Shipment: You Sell a Promise, You Ship a Reality"
date: 2026-07-27
category: tech
description: "Second chapter on money and goods: two stock books (the sales promise and physical reality) drift by nature, and the allocation system is the bridge between them — an allocation log rebuildable from events, mechanism for the system and policy for people; plus the rebuild's three steps: fulfilment devolved to the order item, shipment as a first-class entity, and the whole leg split into a replaceable shipping system."
tags:
  - war-story
  - live-commerce
  - fulfillment
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 8
comments: true
draft: false
translationOf: rezero-fulfillment
---
[[rezero-payment|The money is in]]; time to ship. This chapter is where the system meets the physical world — comments, stock and payments all live in a database, but goods are real boxes, a real warehouse, a real delivery driver. Which makes it the chapter where **the system's boundary** is drawn most deliberately: what the system owns and what is handed to people. The answer we had was smarter than I remembered.

## Two stock books: you sell a promise, what arrives is reality

Get the sequence straight first: during the stream the host agrees with the supplier on "how much there is" — that number becomes the cap in [[rezero-inventory|the stock chapter]], and the system uses it to guard against overselling. But **the actual purchasing only starts after the stream ends**; purchasing itself isn't in the system, and the next fact the system sees is operations entering what physically arrived as a **goods-in record** — appended one at a time, so every stock adjustment has a log.

So this system really has **two stock books**, and they're two separate columns on the inventory table, each with its own job:

- **Sales stock (the promise)**: the number the host called. Its job is guarding "sold ≤ cap" at the instant of ordering, and it lives in millisecond transactions.
- **Physical stock (reality)**: what the goods-in records accumulate. Its job is honestly recording what's actually in the warehouse, and it lives on logistics' daily rhythm.

The two books **drift by nature** — 100 agreed and 80 delivered (a short shipment), or damage, or the wrong spec. That isn't a bug, it's the normal condition of the personal-shopping business. There's only one question: once they've drifted, whose orders have goods and whose have to wait?

## Allocation: mapping the promise onto reality

The answer we had was an **allocation system**: assigning the stock that actually arrived to the orders that were promised.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 306" role="img" aria-label="The two stock books and the allocation bridge. Top left is sales stock, the promise: the cap and the sold count, guarding against overselling at the instant of ordering. Top right is physical stock, reality: operations enters goods-in records, appended and visible. The two drift by nature, for example a hundred agreed and eighty delivered. In the middle is the allocation system: assigning real stock to orders, writing each assignment into an allocation log, so stock movements can be rebuilt from the full set of events; how to assign is decided by operations, with mechanism belonging to the system and policy to people. Below, the rule is that a shipping note is created only when an order is fully allocated, with its items shipping together. At the bottom are two exits: convenience-store pickup through an API where the customer picks a store on the web, and home delivery where a CSV is exported by hand and handed to the courier." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rff" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker></defs>
    <rect x="28" y="24" width="230" height="56" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="143" y="44" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">sales stock (the promise)</text>
    <text x="143" y="59" fill="#9aa4b2" font-size="6.8" text-anchor="middle">cap · sold count — guards overselling at order time</text>
    <text x="143" y="72" fill="#9aa4b2" font-size="6.8" text-anchor="middle">lives in millisecond transactions</text>
    <rect x="322" y="24" width="230" height="56" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.4"/>
    <text x="437" y="44" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">physical stock (reality)</text>
    <text x="437" y="59" fill="#9aa4b2" font-size="6.8" text-anchor="middle">goods-in appended — ops logs what arrived</text>
    <text x="437" y="72" fill="#9aa4b2" font-size="6.8" text-anchor="middle">lives on logistics' daily rhythm</text>
    <text x="290" y="100" fill="#e05a7d" font-size="7.4" text-anchor="middle">The two books drift by nature: 100 agreed, 80 delivered</text>
    <line x1="143" y1="80" x2="235" y2="128" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rff)"/>
    <line x1="437" y1="80" x2="345" y2="128" stroke="#54b890" stroke-width="1.2" marker-end="url(#rff)"/>
    <rect x="165" y="132" width="250" height="62" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.6"/>
    <text x="290" y="152" fill="#d6a45c" font-size="9.2" text-anchor="middle" font-weight="bold">allocation system</text>
    <text x="290" y="167" fill="#9aa4b2" font-size="6.8" text-anchor="middle">real stock → assigned to orders; ops decides how</text>
    <text x="290" y="182" fill="#e6e6e6" font-size="6.8" text-anchor="middle" font-weight="bold">allocation log appended — movements rebuildable from events</text>
    <line x1="290" y1="194" x2="290" y2="212" stroke="#d6a45c" stroke-width="1.3" marker-end="url(#rff)"/>
    <rect x="130" y="216" width="320" height="26" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="290" y="233" fill="#e6e6e6" font-size="7.6" text-anchor="middle">order fully allocated → a shipping note (items go together, never split)</text>
    <line x1="220" y1="242" x2="185" y2="260" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rff)"/>
    <line x1="360" y1="242" x2="395" y2="260" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rff)"/>
    <rect x="90" y="264" width="190" height="32" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="185" y="278" fill="#e6e6e6" font-size="7.2" text-anchor="middle">7-Eleven pickup</text>
    <text x="185" y="290" fill="#9aa4b2" font-size="6.2" text-anchor="middle">API · customer picks a store online</text>
    <rect x="300" y="264" width="190" height="32" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="395" y="278" fill="#e6e6e6" font-size="7.2" text-anchor="middle">home delivery (own courier)</text>
    <text x="395" y="290" fill="#9aa4b2" font-size="6.2" text-anchor="middle">CSV exported by hand to the courier</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Allocation is the bridge between the two stock books: the promise on the left, reality on the right, and every assignment leaves an event.</figcaption>
</figure>

Three designs in the allocation system, each worth a pause:

- **The allocation log is append-only — stock movements can be rebuilt from the full set of events.** Goods-in is an event, allocation is an event, and [[ddia-streaming|the complete set of facts]] can replay the current state at any time: drifted books have something to reconcile against, complaints have evidence, stock counts have a baseline. That log is the anchor on the physical side.
- **Mechanism belongs to the system, policy to people.** What the allocation system provides is a mechanism that lets you assign however you like, plus a record of every assignment; **how to assign — who gets sacrificed on a short shipment, who ships first — is operations' commercial judgment**. The system doesn't overreach into making policy for people, but it turns every policy decision into a traceable fact. That's the third landing of the same philosophy as [[rezero-cart-order|the state machine getting ripped out]] and [[rezero-payment|refunds going through the bank]].
- **The rule is simple enough not to go wrong: a shipping note is created only when the order is fully allocated, and the items go together.** Nothing is split, so there's no "half-split" intermediate state. When to ship is mostly decided by operations based on how allocation is going, and an impatient customer calls support — mechanism and policy again.

## The system's boundary: it ends at the shipping note

The most instructive thing here is **what the system chose not to do**: there were in fact several warehouses and the system didn't manage them; how picking is done, whether there are barcodes, what happens on a shortfall — none of the system's business. The system's responsibility ends at "order becomes shipping note", and after that — convenience-store pickup through an API (the customer picks a store on the web) and home delivery through a **hand-exported CSV** to the courier — the rest is operations' world. Shipping fees and their conditions are configured at the round layer, in the same category as coupons and settlement; rounds prove themselves this system's natural configuration boundary for the third time.

There's logic to where that line sits: it falls exactly on **the boundary between the information flow and the physical flow**. Get the information wrong and you oversell or take the wrong money — high cost of breach, invisible to the eye, so the system must guard it. Get the physical wrong (wrong item picked, a box short) and it's visible on site and fixable on the spot — people guard that better than a system. Six engineers' complexity budget, spent where it cuts, again.

## The rebuild: three steps to split fulfilment out

The shape we had worked, but there's one structural awkwardness: [[rezero-cart-order|the cart chapter]] said an order is split by round and is the unit of fulfilment — which means **payment already spans rounds while shipping is still bound to one**. A customer buys from three rounds and wants one box? The structure doesn't cooperate. The rebuild takes three steps, each deeper than the last:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 260" role="img" aria-label="A comparison of the fulfilment structure then and in a rebuild. On the left, then: the order is the unit of fulfilment by round, a shipping note is only created when everything is allocated, cross-round merging is hard and a partial arrival can only wait. On the right, the rebuild in three steps: first, the unit of fulfilment devolves to the order item, so whatever is allocated can move; second, shipment becomes a first-class entity grouping the currently allocated items by recipient and address, freezing the address at the moment of grouping; third, the whole fulfilment leg becomes an independent shipping system, where the commerce system ends by exporting fulfillable orders and the shipping system owns goods-in, allocation, dispatch and couriers, with dispatch and returns flowing back to commerce as events — so the shipping system can evolve independently, or even be swapped wholesale for a third-party logistics provider." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rfr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker><marker id="rfm" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="200" y1="14" x2="200" y2="240" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="100" y="28" fill="#9aa4b2" font-size="8.8" text-anchor="middle" font-weight="bold">Then: the order is the unit</text>
    <rect x="30" y="44" width="140" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="100" y="60" fill="#e6e6e6" font-size="7.4" text-anchor="middle">order (round)</text>
    <text x="100" y="74" fill="#9aa4b2" font-size="6.4" text-anchor="middle">ships only when fully allocated</text>
    <line x1="100" y1="84" x2="100" y2="102" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rfm)"/>
    <rect x="30" y="106" width="140" height="30" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="100" y="125" fill="#e6e6e6" font-size="7.2" text-anchor="middle">shipping note</text>
    <text x="100" y="168" fill="#e05a7d" font-size="6.8" text-anchor="middle">cross-round merging is hard</text>
    <text x="100" y="182" fill="#e05a7d" font-size="6.8" text-anchor="middle">partial arrivals just wait</text>
    <text x="390" y="28" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">Now: three steps to split it out</text>
    <rect x="222" y="44" width="150" height="34" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="297" y="58" fill="#e6e6e6" font-size="6.8" text-anchor="middle">① unit = order item</text>
    <text x="297" y="71" fill="#9aa4b2" font-size="6" text-anchor="middle">whatever is allocated can move</text>
    <rect x="392" y="44" width="166" height="34" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="475" y="58" fill="#54b890" font-size="6.8" text-anchor="middle" font-weight="bold">② shipment, first-class</text>
    <text x="475" y="71" fill="#9aa4b2" font-size="6" text-anchor="middle">grouped by recipient+address, frozen</text>
    <line x1="372" y1="61" x2="390" y2="61" stroke="#54b890" stroke-width="1.1" marker-end="url(#rfr)"/>
    <rect x="252" y="112" width="276" height="66" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="390" y="132" fill="#4f6df5" font-size="8.2" text-anchor="middle" font-weight="bold">③ fulfilment becomes a shipping system</text>
    <text x="390" y="147" fill="#9aa4b2" font-size="6.6" text-anchor="middle">commerce ends at exporting fulfillable orders</text>
    <text x="390" y="161" fill="#9aa4b2" font-size="6.6" text-anchor="middle">shipping owns goods-in, allocation, dispatch, couriers</text>
    <line x1="297" y1="78" x2="330" y2="110" stroke="#54b890" stroke-width="1" marker-end="url(#rfr)"/>
    <line x1="475" y1="78" x2="440" y2="110" stroke="#54b890" stroke-width="1" marker-end="url(#rfr)"/>
    <path d="M 252 158 Q 220 190 250 214" fill="none" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#rfm)"/>
    <text x="300" y="216" fill="#9aa4b2" font-size="6.4" text-anchor="start">dispatch/returns flow back as events (status still derived)</text>
    <text x="390" y="240" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">Cut the interface right and even a 3PL swaps in — commerce doesn't move a line</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Three steps, each deeper: item-level allocation → shipment grouping → shipping as its own system; each one makes "wait for the full order" more of a policy and less of a structural limit.</figcaption>
</figure>

1. **Devolve the unit of fulfilment to the order item.** Whichever item is allocated becomes eligible to ship — "wait for everything" turns from a structural limit into an operational policy: wait for the set, or ship what's arrived, is only a decision about whether to include that item when grouping. The order falls back to being pure accounting grouping (round coupons and reconciliation unchanged), and accounting doesn't move at all — an order item was always the frozen-amount accounting unit, so devolving fulfilment actually puts fulfilment and accounting at the same granularity.
2. **Promote shipment to a first-class entity, grouped by "recipient + address".** Cross-round merged shipping happens naturally and partial arrivals split naturally, with no special logic. There are three costs, and writing them down is the honest thing to do: shipping-fee policy has to be redefined (rules stay at the round layer, calculation moves to the shipment — a parcel is what actually generates a fee); the address is the grouping key, so **it has to be frozen at the moment of grouping** — the commitment-point principle for the second time (the first was freezing the price at sale); and the customer's unit of enquiry moves from order to shipment, so the storefront's and support's narrative has to follow.
3. **Split the whole fulfilment leg into a "shipping system".** The commerce system ends at **exporting fulfillable orders**; the shipping system consumes orders and owns goods-in, allocation, shipping notes and all courier integration, with dispatch and returns flowing back to commerce as events — and commerce follows its usual rules of landing facts and deriving status. The cost has to be written down too: **the two stock books formally separate** — sales stock stays in commerce to guard overselling, physical stock follows the shipping system, and the two reconcile through the events flowing back. That step sounds radical, but two things from back then support it: **the hand-exported CSV to the courier was the manual prototype of exactly this interface** — that boundary had already run on human power for years; and the project's endgame split the monolith into commerce, bidding and purchasing services using the same instinct about boundaries, so shipping is amply qualified to be the fourth. The real payoff is at the end: once the interface is "import orders", the shipping system becomes a **replaceable consumer** — run it yourself, switch to a 3PL, or mix, with commerce not moving a line. **The compound interest of a good boundary is that even "should we build this ourselves?" becomes a decision you can reverse at any time.**

## Reflections

### A system's boundary is drawn where your responsibility ends

No warehouse management, no picking system, shipping by hand-exported CSV — younger me would have filed all of that under "technical debt". Now I think it's **self-knowledge**: the system guards the information flow (getting it wrong means overselling or wrong money, invisible to the eye), and people guard the physical flow (getting it wrong is visible and quickly fixed). Force the system into the warehouse and you're taking on barcode hardware, stock-count discrepancies and how staff actually work — every one a new source of complexity, in exchange for correctness people were already holding. **A boundary isn't the limit of your capability, it's the limit of your responsibility**: draw it where you can answer for the mistakes, not where the technology could reach.

### Mechanism to the system, policy to people — that's three times now

The state machine ripped out by hosts, refunds going through the bank, allocation done "the way they want it" — the same philosophy landing three times in this system, and not one of them a compromise. Each is the correct division: **systems are good at recording and holding invariants, people are good at judgment and absorbing exceptions**. The cleverest thing about the allocation system is that it doesn't try to turn a commercial judgment like "who gets sacrificed on a short shipment" into an algorithm, while turning every judgment into a traceable event in the allocation log — people free, books clear. That's more honest than a "fully automatic allocation engine" and more reliable than "sorting it out in a spreadsheet"; it sits in the sweet spot between the two.

### The best architectural evolution turns a seam that already exists into an interface

"Splitting fulfilment into a shipping system" sounds like a big refactor, but look closely: that interface — a batch of fulfillable orders — already existed as a hand-made CSV, and it ran steadily. The rebuild only **formalises** a cut that human beings had already worn into the system. This is what I believe most about architectural evolution: **good boundaries aren't designed, they're observed.** All those long-lived manual processes — the report exported every week, the file operations always sends to the same person — are interfaces nobody has admitted to yet. If you want to know where a system should split, don't book a whiteboard session; go and look at where people are already handing things over.
