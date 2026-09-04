---
title: "Risk Control and Blocklists: Not an Eviction Notice, a Credit System"
date: 2026-07-31
category: tech
description: "Closing out operations: malicious ordering is a DoS on stock — four graduated sanctions (from one confirmation button to a permanent ban), banning the call-out but never the card payment, the banned-user table and Redis as the enforcement machinery, guilt by association through bindings, and the one thing a rebuild must add: giving risk control eyes."
tags:
  - war-story
  - live-commerce
  - risk-control
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 13
comments: true
draft: false
translationOf: rezero-risk
---
Let's state the threat model first. In this system, calling an order in the comments **holds stock immediately** while payment happens at the end of the round — with days of trust in between. So the malicious play is simple: **call it, hold it, don't pay.** Stock sits squatted for up to a full week (a round's length), customers who actually want it can't get it, and the host's goods are stuck with phantom orders — **malicious ordering is a DoS on stock**, and it costs nothing to launch: a few keystrokes.

[[rezero-inventory|Stock]] is this system's common resource, and risk control is its governance. This chapter is what that governance looked like — and it's far more refined than the word "blocklist" suggests.

## Graduated sanctions: from one confirmation button to a permanent ban

Getting caught not paying isn't an instant execution, it's **four escalating tiers**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 234" role="img" aria-label="A ladder of four graduated sanctions. First offence: a warning dialog appears when the customer opens the site, and pressing confirm unlocks them immediately — essentially signing for a warning, so the cost of a false positive is close to zero. Second offence: locked out of calling orders in a live stream for one month. Third offence: three months. Fourth offence: a permanent ban. Each further offence climbs one tier. The conclusion at the bottom: grading makes false positives cheap and lets repeat offenders climb into heavy penalties by themselves." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rkf" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="16" y="96" width="130" height="72" rx="8" fill="#233528" stroke="#54b890" stroke-width="1.4"/>
    <text x="81" y="116" fill="#54b890" font-size="8.2" text-anchor="middle" font-weight="bold">1st offence</text>
    <text x="81" y="132" fill="#e6e6e6" font-size="6.8" text-anchor="middle">a warning dialog on arrival</text>
    <text x="81" y="146" fill="#e6e6e6" font-size="6.8" text-anchor="middle">press "confirm" to unlock</text>
    <text x="81" y="160" fill="#54b890" font-size="6" text-anchor="middle">signing for it · false positives ≈ 0</text>
    <line x1="146" y1="130" x2="162" y2="120" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rkf)"/>
    <rect x="166" y="76" width="130" height="72" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="231" y="96" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">2nd offence</text>
    <text x="231" y="114" fill="#e6e6e6" font-size="7" text-anchor="middle">locked for one month</text>
    <text x="231" y="130" fill="#9aa4b2" font-size="6" text-anchor="middle">expires automatically</text>
    <line x1="296" y1="110" x2="312" y2="100" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rkf)"/>
    <rect x="316" y="56" width="130" height="72" rx="8" fill="#3a2e20" stroke="#e0733a" stroke-width="1.4"/>
    <text x="381" y="76" fill="#e0733a" font-size="8.2" text-anchor="middle" font-weight="bold">3rd offence</text>
    <text x="381" y="94" fill="#e6e6e6" font-size="7" text-anchor="middle">locked for three months</text>
    <text x="381" y="110" fill="#9aa4b2" font-size="6" text-anchor="middle">expires automatically</text>
    <line x1="446" y1="90" x2="462" y2="80" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rkf)"/>
    <rect x="466" y="36" width="100" height="72" rx="8" fill="#3a2632" stroke="#e05a7d" stroke-width="1.5"/>
    <text x="516" y="56" fill="#e05a7d" font-size="8.2" text-anchor="middle" font-weight="bold">4th offence</text>
    <text x="516" y="76" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-weight="bold">permanent ban</text>
    <text x="516" y="92" fill="#9aa4b2" font-size="6" text-anchor="middle">support can lift it</text>
    <text x="290" y="204" fill="#9aa4b2" font-size="7.8" text-anchor="middle">Reoffend and you climb a tier — grading makes false positives cheap and lets repeat offenders climb into the heavy penalties</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Four tiers: the first only asks that you know, and only the last is a door.</figcaption>
</figure>

The first tier is the soul of the whole ladder. It **isn't a punishment, it's a signature**: next time you open the site a warning dialog appears, you press confirm and you're unlocked on the spot — nothing lost, but "the rule has been communicated" is now done. I used to think false positives (the good customer who genuinely forgot, or went abroad unexpectedly) had to be rescued by an appeals process; this design gives a higher-order answer: **make the first tier's penalty so cheap that a false positive doesn't matter** — an innocent person's entire cost is pressing a button, without even contacting support. Detection doesn't have to be accurate, because the harm of judging wrong has already been absorbed structurally.

And repeat offenders need no separate detection — **they climb the ladder by themselves**: a month, three months, a permanent ban. That progression of warning → light penalty → heavy penalty → expulsion has a name in governance literature, graduated sanctions, and it's a classic design for managing a common resource. Nobody here had read any of that literature; it grew out of business instinct.

