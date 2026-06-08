# Astro 遷移・子專案 B:內容遷移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Jekyll 的 5 篇文章、About、Tech/Food 列表、作者 bio、utterances 留言、KaTeX 數學、RSS、以及 odoo 指南,全部遷移到 `astro` 分支的 Astro 站。

**Architecture:** 用 Astro Content Layer 建 `blog`(markdown)與 `guides`(markdown)兩個 collection;文章走 `/blog/<slug>/` 動態路由 + `PostLayout`(Tailwind typography `prose-invert`、KaTeX、作者卡、utterances);Tech/Food 為過濾視圖;odoo 指南轉成 markdown 進 guides collection。所有工作在 `astro` 分支,Jekyll(master)不動。

**Tech Stack:** Astro 5 content collections、Tailwind v4 + @tailwindcss/typography、remark-math + rehype-katex、@astrojs/rss、utterances、Shiki(內建)。Node v24 / npm 可用。

**參考 spec:** `docs/superpowers/specs/2026-06-08-astro-content-migration-design.md`

**前提:** 目前在 `astro` 分支(子專案 A 已完成)。**所有指令在 `astro` 分支執行,勿動 Jekyll 檔。**

---

## 檔案結構
- `astro.config.mjs`(改)— 加 markdown remark/rehype 數學外掛
- `src/styles/global.css`(改)— 加 typography plugin
- `src/content.config.ts`(建)— blog + guides collections
- `src/content/blog/*.md`(建 ×5)— 遷移文章
- `src/layouts/PostLayout.astro`(建)— 文章版型
- `src/pages/blog/[slug].astro`(建)— 文章路由
- `src/pages/tech.astro`、`src/pages/food.astro`(建)— 分類列表
- `src/pages/about.astro`(建)— About
- `src/data/author.ts`、`src/components/AuthorCard.astro`、`src/components/Comments.astro`(建)— 作者/留言
- `public/assets/images/avatar.webp`(複製)— 頭像
- `src/pages/rss.xml.js`(建)— RSS
- `src/content/guides/odoo-usage-guide.md`(建)、`src/pages/guides/index.astro`、`src/pages/guides/[slug].astro`(建)— Guides

**測試策略:** 無單元測試框架。每個 Task 以 `npm run build` 成功 + grep `dist/` 產物驗證;最後本機 `npm run dev` 人工確認。Node/npm 已確認可用。

**post body 來源:** 文章/指南的「內文」一律從 master 取原文(`git show master:<path>`),只改 front matter / 格式,避免重貼造成漂移。

---

## Task 1: 內容 plumbing(數學、typography、collections 設定)

**Files:** 改 `astro.config.mjs`、`src/styles/global.css`;建 `src/content.config.ts`

- [ ] **Step 1: 安裝相依**

Run:
```bash
npm install remark-math rehype-katex katex @astrojs/rss @tailwindcss/typography
```
Expected: 安裝成功。

- [ ] **Step 2: 更新 `astro.config.mjs`(加數學 markdown 外掛)**

完整內容:
```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://aidan79225.github.io',
  base: '/',
  integrations: [react()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 3: 在 `src/styles/global.css` 加 typography plugin**

在 `@import "tailwindcss";` 那行下面加一行(其餘 `@theme` 區塊不動):
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

- [ ] **Step 4: 建立 `src/content.config.ts`**

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['tech', 'food']),
    tags: z.array(z.string()).optional(),
    comments: z.boolean().default(true),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

export const collections = { blog, guides };
```

- [ ] **Step 5: 建置(空 collection 可通過)**

Run: `npm run build`
Expected: build 成功(collection 目前無檔,Astro 視為空集合,不報錯)。

- [ ] **Step 6: Commit**

```bash
git add astro.config.mjs src/styles/global.css src/content.config.ts package.json package-lock.json
git commit -m "Add content collections, KaTeX math, and typography plugin"
```

---

## Task 2: 遷移 5 篇文章 + PostLayout + 文章路由

