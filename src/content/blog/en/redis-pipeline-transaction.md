---
title: "Pipelining, Transactions and Lua: Saving RTTs vs Atomicity"
date: 2026-07-21
category: tech
tags:
  - redis
  - distributed-systems
series: "Redis — Learning Notes"
seriesOrder: 11
comments: true
draft: false
translationOf: redis-pipeline-transaction
---
Three things are often lumped together that actually solve **completely different** problems: **pipelining** solves "too many network round trips"; **MULTI/EXEC** (transactions) solves "a group of commands must run together without interleaving"; **Lua** solves "atomic, and with logic". Confuse them and you'll use a pipeline as a transaction, or assume a Redis transaction can roll back like a database — both are pits. This post settles the division of labour once and for all.

## Pipelining: squeeze N round trips into 1

First, the most underrated bottleneck: **the network round trip (RTT)**. Fire 100 commands one at a time — send, wait for the reply, send the next — and that's **100 RTTs**. The commands themselves run in microseconds inside Redis; the time all goes on the network. A pipeline **sends them packed together and collects the replies together**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Sending commands one by one versus pipelining. Left, one by one: the client sends a command to the server, waits for the reply, then sends the next; three commands are three round trips, three times RTT in total. Right, pipeline: the client packs three commands into one send, the server returns three replies together, one round trip, one RTT. The commands themselves are fast; the time goes on network round trips, so packing saves a lot of RTT." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="pp" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">One by one N × RTT vs pipeline 1 × RTT</text>
    <rect x="10" y="30" width="272" height="176" rx="9" fill="none" stroke="#e0733a" stroke-width="1.3"/>
    <text x="146" y="48" fill="#e0733a" font-size="9.4" text-anchor="middle" font-weight="bold">① one by one: each waits a round trip</text>
    <text x="50" y="66" fill="#9aa4b2" font-size="7.6" text-anchor="middle">client</text><text x="242" y="66" fill="#9aa4b2" font-size="7.6" text-anchor="middle">server</text>
    <line x1="50" y1="70" x2="50" y2="192" stroke="#3a4154" stroke-width="1"/><line x1="242" y1="70" x2="242" y2="192" stroke="#3a4154" stroke-width="1"/>
    <line x1="52" y1="80" x2="240" y2="86" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#pp)"/><line x1="240" y1="96" x2="52" y2="102" stroke="#54b890" stroke-width="1.2" marker-end="url(#pp)"/>
    <line x1="52" y1="118" x2="240" y2="124" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#pp)"/><line x1="240" y1="134" x2="52" y2="140" stroke="#54b890" stroke-width="1.2" marker-end="url(#pp)"/>
    <line x1="52" y1="156" x2="240" y2="162" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#pp)"/><line x1="240" y1="172" x2="52" y2="178" stroke="#54b890" stroke-width="1.2" marker-end="url(#pp)"/>
    <text x="146" y="200" fill="#e0733a" font-size="8" text-anchor="middle" font-weight="bold">3 cmds = 3 round trips = 3 × RTT</text>
    <rect x="298" y="30" width="272" height="176" rx="9" fill="none" stroke="#54b890" stroke-width="1.3"/>
    <text x="434" y="48" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">② pipeline: packed into one round trip</text>
    <text x="338" y="66" fill="#9aa4b2" font-size="7.6" text-anchor="middle">client</text><text x="530" y="66" fill="#9aa4b2" font-size="7.6" text-anchor="middle">server</text>
    <line x1="338" y1="70" x2="338" y2="192" stroke="#3a4154" stroke-width="1"/><line x1="530" y1="70" x2="530" y2="192" stroke="#3a4154" stroke-width="1"/>
    <line x1="340" y1="104" x2="528" y2="110" stroke="#4f6df5" stroke-width="2.4" marker-end="url(#pp)"/><text x="434" y="98" fill="#9aa4b2" font-size="7.2" text-anchor="middle">cmd1 ; cmd2 ; cmd3 sent together</text>
    <line x1="528" y1="140" x2="340" y2="146" stroke="#54b890" stroke-width="2.4" marker-end="url(#pp)"/><text x="434" y="162" fill="#9aa4b2" font-size="7.2" text-anchor="middle">three replies back together</text>
    <text x="434" y="200" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">3 cmds = 1 round trip = 1 × RTT ✓</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e0733a">One by one</b>, every command waits for a network round trip, so N commands are N × RTT — the bottleneck isn't Redis at all, it's the network. A <b style="color:#54b890">pipeline</b> <b>sends several commands packed together and collects the replies together</b>, squeezing N commands into 1 round trip. But do remember: <b>a pipeline only saves network; it doesn't guarantee atomicity</b> — other clients' commands can still slip in between the commands in the batch. It solves "too many round trips", not "must not be interrupted"</figcaption>
