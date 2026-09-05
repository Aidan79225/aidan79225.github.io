---
title: "The Soul of Redis: Five Core Data Structures + Advanced Weapons"
date: 2026-07-15
category: tech
description: "The previous post said Redis is at heart a data structure server; this one opens the toolbox. The five core structures — String, List, Hash, Set, Sorted Set — each answer a class of problem: pick the right one and the problem is half solved; pick wrong and you'll grind out with a pile of GET/SET what was a one-line command. Then four advanced weapons, Bitmap, HyperLogLog, Geo and Stream, which share one idea: trade a little precision or flexibility for a huge gain in space or speed."
tags:
  - redis
  - data-structures
series: "Redis — Learning Notes"
seriesOrder: 2
comments: true
draft: false
translationOf: redis-data-structures
---
[[redis-intro|The previous post]] said the soul of Redis is "data structures" — so this one opens the toolbox. Ninety percent of using Redis well is **picking the right structure**: pick right and a leaderboard is three commands; pick wrong and you'll grind out on the application side with a pile of `GET`/`SET` what the server could do in one line. First the five core structures, and each one's signature use:

## The five core structures

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 264" role="img" aria-label="Quick reference for Redis's five core data structures. String is bytes or a number, used for caching, counters with INCR, distributed locks with SETNX. List is ordered with push and pop at both ends, used for queues with LPUSH and RPOP and the latest N items. Hash is a map of field to value, used to store objects and change one field without moving the whole thing. Set is unordered and automatically deduplicated, used for dedup, tags, and intersections like mutual friends with SINTER. Sorted Set has a score per member and stays sorted, used for leaderboards, range queries, and delayed queues with score equal to time." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Five core structures: pick the right one, the problem is half solved</text>
    <rect x="14" y="32" width="552" height="40" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="28" y="52" fill="#4f6df5" font-size="10.5" text-anchor="start" font-weight="bold">String</text><text x="28" y="66" fill="#9aa4b2" font-size="7.6" text-anchor="start">bytes / number</text>
    <rect x="150" y="42" width="42" height="20" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="171" y="56" fill="#e6e6e6" font-size="8.4" text-anchor="middle">42</text>
    <text x="240" y="56" fill="#e6e6e6" font-size="8.6" text-anchor="start">cache · counter (INCR) · distributed lock (SET NX)</text>
    <rect x="14" y="76" width="552" height="40" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="28" y="96" fill="#54b890" font-size="10.5" text-anchor="start" font-weight="bold">List</text><text x="28" y="110" fill="#9aa4b2" font-size="7.6" text-anchor="start">ordered, both ends</text>
    <rect x="150" y="86" width="24" height="20" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><rect x="176" y="86" width="24" height="20" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><rect x="202" y="86" width="24" height="20" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/>
    <text x="240" y="100" fill="#e6e6e6" font-size="8.6" text-anchor="start">queue (LPUSH / RPOP) · latest N items (LPUSH+LTRIM)</text>
    <rect x="14" y="120" width="552" height="40" rx="6" fill="#2b2540" stroke="#9b6ff0" stroke-width="1.2"/>
    <text x="28" y="140" fill="#9b6ff0" font-size="10.5" text-anchor="start" font-weight="bold">Hash</text><text x="28" y="154" fill="#9aa4b2" font-size="7.6" text-anchor="start">field → value</text>
    <rect x="150" y="128" width="66" height="24" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="158" y="139" fill="#9aa4b2" font-size="7" text-anchor="start">name: Aidan</text><text x="158" y="149" fill="#9aa4b2" font-size="7" text-anchor="start">age: 30</text>
    <text x="240" y="144" fill="#e6e6e6" font-size="8.6" text-anchor="start">store objects · change one field without moving the whole thing</text>
    <rect x="14" y="164" width="552" height="40" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="28" y="184" fill="#d6a45c" font-size="10.5" text-anchor="start" font-weight="bold">Set</text><text x="28" y="198" fill="#9aa4b2" font-size="7.6" text-anchor="start">unordered, deduplicated</text>
    <rect x="150" y="174" width="22" height="20" rx="10" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><rect x="176" y="174" width="22" height="20" rx="10" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><rect x="202" y="174" width="22" height="20" rx="10" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/>
    <text x="240" y="188" fill="#e6e6e6" font-size="8.6" text-anchor="start">dedup · tags · intersection (mutual friends, SINTER)</text>
    <rect x="14" y="208" width="552" height="46" rx="6" fill="#3a2632" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="28" y="228" fill="#e05a7d" font-size="10.5" text-anchor="start" font-weight="bold">Sorted Set</text><text x="28" y="242" fill="#9aa4b2" font-size="7.6" text-anchor="start">scored members, kept sorted</text>
    <rect x="150" y="220" width="26" height="20" rx="3" fill="#1f2330" stroke="#e05a7d" stroke-width="1"/><text x="163" y="234" fill="#e6e6e6" font-size="7.4" text-anchor="middle">a:1</text><rect x="178" y="220" width="26" height="20" rx="3" fill="#1f2330" stroke="#e05a7d" stroke-width="1"/><text x="191" y="234" fill="#e6e6e6" font-size="7.4" text-anchor="middle">b:2</text><rect x="206" y="220" width="26" height="20" rx="3" fill="#1f2330" stroke="#e05a7d" stroke-width="1"/><text x="219" y="234" fill="#e6e6e6" font-size="7.4" text-anchor="middle">c:3</text>
    <text x="240" y="234" fill="#e6e6e6" font-size="8.6" text-anchor="start">leaderboard · range queries · delayed queue (score = time)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Five structures are the answers to five classes of problem: to <b>count</b>, use String (<code>INCR</code> adds one atomically); for <b>first in, first out</b>, a List; to store <b>an object's fields</b>, a Hash; to <b>deduplicate or intersect</b>, a Set; to <b>sort, rank, or take ranges</b>, a Sorted Set. The trick to choosing is to ask first "what <b>operation</b> do I want on this data" — a structure's essence is making the operation you do most into O(1) or O(log N)</figcaption>
