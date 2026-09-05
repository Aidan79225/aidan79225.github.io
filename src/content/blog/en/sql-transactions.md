---
title: "Transactions and Isolation Levels: Graded Ways to Keep Concurrency from Fighting"
date: 2026-07-11
category: tech
description: "The earlier posts were about making one query fast; this one is about how \"many transactions running at once\" avoid fighting. The genuinely interesting letter in ACID is I (isolation): concurrency throws up three anomalies — dirty reads, non-repeatable reads, phantoms — and the four isolation levels are a spectrum for picking your point between \"safe\" and \"fast\". Along the way, how PostgreSQL uses MVCC so reads don't block writes, and where deadlocks come from and how to dodge them."
tags:
 - sql
 - concept
series: "SQL: I Thought I Knew It"
seriesOrder: 11
comments: true
draft: false
translationOf: sql-transactions
---
Everything so far has been "how one query runs fast" ([[sql-index|indexes]], [[sql-explain|EXPLAIN]]); this post switches dimension: **many transactions running at once — how do they avoid fighting each other?** That's transactions and isolation levels. (This covers **single-node PostgreSQL** in practice; distributed transactions and consistency are left to the sister [[ddia-reliable-scalable|DDIA series]] to go deeper, so the two don't repeat.)

## ACID: the point is really the I (isolation)

The four letters of a transaction's ACID: **A**tomicity (all or nothing), **C**onsistency (constraints never broken), **I**solation (concurrent transactions don't interfere), **D**urability (once committed, never lost). Three of them are fairly intuitive; the genuinely interesting one, and the one that goes wrong most often, is **Isolation** — because "perfect isolation" is expensive, so it's cut into several grades for you to choose from.

## The three anomalies concurrency throws up

Two transactions running at once, with insufficient isolation, produce three classic read anomalies. A concrete scene makes them vivid — you (T1) are checking an account balance while someone else (T2) is operating on it at the same time:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 260" role="img" aria-label="Timelines of three read anomalies, using an account balance and orders as examples. Dirty read: T2 changes the balance to 200 but has not committed, T1 reads 200, and T2 then rolls back, so T1 read a number that never existed. Non-repeatable read: T1 reads balance 100, T2 changes it to 200 and commits, and T1 reads again within the same transaction and gets 200. Phantom read: T1 finds 3 orders, T2 inserts a matching order and commits, and T1 queries again and finds 4." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
 <text x="20" y="34" fill="#e6e6e6" font-size="10" text-anchor="start" font-weight="bold">① Dirty Read</text>
 <line x1="56" y1="52" x2="560" y2="52" stroke="#2a3040" stroke-width="1"/>
 <line x1="56" y1="74" x2="560" y2="74" stroke="#2a3040" stroke-width="1"/>
 <text x="34" y="55" fill="#9aa4b2" font-size="8" text-anchor="middle">T1</text>
 <text x="34" y="77" fill="#9aa4b2" font-size="8" text-anchor="middle">T2</text>
 <rect x="72" y="64" width="120" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="132" y="78" fill="#e6e6e6" font-size="7.6" text-anchor="middle">balance → 200 (uncommitted)</text>
 <rect x="250" y="42" width="96" height="20" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="298" y="56" fill="#e0733a" font-size="7.6" text-anchor="middle">reads balance 200 ❌</text>
 <rect x="400" y="64" width="80" height="20" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="440" y="78" fill="#e0733a" font-size="7.6" text-anchor="middle">ROLLBACK</text>
 <text x="20" y="110" fill="#e6e6e6" font-size="10" text-anchor="start" font-weight="bold">② Non-repeatable Read</text>
 <line x1="56" y1="130" x2="560" y2="130" stroke="#2a3040" stroke-width="1"/>
 <line x1="56" y1="152" x2="560" y2="152" stroke="#2a3040" stroke-width="1"/>
 <text x="34" y="133" fill="#9aa4b2" font-size="8" text-anchor="middle">T1</text>
 <text x="34" y="155" fill="#9aa4b2" font-size="8" text-anchor="middle">T2</text>
 <rect x="72" y="120" width="80" height="20" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.1"/><text x="112" y="134" fill="#e6e6e6" font-size="7.6" text-anchor="middle">reads balance 100</text>
 <rect x="210" y="142" width="122" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="271" y="156" fill="#e6e6e6" font-size="7.6" text-anchor="middle">balance → 200, commits</text>
 <rect x="360" y="120" width="110" height="20" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="415" y="134" fill="#e0733a" font-size="7.6" text-anchor="middle">reads balance 200 again ❌</text>
 <line x1="345" y1="122" x2="345" y2="160" stroke="#d6a45c" stroke-width="1" stroke-dasharray="3 2"/>
 <text x="20" y="188" fill="#e6e6e6" font-size="10" text-anchor="start" font-weight="bold">③ Phantom Read</text>
 <line x1="56" y1="206" x2="560" y2="206" stroke="#2a3040" stroke-width="1"/>
 <line x1="56" y1="228" x2="560" y2="228" stroke="#2a3040" stroke-width="1"/>
 <text x="34" y="209" fill="#9aa4b2" font-size="8" text-anchor="middle">T1</text>
 <text x="34" y="231" fill="#9aa4b2" font-size="8" text-anchor="middle">T2</text>
 <rect x="72" y="196" width="80" height="20" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.1"/><text x="112" y="210" fill="#e6e6e6" font-size="7.6" text-anchor="middle">finds 3 orders</text>
 <rect x="200" y="218" width="142" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="271" y="232" fill="#e6e6e6" font-size="7.6" text-anchor="middle">inserts 1 matching order, commits</text>
 <rect x="360" y="196" width="110" height="20" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="415" y="210" fill="#e0733a" font-size="7.6" text-anchor="middle">now finds 4 orders ❌</text>
 <line x1="345" y1="198" x2="345" y2="236" stroke="#d6a45c" stroke-width="1" stroke-dasharray="3 2"/>
 <text x="558" y="252" fill="#9aa4b2" font-size="7.5" text-anchor="end">time →</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e0733a">Dirty read</b>: reading a value someone hasn't committed yet (and may still roll back); <b style="color:#e0733a">non-repeatable read</b>: reading the same row twice and someone changed its value in between; <b style="color:#e0733a">phantom read</b>: running the same query twice and someone's insert changed the row count. Increasing in severity</figcaption>
