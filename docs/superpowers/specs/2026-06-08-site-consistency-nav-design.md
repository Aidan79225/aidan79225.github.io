# 全站視覺一致性 + 導覽重整設計

- 日期:2026-06-08
- 範圍:統一工具頁與佈景的視覺、重整 topbar 資訊架構、新增 Guides collection
- 佈景:minimal-mistakes 4.27.3(dark skin),既有唯一視覺基準

## 背景與問題

使用者反映兩個感受:

1. **視覺不一致**:內容頁(About/Tech/Food/posts)走 minimal-mistakes 佈景,但工具頁 `parking_lottery.html`、`rummikub_timer.html`、`odoo-usage-guide.html` 是 `layout: none` + 手寫淺色 inline CSS,看起來像另一個網站。(`metronome.html` 已是 `layout: single`,為現成目標範例。)
2. **topbar 分類不明確**:導覽把「內容分類」(About/Tech/Food)與「個別工具」(Metronome/Rummikub Timer/Odoo 使用指南)平鋪同一排,且 `parking_lottery` 未列入。

根因:站內內容其實有三種**本質不同**的型態,卻沒有對應的分區。

## 資訊架構(目標)

| 型態 | 機制 | 內容 | 特性 |
|---|---|---|---|
| 互動工具 Tools | `_pages/tools.md` 著陸頁 | 節拍器、拉密計時、車位抽籤 | 「用」的東西 |
| 常駐手冊 Guides | `guides` collection | odoo 使用指南 + 未來更多 | 持續更新、**無日期**、查閱 |
| 文章 Tech/Food | posts(既有) | 領導力、BTL、拉麵… | 有日期、依時間排 |

選擇 collection 而非 post 來放手冊:post 天生綁發佈日期並進時間軸彙整,對「會一直改、描述當下流程」的手冊是誤導性的欄位;collection 正是為「一組無日期、持續維護的頁面」設計,且可自動列表、可擴充(新增手冊 = 丟一個檔案)。

## 設計內容

### 1. 導覽列 `_data/navigation.yml`
最終:`Home · About · Tech · Food · Guides · Tools`
- 移除個別項:`Metronome`、`Rummikub Timer`、`Odoo 使用指南`
- 新增:`Tools → /tools/`、`Guides → /guides/`
- 導覽項名稱用英文以配合既有 `Home/About/Tech/Food`

### 2. Guides collection
- `_config.yml` 的 `collections` 註冊 `guides`,設 `output: true`,並設 collection 的 `permalink` 使各篇有獨立網址。
- 新資料夾 `_guides/`。
- `odoo-usage-guide` 移入 `_guides/`:
  - front matter `layout: single`、`title`、`permalink: /odoo-usage-guide/`(**網址不變**,現有連結不壞)、**不設 date**
  - 加一句 `description`(供 `/guides/` 列表顯示)
  - 去除 `<!DOCTYPE>/<html>/<head>/<body>` 外殼,內容包進 `.tool-page`,套共用深色樣式
- 新 `/guides/` 彙整頁(`_pages/guides.md`):`layout: single`,以 Liquid 迭代 `site.guides` 自動列出每篇的標題 + `description`,**不顯示日期**,風格同佈景的列表。

### 3. Tools 著陸頁 `_pages/tools.md`
- `layout: single`、`permalink: /tools/`、title「Tools」
- **簡單清單**(標題 — 一句說明,直排),三個互動工具:
  - 🎵 線上節拍器 `/metronome/` — 練習用的可調速節拍器
  - ⏱ 拉密計時 `/rummikub-timer/` — 桌遊回合計時器
  - 🅿️ 車位抽籤 `/lottery/` — 可重現的公正抽籤

### 4. 工具頁收編(`parking_lottery.html`、`rummikub_timer.html`)
metronome 已是 `layout: single`,不動。其餘兩頁:
- front matter:`layout: none` → `layout: single`,補 `title:`,保留既有 `permalink:`
- 移除 `<!DOCTYPE>/<html>/<head>/<body>` 外殼(佈景提供);原 `<title>` 內容移到 front matter `title`
- 可見內容包進 `<div class="tool-page"> … </div>`
- 既有 `<script>`(含 `parking_lottery` 的 xlsx CDN)與所有 JS **原樣保留**,功能不變
- 移除淺色 inline `<style>`,改用第 6 節的共用深色樣式;頁面僅保留自己獨有的版面規則

### 5. 拉密計時全螢幕鈕
- 在 `rummikub_timer.html` 加一個「全螢幕」按鈕,呼叫 Fullscreen API 對計時器容器 `requestFullscreen()`(含瀏覽器前綴 fallback)。
- 平時顯示站台 topbar;按下進入乾淨大畫面,Esc 或再按一次退出。

### 6. 共用控件樣式 `assets/css/tools.scss`
- 置於 `assets/css/`,含 Jekyll front matter dashes 以被編譯成 `/assets/css/tools.css`。
- 於 `_includes/head/custom.html` 全站載入一次(`<link>`)。
- **所有規則 scope 在 `.tool-page` 底下**,定義 `button`/`input`/`textarea`/結果區塊等的深色配色,讓工具彼此一致且融入佈景;不影響文章/內容頁。

## 不變的部分
- 既有 posts(Tech/Food)、About 頁、佈景設定(skin、留言、搜尋、MathJax)維持不動。
- `metronome.html` 已整合,不在本次改動範圍(僅出現在 Tools 清單)。
- 各工具的功能性 JS 邏輯不變(僅外殼與樣式調整)。

## 風險 / 注意
- minimal-mistakes `single` 版型內容寬度有限,計時器/抽籤可能需要更寬 → `.tool-page` 視需要放寬寬度。
- collection permalink 設定務必讓 odoo 維持 `/odoo-usage-guide/`,避免既有連結失效。
- 收編後各工具 JS 可能被佈景 CSS 干擾,需逐一實機確認。
- `_guides/` 內檔案需確認 Jekyll 正確編譯(collection 需 `output: true` 才產生頁面)。

## 驗證方式
靜態站、無 JS 測試框架 → `bundle exec jekyll serve` 實機驗證:
- topbar 顯示六項:`Home · About · Tech · Food · Guides · Tools`。
- `/tools/` 列出三個互動工具,連結正確。
- `/guides/` 自動列出 odoo(無日期),`/odoo-usage-guide/` 網址仍可達。
- `parking_lottery`、`rummikub_timer`、odoo 三頁套上深色佈景、控件樣式一致。
- 功能正常:抽籤可重現、Excel 下載、計時器計時、計時器全螢幕可進可出。
- 文章/內容頁未受 `.tool-page` 樣式影響。
