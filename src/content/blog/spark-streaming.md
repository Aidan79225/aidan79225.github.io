---
title: "Structured Streaming 入門:把串流當成一張無界的表"
date: 2026-06-29
category: tech
tags:
 - spark
 - data-engineering
 - stream-processing
series: "Spark 學習筆記"
seriesOrder: 5
comments: true
draft: false
---
前四篇都在講**批次**的 Spark —— [[spark-intro|是什麼]]、[[spark-dataframe|DataFrame 實戰]]、[[spark-shuffle|shuffle 調校]]、[[spark-running|怎麼跑起來]]。但資料不會等你湊成一批才來:訂單、點擊、日誌是**持續流進來的**。這篇講 Spark 處理串流的方式 —— **Structured Streaming**,而它最聰明的一步,是叫你**根本不用學一套新的串流 API**。

## 核心心法:串流是一張「會一直長高」的表

傳統串流框架要你用一套和批次完全不同的思維(逐筆事件、回呼、手動管狀態)。Structured Streaming 反過來 —— 它的核心抽象只有一句:

**把一條串流,想成一張「無界輸入表(unbounded table)」:每來一批新資料,就等於在這張表的尾端 append 幾個 row。**

於是你對它做的查詢,跟對一張靜態 DataFrame 做的**一模一樣** —— `select`、`filter`、`groupBy`、`join`。Spark 在背後把這個查詢，變成「每次有新資料就增量重算、更新結果」的連續作業。**你寫的是批次查詢,Spark 幫你變成串流。**

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 520 210" role="img" aria-label="串流被建模成一張會在尾端不斷 append 新資料的無界表,同一個查詢套在上面持續產出結果表" style="width:100%;max-width:560px;height:auto;margin:0 auto;">
 <defs><marker id="ss1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <text x="90" y="22" fill="#9aa4b2" font-size="11" text-anchor="middle">無界輸入表</text>
 <rect x="30" y="32" width="120" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="90" y="49" fill="#9aa4b2" font-size="10" text-anchor="middle">t1 一批</text>
 <rect x="30" y="62" width="120" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="90" y="79" fill="#9aa4b2" font-size="10" text-anchor="middle">t2 一批</text>
 <rect x="30" y="92" width="120" height="26" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="90" y="109" fill="#e6e6e6" font-size="10" text-anchor="middle">t3 新到</text>
 <rect x="30" y="122" width="120" height="26" rx="4" fill="none" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="3 3"/><text x="90" y="139" fill="#9aa4b2" font-size="10" text-anchor="middle">…持續 append</text>
 <line x1="90" y1="152" x2="90" y2="186" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ss1)"/><text x="90" y="200" fill="#9aa4b2" font-size="9.5" text-anchor="middle">表一直長高</text>
 <rect x="210" y="70" width="104" height="44" rx="8" fill="#262b3a" stroke="#d4af37" stroke-width="1.5"/><text x="262" y="89" fill="#e6e6e6" font-size="11" text-anchor="middle">同一個查詢</text><text x="262" y="104" fill="#9aa4b2" font-size="9" text-anchor="middle">groupBy/agg…</text>
 <line x1="150" y1="92" x2="208" y2="92" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#ss1)"/>
 <text x="430" y="22" fill="#9aa4b2" font-size="11" text-anchor="middle">結果表(持續更新)</text>
 <rect x="370" y="62" width="120" height="26" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="430" y="79" fill="#e6e6e6" font-size="10" text-anchor="middle">aggregate</text>
 <rect x="370" y="92" width="120" height="26" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="430" y="109" fill="#e6e6e6" font-size="10" text-anchor="middle">result</text>
 <line x1="314" y1="92" x2="368" y2="92" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#ss1)"/>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">串流 = 一張不斷在尾端 append 的無界表;同一個批次查詢套上去,Spark 增量重算、持續更新結果</figcaption>
</figure>

## 一段最小的串流程式,長得跟批次幾乎一樣

對比就懂了。批次讀一個檔案:

```python
df = spark.read.format("json").load("/data/events")
counts = df.groupBy("user_id").count()
counts.write.format("console").save()
```

換成串流,只改 `read → readStream`、`write → writeStream`,中間的查詢**一字不改**:

```python
df = spark.readStream.format("kafka").option(...).load()
counts = df.groupBy("user_id").count() # 完全相同的轉換
query = counts.writeStream.outputMode("complete").format("console").start()
query.awaitTermination()
```

`readStream` 的來源常見是 **Kafka**(接上 [[kafka-ecosystem|Kafka 生態系]]那篇:Spark 是 Kafka 最典型的下游消費者之一)、檔案目錄、socket。中間的 `groupBy().count()` 跟批次同一套 DataFrame API —— [[spark-shuffle|shuffle]]、寬窄依賴那些效能直覺,在串流裡照樣適用。

