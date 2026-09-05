---
title: "The Years Without an SRE: A Backend Lead's Production Diary"
date: 2026-08-01
category: tech
description: "One VM and one Cloud SQL instance holding 13,000 viewers online; monitoring that was a vaguely-watched Sentry; an alerting system that was the host's voice; the fourth window during a stream being the stream itself; the midnight calls to the CTO — and a sentence I only worked out later: what we lacked wasn't monitoring, it was a language for incidents."
tags:
  - war-story
  - live-commerce
  - sre
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 15
comments: true
draft: false
translationOf: rezero-ops
---
[[rezero-flash-crowd|The last chapter]] was how the peak hits; this one is about the person fighting it. There was no such job title as SRE on that team — as backend lead, the infrastructure war naturally landed entirely on me. This chapter is the diary of those white-knuckle days: the whole estate on one VM, vague monitoring, four windows open during a stream, and midnight calls to the CTO.

## The whole estate: one VM, one database

The position first. The entire platform — traefik, four API processes (Django, doing API and WebSocket together), three Celery containers, plus Redis and RabbitMQ — **all crammed onto the same VM**. We didn't run our own database, using Cloud SQL with 8 cores. That's it: two machines' worth, holding a [[rezero-flash-crowd|stream with up to 13,000 viewers online]].

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 268" role="img" aria-label="The architecture of the whole estate. Inside one VM, top to bottom: traefik as reverse proxy; four Django processes serving both API and WebSocket; three Celery containers — heartbeat for scheduling, a comment-fetching one with only a single worker, and an async task one with ten workers using acks late; plus Redis and RabbitMQ. Outside the VM there is only one Cloud SQL instance with 8 cores. At the top, traffic from thirteen thousand viewers online enters through traefik." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="200" y="20" fill="#e6e6e6" font-size="8.4" text-anchor="middle" font-weight="bold">13,000 viewers online</text>
    <line x1="200" y1="26" x2="200" y2="48" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 196 44 L 200 50 L 204 44 Z" fill="#9aa4b2"/>
    <rect x="24" y="52" width="352" height="196" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="368" y="66" fill="#9aa4b2" font-size="7" text-anchor="end">one VM</text>
    <rect x="44" y="62" width="140" height="22" rx="5" fill="#1f2330" stroke="#d6a45c" stroke-width="1.1"/>
    <text x="114" y="77" fill="#d6a45c" font-size="7.2" text-anchor="middle">traefik</text>
    <rect x="44" y="94" width="70" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <rect x="122" y="94" width="70" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <rect x="200" y="94" width="70" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <rect x="278" y="94" width="70" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="79" y="108" fill="#e6e6e6" font-size="6.6" text-anchor="middle">API+WS</text>
    <text x="157" y="108" fill="#e6e6e6" font-size="6.6" text-anchor="middle">API+WS</text>
    <text x="235" y="108" fill="#e6e6e6" font-size="6.6" text-anchor="middle">API+WS</text>
    <text x="313" y="108" fill="#e6e6e6" font-size="6.6" text-anchor="middle">API+WS</text>
    <line x1="114" y1="84" x2="114" y2="94" stroke="#3a4154" stroke-width="1"/>
    <rect x="44" y="128" width="98" height="40" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="93" y="143" fill="#e6e6e6" font-size="6.6" text-anchor="middle">Celery: heartbeat</text>
    <text x="93" y="156" fill="#9aa4b2" font-size="6" text-anchor="middle">the scheduling heart</text>
    <rect x="150" y="128" width="98" height="40" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="199" y="143" fill="#e6e6e6" font-size="6.6" text-anchor="middle">Celery: fetch comments</text>
    <text x="199" y="156" fill="#d6a45c" font-size="6" text-anchor="middle">exactly 1 worker</text>
    <rect x="256" y="128" width="98" height="40" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="305" y="143" fill="#e6e6e6" font-size="6.6" text-anchor="middle">Celery: async tasks</text>
    <text x="305" y="156" fill="#9aa4b2" font-size="6" text-anchor="middle">10 workers · acks_late</text>
    <rect x="44" y="182" width="98" height="22" rx="5" fill="#1f2330" stroke="#dc4c3f" stroke-width="1.1"/>
    <text x="93" y="197" fill="#e6e6e6" font-size="6.6" text-anchor="middle">Redis</text>
    <rect x="150" y="182" width="98" height="22" rx="5" fill="#1f2330" stroke="#e0733a" stroke-width="1.1"/>
    <text x="199" y="197" fill="#e6e6e6" font-size="6.6" text-anchor="middle">RabbitMQ</text>
    <text x="200" y="234" fill="#9aa4b2" font-size="6.6" text-anchor="middle">Deliberately doing it on as little as possible — a philosophy, not a budget</text>
    <rect x="420" y="118" width="130" height="44" rx="6" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.2"/>
    <text x="485" y="136" fill="#e6e6e6" font-size="7.2" text-anchor="middle">Cloud SQL</text>
    <text x="485" y="151" fill="#9aa4b2" font-size="6.4" text-anchor="middle">8 cores · no self-run DB</text>
    <line x1="376" y1="140" x2="420" y2="140" stroke="#3a4154" stroke-width="1.2"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Two machines' worth: one VM holding every component, one managed database. Not bad.</figcaption>
