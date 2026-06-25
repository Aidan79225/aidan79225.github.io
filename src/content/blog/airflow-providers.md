---
title: "Airflow 怎麼連外部系統:Provider、Operator、Hook、Sensor"
date: 2026-06-25
category: tech
tags:
  - airflow
  - data-engineering
  - integration
series: "Airflow 學習筆記"
seriesOrder: 5
comments: true
draft: false
---
前面幾篇都在講 Airflow 的內部機制 —— [[airflow-scheduling|排程]]、[[airflow-xcom|任務間傳資料]]。但真正的 pipeline 一定得碰外面的世界:查一個資料庫、丟檔案到 S3、打一支 HTTP API、等一個檔案到齊。這篇講 Airflow 連外部系統的四個積木 —— **Provider、Operator、Hook、Sensor** —— 以及把帳密抽出來的 **Connection**。

## 四個關鍵字,先分清楚

| 名詞 | 是什麼 | 一句話 |
|---|---|---|
| **Provider** | 一包 pip 套件,封裝某個外部系統的整合 | 要連誰,就裝誰的 provider |
| **Operator** | 預先寫好的 task 樣板:對外部系統「做一件事」 | 你只設定、不寫程式 |
| **Hook** | Operator 底層那個連線 client(管連線與認證) | 要自訂邏輯時自己拿來用 |
| **Sensor** | 一種會「等待」條件成立才放行的特殊 Operator | 等檔案、等分區、等時間 |

關係是一層包一層:**Operator 內部包著 Hook,Hook 靠 Connection 拿到帳密去連外部系統。** 而這些整合不在 Airflow 核心裡 —— 核心保持精簡,你要連誰就 `pip install` 那個 **Provider**(`apache-airflow-providers-amazon`、`-postgres`、`-http`…)。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 200" role="img" aria-label="DAG task 透過 Operator 呼叫 Hook,Hook 靠 Connection 提供的帳密連到外部系統" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="pv1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker><marker id="pv2" markerWidth="8" markerHeight="8" refX="4" refY="1" orient="auto"><path d="M0,8 L4,0 L8,8 z" fill="#9aa4b2"/></marker></defs>
    <rect x="12" y="64" width="96" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="60" y="84" fill="#e6e6e6" font-size="12" text-anchor="middle">DAG task</text>
    <text x="60" y="99" fill="#9aa4b2" font-size="9" text-anchor="middle">@task</text>
    <rect x="144" y="64" width="112" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="200" y="84" fill="#e6e6e6" font-size="12" text-anchor="middle">Operator</text>
    <text x="200" y="99" fill="#9aa4b2" font-size="9" text-anchor="middle">做一件事</text>
    <rect x="292" y="64" width="92" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="338" y="84" fill="#e6e6e6" font-size="12" text-anchor="middle">Hook</text>
    <text x="338" y="99" fill="#9aa4b2" font-size="9" text-anchor="middle">連線 client</text>
    <rect x="440" y="58" width="110" height="58" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.6"/>
    <text x="495" y="82" fill="#e6e6e6" font-size="12" text-anchor="middle">外部系統</text>
    <text x="495" y="98" fill="#9aa4b2" font-size="9" text-anchor="middle">DB / S3 / API</text>
    <line x1="108" y1="87" x2="144" y2="87" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#pv1)"/>
    <line x1="256" y1="87" x2="292" y2="87" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#pv1)"/>
    <line x1="384" y1="87" x2="440" y2="87" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#pv1)"/>
    <rect x="266" y="150" width="150" height="38" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.4" stroke-dasharray="4 3"/>
    <text x="341" y="168" fill="#e6e6e6" font-size="11" text-anchor="middle">Connection</text>
    <text x="341" y="182" fill="#9aa4b2" font-size="8.5" text-anchor="middle">conn_id:帳密 + 端點</text>
    <line x1="341" y1="150" x2="338" y2="112" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pv2)"/>
    <text x="404" y="134" fill="#9aa4b2" font-size="9" text-anchor="start">提供帳密</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一層包一層:task → Operator → Hook → 外部系統;Connection 在側邊把帳密餵給 Hook</figcaption>
</figure>

## Connection:把帳密從程式碼裡抽出來

[[airflow-xcom|上一篇]]的表格提過 Connection —— **全站長期保存的連線資訊(帳密、端點)**。它的價值在於:Operator 與 Hook 都只引用一個 `conn_id`,**絕不把帳密寫死在 DAG 裡**。連線本身存在 metadata DB(加密)或 secrets backend,在 UI 的 Admin → Connections 維護。

這帶來一個關鍵好處:**同一份 DAG,在 dev 和 prod 只是 `conn_id` 背後指向不同的資料庫** —— 程式碼一個字都不用改。

## Operator:把「做一件事」包成可設定的 task

最常見的用法。你不寫連線、不寫 cursor,只設定參數:

```python
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator

refresh = SQLExecuteQueryOperator(
    task_id="refresh_summary",
    conn_id="analytics_pg",          # 指向某個 Connection,不寫死帳密
    sql="INSERT INTO daily_summary SELECT * FROM staging WHERE day = '{{ ds }}'",
)
```

`{{ ds }}` 是 [[airflow-scheduling|排程那篇]]講的模板變數 —— 這個 task 自動帶入「這次 run 對應的那一天」。整個 task 就是宣告式的:**它做什麼一目了然,連線細節全藏在 `conn_id` 後面。**

## Hook:需要自訂邏輯時,直接用底層 client

現成 Operator 太死板、或要把好幾步組起來時,就在 [[airflow-xcom|`@task`]] 裡直接用 Hook —— 它就是 Operator 內部那個連線 client,只是換你親自操刀:

```python
from airflow.decorators import task
from airflow.providers.postgres.hooks.postgres import PostgresHook

@task
def check_freshness() -> int:
    hook = PostgresHook(postgres_conn_id="analytics_pg")   # 同樣靠 conn_id
    rows = hook.get_records("SELECT count(*) FROM orders WHERE day = current_date")
    n = rows[0][0]
    if n == 0:
        raise ValueError("今天還沒有訂單資料")
    return n
```

記住這條關係:**Operator 是 Hook 的包裝。** 能用 Operator 就用(宣告式、乾淨);邏輯特殊到 Operator 的參數塞不下,才退到 Hook 自己寫。

## Sensor:等待外部條件成立

Sensor 是會**卡住等待**的特殊 Operator —— 等一個檔案落地、等某個分區出現、等時間到,條件成立才放行下游。

```python
from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor

wait_file = S3KeySensor(
    task_id="wait_for_upload",
    bucket_key="incoming/{{ ds }}/data.csv",
    bucket_name="my-lake",
    aws_conn_id="aws_default",
    mode="reschedule",        # ★ 等待時釋放 worker slot,別佔著
    poke_interval=300,        # 每 5 分鐘檢查一次
    timeout=60 * 60 * 6,      # 等超過 6 小時就失敗
)
```

這裡有個務必懂的坑 —— Sensor 的兩種等待模式:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 184" role="img" aria-label="poke 模式整段等待都佔住 worker slot;reschedule 模式檢查完就放開 slot,下次再排回來" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="12" y="46" fill="#9aa4b2" font-size="11" text-anchor="start">poke</text>
    <rect x="92" y="30" width="392" height="28" rx="5" fill="#262b3a" stroke="#d4af37" stroke-width="1.6"/>
    <text x="288" y="49" fill="#e6e6e6" font-size="11" text-anchor="middle">整段等待都佔住一個 worker slot</text>
    <text x="12" y="118" fill="#9aa4b2" font-size="11" text-anchor="start">reschedule</text>
    <rect x="92" y="102" width="40" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="112" y="121" fill="#9aa4b2" font-size="9" text-anchor="middle">查</text>
    <rect x="180" y="102" width="40" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="200" y="121" fill="#9aa4b2" font-size="9" text-anchor="middle">查</text>
    <rect x="268" y="102" width="40" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="288" y="121" fill="#9aa4b2" font-size="9" text-anchor="middle">查</text>
    <rect x="356" y="102" width="40" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="376" y="121" fill="#9aa4b2" font-size="9" text-anchor="middle">查</text>
    <rect x="444" y="102" width="40" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="464" y="121" fill="#9aa4b2" font-size="9" text-anchor="middle">查</text>
    <text x="288" y="150" fill="#9aa4b2" font-size="10" text-anchor="middle">查完即放開 slot,中間的空檔不佔資源,下次再排回來</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">poke:整段等待霸佔 worker;reschedule:只在「檢查的那一刻」用 worker,空檔釋放出去</figcaption>
</figure>

預設的 **poke** 模式會**整段等待都佔住一個 worker slot** —— 幾個長等待的 sensor 就能把 worker 吃光,整個 Airflow 卡死。長等待一律改 **reschedule**(檢查完就放開 slot),或用更省的 **deferrable** sensor。這是新手最容易踩、又最難察覺的效能陷阱。

## 怎麼選:Operator 還是 Hook?

| 情境 | 選擇 |
|---|---|
| 有現成 Operator、又夠用 | **Operator**(宣告式、清楚) |
| 邏輯特殊 / 要組合多步 / 要條件分支 | **`@task` 裡用 Hook**(命令式、靈活) |
| 要等外部條件才繼續 | **Sensor**(記得 reschedule) |

## 反思

### Provider 模型的精神:把核心做小,把整合外包

我蠻欣賞 Airflow 這個設計 —— 核心只管「排程與依賴」,連 Postgres、S3、Snowflake 的整合通通拆成獨立 provider,要才裝。代價是新手最常見的第一個坑就是 `ModuleNotFoundError`:照著範例 import `S3KeySensor`,卻忘了先 `pip install apache-airflow-providers-amazon`。我的習慣是**把用到的 provider 全部釘進 `requirements.txt`、連版本一起鎖**,別依賴「映像檔裡剛好有」—— 不然換個環境就炸,而且這種錯往往要跑起來才發現。

### Connection 是我會要求「第一天就用對」的東西

把帳密 hardcode 在 DAG 裡,是我 review 時一定會擋下來的事。理由不只是安全 —— 更實際的是,**用 `conn_id` 之後,同一份 DAG 在 dev / staging / prod 完全不用改程式碼**,環境差異全收斂到 Connection 設定裡。這跟 [[airflow-xcom|上一篇]]講 Variable / Connection 的分工是同一個原則:把「會隨環境變的東西」抽出程式碼之外。早一天養成這習慣,之後少掉一整類「改了忘了改回來」的意外。

### Sensor 好用,但它在背後偷偷吃資源

Sensor 讀起來很無害 ——「等檔案到就好」。但預設 poke 模式那種「霸佔 worker 空轉」的行為,是我看過最隱形的效能殺手:平常沒事,等到某天上游延遲、十幾個 sensor 同時在等,worker slot 被佔滿,**連不相干的 DAG 都跟著卡住**。所以我的原則很硬:**凡是可能等超過幾分鐘的 sensor,一律 reschedule 或 deferrable。** 這也呼應 [[airflow-intro|第一篇]]說的 —— Airflow 的價值是可靠的編排,而可靠的前提,是別讓任何一個 task 默默把共用資源耗乾。