## 三個串流才有的新問題

把串流當表很美,但「資料持續來、而且會遲到」帶出三個批次沒有的問題:

### 1. Output Mode:每次要輸出「什麼」

結果表一直在變,你要往下游寫哪些 row?

- **Append**:只輸出「這輪新確定、之後不會再變」的 row。適合無聚合的轉換、或搭 watermark 的聚合。
- **Complete**:每次輸出**整張結果表**。適合需要看全量聚合結果(但結果表不能無限大)。
- **Update**:只輸出「這輪有變動」的 row。最省,常用於有狀態聚合寫進可更新的下游。

### 2. Event time 與 Watermark:遲到的資料怎麼算

關鍵區分:**event time(事件實際發生的時間)** vs **processing time(Spark 收到它的時間)**。網路延遲、裝置離線,會讓一筆「10:00 發生」的事件 10:05 才到 —— 你想按 event time 開窗統計(例如「每分鐘的訂單數」),就得處理這種**遲到**。

**Watermark** 是你給 Spark 的一句承諾:「比目前看過最大 event time 還晚 N 分鐘以上的資料,我視為太遲、不再等」。它劃出一條移動的水位線:

- 水位線之內遲到的資料 → 還能正確補進對應的時間窗。
- 太遲、超出水位線的 → 直接丟棄。

它解決的是一個很實際的兩難:**沒有 watermark,Spark 為了等可能永遠不來的遲到資料,得把所有時間窗的狀態無限留著 → 狀態爆掉 OOM。** watermark 讓「過期的窗」可以安全關閉、釋放狀態。

### 3. Checkpoint:崩潰了怎麼接回來

串流是長命作業,中途一定會重啟。Structured Streaming 靠 **checkpoint**(寫進可靠儲存,如 HDFS / S3)記下「讀到哪、聚合狀態是什麼」。配合可重播的來源(像 Kafka 能依 offset 重讀),它提供 **exactly-once** 的端到端保證 —— 崩潰重啟後從 checkpoint 接回,不重不漏。這跟 [[kafka-delivery|Kafka 投遞保證]]那篇是同一套思路:**可重播的來源 + 記住進度的消費端 = 不丟不重。**

## Micro-batch:它其實是「很快的批次」

要破除一個誤解:Structured Streaming 預設**不是逐筆處理**,而是 **micro-batch** —— 把持續流入的資料切成很小的批(預設一有資料就觸發),一批批用 Spark 引擎跑。所以它復用了整套批次的最佳化(Catalyst、Tungsten、AQE),代價是延遲落在**百毫秒到秒級**,而非真正的逐筆毫秒級。

這正是它和 [[kafka-ecosystem|上一個系列]]提的 **Kafka Streams** 最大的分野:Kafka Streams 嵌在 app 裡、逐筆、毫秒級;Spark Structured Streaming 是叢集級的 micro-batch,**換來的是「同一套 DataFrame 程式碼,批次串流通用」與超大 throughput**。(Spark 另有低延遲的 Continuous Processing 模式,但功能受限、實務少用。)

## 反思

### 「串流即無界表」是我看過最高明的抽象之一

剛接觸串流時我以為又要重學一套思維 —— 結果 Structured Streaming 告訴我:你會的批次就是串流。這個「**把時間維度藏進一張會長高的表**」的抽象,讓我能把既有的 DataFrame、SQL、shuffle 直覺整碗端過來。我後來體會到,好的抽象不是給你更多新概念,而是**讓你不必學新概念** —— 它把難的部分(增量計算、狀態管理、容錯)藏在底下,露出來的還是你熟的那張表。這比框架本身的功能更值得學起來。

### 真正的難點不在 API,而在 event time 與遲到

寫得出 `readStream.groupBy` 不難,難的是想清楚「**我要按哪個時間算、能容忍多遲**」。我看過最多的串流 bug,都不是語法錯,而是**用 processing time 卻假裝它是 event time** —— 資料一遲到,統計就默默算錯,還很難發現。watermark 表面是防 OOM 的旋鈕,實質是逼你正面回答一個業務問題:**遲到多久的資料,還算數?** 這題沒有預設答案,得你自己跟業務一起定。我現在設計串流,一定先問這句,再寫程式。

### 不是所有「即時」都需要串流

串流很迷人,但它是長命作業 —— checkpoint、狀態、監控、重啟,維運成本比批次高一截。我的判斷是:**先問延遲需求是「秒」還是「分鐘」**。很多自稱要「即時」的需求,其實每 5 分鐘跑一次批次([[airflow-scheduling|用 Airflow 排]])就完全夠用,還更好維護、更好除錯。真要壓到秒級、又是持續 High-throughput ,才值得付串流的維運稅。**先確認你真的需要串流,再上串流** —— 這跟整個系列「工具是放大產出、不是增加負債」的調子一致。
