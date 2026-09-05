---
title: "Testing for Reliability: Tests Don't Prove the Absence of Bugs, They Let You Move Fast"
date: 2026-07-13
category: tech
description: "Reliability isn't achieved by \"not changing\" — you have to change. The point of testing is to turn each change from a \"gamble\" into a \"confident step\", so you dare to release small and often. This post covers the test pyramid (many at the bottom, few at the top), why green doesn't mean Production is healthy (canary uses real traffic as the last test), and why a flaky test is the testing world's \"crying wolf\"."
tags:
  - sre
  - reliability
series: "Google SRE — Reading Notes"
seriesOrder: 9
comments: true
draft: false
translationOf: sre-testing
---
This post is about something usually filed under "the developers' business" that is in fact **a cornerstone of reliability**: testing. The key idea first: **reliability isn't achieved by "not changing"** — you have to change (fix bugs, add features, alter config), and every change is a gamble. The point of testing is to turn that gamble into **a confident step forward**, so you dare to release small and often (which is exactly what the [[sre-intro|error budget]] wants: changes you can afford, and can back out of).

## The test pyramid: many at the bottom, few at the top

Tests come in layers, and **their numbers should form a pyramid** — many at the bottom (cheap, fast, stable), few at the top (expensive, slow, brittle):

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 224" role="img" aria-label="The three-layer test pyramid. Bottom: Unit tests, the most numerous, fastest and most stable, testing single functions. Middle: Integration tests, testing several components assembled. Top: E2E end-to-end tests, the fewest, slowest and most brittle, walking the full path like a user. Lower is more, faster, stabler; higher is fewer, slower, more brittle. Inverting it, many E2E and few unit tests, is an anti-pattern: slow, flaky, hard to localise." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <polygon points="200,40 152,88 248,88" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="200" y="72" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">E2E</text>
    <polygon points="152,90 248,90 298,136 102,136" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="200" y="118" fill="#4f6df5" font-size="9.5" text-anchor="middle" font-weight="bold">Integration</text>
    <polygon points="102,138 298,138 348,184 52,184" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="200" y="166" fill="#54b890" font-size="9.5" text-anchor="middle" font-weight="bold">Unit</text>
    <text x="380" y="66" fill="#d6a45c" font-size="8.3" text-anchor="start">↑ few, slow, brittle (full user path)</text>
    <text x="380" y="118" fill="#9aa4b2" font-size="8.3" text-anchor="start">components assembled (service + DB…)</text>
    <text x="380" y="170" fill="#54b890" font-size="8.3" text-anchor="start">↓ many, fast, stable (one function)</text>
    <line x1="366" y1="52" x2="366" y2="182" stroke="#3a4154" stroke-width="1.1"/>
    <text x="290" y="208" fill="#9aa4b2" font-size="8.3" text-anchor="middle">Inverted (lots of E2E, few unit) = anti-pattern: slow, flaky, and hard to tell which layer broke</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#54b890">Unit</b> at the bottom is fast and stable and should be the vast majority; <b style="color:#4f6df5">Integration</b> tests between components; <b style="color:#d6a45c">E2E</b> at the top is closest to a real user but also slowest and most brittle, so keep it sparing. Inverting the pyramid (a pile of E2E) is a common anti-pattern — slow to run, and often red for no clear reason</figcaption>
</figure>

## Green doesn't mean Production is healthy: finish with a canary

