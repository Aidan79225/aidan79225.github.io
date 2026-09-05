---
title: "The Big Picture: Every System One Comment-Placed Order Touches"
date: 2026-07-25
category: tech
description: "A new series opens: how a live-commerce platform actually works — the host calls a key, viewers comment +1 to order, stock gets reserved, then payment and shipping. The full journey of an order, the three genuinely hard parts, and the architecture I'd build if I started over."
tags:
  - war-story
  - live-commerce
  - system-design
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 1
comments: true
draft: false
translationOf: rezero-overview
---
This is a new series, and the first **war story** on this blog. At a previous company I built a live-stream personal shopping platform — viewers watch a live stream, type an order into the comments, and behind that sits a whole chain of stock, payments and logistics. This series isn't a memoir: I want to take everything I know now (after re-reading DDIA, Redis, Kafka and SRE end to end) and **fight the same war again** — each chapter starts from a real requirement, covers how we actually did it and what we walked into, then gives the design I'd build today. This first post lays out the big picture.

## The business: turning a chat room into a cash register

The rules are simple enough:

- The host goes live selling personal-shopping items, and calls out a **key** for each one (say "2601").
- Anyone who wants it types **`2601+2`** in the comments: key plus quantity, and that's an order for 2.
- If the same person comments on the same key more than once, **the last one wins** — type `2601+2` then `2601+1` and you're buying 1.
- An order placed by comment goes straight into the cart, and it **reserves stock**; every item has a stock cap, and **you cannot oversell**.
- There are two kinds of cart: the live-stream one **reserves stock**, the one you fill yourself on the storefront **doesn't**. Quantities in both can be changed at any time.
- Comments don't come from one place: **Facebook, Instagram and our own live studio** all feed in, and the rules have to apply identically to all of them.
- The nastiest rule: the person commenting **may not have an account at all** — and stock still has to be held for them.

Each rule on its own is a weekend of work. What's hard is putting them in the same sentence: **three thousand people commenting at once, fighting over 20 units of stock, half of them without accounts, across three platforms** — that's what this system actually looks like.

## The journey of an order

