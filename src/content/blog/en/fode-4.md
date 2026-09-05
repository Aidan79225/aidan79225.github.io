---
title: "How to Actually Choose Technology: Reading Fundamentals of Data Engineering, Ch. 4"
date: 2026-06-30
category: tech
tags:
  - data-engineering
  - book-notes
series: "Fundamentals of Data Engineering — Reading Notes"
seriesOrder: 4
comments: true
draft: false
translationOf: fode-4
---
[[fode-3|The previous post]] was about architecture (the why); this chapter asks next: under that architecture, **how do you actually choose the technology (the how)?** The line to nail into your head first — **architecture first, then technology, never the reverse.** Tools are means, led by the architecture's trade-offs; if the first question is "which tool should we use", the order is already wrong.

## An all-too-common mistake: falling in love with the tool first

A lot of teams decide like this: see a hot tool → decide to use it → then go back and fit the architecture around it. The book flips it straight over: **architectural decisions (why the system is cut this way, what you're willing to trade) come first; technology decisions (which product implements it) come second.** Tools are options in service of a trade-off, not the starting point.

Then, once you've got the order right and are ready to choose, the book gives a whole row of criteria. Condensed into one table:

| Criterion | What it asks |
|---|---|
| Team size and capabilities | Can you afford and tame this thing? |
| Speed to market | How fast can you deliver value? (often underrated) |
| Interoperability | Does it connect to what you already have? |
| Cost | TCO, TOCO, FinOps (see below) |
| Today vs the future | Immutable foundation vs transitory surface (see below) |
| Location | Cloud / on-prem / hybrid |
| Build vs buy | Is this worth building yourself? (see below) |
| Monolith vs modular | One bundled block, or swappable components? |
| Serverless vs servers | Who carries the operations? |

Three rows I think deserve the deepest dig, and that most change how you decide: **today vs the future, build vs buy, cost.**

## Core one: the immutable foundation vs the transitory surface

The book distinguishes two kinds of technology: **immutable** and **transitory**. Immutable ones are the underlying layers that have held for decades and won't disappear soon — object storage, SQL, networking, Unix / bash; transitory ones are the frameworks, libraries and hot tools that come and go, possibly nobody mentioning them three years later.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 232" role="img" aria-label="Technology in two layers: the top is the transitory surface of frameworks and tools that come and go, designed to be swappable; the bottom is the immutable foundation of object storage, SQL, networking and Unix, which the architecture should anchor to" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="270" y="22" fill="#9aa4b2" font-size="11.5" text-anchor="middle">Transitory surface — frameworks · libraries · hot tools</text>
    <rect x="48" y="36" width="96" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="96" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">hot framework</text>
    <rect x="168" y="36" width="96" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="216" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">trendy tool</text>
    <rect x="288" y="36" width="96" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="336" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">library</text>
    <rect x="408" y="36" width="84" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="450" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">platform SDK</text>
    <text x="270" y="100" fill="#9aa4b2" font-size="10" text-anchor="middle">comes and goes with fashion → design it to be swappable</text>
    <line x1="40" y1="120" x2="500" y2="120" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <rect x="48" y="146" width="444" height="62" rx="8" fill="#4f6df5" fill-opacity="0.16" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="270" y="174" fill="#4f6df5" font-size="11.5" text-anchor="middle">Immutable foundation</text>
    <text x="270" y="194" fill="#e6e6e6" font-size="10.5" text-anchor="middle">object storage · SQL · networking · Unix / bash</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Bet on the foundation that hasn't changed in decades and keep the surface that will date swappable — an extension of Ch. 3's loose coupling and reversibility</figcaption>
</figure>

The advice is clear: **anchor the architecture to the immutable foundation, and design the transitory surface to be swappable.** Bet thirty years on SQL and object storage and you won't be far wrong; this year's hottest framework, don't let it seep into every corner of the system and bind you. It's the same nerve as the loose coupling and reversibility of [[fode-3|Ch. 3]] — bet on the stable things, and let the changeable things be replaced locally.

## Core two: build vs buy

The second key criterion: should you build this thing yourself, or buy / use something off the shelf? The book's rule of thumb is one question — **is this your core differentiator?**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 200" role="img" aria-label="The build vs buy criterion: ask whether this is your core differentiator; if not, buy or use a managed off-the-shelf option, which is the default; only if it is does building it yourself pay off" style="width:100%;max-width:560px;height:auto;margin:0 auto;">
    <defs><marker id="ab4" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4f6df5"/></marker><marker id="abm4" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <polygon points="140,50 238,100 140,150 42,100" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="140" y="96" fill="#e6e6e6" font-size="10" text-anchor="middle">is this your core</text>
    <text x="140" y="112" fill="#e6e6e6" font-size="10" text-anchor="middle">differentiator?</text>
    <line x1="238" y1="100" x2="300" y2="76" stroke="#4f6df5" stroke-width="1.5" marker-end="url(#ab4)"/>
    <text x="264" y="70" fill="#4f6df5" font-size="10" text-anchor="middle">no</text>
    <line x1="238" y1="100" x2="300" y2="146" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#abm4)"/>
    <text x="264" y="142" fill="#9aa4b2" font-size="10" text-anchor="middle">yes</text>
    <rect x="302" y="52" width="204" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="404" y="72" fill="#e6e6e6" font-size="10.5" text-anchor="middle">buy / use managed (default)</text>
    <text x="404" y="88" fill="#9aa4b2" font-size="9" text-anchor="middle">undifferentiated heavy lifting: don't carry it</text>
    <rect x="302" y="124" width="204" height="46" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.5"/>
    <text x="404" y="144" fill="#e6e6e6" font-size="10.5" text-anchor="middle">build it yourself</text>
    <text x="404" y="160" fill="#9aa4b2" font-size="9" text-anchor="middle">only when it's truly your edge</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The default is buy / use off-the-shelf — keep your engineering effort for where it actually pulls you ahead, echoing Ch. 1's "Type A first"</figcaption>
</figure>

The book's position (and mine): **default to buy / off-the-shelf; building is the exception.** Amazon's phrase "no undifferentiated heavy lifting" means exactly this — carrying undifferentiated work yourself just piles operational debt onto your future self. It's the same sentence as [[fode-1|Ch. 1]]'s "Type A engineer first" in different words: the moment to reinvent the wheel is forced by scale, not used to prove technical chops.

As an aside, "buy" doesn't only mean "buy a fully commercial product". It's a spectrum: community open source → commercialised open source (a managed version where someone carries operations for you) → fully managed proprietary product. The further right, the more you pay to shed operational burden — another trade-off.

## Cost has two ledgers: TCO and TOCO

You can't choose technology without cost, but the book reminds you there's more than one ledger.

| | TCO (total cost of ownership) | TOCO (total opportunity cost of ownership) |
|---|---|---|
| Asks | How much does using this cost? | Being tied to this and not choosing others — what did you give up? |
| Countable | Licences, machines, people, operations | — |
| Easily missed | Hidden integration and operational cost | Lock-in, no way back, missing better options |

Most people count only **TCO** (the visible bill), but the book points out the more invisible and often more expensive one is **TOCO** — choosing A means giving up B, C and D, and if A locks you in, the cost of switching later climbs until there's no way back. It's the cost face of the reversibility in [[fode-3|Ch. 3]]: **an irreversible choice's real price isn't on the invoice, it's in "can't change your mind".**

Add the book's constant emphasis on **FinOps** — cloud cost isn't a number fixed once the contract is signed; it's a variable to keep designing for and watching. Pay-as-you-go is flexible, but it also means the bill grows with every bad query you write.

## Reflections

### "Architecture before tools" is the sentence I most needed to shout at myself this half-year

I've written a whole row of tool notes ([[airflow-intro|Airflow]], [[spark-intro|Spark]], [[kafka-intro|Kafka]], [[dbt-intro|dbt]]) and I know the urge well: "learn a flashy tool and badly want somewhere to use it". This chapter nails the order down: **articulate the architectural trade-off first; only then does the tool come on stage.** It's fundamentally the same nerve as my [[pain-before-power|confirm the pain first, then bring the heavy weapons]] post — without first confirming the pain and the constraints, the trendiest tool is used for the sake of using it. Now, when I review a technology choice, my first line is "which trade-off are we choosing this to resolve", not "how powerful is it".

### Where I've placed my bets is almost all on the "immutable foundation"

Looking back, the choices I feel most at ease with all sit in the immutable layer: insisting on **SQL** as the transformation language, spreading raw data on **object storage**, guarding **an immutable, replayable Bronze** in [[medallion-architecture|Medallion]]. Those will probably still be here in ten years. Conversely, plenty of the frameworks I once thought "we have to use" are no longer maintained — the mercy is that I never let them seep into the core of the system. **Bet on stable things and make changeable things disposable** is a principle I trust more every year.

### Build vs buy: I've fallen flat "building a wheel to prove I could"

The "default to off-the-shelf" rule I only truly believed after paying tuition. Early on I hand-built a whole thing for a feature that was actually purchasable — hugely satisfying at the time, and six months later an operational burden nobody wanted to touch. The book's "undifferentiated heavy lifting" cuts it precisely: **the cost of building is never the moment you write it, it's every year of maintenance after.** Now my default is buy / managed, and I only build when "this really is where we pull ahead" — and such places are far fewer than engineers imagine.
