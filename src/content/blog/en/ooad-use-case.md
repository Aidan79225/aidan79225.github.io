---
title: "A Use Case Is Not a Feature List: The Hard Parts Are Off the Happy Path"
date: 2026-11-18
category: tech
description: "The first step of OOAD isn't opening a class — it's working out which things there are to rule on. A feature list can't answer that; a use case can, because it forces you to write down every way through other than the happy path. Two use cases reverse-engineered from SportRecorder: a rule that has been there since 2021 and moved house in 2026 with only half of itself, and a feature you can state in one sentence that was followed by three PRs."
tags:
  - ooad
  - use-case
  - requirements
  - kotlin
series: "OOAD: I Thought I Knew It"
seriesOrder: 2
comments: true
draft: true
translationOf: ooad-use-case
---
[[ooad-intro|The previous post]] described OOAD as a chain of "who owns this?" decisions. But there is an earlier question, before any ruling: **which things are there to rule on?**

The most common answer is a feature list. This series' case study, SportRecorder, is a food diary app, and its most central feature — logging a meal — would look something like this as a list:

- Can add a meal
- Can pick a date and a time
- Can attach photos, a note, a venue and a location

Every line is true, and it's enough to plan the work with. But build the feature from that list, and not one of the following has been answered by anybody: what if the chosen time is in the future? If the user refuses location permission, can the meal still be saved? What if a photo won't import? If the user closes the sheet halfway through, do the photos they just took stay or go?

Those are the things to rule on. And the way of writing that forces them out has a name: the **use case**.

## Writing "Log a meal" as a use case

I had an AI reverse-engineer this flow from the code and the specs. The format is the skeleton from Alistair Cockburn's *Writing Effective Use Cases*, keeping only the fields that matter most:

**Use case: Log a meal**

- **Primary actor**: a user who wants to keep a record of what they eat
- **Goal level**: user goal
- **What the actor cares about**: recording should be fast and easy
- **Main success scenario**
  1. The user taps "+" on the home screen.
  2. The system opens a new meal: the time is now, the duration is one hour, and the current location is attached; everything else is empty.
  3. The user taps CREATE.
  4. The system saves the meal and reschedules the reminders; the ring on the home screen updates.
- **Extensions**
  - 1a. The user doesn't want to open the app: one tap on "Log a meal" in the notification shade, and the system records a meal at "now" without opening the editor.
  - 2a. The user refuses to share their location, or no fix arrives: the location row reads "No location", and the meal still saves.
  - 3a. The chosen time is in the future: the system doesn't save.
  - 3b. A photo won't import: that photo isn't added; everything else carries on.
  - 3c. This meal overlaps another one: it's recorded anyway.
  - 3d. The user closes the sheet without tapping CREATE: the photo files taken this time are deleted; anything already saved is left alone.

The main success scenario — the happy path — is four steps, and anyone you show it to will nod. The six extensions are another matter: each one is a decision somebody has to own, and not one of them was made up for this post:

| | Where it comes from in the repo |
|---|---|
| 1a | `QuickRecordMealUseCase`, added on 2026-10-04. Its comment gives the reason it exists: *it costs one tap from outside the app* |
| 2a | The spec of 2026-06-10 (written in Chinese): "refused / no fix → lat/lng is null, and the record can still be saved" |
| 3a | A rule that has been there since 2021 — the next section is about it |
| 3b | A failed import returns null, and the ViewModel, getting null, doesn't add that photo |
| 3c | The spec of 2026-11-07: *meals may overlap — the app records, it does not judge* |
| 3d | The spec of 2026-06-11 (in Chinese): "closed without saving: only this session's `pendingPhotos` files are deleted… existing photos are never touched" |

3c deserves a second look: its handling is "don't handle it". Two meals overlap and the system records them anyway — that's not an oversight, it's a decision set down in black and white in the spec, and the reason is the app's own principle: record, never judge. **Listing an extension doesn't mean every one has to be blocked; what it forces is that somebody decides each one.**

## One extension, five years

3a is the oldest of the six. The version I wrote in 2021 looked like this (excerpt):

```kotlin
// CreateEatTimeViewModel.kt, August 2021 (commit 583bdfb)
suspend fun createEatingTime(): Boolean {
    return if (currentCalendar.timeInMillis > Calendar.getInstance().timeInMillis) {
        false
    } else {
        eatTimeDao.insert(EatTime(time = currentCalendar.timeInMillis))
        true
    }
}
```

