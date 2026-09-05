---
title: "What Is SRE? Start with the Error Budget"
date: 2026-07-09
category: tech
description: "SRE is often misread as \"senior operations\" or \"a sysadmin who can code\". Its soul is really one shift in thinking plus one mechanism: 100% reliability is the wrong target, and the error budget (= 1 − SLO) turns the endless war between \"dev wants speed\" and \"ops wants stability\" into a maths problem both sides solve together."
tags:
  - sre
  - reliability
series: "Google SRE — Reading Notes"
seriesOrder: 1
comments: true
draft: false
translationOf: sre-intro
---
"SRE" is a hot word, and it's very often misread as "slightly more advanced operations" or "a sysadmin who can code". Having read Google's book, my take is that its soul isn't in the job title at all but in **one shift in thinking + one mechanism** — "100% reliability is the wrong target", and the **error budget**, which turns the eternal war between "dev wants speed" and "ops wants stability" into a maths problem both sides work out together. Let's get those two things straight first.

## What SRE is: software engineers doing operations

Google's original definition of SRE is neat: **"what happens when you ask a software engineer to design an operations team."** In one line — **treat operations as a software problem**, rather than piling on people. Traditional operations' answer to "more work" is usually "more people", with headcount growing linearly with service scale; SRE's answer is "write code to automate it away", decoupling headcount from scale. That starting point sets the flavour of every practice that follows: anything automatable shouldn't be done by hand, and repetitive manual work is treated as "something to be eliminated" rather than "chores you resign yourself to".

## First, bust a myth: 100% reliability is the wrong target

Most people's intuition is that reliability is obviously better the higher it goes, ideally 100%. But SRE's first counter-intuitive claim is: **chasing 100% is not just wrong, it's harmful.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 202" role="img" aria-label="A bar representing service requests: the green 99.9% is the SLO target that must succeed, the red 0.1% is the error budget allowed to fail, about 43 minutes a month. Error budget equals 1 minus SLO. Note: chasing 100% explodes cost, marginal benefit approaches zero, and users can't tell 99.9% from 100%" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="280" y="26" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">Set the reliability target at 99.9%, not 100%</text>
    <text x="280" y="45" fill="#9aa4b2" font-size="9" text-anchor="middle">the remaining 0.1% isn't a regret, it's a "budget" you can spend</text>
    <line x1="424" y1="66" x2="520" y2="66" stroke="#e0733a" stroke-width="1.3"/>
    <text x="472" y="60" fill="#e0733a" font-size="9" text-anchor="middle">Error Budget = 1 − SLO</text>
    <rect x="40" y="72" width="384" height="48" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/>
    <text x="232" y="100" fill="#e6e6e6" font-size="10.5" text-anchor="middle">requests succeed ≥ 99.9% (SLO target)</text>
    <rect x="424" y="72" width="96" height="48" rx="5" fill="#33291a" stroke="#e0733a" stroke-width="1.6"/>
    <text x="472" y="94" fill="#e0733a" font-size="9" text-anchor="middle">fail ≤ 0.1%</text>
    <text x="472" y="108" fill="#9aa4b2" font-size="7" text-anchor="middle">(exaggerated)</text>
    <text x="472" y="138" fill="#9aa4b2" font-size="8.5" text-anchor="middle">≈ 43 min/month of downtime</text>
    <text x="280" y="172" fill="#9aa4b2" font-size="8.7" text-anchor="middle">Chasing 100%: cost explodes, marginal benefit → 0 — and users can't tell 99.9% from 100%</text>
    <text x="280" y="187" fill="#9aa4b2" font-size="8.2" text-anchor="middle">(their network, phone and Wi-Fi were never that reliable anyway)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Set reliability as a "good enough" target (the SLO), and the allowance left over for failure is the <b style="color:#e0733a">Error Budget = 1 − SLO</b>. 99.9% sounds strict, yet it still leaves about 43 minutes a month of "breakage budget" to spend</figcaption>
</figure>

