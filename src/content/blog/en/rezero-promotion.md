---
title: "Promotions and Amounts: A Miscalculated Discount Is Harder to Find Than an Oversell"
date: 2026-07-30
category: tech
description: "Third operations chapter: the three-axis coupon model (effect × threshold × scope), multi-buy offers that need no coupon, experimental buy-A-get-B living in admin; the NP-hard optimal-combination algorithm we wrote and the host who asked for sequential maximum deduction instead — plus the floor-and-subtract arithmetic that keeps refund allocation reconciling forever."
tags:
  - war-story
  - live-commerce
  - pricing
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 11
comments: true
draft: false
translationOf: rezero-promotion
---
An oversell explodes and a payment failure shouts; a miscalculated discount **makes no sound at all**. A customer who overpaid by 13 dollars won't know, and neither will you if you undercharged by 13, until the day you're digging through reconciliation one row at a time. This chapter is about promotions: how the rules are filed, how a clever algorithm lost to a single sentence from a host, and the dumb arithmetic that makes allocations always add up.

## The map of promotions: rules, conventions, experiments

Promotions lived in three habitats:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 286" role="img" aria-label="The three habitats of promotions. The upper half is coupon-based promotions, made of three orthogonal parameters: the effect is either a discount or free shipping; the threshold is a spend level, optionally with a product allowlist deciding which products count towards it; and the scope is a specific round, several rounds, or all rounds combined. One coupon is one combination of those three, for example three hundred off over three thousand, round A only, selected products only. Bottom left is multi-buy offers that need no coupon: buy some, get some free, with one product able to carry several. Bottom right is the experiment layer: every flavour of buy-A-get-B stuffed into Django admin and applied urgently, promoted into a real rule only once it holds up." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="16" y="18" width="548" height="132" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="290" y="38" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">With a coupon: one coupon = a combination of three parameters</text>
    <rect x="34" y="50" width="160" height="58" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="114" y="68" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">Effect</text>
    <text x="114" y="84" fill="#9aa4b2" font-size="6.6" text-anchor="middle">amount off over a threshold</text>
    <text x="114" y="98" fill="#9aa4b2" font-size="6.6" text-anchor="middle">free shipping over a threshold</text>
    <rect x="210" y="50" width="160" height="58" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="290" y="68" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">Threshold</text>
    <text x="290" y="84" fill="#9aa4b2" font-size="6.6" text-anchor="middle">how much spend triggers it</text>
    <text x="290" y="98" fill="#9aa4b2" font-size="6.6" text-anchor="middle">+ product allowlist (what counts)</text>
    <rect x="386" y="50" width="160" height="58" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="466" y="68" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">Scope</text>
    <text x="466" y="84" fill="#9aa4b2" font-size="6.6" text-anchor="middle">one round / several rounds</text>
    <text x="466" y="98" fill="#9aa4b2" font-size="6.6" text-anchor="middle">all rounds combined</text>
    <rect x="120" y="118" width="340" height="22" rx="11" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="290" y="133" fill="#54b890" font-size="7" text-anchor="middle">e.g. "300 off over 3000 · round A only · selected products"</text>
    <rect x="16" y="166" width="266" height="96" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="149" y="188" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">No coupon: multi-buy offers</text>
    <text x="149" y="208" fill="#e6e6e6" font-size="6.8" text-anchor="middle">buy N, get M free</text>
    <text x="149" y="224" fill="#9aa4b2" font-size="6.6" text-anchor="middle">one product can carry several</text>
    <text x="149" y="246" fill="#9aa4b2" font-size="6.4" text-anchor="middle">the ordering story is the next section</text>
    <rect x="298" y="166" width="266" height="96" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="431" y="188" fill="#e6e6e6" font-size="8.4" text-anchor="middle" font-weight="bold">Experiment layer: Django admin</text>
    <text x="431" y="208" fill="#9aa4b2" font-size="6.8" text-anchor="middle">every flavour of buy-A-get-B</text>
    <text x="431" y="224" fill="#9aa4b2" font-size="6.6" text-anchor="middle">applied urgently, experimentally</text>
    <text x="431" y="246" fill="#9aa4b2" font-size="6.4" text-anchor="middle">promoted to a real rule once it holds</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Parameterise what you'll repeat (the coupon's three axes), isolate what you're unsure about (the exotica in admin).</figcaption>
