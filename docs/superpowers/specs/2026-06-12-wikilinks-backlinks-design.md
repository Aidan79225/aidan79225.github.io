# 文章互連 + 反向連結設計(Zettelkasten 階段一)

- 日期:2026-06-12
- 範圍:讓文章之間能用 `[[wikilink]]` 互相連結,並在每篇底部顯示「被哪些文章引用」(backlinks),把長文部落格往卡片盒筆記的「知識網」靠近。
- 站台:Astro(master 上線中)

## 背景

目前文章是長文形式(BTL 一篇就是一章),已有 category / tags / series 三層分類,但文章之間**沒有彼此引用的機制** —— 知識是一篇篇孤立的,不是一張互連的網。卡片盒筆記(Zettelkasten)的核心精神是「原子化 + 密集連結 + 雙向」。本次取其中**最能落地、又不需重寫現有文章**的一塊:**內文互連 + 反向連結**。

關係圖(視覺化知識網)屬於**階段二**,刻意延後:它的資料來源就是本階段建立的連結,且目前文章彼此幾乎沒有互連,圖畫出來會「空」、看不出價值。等互連累積到一定程度再另開。原子化筆記(改變寫作顆粒度)本次**不做**。

## 已確認決策

- **語法**:內文寫 `[[slug]]` 或 `[[slug|顯示文字]]`。
  - `slug` = 文章檔名(`btl-3`、`ramen`、`lottery`…),穩定、不歧義。
  - `[[btl-3]]` 渲染成連到 `/blog/btl-3/` 的連結,**連結文字自動帶入目標文章的 `title`**(「領導力 - 成長模型」)。
  - `[[btl-3|成長模型那篇]]` 則用自訂文字當連結文字。
- **壞連結**:`slug` 找不到對應文章時,**原樣顯示文字**(`[[xxx]]` 直接當純文字輸出,不變成死連結),並在 build 時 `console.warn`。
- **作用範圍**:只處理 **blog 文章**(`src/content/blog`)。guides 不納入。
- **不動 schema**:連結寫在內文,不新增 front matter 欄位。
- **示範連結**:本次順手在 BTL 系列加入幾條真實互連來示範 + 驗證(`btl-5`「看不到自己」這道障礙 ↔ `btl-6`「用日記看見自己」是它的解法),形成雙向 backlink。

## 設計內容

### 1. remark plugin:`src/lib/remark-wiki-link.mjs`

把內文的 `[[...]]` 在 build 時轉成連結節點。

- **建立 slug → title 對照表**:模組載入時用 `fs` 同步讀取 `src/content/blog/*.md`,以簡單 regex 抽出每篇的 `title`(`/^title:\s*["']?(.+?)["']?\s*$/m`,作用於 front matter 區塊),`slug` = 檔名去掉 `.md`。對照表只建一次(模組層級快取)。
- **轉換邏輯**:回傳一個 mdast transformer,遞迴走訪節點的 `children`:
  - 對 `type === 'text'` 且含 `[[` 的節點,用 regex `/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g` 把字串切成「純文字 / 連結 / 純文字 …」多個節點,取代原節點。
    - `slug = match[1].trim()`、`label = match[2]?.trim()`。
    - `title = map[slug]`。
    - 找得到 → 產生 `{ type: 'link', url: \`/blog/${slug}/\`, children: [{ type: 'text', value: label || title }] }`。
    - 找不到 → 該段保留為原始文字 `[[...]]`(不轉連結),並 `console.warn` 提示未知 slug。
  - **不遞迴進** `type === 'link'` 的既有節點(避免巢狀 anchor)。`inlineCode` / `code` 節點型別不是 `text`,自然不會被處理(行內程式碼裡的 `[[...]]` 維持原樣)。
- **不引入新套件**:用手寫的遞迴走訪(約 15 行),不依賴 `unist-util-visit`,避免相依風險。
- **掛載**:在 `astro.config.mjs` 的 `markdown.remarkPlugins` 陣列加入 `remarkWikiLink`(與既有的 `remark-math` 並存)。

### 2. backlinks helper:`src/lib/backlinks.ts`

- `export async function getBacklinks(targetSlug: string)`:
  - `getCollection('blog')` 取全部文章。
  - 對每篇(排除自己 `p.id === targetSlug`)掃描 `p.body`,用同一條 wikilink regex 收集所有引用目標的 slug(只取 `match[1].trim()`,即 target slug,忽略 label)。
  - 若某篇的引用目標集合包含 `targetSlug`,該篇即為一個來源。
  - 回傳來源文章陣列,依 `date` 由新到舊排序。
  - `body` 以 `p.body ?? ''` 防呆。

### 3. `src/layouts/PostLayout.astro`:顯示 backlinks

- 在 frontmatter 區段呼叫 `const backlinks = await getBacklinks(post.id);`。
- 在文章內容下方(prev/next 導覽附近、Comments 之前)新增一段 `<aside>`,**僅當 `backlinks.length > 0`** 才渲染:
  - 標題「🔗 被引用於」。
  - 清單:每個來源一個 `<a href={\`/blog/${b.id}/\`}>{b.data.title}</a>`,沿用站台連結樣式(`text-accent hover:underline`)。

### 4. 示範互連(內容微調,驗證用)

- `src/content/blog/btl-6.md`(用日記看見自己):開頭引用 `btl-5` 的「看不到自己」障礙處,改寫成帶 `[[btl-5|...]]` 的連結。
- `src/content/blog/btl-5.md`(創新的三大障礙):在障礙一「看不到自己」處,加一句指向 `[[btl-6|...]]`(用日記破解這道障礙)。
- 結果:`btl-5` 與 `btl-6` 互相連結 → 兩篇底部各自出現對方的 backlink。

## 不在範圍

- **關係圖**(階段二)。
- **原子化筆記**(寫作顆粒度的轉變)。
- guides 集合的 wikilink。
- 新增 schema 欄位。

## 風險 / 注意

- **remark 走訪要避免巢狀 anchor**:不遞迴進既有 `link` 節點。
- **行內程式碼**:`[[...]]` 若出現在行內程式碼,因節點型別非 `text`,不會被轉換(符合預期)。
- **fs 讀檔在 build 時執行**:remark plugin 模組在 Node build 環境載入,可同步讀 `src/content/blog`。路徑用相對於專案根的固定路徑。
- **title regex**:目前所有文章 `title` 皆為單行字串(含或不含引號),regex 足夠;若日後出現多行/特殊 title 再強化。
- **壞連結**:原樣顯示 + warn,不讓 build 失敗。

## 驗證方式

- `npm run build` 成功,無未預期錯誤。
- `btl-6` 內文出現連到 `/blog/btl-5/` 的連結(文字為自訂或 `btl-5` 標題);`btl-5` 內文出現連到 `/blog/btl-6/` 的連結。
- `btl-5` 底部「🔗 被引用於」出現 `btl-6`;`btl-6` 底部出現 `btl-5`。
- 沒有被任何文章引用的文章,底部**不**出現 backlinks 區塊。
- 在某篇暫時寫一個不存在的 `[[nonexistent-slug]]` → 渲染為純文字 `[[nonexistent-slug]]`,build log 出現 warning(驗證後移除)。
- 行內程式碼中的 `[[x]]` 不被轉換。
