---
title: "Read n, and You Know What to Write: Time Complexity and the Maximum Subarray Sum"
date: 2026-10-09
category: tech
description: "Opening a new series on the CSES Competitive Programmer's Handbook. Part one covers two things: a one-second time limit is a few hundred million operations, so the n a problem gives you already says which complexity it wants; and the three solutions to the maximum subarray sum, from O(n³) down to O(n) — every speed-up reclaims something the brute-force solution wasted. With animations you can step through yourself."
tags:
  - algorithms
  - cphb
  - complexity
  - book-notes
series: "Competitive Programmer's Handbook — Reading Notes"
seriesOrder: 1
comments: true
draft: false
translationOf: cphb-complexity
---
A new series: reading Antti Laaksonen's *Competitive Programmer's Handbook* (CPHB). It's the companion text to the [CSES Problem Set](https://cses.fi/problemset/), the PDF is free online, and its thirty chapters run from complexity all the way to geometry — thin, dense, no filler.

There is no shortage of CPHB notes and solutions on the web. This series tries to do three things differently:

1. **Every post starts from the brute-force solution and asks what it wastes.** A faster algorithm is almost always one that noticed a structure the brute-force solution never used. That's the thread running through the whole series.
2. **Every post has an animation you can drive yourself.** Step forward, step back, change the input and rerun. A static picture can only give you the conclusion; an animation lets you see exactly where a step gets saved.
3. **Every post has a section called "where this shows up at work"**, tying the contest technique back to Production — when it connects, and saying so plainly when it doesn't.

Part one is the foundation of the whole book: **time complexity**, and the classic problem the book uses to show it — the **maximum subarray sum**.

## How much can you do in one second

Time complexity is the tool for estimating how fast an algorithm is: write the number of basic operations as a function of the input size $n$, keep only the largest term, ignore constants.

The estimate rests on a single number: **a modern computer does a few hundred million basic operations per second.** With that number you can judge a solution before writing it. One-second limit, $n = 10^5$, and the approach you have in mind is $O(n^2)$ — that's $10^{10}$ operations, tens of seconds. **You know it won't work before writing a line.**

