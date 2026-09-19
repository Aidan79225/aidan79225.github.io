---
title: "The Responsibility Premium: AI Doesn't Collect It, and Doesn't Pay Out"
date: 2026-08-13
category: tech
description: "Hire an employee and they're accountable, so the responsibility isn't all yours; use an AI and it's one hundred percent yours. So how much of a salary is actually buying shared responsibility? This post prices that invisible premium — the org chart as a reinsurance net, how contracts write the two kinds of deal, and why AI meets none of the three conditions for underwriting."
tags:
  - ai
  - leadership
series: "The Craft of Working with AI (2026)"
seriesOrder: 4
translationOf: ai-responsibility-premium
---
## Preface

This post starts from an observation so plain it's nearly a tautology: **hire an employee and they are accountable, so the responsibility isn't (entirely) yours; use an AI and the responsibility is one hundred percent yours.** [[responsibility-funnel|Part one]] called that splitting versus total reflection. But think one step further and it cracks open into a bigger question — **what does hiring actually buy?**

This post's answer: two things. Half of it is labour, and the other half is invisible until something breaks — **shared responsibility**. Understand that half and you read "Your next 10 hires won't be human" completely differently.

## The premium inside a salary

"Responsibility fee" isn't a figure of speech. It has a market price, and it's everywhere:

- **A certification fee is a pure responsibility fee.** An accountant's audit sign-off, an architect's or engineer's structural sign-off — the calculations may have been done by an assistant; what the fee buys is the signature: **when it fails, the licence is attached here**. The market posts an explicit price for pure assumption of risk.
- **An on-call allowance is the naked price of responsibility.** In the week you're on rota, the extra labour may be zero — no incident, no work. What the organisation pays for is standing by to be the one when it happens, completely decoupled from hours worked.
- **A manager's premium is mostly a responsibility fee.** A manager's marginal labour output is often low (more meetings, less code); what the extra money buys is this: whatever the team breaks, there's a name that catches it first.

Lay these out and the structure of pay appears: **salary = labour fee + responsibility fee**. For twenty years we've only discussed the first (throughput, efficiency, the 10x engineer), because the second was too obvious to mention — everyone drawing a salary came with an underwriting function attached, and nobody thought to price it separately. Until AI: **it sells labour only, not cover**. The two got separated for the first time, and only then did we see the price of the second one.

## The org chart is a reinsurance net

With the vocabulary of insurance, you can read an org chart again: it isn't (only) a chain of command, it's a **reinsurance net** — each layer underwrites its own limit and passes the excess up.

What that net looks like, using a real map from my previous job (the battlefield of [[rezero-overview|the live-commerce series]]): **the bidding system was entirely another colleague's** — if that broke, he handled it, he was asked about it, he improved it, and I could go a whole year without knowing how it worked; **the frontend had its own people**; **requirements and scope were underwritten by the PM** — misunderstand the requirement and that's his claim to pay; and **external communication was the CTO's** — including [[rezero-flash-crowd|the poison-message incident]]: we were inside fixing the parser, and **the CTO was outside facing the host and the customer, carrying the face of the whole incident**. One incident: the technical claim retained at the engineer layer, the reputational claim passed up to the CTO — **retain by layer, reinsure the excess**, a textbook insurance structure that felt like nothing in particular while I was inside it.

The frame also unpicks an old knot: how is SRE's blameless postmortem compatible with "someone has to be responsible"? In insurance language, one sentence: **blameless is no-fault insurance** — individual fault isn't pursued (attribution goes to the system), but claims still get paid (improvements are owned, [[sre-postmortem|action items]] are executed by someone). What's abolished is blame, not cover.

To be precise, one more note: "I hired someone, so the responsibility isn't mine" is **layering**, not **disappearance** — to your own manager you still underwrite the sum of the whole team. The real difference is in the next section.

## Contract audit: how law writes the two kinds of deal

Time for specifics. This audit is of contracts — a human contractor's, and an AI tool's terms of service (audited 2026-08-13; I'd meant to check several vendors but network constraints limited me, so this post only quotes GitHub, which I could verify word for word — fortunately it's the largest AI coding vendor, and its terms are representative of the industry).

**Outsource to a human and responsibility is the legal default.** Taiwan's Civil Code chapter on contracts for work (from Article 492) is explicit: the contractor carries **warranty liability for defects** in the completed work — if the work is defective, the orderer may demand repair, reduce payment, terminate, or claim damages. Note: this is the **default**. It applies even if the contract doesn't say so. Pay a person, and the law attaches a policy to the transaction automatically.

**Use AI and the terms tie the responsibility explicitly back to you.** GitHub Copilot's product terms (October 2024 version), in black and white:

> You retain all responsibility for Your Code, **including Suggestions you include in Your Code** or reference to develop Your Code.

The evolution is the interesting part. In March 2026, GitHub replaced its AI product terms with a new *Generative AI Services Terms*, and that sentence was upgraded to:

> you are **solely responsible for any application or agent you create** using (or for use with) Generative AI Services…

