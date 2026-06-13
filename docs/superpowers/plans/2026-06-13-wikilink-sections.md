# Wikilink Section Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `[[wikilink]]` so it can target a section — `[[slug#heading]]` (cross-page) and `[[#heading]]` (same-page) — resolving the heading text to Astro's `github-slugger` anchor.

**Architecture:** The pure module gains `slugifyHeading` (github-slugger) + `parseTarget` (split `slug#section`) and `splitWikiLinks` switches to a context object that knows each post's heading anchors for build-time validation. The remark plugin parses every post's headings into a `headingsMap` and passes the current file's slug for same-page links. Backlinks are unaffected because `extractTargets` strips the `#section`.

**Tech Stack:** Astro 6, markdown remark pipeline (mdast), `github-slugger` (the same lib Astro uses for heading ids), Node 22 built-in `node:test`.

**Spec:** `docs/superpowers/specs/2026-06-13-wikilink-sections-design.md`

---

## Current state (already on master)

- `src/lib/wiki-link.mjs` exports `wikiLinkRegex()`, `splitWikiLinks(value, titleMap, onMissing)`, `extractTargets(body)`.
- `src/lib/wiki-link.d.mts` declares those three.
- `test/wiki-link.test.mjs` has 9 tests calling `splitWikiLinks(value, MAP)`.
- `src/lib/remark-wiki-link.mjs` builds a `titleMap` from `src/content/blog/*.md` and walks the mdast tree, skipping `link`/`linkReference`, expanding `text` nodes via `splitWikiLinks`.
- `src/lib/backlinks.ts` calls `extractTargets`.
- `astro.config.mjs` registers the plugin (no change needed this time).

`github-slugger` is already present transitively (Astro depends on it); confirmed `new (await import('github-slugger')).default().slug('障礙二:沒問題綜合症(No-Problem Syndrome)')` === `'障礙二沒問題綜合症no-problem-syndrome'`, matching the built page's heading id.

---

## File Structure

- `src/lib/wiki-link.mjs` (Modify) — add `slugifyHeading`, `parseTarget`; change `splitWikiLinks` signature to `(value, ctx)`; make `extractTargets` strip sections.
- `src/lib/wiki-link.d.mts` (Modify) — update declarations.
- `test/wiki-link.test.mjs` (Modify) — rewrite calls to the new signature; add section/same-page/validation tests.
- `src/lib/remark-wiki-link.mjs` (Modify) — build `headingsMap`, derive `currentSlug` from the vfile, pass `ctx`.
- `package.json` (Modify) — add `github-slugger` to `dependencies`.
- `src/content/blog/btl-6.md` (Modify) — upgrade the existing btl-5 wikilink to point at a section (real demo + end-to-end verification).
- `src/lib/backlinks.ts` — unchanged.

---

### Task 1: Pure module — section parsing, slugify, context signature

**Files:**
- Modify: `package.json`
- Modify: `src/lib/wiki-link.mjs`
- Modify: `src/lib/wiki-link.d.mts`
- Modify: `test/wiki-link.test.mjs`

- [ ] **Step 1: Add the github-slugger dependency**

Run: `npm install github-slugger`
Expected: `package.json` `dependencies` now includes `"github-slugger": "^<version>"` and install succeeds. (It is already in the tree via Astro; this makes the dependency explicit.)

- [ ] **Step 2: Rewrite the test file (failing tests first)**

Replace the entire contents of `test/wiki-link.test.mjs` with:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitWikiLinks, extractTargets, slugifyHeading, parseTarget } from '../src/lib/wiki-link.mjs';

const titleMap = { 'btl-3': '領導力 - 成長模型', 'btl-5': '領導力 - 創新的三大障礙' };
const headingsMap = { 'btl-5': ['障礙一看不到自己', '反思'], 'btl-6': ['用日記看見自己'] };
const ctx = (extra = {}) => ({ titleMap, headingsMap, currentSlug: 'btl-6', onWarn: () => {}, ...extra });