**Files:** 建 `src/content/blog/{ramen,braised-pork-rice,lottery,btl-1,btl-2}.md`、`src/layouts/PostLayout.astro`、`src/pages/blog/[slug].astro`

- [ ] **Step 1: 建立 5 個文章 markdown(新 front matter + 原 body)**

對每篇:用 `git show master:_posts/<原檔>.md` 取得原文,**移除原 front matter**,換成下面的新 front matter,**body 原樣保留**。對應如下:

`src/content/blog/ramen.md`(原 `_posts/2025-09-19-ramen.md`):
```yaml
---
title: "林口唯一一家我會回訪的拉麵 - 天鳥拉麵"
date: 2025-09-19
category: food
comments: true
---
```
`src/content/blog/braised-pork-rice.md`(原 `2025-09-20-braised-pork-rice.md`):
```yaml
---
title: "三重滷肉飯 - 店小二"
date: 2025-09-20
category: food
---
```
`src/content/blog/lottery.md`(原 `2025-09-20-lottery.md`):
```yaml
---
title: "程式抽籤被質疑黑箱該如何處理"
date: 2025-09-20
category: tech
---
```
`src/content/blog/btl-1.md`(原 `2025-10-12-BTL-1.md`):
```yaml
---
title: "領導力"
date: 2025-10-12
category: tech
tags:
  - leadership
comments: true
---
```
`src/content/blog/btl-2.md`(原 `2025-10-13-BTL-2.md`):
```yaml
---
title: "領導力 - MOI"
date: 2025-11-30
category: tech
tags:
  - leadership
comments: true
---
```

- [ ] **Step 2: 建立 `src/layouts/PostLayout.astro`**

```astro
---
import BaseLayout from './BaseLayout.astro';
import 'katex/dist/katex.min.css';
const { post } = Astro.props;
const { title, date, category, tags = [] } = post.data;
---
<BaseLayout title={title}>
  <article>
    <h1 class="text-3xl font-bold mb-2">{title}</h1>
    <p class="text-muted text-sm mb-6">
      <time datetime={date.toISOString()}>{date.toLocaleDateString('zh-TW')}</time> · {category}{tags.length ? ` · ${tags.join(', ')}` : ''}
    </p>
    <div class="prose prose-invert max-w-none">
      <slot />
    </div>
  </article>
</BaseLayout>
```

- [ ] **Step 3: 建立 `src/pages/blog/[slug].astro`**

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
const { Content } = await render(post);
---
<PostLayout post={post}>
  <Content />
</PostLayout>
```

- [ ] **Step 4: 建置並驗證 5 篇 + 數學 + prose**

Run: `npm run build`
Expected: build 成功。驗證:
```bash
ls dist/blog/ramen/index.html dist/blog/braised-pork-rice/index.html dist/blog/lottery/index.html dist/blog/btl-1/index.html dist/blog/btl-2/index.html
grep -l "katex" dist/blog/lottery/index.html
grep -o "prose" dist/blog/btl-1/index.html | head -1
grep -o "nextcloud.aidan.tw" dist/blog/ramen/index.html | head -1
```
Expected:五個檔都在;lottery 含 `katex`(數學已渲染);btl-1 含 `prose`;ramen 含外部圖片 URL。

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/ src/layouts/PostLayout.astro src/pages/blog/
git commit -m "Migrate blog posts with PostLayout and KaTeX rendering"
```

---

## Task 3: Tech / Food 分類列表頁

**Files:** 建 `src/pages/tech.astro`、`src/pages/food.astro`

- [ ] **Step 1: 建立 `src/pages/tech.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';
const posts = (await getCollection('blog'))
  .filter((p) => p.data.category === 'tech')
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
---
<BaseLayout title="Tech">
  <h1 class="text-2xl font-bold mb-4">Tech</h1>
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

- [ ] **Step 2: 建立 `src/pages/food.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';
const posts = (await getCollection('blog'))
  .filter((p) => p.data.category === 'food')
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
---
<BaseLayout title="Food">
  <h1 class="text-2xl font-bold mb-4">Food</h1>
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

