---
title: "The Data Engineering Lifecycle: Reading Fundamentals of Data Engineering, Ch. 2"
date: 2026-06-28
category: tech
tags:
  - data-engineering
  - book-notes
  - lifecycle
series: "Fundamentals of Data Engineering — Reading Notes"
seriesOrder: 2
comments: true
draft: false
translationOf: fode-2
---
[[fode-1|The previous post]] gave the definition; this chapter gives **the skeleton of the whole book** — the data engineering lifecycle. The book's most valuable contribution is using this framework to make "what data engineering does" clear: **five stages + six undercurrents**. Understand this one diagram and the remaining nine chapters are just details growing on top of it.

## Five stages: from data being produced to data being used

The lifecycle cuts "raw data → useful data" into five stages:

| Stage | What happens | Maps to what I've written |
|---|---|---|
| **Generation** | Data is produced in source systems (DBs, apps, sensors, events) | [[kafka-intro\|Kafka]] (event streams) |
| **Storage** | Where data lands — **spans the middle three stages** | [[medallion-architecture\|Medallion]] layers |
| **Ingestion** | Moving data from sources into the system | [[kafka-intro\|Kafka]], batch loads |
| **Transformation** | Cleaning, modelling, aggregating into a usable shape | [[dbt-intro\|dbt]], [[spark-intro\|Spark]] |
| **Serving** | Delivering data to analytics, ML, products | BI / reports / features |

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 280" role="img" aria-label="The data engineering lifecycle: generation, ingestion, transformation and serving flow horizontally, storage spans the middle three, and six undercurrents underneath hold up the whole thing" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="le" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="14" y="36" width="96" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="62" y="53" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Generation</text>
    <text x="62" y="67" fill="#9aa4b2" font-size="8.5" text-anchor="middle">source systems</text>
    <rect x="136" y="36" width="100" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="186" y="53" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Ingestion</text>
    <text x="186" y="67" fill="#9aa4b2" font-size="8.5" text-anchor="middle">move data in</text>
    <rect x="254" y="36" width="120" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="314" y="53" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Transformation</text>
    <text x="314" y="67" fill="#9aa4b2" font-size="8.5" text-anchor="middle">clean, model, aggregate</text>
    <rect x="392" y="36" width="96" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="440" y="53" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Serving</text>
    <text x="440" y="67" fill="#9aa4b2" font-size="8.5" text-anchor="middle">BI, ML, products</text>
    <line x1="110" y1="56" x2="134" y2="56" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#le)"/>
    <line x1="236" y1="56" x2="252" y2="56" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#le)"/>
    <line x1="374" y1="56" x2="390" y2="56" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#le)"/>
    <rect x="136" y="104" width="352" height="38" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="2"/>
    <text x="312" y="128" fill="#e6e6e6" font-size="11" text-anchor="middle">Storage (spans the middle three stages)</text>
    <line x1="186" y1="76" x2="186" y2="104" stroke="#9aa4b2" stroke-width="1.3" marker-start="url(#le)" marker-end="url(#le)"/>
    <line x1="314" y1="76" x2="314" y2="104" stroke="#9aa4b2" stroke-width="1.3" marker-start="url(#le)" marker-end="url(#le)"/>
    <line x1="440" y1="76" x2="440" y2="104" stroke="#9aa4b2" stroke-width="1.3" marker-start="url(#le)" marker-end="url(#le)"/>
    <rect x="14" y="170" width="474" height="94" rx="10" fill="#1f2330" stroke="#3a4154" stroke-width="1.4" stroke-dasharray="5 4"/>
    <text x="251" y="188" fill="#9aa4b2" font-size="10.5" text-anchor="middle">Undercurrents — the six currents holding up the whole lifecycle</text>
    <rect x="24" y="198" width="144" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="96" y="215" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Security</text>
    <rect x="176" y="198" width="144" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="248" y="215" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Data Management</text>
    <rect x="328" y="198" width="144" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="400" y="215" fill="#e6e6e6" font-size="9.5" text-anchor="middle">DataOps</text>
    <rect x="24" y="230" width="144" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="96" y="247" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Data Architecture</text>
    <rect x="176" y="230" width="144" height="26" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="248" y="247" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Orchestration</text>
    <rect x="328" y="230" width="144" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="400" y="247" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Software Engineering</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Four stages flow horizontally, storage spans the middle three; the six undercurrents underneath are the foundation shared by the whole lifecycle (orchestration = Airflow's home)</figcaption>
</figure>

## Why storage "spans" rather than being a separate step

This is the detail from the chapter most worth remembering: **storage isn't a stop inserted "after ingestion, before transformation"; it's the underlying layer running through ingestion, transformation and serving**. Data is read out and written back repeatedly across those three stages — ingestion writes into storage, transformation reads from storage and writes back, serving pulls from storage. That's why the book draws it as a spanning bar rather than a box in the middle.

That matches exactly what I found writing about [[medallion-architecture|Medallion architecture]]: Bronze / Silver / Gold aren't three "steps", they're three layers of **storage** the data flows through in its lifecycle.

## Six undercurrents: invisible, yet they decide whether the system collapses

The five stages are "the visible pipeline"; **the undercurrents are the underlying practices running through every stage** — the book's word is apt: they're not on the surface, yet they decide the river's course and safety.

| Undercurrent | What it governs |
|---|---|
| **Security** | Least privilege, encryption, no hard-coded credentials |
| **Data Management** | Governance, quality, lineage, master data, privacy |
| **DataOps** | Automation, observability, incident response (DevOps for data) |
| **Data Architecture** | How systems are designed, trade-offs and choices |
| **Orchestration** | Scheduling tasks by dependency, monitoring, retrying |
| **Software Engineering** | Bringing engineering discipline into data work |

Note that **Orchestration** is where [[airflow-intro|Airflow]] lives — it's not a stage, it's an undercurrent running across all stages. That explains why Airflow is so central: it governs the "rhythm" of the whole lifecycle.

## Reflections

### The framework's biggest value is a coordinate system for placing things

The first thing I did after this chapter was throw every tool I'd written about in the past six months onto this diagram: [[kafka-intro|Kafka]] lands in generation/ingestion, [[spark-intro|Spark]] and [[dbt-intro|dbt]] in transformation, [[medallion-architecture|Medallion]] is the layering of storage, [[airflow-intro|Airflow]] is the orchestration undercurrent. **Suddenly, notes that had each been written on their own had positions on the same map.** A framework's value is often not that it teaches you something new, but that it gives you a coordinate system to see how what you already know connects — that's what this chapter did for me.

### The undercurrents are the line between junior and senior

I increasingly think the five stages are what "anyone sees on day one" — everyone knows data has to be ingested, transformed, served. What really separates people is the undercurrents: whether security (no hard-coded credentials, echoing my [[airflow-providers|Connections]] post), observability, data quality and lineage — the "invisible" things — got built in. The difference between a demo and a Production system that doesn't fail at 3am is almost entirely in the undercurrents. **Beginners show off a pipeline that runs; veterans guard the undercurrents.**

### If I could shore up only one undercurrent first, it'd be DataOps

The book lists the six side by side, but if I had to rank them I'd put **DataOps** first — automation, observability, incident response. The reason is practical: the biggest pain of data systems isn't "can't build it", it's "it broke and nobody knew, once known it's hard to diagnose, once diagnosed it's hard to recover". It's the same thing I keep stressing in the [[airflow-control-flow|Airflow]] series: idempotent, rerunnable, don't let resources drain silently. Getting DataOps in place is like fitting the whole lifecycle with dashboards and fuses — only then do the problems in the other undercurrents become visible and fixable.
