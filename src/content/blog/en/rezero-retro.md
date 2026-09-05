---
title: "Re: If I Really Started Over"
date: 2026-08-02
category: tech
description: "The finale. The politics get one line — we're engineers, and we focus where focus belongs; what deserves writing is the final month: one-on-ones, mock interviews, studying AI tools together, shipping right up to the day we disbanded; a meteor's appeal, three realisations that only surfaced mid-series, the two lists of \"wouldn't change\" and \"would add\" — and what the word Re: actually means."
tags:
  - war-story
  - live-commerce
  - retrospective
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 21
comments: true
draft: false
translationOf: rezero-retro
---
This series started with [[rezero-overview|the journey of one comment]] and ran for twenty chapters. The finale adds no architecture; it does four things: account for the ending, tell the last month, gather three realisations that only surfaced halfway through the writing, and answer the title's question — **if I really started over, what would I change?**

## After that day

[[rezero-microservices|#19]] covered that day: development paused, the contract renegotiated, three people left a month later. After that, the project moved towards shutdown and redundancies for **political reasons**.

The political details aren't written here. Not because they can't be, but because they aren't worth it — **we're engineers, and we focus where focus belongs.** Commercial and political forces can switch a project off, and an engineer can't control that; what an engineer controls is doing the work right every day the project lives, and what they carry out on the day it dies. This chapter is only about the second.

## The final month

The first thing I did once the ending was certain was **book a one-on-one with everyone immediately.** Nobody needed consoling — they all understood the owner's decision; engineers accept a causal chain like "the contract collapsed, the money ran out" faster than you'd expect. What actually needed discussing was the next step.

I told them: for this last month, **go and look for work** — and if it helps, I'll run mock interviews with you. Then we turned the remaining time into an acceleration period: studying the AI tools that were exploding at the time together — OpenClaw, opencode, Claude Code, multica — building the competitiveness that doesn't fit on a résumé.

The last thing was that I **stood up multica so people in other departments could write tasks themselves, with engineers reviewing them.** The team was disbanding, but the requirements weren't going to disappear; better to leave behind a way of working — non-engineers write tasks, engineers hold the gate — than a pile of wishes with nobody to catch them. [[rezero-ops|#15]] said what we lacked was "a language for incidents"; the final delivery before leaving happened to give the people staying **a language for requirements**.

Still shipping on the eve of disbanding isn't a performance of diligence. An engineer's dignity doesn't live in a project's success or failure — half of that is in other people's hands; **dignity lives in "right up to the last day, the work was good".**

## A meteor's appeal

There's a story owed since [[rezero-ops|#15]]: the post-selection variant feature.

Tuesday, midnight, a call to the CTO: the host wanted a "post-selection variant" feature — customers call orders during the stream and pick the exact variant after it ends — **needed for Saturday's stream.** A colleague and I rushed it out, tested it thoroughly, felt entirely confident, and shipped on time.

And then it was **never used once in three months.**

The CTO asked, and got this answer: "**Knowing I can use it and not being able to use it are different things.**" What my colleague, the CTO and I felt at the time was tragicomic — a midnight meteor, a week of crunch, in exchange for a button nobody touched.

But having written these twenty chapters, I'd like to appeal that meteor's verdict. [[rezero-asset-lifecycle|#17]] had an insurance policy never claimed on — image_metadata's reverse reference, taken out for entirely genuine reasons, with the day of the claim never coming; [[rezero-ops|#15]] said monitoring's ultimate product isn't information, it's **peace of mind**. The post-selection variant is the same thing: the host was never buying that button, she was buying "**if I need it on Saturday, I have it**". An unclaimed policy doesn't mean the premiums were wasted — **having it and not using it is itself an effect.** We recorded it in an engineer's ledger (zero usage = zero value) and the host was keeping a different one; only now, writing this series, do I see that hers was the right ledger.

## Three realisations

Three things surfaced by themselves halfway through this series — not things I knew back then, but things the writing forced out. Collected here in the order they appeared.

**One: we actually did rather well back then.** When I started this series I expected to write a confession; halfway through I found the "wouldn't change" list unusually long: [[rezero-comment-order|the FSM and lookup-as-validation]], [[rezero-payment|fact tables and derive-on-read]], [[rezero-flash-crowd|batches that silt but don't fall]], [[rezero-cart-order|3NF discipline]], [[rezero-stack|five boring components]], [[rezero-team|order the queue, don't schedule it]]… Why the gap between memory and fact? Because **good decisions are silent** — they don't cause incidents, and what causes no incident leaves no memory; a painful memory is always more vivid than a correct decision. An engineer looking back at themselves carries the inverse of survivorship bias: remembering only the scars and forgetting the armour.

**Two: I wasn't a data engineer back then, and I did a great deal of what data engineers do.** Fetching comments is an EL pipeline, the FSM batch is stream consumption, the sold quantity is a materialised view, the hourly recomputation is scheduled repair, the allocation log is event sourcing, the export is data delivery — everything [[rezero-reconciliation|the reconciliation chapter]] gathered up is present in what my job title today calls Data Engineering. **DE isn't a job title, it's a set of problems**; back then that set grew on an e-commerce backend, and when I changed jobs later I only moved to a place where the same set is the main event. From backend to DE manager looks like a career change from outside; I know better: **the problems didn't change, they finally got a name.**

**Three: the whole system is an unbundled database.** [[rezero-reconciliation|#16]] unpacked this; the finale only adds a last layer: the first two realisations are corollaries of it. "We did rather well" is because we unknowingly followed a database's internal discipline (write the log first, derive rather than materialise, repair from the facts); "I did DE work" is because every component of an unbundled database is a data engineer's daily life. Three realisations are three faces of one thing — **we spent eighteen months building a database by hand, and I only found out while writing this series.**

## If I really started over, the one thing I'd most want to change

The title's question — surely the answer is some piece of architecture? The FSM? The state machine? The timing of the microservices?

None of them. The core architecture, as the last section said, I wouldn't change. **What I'd most want to change is the monitoring.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 288" role="img" aria-label="Two lists. On the left in green, the core I wouldn't change: the FSM and lookup-as-validation, appending facts plus deriving on read, batches that silt but don't fall, 3NF and the two stock columns, per-provider payment fact tables, five boring components, ordering the queue rather than scheduling it, and transcoding as validation. On the right in amber, the protection a rebuild would add: the four golden signals plus a batch lag gauge, a language for incidents with severity and runbooks, dead-letter queues, Cloudflare on day one, scheduled invariant queries, deleted_at and a reverse lookup before sweeping, and load testing plus the other half of the checklist. The conclusion at the bottom: the core was right and everything owed was protection — which also explains why I later moved towards SRE." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="152" y="26" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">Wouldn't change (the core)</text>
    <rect x="24" y="38" width="256" height="196" rx="8" fill="#233528" stroke="#54b890" stroke-width="1.3"/>
    <text x="152" y="60" fill="#e6e6e6" font-size="6.6" text-anchor="middle">the FSM · lookup-as-validation</text>
    <text x="152" y="82" fill="#e6e6e6" font-size="6.6" text-anchor="middle">append facts + derive on read</text>
    <text x="152" y="104" fill="#e6e6e6" font-size="6.6" text-anchor="middle">batches that silt but don't fall</text>
    <text x="152" y="126" fill="#e6e6e6" font-size="6.6" text-anchor="middle">3NF · two stock columns</text>
    <text x="152" y="148" fill="#e6e6e6" font-size="6.6" text-anchor="middle">per-provider payment fact tables</text>
    <text x="152" y="170" fill="#e6e6e6" font-size="6.6" text-anchor="middle">five boring components · one VM</text>
    <text x="152" y="192" fill="#e6e6e6" font-size="6.6" text-anchor="middle">order the queue · merge = release</text>
    <text x="152" y="214" fill="#e6e6e6" font-size="6.6" text-anchor="middle">transcoding as validation · generic FKs</text>
    <text x="428" y="26" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">Would add (protection)</text>
    <rect x="300" y="38" width="256" height="196" rx="8" fill="#1f2330" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="428" y="60" fill="#d6a45c" font-size="6.6" text-anchor="middle" font-weight="bold">four golden signals + a batch lag gauge</text>
    <text x="428" y="82" fill="#e6e6e6" font-size="6.6" text-anchor="middle">a language for incidents: severity · runbooks</text>
    <text x="428" y="104" fill="#e6e6e6" font-size="6.6" text-anchor="middle">a dead-letter queue for poison pills</text>
    <text x="428" y="126" fill="#e6e6e6" font-size="6.6" text-anchor="middle">Cloudflare on day one</text>
    <text x="428" y="148" fill="#e6e6e6" font-size="6.6" text-anchor="middle">scheduled invariant queries (self-reconciliation)</text>
    <text x="428" y="170" fill="#e6e6e6" font-size="6.6" text-anchor="middle">deleted_at · a reverse lookup before sweeping</text>
    <text x="428" y="192" fill="#e6e6e6" font-size="6.6" text-anchor="middle">load testing · the other half of the checklist</text>
    <text x="428" y="214" fill="#9aa4b2" font-size="6.4" text-anchor="middle">— all protection, not one of them a feature</text>
    <text x="290" y="258" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">The core was right; everything owed was protection</text>
    <text x="290" y="276" fill="#9aa4b2" font-size="6.8" text-anchor="middle">Which also explains why I later moved towards SRE</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Twenty chapters of the "starting over" voice, distilled into two lists: the armour on the left, and the piece we never put on, on the right.</figcaption>
</figure>

Pour out every "starting over" voice from twenty chapters and the right-hand list has one thing in common: **not one item is a feature, all of them are protection** — a gauge you can see, an incident you can describe, a poison pill you can catch, an attack you can block. And where the left-hand list explains why the system survived, the right-hand one explains why **the people** had such a hard time: [[rezero-ops|the fear during every stream, the vaguely-watched Sentry, the midnight calls]] — the system silted without falling, and the people blew on contact.

So if I really started over, what I'd most want to change isn't a line of architecture, it's **doing the monitoring properly — so no engineer ever gets the chance to suffer the way I did.** The greatest do-over isn't for the system, it's for the people. The system's books balanced back then; the people's books are what I only learned to keep later.

## Re:

The series' name plays on a joke, but writing to the end I found the word "Re:" has three meanings, and they happen to be three layers of an ending.

**Re: is retry.** Every chapter carries a "if I started over" voice — not a list of regrets, but fighting each of those battles again with what I know now. The conclusion of refighting them is in the two lists above: keep the core, add the protection. Technically, the do-over is settled.

**Re: is reply.** Halfway through the writing I realised these twenty-one chapters are a letter of reply — to the version of me watching streams with his stomach in knots and fixing bugs at midnight. Summarised in one line: **you did better than you thought; and what you owed, you paid off later.**

**Re: is resume.** The project died. Everything technical was right and the project died anyway — the most honest lesson in this industry: **half of success is in other people's hands, and all of your capability is in yours.** The day the platform shut down, the code went to the company, but the feel of the FSM, the instinct for facts and derivations, the nerve for batches, the discipline of reconciliation, the way to lead people — those left with me. After leaving I became an EM, first doubling as interim SRE; today I lead a data engineering team, and the monitoring I once owed myself I'm filling in, one pane at a time, for the engineers I work with now.

The ship never sailed; the sailors are still at sea.

**Onward.**
