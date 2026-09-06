---
title: "Why Is Single-Threaded Redis So Fast? And the Landmine of O(N) Commands"
date: 2026-07-15
category: tech
description: "Isn't single-threaded slow? Why does Redis, deliberately single-threaded, still hit 100k+ QPS? Because its bottleneck was never the CPU but memory and the network; the single thread buys the simplicity and predictability of no locks, no races and inherently atomic commands, and an event loop + epoll lets one thread serve tens of thousands of connections. But the design has a double-edged price: every command waits in the same queue, so any slow O(N) command (KEYS *, a huge HGETALL, deleting a giant key) blocks everyone. This post explains why it's fast, what Redis 6's multithreading actually adds, and how to avoid the slow-command trap that catches the most people."
tags:
  - redis
  - performance
series: "Redis — Learning Notes"
seriesOrder: 3
comments: true
draft: false
translationOf: redis-single-thread
---
[[redis-intro|The first post]] said one reason Redis is fast is "single thread + no locks". That sounds backwards — **isn't single-threaded slow?** This post settles it: why a single thread is faster here, what it buys, and its double-edged price — one slow command blocks everyone.

## Why a single thread is faster here

The key: **Redis's bottleneck was never the CPU; it's memory and the network.** Every command is a simple memory operation and the CPU almost always has capacity to spare; the real limit is "how fast data moves, how fast the network swallows". Since the CPU isn't the bottleneck, the little parallel-compute benefit multithreading could bring is limited, while the price is **locks, races, context switches**. So Redis goes the other way: single-threaded, and all of that cost disappears.

Then how does one thread serve tens of thousands of connections at once? **An event loop + I/O multiplexing (epoll)**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 206" role="img" aria-label="The single-thread plus event-loop model of Redis. On the left, tens of thousands of client connections pass through epoll I/O multiplexing, watched by one thread; commands line up in a single queue, and the single thread executes them one by one, each command completing atomically. Below: Redis 6's multithreading is used only for the network chores of reading and writing sockets; command execution remains single-threaded, so atomicity is unchanged." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="st" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Single thread + event loop: one queue, one at a time</text>
    <rect x="10" y="46" width="60" height="18" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="40" y="59" fill="#e6e6e6" font-size="7.4" text-anchor="middle">client</text>
    <rect x="10" y="68" width="60" height="18" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="40" y="81" fill="#e6e6e6" font-size="7.4" text-anchor="middle">client</text>
    <rect x="10" y="90" width="60" height="18" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="40" y="103" fill="#e6e6e6" font-size="7.4" text-anchor="middle">client</text>
    <rect x="10" y="112" width="60" height="18" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="40" y="125" fill="#e6e6e6" font-size="7.4" text-anchor="middle">client</text>
    <text x="40" y="144" fill="#9aa4b2" font-size="7.4" text-anchor="middle">10k+ conns</text>
    <line x1="72" y1="88" x2="94" y2="88" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#st)"/>
    <rect x="96" y="60" width="110" height="56" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="151" y="82" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">epoll</text><text x="151" y="97" fill="#e6e6e6" font-size="7.6" text-anchor="middle">I/O multiplexing</text><text x="151" y="109" fill="#9aa4b2" font-size="7.2" text-anchor="middle">one thread watches all</text>
    <line x1="206" y1="88" x2="228" y2="88" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#st)"/>
    <rect x="230" y="60" width="158" height="56" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="309" y="78" fill="#e6e6e6" font-size="8.2" text-anchor="middle">command queue (one line)</text><rect x="242" y="88" width="40" height="20" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="262" y="102" fill="#9aa4b2" font-size="7.2" text-anchor="middle">cmd1</text><rect x="288" y="88" width="40" height="20" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="308" y="102" fill="#9aa4b2" font-size="7.2" text-anchor="middle">cmd2</text><rect x="334" y="88" width="40" height="20" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="354" y="102" fill="#9aa4b2" font-size="7.2" text-anchor="middle">cmd3</text>
    <line x1="388" y1="88" x2="410" y2="88" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#st)"/>
    <rect x="412" y="60" width="156" height="56" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.5"/><text x="490" y="82" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">single-thread execution</text><text x="490" y="98" fill="#e6e6e6" font-size="7.8" text-anchor="middle">one at a time, each atomic</text><text x="490" y="110" fill="#9aa4b2" font-size="7.2" text-anchor="middle">no locks, no races</text>
    <text x="290" y="168" fill="#9aa4b2" font-size="8.4" text-anchor="middle">Redis 6's "multithreading" is only for socket reads/writes, the network chores —</text>
    <text x="290" y="184" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">command execution stays single-threaded, so atomicity and lock-freedom are unchanged</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">One thread runs one loop, using <b>epoll</b> to watch tens of thousands of connections at once: whoever has data gets handled, the commands go into <b>one queue</b>, and they run to completion one by one. The model buys three things — <b>no locks</b> (no threads fighting over resources), <b>no races</b> (two commands can never modify the same key at the same time), <b>atomic</b> (each command finishes before the next starts, indivisible by construction). The single thread isn't a compromise; it's a design advantage bought with "simple and predictable"</figcaption>
