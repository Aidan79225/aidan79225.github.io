---
title: "看到 n,就知道該寫什麼:時間複雜度與最大子陣列和"
date: 2026-10-09
category: tech
description: "開一個新系列,讀 CSES 的 Competitive Programmer's Handbook。第一篇講兩件事:時限一秒大約是數億次運算,所以題目給的 n 已經告訴你該用什麼複雜度;以及最大子陣列和從 O(n³) 到 O(n) 的三個解法——每一次變快,都是把暴力解浪費掉的東西撿回來。文中有可以一步一步操作的動畫。"
tags:
  - algorithms
  - cphb
  - complexity
  - book-notes
series: "Competitive Programmer's Handbook 讀書筆記"
seriesOrder: 1
comments: true
draft: false
---
開一個新系列:讀 Antti Laaksonen 的 *Competitive Programmer's Handbook*(CPHB)。這本書是 [CSES Problem Set](https://cses.fi/problemset/) 的配套教材,線上 PDF 免費,三十章從複雜度一路講到幾何,薄、密、沒有廢話。

網路上 CPHB 的筆記和題解很多,這個系列想做三件不一樣的事:

1. **每一篇都從暴力解開始,問它浪費了什麼。** 更快的解法,幾乎都是看出了一個暴力解沒用上的結構。這是貫穿全系列的主軸。
2. **每一篇都有可以親手操作的動畫。** 一步一步往前、往後,也可以改輸入重跑。靜態的圖只能給結論,動畫讓你看見那一步到底省在哪裡。
3. **每一篇都有一段「這招在哪裡上班」**,把競賽技巧接回 Production——接得上就接,接不上就老實說。

第一篇是全書的地基:**時間複雜度**,以及書上用來示範它的經典題——**最大子陣列和**。

## 一秒鐘能做幾件事

時間複雜度是用來估算演算法有多快的工具:把基本運算的次數寫成輸入大小 $n$ 的函數,只留最大的那一項、忽略常數。

估算的起點只有一個數字:**現代電腦一秒大約能做數億次基本運算**。有了這個數字,就能在寫程式之前先判斷:題目時限一秒、$n = 10^5$,你想的解法是 $O(n^2)$——那就是 $10^10$ 次運算,要跑數十秒。**還沒寫就知道不行。**

