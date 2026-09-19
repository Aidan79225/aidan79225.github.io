---
title: "The Neck on the Board: How Tools Design Human Responsibility — Auditing Two Open-Source Projects"
date: 2026-08-13
category: tech
description: "An engineer in 2026 doesn't work with AI on a blank page — they work inside a pile of new tools. I picked two open-source projects, skipped the marketing and read the code, to see where human responsibility sits in their design: Multica draws the neck downstream but fits no lock; Superpowers moves it upstream and locks it. One funnel, two necks."
tags:
  - ai
  - leadership
series: "The Craft of Working with AI (2026)"
seriesOrder: 3
translationOf: ai-responsibility-design
---
## Preface

[[responsibility-funnel|Part one]] set up the model: AI eats the wide layers, a human holds the neck. [[ai-incident-clock|Part two]] threw the model into a live incident to test it. This one looks at tools — because an engineer in 2026 isn't collaborating with AI on a blank page, they're doing it inside a pile of new tools: agent boards, multi-agent orchestration, spec workflows. There are more of them every month, and after a while they produce a particular unease: **they make the work look orderly, and yet nobody seems to be carrying the responsibility.**

That unease deserves to be taken seriously, so I ran an audit: pick two representative open-source projects, skip the marketing copy and read the code, and see where "human responsibility" sits in their design. The two samples happen to be opposite ends of the spectrum: **Multica** (an agent team board) and **Superpowers** (a spec-first development workflow). Every quote is pinned to the commit I audited (Multica `6bce42b`, Superpowers `44c9b2d`) — code changes, and the conclusions stand as of then.

To be clear: this isn't a hit piece. Both projects are thoughtful work in their category — it's precisely because they're thoughtful that they're worth dissecting.

## Sample one: Multica — the neck is drawn downstream, but no lock is fitted

