---
title: "Time Bucketing and SCD: Two Traps in Handling Time with SQL"
date: 2026-07-10
category: tech
description: "Time has two traps in SQL that many people fall into, and both are about \"ranges\". One is bucketing: GROUP BY date_trunc only produces buckets that have data, so a period with no events silently disappears and the time series breaks. The other is that dimensions change: customers move, products are recategorised, and you need SCD Type 2 to record what history looked like instead of overwriting it."
tags:
  - sql
  - data-engineering
series: "SQL: I Thought I Knew It"
seriesOrder: 8
comments: true
draft: false
translationOf: sql-time-scd
---
Following [[sql-gaps-islands|the previous post]]'s "ranges", this one covers two traps time sets in SQL — both rooted in the same fact: **time is continuous, but your data is discrete events.** In between there are inevitably gaps where "nothing happened", and changes where "the value changed but you didn't record it". SQL won't handle these for you automatically; you have to act.

## Trap one: time bucketing drops empty buckets

For "per day / per hour" aggregation, the standard approach is `date_trunc('day', ts)` to put timestamps into buckets and then `GROUP BY`. But a quiet trap hides here: **`GROUP BY` only produces buckets that "have data" — a day with no events at all simply has no row**, and your time series has a hole in it:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Left, the result of GROUP BY date_trunc directly: 7/01 has 3 rows, 7/02 has 5, 7/04 has 2, and 7/03 has no row at all because there were no orders. Right, the result of filling the hole with generate_series plus COALESCE 0: 7/01 3, 7/02 5, 7/03 filled with 0, 7/04 2, and the time series is continuous" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="tm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="140" y="26" fill="#9aa4b2" font-size="9.5" text-anchor="middle" font-weight="bold">GROUP BY date_trunc directly</text>
    <text x="100" y="46" fill="#9aa4b2" font-size="8.5" text-anchor="middle">date</text><text x="195" y="46" fill="#9aa4b2" font-size="8.5" text-anchor="middle">count</text>
    <rect x="55" y="52" width="170" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="100" y="68" fill="#e6e6e6" font-size="9" text-anchor="middle">7/01</text><text x="195" y="68" fill="#e6e6e6" font-size="9" text-anchor="middle">3</text>
    <rect x="55" y="79" width="170" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="100" y="95" fill="#e6e6e6" font-size="9" text-anchor="middle">7/02</text><text x="195" y="95" fill="#e6e6e6" font-size="9" text-anchor="middle">5</text>
    <rect x="55" y="106" width="170" height="24" rx="4" fill="#1f2330" stroke="#e0733a" stroke-width="1.1" stroke-dasharray="4 3"/><text x="140" y="122" fill="#e0733a" font-size="8.5" text-anchor="middle">no row for 7/03 ✗</text>
    <rect x="55" y="133" width="170" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="100" y="149" fill="#e6e6e6" font-size="9" text-anchor="middle">7/04</text><text x="195" y="149" fill="#e6e6e6" font-size="9" text-anchor="middle">2</text>
    <line x1="232" y1="95" x2="338" y2="95" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#tm)"/>
    <text x="285" y="88" fill="#9aa4b2" font-size="7.8" text-anchor="middle">fill the hole</text>
    <text x="440" y="26" fill="#9aa4b2" font-size="9.5" text-anchor="middle" font-weight="bold">generate_series + COALESCE 0</text>
    <rect x="345" y="52" width="170" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="390" y="68" fill="#e6e6e6" font-size="9" text-anchor="middle">7/01</text><text x="480" y="68" fill="#e6e6e6" font-size="9" text-anchor="middle">3</text>
    <rect x="345" y="79" width="170" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="390" y="95" fill="#e6e6e6" font-size="9" text-anchor="middle">7/02</text><text x="480" y="95" fill="#e6e6e6" font-size="9" text-anchor="middle">5</text>
    <rect x="345" y="106" width="170" height="24" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="390" y="122" fill="#e6e6e6" font-size="9" text-anchor="middle">7/03</text><text x="480" y="122" fill="#d6a45c" font-size="9" text-anchor="middle" font-weight="bold">0</text>
    <rect x="345" y="133" width="170" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="390" y="149" fill="#e6e6e6" font-size="9" text-anchor="middle">7/04</text><text x="480" y="149" fill="#e6e6e6" font-size="9" text-anchor="middle">2</text>
    <text x="290" y="190" fill="#9aa4b2" font-size="8.5" text-anchor="middle">GROUP BY only emits buckets that "have data" — 7/03 with no orders vanishes, and the series breaks</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Left: bucket directly, and 7/03 with no orders quietly disappears. Right: first build the complete date axis with <code>generate_series</code>, then <code>LEFT JOIN</code> the data and <code>COALESCE</code> to 0 — empty buckets get a row too</figcaption>
