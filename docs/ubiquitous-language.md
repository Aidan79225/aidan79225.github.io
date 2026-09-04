# 全站術語表(Ubiquitous Language)

內部文件(Astro 不會 build `docs/`)。**全站共用詞的單一真相**;寫中文、翻英文都查這裡。

四欄的意思:一個概念只准有**一個中文寫法**(中文用詞)、**一個英文寫法**(英文),
寫錯時最常寫成什麼(避免)寫在第三欄 —— 收稿前 grep 的就是那一欄。

分層:

| 範圍 | 放哪 | 誰維護 |
|---|---|---|
| **全站共用詞**(本檔) | `docs/ubiquitous-language.md` | 每次作者糾正就更新 |
| **單一系列特有詞** | `docs/<key>-series-roadmap.md` 的〈術語表〉 | 系列規劃時開,寫作中回填 |
| **系列名英譯** | `docs/en-translation-glossary.md` A 區 | 與 `src/data/series.ts` 的 `enName` 同步 |
| **語氣 / 中文寫作慣例** | `docs/zh-tw-style-guide.md` B、C 區 | — |
| **修正記錄(changelog)** | `docs/zh-tw-style-guide.md` D 區 | append-only,穩定後提升進本檔 |

---

## 1. 一律寫英文的詞

這些概念**全站固定寫英文**,不用中文譯法。英文詞前後留空格。

| 中文用詞 | 英文 | 避免 | 備註 |
|---|---|---|---|
| Production | Production | 生產環境 / 生產作業 / 生產系統 / 上生產 / 生產級 | 環境語意一律英文,視情況 Staging / Development。✅ 全站已無殘留 |
| throughput | throughput / High-throughput / Low-throughput | 吞吐 / 吞吐量 / 高吞吐 / 低吞吐 | 高低用連字號複合詞。⚠ **殘留 6 處**(`ai-incident-clock`、`responsibility-funnel`,含 SVG `<text>` 內) |
| backlog | backlog | 堆積 | queue 堆積 = backlog。⚠ **殘留 2 處**(`jenkins-multibranch`,含 SVG `<text>` 內) |
| backpressure | backpressure | 背壓 | 標題可首字大寫(Backpressure)。✅ 全站已無殘留 |
| fan out | fan out | 扇出 | DDIA 既有專有名 fan-out on read / write 保留原樣。✅ 全站已無殘留 |

> **注意**:SVG `<text>` 裡的字也算內文,收稿前掃描要一起掃 —— 目前的殘留有一半在圖裡。

## 2. 兩可 / 依語境 —— 不要無腦替換

**這一節是防止過度修正用的。** 看到這些詞不要當成錯誤。

| 中文用詞 | 英文 | 說明 |
|---|---|---|
| 數據 | data | 作者慣用,**不要換成「資料」**(2026-06-19 誤殺記錄) |
| 依賴 / 相依 | dependency | 兩者皆可,**不要互換**(2026-06-19 誤殺記錄) |
| 函式 / 函數 | function | 作者兩者皆用,不強制統一(2026-06-21) |
| 優化 / 最佳化 | optimize / optimization | ⚠ **懸而未決**:全站 優化 48 : 最佳化 37,風格指南開頭說「保留優化」但 A 區表又列「優化 → 最佳化」,自相矛盾。**待作者裁決**;在裁決前兩者皆可,別動既有文章 |
| 支持 / 支援 | support | 技術支援用「支援」(全站 28 次);「支持某觀點」用「支持」 |
| 通過 / 透過 | via / through / pass | 表手段用「透過」;「通過測試」「通過審查」用「通過」 |

## 3. 通用技術詞