反過來用更有力:**看到 $n$,就能反推題目要的複雜度。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 314" role="img" aria-label="時限一秒大約能做數億次基本運算,所以看輸入大小 n 就能反推可接受的複雜度:n 小於等於 10 可以用 O(n!) 試所有排列;n 小於等於 20 用 O(2 的 n 次方) 試所有子集;n 小於等於 500 用 O(n³) 三層迴圈;n 小於等於 5000 用 O(n²) 兩層迴圈;n 小於等於 10 的 6 次方要 O(n log n) 或 O(n),也就是排序或掃一遍;n 很大時只能 O(log n) 或 O(1)。每一列的運算量都落在一億上下。例如 n 等於 10 的 5 次方時用 O(n²) 是 10 的 10 次方次,要跑數十秒。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="300" y="22" fill="#e6e6e6" font-size="13" font-weight="bold" text-anchor="middle">時限 1 秒 ≈ 數億次基本運算:看 n,反推能用的複雜度</text>
    <text x="28" y="48" fill="#9aa4b2" font-size="11" text-anchor="start">輸入大小 n</text>
    <text x="150" y="48" fill="#9aa4b2" font-size="11" text-anchor="start">可接受的複雜度</text>
    <text x="320" y="48" fill="#9aa4b2" font-size="11" text-anchor="start">典型做法</text>
    <text x="580" y="48" fill="#9aa4b2" font-size="11" text-anchor="end">運算量</text>
    <rect x="16" y="58" width="568" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="28" y="78" fill="#d6a45c" font-size="13" font-weight="bold">n ≤ 10</text>
    <text x="150" y="78" fill="#e6e6e6" font-size="13" font-weight="bold">O(n!)</text>
    <text x="320" y="78" fill="#9aa4b2" font-size="12">試所有排列</text>
    <text x="576" y="78" fill="#9aa4b2" font-size="11.5" text-anchor="end">10! ≈ 3.6×10⁶</text>
    <rect x="16" y="92" width="568" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="28" y="112" fill="#d6a45c" font-size="13" font-weight="bold">n ≤ 20</text>
    <text x="150" y="112" fill="#e6e6e6" font-size="13" font-weight="bold">O(2ⁿ)</text>
    <text x="320" y="112" fill="#9aa4b2" font-size="12">試所有子集</text>
    <text x="576" y="112" fill="#9aa4b2" font-size="11.5" text-anchor="end">2²⁰ ≈ 10⁶</text>
    <rect x="16" y="126" width="568" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="28" y="146" fill="#d6a45c" font-size="13" font-weight="bold">n ≤ 500</text>
    <text x="150" y="146" fill="#e6e6e6" font-size="13" font-weight="bold">O(n³)</text>
    <text x="320" y="146" fill="#9aa4b2" font-size="12">三層迴圈</text>
    <text x="576" y="146" fill="#9aa4b2" font-size="11.5" text-anchor="end">500³ ≈ 1.3×10⁸</text>
    <rect x="16" y="160" width="568" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="28" y="180" fill="#d6a45c" font-size="13" font-weight="bold">n ≤ 5000</text>
    <text x="150" y="180" fill="#e6e6e6" font-size="13" font-weight="bold">O(n²)</text>
    <text x="320" y="180" fill="#9aa4b2" font-size="12">兩層迴圈、所有配對</text>
    <text x="576" y="180" fill="#9aa4b2" font-size="11.5" text-anchor="end">5000² = 2.5×10⁷</text>
    <rect x="16" y="194" width="568" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="28" y="214" fill="#d6a45c" font-size="13" font-weight="bold">n ≤ 10⁶</text>
    <text x="150" y="214" fill="#e6e6e6" font-size="13" font-weight="bold">O(n log n) 或 O(n)</text>
    <text x="320" y="214" fill="#9aa4b2" font-size="12">排序、掃一遍</text>
    <text x="576" y="214" fill="#9aa4b2" font-size="11.5" text-anchor="end">10⁶×20 = 2×10⁷</text>
    <rect x="16" y="228" width="568" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="28" y="248" fill="#d6a45c" font-size="13" font-weight="bold">n 很大</text>
    <text x="150" y="248" fill="#e6e6e6" font-size="13" font-weight="bold">O(log n) 或 O(1)</text>
    <text x="320" y="248" fill="#9aa4b2" font-size="12">二分搜尋、公式</text>
    <text x="576" y="248" fill="#9aa4b2" font-size="11.5" text-anchor="end">—</text>
    <rect x="16" y="270" width="568" height="30" rx="5" fill="#3a2626" stroke="#dc4c3f" stroke-width="1"/>
    <text x="300" y="290" fill="#e6e6e6" font-size="12" text-anchor="middle">例:n = 10⁵ 卻寫了 O(n²) → 10¹⁰ 次運算,要跑數十秒——還沒寫就知道不行</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">每一列的運算量都落在 10⁷~10⁸ 上下——表上的上限就是這樣算出來的。題目給的 n 等於在告訴你答案大概長什麼樣子。(表格依原書 Ch2〈Estimating efficiency〉)</figcaption>
</figure>

這張表是競賽選手看題目的第一個動作。$n \le 20$ 的題目在暗示「可以窮舉子集」;$n \le 10^6$ 的題目在暗示「排序或掃一遍,而且只有這兩條路」。它直接幫你劃掉一半的思路。

但要記得原書的提醒:**複雜度只是估計,它藏起了常數。** 同樣是 $O(n)$,可能是 $n/2$ 次,也可能是 $5n$ 次——實際跑起來差十倍。

