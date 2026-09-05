---
title: "SLI / SLO / SLA: A Measurement, a Target, a Contract"
date: 2026-07-09
category: tech
description: "The previous post said error budget = 1 − SLO, but what is an SLO? How does it differ from SLI and SLA, which almost everyone mixes up? In one line: the SLI is the number you measure, the SLO is the internal target you aim for, the SLA is your contract with customers. And the SLA is always looser than the SLO — that \"strict inside, loose outside\" buffer is reliability engineering's most mature move."
tags:
  - sre
  - reliability
series: "Google SRE — Reading Notes"
seriesOrder: 2
comments: true
draft: false
translationOf: sre-slo
---
[[sre-intro|The previous post]] said error budget = 1 − SLO. But what is an SLO? And how does it differ from the other two abbreviations almost everyone mixes up — SLI and SLA? Without telling these three apart, there's no talking about reliability. Remember it in one line first: **the SLI is the number you "measure", the SLO is the target you "aim for internally", the SLA is the contract you "promise customers".**

## A measurement, a target, a contract

The three nest outward, and **each threshold is looser than the last**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 210" role="img" aria-label="A reliability axis from 99% to 100%. The SLA threshold at 99.5% is the external contract that pays out when breached, the SLO threshold at 99.9% is the internal target, and the SLI at 99.95% is what's actually measured, sitting in the healthy zone. Below the SLA is the breach zone, between SLA and SLO is the missed-target safety buffer, above the SLO is healthy. Strictness: SLA less than SLO less than or equal to SLI" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="60" y="102" fill="#9aa4b2" font-size="7.5" text-anchor="start">99.0%</text>
    <text x="520" y="102" fill="#9aa4b2" font-size="7.5" text-anchor="end">100%</text>
    <text x="170" y="50" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">SLA 99.5%</text>
    <text x="170" y="63" fill="#9aa4b2" font-size="7.5" text-anchor="middle">external contract · breach pays out</text>
    <text x="340" y="50" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">SLO 99.9%</text>
    <text x="340" y="63" fill="#9aa4b2" font-size="7.5" text-anchor="middle">internal target (aim here)</text>
    <line x1="170" y1="70" x2="170" y2="150" stroke="#e0733a" stroke-width="1.3" stroke-dasharray="4 3"/>
    <line x1="340" y1="70" x2="340" y2="150" stroke="#4f6df5" stroke-width="1.3" stroke-dasharray="4 3"/>
    <rect x="60" y="110" width="110" height="30" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/>
    <text x="115" y="129" fill="#e0733a" font-size="8.5" text-anchor="middle">breach</text>
    <rect x="170" y="110" width="170" height="30" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="255" y="129" fill="#d6a45c" font-size="8.5" text-anchor="middle">missed target (not yet a breach)</text>
    <rect x="340" y="110" width="180" height="30" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <text x="415" y="129" fill="#54b890" font-size="8.5" text-anchor="middle">healthy</text>
    <circle cx="440" cy="125" r="6" fill="#54b890" stroke="#e6e6e6" stroke-width="1.2"/>
    <text x="452" y="122" fill="#54b890" font-size="9" text-anchor="start">← SLI 99.95%</text>
    <text x="452" y="133" fill="#9aa4b2" font-size="7.5" text-anchor="start">actually measured</text>
    <line x1="170" y1="158" x2="340" y2="158" stroke="#d6a45c" stroke-width="1.1"/>
    <text x="255" y="172" fill="#d6a45c" font-size="8.5" text-anchor="middle">safety buffer: feel the pain inside before the customer does</text>
    <text x="290" y="196" fill="#9aa4b2" font-size="8.7" text-anchor="middle">Strictness: SLA (loose) &lt; SLO (strict) ≤ SLI (measured when healthy)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The <b style="color:#54b890">SLI</b> is what you actually measure (99.95%); the <b style="color:#4f6df5">SLO</b> is the internal target you aim for (99.9%); the <b style="color:#e0733a">SLA</b> is the contract with customers (99.5%, breach pays out). The SLA is deliberately a notch looser than the SLO, and the stretch between them is the safety buffer you keep for yourself</figcaption>
</figure>

Taken apart:

- **SLI (Indicator)**: the reliability number you **actually measure**, e.g. "99.95% of requests succeed". It answers "how reliable are we right now?" — the raw material for monitoring and for computing the error budget.
- **SLO (Objective)**: the **internal target** you set on the SLI, e.g. "request success rate ≥ 99.9%". It answers "how reliable is reliable enough?" — [[sre-intro|error budget = 1 − SLO]] comes from here.
- **SLA (Agreement)**: your **promise to customers**, with a price for breaking it (refunds, compensation), e.g. "≥ 99.5%, or this month's fee is refunded". It answers "what happens if we don't make it?"

The key is the ordering: **the SLA is always looser than the SLO.** Because if the threshold you promise externally (SLA) were as high as your internal target (SLO), then the moment you miss the SLO you're in breach and paying out. Leave a buffer, so you get the alarm at "not yet in breach, but time to worry" — **feel the pain inside before the customer does.**

