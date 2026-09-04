---
title: "The Moment of Opening: The Three Seconds After the Host Calls a Key"
date: 2026-08-01
category: tech
description: "13,000 viewers online and 200 comments a second at the instant bidding opens — the real shape of a peak; two fates, where batch paths silt up and sync paths blow on contact; the poison-pill incident that made a whole batch of orders vanish; and a read-path war story running from a fat API through traefik and a DDoS to the cloud bodhisattva."
tags:
  - war-story
  - live-commerce
  - scalability
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 14
comments: true
draft: false
translationOf: rezero-flash-crowd
---
The transaction and operations stories are done; the next few chapters are about things that cut across the whole system: peaks, operations, reconciliation. Starting from the origin point of all live commerce — **the three seconds after the host calls a key**. This chapter has real numbers, the most painful incident of all, and a war story running from being flattened all the way to a "cloud bodhisattva".

## The shape of a peak: a wall, then a run of waves

Numbers first. A big stream had **up to 13,000 viewers online**, with an ordinary peak around 9,000. While the host is introducing a product, comments average **10–20 a second**; at the instant they call the key and open bidding — **200 a second**.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 250" role="img" aria-label="The shape of comment traffic across one bidding close. While a product is being introduced it runs at roughly ten to twenty comments a second; at the instant bidding opens it jumps within one second to two hundred a second — a vertical wall. It then falls back, and during the close the host drops promotions at unpredictable moments, pulsing the traffic up again into a run of waves. A close averages three minutes, and can be as short as ten seconds. Side note: thirteen thousand viewers online, and with a second channel opening at the same time the worst-case combined rate is about two hundred and fifty a second." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="56" y1="196" x2="560" y2="196" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="56" y1="196" x2="56" y2="28" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="56" y1="44" x2="560" y2="44" stroke="#3a4154" stroke-width="0.8" stroke-dasharray="4 4"/>
    <text x="50" y="48" fill="#9aa4b2" font-size="7" text-anchor="end">200/s</text>
    <line x1="56" y1="178" x2="560" y2="178" stroke="#3a4154" stroke-width="0.8" stroke-dasharray="4 4"/>
    <text x="50" y="182" fill="#9aa4b2" font-size="7" text-anchor="end">10–20/s</text>
    <path d="M 60 180 L 195 179 L 200 46 L 245 52 L 285 118 L 318 124 L 328 62 L 348 68 L 378 128 L 398 132 L 408 72 L 428 78 L 468 150 L 556 172" fill="none" stroke="#4f6df5" stroke-width="2"/>
    <text x="128" y="168" fill="#9aa4b2" font-size="7" text-anchor="middle">showing the product</text>
    <text x="212" y="32" fill="#e05a7d" font-size="7.6" text-anchor="middle" font-weight="bold">bidding opens: 10–20× in one second</text>
    <text x="380" y="52" fill="#d6a45c" font-size="7.2" text-anchor="middle">promos dropped during the close → a run of waves</text>
    <text x="308" y="216" fill="#9aa4b2" font-size="7" text-anchor="middle">one close: 10 seconds at the short end, 3 minutes on average</text>
    <text x="308" y="236" fill="#9aa4b2" font-size="7" text-anchor="middle">13,000 viewers online; with a second channel opening at once, ~250 comments/s at worst</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">A peak isn't a curve, it's a wall — and behind the wall isn't a plain, it's wave after wave as the host drops promotions.</figcaption>
</figure>

Two things about that shape: **it's a step, not a ramp** — one sentence from the host and traffic jumps 10–20× within a second, faster than any autoscaling can react, so capacity has to be provisioned for the peak and shaving it can only come from structure; and **it's a pulse train, not a single peak** — a close averages three minutes, and during a long one the host drops promotions at random moments and traffic surges again. [[rezero-comment-order|Adaptive fetching]] (speed up with the paging key on a surge, slow down when idle) looked like instinct at the time; against this shape it's precise: fixed-rate polling loses at both ends of a pulsing load.

One more thing worth saying up front, because it's the chapter's foundation: **13,000 viewers online, but the write peak is only 200 a second — at peak everyone is in the comments, and the site's writes are actually modest.** If this were a traditional e-commerce flash sale, 13,000 people would be 13,000 concurrent checkout requests landing straight on your API; "buying by comment" **compresses thirteen thousand purchase intentions into one linear text channel**, with Facebook's chat infrastructure absorbing the fan-in for free, leaving your system a single 200/s stream to digest. **The business model shaves its own peak** — an interaction that looks primitive turns out to be brilliant traffic design, and nobody thought about it that way at the time.

## Two fates: batch silts up, sync blows on contact