</figure>

## What Redis 6's "multithreading" is (don't misread it)

You may have heard "Redis 6 supports multithreading now" — a line that's easy to misread. The fact: the multithreading Redis 6 added is **only for network I/O** (reading requests, writing responses back to sockets — serialisation chores that genuinely take time under heavy traffic); but **command execution itself is still single-threaded**. So it didn't become a "multithreaded database", and every lock-free, atomic benefit above still holds. This matters: don't assume that because "Redis is multithreaded now" the slow-command problem has gone away — it hasn't; execution is still one queue.

## The price: one slow command, everyone blocked

The single thread's biggest price hides in "every command waits in the same queue": **if one command runs long, every other client waits.** There's no second thread to serve them:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Slow commands blocking everyone, compared. Top row, the wrong way: KEYS star or a huge HGETALL is O(N) and done in one go, holding the only thread; meanwhile clients B, C and D all wait until they time out, and upstream retries pour fuel on the fire. Bottom row, the right way: SCAN with a cursor in batches, each scanning a small O(1) batch, letting other commands slip in between, so the whole server isn't blocked. Below: the same for HSCAN, SSCAN and ZSCAN; delete big keys with the asynchronous UNLINK instead of DEL; enable SLOWLOG to catch slow commands." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">One slow command, everyone blocked</text>
    <text x="60" y="52" fill="#e0733a" font-size="8.4" text-anchor="middle" font-weight="bold">❌ all at once</text>
    <rect x="118" y="38" width="404" height="28" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.4"/><text x="320" y="56" fill="#e6e6e6" font-size="8.4" text-anchor="middle">KEYS * · full-DB scan O(N) · done in one go (holds the only thread)</text>
    <text x="290" y="86" fill="#e0733a" font-size="8.2" text-anchor="middle">→ meanwhile clients B, C, D all wait → timeout → upstream retries → fuel on the fire</text>
    <line x1="60" y1="100" x2="520" y2="100" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="60" y="128" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">✅ cursor batches</text>
    <rect x="118" y="114" width="76" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="156" y="131" fill="#e6e6e6" font-size="7.6" text-anchor="middle">SCAN(1)</text>
    <rect x="198" y="114" width="60" height="26" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="228" y="131" fill="#9aa4b2" font-size="7.4" text-anchor="middle">other cmd</text>
    <rect x="262" y="114" width="76" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="300" y="131" fill="#e6e6e6" font-size="7.6" text-anchor="middle">SCAN(2)</text>
    <rect x="342" y="114" width="60" height="26" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="372" y="131" fill="#9aa4b2" font-size="7.4" text-anchor="middle">other cmd</text>
    <rect x="406" y="114" width="76" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="444" y="131" fill="#e6e6e6" font-size="7.6" text-anchor="middle">SCAN(3)</text>
    <text x="290" y="160" fill="#54b890" font-size="8.2" text-anchor="middle">each scan does a small O(1) batch; other commands slip in between → nobody blocked</text>
    <rect x="40" y="176" width="500" height="30" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="195" fill="#9aa4b2" font-size="8" text-anchor="middle">likewise HSCAN / SSCAN / ZSCAN; UNLINK (async) instead of DEL for big keys; SLOWLOG to catch slow commands</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Because there's only one queue, one O(N) slow command leaves the whole Redis unresponsive to <b>every</b> client for those tens or hundreds of milliseconds. The frightening part is that the consequences amplify: client timeouts → retries → more pressure, rolling into a <a href="/blog/sre-cascading-failures/">cascading failure</a>. The shared spirit of the fixes is <b>"don't do it all at once; do it in batches, and yield"</b> — the <code>SCAN</code> family's cursor batches instead of <code>KEYS</code>/<code>HGETALL</code> grabbing everything, and <code>UNLINK</code> to free big keys asynchronously</figcaption>