Why is 100% wrong? Three reasons: **cost** — each extra "nine" beyond 99.9% multiplies the investment several times over; **marginal benefit** — it approaches zero; **users can't feel it** — their home network, phone and Wi-Fi were never that stable, so pulling your backend from 99.9% to 99.999% makes no perceptible difference at their end. So the right question isn't "how do we avoid errors" but **"how reliable is reliable enough"** — set a target (the SLO, the next post's subject), and the allowance left over for errors is the **error budget**.

## The error budget: turning the dev vs ops war into maths

The real power of the error budget is that it dissolves a war almost every team is fighting: **dev wants to go fast and ship features; ops wants stability and doesn't want things touched.** The two goals are inherently opposed, and traditionally the winner was decided by argument, seniority, or politics. The error budget provides an objective referee:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 226" role="img" aria-label="Dev wants speed and more features, Ops wants stability and fewer changes, and both look at the error budget in the middle to decide. Budget left means green light: ship freely and take risks; budget spent means red light: freeze releases and the whole team fixes stability. The conflict goes from arguing and pulling rank to reading the same number" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="eb" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="24" y="28" width="156" height="48" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="102" y="49" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">Dev</text>
    <text x="102" y="65" fill="#9aa4b2" font-size="8.5" text-anchor="middle">wants speed, more features</text>
    <rect x="212" y="26" width="156" height="52" rx="8" fill="#33291a" stroke="#d6a45c" stroke-width="1.8"/>
    <text x="290" y="48" fill="#d6a45c" font-size="11" text-anchor="middle" font-weight="bold">Error Budget</text>
    <text x="290" y="64" fill="#9aa4b2" font-size="8.5" text-anchor="middle">= 1 − SLO</text>
    <rect x="400" y="28" width="156" height="48" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/>
    <text x="478" y="49" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">Ops</text>
    <text x="478" y="65" fill="#9aa4b2" font-size="8.5" text-anchor="middle">wants stability, fewer changes</text>
    <line x1="180" y1="52" x2="208" y2="52" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#eb)"/>
    <line x1="400" y1="52" x2="372" y2="52" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#eb)"/>
    <text x="290" y="94" fill="#9aa4b2" font-size="8.5" text-anchor="middle">both sides decide by this number</text>
    <rect x="40" y="108" width="500" height="30" rx="6" fill="#1f2330" stroke="#54b890" stroke-width="1.3"/>
    <circle cx="62" cy="123" r="6" fill="#54b890"/>
    <text x="80" y="127" fill="#e6e6e6" font-size="9.5" text-anchor="start">budget left → green: ship new features freely, take risks</text>
    <rect x="40" y="146" width="500" height="30" rx="6" fill="#1f2330" stroke="#e0733a" stroke-width="1.3"/>
    <circle cx="62" cy="161" r="6" fill="#e0733a"/>
    <text x="80" y="165" fill="#e6e6e6" font-size="9.5" text-anchor="start">budget spent → red: freeze releases, whole team goes back to fix stability</text>
    <text x="290" y="202" fill="#9aa4b2" font-size="8.7" text-anchor="middle">The fight goes from "arguing, pulling rank" to "reading the same number" — interests aligned</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The error budget is the shared referee for dev and ops: budget left means green light, ship freely; spent means red light, the whole team goes back to fix stability. The basis for decisions moves from volume and seniority to one objective number</figcaption>
</figure>

The mechanism is simple: **error budget remaining → green light**, ship boldly, launch risky features, since breakage is still within budget; **budget spent → red light**, all new feature releases freeze and the whole team turns to restoring stability. The clever part is that it **aligns both sides' interests** — ops no longer blocks every change mindlessly (with "budget left" there's no reason to block), and dev no longer forces things through mindlessly (spend it all and everyone gets frozen together). Everyone starts thinking about "spending our limited budget on the features that are most worth it".

## Reflections

### The strongest thing about the error budget isn't technical; it's turning "arguing" into "reading a number"

I've watched the same play in different teams: whether to ship a somewhat risky feature, dev and ops each dig in, and in the end whoever is loudest, most senior, or closest to the boss wins. That way of deciding is exhausting and unfair. What made me slap the table about the error budget's design is that it turns **a human conflict** into **an objective, quantified question** — "how much budget do we have left this month?" The two sides stop being enemies and become joint managers of one budget. It's the most beautiful example I've seen of "using a mechanism to defuse a human conflict", and it reminds me that **many arguments inside a team come from lacking an agreed ruler, not from lacking reason.**

### "100% isn't the target" is nearly a general rule of engineering judgement

"Don't chase perfect, chase good enough" applies far beyond reliability. Over-pursuing any metric — 100% coverage, zero technical debt, ultimate performance — is at heart **over-engineering**, pouring resources where the marginal benefit approaches zero. It's the same discipline as [[pain-before-power|confirm the pain first, then bring the heavy weapons]] that I keep coming back to: **first ask "how good is good enough", then decide how much to invest.** Most systems don't need five nines at all; the effort saved by not chasing those two extra nines, spent on things users actually feel, pays off far more. SRE institutionalised this judgement with the error budget, and I treat it as the default question for any engineering trade-off.

### SRE's core: operations can, and should, be engineered

The underlying belief in this book that moved me most: **operations isn't "chores you resign yourself to"; it's a pile of "problems that haven't been engineered yet".** Once you see repetitive manual work as bugs to be eliminated rather than fate, your behaviour changes — you stop being chased around by on-call, worn out, and start proactively asking "how do we automate this away so nobody has to get up in the middle of the night again". That mindset shift matters more than any tool or process; it decides whether you're the slave of operations or its master. Eliminating toil, monitoring, automation — everything that follows is this belief unfolding — and its starting point is this post's error budget: quantify "how stable is enough" first, and only then can you talk about spending effort intelligently where it cuts.
