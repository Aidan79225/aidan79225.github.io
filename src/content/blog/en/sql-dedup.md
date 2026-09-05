---
title: "Deduplication Done Right: DISTINCT Isn't the Only Answer"
date: 2026-07-09
category: tech
description: "Duplicate data is everywhere — re-imports, CDC delivering multiple versions, JOIN fan-out. But deduplication isn't only DISTINCT, and the kind data engineering needs most often, DISTINCT can't solve at all. The key is first telling two kinds of \"duplicate\" apart: identical rows, and the same key with several versions — the latter needs ROW_NUMBER to pick the representative row."
tags:
  - sql
  - data-engineering
series: "SQL: I Thought I Knew It"
seriesOrder: 6
comments: true
draft: false
translationOf: sql-dedup
---
Duplicate data is almost daily life in data engineering: a pipeline rerun imports twice, CDC pulls in several versions of the same record, [[sql-joins|JOIN fan-out]] copies rows. Many people reach for `DISTINCT` the moment they hear "dedupe" — but deduplication is far more than `DISTINCT`, and the kind a DE meets most often, `DISTINCT` genuinely can't solve. This post first splits "duplicate" into two kinds so you can treat each correctly; and the fix for the second kind is the first real-world use of [[sql-window|the previous post]]'s window function.

## First be clear: which kind of "duplicate" are you removing

There are actually two kinds of "duplicate", with completely different fixes — confuse them and you'll use the wrong tool:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 246" role="img" aria-label="Two kinds of duplicate: on the left, identical rows, three copies of 1 A 100 exactly the same, removed with DISTINCT or GROUP BY; on the right, the same key with several versions, user1 with three rows in different states pending, paid, refunded, where DISTINCT does nothing and ROW_NUMBER picks the representative (latest) row" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="dm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="295" y1="18" x2="295" y2="230" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="5 4"/>
    <text x="150" y="26" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">① Identical rows</text>
    <rect x="62" y="38" width="176" height="24" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="150" y="54" fill="#9aa4b2" font-size="9.5" text-anchor="middle">(1, A, 100)</text>
    <rect x="62" y="65" width="176" height="24" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="150" y="81" fill="#9aa4b2" font-size="9.5" text-anchor="middle">(1, A, 100)</text>
    <rect x="62" y="92" width="176" height="24" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="150" y="108" fill="#9aa4b2" font-size="9.5" text-anchor="middle">(1, A, 100)</text>
    <line x1="150" y1="118" x2="150" y2="142" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#dm)"/>
    <text x="212" y="134" fill="#9aa4b2" font-size="8" text-anchor="middle">DISTINCT</text>
    <rect x="62" y="144" width="176" height="30" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="150" y="163" fill="#e6e6e6" font-size="9.5" text-anchor="middle">(1, A, 100)</text>
    <text x="150" y="200" fill="#9aa4b2" font-size="8.5" text-anchor="middle">whole row identical → drop the extras</text>
    <text x="150" y="214" fill="#54b890" font-size="8.5" text-anchor="middle">DISTINCT / GROUP BY solves it</text>
    <text x="440" y="26" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">② Same key, several versions</text>
    <rect x="336" y="38" width="208" height="24" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="440" y="54" fill="#e6e6e6" font-size="9" text-anchor="middle">user1 · pending · 2/01</text>
    <rect x="336" y="65" width="208" height="24" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="440" y="81" fill="#e6e6e6" font-size="9" text-anchor="middle">user1 · paid · 2/03</text>
    <rect x="336" y="92" width="208" height="24" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="440" y="108" fill="#e6e6e6" font-size="9" text-anchor="middle">user1 · refunded · 2/05</text>
    <line x1="440" y1="118" x2="440" y2="142" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#dm)"/>
    <text x="512" y="134" fill="#9aa4b2" font-size="8" text-anchor="middle">ROW_NUMBER keeps latest</text>
    <rect x="336" y="144" width="208" height="30" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="440" y="163" fill="#e6e6e6" font-size="9" text-anchor="middle">user1 · refunded · 2/05</text>
    <text x="440" y="200" fill="#d6a45c" font-size="8.5" text-anchor="middle">rows differ → DISTINCT does nothing</text>
    <text x="440" y="214" fill="#9aa4b2" font-size="8.5" text-anchor="middle">you have to pick the "representative" row</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">On the left, three identical rows — <code>DISTINCT</code> drops the extras and that's that; on the right, three versions of the same user, and the rows are not identical, so <code>DISTINCT</code> removes nothing — what you want is "keep each user's latest row", and that takes <code>ROW_NUMBER</code></figcaption>
