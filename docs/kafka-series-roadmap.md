# Kafka 學習筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Kafka 學習筆記"`。

邊學邊寫:學完一個主題就寫對應那篇。寫好一篇 → 把該篇 `draft: true` 改成 `false` 發佈。
草稿狀態的系列文在正式站上不會出現在系列盒(走 `getPublishedPosts()`),`npm run dev` 看得到。
跨篇可用 `[[slug]]` / `[[slug#段落]]` 互連,發佈後 backlinks 會自動長出來(也可跨系列連到 Spark / Airflow / Medallion)。

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `kafka-intro` | Apache Kafka 是什麼?從訊息佇列到事件串流 | 定位、為什麼需要、可重播的 log vs queue、跟 DB/MQ 對比、擅長/不擅長 | ✅ 已發布 |
| 2 | `kafka-topics` | Kafka 的核心模型:Topic、Partition、Offset、Consumer Group | topic/partition、offset、producer key 分區、consumer group 與 rebalance、順序保證 | ✅ 已發布 |
| 3 | `kafka-delivery` | Kafka 的投遞保證:acks、ISR 與 at-least-once / exactly-once | ack、retry、冪等 producer、transaction、replication/ISR、保證等級取捨 | ✅ 已發布 |
| 4 | `kafka-ecosystem` | Kafka 生態系:Connect、Schema Registry 與 Streams | Kafka Connect(source/sink)、Schema Registry、Kafka Streams vs Spark Streaming | ✅ 已發布 |
| 5 | `kafka-ops` | Kafka 維運與部署 | KRaft(取代 ZooKeeper)、retention/compaction、監控、容量規劃 | ⬜ 選配 |

## 寫每篇時的慣例
- front matter:`series: "Kafka 學習筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 沿用 ASCII:`kafka` + `data-engineering` + 該篇主題(如 `event-streaming`、`messaging`)。
- 依 `.claude/skills/writing-blog-post`:摘要要比文件更清楚 + 一段真實反思;台灣用語(見 `docs/zh-tw-style-guide.md`,數據/依賴/函式 等保留不換)。
- 圖例用站台深色 SVG(SVG 內不可有空行)。
- 串流主題盡量扣回「可重播的 log」這條主軸;可跨系列連到 `[[spark-running]]`(Structured Streaming 消費 Kafka)、`[[medallion-architecture]]`(Bronze 即時攝取)、`[[airflow-scheduling]]`(批次 vs 串流)。