### 怎麼算出複雜度

原書 Ch2 的計算規則,收斂成四條就夠用:

| 程式長相 | 複雜度 | 例子 |
|---|---|---|
| $k$ 層巢狀迴圈,每層跑 $n$ 次 | $O(n^k)$ | 兩層迴圈比較所有配對 → $O(n^2)$ |
| 幾段程式**接著**執行 | 取最慢那一段 | $O(n) + O(n^2) + O(n)$ → $O(n^2)$ |
| 有兩個輸入大小 | 兩個都要寫 | 外層 $n$、內層 $m$ → $O(nm)$ |
| 遞迴 | 呼叫次數 × 每次的成本 | 每次呼叫自己一次、遞迴 $n$ 層 → $O(n)$;每次呼叫自己兩次 → $O(2^n)$ |

## 範例:最大子陣列和

給一個陣列,找出**和最大的連續一段**。書上的例子:

$$[-1,\ 2,\ 4,\ -3,\ 5,\ 2,\ -5,\ 2]$$

答案是 10,也就是 $[2, 4, -3, 5, 2]$——中間那個 $-3$ 要吞下去,因為兩邊加起來比它大。陣列裡有負數,這題才有意思。原書允許空子陣列,所以答案至少是 0。

這題有三個解法,複雜度分別是 $O(n^3)$、$O(n^2)$、$O(n)$。三個解法看的其實是同一個東西:**所有子陣列排成的一個三角形**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 272" role="img" aria-label="陣列 2, -3, 4, -1, 2 的所有子陣列排成三角形,第 a 列第 b 欄代表 array[a..b]。演算法 1 是 O(n³):每一格都從頭加,格子裡的數字是那一格要做的加法次數,總共 35 次。演算法 2 是 O(n²):同一列往右走時沿用前一格的和,每格只加一次,格子裡是區間和,總共 15 次。演算法 3 是 Kadane,O(n):每一欄只留「以 b 結尾的最大和」那一格,它不是接著前一欄留下的那格,就是從自己重新開始,總共 5 次,最大的是 5,也就是 array[2..4]。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="100" y="18" fill="#d6a45c" font-size="12.5" font-weight="bold" text-anchor="middle">演算法 1 · O(n³)</text>
    <text x="100" y="34" fill="#9aa4b2" font-size="11" text-anchor="middle">加法 35 次</text>
    <text x="40" y="64" fill="#9aa4b2" font-size="9.5" text-anchor="end">b →</text>
    <text x="60.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">2</text>
    <text x="88.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">-3</text>
    <text x="116.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">4</text>
    <text x="144.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">-1</text>
    <text x="172.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">2</text>
    <text x="40" y="50" fill="#9aa4b2" font-size="9.5" text-anchor="end">陣列</text>
    <text x="40" y="90.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=0</text>
    <text x="40" y="118.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=1</text>
    <text x="40" y="146.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=2</text>
    <text x="40" y="174.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=3</text>
    <text x="40" y="202.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=4</text>
    <rect x="47" y="73" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="60.0" y="90.0" fill="#d6a45c" font-size="11" text-anchor="middle">1</text>
    <rect x="75" y="73" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="88.0" y="90.0" fill="#d6a45c" font-size="11" text-anchor="middle">2</text>
    <rect x="103" y="73" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="116.0" y="90.0" fill="#d6a45c" font-size="11" text-anchor="middle">3</text>
    <rect x="131" y="73" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="144.0" y="90.0" fill="#d6a45c" font-size="11" text-anchor="middle">4</text>
    <rect x="159" y="73" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="172.0" y="90.0" fill="#d6a45c" font-size="11" text-anchor="middle">5</text>
    <rect x="75" y="101" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="88.0" y="118.0" fill="#d6a45c" font-size="11" text-anchor="middle">1</text>
    <rect x="103" y="101" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="116.0" y="118.0" fill="#d6a45c" font-size="11" text-anchor="middle">2</text>
    <rect x="131" y="101" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="144.0" y="118.0" fill="#d6a45c" font-size="11" text-anchor="middle">3</text>
    <rect x="159" y="101" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="172.0" y="118.0" fill="#d6a45c" font-size="11" text-anchor="middle">4</text>
    <rect x="103" y="129" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="116.0" y="146.0" fill="#d6a45c" font-size="11" text-anchor="middle">1</text>
    <rect x="131" y="129" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="144.0" y="146.0" fill="#d6a45c" font-size="11" text-anchor="middle">2</text>
    <rect x="159" y="129" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="172.0" y="146.0" fill="#d6a45c" font-size="11" text-anchor="middle">3</text>
    <rect x="131" y="157" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="144.0" y="174.0" fill="#d6a45c" font-size="11" text-anchor="middle">1</text>
    <rect x="159" y="157" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="172.0" y="174.0" fill="#d6a45c" font-size="11" text-anchor="middle">2</text>
    <rect x="159" y="185" width="26" height="26" rx="3" fill="#2e2a1a" stroke="#b08d57" stroke-width="1"/>
    <text x="172.0" y="202.0" fill="#d6a45c" font-size="11" text-anchor="middle">1</text>
    <text x="100" y="234" fill="#9aa4b2" font-size="11" text-anchor="middle">每格從頭加</text>
    <text x="300" y="18" fill="#4f6df5" font-size="12.5" font-weight="bold" text-anchor="middle">演算法 2 · O(n²)</text>
    <text x="300" y="34" fill="#9aa4b2" font-size="11" text-anchor="middle">加法 15 次</text>
    <text x="240" y="64" fill="#9aa4b2" font-size="9.5" text-anchor="end">b →</text>
    <text x="260.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">2</text>
    <text x="288.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">-3</text>
    <text x="316.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">4</text>
    <text x="344.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">-1</text>
    <text x="372.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">2</text>
    <text x="240" y="50" fill="#9aa4b2" font-size="9.5" text-anchor="end">陣列</text>
    <text x="240" y="90.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=0</text>
    <text x="240" y="118.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=1</text>
    <text x="240" y="146.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=2</text>
    <text x="240" y="174.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=3</text>
    <text x="240" y="202.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=4</text>
    <rect x="247" y="73" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="260.0" y="90.0" fill="#e6e6e6" font-size="11" text-anchor="middle">2</text>
    <rect x="275" y="73" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="288.0" y="90.0" fill="#e6e6e6" font-size="11" text-anchor="middle">-1</text>
    <rect x="303" y="73" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="316.0" y="90.0" fill="#e6e6e6" font-size="11" text-anchor="middle">3</text>
    <rect x="331" y="73" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="344.0" y="90.0" fill="#e6e6e6" font-size="11" text-anchor="middle">2</text>
    <rect x="359" y="73" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="372.0" y="90.0" fill="#e6e6e6" font-size="11" text-anchor="middle">4</text>
    <rect x="275" y="101" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="288.0" y="118.0" fill="#e6e6e6" font-size="11" text-anchor="middle">-3</text>
    <rect x="303" y="101" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="316.0" y="118.0" fill="#e6e6e6" font-size="11" text-anchor="middle">1</text>
    <rect x="331" y="101" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="344.0" y="118.0" fill="#e6e6e6" font-size="11" text-anchor="middle">0</text>
    <rect x="359" y="101" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="372.0" y="118.0" fill="#e6e6e6" font-size="11" text-anchor="middle">2</text>
    <rect x="303" y="129" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="316.0" y="146.0" fill="#e6e6e6" font-size="11" text-anchor="middle">4</text>
    <rect x="331" y="129" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="344.0" y="146.0" fill="#e6e6e6" font-size="11" text-anchor="middle">3</text>
    <rect x="359" y="129" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="372.0" y="146.0" fill="#e6e6e6" font-size="11" text-anchor="middle">5</text>
    <rect x="331" y="157" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="344.0" y="174.0" fill="#e6e6e6" font-size="11" text-anchor="middle">-1</text>
    <rect x="359" y="157" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="372.0" y="174.0" fill="#e6e6e6" font-size="11" text-anchor="middle">1</text>
    <rect x="359" y="185" width="26" height="26" rx="3" fill="#26324a" stroke="#8aa0e6" stroke-width="1"/>
    <text x="372.0" y="202.0" fill="#e6e6e6" font-size="11" text-anchor="middle">2</text>
    <text x="300" y="234" fill="#9aa4b2" font-size="11" text-anchor="middle">同一列接著加</text>
    <text x="500" y="18" fill="#54b890" font-size="12.5" font-weight="bold" text-anchor="middle">演算法 3 · O(n)</text>
    <text x="500" y="34" fill="#9aa4b2" font-size="11" text-anchor="middle">加法 5 次</text>
    <text x="440" y="64" fill="#9aa4b2" font-size="9.5" text-anchor="end">b →</text>
    <text x="460.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">2</text>
    <text x="488.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">-3</text>
    <text x="516.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">4</text>
    <text x="544.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">-1</text>
    <text x="572.0" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">2</text>
    <text x="440" y="50" fill="#9aa4b2" font-size="9.5" text-anchor="end">陣列</text>
    <text x="440" y="90.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=0</text>
    <text x="440" y="118.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=1</text>
    <text x="440" y="146.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=2</text>
    <text x="440" y="174.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=3</text>
    <text x="440" y="202.0" fill="#9aa4b2" font-size="10" text-anchor="end">a=4</text>
    <rect x="447" y="73" width="26" height="26" rx="3" fill="#223528" stroke="#54b890" stroke-width="1.6"/>
    <text x="460.0" y="90.0" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">2</text>
    <rect x="475" y="73" width="26" height="26" rx="3" fill="#223528" stroke="#54b890" stroke-width="1.6"/>
    <text x="488.0" y="90.0" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">-1</text>
    <rect x="503" y="73" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="531" y="73" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="559" y="73" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="475" y="101" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="503" y="101" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="531" y="101" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="559" y="101" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="503" y="129" width="26" height="26" rx="3" fill="#223528" stroke="#54b890" stroke-width="1.6"/>
    <text x="516.0" y="146.0" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">4</text>
    <rect x="531" y="129" width="26" height="26" rx="3" fill="#223528" stroke="#54b890" stroke-width="1.6"/>
    <text x="544.0" y="146.0" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">3</text>
    <rect x="559" y="129" width="26" height="26" rx="3" fill="#223528" stroke="#54b890" stroke-width="1.6"/>
    <text x="572.0" y="146.0" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">5</text>
    <rect x="531" y="157" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="559" y="157" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="559" y="185" width="26" height="26" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <text x="500" y="234" fill="#9aa4b2" font-size="11" text-anchor="middle">每欄只留最好的一格</text>
    <text x="300" y="262" fill="#e6e6e6" font-size="11.5" text-anchor="middle">第 a 列第 b 欄 = array[a..b] 的和。三個演算法看的是同一個三角形,差在「浪費了多少」。</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">從 1 到 2,撿回的是「array[a..b] = array[a..b−1] + array[b]」;從 2 到 3,撿回的是「同一欄只需要最好的那一個起點」。綠色格子在同一列連成一段 = 接著前一欄留下的那格往右延伸;換到另一列 = 前面的和是負的,從自己重新開始。</figcaption>
