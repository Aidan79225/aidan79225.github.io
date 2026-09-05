---
title: "The Last Mile of Data: Serving Analytics and ML, Reading Fundamentals of Data Engineering, Ch. 9"
date: 2026-07-04
category: tech
description: "All the hard work of ingesting, storing and modeling exists for this stop: delivering data to where someone actually uses it. This post takes apart Ch. 9 of Fundamentals of Data Engineering — the highest principle of serving data is trust, and how BI, embedded analytics, ML and reverse ETL are each fed."
tags:
  - data-engineering
  - book-notes
  - data-serving
series: "Fundamentals of Data Engineering — Reading Notes"
seriesOrder: 9
comments: true
draft: false
translationOf: fode-9
---
The previous chapters walked through the [[fode-5|source]], [[fode-6|storage]], [[fode-7|ingestion]], [[fode-8|modeling]] — but all that work **only pays off the moment someone actually uses it**. This chapter is the last stop of the [[fode-2|lifecycle]]: **serving**. And its first principle is one word.

## The highest principle: trust

The book puts it bluntly: **nobody uses data they don't trust.** A dashboard whose numbers don't add up, or that broke yesterday without anyone noticing, only sends people quietly back to "gut feel" or their own Excel — and then the whole pipeline before it was for nothing. So at the serving stop, **data quality and trust aren't bonus points, they're the pass mark**. In practice that means: set **SLAs / SLOs** for critical data (how fresh, how accurate, how quickly fixed when broken), and put quality monitoring as close to the consumer as possible.

**Trust is the foundation of serving; every form below is built on it.**

## Serving fans out to many mouths

"Serving data" isn't a single action; it's **the same modeled data fed to consumers of completely different shapes**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 300" role="img" aria-label="Serving fan-out: modeled data (warehouse or lakehouse) is fed to business analytics BI dashboards, embedded analytics, machine learning features, and reverse ETL back into operational systems" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="sv1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="24" y="115" width="152" height="70" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="100" y="145" fill="#e6e6e6" font-size="12" text-anchor="middle">modeled data</text>
    <text x="100" y="163" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Warehouse · Lakehouse</text>
    <line x1="176" y1="150" x2="356" y2="42" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sv1)"/>
    <line x1="176" y1="150" x2="356" y2="108" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sv1)"/>
    <line x1="176" y1="150" x2="356" y2="174" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sv1)"/>
    <line x1="176" y1="150" x2="356" y2="240" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sv1)"/>
    <rect x="360" y="16" width="216" height="52" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="468" y="38" fill="#e6e6e6" font-size="10.5" text-anchor="middle">business analytics</text>
    <text x="468" y="54" fill="#9aa4b2" font-size="8.5" text-anchor="middle">BI · dashboards</text>
    <rect x="360" y="82" width="216" height="52" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.5"/>
    <text x="468" y="104" fill="#e6e6e6" font-size="10.5" text-anchor="middle">embedded analytics</text>
    <text x="468" y="120" fill="#9aa4b2" font-size="8.5" text-anchor="middle">in-product, for customers</text>
    <rect x="360" y="148" width="216" height="52" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="468" y="170" fill="#e6e6e6" font-size="10.5" text-anchor="middle">machine learning</text>
    <text x="468" y="186" fill="#9aa4b2" font-size="8.5" text-anchor="middle">features · training data</text>
    <rect x="360" y="214" width="216" height="52" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="468" y="236" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Reverse ETL</text>
    <text x="468" y="252" fill="#9aa4b2" font-size="8.5" text-anchor="middle">back into CRM · ad platforms</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Serving is the last stop of the lifecycle, and the only one that produces value; the same data fans out to four consumers of completely different shapes</figcaption>
</figure>

## Three kinds of analytics — don't mix them up

The first two in the diagram are both called "analytics", but the requirements are worlds apart. The book distinguishes three:

| Kind | For whom, for what | Need for real time |
|---|---|---|
| **Business analytics** | Internal decisions: reports, dashboards, exploration | Low (batch is mostly enough) |
| **Operational analytics** | Act right now: real-time monitoring, live operations | High (needs real time, see [[spark-streaming\|streaming]]) |
| **Embedded analytics** | For **external customers**: data pages inside the product | Medium to high, and zero tolerance for wrong numbers |

The easiest trap is building **embedded** analytics like an internal report — it's for customers, so one wrong number is a product incident, not "we'll fix it internally".

## Serving ML: where the DE's responsibility ends

