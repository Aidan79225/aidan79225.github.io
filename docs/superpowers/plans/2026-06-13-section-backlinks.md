# Section-Level Backlinks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group each post's "🔗 被引用於" panel by the section that was referenced (`[[slug#heading]]`), with a "整篇文章" group for whole-post links.

**Architecture:** A pure `extractLinks` captures each wikilink's `{slug, anchor}`. `getBacklinks` returns `{post, anchor}` refs. A pure `groupBySection` buckets refs by the target post's headings (from Astro's `render()` `headings`), ordered by heading order with "整篇文章" last. `PostLayout` renders the grouped panel.

**Tech Stack:** Astro 6, `github-slugger` (anchors), Node 22 `node:test`.

**Spec:** `docs/superpowers/specs/2026-06-13-section-backlinks-design.md`

---

## Current state (on master, post PR #8)

- `src/lib/wiki-link.mjs` exports `wikiLinkRegex`, `slugifyHeading`, `parseTarget`, `splitWikiLinks(value, ctx)`, `extractTargets(body)` (returns `string[]` of base slugs, sections stripped, same-page ignored).
- `src/lib/backlinks.ts`: `getBacklinks(targetSlug)` returns `CollectionEntry<'blog'>[]` (uses `extractTargets`).
- `src/layouts/PostLayout.astro`: computes `const backlinks = await getBacklinks(post.id)` and renders a FLAT `<ul>` aside (lines 66–75); `Props` is `{ post }`.
- `src/pages/blog/[slug].astro`: `const { Content } = await render(post)` → `<PostLayout post={post}><Content/></PostLayout>`.
- `test/wiki-link.test.mjs`: 16 tests; `package.json` `test` = `node --test test/**/*.mjs` (auto-globs new `test/*.mjs`).

---

## File Structure

- `src/lib/wiki-link.mjs` (Modify) — add `extractLinks`; refactor `extractTargets` to use it.
- `src/lib/wiki-link.d.mts` (Modify) — declare `extractLinks`.
- `src/lib/group-backlinks.mjs` (Create) — pure `groupBySection(backlinks, headings)`. Separate from `backlinks.ts` so it imports no `astro:content` and is unit-testable under `node:test`.
- `src/lib/group-backlinks.d.mts` (Create) — declarations.
- `src/lib/backlinks.ts` (Modify) — `getBacklinks` returns `{post, anchor}[]`.
- `src/pages/blog/[slug].astro` (Modify) — pass `headings` to `PostLayout`.
- `src/layouts/PostLayout.astro` (Modify) — group + render the panel.
- `test/wiki-link.test.mjs` (Modify) — `extractLinks` tests.
- `test/group-backlinks.test.mjs` (Create) — `groupBySection` tests.

---

### Task 1: `extractLinks` (and refactor `extractTargets`)

**Files:**
- Modify: `src/lib/wiki-link.mjs`
- Modify: `src/lib/wiki-link.d.mts`
- Modify: `test/wiki-link.test.mjs`

- [ ] **Step 1: Add failing tests**

In `test/wiki-link.test.mjs`, change the import line to add `extractLinks`:
```js
import { splitWikiLinks, extractTargets, slugifyHeading, parseTarget, extractLinks } from '../src/lib/wiki-link.mjs';
```
Then append these tests at the end of the file:
```js
test('extractLinks returns slug + anchor, ignoring same-page links', () => {
  assert.deepEqual(
    extractLinks('[[btl-5]] [[btl-5#障礙一：看不到自己]] [[#反思]] [[btl-6|z]]'),
    [
      { slug: 'btl-5', anchor: null },
      { slug: 'btl-5', anchor: '障礙一看不到自己' },
      { slug: 'btl-6', anchor: null },
    ]
  );
});

test('extractLinks returns an empty array for an empty body', () => {
  assert.deepEqual(extractLinks(''), []);
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test`
Expected: FAIL — `extractLinks` is not exported yet.

- [ ] **Step 3: Implement `extractLinks` and refactor `extractTargets`**

In `src/lib/wiki-link.mjs`, REPLACE the current `extractTargets` function (the block starting `// Collect referenced base slugs` through its closing `}`) with:
```js
// Collect referenced links as { slug, anchor }. anchor = slugified section, or
// null for a whole-post link. Same-page links (empty slug) are ignored.
export function extractLinks(body) {
  const re = wikiLinkRegex();
  const links = [];
  let m;
  while ((m = re.exec(body ?? '')) !== null) {
    const { slug, section } = parseTarget(m[1].trim());
    if (slug === '') continue;
    const sectionText = section !== undefined ? section.trim() : '';
    links.push({ slug, anchor: sectionText ? slugifyHeading(sectionText) : null });
  }
  return links;
}

// Collect referenced base slugs (section stripped; same-page links ignored).
export function extractTargets(body) {
  return extractLinks(body).map((l) => l.slug);
}
```

- [ ] **Step 4: Declare `extractLinks` in `src/lib/wiki-link.d.mts`**

Add this line after the `extractTargets` declaration:
```ts
export function extractLinks(body: string): { slug: string; anchor: string | null }[];
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test`
Expected: PASS — all tests pass (18 now). The existing `extractTargets` tests still pass (behavior unchanged: `extractLinks(...).map(slug)` yields the same array, including duplicates).

- [ ] **Step 6: Commit**

```bash
git add src/lib/wiki-link.mjs src/lib/wiki-link.d.mts test/wiki-link.test.mjs
git commit -m "feat: extractLinks (slug + anchor) for section backlinks"
```

---

### Task 2: pure `groupBySection`

**Files:**
- Create: `src/lib/group-backlinks.mjs`
- Create: `src/lib/group-backlinks.d.mts`
- Create: `test/group-backlinks.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `test/group-backlinks.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupBySection } from '../src/lib/group-backlinks.mjs';

