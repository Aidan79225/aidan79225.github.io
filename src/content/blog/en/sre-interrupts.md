---
title: "Operational Interrupts: What Kills Productivity Isn't the Workload, It's Fragmented Time"
date: 2026-08-04
category: tech
description: "Ticket after ticket, an ad-hoc question, a casual page — each interrupt looks small on its own, yet together they can leave an engineer \"very busy with nothing to show\" for a whole day. Because the real cost of an interrupt isn't the few minutes it takes; it's chopping the remaining time into pieces too small for deep work. This post covers why interrupts are so expensive, and the team-level solution: the interrupt shield, trading one person's focus for the focus of the whole team."
tags:
 - sre
 - reliability
series: "Google SRE — Reading Notes"
seriesOrder: 17
comments: true
draft: false
translationOf: sre-interrupts
---
[[sre-alerting-oncall|The on-call post]] covered "how to design alerts and who carries the pager"; [[sre-toil|the toil post]] covered "the 50% guardrail so operations doesn't eat all the engineering time". But between those two, something is missing that happens every day yet is rarely managed as a problem: **interrupts** — the stream of tickets, the ad-hoc questions, the pages tossed your way. Each looks small on its own, yet together they can leave an engineer "very busy, but nothing moved forward" for a whole day. This post covers why interrupts are so expensive, and how to manage them at the team level.

## The cost of an interrupt isn't time; it's fragmented time

First, break an intuition: the real price of a 5-minute interrupt **isn't those 5 minutes**. It's that it broke your flow, and afterwards it takes 20 or 30 minutes to climb back into the state of thought you were in (ramp-up). So what interrupts kill isn't "working time"; it's **"continuous time in which deep work is possible"**. The cruel part: the same total amount of interruption, scattered versus gathered into one block, produces wildly different output:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="The cost of interrupts is fragmented time. Legend: green is real work, amber is the ramp-up after an interrupt to get back into the zone, red is the interrupt itself. Row one, a fragmented day: six red interrupts scattered along one work timeline, each followed by an amber ramp-up, leaving the green work chopped into small fragments with almost no complete deep work. Row two, interrupts batched: the same number of interrupts gathered into one red block at the far right, leaving a long uninterrupted green stretch of deep work on the left. Both rows have the same total interrupt time, but row two's deep work is one whole block. Conclusion: the cost of an interrupt isn't the time it takes, it's fragmenting what's left until deep work is impossible." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">The cost of interrupts: not time, but fragmentation</text>
    <rect x="150" y="24" width="10" height="8" fill="#223528" stroke="#54b890" stroke-width="1"/><text x="164" y="31" fill="#9aa4b2" font-size="7" text-anchor="start">work</text>
    <rect x="196" y="24" width="10" height="8" fill="#2e2a1a" stroke="#d6a45c" stroke-width="1"/><text x="210" y="31" fill="#9aa4b2" font-size="7" text-anchor="start">ramp-up</text>
    <rect x="270" y="24" width="10" height="8" fill="#331f22" stroke="#d66b5c" stroke-width="1"/><text x="284" y="31" fill="#9aa4b2" font-size="7" text-anchor="start">interrupt</text>
    <text x="40" y="52" fill="#e6e6e6" font-size="8.4" text-anchor="start" font-weight="bold">① a fragmented day</text>
    <rect x="40" y="58" width="500" height="30" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/>
    <rect x="88" y="58" width="12" height="30" fill="#331f22" stroke="#d66b5c" stroke-width="1"/><rect x="100" y="58" width="22" height="30" fill="#2e2a1a" stroke="#d6a45c" stroke-width="0.8"/>
    <rect x="160" y="58" width="12" height="30" fill="#331f22" stroke="#d66b5c" stroke-width="1"/><rect x="172" y="58" width="22" height="30" fill="#2e2a1a" stroke="#d6a45c" stroke-width="0.8"/>
    <rect x="232" y="58" width="12" height="30" fill="#331f22" stroke="#d66b5c" stroke-width="1"/><rect x="244" y="58" width="22" height="30" fill="#2e2a1a" stroke="#d6a45c" stroke-width="0.8"/>
    <rect x="304" y="58" width="12" height="30" fill="#331f22" stroke="#d66b5c" stroke-width="1"/><rect x="316" y="58" width="22" height="30" fill="#2e2a1a" stroke="#d6a45c" stroke-width="0.8"/>
    <rect x="376" y="58" width="12" height="30" fill="#331f22" stroke="#d66b5c" stroke-width="1"/><rect x="388" y="58" width="22" height="30" fill="#2e2a1a" stroke="#d6a45c" stroke-width="0.8"/>
    <rect x="448" y="58" width="12" height="30" fill="#331f22" stroke="#d66b5c" stroke-width="1"/><rect x="460" y="58" width="22" height="30" fill="#2e2a1a" stroke="#d6a45c" stroke-width="0.8"/>
    <text x="290" y="104" fill="#e08b7c" font-size="7.8" text-anchor="middle" font-weight="bold">complete deep work ≈ none (all fragments)</text>
    <text x="40" y="130" fill="#e6e6e6" font-size="8.4" text-anchor="start" font-weight="bold">② interrupts batched into one block</text>
    <rect x="40" y="136" width="500" height="30" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/>
    <rect x="452" y="136" width="14" height="30" fill="#2e2a1a" stroke="#d6a45c" stroke-width="0.8"/>
    <rect x="466" y="136" width="74" height="30" fill="#331f22" stroke="#d66b5c" stroke-width="1"/>
    <text x="244" y="155" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">uninterrupted deep work (one whole block)</text>
    <text x="503" y="154" fill="#e08b7c" font-size="6.4" text-anchor="middle">interrupts</text>
    <text x="290" y="182" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">same total interruption → deep work = one whole block</text>
    <text x="290" y="212" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">An interrupt's cost isn't the time it takes; it's fragmenting what's left until deep work is impossible</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Both rows have <b>exactly the same total interrupt time</b>, and wildly different output. <b>①</b> Scattered interrupts each drag a <b style="color:#d6a45c">ramp-up back into the zone</b> behind them, chopping the work into small fragments — <b style="color:#e08b7c">deep work drops to nearly zero</b>. <b>②</b> The same interrupts gathered into one block leave <b style="color:#54b890">one long uninterrupted stretch</b> on the left. So managing interrupts isn't managing the "total"; it's managing "<b>fragmentation</b>" — which is why "interrupted a little at any time" hurts far more than "interrupted once, in a batch"</figcaption>
