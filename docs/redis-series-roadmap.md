# Redis 學習筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Redis 學習筆記"`。

定位:**打破「Redis = 快取」的誤解**。Redis 的本質是一台**記憶體資料結構伺服器(in-memory data structure server)**——快取只是它最出名的一個用法。這系列要把四個「以為懂其實沒懂」的地方講到骨子裡:**為什麼單執行緒還這麼快、資料結構怎麼選才對、掛了資料到底會不會丟、怎麼擴展成叢集(cluster)**。每篇一張招牌深色 SVG + 一段後端視角的反思。

邊學邊寫:寫好一篇 → `draft: true` 改 `false` 發佈。草稿狀態不出現在系列盒(走 `getPublishedPosts()`),`npm run dev` 看得到。跨篇 / 跨系列用 `[[slug]]` 互連。`seriesOrder` = 寫作順序。

## 第一批 — 核心地基(先寫,優先)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `redis-intro` | Redis 是什麼:不只是快取,是記憶體資料結構伺服器 | 定位(打破「只是 cache」);為什麼快=記憶體 + 單執行緒免鎖 + I/O 多工(epoll);擅長/不擅長、什麼時候別用 | ⬜ ★ |
| 2 | `redis-data-structures` | Redis 的靈魂:五大資料結構 + 進階武器 | String/List/Hash/Set/ZSet 各自的招牌場景(排行榜=ZSet、限流、佇列);進階:Bitmap/HyperLogLog/Geo/Stream | ⬜ ★ |
| 3 | `redis-single-thread` | 單執行緒為什麼還這麼快?——以及 O(N) 命令的地雷 | event loop + epoll;單執行緒免鎖、免 context switch;Redis 6 多執行緒 I/O(只多網路、命令仍單執行緒);`KEYS`/大集合阻塞全服務的坑 | ⬜ ★ |
| 4 | `redis-persistence` | 持久化:RDB 快照 vs AOF 日誌,資料到底會不會丟 | RDB(fork + copy-on-write 快照)vs AOF(append-only、fsync 策略)+ 混合模式;「記憶體=資料一定丟」的迷思;取捨 | ⬜ |

## 第二批 — 快取實戰(後端最實用)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 5 | `redis-expiration-eviction` | 過期與淘汰:TTL、惰性刪除與 maxmemory 政策 | 過期=惰性 + 定期刪除;淘汰=`maxmemory` + LRU/LFU/random/ttl 政策;當 cache 用時的記憶體管理 | ⬜ |
| 6 | `redis-cache-patterns` | 快取三大災難:穿透、擊穿、雪崩,與正確解法 | cache-aside;穿透(查不存在)/擊穿(hot key 過期)/雪崩(大量同時過期)+ 解法:空值快取、布隆過濾器、互斥鎖重建、隨機 TTL——扣回 `[[sre-cron]]` 驚群 | ⬜ ★ |
| 7 | `redis-distributed-lock` | 分散式鎖:從 SETNX 到 Redlock,與那場著名的爭議 | `SET NX PX` + TTL、鎖的釋放要用 Lua 驗 owner;Redlock 演算法 + Kleppmann vs antirez 的辯論;何時該用真共識——接 `[[sre-consensus]]`、`[[zookeeper]]` | ⬜ ★ |

## 第三批 — 高可用與擴展(含 Cluster)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 8 | `redis-replication` | 主從複製:讀寫分離與複製延遲 | 非同步複製、replica 只讀、複製延遲的怪現象、部分重同步(PSYNC)——扣回 DDIA replication | ⬜ |
| 9 | `redis-sentinel` | 高可用:Sentinel 怎麼自動故障轉移 | Sentinel 監控、客觀下線、選一個 Sentinel leader 主導 failover、通知客戶端;為何 Sentinel 也要過半 | ⬜ |
| 10 | `redis-cluster` | Redis Cluster:16384 個 slot 怎麼分片與擴縮 | hash slot(16384)、key→slot(CRC16)、資料分片;`MOVED`/`ASK` 重定向;multi-key 限制與 hash tag `{}`;gossip 協定;擴縮容的 slot 遷移 | ⬜ ★ |
| 11 | `redis-pipeline-transaction` | 管線、事務與 Lua:省 RTT 與原子性 | pipelining 省往返;`MULTI`/`EXEC` + `WATCH`(樂觀鎖);Lua 腳本的原子性;為什麼 Redis 事務不是真 ACID(不能 rollback) | ⬜ |
| 12 | `redis-pubsub-stream` | Pub/Sub vs Stream:Redis 版的訊息系統 | Pub/Sub(fire-and-forget、不持久)vs Stream(持久化 log + consumer group,像輕量 Kafka);跟 `[[kafka-intro]]` 對照、何時該直接上 Kafka | ⬜ |

★ = 投報率最高、圖最好畫(1、2、3、6、7、10)。第一批四篇是地基,優先寫;第二批最貼後端日常;第三批 Cluster 是重頭戲。

## 寫每篇時的慣例
- front matter:`series: "Redis 學習筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`redis` + 該篇主題(如 `cache`、`data-structures`、`distributed-systems`、`high-availability`)。
- 依 `.claude/skills/writing-blog-post`:摘要比官方文件更清楚(提煉成模型/對照)+ 一段真實反思;台灣用語(見 `docs/zh-tw-style-guide.md`)。
- 每篇一張以上站台深色 SVG(SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號;figcaption 內不要放 wikilink,要連結用 `<a href>`)。
- **cross-link 是重點**:分散式鎖 ↔ `[[sre-consensus]]`、`[[zookeeper]]`(Redlock vs 真共識);cache 雪崩/驚群 ↔ `[[sre-cron]]`、`[[sre-cascading-failures]]`;分片 slot ↔ Kafka partition、DDIA partitioning;持久化 fsync/WAL ↔ DDIA storage engines、SQL WAL;複製延遲 ↔ DDIA replication;Stream ↔ `[[kafka-intro]]`。