- [ ] **Step 3: 建置並驗證分類過濾**

Run: `npm run build`
Expected: build 成功。
```bash
grep -o "領導力\|程式抽籤" dist/tech/index.html | sort -u
grep -o "拉麵\|滷肉飯" dist/food/index.html | sort -u
```
Expected:tech 頁含 tech 文章標題(領導力、程式抽籤)、不含食物;food 頁含 food 文章(拉麵、滷肉飯)。

- [ ] **Step 4: Commit**

```bash
git add src/pages/tech.astro src/pages/food.astro
git commit -m "Add Tech and Food category listing pages"
```

---

## Task 4: About 頁

**Files:** 建 `src/pages/about.astro`

- [ ] **Step 1: 建立 `src/pages/about.astro`(內容取自 master `_pages/about.md`)**

用 `git show master:_pages/about.md` 取得其 markdown body(front matter 之後的內容)。建立:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="About">
  <div class="prose prose-invert max-w-none">
    <!-- 把 about.md 的 markdown body 轉成對應 HTML 放這裡;
         例如 "## 👋 Hi, 我是 Aidan" → <h2>,清單 → <ul><li>,連結 → <a> -->
  </div>
</BaseLayout>
```
實作:把 about.md 的 markdown 內容轉為等義 HTML 填入 `.prose` 容器(標題、清單、連結、分隔線)。保持文字與連結與原文一致(GitHub / LinkedIn / Email)。

- [ ] **Step 2: 建置並驗證**

Run: `npm run build`
Expected: build 成功;`grep -o "我是 Aidan" dist/about/index.html` 命中;GitHub / LinkedIn 連結在。

- [ ] **Step 3: Commit**

```bash
git add src/pages/about.astro
git commit -m "Add About page"
```

---

## Task 5: 作者 bio + utterances 留言

**Files:** 建 `src/data/author.ts`、`src/components/AuthorCard.astro`、`src/components/Comments.astro`;複製 `public/assets/images/avatar.webp`;改 `src/layouts/PostLayout.astro`

- [ ] **Step 1: 複製頭像到 public/(若 master 有該檔)**

Run:
```bash
mkdir -p public/assets/images
git show master:assets/images/avatar.webp > public/assets/images/avatar.webp 2>/dev/null && echo "avatar copied" || echo "no avatar on master"
```
若無頭像檔,AuthorCard 的 `<img>` 仍會引用該路徑(部署後補圖即可);不阻擋。

- [ ] **Step 2: 建立 `src/data/author.ts`**

```ts
export const author = {
  name: 'Aidan Wang',
  avatar: '/assets/images/avatar.webp',
  bio: 'Excelsior',
  location: 'Taiwan',
  links: [
    { label: 'GitHub', url: 'https://github.com/aidan79225' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/aidan79225/' },
  ],
};
```

- [ ] **Step 3: 建立 `src/components/AuthorCard.astro`**

```astro
---
import { author } from '../data/author';
---
<aside class="mt-12 pt-6 border-t border-line flex items-center gap-4">
  <img src={author.avatar} alt={author.name} class="w-16 h-16 rounded-full" />
  <div>
    <p class="font-bold">{author.name}</p>
    <p class="text-muted text-sm">{author.bio} · {author.location}</p>
    <p class="text-sm">
      {author.links.map((l, i) => (
        <span>{i > 0 ? ' · ' : ''}<a href={l.url} class="text-accent hover:underline">{l.label}</a></span>
      ))}
    </p>
  </div>
</aside>
```

- [ ] **Step 4: 建立 `src/components/Comments.astro`(utterances)**

```astro
---
---
<section class="mt-12 pt-6 border-t border-line">
  <script src="https://utteranc.es/client.js"
    repo="Aidan79225/aidan79225.github.io"
    issue-term="pathname"
    theme="github-dark"
    crossorigin="anonymous"
    async></script>
</section>
```

- [ ] **Step 5: 在 PostLayout 掛入作者卡與留言**

把 `src/layouts/PostLayout.astro` 改成(在原本基礎上 import 並於 `</div>` 後加入 AuthorCard、條件式 Comments):
```astro
---
import BaseLayout from './BaseLayout.astro';
import AuthorCard from '../components/AuthorCard.astro';
import Comments from '../components/Comments.astro';
import 'katex/dist/katex.min.css';
const { post } = Astro.props;
const { title, date, category, tags = [] } = post.data;
---
<BaseLayout title={title}>
  <article>
    <h1 class="text-3xl font-bold mb-2">{title}</h1>
    <p class="text-muted text-sm mb-6">
      <time datetime={date.toISOString()}>{date.toLocaleDateString('zh-TW')}</time> · {category}{tags.length ? ` · ${tags.join(', ')}` : ''}
    </p>
    <div class="prose prose-invert max-w-none">
      <slot />
    </div>
    <AuthorCard />
    {post.data.comments !== false && <Comments />}
  </article>
</BaseLayout>
```

- [ ] **Step 6: 建置並驗證**

Run: `npm run build`
Expected: build 成功。
```bash
grep -o "utteranc.es/client.js" dist/blog/btl-1/index.html
grep -o "Aidan Wang" dist/blog/btl-1/index.html | head -1
grep -c "utteranc.es" dist/blog/lottery/index.html
```
Expected:有 comments 的文章(btl-1、且 lottery 因預設 true 也有)含 utterances script;作者卡含 "Aidan Wang"。

- [ ] **Step 7: Commit**

```bash
git add src/data/author.ts src/components/AuthorCard.astro src/components/Comments.astro src/layouts/PostLayout.astro public/assets/images/
git commit -m "Add author card and utterances comments to posts"
```

---

## Task 6: RSS feed

**Files:** 建 `src/pages/rss.xml.js`

- [ ] **Step 1: 建立 `src/pages/rss.xml.js`**

```js
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  return rss({
    title: "Aidan's Blog",
    description: 'Aidan 的部落格',
    site: context.site,
    items: posts
      .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
      .map((post) => ({
        title: post.data.title,
        pubDate: post.data.date,
        link: `/blog/${post.id}/`,
      })),
  });
}
```

- [ ] **Step 2: 建置並驗證**

Run: `npm run build`
Expected: build 成功;`dist/rss.xml` 存在且含 `<item>`(5 篇)。
```bash
grep -c "<item>" dist/rss.xml
```
Expected:5。

- [ ] **Step 3: Commit**

```bash
git add src/pages/rss.xml.js
git commit -m "Add RSS feed for blog posts"
```

---

## Task 7: Guides 列表 + odoo 指南遷移(markdown)

**Files:** 建 `src/content/guides/odoo-usage-guide.md`、`src/pages/guides/index.astro`、`src/pages/guides/[slug].astro`

odoo 來源 = master `_guides/odoo-usage-guide.html`。轉成 **markdown**(非 MDX):用 markdown 重現其資訊結構(章節 → `##`/`###`、步驟 → 有序/無序清單、狀態表 → markdown 表格、流程說明 → 文字/清單),**捨棄裝飾性 HTML(卡片/徽章/自訂顏色)**,改由 dark prose 呈現。內容文字以原文為準。