## Ban the call-out, never the card

What do you actually lose when banned? This is my favourite cut in the chapter: **a banned user only loses the ability to call orders in a live stream — paying by card on the storefront is as welcome as ever.**

Unpack why that's right. This system has two kinds of transaction:

- **Calling an order is a credit transaction**: a comment holds stock now and payment comes at the end of the round — for those days in between, the platform is extending you credit.
- **Paying by card on the storefront is a cash transaction**: pay first, then goods — requiring no trust at all.

What someone who maliciously doesn't pay abuses is **the credit in the former** — so what gets taken away is precisely that privilege. Someone whose credit is blown isn't barred from doing business, they're **limited to cash** — several centuries of banking logic, reinvented inside live commerce. The commercial dividend is real too: you still earn a repeat offender's money, they just pay up front; and the road back for the genuinely reformed is always open, by building a record on the storefront. **The granularity of the punishment matches the granularity of the trust abused** — punish exactly what was done, no more and no less.

## The machinery: one table, one cache, a row of buttons

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 274" role="img" aria-label="The enforcement architecture of the blocklist. An arriving comment first checks a Redis blocklist set: a hit is not processed, and only a miss proceeds into the ordering FSM. Redis only does the fast check; the fact lives in the database's banned user table, using a content type plus object id generic foreign key so any subject — an identity or an account — can be blocked, with an expiry column. There are three write paths: batch writes through a Redis pipeline after a round is settled, one-click blocking from the comment waterfall used by hosts and assistants, and propagation by association when a new identity binds to a banned account. There are two ways out: expiry, and support lifting it by hand in the user management interface. On a Redis restart the set is rebuilt in full from the database." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rke" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rkg" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <rect x="16" y="28" width="96" height="30" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="64" y="47" fill="#e6e6e6" font-size="7.4" text-anchor="middle">comment in</text>
    <line x1="112" y1="43" x2="150" y2="43" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rke)"/>
    <rect x="154" y="20" width="180" height="46" rx="8" fill="#3a2626" stroke="#dc4c3f" stroke-width="1.5"/>
    <text x="244" y="40" fill="#dc4c3f" font-size="8.6" text-anchor="middle" font-weight="bold">Redis blocklist</text>
    <text x="244" y="56" fill="#9aa4b2" font-size="6.4" text-anchor="middle">fast check only · rebuilt from the DB</text>
    <line x1="334" y1="36" x2="392" y2="30" stroke="#e05a7d" stroke-width="1.2"/>
    <text x="404" y="33" fill="#e05a7d" font-size="7" text-anchor="start">hit → not processed</text>
    <line x1="334" y1="54" x2="392" y2="60" stroke="#54b890" stroke-width="1.2" marker-end="url(#rkg)"/>
    <text x="404" y="63" fill="#54b890" font-size="7" text-anchor="start">miss → into the FSM</text>
    <rect x="150" y="112" width="280" height="54" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="290" y="132" fill="#d6a45c" font-size="8.6" text-anchor="middle" font-weight="bold">banned user table (the fact)</text>
    <text x="290" y="148" fill="#9aa4b2" font-size="6.6" text-anchor="middle">content type + object id: block any subject (identity/account)</text>
    <text x="290" y="160" fill="#9aa4b2" font-size="6.6" text-anchor="middle">with expiry — which offence, locked until when</text>
    <line x1="252" y1="112" x2="244" y2="70" stroke="#d6a45c" stroke-width="1.1" stroke-dasharray="3 3" marker-end="url(#rke)"/>
    <text x="204" y="92" fill="#9aa4b2" font-size="6" text-anchor="middle">sync / rebuild</text>
    <rect x="16" y="204" width="168" height="44" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="100" y="222" fill="#4f6df5" font-size="7.2" text-anchor="middle" font-weight="bold">round settlement</text>
    <text x="100" y="237" fill="#9aa4b2" font-size="6.2" text-anchor="middle">listed by rule · batched via pipeline</text>
    <rect x="204" y="204" width="168" height="44" rx="7" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.2"/>
    <text x="288" y="222" fill="#9b6ff0" font-size="7.2" text-anchor="middle" font-weight="bold">one-click from the waterfall</text>
    <text x="288" y="237" fill="#9aa4b2" font-size="6.2" text-anchor="middle">host/assistant dashboard · instant</text>
    <rect x="392" y="204" width="172" height="44" rx="7" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="478" y="222" fill="#54b890" font-size="7.2" text-anchor="middle" font-weight="bold">propagation by binding</text>
    <text x="478" y="237" fill="#9aa4b2" font-size="6.2" text-anchor="middle">new identity binds a banned account</text>
    <line x1="100" y1="204" x2="200" y2="170" stroke="#4f6df5" stroke-width="1" marker-end="url(#rke)"/>
    <line x1="288" y1="204" x2="288" y2="170" stroke="#4f6df5" stroke-width="1" marker-end="url(#rke)"/>
    <line x1="478" y1="204" x2="382" y2="170" stroke="#4f6df5" stroke-width="1" marker-end="url(#rke)"/>
    <text x="474" y="130" fill="#9aa4b2" font-size="6.6" text-anchor="start">out: expiry lifts it</text>
    <text x="474" y="144" fill="#9aa4b2" font-size="6.6" text-anchor="start">+ support lifts by hand</text>
    <text x="474" y="158" fill="#9aa4b2" font-size="6.6" text-anchor="start">(filterable by banned)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The fast check in Redis, the fact in the DB; three ways in, two ways out, all queryable in one click.</figcaption>
