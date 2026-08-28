# PostgreSQL 學習筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "PostgreSQL 學習筆記"`。

定位:**你以為 PostgreSQL 只是「跑 SQL 的那台機器」——其實它是一台有生命週期、會累積帳單、需要人打掃的伺服器。** 站內的 `SQL 我以為我懂` 已經把**寫查詢的人**要懂的東西講完了(執行順序、索引為何失效、怎麼讀 `EXPLAIN`、四個隔離層級);這個系列換一張臉:**顧資料庫的人**要懂的東西——那些隔離層級是怎麼用 MVCC 實作出來的、實作的代價是什麼(舊版本堆在表裡)、誰負責清、清不完會發生什麼(表膨脹、事務 ID 迴繞)、以及一份 WAL 怎麼同時撐起崩潰復原、複寫與 PITR。

兩幕結構(2026-08-27 與作者討論定案):**幕一講引擎與維運**(PG 到底怎麼存、怎麼改、怎麼養),**幕二講招牌功能與擴充**(JSONB、全文檢索、當佇列用、extension 生態)。幕二不是加碼,是把幕一的成本模型套到「PG 什麼都能做」這件事上——**能做不等於該做**。

護城河:**托管時代使用者的第一手視角 + DE/backend lead 的戰史**。作者在 `Re:從零開始做直播代購電商平台` 拿 Django + PostgreSQL(Google Cloud SQL)打過真實電商——**這不是「自架 PG 的維運血淚」,而是更貼近多數讀者的處境:把打掃外包給雲之後,你看不見什麼、又為什麼沒出事。**幕一每篇都有戰場可扣:Serializable 扣庫存與重試(`[[rezero-inventory]]`)、開賣尖峰把單一 process 打爆(`[[rezero-flash-crowd]]`)、3NF 讓帳沒機會漂(`[[rezero-reconciliation]]`)、soft delete 變 bug 產生器(`[[rezero-asset-lifecycle]]`);再加上一條只有他知道的線——**跟播時親眼看到「有些單因為鎖被略過」**(見下方口述)。這些不是文件抄得出來的。

罩門(寫成紀律,這系列最容易寫爛的兩件事):
1. **別變成參數字典**——`shared_buffers` 該設多少不是重點;每個參數先回答「它在買什麼、誰付錢、不調會怎樣」,再給起手值與量測方式。
2. **別跟 SQL 系列重講一遍**——索引為何失效、`EXPLAIN` 怎麼讀、隔離層級定義,一律 cross-link 過去;這裡只從**「伺服器怎麼實作、維運會被怎麼咬」**的角度切入。每篇動筆前先問一句:這段話 SQL 系列講過沒?講過就連過去。

**與既有系列的關係(差異化)**:
- ↔ **SQL 我以為我懂**(`[[sql-transactions]]`、`[[sql-index]]`、`[[sql-explain]]`):**同一個 PG 的兩張臉**。那邊:四個隔離層級的定義與現象、索引失效情境、`EXPLAIN` 怎麼讀。這裡:MVCC 怎麼**實作**出那些隔離(xmin/xmax、快照)、索引的**寫入代價**與維護、planner 的統計值**靠誰更新**(autovacuum)。互指、不重講定義——這是本系列最需要守住的一條線。
- ↔ **DDIA**(`[[ddia-storage-engines]]`、`[[ddia-replication]]`、`[[ddia-transactions]]`、`[[ddia-partitioning]]`):跨系統的原理與通則在那邊(WAL 的概念、複寫拓撲、可序列化的理論、分片);這裡是 **PG 的具體實作與它獨有的代價**(heap 裡的舊版本、replication slot 撐爆磁碟、事務 ID 迴繞)。
- ↔ **從 Infra 角度看資料工具**(`[[infra-intro]]`、`[[infra-kafka]]`):那系列用同一張體檢表橫掃各工具,**目前沒有資料庫那一格**;這個系列縱向補上。日後若要補 `infra-postgres`,分工照 K8s ↔ Infra 的先例:那邊套體檢表做橫向比較,這裡逐主題講透。
- ↔ **Google SRE**(`[[sre-data-pipelines]]`、`[[sre-monitoring]]`、`[[sre-consensus]]`、`[[sre-production-readiness]]`):「有備份 ≠ 能還原」、四黃金訊號、腦裂與共識的觀念在那邊;這裡給 **PG 的做法**(PITR 演練怎麼跑、該盯哪幾張 `pg_stat_*`、failover 誰來裁決)。
- ↔ **Redis 系列**(`[[redis-persistence]]`、`[[redis-replication]]`):持久化與複寫的**對照組**——同樣的題目,記憶體資料庫與磁碟資料庫給出的答案差在哪。
- ↔ **Kafka 系列**(`[[kafka-intro]]`):幕二「用 PG 當佇列」的邊界對照——什麼時候一張表就夠、什麼時候該養一套 Kafka(接 `[[pain-before-power]]`)。
- ↔ **戰史**(`[[rezero-inventory]]`、`[[rezero-flash-crowd]]`、`[[rezero-reconciliation]]`、`[[rezero-asset-lifecycle]]`):實戰對照,幕一每篇盡量扣一個。

