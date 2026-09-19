---
title: "A Clock on the Neck: AI During an Incident — Replaying a Poison-Message Outage"
date: 2026-08-11
category: tech
description: "Taking the responsibility funnel to its most extreme test: an incident. I replayed the poison-message outage from the live-commerce series, this time with AI on the table — the host is shouting, ops is chasing, and AI can't decide for you whether to restart mid-stream. Three acts recording where it genuinely sped me up, and where it nearly pushed me the wrong way."
tags:
  - ai
  - incident
  - sre
series: "The Craft of Working with AI (2026)"
seriesOrder: 2
translationOf: ai-incident-clock
---
## Preface

[[responsibility-funnel|Last time]] was the funnel: AI eats the volume in the wide layers, a person holds the responsibility at the neck. This post takes the funnel to its most extreme test bed — **an incident**. An incident is the neck with a clock on it: the host is shouting, ops is chasing, and you have to decide with incomplete information. AI can't decide for you whether to restart a service mid-stream — but can it shorten **the road to the decision point**?

No argument this time; an experiment. I replayed the **poison-message outage** from [[rezero-flash-crowd|the live-commerce series]] — this time with AI on the table.

## What happened back then

Fast-forward through the plot (the full version is in [[rezero-flash-crowd|the original war story]]): mid-stream, the comment waterfall flowed normally, ingestion metrics were all fine, and orders **weren't zero — they were sporadic**. At a glance it didn't even look abnormal, just a mediocre stream; the host noticed the numbers were off before we did. No alerts. The culprit was one boundary: comments were parsed 200 at a time, and if **one odd comment made the parser throw, the entire batch was abandoned** — one poison message dragging 199 innocent orders down with it. Clean batches that didn't hit a mine produced orders as usual, which is why the numbers were sporadic instead of zero. The symptom was deceptive on two levels: **nothing was broken, there was just less output — and "less" is far harder to spot than "none"**.

I picked this incident to re-run precisely because it's hard: the evidence contradicted itself, every metric lied, and the road *before* the judgment was the longest in any of our war stories.

## Experiment design

The rules were strict, because whether the experiment is honest decides whether this post is worth anything:

- Open a **clean AI conversation**: no tools, no reading my blog, nothing but what I tell it in the conversation.
- Feed the information in **three stages**, each stage containing only what the on-call engineer knew at that point in time, and let it propose the next step. **Symptoms are given in the original wording**: sporadic orders, looks normal at a glance, the host noticed first — even "is this an incident at all" is left for it to judge.
- I record its responses faithfully — excerpts below, with the reasoning chains unedited.

Three honest disclaimers: this is a single n=1 run, not a benchmark; I know the answer, and I fed the evidence in the order the original war story revealed it, staying as close to the real sequence as I could; and the poison pill is a well-known stream-processing pattern in 2026, so it's already in AI's pattern library — but it wasn't in our heads back then, and that's part of the point.

## Act one: is this even an incident?

Everything I gave it: the comment waterfall is normal and heavy, monitoring shows no alerts, ingestion throughput is normal; orders are coming in but sporadically, and looking at the order stream alone nothing seems wrong; the host was the one who got angry first, saying comment activity like that shouldn't produce a trickle; and honestly we aren't sure ourselves whether this is an incident. Its reply (excerpt):

> First, decide whether it's an incident: **compute the funnel, don't argue about feelings.** Don't debate "conversion rate" with the host — pick 10 to 20 unmistakable order comments off the live stream by eye and trace each one: did it enter the system? Was it parsed into an order intent? Was an order creation attempted? Did the order get created? If more than ten percent of the sample is stuck somewhere in the middle, it's an incident — stop wondering.
> Also clarify one thing: when you say "the comment waterfall is normal", is that **our system's waterfall, or the platform's native chat**? The answer to that cuts half your hypotheses immediately.
> "Orders trickling in" = **some formats or some sources get through and the rest are dropped**. Candidate hypotheses: (1) the parser can't handle real-world format variants (the sporadic orders are from people who happened to type it correctly); (2) ingestion from one platform is broken while the others hold up the total; (3) product or campaign configuration; (4) the anti-spam filter is washing out large numbers of similar "+1" comments; (5) something downstream is blocked; (6) the conversion rate really is just low — **leave this one until last, eliminated by the funnel data rather than assumed**.
> Give ops a holding statement to buy time. And one thing worth doing anyway: **make sure the raw comments are being persisted** — that determines whether this stream's revenue can be recovered once the incident is over.