</figure>

Doing it on as little as possible was a deliberate philosophy, not a lack of budget. That choice cost us later ([[rezero-flash-crowd|every fight in #14]] was hand-to-hand because of it), but it paid a dividend in discipline: with few resources there's no escape hatch of "just make it bigger", and every component has to justify why it deserves a share of a CPU.

How the three Celery containers divide the work is the most designed part of this small position:

- **heartbeat**: combined with Django for scheduling, so everything that happens on a timer — the rhythm of fetching comments, recomputing sold quantities hourly, scanning for payment chasing — beats from here. As [[rezero-stack|#2]] said, Django + Celery + heartbeat was our zero-operations Airflow.
- **Fetching comments: exactly one worker.** Not thrift, design — a single worker serialises naturally, and the "one fetching job defines the global order by itself" from [[rezero-comment-order|#3]] has this single worker as the physical basis that makes LWW hold. It fetches comments and passes them to the API servers through a Redis group, where the same processes' WebSocket pushes them to the host dashboard — [[rezero-console|#9]]'s comment waterfall is this line.
- **Async tasks: 10 workers** over RabbitMQ with `acks_late` — **acknowledge only when done, rather redo than lose**. That's at-least-once semantics, at the cost of tasks having to be idempotent, and [[rezero-payment|#7]]'s "fact tables are idempotent by nature" collects interest again here. Slow calls like the invoicing API, taking several seconds each, are absorbed naturally by queuing on RabbitMQ — finish one, then consume the next message, with slow tasks silting up in the queue rather than dragging anyone down. [[rezero-flash-crowd|Silts but doesn't fall]], one more time.

## Monitoring: Sentry, and our vague selves

Position established; now the embarrassing part: **monitoring was essentially all human**. That was the limit of our understanding at the time — all we managed was watching errors in Sentry. Sentry's quota blew up almost immediately after launch, and we learned about sampling afterwards. Nobody on the team really understood monitoring, and I was, at best, watching vaguely.

But Sentry earned one genuine credit, and not in Production — in the demo phase. The system was going out to other departments to try, problem reports came back scattered and fragmentary, and logs inside the VM were sometimes cleaned away and unrecoverable — which is where Sentry earned its keep. That taught me something: **logs are volatile, an error tracker keeps the record**. Sentry's real value to us wasn't "monitoring", it was **persistent memory of errors** — the scene had already been swept, and it still remembered what happened.

The blind spot deserves an honest mention too: an error tracker only sees exceptions. Latency creeping up, CPU approaching saturation, a batch silting deeper and deeper — none of those raise, so Sentry stays green while the system may be drowning. In the language of [[sre-monitoring|the four golden signals]], we could see exactly one of the four: errors. Latency, traffic and saturation were all covered by the humans in the next section.

## Watching the stream: four windows

For the first month after launch I sat through every stream, with four windows open:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 262" role="img" aria-label="The four windows kept open during a stream, and the exit curve. Four windows: the host dashboard, to see whether the data was still coming in; a VM terminal, watching each docker container's CPU; Django admin, spot-checking bidding key states; and the fourth window, the stream itself, listening for the host saying the system seemed off — marked as the most sensitive alert of all. At the bottom, the exit curve: every stream for the first month, then only when the CTO called about a problem, then eventually not even that." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="8.4" text-anchor="middle" font-weight="bold">The four windows during a stream</text>
    <rect x="30" y="32" width="255" height="62" rx="6" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="157" y="52" fill="#4f6df5" font-size="7.2" text-anchor="middle" font-weight="bold">① the host dashboard</text>
    <text x="157" y="68" fill="#e6e6e6" font-size="6.6" text-anchor="middle">comments, orders, viewer count —</text>
    <text x="157" y="82" fill="#9aa4b2" font-size="6.6" text-anchor="middle">is the data still coming in?</text>
    <rect x="295" y="32" width="255" height="62" rx="6" fill="#1f2330" stroke="#54b890" stroke-width="1.1"/>
    <text x="422" y="52" fill="#54b890" font-size="7.2" text-anchor="middle" font-weight="bold">② a VM terminal</text>
    <text x="422" y="68" fill="#e6e6e6" font-size="6.6" text-anchor="middle">watching each docker container's</text>
    <text x="422" y="82" fill="#9aa4b2" font-size="6.6" text-anchor="middle">CPU usage</text>
    <rect x="30" y="104" width="255" height="62" rx="6" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.1"/>
    <text x="157" y="124" fill="#9b6ff0" font-size="7.2" text-anchor="middle" font-weight="bold">③ Django admin</text>
    <text x="157" y="140" fill="#e6e6e6" font-size="6.6" text-anchor="middle">spot-checking bidding key states</text>
    <text x="157" y="154" fill="#9aa4b2" font-size="6.6" text-anchor="middle">the engineer's sampling port</text>
    <rect x="295" y="104" width="255" height="62" rx="6" fill="#3a2632" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="422" y="124" fill="#e05a7d" font-size="7.2" text-anchor="middle" font-weight="bold">④ the stream itself</text>
    <text x="422" y="140" fill="#e6e6e6" font-size="6.6" text-anchor="middle">listening for "the system seems off"</text>
    <text x="422" y="154" fill="#e05a7d" font-size="6.6" text-anchor="middle" font-weight="bold">← the most sensitive alert</text>
    <line x1="60" y1="206" x2="520" y2="206" stroke="#3a4154" stroke-width="1.2"/>
    <path d="M 516 202 L 522 206 L 516 210 Z" fill="#3a4154"/>
    <circle cx="90" cy="206" r="3" fill="#e05a7d"/>
    <text x="90" y="194" fill="#e6e6e6" font-size="6.8" text-anchor="middle">month one: every stream</text>
    <circle cx="290" cy="206" r="3" fill="#d6a45c"/>
    <text x="290" y="194" fill="#e6e6e6" font-size="6.8" text-anchor="middle">then: only when the CTO called</text>
    <circle cx="470" cy="206" r="3" fill="#54b890"/>
    <text x="470" y="194" fill="#e6e6e6" font-size="6.8" text-anchor="middle">later: not even that</text>
    <text x="290" y="234" fill="#9aa4b2" font-size="6.8" text-anchor="middle">The exit curve: trust bought back one uneventful stream at a time</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Four panes of monitoring — one a gauge, one a CPU meter, one a spot check — and the most sensitive one is the sound of the stream.</figcaption>
</figure>

The first three windows are respectable enough: the dashboard for whether data was arriving, the terminal for each container's CPU, admin for spot-checking bidding key states. The real alerting system was the fourth — **the stream itself**. The host-owner saying "the system seems off" was faster and more accurate than any gauge: she stands at the very front of the user experience, and any latency, missed order or page glitch registers with her before it reaches my four windows. [[rezero-notification|#12]] said the host is this platform's notification system; this chapter adds the other half — **she's also the alerting system**.

Watching the stream had an exit curve: every stream for the first month; then, once nothing much went wrong, only when the CTO called; and eventually not even that. Retiring human monitoring didn't come from installing a better dashboard — it came from **no longer needing to look**. Trust was bought back slowly, one uneventful stream at a time.

## Midnight calls, and the language of incidents

Midnight calls didn't come to me, they went to the CTO — and he was treated that way often. The calls weren't only incidents, they were also **wishes**: all kinds of scattered wishes, including the kind where the person wishing couldn't articulate what they wanted. The most famous one: a Tuesday-midnight call asking for a "shortlist style" feature, needed for Saturday's stream. We really did rush it out and ship it on time — its full story and its tragicomic ending are saved for the series finale.

Here's what I only worked out later: what we lacked wasn't just monitoring, it was **a language for incidents**.

- No severity levels, so "the system seems off" and "the whole site is down" were the same phone call, and 3am got the same treatment as 3pm.
- No incident entry point, so the only interface for reporting a problem was "call the most senior technical person" — the CTO as human pager and human triage.
- No runbooks, so every call was answered by improvisation.

The person making a wish couldn't articulate it not because they were unprofessional — it's that **the system never gave them the vocabulary to describe a problem**. A user can only say "it seems off" because we never gave them a status page; the boss can only call at midnight because apart from a phone we gave him no severity levels and no entry point. The essence of the [[sre-alerting-oncall|alerting and on-call]] discipline is that it's a **translation machine**: turning human unease into system action, and moving the cost of translation from a person into an institution. Without a translation machine the translation work doesn't disappear — it climbs the org chart until it reaches the most senior technical person, and rings in the middle of the night.

## The rebuild: the half of the checklist a pipeline can't cover

Was there a launch checklist? No, we gritted our teeth and went. The confidence came from infrastructure being in place early: healthy CI/CD, automatic staging deploys — [[rezero-stack|#2]] called that a small team's biggest lever. In hindsight that half of the confidence was real — **a repeatable deploy is itself a checklist executing automatically every day**, continuously verifying that deployment is correct.

But a pipeline only guarantees the deploy is right; **it guarantees nothing about surviving afterwards**. The other half of the checklist — capacity, monitoring, alerting — is something a pipeline covers not one item of, and every item on that half-sheet later became a battle: capacity unestimated, so [[rezero-flash-crowd|a single process got flattened]]; monitoring unbuilt, so Sentry stayed vague; alerting ungraded, so the CTO took midnight calls. A rebuild fills in that half:

1. **Capacity estimation plus load testing.** The opening peak isn't a black swan — [[rezero-flash-crowd|#14]] drew its shape: a predictable 200 comments a second. Replay that shape before launch and the single process's way of dying shows up before going live rather than mid-stream.
2. **A minimum monitoring set**: [[sre-monitoring|the four golden signals]] plus one business gauge — batch lag (the age of the oldest unprocessed comment). You don't need [[obs-intro|the full LGTM stack]]; one Grafana and a few queries would have done back then. The point isn't seeing more, it's **turning fear into a number**.
3. **A language for incidents**: three severity levels, one entry point, one page of runbook per level. Make "call the CTO" the last level rather than the only level.
4. **Keep watching streams, but change its role**: not as monitoring, as product observation. Watching a stream shows you things a dashboard never will — how a host routes around your design, which screen an assistant gets stuck on, [[rezero-console|which exotic feature]] nobody actually uses any more.

Would I change the VM? **No.** One VM plus an 8-core Cloud SQL held 13,000 viewers, proving resources were never the bottleneck; what was missing was protection. Minimalism isn't the mistake — running blind is.

## Reflections

**Fear is the most expensive monitoring.** The cost of watching streams by hand wasn't those hours, it was attention and sleep quality — for that first month I was paying for monitoring in fear. The point of a dashboard isn't letting you know more, it's **permitting you not to look**; a monitoring system's ultimate product is peace of mind. Our exit curve deserves honest criticism too: the correct exit is "the numbers say you can stop looking", and ours was "we got used to nothing going wrong" — the gap between those two is credit, and [[rezero-flash-crowd|the day of the DDoS]] collected it with interest.

**An institution is a translation machine.** The line I most want to leave from this chapter: the person making a wish can't articulate it because we never gave them a language. Severity levels, runbooks, a status page — on the surface these are process, and underneath they're a **translation protocol** turning "it seems off" into an actionable signal. Without a protocol the translation doesn't disappear, it's just done by a human — always the most senior human, at the hour they should least be awake.

**A job title can be absent; the problems never are.** There was no SRE role, but not one SRE problem was missing: capacity, monitoring, alerting, on-call — all of them present, just unclaimed. And unclaimed problems grow onto whoever stands nearest. A backend lead doubling as infra isn't the capable carrying more, it's a problem finding the closest person to it. After leaving I moved into an EM job, and the first thing I did was take on interim SRE — looking back, the origin is these white-knuckle days.

The system survived, and so did the people. But "alive" isn't the same as "the books are right" — the stock numbers, the order numbers and the bank's numbers were drifting quietly in their separate tables. Next chapter: reconciliation.
