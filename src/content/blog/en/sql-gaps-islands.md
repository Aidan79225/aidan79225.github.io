---
title: "Gaps and Islands: Pulling Out Contiguous Ranges"
date: 2026-07-10
category: tech
description: "Consecutive login days, collapsing consecutive dates into ranges, detecting breaks in a sequence — these seemingly different needs are at heart one classic hard problem: gaps and islands. The name is intimidating, but there's an extremely elegant solution: value minus ROW_NUMBER gives a fixed constant within each contiguous range, and GROUP BY on it cuts out every island."
tags:
  - sql
  - data-engineering
series: "SQL: I Thought I Knew It"
seriesOrder: 7
comments: true
draft: false
translationOf: sql-gaps-islands
---
With [[sql-window|window functions]] learned, this post is their most beautiful real-world use. "How many consecutive days did they log in", "collapse consecutive dates into ranges", "find the breaks in a sequence" — these look like different needs, but they're the same classic problem: **gaps and islands**. The name sounds intimidating, but there's a solution so elegant it'll make you say "oh!" out loud.

## What gaps and islands are

Build the picture first. Lay a sequence of ordered data (dates, serial numbers) out on a timeline: **a contiguous run is an "island", and the empty stretch between islands is a "gap"**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 176" role="img" aria-label="Date points on a timeline: days 1 to 3 form island A, days 7 to 8 form island B, day 12 is island C. Between islands are gaps. The goal is to collapse scattered contiguous points into islands" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <line x1="48" y1="98" x2="516" y2="98" stroke="#3a4154" stroke-width="1.4"/>
    <rect x="46" y="76" width="102" height="44" rx="8" fill="none" stroke="#54b890" stroke-width="1.4" stroke-dasharray="4 3"/>
    <text x="97" y="68" fill="#54b890" font-size="8.7" text-anchor="middle">island A: 3 days</text>
    <rect x="256" y="76" width="66" height="44" rx="8" fill="none" stroke="#4f6df5" stroke-width="1.4" stroke-dasharray="4 3"/>
    <text x="289" y="68" fill="#4f6df5" font-size="8.7" text-anchor="middle">island B: 2 days</text>
    <rect x="431" y="76" width="30" height="44" rx="8" fill="none" stroke="#d6a45c" stroke-width="1.4" stroke-dasharray="4 3"/>
    <text x="446" y="68" fill="#d6a45c" font-size="8.7" text-anchor="middle">island C: 1 day</text>
    <circle cx="60" cy="98" r="6" fill="#54b890"/><circle cx="97" cy="98" r="6" fill="#54b890"/><circle cx="134" cy="98" r="6" fill="#54b890"/>
    <circle cx="271" cy="98" r="6" fill="#4f6df5"/><circle cx="307" cy="98" r="6" fill="#4f6df5"/>
    <circle cx="446" cy="98" r="6" fill="#d6a45c"/>
    <text x="200" y="116" fill="#9aa4b2" font-size="8.5" text-anchor="middle">gap</text>
    <text x="377" y="116" fill="#9aa4b2" font-size="8.5" text-anchor="middle">gap</text>
    <text x="60" y="146" fill="#9aa4b2" font-size="8" text-anchor="middle">7/1</text>
    <text x="134" y="146" fill="#9aa4b2" font-size="8" text-anchor="middle">7/3</text>
    <text x="271" y="146" fill="#9aa4b2" font-size="8" text-anchor="middle">7/7</text>
    <text x="446" y="146" fill="#9aa4b2" font-size="8" text-anchor="middle">7/12</text>
    <text x="508" y="116" fill="#9aa4b2" font-size="8.5" text-anchor="end">date →</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The goal: collapse scattered contiguous points into "islands" (e.g. compute the start, end and length of each run of consecutive logins). The hard part — SQL has no built-in notion of "contiguous"; you have to make one</figcaption>
</figure>

## Move one: the magic of value − ROW_NUMBER