- [ ] **Step 1: 取得原文做為轉換依據**

Run: `git show master:_guides/odoo-usage-guide.html`
(閱讀其內容,作為下一步 markdown 重寫的依據。)

- [ ] **Step 2: 建立 `src/content/guides/odoo-usage-guide.md`**

front matter:
```yaml
---
title: "家庭農場 ERP・Odoo 18 使用流程"
description: "家庭農場 ERP・Odoo 18 操作流程手冊"
---
```
body:把原 HTML 指南內容以 markdown 重寫,保留所有章節標題、步驟、欄位/狀態說明(狀態徽章表用 markdown 表格表示)、流程順序。確保資訊完整、可讀,不需保留原始 HTML 樣式。

- [ ] **Step 3: 建立 `src/pages/guides/index.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';
const guides = await getCollection('guides');
---
<BaseLayout title="Guides">
  <h1 class="text-2xl font-bold mb-4">Guides</h1>
  <ul class="space-y-3 list-none p-0">
    {guides.map((g) => (
      <li>
        <a href={`/guides/${g.id}/`} class="text-accent hover:underline">{g.data.title}</a>
        {g.data.description && <span class="text-muted text-sm"> — {g.data.description}</span>}
      </li>
    ))}
  </ul>
</BaseLayout>
```

