---
title: "The Future of Data Engineering: Tools Change, the Foundation Doesn't, Reading Fundamentals of Data Engineering, Ch. 11 (Finale)"
date: 2026-07-06
category: tech
description: "The series finale. What is the future of data engineering? This post takes apart the last chapter of Fundamentals of Data Engineering — tools will keep changing and keep getting simpler, but the lifecycle and the undercurrents stay. Bet on the foundation, not the tools."
tags:
  - data-engineering
  - book-notes
series: "Fundamentals of Data Engineering — Reading Notes"
seriesOrder: 11
comments: true
draft: false
translationOf: fode-11
---
Eleven chapters in, one last question: **what will the future of data engineering look like?** The book's answer is both reassuring and a little counter-intuitive — **tools will keep changing, and keep getting simpler; but the lifecycle and undercurrents underneath won't change.** This post is also the end of the series.

## The core message: tools change, the foundation doesn't

This chapter gathers the whole book's position into one line: **don't bet on the tools, bet on the foundation.** This year's hottest framework, next year's new platform, may go unmentioned three years on; but the [[fode-2|data engineering lifecycle]] — source, ingestion, storage, transformation, serving, plus the undercurrents running through it — won't go anywhere for decades:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 300" role="img" aria-label="Changing tools on top (hot frameworks, managed services, new platforms, dashed to show they date); the unchanging foundation below, the data engineering lifecycle (source → ingestion → storage → transformation → serving) plus the undercurrents (security, data management, orchestration, software engineering, DataOps)" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="fu1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="300" y="15" fill="#9aa4b2" font-size="10.5" text-anchor="middle">Changing tools — always replaced, ever simpler</text>
    <rect x="40" y="24" width="118" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/><text x="99" y="48" fill="#e6e6e6" font-size="10" text-anchor="middle">hot framework</text>
    <rect x="170" y="24" width="118" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/><text x="229" y="48" fill="#e6e6e6" font-size="10" text-anchor="middle">managed service</text>
    <rect x="300" y="24" width="118" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/><text x="359" y="48" fill="#e6e6e6" font-size="10" text-anchor="middle">new platform</text>
    <rect x="442" y="24" width="118" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/><text x="501" y="48" fill="#e6e6e6" font-size="10" text-anchor="middle">next year's tool</text>
    <line x1="40" y1="82" x2="560" y2="82" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 4"/>
    <text x="40" y="98" fill="#9aa4b2" font-size="8.5" text-anchor="start">↑ may be unused in three years</text>
    <text x="560" y="98" fill="#9aa4b2" font-size="8.5" text-anchor="end">↓ a thirty-year bet you won't regret</text>
    <rect x="30" y="110" width="540" height="170" rx="10" fill="none" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="300" y="132" fill="#4f6df5" font-size="12" font-weight="bold" text-anchor="middle">The unchanging foundation</text>
    <rect x="39" y="148" width="90" height="42" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="84" y="174" fill="#e6e6e6" font-size="10.5" text-anchor="middle">source</text>
    <rect x="147" y="148" width="90" height="42" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="192" y="174" fill="#e6e6e6" font-size="10.5" text-anchor="middle">ingestion</text>
    <rect x="255" y="148" width="90" height="42" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="300" y="174" fill="#e6e6e6" font-size="10.5" text-anchor="middle">storage</text>
    <rect x="363" y="148" width="90" height="42" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="408" y="174" fill="#e6e6e6" font-size="10" text-anchor="middle">transformation</text>
    <rect x="471" y="148" width="90" height="42" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="516" y="174" fill="#e6e6e6" font-size="10.5" text-anchor="middle">serving</text>
    <line x1="129" y1="169" x2="147" y2="169" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#fu1)"/>
    <line x1="237" y1="169" x2="255" y2="169" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#fu1)"/>
    <line x1="345" y1="169" x2="363" y2="169" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#fu1)"/>
    <line x1="453" y1="169" x2="471" y2="169" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#fu1)"/>
    <rect x="39" y="210" width="522" height="44" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="300" y="230" fill="#54b890" font-size="10.5" text-anchor="middle">undercurrents</text>
    <text x="300" y="246" fill="#9aa4b2" font-size="9" text-anchor="middle">security · data management · orchestration · software engineering · DataOps</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The tools on top keep being replaced, and keep getting easier; but the lifecycle plus undercurrents underneath won't change for decades — if you're betting, bet on the foundation</figcaption>
</figure>

