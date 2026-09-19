---
title: "Leadership — MOI"
date: 2025-11-30
category: tech
description: "The MOI model describes the environment a leader shapes along three dimensions: motivation, organization, innovation. This post takes the three apart and lines them up against how a tech leader actually solves problems."
tags:
  - leadership
comments: true
series: "Becoming a Tech Leader — Reading Notes"
seriesOrder: 2
translationOf: btl-2
---
## Models of leading
A model of leading is a handful of dimensions used to describe an environment. The MOI model is one of them.


### MOI
The MOI model has three dimensions: Motivation, Organization, Innovation. Each one is a way the leader shapes the environment.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 210" role="img" aria-label="The MOI model: a leader shapes the team environment through three dimensions — motivation, organization and innovation — and the three together are that environment." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="moi1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="220" y="12" width="120" height="34" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="280" y="34" fill="#e6e6e6" font-size="12" text-anchor="middle">Leader</text>
    <line x1="252" y1="46" x2="105" y2="80" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#moi1)"/>
    <line x1="280" y1="46" x2="280" y2="80" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#moi1)"/>
    <line x1="308" y1="46" x2="455" y2="80" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#moi1)"/>
    <rect x="24" y="82" width="152" height="72" rx="9" fill="#262b3a" stroke="#d4af37" stroke-width="1.5"/><text x="100" y="110" fill="#e6e6e6" font-size="12.5" text-anchor="middle">M · Motivation</text><text x="100" y="132" fill="#9aa4b2" font-size="10" text-anchor="middle">people want to move</text>
    <rect x="204" y="82" width="152" height="72" rx="9" fill="#262b3a" stroke="#d4af37" stroke-width="1.5"/><text x="280" y="110" fill="#e6e6e6" font-size="12.5" text-anchor="middle">O · Organization</text><text x="280" y="132" fill="#9aa4b2" font-size="10" text-anchor="middle">orderly, predictable</text>
    <rect x="384" y="82" width="152" height="72" rx="9" fill="#262b3a" stroke="#d4af37" stroke-width="1.5"/><text x="460" y="110" fill="#e6e6e6" font-size="12.5" text-anchor="middle">I · Innovation</text><text x="460" y="132" fill="#9aa4b2" font-size="10" text-anchor="middle">safe to differ</text>
    <rect x="24" y="174" width="512" height="28" rx="8" fill="none" stroke="#3a4154" stroke-width="1.4" stroke-dasharray="5 4"/><text x="280" y="192" fill="#9aa4b2" font-size="11" text-anchor="middle">the three together = the environment the leader shapes</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">MOI: a leader doesn't control people directly — they pull these three levers to shape the environment: willing to move, orderly, unafraid to say something different</figcaption>
</figure>
1. Motivation — motivating behaviour, which includes both reward and punishment.
Common forms:
- Clear recognition and reward
- Opportunities to grow
- Transparent consequences and scope of responsibility
Put simply: make people want to move, and let them see that effort has both a direction and a payoff.

2. Organization — letting people work efficiently and in order. Usually:
- Setting rules
- Designing process
- Allocating resources
- Defining roles
Good organization isn't more constraint; it's making things predictable, standardised, and clear about how people work together.

3. Innovation — an environment that feeds imagination, encourages experiments, and tolerates different points of view.
A team with innovation in it usually looks like this:
- People enjoy discussing
- Everyone can put an idea forward
- The loudest voice doesn't win; the best idea does
- People dare to try, and failure is allowed
Innovation isn't "the genius shines". It's "the environment lets you say the thing you just thought of".

## How a tech leader solves problems
A good tech leader keeps three core tasks in balance:
1. Problem understanding
2. Management thinking
3. Quality assurance

What each one looks like in practice:
1. Problem understanding — a technical leader's first job isn't writing code, it's making sure the team genuinely understands what the problem is.
    Common methods:
  - Read the spec carefully: don't assume, don't imagine; the document and the requirement are the ground truth.
  - Get the members to read the spec too: fewer errors from second-hand retelling.
  - When people disagree, go back to the original problem: it keeps the argument from drifting off the core.
  - Re-read the requirement after making progress: your understanding has deepened, and a second reading usually surfaces detail you missed.
  - Verify in reverse: ask yourself "if the requirement can't be met this way, what would the reason be?"
  - Break the problem down: turn a vague requirement into specific sub-problems.
  Understanding the problem isn't done once. It's something you repeat through the whole project.

2. Management thinking — a tech leader isn't a PM, but has to think from a management angle.
That includes:
- Contribute sensible ideas
- Encourage borrowing ideas that work
- Improve on the ideas other people bring
- Listen patiently while a member explains their thinking
- When criticising an idea, be specific — about the idea, not the person
- Try it yourself before offering it as an idea
- When time and people are short, stop hunting for new ideas
- Set priorities: not everything matters equally
- Allocate work sensibly: the right person in the right place
- Keep the team's information in sync: fewer misunderstandings, less rework
- Help members break tasks down and confirm they're feasible
- Keep a transparent record of decisions (why this decision, what the context was)
- Shield the team from outside interruption (communicate the bottleneck clearly, block unnecessary queue-jumping)
- The essence of management thinking is: let the team stay focused on producing.

3. Quality assurance — a tech leader has to make sure what ships meets the standard the team and the product need.
That includes:
- Measure quality while the project is running
- Think about how quality will be monitored as early as the survey stage
- Track the pace of implementation and stay able to switch approach at any point
- Look at the project from the outside; change your vantage point and refresh your view
- Verify together with the customer
- If the project went the wrong way, find a way to rebuild morale
- Set up a code review process
- Define coding style, architectural principles, API conventions
- Help put automated tests and CI/CD in place
- Help investigate problems and chase the root cause
- Make a healthy trade-off between quality and speed
Quality isn't patched on at the end. It's prevented, starting from architecture, process and habit.

## Reflection
  - My team is in the middle of turning a POC into a product, so everyone is heads-down on implementation. I haven't built any real motivation — at least there's organization for the project to follow. More discussion inside the team would probably lift innovation, and rather than telling everyone "anyone can share something technical", I should just go first and share one myself.
  - I don't have good MOI in my own life either: I reward myself for nothing, and do whatever I feel like. Maybe some rules would help — a reward only after something hard is done. Finish today's running session and I can eat whatever I want; skip it and it's the healthy meal.
  - I've already tried one approach — prefetching while avoiding `str` scattered everywhere. I'll write it up and share it with the team.
