---
title: "Choosing a Container Is Choosing a Complexity: list, set, heapq, and Why Sorting First Is Often Faster"
date: 2026-10-16
category: tech
description: "CPHB chapter 4 covers the C++ standard library's data structures; this post swaps in Python's list, set / dict, heapq and deque, plus one thing Python doesn't have: a balanced tree. It all comes down to one question — which operations are cheap in this container? One table draws it out, and two animations show why list.append is amortized O(1) and what the book's \"sorting beats a set tenfold\" experiment is really about."
tags:
  - algorithms
  - cphb
  - data-structures
  - python
  - book-notes
series: "Competitive Programmer's Handbook — Reading Notes"
seriesOrder: 3
comments: true
draft: false
translationOf: cphb-data-structures
---
CPHB chapter 4 is a tour of tools: `vector`, `set`, `map`, `priority_queue`, `deque` and `bitset` from the C++ standard library. The book writes it like a user manual, but the opening carries a sentence that matters far more than the manual: **when choosing a data structure, the crucial question is "which operations are efficient in it?"** Every container is cheap for only a few operations; the rest are either expensive or impossible. What you're choosing isn't a container — it's the price of every step that follows.

This post follows the book's order with C++ swapped for Python: the dynamic array (`list`), sets and maps (`set` / `dict`), the other structures (`deque`, `heapq`, bits), and finally the book's rather interesting experiment — the same problem solved "with a data structure" and "by sorting first", and which one wins.

## One table: which operations are cheap