Start with the full path from comment to delivery. That path is the table of contents for this whole series:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 262" role="img" aria-label="The journey of an order, eight stops across two rows. Top row, left to right: comments arriving from multiple platforms (Facebook, Instagram, own studio); adapters converging them into a unified comment event; parsing key plus quantity, where a repeat comment from the same person means the last one wins; and identity, where an order must be possible without an account. The path then folds down to the bottom row, running right to left: the reserving cart, which deducts n units and must never oversell; checkout, where the two carts merge; a third-party payment gateway reached by webhook; and pre-shipment handling, which consolidates parcels before handing them to the courier. A dashed line runs from payments back to the reserving cart, meaning stock is released when an order goes unpaid past its deadline." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rzf" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rza" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#d6a45c"/></marker></defs>
    <rect x="20" y="34" width="120" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="80" y="53" fill="#e6e6e6" font-size="9" text-anchor="middle" font-weight="bold">Comments arrive</text>
    <text x="80" y="68" fill="#9aa4b2" font-size="7" text-anchor="middle">FB / IG / own studio</text>
    <rect x="158" y="34" width="120" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="218" y="53" fill="#e6e6e6" font-size="9" text-anchor="middle" font-weight="bold">Unified event</text>
    <text x="218" y="68" fill="#9aa4b2" font-size="7" text-anchor="middle">one adapter per source</text>
    <rect x="296" y="34" width="120" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="356" y="53" fill="#e6e6e6" font-size="9" text-anchor="middle" font-weight="bold">Parse key+n</text>
    <text x="356" y="68" fill="#9aa4b2" font-size="7" text-anchor="middle">same person → last wins</text>
    <rect x="434" y="34" width="120" height="46" rx="6" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.2"/>
    <text x="494" y="53" fill="#9b6ff0" font-size="9" text-anchor="middle" font-weight="bold">Identity</text>
    <text x="494" y="68" fill="#9aa4b2" font-size="7" text-anchor="middle">order without an account</text>
    <line x1="140" y1="57" x2="156" y2="57" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzf)"/>
    <line x1="278" y1="57" x2="294" y2="57" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzf)"/>
    <line x1="416" y1="57" x2="432" y2="57" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzf)"/>
    <line x1="494" y1="80" x2="494" y2="148" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzf)"/>
    <rect x="434" y="152" width="120" height="46" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="494" y="171" fill="#d6a45c" font-size="9" text-anchor="middle" font-weight="bold">Reserving cart</text>
    <text x="494" y="186" fill="#9aa4b2" font-size="7" text-anchor="middle">stock −n · no overselling</text>
    <rect x="296" y="152" width="120" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="356" y="171" fill="#e6e6e6" font-size="9" text-anchor="middle" font-weight="bold">Checkout</text>
    <text x="356" y="186" fill="#9aa4b2" font-size="7" text-anchor="middle">two carts merge</text>
    <rect x="158" y="152" width="120" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="218" y="171" fill="#e6e6e6" font-size="9" text-anchor="middle" font-weight="bold">Payment gateway</text>
    <text x="218" y="186" fill="#9aa4b2" font-size="7" text-anchor="middle">webhook · idempotent</text>
    <rect x="20" y="152" width="120" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="80" y="171" fill="#e6e6e6" font-size="9" text-anchor="middle" font-weight="bold">Pre-shipment</text>
    <text x="80" y="186" fill="#9aa4b2" font-size="7" text-anchor="middle">consolidate · to courier</text>
    <line x1="432" y1="175" x2="418" y2="175" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzf)"/>
    <line x1="294" y1="175" x2="280" y2="175" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzf)"/>
    <line x1="156" y1="175" x2="142" y2="175" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzf)"/>
    <path d="M 238 150 Q 356 108 486 148" fill="none" stroke="#d6a45c" stroke-width="1.1" stroke-dasharray="4 3" marker-end="url(#rza)"/>
    <text x="356" y="120" fill="#d6a45c" font-size="7.4" text-anchor="middle">unpaid past deadline → release stock</text>
    <text x="290" y="234" fill="#9aa4b2" font-size="7.6" text-anchor="middle">Every stop is a chapter: comment intake, identity, stock, cart, payments, pre-shipment</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The journey of an order: the top row turns "a comment" into "an order attached to an identity"; the bottom row turns "reserved stock" into "a parcel at someone's door".</figcaption>
</figure>

Every stop has its own trade-offs when you open it up, and the details belong to their own chapters. Here I only want to name what the real problem is at each one:

- **Comments arrive**: the three platforms are fetched in completely different ways (webhook, polling, our own direct push), so each converges into a unified comment event first and downstream never has to care where it came from. "A repeat comment means the last one wins" looks trivial, but it's [[ddia-replication|LWW]] — you have to answer "last by whose ordering?" first.
- **Identity**: the person commenting is `fb:12345`, not one of our members. Stock has to be held against that **identity**, with the account showing up later and claiming the order back. This is the most underestimated chapter in the series.
- **Stock reservation**: never overselling is the one iron rule of this system, and underneath it's a fight to defend an [[ddia-transactions|invariant]] under concurrency. Whatever gets reserved has to be releasable — expiry, cancellation, quantity changes; miss one and stock bleeds slowly.
- **Checkout and payments**: the two carts converge here, and the payment webhook will arrive twice, out of order, or never at all. Every lesson from [[ddia-distributed-trouble|unreliable networks]] gets examined here.
- **Pre-shipment**: the personal-shopping speciality — orders from several live streams get **consolidated into one parcel**, waiting for everything to arrive, one person's many orders boxed together. The stock ledger only really settles at the moment of picking.

## The three genuinely hard things

The feature list isn't hard. What's hard is three properties that cut across the whole chain:

1. **The peak isn't a curve, it's a wall.** In the three seconds after the host calls a key, thousands of comments land at once — this isn't a normal e-commerce "campaign traffic ramp", it's a thundering herd triggered by one sentence (the flash-crowd chapter is all about this).
2. **No overselling — and specifically, not under concurrency.** Twenty units, three thousand people; any naive "check then decrement" will oversell. That invariant has to be guaranteed at the architecture level, not by being careful.
3. **Three ledgers have to line up.** Stock, orders and payments live in three different systems, and given time they will drift. Once they have, you need to be able to answer "which one is right?" — a system with no source of truth can only reconcile by guessing (the reconciliation chapter is all about this).

## The architecture I'd build now: write down the fact first, derive everything else

The system we had was already at this doorstep: comments got pulled in, cleaned, landed in the DB, and consumed in batches by a job. Starting over, I'd change one thing — take the thing we treated as a *buffer* and promote it to the centre of the architecture: **a comment isn't input waiting to be processed, it's a fact that must be kept forever**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 292" role="img" aria-label="The rebuilt architecture in four layers. The top layer has three comment sources — Facebook, Instagram and the own studio — each passing through an adapter. The second layer is a single append-only comment and order event log, marked as the single source of truth. The third layer is five services consuming that log independently: order parsing, identity, stock reservation, cart and orders, and payments and shipping. The bottom layer is reconciliation of the three ledgers — stock, orders and payments — all derived views of the event log, aligned on a schedule, with the log winning whenever they disagree." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rzb" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rzm" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="90" y="14" width="110" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="145" y="30" fill="#e6e6e6" font-size="8.4" text-anchor="middle">FB comments</text>
    <rect x="235" y="14" width="110" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="290" y="30" fill="#e6e6e6" font-size="8.4" text-anchor="middle">IG comments</text>
    <rect x="380" y="14" width="110" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="435" y="30" fill="#e6e6e6" font-size="8.4" text-anchor="middle">Own studio</text>
    <line x1="145" y1="38" x2="145" y2="56" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rzm)"/>
    <line x1="290" y1="38" x2="290" y2="56" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rzm)"/>
    <line x1="435" y1="38" x2="435" y2="56" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rzm)"/>
    <rect x="60" y="60" width="460" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="290" y="76" fill="#9aa4b2" font-size="8.4" text-anchor="middle">adapter × N: one per source, converging into a unified comment event (M×N → M+N)</text>
    <line x1="290" y1="84" x2="290" y2="102" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzb)"/>
    <rect x="40" y="106" width="500" height="32" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="290" y="126" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">Comment / order event log (append-only · the single source of truth)</text>
    <line x1="90" y1="138" x2="90" y2="162" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rzb)"/>
    <line x1="190" y1="138" x2="190" y2="162" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rzb)"/>
    <line x1="290" y1="138" x2="290" y2="162" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rzb)"/>
    <line x1="390" y1="138" x2="390" y2="162" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rzb)"/>
    <line x1="490" y1="138" x2="490" y2="162" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rzb)"/>
    <rect x="40" y="166" width="100" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="90" y="184" fill="#e6e6e6" font-size="8.2" text-anchor="middle">Order parsing</text>
    <text x="90" y="198" fill="#9aa4b2" font-size="6.6" text-anchor="middle">key+n · LWW</text>
    <rect x="148" y="166" width="92" height="42" rx="6" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.2"/>
    <text x="194" y="184" fill="#9b6ff0" font-size="8.2" text-anchor="middle">Identity</text>
    <text x="194" y="198" fill="#9aa4b2" font-size="6.6" text-anchor="middle">identity→account</text>
    <rect x="248" y="166" width="92" height="42" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="294" y="184" fill="#d6a45c" font-size="8.2" text-anchor="middle">Reservation</text>
    <text x="294" y="198" fill="#9aa4b2" font-size="6.6" text-anchor="middle">no overselling</text>
    <rect x="348" y="166" width="92" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="394" y="184" fill="#e6e6e6" font-size="8.2" text-anchor="middle">Cart · order</text>
    <text x="394" y="198" fill="#9aa4b2" font-size="6.6" text-anchor="middle">state machine</text>
    <rect x="448" y="166" width="92" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="494" y="184" fill="#e6e6e6" font-size="7.8" text-anchor="middle">Payments · shipping</text>
    <text x="494" y="198" fill="#9aa4b2" font-size="6.6" text-anchor="middle">idempotent integration</text>
    <line x1="150" y1="208" x2="205" y2="238" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rzm)"/>
    <line x1="290" y1="208" x2="290" y2="238" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rzm)"/>
    <line x1="430" y1="208" x2="375" y2="238" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rzm)"/>
    <rect x="120" y="242" width="340" height="28" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/>
    <text x="290" y="260" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">The three ledgers: stock · orders · payments (derived views)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The rebuilt architecture: the event log is the single source of truth, each service consumes it at its own pace, and all three ledgers are derived views — when they drift, the log wins.</figcaption>