With the shape of the traffic established, here's the chapter's thesis: under a peak, this system's components have two fates.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="Two fates under a peak. On the left, batch paths silt up but don't fall: the FSM batch consuming comments, the Facebook batch API sending notices, and the WebSocket pushing the comment waterfall in batches — overload shows up as backlog and slowdown, paid for in latency, with degradation built in. On the right, sync paths blow on contact: a bloated round list API whose response contains everything, flattening a single process, with traefik jammed in front and four processes to survive, the debt left alone and later detonated by a DDoS, finally resolved by Cloudflare — overload shows up as a crash, paid for in availability. The conclusion at the bottom: batch everything batchable and starve the sync paths that remain." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="290" y1="14" x2="290" y2="222" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="30" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Batch paths: they silt, they don't fall</text>
    <rect x="30" y="44" width="240" height="24" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="150" y="60" fill="#e6e6e6" font-size="7" text-anchor="middle">comment orders: consumed by the FSM batch</text>
    <rect x="30" y="76" width="240" height="24" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="150" y="92" fill="#e6e6e6" font-size="7" text-anchor="middle">win notices: the FB batch API</text>
    <rect x="30" y="108" width="240" height="24" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="150" y="124" fill="#e6e6e6" font-size="7" text-anchor="middle">host waterfall: the WebSocket batches too</text>
    <text x="150" y="160" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">overload looks like: backlog, slowdown</text>
    <text x="150" y="176" fill="#9aa4b2" font-size="7" text-anchor="middle">paid in latency · degradation is built in</text>
    <text x="430" y="30" fill="#e05a7d" font-size="9" text-anchor="middle" font-weight="bold">Sync paths: they blow on contact</text>
    <rect x="310" y="44" width="240" height="36" rx="5" fill="#3a2632" stroke="#e05a7d" stroke-width="1.2"/>
    <text x="430" y="59" fill="#e6e6e6" font-size="7" text-anchor="middle">round list API: a response containing everything</text>
    <text x="430" y="73" fill="#e05a7d" font-size="6.4" text-anchor="middle">every logged-in user pulls the whole catalogue</text>
    <text x="430" y="100" fill="#e05a7d" font-size="7" text-anchor="middle">→ the single process gets flattened</text>
    <text x="430" y="118" fill="#d6a45c" font-size="7" text-anchor="middle">→ traefik jammed in, four processes hold</text>
    <text x="430" y="136" fill="#9aa4b2" font-size="7" text-anchor="middle">→ "it holds, leave it for now"</text>
    <text x="430" y="154" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">→ a DDoS blows it open</text>
    <text x="430" y="176" fill="#9aa4b2" font-size="7" text-anchor="middle">paid in availability · no degradation to speak of</text>
    <text x="290" y="210" fill="#e6e6e6" font-size="8.2" text-anchor="middle" font-weight="bold">Survival rule: batch everything batchable, starve the sync paths that remain</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">One peak, two ways of paying: batch pays in latency, sync pays in availability.</figcaption>
</figure>

That batch column is the third time batching saved this system: comment orders on the [[rezero-comment-order|FSM batch]] (minutes of backlog at open, but no crash), win notices on the [[rezero-notification|FB batch API]], and even the host dashboard's comment waterfall **pushed in batches** — 200 a second, absorbed. An overloaded batch system's symptom is **silt**: the queue lengthens and latency grows, but it doesn't fall over; it pays in latency rather than availability.

That also explains something interesting in hindsight: **this system had no degradation features at all** — not an oversight; the line at the time was "we haven't had any incidents yet, what would we degrade?". Half right; the other half is deeper: **a degradation switch is a necessity for synchronous systems, because their overload is an avalanche; a batch system's degradation is built in**, silting rather than falling by nature. Everything that actually blew up was in the sync column — which brings us to the war stories.

## The most painful one: a poison pill

First, the batch side's only serious wound, which wasn't inflicted by traffic but poisoned by **a single row of data**.

The system wasn't fully launched yet — some acceptance testing was still outstanding, but the host's **contract with the original third-party software company collapsed early** and the system was pushed straight into combat: the launch date was never ours to set. Then during one stream something strange happened: **plenty of comments, and orders barely trickling in**. The host was furious.

The culprit was one line at a boundary: within a batch of 200, **one comment failing to parse unexpectedly aborted the whole batch** — one weird comment dragging 199 innocent orders down with it. The stream-processing world calls this a **poison pill**, and our version hurt especially because of the **blast radius**: the unit of failure was the batch, not the row. The symptoms were deeply deceptive too: ingestion was entirely healthy, the comment waterfall kept flowing, and only the conversion rate quietly went to zero — the hardest kind of failure to catch on a monitor is exactly this, where nothing is broken and there's simply no output.

