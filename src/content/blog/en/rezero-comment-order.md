---
title: "Comment as Order: Turning a Chat Room into an Order Channel"
date: 2026-07-25
category: tech
description: "First battle on the main line: comments from three platforms converging into one processing chain, Facebook's adaptive polling rhythm, cleaning and landing, then a hand-written FSM that parses \"2601blue+1red+2\" into orders — a walk through the state machine's design and its cleverness, plus the most painful trade-off of all: failures were simply skipped."
tags:
  - war-story
  - live-commerce
  - fsm
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 3
comments: true
draft: false
translationOf: rezero-comment-order
---
With [[rezero-overview|the big picture]] and [[rezero-stack|the opening move]] in place, here's the first battle on the main line: **how one comment becomes one order**. This chapter covers intake and parsing; the fight over stock reservation belongs to the next one. The star is the finite state machine that turns a chat room into a cash register — and we're going to read its actual code.

## The pipeline we had: one loop swallowing three platforms

Comments came from three sources: **Facebook, Instagram and our own live studio**, in a traffic ratio of roughly **100:10:1** — Facebook was overwhelmingly the main theatre. All three were fetched differently (the webhook, polling and direct push mentioned in the overview), but they converged: **everything landed in the same message table and was digested by the same batch chain**. So the fetching story here is mostly Facebook's polling — that's where the traffic was, and where the potholes were. The way we hooked it up was almost endearingly plain:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="The comment pipeline we had. On the left, three sources fetched in different ways: Facebook at a traffic weight of one hundred, using adaptive polling, where a round taking more than two seconds immediately fetches again with the paging key and an idle round slows down; Instagram at weight ten over webhook; and the own studio at weight one pushing directly. All three converge: cleaned into a unified message format, appended to the same table, with the raw text kept as well. Downstream is a single batch chain, two hundred rows at a time, parsing with the FSM, looking up the bidding key, decrementing sold quantities and creating identities. Two dashed annotations: the raw was stored and Facebook could even be re-fetched for a whole stream, insurance that was bought but never used; and a processing failure was simply skipped with no recovery path, with lag reaching minutes at peak." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rcf" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rcp" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e05a7d"/></marker><marker id="rca" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#d6a45c"/></marker></defs>
    <rect x="16" y="24" width="88" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="60" y="40" fill="#e6e6e6" font-size="7.4" text-anchor="middle">FB (100) · poll</text>
    <rect x="16" y="56" width="88" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="60" y="72" fill="#e6e6e6" font-size="7.4" text-anchor="middle">IG (10) · webhook</text>
    <rect x="16" y="88" width="88" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="60" y="104" fill="#e6e6e6" font-size="7.4" text-anchor="middle">Own (1) · push</text>
    <line x1="104" y1="68" x2="124" y2="68" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rcf)"/>
    <rect x="128" y="40" width="128" height="56" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="192" y="60" fill="#4f6df5" font-size="8.6" text-anchor="middle" font-weight="bold">Fetch: per-source</text>
    <text x="192" y="75" fill="#9aa4b2" font-size="6.6" text-anchor="middle">adaptive: busy→fast, idle→slow</text>
    <text x="192" y="87" fill="#9aa4b2" font-size="6.6" text-anchor="middle">all into one table</text>
    <line x1="256" y1="68" x2="276" y2="68" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rcf)"/>
    <rect x="280" y="40" width="128" height="56" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="344" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle" font-weight="bold">Clean → land</text>
    <text x="344" y="75" fill="#9aa4b2" font-size="6.6" text-anchor="middle">append in a unified format</text>
    <text x="344" y="87" fill="#9aa4b2" font-size="6.6" text-anchor="middle">dedupe: source+message id</text>
    <line x1="408" y1="68" x2="428" y2="68" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rcf)"/>
    <rect x="432" y="40" width="132" height="56" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="498" y="60" fill="#d6a45c" font-size="8.6" text-anchor="middle" font-weight="bold">batch 200 · FSM</text>
    <text x="498" y="75" fill="#9aa4b2" font-size="6.6" text-anchor="middle">parse → look up bidding key</text>
    <text x="498" y="87" fill="#9aa4b2" font-size="6.6" text-anchor="middle">decrement sold + identity</text>
    <line x1="344" y1="96" x2="344" y2="130" stroke="#d6a45c" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rca)"/>
    <text x="344" y="146" fill="#d6a45c" font-size="7.4" text-anchor="middle" font-weight="bold">raw is stored · FB re-fetchable — never used</text>
    <line x1="498" y1="96" x2="498" y2="170" stroke="#e05a7d" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rcp)"/>
    <text x="470" y="186" fill="#e05a7d" font-size="7.4" text-anchor="middle" font-weight="bold">failure → skipped, no recovery path</text>
    <text x="290" y="222" fill="#9aa4b2" font-size="7.8" text-anchor="middle">All for the freshest stock the host can see; the price: minutes of lag at peak, orders lost in silence</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The comment pipeline we had: three sources fetched their own way, cleaned and landed, one batch chain parsing them into orders. The two dashed lines are the bill this chapter settles.</figcaption>