</figure>

Three claims in that architecture, and they're the recurring themes of the whole series:

1. **Write down the fact first, talk business second.** A comment is appended to the event log the moment it arrives, and the business logic is a consumer of that log. That one step solves three things at once: the peak (a write is just an append, with the queue absorbing the spike — [[kafka-intro|Kafka]] exists for exactly this), debugging (every input leaves a trace and can be replayed), and reconciliation (you now have an answer to "which one is right?"). This is the field version of [[ddia-streaming|DDIA Part III]]: a fast-write source of truth plus fast-read derived views.
2. **Stock is a reservation model, and the holder is an identity, not an account.** "Holding stock" really is a reservation: held for `fb:12345` as an identity, claimed once an account is registered. Identity coming before account is where this business differs most from ordinary e-commerce.
3. **Assume every external integration will repeat, reorder and disappear.** Platform webhooks, payment callbacks, courier status — idempotency isn't a nice-to-have, it's day-one foundation.

## The series map

The series follows the journey of an order, with operations and evolution added as depth (chapters are still growing; the live series list is authoritative):

- **Opening and foundations**: the big picture (this post), the stack and the CI/CD starting position.
- **The transaction spine**: comment-to-order, identity and accounts, stock, cart and orders.
- **Money and goods**: third-party payments, pre-shipment handling.
- **Operations**: the host console, permissions, promotions and amounts, notifications, risk and blocklists.
- **Cross-cutting and ops**: the flash crowd at open, running production without an SRE, reconciling the three ledgers.
- **Evolution and endgame**: breaking the monolith into microservices, what if it became SaaS, the EM's view of a small team, and finally "Re: if I really started over".

## Reflections

### The biggest mistake back then wasn't the technology choice

It was treating "landing the data" as a buffer instead of a source of truth. We got it half right: comments were pulled in, cleaned, written to the DB, then consumed in batches — already half an event log. But **the raw text was thrown away** after cleaning, so any comment the cleaning rules mishandled was gone for good; and a comment whose batch **failed was simply skipped**, with no trace and no recovery path, so that customer disappeared in silence. It was a deliberate trade at the time: we'd rather drop an order than slow down the stock figure the host was watching. And we didn't even keep the speed — at peak, consumption fell behind, comment-to-confirmed-order could stretch to minutes, the host's mental model of stock stopped matching the system's, and the complaints grew straight out of those minutes. I'd still choose fast if I did it again — but **fast can be bought with "process it later", never with "throw the fact away"**: keep the fact and a late order can still be recovered, a complaint can still be traced to a person; lose the fact and you don't even know who to apologise to.

### Invariants matter more than features

Get a feature wrong and you fix it and ship again; oversell and you've sold goods that don't exist, which means apologising and refunding one customer at a time, with trust spent that doesn't come back. So the three rules in this system — never oversell, money and ledgers agree, integrations are idempotent — are what I'd put on page one of the design document on day one if I started over. Not because it's elegant, but because the cost of breaching those three is paid in reputation. That's the core of what I want this series to say: **what's hard about an e-commerce system isn't the features, it's the invariants.**

### Why write it as a "do-over"

Because "how would you design it if you started over" is my own favourite question to ask in interviews, and I've found the most honest way to answer it is to take a system you really built and really got wrong. Every chapter from here has two voices: how we actually did it and why, then how I'd do it now and why. The interesting part was never the model answer — it's the gap in between. That gap is what I actually learned these past few years.
