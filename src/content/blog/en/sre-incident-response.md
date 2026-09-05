---
title: "Incident Response: The Real Enemy in a Major Incident Is Chaos"
date: 2026-07-13
category: tech
description: "When a major incident erupts, the biggest enemy is often not the technical problem itself but chaos — five people scrambling to change things, information flying everywhere, nobody holding the whole picture. Technical problems get fixed, but chaos stretches a ten-minute problem into two hours, or breeds new disasters. This post covers taming chaos with an incident command system borrowed from firefighting (IC / Ops / Comms / Scribe), and why the commander's most counter-intuitive trait is that \"they don't touch anything\"."
tags:
  - sre
  - incident
series: "Google SRE — Reading Notes"
seriesOrder: 8
comments: true
draft: false
translationOf: sre-incident-response
---
Earlier you learned [[sre-alerting-oncall|on-call mitigation]] and [[sre-troubleshooting|systematic troubleshooting]] — but that's "one person against one problem". When a **major incident** erupts (many people involved, big impact, high time pressure), you'll find the biggest enemy is often not the technical problem itself, but **chaos**.

## The real enemy in a major incident is "chaos"

Technical problems always get fixed; but the chaos of "five people changing things at once, nobody knowing what the others are doing" stretches a ten-minute problem into two hours, or even breeds a new disaster:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 218" role="img" aria-label="Left, no command: four engineers all act on the failing system at once, arrows crossing, stepping on each other, information flying everywhere, fixing it slower. Right, with command: the IC coordinates, and beneath them Ops acts, Comms handles the outside, Scribe records, each with one role; only Ops touches the system, clean and orderly, fixing it faster." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="ir" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="16" x2="290" y2="182" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="26" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">No command: chaos</text>
    <rect x="108" y="92" width="86" height="34" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.5"/><text x="151" y="113" fill="#e6e6e6" font-size="8.5" text-anchor="middle">system down</text>
    <circle cx="46" cy="58" r="13" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="46" y="61" fill="#9aa4b2" font-size="7" text-anchor="middle">eng</text>
    <circle cx="256" cy="58" r="13" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="256" y="61" fill="#9aa4b2" font-size="7" text-anchor="middle">eng</text>
    <circle cx="46" cy="150" r="13" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="46" y="153" fill="#9aa4b2" font-size="7" text-anchor="middle">eng</text>
    <circle cx="256" cy="150" r="13" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="256" y="153" fill="#9aa4b2" font-size="7" text-anchor="middle">eng</text>
    <line x1="58" y1="66" x2="108" y2="98" stroke="#e0733a" stroke-width="1" marker-end="url(#ir)"/>
    <line x1="244" y1="66" x2="194" y2="98" stroke="#e0733a" stroke-width="1" marker-end="url(#ir)"/>
    <line x1="58" y1="142" x2="108" y2="118" stroke="#e0733a" stroke-width="1" marker-end="url(#ir)"/>
    <line x1="244" y1="142" x2="194" y2="118" stroke="#e0733a" stroke-width="1" marker-end="url(#ir)"/>
    <line x1="59" y1="58" x2="243" y2="150" stroke="#9aa4b2" stroke-width="0.8" stroke-dasharray="2 2"/>
    <line x1="59" y1="150" x2="243" y2="58" stroke="#9aa4b2" stroke-width="0.8" stroke-dasharray="2 2"/>
    <text x="150" y="200" fill="#9aa4b2" font-size="8.3" text-anchor="middle">scrambling, stepping on each other, info everywhere → slower</text>
    <text x="430" y="26" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">With command: order</text>
    <rect x="378" y="38" width="104" height="26" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="430" y="55" fill="#4f6df5" font-size="9" text-anchor="middle">IC (coordinates)</text>
    <rect x="312" y="88" width="60" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="342" y="104" fill="#e6e6e6" font-size="8" text-anchor="middle">Ops fixes</text>
    <rect x="400" y="88" width="60" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="430" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">Comms</text>
    <rect x="488" y="88" width="60" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="518" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">Scribe</text>
    <line x1="418" y1="64" x2="352" y2="86" stroke="#9aa4b2" stroke-width="1" marker-end="url(#ir)"/>
    <line x1="430" y1="64" x2="430" y2="86" stroke="#9aa4b2" stroke-width="1" marker-end="url(#ir)"/>
    <line x1="442" y1="64" x2="508" y2="86" stroke="#9aa4b2" stroke-width="1" marker-end="url(#ir)"/>
    <rect x="352" y="148" width="120" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="412" y="165" fill="#e6e6e6" font-size="8.5" text-anchor="middle">system down</text>
    <line x1="342" y1="112" x2="400" y2="146" stroke="#54b890" stroke-width="1.2" marker-end="url(#ir)"/>
    <text x="430" y="200" fill="#9aa4b2" font-size="8.3" text-anchor="middle">one role each, information centralised → faster</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Same outage: on the left nobody coordinates, everyone fires at the system at random and steps on each other; on the right a commander divides the work and only one person touches the system. Chaos is itself a kind of failure — man-made, and avoidable with process</figcaption>
