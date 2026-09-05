---
title: "An SRE Parachuted into a 'Build Everything In-House' Company: Standing Firm in the First 90 Days"
date: 2026-07-14
category: tech
description: "The most thrilling kind of job change is joining a company that builds almost everything itself — no off-the-shelf cloud services, and even Stack Overflow can't help, because the tools here are used by exactly one company in the world. This post covers how an SRE chews through an unfamiliar system from three angles: outside-in by following one real request end to end, top-down by watching it live through the Grafana LGTM stack (Loki/Grafana/Tempo/Mimir), and from zero by rebuilding the whole environment to force out every hidden dependency, closing with a rhythm for the first 90 days. The core mindset: don't rush to prove yourself; get the system's map into your head first. Understand first, act later."
tags:
  - sre
  - career
series: "Google SRE — Reading Notes"
seriesOrder: 14.5
comments: true
draft: false
translationOf: sre-onboarding-inhouse
---
The most thrilling kind of job change is joining a company that **builds almost everything itself**: no off-the-shelf cloud services, and even Stack Overflow can't help — because the infrastructure and deployment tools here are used by exactly one company in the world. Most of the "how to configure such-and-such tool" you've accumulated stops working; the knowledge isn't on the internet, it's hidden **in the code, in a few people's heads, and in past incident records**.

How do you get up to speed in an environment like that? I chew through an unfamiliar system from **three angles** — **outside-in**, following one request; **top-down**, watching it live through observability; **from zero**, rebuilding it to force out every hidden dependency — and close with a rhythm. The core mindset condenses to one sentence: **don't rush to prove yourself; get the system's map into your head first.**

(As an aside: in-house companies usually don't build monitoring from scratch too — many go straight to the open-source **Grafana LGTM stack**; and even if they really did build their own, LGTM's mental model still fits, so I'll use it as the example below.)

## Move one: grab a real request and follow it all the way

If you can only do one thing, do this. The architecture diagram on the wiki is **the ideal, and usually out of date**; what truly forces you to understand a system is picking **one real user request** and tracing it by hand from entry to response, through every hop in between:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 236" role="img" aria-label="Move one: grab a real request and follow it all the way. The request goes from the user through the in-house entry load balancer, the in-house API service, the in-house message queue, and the database. At every hop, stop and ask four questions: what is this component and who maintains it; how do I see its health and where are the monitoring and logs; if it breaks, what happens downstream; what do traffic and data look like when normal." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ob" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Grab one real request and follow it all the way</text>
    <rect x="10" y="42" width="94" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="57" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">user</text><text x="57" y="74" fill="#9aa4b2" font-size="7.4" text-anchor="middle">one real request</text>
    <line x1="104" y1="63" x2="118" y2="63" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob)"/>
    <rect x="120" y="42" width="94" height="42" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="167" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">entry LB</text><text x="167" y="74" fill="#4f6df5" font-size="7.4" text-anchor="middle">(in-house)</text>
    <line x1="214" y1="63" x2="228" y2="63" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob)"/>
    <rect x="230" y="42" width="94" height="42" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="277" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">API service</text><text x="277" y="74" fill="#4f6df5" font-size="7.4" text-anchor="middle">(in-house framework)</text>
    <line x1="324" y1="63" x2="338" y2="63" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob)"/>
    <rect x="340" y="42" width="94" height="42" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="387" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">queue</text><text x="387" y="74" fill="#4f6df5" font-size="7.4" text-anchor="middle">(in-house)</text>
    <line x1="434" y1="63" x2="448" y2="63" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob)"/>
    <rect x="450" y="42" width="94" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="497" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">database</text><text x="497" y="74" fill="#9aa4b2" font-size="7.4" text-anchor="middle">final stop</text>
    <rect x="22" y="104" width="536" height="112" rx="9" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="124" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">Stop at every hop and ask these four</text>
    <text x="46" y="150" fill="#54b890" font-size="8.8" text-anchor="start">① what is this? who maintains it?</text>
    <text x="302" y="150" fill="#54b890" font-size="8.8" text-anchor="start">② how do I see its health? monitoring / logs?</text>
    <text x="46" y="178" fill="#54b890" font-size="8.8" text-anchor="start">③ if it breaks, what happens downstream?</text>
    <text x="302" y="178" fill="#54b890" font-size="8.8" text-anchor="start">④ normally, what do traffic / data look like?</text>
    <text x="290" y="204" fill="#9aa4b2" font-size="8.2" text-anchor="middle">One lap and you hold a "living" architecture map — more accurate than any wiki</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Follow a real request once and what you see is the system <b>as it really is right now</b> — including every ugly special case, detour and "temporary" workaround the wiki never mentions. Answer the four questions at each hop and you've not only drawn the architecture map, you've also learned "what happens when this breaks, and where do I look" — which is exactly SRE's job. The move is really the divide-and-conquer of <a href="/blog/sre-troubleshooting/">troubleshooting</a>, repurposed for onboarding</figcaption>
