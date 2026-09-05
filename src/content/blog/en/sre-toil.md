---
title: "Eliminating Toil: Treat Repetitive Operations as Bugs to Be Killed"
date: 2026-07-10
category: tech
description: "Toil isn't a synonym for \"hard work\"; it's a class of work with clear traits that ought to be eliminated: manual, repetitive, automatable, leaving the system no better afterwards, and growing linearly with service scale. Its scariest property is that it naturally expands until it eats all your engineering time — so Google set a 50% guardrail."
tags:
  - sre
  - reliability
series: "Google SRE — Reading Notes"
seriesOrder: 3
comments: true
draft: false
translationOf: sre-toil
---
[[sre-intro|The first post]] said SRE's core is "operations can be engineered". The **toil** in this post is the thing to be engineered away. Many people think toil means "hard work"; it doesn't — it's **a class of work with clear traits**, and if you don't actively cut it, it naturally expands until it eats all the time you have for engineering.

## What toil is (and what it isn't)

Toil is work "tied to running a Production service, with the traits below". The more it matches, the more it's toil:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 258" role="img" aria-label="Six traits for judging toil: manual, a person does it step by step; repetitive, done many times and will be again; automatable, a machine could do it but nobody has written it yet; no enduring value, the system is no better afterwards; scales linearly, the service grows and so does it; reactive, done when triggered rather than planned. The more matches, the more it's toil. Meetings, planning and email are overhead, not toil" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="280" y="26" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">Is it toil? Check six traits</text>
    <rect x="56" y="40" width="448" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/>
    <text x="76" y="57" fill="#54b890" font-size="11" text-anchor="middle">✓</text><text x="94" y="57" fill="#e6e6e6" font-size="9.5" text-anchor="start">Manual — a person does it, step by step</text>
    <rect x="56" y="70" width="448" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/>
    <text x="76" y="87" fill="#54b890" font-size="11" text-anchor="middle">✓</text><text x="94" y="87" fill="#e6e6e6" font-size="9.5" text-anchor="start">Repetitive — done many times, and will be done again</text>
    <rect x="56" y="100" width="448" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/>
    <text x="76" y="117" fill="#54b890" font-size="11" text-anchor="middle">✓</text><text x="94" y="117" fill="#e6e6e6" font-size="9.5" text-anchor="start">Automatable — a machine could do it; nobody has written it yet</text>
    <rect x="56" y="130" width="448" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/>
    <text x="76" y="147" fill="#54b890" font-size="11" text-anchor="middle">✓</text><text x="94" y="147" fill="#e6e6e6" font-size="9.5" text-anchor="start">No enduring value — the system is no better afterwards</text>
    <rect x="56" y="160" width="448" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/>
    <text x="76" y="177" fill="#54b890" font-size="11" text-anchor="middle">✓</text><text x="94" y="177" fill="#e6e6e6" font-size="9.5" text-anchor="start">Scales linearly — the service grows, so does it</text>
    <rect x="56" y="190" width="448" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/>
    <text x="76" y="207" fill="#54b890" font-size="11" text-anchor="middle">✓</text><text x="94" y="207" fill="#e6e6e6" font-size="9.5" text-anchor="start">Reactive — done when triggered, not planned</text>
    <text x="280" y="240" fill="#9aa4b2" font-size="8.7" text-anchor="middle">More matches → more toil. Note: meetings, planning, documentation are overhead, not toil</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The six traits of toil. It isn't "tiring", it's "nothing left behind afterwards" — manual, repetitive, and the system no better for it. Meetings, planning and email are annoying too, but they're overhead, not toil</figcaption>
</figure>

One distinction matters: **toil ≠ all unpleasant work.** Meetings, documentation, planning, answering email are overhead — they take time, but they're not toil. Toil specifically means operations that are **manual, repetitive, something a machine could already do, and that leave the system no better** — manually restarting a service, manually changing a setting, manually handling the same alert every time. Nor does it mean zero toil is required; a little is acceptable. The point is **not letting it expand**.

A common grey area: "does manual testing count as toil?" — the answer is **it depends which kind, and the line falls exactly on "no enduring value"**. Manually clicking through the **same** regression flow every release hits all six traits; it's textbook toil and should be automated away. But **exploratory testing** (a person poking around by experience to find new edge cases), the first test of a brand-new feature, UX testing — those need human judgement, explore something new every time, and are hard to automate; they accumulate, so they're not toil. One test: **"after this manual run, will next time have to be exactly the same again?"** If yes, toil; if not, and every run is judgement-driven exploration, it's valuable human effort.

## Why it must be cut: it grows linearly with scale

