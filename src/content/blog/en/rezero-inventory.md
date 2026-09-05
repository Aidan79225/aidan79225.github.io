---
title: "Stock: Never Overselling Is This System's One Iron Rule"
date: 2026-07-26
category: tech
description: "The heart of live commerce: a ledger that stores a cap and two consumptions rather than a remainder, the failure bias hidden in Serializable check-then-decrement, a real oversell set off by a requirement change plus a migration, and the self-healing of round settlement and hourly recomputation."
tags:
  - war-story
  - live-commerce
  - inventory
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 5
comments: true
draft: false
translationOf: rezero-inventory
---
With [[rezero-comment-order|comments]] parsed and orders hung off an [[rezero-identity|identity]], the main line reaches the heart: **stock**. This system's feature list can grow at its leisure, but one rule was iron from day one — **you cannot oversell**. Selling goods that don't exist means apologising and refunding one customer at a time. This chapter covers how we defended that invariant, what actually broke it (the answer will surprise you), and how I'd defend it now.

## The shape of the ledger: not a remainder, but a cap and two consumptions

The most intuitive stock design stores a "remaining stock" column, decrementing on a sale and incrementing on a return. We didn't do that; the ledger was split into **one cap and two consumptions**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 300" role="img" aria-label="The model of the stock ledger. On the left is the product table, holding price and product information, which changes during a stream. On the right, one-to-one with it, is the inventory table holding three numbers: the stock cap, which is what a host adjusts when restocking; the cart quantity, which is the reservation; and the order quantity, which is the completed sale. On payment the cart quantity transfers into the order quantity inside a single transaction. The invariant is marked in the middle: cart plus order must be less than or equal to the cap, and what is sellable is derived rather than stored. Below are four writers: the FSM batch placing and amending orders, the customer adjusting quantities, support clearing and adjusting carts, and the assistant or operations restocking and closing the round — all pointing at the inventory table. At the very bottom, a note that both counts are fully recomputed hourly from cart items and order items, as a derived value healing itself." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rvf" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rvm" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="20" y="46" width="170" height="58" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="105" y="66" fill="#e6e6e6" font-size="8.8" text-anchor="middle" font-weight="bold">product</text>
    <text x="105" y="81" fill="#9aa4b2" font-size="6.8" text-anchor="middle">price, product info</text>
    <text x="105" y="94" fill="#9aa4b2" font-size="6.8" text-anchor="middle">changes all through a stream</text>
    <line x1="190" y1="75" x2="228" y2="75" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="209" y="66" fill="#9aa4b2" font-size="6.4" text-anchor="middle">1:1</text>
    <rect x="230" y="24" width="326" height="122" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.6"/>
    <text x="393" y="42" fill="#d6a45c" font-size="9.2" text-anchor="middle" font-weight="bold">inventory table (hot data, its own table)</text>
    <rect x="246" y="52" width="294" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="393" y="68" fill="#e6e6e6" font-size="7.6" text-anchor="middle">stock cap —— a restock adjusts only this</text>
    <rect x="246" y="82" width="140" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="316" y="98" fill="#4f6df5" font-size="7.4" text-anchor="middle">cart qty (reserved)</text>
    <rect x="400" y="82" width="140" height="24" rx="4" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="470" y="98" fill="#54b890" font-size="7.4" text-anchor="middle">order qty (paid)</text>
    <line x1="386" y1="94" x2="398" y2="94" stroke="#54b890" stroke-width="1.2" marker-end="url(#rvf)"/>
    <text x="393" y="120" fill="#9aa4b2" font-size="6.6" text-anchor="middle">payment: cart → order, moved inside one transaction</text>
    <text x="393" y="136" fill="#e6e6e6" font-size="7.8" text-anchor="middle" font-weight="bold">invariant: cart + order ≤ cap (sellable is derived, never stored)</text>
    <rect x="20" y="196" width="120" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="80" y="212" fill="#e6e6e6" font-size="7.4" text-anchor="middle">FSM batch</text>
    <text x="80" y="226" fill="#9aa4b2" font-size="6.2" text-anchor="middle">orders · LWW edits</text>
    <rect x="160" y="196" width="120" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="220" y="212" fill="#e6e6e6" font-size="7.4" text-anchor="middle">customer</text>
    <text x="220" y="226" fill="#9aa4b2" font-size="6.2" text-anchor="middle">adjusts quantity</text>
    <rect x="300" y="196" width="120" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="360" y="212" fill="#e6e6e6" font-size="7.4" text-anchor="middle">support</text>
    <text x="360" y="226" fill="#9aa4b2" font-size="6.2" text-anchor="middle">clears · adjusts carts</text>
    <rect x="440" y="196" width="120" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="500" y="212" fill="#e6e6e6" font-size="7.4" text-anchor="middle">assistant / ops</text>
    <text x="500" y="226" fill="#9aa4b2" font-size="6.2" text-anchor="middle">restock · close round</text>
    <line x1="80" y1="196" x2="290" y2="150" stroke="#4f6df5" stroke-width="1" marker-end="url(#rvf)"/>
    <line x1="220" y1="196" x2="340" y2="150" stroke="#4f6df5" stroke-width="1" marker-end="url(#rvf)"/>
    <line x1="360" y1="196" x2="390" y2="150" stroke="#4f6df5" stroke-width="1" marker-end="url(#rvf)"/>
    <line x1="500" y1="196" x2="450" y2="150" stroke="#4f6df5" stroke-width="1" marker-end="url(#rvf)"/>
    <text x="290" y="264" fill="#9aa4b2" font-size="7.4" text-anchor="middle">Four writers — but both counts are recomputed hourly from cart/order items (a derived value healing itself)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Three numbers in the ledger: the cap moves only on a restock, the two consumptions accumulate separately; "remaining" is always computed, never stored.</figcaption>
