---
title: "Redis Expiration and Eviction: TTL, Lazy Deletion and maxmemory Policies"
date: 2026-07-16
category: tech
description: "Expiration and eviction are often lumped together, but they're two different things: expiration is \"this key's own time is up, it should go\"; eviction is \"memory is full, someone has to leave\". This post makes clear how Redis clears expired keys with lazy deletion plus periodic sampling working together (and a counter-intuitive fact: expired doesn't mean the memory is freed immediately), and how to choose among the 8 eviction policies when maxmemory is hit — allkeys or volatile, LRU or LFU — where picking wrong costs you either every write failing or important data being deleted by mistake."
tags:
  - redis
  - cache
series: "Redis — Learning Notes"
seriesOrder: 5
comments: true
draft: false
translationOf: redis-expiration-eviction
---
Use Redis as a cache and sooner or later you hit two questions: **how does a key with a TTL get cleared once it expires?** and **what happens when memory is full?** The two are often lumped together, but they're different things — the former is **expiration**: "this key's own time is up, it should go"; the latter is **eviction**: "there's no room left, someone has to be asked to leave". Separating the two is the foundation of using Redis well as a cache.

## Expiration: a key's time is up; how does it get cleared

You'd think that the moment a key's TTL is reached, Redis deletes it and frees the memory? **It doesn't.** Redis uses two mechanisms together to clear expired keys, and neither guarantees "immediately":

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 202" role="img" aria-label="The two mechanisms Redis uses to clear expired keys. In the middle, a key whose TTL has expired but which still lies in memory. It gets cleared two ways: first, lazy deletion, when someone GETs it the expiry is noticed, it's deleted on the spot and nil is returned; second, periodic deletion, a background task samples about ten times a second, randomly picking a batch from keys with a TTL and deleting the expired ones. Below: so expired doesn't mean the memory is freed immediately; if the TTL has passed but nobody touches the key and it hasn't been sampled yet, it just lies there." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ee" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">How expired keys get cleared: lazy + periodic, two prongs</text>
    <rect x="196" y="34" width="188" height="42" rx="7" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.5"/><text x="290" y="53" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">key whose TTL has expired</text><text x="290" y="68" fill="#e6e6e6" font-size="8" text-anchor="middle">still occupies memory (not cleared yet)</text>
    <line x1="150" y1="112" x2="230" y2="80" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ee)"/>
    <line x1="430" y1="112" x2="350" y2="80" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ee)"/>
    <rect x="20" y="112" width="240" height="60" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="34" y="132" fill="#4f6df5" font-size="9" text-anchor="start" font-weight="bold">① lazy deletion (passive)</text><text x="34" y="149" fill="#e6e6e6" font-size="8" text-anchor="start">someone GETs it →</text><text x="34" y="163" fill="#9aa4b2" font-size="8" text-anchor="start">found expired → deleted on the spot, returns nil</text>
    <rect x="320" y="112" width="240" height="60" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="334" y="132" fill="#54b890" font-size="9" text-anchor="start" font-weight="bold">② periodic deletion (active)</text><text x="334" y="149" fill="#e6e6e6" font-size="8" text-anchor="start">background samples ~10×/s →</text><text x="334" y="163" fill="#9aa4b2" font-size="8" text-anchor="start">random batch from keys with TTL, delete expired</text>
    <text x="290" y="192" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">so "expired" ≠ "freed" — untouched and not yet sampled, it just lies there</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">Lazy deletion</b> saves CPU (no proactive scanning), but an expired key nobody accesses keeps occupying memory; <b style="color:#54b890">periodic deletion</b> plugs that hole — a background task runs a few times a second and <b>randomly samples</b> a batch from "keys with a TTL" to delete (sampling more rounds if the expired ratio is high). Note it <b>samples</b> rather than scanning everything, precisely to avoid an O(N) scan <a href="/blog/redis-single-thread/">blocking the single thread</a>. Together they balance CPU against memory — at the cost that "expiration" isn't precisely immediate</figcaption>
</figure>

