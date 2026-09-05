---
title: "Effective Troubleshooting: Debugging Is a Method, Not a Talent"
date: 2026-07-12
category: tech
description: "Expert debugging looks like magic; it isn't — they simply have a systematic method for closing in on the answer. This post takes apart SRE's troubleshooting process: mitigate first, then observe, then diagnose by \"hypothesise → test → eliminate\", with the sharpest weapon being divide and conquer (bisecting along the request path). Plus a few iron rules: change one variable at a time, trust data over intuition, ask \"what changed\"."
tags:
  - sre
  - incident
series: "Google SRE — Reading Notes"
seriesOrder: 6
comments: true
draft: false
translationOf: sre-troubleshooting
---
[[sre-alerting-oncall|The previous post]] said on-call stops the bleeding first; but once the bleeding has stopped, you still have to find **why**. This post is about troubleshooting — and its single most important idea is: **debugging doesn't rely on talent or luck; it's a systematic method you can learn.** The difference between a beginner and a veteran isn't "knowing the answer" but **having a process that closes in on it**.

## Recognise the anti-patterns first: guessing and swapping parts

What does method-less debugging look like? **Changing things at random to see if it gets better** (part-swapping debugging), **checking only the places you know**, **changing a pile of settings at once**, **being led by the nose by "something was touched recently, I think"**. These don't work because they aren't **narrowing the problem** — you're just gambling: lucky and you stumble on it, unlucky and you make it worse, and afterwards you have no idea what actually fixed it (because you changed too much at once).

## The systematic troubleshooting process

Debugging with a method is an ordered loop:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 210" role="img" aria-label="Four steps of systematic troubleshooting: Triage, mitigate and keep the system alive first; Examine, look at monitoring, logs and the golden signals; Diagnose, hypothesise, test and eliminate; Treat, fix one variable at a time and reversibly. If it isn't fixed, go back from Treat to Diagnose and hypothesise again. The anti-patterns are guessing, randomly swapping parts, and changing many variables at once." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="ts" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="18" y="58" width="120" height="58" rx="7" fill="#3a2626" stroke="#e0733a" stroke-width="1.5"/>
    <text x="78" y="80" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">① Triage</text>
    <text x="78" y="96" fill="#9aa4b2" font-size="8" text-anchor="middle">keep the system alive</text>
    <text x="78" y="107" fill="#9aa4b2" font-size="8" text-anchor="middle">(root cause can wait)</text>
    <rect x="158" y="58" width="120" height="58" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="218" y="80" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">② Examine</text>
    <text x="218" y="96" fill="#9aa4b2" font-size="8" text-anchor="middle">monitoring / logs</text>
    <text x="218" y="107" fill="#9aa4b2" font-size="8" text-anchor="middle">four golden signals</text>
    <rect x="298" y="58" width="120" height="58" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="358" y="80" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">③ Diagnose</text>
    <text x="358" y="96" fill="#9aa4b2" font-size="8" text-anchor="middle">hypothesise → test → eliminate</text>
    <text x="358" y="107" fill="#9aa4b2" font-size="8" text-anchor="middle">bisect to close in</text>
    <rect x="438" y="58" width="120" height="58" rx="7" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="498" y="80" fill="#d6a45c" font-size="10" text-anchor="middle" font-weight="bold">④ Treat</text>
    <text x="498" y="96" fill="#9aa4b2" font-size="8" text-anchor="middle">one variable at a time</text>
    <text x="498" y="107" fill="#9aa4b2" font-size="8" text-anchor="middle">reversibly</text>
    <line x1="138" y1="87" x2="156" y2="87" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ts)"/>
    <line x1="278" y1="87" x2="296" y2="87" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ts)"/>
    <line x1="418" y1="87" x2="436" y2="87" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ts)"/>
    <path d="M498,58 C498,34 358,34 358,56" fill="none" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="4 3" marker-end="url(#ts)"/>
    <text x="428" y="30" fill="#9aa4b2" font-size="8" text-anchor="middle">not fixed? new hypothesis</text>
    <text x="290" y="146" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Every step "narrows the range"; the anti-patterns (guessing, swapping parts, changing many things) never narrow, only gamble</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Mitigate first so users feel nothing, then examine the monitoring (four golden signals), then close in step by step with "hypothesise → test → eliminate", and finally fix carefully. The only difference from the anti-patterns: <b>every step narrows the problem's range</b></figcaption>
</figure>

Diagnosis (③) is the heart of the process, and its technique is one sentence: **form a hypothesis, find a way to confirm or refute it, and so eliminate part of the possibilities.** It's exactly binary search — every test cuts the suspect range in half.

## The core weapon: divide and conquer (bisection)