</figure>

`redis-cli --pipe` pours large volumes of commands in, and in code you use the client's pipeline API. **It has nothing whatsoever to do with "atomic"** — the most common misconception. For "no interleaving", look at the next two.

## MULTI/EXEC: run together, but don't call it ACID

`MULTI` opens a transaction; the commands after it **queue up without executing**, until `EXEC` **runs them all in one go, with no other client's commands interleaved**. That sounds like a database transaction, but one key difference startles people: **a Redis transaction cannot roll back.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 212" role="img" aria-label="MULTI EXEC transactions and the WATCH optimistic lock. Top row: after MULTI, commands queue without running; at EXEC they run as a batch with no interleaving, giving isolation. But there is no rollback: if one command errors at runtime, for example LPUSH on a String, that one fails and the following commands still run. Bottom row: WATCH watches a key; if anyone else changed that key before EXEC, EXEC returns nil and the whole transaction is voided, and you retry yourself. That's an optimistic lock, CAS." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="mt" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">MULTI/EXEC: run together, no interleaving, but no rollback</text>
    <rect x="16" y="30" width="66" height="30" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="49" y="49" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">MULTI</text>
    <line x1="82" y1="45" x2="98" y2="45" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#mt)"/>
    <rect x="100" y="30" width="196" height="30" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="198" y="49" fill="#9aa4b2" font-size="8" text-anchor="middle">cmd1 · cmd2 · cmd3 (queued, not run yet)</text>
    <line x1="296" y1="45" x2="312" y2="45" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#mt)"/>
    <rect x="314" y="30" width="62" height="30" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="345" y="49" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">EXEC</text>
    <line x1="376" y1="45" x2="392" y2="45" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#mt)"/>
    <rect x="394" y="30" width="172" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="480" y="49" fill="#54b890" font-size="8" text-anchor="middle">run as a batch · no interleaving ✓</text>
    <rect x="16" y="72" width="550" height="30" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.4"/><text x="291" y="91" fill="#e05a7d" font-size="8.2" text-anchor="middle" font-weight="bold">✗ no rollback: a runtime error (e.g. LPUSH on a String) fails that one; the rest still run</text>
    <text x="290" y="128" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">WATCH: optimistic lock (CAS)</text>
    <rect x="30" y="138" width="140" height="36" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.4"/><text x="100" y="153" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">WATCH balance:1</text><text x="100" y="167" fill="#9aa4b2" font-size="7" text-anchor="middle">watch it before EXEC</text>
    <line x1="170" y1="156" x2="192" y2="156" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#mt)"/>
    <rect x="194" y="138" width="180" height="36" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="284" y="153" fill="#e6e6e6" font-size="8" text-anchor="middle">changed by someone before EXEC?</text><text x="284" y="167" fill="#9aa4b2" font-size="7" text-anchor="middle">(did anyone get there first)</text>
    <line x1="374" y1="156" x2="396" y2="156" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#mt)"/>
    <rect x="398" y="138" width="168" height="36" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="482" y="153" fill="#e05a7d" font-size="8" text-anchor="middle">changed → EXEC returns nil, void</text><text x="482" y="167" fill="#9aa4b2" font-size="7" text-anchor="middle">→ you retry</text>
    <text x="290" y="198" fill="#9aa4b2" font-size="8" text-anchor="middle">MULTI gives "run together, no interleaving"; WATCH gives "void if someone got there first" — neither is rollback</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">What a Redis transaction guarantees is <b style="color:#54b890">"run together, no interleaving"</b> (isolation), <b style="color:#e05a7d">not "all succeed or all fail"</b> — if one command errors during execution, the commands before and after it <b>still run</b>, with no rollback. (The one exception: a command with a syntax error gets the whole batch rejected before `EXEC`.) To handle the "read then modify" race, pair it with <b style="color:#d6a45c">WATCH</b>: watch a key, and if anyone else changes it before <code>EXEC</code>, the whole transaction is <b>voided and returns nil</b>, for you to retry — an optimistic lock (CAS), not locking others out but "if someone got there first, I start over"</figcaption>
