# Data Quality Fundamentals 讀書筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Data Quality Fundamentals 讀書筆記"`。
書:*Data Quality Fundamentals: A Pragmatic Guide to Building Trustworthy Data Pipelines*(Barr Moses、Lior Gavish、Molly Vorwerck;Monte Carlo 團隊,O'Reilly 2022)。

定位:**把 SRE 那套可靠度學問「搬到資料上」的專書**。SRE 讓「服務不掛」變成有指標、有預算的工程;這本讓「資料不爛」變成同一種工程——核心概念是 **data observability(資料可觀測性)**:用監控、異常偵測、lineage,在使用者發現之前抓到資料出事。它是 App 測試書不談的那一塊(程式對、但輸入資料是活的且會背叛你),也是我最貼身的主場。

**跟既有系列的關係(這就是最大差異化)**:
- **SRE 系列**是它的孿生兄弟——`sre-data-pipelines`(有備份≠能還原、深度防禦)、`sre-monitoring`(四黃金訊號)、`sre-slo`(SLI/SLO)、`sre-incident-response`/`sre-postmortem`,幾乎每篇都能一對一扣回去。原則:**SRE 講「服務」的可靠度,這系列講「資料」的可靠度,兩邊互相 cross-link、不重複同一套定義**。
- **FoDE / Airflow / DDIA**:pipeline 冪等可重跑 ↔ `airflow-scheduling`;資料生命週期 ↔ FoDE;可靠性原理 ↔ `ddia-reliable-scalable`。
- **工具**:資料測試落地 = dbt tests / Great Expectations / Soda——概念在系列裡談,實作當補充。

一章一~兩篇,共 10 篇。★ = 最高價值、圖最好畫、cross-link 最密的五篇(1、2、3、4、7)。邊讀邊寫:寫好一篇 → `draft: true` 改 `false` 發佈。`seriesOrder` = 寫作優先序。

## 第一批 — 核心觀念(先寫,投報率高)

| # | slug | 對應章 | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `dq-intro` | Ch 1 | 為什麼資料品質「現在」才爆紅:**data downtime(資料下線)** 的成本、garbage in→garbage out 在 analytics/AI 時代被放大;為何 DE 需要一套**獨立於 App 測試**的可靠度學問(程式沒 bug,資料照樣爛) | ⬜ ★ |
| 2 | `dq-five-pillars` | Ch 4, 5 | data observability **五大支柱**:Freshness(新鮮度)/ Volume(量)/ Schema / Distribution(分布)/ Lineage(血緣)——對照 SRE 四黃金訊號,系列的招牌概念 | ⬜ ★ |
| 3 | `dq-testing-vs-monitoring` | Ch 3, 4 | **資料測試 vs 資料監控**:測試抓「已知的壞」(寫死斷言,dbt/GX)、監控+異常偵測抓「未知的壞」;known vs unknown unknowns;接回 GX vs integration test 的分野 | ⬜ ★ |
| 4 | `dq-slo-for-data` | Ch 5 | 幫**資料**訂 SLA / SLI / SLO:把「資料可靠度」變成一級目標與可量測承諾——直接接 `[[sre-slo]]` | ⬜ ★ |

## 第二批 — 架構與維運

| # | slug | 對應章 | 主題 | 狀態 |
|---|---|---|---|---|
| 5 | `dq-anomaly-detection` | Ch 4 | 異常偵測怎麼做:規則/閾值 vs ML-based、季節性與趨勢、誤報與**告警疲勞**的取捨——接 `[[sre-alerting-oncall]]` | ⬜ |
| 6 | `dq-architecting` | Ch 2, 5 | 可靠資料系統的建構塊(倉/湖、ingestion、catalog)、data observability 平台、**build vs buy**——接 FoDE 生命週期 | ⬜ |
| 7 | `dq-incident-management` | Ch 6 | 資料事件管理:偵測 → 影響評估 → 根因 → 修復;大規模下的 RCA 與 blameless——接 `[[sre-incident-response]]`、`[[sre-postmortem]]` | ⬜ ★ |
| 8 | `dq-lineage` | Ch 7 | 端到端 **lineage(血緣)**:上游一改、下游哪些會爆(影響分析);出事時沿著血緣快速定位根因 | ⬜ |

## 第三批 — 組織與文化(最後)

| # | slug | 對應章 | 主題 | 狀態 |
|---|---|---|---|---|
| 9 | `dq-democratizing` | Ch 8 | 把資料品質變成**全公司的事**:所有權、data mesh、**data contract(資料契約)**、資料品質文化——接架構/Tech Leader 系列 | ⬜ |
| 10 | `dq-real-world-future` | Ch 9, 10 | 真實案例與未來:data discovery、trust 的量化、資料可靠度的下一步 | ⬜ |

★ = 投報率最高(1、2、3、4、7)。第一批四篇是地基,優先寫;第二、三批依興趣調順序。

## 寫每篇時的慣例
- front matter:`series: "Data Quality Fundamentals 讀書筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`data-quality` + `data-engineering` + 該篇主題(如 `observability`、`testing`、`monitoring`、`incident`、`lineage`)。
- 依 `.claude/skills/writing-blog-post`:摘要比原書更清楚(提煉成模型/對照)+ 一段真實反思(DE 視角);台灣用語(見 `docs/zh-tw-style-guide.md`)。
- 每篇一張以上站台深色 SVG(SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號;figcaption 內不要放 wikilink)。
- **最大差異化 = cross-link**:每篇都把「資料的可靠度」扣回 SRE「服務的可靠度」——五支柱 ↔ `[[sre-monitoring]]` 黃金訊號;資料 SLO ↔ `[[sre-slo]]`;異常告警 ↔ `[[sre-alerting-oncall]]`;資料事件/RCA ↔ `[[sre-incident-response]]`、`[[sre-postmortem]]`;「有備份≠能還原」/ 深度防禦 ↔ `[[sre-data-pipelines]]`;pipeline 冪等 ↔ `[[airflow-scheduling]]`;可靠性原理 ↔ `[[ddia-reliable-scalable]]`。
