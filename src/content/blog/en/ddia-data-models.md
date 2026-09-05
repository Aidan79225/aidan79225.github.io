---
title: "Data Models: Relational, Document, Graph — What Are You Actually Choosing?"
date: 2026-07-12
category: tech
description: "Choosing relational, document or graph isn't a minor technology decision — it decides how you map reality into data and how you think about problems. This chapter gives the most practical ruler there is: one-to-many is natural in documents, many-to-many is still where relational and graph are strong. It also answers a historical question: why relational won (the declarative victory of handing access paths to the optimizer), and why the document model came back."
tags:
  - distributed-systems
  - book-notes
  - data-modeling
series: "Designing Data-Intensive Applications — Reading Notes"
seriesOrder: 2
comments: true
draft: false
translationOf: ddia-data-models
---
[[ddia-reliable-scalable|The first post]] covered what a data system should pursue (reliable, scalable, maintainable). This one goes a level down: **what data model do you hold the data in?** Relational, document, or graph — this choice isn't small. It's the underlying abstraction by which you **map reality into data**, and it decides how you model, how you query, even how you think about the problem.

## Three data models

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 216" role="img" aria-label="Three data models. Relational uses tables and foreign keys, queried with SQL, strong at many-to-many and joins. Document uses nested JSON, where one-to-many is natural, locality is good, and one read fetches the whole thing. Graph uses vertices and edges, suited to highly connected data where the relationships themselves are the point." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="193" y1="16" x2="193" y2="180" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="387" y1="16" x2="387" y2="180" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="97" y="26" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">Relational</text>
    <rect x="36" y="42" width="58" height="40" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><line x1="36" y1="53" x2="94" y2="53" stroke="#4f6df5" stroke-width="0.8"/><line x1="36" y1="64" x2="94" y2="64" stroke="#3a4154" stroke-width="0.6"/><line x1="36" y1="73" x2="94" y2="73" stroke="#3a4154" stroke-width="0.6"/><text x="65" y="51" fill="#9aa4b2" font-size="6.5" text-anchor="middle">users</text>
    <rect x="108" y="60" width="58" height="40" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><line x1="108" y1="71" x2="166" y2="71" stroke="#4f6df5" stroke-width="0.8"/><line x1="108" y1="82" x2="166" y2="82" stroke="#3a4154" stroke-width="0.6"/><text x="137" y="69" fill="#9aa4b2" font-size="6.5" text-anchor="middle">orders</text>
    <line x1="94" y1="72" x2="108" y2="80" stroke="#54b890" stroke-width="1"/><text x="101" y="90" fill="#54b890" font-size="6" text-anchor="middle">FK</text>
    <text x="97" y="150" fill="#9aa4b2" font-size="8" text-anchor="middle">tables + foreign keys, SQL</text>
    <text x="97" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">many-to-many, strong joins</text>
    <text x="290" y="26" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">Document</text>
    <rect x="238" y="42" width="104" height="66" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.3"/>
    <rect x="248" y="50" width="84" height="12" rx="2" fill="#223528" stroke="#54b890" stroke-width="0.8"/><text x="290" y="59" fill="#9aa4b2" font-size="6.5" text-anchor="middle">name, email</text>
    <rect x="248" y="66" width="84" height="16" rx="2" fill="#1f2330" stroke="#3a4154" stroke-width="0.8"/><text x="290" y="77" fill="#9aa4b2" font-size="6.5" text-anchor="middle">positions [ … ] (nested)</text>
    <rect x="248" y="86" width="84" height="16" rx="2" fill="#1f2330" stroke="#3a4154" stroke-width="0.8"/><text x="290" y="97" fill="#9aa4b2" font-size="6.5" text-anchor="middle">education [ … ] (nested)</text>
    <text x="290" y="150" fill="#9aa4b2" font-size="8" text-anchor="middle">nested JSON, natural one-to-many</text>
    <text x="290" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">good locality (one read, whole thing)</text>
    <text x="483" y="26" fill="#9b6ff0" font-size="10" text-anchor="middle" font-weight="bold">Graph</text>
    <circle cx="452" cy="58" r="12" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.3"/>
    <circle cx="516" cy="58" r="12" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.3"/>
    <circle cx="484" cy="102" r="12" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.3"/>
    <line x1="464" y1="58" x2="504" y2="58" stroke="#9b6ff0" stroke-width="1"/>
    <line x1="456" y1="69" x2="476" y2="92" stroke="#9b6ff0" stroke-width="1"/>
    <line x1="512" y1="69" x2="492" y2="92" stroke="#9b6ff0" stroke-width="1"/>
    <text x="483" y="150" fill="#9aa4b2" font-size="8" text-anchor="middle">vertices + edges, highly connected</text>
    <text x="483" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">the relationships are the point</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">Relational</b> spreads data into tables joined by foreign keys; <b style="color:#54b890">document</b> nests related data into one unit; <b style="color:#9b6ff0">graph</b> makes the relationship a first-class citizen. None replaces the others — each is good at a different shape of data</figcaption>
</figure>

## The real dividing line: one-to-many vs many-to-many

