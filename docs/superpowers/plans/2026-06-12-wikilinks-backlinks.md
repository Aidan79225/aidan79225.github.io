# Wikilinks + Backlinks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let blog posts cross-link via `[[slug]]` / `[[slug|label]]` and show a "被引用於" (backlinks) list at the bottom of each post.

**Architecture:** A small pure module parses wiki-link syntax (shared by both features). A remark plugin uses it to rewrite `[[...]]` in markdown bodies into links at build time (resolving slug→title from front matter via `fs`). A backlinks helper scans all post bodies for link targets and `PostLayout.astro` renders the inbound links.

**Tech Stack:** Astro 6 (static), markdown remark pipeline (mdast), Node 22 built-in test runner (`node:test`). No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-06-12-wikilinks-backlinks-design.md`

---

## File Structure

- `src/lib/wiki-link.mjs` (Create) — pure parsing logic, no I/O. Exports `wikiLinkRegex()`, `splitWikiLinks(value, titleMap, onMissing?)` → mdast nodes, `extractTargets(body)` → slug strings. Plain `.mjs` so the Node-context remark plugin (loaded by `astro.config.mjs`) can import it.
- `src/lib/wiki-link.d.mts` (Create) — type declarations for the `.mjs` (keeps the `.ts` consumer and `astro check` happy).
- `test/wiki-link.test.mjs` (Create) — unit tests for the pure logic.
- `src/lib/remark-wiki-link.mjs` (Create) — remark plugin: builds slug→title map from `src/content/blog/*.md` via `fs`, rewrites `[[...]]` text nodes using `splitWikiLinks`.
- `astro.config.mjs` (Modify) — register the remark plugin.
- `src/lib/backlinks.ts` (Create) — `getBacklinks(targetSlug)` using `getCollection('blog')` + `extractTargets`.
- `src/layouts/PostLayout.astro` (Modify) — render the "被引用於" aside.
- `src/content/blog/btl-5.md`, `src/content/blog/btl-6.md` (Modify) — demo cross-links.
- `package.json` (Modify) — add `test` script.

---

### Task 1: Pure wiki-link parsing module + unit tests

**Files:**
- Create: `src/lib/wiki-link.mjs`
- Create: `src/lib/wiki-link.d.mts`
- Create: `test/wiki-link.test.mjs`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Write the failing test**

Create `test/wiki-link.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitWikiLinks, extractTargets } from '../src/lib/wiki-link.mjs';

const MAP = { 'btl-3': '領導力 - 成長模型' };

test('plain text with no wikilink returns a single text node', () => {
  assert.deepEqual(splitWikiLinks('hello world', MAP), [
    { type: 'text', value: 'hello world' },
  ]);
});

test('[[slug]] becomes a link using the target title', () => {
  assert.deepEqual(splitWikiLinks('[[btl-3]]', MAP), [
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '領導力 - 成長模型' }] },
  ]);
});

test('[[slug|label]] uses the custom label as link text', () => {
  assert.deepEqual(splitWikiLinks('[[btl-3|成長那篇]]', MAP), [
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '成長那篇' }] },
  ]);
});

test('surrounding text is preserved around the link', () => {
  assert.deepEqual(splitWikiLinks('看 [[btl-3]] 這篇', MAP), [
    { type: 'text', value: '看 ' },
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '領導力 - 成長模型' }] },
    { type: 'text', value: ' 這篇' },
  ]);
});

test('unknown slug is left as raw text and reported via onMissing', () => {
  const missing = [];
  const nodes = splitWikiLinks('[[nope]]', MAP, (s) => missing.push(s));
  assert.deepEqual(nodes, [{ type: 'text', value: '[[nope]]' }]);
  assert.deepEqual(missing, ['nope']);
});

test('extractTargets returns slugs, ignoring labels', () => {
  assert.deepEqual(extractTargets('a [[x]] b [[y|z]] c'), ['x', 'y']);
});

test('extractTargets returns an empty array when there are no links', () => {
  assert.deepEqual(extractTargets('no links here'), []);
});
```

- [ ] **Step 2: Add the `test` script to `package.json`**

In `package.json`, add a `test` entry to `scripts` (after `"preview": "astro preview"`):

```json
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "node --test test/"
  },
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/lib/wiki-link.mjs'` (the module does not exist yet).

- [ ] **Step 4: Create the pure module**

Create `src/lib/wiki-link.mjs`:

```js
// Pure wiki-link parsing. No I/O — safe to import from Node (remark plugin)
// and from the Vite/Astro side (backlinks helper).

// Matches [[slug]] or [[slug|label]]. Inside the char class, \] is a literal
// closing bracket and | is a literal pipe (the alternation meaning does not
// apply inside [...]).
export function wikiLinkRegex() {
  return /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
}

// Split a plain-text string into an array of mdast nodes, turning each
// [[slug]] / [[slug|label]] into a link node. Unknown slugs (not in titleMap)
// are kept verbatim as text and reported through onMissing.
export function splitWikiLinks(value, titleMap, onMissing) {
  const re = wikiLinkRegex();
  const nodes = [];
  let last = 0;
  let m;
  while ((m = re.exec(value)) !== null) {
    if (m.index > last) {
      nodes.push({ type: 'text', value: value.slice(last, m.index) });
    }
    const slug = m[1].trim();
    const label = m[2] ? m[2].trim() : undefined;
    const title = titleMap[slug];
    if (title === undefined) {
      if (onMissing) onMissing(slug);
      nodes.push({ type: 'text', value: m[0] });
    } else {
      nodes.push({
        type: 'link',
        url: `/blog/${slug}/`,
        children: [{ type: 'text', value: label || title }],
      });
    }
    last = m.index + m[0].length;
  }
  if (last < value.length) {
    nodes.push({ type: 'text', value: value.slice(last) });
  }
  return nodes;
}

// Collect every referenced slug in a raw markdown body (labels ignored).
export function extractTargets(body) {
  const re = wikiLinkRegex();
  const targets = [];
  let m;
  while ((m = re.exec(body ?? '')) !== null) {
    targets.push(m[1].trim());
  }
  return targets;
}
```

- [ ] **Step 5: Create the type declarations**

Create `src/lib/wiki-link.d.mts`:

```ts
export interface MdastNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdastNode[];
}

export function wikiLinkRegex(): RegExp;
export function splitWikiLinks(
  value: string,
  titleMap: Record<string, string>,
  onMissing?: (slug: string) => void
): MdastNode[];
export function extractTargets(body: string): string[];
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all 7 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/wiki-link.mjs src/lib/wiki-link.d.mts test/wiki-link.test.mjs package.json
git commit -m "feat: add pure wiki-link parsing module with tests"
```

---

### Task 2: remark plugin + register in Astro config

**Files:**
- Create: `src/lib/remark-wiki-link.mjs`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Create the remark plugin**

Create `src/lib/remark-wiki-link.mjs`:

```js
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { splitWikiLinks } from './wiki-link.mjs';

const BLOG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'blog');

// Read each post's front-matter title once, keyed by slug (filename without .md).
function buildTitleMap() {
  const map = {};
  for (const file of readdirSync(BLOG_DIR)) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace(/\.md$/, '');
    const raw = readFileSync(join(BLOG_DIR, file), 'utf8');
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const block = fm ? fm[1] : raw;
    const t = block.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    map[slug] = t ? t[1] : slug;
  }
  return map;
}

let cachedMap = null;

export default function remarkWikiLink() {
  if (!cachedMap) cachedMap = buildTitleMap();
  const titleMap = cachedMap;
  const onMissing = (slug) => console.warn(`[wiki-link] unknown slug: [[${slug}]]`);

  const walk = (node) => {
    if (!Array.isArray(node.children)) return;
    const out = [];
    for (const child of node.children) {
      if (child.type === 'link') {
        out.push(child); // do not recurse into existing links (avoid nested anchors)
      } else if (child.type === 'text' && child.value.includes('[[')) {
        out.push(...splitWikiLinks(child.value, titleMap, onMissing));
      } else {
        walk(child);
        out.push(child);
      }
    }
    node.children = out;
  };

  return (tree) => walk(tree);
}
```

- [ ] **Step 2: Register the plugin in `astro.config.mjs`**

Add the import and include it in `markdown.remarkPlugins`:

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkWikiLink from './src/lib/remark-wiki-link.mjs';

export default defineConfig({
  site: 'https://aidan79225.github.io',
  base: '/',
  integrations: [react()],
  markdown: {
    remarkPlugins: [remarkMath, remarkWikiLink],
    rehypePlugins: [rehypeKatex],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 3: Verify the build still succeeds**

Run: `npm run build`
Expected: build completes with exit code 0. No post contains `[[...]]` yet, so output is unchanged, but the plugin must load and build the title map without error. (No `[wiki-link] unknown slug` warnings expected.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/remark-wiki-link.mjs astro.config.mjs
git commit -m "feat: rewrite [[wikilinks]] in posts via remark plugin"
```

---

### Task 3: Demo cross-links between btl-5 and btl-6

**Files:**
- Modify: `src/content/blog/btl-5.md`
- Modify: `src/content/blog/btl-6.md`

- [ ] **Step 1: Add a link from btl-5 (障礙一) to btl-6**

In `src/content/blog/btl-5.md`, replace the last sentence of 障礙一 (line 17):

Find:
```
創新的前提，是先能誠實地觀察自己。
```
Replace with:
```
創新的前提，是先能誠實地觀察自己——而[[btl-6|寫日記]]正是逼自己看見自己的好方法。
```

- [ ] **Step 2: Add a link from btl-6 (opening) back to btl-5**

In `src/content/blog/btl-6.md`, edit the opening sentence (line 14):

Find:
```
上一篇談到，「看不到自己」是創新的第一道障礙——你改不掉一個你沒看見的東西。
```
Replace with:
```
上一篇談到，[[btl-5|「看不到自己」是創新的第一道障礙]]——你改不掉一個你沒看見的東西。
```

- [ ] **Step 3: Build and verify both wikilinks render as anchors**

Run: `npm run build`
Then verify the rendered anchors exist (match the unique link text, since the series box already links these two by URL):

```powershell
Select-String -Path dist/blog/btl-5/index.html -Pattern '>寫日記</a>'
Select-String -Path dist/blog/btl-6/index.html -Pattern '看不到自己」是創新的第一道障礙</a>'
```
Expected: each command prints one matching line. Also confirm the href is correct:
```powershell
Select-String -Path dist/blog/btl-5/index.html -Pattern 'href="/blog/btl-6/">寫日記</a>'
Select-String -Path dist/blog/btl-6/index.html -Pattern 'href="/blog/btl-5/">「看不到自己」是創新的第一道障礙</a>'
```
Expected: each prints one matching line.

- [ ] **Step 4: Commit**

```bash
git add src/content/blog/btl-5.md src/content/blog/btl-6.md
git commit -m "content: cross-link btl-5 and btl-6 with wikilinks"
```

---

### Task 4: Backlinks helper + render in PostLayout

**Files:**
- Create: `src/lib/backlinks.ts`
- Modify: `src/layouts/PostLayout.astro`

- [ ] **Step 1: Create the backlinks helper**

Create `src/lib/backlinks.ts`:

```ts
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { extractTargets } from './wiki-link.mjs';

// Posts whose body links to targetSlug via a wikilink, newest first.
export async function getBacklinks(
  targetSlug: string
): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog');
  return posts
    .filter((p) => p.id !== targetSlug && extractTargets(p.body ?? '').includes(targetSlug))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
```

- [ ] **Step 2: Wire backlinks into `PostLayout.astro`**

In `src/layouts/PostLayout.astro`, add the import after the existing component imports (after line 6, `import Comments ...`):

```astro
import { getBacklinks } from '../lib/backlinks';
```

Then, in the frontmatter script, after the series block (after line 22, the closing `}` of `if (series) {`), compute backlinks:

```astro
const backlinks = await getBacklinks(post.id);
```

- [ ] **Step 3: Render the backlinks aside**

In `src/layouts/PostLayout.astro`, insert this block between the prev/next `</nav>` block (line 62) and `<AuthorCard />` (line 64):

```astro
    {backlinks.length > 0 && (
      <aside class="mt-12 pt-6 border-t border-line text-sm">
        <p class="font-bold mb-2">🔗 被引用於</p>
        <ul class="list-none p-0 m-0 space-y-1">
          {backlinks.map((b) => (
            <li><a href={`/blog/${b.id}/`} class="text-accent hover:underline">{b.data.title}</a></li>
          ))}
        </ul>
      </aside>
    )}
```

- [ ] **Step 4: Build and verify backlinks render**

Run: `npm run build`
Then verify the mutual backlinks appear:

```powershell
Select-String -Path dist/blog/btl-5/index.html -Pattern '被引用於'
Select-String -Path dist/blog/btl-6/index.html -Pattern '被引用於'
Select-String -Path dist/blog/btl-5/index.html -Pattern '被引用於[\s\S]{0,400}href="/blog/btl-6/"'
Select-String -Path dist/blog/btl-6/index.html -Pattern '被引用於[\s\S]{0,400}href="/blog/btl-5/"'
```
Expected: the first two each print a match; the last two each print a match (btl-5's backlink section links to btl-6 and vice versa).

- [ ] **Step 5: Verify a post with no inbound links has no backlinks section**

```powershell
Select-String -Path dist/blog/btl-3/index.html -Pattern '被引用於'
```
Expected: NO match (btl-3 is not referenced by any wikilink, so the aside is omitted).

- [ ] **Step 6: Run the unit tests once more**

Run: `npm test`
Expected: PASS — all 7 tests still pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/backlinks.ts src/layouts/PostLayout.astro
git commit -m "feat: show backlinks (被引用於) on each post"
```

---

## Self-Review

**Spec coverage:**
- `[[slug]]` / `[[slug|label]]` with auto title → Task 1 (`splitWikiLinks`) + Task 2 (plugin). ✅
- Slug-based keys, link to `/blog/<slug>/` → Task 1. ✅
- Broken slug kept as raw text + warn → Task 1 (`onMissing`, unit-tested) + Task 2 (`console.warn`). ✅
- remark plugin builds slug→title from fs, no new deps, manual tree walk skipping `link` nodes → Task 2. ✅
- Registered alongside remark-math → Task 2 Step 2. ✅
- Backlinks helper scanning bodies via shared regex → Task 4 Step 1. ✅
- "🔗 被引用於" aside, only when non-empty, newest first → Task 4 Steps 1 & 3. ✅
- Blog-only, no schema change → no schema files touched. ✅
- Demo btl-5 ↔ btl-6 cross-links → Task 3. ✅
- Verification (links render, backlinks show, broken→text, no-inbound→no aside) → Task 3 Step 3, Task 4 Steps 4–5, Task 1 missing-slug test. ✅
- NOT in scope: knowledge graph, atomic notes, guides → not touched. ✅

**Placeholder scan:** none — all code blocks are complete.

**Type/name consistency:** `splitWikiLinks(value, titleMap, onMissing)`, `extractTargets(body)`, `wikiLinkRegex()`, `getBacklinks(targetSlug)` used identically across module, declarations, tests, plugin, and helper. Node shapes (`type`/`value`/`url`/`children`) match between `splitWikiLinks` output and the unit-test assertions.
