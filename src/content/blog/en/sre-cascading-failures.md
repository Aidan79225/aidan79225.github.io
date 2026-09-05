---
title: "Cascading Failures and Overload: Don't Let One Server Take Down the Rest"
date: 2026-07-13
category: tech
description: "The scariest failure isn't one machine breaking; it's one machine breaking and knocking over dominoes until the whole system is down — a cascading failure. Its most common accelerator is the retry storm: failures trigger retries, retries add load, load creates more failures, a positive feedback loop. This post covers how cascading failures happen, and the three things to do under overload — shed load, degrade gracefully, apply backpressure — instead of swallowing everything until it all rots together."
tags:
 - sre
 - reliability
series: "Google SRE — Reading Notes"
seriesOrder: 10
comments: true
draft: false
translationOf: sre-cascading-failures
---
[[sre-intro|The first post]] said the goal of reliability is "keeps working when things go wrong". But one kind of failure is especially nasty, because it **amplifies itself**: a small problem knocks over dominoes and takes the whole system down within minutes — the **cascading failure**. Its most frightening property is that an overloaded system doesn't slow down linearly; it **falls off a cliff**.

## Cascading failure: how a small fault snowballs into a disaster

The classic script: one machine overloads and goes down, its traffic shifts to the others, so they overload and go down too, one crushing the next like dominoes:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 226" role="img" aria-label="Cascading failure as dominoes: Server A overloads and falls first, its traffic shifts to Server B which also overloads and falls, then everything lands on Server C which falls too, a domino wipeout. Below, the retry storm positive feedback loop: requests fail or slow, clients retry, total load rises, causing more failures, fuel on the fire." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
 <defs><marker id="cf" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="cfr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e0733a"/></marker></defs>
 <text x="290" y="22" fill="#9aa4b2" font-size="9.5" text-anchor="middle">one falls → shifted traffic crushes the next → domino wipeout</text>
 <rect x="30" y="38" width="150" height="50" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.5"/><text x="105" y="58" fill="#e6e6e6" font-size="9.5" text-anchor="middle" font-weight="bold">Server A</text><text x="105" y="74" fill="#e0733a" font-size="8" text-anchor="middle">overloads first → down ✗</text>
 <rect x="215" y="38" width="150" height="50" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.5"/><text x="290" y="58" fill="#e6e6e6" font-size="9.5" text-anchor="middle" font-weight="bold">Server B</text><text x="290" y="74" fill="#e0733a" font-size="8" text-anchor="middle">takes A's traffic → down ✗</text>
 <rect x="400" y="38" width="150" height="50" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.5"/><text x="475" y="58" fill="#e6e6e6" font-size="9.5" text-anchor="middle" font-weight="bold">Server C</text><text x="475" y="74" fill="#e0733a" font-size="8" text-anchor="middle">gets everything → down ✗</text>
 <line x1="180" y1="63" x2="213" y2="63" stroke="#e0733a" stroke-width="1.3" marker-end="url(#cfr)"/>
 <line x1="365" y1="63" x2="398" y2="63" stroke="#e0733a" stroke-width="1.3" marker-end="url(#cfr)"/>
 <text x="290" y="120" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">and the retry storm pours fuel on the fire:</text>
 <rect x="44" y="132" width="132" height="30" rx="5" fill="#262b3a" stroke="#e0733a" stroke-width="1.2"/><text x="110" y="151" fill="#e6e6e6" font-size="8.3" text-anchor="middle">requests fail / slow</text>
 <rect x="224" y="132" width="132" height="30" rx="5" fill="#262b3a" stroke="#e0733a" stroke-width="1.2"/><text x="290" y="151" fill="#e6e6e6" font-size="8.3" text-anchor="middle">clients retry</text>
 <rect x="404" y="132" width="132" height="30" rx="5" fill="#262b3a" stroke="#e0733a" stroke-width="1.2"/><text x="470" y="151" fill="#e6e6e6" font-size="8.3" text-anchor="middle">total load rises</text>
 <line x1="176" y1="147" x2="222" y2="147" stroke="#e0733a" stroke-width="1.2" marker-end="url(#cfr)"/>
 <line x1="356" y1="147" x2="402" y2="147" stroke="#e0733a" stroke-width="1.2" marker-end="url(#cfr)"/>
 <path d="M470,162 C470,196 110,196 110,164" fill="none" stroke="#e0733a" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#cfr)"/>
 <text x="290" y="214" fill="#9aa4b2" font-size="8" text-anchor="middle">positive feedback: more failure → more retries → more failure (self-amplifying)</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The two engines of a cascading failure: <b>traffic shifting</b> makes a fault topple servers like dominoes; the <b>retry storm</b> is positive feedback — failures trigger retries, retries add load, load creates more failures, and a small problem snowballs into a site-wide collapse in minutes</figcaption>
</figure>

Beyond the retry storm there's the **thundering herd**: a cache expires or a service restarts, and a flood of requests hits the backend at the same moment and flattens it. What they share is **many requests squeezing through at the same time, in the same direction**.

## Under overload, protect actively — don't swallow

