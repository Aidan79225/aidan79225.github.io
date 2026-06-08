# Astro 遷移・子專案 A:地基 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在現有 repo 的長期分支 `astro` 上,建立一個可 build、套深色佈景、含導覽與 React island、並備妥 GitHub Pages 部署流程的 Astro 骨架。

**Architecture:** 在 `aidan79225.github.io` 同 repo 開 `astro` 分支(master 維持 Jekyll 線上不變)。手動建立 Astro 專案檔(避免互動式 scaffolder),裝 React + Tailwind v4,以 `BaseLayout` + `Nav` 提供深色版型,首頁放一個 React island 煙霧測試,並加一個只在 master 觸發的部署 workflow(切換前不會部署到線上)。

**Tech Stack:** Astro 5、@astrojs/react 4 + React 19、Tailwind CSS v4(`@tailwindcss/vite`)、TypeScript、GitHub Actions。本機 Node v24.15.0 / npm 11.12.1(已確認可用)。

**參考 spec:** `docs/superpowers/specs/2026-06-08-astro-foundation-design.md`

---

## 檔案結構

- `package.json` — 專案與相依、scripts
- `astro.config.mjs` — Astro 設定(site/base、react、tailwind vite plugin)
- `tsconfig.json` — TS 設定(react-jsx)
- `.gitignore`(修改)— 加入 `node_modules/`、`dist/`、`.astro/`
- `src/styles/global.css` — Tailwind 匯入 + 深色 `@theme` tokens
- `src/components/Nav.astro` — 導覽列
- `src/components/Counter.tsx` — React island 煙霧測試
- `src/layouts/BaseLayout.astro` — 基礎版型
- `src/pages/index.astro` — 首頁
- `.github/workflows/deploy.yml` — GitHub Pages 部署(只在 master 觸發)

**測試策略:** 此為基礎建設,無單元測試框架。每個 Task 以實際指令驗證:`npm install` / `npm run build` 成功、產物 `dist/` 內容符合預期(用 grep 檢查)、本機 dev 可預覽。Node/npm 已確認可用。所有指令在 repo 根目錄、`astro` 分支上執行。

**版本備註:** 下列檔案內容以 Astro 5 + Tailwind v4 + React 19 的現行建議組合撰寫。若某套件實際版本的整合細節有出入,**以「`npm run build` 通過且 React island 能 hydrate」為驗收準則**,允許對設定做最小幅度調整以通過建置(例如 Tailwind 匯入語法、@astrojs/react 版本)。

---

