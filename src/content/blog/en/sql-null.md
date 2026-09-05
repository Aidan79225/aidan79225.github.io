---
title: "NULL Isn't a Value, It's \"Don't Know\""
date: 2026-07-08
category: tech
description: "Treating NULL as 0 or an empty string is the source of countless SQL bugs. NULL isn't a value, it's \"don't know\" — any comparison with it is neither TRUE nor FALSE but a third thing: UNKNOWN. Understand three-valued logic, and NOT IN returning nothing, AVG's wrong denominator and = NULL matching nothing all click at once."
tags:
  - sql
  - concept
series: "SQL: I Thought I Knew It"
seriesOrder: 3
comments: true
draft: false
translationOf: sql-null
---
[[sql-joins|The previous post]]'s LEFT JOIN pads `NULL` for rows that matched nothing. That `NULL` is this post's subject — it's the source of countless SQL bugs, and the root cause is one sentence: **`NULL` isn't a value, it's "don't know".** Once you read it as "don't know" instead of "0" or "empty string", a whole pile of strange behaviour becomes explicable.

## Compare with NULL and you get a third result: UNKNOWN

Because `NULL` means "don't know", any comparison with it can only answer "don't know". `age = NULL` isn't `TRUE`, and it **isn't `FALSE`** either — it's a third logical value: `UNKNOWN`. **SQL logic has three values, not two:**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 220" role="img" aria-label="SQL logic has three values: TRUE, the condition holds; FALSE, the condition fails; UNKNOWN, don't know. Every comparison with NULL lands in UNKNOWN. And WHERE, ON and HAVING let only TRUE through, dropping both FALSE and UNKNOWN, so = NULL matches nothing and you must use IS NULL instead" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="20" y="28" fill="#9aa4b2" font-size="11" text-anchor="start" font-weight="bold">SQL logic has three values (not two)</text>
    <rect x="70" y="42" width="120" height="46" rx="7" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/>
    <text x="130" y="62" fill="#54b890" font-size="12" text-anchor="middle" font-weight="bold">TRUE</text>
    <text x="130" y="78" fill="#9aa4b2" font-size="8.5" text-anchor="middle">condition holds</text>
    <rect x="210" y="42" width="120" height="46" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="270" y="62" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">FALSE</text>
    <text x="270" y="78" fill="#9aa4b2" font-size="8.5" text-anchor="middle">condition fails</text>
    <rect x="350" y="42" width="160" height="46" rx="7" fill="#33291a" stroke="#d6a45c" stroke-width="1.7"/>
    <text x="430" y="62" fill="#d6a45c" font-size="12" text-anchor="middle" font-weight="bold">UNKNOWN</text>
    <text x="430" y="78" fill="#9aa4b2" font-size="8.5" text-anchor="middle">don't know</text>
    <text x="430" y="108" fill="#d6a45c" font-size="8.5" text-anchor="middle">↑ every comparison with NULL lands here</text>
    <text x="430" y="120" fill="#9aa4b2" font-size="8" text-anchor="middle">age = NULL and age &lt;&gt; NULL alike</text>
    <text x="20" y="152" fill="#9aa4b2" font-size="11" text-anchor="start" font-weight="bold">WHERE / ON / HAVING let only TRUE through</text>
    <rect x="70" y="166" width="120" height="38" rx="7" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/>
    <text x="130" y="189" fill="#54b890" font-size="10" text-anchor="middle">TRUE → ✓ kept</text>
    <rect x="210" y="166" width="120" height="38" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="270" y="189" fill="#9aa4b2" font-size="10" text-anchor="middle">FALSE → ✗ dropped</text>
    <rect x="350" y="166" width="160" height="38" rx="7" fill="#1f2330" stroke="#d6a45c" stroke-width="1.3" stroke-dasharray="4 3"/>
    <text x="430" y="189" fill="#d6a45c" font-size="10" text-anchor="middle">UNKNOWN → ✗ dropped</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><code>= NULL</code> yields <code>UNKNOWN</code>, not <code>FALSE</code>; and <code>WHERE</code> lets only <code>TRUE</code> through, so <code>UNKNOWN</code> is dropped just like <code>FALSE</code>. That's why <code>WHERE age = NULL</code> never matches anything — use <code>IS NULL</code> instead</figcaption>
</figure>

