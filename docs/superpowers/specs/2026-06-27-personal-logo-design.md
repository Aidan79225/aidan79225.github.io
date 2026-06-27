# 個人品牌 Logo 設計文件

日期:2026-06-27
狀態:設計定案,待實作

## 一句話

一個「節點 A」monogram:單一大寫 A,由節點 + 連線構成(資料工程 / DAG 質感),收進實心強調藍的圓角方形徽章裡。直接呼應這個 blog 的資料工程內容(Airflow / Spark / Kafka / dbt),又夠簡潔耐縮、能當 favicon。

## 設計決策(經視覺companion逐步收斂)

| 決策點 | 結論 | 理由 |
|---|---|---|
| 形態 | monogram(字母標記) | 個人技術品牌最實用,小尺寸耐看 |
| 字母 | 單一大寫 A | 俐落,favicon 16px 也清楚 |
| 概念 | 節點 + 連線(DAG / pipeline) | 呼應 blog 的資料工程主題 |
| 外型 | 圓角方形徽章(app-icon 風) | 當頭像 / favicon / GitHub 大頭照最有品牌感 |
| 配色 | 實心強調藍底 + 深底色 A(D4a) | 對比最強、縮到 16px 仍一眼認得 |
| 節點 | 保留三顆深色節點圓點 | 維持「線路 / 資料」細節,不退化成普通字母 |

## 視覺規格

色票(沿用網站既有深色系 `src/styles/global.css`):
- 強調藍 accent:`#4f6df5`
- 深底色 ink-dark:`#1f2330`(= 網站 `--color-base`)

幾何(`viewBox="0 0 112 112"`):
- 徽章:`rect x=6 y=6 w=100 h=100 rx=24`,fill `#4f6df5`
- A 的邊(stroke `#1f2330`,`stroke-width=4.5`,`stroke-linecap=round`):
  - 左斜:`(56,34) → (36,80)`
  - 右斜:`(56,34) → (76,80)`
  - 橫桿:`(46,64) → (66,64)`
- A 的節點(fill `#1f2330`):頂點 `(56,34) r=7`、左腳 `(36,80) r=6`、右腳 `(76,80) r=6`

圓版(GitHub 大頭照,避免圓角方形被圓形遮罩切角):
- 把徽章的 `rect` 換成 `circle cx=56 cy=56 r=50`,fill `#4f6df5`,A 完全相同。

### 定案 SVG(徽章主檔)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112" role="img" aria-label="Aidan logo">
  <rect x="6" y="6" width="100" height="100" rx="24" fill="#4f6df5"/>
  <g stroke="#1f2330" stroke-width="4.5" stroke-linecap="round">
    <line x1="56" y1="34" x2="36" y2="80"/>
    <line x1="56" y1="34" x2="76" y2="80"/>
    <line x1="46" y1="64" x2="66" y2="64"/>
  </g>
  <circle cx="56" cy="34" r="7" fill="#1f2330"/>
  <circle cx="36" cy="80" r="6" fill="#1f2330"/>
  <circle cx="76" cy="80" r="6" fill="#1f2330"/>
</svg>
```

## 交付物與範圍

SVG 是真相來源;PNG 僅為不吃 SVG 的場合匯出。

**核心(這次要做):**
1. `public/favicon.svg` — 徽章主檔,瀏覽器分頁圖示。
2. `public/assets/logo/logo-badge.svg` — 圓角方形版(通用 / 標頭備用)。
3. `public/assets/logo/logo-circle.svg` — 整圓版(GitHub 大頭照來源)。
4. `public/apple-touch-icon.png`(180×180)+ `public/icon-512.png`(512×512)— 由徽章 SVG 匯出,供 iOS 加到主畫面與 PWA-ish 場合。
5. 接進 `src/layouts/BaseLayout.astro` 的 `<head>`:
   - `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`
   - `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
   - `<meta name="theme-color" content="#1f2330">`
6. `npm run build` 驗證,favicon 正確輸出。

**選配(本次不做,之後可選):**
- Nav 標頭加上「徽章 + Aidan.」lockup(目前 Nav 是純文字連結)。
- 把 `public/assets/images/avatar.webp`(AuthorCard 頭像)換成 logo 圓版。
- GitHub 個人大頭照:由 `logo-circle.svg` 匯出 PNG,使用者手動上傳(GitHub 不吃 SVG)。

## 非目標(YAGNI)
- 不做多色 / 漸層版本(單色徽章已足夠,且最耐縮)。
- 不做動態 / 動畫 logo。
- 不重畫網站整體視覺(只加 logo 與 favicon,不動既有版面)。

## 實作備註
- PNG 匯出方式:用 `sharp`(Astro 相依鏈常已含)或 `npx @resvg/resvg-js` 把 SVG 轉點陣;若環境無工具,退而用線上轉或 Node 腳本,匯出步驟記錄在實作計畫。
- favicon.svg 內不要依賴外部 CSS 變數(獨立檔案,色值寫死)。
- 深色模式:徽章底色是固定藍,不隨系統深淺色變化,無需 `prefers-color-scheme` 處理。