const post = (id, title) => ({ id, data: { title } });
const headings = [
  { slug: '障礙一看不到自己', text: '障礙一：看不到自己' },
  { slug: '反思', text: '反思' },
];

test('groups by section in heading order, 整篇文章 last', () => {
  const backlinks = [
    { post: post('btl-6', '用日記看見自己'), anchor: '障礙一看不到自己' },
    { post: post('other', '某篇'), anchor: null },
    { post: post('btl-7', '反思那篇'), anchor: '反思' },
  ];
  assert.deepEqual(groupBySection(backlinks, headings), [
    { label: '障礙一：看不到自己', sources: [post('btl-6', '用日記看見自己')] },
    { label: '反思', sources: [post('btl-7', '反思那篇')] },
    { label: '整篇文章', sources: [post('other', '某篇')] },
  ]);
});

test('stale anchor (no matching heading) folds into 整篇文章', () => {
  const backlinks = [{ post: post('x', 'X'), anchor: '已刪除的段' }];
  assert.deepEqual(groupBySection(backlinks, headings), [
    { label: '整篇文章', sources: [post('x', 'X')] },
  ]);
});

test('returns an empty array when there are no backlinks', () => {
  assert.deepEqual(groupBySection([], headings), []);
});

test('handles missing headings (everything folds into 整篇文章)', () => {
  const backlinks = [{ post: post('a', 'A'), anchor: '反思' }];
  assert.deepEqual(groupBySection(backlinks, undefined), [
    { label: '整篇文章', sources: [post('a', 'A')] },
  ]);
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test`
Expected: FAIL — `../src/lib/group-backlinks.mjs` does not exist.

- [ ] **Step 3: Implement `src/lib/group-backlinks.mjs`**

Create `src/lib/group-backlinks.mjs`:
```js
// Pure grouping for the "被引用於" panel. No I/O — unit-testable under node:test.
// backlinks: Array<{ post, anchor: string|null }>  (post has .id and .data.title)
// headings:  Array<{ slug, text }>                  (the target post's own headings)
// Returns ordered groups: sections that have sources in heading order, then a
// single "整篇文章" group last. Whole-post links (anchor null) and anchors that
// match no heading fold into "整篇文章".
const WHOLE_POST_LABEL = '整篇文章';

export function groupBySection(backlinks, headings) {
  const heads = headings ?? [];
  const textBySlug = new Map(heads.map((h) => [h.slug, h.text]));
  const sectionSources = new Map(); // anchor -> post[]
  const wholePost = [];
  for (const { post, anchor } of backlinks ?? []) {
    if (anchor && textBySlug.has(anchor)) {
      if (!sectionSources.has(anchor)) sectionSources.set(anchor, []);
      sectionSources.get(anchor).push(post);
    } else {
      wholePost.push(post);
    }
  }
  const groups = [];
  for (const h of heads) {
    const sources = sectionSources.get(h.slug);
    if (sources && sources.length) groups.push({ label: h.text, sources });
  }
  if (wholePost.length) groups.push({ label: WHOLE_POST_LABEL, sources: wholePost });
  return groups;
}
```

- [ ] **Step 4: Declare types in `src/lib/group-backlinks.d.mts`**

Create `src/lib/group-backlinks.d.mts`:
```ts
import type { CollectionEntry } from 'astro:content';

export interface BacklinkRef {
  post: CollectionEntry<'blog'>;
  anchor: string | null;
}

export interface BacklinkGroup {
  label: string;
  sources: CollectionEntry<'blog'>[];
}

export function groupBySection(
  backlinks: BacklinkRef[],
  headings: { slug: string; text: string }[] | undefined
): BacklinkGroup[];
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test`
Expected: PASS — all tests pass (22 now: 18 + 4).

- [ ] **Step 6: Commit**

```bash
git add src/lib/group-backlinks.mjs src/lib/group-backlinks.d.mts test/group-backlinks.test.mjs
git commit -m "feat: pure groupBySection for backlink grouping"
```

---

### Task 3: wire `getBacklinks` + `PostLayout` + `[slug].astro`

**Files:**
- Modify: `src/lib/backlinks.ts`
- Modify: `src/pages/blog/[slug].astro`
- Modify: `src/layouts/PostLayout.astro`

- [ ] **Step 1: `getBacklinks` returns `{post, anchor}[]`**

Replace the ENTIRE contents of `src/lib/backlinks.ts` with:
```ts
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { extractLinks } from './wiki-link.mjs';

export interface BacklinkRef {
  post: CollectionEntry<'blog'>;
  anchor: string | null;
}

// Backlinks to targetSlug as { post, anchor } (anchor = section slug, or null
// for a whole-post link), deduped per (post, anchor), newest post first.
export async function getBacklinks(targetSlug: string): Promise<BacklinkRef[]> {
  const posts = (await getCollection('blog'))
    .filter((p) => p.id !== targetSlug)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const refs: BacklinkRef[] = [];
  const seen = new Set<string>();
  for (const post of posts) {
    for (const { slug, anchor } of extractLinks(post.body ?? '')) {
      if (slug !== targetSlug) continue;
      const key = `${post.id}#${anchor ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({ post, anchor });
    }
  }
  return refs;
}
```

- [ ] **Step 2: Pass `headings` from `[slug].astro`**

Replace the ENTIRE contents of `src/pages/blog/[slug].astro` with:
```astro
---
import { getCollection, render } from 'astro:content';
import PostLayout from '../../layouts/PostLayout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content, headings } = await render(post);
---
<PostLayout post={post} headings={headings}>
  <Content />
</PostLayout>
```

- [ ] **Step 3: Group + render in `PostLayout.astro`**

In `src/layouts/PostLayout.astro`:

(a) Add imports after the `getBacklinks` import (line 7):
```astro
import { groupBySection } from '../lib/group-backlinks.mjs';
import type { MarkdownHeading } from 'astro';
```

(b) Replace the `Props` interface and props destructure (lines 9–10):
```astro
interface Props { post: CollectionEntry<'blog'>; headings?: MarkdownHeading[]; }
const { post, headings = [] } = Astro.props;
```

(c) Replace the backlinks computation (line 24, `const backlinks = await getBacklinks(post.id);`) with:
```astro
const backlinkGroups = groupBySection(await getBacklinks(post.id), headings);
```

(d) Replace the backlinks aside block (lines 66–75, the `{backlinks.length > 0 && ( ... )}` block) with:
```astro
    {backlinkGroups.length > 0 && (
      <aside class="mt-12 pt-6 border-t border-line text-sm">
        <p class="font-bold mb-2">🔗 被引用於</p>
        {backlinkGroups.map((g) => (
          <div class="mb-3">
            <p class="text-muted text-xs mb-1">{g.label}</p>
            <ul class="list-none p-0 m-0 space-y-1">
              {g.sources.map((s) => (
                <li><a href={`/blog/${s.id}/`} class="text-accent hover:underline">{s.data.title}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
    )}
```

- [ ] **Step 4: Build and verify the grouped panel end-to-end**

Run: `npm run build`
Expected: exit 0, no `[wiki-link]` warnings.

btl-6 already links `[[btl-5#障礙一：看不到自己|…]]`, so btl-5's panel should now group btl-6 under that section. Verify (PowerShell):
```powershell
$c = Get-Content dist/blog/btl-5/index.html -Raw
"section label present:"; $c -match '障礙一：看不到自己'
"grouped btl-6 under a section (label <p> then btl-6 link):"; $c -match '被引用於[\s\S]*障礙一：看不到自己[\s\S]{0,200}href="/blog/btl-6/"'
"backlinks panel still present:"; $c -match '被引用於'
```
Expected: all `True`.

Also confirm a post with no backlinks still omits the panel:
```powershell
(Select-String -Path dist/blog/btl-3/index.html -Pattern '被引用於').Matches.Count
```
Expected: `0`.

- [ ] **Step 5: Run unit tests**

Run: `npm test`
Expected: PASS (22).

- [ ] **Step 6: Commit**

```bash
git add src/lib/backlinks.ts src/pages/blog/[slug].astro src/layouts/PostLayout.astro
git commit -m "feat: group backlinks by referenced section in PostLayout"
```

---

## Self-Review

**Spec coverage:**
- `extractLinks` returns `{slug, anchor}`, same-page ignored; `extractTargets` refactored to use it → Task 1. ✅
- `getBacklinks` returns `{post, anchor}[]`, deduped per (post,anchor), newest first → Task 3 Step 1. ✅
- `groupBySection(backlinks, headings)`: section groups in heading order, 整篇文章 last, stale/null anchors fold into 整篇 → Task 2. ✅
- `[slug].astro` passes `headings` from `render()`; `PostLayout` renders grouped panel, only when non-empty → Task 3 Steps 2–3. ✅
- Blog-only, same-page not counted, schema untouched → no schema/guide files touched. ✅
- Verification uses existing btl-6→btl-5#障礙一 link → Task 3 Step 4. ✅

**Placeholder scan:** none — all steps contain complete code/commands.

**Type/name consistency:** `extractLinks(body) → {slug, anchor}[]` used by `getBacklinks`; `BacklinkRef {post, anchor}` consistent between `backlinks.ts` and `group-backlinks.d.mts`; `groupBySection(backlinks, headings) → {label, sources}[]` consumed by `PostLayout` (`g.label`, `g.sources`, `s.id`, `s.data.title`). `headings` typed as `MarkdownHeading[]` (has `slug`/`text`) and `groupBySection` only reads `slug`/`text`. Anchors from `extractLinks` (github-slugger) match `headings[].slug` (github-slugger). Consistent.
