# 文章分類三層模型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 blog 內容模型加入 tags(交叉主題,含瀏覽頁)與 series(有序系列,文章內串接)兩層,category 維持不變。

**Architecture:** blog schema 新增 `series`/`seriesOrder` 選用欄位;新增 `/tags/[tag]` 與 `/tags/` 路由;`PostLayout` 加入可點 tag chip、系列盒與上/下一篇;回填 BTL 三篇為系列。全部建置期靜態產生。

**Tech Stack:** Astro 5 content collections、getStaticPaths、Tailwind v4。Node 可用,以 `npm run build` + grep `dist/` 驗證。

**參考 spec:** `docs/superpowers/specs/2026-06-10-content-taxonomy-design.md`

**前提:** 在 Astro 站(master 已上線)。建議於 feature 分支執行、最後合併以單次部署。

---

## 檔案結構
- Modify: `src/content.config.ts` — blog schema 加 `series` / `seriesOrder`
- Modify: `src/content/blog/btl-1.md` / `btl-2.md` / `btl-3.md` — 回填系列 front matter
- Create: `src/pages/tags/[tag].astro` — 單一 tag 文章列表
- Create: `src/pages/tags/index.astro` — 所有 tag + 篇數
- Modify: `src/layouts/PostLayout.astro` — tag chip + 系列盒 + 上/下一篇

**測試策略:** 無單元測試框架;每個 Task 以 `npm run build` 成功 + grep `dist/` 產物驗證。

---

## Task 1: Schema 加 series 欄位 + 回填 BTL 系列

**Files:** Modify `src/content.config.ts`、`src/content/blog/btl-1.md`、`btl-2.md`、`btl-3.md`

- [ ] **Step 1: 在 blog schema 加兩個選用欄位**

`src/content.config.ts` 的 blog `schema` 物件內,於 `commentsIssue: z.number().optional(),` 之後加入兩行:
```ts
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
```
(若 `commentsIssue` 不在,加在 `comments` 那行之後即可;tags/category 不動。)

- [ ] **Step 2: 回填 btl-1.md front matter**

在 `src/content/blog/btl-1.md` 的 front matter(`---` 之間)加入兩行(放在 `tags` 區塊之後):
```yaml
series: "成為 Tech Leader 讀書筆記"
seriesOrder: 1
```

- [ ] **Step 3: 回填 btl-2.md**
同上,加到 `src/content/blog/btl-2.md` front matter:
```yaml
series: "成為 Tech Leader 讀書筆記"
seriesOrder: 2
```

- [ ] **Step 4: 回填 btl-3.md**
同上,加到 `src/content/blog/btl-3.md` front matter:
```yaml
series: "成為 Tech Leader 讀書筆記"
seriesOrder: 3
```

- [ ] **Step 5: 建置並驗證**

Run: `npm run build`
Expected: build 成功(schema 接受新欄位,既有文章無誤)。
```bash
grep -l "成為 Tech Leader" src/content/blog/btl-1.md src/content/blog/btl-2.md src/content/blog/btl-3.md
```
Expected:三檔都命中。

- [ ] **Step 6: Commit**
```bash
git add src/content.config.ts src/content/blog/btl-1.md src/content/blog/btl-2.md src/content/blog/btl-3.md
git commit -m "Add series fields to blog schema; backfill BTL series"
```

---

## Task 2: Tags 瀏覽頁

**Files:** Create `src/pages/tags/[tag].astro`、`src/pages/tags/index.astro`

- [ ] **Step 1: 建立 `src/pages/tags/[tag].astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
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
  <ul class="space-y-3 list-none p-0">
    {posts.map((p) => (
      <li>
        <a href={`/blog/${p.id}/`} class="text-accent hover:underline">{p.data.title}</a>
        <span class="text-muted text-sm"> · {p.data.date.toLocaleDateString('zh-TW')}</span>
      </li>
    ))}
  </ul>
</BaseLayout>
```

- [ ] **Step 2: 建立 `src/pages/tags/index.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';
const posts = await getCollection('blog');
const counts = new Map();
for (const p of posts) {
  for (const t of p.data.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
}
const tags = [...counts.entries()].sort((a, b) => b[1] - a[1]);
---
<BaseLayout title="Tags">
  <h1 class="text-2xl font-bold mb-4">Tags</h1>
  <ul class="flex flex-wrap gap-2 list-none p-0">
    {tags.map(([tag, count]) => (
      <li>
        <a href={`/tags/${encodeURIComponent(tag)}/`} class="text-sm bg-surface border border-line rounded px-2 py-1 text-accent hover:underline">#{tag} ({count})</a>
      </li>
    ))}
  </ul>
</BaseLayout>
```

- [ ] **Step 3: 建置並驗證**

Run: `npm run build`
Expected: build 成功。
```bash
ls dist/tags/index.html dist/tags/leadership/index.html
grep -o "領導力\|程式抽籤\|拉麵" dist/tags/leadership/index.html | sort -u
grep -o "leadership (3)" dist/tags/index.html
```
Expected:`/tags/` 與 `/tags/leadership/` 都產生;leadership 頁列出三篇 BTL(領導力…)且**不含**食物文章;index 頁顯示 `leadership (3)`。

- [ ] **Step 4: Commit**
```bash
git add src/pages/tags/
git commit -m "Add tag browse pages (/tags and /tags/[tag])"
```

---

## Task 3: PostLayout — tag chip + 系列盒 + 上/下一篇

**Files:** Modify `src/layouts/PostLayout.astro`