</figure>

The power of this move is that it fills in three things **at once**: what the system looks like (components and topology), observability (where the monitoring and logs are), and failure imagination (the consequences of each hop breaking). And it's **active** — you aren't passively listening to a briefing, you're digging yourself, and only what you've dug up truly takes root.

## Seeing the system "alive": the Grafana LGTM stack

While "following the request", the question "how do I see its health?" needs a tool to answer it. Modern observability's answer is **three signals** (metrics, logs, traces), and Grafana's **LGTM stack** happens to pair each signal with one backend, then funnels them all into Grafana as the "pane of glass":

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="The Grafana LGTM stack. Three observability signals each get a backend and all flow into Grafana. Metrics measuring volume, latency and error rate go to Mimir, long-term metrics storage compatible with Prometheus. Logs, what happened in detail, go to Loki, log aggregation. Traces, a request's full path across services, go to Tempo, distributed tracing. All three feed Grafana, the unified dashboard for queries and alerts. Usage: spot an anomaly in metrics, check logs for detail, follow traces to find which hop broke." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="lg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Grafana LGTM: metrics, logs, traces, one pane of glass</text>
    <rect x="14" y="44" width="150" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="89" y="61" fill="#e6e6e6" font-size="8.8" text-anchor="middle">Metrics</text><text x="89" y="75" fill="#9aa4b2" font-size="7.6" text-anchor="middle">volume · latency · error rate</text>
    <line x1="164" y1="64" x2="206" y2="64" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lg)"/>
    <rect x="208" y="44" width="150" height="40" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="283" y="61" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">Mimir (M)</text><text x="283" y="75" fill="#9aa4b2" font-size="7.2" text-anchor="middle">metrics store · Prometheus-compatible</text>
    <rect x="14" y="96" width="150" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="89" y="113" fill="#e6e6e6" font-size="8.8" text-anchor="middle">Logs</text><text x="89" y="127" fill="#9aa4b2" font-size="7.6" text-anchor="middle">what happened, in detail</text>
    <line x1="164" y1="116" x2="206" y2="116" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lg)"/>
    <rect x="208" y="96" width="150" height="40" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="283" y="113" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Loki (L)</text><text x="283" y="127" fill="#9aa4b2" font-size="7.6" text-anchor="middle">log aggregation · label index</text>
    <rect x="14" y="148" width="150" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="89" y="165" fill="#e6e6e6" font-size="8.8" text-anchor="middle">Traces</text><text x="89" y="179" fill="#9aa4b2" font-size="7.6" text-anchor="middle">full path across services</text>
    <line x1="164" y1="168" x2="206" y2="168" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lg)"/>
    <rect x="208" y="148" width="150" height="40" rx="6" fill="#2b2540" stroke="#9b6ff0" stroke-width="1.4"/><text x="283" y="165" fill="#9b6ff0" font-size="9" text-anchor="middle" font-weight="bold">Tempo (T)</text><text x="283" y="179" fill="#9aa4b2" font-size="7.6" text-anchor="middle">distributed tracing</text>
    <line x1="358" y1="64" x2="402" y2="90" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lg)"/>
    <line x1="358" y1="116" x2="402" y2="116" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lg)"/>
    <line x1="358" y1="168" x2="402" y2="142" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lg)"/>
    <rect x="404" y="60" width="162" height="112" rx="8" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.6"/><text x="485" y="104" fill="#e0733a" font-size="11" text-anchor="middle" font-weight="bold">Grafana (G)</text><text x="485" y="122" fill="#e6e6e6" font-size="8" text-anchor="middle">one dashboard · queries · alerts</text><text x="485" y="138" fill="#9aa4b2" font-size="7.4" text-anchor="middle">single pane of glass</text>
    <text x="290" y="212" fill="#9aa4b2" font-size="8.3" text-anchor="middle">metrics spot the anomaly → logs give the detail → traces pin down "which hop" broke</text>
    <text x="290" y="226" fill="#d6a45c" font-size="8" text-anchor="middle">L·G·T·M = Loki · Grafana · Tempo · Mimir</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The three pillars of observability: <b>metrics</b> (is something off), <b>logs</b> (what exactly), <b>traces</b> (which hop broke), handled by <b style="color:#4f6df5">Mimir</b>, <b style="color:#54b890">Loki</b> and <b style="color:#9b6ff0">Tempo</b> respectively, all viewed through the <b style="color:#e0733a">Grafana</b> pane of glass. For a newcomer the most critical piece is <b>Tempo's distributed tracing</b> — it effectively automates the previous section's "follow the request": one trace lays out which services the request crossed and how long each hop took (in recent years Pyroscope is often added for profiling, making a fourth signal)</figcaption>