The fix was that "second-best" measure from [[rezero-comment-order|the comment chapter]]: **skip the failing row and keep the rest running** — my memory is a little distant, but it should have been changed right after this incident. Put in evolutionary order, the "skipping" we criticised was in fact the bleeding stopped from something far worse: the whole batch dies (the incident) → skip the single row (the fastest tourniquet) → dead-letter recovery (step three of the rebuild). **Shrink the blast radius first, restore completeness later** — the order is right, only step three never got finished.

## Read-path war stories: from a fat API to the cloud bodhisattva

The sync side's story is a complete causal chain, worth telling in order.

**Link one: an API containing everything.** A user logs into the home page and calls the "round list" API — and the response is detailed information, right down to product data. What flattened a single process was never the number 13,000, it was **the weight of each request**: deep queries, heavy serialisation, a fat payload, with every logged-in user pulling the whole catalogue.

**Link two: emergency tourniquet.** The single process came down immediately, traefik went in front, and four API services came up — it held. But "there was too much to do, so once it held we left it" — the fat endpoint stayed exactly where it was. That's the standard life cycle of technical debt: what separates the tourniquet from the cure isn't ability, it's a priority that never makes the list.

**Link three: the next load test was run for free by an attacker.** One day a DDoS blew it open — **an hour of being unable to move at all**. We rushed GCP's Cloud Armor into place, and it **did nothing**; the bill, on the other hand, went up **$1,000 in an hour**, plus what Cloud Armor cost on top. GCP really does know how to earn.

**Link four: the cloud bodhisattva.** Finally we moved the domain name layer to Cloudflare — **and it was fine, and free**. Truly, a cloud bodhisattva saving the mortal world.

One lesson per link: an API's schema design is the front line of capacity engineering (the cheapest scaling is not sending fields nobody wants); the consequence of "it holds, leave it" is letting an attacker prioritise your technical debt for you; and the one nobody spells out — **your defence must not be billed alongside the attack**. Per-request-priced L7 defence under a DDoS amplifies your bill on the attacker's behalf; Cloudflare absorbs the traffic at the DNS/edge layer and the free tier is enough — **the right place for defence is the edge, not the door of the origin**.

## What a rebuild would do

1. **Hold the line on list APIs.** A list returns only the fields needed, under a convention that's consistent site-wide; stay RESTful and don't cram every odd thing into one response. This one has to be won in requirements meetings, not in the server room — one extra field is cheap for the front end, and 13,000 people each taking a copy is a capacity incident.
2. **Put the domain on Cloudflare on day one.** Leave the specialised things to specialists rather than letting an all-in-one vendor take a cut for something that may not even work well — DDoS protection, CDN, a free tier, all at once.
3. **Finish step three of the poison-pill answer.** After skipping the single row, failed events go to a dead-letter queue for replay ([[rezero-comment-order|the comment chapter]]'s rebuild lays it out) — blast radius shrunk to one row, completeness caught by the recovery path.
4. **Put a gauge on the batch backlog.** "Silts but doesn't fall" only works if **you can see the silt** — batch lag is the single health metric that matters in this architecture, and it should be on a screen before the host goes live, not discovered when somebody in the comments asks why their notice hasn't arrived.

## Reflections

### Overload always gets paid for; the architect chooses the currency

There's no free lunch under a peak: once load exceeds capacity, the system pays along some dimension — a batch system pays in **latency**, a synchronous one pays in **availability**. The entire difference between this chapter's two storylines is the currency: comments backlogged for minutes cost a few complaints and the system lived; the fat API blew on contact and took the whole site with it. So "batch everything batchable" isn't a performance optimisation, it's **choosing how you go bankrupt** — a latency debt can be paid in instalments (work the backlog down), an availability debt is due in full immediately. When designing a system, ask yourself: for each path, which currency do I pay in at overload? Whichever one you can't afford, convert it into one you can.

### A peak is the shape of the business model, not of the traffic

The 200/s wall, the pulse train of promotions, two channels overlapping — those aren't "traffic characteristics", they're **the rhythm of the business projected directly onto the system**: the host calling a key causes the wall, dropping promotions causes the waves, ordering by comment causes the peak-shaving. Understanding how the business runs before doing capacity planning beats any load test — and conversely, the first lesson of a [[sre-cascading-failures|cascading failure]] is the same: a system's failure modes are also decided by the shape of the business. That "the business model shaves its own peak" dividend was one we enjoyed for a long time before noticing it existed — sometimes the best architectural decision is one the business made for you.

### The bill is an attack surface too

During that DDoS hour, the system being frozen was one kind of wound; **$1,000 extra on the bill was another** — and the second kind keeps going after the attack ends, because the service you bought to defend yourself is also billed by traffic. Security design in the cloud era has to include the cost model: an attacker's cost approaches zero, and if your defence is priced per request you've already lost economically. Keeping an attack off your billing meter (edge layer, flat rate, free tier) matters as much as keeping it out of your system — **half of security architecture is financial architecture**.
