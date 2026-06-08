# Astro 遷移・子專案 C:互動工具遷移設計

- 日期:2026-06-08
- 範圍:把 3 個互動工具、`/tools/` 著陸頁遷移到 Astro,並重建首頁
- 前提:子專案 A(地基)、B(內容)已完成於 `astro` 分支;Jekyll 仍在 master 線上

## 背景

master 上的互動工具(皆為能運作的 HTML + vanilla JS):
- **metronome**(`_pages/metronome.html`,`/metronome/`)— 可調速節拍器,Web Audio。
- **rummikub timer**(`_pages/rummikub_timer.html`,`/rummikub-timer/`)— 桌遊計時,倒數、Web Audio、Wake Lock、全螢幕鈕。
- **parking lottery**(`parking_lottery.html`,`/lottery/`)— Mulberry32 + xmur3 可重現抽籤、xlsx(SheetJS CDN)下載 Excel。

另外:Nav 已連 `/tools/` 但該頁尚未建立;首頁仍是子專案 A 的佔位文字 + React 計數器煙霧測試。

## 已確認決策

- 三個工具**原樣 vanilla JS 移植**(不 React 化);React 整合保留供子專案 D 的新 demo 使用。
- 重建首頁:移除 React Counter 與佔位文字,做簡潔深色首頁,**含最新文章**。
- `/tools/` 只列三個互動工具(odoo 屬 `/guides/`)。

## 設計內容

### 1. 移植方針(關鍵技術點)
Astro 兩個預設行為會破壞「原樣 vanilla」移植,必須處理:
- **`<script is:inline>`**:Astro 預設把 `<script>` 當 ES module 打包,會使 inline `onclick="fn()"` 依賴的全域函式失效。工具 JS 一律用 `is:inline` 維持全域作用域;parking lottery 的 SheetJS CDN 用 `<script is:inline src="…xlsx…">`。
- **`<style is:global>`**:Astro 預設 scoped style 不套用到 JS 動態產生的元素。工具樣式用 `is:global`,維持既有 `.tool-page` 前綴避免外漏。

### 2. 三個工具頁(保留 URL)
- `src/pages/metronome.astro` → `/metronome/`
- `src/pages/rummikub-timer.astro` → `/rummikub-timer/`
- `src/pages/lottery.astro` → `/lottery/`

每頁:取 master 原始 HTML/JS/CSS,可見內容包進 `<div class="tool-page">…</div>`,以 BaseLayout 包裹;JS 用 `is:inline`、style 用 `is:global`。保留所有功能:節拍、倒數、Web Audio、Wake Lock、全螢幕、Mulberry32 抽籤、Excel 下載。不改演算法/邏輯。

### 3. 共用工具控件樣式
- 將 Jekyll 的 `assets/css/tools.scss`(`.tool-page` 下的深色 `button`/`input`/`textarea`/`.result`)移植為 `src/styles/tools.css`,由三個工具頁 import(僅工具頁載入)。

### 4. `/tools/` 著陸頁
- `src/pages/tools.astro`(BaseLayout)— 簡單清單:
  - 🎵 線上節拍器 `/metronome/` — 練習用的可調速節拍器
  - ⏱ 拉密計時 `/rummikub-timer/` — 桌遊回合計時器
  - 🅿️ 車位抽籤 `/lottery/` — 可重現的公正抽籤

### 5. 首頁重建(`src/pages/index.astro`)
- 移除 `Counter` import 與 `<Counter client:load />`,移除 A 的佔位文字。
- 內容:站名標題 + 一句簡介 + 「最新文章」(blog collection 依日期取最近 5 篇,連 `/blog/<slug>/`)+ 通往 `/tools/`、`/guides/` 的入口。
- 用 BaseLayout、深色、Tailwind。

### 6. 清理
- 刪除 `src/components/Counter.tsx`(A 的煙霧測試,已無用)。

## 不在 C 範圍

- **正式 cutover**(會改動線上):merge `astro`→master、刪除 `.github/workflows/jekyll-gh-pages.yml`、把 GitHub Pages 來源改成 GitHub Actions、評估 Astro 版本升級(CVE)。此為 C 完成後由使用者拍板的獨立步驟。
- 子專案 D 的 sample/demo(電商展示等)。

## 風險 / 注意
- `is:inline` script 不被 Astro 處理 → 無 TypeScript/打包,但這正是「原樣移植」要的;確保 inline `onclick` 全域函式可用。
- 工具的 `<style>` 用 `is:global` → 必須維持 `.tool-page` 前綴,避免污染其他頁。
- SheetJS 走外部 CDN,離線/CDN 不可用時 Excel 下載失效(與現況相同,不改變)。
- rummikub 全螢幕鈕已於 Jekyll 版加入;移植時一併保留 `toggleFullscreen` 與 `:fullscreen` 樣式。
- 互動功能無法在靜態 build 完整驗證,需 `npm run dev` 人工確認。

## 驗證方式
- `npm run build` 成功;`dist/` 產生 `/metronome/`、`/rummikub-timer/`、`/lottery/`、`/tools/`、首頁(不含 React Counter)。
- 首頁列出最新文章且連結正確;`/tools/` 列三個工具且連結可達。
- `npm run dev` 人工確認:節拍器發聲、計時器倒數 + 全螢幕進出、抽籤同 seed 可重現 + Excel 下載、深色一致。
- `src/components/Counter.tsx` 已刪除;`grep` 確認無殘留 Counter 參照。
- Jekyll(master)不受影響;變更只在 `astro` 分支的 `src/`、`public/`。
