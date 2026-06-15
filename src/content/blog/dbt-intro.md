---
title: "dbt 是什麼?用寫程式的方式做資料轉換"
date: 2026-06-14
category: tech
tags:
  - dbt
  - data-engineering
  - analytics-engineering
comments: true
draft: true
---
## dbt 是什麼

一句話:**dbt(data build tool)是一個讓你「用一堆 SQL `SELECT` 把資料倉儲裡的原始資料,轉換成乾淨、可信、可重用的模型表」的框架** —— 而且把寫程式的紀律(版控、模組化、測試、文件、CI)帶進這層轉換。

關鍵認知:**dbt 自己不搬資料、也不運算**。它把你的 SQL 編譯好、丟進資料倉儲(BigQuery / Snowflake / Redshift / Databricks / Postgres)去執行。它負責的是 **ELT 裡的 T(Transform)**。

### 它在資料流程的哪個位置

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 170" role="img" aria-label="dbt 在 ELT 的位置:在資料倉儲內把原始層轉成建模層" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="db" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="128" y="22" width="312" height="124" rx="10" fill="none" stroke="#3a4154" stroke-width="1.5" stroke-dasharray="5 5"/>
    <text x="284" y="40" fill="#9aa4b2" font-size="11" text-anchor="middle">Data Warehouse</text>
    <line x1="104" y1="84" x2="146" y2="90" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#db)"/>
    <line x1="258" y1="90" x2="300" y2="90" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#db)"/>
    <line x1="412" y1="90" x2="470" y2="84" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#db)"/>
    <rect x="12" y="64" width="92" height="48" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="58" y="85" fill="#e6e6e6" font-size="12" text-anchor="middle">來源</text>
    <text x="58" y="101" fill="#9aa4b2" font-size="9.5" text-anchor="middle">DB / API</text>
    <rect x="148" y="66" width="110" height="48" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="203" y="87" fill="#e6e6e6" font-size="12" text-anchor="middle">原始層</text>
    <text x="203" y="103" fill="#9aa4b2" font-size="9.5" text-anchor="middle">raw tables</text>
    <rect x="302" y="66" width="110" height="48" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="357" y="87" fill="#e6e6e6" font-size="12" text-anchor="middle">建模層</text>
    <text x="357" y="103" fill="#9aa4b2" font-size="9.5" text-anchor="middle">staging / marts</text>
    <rect x="470" y="64" width="96" height="48" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="518" y="85" fill="#e6e6e6" font-size="12" text-anchor="middle">BI / ML</text>
    <text x="518" y="101" fill="#9aa4b2" font-size="9.5" text-anchor="middle">報表 / 模型</text>
    <text x="104" y="58" fill="#9aa4b2" font-size="9.5" text-anchor="middle">EL 載入</text>
    <text x="280" y="80" fill="#4f6df5" font-size="10" text-anchor="middle">dbt:SQL</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">先把原始資料載進倉儲(EL),dbt 再在倉儲「內部」用 SQL 把它轉成建模層</figcaption>
</figure>

### 核心概念

| 概念 | 是什麼 |
|---|---|
| **Model** | 一個 `.sql` 檔 = 一句 `SELECT` = 在倉儲裡被建成一張 table 或 view |
| **`ref()`** | 在 model 裡引用另一個 model;dbt 靠它建出相依圖、決定 build 順序、自動換成各環境的真實表名 |
| **`source()`** | 宣告外部原始表,可做新鮮度(freshness)檢查 |
| **Materialization** | model 怎麼落地:`view` / `table` / `incremental` / `ephemeral` |
| **Jinja** | SQL 裡的模板語言(變數、迴圈、macro),編譯成最終 SQL |
| **Test** | 資料測試:`unique`、`not_null`、`accepted_values`、`relationships`,寫在 YAML |
| **Seed / Snapshot** | CSV 灌成表 / 記錄維度的歷史變化(SCD type-2) |
| **Docs + Lineage** | 自動產生 model 之間的血緣關係圖與文件 |

### 一個 model 怎麼接另一個:`ref()` 建出血緣

