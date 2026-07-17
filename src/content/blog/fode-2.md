---
title: "資料工程生命週期:讀《Fundamentals of Data Engineering》Ch.2"
date: 2026-06-28
category: tech
tags:
  - data-engineering
  - book-notes
  - lifecycle
series: "Fundamentals of Data Engineering 讀書筆記"
seriesOrder: 2
comments: true
draft: false
---
[[fode-1|上一篇]]給了定義,這一章給的是**全書的骨架** —— 資料工程生命週期(data engineering lifecycle)。這本書最有價值的貢獻,就是用這個框架把「資料工程在做什麼」講清楚:**五個階段 + 六條暗流(undercurrents)**。讀懂這張圖,後面九章都只是在它上面長細節。

## 五個階段:資料從產生到被用

生命週期把「原始資料 → 有用的資料」這段切成五個階段:

| 階段 | 在做什麼 | 對應我寫過的 |
|---|---|---|
| **Generation 生成** | 資料在來源系統產生(DB、App、感測器、事件) | [[kafka-intro\|Kafka]](事件流) |
| **Storage 儲存** | 資料落地的地方 —— **橫跨中間三個階段** | [[medallion-architecture\|Medallion]] 分層 |
| **Ingestion 攝取** | 把資料從來源搬進系統 | [[kafka-intro\|Kafka]]、批次載入 |
| **Transformation 轉換** | 清洗、建模、聚合成可用形狀 | [[dbt-intro\|dbt]]、[[spark-intro\|Spark]] |
| **Serving 服務** | 把資料交付給分析、ML、產品 | BI / 報表 / 特徵 |

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 280" role="img" aria-label="資料工程生命週期:生成、攝取、轉換、服務四階段橫向流動,儲存橫跨中間三段,底下六條 undercurrents 撐起整條" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="le" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="14" y="36" width="96" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="62" y="53" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Generation</text>
    <text x="62" y="67" fill="#9aa4b2" font-size="9.5" text-anchor="middle">生成</text>
    <rect x="136" y="36" width="100" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="186" y="53" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Ingestion</text>
    <text x="186" y="67" fill="#9aa4b2" font-size="9.5" text-anchor="middle">攝取</text>
    <rect x="254" y="36" width="120" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="314" y="53" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Transformation</text>
    <text x="314" y="67" fill="#9aa4b2" font-size="9.5" text-anchor="middle">轉換</text>
    <rect x="392" y="36" width="96" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="440" y="53" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Serving</text>
    <text x="440" y="67" fill="#9aa4b2" font-size="9.5" text-anchor="middle">服務</text>
    <line x1="110" y1="56" x2="134" y2="56" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#le)"/>
    <line x1="236" y1="56" x2="252" y2="56" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#le)"/>
    <line x1="374" y1="56" x2="390" y2="56" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#le)"/>
    <rect x="136" y="104" width="352" height="38" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="2"/>
    <text x="312" y="128" fill="#e6e6e6" font-size="11" text-anchor="middle">Storage 儲存(橫跨中間三階段)</text>
    <line x1="186" y1="76" x2="186" y2="104" stroke="#9aa4b2" stroke-width="1.3" marker-start="url(#le)" marker-end="url(#le)"/>
    <line x1="314" y1="76" x2="314" y2="104" stroke="#9aa4b2" stroke-width="1.3" marker-start="url(#le)" marker-end="url(#le)"/>
    <line x1="440" y1="76" x2="440" y2="104" stroke="#9aa4b2" stroke-width="1.3" marker-start="url(#le)" marker-end="url(#le)"/>
    <rect x="14" y="170" width="474" height="94" rx="10" fill="#1f2330" stroke="#3a4154" stroke-width="1.4" stroke-dasharray="5 4"/>
    <text x="251" y="188" fill="#9aa4b2" font-size="10.5" text-anchor="middle">Undercurrents — 撐起整條生命週期的六條暗流</text>
    <rect x="24" y="198" width="144" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="96" y="215" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Security 安全</text>
    <rect x="176" y="198" width="144" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="248" y="215" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Data Management</text>
    <rect x="328" y="198" width="144" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="400" y="215" fill="#e6e6e6" font-size="9.5" text-anchor="middle">DataOps</text>
    <rect x="24" y="230" width="144" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="96" y="247" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Data Architecture</text>
    <rect x="176" y="230" width="144" height="26" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="248" y="247" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Orchestration 編排</text>
    <rect x="328" y="230" width="144" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="400" y="247" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Software Engineering</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">四階段橫向流動、儲存橫跨中間三段;底下六條 undercurrents 是整條生命週期共用的地基(編排 = Airflow 的家)</figcaption>