Faced with overload, an engineer's instinct is often "serve as many as we can" — and that's exactly where the disaster starts: swallowing everything means the queue explodes, resources run out, and then **everyone rots together**. The right approach is **active protection**:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 226" role="img" aria-label="Two responses to overload. Left, swallow it passively: overload hits, accept everything and queue forever, resources exhausted and everything collapses off a cliff. Right, protect actively: load shedding drops some requests with a 503 to save the rest; graceful degradation falls back to stale cache or turns off secondary features; backpressure tells upstream I'm full so upstream slows down. A circuit breaker can be added too: if a downstream keeps failing, stop calling it and fail fast." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
 <line x1="280" y1="16" x2="280" y2="184" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
 <text x="140" y="28" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">❌ swallow it all (passive)</text>
 <rect x="44" y="42" width="188" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="138" y="58" fill="#e6e6e6" font-size="8.5" text-anchor="middle">overload hits</text>
 <rect x="44" y="76" width="188" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="138" y="92" fill="#e6e6e6" font-size="8.5" text-anchor="middle">accept everything, queue forever</text>
 <rect x="44" y="110" width="188" height="24" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="138" y="126" fill="#e6e6e6" font-size="8.5" text-anchor="middle">resources exhausted → cliff collapse</text>
 <line x1="138" y1="66" x2="138" y2="74" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cf)"/>
 <line x1="138" y1="100" x2="138" y2="108" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cf)"/>
 <text x="138" y="158" fill="#9aa4b2" font-size="8.2" text-anchor="middle">try to serve all, lose all</text>
 <text x="430" y="28" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">✓ protect actively</text>
 <rect x="300" y="40" width="260" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="314" y="52" fill="#54b890" font-size="8.5" text-anchor="start" font-weight="bold">① Load shedding</text><text x="314" y="64" fill="#9aa4b2" font-size="7.8" text-anchor="start">drop some (return 503), save the rest</text>
 <rect x="300" y="76" width="260" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="314" y="88" fill="#54b890" font-size="8.5" text-anchor="start" font-weight="bold">② Graceful degradation</text><text x="314" y="100" fill="#9aa4b2" font-size="7.8" text-anchor="start">stale cache / switch off extras → good enough</text>
 <rect x="300" y="112" width="260" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="314" y="124" fill="#54b890" font-size="8.5" text-anchor="start" font-weight="bold">③ Backpressure</text><text x="314" y="136" fill="#9aa4b2" font-size="7.8" text-anchor="start">tell upstream "I'm full" → upstream slows down</text>
 <text x="430" y="158" fill="#9aa4b2" font-size="8.2" text-anchor="middle">partial success &gt; total failure</text>
 <text x="290" y="204" fill="#9aa4b2" font-size="8.3" text-anchor="middle">Also: a circuit breaker — downstream keeps failing? stop calling it, fail fast, protect both sides</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The rule under overload is <b>"partial success &gt; total failure"</b>: deliberately drop some (load shedding), fall back to a good-enough degraded version (degradation), or pass "I'm full" upstream (backpressure). Insist on serving everyone, and everyone goes down together</figcaption>
</figure>

## A few moves that keep cascades from happening

Condensed into a practical list:

- **Retry with restraint**: cap the count, use **exponential backoff + jitter** (don't let everyone retry at once), keep a **retry budget** (an upper bound on total retries). Unrestrained retries are the biggest accomplice of cascading failure.
- **Circuit breaker**: when a downstream keeps failing, **stop calling it** (fail fast), give it room to breathe and don't let it drag you down; probe again after a while.
- **Rate limiting / concurrency limits**: block the excess at the door instead of letting it in to queue.
- **Capacity planning + load shedding**: keep headroom in normal times, shed actively under overload — **drop before you collapse, not after.**

## Reflections

### What makes cascading failure terrifying is the positive feedback

Ordinary failures are linear and local: one machine breaks, you're down one machine. Cascading failure is scary because it has **positive feedback** — failures trigger retries, retries add load, load makes more failures, self-amplifying into a whirlpool that sucks the whole system in. So when I look at a system I'm especially wary of any loop where "**failure makes things worse**": retries without backoff, cache expiry without protection, downstream calls without a circuit breaker — buried positive-feedback bombs, invisible in normal times, and a few minutes from site-wide collapse once lit. **Finding and cutting these amplification loops matters far more than firefighting afterwards.**

### Under overload, "partial success" beats "total failure" by a mile

Load shedding sounds backwards the first time: the system is already struggling, and you deliberately throw requests away? It clicks once you think it through — **insist on serving everyone and you lose everyone; drop 10% and you keep 90%.** 10% of users getting a crisp 503 is far better than 100% of users timing out together. This trade of "lossy but controlled > lossless but out of control" is exactly the spirit of the [[sre-intro|error budget]] and of SLOs: **admit you can't have it all, then pick a point you can hold.** A mature system isn't one that "never refuses"; it's one that "knows how to refuse, at the right time, with dignity".

### Backpressure: honestly telling upstream "I'm full"

The move I admire most is backpressure. The healthiest systems **honestly express their limits** — when full, they signal upstream so upstream slows down, instead of pretending they can still swallow and then collapsing together. That's a kind of humility. I saw the elegant version of the same idea along the [[kafka-intro|Kafka]] line: when a consumer can't keep up, it **pulls at its own pace** rather than being pushed over by the producer — the pull model comes with backpressure built in. Saying "I can't, please slow down" honestly to whoever is upstream is the most underrated virtue in distributed systems, and in teamwork too: **the one who toughs it out and swallows everything is usually the one who drags the whole group down.**
