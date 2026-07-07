---
title: "讀懂 Spark 執行計畫:.explain() 到底在說什麼"
date: 2026-07-07
category: tech
description: "前面幾篇一直叫你「相信 Catalyst」「打開 Spark UI 找瓶頸」,卻沒教你怎麼看。這篇補上這塊:你的一行 code 怎麼變成執行計畫、.explain() 怎麼讀、以及讀計畫時最該盯的三個字——Exchange、BroadcastHashJoin、PushedFilters。"
tags:
  - spark
  - data-engineering
  - performance
series: "Spark 學習筆記"
seriesOrder: 6
comments: true
draft: false
---
這個系列一路講下來,有兩句話反覆出現:[[spark-dataframe|「相信 Catalyst 最佳化器」]]、[[spark-shuffle|「打開 Spark UI 找瓶頸」]]。但我一直沒回答一個問題:**你到底要怎麼看 Spark 做了什麼?** 相信最佳化器不該是盲信——你得有辦法驗證「我以為會 broadcast 的 join,它真的 broadcast 了嗎?我的 filter 真的下推了嗎?」這篇就補上這塊技能:讀懂執行計畫。

## 一行 code 到執行:中間發生什麼

你寫的 DataFrame 或 SQL,不會直接跑。它會先變成一份「要什麼」的**邏輯計畫**,經 Catalyst 改寫,再落成一份「怎麼做」的**實體計畫**,最後才切成 task 去跑:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 500 350" role="img" aria-label="Spark 查詢生命週期由上到下:你的 code(DataFrame 或 SQL)→ Logical Plan 要什麼 → Catalyst 最佳化器(filter 下推、剪欄位、挑 join 策略)→ Physical Plan 怎麼做(Exchange 即 shuffle、join 策略定案)→ 執行(切成 task 丟 executor)" style="width:100%;max-width:460px;height:auto;margin:0 auto;">
    <defs><marker id="ex" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="80" y="16" width="340" height="44" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="250" y="36" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">你的 code</text>
    <text x="250" y="51" fill="#9aa4b2" font-size="8.5" text-anchor="middle">DataFrame API 或 Spark SQL —— 兩者等價</text>
    <line x1="250" y1="60" x2="250" y2="82" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ex)"/>
    <rect x="80" y="84" width="340" height="44" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="250" y="104" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">Logical Plan ·「要什麼」</text>
    <text x="250" y="119" fill="#9aa4b2" font-size="8.5" text-anchor="middle">解析出你引用的表與欄位,還沒最佳化</text>
    <line x1="250" y1="128" x2="250" y2="150" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ex)"/>
    <rect x="80" y="152" width="340" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="250" y="172" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">Catalyst 最佳化器</text>
    <text x="250" y="187" fill="#9aa4b2" font-size="8.5" text-anchor="middle">filter 下推 · 剪掉沒用的欄位 · 挑 join 策略</text>
    <line x1="250" y1="196" x2="250" y2="218" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ex)"/>
    <rect x="80" y="220" width="340" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="250" y="240" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">Physical Plan ·「怎麼做」</text>
    <text x="250" y="255" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Exchange(= shuffle)、join 策略都定案</text>
    <line x1="250" y1="264" x2="250" y2="286" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ex)"/>
    <rect x="80" y="288" width="340" height="44" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="250" y="308" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">執行</text>
    <text x="250" y="323" fill="#54b890" font-size="8.5" text-anchor="middle">切成 stage / task,丟到 executor 上跑</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">你寫的每段 Spark code 都走這條路。DataFrame 和 SQL 在第一步就殊途同歸,所以它們效能一樣——這也是 <a href="/blog/spark-dataframe/" style="color:#4f6df5;">DataFrame 那篇</a> 那張「編成同一個計畫」的圖的下半場。<code>.explain()</code> 就是把這條路印出來給你看</figcaption>
</figure>

## .explain():把計畫印出來

在任何 DataFrame 後面接 `.explain()`,就能看到它的實體計畫——**不用真的跑,是靜態分析**:

```python
df = (big.filter(F.col("date") >= "2026-01-01")
         .join(F.broadcast(dim), on="id")
         .groupBy("cat").count())

df.explain()             # 只看 physical plan(最常用)
df.explain(True)         # 連 logical → optimized → physical 全印
df.explain("formatted")  # 分段、附欄位細節,最好讀
```

關鍵讀法只有一句:**由下往上讀。** 最底下是資料來源(掃描),往上一層層是 filter、join、shuffle、聚合,最上面才是最終結果。資料是從下往上流的。