The most elegant solution is a single thought: **contiguous values go up by 1 each step, and [[sql-window|ROW_NUMBER]] also goes up by 1 each step, so "value − row_number" is a fixed constant within one island**; hit a gap, and the value jumps while row_number doesn't, so the difference changes. That constant becomes the island's ID:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 520 252" role="img" aria-label="A four-column table: value, ROW_NUMBER, value minus rn, island. Values 1 2 3 pair with rn 1 2 3, differences all 0, island A; values 7 8 pair with rn 4 5, differences all 3, island B; value 12 pairs with rn 6, difference 6, island C. The value minus rn column stays fixed within one island, so GROUP BY on it cuts out the islands" style="width:100%;max-width:540px;height:auto;margin:0 auto;">
    <rect x="250" y="46" width="128" height="180" rx="6" fill="#26324a" stroke="#d6a45c" stroke-width="1.3" stroke-dasharray="4 3"/>
    <text x="95" y="40" fill="#9aa4b2" font-size="9" text-anchor="middle" font-weight="bold">value</text>
    <text x="190" y="40" fill="#9aa4b2" font-size="9" text-anchor="middle" font-weight="bold">ROW_NUMBER</text>
    <text x="314" y="40" fill="#d6a45c" font-size="9" text-anchor="middle" font-weight="bold">value − rn</text>
    <text x="440" y="40" fill="#9aa4b2" font-size="9" text-anchor="middle" font-weight="bold">island</text>
    <text x="95" y="66" fill="#e6e6e6" font-size="10" text-anchor="middle">1</text><text x="190" y="66" fill="#9aa4b2" font-size="10" text-anchor="middle">1</text><text x="314" y="66" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">0</text><text x="440" y="66" fill="#54b890" font-size="9.5" text-anchor="middle">A</text>
    <text x="95" y="92" fill="#e6e6e6" font-size="10" text-anchor="middle">2</text><text x="190" y="92" fill="#9aa4b2" font-size="10" text-anchor="middle">2</text><text x="314" y="92" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">0</text><text x="440" y="92" fill="#54b890" font-size="9.5" text-anchor="middle">A</text>
    <text x="95" y="118" fill="#e6e6e6" font-size="10" text-anchor="middle">3</text><text x="190" y="118" fill="#9aa4b2" font-size="10" text-anchor="middle">3</text><text x="314" y="118" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">0</text><text x="440" y="118" fill="#54b890" font-size="9.5" text-anchor="middle">A</text>
    <line x1="40" y1="130" x2="490" y2="130" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="95" y="150" fill="#e6e6e6" font-size="10" text-anchor="middle">7</text><text x="190" y="150" fill="#9aa4b2" font-size="10" text-anchor="middle">4</text><text x="314" y="150" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">3</text><text x="440" y="150" fill="#4f6df5" font-size="9.5" text-anchor="middle">B</text>
    <text x="95" y="176" fill="#e6e6e6" font-size="10" text-anchor="middle">8</text><text x="190" y="176" fill="#9aa4b2" font-size="10" text-anchor="middle">5</text><text x="314" y="176" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">3</text><text x="440" y="176" fill="#4f6df5" font-size="9.5" text-anchor="middle">B</text>
    <line x1="40" y1="188" x2="490" y2="188" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="95" y="208" fill="#e6e6e6" font-size="10" text-anchor="middle">12</text><text x="190" y="208" fill="#9aa4b2" font-size="10" text-anchor="middle">6</text><text x="314" y="208" fill="#d6a45c" font-size="10.5" text-anchor="middle" font-weight="bold">6</text><text x="440" y="208" fill="#d6a45c" font-size="9.5" text-anchor="middle">C</text>
    <text x="260" y="242" fill="#9aa4b2" font-size="8.5" text-anchor="middle">value − ROW_NUMBER stays fixed within an island → GROUP BY it, and every island is cut out</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Contiguous values +1, row_number +1, so their difference is a constant within an island (0, 3, 6); a gap makes it jump. That constant is the "island id" — just <code>GROUP BY</code> it</figcaption>