</figure>

For someone just starting, LGTM has a fixed routine that maps onto the [[sre-monitoring|four golden signals]]: first look at **metrics** to catch "where something's off" (latency spiking, error rate rising), then flip to the **logs** for that time window to see "what exactly", finally use **traces** to pin down "which hop, which service dragged the whole chain down". Metrics tell you something happened, logs tell you what, traces tell you where — missing any one, you'll be guessing blind in a 3am incident. So the first piece of infrastructure I want to understand at a new company is usually "**what does our observability look like, and which pane of glass do I look at**".

## The ultimate test of onboarding: can you rebuild the whole environment

The first two moves let you "see" the system, but there's a harsher, more honest test that forces you to "truly understand" it: **try to bring the whole environment up from zero, locally or in a sandbox**. Reading docs, you skip the paragraphs you don't understand without noticing; rebuilding doesn't lie — **miss any one layer of dependency and it simply won't start**, forcing you to dig out every hidden relationship:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 246" role="img" aria-label="Rebuilding the environment from zero stacks five layers, each hiding a landmine reading the docs would miss. Layer one, source: git clone, but how many repos, any private modules. Layer two, build and dependencies: package versions, internal registry, build toolchain. Layer three, dependent services: DB, queue, cache, which start first. Layer four, config and secrets: env, credentials, feature flags, where most people get stuck. Layer five, data, network and observability: schema, seed data, DNS, hooking up LGTM. Only with all five does the environment run locally or in a sandbox, meaning you truly understand it. Reading docs misses things; rebuilding doesn't lie." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rb2" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker></defs>
    <text x="318" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Rebuild from zero: miss one layer and it won't start</text>
    <line x1="52" y1="202" x2="52" y2="46" stroke="#54b890" stroke-width="1.4" marker-end="url(#rb2)"/>
    <text x="40" y="126" fill="#54b890" font-size="8" text-anchor="middle" transform="rotate(-90 40 126)">stack up, or it won't run</text>
    <rect x="70" y="40" width="486" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="290" y="57" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">✓ runs locally / in a sandbox = you actually understand it</text>
    <rect x="70" y="72" width="486" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="86" y="89" fill="#e6e6e6" font-size="8.4" text-anchor="start">⑤ data · network · observability</text><text x="540" y="89" fill="#9aa4b2" font-size="7.8" text-anchor="end">schema/seed, DNS, hook up LGTM</text>
    <rect x="70" y="104" width="486" height="26" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.4"/><text x="86" y="121" fill="#d6a45c" font-size="8.4" text-anchor="start" font-weight="bold">④ config &amp; secrets</text><text x="540" y="121" fill="#9aa4b2" font-size="7.8" text-anchor="end">env, credentials, feature flags — most get stuck here</text>
    <rect x="70" y="136" width="486" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="86" y="153" fill="#e6e6e6" font-size="8.4" text-anchor="start">③ dependent services</text><text x="540" y="153" fill="#9aa4b2" font-size="7.8" text-anchor="end">DB / queue / cache: which start first?</text>
    <rect x="70" y="168" width="486" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="86" y="185" fill="#e6e6e6" font-size="8.4" text-anchor="start">② build &amp; dependencies</text><text x="540" y="185" fill="#9aa4b2" font-size="7.8" text-anchor="end">package versions, internal registry, toolchain</text>
    <rect x="70" y="200" width="486" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="86" y="217" fill="#e6e6e6" font-size="8.4" text-anchor="start">① source</text><text x="540" y="217" fill="#9aa4b2" font-size="7.8" text-anchor="end">git clone — but how many repos? private?</text>
    <text x="318" y="240" fill="#e0733a" font-size="8.2" text-anchor="middle">Reading docs, you skip what you don't get; rebuilding forces you to understand every layer</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Rebuilding is a "truth mirror" because it <b>doesn't allow vagueness</b>: one missing environment variable, one forgotten dependent service, the wrong build-tool version, and the system won't start, forcing every hidden dependency into the open. The layer people most often get stuck on is <b style="color:#d6a45c">config and secrets</b> — because that's exactly what docs love to omit and what travels by word of mouth. Once you can bring the whole environment up from zero, your understanding upgrades from "seen it" to "truly get it", and you've also learned what disaster recovery (DR) will have to rebuild</figcaption>