</figure>

Three details worth magnifying:

- **Facebook's polling was a self-tuning rate controller.** Each round measured its own duration: over 2 seconds meant comments were pouring in, so it immediately fetched again with the paging key; under 2 seconds meant the room was quiet, so it backed the interval off. No external configuration, no monitoring dashboard — the loop sensed the traffic and adjusted itself. Something a small team built on instinct, and in hindsight it's textbook adaptive polling. The price is paid downstream: once all three converge they **queue on the same batch chain**, so when Facebook surges, Instagram and own-studio orders wait in line too — Facebook's flood is everyone's latency.
- **The dedupe key was the right one: `source + message id`.** Polling will always re-fetch overlapping windows, and using the platform's native comment ID as the unique key means re-fetching any number of times never double-inserts. That's idempotency at the intake layer, and getting it right made everything after it easy.
- **Landing it was insurance.** Comments were cleaned into a unified format and landed, and the raw text was kept alongside; and because a Facebook live comment is just a comment under a post, a whole stream could be re-fetched afterwards (in a slightly different order from what we captured live). We'd bought more insurance at the fact layer than I remembered — whether any of it was ever claimed is the bill at the end of this chapter.

## Parsing: a tiny language designed for thumbs

What a viewer types in a live stream isn't a command, it's **shorthand under time pressure**. The grammar looks like this: `2601+1` means one unit of key 2601; when an item has variants (colour, size), `2601藍+1紅+2` places orders for two variants of the same key in one breath — 藍 is blue, 紅 is red — so **the key is typed once and the variants relay off it**, because in the few seconds of a scramble, three fewer characters is the difference between winning and losing. One comment can also carry several keys.

To parse that grammar we didn't reach for a regex; someone hand-wrote a character-by-character finite state machine (excerpted; the comments are mine, added now):

```python
class CommentsFSM:
    class State(Enum):
        KEYWORD = "keyword"
        STYLE = "style"
        NUMBER = "number"
        DETERMIN_KEYWORD_OR_STYLE = "determin_keyword_or_style"
        ERROR = "error"

    def __init__(self) -> None:
        # state → handler dispatch table: the main loop is forever one line
        self.fsm: dict[CommentsFSM.State, Callable[[str], None]] = {
            self.State.KEYWORD: self._handle_keyword,
            self.State.STYLE: self._handle_style,
            self.State.NUMBER: self._handle_number,
            self.State.DETERMIN_KEYWORD_OR_STYLE: self._handle_determin_keyword_or_style,
            self.State.ERROR: self._handle_error,
        }
        self._reset()
        self.separate_chars = set([" ", ",", "，", "、"])  # halfwidth and fullwidth commas both separate

    def parse(self, text: str) -> dict[str, int]:
        self._reset()
        for c in text:
            self.fsm[self.state](c)              # one character, one step
        if self.current_number:
            self._add_result()                   # tail: we ended on a digit
        return {k: q for k, q in self.results}   # same key repeated → last one wins

    def _handle_keyword(self, char: str) -> None:
        if char.isdigit():
            self.current_str += char             # a key is only the leading run of digits
        elif char == "+" or char == "＋":        # a fullwidth plus is still a plus
            self.keyword = self.current_str
            self.state = self.State.NUMBER
            self.current_str = ""
        else:
            self.keyword = self.current_str      # anything else moves us into a variant
            self.state = self.State.STYLE
            self.current_str = char

    def _add_result(self) -> None:
        try:
            quantity = int(self.current_number)
            if quantity > 0:                     # +0 is meaningless: a called order can't be cancelled
                self.results.append((self.keyword + self.current_str, quantity))
        except ValueError:
            self.results.clear()                 # broken mid-string: void the whole comment
            self.state = self.State.ERROR
            return
        self.state = self.State.STYLE            # the tail path; mid-string, _handle_number overwrites this with DETERMIN
        self.current_str = ""
        self.current_number = ""
```

