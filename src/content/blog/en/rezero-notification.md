---
title: "Notifications: Two Columns, One Scheduled Job, and a Phone Call"
date: 2026-07-31
category: tech
description: "Fourth operations chapter: a channel ledger (private reply, email and the phone as a severity ladder — the phone channel was bought with free shipping), a fact table moonlighting as both notification queue and delivery ledger, a rate-limit war story caused by trusting Facebook's docs, the 10-second rule, and why \"the chase list isn't a feature, it's a query\"."
tags:
  - war-story
  - live-commerce
  - notification
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 12
comments: true
draft: false
translationOf: rezero-notification
---
What "a notification system" looks like in a textbook: a notification service, a message queue, a template engine, multi-channel SDKs, a retry-with-backoff framework. The version in this chapter is **two columns, one scheduled scan, a ten-second rule, and a phone call from support**. It's too small to look like a system — and it delivered 99% of the notifications, with somebody catching the other 1%.

## The channel ledger: cost aligned with severity

Take stock of the channels first. Notifications here travelled four roads, and the more severe the message, the more expensive the channel:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 264" role="img" aria-label="A severity ladder of notification channels. Tier one, private reply: automatic, free, high volume, used for win notices with a binding token attached, constrained by Facebook's policy wall of one reply per comment. Tier two, email: routine and internal notices, where async task completions go, using Google Workspace, with the downside that it sinks in an inbox. Tier three, the phone: manual and priciest, reserved for a final notice before money is cleared and someone is blocklisted, dialled by support — a channel bought with a campaign offering free shipping in exchange for a phone number. A side branch, SMS: normally only for authentication one-time passwords, plus a single final chase message per round, with support's phone call reserved for whoever the SMS didn't move. The conclusion at the bottom: channel cost tracks message severity, and the right to reach someone is bought by the product." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rnt" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="252" y="22" fill="#9aa4b2" font-size="7.6" text-anchor="middle">message severity →</text>
    <line x1="120" y1="30" x2="390" y2="30" stroke="#3a4154" stroke-width="1" marker-end="url(#rnt)"/>
    <rect x="16" y="44" width="170" height="108" rx="8" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.4"/>
    <text x="101" y="66" fill="#9b6ff0" font-size="8.6" text-anchor="middle" font-weight="bold">private reply</text>
    <text x="101" y="84" fill="#e6e6e6" font-size="6.8" text-anchor="middle">automatic · free · high volume</text>
    <text x="101" y="100" fill="#e6e6e6" font-size="6.8" text-anchor="middle">win notice + binding token</text>
    <text x="101" y="122" fill="#e05a7d" font-size="6.2" text-anchor="middle">policy wall: one reply</text>
    <text x="101" y="134" fill="#e05a7d" font-size="6.2" text-anchor="middle">per comment, that's all</text>
    <rect x="206" y="44" width="170" height="108" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="291" y="66" fill="#4f6df5" font-size="8.6" text-anchor="middle" font-weight="bold">email</text>
    <text x="291" y="84" fill="#e6e6e6" font-size="6.8" text-anchor="middle">routine · internal notices</text>
    <text x="291" y="100" fill="#e6e6e6" font-size="6.8" text-anchor="middle">async completions go here</text>
    <text x="291" y="122" fill="#9aa4b2" font-size="6.2" text-anchor="middle">Google Workspace, off the shelf</text>
    <text x="291" y="134" fill="#9aa4b2" font-size="6.2" text-anchor="middle">downside: it sinks</text>
    <rect x="396" y="44" width="170" height="108" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.6"/>
    <text x="481" y="66" fill="#d6a45c" font-size="8.6" text-anchor="middle" font-weight="bold">phone (support)</text>
    <text x="481" y="84" fill="#e6e6e6" font-size="6.8" text-anchor="middle">manual · priciest · always lands</text>
    <text x="481" y="100" fill="#e6e6e6" font-size="6.8" text-anchor="middle">final notice: before the money</text>
    <text x="481" y="113" fill="#e6e6e6" font-size="6.8" text-anchor="middle">is cleared and they're blocklisted</text>
    <text x="481" y="134" fill="#54b890" font-size="6.2" text-anchor="middle" font-weight="bold">channel bought with free shipping</text>
    <rect x="186" y="170" width="210" height="34" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="291" y="185" fill="#e6e6e6" font-size="7" text-anchor="middle">SMS: OTP + one final chase per round</text>
    <text x="291" y="197" fill="#9aa4b2" font-size="6" text-anchor="middle">whoever the SMS doesn't move gets a call</text>
    <text x="290" y="238" fill="#9aa4b2" font-size="7.6" text-anchor="middle">Channel cost tracks message severity; and reach isn't granted by an API — the product bought it</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Three tiers plus a side branch: the more severe the message, the more expensive the channel, and the most expensive one runs on people.</figcaption>
</figure>

