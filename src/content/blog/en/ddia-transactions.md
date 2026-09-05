---
title: "Transactions: The Write Skew Snapshot Isolation Can't Stop, and Three Roads to Serializability"
date: 2026-07-24
category: tech
description: "Isolation levels and MVCC were covered in the SQL series; DDIA Ch7's real added value is naming two insidious anomalies that even snapshot isolation can't stop: lost update (read-modify-write cycles overwriting each other) and write skew (two transactions each correct on their own, together breaking an invariant — the classic on-call doctors both taking leave). And, if you truly need the strongest guarantee, the three roads to serializability: actually running one at a time (Redis/VoltDB's single thread), two-phase locking (pessimistic), and SSI (optimistic — run first, validate at commit)."
tags:
  - distributed-systems
  - book-notes
  - transactions
series: "Designing Data-Intensive Applications — Reading Notes"
seriesOrder: 7
comments: true
draft: false
translationOf: ddia-transactions
---
I laid the foundations of transactions in the [[sql-transactions|SQL series]]: ACID's emphasis is on the I, the three anomalies of dirty read / non-repeatable read / phantom, the spectrum of four isolation levels, how MVCC lets reads not block writes — none of that is repeated here. DDIA Ch7's real added value is in the second half: **two insidious anomalies that even "snapshot isolation" can't stop** (lost update and write skew), and, when you truly need the strongest guarantee, **the three roads to serializability**. Conclusion first: most people think they're safe once snapshot isolation is on — **this chapter exists to break that sense of safety.**

## Lost update: two read-modify-write cycles overwrite each other

