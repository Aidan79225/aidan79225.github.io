---
title: "How Big Should a Team Be: What the Number 6-to-8 Is Buying You"
date: 2026-09-11
category: tech
description: "Larson's numbers are blunt: a manager supports six to eight engineers, a manager of managers supports four to six managers, and a team under four people behaves no differently from an individual. But the numbers aren't the point — each band turns you into a completely different kind of manager: a TLM, an investor, or nothing but a safety net. Plus the lower bound nobody talks about, and why scope isn't headcount."
tags:
  - engineering-management
series: "An Elegant Puzzle — Reading Notes"
seriesOrder: 2
comments: true
translationOf: aep-team-sizing
draft: false
---
"How many people should a team have" sounds like an HR question. It's actually the book's first and most operational piece of systems design. Larson's numbers are direct: **a manager supports six to eight engineers; a manager of managers supports four to six managers.**

The numbers themselves aren't the point. The point is that **each band turns you into a completely different kind of manager** — and most people only notice their job quietly changed shape long after the headcount went wrong.

## 6 to 8: what that number is buying

Start with the whole axis. Headcount isn't a stress test of how many people you can handle; it's **how much time you have left each week for the investment work**: coaching, writing strategy, driving change across teams.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 288" role="img" aria-label="A chart with number of direct reports on the horizontal axis, divided into four bands, with an inverted-U curve above showing how much time is left to invest. One to three reports: you are a tech lead manager still doing design and code, so investment time is low because it goes into building. Four to five: barely a team, rotation works but cover is thin. Six to eight: the sweet spot, where investment time peaks and coaching, strategy and driving change still fit. Nine or more: you degrade into a coach and safety net, catching problems with no time left to invest." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="310" y="22" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">How many reports you have decides what you actually do</text>
    <text x="34" y="52" fill="#9aa4b2" font-size="9">Time left to invest (coaching · strategy · driving change)</text>
    <polyline points="125,104 233,82 300,64 342,62 407,72 500,106 560,112" fill="none" stroke="#d6a45c" stroke-width="1.8"/>
    <circle cx="125" cy="104" r="3" fill="#d6a45c"/><circle cx="320" cy="62" r="3.5" fill="#d6a45c"/><circle cx="500" cy="106" r="3" fill="#d6a45c"/>
    <text x="320" y="50" fill="#d6a45c" font-size="9" text-anchor="middle">peak</text>
    <rect x="60" y="122" width="130" height="66" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <text x="125" y="143" fill="#e6e6e6" font-size="10.5" text-anchor="middle">1–3 reports</text>
    <text x="125" y="160" fill="#9aa4b2" font-size="9" text-anchor="middle">You're a TLM</text>
    <text x="125" y="176" fill="#9aa4b2" font-size="8.5" text-anchor="middle">still designing and coding</text>
    <rect x="196" y="122" width="80" height="66" rx="6" fill="#33291a" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="236" y="143" fill="#e6e6e6" font-size="10.5" text-anchor="middle">4–5</text>
    <text x="236" y="160" fill="#9aa4b2" font-size="9" text-anchor="middle">Barely a team</text>
    <text x="236" y="176" fill="#9aa4b2" font-size="8.5" text-anchor="middle">cover is thin</text>
    <rect x="282" y="122" width="122" height="66" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.8"/>
    <text x="343" y="143" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">6–8</text>
    <text x="343" y="160" fill="#54b890" font-size="9" text-anchor="middle">Sweet spot: investor</text>
    <text x="343" y="176" fill="#9aa4b2" font-size="8.5" text-anchor="middle">coach · strategy · change</text>
    <rect x="410" y="122" width="150" height="66" rx="6" fill="#262b3a" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="485" y="143" fill="#e6e6e6" font-size="10.5" text-anchor="middle">9 and up</text>
    <text x="485" y="160" fill="#e05a7d" font-size="9" text-anchor="middle">Coach + safety net</text>
    <text x="485" y="176" fill="#9aa4b2" font-size="8.5" text-anchor="middle">all catching, no investing</text>
    <line x1="60" y1="206" x2="580" y2="206" stroke="#3a4154" stroke-width="1.3"/>
    <text x="320" y="224" fill="#9aa4b2" font-size="9" text-anchor="middle">Number of direct reports →</text>
    <text x="310" y="252" fill="#9aa4b2" font-size="9" text-anchor="middle">One level up, same axis: a manager of managers supports 4–6 managers</text>
    <text x="310" y="270" fill="#9aa4b2" font-size="9" text-anchor="middle">(past that, even "coordinating managers" turns into pure forwarding)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Neither end is about being unable to cope — both ends are about <b style="color:#d6a45c">the time to invest getting eaten</b>: on the left by your own implementation work, on the right by the problems you keep catching. Only the middle band is where this role compounds</figcaption>