Run it the other way and it's even more useful: **read $n$, and you can infer the complexity the problem wants.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 314" role="img" aria-label="A one-second time limit is roughly a few hundred million basic operations, so the input size n tells you which complexity is acceptable: n up to 10 allows O(n!), trying every permutation; n up to 20 allows O(2 to the n), trying every subset; n up to 500 allows O(n cubed), three nested loops; n up to 5000 allows O(n squared), two loops over every pair; n up to 10 to the 6 needs O(n log n) or O(n), a sort or a single pass; a very large n leaves only O(log n) or O(1). Every row lands around a hundred million operations. For example, n equal to 10 to the 5 with an O(n squared) algorithm is 10 to the 10 operations, tens of seconds." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="300" y="22" fill="#e6e6e6" font-size="13" font-weight="bold" text-anchor="middle">1-second limit ≈ a few hundred million ops: read n, infer the complexity</text>
    <text x="28" y="48" fill="#9aa4b2" font-size="11" text-anchor="start">input size n</text>
    <text x="150" y="48" fill="#9aa4b2" font-size="11" text-anchor="start">acceptable complexity</text>
    <text x="320" y="48" fill="#9aa4b2" font-size="11" text-anchor="start">typical approach</text>
    <text x="580" y="48" fill="#9aa4b2" font-size="11" text-anchor="end">operations</text>
    <rect x="16" y="58" width="568" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="28" y="78" fill="#d6a45c" font-size="13" font-weight="bold">n ≤ 10</text>
    <text x="150" y="78" fill="#e6e6e6" font-size="13" font-weight="bold">O(n!)</text>
    <text x="320" y="78" fill="#9aa4b2" font-size="12">try every permutation</text>
    <text x="576" y="78" fill="#9aa4b2" font-size="11.5" text-anchor="end">10! ≈ 3.6×10⁶</text>
    <rect x="16" y="92" width="568" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="28" y="112" fill="#d6a45c" font-size="13" font-weight="bold">n ≤ 20</text>
    <text x="150" y="112" fill="#e6e6e6" font-size="13" font-weight="bold">O(2ⁿ)</text>
    <text x="320" y="112" fill="#9aa4b2" font-size="12">try every subset</text>
    <text x="576" y="112" fill="#9aa4b2" font-size="11.5" text-anchor="end">2²⁰ ≈ 10⁶</text>
    <rect x="16" y="126" width="568" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="28" y="146" fill="#d6a45c" font-size="13" font-weight="bold">n ≤ 500</text>
    <text x="150" y="146" fill="#e6e6e6" font-size="13" font-weight="bold">O(n³)</text>
    <text x="320" y="146" fill="#9aa4b2" font-size="12">three nested loops</text>
    <text x="576" y="146" fill="#9aa4b2" font-size="11.5" text-anchor="end">500³ ≈ 1.3×10⁸</text>
    <rect x="16" y="160" width="568" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="28" y="180" fill="#d6a45c" font-size="13" font-weight="bold">n ≤ 5000</text>
    <text x="150" y="180" fill="#e6e6e6" font-size="13" font-weight="bold">O(n²)</text>
    <text x="320" y="180" fill="#9aa4b2" font-size="12">two loops, every pair</text>
    <text x="576" y="180" fill="#9aa4b2" font-size="11.5" text-anchor="end">5000² = 2.5×10⁷</text>
    <rect x="16" y="194" width="568" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="28" y="214" fill="#d6a45c" font-size="13" font-weight="bold">n ≤ 10⁶</text>
    <text x="150" y="214" fill="#e6e6e6" font-size="13" font-weight="bold">O(n log n) or O(n)</text>
    <text x="320" y="214" fill="#9aa4b2" font-size="12">sort, or one pass</text>
    <text x="576" y="214" fill="#9aa4b2" font-size="11.5" text-anchor="end">10⁶×20 = 2×10⁷</text>
    <rect x="16" y="228" width="568" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="28" y="248" fill="#d6a45c" font-size="13" font-weight="bold">n is large</text>
    <text x="150" y="248" fill="#e6e6e6" font-size="13" font-weight="bold">O(log n) or O(1)</text>
    <text x="320" y="248" fill="#9aa4b2" font-size="12">binary search, a formula</text>
    <text x="576" y="248" fill="#9aa4b2" font-size="11.5" text-anchor="end">—</text>
    <rect x="16" y="270" width="568" height="30" rx="5" fill="#3a2626" stroke="#dc4c3f" stroke-width="1"/>
    <text x="300" y="290" fill="#e6e6e6" font-size="12" text-anchor="middle">e.g. n = 10⁵ with O(n²) → 10¹⁰ ops, tens of seconds — known before writing a line</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Every row lands around 10⁷–10⁸ operations — that is where the limits in the table come from. The n a problem gives you is telling you roughly what the answer looks like. (Table after Ch2, “Estimating efficiency”, of the book.)</figcaption>
</figure>

This table is the first thing a contestant does with a problem. An $n \le 20$ is a hint that "you may enumerate subsets"; an $n \le 10^6$ says "sort or scan — and those are the only two roads". It rules out half the ideas on the spot.

But keep the book's own caveat in mind: **complexity is only an estimate, and it hides the constants.** Two $O(n)$ algorithms can do $n/2$ operations or $5n$ — a tenfold difference once you run them.

### How to work out the complexity

The calculation rules from the book's Ch2 boil down to four:

| Shape of the code | Complexity | Example |
|---|---|---|
| $k$ nested loops, each running $n$ times | $O(n^k)$ | two loops comparing every pair → $O(n^2)$ |
| Several blocks **one after another** | the slowest block wins | $O(n) + O(n^2) + O(n)$ → $O(n^2)$ |
| Two input sizes | write both | outer loop over $n$, inner over $m$ → $O(nm)$ |
| Recursion | number of calls × cost per call | calls itself once, $n$ levels deep → $O(n)$; calls itself twice → $O(2^n)$ |

## The example: maximum subarray sum

Given an array, find the **contiguous run with the largest sum**. The book's example:

$$[-1,\ 2,\ 4,\ -3,\ 5,\ 2,\ -5,\ 2]$$

The answer is 10, from $[2, 4, -3, 5, 2]$ — you swallow the $-3$ in the middle because the two sides together outweigh it. The problem is only interesting because the array has negatives. The book allows the empty subarray, so the answer is at least 0.