test('plain text with no wikilink returns a single text node', () => {
  assert.deepEqual(splitWikiLinks('hello world', ctx()), [{ type: 'text', value: 'hello world' }]);
});

test('[[slug]] becomes a link using the target title', () => {
  assert.deepEqual(splitWikiLinks('[[btl-3]]', ctx()), [
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '領導力 - 成長模型' }] },
  ]);
});

test('[[slug|label]] uses the custom label as link text', () => {
  assert.deepEqual(splitWikiLinks('[[btl-3|成長那篇]]', ctx()), [
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '成長那篇' }] },
  ]);
});

test('surrounding text is preserved around the link', () => {
  assert.deepEqual(splitWikiLinks('看 [[btl-3]] 這篇', ctx()), [
    { type: 'text', value: '看 ' },
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '領導力 - 成長模型' }] },
    { type: 'text', value: ' 這篇' },
  ]);
});

test('unknown slug is left as raw text and reported via onWarn', () => {
  const warnings = [];
  const nodes = splitWikiLinks('[[nope]]', ctx({ onWarn: (m) => warnings.push(m) }));
  assert.deepEqual(nodes, [{ type: 'text', value: '[[nope]]' }]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /nope/);
});

test('splitWikiLinks handles multiple links in one string', () => {
  assert.deepEqual(splitWikiLinks('[[btl-3]] 和 [[btl-3|別名]]', ctx()), [
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '領導力 - 成長模型' }] },
    { type: 'text', value: ' 和 ' },
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '別名' }] },
  ]);
});

test('splitWikiLinks returns an empty array for an empty string', () => {
  assert.deepEqual(splitWikiLinks('', ctx()), []);
});

test('[[slug#section]] links to the section anchor, text is the section', () => {
  assert.deepEqual(splitWikiLinks('[[btl-5#障礙一：看不到自己]]', ctx()), [
    { type: 'link', url: '/blog/btl-5/#障礙一看不到自己', children: [{ type: 'text', value: '障礙一：看不到自己' }] },
  ]);
});

test('[[slug#section|label]] uses the label', () => {
  assert.deepEqual(splitWikiLinks('[[btl-5#障礙一：看不到自己|看這段]]', ctx()), [
    { type: 'link', url: '/blog/btl-5/#障礙一看不到自己', children: [{ type: 'text', value: '看這段' }] },
  ]);
});

test('[[#section]] is a same-page link (no /blog/ prefix)', () => {
  assert.deepEqual(splitWikiLinks('[[#反思]]', ctx({ currentSlug: 'btl-5' })), [
    { type: 'link', url: '#反思', children: [{ type: 'text', value: '反思' }] },
  ]);
});

test('unknown section still links but warns', () => {
  const warnings = [];
  const nodes = splitWikiLinks('[[btl-5#不存在的段]]', ctx({ onWarn: (m) => warnings.push(m) }));
  assert.equal(nodes[0].type, 'link');
  assert.equal(nodes[0].url, '/blog/btl-5/#不存在的段');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /不存在的段/);
});

test('extractTargets strips #section and ignores same-page links', () => {
  assert.deepEqual(extractTargets('see [[btl-5#障礙一]] and [[#反思]] and [[btl-6|z]]'), ['btl-5', 'btl-6']);
});

test('slugifyHeading matches github-slugger output', () => {
  assert.equal(slugifyHeading('障礙二：沒問題綜合症（No-Problem Syndrome）'), '障礙二沒問題綜合症no-problem-syndrome');
  assert.equal(slugifyHeading('IQ'), 'iq');
});

