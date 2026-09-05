---
title: "Alerting and On-Call: When to Wake Someone Up"
date: 2026-07-12
category: tech
description: "The purpose of an alert isn't to \"notify\"; it's \"someone needs to act now\". So the real question isn't whether it should fire, but — is this worth waking someone at 3am? This post covers the three tiers of alerting (Page / Ticket / Log), why alerts should be tied to symptoms and the error budget's burn rate rather than CPU, and how the person who gets paged stays healthy on-call: the goal is to stop the bleeding, not to be a hero on the spot."
tags:
  - sre
  - incident
series: "Google SRE — Reading Notes"
seriesOrder: 5
comments: true
draft: false
translationOf: sre-alerting-oncall
---
[[sre-monitoring|The previous post]] ended on a line: when should you wake someone up? This post answers it. It's really two things: **alerting** (what should fire, and to whom) and **on-call** (how the person who gets called carries it sustainably). The core idea is one sentence: **the purpose of an alert isn't to "notify", it's "someone needs to act now".** Hold on to that and a pile of alert-design questions get a yardstick.

## Three tiers of alerts: not everything deserves to wake someone

The most common mistake is making "every anomaly" an alert that wakes people. The right approach is to sort by "**does it need a person, and how urgently**" into three tiers:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Three tiers of alerting. Page: a person must intervene immediately or users are being affected right now, so wake someone. Ticket: a person needs to handle it but it isn't urgent, look at it during working hours. Log: nobody needs to look, keep it for reference and later analysis. Stuffing the non-urgent into Page causes alert fatigue, the boy who cried wolf, and real incidents get ignored." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="290" y="26" fill="#9aa4b2" font-size="10.5" text-anchor="middle" font-weight="bold">An alert comes in: does it need a person? How urgently?</text>
    <rect x="40" y="38" width="500" height="44" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.5"/>
    <text x="58" y="58" fill="#e0733a" font-size="10.5" text-anchor="start" font-weight="bold">Page</text>
    <text x="58" y="73" fill="#9aa4b2" font-size="8.5" text-anchor="start">a person must intervene "now", or users are being affected</text>
    <text x="522" y="64" fill="#e0733a" font-size="9" text-anchor="end">→ wake someone</text>
    <rect x="40" y="88" width="500" height="44" rx="6" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="58" y="108" fill="#d6a45c" font-size="10.5" text-anchor="start" font-weight="bold">Ticket</text>
    <text x="58" y="123" fill="#9aa4b2" font-size="8.5" text-anchor="start">a person needs to handle it, but it isn't urgent</text>
    <text x="522" y="114" fill="#d6a45c" font-size="9" text-anchor="end">→ working hours</text>
    <rect x="40" y="138" width="500" height="44" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="58" y="158" fill="#54b890" font-size="10.5" text-anchor="start" font-weight="bold">Log</text>
    <text x="58" y="173" fill="#9aa4b2" font-size="8.5" text-anchor="start">nobody needs to look; keep it for reference / later analysis</text>
    <text x="522" y="164" fill="#54b890" font-size="9" text-anchor="end">→ disturb nobody</text>
    <text x="290" y="202" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Stuff the non-urgent into Page → alert fatigue, crying wolf; the real incident gets ignored</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Only "a person must act immediately" deserves a Page. Fail to tier, wake people for everything, and the result is <b>alert fatigue</b> — people numbed by noise, and the genuine emergency drowned out</figcaption>
</figure>

Alert fatigue is the most real enemy here: when nine out of ten pages at 3am turn out to be "didn't actually matter", people start ignoring them, muting notifications, or responding ever more slowly. So **the quality of alerts matters far more than the quantity** — every useless Page you cut makes the remaining Pages taken more seriously.

## Good alerts bind to "symptom + burn rate", not "cause"

So what kind of alert deserves to be a Page? Two principles. First, bind to **symptoms**, not **causes** ([[sre-monitoring|continuing the previous post]]): users care that "the page won't load", not that "some CPU is high" — high CPU doesn't necessarily mean anyone is affected, and waking someone for it is often a false alarm. And every Page should be **actionable** (there's a clear thing to do) and **novel** (not the same noise every day).