- [ ] **Step 1: 改寫 `src/layouts/PostLayout.astro`**

完整內容(在現有基礎上:加 `getCollection` 計算系列、把 tags 改成 chip、加系列盒與上/下一篇):
```astro
---
import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import BaseLayout from './BaseLayout.astro';
import AuthorCard from '../components/AuthorCard.astro';
import Comments from '../components/Comments.astro';
import 'katex/dist/katex.min.css';
interface Props { post: CollectionEntry<'blog'>; }
const { post } = Astro.props;
const { title, date, category, tags = [], series } = post.data;

let seriesPosts: CollectionEntry<'blog'>[] = [];
let prevPost: CollectionEntry<'blog'> | null = null;
let nextPost: CollectionEntry<'blog'> | null = null;
if (series) {
  seriesPosts = (await getCollection('blog'))
    .filter((p) => p.data.series === series)
    .sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0));
  const idx = seriesPosts.findIndex((p) => p.id === post.id);
  prevPost = idx > 0 ? seriesPosts[idx - 1] : null;
  nextPost = idx >= 0 && idx < seriesPosts.length - 1 ? seriesPosts[idx + 1] : null;
}
---
<BaseLayout title={title}>
  <article>
    <h1 class="text-3xl font-bold mb-2">{title}</h1>
    <p class="text-muted text-sm mb-4">
      <time datetime={date.toISOString()}>{date.toLocaleDateString('zh-TW')}</time> · {category}
    </p>
    {tags.length > 0 && (
      <p class="flex flex-wrap gap-2 mb-6">
        {tags.map((t) => (
          <a href={`/tags/${encodeURIComponent(t)}/`} class="text-xs bg-surface border border-line rounded px-2 py-1 text-accent hover:underline">#{t}</a>
        ))}
      </p>
    )}

    {series && (
      <aside class="bg-surface border border-line rounded p-4 mb-6 text-sm">
        <p class="font-bold mb-2">📚 系列:{series}</p>
        <ol class="list-decimal list-inside space-y-1 m-0">
          {seriesPosts.map((p) => (
            <li>
              {p.id === post.id
                ? <span class="text-ink">{p.data.title}(本篇)</span>
                : <a href={`/blog/${p.id}/`} class="text-accent hover:underline">{p.data.title}</a>}
            </li>
          ))}
        </ol>
      </aside>
    )}

    <div class="prose prose-invert max-w-none">
      <slot />
    </div>

    {series && (prevPost || nextPost) && (
      <nav class="flex justify-between gap-4 mt-8 text-sm">
        <span>{prevPost && <a href={`/blog/${prevPost.id}/`} class="text-accent hover:underline">← {prevPost.data.title}</a>}</span>
        <span>{nextPost && <a href={`/blog/${nextPost.id}/`} class="text-accent hover:underline">{nextPost.data.title} →</a>}</span>
      </nav>
    )}

    <AuthorCard />
    {post.data.comments !== false && <Comments issueNumber={post.data.commentsIssue} />}
  </article>
</BaseLayout>
```

- [ ] **Step 2: 建置並驗證系列盒、上/下一篇、tag chip**

Run: `npm run build`
Expected: build 成功。
```bash
# 系列盒 + 三篇標題 + 本篇高亮(btl-2 應有上一篇 btl-1、下一篇 btl-3)
grep -o "系列:成為 Tech Leader 讀書筆記\|(本篇)" dist/blog/btl-2/index.html | sort -u
grep -o "/blog/btl-1/\|/blog/btl-3/" dist/blog/btl-2/index.html | sort -u
# tag chip 連到 /tags/leadership/
grep -o "/tags/leadership/" dist/blog/btl-2/index.html | head -1
# 非系列文章不應有系列盒
grep -c "系列:" dist/blog/ramen/index.html
```
Expected:btl-2 含系列標題與「(本篇)」、含 btl-1 與 btl-3 連結、含 `/tags/leadership/`;ramen 的「系列:」計數為 0。

- [ ] **Step 3: Commit**
```bash
git add src/layouts/PostLayout.astro
git commit -m "Add tag chips, series box, and prev/next to PostLayout"
```

---

## 收尾驗證(全部 Task 後)
- [ ] `npm run build` 成功;`npm run dev` 人工確認:btl 文章有系列盒(順序 1→2→3、本篇高亮、上/下一篇)與可點 tag chip;`/tags/leadership/` 列三篇、`/tags/` 列 leadership(3);ramen / braised-pork-rice / lottery(無系列、lottery 無 tag)頁面正常、無系列盒。
- [ ] topbar、Tech/Food 列表、RSS、工具頁不受影響。

## Self-Review 結果
- **Spec coverage:** schema series/seriesOrder(spec §1)→ Task 1;tags 瀏覽頁 + index + ASCII slug(spec §2)→ Task 2;PostLayout tag chip + 系列盒 + 上/下一篇(spec §2/§3)→ Task 3;BTL 回填(spec §4)→ Task 1;不做 /series、tags 不上 nav(spec)→ 未建該等檔案,符合。
- **Placeholder scan:** 無 TBD;每個建立/修改步驟附完整內容;驗證指令具體。
- **一致性:** 欄位 `series`/`seriesOrder`、`post.id` 作 slug、`/blog/${id}/`、`/tags/${encodeURIComponent(t)}/`、token class(`bg-surface`/`border-line`/`text-accent`/`text-muted`/`text-ink`)、`getCollection('blog')` 用法在各 Task 間一致;PostLayout 保留既有 `Comments issueNumber={post.data.commentsIssue}` 與 AuthorCard。
