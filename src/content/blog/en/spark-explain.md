---
title: "Reading a Spark Execution Plan: What .explain() Is Actually Telling You"
date: 2026-07-07
category: tech
description: "The earlier posts kept telling you to trust Catalyst and open the Spark UI to find the bottleneck, without ever teaching you how to look. This one fills that in: how one line of your code becomes an execution plan, how to read .explain(), and the three words to watch for in a plan — Exchange, BroadcastHashJoin, PushedFilters."
tags:
  - spark
  - data-engineering
  - performance
series: "Spark — Learning Notes"
seriesOrder: 6
comments: true
draft: false
translationOf: spark-explain
---
Two lines have come up again and again through this series: [[spark-dataframe|"trust the Catalyst optimizer"]] and [[spark-shuffle|"open the Spark UI to find the bottleneck"]]. But there's a question I never answered: **how exactly do you see what Spark did?** Trusting the optimizer shouldn't mean trusting it blindly — you need a way to check "the join I assumed would broadcast, did it? Was my filter actually pushed down?" This post fills in that skill: reading the execution plan.

## From one line of code to execution: what happens in between

The DataFrame or SQL you write doesn't run directly. It first becomes a **logical plan** of "what you want", gets rewritten by Catalyst, then lands as a **physical plan** of "how to do it", and only then is cut into tasks and run:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 500 350" role="img" aria-label="A Spark query's life cycle from top to bottom: your code in the DataFrame API or SQL, then the logical plan of what you want, then the Catalyst optimizer pushing filters down, pruning columns and picking a join strategy, then the physical plan of how to do it with Exchange meaning shuffle and the join strategy settled, and finally execution as stages and tasks on executors." style="width:100%;max-width:460px;height:auto;margin:0 auto;">
    <defs><marker id="ex" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="80" y="16" width="340" height="44" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="250" y="36" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">your code</text>
    <text x="250" y="51" fill="#9aa4b2" font-size="8.5" text-anchor="middle">DataFrame API or Spark SQL — equivalent</text>
    <line x1="250" y1="60" x2="250" y2="82" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ex)"/>
    <rect x="80" y="84" width="340" height="44" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="250" y="104" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">Logical Plan · “what you want”</text>
    <text x="250" y="119" fill="#9aa4b2" font-size="8.5" text-anchor="middle">resolves the tables and columns you named; not optimized yet</text>
    <line x1="250" y1="128" x2="250" y2="150" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ex)"/>
    <rect x="80" y="152" width="340" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="250" y="172" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">Catalyst optimizer</text>
    <text x="250" y="187" fill="#9aa4b2" font-size="8.5" text-anchor="middle">filter pushdown · prune unused columns · pick a join strategy</text>
    <line x1="250" y1="196" x2="250" y2="218" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ex)"/>
    <rect x="80" y="220" width="340" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="250" y="240" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">Physical Plan · “how to do it”</text>
    <text x="250" y="255" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Exchange (= shuffle) and the join strategy are settled</text>
    <line x1="250" y1="264" x2="250" y2="286" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ex)"/>
    <rect x="80" y="288" width="340" height="44" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="250" y="308" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">execution</text>
    <text x="250" y="323" fill="#54b890" font-size="8.5" text-anchor="middle">cut into stages / tasks and run on the executors</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Every piece of Spark code you write takes this road. DataFrame and SQL converge at the first step, which is why they perform identically — this is the second half of the “compiled into one plan” figure from <a href="/blog/spark-dataframe/" style="color:#4f6df5;">the DataFrame post</a>. <code>.explain()</code> is what prints this road out for you</figcaption>
</figure>

## .explain(): printing the plan

Put `.explain()` on the end of any DataFrame and you see its physical plan — **without running anything; it's static analysis**:

```python
df = (big.filter(F.col("date") >= "2026-01-01")
         .join(F.broadcast(dim), on="id")
         .groupBy("cat").count())

df.explain()             # physical plan only (what you'll use most)
df.explain(True)         # prints logical → optimized → physical as well
df.explain("formatted")  # sectioned, with column detail — the easiest to read
```

There's one rule for reading it: **read from the bottom up.** The data source (the scan) is at the bottom, then filters, joins, shuffles and aggregations layer upward, and the final result is at the top. Data flows upward.

