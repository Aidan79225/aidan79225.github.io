# Kafka 學習筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Kafka 學習筆記"`。

定位:**Kafka 不是「比較厲害的訊息佇列」,它是一條可重播的 log。** 這個心智轉換是全系列的地基——**資料不因為被讀走而消失,每個消費者各記各的書籤**。從這一句可以倒推出後面每一篇:為什麼順序只在 partition 內成立、為什麼 exactly-once 要兩塊拼、為什麼 retention 是一個業務決策而不是磁碟設定。官方文件教你有哪些參數,這裡教你**每個參數在買什麼保證、代價由誰付**。

護城河:**把 Kafka 放進整條資料管線裡看**——站內已經有 Spark(消費端)、Airflow(批次那一側)、DDIA(原理)、Infra(怎麼養)、SRE(過載與背壓),Kafka 系列不必自成孤島,每篇都能扣到隔壁;再加上 `[[rezero-comment-order]]` 的真實戰史(留言流就是事件流:多源接入、LWW、削峰),這是單一工具教學給不出的密度。

罩門(寫成紀律,這系列最容易寫爛的兩件事):
1. **別變成設定教學**——`acks` / `retention.ms` / `min.insync.replicas` 不是背下來就懂;每個參數都要回答「你在買什麼保證、誰付代價、不買會怎樣」。
2. **別把 Kafka 當萬靈丹**——每篇都要留一句「什麼時候不需要它」;量級沒到就上 Kafka,是拿解耦的好處換維運的重稅,接 `[[pain-before-power]]`。

**與既有系列的關係(差異化)**:
- ↔ **Spark 系列**(`[[spark-streaming]]`):**這裡管事件怎麼進來、有什麼保證;那邊管拿到之後怎麼算**(串流即無界表)。Kafka Streams vs Spark Structured Streaming 的選型對照放 #4,兩邊互指、不重講。
- ↔ **從 Infra 角度看資料工具**(`[[infra-kafka]]`、`[[infra-kafka-connect]]`):那邊是「磁碟為王的有狀態叢集」——拓撲、擴縮要搬資料、StatefulSet、在 k8s 上怎麼養;這裡是 **Kafka 概念層**的模型與保證。**#5 最容易跟 `[[infra-kafka]]` 撞**:分工是 ops 講 KRaft / retention / compaction / 該盯哪些指標(Kafka 自己的語彙),infra-kafka 講「當一個 stateful 服務怎麼部署擴縮」(體檢表的語彙)。互連、不重複。
- ↔ **DDIA**(`[[ddia-streaming]]`、`[[ddia-partitioning]]`、`[[ddia-encoding]]`):log-based messaging 為什麼贏過 JMS 式佇列、分區的通則、schema 演進的原理都在那邊;這裡是拿 Kafka 把它落地。
- ↔ **Google SRE**(`[[sre-cascading-failures]]`):背壓、削峰、過載保護的觀念在那邊;這裡只講「Kafka 在這件事上剛好提供什麼」(緩衝、lag 當壓力表)。
- ↔ **Airflow 系列**(`[[airflow-scheduling]]`):批次 vs 串流的界線——**大多數「即時需求」其實是「一小時一次就好」**,這條線在 #1 就要講清楚。
- ↔ **Redis 系列**(`[[redis-pubsub-stream]]`):Redis Stream 是輕量的同型工具;取捨(要不要為了它養一個叢集)在兩邊互指。
- ↔ **`[[zookeeper]]`**:KRaft 之前那段歷史與「協調」這件事的原理,獨立篇已經寫過,#5 只需要接過去。

**貫穿主軸**:**Kafka 賣的是一條可重播的 log,和三個要付錢的承諾——順序、不漏、留多久。** 拆成三個可逐項檢查的性質(表格用 **【】** 標記,寫之前先確認這篇在服務哪一項,免得結尾硬套同一句話):

| 性質 | 在問什麼 | 沒有它會怎樣 |
|---|---|---|
| **【可重播】** | 這篇有沒有扣回「資料不因被讀走而消失」?(offset、consumer group、retention、compaction) | 讀者還是用 queue 的腦袋想 Kafka:以為訊息被消費掉了、以為重跑要重送 |
| **【承諾與代價】** | 這篇談的保證是什麼、**誰付錢**?(延遲、磁碟、吞吐、複雜度) | 變成參數表:`acks=all` 抄上去卻沒配 `min.insync.replicas`,買到一個假保證 |
| **【解耦】** | 這篇回不回答「這讓誰跟誰可以不用互相知道」?(N² 直連 → 中樞、broker 只存與送、Connect 接外部) | 只剩「Kafka 好快」,講不出它憑什麼值得多養一套叢集 |

