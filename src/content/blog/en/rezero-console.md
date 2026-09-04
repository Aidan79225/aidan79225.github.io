---
title: "The Host and Operations Consoles: There Is No Such Thing as \"the Back Office\""
date: 2026-07-27
category: tech
description: "First operations chapter: who does what during a live stream — the host reads data to keep the rhythm, the assistant works the controls, operations owns rounds and allocation, support cleans up, engineers hold admin. Five roles, five interfaces, and one internal-tooling philosophy: how much you invest in a UI equals how certain the requirement is."
tags:
  - war-story
  - live-commerce
  - internal-tools
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 9
comments: true
draft: false
translationOf: rezero-console
---
The first eight chapters were the skeleton of a transaction: comments in, stock held, money collected, goods out the door. This one switches viewpoint — **what the people standing in the live-stream room actually see**. Before talking about "the back office", here's the conclusion: this system **has no such thing as a back office**. It has a set of role interfaces, and what each person opens does only the thing they're doing right now.

## A live stream is a performance

Start with who does what. The host is in front of the camera calling keys, quoting prices, chasing the supplier for more stock — **they have no time to operate any platform**. Every platform action goes to the **live assistant**: product information, opening and closing bidding, adding stock. But the host can't perform blind: how many units sold, who's ordering, how many people are watching — **they need that live, or they can't hold the stream's rhythm** — something sells out and they add more on the spot; the room goes cold and they switch product fast.

