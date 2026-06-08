# Astro 遷移・子專案 A:地基設計

- 日期:2026-06-08
- 範圍:在現有 Jekyll repo 內建立可部署的 Astro 骨架(scaffold + 部署流程 + 基礎 layout + 導覽),**不含**內容/工具遷移
- 前提:這是「Jekyll → Astro 遷移」大專案拆解後的第一個子專案

## 背景與動機

現站為 Jekyll + minimal-mistakes(dark skin),託管於 GitHub Pages(user site `aidan79225.github.io`)。決定遷移到 Astro 的三個實質動機:

1. **Ruby 環境麻煩** — 本機未裝 Ruby,`jekyll serve` 無法在本機預覽;Astro 走 Node 生態,本機開發順。
2. **更強的互動** — Astro islands 架構可用 React 元件、按需載入 JS;既有 vanilla JS 工具未來可元件化。
3. **後續要做 sample/demo 網站(如電商展示)** — Jekyll 不適合互動 demo,Astro 正是為此設計。

## 大專案拆解(本 spec 只涵蓋 A)

| 子專案 | 內容 |
|---|---|
| **A. 地基(本 spec)** | Astro scaffold + GitHub Actions 部署 + 基礎 layout/導覽 |
| B. 內容遷移 | posts → content collections;About/Tech/Food/Guides |
| C. 工具遷移 | metronome / timer / lottery / odoo → Astro 頁面或 islands |
| D. Sample 網站(之後) | 電商展示等 demo |

每個子專案各自走 spec → plan → 實作。

## 技術選型(已確認)

- **Astro** + **React** integration(`@astrojs/react`)
- **Tailwind CSS**(`npx astro add react tailwind`)
- 外觀**沿用目前深色調性**,以 Tailwind theme tokens 重現(背景/文字/accent),維持視覺連續性
- 部署:**GitHub Actions → GitHub Pages**

## 倉庫與分支策略(零中斷的關鍵)

GitHub user site 同一網域只能有單一來源,Jekyll 與 Astro 無法同時上線。因此:

- 在 `aidan79225.github.io` **同一 repo** 開長期分支 `astro`。
- `master` 維持 Jekyll、**線上不變**。
- 子專案 A/B/C 都在 `astro` 分支累積。
- **全部完成後**才 merge 到 master,並把 GitHub Pages 來源從目前的(Jekyll 分支建置)切成 **GitHub Actions**——一次性切換。
- 新增的 `.github/workflows/deploy.yml` 在 Pages 來源尚未切成 Actions 前**不會部署到線上網域**,故開發期間安全。

## 設計內容(子專案 A)

### 1. Astro 專案骨架
- 以 `npm create astro@latest`(minimal/empty 範本)建立,再 `npx astro add react tailwind`。
- `astro.config.mjs`:
  - `site: 'https://aidan79225.github.io'`
  - `base: '/'`(user site 根路徑)
  - integrations 含 react(與 tailwind 整合)
- 目錄結構:
  - `src/layouts/BaseLayout.astro`
  - `src/components/Nav.astro`
  - `src/pages/index.astro`
  - Tailwind 設定檔內定義深色 palette tokens

### 2. 基礎 layout + 導覽
- `BaseLayout.astro`:含 `<head>`(meta、字體、深色背景)、`<Nav/>`、`<slot/>`、footer。
- `Nav`:沿用目前導覽結構 `Home · About · Tech · Food · Guides · Tools`。
- 此階段這些連結對應的頁面多為**佔位 stub**(實際內容由 B/C 填);因不在線上,半成品可接受。
- `index.astro`:簡單的深色著陸頁。

### 3. React island 煙霧測試
- 放置一個極小的 React 元件(island)於首頁,確認 `@astrojs/react` 整合可正常掛載與互動(例如一個點擊計數器)。此元件僅為驗證用,後續可移除。

### 4. 部署流程
- `.github/workflows/deploy.yml`:採 Astro 官方 GitHub Pages 流程(`withastro/action` + `actions/deploy-pages`),觸發於 `astro` 分支 push(或之後 master)。
- 在 repo 的 Pages 設定切成「GitHub Actions」之前不會影響線上;切換動作保留到整個遷移完成(B/C 後)。

## 不在 A 範圍

- 文章/分類/Guides/Tools 的實際內容遷移(B、C)。
- 工具元件化、demo/電商展示站(C、D)。
- 正式把線上網域切到 Astro(遷移全部完成後才做)。

## 風險 / 注意

- `astro` 為長期分支,期間 master 可能有小幅變動(如 staff_members 清理);切換前需處理合併。
- Astro/Tailwind 版本差異(Tailwind v3 vs v4 的整合方式)以 `astro add` 產生的設定為準,不手動假設。
- user site `base` 必須為 `/`;若誤設會導致資源路徑錯誤。

## 驗證方式

- 本機 `npm run dev`:首頁顯示、導覽列六項齊全、深色風格呈現、React island 可點擊互動。
- `npm run build` 成功產生 `dist/`。
- GitHub Actions 在 `astro` 分支能成功 build(此階段不要求部署到線上)。
- `master` 上的 Jekyll 線上站完全不受影響。
