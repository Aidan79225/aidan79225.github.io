---
title: "Confirm the Pain Before You Bring In the Heavy Weapons"
date: 2026-06-28
category: tech
tags:
  - concept
  - data-engineering
comments: true
translationOf: pain-before-power
---
> This is a **concept note** — a judgment call I keep reusing, split out into its own post so other articles can link back to it.

In one sentence: **before adopting any heavyweight tool or architecture, confirm that your pain has actually reached the scale that calls for it.** If it hasn't, don't — because the cost of a heavy weapon isn't in "setting it up", it's in "feeding it every day afterwards".

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 200" role="img" aria-label="Pain magnitude as the horizontal axis: left of the threshold, use lightweight solutions; only past the threshold do you bring in heavy weapons" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="pbp1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="20" y="40" width="248" height="98" rx="10" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <text x="144" y="62" fill="#e6e6e6" font-size="12" text-anchor="middle">Pain not there yet → go light</text>
    <text x="144" y="84" fill="#9aa4b2" font-size="10" text-anchor="middle">Local PySpark · dbt + warehouse</text>
    <text x="144" y="102" fill="#9aa4b2" font-size="10" text-anchor="middle">Direct API calls · two layers</text>
    <text x="144" y="124" fill="#9aa4b2" font-size="9.5" text-anchor="middle">Cheap and easy to maintain</text>
    <rect x="292" y="40" width="248" height="98" rx="10" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="416" y="62" fill="#e6e6e6" font-size="12" text-anchor="middle">Pain is real → heavy weapons</text>
    <text x="416" y="84" fill="#9aa4b2" font-size="10" text-anchor="middle">Spark cluster · Kafka</text>
    <text x="416" y="102" fill="#9aa4b2" font-size="10" text-anchor="middle">Airflow · multi-layer Medallion</text>
    <text x="416" y="124" fill="#d4af37" font-size="9.5" text-anchor="middle">Powerful, but needs daily feeding</text>
    <line x1="280" y1="28" x2="280" y2="150" stroke="#d4af37" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="280" y="22" fill="#d4af37" font-size="10" text-anchor="middle">Pain threshold</text>
    <line x1="20" y1="172" x2="548" y2="172" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pbp1)"/>
    <text x="284" y="192" fill="#9aa4b2" font-size="10" text-anchor="middle">Pain magnitude (data volume · number of sources · orchestration complexity) →</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The yardstick is the ratio of cost to pain: cross the line and bring in heavy weapons only when the pain is concrete at that scale; if it merely "sounds like something you should have", stay on the left</figcaption>
</figure>

## What counts as a "heavy weapon"

I mean the things that are powerful but also expensive to operate: [[airflow-intro|Airflow]], [[spark-intro|Spark]], [[kafka-intro|Kafka]], self-hosted clusters, multi-layer data architectures… Every one of them solves real, hard problems. But every one of them also brings a whole bundle of things to learn, monitor, be on call for, and debug. **The power and the burden are sold as a package — you can't take only the former.**

## The failure mode: treating complexity as achievement

The most expensive mistakes I've seen weren't "failing to adopt the right tool" — they were **adopting it too early, using it for the sake of using it**:

- The data is still a few GB, and there's already a Spark cluster — when local PySpark, or even [[dbt-intro|dbt]] + a warehouse, would have solved it.
- Two or three services occasionally exchange a message, and someone hauls in a full [[kafka-intro|Kafka]] deployment — when direct API calls or a lightweight queue are usually the better deal.
- There are only one or two reports, and the pipeline gets carved into a three-layer [[medallion-architecture|Medallion]] — when two layers (raw + reporting) are plenty.

What these decisions share is **treating "we use impressive things" as an engineering achievement**. But the complexity you can carry is a finite budget: spend it here, and there's none left for the problems that actually differentiate you.

## The yardstick: has the pain reached that scale?

Before bringing in a heavy weapon, I force myself to answer one concrete question: **is the pain I have right now the kind of pain this thing exists to solve?**

- Does a single machine genuinely no longer fit or finish the computation? → Only then does Spark get its turn.
- Are there genuinely multiple sources, multiple consumers, audit and rebuild requirements? → Only then do layered architectures / Kafka get their turn.
- Is there a genuine "scheduled, interdependent, retry-on-failure" orchestration need? → Only then does Airflow get its turn.

If the pain is concrete and you can point at it, go ahead; if it merely "sounds like something you should have" or "would look good on a résumé", hold off.

## But this is not "anti-tool"

The crucial flip side: **once the pain is there, don't hesitate.** This principle doesn't tell you to stay stuck with duct tape forever — it tells you to save the heavy weapons for the right moment. It also has exceptions: something like [[dbt-intro|dbt]] — low adoption cost, small downside risk, high return — I'd say you can "almost always just adopt it". The yardstick has always been **the ratio of cost to pain**, never "the fewer tools the better".

Heavy weapons are **a means, not an achievement**. Complexity should be spent where it cuts — this is the ruler I run over almost every technology choice I make.