The other big consumer is machine learning. Here you have to be clear **how far the DE is responsible**: the DE typically owns turning data into **clean, trustworthy, reproducible features and training data** (often managed centrally through a **feature store**), so that model training and online inference get **the same** features; the modelling and tuning beyond that belong to the ML engineer. The book flags a key point: **the features used for training and the features served online must be consistent**, or you get the infamous training-serving skew. The DE's value on that line is the same old story — **make the data trustworthy and reproducible**.

## Reverse ETL: data that isn't just "looked at"

Traditional serving takes data somewhere to be **looked at** (dashboards). **Reverse ETL** goes the other way, **pushing results computed in the warehouse back into operational systems** — loading a "high churn-risk customers" list back into the CRM, pushing an audience segment to an ad platform. Data thereby stops being just reports and **directly drives action**. It closes the [[fode-2|lifecycle]] loop: data comes from operational systems, goes round, and returns to operational systems.

## One number, one definition: the semantic layer

Back to "trust". The most common killer of trust is **the same "revenue" producing three numbers in three tools** — one in BI, one in a notebook, one in the product, and nobody believes anybody. The **semantic layer (metrics layer)** exists to solve this: **centralise metric definitions, define each once, and have every tool fetch from there**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 252" role="img" aria-label="The semantic layer: BI dashboards, notebooks and the product app all fetch metrics through one semantic layer, which in turn queries the warehouse; metrics like revenue are defined once and every tool gets the same number" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="sm1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="40" y="20" width="140" height="44" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="110" y="46" fill="#e6e6e6" font-size="10.5" text-anchor="middle">BI · dashboards</text>
    <rect x="210" y="20" width="140" height="44" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="280" y="46" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Notebook</text>
    <rect x="380" y="20" width="140" height="44" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="450" y="46" fill="#e6e6e6" font-size="10.5" text-anchor="middle">product app</text>
    <line x1="110" y1="64" x2="200" y2="108" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sm1)"/>
    <line x1="280" y1="64" x2="280" y2="108" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sm1)"/>
    <line x1="450" y1="64" x2="360" y2="108" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sm1)"/>
    <rect x="110" y="110" width="340" height="52" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="280" y="132" fill="#4f6df5" font-size="12" font-weight="bold" text-anchor="middle">Semantic layer · Metrics layer</text>
    <text x="280" y="150" fill="#9aa4b2" font-size="8.5" text-anchor="middle">revenue, active users… defined once</text>
    <line x1="280" y1="162" x2="280" y2="196" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sm1)"/>
    <path d="M240 200 v26 a40 6 0 0 0 80 0 v-26" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><ellipse cx="280" cy="200" rx="40" ry="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="280" y="222" fill="#e6e6e6" font-size="10" text-anchor="middle">Warehouse</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Without a semantic layer every tool computes its own, and one "revenue" comes out in three versions; with it, the definition is centralised once and consistent site-wide — the technical guarantee of trust</figcaption>
</figure>

## Reflections

### Without trust, the whole pipeline before it was for nothing

This chapter woke me up to something engineers routinely overlook: **the value of data isn't in "being computed", it's in "someone believes it and uses it".** I've seen beautifully built pipelines that nobody ended up using — because one day the numbers didn't match, or it broke for three days with no alert, and everyone quietly went back to their own Excel and gut feel. From then on that dashboard was a tombstone nobody opened. The lesson is hard: **the quality and trust of the serving stop deserve as much effort as any stage before it** — because it's the only place all that earlier effort is cashed in. Putting monitoring and SLAs closest to the consumer isn't fussiness; it's protecting the investment in the whole pipeline.

### "Why do these two reports disagree" — the semantic layer is the thing I most wish I'd introduced earlier

I've been asked that question until I dread it. The same "active users": one number in BI, one the boss pulled themselves, another from the product — every meeting spent reconciling numbers instead of making decisions. That's how trust gets worn away, one time after another. The root cause is almost always the same: **metric definitions scattered across tools, each computing its own.** A semantic layer (dbt metrics, or a BI tool's semantic model) centralises the definition into one **single source of truth**, and I consider it the most underrated, highest-return step there is. What it sells isn't technology, it's **"everyone finally arguing about the right thing on the same number"**.

### Reverse ETL made me rethink what "serving" means

I used to imagine "serving data" as dashboards — dishing data out for people to look at. Reverse ETL opened the other half: **data can go straight back to drive operations** — load "high-risk customers" into the CRM so sales call them today, push an audience back to the ad platform. It turns data from "something to admire" into "something that acts", and truly closes the [[fode-2|lifecycle]] loop. What it taught me: **don't think of a data team's output as reports; think of it as a "product"** — something consumed, accountable, and able to drive action. Which echoes this whole chapter: serving is the face of data engineering that actually meets the user.