The counter-intuitive point here is worth remembering: **a key's TTL being reached doesn't mean it vanishes from memory at once.** If nobody accesses it (lazy deletion isn't triggered) and the background sampling hasn't picked it yet, it **lies in memory for a while** — a `GET` returns `nil` (logically expired), but the physical memory hasn't been freed. Incidentally, a replica doesn't delete expired keys on its own; it waits for the `DEL` the master sends after expiring the key — to keep master and replica consistent, the master is the authority on expiration.

## Eviction: memory is full; who gets kicked out

Expiration is a key leaving on its own schedule; **eviction** is something else — when memory usage hits the `maxmemory` ceiling, Redis has to **actively kick out some keys** to make room. Which ones? The **eviction policy** decides, and there are 8 of them (plus one "don't kick anyone"):

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 224" role="img" aria-label="Redis's eviction policy matrix. When maxmemory is hit, the policy picks which keys to evict. Policies combine two dimensions, scope and strategy. Scope: allkeys picks from all keys, volatile only from keys with a TTL. Strategy: LRU least recently used, LFU least frequently used, random, ttl closest to expiry. The combinations are allkeys-lru, allkeys-lfu, allkeys-random, and volatile-lru, volatile-lfu, volatile-random, volatile-ttl; allkeys has no ttl cell. The default is noeviction: evict nothing, writes return errors. Below: LRU is longest untouched, LFU is least used and resists scan pollution; a pure cache uses the allkeys family, data that can't be lost uses the volatile family or noeviction." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">maxmemory hit — evict whom? The 8 policies</text>
    <text x="146" y="46" fill="#9aa4b2" font-size="8" text-anchor="middle" font-weight="bold">LRU</text><text x="146" y="56" fill="#9aa4b2" font-size="6.6" text-anchor="middle">least recently used</text>
    <text x="256" y="46" fill="#9aa4b2" font-size="8" text-anchor="middle" font-weight="bold">LFU</text><text x="256" y="56" fill="#9aa4b2" font-size="6.6" text-anchor="middle">least frequently used</text>
    <text x="366" y="46" fill="#9aa4b2" font-size="8" text-anchor="middle" font-weight="bold">random</text><text x="366" y="56" fill="#9aa4b2" font-size="6.6" text-anchor="middle">random</text>
    <text x="476" y="46" fill="#9aa4b2" font-size="8" text-anchor="middle" font-weight="bold">ttl</text><text x="476" y="56" fill="#9aa4b2" font-size="6.6" text-anchor="middle">closest to expiry</text>
    <text x="16" y="82" fill="#4f6df5" font-size="8.4" text-anchor="start" font-weight="bold">allkeys</text><text x="16" y="93" fill="#9aa4b2" font-size="6.6" text-anchor="start">all keys</text>
    <rect x="100" y="66" width="92" height="26" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="146" y="83" fill="#e6e6e6" font-size="7.6" text-anchor="middle">allkeys-lru</text>
    <rect x="210" y="66" width="92" height="26" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="256" y="83" fill="#e6e6e6" font-size="7.6" text-anchor="middle">allkeys-lfu</text>
    <rect x="320" y="66" width="92" height="26" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="366" y="83" fill="#e6e6e6" font-size="7.4" text-anchor="middle">allkeys-random</text>
    <rect x="430" y="66" width="92" height="26" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="476" y="83" fill="#9aa4b2" font-size="7.6" text-anchor="middle">— (none)</text>
    <text x="16" y="112" fill="#54b890" font-size="8.4" text-anchor="start" font-weight="bold">volatile</text><text x="16" y="123" fill="#9aa4b2" font-size="6.6" text-anchor="start">only keys with TTL</text>
    <rect x="100" y="98" width="92" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="146" y="115" fill="#e6e6e6" font-size="7.6" text-anchor="middle">volatile-lru</text>
    <rect x="210" y="98" width="92" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="256" y="115" fill="#e6e6e6" font-size="7.6" text-anchor="middle">volatile-lfu</text>
    <rect x="320" y="98" width="92" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="366" y="115" fill="#e6e6e6" font-size="7.4" text-anchor="middle">volatile-random</text>
    <rect x="430" y="98" width="92" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="476" y="115" fill="#e6e6e6" font-size="7.6" text-anchor="middle">volatile-ttl</text>
    <rect x="100" y="136" width="422" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="311" y="153" fill="#e6e6e6" font-size="7.8" text-anchor="middle">noeviction (default): evict nothing; memory full → writes return errors</text>
    <rect x="40" y="176" width="500" height="40" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="194" fill="#9aa4b2" font-size="7.8" text-anchor="middle">LRU = longest untouched · LFU = least used (resists "occasional full scan" cache pollution)</text>
    <text x="290" y="208" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-weight="bold">pure cache → allkeys-lru / lfu; data you can't lose → volatile-* or noeviction</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">A policy combines two dimensions: <b>scope</b> (<b style="color:#4f6df5">allkeys</b> picks from all keys / <b style="color:#54b890">volatile</b> only from keys with a TTL) × <b>strategy</b> (LRU longest untouched / LFU least used / random / ttl closest to expiry). <b>LFU</b> resists better than LRU the cache pollution caused by "some batch job occasionally scanning all the cold data". And Redis's LRU/LFU are actually <b>approximate</b> (sampled estimates; no full access list is maintained) — once again "trade a little precision for memory"</figcaption>
</figure>

The key to choosing a policy is one question: **is this Redis a pure cache, or does it also hold things that can't be lost?**
- **Pure cache** (every key can be rebuilt from the database behind it): use `allkeys-lru` or `allkeys-lfu`, let Redis freely kick out the least useful and keep the memory for hot data.
- **Mixed with important data**: use `volatile-*` — evict only "disposable data with a TTL set", protecting the important keys without a TTL; or use `noeviction` and manage capacity yourself.
- **Never** leave the default `noeviction` in a "used as a cache" scenario — the moment memory fills, **every write starts failing**, while you may think Redis is just "clearing old data automatically".

## redis-cli: TTL and maxmemory operations

Expiration and eviction each have a set of commands, matching "leaving on its own" and "no room, kick whom":

```bash
# expiration (TTL)
SET session:1 "..." EX 3600     # set the value with a 1-hour TTL in one go (most common)
EXPIRE user:1 60; TTL user:1    # add a TTL afterwards / check seconds left (-1 = permanent, -2 = doesn't exist)
PERSIST user:1                  # remove the TTL, back to permanent
# eviction (memory ceiling and policy)
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory-policy allkeys-lru   # one of the 8 policies (see the matrix above)
INFO stats                      # check evicted_keys: non-zero and climbing = scale up or change policy
OBJECT FREQ hotkey              # under an LFU policy, see a key's access frequency
```

Watch two numbers and you have the essentials: `TTL` tells you how long a key has left to live, and **`evicted_keys` climbing** in `INFO stats` is the first alarm that "memory hit the ceiling and eviction has started" — the watershed between adding memory and changing the eviction policy.

## Reflections

### Expiration vs eviction: separate "leaving on its own" from "no room, asked to leave"

When I started with Redis I treated expiration and eviction as the same thing, and got the `maxmemory` configuration completely backwards. Then it clicked: **expiration is a key's personal schedule (TTL reached, it should go); eviction is the system's space pressure (memory full, someone has to be asked to leave)** — independent of each other; a key without a TTL never "expires" but can still be "evicted". The distinction looks like a detail, but it directly decides your design: which keys get a TTL (to expire naturally), what the memory ceiling is, whom to evict on hitting it. Think of "time's up" and "no room" as two separate pressures, and a lot of Redis capacity questions become clear.

### Approximate LRU: another "trade a little precision for memory"

Redis's LRU isn't "evict exactly the least recently used one" — maintaining a full LRU list costs too much memory. It uses **sampled approximation** instead: pick a few keys at random, evict the least recently used among them. It's Redis's consistent philosophy again, the same thinking as [[redis-data-structures|HyperLogLog]] estimating hundreds of millions in 12KB and [[redis-persistence|fork COW]] copying only modified pages — **between "fully exact" and "save resources", cleverly choose less exact**. And it's usually good enough: cache eviction never needed "mathematically optimal"; approximate LRU's effect on hit rate is negligible while it saves the heavy cost of maintaining an exact structure. I increasingly think that telling "where exactness is needed from where approximate is fine" is one of the clearest gaps between senior engineers and beginners.

### The wrong eviction policy is a hidden bomb: "fine normally, explodes when full"

The eviction policy is the kind of setting that "bites you with its default if you don't actively think about it". The default `noeviction` is a disaster for a "used as a cache" scenario — calm while memory isn't full, and then once data grows to the ceiling, **rather than clearing old data automatically, every write starts failing**, and the whole service goes down with it. I've seen this incident more than once: everyone assumed Redis would "clear the old stuff itself" when in fact it was refusing the new. It taught me a more general lesson: **for any resource with a "ceiling", actively think through "what happens when we hit it"** — automatic reclamation, refusing service, or outright crash? That "boundary behaviour" is invisible day to day, yet it's usually the star of the 3am incident. Thinking through every ceiling's hit-the-top behaviour before launch is a very worthwhile paranoia.
