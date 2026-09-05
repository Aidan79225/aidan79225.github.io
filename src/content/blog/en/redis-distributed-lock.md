---
title: "Distributed Locks: From SETNX to Redlock, and That Famous Argument"
date: 2026-07-20
category: tech
tags:
  - redis
  - distributed-systems
series: "Redis — Learning Notes"
seriesOrder: 7
comments: true
draft: false
translationOf: redis-distributed-lock
---
When several processes or machines compete for the same resource (only one may decrement stock or run a job at a time), you need a **distributed lock**. Redis, being fast and atomic, is often used as that lock. But this is a topic that "looks like three lines and turns out to be bottomless" — follow it far enough and you run into a famous academic argument in distributed systems. This post starts from the most naive version, patches it step by step up to Redlock, then faces honestly the question of "is a Redis lock actually safe".

## A correct single-node lock: SET NX PX + Lua release

Start with the most common, "roughly correct" version on a single Redis node. Each of its parts patches a hole the naive version falls into:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 234" role="img" aria-label="Anatomy of a correct single-node Redis lock. Acquire with one command, SET lock:res token NX PX 30000. NX means set only if the key doesn't exist, achieving mutual exclusion. PX 30000 means a built-in 30-second TTL, so even if the holder crashes the lock releases automatically and never deadlocks forever. token is a random value proving this lock is mine. Release must use a Lua script: GET and compare the token, DEL only if it matches, atomically, so you only delete your own lock. A plain DEL without checking the token could delete someone else's renewed lock." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Acquiring the lock: one atomic command</text>
    <rect x="70" y="26" width="440" height="30" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="46" font-size="11" text-anchor="middle" font-family="monospace"><tspan fill="#9aa4b2">SET lock:res </tspan><tspan fill="#54b890" font-weight="bold">&lt;token&gt;</tspan><tspan fill="#4f6df5" font-weight="bold"> NX</tspan><tspan fill="#d6a45c" font-weight="bold"> PX 30000</tspan></text>
    <rect x="24" y="72" width="172" height="56" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="110" y="90" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">NX</text><text x="110" y="105" fill="#9aa4b2" font-size="7.6" text-anchor="middle">set only if the key doesn't exist</text><text x="110" y="119" fill="#54b890" font-size="7.6" text-anchor="middle">→ mutual exclusion</text>
    <rect x="204" y="72" width="172" height="56" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="290" y="90" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">PX 30000</text><text x="290" y="105" fill="#9aa4b2" font-size="7.6" text-anchor="middle">built-in 30 s TTL</text><text x="290" y="119" fill="#54b890" font-size="7.6" text-anchor="middle">→ holder dies, auto-release; no deadlock</text>
    <rect x="384" y="72" width="172" height="56" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="470" y="90" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">&lt;token&gt;</text><text x="470" y="105" fill="#9aa4b2" font-size="7.6" text-anchor="middle">a random value</text><text x="470" y="119" fill="#54b890" font-size="7.6" text-anchor="middle">→ marks "this lock is mine"</text>
    <text x="290" y="152" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Releasing the lock: verify the owner (Lua, atomic)</text>
    <rect x="30" y="162" width="360" height="52" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="210" y="182" font-size="9" text-anchor="middle" font-family="monospace" fill="#e6e6e6">if GET(key)==token then DEL(key)</text><text x="210" y="201" fill="#54b890" font-size="7.8" text-anchor="middle">GET and DEL must be atomic → only delete your own lock</text>
    <rect x="400" y="162" width="156" height="52" rx="7" fill="#3a2626" stroke="#e05a7d" stroke-width="1.4"/><text x="478" y="182" fill="#e05a7d" font-size="8.2" text-anchor="middle" font-weight="bold">DEL without checking token</text><text x="478" y="199" fill="#9aa4b2" font-size="7.6" text-anchor="middle">→ deletes someone's renewed lock ✗</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Three parts, each patching a hole in the naive version: <b style="color:#4f6df5">NX</b> gives mutual exclusion (only the first set succeeds); <b style="color:#d6a45c">PX 30000</b> gives the lock a TTL, so if the holder crashes the lock expires on its own instead of deadlocking forever; <b style="color:#54b890">&lt;token&gt;</b> is a random value so the release can <b>verify identity</b>. Release must use <b>Lua</b> to wrap "compare the token, delete only if it matches" into one atomic operation — otherwise, if you GET and then, just as you're about to DEL, the lock expires and someone else takes it, you've <b>deleted someone else's lock</b></figcaption>