</figure>

Three judgments in that shape were right from the start:

- **Hot and cold split.** Product information changes constantly during a stream — the host prices things live, chases the supplier for more stock live — so the product table is "cold data that operations edits often" and the inventory table is "hot data hammered by ordering transactions". Split them and the lock only covers the hot row.
- **Don't store the remainder.** Remaining = cap − cart − order, always computed. The problem with storing a remainder is **muddy semantics**: every compensation, amendment and restock piles onto the same number, one mistake drifts forever, and you never know what it "should" have been. Stored separately, each number means one thing: the cap moves only on restock, the cart only accumulates (transferred out on payment, corrected on amendment), the order only increases at payment. When something drifts, each number has its own thing to reconcile against.
- **Count reservations and sales separately.** Cart quantity (held but unpaid) and order quantity (paid) are separate, and the overselling formula is **their sum** against the cap. What the host sees as "how many sold" is the sum, just as live; and the reservation-to-sale conversion rate becomes a free operational metric on the side — the abandonment rate, which we'll meet again in the risk chapter.

## Decrementing stock: the three-move combo we had, and its bias

There are three standard options for decrementing stock under concurrency: database locks, [[redis-distributed-lock|Redis atomic operations]], and a single writer with a queue. What we had was the heavy-armour version of the first: **ORM + transaction, check then decrement, Serializable isolation, retry on error**. [[ddia-transactions|Serializable]] guarantees nobody cuts into the gap between checking and decrementing — a transaction that squeezes in simply fails, retries, fails again… and then **that customer is skipped**.

In fairness: this **never oversold** (the oversell had a different culprit, next section). A single batch consumer already serialised most of the writes naturally, and Serializable was the seatbelt against the other writers (customers adjusting quantities, support making changes, the assistant restocking). Logically it's airtight.

The problem is the **distribution** of the failures. The customers who exhaust their retries aren't lost at random: wherever the contention concentrates, so does the sacrifice — and contention always concentrates on **the hottest item**. Which means: **the better an item sells, the more customers vanish in silence.** That bias is quiet, raises no errors and reaches no dashboard, and it's the one cut I most want to make looking back.

The fix in a rebuild is surprisingly cheap — collapse "check then decrement" into **one conditional update**:

```sql
UPDATE inventory
   SET cart_qty = cart_qty + 2
 WHERE product_id = :pid
   AND stock_cap - cart_qty - order_qty >= 2;
-- 0 rows affected = didn't get it, return "sold out" immediately;
-- no gap between check and decrement, so no Serializable and no retry storm
```

The ORM was the workhorse back then, and Django writes exactly the same thing — `filter()` *is* the `WHERE`, and `F()` pushes the arithmetic down into the database instead of pulling values back into Python:

```python
from django.db.models import F

updated = Inventory.objects.filter(
    product_id=pid,
    stock_cap__gte=F("cart_qty") + F("order_qty") + n,  # the invariant lives in the WHERE
).update(cart_qty=F("cart_qty") + n)                    # one UPDATE, atomic

if updated == 0:
    ...  # didn't get it: return "sold out" cleanly, no exception, no retry
```