The screen, on getting `false`, popped up a message telling you the time can't be later than now.

The same rule [lives here now](https://github.com/Aidan79225/SportRecorder/blob/d294a3bccea01856998b92c3733581993f29f3c7/shared/src/commonMain/kotlin/com/crazystudio/sportrecorder/domain/usecase/SaveEatRecordUseCase.kt) (excerpt):

```kotlin
// SaveEatRecordUseCase.kt
suspend operator fun invoke(
    record: EatRecord,
    newPhotoFileNames: List<String>,
    removedPhotos: List<EatPhoto>,
    now: Long = Clock.System.now().toEpochMilliseconds(),
): Boolean {
    if (record.time > now) return false
    repository.save(record, newPhotoFileNames, removedPhotos)
    rescheduleReminders.reschedule()
    return true
}
```

The condition hasn't changed by a word: if the time is later than now, return `false`. What changed is where it lives — it moved out of the ViewModel into a class that only handles saving, and "now" became a parameter, so it can be tested (the same move as `DietWindow` in the previous post). The commit that moved it (`30d8919`, 2026-06-12) brought two tests; there are three today.

So far, all good news. The problem is the other half.

Craig Larman's chapter on use cases in *Applying UML and Patterns* (the sentences quoted in this post are from chapter 6 of the second edition) has a reminder: an extension has two parts — *the condition and the handling*. The 2021 version had both halves: the condition in the ViewModel, the handling in the Fragment. On 10 June 2026, the commit that rebuilt this screen in Compose (`a3293b5`) deleted the Fragment, and the message went with it. The new screen wired up only the success side, and [it's still that way today](https://github.com/Aidan79225/SportRecorder/blob/d294a3bccea01856998b92c3733581993f29f3c7/app/src/main/java/com/crazystudio/sportrecorder/ui/AppRoot.kt#L341-L343):

```kotlin
// AppRoot.kt
onConfirm = {
    scope.launch { if (vm.save()) navController.popBackStack() }
},
```

There is no `else`. So today, pick a time in the future and tap CREATE: nothing is saved, the sheet doesn't close, **and not one word tells you why**. The message's string is still sitting in the resource file; lint flags it as unused.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 290" role="img" aria-label="A before-and-after comparison of the two halves of one extension, the chosen time being in the future. On the left is 2021: the condition lives in CreateEatTimeViewModel — if the time is in the future it returns false; that false is handed down to CreateEatTimeDialogFragment, where the handling lives — it shows a message and the sheet stays open so you can fix the time. There were no tests, but the user knew why nothing was saved. An arrow in the middle is labelled move. On the right is today: the condition has moved into SaveEatRecordUseCase and has three tests beside it; the false is handed down to the screen in AppRoot, where the handling box is drawn with a dashed outline because it did not come along — nothing is saved, the sheet does not close, and nothing says why. The condition got a home and tests; the message did not." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="ooad2a" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="150" y="24" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">2021: both halves in place</text>
    <rect x="16" y="38" width="268" height="214" rx="10" fill="#1f2330" stroke="#3a4154" stroke-width="1.4"/>
    <text x="150" y="60" fill="#e6e6e6" font-size="10.5" text-anchor="middle">CreateEatTimeViewModel</text>
    <rect x="32" y="70" width="236" height="48" rx="7" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="150" y="90" fill="#d6a45c" font-size="11" text-anchor="middle" font-weight="bold">Condition</text>
    <text x="150" y="106" fill="#9aa4b2" font-size="9.5" text-anchor="middle">time is in the future → return false</text>
    <line x1="150" y1="118" x2="150" y2="150" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ooad2a)"/>
    <text x="158" y="138" fill="#9aa4b2" font-size="9">false</text>
    <text x="150" y="172" fill="#e6e6e6" font-size="10.5" text-anchor="middle">CreateEatTimeDialogFragment</text>
    <rect x="32" y="182" width="236" height="48" rx="7" fill="#262b3a" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="150" y="202" fill="#e05a7d" font-size="11" text-anchor="middle" font-weight="bold">Handling</text>
    <text x="150" y="218" fill="#9aa4b2" font-size="9.5" text-anchor="middle">shows a message; the sheet stays open</text>
    <text x="150" y="272" fill="#9aa4b2" font-size="9.5" text-anchor="middle">No tests — but the user knows why it didn't save</text>
    <line x1="290" y1="146" x2="332" y2="146" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#ooad2a)"/>
    <text x="311" y="136" fill="#9aa4b2" font-size="9.5" text-anchor="middle">move</text>
    <text x="481" y="24" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">Now: only one half moved</text>
    <rect x="338" y="38" width="286" height="214" rx="10" fill="#1f2330" stroke="#3a4154" stroke-width="1.4"/>
    <text x="481" y="60" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">SaveEatRecordUseCase</text>
    <rect x="354" y="70" width="176" height="48" rx="7" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="442" y="90" fill="#d6a45c" font-size="11" text-anchor="middle" font-weight="bold">Condition</text>
    <text x="442" y="106" fill="#9aa4b2" font-size="9.5" text-anchor="middle">future time → return false</text>
    <rect x="538" y="70" width="70" height="48" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="573" y="90" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">Tests</text>
    <text x="573" y="106" fill="#9aa4b2" font-size="9.5" text-anchor="middle">3</text>
    <line x1="481" y1="118" x2="481" y2="150" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ooad2a)"/>
    <text x="489" y="138" fill="#9aa4b2" font-size="9">false</text>
    <text x="481" y="172" fill="#e6e6e6" font-size="10.5" text-anchor="middle">AppRoot (the screen)</text>
    <rect x="354" y="182" width="254" height="48" rx="7" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3" stroke-dasharray="5 4"/>
    <text x="481" y="202" fill="#e05a7d" font-size="11" text-anchor="middle" font-weight="bold">Handling: didn't come along</text>
    <text x="481" y="218" fill="#9aa4b2" font-size="9.5" text-anchor="middle">no save, no close, no word on why</text>
    <text x="481" y="272" fill="#9aa4b2" font-size="9.5" text-anchor="middle">The condition got a home and tests; the message didn't</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">An extension has two halves: what the situation is (the condition) and what to do about it (the handling). The condition is something inside the system, so it can be written as a test; the handling is something the actor sees, and with nothing written down there is nothing to check it against</figcaption>
