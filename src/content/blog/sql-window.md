---
title: "Window Function:不收合的聚合"
date: 2026-07-09
category: tech
description: "會不會 window function,幾乎是判斷一個人 SQL 深不深的分水嶺。它跟 GROUP BY 只差一個字:不收合——保留每一列,同時在每列旁邊算一個「看整組」的值。搞懂 OVER 的三個旋鈕(PARTITION BY、ORDER BY、frame),排名、環比、累計、每組前 N 名就全部解鎖。"
tags:
  - sql
  - concept
  - window-function
series: "SQL 我以為我懂"
seriesOrder: 5
comments: true
draft: false
---
[[sql-group-by|上一篇]]的 `GROUP BY` 把每組收合成一列。但你一定遇過這種需求:**「我想要整組的計算,又想保留每一列。」** 例如——在每一筆訂單旁邊,標上它佔該客戶總額的比例;或在每個月的營收旁,標上跟上個月的差。收合就做不到了,因為收合完你連「每一列」都沒了。這就是 window function:**不收合的聚合**。它是 SQL 從「會用」到「好用」的分水嶺,也是這個系列第二幕一堆招式的基礎。

## Window function = 不收合的聚合

同一份資料、同一個 `SUM`,`GROUP BY` 和 `OVER` 的差別只有一件事:**要不要把列收掉**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 282" role="img" aria-label="同樣四列訂單 A100 A250 B80 B120,GROUP BY customer 收合成兩列 A 總計 350、B 總計 200;而 SUM OVER PARTITION BY customer 不收合,還是四列,只是每列多一欄標上該組總計 350 或 200" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="wm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="18" fill="#9aa4b2" font-size="9.5" text-anchor="middle" font-weight="bold">輸入(orders):4 列</text>
    <rect x="112" y="28" width="92" height="30" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.3"/><text x="158" y="47" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A · 100</text>
    <rect x="210" y="28" width="92" height="30" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.3"/><text x="256" y="47" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A · 250</text>
    <rect x="308" y="28" width="92" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="354" y="47" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B · 80</text>
    <rect x="406" y="28" width="92" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="452" y="47" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B · 120</text>
    <line x1="250" y1="58" x2="150" y2="92" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#wm)"/>
    <line x1="330" y1="58" x2="430" y2="92" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#wm)"/>
    <text x="146" y="106" fill="#e6e6e6" font-size="10" text-anchor="middle" font-weight="bold">GROUP BY(收合)</text>
    <rect x="72" y="116" width="150" height="32" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="147" y="136" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A · SUM 350</text>
    <rect x="72" y="154" width="150" height="32" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="147" y="174" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B · SUM 200</text>
    <text x="147" y="210" fill="#9aa4b2" font-size="8.5" text-anchor="middle">4 列 → 2 列(每組收成一列)</text>
    <text x="432" y="106" fill="#e6e6e6" font-size="10" text-anchor="middle" font-weight="bold">SUM() OVER(不收合)</text>
    <rect x="348" y="116" width="180" height="28" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/><text x="358" y="134" fill="#e6e6e6" font-size="9" text-anchor="start">A · 100</text><text x="518" y="134" fill="#d6a45c" font-size="9" text-anchor="end">組計 350</text>
    <rect x="348" y="148" width="180" height="28" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/><text x="358" y="166" fill="#e6e6e6" font-size="9" text-anchor="start">A · 250</text><text x="518" y="166" fill="#d6a45c" font-size="9" text-anchor="end">組計 350</text>
    <rect x="348" y="180" width="180" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="358" y="198" fill="#e6e6e6" font-size="9" text-anchor="start">B · 80</text><text x="518" y="198" fill="#d6a45c" font-size="9" text-anchor="end">組計 200</text>
    <rect x="348" y="212" width="180" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="358" y="230" fill="#e6e6e6" font-size="9" text-anchor="start">B · 120</text><text x="518" y="230" fill="#d6a45c" font-size="9" text-anchor="end">組計 200</text>
    <text x="438" y="258" fill="#9aa4b2" font-size="8.5" text-anchor="middle">4 列 → 4 列(每列多一欄看整組的值)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左邊 <code>GROUP BY</code> 把列收掉;右邊 <code>SUM() OVER (PARTITION BY customer)</code> 保留每一列,只是在旁邊多算一個「該組總計」。有了每列 + 組計併排,你就能算「這筆佔全組多少 %」——這是收合永遠做不到的</figcaption>
