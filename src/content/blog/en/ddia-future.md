---
title: "The Future of Data Systems: The Unbundled Database, Kappa, and End-to-End Correctness (Finale)"
date: 2026-07-24
category: tech
description: "DDIA's final chapter, where Kleppmann gathers the whole book into one bold perspective: the data architecture of the future is a database turned inside out — the components bundled inside a database (storage, indexes, cache, materialized views) taken apart, with a log as the hub and specialised systems as its followers. Your data platform is really an unbundled database. Plus two practical closers: lambda vs kappa (two sets of logic vs one replayable log), and the most honest lesson of all — even with exactly-once, the last mile of correctness is always end to end (request ids, audits); never trust any middleware blindly."
tags:
  - distributed-systems
  - book-notes
  - data-engineering
series: "Designing Data-Intensive Applications — Reading Notes"
seriesOrder: 12
comments: true
draft: false
translationOf: ddia-future
---
The final chapter. The first eleven took storage, replication, partitioning, transactions, consensus, batch and streams apart piece by piece; here Kleppmann gathers them into one bold perspective: **stop treating "the database" as a box — take it apart.** And by the time you get here, you'll realise you already live inside that "future".

## Unbundling: your data platform is a database taken apart

A database is really a **bundle** of features: storage engine, indexes, cache, materialized views, replication log — all in one box, kept consistent by the DB's internals. Kleppmann's observation is that **modern data platforms are taking that box apart** — each feature handled by a specialised system, and the glue keeping them consistent is exactly the log from [[ddia-streaming|the previous post]]:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="Unbundling the database. Top half: a traditional database is one box bundling storage engine, indexes, cache, materialized views and replication log, kept consistent by the DB's internals. Bottom half: the unbundled data platform — a log, Kafka, as the hub in the middle, and specialised systems around it each claiming one feature: the OLTP database handles storage and transactions, Elasticsearch handles indexes, Redis handles the cache, the warehouse handles materialized views, each a follower of the log consuming in the same order to stay consistent. Conclusion below: the same database, turned inside out — your data platform is an unbundled database, and what keeps it from falling apart is that log." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="ub" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <text x="290" y="18" fill="#e6e6e6" font-size="9.6" text-anchor="middle" font-weight="bold">Traditional: one box, everything bundled</text>
    <rect x="120" y="26" width="340" height="46" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <rect x="132" y="36" width="70" height="26" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/><text x="167" y="53" fill="#9aa4b2" font-size="6.6" text-anchor="middle">storage engine</text>
    <rect x="208" y="36" width="56" height="26" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/><text x="236" y="53" fill="#9aa4b2" font-size="6.6" text-anchor="middle">indexes</text>
    <rect x="270" y="36" width="56" height="26" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/><text x="298" y="53" fill="#9aa4b2" font-size="6.6" text-anchor="middle">cache</text>
    <rect x="332" y="36" width="60" height="26" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/><text x="362" y="53" fill="#9aa4b2" font-size="6.6" text-anchor="middle">mat. view</text>
    <rect x="398" y="36" width="50" height="26" rx="4" fill="#1f2330" stroke="#d6a45c" stroke-width="1"/><text x="423" y="53" fill="#d6a45c" font-size="6.6" text-anchor="middle">log</text>
    <text x="290" y="90" fill="#9aa4b2" font-size="8.6" text-anchor="middle">↓ unbundle: each feature handed to a specialised system ↓</text>
    <rect x="180" y="104" width="220" height="26" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.6"/><text x="290" y="121" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">log as hub (Kafka) — the glue that sets order</text>
    <line x1="212" y1="130" x2="128" y2="158" stroke="#54b890" stroke-width="1.1" marker-end="url(#ub)"/>
    <line x1="264" y1="130" x2="242" y2="158" stroke="#54b890" stroke-width="1.1" marker-end="url(#ub)"/>
    <line x1="316" y1="130" x2="338" y2="158" stroke="#54b890" stroke-width="1.1" marker-end="url(#ub)"/>
    <line x1="368" y1="130" x2="452" y2="158" stroke="#54b890" stroke-width="1.1" marker-end="url(#ub)"/>
    <rect x="64" y="160" width="128" height="40" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="128" y="176" fill="#e6e6e6" font-size="7.6" text-anchor="middle">OLTP DB</text><text x="128" y="190" fill="#9aa4b2" font-size="6.6" text-anchor="middle">storage + transactions</text>
    <rect x="200" y="160" width="84" height="40" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="242" y="176" fill="#e6e6e6" font-size="7.6" text-anchor="middle">Elasticsearch</text><text x="242" y="190" fill="#9aa4b2" font-size="6.6" text-anchor="middle">= the index</text>
    <rect x="292" y="160" width="84" height="40" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="334" y="176" fill="#e6e6e6" font-size="7.6" text-anchor="middle">Redis</text><text x="334" y="190" fill="#9aa4b2" font-size="6.6" text-anchor="middle">= the cache</text>
    <rect x="384" y="160" width="132" height="40" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="450" y="176" fill="#e6e6e6" font-size="7.6" text-anchor="middle">warehouse / Gold layer</text><text x="450" y="190" fill="#9aa4b2" font-size="6.6" text-anchor="middle">= materialized view</text>
    <text x="290" y="216" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">every system is a follower of the log, consuming in the same order → each consistent</text>
    <rect x="60" y="226" width="460" height="22" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="241" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-weight="bold">Your data platform = a database "turned inside out"; what holds it together is the log</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The top half is a traditional database: storage, indexes, cache and materialized views <b>bundled in one box</b>, kept consistent by the DB's internals. The bottom half is unbundling: the same features <b>each claimed by a specialised system</b> — the OLTP DB handles storage and transactions, <b>Elasticsearch is the index taken out, Redis is the cache taken out, the warehouse is the materialized view taken out</b> — and what keeps them consistent is the <b style="color:#d6a45c">log</b> in the middle (every system is its <a href="/blog/ddia-streaming/">follower</a>). In other words: <a href="/blog/infra-platform/">the data platform you run</a> is, at heart, a <b>database turned inside out</b> — and the discipline for designing it should be the same as a database's: the log sets the order, derived data can be rebuilt</figcaption>
