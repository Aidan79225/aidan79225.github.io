# Redis 學習筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Redis 學習筆記"`。

定位:**打破「Redis = 快取」的誤解**。Redis 的本質是一台**記憶體資料結構伺服器(in-memory data structure server)**——快取只是它最出名的一個用法。這系列要把四個「以為懂其實沒懂」的地方講到骨子裡:**為什麼單執行緒還這麼快、資料結構怎麼選才對、掛了資料到底會不會丟、怎麼擴展成叢集(cluster)**。每篇一張招牌深色 SVG + 一段後端視角的反思。

邊學邊寫:寫好一篇 → `draft: true` 改 `false` 發佈。草稿狀態不出現在系列盒(走 `getPublishedPosts()`),`npm run dev` 看得到。跨篇 / 跨系列用 `[[slug]]` 互連。`seriesOrder` = 寫作順序。

## 第一批 — 核心地基(先寫,優先)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `redis-intro` | Redis 是什麼:不只是快取,是記憶體資料結構伺服器 | 定位(打破「只是 cache」);value 是資料結構(vs memcached blob);為什麼快=記憶體 + 單執行緒免鎖 + I/O 多工(epoll);擅長/不擅長、熱資料層非主 DB | ✅ 已發布 |
| 2 | `redis-data-structures` | Redis 的靈魂:五大資料結構 + 進階武器 | String/List/Hash/Set/ZSet 招牌場景(ZSet 皇冠:排行榜/延遲佇列 score=時間);進階 Bitmap/HLL(12KB 估上億 UV)/Geo/Stream;心法=先看操作再選結構 | ✅ 已發布 |
| 3 | `redis-single-thread` | 單執行緒為什麼還這麼快?——以及 O(N) 命令的地雷 | 瓶頸非 CPU 是記憶體/網路;event loop + epoll、無鎖無 race 天生原子;Redis 6 多執行緒只在網路 I/O、執行仍單執行緒;KEYS*/大 HGETALL 卡全場 → SCAN 分批、UNLINK、SLOWLOG、看複雜度 | ✅ 已發布 |
| 4 | `redis-persistence` | 持久化:RDB 快照 vs AOF 日誌,資料到底會不會丟 | RDB 快照(小/載入快/會丟)vs AOF 日誌(fsync always/everysec/no 光譜);混合模式;fork + COW 與記憶體暴增坑;持久性↔效能↔重啟三角;誠實結論:非金融級、是加速層非真相來源 | ✅ 已發布 |

## 第二批 — 快取實戰(後端最實用)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 5 | `redis-expiration-eviction` | 過期與淘汰:TTL、惰性刪除與 maxmemory 政策 | 過期(惰性+定期抽樣、過期≠立刻釋放、replica 等 master DEL)vs 淘汰(maxmemory 撞頂);8 種政策矩陣 allkeys/volatile × LRU/LFU/random/ttl + noeviction 報錯;近似 LRU;純 cache vs 存重要資料怎麼選 | ✅ 已發布 |
| 6 | `redis-cache-patterns` | 快取三大災難:穿透、擊穿、雪崩,與正確解法 | cache-aside;三災難本質=打 DB 的請求為何集中(不存在/一個熱點/一大片);解法空值快取+布隆、互斥鎖收斂、隨機 TTL 打散;共通精神=消除同步性——扣回 `[[sre-cron]]` 驚群、`[[sre-cascading-failures]]` | ✅ 已發布 |
| 7 | `redis-distributed-lock` | 分散式鎖:從 SETNX 到 Redlock,與那場著名的爭議 | `SET NX PX` + TTL、Lua 驗 owner 才釋放;TTL 鎖的致命假設(GC pause 破互斥)+ fencing token;Redlock N 台過半 + Kleppmann vs antirez 辯論;效率鎖 vs 正確性鎖的分野——接 `[[sre-consensus]]`、`[[zookeeper]]`、`[[redis-cluster]]` | ✅ 已發布 ★ |