The first one is at least easy to recognise: **two transactions both "read → compute → write back"**, and running concurrently they can't see each other — both read 42, both add 1, both write back 43, and **one of the updates simply evaporates**. You've seen all the fixes: **atomic operations** (`UPDATE SET counter = counter + 1`, compressing read-modify-write into one step — the same as [[redis-single-thread|Redis's INCR]]), **explicit locking** (`SELECT ... FOR UPDATE`), or **compare-and-set optimistic locking** (verify the value hasn't changed when writing back — the same as [[redis-pipeline-transaction|Redis's WATCH]]). Lost update has mature medicine; the truly stubborn one is next.

## Write skew: each one right, together wrong

**Write skew** is this chapter's signature, and the most counter-intuitive of the lot. The classic scenario: a hospital requires **at least two doctors on call**, and Alice and Bob both want to take leave:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 242" role="img" aria-label="The timeline of write skew. The system invariant: at least two doctors on call, and currently both Alice and Bob are on call. Two transactions run concurrently: Alice's transaction first checks the number on call, reads 2, at least 2, the check passes, so it sets herself to on leave; at the same time Bob's transaction also checks, and because snapshot isolation shows it the old snapshot it also reads 2, the check also passes, and it also sets himself to on leave. The two transactions modify different rows, so there is no write conflict and snapshot isolation lets both commit. Result: the number on call becomes 0 and the invariant is broken. Key point: each transaction is correct on its own, but together they are wrong, because the condition each check relied on was silently changed by the other's write." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="ws" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Invariant: doctors on call ≥ 2 (now: Alice and Bob both on)</text>
    <text x="60" y="46" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">Alice's txn</text>
    <rect x="110" y="34" width="180" height="22" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="200" y="49" fill="#e6e6e6" font-size="7.4" text-anchor="middle">① count on call → reads 2 ≥ 2 ✓</text>
    <rect x="322" y="34" width="180" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="412" y="49" fill="#e6e6e6" font-size="7.4" text-anchor="middle">② set "self" to on leave</text>
    <line x1="290" y1="45" x2="320" y2="45" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ws)"/>
    <text x="60" y="94" fill="#d6a45c" font-size="9" text-anchor="middle" font-weight="bold">Bob's txn</text>
    <rect x="110" y="82" width="180" height="22" rx="4" fill="#262b3a" stroke="#d6a45c" stroke-width="1.2"/><text x="200" y="97" fill="#e6e6e6" font-size="7.4" text-anchor="middle">① count on call → also reads 2 ✓</text>
    <rect x="322" y="82" width="180" height="22" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="412" y="97" fill="#e6e6e6" font-size="7.4" text-anchor="middle">② set "self" to on leave</text>
    <line x1="290" y1="93" x2="320" y2="93" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ws)"/>
    <text x="200" y="122" fill="#9aa4b2" font-size="7" text-anchor="middle">(snapshot isolation: both see the old snapshot's 2)</text>
    <text x="412" y="122" fill="#9aa4b2" font-size="7" text-anchor="middle">(different rows → no write conflict, both commit)</text>
    <rect x="140" y="140" width="300" height="30" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.6"/>
    <text x="290" y="159" fill="#e05a7d" font-size="9.4" text-anchor="middle" font-weight="bold">Result: doctors on call = 0, invariant broken 💥</text>
    <rect x="40" y="184" width="500" height="44" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="202" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-weight="bold">Each txn is right "on its own"; the error: the condition you checked was silently changed by the other's write</text>
    <text x="290" y="219" fill="#9aa4b2" font-size="7.4" text-anchor="middle">Same script: double-booked meeting room, two accounts claiming a username, a balance debited twice at once</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Both transactions are "<b>check first, then act</b>": each counts the doctors on call (under snapshot isolation both read the old snapshot's 2 ✓), and each sets <b>its own row</b> to on leave. Because they modify <b>different rows</b>, there's no write conflict and snapshot isolation lets both commit — and the number on call drops to zero. <b style="color:#e05a7d">Each transaction is correct on its own, but together they break the invariant</b> — because the condition your check relied on was silently changed by the other's write. That's <b>write skew</b>; swap "count doctors" for "is the meeting room free" or "is this username taken" and it's the version next to you. And phantoms are its fuel: what you checked was "the result of a query on some condition", and someone else's write changed that result</figcaption>
</figure>

Why the usual tools can't cure it: the two transactions **write different rows**, so snapshot isolation's detection of "same-row write conflicts" can't catch it; you'd like to `FOR UPDATE` lock, but **the thing to lock may not exist yet** (checking "nobody has booked this room" — what you want to lock is "a booking that doesn't exist", which is the phantom at work). Only two real cures: **materialise the conflict** (turn the "abstract condition" into a real row you can lock, say a room table with one row per time slot), or — upgrade to true **serializability**.

## Three roads to serializability

The definition of serializable is pure: **the outcome is equivalent to "all transactions run one after another"**. What's interesting is that the three ways of implementing it have wildly different personalities:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 226" role="img" aria-label="Three roads to serializability. First: actually run one at a time, single-threaded serial execution; no concurrency means no concurrency problems; Redis and VoltDB take this road, provided every transaction is fast, data is in memory, and there is no interactive waiting. Second: two-phase locking, 2PL, the pessimistic school; both reads and writes take locks and block each other, block first and ask later; safe but high latency, poor throughput, and deadlocks. Third: SSI, serializable snapshot isolation, the optimistic school; everyone runs first, then validates at commit whether anyone else affected them, aborting and retrying if so; performs well with few conflicts, retries endlessly with many." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="193" y1="14" x2="193" y2="186" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="387" y1="14" x2="387" y2="186" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="97" y="28" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">① Actually run one at a time</text>
    <rect x="36" y="42" width="122" height="52" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/>
    <text x="97" y="62" fill="#e6e6e6" font-size="7.6" text-anchor="middle">single-threaded serial execution</text>
    <text x="97" y="78" fill="#9aa4b2" font-size="7" text-anchor="middle">no concurrency = no concurrency bugs</text>
    <text x="97" y="114" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">strongest isolation, dumbest method</text>
    <text x="97" y="132" fill="#e0733a" font-size="7" text-anchor="middle">requires: every txn fast (in-memory, no I/O waits)</text>
    <text x="97" y="152" fill="#9aa4b2" font-size="6.8" text-anchor="middle">Redis (Lua/MULTI) / VoltDB</text>
    <text x="290" y="28" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">② Two-phase locking (pessimistic)</text>
    <rect x="229" y="42" width="122" height="52" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="290" y="62" fill="#e6e6e6" font-size="7.6" text-anchor="middle">lock reads and writes, both block</text>
    <text x="290" y="78" fill="#9aa4b2" font-size="7" text-anchor="middle">"block first, ask later"</text>
    <text x="290" y="114" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">safe, long history</text>
    <text x="290" y="132" fill="#e0733a" font-size="7" text-anchor="middle">high latency, poor throughput, deadlocks</text>
    <text x="290" y="152" fill="#9aa4b2" font-size="6.8" text-anchor="middle">classic serializable (MySQL etc.)</text>
    <text x="483" y="28" fill="#9b6ff0" font-size="9.4" text-anchor="middle" font-weight="bold">③ SSI (optimistic)</text>
    <rect x="422" y="42" width="122" height="52" rx="6" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.4"/>
    <text x="483" y="62" fill="#e6e6e6" font-size="7.6" text-anchor="middle">everyone runs, validate at commit</text>
    <text x="483" y="78" fill="#9aa4b2" font-size="7" text-anchor="middle">affected by someone → abort, retry</text>
    <text x="483" y="114" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">few conflicts: nearly free</text>
    <text x="483" y="132" fill="#e0733a" font-size="7" text-anchor="middle">many conflicts: abort and retry forever</text>
    <text x="483" y="152" fill="#9aa4b2" font-size="6.8" text-anchor="middle">PostgreSQL's serializable</text>
    <rect x="30" y="196" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="213" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">Txns short and fast → ①; conflicts likely → ② (lock first); conflicts rare → ③ (run first, retry occasionally)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#54b890">① Serial execution</b>: simply don't run concurrently — one thread, one transaction after another, and concurrency problems don't exist by construction. <a href="/blog/redis-single-thread/">Redis</a> (MULTI/Lua) and VoltDB take this road; the precondition is that every transaction is fast (data in memory, no waiting on the outside world inside a transaction). <b style="color:#4f6df5">② 2PL</b> (pessimistic): lock reads and writes, both block each other — "something will go wrong, so block first"; safe, but latency and throughput are ugly and it <a href="/blog/sql-transactions/">deadlocks</a>. <b style="color:#9b6ff0">③ SSI</b> (optimistic): let everyone run, and at commit validate "did anyone change what you read" — if so, abort and retry; nearly free when conflicts are rare, endless wasted retries when they're common. <b>Which road depends on how fast your transactions are and how often they conflict</b></figcaption>
</figure>

## Reflections

### "Check first, then act" is the number-one red flag of the concurrent world

The biggest gift write skew gave me is a **code smell you can scan for**: any passage that "SELECTs to check a condition, then writes if it passes" is a suspect under concurrency — because **between the check and the action, the world may have changed**. Check the balance then debit, check stock then order, check the username is free then register, [[redis-distributed-lock|check the lock is yours then release it]] — all the same check-then-act shape. Now when I review such a passage the reflex is three questions: **are these two steps atomic? If not, what guarantees nobody slips in between? If someone does, what invariant breaks?** Eight times out of ten, the author hasn't thought about the third one. That smell detector is worth more than memorising any isolation level's definition.

### The strongest isolation comes from the dumbest method — and that's beautiful

Of the three roads to serializability, my favourite is the first: **simply don't run concurrently.** For decades people invented ever-cleverer locks and ever-subtler validation, and then Redis and VoltDB said: memory is fast enough now, I'll run one transaction at a time on a single thread and concurrency problems **don't exist by definition**. That's exactly the "trade simplicity for predictability" I admired in the [[redis-single-thread|Redis single-thread]] post — and DDIA placing it in the context of transaction theory makes it clearer: **it's not a trick, it's a legitimate implementation of serializable**, with its preconditions (short transactions, data in memory, no waiting on the outside) spelled out plainly. It reminds me: when the hardware or the scenario changes, "the dumbest method" deserves re-evaluating — a lot of clever designs are paying complexity for a bottleneck that no longer exists.

### Pessimistic or optimistic — just ask the conflict rate

2PL vs SSI is, in the end, the familiar question again: **pay the cost up front (lock first, everyone queues) or afterwards (run to completion, retry on collision)?** The criterion is clean — the **conflict rate**. Lots of transactions fighting over the same hot row, and the optimists abort until they question their existence — better to lock pessimistically; conflicts rare, and the pessimists' locks are a tax paid for nothing — optimism is nearly free. It's the same spectrum as [[redis-pipeline-transaction|Redis's WATCH]] and git's merge (optimistic: everyone edits their own copy, resolve only on conflict). I later turned it into a general decision framework: **for any "coordination" mechanism, estimate the conflict rate first, then decide whether to buy insurance (pessimistic) or carry the excess (optimistic).** The next chapter is harsher — once transactions span machines, even "locks" and "validation" themselves become unreliable, and that's where distributed systems get truly troublesome.
