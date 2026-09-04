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

## B. 通用技術詞 → 看 `docs/ubiquitous-language.md`

**跨系列共用詞的單一真相在 `docs/ubiquitous-language.md`(全站術語表)。**
那張表的英文欄就是這裡原本 B 區的內容,而且多了「避免」欄(中國用語變體),
所以中文寫作與英文翻譯查同一張表,不會分岔。

翻譯時特別注意那份的 **§1 一律寫英文**:原文裡的 Production、throughput、backlog、
backpressure、fan out 本來就是英文,**照抄不要動**。

## C. 各系列專有名詞 → 看該系列的 roadmap

**這裡不放系列術語,唯一權威在 `docs/<key>-series-roadmap.md` 的〈術語表(Ubiquitous Language)〉。**

那張表在系列規劃時就開,中英兩欄一起填(見 `writing-series-roadmap` skill 第 6 段),所以:

- 寫中文時它保證同一個概念在第 3 篇與第 11 篇同名;
- 翻譯時直接照抄英文欄,不用回頭猜作者當初想講什麼;
- 讀書筆記的英文欄是**原書用字**,寫作當下記下來的,不是事後回譯。

翻譯時遇到表上沒有的術語,**補回該系列的 roadmap**,不要只寫進譯稿或抄到這裡 —— 兩份表會分岔。

只有**跨系列共用**的通用詞才留在本文件 B 區。

## D. 修正記錄(append-only)

作者每次糾正英文用詞 / 語氣就追加一列;通用的同步補進 B 區表。

| 日期 | 原(AI 翻的) | 改(偏好) | 類型 |
|---|---|---|---|
| *(待補)* | | | |
