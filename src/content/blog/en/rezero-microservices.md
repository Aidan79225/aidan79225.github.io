---
title: "Microservices for Three People: After Development Was Paused"
date: 2026-08-02
category: tech
description: "One day the CTO told every engineer: development is paused. A month later the team was three people. Then we split into microservices — not for architectural beauty but to survive: build a new house for the new business, move bidding out, demote the old monolith in place; migration with downtime, one shared JWT secret, one VM with two docker compose files. Splitting is about decoupling, not distributing."
tags:
  - war-story
  - live-commerce
  - microservices
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 19
comments: true
draft: false
translationOf: rezero-microservices
---
[[rezero-team|The last chapter]] ended by saying this team's end was nearer than anyone thought. This chapter starts on that day.

## That day, and a month later

One day, the CTO told every engineer: **development is paused.** The contract with the third party was being renegotiated; it might lead to redundancies; he would go and fight for more resources for everyone.

The political details are saved for the finale; this chapter needs only two facts. First: **a month later the team was three people** — me, one front-end engineer, and the CTO. Second: **the storefront was still up, but there were no customers left**, and the people logging in were mostly internal. That system from the previous eighteen chapters — the peaks, the FSM, the four windows during a stream — was still running, just gone quiet.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 208" role="img" aria-label="A timeline from the peak to the split, in five nodes. At the peak: a team of seven shipping daily. That day: the CTO announces development is paused, the contract is being renegotiated and redundancies are possible. A month later: three people remain — the author, one front-end engineer and the CTO. New direction: a purchasing system that consumes external orders. The split: bidding moves out, the member service is promoted, and the monolith is demoted in place. At the bottom: the storefront is still up, but there are no customers." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="40" y1="110" x2="548" y2="110" stroke="#3a4154" stroke-width="1.4"/>
    <path d="M 544 106 L 550 110 L 544 114 Z" fill="#3a4154"/>
    <circle cx="72" cy="110" r="4" fill="#54b890"/>
    <text x="72" y="76" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">the peak</text>
    <text x="72" y="92" fill="#9aa4b2" font-size="6.2" text-anchor="middle">seven people · shipping daily</text>
    <circle cx="188" cy="110" r="4" fill="#e05a7d"/>
    <text x="188" y="62" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">that day</text>
    <text x="188" y="78" fill="#e6e6e6" font-size="6.2" text-anchor="middle">CTO: development is paused</text>
    <text x="188" y="92" fill="#9aa4b2" font-size="6.2" text-anchor="middle">contract renegotiated · possible layoffs</text>
    <circle cx="304" cy="110" r="4" fill="#d6a45c"/>
    <text x="304" y="140" fill="#d6a45c" font-size="7" text-anchor="middle" font-weight="bold">a month later</text>
    <text x="304" y="156" fill="#e6e6e6" font-size="6.2" text-anchor="middle">three people left</text>
    <text x="304" y="170" fill="#9aa4b2" font-size="6.2" text-anchor="middle">me · one front end · the CTO</text>
    <circle cx="420" cy="110" r="4" fill="#4f6df5"/>
    <text x="420" y="76" fill="#4f6df5" font-size="7" text-anchor="middle" font-weight="bold">new direction</text>
    <text x="420" y="92" fill="#9aa4b2" font-size="6.2" text-anchor="middle">purchasing from external orders</text>
    <circle cx="516" cy="110" r="4" fill="#9b6ff0"/>
    <text x="516" y="140" fill="#9b6ff0" font-size="7" text-anchor="middle" font-weight="bold">the split</text>
    <text x="516" y="156" fill="#9aa4b2" font-size="6.2" text-anchor="middle">bidding out · monolith demoted</text>
    <text x="290" y="196" fill="#9aa4b2" font-size="6.8" text-anchor="middle">Background: the storefront is still up, but there are no customers</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The microservices weren't split at the peak — they were split when only three people were left. From here on, the motive is nothing like the textbook's.</figcaption>
</figure>

