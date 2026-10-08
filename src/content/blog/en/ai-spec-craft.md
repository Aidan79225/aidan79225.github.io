---
title: "Spec as Code: CLAUDE.md Is the New Onboarding Doc"
date: 2026-10-07
category: tech
description: "Same task, run twice by an AI: once with a CLAUDE.md, once without. The code came out almost identical — the difference was the branch, the publish gate, the acceptance check, and whether it would write \"in my experience\" on your behalf. Then three repos' git history: every rule is a scar, and a spec, like code, has bugs, goes stale, and grows dead branches."
tags:
  - ai
  - leadership
  - side-project
series: "The Craft of Working with AI (2026)"
seriesOrder: 5
translationOf: ai-spec-craft
---
## Preface

The first four posts laid down axioms: [[responsibility-funnel|conservation of responsibility]], [[ai-incident-clock|a clock on the neck]], [[ai-responsibility-design|how tools design responsibility]], [[ai-responsibility-premium|the premium AI doesn't collect]]. From here on it's derivation — and if responsibility converges one hundred percent on you, the first craft that follows is: **your requirements have to be written down, and written clearly.**

That sounds like common sense, but it has a less obvious consequence: `CLAUDE.md` isn't an instruction manual for the AI. It's **your responsibility in written form**. A requirement you never wrote down is one nobody can prove you asked for when something goes wrong; a requirement you wrote down wrong, the AI will carry out to the letter.

This post takes it apart with two kinds of evidence: an A/B experiment (same task, with a spec vs. without), and an archaeology of the specs in three repos — this blog, [[gitcrisp|GitCrisp]], and a private Godot game project.

## The experiment: same task, with a spec vs. without

The setup: copy a repo into two clean working copies, leave one untouched, strip every spec file out of the other (`CLAUDE.md`, `.claude/skills/`, the glossary and the style guide), then give headless Claude Code **the exact same instruction, word for word**, in each. Two tasks:

- **Blog**: "Write a new post explaining API Idempotency Keys… commit it when you're done."
- **GitCrisp**: "Add 'Create branch from stash…' to the sidebar's stash context menu, doing what `git stash branch` does. Commit when it's done."

Four runs, two to three minutes and 30 to 50 cents each. To be clear up front: **each arm ran once**. This is an observation, not a statistic. But it came out pointing somewhere other than where you'd expect, which is why it's worth writing up.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 400" role="img" aria-label="A/B experiment results. A band spanning both columns at the top: the code layer came out nearly the same — in GitCrisp both runs changed the same six source files along the same layers, because the codebase itself is an implicit spec. Below, five rows of responsibility-layer differences, without a spec on the left and with a spec on the right: shipping path, committing straight to master versus opening a branch for a PR; publish gate, draft false and shipped as written versus draft true and waiting for the author; first-hand experience, writing 'in my experience' on the author's behalf versus refusing and flagging it for the author; acceptance, unit tests only versus actually launching the app end to end; splitting, one commit versus two commits split by architecture layer. Conclusion: a spec changes where responsibility lands, not what the code looks like." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="252" y="24" fill="#e05a7d" font-size="12" text-anchor="middle" font-weight="bold">No spec</text>
    <text x="508" y="24" fill="#54b890" font-size="12" text-anchor="middle" font-weight="bold">With spec</text>
    <rect x="130" y="38" width="500" height="54" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="380" y="61" fill="#e6e6e6" font-size="12" text-anchor="middle">Same six source files, same layers, nearly the same line count</text>
    <text x="380" y="80" fill="#9aa4b2" font-size="10" text-anchor="middle">The existing codebase is an implicit spec — both runs grew along it</text>
    <text x="118" y="70" fill="#9aa4b2" font-size="11" text-anchor="end">Code</text>
    <line x1="20" y1="106" x2="630" y2="106" stroke="#3a4154" stroke-dasharray="4 3"/>
    <text x="20" y="124" fill="#d6a45c" font-size="10" text-anchor="start">Responsibility layer: every difference is here</text>
    <text x="118" y="157" fill="#9aa4b2" font-size="11" text-anchor="end">Shipping path</text>
    <rect x="130" y="136" width="245" height="36" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="252" y="158" fill="#e6e6e6" font-size="11" text-anchor="middle">Commits straight to master</text>
    <rect x="385" y="136" width="245" height="36" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="508" y="158" fill="#e6e6e6" font-size="11" text-anchor="middle">Opens a branch, waits for a PR</text>
    <text x="118" y="201" fill="#9aa4b2" font-size="11" text-anchor="end">Publish gate</text>
    <rect x="130" y="180" width="245" height="36" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="252" y="202" fill="#e6e6e6" font-size="11" text-anchor="middle">draft: false — ships as written</text>
    <rect x="385" y="180" width="245" height="36" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="508" y="202" fill="#e6e6e6" font-size="11" text-anchor="middle">draft: true — waits for the author</text>
    <text x="118" y="245" fill="#9aa4b2" font-size="11" text-anchor="end">Experience</text>
    <rect x="130" y="224" width="245" height="36" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="252" y="246" fill="#e6e6e6" font-size="11" text-anchor="middle">Writes "in my experience…"</text>
    <rect x="385" y="224" width="245" height="36" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="508" y="246" fill="#e6e6e6" font-size="11" text-anchor="middle">Refuses; flags it for the author</text>
    <text x="118" y="289" fill="#9aa4b2" font-size="11" text-anchor="end">Acceptance</text>
    <rect x="130" y="268" width="245" height="36" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="252" y="290" fill="#e6e6e6" font-size="11" text-anchor="middle">Unit tests; app never launched</text>
    <rect x="385" y="268" width="245" height="36" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="508" y="290" fill="#e6e6e6" font-size="11" text-anchor="middle">Actually launches the app (e2e)</text>
    <text x="118" y="333" fill="#9aa4b2" font-size="11" text-anchor="end">Splitting</text>
    <rect x="130" y="312" width="245" height="36" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="252" y="334" fill="#e6e6e6" font-size="11" text-anchor="middle">One commit</text>
    <rect x="385" y="312" width="245" height="36" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="508" y="334" fill="#e6e6e6" font-size="11" text-anchor="middle">Two commits, split by layer</text>
    <text x="380" y="380" fill="#d6a45c" font-size="12" text-anchor="middle" font-weight="bold">A spec changes where responsibility lands, not what the code looks like</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Two tasks, four runs. The code band nearly overlaps between the arms; everything that diverges is "when does it count as done, and who signs".</figcaption>
</figure>

### Finding one: the codebase is itself a spec

You'd expect the no-spec arm to sprawl — layer violations, naming drift. None of it happened. On the GitCrisp task, both arms changed **the same six source files**: port, command, infrastructure, bus, flow, sidebar — not one layer more, not one less. The reason is simple: in a codebase already split along Clean Architecture lines, every existing feature is a worked example, and the AI learns the pattern from reading a few files.

The blog task made it even clearer. The no-spec arm said so itself: "The writing skill the README mentions doesn't exist, so I followed the format of existing posts (`redis-cache-patterns`, `medallion-architecture`)." — with no spec to find, it treated all of `src/content/blog/` as the spec. And it wrote a decent post: three diagrams, twice the length of the other arm's, and it reported simulating the retry flow in SQLite first. **On article quality alone, the no-spec arm didn't lose.**

That's the first instinct to correct: **a spec isn't there to teach the AI how to write code.** It picks up coding taste from your codebase; if your codebase is a mess, no `CLAUDE.md`, however well written, will outvote four hundred counterexamples.

### Finding two: a spec decides when something counts as done

So where was the difference? All in the lower half of the diagram — not one item is about what the code looks like, and every one of them is about **responsibility**:

- **Shipping path**: the spec arm opened a branch and signed off with "Per `CLAUDE.md`, changes go into `master` through a PR, so I didn't touch `master` directly." The no-spec arm committed straight onto master.
- **Publish gate**: the no-spec post had `draft: false` — in a real repo, it would have gone live the moment it hit master, carrying a Stripe retention period the AI itself admitted it "wrote from memory". The spec arm set `draft: true`, because "the author hasn't confirmed the SVG yet" — the skill says a post isn't final until the author has seen a screenshot of every diagram.
- **First-hand experience**: this is the one that bothers me most. The no-spec post's reflection says "**In my experience**, don't save this cost by making the client guess" — an experience that never happened, published under my name. The spec arm said: "I didn't make up any personal experience for you in the reflection… what would land hardest here is a real duplicate charge or duplicate order you've hit in Production — I'd suggest adding that yourself." The skill says "the reflection needs real cases", and the AI read the other side of that sentence: **only the author can supply real cases.**
- **Acceptance**: GitCrisp's `CLAUDE.md` has a passage saying a PR "is not done when CI is green… Launch it and exercise the area you touched before opening the PR." So the spec arm added an e2e journey that drives the real `MainWindow` against a real repo; the no-spec arm said, honestly, "I didn't launch the app and click through the menu." The same six source files — and three times the lines of tests.
- **Splitting**: the same `CLAUDE.md` asks for changes split along the architecture layers. The spec arm estimated the diff (about 150 lines, under the 400-line threshold, so no separate PRs) but still split the data layer and the presentation layer into two commits; the no-spec arm wrapped up in one.

So a spec's value isn't in the code band — it's in the five rows outside it. It doesn't say "how to do it"; it says **"how far you go before you hand it over, who you hand it to, and who signs"** — in other words, where the [[responsibility-funnel|funnel's]] neck sits.

## Archaeology: every rule is a scar

The experiment answered "what does a spec change". The other question is: **how do specs grow?** I had an AI go through `git log` for the spec files in all three repos and trace each rule back to the commit it was born in:

| Rule | Where it was born |
|---|---|
| "Concept posts are **expected** to have a diagram, not optionally" (this blog's skill) | The old wording said "don't force one" — and four concept posts had no diagram. The day the wording changed, four diagrams went in |
| "Don't replace blindly: 數據, 依賴…" (this blog's style guide, §2) | The rule mechanically replaced words the author uses on purpose; reverted the same day, with a new section for the exceptions |
| One site-wide glossary | Backfilling each series' glossary turned up *transaction* written as 交易 in 113 places and as 事務 in 21 — all 21 in a single series |
| Count Chinese characters in Python, not with `wc -m` | Without a locale set, `wc -m` counts bytes: a post with 717 characters was reported as 2,824 |
| Every SVG gets screenshotted for the author | A visual pass over 17 diagrams found three labels sitting on top of lines — live for weeks, invisible in the markdown source |
| Over ~400 lines, propose a split along the layers (GitCrisp) | The file-history feature landed as one PR: 21 files, 761 lines, its seams invisible in the combined diff |
| Every merge leaves master releasable (GitCrisp) | CI only tests domain + application; it wouldn't notice an app that fails to launch |
| Never `./test.sh \| tail && git commit` (game project) | The pipe swallows the failing exit code — a red run can be committed as green |
| No double-quoted Chinese in code comments (game project) | The translation extractor picks up comments as strings to translate |

Look down that table and **not one of these rules was thought up in advance**. Almost every one maps to a slip, a catch, and a "never again". The game project is the extreme case: it had two skills from day one (a development loop and a review loop), but no `CLAUDE.md` for its first 270-odd commits — the layering, the commands and the definition of done were written down in one go, after they'd been used over and over and had settled. It's been edited eight times since, mostly as new features brought new rules — the "Chinese in comments" row above is one of them.

And the scars work. GitCrisp's PR-size rule went into `CLAUDE.md` on August 26. Here's the size of PRs merged into master before and after:

| | Before the rule (74 PRs) | After (56 PRs) |
|---|---|---|
| Largest PR | 5,921 lines | 797 lines |
| 90th percentile | 1,884 lines | 505 lines |
| Share over 400 lines | 36% | 20% |

The features in the two periods weren't the same, so this isn't a controlled comparison. But going through the 20% of post-rule PRs over 400 lines one by one: most are 40–60% tests, and one is a README rewrite. What the rule protects is "how much production code a reviewer has to read at once", not a magic number.

## Spec as code: it has bugs, goes stale, and grows dead branches

Lay that archaeology out and the life cycle of a spec file turns out to be exactly the life cycle of code:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 320" role="img" aria-label="The life cycle of a spec, four boxes in a loop. Top left: an incident, where a rule starts. Top right: write the rule, with its reason, its exceptions and a check. Bottom right: the AI runs it literally, every session, every time. Bottom left: the rule fails, in one of four ways — over-execution, going stale, dead rules, or a bug in the rule itself. A failure is the next incident, back to the start. In the middle: spec as code — review it, refactor it, delete it." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <rect x="40" y="30" width="200" height="60" rx="8" fill="#262b3a" stroke="#e05a7d" stroke-width="1.5"/>
    <text x="140" y="56" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">Incident</text>
    <text x="140" y="76" fill="#9aa4b2" font-size="10" text-anchor="middle">where a rule starts</text>
    <rect x="400" y="30" width="200" height="60" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="500" y="56" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">Write the rule</text>
    <text x="500" y="76" fill="#9aa4b2" font-size="10" text-anchor="middle">with reason, exceptions, a check</text>
    <rect x="400" y="200" width="200" height="60" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="500" y="226" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">AI runs it literally</text>
    <text x="500" y="246" fill="#9aa4b2" font-size="10" text-anchor="middle">every session, every time</text>
    <rect x="40" y="180" width="200" height="110" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="140" y="204" fill="#d6a45c" font-size="12" text-anchor="middle" font-weight="bold">The rule fails</text>
    <text x="60" y="226" fill="#e6e6e6" font-size="10" text-anchor="start">Over-executed: no exceptions</text>
    <text x="60" y="244" fill="#e6e6e6" font-size="10" text-anchor="start">Stale: mixin count, languages</text>
    <text x="60" y="262" fill="#e6e6e6" font-size="10" text-anchor="start">Dead: 2/3 tool boilerplate</text>
    <text x="60" y="280" fill="#e6e6e6" font-size="10" text-anchor="start">Buggy: wc -m counts bytes</text>
    <line x1="240" y1="60" x2="392" y2="60" stroke="#9aa4b2" stroke-width="1.5"/>
    <polygon points="398,60 388,55 388,65" fill="#9aa4b2"/>
    <line x1="500" y1="90" x2="500" y2="192" stroke="#9aa4b2" stroke-width="1.5"/>
    <polygon points="500,198 495,188 505,188" fill="#9aa4b2"/>
    <line x1="400" y1="230" x2="248" y2="230" stroke="#9aa4b2" stroke-width="1.5"/>
    <polygon points="242,230 252,225 252,235" fill="#9aa4b2"/>
    <line x1="140" y1="180" x2="140" y2="98" stroke="#9aa4b2" stroke-width="1.5"/>
    <polygon points="140,92 135,102 145,102" fill="#9aa4b2"/>
    <text x="150" y="140" fill="#9aa4b2" font-size="10" text-anchor="start">next scar</text>
    <text x="320" y="132" fill="#d6a45c" font-size="12" text-anchor="middle" font-weight="bold">Spec as code</text>
    <text x="320" y="152" fill="#9aa4b2" font-size="10" text-anchor="middle">review it, refactor it, delete it</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The life cycle of a spec. The only difference is who runs it: code is run by a machine, a spec by an AI — and both take it literally.</figcaption>
</figure>

Four failure modes, four real cases:

**Over-execution — a rule with no exceptions gets carried out to the end.** The style guide started as a straight mapping from mainland-Chinese terms to Taiwanese ones, and 數據 (data) and 依賴 (depend) were on the list. The AI dutifully applied it and replaced both words in [[lottery|the lottery post]], where I'd written them that way on purpose. A human editor reading that rule fills in "depending on context" automatically. The AI doesn't. The fix wasn't to delete the rule but to **write the exceptions in**: the glossary now has a whole section called "context-dependent — don't replace blindly".

**Going stale — the world the spec describes changed, and the spec didn't.** GitCrisp's `CLAUDE.md` said "`Pygit2Repository` is a composite of ten focused mixin modules" long after there were thirteen; it was only noticed while tidying up the README. The day the game project added Simplified Chinese, its `CLAUDE.md` still said "two languages" — that one was caught by the same day's review. A stale spec is more dangerous than no spec: the AI believes it, then goes looking for where the eleventh mixin should go.

**Dead rules — the section nobody dares delete.** GitCrisp's `CLAUDE.md` is 211 lines long, and 138 of them are usage notes a token-compression tool inserted automatically, listing `cargo build`, `jest`, `next build` — in a Python project. In the experiment, the spec arm read it, found the tool wasn't installed, and moved on. No harm this time, but it eats context in every session and dilutes the 73 lines that actually matter.

**A bug in the rule itself — the check commands in a spec are code too.** The skill for my daily posts in the iThome Ironman contest (thirty days, one post a day) checked the "at least 300 characters" rule with `wc -m`, which, without a locale set, counts bytes — three per Chinese character. Reported counts were inflated nearly threefold, and the 300-character floor meant nothing: a draft with only 100 Chinese characters would have passed. That isn't the AI's fault. The command I put into the spec had a bug.

So "spec as code" isn't a metaphor: it gets executed, it has inputs and outputs, and it breaks. The only difference is that the compiler is now an AI — and this compiler never prints a warning. It just quietly does what it's told.

## The onboarding doc: written for the AI, and for people

Look back at the archaeology table and one more thing stands out: nearly every rule comes with a **reason**. GitCrisp's PR rule doesn't stop at "split anything over 400 lines"; it says why the order is data → display → wiring: "data lands invisible, display lands unreachable, wiring is what makes the feature reachable — so wiring lands last and in one piece." And the game project's review skill has a line I love: **"Every finding needs a concrete 'input/state → wrong result' scenario. If you can't write the scenario, it isn't a finding."**

Take the AI out of those sentences and they're an onboarding doc for a new hire, unchanged. That's no coincidence: **a spec an AI can execute correctly and a spec a new hire can ramp up on are the same thing** — concrete, with reasons, with the exceptions written out. The only difference is that the AI is a new hire on their first day, every session, and never asks a senior colleague over lunch why a rule exists.

The converse holds too: someone who can't write a clear requirement will fail at leading an AI and at leading people. It's just that people fill in the gaps for you — a new hire asks, guesses, raises a question at standup, and your vagueness gets absorbed by a colleague's judgment. The AI absorbs nothing. It amplifies your vagueness into output, unchanged, and hands it back for you to sign.

## Reflection

### A spec is responsibility in written form

What bothered me most in the experiment wasn't how many lines of e2e tests got added; it was that "in my experience". The no-spec AI did nothing technically wrong. It just completed the shape of what a post is supposed to look like — and a good technical post is supposed to have the author's experience in it, so it wrote some. From where it stood, that was being diligent.

But that experience would carry my name. This is what [[responsibility-funnel|conservation of responsibility]] looks like at the level of the spec: **whatever requirement you don't write down, the AI fills in with something "reasonable on average" — and reasonable on average isn't necessarily something you'd sign.** That one line, "the reflection needs real cases", didn't protect the quality of the post in the experiment. It protected my signature.

So I look at `CLAUDE.md` differently now. It isn't a prompting trick; it's my sign-off conditions, written in advance. What has to be done before it's handed over, what only I can supply, which path has to go through me — what's written there is exactly what [[ai-responsibility-design|the neck on the board]] called "moving the neck upstream, and locking it".

### Scars first, rules second

If I had to give one piece of advice on writing specs, it would be: **don't start by writing the perfect `CLAUDE.md`.** The game project above only got one after 270-odd commits, and this blog's `CLAUDE.md` is still seven lines today (git workflow only; everything else lives in skills). A spec written from imagination has two problems. One, you don't know where the AI will go wrong, so most of what you write is things it would have done right anyway — the experiment showed it picks up architecture and style from the codebase. Two, a rule without a scar has no reason, and a rule without a reason gets over-executed.

What I do instead is let the spec grow with the scars. Every time I catch a slip, I ask: "Is this a one-off mistake, or one that'll happen again?" If it's the second kind, it goes in — **along with the story of the slip, in the commit message**. Six months later, `git log -- CLAUDE.md` reads as the project's incident history.

### How I review a rule

If a spec is code, it should be reviewed like code. These days I ask four questions of every new rule, one for each failure mode:

1. **Are the exceptions written down?** — If not, the AI will carry it out to the end.
2. **When will the facts it states change?** — Numbers, lists and file paths are hard-coded values that go stale; point at the source instead of copying it.
3. **Who wrote this section?** — Anything a tool inserted automatically gets reviewed like vendored code before it stays.
4. **Have the commands in it actually been run?** — Any shell command that goes into a spec gets run once in a clean environment first.

Those four questions are just code review basics. A lot of the craft of working with AI isn't a new craft — it's an old one moved somewhere new. Only this time, **the document you write is your program, and whatever runs it will always take it literally.**

Earlier in this series: [[responsibility-funnel|#1 the responsibility funnel]] · [[ai-incident-clock|#2 a clock on the neck]] · [[ai-responsibility-design|#3 the neck on the board]] · [[ai-responsibility-premium|#4 the responsibility premium]]
