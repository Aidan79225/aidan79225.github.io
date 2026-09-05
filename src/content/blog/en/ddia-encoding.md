---
title: "Encoding and Evolution: Letting Old and New Code Read Each Other's Data"
date: 2026-07-23
category: tech
description: "Why care about encoding formats like Avro and Protobuf? Because of two facts you can't escape: data outlives code (the row you wrote to the DB five years ago is still there), and rolling upgrades mean old and new code always coexist. So the schema will change, and when it does, new code has to read old data (backward compatibility) and old code has to read new data (forward compatibility — the half everyone forgets). DDIA Ch4 goes all the way down: JSON's vagueness, how Protobuf/Thrift evolve through field tags, Avro's writer/reader schemas, and how to manage a schema as a contract across time."
tags:
  - distributed-systems
  - book-notes
  - data-engineering
series: "Designing Data-Intensive Applications — Reading Notes"
seriesOrder: 4
comments: true
draft: false
translationOf: ddia-encoding
---
[[ddia-storage-engines|The previous post]] was about how data gets onto disk. This one is about a problem that's easier to underrate: **when data is written out, what format is it encoded in?** You might think "JSON's fine" — until the day the schema has to change. The weight of this chapter comes from two facts you can't escape: **data outlives code** (you can replace all your code today, but the row written to the database five years ago is still lying there), and **old and new versions of the code run at the same time** (with [[k8s-deployment|rolling upgrades]] that's the norm, not an accident). Put those together and "encoding format" stops being a detail and becomes **compatibility engineering across versions and across time**.

## Why you need *two* kinds of compatibility: rolling upgrades force old and new into the same moment

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="During a rolling upgrade, new and old versions of the code run at the same time and share one database. So data flows both ways: new code reads data written by old code, which needs backward compatibility; old code also reads data written by new code, which needs forward compatibility. Everyone remembers backward compatibility; forward compatibility is the one most often forgotten, yet it happens every day inside the rolling-upgrade and rollback window." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="ec" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker><marker id="ec2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e0733a"/></marker></defs>
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Mid rolling upgrade: old and new both running, data flows both ways</text>
    <rect x="36" y="36" width="150" height="54" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/><text x="111" y="58" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">new code v2</text><text x="111" y="76" fill="#9aa4b2" font-size="7.4" text-anchor="middle">the nodes already upgraded</text>
    <rect x="394" y="36" width="150" height="54" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="469" y="58" fill="#e6e6e6" font-size="9.6" text-anchor="middle" font-weight="bold">old code v1</text><text x="469" y="76" fill="#9aa4b2" font-size="7.4" text-anchor="middle">the nodes not yet reached</text>
    <path d="M218 62 v30 a72 8 0 0 0 144 0 v-30" fill="#33291a" stroke="#d6a45c" stroke-width="1.6"/><ellipse cx="290" cy="62" rx="72" ry="8" fill="#33291a" stroke="#d6a45c" stroke-width="1.6"/><text x="290" y="85" fill="#d6a45c" font-size="8.6" text-anchor="middle" font-weight="bold">same database / topic</text>
    <path d="M186 54 C 220 40, 252 44, 268 54" fill="none" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2"/><path d="M394 54 C 360 40, 328 44, 312 54" fill="none" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2"/>
    <text x="290" y="36" fill="#9aa4b2" font-size="7" text-anchor="middle">both sides write, both sides read</text>
    <rect x="30" y="128" width="256" height="56" rx="8" fill="#1f2330" stroke="#54b890" stroke-width="1.5"/>
    <text x="158" y="148" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">backward compatibility</text>
    <text x="158" y="164" fill="#e6e6e6" font-size="8.2" text-anchor="middle">new code can read old data</text>
    <text x="158" y="177" fill="#9aa4b2" font-size="7.2" text-anchor="middle">everyone remembers this (migration mindset)</text>
    <rect x="294" y="128" width="256" height="56" rx="8" fill="#1f2330" stroke="#e0733a" stroke-width="1.5"/>
    <text x="422" y="148" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">forward compatibility</text>
    <text x="422" y="164" fill="#e6e6e6" font-size="8.2" text-anchor="middle">old code can read new data</text>
    <text x="422" y="177" fill="#9aa4b2" font-size="7.2" text-anchor="middle">most forgotten — but daily in rollout and rollback</text>
    <line x1="140" y1="96" x2="152" y2="126" stroke="#54b890" stroke-width="1.3" marker-end="url(#ec)"/>
    <line x1="440" y1="96" x2="428" y2="126" stroke="#e0733a" stroke-width="1.3" marker-end="url(#ec2)"/>
    <text x="290" y="212" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">Every schema change needs both — miss one and errors start mid-rollout</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">During a <a href="/blog/k8s-deployment/">rolling upgrade</a>, <b style="color:#4f6df5">new</b> and <b>old</b> code run at the same time and share one database or topic — so data flows <b>both ways</b>. <b style="color:#54b890">Backward compatibility</b> (new reads old) everyone remembers, because that's the daily life of migrations; <b style="color:#e0733a">forward compatibility</b> (old reads new) is the half most often forgotten — yet it happens every day, in every rollout window and on every <b>rollback</b> (you've gone back to the old version, but the data the new one already wrote is still there!). Every schema change has to cover both</figcaption>
