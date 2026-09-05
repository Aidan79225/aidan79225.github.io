---
title: "What Data Engineering Is: Reading Fundamentals of Data Engineering, Ch. 1"
date: 2026-06-28
category: tech
tags:
  - data-engineering
  - book-notes
series: "Fundamentals of Data Engineering — Reading Notes"
seriesOrder: 1
comments: true
draft: false
translationOf: fode-1
---
I'm starting a new series, reading Joe Reis and Matt Housley's *Fundamentals of Data Engineering*. The book's greatest value is that it takes "data engineering", a function usually described in vague terms, and condenses it into a clear framework and vocabulary. The first chapter answers the most basic questions: **what data engineering actually is, what a data engineer actually does, and where they stand in the wider world of data.**

## The definition: the systems engineering that turns raw data into "usable"

The book's definition is worth writing down: **data engineering is "the development, implementation, and maintenance of systems and processes that take in raw data and produce high-quality, consistent information that supports downstream use cases" (analytics, ML).** It sits at the intersection of six areas — security, data management, DataOps, data architecture, orchestration, software engineering.

The key realisation: **the output of data engineering isn't "data", it's "trustworthy, usable data systems".** The weight is on the words "systems and processes" — it isn't a one-off move of data from A to B, it's building a pipeline that keeps producing clean data reliably. That matches exactly the conclusion I reached writing about [[dbt-intro|dbt]]: what it sells isn't "transforming data with SQL", it's engineering discipline.

## The Data Science Hierarchy of Needs: DE is the foundation

The most famous diagram in the book is borrowed from Monica Rogati: the "Data Science Hierarchy of Needs" — modelled on Maslow's hierarchy, it shows that **before you do ML / AI, the data engineering underneath has to be solid**.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 520 268" role="img" aria-label="The Data Science Hierarchy of Needs: the bottom three layers (collect, move and store, explore and transform) are data engineering; only the top two (learn and optimize, AI) are ML and AI" style="width:100%;max-width:560px;height:auto;margin:0 auto;">
    <polygon points="153.5,111 306.5,111 420,240 40,240" fill="#4f6df5" fill-opacity="0.16"/>
    <polygon points="230,24 420,240 40,240" fill="none" stroke="#3a4154" stroke-width="1.6"/>
    <line x1="191.3" y1="68" x2="268.7" y2="68" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="153.5" y1="111" x2="306.5" y2="111" stroke="#4f6df5" stroke-width="1.4"/>
    <line x1="115.6" y1="154" x2="344.4" y2="154" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="77.8" y1="197" x2="382.2" y2="197" stroke="#3a4154" stroke-width="1.2"/>
    <text x="230" y="50" fill="#9aa4b2" font-size="10" text-anchor="middle">AI / deep learning</text>
    <text x="230" y="93" fill="#9aa4b2" font-size="10" text-anchor="middle">learn / optimize (A/B, ML)</text>
    <text x="230" y="135" fill="#e6e6e6" font-size="10" text-anchor="middle">aggregate / label (analytics, metrics)</text>
    <text x="230" y="178" fill="#e6e6e6" font-size="10" text-anchor="middle">move / store (pipelines, ETL)</text>
    <text x="230" y="221" fill="#e6e6e6" font-size="10" text-anchor="middle">collect (logging, sensors, external data)</text>
    <text x="446" y="86" fill="#9aa4b2" font-size="10.5" text-anchor="start">ML / AI</text>
    <line x1="430" y1="95" x2="430" y2="28" stroke="#3a4154" stroke-width="1.2"/>
    <text x="446" y="182" fill="#4f6df5" font-size="10.5" text-anchor="start">data eng.</text>
    <line x1="430" y1="240" x2="430" y2="111" stroke="#4f6df5" stroke-width="1.4"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The bottom three layers are data engineering's territory; without collecting, moving and aggregating done right, the ML/AI on top is a castle in the air</figcaption>
</figure>

The message is brutal: **everyone wants the glamorous AI layer at the top, but nine out of ten failures happen because the foundation wasn't laid.** The value of a data engineer is exactly holding up those bottom layers of the pyramid.

## Two ends of a spectrum: Type A vs Type B data engineers

The book has a memorable way of describing a data engineer's orientation:

| | Type A (Abstraction) | Type B (Build) |
|---|---|---|
| Core | **Abstract**: use off-the-shelf, managed solutions wherever possible | **Build**: make your own tools and frameworks |
| Mindset | Avoid "undifferentiated heavy lifting" | Reinvent the wheel for scale and internal needs |
| Suits | Most teams, early to mid stage | Large scale, when off-the-shelf really isn't enough |

The book's position (and mine): **most people should start as Type A** — don't reinvent wheels from day one; save your effort for problems that truly differentiate you. Type B isn't more advanced; it's what you need only when "the scale is there and off-the-shelf really doesn't cut it".

## Data maturity: one job title, three different jobs

The book also has a very practical three-stage "data maturity" model — a reminder that **a "data engineer" at companies of different maturity does wildly different work**:

1. **Starting with data**: almost no data infrastructure. The DE is a generalist who touches everything — first make data flow and make it storable.
2. **Scaling with data**: data volume and the team are both growing. The DE starts building scalable, repeatable systems and introducing formal tools and practices.
3. **Leading with data**: data is a core competitive advantage. The DE works on automation and self-service so the organisation can use data at scale.

That explains a common confusion: why two people both called "data engineer" sound like they're doing completely different jobs — their companies are at different maturity stages.

## Reflections

### "Knowing the tools" is not "knowing data engineering"

The point I resonated with most is that the book positions data engineering as **systems engineering**, not "someone who knows Airflow / Spark / Kafka". Tools are just means — I've written a whole row of tool notes over the past six months ([[airflow-intro|Airflow]], [[spark-intro|Spark]], [[kafka-intro|Kafka]], [[dbt-intro|dbt]]), but this book reminds me: stringing them into a **trustworthy, maintainable system that keeps producing clean data** is the real skill. Plenty of people can type the commands; very few can design a data system that doesn't blow up at 3am.

### Type A first — the same thing I've been saying all along

The book's claim that "most people should start as Type A" lines up remarkably with the conclusion of every tool note I've written — [[airflow-intro|Airflow]], [[spark-running|Spark]], [[kafka-intro|Kafka]] all say the same sentence: **[[pain-before-power|confirm the pain has reached that scale before bringing out the heavy weapons]]; if managed or off-the-shelf will do, don't self-host.** The urge to build your own is seductive, but carrying "undifferentiated heavy lifting" yourself usually just piles operational debt onto your future self. The moment for Type B is forced by scale, not used to prove your technical chops.

### The hierarchy of needs is the diagram I'd most like to see pinned on a wall

Too many teams (including ones I've seen) rush to the ML/AI layer at the top without stabilising collection, movement and aggregation underneath — so the model eats dirty data, garbage in, garbage out. This pyramid gave me a tool for external communication: when someone asks "why can't we do AI yet", I can point at it and say "because the foundation isn't ready". Data engineering isn't sexy, but it's the precondition for everything above it — and that's why I decided to read this book properly and keep writing this series.