The line worth pausing on is chasing payment, which is **two-stage**. At the end of a round, **one chase SMS** goes out — SMS has an API, but it's used exactly once per round, taking the discipline of rationing a scarce channel to its extreme. Whoever the SMS doesn't move goes to a **support phone call**: pay now or the order gets cleared and you go on the blocklist. That kind of final notice is too important for any automatic channel — private reply has a policy wall (Facebook allows one reply per comment, and the win notice already used it), email sinks, and **the only message that always lands is a phone call**. And SMS or phone, both need a number — which is why we ran a campaign giving **free shipping for adding a phone number**, and plenty of customers did. Buying a high-reach channel with shipping costs, and paving the way for SMS OTP while we were at it — **the right to reach someone is a scarce asset; it doesn't come with an API, a product trades something for it.** It's one of my favourite pieces of growth design in this whole system.

## A notification queue with no queue

How does a win notice go out? The textbook draws a message queue. The answer we had: **you don't need a queue, because the fact table is the queue**.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 262" role="img" aria-label="The flow of a fact table moonlighting as a notification queue. At the centre is the fbmsgtocartitem table, which besides its original fb user, fb msg, cart item and bidding key columns gains two more: whether the message was sent successfully, and a retry count. A scheduled job scans the table for rows whose bidding has closed, that have not succeeded, and whose retries are under five, calls Facebook's batch API to send the win notice, then writes back either success or an incremented retry count. Success or five retries is terminal and nothing more is done. Delivery runs at about ninety-nine per cent, and the remainder that can never be sent is picked up by support. The table now carries five identities: order provenance, the target of an LWW upsert, a notification queue, a delivery ledger and a reconciliation anchor." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rnf" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker></defs>
    <rect x="150" y="16" width="280" height="76" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="290" y="34" fill="#d6a45c" font-size="8.8" text-anchor="middle" font-weight="bold">fbmsgtocartitem</text>
    <text x="290" y="50" fill="#9aa4b2" font-size="6.6" text-anchor="middle">fb_user · fb_msg · cart_item · bidding_key</text>
    <rect x="170" y="58" width="115" height="20" rx="4" fill="#233528" stroke="#54b890" stroke-width="1"/>
    <text x="227" y="72" fill="#54b890" font-size="6.4" text-anchor="middle">message sent ok?</text>
    <rect x="295" y="58" width="115" height="20" rx="4" fill="#233528" stroke="#54b890" stroke-width="1"/>
    <text x="352" y="72" fill="#54b890" font-size="6.4" text-anchor="middle">retry count</text>
    <line x1="90" y1="130" x2="180" y2="98" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rnf)"/>
    <rect x="20" y="132" width="140" height="40" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="90" y="148" fill="#4f6df5" font-size="7.4" text-anchor="middle" font-weight="bold">scheduled scan</text>
    <text x="90" y="163" fill="#9aa4b2" font-size="6" text-anchor="middle">closed · unsent · retries&lt;5</text>
    <line x1="160" y1="152" x2="216" y2="152" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rnf)"/>
    <rect x="220" y="132" width="140" height="40" rx="7" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.3"/>
    <text x="290" y="148" fill="#9b6ff0" font-size="7.4" text-anchor="middle" font-weight="bold">FB batch API</text>
    <text x="290" y="163" fill="#9aa4b2" font-size="6" text-anchor="middle">win notice + binding token</text>
    <line x1="360" y1="152" x2="416" y2="152" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rnf)"/>
    <rect x="420" y="132" width="140" height="40" rx="7" fill="#233528" stroke="#54b890" stroke-width="1.3"/>
    <text x="490" y="148" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">write back</text>
    <text x="490" y="163" fill="#9aa4b2" font-size="6" text-anchor="middle">success ✓ or retry +1</text>
    <path d="M 490 132 Q 470 104 432 96" fill="none" stroke="#54b890" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rnf)"/>
    <text x="290" y="204" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">Terminal: success, or 5 retries — then it stops; ~99% delivered, the remainder goes to support</text>
    <text x="290" y="232" fill="#9aa4b2" font-size="7.2" text-anchor="middle">This table's fifth identity: order provenance · LWW upsert · notification queue · delivery ledger · reconciliation anchor</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Scanning the table is dequeuing and the columns are the delivery ledger: two columns replacing a message queue plus a notification service.</figcaption>
</figure>

The flow fits in a sentence: [[rezero-comment-order|an order call]] upserts fbmsgtocartitem, a scheduled job scans that table for rows that are **closed, unsent and under 5 retries**, calls Facebook's batch API to send the win notice (with the [[rezero-identity|binding token]] attached), and writes back either success or an incremented retry count. **Success, or five retries, is terminal** — bounded at-least-once, with no zombie task retrying forever.

The virtue of that design only shows against the textbook version: most teams would stand up an MQ plus a notification service plus a delivery status table for this requirement — three new components, three new consistency boundaries. Here it's **two columns**: the queue is the WHERE clause of a scan, the delivery ledger is the columns themselves, and "did this customer get the notification?" is one SQL query rather than a trace across three systems. fbmsgtocartitem now holds five identities: order provenance, the target of an LWW upsert, a notification queue, a delivery ledger and a reconciliation anchor — **five roles in one table without strain, because each role reads and writes only its own columns, and they all share one granularity of fact: one comment, one row.**