**貫穿主軸**:**每一次寫入都有第二筆帳——一份 WAL,和一個總有一天要打掃的舊版本;而「PG 什麼都能做」不等於「都該讓它做」。** 拆成三個可逐項檢查的性質(表格用 **【】** 標記,寫之前先確認這篇在服務哪一項,免得結尾硬套同一句話):

| 性質 | 在問什麼 | 沒有它會怎樣 |
|---|---|---|
| **【看不見的帳】** | 這篇談的機制,背後留下了什麼?(dead tuple、WAL 量、一個 OS process、索引維護、膨脹) | 讀者以為「寫進去就結束了」,直到某天磁碟滿了、查詢突然變慢,查不出為什麼 |
| **【誰來打掃】** | 這篇有沒有指出**誰負責回收與兌現**?(autovacuum、checkpointer、WAL 歸檔、連線池、DROP partition) | 以為資料庫會自己顧好自己——PG 最貴的事故幾乎都是「打掃的人追不上」 |
| **【邊界】** | PG 做得到,但什麼時候不該讓它做?(全文檢索 vs 搜尋引擎、佇列 vs Kafka、JSONB vs 正規化) | 變成「PG 全能」的推銷文;幕二整幕會失去誠實度 |

第三個性質是幕二的主場,但幕一也要留一句(例:分割表不是資料量大的萬用解、複寫不等於備份)。

## 每篇的範例與圖(硬性要求)

| 要求 | 規矩 |
|---|---|
| **一張扛機制的深色 SVG** | 圖要單獨看懂大意:tuple 的新舊版本與可見性、WAL 一份三用(復原/複寫/PITR)、鎖的等待鏈、分割表的 pruning。裝飾性的「Client→PG」方塊圖不算 |
| **可以貼進 psql 的最小片段** | 查詢類給 SQL,維運類給 `psql` 指令或設定行(標明檔名 `postgresql.conf` / `pg_hba.conf`);砍到只剩要講的那個東西,但貼上去不會壞 |
| **一個「打開來看」的動作** | 每篇要給讀者一條**能在自己的庫上跑的診斷**:`pg_stat_activity`、`pg_locks`、`pg_stat_user_tables` 的 dead tuple、`pg_stat_replication` 的 lag、`EXPLAIN (ANALYZE, BUFFERS)`。這系列的價值一半在這裡 |
| **版本基準** | 以 **PG 16+** 為準,行為有變的地方註明從哪版開始(例:宣告式分割表、`pg_stat_io`);不寫已經 EOL 的舊版做法 |

## 幕一 · 第一批 — 引擎地基:MVCC 與它的帳單

