# 車位抽籤亂數引擎優化設計

- 日期:2026-06-08
- 檔案:`parking_lottery.html`
- 範圍:**只更換亂數引擎**,不動分配規則、介面、Excel 下載與 seed↔日期功能

## 背景與問題

目前 `drawLots` 使用自製的 LCG(Numerical Recipes 經典常數 `1664525 / 1013904223 / 2^32`)當亂數來源,並透過 `getSeedOffsetGenerator()` 以 `seed + 小 offset`(如 `2*23`、`3*29`)衍生多份「獨立」洗牌。這有三個弱點:

1. **LCG 低位元隨機性差** — power-of-2 模數的 LCG,低位元週期極短。(本案因用乘法偏重高位,影響被稀釋。)
2. **假獨立(最關鍵)** — LCG 相鄰 seed 產生高度相關的序列;用 `seed + 小 offset` 衍生的多份洗牌統計上彼此牽連,並非真正獨立。
3. **首筆可預測** — seed 留空時用 `Date.now()`,而 `1664525*seed+…` 是純函數,知道大概時間即可預測首批結果。

對「車位抽籤」這種需要在被質疑時能站得住腳的場景,以上弱點足以影響信任。

## 設計目標

- 維持**可重現性**:公開 seed 後,任何人重跑得到相同結果(可稽核)。因此**不**採用 `crypto.getRandomValues`(無法從 seed 重現)。
- 採用統計品質良好的有種子 PRNG:**Mulberry32**。
- 多份洗牌改用**具名標籤 hash 分流**,徹底解掉「假獨立」與「首筆可預測」。

## 設計內容

### 1. 新增三個小函數

```js
// 字串雜湊:把 "seed:label" 攪成一個 32-bit 種子
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^= h >>> 16) >>> 0;
}

// Mulberry32:統計品質良好的有種子 PRNG,回傳 [0,1) 浮點
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
```

### 2. 改寫 `shuffleArray`

簽章從 `(array, seed)` 改成 `(array, rng)`,內部 Fisher–Yates 直接用傳入的 `rng()`,不再自帶 LCG:

```js
function shuffleArray(array, rng) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

### 3. 改寫 `drawLots` 的洗牌呼叫

- **刪除** `getSeedOffsetGenerator()` 整個函數及其呼叫(`let offsets = getSeedOffsetGenerator()`)。
- 每次洗牌改用具名標籤分流:

```js
households         = shuffleArray(households,         makeRng(seed, 'households'));
priorityHouseholds = shuffleArray(priorityHouseholds, makeRng(seed, 'priorityHouseholds'));
parkings           = shuffleArray(parkings,           makeRng(seed, 'parkings'));
priorityParkings   = shuffleArray(priorityParkings,   makeRng(seed, 'priorityParkings'));
// ...
const winners = shuffleArray([...totalHouseholds], makeRng(seed, 'winners')).slice(0, totalParkings.length);
// ...
const remainingParkings = shuffleArray(
  totalParkings.filter(p => !Object.keys(result).includes(p)),
  makeRng(seed, 'remainingParkings')
);
```

標籤一覽(共 6 條獨立流):`households`、`priorityHouseholds`、`parkings`、`priorityParkings`、`winners`、`remainingParkings`。

## 不變的部分

- 優先戶 / 優先車位的分配規則(`drawLots` 中除洗牌呼叫外的邏輯)
- `getSeed`、`getUTC8DateString`、日期顯示、seed 仍為數字(時間戳)
- `downloadExcel`、`fillExample`、`clearInputs`、`autoResizeAll`、`getUniqueList`、介面與樣式

## 影響說明

- 同一個 seed 仍 **100% 可重現**;但因更換引擎,**新舊 seed 對應的結果會不同**,這是預期行為。

## 驗證方式

- 同一 seed 連按兩次「抽籤」→ 結果完全相同(可重現)。
- 換不同 seed → 結果分佈不同。
- 四份清單與 winners 之間因標籤不同而為獨立流,不再因相鄰 seed 相關。
- 既有功能(Excel 下載、範例填入、清空、日期顯示)行為不變。
