---
title: "把資料變好用:查詢、建模與轉換,讀《Fundamentals of Data Engineering》Ch.8"
date: 2026-07-03
category: tech
description: "資料進來、存好之後,怎麼變成好用的東西?這篇拆《Fundamentals of Data Engineering》Ch.8 的三支柱——查詢、建模、轉換,用 star schema 與正規化↔寬表兩張圖,講清楚分析型資料模型怎麼設計。"
tags:
  - data-engineering
  - book-notes
  - data-modeling
series: "Fundamentals of Data Engineering 讀書筆記"
seriesOrder: 8
comments: true
draft: false
---
資料[[fode-7|擷取]]進來、[[fode-6|存]]好了,接下來的問題是:**怎麼把它變成真正好用的東西?** 這章給了三支柱 —— **查詢(Query)、建模(Modeling)、轉換(Transformation)**。它們合起來,把「一堆原始資料」變成「業務問得動、查得快的模型」。其中**建模是最被工程師低估、卻最關鍵的一支**,這篇的重量也放在那。

## 查詢:SQL 是通用語,optimizer 幫你幹活

查詢的核心是 **SQL** —— 你用宣告式的方式說「我要什麼」,**查詢優化器(query optimizer)** 幫你決定「怎麼拿」(要不要用索引、join 順序、要掃多少)。所以寫查詢的功力,一半在於**別擋住優化器、也別逼它做蠢事**:

| 常見地雷 | 該做的 |
|---|---|
| 全表掃描 | 用分區 / 索引 / 欄式,只讀要的 |
| `SELECT *` | 只取需要的欄(欄式倉儲尤其有感) |
| 亂 join 一堆大表 | join 是最貴的一步(見 [[spark-shuffle\|shuffle]]),先過濾再 join |
| 在 where 對欄位包函式 | 讓條件能被 **predicate pushdown** 推到最底層 |

一句話:**SQL 是宣告式的,但效能不是自動的** —— 你要給優化器一個好發揮的環境。

## 建模:把「業務」翻譯成「表」

建模就是**決定資料長什麼結構**。為什麼重要?因為結構決定了查詢好不好寫、跑不跑得快、以及**非工程師能不能自己查**。第一個要面對的取捨,是正規化到什麼程度:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 250" role="img" aria-label="正規化與反正規化的對比:左邊正規化是多張小表用 join 串起來,少重複、寫入一致,但查詢要多次 join,適合 OLTP;右邊反正規化是一張寬表,重複多但查詢少 join,適合欄式倉儲的 OLAP 分析" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="m8" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto-start-reverse"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="20" x2="290" y2="205" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 5"/>
    <text x="150" y="28" fill="#e6e6e6" font-size="11.5" font-weight="bold" text-anchor="middle">正規化 Normalized</text>
    <rect x="55" y="44" width="84" height="32" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="97" y="64" fill="#e6e6e6" font-size="9.5" text-anchor="middle">orders</text>
    <rect x="170" y="44" width="84" height="32" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="212" y="64" fill="#e6e6e6" font-size="9.5" text-anchor="middle">customers</text>
    <rect x="112" y="106" width="84" height="32" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="154" y="126" fill="#e6e6e6" font-size="9.5" text-anchor="middle">products</text>
    <line x1="139" y1="60" x2="170" y2="60" stroke="#9aa4b2" stroke-width="1"/>
    <line x1="97" y1="76" x2="140" y2="106" stroke="#9aa4b2" stroke-width="1"/>
    <line x1="212" y1="76" x2="172" y2="106" stroke="#9aa4b2" stroke-width="1"/>
    <text x="150" y="168" fill="#9aa4b2" font-size="9" text-anchor="middle">少重複・寫入一致</text>
    <text x="150" y="184" fill="#9aa4b2" font-size="9" text-anchor="middle">但查詢要多次 join</text>
    <text x="435" y="28" fill="#e6e6e6" font-size="11.5" font-weight="bold" text-anchor="middle">反正規化 · 寬表</text>
    <rect x="350" y="44" width="170" height="108" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <rect x="350" y="44" width="170" height="22" fill="#4f6df5" fill-opacity="0.18"/>
    <text x="435" y="59" fill="#e6e6e6" font-size="9.5" text-anchor="middle">one big table(寬表)</text>
    <line x1="384" y1="66" x2="384" y2="152" stroke="#3a4154" stroke-width="1"/>
    <line x1="418" y1="66" x2="418" y2="152" stroke="#3a4154" stroke-width="1"/>
    <line x1="452" y1="66" x2="452" y2="152" stroke="#3a4154" stroke-width="1"/>
    <line x1="486" y1="66" x2="486" y2="152" stroke="#3a4154" stroke-width="1"/>
    <line x1="350" y1="94" x2="520" y2="94" stroke="#3a4154" stroke-width="1"/>
    <line x1="350" y1="123" x2="520" y2="123" stroke="#3a4154" stroke-width="1"/>
    <text x="435" y="172" fill="#9aa4b2" font-size="9" text-anchor="middle">重複多,但查詢少 join</text>
    <text x="435" y="188" fill="#9aa4b2" font-size="9" text-anchor="middle">適合欄式倉儲分析</text>
    <line x1="60" y1="222" x2="520" y2="222" stroke="#9aa4b2" stroke-width="1.3" marker-start="url(#m8)" marker-end="url(#m8)"/>
    <text x="60" y="240" fill="#9aa4b2" font-size="9" text-anchor="start">OLTP 交易(寫多)</text>
    <text x="520" y="240" fill="#9aa4b2" font-size="9" text-anchor="end">OLAP 分析(讀多)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">正規化拆成多張小表(少重複、適合交易寫入);分析則反過來,用寬表換取少 join、查得快 —— 別把 OLTP 的正規化直覺搬到分析</figcaption>
