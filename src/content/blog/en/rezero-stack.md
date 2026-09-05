---
title: "The Opening Move: Five Components and One CI/CD Pipeline"
date: 2026-07-25
category: tech
description: "The arsenal we actually had: PostgreSQL, Django, RabbitMQ, Redis, Celery — five boring components, each with its own job, plus the CI/CD pipeline that let six engineers ship a dozen features a day. And why I wouldn't swap any of them."
tags:
  - war-story
  - system-design
  - django
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 2
comments: true
draft: false
translationOf: rezero-stack
---
With [[rezero-overview|the big picture]] laid out, and before we get into the battles over comments and stock, let's open the arsenal we had — because every trade-off in the chapters ahead was made inside the boundaries of this stack. The team was small: **3 backend, 3 frontend**, occasionally with 1–2 contractors. The arsenal was plain too: **PostgreSQL, Django (API + WebSocket), RabbitMQ, Redis, Celery**, all running on GCP. This post answers two questions: why these five, and — why a small team moves fast, which turns out not to be about the stack at all.

## Five components, three timescales

These five weren't thrown together at random. Looking back, they're exactly **one specialist hired per timescale**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 306" role="img" aria-label="Five components divided across three timescales. The left column is synchronous, at millisecond scale, where the Django API handles requests and responses. The middle column is real-time push, where WebSocket delivers viewer comments straight to the host dashboard. The right column is asynchronous, at seconds to minutes, where RabbitMQ acts as the pipe and Celery workers chew through fetching comments, FSM order placement, invoicing, sending email and exporting orders. Underneath all three columns sit two shared foundations: PostgreSQL as the single truth, and Redis holding the banned-user list for speed." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rsm" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker><marker id="rsg" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <text x="105" y="24" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">Synchronous · ms</text>
    <rect x="20" y="34" width="170" height="64" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="105" y="56" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">Django API</text>
    <text x="105" y="72" fill="#9aa4b2" font-size="7.2" text-anchor="middle">request in, response out</text>
    <text x="105" y="86" fill="#9aa4b2" font-size="7.2" text-anchor="middle">cart · checkout · accounts</text>
    <text x="290" y="24" fill="#9b6ff0" font-size="9.6" text-anchor="middle" font-weight="bold">Real-time · push</text>
    <rect x="205" y="34" width="170" height="64" rx="6" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.4"/>
    <text x="290" y="56" fill="#9b6ff0" font-size="9.4" text-anchor="middle" font-weight="bold">WebSocket</text>
    <text x="290" y="72" fill="#9aa4b2" font-size="7.2" text-anchor="middle">viewer comments → live to</text>
    <text x="290" y="86" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-weight="bold">the host dashboard</text>
    <text x="475" y="24" fill="#54b890" font-size="9.6" text-anchor="middle" font-weight="bold">Async · sec to min</text>
    <rect x="390" y="34" width="170" height="26" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/>
    <text x="475" y="51" fill="#54b890" font-size="8.4" text-anchor="middle">RabbitMQ (the pipe)</text>
    <line x1="475" y1="60" x2="475" y2="74" stroke="#54b890" stroke-width="1.2" marker-end="url(#rsg)"/>
    <rect x="390" y="78" width="170" height="56" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.4"/>
    <text x="475" y="96" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Celery workers</text>
    <text x="475" y="111" fill="#9aa4b2" font-size="6.8" text-anchor="middle">fetch comments · FSM orders · invoices</text>
    <text x="475" y="124" fill="#9aa4b2" font-size="6.8" text-anchor="middle">email · order exports</text>
    <line x1="105" y1="98" x2="105" y2="188" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rsm)"/>
    <line x1="290" y1="98" x2="220" y2="188" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rsm)"/>
    <line x1="475" y1="134" x2="475" y2="188" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rsm)"/>
    <rect x="40" y="192" width="240" height="52" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="160" y="214" fill="#e6e6e6" font-size="9.2" text-anchor="middle" font-weight="bold">PostgreSQL</text>
    <text x="160" y="230" fill="#9aa4b2" font-size="7.4" text-anchor="middle">the single truth: orders · stock · members</text>
    <rect x="320" y="192" width="240" height="52" rx="6" fill="#3a2626" stroke="#dc4c3f" stroke-width="1.4"/>
    <text x="440" y="214" fill="#dc4c3f" font-size="9.2" text-anchor="middle" font-weight="bold">Redis</text>
    <text x="440" y="230" fill="#9aa4b2" font-size="7.4" text-anchor="middle">speed: fast banned-user checks</text>
    <text x="290" y="278" fill="#9aa4b2" font-size="8" text-anchor="middle">One specialist per timescale, with one truth and one speed underneath</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">How the five divide the work: synchronous goes through Django, real-time is pushed over WebSocket, slow work goes to Celery; PostgreSQL owns the truth, Redis owns the speed.</figcaption>