</figure>

- **Coupon-based promotions converge into three orthogonal parameters**: effect (discount / free shipping) × threshold (how much spend, plus an allowlist of "which products count towards it") × scope (one round / several rounds / all rounds combined). A new coupon is a set of parameters, not a block of ifs — and [[rezero-comment-order|the round]] becomes the system's natural boundary for the fourth time: a coupon's validity is expressed directly in rounds.
- **Multi-buy offers that need no coupon** (buy some, get some free) hang off the product, and one product can carry several — the order they apply in is the star of the next section.
- **Anything that resists classification goes into [[rezero-console|the admin lab]]**: every flavour of buy-A-get-B, applied urgently and experimentally. The last chapter's maturity spectrum finds its most frequent use case here: marketing's ideas will always outrun the rules table, and the lab lets an idea run first, earning a proper parameter only once it holds.

## The optimal solution lost to ordering

Multi-buy offers stack, and a product carries several — so which combination should a customer's cart get? The first answer was very engineer: write an **optimal-combination algorithm** that computes the cheapest possible application for them. It's combinatorial optimisation, growing towards NP-hard, but the product counts were small enough to compute.

Then the host said: **don't. Just go in order and take the largest deduction each time.**

It took me a long time to understand how right that request was. The problem with an optimal solution isn't the compute, it's that **its answer can't be explained to a person**:

- **It's unstable**: add one more product and the whole optimal combination may rearrange — the discount figure on the screen jumps around, and the customer doesn't think you're clever, they think they're being played.
- **It can't be said out loud**: the host has to explain the rule in one sentence on camera. "In order, take whichever discounts most" can be said; "our algorithm computes a globally optimal solution for you" is a complaint waiting to happen.
- **It isn't monotone**: under an optimal solution, buying more sometimes makes an existing discount disappear — "I bought one more, why did that get more expensive?" is a disaster support can't finish explaining.

What the host wanted, stated precisely: **promotions have a fixed order, and you apply each one until it can't apply again before moving to the next** — exhaust buy-5-get-3 before buy-3-get-2 gets a turn. The answer is stable, monotone and predictable — not globally cheapest, but **understandable at every step**. This is the same family of story as [[rezero-cart-order|the state machine getting ripped out]]: the engineers wrote the clever one, the floor asked for the dumb one, and the floor was right. One line: **an algorithm's standard of correctness is defined by its context of use — in a live stream, "correct" means the customer follows it and the number doesn't jump.**

### A digression worth taking: was it actually NP-hard?

Before we cut it, the algorithm deserves an honest complexity assessment — the answer has three layers, and the deepest one has nothing to do with complexity.

**Layer one: one product at one price — this is unbounded knapsack, not NP-hard.** Write the problem out: the customer orders $n$ paid units; each application of "buy $a_i$, get $b_i$ free" **consumes $a_i$ paid units and gives $b_i$ extra free**; each paid unit can only be counted by one promotion. Maximise units given away, $\sum b_i x_i$, subject to $\sum a_i x_i \le n$. That's unbounded knapsack (a cousin of the coin-change problem): formally weakly NP-hard, but with an $O(n \times k)$ DP — where $n$ is the number of units bought, in reality a few dozen, solved instantly. What's interesting is that **greedy is already not optimal in this simplest case**. Take buy-3-get-2 and buy-5-get-3, with greedy applying the bigger one first as the host ordered:

- $n=8$: buy-5-get-3 (consuming 5) + the remaining 3 on buy-3-get-2 — **5 free**; the optimum is also 5. A tie.
- $n=9$: greedy applies buy-5-get-3, then buy-3-get-2, leaving 1 unit idle — 5 free; **the optimum is buy-3-get-2 three times — 6 free.**

