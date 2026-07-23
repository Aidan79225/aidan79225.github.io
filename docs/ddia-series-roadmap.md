# Designing Data-Intensive Applications 讀書筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Designing Data-Intensive Applications 讀書筆記"`。
書:*Designing Data-Intensive Applications*(Martin Kleppmann,O'Reilly 2017),簡稱 DDIA。

定位:**FoDE 的「原理版」對照**。FoDE 是 DE 實務地圖(角色、生命週期、選型);DDIA 是「分散式資料系統為什麼長這樣」的原理——把 replication / partitioning / consistency 這些「聽過但講不清」的東西講到骨子裡。它對整站內在連結貢獻最大:幾乎每章都能連回既有系列。

**重疊處理**:DDIA 的交易(Ch7)、一致性(Ch9)會跟 `SQL #11 交易`、`SRE 共識`部分重疊。原則——**DDIA 一律拉到「分散式」高度**(單機交易/隔離讓 SQL 篇講、分散式交易與共識讓 DDIA 講),兩邊 cross-link、不重複。

一章一篇,共 12 篇。★ = 最高價值、圖最好畫的六篇(1、3、5、6、8、9)。邊讀邊寫:寫好一篇 → `draft: true` 改 `false` 發佈。`seriesOrder` = 章節序。

## Part I — 資料系統的地基

| # | slug | 章 | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `ddia-reliable-scalable` | Ch1 Reliable, Scalable, Maintainable | 三個系統目標;fault≠failure、Chaos;load parameter 與 Twitter fan-out;percentile;意外複雜度 | ✅ 已發布 |
| 2 | `ddia-data-models` | Ch2 Data Models & Query Languages | relational / document / graph;一對多 vs 多對多;schema-on-read/write;關聯式為何贏(宣告式)、文件為何回來 | ✅ 已發布 |
| 3 | `ddia-storage-engines` | Ch3 Storage and Retrieval | 最簡資料庫(append+grep)→ 索引=用寫買讀;LSM(memtable/SSTable/compaction,順序寫、欠債後還)vs B-tree(page 就地更新+WAL,當場付清);append-only 討好磁碟的暗線(AOF/Kafka log/WAL 同源);OLTP 列式 vs OLAP 欄式(壓縮、數倉分家的底層原因)—— 接 `[[sql-index]]`、`[[redis-persistence]]`、`[[infra-kafka]]`、`[[medallion-architecture]]`、`[[spark-intro]]` | ✅ 已發布 ★ |
| 4 | `ddia-encoding` | Ch4 Encoding and Evolution | data outlives code + 滾動更新=新舊並存 → 向後(新讀舊)/向前(舊讀新,最易忘)兩種相容;JSON 的含糊;Protobuf/Thrift field tag 機制(跳過未知 tag/預設值、tag 三鐵律);Avro writer/reader schema 讀時調和;Schema Registry 把紀律自動化;schema 先行的部署紀律 —— 接 `[[k8s-deployment]]`、`[[kafka-intro]]`、`[[kafka-ecosystem]]`、`[[ddia-data-models]]` | ✅ 已發布 |

## Part II — 分散式資料

| # | slug | 章 | 主題 | 狀態 |
|---|---|---|---|---|
| 5 | `ddia-replication` | Ch5 Replication | 三種拓撲=把衝突放在哪(單主源頭消滅→failover 難/多主事後解/無主 quorum w+r>n 讀時調和+read repair);quorum 的邊角(sloppy/並發寫);複製延遲三怪象有名字有藥(read-your-writes→讀 leader、單調讀→固定一台、一致前綴→同分區);一致性是菜單不是開關 —— 接 `[[redis-replication]]`、`[[redis-sentinel]]`、`[[sre-consensus]]`、`[[infra-spark]]`、`[[k8s-troubleshooting]]` | ✅ 已發布 ★ |
| 6 | `ddia-partitioning` | Ch6 Partitioning | 分片策略(range / hash)、rebalancing、二級索引 —— 接 SQL MPP(#12)、Kafka partition | ⬜ ★ |
| 7 | `ddia-transactions` | Ch7 Transactions | ACID、隔離層級、可串行化 —— 拉到分散式,跟 `[[sql-index]]` 系列 #11 互補不重複 | ⬜ |
| 8 | `ddia-distributed-trouble` | Ch8 The Trouble with Distributed Systems | 不可靠的網路 / 時鐘 / 部分失效、拜占庭 —— 接 SRE | ⬜ ★ |
| 9 | `ddia-consistency-consensus` | Ch9 Consistency and Consensus | linearizability、CAP、共識 / Raft、全序廣播 —— 接 SRE 共識(#14) | ⬜ ★ |

## Part III — 衍生資料

| # | slug | 章 | 主題 | 狀態 |
|---|---|---|---|---|
| 10 | `ddia-batch` | Ch10 Batch Processing | MapReduce、資料流引擎、join 策略 —— 接 `[[spark-intro]]` | ⬜ |
| 11 | `ddia-streaming` | Ch11 Stream Processing | event log、exactly-once、CDC、流批統一 —— 接 `[[kafka-intro]]`、`[[spark-streaming]]` | ⬜ ★ |
| 12 | `ddia-future` | Ch12 The Future of Data Systems | unbundling the database、lambda / kappa、資料完整性 | ⬜ |

## 寫每篇時的慣例
- front matter:`series: "Designing Data-Intensive Applications 讀書筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`distributed-systems` + `book-notes` + 該章主題(如 `replication`、`consistency`、`storage`)。
- 依 `.claude/skills/writing-blog-post`:摘要比原書更清楚(提煉成模型/對照)+ 一段真實反思;台灣用語(見 `docs/zh-tw-style-guide.md`)。
- 每篇一張以上站台深色 SVG(SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號)。
- **最大差異化 = cross-link**:把原理扣回既有實戰系列 —— 儲存 ↔ `[[sql-index]]`;編碼/串流 ↔ `[[kafka-intro]]`;批次 ↔ `[[spark-intro]]`;分散式麻煩/共識 ↔ Google SRE;可靠度 ↔ `[[sre-intro]]`;分片 ↔ SQL MPP。