## War story: the rate limit Facebook's docs got us into

The only incident in this chapter. We started by sending notifications one API call at a time — and then **got rate-limited**, win notices jammed up, customers asking in the comments why theirs hadn't arrived, and **the host furious**.

The galling part: the volume we were sending was **well under the rate limit in Facebook's documentation**. We checked against the docs for ages, weren't over it, and were still being limited. The fix was switching to the batch API to send in one packet, after which it was stable at 99% delivery — with the remaining 1% being accounts that simply could not be reached (Facebook-side reasons), picked up by support.

Two lessons: **an external platform's documentation is a reference value, not an SLA** — the real limit can only be measured, especially when your traffic pattern (a burst at the instant bidding closes) isn't what the platform imagined; and **"couldn't be sent" has to be a visible state** — that success column gives the 1% residue somewhere to be queried and someone to catch it, instead of evaporating in silence. Which answers the [[rezero-comment-order|comment chapter]]'s "failures are skipped" lesson from across the series: what we learned the hard way on the comment side, we got right on the notification side.

## Three small rules that each save a subsystem

The rest of this chapter is three rules that each avoid a subsystem:

- **The 10-second rule.** Any operation taking more than 10 seconds becomes an async task that emails the operator when it's done (exporting a round's orders, say). "Should this be async?" turns from a case-by-case architecture discussion into one constant rule, and internal users learn the mental model: **long things arrive in your inbox**. Incidentally, staff log in with company email + OTP anyway — notification and authentication share one chain of trust, and there are no passwords.
- **The chase list isn't a feature, it's a query.** Support needs to phone people about unpaid orders — where does the list come from? The back office's order and cart management pages support composable ad-hoc search (Django Ninja composing filters), so "unpaid cart items in a round that's about to close" is a set of query conditions. **Make the general query mechanism good enough and the demand for bespoke list pages disappears by itself** — [[rezero-console|mechanism to the system, policy to people]]: the system supplies the query, and support decides who to call and in what order.
- **In-app notifications: not built.** In-app notifications imply a whole set: unread state, a notification list, read receipts, push — while email is already sitting there in Google Workspace. "Not worth building yet" is judgment this team showed over and over: **build abstractions and infrastructure when the second real requirement shows up.**

There's one "don't notify" worth collecting too: on a [[rezero-comment-order|re-call]], **customers whose old orders were wiped get no separate notification** — the host saying it on air *is* the notification, and every kindness the system adds leaks a little of the stream's urgency; whoever wins the item again gets the usual win notice. A notification system's boundary isn't only "what to send", it's also "what to deliberately not send".

## What a rebuild would do

This is the shortest rebuild list in the series: **keep it essentially as is**. Two columns as a delivery ledger, a queue made of a table scan, tiered channels, the 10-second rule — all still the right size today. If pressed, two small things:

1. **Make "couldn't be sent" a default filter on the support page.** The residue is already queryable (the success column is there); a rebuild makes it one click — so the 1% list arrives in front of support instead of waiting for somebody to think of querying it.
2. **Abstract when the second channel arrives.** If LINE or SMS marketing genuinely need adding, *then* a notification abstraction (a channel interface plus a unified delivery ledger) earns its keep; before that, any "notification centre" is building a house for an imaginary requirement.

## Reflections

### Reach is bought, not connected

An engineer's instinct is "connect the API and you can send notifications" — in reality every channel has its wall: Facebook has policy (one reply per comment, a 24-hour window), email sinks, SMS costs. What's genuinely scarce isn't the ability to send, it's the right to **be seen**. What "free shipping for a phone number" taught me is that reach should be managed as an asset — it can be purchased (shipping for a number), it depreciates (spam and it's gone), and it should be rationed (the phone is reserved for a final notice). The first question in designing notifications isn't "how do I send this", it's **"what gives me the right to, and why would they look?"**

### The best infrastructure is the infrastructure you didn't build

This chapter is about the things that weren't built from start to finish: no message queue (scan a table), no notification service (two columns), no in-app notifications (email), no chase feature (one query). None of those "nots" is incapacity, they're judgment — **before a requirement is proven, infrastructure is a liability rather than an asset**. And what holds those "nots" up is a few "haves" built especially solidly: composable queries, a table at the right granularity of fact, an off-the-shelf Workspace. Subtraction in infrastructure rests on addition in the foundations.

### A 99% system, a 1% person

The binding funnel catches 99%, notification delivers 99%, chasing payment ends on a phone call — this system is the same shape everywhere: **automation takes the bulk, marks the residue, and hands it to a person**. Plenty of engineers treat "1% still needs a human" as a shameful mark and try to automate it to zero; this system treats the 1% as part of the design: giving it a column, a query, and a role responsible for it. **A notification's end point isn't "sent", it's "somebody catches what didn't arrive"** — swap in any system and the sentence still holds: the quality of automation isn't in how many nines the coverage has, it's in how gracefully the residue lands.
