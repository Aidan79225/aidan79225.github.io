---
title: "Guardrail Engineering: The New Role of Tests and Specs on an AI Production Line"
date: 2026-10-08
category: tech
description: "In five months GitCrisp's CI ran 231 times and went red 15 times, and not one failure reached master; one of them stopped a silent bug that would have made a repo in the middle of a merge conflict look perfectly fine. But break the same 1,294 tests' code on purpose in 49 places, and only about six in ten of those errors turn anything red — and the ones that slip through cluster at the seams between layers. A guardrail's value isn't whether it exists. It's whether it goes red when the code is wrong."
tags:
  - ai
  - testing
  - side-project
series: "The Craft of Working with AI (2026)"
seriesOrder: 7
translationOf: ai-guardrails
---
## Preface

[[responsibility-funnel|The first post]] defined guardrails as "tools for widening the neck" — hand the checks a person would otherwise eyeball every time to a machine, and keep human acceptance bandwidth for what machines can't verify. [[ai-review-craft|The last post]] saw the flip side of that in a green PR: all 1,294 tests passed, but every one of them used a single stash, exactly the point where the wrong answer and the right one coincide. **A test that can't tell wrong from right isn't a guardrail; it's decoration.**

So this post doesn't argue about whether to write tests — when AI writes your tests for you, the cost side of that question has already changed. It asks two questions you can measure, using [[gitcrisp|GitCrisp]] as the sample:

1. **What has it stopped?** — five months of CI red runs.
2. **What would it miss?** — break the code on purpose and see whether the tests go red.

I had an AI dig up and run both ledgers: one reads the GitHub Actions run history, the other is a mutation-testing run.

## Ledger one: what five months of CI stopped

