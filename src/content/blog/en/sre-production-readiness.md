---
title: "Production Readiness Review (PRR): What Makes a Service Worth SRE Taking Over"
date: 2026-08-04
category: tech
description: "The previous fifteen posts were all about \"the service is already live; how do we make it more reliable\", but an earlier question never got asked: what qualifies a new service to launch at all, and to be worth SRE taking over and carrying its pager? Google SRE's answer is a gate — the Production Readiness Review. This post covers what it reviews, why it has to happen before launch, and the lever behind it that's most useful to a lead: SRE can say no."
tags:
 - sre
 - reliability
series: "Google SRE — Reading Notes"
seriesOrder: 16
comments: true
draft: false
translationOf: sre-production-readiness
---
The previous fifteen posts almost all talked about "the service is **already** live; how do we make it more reliable" — SLOs, monitoring, postmortems, degradation. But one earlier question never got asked: **what qualifies a new service to launch at all, and to be worth SRE taking over and carrying its pager?** Google SRE's answer is a gate — the **Production Readiness Review (PRR)**. This post covers that gate: what it reviews, why it must happen **before** launch, and the lever behind it that's most useful to a lead — **SRE can say no.**

## PRR is a gate, not a document

Start with the root of the problem. The traditional approach is that development finishes the service and throws it over the wall for ops/SRE to "look after". But there's a fatal asymmetry here: **features can be added slowly afterwards; reliability can't.** Discovering after launch that there's no monitoring, no rollback, that one dependency going down takes everything with it — patching that then is the most expensive way to patch, and usually comes with a 3am incident attached. SRE's solution is direct: before the service launches and SRE takes it over, it passes a **PRR**. It isn't a form for bureaucratic sign-off; it's **a checklist that turns reliability into a "hard launch gate"**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="PRR is a gate before launch. On the left, Dev builds the service; features OK doesn't mean launch-ready. In the middle, the PRR Production Readiness Review gate, a checklist: one, SLO defined; two, monitoring plus alerts; three, load test, capacity and load shedding; four, can a release roll back fast; five, what if a dependency dies, must degrade; six, runbook usable at 3am. On the right, two branches: pass, and SRE takes over and shares the pager; fail, and it's sent back to fix, with the pager staying with Dev until then. The point is that this power to refuse until it's done is PRR's real force." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="pr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">PRR: a gate before launch</text>
    <rect x="14" y="82" width="120" height="88" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/>
    <text x="74" y="106" fill="#e6e6e6" font-size="8.6" text-anchor="middle" font-weight="bold">Dev</text>
    <text x="74" y="122" fill="#9aa4b2" font-size="7.4" text-anchor="middle">builds the service</text>
    <text x="74" y="146" fill="#d6a45c" font-size="7.4" text-anchor="middle">features OK</text>
    <text x="74" y="158" fill="#d6a45c" font-size="7.4" text-anchor="middle">≠ launch-ready</text>
    <line x1="134" y1="126" x2="166" y2="126" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pr)"/>
    <rect x="168" y="32" width="214" height="186" rx="10" fill="#26324a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="275" y="50" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">PRR · Production Readiness Review</text>
    <rect x="180" y="58" width="190" height="20" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="188" y="72" fill="#e6e6e6" font-size="7.4" text-anchor="start">① SLO defined?</text>
    <rect x="180" y="82" width="190" height="20" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="188" y="96" fill="#e6e6e6" font-size="7.4" text-anchor="start">② monitoring + alerts (golden signals)</text>
    <rect x="180" y="106" width="190" height="20" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="188" y="120" fill="#e6e6e6" font-size="7.4" text-anchor="start">③ load test / capacity / load shedding</text>
    <rect x="180" y="130" width="190" height="20" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="188" y="144" fill="#e6e6e6" font-size="7.4" text-anchor="start">④ can a release roll back fast?</text>
    <rect x="180" y="154" width="190" height="20" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="188" y="168" fill="#e6e6e6" font-size="7.4" text-anchor="start">⑤ a dependency dies → degrade?</text>
    <rect x="180" y="178" width="190" height="20" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="188" y="192" fill="#e6e6e6" font-size="7.4" text-anchor="start">⑥ runbook: usable at 3am</text>
    <line x1="382" y1="96" x2="418" y2="82" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pr)"/><text x="400" y="76" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">pass</text>
    <line x1="382" y1="150" x2="418" y2="172" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pr)"/><text x="400" y="166" fill="#e08b7c" font-size="7" text-anchor="middle" font-weight="bold">fail</text>
    <rect x="420" y="56" width="148" height="52" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.4"/>
    <text x="494" y="76" fill="#54b890" font-size="8.2" text-anchor="middle" font-weight="bold">SRE takes over</text>
    <text x="494" y="92" fill="#9aa4b2" font-size="7.2" text-anchor="middle">shares the pager</text>
    <rect x="420" y="150" width="148" height="52" rx="8" fill="#331f22" stroke="#d66b5c" stroke-width="1.4"/>
    <text x="494" y="170" fill="#e08b7c" font-size="8.2" text-anchor="middle" font-weight="bold">sent back to fix</text>
    <text x="494" y="186" fill="#9aa4b2" font-size="7.2" text-anchor="middle">pager stays with Dev</text>
    <text x="290" y="232" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">SRE won't take an "unoperable" service — PRR makes reliability a hard launch gate</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The key isn't the checklist itself; it's the <b>fork</b> on the right: <b style="color:#54b890">pass</b>, and SRE takes over and shares the pager; <b style="color:#e08b7c">fail</b>, and it goes back to be fixed — and until it's fixed, <b>the pager stays with Dev</b>. This power of "not done? don't expect us to take it" is PRR's real force. It turns the bounced cheque of "we'll add monitoring after launch" into <b>a list that has to be cashed before launch</b></figcaption>