</figure>

First, let's finish with JSON: it's human-readable and works everywhere, but it has **no schema enforcement** (rename a field or change a type and nothing stops you at compile time — it blows up at runtime), its numbers are vague (big-integer precision, no int/float distinction), and it's fat. For a small system, who cares; **once data has to cross teams and services and live for years, you need a "binary format with a schema"** — and that's where Thrift, Protocol Buffers and Avro come in.

## Field tags: the little mechanism that makes evolution safe

The core cleverness in Protobuf/Thrift is that the encoding **doesn't write field names, only a "field tag" (a number)**. The schema is a manual each side holds; the tag is a coordinate inside the data. And that little mechanism is exactly what lets the schema evolve safely:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 224" role="img" aria-label="How field tags make reading in both directions safe. In the middle is the schema: tag 1 is name, tag 2 is email, and v2 adds tag 3, phone. Bottom left: old code reading new data hits the unknown tag 3, simply skips it, and still reads name and email — forward compatibility holds. Bottom right: new code reading old data can't find tag 3 and uses the default value — backward compatibility holds. Below, three iron rules: a new field always gets a new tag, a tag can never be changed or reused, and a new field must be optional or have a default." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">No field names in the encoding, only tags — so evolution is safe</text>
    <rect x="170" y="30" width="240" height="66" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="290" y="46" fill="#4f6df5" font-size="8.6" text-anchor="middle" font-weight="bold">schema v2</text>
    <text x="290" y="61" fill="#e6e6e6" font-size="8" text-anchor="middle" font-family="monospace">1: name    2: email</text>
    <text x="290" y="76" fill="#54b890" font-size="8" text-anchor="middle" font-family="monospace">3: phone (new in v2, optional)</text>
    <text x="290" y="89" fill="#9aa4b2" font-size="6.8" text-anchor="middle">data stores only tag number + value, never the name</text>
    <rect x="24" y="120" width="262" height="62" rx="8" fill="#1f2330" stroke="#e0733a" stroke-width="1.5"/>
    <text x="155" y="138" fill="#e0733a" font-size="8.4" text-anchor="middle" font-weight="bold">old code (knows tags 1, 2) reads new data</text>
    <text x="155" y="154" fill="#e6e6e6" font-size="7.8" text-anchor="middle">hits unknown tag 3 → skip it</text>
    <text x="155" y="170" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">name / email read fine → forward compatible ✓</text>
    <rect x="294" y="120" width="262" height="62" rx="8" fill="#1f2330" stroke="#54b890" stroke-width="1.5"/>
    <text x="425" y="138" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">new code reads old data (no tag 3)</text>
    <text x="425" y="154" fill="#e6e6e6" font-size="7.8" text-anchor="middle">tag 3 missing → use the default</text>
    <text x="425" y="170" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">doesn't blow up → backward compatible ✓</text>
    <rect x="40" y="192" width="500" height="24" rx="6" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="290" y="208" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">Rules: new field → new tag · never change/reuse a tag · new fields optional or with a default</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Because the encoding holds only <b>tag numbers</b>, not names: when <b style="color:#e0733a">old code reads new data</b> and hits a tag it doesn't know, it simply <b>skips</b> it and reads the rest (forward compatibility); when <b style="color:#54b890">new code reads old data</b> and can't find the new tag, it uses the <b>default</b> (backward compatibility). The whole safety of evolution rests on three iron rules: a new field always gets a <b>new tag</b>, a tag can <b>never be changed or reused</b> (it's the coordinate of old data!), and a new field must be optional or have a default. As a side effect, <em>renaming</em> a field is safe — there was never a name in the encoding</figcaption>