GitCrisp's CI started on May 17 and had run 231 times by October 5: every PR gets a full pytest run on each of Linux, Windows and macOS, plus ruff and mypy (mypy only checks the domain and application layers).

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 300" role="img" aria-label="Five months of GitCrisp's CI red runs. Of 231 runs, 194 were green, 22 were cancelled by a newer run, and 15 were red. Causes of the 15 red runs: tests 8, lint 4, infrastructure 3 (a rate-limited download, an apt hash mismatch, a failed checkout), mypy 0. Of the 8 test failures: a silent bug where pygit2 1.20 made the repo state quietly read CLEAN, stopped 3 times; bugs confined to one operating system whose content is confirmed, 2; runs that also went red on only one operating system but whose logs have expired, 2; and one flaky test. All 15 red runs were on PR branches; none reached master. The only PR merged on a red run was red because of that flaky test." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="20" y="28" fill="#e6e6e6" font-size="12" text-anchor="start" font-weight="bold">231 CI runs</text>
    <rect x="20" y="40" width="470" height="26" rx="4" fill="#223528" stroke="#54b890"/>
    <text x="255" y="58" fill="#e6e6e6" font-size="11" text-anchor="middle">Green 194</text>
    <rect x="492" y="40" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154"/>
    <text x="534" y="58" fill="#9aa4b2" font-size="10" text-anchor="middle">Cancelled 22</text>
    <rect x="578" y="40" width="42" height="26" rx="4" fill="#3a2632" stroke="#e05a7d"/>
    <text x="599" y="58" fill="#e6e6e6" font-size="10" text-anchor="middle">Red 15</text>
    <line x1="599" y1="66" x2="599" y2="84" stroke="#e05a7d" stroke-width="1.3"/>
    <line x1="20" y1="84" x2="599" y2="84" stroke="#e05a7d" stroke-width="1.3"/>
    <line x1="20" y1="84" x2="20" y2="96" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="20" y="114" fill="#e6e6e6" font-size="12" text-anchor="start" font-weight="bold">The 15 red runs, by cause</text>
    <rect x="20" y="124" width="288" height="26" rx="4" fill="#3a2632" stroke="#e05a7d"/>
    <text x="164" y="142" fill="#e6e6e6" font-size="11" text-anchor="middle">Tests 8</text>
    <rect x="312" y="124" width="144" height="26" rx="4" fill="#2e2a1a" stroke="#d6a45c"/>
    <text x="384" y="142" fill="#e6e6e6" font-size="11" text-anchor="middle">Lint 4</text>
    <rect x="460" y="124" width="108" height="26" rx="4" fill="#262b3a" stroke="#3a4154"/>
    <text x="514" y="142" fill="#9aa4b2" font-size="10" text-anchor="middle">Infrastructure 3</text>
    <text x="576" y="142" fill="#9aa4b2" font-size="10" text-anchor="start">mypy 0</text>
    <text x="20" y="178" fill="#e6e6e6" font-size="12" text-anchor="start" font-weight="bold">What the 8 test failures caught</text>
    <rect x="20" y="188" width="108" height="44" rx="4" fill="#3a2632" stroke="#e05a7d"/>
    <text x="74" y="206" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Silent bug ×3</text>
    <text x="74" y="222" fill="#9aa4b2" font-size="9.5" text-anchor="middle">state reads CLEAN</text>
    <rect x="132" y="188" width="72" height="44" rx="4" fill="#3a2632" stroke="#e05a7d"/>
    <text x="168" y="206" fill="#e6e6e6" font-size="10.5" text-anchor="middle">One OS ×2</text>
    <text x="168" y="222" fill="#9aa4b2" font-size="9.5" text-anchor="middle">confirmed</text>
    <rect x="208" y="188" width="72" height="44" rx="4" fill="#262b3a" stroke="#3a4154"/>
    <text x="244" y="206" fill="#9aa4b2" font-size="10.5" text-anchor="middle">One OS ×2</text>
    <text x="244" y="222" fill="#9aa4b2" font-size="9.5" text-anchor="middle">log expired</text>
    <rect x="284" y="188" width="36" height="44" rx="4" fill="#2e2a1a" stroke="#d6a45c"/>
    <text x="302" y="214" fill="#e6e6e6" font-size="9.5" text-anchor="middle">flaky</text>
    <rect x="340" y="188" width="280" height="44" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="480" y="207" fill="#54b890" font-size="12" text-anchor="middle" font-weight="bold">All 15 on PR branches</text>
    <text x="480" y="223" fill="#e6e6e6" font-size="10" text-anchor="middle">Reached master: 0</text>
    <text x="20" y="262" fill="#9aa4b2" font-size="10" text-anchor="start">"Log expired": we know which OS went red, not which test. The flaky one is the only PR merged on red.</text>
    <text x="20" y="282" fill="#9aa4b2" font-size="10" text-anchor="start">22 cancelled: 21 master runs superseded by a newer merge, 1 PR run superseded by a new push.</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">GitCrisp's CI red-run ledger (May 17 to October 5, 2026). Not many red runs, but every one stopped at the PR — the only place a guardrail should be.</figcaption>
</figure>

The numbers themselves are unremarkable: 15 red runs, half of them tests, a few each from lint and infrastructure, and mypy never red once. What's worth telling is two groups among those 8 test failures.

**The pygit2 1.20 silent bug.** Dependabot opened a PR bumping pygit2, and CI went red on all three platforms — three runs in a row, blocked for eleven days. pygit2 1.20 had removed the old `GIT_*` constants, and the code GitCrisp uses to read repo state looked them up with `getattr(pygit2, name, None)` — so the missing constants raised nothing; the lookup table just went empty, and `state()` fell all the way through to its default, `CLEAN`. The commit that fixed it says so plainly: **"The user-visible effect is worse than a failed import would have been."** A repo stuck in the middle of a merge conflict would show "no operation in progress"; the conflict banner would never appear, and its abort/continue actions would be unreachable.