</figure>

"A custom fasting type can't duplicate an existing one" is the same story (`7f0671d`): the condition moved into `CreateCustomFastingTypeUseCase`, with tests; the 2021 message that told you the type was a duplicate didn't come along, and today tapping confirm just closes the sheet.

Two rules, two moves, and the same half fell off both times. It isn't hard to see why. **The condition is something inside the system, so it can be written as a test** — those three tests, plus the three rows about this rule in the repo's test spec, all look inside the system: the return value, whether anything was written, whether the reminders were rescheduled. **The handling is something the actor sees**, and it isn't in any return value. With no text anywhere saying "this is what the user will see", there was nothing to check it against.

Both gaps turned up while these use cases were being reverse-engineered; as of writing, neither has been fixed.

## What a use case is

In Larman's informal definition, a use case is a set of related success and failure scenarios describing actors using a system to reach a goal. Four things are worth remembering:

- **It is text, not a picture.** Larman is blunt about it: *Use cases are text documents, not diagrams*. Cockburn's preface is blunter still — writing use cases is, at bottom, writing prose.
- **It starts from the actor's goal.** Its name is a goal ("Log a meal"), not a screen ("the editor") and not an action ("write to the database").
- **The main success scenario is short; the rest is in the extensions.** Cockburn's writing order is: the main success scenario first, in three to nine steps; then list — **exhaustively** — the conditions the system can detect and must handle; and only then write the handling for each. Nor are extensions the same thing as "exceptions": 1a above is nothing exceptional, it's simply another way through.
- **It treats the system as a black box.** It says what the system **does**, never how: "the system saves the meal", not "the system inserts a row inside a transaction".

The fourth point is where it connects to this series. Black-box use cases, Larman says, describe the system as something that **has responsibilities**. Put another way, a use case lists the responsibilities of the biggest object there is — "the system" — and what design does next is hand those responsibilities down to the objects inside it.

Larman has another, very honest line: *There is nothing object-oriented about use cases*. A use case is not object-oriented in the slightest; it's requirements — the **input** to object-oriented design. That's why the first act of this series is called Analysis: before assigning anything, work out what there is to assign.