</figure>

一句話:**`GROUP BY` 是「多列變一列」,window function 是「每列旁邊,多一個看整組算出來的值」。** 列還在,你才能做「單列 vs 整組」的比較。

## OVER 的三個旋鈕

window function 的威力全在 `OVER (...)` 那個括號裡,拆開來就三個旋鈕:

```sql
SUM(amount) OVER (
  PARTITION BY customer    -- ① 分組:但不收合(沒寫就是整張表一組)
  ORDER BY order_date      -- ② 組內排序:定義「到目前為止」的順序
  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW  -- ③ frame:每一列要看哪個範圍
)
```

前兩個好懂,第三個 **frame** 是最多人沒搞清楚、也最容易中招的。frame 決定「算這一列時,要涵蓋組內的哪些列」。以累計(running total)為例,每一列的 frame 是「從開頭到目前這列」,所以總和會一列一列長大:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 244" role="img" aria-label="客戶 A 的四列依日期排序 2/01 100、2/02 50、2/03 80、2/04 30。當前列是 2/03 時,frame 用虛線框住開頭到這列共三列,累計 SUM 為 100 加 50 加 80 等於 230。累計欄依序是 100 150 230 260" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="fm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="280" y="20" fill="#9aa4b2" font-size="9.5" text-anchor="middle" font-weight="bold">客戶 A 的列,依 date 排序(同一個 PARTITION)</text>
    <rect x="150" y="36" width="150" height="108" rx="8" fill="none" stroke="#d6a45c" stroke-width="1.5" stroke-dasharray="5 4"/>
    <rect x="160" y="42" width="130" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="225" y="61" fill="#e6e6e6" font-size="9.5" text-anchor="middle">2/01 · 100</text>
    <rect x="160" y="76" width="130" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="225" y="95" fill="#e6e6e6" font-size="9.5" text-anchor="middle">2/02 · 50</text>
    <rect x="160" y="110" width="130" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/><text x="225" y="129" fill="#e6e6e6" font-size="9.5" text-anchor="middle">2/03 · 80 ← 目前列</text>
    <rect x="160" y="150" width="130" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="225" y="169" fill="#e6e6e6" font-size="9.5" text-anchor="middle">2/04 · 30</text>
    <text x="112" y="92" fill="#d6a45c" font-size="9" text-anchor="middle">frame</text>
    <text x="112" y="105" fill="#9aa4b2" font-size="7.5" text-anchor="middle">開頭→目前列</text>
    <text x="360" y="30" fill="#9aa4b2" font-size="9" text-anchor="middle">累計 SUM</text>
    <text x="360" y="61" fill="#9aa4b2" font-size="9.5" text-anchor="middle">100</text>
    <text x="360" y="95" fill="#9aa4b2" font-size="9.5" text-anchor="middle">150</text>
    <text x="360" y="129" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">230</text>
    <text x="360" y="169" fill="#9aa4b2" font-size="9.5" text-anchor="middle">260</text>
    <line x1="292" y1="125" x2="342" y2="125" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#fm)"/>
    <text x="280" y="206" fill="#d6a45c" font-size="8.8" text-anchor="middle">目前列=2/03 時,frame 涵蓋開頭到這列 → 累計 = 100 + 50 + 80 = 230</text>
    <text x="280" y="226" fill="#9aa4b2" font-size="8.5" text-anchor="middle">把 frame 換成 ROWS BETWEEN 2 PRECEDING AND CURRENT ROW,就變成 3 日移動平均</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">frame 是一扇隨「目前列」滑動的窗。累計是「開頭→目前列」,移動平均是「前 N 列→目前列」——換 frame,就換了整個計算的意義</figcaption>
