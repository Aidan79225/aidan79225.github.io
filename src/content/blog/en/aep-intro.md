---
title: "Engineering Management Is an Elegant Puzzle: Fix the System, Not the Events"
date: 2026-09-10
updated: 2026-10-27
category: tech
description: "A new series: reading Will Larson's An Elegant Puzzle. The book takes a hard line — management isn't solving things one at a time, it's designing the system that keeps emitting them. First the shift itself, then the five chapters read as five questions, and finally an honest answer: how does a team of four read a book written for rocket ships?"
tags:
  - engineering-management
series: "An Elegant Puzzle — Reading Notes"
seriesOrder: 1
comments: true
translationOf: aep-intro
draft: false
---
There's already a leadership series on this site ([[btl-1|Becoming a Tech Leader]]), so why start another one?

Because that book is about **how a person grows into a leader** — influence, self-awareness, vision. Will Larson's *An Elegant Puzzle: Systems of Engineering Management* is about **the system that leader is holding**: how big a team should be, how to diagnose the state it's in, where the risk sits, how technical debt actually gets repaid, how policy gets written, how levels get defined, how hiring gets measured. Larson's résumé is what earns him the angle — Digg, Uber, Stripe, the last two places where the org grew so fast that a management problem got rewritten by scale before you'd finished solving it.

The title isn't decoration, it's a **stance**: Larson writes every management problem as a systems problem, with stocks, flows and lag. That happens to be the lens this blog keeps using — earlier series pointed "the system" at databases and clusters; this one points it at the organization.

## The shift: your output isn't "things handled", it's "things that stopped happening"

The book's first and most important claim: **what you operate on is the system, not the events.**

A release broke again, a request jumped the queue again, someone got burned out again, a candidate no-showed again — those are **events**. They land on your desk one at a time, and the faster and more gracefully you catch them, the more they get taken for granted. What actually decides how many land on you next week is the **system upstream that keeps emitting them**: who's on which team, what needs your sign-off, which rules are written down and which ones only live in your head.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 262" role="img" aria-label="A side-by-side comparison. On the left, working the events: a system box at the top emits six events, all of which land on you, you handle each one, and a dashed line loops back to the system to show the source rate never changed, so next week brings the same load. On the right, changing the system: the same box now has one policy or mechanism attached and emits only two events, so your load drops, with a note that the effect takes weeks to months to appear." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="aep1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="156" y="24" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">Working the events</text>
    <text x="156" y="41" fill="#9aa4b2" font-size="9" text-anchor="middle">Catch them faster, get more of them</text>
    <rect x="46" y="54" width="220" height="34" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <text x="156" y="75" fill="#e6e6e6" font-size="9.5" text-anchor="middle">System (org · process · unwritten rules)</text>
    <circle cx="86" cy="104" r="4" fill="#e05a7d"/><circle cx="110" cy="118" r="4" fill="#e05a7d"/><circle cx="134" cy="104" r="4" fill="#e05a7d"/><circle cx="158" cy="118" r="4" fill="#e05a7d"/><circle cx="182" cy="104" r="4" fill="#e05a7d"/><circle cx="206" cy="118" r="4" fill="#e05a7d"/>
    <line x1="156" y1="88" x2="156" y2="146" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#aep1)"/>
    <rect x="106" y="150" width="100" height="34" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="156" y="171" fill="#e6e6e6" font-size="11" text-anchor="middle">You</text>
    <text x="156" y="204" fill="#9aa4b2" font-size="9" text-anchor="middle">Every one of them handled ✓</text>
    <path d="M 236 167 C 288 150 288 78 268 71" fill="none" stroke="#e05a7d" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#aep1)"/>
    <text x="156" y="232" fill="#e05a7d" font-size="9.5" text-anchor="middle">Same load next week — the source never moved</text>
    <line x1="310" y1="30" x2="310" y2="240" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="464" y="24" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">Changing the system</text>
    <text x="464" y="41" fill="#9aa4b2" font-size="9" text-anchor="middle">Third time? Stop catching it</text>
    <rect x="354" y="54" width="220" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="464" y="75" fill="#e6e6e6" font-size="9.5" text-anchor="middle">System + one policy / one mechanism</text>
    <circle cx="440" cy="110" r="4" fill="#e05a7d"/><circle cx="488" cy="110" r="4" fill="#e05a7d"/>
    <line x1="464" y1="88" x2="464" y2="146" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#aep1)"/>
    <rect x="414" y="150" width="100" height="34" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="464" y="171" fill="#e6e6e6" font-size="11" text-anchor="middle">You</text>
    <text x="464" y="204" fill="#54b890" font-size="9" text-anchor="middle">Only these need your judgment ✓</text>
    <text x="464" y="232" fill="#9aa4b2" font-size="9.5" text-anchor="middle">The cost: weeks to months before it shows</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">This week's workload looks about the same on both sides. Next week is where they diverge: the left never touched the source, the right emits a little less — and the right pays nothing back this week, which is exactly why most people never do it</figcaption>