There are three solutions, at $O(n^3)$, $O(n^2)$ and $O(n)$. All three are looking at the same object: **every subarray, laid out as a triangle.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 272" role="img" aria-label="Every subarray of the array 2, -3, 4, -1, 2 laid out as a triangle, where row a column b stands for array[a..b]. Algorithm 1 is O(n cubed): each cell is summed from scratch, the number in the cell is how many additions that cell costs, 35 in total. Algorithm 2 is O(n squared): moving right along a row reuses the previous cell’s sum, one addition per cell, the cell shows the range sum, 15 in total. Algorithm 3 is Kadane, O(n): each column keeps only the cell with the best sum ending at b, which either extends the cell kept in the previous column or restarts from itself, 5 additions in total; the largest is 5, array[2..4]." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="100" y="18" fill="#d6a45c" font-size="12.5" font-weight="bold" text-anchor="middle">Algorithm 1 · O(n³)</text>
    <text x="100" y="34" fill="#9aa4b2" font-size="11" text-anchor="middle">35 additions</text>
    <text x="40" y="64" fill="#9aa4b2" font-size="9.5" text-anchor="end">b →</text>
    <text x="60.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">2</text>
    <text x="88.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">-3</text>
    <text x="116.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">4</text>
    <text x="144.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">-1</text>
    <text x="172.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">2</text>
    <text x="40" y="50" fill="#9aa4b2" font-size="9.5" text-anchor="end">array</text>
    <text x="40" y="90.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=0</text>
    <text x="40" y="118.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=1</text>
    <text x="40" y="146.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=2</text>
    <text x="40" y="174.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=3</text>
    <text x="40" y="202.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=4</text>
    <rect x="47" y="73" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="60.0" y="90.0" fill="#d6a45c" font-size="11" text-anchor="middle">1</text>
    <rect x="75" y="73" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="88.0" y="90.0" fill="#d6a45c" font-size="11" text-anchor="middle">2</text>
    <rect x="103" y="73" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="116.0" y="90.0" fill="#d6a45c" font-size="11" text-anchor="middle">3</text>
    <rect x="131" y="73" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="144.0" y="90.0" fill="#d6a45c" font-size="11" text-anchor="middle">4</text>
    <rect x="159" y="73" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="172.0" y="90.0" fill="#d6a45c" font-size="11" text-anchor="middle">5</text>
    <rect x="75" y="101" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="88.0" y="118.0" fill="#d6a45c" font-size="11" text-anchor="middle">1</text>
    <rect x="103" y="101" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="116.0" y="118.0" fill="#d6a45c" font-size="11" text-anchor="middle">2</text>
    <rect x="131" y="101" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="144.0" y="118.0" fill="#d6a45c" font-size="11" text-anchor="middle">3</text>
    <rect x="159" y="101" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="172.0" y="118.0" fill="#d6a45c" font-size="11" text-anchor="middle">4</text>
    <rect x="103" y="129" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="116.0" y="146.0" fill="#d6a45c" font-size="11" text-anchor="middle">1</text>
    <rect x="131" y="129" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="144.0" y="146.0" fill="#d6a45c" font-size="11" text-anchor="middle">2</text>
    <rect x="159" y="129" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="172.0" y="146.0" fill="#d6a45c" font-size="11" text-anchor="middle">3</text>
    <rect x="131" y="157" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="144.0" y="174.0" fill="#d6a45c" font-size="11" text-anchor="middle">1</text>
    <rect x="159" y="157" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="172.0" y="174.0" fill="#d6a45c" font-size="11" text-anchor="middle">2</text>
    <rect x="159" y="185" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="172.0" y="202.0" fill="#d6a45c" font-size="11" text-anchor="middle">1</text>
    <text x="100" y="234" fill="#9aa4b2" font-size="11" text-anchor="middle">each cell from scratch</text>
    <text x="300" y="18" fill="#4f6df5" font-size="12.5" font-weight="bold" text-anchor="middle">Algorithm 2 · O(n²)</text>
    <text x="300" y="34" fill="#9aa4b2" font-size="11" text-anchor="middle">15 additions</text>
    <text x="240" y="64" fill="#9aa4b2" font-size="9.5" text-anchor="end">b →</text>
    <text x="260.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">2</text>
    <text x="288.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">-3</text>
    <text x="316.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">4</text>
    <text x="344.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">-1</text>
    <text x="372.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">2</text>
    <text x="240" y="50" fill="#9aa4b2" font-size="9.5" text-anchor="end">array</text>
    <text x="240" y="90.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=0</text>
    <text x="240" y="118.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=1</text>
    <text x="240" y="146.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=2</text>
    <text x="240" y="174.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=3</text>
    <text x="240" y="202.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=4</text>
    <rect x="247" y="73" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="260.0" y="90.0" fill="#e6e6e6" font-size="11" text-anchor="middle">2</text>
    <rect x="275" y="73" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="288.0" y="90.0" fill="#e6e6e6" font-size="11" text-anchor="middle">-1</text>
    <rect x="303" y="73" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="316.0" y="90.0" fill="#e6e6e6" font-size="11" text-anchor="middle">3</text>
    <rect x="331" y="73" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="344.0" y="90.0" fill="#e6e6e6" font-size="11" text-anchor="middle">2</text>
    <rect x="359" y="73" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="372.0" y="90.0" fill="#e6e6e6" font-size="11" text-anchor="middle">4</text>
    <rect x="275" y="101" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="288.0" y="118.0" fill="#e6e6e6" font-size="11" text-anchor="middle">-3</text>
    <rect x="303" y="101" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="316.0" y="118.0" fill="#e6e6e6" font-size="11" text-anchor="middle">1</text>
    <rect x="331" y="101" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="344.0" y="118.0" fill="#e6e6e6" font-size="11" text-anchor="middle">0</text>
    <rect x="359" y="101" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="372.0" y="118.0" fill="#e6e6e6" font-size="11" text-anchor="middle">2</text>
    <rect x="303" y="129" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="316.0" y="146.0" fill="#e6e6e6" font-size="11" text-anchor="middle">4</text>
    <rect x="331" y="129" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="344.0" y="146.0" fill="#e6e6e6" font-size="11" text-anchor="middle">3</text>
    <rect x="359" y="129" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="372.0" y="146.0" fill="#e6e6e6" font-size="11" text-anchor="middle">5</text>
    <rect x="331" y="157" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="344.0" y="174.0" fill="#e6e6e6" font-size="11" text-anchor="middle">-1</text>
    <rect x="359" y="157" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="372.0" y="174.0" fill="#e6e6e6" font-size="11" text-anchor="middle">1</text>
    <rect x="359" y="185" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="372.0" y="202.0" fill="#e6e6e6" font-size="11" text-anchor="middle">2</text>
    <text x="300" y="234" fill="#9aa4b2" font-size="11" text-anchor="middle">extend along the row</text>
    <text x="500" y="18" fill="#54b890" font-size="12.5" font-weight="bold" text-anchor="middle">Algorithm 3 · O(n)</text>
    <text x="500" y="34" fill="#9aa4b2" font-size="11" text-anchor="middle">5 additions</text>
    <text x="440" y="64" fill="#9aa4b2" font-size="9.5" text-anchor="end">b →</text>
    <text x="460.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">2</text>
    <text x="488.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">-3</text>
    <text x="516.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">4</text>
    <text x="544.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">-1</text>
    <text x="572.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">2</text>
    <text x="440" y="50" fill="#9aa4b2" font-size="9.5" text-anchor="end">array</text>
    <text x="440" y="90.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=0</text>
    <text x="440" y="118.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=1</text>
    <text x="440" y="146.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=2</text>
    <text x="440" y="174.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=3</text>
    <text x="440" y="202.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=4</text>
    <rect x="447" y="73" width="26" height="26" rx="3" fill="#223528" stroke="#54b890" stroke-width="1.6"/>
    <text x="460.0" y="90.0" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">2</text>
    <rect x="475" y="73" width="26" height="26" rx="3" fill="#223528" stroke="#54b890" stroke-width="1.6"/>
    <text x="488.0" y="90.0" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">-1</text>
    <rect x="503" y="73" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="531" y="73" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="559" y="73" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="475" y="101" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="503" y="101" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="531" y="101" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="559" y="101" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="503" y="129" width="26" height="26" rx="3" fill="#223528" stroke="#54b890" stroke-width="1.6"/>
    <text x="516.0" y="146.0" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">4</text>
    <rect x="531" y="129" width="26" height="26" rx="3" fill="#223528" stroke="#54b890" stroke-width="1.6"/>
    <text x="544.0" y="146.0" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">3</text>
    <rect x="559" y="129" width="26" height="26" rx="3" fill="#223528" stroke="#54b890" stroke-width="1.6"/>
    <text x="572.0" y="146.0" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">5</text>
    <rect x="531" y="157" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="559" y="157" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="559" y="185" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <text x="500" y="234" fill="#9aa4b2" font-size="11" text-anchor="middle">keep one cell per column</text>
    <text x="300" y="262" fill="#e6e6e6" font-size="11" text-anchor="middle">Row a, column b = sum of array[a..b]. Same triangle for all three; they differ in what they waste.</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">From 1 to 2 the thing reclaimed is “array[a..b] = array[a..b−1] + array[b]”; from 2 to 3 it is “a column only needs its best starting point”. Green cells in a run along one row = extending the cell kept in the previous column; a jump to another row = the running sum went negative, so start over here.</figcaption>