</figure>

### 演算法 1:O(n³),每個區間從頭加

最直接的做法:用 `a`、`b` 固定區間的頭尾,再用第三層迴圈把 `array[a..b]` 加起來。

```cpp
int best = 0;
for (int a = 0; a < n; a++) {
    for (int b = a; b < n; b++) {
        int sum = 0;
        for (int k = a; k <= b; k++) {
            sum += array[k];
        }
        best = max(best, sum);
    }
}
```

**浪費在哪**:算 `array[0..3]` 的時候,`array[0..2]` 剛剛才算過——但它把那個和丟掉,從頭再加一次。

### 演算法 2:O(n²),同一列接著加

把剛剛丟掉的撿回來:$\text{sum}(a..b) = \text{sum}(a..b-1) + \text{array}[b]$。右端每往右一格,只要再加一個數。第三層迴圈消失了。

```cpp
int best = 0;
for (int a = 0; a < n; a++) {
    int sum = 0;
    for (int b = a; b < n; b++) {
        sum += array[b];
        best = max(best, sum);
    }
}
```

**還浪費在哪**:它還是把三角形裡**每一格**都算過一次。可是對同一個結尾 `b` 來說,我們只在乎「以 `b` 結尾的最大和」——其他起點根本不用看。

### 演算法 3:O(n),Kadane