</figure>

Laid out band by band:

| Direct reports | What you actually become | The cost |
|---|---|---|
| **Under 4** | **TLM** (tech lead manager) — still taking a share of design and implementation | Larson says it plainly: it can be a great fit for some people's strengths, but it's a role with **limited career opportunities**. It's a position, not a stage |
| **4–5** | Barely a team | Rotation works, but one long absence empties it out (next section) |
| **6–8** | **An investor** — enough time for active coaching, coordinating, writing strategy, leading change | This is the sweet spot, and not because it's "manageable": it's because **the investment work still fits in the calendar** |
| **Over 8–9** | **Coach + safety net** — people hit walls, you catch them | Too busy to invest in the team, or in the area the team owns. It looks busy and important, but you've stopped changing anything |

The row worth stopping on is **9 and up**. Its symptom isn't "someone isn't getting attention" — that's obvious enough to get fixed. The real symptom is that **you're busy every day, every ball gets caught, and this quarter you didn't change a single system.** Back to [[aep-intro|the first post]]: you've become a machine for catching events while the source hasn't moved an inch.

## The lower bound matters more than the upper one

Most discussions of team size only cover the ceiling — "past N people, split it". Larson also gives a floor, and the wording is harsh: **a team of fewer than four is a leaky enough abstraction that it behaves indistinguishably from individuals.**

"The abstraction leaks" is exactly right here. You think you're talking to a team; you're actually talking to one person. The things the team abstraction is supposed to provide — **rotation, absorbing variance, continuing to run when someone is away** — none of them exist below four. One person takes leave and the team doesn't lose 33% of its output; **an entire area goes dark.**

The book doesn't give a formula for the floor, so here's mine: **the real floor calculator is the on-call rotation.** A team that carries a pager and doesn't have the people for a rotation doesn't have a rotation — it has *that one person*. He takes a holiday, gets sick, resigns, and nobody picks it up. [[sre-alerting-oncall|The SRE post]] covers the mechanics of alerting and on-call, but every one of those mechanics assumes **there are people to rotate through**; below the floor, the prettiest runbook in the world is a document one person writes for himself.

So a squad of three isn't a "small team" — it's **one person plus two helpers**. That isn't necessarily bad; plenty of stages look exactly like that and move fast. What's bad is managing it in the language of teams: team goals, team process, an expectation of team resilience — and then discovering on the day that person resigns that none of it was real.

## How teams are born: grow to 8–10, then bud — never create an empty team