</figure>

## Interrupt shield: trade one person's focus for the whole team's

Since fragmentation is the real enemy, the team-level solution is clear: **don't give everyone a slice of the interrupts** (result: everyone fragmented, zero deep work across the team); instead, appoint one person (or a pair) as the "**shield**" for this period, taking **all** interrupts, so the rest get whole, uninterrupted time. Rotate next round:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Interrupt shield, one person shields. Left, everyone takes a slice: four people's days each chopped by three red interrupts, all four fragmented, deep work near zero. Right, one person shields: the first person's whole bar is red, taking every interrupt this round; the other three bars are entirely green, whole uninterrupted focus time, rotating next week. Conclusion: concentrating interrupts on one person trades that person's focus for the focus of the other N minus one." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Interrupt shield: one person shields, the rest focus</text>
    <line x1="290" y1="30" x2="290" y2="158" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="145" y="42" fill="#e08b7c" font-size="8.6" text-anchor="middle" font-weight="bold">everyone takes a slice</text>
    <text x="145" y="54" fill="#9aa4b2" font-size="7" text-anchor="middle">each takes 1/4 of the interrupts</text>
    <rect x="36" y="62" width="218" height="16" rx="2" fill="#223528" stroke="#54b890" stroke-width="0.8"/><rect x="70" y="62" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="130" y="62" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="190" y="62" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/>
    <rect x="36" y="84" width="218" height="16" rx="2" fill="#223528" stroke="#54b890" stroke-width="0.8"/><rect x="58" y="84" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="120" y="84" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="200" y="84" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/>
    <rect x="36" y="106" width="218" height="16" rx="2" fill="#223528" stroke="#54b890" stroke-width="0.8"/><rect x="90" y="106" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="150" y="106" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="212" y="106" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/>
    <rect x="36" y="128" width="218" height="16" rx="2" fill="#223528" stroke="#54b890" stroke-width="0.8"/><rect x="64" y="128" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="140" y="128" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="196" y="128" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/>
    <text x="145" y="160" fill="#e08b7c" font-size="7.6" text-anchor="middle" font-weight="bold">4 people all fragmented → deep work ≈ 0</text>
    <text x="435" y="42" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">one person shields</text>
    <text x="435" y="54" fill="#9aa4b2" font-size="7" text-anchor="middle">the shield takes all, the rest uninterrupted</text>
    <rect x="326" y="62" width="218" height="16" rx="2" fill="#331f22" stroke="#d66b5c" stroke-width="1.1"/><text x="435" y="74" fill="#e08b7c" font-size="7.4" text-anchor="middle" font-weight="bold">shield: takes every interrupt</text>
    <rect x="326" y="84" width="218" height="16" rx="2" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="435" y="96" fill="#54b890" font-size="7.4" text-anchor="middle">full focus</text>
    <rect x="326" y="106" width="218" height="16" rx="2" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="435" y="118" fill="#54b890" font-size="7.4" text-anchor="middle">full focus</text>
    <rect x="326" y="128" width="218" height="16" rx="2" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="435" y="140" fill="#54b890" font-size="7.4" text-anchor="middle">full focus</text>
    <text x="435" y="160" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">3 people fully focused · rotate next week</text>
    <text x="290" y="190" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">Trade 1 person's focus for N−1 people's focus — and rotate</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">On the left everyone takes a slice of the interrupts, and the result is <b style="color:#e08b7c">all four fragmented</b>, zero deep work across the team. On the right one person is the <b style="color:#e08b7c">shield</b> taking every interrupt, and the other three get <b style="color:#54b890">whole uninterrupted time</b>, rotating next week. It's a very good trade: <b>one person's focus for the focus of the other N−1</b>. The companion rule is that the shield must <b>polarise</b> their time — this period is full-time interrupt handling; don't take tickets with one hand and push a project with the other, which does both badly</figcaption>
