---
title: "The Craft of Acceptance: How to Review AI's Code"
date: 2026-10-08
category: tech
description: "I planted three bugs in a PR an AI wrote, with all 1,294 tests still green. Then I blind-reviewed it myself for twenty minutes while nine AI reviewers each took a pass. The AI verified in a minute or two what I couldn't be bothered to check; what I caught was the thing it only sees reliably when a spec spells it out — and one real bug I missed, it found. The craft of acceptance isn't reading more carefully. It's handing evidence, judgment and guardrails to the right party."
tags:
  - ai
  - code-review
  - leadership
series: "The Craft of Working with AI (2026)"
seriesOrder: 6
translationOf: ai-review-craft
---
## Preface

[[responsibility-funnel|The first post]] said the width of the neck is the bandwidth you have for accepting work responsibly; [[ai-spec-craft|the last one]] said a spec decides when something counts as done. This post takes the next step: **the work is done and in your hands — how do you check it?**

"Reviewing AI's code" sounds like the same job as reviewing a person's code, only with more volume. That's what I thought too. So this post doesn't start with an argument. It starts with an experiment — with me as the subject.

## The experiment: a green PR with three bugs in it

The material came from the last post's experiment: the "Create branch from stash…" feature an AI built for [[gitcrisp|GitCrisp]], a real AI-written PR of a little over 160 lines. I planted three bugs in it at three different levels, with one condition: **every existing test still had to pass** — 1,294 tests, all green, exactly like the PRs you get every day.

- **B1, a logic boundary**: the stash index gets "translated" once, under a confident comment: "`get_stashes()` lists the oldest stash first, while git counts `stash@{0}` from the newest, so translate the sidebar index." That comment is wrong. With a single stash the translation changes nothing, so the tests pass; with two or more, the user clicks the newest one, and the one that gets branched and then dropped is the oldest.
- **B2, a silent regression**: one existing line of wiring changes — "Apply" is now connected to "Pop", so pressing Apply also deletes the stash. The new feature is fine; what broke is the thing next to it that used to work, and the existing tests only check that the signal is emitted, not where it's connected.
- **B3, architecture**: the new flow does `import pygit2` in the presentation layer to validate branch names, going around the port. It works perfectly. It's a "should this be written here" problem.

