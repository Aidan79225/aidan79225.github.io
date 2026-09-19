---
title: "The Responsibility Funnel: AI Can Do Nine Tenths — Why the Last Tenth Is You"
date: 2026-08-11
category: tech
description: "If AI can do this much, what's left for you? My answer is a shape: a funnel. Volume can be handed off, responsibility can't — give it to a person and it splits, give it to AI and it reflects straight back at you. The neck can be widened, but it can't be removed; and the person standing in it is always a person."
tags:
  - ai
  - leadership
series: "The Craft of Working with AI (2026)"
seriesOrder: 1
translationOf: responsibility-funnel
---
## Preface

After [[gitcrisp|GitCrisp]] and [[blog-as-a-product|the blog as a production line]], the most natural next question from a reader is: if AI can do this much, what's left for you?

My answer is a shape: a **funnel**. Most of the *volume* of the work really can go to AI — code, tests, docs, first drafts, research; the ring at the top keeps getting wider. But some things don't fall through. They get pushed down into a neck that keeps getting narrower — and the one standing in the neck is always a person. This post is about that shape: why it's a funnel, what's inside the neck, and what the person in it (including the junior who isn't there yet) should do.

## Conservation of responsibility: to a person it splits, to AI it reflects

First, the physical law underneath the funnel. There are two completely different ways to hand work off:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 250" role="img" aria-label="Two kinds of delegation and where responsibility goes. Delegating to a person: the work goes down and part of the responsibility comes back to them, so saying that part was theirs holds. Delegating to AI: the work goes down but the responsibility reflects entirely back to me, so saying the AI wrote it does not hold." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="165" y="30" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">To a person: responsibility splits</text>
    <rect x="115" y="45" width="100" height="42" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="165" y="70" fill="#e6e6e6" font-size="12" text-anchor="middle">Me</text>
    <rect x="115" y="150" width="100" height="42" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="165" y="175" fill="#e6e6e6" font-size="12" text-anchor="middle">Colleague</text>
    <line x1="150" y1="87" x2="150" y2="150" stroke="#9aa4b2" stroke-width="1.5"/>
    <line x1="180" y1="150" x2="180" y2="87" stroke="#54b890" stroke-width="1.5" stroke-dasharray="5 3"/>
    <text x="95" y="122" fill="#9aa4b2" font-size="10" text-anchor="end">work ↓</text>
    <text x="238" y="122" fill="#54b890" font-size="10" text-anchor="start">part of it ↑</text>
    <text x="165" y="222" fill="#9aa4b2" font-size="10" text-anchor="middle">"that part is theirs" — holds</text>
    <line x1="320" y1="40" x2="320" y2="210" stroke="#3a4154" stroke-width="1"/>
    <text x="475" y="30" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">To AI: responsibility reflects back</text>
    <rect x="425" y="45" width="100" height="42" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="475" y="70" fill="#e6e6e6" font-size="12" text-anchor="middle">Me</text>
    <rect x="425" y="150" width="100" height="42" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="475" y="175" fill="#e6e6e6" font-size="12" text-anchor="middle">AI</text>
    <line x1="460" y1="87" x2="460" y2="150" stroke="#9aa4b2" stroke-width="1.5"/>
    <path d="M 490 150 C 520 120 520 100 490 87" fill="none" stroke="#e05a7d" stroke-width="1.8"/>
    <text x="405" y="122" fill="#9aa4b2" font-size="10" text-anchor="end">work ↓</text>
    <text x="548" y="122" fill="#e05a7d" font-size="10" text-anchor="start">100% back ↑</text>
    <text x="475" y="222" fill="#9aa4b2" font-size="10" text-anchor="middle">"the AI wrote it" — doesn't hold</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Conservation of responsibility: output can be multiplied, responsibility isn't diluted — it converges on whoever ships.</figcaption>
</figure>

Hand something to a **person** and part of the responsibility transfers with it. That isn't buck-passing, it's the basis of how organisations work: when something breaks, "that piece was theirs" holds, and it should hold — otherwise delegation is a word with nothing behind it.

