---
name: translating-to-english
description: Use when translating a post on this Astro site into English — creating or revising a file under src/content/blog/en/, planning an English rollout for a series, or fixing the wording, diagrams, or frontmatter of an existing translation.
---

# Translating a Post into English (this site)

## Overview
The site is written in Traditional Chinese; English versions are **per-post opt-in translations** under `src/content/blog/en/`. The long-term goal is full coverage of all ~180 posts — but coverage is worth nothing if the English reads like machine output. **A translation ships only if an English-speaking Backend Lead would read it and think a person wrote it.**

The mechanics (where files go, `translationOf`, the `/en/` fallback, hreflang, OG images) are in `docs/i18n.md` — read it once, don't re-derive it. This skill is about **the part that decides quality**.

Four things carry a translation. In order of how often they get botched:

1. **The diagram** — the blog's signature. SVG text is content, and English overflows the boxes Chinese fit in.
2. **The voice** — first-person, opinionated, em-dash, closing verdict. Translate the *stance*, not the words.
3. **The terminology** — taken from the series' 術語表, not re-invented per post.
4. **The links** — `[[slug]]` targets must survive; labels must be translated.

**Calibration sample: `src/content/blog/en/pain-before-power.md` against `src/content/blog/pain-before-power.md`.** Read both side by side before your first translation of a session. That pair is the bar: notice it renders 土法煉鋼 as "duct tape", 刀口上 as "where it cuts", and keeps every em-dash aside intact.

## Scope: what are you translating?

**The unit of work is one post.** A series glossary is a prerequisite that scales with the situation, not a gate you must clear before touching anything. Pick the mode that matches:

### A. A standalone post (no `series:`)
`pain-before-power`, `dbt-intro`, `medallion-architecture`, `blog-as-a-product`, `gitcrisp`, `zookeeper`, `lottery`, `travel-split`, and the food posts. **Just translate it** — `docs/ubiquitous-language.md` (the site-wide table) covers the shared terms, and there's no cross-post consistency to protect. These are also the best place to start: concept notes get linked from everywhere, so their titles become link labels across the whole English site.

### B. One post from a finished series
Settle the glossary once, then translate:
- Take the English `series:` string from glossary section A — never invent one.
- **Read the 〈術語表(Ubiquitous Language)〉 in `docs/<key>-series-roadmap.md` — that's the source of truth, and it already carries the English column.** It's written when the series is planned, not derived at translation time, so use it rather than re-deriving your own renderings. For reading notes the English column is the source book's own wording (DDIA's *fan-out on write*, SRE's *error budget*), which is exactly what you want.
- If a term you hit isn't in the table, add it there (not just to your draft) — the next post in the series needs the same decision.
- The same roadmap states the series' 定位 and 貫穿主軸 — the recurring sentence that closes each post has to land the same way every time.

### C. One post from a series still being serialized
Common — most series here are mid-flight (Jenkins: 9 published, 6 unwritten). You **can't** skim the whole series, and you shouldn't wait for it to finish.

- **The roadmap's 術語表 covers this case by design** — it's opened before the series is written, so terms from posts that don't exist yet are already decided there, English column included. Read it; don't reverse-engineer terminology from the handful of posts that happen to be published.
- If a later post reshapes a term, the roadmap row gets updated — then re-check the translations already shipped against it.
- **The best cadence is to translate a post right after its Chinese version publishes** — the terminology is freshest, and the series never accumulates a translation backlog.

### Ordering within a series: translate a contiguous run from part 1

This matters more than it looks. The English series box lists **only the translated siblings**, in an auto-numbered `<ol>` — so translating parts 3 and 7 renders them as "**1.**" and "**2.**", and prev/next jumps 3 → 7 with nothing marking the gap. Verified against a build; it's not a bug to fix in the post, it's a reason to sequence the work.

So: **start at `seriesOrder: 1` and go in order.** If you must cherry-pick one post out of the middle (the author wants that specific one in English now), that's fine — just know its English series box will show it as part 1 of 1 until the earlier parts land.

### Feedback loop (all three modes)
When the author corrects your English — a term, a title, a turn of phrase — **append it to glossary section D** before moving on. That's what makes the next post better instead of repeating the same correction; same discipline as the zh style guide's D 區.

## Frontmatter

Copy the original's frontmatter, then apply exactly these changes:

| Field | Rule |
|---|---|
| `title` | **Translate the meaning**, title case. Keep the original's shape: `主題:副標` → `Topic: Subtitle`; the btl series' `領導力 - X` → `Leadership — X`. Never transliterate, never pad with words the Chinese doesn't have. |
| `date` | **Identical to the original.** It's the pairing signal and it orders `/en/`. |
| `updated` | Copy if present. Also set it when you *revise* an existing translation substantively. |
| `series` | The English string from glossary section A — **exact, character for character.** A typo splits the series. Omit if the original has none. |
| `seriesOrder` | Identical. |
| `category`, `tags` | **Unchanged.** Tags are ASCII slugs and a shared taxonomy across both languages — translating them fragments the tag pages. |
| `translationOf` | **Add**: the original's slug (filename without `.md`). Required — it drives the language switcher and hreflang. |
| `description` | Translate if present; omit if absent (an excerpt is derived from the body). |
| `comments` | Copy. |
| `commentsIssue` | **Omit.** utterances opens a thread per pathname, so the English post gets its own — copying this would force English comments into the Chinese thread. Only carry it over if the author explicitly wants one shared thread. |
| `draft` | Copy. Use `draft: true` while a translation is still being reviewed. |

Filename **must match the original exactly**: `src/content/blog/foo-bar.md` → `src/content/blog/en/foo-bar.md`.

## Diagrams: the part that silently breaks

Every `<svg>` must be translated: `<text>` content, `role="img"` `aria-label`, and the `<figcaption>` below it. But **English runs roughly 1.5–2× the width of the Chinese it replaces**, so a label that sat comfortably inside a box in Chinese will spill out of it. A diagram with text bleeding over its borders is worse than no diagram — and it's the site's signature element.

After translating the text, fix the fit. In rough order of preference:

1. **Cut words.** English labels in a diagram are telegraphic, not sentences: `痛點還沒到 → 輕量解` → `Pain not there yet → go light`. Drop articles, drop verbs the arrow already implies. This is almost always the right answer.
2. **Drop the font size** a point (`font-size="12"` → `"11"`), and only for the labels that overflow.
3. **Widen the box / the `viewBox`.** Safe when a shape has slack around it; re-centre anything positioned relative to it (`text-anchor="middle"` labels use the box's centre, so both must move together).
4. **Split onto two lines** — a second `<text>` at `y + ~13`. Last resort: it changes the diagram's rhythm.

Then check:
- Text still inside its rect, with visible padding on both sides.
- Nothing collides with a neighbouring shape, arrow, or divider line.
- Axis and threshold labels still sit under/over what they're labelling.
- The `aria-label` describes the diagram in a full English sentence (it's for screen readers, not a keyword dump).

**No blank lines anywhere inside the `<svg>` / `<figure>` block** — a blank line ends the markdown HTML block and turns the rest into a code block. Inherited from `writing-blog-post`; just as fatal here.

Keep every colour, id, coordinate system and structural attribute as-is unless a fit fix requires the change. Do not "improve" the diagram while translating — a translation that quietly redesigns the picture makes the two language versions drift.

## Links and code

- **`[[slug|標籤]]` wiki-links: the slug NEVER changes; translate the label.** `[[kafka-intro|Kafka]]` stays, `[[medallion-architecture|Medallion 架構]]` → `[[medallion-architecture|Medallion architecture]]`. The slug is a content id, not a URL you localize.
- **A link target that isn't translated yet is fine** — every path exists under `/en/` as a Chinese fallback page, and the route rewrites in-body links to stay in `/en/`. Never block a translation waiting on its neighbours, and never repoint a link at a different post because the target is untranslated.
- Markdown links to external sites: keep the URL; translate the link text. If it points at a Chinese-language page, that's fine — don't hunt for an English substitute unless the source obviously has an official English version.
- **Inside code blocks: translate comments and string literals meant for humans; never touch code, identifiers, commands, paths, config keys, or captured output.** Renaming a variable to English makes the two versions diverge and can break a snippet the prose refers to by name.
- Quoted material from an English-language book: **restore the original English wording**, don't back-translate the Chinese rendering. Look it up when you're unsure.

## The English voice

The Chinese voice is defined in `docs/zh-tw-style-guide.md` §B — first person with a stance, concrete numbers and real situations, em-dash asides, a flat verdict at the end of a section. **All of that must survive.** A translation that turns an opinionated engineer into a neutral technical writer has failed even if every sentence is accurate.

What that means in English:

- **Keep the first person and the judgment.** 我會先… → "I start by…", not "it is recommended to…". 我看過最貴的錯 → "The most expensive mistakes I've seen". Never soften an assertion into a hedge.
- **Keep the em-dash asides** — the Chinese 「——」 maps directly onto the English em-dash, and it's a big part of how the author sounds. Don't flatten them into commas or separate sentences.
- **Keep the closing verdict punchy.** Sections and posts end on a short, declarative line. Resist expanding it into a summary paragraph.
- **Vary sentence length** the way the original does. A run of uniformly medium sentences is what AI prose reads like.
- **Idioms get functional equivalents, not glosses.** 土法煉鋼 → "duct tape"; 刀口上 → "where it cuts"; 重武器 → "heavy weapons" (the post's own sustained metaphor — keep it consistent throughout).
- **Local context gets a short inline gloss, never a footnote.** 直播代購 → "live-stream personal shopping" on first use, then a stable short form. Assume a reader who knows backend engineering but not the Taiwanese market.
- **Convert what needs converting**: dates into English format via prose, 萬/億 into their English magnitudes (`5 萬筆` → "50,000 rows"). Keep units and technical numbers exactly.

**Avoid AI-English** — the mirror of §C's AI 腔 list. Do not use: *Moreover, Furthermore, In conclusion, To summarize, It's worth noting that, It's important to note, Additionally, delve, leverage (as a verb), robust, seamless, in today's fast-paced world, at the end of the day.* Also avoid the three-item rule-of-thumb rhythm and starting consecutive paragraphs with the same connective. If a sentence would survive unchanged in a vendor blog post, rewrite it.

**Before reporting done, grep your draft for that avoid-list** — same discipline as the zh 收稿前掃描.

## Quality checklist

- **Diagram**: all `<text>`, `aria-label` and `<figcaption>` translated? **Nothing overflowing its box or colliding?** Would a reader who only looks at the picture still get the gist?
- **Voice**: first person and stance intact? Em-dashes preserved? Closing verdicts still punchy? Sentence length varied? Reads like a person, not a vendor blog?
- **Terminology**: matches the series' 術語表 in its roadmap, and `docs/ubiquitous-language.md` for shared terms? New terms you hit added back to the right table? Already-English terms in the original (Production, throughput, backlog, backpressure, fan out — the table's §1) left alone?
- **Links**: every `[[slug]]` target unchanged and still resolving? Labels translated?
- **Frontmatter**: `translationOf` present? `date` identical? `series` byte-identical to glossary A? tags untouched? `commentsIssue` dropped?
- **Fidelity**: nothing silently dropped, nothing invented. If a paragraph was hard, it got translated — not summarized.
- **AI-English grep** run and clean.

## Verify

```
npm run build     # catches broken frontmatter, wiki-links, SVG-in-markdown breakage
npm run og        # generates public/og/en/<slug>.png (pre-commit runs it too)
npm run dev       # then open /en/blog/<slug>/ — READ IT, and look at the diagram
```

**Opening the rendered page is not optional.** Diagram overflow and blank-line-in-SVG breakage are invisible in the markdown and obvious on the page. Check the series box shows the English series name and links to `/start/`, and that the language banner points back at the Chinese original.

## Common mistakes

- **Translating the diagram's text but not re-fitting the boxes** → English spills out of the rects. The most common defect, and it hits the site's signature element.
- Translating a `[[slug]]` **slug** (or repointing it because the target isn't translated) → dead link, or a link into the wrong post.
- A series string that doesn't match glossary A character for character → the English series silently splits in two.
- Translating `tags` → fragments the shared tag taxonomy.
- Back-translating a book's terminology instead of restoring the book's own English → reads wrong to anyone who's read the book.
- Neutral, hedged prose that loses the author's stance → accurate and worthless.
- Re-translating terms the original already wrote in English (Production, throughput, fan out) → contradicts the zh style guide's D 區 rulings.
- Copying `commentsIssue` → English comments land in the Chinese thread.
- Blank line inside the inline `<svg>` → the diagram renders as a code block.
- Cherry-picking scattered parts of a series → the English series box renumbers them 1, 2, 3 and prev/next skips the untranslated gap. Go in `seriesOrder` order from part 1.
- Quietly "improving" structure or adding explanation the original doesn't have → the two versions drift and can't be maintained as a pair.

## Copy-paste skeleton

`src/content/blog/en/<same-slug>.md`:

```markdown
---
title: "<Translated Title>"
date: 2026-01-01
category: tech
tags:
  - leadership
series: "Becoming a Tech Leader — Reading Notes"
seriesOrder: 5
comments: true
translationOf: <same-slug>
---
```

Body: translate straight through, section by section, keeping every heading level, list, table, figure and code block in place.

**Related:** `docs/i18n.md` (mechanics) · **`docs/ubiquitous-language.md` (site-wide terms — the single source for shared vocabulary, English column included)** · `docs/<key>-series-roadmap.md` 〈術語表〉 (per-series terms) · `docs/en-translation-glossary.md` (series-name translations) · `docs/zh-tw-style-guide.md` §B–C (the voice being preserved) · `writing-blog-post` skill.
