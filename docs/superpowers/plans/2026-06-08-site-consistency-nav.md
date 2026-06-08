# 全站視覺一致性 + 導覽重整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把三個獨立工具頁收編進 minimal-mistakes 深色佈景、重整 topbar 成 Tools/Guides/Tech-Food、並新增 `guides` collection 放常駐手冊(odoo 移入,網址不變)。

**Architecture:** 沿用 minimal-mistakes 佈景為唯一視覺基準。工具頁從 `layout: none`(自帶 `<html>` 外殼與全域 CSS)改成 `layout: single`,內容包進 `.tool-page` 容器,共用一份 scope 在 `.tool-page` 下的深色控件樣式。odoo 改放進 `guides` collection 當 evergreen 手冊。導覽改以「型態」分區。

**Tech Stack:** Jekyll + minimal-mistakes 4.27.3(remote_theme)、SCSS(Jekyll 編譯)、Liquid、純前端 JS。無 JS 測試框架。

**參考 spec:** `docs/superpowers/specs/2026-06-08-site-consistency-nav-design.md`

---

## 檔案結構

- Create: `assets/css/tools.scss` — 共用工具控件深色樣式(scope 在 `.tool-page`)
- Modify: `_includes/head/custom.html` — 全站載入 tools.css
- Modify: `_data/navigation.yml` — topbar 分區
- Create: `_pages/tools.md` — Tools 著陸頁(三個互動工具清單)
- Modify: `parking_lottery.html` — 收編進佈景
- Modify: `_pages/rummikub_timer.html` — 收編進佈景 + 全螢幕鈕
- Modify: `_config.yml` — 註冊 `guides` collection
- Create: `_pages/guides.md` — Guides 彙整頁(自動列 `site.guides`)
- Move+Modify: `_pages/odoo-usage-guide.html` → `_guides/odoo-usage-guide.html` — 收編 + 改 evergreen 手冊

**測試策略:** 靜態站、無 JS 測試框架。每個 Task 的驗證 = `bundle exec jekyll build` 成功編譯(無 Liquid/SCSS 錯誤、collection 正確輸出)+ 檢查產生的 `_site/` 檔案。若環境無 Ruby/bundler,改以結構檢查(grep/檔案存在)替代,並在最後交由使用者用 `jekyll serve` 做視覺確認。每個 Task 結束後 commit。

---

## Task 1: 共用工具控件樣式

**Files:**
- Create: `assets/css/tools.scss`
- Modify: `_includes/head/custom.html`

- [ ] **Step 1: 建立 `assets/css/tools.scss`**

完整內容(開頭兩行 `---` 是 Jekyll 編譯 SCSS 的必要 front matter):

```scss
---
---
// 共用工具控件樣式 — 全部 scope 在 .tool-page 下,不影響文章/內容頁。
// 顏色與 minimal-mistakes dark skin 協調。
.tool-page {
  button {
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 0.5em 1.1em;
    cursor: pointer;
    font-size: 0.95rem;
    margin: 0.25rem;
  }
  button:hover { background: #1d4ed8; }
  button:disabled { background: #3a4154; cursor: not-allowed; }

  input[type="text"],
  input[type="number"],
  textarea,
  select {
    background: #1f2330;
    color: #e6e6e6;
    border: 1px solid #3a4154;
    border-radius: 6px;
    padding: 0.5em;
    font-family: inherit;
  }
  textarea { resize: vertical; }

  .result {
    white-space: pre-line;
    margin-top: 1rem;
  }
}
```

- [ ] **Step 2: 在 `_includes/head/custom.html` 載入這份樣式**

把現有內容(只有 MathJax script)改成在最前面加一行 `<link>`。新的完整內容:

```html
<link rel="stylesheet" href="{{ '/assets/css/tools.css' | relative_url }}">
<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js">
</script>
```

- [ ] **Step 3: 驗證編譯**

Run: `bundle exec jekyll build`
Expected: 編譯成功;`_site/assets/css/tools.css` 存在且含 `.tool-page` 規則。
(若無 bundler:確認 `assets/css/tools.scss` 以 `---\n---` 開頭、`_includes/head/custom.html` 含該 `<link>`。)

- [ ] **Step 4: Commit**

```bash
git add assets/css/tools.scss _includes/head/custom.html
git commit -m "Add shared .tool-page control styles loaded site-wide"
```

---

## Task 2: 導覽重整 + Tools 著陸頁

**Files:**
- Modify: `_data/navigation.yml`
- Create: `_pages/tools.md`

- [ ] **Step 1: 改寫 `_data/navigation.yml`**