The whole chapter compressed into a table. Rows are the operations your program performs, columns are Python's containers, green means cheap.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 322" role="img" aria-label="A table of complexity by operation and container. Rows are seven operations: append or pop at the end, push or pop at the front, index, membership, min or max, first element at least x, ordered walk. Columns are five Python containers: list, a sorted list with bisect, set or dict, heapq, deque. Green cells are the cheap operations, O(1) or O(log n). No column is all green: a list indexes fast but searches slowly, a set searches fast but has no order, a sorted list searches and finds neighbours fast but inserts slowly, heapq is fast only for the minimum, a deque is fast at both ends but slow to index. Choosing a container is choosing which cells get to be green." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="300" y="20" fill="#e6e6e6" font-size="13" font-weight="bold" text-anchor="middle">No column is all green — choosing a container is choosing which cells get to be green</text>
    <text x="194.0" y="52" fill="#9aa4b2" font-size="11.5" font-weight="bold" text-anchor="middle">list</text>
    <text x="282.0" y="46" fill="#9aa4b2" font-size="10.5" font-weight="bold" text-anchor="middle">sorted list</text>
    <text x="282.0" y="59" fill="#9aa4b2" font-size="10.5" font-weight="bold" text-anchor="middle">+ bisect</text>
    <text x="370.0" y="52" fill="#9aa4b2" font-size="11.5" font-weight="bold" text-anchor="middle">set / dict</text>
    <text x="458.0" y="52" fill="#9aa4b2" font-size="11.5" font-weight="bold" text-anchor="middle">heapq</text>
    <text x="546.0" y="52" fill="#9aa4b2" font-size="11.5" font-weight="bold" text-anchor="middle">deque</text>
    <text x="142" y="95" fill="#e6e6e6" font-size="11" text-anchor="end">append / pop end</text>
    <rect x="152" y="78" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="194.0" y="95" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)*</text>
    <rect x="240" y="78" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="282.0" y="95" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="328" y="78" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="370.0" y="95" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)*</text>
    <rect x="416" y="78" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="458.0" y="95" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(log n)</text>
    <rect x="504" y="78" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="546.0" y="95" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)*</text>
    <text x="142" y="125" fill="#e6e6e6" font-size="11" text-anchor="end">push / pop front</text>
    <rect x="152" y="108" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="194.0" y="125" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="240" y="108" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="282.0" y="125" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="328" y="108" width="84" height="26" rx="4" fill="none" stroke="#3a4154" stroke-width="1"/>
    <text x="370.0" y="125" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">—</text>
    <rect x="416" y="108" width="84" height="26" rx="4" fill="none" stroke="#3a4154" stroke-width="1"/>
    <text x="458.0" y="125" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">—</text>
    <rect x="504" y="108" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="546.0" y="125" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)*</text>
    <text x="142" y="155" fill="#e6e6e6" font-size="11" text-anchor="end">index</text>
    <rect x="152" y="138" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="194.0" y="155" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)</text>
    <rect x="240" y="138" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="282.0" y="155" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)</text>
    <rect x="328" y="138" width="84" height="26" rx="4" fill="none" stroke="#3a4154" stroke-width="1"/>
    <text x="370.0" y="155" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">—</text>
    <rect x="416" y="138" width="84" height="26" rx="4" fill="none" stroke="#3a4154" stroke-width="1"/>
    <text x="458.0" y="155" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">—</text>
    <rect x="504" y="138" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="546.0" y="155" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <text x="142" y="185" fill="#e6e6e6" font-size="11" text-anchor="end">membership</text>
    <rect x="152" y="168" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="194.0" y="185" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="240" y="168" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="282.0" y="185" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(log n)</text>
    <rect x="328" y="168" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="370.0" y="185" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)*</text>
    <rect x="416" y="168" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="458.0" y="185" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="504" y="168" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="546.0" y="185" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <text x="142" y="215" fill="#e6e6e6" font-size="11" text-anchor="end">min / max</text>
    <rect x="152" y="198" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="194.0" y="215" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="240" y="198" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="282.0" y="215" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)</text>
    <rect x="328" y="198" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="370.0" y="215" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="416" y="198" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="458.0" y="215" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)</text>
    <rect x="504" y="198" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="546.0" y="215" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <text x="142" y="245" fill="#e6e6e6" font-size="11" text-anchor="end">first ≥ x</text>
    <rect x="152" y="228" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="194.0" y="245" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="240" y="228" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="282.0" y="245" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(log n)</text>
    <rect x="328" y="228" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="370.0" y="245" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="416" y="228" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="458.0" y="245" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="504" y="228" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="546.0" y="245" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <text x="142" y="275" fill="#e6e6e6" font-size="11" text-anchor="end">ordered walk</text>
    <rect x="152" y="258" width="84" height="26" rx="4" fill="none" stroke="#3a4154" stroke-width="1"/>
    <text x="194.0" y="275" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">—</text>
    <rect x="240" y="258" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="282.0" y="275" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="328" y="258" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="370.0" y="275" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n log n)</text>
    <rect x="416" y="258" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="458.0" y="275" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n log n)</text>
    <rect x="504" y="258" width="84" height="26" rx="4" fill="none" stroke="#3a4154" stroke-width="1"/>
    <text x="546.0" y="275" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">—</text>
    <text x="300" y="300" fill="#9aa4b2" font-size="10" text-anchor="middle">* amortized / average: append sometimes reallocates, a set can collide; O(1) on average. — = not supported</text>
    <text x="300" y="316" fill="#d6a45c" font-size="10.5" text-anchor="middle">No balanced tree in the stdlib: C++ set / map → sorted list + bisect, or third-party sortedcontainers</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The book's question — "which operations are cheap in this structure?" — as a table. List the operations your program performs and how often, then pick the column with the most green — rather than picking a familiar container first and working around it.</figcaption>
</figure>

Two things to stare at:

- **No column is all green.** A `list` indexes fast and searches slowly; a `set` searches fast and has no order; a sorted `list` searches and finds neighbours fast but inserts slowly; `heapq` is fast only for the minimum; a `deque` is fast at both ends and slow to index. Choosing a container means choosing which cells get to be green on this table — so list your operations first, then pick the container, not the other way round.
- **Python is missing a column.** C++'s `set` / `map` is a balanced binary tree: $O(\log n)$ insert, lookup, "smallest element $\ge x$", ordered iteration — all cheap. Python's standard library has no such thing. The stand-ins are "a sorted `list` + `bisect`" (fast lookup, $O(n)$ insert) or the third-party `sortedcontainers`. This is the hole you hit most often solving problems in Python; more on it below.

## The dynamic array: list

