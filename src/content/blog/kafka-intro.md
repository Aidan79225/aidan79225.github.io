---
title: "Apache Kafka 是什麼?從訊息佇列到事件串流"
date: 2026-06-24
category: tech
tags:
  - kafka
  - data-engineering
  - event-streaming
series: "Kafka 學習筆記"
seriesOrder: 1
comments: true
draft: false
---
## Kafka 是什麼

一句話:**Apache Kafka 是一個分散式的「事件串流平台」—— 它把系統之間流動的事件,以高吞吐、可持久化、可重播的 log 形式集中起來,讓很多生產者一直寫、很多消費者各自獨立讀**。它源自 LinkedIn(2011),後來成為 Apache 頂級專案,如今是幾乎所有「即時資料管線」的骨幹。

關鍵認知:**別把 Kafka 想成一個傳統的訊息佇列(把訊息送到就丟掉),要把它想成一條「持續被追加、而且可以重頭再讀」的事件日誌。** 這個心智轉變,是看懂 Kafka 一切設計的鑰匙。

### 它解決什麼問題:從 N² 條直連,到一個中樞

系統一多,「誰要誰的資料」就會爆炸。訂單系統要通知庫存、出貨、推薦、風控、報表…… 如果每一對都直接串接,整合的線會是 **N²** 等級 —— 加一個新消費者,就要回頭改生產者,脆弱又難維護。

Kafka 把這張網收斂成一個中樞:**生產者只管把事件寫進去,消費者各自訂閱自己要的,彼此互不知道對方存在。** 系統之間從此解耦。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 210" role="img" aria-label="左:多系統點對點直連成網狀;右:以 Kafka 為中樞,生產者寫入、消費者各自訂閱" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="130" y="20" fill="#9aa4b2" font-size="11" text-anchor="middle">點對點:N² 條線</text>
    <circle cx="70" cy="55" r="20" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <circle cx="190" cy="55" r="20" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <circle cx="60" cy="140" r="20" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <circle cx="160" cy="155" r="20" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <circle cx="210" cy="130" r="20" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <line x1="70" y1="55" x2="190" y2="55" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="70" y1="55" x2="60" y2="140" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="70" y1="55" x2="160" y2="155" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="70" y1="55" x2="210" y2="130" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="190" y1="55" x2="60" y2="140" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="190" y1="55" x2="160" y2="155" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="190" y1="55" x2="210" y2="130" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="60" y1="140" x2="160" y2="155" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="160" y1="155" x2="210" y2="130" stroke="#3a4154" stroke-width="1.2"/>
    <text x="430" y="20" fill="#9aa4b2" font-size="11" text-anchor="middle">中樞:各自連 Kafka</text>
    <rect x="392" y="88" width="76" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="430" y="113" fill="#e6e6e6" font-size="12" text-anchor="middle">Kafka</text>
    <circle cx="330" cy="55" r="18" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <circle cx="330" cy="160" r="18" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <circle cx="530" cy="55" r="18" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <circle cx="530" cy="160" r="18" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <line x1="346" y1="62" x2="394" y2="92" stroke="#4f6df5" stroke-width="1.3"/>
    <line x1="346" y1="152" x2="394" y2="124" stroke="#9aa4b2" stroke-width="1.3"/>
    <line x1="466" y1="92" x2="516" y2="62" stroke="#9aa4b2" stroke-width="1.3"/>
    <line x1="466" y1="124" x2="516" y2="152" stroke="#9aa4b2" stroke-width="1.3"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左邊每加一個系統就要牽一堆新線;右邊每個系統只連 Kafka 一次,生產與消費徹底解耦</figcaption>
</figure>

### 核心心智模型:它是一條可重播的 log,不是 queue

傳統訊息佇列(RabbitMQ 那類)的模型是:訊息被某個消費者拿走、處理完,就**從佇列裡消失**。Kafka 完全不同 —— 寫進去的事件是一筆筆**append 到一條只增不刪的 log**,在保留期限(retention)內一直留著。消費者不是「把訊息拿走」,而是各自拿著一個 **offset(讀到第幾筆)** 的書籤,沿著 log 往下讀。

這帶來兩個傳統佇列給不了的能力:

- **多消費者各自獨立**:報表組、風控組、推薦組可以同時讀同一條 log,各自記各自的 offset,互不影響、互不搶。
- **可重播(replay)**:程式改錯了、或新接一個消費者想吃歷史資料,把 offset 倒回去重讀就好 —— 資料還在。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 180" role="img" aria-label="Kafka 是一條 append-only 的 log,生產者往尾端寫,多個消費者各自用 offset 標記讀到哪" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="20" y="44" fill="#9aa4b2" font-size="11" text-anchor="start">Producer 往尾端 append →</text>
    <rect x="40" y="54" width="46" height="40" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="63" y="79" fill="#9aa4b2" font-size="11" text-anchor="middle">0</text>
    <rect x="88" y="54" width="46" height="40" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="111" y="79" fill="#9aa4b2" font-size="11" text-anchor="middle">1</text>
    <rect x="136" y="54" width="46" height="40" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="159" y="79" fill="#9aa4b2" font-size="11" text-anchor="middle">2</text>
    <rect x="184" y="54" width="46" height="40" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="207" y="79" fill="#e6e6e6" font-size="11" text-anchor="middle">3</text>
    <rect x="232" y="54" width="46" height="40" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="255" y="79" fill="#e6e6e6" font-size="11" text-anchor="middle">4</text>
    <rect x="280" y="54" width="46" height="40" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="303" y="79" fill="#e6e6e6" font-size="11" text-anchor="middle">5</text>
    <rect x="328" y="54" width="46" height="40" rx="5" fill="none" stroke="#3a4154" stroke-width="1.3" stroke-dasharray="3 3"/><text x="351" y="79" fill="#9aa4b2" font-size="11" text-anchor="middle">6</text>
    <text x="420" y="79" fill="#9aa4b2" font-size="10" text-anchor="start">新事件…</text>
    <line x1="159" y1="118" x2="159" y2="96" stroke="#d4af37" stroke-width="1.6" marker-end="url(#kf1)"/>
    <text x="159" y="134" fill="#d4af37" font-size="10" text-anchor="middle">消費者 A</text>
    <text x="159" y="148" fill="#9aa4b2" font-size="9" text-anchor="middle">offset=2</text>
    <line x1="303" y1="118" x2="303" y2="96" stroke="#4f6df5" stroke-width="1.6" marker-end="url(#kf2)"/>
    <text x="303" y="134" fill="#4f6df5" font-size="10" text-anchor="middle">消費者 B</text>
    <text x="303" y="148" fill="#9aa4b2" font-size="9" text-anchor="middle">offset=5</text>
    <defs><marker id="kf1" markerWidth="8" markerHeight="8" refX="4" refY="1" orient="auto"><path d="M0,8 L4,0 L8,8 z" fill="#d4af37"/></marker><marker id="kf2" markerWidth="8" markerHeight="8" refX="4" refY="1" orient="auto"><path d="M0,8 L4,0 L8,8 z" fill="#4f6df5"/></marker></defs>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同一條 log,消費者 A 讀到 offset 2、消費者 B 讀到 5,各記各的書籤、互不干擾;資料不因被讀走而消失</figcaption>
</figure>

### 它跟資料庫、訊息佇列差在哪

| | 傳統訊息佇列 | 資料庫 | **Kafka** |
|---|---|---|---|
| 資料模型 | 暫存的訊息 | 可查詢的當前狀態 | **只增的事件 log** |
| 讀完之後 | 訊息消失 | 資料留著、可改 | **留著、可重播,但不可改** |
| 多消費者 | 互相搶 | 各自查 | **各自獨立讀,互不影響** |
| 主要查詢 | 取下一筆 | 任意條件查詢 | **依 offset 順序往下讀** |
| 擅長 | 任務派發 | 當前狀態的真相 | **高吞吐事件流、解耦、重播** |

一句話記:**資料庫存「現在是什麼狀態」,Kafka 存「發生過哪些事」。** 兩者互補,不是替代。

### 它擅長什麼、不擅長什麼

- **擅長**:高吞吐的事件流、系統解耦、跨團隊共享同一份事件、需要重播的場景、串流處理的進水口。
- **不擅長**:當主資料庫用(它不為任意查詢設計)、需要請求-回應的低延遲互動、訊息量很小又要複雜路由的場景 —— 那些傳統佇列或直接打 API 更合適。

## 反思

### 把 Kafka 當「事實的日誌」,而不是「訊息的水管」

我自己學 Kafka 時最大的轉彎,是別再用「訊息傳遞」的框架去想它。一旦把它看成**一條記錄『發生過什麼事』的不可變日誌**,很多設計就突然合理了:為什麼資料被讀了還留著、為什麼多個團隊能各看各的、為什麼可以倒帶重算。傳統佇列的問題是「訊息一旦被消費就沒了」,而 Kafka 把「事件」當成**有保存價值的事實**,不是用過即丟的通知。這個視角一轉,它能幹嘛、不能幹嘛就一目了然。

### 它的價值是解耦,而解耦也有代價

Kafka 最實在的好處,是把「誰生產、誰消費」徹底拆開 —— 加一個新消費者,完全不必動到上游。這在多團隊的系統裡價值極高。但我也會提醒自己別過度浪漫化:中間多了一個 Kafka,就多了一套要維運、要監控、要懂 partition 與 offset 的基礎建設。**兩三個服務之間偶爾傳個訊息,直接打 API 或用個輕量佇列,往往比扛一整套 Kafka 划算。** 它是為「事件多、消費者多、要重播」的規模而生的 —— 這跟我寫 [[airflow-intro|Airflow]]、[[spark-intro|Spark]] 一貫的態度一樣:**先確認痛點到了那個量級,再上重武器。**

### 它剛好接上我前面學的那條資料管線

Kafka 不是孤立的東西,它正好補上我這陣子筆記的拼圖:在 [[medallion-architecture|Medallion 架構]]裡,它是把即時事件灌進 **Bronze 層**最常見的入口;而 [[spark-running|Spark Structured Streaming]] 則常常就掛在 Kafka 後面,把這條 log 即時消費、轉成 Silver/Gold。跟 [[airflow-scheduling|Airflow]] 的批次排程相比,Kafka 代表的是另一條軸線 —— **從「每小時跑一次」走向「事件一發生就處理」**。看懂這條軸線,是這個系列接下來要展開的主題。