(Excerpted: `_reset` and the STYLE, NUMBER, DETERMIN and ERROR handlers are omitted — everything they do is in the state diagram below.)

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="The transition diagram of the comment-parsing state machine. KEYWORD accumulates leading digits; a plus sign moves to NUMBER, any other character moves to STYLE. STYLE accumulates variant characters and a plus moves to NUMBER. NUMBER accumulates digits, and on a non-digit it records one result and moves to DETERMIN; DETERMIN then uses that same character to decide whether to return to KEYWORD for a new key or go to STYLE for another variant of the same key. A malformed number moves to ERROR and voids the entire comment. Below, worked through the example 2601 blue plus 1 red plus 2: one unit of 2601 in blue and two of 2601 in red — the key is typed once and the variants relay." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rcs" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rce" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e05a7d"/></marker></defs>
    <rect x="24" y="34" width="104" height="34" rx="17" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="76" y="55" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">KEYWORD</text>
    <rect x="238" y="34" width="104" height="34" rx="17" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.4"/>
    <text x="290" y="55" fill="#9b6ff0" font-size="8.8" text-anchor="middle" font-weight="bold">STYLE</text>
    <rect x="452" y="34" width="104" height="34" rx="17" fill="#233528" stroke="#54b890" stroke-width="1.4"/>
    <text x="504" y="55" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">NUMBER</text>
    <rect x="238" y="128" width="130" height="34" rx="17" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="303" y="145" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">DETERMIN</text>
    <text x="303" y="156" fill="#9aa4b2" font-size="6.2" text-anchor="middle">new key or another variant?</text>
    <rect x="452" y="128" width="104" height="34" rx="17" fill="#3a2632" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="504" y="149" fill="#e05a7d" font-size="8.8" text-anchor="middle" font-weight="bold">ERROR</text>
    <line x1="128" y1="51" x2="236" y2="51" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rcs)"/>
    <text x="182" y="44" fill="#9aa4b2" font-size="6.6" text-anchor="middle">non-digit → variant</text>
    <line x1="342" y1="51" x2="450" y2="51" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rcs)"/>
    <text x="396" y="44" fill="#9aa4b2" font-size="6.6" text-anchor="middle">+ / ＋</text>
    <path d="M 490 68 Q 420 110 370 132" fill="none" stroke="#54b890" stroke-width="1.2" marker-end="url(#rcs)"/>
    <text x="438" y="106" fill="#54b890" font-size="6.6" text-anchor="middle">non-digit: record one</text>
    <path d="M 262 128 Q 180 100 106 70" fill="none" stroke="#d6a45c" stroke-width="1.2" marker-end="url(#rcs)"/>
    <text x="168" y="116" fill="#d6a45c" font-size="6.6" text-anchor="middle">digit → new key</text>
    <path d="M 303 128 Q 296 96 292 70" fill="none" stroke="#d6a45c" stroke-width="1.2" marker-end="url(#rcs)"/>
    <text x="330" y="100" fill="#d6a45c" font-size="6.6" text-anchor="middle">other → next variant</text>
    <line x1="368" y1="145" x2="450" y2="145" stroke="#e05a7d" stroke-width="1.2" marker-end="url(#rce)"/>
    <text x="409" y="138" fill="#e05a7d" font-size="6.6" text-anchor="middle">bad number → void all</text>
    <text x="290" y="200" fill="#e6e6e6" font-size="8.6" text-anchor="middle" font-weight="bold">「2601藍+1紅+2」 → { 2601藍: 1, 2601紅: 2 }</text>
    <text x="290" y="218" fill="#9aa4b2" font-size="7.4" text-anchor="middle">藍 = blue, 紅 = red · key typed once, variants relay; the composite string goes to the bidding-key table</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The FSM's transitions: KEYWORD takes digits, STYLE takes the variant, NUMBER takes the quantity; DETERMIN decides between relaying and starting a new key.</figcaption>
