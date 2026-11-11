---
title: "What OOAD Actually Does: A Chain of \"Who Owns This?\" Decisions"
date: 2026-11-11
category: tech
description: "The opener for a new series. OOAD isn't drawing UML, and it isn't memorising design patterns — it's a chain of \"who owns this?\" decisions. The case study is a real app that has lived from 2021 to now: one decision had five homes in five years, and once it found the right one, every later rule change knew where to go."
tags:
  - ooad
  - object-design
  - kotlin
series: "OOAD: I Thought I Knew It"
seriesOrder: 1
comments: true
draft: false
translationOf: ooad-intro
---
This site already has one "I Thought I Knew It" series — [[sql-execution-order|the SQL one]] takes queries apart. This is the second, and it takes object orientation apart.

Encapsulation, inheritance, polymorphism — anyone can recite the three. You've heard there are twenty-three design patterns, and you can spell out SOLID. But none of those words is what actually stops your hands. What stops them is that second, halfway through writing something, when you ask: **where does this logic go?**

OOAD (Object-Oriented Analysis and Design) is the craft of answering that question. Each post in this series takes one concept we use every day with a blurry mental model, and breaks it back down to the question it exists to answer. This first post states the whole series' claim up front:

**OOAD isn't drawing UML, and it isn't memorising design patterns — it's a chain of "who owns this?" decisions.**

## Start with some code from 2021

