# 文章列表卡片化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用共用 `PostCard` 元件 + 自動摘要/閱讀時間 helper,把 blog 列表頁(tech/food/tags/首頁)從「標題+日期」升級成資訊豐富的卡片。

**Architecture:** 新增 `src/lib/post.ts`(`toPlainText`/`excerpt`/`readingMinutes`,從 `post.body` 即時計算)與 `src/components/PostCard.astro`;把四個列表頁的 `<ul>` 換成 `PostCard` 堆疊。不改 schema。

**Tech Stack:** Astro 5 content collections、Tailwind v4。Node 可用;以 `npm run build` + grep `dist/`,helper 另以 node 小測試驗證。

**參考 spec:** `docs/superpowers/specs/2026-06-12-post-card-listing-design.md`

**前提:** 在 master(Astro 站上線中)。建議於 feature 分支執行、最後合併以單次部署。

---

## 檔案結構
- Create: `src/lib/post.ts` — `toPlainText` / `excerpt` / `readingMinutes`
- Create: `src/components/PostCard.astro` — 文章卡片
- Modify: `src/pages/tech.astro`、`src/pages/food.astro`、`src/pages/tags/[tag].astro`、`src/pages/index.astro` — 改用 PostCard

**測試策略:** 無測試框架。helper 為純函式 → 用臨時 node 腳本斷言驗證;頁面 → `npm run build` + grep `dist/`。

---

## Task 1: 摘要 / 閱讀時間 helper

**Files:** Create `src/lib/post.ts`

- [ ] **Step 1: 建立 `src/lib/post.ts`**

```ts
export function toPlainText(body: string): string {
  return (body ?? '')
    .replace(/```[\s\S]*?```/g, ' ')           // code fences
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ') // figures (inline SVG)
    .replace(/<[^>]+>/g, ' ')                   // remaining HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')      // markdown images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')    // markdown links -> text
    .replace(/[#>*_`~|]/g, '')                  // markdown syntax chars
    .replace(/\s+/g, ' ')                       // collapse whitespace
    .trim();
}

export function excerpt(body: string, len = 100): string {
  const text = toPlainText(body);
  return text.length > len ? text.slice(0, len) + '…' : text;
}