Anyone who read [[ai-incident-clock|the incident post]] will recognise the shape: **failure as silence.** It doesn't crash, doesn't throw — it just quietly tells you everything is fine. That's the hardest kind of bug to notice in Production, and here it was stopped at the PR by a few tests that hard-code "mid-merge, the state must read MERGING" — red on all three platforms.

**Bugs that only show up on one operating system.** A layout overlap only on macOS (off by 1px), a heap corruption only on Windows; and two more runs that went red only on Linux or only on Windows, whose logs have since expired, so there's no telling which test. The three-platform matrix makes CI take three times as long, and these are what it buys — on a single-platform CI, every one of them would have been green.

One more entry, for honesty: **the only PR merged on a red run was red because of a flaky test** — a debounce test racing the scheduler, unrelated to that PR's change. A later PR fixed it. The real cost of a flaky test isn't that one merge; it's that it teaches people "sometimes you can ignore red".

## Ledger two: break it on purpose — does anything go red?

Ledger one answers "what has it stopped", but it only sees the times someone actually got something wrong. To know how strong a guardrail is, you have to ask the reverse: **if the code were wrong, would it go red?** That's what mutation testing does — deliberately change one thing in the code (`==` to `!=`, `and` to `or`, a number plus one, a return value replaced by `None`), run the full test suite, and see whether any test goes red. If one does, that mutant is "killed"; if everything stays green, it "survived" — an error the test net didn't catch.

I had an AI randomly pick 15 spots in each of GitCrisp's four layers (domain only had 4 mutable spots, since that layer is almost all data structures and interface definitions) — 49 mutants in all, each run against the full 1,294 tests. The 24 survivors were then classified one by one: 7 were **equivalent mutants** — changes that don't affect behaviour, like a default argument on a Protocol interface (which no implementation ever executes) or a layout margin going from 4px to 5px. It's correct for tests to miss those; they don't count as gaps.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 330" role="img" aria-label="Guardrail strength across GitCrisp's four layers. From the top: the presentation layer, 15,200 lines of code and 13,700 lines of tests, killed 5 of 11 mutants once equivalent ones are excluded, about 45 percent; the application layer, 800 lines of code and 800 of tests, killed 12 of 15, 80 percent; the infrastructure layer, 3,100 lines of code and 4,100 of tests, killed 7 of 15, about 47 percent; the domain layer, 400 lines, had only one effective mutant, which was killed. On the right, each layer is marked with whether mypy checks it: only application and domain are. The seams between layers are drawn as dashed lines: each layer's tests stay inside that layer, and presentation's tests mock out the layer below, so the seams are guarded only by end-to-end tests — 1.7 percent of all tests, which still killed 4 of the 25 killed mutants." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="20" y="22" fill="#9aa4b2" font-size="10" text-anchor="start">Layer · source / test lines</text>
    <text x="240" y="22" fill="#9aa4b2" font-size="10" text-anchor="start">Mutants killed (equivalent ones excluded)</text>
    <rect x="20" y="34" width="200" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="120" y="55" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">presentation</text>
    <text x="120" y="73" fill="#9aa4b2" font-size="10" text-anchor="middle">15.2k / 13.7k</text>
    <rect x="240" y="47" width="150" height="24" rx="4" fill="#262b3a" stroke="#3a4154"/>
    <rect x="240" y="47" width="68" height="24" rx="4" fill="#3a2632" stroke="#e05a7d"/>
    <text x="400" y="64" fill="#e6e6e6" font-size="11" text-anchor="start">5 / 11 ≈ 45%</text>
    <line x1="120" y1="84" x2="120" y2="110" stroke="#d6a45c" stroke-width="1.5" stroke-dasharray="4 3"/>
    <text x="132" y="101" fill="#d6a45c" font-size="9.5" text-anchor="start">Seam: lower layer mocked</text>
    <rect x="20" y="110" width="200" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="120" y="131" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">application</text>
    <text x="120" y="149" fill="#9aa4b2" font-size="10" text-anchor="middle">0.8k / 0.8k</text>
    <rect x="240" y="123" width="150" height="24" rx="4" fill="#262b3a" stroke="#3a4154"/>
    <rect x="240" y="123" width="120" height="24" rx="4" fill="#223528" stroke="#54b890"/>
    <text x="400" y="140" fill="#e6e6e6" font-size="11" text-anchor="start">12 / 15 = 80%</text>
    <line x1="120" y1="160" x2="120" y2="186" stroke="#d6a45c" stroke-width="1.5" stroke-dasharray="4 3"/>
    <text x="132" y="177" fill="#d6a45c" font-size="9.5" text-anchor="start">Seam: each tested alone</text>
    <rect x="20" y="186" width="200" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="120" y="207" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">infrastructure</text>
    <text x="120" y="225" fill="#9aa4b2" font-size="10" text-anchor="middle">3.1k / 4.2k</text>
    <rect x="240" y="199" width="150" height="24" rx="4" fill="#262b3a" stroke="#3a4154"/>
    <rect x="240" y="199" width="70" height="24" rx="4" fill="#3a2632" stroke="#e05a7d"/>
    <text x="400" y="216" fill="#e6e6e6" font-size="11" text-anchor="start">7 / 15 ≈ 47%</text>
    <rect x="20" y="246" width="200" height="40" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="120" y="263" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">domain</text>
    <text x="120" y="278" fill="#9aa4b2" font-size="10" text-anchor="middle">0.4k / 0.3k</text>
    <text x="240" y="271" fill="#9aa4b2" font-size="10.5" text-anchor="start">Only 1 effective mutant (killed)</text>
    <text x="520" y="140" fill="#54b890" font-size="10" text-anchor="start">mypy ✓</text>
    <text x="520" y="64" fill="#9aa4b2" font-size="10" text-anchor="start">mypy ✗</text>
    <text x="520" y="216" fill="#9aa4b2" font-size="10" text-anchor="start">mypy ✗</text>
    <text x="520" y="271" fill="#54b890" font-size="10" text-anchor="start">mypy ✓</text>
    <text x="20" y="312" fill="#d6a45c" font-size="11" text-anchor="start">Only e2e guards the seams: 1.7% of all tests, yet 4 of the 25 kills</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Guardrail strength across GitCrisp's four layers. There are about as many lines of tests as lines of code (20.3k against 19.8k overall), but strength varies widely — and the errors that slip through cluster between the layers.</figcaption>