## Three things I thought I knew

| I thought a use case was | Actually |
|---|---|
| That diagram of stick figures and ovals | The diagram is a table of contents: it shows which actors and which use cases exist, and not a single "what if". The content is all in the text |
| Another way of writing a user story, or a feature list | The three answer different questions. A feature list answers **what to build** (scope). A user story answers **which piece gets scheduled this time** — in Martin Fowler's words, stories break requirements into *chunks for planning purposes*. A use case answers **how the system has to behave** (behaviour). One story may be a single scenario of a use case, or a few of its steps |
| Done once the main success scenario is written | The main success scenario is the part that least needs writing. Cockburn later wrote a piece called "Why I still use use cases", and one of his reasons is exactly the extension conditions: they give you a framework for chasing down the small, fiddly things that *take up 80% of the development time and budget* |

There's nothing wrong with user stories. Ron Jeffries put it clearly: the card is not the requirement itself, only a token reminding everyone that "this needs a conversation" — it was never meant to spell out the behaviour. The trouble starts when the card is used as if it were a use case: in the same article Cockburn says a stack of stories gives designers no context to work from, and no way to tell whether everything has been thought of.

This site has two ready examples. [[rezero-overview|The first post of the live-commerce series]] lists the rules of that business: `2601+2` orders two items, a repeated comment means the last one wins, and stock still has to be held for someone who hasn't registered yet — the first is the main success scenario, and every one after it is an extension; that post's own verdict is "the feature list isn't hard". [[lottery|The lottery post]] is the other kind: it took running an actual draw to find out that "the order of the list is part of the input". Conditions nobody listed usually get discovered exactly that way.

## Which altitude to write at

The same thing can be written very large ("manage my diet") or very small ("pick a date"). Cockburn sorts goals into three goal levels, with sea level as the metaphor:

| Level | In plain words | In SportRecorder |
|---|---|---|
| summary (cloud, kite) | Takes several sittings, over several days | Building a recording habit (the loop in the README: Capture → Reflect → Insight → Re-engage) |
| **user goal (sea level)** | One person, one sitting, and something of visible value at the end | Log a meal; share a place from Google Maps |
| subfunction (underwater) | Nobody opens the app just to do this | Pick a date; choose a venue; load one meal |

Sea level is the one to write. Larman's test is vivid: the CEO asks what you did today and you answer "I logged in twenty times" — logging in is not a user goal.

There's a trap in the name here. SportRecorder has ten classes whose names end in `UseCase`. That's a layer of Clean Architecture — the same name as the use case this post is about, but not the same thing:

- `LoadEatRecordUseCase` is one line: `repository.findById(id)`. It's underwater.
- The happy path of "Log a meal" runs through `SaveEatRecordUseCase`, and 1a runs through `QuickRecordMealUseCase` — one use case, two classes.
- "Share a place from Google Maps" matches no `UseCase` class at all. The part that strings it together (read the link → match → write) currently lives in [a 789-line ViewModel](https://github.com/Aidan79225/SportRecorder/blob/d294a3bccea01856998b92c3733581993f29f3c7/shared/src/commonMain/kotlin/com/crazystudio/sportrecorder/ui/diet/editor/EatTimeEditorViewModel.kt), and the repo's own to-refactor list says it should be extracted.

The repo's specs do the same: across 38 of them, two sections are titled "Use cases", and both mean this layer of classes.

Of the three questions from the previous post, this one mainly exercises **what is it called**. A use case is the first thing in the whole design that has to be written in the actor's words: it's called "Log a meal" — the button in the notification shade carries those same words — not "create an `EatRecord`". Once the name is settled here, the classes that follow have something to be checked against. One name pointing at two things is what this question looks like when it hasn't been answered. From here on, when this post says use case, it means the text.

## The second use case: one sentence to state, three PRs to follow

"Log a meal" has relatively few extensions. Another feature in the same app acts out this post's title from start to finish: sharing a place into the app from Google Maps.

The Goal at the top of [its spec](https://github.com/Aidan79225/SportRecorder/blob/d294a3bccea01856998b92c3733581993f29f3c7/docs/superpowers/specs/2026-10-10-maps-share-design.md) is a main success scenario all by itself: *in Maps, tap Share → SportRecorder → Save*. As a use case:

**Use case: Share a place from Google Maps**

- **Primary actor**: a user who is in Google Maps and has just found a place to eat
- **Main success scenario**
  1. The user taps Share on a place and picks SportRecorder.
  2. The system opens a new meal: the time is now and the venue is already filled in — its name and position both come from the link.
  3. The user taps CREATE.
  4. The system saves the meal and sends the user back to Google Maps.
- **Minimal guarantee**: whether or not the link can be read, the meal can still be saved.

The minimal guarantee is a field in Cockburn's skeleton: the promise the system keeps even when the actor's goal isn't met. This one didn't need reverse-engineering — the spec has a section titled *Failure — a share never blocks a meal*.

The extensions are in the diagram:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 380" role="img" aria-label="An anatomy of the use case Share a place from Google Maps. On the left is the happy path, four steps from top to bottom: one, the user shares a place in Maps and picks this app; two, the system opens a new meal with the venue filled in; three, the user taps CREATE; four, the system saves and sends the user back to Maps. On the right are the extensions — every other way it can go — seven of them, each matched to something that has a name in the code. Five branch off step two: 2a, the shared text is not a Google Maps link, matched to MapsLink.find, where a host off the allow-list cannot be constructed; 2b, the link cannot be read, for example offline or on a timeout, matched to MapsLinkResolver, which makes one request and gives up after five seconds; 2c, the link carries no position, which is what the phone app produces, matched to MapsPlaceReader, which looks the position up from the address; 2d, a venue with that name is already saved within fifty metres, matched to SharedVenueMatch.Use, which uses it without asking; 2e, a venue with that name is saved but far away, matched to SharedVenueMatch.AskWhichStore, which asks the user which store it is. Two can happen at any step: star a, the user picks a venue themselves while the link is still being read, matched to dropSharedPlace, where the user's choice wins; star b, the system kills the app while a question is open, matched to PlaceRun.Share, so a question that was answered is never asked again." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="ooad2b" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="92" y="22" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">Happy path: 4 steps</text>
    <text x="412" y="22" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">Extensions: every other way it can go</text>
    <rect x="16" y="36" width="152" height="50" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="92" y="56" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">① User</text>
    <text x="92" y="73" fill="#9aa4b2" font-size="9" text-anchor="middle">shares in Maps, picks the app</text>
    <line x1="92" y1="86" x2="92" y2="101" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ooad2b)"/>
    <rect x="16" y="104" width="152" height="50" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="92" y="124" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">② System</text>
    <text x="92" y="141" fill="#9aa4b2" font-size="9" text-anchor="middle">new meal, venue filled in</text>
    <line x1="92" y1="154" x2="92" y2="169" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ooad2b)"/>
    <rect x="16" y="172" width="152" height="50" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="92" y="192" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">③ User</text>
    <text x="92" y="209" fill="#9aa4b2" font-size="9" text-anchor="middle">taps CREATE</text>
    <line x1="92" y1="222" x2="92" y2="237" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ooad2b)"/>
    <rect x="16" y="240" width="152" height="50" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="92" y="260" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">④ System</text>
    <text x="92" y="277" fill="#9aa4b2" font-size="9" text-anchor="middle">saves; back to Maps</text>
    <line x1="168" y1="129" x2="184" y2="129" stroke="#d6a45c" stroke-width="1.2"/>
    <line x1="184" y1="57" x2="184" y2="249" stroke="#d6a45c" stroke-width="1.2"/>
    <line x1="184" y1="57" x2="200" y2="57" stroke="#d6a45c" stroke-width="1.2"/>
    <line x1="184" y1="105" x2="200" y2="105" stroke="#d6a45c" stroke-width="1.2"/>
    <line x1="184" y1="153" x2="200" y2="153" stroke="#d6a45c" stroke-width="1.2"/>
    <line x1="184" y1="201" x2="200" y2="201" stroke="#d6a45c" stroke-width="1.2"/>
    <line x1="184" y1="249" x2="200" y2="249" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="80" y="317" fill="#9aa4b2" font-size="9.5" text-anchor="middle">* can happen</text>
    <text x="80" y="331" fill="#9aa4b2" font-size="9.5" text-anchor="middle">at any step</text>
    <line x1="120" y1="321" x2="184" y2="321" stroke="#d6a45c" stroke-width="1.2" stroke-dasharray="4 3"/>
    <line x1="184" y1="297" x2="184" y2="345" stroke="#d6a45c" stroke-width="1.2" stroke-dasharray="4 3"/>
    <line x1="184" y1="297" x2="200" y2="297" stroke="#d6a45c" stroke-width="1.2" stroke-dasharray="4 3"/>
    <line x1="184" y1="345" x2="200" y2="345" stroke="#d6a45c" stroke-width="1.2" stroke-dasharray="4 3"/>
    <rect x="200" y="36" width="424" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="208" y="43" width="26" height="16" rx="4" fill="#2e2a20" stroke="#d6a45c" stroke-width="1"/>
    <text x="221" y="55" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">2a</text>
    <text x="244" y="54" fill="#e6e6e6" font-size="10.5">The shared text isn't a Google Maps link</text>
    <text x="244" y="70" font-size="9.5"><tspan fill="#4f6df5">→ MapsLink.find()</tspan><tspan fill="#9aa4b2">: a host off the allow-list can't be constructed</tspan></text>
    <rect x="200" y="84" width="424" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="208" y="91" width="26" height="16" rx="4" fill="#2e2a20" stroke="#d6a45c" stroke-width="1"/>
    <text x="221" y="103" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">2b</text>
    <text x="244" y="102" fill="#e6e6e6" font-size="10.5">The link can't be read (offline, timeout)</text>
    <text x="244" y="118" font-size="9.5"><tspan fill="#4f6df5">→ MapsLinkResolver</tspan><tspan fill="#9aa4b2">: one request, gives up after five seconds</tspan></text>
    <rect x="200" y="132" width="424" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="208" y="139" width="26" height="16" rx="4" fill="#2e2a20" stroke="#d6a45c" stroke-width="1"/>
    <text x="221" y="151" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">2c</text>
    <text x="244" y="150" fill="#e6e6e6" font-size="10.5">The link carries no position (made by the phone app)</text>
    <text x="244" y="166" font-size="9.5"><tspan fill="#4f6df5">→ MapsPlaceReader</tspan><tspan fill="#9aa4b2">: looks the position up from the address</tspan></text>
    <rect x="200" y="180" width="424" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="208" y="187" width="26" height="16" rx="4" fill="#2e2a20" stroke="#d6a45c" stroke-width="1"/>
    <text x="221" y="199" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">2d</text>
    <text x="244" y="198" fill="#e6e6e6" font-size="10.5">A venue with that name is saved, within 50 m</text>
    <text x="244" y="214" font-size="9.5"><tspan fill="#4f6df5">→ SharedVenueMatch.Use</tspan><tspan fill="#9aa4b2">: use it, no question asked</tspan></text>
    <rect x="200" y="228" width="424" height="42" rx="7" fill="#1f2330" stroke="#e05a7d" stroke-width="1.4"/>
    <rect x="208" y="235" width="26" height="16" rx="4" fill="#2e2a20" stroke="#d6a45c" stroke-width="1"/>
    <text x="221" y="247" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">2e</text>
    <text x="244" y="246" fill="#e6e6e6" font-size="10.5">A venue with that name is saved, but far away</text>
    <text x="244" y="262" font-size="9.5"><tspan fill="#4f6df5">→ SharedVenueMatch.AskWhichStore</tspan><tspan fill="#9aa4b2">: ask the user which store</tspan></text>
    <rect x="200" y="276" width="424" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="208" y="283" width="26" height="16" rx="4" fill="#2e2a20" stroke="#d6a45c" stroke-width="1"/>
    <text x="221" y="295" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">*a</text>
    <text x="244" y="294" fill="#e6e6e6" font-size="10.5">Mid-read, the user picks a venue themselves</text>
    <text x="244" y="310" font-size="9.5"><tspan fill="#4f6df5">→ dropSharedPlace()</tspan><tspan fill="#9aa4b2">: the user's choice wins</tspan></text>
    <rect x="200" y="324" width="424" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="208" y="331" width="26" height="16" rx="4" fill="#2e2a20" stroke="#d6a45c" stroke-width="1"/>
    <text x="221" y="343" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">*b</text>
    <text x="244" y="342" fill="#e6e6e6" font-size="10.5">Mid-question, the system kills the app</text>
    <text x="244" y="358" font-size="9.5"><tspan fill="#4f6df5">→ PlaceRun.Share</tspan><tspan fill="#9aa4b2">: once answered, never asked again</tspan></text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Four steps on the left — the spec says them in one sentence. Every line on the right later got a name in the code: a type, an interface, or a function. 2e is the one "Who Owns This?" rules on below</figcaption>