In theatre terms: **the actor reads the teleprompter, the stage manager works the machinery.** That division decides directly how the interfaces are cut:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 302" role="img" aria-label="A panorama of five roles and five interfaces. The host's interface is view-only: the comment stream with blocklist tags, units sold and who ordered, and the Facebook viewer count, used to read the stream's rhythm. The live assistant has the console: entering product information ahead of time or on the fly, opening, closing and re-opening bidding, and adding stock. Operations has its own separate pages: closing a round, shipping fee settings, goods-in records and allocation. Support's interface adjusts and clears carts and does multiple bindings. Engineers use Django admin as a safe console, for scheduling Celery tasks and as a lab for rough drafts of unusual requests. Underneath all five sits one set of facts and APIs — the same data through five different windows." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="16" y="20" width="104" height="216" rx="8" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.4"/>
    <text x="68" y="40" fill="#9b6ff0" font-size="8.4" text-anchor="middle" font-weight="bold">Host</text>
    <text x="68" y="53" fill="#9aa4b2" font-size="6.2" text-anchor="middle">view only, no actions</text>
    <text x="68" y="80" fill="#e6e6e6" font-size="6.4" text-anchor="middle">comment stream</text>
    <text x="68" y="92" fill="#e6e6e6" font-size="6.4" text-anchor="middle">(with blocklist tags)</text>
    <text x="68" y="116" fill="#e6e6e6" font-size="6.4" text-anchor="middle">units sold</text>
    <text x="68" y="128" fill="#e6e6e6" font-size="6.4" text-anchor="middle">who ordered</text>
    <text x="68" y="152" fill="#e6e6e6" font-size="6.4" text-anchor="middle">viewer count</text>
    <text x="68" y="164" fill="#9aa4b2" font-size="5.8" text-anchor="middle">(FB API)</text>
    <text x="68" y="210" fill="#9b6ff0" font-size="6.2" text-anchor="middle" font-weight="bold">reads the rhythm</text>
    <rect x="130" y="20" width="104" height="216" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="182" y="40" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">Assistant</text>
    <text x="182" y="53" fill="#9aa4b2" font-size="6.2" text-anchor="middle">the live console</text>
    <text x="182" y="80" fill="#e6e6e6" font-size="6.4" text-anchor="middle">enter product info</text>
    <text x="182" y="92" fill="#9aa4b2" font-size="5.8" text-anchor="middle">(ahead or on the fly)</text>
    <text x="182" y="116" fill="#e6e6e6" font-size="6.4" text-anchor="middle">open · close bidding</text>
    <text x="182" y="128" fill="#e6e6e6" font-size="6.4" text-anchor="middle">re-open</text>
    <text x="182" y="152" fill="#e6e6e6" font-size="6.4" text-anchor="middle">add stock</text>
    <text x="182" y="210" fill="#d6a45c" font-size="6.2" text-anchor="middle" font-weight="bold">acts for the host</text>
    <rect x="244" y="20" width="104" height="216" rx="8" fill="#233528" stroke="#54b890" stroke-width="1.4"/>
    <text x="296" y="40" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">Operations</text>
    <text x="296" y="53" fill="#9aa4b2" font-size="6.2" text-anchor="middle">its own pages</text>
    <text x="296" y="80" fill="#e6e6e6" font-size="6.4" text-anchor="middle">close a round</text>
    <text x="296" y="104" fill="#e6e6e6" font-size="6.4" text-anchor="middle">shipping fees</text>
    <text x="296" y="128" fill="#e6e6e6" font-size="6.4" text-anchor="middle">goods-in</text>
    <text x="296" y="152" fill="#e6e6e6" font-size="6.4" text-anchor="middle">allocation</text>
    <text x="296" y="210" fill="#54b890" font-size="6.2" text-anchor="middle" font-weight="bold">owns round rhythm</text>
    <rect x="358" y="20" width="104" height="216" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="410" y="40" fill="#4f6df5" font-size="8.4" text-anchor="middle" font-weight="bold">Support</text>
    <text x="410" y="53" fill="#9aa4b2" font-size="6.2" text-anchor="middle">handles exceptions</text>
    <text x="410" y="80" fill="#e6e6e6" font-size="6.4" text-anchor="middle">adjust carts</text>
    <text x="410" y="104" fill="#e6e6e6" font-size="6.4" text-anchor="middle">clear carts</text>
    <text x="410" y="128" fill="#e6e6e6" font-size="6.4" text-anchor="middle">multi-binding</text>
    <text x="410" y="210" fill="#4f6df5" font-size="6.2" text-anchor="middle" font-weight="bold">catches the residue</text>
    <rect x="472" y="20" width="96" height="216" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="520" y="40" fill="#e6e6e6" font-size="8.4" text-anchor="middle" font-weight="bold">Engineers</text>
    <text x="520" y="53" fill="#9aa4b2" font-size="6.2" text-anchor="middle">Django admin</text>
    <text x="520" y="80" fill="#e6e6e6" font-size="6.4" text-anchor="middle">safe console</text>
    <text x="520" y="104" fill="#e6e6e6" font-size="6.4" text-anchor="middle">Celery tasks</text>
    <text x="520" y="128" fill="#e6e6e6" font-size="6.4" text-anchor="middle">odd requests</text>
    <text x="520" y="140" fill="#9aa4b2" font-size="5.8" text-anchor="middle">(rough-draft lab)</text>
    <text x="520" y="210" fill="#9aa4b2" font-size="6.2" text-anchor="middle" font-weight="bold">uncertainty lives here</text>
    <rect x="16" y="252" width="552" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="292" y="269" fill="#9aa4b2" font-size="7.4" text-anchor="middle">One set of facts and APIs underneath — the same data through five different windows</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">There is no such thing as "the back office": what each role opens does only what they're doing right now.</figcaption>
</figure>

## The host dashboard: data is a sense of rhythm

The host's screen has no button worth pressing — it's the sole customer of that WebSocket from [[rezero-stack|the opening move]]: comments pushed live, how many units sold, who ordered, the viewer count pulled from the Facebook API. All of it **looking only**.

Two details worth pausing on:

- **The comment stream carries blocklist tags.** At the system level, a blocklisted person's comments aren't processed by the batch at all; at the interface level, the host **can see** that this person is blocklisted — which gives live human judgment (skip this one out loud, don't hold stock) real-time intelligence. Risk control isn't only a filter, it's **an intelligence card handed to the decision-maker**, and that thread (along with how the batch checks the blocklist quickly) gets picked up in [[rezero-risk|the risk chapter]].
- **The data is a mash-up of our own facts and the platform's.** Units sold and who ordered come from our ledger, the viewer count from the Facebook API — the host doesn't care about the source, they care whether the room is hot and whether goods are moving. A dashboard is organised by **the user's question**, not by where the data comes from — the same thing I later wrote in the [[obs-grafana|Grafana]] series as "one panel answers one question", except back then I had none of the vocabulary.

## Assistant and operations: two rhythms of a console

The assistant's dashboard is the live console, with buttons that follow the stream's minute-by-minute rhythm: product information (**supporting both entry in advance and opening on the fly** — a host who gets goods on set wants to sell them, and the system doesn't bet on "there'll be time to fill it in first"), open bidding, close bidding, re-open ([[rezero-comment-order|the re-call]]'s UI shell), add stock — the person retrying against that hot row in [[rezero-inventory|the stock chapter]] is the assistant.

Operations' pages are a **separate set**, on a per-round rhythm: closing a round ([[rezero-inventory|the big clean]]), shipping fee settings, goods-in records, [[rezero-fulfillment|allocation]]. Both are "operating", but live operation and round management were split into two interfaces — because the **rhythm** of the operations differs: one is counted in seconds and races the live moment, the other in days and manages a round opening and closing. Mix them into one screen and the fast one gets blocked by the slow one.

## admin: a lab for uncertain requirements

The engineers' own interface is Django admin, and **only engineers use it** — the first reason is plain: touching the DB directly is too dangerous, and admin is a layer of safe console you can't fat-finger, convenient for managing Celery task schedules on the side.

The second reason deserves its own section: **admin is a lab for uncertain requirements**. A request arrives, building it properly takes time, and nobody is sure it's a real requirement — the two most expensive mistakes being "spend two weeks on a beautiful interface nobody uses" and "refuse outright and miss a real one". The third path we took: **stitch a not-very-usable rough draft out of admin features** and keep the requirement alive:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 196" role="img" aria-label="A maturity spectrum of interfaces, running left to right from uncertain to certain requirements. First stop: an admin rough draft — ugly but cheap, usually driven by an engineer on the requester's behalf, where a requirement proves itself; being complained about as hard to use is its graduation application. Second stop: a purpose-built role interface, where proven requirements live and being usable is standard. Third stop: a dashboard, for the most frequent and most live needs, where even the actions are removed and only looking remains. The conclusion at the bottom: how much you invest in an interface equals how certain the requirement is." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rc9" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <line x1="30" y1="30" x2="550" y2="30" stroke="#3a4154" stroke-width="1.2"/>
    <text x="60" y="20" fill="#9aa4b2" font-size="7" text-anchor="start">requirement: uncertain</text>
    <text x="520" y="20" fill="#9aa4b2" font-size="7" text-anchor="end">certain · high-frequency</text>
    <rect x="30" y="48" width="150" height="72" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="105" y="68" fill="#e6e6e6" font-size="7.8" text-anchor="middle" font-weight="bold">admin rough draft</text>
    <text x="105" y="84" fill="#9aa4b2" font-size="6.2" text-anchor="middle">ugly but cheap · engineers drive it</text>
    <text x="105" y="98" fill="#9aa4b2" font-size="6.2" text-anchor="middle">requirements prove themselves</text>
    <line x1="180" y1="84" x2="212" y2="84" stroke="#54b890" stroke-width="1.2" marker-end="url(#rc9)"/>
    <text x="196" y="72" fill="#54b890" font-size="5.8" text-anchor="middle">complaint =</text>
    <text x="196" y="106" fill="#54b890" font-size="5.8" text-anchor="middle">graduation</text>
    <rect x="216" y="48" width="150" height="72" rx="7" fill="#233528" stroke="#54b890" stroke-width="1.3"/>
    <text x="291" y="68" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">purpose-built role UI</text>
    <text x="291" y="84" fill="#9aa4b2" font-size="6.2" text-anchor="middle">proven requirements live here</text>
    <text x="291" y="98" fill="#9aa4b2" font-size="6.2" text-anchor="middle">usable by default</text>
    <line x1="366" y1="84" x2="398" y2="84" stroke="#54b890" stroke-width="1.2" marker-end="url(#rc9)"/>
    <text x="382" y="72" fill="#54b890" font-size="5.8" text-anchor="middle">high-freq</text>
    <text x="382" y="106" fill="#54b890" font-size="5.8" text-anchor="middle">enough</text>
    <rect x="402" y="48" width="150" height="72" rx="7" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.3"/>
    <text x="477" y="68" fill="#9b6ff0" font-size="7.8" text-anchor="middle" font-weight="bold">dashboard</text>
    <text x="477" y="84" fill="#9aa4b2" font-size="6.2" text-anchor="middle">the actions are gone</text>
    <text x="477" y="98" fill="#9aa4b2" font-size="6.2" text-anchor="middle">only looking remains</text>
    <text x="290" y="164" fill="#e6e6e6" font-size="8.6" text-anchor="middle" font-weight="bold">How much you invest in a UI = how certain the requirement is</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">A rough draft isn't shameful, it's strategy: a real requirement files its own graduation application by complaining, and a fake one dies cheaply inside admin.</figcaption>
</figure>

A real requirement gets complained about as "this is so hard to use" — **the complaint is the graduation application**, and it's worth promoting to a purpose-built interface; a fake one dies quietly inside admin at almost no cost. Looking back, the other half of "a dozen features shipped a day" is right here: not every feature was built well, but **every feature cost exactly what it was worth**.

## What a rebuild would add

Almost everything here survives a rebuild — the role split, the maturity spectrum, separating looking from doing are all right. Two additions:

1. **Audit logs for every back-office operation.** Goods-in and allocation already had records, but opening and closing bidding, adding stock and changing shipping fees should all leave a trace too (who, when, what changed) — it's the evidence chain for the reconciliation chapter and the foundation for the permissions chapter.
2. **Restocking through the adjustments ledger.** The adjustments ledger from [[rezero-inventory|the stock chapter]] — whose beneficiary is exactly that assistant standing in the live room hitting a button that fails and having to hit it again.

## Reflections

### Your internal users are your heaviest power users

An external customer uses your system for three minutes a day; an assistant or an operator uses it **for eight hours**. A customer who hits friction leaves; when an assistant hits friction, the host's rhythm breaks on camera. Every second of latency and every mis-click in an internal tool is amplified into real money in the live room. This team treated internal tools as products from day one ([[rezero-identity|the identity chapter]] covered where that came from), and what I've come to believe since is: **the quality of your internal tools decides not "whether staff are happy" but how fast your whole operation can react** — it's the conduction speed of the organisation's nervous system.

### A rough draft is strategy, not shame

What the admin lab taught me: building a product is fundamentally about **managing uncertainty**, and an interface is one of the most expensive ways to place a bet. Making every requirement beautiful means betting heavily on every unproven hypothesis; the lab lets the size of the bet follow the evidence — and a rough draft's awkwardness isn't a quality problem, it's **a graduation bar left there deliberately**: only a real requirement is worth tolerating awkwardness to keep using. An engineer's pride often can't stand shipping a rough draft — but roughness that fits the moment is more professional than polish that doesn't.

### Designing for looking and designing for doing are two different crafts

The host's screen has not one button and the assistant's is all buttons — that's not a coincidence, it's **the task deciding the interface**: an interface for looking wants to be understood at a glance (information density, immediacy, no interruptions), and an interface for doing wants to prevent mistakes (explicit actions, predictable results, guardrails). Most unusable back offices are sick with exactly this: the two mashed together, so people who came to look navigate a wall of buttons and people who came to act hunt for the entrance inside a chart. The test for splitting an interface was never "are these features related?", it's **"what is this person's task right now?"** — one screen, one task, one rhythm.