export function readingMinutes(body: string): number {
  const chars = toPlainText(body).length;
  return Math.max(1, Math.round(chars / 400));
}
```

- [ ] **Step 2: 用臨時 node 腳本驗證純函式邏輯**

建立暫存檔 `tmp-post-test.mjs`(內容把上面三個函式去掉型別貼成 JS,再加斷言):
```js
const toPlainText = (body) => (body ?? '')
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[#>*_`~|]/g, '')
  .replace(/\s+/g, ' ')
  .trim();
const excerpt = (body, len = 100) => { const t = toPlainText(body); return t.length > len ? t.slice(0, len) + '…' : t; };
const readingMinutes = (body) => Math.max(1, Math.round(toPlainText(body).length / 400));

// image-leading body (like ramen) -> image skipped, text kept
const ramen = '![雞豚爆蔥](https://x/y)\n\n口味介於台式和日式中間，麵體是細麵';
console.assert(excerpt(ramen).startsWith('口味介於'), 'FAIL: image not skipped -> ' + excerpt(ramen));
// figure/svg + heading stripped
const btl = '## 成長模型\n\n成長模型描述的是技能變化。\n\n<figure><svg><line/></svg></figure>\n\n後段';
console.assert(excerpt(btl).startsWith('成長模型描述的是'), 'FAIL: heading/figure not stripped -> ' + excerpt(btl));
// truncation
console.assert(excerpt('一'.repeat(200)).endsWith('…'), 'FAIL: not truncated');
console.assert(excerpt('一'.repeat(200)).length === 101, 'FAIL: wrong len');
// reading time >= 1
console.assert(readingMinutes('短') === 1, 'FAIL: min 1 minute');
console.assert(readingMinutes('字'.repeat(800)) === 2, 'FAIL: 800 chars ~ 2 min -> ' + readingMinutes('字'.repeat(800)));
console.log('post.ts logic OK');
```
Run: `node tmp-post-test.mjs`
Expected: prints `post.ts logic OK` with no assertion errors. Then delete it: `rm tmp-post-test.mjs` (do NOT commit the temp file).

- [ ] **Step 3: Commit**
```bash
git add src/lib/post.ts
git commit -m "Add post excerpt + reading-time helper"
```

---

## Task 2: PostCard 元件 + 套用 /tech/

**Files:** Create `src/components/PostCard.astro`;Modify `src/pages/tech.astro`

- [ ] **Step 1: 建立 `src/components/PostCard.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';
import { excerpt, readingMinutes } from '../lib/post';
interface Props { post: CollectionEntry<'blog'>; }
const { post } = Astro.props;
const { title, date, category, tags = [], series, seriesOrder } = post.data;
const summary = excerpt(post.body ?? '');
const mins = readingMinutes(post.body ?? '');
---
<article class="p-4 bg-surface border border-line rounded-lg hover:border-accent transition-colors">
  <h2 class="text-lg font-bold mb-1">
    <a href={`/blog/${post.id}/`} class="text-ink hover:text-accent no-underline">{title}</a>
  </h2>
  <p class="text-muted text-xs mb-2">
    <time datetime={date.toISOString()}>{date.toLocaleDateString('zh-TW')}</time> · {category} · 約 {mins} 分鐘{series ? ` · 📚 ${series} #${seriesOrder}` : ''}
  </p>
  {summary && <p class="text-muted text-sm mb-2">{summary}</p>}
  {tags.length > 0 && (
    <p class="flex flex-wrap gap-2 m-0">
      {tags.map((t) => (
        <a href={`/tags/${encodeURIComponent(t)}/`} class="text-xs bg-base border border-line rounded px-2 py-0.5 text-accent hover:underline no-underline">#{t}</a>
      ))}
    </p>
  )}
</article>
```

- [ ] **Step 2: 改寫 `src/pages/tech.astro` 用 PostCard**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import PostCard from '../components/PostCard.astro';
import { getCollection } from 'astro:content';
const posts = (await getCollection('blog'))
  .filter((p) => p.data.category === 'tech')
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
---
<BaseLayout title="Tech">
  <h1 class="text-2xl font-bold mb-4">Tech</h1>
  <div class="space-y-4">
    {posts.map((p) => <PostCard post={p} />)}
  </div>
</BaseLayout>
```

- [ ] **Step 3: 建置並驗證 /tech/ 卡片**

Run: `npm run build`
Expected: build 成功。
```bash
grep -o "約 [0-9]* 分鐘" dist/tech/index.html | head -1
grep -o "bg-surface border border-line" dist/tech/index.html | head -1
grep -o "📚 成為 Tech Leader 讀書筆記 #3" dist/tech/index.html | head -1
grep -o "/tags/leadership/" dist/tech/index.html | head -1
grep -o "成長模型描述的是" dist/tech/index.html | head -1
```
Expected:出現「約 N 分鐘」、卡片樣式、系列標示「#3」、tag chip 連結、以及自動摘要文字(成長模型那篇的開頭)。

- [ ] **Step 4: Commit**
```bash
git add src/components/PostCard.astro src/pages/tech.astro
git commit -m "Add PostCard component; use it on /tech/"
```

---

## Task 3: 套用 /food/ 與 /tags/[tag]/

**Files:** Modify `src/pages/food.astro`、`src/pages/tags/[tag].astro`

- [ ] **Step 1: 改寫 `src/pages/food.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import PostCard from '../components/PostCard.astro';
import { getCollection } from 'astro:content';
const posts = (await getCollection('blog'))
  .filter((p) => p.data.category === 'food')
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
---
<BaseLayout title="Food">
  <h1 class="text-2xl font-bold mb-4">Food</h1>
  <div class="space-y-4">
    {posts.map((p) => <PostCard post={p} />)}
  </div>
</BaseLayout>
```

- [ ] **Step 2: 改寫 `src/pages/tags/[tag].astro`**(保留 getStaticPaths,只換列表為 PostCard;注意 import 路徑是 `../../`)

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  const tags = [...new Set(posts.flatMap((p) => p.data.tags ?? []))];
  return tags.map((tag) => ({
    params: { tag },
    props: {
      tag,
      posts: posts
        .filter((p) => (p.data.tags ?? []).includes(tag))
        .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf()),
    },
  }));
}