</figure>

## What PRR reviews: accepting every previous post, before launch

The PRR list looks intimidating, but you'll notice **nothing on it is new** — it's this series' lessons, accepted line by line on one form before launch:

- **Is the SLO defined?** ([[sre-slo|SLI/SLO]]) Without a target there's no way to judge "reliable enough", and the alerting and capacity behind it lose their baseline.
- **Monitoring and alerting?** ([[sre-monitoring|the four golden signals]], [[sre-alerting-oncall|alert on symptoms]]) From the first moment of launch it must be visible, and able to wake someone when it truly hurts.
- **Capacity and load testing?** ([[sre-cascading-failures|load shedding]]) Know where your limits are, and shed actively under overload rather than swallowing until everything rots together.
- **Release and rollback?** ([[sre-automation-release|release engineering]]) When it breaks, can you roll back in one step, fast and safely — the most-used escape hatch after launch.
- **Dependencies and failure modes?** ([[sre-cascading-failures|degradation]]) When a dependency dies, does it degrade to usable, or does the whole chain fall?
- **Runbook and docs?** ([[sre-incident-response|incident response]]) The on-call can operate it at 3am by following along, rather than only the author knowing.

In one sentence: **PRR introduces no new requirements; it compresses the whole series' practice into one check-up before launch.** Everything you learned in the earlier posts — PRR is the acceptance form.

## Why it must be "before launch": shift reliability left

