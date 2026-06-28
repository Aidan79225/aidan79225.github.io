---
title: "Spark 效能的本體:shuffle 與調校"
date: 2026-06-21
category: tech
tags:
  - spark
  - data-engineering
  - performance
series: "Spark 學習筆記"
seriesOrder: 3
comments: true
draft: false
---
[[spark-intro|第一篇]]和 [[spark-dataframe|上一篇]]都丟下同一句結論:**Spark 的效能本體就是 shuffle**。這篇把它講透 —— 為什麼 shuffle 貴、它怎麼把作業切成 stage,以及四個實際能少 shuffle、跑更快的手段。

## 為什麼 shuffle 這麼貴

`groupBy`、`join`、`distinct` 這類 wide 轉換,需要把「同一個 key 的資料」聚到一起。但這些資料原本散在不同 executor 的不同分區,所以 Spark 得:**把資料寫到磁碟 → 透過網路搬到別的節點 → 再讀回來重新分組**。磁碟 + 網路 + 序列化,每一樣都比純記憶體運算慢好幾個量級。

而且 shuffle 會切出 **stage 邊界**:Spark 把一個 job 依 shuffle 切成多個 stage,narrow 轉換在同一個 stage 內串接(pipeline),碰到 wide 才換下一個 stage。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 168" role="img" aria-label="Spark 依 shuffle 把 job 切成 stage" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="sh1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="12" y="50" width="212" height="74" rx="8" fill="none" stroke="#3a4154" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="118" y="44" fill="#9aa4b2" font-size="11" text-anchor="middle">Stage 1</text>
    <rect x="26" y="68" width="86" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="69" y="91" fill="#e6e6e6" font-size="12" text-anchor="middle">read</text>
    <rect x="124" y="68" width="88" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="168" y="91" fill="#e6e6e6" font-size="12" text-anchor="middle">filter</text>
    <line x1="112" y1="87" x2="124" y2="87" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#sh1)"/>
    <line x1="240" y1="34" x2="240" y2="130" stroke="#4f6df5" stroke-width="1.5" stroke-dasharray="4 4"/>
    <text x="240" y="26" fill="#4f6df5" font-size="11" text-anchor="middle">shuffle</text>
    <line x1="212" y1="87" x2="284" y2="87" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#sh1)"/>
    <rect x="276" y="50" width="272" height="74" rx="8" fill="none" stroke="#3a4154" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="412" y="44" fill="#9aa4b2" font-size="11" text-anchor="middle">Stage 2</text>
    <rect x="290" y="68" width="104" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="342" y="91" fill="#e6e6e6" font-size="12" text-anchor="middle">groupBy</text>
    <rect x="406" y="68" width="128" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="470" y="91" fill="#e6e6e6" font-size="12" text-anchor="middle">write</text>
    <line x1="394" y1="87" x2="406" y2="87" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#sh1)"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">narrow(read/filter)在同一個 stage 內串接;碰到 wide(groupBy)就 shuffle、切出新 stage</figcaption>
</figure>

所以「調效能」的第一性原理很單純:**能不 shuffle 就不 shuffle,要 shuffle 就讓它搬得少一點。** 下面四招都圍著這件事。

## 一、先 filter、先 select,把資料變小再 shuffle

最廉價也最有效:在 wide 轉換**之前**就把資料砍小。少一半的資料進 shuffle,就少一半的網路與磁碟。Catalyst 會幫你做一部分(filter 下推),但你自己把 `filter` / 只選需要的欄位寫在前面,意圖最清楚也最保險。

## 二、broadcast join:大表 join 小表時,別 shuffle 大表