The check and the decrement are one atomic action, with the invariant guarded by the `WHERE` clause: missing out is a clean 0 rows, needing no isolation level to prop it up, no retries, and therefore none of the retry-exhaustion bias. A single-row atomic conditional update is the most underrated concurrency primitive in a relational database — and it doesn't conflict with an ORM at all. The only difference is whether you notice that `filter().update()` is one statement while "`get()`, then change a field, then `save()`" is two, and the gap between them is exactly the hole Serializable was patching.

## The time it really did oversell: the culprit wasn't concurrency, it was a migration

This system overslept exactly once. Everyone's instinct is to guess a lock wasn't held properly — it wasn't. **The formula never broke; what broke was the definition of one word inside it.**

In the original design, only live-stream carts **held** against sold quantity; a cart added on the storefront was **intent** and held nothing. Later the business wanted storefront carts counted as sold too. Not a hard change — make it, run a migration, and fold every historical storefront cart into the count. And then: **sold quantity leapt and blew straight through the stock cap.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 216" role="img" aria-label="A before-and-after of the overselling incident. Before the change: a stock cap of one hundred, sixty held by live-stream carts, and fifty units of storefront cart counted as intent and holding nothing, so the invariant holds. After the requirement change plus the migration: historical storefront carts are retroactively promoted to held, so held becomes sixty plus fifty equals one hundred and ten against a cap of one hundred, overselling ten. The formula did not change; the definition of sold changed, and was applied retroactively to historical data." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rvp" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e05a7d"/></marker></defs>
    <text x="145" y="26" fill="#54b890" font-size="9.2" text-anchor="middle" font-weight="bold">Before: intent holds nothing</text>
    <rect x="30" y="40" width="230" height="26" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/>
    <rect x="30" y="40" width="138" height="26" rx="5" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="99" y="57" fill="#d6a45c" font-size="7.2" text-anchor="middle">live cart 60 (held)</text>
    <text x="214" y="57" fill="#9aa4b2" font-size="7" text-anchor="middle">40 left</text>
    <text x="145" y="82" fill="#9aa4b2" font-size="7" text-anchor="middle">cap 100</text>
    <rect x="30" y="94" width="115" height="24" rx="5" fill="none" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="87" y="110" fill="#9aa4b2" font-size="6.8" text-anchor="middle">storefront cart 50 (intent)</text>
    <text x="145" y="140" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">60 ≤ 100 ✓ invariant holds</text>
    <line x1="290" y1="30" x2="290" y2="150" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="435" y="26" fill="#e05a7d" font-size="9.2" text-anchor="middle" font-weight="bold">After the change + migration</text>
    <rect x="320" y="40" width="230" height="26" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/>
    <rect x="320" y="40" width="138" height="26" rx="5" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.2"/>
    <rect x="458" y="40" width="92" height="26" rx="5" fill="#3a2632" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="389" y="57" fill="#d6a45c" font-size="7.2" text-anchor="middle">live 60 (held)</text>
    <text x="504" y="57" fill="#e05a7d" font-size="7" text-anchor="middle">store 50 (held)</text>
    <line x1="560" y1="53" x2="576" y2="53" stroke="#e05a7d" stroke-width="1.2" marker-end="url(#rvp)"/>
    <text x="435" y="82" fill="#9aa4b2" font-size="7" text-anchor="middle">cap 100, held 110 — the 10 that spill over are the oversell</text>
    <text x="435" y="140" fill="#e05a7d" font-size="8" text-anchor="middle" font-weight="bold">110 &gt; 100 ✗ past intent retroactively promoted to held</text>
    <text x="290" y="186" fill="#9aa4b2" font-size="7.6" text-anchor="middle">The formula didn't change and no lock failed — the definition of "sold" changed, and it was applied to history</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">What killed the invariant wasn't concurrency: a migration promoted every past "intent" into "held" overnight, and history doesn't make room for a new definition.</figcaption>
</figure>

The clean-up at the time was pragmatic: **keep the new semantics** — it's what the business wanted — and absorb the overflow two ways. Chase the supplier for **more stock** and raise the cap; for whatever couldn't be sourced, have support **clear carts** and explain to each customer. One fix from the cap end, one from the held end, squeezing the books back inside the invariant. The terrain of personal shopping helped here: the cap was never a dead number in a warehouse, it's a promise about "how much more we can still get" — and that's negotiable.

Taking it apart afterwards, two independent errors were stacked:

1. **A semantic error**: a storefront cart is "intent that hasn't been committed to", and counting it as held is lending stock to people who may never come. The original "live holds, storefront doesn't" distinction was in fact the correct boundary between **reservation and intent**.
2. **A retroactivity error**: even if the business genuinely wanted the change, the detonator was the migration **applying the new semantics to historical data**. Historical data was formed under the old rules, and the world does not re-queue itself the moment a new rule takes effect.