The hardest part back then was actually step one: "is this even an incident" — the anomaly was spotted by a host looking at revenue, not by an engineer looking at monitoring. It turned that fuzzy question into **a ten-minute executable procedure**: sample, trace one by one, call it if a tenth are stuck. Note that its hypothesis list sits on the right premise from the first second — "some orders do get through" eliminates a global outage outright, so every hypothesis has the shape of a **partial failure**. Two more veteran moves: asking back "whose waterfall?" (one clarifying question halving the hypothesis space), and "make sure raw is persisted" (buying insurance for the recovery before the incident is even classified).

## Act two: some live, some die, no body left behind

I report the sample results: all 15 order comments entered the system, 3 produced orders; **12 have nothing at all after the point they entered parsing** — no parse-fail log, no rejection, no trace of an order creation attempt. They simply vanish. And those 12 are **formatted perfectly normally**, indistinguishable from the 3 that succeeded. Per-platform intake is normal, filter counts are normal, queues are normal, rejection logs are clean; the only noise is a handful of parsing exceptions, in a volume that doesn't match 12. Its response (excerpt):

> "Same format, some live and some die, and the dead leave no trace" plus "sporadic exceptions whose volume doesn't match" points at essentially one thing: **what died isn't those 12 comments, it's the worker or batch that was processing them.**
> Prime suspect: **a poison message killing the whole batch.** One malformed comment throws, and the normal comments in the same batch go down with it; if the ack happened before processing, those messages never get redelivered — they evaporate, with zero record. That explains the volume mismatch perfectly: **exception count × batch size = number vanished.** The 3 that succeeded were simply lucky enough not to be in a poisoned batch.
> Fastest verification: **align** the timestamps of the vanished comments with the timestamps of the exceptions — if the vanished ones cluster around each exception, that's it.
> Two alternatives with the same structure: one consumer is wedged but still holding its partition (every comment routed to it dies); or some instances are running old code. **All three hypotheses share a structure: the unit of failure is the worker, not the comment — which is why there's no cause of death at the comment level.**
> Next step: **stop the bleeding before you find the cause — do a rolling restart of the whole parser group.** Hypotheses two and three would be fixed instantly, and hypothesis one would ease temporarily. You're still losing orders; every minute is money. Do the timestamp alignment while the restart runs. You can give the host a line right now: "every comment was received and the raw data is intact; the order-processing stage is broken and being fixed; **every missed order will be created, and not one will be lost**."

This act is the high point of the experiment, and three things are worth taking apart.

**One: it hit the target — with no hint of internal knowledge.** The abstraction "the unit of failure is the worker, not the comment" is derived straight from "same format, some live and some die, no body left behind". I never told it the system processed in batches; it inferred the processing model from the shape of the symptom. And what it gave wasn't a single narrative, it was a **family of hypotheses** (poison / wedged / version) plus one handle that discriminates between all three at once (timestamp alignment).

**Two: "stop the bleeding before you find the cause" is a decision handed back to the human.** A rolling restart sounds obvious, but this is **mid-stream**, against a group of workers still processing orders — will in-flight batches be lost? If the restart doesn't fix it, does the fire get bigger? AI can say "every minute is money", but the hand that presses restart, and the person standing in front of the host if the restart goes wrong, is you. That's the neck: **the recommendation can be outsourced, the bet can't.**

**Three: notice its tone.** "Prime suspect", "explains it perfectly", "that's it" — it was right this time, but **confidence when right and confidence when wrong read exactly the same**. If this had been a wrong narrative, the same certainty would have walked the 3 a.m. version of you into a ditch. What saves you isn't telling the tones apart (you can't), it's the handle it attached: timestamp alignment, five minutes, and no believing anything until it's done.

## Act three: the hard evidence, and the wrap-up