## The three words to watch in a physical plan

A plan has a lot of words in it, but nine tenths of your performance judgment comes from three of them:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 340" role="img" aria-label="A physical plan read from the bottom up: FileScan parquet big carrying PushedFilters, then Filter, then BroadcastHashJoin with the small table broadcast in from the left so the big one never moves, then Exchange which is the shuffle and the most expensive step, then the HashAggregate result. The right-hand side annotates the three keywords to watch." style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="pu" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="150" y="24" width="180" height="40" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="240" y="41" fill="#e6e6e6" font-size="10.5" text-anchor="middle">HashAggregate</text>
    <text x="240" y="55" fill="#9aa4b2" font-size="8.5" text-anchor="middle">← the groupBy result</text>
    <rect x="150" y="88" width="180" height="40" rx="7" fill="#262b3a" stroke="#e0733a" stroke-width="1.8"/>
    <text x="240" y="105" fill="#e0733a" font-size="10.5" text-anchor="middle" font-weight="bold">Exchange</text>
    <text x="240" y="119" fill="#9aa4b2" font-size="8.5" text-anchor="middle">hashpartitioning(cat)</text>
    <rect x="150" y="152" width="180" height="40" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/>
    <text x="240" y="169" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">BroadcastHashJoin</text>
    <text x="240" y="183" fill="#9aa4b2" font-size="8.5" text-anchor="middle">[id]</text>
    <rect x="150" y="216" width="180" height="40" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="240" y="233" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Filter</text>
    <text x="240" y="247" fill="#9aa4b2" font-size="8.5" text-anchor="middle">date ≥ 2026-01-01</text>
    <rect x="150" y="280" width="180" height="42" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="240" y="298" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">FileScan parquet · big</text>
    <text x="240" y="312" fill="#9aa4b2" font-size="8.5" text-anchor="middle">PushedFilters: [date ≥ …]</text>
    <line x1="240" y1="280" x2="240" y2="258" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pu)"/>
    <line x1="240" y1="216" x2="240" y2="194" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pu)"/>
    <line x1="240" y1="152" x2="240" y2="130" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pu)"/>
    <line x1="240" y1="88" x2="240" y2="66" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pu)"/>
    <rect x="16" y="152" width="118" height="40" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3"/>
    <text x="75" y="169" fill="#e6e6e6" font-size="9.5" text-anchor="middle">FileScan dim</text>
    <text x="75" y="183" fill="#9aa4b2" font-size="8" text-anchor="middle">→ broadcast</text>
    <line x1="134" y1="172" x2="148" y2="172" stroke="#54b890" stroke-width="1.4" marker-end="url(#pu)"/>
    <line x1="330" y1="108" x2="356" y2="108" stroke="#e0733a" stroke-width="1.2" stroke-dasharray="3 2"/>
    <text x="362" y="104" fill="#e0733a" font-size="9" text-anchor="start">Exchange = shuffle!</text>
    <text x="362" y="117" fill="#9aa4b2" font-size="8.5" text-anchor="start">the priciest step in the query</text>
    <line x1="330" y1="172" x2="356" y2="172" stroke="#54b890" stroke-width="1.2" stroke-dasharray="3 2"/>
    <text x="362" y="168" fill="#54b890" font-size="9" text-anchor="start">small side broadcast, big joined in place ✓</text>
    <text x="362" y="181" fill="#9aa4b2" font-size="8.5" text-anchor="start">big table never moves — one shuffle saved</text>
    <line x1="330" y1="300" x2="356" y2="300" stroke="#54b890" stroke-width="1.2" stroke-dasharray="3 2"/>
    <text x="362" y="296" fill="#54b890" font-size="9" text-anchor="start">filter pushed down to the scan ✓</text>
    <text x="362" y="309" fill="#9aa4b2" font-size="8.5" text-anchor="start">Parquet reads only matching rows, skips the rest</text>
    <text x="75" y="232" fill="#9aa4b2" font-size="9" text-anchor="middle">read bottom-up ↑</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The physical plan for that query. Bottom up: scan → filter → join → shuffle → aggregate. Three words are enough — <b style="color:#e0733a">Exchange</b> is a shuffle, <b style="color:#54b890">BroadcastHashJoin</b> is the good join, <b style="color:#54b890">PushedFilters</b> tells you whether the filter went down</figcaption>