That background has to be nailed down first, because it overturns every textbook answer about why you split into microservices. It wasn't traffic large enough to need independent scaling, and it wasn't a team large enough to need decoupled collaboration — **precisely the opposite: people had shrunk to three, and splitting was how three people could afford to keep the coming days alive.**

## A new way to live: purchasing

The company's new direction was a **purchasing system** — but this time the orders weren't our own.

Why was the original purchasing easy? Because orders came from our own system, along that path in [[rezero-fulfillment|#8]]: we defined the data format and controlled the timing. The new situation: **orders came from a third-party company's software**, exported by them and imported by us, in their format and on their rhythm — we had to design a way of living alongside an external system.

The actual interface is endearingly plain: **upload an Excel file by hand.** They export orders from their software, the file comes over, and our system consumes it; there would be **multiple exports and multiple imports**. What held that flow together was one crucial agreement: **they guaranteed every exported order carried a unique key — and we used it directly as the idempotency condition.** Import the same file again? It upserts away, unnoticed. That's the idempotency key's third appearance in this system: [[rezero-comment-order|comment dedupe]] via source+message id, [[rezero-payment|payments]] through fact tables idempotent by nature, and now external orders through their unique key — and what it bought is best summed up in a line from back then: **"we don't care how often he exports."** Idempotency turned frequency into somebody else's freedom, and saved us even the coordination meeting.

With orders comes knowing the demand; how to purchase from there is the new system's own business. And some of what it needed — products, users, permissions — was sitting inside that quiet monolith. **So the reason to split appeared.**

## The split in practice: build, move, demote

The textbook microservice split has a standard script called the **strangler fig**: stand a facade in front of the monolith, extract one bounded context at a time into a new service, move the data via dual writes, CDC and gradual traffic shifting **with no downtime**, and repeat until the monolith is strangled — then delete it and celebrate. That elegant toolbox rests on two implicit premises: **traffic can't stop, and the monolith must eventually die.** In our situation neither premise held — so what we actually did was three completely different moves:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 300" role="img" aria-label="The architecture after the split. One VM holds two docker compose groups. The old compose: the commerce service, the former monolith demoted in place, with its own database, annotated as still up and used internally. The new compose: a brand-new purchasing service with a new database, the bidding service moved out of the monolith with its own database, and a member service handling authentication and permissions with its own database. External third-party software enters purchasing as a hand-uploaded Excel file, using a unique key for idempotency. Services talk over REST with JWT authentication sharing one secret key. At the bottom: separate databases, one VM and two compose files — we split coupling, not machines." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="16" y="30" width="548" height="230" rx="10" fill="#1f2330" stroke="#3a4154" stroke-width="1.3"/>
    <text x="552" y="46" fill="#9aa4b2" font-size="7" text-anchor="end">the same VM</text>
    <rect x="32" y="52" width="180" height="192" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="6 4"/>
    <text x="122" y="70" fill="#9aa4b2" font-size="6.6" text-anchor="middle">docker compose (old)</text>
    <rect x="48" y="82" width="148" height="52" rx="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="122" y="100" fill="#d6a45c" font-size="7" text-anchor="middle" font-weight="bold">commerce (the monolith)</text>
    <text x="122" y="114" fill="#e6e6e6" font-size="6.2" text-anchor="middle">demoted in place to one service</text>
    <text x="122" y="126" fill="#9aa4b2" font-size="6" text-anchor="middle">still up · used internally</text>
    <rect x="48" y="146" width="148" height="26" rx="5" fill="#262b3a" stroke="#9b6ff0" stroke-width="1"/>
    <text x="122" y="163" fill="#9aa4b2" font-size="6.2" text-anchor="middle">commerce DB</text>
    <rect x="228" y="52" width="320" height="192" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="6 4"/>
    <text x="388" y="70" fill="#9aa4b2" font-size="6.6" text-anchor="middle">docker compose (new)</text>
    <rect x="244" y="82" width="140" height="46" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="314" y="100" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">purchasing (new build)</text>
    <text x="314" y="114" fill="#e6e6e6" font-size="6.2" text-anchor="middle">eats external orders · computes demand</text>
    <rect x="244" y="136" width="140" height="24" rx="5" fill="#262b3a" stroke="#9b6ff0" stroke-width="1"/>
    <text x="314" y="152" fill="#9aa4b2" font-size="6.2" text-anchor="middle">purchasing DB (new)</text>
    <rect x="396" y="82" width="140" height="46" rx="6" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="466" y="100" fill="#4f6df5" font-size="7" text-anchor="middle" font-weight="bold">bidding (moved out)</text>
    <text x="466" y="114" fill="#e6e6e6" font-size="6.2" text-anchor="middle">downtime · export/import</text>
    <rect x="396" y="136" width="140" height="24" rx="5" fill="#262b3a" stroke="#9b6ff0" stroke-width="1"/>
    <text x="466" y="152" fill="#9aa4b2" font-size="6.2" text-anchor="middle">bidding DB (separate)</text>
    <rect x="300" y="176" width="200" height="46" rx="6" fill="#1f2330" stroke="#e05a7d" stroke-width="1.2"/>
    <text x="400" y="194" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">member service (auth + permissions)</text>
    <text x="400" y="208" fill="#e6e6e6" font-size="6.2" text-anchor="middle">built by purchasing → promoted when bidding joined</text>
    <line x1="314" y1="160" x2="360" y2="176" stroke="#3a4154" stroke-width="1"/>
    <line x1="466" y1="160" x2="440" y2="176" stroke="#3a4154" stroke-width="1"/>
    <text x="290" y="238" fill="#9aa4b2" font-size="6.4" text-anchor="middle">REST between services · JWT auth (one shared secret key)</text>
    <rect x="16" y="270" width="230" height="24" rx="5" fill="#262b3a" stroke="#e0733a" stroke-width="1.1"/>
    <text x="131" y="286" fill="#e0733a" font-size="6.4" text-anchor="middle">third-party software → Excel by hand (unique key = idempotent)</text>
    <line x1="246" y1="282" x2="300" y2="128" stroke="#e0733a" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="420" y="286" fill="#e6e6e6" font-size="6.8" text-anchor="middle">separate DBs — we split coupling, not machines</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Three moves: build a new house for purchasing, move bidding out, demote commerce in place — not one of them the textbook's "carve up the monolith".</figcaption>
</figure>

**Purchasing: build a new house.** A brand-new service and a brand-new DB, carrying not one line of the old system. The new business's requirement shape (external orders, idempotent import, a purchasing workflow) is a completely different thing from the storefront, and cramming it into the monolith would have been torture.

**Bidding: move house.** The main act of splitting the monolith was moving bidding out with its own DB. Why bidding? [[rezero-team|The last chapter]]'s org chart already answered: bidding was an independent squad from day one (1 backend + 1 front end + 1 PM), and the coupling between commerce and it was thin to begin with — **on demolition day Conway's law turns from curse into gift: where the organisation built its walls is where the system's natural seams are, so you just tear along them.**

**Commerce: demoted in place.** The monolith wasn't carved up — it stayed exactly where it was, demoted from "the system" to "one of three services". A storefront with no customers didn't deserve any migration cost; it only had to keep living and serving the people inside. A strangler fig doesn't actually have to strangle its host — Fowler himself said leaving the parts you no longer need to change exactly where they are is entirely legitimate; we just took that branch to its extreme: the whole host tree needed no changes at all, and the new tree grew beside it.

The migration method was the one textbooks recommend least: **stop, export, import.** That entire uninterrupted-migration toolbox exists for one reason: the car is moving and the engine has to be changed on the go. A system with no customers has **already stopped, so downtime costs nothing.** That's the saddest dividend in the series: political death gave technology complete freedom. In the boom years, moving bidding out would have been a months-long campaign; in the quiet, it was a weekend.

## The glue: REST, one secret, and a promoted member service

How do the three services get along? One principle: **operate them as completely independent systems.** Communication is REST — not events, not a shared DB; a call is a call, and the [[ddia-encoding|contract]] is the shape of the API.

Authentication is JWT, and here's a decision with a three-person team's fingerprints on it: **one secret key, shared by everyone.** Any service can verify a token itself without asking the member service every time — zero extra infrastructure, and for three people a perfect saving. The cost has to be booked honestly too: one leaked secret means everyone falls, and trust can't be revoked for a single service. In a reality where all three services run on the same VM maintained by the same handful of people, the risk was already pooled, and separate secrets would have bought little isolation — **a risk taken knowingly and a risk taken ignorantly are two different kinds of engineering.**

How the member service was born is more worth writing about than what it does. It wasn't a "shared authentication centre" drawn on an architecture diagram in advance — **the new purchasing system first built its own member service**, just its own login and permissions; later, when bidding moved out and needed authentication, we changed the code to **point bidding at the same service**, and only then was it "promoted" into something shared. The right moment for a shared service to be born isn't the day an architect prophesies it, **it's the day the second customer appears** — before that it's just some system's login module, and after it, it deserves to be called infrastructure. That's the rule of two in the field: an abstraction pulled out by two real users is the only real abstraction.

Finally the infrastructure epilogue, and my favourite fact in this chapter: the three services plus the member service **still ran on the same VM — just as different docker compose files**. No k8s, no service mesh, no multiple regions. If you think "that counts as microservices?", that's exactly the point this chapter wants to leave: **a microservice boundary is a boundary of code, database and deployment unit, not a boundary of machines.** Independent deploys, independent schemas, independent failure domains — all the essential benefits of splitting were fully cashed in by two compose files; scattering them across ten machines buys scale, not decoupling. **Splitting is about decoupling, not distributing.**

## The rebuild

This chapter's rebuild list is surprisingly short — because in a coordinate system of "three people, zero traffic, stay alive", I'd make almost every decision the same way today: building a new house, moving bidding, demoting the monolith is the only split three people can finish; migration with downtime is optimal at zero traffic; I'd probably even keep the shared secret, just with a README somewhere saying "we know what this means".

The real rebuild hides much earlier: moving bidding was a weekend rather than a campaign because its coupling with commerce was thin — and thin coupling was accumulated by decisions in earlier chapters: [[rezero-team|how the organisation divided]], [[rezero-permission|permission boundaries]], [[rezero-reconciliation|the discipline of facts and derivations]]. **Whether microservices can be split is decided long before you split them** — this chapter has no new rebuild; it's the acceptance test for all eighteen chapters of rebuilds before it.

## Reflections

**Splitting is about decoupling, not distributing.** "Microservices" on one VM with two compose files are closer to the intent of microservices than a distributed monolith across ten k8s clusters. Ask "who needs to evolve independently of whom" first, and "should they run separately" second — most teams do those two questions in the wrong order, paying the cost of distribution without collecting the benefit of decoupling.

**Conway's law is something you can use, not just something to fear.** Textbooks always cite it negatively: careful, your architecture will grow into your organisation. Read backwards it's leverage: **to know where a system's natural seams are, look at where the organisation's walls are.** The bidding squad operating independently from its founding drew the boundaries for a future split, free of charge — and the last chapter's wall of "I never knew bidding" became this chapter's cleanest service boundary.

**An architectural decision's correctness is a function of context.** Migration with downtime, one shared secret, uploading an Excel by hand — a textbook would red-light all three; in a coordinate system of "three people, no customers, and a company waiting on a new direction", they all score full marks. Engineering maturity isn't memorising every best practice, **it's knowing which coordinate system you're deciding in right now** — and having the nerve, when the coordinate system changes, to turn yesterday's red light into today's green.

The split system ran quietly, three people could afford it, and the new business had a home of its own. The real storyline is heading for its end — but before that, the next chapter takes one detour: **what if this platform hadn't died, and had instead grown into a SaaS?** A thought experiment in a parallel world.