## 讀 physical plan 要盯的三個字

計畫裡的字很多,但九成的效能判斷,只看三個關鍵字:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 340" role="img" aria-label="一個 physical plan 由下往上:FileScan parquet big(標 PushedFilters,filter 下推)→ Filter → BroadcastHashJoin(小表由左邊 Broadcast 進來,大表不搬)→ Exchange(即 shuffle,最貴)→ HashAggregate 結果。右側標註三個要盯的關鍵字" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="pu" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="150" y="24" width="180" height="40" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="240" y="41" fill="#e6e6e6" font-size="10.5" text-anchor="middle">HashAggregate</text>
    <text x="240" y="55" fill="#9aa4b2" font-size="8.5" text-anchor="middle">← groupBy 的結果</text>
    <rect x="150" y="88" width="180" height="40" rx="7" fill="#262b3a" stroke="#e0733a" stroke-width="1.8"/>
    <text x="240" y="105" fill="#e0733a" font-size="10.5" text-anchor="middle" font-weight="bold">Exchange</text>
    <text x="240" y="119" fill="#9aa4b2" font-size="8.5" text-anchor="middle">hashpartitioning(cat)</text>
    <rect x="150" y="152" width="180" height="40" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/>
    <text x="240" y="169" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">BroadcastHashJoin</text>
    <text x="240" y="183" fill="#9aa4b2" font-size="8.5" text-anchor="middle">[id]</text>
    <rect x="150" y="216" width="180" height="40" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="240" y="233" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Filter</text>
    <text x="240" y="247" fill="#9aa4b2" font-size="8.5" text-anchor="middle">date ≥ 2026-01-01</text>
    <rect x="150" y="280" width="180" height="42" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="240" y="298" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">FileScan parquet · big</text>
    <text x="240" y="312" fill="#9aa4b2" font-size="8.5" text-anchor="middle">PushedFilters:[date ≥ …]</text>
    <line x1="240" y1="280" x2="240" y2="258" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pu)"/>
    <line x1="240" y1="216" x2="240" y2="194" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pu)"/>
    <line x1="240" y1="152" x2="240" y2="130" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pu)"/>
    <line x1="240" y1="88" x2="240" y2="66" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pu)"/>
    <rect x="16" y="152" width="118" height="40" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3"/>
    <text x="75" y="169" fill="#e6e6e6" font-size="9.5" text-anchor="middle">FileScan dim</text>
    <text x="75" y="183" fill="#9aa4b2" font-size="8" text-anchor="middle">→ Broadcast 小表</text>
    <line x1="134" y1="172" x2="148" y2="172" stroke="#54b890" stroke-width="1.4" marker-end="url(#pu)"/>
    <line x1="330" y1="108" x2="356" y2="108" stroke="#e0733a" stroke-width="1.2" stroke-dasharray="3 2"/>
    <text x="362" y="104" fill="#e0733a" font-size="9" text-anchor="start">Exchange = shuffle!</text>
    <text x="362" y="117" fill="#9aa4b2" font-size="8.5" text-anchor="start">整個 query 最貴的一步</text>
    <line x1="330" y1="172" x2="356" y2="172" stroke="#54b890" stroke-width="1.2" stroke-dasharray="3 2"/>
    <text x="362" y="168" fill="#54b890" font-size="9" text-anchor="start">廣播小表,大表原地 join ✓</text>
    <text x="362" y="181" fill="#9aa4b2" font-size="8.5" text-anchor="start">沒有搬大表,省掉一次 shuffle</text>
    <line x1="330" y1="300" x2="356" y2="300" stroke="#54b890" stroke-width="1.2" stroke-dasharray="3 2"/>
    <text x="362" y="296" fill="#54b890" font-size="9" text-anchor="start">filter 下推到掃描層 ✓</text>
    <text x="362" y="309" fill="#9aa4b2" font-size="8.5" text-anchor="start">Parquet 只讀符合的資料,少讀一堆</text>
    <text x="75" y="232" fill="#9aa4b2" font-size="9" text-anchor="middle">由下往上讀 ↑</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同一個 query 的實體計畫。由下往上:掃描→過濾→join→shuffle→聚合。盯三個字就夠——<b style="color:#e0733a">Exchange</b> 是 shuffle、<b style="color:#54b890">BroadcastHashJoin</b> 是好 join、<b style="color:#54b890">PushedFilters</b> 是 filter 有沒有下推</figcaption>
</figure>

實際印出來大概長這樣(`explain("formatted")` 精簡版):