</figure>

The one most worth spending time on is the **Sorted Set (ZSet)**, the jewel in Redis's crown: every member carries a score, and Redis **keeps them sorted at all times**. That one property grows into several killer uses — leaderboards (`ZADD` to score, `ZREVRANGE` to fetch the board) are the most intuitive; but set the **score to a timestamp** and it instantly becomes a **delayed queue** (`ZRANGEBYSCORE` fetches the tasks "due for processing"); set the score to a page cursor and you get stable range pagination. Same structure, different meaning of the score, a completely different weapon.

## Four advanced weapons

Beyond the core five, Redis has a few advanced structures built for specific problems, and their shared philosophy is — **trade a little precision or flexibility for a huge gain in space or speed**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 190" role="img" aria-label="Redis's four advanced weapons. Bitmap, one bit per user, for check-ins and active-user stats, saving space down to about 12MB for 100 million users. HyperLogLog, approximate cardinality or count distinct, a fixed 12KB estimating 100 million plus unique visitors with about 0.81% error. Geo, geographic coordinates backed by a Sorted Set, for nearby users and radius search. Stream, a persistent append log with consumer groups, like a lightweight Kafka, covered in post 12." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Four advanced weapons: trade a little precision or flexibility for space or speed</text>
    <rect x="24" y="34" width="532" height="32" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="40" y="54" fill="#4f6df5" font-size="9.4" text-anchor="start" font-weight="bold">Bitmap</text><text x="150" y="54" fill="#e6e6e6" font-size="8.2" text-anchor="start">one bit per user → check-ins, active-user stats</text><text x="540" y="54" fill="#9aa4b2" font-size="8" text-anchor="end">space: 100M users ≈ 12MB</text>
    <rect x="24" y="72" width="532" height="32" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="40" y="92" fill="#54b890" font-size="9.4" text-anchor="start" font-weight="bold">HyperLogLog</text><text x="150" y="92" fill="#e6e6e6" font-size="8.2" text-anchor="start">approximate cardinality (count distinct)</text><text x="540" y="92" fill="#9aa4b2" font-size="8" text-anchor="end">fixed 12KB for 100M+ UV, ~0.81% error</text>
    <rect x="24" y="110" width="532" height="32" rx="6" fill="#2b2540" stroke="#9b6ff0" stroke-width="1.3"/><text x="40" y="130" fill="#9b6ff0" font-size="9.4" text-anchor="start" font-weight="bold">Geo</text><text x="150" y="130" fill="#e6e6e6" font-size="8.2" text-anchor="start">geo coordinates (a Sorted Set underneath)</text><text x="540" y="130" fill="#9aa4b2" font-size="8" text-anchor="end">nearby users, radius search</text>
    <rect x="24" y="148" width="532" height="32" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.3"/><text x="40" y="168" fill="#d6a45c" font-size="9.4" text-anchor="start" font-weight="bold">Stream</text><text x="150" y="168" fill="#e6e6e6" font-size="8.2" text-anchor="start">persistent log + consumer groups</text><text x="540" y="168" fill="#9aa4b2" font-size="8" text-anchor="end">a lightweight Kafka (post 12)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">Bitmap</b> expresses boolean state one bit at a time, saving space to the extreme; <b style="color:#54b890">HyperLogLog</b> gives up a little accuracy (under 1% error) to count hundreds of millions of distinct items in a fixed 12KB; <b style="color:#9b6ff0">Geo</b> is really a wrapper over a Sorted Set (latitude and longitude encoded into the score); <b style="color:#d6a45c">Stream</b> is a persistent message flow, like a lightweight Kafka built into Redis. All of them demonstrate the same trade: give up a little "everything exact, everything possible" in exchange for overwhelming efficiency on one specific problem</figcaption>
