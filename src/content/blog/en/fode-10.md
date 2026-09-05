---
title: "The Chapter That Matters Most and Gets Ignored Most: Security and Privacy, Reading Fundamentals of Data Engineering, Ch. 10"
date: 2026-07-05
category: tech
description: "The book puts security near the end, yet says it's the most important and most often ignored. This post takes apart Ch. 10 of Fundamentals of Data Engineering — security is a people problem, not a tool problem, and the reversal \"data is an asset and a liability\" that will change how you collect data."
tags:
  - data-engineering
  - book-notes
  - security
series: "Fundamentals of Data Engineering — Reading Notes"
seriesOrder: 10
comments: true
draft: false
translationOf: fode-10
---
Past [[fode-9|serving]], the lifecycle still has one **undercurrent running through the whole thing** that hasn't been covered on its own: **security and privacy**. The book places it near the end, yet says outright that it's **the most important, and most often ignored** chapter. And its most counter-intuitive opening line — **security is mainly a "people" problem, not a "tools" problem.**

## Lesson one: security is a people problem, not something you buy

Most data breaches aren't cryptography being broken; they're **human error and social engineering** — a phished account, a permission opened too wide, an export file put in the wrong place. So the foundation of security is **behaviour and culture**, not another security product. The book gives three principles:

- **Least privilege**: grant only just enough access, for just enough time. **Don't work as admin / root by default**, and don't let a service account hold powers it never uses.
- **Negative thinking**: think like an attacker. Assume every entry point will be probed and every sensitive record could leak, then go back and close the holes.
- **It's an ongoing habit, not a one-off project**. Security doesn't end when the pre-launch checklist is ticked; it's the default posture every day.

## The mental reversal: data is an asset, and a liability

Engineers habitually treat data as an **asset** — the more the better, collect first and ask later. This chapter forces you to add the other half: **every sensitive record you keep is also a liability.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="Sensitive data is both an asset and a liability: as an asset it brings the value of analytics, ML and decisions; as a liability it brings the risk of breaches, compliance fines, ransomware and collapsed trust. The conclusion: collect only what you must, and delete what should be deleted" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="se1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="232" y="92" width="116" height="56" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="290" y="115" fill="#e6e6e6" font-size="11.5" text-anchor="middle">sensitive data</text>
    <text x="290" y="133" fill="#9aa4b2" font-size="8.5" text-anchor="middle">PII · payments…</text>
    <text x="110" y="42" fill="#54b890" font-size="12" font-weight="bold" text-anchor="middle">as asset · value</text>
    <rect x="20" y="54" width="180" height="112" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="110" y="82" fill="#e6e6e6" font-size="10.5" text-anchor="middle">analytical insight</text>
    <text x="110" y="106" fill="#e6e6e6" font-size="10.5" text-anchor="middle">training ML models</text>
    <text x="110" y="130" fill="#e6e6e6" font-size="10.5" text-anchor="middle">supporting decisions</text>
    <text x="470" y="42" fill="#e06a5a" font-size="12" font-weight="bold" text-anchor="middle">as liability · risk</text>
    <rect x="380" y="54" width="180" height="112" rx="8" fill="#262b3a" stroke="#e06a5a" stroke-width="1.5"/>
    <text x="470" y="78" fill="#e6e6e6" font-size="10.5" text-anchor="middle">breaches</text>
    <text x="470" y="99" fill="#e6e6e6" font-size="10.5" text-anchor="middle">compliance fines</text>
    <text x="470" y="120" fill="#e6e6e6" font-size="10.5" text-anchor="middle">ransomware</text>
    <text x="470" y="141" fill="#e6e6e6" font-size="10.5" text-anchor="middle">collapsed trust</text>
    <line x1="232" y1="112" x2="202" y2="110" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#se1)"/>
    <line x1="348" y1="112" x2="378" y2="110" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#se1)"/>
    <text x="290" y="200" fill="#9aa4b2" font-size="10" text-anchor="middle">every sensitive record is both at once — so: collect only what you must, delete what you should</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Data isn't only an asset. Every sensitive record in your hands is a risk waiting to happen — that's the reason for data minimization: don't ask what you can collect, ask what you can't do without</figcaption>
</figure>

**"Collect first, ask later" is a dangerous default in this framework** — every record of PII you collect is the fuse of some future breach, some future fine. Collect less, keep less, and the risk shrinks by half.

## Core technical practices

Only once the mindset is right do tools come in. The book's basics:

| Practice | Key point |
|---|---|
| **Encryption** | Both in transit (TLS) and at rest; but **not a silver bullet** — whoever holds valid credentials still gets in |
| **Access control / IAM** | Role-based, least privilege; regularly review "who has what, and do they still need it" |
| **Logging / monitoring / auditing** | Traceable when something happens, anomalies visible in normal times; no logs means flying blind |
| **Defense in depth** | Don't bet on a single wall (see below) |

### Defense in depth: when one layer breaks, there's a next one

Security can't rest on a single point. **Defense in depth** wraps data in layer after layer, so that when any one is breached the next still holds:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 440 260" role="img" aria-label="The concentric layers of defense in depth: the outermost is monitoring and auditing, inside that access control and least privilege, inside that encryption, and at the core the data; when any layer is breached the next still holds" style="width:100%;max-width:480px;height:auto;margin:0 auto;">
    <rect x="30" y="30" width="380" height="200" rx="12" fill="none" stroke="#9aa4b2" stroke-width="1.4" stroke-dasharray="5 4"/>
    <text x="220" y="50" fill="#9aa4b2" font-size="11" text-anchor="middle">monitoring · auditing (logging / audit)</text>
    <rect x="80" y="72" width="280" height="116" rx="10" fill="none" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="220" y="91" fill="#4f6df5" font-size="11" font-weight="bold" text-anchor="middle">access control · least privilege (IAM)</text>
    <rect x="140" y="112" width="160" height="60" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="220" y="128" fill="#54b890" font-size="10.5" text-anchor="middle">encryption (in transit / at rest)</text>
    <rect x="180" y="136" width="80" height="30" rx="6" fill="#4f6df5" fill-opacity="0.2" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="220" y="155" fill="#e6e6e6" font-size="11" text-anchor="middle">data</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Wrap the data layer by layer so that a breach of any one still leaves the next; and the default at every layer is "least privilege" — only just enough access</figcaption>
</figure>

## Privacy and regulation: the legal version of data as a liability

"Data is a liability" isn't only a mindset now; it's **law**. Regulations like **GDPR and CCPA** have turned privacy into hard rules with painful fines. The concrete demands on data engineering:

- **PII has to be handled**: columns that should be masked, anonymized or tokenized shouldn't sit untouched across every table.
- **Data minimization + retention**: collect only what's necessary and delete on expiry — the same thing as [[fode-6|the retention in Ch. 6 on storage]], seen from the privacy angle. **The longer and more you keep, the bigger the compliance risk.**
- **The right to be forgotten**: regulation may require "delete everything about this person", and your architecture has to be able to do it.

In other words: **compliance isn't the legal department's job; it's an engineering decision that starts with how you build tables and set retention.**

## Reflections

### Security is "everyone's job", and least privilege is the only rule I'd follow without thinking

The line I felt most in this chapter is "security is a people problem". I've seen too many teams outsource security to "the security team" or a tool — and the holes were all in daily operations: a service account granted admin, real PII stuffed into test data, exported CSVs lying in a shared drive. No tool stops those; only **habit** does. And of all security principles, **least privilege** is the only one I'd say to follow "almost without thinking": grant the minimum by default, add when needed — the downside risk is near zero and the disasters it prevents are many. It's the exact opposite of my attitude to [[pain-before-power|tools]] — this one, just do it first.

### The "data is a liability" reversal cured my "collect first" habit

The engineer's instinct is the more data the better, and I was the same — collect every column, keep every log, "we might need it someday". This chapter's reversal broke me of it: **every sensitive record you keep is a liability waiting to go wrong.** Now the first question when I design a schema isn't "what can we collect" but "**what can't we do without**"; PII that needn't land doesn't land, what can be anonymized is, and what should expire gets retention that deletes it automatically. One record fewer is one future risk and one future fine fewer. It's the other face of [[fode-9|Ch. 9's trust]]: **only someone who protects data deserves to be handed it.**

### This chapter belongs last, but the mindset belongs first

Interestingly, the book places security at the end of the lifecycle and calls it an "undercurrent" — because it **isn't a stage, it's the underlying layer running through every stage**. From what the [[fode-5|source]] collects, to how long [[fode-6|storage]] keeps it, to who [[fode-9|serving]] shows it to, every step carries a security and privacy decision. So although it's covered last, it should be in your head before you build the first table. My take: **when security is done well nobody sees it; when it's done badly it wipes out all the earlier effort and trust in one go.** Which is exactly why it matters most and gets ignored most.