The book's `vector` is Python's `list`: appending at the end (`append`), removing from the end (`pop`) and indexing are all fast; `len`, slicing and `for x in v` work as you'd expect. Underneath is one contiguous block of memory, and **when it fills up, a bigger block is allocated and every element is moved over**. A move is expensive — but rare, so `append` averages $O(1)$. The book stops there; "why rare" is worth seeing once.

<div data-algo="list-growth"><p>(This is an interactive animation and needs JavaScript. Capacity starts at 1 and doubles when full; appending 11 elements triggers only 4 moves, 15 elements in total, under 2n.)</p></div>

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 236" role="img" aria-label="The cost of doubling a dynamic array. Appends run left to right; capacity doubles 1, 2, 4, 8, 16, and every time it fills up the elements are moved once: 1, 2, 4, 8 elements. All moves together are 1 plus 2 plus 4 plus 8, which is 15, under twice n. So n appends cost under 3n in total, O(1) each when spread out." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="300" y="20" fill="#e6e6e6" font-size="13" font-weight="bold" text-anchor="middle">A move is expensive, but one move lasts until the next doubling</text>
    <rect x="41" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="56.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">1</text>
    <rect x="73" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="88.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">2</text>
    <rect x="105" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="120.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">3</text>
    <rect x="137" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="152.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">4</text>
    <rect x="169" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="184.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">5</text>
    <rect x="201" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="216.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">6</text>
    <rect x="233" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="248.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">7</text>
    <rect x="265" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="280.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">8</text>
    <rect x="297" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="312.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">9</text>
    <rect x="329" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="344.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">10</text>
    <rect x="361" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="376.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">11</text>
    <rect x="393" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="408.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">12</text>
    <rect x="425" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="440.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">13</text>
    <rect x="457" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="472.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">14</text>
    <rect x="489" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="504.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">15</text>
    <rect x="521" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="536.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">16</text>
    <text x="40" y="38" fill="#9aa4b2" font-size="10" text-anchor="start">append # →</text>
    <text x="552" y="314" fill="#4f6df5" font-size="10" text-anchor="end"></text>
    <line x1="42" y1="82" x2="70" y2="82" stroke="#4f6df5" stroke-width="2"/>
    <text x="56.0" y="96" fill="#4f6df5" font-size="10" text-anchor="middle">1</text>
    <line x1="74" y1="82" x2="102" y2="82" stroke="#4f6df5" stroke-width="2"/>
    <text x="88.0" y="96" fill="#4f6df5" font-size="10" text-anchor="middle">2</text>
    <line x1="106" y1="82" x2="166" y2="82" stroke="#4f6df5" stroke-width="2"/>
    <text x="136.0" y="96" fill="#4f6df5" font-size="10" text-anchor="middle">cap 4</text>
    <line x1="170" y1="82" x2="294" y2="82" stroke="#4f6df5" stroke-width="2"/>
    <text x="232.0" y="96" fill="#4f6df5" font-size="10" text-anchor="middle">cap 8</text>
    <line x1="298" y1="82" x2="550" y2="82" stroke="#4f6df5" stroke-width="2"/>
    <text x="424.0" y="96" fill="#4f6df5" font-size="10" text-anchor="middle">cap 16</text>
    <text x="40" y="116" fill="#9aa4b2" font-size="10" text-anchor="start">moves when full (elements moved):</text>
    <line x1="72" y1="70" x2="72" y2="140" stroke="#dc4c3f" stroke-width="1.2" stroke-dasharray="3 2"/>
    <rect x="58" y="126" width="28" height="18" rx="4" fill="#3a2626" stroke="#dc4c3f"/>
    <text x="72" y="139" fill="#dc4c3f" font-size="10.5" font-weight="bold" text-anchor="middle">1</text>
    <line x1="104" y1="70" x2="104" y2="140" stroke="#dc4c3f" stroke-width="1.2" stroke-dasharray="3 2"/>
    <rect x="90" y="126" width="28" height="18" rx="4" fill="#3a2626" stroke="#dc4c3f"/>
    <text x="104" y="139" fill="#dc4c3f" font-size="10.5" font-weight="bold" text-anchor="middle">2</text>
    <line x1="168" y1="70" x2="168" y2="140" stroke="#dc4c3f" stroke-width="1.2" stroke-dasharray="3 2"/>
    <rect x="154" y="126" width="28" height="18" rx="4" fill="#3a2626" stroke="#dc4c3f"/>
    <text x="168" y="139" fill="#dc4c3f" font-size="10.5" font-weight="bold" text-anchor="middle">4</text>
    <line x1="296" y1="70" x2="296" y2="140" stroke="#dc4c3f" stroke-width="1.2" stroke-dasharray="3 2"/>
    <rect x="282" y="126" width="28" height="18" rx="4" fill="#3a2626" stroke="#dc4c3f"/>
    <text x="296" y="139" fill="#dc4c3f" font-size="10.5" font-weight="bold" text-anchor="middle">8</text>
    <text x="300" y="174" fill="#e6e6e6" font-size="12" text-anchor="middle">total moved = 1 + 2 + 4 + 8 = 15 < 2 × 16</text>
    <text x="300" y="194" fill="#d6a45c" font-size="12" font-weight="bold" text-anchor="middle">n appends cost < n + 2n = 3n in total → O(1) each, amortized</text>
    <text x="300" y="212" fill="#9aa4b2" font-size="10" text-anchor="middle">CPython grows by ~1.125× (0, 4, 8, 16, 24, 32, 40, 52, 64…): more moves, less memory, same amortized O(1)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Where "O(1) on average" comes from: doubling keeps the number of moves at log n, and the sizes of those moves form a geometric series that never reaches 2n.</figcaption>