Hand something to **AI** and the work leaves, but not one gram of the responsibility does. No incident review has ever accepted "the AI wrote it" as a conclusion. I wrote about a real overselling incident in [[rezero-inventory|the live-commerce series]] — afterwards nobody asked who wrote that code, only who let it ship. There was no AI writing code back then, and the question needs no editing today. **Output can be multiplied tenfold; responsibility doesn't become a tenth. It's conserved, and all of it converges on the person who signed.**

This is the one place where "working with AI is like leading a team" (the conclusion of [[gitcrisp|the GitCrisp post]]) stops being true: the methods are the same — write the spec, draw the boundary, review — but leading people ends with handing the responsibility over too, and leading AI always ends with you keeping all of it.

## The funnel: volume falls, responsibility density rises

Put conservation of responsibility into a daily workflow and you get the shape of a funnel:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 330" role="img" aria-label="The responsibility funnel. The widest band at the top is AI output: code, tests, docs, drafts. Below it a guardrail layer of tests, specs and automated checks. Below that human review and spot checks. The narrowest neck is decision and signature — one person's name. Down the right, volume shrinks; up the left, responsibility density rises. The neck width equals your acceptance bandwidth and is the throughput ceiling of the whole line." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <polygon points="60,20 560,20 515,80 105,80" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="310" y="45" fill="#4f6df5" font-size="12" text-anchor="middle" font-weight="bold">AI output</text>
    <text x="310" y="65" fill="#9aa4b2" font-size="10" text-anchor="middle">code · tests · docs · drafts · research — plentiful and cheap</text>
    <polygon points="105,80 515,80 470,140 150,140" fill="#262b3a" stroke="#3a4154"/>
    <text x="310" y="105" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">Guardrails</text>
    <text x="310" y="125" fill="#9aa4b2" font-size="10" text-anchor="middle">tests · specs · automated checks — machines check first</text>
    <polygon points="150,140 470,140 425,200 195,200" fill="#262b3a" stroke="#3a4154"/>
    <text x="310" y="165" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">Human review and spot checks</text>
    <text x="310" y="185" fill="#9aa4b2" font-size="10" text-anchor="middle">right direction · clean boundaries · does it smell</text>
    <polygon points="195,200 425,200 350,262 270,262" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="310" y="228" fill="#54b890" font-size="12" text-anchor="middle" font-weight="bold">Decision and signature</text>
    <text x="310" y="248" fill="#e6e6e6" font-size="10" text-anchor="middle">one person's name</text>
    <line x1="580" y1="30" x2="580" y2="250" stroke="#9aa4b2" stroke-width="1.2"/>
    <polygon points="580,258 575,246 585,246" fill="#9aa4b2"/>
    <text x="596" y="90" fill="#9aa4b2" font-size="10" text-anchor="start" transform="rotate(90 596 90)">volume shrinks</text>
    <line x1="40" y1="250" x2="40" y2="30" stroke="#e05a7d" stroke-width="1.2"/>
    <polygon points="40,22 35,34 45,34" fill="#e05a7d"/>
    <text x="26" y="240" fill="#e05a7d" font-size="10" text-anchor="start" transform="rotate(-90 26 240)">responsibility density rises</text>
    <text x="310" y="295" fill="#d6a45c" font-size="11" text-anchor="middle" font-weight="bold">neck width = the bandwidth you can responsibly accept = the line's throughput ceiling</text>
    <text x="310" y="315" fill="#9aa4b2" font-size="10" text-anchor="middle">however fast AI gets, everything squeezes through here to ship — Amdahl's law for AI productivity</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Each layer down: fewer things, but each one carries more responsibility. The neck isn't a station in the process — it's where responsibility converges.</figcaption>
</figure>

There's an engineering corollary in that picture worth stating on its own: **the throughput ceiling of the whole line isn't AI's rate of output, it's the width of the neck**. AI can produce twenty PRs a day; if you can responsibly accept three, the line runs at three — the rest either queue, or flow out without having actually been checked (more on how dangerous that is below). No amount of parallelism compresses the conserved part. That's Amdahl's law, except this time the non-parallelisable part is called responsibility.