</figure>

There are several design decisions hiding in the details of this machine, and each is worth pulling out:

- **The parser doesn't decide whether something is an order — the database is the validator.** What the FSM produces is a **composite string** of `keyword + style` (`2601藍`), which goes straight to a lookup against the bidding-key table (the host's start-bidding API has already written every composite key into the DB). So the parser can afford to be permissive: idle chatter has no `+number` and parses to nothing; and even if it parses `讚+1` ("nice+1"), there's no key called 讚, so it's dropped. **A permissive parser plus a strict lookup** collapses the fuzzy problem of "detecting intent to order" into one exact lookup.
- **LWW is built into a single comment.** The dict comprehension on the last line means `2601+1 2601+3` automatically leaves only `+3` — change your mind inside one sentence and it's handled for free.
- **The realities of Taiwanese input methods are all absorbed**: there's a special case for the fullwidth `＋`, and the separators include spaces plus Chinese commas and enumeration marks. That fullwidth digits like `１２` also work is an easter egg — Python's `isdigit()` and `int()` accept them natively, and back then nobody probably knew we supported it.
- **`+0` is silently dropped — because a called order can't be cancelled, and that's a feature.** The tension of ordering in a live stream is that **a comment is a commitment**; allow `+0` as a take-back and the scramble loses its point, and you've handed people a way to squat on stock maliciously. Want a refund? That's the cart's business, and expiry release's — not the comment's.
- **Break in the middle and the whole comment is void; break at the tail and what came before survives.** A failed number parse enters ERROR and clears everything already parsed — if the sentence looks suspicious we'd rather not order at all. But something like `2601藍+1紅+` with a severed tail keeps the `2601藍+1` in front. Asymmetric, but pointed the same way: **match as much as you can, and abandon the sentence when it looks wrong**.
- **Even letter keys work — without touching the code.** The FSM's keyword only recognises leading digits, so what about a key like `A01`? Leave the product's keyword blank and put the full string in the variant field — the composite string still assembles, and the lookup still finds it. A limitation of the grammar absorbed by the data layer: the single-source-of-truth dividend again.

### Three clever things about how it's written

Above is what it decided; here's what's good about how it was written — three moves worth stealing:

1. **The state table is the program's skeleton.** The `dict[State, Callable]` dispatch table keeps the main loop at one line forever, `self.fsm[self.state](c)` — no forest of if/elif. Grammar rules, transition diagram and program structure are **one and the same thing**: at review time you can hold the diagram against the code cell by cell, and adding a state means adding an entry and a method without touching existing logic.
2. **One pass, no backtracking, with a one-character lookahead achieved by "handing off".** Every character is read exactly once, O(n), with none of a regex's worst-case backtracking. The prettiest part is the moment `_handle_number` meets a non-digit: it settles the current result, switches state to DETERMIN, **then hands the very same character to the new state's handler to be processed again** — the effect of looking one character ahead, with no pushback buffer and no peeking. That's the standard trick of a hand-written lexer, and it was arrived at by instinct.
3. **Few enough states to verify by eye, and the tests were genuinely there.** The machine's entire mutable state is three strings and an enum; `parse()` has the shape of a pure function — string in, dict out — so unit tests are one line per case. And it **was covered by a large body of test cases** at the time; the nerve to hand-write a parser and keep editing it mid-season came from exactly that layer of protection. Once in ERROR, every subsequent character keeps clearing results, so a broken comment **cannot leak a single row** — fail-closed, done in the dumbest and least breakable way possible.

