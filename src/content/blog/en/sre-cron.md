---
title: "Reliable cron: The Simplest Scheduled Job Gets Hard the Moment It's Distributed"
date: 2026-07-15
category: tech
description: "cron is simple — time's up, run a job; anyone can write one on a single machine. But the moment you want it \"reliable\" (that machine dies and the job still has to run), it turns from the simplest thing into a hard problem that drags in distributed consensus. This post covers two things: why reliable cron is so hard (state must survive a leader handover without loss, so it has to live in consensus underneath), and the choice with no perfect answer it forces on you — in the crash window, you can only choose \"rather skip\" or \"rather duplicate\", and idempotency is the one universal escape hatch."
tags:
  - sre
  - reliability
series: "Google SRE — Reading Notes"
seriesOrder: 15
comments: true
draft: false
translationOf: sre-cron
---
cron may be the simplest piece of infrastructure there is: time's up, run a job. Anyone who has written a crontab on a single machine takes it for granted. But add one word — **"reliable"** (that machine dies and the job still has to run) — and it turns overnight from the simplest thing into a hard problem that drags in distributed consensus. This post covers why, and the choice with no perfect answer that it forces on you.

## Single-machine cron is easy; reliable cron is hard

Single-machine cron's fatal flaw is obvious: **it's a single point of failure**. That machine dies, every schedule stops, and you may not notice for several cycles. The intuitive fix is to make it distributed — several replicas, elect one leader to run things, hand over when it dies. But the moment you do that, a new hard problem appears: **at the instant the leader hands over, the state of "which jobs have already run" must not be lost** — otherwise the successor has no idea whether a job ran, and the result is either a re-run or a skip.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 200" role="img" aria-label="Single-machine cron is simple but reliable cron is hard. Left, single-machine cron runs when the time comes, very simple, but if the machine dies all schedules stop, a single point of failure. Middle arrow: it must run even if it dies. Right, distributed cron: three replicas, one leader and two standby, recording which jobs have run in a Paxos consensus log. If one dies, a leader is re-elected and state is restored from consensus, no re-run, no skip." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="cr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Single-machine cron is easy; "reliable" cron is hard</text>
    <rect x="20" y="48" width="170" height="56" rx="7" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.4"/><text x="105" y="70" fill="#d6a45c" font-size="9.6" text-anchor="middle" font-weight="bold">cron (one machine)</text><text x="105" y="90" fill="#e6e6e6" font-size="8.4" text-anchor="middle">time's up, run it — trivial</text>
    <text x="105" y="128" fill="#e0733a" font-size="8.4" text-anchor="middle">✗ machine dies → all schedules stop (SPOF)</text>
    <text x="216" y="68" fill="#9aa4b2" font-size="7.8" text-anchor="middle">must run</text><text x="216" y="79" fill="#9aa4b2" font-size="7.8" text-anchor="middle">even if it dies</text>
    <line x1="194" y1="88" x2="246" y2="88" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#cr)"/>
    <rect x="250" y="46" width="120" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="310" y="63" fill="#54b890" font-size="8.5" text-anchor="middle" font-weight="bold">replica (leader)</text>
    <rect x="250" y="76" width="120" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="310" y="93" fill="#e6e6e6" font-size="8.5" text-anchor="middle">replica / standby</text>
    <rect x="250" y="106" width="120" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="310" y="123" fill="#e6e6e6" font-size="8.5" text-anchor="middle">replica / standby</text>
    <line x1="370" y1="59" x2="390" y2="82" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cr)"/>
    <line x1="370" y1="89" x2="390" y2="90" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cr)"/>
    <line x1="370" y1="119" x2="390" y2="98" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cr)"/>
    <rect x="392" y="60" width="166" height="60" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="475" y="84" fill="#4f6df5" font-size="9.2" text-anchor="middle" font-weight="bold">consensus log (Paxos)</text><text x="475" y="102" fill="#e6e6e6" font-size="8" text-anchor="middle">records: which jobs have run</text>
    <text x="290" y="150" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">one dies → re-elect leader, restore state from consensus → no re-run, no skip</text>
    <text x="290" y="172" fill="#9aa4b2" font-size="8.2" text-anchor="middle">Making the simplest cron reliable puts distributed consensus underneath it</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The hard part of distributed cron isn't "who becomes leader"; it's that <b>the state "which jobs have already run" must not lose a single bit when the leader hands over</b>. Because once the new leader can't tell whether a job ran, the result is either a re-run or a skip. To make that record reliable, the layer underneath has to be the previous post's distributed consensus — store the "already ran" list in a consensus log, and failover becomes safe</figcaption>
</figure>

In other words, the difficulty of reliable cron isn't the scheduling itself; it's **the durability of state**: the ledger of "which jobs, in which cycle, ran or not" has to survive any machine's crash and any change of leader. And that is exactly an application of [[sre-consensus|distributed consensus]] — use Paxos or the like to store that ledger as a log everyone agrees on and that doesn't disappear on failure.

## No free exactly-once: skip vs. duplicate, pick one