The series has one running case study: [SportRecorder](https://github.com/Aidan79225/SportRecorder), a food diary app built around fasting. You pick a fasting type (16:8, say — sixteen hours of fasting, eight of eating), log each meal, and the ring on the home screen tells you whether you're **eating**, **fasting**, or **fast complete**.

It's an Android app I wrote in 2021. The source is public, and the history is all still there. Back then, the home screen decided "which phase are we in" like this (excerpt):

```kotlin
// DietFragment.kt, August 2021 (commit a6633b5)
fun updateTime(eatTime: Pair<Long, Long>) {
    val remainTime = System.currentTimeMillis() - eatTime.first
    val eatingHours = dietPreference.preference.getLong(Constants.DIET_EATING_TIME_INTERVAL, 8)
    val eatingTimeMillis = TimeUnit.HOURS.toMillis(eatingHours)
    // …the fasting hours are read the same way

    when {
        remainTime < eatingTimeMillis -> {
            statusImageView.setImageResource(R.drawable.ic_baseline_fastfood_24)
            statusTextView.text = getString(R.string.diet_status_eating)
            timerTextView.text = getTimeString(eatingTimeMillis - remainTime)
        }
        fastingTime > fastingTimeMillis -> { /* fast complete: swap the icon and label */ }
        else -> { /* fasting: swap the icon and label */ }
    }
}
```

Thirty lines, three unrelated jobs: **reading settings** (how many hours to fast, pulled straight out of SharedPreferences), **computing the phase** (that `when`), and **updating the screen** (swapping the icon, the label, the countdown). It ran, and the file stayed in the repo until it was replaced in 2026.

Today the same thing is three separate pieces, each minding its own business:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 290" role="img" aria-label="A before-and-after comparison. On the left is 2021: a single function, DietFragment.updateTime, holds three jobs — reading settings straight from SharedPreferences, computing the phase (eating, fasting or fast complete), and updating the screen (icon, label, countdown); to test it or reuse it you have to boot the screen first. On the right is today: each job has its own home. DietSettingsRepository is the only thing that knows where settings live and passes the eating and fasting hours to DietWindow.compute. DietWindow.compute only computes the phase, takes the current time as a parameter, and hands a DietWindowState to DietScreen. DietScreen only draws it. Reminders (ReminderPlanner) and Insights (InsightsAggregator) also hang off DietWindow, sharing the same rule instead of keeping a second copy." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="ooad1a" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="135" y="24" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">2021: one function, three jobs</text>
    <rect x="20" y="38" width="230" height="212" rx="10" fill="#1f2330" stroke="#3a4154" stroke-width="1.4"/>
    <text x="135" y="60" fill="#e6e6e6" font-size="10.5" text-anchor="middle">DietFragment.updateTime()</text>
    <rect x="36" y="72" width="198" height="48" rx="7" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="135" y="92" fill="#d6a45c" font-size="11" text-anchor="middle" font-weight="bold">① Read settings</text>
    <text x="135" y="108" fill="#9aa4b2" font-size="9" text-anchor="middle">straight from SharedPreferences</text>
    <rect x="36" y="130" width="198" height="48" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="135" y="150" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">② Compute the phase</text>
    <text x="135" y="166" fill="#9aa4b2" font-size="9" text-anchor="middle">eating / fasting / fast complete</text>
    <rect x="36" y="188" width="198" height="48" rx="7" fill="#262b3a" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="135" y="208" fill="#e05a7d" font-size="11" text-anchor="middle" font-weight="bold">③ Update the screen</text>
    <text x="135" y="224" fill="#9aa4b2" font-size="9" text-anchor="middle">icon, label, countdown</text>
    <text x="135" y="270" fill="#9aa4b2" font-size="9.5" text-anchor="middle">To test or reuse it, boot the screen first</text>
    <line x1="256" y1="144" x2="296" y2="144" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#ooad1a)"/>
    <text x="276" y="134" fill="#9aa4b2" font-size="9.5" text-anchor="middle">move</text>
    <text x="464" y="24" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">Now: three jobs, three homes</text>
    <rect x="304" y="38" width="196" height="50" rx="7" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="402" y="59" fill="#e6e6e6" font-size="10.5" text-anchor="middle">DietSettingsRepository</text>
    <text x="402" y="76" fill="#d6a45c" font-size="9.5" text-anchor="middle">① Only it knows where settings live</text>
    <line x1="402" y1="88" x2="402" y2="112" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ooad1a)"/>
    <text x="410" y="104" fill="#9aa4b2" font-size="9">eating / fasting hours</text>
    <rect x="304" y="116" width="196" height="50" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="402" y="137" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">DietWindow.compute()</text>
    <text x="402" y="154" fill="#4f6df5" font-size="9.5" text-anchor="middle">② Phase only; "now" is a parameter</text>
    <line x1="402" y1="166" x2="402" y2="190" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ooad1a)"/>
    <text x="410" y="182" fill="#9aa4b2" font-size="9">DietWindowState</text>
    <rect x="304" y="194" width="196" height="50" rx="7" fill="#262b3a" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="402" y="215" fill="#e6e6e6" font-size="10.5" text-anchor="middle">DietScreen</text>
    <text x="402" y="232" fill="#e05a7d" font-size="9.5" text-anchor="middle">③ Only draws it</text>
    <line x1="500" y1="132" x2="526" y2="112" stroke="#54b890" stroke-width="1.2" stroke-dasharray="4 3"/>
    <line x1="500" y1="150" x2="526" y2="170" stroke="#54b890" stroke-width="1.2" stroke-dasharray="4 3"/>
    <rect x="526" y="92" width="98" height="38" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="575" y="108" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">Reminders</text>
    <text x="575" y="122" fill="#9aa4b2" font-size="9" text-anchor="middle">ReminderPlanner</text>
    <rect x="526" y="152" width="98" height="38" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="575" y="168" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">Insights</text>
    <text x="575" y="182" fill="#9aa4b2" font-size="8.5" text-anchor="middle">InsightsAggregator</text>
    <text x="575" y="210" fill="#54b890" font-size="9" text-anchor="middle">Same rule,</text>
    <text x="575" y="223" fill="#54b890" font-size="9" text-anchor="middle">no second copy</text>
    <text x="464" y="270" fill="#9aa4b2" font-size="9.5" text-anchor="middle">② Once it has a home, others can borrow it</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The left side isn't badly written — it's three responsibilities sharing one room. What the right side adds isn't code; it's three questions that each have an answer: where the settings live, which phase we're in, what the screen looks like</figcaption>
</figure>

## One decision, five homes in five years

Getting from the left side to the right wasn't one step. In the git history, the "which phase are we in" decision has lived in five places:

| When | Where it lived | What changed at this stop |
|---|---|---|
| August 2021 | `DietFragment.updateTime()` | Shared a function with reading settings and updating the screen |
| 2026-06-10 | `DietViewModel` (`6838606`) | Out of the screen, but still reading settings and checking the clock itself |
| 2026-06-11 | `DietWindow.compute()` (`d2955a0`) | Settings and "now" both became parameters; the same commit brought in this repo's first real unit tests — ten of them |
| 2026-06-12 | Moved into `domain/diet` (`729f986`) | The right address: it was never a screen concern |
| 2026-06-20 | Moved into the cross-platform `:shared` module (`5bd1e2e`) | Groundwork for iOS: one copy of the rule, not a second one |

The third stop deserves a second look. Once "now" changed from `System.currentTimeMillis()` into a parameter, a test became one line per scenario (excerpt):

```kotlin
// DietWindowTest.kt, 2026-06-11: two hours after the first meal, still inside the eating window
@Test fun singleEat_duringWindow_isEating() {
    val s = DietWindow.compute(listOf(f), eh, fh, f + h(2))
    assertEquals(DietPhase.EATING, s.phase)
}
```

To check the same thing against the 2021 version, you'd have to boot the screen, seed SharedPreferences, and then find a way to fool the system clock. Before this commit, the only tests in the whole repo were the two examples that ship with the project template.

## Once it has the right home, later changes have somewhere to go