Toil's most dangerous trait is "**grows linearly with service scale**". Double the service and the manual operations roughly double too. Leave it alone and the headcount required climbs with scale until it drowns the team:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 244" role="img" aria-label="Horizontal axis service scale, vertical axis people needed. The red line of toil left alone rises steeply and linearly with scale, eventually drowning the team; the green line of investing in automation costs a little more up front, then headcount decouples from scale and flattens. SRE's guardrail is time on toil under 50%, the other half spent on engineering that reduces future toil" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <line x1="60" y1="196" x2="524" y2="196" stroke="#3a4154" stroke-width="1.4"/>
    <line x1="60" y1="196" x2="60" y2="34" stroke="#3a4154" stroke-width="1.4"/>
    <text x="300" y="216" fill="#9aa4b2" font-size="9" text-anchor="middle">service scale →</text>
    <text x="30" y="112" fill="#9aa4b2" font-size="9" text-anchor="middle" transform="rotate(-90 30 112)">people needed ↑</text>
    <polyline points="66,182 500,54" fill="none" stroke="#e0733a" stroke-width="2.4"/>
    <polyline points="66,170 150,120 260,98 400,90 500,86" fill="none" stroke="#54b890" stroke-width="2.4"/>
    <text x="486" y="46" fill="#e0733a" font-size="9" text-anchor="end">left alone: headcount grows linearly → drowned</text>
    <text x="486" y="112" fill="#54b890" font-size="9" text-anchor="end">automation: headcount decouples from scale</text>
    <text x="300" y="236" fill="#9aa4b2" font-size="8.7" text-anchor="middle">SRE guardrail: time on toil &lt; 50%; the other half must go to engineering that "reduces future toil"</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Left alone, toil grows linearly with scale and drowns the team (red); investing in automation costs a little more up front, then headcount decouples from scale (green). That's the core of SRE's "operations as software engineering": headcount no longer tracks scale</figcaption>
</figure>

Worse, there's a **vicious cycle**: more toil → less time to write automation → toil keeps accumulating → even less time… Because toil is always "urgent" (an alert is firing, a service needs restarting) while automation is always "important but not urgent", forever pushed to tomorrow by firefighting. To break the cycle, Google set a famous guardrail: **SREs should spend less than 50% of their time on toil**, and the other half must go to engineering that "reduces future toil". The line is deliberate — without forcibly fencing off engineering time, toil will certainly eat it all.

## How to cut it (but not all of it)

The main weapon against toil is **automation**: turn repetitive manual operations into code, into self-service tools, into systems that heal themselves. But one important premise — **not all toil is worth automating.** Automation has its own cost, and you have to do the sums: **the investment in automation vs the future toil saved × how often it happens**. An operation done once a year isn't usually worth two weeks of automation; one done daily, ten minutes each time, has an extremely high return. So cutting toil isn't mindlessly automating everything; it's **going after the highest return first**.

## Reflections

### The essence of toil isn't "tiring", it's "nothing accumulates"

I used to equate "this work is annoying and tiring" with "this is toil", and later realised the point isn't tiredness at all but **whether anything is left behind afterwards**. Building a new feature is tiring, but it accumulates, the system gets better — that's not toil; manually restarting a service for the hundredth time is just as tiring, but the system is unchanged and you'll do it again next time — that is toil. The distinction sharpened what I protect — **I guard the time that "accumulates", and cut the time that's "pure consumption"**. Put people where things accumulate and hand pure consumption to machines: that's what SRE really means by "engineering" it.

### The 50% cap is a "deliberate guardrail", not an ideal

What I appreciate most about the 50% line is that it admits a reality: **unless engineering time is forcibly fenced off, firefighting will certainly eat it.** Toil is always more "urgent", automation always more "important but not urgent", and urgent always wins. 50% doesn't mean "ideally spend half on toil"; it's a **cap** — a guardrail that forces you to protect the important-but-not-urgent. It's the same discipline as any long-term investment I make: **important but not urgent things never happen unless you actively fence off time for them.**

### Don't automate for automation's sake

Cutting toil can also go too far — not all toil is worth automating. I've seen someone spend a month automating a process that ran once a quarter and took five minutes, purely because "manual isn't very SRE". The sums simply don't add up. Automation is a means, not a faith, and the criterion is always that ROI: **investment vs toil saved × frequency**. Which brings us back to [[pain-before-power|confirm the pain first, then bring the heavy weapons]] — first check how much this toil actually hurts and how often, and automate only when it's worth it. Spending effort on the few things that hurt every day is far more real than a purist pursuit of "zero manual work".