移除 `Metronome`、`Rummikub Timer` 兩個個別工具項,新增 `Tools`。**暫時保留** `Odoo 使用指南`(Task 5 才會把它換成 Guides,以免中途出現死連結)。完整新內容:

```yaml
main:
  - title: "Home"
    url: "/"
  - title: "About"
    url: "/about/"
  - title: "Tech"
    url: "/tech/"
  - title: "Food"
    url: "/food/"
  - title: "Tools"
    url: "/tools/"
  - title: "Odoo 使用指南"
    url: "/odoo-usage-guide/"
```

- [ ] **Step 2: 建立 `_pages/tools.md`**

完整內容(簡單清單,三個互動工具):

```markdown
---
layout: single
title: Tools
permalink: /tools/
---

<ul class="tool-list">
  <li>🎵 <a href="{{ '/metronome/' | relative_url }}">線上節拍器</a> — 練習用的可調速節拍器</li>
  <li>⏱ <a href="{{ '/rummikub-timer/' | relative_url }}">拉密計時</a> — 桌遊回合計時器</li>
  <li>🅿️ <a href="{{ '/lottery/' | relative_url }}">車位抽籤</a> — 可重現的公正抽籤</li>
</ul>
```

- [ ] **Step 3: 驗證編譯**

Run: `bundle exec jekyll build`
Expected: 編譯成功;`_site/tools/index.html` 存在,含三個工具連結;`_site/` 的 masthead 含 `Tools` 項、不再含 `Metronome`/`Rummikub Timer`。
(無 bundler:檢查兩檔內容如上。)

- [ ] **Step 4: Commit**

```bash
git add _data/navigation.yml _pages/tools.md
git commit -m "Restructure nav: collapse tools into a Tools landing page"
```

---

## Task 3: 收編 parking_lottery.html

**Files:**
- Modify: `parking_lottery.html`

目前此檔是 `layout: none` 的完整 HTML,且 `<style>` 內用**全域選擇器**(`body`、`textarea`、`button`、`.container`、`.block`、`.result`、`.seed-block`)。收編時必須把外殼移除、樣式全部 rescope 到 `.tool-page` 下,否則會污染佈景。

- [ ] **Step 1: 改 front matter 並移除 HTML 外殼**

把開頭從:
```
---
layout: none
permalink: /lottery/
---
<!DOCTYPE html>
<html lang="zh-Hant">

<head>
  <meta charset="UTF-8">
  <title>車位抽籤</title>
  <style>
```
改成:
```
---
layout: single
title: 車位抽籤
permalink: /lottery/
---

<style>
```
並移除檔案結尾的 `</body>` 與 `</html>`,以及 `<head>`…`</head>`、`<body>` 這些外殼標籤(只留下 `<style>`、可見的 markup、`<script>`)。

- [ ] **Step 2: 把 `<style>` 內所有規則 rescope 到 `.tool-page`**

將 `<style>` 區塊改寫(把每條全域選擇器前面加上 `.tool-page `,並把原本的 `body` 規則改成 `.tool-page`)。完整新 `<style>` 內容:

```html
<style>
  .tool-page {
    margin: 20px 0;
  }
  .tool-page textarea {
    width: 300px;
    min-height: 100px;
    margin: 5px;
    padding: 5px;
    resize: none;
  }
  .tool-page button {
    margin: 5px;
    padding: 5px 10px;
  }
  .tool-page .container {
    display: flex;
    flex-wrap: wrap;
  }
  .tool-page .block {
    margin-right: 20px;
  }
  .tool-page .result {
    margin-top: 20px;
    white-space: pre-line;
  }
  .tool-page .seed-block {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .tool-page .seed-block h3 {
    margin: 0;
    white-space: nowrap;
  }
</style>
```

- [ ] **Step 3: 把可見內容包進 `.tool-page`**

在第一個可見元素(`<h2>車位抽籤系統</h2>`)前加 `<div class="tool-page">`,並在最後一個可見元素(結果 `<div class="result" id="result"></div>`)之後、`<script>` 之前加上對應的 `</div>`。`<script src=...xlsx...>` 與內聯 `<script>` 保留在 `.tool-page` 之外、檔案內即可(JS 透過 id 取元素,位置不影響)。

- [ ] **Step 4: 驗證編譯與功能結構**

Run: `bundle exec jekyll build`
Expected: 編譯成功;`_site/lottery/index.html` 含佈景 masthead 與 `.tool-page`;原 `<style>` 不再有裸 `body{`/裸 `textarea{` 全域規則(grep `\n  body` 應無)。
手動(交付清單):`jekyll serve` 後開 `/lottery/`,確認深色一致、按「抽籤」可運作、「下載 Excel」正常。