</figure>

A few details about that division that the diagram doesn't carry:

- **The API layer is Django Ninja.** It writes almost exactly like FastAPI — type annotations, automatic OpenAPI docs, thin routers — but underneath it's still full Django: ORM, migrations, admin, all present. It's **FastAPI's developer experience with Django's ecosystem dividend**, which for a team with three backend engineers pays twice.
- **WebSocket serves the host, not the viewers.** Its only job is pushing viewer comments to the host dashboard in real time — the host has to see the chat to keep the show moving. A viewer's order can lag by seconds (minutes, at peak), but the host's view has to be live. The system's whole **latency budget is bet on the host's experience**: the host controls the rhythm of the stream, and a host who never runs out of stock and never calls the wrong key generates far fewer complaints. That trade-off comes back in every later chapter.
- **RabbitMQ does exactly one thing from start to finish: it's [[infra-rabbitmq|Celery]]'s pipe.** Everything that can be asynchronous is on Celery: fetching comments, FSM batch order placement, invoicing, email, order exports. An external call that's slow and mustn't fail, like invoicing, and a loop that runs every two seconds, like comment fetching, were never meant to share a request path.
- **Redis holds only the banned-user list — no sessions.** Auth is straight JWT with permissions inside the token, completely stateless, so every API server can verify on its own without consulting shared state. And JWT's textbook weakness is that once issued you can't take it back; that Redis blocklist is precisely the **revocation mechanism**: a comment arrives, we ask Redis whether they're on the list, and if so we ignore it. Stateless speed plus one centralised veto — we assembled that combination on instinct at the time, and only later found out it's the industry's standard answer. What if Redis restarts? Rebuild from the blocklist table in the DB — **fast checks in Redis, the fact always in the DB**, which is the correct posture for a [[redis-cache-patterns|cache]].

## One pipeline: where a dozen features a day comes from

The stack was plain, but the pipeline was complete — and that was the real competitive advantage:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 190" role="img" aria-label="The CI/CD flow we had. After a developer pushes, GitHub Actions runs tests and checks. The branching strategy is GitLab flow, so merging into the staging branch deploys automatically to the staging environment; going to production means pushing the prod branch into Cloud Build, which waits for a manual approval before deploying to production on GCP. The result was a team shipping a dozen or more features a day." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rsc" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker></defs>
    <rect x="16" y="40" width="96" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="64" y="59" fill="#e6e6e6" font-size="8.6" text-anchor="middle" font-weight="bold">push</text>
    <text x="64" y="73" fill="#9aa4b2" font-size="6.8" text-anchor="middle">GitLab flow branches</text>
    <rect x="130" y="40" width="118" height="44" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="189" y="59" fill="#4f6df5" font-size="8.6" text-anchor="middle" font-weight="bold">GitHub Actions</text>
    <text x="189" y="73" fill="#9aa4b2" font-size="6.8" text-anchor="middle">tests + checks gate it</text>
    <rect x="266" y="16" width="130" height="40" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.3"/>
    <text x="331" y="33" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">staging: auto-deploy</text>
    <text x="331" y="47" fill="#9aa4b2" font-size="6.8" text-anchor="middle">push and it ships</text>
    <rect x="266" y="68" width="130" height="40" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="331" y="85" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">prod: Cloud Build</text>
    <text x="331" y="99" fill="#9aa4b2" font-size="6.8" text-anchor="middle">deploys after approval</text>
    <rect x="428" y="40" width="130" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="493" y="59" fill="#e6e6e6" font-size="8.6" text-anchor="middle" font-weight="bold">GCP</text>
    <text x="493" y="73" fill="#9aa4b2" font-size="6.8" text-anchor="middle">the whole stack in the cloud</text>
    <line x1="112" y1="62" x2="128" y2="62" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rsc)"/>
    <line x1="248" y1="55" x2="264" y2="40" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rsc)"/>
    <line x1="248" y1="70" x2="264" y2="85" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rsc)"/>
    <line x1="396" y1="36" x2="426" y2="55" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rsc)"/>
    <line x1="396" y1="88" x2="426" y2="70" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rsc)"/>
    <text x="290" y="150" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">The result: six engineers, a dozen features shipped a day</text>
    <text x="290" y="168" fill="#9aa4b2" font-size="7.6" text-anchor="middle">staging ships on push · prod has one approval button · CI always stands in front</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">GitLab flow for branching, CI on GitHub Actions, CD on Cloud Build — three platforms each owning a leg, but all a developer feels is "I pushed and it's live".</figcaption>
