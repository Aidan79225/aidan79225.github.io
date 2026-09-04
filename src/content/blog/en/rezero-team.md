---
title: "Six Engineers Running at the Speed of Twenty"
date: 2026-08-01
category: tech
description: "Who built the system from the last seventeen chapters? Six engineers, a CTO working full-time as a PM, and a bidding squad I never knew well; one failed outsourcing, a process with no estimates and no demos, a test shape that follows the architecture — and where the speed really came from: not heroics, but low friction."
tags:
  - war-story
  - live-commerce
  - engineering-management
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 18
comments: true
draft: false
translationOf: rezero-team
---
The system's story closed with the last chapter; the remaining chapters are about the people who built it, and how all of it ended. Start with the most basic question: the system in the previous seventeen chapters — the FSM, three-layer orders, payment fact tables, an empire on one VM — **who built it?**

On paper: six engineers. The real answer is harsher: **the commerce line was four engineers.**

## The line-up: two lines, seven people

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 250" role="img" aria-label="The team's organisation chart. On the left, the commerce line: the backend lead, meaning the author, one more backend engineer, two front-end engineers, plus a CTO working full-time as a PM and not writing code — an engineering output of four engineers. On the right, the bidding line: one backend, one front end and a dedicated PM, operating independently, with the author noting he never knew this line well. Below, a dashed box: during the single-backend early period there were one or two contractors, and no outsourcing afterwards. At the bottom: a fully remote team, and the split line equals the organisational line, foreshadowing the next chapter on microservices." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="24" y="36" width="300" height="130" rx="8" fill="#1f2330" stroke="#9ccc65" stroke-width="1.3"/>
    <text x="174" y="56" fill="#9ccc65" font-size="8" text-anchor="middle" font-weight="bold">the commerce line</text>
    <rect x="40" y="68" width="128" height="26" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="104" y="85" fill="#e6e6e6" font-size="6.6" text-anchor="middle">me (backend lead)</text>
    <rect x="180" y="68" width="128" height="26" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="244" y="85" fill="#e6e6e6" font-size="6.6" text-anchor="middle">backend ×1</text>
    <rect x="40" y="102" width="128" height="26" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="104" y="119" fill="#e6e6e6" font-size="6.6" text-anchor="middle">front end ×2</text>
    <rect x="180" y="102" width="128" height="26" rx="5" fill="#262b3a" stroke="#d6a45c" stroke-width="1.1"/>
    <text x="244" y="114" fill="#d6a45c" font-size="6.4" text-anchor="middle">CTO: full-time PM</text>
    <text x="244" y="124" fill="#9aa4b2" font-size="5.8" text-anchor="middle">wrote no code during commerce</text>
    <text x="174" y="152" fill="#9aa4b2" font-size="6.4" text-anchor="middle">engineering output = 4 engineers</text>
    <rect x="352" y="36" width="204" height="130" rx="8" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.3"/>
    <text x="454" y="56" fill="#9b6ff0" font-size="8" text-anchor="middle" font-weight="bold">the bidding line (separate)</text>
    <rect x="368" y="68" width="172" height="24" rx="5" fill="#262b3a" stroke="#9b6ff0" stroke-width="1"/>
    <text x="454" y="84" fill="#e6e6e6" font-size="6.6" text-anchor="middle">backend ×1 · front end ×1</text>
    <rect x="368" y="100" width="172" height="24" rx="5" fill="#262b3a" stroke="#9b6ff0" stroke-width="1"/>
    <text x="454" y="116" fill="#e6e6e6" font-size="6.6" text-anchor="middle">dedicated PM ×1</text>
    <text x="454" y="152" fill="#9aa4b2" font-size="6.4" text-anchor="middle">honestly: I never knew this line</text>
    <rect x="24" y="182" width="300" height="28" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1" stroke-dasharray="5 4"/>
    <text x="174" y="200" fill="#9aa4b2" font-size="6.4" text-anchor="middle">(early) 1–2 contractors — a tourniquet for the single-backend period</text>
    <text x="290" y="238" fill="#e6e6e6" font-size="7" text-anchor="middle">fully remote · the split line = the org line (foreshadowing the next chapter)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Two product lines, two squads. How the microservices later split was already drawn in this diagram.</figcaption>
</figure>

Get the honest part out of the way first: **I never really knew the bidding system.** It ran independently on one backend, one front end and a dedicated PM, and was almost a separate world from commerce — which is why across seventeen chapters bidding appeared exactly once (the [[rezero-cart-order|state machine]] ripped out by the hosts, and that second-hand). A war story only covers the battles you were at, and all I can give this line is a box on an org chart.

