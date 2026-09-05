---
title: "The Three Cache Disasters: Penetration, Breakdown, Avalanche, and the Right Fixes"
date: 2026-07-17
category: tech
description: "Using Redis as a cache, the classic pattern is cache-aside, but it has three famous breaches: penetration (querying a key that doesn't exist at all, which the cache can never block), breakdown (a single hot key expires at just the wrong moment and every concurrent request rushes to the DB), and avalanche (a large number of keys expire at the same time and the DB is flattened across the board). The three names sound alike and are often confused, but they're three different failures — penetration is querying the nonexistent, breakdown is one hot spot, avalanche is a whole swath. This post separates them clearly and matches the cure to each: cache empty results plus a Bloom filter, rebuild under a mutex, spread TTLs with random jitter."
tags:
  - redis
  - cache
series: "Redis — Learning Notes"
seriesOrder: 6
comments: true
draft: false
translationOf: redis-cache-patterns
---
Using Redis as a cache, the classic pattern is **cache-aside**: a read checks the cache first, returns on a hit, and only on a miss queries the database and writes the result back into the cache. It works fine day to day — until, in certain situations, **a flood of requests bypasses the cache and flattens the database behind it**. That class of breach has three famous names: **penetration, breakdown, avalanche**. They sound alike and are often confused, but they're three different failures, each with its own cure.

## The three siblings look different: penetration / breakdown / avalanche

First, the **differences** — understand where each one "breaches", and you won't apply the wrong cure:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 210" role="img" aria-label="The three cache disasters compared. Penetration is querying a key that doesn't exist at all, in neither the cache nor the database, so the cache can never block it and every request reaches the database. Breakdown is a single hot key expiring at just the wrong moment, so a burst of concurrent requests all miss at once and rush to the database to rebuild. Avalanche is many keys expiring at the same time, misses across the board that crush the database and trigger a cascade. All three share requests bypassing the cache and flattening the database; the difference is the breach: a nonexistent key, one hot spot, a whole swath." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Three breaches, three different shapes</text>
    <rect x="10" y="32" width="182" height="130" rx="8" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.4"/>
    <text x="101" y="52" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">Penetration</text>
    <rect x="30" y="62" width="142" height="24" rx="4" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="101" y="78" fill="#e6e6e6" font-size="8" text-anchor="middle">query a "nonexistent" key</text>
    <text x="101" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">not in cache, not in DB</text>
    <text x="101" y="122" fill="#9aa4b2" font-size="8" text-anchor="middle">→ cache can never block it</text>
    <text x="101" y="146" fill="#e0733a" font-size="8.6" text-anchor="middle" font-weight="bold">every one hits the DB</text>
    <rect x="199" y="32" width="182" height="130" rx="8" fill="#3a3320" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="290" y="52" fill="#d6a45c" font-size="10" text-anchor="middle" font-weight="bold">Breakdown</text>
    <rect x="219" y="62" width="142" height="24" rx="4" fill="#1f2330" stroke="#d6a45c" stroke-width="1"/><text x="290" y="78" fill="#e6e6e6" font-size="8" text-anchor="middle">one hot key ⏰ just expired</text>
    <text x="290" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">a burst of concurrent misses</text>
    <text x="290" y="122" fill="#9aa4b2" font-size="8" text-anchor="middle">→ all rush to rebuild from DB</text>
    <text x="290" y="146" fill="#d6a45c" font-size="8.6" text-anchor="middle" font-weight="bold">concentrated on one point</text>
    <rect x="388" y="32" width="182" height="130" rx="8" fill="#3a2632" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="479" y="52" fill="#e05a7d" font-size="10" text-anchor="middle" font-weight="bold">Avalanche</text>
    <rect x="408" y="62" width="142" height="24" rx="4" fill="#1f2330" stroke="#e05a7d" stroke-width="1"/><text x="479" y="78" fill="#e6e6e6" font-size="8" text-anchor="middle">many keys ⏰ expire together</text>
    <text x="479" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">(or Redis goes down entirely)</text>
    <text x="479" y="122" fill="#9aa4b2" font-size="8" text-anchor="middle">→ misses across the board</text>
    <text x="479" y="146" fill="#e05a7d" font-size="8.6" text-anchor="middle" font-weight="bold">DB collapses → cascade</text>
    <text x="290" y="184" fill="#9aa4b2" font-size="8.4" text-anchor="middle">in common: requests bypass the cache and flatten the DB; the difference is the breach —</text>
    <text x="290" y="200" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">a nonexistent key (penetration) · one hot spot (breakdown) · a whole swath (avalanche)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The difference in one sentence: <b style="color:#e0733a">penetration</b> queries data that "<b>doesn't exist</b>", in neither cache nor DB, so every single request reaches the DB; <b style="color:#d6a45c">breakdown</b> is the instant "<b>one</b> hot key" expires, when a burst of concurrent requests all miss and concentrate on that one point; <b style="color:#e05a7d">avalanche</b> is "<b>a whole swath</b> of keys" failing at once (usually because they all got the same TTL, or the whole Redis went down), causing a wide collapse. Work out whether it's "nonexistent / one hot spot / a whole swath" and you know which cure to use</figcaption>
