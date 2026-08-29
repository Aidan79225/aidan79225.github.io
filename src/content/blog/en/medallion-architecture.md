---
title: "The Medallion Architecture: Managing Data Quality in Bronze / Silver / Gold Layers"
date: 2026-06-23
category: tech
tags:
  - data-engineering
  - data-modeling
  - lakehouse
comments: true
draft: false
translationOf: medallion-architecture
---
## What the Medallion architecture is

In one sentence: **the Medallion architecture is a design convention that splits data into three layers by quality and degree of refinement — Bronze (raw), Silver (cleaned), Gold (business) — with data washed upward one layer at a time, getting cleaner and closer to the business as it goes**. Databricks popularized it, it turns up constantly in lakehouse setups, and it also goes by **multi-hop architecture**.

The key thing to grasp: **it isn't a tool, it's an agreement about how data should be layered and where it should sit**. You can implement it with [[spark-intro|Spark]], with [[dbt-intro|dbt]], or with plain SQL. What it actually governs is what each layer is responsible for — not what you run it on.

### What each of the three layers does

| Layer | What it holds | Main processing | Who uses it |
|---|---|---|---|
| **Bronze** | Raw data loaded from the source untouched, append-only | Content barely altered — only metadata like load time and source filename gets added | Data engineers (rebuilding downstream, auditing) |
| **Silver** | Cleaned, deduplicated, type-corrected, merged — "clean atomic data" | Apply schema and quality rules, join multiple sources into a trustworthy enterprise view | Data analysts, data scientists, ML |
| **Gold** | Business-level rollups, dimensional models, KPIs, flattened for a specific purpose | Aggregation, star schemas, report-ready | BI dashboards, decision-makers, external services |

Each hop up does only the transformation it needs to — Bronze for fidelity, Silver for clean and trustworthy, Gold for usable. That division leaves every layer carrying exactly one responsibility, which makes it easy to locate the damage when something breaks.

### How data gets refined, one layer at a time

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 680 180" role="img" aria-label="The Medallion architecture: source data is refined through the Bronze, Silver and Gold layers before it reaches BI and ML" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="md" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="100" y1="90" x2="140" y2="90" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#md)"/>
    <line x1="246" y1="90" x2="286" y2="90" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#md)"/>
    <line x1="392" y1="90" x2="432" y2="90" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#md)"/>
    <line x1="538" y1="90" x2="576" y2="90" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#md)"/>
    <rect x="8" y="66" width="92" height="48" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="54" y="87" fill="#e6e6e6" font-size="12" text-anchor="middle">Source</text>
    <text x="54" y="103" fill="#9aa4b2" font-size="9.5" text-anchor="middle">DB / API / files</text>
    <rect x="142" y="62" width="104" height="56" rx="8" fill="#262b3a" stroke="#b08d57" stroke-width="2"/>
    <text x="194" y="86" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Bronze</text>
    <text x="194" y="103" fill="#9aa4b2" font-size="9.5" text-anchor="middle">Raw, as-is</text>
    <rect x="288" y="62" width="104" height="56" rx="8" fill="#262b3a" stroke="#b9c2cc" stroke-width="2"/>
    <text x="340" y="86" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Silver</text>
    <text x="340" y="103" fill="#9aa4b2" font-size="9.5" text-anchor="middle">Cleaned, deduped</text>
    <rect x="434" y="62" width="104" height="56" rx="8" fill="#262b3a" stroke="#d4af37" stroke-width="2"/>
    <text x="486" y="86" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Gold</text>
    <text x="486" y="103" fill="#9aa4b2" font-size="9.5" text-anchor="middle">Business rollups</text>
    <rect x="578" y="66" width="92" height="48" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="624" y="87" fill="#e6e6e6" font-size="12" text-anchor="middle">BI / ML</text>
    <text x="624" y="103" fill="#9aa4b2" font-size="9.5" text-anchor="middle">Reports / models</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Data hops upward one step at a time, each layer responsible for a single kind of refinement — which is where "multi-hop" comes from</figcaption>