I report: the alignment is done, and the 12 vanished comments **cluster** in time, each cluster right behind an exception; the code confirms batches of 200 with the try/catch outside the batch loop, and failed batches not requeued. Its wrap-up list (excerpt):

> **P0, stop the bleeding**: move the try/catch to per-message so one failure drops only that message; send failed comments to a dead-letter queue with the original content and the exception, so **nothing is abandoned silently again**; add a `parse_failed_count` alert — the root cause of monitoring being all green this time is that **failure was silent**. After deploying, verify with a deliberately malformed comment: it should go to the dead-letter queue alone while the rest of its batch survives.
> **P1, recover this stream**: **replay the full time window** from the raw comments; don't just fix the 12 from the sample — far more vanished than the sample caught. **Deduplication is a hard requirement**; duplicate orders are harder to clean up than missing ones. Tag the backfilled orders and give ops the numbers: comments received, orders originally created, orders backfilled.
> **P2, afterwards**: find the poison message itself and add a test case; change consumption semantics to at-least-once (ack only after successful processing); monitor **conversion**, not just throughput — comments in versus parses succeeded versus orders created, and alert when the ratio deviates; record two items in the postmortem: failure may never be silent, and batches must have per-item isolation. **And while you're at it, go through the acceptance checklist you skipped to ship early — mines like this usually come in groups.**