- [ ] **Step 5: Commit**

```bash
git add parking_lottery.html
git commit -m "Integrate parking lottery page into the themed layout"
```

---

## Task 4: 收編 rummikub_timer.html + 全螢幕鈕

**Files:**
- Modify: `_pages/rummikub_timer.html`

此檔已是深色,但用**全域 `body{}`** 與大量全域 class 樣式,並自帶 `<html>` 外殼。收編時:移除外殼、把全域樣式 rescope 到 `.tool-page`、加一個全螢幕鈕。

- [ ] **Step 1: 改 front matter 並移除 HTML 外殼**

開頭從:
```
---
layout: none
permalink: /rummikub-timer/
---
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>拉密計時</title>
  <style>
```
改成:
```
---
layout: single
title: 拉密計時
permalink: /rummikub-timer/
---

<style>
```
並移除檔尾 `</body></html>` 與 `<head>…</head>`、`<body>` 外殼。

- [ ] **Step 2: rescope 樣式到 `.tool-page`**

把 `<style>` 內的全域選擇器都加上 `.tool-page` 前綴。特別是:
- 原 `body { margin:0; background:#0d1117; color:#c9d1d9; font-family:...; }` → 改成 `.tool-page { background:#0d1117; color:#c9d1d9; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif; }`(移除 `margin:0`,交給佈景)
- 原 `button, select { font-family: inherit; }` → `.tool-page button, .tool-page select { font-family: inherit; }`
- 其餘 `.setup`、`.timer` 等 class 規則一律前綴成 `.tool-page .setup` 等。

(實作者:逐條在選擇器前加 `.tool-page `;遇到逗號分隔的選擇器,每段都要各自前綴。)

- [ ] **Step 3: 內容包進 `.tool-page`,並加入全螢幕鈕**

在所有可見 markup 外層包一個 `<div class="tool-page" id="rummikub-root"> … </div>`(`<script>` 留在外面)。在計時器主要可見區塊頂端加入全螢幕按鈕:

```html
<button type="button" id="fullscreen-btn" onclick="toggleFullscreen()">⛶ 全螢幕</button>
```

並在既有 `<script>` 內(或新增一段 `<script>`)加入:

```javascript
function toggleFullscreen() {
  const el = document.getElementById('rummikub-root');
  const doc = document;
  const isFs = doc.fullscreenElement || doc.webkitFullscreenElement;
  if (!isFs) {
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) req.call(el);
  } else {
    const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
    if (exit) exit.call(doc);
  }
}
```

並補一條樣式,讓全螢幕時填滿深色背景:

```css
.tool-page:fullscreen { background:#0d1117; overflow:auto; padding:1rem; }
.tool-page:-webkit-full-screen { background:#0d1117; overflow:auto; padding:1rem; }
```

(把上面兩條 CSS 加進該頁 `<style>` 內。)

- [ ] **Step 4: 驗證編譯**

Run: `bundle exec jekyll build`
Expected: 編譯成功;`_site/rummikub-timer/index.html` 含 masthead、`.tool-page`、`#fullscreen-btn`;原 `<style>` 無裸 `body{` 全域規則。
手動(交付清單):`/rummikub-timer/` 計時功能正常、「全螢幕」可進可出且畫面乾淨。

- [ ] **Step 5: Commit**

```bash
git add _pages/rummikub_timer.html
git commit -m "Integrate rummikub timer into theme with a fullscreen button"
```

---

## Task 5: Guides collection + odoo 移入 + Guides 著陸頁 + 導覽收尾

**Files:**
- Modify: `_config.yml`
- Move+Modify: `_pages/odoo-usage-guide.html` → `_guides/odoo-usage-guide.html`
- Create: `_pages/guides.md`
- Modify: `_data/navigation.yml`

- [ ] **Step 1: 註冊 `guides` collection(`_config.yml`)**

現有:
```yaml
collections:
  - staff_members
```
改成 mapping 形式並加入 guides:
```yaml
collections:
  staff_members:
    output: false
  guides:
    output: true
    permalink: /guides/:name/
```
(各手冊會以 front matter 的 `permalink` 覆寫,確保 odoo 維持 `/odoo-usage-guide/`。)

- [ ] **Step 2: 把 odoo 檔案移到 `_guides/` 並收編**

用 `git mv` 保留歷史:
```bash
git mv _pages/odoo-usage-guide.html _guides/odoo-usage-guide.html
```