Even with consensus holding the state, a sneakier problem hides in the **gap** between two actions: "**decide to run**" and "**record that it ran**". If the leader crashes inside that gap, you inevitably hit one of two disasters:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Crashing in the gap: skip and duplicate, no having both. Top row, record then launch: after recording ran, a crash before actually launching the job gives a skip, marked done but never ran. Bottom row, launch then record: after launching the job, a crash before recording means the successor sees no record and runs it again, a duplicate. There's no free exactly-once in distributed systems; you can only choose rather skip or rather duplicate. The escape hatch is making the job idempotent, so a duplicate is harmless and you can boldly choose launch then record." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="cw" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Crash in the gap: skip vs. duplicate, no having both</text>
    <text x="70" y="58" fill="#9aa4b2" font-size="8.2" text-anchor="middle">record,</text><text x="70" y="70" fill="#9aa4b2" font-size="8.2" text-anchor="middle">then launch</text>
    <rect x="118" y="44" width="94" height="30" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="165" y="63" fill="#e6e6e6" font-size="8.3" text-anchor="middle">record "ran"</text>
    <text x="234" y="63" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">⚡crash</text>
    <rect x="258" y="44" width="94" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="3 2"/><text x="305" y="63" fill="#9aa4b2" font-size="8.3" text-anchor="middle">launch job</text>
    <line x1="352" y1="59" x2="372" y2="59" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cw)"/>
    <rect x="374" y="44" width="192" height="30" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="470" y="63" fill="#e0733a" font-size="8.4" text-anchor="middle" font-weight="bold">skip: marked done, never ran</text>
    <text x="70" y="118" fill="#9aa4b2" font-size="8.2" text-anchor="middle">launch,</text><text x="70" y="130" fill="#9aa4b2" font-size="8.2" text-anchor="middle">then record</text>
    <rect x="118" y="104" width="94" height="30" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="165" y="123" fill="#e6e6e6" font-size="8.3" text-anchor="middle">launch job</text>
    <text x="234" y="123" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">⚡crash</text>
    <rect x="258" y="104" width="94" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="3 2"/><text x="305" y="123" fill="#9aa4b2" font-size="8.3" text-anchor="middle">record "ran"</text>
    <line x1="352" y1="119" x2="372" y2="119" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cw)"/>
    <rect x="374" y="104" width="192" height="30" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="470" y="123" fill="#e0733a" font-size="8.4" text-anchor="middle" font-weight="bold">duplicate: successor runs it again</text>
    <rect x="40" y="152" width="500" height="48" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="290" y="171" fill="#e6e6e6" font-size="8.8" text-anchor="middle">No free exactly-once in distributed systems — pick: rather skip, or rather duplicate?</text>
    <text x="290" y="190" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">Escape hatch: make the job idempotent → duplicates are harmless → choose "launch, then record"</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Two orders, two disasters: <b>record then launch</b>, and a crash in between is a <b>skip</b> — "marked complete but never actually ran"; <b>launch then record</b>, and a crash in between is a <b>duplicate</b> — "ran without a record, so the successor runs it again". There's no free exactly-once in distributed systems; you can only pick which risk. And the one universal answer is to write the job to be <b>idempotent</b> — the same result however many times it runs, so you can comfortably choose "rather duplicate" and land solidly on at-least-once</figcaption>
</figure>

So the real question to ask first is: **for this job, is skipping more painful, or duplicating?** Sending a billing notification twice is embarrassing, so you'd rather have a mechanism that blocks duplicates; producing an overwritable report, missing one run is worse than producing it twice, so you'd rather re-run. And the most elegant solution removes the choice altogether — **make the job idempotent**, so duplicate execution is harmless, and you can always choose "at least once" and sleep at night. It's exactly what I kept stressing in the [[airflow-scheduling|Airflow scheduling]] post: idempotent and re-runnable is the foundation of a data job, not a bonus.

## One more pit: the midnight thundering herd

A final practical trap: everyone loves scheduling on the hour, especially `0 0 * * *` (midnight). The result is that at 00:00:00 every day, hundreds or thousands of jobs surge out at once, grab resources at once, hit the same downstream at once — that's the **thundering herd**. The fix is simple but often forgotten: **add jitter**, randomly scattering trigger times within a small window so no two jobs pile onto the same second.

## Reflections

### cron is the best example of "the simple gets hard once distributed"

I love using cron as an example, because it perfectly demonstrates a cruel law of distributed systems: **however simple something is on one machine, that's how hard it gets when distributed.** Single-machine cron is a crontab any beginner can write; reliable cron needs leader election, a consensus log, crash-window analysis — several orders of magnitude harder, and the requirement sounded like "just add one word: reliable". It's made me ever more wary of the line "this requirement is simple, right?" — very often what's simple is the **happy path**, and the real cost hides entirely in the edges of "what if it dies, what if it crashes right in the middle". When estimating, estimate those edges, not the happy path.

### Skip or duplicate: work out first which one your job fears

"No free exactly-once" is a sentence I think everyone doing scheduling, messaging or data pipelines should carve into their bones. Too many people assume the system will "run exactly once", then stare in disbelief at duplicated invoices or a missed settlement after some failure. The reality is that you **must** choose between skipping and duplicating, so better to choose early and clear-headed. And my default answer is almost always — **make the job idempotent, then choose "rather duplicate"**. Because idempotency turns a "pick-one dilemma" into a comfort zone where "either choice is fine"; it's the highest-return defensive design I've seen, and it says the same thing as re-runnable [[sre-data-pipelines|data pipelines]] and deduplication in messaging systems.

### In the end, reliable cron is an exercise in consensus

The most interesting realisation writing this post was that "reliable cron" isn't an independent topic at all; it's an application of [[sre-consensus|distributed consensus]]. You think you're solving scheduling; what you're actually solving is "how does a group of machines that can die agree on 'did this job run'" — which is **the same** problem as electing a leader or managing a distributed lock, in different clothes. It confirms a belief of mine once more: the hard problems of distributed systems keep coming back to a handful of cores (consensus, state, failure boundaries); chew through the cores, and most "new problems" you meet are old ones with a new face. Which is also why infrastructure this low-level should use a proven off-the-shelf solution, rather than every team rebuilding that crash window for itself.