Greedy loses for the same reason it does at coin change: **a generous-looking promotion doesn't necessarily have a high give-rate per paid unit** — buy-5-get-3 gives 3/5 = 60%, buy-3-get-2 gives 2/3 ≈ 66.7%, and the winner is often decided by the remainder (that one paid unit left hanging). So precisely speaking, our greedy was never "near-optimal", it was simply "a simple rule" — which is exactly why it was chosen, and there's no need to crown it with optimality it doesn't have.

And how cheap is a DP for this? Let $f(j)$ be the most units you can get free using $j$ paid units:

$$f(j) = \max\Big(f(j-1),\ \max_{i:\,a_i \le j} \big\{ f(j-a_i) + b_i \big\}\Big),\qquad f(0)=0$$

The answer is $f(n)$, in $O(n \times k)$. Walk n=9 through it:

| $j$ | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| $f(j)$ | 0 | 0 | 2 | 2 | 3 | **4** | 4 | 5 | **6** |

$f(9)=6$, which is exactly "buy-3-get-2, three times". But there's a more important observation hiding in that table: look at $f(5) \to f(6)$ — the optimal combination **switches** from buy-5-get-3 to buy-3-get-2 twice. The customer adds one product and the whole set of promotions on screen rearranges. **DP gives you the optimal value, but an optimal solution's composition jumps around with n — that's a property of optimality itself, independent of the algorithm.** DP can't solve the explainability problem: even if compute were free, cutting the optimal solution was still right.

**Layer two: the same product at several prices — the definition of "optimal" starts drifting.** A product has a live price, a storefront price, per-variant prices, and the cart item carries a "special price" column for special promotions — so inside one cart, the same product can have several prices at once. Apply a promotion and which unit is the free one? Which price does the deduction use? Back then **there was no explicit definition of "which price is definitely cheapest"** — and here the optimal algorithm's weakest point isn't compute, it's the **specification**: with "optimal" itself undefined, the algorithm is optimising an objective function nobody signed. And undefinedness doesn't merely make the answer drift, it makes the space explode: **to an optimiser, every undefined point is a variable** — m price interpretations × n products is $m^n$ worlds, each of which needs its own grouping optimum solved and compared. **One missing sentence of specification doubles the search space**; greedy applying in order is essentially killing variables with definitions — the order is a constant and each step's rule is a constant, so the space collapses to a straight line. What it saves isn't CPU, it's specification debt.

**Layer three: combinations across products are where NP-hard really begins.** Ordinary multi-buy offers don't span products, and coupons and non-coupons **don't affect each other** (two independent layers) — so the ordinary problem is entirely solvable. But the moment the admin layer's exotic buy-A-get-B spans products, plus the mutual exclusion of "each unit can only be consumed once", the problem becomes weighted set packing: choose non-overlapping combinations from all possible promotion applications (each a weighted set of products) to maximise total discount — strongly NP-hard, with no DP to save you. The old instinct that "this should be NP-hard" was right about exactly this layer.

There's a memorable test for "can this still be a DP": **look at whether the new condition asks "how many" or "which ones".** A condition that only changes counts or amounts survives with one more DP dimension (a spend threshold is this kind); a condition that starts needing to know *which* units (give away the cheapest, each unit with its own special price, cross-product bindings) destroys the interchangeability of units and the state can't be compressed — **DP dies of heterogeneity, not of rule count**. And the engineering death usually comes earlier: every new condition forces you to redesign the state and re-prove correctness, so maintenance cost carries out the execution long before theory hands down its sentence.

Across all three layers, greedy wins once each: at layer one it loses on optimality and wins on simplicity; at layer two it **defines the semantics with an order** — "in order, largest deduction each time" answers both "how to compute" and "what counts as correct", so where price semantics are ambiguous **the process is the specification**; at layer three it stops exotic promotions from dragging the whole cart into a combinatorial explosion. So the reasons for cutting the optimal solution, in order of importance: **can't be explained > isn't defined > can't be computed** — and compute is the least important of the three.