換個問法:**以位置 $k$ 結尾的最大子陣列和是多少?** 只有兩種可能:

1. 只有 `array[k]` 自己;
2. 以 $k-1$ 結尾的某一段,再接上 `array[k]`——既然要最大,接的那一段也該是「以 $k-1$ 結尾的最大和」。

所以每一格只要跟前一格的答案比一下:

```cpp
int best = 0, sum = 0;
for (int k = 0; k < n; k++) {
    sum = max(array[k], sum + array[k]);
    best = max(best, sum);
}
```

`sum` 是「以 $k$ 結尾的最大和」,`best` 是一路看過來最大的那個。一個迴圈,$O(n)$。這也是能做到的最好——任何解法至少得把每個元素看過一次。(這個解法因 Jon Bentley 的 *Programming Pearls* 而出名,書中把它歸功於 J. B. Kadane。)

### 動手跑一次:暴力解和 Kadane 賽跑

下面把演算法 2 和 Kadane 並排,**兩邊共用同一個時鐘,每一步各做一次加法**。按「→」一步一步走,或按播放;也可以換成自己的陣列,或按「隨機」。

<div data-algo="max-subarray-race" data-input="-1, 2, 4, -3, 5, 2, -5, 2"><p>(這裡是互動動畫,需要 JavaScript。兩邊答案都是 10:O(n²) 暴力解要做 36 次加法,Kadane 只做 8 次。)</p></div>