The same gap — no rollback, no degradation path — costs wildly different amounts depending on when you fill it:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 200" role="img" aria-label="The cost curve of shifting reliability left. The horizontal axis is the service lifecycle: design, build, the PRR launch gate, and post-launch incident. The vertical axis is the cost of fixing a reliability gap, rising quickly to the right. Fixing at the PRR gate sits to the left, low cost, daytime and cheap; waiting until it explodes as a 3am incident after launch sits to the right, high cost, very expensive and with a postmortem attached. PRR's value is moving the expensive fixes on the cost curve left, to when they're still cheap." style="width:100%;max-width:580px;height:auto;margin:0 auto;">
    <defs><marker id="pr2" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Shift reliability left: the earlier the fix, the cheaper</text>
    <line x1="44" y1="150" x2="552" y2="150" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#pr2)"/>
    <line x1="44" y1="150" x2="44" y2="34" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#pr2)"/>
    <text x="30" y="92" fill="#9aa4b2" font-size="7.6" text-anchor="middle" transform="rotate(-90 30 92)">cost to fix</text>
    <polyline points="52,142 150,135 240,123 330,100 410,76 500,54" fill="none" stroke="#4f6df5" stroke-width="2"/>
    <line x1="330" y1="150" x2="330" y2="90" stroke="#d6a45c" stroke-width="1.2" stroke-dasharray="4 3"/>
    <circle cx="330" cy="100" r="5" fill="#54b890" stroke="#1f2330" stroke-width="1"/>
    <text x="338" y="118" fill="#54b890" font-size="7.6" text-anchor="start" font-weight="bold">fix at PRR</text>
    <text x="338" y="129" fill="#9aa4b2" font-size="7" text-anchor="start">daytime, cheap</text>
    <circle cx="500" cy="54" r="5" fill="#d66b5c" stroke="#1f2330" stroke-width="1"/>
    <text x="500" y="44" fill="#e08b7c" font-size="7.6" text-anchor="middle" font-weight="bold">fix after the incident</text>
    <text x="500" y="34" fill="#9aa4b2" font-size="7" text-anchor="middle">3am, expensive, plus a postmortem</text>
    <text x="96" y="166" fill="#9aa4b2" font-size="7.4" text-anchor="middle">design</text>
    <text x="210" y="166" fill="#9aa4b2" font-size="7.4" text-anchor="middle">build</text>
    <text x="330" y="166" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">PRR launch gate</text>
    <text x="480" y="166" fill="#9aa4b2" font-size="7.4" text-anchor="middle">after launch (incident)</text>
    <text x="290" y="188" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">PRR pulls the fixes that "hurt after launch" forward to before launch, while they're cheap</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The same gap, filled at the <b style="color:#54b890">PRR stage</b>, is daytime, cheap, no consequences; wait until it explodes after launch as a <b style="color:#e08b7c">3am incident</b> and it's the most expensive way to fill it, with a postmortem thrown in. PRR's entire value is <b>moving the expensive fixes on the cost curve left, to when they're still cheap</b> — the same thinking as [[sre-testing|testing for reliability]]: "catch it earlier, cheaper, so you dare move fast"</figcaption>
</figure>

## Reflections

### SRE's biggest lever: "the pager is a currency"

The lesson I feel most from years of leading teams: **if reliability requirements have no gate that "must be passed before launch", they will always be squeezed out by the deadline.** "We'll add monitoring after launch", "ship first, sort rollback out later" — I've heard these too many times, and they almost always turn into "we'll add it after it blows up in Production". What PRR gives SRE is a real bargaining chip: **"If you want us to take over and carry the pager, do these things first."** The chip works because the pager is **scarce** — you can't unconditionally promise to get up at 3am for anything. Once "SRE support" isn't a free gift but something to be **earned**, reliability shifts from "goodwill when we have time" to "a condition to be met before launch". Now, when I take on a new service, my first act isn't scheduling features; it's asking one question: **when this blows up at 3am after launch, who carries it, and following what?** If that can't be answered clearly, it isn't at the point where it can launch.

### PRR isn't a rubber stamp; it's a design review

The worst PRR is a form thrown out the day before launch, everyone rushing to tick boxes over a fait accompli. Its most valuable moment is **exactly the opposite — early**, stepping in while the architecture can still change. Because what a good PRR forces out is often **architectural**: "this downstream dependency has no degradation path at all; when it dies you die with it", "this write isn't idempotent; a retry will double-charge" — things almost impossible to change once live, propped up only by a pile of operational workarounds. So I position PRR as SRE's **highest-leverage collaboration** with development: it isn't acceptance testing; it's both sides **designing reliability in** while there's still time. Reducing it to after-the-fact ticking throws away the most valuable moment.

### Taking over isn't the end; the engagement is revocable

One last, often-neglected second half. Services **decay**: clean through PRR today, and a year later stuffed with [[sre-toil|toil]], SLO chronically broken, runbook long stale. SRE's engagement model has a principle I very much agree with — **after taking over, if a service rots long enough to drag SRE into a swamp of toil, SRE has the right to hand the pager back.** That isn't a threat; it's protection: it makes "operable" not a snapshot at the moment of launch but a state to be **continuously maintained**, and it stops development from launching and walking away. It also ties the whole series together — from the [[sre-intro|error budget]] to PRR, the underlying logic of SRE's entire toolkit has always been one sentence: **reliability isn't anyone's goodwill; it's an engineering contract with explicit thresholds, bargaining chips, and the right of refusal.**
