# 車位抽籤亂數引擎升級 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `parking_lottery.html` 的自製 LCG + 小 offset 分流換成 Mulberry32 + xmur3 具名標籤分流,並同步更新部落格文章。

**Architecture:** 在單一 HTML 檔的 `<script>` 內新增 `xmur3` / `mulberry32` / `makeRng` 三個小函數;`shuffleArray` 改吃 rng 函數;`drawLots` 的每次洗牌改用 `makeRng(seed, label)` 取得獨立亂數流,並刪除 `getSeedOffsetGenerator`。部落格文章保留原 LCG 教學,新增一節說明升級理由與新程式碼。分配規則、介面、Excel、seed↔日期皆不變。

**Tech Stack:** 純前端 JavaScript(無建置、無測試框架)、Jekyll Markdown、瀏覽器 DevTools console 做重現性驗證。

**參考 spec:** `docs/superpowers/specs/2026-06-08-parking-lottery-rng-design.md`

---

## 檔案結構

- Modify: `parking_lottery.html` — 在 `<script>` 內新增三個 RNG 函數、改寫 `shuffleArray`、改寫 `drawLots` 洗牌呼叫、刪除 `getSeedOffsetGenerator`。
- Modify: `_posts/2025-09-20-lottery.md` — 於 Fisher–Yates 段落後新增「從 LCG 升級到 Mulberry32」一節。

**測試策略說明:** 本專案是靜態 Jekyll 網站,沒有 JS 單元測試框架,不應為此引入。驗證方式為瀏覽器 DevTools console 的可重現性檢查(同 seed 兩次結果一致、不同 seed 結果不同),這是此頁面的自然驗證路徑。

---

## Task 1: 替換亂數引擎(單一原子變更)

因 `shuffleArray` 簽章改變會牽動 `drawLots`,此 Task 的程式碼變更必須一次完成,避免中間狀態讓頁面壞掉。

**Files:**
- Modify: `parking_lottery.html`(`<script>` 區塊,約第 113–198 行)

- [ ] **Step 1: 在 `getUniqueList` 之後、現有 `shuffleArray` 之前,新增三個 RNG 函數**

在 `parking_lottery.html` 中,於 `getUniqueList` 函數(約第 113–115 行)結束後插入:

```javascript
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^= h >>> 16) >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed, label) {
  return mulberry32(xmur3(`${seed}:${label}`));
}
```

- [ ] **Step 2: 改寫 `shuffleArray`,簽章改為 `(array, rng)`**

把現有的 `shuffleArray` 函數(約第 118–133 行,含內嵌 LCG)整段替換為:

```javascript
function shuffleArray(array, rng) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

- [ ] **Step 3: 刪除 `getSeedOffsetGenerator` 整個函數**

刪除約第 135–142 行的 `getSeedOffsetGenerator` 函數定義。

- [ ] **Step 4: 改寫 `drawLots` 內的洗牌呼叫**

在 `drawLots`(約第 159–198 行)中:

1. 刪除這一行:`let offsets = getSeedOffsetGenerator();`
2. 把四份清單的洗牌(原 `shuffleArray(households, seed)` 等)替換為:

```javascript
households = shuffleArray(households, makeRng(seed, 'households'));
priorityHouseholds = shuffleArray(priorityHouseholds, makeRng(seed, 'priorityHouseholds'));
parkings = shuffleArray(parkings, makeRng(seed, 'parkings'));
priorityParkings = shuffleArray(priorityParkings, makeRng(seed, 'priorityParkings'));
```

3. 把 winners 那一行替換為:

```javascript
const winners = shuffleArray([...totalHouseholds], makeRng(seed, 'winners')).slice(0, totalParkings.length);
```

4. 把 remainingParkings 那一行替換為:

```javascript
const remainingParkings = shuffleArray(totalParkings.filter(p => !Object.keys(result).includes(p)), makeRng(seed, 'remainingParkings'));
```

- [ ] **Step 5: 確認沒有殘留的 LCG / offsets 參照**

Grep 檢查:
Run: `rg -n "getSeedOffsetGenerator|1664525|offsets\(\)" parking_lottery.html`
Expected: 無任何輸出(全部已移除)。

- [ ] **Step 6: Commit**

```bash
git add parking_lottery.html
git commit -m "Replace LCG with Mulberry32 + xmur3 stream splitting"
```

---

## Task 2: 瀏覽器重現性驗證

**Files:** 無(手動驗證)

- [ ] **Step 1: 啟動本機 Jekyll 並開啟頁面**

Run: `bundle exec jekyll serve`
開啟瀏覽器至 `http://localhost:4000/lottery/`。
(若無 Jekyll 環境,可直接用瀏覽器開啟 `parking_lottery.html`,但 Liquid `permalink` front matter 會以純文字顯示,功能仍可測。)