## 第三批 — 高可用與擴展(含 Cluster)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 8 | `redis-replication` | 主從複製:讀寫分離與複製延遲 | 一主多從拓撲、非同步複製(快但會丟/延遲)、replica 只讀+讀擴展、複製延遲的怪現象(read-your-writes 破功→分類讀)、WAIT/min-replicas、PSYNC 部分重同步(offset+backlog)——扣回 DDIA replication;`REPLICAOF`/`INFO replication` | ✅ 已發布 |
| 9 | `redis-sentinel` | 高可用:Sentinel 怎麼自動故障轉移 | 五步 failover(監控→SDOWN→ODOWN 過半→選 leader 挑 replica 升主→通知)、SDOWN vs ODOWN、為何要過半(quorum 判定 + 全體過半選 leader、防 split-brain)、Sentinel-aware client 服務發現;偵測比切換難、Sentinel 解可用性 vs Cluster 解容量——接 `[[sre-consensus]]`、`[[redis-replication]]`、`[[redis-cluster]]` | ✅ 已發布 |
| 10 | `redis-cluster` | Redis Cluster:16384 個 slot 怎麼分片與擴縮 | hash slot(16384)、key→slot(CRC16)、資料分片;`MOVED`/`ASK` 重定向;multi-key 限制與 hash tag `{}`;gossip 協定;擴縮容的 slot 遷移;**redis-cli --cluster create/reshard/rebalance/del-node/check + CLUSTER INFO/NODES/SLOTS/KEYSLOT 各種操作** | ✅ 已發布 ★ |
| 11 | `redis-pipeline-transaction` | 管線、事務與 Lua:省 RTT 與原子性 | 三者解不同問題:pipeline 省 RTT(不原子)、MULTI/EXEC 一起執行不被插隊(不能 rollback、非 ACID)、WATCH 樂觀鎖 CAS、Lua 原子+帶邏輯(讀了再判斷再寫,MULTI 做不到);把邏輯搬到資料旁——接 `[[redis-single-thread]]`、`[[redis-distributed-lock]]`、`[[sql-transactions]]`、`[[infra-spark]]` | ✅ 已發布 |
| 12 | `redis-pubsub-stream` | Pub/Sub vs Stream:Redis 版的訊息系統 | Pub/Sub(fire-and-forget、離線漏、無 ack)vs Stream(append log、可重播、consumer group + XACK + PEL 重送 = 縮小版 Kafka);何時該直接上 Kafka(規模/保留/fan-out/生態);收尾回扣「不只是快取」——接 `[[kafka-intro]]`、`[[infra-kafka]]`、`[[infra-rabbitmq]]`、`[[redis-intro]]` | ✅ 已發布 |

★ = 投報率最高、圖最好畫(1、2、3、6、7、10)。第一批四篇是地基,優先寫;第二批最貼後端日常;第三批 Cluster 是重頭戲。

## 術語表(Ubiquitous Language)

工具系列:API 名稱、設定鍵、CLI 參數**一律不譯**(照原文寫)。這張表管的是「用中文寫的那些概念」怎麼統一。

全系列同一個概念只准一個中文寫法;英文欄是翻譯時直接照抄的來源。
寫到表上沒有的術語就補一列。跨系列共用的通用詞(快取、佇列、可觀測性)在
`docs/ubiquitous-language.md`(全站術語表),這裡只放本系列特有的。

| 中文用詞 | 英文 | 備註 |
|---|---|---|
| 鍵 | key | 內文多直接用 key |
| 過期 | expiration / TTL | TTL 不譯 |
| 逐出策略 | eviction policy | 不寫「淘汰策略」;`maxmemory-policy` 值照原文 |
| 持久化 | persistence | RDB / AOF 照原文 |
| 管線化 | pipelining | 省 RTT,與原子性是兩個問題 |
| 交易 | transaction | MULTI/EXEC;「別叫它 ACID」。⚠ **既有文章有 21 處寫成「事務」**(全站其餘一律「交易」),待一次清理 |
| 複寫 | replication | 與 DDIA 對齊,不寫「複製」 |
| 哨兵 | Sentinel | 內文多直接用 Sentinel;解可用性不解容量 |
| 叢集 | cluster | 不寫「集群」 |
| 槽 | slot | 16384 個固定 slot;CRC16 → slot → node |
| 故障轉移 | failover | 不寫「容災切換」 |
| 分散式鎖 | distributed lock | Redlock 照原文,爭議要一起講 |
| 串流 | Stream | Redis 的 Stream 型別,首字大寫以免與泛稱串流混淆 |
| 發布 / 訂閱 | Pub/Sub | 漏了也沒差的即時通知 |
| 寫時複製 | copy-on-write | fork + COW |

## 寫每篇時的慣例
- front matter:`series: "Redis 學習筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`redis` + 該篇主題(如 `cache`、`data-structures`、`distributed-systems`、`high-availability`)。
- 依 `.claude/skills/writing-blog-post`:摘要比官方文件更清楚(提煉成模型/對照)+ 一段真實反思;台灣用語(見 `docs/zh-tw-style-guide.md`)。
- 每篇一張以上站台深色 SVG(SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號;figcaption 內不要放 wikilink,要連結用 `<a href>`)。
- **cross-link 是重點**:分散式鎖 ↔ `[[sre-consensus]]`、`[[zookeeper]]`(Redlock vs 真共識);cache 雪崩/驚群 ↔ `[[sre-cron]]`、`[[sre-cascading-failures]]`;分片 slot ↔ Kafka partition、DDIA partitioning;持久化 fsync/WAL ↔ DDIA storage engines、SQL WAL;複製延遲 ↔ DDIA replication;Stream ↔ `[[kafka-intro]]`。