</figure>

**Avro** takes the more extreme road: the encoding has **no tags at all** — values just follow one another — so it's the most compact, but reading requires holding the **writer's schema** (from when the data was written) against the **reader's schema** (what you expect now) and **resolving** them; Avro reconciles the differences between the two versions (fields matched by name, missing ones filled with defaults). This "reconcile two schemas at read time" design makes it especially suited to schemas that change often or are **generated dynamically** (dumping a whole database, say) — which is why it became the mainstream in big data and the [[kafka-ecosystem|Kafka Schema Registry]] ecosystem: the registry manages schema versions centrally and checks every change for compatibility, turning the discipline in this chapter into an automatic gate.

## Reflections

### Data outlives code — compatibility is an API across time

The line that hit me hardest in this chapter is **data outlives code**. You can replace every line of code today, but the row written to the database five years ago, the event that landed in the [[kafka-intro|log]] three years ago, are still lying there untouched, waiting to be read some day in the future. So the essence of schema compatibility isn't "a small matter of format" — it's **an API contract you sign with your past and future selves**: backward compatibility is taking responsibility for the past, forward compatibility is humility towards the future. Once that clicked, I treat a schema change with the same seriousness as a breaking change to a public API: **changing one field is changing an interface that every piece of historical data references.**

### Forward compatibility is the half most easily forgotten — and it happens every day

Everyone has a sense for backward compatibility (the migration mindset); **forward compatibility — old code reading new data — is the half that actually blows up in practice**. It happens in two windows you can't avoid: mid-rollout (an old instance reads data a new instance just wrote), and **after a rollback** (you're back on the old version, but the data the new one already wrote is still there!). My lesson was to make it a deployment discipline: **ship schema changes and code changes separately, schema first** — first a version that "can read the new format but doesn't write it yet", confirm it's fully rolled out, then start writing the new format. It's the other face of the "small steps, always reversible" safety of a [[k8s-deployment|rolling upgrade]]: **code can be rolled back, data can't — so every step in a data format has to be one that both the version before and the version after can catch.**

### There's no such thing as schemaless — only a schema nobody wrote down

The longer I work in data, the less I believe "schemaless is freedom". The moment data is read, someone holds an expectation about its structure — **the schema always exists; the only difference is whether it's written down explicitly and guarded by someone, or scattered through every reader's code and held together by tacit understanding**. Schema-on-read from [[ddia-data-models|two posts ago]] defers the check, it doesn't make the structure disappear; and that "freedom" usually means "the writer got free, the reader cleans up the mess at 3am". So my position is clear: **if data crosses teams or crosses time, make the contract explicit** — Protobuf/Avro schema files in version control, [[kafka-ecosystem|Schema Registry]] automatically blocking incompatible changes. It's the same discipline I've been arguing for from [[k8s-intro|declarative config in version control]] to dashboards as code: **an agreement that matters cannot live in someone's head.**