</figure>

## Match the cure to the breach: three breaches, three fixes

With the differences clear, the cures follow naturally — each breach maps to a way of "keeping failures from concentrating":

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 206" role="img" aria-label="The cures for the three disasters. Penetration: cache the empty result too, writing the miss into the cache with a short TTL to block it, plus a Bloom filter up front to intercept keys that definitely don't exist. Breakdown: a mutex, letting only one request rebuild from the database while the others wait for the refill. Avalanche: add random jitter to TTLs to spread expiry times, plus high availability and degradation so Redis isn't a single point that all dies. The shared spirit is don't let failures concentrate: block, converge, spread." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="cp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Match the cure to the breach: breach → fix</text>
    <rect x="16" y="34" width="96" height="34" rx="6" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.4"/><text x="64" y="55" fill="#e0733a" font-size="9.4" text-anchor="middle" font-weight="bold">Penetration</text>
    <line x1="112" y1="51" x2="134" y2="51" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cp)"/>
    <rect x="136" y="34" width="428" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="350" y="49" fill="#e6e6e6" font-size="8.4" text-anchor="middle">cache the empty result too (write the miss into cache with a short TTL)</text><text x="350" y="62" fill="#9aa4b2" font-size="8" text-anchor="middle">+ Bloom filter: intercept keys that "definitely don't exist" up front</text>
    <rect x="16" y="86" width="96" height="34" rx="6" fill="#3a3320" stroke="#d6a45c" stroke-width="1.4"/><text x="64" y="107" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">Breakdown</text>
    <line x1="112" y1="103" x2="134" y2="103" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cp)"/>
    <rect x="136" y="86" width="428" height="34" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="350" y="101" fill="#e6e6e6" font-size="8.4" text-anchor="middle">mutex: let only "one" request rebuild from DB; the rest wait for the refill</text><text x="350" y="114" fill="#9aa4b2" font-size="8" text-anchor="middle">(or logical expiry + background refresh for hot keys, no real TTL)</text>
    <rect x="16" y="138" width="96" height="34" rx="6" fill="#3a2632" stroke="#e05a7d" stroke-width="1.4"/><text x="64" y="159" fill="#e05a7d" font-size="9.4" text-anchor="middle" font-weight="bold">Avalanche</text>
    <line x1="112" y1="155" x2="134" y2="155" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cp)"/>
    <rect x="136" y="138" width="428" height="34" rx="6" fill="#2b2540" stroke="#9b6ff0" stroke-width="1.2"/><text x="350" y="153" fill="#e6e6e6" font-size="8.4" text-anchor="middle">add random jitter to TTLs to spread out expiry times</text><text x="350" y="166" fill="#9aa4b2" font-size="8" text-anchor="middle">+ high availability / degradation: don't let Redis be a single point that all dies</text>
    <text x="290" y="194" fill="#d6a45c" font-size="8.6" text-anchor="middle" font-weight="bold">the shared spirit: don't let failures concentrate — block · converge · spread</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e0733a">Penetration</b>: "<b>cache the empty result too</b>", so queries for nonexistent data are blocked at the cache as well (with a short TTL to avoid stale data), and for more rigour add a <b>Bloom filter</b> at the very front to intercept keys that definitely don't exist; <b style="color:#d6a45c">breakdown</b>: a <b>mutex</b>, so when a hot key expires only one request rebuilds it and the rest wait quietly, instead of a thousand arrows at once; <b style="color:#e05a7d">avalanche</b>: <b>random TTLs</b> to stagger expiry so everyone doesn't expire in the same second — the same idea as the jitter <a href="/blog/sre-cron/">reliable cron</a> uses against the midnight thundering herd</figcaption>
