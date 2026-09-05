---
title: "Monitoring: The Four Golden Signals"
date: 2026-07-10
category: tech
description: "Monitoring isn't \"collecting a pile of numbers\"; it's answering two questions: is it broken? Is it about to break? But what should you measure? Google distilled it down to four — latency, traffic, errors, saturation. If a service could watch only four metrics, watch these. One more key point: don't look at the mean, it hides the long tail; look at p99."
tags:
  - sre
  - monitoring
series: "Google SRE — Reading Notes"
seriesOrder: 4
comments: true
draft: false
translationOf: sre-monitoring
---
[[sre-slo|The previous post]] said the SLI is the measured reliability number — and those numbers come from monitoring. But where monitoring most easily goes wrong is treating it as "the more numbers collected, the better", ending up with a hundred charts on the dashboard and no way to find the point when something actually breaks. This post covers Google's distilled answer: if a service could watch only four metrics, which four — **the four golden signals**.

## Monitoring only has to answer two questions

Let's be clear about the purpose first. Monitoring isn't for pretty dashboards; it's for answering two questions: **"is it broken right now?"** (real-time detection) and **"is it about to break?"** (trend warning). Hold on to those two questions and you won't fall into the trap of "measure everything, see nothing". And what answers both, while covering nearly all of a user-facing service's health, is these four signals:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 262" role="img" aria-label="The four golden signals around your service: latency, how long a request takes to return, separating success from failure; traffic, how busy the system is, QPS; errors, how many requests fail, including 200 responses with wrong content; saturation, how close to the limit, the best early warning. The first three are user experience and can be SLIs; the fourth is a warning of how long you can hold" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="290" y1="134" x2="134" y2="68" stroke="#3a4154" stroke-width="1.1"/>
    <line x1="290" y1="134" x2="446" y2="68" stroke="#3a4154" stroke-width="1.1"/>
    <line x1="290" y1="134" x2="134" y2="200" stroke="#3a4154" stroke-width="1.1"/>
    <line x1="290" y1="134" x2="446" y2="200" stroke="#3a4154" stroke-width="1.1"/>
    <rect x="240" y="112" width="100" height="44" rx="8" fill="#262b3a" stroke="#e6e6e6" stroke-width="1.5"/>
    <text x="290" y="139" fill="#e6e6e6" font-size="11" text-anchor="middle">your service</text>
    <rect x="28" y="40" width="212" height="56" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="40" y="60" fill="#4f6df5" font-size="10.5" text-anchor="start" font-weight="bold">① Latency</text>
    <text x="40" y="75" fill="#9aa4b2" font-size="8.5" text-anchor="start">how long until a request returns?</text>
    <text x="40" y="88" fill="#9aa4b2" font-size="8" text-anchor="start">track success and failure latency separately</text>
    <rect x="340" y="40" width="212" height="56" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="352" y="60" fill="#54b890" font-size="10.5" text-anchor="start" font-weight="bold">② Traffic</text>
    <text x="352" y="75" fill="#9aa4b2" font-size="8.5" text-anchor="start">how busy is the system right now?</text>
    <text x="352" y="88" fill="#9aa4b2" font-size="8" text-anchor="start">QPS / requests per second</text>
    <rect x="28" y="172" width="212" height="56" rx="8" fill="#262b3a" stroke="#e0733a" stroke-width="1.5"/>
    <text x="40" y="192" fill="#e0733a" font-size="10.5" text-anchor="start" font-weight="bold">③ Errors</text>
    <text x="40" y="207" fill="#9aa4b2" font-size="8.5" text-anchor="start">how many requests failed?</text>
    <text x="40" y="220" fill="#9aa4b2" font-size="8" text-anchor="start">failure rate (incl. "200 but the content is wrong")</text>
    <rect x="340" y="172" width="212" height="56" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="352" y="192" fill="#d6a45c" font-size="10.5" text-anchor="start" font-weight="bold">④ Saturation</text>
    <text x="352" y="207" fill="#9aa4b2" font-size="8.5" text-anchor="start">how close to the limit?</text>
    <text x="352" y="220" fill="#9aa4b2" font-size="8" text-anchor="start">resource utilisation → the best early warning</text>
    <text x="290" y="252" fill="#9aa4b2" font-size="8.7" text-anchor="middle">First three = user experience (usable directly as SLIs); the fourth, saturation = how long you can hold</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The four golden signals. The first three (latency, traffic, errors) track user experience and can be used directly as SLIs; the fourth (saturation) measures "how much headroom is left" and is the best early warning of the four</figcaption>
</figure>

The point of each:

- **Latency**: how long a request takes to return. One trap — **always separate the latency of successes from failures**. Failed requests can be very fast (a straight 500) or very slow (stuck until timeout), and mixing them into the successes badly distorts the average.
- **Traffic**: how busy the system is, usually QPS or transactions per second. It's the backdrop for understanding the other three — did latency rise because traffic spiked, or because the system has a problem?
- **Errors**: the proportion of failed requests. Watch for "hidden failures" — a 200 with wrong content; and "policy failures" — responses so slow they count as failures for you.
- **Saturation**: how full the system is, how close to its limit (CPU, memory, connection pool utilisation). It's the hardest to measure, yet **the best early warning** — because it tells you "how long you can hold", not "it's already down".