</figure>

### Algorithm 1: O(n³), each range summed from scratch

The most direct approach: fix the two ends `a` and `b`, then use a third loop to add up `array[a..b]`.

```cpp
int best = 0;
for (int a = 0; a < n; a++) {
    for (int b = a; b < n; b++) {
        int sum = 0;
        for (int k = a; k <= b; k++) {
            sum += array[k];
        }
        best = max(best, sum);
    }
}
```

**What it wastes**: when it computes `array[0..3]`, it had `array[0..2]` a moment ago — and throws that sum away to add everything up again.

### Algorithm 2: O(n²), extend along the row

Reclaim what was just thrown away: $\text{sum}(a..b) = \text{sum}(a..b-1) + \text{array}[b]$. Every time the right end moves one cell, add one number. The third loop disappears.

```cpp
int best = 0;
for (int a = 0; a < n; a++) {
    int sum = 0;
    for (int b = a; b < n; b++) {
        sum += array[b];
        best = max(best, sum);
    }
}
```

**What it still wastes**: it visits **every cell** in the triangle. But for a given right end `b`, all we care about is "the best sum that ends at `b`" — the other starting points don't need a look.

### Algorithm 3: O(n), Kadane

Ask a different question: **what is the maximum subarray sum ending at position $k$?** There are only two possibilities:

1. the subarray is `array[k]` alone;
2. it's some subarray ending at $k-1$, followed by `array[k]` — and since we want the maximum, that subarray had better be the best one ending at $k-1$.

So each cell only needs a comparison against the previous cell's answer:

```cpp
int best = 0, sum = 0;
for (int k = 0; k < n; k++) {
    sum = max(array[k], sum + array[k]);
    best = max(best, sum);
}
```

`sum` is "the best sum ending at $k$"; `best` is the largest one seen so far. One loop, $O(n)$. It's also the best possible — any solution has to look at every element at least once. (The algorithm became famous through Jon Bentley's *Programming Pearls*, which credits it to J. B. Kadane.)

### Run it yourself: brute force versus Kadane

Below, Algorithm 2 and Kadane run side by side, **on the same clock — each step is one addition on each side**. Step through with "→" or hit play; swap in your own array, or hit "Random".

<div data-algo="max-subarray-race" data-input="-1, 2, 4, -3, 5, 2, -5, 2"><p>(This is an interactive animation and needs JavaScript. Both sides answer 10: the O(n²) brute force does 36 additions, Kadane does 8.)</p></div>

At $n = 8$ it's 36 against 8, which doesn't look like much. But brute force costs $n(n+1)/2$ additions — about $5 \times 10^9$ at $n = 10^5$. Kadane is still $10^5$.

If you want to see slowly why Kadane is right, the one below runs Kadane alone, with each cell split into two steps: first "extend or start over", then "update best or not". Watch the cell right after `sum` goes negative — that's the moment "the running sum is negative, so adding to it only makes things worse".

<div data-algo="kadane" data-input="-1, 2, 4, -3, 5, 2, -5, 2"><p>(This is an interactive animation and needs JavaScript.)</p></div>