This is the final instalment of [[fode-4|Ch. 4's "anchor the architecture to the immutable foundation"]]: **learning a tool goes out of date; learning the lifecycle and trade-off thinking doesn't.**

## Several directions for the future

So where, concretely, is it heading? The book makes several predictions, condensed into one table:

| Trend | In one line |
|---|---|
| **Simplification, rising abstraction** | Tools wrap ever more, freeing the DE from "plumbing" (see below) |
| **Real time becomes the default** | The line between [[fode-7\|batch and streaming]] blurs, live data becomes the norm |
| **Merging with software engineering** | DEs look more and more like SWEs: version control, tests, CI become baseline |
| **Undercurrents carry more weight** | [[fode-10\|Security]], data management, orchestration, DataOps go from bonus to required |
| **Upward, closer to the business** | Saved effort moves to modeling and business value rather than fixing pipelines |

### Abstraction grows upward: the DE freed from "plumbing"

The book's central prediction is **simplification**: managed services and declarative tools (SQL, [[dbt-intro|dbt]]) wrap the low level ever better, so data engineers no longer stand up clusters themselves or hand-write piles of glue code. Where does the saved effort go? **Upward, closer to business value.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 230" role="img" aria-label="Abstraction growing upward: in the past the DE hand-wired pipelines, ran their own clusters and wrote glue code (close to the low-level plumbing); in the future, using managed and declarative tools, the effort moves to modeling and business value (close to the business)" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="fu2" markerWidth="10" markerHeight="10" refX="5" refY="8" orient="auto"><path d="M0,8 L5,0 L10,8 z" fill="#4f6df5"/></marker></defs>
    <line x1="46" y1="205" x2="46" y2="30" stroke="#4f6df5" stroke-width="1.6" marker-end="url(#fu2)"/>
    <text x="30" y="120" fill="#9aa4b2" font-size="9.5" text-anchor="middle" transform="rotate(-90 30 120)">abstraction · closer to business ↑</text>
    <rect x="90" y="145" width="410" height="62" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="295" y="169" fill="#e6e6e6" font-size="11" text-anchor="middle">Past: hand-wired pipelines, own clusters, piles of glue code</text>
    <text x="295" y="189" fill="#9aa4b2" font-size="9" text-anchor="middle">working as a plumber, effort spent on the low level</text>
    <rect x="90" y="28" width="410" height="62" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="295" y="52" fill="#e6e6e6" font-size="11" text-anchor="middle">Future: managed services, declarative (SQL / dbt)</text>
    <text x="295" y="72" fill="#9aa4b2" font-size="9" text-anchor="middle">saved effort spent on modeling and business value</text>
    <line x1="295" y1="145" x2="295" y2="92" stroke="#4f6df5" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#fu2)"/>
    <text x="410" y="120" fill="#4f6df5" font-size="9" text-anchor="middle">tools get simpler → DE moves up</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Tools wrap the low level ever better, the data engineer is freed from "plumbing", and the effort moves up to where business value lives — the chapter's central prediction for the future</figcaption>
</figure>

Some worry "if the tools automate everything, are DEs no longer needed?" The book's view is the opposite: **automating the low level pushes the demand upward** — someone has to decide the architecture, choose the technology, mind governance and quality, translate data into models the business understands. Those **judgements** won't be replaced by tools.

## Reflections

### After eleven chapters, the biggest takeaway is "don't chase tools"

That's the sentence I most wanted to take from this whole series. Content teaching "how to use tool X" overflows the market, but this book from start to finish is about **the lifecycle, the undercurrents, and trade-off thinking** — the things that remain when the tools change. Writing the [[spark-intro|Spark]], [[kafka-intro|Kafka]], [[airflow-intro|Airflow]] and [[dbt-intro|dbt]] series I was clear: the tool is only the vehicle; what I really wanted to convey is **why it was designed that way and which trade-off it resolves**. This chapter stamps the whole book, and my series with it: **tools are the means; the foundation is the skill.**

### The simpler the tools, the more valuable the fundamentals

Counter-intuitive, but I believe it more every year. Once standing up clusters and wiring pipelines are wrapped away by managed services, "can operate tool X" is no longer a moat — because everyone can. What really separates people becomes what the tools can't help you with: **how this data should be modeled, which way this trade-off should lean, how to debug this broken pipeline from first principles, who guards this data's quality and trust.** So tools getting simpler doesn't devalue the fundamentals; it makes them **worth more**. Which echoes my judgement all along — bet on foundations like [[fode-6|SQL and object storage]] that don't change for decades, not on this year's hottest framework.

### This series ends here, but this way of thinking is only starting to be used

Eleven posts of reading notes done, and the most precious thing about *Fundamentals of Data Engineering* is that it **doesn't teach you to chase new tools; it teaches a thinking skeleton that won't go out of date for decades**: break any data problem into the five stages of the lifecycle, then ask about each stage's trade-offs and each undercurrent's guardianship. Whatever new tool or "AI does data engineering automatically" wave comes next, I'll meet it with this skeleton — first asking which stage of the lifecycle it lands in and which trade-off it resolves for me, rather than being led by its novelty. **That is what this book, and this series, most wanted to leave behind.**