So the first iron rule: **to test for NULL, use only `IS NULL` / `IS NOT NULL`, never `= NULL` / `<> NULL`.** The latter won't error; it will simply, silently, never hold — which is exactly what makes it insidious.

## Three-valued logic: UNKNOWN is contagious

With a third value, the truth tables for `AND` / `OR` gain a whole extra row. Only two cells matter:

| `AND` | TRUE | FALSE | UNKNOWN |
|---|---|---|---|
| **TRUE** | TRUE | FALSE | **UNKNOWN** |
| **FALSE** | FALSE | FALSE | **FALSE** |
| **UNKNOWN** | UNKNOWN | FALSE | UNKNOWN |

Look at just these two: `TRUE AND UNKNOWN = UNKNOWN` (**the moment one UNKNOWN gets into a chain of ANDs, with no FALSE anywhere, the result is stuck at UNKNOWN and can never reach TRUE**); and `FALSE AND UNKNOWN = FALSE` (FALSE is absorbing and stops the contagion). This "UNKNOWN is contagious" rule is the root of the classic trap below.

## The most insidious trap: NOT IN meets NULL and returns nothing

This is the one I've seen the most people fall into, and the hardest to spot on your own. You want "users not on the blacklist":

```sql
SELECT * FROM users
WHERE id NOT IN (SELECT blocked_id FROM blacklist);
```

If the list that subquery returns **contains even one `NULL`**, this returns **an empty set** — not a single row. Why? Expand the `NOT IN` and you see straight through it:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 210" role="img" aria-label="x NOT IN (1, 2, NULL) expands to x<>1 AND x<>2 AND x<>NULL; evaluating with x=5 gives TRUE AND TRUE AND UNKNOWN, and because the last term compares with NULL and is UNKNOWN, the whole chain can never reach TRUE, every row is dropped by WHERE, and the result is empty" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="nm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="196" y="14" width="188" height="30" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="290" y="34" fill="#e6e6e6" font-size="12" text-anchor="middle">x NOT IN (1, 2, NULL)</text>
    <line x1="290" y1="44" x2="290" y2="68" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#nm)"/>
    <text x="300" y="60" fill="#9aa4b2" font-size="8.5" text-anchor="start">expands to a chain of ANDs</text>
    <rect x="157" y="70" width="54" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="184" y="90" fill="#e6e6e6" font-size="10" text-anchor="middle">x&lt;&gt;1</text>
    <text x="223" y="90" fill="#9aa4b2" font-size="9" text-anchor="middle">AND</text>
    <rect x="257" y="70" width="54" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="284" y="90" fill="#e6e6e6" font-size="10" text-anchor="middle">x&lt;&gt;2</text>
    <text x="323" y="90" fill="#9aa4b2" font-size="9" text-anchor="middle">AND</text>
    <rect x="357" y="70" width="66" height="30" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.6"/><text x="390" y="90" fill="#d6a45c" font-size="10" text-anchor="middle">x&lt;&gt;NULL</text>
    <line x1="290" y1="100" x2="290" y2="124" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#nm)"/>
    <text x="300" y="116" fill="#9aa4b2" font-size="8.5" text-anchor="start">evaluate with x=5</text>
    <rect x="157" y="126" width="54" height="30" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="184" y="146" fill="#54b890" font-size="10" text-anchor="middle">TRUE</text>
    <text x="223" y="146" fill="#9aa4b2" font-size="9" text-anchor="middle">AND</text>
    <rect x="257" y="126" width="54" height="30" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="284" y="146" fill="#54b890" font-size="10" text-anchor="middle">TRUE</text>
    <text x="323" y="146" fill="#9aa4b2" font-size="9" text-anchor="middle">AND</text>
    <rect x="357" y="126" width="66" height="30" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.6"/><text x="390" y="146" fill="#d6a45c" font-size="10" text-anchor="middle">UNKNOWN</text>
    <line x1="290" y1="156" x2="290" y2="176" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#nm)"/>
    <rect x="110" y="178" width="360" height="28" rx="6" fill="#33291a" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="290" y="197" fill="#d6a45c" font-size="9.5" text-anchor="middle">never reaches TRUE → every row dropped → empty result ❌</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><code>NOT IN</code> expands into a chain of <code>AND</code>s, and one <code>NULL</code> in the list adds a term <code>x &lt;&gt; NULL = UNKNOWN</code>. By "UNKNOWN is contagious", the whole chain is stuck at UNKNOWN and never reaches TRUE, so <b>every row</b> is eliminated</figcaption>