dbt 最核心的機制是 `ref()`:你在一個 model 裡 `ref('另一個 model')`,dbt 就知道它們的相依,自動排出建置順序、畫出 lineage。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 520 200" role="img" aria-label="dbt model 血緣:來源經 staging 匯入 fct_orders" style="width:100%;max-width:580px;height:auto;margin:0 auto;">
    <defs><marker id="dl" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="134" y1="45" x2="186" y2="45" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#dl)"/>
    <line x1="134" y1="151" x2="186" y2="151" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#dl)"/>
    <line x1="310" y1="45" x2="362" y2="92" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#dl)"/>
    <line x1="310" y1="151" x2="362" y2="108" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#dl)"/>
    <rect x="12" y="24" width="122" height="42" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="73" y="42" fill="#e6e6e6" font-size="11.5" text-anchor="middle">source:</text>
    <text x="73" y="57" fill="#9aa4b2" font-size="10" text-anchor="middle">raw.orders</text>
    <rect x="12" y="130" width="122" height="42" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="73" y="148" fill="#e6e6e6" font-size="11.5" text-anchor="middle">source:</text>
    <text x="73" y="163" fill="#9aa4b2" font-size="10" text-anchor="middle">raw.customers</text>
    <rect x="188" y="24" width="122" height="42" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="249" y="49" fill="#e6e6e6" font-size="12" text-anchor="middle">stg_orders</text>
    <rect x="188" y="130" width="122" height="42" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="249" y="155" fill="#e6e6e6" font-size="12" text-anchor="middle">stg_customers</text>
    <rect x="364" y="78" width="138" height="44" rx="8" fill="#4f6df5" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="433" y="105" fill="#ffffff" font-size="12.5" text-anchor="middle">fct_orders</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">ref() / source() 自動建出這張血緣圖,dbt 依它決定先建 staging、再建 fct_orders</figcaption>
</figure>

## 範例(dbt 的語言是 SQL + YAML,不是 Python)

> dbt 的 model 就是 SQL `SELECT`;測試、來源宣告寫在 YAML;模板用 Jinja。(它也支援 Python models 跑在 Snowflake/Databricks 上,但核心與日常九成是 SQL。)

### Model:一句 SELECT,用 `ref()` 串起相依

```sql
-- models/marts/fct_orders.sql
{{ config(materialized='table') }}

with orders as (
    select * from {{ ref('stg_orders') }}
),
customers as (
    select * from {{ ref('stg_customers') }}
)
select
    o.order_id,
    o.order_date,
    c.customer_name,
    o.amount
from orders o
join customers c on o.customer_id = c.customer_id
where o.status = 'paid'
```

`{{ ref('stg_orders') }}` 在編譯時會換成該 model 在當前環境的真實表名(dev / prod 自動不同),同時告訴 dbt「fct_orders 相依於 stg_orders」。`{{ config(...) }}` 則指定這個 model 要落地成一張實體 table。

### 測試與來源:寫在 YAML

```yaml
# models/marts/schema.yml
version: 2

sources:
  - name: raw
    tables:
      - name: orders
      - name: customers

models:
  - name: fct_orders
    description: "每筆已付款訂單一列"
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: customer_name
        tests:
          - not_null
```

這幾行就讓 dbt 在每次跑測試時,自動檢查 `order_id` 真的唯一且不為空 —— **測的是資料,不是程式碼**。這是 dbt 最被低估的價值。

### 一鍵照血緣順序執行

```bash
dbt run     # 依血緣順序建/更新所有 model
dbt test    # 跑所有資料測試
dbt build   # run + test + snapshot + seed,一條龍照 DAG 跑
```

## 反思

### dbt 的價值不是 SQL,是「把分析層當成正式工程」

在 dbt 之前,資料轉換邏輯常常散在 stored procedure、零散腳本、或 BI 工具的設定裡:沒有版控、沒有測試、沒有血緣,改一個欄位不知道會炸到哪。dbt 真正帶來的是**把這層變成一個能 review、能測試、能追血緣的程式碼庫**。對我來說這才是重點 —— 它賣的不是「用 SQL 轉資料」(那本來就會),而是**工程紀律**。

### 它不是運算引擎,也不是排程器 —— 別搞混

最常見的誤解是期待 dbt 去抽資料、或自己排程。它兩者都不做:它只編譯 SQL、推給倉儲執行。所以實務上它要跟另外兩塊搭:用 EL 工具(Fivetran / Airbyte)把資料載進來、用 [[airflow-intro|Airflow]] 來定時觸發 `dbt build`。而當轉換大到 SQL 倉儲吃不下、需要分散式引擎時,那是 [[spark-intro|Spark]] 的場;dbt 則專心做「SQL 能表達、倉儲跑得動」的那一段。三者是互補,不是競爭。

### 這次我的採用門檻比較低

寫 [[airflow-intro|Airflow]] 跟 [[spark-intro|Spark]] 時我都說「別太早上、先確認痛點」,因為它們的複雜度與維運成本高。**dbt 剛好相反**:如果你的轉換本來就是 SQL、又跑在資料倉儲上,dbt 的導入成本其實很低(裝起來就能用、學習曲線平),換來的是可測試、有版控、自動產文件與血緣的轉換層。投報率高、下檔風險小,所以這是少數我會說「幾乎可以直接上」的工具。

### 最該先用起來的是 test 與 ref()

如果只能挑兩個功能先落地,我會選 `ref()` 和 test。`ref()` 給你血緣 —— 改一個 model 前能看清下游會受影響的有誰;test 則攔住「資料悄悄壞掉」這種最難抓的 bug(程式沒錯、但數字錯)。這兩個合起來,就把分析從「能跑就好」推向「可信」。