- [ ] **Step 4: 建立 `src/pages/guides/[slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

export async function getStaticPaths() {
  const guides = await getCollection('guides');
  return guides.map((g) => ({
    params: { slug: g.id },
    props: { guide: g },
  }));
}

const { guide } = Astro.props;
const { Content } = await render(guide);
---
<BaseLayout title={guide.data.title}>
  <article class="prose prose-invert max-w-none">
    <Content />
  </article>
</BaseLayout>
```

- [ ] **Step 5: 建置並驗證**

Run: `npm run build`
Expected: build 成功。
```bash
ls dist/guides/index.html dist/guides/odoo-usage-guide/index.html
grep -o "Odoo" dist/guides/index.html | head -1
grep -o "Odoo" dist/guides/odoo-usage-guide/index.html | head -1
```
Expected:`/guides/` 與 `/guides/odoo-usage-guide/` 都產生;列表含 odoo;指南頁含內容。

- [ ] **Step 6: Commit**

```bash
git add src/content/guides/ src/pages/guides/
git commit -m "Migrate odoo guide and add guides listing"
```

---

## 收尾驗證(全部 Task 後)

- [ ] **本機 dev 人工確認**

Run: `npm run dev`
開啟 localhost,確認:`/tech/`、`/food/` 列對的文章;點進文章深色 prose 可讀、lottery 數學正確、food 文章圖片在、文末作者卡 + 留言區;`/about/`、`/guides/`、`/guides/odoo-usage-guide/` 正常;`/rss.xml` 可開。

- [ ] **確認 master 不受影響**

`git diff master astro -- _posts _pages _guides _config.yml`(應只有「刪除/不變」差異來自 astro 既有狀態,Jekyll 來源檔未被本子專案修改)。本子專案所有新增都在 `src/`、`public/`、`astro.config.mjs`、`global.css`。

---

## Self-Review 結果

- **Spec coverage:**
  - 兩個 collection(spec §1)→ Task 1
  - 5 篇文章遷移 + /blog/<slug>/(spec §2)→ Task 2
  - Tech/Food/Guides/About 路由(spec §3)→ Task 3、4、7
  - PostLayout + 作者 bio + utterances + KaTeX(spec §4)→ Task 2(KaTeX/layout)、Task 5(bio/留言)
  - odoo 遷移(spec §5)→ Task 7
  - RSS(spec §6)→ Task 6
  - 全部對應。
- **與 spec 的刻意差異(已於交付說明):** odoo 採 **markdown** 而非 MDX(MDX 將原始 HTML 當 JSX 解析,`class`/`style` 會出錯;轉 markdown 風險低且仍 collection 驅動)。因此不安裝 `@astrojs/mdx`。裝飾性 HTML(卡片/徽章)簡化為 markdown。
- **Placeholder scan:** 無 TBD;基礎/設定檔均給完整內容。文章與 odoo 的「內文」明確指示「從 master 取原文、只改 front matter/格式」(刻意,避免重貼數百行)。About 指示把 about.md markdown 轉等義 HTML。
- **一致性:** collection 名 `blog`/`guides`、欄位 `category`/`date`/`tags`/`comments`/`description`、`post.id`/`g.id` 作 slug、`render()` 用法、`PostLayout` 的 `post` prop、`/blog/${id}/`、`prose prose-invert`、token class(`text-accent`/`text-muted`/`border-line`)在各 Task 間一致。