```text
*(3) HashAggregate(keys=[cat], functions=[count(1)])
+- Exchange hashpartitioning(cat, 200)                    ← shuffle 在這
   +- *(2) HashAggregate(keys=[cat], functions=[partial_count(1)])
      +- *(2) BroadcastHashJoin [id], [id], Inner, BuildRight   ← 廣播 join,沒搬大表 ✓
         :- *(2) Filter (date >= 2026-01-01)
         :  +- *(1) FileScan parquet big[id,cat,date]
         :        PushedFilters: [GreaterThanOrEqual(date, 2026-01-01)]  ← filter 下推 ✓
         +- BroadcastExchange
            +- *(1) FileScan parquet dim[id]
```

三個字的意義,直接對應你前面學過的東西:

- **Exchange** = 一次 [[spark-shuffle|shuffle]]。這是你在計畫裡最該找的字——**數一數有幾個 Exchange,大概就知道這個 query 貴在哪。** `groupBy`、非廣播的 `join`、`distinct`、`repartition` 都會生出它。
- **BroadcastHashJoin vs SortMergeJoin**:前者是[[spark-shuffle|廣播 join]],小表複製到各節點、大表原地做,**沒有 shuffle**;後者兩邊都要依 key shuffle。看到你「應該要 broadcast」的 join 卻顯示 `SortMergeJoin`,就是小表超過門檻沒被廣播——這是最常見的效能漏抓。
- **PushedFilters**:你的 `filter` 有沒有被**下推到掃描層**。有的話,Parquet 這種欄式格式在讀檔時就跳過不符的資料,根本不讀進來;沒有的話,就是全讀進來才過濾,白白多搬一堆。

## 一個陷阱:AQE 會在執行期改計畫

`.explain()` 印的是**執行前**的計畫。但 Spark 3 預設開的 [[spark-shuffle|AQE(Adaptive Query Execution)]]會在**跑的時候**依實際資料量再改一次——合併過小的分區、把原本的 SortMergeJoin 換成 broadcast、拆掉傾斜的分區。所以 `.explain()` 看到的不一定是最後真正跑的。**要看實際執行的最終計畫,得去 [[spark-running|Spark UI]] 的 SQL / Query 頁**,那裡的計畫圖會標出 AQE 調整後的樣子,還附上每個節點實際處理了多少列、shuffle 讀寫多少。靜態的 `.explain()` 看結構,動態的 Spark UI 看事實——兩個一起用。

## 反思

### 「相信最佳化器」不等於「不看它做了什麼」

我在 [[spark-dataframe|DataFrame 那篇]]說「把最佳化交給比你聰明的 Catalyst」,這話沒錯,但很容易被誤讀成「反正它會處理,我不用管」。學會讀 `.explain()` 之後我的心態精準多了:**我信任 Catalyst,但我會驗證。** 我以為 filter 會下推——打開計畫看有沒有 `PushedFilters`;我以為那個 join 會廣播——看它是不是 `BroadcastHashJoin`。八成的時候它做對了,但真正拖慢的,往往就是那兩成「我以為它會、但它沒有」的地方。信任而不盲信,靠的就是有能力打開黑箱看一眼。

### 看到 Exchange 就該心頭一緊

整個 [[spark-shuffle|shuffle 那篇]]在講 shuffle 多貴,而在計畫裡,shuffle 就叫 `Exchange`。這個對應關係一旦建立,讀計畫就變得很有方向感:我不再逐行細看,而是先掃有幾個 `Exchange`、分別是哪個操作造成的,再問「這一次搬移,省得掉嗎?」——能不能先 filter 變小、能不能 broadcast 掉、能不能少一次 `groupBy`。**把抽象的「效能問題」變成具體的「數 Exchange」,是我讀計畫最大的收穫。**

### explain 是「假設」,Spark UI 是「事實」

這是我踩過坑才學到的:光看 `.explain()` 會被靜態計畫騙。它不知道你的資料實際上有沒有傾斜、某個 key 是不是佔了九成的量;這些只有真的跑起來、在 Spark UI 裡看每個 task 的耗時分佈才看得到。所以我現在的順序是——**先用 `.explain()` 確認結構對不對(join 策略、filter 下推、有幾個 shuffle),再跑一次、用 Spark UI 驗證實況(哪個 stage 卡住、task 是不是有一根特別長)。** 這跟我對所有工具的態度一致:[[pain-before-power|先看清痛點在哪,再動手]],而讀懂計畫,就是讓「痛點」從模糊的感覺變成螢幕上一個看得到、指得出來的節點。
