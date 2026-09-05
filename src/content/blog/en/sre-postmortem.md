---
title: "Blameless Postmortems: Turning Outages into Organisational Learning"
date: 2026-07-12
category: tech
description: "Outages are expensive — late nights, apologies, lost trust. Tuition that expensive, if not converted into a postmortem that prevents a repeat, is pure loss. And the soul of a postmortem is blameless: focus on the event, not the person. Because blame scares off the truth, and a person is almost never the root cause — if one slip of the hand can bring down the system, that's a system problem, not a people problem."
tags:
  - sre
  - culture
series: "Google SRE — Reading Notes"
seriesOrder: 7
comments: true
draft: false
translationOf: sre-postmortem
---
[[sre-troubleshooting|The previous post]] was about finding the root cause — but then what? The **postmortem** turns one expensive outage into learning for the whole organisation: what happened, how big the impact, the timeline, the true cause, how it was fixed, how to prevent a repeat. And its soul is a word that looks simple and is extremely hard to live up to: **blameless (the event, not the person).**

## The soul is blameless: the event, not the person

The same outage, handled by "blame" or by "blameless", takes a team down two completely opposite cycles:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="Two cultural cycles compared. The blame culture's vicious cycle: incident, hunt for the culprit asking whose fault, everyone hides mistakes and dares not tell the truth, nothing is learned so it repeats, back to incident. The blameless virtuous cycle: incident, ask why the system allowed it, everyone openly tells the whole story, the system is fixed and grows steadily more stable." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="pm" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="16" x2="290" y2="216" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="26" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">Blame culture · vicious cycle</text>
    <rect x="66" y="36" width="168" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="150" y="53" fill="#e6e6e6" font-size="8.5" text-anchor="middle">incident</text>
    <rect x="66" y="76" width="168" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="150" y="93" fill="#e6e6e6" font-size="8.5" text-anchor="middle">"whose fault?" hunt the culprit</text>
    <rect x="66" y="116" width="168" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="150" y="133" fill="#e6e6e6" font-size="8.5" text-anchor="middle">people hide mistakes, stay quiet</text>
    <rect x="66" y="156" width="168" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="150" y="173" fill="#e6e6e6" font-size="8.5" text-anchor="middle">nothing learned → repeat</text>
    <line x1="150" y1="62" x2="150" y2="74" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pm)"/>
    <line x1="150" y1="102" x2="150" y2="114" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pm)"/>
    <line x1="150" y1="142" x2="150" y2="154" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pm)"/>
    <path d="M66,169 C34,169 34,49 64,49" fill="none" stroke="#e0733a" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#pm)"/>
    <text x="430" y="26" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">Blameless · virtuous cycle</text>
    <rect x="346" y="36" width="168" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="430" y="53" fill="#e6e6e6" font-size="8.5" text-anchor="middle">incident</text>
    <rect x="346" y="76" width="168" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="430" y="93" fill="#e6e6e6" font-size="8.5" text-anchor="middle">"why did the system allow it?"</text>
    <rect x="346" y="116" width="168" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="430" y="133" fill="#e6e6e6" font-size="8.5" text-anchor="middle">everyone tells the whole story</text>
    <rect x="346" y="156" width="168" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="430" y="173" fill="#e6e6e6" font-size="8.5" text-anchor="middle">fix the system → steadily stabler</text>
    <line x1="430" y1="62" x2="430" y2="74" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pm)"/>
    <line x1="430" y1="102" x2="430" y2="114" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pm)"/>
    <line x1="430" y1="142" x2="430" y2="154" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pm)"/>
    <path d="M514,169 C546,169 546,49 516,49" fill="none" stroke="#54b890" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#pm)"/>
    <text x="290" y="212" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Same outage; asking "who" or asking "the system" takes the team down opposite cycles</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Blame makes people hide mistakes and stay quiet, so you never get the full truth and never learn the lesson; blameless asks "why did the system allow this to happen", so people dare to be honest and you can fix the real problem. The difference isn't good or bad attitude; it's <b>whether you get the truth</b></figcaption>
</figure>

Why is blame so deadly? Because it **scares off the truth**. When mistakes are punished, people instinctively hide them, tidy up the timeline, and don't dare say "actually I saw X at the time but didn't think much of it" — and to learn the lesson, you need exactly that complete, honest truth. Blameless isn't "being a pushover, nobody accountable"; it's **safety deliberately designed to obtain the truth**.

## A person is almost never the root cause