</figure>

Confusing these two is the most common deduplication mistake: applying `DISTINCT` to "multi-version" data, removing nothing (because every row really is different), and believing it's deduplicated.

## Identical rows: DISTINCT (and its true face)

The first kind is the simplest; `DISTINCT` or `GROUP BY` both work. But there's a truth about `DISTINCT` you must know: **it deduplicates "the whole row", not "some column".**

```sql
SELECT DISTINCT user_id, status FROM events;
-- ⚠ this dedupes the "combination" (user_id, status)
-- not "dedupe user_id and bring status along" — a user with two statuses keeps two rows
```

Many people think `DISTINCT user_id, status` gives "one row per user"; in fact it keeps every distinct `(user_id, status)` combination. Also, `DISTINCT` is really just a special case of [[sql-group-by|GROUP BY on every column]] — so when you want to "dedupe and count at the same time", just use `GROUP BY` rather than `DISTINCT` wrapped in another layer.

## One row per key: ROW_NUMBER deduplication

This is the deduplication a DE does every day: **the same entity has several versions, and I want one (usually the latest).** The standard fix is `ROW_NUMBER()` — use [[sql-window|the previous post]]'s window function to number each group, then keep number 1:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 232" role="img" aria-label="How ROW_NUMBER deduplication works: PARTITION BY user_id splits the rows into two groups, user1 and user2, each numbered in updated_at DESC order. user1's three rows are numbered 1 2 3, and only number 1 (2/05 refunded) is kept; user2's two rows are numbered 1 2, and only number 1 (2/04 paid) is kept. WHERE rn=1 keeps the first row of each group after sorting" style="width:100%;max-width:580px;height:auto;margin:0 auto;">
    <text x="20" y="22" fill="#9aa4b2" font-size="9" text-anchor="start">PARTITION BY user_id = 1 · ORDER BY updated_at DESC</text>
    <circle cx="40" cy="45" r="11" fill="#54b890" stroke="#54b890" stroke-width="1.2"/><text x="40" y="49" fill="#1f2330" font-size="10" text-anchor="middle" font-weight="bold">1</text>
    <rect x="66" y="32" width="300" height="26" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="80" y="49" fill="#e6e6e6" font-size="9.5" text-anchor="start">2/05 · refunded</text>
    <text x="410" y="49" fill="#54b890" font-size="9.5" text-anchor="start">✓ keep</text>
    <circle cx="40" cy="75" r="11" fill="none" stroke="#3a4154" stroke-width="1.3"/><text x="40" y="79" fill="#9aa4b2" font-size="10" text-anchor="middle">2</text>
    <rect x="66" y="62" width="300" height="26" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="80" y="79" fill="#9aa4b2" font-size="9.5" text-anchor="start">2/03 · paid</text>
    <text x="410" y="79" fill="#9aa4b2" font-size="9.5" text-anchor="start">✗ drop</text>
    <circle cx="40" cy="105" r="11" fill="none" stroke="#3a4154" stroke-width="1.3"/><text x="40" y="109" fill="#9aa4b2" font-size="10" text-anchor="middle">3</text>
    <rect x="66" y="92" width="300" height="26" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="80" y="109" fill="#9aa4b2" font-size="9.5" text-anchor="start">2/01 · pending</text>
    <text x="410" y="109" fill="#9aa4b2" font-size="9.5" text-anchor="start">✗ drop</text>
    <text x="20" y="146" fill="#9aa4b2" font-size="9" text-anchor="start">PARTITION BY user_id = 2 · ORDER BY updated_at DESC</text>
    <circle cx="40" cy="169" r="11" fill="#54b890" stroke="#54b890" stroke-width="1.2"/><text x="40" y="173" fill="#1f2330" font-size="10" text-anchor="middle" font-weight="bold">1</text>
    <rect x="66" y="156" width="300" height="26" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="80" y="173" fill="#e6e6e6" font-size="9.5" text-anchor="start">2/04 · paid</text>
    <text x="410" y="173" fill="#54b890" font-size="9.5" text-anchor="start">✓ keep</text>
    <circle cx="40" cy="199" r="11" fill="none" stroke="#3a4154" stroke-width="1.3"/><text x="40" y="203" fill="#9aa4b2" font-size="10" text-anchor="middle">2</text>
    <rect x="66" y="186" width="300" height="26" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="80" y="203" fill="#9aa4b2" font-size="9.5" text-anchor="start">2/02 · pending</text>
    <text x="410" y="203" fill="#9aa4b2" font-size="9.5" text-anchor="start">✗ drop</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><code>PARTITION BY</code> defines "what counts as the same one", <code>ORDER BY</code> defines "which counts as the representative", <code>rn = 1</code> keeps it. Numbering restarts from 1 in each partition — that's "keep each user's latest row"</figcaption>