test('parseTarget splits slug and section', () => {
  assert.deepEqual(parseTarget('btl-5#障礙一'), { slug: 'btl-5', section: '障礙一' });
  assert.deepEqual(parseTarget('btl-5'), { slug: 'btl-5', section: undefined });
  assert.deepEqual(parseTarget('#反思'), { slug: '', section: '反思' });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `slugifyHeading`/`parseTarget` are not exported yet and the new context-shaped calls don't match the old `(value, titleMap, onMissing)` implementation.

- [ ] **Step 4: Rewrite `src/lib/wiki-link.mjs`**

Replace the entire contents of `src/lib/wiki-link.mjs` with:

```js
// Pure wiki-link parsing. No filesystem I/O — safe to import from Node (remark
// plugin) and from the Vite/Astro side (backlinks helper).
import GithubSlugger from 'github-slugger';

// Matches [[target]] or [[target|label]]. `target` may contain '#section'.
export function wikiLinkRegex() {
  return /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
}

// Heading text -> anchor id, matching Astro's github-slugger output. A fresh
// slugger per call yields the base slug (matches a heading's first occurrence).
export function slugifyHeading(text) {
  return new GithubSlugger().slug(text);
}

// Split a wikilink target into { slug, section } on the first '#'.
// slug === '' means a same-page link; section === undefined means no '#'.
export function parseTarget(raw) {
  const hash = raw.indexOf('#');
  if (hash === -1) return { slug: raw, section: undefined };
  return { slug: raw.slice(0, hash), section: raw.slice(hash + 1) };
}

// Turn a plain-text string into mdast nodes, converting wikilinks to links.
// ctx: { titleMap, headingsMap = {}, currentSlug = null, onWarn }
//  - titleMap:    slug -> post title (for default link text on whole-post links)
//  - headingsMap: slug -> array of heading anchors (for section validation)
//  - currentSlug: the post being rendered (for same-page [[#section]] validation)
//  - onWarn(msg): called for unknown slug or unknown section
export function splitWikiLinks(value, ctx) {
  const { titleMap = {}, headingsMap = {}, currentSlug = null, onWarn } = ctx ?? {};
  const warn = (msg) => { if (onWarn) onWarn(msg); };
  const re = wikiLinkRegex();
  const nodes = [];
  let last = 0;
  let m;
  while ((m = re.exec(value)) !== null) {
    if (m.index > last) nodes.push({ type: 'text', value: value.slice(last, m.index) });
    const raw = m[1].trim();
    const label = m[2] ? m[2].trim() : undefined;
    const { slug, section } = parseTarget(raw);
    const sectionText = section !== undefined ? section.trim() : undefined;
    const hasSection = !!sectionText;
    const link = (url, text) => nodes.push({ type: 'link', url, children: [{ type: 'text', value: text }] });
    const rawText = () => nodes.push({ type: 'text', value: m[0] });

    if (slug === '') {
      // Same-page link: [[#section]]
      if (!hasSection) {
        rawText(); // [[#]] — nothing to point at
      } else {
        const anchor = slugifyHeading(sectionText);
        if (currentSlug && headingsMap[currentSlug] && !headingsMap[currentSlug].includes(anchor)) {
          warn(`unknown section [[#${sectionText}]] in ${currentSlug}`);
        }
        link(`#${anchor}`, label || sectionText);
      }
    } else {
      const title = titleMap[slug];
      if (title === undefined) {
        warn(`unknown slug: [[${slug}]]`);
        rawText();
      } else if (!hasSection) {
        link(`/blog/${slug}/`, label || title);
      } else {
        const anchor = slugifyHeading(sectionText);
        if (headingsMap[slug] && !headingsMap[slug].includes(anchor)) {
          warn(`unknown section [[${slug}#${sectionText}]]`);
        }
        link(`/blog/${slug}/#${anchor}`, label || sectionText);
      }
    }
    last = m.index + m[0].length;
  }
  if (last < value.length) nodes.push({ type: 'text', value: value.slice(last) });
  return nodes;
}

// Collect referenced base slugs (section stripped; same-page links ignored).
export function extractTargets(body) {
  const re = wikiLinkRegex();
  const targets = [];
  let m;
  while ((m = re.exec(body ?? '')) !== null) {
    const { slug } = parseTarget(m[1].trim());
    if (slug !== '') targets.push(slug);
  }
  return targets;
}
```

- [ ] **Step 5: Update `src/lib/wiki-link.d.mts`**

Replace the entire contents of `src/lib/wiki-link.d.mts` with:

```ts
export interface MdastNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdastNode[];
}