Blameless has an even harder underlying logic: **people will make mistakes; that's a constant; so "preventing people from making mistakes" is futile, and what you should do is "make sure a mistake doesn't become a disaster".** The classic example — someone deletes the production database with one command:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 228" role="img" aria-label="The event is one command accidentally deleting the production database. The blame route: blame Alice's slip, punish her and tell everyone to be careful, and the system is unchanged so the next person is hit the same way. The blameless route: ask down into the system, why no confirmation on a dangerous command, why one person could delete production, why no backup that restores quickly; fixing those system flaws is what cures it." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="pd" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="180" y="16" width="220" height="34" rx="6" fill="#262b3a" stroke="#e6e6e6" stroke-width="1.4"/><text x="290" y="37" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Event: one command deletes the production DB</text>
    <line x1="250" y1="50" x2="160" y2="80" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pd)"/>
    <line x1="330" y1="50" x2="420" y2="80" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pd)"/>
    <line x1="290" y1="58" x2="290" y2="214" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <rect x="24" y="82" width="236" height="28" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="142" y="100" fill="#e6e6e6" font-size="8.5" text-anchor="middle">✗ Blame: Alice's hand slipped</text>
    <rect x="24" y="120" width="236" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="142" y="138" fill="#9aa4b2" font-size="8.5" text-anchor="middle">punish her, tell everyone "be careful"</text>
    <text x="142" y="176" fill="#e0733a" font-size="8.7" text-anchor="middle">system unchanged; next person, same result</text>
    <text x="142" y="190" fill="#9aa4b2" font-size="8" text-anchor="middle">(the root cause was never touched)</text>
    <rect x="320" y="82" width="240" height="28" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="440" y="100" fill="#54b890" font-size="8.5" text-anchor="middle">✓ Blameless: ask down into the system</text>
    <rect x="320" y="118" width="240" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="440" y="133" fill="#9aa4b2" font-size="8" text-anchor="middle">why no confirmation on a dangerous command?</text>
    <rect x="320" y="144" width="240" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="440" y="159" fill="#9aa4b2" font-size="8" text-anchor="middle">why could one person delete production?</text>
    <rect x="320" y="170" width="240" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="440" y="185" fill="#9aa4b2" font-size="8" text-anchor="middle">why no backup that restores quickly?</text>
    <text x="440" y="210" fill="#54b890" font-size="8.7" text-anchor="middle">fix these system flaws, and it won't recur</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Stopping at "Alice's hand slipped" fixes nothing; the next person is hit the same way. The true cause was never the hand, but "a system that lets one slip destroy everything" — no confirmation, excessive permissions, no fast restore. Turn the spotlight from the person to the system, and you'll fix what actually needs fixing</figcaption>
</figure>

So a postmortem has an important premise: **assume that everyone, in the moment, made a reasonable decision based on the information they had (assume good intentions).** Nobody gets up in the morning thinking "let's bring down the system today". With that assumption, attention naturally moves from "how could this person be so stupid" to "what system, process, or information gap led a reasonable person to take an action that broke things" — and only the latter can be fixed.

## Blameless doesn't mean unaccountable

To clear up a common misreading: **blameless isn't "nobody is responsible, everyone muddles along".** There must still be clear **action items**, each owned by someone, tracked to completion — the focus is just on **fixing the system**, not **punishing the individual**. And action items must be concrete and executable: "add a confirmation step to the delete command", "schedule a backup-restore drill monthly" are action items; "everyone be more careful from now on" is not — that just hands the same pain, untouched, to next time.

## Reflections

### The cost of blame is scaring off learning

The greatest damage of blame doesn't land on the person being scolded; it's that it makes "telling the truth" dangerous. Once admitting a mistake carries a price, the whole team starts hiding, tidying up, defending — and what you most need is precisely the unvarnished full truth. So I increasingly see blameless as **a very pragmatic design**, not a moral posture: **you give up prosecuting individuals in exchange for honesty; and honesty is the only precondition for a team to learn anything from failure.** It's the same thing as the psychological safety I've always believed in when leading people and along the Tech Leader line — people are honest only when they feel safe; and a dishonest team never learns, however many outages it has.

### If one slip can bring down the system, that's a system problem

I want to amplify this line, because it's hard enough to be a creed. People making mistakes is a constant, not a variable; since you can't remove it, effort spent on "preventing people from erring" is wasted. What you should do is **make the system resilient to human error** — foolproofing, confirmations, least privilege, fast restore. The root cause of the deleted database was never "Alice's hand slipped"; it was "the system allowed one slip to destroy everything". That's exactly the same sentence as [[sre-intro|the first post]]'s "fault tolerance isn't fault absence", except this time the fault being tolerated is a **human** one: a good system assumes people will err, and makes sure erring doesn't become a disaster.

### Not writing the postmortem means the pain was for nothing

The tuition for an outage is very expensive — late nights, apologies, lost trust, error budget burned. Something that expensive, if not converted into a postmortem the organisation remembers and that prevents a repeat, is **pure loss**. I now treat writing a postmortem as "turning pain into an asset": it hurt anyway, so at least get a stabler system and a group of people who genuinely learned. And whether that trade goes through depends entirely on the action items being **concrete, owned, and tracked** — which echoes [[sre-troubleshooting|the previous post]]'s "record what you did": the trail debugging leaves behind is the best raw material for a postmortem. It hurt already; don't let it pass for nothing.
