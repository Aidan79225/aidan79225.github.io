# Wikilink section 連結設計 `[[slug#段落]]`

- 日期:2026-06-13
- 範圍:讓現有 `[[wikilink]]` 不只連到頁面,還能連到頁面內某個標題(section anchor);並支援同頁 `[[#段落]]`。
- 站台:Astro(master 上線中)

## 背景

現在 `[[slug]]` / `[[slug|label]]` 只能連到 `/blog/<slug>/`。希望能 `[[slug#某段]]` 跳到該文的某個標題,以及 `[[#某段]]` 跳到本篇的某個標題,讓卡片之間能連到更精準的位置。

**可行性已驗證**:Astro 用 `github-slugger` 自動為每個標題產生 `id`(已在 build 輸出確認,例:`### 障礙一:看不到自己` → `id="障礙一看不到自己"`、`### 障礙二:沒問題綜合症(No-Problem Syndrome)` → `id="障礙二沒問題綜合症no-problem-syndrome"`、`IQ` → `iq`)。直接匯入 `github-slugger` 產生的 slug 與 Astro 輸出**一字不差**(已實測)。

## 已確認決策

- **語法**:`#` 後面寫**標題原文**,build 時用 `github-slugger` 自動 slug 化(不要求作者自己寫 anchor)。
- **跨頁 + 同頁都支援**:
  - `[[btl-5#障礙一:看不到自己]]` → `/blog/btl-5/#障礙一看不到自己`
  - `[[#健康]]` → `#健康`(指向本篇)
- **預設連結文字**(無 `|label`):
  - 有 section → 用 **section 原文**(例「障礙一:看不到自己」)。
  - 無 section → 用目標文章 **title**(現狀不變)。
  - 有 `|label` → 用 label。
- **保留 build 時驗證**:section 找不到對應標題時 `console.warn`(因 CJK anchor 不好猜、容易打錯)。
- **新增相依 `github-slugger`**(寫進 package.json;本來就在 node_modules 內)。
- schema 不變;只作用於 blog 文章。

## 設計內容

### 1. `src/lib/wiki-link.mjs`(純解析)

- 新增 `slugifyHeading(text)`:`return new GithubSlugger().slug(text)`(每次 new 一個實例 → 對單一標題給出 base slug,與 Astro 同檔首次出現的 anchor 一致)。
- 新增 `parseTarget(raw)`:把 group1 用**第一個 `#`** 切開,回傳 `{ slug, section }`(`slug` 可為空字串代表同頁;`section` 可為 `undefined`)。
- `splitWikiLinks(value, ctx)` —— **簽章改變**,`ctx = { titleMap, headingsMap = {}, currentSlug = null, onWarn }`:
  - 對每個 `[[...]]`:`{ slug, section } = parseTarget(group1.trim())`;`label = group2?.trim()`。
  - **同頁**(`slug === ''`):
    - 若無 section(`[[#]]` 或空)→ 視為無效,原樣文字輸出。
    - URL = `#${slugifyHeading(section)}`;預設文字 = section 原文。
    - 驗證:`headingsMap[currentSlug]` 不含該 anchor → `onWarn(...)`(仍輸出連結)。
  - **跨頁**(`slug !== ''`):
    - `title = titleMap[slug]`;若 `undefined` → 原樣文字 + `onWarn(...)`(現狀)。
    - 無 section → URL `/blog/${slug}/`、預設文字 title(現狀)。
    - 有 section → URL `/blog/${slug}/#${slugifyHeading(section)}`、預設文字 section 原文;`headingsMap[slug]` 不含該 anchor → `onWarn(...)`(仍輸出連結)。
  - 連結文字 = `label || 預設文字`。
- `extractTargets(body)` —— 改成:對每個 match 取 group1,`parseTarget` 後**只回傳非空的 base slug**(去掉 `#section`;同頁連結 slug 空 → 略過)。確保 backlinks 仍以「文章」為單位(`[[btl-5#x]]` 計為引用 btl-5)。

### 2. `src/lib/wiki-link.d.mts`

