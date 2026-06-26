---
title: "Kafka 生態系:Connect、Schema Registry 與 Streams"
date: 2026-06-26
category: tech
tags:
  - kafka
  - data-engineering
  - stream-processing
series: "Kafka 學習筆記"
seriesOrder: 4
comments: true
draft: false
---
前三篇都在講 Kafka broker 本身 —— [[kafka-intro|可重播的 log]]、[[kafka-topics|核心模型]]、[[kafka-delivery|投遞保證]]。但真實世界裡你幾乎不會「只用 broker」:資料要從別的系統搬進來、事件的長相要有人管、流上還得做轉換與聚合。這些 broker 都不做 —— 它們由一圈生態元件補上。這篇講最核心的三個:**Kafka Connect、Schema Registry、Kafka Streams**。

## broker 只負責「存與送」,其餘交給生態系

先把界線劃清楚:**Kafka broker 只做一件事 —— 可靠地存 log、送 log。** 它不知道你的資料從哪來、長什麼樣、要算成什麼。但每條真實管線都反覆出現三個需求,各自對應一塊生態元件:

| 需求 | 沒有生態系時你得做的事 | 生態元件 |
|---|---|---|
| 把外部系統的資料搬進/出 Kafka | 自己寫一堆 producer / consumer 膠水程式 | **Kafka Connect** |
| 確保大家對「事件長相」有共識 | 口頭約定欄位,改一個就炸下游 | **Schema Registry** |
| 在事件流上做轉換 / 聚合 / join | 自己管狀態、容錯、exactly-once | **Kafka Streams** |

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 250" role="img" aria-label="Kafka broker 居中,Connect source 從外部系統把資料搬進來、Connect sink 送到下游,Schema Registry 在上方供應 schema,Kafka Streams 在下方讀流運算後寫回" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="ke1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="232" y="100" width="136" height="50" rx="10" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="300" y="122" fill="#e6e6e6" font-size="13" text-anchor="middle">Kafka</text>
    <text x="300" y="138" fill="#9aa4b2" font-size="9.5" text-anchor="middle">topics / log</text>
    <rect x="14" y="102" width="96" height="46" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="62" y="121" fill="#e6e6e6" font-size="10.5" text-anchor="middle">MySQL / API</text>
    <text x="62" y="136" fill="#9aa4b2" font-size="9" text-anchor="middle">來源系統</text>
    <rect x="490" y="102" width="96" height="46" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="538" y="121" fill="#e6e6e6" font-size="10.5" text-anchor="middle">DW / ES / S3</text>
    <text x="538" y="136" fill="#9aa4b2" font-size="9" text-anchor="middle">下游系統</text>
    <line x1="110" y1="125" x2="230" y2="125" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#ke1)"/>
    <text x="170" y="116" fill="#d4af37" font-size="9.5" text-anchor="middle">Connect source</text>
    <line x1="368" y1="125" x2="488" y2="125" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#ke1)"/>
    <text x="428" y="116" fill="#d4af37" font-size="9.5" text-anchor="middle">Connect sink</text>
    <rect x="222" y="18" width="156" height="40" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3"/>
    <text x="300" y="42" fill="#e6e6e6" font-size="11" text-anchor="middle">Schema Registry</text>
    <line x1="300" y1="58" x2="300" y2="98" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="3 3"/>
    <rect x="222" y="192" width="156" height="42" rx="8" fill="#262b3a" stroke="#d4af37" stroke-width="1.4"/>
    <text x="300" y="210" fill="#e6e6e6" font-size="11" text-anchor="middle">Kafka Streams</text>
    <text x="300" y="225" fill="#9aa4b2" font-size="9" text-anchor="middle">讀 → 運算 → 寫回</text>
    <line x1="280" y1="152" x2="280" y2="190" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ke1)"/>
    <line x1="320" y1="190" x2="320" y2="152" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ke1)"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">broker 居中只管存與送;Connect 負責進出、Schema Registry 供應結構共識、Streams 在流上做運算後寫回</figcaption>
</figure>

## Kafka Connect:免寫程式的資料搬運

要把 MySQL 的異動同步進 Kafka、或把 topic 灌進 Elasticsearch,你大可自己寫 producer / consumer —— 但那是一堆重複的膠水:重試、offset 管理、批次、容錯,每個整合都重寫一次。**Kafka Connect 把這層收成一個框架,你只要用 JSON 宣告「接哪個系統、搬哪張表」,不寫程式。**

兩個方向:

- **Source connector**:外部系統 → Kafka。例如 Debezium 讀 MySQL 的 binlog,把每筆 insert/update/delete 變成事件流(這就是 CDC,Change Data Capture)。
- **Sink connector**:Kafka → 外部系統。例如把 `orders` topic 持續寫進資料倉儲或 Elasticsearch。

Connect 自己也是分散式的:一個 connector 會拆成多個 **task** 平行跑,**offset 與進度由框架托管**,worker 掛了會把 task 重新分配、從上次位置接續 —— 這些「正確搬資料」的麻煩事它都包好了。

這個設計跟 [[airflow-providers|Airflow 的 Operator / Hook]] 是同一種思路:**把「與外部系統整合」這件事,抽成可重用、可設定的元件,而不是每次手寫。** 差別在 Airflow 是排程觸發的批次任務,Connect 是長駐的串流搬運。

## Schema Registry:讓 producer 與 consumer 對齊「事件長相」

