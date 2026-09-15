---
title: "When Residents Suspect the Lottery Code Is Rigged"
date: 2025-09-20
updated: 2026-09-15
category: tech
translationOf: lottery
---
## Preface
A while back I built a small parking-space lottery page for the apartment complex I live in. The other members of the management committee worried that residents wouldn't trust the program — that it might be rigged — so I went and worked out how to prove the draw isn't.

## What "rigged" means
- The complicated version: the draw can be steered by one party to land on particular people.
- The plain version: I make sure I win the ones I want, and never get picked for the ones I don't.

## What rigging requires
To rig a draw, at least one of these has to hold:
1. The draw procedure isn't spelled out
2. The outcome can be controlled

To prove a draw isn't rigged, both have to fail:
1. The code is public → the procedure is spelled out
2. The draw is reproducible → the outcome can be verified

So the program has to be built around one thing: **a reproducible random algorithm**.

## Reproducible randomness

The usual `Math.random()` produces random numbers, but the result can't be reproduced and there's no way to check whether it was tampered with. So we use a seeded algorithm instead — a linear congruential generator (LCG) paired with a Fisher–Yates shuffle.
Seed: the starting value of the sequence; the same seed always gives the same result.
Public algorithm: anyone can read the code and confirm there's no favouritism.
Verifiable outcome: publish the seed after the draw and anyone can recompute it.

### LCG (Linear Congruential Generator)

#### How it works
An LCG is a pseudo-random number generator whose sequence is defined by:

$$
X_{n+1} = (a \times X_n + c) \mod m
$$

Where:
- $$ X $$ = the generated number
- $$ a,c,m $$ = constant parameters
- seed = the initial value $$X_{0}$$
Fix the seed and the parameters, and the sequence comes out identical every time.

Characteristics
- Upside: simple, fast, reproducible.
- Downside: limited randomness (short period), and with badly chosen parameters you get visible patterns.
- Use: good where you need "transparent and verifiable" (a lottery), bad where you need security (cryptography).

Example (JavaScript)
```javascript
function lcg(seed) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280; // a=9301, c=49297, m=233280
    return s / 233280; // map into 0~1
  }
}

// usage
let randomFunc = lcg(12345);
console.log(randomFunc());
console.log(randomFunc());
console.log(randomFunc());
```
### Fisher–Yates Shuffle

#### How it works
Fisher–Yates shuffles an array uniformly at random — every permutation is equally likely.

Steps:
1. Start from the last element, pick a random position, swap the two.
2. Move one element forward and repeat until every element has been handled.

#### Characteristics
- Upside: good randomness, every permutation equally likely.
- Downside: needs a random number generator underneath (an LCG, say).

Use: lotteries, random ordering, shuffling in games.


Example (JavaScript)

```javascript
function shuffleArray(array, seed) {
  const result = array.slice(); // copy the array

  // use an LCG as the random number generator
  let randomFunc = lcg(seed);

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomFunc() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// usage
console.log(shuffleArray([1, 2, 3, 4, 5], 12345));
```

## From LCG to Mulberry32

The LCG above is simple and reproducible, but putting it to work in an actual parking lottery surfaced a few weaknesses:

1. **Fake independence (the worst one)**: we need to shuffle several lists separately — general households, priority households, general spaces, priority spaces, winners. The original approach used `seed + a small offset` (`seed + 46`, `seed + 87`) as each list's seed, but an LCG has a well-known property: **nearby seeds produce highly correlated sequences**. So those "independent" shuffles were statistically entangled with each other.
2. **The first draw is predictable**: when the seed field is left blank the program uses `Date.now()`, and an LCG's output is a pure function of its seed — knowing roughly when the draw happened is enough to predict the first batch of results.
3. **Poor low bits**: with a power-of-two modulus (our version used mod 2³²), the lowest bits have extremely short periods (bit k repeats every 2^k) and the regularity shows.

So we swapped the engine for **Mulberry32** — noticeably better statistical quality, still reproducible — and split the streams by **hashing the seed together with a meaningful label**, which kills the fake-independence problem outright:

```javascript
// string hash: stir "seed:label" into a 32-bit seed
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^= h >>> 16) >>> 0;
}

// Mulberry32: a seeded PRNG with good statistical quality, returns a float in 0~1
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// seed + label produces one independent stream
function makeRng(seed, label) {
  return mulberry32(xmur3(`${seed}:${label}`));
}

// the new shuffle takes an rng function (replacing the seed-integer version above);
// different lists use different labels and stay independent of each other
function shuffleArray(array, rng) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// usage: one independent stream per list
shuffleArray(households, makeRng(seed, 'households'));
shuffleArray(parkings, makeRng(seed, 'parkings'));
```

The point is this: **swapping the engine changes nothing about reproducibility** — same seed, same code, and anyone who reruns it gets exactly the same result, so the argument against rigging still holds. All we did was improve the quality of the randomness and make the shuffles genuinely independent.

## Where the seed comes from

To rule out "the organiser draws over and over until they like the result", the seed has to be chosen in a way that is transparent and outside any one party's control. The usual options:

1. A timestamp from the draw → the millisecond value at the moment the button is pressed
2. A date and time announced in advance → say, "the timestamp string for 20:15 on the day"
3. Public external data → the hash of the latest blockchain block, lottery numbers
4. Numbers contributed by several parties → a resident representative and a committee member each supply part of it

All of these keep one party from steering the outcome.

## The order of the list is part of the input

It took running an actual draw to notice a detail that's easy to miss: **the shuffle follows the order the list was pasted in**, so the same names in a different order produce a different result. Which means "seed + code" isn't enough to reproduce the outcome — **the order of the list is an input too**.

My first instinct was that this was a weak spot to fix: sort the list inside the program so that identical names always give an identical result. Then I realised it shouldn't be fixed. Our list order *is* the **order people signed up on paper** — written down before the draw, backed by a physical document, and beyond anyone's reach to change afterwards. Sorting it away in code would swap an input with paper evidence behind it for an invisible rule, and every historical result would stop matching its old seed.

So the order stays — but it has to be preserved as a first-class input. Every original list in the exported spreadsheet now carries a registration number:

| Registration no. | Household |
|---|---|
| 1 | 51-11F |
| 2 | 53-07F |
| 3 | 61-09F |

It looks fussy. Without it, the only thing holding the order is which row a name happens to sit on — a committee member opens the file, clicks a column sort out of habit, saves, and the order is gone. Nobody can reproduce the draw after that, and nothing on screen says anything broke.

## What about the people who didn't win: the waitlist

The first version only printed a list of households that missed out, sorted by unit number. A committee will naturally reach for that list as the backfill order — which means **the lowest unit number is permanently first in line**, exactly the thing a lottery exists to avoid.

But a fair waitlist order had already been drawn; we were throwing it away. The draw shuffles every household into one **complete permutation** and then takes the first N (N = number of spaces). **The tail isn't waste — it's the waitlist.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 382 146" role="img" aria-label="All households shuffled into a single permutation: the first nine win a space, and the remaining four form the waitlist in that order" style="width:100%;max-width:460px;height:auto;margin:0 auto;">
    <text x="10" y="12" fill="#9aa4b2" font-size="10">One shuffle of all households (Fisher–Yates, decided by the seed)</text>
    <text x="10" y="32" fill="#4f6df5" font-size="11">Top 9 — winners</text>
    <text x="266" y="32" fill="#9aa4b2" font-size="11">Last 4 — waitlist</text>
    <line x1="10" y1="40" x2="260" y2="40" stroke="#4f6df5" stroke-width="2"/>
    <line x1="266" y1="40" x2="376" y2="40" stroke="#9aa4b2" stroke-width="2" stroke-dasharray="4 3"/>
    <g font-size="12" text-anchor="middle">
      <rect x="10" y="50" width="26" height="30" rx="4" fill="#262b3a" stroke="#4f6df5"/><text x="23" y="70" fill="#e6e6e6">1</text>
      <rect x="38" y="50" width="26" height="30" rx="4" fill="#262b3a" stroke="#4f6df5"/><text x="51" y="70" fill="#e6e6e6">2</text>
      <rect x="66" y="50" width="26" height="30" rx="4" fill="#262b3a" stroke="#4f6df5"/><text x="79" y="70" fill="#e6e6e6">3</text>
      <rect x="94" y="50" width="26" height="30" rx="4" fill="#262b3a" stroke="#4f6df5"/><text x="107" y="70" fill="#e6e6e6">4</text>
      <rect x="122" y="50" width="26" height="30" rx="4" fill="#262b3a" stroke="#4f6df5"/><text x="135" y="70" fill="#e6e6e6">5</text>
      <rect x="150" y="50" width="26" height="30" rx="4" fill="#262b3a" stroke="#4f6df5"/><text x="163" y="70" fill="#e6e6e6">6</text>
      <rect x="178" y="50" width="26" height="30" rx="4" fill="#262b3a" stroke="#4f6df5"/><text x="191" y="70" fill="#e6e6e6">7</text>
      <rect x="206" y="50" width="26" height="30" rx="4" fill="#262b3a" stroke="#4f6df5"/><text x="219" y="70" fill="#e6e6e6">8</text>
      <rect x="234" y="50" width="26" height="30" rx="4" fill="#262b3a" stroke="#4f6df5"/><text x="247" y="70" fill="#e6e6e6">9</text>
      <rect x="266" y="50" width="26" height="30" rx="4" fill="none" stroke="#9aa4b2" stroke-dasharray="4 3"/><text x="279" y="70" fill="#9aa4b2">10</text>
      <rect x="294" y="50" width="26" height="30" rx="4" fill="none" stroke="#9aa4b2" stroke-dasharray="4 3"/><text x="307" y="70" fill="#9aa4b2">11</text>
      <rect x="322" y="50" width="26" height="30" rx="4" fill="none" stroke="#9aa4b2" stroke-dasharray="4 3"/><text x="335" y="70" fill="#9aa4b2">12</text>
      <rect x="350" y="50" width="26" height="30" rx="4" fill="none" stroke="#9aa4b2" stroke-dasharray="4 3"/><text x="363" y="70" fill="#9aa4b2">13</text>
    </g>
    <text x="10" y="100" fill="#e6e6e6" font-size="11">9 spaces, in order</text>
    <text x="266" y="100" fill="#e6e6e6" font-size="11">Waitlist 1 2 3 4</text>
    <text x="10" y="126" fill="#9aa4b2" font-size="10">Same shuffle, same seed — backfill needs no second draw</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">13 households for 9 spaces: the first 9 win, and from 10th onward the order is the waitlist.</figcaption>