$n = 8$ 時是 36 次對 8 次,看起來還好。但暴力解的次數是 $n(n+1)/2$,$n = 10^5$ 時大約 $5 \times 10^9$ 次;Kadane 還是 $10^5$ 次。

如果想慢慢看 Kadane 為什麼對,下面這個只放 Kadane,每一格拆成兩步:先決定「接上去還是重新開始」,再決定「要不要更新 best」。特別留意 `sum` 變成負數之後的那一格——那就是「前面的和是負的,接上去只會更小」的時刻。

<div data-algo="kadane" data-input="-1, 2, 4, -3, 5, 2, -5, 2"><p>(這裡是互動動畫,需要 JavaScript。)</p></div>

### 原書的實測

原書在一台電腦上跑了隨機輸入(不含讀檔時間):

| $n$ | 演算法 1 $O(n^3)$ | 演算法 2 $O(n^2)$ | 演算法 3 $O(n)$ |
|---|---|---|---|
| $10^2$ | 0.0 s | 0.0 s | 0.0 s |
| $10^3$ | 0.1 s | 0.0 s | 0.0 s |
| $10^4$ | > 10.0 s | 0.1 s | 0.0 s |
| $10^5$ | > 10.0 s | 5.3 s | 0.0 s |
| $10^6$ | > 10.0 s | > 10.0 s | 0.0 s |
| $10^7$ | > 10.0 s | > 10.0 s | 0.0 s |

