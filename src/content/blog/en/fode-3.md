---
title: "Designing Good Data Architecture: Reading Fundamentals of Data Engineering, Ch. 3"
date: 2026-06-29
category: tech
tags:
  - data-engineering
  - book-notes
  - architecture
series: "Fundamentals of Data Engineering — Reading Notes"
seriesOrder: 3
comments: true
draft: false
translationOf: fode-3
---
[[fode-2|The previous post]] gave the whole lifecycle (what data is doing); this chapter asks — **how do you design the system carrying it to be "good"?** The most counter-intuitive and most memorable line in the chapter: **good architecture isn't a fixed blueprint, it's a decision process that "trades off to buy flexibility and reversibility".** There's no best architecture, only trade-offs that are relatively good in this context.

## First, define "architecture"

The book's definition is worth copying: **data architecture is "the design of systems to support the evolving data needs of an enterprise, achieved by flexible and reversible decisions reached through a careful evaluation of trade-offs".** Taken apart, the keywords are three: **trade-offs, flexible, reversible.**

And a pair of words that often get mixed up:

- **Architecture = why**: why the system is cut this way, why this trade-off.
- **Engineering = how**: turning architectural decisions into something that runs.

This whole chapter is about why, not how.

## Nine principles of good architecture

Borrowing from the AWS / GCP well-architected frameworks, the book gives nine principles. Condensed into one table:

| Principle | In one line |
|---|---|
| Choose common components wisely | Shared things (storage, permissions, monitoring) should be chosen so the whole company benefits |
| Plan for failure | Assume things will break; think about availability and recovery targets (RTO/RPO) first |
| Architect for scalability | Scale out horizontally, and scale back in when not needed |
| **Architecture is leadership** | An architect's output isn't just diagrams, it's leading people to the right trade-offs |
| **Always be architecting** | Architecture is a verb, not a document delivered once |
| **Build loosely coupled systems** | Components can evolve and be swapped independently |
| **Make reversible decisions** | Keep decisions retractable wherever possible |
| Prioritize security | Least privilege, zero trust; security is foundation, not a plug-in |
| Embrace FinOps | Cloud cost is a variable to keep designing for |

The two worth digging into most, and most able to change how you decide, are **reversible decisions** and **loose coupling**.

## Core one: reversible decisions — two-way doors vs one-way doors

The book borrows Jeff Bezos's metaphor: decisions are two kinds of door.

- **Two-way door (reversible)**: if you go the wrong way you can walk back. → **Decide fast**; if it's wrong, change it.
- **One-way door (irreversible)**: once through, it's hard to return. → **Decide carefully**; worth spending time to evaluate.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 188" role="img" aria-label="A reversible decision is like a two-way door, you can go back and forth between the status quo and the new approach; an irreversible decision is like a one-way door, once through you can't return" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ar3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4f6df5"/></marker><marker id="as3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="135" y="28" fill="#4f6df5" font-size="11.5" text-anchor="middle">Two-way door (reversible)</text>
    <rect x="40" y="52" width="74" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="77" y="79" fill="#e6e6e6" font-size="10.5" text-anchor="middle">status quo</text>
    <rect x="156" y="52" width="74" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="193" y="79" fill="#e6e6e6" font-size="10.5" text-anchor="middle">new option</text>
    <line x1="116" y1="68" x2="154" y2="68" stroke="#4f6df5" stroke-width="1.5" marker-end="url(#ar3)"/>
    <line x1="154" y1="82" x2="116" y2="82" stroke="#4f6df5" stroke-width="1.5" marker-end="url(#ar3)"/>
    <text x="135" y="124" fill="#9aa4b2" font-size="10" text-anchor="middle">can come back → decide fast</text>
    <line x1="270" y1="20" x2="270" y2="150" stroke="#3a4154" stroke-width="1"/>
    <text x="405" y="28" fill="#9aa4b2" font-size="11.5" text-anchor="middle">One-way door (irreversible)</text>
    <rect x="310" y="52" width="74" height="46" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.5"/>
    <text x="347" y="79" fill="#e6e6e6" font-size="10.5" text-anchor="middle">status quo</text>
    <rect x="426" y="52" width="74" height="46" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.5"/>
    <text x="463" y="79" fill="#e6e6e6" font-size="10.5" text-anchor="middle">new option</text>
    <line x1="386" y1="75" x2="424" y2="75" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#as3)"/>
    <text x="405" y="118" fill="#9aa4b2" font-size="13" text-anchor="middle">✕ no way back</text>
    <text x="405" y="135" fill="#9aa4b2" font-size="10" text-anchor="middle">→ decide carefully</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Good architecture designs decisions as two-way doors wherever it can — keeping the ability to change your mind is keeping your future options</figcaption>