</figure>

Three things fall out of this:

1. **It's fair.** Fisher–Yates produces a uniform permutation, so every household is equally likely to land at any waitlist position. I ran 60,000 simulations: the chance of a given household being first in line came out between 3.43% and 3.69% (expected 3.57%), and a chi-squared test shows no detectable bias.
2. **No second draw.** The order is fixed at the same moment as the result, live on camera. That matters more than it sounds — if backfill required another draw on some other day, the "press until you like it" risk walks straight back in, and that session usually isn't streamed.
3. **Just as verifiable.** The order comes from the same seed, so a resident can rerun it and check.

As for who gets a vacated space: our rule is **the first household on the waitlist takes it, whether it's a priority space or a regular one**. In our design "priority" never affects *whether* you win — a priority household (an expectant mother, say) has exactly the same chance as anyone else; priority only decides **where you park once you've won**, the spaces that are easier to get in and out of. Letting priority households jump the backfill queue would quietly turn priority into a weighting on winning, and that breaks the rule we agreed on.

## Making verification something residents will actually do

"Publish the seed and anyone can rerun it" reads well on a notice board, but I came to see that it stayed theoretical: to verify, a resident has to paste four lists back into the page **in the original order** — one missing line, one wrong position, and the result is completely different. Nobody was ever going to do that. Auditability we never cashed in.

So I added two routes that hand the same draw straight to residents:

**A verification link** — the seed and the four lists encoded into the URL hash. Open it and the page reruns the draw from the link's own data, order included. It goes in the hash rather than the query string, so the names never reach the server. A malformed link shows an error and falls back to the sample data — it will **never take half the data and compute something that looks real**, which would be worse than having no verification at all.

**Importing the spreadsheet** — drop the published `.xlsx` back onto the page. It restores the lists and seed by registration number, reruns the draw, compares it row by row against the file's own allocation, and gives one answer:

```text
✅ Matches the file (9 rows)
   Rerunning seed 1789360267486 (2026/09/14 12:31:07.486) reproduces
   the file's allocation exactly, row for row.

❌ Does not match the file (9 rows compared)
   Different space: 51-08F (file: 天上一號 / rerun: 8);
   usually this means the list was edited or re-sorted — the order is an input too.
```

A resident doesn't have to compare 22 lines by eye, or know what a seed is. Drag a file in, get an answer. **Verifiability only counts when someone who can't be bothered to verify can still verify.**

Pulling the draw out into pure functions also let me add a set of **golden-file regression tests**: a few fixed seeds and lists with their complete output locked down. What this tool promises residents is "publish the seed and the result can always be reproduced" — so **a changed result is itself the bug**, even when the new rule looks more sensible. When that test goes red, the question isn't "how do I make it pass", it's "can the old seeds still reproduce their results, and does the notice in someone's hand still match?"

## The draw procedure
1. Start the live stream and record it
2. Show the code and the UI
3. Show every input (including the order of the lists — that's an input too)
4. The button gets pressed once — and point the camera at the timestamp next to the seed, which has to read the current time. On screen, a seed generated on the spot and a seed computed in advance and typed in look identical; that line of text is the only thing that tells them apart
5. Save the code, the input data, the random seed and the result
6. Publish all of it for inspection, along with the verification link and the waitlist

## Conclusion
Code alone can't get you to "provably not rigged" — it takes procedure design to keep the organiser from steering things
1. Live streaming stops the organiser from drawing repeatedly and keeping the one they like
2. The result can be recomputed (keep the inputs and the seed), so recalculation rules out manual adjustment
3. The seed is at millisecond resolution, so nobody can aim for a particular seed to get a particular result
4. Public code plus a live draw keeps the whole thing open
5. The backfill order is settled together with the draw, not re-drawn on some later date — otherwise the "press until you like it" risk walks straight back in, at a session nobody is watching
6. Verification has to be something a resident will actually click (one link, one dropped file), or "reproducible" is just a line on a notice

Having now run a real draw, here's what I take away: **the hard part was never the algorithm.** Mulberry32 plus Fisher–Yates took an afternoon. Everything after that went into "how do I get a resident who doesn't code to believe it" — keep paper evidence for the list order, settle backfill in advance, make verification one click. The code makes the result reproducible; the procedure makes that reproducibility visible.
5. The tool itself: [Parking lottery for 原昕吾境](/lottery/)