$n$ 小的時候三個都一樣快——**複雜度的差距只有在 $n$ 變大時才會現形。** 這也是為什麼 n 小的測試資料永遠抓不到效能問題。

### 浪費了什麼

把三個解法排在一起看,每一次變快都是撿回一份浪費:

- **1 → 2**:相鄰區間的和只差一個數,不用重算。
- **2 → 3**:同一個結尾只需要最好的起點,其他起點不用看。

兩次撿回來的都是同一種結構——**子問題的答案可以重複用**。本系列把它標成 **【重疊】**,第 6 篇的動態規劃就是把這件事做成一套方法。

## 這招在哪裡上班

- **寫之前先估算。** 一支要比對「所有配對」的批次作業,資料是一千筆還是一千萬筆,決定了它是 1 秒還是要跑好幾天。同一張表在 SQL 裡也適用:沒有等值條件的 self-join 就是兩層迴圈,[[sql-explain|看執行計畫]]其實就是在看複雜度。
- **常數會咬人。** 複雜度藏起來的常數,在 Production 裡常常是一次網路往返。迴圈裡每一圈打一次資料庫,同樣是 $O(n)$,比一次查回來慢上幾個數量級——這種差距複雜度看不出來,得靠量測。
- **驗收別人給的解。** AI 很快就能寫出一個 AC 的解,但它在 $n = 10^5$ 時會不會超時,是驗收的人要回答的問題。拿題目的 $n$ 對一下上面那張表,是最便宜的第一道檢查:不用跑,就有證據說它過不過得了。這是[[ai-review-craft|驗收的手藝]]在演算法上的版本。

## 練習

- CSES [Maximum Subarray Sum](https://cses.fi/problemset/task/1643):注意 CSES 這題要求**非空**子陣列,全部是負數時答案是最大的那個負數,不是 0——`best` 不能從 0 開始。

## 反思

### 我跟競賽的距離

先說清楚我的位置:我沒有什麼競賽經歷,不是 IOI 或 ICPC 那條路出來的。我有的是 LeetCode——累積解了大約 1500 題,打週賽有一次進到前 50。所以這個系列不是「選手教你刷題」,是一個刷了很多題、然後在業界做了很多年後端的人,回頭把這本書重讀一次,看哪些東西真的留下來了。

留下來最多的,就是這篇講的這件事:**看到資料量,先在腦袋裡算一次。** 這不是什麼高深的技巧,但它是我每天都在用的那一個。

### 工作上用得最多的,是估算

日常開發很少需要自己寫演算法——排序、雜湊表、索引,語言和資料庫都包好了。但「這個計算過程跑得完嗎」這個問題天天在問,而答案幾乎都是從**資料庫 table 的數據量**推出來的:這張表現在幾百萬筆、一年後幾千萬筆,這段邏輯要掃它幾次、有沒有跟另一張表做配對——把這些數字套進去,就知道這個做法是幾秒、幾分鐘,還是根本跑不完。上面那張表的思路,換成 table 的筆數照樣成立。

我工作上真的自己實作演算法的一次,是在 mobile 上做本機的片語前綴搜尋,用的是壓縮 trie。那個故事留到第 24 篇字串那篇再講;這裡想說的是,那一次要先回答的問題,跟這篇是同一個——**資料有多大、每次查詢能花多少時間,所以能用什麼結構。**

### 當面試官時,我在看什麼

我自己當面試官出演算法題,題目不會出得太難,大多數人都解得出來。因為我要看的不是「解不解得出來」,而是解的過程裡的那些細節:怎麼跟我討論題目、怎麼釐清條件、卡住的時候怎麼互動,還有寫出來的東西有沒有品味。一題難到沒人解得出的題目,這些全部看不到。

這跟上面那張表是同一件事:題目本身不是重點,**看到 $n$ 之後的那個反應才是**——你會不會先停一下,算一算這個規模允許什麼做法,再動手。這個反應在面試裡看得到,在工作上更看得到。