</figure>

```sql
SELECT * FROM (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) AS rn
  FROM events
) t
WHERE rn = 1;   -- each user's latest row (per post 1: a window can't go in WHERE, so wrap it)
```

Three knobs answer three questions: **`PARTITION BY` = "what counts as the same one"** (user? order? email?), **`ORDER BY` = "which row is the representative"** (latest? largest amount?), **`rn = 1` = "keep the representative"**. Swap these three and you can express almost any "one row per group" requirement.

Two additions:

- **`ROW_NUMBER` vs `RANK`**: `ROW_NUMBER` guarantees **exactly one row** per group (even on a tie in `updated_at`, it forces a pick); `RANK` keeps several rows on a tie. Deduplication needs uniqueness, so it's almost always `ROW_NUMBER` — but beware that on a tie "which one it picks" is undefined, so make `ORDER BY` decisive (add an `id DESC`, say, to break ties).
- **PostgreSQL has a shorter form, `DISTINCT ON`**:

```sql
SELECT DISTINCT ON (user_id) *
FROM events
ORDER BY user_id, updated_at DESC;   -- per user_id, keep the first row by ORDER BY
```

`DISTINCT ON` is PostgreSQL-only and very concise, but it forces `ORDER BY` to start with those columns and isn't portable across databases. For portability and flexibility (top N per group, say), `ROW_NUMBER` is the safe choice.

## Reflections

### The first step of deduplication is asking "what counts as the same row"

I've seen too many deduplication bugs whose root wasn't syntax but **never defining clearly what "duplicate" means**. Is it identical whole rows? The same email counting as one person? Several updates to the same order? Without that definition, you pick the wrong tool — `DISTINCT` on multi-version data, or the wrong `PARTITION BY` key — and the result is entirely wrong, without an error. So before I dedupe now, I always answer two questions: **"which columns being equal makes it the same row (→ PARTITION BY)", "within the same row, which version to keep (→ ORDER BY)".** Get those two straight and the SQL practically writes itself.

### DISTINCT isn't the "dedupe by one column" you think it is

`SELECT DISTINCT a, b` dedupes the `(a, b)` combination, not "dedupe a and bring b along" — I've seen this misunderstanding countless times, and it's the same [[sql-null|kind]] of insidious bug: "runs, no error, just a few extra rows". If you truly want "one row per a", what you want was never `DISTINCT`; it's `ROW_NUMBER` or `DISTINCT ON`. **A tool whose name sounds right doesn't mean it does what you think** — which is what this series keeps taking apart: don't be fooled by how it reads; look at what it actually does.

### Which pipeline layer deduplicates matters more than how

Once you can write `ROW_NUMBER` deduplication, the more worthwhile question is **"which layer should this deduplication happen in"**. For the same duplicating data, do you dedupe on the fly at every query (paying the cost every time, and easy to miss), or dedupe cleanly at the landing/modelling layer so downstream receives data that's already unique? I lean to the latter: **treat deduplication as part of data cleaning and do it once, as far upstream as possible**, rather than scattering it across every downstream query. It's consistent with my attitude to [[sql-null|NULL semantics]] and [[sql-joins|fan-out]] — **fixing the mess once at the source beats patching it in every downstream**. It also makes pipeline reruns idempotent: the dedup logic is explicit, and running it any number of times gives the same result.