然後改寫 `_guides/odoo-usage-guide.html`:
- front matter 從:
```
---
layout: none
permalink: /odoo-usage-guide/
---
```
改成(evergreen、無 date、用佈景內建 TOC):
```
---
layout: single
title: 家庭農場 ERP・Odoo 18 使用流程
permalink: /odoo-usage-guide/
description: 家庭農場 ERP・Odoo 18 操作流程手冊
toc: true
toc_label: 目錄
toc_sticky: true
---
```
- 移除 `<!DOCTYPE>/<html>/<head>…</head>/<body>/</body>/</html>` 外殼與 `<title>`。
- **移除自製的固定側欄 `nav.side`**(整段側欄 markup 與其 `.wrap`/`nav.side` 樣式),改用佈景的 `toc: true` 自動目錄。
- 把剩餘 `<style>` 規則 rescope 到 `.tool-page` 下,並移除淺色 `body`/`:root` 全域顏色覆寫(交給深色佈景);保留結構性樣式(卡片、表格間距等)但前綴 `.tool-page `。
- 把主要內容(原本 `.wrap` 內的內容區)包進 `<div class="tool-page"> … </div>`。

(實作者:此頁最複雜,請先完整讀檔再轉換;目標是「深色佈景下可讀的單欄手冊 + 佈景右側自動 TOC」。)

- [ ] **Step 3: 建立 Guides 彙整頁 `_pages/guides.md`**

完整內容(自動列出所有手冊,**不顯示日期**):

```markdown
---
layout: single
title: Guides
permalink: /guides/
---

<ul class="tool-list">
{% for g in site.guides %}
  <li><a href="{{ g.url | relative_url }}">{{ g.title }}</a>{% if g.description %} — {{ g.description }}{% endif %}</li>
{% endfor %}
</ul>
```

- [ ] **Step 4: 導覽收尾(`_data/navigation.yml`)**

把 Task 2 暫留的 `Odoo 使用指南` 項換成 `Guides`。完整最終內容:

```yaml
main:
  - title: "Home"
    url: "/"
  - title: "About"
    url: "/about/"
  - title: "Tech"
    url: "/tech/"
  - title: "Food"
    url: "/food/"
  - title: "Guides"
    url: "/guides/"
  - title: "Tools"
    url: "/tools/"
```

- [ ] **Step 5: 驗證編譯**

Run: `bundle exec jekyll build`
Expected: 編譯成功;`_site/odoo-usage-guide/index.html` 存在(網址不變)且為深色佈景含 TOC;`_site/guides/index.html` 列出 odoo;masthead 含 `Guides` 與 `Tools`、不再含 `Odoo 使用指南`。
手動(交付清單):`/guides/` 列出 odoo、`/odoo-usage-guide/` 可達且深色可讀。

- [ ] **Step 6: Commit**

```bash
git add _config.yml _guides/odoo-usage-guide.html _pages/guides.md _data/navigation.yml
git commit -m "Add guides collection; move odoo guide there; finalize nav"
```

---

## Self-Review 結果

- **Spec coverage:**
  - 導覽列(spec §1)→ Task 2 + Task 5 Step 4
  - Guides collection(spec §2)→ Task 5 Step 1–3
  - Tools 著陸頁(spec §3)→ Task 2 Step 2
  - 工具頁收編(spec §4)→ Task 3(lottery)、Task 4(timer)
  - odoo 收編進 guides(spec §2/§6 等)→ Task 5 Step 2
  - 全螢幕鈕(spec §5)→ Task 4 Step 3
  - 共用樣式(spec §6)→ Task 1
  - 全部對應,無遺漏。
- **Placeholder scan:** 無 TBD/TODO;新建檔(tools.scss、navigation.yml、tools.md、guides.md、_config 片段、全螢幕 JS)均給完整內容。大型既有檔(lottery/timer/odoo)給精確「移除外殼 + rescope + 包 .tool-page」轉換配方而非重貼數百行未變內容 —— 這是刻意的,避免重貼造成漂移。
- **一致性:** `.tool-page` 容器命名、`/tools/`、`/guides/`、`/odoo-usage-guide/`、`/lottery/`、`/rummikub-timer/` 網址在各 Task 與 spec 間一致;導覽最終六項與 spec 一致;`#rummikub-root` 與 `toggleFullscreen()` 在同一 Task 內定義並使用。
- **無死連結檢查:** Task 2 暫留 odoo 項、Task 5 才換成 Guides;Tools 項在 Task 2 建立、`/tools/` 同 Task 產生 → 任一 Task 結束時 topbar 皆無死連結。