Kafka 的事件本質上就是 bytes,broker 不在乎裡面是什麼。問題來了:producer 某天在事件多加一個欄位、或把 `amount` 從整數改成字串,**consumer 反序列化當場炸掉** —— 而且是上線後才炸。

**Schema Registry 把「事件的結構」從各自的程式碼裡,搬到一個集中、有版控的地方。** 運作方式:

- producer 送訊息前,先把 schema(Avro / Protobuf / JSON Schema)註冊到 registry,訊息本身只夾帶一個 **schema id**;consumer 拿 id 回 registry 查到 schema 再反序列化。
- registry 會用**相容性規則**擋掉危險的變更:`BACKWARD`(新 consumer 能讀舊資料,允許加有預設值的欄位)、`FORWARD`(舊 consumer 能讀新資料)、`FULL`(兩邊都要)。不相容的 schema 在註冊那一刻就被拒,而不是等到下游爆炸。

換句話說,**它把「改欄位會不會搞死別人」這個問題,從執行期的意外,提前成註冊期的一道閘門。**

## Kafka Streams:在流上做運算,不另起一個叢集

讀一個 topic、做聚合或 join、再寫回另一個 topic —— 這種「流上運算」如果自己用 consumer + producer 寫,你得自己處理狀態、容錯、重複。**Kafka Streams 是一個 client library(不是另一個叢集),直接跑在你的 Java / Scala 應用裡**,把這些都包好:

- **有狀態運算**:聚合、windowing、join 都支援。狀態存在本地 state store,同時寫一份 **changelog topic** 回 Kafka —— 實例掛了換台機器,從 changelog 重建狀態。
- **exactly-once**:直接接 [[kafka-delivery|上一篇]]講的 transaction,把「讀 → 運算 → 寫回」做成原子操作。
- **兩種抽象**:`KStream` 是「一筆筆事件流」,`KTable` 是「可被 key 更新的快照表」 —— 同一條 topic 看成流或看成表,對應不同運算(例如 KTable 適合「每個使用者的最新狀態」)。

### Kafka Streams vs Spark Structured Streaming

兩者都能做串流運算,但定位很不同:

| 面向 | Kafka Streams | Spark Structured Streaming |
|---|---|---|
| 部署模型 | 嵌在你的 app,**無額外叢集** | 獨立 Spark 叢集 |
| 延遲 | 逐筆,毫秒級 | micro-batch,通常較高 |
| 語言 | Java / Scala 為主 | Python / SQL 友善 |
| 適用 | 中等吞吐、低延遲的服務內運算 | 超大量、且想**批流同源**共用一套 API |
| 資料來源 | 只接 Kafka | Kafka、檔案、多種來源 |

簡單講:**只在 Kafka 內、要低延遲又不想多養叢集 → Streams;資料量巨大、要跟批次共用邏輯、團隊是 Python/SQL → Spark。** 這也呼應 [[spark-running|Spark 那篇]]提的——Structured Streaming 本身就常以 Kafka 當輸入源,兩者是合作而非互斥。

## 反思

### 真正的 Kafka 專案,九成時間花在生態系而不是 broker

我觀察自己和團隊實際在 Kafka 上的工時,broker 本身的設定(partition、複本、retention)其實一次搞定就很少再動;**反而是 Connect 的 connector 調校、Schema 的版本演進、Streams 的狀態與重啟,才是天天在碰的。** 所以如果只讀完前三篇就覺得「我懂 Kafka 了」,其實才碰到地基 —— 真正讓系統跑起來、又不三天兩頭出事的,是這一圈生態元件。學 Kafka 不能停在 broker。

### Schema Registry 是被嚴重低估的「防炸」基礎建設,要早一點上

這是我最想對過去的自己喊話的一點。早期專案圖快,event 就直接塞 JSON、欄位靠口頭約定 —— 一開始很爽,直到某次有人改了欄位型別,下游一票 consumer 在半夜集體炸掉,還很難查是誰改的。**Schema Registry 的價值不在「序列化效率」,而在它把『改結構會不會害到別人』變成一道註冊期就擋下來的閘門。** 它前期要花點力氣導入,但它擋掉的是那種最難 debug、最傷信任的線上事故。我現在的態度是:只要事件會被兩個以上團隊消費,Schema Registry 就該一開始就上,不要等出事。

### Connect 能用就別自己寫 consumer

我看過太多團隊為了「把 Kafka 資料寫進 ES / 資料庫」手刻一個常駐 consumer,然後在裡面慢慢長出重試、offset 管理、批次、監控 —— 半年後它變成一個沒人敢動、其實就是「半個爛掉的 Connect」的東西。**這些麻煩 Connect 早就解過了,而且解得比你臨時寫的好。** 我的預設原則:標準的「搬資料進出」一律先找現成 connector,只有當需求真的奇特(複雜轉換、特殊協定)才自己寫。把工程時間留給業務邏輯,而不是重造搬運輪子。

### 選 Streams 還是 Spark,先看你已經有什麼

這題很容易陷進「誰技術上更強」的比較,但實務上更該問的是**你的團隊與環境現況**:已經有一座 [[spark-running|Spark 叢集]]、團隊都寫 Python/SQL、資料量巨大且要跟批次共用邏輯 —— 那 Spark Structured Streaming 順理成章;反之只是要在 Kafka 內做個低延遲的聚合、又不想多養一套叢集和維運,Streams 嵌進 app 就贏在簡單。**沒有絕對的好壞,只有跟你既有技術棧的契合度** —— 這跟整個系列的調子一致:Kafka 生態給的是一組工具,挑哪個,取決於你要解的問題長什麼樣。