My position on a rebuild is simple: **I would kill this requirement.** If it truly couldn't be resisted, there are only two safe gears — new semantics apply to **new data only** (don't migrate), or storefront holds get their own quota and expiry, with a dry-run before release showing what every product's count would become. "Just change it and migrate" is the one absolutely wrong option, and it's exactly the one closest to hand. That lesson deserves to be magnified into a sentence: **an invariant isn't code, it's a semantic contract — redefine any word in the formula and you are rewriting the meaning of historical data.**

## After you've held the line: release, recompute, and the big clean

What's held has to be released or stock bleeds slowly. Release back then wasn't a TTL countdown, it was a **settlement day**: streams ran on a weekly purchase round, and at the end of a round a "close the round" API fired — clearing that round's carts and unpaid orders, and adding non-payers to the blocklist under certain conditions (punishment executed at the period boundary, as admission control for the next round). That API, clearing an entire round in one go, ran **surprisingly smoothly** — in hindsight that's discipline paying out: apart from that one measured, precise denormalisation ([[rezero-identity|the fb_user_id from the last chapter]]), the whole schema obediently followed 3NF, so there was no derived data scattered around to wipe alongside. **Normalisation shows no benefit day to day, and repays you with interest at the moment of a mass delete or a settlement.**

Two other lines of defence:

- **Hourly full recomputation.** The truth of both counts is cart items and order items; the counts are only their cache. Rebuilding from the truth every hour bounds the drift at one hour — eventual consistency healing itself, and a miniature trailer for the three-ledgers chapter. The rebuild adds one thing: **the differences that recomputation finds must be recorded and alerted on** — a non-zero difference means some incremental path has a bug, and silently overwriting it erases the bug's only signal.
- **Restocking moves to an adjustments ledger.** The API for adding stock mid-stream used to fail — at the moment of opening, hundreds of ordering transactions queue on the same row and the assistant's UPDATE can't get in, so they had to retype it by hand on the spot, which effectively made the live assistant the retry mechanism. A rebuild turns restocking into an append-only **adjustments ledger**: `cap = initial + SUM(adjustments)`, so a restock is always an insert of a new row that never touches the hot row, and it comes with a built-in audit of who, when and how much — solving the operation trail the console chapter wants, for free.

## Reflections

### An invariant is a semantic contract, written before the code

The most important lesson here comes from the overselling incident: the biggest threat to an invariant isn't concurrency and isn't a bug, it's **a requirement change that sounds entirely reasonable**. "Storefront carts should count as sold too" carries no menace in a meeting room, and nobody feels they're altering the definition of an iron rule. An engineer's job at that moment isn't to estimate how hard the change is — it's to recognise that **this requirement changes semantics rather than adding a feature**, and then lay the consequences out: don't change it, or apply it only to new data, or dry-run it and show everyone the numbers first. We treated it as an ordinary requirement at the time; in a rebuild, this is one of the few moments I'd push back hard. The difference between senior and not is often less about how much technology you know and more about **recognising which words can't be casually redefined**.

### An honest ledger grows into the shape of event sourcing on its own

Lay this system's data model out: comments land before they're consumed, the cap and the consumptions are stored separately, payment inserts an order item rather than editing a cart item, the rebuild's restock is an append-only adjustments ledger, derived values are recomputed hourly from facts — **facts only accumulate, and derivations can always be rebuilt**. Nobody ever said "let's do event sourcing"; each of these was forced out by a concrete pain (books not matching, hot rows fighting, no thread to pull on when debugging). What [[ddia-streaming|DDIA Part III]] calls facts and derivations grew by itself inside a six-person team's e-commerce system — good architectural patterns aren't applied from outside, they're the shape you converge on after being honest about what your data means.

### Bias is scarier than an outage

An outage shouts: alerts fire, charts fall, everyone piles in. Bias doesn't — the customers whose Serializable retries ran out disappeared one by one in silence, **concentrated on your best-selling items**, and the system felt nothing. That's the sharpest cut looking back after leading [[sre-monitoring|SRE]]: a system with 99% average success may be at 90% on the 1% of traffic that matters most — **an average lies; the distribution of failures tells the truth**. The rebuild pulls that bias out at the root with one conditional update, but the more general homework is this: every time you design a path that skips on failure, ask one question first — will the people being skipped happen to be the same group every time?