But here's a truth SRE particularly cares about: **all tests green only means "the scenarios you thought to test" passed** — real-world traffic, data and timing always contain something you didn't test. So passing in the test environment isn't enough; the last line of defence is the **canary release**: the new version first goes to a small slice of real traffic, you watch the SLIs, and only if all is well do you roll it out fully:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 208" role="img" aria-label="Canary release. Incoming traffic is split: the current v1 takes 95%, the new v2 takes only 5% as the canary. Monitoring watches v2's SLI and error budget: if the SLI holds, v2 is gradually widened to 100%; if the SLI breaks, roll back immediately, and only that 5% of users were affected." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="cy" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="16" y="86" width="62" height="34" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="47" y="107" fill="#e6e6e6" font-size="9" text-anchor="middle">traffic</text>
    <line x1="78" y1="103" x2="120" y2="70" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cy)"/>
    <line x1="78" y1="103" x2="120" y2="138" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cy)"/>
    <rect x="122" y="52" width="180" height="34" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="212" y="73" fill="#e6e6e6" font-size="8.7" text-anchor="middle">current v1 · 95% of traffic</text>
    <rect x="122" y="122" width="180" height="34" rx="6" fill="#33291a" stroke="#d6a45c" stroke-width="1.6"/><text x="212" y="143" fill="#e6e6e6" font-size="8.7" text-anchor="middle">new v2 · 5% (canary)</text>
    <line x1="302" y1="139" x2="340" y2="139" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cy)"/>
    <rect x="342" y="122" width="104" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="394" y="138" fill="#e6e6e6" font-size="8" text-anchor="middle">watch SLI /</text><text x="394" y="149" fill="#e6e6e6" font-size="8" text-anchor="middle">error budget</text>
    <line x1="446" y1="130" x2="474" y2="106" stroke="#54b890" stroke-width="1.2" marker-end="url(#cy)"/>
    <line x1="446" y1="148" x2="474" y2="172" stroke="#e0733a" stroke-width="1.2" marker-end="url(#cy)"/>
    <text x="480" y="100" fill="#54b890" font-size="8.3" text-anchor="start">✓ holds → widen to 100%</text>
    <text x="480" y="176" fill="#e0733a" font-size="8.3" text-anchor="start">✗ breaks → roll back, 5% hit</text>
    <text x="290" y="198" fill="#9aa4b2" font-size="8.2" text-anchor="middle">A small slice of real traffic as the last test — after green, bet a small stake, not the whole pot</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">A canary turns "bet the whole pot" into "bet a small stake first": the new version takes only 5% of traffic while you watch its SLI; widen when it holds, roll back at once when it breaks, with only 5% of users affected. It's really "using real traffic as a test"</figcaption>
</figure>

Two more that are often overlooked: **configuration needs testing too** — many outages come from changing config rather than code, and config often ships untested; and **proactive disaster drills** — [[sre-intro|Chaos Monkey]] style, deliberately injecting faults to test "what happens when it breaks", not just "what happens when it's fine".

## Flaky tests are the testing world's "crying wolf"

One last disease that must be cured: the **flaky test** — occasionally red, green again on re-run. It's more toxic than no test at all, because it trains the whole team into the habit of "red light, re-run first, it usually passes", so **genuine red lights get ignored too**. It's the same disease as [[sre-alerting-oncall|alert fatigue]]: noise numbs the signal. My rule is hard: **a flaky test gets fixed the same day or removed**, never left — left alone, it slowly corrodes the whole team's trust in "green".

## Reflections

### The purpose of tests isn't "proving there are no bugs", it's "letting you move fast"

When I was younger I treated tests as a checkpoint to "prove my code has no problems" — high pressure and frustrating (because you can never finish proving it). Then the mindset shifted: **tests can't prove the absence of bugs (you can't enumerate everything), but they drastically lower the risk of a change — and once the risk is low, you dare to move forward in frequent small steps.** Reliability has never been bought with "change less, don't touch it"; it's bought with "dare to verify often". That's fully consistent with the [[sre-intro|error budget]] and with what I said about K8s rolling updates: "make change reversible, and people dare to move forward often". Treat tests as an **accelerator**, not a **roadblock**, and your relationship with them straightens out.

### Green only means "the ones you tested" passed

All tests green feels great, but what it guarantees stops at "the scenarios you originally thought to test". Real-world traffic distributions, dirty data, odd timings are always outside your tests. So I learned not to treat "tests passed" as "definitely fine", but as "risk lowered enough to let a small slice of real traffic verify it" — then finish with a canary. **The test environment gives you the confidence to bet; the canary lets you bet only a small stake.** That mindset of "stake in batches, watch as you go" is far more practical than chasing "test everything watertight before launch" — because the latter simply can't be done.

### Flaky tests corrode the whole team's judgement

A test that's occasionally red damages more than itself; it damages **the credibility of the whole test suite**. Once "red = just re-run" becomes the team's muscle memory, you've effectively muted the alarm system — when something is genuinely wrong, that red light earns only one more unconscious re-run. It's the same thing as [[sre-alerting-oncall|alerting]] and my constant "signals must be precise": **better one fewer test than one test that lies.** Maintaining the "credibility" of tests matters as much as maintaining their "coverage" — a green light nobody believes is no different from no light at all.