</figure>

Every part of the enforcement layer has a relative you've met in an earlier chapter:

- **The banned user table uses content type + object id** — a generic foreign key making its third appearance in this system (cart source, and now the subject of a ban): block an fb user or block an account, one table covers both. **Guilt by association is at account level**: ban the account and every identity bound to it is covered; and [[rezero-identity|binding]] updates Redis on the spot — **bind a new identity to a banned account and it inherits the record immediately**. Of course, identity's inherent limit remains: a brand-new face (a fresh Facebook account) sometimes simply can't be stopped — the plain truth from chapter 4, since risk control can only raise the cost of anonymity, never abolish it.
- **Redis does only the fast check, the fact lives in the DB** — [[redis-cache-patterns|the correct posture for a cache]]: every comment has to ask "is this person listed?", a high-frequency small lookup that a batch can't amortise, so it lives in Redis; on restart it's rebuilt from the DB, and after a round settles it's written with a **pipeline in batch** (a whole season's list update in one round trip), leaving only a brief window at settlement.
- **One-click blocking from the comment waterfall** — on [[rezero-console|the host's and assistant's dashboard]], the enforcement button sits right next to the blocklist tag: hecklers and abusers dealt with live, without waiting for a settlement. The intelligence card and the enforcement desk are the same screen.
- **There are two ways out**: expiry (the one-month and three-month locks), and support lifting it by hand in the user management interface (which can filter by banned status directly — internal-tool UX for the Nth time).

## The rebuild: give risk control eyes

The rebuild list here has one item, and it's a type you haven't seen in any earlier chapter: **measurement**.

After this went live, "we didn't get any negative feedback afterwards" — but we **never measured anything about it**. How many malicious orders were blocked? How many paid up after a first-tier warning (the reform rate)? Were good customers wrongly hit with three-month locks (the false-positive rate)? How many permanently banned people came back with a new face? **None of it is known.** "No complaints" is silence bias, not evidence — the most likely reaction from a wrongly banned customer isn't an appeal, it's quietly never coming back.

In hindsight, risk control is the one subsystem here that was **built without knowing whether it worked**: stock had invariants guarding it, payments had reconciliation, notifications had a delivery column — risk control had nothing. The rebuild list is one line: how often each tier fires, the payment rate after a first-tier warning, the repurchase rate after a lock lifts, the return rate of repeat offenders — **install the eyes first, then talk about tuning**. That was a luxury back then and is common sense in the data-engineering world I moved into later: a mechanism with no measurement is one where even "is it still working?" is an article of faith.

## Reflections

### Designing the punishment matters more than designing the detection

The industry talks about risk control with nine tenths of its effort on detection: better models, more signals, faster interception. This system put its weight on the other end — **the structure of the punishment**: a first tier so cheap that a false positive doesn't matter, an escalation that makes repeat offenders surface by themselves, and punishing exactly what was done so the innocent parts aren't touched. The result is that **detection can be dumb** (just check whether they paid — not even a model) and the system still works. That ordering is worth pondering for anyone doing risk control: detection accuracy is an incremental arms race, and punishment structure is a one-off design — **when the punishment structure is right, detection only has to be roughly right; when it's wrong (one strike and a permanent ban), even perfect detection is manufacturing injustice.**

### Governance wisdom grows out of business instinct

Graduated sanctions, signing for the rules, punishing exactly what was abused, association and expiry — every design in this chapter has a counterpart in the literature on governing common resources, and nobody involved had read any of it. They were instincts ground out by hosts, operators and support across one stream after another, and engineering only translated the instincts into a table and a cache. This is the third appearance of the same thing as [[rezero-promotion|greedy beating the optimum]] and [[rezero-cart-order|the state machine getting ripped out]]: **the floor's understanding of how people behave routinely runs ahead of an engineer's understanding of how the system should be designed** — a good system designer doesn't invent rules, they hear the rules the floor is already using and make them executable and traceable.

### The end point of risk control is keeping the person

"Ban the call-out, never the card" hides a value that's easy to miss: **the goal of risk control isn't expulsion, it's repairing trust**. Every tier of the ladder keeps a way back — press a button, wait a month, rebuild a record on the storefront; even a permanent ban leaves the support door open. Against the many platforms whose approach is detect an anomaly → ban permanently → no appeal, this design takes "people make mistakes, and people come back" as the default. And that's where the loss stings most: **the reform rate — the only evidence that this value was ever redeemed — is precisely the number that went unmeasured.** The first thing those rebuilt eyes should look at is that one.
