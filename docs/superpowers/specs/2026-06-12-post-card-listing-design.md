# 文章列表卡片化設計(PostCard)

- 日期:2026-06-12
- 範圍:把各文章列表頁從「標題 + 日期」純清單,升級成資訊更豐富的共用卡片
- 站台:Astro(master 上線中)

## 背景

目前 `/tech/`、`/food/`、`/tags/<tag>/` 與首頁「最新文章」都用同一種純文字清單(每篇只有標題 + 日期),顯得單薄。blog post 目前沒有 `description`/摘要欄位,列表能呈現的資訊很有限。

## 已確認決策

- 四個面向都加強:**卡片化視覺、摘要、標籤 + 系列標示、閱讀時間**。
- 摘要**自動從內文截取**(不新增手動欄位)。
- 共用同一個卡片元件,套到所有 blog 文章列表。
- 閱讀時間顯示為**「約 N 分鐘」**;meta **統一顯示分類**(即使在 /tech、/food 略冗餘)。

## 設計內容

### 1. Helper:`src/lib/post.ts`
- `toPlainText(body)`:把 markdown 內文轉純文字 —— 去掉:程式碼圍欄(```)、`<figure>…</figure>`(內嵌 SVG 圖)、其餘 HTML 標籤、markdown 圖片 `![..](..)`、連結語法(保留文字)、標題/強調等語法符號;最後 collapse 空白、trim。
- `excerpt(body, len = 100)`:`toPlainText` 後取開頭 `len` 字;超過則加「…」。(能正確跳過「圖片開頭」的食記)
- `readingMinutes(body)`:用 `toPlainText` 後的字數估算,約 **400 字/分鐘**,`Math.max(1, …)`(至少 1 分鐘)。

### 2. 元件:`src/components/PostCard.astro`
- props:`post: CollectionEntry<'blog'>`。
- 結構為 `<article>`(非整塊 `<a>`,因為標題與 tag 都是連結,避免巢狀 anchor)。
- 卡片樣式沿用 Tools 卡片:`bg-surface border border-line rounded-lg p-4 hover:border-accent transition-colors`。
- 內容:
  - **標題** `<a href={/blog/${post.id}/}>`(`text-ink hover:text-accent`)。
  - **meta 列**(`text-muted text-xs`):`日期 · {category} · 約 {readingMinutes} 分鐘`;若 `series` 有值再加 `· 📚 {series} #{seriesOrder}`。
  - **摘要**:`{excerpt(post.body)}`(有才顯示)。
  - **tags chips**:每個 `<a href={/tags/${encodeURIComponent(t)}/}>`,樣式 `text-xs bg-base border border-line rounded px-2 py-0.5 text-accent`(底色用 `bg-base` 與卡片 `bg-surface` 區隔)。

### 3. 套用範圍
把以下頁面原本的 `<ul>` 清單換成 `<div class="space-y-4">{posts.map((p) => <PostCard post={p} />)}</div>`(單欄堆疊):
- `src/pages/tech.astro`
- `src/pages/food.astro`
- `src/pages/tags/[tag].astro`
- `src/pages/index.astro`(首頁「最新文章」區塊)

### 4. 不變
- `/guides/`(結構為 title + description,維持原樣)。
- `/tags/`(標籤雲)、nav、文章內頁、RSS。
- **不新增 schema 欄位**(摘要與閱讀時間皆由 `post.body` 即時計算)。

## 風險 / 注意
- `excerpt` 的 strip 邏輯需處理「圖片開頭」(ramen / braised-pork-rice)與「含 `<figure>` SVG」(btl-3/4/6)—— 以 regex 去除後取首段純文字。
- `post.body` 需存在;以 `post.body ?? ''` 防呆。
- 巢狀 anchor 不合法 → 卡片用 `<article>`,僅標題與 tag 為連結。

## 驗證方式
- `npm run build` 成功。
- `/tech/`、`/food/`、`/tags/leadership/`、首頁:每篇顯示為卡片,含日期 · 分類 · 約 N 分鐘、摘要、tags chips;系列文顯示「📚 {系列} #{n}」。
- `ramen` / `braised-pork-rice`(圖片開頭)的摘要正確跳過圖、取到正文文字。
- btl 系列卡片顯示「#n」且 tag chip 連到 `/tags/<tag>/`。
- `/guides/`、`/tags/`、文章內頁、nav 不受影響。