</figure>

The practical landmine list is worth memorising: `KEYS *` (scans the whole DB), `HGETALL`/`SMEMBERS`/`LRANGE 0 -1` on big collections (fetches the whole thing), `SORT` on big collections, `DEL` on a giant key with millions of elements (just freeing the memory is O(N)), and Lua scripts that run too long. What they share is **O(N) and done in one go**, and in a single-threaded world, "done in one go" means "nobody else gets to use it meanwhile".

## Ops commands: avoid O(N), catch slow commands

Turning the pits above into actual practice — these lines are the daily muscle memory of operating Redis:

```bash
# ✗ never fire these full O(N) scans in Production; one line blocks everyone
KEYS *                              # scans the whole DB
SMEMBERS bigset                     # pulls a whole big set at once
# ✓ use cursor batches instead, non-blocking
SCAN 0 MATCH user:* COUNT 100       # keep calling with the returned cursor until it returns 0
# find the culprit
SLOWLOG GET 10                      # the last 10 slow commands (with duration and arguments)
redis-cli --bigkeys                 # scan for big keys hogging memory
OBJECT ENCODING mykey               # see the underlying encoding; giant structures are the usual culprit
UNLINK bigkey                       # ✓ non-blocking delete (DEL on a big key freezes everyone)
```

The rule in one line: **under a single thread, every O(N) is a tax on the whole room.** `SCAN` instead of `KEYS`, `SLOWLOG` / `--bigkeys` to catch the culprit, `UNLINK` instead of `DEL` for big keys — those three cover a good half of Redis performance incidents.

## Reflections

### The single thread is a classic trade of "simplicity for predictability"

Redis's single-threaded design is my favourite example for explaining "engineering trade-offs". Most people's intuition is "multithreaded = fast = good", but Redis proves the reverse: when your bottleneck isn't the CPU, the parallel benefit of multithreading is small and the cost of locks and races is large — **at which point "single-threaded" is the faster, simpler, more predictable choice**. It taught me that performance design isn't "add everything that could speed things up"; it's **find the bottleneck first**, then decide where to invest. Pile on parallel capabilities you don't use and all you get is bugs you do. Optimising the wrong bottleneck is the most expensive kind of wasted effort.

### A slow command freezing the room is the easiest Redis pit to fall into, with the worst consequences

I've watched too many people fall into the `KEYS *` pit — lightning fast on a laptop with little data, and then in Production with millions of keys, one `KEYS *` freezes the whole Redis for hundreds of milliseconds and every dependent service times out at once. The insidious part is that it's **perfectly fine normally**, exploding only once the data has grown and someone's itchy fingers fire a full scan. Since then I've set two rules: **ban** `KEYS` in Production (use `SCAN`), and **before any operation that touches "the whole collection", ask "can this collection grow large"**. The single thread's advantage is predictability, but that predictability has a precondition — that you never put a command that won't finish into the only queue there is.

### Checking a command's complexity is basic craft for any in-memory system

Redis forced a good habit on me: **before using a command, look up its time complexity.** The Redis docs are considerate and mark every command's complexity — `GET` is O(1), `ZADD` is O(log N), `SMEMBERS` is O(N), `SINTERSTORE` depends on the smallest set. These aren't academic details; they're the direct indicator of "will this line take the service down at 3am". My habit now: whenever I see O(N) or worse, I automatically think one step further — "how big will this N get, will it blow up". The habit isn't just for Redis — estimating the complexity and worst case of any operation before putting it on the hot path is the basic craft that keeps "usually fast, occasionally explodes", the hardest class of problem to diagnose, from reaching Production.