## What makes a good SLI

Of the three, the SLI is the root — SLO and SLA are thresholds built on top of it. So defining a **good** SLI matters a great deal. Good SLIs almost all have the same shape: **"good events" as a proportion of "valid events"**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 208" role="img" aria-label="SLI equals good events divided by valid events times 100%. Ten request boxes illustrate it, nine succeeded and one failed, SLI equals 90%. Four common kinds of good SLI: availability is successes over total requests, latency is fast-enough over total requests, correctness is correct over total, freshness is fresh-enough over total. Pick what users actually care about, not what's easy to measure" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="280" y="30" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">SLI = good events ÷ valid events × 100%</text>
    <rect x="90" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="128" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="166" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="204" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="242" y="48" width="34" height="28" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/>
    <rect x="280" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="318" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="356" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="394" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="432" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <text x="280" y="94" fill="#9aa4b2" font-size="8.5" text-anchor="middle">9 succeeded / 10 requests = 90% (illustrative)</text>
    <text x="60" y="120" fill="#9aa4b2" font-size="9" text-anchor="start" font-weight="bold">Common good SLIs:</text>
    <rect x="40" y="128" width="245" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="52" y="146" fill="#e6e6e6" font-size="8.8" text-anchor="start">availability: successful / total requests</text>
    <rect x="295" y="128" width="245" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="307" y="146" fill="#e6e6e6" font-size="8.8" text-anchor="start">latency: fast enough (&lt;300ms) / total requests</text>
    <rect x="40" y="160" width="245" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="52" y="178" fill="#e6e6e6" font-size="8.8" text-anchor="start">correctness: correct results / total</text>
    <rect x="295" y="160" width="245" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="307" y="178" fill="#e6e6e6" font-size="8.8" text-anchor="start">freshness: fresh enough data / total</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">A good SLI is the ratio "good events / valid events", and it must be something <b>users actually care about</b> — did their request succeed? Was it fast enough? Was the result right? Is the data fresh enough? Internal metrics like CPU and memory aren't SLIs, because users never feel them</figcaption>
</figure>

The most common mistake is using "what's easy for you to measure" as the SLI — a pile of CPU, memory and disk numbers. But those are **causes**, not **what the user experiences**. An SLI has to follow the user's journey: did the request they sent succeed? Did it come back fast enough? That forces you to define "good" from the user's point of view, not the datacenter's.

## How to set an SLO, and why the SLA has to be looser

A few points for setting SLOs: **don't set 100%** ([[sre-intro|the previous post]] covered why — too expensive and imperceptible); express it as "**time window + percentage**", e.g. "over the past 28 days, 99.9% of requests succeed"; and work backwards from **user experience** — a little above the line where users start complaining is a reasonable SLO.

For the SLA, remember two things: **not every service needs an SLA** (internal services usually need only an SLO); and **the SLA is always looser than the SLO** — the SLO is your own early alarm, forcing you to turn back and fix things before an actual breach costs money. It all comes back to the [[sre-intro|error budget]]: set the SLO, and `1 − SLO` is the budget you can spend over the period, while the measured SLI tells you how much you've spent. **The SLI measures the present, the SLO sets the target, the error budget governs the pace, the SLA holds the floor** — four things on one thread.

## Reflections

### "Strict inside, loose outside" is the most mature move I know

The SLA being looser than the SLO may look redundant at first glance, but it hides very mature thinking: **set yourself a higher standard than what you promise externally, as an early alarm.** Reacting only when the customer's line (the SLA) is crossed is already too late — money to pay, apologies to make, trust already lost. Set a stricter internal line (the SLO) first, and act at "nothing's broken yet, but the signs are bad". This discipline of "feel the pain yourself before the customer does" applies, I think, far beyond reliability — behind any external promise there should be a stricter internal demand cushioning it.

### Good metrics pick "what users care about", not "what's easy to measure"

I've seen too many monitoring dashboards full of CPU, memory and QPS — good-looking, easy to collect, and not one of them answers "are users happy right now". Defining SLIs forced me to switch seats: **standing at the user's end, what do they look at to judge whether the service is good?** Almost always "did it succeed, was it fast, was it right, was it fresh", never the resource numbers in my datacenter. The switch is basic, yet it's the root cause of many teams monitoring for ages without hitting the point — **you're measuring your convenience, not their experience.**

### An SLO is a "deliberately written-down imperfection"

This post and [[sre-intro|the previous one]] together are really about one thing: **first have a ruler everyone agrees on, and only then can everything else (error budget, release decisions, alerting) stand up.** And the essence of that ruler is quantifying, stating and writing down the vague consensus of "how stable is enough". Without an SLO the team talks past each other forever about "stable or not", the error budget can't be computed, and alerts don't know whether to fire. Explicitly defining "good enough" sounds unremarkable, yet it's the true starting point of reliability engineering — **only a target that's written down can be managed.**