</figure>

Put the three into the scene and they're obvious:

- **Dirty read**: T2 changes the balance to 200 but **hasn't committed**, and you already read 200 — then T2's transaction fails and `ROLLBACK`s, so that 200 **never truly existed**. Yet you've already made a decision on a "ghost number" (say, "balance is sufficient, approve the withdrawal").
- **Non-repeatable read**: you check the balance twice **within the same transaction**, 100 the first time and 200 the second (T2 committed a transfer in between). Your logic assumed "within one transaction, the same row's value won't change", and now reconciliation and totals are all off.
- **Phantom read**: you count "all of today's orders" and get 3, T2 inserts a new order and commits, you query again and get 4. **The difference from a non-repeatable read is crucial**: a non-repeatable read is "**an existing row's value changed**", a phantom is "**a whole row appeared or vanished out of nowhere**" — one concerns `UPDATE`, the other `INSERT`/`DELETE`, so the means of preventing them differ too (to block phantoms you lock a "range", not just "those rows").

## Four isolation levels: a "safety vs performance" spectrum

An isolation level is a grade of "which of the anomalies above am I willing to tolerate, in exchange for how much concurrency". Stricter is safer, but with less concurrency:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 208" role="img" aria-label="Isolation level table. Read Uncommitted: dirty reads, non-repeatable reads and phantoms all possible. Read Committed (PG default): prevents dirty reads, non-repeatable reads and phantoms still possible. Repeatable Read: prevents all three (PostgreSQL's MVCC blocks phantoms too). Serializable: prevents all. Further down is safer but with lower concurrency." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
 <text x="105" y="38" fill="#9aa4b2" font-size="8.5" text-anchor="middle" font-weight="bold">isolation level</text>
 <text x="250" y="38" fill="#9aa4b2" font-size="8.5" text-anchor="middle" font-weight="bold">dirty read</text>
 <text x="350" y="38" fill="#9aa4b2" font-size="8.5" text-anchor="middle" font-weight="bold">non-repeatable</text>
 <text x="460" y="38" fill="#9aa4b2" font-size="8.5" text-anchor="middle" font-weight="bold">phantom</text>
 <rect x="24" y="46" width="500" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
 <text x="105" y="65" fill="#e6e6e6" font-size="8.7" text-anchor="middle">Read Uncommitted</text>
 <text x="250" y="65" fill="#e0733a" font-size="8.5" text-anchor="middle">possible</text><text x="350" y="65" fill="#e0733a" font-size="8.5" text-anchor="middle">possible</text><text x="460" y="65" fill="#e0733a" font-size="8.5" text-anchor="middle">possible</text>
 <rect x="24" y="80" width="500" height="30" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/>
 <text x="105" y="99" fill="#e6e6e6" font-size="8.7" text-anchor="middle">Read Committed (PG default)</text>
 <text x="250" y="99" fill="#54b890" font-size="8.5" text-anchor="middle">prevented</text><text x="350" y="99" fill="#e0733a" font-size="8.5" text-anchor="middle">possible</text><text x="460" y="99" fill="#e0733a" font-size="8.5" text-anchor="middle">possible</text>
 <rect x="24" y="114" width="500" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
 <text x="105" y="133" fill="#e6e6e6" font-size="8.7" text-anchor="middle">Repeatable Read</text>
 <text x="250" y="133" fill="#54b890" font-size="8.5" text-anchor="middle">prevented</text><text x="350" y="133" fill="#54b890" font-size="8.5" text-anchor="middle">prevented</text><text x="460" y="133" fill="#54b890" font-size="8.5" text-anchor="middle">prevented*</text>
 <rect x="24" y="148" width="500" height="30" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
 <text x="105" y="167" fill="#e6e6e6" font-size="8.7" text-anchor="middle">Serializable</text>
 <text x="250" y="167" fill="#54b890" font-size="8.5" text-anchor="middle">prevented</text><text x="350" y="167" fill="#54b890" font-size="8.5" text-anchor="middle">prevented</text><text x="460" y="167" fill="#54b890" font-size="8.5" text-anchor="middle">prevented</text>
 <text x="290" y="197" fill="#9aa4b2" font-size="7.8" text-anchor="middle">↓ further down is safer but less concurrent. * PG's Repeatable Read blocks phantoms too via MVCC (the standard only requires the first two)</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Four levels from loose to strict. PostgreSQL's lowest is <code>Read Committed</code> (it doesn't offer Read Uncommitted), which is also the default; most OLTP is fine with it, and only where consistency truly matters (transfers, stock deduction) do you step up to Repeatable Read or Serializable</figcaption>
</figure>

## MVCC: how PostgreSQL makes "reads not block writes"

You might ask: to prevent these anomalies, don't you just lock and make everyone queue? Wouldn't concurrency then be terrible? PostgreSQL's answer is **MVCC (multi-version concurrency control)**, in one sentence: **the same row can exist in several versions at once, and each transaction, when it reads, sees the version its "snapshot" should see.**

Concretely? Every row hides two system columns: **xmin** (which transaction created this version) and **xmax** (which transaction invalidated it). So:

- **`UPDATE` doesn't modify in place**; it **adds a new version** (a new xmin) and marks the old version with xmax (meaning "invalid from this transaction on").
- **`DELETE` doesn't really delete** either; it just marks the version with xmax.
- **A read** takes the transaction's own snapshot, compares each version's xmin / xmax, and picks the version "visible to me".

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 210" role="img" aria-label="MVCC multi-version illustration: the same balance row has two versions, v1 balance 100 superseded by T2, and v2 balance 200 created by T2 and still valid, with T2's commit point in the middle. Reader A's snapshot is before T2's commit and sees v1's 100; reader B's snapshot is after T2's commit and sees v2's 200. UPDATE adds v2 and marks v1 invalid, and readers pick a version by their own snapshot, so reads don't block writes" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
 <defs><marker id="mv" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
 <line x1="300" y1="40" x2="300" y2="152" stroke="#d6a45c" stroke-width="1.2" stroke-dasharray="4 3"/>
 <text x="300" y="32" fill="#d6a45c" font-size="8.5" text-anchor="middle">T2 commits</text>
 <rect x="50" y="48" width="250" height="38" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.4"/>
 <text x="175" y="66" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v1 · balance 100</text>
 <text x="175" y="79" fill="#9aa4b2" font-size="7.5" text-anchor="middle">superseded by T2 (xmax set)</text>
 <rect x="300" y="48" width="232" height="38" rx="5" fill="#1e2a40" stroke="#4f6df5" stroke-width="1.4"/>
 <text x="416" y="66" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v2 · balance 200</text>
 <text x="416" y="79" fill="#9aa4b2" font-size="7.5" text-anchor="middle">created by T2, still valid</text>
 <rect x="108" y="118" width="134" height="34" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/>
 <text x="175" y="133" fill="#e6e6e6" font-size="9" text-anchor="middle">reader A</text>
 <text x="175" y="146" fill="#9aa4b2" font-size="7.5" text-anchor="middle">snapshot: before T2 commits</text>
 <line x1="175" y1="118" x2="175" y2="88" stroke="#54b890" stroke-width="1.3" marker-end="url(#mv)"/>
 <text x="175" y="170" fill="#54b890" font-size="8.5" text-anchor="middle">→ sees 100</text>
 <rect x="356" y="118" width="134" height="34" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/>
 <text x="423" y="133" fill="#e6e6e6" font-size="9" text-anchor="middle">reader B</text>
 <text x="423" y="146" fill="#9aa4b2" font-size="7.5" text-anchor="middle">snapshot: after T2 commits</text>
 <line x1="423" y1="118" x2="423" y2="88" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#mv)"/>
 <text x="423" y="170" fill="#4f6df5" font-size="8.5" text-anchor="middle">→ sees 200</text>
 <text x="290" y="196" fill="#9aa4b2" font-size="8" text-anchor="middle">UPDATE = add v2 + mark v1 invalid; each reader picks a version by its own snapshot → reads don't block writes</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Two versions of the same row coexist, and readers each see the version their snapshot's moment should see. A "read" can always get a consistent old version without waiting for a "write" to release its lock — that's <b>reads don't block writes, writes don't block reads</b></figcaption>
</figure>

### Isolation levels are really "when you take the snapshot"

MVCC makes the isolation-level table above easy to understand — the difference is just **how often you take a fresh snapshot**:

- **Read Committed (PG default)**: **every SQL statement** takes a new snapshot. So you read the latest "committed" data, but two statements in the same transaction may see different things → hence non-repeatable reads.
- **Repeatable Read**: **the whole transaction takes one snapshot at the start** and uses it throughout. So reading the same row any number of times gives the same value (blocking non-repeatable reads), and even "the range of rows matching a condition" is frozen at that moment (PG blocks phantoms as a bonus).

In one sentence: **Read Committed sees "the world right now"; Repeatable Read sees "the world at the moment the transaction began".**

### Reads don't block writes, but "writes still block writes"

Note that MVCC solves the "read vs write" conflict; it isn't a cure-all. **Two transactions changing the same row at the same time still block each other** — the later one has to wait for the earlier to commit or roll back (and under Repeatable Read / Serializable it may be judged a conflict outright and aborted, asking you to retry). So "hot rows" (everyone fighting to change the same row, like a site-wide counter or flash-sale stock) remain a performance and conflict pain point under MVCC, and need other moves (splitting, queues, optimistic-lock retries) to resolve.

### The price: old versions pile up, and VACUUM has to clear them

Multi-versioning isn't free. Invalidated old versions (dead tuples) don't vanish immediately; they stay in the table taking space until PostgreSQL's **`VACUUM`** (usually the background autovacuum) reclaims them. If updates are heavy and VACUUM can't keep up, the table **bloats** and scans slow down. That's MVCC's hidden bill — it buys high concurrency with "keep multiple versions", and the price is making sure VACUUM keeps pace with writes. This "don't overwrite, keep versions" way of thinking is in the same family as the append-only storage chapter of [[ddia-reliable-scalable|DDIA]] and [[sql-time-scd|SCD Type 2]]'s "add a version instead of overwriting".

## Deadlock: circular waiting

Concurrency has one more classic nuisance: **deadlock**. T1 locks A and wants B next; T2 locks B and wants A next — each waits for the other to let go, and neither can move. The database **detects the cycle and kills one of the transactions** (returning a deadlock error) so the other can proceed. The key avoidance move is plain: **have every transaction acquire locks in a fixed order** (always lock the smaller id first, say), and the cycle can't form.

## Reflections

### The isolation level is a spectrum you have to "choose yourself"

My instinct used to be "obviously pick the safest, Serializable"; only later did I understand that's wrong — **the safest is also the slowest**, and under high concurrency a pile of transactions gets forced into serial execution, blocking each other. The right mindset: know which anomalies each level "lets through", then upgrade only **where things would truly go wrong** (transfers, stock deduction, ticket grabbing), and use the default Read Committed elsewhere. It's the same thinking as [[sre-intro|SRE's error budget]]: **not pursuing the extreme, but choosing a trade-off point worthy of the scenario.** Cranking it to max blindly and ignoring it blindly are both failures to think.

### MVCC turns "conflict" from "mutual exclusion now" into "version management"

MVCC's "reads don't block writes" looks counter-intuitive at first and beautiful once understood: it doesn't resolve conflicts by "everyone queuing for one copy of the data", but by **keeping multiple versions and letting each transaction see its own snapshot**. Conflict thereby changes from "do-or-die mutual exclusion in the moment" into "orderly version management". That shift runs deep — much modern concurrency design (including the distributed consistency later in [[ddia-reliable-scalable|DDIA]]) is, at heart, a variation on this "multi-version + snapshot" theme. **Swapping mutual exclusion for versions is one of the highest-return moves in concurrency design.**

### You don't dodge deadlocks by luck, you dodge them with "fixed order"

The deadlock fix taught me a more general truth: **many seemingly random, hard-to-reproduce concurrency bugs come down to a missing consistent order.** Two transactions grabbing the same few locks in different orders will collide into a cycle sooner or later; the moment the whole system agrees to "always lock in the same order", the cycle becomes mathematically impossible. It's the same thing as my takeaway from [[sql-execution-order|the processing-order post]], and even as [[sre-intro|a team needing one agreed ruler]] — **a consistent order or standard is often the least effortful way of turning chaos into control.** True of concurrency, true of collaboration.
