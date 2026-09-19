---
title: "Leadership"
date: 2025-10-12
category: tech
description: "Leadership gets read as a title, as giving orders, as having people who obey — but its core isn't power, it's influence. And it has a range: the same person ranks differently in different groups. Starting from the general model, and why general models go wrong inside a real team."
tags:
  - leadership
comments: true
series: "Becoming a Tech Leader — Reading Notes"
seriesOrder: 1
translationOf: btl-1
---

## What leadership is
The word "leadership" gets read as "senior title", "gives the orders", "has people who do what he says" — but the core of leadership isn't power or control, it's **influence**.

Leadership has a range. The same person's leadership differs from group to group, and the quickest traditional way to see it is to ask every member of a group to rank everyone else's leadership — aggregate the answers and you have that group's leadership ranking.

## Models
That way of analysing leadership is a general model, and general models lose their accuracy the moment you drop them into a specific domain — the same way plenty of specialised fields don't reach for an LLM but for ML/DL, and even inside ML/DL the algorithm changes with the domain. Leadership has many models too.

They fall roughly into two kinds — **organic** and **linear**. As the words suggest, linear thinks in single causes (one-to-one); organic thinks in many causes (many-to-many). The two mindsets, side by side:

- Linear model thinking:
    - Good at sorting people into categories
    - Speed of analysis: fast
    - Defines the relationship between people by **role** (boss, support, engineer, PM)
    - Tends to assume things stay put

- Organic model thinking:
    - Relationship-oriented
    - Good at watching dynamics and context (context-aware)
    - Speed of analysis: slow, but closer to the truth
    - Defines the relationship between people by **interaction and trust** (who influences whom, who inspires whom)
    - Takes situation and systemic effects seriously (systemic thinking)
    - Treats change as something to be accommodated

Linear is closer to "structured organisational management"; organic is closer to "the interactions in an ecosystem".

In a linear world the leader is a **chess player** — issuing instructions, moving resources around, driving towards the goal. In an organic world the leader is a **gardener** — creating the environment, guiding growth, letting different people realise their potential where they each stand.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 230" role="img" aria-label="Two leadership models side by side. Linear is like a chess player: one-way instructions down a hierarchy sorted by role. Organic is like a gardener: a many-to-many web of relationships with the leader as one node in it." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="lin1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="280" y1="22" x2="280" y2="214" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 4"/>
    <text x="140" y="26" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Linear · chess player</text><text x="140" y="42" fill="#9aa4b2" font-size="9.5" text-anchor="middle">one-way cause · sorted by role</text>
    <rect x="108" y="56" width="64" height="30" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="140" y="76" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Leader</text>
    <rect x="22" y="150" width="64" height="30" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="54" y="170" fill="#9aa4b2" font-size="10" text-anchor="middle">Engineer</text>
    <rect x="108" y="150" width="64" height="30" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="140" y="170" fill="#9aa4b2" font-size="10" text-anchor="middle">PM</text>
    <rect x="194" y="150" width="64" height="30" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="226" y="170" fill="#9aa4b2" font-size="10" text-anchor="middle">Support</text>
    <line x1="132" y1="86" x2="60" y2="148" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#lin1)"/>
    <line x1="140" y1="86" x2="140" y2="148" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#lin1)"/>
    <line x1="148" y1="86" x2="220" y2="148" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#lin1)"/>
    <text x="420" y="26" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Organic · gardener</text><text x="420" y="42" fill="#9aa4b2" font-size="9.5" text-anchor="middle">many-to-many · by interaction and trust</text>
    <line x1="360" y1="78" x2="492" y2="86" stroke="#9aa4b2" stroke-width="1.1"/><line x1="360" y1="78" x2="424" y2="128" stroke="#9aa4b2" stroke-width="1.1"/><line x1="492" y1="86" x2="424" y2="128" stroke="#9aa4b2" stroke-width="1.1"/><line x1="424" y1="128" x2="352" y2="176" stroke="#9aa4b2" stroke-width="1.1"/><line x1="424" y1="128" x2="498" y2="170" stroke="#9aa4b2" stroke-width="1.1"/><line x1="352" y1="176" x2="498" y2="170" stroke="#9aa4b2" stroke-width="1.1"/><line x1="360" y1="78" x2="352" y2="176" stroke="#9aa4b2" stroke-width="1.1"/><line x1="492" y1="86" x2="498" y2="170" stroke="#9aa4b2" stroke-width="1.1"/>
    <circle cx="360" cy="78" r="15" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <circle cx="492" cy="86" r="15" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <circle cx="352" cy="176" r="15" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <circle cx="498" cy="170" r="15" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <circle cx="424" cy="128" r="19" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="424" y="132" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Leader</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">One team, two ways of seeing it: linear sorts people by role and sends instructions down; organic looks at the web of who influences whom, with the leader as one node in it</figcaption>
</figure>

## Reflection
- The people I'd call leaders in my own life are unusually good at two things: communicating with people, and growing them. So if my leadership improves, what it really means is that I care more about the people around me — they trust me more, and the group moves in a more consistent direction.
- In my current job I pass knowledge on through code review, hold the team together with a coding style, and use a type checker to take the weight of consistency off everyone's shoulders. I also run regular 1-on-1s to know how people are actually doing. But when I let code review sit too long, I become the thing slowing the team down; and 1-on-1s without follow-up end up feeling like a formality.
- So: raise the priority of code review, and keep notes on every 1-on-1 with actual follow-up. I want to keep learning in this environment and grow with the team rather than ahead of it.

---

> **Leadership isn't walking in front and showing the way — it's making it possible for others to lead too.**