</figure>

Printed out it looks roughly like this (the trimmed `explain("formatted")` version):

```text
*(3) HashAggregate(keys=[cat], functions=[count(1)])
+- Exchange hashpartitioning(cat, 200)                    ← the shuffle is here
   +- *(2) HashAggregate(keys=[cat], functions=[partial_count(1)])
      +- *(2) BroadcastHashJoin [id], [id], Inner, BuildRight   ← broadcast join, big table stayed ✓
         :- *(2) Filter (date >= 2026-01-01)
         :  +- *(1) FileScan parquet big[id,cat,date]
         :        PushedFilters: [GreaterThanOrEqual(date, 2026-01-01)]  ← filter pushed down ✓
         +- BroadcastExchange
            +- *(1) FileScan parquet dim[id]
```

What those three words mean maps straight onto what you already learned:

- **Exchange** = one [[spark-shuffle|shuffle]]. This is the word to hunt for in a plan — **count the Exchanges and you roughly know where this query's money goes.** `groupBy`, a non-broadcast `join`, `distinct` and `repartition` all produce one.
- **BroadcastHashJoin vs SortMergeJoin**: the first is a [[spark-shuffle|broadcast join]] — the small table is copied to every node and the big one is joined where it sits, with **no shuffle**; the second shuffles both sides by key. If a join you expected to broadcast shows up as `SortMergeJoin`, the small table went over the threshold and wasn't broadcast — the most commonly missed performance problem there is.
- **PushedFilters**: whether your `filter` made it **down to the scan**. When it does, a columnar format like Parquet skips non-matching data at read time and never loads it; when it doesn't, everything is read in and then filtered, moving a pile of rows for nothing.

## One trap: AQE rewrites the plan at run time

`.explain()` prints the plan **before execution**. But [[spark-shuffle|AQE (adaptive query execution)]], on by default in Spark 3, rewrites it again **while the job runs** — coalescing partitions that came out too small, swapping a SortMergeJoin for a broadcast, splitting a skewed partition. So what `.explain()` showed isn't necessarily what finally ran. **To see the real final plan, go to the SQL / Query page in the [[spark-running|Spark UI]]**, where the plan diagram shows the post-AQE shape along with how many rows each node actually handled and how much each shuffle read and wrote. Static `.explain()` for the structure, the live Spark UI for the facts — use both.

## Reflection

### "Trust the optimizer" is not "don't look at what it did"

In [[spark-dataframe|the DataFrame post]] I said to hand optimization to Catalyst, which is smarter than you. That's true, and it's easily misread as "it'll handle it, so I don't have to care". Since learning to read `.explain()` my position has got much more precise: **I trust Catalyst, and I verify.** I assumed the filter would push down — open the plan and look for `PushedFilters`. I assumed that join would broadcast — check whether it says `BroadcastHashJoin`. Four times out of five it did the right thing, and what's actually slowing you down is usually in the other fifth, where you assumed it would and it didn't. Trust without blind trust comes down to being able to open the box and look.

### Seeing an Exchange should make you tense up

The whole [[spark-shuffle|shuffle post]] was about how expensive shuffle is, and in a plan, shuffle is called `Exchange`. Once that mapping clicks, reading a plan gets a sense of direction: I stop reading line by line and instead scan for how many `Exchange`es there are and which operation caused each one, then ask "can this movement be avoided?" — filter it smaller first, broadcast it away, drop a `groupBy`. **Turning the abstract "performance problem" into the concrete "count the Exchanges" is the biggest thing I got out of learning to read plans.**

### explain is the hypothesis, the Spark UI is the fact

This one I learned by getting burned: reading `.explain()` alone lets a static plan fool you. It doesn't know whether your data is actually skewed, or whether one key holds nine tenths of the volume; you only see that by running it and looking at the spread of task durations in the Spark UI. So my order now is — **use `.explain()` first to confirm the structure is right (join strategy, filter pushdown, how many shuffles), then run it and use the Spark UI to check reality (which stage stalls, whether one task runs far longer than its siblings).** Same attitude I take to every tool: [[pain-before-power|see where the pain is before you act]] — and reading the plan is what turns "the pain" from a vague feeling into a node on the screen you can see and point at.
