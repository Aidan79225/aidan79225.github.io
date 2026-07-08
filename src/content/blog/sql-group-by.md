---
title: "GROUP BY:把多列收合成一列"
date: 2026-07-08
category: tech
description: "幾乎每個人都被『column must appear in the GROUP BY clause』這個錯誤擋過。真正的原因很簡單:GROUP BY 把每一組的多列收合成一列,聚合函數再把『一組多值』壓成一個數——收合之後,非 key 的欄位有好幾個值,SQL 不知道要吐哪一個。懂這個收合模型,bare column、WHERE vs HAVING、ROLLUP 就都通了。"
tags:
  - sql
  - concept
series: "SQL 我以為我懂"
seriesOrder: 4
comments: true
draft: false
---
`GROUP BY` 每個人都會寫,但幾乎每個人也都被那句 `column "..." must appear in the GROUP BY clause` 擋過,而且常常搞不懂「我就選個欄位,為什麼不行?」答案跟前幾篇一樣,藏在一個簡單的模型裡:**`GROUP BY` 做的事,是把每一組的多列「收合」成一列。** 想通這個收合,bare column 的錯誤、`WHERE` 跟 `HAVING` 的差別、甚至一次算多層小計,全部順起來。

## GROUP BY 做的事:收合

把 `GROUP BY customer` 想成:先依 `customer` 把列分成幾堆,然後**每一堆壓成一列**。聚合函數(`COUNT`、`SUM`…)就是那個「壓縮器」——它把一組裡某欄的很多個值,算成一個數:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="左邊五列訂單依 customer 分成 A 兩列與 B 三列,GROUP BY customer 把每一組收合成一列:A 變成 COUNT 2 SUM 350,B 變成 COUNT 3 SUM 250。下方標註:amount 這種非 key 欄一組有多個值,不能直接 SELECT,要用聚合函數壓成一個數" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="gm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="110" y="30" fill="#9aa4b2" font-size="10" text-anchor="middle" font-weight="bold">原始列(orders)</text>
    <rect x="40" y="42" width="140" height="28" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="110" y="60" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A · amount 100</text>
    <rect x="40" y="74" width="140" height="28" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="110" y="92" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A · amount 250</text>
    <rect x="40" y="118" width="140" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="110" y="136" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B · amount 80</text>
    <rect x="40" y="150" width="140" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="110" y="168" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B · amount 120</text>
    <rect x="40" y="182" width="140" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="110" y="200" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B · amount 50</text>
    <text x="290" y="120" fill="#9aa4b2" font-size="9.5" text-anchor="middle">GROUP BY</text>
    <text x="290" y="134" fill="#9aa4b2" font-size="9.5" text-anchor="middle">customer</text>
    <line x1="182" y1="84" x2="376" y2="72" stroke="#54b890" stroke-width="1.2" marker-end="url(#gm)"/>
    <line x1="182" y1="164" x2="376" y2="164" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#gm)"/>
    <text x="470" y="30" fill="#9aa4b2" font-size="10" text-anchor="middle" font-weight="bold">收合後:每組一列</text>
    <rect x="378" y="50" width="180" height="44" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/><text x="468" y="70" fill="#e6e6e6" font-size="10" text-anchor="middle">customer = A</text><text x="468" y="85" fill="#54b890" font-size="9" text-anchor="middle">COUNT=2 · SUM=350</text>
    <rect x="378" y="142" width="180" height="44" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/><text x="468" y="162" fill="#e6e6e6" font-size="10" text-anchor="middle">customer = B</text><text x="468" y="177" fill="#4f6df5" font-size="9" text-anchor="middle">COUNT=3 · SUM=250</text>
    <text x="290" y="238" fill="#d6a45c" font-size="9" text-anchor="middle">amount 一組有多個值(100/250)→ 不能裸選,要用聚合(SUM/AVG…)壓成一個數</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><code>GROUP BY</code> 把每一組的多列收合成一列;聚合函數把一組裡某欄的多個值壓成單一結果。收合之後,一組就只剩一列的位置了</figcaption>
</figure>