So "what is your value now that you use AI" has a concrete answer: **your value equals your neck width** — you're worth as much as you can responsibly accept.

## The neck can be widened, but not removed

GitCrisp's thirteen thousand lines of tests, the architectural rules in its `CLAUDE.md`, [[blog-as-a-product|the blog line's]] avoid-word scan and pre-commit hook — the nature of those guardrails can now be stated precisely: they are all **tools for widening the neck**. Turn a check that used to need human eyes every time into something a machine runs, and human acceptance bandwidth is freed for what machines can't check: direction, trade-offs, taste.

But two honest boundaries.

**First, the recursion still bottoms out at a person.** The tests were written by AI too — so who accepts the tests? The spec was organised with AI's help — who accepts the spec? The recursion has no end, only a stop-loss: humans spot-check the guardrails themselves. I review a test PR harder than a feature PR, because a broken guardrail fails silently — it doesn't raise an error, it just stops catching things from then on.

**Second, a rubber stamp is a fake neck.** Aviation learned this decades ago: the better the automation, the easier it is for the human to become incapable — autopilot so reliable that the pilot's hand-flying and vigilance decay together, and when a human really is needed, they can't take it. The code-review version: nine times out of ten the AI's code is right, and by the tenth you've stopped looking. The neck is still drawn on the diagram, but it no longer exists — everything goes straight out the door while the responsibility stays with you. **A neck isn't created by drawing it; it's maintained by actually looking, and actually blocking things.** That's why I read every one of GitCrisp's hundred-plus PRs: not only for that PR, but to keep "I'm looking" true.

## Reflection: what about juniors

The cruellest corollary of this model lands on juniors. The old growth path started at the wide end of the funnel: write a lot of code, write it badly, get taught by production, and a few years later judgment has grown and you move towards the neck. Now the wide end belongs to AI — and **the raw material of acceptance ability is the experience of producing, which AI took**. The bottom rungs of the ladder are gone.

My current answer is three things, written for people who can't stand in the neck yet:

**One: the raw material of judgment is a library of failures, not a typing count.** You can smell bad code because you've seen enough bad code — your own, dug out of incidents, caught in review. Typing was the old era's *carrier* for accumulating that library, not the thing itself. So the new practice is to swap "write → break → learn" for a much higher-frequency **"predict → verify" loop**: before you look at the AI's diff, guess how it will write it and where it will go wrong, then open it and check your answer. Every wrong guess goes into the library. AI makes this practice unbelievably cheap — you can have it explain every decision, generate three alternative implementations to compare. It took the old training ground and opened a new one; the difference is that the old one trained you passively (no code written, no project), and you have to walk into the new one on purpose — accept everything without asking and you train nothing.

**Two: neck width = speed of acceptance × calibration.** Fast alone is worthless: accepting quickly while overconfident is a fake neck — everything flowed through, but nothing was really checked. Real neck width includes knowing **where you don't understand**, and for those parts slowing down, adding a guardrail, or honestly saying "I can't sign this one yet". Misplaced confidence is far more dangerous than being slow — and calibration, as it happens, also grows out of the library of failures.

**Three: be the neck of a small funnel before you're the neck of a big one.** "The scope you can be responsible for" isn't only a cognitive question, it's a trust question — the scope you can own is the scope other people dare to let you own, and that gets built from a record of signatures. Rather than owning one wide layer inside a big system (a layer AI keeps taking over anyway), find a small complete funnel and walk the whole thing — spec, acceptance, and carrying the blame when it breaks: a side project, a small tool, a small service. That's also how I look back at [[travel-split|the travel-split tool]] and GitCrisp now: they aren't just pieces of work, they're where I practise *being the neck*. In the age of AI a side project stopped being a bonus and became the real thing — because it's the one funnel where you stand in the neck from day one.

To end on one sentence: what AI changed is how wide the top of the funnel is, not how narrow the bottom is. **Output inflates, responsibility doesn't** — and your career is that neck, slowly getting wider.