| 中文用詞 | 英文 | 避免 | 備註 |
|---|---|---|---|
| 程式碼 | code | 代碼 | |
| 變數 | variable | 變量 | |
| 物件 | object | 對象 | |
| 預設 | default | 默認 | |
| 快取 | cache / caching | 緩存 | |
| 資料庫 | database | 數據庫 | |
| 伺服器 | server | 服務器 | |
| 回傳 | return | 返回 | |
| 元件 | component | 組件 | |
| 介面 | interface | 接口 | |
| 字串 | string | 字符串 | |
| 陣列 | array | 數組 | |
| 記憶體 | memory | 內存 | |
| 執行緒 | thread | 線程 | 與「行程」是兩件事,別混 |
| 行程 | process | 進程 | |
| 佇列 | queue | 隊列 | |
| 執行 | run / execute | 運行 | |
| 實作 | implement | 實現 | |
| 呼叫 | call | 調用 | |
| 並行 | concurrency | 並發 | 平行 = parallelism,兩個別混。⚠ **殘留 25 處**(`ddia-transactions` 為主,另有 `ddia-replication`、`ddia-streaming`、`redis-*`、`sre-cascading-failures`) |
| 平行 | parallelism | | 與「並行」(concurrency)刻意分開 |
| 非同步 | asynchronous / async | 異步 | |
| 整合 | integration | 集成 | |
| 相容 | compatible | 兼容 | |
| 效能 | performance | 性能 | |
| 函式庫 / 套件 | library / package | 庫 | |
| 套件 | package | 包 | |
| 專案 | project | 項目 | |
| 使用者 | user | 用戶 | |
| 設定 | configuration / config | 配置 | |
| 軟體 | software | 軟件 | |
| 硬體 | hardware | 硬件 | |
| 影片 | video | 視頻 | |
| 部落格 | blog | 博客 | |
| 品質 | quality | 質量 | |
| 資訊 | information | 信息 | |
| 網路 | network | 網絡 | |
| 映像檔 | image | 鏡像 | container image |
| 儲存庫 | repository | 倉庫 | repo |
| 註解 | comment | 註釋 | |
| 縮排 | indentation | 縮進 | |
| 欄位 | field / column | 字段 | |
| 叢集 | cluster | 集群 | |
| 螢幕 | screen | 屏幕 | |
| 滑鼠 | mouse | 鼠標 | |
| **檔案** | **file** | **文件** | ⚠️ **最大陷阱**:台灣「文件」= document;file 一律「檔案」 |

## 4. 資料 / 分散式

| 中文用詞 | 英文 | 避免 | 備註 |
|---|---|---|---|
| 分區 | partition | 分片 | sharding 只在提同義詞時出現;SQL 的 `PARTITION BY` 是另一件事 |
| 複寫 | replication | 複製 / 副本同步 | |
| 交易 | transaction | 事務 | 全站 113 : 21。⚠ **殘留 21 處全在 Redis 系列**(該系列自己也混用) |
| 一致性 | consistency | | |
| 隔離等級 | isolation level | 隔離級別 | |
| 冪等 | idempotent | | |
| 編排 | orchestration | | Airflow 語境;不是 arrangement |
| 重建 | rebuild / backfill | | 資料語境常是 backfill |
| 資料管線 | data pipeline | 資料管道 | |
| 資料湖 / 倉儲 | data lake / warehouse | | |
| 血緣 | lineage | 譜系 / 沿襲 | |
| 稽核 | audit | 審計 | |

## 5. 維運 / 可靠性

| 中文用詞 | 英文 | 避免 | 備註 |
|---|---|---|---|
| 維運 | operations / ops | 運維 | |
| 部署 | deployment | | |
| 回滾 | rollback | | |
| 灰度 / 漸進發布 | progressive rollout | | |
| 值班 / 待命 | on-call | | 內文多直接用 on-call |
| 告警 | alert / alerting | 報警 | 不是 warning |
| 事故 | incident | | 不是 accident |
| 事後檢討 | postmortem | 復盤 | |
| 可觀測性 | observability | | 與 monitoring 不可互換 |
| 節流 / 限流 | throttling / rate limiting | | |
| 熔斷 | circuit breaking | | |
| 重試 | retry | | |
| 退避 | backoff | | |
| 技術債 | technical debt | | |
| 護欄 | guardrail | 防護欄 / 圍欄 | |
| 驗收 | acceptance / sign-off | | |

---

## 待清理清單

合併兩張舊表時發現的既有不一致。都是**既有文章**的問題,不影響新文,可各自開 PR 清:

| 詞 | 殘留 | 集中在 | 規則出處 |
|---|---|---|---|
| 事務 → 交易 | 21 處 | Redis 系列(交易 4 : 事務 21,系列內部也混用) | 本檔 §4 |
| 並發 → 並行 | 25 處 | `ddia-transactions` 為主 + 5 篇 | 舊 A 區既有規則,一直沒執行 |
| 吞吐 → throughput | 6 處 | `ai-incident-clock`、`responsibility-funnel`(含 SVG) | 舊 D 區 2026-07-17 |
| 堆積 → backlog | 2 處 | `jenkins-multibranch`(含 SVG) | 舊 D 區 2026-07-17 |
| 優化 / 最佳化 | 48 : 37 | 全站 | **規則本身自相矛盾,待作者裁決** |