</figure>

This is the first example of **amortized analysis** — a single operation can be expensive, but a whole sequence of them has a bounded total, so each one is cheap on average. Part 7 uses the same idea for two pointers.

CPython doesn't actually double; it over-allocates by about an eighth plus a little (the capacity sequence runs 0, 4, 8, 16, 24, 32, 40, 52, 64…), which moves more often than doubling but wastes less memory. The conclusion stands: `append` is amortized $O(1)$. The flip side: **`insert(0, x)` and `pop(0)` are $O(n)$** — the whole array shifts by one. For both ends, use a `deque`.

Strings are array-like in Python too, but **immutable**: `s += "x"` makes a new string every time, so accumulating a string in a loop is $O(n^2)$. Collect the pieces in a `list` and `"".join` at the end.

## Sets and maps: set / dict

The book's `set` is a balanced tree and its `unordered_set` a hash table; Python's `set` and `dict` come in one flavour only, the hash table: insert, lookup and delete average $O(1)$, with **no order**. The book's reminders carry over:

- Elements are distinct. `s.add(5)` three times and `5 in s` is still one element; to count, use `collections.Counter` (roughly the book's `multiset`).
- A `dict` is "an array whose index can be anything": `m["banana"] = 3`. The book notes that C++'s `m["aybabtu"]` silently inserts a default value; Python's `dict` raises `KeyError` on a miss, and `defaultdict(int)` gives you the C++ behaviour.
- Since 3.7 a `dict` preserves **insertion order** — which is not sorted order. Don't use it as an ordered set.

```python
seen = set()
seen.add(3); seen.add(2); seen.add(5)
3 in seen                     # True, O(1) on average
seen.discard(3)               # no error if absent

from collections import Counter, defaultdict
cnt = Counter([5, 5, 5, 2])   # Counter({5: 3, 2: 1})
m = defaultdict(int)
m["aybabtu"] += 1             # starts from 0 if absent
```

### The fine print on "O(1) on average"

A hash table's $O(1)$ is an average, and it assumes the keys' hashes spread out. Two things break that:

- **Adversarial input.** Not in the book, but famous in contest circles: on Codeforces people craft test data that drives every key of a C++ `unordered_map` into the same bucket, turning $O(1)$ into $O(n)$. Python's `int` hashes to itself (`hash(5) == 5`), so the same construction works; `str` hashes are randomized per process, which makes them harder to attack. CSES test data isn't adversarial, so this won't bite you there — Production will; see the "at work" section below.
- **Constants.** Every lookup hashes the key, finds the bucket and compares; that's far more than an array index. Which is exactly the subject of the book's experiment at the end.

### The column Python doesn't have: the balanced tree

The book spends a lot of pages on `set` iterators, `lower_bound` and `upper_bound` — finding "the smallest element $\ge x$" or "the element nearest to $x$" in an ordered set. Python's `set` can't do any of it, because it has no order. Three routes:

| Approach | When |
|---|---|
| sorted `list` + `bisect` | The set is built and then **rarely changes**; afterwards you only query: `bisect_left` is `lower_bound`, $O(\log n)$; but inserting mid-way is $O(n)$ |
| `heapq` | You only ever need "the smallest one": `heappush` / `heappop` are $O(\log n)$, `h[0]` peeks at the minimum in $O(1)$; but arbitrary lookup and neighbours are out |
| `sortedcontainers.SortedList` | You need a full ordered set (insert, delete, neighbours all $O(\log n)$). Third-party: the CSES judge doesn't have it, so not in contests; fine in your own projects |

The book's "nearest element to $x$" snippet, written with `bisect`:

```python
from bisect import bisect_left
def nearest(sorted_list, x):
    k = bisect_left(sorted_list, x)        # first position with value >= x
    if k == 0:
        return sorted_list[0]
    if k == len(sorted_list):
        return sorted_list[-1]
    a, b = sorted_list[k - 1], sorted_list[k]
    return a if x - a < b - x else b
```

When a contest problem wants "insert while finding neighbours", the standard Python move usually isn't to simulate a balanced tree — it's to **switch to an approach that doesn't need one**: process offline, sort first, or rewrite around `heapq`. That is itself a form of reading structure.

## The other structures

- **`deque`** (`collections.deque`): $O(1)$ insert and remove at both ends; the book says it's a bit slower than a `vector` but fast at either end. Python's `deque` is a doubly linked list of blocks underneath, so **indexing into the middle is $O(n)$** — it's a queue, not an array. For a stack use a plain `list` (`append` / `pop`); for a queue use `deque` (`append` / `popleft`).
- **Priority queue** (`heapq`): the book notes it overlaps with what an ordered set can do but has much smaller constants, because a heap is far simpler than a balanced tree. Python only has a min-heap; for a max-heap, push negated values. Insert and pop are $O(\log n)$, peeking at the minimum is $O(1)$.
- **Bit set** (`bitset`): Python has no `bitset`, but an `int` has no bit limit and works as a bit array directly: `s |= 1 << k` sets a bit, `s >> k & 1` reads one, `bin(s).count("1")` or `s.bit_count()` (3.10+) counts the ones, and `&` / `|` / `^` do intersection, union and symmetric difference on the whole set at once. Part 9, on bit manipulation, is all about this.

```python
from collections import deque
import heapq

q = deque([5, 2]); q.appendleft(3); q.pop(); q.popleft()   # [5]

h = []
for x in [3, 5, 7, 2]:
    heapq.heappush(h, x)
heapq.heappop(h)             # 2, the smallest comes out first
heapq.heappush(h, -6)        # want "largest first"? store negatives

s = 0
for k in [1, 3, 4, 7]:
    s |= 1 << k              # bitset 0010011010
s.bit_count()                # 4
```

The book closes with g++'s `indexed_set` (the $k$-th smallest, and the rank of a value, both $O(\log n)$). Python has no equivalent; for rank queries, the Fenwick tree in part 8 does the job.

## The book's experiment: data structures versus sorting

This is the part of the chapter most worth remembering. The problem: two lists $A$ and $B$ of length $n$; count the elements they have in common. The book compares three approaches:

1. Put $A$ into a balanced-tree `set`, scan $B$ and look each element up: $O(n \log n)$.
2. Same, but with a hash `unordered_set`: $O(n)$.
3. No data structure: sort $A$ and $B$, walk both with two pointers: $O(n \log n)$.

| $n$ | 1. tree set | 2. hash set | 3. sort + two pointers |
|---|---|---|---|
| $10^6$ | 1.5 s | 0.3 s | 0.2 s |
| $2 \cdot 10^6$ | 3.7 s | 0.8 s | 0.3 s |
| $3 \cdot 10^6$ | 5.7 s | 1.3 s | 0.5 s |
| $4 \cdot 10^6$ | 7.7 s | 1.7 s | 0.7 s |
| $5 \cdot 10^6$ | 10.0 s | 2.3 s | 0.9 s |

Approaches 1 and 3 have identical complexity, both $O(n \log n)$, **and 3 is ten times faster**; even the $O(n)$ hash version loses to it by a factor of two. The book's explanation: sorting is a simple procedure done once at the start, and everything after it is a linear scan; the balanced tree is a complex structure being maintained the whole time. The hash table does better, but every lookup still hashes, finds a bucket and compares.

The animation below runs approaches 2 and 3 one after the other. Count the steps and the two come out about the same — which is the point: **complexity can't see the difference; the difference is the price of a step.** A two-pointer step is one comparison and one increment.

<div data-algo="common-elements" data-input="5, 2, 8, 9 | 3, 2, 9, 5"><p>(This is an interactive animation and needs JavaScript. The book's example: A = [5, 2, 8, 9], B = [3, 2, 9, 5], 3 elements in common.)</p></div>

Python's numbers won't match the book's — Python's `set` is implemented in C, and so is `sort`; to really compare, you'd have to measure. But the book's conclusion holds in Python too: for "find duplicates, find pairs, intersect" problems, **sorting and scanning once** is usually faster and leaner than dumping everything into a `set` — an array is contiguous and cache-friendly; every element of a `set` is an object scattered somewhere in memory.

## What got wasted

This chapter has no "brute force → fast" ladder; it's about a different kind of waste: **with the wrong container, every step pays a price you didn't need to pay.**

- `x in v` on a `list`: a linear $O(n)$ scan every time — you wanted hashing, or a sort first.
- `list.insert(0, x)` as a queue: the whole array shifts every time — you wanted a `deque`.
- A `set` to track "the current minimum": `min(s)` is $O(n)$ every time — you wanted `heapq`.
- And the reverse: a `set` to check "do these have anything in common", queried once: $O(1)$ average, sure, but one sort plus a linear scan is cheaper.

The structure tag here is an extension of [order]: **whether the data has an order, and whether you need one**, decides which column you're in.

## Where this shows up at work

- **"Which operations are cheap" is the storage-engine question.** [[redis-data-structures|Redis]]'s Sorted Set is the "balanced tree" column (a skip list underneath, the same $O(\log n)$ ordered structure): range queries, ranks and neighbours are all cheap; its Hash is the "set / dict" column. A database's B-tree index is ordered and a hash index isn't — [[sql-index|the post on indexes]] and its "does a range query hit the index" is this table's "first $\ge x$" row.
- **Hash degradation is real in Production.** Adversarial keys — attacker-controlled query strings, JSON field names — once pushed web frameworks in several languages into $O(n^2)$ (the 2011 hash-flooding attacks). Python has randomized `str` hashes since 3.3 for exactly this reason. When you reach for a `dict`, spare a thought for who supplies the keys.
- **Sort, then scan, is the default posture for batch processing.** [[ddia-batch|MapReduce's shuffle]] is sorting the data before handing it to reducers, and a sort-merge join is the book's approach 3 scaled out to a thousand machines. For one pass over a large batch, "sort it and scan it" is almost always cheaper than "build a structure and look things up one at a time".

## Reflections

### The balanced-tree column

The one data structure I've built myself at work was a local prefix search over phrases on mobile, on a compressed trie. The question there was exactly this table's question: the operation I needed was "given a prefix, return every phrase that starts with it" — a `dict` can't (no order), a sorted `list` can but has to scan a run, and a trie is built for precisely that operation. The details wait for part 24.

This chapter left me a little more wary of Python: **the standard library has no balanced tree**, and writing backends you barely notice, because that column's work is handed to the database's index. Solving problems, it surfaces at once — the problem a C++ contestant closes with one line of `set`, Python has to approach differently. But approaching it differently is the very thing this series is practising.