第三個性質也是誠實面的出口:**解耦有代價**——多一跳延遲、多一套要維運的東西、debug 要跨系統追。每篇都可以留一句。

★ = 骨架 / 最高投報(1、2、3)。邊寫邊發:`draft: true` → `false`。`seriesOrder` = 寫作順序。

## 每篇的圖與表(硬性要求)

這系列刻意**不貼大段程式碼**(Kafka 的難點不在 API,在保證與取捨),換成兩樣硬性要求:

| 要求 | 規矩 |
|---|---|
| **一張扛機制的深色 SVG** | 圖要單獨看懂大意:N² vs 中樞、同一條 log 兩個消費者各記 offset、三個失誤點、compaction 壓掉舊值。裝飾性的 broker 方塊圖不算 |
| **一張「代價對照表」** | 這篇談的保證要有價目表:三種投遞語意 × 代價、Streams vs Spark 該選哪個、retention 換到什麼 |
| **設定名寫成 inline code** | `acks=all`、`min.insync.replicas`、`retention.ms`、`compact` —— 讀者要能直接拿去搜;但**不列全部參數**,只列這篇論點會用到的 |

例外:未來若寫交易 / producer 實作類的候補篇,再補最小可跑片段(那時的難點才在 API)。

## 第一批 — 地基:從 queue 到 log

| # | slug | 標題 | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `kafka-intro` | Apache Kafka 是什麼?從訊息佇列到事件串流 | **【解耦 + 可重播】** 解決什麼問題:N² 條直連 → 一個中樞(圖:左邊每加一個系統就牽一堆線,右邊各連 Kafka 一次);**核心心智模型=一條可重播的 log,不是 queue**(圖:消費者 A 讀到 offset 2、B 讀到 5,各記各的書籤,資料不因被讀走而消失);跟 DB / 傳統 MQ 差在哪;擅長什麼、不擅長什麼;反思:把它當**事實的日誌**不是訊息的水管、解耦也有代價、量級沒到別上重武器——接 `[[pain-before-power]]`、`[[airflow-scheduling]]`(批次 vs 串流的界線)、`[[medallion-architecture]]`、`[[spark-intro]]` | ✅ 已發布 ★ |
| 2 | `kafka-topics` | Kafka 的核心模型:Topic、Partition、Offset 與 Consumer Group | **【可重播 + 承諾(順序)】** Topic 只是名字,**partition 才是真正那條有序的 log**(圖:吞吐隨 partition 數放大);producer 用 key 決定進哪個 partition=**選 key 就是在設計順序與負載**;offset 是位置也是書籤;Consumer Group(圖:同 group 內一個 partition 只給一個 consumer=平行分攤,換 group 則各自讀全部=廣播,這是 Kafka 能同時當佇列又當廣播的關鍵);**順序保證只在 partition 內成立**;反思:partition 數是最重要也最難回頭的前期決定、熱鍵會毀掉平行度、但這套還沒回答「會不會重複或漏掉」→ 直接開下一篇 | ✅ 已發布 ★ |

## 第二批 — 承諾與生態:保證怎麼談、broker 之外

