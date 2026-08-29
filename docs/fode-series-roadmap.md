# Fundamentals of Data Engineering 讀書筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Fundamentals of Data Engineering 讀書筆記"`。
書:*Fundamentals of Data Engineering*(Joe Reis & Matt Housley,O'Reilly 2022)。

邊讀邊寫:讀完一章就寫對應那篇。寫好一篇 → 把該篇 `draft: true` 改成 `false` 發佈。
草稿狀態的系列文在正式站上不會出現在系列盒(走 `getPublishedPosts()`),`npm run dev` 看得到。
跨篇可用 `[[slug]]` / `[[slug#段落]]` 互連,發佈後 backlinks 會自動長出來(重點:跨系列連回 Airflow / Spark / Kafka / dbt / Medallion 的實戰篇)。

| # | slug | 章 | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `fode-1` | Ch1 Data Engineering Described | 定義、DE 角色、A 型/B 型工程師、資料成熟度、需求金字塔 | ✅ 已發布 |
| 2 | `fode-2` | Ch2 The Data Engineering Lifecycle | 五階段(生成→儲存→攝取→轉換→服務)+ 六條 undercurrents | ✅ 已發布 |
| 3 | `fode-3` | Ch3 Designing Good Data Architecture | 架構原則、權衡、可逆決策、鬆耦合、棕地/綠地 | ✅ 已發布 |
| 4 | `fode-4` | Ch4 Choosing Technologies | build vs buy、OSS vs managed、成本/FinOps、位置 | ✅ 已發布 |
| 5 | `fode-5` | Ch5 Data Generation in Source Systems | 來源系統、DB、CDC、訊息佇列與串流 | ✅ 已發布 |
| 6 | `fode-6` | Ch6 Storage | 儲存抽象、warehouse / lake / lakehouse、運算與儲存分離 | ✅ 已發布 |
| 7 | `fode-7` | Ch7 Ingestion | batch vs streaming、push vs pull、ETL vs ELT | ✅ 已發布 |
| 8 | `fode-8` | Ch8 Queries, Modeling, and Transformation | SQL、建模(Kimball/Inmon/Data Vault)、轉換 | ✅ 已發布 |
| 9 | `fode-9` | Ch9 Serving Data | BI/分析、ML、reverse ETL | ✅ 已發布 |
| 10 | `fode-10` | Ch10 Security and Privacy | 原則、人/流程/技術、最小權限 | ✅ 已發布 |
| 11 | `fode-11` | Ch11 The Future of Data Engineering | 趨勢、live data stack、工具收斂(系列完結) | ✅ 已發布 |

## 術語表(Ubiquitous Language)

書:*Fundamentals of Data Engineering*(Joe Reis & Matt Housley,O'Reilly 2022)。**英文欄一律填原書用字**,不要從中文回譯。

全系列同一個概念只准一個中文寫法;英文欄是翻譯時直接照抄的來源。
寫到表上沒有的術語就補一列。跨系列共用的通用詞(快取、佇列、可觀測性)在
`docs/en-translation-glossary.md` B 區,這裡只放本系列特有的。

| 中文用詞 | 英文 | 備註 |
|---|---|---|
| 資料工程生命週期 | the data engineering lifecycle | 書名貫穿概念(Ch2);不寫「資料工程流程」 |
| 生成 / 儲存 / 攝取 / 轉換 / 服務 | generation / storage / ingestion / transformation / serving | 五階段(Ch2),順序固定 |
| 暗流 | undercurrents | Ch2 的六條;書上就叫 undercurrents,不譯成「底層關注」 |
| A 型 / B 型工程師 | Type A / Type B data engineer | Ch1;A = abstraction,B = build |
| 資料成熟度 | data maturity | Ch1 三階段 |
| 資料科學需求金字塔 | the Data Science Hierarchy of Needs | Ch1 引 Monica Rogati |
| 可逆決策 | reversible decision | Ch3;搭配雙向門 / 單向門 |
| 雙向門 / 單向門 | two-way door / one-way door | Ch3,Amazon 用語,書上照用 |
| 鬆耦合 / 緊耦合 | loose coupling / tight coupling | Ch3;不寫「低耦合」 |
| 棕地 / 綠地 | brownfield / greenfield | Ch3 |
| 自建 vs 採購 | build vs buy | Ch4;不寫「自研 vs 購買」 |
| 運算與儲存分離 | separation of compute and storage | Ch6 該章最大主題 |
| 物件儲存 | object storage | Ch6;不寫「對象存儲」 |
| 資料溫度(冷熱分層) | data temperature (hot / warm / cold) | Ch6 |
| 攝取 | ingestion | Ch7;固定用「攝取」,不寫「擷取 / 導入 / 汲取」 |
| 批次 / 微批次 / 串流 | batch / micro-batch / streaming | Ch7 光譜 |
| 快照 vs 增量 | full snapshot vs incremental | Ch7 批次抽取兩種姿勢 |
| 變更資料擷取 | change data capture (CDC) | Ch5/Ch7;內文一律直接用 CDC |
| 語意層 | semantic layer | Ch8;「一個數字一個定義」那節 |
| 維度建模 | dimensional modeling | Ch8;Kimball / Inmon / Data Vault 三個人名照原文 |
| Schema drift | schema drift | 中英文都用英文原詞,不譯 |
| Reverse ETL | reverse ETL | Ch9;不譯成「反向 ETL」 |
| 擁有成本 / 機會成本 | TCO / TOCO | Ch4;TOCO = total opportunity cost of ownership,書上自造詞 |
| 最小權限 | principle of least privilege | Ch10 |
| 縱深防禦 | defense in depth | Ch10 |
| 資料是資產,也是負債 | data as an asset and a liability | Ch10 反思主軸,措辭固定 |

## 寫每篇時的慣例
- front matter:`series: "Fundamentals of Data Engineering 讀書筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 沿用 ASCII:`data-engineering` + `book-notes` + 該章主題。
- 依 `.claude/skills/writing-blog-post`:摘要要比原書更清楚(提煉成模型/條列/對照)+ 一段真實反思;反思是賣點,口吻學 `btl-*` 的「## 反思」。
- 台灣用語(見 `docs/zh-tw-style-guide.md`,數據/依賴/函式 等保留不換)。
- 圖例用站台深色 SVG(SVG 內不可有空行)。
- 最大差異化:把書的觀點扣回我自己的實戰系列 —— `[[airflow-intro]]`(orchestration undercurrent)、`[[kafka-intro]]`(生成/攝取)、`[[spark-intro]]`(轉換)、`[[dbt-intro]]`(轉換/建模)、`[[medallion-architecture]]`(儲存/分層)。