</figure>

Two fixes, pick one: **switch to `NOT EXISTS`** (unaffected by NULL, and clearer in meaning), or **filter NULLs out inside the subquery with `WHERE blocked_id IS NOT NULL`**. My default is the former:

```sql
SELECT * FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM blacklist b WHERE b.blocked_id = u.id
);
```

## Other NULL behaviour you're bound to meet

The same "NULL = don't know" principle extends into a string of behaviours you'll run into sooner or later:

- **`COUNT(*)` counts every row; `COUNT(col)` counts only non-NULLs** — the difference is how many NULLs that column has. More precisely, `COUNT(x)` is defined as "the number of rows where `x` is not NULL", so `COUNT(<constant>)` only depends on whether the constant is NULL: `COUNT(1)` counts every row = `COUNT(*)`; while `COUNT(NULL)` is **always 0** (a constant NULL is NULL on every row, so nothing gets counted). And to bust a myth: `COUNT(1)` isn't faster than `COUNT(*)`; the optimizer treats them as the same thing, and `COUNT(*)` says what it means most clearly.
- **`SUM` / `AVG` / `MAX` ignore NULL**. Watch `AVG`: its denominator is "the number of non-NULL rows", not NULL-as-zero — the average you think you're taking may not be the one you computed.
- **`GROUP BY` puts all NULLs in the same group** (here SQL treats them as "equal" — an exception).
- **`ORDER BY`**: PostgreSQL sorts NULL **last** under `ASC` by default; say `NULLS FIRST` / `NULLS LAST` explicitly.
- **A `UNIQUE` constraint allows multiple NULLs**: because `NULL = NULL` is also UNKNOWN, two NULLs don't count as "duplicates".

## Tools for self-defence

A few very practical tools for handling NULL, worth remembering:

```sql
COALESCE(x, 0)              -- if x is NULL, use the default 0 (takes several candidates)
NULLIF(a, b)               -- returns NULL when a = b; classic guard against divide by zero: x / NULLIF(y, 0)
x IS DISTINCT FROM y       -- null-safe "not equal": treats NULL as an ordinary value, NULL equals NULL
```

`IS DISTINCT FROM` is especially handy: when you need to compare two columns that "might be NULL" and want "both NULL counts as the same", it keeps you out of the UNKNOWN pit.

## Reflections

### Read NULL as "don't know", and a whole row of pits gets filled at once

When I started with SQL I treated these as separate odd rules to memorise: no `= NULL`, `NOT IN` goes wrong, `AVG` ignores NULL… Later I found they're all **extensions of one idea** — NULL is "don't know", not "0" and not "empty". Compare with "don't know" and of course the result is "don't know" (UNKNOWN); average a pile of "don't knows" and of course the unknowns have to be excluded first. Once that meaning is swapped in, I no longer need to memorise rules; I can **derive** NULL's behaviour in any situation. It's the same gain as the [[sql-execution-order|processing order]] and [[sql-joins|JOIN]] posts: **find the single consistent idea, and the rules degrade into deductions.**

### The most expensive bugs are the "runs fine, no error" kind

NULL traps almost never make your query error — `NOT IN` silently returns nothing, `AVG` silently computes wrong, `= NULL` silently matches nothing. It's the same insidiousness as [[sql-joins|the previous post]]'s "LEFT JOIN quietly becomes INNER": **runs, no error, numbers even look right — just wrong.** These bugs cost the most, because there's no red text to warn you, and they're usually traced back only after someone downstream has reconciled numbers to the point of despair. So I've built a reflex: **whenever a condition contains `NOT IN`, or compares a column that might be NULL, stop and ask "can this column be NULL?"** That one question has caught more bugs than any tool.

### Pin down NULL's meaning at the source

When NULL bites you in a query, the problem is often further upstream: **why** was this column allowed to be NULL in the first place? Worse, NULL is often polysemous — in the same column, NULL might mean "hasn't happened yet", "not applicable", or "data missing". When I design a schema or pipeline now, I try to settle it at the source: use an explicit default instead of NULL where possible, and where NULL must stay, decide which kind of "nothing" it stands for. **Settle the semantics at the source, and downstream doesn't have to `COALESCE` its way through guessing what it meant** — consistent with my attitude to data modelling generally: pushing the mess one step upstream and fixing it once beats patching it in every downstream.