</figure>

Two consequences follow. First, **the way you measure yourself has to change**: "how many things I caught this week" is a timesheet; "which class of thing stopped happening this month" is output. Second, **every change to a system pays back late** — a policy takes a quarter to show, a hire takes three to six months to produce, a levelling system takes a full cycle before you know whether it's fair. Changing code tells you today; changing an organization doesn't. That lag runs through the whole book, and this series keeps flagging it.

One line you can actually use: **when the same thing happens for the third time, stop handling that thing — go change the system that keeps emitting it.**

## The shape of the book: five chapters, five questions

There are seven chapters: chapter 1 is the introduction, chapter 7 an appendix (tools sorted by management level, plus reading lists). The five in between are the body — and instead of memorizing chapter names, read them as **five questions in order**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 296" role="img" aria-label="A map of the book's five main chapters, one per row. Chapter 2, Organizations, asks who is on which team and what state that team is in, and its signature move is the four states of a team. Chapter 3, Tools, asks what you can use to change the organization, and its signature move is migrations in three phases. Chapter 4, Approaches, asks what your default is when information is thin, and its signature move is working the policy. Chapter 5, Culture, asks how opportunity and membership are handed out, and its signature move is killing your heroes. Chapter 6, Careers, asks how people stop guessing what good means, and its signature moves are the career ladder and the hiring funnel. Below them sits chapter 7, the appendix of tools by management level and reading lists." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="310" y="22" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">Five chapters, five questions</text>
    <rect x="28" y="36" width="564" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="38" y="46" width="44" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/><text x="60" y="60" fill="#4f6df5" font-size="9.5" text-anchor="middle">Ch2</text>
    <text x="94" y="60" fill="#e6e6e6" font-size="10.5">Organizations</text>
    <text x="200" y="60" fill="#9aa4b2" font-size="9">Who's on which team, in what state?</text>
    <rect x="404" y="44" width="176" height="24" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="492" y="60" fill="#9aa4b2" font-size="9" text-anchor="middle">The four states of a team</text>
    <rect x="28" y="84" width="564" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="38" y="94" width="44" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/><text x="60" y="108" fill="#4f6df5" font-size="9.5" text-anchor="middle">Ch3</text>
    <text x="94" y="108" fill="#e6e6e6" font-size="10.5">Tools</text>
    <text x="200" y="108" fill="#9aa4b2" font-size="9">What can you use to change things?</text>
    <rect x="404" y="92" width="176" height="24" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="492" y="108" fill="#9aa4b2" font-size="9" text-anchor="middle">Migrations in three phases</text>
    <rect x="28" y="132" width="564" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="38" y="142" width="44" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/><text x="60" y="156" fill="#4f6df5" font-size="9.5" text-anchor="middle">Ch4</text>
    <text x="94" y="156" fill="#e6e6e6" font-size="10.5">Approaches</text>
    <text x="200" y="156" fill="#9aa4b2" font-size="9">Your default when information is thin?</text>
    <rect x="404" y="140" width="176" height="24" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="492" y="156" fill="#9aa4b2" font-size="9" text-anchor="middle">Work the policy</text>
    <rect x="28" y="180" width="564" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="38" y="190" width="44" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/><text x="60" y="204" fill="#4f6df5" font-size="9.5" text-anchor="middle">Ch5</text>
    <text x="94" y="204" fill="#e6e6e6" font-size="10.5">Culture</text>
    <text x="200" y="204" fill="#9aa4b2" font-size="9">How do opportunity and membership flow?</text>
    <rect x="404" y="188" width="176" height="24" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="492" y="204" fill="#9aa4b2" font-size="9" text-anchor="middle">Kill your heroes</text>
    <rect x="28" y="228" width="564" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="38" y="238" width="44" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/><text x="60" y="252" fill="#4f6df5" font-size="9.5" text-anchor="middle">Ch6</text>
    <text x="94" y="252" fill="#e6e6e6" font-size="10.5">Careers</text>
    <text x="200" y="252" fill="#9aa4b2" font-size="9">How do people stop guessing what's good?</text>
    <rect x="404" y="236" width="176" height="24" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="492" y="252" fill="#9aa4b2" font-size="9" text-anchor="middle">Career ladder + hiring funnel</text>
    <text x="310" y="286" fill="#9aa4b2" font-size="9" text-anchor="middle">Ch1 introduction · Ch7 appendix: tools by management level, plus reading lists</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The five chapters are one line, not five topics: each one moves something from "it works because someone remembers" to "the system does it anyway" — structure first, then tools, then your defaults and your culture, and finally the career systems that nail fairness down</figcaption>