</figure>

In SQL, collapsing consecutive login dates into ranges:

```sql
SELECT user_id, MIN(login_date) AS start_date, MAX(login_date) AS end_date, COUNT(*) AS days
FROM (
  SELECT user_id, login_date,
         login_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date))::int AS grp
  FROM logins
) t
GROUP BY user_id, grp;   -- grp is the "island id": the same run of consecutive dates shares one grp
```

`login_date − row_number` is the same date (a constant) within one run of consecutive dates, and jumps the moment a day is skipped. One `GROUP BY user_id, grp` and each island collapses to one row; `MIN`/`MAX` give the start and end, `COUNT` the number of days.

## Move two: LAG to find the breaks + running sum (more general)

The difference method is beautiful, but it has a precondition: **"contiguous" must mean strictly +1**. If your definition of contiguous is looser ("within 3 days counts as the same run", "within the same session"), use the more general second move — **compare with the previous row via [[sql-window|LAG]] to find the breaks, then number them with a running sum**:

```sql
SELECT user_id, MIN(login_date) AS start_date, MAX(login_date) AS end_date
FROM (
  SELECT user_id, login_date,
         SUM(is_new) OVER (PARTITION BY user_id ORDER BY login_date) AS island
  FROM (
    SELECT user_id, login_date,
           CASE WHEN login_date - LAG(login_date) OVER (PARTITION BY user_id ORDER BY login_date) > 1
                THEN 1 ELSE 0 END AS is_new     -- more than 1 day after the previous row → a new island starts
    FROM logins
  ) a
) b
GROUP BY user_id, island;
```

Three layers: the innermost uses `LAG` to compare with the previous row and flags `is_new = 1` when the threshold is exceeded (the first day of a new island); the middle layer adds those flags up with a [[sql-window|running SUM]] — `+1` at every new island, so `island` becomes the island id 1, 1, 1, 2, 2, 3…; the outer layer `GROUP BY`s it into ranges. **The threshold (`> 1`) can be as loose as you like**, which is what makes it more general than the difference method.

## Reflections

### Change the representation and the hard problem disappears

What fascinates me about value − row_number is what it demonstrates: **many hard problems aren't hard to solve; you're using the wrong representation.** The property "contiguous" is hard to express directly in SQL (there's no `IS CONSECUTIVE`); but the moment you **transform it into "a fixed constant"**, the hard problem collapses into an utterly ordinary `GROUP BY`. That experience of "find the right representation and the problem solves itself" is the most satisfying moment in writing SQL — really in all analytical thinking. When I'm stuck now, I step back and ask: **"is there a way to turn this odd property into something I already know how to handle?"**

### An elegant solution comes with preconditions you have to recognise

The difference method is beautiful, but only holds for "strictly +1"; real data is often less well behaved (weekends, a few days' tolerance, irregular sessions). Forcing the difference method there gives wrong answers, and you switch to LAG + running sum — uglier, but with an adjustable threshold that handles every definition of "contiguous". The lesson: **elegant solutions usually have strict preconditions, and you confirm them before using them.** My engineering judgement is simple — first ask "is my contiguity strictly +1"; if yes, take the difference method's elegance; if not, take LAG's generality. Which move to pick depends on the shape of the data, not on which is flashier.

### Recognising the pattern is worth more than being able to write it

The hardest part of gaps and islands is often not writing it but **recognising it** — "periods of continuous online time", "merge adjacent rows with the same state into one range", "find the broken serial numbers" look unrelated on the surface and are all the same problem underneath. Recognise the pattern and you apply the move directly, instead of grinding from scratch every time and not necessarily getting it right. That's why it gets its own post: half the value of [[sql-window|window functions]] is "knowing how to use them", the other half is "recognising which problems call for them". **Memorise the common problem shapes, and meeting one turns from "reinvent" into "apply"** — the most concrete step up in data engineering skill I know.