</figure>

The flow is three sentences: after a push, GitHub Actions runs tests and checks; merge into the staging branch and it deploys itself, so anything you want to try is visible the moment you push it; to go to Production, push the prod branch and hit one approval button in Cloud Build. **Zero friction to staging, one human gate to Production, CI always standing in front** — and that's how a team of six shipped a dozen features a day.

The conclusion I've since drawn: **your stack decides what you can build; your CI/CD decides how fast you build it.** Anyone can pick boring tech, but give two teams the same five components and one of them will still be white-knuckling a weekly release. The difference was never the components — it's how many manual steps sit between push and production. Every extra step slows the loop, and speed is a small team's only advantage.

## Reflections

### I wouldn't swap any of them

This is my honest answer after thinking about it for a long time: **I'd keep all five of these components if I started over.** The biggest reason is Django admin — it's close to irreplaceable, but its role has to be stated precisely: **admin is for engineers only**. It's the engineer's safe operating console — far safer than running SQL against the DB directly — for setting up Celery schedules and handling every flavour of one-off request; register a model and you have an interface. Operations and support got purpose-built tools instead (this team took pride in good internal tooling; the console chapter goes into it). For a team with 3 backend engineers, admin is a free extra layer of "you won't fat-finger this". The second reason is Celery: pair it with RabbitMQ and heartbeat scheduling and you have **something close to [[infra-airflow|Airflow]]'s capability with none of Airflow's operational burden**. Comment fetching, batch ordering, invoicing, reconciliation jobs all ran on it. Workflow platforms are good things, but they come with their own servers to keep alive and their own potholes — and at a dozen features a day, "nothing to operate" is itself the biggest feature.

### Spend the complexity budget where it cuts

A small team's complexity budget is fixed: whatever you spend on infra, you don't have for the business. What was smart about these choices (half of it luck, honestly) is that almost the entire budget went to the business — the FSM for comment parsing, the invariants in stock, idempotency in payments. Those are this product's hard parts. The infra was picked as boring as possible: every component mature enough not to surprise you at 2am, and documented well enough that a contractor could be productive in a week. [[pain-before-power|Confirm the pain first]] — and the converse holds too: where you haven't felt pain yet, don't buy the cure.

### The speed was real; the stability was homework we did later

But I have to say the other half out loud: the "fast" in this chapter was bought on credit against "stable". In the early days the API server ran a single process on a single CPU, got flattened the moment a stream went live, and we scrambled traefik in front with four processes to survive. There was no such role as SRE on that team; all the infrastructure was carried by me as backend lead on the side, watching every single stream by hand with my stomach in knots. CI/CD let us send features to production at speed — but **what happened after they landed, we were essentially running blind**. I'll settle that bill in the operations chapter. For now, one line: your opening move decides how fast you run; whether you can keep running is a different subject.