</figure>

One appetizer from each chapter:

| Chapter | The question | One signature move |
|---|---|---|
| **Ch2 Organizations** | How big, and what state is it in | **The four states of a team**: falling behind / treading water / repaying debt / innovating — four states that need **four different prescriptions**, not "hire more people" every time |
| **Ch3 Tools** | What can you use to change things | **Migrations are the only scalable fix to tech debt**: de-risk → enable → finish, and **an unfinished migration is the most expensive debt of all** |
| **Ch4 Approaches** | What's your default | **Work the policy, not the exceptions** — every "just this once" is an instruction to the system with no version control on it |
| **Ch5 Culture** | Who gets opportunity, who gets to belong | **Kill your heroes**: a hero makes it impossible for everyone else to contribute meaningfully, and burns out first anyway |
| **Ch6 Careers** | How people stop guessing | **Hiring is a production line you can measure**; a **career ladder** isn't for ranking people, it's so nobody has to guess where they stand |

I'm unpacking none of those here — each is its own post later. For now, notice one thing: **they're all the same move in different clothes — take the thing that keeps recurring and go solve it one layer up, in the system.**

## Three marks this series carries in every post

The failure mode of reading management books is nodding all the way through and then going back to your desk to fight the same fires. So this series holds itself to three marks, and every post has to answer them:

- **【Which system is emitting this】** — what exactly is the system behind the recurring event in this post? If you can't name it, the post is just an essay with opinions.
- **【Time to effect】** — how long until this works? Hiring takes three to six months, a migration is measured in quarters, a levelling system needs a full cycle. Skip this and the reader quits after two weeks of no visible change.
- **【The Four-Engineer Version】** — with no HR, no career ladder, no recruiter, and four people on the team, what's the **minimum viable version** of this move? Which moves shouldn't be made at all?

The third one is this series' signature — and it's what the next section is about.

## The honest part: a book written for rocket ships, read by four engineers

This book's raw material comes from places that add a whole team every quarter. The stretch of leading people I've written about on this blog was a different scale entirely — [[rezero-team|six engineers, with only four on the storefront line]], no estimation and no demos, fully remote, with product handled full-time by a CTO who didn't write code. And it didn't end in growth: [[rezero-retro|development was paused, the contract went into renegotiation, the team was three people a month later, and then it shut down]].

So let me be explicit from post one about how this series reads the book: **it's a translation, not a repost.** Three rules for it:

1. **Ask what a move is solving before you look at the shape it takes.** The shape — a committee, a calibration meeting, a promotion packet — is a product of scale. The problem behind it (who decides, on what grounds, does it still hold next time) exists just as much on a team of four; it's just that the answer shrinks from an institution to a shared understanding and a one-page doc.
2. **No written system doesn't mean no system.** A team without a written career ladder still has one — it lives in the manager's head, and nobody can be sure this time's standard matches last time's. The trouble with that implicit system is that it can't be checked.
3. **When the org is shrinking, one prescription disappears outright.** The book's material comes almost entirely from growing organizations, and the first prescription in its four states of a team is "hire". When headcount is going the other way, that road is gone and you're left with consolidating your efforts and adding time. **The shrinking half gets its own post at the end of this series** — which is exactly where the ending of that stretch falls.

Larson deserves credit here, though: he opens chapter 6 with a section titled *Roles over rocket ships, and why hypergrowth is a weak predictor of personal growth* — what actually decides how fast you grow is the role and the opportunities you get, not how fast the company grows. So the small-team lens isn't an argument with the book; it pulls that line further.

## Reflection

### Four practices from back then: two handed to tools, two resting on a person

In [[btl-1|the first leadership post on this blog]] I described what I was doing at the time: passing on knowledge through code review, holding the team together with a coding style, a type checker to take the weight of consistency off everyone's shoulders, regular 1-on-1s. The reflection in that same post named two problems: **"when I let code review sit too long, I become the thing slowing the team down; and 1-on-1s without follow-up end up feeling like a formality."**

Read that list again through this book and it splits cleanly. Of the four practices, **coding style and type consistency were handed to tools** — that post itself says the type checker is there "to take the weight of consistency off everyone's shoulders", and [[rezero-team|the team post]] says it outright: "Matters of form never reach a human brain — ruff and mypy mechanise style and types". **The two that got flagged as problems are exactly the two that could only run on a person**: the rhythm of review, and the follow-up on 1-on-1s. That's the class of thing this book's first shift is aimed at — a mechanism that rests on a person rises and falls with that person, and when it slips, nothing usually raises a warning first.

The book's prescription turns straight into a habit: when you're about to say "just a reminder", count which time this is. If it's the third, what needs fixing isn't anyone's memory — it's whatever keeps making this need a reminder. A checklist, a default, a CI rule, anything, as long as it isn't somebody's attention.

### "Speed is a function of process shape" — the same shift, from the trenches

In the reflection of [[rezero-team|that post about the team]] I wrote this: **"Speed is structural, not heroic. … To reproduce this team's speed, don't look for four superhumans — dismantle those four frictions first — speed is a function of process shape; people are the coefficient and the shape is the exponent."** The same post lists how those four frictions were taken apart: near-zero ritual, merge equals release, order the queue rather than schedule it, zero translation of specs.

Read next to this book, the two are saying the same thing: **don't put more force into the events — change the shape that produces them.** Heroics is exactly putting more force into the events — somebody pushing harder, holding out longer; Larson treats it as serious enough to title a chapter 5 section *Kill your heroes, stop doing it harder*.

The next question this book asks: **does that shape still run with a different set of people?** How much of it is written down, how far a new hire can follow it on day one, which piece actually rests on one person — the later posts on where risk sits and on heroes will come back to it.

### With AI in the room, the layer this book covers matters more

In [[responsibility-funnel|The Responsibility Funnel]] I described a shape: what AI eats is the wide top of the funnel — code, tests, research, first drafts; what it can't eat is the person at the neck who has to sign.

Lay that shape over this book and you can derive an extension — an inference, not something the book says: **as AI pushes down the unit cost of handling events, the gap between managers becomes more concentrated on whether they're changing the system.** The book came out in 2019, and nothing in its table of contents is about AI; but the layer it covers — structure, process, policy — is exactly what the person at the neck still has to decide. That's also where this series and the AI series divide the work: **the responsibility axis of AI stays out of here** — [[responsibility-funnel|that line already has its own series]]. This one is about the organization itself.

One verdict to close this post on: **the most expensive illusion in management is mistaking "I caught everything" for doing the job well — catching it only means the system hasn't been fixed yet, and it's still charging you interest.**