</figure>

**這裡有個一定要記的坑:frame 的預設值。** 當你寫了 `ORDER BY` 卻沒寫 frame,預設是「開頭→目前列」(累計);沒寫 `ORDER BY` 時,預設是「整個 partition」(組總計)。所以 `SUM() OVER (PARTITION BY c)` 是**組總計**,但 `SUM() OVER (PARTITION BY c ORDER BY d)` 會變成**累計**——一個 `ORDER BY` 就換了意思,很多人在這裡默默算錯。

## 三類最常用的 window function

- **排名類**:`ROW_NUMBER()`(1,2,3… 一定唯一)、`RANK()`(同分同名次、會跳號:1,1,3)、`DENSE_RANK()`(同分同名次、不跳:1,1,2)。
- **位移類**:`LAG()` / `LEAD()` 拿前一列 / 後一列的值。算環比差一行搞定:`sales - LAG(sales) OVER (ORDER BY month)`。
- **聚合當 window**:`SUM` / `AVG` / `COUNT` 加上 `OVER`,配 frame 做累計、移動平均、佔比。

## 經典招式:每組前 N 名

「每個分類的銷量前 3 名」是 window function 最招牌的用途,而它剛好踩中[[sql-execution-order|第一篇]]的執行順序——window function 在 `SELECT`(⑤)階段才算,**不能直接放進 `WHERE`(②)**,得先在子查詢裡算出排名,外層再篩:

```sql
SELECT * FROM (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY sales DESC) AS rn
  FROM products
) t
WHERE rn <= 3;   -- 每類前 3 名
```

那個「為什麼一定要包一層子查詢」的老問題,答案還是執行順序:`ROW_NUMBER` 算完的時候,`WHERE` 早跑過了。

## 反思

### 「不收合」這一個字,打開一整片新天地

我還記得第一次用 window function 的感覺——SQL 突然「升級」了。很多本來要自己 `join` 回去、或用一堆相關子查詢硬拼的東西(每列佔比、跟上一列比、每組排名),一個 `OVER` 就解決,而且又快又好讀。關鍵的頓悟就是[[sql-group-by|上一篇]]的延伸:`GROUP BY` 把列收掉,你就失去了「單列」;window function 保留每一列,才讓「這一列 vs 整組」的比較變得可能。**很多分析需求的本質,就是『單列跟它所屬群體的關係』,而那正是 window function 生來要做的事。**

### frame 的預設值,是我看過最多人踩的坑

`SUM() OVER (PARTITION BY c ORDER BY d)` 到底是組總計還是累計?差別只在你有沒有寫 `ORDER BY`,而結果天差地遠。這跟 [[sql-null|NULL 那篇]]的精神一模一樣:**預設行為你不懂,就會寫出「跑得出來、看起來對、其實錯」的 query。** 我現在寫累計或組總計,一定把 frame 明確寫出來(`ROWS BETWEEN ...`),不靠預設——多打一行字,換掉一整類難抓的 bug,划算得很。

### window function 是分析型 SQL 的分水嶺

老實說,會不會 window function,幾乎是我判斷一個人 SQL 深不深的一條線。它不只是個方便的函式,而是一種**看資料的角度**——把每一列放回它所屬的群體、序列裡去看。這個系列接下來第二幕的幾招——去重取最新、連續區間(gaps and islands)、慢變維(SCD)——骨子裡全是 window function 的應用。所以這篇是壓箱寶,也是後面的地基:**把 `OVER` 的三個旋鈕轉熟,你的 SQL 才算真正進了分析的門。**
