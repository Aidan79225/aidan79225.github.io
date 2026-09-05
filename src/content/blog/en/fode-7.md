---
title: "Moving Data In: Batch or Streaming? Reading Fundamentals of Data Engineering, Ch. 7"
date: 2026-07-02
category: tech
description: "The second stop in the data engineering lifecycle: moving data from the source into the system. Batch or streaming? Push, pull or poll? A spectrum diagram and three retrieval patterns make it clear, plus why batch is still the default today."
tags:
  - data-engineering
  - book-notes
  - ingestion
series: "Fundamentals of Data Engineering — Reading Notes"
seriesOrder: 7
comments: true
draft: false
translationOf: fode-7
---
The [[fode-5|source]] produces data, [[fode-6|storage]] is ready to receive it, and the action in between that **moves data in** is this chapter's subject: **ingestion**. It's the second stop in the lifecycle, and the place where most people immediately agonise over "do we need real time". The line to think through first — **batch or streaming isn't a matter of technical taste, it's a matter of business value.**

## Ask the right questions first: the key axes of ingestion

The book's reminder: before choosing any tool, think through these dimensions. Together they decide what your ingestion looks like:

| Dimension | What it asks |
|---|---|
| **Frequency** | Batch? Streaming? Or micro-batch in between? (next section's subject) |
| **Bounded / unbounded** | A fixed file, or an event stream that never ends? |
| **Push / pull** | Does the source send, or do you go and fetch? (see below) |
| **Sync / async** | Wait for it to finish, or fire and forget? |
| **Payload** | How big, what format, will the schema change? (the pain of [[fode-5\|the source chapter]]) |
| **Reliability** | What happens if one record is lost? Can you resend, dedupe? |

The answers to these questions nearly all point to the same core decision: **how real time?**

## The core spectrum: batch ↔ micro-batch ↔ streaming

"Batch or streaming" isn't really a binary choice; it's a **spectrum**. Every step towards real time costs one more unit of complexity and money:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 210" role="img" aria-label="The ingestion frequency spectrum: batch on the left (hours to days, mature and cheap, the default), micro-batch in the middle (seconds to minutes), streaming on the right (milliseconds to seconds, real time but complex and expensive); further right means lower latency and higher complexity and cost" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="in1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto-start-reverse"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="65" y="30" width="150" height="80" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="140" y="55" fill="#4f6df5" font-size="13" font-weight="bold" text-anchor="middle">Batch</text>
    <text x="140" y="78" fill="#e6e6e6" font-size="11.5" text-anchor="middle">hours – days</text>
    <text x="140" y="97" fill="#9aa4b2" font-size="8.5" text-anchor="middle">scheduled · mature (default)</text>
    <rect x="225" y="30" width="150" height="80" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="300" y="55" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Micro-batch</text>
    <text x="300" y="78" fill="#e6e6e6" font-size="11.5" text-anchor="middle">seconds – minutes</text>
    <text x="300" y="97" fill="#9aa4b2" font-size="8.5" text-anchor="middle">one small batch at a time</text>
    <rect x="385" y="30" width="150" height="80" rx="8" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/>
    <text x="460" y="55" fill="#54b890" font-size="13" font-weight="bold" text-anchor="middle">Streaming</text>
    <text x="460" y="78" fill="#e6e6e6" font-size="11.5" text-anchor="middle">ms – seconds</text>
    <text x="460" y="97" fill="#9aa4b2" font-size="8.5" text-anchor="middle">event by event · real time</text>
    <line x1="140" y1="110" x2="140" y2="138" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="300" y1="110" x2="300" y2="138" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="460" y1="110" x2="460" y2="138" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="40" y1="140" x2="560" y2="140" stroke="#9aa4b2" stroke-width="1.4" marker-start="url(#in1)" marker-end="url(#in1)"/>
    <text x="40" y="165" fill="#9aa4b2" font-size="9" text-anchor="start">high latency · simple · cheap</text>
    <text x="560" y="165" fill="#9aa4b2" font-size="9" text-anchor="end">low latency · complex · expensive</text>
    <text x="300" y="192" fill="#9aa4b2" font-size="9.5" text-anchor="middle">every step towards real time costs one more unit of complexity and money</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Ingestion frequency is a spectrum, not a binary; batch is still the mature, cheap default, and the real time streaming buys with latency costs complexity and money</figcaption>
</figure>

**Micro-batch (like [[spark-streaming|Spark Structured Streaming]]) is a very sweet middle point in practice** — "one small batch every few seconds" approaches streaming's immediacy while largely keeping the familiar batch mindset and tooling. Many "we need real time" requirements are in fact satisfied by micro-batch.

## Two ways to extract in batch: snapshot vs incremental

Going batch, there's one more common trap — do you move **the whole thing** each time, or only **what's new**?

- **Full snapshot**: grab the current state of the whole table every time. Simple and easy to reason about, but heavy, slow and expensive once the data grows.
- **Incremental (differential)**: grab only what changed since last time. Saves a lot, but you need a way to know "what changed" — timestamps, incrementing ids, or more elegantly [[fode-5|CDC (reading the database change log)]].

**Small data: snapshots for peace of mind; once it grows, switch to incremental.** That's the line between batch ingestion that runs and batch ingestion you can afford to run.

## Push, pull or poll: who initiates

Another dimension that's easy to confuse: when data moves, **who acts first**? The book gives three patterns:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 250" role="img" aria-label="Three retrieval patterns: push, where the source actively sends data to the ingestion side; pull, where the ingestion side sends a request and data comes back; poll, where the ingestion side periodically asks whether there is new data and receives it only when there is" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="ma" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker><marker id="mg" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#54b890"/></marker></defs>
    <text x="12" y="40" fill="#4f6df5" font-size="12" font-weight="bold" text-anchor="start">Push</text>
    <text x="12" y="56" fill="#9aa4b2" font-size="8.5" text-anchor="start">source initiates</text>
    <rect x="90" y="23" width="110" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="145" y="50" fill="#e6e6e6" font-size="11" text-anchor="middle">source</text>
    <rect x="380" y="23" width="130" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="445" y="50" fill="#e6e6e6" font-size="11" text-anchor="middle">Ingestion</text>
    <line x1="200" y1="45" x2="378" y2="45" stroke="#54b890" stroke-width="1.5" marker-end="url(#mg)"/><text x="289" y="37" fill="#9aa4b2" font-size="8.5" text-anchor="middle">sent as it happens (webhook · producer)</text>
    <text x="12" y="125" fill="#4f6df5" font-size="12" font-weight="bold" text-anchor="start">Pull</text>
    <text x="12" y="141" fill="#9aa4b2" font-size="8.5" text-anchor="start">you initiate</text>
    <rect x="90" y="108" width="110" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="145" y="135" fill="#e6e6e6" font-size="11" text-anchor="middle">source</text>
    <rect x="380" y="108" width="130" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="445" y="135" fill="#e6e6e6" font-size="11" text-anchor="middle">Ingestion</text>
    <line x1="378" y1="122" x2="202" y2="122" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#ma)"/><text x="289" y="116" fill="#9aa4b2" font-size="8.5" text-anchor="middle">① I send a request</text>
    <line x1="200" y1="140" x2="378" y2="140" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#ma)"/><text x="289" y="153" fill="#9aa4b2" font-size="8.5" text-anchor="middle">② data comes back (DB query · API GET)</text>
    <text x="12" y="210" fill="#4f6df5" font-size="12" font-weight="bold" text-anchor="start">Poll</text>
    <text x="12" y="226" fill="#9aa4b2" font-size="8.5" text-anchor="start">you ask periodically</text>
    <rect x="90" y="193" width="110" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="145" y="220" fill="#e6e6e6" font-size="11" text-anchor="middle">source</text>
    <rect x="380" y="193" width="130" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="445" y="220" fill="#e6e6e6" font-size="11" text-anchor="middle">Ingestion</text>
    <line x1="378" y1="215" x2="202" y2="215" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#ma)"/><text x="289" y="209" fill="#9aa4b2" font-size="8.5" text-anchor="middle">any new? (×N, returns only if so)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Push is the source sending (webhooks, stream producers); pull is you going to fetch (querying a DB, calling an API); poll is you periodically asking whether there's anything new — it decides who carries the latency and the load</figcaption>
</figure>

These three aren't just vocabulary: **push usually goes with streaming and low latency, pull / poll with batch**. Poll too often and you crush the source; too rarely and latency climbs — so when you can push (or use [[fode-5\|CDC]]), it's usually more elegant than polling furiously.

## Should you go streaming? The book's answer is restrained

By now you may be thinking: just go streaming then, real time is great. But the book's position (and mine) is conservative: **batch is still the default today; streaming is the exception you adopt for business value.** Two questions to ask yourself first:

1. **Is real time actually valuable?** If a report seen tomorrow and a report seen in five seconds make no difference, streaming only adds cost.
2. **Can downstream use real time?** You work hard to stream data in, and downstream still runs a batch analysis once a day — the real-time-ness was wasted halfway.

Unless both answers are "yes", don't go real time for the sake of real time. That's exactly in tune with my [[pain-before-power|confirm the pain first, then bring the heavy weapons]] — streaming is a heavy weapon; confirm you're really in pain first.

## How to actually move data in: don't reinvent the wheel

Finally, the practical means of transport. The book lists a whole row; I've ordered them by "how much of the low level you touch":

| Method | Scenario |
|---|---|
| **Direct DB connection (JDBC/ODBC)** | The rawest: query and move it yourself |
| **[[fode-5\|CDC]]** | Read the change log, near real time without loading the primary |
| **API** | The standard entry point for third-party SaaS |
| **Messages / event streams** | Real-time events, see [[kafka-intro\|Kafka]] |
| **Managed connectors (Fivetran, Airbyte)** | Common sources pre-wired, no maintenance of your own |

The last row is the point: **ingestion is the kind of "everyone does it, nothing differentiating" heavy lifting where managed connectors come first**; don't hand-carve a pile of API integrations and then maintain them yourself. That's [[fode-4|Ch. 4]]'s "default to buy / use off-the-shelf" landing at the ingestion stop.

## Reflections

### "Do we need real time" is the question I've seen asked wrong most often

Almost every data request opens with "I need it real time". But this chapter reframes the question: **first ask whether real time has value and whether downstream can consume it, then decide the frequency.** I've met too many "we need real time" requirements where digging down revealed the user looks at the report once a day — so streaming was purely making operations work for myself. My default is now reversed: **first ask whether batch solves it**; only if not, and real time has genuine business value, climb to micro-batch and then to streaming. Batch isn't backward; until it's been proven insufficient, it's the most rational choice.

### Micro-batch is the "just right" I recommend most often

When something genuinely needs to be faster, I rarely jump straight to record-by-record streaming; I try **micro-batch** first. [[spark-streaming|Structured Streaming]]'s "one small batch every few seconds" largely keeps batch's mindset and debugging approach while pushing latency down to seconds — more than enough for the vast majority of "we'd like it a bit more real time" requirements, and it dodges the whole complexity of pure streaming: state, out-of-order events, exactly-once. Buying enough immediacy with the smallest increment of complexity is a principle I use again and again in ingestion.

### Push and CDC saved me from a lot of polling disasters

Early on I loved polling for ingestion — ask the source once a minute, simple and intuitive. But as volume grew it became a dilemma: ask too often and you crush the source, too rarely and latency climbs. Then I learned **push where you can, and [[fode-5\|CDC]] where you can read the log**, and many of those dilemmas simply vanished: data flows over as soon as it changes, and I don't have to keep knocking on the door. It's the same cleverness as [[fode-6|the previous chapter]]'s "borrow the log the database already writes" — rather than polling madly yourself, let the source tell you at the right moment.