</figure>

With equivalent mutants excluded, the tests killed 25 of 42 effective mutants — **about six in ten**. The number only means something layer by layer:

**The application layer is the strongest, at 80%.** It's almost all one-line pass-throughs — `return self._reader.get_stashes()` — and most of them have a dedicated delegation test: "call the query, check it hands its arguments to the reader untouched." Those tests look dumb, but they're exactly checking "does it go red when it's wrong".

**Infrastructure and presentation both come in under half.** Several of the 17 real gaps among the survivors are very concrete: flip the `==` that matches the file name in a diff to `!=`, and you get **another file's** hunks back; flip the `!=` that updates the cache after deleting a remote tag to `==`, and the cache ends up holding only the tag you just deleted; invert the check for a locked worktree, and the wrong error dialog pops up. All tests green.

**The most telling part is the seams.** Three application-layer mutants survived, including the "file history" query returning `None` outright — the entire file-history feature broken, and not one of the 1,294 tests went red. Not because nobody tests file history: infrastructure has tests for its reader, and presentation tests that clicking the menu emits the file-history signal. The problem is that **on the presentation side the queries are a `MagicMock`, and on the infrastructure side the tests call the reader directly** — each side is right on its own, and when the one-line pass-through between them breaks, no layer's tests can see it. The only thing guarding the space between layers is the e2e journeys: 1.7% of all the tests, and they killed 4 of the 25 mutants that died.

## The guardrail recursion and its stop-loss