### Would I change the parser?

Not at its core. A single-pass FSM with permissive parsing and DB validation is the right fit for a grammar this size — a regex is already unmaintainable at this complexity, and a parser generator is a sledgehammer. The tests wouldn't start from zero either; there was already a solid body of them. What a rebuild adds is three protections we didn't have:

- **Write the grammar's edges down as tests.** A variant name can't start with a digit — a size like `2XL` has its leading `2` read by DETERMIN as the start of a new key, producing the wrong composite string. The escape hatch back then was to leave keyword blank at product-creation time and put the whole string in the variant field, and the match still works; but that rule lived only in a shared understanding between people. In a rebuild it becomes validation at creation time and a permanent test case — **an understanding doesn't replicate as the team grows; a test does**.
- **Separate syntax from semantics.** Dropping `+0` (no cancelling) and voiding on a mid-string break (don't order if it looks wrong) are **product rules**, and today they're buried in `_add_result`'s try/except — change a product rule and you have to touch the parser. In a rebuild the FSM would only produce a list of intents, with product judgment sitting one layer above, each testable and changeable on its own.
- **Feed it real traffic.** What a parser fears most is a regression on a rewrite. The raw was kept, so historical comments could always have been replayed offline: run old and new parsers side by side, diff the results, and know how many rows a grammar change moves before you make it. All that was missing was actually building that backtest pipeline (the rebuild adds it below). Then one more layer of property-based testing — random strings in, with the only required invariant being "never crash, always return a dict".

One line to close: **the standard for good code isn't cleverness, it's that the next person to change it knows what will happen.** This FSM already passed back then; what a rebuild adds isn't a rewrite, it's the ring of protection that makes it safe to change.

## Ordering and duplicates: the three questions LWW asks first

"The same person commenting twice means the last one wins" — [[ddia-replication|LWW]] says it in one sentence, but the word "last" needs three questions answered first:

1. **Last by whose clock?** Across Facebook, Instagram and our own studio, the platforms' timestamps aren't comparable. The answer at the time was pragmatic: **our landing order first, platform timestamps as a tiebreaker** — all three sources wrote into the same message table and were digested in order by one batch chain, so the insertion order *was* the global order. The unexpected benefit of a single consumer: **you are the clock**. There's corroborating evidence for that timeline's authority: re-fetch a whole stream's comments afterwards as post comments and the order won't quite match what you captured live — the platform itself won't give you a stable order, so the one you landed is the only one there is.
2. **At what granularity does it overwrite?** At key+variant level: a later `2601藍+1` overwrites only the blue, while an earlier `2601紅+2` stands. And this is **LWW with side effects** — overwriting `+2` with `+1` means the cart quantity changes and the sold-quantity table has to be credited back the difference. An ordinary system's LWW discards the old value and is done; here the old value is holding stock, so overwriting means compensating.
3. **Where does "last" end?** Hosts need to **re-call** items — the same key put back up for sale, with all orders from the old round **wiped and fully recomputed**, and viewers having to comment again. So LWW's effective key is really "person + round + variant": a re-call starts a new generation. Nobody wiped gets a system notification; it's purely the host saying so on air — which is also a feature: **the host is this platform's notification system**, and the urgency of "comment now or it's gone" is exactly what drives live selling.

## Where did the failed orders go: the rebuild's answer

The most painful trade-off sat at the end of the pipeline: the batch kept no progress record, and **a comment that failed processing was simply skipped** — that customer's order vanished in silence. It was deliberate: stop to rescue an order and the stock number in the host's eyes goes stale; skip it and the number is always current. **The host's freshness, bought with the customer's completeness.**

But "lost orders" isn't one hole, it's three — and the bill only adds up when you lay the first section's insurance against each of them:

- **Missed on fetch** (polling skipped a comment during the stream): the best-covered cell. A whole stream could be re-fetched afterwards, and Django admin even had a "re-fetch from the Facebook post" action built — it just was never once clicked. In hindsight that isn't entirely laziness: this business already handles missed orders *live*, with the host calling again and the viewer commenting again, and the urgency absorbing the damage on the spot. Having the system quietly backfill afterwards isn't the rhythm of a live stream.
- **Missed on cleaning** (a comment the rules didn't recognise): the raw is there, so in theory historical comments could be backtested and replayed with corrections — but that backtest pipeline was never built, so what got missed is still a guess.
- **Failed in processing** (the FSM or the stock decrement blew up): the real black hole. The message was already in the DB, so the correct idempotent dedupe at the intake layer now actively blocks a re-fetch, and the batch skipped it and never came back. **Of the three holes, the only one with no rescue even in theory.**

The audit's conclusion is a little ironic: the cell that heals itself (the host just calls again) had insurance bought to the hilt, and the genuine black hole had none at all. The rebuild doesn't overturn the "freshness first" priority; what it adds is making rescue **run by itself** — that never-clicked button already proved that a remedy depending on someone remembering to trigger it is no remedy:

- **One processing chain per source** (the fetch side was independent anyway), so Facebook's flood no longer drags Instagram and own-studio orders into the same queue;
- **Promote the raw we kept into a proper [[ddia-streaming|event log]] asset** — not merely stored, but wired to replay and backtest entry points, so a cleaning rule that missed something can be made good by replaying;
- **The fast path still skips failures** — but a failed event goes to a dead-letter queue and a slow rescue path replays it **automatically** afterwards (everything from [[kafka-delivery|delivery semantics]] applies here), turning "failed processing" from a black hole into "arrived late";
- **Split parsing from the stock decrement.** Parsing is a pure function and can run in parallel; only the decrement needs to queue. Back then they were crammed into the same batch loop, and the slow one dragged on the fast one.

In one line: **buy speed with "process it later", not with "give up on the customer."** The host still sees the latest number, and the customer whose order failed gets fished back out by the rescue path a few seconds later.

## Reflections

### The parser's wisdom is pushing the hard question to the database

Looking at this FSM now, the cleverest thing isn't the state design — it's that **it refuses to answer the hard questions**. "Is this comment an order?" — it doesn't answer; it produces a composite string and looks it up, and found means yes, not found means no. "How do we support letter keys?" — don't change the grammar, leave keyword blank and use the variant field. "What about a host re-calling?" — the mapping is in the DB, so changing the binding is a new fact. Every requirement that looked like it needed a parser change got absorbed by the data layer instead. I used to call that lucky; now I'd say: **people who put the single source of truth in the right place keep on being "lucky".**

### Limits are designed, and they're often the best design

Three "defects that are features" show up in this chapter: `+0` does nothing (a called order can't be cancelled), a re-call sends no notification (the host is the notification system), and a mid-string error voids the sentence (don't order if it looks wrong). Not one of them is a technical limitation — each is a **product decision made together with the business**, that happens to be shaped like code. Engineers often think they're compromising when they're actually defining the product's edges, and good edges define a product more than features do. Live commerce runs on urgency, and every thoughtful accommodation the system adds leaks a little of that urgency away.

### Being honest about that dashed line

But I don't want to dress the past up as wisdom everywhere. That red dashed line in the diagram — failures simply skipped — really did hurt customers: an order vanished in silence, and **we didn't even know who to apologise to**. Auditing the three holes, the sharpest lesson is that the insurance was in the **wrong place**: we bought it on the cell the business rhythm heals by itself (the re-fetch button was never clicked, because the host just calls again), and the genuine black hole that never heals had none — we never even measured how many people it hurt (no complaints usually just means the customer doesn't know they should complain). Insurance is worth not what you bought but whether it covers the **wounds that don't heal on their own**; and to know which ones don't, you have to admit the system wounds people and go and measure it. If this series leaves you with one line, I'd like it to be this one: **keeping the fact is the first half; deciding who claims it, and when, is the second** — raw lying in a warehouse and a button nobody presses are, to the customer who lost an order, exactly the same as nothing at all.