</figure>

**HyperLogLog** embodies this philosophy best: counting "unique visitors (UV)" with a Set of every user id eats several GB for a hundred million visitors; HLL uses a probabilistic algorithm and a fixed **12KB** to estimate a cardinality in the hundreds of millions with under 1% error. For statistics like "roughly a few million UV" that **don't need to be exact**, that's an overwhelming bargain — and a miniature of engineering judgment in general: **ask first "does this really need to be exact"; often it doesn't, and wherever it doesn't, there's huge room to optimise.**

## The rule for choosing a structure: look at the operation first, then pick the structure

The one principle running through all of this: **don't start from "what do I want to store"; start from "what operations do I want to perform on it".** For the same "user score", if you only need to store and read it back, String/Hash is enough; but the moment an **operation** like "rank", "top ten" or "some score range" appears, the answer immediately becomes Sorted Set. Pick the right structure and that operation is a one-line O(log N) command; pick wrong and it's the disaster of fetching the whole dataset to the application and sorting it yourself. Redis forces you to re-respect something school taught and work makes you forget — **the choice of data structure is itself performance design**.

## redis-cli: the signature commands of the five structures

One set of the most common commands per structure; one look and you catch "what this structure is born to do":

```bash
# String: atomic counter
INCR views:page1                       # +1 in place, no read-add-write
# List: latest feed / queue
LPUSH feed p3; LRANGE feed 0 9         # push at the head, fetch the latest 10
# Hash: an object's fields
HSET user:1 name Aidan age 30; HGETALL user:1
# Set: dedup and intersection
SADD tag:redis u1 u2; SINTER tag:redis tag:db   # people with both tags
# ZSet (the crown): leaderboard
ZADD rank 100 u1 95 u2; ZREVRANGE rank 0 2 WITHSCORES   # Top 3
```

The commands themselves tell you the structure choice: for a **leaderboard**, `ZREVRANGE` is natively a ZSet job; for an **intersection** (mutual friends, shared tags), `SINTER` is natively a Set job. **Think "which operation am I issuing" first, and the structure surfaces on its own.**

## Reflections

### Picking the right data structure is the watershed of using Redis well

When mentoring new people, one of my favourite indicators is whether they use Redis with only `GET`/`SET`. Those who know only those two usually treat Redis as "a faster KV": fetch and sort for a leaderboard, check an array by hand for dedup; those who use ZSet, Set and Hash write half the code for the same requirement, fast and atomic. The gap isn't "familiarity with Redis commands"; it's **the habit of "thinking in data structures"** — see a requirement, and first ask in your head "which structure does this map to". It's also why I think Redis is excellent training for backend engineers: it turns the abstract data structures course into daily practice with immediate performance feedback.

### What the advanced structures taught me: ask first "does this really need to be exact"

HyperLogLog was a conceptual shock for me. I used to assume "statistics have to be accurate", until I understood estimating a hundred million UV in 12KB with under 1% error — for a UV number on a dashboard that people read for trends, does 99% accurate differ from 100%? No, but the cost differs by several orders of magnitude. Since then, before any statistic or any query, I ask one more question: **"How exact does this result need to be?"** Often the answer is "roughly is fine", and where "roughly is fine", the biggest room for optimisation usually hides. Trading a little precision for a huge resource saving is an extremely good deal in engineering, and one that's often overlooked.

### Redis brings the data structures course to life

For many people, the university data structures course meant memorising complexities and handing them back to the teacher after the exam. Redis makes it live: every time you pick a structure, you're genuinely deciding the system's performance and behaviour; `ZADD` is O(log N), the cost of `SINTER` depends on the smallest set, `LINDEX` on a big List is O(N) — no longer symbols on an exam paper but the real consequence of "will this drag down the live service". I even think that to quickly build a solid data-structures foundation in an engineer, having them seriously use Redis for a round beats grinding puzzles — because it puts "the cost of picking the wrong structure" right in front of you, and what has hurt is what you remember.