</figure>

**OLTP 愛正規化(少重複、寫入一致),分析卻常反過來** —— 因為 [[fode-6|欄式儲存又便宜又快]],重複不心疼,少一次 join 卻省很多。這是 [[fode-5|Ch.5]]講的「OLTP 別直接拿來分析」在建模層的延伸。

### 分析建模的經典:星狀綱要(Star Schema)

Kimball 的**維度建模**是分析界最通用的一招:把資料分成兩種表 —— **事實表(Fact)** 記錄可加總的度量、**維度表(Dimension)** 描述情境:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 370" role="img" aria-label="星狀綱要:中央一張事實表(訂單明細,記錄數量金額等可加總度量與各維度的 key),四周環繞日期、產品、門市、顧客四張維度表,各以一條線連到事實表" style="width:100%;max-width:560px;height:auto;margin:0 auto;">
    <line x1="280" y1="150" x2="280" y2="78" stroke="#3a4154" stroke-width="1.5"/>
    <line x1="280" y1="240" x2="280" y2="292" stroke="#3a4154" stroke-width="1.5"/>
    <line x1="205" y1="195" x2="148" y2="190" stroke="#3a4154" stroke-width="1.5"/>
    <line x1="355" y1="195" x2="412" y2="190" stroke="#3a4154" stroke-width="1.5"/>
    <rect x="218" y="24" width="124" height="54" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="280" y="46" fill="#e6e6e6" font-size="10.5" text-anchor="middle">維度 · 日期</text><text x="280" y="63" fill="#9aa4b2" font-size="8.5" text-anchor="middle">年 / 月 / 週</text>
    <rect x="218" y="292" width="124" height="54" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="280" y="314" fill="#e6e6e6" font-size="10.5" text-anchor="middle">維度 · 顧客</text><text x="280" y="331" fill="#9aa4b2" font-size="8.5" text-anchor="middle">姓名 / 地區</text>
    <rect x="24" y="163" width="124" height="54" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="86" y="185" fill="#e6e6e6" font-size="10.5" text-anchor="middle">維度 · 產品</text><text x="86" y="202" fill="#9aa4b2" font-size="8.5" text-anchor="middle">類別 / 品牌</text>
    <rect x="412" y="163" width="124" height="54" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="474" y="185" fill="#e6e6e6" font-size="10.5" text-anchor="middle">維度 · 門市</text><text x="474" y="202" fill="#9aa4b2" font-size="8.5" text-anchor="middle">地區 / 店型</text>
    <rect x="205" y="150" width="150" height="90" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="280" y="173" fill="#4f6df5" font-size="12" font-weight="bold" text-anchor="middle">事實表 Fact</text>
    <text x="280" y="191" fill="#e6e6e6" font-size="10.5" text-anchor="middle">訂單明細</text>
    <text x="280" y="208" fill="#9aa4b2" font-size="8.5" text-anchor="middle">數量・金額(可加總)</text>
    <text x="280" y="224" fill="#9aa4b2" font-size="8.5" text-anchor="middle">＋各維度的 key</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">事實表=可加總的度量(很長、一直長);維度表=描述情境(who/what/when/where,較短、拿來篩選與分組)。查詢時 join 幾張維度,就能任意切片</figcaption>