export interface WikiLinkContext {
  titleMap: Record<string, string>;
  headingsMap?: Record<string, string[]>;
  currentSlug?: string | null;
  onWarn?: (message: string) => void;
}

export function wikiLinkRegex(): RegExp;
export function slugifyHeading(text: string): string;
export function parseTarget(raw: string): { slug: string; section: string | undefined };
export function splitWikiLinks(value: string, ctx: WikiLinkContext): MdastNode[];
export function extractTargets(body: string): string[];
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all 14 tests pass.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/wiki-link.mjs src/lib/wiki-link.d.mts test/wiki-link.test.mjs
git commit -m "feat: wikilink section parsing + slugify (pure module)"
```

---

### Task 2: remark plugin — headingsMap + current slug + context

**Files:**
- Modify: `src/lib/remark-wiki-link.mjs`

- [ ] **Step 1: Rewrite `src/lib/remark-wiki-link.mjs`**

Replace the entire contents of `src/lib/remark-wiki-link.mjs` with:

```js
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import GithubSlugger from 'github-slugger';
import { splitWikiLinks } from './wiki-link.mjs';

const BLOG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'blog');

// Heading anchors for one post body, matching Astro's github-slugger ids.
// Skips the front-matter block and fenced code blocks; one slugger per file
// reproduces Astro's per-document de-duplication.
function parseHeadings(raw) {
  const slugger = new GithubSlugger();
  const anchors = [];
  const lines = raw.split(/\r?\n/);
  let inFrontMatter = false;
  let inFence = false;
  let fenceChar = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line.trim() === '---') { inFrontMatter = true; continue; }
    if (inFrontMatter) { if (line.trim() === '---') inFrontMatter = false; continue; }
    const fence = line.match(/^(```+|~~~+)/);
    if (fence) {
      if (!inFence) { inFence = true; fenceChar = fence[1][0]; }
      else if (line.trim().startsWith(fenceChar)) { inFence = false; }
      continue;
    }
    if (inFence) continue;
    const h = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (h) anchors.push(slugger.slug(h[1]));
  }
  return anchors;
}

function buildMaps() {
  const titleMap = {};
  const headingsMap = {};
  for (const file of readdirSync(BLOG_DIR)) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace(/\.md$/, '');
    const raw = readFileSync(join(BLOG_DIR, file), 'utf8');
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const block = fm ? fm[1] : raw;
    const t = block.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    titleMap[slug] = t ? t[1] : slug;
    headingsMap[slug] = parseHeadings(raw);
  }
  return { titleMap, headingsMap };
}

let cachedMaps = null; // built once per process; restart `astro dev` after adding a post

export default function remarkWikiLink() {
  if (!cachedMaps) cachedMaps = buildMaps();
  const { titleMap, headingsMap } = cachedMaps;
  const onWarn = (msg) => console.warn(`[wiki-link] ${msg}`);

  return (tree, file) => {
    const path = file?.path || (file?.history && file.history[0]) || '';
    const currentSlug = path ? basename(path).replace(/\.md$/, '') : null;
    const ctx = { titleMap, headingsMap, currentSlug, onWarn };

    const walk = (node) => {
      if (!Array.isArray(node.children)) return;
      const out = [];
      for (const child of node.children) {
        if (child.type === 'link' || child.type === 'linkReference') {
          out.push(child); // do not recurse into existing links (avoid nested anchors)
        } else if (child.type === 'text' && child.value.includes('[[')) {
          out.push(...splitWikiLinks(child.value, ctx));
        } else {
          walk(child);
          out.push(child);
        }
      }
      node.children = out;
    };
    walk(tree);
  };
}
```

- [ ] **Step 2: Build and verify nothing regressed**

Run: `npm run build`
Expected: exit 0. Existing posts only use whole-post wikilinks (no `#section`), so section validation never runs — there should be **no** `[wiki-link]` warnings. The existing btl-5 ↔ btl-6 whole-post links must still render.

Verify the existing links and backlinks are intact:

```powershell
Select-String -Path dist/blog/btl-5/index.html -Pattern 'href="/blog/btl-6/">寫日記</a>'
Select-String -Path dist/blog/btl-5/index.html -Pattern '被引用於'
```
Expected: both match.

- [ ] **Step 3: Run unit tests again**

Run: `npm test`
Expected: PASS — all 14 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/remark-wiki-link.mjs
git commit -m "feat: parse heading anchors + pass section context to wikilinks"
```

---

### Task 3: Real section cross-link (demo + end-to-end verification)

**Files:**
- Modify: `src/content/blog/btl-6.md`

- [ ] **Step 1: Point btl-6's existing wikilink at the exact section**

In `src/content/blog/btl-6.md`, the opening line currently contains:
```
[[btl-5|「看不到自己」是創新的第一道障礙]]
```
Replace that wikilink with a section-targeted one (keep the surrounding sentence unchanged):
```
[[btl-5#障礙一：看不到自己|「看不到自己」是創新的第一道障礙]]
```
(Use the full-width colon `：` exactly as it appears in btl-5's heading `### 障礙一：看不到自己`.)

- [ ] **Step 2: Build and verify the section anchor + unchanged backlinks**

Run: `npm run build`
Then:

```powershell
Select-String -Path dist/blog/btl-6/index.html -Pattern 'href="/blog/btl-5/#障礙一看不到自己"'
Select-String -Path dist/blog/btl-5/index.html -Pattern '被引用於[\s\S]{0,400}href="/blog/btl-6/"'
```
Expected:
- First command matches — btl-6's link now points at `/blog/btl-5/#障礙一看不到自己`.
- Second command matches — btl-5 still lists btl-6 under 被引用於 (section was stripped by `extractTargets`, so the backlink is preserved).
- Build log shows **no** `[wiki-link]` warning (the section `障礙一：看不到自己` exists in btl-5).

- [ ] **Step 3: Confirm the target id exists on the btl-5 page**

```powershell
Select-String -Path dist/blog/btl-5/index.html -Pattern 'id="障礙一看不到自己"'
```
Expected: matches — the anchor the link points to is a real heading id on the target page.

- [ ] **Step 4: Commit**

```bash
git add src/content/blog/btl-6.md
git commit -m "content: link btl-6 to btl-5's specific section"
```

---

## Self-Review

**Spec coverage:**
- `[[slug#section]]` cross-page → Task 1 (`splitWikiLinks` cross-page+section branch) + Task 3 (real use). ✅
- `[[#section]]` same-page → Task 1 (slug === '' branch) + unit test. ✅
- `#`-text written as heading text, slugified via github-slugger → `slugifyHeading` (Task 1), confirmed matching Astro. ✅
- Default text = section text (no label) / title (no section) / label → Task 1 `link(..., label || sectionText/title)`. ✅
- Build-time validation + warn (unknown section still links) → Task 1 `warn(...)`, Task 2 `headingsMap`/`onWarn`. ✅
- `extractTargets` strips section, ignores same-page → Task 1; backlinks unaffected → Task 2 Step 2 + Task 3 Step 2 verify. ✅
- `headingsMap` from fence-aware heading parse, per-file slugger, currentSlug from vfile → Task 2. ✅
- New `github-slugger` dependency → Task 1 Step 1. ✅
- Not in scope (graph, guides, duplicate-heading `-n`) → not touched. ✅

**Placeholder scan:** none — every code/command step is complete.

**Type/name consistency:** `splitWikiLinks(value, ctx)`, `ctx={titleMap, headingsMap, currentSlug, onWarn}`, `slugifyHeading(text)`, `parseTarget(raw)→{slug,section}`, `extractTargets(body)` are used identically across the module, declarations, tests, and plugin. The plugin's `headingsMap[slug]` is `string[]` and `splitWikiLinks` uses `.includes(anchor)` — consistent. Node shapes (`type`/`url`/`value`/`children`) match between `link()`/`rawText()` output and the test assertions.