</figure>

In practice you don't have to rebuild at Production scale; the point is to **get the dependency chain working end to end**: which services start first, who depends on whom, where config comes from, how data is seeded. Many companies have a `docker-compose` or a one-shot local-environment script — if so, run it once as written, then deliberately break one link and see how it fails; if not, **writing that script for them** is one of the most valuable contributions you can make during onboarding (more on this in the next section).

## The rhythm of the first 90 days: understand first, act later

The mistake newcomers make most easily is rushing to "do something to prove myself" in week one — changing config, proposing refactors, criticising this and that. In a company with in-house systems this is almost guaranteed to step on a mine, because behind every odd-looking design there's usually a bloody reason you haven't seen yet. The rhythm I set for myself:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="The rhythm of the first 90 days, four stages from bottom to top. Stage one, weeks 1 to 2, build the map: trace a request, read code, learn what normal looks like in LGTM. Stage two, weeks 3 to 6, shadow plus rebuild: shadow on-call, read past postmortems, rebuild the environment in a sandbox. Stage three, month 2, first contribution: fill a missing runbook or doc, low risk, high value. Stage four, month 3, start automating: pick a toil you've personally suffered and fix it. Throughout: understand first, act later; don't make big changes in week one." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="oc" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker></defs>
    <text x="318" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">First 90 days: understand first, act later</text>
    <line x1="52" y1="192" x2="52" y2="40" stroke="#54b890" stroke-width="1.4" marker-end="url(#oc)"/>
    <text x="40" y="118" fill="#54b890" font-size="8" text-anchor="middle" transform="rotate(-90 40 118)">depth · trust ↑</text>
    <rect x="70" y="34" width="486" height="32" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="86" y="54" fill="#54b890" font-size="9" text-anchor="start" font-weight="bold">Month 3 · start automating</text><text x="546" y="54" fill="#9aa4b2" font-size="8.2" text-anchor="end">pick a toil you've personally suffered, fix it</text>
    <rect x="70" y="72" width="486" height="32" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="86" y="92" fill="#4f6df5" font-size="9" text-anchor="start" font-weight="bold">Month 2 · first contribution</text><text x="546" y="92" fill="#9aa4b2" font-size="8.2" text-anchor="end">fill a missing runbook / doc (low risk, high value)</text>
    <rect x="70" y="110" width="486" height="32" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="86" y="130" fill="#4f6df5" font-size="9" text-anchor="start" font-weight="bold">Weeks 3–6 · shadow + rebuild</text><text x="546" y="130" fill="#9aa4b2" font-size="8.2" text-anchor="end">shadow on-call, read postmortems, rebuild in a sandbox</text>
    <rect x="70" y="148" width="486" height="32" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.3"/><text x="86" y="168" fill="#d6a45c" font-size="9" text-anchor="start" font-weight="bold">Weeks 1–2 · build the map</text><text x="546" y="168" fill="#9aa4b2" font-size="8.2" text-anchor="end">trace a request, read code, learn "normal" in LGTM</text>
    <text x="318" y="204" fill="#e0733a" font-size="8.6" text-anchor="middle" font-weight="bold">⚠ No big changes before you understand</text>
    <text x="318" y="220" fill="#9aa4b2" font-size="8.2" text-anchor="middle">Every odd design in an in-house system usually has a reason you haven't seen (Chesterton's fence)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The spine of the rhythm is "understand first, act later": the first six weeks are almost all input (build the map, shadow, read incidents); only in month 2 do you produce a first contribution in the lowest-risk way (fill in docs), and only in month 3 touch automation. The higher you go, the bigger the moves and the more trust they need — and that trust is what you bought in the earlier weeks by "understanding the system first"</figcaption>