</figure>

## 為什麼儲存是「橫跨」的,不是一個獨立步驟

這是這章最該記住的細節:**儲存不是「攝取完、轉換前」插進去的一站,而是貫穿攝取、轉換、服務三個階段的底層**。資料在這三段裡反覆被讀出、寫回 —— 攝取要寫進儲存、轉換要從儲存讀出再寫回、服務要從儲存取出。所以書把它畫成橫跨的一條,而不是排在中間的一格。

這跟我寫 [[medallion-architecture|Medallion 架構]]的體會完全對上:Bronze / Silver / Gold 不是三個「步驟」,而是資料在生命週期裡流經的三層**儲存**。

## 六條暗流:看不見、卻決定系統會不會垮

五個階段是「看得見的管線」,而 **undercurrents 是貫穿每一階段的底層實踐** —— 書用「暗流」這個詞很傳神:它們不在表面,卻決定整條河的流向與安危。

| Undercurrent | 在管什麼 |
|---|---|
| **Security 安全** | 最小權限、加密、別把帳密寫死 |
| **Data Management** | 治理、品質、血緣、主資料、隱私 |
| **DataOps** | 自動化、可觀測性、事件應變(資料界的 DevOps) |
| **Data Architecture** | 系統怎麼設計、權衡與取捨 |
| **Orchestration 編排** | 把任務依相依排程、監控、重試 |
| **Software Engineering** | 把工程紀律帶進資料工作 |

注意 **Orchestration** 就是 [[airflow-intro|Airflow]] 的家 —— 它不是某個階段,而是橫貫所有階段的暗流。這解釋了為什麼 Airflow 那麼核心:它管的是整條生命週期的「節奏」。

## 反思

### 這個框架最大的價值,是給了我一個「定位用」的座標系

讀完這章我做的第一件事,是把過去半年寫的每個工具丟進這張圖:[[kafka-intro|Kafka]] 落在生成/攝取、[[spark-intro|Spark]] 與 [[dbt-intro|dbt]] 在轉換、[[medallion-architecture|Medallion]] 是儲存的分層、[[airflow-intro|Airflow]] 是 orchestration 暗流。**突然之間,那些原本各寫各的筆記,在同一張地圖上有了位置。** 框架的價值往往不是教你新東西,而是給你一個座標系,讓你看清自己已知的東西彼此怎麼接 —— 這章對我就是這個作用。

### 暗流,才是資淺與資深的分水嶺

我越來越覺得,五個階段是「入門就看得到」的東西 —— 誰都知道資料要攝取、要轉換、要服務。真正拉開差距的是 undercurrents:有沒有把安全(別 hardcode 帳密,呼應我寫 [[airflow-providers|Connection]] 那篇)、可觀測性、資料品質、血緣這些「看不見的」做進去。一個 demo 跟一個能在半夜不出事的 Production 系統,差別幾乎全在暗流。**新手炫的是管線跑通,老手守的是暗流。**

### 如果只能先補強一條暗流,我選 DataOps

書把六條暗流並列,但要我排優先序,我會把 **DataOps** 放前面 —— 自動化、可觀測性、事件應變。理由很實際:資料系統最大的痛不是「建不出來」,是「壞了不知道、知道了難查、查到了難復原」。這跟我在 [[airflow-control-flow|Airflow]] 系列反覆強調的冪等、可重跑、別讓資源默默耗乾是同一件事。把 DataOps 做起來,等於給整條生命週期裝上儀表板與保險絲 —— 其他暗流的問題,也才看得見、修得動。