[Multica](https://github.com/multica-ai/multica) is an open-source agent workspace: AI agents show up on the board like colleagues — assigned issues, picking up work, commenting as they go, handing back for review when done. The homepage tagline states the era honestly: "Your next 10 hires won't be human." And its copy consciously promises a neck: "**nothing ships without a human saying so**."

The audit produced four findings, each more interesting than the last.

**Finding one: "an agent delivers at `in_review`" is a prompt convention, not a state machine.** The runtime manual fed to agents says "deliver with `in_review`"; but the same manual lists the command available to agents, `multica issue status <id> <status>` — and the legal values **include `done`**. On the server side? The API that updates an issue only validates that the status string is in the enum, with **no check of who you are**. Their own source comments spell out the design principle: the default contract for issues and comments is that **"agent and human are interchangeable"** — an agent's request counts as the owner's own.

**Finding two: they built the lock that guards the neck, and fitted it only to money.** Multica's auth layer stamps each request tamper-proof: a human login gets no stamp, an agent's task token gets `X-Actor-Source: task_token`. There's a ready-made middleware, `RequireHumanActor`, that returns 403 "this endpoint is only available to human actors" when it sees a machine stamp. Where is it mounted? **On the billing routes only** — with the reason in the comment: an agent compromised by prompt injection mustn't open a checkout page for the attacker or peek at the owner's wallet. Entirely correct reasoning. But it means that stopping agents from dragging cards to Done is one `r.Use()` away — **and they chose not to fit it**. Money has a neck; Done doesn't.

**Finding three: completion equals silence.** Multica's notification system treats `in_review` as the primary "this needs you" signal — the human attention path hangs off that state. So an agent (tricked, or simply confused) that drags an issue straight to `done` not only bypasses acceptance, **it doesn't even ring a bell**. Anyone who read [[ai-incident-clock|the last post]] should have goosebumps: this is the organisational version of the poison message's "failure equals silence", and more insidious — a silent completion gets investigated even less than a silent failure.

**Finding four: there's no "accountable" in the schema.** An issue has one assignee field (human or agent) plus a creator. The non-transferable A in RACI — who stands up when it breaks — **does not exist in the data model**. Meanwhile agent-to-agent permissions are fine-grained: only a squad leader can change a parent issue's status, so another agent can't push your work around. **The turf between agents is drawn more clearly than the neck between humans and agents.**

In fairness: Multica's real shipping neck is outsourced to GitHub — agents can't reach main, and a human still presses merge on the PR; execution logs are complete and replayable, so auditability isn't bad at all. So the conclusion isn't "they don't get it", it's something more interesting: **they fit locks in order of value — money > code merge > board status.** And board status happens to be where a team believes it can see the truth, so responsibility evaporates most silently in the most visible place.

## Sample two: Superpowers — the neck moved upstream, and locked

[Superpowers](https://github.com/obra/superpowers) is Jesse Vincent's open-source development methodology, a set of skills that reshape a coding agent's behaviour: brainstorm a spec first, get human sign-off, write an implementation plan, then let subagents execute. Almost every feature of this blog was built with it — `docs/superpowers/specs/` holds a dozen date-named design documents, from wiki-link backlinks to the RNG of the parking lottery tool.

Its treatment of responsibility is Multica's mirror image.

**HARD-GATE: everything starts from "you may not write code".** The brainstorming skill contains an explicit hard gate: before the design is presented and the user approves it, no implementation skill may be called, no code written, no project scaffolded. And it immediately seals the most common escape hatch — **"no project is simple enough to skip the design"** — todo lists included. In funnel language: Multica draws the neck downstream and waits for a human to come and accept (with no lock), while Superpowers **actively marches the human to the neck and won't proceed without a signature**.

**One question at a time is responsibility design, not UX.** The skill requires clarifying questions to be asked one at a time. Ask ten at once and a human skims and says "all fine"; ask one at a time and they have to decide each one. It pushes the judgments you'd otherwise quietly delegate to the AI back into your hands, one by one — **you can't be a passenger**.

**The signature has a physical form.** The design is presented section by section, each approved, then written to `docs/superpowers/specs/date-topic-design.md` **and committed to version control**. [[responsibility-funnel|Part one]] said "the person who signs is you"; Superpowers turns that signature into a file: when something breaks you can dig — which day, which spec, who approved. My strong sense of ownership over those specs comes from exactly this — my name is on the file, and it will live in git history forever.

**After sign-off, judgment is no longer assumed to exist.** The famous line from the writing-plans skill: write the implementation plan for "an enthusiastic but tasteless junior engineer with no judgment, no project context, and a hatred of tests". What that means is that **human judgment is moved entirely to the front and poured into the spec and the plan; the execution end is modelled as a machine with zero judgment**. It's a reconfiguration of the funnel — responsibility shifted left. And the economics work: checking one spec is cheaper than checking the ten PRs that grow downstream of it.

**There's also a collar for the AI itself.** The iron rule of the verification-before-completion skill: "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE" — no freshly-run evidence, no claiming it's done; skipping any step "= lying, not verifying". The contrast is instructive: Multica's mechanism is "notify a human to look", Superpowers' is "train the agent not to claim completion without evidence". One governs process state, the other governs honest claims.

But an honest audit records three marks against Superpowers too: **a neck moved upstream still wears out** — approving section after section, reviewing spec after spec, degrades into "fine, fine, carry on" with enough repetitions; the HARD-GATE stops the AI from charging ahead, it doesn't stop a human from signing carelessly. **Signing isn't signing correctly** — a spec gives you the responsibility of "this is my intent", but the gap between intent and reality only surfaces in production, and a sense of ownership isn't correctness. And in the end **it's a prompt, not a mechanism** — the iron rule lives in skill text, and the real hard guarantee still has to come from CI outside it.

## Side by side: one funnel, two necks

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 330" role="img" aria-label="Two funnels side by side. Left, Multica: AI agent output flows to the board and human acceptance is drawn downstream at in_review, but as a dashed box because it is a convention rather than enforced, with a red shortcut letting an agent set done directly and bypass the notification. Right, Superpowers: the neck is upstream, human spec sign-off is a solid hard gate, after which AI implements with TDD and delivers only after verification." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="160" y="26" fill="#e6e6e6" font-size="13" text-anchor="middle" font-weight="bold">Multica: neck downstream (dashed)</text>
    <rect x="40" y="44" width="240" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="160" y="66" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">AI agent output</text>
    <text x="160" y="84" fill="#9aa4b2" font-size="9" text-anchor="middle">claim issues · write code · comment</text>
    <rect x="70" y="122" width="180" height="48" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="160" y="142" fill="#d6a45c" font-size="11" text-anchor="middle" font-weight="bold">in_review: human check</text>
    <text x="160" y="160" fill="#9aa4b2" font-size="9" text-anchor="middle">a convention — not enforced</text>
    <rect x="100" y="198" width="120" height="42" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="160" y="223" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">done</text>
    <line x1="160" y1="94" x2="160" y2="122" stroke="#9aa4b2" stroke-width="1.3"/>
    <line x1="160" y1="170" x2="160" y2="198" stroke="#9aa4b2" stroke-width="1.3"/>
    <path d="M 280 80 C 330 130 290 200 222 216" fill="none" stroke="#e05a7d" stroke-width="1.6" stroke-dasharray="5 4"/>
    <text x="285" y="222" fill="#e05a7d" font-size="9" text-anchor="middle">agent → done</text>
    <text x="285" y="234" fill="#e05a7d" font-size="9" text-anchor="middle">(no alert fires)</text>
    <text x="160" y="272" fill="#9aa4b2" font-size="10" text-anchor="middle">the auth layer can tell human from machine —</text>
    <text x="160" y="288" fill="#9aa4b2" font-size="10" text-anchor="middle">but the lock is only on the billing API</text>
    <line x1="345" y1="40" x2="345" y2="300" stroke="#3a4154" stroke-width="1"/>
    <text x="495" y="26" fill="#e6e6e6" font-size="13" text-anchor="middle" font-weight="bold">Superpowers: neck upstream (solid)</text>
    <rect x="405" y="44" width="180" height="48" rx="8" fill="#223528" stroke="#54b890" stroke-width="2"/>
    <text x="495" y="64" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">Human: sign the spec</text>
    <text x="495" y="82" fill="#9aa4b2" font-size="9" text-anchor="middle">HARD-GATE: no code before approval</text>
    <rect x="375" y="122" width="240" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="495" y="144" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">AI implements (TDD · subagents)</text>
    <text x="495" y="162" fill="#9aa4b2" font-size="9" text-anchor="middle">plan written for a zero-judgment executor</text>
    <rect x="405" y="198" width="180" height="42" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="495" y="216" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">deliver after verifying</text>
    <text x="495" y="232" fill="#9aa4b2" font-size="9" text-anchor="middle">no evidence, no completion claim</text>
    <line x1="495" y1="92" x2="495" y2="122" stroke="#9aa4b2" stroke-width="1.3"/>
    <line x1="495" y1="172" x2="495" y2="198" stroke="#9aa4b2" stroke-width="1.3"/>
    <text x="495" y="272" fill="#9aa4b2" font-size="10" text-anchor="middle">the signature is a committed specs/*.md —</text>
    <text x="495" y="288" fill="#9aa4b2" font-size="10" text-anchor="middle">physical responsibility; weakness: sign-off fatigue</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The same responsibility funnel: one draws the neck downstream in a dashed line (a convention), the other moves it upstream and draws it solid (a hard gate). A dashed neck stops existing the moment there's pressure.</figcaption>
</figure>

Stack the two audits and the conclusion is clean:

**A sense of responsibility can be designed.** Conservation of responsibility hasn't changed — whichever tool you use, shipping is on you. What the tool changes is the **felt experience**: at what moment, at what granularity, and how unavoidably you feel "I am signing this". Multica's board lets you be an observer (the work flows by itself); Superpowers' process forces you to be the client (every section needs your nod). One conservation law, two completely different human situations.

**The ideal workflow has both necks.** Sign the intent upstream (spec sign-off), verify the output downstream (review plus a shipping gate). Superpowers gives you the upstream template; Multica would be the downstream template if it fitted its existing lock to Done and added an accountable field. Either end alone is incomplete: upstream only, and nobody reconciles the signed intent against reality; downstream only, and the human drowns in acceptance.

**Four questions for picking a tool (or building your own workflow)** — the checklist I took away from this audit:

1. **Who can declare completion?** That state transition to "done" — can a machine push it at all? Convention, or enforced?
2. **Does the signature have a physical form?** Does human approval leave an archaeological record (a file, a commit, an audit log), or is it one click?
3. **Can the notification path be bypassed?** Is there any route by which work becomes "complete" with nobody notified?
4. **When it breaks, can one query answer "who let this ship"?** A tool that can't answer that is manufacturing unaccountable machinery.

## Reflection

### The priority given to money gives away the whole industry's pricing

Multica's most honest moment is fitting `RequireHumanActor` to money only. That isn't an oversight, it's pricing: **things whose loss is quantifiable (money) get hard protection; things whose loss is delayed and hard to attribute (work quality, who's accountable) get a convention.** The whole industry is doing the same arithmetic — but [[ai-incident-clock|an incident's]] cost still lands eventually; the receipt just arrives a few months later, with your name on it. Once the agent-tool world has had a few famous "board all green, production all red" incidents, the doors that are locked only around money today will all get locks tomorrow. I'd rather fit mine now.

### My specs directory, and the question I don't want to look at closely

Writing this, I went back through the dozen sign-off records in my own `docs/superpowers/specs/`. They've given me solid ground — every feature has a document I nodded at. But an honest question: did I read the first spec and the most recent one with the same depth? I can't say yes. A neck moved upstream gives you a signing ritual, and a ritual repeated long enough wears down — that isn't Superpowers failing, it's **the shared fate of every neck**, the same curve as rubber-stamp code review and automation complacency in aviation. My current counter isn't "remind myself to be careful" (useless), it's **keeping each spec small enough to read in one sitting** — sign-off fatigue multiplies with spec length, and shortening it structurally beats willpower. Which is the same sentence this series has now said three times: the defence is process, not intelligence.

### Tools expire, questions don't

This audit is pinned to two commits, because I'm well aware that in six months Multica may have fitted the lock, Superpowers may have been rewritten, and 2026's tool list is archaeology by 2027 — which is exactly why this series has a year in its name. But those four questions don't expire: who can declare completion, does the signature have a form, can the notification be bypassed, and can you find out afterwards. Tools are answers, and answers get replaced; the questions are the asset — **when the next new tool shows up, walk in holding the questions and five minutes will tell you where it put your responsibility**.

Earlier in this series: [[responsibility-funnel|#1 the responsibility funnel]] · [[ai-incident-clock|#2 a clock on the neck]]