這張圖直接解釋了那個 error:**收合之後,一組只剩一列,但 `amount` 這種非 key 欄在組裡有好幾個值(100、250),SQL 不知道該吐哪一個**,所以不准你裸選。你只有兩條路:把它放進 `GROUP BY`(那它就成了分組的一部分),或用聚合函數把它壓成一個值(`SUM(amount)`、`MAX(amount)`…)。

這也接上[[sql-execution-order|第一篇]]的執行順序:`SELECT`(⑤)跑在 `GROUP BY`(③)**之後**——輪到 `SELECT` 算欄位時,列早就收合完了,當然只剩「分組鍵」和「聚合結果」可選。

## 聚合函數:把一組多值壓成一個數

常用的就這幾個:`COUNT`、`SUM`、`AVG`、`MIN`、`MAX`。有兩件事一定要記,而且都跟[[sql-null|上一篇的 NULL]]有關:

- **聚合函數忽略 NULL**。`AVG(score)` 的分母是「非 NULL 的筆數」,不是把 NULL 當 0——你算的平均,可能不是你以為的那個。
- **`COUNT(*)` 數列數,`COUNT(col)` 只數非 NULL**。兩者一減,就是那欄有幾個 NULL。

還有一個沒 `GROUP BY` 也會遇到的細節:**只要 `SELECT` 裡出現聚合函數,整張表就被當成「一組」**。所以 `SELECT COUNT(*), MAX(amount) FROM orders` 會回傳一列——這其實就是「不分組的收合」。

## WHERE 篩「列」,HAVING 篩「組」

有了收合模型,`WHERE` 和 `HAVING` 的分工就很自然:**`WHERE` 在收合前、逐列過濾;`HAVING` 在收合後、逐組過濾。** 所以只有 `HAVING` 能用聚合結果當條件——因為那個結果要收合完才存在:

```sql
SELECT customer, SUM(amount) AS total
FROM orders
WHERE amount > 0            -- ② 收合前:先逐列剔除無效資料
GROUP BY customer
HAVING SUM(amount) > 1000;  -- ④ 收合後:只留總額破千的『組』
```

`WHERE SUM(amount) > 1000` 會直接報錯——收合還沒發生,`SUM` 不存在(又是[[sql-execution-order|執行順序]])。反過來也有個效能原則:**能用 `WHERE` 先砍的列,別留到 `HAVING`**,越早把資料變小,後面要收合、要算的就越少。

## 一次算多層小計:ROLLUP