## Task 1: 建立 `astro` 分支與可 build 的 Astro 骨架

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/pages/index.astro`
- Modify: `.gitignore`

- [ ] **Step 1: 從 master 建立並切到 `astro` 分支**

Run:
```bash
git checkout master
git checkout -b astro
```
Expected: 切到新分支 `astro`(含既有 Jekyll 檔與 docs)。

- [ ] **Step 2: 建立 `package.json`**

```json
{
  "name": "aidan-site",
  "type": "module",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/react": "^4.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

- [ ] **Step 3: 建立 `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://aidan79225.github.io',
  base: '/',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 4: 建立 `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

- [ ] **Step 5: 建立最小首頁 `src/pages/index.astro`**

```astro
---
---
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <title>Aidan's Blog</title>
  </head>
  <body>
    <h1>Astro foundation OK</h1>
  </body>
</html>
```

- [ ] **Step 6: 修改 `.gitignore`,加入 Node/Astro 產物**

在檔案末尾追加:
```
node_modules/
dist/
.astro/
```

- [ ] **Step 7: 安裝相依並建置**

Run:
```bash
npm install
npm run build
```
Expected: `npm install` 成功;`npm run build` 印出 `Complete!`/build 成功且產生 `dist/index.html`(含 `Astro foundation OK`)。

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json src/pages/index.astro .gitignore
git commit -m "Scaffold Astro project (builds an empty page)"
```

---

## Task 2: Tailwind v4 + 深色 theme tokens

**Files:**
- Create: `src/styles/global.css`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: 建立 `src/styles/global.css`(Tailwind 匯入 + 深色 tokens)**

```css
@import "tailwindcss";

@theme {
  --color-base: #1f2330;
  --color-surface: #262b3a;
  --color-ink: #e6e6e6;
  --color-muted: #9aa4b2;
  --color-accent: #4f6df5;
  --color-line: #3a4154;
}
```

- [ ] **Step 2: 在首頁匯入 global.css 並用一個 Tailwind 深色 class 驗證**

把 `src/pages/index.astro` 改成:
```astro
---
import '../styles/global.css';
---
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <title>Aidan's Blog</title>
  </head>
  <body class="bg-base text-ink">
    <h1 class="text-accent">Astro foundation OK</h1>
  </body>
</html>
```

- [ ] **Step 3: 建置並確認 Tailwind 生效**

Run: `npm run build`
Expected: build 成功。產物 CSS 內含由 tokens 產生的色票。
驗證:`grep -rl "1f2330\|#1f2330\|--color-base" dist/` 應找到含該色的 CSS 檔(Tailwind 已把 `bg-base` 等 utility 編譯進產物)。

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css src/pages/index.astro
git commit -m "Add Tailwind v4 with dark theme tokens"
```

---

## Task 3: BaseLayout + Nav(深色版型)

**Files:**
- Create: `src/components/Nav.astro`, `src/layouts/BaseLayout.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: 建立 `src/components/Nav.astro`**

```astro
---
const items = [
  { title: 'Home', url: '/' },
  { title: 'About', url: '/about/' },
  { title: 'Tech', url: '/tech/' },
  { title: 'Food', url: '/food/' },
  { title: 'Guides', url: '/guides/' },
  { title: 'Tools', url: '/tools/' },
];
---
<nav class="bg-surface border-b border-line">
  <ul class="max-w-3xl mx-auto px-4 py-3 flex flex-wrap gap-4 list-none m-0">
    {items.map((i) => (
      <li><a href={i.url} class="text-ink hover:text-accent no-underline">{i.title}</a></li>
    ))}
  </ul>
</nav>
```

- [ ] **Step 2: 建立 `src/layouts/BaseLayout.astro`**

```astro
---
import '../styles/global.css';
import Nav from '../components/Nav.astro';
const { title = "Aidan's Blog" } = Astro.props;
---
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
  </head>
  <body class="bg-base text-ink min-h-screen">
    <Nav />
    <main class="max-w-3xl mx-auto px-4 py-8">
      <slot />
    </main>
    <footer class="max-w-3xl mx-auto px-4 py-8 mt-12 border-t border-line text-muted text-sm">
      © 2026 Aidan's Blog
    </footer>
  </body>
</html>
```

- [ ] **Step 3: 改寫首頁使用 BaseLayout**

`src/pages/index.astro`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Aidan's Blog">
  <h1 class="text-2xl font-bold mb-4">Aidan's Blog</h1>
  <p class="text-muted">Astro 遷移地基(子專案 A)。</p>
</BaseLayout>
```

- [ ] **Step 4: 建置並確認導覽存在**

Run: `npm run build`
Expected: build 成功。`grep -l "Guides" dist/index.html` 命中;`dist/index.html` 含六個導覽連結(Home/About/Tech/Food/Guides/Tools)與 footer。

- [ ] **Step 5: Commit**

```bash
git add src/components/Nav.astro src/layouts/BaseLayout.astro src/pages/index.astro
git commit -m "Add dark BaseLayout and Nav"
```

---

## Task 4: React island 煙霧測試

**Files:**
- Create: `src/components/Counter.tsx`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: 建立 `src/components/Counter.tsx`**

```tsx
import { useState } from 'react';

export default function Counter() {
  const [n, setN] = useState(0);
  return (
    <button
      onClick={() => setN(n + 1)}
      className="bg-accent text-white px-4 py-2 rounded"
    >
      React island clicks: {n}
    </button>
  );
}
```

- [ ] **Step 2: 在首頁掛載為 island(`client:load`)**

`src/pages/index.astro`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Counter from '../components/Counter.tsx';
---
<BaseLayout title="Aidan's Blog">
  <h1 class="text-2xl font-bold mb-4">Aidan's Blog</h1>
  <p class="text-muted mb-6">Astro 遷移地基(子專案 A)。</p>
  <Counter client:load />
</BaseLayout>
```

- [ ] **Step 3: 建置並確認 island 有 hydrate**

Run: `npm run build`
Expected: build 成功。`dist/index.html` 含按鈕文字 `React island clicks:`;產物含 hydration 用的 JS(`grep -ri "astro-island\|client" dist/index.html` 應命中 `astro-island` 自訂元素標籤,代表 React island 被正確編譯)。

- [ ] **Step 4: Commit**

```bash
git add src/components/Counter.tsx src/pages/index.astro
git commit -m "Add React island smoke test on home page"
```

---

## Task 5: GitHub Pages 部署 workflow(切換前不部署線上)

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: 建立 `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Build with Astro
        uses: withastro/action@v3
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: 驗證 workflow 不會在 `astro` 分支誤觸發、且 YAML 合法**

說明與檢查:
- 觸發條件是 `push` 到 `master` 與手動 `workflow_dispatch`。此檔目前只存在於 `astro` 分支、`master` 上沒有 → 推 `astro` 分支不會觸發它,**不會部署到線上**(線上仍是 Jekyll)。正式切換(merge 到 master + 把 repo Pages 來源改成 GitHub Actions)留到子專案 B/C 完成後。
- YAML 合法性檢查 Run:
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('.github/workflows/deploy.yml','utf8');if(!/withastro\/action@v3/.test(s)||!/actions\/deploy-pages@v4/.test(s)){process.exit(1)}console.log('workflow ok')"
```
Expected: 印出 `workflow ok`(確認關鍵 action 在位)。

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Pages deploy workflow (triggers on master only)"
```

---

## 收尾驗證(全部 Task 後)

- [ ] **本機 dev 預覽(交付清單,人工確認)**

Run: `npm run dev`
開啟印出的 localhost URL,確認:首頁深色背景、導覽列六項、footer、React 計數器按鈕**點擊會增加**(代表 island 正常 hydrate)。

- [ ] **確認 master Jekyll 不受影響**

Run: `git log master..astro --oneline`(看到 5 個 commit);`master` 分支上沒有 `package.json`/`src/`/workflow(這些只在 `astro` 分支)。線上網域仍由 master 的 Jekyll 提供。

---

## Self-Review 結果

- **Spec coverage:**
  - 技術選型 Astro+React+Tailwind(spec「技術選型」)→ Task 1、2、4
  - 分支策略 `astro`、master 維持 Jekyll(spec「倉庫與分支策略」)→ Task 1 Step 1 + 收尾驗證
  - 專案骨架/設定(spec §1)→ Task 1
  - 深色 theme tokens(spec §1)→ Task 2
  - BaseLayout + Nav 六項(spec §2)→ Task 3
  - React island 煙霧測試(spec §3)→ Task 4
  - 部署 workflow、切換前不上線(spec §4)→ Task 5
  - 全部對應,無遺漏。
- **Placeholder scan:** 無 TBD/TODO;每個建立檔案步驟都附完整內容;驗證指令具體可執行。版本不確定處以「build 通過 + island hydrate」為驗收準則,並明示允許最小設定調整(刻意,因對應 live npm 套件)。
- **一致性:** Tailwind token 名稱(`--color-base/surface/ink/muted/accent/line`)與 utility class(`bg-base`/`text-ink`/`border-line`/`text-accent`/`bg-surface`/`text-muted`)在 Task 2/3/4 間一致;`BaseLayout` props `title`、`Counter` 預設匯出、`client:load` 用法一致;導覽六項與既有 Jekyll 導覽一致。