### The book's measurements

The book ran random inputs on one machine (input-reading time excluded):

| $n$ | Algorithm 1 $O(n^3)$ | Algorithm 2 $O(n^2)$ | Algorithm 3 $O(n)$ |
|---|---|---|---|
| $10^2$ | 0.0 s | 0.0 s | 0.0 s |
| $10^3$ | 0.1 s | 0.0 s | 0.0 s |
| $10^4$ | > 10.0 s | 0.1 s | 0.0 s |
| $10^5$ | > 10.0 s | 5.3 s | 0.0 s |
| $10^6$ | > 10.0 s | > 10.0 s | 0.0 s |
| $10^7$ | > 10.0 s | > 10.0 s | 0.0 s |

At small $n$ all three are equally fast — **the gap in complexity only shows itself once $n$ grows.** Which is exactly why small test data never catches a performance problem.

### What got wasted

Line the three up and every speed-up is one piece of waste reclaimed:

- **1 → 2**: adjacent ranges differ by one number; don't recompute.
- **2 → 3**: a given right end only needs its best starting point; don't look at the others.

Both reclaim the same kind of structure — **the answer to a subproblem can be reused**. This series tags it **[overlap]**, and part 6, dynamic programming, turns that one observation into a whole method.

## Where this shows up at work

- **Estimate before you write.** A batch job that compares "every pair" is one second on a thousand rows and several days on ten million. The same table applies inside SQL: a self-join with no equality condition is two nested loops, and [[sql-explain|reading the execution plan]] is really reading the complexity.
- **Constants bite.** The constant that complexity hides is, in Production, very often a network round trip. A loop that hits the database once per iteration is still $O(n)$, and several orders of magnitude slower than one query that brings everything back — complexity can't see that gap; you have to measure it.
- **Checking someone else's solution.** An AI will hand you an accepted solution in no time; whether it times out at $n = 10^5$ is the reviewer's question to answer. Holding the problem's $n$ against the table above is the cheapest first check there is: no need to run anything, and you already have evidence for whether it passes. That's [[ai-review-craft|the craft of reviewing AI code]], applied to algorithms.

## Practice

- CSES [Maximum Subarray Sum](https://cses.fi/problemset/task/1643): note that CSES requires a **non-empty** subarray. When every element is negative the answer is the largest negative, not 0 — so `best` can't start at 0.

## Reflections

### Where I stand relative to competitions

Let me be clear about where I'm coming from: I have no real competition background — I didn't come up through IOI or ICPC. What I have is LeetCode: around 1,500 problems solved over the years, and one weekly contest where I finished in the top 50. So this isn't "a contestant teaches you to grind"; it's someone who solved a lot of problems and then spent many years building backends, going back to reread this book and see what actually stuck.

What stuck the most is exactly what this post is about: **see the size of the data, and run the numbers in your head first.** Nothing deep about it, but it's the one I use every single day.

### What I use most at work is estimation

Day-to-day development rarely calls for writing an algorithm yourself — sorting, hash tables, indexes, the language and the database have them covered. But "will this computation finish?" comes up every day, and the answer almost always starts from **how many rows the table has**: this table is a few million rows today and tens of millions next year, this piece of logic scans it so many times, and does it pair up against that other table — plug those numbers in and you know whether the approach takes seconds, minutes, or never finishes. The thinking behind the table above holds just as well with row counts in place of $n$.

The one time I did implement an algorithm myself at work was a local prefix search over phrases on mobile, built on a compressed trie. That story waits for part 24, on strings; the point here is that the first question that project had to answer is the same one as this post's — **how big is the data, how much time does each query get, and therefore which structure can we afford.**

### What I look for as an interviewer

When I set algorithm questions as an interviewer, they're not hard ones; most candidates solve them. Because what I'm looking at isn't "did they solve it" but the details of how they got there: how they discuss the problem with me, how they pin down the conditions, how they interact when they get stuck, and whether what they write has taste. A problem nobody can solve shows me none of that.

It's the same thing as the table above: the problem itself isn't the point — **the reaction right after seeing $n$ is.** Do you pause, work out what this size allows, and only then start typing? That reaction is visible in an interview, and even more visible at work.