</figure>

### Why layer it instead of going straight there

Writing one SQL query from the raw data to produce a report works fine, of course — but layering buys you these:

- **Reprocessability**: Bronze keeps the original in full, so when downstream logic changes — or you find out it was computing the wrong thing — you re-run from Bronze instead of going back to the source system to ask for the data again. This is the most underrated value of layering.
- **A single responsibility**: cleaning belongs to Silver, business logic belongs to Gold. When something goes wrong you know which layer to open, instead of every piece of logic being mushed into one blob.
- **Different consumers take what they need**: a data scientist wants clean but fine-grained atomic data (Silver); the boss just wants the flattened KPI (Gold) — the same data serving different people at different granularities from different layers.
- **Quality is incremental**: nothing has to be washed perfectly in one step. Each hop advances the data by one quality level, which is easy to test and easy to maintain.

### How it maps onto what you already know

| What you already know | Maps to Medallion as |
|---|---|
| The **E** and **L** of ELT | Loading data into **Bronze** |
| The **T** of ELT | The two hops Bronze→Silver→Gold |
| dbt's staging / intermediate / marts | Almost exactly Silver / intermediate / Gold |
| A traditional warehouse's staging / ODS / data mart | Same idea at root — Medallion just renames it and standardizes it |

So Medallion isn't out to replace ELT or dimensional modeling — it takes those existing practices and converges them into one shared vocabulary: three layers, clear responsibilities.

## Reflections

### It's a discipline, not naming magic

The most common misuse I've seen is naming three S3 paths (or three schemas) `bronze` / `silver` / `gold` and then announcing "we've adopted the Medallion architecture" — while Gold is stuffed with data nobody cleaned and Silver joins in a pile of business logic. **The value of layering comes from each layer genuinely holding its own line, not from the names.** Names are labels; whether you keep the discipline is what counts. It's the same conclusion I reached writing about [[dbt-intro|dbt]]: a tool or a convention hands you a frame, and what's actually worth something is whether you're willing to play by the rules inside it.

### The one rule to defend to the death: Bronze is immutable and replayable

If I could keep only one thing out of the three layers, I'd take "**Bronze is always append-only, untouched, replayable**". Break that one and the architecture's biggest benefit — reprocessability — is gone: you're back to "downstream got it wrong, so go ask the source for the data again", and the source usually no longer has a snapshot from that point in time. In practice I insist Bronze take the source's dirt, its duplicates, its weird formats and all, with cleaning pushed back to Silver without exception. Bronze's job is to record faithfully what happened, not to tidy things up on the way in. Mixing those two jobs is the most expensive mistake I've seen.

### The Silver/Gold boundary is the genuinely hard call

Bronze is easy to define — take everything, no questions. The hard part is where to cut between Silver and Gold. My yardstick: **Silver holds clean atomic data that isn't tied to any particular use, that anyone can pick up; Gold holds rollups flattened for one report or one team.** The moment you notice a Silver table doing a special aggregation for a single dashboard, that table should have been Gold. And the reverse case has its own smell: if every Gold requirement re-washes from Bronze and Silver is a formality, you're missing the reusable middle layer. There's no standard answer for where the line goes, but "will more than one downstream share this?" is the touchstone I reach for most.

### Don't do three layers just to have three layers

I don't put three layers on every project on autopilot. Small project, simple sources, one or two reports — forcing three layers just adds pipeline complexity and compute cost, and two (raw + reporting) is usually plenty. Medallion's three layers are an investment that pays off when you have multiple sources, multiple consumers, and a need to audit and rebuild. [[pain-before-power|Confirm the pain]] before you layer — don't make it the default move. It's the same attitude I take toward [[airflow-intro|Airflow]] and [[spark-intro|Spark]]: architecture exists to solve a concrete pain, not to prove how enterprise you are.