Then both sides ran at once. **The human arm was me, blind** — not knowing how many bugs there were or where, I read only the PR description first and wrote down my predictions, then timed myself reading the diff. **The AI arm** was clean Claude Code with the same instruction, "review this PR, don't modify files", under three conditions, three runs each: a bare review with nothing, one with GitCrisp's `CLAUDE.md`, and one that also had a review skill (adapted from the review loop in another project of mine, whose core rule is "every finding needs a concrete 'input/state → wrong result' scenario; if you can't write the scenario, it isn't a finding").

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 330" role="img" aria-label="Bug-catching results matrix. Columns: the author reviewing blind for twenty minutes, and three AI reviewer conditions with three runs each — bare review, with CLAUDE.md, and with CLAUDE.md plus a review skill. B1, the reversed stash index: the author pointed out that no test pins the behaviour but did not verify it; all three AI conditions caught it three times out of three, and eight of the nine reports ran a throwaway script to test it. B2, Apply wired to Pop: caught by everyone. B3, pygit2 used directly in the presentation layer: caught by the author, once in three by the bare AI, twice by the AI with CLAUDE.md, and three times by the AI with the review skill. An unplanted real bug — the operation fails halfway after already switching to the new branch, and only reports an error: missed by the author, caught once by the bare AI, once with CLAUDE.md, and three times with the review skill. Bottom rows: the author spent twenty minutes; each AI run took 0.4 to 2.2 minutes and 9 to 19 cents." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="270" y="24" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">Author, blind</text>
    <text x="392" y="24" fill="#9aa4b2" font-size="11" text-anchor="middle">Bare AI</text>
    <text x="484" y="24" fill="#9aa4b2" font-size="11" text-anchor="middle">+CLAUDE.md</text>
    <text x="576" y="24" fill="#9aa4b2" font-size="11" text-anchor="middle">+review skill</text>
    <text x="16" y="62" fill="#e6e6e6" font-size="11" text-anchor="start">B1 reversed index</text>
    <text x="16" y="78" fill="#9aa4b2" font-size="9.5" text-anchor="start">logic boundary</text>
    <rect x="200" y="44" width="140" height="44" rx="6" fill="#2e2a1a" stroke="#d6a45c"/>
    <text x="270" y="63" fill="#d6a45c" font-size="11" text-anchor="middle">△ "no test pins it"</text>
    <text x="270" y="78" fill="#d6a45c" font-size="9.5" text-anchor="middle">not verified</text>
    <rect x="352" y="44" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="392" y="71" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <rect x="444" y="44" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="484" y="71" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <rect x="536" y="44" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="576" y="71" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <text x="16" y="114" fill="#e6e6e6" font-size="11" text-anchor="start">B2 Apply → Pop</text>
    <text x="16" y="130" fill="#9aa4b2" font-size="9.5" text-anchor="start">silent regression</text>
    <rect x="200" y="96" width="140" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="270" y="123" fill="#e6e6e6" font-size="12" text-anchor="middle">✓</text>
    <rect x="352" y="96" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="392" y="123" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <rect x="444" y="96" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="484" y="123" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <rect x="536" y="96" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="576" y="123" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <text x="16" y="166" fill="#e6e6e6" font-size="11" text-anchor="start">B3 layer bypass</text>
    <text x="16" y="182" fill="#9aa4b2" font-size="9.5" text-anchor="start">architecture call</text>
    <rect x="200" y="148" width="140" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="270" y="175" fill="#e6e6e6" font-size="12" text-anchor="middle">✓</text>
    <rect x="352" y="148" width="80" height="44" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="392" y="175" fill="#e6e6e6" font-size="12" text-anchor="middle">1/3</text>
    <rect x="444" y="148" width="80" height="44" rx="6" fill="#2e2a1a" stroke="#d6a45c"/>
    <text x="484" y="175" fill="#e6e6e6" font-size="12" text-anchor="middle">2/3</text>
    <rect x="536" y="148" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="576" y="175" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <text x="16" y="218" fill="#e6e6e6" font-size="11" text-anchor="start">Unplanted real bug</text>
    <text x="16" y="234" fill="#9aa4b2" font-size="9.5" text-anchor="start">half-done, says "error"</text>
    <rect x="200" y="200" width="140" height="44" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="270" y="227" fill="#e6e6e6" font-size="12" text-anchor="middle">✗</text>
    <rect x="352" y="200" width="80" height="44" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="392" y="227" fill="#e6e6e6" font-size="12" text-anchor="middle">1/3</text>
    <rect x="444" y="200" width="80" height="44" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="484" y="227" fill="#e6e6e6" font-size="12" text-anchor="middle">1/3</text>
    <rect x="536" y="200" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="576" y="227" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <line x1="16" y1="258" x2="624" y2="258" stroke="#3a4154" stroke-dasharray="4 3"/>
    <text x="16" y="282" fill="#9aa4b2" font-size="11" text-anchor="start">Cost</text>
    <text x="270" y="282" fill="#e6e6e6" font-size="11" text-anchor="middle">20 minutes</text>
    <text x="484" y="282" fill="#e6e6e6" font-size="11" text-anchor="middle">0.4–2.2 min, $0.09–0.19 per run</text>
    <text x="16" y="306" fill="#9aa4b2" font-size="11" text-anchor="start">How B1 was checked</text>
    <text x="270" y="306" fill="#e6e6e6" font-size="11" text-anchor="middle">Read the diff</text>
    <text x="484" y="306" fill="#e6e6e6" font-size="11" text-anchor="middle">8 of 9 tested pygit2 with a script</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">One green PR, three planted bugs, one that wasn't planted. Most of what the human and the AI caught overlaps — the cells that don't are what this post is about.</figcaption>
</figure>

The honest part first: each condition ran three times, and there was exactly one human subject (me). This isn't a statistic; it's one controlled observation. Also, my first setup for the bare-review arm had a hole — `CLAUDE.md` had been deleted but was still in the git history, and two of the reviews read it. The numbers in the diagram are from a rerun with `CLAUDE.md` removed from the history too.

### What I caught, and how

In twenty minutes I touched all three, but in different ways.

B2 I read off the page. The diff is almost all additions, and that one line is a *change* — `connect(self._on_stash_apply)` became `connect(self._on_stash_pop)`. A PR that adds a feature has no reason to touch Apply's wiring, and a spot where "in theory nothing should have changed" is where the eye stops.

B3 I predicted. Before reading the diff, I wrote down: **"Finishing the implementation and keeping the architecture consistent are two different things"** — AI is very good at getting a feature working, but the path it takes to get there doesn't necessarily stay on the Clean Architecture grid. So when `import pygit2` showed up in the presentation layer, I knew that was what I'd been looking for.

B1 is the interesting one, because I did **not** catch it being wrong. My second prediction was "I'm not sure how a library like pygit2 behaves, so I'll need some proof." When I reached the comment saying the oldest stash comes first, I couldn't find evidence that it was right, or that it was wrong — and honestly, as the reviewer, I didn't want to go digging for it. So my review comment was: **"The comment says the oldest comes first, but no test case pins that behaviour down."**

### What the AI caught, and how