- [ ] **Step 2: 可重現性 — 同 seed 兩次結果一致**

操作:按「範例填入」→ 在 seed 欄輸入固定值如 `12345` → 按「抽籤」,記下結果區文字 → 再按一次「抽籤」。
Expected: 兩次「分配結果 / 未中籤的戶 / 剩餘車位」完全相同。

- [ ] **Step 3: 隨機性 — 不同 seed 結果不同**

操作:把 seed 改為 `99999` → 按「抽籤」。
Expected: 分配結果與 seed `12345` 明顯不同。

- [ ] **Step 4: 既有功能未受影響**

操作:依序測試「下載 Excel」(確認檔案下載且各分頁資料正確)、「清空輸入」、seed 欄輸入時右側日期顯示正常。
Expected: 行為與升級前一致。

- [ ] **Step 5: console 無錯誤**

操作:開 DevTools Console 觀察上述操作。
Expected: 無 `ReferenceError`(例如殘留呼叫 `getSeedOffsetGenerator`)或其他例外。

---

## Task 3: 更新部落格文章

**Files:**
- Modify: `_posts/2025-09-20-lottery.md`

- [ ] **Step 1: 在 Fisher–Yates 段落後、「## seed 的來源」之前,插入新一節**

在 `_posts/2025-09-20-lottery.md` 中,於 Fisher–Yates 範例程式碼區塊結束後(約第 105 行)、`## seed 的來源`(約第 109 行)之前,插入:

````markdown
## 從 LCG 升級到 Mulberry32

上面的 LCG 雖然簡單、可重現,但實際把它用在車位抽籤時,我們發現幾個弱點:

1. **假獨立(最關鍵)**:我們需要分別洗牌「一般戶、優先戶、一般車位、優先車位、中籤者」等多份清單。原本的做法是用 `seed + 小偏移量`(如 `seed + 46`、`seed + 87`)當作各自的種子,但 LCG 有個已知性質:**相鄰 seed 產生的序列高度相關**,所以這幾份「看似獨立」的洗牌其實統計上彼此牽連。
2. **首筆可預測**:seed 留空時用 `Date.now()`,而 LCG 的下一個輸出是純函數,知道大概時間就能預測首批結果。
3. **低位元隨機性差**:power-of-2 模數的 LCG,低位元的週期很短。

因此我們把亂數引擎換成 **Mulberry32**(統計品質明顯較好、且一樣可重現),並改用「**把 seed 和一個有意義的標籤一起雜湊**」來分流,徹底解掉假獨立的問題:

```javascript
// 字串雜湊:把 "seed:label" 攪成一個 32-bit 種子
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^= h >>> 16) >>> 0;
}

// Mulberry32:統計品質良好的有種子 PRNG,回傳 0~1 之間的浮點
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 用 seed + 標籤產生「一條獨立的亂數流」
function makeRng(seed, label) {
  return mulberry32(xmur3(`${seed}:${label}`));
}

// 洗牌時改吃一個 rng 函數,不同清單用不同標籤就互相獨立
function shuffleArray(array, rng) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 使用範例:每份清單一條獨立的流
shuffleArray(households, makeRng(seed, 'households'));
shuffleArray(parkings, makeRng(seed, 'parkings'));
```

重點是:**換引擎後「可重現」的性質完全不變** —— 只要 seed 和程式碼相同,任何人重跑都會得到一模一樣的結果,黑箱論證依然成立;我們只是讓隨機品質更好、各份洗牌真正獨立。
````

- [ ] **Step 2: 確認 Jekyll 正常渲染**

Run: `bundle exec jekyll serve`
開啟該文章頁面。
Expected: 新一節正常顯示,程式碼區塊高亮正常,文章原有的 MathJax 數式($X_{n+1}$ 等)仍正常渲染。

- [ ] **Step 3: Commit**

```bash
git add _posts/2025-09-20-lottery.md
git commit -m "Document LCG-to-Mulberry32 upgrade in lottery post"
```

---

## Self-Review 結果

- **Spec coverage:** spec 的「設計內容」三函數 + `shuffleArray` 改寫 + `drawLots` 改寫 + 刪 `getSeedOffsetGenerator` → Task 1;「驗證方式」→ Task 2;「部落格文章更新」→ Task 3。全部對應。
- **Placeholder scan:** 無 TBD/TODO,所有程式碼步驟皆附完整程式碼。
- **Type consistency:** `shuffleArray(array, rng)`、`makeRng(seed, label)`、標籤名稱(`households`/`priorityHouseholds`/`parkings`/`priorityParkings`/`winners`/`remainingParkings`)在 plan、spec、文章範例間一致。