這四篇是全系列的地基,**#2 → #3 → #4 是一條因果鏈**(舊版本 → 誰來清 → 誰擋住清的人),建議一口氣寫完再往下。

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `pg-intro` | PostgreSQL 是什麼:一台你以為只是「跑 SQL」的伺服器 | **【看不見的帳】** 全景圖:一個連線一個 process、shared buffers、WAL、後台四工(autovacuum / checkpointer / bgwriter / WAL writer);**全系列的論點在這裡立起來**——PG 的每個維運題最後都回到 **MVCC + WAL** 兩條線;跟 MySQL/InnoDB 的根本差異(舊版本留在 heap vs undo log)=為什麼 PG 需要 vacuum 而 MySQL 不用這樣講;誠實面:process model 讓連線很貴(伏筆給 #9)——接 `[[sql-execution-order]]`(查詢層在那邊)、`[[ddia-storage-engines]]` | ⬜ ★ |
| 2 | `pg-mvcc` | MVCC:讀不擋寫,但誰在付錢 | **【看不見的帳】** tuple 的 `xmin`/`xmax`、快照與可見性規則(圖:同一列的多個版本,兩個交易各看到不同版本);**UPDATE 其實是「插新的 + 標舊的死」**;dead tuple 從哪來;HOT update 什麼時候幫得上忙;`sql-transactions` 講的四個隔離層級在這裡有了實作——接 `[[sql-transactions]]`、`[[ddia-transactions]]`、`[[rezero-inventory]]`(Serializable 扣庫存與重試的真實用法) | ⬜ ★ |
| 3 | `pg-vacuum` | VACUUM 與表膨脹:PG 最常見的事故 | **【誰來打掃】** autovacuum 怎麼被觸發(閾值 + 比例)、為什麼在高寫入表上追不上;bloat 怎麼量、怎麼收(`VACUUM` vs `VACUUM FULL` 會鎖表 vs `pg_repack`);**freeze 與事務 ID 迴繞**——PG 最恐怖的那一種停機,以及它為什麼會突然發生;autovacuum 參數該從哪幾個開始調;診斷:`pg_stat_user_tables` 的 dead tuple 與 last_autovacuum——接 `[[pg-mvcc]]`、`[[sre-monitoring]]`;**素材**:作者當年用 Cloud SQL,「不確定 Google 有沒有幫我打掃」——本篇的最佳開場:**托管沒有代勞 vacuum,autovacuum 一直在跑,只是沒人看**(Cloud SQL 是否調整過預設參數待查證) | ⬜ ★ |
| 4 | `pg-locks` | 鎖與長交易:誰卡住誰,怎麼查 | **【誰來打掃】** 鎖層級對照表(誰跟誰互斥)、`pg_locks` + `pg_stat_activity` 兩張表怎麼合起來看等待鏈;**`idle in transaction` 的殺傷力**——它同時擋住 vacuum 與別人的 DDL(接回 #3,這是最容易被低估的因果);DDL 需要 ACCESS EXCLUSIVE=線上加欄位/加索引的正確做法(`CREATE INDEX CONCURRENTLY`、先加可空欄位);`lock_timeout` / `statement_timeout` 當保險絲;deadlock 的定義與固定順序解法在 `[[sql-transactions]]`,這裡只講**怎麼在生產現場抓現行犯**;**素材(★ 獨家)**:fb message → cart item 有時因鎖被略過(Serializable 序列化失敗、重試用完就丟);**這件事是作者跟播時自己發現的,沒有其他人知道**——接 `[[rezero-comment-order]]`(失敗略過、單無聲消失)、`[[rezero-ops]]`(聽主播是最靈敏的告警)。另有大表加欄位卡過一次(見口述),之後學會挑離峰跑 | ⬜ ★ |

## 幕一 · 第二批 — 寫入路徑:一份 WAL,三種用途

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 5 | `pg-wal` | WAL:所有變更先寫日誌 | **【看不見的帳】** 為什麼要先寫日誌(崩潰復原的唯一依據);WAL 記錄、checkpoint 做了什麼、`full_page_writes` 為什麼存在(torn page);**招牌圖:同一份 WAL 同時餵三張嘴——崩潰復原、複寫、PITR**(這張圖是本系列的招牌,後兩篇都靠它);WAL 量會被什麼放大(checkpoint 太密、大量更新、索引多);`synchronous_commit` 是拿耐久度換延遲的旋鈕——接 `[[ddia-storage-engines]]`、`[[redis-persistence]]`(記憶體資料庫的同一題) | ⬜ ★ |
| 6 | `pg-replication` | 複寫與 failover:standby 不是備份 | **【誰來打掃】** streaming replication 怎麼跑、同步 vs 非同步(丟資料 vs 卡住寫入的取捨);**replication slot 保證不漏,代價是 standby 掛了會把主庫磁碟撐爆**(最經典的坑);hot standby 的查詢衝突與 `max_standby_streaming_delay`;邏輯複寫 vs 實體複寫各自的用途(升級、選擇性同步);failover 誰來裁決、腦裂怎麼防(Patroni + 共識,接 `[[sre-consensus]]`);**主軸句:複寫防的是機器掛掉,不防「你刪錯資料」**——那是 #7 的事 | ⬜ |
| 7 | `pg-backup-pitr` | 備份與 PITR:有備份 ≠ 能還原 | **【誰來打掃】** 兩種備份的分工(`pg_dump` 邏輯備份=可挑物件、跨版本;基礎備份 + WAL 歸檔=可還原到任意時間點);PITR 怎麼指定 recovery target;**還原演練是唯一能證明備份有效的事**(薛丁格的備份,接 `[[sre-data-pipelines]]`);RPO/RTO 怎麼換算成 `archive_timeout` 與備份頻率;誤刪整張表的實際救援流程——接 `[[pg-wal]]`、`[[sre-production-readiness]]`;**素材**:當年自動備份與 **PITR 都開著,但從來沒拿它還原過**——「開了 PITR」與「能還原」之間隔著一次演練,這篇的反思就是這句 | ⬜ ★ |

## 幕一 · 第三批 — 生產現場:連線、參數、監控、長大

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 8 | `pg-connections` | 一個連線就是一個 process:連線池怎麼救你 | **【看不見的帳】** process model 的成本(記憶體 + context switch),`max_connections` 開大不是解法;**PgBouncer 三種模式**(session / transaction / statement)與各自不能用的東西(prepared statement、advisory lock、`SET`);應用端 pool 與 PgBouncer 疊起來的乘法陷阱;連線風暴長什麼樣——接 `[[rezero-flash-crowd]]`(尖峰把單一 process 打爆的真實現場)、`[[sre-cascading-failures]]`;**素材**:走 **Cloud SQL Proxy**、沒有 PgBouncer;4 台 API + 三種 Celery 容器各自連,**沒人算過總連線數**——沒爆是運氣還是規格夠大,重來會怎麼算 | ⬜ |
| 9 | `pg-tuning` | 記憶體與參數:先量,再調 | **【看不見的帳】** `shared_buffers` 與 OS page cache 的雙層快取;**`work_mem` 是「每個連線、每個排序節點」——最容易乘出 OOM 的參數**;`effective_cache_size` 只是給 planner 的提示不是配額;`maintenance_work_mem` 影響 vacuum/建索引速度;調參前先量(`EXPLAIN (ANALYZE, BUFFERS)`、`pg_stat_statements`);**起手值 + 量測方式,不給神奇數字**——接 `[[sql-explain]]`、`[[pg-monitoring]]`;**素材**:8 core Cloud SQL 是**拍腦袋決定的**,沒做容量規劃、事後也沒回頭檢討(數字後來在 `[[rezero-saas]]` 的 Fermi 估算被當錨點) | ⬜ |
| 10 | `pg-monitoring` | 該盯哪些指標:`pg_stat_*` 家族導覽 | **【誰來打掃】** 四張最有用的表(`pg_stat_activity` 誰在跑、`pg_stat_statements` 誰最貴、`pg_stat_user_tables` 誰在膨脹、`pg_stat_replication` 落後多少);**cache hit ratio 99% 不代表健康**(最常見的假指標);慢查詢日誌與 `auto_explain`;把上面四張表接成告警(接 `[[obs-metrics-prometheus]]`、`[[sre-monitoring]]` 的四黃金訊號);扣回主軸:**監控就是在看「打掃的人有沒有追上」**;**素材**:當年 DB 這層只有 **GCP 內建儀表板、有事才去看**,沒有專屬告警;錯誤感知全靠 Sentry(`[[rezero-ops]]`)——「有事才看」的儀表板本質上是事後報告,不是監控 | ⬜ ★ |
| 11 | `pg-partitioning` | 分割表:什麼時候該切、怎麼切才不後悔 | **【邊界 + 看不見的帳】** 宣告式分割(range/list/hash)與 partition pruning 的條件(pruning 沒中就是全掃);**分割鍵選錯比不切還糟**(跨分割查詢、全域唯一約束做不到);時序資料最大的甜頭=**保留策略變成 `DROP TABLE`,不再是刪不完的 DELETE**(直接呼應 #3:DELETE 製造 dead tuple,DROP 不會);和索引/外鍵的互動;**先問「你是資料量大,還是查詢模式錯」**——接 `[[sql-index]]`、`[[ddia-partitioning]]`(分散式分片是另一回事)、`[[pain-before-power]]`;**素材**:fb message 事實層大表**一直長,沒刪也沒切**;「有想過總有一天要做 archive 歸檔,但沒等到那一天」——這句話本身就是這篇的開場 | ⬜ |
| 12 | `pg-upgrade` | 版本升級與 extension 管理:別讓資料庫變成不敢動的地方 | **【誰來打掃】** 小版本 vs 大版本升級的差別;`pg_upgrade`(停機短、要演練)vs 邏輯複寫升級(近乎零停機、限制多);extension 的版本與相容性;升級前的檢查清單與回退計畫;**「不敢升級」的代價是複利**——接 `[[sre-production-readiness]]`、`[[iac-test-deliver]]`(把變更安全送進正式環境的通則) | ⬜ |

## 幕二 — 招牌功能與擴充:能做,不等於該做

幕二把幕一的成本模型套到 PG 的「全能」上。**每篇都要回答同一個問題:這件事 PG 做得到,但你的規模與團隊該不該讓它做?** 這幕的三篇原本掛在 `SQL 我以為我懂` 第五幕(`sql-jsonb`、`sql-upsert`、`sql-skip-locked`,皆未動筆),2026-08-27 決定移到這裡——它們是 **PG 專屬能力**,不是通用 SQL;SQL 第五幕已同步標註。

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 13 | `pg-jsonb` | JSONB:半結構化也能查得快,但別當逃生門 | **【邊界】** `json` vs `jsonb` 的差別;`->` / `->>` / `@>` 與 GIN 索引(以及 GIN 的維護成本);**更新一個小欄位=整個 jsonb 重寫**=dead tuple 大戶(接回 `[[pg-vacuum]]`);什麼時候該用(真的不定形、外部 payload 原樣留存)、什麼時候是在逃避建模(接 `[[ddia-data-models]]`);混合設計:熱欄位拉出來當 column、其餘丟 jsonb | ⬜ ★ |
| 14 | `pg-fulltext` | 全文檢索:什麼時候一張表就夠,什麼時候該上搜尋引擎 | **【邊界】** `tsvector` / `tsquery` / `to_tsvector` 的模型、GIN 索引、排名與 highlight;**中文分詞是這條路的真正門檻**(內建 parser 不切中文,要外掛);夠用的情境(站內搜尋、後台查詢)vs 該上 Elasticsearch 的訊號(相關性調校、聚合、規模);少一套要維運的東西本身就是價值——接 `[[pain-before-power]]`;**素材**:當年後台搜尋是 **Django ninja filter 組出來的 `LIKE` / `icontains` 硬查**,沒上搜尋引擎——正好對照「什麼時候一張表就夠」 | ⬜ |
| 15 | `pg-as-queue` | 用 PostgreSQL 當工作佇列:SKIP LOCKED 與冪等寫入 | **【邊界 + 看不見的帳】** `SELECT … FOR UPDATE SKIP LOCKED` 讓多 worker 各搶各的(圖:同一張表、互不阻塞);`INSERT … ON CONFLICT DO UPDATE` 的冪等寫入與唯一約束設計;**佇列表是 vacuum 的經典受害者**——高頻 insert/delete 製造大量 dead tuple,這篇把幕二縫回 #3;什麼時候一張表就夠(單庫、量不大、要跟業務交易同進同出)、什麼時候該上 Kafka/Redis(接 `[[kafka-intro]]`、`[[redis-pubsub-stream]]`、`[[airflow-reliability]]` 的冪等那條線);**素材**:當年佇列走 **RabbitMQ + Celery**,沒想過用 DB 當佇列——這篇的誠實面:已經有 broker 的團隊為什麼不需要這條路,以及什麼情況反過來成立 | ⬜ ★ |
| 16 | `pg-extensions` | Extension 生態:PostGIS、pgvector 與「PG 什麼都能做」的邊界 | **【邊界】** extension 機制本身(它憑什麼能塞進資料庫、升級與相容性怎麼管);代表性生態速覽(PostGIS 空間、pgvector 向量、TimescaleDB 時序、pg_partman 自動分割、pg_stat_statements 早就在用);**判準:多一個 extension = 多一份升級與維運相依**,先問「這個需求會不會長大成需要專用系統」;系列收尾——把兩幕串回主軸:PG 的擴充能力讓你晚一點才需要第二套系統,但那筆帳(打掃、升級、監控)從第一天就開始計 | ⬜ |

★ = 骨架 / 最高投報(1、2、3、4、5、7、10、13、15)。邊寫邊發:`draft: true` → `false`。`seriesOrder` = 寫作順序。

## 建議閱讀順序
1. **引擎地基**(1→2→3→4):一條因果鏈——MVCC 留下舊版本 → autovacuum 負責清 → 長交易讓它清不動。這四篇沒讀,後面的維運題都只是背指令。
2. **寫入路徑**(5→6→7):WAL 一份三用;先懂 WAL,複寫與 PITR 就是同一件事的兩種消費方式。**#6 結尾的「複寫不是備份」直接接 #7**。
3. **生產現場**(8→9→10→11):連線、記憶體、監控、長大;#10 是這批的軸——前面每一篇的帳,最後都要在某張 `pg_stat_*` 上看得到。
4. **幕二**(13→15→14→16):想從最實用的開始就先 13 與 15;14 依需求挑;16 收尾。
5. 想補**查詢層**的心智模型(執行順序、索引失效、`EXPLAIN`、隔離層級定義),隨時轉去 `SQL 我以為我懂`——兩個系列是同一個 PG 的兩張臉。

## 開新系列的落地檢查清單(第一篇發布時一起做)
1. `src/data/series.ts` — 加 `{ slug: 'pg', name: 'PostgreSQL 學習筆記', blurb, color }`(`name` 與 front matter 一字不差)。
2. `src/components/Graph.jsx` — `SERIES` 加 `['PostgreSQL 學習筆記', '<色碼>', 'PG']`(色碼避開既有 13 色;PG 屬 Infrastructure 那層,可取琥珀系的鄰近色)。
3. `src/pages/start.astro` — 放進 **Infrastructure 層**的 `groups`:`sGroup('pg', '關聯式資料庫 · ')`(與 `sGroup('sql')` 分屬不同層是刻意的:SQL 在 Domain,PG 在 Infra)。
4. roadmap 該篇狀態改 `✅ 已發布`。
5. `npm run build` 驗證。

## 寫每篇時的慣例
- front matter:`series: "PostgreSQL 學習筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`postgresql` + 該篇主題(如 `database`、`mvcc`、`replication`、`backup`、`performance`、`operations`、`jsonb`)。**不要用 `sql` 當主 tag**,那是 SQL 系列的;兩系列各自的 tag 頁才不會糊在一起。
- 依 `.claude/skills/writing-blog-post`:一張招牌深色 SVG + 比官方文件更清楚的摘要 + 一段真實反思。
- SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號;figcaption 內不放 `[[wikilink]]`,要連結用 `<a href>`。
- 台灣用語(見 `docs/zh-tw-style-guide.md`;資料/函式/欄位/索引 等保留不換)。
- **每篇附可貼進 psql 的最小片段 + 一條能在自己庫上跑的診斷**(見〈每篇的範例與圖〉);版本基準 PG 16+。
- **貫穿主軸**:每篇結尾扣回「**每一次寫入都有第二筆帳;能做不等於該做**」,並確認這篇服務的是 **【看不見的帳】/【誰來打掃】/【邊界】** 哪一項(表格的 **【】** 標記就是這個用途)。
- **守住與 SQL 系列的線**:寫到索引失效、`EXPLAIN` 讀法、隔離層級定義就停手,連過去 `[[sql-index]]`、`[[sql-explain]]`、`[[sql-transactions]]`。
- **cross-link 是重點**:查詢層 ↔ SQL 系列;原理 ↔ `[[ddia-storage-engines]]`、`[[ddia-replication]]`、`[[ddia-transactions]]`、`[[ddia-partitioning]]`;可靠度與演練 ↔ `[[sre-data-pipelines]]`、`[[sre-production-readiness]]`、`[[sre-monitoring]]`、`[[sre-consensus]]`;監控落地 ↔ `[[obs-metrics-prometheus]]`;對照組 ↔ `[[redis-persistence]]`、`[[redis-replication]]`、`[[kafka-intro]]`;實戰 ↔ `[[rezero-inventory]]`、`[[rezero-flash-crowd]]`、`[[rezero-reconciliation]]`、`[[rezero-asset-lifecycle]]`;量級判準 ↔ `[[pain-before-power]]`。
- Git:開 branch → push → PR,不直接動 master(CLAUDE.md 硬規矩)。

## 當年實際做法(作者口述;2026-08-28 訪談,寫每篇前先回來對照)

**規矩同 rezero roadmap:當年這一聲部必須是真的,不能腦補。** 沒問到的欄位就寫「未確認」,動筆時再補訪談。

**環境與連線**
- **Google Cloud SQL for PostgreSQL**,實例 **8 core**(數字已在 `[[rezero-saas]]` 的 Fermi 成本估算當錨點);**規格是拍腦袋決定的**,沒做容量規劃,事後也沒回頭檢討。
- 應用走 **Cloud SQL Proxy / Auth Proxy** 連,**沒有 PgBouncer 或任何自建 pooler**。
- 4 台 API + 三種 Celery 容器(heartbeat / 抓留言單 worker / async 10 workers,見 `[[rezero-ops]]`)各自開連線,**當年沒人算過總連線數**。
- PG 版本、read replica、是否經歷過大版本升級:**未確認**(下次訪談補)。

**維運(或者說,沒有維運)**
- 作者原話:**「當時用 Google Cloud SQL,好像沒什麼維運。」**——這句是幕一好幾篇的開場,不是沒東西可寫。
- **備份**:自動備份與 **PITR 都有開**,但**從來沒拿來還原過**;備份保留天數等設定細節未確認。
- **打掃**:作者原話「**打掃我不確定他們有沒有做**」。事實面(待逐篇查證後寫進文章):autovacuum 是 PostgreSQL 自己的背景 worker、跑在實例內、預設開啟,**Cloud SQL 管的是機器/備份/修補/failover,不代勞 vacuum**;**Cloud SQL 是否調整過 autovacuum 預設參數 = 待查證**。當年沒爆,合理推測是工作負載落在預設參數扛得住的範圍內——這個「為什麼沒出事」比「有人幫我做」更值得寫。
- **監控**:DB 這層只有 **GCP 內建儀表板,有事才去看**,沒有 DB 專屬告警;錯誤感知靠 Sentry(`[[rezero-ops]]` 的「模模糊糊的 Sentry」)。
- **DB 層事故**:**沒踩過大事**。事故都在應用層或外部服務。

**Migration 與大表**
- **表設計上就避免大量 migration**——作者歸因於**堅持第三正規化**的紅利(同 `[[rezero-reconciliation]]`「同一事實只存一份」那條線)。
- CI/CD **自動跑 migration,沒出過事**;**但卡過一次**:對**事實層大表(fb message table)加欄位**——不是作者寫的,但他知道這件事;之後**學會選離峰時段跑**。
- fb message 這種事實層大表**一直長,沒刪也沒切**;作者原話:**「有想過總有一天要做 archive 歸檔,但沒等到那一天。」**

**鎖與交易(★ 全系列最獨家的一條)**
- 扣庫存用 **Serializable + 噴錯重試**(見 `[[rezero-inventory]]`),**序列化失敗常發生,但吞吐吐得出來**,結果可接受。
- **但**:fb message → cart item 的處理**有時因為鎖就放棄、那筆單被略過**——序列化失敗、**重試用完就丟**。
- **這件事是作者跟播時自己觀察到的,沒有其他人知道。** 這條線同時扣三個地方:`[[rezero-comment-order]]`(處理失敗直接略過、該使用者的單無聲消失)、`[[rezero-ops]]`(**聽主播是最靈敏的告警**——這次是「看儀表板的人」本人)、`[[pg-monitoring]]`(**沒有指標的失敗,只能靠有人剛好在看**)。
- deadlock、`idle in transaction`、交易裡呼叫外部 API:**未確認**(下次訪談補)。

**幕二題目當年的實況**
- **JSONB**:作者原話「**當時還沒走到 SaaS,有想法但沒用上**」(此句對應 JSONB / 多租戶彈性欄位的想法,指涉範圍動筆前再確認一次)。
- **搜尋**:後台搜尋是 **Django ninja 的 filter 組合出來的 `LIKE` / `icontains` 硬查**,沒有全文檢索、沒上 Elasticsearch;作者自評當時「有點不確定怎麼做,應該也是用 Django ORM 調整」。
- **佇列**:走 **RabbitMQ + Celery**,**沒想過用 DB 當佇列**。
- **分割表 / 保留策略**:沒做(見上「大表一直長」)。

## 素材對照:哪幾篇有第一手、哪幾篇是重來版

| 篇 | 第一手強度 | 說明 |
|---|---|---|
| #4 `pg-locks` | ★★★ | 跟播發現的「因鎖被略過」是獨家料,全系列最強的一段 |
| #7 `pg-backup-pitr` | ★★★ | 「開了 PITR、從沒還原過」——誠實面就是賣點 |
| #10 `pg-monitoring` | ★★★ | 「有事才去看的儀表板」+ #4 的漏單:沒有指標的失敗只能靠人剛好在看 |
| #3 `pg-vacuum` | ★★ | 「不確定 Google 有沒有幫我打掃」是好開場,但沒踩過 bloat,結論要靠推理與查證 |
| #8 `pg-connections` | ★★ | Cloud SQL Proxy、沒 pooler、沒算過連線數;沒爆過,寫「為什麼沒爆」 |
| #11 `pg-partitioning` | ★★ | 大表沒切沒刪、「沒等到那一天」 |
| #9 `pg-tuning` | ★★ | 拍腦袋開 8 core,重來會怎麼估(接 `[[rezero-saas]]` 的 Fermi) |
| #14 `pg-fulltext` / #15 `pg-as-queue` | ★★ | 都是「當年沒選它」的對照,誠實面充足 |
| #1 #2 #5 #6 #12 #13 #16 | ★ | 以機制講解為主,反思寫**重來版**與托管視角;別硬掰第一手 |

**寫作紀律**:★ 少的篇不要假裝有戰史;**「當年沒感覺,因為有人幫我做了 / 因為量沒到」本身就是誠實且有價值的反思**,比虛構的踩坑好。

## 仍待補的訪談題(下次一次問完)
- PG 版本、有沒有經歷大版本升級、read replica 有沒有開。
- 備份保留天數、PITR 視窗設多長、誰設定的。
- 有沒有碰過 deadlock(不只序列化衝突)、`idle in transaction`、交易裡包外部 API 呼叫。
- 「因鎖被略過」的量級:一場直播大概幾筆?有沒有留下數字或 log 可佐證?(有數字的話這篇的說服力再翻一倍)
- 幕二候補(暫不排篇):range type 與排除約束(檔期不重疊,可扣 `[[rezero-cart-order]]`)、`pg_cron`(對照 `[[sre-cron]]`)、邏輯複寫做 CDC(對照 `[[kafka-ecosystem]]` 的 Connect)。

## 修訂紀錄
- **2026-08-28**:完成作者訪談(Cloud SQL、備份與 PITR、鎖與略過的單、migration、幕二實況),口述記入〈當年實際做法〉,並回填到各篇主題欄與〈素材對照〉;護城河改寫為「托管時代使用者的第一手視角」。
- **2026-08-27**:建立本 roadmap。與作者討論後定案走**兩幕合一**(引擎維運 + 功能擴充,共 16 篇)。`SQL 我以為我懂` 第五幕的 `sql-jsonb` / `sql-upsert` / `sql-skip-locked`(皆未動筆)移入本系列幕二,合併為 `pg-jsonb` 與 `pg-as-queue`;SQL roadmap 已同步標註。