</figure>

In commands it's these two pieces:

```bash
# acquire: NX (exclusion) + PX (TTL) in one go; token is a random value like a UUID
SET lock:order:42 3f9a...e1 NX PX 30000
```
```lua
-- release: GET and compare the token, DEL only if it matches (run the whole thing with EVAL for atomicity)
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
```

In the early days people set locks in two steps, `SETNX` then a separate `EXPIRE` — **never do that**: crash between the two and the lock has no TTL and becomes a permanent deadlock. `SET ... NX PX` fuses "set the lock" and "set the expiry" into one atomic command precisely to plug that hole.

## But is that safe? The fatal assumption of a TTL lock

That looks complete. But Martin Kleppmann (author of *DDIA*) raised a devastating objection: **as long as there's a TTL, the lock cannot guarantee true mutual exclusion.** The problem is something nobody escapes — **process pauses (a GC's stop-the-world, OS scheduling, even the machine being suspended)**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="Timeline of why a TTL lock is still unsafe. Client A acquires the lock with a 30-second TTL. Then A suffers a very long stop-the-world GC pause, over 30 seconds. During the pause the lock expires, and Client B legitimately acquires the same lock and starts writing to the resource. Then A wakes from the pause; it doesn't know the lock has expired, believes it still holds it, and writes to the resource too. So A and B operate on the same resource at once and mutual exclusion is broken. The fix is a fencing token: every acquisition gets a monotonically increasing number, and the resource accepts only numbers larger than any it has seen, so A's write with the old number is rejected." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="dl" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">One long enough GC pause breaks mutual exclusion</text>
    <text x="44" y="52" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">A</text>
    <rect x="60" y="42" width="120" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="120" y="56" fill="#e6e6e6" font-size="7.6" text-anchor="middle">acquires lock (TTL 30s)</text>
    <rect x="182" y="42" width="180" height="20" rx="4" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/><text x="272" y="56" fill="#d6a45c" font-size="7.6" text-anchor="middle">STW GC pause (&gt; 30s)</text>
    <rect x="364" y="42" width="150" height="20" rx="4" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="439" y="56" fill="#e05a7d" font-size="7.6" text-anchor="middle">wakes, thinks it holds → writes ✗</text>
    <line x1="362" y1="36" x2="362" y2="150" stroke="#e0733a" stroke-width="1" stroke-dasharray="3 3"/><text x="362" y="32" fill="#e0733a" font-size="7.4" text-anchor="middle">TTL up, lock expired</text>
    <text x="44" y="96" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">B</text>
    <rect x="366" y="86" width="150" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="441" y="100" fill="#e6e6e6" font-size="7.6" text-anchor="middle">legitimately takes the lock → writes</text>
    <rect x="364" y="118" width="152" height="26" rx="5" fill="#3a2626" stroke="#e05a7d" stroke-width="1.4"/><text x="440" y="135" fill="#e05a7d" font-size="8" text-anchor="middle" font-weight="bold">A and B both write → broken</text>
    <line x1="60" y1="160" x2="516" y2="160" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#dl)"/><text x="516" y="174" fill="#9aa4b2" font-size="8" text-anchor="end">time →</text>
    <rect x="40" y="184" width="500" height="40" rx="8" fill="#1f2330" stroke="#4f6df5" stroke-width="1.3"/><text x="290" y="201" fill="#4f6df5" font-size="8.6" text-anchor="middle" font-weight="bold">Fix: fencing token (a monotonically increasing number)</text><text x="290" y="216" fill="#9aa4b2" font-size="7.8" text-anchor="middle">the resource accepts only tokens larger than any seen → A's write with the old number (33) is rejected at the resource</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The fatal scene: <b style="color:#54b890">A</b> takes the lock, then suffers a <b style="color:#d6a45c">GC pause</b> longer than the TTL; during the pause the lock expires and <b style="color:#54b890">B</b> legitimately takes the same lock and starts working; A wakes <b>not knowing its lock is long gone</b> and keeps writing — exclusion broken. The key insight: <b>a lock's TTL rests on an assumption about "time", and in a distributed system nobody can guarantee time</b>. The real protection isn't in the lock but at the resource: every acquisition issues a <b>monotonically increasing fencing token</b>, the resource accepts only larger numbers, and A's write with the old number is stopped at <b>the resource's gate</b></figcaption>