| # | slug | 標題 | 主題 | 狀態 |
|---|---|---|---|---|
| 3 | `kafka-delivery` | Kafka 的投遞保證:acks、ISR 與 at-least-once / exactly-once | **【承諾與代價】** 一筆事件的旅程**三個失誤點**(圖):producer→broker 用 `acks` 管、broker 之間用複本與 ISR 管、consumer 用 `commit` 時機管;三種投遞語意一張表看完(at-most-once / at-least-once / exactly-once × 代價);**exactly-once 不是魔法,是冪等 producer + 交易兩塊拼起來**;反思:**務實預設是「at-least-once + 下游冪等」**、`acks=all` 沒搭 `min.insync.replicas` 是最常見的假保證、可靠性該按資料重要性分級、真正該先問「漏和重複哪個你的業務承受得起」——接 `[[airflow-reliability]]`(冪等這條線)、`[[sre-data-pipelines]]` | ✅ 已發布 ★ |
| 4 | `kafka-ecosystem` | Kafka 生態系:Connect、Schema Registry 與 Streams | **【解耦】** broker 只負責「存與送」,其餘全外包給生態系(圖:Connect 管進出、Schema Registry 供應結構共識、Streams 在流上算完寫回);Kafka Connect=免寫消費者的搬運工(source/sink);**Schema Registry=事件長相的契約**,相容性策略讓 producer 與 consumer 不用同時上線;Kafka Streams vs Spark Structured Streaming 對照表(要不要另起叢集、狀態放哪、團隊已經有什麼);反思:**真正的 Kafka 專案九成時間花在生態系不是 broker**、Schema Registry 是被低估的防炸基建要早點上、Connect 能用就別自己寫 consumer——接 `[[spark-streaming]]`、`[[airflow-providers]]`、`[[ddia-encoding]]`、`[[infra-kafka-connect]]` | ✅ 已發布 |

## 第三批 — 養它:維運與容量

| # | slug | 標題 | 主題 | 狀態 |
|---|---|---|---|---|
| 5 | `kafka-ops` | Kafka 維運與部署:KRaft、retention/compaction 與監控 | **【可重播 + 承諾與代價】** **KRaft** 終於擺脫 ZooKeeper(元資料自己存成一條 log,接 `[[zookeeper]]`);**Retention**=log 留多久由你決定,`retention.ms` / `retention.bytes`;**Log Compaction**=每個 key 只留最新值(圖:k1 的 a、b 被壓掉留 c,結果是一份「最新值快照」),`delete` vs `compact` 各自的用途;監控該盯哪些指標;容量規劃(幾台 broker、幾個 partition);反思:**Consumer Lag 是第一個也最該盯的指標**、**retention 是「重播能力 vs 磁碟成本」的對帳,要當業務決策談**、**Kafka 不會自己壞,是「承諾」沒被監控兌現**——接 `[[infra-kafka]]`(同一台機器的維運面)、`[[obs-metrics-prometheus]]`、`[[sre-monitoring]]` | ✅ 已發布 |

## 主幹已完成(1–5)

五篇把主軸走完一輪:**心智模型(1)→ 順序與分工(2)→ 不漏的保證(3)→ 生態系接上下游(4)→ 留多久與怎麼盯(5)**。系列收在完整狀態,不必為了湊數字硬開新篇。

## 候補(缺了不影響完整性,依需要再挑)

- **交易與 exactly-once 深水區** — #3 只給了模型(冪等 producer + 交易兩塊拼);真要寫,主體應該是**實作面**:交易 API 的操作、read-committed 隔離、跨 topic 原子寫、以及「為什麼多數團隊最後還是選 at-least-once + 下游冪等」的成本帳。這篇要成立,得有最小可跑範例,不能只講道理。
- **資料契約:Schema Registry 相容性策略實戰** — BACKWARD / FORWARD / FULL 怎麼選、加欄位刪欄位各自會炸誰。開之前先想清楚跟 `[[ddia-encoding]]` 的分工(原理在 DDIA),很可能該長成資料品質那條線的一篇,而不是 Kafka #6。
- **訊息中介選型對照(Kafka / RabbitMQ / Redis Stream / Pulsar)** — 與 `[[infra-rabbitmq]]`、`[[redis-pubsub-stream]]` 重疊大,傾向留在 Infra 系列用體檢表收,這裡最多在 #1 補一句。

紀律:候補一篇都不寫也沒關係。**補一篇不如把跨系列的連結補好**——這系列的價值有一半長在 Spark / Infra / DDIA / 戰史的交會處。

## 建議閱讀順序
1. **心智模型**(1):沒把 queue 換成 log,後面每一篇都會理解錯方向。
2. **核心模型**(2):partition / offset / consumer group 是後面所有討論的座標系;#2 結尾故意留白「會不會重複或漏掉」,直接接 #3。
3. **保證**(3):這系列真正的重點——先決定你的業務怕漏還是怕重複,再回頭挑參數。
4. **生態系**(4):真實專案的九成工作量在這裡;順手接到 Spark 那條消費線。
5. **維運**(5):retention 與 lag 把前四篇的承諾換算成磁碟與監控;要更深的部署面轉 `[[infra-kafka]]`。