See the difference? In 2024 you were responsible for "suggestions you adopted"; in 2026 it's "any application or agent you create". **The more agentic and autonomous the product gets, the more comprehensively the contract binds the responsibility to you** — the vendors understand conservation of responsibility better than anyone, and they've written it into law-firm language as an iron rule.

And damages? GitHub's general terms (March 2025 version) cap liability at **no more than the amount you paid for that product in the 12 months before the incident**. Do the arithmetic: a $20-a-month subscription, your AI "colleague" causes a production incident, and the vendor's ceiling is **$240**. That isn't GitHub being unusually bad — it's the industry-standard clause. In insurance language: **you hired an employee who pays no premium, and its employer states in writing that the coverage is one year's worth of bubble tea.**

Two layers deserve honest separation here: vendors don't refuse to pay for everything — some offer indemnification for copyright infringement, for instance. But that's **financial liability**, transferable on a balance sheet; **accountability** — who improves it, who apologises, whose career it hangs on — doesn't transfer by a single gram. Money can be outsourced. Standing up for it can't.

## Why AI can't underwrite: three conditions, and it meets none

Break "able to underwrite responsibility" apart and it needs three things, all of them:

1. **Skin in the game** (Taleb's old line): the underwriter has to have something to lose — career, licence, bonus, reputation. AI has nothing that can be docked; "punishing a model" is a sentence with no semantics.
2. **Continuous identity**: a line of trust accumulates against a stable subject. A person's underwriting limit grows with tenure and track record; models change version and sessions evaporate, and you can't accumulate trust in something that upgrades next week.
3. **Social recognition**: closure after an incident needs a subject who can stand up — an apology needs a face, a promise needs a name. "The model deeply regrets it" doesn't hold; the host won't accept it, the customer won't accept it, and a court certainly won't.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 320" role="img" aria-label="Two organisational responsibility structures side by side. On the left, a team of people is a reinsurance net: three colleagues each underwrite their own area at the bottom, the PM underwrites requirements above them, and the CTO underwrites external communication at the top, so incidents are retained by layer and the excess passed upward. On the right, one person with an agent fleet is a vertical waterfall: all responsibility from four agents reflects in red arrows straight back to the single person at the top, with no layer absorbing any of it." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="165" y="26" fill="#e6e6e6" font-size="13" text-anchor="middle" font-weight="bold">A team of people: a reinsurance net</text>
    <rect x="95" y="44" width="140" height="44" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="165" y="62" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">CTO: external cover</text>
    <text x="165" y="79" fill="#9aa4b2" font-size="9" text-anchor="middle">the face; reputation claims</text>
    <rect x="95" y="116" width="140" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="165" y="134" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">PM: covers scope</text>
    <text x="165" y="151" fill="#9aa4b2" font-size="9" text-anchor="middle">wrong scope is their claim</text>
    <rect x="20" y="192" width="90" height="46" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="65" y="211" fill="#e6e6e6" font-size="10" text-anchor="middle">Peer: bidding</text>
    <text x="65" y="227" fill="#9aa4b2" font-size="9" text-anchor="middle">fully retained</text>
    <rect x="120" y="192" width="90" height="46" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="165" y="211" fill="#e6e6e6" font-size="10" text-anchor="middle">Peer: frontend</text>
    <text x="165" y="227" fill="#9aa4b2" font-size="9" text-anchor="middle">fully retained</text>
    <rect x="220" y="192" width="90" height="46" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="265" y="211" fill="#e6e6e6" font-size="10" text-anchor="middle">Me: backend</text>
    <text x="265" y="227" fill="#9aa4b2" font-size="9" text-anchor="middle">the poison parser</text>
    <line x1="65" y1="192" x2="140" y2="160" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="165" y1="192" x2="165" y2="160" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="265" y1="192" x2="190" y2="160" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="165" y1="116" x2="165" y2="88" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="165" y="264" fill="#9aa4b2" font-size="10" text-anchor="middle">retained by layer, excess sent up —</text>
    <text x="165" y="280" fill="#9aa4b2" font-size="10" text-anchor="middle">nobody faces all of it alone</text>
    <line x1="330" y1="36" x2="330" y2="290" stroke="#3a4154" stroke-width="1"/>
    <text x="490" y="26" fill="#e6e6e6" font-size="13" text-anchor="middle" font-weight="bold">One person + agent fleet: a waterfall</text>
    <rect x="420" y="44" width="140" height="44" rx="8" fill="#223528" stroke="#54b890" stroke-width="2"/>
    <text x="490" y="62" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">One person</text>
    <text x="490" y="79" fill="#9aa4b2" font-size="9" text-anchor="middle">sole underwriter, all policies</text>
    <rect x="355" y="192" width="60" height="46" rx="8" fill="#262b3a" stroke="#4f6df5"/>
    <text x="385" y="219" fill="#4f6df5" font-size="10" text-anchor="middle">agent</text>
    <rect x="425" y="192" width="60" height="46" rx="8" fill="#262b3a" stroke="#4f6df5"/>
    <text x="455" y="219" fill="#4f6df5" font-size="10" text-anchor="middle">agent</text>
    <rect x="495" y="192" width="60" height="46" rx="8" fill="#262b3a" stroke="#4f6df5"/>
    <text x="525" y="219" fill="#4f6df5" font-size="10" text-anchor="middle">agent</text>
    <rect x="565" y="192" width="55" height="46" rx="8" fill="#262b3a" stroke="#4f6df5"/>
    <text x="592" y="219" fill="#4f6df5" font-size="10" text-anchor="middle">agent</text>
    <path d="M 385 192 C 400 130 440 100 470 88" fill="none" stroke="#e05a7d" stroke-width="1.5"/>
    <path d="M 455 192 C 465 140 475 110 483 88" fill="none" stroke="#e05a7d" stroke-width="1.5"/>
    <path d="M 525 192 C 515 140 505 110 497 88" fill="none" stroke="#e05a7d" stroke-width="1.5"/>
    <path d="M 592 192 C 580 130 540 100 510 88" fill="none" stroke="#e05a7d" stroke-width="1.5"/>
    <text x="490" y="264" fill="#e05a7d" font-size="10" text-anchor="middle">100% reflects back, nobody absorbs —</text>
    <text x="490" y="280" fill="#e05a7d" font-size="10" text-anchor="middle">output of a team, cover of one</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The same output, two responsibility structures. On the left every arrow meets a layer that absorbs it; on the right every arrow lands on the same person.</figcaption>
</figure>

So "two engineers plus a fleet of agents can move like twenty people" (the shared dream of the agent-tool world) has an invisible ceiling: **the output is twenty people, the underwriting capacity is still two.** It's invisible day to day and shows up the moment there's an incident — the organisational version of Amdahl's law, where the non-parallelisable part is called cover. A team of one person plus ten agents has ten times the output and **ten times the responsibility density**, and the second number appears on no efficiency slide anywhere. I think the hidden fatigue many people feel running an AI production line starts here: it isn't the hours, it's **responsibility with nowhere to flow**.

## The dark version: the professional rubber stamp

This argument has a cliff that has to be marked. When "human cover" becomes a scarce resource and regulation starts to require human oversight of AI systems, the market will invent a new job: **the professional rubber stamp** — a role whose purpose is to put a human name on an audit report. Accountable in title, with no power of judgment. This is [[ai-responsibility-design|the last post's]] fake neck, institutionalised; scapegoating, legalised. And it will eat the people with the least bargaining power first.

There's exactly one dividing line, and it deserves to be an iron rule: **responsibility must travel with the power of judgment.** Give someone the A and you give them the power to say no, and the resources to match their neck width; responsibility with no judgment attached isn't delegation, it's a pre-ordered scapegoat. The same test applies to your own organisation: if someone underwrites the AI production line, do they have the power to halt its output? If not, what you're keeping isn't an underwriter, it's insurance fraud.

## Reflection

### I only saw the net after I left it

That map of cover at my previous job — the colleague on bidding, the colleague on frontend, the PM on requirements, the CTO facing outward — felt like nothing more than "division of labour" while I was in it. It took writing the fourth post in this series to see it: that was an **insurance net**, and I was protected by it far more than I realised. On the night of the poison message I thought all the pressure was on the engineering side; looking back, the high-pressure position was outside — while the CTO underwrote the entire incident in front of a furious host, we "only" had to fix a parser. **You have to leave a net before you see that it was catching you the whole time.** And someone working alone with an agent fleet has no such net from day one — that deserves to be said out loud rather than papered over with "efficiency".

### The EM's job description quietly changed versions

In the era of leading people, the core of management was arranging output: who does what, delivered when. In the era of leading AI, arranging output is increasingly automatic and **the core of management migrates to arranging responsibility**: whose name is this agent fleet under? Is their underwriting limit enough? Limits grow with a record of trust — so who is helping a junior accumulate their first policy? [[responsibility-funnel|Part one]] said juniors should "be the neck of a small funnel first"; in this post's language: **hiring a junior isn't buying their current output (AI is far cheaper at that), it's investing in a future underwriter.** An organisation that only counts throughput can't make that calculation. An organisation that has been through one major incident always can.

### For the one-person teams: draw your retention limit

Last, for people who, like me, run a fleet alone in the evenings. Insurance has a term — **retention**: the maximum loss you absorb yourself. With no reinsurance net, a one-person team's only risk control is drawing that retention clearly: **let the AI line carry only what you can afford to pay out on**. My version is crude: a blog post is wrong — fix it, add a line to the changelog, affordable; [[travel-split|the travel-split tool]] breaks — friends complain, affordable; and if one day it wants to touch other people's money or other people's data, that isn't a question of adding tests, it's a question of **this policy exceeding my capacity to underwrite**. A tool's capability keeps growing; your retention limit does not grow automatically with it — so before you let the fleet take on something new, ask: can I cover this one?

Earlier in this series: [[responsibility-funnel|#1 the responsibility funnel]] · [[ai-incident-clock|#2 a clock on the neck]] · [[ai-responsibility-design|#3 the neck on the board]]