So how do you get from one team to two? Larson's answer is counterintuitive and the logic is tight: **grow the existing team to eight or ten, then bud it into two teams of four or five — never stand up an empty team and hire into it.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 262" role="img" aria-label="Two ways of creating a new team, compared. The top row is budding: grow a team of six to eight up to eight or ten, then split it into two teams of four or five, both of which can operate from day one. The bottom row is the empty team: stand up a new team first, pull one or two people out of the original team, then hire slowly, which leaves the original team drained and the new team stuck at one or two people, weakening both at once." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="aep2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="46" y="26" fill="#54b890" font-size="11" text-anchor="start" font-weight="bold">Budding: grow first, then split</text>
    <rect x="46" y="38" width="108" height="44" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <text x="100" y="58" fill="#e6e6e6" font-size="10" text-anchor="middle">Existing team</text>
    <text x="100" y="73" fill="#9aa4b2" font-size="9" text-anchor="middle">6–8</text>
    <line x1="154" y1="60" x2="196" y2="60" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#aep2)"/>
    <text x="175" y="50" fill="#9aa4b2" font-size="8.5" text-anchor="middle">hire</text>
    <rect x="200" y="38" width="108" height="44" rx="7" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/>
    <text x="254" y="58" fill="#e6e6e6" font-size="10" text-anchor="middle">Grow to 8–10</text>
    <text x="254" y="73" fill="#54b890" font-size="9" text-anchor="middle">overloaded, but holds</text>
    <line x1="308" y1="60" x2="350" y2="60" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#aep2)"/>
    <text x="329" y="50" fill="#9aa4b2" font-size="8.5" text-anchor="middle">split</text>
    <rect x="354" y="26" width="104" height="32" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/>
    <text x="406" y="46" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Team A · 4–5</text>
    <rect x="354" y="64" width="104" height="32" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/>
    <text x="406" y="84" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Team B · 4–5</text>
    <text x="540" y="54" fill="#54b890" font-size="9" text-anchor="middle">Both work from</text>
    <text x="540" y="68" fill="#54b890" font-size="9" text-anchor="middle">day one ✓</text>
    <line x1="40" y1="118" x2="580" y2="118" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="46" y="146" fill="#e05a7d" font-size="11" text-anchor="start" font-weight="bold">Empty team: the box before the people</text>
    <rect x="46" y="158" width="108" height="44" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <text x="100" y="178" fill="#e6e6e6" font-size="10" text-anchor="middle">Existing team</text>
    <text x="100" y="193" fill="#9aa4b2" font-size="9" text-anchor="middle">6–8</text>
    <line x1="154" y1="180" x2="196" y2="180" stroke="#e05a7d" stroke-width="1.3" marker-end="url(#aep2)"/>
    <text x="175" y="170" fill="#e05a7d" font-size="8.5" text-anchor="middle">pull out</text>
    <rect x="200" y="158" width="108" height="44" rx="7" fill="#262b3a" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="254" y="178" fill="#e05a7d" font-size="10" text-anchor="middle">Original down to 4–6</text>
    <text x="254" y="193" fill="#9aa4b2" font-size="9" text-anchor="middle">delivery drops first</text>
    <rect x="354" y="158" width="104" height="44" rx="7" fill="#262b3a" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="406" y="178" fill="#e05a7d" font-size="9.5" text-anchor="middle">New team: 1–2</text>
    <text x="406" y="193" fill="#9aa4b2" font-size="9" text-anchor="middle">hiring takes months</text>
    <line x1="308" y1="180" x2="350" y2="180" stroke="#e05a7d" stroke-width="1.3" marker-end="url(#aep2)"/>
    <text x="540" y="174" fill="#e05a7d" font-size="9" text-anchor="middle">Both sides weaker</text>
    <text x="540" y="188" fill="#e05a7d" font-size="9" text-anchor="middle">and nobody owns it ✗</text>
    <text x="310" y="238" fill="#9aa4b2" font-size="9" text-anchor="middle">What an empty team really costs: it already exists on the org chart and is already</text>
    <text x="310" y="252" fill="#9aa4b2" font-size="9" text-anchor="middle">counted in the roadmap — but it won't deliver for months, and the original team pays</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Budding gets both teams over the four-person floor on day one; the empty team manufactures two undersized teams at once, then uses the hiring lag to bill the difference to the original team</figcaption>
</figure>

"Never create empty teams" gets broken constantly at small companies, because naming a team costs nothing: put it on the org chart, open a channel, name an owner, done. But **a team is a commitment, not a label** — the moment it exists, people start throwing requests into it and counting roadmap work against it, and until it actually hires, its only source of capacity is the team it came from.

The same logic applies to "we've got too many people, let's split into two". Splitting 8 into 4+4 is budding. Splitting 6 into 3+3 **manufactures two groups that behave like individuals**, and hands you a coordination boundary you didn't have before. The question to ask before splitting is never "how many people" — it's "can these two bodies of work actually move independently?" If they can't, all you've done is convert internal conversation into cross-team conversation, at double the price.

## Managerial scope isn't headcount

Chapter 4 has a section on **managerial scope**, and read alongside this chapter it corrects a common misconception: **growing isn't asking for more headcount, it's taking on something more important and more complex.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 200" role="img" aria-label="Two managers with six reports each, compared. Manager A owns an internal admin tool: a small area of responsibility with few external dependencies. Manager B owns the whole checkout, payments and reconciliation chain: a much larger area, wired into three external systems and coordinating across three teams, where a failure stops revenue. Same headcount, very different managerial scope." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="155" y="24" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">Manager A · 6 reports</text>
    <circle cx="155" cy="104" r="38" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="155" y="100" fill="#9aa4b2" font-size="9" text-anchor="middle">Internal admin</text>
    <text x="155" y="114" fill="#9aa4b2" font-size="9" text-anchor="middle">one module</text>
    <text x="155" y="168" fill="#9aa4b2" font-size="9" text-anchor="middle">Breaks: someone complains</text>
    <line x1="310" y1="30" x2="310" y2="180" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="465" y="24" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">Manager B · 6 reports</text>
    <circle cx="465" cy="104" r="62" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="465" y="94" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Checkout + payments</text>
    <text x="465" y="110" fill="#9aa4b2" font-size="9" text-anchor="middle">3 external dependencies</text>
    <text x="465" y="126" fill="#9aa4b2" font-size="9" text-anchor="middle">coordinates 3 teams</text>
    <text x="465" y="180" fill="#e05a7d" font-size="9" text-anchor="middle">Breaks: no revenue today</text>
    <text x="310" y="196" fill="#9aa4b2" font-size="9" text-anchor="middle">Same headcount, scope several times bigger — growth is the circle getting wider, not fuller</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Scope is how important and how complex the thing you're accountable for is. Larson adds a line worth keeping: <b style="color:#e6e6e6">plenty of people compete for headcount; almost nobody competes for more work</b></figcaption>