[[responsibility-funnel|The first post]] left a question half-answered: **the tests are AI-written too, so who accepts the tests?** That recursion has no bottom — whatever accepts the tests needs accepting too — and the stop-loss offered then was "a person spot-checks the guardrails themselves".

This experiment makes that spot-check concrete: **don't read the tests line by line; break the code and see whether the tests notice.** Nobody can read twenty thousand lines of tests, but 49 mutants on six parallel workers, under an hour of machine time in total, drew the map above — which layer is strong, which is weak, and what the errors that slip through look like. It's a view a person can never get from review: review sees what the tests say; mutation sees what the tests **stop**.

It's the other direction of [[ai-review-craft|the last post's]] bug-planting experiment: that one was "plant bugs, see if the reviewer catches them", this one is "plant bugs, see if the tests catch them". Both ask the same question — **is the line of defence you think you have actually there?**

## The return on guardrails

How do you work out the return on guardrails? The honest answer: **a bug that was stopped has no price tag** — if that pygit2 silent bug had shipped in a release, there's no number for how much of users' time and trust it would have cost. But the cost structure on both sides is visible:

- **The cost side has dropped sharply in the AI era.** GitCrisp has almost as many lines of tests as lines of code (20.3k against 19.8k), a heavy ratio back when people wrote tests by hand; but 528 of this project's 904 non-merge commits are marked as co-authored by Claude, so the marginal cost of writing a test is now close to the marginal cost of writing the code. The costs still borne by people are two others: **CI time** (the three-platform matrix triples every run) and **the trust cost of flaky tests**.
- **The return side hasn't changed shape.** It's still sparse and unpredictable — 15 red runs in five months, of which maybe one or two really mattered. But those one or two are the silent bug and the bug that only shows on one platform — precisely the two kinds a person is least likely to catch in review.

So on an AI production line, the question moves from "should we write tests" to "**are the tests strong enough**". AI has driven down the cost of the first; not the second, because tests written by AI will just as happily use a single stash.

## Reflection

### Test line count is output, not strength

GitCrisp has twenty thousand lines of tests, and that number is easy to hold up as proof that "the guardrails are thorough". This experiment says it isn't: eight hundred lines of tests in the application layer buy an 80% kill rate; thirteen thousand seven hundred lines in presentation buy 45%. Line count measures how many tests the AI wrote, not how many errors the tests stop. **Once a metric is easy for an AI to push up, it stops telling you how strong your guardrails are** — line count and coverage both. A mutation kill rate is harder to inflate, because to raise it, the tests actually have to go red when the code is wrong.

### The errors that slip through live in the seams

Clean Architecture makes every layer easy to test. That's its strength, and it's also the blind spot this experiment found: each layer's tests stay inside their own box, and the line between boxes belongs to no layer. That's exactly where an AI production line is most likely to break — AI is very good at getting each layer right on its own and backing it with tests, but "does the next layer actually use what this layer hands it?" falls inside no layer's tests. Which is why e2e tests deserve a fresh valuation on an AI production line: they're slow, few and hard to write, but they're the only guardrail that crosses the seams.

### Guardrails need accepting too

One idea keeps coming back in this series: a neck doesn't exist because you drew it; it exists because, time after time, it actually stops things. Guardrails are the same — a test suite that has never been deliberately broken might be a guardrail or might be decoration, and you can't tell which. The CI ledger can only tell you what it has stopped; mutation tells you what it will miss. **A guardrail isn't something you finish writing. It needs breaking and accepting on a schedule, the same way it accepts the code.**

Earlier in this series: [[responsibility-funnel|#1 the responsibility funnel]] · [[ai-incident-clock|#2 a clock on the neck]] · [[ai-responsibility-design|#3 the neck on the board]] · [[ai-responsibility-premium|#4 the responsibility premium]] · [[ai-spec-craft|#5 spec as code]] · [[ai-review-craft|#6 the craft of acceptance]]