Against what actually happened: per-message isolation was our post-incident fix; the dead-letter queue only arrived in [[rezero-comment-order|the rebuild]] as a third step; and "monitor conversion, not throughput" is the same lesson as "put a gauge on the batch backlog" from [[rezero-flash-crowd|the war story's reflection]]. **What took us one incident plus one rebuild to converge on took three rounds of conversation here** — right down to the veteran's aside that mines like this usually come in groups.

## What the experiment shows

**What got compressed is the road to the judgment point.** The procedure for "is this an incident", the hypothesis family, the verification handle, the line to give ops, the fix list — all of that wide-layer work was supplied at nearly zero cost across three acts. The cognitive bandwidth the on-call saves goes straight back into the parts that can't be outsourced. That's "AI during an incident = temporarily widening the neck".

**What wasn't outsourced is an equally clear list.** First, every **hands-on action** is human: sampling, aligning timestamps, changing code — AI can't touch production, it can only give coordinates. Second, **the bet is human**: a decision like "rolling restart mid-stream", where every option has a cost, can be analysed by AI but is always signed by you. Third, the one that's easiest to miss: **an accurate retelling of the symptom is itself the most expensive context**. The AI hit the target without reading a single internal document because "sporadic", "same format, some live some die", "no body left behind" had already drawn the shape of the system's behaviour — distort the retelling by one layer and it will reason beautifully about a different world. The quality of observation and retelling is the hidden component of the neck; and the step before that — **noticing the anomaly at all** — came from a host's instinct about revenue, and still isn't AI's job today.

**There's exactly one discipline: trust the handle, not the narrative.** Tone carries no information about correctness; a handle is verifiable. Every round came with a cheap, high-discrimination verification action (sample the funnel, align timestamps, probe with a malformed comment) — follow them and the right narrative gets crowned and the wrong one executed, while you stand in the verifier's position the whole way instead of the rubber-stamper's.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 300" role="img" aria-label="The loop between a human and AI during an incident: symptoms and new evidence go to the AI, the AI returns candidate narratives with a verification handle, the human runs the check, and the result feeds back as new evidence. Once the narrative converges the human decides and acts. A red dashed shortcut runs from the AI's narrative straight to the decision, labelled as the authority shortcut that skips verification." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="320" y="24" fill="#d6a45c" font-size="12" text-anchor="middle" font-weight="bold">⏱ a clock on the neck: the host is shouting, time is running</text>
    <rect x="30" y="60" width="170" height="60" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="115" y="85" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">Symptoms / evidence</text>
    <text x="115" y="103" fill="#9aa4b2" font-size="9" text-anchor="middle">metrics · logs · what you checked</text>
    <rect x="440" y="60" width="170" height="60" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="525" y="85" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">AI: narrative + handle</text>
    <text x="525" y="103" fill="#9aa4b2" font-size="9" text-anchor="middle">hypotheses · checks · draft comms</text>
    <rect x="235" y="160" width="170" height="60" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="320" y="185" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">Human: run the check</text>
    <text x="320" y="203" fill="#9aa4b2" font-size="9" text-anchor="middle">sample · align timestamps</text>
    <rect x="235" y="245" width="170" height="46" rx="8" fill="#223528" stroke="#54b890" stroke-width="2"/>
    <text x="320" y="264" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">Human: decide and act</text>
    <text x="320" y="281" fill="#9aa4b2" font-size="9" text-anchor="middle">restart · hotfix · backfill</text>
    <line x1="200" y1="90" x2="440" y2="90" stroke="#9aa4b2" stroke-width="1.3"/>
    <polygon points="440,90 429,85 429,95" fill="#9aa4b2"/>
    <line x1="480" y1="120" x2="380" y2="160" stroke="#9aa4b2" stroke-width="1.3"/>
    <polygon points="380,160 391,157 385,148" fill="#9aa4b2"/>
    <line x1="260" y1="160" x2="160" y2="120" stroke="#9aa4b2" stroke-width="1.3"/>
    <polygon points="160,120 166,129 172,120" fill="#9aa4b2"/>
    <text x="212" y="132" fill="#9aa4b2" font-size="9" text-anchor="middle">results feed back</text>
    <line x1="320" y1="220" x2="320" y2="245" stroke="#54b890" stroke-width="1.5"/>
    <polygon points="320,245 315,235 325,235" fill="#54b890"/>
    <text x="392" y="237" fill="#9aa4b2" font-size="9" text-anchor="middle">once it converges</text>
    <path d="M 560 120 C 600 190 480 265 410 268" fill="none" stroke="#e05a7d" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="565" y="205" fill="#e05a7d" font-size="9" text-anchor="middle">believing the narrative</text>
    <text x="565" y="218" fill="#e05a7d" font-size="9" text-anchor="middle">= the authority shortcut</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">How many rounds the loop runs is decided by evidence; the red shortcut is always there — even when this narrative happens to be right, you can't know that until the handle is walked, and the handle usually takes five minutes.</figcaption>
</figure>

## Reflection

### Confidence when right and confidence when wrong read exactly the same

It was certain from start to finish, and it was also correct — which is exactly what I want to warn about. Correctness isn't written into tone: the same "prime suspect" and "explains it perfectly" sit just as comfortably on a wrong narrative, and the 3 a.m. version of you has no ability to tell them apart. So the defence against the authority illusion isn't a platitude like "stay critical", it's writing the discipline into the process: **nothing is believed until the handle is walked**, the same way [[sre-troubleshooting|SRE debugging discipline]] says "change one variable at a time" — an action you perform without having to think. The defence was never intelligence. It's process.

### The incident funnel and the writing-code funnel are the same funnel

Looking back, this experiment just moved [[responsibility-funnel|the last post's]] funnel into a different setting: AI eats the wide layer (the procedure, the hypothesis family, the handle, the phrasing, the checklist), the human holds the neck (hands on, believing, signing). Identical shape — except there's a clock on the neck now, and the clock amplifies the value of every part: each minute saved in the wide layer is worth more, and each bet at the neck weighs more. Push it one step further: code review has a funnel, architectural decisions have a funnel, postmortems have a funnel — **the test for "where can AI be used" shifts from "does it involve writing code" to "where is this work's judgment point, and how long is the road before it"**. The longer the road, the more AI is worth; the judgment point itself is always human.

### The best incident drill is replaying your own old wound

Finally, I'd recommend the experiment itself: take an old incident you wrote a postmortem for, feed it to a clean AI in stages, and watch which act it hits and which act it invents. You get three things at once: first-hand calibration of where AI's ability ends (rather than hearing it from someone else), an inventory of the knowledge gaps in your own system (where it gets stuck is where context never made it into a document), and a zero-risk on-call muscle session. The one thing to be careful about is **feeding the symptoms in the original wording** — distort the retelling and you're replaying a different incident. The cost is one evening, and at the next real incident, it won't be the first time there's AI on the table.