Second, and the key move of modern SRE: **tie alerts to the [[sre-slo|error budget]]'s "burn rate"**. Budget is being spent either way; how fast decides how urgent:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 216" role="img" aria-label="Horizontal axis time, vertical axis remaining error budget from 100% to 0. The fast-burning red line approaches the budget threshold within hours, which maps to Page and handle immediately; the slow-burning amber line declines gently and at this rate lasts to month end, which maps to just a Ticket handled calmly. The point is to bind alerts to how fast the budget burns, not to causes like CPU." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <line x1="56" y1="40" x2="56" y2="176" stroke="#3a4154" stroke-width="1.3"/>
    <line x1="56" y1="176" x2="524" y2="176" stroke="#3a4154" stroke-width="1.3"/>
    <text x="30" y="108" fill="#9aa4b2" font-size="8.5" text-anchor="middle" transform="rotate(-90 30 108)">remaining error budget</text>
    <text x="300" y="196" fill="#9aa4b2" font-size="8.5" text-anchor="middle">time →</text>
    <text x="52" y="46" fill="#9aa4b2" font-size="7.5" text-anchor="end">100%</text>
    <line x1="56" y1="150" x2="524" y2="150" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="520" y="146" fill="#9aa4b2" font-size="7.5" text-anchor="end">threshold</text>
    <polyline points="58,46 200,168" fill="none" stroke="#e0733a" stroke-width="2.4"/>
    <polyline points="58,52 520,132" fill="none" stroke="#d6a45c" stroke-width="2.4"/>
    <text x="214" y="128" fill="#e0733a" font-size="8.7" text-anchor="start">burning fast: gone in hours</text>
    <text x="214" y="141" fill="#e0733a" font-size="8.7" text-anchor="start">→ Page (act now)</text>
    <text x="340" y="82" fill="#d6a45c" font-size="8.7" text-anchor="start">burning slowly: lasts to month end</text>
    <text x="340" y="95" fill="#d6a45c" font-size="8.7" text-anchor="start">→ Ticket (handle calmly)</text>
    <text x="290" y="210" fill="#9aa4b2" font-size="8.2" text-anchor="middle">Bind alerts to "how fast the error budget burns", not to causes like CPU</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Same error budget being spent, but the speed decides the urgency: gone within hours → Page immediately; a slow leak that lasts to month end → open a Ticket and handle it calmly. That's the spirit of "multi-window, multi-burn-rate" alerting</figcaption>
</figure>

## On-call: the goal is to stop the bleeding, not to be a hero

Once alerts are set, someone has to answer them. **On-call** is the responsibility of "carrying the pager, ready to step in at any time". A healthy on-call has a few requirements: **fair rotation** (don't let one person carry it), **a cap on Pages per shift** (exceeding it means the system or the alerts have a problem, and you fix that rather than gritting your teeth), **compensation**, and **a clear escalation path** (you know who to call when you can't handle it).

But the most important thing is **mindset**: when paged, the goal is **to mitigate fast, not to find and fix the root cause on the spot**. At 3am, with a foggy head and high pressure, the right moves are roll back, shift traffic, restart — **make users well first**, and leave the root cause for daytime, when you're awake and can investigate properly. Trust the **runbook / playbook**, follow the mitigation steps, and don't rely on heroics in the moment — because heroic firefighting doesn't scale and isn't sustainable: you save the day today, and tomorrow when you're on leave it blows up.

## Reflections

### Alert fatigue is the engineering version of "crying wolf"

What resonated most in this chapter is that it frames a psychological phenomenon as an engineering problem: **alert on everything and you've alerted on nothing.** Once people are numbed by noise, the genuine emergency gets ignored — that's crying wolf. So the first question I ask of an alerting system now isn't "is it complete enough" but "**how much of this doesn't actually need attention**". Every useless Page cut **buys back attention for the Page that truly matters**. It's in line with post 3's [[sre-toil|eliminating toil]] and my usual "less is more": an alert's value lies in precision, not volume.

### On-call's goal is to stop the bleeding, not to be the hero on the spot

I've seen (and been) the on-call who gets woken up and insists on digging out and fixing the root cause at 3am — working until dawn, and possibly shipping a fresh mess because the head wasn't clear. This chapter corrected me: **on-call's first duty is making users well (mitigation), not satisfying your own urge to "solve the puzzle".** Roll back, shift traffic, restart — the "inelegant but effective" moves matter far more at 3am than "finding the truth"; the truth can wait for daylight. And **trust the runbook** — write the mitigation steps into a manual anyone can follow rather than relying on one hero's reflexes; that's operations that scale and let you take leave with peace of mind.

### A healthy on-call is a loop that "improves itself"

One last takeaway: a good on-call system makes Pages **fewer and fewer**, rather than making people more and more tired. The key is that after every page, you seriously ask two questions: **can this be automated away ([[sre-toil|toil]])? Can it be fixed at the root (postmortem, next post)?** If your on-call handles the same batch of nonsense every week, that isn't simply "on-call is hard"; it's **nobody running the improvement loop**. So I treat on-call as a signal source: where it keeps hurting is exactly where the system most needs investment — **woken by the same thing a second time, fix it at the root, rather than resigning yourself to a third.**