const { tag, posts } = Astro.props;
---
<BaseLayout title={`#${tag}`}>
  <h1 class="text-2xl font-bold mb-4">#{tag}</h1>
  <div class="space-y-4">
    {posts.map((p) => <PostCard post={p} />)}
  </div>
</BaseLayout>
```

- [ ] **Step 3: 建置並驗證**

Run: `npm run build`
Expected: build 成功。
```bash
grep -o "約 [0-9]* 分鐘" dist/food/index.html | head -1
grep -o "口味介於" dist/food/index.html | head -1
grep -o "約 [0-9]* 分鐘" dist/tags/leadership/index.html | head -1
```
Expected:food 頁卡片含「約 N 分鐘」、ramen 的摘要「口味介於…」(圖片開頭被正確跳過);/tags/leadership/ 也是卡片。

- [ ] **Step 4: Commit**
```bash
git add src/pages/food.astro src/pages/tags/[tag].astro
git commit -m "Use PostCard on /food/ and /tags/[tag]/"
```

---

## Task 4: 套用首頁「最新文章」

**Files:** Modify `src/pages/index.astro`

- [ ] **Step 1: 改寫 `src/pages/index.astro`**(保留站名、簡介、Tools/Guides 連結,只把最新文章清單換成 PostCard 堆疊)

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import PostCard from '../components/PostCard.astro';
import { getCollection } from 'astro:content';
const posts = (await getCollection('blog'))
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
  .slice(0, 5);
---
<BaseLayout title="Aidan's Blog">
  <h1 class="text-3xl font-bold mb-2">Aidan's Blog</h1>
  <p class="text-muted mb-8">軟體開發筆記、技術整理與個人興趣。</p>
  <h2 class="text-xl font-bold mb-3">最新文章</h2>
  <div class="space-y-4 mb-8">
    {posts.map((p) => <PostCard post={p} />)}
  </div>
  <p class="text-sm">
    <a href="/tools/" class="text-accent hover:underline">Tools</a> ·
    <a href="/guides/" class="text-accent hover:underline">Guides</a>
  </p>
</BaseLayout>
```

- [ ] **Step 2: 建置並驗證**

Run: `npm run build`
Expected: build 成功。
```bash
grep -o "約 [0-9]* 分鐘" dist/index.html | head -1
grep -o "最新文章" dist/index.html | head -1
grep -o "Tools" dist/index.html | head -1
```
Expected:首頁「最新文章」改為卡片(含「約 N 分鐘」);站名/簡介/Tools/Guides 連結仍在。

- [ ] **Step 3: Commit**
```bash
git add src/pages/index.astro
git commit -m "Use PostCard for home recent posts"
```

---

## 收尾驗證(全部 Task 後)
- [ ] `npm run build` 成功;`npm run dev` 人工確認:/tech/、/food/、/tags/<tag>/、首頁皆為卡片,含摘要、約 N 分鐘、tags chips、系列 #n;hover 邊框變化;`/guides/`、`/tags/`、文章內頁不受影響。

## Self-Review 結果
- **Spec coverage:** helper toPlainText/excerpt/readingMinutes(spec §1)→ Task 1;PostCard(spec §2)→ Task 2;套用 tech/food/tags/home(spec §3)→ Task 2/3/4;不變項(guides/tags-index/nav/schema,spec §4)→ 未動該等檔案。全部對應。
- **Placeholder scan:** 無 TBD;每步附完整程式碼或精確指令;helper 有 node 斷言測試。
- **一致性:** `excerpt`/`readingMinutes`/`toPlainText` 簽章、`PostCard` 的 `post` prop、`post.body ?? ''`、`/blog/${post.id}/`、`/tags/${encodeURIComponent(t)}/`、token class(bg-surface/bg-base/border-line/text-accent/text-ink/text-muted)在各 Task 間一致;import 路徑(tags 為 `../../`,其餘 `../`)正確。