</figure>

The practical value of this perspective: **"add search to the platform" = "build an index on this big database"** — and the method is the same: replay from the log, grow a new follower, touch nothing existing. When the index is built into the database, you trust it to maintain itself; once unbundled, **the responsibility for keeping "the index caught up with the primary data" lands on you** — and that's the deep reason the data engineer profession exists.

## Lambda vs Kappa: two sets of logic, or one log

For "the same data has to be computed both accurately (batch) and fast (real time)", history offers two answers:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 222" role="img" aria-label="Lambda versus kappa architecture. Left, lambda: data enters two tracks at once, a batch layer that periodically recomputes everything for accuracy and a speed layer that streams for immediacy, and a query has to merge the results of both; the same business logic is written twice, once per batch and stream framework, double the maintenance and hard to debug when the two disagree. Right, kappa: only one replayable log and one set of streaming logic; the stream computes continuously, and to recompute history you start a new job replaying from the beginning of the log and switch over once it catches up; one codebase, recomputation by replay. The precondition is that the log is retained long enough and replay throughput is sufficient." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="lk12" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="14" x2="290" y2="186" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#e0733a" font-size="9.4" text-anchor="middle" font-weight="bold">Lambda: two tracks</text>
    <rect x="40" y="38" width="80" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="80" y="54" fill="#9aa4b2" font-size="7" text-anchor="middle">data arrives</text>
    <line x1="120" y1="44" x2="158" y2="70" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lk12)"/><line x1="120" y1="56" x2="158" y2="112" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lk12)"/>
    <rect x="160" y="62" width="104" height="34" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="212" y="76" fill="#e6e6e6" font-size="7.2" text-anchor="middle">batch layer</text><text x="212" y="89" fill="#9aa4b2" font-size="6.4" text-anchor="middle">periodic full recompute (accurate)</text>
    <rect x="160" y="104" width="104" height="34" rx="5" fill="#26324a" stroke="#9b6ff0" stroke-width="1.3"/><text x="212" y="118" fill="#e6e6e6" font-size="7.2" text-anchor="middle">speed layer</text><text x="212" y="131" fill="#9aa4b2" font-size="6.4" text-anchor="middle">stream fills in real time (fast)</text>
    <rect x="96" y="148" width="140" height="24" rx="5" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="166" y="164" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">query: "merge" both results</text>
    <text x="146" y="196" fill="#e0733a" font-size="7.2" text-anchor="middle" font-weight="bold">✗ same logic written twice (batch + stream), 2× upkeep</text>
    <text x="434" y="26" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">Kappa: one log</text>
    <rect x="330" y="42" width="208" height="26" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/><text x="434" y="59" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">one replayable log (kept long enough)</text>
    <line x1="400" y1="68" x2="384" y2="94" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lk12)"/><line x1="468" y1="68" x2="484" y2="94" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#lk12)"/>
    <rect x="330" y="96" width="106" height="34" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="383" y="110" fill="#e6e6e6" font-size="7.2" text-anchor="middle">stream job v1</text><text x="383" y="123" fill="#9aa4b2" font-size="6.4" text-anchor="middle">always computing live</text>
    <rect x="444" y="96" width="106" height="34" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3" stroke-dasharray="4 3"/><text x="497" y="110" fill="#e6e6e6" font-size="7.2" text-anchor="middle">stream job v2</text><text x="497" y="123" fill="#9aa4b2" font-size="6.4" text-anchor="middle">recompute: replay from start</text>
    <line x1="497" y1="130" x2="440" y2="152" stroke="#54b890" stroke-width="1.1" marker-end="url(#lk12)"/>
    <text x="434" y="164" fill="#54b890" font-size="7.2" text-anchor="middle" font-weight="bold">switch once caught up → one codebase, recompute = replay</text>
    <text x="434" y="196" fill="#9aa4b2" font-size="7" text-anchor="middle">requires: log kept long enough, replay throughput sufficient</text>
    <rect x="30" y="204" width="520" height="0" rx="0" fill="none"/>
    <text x="290" y="214" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">Logic changes often, can't afford two stacks → kappa; recompute too big for stream replay → keep the batch track</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e0733a">Lambda</b>: a batch layer periodically recomputes everything (accurate) + a speed layer streams to fill in real time (fast), and a query merges both — the price is that <b>the same business logic is written twice in two frameworks</b>, double the maintenance, and debugging hell when the two disagree. <b style="color:#54b890">Kappa</b>: keep only one <b>replayable log</b> and one set of streaming logic; to recompute history (changed logic, fixed bug), <b>start a new job replaying from the beginning of the log</b> and switch over once it catches up — <a href="/blog/ddia-batch/">batch's "human fault tolerance"</a> achieved in streaming form. The precondition is a log kept long enough and replay throughput that holds up; <a href="/blog/spark-streaming/">unified batch/stream engines</a> (one program, two modes) are also removing the "write it twice" pain at the framework level</figcaption>