The sharpest move in diagnosis is **divide and conquer**: along the request path, don't blindly try segment by segment; **measure the middle first** — ask "is the problem before this point, or after?" and cut half away in one stroke:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 190" role="img" aria-label="Request path Client to LB to App to Cache to DB. Users report slowness; instead of blindly trying segment by segment, measure the middle at App first, decide whether the problem is before or after it, cut half away, and finally locate the slow DB." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="tp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="20" y="70" width="96" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="68" y="94" fill="#e6e6e6" font-size="9" text-anchor="middle">Client</text>
    <rect x="134" y="70" width="96" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="182" y="94" fill="#e6e6e6" font-size="9" text-anchor="middle">LB</text>
    <rect x="248" y="70" width="96" height="40" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="296" y="94" fill="#e6e6e6" font-size="9" text-anchor="middle">App</text>
    <rect x="362" y="70" width="96" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="410" y="94" fill="#e6e6e6" font-size="9" text-anchor="middle">Cache</text>
    <rect x="476" y="70" width="96" height="40" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.6"/><text x="524" y="90" fill="#e6e6e6" font-size="9" text-anchor="middle">DB</text><text x="524" y="102" fill="#e0733a" font-size="7.5" text-anchor="middle">slow ❌</text>
    <line x1="116" y1="90" x2="132" y2="90" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#tp)"/>
    <line x1="230" y1="90" x2="246" y2="90" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#tp)"/>
    <line x1="344" y1="90" x2="360" y2="90" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#tp)"/>
    <line x1="458" y1="90" x2="474" y2="90" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#tp)"/>
    <text x="296" y="52" fill="#4f6df5" font-size="8.5" text-anchor="middle">① measure the middle (App)</text>
    <line x1="296" y1="56" x2="296" y2="66" stroke="#4f6df5" stroke-width="1.2" stroke-dasharray="3 2"/>
    <path d="M320,64 C400,44 470,50 500,66" fill="none" stroke="#e0733a" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#tp)"/>
    <text x="430" y="44" fill="#e0733a" font-size="8.5" text-anchor="middle">② slow only after App → narrow to the back → DB</text>
    <text x="290" y="150" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Halve along the path each time → located in a few steps, not blind trials from the start</text>
    <text x="290" y="168" fill="#9aa4b2" font-size="8" text-anchor="middle">User report: slow. Don't guess "probably X" — measure, bisect</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Bisection turns "needle in a haystack" into "located in a few steps": measure the middle of the path, decide whether the problem is in the front half or the back, cut half away, repeat on what's left. The move works in any layered system</figcaption>
</figure>

## A few iron rules

Beyond the process, a few iron rules keep debugging from going astray:

- **Change one variable at a time**. Change three things at once and it works, and you'll never know which one fixed it, or whether the other two planted mines.
- **Trust data, not intuition**. Look at monitoring, logs, the [[sre-monitoring|golden signals]]; use data to **refute** hypotheses rather than intuition to **confirm** prejudices.
- **Ask "what changed"**. Most failures relate to "the most recent change" (a deploy, a config, traffic) — check the change log first and it's often solved in a second; but don't let it hijack you into looking nowhere else.
- **Record what you did**. It makes backtracking and handover easy, and it's the raw material for the postmortem (next post).

## Reflections

### Debugging is a method, not a talent

When I started out, I thought senior engineers debugged by some sixth sense — one glance and they knew where it was broken. Watching up close, I found it wasn't a sixth sense but **a steady method of closing in**: look at the data first, then hypothesise, then bisect to narrow. They didn't "know the answer"; they "had a way to force the answer out in a few steps". That realisation affected me a lot — it turned debugging from "mysticism that depends on inspiration" into "a skill that can be deliberately practised". It's also the first thing I teach new people: **don't rush to guess, look first; don't change things at random, narrow first.** With the right method, anyone can debug reliably.

### Bisection is the universal key to debugging

"Cut half away along the data flow each time" works wherever I use it. Its power is that **every step halves the problem space** — a ten-segment path is located in three or four steps, not by trying from one end to the other. Once it clicked, I noticed it's the same "shrink the search space" thinking I use [[sql-explain|reading SQL execution plans]] to find bottlenecks, narrowing problems in [[sql-gaps-islands|gaps and islands]], even finding bugs in code review. **Learning to bisect is worth more than memorising the fix for any particular bug**, because it applies to every problem you haven't met yet.

### "Trust data, not intuition" — look, don't guess

The greatest enemy of debugging is really the prejudice of "I think it's probably X". Prejudice is dangerous because it makes you **look only for evidence that supports it and automatically ignore contradicting clues**, so you dig ever deeper in the wrong direction. The value of a systematic process is that it forces you to **"look"** — at monitoring, at logs, at the execution plan — using facts to refute hypotheses rather than intuition to confirm them. It's the same belief I keep repeating in [[sre-monitoring|SLIs that track user experience]] and [[sql-explain|reading EXPLAIN instead of guessing]]: **let the facts speak.** What engineers most need to train isn't guessing accurately; it's the discipline of **holding back the guess and looking first**.