</figure>

The happy path plus a few of those extensions was the first PR. Then came two more:

- **[#88](https://github.com/Aidan79225/SportRecorder/pull/88)** (merged 2026-10-18, 15 commits): the happy path, plus 2a, 2b, 2d, \*a and \*b.
- **[#90](https://github.com/Aidan79225/SportRecorder/pull/90)** (merged 2026-10-18, 19 commits): 2e — chain stores share a name without being the same store. The same PR also added editing and deleting venues, and pasting a link.
- **[#91](https://github.com/Aidan79225/SportRecorder/pull/91)** (merged 2026-10-28, 44 commits): 2c — the link carries no position.

The third is the one most worth telling, because it isn't a "what if" at all — **the happy path's own assumption was wrong**. Step 2 says "its name and position both come from the link", and that sentence had been checked against a real link — one made on the Google Maps **website**. Links shared from the phone app look different: there's no position in them, and the name comes glued to the address in one string. The spec's later addendum records the bug report (in Chinese): "pasting a link doesn't fill the name and address into the fields correctly".

Cockburn's skeleton has a field reserved for exactly this, Technology and Data Variations: the thing to be done is the same, but the data can arrive in more than one shape. Nobody listed "who made the link" at the time; the PR that added it has 44 commits.

## Specs are filed by date, use cases by goal

It's not that SportRecorder has no requirements documents. There are 38 specs under `docs/superpowers/specs/`; the twenty written since 2026-06-20 all end with a "North-Star check", and the ones about sharing also have Goal, Decisions taken with the owner, and Out of scope. Set them beside a use case and each side has something the other lacks.

**What a spec has and a use case doesn't:**

- **Who decided.** "Decisions taken with the owner" records the choice at every fork as a table. A use case only says how the system behaves, not who signed off on that behaviour.
- **A check back against the original intent.** The last section holds the change up against the lines in the README (recording should be fast and easy; record, never judge); the most recent few also list how this change might drift away from it. Cockburn's skeleton has a Stakeholders and Interests field that does something similar; this goes a step further.

**What a use case has and a spec doesn't:**

- **Filed by goal.** A spec is one document per change, filed by date. How "share a place" behaves today is spread over the specs of 10 October and 18 October plus an addendum, and later ones overwrite earlier ones — the second says outright that it replaces the first one's whole matching section. To know how the system behaves **now**, you have to read them in date order and apply the overwrites yourself. A use case is one document per goal, and it describes the present.
- **One fixed place for the "what ifs".** Of the 38 specs, only 3 have a section devoted to failure. The other "what ifs" are scattered through risks, test tables and code comments — or, like the other half of 3a, are nowhere.
- **Written from the actor's side.** A spec is a design document; it writes down what to do and how to do it together (which class, which interface). Nothing wrong with that, except that "what the user will see" is easily buried under "returns a Boolean".

The closest thing to a use case in this repo is a test spec: it's grouped by flow, and every row is marked Happy path, Failure or Boundary. But what it checks is the inside of the system — the row for 3a reads "`save` returns false, list unchanged".

The two kinds of document don't compete. A spec records **why it was changed this way, this time**; a use case records **what the system is like once the change is in**. This repo has the former and lacks the latter.

## Who Owns This?

At the use-case level, the candidates for "who owns this?" aren't classes — they're **the system and the actor**.

**The thing**: a "McDonald's" is shared in, the user already has one saved under the same name, but the two positions are more than a kilometre apart. Are they the same store — and who gets to say?

| Candidate | What it does | What happens |
|---|---|---|
| The system, by name | Same name means same store; move it to the position Maps gives | Two branches get merged into one; the position on old records changes with it |
| The system, by distance | Far away means another store; create a second one automatically | A store that was merely mis-placed at first becomes two, and its records are split between them |
| The system, by whether there's history | Move it straight away if no record uses it; ask "move it?" only if some do | The wrong question: with a chain, the user doesn't want to move a store, they want one more |
| The user | The system selects the nearest one, then asks once: It's another branch / Same place — update its position / Same place — keep its position | One more question on the way to logging a meal — which is why nothing is asked within 50 m |

The third row isn't hypothetical. It was the rule in the spec of 10 October, became code on 17 October as a type called `AskToMove` — and was replaced the next day.

**The ruling: the user.** The reason is in [the spec that replaced it](https://github.com/Aidan79225/SportRecorder/blob/d294a3bccea01856998b92c3733581993f29f3c7/docs/superpowers/specs/2026-10-18-venue-branches-design.md): neither a name nor a distance can tell a different branch from the same store with its old position wrong, *so the user has to be asked — once, in words they can answer*. The comment in the code is shorter: *only the user knows*.

**The evidence** is threefold: the type went from `AskToMove` to `AskWhichStore`; the question went from yes-or-no to a choice of three; and dismissing the dialog means "Same place — keep its position" — nothing is created, nothing is moved.

Only after that ruling does the half left in the system's hands get divided among objects: within 50 m counts as the same place, a venue that has no position yet gets the position first — all of that now lives in [a pure function](https://github.com/Aidan79225/SportRecorder/blob/d294a3bccea01856998b92c3733581993f29f3c7/shared/src/commonMain/kotlin/com/crazystudio/sportrecorder/domain/venue/SharedVenue.kt#L59-L92), `SharedVenue.match()`. That's the next act's business.

## When Not to Use It

A use case isn't free — Cockburn himself says they're heavier than user stories, and harder to write. Three situations where it isn't worth it:

1. **The extensions can be counted on one hand, and they all live in one person's head.** That was SportRecorder in 2021: not a single document in the whole repo, and 61 of its 63 commits have messages that are nothing but file names. Back then the only extension of "Log a meal" visible in the code was 3a — and both its condition and its handling were there.
2. **Things no actor is interacting with.** `DietWindow.compute()` is pure computation, and data pipelines belong here too. Larman's examples are middleware, databases and other back-end systems: they're better thought of in terms of features ("We need XML support in the next release"). What's hard about them isn't "who did what to the system".
3. **CRUD screens, where the happy path is all there is.** List, create, edit, delete — writing each one as a full use case is just copying field names. Cockburn's book has a separate chapter for that case.

There's one more cost: a document filed by goal goes stale. The two reverse-engineered here match `master` as of 2026-11-17; the next PR that lands means someone has to go back and change them. A spec can be left alone once it's written. A use case can't.

## Reflections

### In 2021, the analysis stayed in the code

The 2021 repo has no requirements documents and no use cases — that year's "analysis" survives only in the code. So all this post can quote from back then is that one extension and its message.

I taught myself UML on the job, and drew it to explain designs; I still draw diagrams today, to explain pipelines. For explaining, a diagram is a good tool. But the most valuable part of a use case — every "what if" and its handling — has nowhere to go on a use case diagram.

### When the spec is for AI, the happy path is the last thing to write

How 3a's message got lost is worth one more look. The spec of 11 June 2026 gave this rule exactly one line: reject a record whose time is in the future, and return success or failure. The implementation the next day did everything that line says, and the tests covered it — not a word more. The message had already gone the day before; the line didn't mention it, so nobody put it back.

In [[ai-spec-craft|the spec-as-code post]] I wrote that whatever requirement you don't write down, the AI fills in with something "reasonable on average". This time it didn't even fill in — the half that wasn't written down simply wasn't there.

So when you hand requirements to AI, the happy path is the part that least needs writing; it can guess that. What needs writing is the extensions, and both halves of each: the condition, and **what the actor will see**. That second half can't be written into a return value or into a unit test — only into a sentence a person can read.

Rules about layering and naming can stop "logic in the wrong place". They can't stop "half of it missing". For that you need a piece of text written from the actor's side, so that at sign-off there is something to check against.

Back to the spine of this series — good object design gives the next change one obvious place to go. What a use case supplies is the precondition for that: a list of the things that need a home. What's on the happy path usually has one already; the things still without a home are all in the extensions.

One verdict to close on: **the happy path tells you what the system does; the extensions tell you what somebody has to own.**