</figure>

Of these, **shadowing on-call + reading past postmortems** is the stretch I consider highest return. Past postmortems amount to a condensed textbook of "how this system really breaks, and where" — worth more than any architecture briefing, because they describe real bloodshed rather than the designer's wishful thinking. Watching "what normal looks like" in Grafana is the other half: you have to know what the system looks like when healthy before you can tell abnormal from normal when something breaks. As for **trying to rebuild the environment in a sandbox**, I put it in this stage rather than later because it's best done during the honeymoon when you "still dare to ask dumb questions" — you'll definitely get stuck rebuilding, and getting stuck is the perfect excuse to ask about, and understand, the dependency chain.

## A few special plays for all-in-house companies

- **Knowledge hides in three places**: the code (the final truth), past postmortems (where it blows up), and that senior who "knows everything" (ask them, but don't depend only on them — people leave). If it isn't on the internet, dig in these three.
- **Build a jargon sheet early**: in-house tools have their own internal names, abbreviations, terms. Start recording in week one; two weeks later you'll thank yourself.
- **Treat "all the code is in your hands" as a bonus**: with SaaS you can only guess at a black box, but every line of an in-house system is in your repo — you can **actually read to the bottom, and actually change it**. It's the one place an in-house environment beats everyone else; use it well.
- **Ask "why did they build it themselves" before saying "replace it"**: don't rush to shout "just swap this for open-source X". They didn't use the off-the-shelf thing back then usually for a reason you haven't hit yet — understand first, evaluate second.

## Reflections

### A newcomer's greatest asset is "not understanding" — don't waste it

In the first few weeks at a company you own something **you'll never get back**: a pair of eyes that "take nothing for granted". Every place you get stuck while onboarding, every moment of "what is this? why has nobody written it down", precisely marks **a gap in the documentation** — and that's your best contribution list for month one. Every time I land in a new environment I open a "where I got stuck" note, and two months later it becomes the first batch of runbooks I fill in. **Because a little later you'll have "got used to it", those pits become everyday things you no longer see, and that perspective is gone for good.** Not understanding isn't a weakness; it's an asset with a shelf life.

### Understand first, act later isn't slow; it's respect for the system's complexity

When I was younger I badly wanted to "fix something in week one" to prove I deserved the hire, and the result was often that I changed a design I thought redundant, only to discover it was guarding an edge case I hadn't seen. In-house systems especially — those seemingly stupid special cases are often scars from some 3am incident. So my discipline now: **when I see something odd, I first ask "how did it get this way", not "this is terrible".** It's the same spirit as [[sre-troubleshooting|troubleshooting]] — **trust the evidence, don't guess on intuition**; and consistent with the underlying assumption of [[sre-postmortem|blameless]]: the design in front of you isn't there because your predecessors were stupid, but because they faced situations you haven't yet. Understanding first, criticism second.

### Whether you can rebuild it by hand is the mirror of whether you understand it

Whether I dare say "I understand" a system has exactly one standard: **can I bring it up from zero myself.** After reading the docs and hearing the briefing, you'll have the illusion of "I more or less get it" — an illusion that gets punctured, layer by layer, the moment you actually rebuild: oh, this service depends on that internal API nobody mentioned? Where does this environment variable come from? Who manages this secret? **Every place you get stuck is evidence that what you "thought you understood" you didn't.** I love this test, because what it forces out is exactly what an SRE most needs to master: the complete dependency chain, the startup order, the sources of config — the very same things you'll have to rebuild by hand, at night, under pressure, in **disaster recovery (DR)**. Rebuilding the environment during onboarding is a rehearsal of the worst case in advance; and leaving the rebuild script (`docker-compose`, one-shot environment) in good shape for those who come after turns a one-off pain into an asset for the whole team.

### Reading postmortems is the most efficient onboarding material I've seen

If I could recommend one thing to a parachuted-in SRE, it's **read every postmortem from the past six months to a year**. A good incident report condenses the system's most fragile joints, its most misunderstood parts, and how people actually behave under real pressure — things the new-hire deck will never tell you, because they're too real and too unflattering. The week I spent reading postmortems taught me more about the system than the previous month of briefings. It also deepened my conviction about the value of [[sre-monitoring|monitoring]] and a [[sre-postmortem|postmortem]] culture: an organisation willing to record honestly how it breaks has pre-written the most precious map for every future newcomer.