## 術語表(Ubiquitous Language)

工具系列:API 名稱、設定鍵、CLI 參數**一律不譯**(照原文寫)。這張表管的是「用中文寫的那些概念」怎麼統一。

全系列同一個概念只准一個中文寫法;英文欄是翻譯時直接照抄的來源。
寫到表上沒有的術語就補一列。跨系列共用的通用詞(快取、佇列、可觀測性)在
`docs/ubiquitous-language.md`(全站術語表),這裡只放本系列特有的。

| 中文用詞 | 英文 | 備註 |
|---|---|---|
| 生產者 / 消費者 | producer / consumer | **zh style guide D 區明訂**:Kafka 的「生產者 / 生產與消費 / 生產端」是 producer,不要替換成 Production |
| 主題 | topic | 內文多直接用 topic |
| 分區 | partition | 與 DDIA / Spark 系列對齊,同一個中文詞;不寫「分片」 |
| 位移 | offset | 事件在 partition 內的位置 |
| 消費者群組 | consumer group | 不寫「消費組」 |
| 消費延遲 | consumer lag | 第一個該盯的指標;不寫「消費滯後」 |
| 副本 | replica | ISR = in-sync replicas,縮寫照原文 |
| 保留 | retention | 「重播能力 vs 磁碟成本」的對帳 |
| 壓實 | log compaction | 每個 key 只留最新值;不寫「壓縮」(那是 compression) |
| 重播 | replay | |
| 投遞語意 | delivery semantics | at-most-once / at-least-once / exactly-once 三個縮寫照原文 |
| 冪等生產者 | idempotent producer | exactly-once 的其中一塊 |
| 交易 | transaction | 與 DDIA 對齊(全站統一用「交易」);Kafka 的 transactional producer 語境也一樣 |

## 寫每篇時的慣例
- front matter:`series: "Kafka 學習筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`kafka` + `data-engineering` + 該篇主題(如 `event-streaming`、`messaging`、`reliability`、`stream-processing`、`operations`)。
- 依 `.claude/skills/writing-blog-post`:一張招牌深色 SVG + 比官方文件更清楚的摘要 + 一段真實反思。
- SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號;figcaption 內不放 `[[wikilink]]`,要連結用 `<a href>`。
- 台灣用語(見 `docs/zh-tw-style-guide.md`;數據/依賴/函式 等保留不換)。
- **每篇一張圖 + 一張代價對照表**(見〈每篇的圖與表〉);設定名用 inline code,但不列全部參數。
- **貫穿主軸**:每篇結尾扣回「**一條可重播的 log,和三個要付錢的承諾:順序、不漏、留多久**」,並確認這篇服務的是 **【可重播】/【承諾與代價】/【解耦】** 哪一項(表格的 **【】** 標記就是這個用途);順手留一句「什麼時候不需要 Kafka」。
- **cross-link 是重點**:消費與運算 ↔ `[[spark-streaming]]`、`[[spark-intro]]`;維運與 k8s ↔ `[[infra-kafka]]`、`[[infra-kafka-connect]]`;原理 ↔ `[[ddia-streaming]]`、`[[ddia-partitioning]]`、`[[ddia-encoding]]`;過載與背壓 ↔ `[[sre-cascading-failures]]`;冪等與重跑 ↔ `[[airflow-reliability]]`、`[[sre-data-pipelines]]`;監控 ↔ `[[obs-metrics-prometheus]]`、`[[sre-monitoring]]`;輕量對照 ↔ `[[redis-pubsub-stream]]`;協調歷史 ↔ `[[zookeeper]]`;實戰對照 ↔ `[[rezero-comment-order]]`;量級判準 ↔ `[[pain-before-power]]`。
- Git:開 branch → push → PR,不直接動 master(CLAUDE.md 硬規矩)。

## 修訂紀錄
- **2026-08-27**:roadmap 補上定位 / 差異化 / 貫穿主軸 / 分批 / 建議閱讀順序;主題欄依已發布內容回填成定稿骨架;新增〈每篇的圖與表〉硬性要求(本系列刻意不貼程式碼,改要求圖 + 代價對照表)與候補區。原表的「#6 選配」不存在,主幹 1–5 即完整。