最後帶一個很實用、但很多人不知道的東西。要「明細 + 各區小計 + 總計」通常得寫三段 `GROUP BY` 再 `UNION`。用 `GROUP BY ROLLUP(...)` 一次就到位——**多出來的小計/總計列,用 `NULL` 標示是哪一層彙總的**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 520 244" role="img" aria-label="GROUP BY ROLLUP(region, product) 的結果:North A 10、North B 20 是明細,North NULL 30 是 North 的小計,South A 15 明細、South NULL 15 小計,最後 NULL NULL 45 是總計。小計與總計列用 NULL 標示" style="width:100%;max-width:560px;height:auto;margin:0 auto;">
    <text x="230" y="26" fill="#9aa4b2" font-size="10" text-anchor="middle" font-weight="bold">GROUP BY ROLLUP(region, product)</text>
    <text x="95" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">region</text>
    <text x="215" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">product</text>
    <text x="315" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">SUM</text>
    <rect x="40" y="60" width="340" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="95" y="77" fill="#e6e6e6" font-size="9.5" text-anchor="middle">North</text><text x="215" y="77" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A</text><text x="315" y="77" fill="#e6e6e6" font-size="9.5" text-anchor="middle">10</text>
    <rect x="40" y="88" width="340" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="95" y="105" fill="#e6e6e6" font-size="9.5" text-anchor="middle">North</text><text x="215" y="105" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B</text><text x="315" y="105" fill="#e6e6e6" font-size="9.5" text-anchor="middle">20</text>
    <rect x="40" y="116" width="340" height="26" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.4"/><text x="95" y="133" fill="#e6e6e6" font-size="9.5" text-anchor="middle">North</text><text x="215" y="133" fill="#d6a45c" font-size="9" text-anchor="middle">NULL</text><text x="315" y="133" fill="#d6a45c" font-size="9.5" text-anchor="middle">30</text>
    <rect x="40" y="144" width="340" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="95" y="161" fill="#e6e6e6" font-size="9.5" text-anchor="middle">South</text><text x="215" y="161" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A</text><text x="315" y="161" fill="#e6e6e6" font-size="9.5" text-anchor="middle">15</text>
    <rect x="40" y="172" width="340" height="26" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.4"/><text x="95" y="189" fill="#e6e6e6" font-size="9.5" text-anchor="middle">South</text><text x="215" y="189" fill="#d6a45c" font-size="9" text-anchor="middle">NULL</text><text x="315" y="189" fill="#d6a45c" font-size="9.5" text-anchor="middle">15</text>
    <rect x="40" y="200" width="340" height="26" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="95" y="217" fill="#4f6df5" font-size="9" text-anchor="middle">NULL</text><text x="215" y="217" fill="#4f6df5" font-size="9" text-anchor="middle">NULL</text><text x="315" y="217" fill="#4f6df5" font-size="9.5" text-anchor="middle">45</text>
    <text x="416" y="133" fill="#d6a45c" font-size="8.5" text-anchor="start">← North 小計</text>
    <text x="416" y="189" fill="#d6a45c" font-size="8.5" text-anchor="start">← South 小計</text>
    <text x="416" y="217" fill="#4f6df5" font-size="8.5" text-anchor="start">← 總計</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><code>ROLLUP</code> 一趟給你明細 + 各層小計 + 總計;小計列在被彙總掉的欄位上是 <code>NULL</code>。想要所有維度的組合(不只階層),用 <code>CUBE</code>;要指定哪幾組,用 <code>GROUPING SETS</code></figcaption>
</figure>

不用背語法,記得「有這東西」就好:當你要在一份報表裡同時要明細跟各層小計,`ROLLUP` / `CUBE` / `GROUPING SETS` 能一趟算完,不用自己 `UNION` 拼。

## 反思

### 「收合」這個動作想清楚,bare column 就不再是謎

我剛學 SQL 時,`must appear in the GROUP BY clause` 是我最常撞、也最常用「亂加欄位到 GROUP BY」硬解的錯誤——結果分組邏輯整個跑掉還不知道。真正解決它的,不是背規則,而是那個畫面:**分組後,每一組被壓成一列。** 一旦腦中有這個收合的畫面,我就很自然知道收合後「還剩什麼可選」——分組鍵,還有把多值壓成單值的聚合。這跟[[sql-execution-order|執行順序]]那篇是同一種頓悟:**看見資料在每個階段的形狀,規則就變成理所當然。**

### 聚合最容易錯的地方,還是 NULL 和 fan-out

`GROUP BY` 的坑很少是語法,多半是「數字算錯但不報錯」——而兇手常是前兩篇那兩個。一是 [[sql-null|NULL]]:`AVG` 忽略 NULL、`COUNT(col)` 跳過 NULL,你以為的分母跟實際的不一樣。二是 [[sql-joins|JOIN 的 fan-out]]:先 join 放大了列數、再 `SUM`,金額就重複計算。我現在只要看到「join 之後接 `GROUP BY ... SUM`」,一定先停下來確認 join 沒有把事實列複製——**聚合是最後一步,前面任何一步把資料弄髒,它都會如實地把錯誤加總給你看。**

### 大部分「多寫幾段 query」的活,SQL 早有一招

`ROLLUP` 這種東西讓我學到一個習慣:**當我發現自己在 `UNION` 好幾段長得很像、只差分組層級的 query 時,先停下來查一下有沒有現成的招。** SQL 是個很老、很成熟的語言,那些「明細加小計」「找每組前 N 名」「連續區間」的常見需求,幾乎都有人設計過對應的工具(`ROLLUP`、window function、`GROUPING SETS`)。與其用一堆子查詢硬拼、又慢又難讀,不如花十分鐘找那把對的工具——這也是這個系列想帶的:**別只會用 `SELECT` 蠻力,把語言真正給你的東西撿起來用。**
