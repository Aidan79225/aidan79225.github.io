# Section 級 backlinks 設計(底部分組)

- 日期:2026-06-13
- 範圍:把每篇文章底部的「🔗 被引用於」從「文章層級的扁平清單」升級成「依**被引用的 section**分組」,讓 section 真正像可被引用的卡片。
- 站台:Astro(master 上線中)
- **相依**:本功能**疊在 PR #8(wikilink section 連結)之上** —— 需要 `src/lib/wiki-link.mjs` 的 `parseTarget` 與 `slugifyHeading`。實作分支須在 PR #8 併入 master 後再從更新後的 master 切出。

## 背景

目前 backlinks 是**文章層級**:`extractTargets` 把 `[[slug#section]]` 的 `#section` 砍掉,`getBacklinks` 只知道「哪篇引用了這篇」,`PostLayout` 底部顯示一個扁平的來源清單。section 連結(PR #8)已經能「指到某段」,但被指的那段不知道誰引用它 —— 單向。本功能補上 section 層級的「被引用」資訊,維持單一底部面板(不做 inline)。

## 已確認決策

- **顯示位置 = 底部面板,依 section 分組**(B 方案;不做標題下 inline 的 A 方案)。
- **失效錨點**(來源指向的 section 對不到本篇現有標題)→ 收進「**整篇文章**」群組。
- 整篇連結(`[[slug]]`,無 section)→ 同樣收進「整篇文章」群組。
- 群組順序:有對到標題的群組**照文章標題出現順序**;「整篇文章」群組排**最後**。
- 仍只作用於 blog;同頁 `[[#x]]` 不計入 backlinks;schema 不動。

## 設計內容

### 1. `src/lib/wiki-link.mjs`

- 新增 `extractLinks(body)` → `Array<{ slug, anchor }>`:逐個 wikilink,`parseTarget` 後,若 `slug` 非空則 push `{ slug, anchor: section ? slugifyHeading(section) : null }`。同頁(slug 空)略過。
- `extractTargets(body)` 改寫為 `extractLinks(body).map((l) => l.slug)`(DRY;對外行為與現狀一致,backlinks 以外的呼叫端不受影響)。
- `wiki-link.d.mts` 增補 `extractLinks` 宣告與 `{ slug: string; anchor: string | null }` 形狀。

### 2. `src/lib/backlinks.ts`

- `getBacklinks(targetSlug)` 回傳型別改為 `Promise<Array<{ post: CollectionEntry<'blog'>; anchor: string | null }>>`:
  - 掃所有其他文章,`extractLinks(p.body ?? '')`,挑出 `slug === targetSlug` 的連結;每個 `{ post, anchor }` 一筆,**同 (post, anchor) 去重**。
  - 依 `post.data.date` 由新到舊排序。
- 新增純函式 `groupBySection(backlinks, headings)`:
  - 參數:`backlinks: Array<{ post; anchor: string|null }>`、`headings: Array<{ slug: string; text: string }>`(Astro `render()` 的 headings,只取 `slug`/`text`)。
  - 建 `anchor → headingText` 對照(來自 headings)。
  - 分組規則:`anchor` 有對到某 heading slug → 歸到該 heading(label = heading text);`anchor` 為 null 或對不到任何 heading → 歸到 `整篇文章`。
  - 回傳 `Array<{ label: string; sources: CollectionEntry<'blog'>[] }>`,**有對到標題的群組照 headings 出現順序、`整篇文章` 墊最後**;群組內 sources 維持日期排序、去重。
  - 空輸入回傳 `[]`。

### 3. 接線與顯示

- `src/pages/blog/[slug].astro`:改成 `const { Content, headings } = await render(post);`,並 `<PostLayout post={post} headings={headings}>`。
- `src/layouts/PostLayout.astro`:
  - 介面新增 `headings`(`MarkdownHeading[]`,即 `{ depth; slug; text }[]`,預設 `[]`)。
  - `const groups = groupBySection(await getBacklinks(post.id), headings);`
  - 把現有扁平 backlinks 區塊改為分組渲染(**`groups.length > 0` 才顯示**):
    ```
    🔗 被引用於
      〈section heading〉
        · 〈來源文章〉
      整篇文章
        · 〈來源文章〉
    ```
  - 沿用現有 aside 樣式(`mt-12 pt-6 border-t border-line text-sm`);section label 用 `text-muted text-xs`,來源用 `text-accent hover:underline`。

### 4. 不變 / 範圍

- 只 blog;同頁連結不計;不做 A 方案 inline;不動 schema。
- `extractTargets` 對外語義不變(只是改用 `extractLinks` 實作)。

## 風險 / 注意

- **anchor 比對**:來源寫的 section 文字經 `slugifyHeading` 後,要對得上 Astro `headings[].slug`(兩者都是 github-slugger 產物 → 一致;PR #8 已驗證)。
- **`render()` 的 headings 形狀**:Astro 提供 `{ depth, slug, text }`;`groupBySection` 只依賴 `slug`/`text`,對 depth 不敏感。
- **失效錨點**收進「整篇文章」是刻意的取捨(簡單);代價是看不出該來源原本想指哪個(已不存在的)段。
- **回傳型別變更**:`getBacklinks` 由 `CollectionEntry[]` 改為 `{post, anchor}[]`;唯一呼叫端是 `PostLayout`,一併更新。

## 驗證方式

- 單元測試(`node --test`,純函式):
  - `extractLinks('[[btl-5]] [[btl-5#障礙一：看不到自己]] [[#x]] [[btl-6|z]]')` → `[{slug:'btl-5',anchor:null},{slug:'btl-5',anchor:'障礙一看不到自己'},{slug:'btl-6',anchor:null}]`(同頁略過)。
  - `extractTargets` 仍回 `['btl-5','btl-5','btl-6']`(行為不變)。
  - `groupBySection`:給定 backlinks + headings → 正確分組、群組依標題順序、`整篇文章` 墊底、失效錨點歸入整篇、空輸入回 `[]`。
- build + grep(用現成素材):btl-6 已 `[[btl-5#障礙一：看不到自己|…]]`,所以 build 後:
  - `dist/blog/btl-5/index.html` 的「被引用於」區出現 section label「障礙一:看不到自己」,其下為 btl-6 的連結。
  - 沒有 section 的純整篇引用仍出現在「整篇文章」群組。
  - 無 backlink 的文章(如 btl-3)仍不顯示整個區塊。
  - build 無 `[wiki-link]` warning。