</figure>

The root of the problem is "absence being silently treated as non-existence". The fix is **don't let the data decide which buckets exist; build the complete time axis yourself**: generate every day with `generate_series`, [[sql-joins|LEFT JOIN]] the data onto it, and fill the unmatched with [[sql-null|COALESCE]] 0:

```sql
-- ❌ days with no orders never appear
SELECT date_trunc('day', created_at) AS day, COUNT(*) AS orders
FROM orders
GROUP BY 1 ORDER BY 1;

-- ✅ build the full date axis first, then fill the holes
SELECT d.day, COALESCE(COUNT(o.id), 0) AS orders
FROM generate_series(DATE '2026-07-01', DATE '2026-07-04', INTERVAL '1 day') AS d(day)
LEFT JOIN orders o ON date_trunc('day', o.created_at) = d.day
GROUP BY d.day ORDER BY d.day;
```

## Trap two: dimensions change, and you need to remember history

The second trap: **dimensions change slowly** — customers move, products get recategorised, sales reps change region. If you overwrite the old value directly, the history is gone forever: which tax region was last year's order computed under at the time? Whose name was that deal under? The data warehouse's standard answer to this is **SCD (Slowly Changing Dimension)**, and the most common form is **Type 2: don't overwrite; add a row for every change, marked with a validity range**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 224" role="img" aria-label="Customer 1's city changes over time: Taipei from 2026-01-01 to 03-15, Tainan from 03-15 onward as the current value, with the move on 03-15. Below, two data rows: Taipei valid_from 2026-01-01 valid_to 2026-03-15 is_current false; Tainan valid_from 2026-03-15 valid_to 9999-12-31 is_current true. To see the state at a moment, use valid_from less than or equal to t less than valid_to" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="290" y="24" fill="#9aa4b2" font-size="9.5" text-anchor="middle" font-weight="bold">Customer #1's "city" over time</text>
    <rect x="60" y="38" width="220" height="30" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="170" y="58" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Taipei</text>
    <rect x="280" y="38" width="230" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="395" y="58" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Tainan (is_current)</text>
    <line x1="280" y1="34" x2="280" y2="78" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="280" y="90" fill="#d6a45c" font-size="8" text-anchor="middle">moved 2026-03-15</text>
    <text x="60" y="90" fill="#9aa4b2" font-size="7.8" text-anchor="start">2026-01-01</text>
    <text x="510" y="90" fill="#9aa4b2" font-size="7.8" text-anchor="end">now</text>
    <text x="100" y="120" fill="#9aa4b2" font-size="8.2" text-anchor="middle">city</text><text x="245" y="120" fill="#9aa4b2" font-size="8.2" text-anchor="middle">valid_from</text><text x="370" y="120" fill="#9aa4b2" font-size="8.2" text-anchor="middle">valid_to</text><text x="480" y="120" fill="#9aa4b2" font-size="8.2" text-anchor="middle">is_current</text>
    <rect x="45" y="126" width="490" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="100" y="143" fill="#e6e6e6" font-size="8.5" text-anchor="middle">Taipei</text><text x="245" y="143" fill="#e6e6e6" font-size="8.5" text-anchor="middle">2026-01-01</text><text x="370" y="143" fill="#e6e6e6" font-size="8.5" text-anchor="middle">2026-03-15</text><text x="480" y="143" fill="#9aa4b2" font-size="8.5" text-anchor="middle">false</text>
    <rect x="45" y="155" width="490" height="26" rx="4" fill="#1e2a40" stroke="#4f6df5" stroke-width="1.1"/><text x="100" y="172" fill="#e6e6e6" font-size="8.5" text-anchor="middle">Tainan</text><text x="245" y="172" fill="#e6e6e6" font-size="8.5" text-anchor="middle">2026-03-15</text><text x="370" y="172" fill="#e6e6e6" font-size="8.5" text-anchor="middle">9999-12-31</text><text x="480" y="172" fill="#54b890" font-size="8.5" text-anchor="middle">true</text>
    <text x="290" y="205" fill="#9aa4b2" font-size="8.5" text-anchor="middle">"As of moment t" → valid_from ≤ t &lt; valid_to; Type 1 overwrites (loses history), Type 2 adds a row (keeps it)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">SCD Type 2: insert a row for every change, mark the validity range with <code>valid_from</code> / <code>valid_to</code>, and flag the current value with <code>is_current</code>. The whole history is kept, and you can go back to any point in time to see what things looked like then</figcaption>