B1 and B2: nine reports, nine hits. And the AI caught B1 in a completely different way: **eight of the nine wrote a throwaway script on the spot** — create a scratch repo, stash twice, print the order pygit2 returns — and then pointed at the output: "this comment is wrong, I tested it." The step I didn't want to take, it took in a minute or two, for ten or twenty cents.

B3 was a different story. The bare review mentioned it once in three runs, the one with `CLAUDE.md` twice, and only with the review skill — which says outright that "presentation must not reach past the ports into infrastructure" — did it land three times out of three, with two of those marking it blocking. **On a judgment call, the AI only sees it reliably when a spec spells it out.**

Then there's the cell I lost. The original AI-written PR already had a bug I hadn't planted. When the stash includes untracked files and the working tree happens to contain a file with the same name, `git stash branch` has already created the new branch and switched to it before failing to restore the stash — and the UI shows a single ERROR line, with no hint that the user is now standing on a different branch. I reproduced it with a script afterwards; it's real. I didn't see it. All three runs with the review skill did.

The other side needs saying too: **on top of all that, every AI report attached three to seven non-blocking comments** — some useful (a branch name starting with `-` gets read by git as an option), some speculative ("`index.read()` may not refresh HEAD"), and one that got the mechanism wrong (it said a dirty working tree would leave things half-done; when I tested it, it failed cleanly). Every one of those has to be weighed by someone.

## The division of acceptance: evidence, judgment, guardrails

Laying that matrix out changed the shape of what I think "reviewing AI's code" means. It isn't "read more carefully". It's **routing each doubt to the right way of settling it**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 300" role="img" aria-label="The division of acceptance. On the left, a doubt in the PR, and one question: does settling it take evidence, or judgment? Three paths. First, evidence is cheap — library behaviour, index mapping, edge values — so hand it to a machine: a throwaway script or an AI reviewer tests it in minutes for cents. Second, it needs judgment — whether the architecture is right, whether the scope is right, whether a change belongs — so keep it with a person; this is where the neck should spend its effort, and to get a machine's help the judgment has to be written down as a spec first. Third, there is no evidence, or it isn't yours to produce — the behaviour isn't pinned by a test — so send it back and demand a guardrail: a test that fails when the code is wrong. All three paths end at the sign-off." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <rect x="16" y="110" width="128" height="74" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="80" y="136" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">A doubt in the PR</text>
    <text x="80" y="156" fill="#9aa4b2" font-size="10" text-anchor="middle">Settling it takes</text>
    <text x="80" y="171" fill="#9aa4b2" font-size="10" text-anchor="middle">evidence or judgment?</text>
    <line x1="144" y1="135" x2="196" y2="58" stroke="#9aa4b2" stroke-width="1.3"/>
    <line x1="144" y1="147" x2="196" y2="147" stroke="#9aa4b2" stroke-width="1.3"/>
    <line x1="144" y1="159" x2="196" y2="236" stroke="#9aa4b2" stroke-width="1.3"/>
    <rect x="200" y="22" width="300" height="72" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="214" y="44" fill="#54b890" font-size="12" text-anchor="start" font-weight="bold">Cheap evidence → hand it to a machine</text>
    <text x="214" y="64" fill="#e6e6e6" font-size="10" text-anchor="start">Library behaviour, index mapping, edge values</text>
    <text x="214" y="81" fill="#9aa4b2" font-size="10" text-anchor="start">Throwaway script or AI reviewer — minutes, cents</text>
    <rect x="200" y="111" width="300" height="72" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="214" y="133" fill="#4f6df5" font-size="12" text-anchor="start" font-weight="bold">Needs judgment → keep it human</text>
    <text x="214" y="153" fill="#e6e6e6" font-size="10" text-anchor="start">Architecture, scope, whether a change belongs</text>
    <text x="214" y="170" fill="#9aa4b2" font-size="10" text-anchor="start">Where the neck belongs; to delegate, write a spec</text>
    <rect x="200" y="200" width="300" height="72" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="214" y="222" fill="#d6a45c" font-size="12" text-anchor="start" font-weight="bold">No evidence → demand a guardrail</text>
    <text x="214" y="242" fill="#e6e6e6" font-size="10" text-anchor="start">Behaviour not pinned by any test</text>
    <text x="214" y="259" fill="#9aa4b2" font-size="10" text-anchor="start">Send it back: add a test that fails when wrong</text>
    <line x1="500" y1="58" x2="556" y2="135" stroke="#9aa4b2" stroke-width="1.3"/>
    <line x1="500" y1="147" x2="556" y2="147" stroke="#9aa4b2" stroke-width="1.3"/>
    <line x1="500" y1="236" x2="556" y2="159" stroke="#9aa4b2" stroke-width="1.3"/>
    <rect x="560" y="120" width="68" height="54" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="594" y="151" fill="#54b890" font-size="12" text-anchor="middle" font-weight="bold">Sign-off</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The division of acceptance. Doubts don't sort by difficulty; they sort by what it costs to settle them — cheap evidence goes to a machine, judgment stays with a person, and where there's no evidence you demand a guardrail.</figcaption>