</figure>

The fencing-token insight matters: **a lock can only "try" to exclude; real correctness comes from the resource rejecting stale writes.** And a fencing token that increases monotonically needs a reliable counter of its own — which brings you back to the territory of real consensus.

## Redlock, and that argument

antirez (Redis's author) proposed **Redlock** to make Redis locks more reliable: don't rely on one Redis; set up **N independent masters (usually 5)**, and to acquire, you must grab the lock on **a majority (≥3)** within a bounded time, or it doesn't count; on release, unlock on all nodes. Using "majority" to survive a minority of nodes dying — in spirit the same road as [[redis-cluster|Cluster's majority failover]] and [[sre-consensus|consensus algorithms]].

Then the argument started. **Kleppmann** criticised: Redlock depends on **timing assumptions** like "each node's clock runs accurately enough, processes don't pause for long", and those assumptions don't hold in real systems (GC pauses, clock drift), so Redlock gives a sense of safety it can't actually deliver; for correctness you need fencing tokens + a real consensus system. **antirez** countered: Kleppmann's attack model is too harsh, Redlock is sufficient for most practical scenarios, and the fencing-token approach carries assumptions of its own. Nobody "won" the debate, but it forced out the most useful distinction we have to this day.

## The distinction: do you want an "efficiency lock" or a "correctness lock"

- **Efficiency lock**: the lock only exists to **avoid duplicated wasted work** — recomputing the same cache twice, sending the same email twice; an occasional failure just wastes a little, nothing terrible happens. **For this, a single-node Redis `SET NX PX` is more than enough**; you may not even need Redlock.
- **Correctness lock**: **two parties must absolutely never act at once** — deducting money, issuing an invoice, transferring funds. Here a TTL lock's timing assumptions don't qualify; you need **fencing tokens + real consensus** ([[zookeeper|ZooKeeper]], etcd), or simply hand exclusion to the database's transactions and unique constraints.

## Reflections

### Things that "look like three lines" are often the deepest

Distributed locks are my number-one teaching example of "the devil is in the details". Patching from `SETNX` all the way to Redlock, every step plugs a hole you never thought of at the start: forget the TTL and you deadlock, forget to verify the token and you delete the wrong lock, forget GC pauses and exclusion breaks… Each hole looks "obvious" on its own, but you just don't see it until you've fallen in. The lasting habit this gave me: **when the thought "isn't this simple?" shows up, be more alert, not less** — the things treated as three-line trivia are exactly where pits hide in the corners you didn't look at. Real seniority isn't being able to write those three lines; it's knowing what those three lines "still miss".

### Efficiency lock vs correctness lock is the ruler I use most in technical decisions

Kleppmann's distinction is worth far more than locks alone. It taught me, before using **any** "best-effort" mechanism, to ask: **if it fails occasionally, is that "a little waste" or "someone gets hurt"?** If the former (efficiency), happily accept the simple solution's occasional failure and don't over-engineer; if the latter (correctness), don't kid yourself trading timing assumptions for a sense of safety — honestly use real consensus or database transactions. That line freed me from agonising over "is a Redis lock safe", a question with no absolute answer, and instead I first place "which category does my lock belong to" — **classify the problem right, and the tool choice stops being a dilemma.**

### What that argument taught me: engineering has no silver bullets, only assumptions

Who was right, antirez or Kleppmann? My answer: they weren't arguing about right and wrong at all; they were arguing about **assumptions**. Kleppmann assumed a cruel world of GC pauses and drifting clocks; antirez assumed a roughly normal practical environment. Different assumptions, different conclusions — and both assumptions hold in their own scenarios. That changed how I read technical arguments for good: **instead of asking "is this solution good", ask "what assumptions does it rest on, and do they hold in my scenario".** Under every solution that claims to be safe, reliable or fast lies a set of assumptions; laying that set out to look at is a hundred times more useful than listening to anyone's conclusion. That's the biggest lesson the small topic of distributed locks taught me.
