# Astro 遷移・子專案 C:互動工具遷移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 3 個互動工具(節拍器、拉密計時、車位抽籤)原樣移植到 Astro、建立 `/tools/` 著陸頁、並重建首頁(移除 React 煙霧測試)。

**Architecture:** 工具以「原樣 vanilla」移植:取 master 的 HTML/CSS/JS,包進 BaseLayout 的 `.tool-page` 容器,`<script is:inline>`(保留全域 onclick 函式)+ `<style is:global>`(保留 `.tool-page` 前綴),共用控件樣式移植成 `src/styles/tools.css`。首頁改列最新文章。所有工作在 `astro` 分支,Jekyll(master)不動。

**Tech Stack:** Astro 5 pages、`is:inline`/`is:global` 指示詞、既有 vanilla JS(Web Audio / Wake Lock / Fullscreen / Mulberry32 / SheetJS CDN)、Tailwind。Node v24 / npm 可用。

**參考 spec:** `docs/superpowers/specs/2026-06-08-astro-tools-migration-design.md`

**前提:** 在 `astro` 分支(A、B 已完成)。所有指令在 `astro` 分支執行,勿動 Jekyll 檔。**工具的 HTML/CSS/JS 內文一律從 master 取原文(`git show master:<path>`)逐字保留,只套外殼。**

---

## 檔案結構
- `src/styles/tools.css`(建)— 共用 `.tool-page` 深色控件樣式
- `src/pages/metronome.astro`(建)→ `/metronome/`
- `src/pages/rummikub-timer.astro`(建)→ `/rummikub-timer/`
- `src/pages/lottery.astro`(建)→ `/lottery/`
- `src/pages/tools.astro`(建)→ `/tools/`
- `src/pages/index.astro`(改)— 重建首頁
- `src/components/Counter.tsx`(刪)— A 的煙霧測試

**測試策略:** 每個 Task 以 `npm run build` 成功 + grep `dist/` 驗證(含確認 `is:inline` script 逐字保留在輸出 HTML);互動功能最後 `npm run dev` 人工確認。

**共用移植配方(每個工具頁套用):**
1. `git show master:<工具檔>` 取得 front matter 之後的全部內容(分成 `<style>`、可見 markup、`<script>` 三段)。
2. 建 `.astro` 頁:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import '../styles/tools.css';
---
<BaseLayout title="<工具標題>">
  <div class="tool-page">
    <!-- 這裡放 master 的可見 markup 逐字(若原本已有 .tool-page 包層,就不要再多包一層) -->
  </div>
  <style is:global>
    /* 這裡放 master 的 <style> 內容逐字 */
  </style>
  <script is:inline>
    /* 這裡放 master 的 <script> 內容逐字 */
  </script>