To choose between relational and document, the most practical ruler is to ask **whether the data's relationships are one-to-many or many-to-many**. DDIA uses a résumé (a LinkedIn profile) as the example, and it's vivid:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="On the left, one-to-many: one person has several positions and several education entries, nested inside a single résumé document, fetched in one read — natural for the document model. On the right, many-to-many: résumé A and résumé B both point at the same company X, an entity shared by many people; the document model can only store the company's id and join it yourself, or copy the company data into every résumé and create duplication — the document model's weakness." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="dm2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e0733a"/></marker></defs>
    <line x1="290" y1="16" x2="290" y2="176" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="28" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">One-to-many → documents are natural</text>
    <rect x="70" y="42" width="160" height="104" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="150" y="58" fill="#e6e6e6" font-size="8.5" text-anchor="middle">résumé (one document)</text>
    <rect x="84" y="66" width="132" height="18" rx="3" fill="#1f2330" stroke="#3a4154" stroke-width="0.9"/><text x="150" y="78" fill="#9aa4b2" font-size="7.5" text-anchor="middle">position 1</text>
    <rect x="84" y="88" width="132" height="18" rx="3" fill="#1f2330" stroke="#3a4154" stroke-width="0.9"/><text x="150" y="100" fill="#9aa4b2" font-size="7.5" text-anchor="middle">position 2</text>
    <rect x="84" y="110" width="132" height="18" rx="3" fill="#1f2330" stroke="#3a4154" stroke-width="0.9"/><text x="150" y="122" fill="#9aa4b2" font-size="7.5" text-anchor="middle">education</text>
    <text x="150" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">many positions per person → nested, one read gets all ✓</text>
    <text x="430" y="28" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">Many-to-many → where documents hurt</text>
    <rect x="308" y="44" width="86" height="34" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="351" y="65" fill="#e6e6e6" font-size="8" text-anchor="middle">résumé A</text>
    <rect x="308" y="102" width="86" height="34" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="351" y="123" fill="#e6e6e6" font-size="8" text-anchor="middle">résumé B</text>
    <rect x="452" y="72" width="96" height="38" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.4"/><text x="500" y="88" fill="#d6a45c" font-size="8" text-anchor="middle">company X</text><text x="500" y="100" fill="#9aa4b2" font-size="7" text-anchor="middle">shared entity</text>
    <line x1="394" y1="61" x2="450" y2="82" stroke="#e0733a" stroke-width="1.1" marker-end="url(#dm2)"/>
    <line x1="394" y1="119" x2="450" y2="100" stroke="#e0733a" stroke-width="1.1" marker-end="url(#dm2)"/>
    <text x="430" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">many point at one company → store an id and join, or duplicate ✗</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">One person with several positions (one-to-many) nests into one document beautifully; but a "company" is an entity shared by many résumés (many-to-many), and the document model can only store an id and join it yourself, or duplicate it everywhere — which is exactly relational's and graph's home ground</figcaption>
</figure>

A related distinction on the side: document models are mostly **schema-on-read** (the structure is interpreted when the data is read, so writes are flexible), while relational is **schema-on-write** (the structure is checked at write time, like static typing). The first makes structural change easy, the second guarantees consistency — another "flexibility vs guarantee" trade-off with no absolute winner; it depends how often your data changes and how much consistency you need.

## Why relational won back then, and why documents came back

There's a fascinating piece of history hiding in this chapter. In the 1970s the relational model defeated the **network and hierarchical models** of the day, and the key wasn't performance, it was being **declarative**: the network model made you **hard-code in your program how to traverse step by step to the data** (the access path), so a different query meant rewriting a pile of code; relational let you say only **what you want** and handed "how to get there" to the query optimizer. Sound familiar? It's exactly the declarative theme I keep returning to in the [[sql-execution-order|SQL series]] — **hand "how" to an engine that understands the data's distribution better than you do.**

And the document model is in a sense **the hierarchical model resurrected** (nesting, good locality, one read for the whole thing). It came back because a lot of modern data really is "one self-contained document" (a post, an order, an event), plus the appeal of schema flexibility. But note: **what it resurrected is the hierarchical/nested structure, not an overturning of relational's declarative victory** — on many-to-many, relational and graph are still stronger.

## Reflections

### Choosing a data model is choosing how you want to think about the problem

I used to treat "which database" as a detail of technology selection; only later did I understand it's a more fundamental decision: **it frames how you map reality into data.** Take the same business and think of it in tables, in documents, in graphs, and your mind walks completely different paths. So my order now is — look at the data's **shape** first: is it tree-like (one-to-many, natural document boundaries)? Net-like (many-to-many, entities shared between each other)? Or is the relationship itself the point (social, recommendation, road networks)? **Recognise the shape, then pick the model** — rather than the reverse, forcing data into whatever trendy DB you wanted to use.

### One-to-many vs many-to-many is my first question for "should this be a document DB?"

This ruler is too useful. Whether to adopt a document store like MongoDB, the first thing I ask is exactly that: does the data have **natural document boundaries**, are its relationships **one-to-many** (order + line items, post + comments, one person + several positions)? → Documents are a joy, reads and writes stay inside one unit, locality is good. But the moment a **many-to-many shared entity** appears (tags, authors, companies, products), the document model starts to hurt — either you copy entity data into every document (duplication, hard to update) or you store ids and [[sql-joins|join]] in the application layer yourself (moving the database's job back into your code). **When I see many-to-many, I seriously consider relational.**

### Relational's victory was declarative's victory — and that hasn't been overturned

This bit of history hardened a belief for me: the decades-long direction of data tooling is **continually taking "how" out of human hands and giving it to an engine**. Relational beat the network model that way (you say what, the optimizer decides how), SQL's [[sql-explain|EXPLAIN]] is that, Spark's Catalyst is that. The document model brought back nesting and flexibility, a fine complement, but it didn't and shouldn't overturn that declarative core. So with any new data model or query language I first ask: **does it let me focus more on intent, or does it drag me back into managing steps?** Only the former is on the right side of history.