</figure>

星狀綱要好用,是因為它把「**要算什麼**(事實)」和「**用什麼角度切**(維度)」分乾淨。想看「各地區、各月的銷售額」?join 門市與日期兩張維度、對金額加總就好 —— 連非工程師都能照著切。書也提到其他學派,各有立場:

| 學派 | 一句話 |
|---|---|
| **Kimball** | 由下而上、維度建模、星狀綱要(最通用) |
| **Inmon** | 由上而下、先建正規化的企業級倉儲,再切 data mart |
| **Data Vault** | hub / link / satellite,為可追溯與演進而生 |
| **寬表(One Big Table)** | 乾脆全攤平成一張大表,靠欄式引擎硬吃 |

不用背哪個「對」——**它們是不同取捨**:Kimball 好懂好自助、Inmon 重治理、Data Vault 重可追溯、寬表重查詢速度。

## 轉換:把原始資料變成模型,而且 T 的位置變了

有了模型的藍圖,**轉換**負責真的把原始資料塑形成它。這裡最大的變化是 **ETL → ELT**:

- **ETL**:先轉換,再載入倉儲(倉儲貴,只放乾淨資料)。
- **ELT**:先原封不動載入,**再在倉儲裡用 SQL 轉換**(儲存便宜、倉儲夠強,乾脆讓它扛)。

ELT 會贏,根源還是 [[fode-6|運算與儲存分離、儲存變便宜]]:反正先存下來不痛,轉換就交給倉儲的 SQL。這也是 [[medallion-architecture|Medallion 分層]]和 dbt 這類工具的底層前提 —— 在倉儲裡用一層層 SQL,把 Bronze 原始資料逐步轉成 Gold 模型。轉換也不只批次:串流轉換(見 [[spark-streaming|Structured Streaming]])在資料流過時就邊算邊塑形。至於 **view vs 物化(materialized)**,是另一個典型取捨:view 每次查即時算(省空間、慢),物化預先算好存起來(快、佔空間、要刷新)。

## 反思

### 建模是把業務翻成表,這是最被低估的軟實力

寫這章我最有感的是:**建模的難點根本不在技術,在懂業務。** 星狀綱要漂亮,不是因為它技術多炫,而是它逼你想清楚「這門生意的**度量**是什麼、要用哪些**角度**切」。我看過太多資料專案卡住,不是引擎不夠快,是**沒人把業務問題翻成乾淨的模型** —— 表長得像後端的 OLTP schema,分析師每查一個數字都要 join 七張表、還常算錯。把資料建得讓非工程師都能自助查,是我認為資料團隊最該練、卻最少人練的一項能力。

### 我偏好 ELT + 分層 + dbt,而且理由一路連得起來

這幾篇下來,我的立場越來越一致:**先把原始資料落進便宜的儲存(ELT 的 L),再用 SQL 一層層轉(T)。** 這不是趕流行 —— 它一路接得回 [[fode-6|運算儲存分離]]、[[medallion-architecture|Medallion 的 Bronze 不可變、可重播]]。用 SQL 而不是一堆散落的腳本做轉換,好處是版本控管、可測試、人人看得懂(dbt 把這套做成了工程規範)。ETL 不是錯,但在「儲存便宜、倉儲夠強」的今天,ELT 是我的預設。

### 別把 OLTP 的正規化直覺,帶到分析

這是我年輕時踩過的坑:後端出身,看到重複資料就渾身不對勁,於是把分析表也正規化得漂漂亮亮 —— 結果每張報表都在狂 join,慢得要命。後來才想通:**[[fode-6|欄式倉儲上,重複的成本很低,少一次 join 的收益很高]]。** 分析建模該問的不是「夠不夠正規化」,而是「查詢好不好寫、跑不跑得快」。這跟 [[fode-4|Ch.4]]那句「每個選擇都是取捨、看工作負載選邊」一模一樣 —— 正規化是給寫入用的美德,分析要的是另一套。