## Where the money lives: a column at each layer

The results of the promotion calculation get columns directly on [[rezero-cart-order|orders payment, order and order item]] — whichever layer fits. That isn't arbitrary, it's the correct use of the three layers: **a money column lives with its semantics** — a product's own multi-buy offer on the item, a round-limited coupon on the order (its scope *is* the round), an all-rounds-combined one on the payment. Amounts freeze at checkout ([[rezero-cart-order|the commitment point]] principle), and invoices, refunds and reconciliation all stand on the frozen value.

## Integers, flooring, subtraction: the arithmetic of allocation

Every amount is computed in **integers** — the first commandment of code that handles money. The real test is **allocation**: a round coupon took 100 off, spread across two products; the customer returns one of them, so how much do you refund?

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 236" role="img" aria-label="A floor-and-subtract allocation worked through. The case: two products at six hundred and ninety-nine and three hundred and one, one thousand together, with a round coupon taking one hundred off. Step one, split pro rata: the first item's share of the discount is sixty-nine point nine, giving a discounted price of six hundred and twenty-nine point one, floored to six hundred and twenty-nine. Step two, finish the last one by subtracting: nine hundred actually paid minus six hundred and twenty-nine is two hundred and seventy-one. Check: six hundred and twenty-nine plus two hundred and seventy-one is exactly nine hundred, and the discounts total exactly one hundred; returning the first item refunds six hundred and twenty-nine. The floored fraction is absorbed by the company, and the total is always identical." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="290" y="24" fill="#e6e6e6" font-size="8.6" text-anchor="middle" font-weight="bold">Case: 699 + 301 = 1000, round coupon takes 100 → pay 900</text>
    <rect x="30" y="42" width="250" height="76" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="155" y="62" fill="#4f6df5" font-size="7.8" text-anchor="middle" font-weight="bold">① split pro rata, then floor</text>
    <text x="155" y="80" fill="#e6e6e6" font-size="6.8" text-anchor="middle">item A: 699 − (699/1000 × 100)</text>
    <text x="155" y="94" fill="#e6e6e6" font-size="6.8" text-anchor="middle">= 629.1 → floor → 629</text>
    <text x="155" y="110" fill="#9aa4b2" font-size="6.2" text-anchor="middle">the 0.1 remainder: we absorb it</text>
    <rect x="300" y="42" width="250" height="76" rx="7" fill="#233528" stroke="#54b890" stroke-width="1.3"/>
    <text x="425" y="62" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">② the last one: finish by subtracting</text>
    <text x="425" y="80" fill="#e6e6e6" font-size="6.8" text-anchor="middle">item B: 900 − 629 = 271</text>
    <text x="425" y="94" fill="#e6e6e6" font-size="6.8" text-anchor="middle">no ratio, just top up to the total</text>
    <text x="425" y="110" fill="#9aa4b2" font-size="6.2" text-anchor="middle">subtraction guarantees the sum</text>
    <rect x="90" y="140" width="400" height="52" rx="7" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="290" y="160" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-weight="bold">Check: 629 + 271 = 900 ✓ discount 70 + 30 = 100 ✓</text>
    <text x="290" y="178" fill="#e6e6e6" font-size="6.8" text-anchor="middle">refund item A and you refund 629 — every cent has an owner, and the books always balance</text>
    <text x="290" y="218" fill="#9aa4b2" font-size="7.2" text-anchor="middle">Every similar allocation is handled this way — one rule, used system-wide</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">floor-and-subtract: flooring gives the remainder an owner (us), subtraction makes the totals identical — ugly, but every cent adds up.</figcaption>
</figure>

