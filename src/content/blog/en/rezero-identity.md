---
title: "Identity and Accounts: Who Exactly Is the Person Commenting?"
date: 2026-07-26
category: tech
description: "The most underestimated chapter in live commerce: the person ordering may have no account at all. Separating identity from account, holding stock against an identity, Facebook's ASID/PSID privacy wall, a three-layer binding funnel, and the real case of someone checking out on a family member's account."
tags:
  - war-story
  - live-commerce
  - identity
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 4
comments: true
draft: false
translationOf: rezero-identity
---
The FSM in [[rezero-comment-order|the last chapter]] worked out "who bought what" — except that "who" is only a string of digits Facebook handed us. They may never have registered on our platform, may log in tomorrow, may never log in at all. And stock has to be held for them **right now**. This chapter is the problem I called "the most underestimated in the series" back in [[rezero-overview|the overview]]: **who exactly is the person commenting.**

## The order comes first, the account second

Ordinary e-commerce runs register → log in → order. Live commerce turns that completely around: **at the moment of ordering, the other party may be nothing at all** — not a member, no app installed, never logged in. All you know is that Facebook says some user id typed `2601+1`.

The solution we had is, in hindsight, textbook layering: **identity and account are two different things**.

- **An identity is a fact**: an fb user, an ig user, an own-studio user — the platform says "this id left a comment", and that's true without anyone registering. The moment an FSM batch hits a key, the fb user entity is created on the spot and the order is attached to it.
- **An account is an aggregate**: it appears the day the customer logs into the app. It doesn't own orders, it **claims** them — pulling the orders of every identity bound to it into one view.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 274" role="img" aria-label="The layered model of identity and account. On the left, three identity entities: an fb user carrying a PSID, an ig user, and an own-studio user — an identity is a fact and exists the moment a comment is made. On the right is the account: an aggregate that only appears after login, claiming many identities through a one-to-many binding. At the bottom left, the cart item that reserves stock hangs off the fb user identity rather than the account, joined through an fbmsgtocartitem association table carrying the message id and bidding key id for traceability. Between account and cart item runs a dashed aggregate view: claiming pulls orders in, so orders never have to move." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rif" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rig" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <text x="103" y="22" fill="#9b6ff0" font-size="9" text-anchor="middle" font-weight="bold">identity: a fact</text>
    <rect x="28" y="32" width="150" height="36" rx="6" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.4"/>
    <text x="103" y="47" fill="#9b6ff0" font-size="8.4" text-anchor="middle" font-weight="bold">fb user (PSID)</text>
    <text x="103" y="60" fill="#9aa4b2" font-size="6.6" text-anchor="middle">created on the spot, at comment time</text>
    <rect x="28" y="78" width="150" height="30" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="103" y="97" fill="#e6e6e6" font-size="8" text-anchor="middle">ig user</text>
    <rect x="28" y="118" width="150" height="30" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="103" y="137" fill="#e6e6e6" font-size="8" text-anchor="middle">own-studio user</text>
    <text x="486" y="22" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">account: an aggregate</text>
    <rect x="406" y="52" width="160" height="66" rx="8" fill="#233528" stroke="#54b890" stroke-width="1.6"/>
    <text x="486" y="76" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">account</text>
    <text x="486" y="92" fill="#9aa4b2" font-size="6.8" text-anchor="middle">appears only after login</text>
    <text x="486" y="105" fill="#9aa4b2" font-size="6.8" text-anchor="middle">claims identities' orders, 1:N</text>
    <line x1="178" y1="50" x2="404" y2="72" stroke="#54b890" stroke-width="1.2" marker-end="url(#rig)"/>
    <line x1="178" y1="93" x2="404" y2="86" stroke="#54b890" stroke-width="1.2" marker-end="url(#rig)"/>
    <line x1="178" y1="133" x2="404" y2="102" stroke="#54b890" stroke-width="1.2" marker-end="url(#rig)"/>
    <text x="290" y="60" fill="#54b890" font-size="6.8" text-anchor="middle">binding (can be multiple)</text>
    <rect x="28" y="196" width="230" height="52" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="143" y="216" fill="#d6a45c" font-size="8.8" text-anchor="middle" font-weight="bold">cart item (reserves stock)</text>
    <text x="143" y="232" fill="#9aa4b2" font-size="6.8" text-anchor="middle">attached to the fb user, not the account</text>
    <path d="M 28 62 C 4 95, 4 165, 26 210" fill="none" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rif)"/>
    <text x="66" y="172" fill="#4f6df5" font-size="6.6" text-anchor="middle">fbmsgtocartitem</text>
    <text x="66" y="183" fill="#9aa4b2" font-size="6.2" text-anchor="middle">msg id · bidding key id</text>
    <path d="M 486 118 Q 460 210 260 224" fill="none" stroke="#54b890" stroke-width="1.1" stroke-dasharray="4 3" marker-end="url(#rig)"/>
    <text x="420" y="196" fill="#9aa4b2" font-size="6.8" text-anchor="middle">aggregate view: claim it, don't move it</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Identity is a fact, account is an aggregate: an order stays attached to its identity forever, and the account only pulls its bound identities into one view.</figcaption>