</figure>

The practical value here is a route to growth **that doesn't require the org to expand**: take the mess nobody wants, take the cross-team coordination, take the system that ends up in the press. Headcount waits for the company to grow. Scope usually just needs you to raise your hand.

One line to keep straight: managerial scope here isn't the same thing as the "neck" from [[responsibility-funnel|The Responsibility Funnel]] — **scope is the area you're accountable for, the neck is the bandwidth you review through**. Let the area grow without the bandwidth and you end up signing off on a pile of things you never understood.

## The Four-Engineer Version

What this chapter gives a four-person team isn't a plan to reach 6–8 — you can't — but three things you can do on Monday:

1. **Admit you're a TLM, out loud.** A lead of four has no "leave the production line" option; that isn't failure, it's the normal shape at this size. But take Larson's "limited career opportunities" seriously: **a TLM is a position, not a stage that grows into the next one by itself.** If you want to grow, the road is scope, not headcount.
2. **Buy insurance for the floor.** You can't add people, so patch the leaks in the abstraction another way: at least two people who have touched each area, decisions written down instead of held in someone's head, a rotation even if it only has two names on it. The goal isn't to become a real team — it's to make sure **the system doesn't disappear when one person does.**
3. **Don't split the line just to look like an org.** Four people split into 2+2 doesn't give you two teams. It gives you two individuals and a new coordination cost.

## Reflection

### Four people on the storefront line — right on Larson's floor

[[rezero-team|That post about the team]] did this arithmetic once: six engineers, but the storefront line was really **four** — a backend lead (me), one backend engineer, two frontend engineers, plus a CTO who wrote no code and did product full time. Every system in the seventeen chapters before it was built by those four.

At the time the number meant nothing to me; it just felt like "a bit short-handed, but we're moving". Reading this chapter now, we were **sitting exactly on the floor**: one person fewer and the team abstraction would have leaked out completely. And the fragility was invisible — with four people everyone knew "there are only two frontend and two backend", but nobody ever wrote down the sentence that mattered: **not one area of this system has more than one person who knows it.** That doesn't hurt on an ordinary day. It hurts the day someone needs a month off, or hands in notice.

The more honest part is what came next: [[rezero-microservices|after the contract talks collapsed]], we were three people inside a month. Four to three looks like losing one person. By this chapter's standard it's **falling out of "barely a team" into "indistinguishable from individuals"** — and the only response we had at the time was for each of us to carry a little more.

### I was a TLM for two years without realizing it was a role with a ceiling

[[rezero-team|The same post]] records my own arc: at the start I was the only backend engineer, and the day the second one joined, I started leading. **A lead on a small team has no "leave the production line" option** — on top of keeping output high, you carry three checkpoints: breaking tasks down technically (the entrance), code review (the exit), and technology choices (the boundary).

That's the definition of a TLM, word for word. And my self-image at the time was "I'm doing lead work" — with no idea I was standing in a role that Larson explicitly calls **limited in career opportunities**. Let me defend the TLM for a second: nothing I learned in those two years was wasted. How to place a checkpoint, what to block and what to let through — that's the foundation under every judgment I've made since. **But I did mistake a position for a path**, assuming that if I kept doing lead things well, the next level would arrive on its own.

The growth actually available then was something I couldn't see the shape of: **scope**. My stance on the sourcing line was "I don't know it, I don't touch it" — honest, and also a road not taken. Reaching into the other line, owning the technical boundary between the two, was the one thing at that stage that could have gotten bigger without a single new hire. That's what makes section 4.7 worth more to me than 2.1: **headcount waits for the company to hand it to you; scope only needs you to raise your hand.**

### Splitting the line splits the org — and the information boundary follows

In [[rezero-team|that post]] I wrote one line: the split between the lines was the split in the org. Storefront and sourcing each had their own people and their own PM — and then the series ran for seventeen chapters with sourcing appearing exactly once, secondhand. **My not knowing that line is a result of org design, not a failure of curiosity.**

Put that in this chapter's terms and it's obvious: when you sort people into two piles, you're also deciding **who gets to know what**. Conway's law says the shape of the org ends up in the system; the reverse holds too — **the boundary of the org sets the boundary of information, and the boundary of information eventually becomes the boundary between people.**

So "should we split into two teams" was never a headcount question. It's a question of whether you're willing to have these two areas talk only through meetings from now on. My test these days is simple: **if after the split the two sides will never read each other's code again, don't split yet.** Headcount grows back. A boundary, once up, almost never comes down.