更新型別:`splitWikiLinks(value, ctx)` 的 ctx 介面、`slugifyHeading`、`parseTarget`。

### 3. `src/lib/remark-wiki-link.mjs`

- `buildMaps()`(取代 `buildTitleMap`):一次讀完 `src/content/blog/*.md`,同時建:
  - `titleMap[slug]`(同現狀)。
  - `headingsMap[slug]`:逐行掃描 body,**略過 front matter 區塊與 ``` 程式碼圍欄**,對符合 `^#{1,6}\s+(.+?)\s*$` 的行取標題文字;**每個檔案用一個 `GithubSlugger` 實例**依序 slug 化(精準對應 Astro 同檔去重的 `-1` 行為),收集成 anchor 陣列。
  - 兩個 map 一起 module-scope 快取(`cachedMaps`)。
- transformer 簽章用到第二參數 vfile:`return (tree, file) => walk(tree, ctx)`,其中 `currentSlug` 由 `file`(`file.path` / `file.history[0]`)取檔名去 `.md` 推得。
- `ctx = { titleMap, headingsMap, currentSlug, onWarn: (m) => console.warn('[wiki-link] ' + m) }` 傳給 `splitWikiLinks`。
- 維持「不遞迴進 `link` / `linkReference`」避免巢狀 anchor。

### 4. `src/lib/backlinks.ts`

不需改動 —— `extractTargets` 已在 wiki-link.mjs 內處理 section 去除與同頁略過,`getBacklinks` 邏輯照舊。

### 5. `package.json`

新增 `"github-slugger"` 到 `dependencies`(對齊 Astro 實際使用的版本範圍)。

## 不在範圍

- 關係圖(仍是後續)。
- guides 集合。
- 重複標題(同檔多個同名標題)的 `-1`/`-2` 精準對應:跨檔連結用 fresh slugger 的 base slug,對應首次出現的標題(常見情境正確);不特別處理連到第二個同名標題的情況。

## 風險 / 注意

- **標題解析需略過程式碼圍欄**:```` ``` ```` 內以 `#` 開頭的行不是標題,逐行掃描時要用 in-fence 狀態跳過,否則 `headingsMap` 會多出假標題(只影響驗證,不影響連結正確性)。
- **fresh slugger vs 同檔去重**:`slugifyHeading` 每次 new 實例 → 對唯一標題正確;對同檔重複標題只會對到首次出現者(已列為範圍外)。
- **簽章變更**:`splitWikiLinks` 由 `(value, titleMap, onMissing)` 改為 `(value, ctx)`;只有 remark plugin 與單元測試是呼叫端,一併更新。
- 未知 section 採 **best-effort(仍輸出連結)+ warn**,而非退回純文字 —— 與「未知整篇 slug 退回純文字」behaviour 不同,刻意如此(section 打錯時連結仍到得了頁面)。

## 驗證方式

- 單元測試(`node --test`):
  - 跨頁 section:`[[btl-3#子標題]]` → link 到 `/blog/btl-3/#<slug>`、文字為 section 原文。
  - `[[slug#section|label]]` → 用 label。
  - 同頁:`[[#某標題]]` → link `url` 為 `#<slug>`、無 `/blog/` 前綴。
  - 未知 section → `onWarn` 被呼叫,且仍產生連結。
  - `extractTargets('see [[btl-5#x]] and [[#y]] and [[btl-6|z]]')` → `['btl-5', 'btl-6']`(去 `#`、略過同頁)。
  - `slugifyHeading('障礙二:沒問題綜合症(No-Problem Syndrome)')` === `'障礙二沒問題綜合症no-problem-syndrome'`。
- build + grep:在某篇暫時加 `[[btl-5#障礙一:看不到自己]]` 與 `[[#反思]]`,`npm run build` 後:
  - 該頁出現 `href="/blog/btl-5/#障礙一看不到自己"`。
  - 同頁連結出現 `href="#反思"`。
  - 打錯的 section 會在 build log 出現 `[wiki-link]` warning。
  - btl-5 的 backlinks 不變(被引用清單照舊)。
  - 驗證後移除暫時連結(除非要留成真正的互連)。