</figure>

**Cheap evidence goes to a machine.** The order pygit2 returns stashes in is a fact with a right answer, and the answer sits in the output of a ten-line script. Doubts like that used to depend on the reviewer's experience or willingness — someone with experience remembers, someone willing goes and checks, and with neither it slips through. Now the price is a minute or two and ten or twenty cents. I didn't take that step, not because I couldn't, but because a person's willingness is a scarce resource — **and a scarce resource shouldn't be spent on something ten or twenty cents can buy.**

**Judgment stays with a person.** B3 has no right answer you can test for — `import pygit2` works and the tests pass; the question is whether this project should be written that way. That's exactly where the [[responsibility-funnel|funnel's]] neck should be spending its effort. And the experiment's other conclusion is that judgment can be partly delegated too — but only **once it's been written down as a spec**. One run in three for the bare review; three in three once it was in the review skill. That's [[ai-spec-craft|the last post's]] "spec as code" — only this time, the one running it was the reviewer.

**Where there's no evidence, demand a guardrail.** Look again at my comment on B1: "no test case pins that behaviour down." It didn't identify the bug, but it pointed straight at the right fix — add a test with two stashes, and that test goes red the moment it runs. It's an underrated move for a reviewer: **the burden of proof is on the author, not on the reviewer.** I don't have to prove it wrong myself. I only have to refuse to sign where there's no evidence.

## Reflection

### A green build is a claim, not evidence

The most cunning thing about this PR is that all 1,294 tests are green — and the new tests aren't bad: a real-repo test in infrastructure, flow tests in presentation, an e2e journey. It's just that **every one of them uses a single stash**, which is precisely the point where the wrong translation and the right one give the same answer.

This is the physical form of what [[responsibility-funnel|the first post]] meant by "when a guardrail breaks, it breaks silently". That's why, when I review an AI's PR, I lean harder on the tests than on the feature, and the question isn't "are there tests?" but **"if this code were wrong, would this test go red?"** A test that can't tell wrong from right isn't a guardrail; it's decoration. Of the nine AI reports, all three with the review skill listed "single stash only" as its own test gap, two of them as blocking — because the skill has a line asking: "Would the tests fail if the code were wrong? Check what each test actually asserts."

### Saying "I can't sign this part" is part of the neck's width

The first post said **neck width = acceptance speed × calibration**: real neck width includes knowing where you don't understand, and for those parts slowing down, adding a guardrail, or saying plainly "I can't sign this part yet." When I wrote that, it was an argument. This time it was the real thing — that's exactly what I did with B1. I wasn't sure how pygit2 behaves, so I didn't pretend to be. I asked for a test.

The scary version is the reverse: if I'd read "the oldest comes first", thought "yeah, sounds reasonable", and let it through, that would have been the authority illusion from [[ai-incident-clock|the incident post]] — the AI's comment looks the most like an answer. That comment was confident, professional in tone, came with a reason — and was wrong. **A comment an AI wrote isn't documentation; it's a claim waiting to be verified.**

### An AI reviewer isn't a second pair of eyes; it's an evidence machine

Before the experiment, I thought an AI reviewer's value was "one more pair of eyes". Afterwards I think that metaphor is wrong. Most of what it caught overlapped with what I caught, so it isn't a *different* pair of eyes. What's genuinely different is that it's **willing to pay the cost of verification for every small doubt** — spin up a scratch repo, run a script, reproduce a failure. That's also how the unplanted real bug got found.

But it's also a machine that produces noise: three to seven non-blocking comments per report, some speculative, one with the mechanism wrong. Taking its output straight as the verdict just swaps the neck for another kind of rubber stamp — I'd only have moved from stamping AI-written code to stamping AI-written reviews. So the way I'll use it is: **let it run first, treat its findings as leads to verify, and spend my own time on two things only — what it marks as blocking, and what it can't judge at all.**

If this post leaves one sentence behind, it's this: the hard part of reviewing AI's code isn't understanding every line, it's knowing who should settle each doubt, and at what cost. **Evidence goes to the machine, judgment stays with you, and where there's no evidence, you don't sign.**

Earlier in this series: [[responsibility-funnel|#1 the responsibility funnel]] · [[ai-incident-clock|#2 a clock on the neck]] · [[ai-responsibility-design|#3 the neck on the board]] · [[ai-responsibility-premium|#4 the responsibility premium]] · [[ai-spec-craft|#5 spec as code]]