預設的 join 會把**兩張表**都依 key shuffle。但如果其中一張是小的維度表,根本不必這樣 —— 直接把小表**整份複製(broadcast)到每個 executor**,大表的每個分區在原地就能 join,完全不用搬大表。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 212" role="img" aria-label="shuffle join 兩表都搬,broadcast join 只複製小表" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="sh2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="12" y="30" fill="#9aa4b2" font-size="11" text-anchor="start">shuffle join</text>
    <rect x="16" y="40" width="70" height="26" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="51" y="58" fill="#e6e6e6" font-size="11" text-anchor="middle">大表</text>
    <rect x="16" y="72" width="70" height="26" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="51" y="90" fill="#e6e6e6" font-size="11" text-anchor="middle">小表</text>
    <line x1="86" y1="53" x2="156" y2="62" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sh2)"/>
    <line x1="86" y1="85" x2="156" y2="76" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sh2)"/>
    <rect x="158" y="46" width="150" height="46" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="233" y="65" fill="#e6e6e6" font-size="11" text-anchor="middle">shuffle</text><text x="233" y="80" fill="#9aa4b2" font-size="9" text-anchor="middle">兩表都依 key 重分配</text>
    <line x1="308" y1="69" x2="344" y2="69" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sh2)"/>
    <rect x="346" y="52" width="70" height="34" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="381" y="73" fill="#e6e6e6" font-size="11" text-anchor="middle">join</text>
    <text x="430" y="73" fill="#9aa4b2" font-size="10" text-anchor="start">大表也搬→慢</text>
    <text x="12" y="132" fill="#9aa4b2" font-size="11" text-anchor="start">broadcast join</text>
    <rect x="16" y="142" width="70" height="26" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="51" y="160" fill="#e6e6e6" font-size="11" text-anchor="middle">小表</text>
    <line x1="86" y1="155" x2="186" y2="155" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sh2)"/>
    <text x="136" y="148" fill="#9aa4b2" font-size="9" text-anchor="middle">broadcast 複製</text>
    <rect x="188" y="132" width="244" height="52" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="310" y="153" fill="#e6e6e6" font-size="11" text-anchor="middle">每個 Executor:大表分區 + 小表副本</text><text x="310" y="170" fill="#9aa4b2" font-size="9.5" text-anchor="middle">原地 join,不搬大表</text>
    <text x="452" y="162" fill="#9aa4b2" font-size="10" text-anchor="start">快</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">shuffle join:兩張表都跨網路重分配;broadcast join:只複製小表,大表原地 join</figcaption>
</figure>

```python
from pyspark.sql.functions import broadcast

big = spark.read.parquet("orders.parquet")      # 大
dim = spark.read.parquet("customers.parquet")   # 小維度表

joined = big.join(broadcast(dim), on="customer_id", how="left")
```

注意小表別太大:Spark 有個 `spark.sql.autoBroadcastJoinThreshold`(預設約 10MB)會自動廣播夠小的表;手動 `broadcast()` 一張過大的表,會把 driver/executor 的記憶體撐爆。

## 三、分區數:`spark.sql.shuffle.partitions`

shuffle 之後資料要重新切成幾個分區?預設是 **200**。太多 → 每個分區小到任務排程的開銷蓋過運算;太少 → 每個分區大到記憶體裝不下、spill 到磁碟。原則是讓每個分區大約落在「**一兩百 MB**」的量級。

```python
spark.conf.set("spark.sql.shuffle.partitions", 64)   # 依資料量調,別死守 200
```

## 四、AQE 與 cache

**AQE(Adaptive Query Execution)** 在 Spark 3 預設開啟,會在**執行期**依實際資料量自動調整 shuffle 分區數、合併過小的分區、甚至處理傾斜的 join。先信任它,真的不夠再手動調參:

```python
spark.conf.set("spark.sql.adaptive.enabled", True)   # Spark 3 預設已開
```

**cache / persist**:[[spark-intro|第一篇]]提過,惰性求值下對同一條 pipeline 重複呼叫 action 會**從頭重算**。若一份中間結果要用很多次,就 cache 起來:

```python
paid = df.filter(F.col("status") == "paid").cache()
paid.count()                 # 第一次:實際算 + 存進記憶體
paid.groupBy("month").count()  # 後續重用:直接吃 cache,不重算
paid.unpersist()             # 用完釋放
```

但 cache 是雙面刃:**只用一次的東西別 cache**,白佔記憶體還可能擠掉真正該留的資料。

## 反思

### 先想「少 shuffle」,再想「調參數」

我看過不少人一遇到 Spark 慢,就開始亂轉 `shuffle.partitions`、加記憶體。但九成的效能問題,根源是 shuffle 太多或太大,不是參數沒調好。我的順序固定:先看能不能 **filter/select 把資料變小**、能不能 **broadcast 掉一個 join**、能不能少一次 `groupBy` —— 把 shuffle 的「量」壓下來,效益遠大於在參數上斤斤計較。參數是最後的微調,不是第一步。

### broadcast join 是 CP 值最高的一招

實務上,「大事實表 join 小維度表」這個 pattern 多到不行,而它幾乎都能用 broadcast 解掉。一次 `broadcast(dim)`,就把對大表的 shuffle 整個省掉 —— 這是我學 Spark 調效能時,投報率最高的單一招式。唯一要記得的是盯著小表大小,別廣播一張其實不小的表把記憶體打爆。

### 別過早最佳化,讓 Spark UI 帶你找瓶頸

跟我看 [[airflow-intro|Airflow]]、看任何基礎建設的態度一樣:**[[pain-before-power|先確認痛點]],再下手。** 把邏輯寫對、跑一次,打開 Spark UI 看哪個 stage 最慢、shuffle 讀寫量最大,針對那一個下手 —— 而不是憑感覺到處調。AQE 出現後,很多以前要手動調的東西它都自動做了;與其跟它較勁,不如把力氣花在「這個 shuffle 到底需不需要存在」這種更上游的問題。