## Don't look at the mean; the mean lies

The second concept you must build: **when looking at latency (or any distribution), don't look at the mean, look at the distribution — especially p99.** The mean is the most deceptive, because it hides the long tail:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 226" role="img" aria-label="A histogram of latency: most requests are fast, forming a peak on the left, with a long tail trailing to the right. The mean of about 120ms looks fine, but p99 sits in the tail at about 850ms, meaning 1% of users have a terrible experience that the mean doesn't show at all. So look at the distribution and p99, not the mean" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <line x1="56" y1="182" x2="524" y2="182" stroke="#3a4154" stroke-width="1.3"/>
    <line x1="56" y1="182" x2="56" y2="34" stroke="#3a4154" stroke-width="1.3"/>
    <text x="300" y="202" fill="#9aa4b2" font-size="9" text-anchor="middle">latency (ms) →</text>
    <text x="32" y="108" fill="#9aa4b2" font-size="9" text-anchor="middle" transform="rotate(-90 32 108)">requests ↑</text>
    <rect x="64" y="142" width="30" height="40" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="102" y="72" width="30" height="110" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="140" y="52" width="30" height="130" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="178" y="82" width="30" height="100" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="216" y="112" width="30" height="70" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="254" y="134" width="30" height="48" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="292" y="150" width="30" height="32" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="330" y="160" width="30" height="22" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="368" y="166" width="30" height="16" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="406" y="170" width="30" height="12" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="444" y="173" width="30" height="9" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="482" y="175" width="30" height="7" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <line x1="200" y1="44" x2="200" y2="182" stroke="#9aa4b2" stroke-width="1.4" stroke-dasharray="4 3"/>
    <text x="200" y="38" fill="#9aa4b2" font-size="8.7" text-anchor="middle">mean ≈120ms</text>
    <text x="200" y="28" fill="#9aa4b2" font-size="8" text-anchor="middle">(looks fine)</text>
    <line x1="459" y1="44" x2="459" y2="182" stroke="#e0733a" stroke-width="1.6" stroke-dasharray="4 3"/>
    <text x="459" y="38" fill="#e0733a" font-size="8.7" text-anchor="middle">p99 ≈850ms</text>
    <text x="459" y="28" fill="#e0733a" font-size="8" text-anchor="middle">(this 1% hurts)</text>
    <text x="300" y="220" fill="#9aa4b2" font-size="8.5" text-anchor="middle">The mean hides the tail: a few users suffer badly and the mean shows nothing → watch p99, not the mean</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Most requests are fast and pull the mean down; but the 1% in the tail (p99) may have waited nearly a second. The mean reports "120ms, healthy" while that group is cursing — which is why SLIs and SLOs almost always use percentiles, not means</figcaption>
</figure>

That also explains why [[sre-slo|the previous post]]'s SLIs/SLOs almost all use percentiles ("99% of requests < 300ms") rather than "mean < 300ms". **The mean flatters you; p99 is honest with your users.**

## Alert on symptoms, and use black-box and white-box together

Two last points, leading into the next post. First, **monitoring should watch "symptoms", not "causes"**: what users care about is "the page won't load" (a symptom), not "CPU is high on some DB" (a cause — which may not have affected anyone). That's why the golden signals work so well: they're symptoms by nature. Second, **use black-box and white-box monitoring together**: black-box hits your service from outside like a user does ("is it actually up right now"), white-box looks at internal metrics from inside (helping you find "why" when something breaks). Black-box catches symptoms, white-box finds causes — use them as a pair. As for "when to wake someone up", that's the next post on alerting.

## Reflections

### The discipline of "only four" beats "measure everything"

Nine times out of ten, the monitoring problems I've seen weren't "measuring too little" but "measuring too much, too messily" — hundreds of charts nobody really understood, and when something broke everyone fished around in a sea of dashboards without finding the point. The value of the four golden signals isn't which four it lists; it's that it **forces focus**: get these four right first, then talk about the rest. It's the same habit I bring to anything — [[pain-before-power|grab the few that matter most]] rather than greedily wanting everything. Monitoring maturity is daring to watch only the few signals that truly matter.

### The mean is the most deceptive statistic

"Don't look at the mean, look at p99" applies far beyond monitoring, I think. The very nature of a mean is to flatten differences, and **the real problem is usually hiding in the flattened tail** — true of latency, of cost, of response time, even of team load. The few extreme values (the 1% of users who waited a second, the handful of oversized requests) are what bite you, and the mean makes them invisible. So whenever I look at any metric now, my reflex is to ask "is this a mean? What does the distribution look like? What about the tail?" — having been reassured by a mean too many times, I learned.

### Alert on symptoms, not causes

This principle changed how I design monitoring. I used to be unable to resist setting alerts on every internal metric (CPU, memory, queue length), and got woken at night by a pile of causes that "didn't actually affect users". Then it clicked: **what should wake a person is a symptom (users are affected); causes are clues you need when diagnosing.** Tying alerts to symptoms (golden signals, SLIs) not only removes a pile of false alarms, it aligns "when to worry" with "are users hurting". Which is exactly what the next post unfolds: alerting — under what conditions to wake someone up.