The real payoff came afterwards. Once this decision had a home of its own, the rule changed three more times — all three in [the same file](https://github.com/Aidan79225/SportRecorder/blob/1fa8f8afcd593eac4ac9745f2930c35d4dea3249/shared/src/commonMain/kotlin/com/crazystudio/sportrecorder/domain/diet/DietWindow.kt):

- **2026-06-19** (`7e0ad7f`): a meal eaten slightly past the eating hours joins the same eating window instead of opening a new one.
- **2026-09-27** (`83f84f3`): the Insights page needed to bucket meals into "the same eating day" — and bucketed them with this same rule, so a 12:30 a.m. snack stays with the previous evening's dinner.
- **2026-11-07** (`9e15ba6`): the fast now starts when the last meal **ends**, not at the moment it began.

All three times, the rule itself had exactly one place to change. Four parts of the app use it today — the ring on the home screen, the home-screen tagline, the Insights page, and reminders — and its tests have grown from ten to twenty-five.

If it still lived in the Fragment, reminders wanting to know "when is the fast complete" could only copy that `when` out. And the copy would not have followed along through those three changes.

**Good object design gives the next change one obvious place to go.** That sentence is the spine of this series, and every post ends by coming back to it.

## The two things OOAD names

There are two verbs in the name. Craig Larman's cut, in the first chapter of *Applying UML and Patterns* (3rd edition), is the cleanest:

- **Analysis** investigates the problem and the requirements, not a solution. In object-oriented terms, that means finding and describing the **concepts in the problem domain** — meals, eating windows, fasting types, venues.
- **Design** is a conceptual solution that fulfils the requirements, not yet its implementation. In object-oriented terms, that means defining **software objects** and how they **collaborate** to fulfil the requirements.

He sums it up in one line: analysis is *do the right thing*, design is *do the thing right*.

The same chapter has the sentence this series is built on. If you could keep only one skill, Larman says, this is the one: *a critical ability in OO development is to skillfully assign responsibilities to software objects*. His reason is plain: whether you're drawing a diagram or writing code, it's the one activity you **can't avoid**, and it directly shapes how maintainable and reusable the software turns out.

Look back at that table — five rows, and every one of them is a responsibility assignment.

## Three things I thought I knew

| I thought OOAD was | Actually |
|---|---|
| Drawing UML | UML is only notation. In Larman's own words, it is not OOA/D or a method — it is "just diagramming notation". Being able to draw a class diagram and knowing which class should be responsible for what are two different things |
| Memorising design patterns | A pattern is a responsibility assignment someone else already made, which later got a name. The name is useful — two words carry a whole design — but it's the outcome, not the starting point |
| Turning the nouns in the requirements into classes | That's the first step of analysis, and the easiest one to get wrong: nouns tell you which concepts exist, not who owns what |

This series covers UML, design patterns and SOLID — but all of them come later. Learn to assign responsibilities first; only then do those tools have somewhere to be used.

## Three questions

This series breaks "good object design" into three questions you can ask of any object. As it happens, those thirty lines from 2021 can't answer any of them.

### Who owns it: where should this logic live?

In 2021 it lived in the screen, because that was the handiest place. Today it lives in `DietWindow`, and `DietWindow` only computes the phase.

### What does it hide: which decision does it keep to itself?

In 2021, "settings are stored in SharedPreferences" was something everybody knew — the screen reached in and took them. Today that decision is hidden behind `DietSettingsRepository`. When storage later moved to DataStore, that commit (`07db03e`) touched only the implementation file, plus one new test.

### What is it called: does the name say what it is?

In 2021 it was `eatTime.first` and `eatTime.second`: a `Pair<Long, Long>`, and you had to read the whole function to guess what the two numbers were. Today it's `windowStart`, `fastStartAt`, `fastTargetAt` — every field of `DietWindowState` can be said out loud.

Every post from here on says which of the three it is mainly exercising.

## Who Owns This?

Every post has this section: take one real thing from the case study, list the candidates and what each would cost, then rule. This post rules on the one above.

**The thing**: deciding whether we're eating, fasting, or fast complete. It needs three pieces of information — which meals exist, the hours of the fasting type, and what time it is now.

| Candidate | Why you'd put it here | What happens if you do |
|---|---|---|
| The screen (Fragment / Composable) | This is where the result gets shown | The second user can only copy it; testing means booting the screen first |
| `DietViewModel` | The screen's state already belongs to it | Reminders are rescheduled in the background after a reboot — there is no screen there, and no ViewModel |
| The meal itself (`EatRecord`) | The time is its own data | One meal doesn't know the other meals, or which fasting type the user picked |
| A `DietWindow` that does only this | All three pieces of information are handed to it as parameters | One more file, one more hand-off |

**The ruling: `DietWindow`.** It holds no state, knows nothing about the screen, knows nothing about storage — it only turns "meals + hours + now" into a `DietWindowState`.

**The evidence** is threefold: the commit that moved it out also brought in ten tests, and before that this decision had no tests at all; all three later rule changes landed in this file; four parts of the app share it today.

The reason the third candidate lost is worth remembering. A meal does hold the time — but the information this job needs **isn't all on it**. "Whoever holds the information needed owns the job" is a principle with a name (Information Expert), and a later post is devoted to it — including when it leads you astray.

## When Not to Use It

The answer is the 2021 version. Back then this decision had one user (the home screen), a rule that wasn't changing, and no tests of any kind — extracting it into its own object would have bought extra files and extra hand-offs in exchange for nothing.

There are three signals that it's time to move, and for this app all three arrived at once in 2026:

1. **A second user showed up.** Reminders need to know when the fast is complete; Insights needs to know which meals count as the same day.
2. **The rule started changing.** How overruns count, which moment the clock starts from — every change has to be sure it broke nothing else.
3. **You want to test it.** Logic that depends on time can either be tested or be waited on.

Until one of them shows up, keeping logic in the handiest place isn't a mistake — it's frugal. It's the same yardstick as [[pain-before-power|confirming the pain before bringing in the heavy weapons]].

One more thing to say up front. The `DietWindow` on the right is a Kotlin `object` — no state, no instances, a bundle of pure functions. Does that count as "object-oriented"? A textbook would probably frown. This series' position is: **assigning responsibilities doesn't go away just because the thing you're assigning them to is a class, an `object`, or a function.** When to use objects and when not to is left for the second-to-last post.

## The map of this series

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 720 236" role="img" aria-label="A map of the series. The top row is five boxes, read left to right, one per act. Act 1, Analysis, asks what's in the problem and covers use cases, the domain model, and invariants and contracts. Act 2, Responsibility, asks who owns this and covers responsibility, Information Expert, encapsulation, God classes, and coupling and cohesion. Act 3, Shape, is about what classes look like and covers state, value objects, inheritance, composition, polymorphism and interfaces. Act 4, Names, is about the names others coined and covers design patterns, SOLID and the wrong abstraction. Act 5, Evolution, says design gets revised and covers tests, refactoring, when not to use it, and review. The bottom row is the three questions; every post practises one of them: who owns it — which object should this logic live in; what does it hide — which decision does it keep to itself; what is it called — would the business recognise the name." style="width:100%;max-width:720px;height:auto;margin:0 auto;">
    <text x="360" y="20" fill="#9aa4b2" font-size="9.5" text-anchor="middle">Five acts, read left to right</text>
    <rect x="10" y="30" width="132" height="104" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="76" y="50" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">1 · Analysis</text>
    <text x="76" y="68" fill="#54b890" font-size="9.5" text-anchor="middle">What's in the problem?</text>
    <text x="76" y="90" fill="#9aa4b2" font-size="8.5" text-anchor="middle">use cases, domain model,</text>
    <text x="76" y="103" fill="#9aa4b2" font-size="8.5" text-anchor="middle">invariants and contracts</text>
    <rect x="152" y="30" width="132" height="104" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="218" y="50" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">2 · Responsibility</text>
    <text x="218" y="68" fill="#4f6df5" font-size="9.5" text-anchor="middle">Who owns this?</text>
    <text x="218" y="90" fill="#9aa4b2" font-size="8.5" text-anchor="middle">responsibility, Expert,</text>
    <text x="218" y="103" fill="#9aa4b2" font-size="8.5" text-anchor="middle">encapsulation, God class,</text>
    <text x="218" y="116" fill="#9aa4b2" font-size="8.5" text-anchor="middle">coupling and cohesion</text>
    <rect x="294" y="30" width="132" height="104" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="360" y="50" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">3 · Shape</text>
    <text x="360" y="68" fill="#d6a45c" font-size="9.5" text-anchor="middle">What classes look like</text>
    <text x="360" y="90" fill="#9aa4b2" font-size="8.5" text-anchor="middle">state, value objects,</text>
    <text x="360" y="103" fill="#9aa4b2" font-size="8.5" text-anchor="middle">inheritance, composition,</text>
    <text x="360" y="116" fill="#9aa4b2" font-size="8.5" text-anchor="middle">polymorphism, interfaces</text>
    <rect x="436" y="30" width="132" height="104" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/>
    <text x="502" y="50" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">4 · Names</text>
    <text x="502" y="68" fill="#9aa4b2" font-size="9.5" text-anchor="middle">Names others coined</text>
    <text x="502" y="90" fill="#9aa4b2" font-size="8.5" text-anchor="middle">design patterns, SOLID,</text>
    <text x="502" y="103" fill="#9aa4b2" font-size="8.5" text-anchor="middle">the wrong abstraction</text>
    <rect x="578" y="30" width="132" height="104" rx="8" fill="#262b3a" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="644" y="50" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">5 · Evolution</text>
    <text x="644" y="68" fill="#e05a7d" font-size="9.5" text-anchor="middle">Design gets revised</text>
    <text x="644" y="90" fill="#9aa4b2" font-size="8.5" text-anchor="middle">tests, refactoring,</text>
    <text x="644" y="103" fill="#9aa4b2" font-size="8.5" text-anchor="middle">when not to use it, review</text>
    <text x="147" y="86" fill="#9aa4b2" font-size="9" text-anchor="middle">›</text>
    <text x="289" y="86" fill="#9aa4b2" font-size="9" text-anchor="middle">›</text>
    <text x="431" y="86" fill="#9aa4b2" font-size="9" text-anchor="middle">›</text>
    <text x="573" y="86" fill="#9aa4b2" font-size="9" text-anchor="middle">›</text>
    <text x="360" y="160" fill="#9aa4b2" font-size="9.5" text-anchor="middle">Every post practises one of these three questions</text>
    <rect x="10" y="172" width="222" height="48" rx="8" fill="#1f2330" stroke="#3a4154" stroke-width="1.3"/>
    <text x="121" y="192" fill="#e6e6e6" font-size="11.5" text-anchor="middle" font-weight="bold">Who owns it?</text>
    <text x="121" y="209" fill="#9aa4b2" font-size="9" text-anchor="middle">Which object should this logic live in?</text>
    <rect x="249" y="172" width="222" height="48" rx="8" fill="#1f2330" stroke="#3a4154" stroke-width="1.3"/>
    <text x="360" y="192" fill="#e6e6e6" font-size="11.5" text-anchor="middle" font-weight="bold">What does it hide?</text>
    <text x="360" y="209" fill="#9aa4b2" font-size="9" text-anchor="middle">Which decision does it keep to itself?</text>
    <rect x="488" y="172" width="222" height="48" rx="8" fill="#1f2330" stroke="#3a4154" stroke-width="1.3"/>
    <text x="599" y="192" fill="#e6e6e6" font-size="11.5" text-anchor="middle" font-weight="bold">What is it called?</text>
    <text x="599" y="209" fill="#9aa4b2" font-size="9" text-anchor="middle">Would the business recognise the name?</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The order is the reading order: first work out what's in the problem, then decide who owns what, and only then talk about what classes look like; names and the other side come last</figcaption>
</figure>

Each of the five acts answers one thing:

- **Analysis** — skipping this act and opening a class straight away is the most common first move. Use cases, the domain model, invariants: all of them are ways to state the problem clearly before writing code.
- **Responsibility** — the core of the series. What a responsibility is, how to hand them out, what encapsulation is actually hiding, how a God class grows.
- **Shape** — the ones people argue about most: whether a state machine should exist, whether inheritance is for reuse, when polymorphism earns its keep, whose an interface is.
- **Names** — design patterns and SOLID. The industry named, long ago, the things the first three acts do; names are for communicating, not for applying by rote.
- **Evolution** — design is arrived at by changing things, so testing and refactoring belong here; and sometimes objects are the wrong tool, so there is a post for the other side.

Every post carries the same four things: a diagram of a responsibility being moved, real code before and after, a "Who Owns This?" section, and a "When Not to Use It" section. Examples come only from real repos — SportRecorder, [[gitcrisp|GitCrisp]], and the battlefields this blog has already written about — **there will be no Animal, Dog or Shape**.

The case study is mostly Kotlin, because I wrote Android for eight years; the last two have been backend and data, so Python examples will show up later too.

## Reflections

### The 2021 code wasn't wrong

Looking back at those thirty lines: I put the decision in the Fragment purely to move fast. And the logic wasn't complicated yet — pulling it out into MVVM would have looked more like over-design.

Hold it up against the three signals above, and in 2021 none of them was lit — no second user, no changing rule, nobody testing it. So it wasn't a wrong design; it just wasn't time to move yet. The real problem is a different one: the signal is already lit, and the logic is still living where it was.

So this series won't be an answer key. The same piece of logic can be right inside a Fragment and right inside an object of its own; what differs is how many users it has at that moment, and how often it changes.

### Five years away, and why I came back

This repo's history is almost blank after August 2021, and only starts moving again in June 2026. The reason I came back is simple: with AI, I finally had the time. I'd always wanted a diary that tracks what I eat; the original repo was already on Google Play, and this refactor is meant to turn it into Compose Multiplatform and ship it on iOS.

So the last four stops in that table weren't typed out by me, line by line. The direction was mine — I told it to follow Clean Architecture; most of the implementation went to AI; what I did was set the rules and sign off the result. Every 2026 commit this series quotes from here on comes out of that division of labour.

### Layering is now written for the person reviewing

I asked for Clean Architecture for a very practical reason: at review time, just seeing which folder a piece of code sits in tells me in advance what kind of implementation should be inside. Now that there's AI, explicit layering makes it easier for a human to review.

I rarely send work back to AI for a redo any more — because the rules, and the rules for review, were written before it started.

Being able to write those rules presupposes that the person writing them can answer "who owns this?" themselves. AI will hand you ten classes in a minute, every one of them tidy; which decision should live where is not something it settles for you, unless you say so first. [[ai-review-craft|How to review AI-written code]] belongs to another series; here I'll add only its precondition: **you have to know what the right design looks like before you can check for it.**

One verdict to close on: **anyone can write the class; who owns this has to be something you can answer.**
