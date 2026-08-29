# 英文翻譯詞彙表(EN Translation Glossary)

內部文件(Astro 不會 build `docs/`)。`translating-to-english` skill 指向這裡。
這是**活文件**:每翻一個新系列就把該系列的術語補進 C 區;作者每次糾正就追加到 D 區。

翻譯機制(檔案放哪、`translationOf`、fallback、OG)見 `docs/i18n.md`,這裡只管**用詞**。

## A. 系列名英譯(唯一權威)

`series:` 字串是分組鍵,**同系列每一篇必須一字不差**——打錯就把系列拆成兩個。
英文名同時登記在 `src/data/series.ts` 的 `enName`,所以英文文章的系列盒一樣能連到 `/start/#<slug>`。
**改這張表就要同步改 `series.ts`,反之亦然。**

| slug | 中文 `series:` | 英文 `series:` |
|---|---|---|
| `fode` | Fundamentals of Data Engineering 讀書筆記 | Fundamentals of Data Engineering — Reading Notes |
| `sql` | SQL 我以為我懂 | SQL: I Thought I Knew It |
| `ddia` | Designing Data-Intensive Applications 讀書筆記 | Designing Data-Intensive Applications — Reading Notes |
| `redis` | Redis 學習筆記 | Redis — Learning Notes |
| `kafka` | Kafka 學習筆記 | Kafka — Learning Notes |
| `spark` | Spark 學習筆記 | Spark — Learning Notes |
| `airflow` | Airflow 學習筆記 | Airflow — Learning Notes |
| `k8s` | Kubernetes 學習筆記 | Kubernetes — Learning Notes |
| `iac` | Infrastructure as Code 讀書筆記 | Infrastructure as Code — Reading Notes |
| `ansible` | Ansible for DevOps 讀書筆記 | Ansible for DevOps — Reading Notes |
| `infra` | 從 Infra 角度看資料工具 | Data Tools Through an Infra Lens |
| `sre` | Google SRE 讀書筆記 | Google SRE — Reading Notes |
| `obs` | Grafana LGTM 可觀測性 | Observability with the Grafana LGTM Stack |
| `rezero` | Re:從零開始做直播代購電商平台 | Re:Building a Live-Commerce Platform from Zero |
| `btl` | 成為 Tech Leader 讀書筆記 | Becoming a Tech Leader — Reading Notes |
| `ai-craft` | 帶 AI 的手藝(2026) | The Craft of Working with AI (2026) |
| *(未登記)* | Jenkins 學習筆記 | Jenkins — Learning Notes |

命名規則:`X 讀書筆記` → `X — Reading Notes`(讀一本書);`X 學習筆記` → `X — Learning Notes`(學一個工具);
其餘意譯,保住原標題的味道(`rezero` 的 `Re:` 是《Re:從零開始的異世界生活》的梗,英文照留)。

> **Jenkins 系列還沒登記進 `src/data/series.ts`**——中英文都拿不到 `/start/` 連結。
> 要補的話兩邊(`name` + `enName`)一起加。

## B. 通用技術詞:中 → 英

中文原文裡**已經是英文的技術詞照抄**(Production、throughput、backpressure、fan out、Error Budget…)——
`docs/zh-tw-style-guide.md` D 區規定這些一律寫英文,翻譯時不要再動它們。

以下是中文寫的技術詞回到標準英文(**不是**逐字直譯):

| 中文 | 英文 | 陷阱 |
|---|---|---|
| 快取 | cache / caching | |
| 佇列 | queue | |
| 陣列 | array | |
| 字串 | string | |
| 執行緒 / 行程 | thread / process | 兩個別搞混 |
| 記憶體 | memory | |
| 資料庫 | database | |
| 儲存庫 | repository | |
| 映像檔 | image | container image |
| 元件 | component | |
| 介面 | interface | |
| 函式庫 / 套件 | library / package | |
| 專案 | project | |
| 設定 | configuration / config | |
| 效能 | performance | |
| 並行 | concurrency | 平行 = parallelism,別混用 |
| 非同步 | asynchronous / async | |
| 相依 | dependency | |
| 稽核 | audit | |
| 重建 | rebuild / backfill | 資料語境常是 backfill |
| 編排 | orchestration | Airflow 語境;不是 arrangement |
| 分區 | partition | |
| 複寫 | replication | 不是 rewriting |
| 交易 | transaction | 不是 trading |
| 一致性 | consistency | |
| 隔離等級 | isolation level | |
| 值班 / 待命 | on-call | |
| 告警 | alert / alerting | 不是 warning |
| 事故 | incident | 不是 accident |
| 事後檢討 | postmortem | |
| 可觀測性 | observability | |
| 維運 | operations / ops | |
| 部署 | deployment | |
| 回滾 | rollback | |
| 灰度 / 漸進發布 | progressive rollout | |
| 冪等 | idempotent | |
| 節流 / 限流 | throttling / rate limiting | |
| 熔斷 | circuit breaking | |
| 重試 | retry | |
| 退避 | backoff | |
| 資料湖 / 倉儲 | data lake / warehouse | |
| 血緣 | lineage | |
| 資料管線 | data pipeline | |
| 技術債 | technical debt | |
| 護欄 | guardrail | |
| 驗收 | acceptance / sign-off | |

## C. 各系列專有名詞(逐系列補)

開一個新系列前,先把該系列反覆出現的術語定在這裡,之後每篇照抄。
**讀書筆記系列(fode / ddia / sre / iac / ansible / btl)最重要的一條:
術語要回到原書的英文用字,不是從中文再翻一次。**
例:DDIA 的「扇出」是書上的 *fan-out on write*;SRE 的「錯誤預算」是 *error budget*;
FoDE 的「資料工程生命週期」是 *the data engineering lifecycle*。翻之前先確認原書怎麼寫。

| 系列 | 中文 | 英文 | 出處 / 備註 |
|---|---|---|---|
| *(待補)* | | | |

## D. 修正記錄(append-only)

作者每次糾正英文用詞 / 語氣就追加一列;通用的同步補進 B 區表。

| 日期 | 原(AI 翻的) | 改(偏好) | 類型 |
|---|---|---|---|
| *(待補)* | | | |