</figure>

## The incident command system: one role per person

To tame chaos, SRE borrowed the **Incident Command System (ICS)** straight from firefighting and disaster response: clear role divisions, each person carrying exactly one thing:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="The four roles of the incident command system. At the top, the Incident Commander coordinates overall, makes decisions, and does not act hands-on. Below, three roles: Ops does the actual mitigation and repair; Comms updates status externally to management, support and users; Scribe records the timeline and decisions for the postmortem." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ic" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="200" y="22" width="180" height="46" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="290" y="42" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">Incident Commander (IC)</text>
    <text x="290" y="58" fill="#9aa4b2" font-size="8" text-anchor="middle">coordinates · decides · hands off the keyboard</text>
    <line x1="290" y1="68" x2="104" y2="116" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ic)"/>
    <line x1="290" y1="68" x2="290" y2="116" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ic)"/>
    <line x1="290" y1="68" x2="476" y2="116" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ic)"/>
    <rect x="24" y="118" width="160" height="60" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="104" y="138" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">Ops</text>
    <text x="104" y="154" fill="#9aa4b2" font-size="8" text-anchor="middle">actual mitigation / repair</text>
    <text x="104" y="167" fill="#9aa4b2" font-size="8" text-anchor="middle">the only one touching the system</text>
    <rect x="210" y="118" width="160" height="60" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="290" y="138" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">Comms</text>
    <text x="290" y="154" fill="#9aa4b2" font-size="8" text-anchor="middle">status updates outward</text>
    <text x="290" y="167" fill="#9aa4b2" font-size="8" text-anchor="middle">(management / support / users)</text>
    <rect x="396" y="118" width="160" height="60" rx="7" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="476" y="138" fill="#d6a45c" font-size="10" text-anchor="middle" font-weight="bold">Scribe</text>
    <text x="476" y="154" fill="#9aa4b2" font-size="8" text-anchor="middle">records timeline, decisions</text>
    <text x="476" y="167" fill="#9aa4b2" font-size="8" text-anchor="middle">(for the postmortem)</text>
    <text x="290" y="200" fill="#9aa4b2" font-size="8.5" text-anchor="middle">The IC coordinates, never debugs; one role each — don't let the commander command and repair at once</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The essence of the division: the IC holds the whole picture, decides, assigns tasks, but <b>never touches anything</b>; Ops is the only one who touches the system; Comms fends off the "what's happening now?" questions so the IC can focus; the Scribe's timeline becomes the raw material for the postmortem</figcaption>
</figure>

## A few key moves

With the roles in place, a few more things make incident response run smoothly:

- **Declare "this is an incident" early**. Too many teams drag their feet about admitting something's wrong (let's wait a bit, it should be fine soon), and miss the moment to start coordinating. Declaring an incident isn't conceding defeat; it's **starting a mechanism that helps you resolve it faster**.
- **One shared communication channel** (a war room / chat channel): everyone aligns in one place; don't let information scatter into DMs.
- **Explicit handoff**: when the IC needs to leave or can't go on, hand command to a named person, out loud; never disappear silently.
- **Practise in peacetime**: don't let the real major incident be the first time you use this process.
- **Track outages afterwards** (Ch16): record, classify and trend every incident (which kinds happen most, is MTTR improving) — **only with data can you talk about improvement.**

## Reflections

### The bottleneck in a major incident is often coordination, not technology

I've seen plenty of incidents where the technical fix was actually simple (roll back, restart, shift traffic), and what dragged out the time was the chaos of "five people each doing their own thing, nobody holding the whole picture" — duplicated actions, conflicting changes, even someone breaking what someone else had just fixed. It taught me: **chaos is itself a kind of failure, and a man-made one that process can avoid.** In a fire, a clear command structure often speeds things up more than two more brilliant engineers — because what it solves isn't the technical problem but the harder one of "too many hands".

### The IC's most counter-intuitive trait: they don't touch anything

The mistake a new IC most easily makes is jumping in to debug — and then nobody watches the whole picture, the others lose their coordination centre, and it gets messier. The IC's value lies precisely in "**not touching, only coordinating**": holding the whole picture, assigning tasks, deciding, shielding everyone from interruptions. Let the best fixer focus on fixing, and the best coordinator focus on coordinating. It's exactly my experience leading a team: **when the leader can't resist jumping in as the strongest individual contributor, the team loses its brain.** Holding back and lifting yourself to the coordination layer is the hardest, and most necessary, lesson of being a commander (and a manager).

### Admit "this is an incident" early

Delaying the declaration is the most common and most expensive mistake I've seen. People want to save effort, avoid making a fuss, bet it'll fix itself — and by the time they're forced to admit it, everything is a mess and the golden window for coordination has passed. My principle now: **better to declare and find it was minor than to drag it out until it's major and panic.** And whether that's achievable comes back to [[sre-postmortem|the previous post]]'s blameless culture — only when "declaring an incident" is safe, encouraged, and not held against you later will people dare to raise the alarm early. **Technical process and culture are tied together here.**