</figure>

The book's claim: **good architecture designs decisions as two-way doors wherever possible.** Because requirements will change, and keeping "the ability to change your mind" is value in itself. In practice this means "don't lock yourself in" — don't sign a five-year contract, don't let data live only in a proprietary format, don't let one choice bind the next ten.

## Core two: loose coupling — components evolve on their own

In a **tightly coupled** system the components are tangled together; change one and the whole body moves. In a **loosely coupled** system components talk through clear interfaces and can be developed, deployed and swapped independently.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 176" role="img" aria-label="Tight coupling is components tangled into one block where changing one moves everything; loose coupling is independent components communicating through interfaces that can be swapped" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ac3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="135" y="26" fill="#9aa4b2" font-size="11.5" text-anchor="middle">Tight coupling</text>
    <rect x="50" y="44" width="170" height="86" rx="10" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <rect x="66" y="62" width="60" height="50" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/>
    <rect x="110" y="74" width="60" height="50" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/>
    <rect x="150" y="58" width="60" height="50" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="135" y="150" fill="#9aa4b2" font-size="10" text-anchor="middle">tangled together → change one, move all</text>
    <line x1="270" y1="16" x2="270" y2="140" stroke="#3a4154" stroke-width="1"/>
    <text x="405" y="26" fill="#4f6df5" font-size="11.5" text-anchor="middle">Loose coupling</text>
    <rect x="312" y="62" width="56" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <rect x="392" y="62" width="56" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <rect x="472" y="62" width="56" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <line x1="368" y1="84" x2="392" y2="84" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ac3)"/>
    <line x1="448" y1="84" x2="472" y2="84" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ac3)"/>
    <text x="405" y="132" fill="#9aa4b2" font-size="10" text-anchor="middle">talk via interfaces → evolve, swap independently</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Loose coupling lets you replace, upgrade or rewrite one component on its own without touching the others</figcaption>
</figure>

It's the same spirit as [[kafka-intro|Kafka]] decoupling producers from consumers — reduce the dependency between components to "one clear interface", and the system can evolve locally instead of being rebuilt wholesale.

## Brownfield vs greenfield

One last practical distinction: are you building on a **brownfield** or a **greenfield**?

- **Brownfield**: rebuilding on an existing system. Constrained by what's there, technical debt, no downtime allowed — low freedom, but the risks are concrete.
- **Greenfield**: a blank sheet. High freedom, but easy to over-design and underestimate the unknowns.

The book's reminder is on point: greenfield freedom is a double-edged sword; don't mistake "no baggage" for "anything goes".

## Reflections

### "No best architecture, only trade-offs" is the line to internalise from this chapter

The more I do this the more I agree: **architectural maturity is the shift from "finding the optimum" to "articulating the trade-off".** Beginners ask "which architecture is best"; the experienced ask back "under your constraints, what are you willing to trade for what". It's the same nerve as my concept note [[pain-before-power|confirm the pain first, then bring the heavy weapons]] — a "best practice" without context is empty talk; every choice should come back to "this pain, this scale, this team" to be weighed. The book makes that the first principle, and I'm sold.

### Reversibility is the "insurance" I've been buying all along

The "make it a two-way door where you can" rule is something I've practised unconsciously in a lot of posts. In [[medallion-architecture|Medallion]] I insist that **Bronze is immutable and replayable** — that's essentially preserving reversibility: the raw data is still there, so however downstream changes you can redo it. Avoiding proprietary lock-in, keeping the raw layer, not signing long contracts — all the same move: **spend a little now to buy the right to change your mind later.** Requirements will change, and reversibility is the premium you pay against "uncertain".

### "Architecture is leadership", "always be architecting" — these pull architecture back from technology to people

My most unexpected takeaway was the book listing "architecture is leadership" and "always be architecting" as principles. It's saying: **architecture isn't a diagram a senior engineer finishes behind a closed door; it's an ongoing, social activity** — you make trade-offs with the team, evolve with requirements, keep communicating and correcting. That connects with what I got from reading the [[btl-1|Tech Leader series]]: a good technical decision is never just a technical question, it's "how do you lead a group of people to keep making the right trade-offs under uncertainty". Drawing the architecture on the whiteboard is only the start; making it live in the team's shared understanding is the real skill.
