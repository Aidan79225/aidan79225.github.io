---
title: "程式抽籤被質疑黑箱該如何處理"
date: 2025-09-20
category: tech
commentsIssue: 1
---
## 前言
前陣子幫目前社區實作了一個簡單的車位抽籤頁面，後來其他管理委員們認為可能會被住戶質疑這程式不可信任，可能有黑箱疑慮，藉此研究了一下如何證明這個抽籤流程沒有黑箱。

## 黑箱定義
- 複雜的說是抽籤的過程可受某方控制達到特定人士的定義
- 簡單說就是有利的我讓我自己必中籤，不利的我不會被抽中

## 黑箱條件
要達到黑箱必定滿足以下條件之一
1. 抽籤過程不明確
2. 抽籤結果可受控制

要證明流程沒有黑箱疑慮必須保證上面兩點不滿足
1. 程式碼公開 -> 演算流程明確
2. 抽籤流程可重現 -> 結果可被驗證


因此程式設計就必須以「可重現的隨機算法」為核心。

## 可重現的隨機算法

一般常見的 `Math.random()` 雖然可以產生隨機數字，但無法重現，也無法驗證是否被操控。因此我們使用 帶 seed 的隨機演算法（例如線性同餘生成器 LCG 搭配 Fisher–Yates 洗牌法）。
seed：隨機數的起始值，只要相同 seed 就會得到相同結果。
演算法公開：任何人都能檢查程式碼，確認不會有偏袒。
結果可驗證：抽籤後公布 seed，任何人都能重算並驗證結果。

### LCG（線性同餘法, Linear Congruential Generator）

#### 原理
LCG 是一種 偽隨機數產生器，它的數列由下面的公式決定：

$$
X_{n+1} = (a \times X_n + c) \mod m
$$

其中：
- $$ X $$ = 產生的隨機數
- $$ a,c,m $$ = 常數參數
- seed = 初始值 $$X_{0}$$
只要 seed 和參數固定，每次產生的隨機數列就會 完全一樣。

特點
- 優點：簡單、快速、可重現。
- 缺點：隨機性有限（數列週期短），如果參數選不好，可能會有規律性。
- 用途：適合需要「透明且可驗證」的場合（例如抽籤），但不適合安全要求高的場合（像密碼學）。


範例程式碼（JavaScript）
```javascript
function lcg(seed) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280; // a=9301, c=49297, m=233280
    return s / 233280; // 轉成 0~1 之間
  }
}

// 使用範例
let randomFunc = lcg(12345);
console.log(randomFunc());
console.log(randomFunc());
console.log(randomFunc());
```
### 洗牌法（Fisher–Yates Shuffle）

#### 原理
Fisher–Yates 洗牌演算法能夠把一個陣列「均勻隨機打亂」，保證每個排列出現的機率一樣。

Steps：
1. 從最後一個元素開始，隨機挑一個位置，兩者交換。
2. 再往前一個元素，重複步驟，直到所有元素都被處理。

#### 特點
- 優點：隨機性好，每個排列出現機率一致。
- 缺點：需要相依一個隨機數生成器（例如 LCG）。

用途：適合抽籤、亂數排序、遊戲洗牌等場景。


範例程式碼（JavaScript）

```javascript
function shuffleArray(array, seed) {
  const result = array.slice(); // 複製陣列

  // 使用 LCG 當作隨機數生成器
  let randomFunc = lcg(seed);

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomFunc() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// 使用範例
console.log(shuffleArray([1, 2, 3, 4, 5], 12345));
```

## 從 LCG 升級到 Mulberry32

上面的 LCG 雖然簡單、可重現，但實際把它用在車位抽籤時，我們發現幾個弱點:

1. **假獨立(最關鍵)**:我們需要分別洗牌「一般戶、優先戶、一般車位、優先車位、中籤者」等多份清單。原本的做法是用 `seed + 小偏移量`(如 `seed + 46`、`seed + 87`)當作各自的種子，但 LCG 有個已知性質:**相鄰 seed 產生的序列高度相關**，所以這幾份「看似獨立」的洗牌其實統計上彼此牽連。
2. **首筆可預測**:實際的抽籤程式在 seed 欄留空時會用 `Date.now()` 當種子，而 LCG 的輸出是種子的純函式，知道抽籤的大概時間就能預測首批結果。
3. **低位元隨機性差**:若模數取 2 的次方（我們實際程式裡用的版本就是 mod 2³²），最低的幾個位元週期極短（第 k 個低位元週期只有 2^k），規律性明顯。

因此我們把亂數引擎換成 **Mulberry32**（統計品質明顯較好、且一樣可重現），並改用「**把 seed 和一個有意義的標籤一起雜湊**」來分流，徹底解掉假獨立的問題:

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

// 新版洗牌:改吃一個 rng 函數(取代前面吃 seed 整數的版本),不同清單用不同標籤就互相獨立
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

重點是:**換引擎後「可重現」的性質完全不變** —— 只要 seed 和程式碼相同，任何人重跑都會得到一模一樣的結果，黑箱論證依然成立；我們只是讓隨機品質更好、各份洗牌真正獨立。

## seed 的來源

為了避免「主辦方多次嘗試直到抽到想要的結果」，seed 的選取必須透明且不可操控。常見做法有：

1. 抽籤時間戳記 → 按下抽籤按鈕的瞬間毫秒值
2. 事前公布的日期時間 → 例如「活動當天 20:15 的時間字串」
3. 外部公信資料 → 例如區塊鏈最新區塊 hash、彩券開獎號碼
4. 多方共同提供數字 → 住戶代表與管理委員各自提供一個數字組合

這些方式都能避免單方控制抽籤結果。

## 抽籤流程
1. 開直播錄影
2. 展示程式碼以及UI
3. 展示所有的輸入
4. 抽籤只能按一次
5. 將程式碼、輸入資料、隨機seed、抽籤結果保存
6. 公開所有資料以供檢視

## 結論
只用程式很難直接達到無黑箱的可能性，實際上還是要靠流程設計避免主辦方的可控性
1. 靠直播避免主辦方抽很多次選想要的結果
2. 抽籤結果可以透過程式計算重現(保存輸入以及seed)，透過驗算避免人為調整結果
3. seed為毫秒等級，避免人為操控在特定的seed達到特定的結果
4. 公開程式碼並直播抽籤維持公開透明原則
5. 抽籤程式：[原昕吾境機車車位抽籤](/lottery/)