On the commerce side the composition is interesting: **the CTO wrote no code during the commerce period and worked full-time as a PM.** He was the requirements funnel — every want from the business, the hosts and operations passed through his translation before becoming a task. Why did [[rezero-ops|#15]]'s midnight calls go to him? The picture is complete now: not only because he was most senior, but because **he was the single point of contact for the product**, so even a scattered wish had a definite recipient.

So "six engineers running at the speed of twenty", unpacked, is: two engineers on bidding, four on commerce — **four engineers who built everything the previous seventeen chapters describe.**

## The growth arc: from one person to earning the right to talk process

The team didn't start out like that. At the very beginning, the backend was just me.

The single-person gap was tourniqueted with **outsourcing** — and there's a failure here worth telling in full. We contracted **coupons** out to a contractor: the module looked cleanly bounded, the spec was writable, textbook "suitable for outsourcing". Two months later he said he had no more time to continue; I opened the PR and the quality was poor — **we abandoned the entire PR**, and two months went to zero.

In hindsight the mistake was at step one: coupons *look* independent and are *actually* one of the most semantically loaded areas in the whole system — [[rezero-promotion|#11]] covered how deeply they interlock with the amount columns in carts, orders and payments, and how correctness with money is an accounting property. **Functionally independent isn't semantically independent; measure an outsourcing boundary by semantic coupling, not by feature boundaries.** Once other full-timers arrived we never outsourced again.

The day the second backend engineer was hired, I started leading. A lead on a small team has no option to leave the production line — on top of **sustaining high output** came three checkpoints: **technical breakdown of tasks** (the entrance to work), **review** (the exit of code), and **technology choices** (the system's boundary). How well the last checkpoint was held has a report card visible across the whole series: [[rezero-stack|#2]]'s stack list, five boring components, **which never grew in eighteen months** — nobody ever smuggled a new toy in.

## Process: order the queue, don't schedule it

The core of the speed isn't the people (though they matter), it's the shape of the process. What we ran was internally called **Adaptive Agile**, and unpacked it looks like this:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="The development process. On the left is an ordered task queue in Notion with states pending, in progress, done, cancelled and blocked, from which engineers pull off the top. In the middle are the five stations each task passes: research, where the implementer writes the task out fully and designs the solution, then design, development, testing and review, with merge meaning release. On the right: fully remote, with a daily sync asking three questions — what did you do yesterday, what will you do today, what is blocked. At the bottom: no estimates, no sprints, no demos — order the queue, don't schedule it." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="24" y="32" width="150" height="150" rx="8" fill="#1f2330" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="99" y="52" fill="#d6a45c" font-size="7.2" text-anchor="middle" font-weight="bold">Notion queue (ordered)</text>
    <rect x="38" y="62" width="122" height="18" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="99" y="74" fill="#e6e6e6" font-size="6" text-anchor="middle">task 1 (top priority)</text>
    <rect x="38" y="84" width="122" height="18" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="99" y="96" fill="#e6e6e6" font-size="6" text-anchor="middle">task 2</text>
    <rect x="38" y="106" width="122" height="18" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="99" y="118" fill="#e6e6e6" font-size="6" text-anchor="middle">task 3⋯</text>
    <text x="99" y="142" fill="#9aa4b2" font-size="6" text-anchor="middle">pending / in progress / done</text>
    <text x="99" y="154" fill="#9aa4b2" font-size="6" text-anchor="middle">cancelled / blocked</text>
    <text x="99" y="172" fill="#9aa4b2" font-size="6.2" text-anchor="middle">CTO orders it; engineers pull off the top</text>
    <line x1="174" y1="100" x2="204" y2="100" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 200 96 L 206 100 L 200 104 Z" fill="#9aa4b2"/>
    <text x="189" y="92" fill="#9aa4b2" font-size="6" text-anchor="middle">pull</text>
    <rect x="206" y="40" width="88" height="30" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="250" y="53" fill="#54b890" font-size="6.6" text-anchor="middle" font-weight="bold">research</text>
    <text x="250" y="64" fill="#9aa4b2" font-size="5.6" text-anchor="middle">implementer writes the task out</text>
    <rect x="206" y="78" width="88" height="24" rx="5" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="250" y="94" fill="#e6e6e6" font-size="6.6" text-anchor="middle">design</text>
    <rect x="206" y="110" width="88" height="24" rx="5" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="250" y="126" fill="#e6e6e6" font-size="6.6" text-anchor="middle">build</text>
    <rect x="206" y="142" width="88" height="24" rx="5" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="250" y="158" fill="#e6e6e6" font-size="6.6" text-anchor="middle">test</text>
    <rect x="206" y="174" width="88" height="24" rx="5" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="250" y="190" fill="#e6e6e6" font-size="6.6" text-anchor="middle">review</text>
    <line x1="294" y1="186" x2="330" y2="186" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 326 182 L 332 186 L 326 190 Z" fill="#9aa4b2"/>
    <rect x="332" y="172" width="110" height="28" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.3"/>
    <text x="387" y="190" fill="#54b890" font-size="6.8" text-anchor="middle" font-weight="bold">merge = release</text>
    <rect x="332" y="40" width="224" height="98" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/>
    <text x="444" y="60" fill="#e6e6e6" font-size="6.8" text-anchor="middle" font-weight="bold">fully remote · three questions daily</text>
    <text x="444" y="82" fill="#9aa4b2" font-size="6.4" text-anchor="middle">what did you do yesterday</text>
    <text x="444" y="100" fill="#9aa4b2" font-size="6.4" text-anchor="middle">what will you do today</text>
    <text x="444" y="118" fill="#9aa4b2" font-size="6.4" text-anchor="middle">what is blocked</text>
    <text x="290" y="234" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-weight="bold">no estimates · no sprints · no demos — order the queue, don't schedule it</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">One ordered queue, one five-station flow, one loop where merge means release — that shape is what a dozen features a day comes out of.</figcaption>
</figure>

A few designs worth magnifying:

**Order the queue, don't schedule it.** Tasks live in Notion in order, and engineers pull in order. No estimates, no sprint planning, no demos. Scrum's rituals buy you *prediction* — when will it be done, how much does this sprint commit to; we didn't buy prediction, we just maintained an ordered queue. **Prioritisation centralised (ordered through the CTO's funnel), execution decentralised (engineers pulling for themselves)** — for a team of four, prediction's value approaches zero while ritual's cost is very real, and that arithmetic was done clearly.

**The spec is produced by the implementer.** The flow's first station is "research": the engineer who takes a task writes the task out fully and designs the solution before building. It isn't a PM writing a spec and handing it to engineers — **the person writing the spec is the person writing the code**, so translation loss is zero, and the lead's breakdown and review are the counterweight to that freedom.

**Release is merge.** [[rezero-stack|#2]]'s CI/CD closes the loop here: a release isn't an event requiring a meeting, it's the natural consequence of a merge. Half the rhythm of a dozen features a day comes from that loop.

**Fully remote, with three questions daily**: what did you do yesterday, what will you do today, what's blocked. Fully remote was a rare species back then; what held it together was everything above — an ordered queue makes "what to do" unambiguous, fully written tasks put knowledge into text, and the three questions surface what's stuck.

## The quality line: test shape follows architecture

Speed needs brakes. Our testing strategy went through one deliberate turn worth telling:

We started with plenty of unit tests — and then I noticed **something was off: too much mocking, and the tests had lost touch with reality.** This system's centre of correctness is in the data ([[rezero-comment-order|DB-as-validator]], [[rezero-payment|fact tables]], [[rezero-reconciliation|derive on read]]), so a unit test that mocks the DB has mocked away the system's semantics, and a green light like that persuades nobody. The textbook test pyramid was invented for systems whose logic lives in objects; **our logic lives in the data, so the centre of gravity of testing should move there too.**

So we later added a lot of **integration tests: mostly unmocked, asserting directly on what got written to the DB** — writing "after this operation, the tables should look like this" as assertions. The most expensive **e2e tests bought exactly two paths: payments and invoicing** — the places where money crosses the system boundary, with [[rezero-payment|third-party]] terrain teaching the lesson again: an e2e test sometimes goes red because of the third party itself, **but you look at it carefully every single time**, because that red light might not be a broken test, it might be the real world talking.

The review gate is simple: unit and integration must pass. Matters of form never reach a human brain — **ruff and mypy mechanise style and types**, with an AI review added on the front end; humans spend their time only where machines can't help: semantics. My own reviews have a fixed opening move: **read the tests first.** A test is a solidified spec — what the research stage wrote as "what this task must achieve" ends up as an assertion; reading the tests first means reading the author's understanding of correctness first, then checking whether the implementation delivers it.

## The rebuild

The process itself barely changes — it's the prototype I've reproduced on every team since. The one thing that genuinely changes is that failed outsourcing: **manage contractors with your own process.** What the contractor got was "one module, two months, see you then"; a rebuild would require **a daily sync, and my involvement at every stage — research, design, build, test** — so I know his state at all times rather than finding out two months later. Put plainly, it's applying [[rezero-ops|#15]]'s monitoring philosophy to people: the daily sync is a heartbeat, the stage gates are a pipeline, and knowing the state is observability. **What's cheap about outsourcing is the salary, not the management cost**; the management we saved back then was paid back later as two months of sunk cost.

One more bill goes on the tab here: this kind of speed also has a price. A feature wished for at midnight, shipped the following week, and unused for three months — that story, and what it taught me, is saved for the finale.

## Reflections

**Speed is structural, not heroic.** Four engineers shipping features daily didn't come from overtime, it came from low friction: near-zero ritual, merge equals release, order the queue rather than schedule it, zero translation of specs. To reproduce this team's speed, don't look for four superhumans — dismantle those four frictions first. Speed is a function of process shape; people are the coefficient and the shape is the exponent.

**The essence of a checkpoint is letting other people go fast.** A lead's three checkpoints — breakdown at the entrance, review at the exit, technology choice at the boundary — look like control and act like liberation: because someone holds the direction at the entrance, catches quality at the exit, and blocks toys at the boundary, everyone in between can run flat out. Good brakes are what let a car be driven fast; good checkpoints are what let a team dare to ship daily.

**Seeing your own boundary is a kind of honesty too.** Same company, seven people, and to this day I can't give you details of the bidding line — the walls between bodies of knowledge are far lower and far nearer than you'd think. That looked like a natural division of labour at the time, and now it reads as foreshadowing: how the organisation splits is how the system grows, and where the wall is built is where the split line falls.

And this fast-moving team had one thing nobody saw coming: **its end was nearer than anyone thought.** Next chapter, the day development paused.