</figure>

With this history table, "go back to a point in time and see what it looked like" is just a range query:

```sql
-- the city on record for customer 1 as of 2026-02-01 (answer: Taipei)
SELECT city FROM customer_history
WHERE customer_id = 1
  AND valid_from <= DATE '2026-02-01'
  AND DATE '2026-02-01' < valid_to;
```

By contrast, **Type 1** is simply `UPDATE`ing over the old value — less work, but the history is gone for good. Whether to keep history is a trade-off to settle when you model: dimensions that will be used for historical analysis, audit, or "what was it at the time" should almost all be Type 2.

## Reflections

### "No data" is data too

The dropped-empty-bucket trap is, at heart, "**absence silently treated as non-existence**". But in a time series, "that day was 0" and "that day has no row" mean completely different things — one is explicit information (there really were no orders that day), the other is a hole in the data (you never produced that cell). Plotted, or fed to a downstream model, the difference amplifies into a wrong reading of the trend. It's the same ailment as [[sql-null|the NULL post]]: **"runs, but quietly missing something"**. So the first thing I do with any time series now is decide "how are empty periods represented", and actively fill the axis with `generate_series`, rather than letting `GROUP BY` hide a 0 as "doesn't exist".

### SCD Type 2 is "version control" for data

Once Type 2 clicked, I saw it as essentially **git** for dimension data — every change stores a timestamped version instead of overwriting. The only difference is that you store a "validity range" rather than a commit. That lens makes it easier to decide between Type 1 and Type 2: **will you ever want to `git blame` this column?** If yes (the price at the time, the owner at the time, the category at the time), Type 2; if no, and only the current value matters (a user's display nickname, say), Type 1 overwriting is fine. Overwriting saves effort; the price is that you can never go back — a trade-off that exists in any system that stores state, not just data warehouses.

### Time makes SQL hard because it has "ranges that don't exist"

Looking back, these two traps share a root, and they're family with [[sql-gaps-islands|the previous post]]'s gaps and islands: **time is continuous, data is discrete** — there are always "gaps where nothing happened" and "changes where the value switched but nothing was recorded". SQL won't fill these in for you; you have to actively build the complete time axis (`generate_series`) and actively record the ranges of change (`valid_from`/`valid_to`). Recognising that **time has gaps and boundaries you must fill yourself** is the first lesson in handling any time series; and what these posts (dedupe, contiguous ranges, time) keep saying is really one thing — **real-world data is messy and discontinuous, and tidying it into a clean, analysable shape is the daily craft of data engineering.**