</figure>

The key payoff of that split: **an order never has to move house**. Binding, unbinding, adding another identity — all of it touches only the association, never the order. Everything that touches money and stock stays pinned to the fact it was born from.

## Every column is an id: the data model we had

The cart table looked like this back then:

- **One cart item table, with content type + object id (a generic foreign key) marking the source**. An order from a live-stream message and an order added by hand on the storefront share one table and one set of quantity-adjustment and checkout logic; only "where it came from" differs. The two carts from [[rezero-overview|the overview]] have a data-model answer: **one table, polymorphic source**.
- Message orders also got an association table, **fbmsgtocartitem: (fb_user_id, fb_msg_id, cart_item_id, bidding_key_id)** — every column an id. Which means every order is traceable: which person, which comment, which sale round. A complaint of "I definitely typed +2, why is it +1?" gets reconstructed by following the msg id; a host re-calling an item gets cleanly wiped by following the bidding key id.
- Sharp eyes will notice `fb_user_id` is already reachable through `fb_msg` — putting it in the association table is a **deliberate violation of 3NF**: the message table is huge, and the hottest query in the system (LWW overwrites need "this person's orders for this key") can't be made to travel through it. This is textbook-safe denormalisation, because what's copied is an **immutable column** — a message's author never changes, so the copy can never drift. The practical test for [[ddia-data-models|normalisation]] is hiding right here: **copy an immutable column and the risk is near zero; copy a mutable one and you've signed a lifetime synchronisation contract.**

## Facebook won't tell you who they are: ASID and PSID

The real boss fight is at binding. Facebook's privacy design is that **the same person has different ids on different surfaces**: comments and Messenger give you a **PSID** (page-scoped id), while a customer logging into your app with Facebook gives you an **ASID** (app-scoped id), and **neither can be derived from the other**. That isn't a bug, it's a wall Facebook built: it doesn't want you casually joining "the person who commented on a page" to "a member of your app". The narrow door they leave open is the Business Mapping API (`ids_for_pages` / `ids_for_apps`), which requires the app and the page to sit under the same Business Manager and pass business verification — and coverage is never 100%.

So binding became a funnel, catching a batch at each layer:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="A three-layer binding funnel. At the top: every fb user who ordered by comment, one hundred per cent. Layer one: when the customer logs into the app, an ASID to PSID mapping is attempted automatically, and most bind here. Layer two: a private-reply message announcing they won the item, carrying a one-time token link — the customer taps it, logs in, and the binding completes, so the notification itself is the binding opportunity, catching another batch. Layer three: the remaining one per cent or so handled by support by hand, with multiple bindings supported. What is left approaches zero." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rfn" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="60" y="16" width="460" height="30" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="290" y="35" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">every fb user who ordered by comment (100%)</text>
    <line x1="290" y1="46" x2="290" y2="60" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rfn)"/>
    <rect x="100" y="64" width="380" height="34" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="290" y="78" fill="#e6e6e6" font-size="8.2" text-anchor="middle" font-weight="bold">Layer 1: log into the app → auto ASID↔PSID mapping</text>
    <text x="290" y="92" fill="#9aa4b2" font-size="6.8" text-anchor="middle">Business Mapping API · most bind here</text>
    <line x1="290" y1="98" x2="290" y2="112" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rfn)"/>
    <rect x="140" y="116" width="300" height="34" rx="6" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.2"/>
    <text x="290" y="130" fill="#9b6ff0" font-size="8.2" text-anchor="middle" font-weight="bold">Layer 2: private-reply win notice + one-time token</text>
    <text x="290" y="144" fill="#9aa4b2" font-size="6.8" text-anchor="middle">the notice is the binding chance · tap, log in, bound</text>
    <line x1="290" y1="150" x2="290" y2="164" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rfn)"/>
    <rect x="185" y="168" width="210" height="34" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="290" y="182" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">Layer 3: support, by hand (~1%)</text>
    <text x="290" y="196" fill="#9aa4b2" font-size="6.8" text-anchor="middle">multiple bindings · the hard cases</text>
    <text x="290" y="222" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">the remainder approaches 0 — but is never 0</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The binding funnel: automatic mapping takes the bulk, the token in the win notice takes another batch, support closes out the tail.</figcaption>
</figure>

Layer two is worth pausing on. The win notice had to be sent anyway (a private reply telling the customer "you got it"), so attach a link carrying a one-time token, and the moment they tap it and log in you hold both the PSID (the message channel) and the ASID (the login) — **the binding is deterministic, no guessing**. Turning a matching problem into a flow problem is the same move as turning "detecting intent to order" into a DB lookup in the last chapter: **don't force the hard problem, convert it into an easy one.** Every completed sale automatically shrinks the unbound tail, and only what's left goes to a human.