</BaseLayout>
```
3. 外部 CDN script(僅 lottery)用 `<script is:inline src="…">`。
4. 不修改任何 JS 邏輯。

---

## Task 1: 共用工具樣式 + 節拍器移植(建立 is:inline/is:global 範式)

**Files:** 建 `src/styles/tools.css`、`src/pages/metronome.astro`

- [ ] **Step 1: 移植共用控件樣式 `src/styles/tools.css`**

取 `git show master:assets/css/tools.scss`,**移除開頭的 `---`/`---` front matter 兩行**,其餘 CSS 內容逐字寫入 `src/styles/tools.css`(即 `.tool-page { button{…} input/textarea/select{…} .result{…} }` 那段)。

- [ ] **Step 2: 建立 `src/pages/metronome.astro`**

`git show master:_pages/metronome.html` 取內容(front matter 之後有一個 `<style>`、按鈕 markup、一個 `<script>`)。依共用配方建立頁面:`title="線上節拍器"`,可見 markup 包進 `<div class="tool-page">`(metronome 原本沒有 .tool-page 包層,需新增),`<style is:global>` 放原 `<style>` 內容,`<script is:inline>` 放原 `<script>` 內容(含 `startMetronome`/`stopMetronome`/`updateDot` 全域函式)。

- [ ] **Step 3: 建置並驗證**

Run: `npm run build`
Expected: build 成功。
```bash
ls dist/metronome/index.html
grep -o "開始\|停止\|手打拍速" dist/metronome/index.html | sort -u
grep -o "startMetronome" dist/metronome/index.html | head -1
```
Expected:頁面存在;三個按鈕文字在;`startMetronome` 出現在輸出 HTML(代表 `is:inline` script 逐字保留、未被模組化)。

- [ ] **Step 4: Commit**

```bash
git add src/styles/tools.css src/pages/metronome.astro
git commit -m "Migrate metronome tool to Astro (is:inline/is:global)"
```

---

## Task 2: 拉密計時移植

**Files:** 建 `src/pages/rummikub-timer.astro`

- [ ] **Step 1: 建立 `src/pages/rummikub-timer.astro`**

`git show master:_pages/rummikub_timer.html` 取內容(已是 layout:single,內容含 `<style>`、`<div class="tool-page" id="rummikub-root">…</div>` markup、`<script>`)。依配方:`title="拉密計時"`,**沿用原本的 `.tool-page` 包層(不要再多包)**,`<style is:global>` 放原 `<style>`(含 `:fullscreen` 規則),`<script is:inline>` 放原 `<script>`(含 `toggleFullscreen`、倒數、Web Audio、Wake Lock)。

- [ ] **Step 2: 建置並驗證**

Run: `npm run build`
Expected: build 成功。
```bash
ls dist/rummikub-timer/index.html
grep -o "全螢幕\|toggleFullscreen\|rummikub-root" dist/rummikub-timer/index.html | sort -u
```
Expected:頁面存在;含 `全螢幕`、`toggleFullscreen`、`rummikub-root`(script 逐字保留)。

- [ ] **Step 3: Commit**

```bash
git add src/pages/rummikub-timer.astro
git commit -m "Migrate rummikub timer tool to Astro"
```

---

## Task 3: 車位抽籤移植(含 SheetJS CDN)

**Files:** 建 `src/pages/lottery.astro`

- [ ] **Step 1: 建立 `src/pages/lottery.astro`**

`git show master:parking_lottery.html` 取內容(已是 layout:single,含 `<style>`、`<div class="tool-page">…</div>` markup、SheetJS 的 `<script src="…xlsx…">`、以及內聯 `<script>` 含 `drawLots`/`downloadExcel`/`fillExample`/`clearInputs`/`mulberry32`/`xmur3`/`makeRng`)。依配方:`title="車位抽籤"`,沿用原 `.tool-page` 包層,`<style is:global>` 放原 `<style>`。兩個 script 都要 `is:inline`:
  - 外部 CDN:`<script is:inline src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>`(用 master 中實際的 URL)
  - 內聯邏輯:`<script is:inline> …原內容… </script>`

- [ ] **Step 2: 建置並驗證**

Run: `npm run build`
Expected: build 成功。
```bash
ls dist/lottery/index.html
grep -o "抽籤\|drawLots\|mulberry32" dist/lottery/index.html | sort -u
grep -o "xlsx.full.min.js" dist/lottery/index.html | head -1
```
Expected:頁面存在;含 `drawLots`、`mulberry32`(邏輯逐字保留)、SheetJS CDN URL。

- [ ] **Step 3: Commit**

```bash
git add src/pages/lottery.astro
git commit -m "Migrate parking lottery tool to Astro"
```

---

## Task 4: `/tools/` 著陸頁

**Files:** 建 `src/pages/tools.astro`

- [ ] **Step 1: 建立 `src/pages/tools.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Tools">
  <h1 class="text-2xl font-bold mb-4">Tools</h1>
  <ul class="space-y-3 list-none p-0">
    <li>🎵 <a href="/metronome/" class="text-accent hover:underline">線上節拍器</a> <span class="text-muted text-sm">— 練習用的可調速節拍器</span></li>
    <li>⏱ <a href="/rummikub-timer/" class="text-accent hover:underline">拉密計時</a> <span class="text-muted text-sm">— 桌遊回合計時器</span></li>
    <li>🅿️ <a href="/lottery/" class="text-accent hover:underline">車位抽籤</a> <span class="text-muted text-sm">— 可重現的公正抽籤</span></li>
  </ul>