</figure>

In commands, a "safe debit" with an optimistic lock looks like this:

```bash
WATCH balance:1          # watch the balance
# ...GET balance:1, work out in code whether there's enough to debit...
MULTI
DECRBY balance:1 100
EXEC                     # if balance:1 was changed by someone else meanwhile → returns nil, whole batch void, retry yourself
```

## Lua: the one that's truly "atomic + with logic"

`MULTI` has an inherent limit: the commands are **queued in advance**, so you **can't "read a value first and then decide whether to write based on the result"** — at queueing time there's no result yet. `WATCH` + retry can work around it, but it's clumsy. **A Lua script** is the modern answer: `EVAL` sends the whole script to the server, and thanks to [[redis-single-thread|Redis's single-threaded nature]], **the whole script runs atomically without interleaving**, and inside it you can read a value, branch on it, then write:

```lua
-- read, then decide, then write, the whole thing atomic (conditional logic MULTI can't do)
local b = tonumber(redis.call('GET', KEYS[1]))
if b >= 100 then
  return redis.call('DECRBY', KEYS[1], 100)   -- debit only if there's enough
else
  return -1                                    -- otherwise report back
end
```

One Lua script gives you three things at once: **saved RTTs** (the logic runs server-side, no round trips), **atomicity** (the single thread guarantees the whole thing runs uninterrupted), **logic** (if/else allowed). That's why a [[redis-distributed-lock|distributed lock]] must release with Lua wrapping "compare the token, delete only if it matches" into one script — exactly the "read, then decide whether to write based on the result" atomic operation that `MULTI` can't give you.

## Reflections

### "Saving RTTs" and "atomicity" are two problems; first work out which one you have

The most common misuse I've seen is using a pipeline as a transaction — assuming that because the commands are sent packed together they'll run "together, uninterrupted". They won't. **A pipeline solves the network (too many round trips); transactions/Lua solve concurrency (not wanting to be interleaved); they're two different dimensions.** Once that clicked, my first question when picking a tool is always: **what's hurting right now, the network or concurrency?** Network pain (hundreds of commands to fire) → pipeline; concurrency pain (these few steps must not have anyone slip in between) → MULTI or Lua. Classify the problem correctly and the tool picks itself — far more useful than memorising APIs.

### "Redis transactions can't roll back" isn't a defect; it's honesty

When I first learned Redis transactions don't roll back I was a bit stunned — is that still a transaction? Later I understood it's **a deliberate trade**: Redis takes the view that a command erroring at execution time is almost always "your program is wrong" (a List command on a String), the kind of error a rollback can't rescue the logic from anyway, so better to keep the engine simple and fast than carry the burden of rollback. It doesn't pretend to be a relational database. That taught me a habit for reading features: **don't be dazzled by the name; look at what it "actually guarantees".** Words like "transaction", "Secret", "lock" come with a halo, but the real guarantee under the halo is often narrower than the name. For the full ACID checklist, go back to [[sql-transactions|database transactions]]; use a Redis "transaction" as "a batch of commands that won't be interleaved", and that's just right.

### Lua's philosophy: move the logic next to the data

What I admire most about Lua is that it embodies an old and useful wisdom — **rather than moving the data to the logic (read it back to the client, decide, write it back, three trips and a race), move the logic to the data** and run it atomically in one go. It's the same thread as the [[redis-distributed-lock|distributed lock]] verifying its owner in Lua, as database stored procedures, even as [[infra-spark|Spark's data locality]] (push the computation to the node where the data lives): **moving is expensive; processing in place is cheap.** Redis's single thread makes the move especially clean — the whole script you send is atomic by nature, with no more worrying about concurrency. Now, whenever I meet a "read-modify-write" scenario with a race to fear, my first thought isn't to add a lock; it's: **can this whole thing become one atomic operation, sent to run next to the data?**