## The reality of binding: a family member's account

A real case: one customer called their orders from **their own Facebook**, but at checkout kept logging in on a desktop as **a family member's account**. The orders hung off their fb user while the account belonged to someone else — and it was settled by support doing a **multiple binding**: attach both identities to the same account, and the orders were all there.

That case is the best possible testimony for the identity model:

- **identity ≠ person.** One person shows up wearing several identities: their own Facebook, a family member's account, a new id after switching platforms. There is no "person" entity in the system, only identities and aggregates.
- **account to identity has to be 1:N, and N grows.** Multiple binding isn't a workaround, it's what the model was always supposed to look like.
- Best of all: **the notorious "account merge" problem is sidestepped entirely by the 1:N model.** Two identities each accumulate orders, and later turn out to be one person — the traditional move is to merge two accounts, which is an irreversible data migration whose conflict handling is every bit as hair-raising as [[ddia-replication|conflict resolution in multi-leader replication]]. In a model where orders hang off identities and the account only aggregates, the answer is **one more association row**: a single insert, revocable any time. Merging is moving house; aggregating is adding a nameplate — and anything you can solve with a nameplate should never involve moving house.

Binding is of course authorisation — attaching an identity to an account hands that identity's orders to that account. Bind the wrong person and you've moved someone else's orders. That risk line belongs to the risk chapter.

## What the identity layer would change in a rebuild

Honestly, I'd keep almost all of this: the split is right, orders on identities is right, the funnel is right, 1:N is right. A rebuild adds three things:

1. **Promote identity into a named layer.** Back then fb user was a concrete table, the Instagram equivalent was handled by a different colleague, and the own studio was a third thing again. A rebuild would define one identity interface first (source + external id + per-source metadata), with fb, ig and own-studio as instances. Naming looks like navel-gazing, but it decides whether the next platform to arrive is "one more identity" or "another parallel stack".
2. **The binding association carries provenance: `bound_via` (auto / token / manual), timestamp, operator.** Manual binding by support especially needs an audit trail — binding is authorisation, and the human channel is the easiest to get wrong and the hardest to hold anyone accountable for. That's also where this chapter meets the permissions chapter and the risk chapter.
3. **Turn the funnel into a dashboard.** Each layer's binding rate is a product metric, not engineering trivia: a drop in the automatic layer means the API broke, a drop in the token layer means notifications aren't landing, a backlog in the manual layer means support needs more people. What's left goes into a ticket queue rather than scattered through support's inbox. The 1% of manual work isn't a design failure, it's the funnel's natural residue — but it has to be **visible, queued and trackable**.

## Reflections

### There is no "person" in the system, only identities

The deepest lesson here is admitting that **a person is not an id**. A designer's most natural arrogance is assuming one person, one account, account equals human — and then reality shows you the customer checking out on a family member's account, the customer with three Facebook profiles, the customer who never registers but orders every month. The model we had held up because from day one it never pretended to know a "person": it recorded only "which identity did what", left "are these identities the same person?" to bindings to express, and allowed the answer to be added to at any time. **A humble data model outlives a clever one.**

### The platform's wall sets your floor; flow design sets your ceiling

We couldn't climb the ASID/PSID wall — the mapping Facebook won't give you, you don't get. But "attach a token to the win notice" meant most bindings never needed that door opened at all: the user walks over and connects the two identities themselves. Build cross-platform products long enough and you learn this: **your identity model's floor is set by what the platform is willing to give you; its ceiling is set by the paths your flows lay down for the user.** Complaining about API limits is unproductive; turning every unavoidable touchpoint — notification, checkout, support — into a binding opportunity is not.

### That 1% of manual work deserves to be treated as a real feature

What the funnel can't catch was bound by support, one case at a time — including the family-account kind that a machine will never guess right. Here I want to credit something we did well: **our support tooling was built as a real feature, and it was good**. The team's whole origin was a boss fed up with unusable third-party tools deciding to build something better; plenty of engineers came from Grindr and cared intensely about UX on top of engineering quality — internal tools were first-class citizens from day one, with proper interfaces for multiple binding and cart adjustments. So support's difficulty was in the cases themselves (whether to bind a family account is a judgment call, not an operation), not in tools fighting them. That shaped a judgment I've held since: most companies treat internal tools as second-class, "good enough if it works" — but **support's operating speed is your complaint response time, and internal tooling UX is part of the external experience**. An engineer's instinct is to automate 1% down to 0.1%, but there will always be a last mile the system can't catch, and designing the interface for "a human does this" in advance is the mark of a mature system. It's the same thing I kept repeating later when leading an SRE team: the end point of automation isn't replacing people, it's leaving people only the work that deserves a person.