</figure>

## The most honest lesson: the last mile of correctness is end to end

In the book's final technical section, Kleppmann throws an important bucket of cold water: **don't trust any middleware's guarantee blindly.** [[kafka-delivery|Exactly-once]] is powerful, but its guarantee has a boundary — once data leaves it (written to an external system, an external API called, a user pressing submit twice), the semantics break. The only truly reliable deduplication is **end to end**: the request carries a unique **request id (idempotency key)** from its source all the way to the final write, and the endpoint does the final check — a replay in data systems of networking's ancient **end-to-end argument**, and the theoretical basis for the discipline of [[airflow-reliability|idempotency]]. One level up, he argues systems should **audit**: periodically verify data integrity (do the counts match, do the sums match) rather than assuming "the pipeline didn't error = the data is right" — **no error only means no error was found**. That sentence is the starting point of data-quality engineering.

## Reflections

### "The platform is a database taken apart" — this perspective flipped my whole map over

Unbundling is the idea with the biggest recoil after finishing the book. Looking back at [[infra-platform|the platform I run myself]]: Kafka is the commit log, Elasticsearch is the index, Redis is the cache, the warehouse's Gold layer is the materialized view — **what I operate every day is really a giant database spread out across K8s**, and my job is the job of a database kernel engineer: keep these "unbundled components" consistent with the primary data. This perspective immediately gave me two disciplines. **In design**, any new component should be a follower of the log, not another victim of dual writes; **in debt**, every bit of the consistency a database guarantees "for free" through transactions has to be repaid by hand once unbundled — so before taking it apart, ask: can a single-machine database really not do this any more? [[pain-before-power|That question again]].

### "No error ≠ the data is right" — auditing is data engineering's next stop

The end-to-end lesson is a tailor-made reminder for my role. After years of [[sre-monitoring|SRE]] it's easy to treat "the monitoring is green" as "everything's fine"; Kleppmann punctures it: an all-green pipeline only means **the system** didn't error, not that **the data** is right — row counts quietly 2% short, a join silently matching nothing, an amount column in the wrong unit, and monitoring says not a word. **A system's reliability relies on monitoring; data's correctness relies on auditing** — the latter is independent verification (reconciliation, count checks, invariant checks), not reading logs. That's exactly the subject of the Data Quality series I want to start next: turning "is the data right" from a prayer into an engineering discipline with metrics, alerts and SLOs. DDIA's last chapter happens to be the best introduction to that series.

### Closing the book: it gives not answers but a framework of questions

Twelve chapters in, if you ask me what DDIA actually gave me, my answer is: **a list of questions that will never go out of date.** How is the data laid out (the shape of the reads)? Where does state live, who is the source of truth? Who decides the order, what protects it? Where is the boundary of the guarantee, who checks the last mile? — tools will change (plenty of the book's examples are already old), but these questions you'll ask until you retire. It's also where this whole blog converges: DDIA is the principles layer, Redis/Kafka/Spark/K8s the implementation layer, SRE/LGTM the operations layer — **one web: principles let you understand the tools, tools let you verify the principles, operations makes you pay the price for both and earns you the respect**. Finally, Kleppmann chooses to end with a full section on ethics: data is power, and power needs restraint — in this profession we decide daily "what to record, how long to keep it, who gets to see it", and that has never been only a technical decision. **The more capable the system, the more restrained the engineer needs to be** — and that's where this book ends.