</BaseLayout>
```

- [ ] **Step 2: 建置並驗證**

Run: `npm run build`
Expected: build 成功;`grep -o "節拍器\|拉密計時\|車位抽籤" dist/tools/index.html | sort -u` 三者皆在;連結指向 /metronome/ /rummikub-timer/ /lottery/(皆已存在)。

- [ ] **Step 3: Commit**

```bash
git add src/pages/tools.astro
git commit -m "Add Tools landing page"
```

---

## Task 5: 重建首頁 + 刪除煙霧測試

**Files:** 改 `src/pages/index.astro`;刪 `src/components/Counter.tsx`

- [ ] **Step 1: 改寫 `src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';
const posts = (await getCollection('blog'))
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
  .slice(0, 5);
---
<BaseLayout title="Aidan's Blog">
  <h1 class="text-3xl font-bold mb-2">Aidan's Blog</h1>
  <p class="text-muted mb-8">軟體開發筆記、技術整理與個人興趣。</p>
  <h2 class="text-xl font-bold mb-3">最新文章</h2>
  <ul class="space-y-2 list-none p-0 mb-8">
    {posts.map((p) => (
      <li>
        <a href={`/blog/${p.id}/`} class="text-accent hover:underline">{p.data.title}</a>
        <span class="text-muted text-sm"> · {p.data.date.toLocaleDateString('zh-TW')}</span>
      </li>
    ))}
  </ul>
  <p class="text-sm">
    <a href="/tools/" class="text-accent hover:underline">Tools</a> ·
    <a href="/guides/" class="text-accent hover:underline">Guides</a>
  </p>
</BaseLayout>
```

- [ ] **Step 2: 刪除 Counter 煙霧測試**

```bash
git rm src/components/Counter.tsx
```

- [ ] **Step 3: 建置並驗證(首頁無 Counter、列最新文章)**

Run: `npm run build`
Expected: build 成功。
```bash
grep -o "最新文章" dist/index.html | head -1
grep -c "React island clicks" dist/index.html
grep -rc "Counter" src/ || true
```
Expected:首頁含「最新文章」與文章連結;`React island clicks` 計數為 0(煙霧測試已移除);`src/` 無 `Counter` 殘留參照。

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "Rebuild home page with recent posts; remove smoke-test counter"
```

---

## 收尾驗證(全部 Task 後)

- [ ] **本機 dev 人工確認(互動功能)**

Run: `npm run dev`
確認:`/metronome/` 可開始/停止、會發聲;`/rummikub-timer/` 倒數正常、全螢幕進出、深色;`/lottery/` 填範例 + 固定 seed 兩次抽籤結果一致、下載 Excel 成功;`/tools/` 三連結可達;首頁列最新文章、無 React 計數器。

- [ ] **確認 master 不受影響**

`git diff master astro -- _pages parking_lottery.html assets _config.yml` 應無本子專案造成的 Jekyll 來源變更(工具來源檔未被修改)。

---

## Self-Review 結果
- **Spec coverage:** 移植方針 is:inline/is:global(spec §1)→ 共用配方 + Task 1-3;三工具頁(spec §2)→ Task 1/2/3;共用樣式(spec §3)→ Task 1;`/tools/`(spec §4)→ Task 4;首頁重建 + 刪 Counter(spec §5/§6)→ Task 5。全部對應。cutover(spec「不在 C」)正確排除。
- **Placeholder scan:** 無 TBD;新建小檔(tools.css 來源、tools.astro、index.astro)給完整內容或明確來源;三個工具的 bulky 內文明確指示「從 master 取原文逐字、套配方」(刻意,避免重貼數百行)。
- **一致性:** `.tool-page` 包層規則(已存在者不重包:rummikub/lottery;需新增者:metronome)、`is:inline`/`is:global`、URL(/metronome/ /rummikub-timer/ /lottery/ /tools/)、`src/styles/tools.css` import、首頁 `/blog/${id}/` 與 token class 在各 Task 間一致。