</figure>

## Reflections

### I measure team capacity by "whole blocks of time", not by "busyness"

The longer I lead teams, the less I trust "busy". A team can have everyone busy, everyone working late, every ticket answered, Slack read and replied within seconds — and not one quarterly goal moved. Because not a single person got three continuous hours to do the thing that actually needed thought. **Busy is an illusion fed by interrupts; output comes from unbroken blocks of time.** So when I review team health now, I don't look at "is everyone busy"; I look at a more honest number: **this week, how many "uninterrupted two-hour blocks" did each person get?** That number maps almost directly onto whether we can produce anything that requires a brain. Since making it a metric, I've become much stingier about meetings, about "let's sync quickly", about casual @-mentions — because I know what I'm cutting isn't a few minutes; it's someone's whole stretch of flow.

### Half-hearted "available" is the worst state

"I'll work on the project and keep an eye on Slack" sounds responsible, but it's the worst of all states: you aren't truly focused (ready to be pulled away at any moment, thinking stuck in the shallows), and your response to interrupts is slow too (stuck in the project's context, unable to switch). **50/50 available is empty on both focus and responsiveness.** That's the essence of the interrupt shield — it forces you to **polarise**: either full-time shield, or fully protected; don't sit in the middle. I apply the same rule to myself: when I decide today is deep work, I turn notifications off and tell the team plainly, "today, go to X; don't come to me". That isn't shirking — quite the opposite: it hands "being responsible for responding" clearly to the person whose job it is right now, instead of everyone half-catching it absent-mindedly.

### A rising interrupt rate is a symptom, not "time to hire"

The last is the judgment a lead most easily gets wrong. When a service's tickets keep growing, the reflex is "we're short-handed; add someone to take them". But a **steadily** rising interrupt rate is almost always a symptom of **something broken upstream**: a service that never did its [[sre-production-readiness|production readiness]], a pile of [[sre-toil|toil]] that should have been automated and wasn't, a stale runbook that lets the same question be asked again and again. Adding a person to absorb interrupts only absorbs the symptom, and makes the real disease harder to see — you've paid for "looks like we're still coping", at the price of never fixing the source that keeps generating tickets. So I track "interrupt volume" as an SLI: when it climbs steadily, what needs fixing isn't the rota; it's the source. And that ties back to SRE's underlying belief — **it does reliability engineering on "people's time" too: focus, like a service's normal operation, is a resource that erodes and must be actively protected.**
