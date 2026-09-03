---
name: writing-blog-post
description: Use when writing, drafting, or polishing a blog post for this Astro site — e.g. a new entry in the 成為 Tech Leader / BTL reading-notes series, or any new article under src/content/blog/.
---

# Writing a Blog Post (this site)

## Overview
This blog is **Aidan's personal brand / professional image** (a Backend Lead's thinking and depth). Its essence — **用圖像加精簡的文字,把複雜的東西解釋清楚**. The value of a post = **a diagram that makes a hard idea click** + **a summary clearer than the source** + **a concrete, opinionated personal reflection**.

- The **visual is the signature of this blog, not a garnish**: most concept posts lead with a diagram that carries the core mental model (the unbounded-table for streaming, the three failure points for delivery, partition-as-the-real-log). Reach for the picture *first*, then let the text stay lean around it.
- The summary is NOT a commodity: sources are often verbose and most people don't read them. A 5-minute distillation that surfaces what the source buries is itself a service — and shows the ability to read deeply and condense.
- The reflection is the differentiator: it proves you actually applied the idea and have a view nobody can copy.

## Structure
1. **Diagram(s)** (inline `<svg>`): for any post explaining a non-trivial concept, a diagram is **expected, not optional** — it should carry the central model so a reader who only looks at the picture already gets the gist. Add more than one when there are distinct ideas (e.g. `kafka-topics` has partition + consumer-group; `kafka-delivery` has the journey + per-key compaction). The only posts that legitimately skip it are pure reflection/reading-notes with no spatial structure to show (some `btl-*`) and food photo posts. **If a concept is complex and you can't picture it, that's a signal you haven't distilled it enough yet — not a reason to ship text-only.**
2. **Summary** (`##` / `###`): distill the source into clear **models, lists, contrasts** — aim for "clearer and more salient than the original," not paragraph-by-paragraph retelling. The prose orbits the diagram; keep it lean.
3. **`## 反思`**: personal experience + opinion proving real use. Sub-divide with `###` when there are distinct angles (e.g. `btl-4`'s 心態 / 技術能力).

## Quality checklist (before publishing)
- **Visual: does a concept post have a diagram carrying the core model? Could a reader who only looks at the picture get the gist? Is the diagram clearer than the equivalent paragraph would be? (the blog's essence — don't ship a complex concept text-only)**
- Summary: surfaces points the source left unclear? A non-reader gets the gist in 5 min? Distilled into structure (not copied)? Does the prose stay lean around the diagram instead of repeating it?
- Reflection: specific (real examples, numbers, situations)? Has your own judgment, not neutral restatement?
- Overall: summary and reflection echo each other? Reflection not rushed (it's the selling point)?

## Front matter conventions (schema: `src/content.config.ts`)
| Field | Note |
|---|---|
| `title` | Series posts use "領導力 - XXX"; standalone posts free-form. |
| `date` | `YYYY-MM-DD`. |
| `updated` | Optional `YYYY-MM-DD` — set on substantive revisions only (not typo fixes). Shows「更新於」on the post and feeds `dateModified` / `article:modified_time`. |
| `category` | Currently `tech` / `food` only (coarse, drives topbar). |
| `tags` | Cross-cutting topics, **ASCII slug** (e.g. `leadership`, `system-design`) for clean URLs. |
| `series` | Series title — the **exact same string** is the grouping key (a typo splits the series). |
| `seriesOrder` | Order within the series (1, 2, 3…). |
| `comments` | Default `true`. |
| `commentsIssue` | Only to reuse an existing GitHub issue thread (e.g. `lottery` → 1). New posts omit it. |
| `draft` | Default `false`. Set `draft: true` to keep a post out of the **built** site (listings, `/blog/<slug>/`, tags, RSS, backlinks) while still previewing it under `npm run dev`. Filtering lives in `src/lib/posts.ts` (`getPublishedPosts()`); flip to `false` (or remove) to publish. |

The series box, tag chips, and prev/next are generated automatically by `src/layouts/PostLayout.astro` — just fill front matter correctly.

## 台灣用詞 & 口吻
寫這個部落格的文章用**繁體中文、台灣用語**,而且要像作者本人(口吻範本:`btl-*` 的「## 反思」)。

**高頻台灣用詞**(完整對照表 + 修正記錄見 `docs/zh-tw-style-guide.md`):
代碼→程式碼、變量→變數、對象→物件、默認→預設、緩存→快取、返回→回傳、運行→執行、實現→實作、調用→呼叫、用戶→使用者、項目→專案、配置→設定、**文件(指 file)→檔案**(陷阱:台灣「文件」=document)。

**口吻**:第一人稱有主張、用真實例子/數字佐證、轉折用破折號「——」、結尾收一句判斷;避免 AI 腔(首先/其次/綜上所述/值得一提的是)。

**收稿前掃描**:完成 draft、回報前,拿上面(及 doc A 區)的「避免詞」grep 一遍內文,抓到就改 —— 但 `支持 / 通過 / 優化` 這類依語境的別無腦替換。

## Technical gotchas
- **No blank lines inside inline `<svg>` / raw HTML.** A blank line ends the markdown HTML block; the indented lines after become a code block (broke `btl-4`). Keep the whole `<svg>` contiguous.
- Math: `$...$` / `$$...$$` (KaTeX is configured).
- Diagram colors: site dark-theme literals — accent `#4f6df5`, muted `#9aa4b2`, line `#3a4154`, surface `#262b3a`, ink `#e6e6e6`.
  Reuse these (or another colour already in `scripts/theme-map.mjs`); the light theme repaints diagrams by matching on the literal, so a brand-new hex
  would stay dark on a white page. `npm test` fails on an unmapped colour — add it to that map and run `npm run theme:css`.
- Remote images: plain markdown `![](url)` renders as-is.
- Verify with `npm run build`; preview with `npm run dev`.

## Copy-paste skeleton
New post → `src/content/blog/<slug>.md`:

```markdown
---
title: "領導力 - XXX"
date: 2026-01-01
category: tech
tags:
  - leadership
series: "成為 Tech Leader 讀書筆記"
seriesOrder: 5
comments: true
---
## 〈主題〉

（一句話帶出這篇要講什麼。）

### 〈子概念一〉
（提煉成清楚的說明 / 條列 / 對照，比原書更好懂。）

### 〈子概念二〉
（複雜概念就放一張圖把核心模型畫出來 —— 這是本站精髓,別只給文字。注意 SVG 內不可有空行。）

## 反思

### 〈面向一〉
（具體的個人經驗 + 觀點，證明你真的用過。）
```

Inline diagram — for concept posts this is expected, not optional (whole block must have NO blank lines):
```html
<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 360 170" role="img" aria-label="〈描述〉" style="width:100%;max-width:420px;height:auto;margin:0 auto;">
    <line x1="40" y1="150" x2="350" y2="150" stroke="#3a4154" stroke-width="1.5"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">〈圖說〉</figcaption>
</figure>
```

## Common mistakes
- Explaining a complex concept in text only → the blog's essence is visual; lead with a diagram that carries the model.
- A diagram that just decorates (a logo, a vague box) instead of explaining → it must encode the actual mental model (flow, contrast, structure), or it's noise.
- Reflection too short or generic → it's the selling point; go deeper with real specifics.
- Summary just paraphrases the source → restructure it to be clearer than the original.
- CJK / spaced tag slugs → use ASCII slugs.
- Blank lines inside an inline SVG → diagram breaks into a code block.

**Existing examples:** `src/content/blog/btl-1.md` ~ `btl-4.md`.