There are only two rules: **floor the pro-rata discounted price** (the fraction goes to the customer and the company absorbs it — disputes always tip in the customer's favour); and **don't compute a ratio for the last share, subtract up to the total** (the totals being identical is guaranteed structurally, not by tests). It's a pragmatic simplification of largest-remainder allocation, and it came with a good convention: **every similar situation is handled this way** — one allocation algorithm system-wide, so whoever reconciles only has to understand it once.

## What a rebuild would do

Most of this survives: the three-axis parameter table, the admin experiment layer, applying in a fixed order until exhausted, and floor-and-subtract are all right. The rebuild list is short:

1. **A price isn't a function, it's a decision made live.** The intuitive fix is to nail down a price-resolution order (special price > source price > variant price) and kill the $m^n$ search space with rules — but that's wrong: **the price priority is the host's judgment call, which the system can't govern and shouldn't**. Live pricing is an art of the moment: she negotiated the goods, she calls the price, and whether this customer gets a special price is her commercial judgment. The right rebuild isn't eliminating that freedom, it's giving it a clean landing spot — the special-price column *is* the container for "a decision made live", and the system's job is **recording the decision as a fact** (who, when, what price), not deriving prices on the floor's behalf. The variables in that search space aren't killed by rules, they're killed by **the moment of pricing** — a person decides, and the variable collapses into a constant. Mechanism to the system, policy to people, once again.
2. **Give the application order an explicit handle.** Promotions carry an explicit order column set by the host or operations, and the algorithm simplifies to the extreme — **in order, exhaust each one** — not even needing "take the biggest each step", because the order itself is the entire rule: sayable out loud, predictable, and changed by reordering rather than by a release.
3. **Promote the allocation rule from a convention to a class.** floor-and-subtract was a "handle similar cases this way" convention; a rebuild converges it into a single allocation policy class (in Clean Architecture's terms it's a domain rule and deserves a name and a home), with a property test — for any input, the allocations sum exactly to the whole. **A convention drifts as people come and go; a class with a test doesn't.**
4. **Dry-run before issuing a coupon.** The promotion engine has the shape of a pure function (cart + rules → result), so it's naturally replayable offline: before a new coupon goes live, run it over historical orders and see roughly what it will cost — the same prevention as the lesson from [[rezero-inventory|the stock chapter]]'s migration incident: **look at the numbers before shipping a rule that moves money.**
5. **Don't formalise the exotic buy-A-get-B.** The more expressive a rules table gets, the closer the rules engine comes to being a programming language; keeping the two layers — a parameter table for what's proven, admin isolation for what's experimental — is enough.

## Reflections

### The graveyard of clever algorithms is explanation cost

The optimal-combination algorithm was among the most technically impressive code we wrote, and among the fastest to be cut. Why it lost to greedy is worth memorising: **an algorithm's total cost = compute cost + explanation cost**, and in a consumer-facing system the second one is almost always the larger. When a customer asks "why is this the discount?", support has to answer, the host has to say it out loud, and an engineer has to trace it — and an optimal solution fails all three. That's the third time a host taught us design (the state machine, the re-call, greedy), and all three lessons are one: **the core of floor wisdom is explainability, and the system either accommodates it or gets routed around.**

### Parameterise what you'll repeat, isolate what you're unsure of

What a promotions system fears most is growing into a sea of ifs — one special case per campaign, and two years later nobody dares touch it. The structure we had avoided that: repeating patterns (threshold × scope × effect) converged into a parameter table, so a new coupon is filling in a form; uncertain ideas (exotic buy-A-get-B) isolated into the admin lab, thrown away if they flop and promoted only once they stand. **The point of a rules engine isn't "able to express anything" — it's making the repetitive cheap and the experimental safe.** Two layers each doing their job is how marketing's speed and the system's maintainability stay alive at the same time.

### Correctness with money is an accounting property, not a mathematical one

floor-and-subtract is ugly to a mathematician: the split isn't exactly proportional and the last share is patched in by subtraction. But code that handles money was never answering "is the split accurate?" — it answers **"do the totals match, does the remainder have an owner, and can it be traced afterwards?"** That's an accounting standard, not a mathematical one. Who gets the 0.1 doesn't matter at all; what matters is that every cent has an owner, a refund always produces one definite number, and reconciliation always balances. **In code that handles money, elegance yields to reconciliation** — a line worth taping to every e-commerce engineer's monitor.
