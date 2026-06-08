# Astro 遷移・子專案 B:內容遷移設計

- 日期:2026-06-08
- 範圍:把 Jekyll 的文章、頁面、Guides 內容遷移到 `astro` 分支的 Astro 站
- 前提:子專案 A(地基:Astro 5 + React + Tailwind v4 + BaseLayout/Nav + 部署 workflow)已完成於 `astro` 分支;Jekyll 仍在 master 線上

## 背景

Jekyll(master)上的內容:
- **5 篇 posts**:`ramen`、`braised-pork-rice`(category food,含外部圖片)、`lottery`(category tech,含 MathJax `$$` 與程式碼)、`BTL-1`、`BTL-2`(category tech,有 tags)。front matter:title/date/categories/tags/comments。
- **About** 頁(markdown)、**Tech/Food** 分類彙整頁、**作者檔案**(`_data/authors.yml`:avatar/bio/links)、**留言**(utterances)、**RSS**(jekyll-feed)。
- **odoo 使用指南**(`_guides/odoo-usage-guide.html`,深色、含卡片/表格/狀態徽章與 `toc`)。

## 已確認決策

- 文章用**乾淨新網址** `/blog/<slug>/`(不保留 Jekyll 舊網址)。
- 保留周邊裝飾:**utterances 留言**、**作者 bio**、**RSS**;並因 lottery 文章需要而加上 **KaTeX 數學**。
- **odoo 指南在 B 遷移**(B 內最後一個獨立 task)。
- odoo 網址改為 `/guides/odoo-usage-guide/`(與「乾淨新網址」一致、collection 驅動)。

## 設計內容

### 1. 內容 collections(Astro 5 Content Layer，`src/content.config.ts`)
用 `glob` loader 定義兩個 collection:
- **`blog`** — `src/content/blog/*.md`;schema:`title: z.string()`、`date: z.date()`、`category: z.enum(['tech','food'])`、`tags: z.array(z.string()).optional()`、`comments: z.boolean().default(true)`。
- **`guides`** — `src/content/guides/*.mdx`;schema:`title: z.string()`、`description: z.string()`(無 date)。

採「單一 `blog` collection + `category` 欄位」(而非分成 tech/food 兩個 collection),Tech/Food 為過濾視圖,維持 DRY。

### 2. 文章遷移(→ `src/content/blog/`)
- 檔案:`ramen.md`、`braised-pork-rice.md`、`lottery.md`、`btl-1.md`、`btl-2.md`。
- front matter 轉成上述 schema(Jekyll `categories: food` → `category: food`)。
- body markdown 內容不變:外部圖片(`![]` 指向 nextcloud)直接渲染;程式碼區塊走 Astro 內建 Shiki;`lottery` 的 `$$` 走 KaTeX。
- slug = 檔名,網址 `/blog/<slug>/`。
- 註:blog post `lottery`(黑箱抽籤文章)走 `/blog/lottery/`,與 C 的抽籤工具頁 `/lottery/` 不衝突。

### 3. 路由頁(`src/pages/`)
- `blog/[slug].astro`:`getStaticPaths` 走 blog collection,渲染單篇(用 PostLayout)。
- `tech.astro`、`food.astro`:依 `category` 過濾、`date` 倒序列出對應文章(沿用 Nav 既有的 /tech/ /food/)。
- `guides/index.astro`:列出 `guides` collection(標題 + description,無日期)。
- `guides/[slug].astro`:渲染單篇 guide → `/guides/odoo-usage-guide/`。
- `about.astro`:由 `about.md` 內容轉入(`/about/`)。

### 4. PostLayout + 周邊裝飾
- `src/layouts/PostLayout.astro`(包 BaseLayout):標題、日期、category、tags、內容 slot。
- **作者 bio**:`_data/authors.yml` → `src/data/author.ts`(name/avatar/bio/links);做一個作者卡片元件顯示於文章。頭像 `avatar.webp` 複製到 `public/assets/images/`。
- **留言**:`src/components/Comments.astro` 內嵌 utterances script(repo `Aidan79225/aidan79225.github.io`、`issue-term: pathname`、`theme: github-dark`);僅當 frontmatter `comments !== false` 顯示。
- **數學**:`astro.config.mjs` 的 markdown 設定加 `remark-math` + `rehype-katex`,並於 PostLayout(或全站)載入 KaTeX CSS。
- **程式碼**:Astro 內建 Shiki,無需額外設定。

### 5. odoo 指南遷移(MDX,B 內最後一個 task)
- 加 `@astrojs/mdx` integration。
- 把 master 上 `_guides/odoo-usage-guide.html` 的內容轉成 `src/content/guides/odoo-usage-guide.mdx`(`title`、`description` frontmatter)。
- 保留其結構(卡片、表格、狀態徽章、流程說明);深色樣式以 Tailwind/scoped CSS 重現;標題保留可錨定的 id(供頁內導覽/TOC)。
- 此為 B 中最重一塊(HTML→MDX),作為獨立 task 可單獨驗收。

### 6. RSS
- `src/pages/rss.xml.js` 用 `@astrojs/rss`,輸出 blog collection(title/date/description/link `/blog/<slug>/`)。

### 7. 不在 B 範圍(留給 C)
- 互動工具:metronome、rummikub timer、parking lottery 工具頁(`/lottery/` HTML 工具)、以及它們的 React 化/收編。

## 風險 / 注意
- KaTeX 需要載入其 CSS,否則數學排版錯亂。
- utterances 在本機 dev 可能無法完整載入(需正式網域/GitHub),以「script 區塊存在」為驗收,實際留言待部署後確認。
- odoo HTML→MDX:MDX 對某些原始 HTML/屬性(如 `class` vs `className`、自閉合標籤)較嚴格,轉換時需處理。
- 外部圖片(nextcloud)依賴外部服務可用性;遷移不改其行為。
- B 偏大;odoo 作為最後獨立 task,其餘內容可先完成並單獨驗收。

## 驗證方式
- `npm run build` 成功;`dist/` 產生:`/blog/<slug>/`(5 篇)、`/tech/`、`/food/`、`/guides/`、`/guides/odoo-usage-guide/`、`/about/`、`/rss.xml`。
- `lottery` 文章輸出含 KaTeX 排版(`katex` class)、程式碼有高亮;food 文章含外部圖片 `<img>`。
- 文章頁含作者卡片;`comments !== false` 的文章含 utterances script 區塊。
- `/tech/`、`/food/` 各自只列對應分類、依日期排序。
- 本機 `npm run dev` 人工確認外觀與深色一致性。
- Jekyll(master)不受影響;所有變更只在 `astro` 分支。