</figure>

The three cures use different moves, but at heart they're one sentence: **don't let failures concentrate at the same time and the same point.** Caching empty results is "block what can't be hit at the door", the mutex is "converge the concurrency into one", random TTLs are "spread out what happens simultaneously" — block, converge, spread, matching the three kinds of concentration. As for the mutex breakdown needs, "how to correctly grab a lock in a distributed setting" is a big topic of its own, saved for the next post on distributed locks.

## In commands: how the three fixes are issued

In `redis-cli`, the cures for the three disasters are these few lines:

```bash
# cache-aside read: check the cache first, refill only on a miss (always with a TTL)
GET article:42                       # miss → fetch from DB, then refill ↓
SET article:42 "<json>" EX 300       # keep 5 minutes; add some randomness to the TTL → prevents avalanche expiry
# breakdown: a mutex so only "one" request rebuilds the hot spot
SET lock:article:42 1 NX EX 10       # only the one that gets it (OK) queries the DB; others wait and retry
# penetration: cache an empty value for "not found" too (short TTL) to block repeated DB hits
SET article:404 "" EX 30
```

Three commands for three breaches: a refill with a **randomised TTL** spreads out avalanches, `SET NX` as a **mutex** converges breakdowns, an **empty value with a short TTL** blocks penetration. The shared sentence is — **don't let a flood of misses hit the DB at the same instant.**

## Reflections

### Three names that sound alike, but at heart three different kinds of concentration

Penetration, breakdown, avalanche — when I was learning, the three Chinese terms left me dizzy; they sound like three ways of saying the same thing. What truly sorted them out for me was realising the difference lies on a single dimension: **"why are the requests reaching the DB concentrated?"** Penetration because the thing queried doesn't exist at all, so the cache wall inherently can't block it (a leak in space); breakdown because one hot spot at the instant of expiry gets everyone piling on (one point in time); avalanche because a whole swath of keys happens to expire together (a wide span of time). Break it into "nonexistent / one point / a whole swath" and the names no longer need memorising; you can derive them from the situation. **Faced with a set of easily confused terms, finding the one dimension that distinguishes them is a hundred times more useful than memorising definitions.**

### The shared spirit of these fixes: eliminate "synchrony"

The biggest takeaway from writing this post was discovering that the three fixes actually solve one deeper problem — **synchrony is the amplifier of disasters**. Ten thousand requests spread out are digested by the DB with ease; but if they happen **simultaneously** (expire together, rush the same hot spot together), they crush the system in an instant. So the jitter of random TTLs and the convergence of a mutex are both, at heart, **breaking that fatal synchrony**. I've since seen the pattern everywhere: [[sre-cron|schedulers]] adding jitter against the midnight thundering herd, retries with random backoff against retry storms, staggered warm-up at start-up against stampedes — **whenever you see "many things doing the same thing at the same time", be alert that it may be the fuse of the next disaster.** Flattening a synchronised spike into a spread-out slope is a move that recurs throughout reliability engineering.

### The hard part of caching isn't the cache; it's "the moment of the miss"

Using Redis as a cache, everyone's attention goes to "how fast a hit is", but where things actually go wrong is always **the moment of the miss** — the cache didn't block it and the pressure passes straight to the database behind. All three disasters happen after a miss. So when I design any cache layer now, the first thing I think about isn't "how high is the hit rate" but **"when it misses, when the whole thing goes down, can the DB behind it hold?"** A cache whose miss behaviour hasn't been thought through blocks traffic for you day to day, peace and quiet, but at the same time it **feeds a real traffic level the DB behind it can't bear** — and the moment the cache fails, that traffic shows its true face and crushes the DB in an instant ([[sre-cascading-failures|cascading failure]]). A cache is an accelerator, but don't forget it's also a line of defence whose "what happens when it falls" you'll have to face sooner or later.
