---
title: "Airflow 排程的真相:data interval、catchup 與 backfill"
date: 2026-06-19
category: tech
tags:
  - airflow
  - data-engineering
  - scheduling
series: "Airflow 學習筆記"
seriesOrder: 3
comments: true
draft: false
---
[[airflow-first-dag|上一篇]]我們把 DAG 跑起來了,還特別把 `catchup` 設成 `False`「保平安」。這篇就來拆解 Airflow 最反直覺、也最多人卡住的部分:**排程到底怎麼運作**。搞懂這一段,你才真的會用 Airflow。

## 最關鍵的心智轉變:一個 run 代表「一段時間區間」

新手最大的誤解,是以為「`@daily` 的 DAG 在每天 00:00 觸發、處理當下的資料」。**錯**。Airflow 的世界裡:

> 每一次 DAG run 都對應一個**資料區間(data interval)** `[start, end)`,而這個 run 會在**區間結束之後**才被觸發。

也就是說,負責「6/18 這天」的 run,**不是在 6/18 跑,而是在 6/19 00:00(6/18 區間結束時)才跑** —— 因為要等 6/18 這天的資料都齊了,才處理得了它。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 170" role="img" aria-label="DAG run 在資料區間結束後才觸發" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="s1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="30" y1="92" x2="534" y2="92" stroke="#3a4154" stroke-width="1.5" marker-end="url(#s1)"/>
    <line x1="90" y1="86" x2="90" y2="98" stroke="#9aa4b2" stroke-width="1.5"/>
    <line x1="290" y1="86" x2="290" y2="98" stroke="#9aa4b2" stroke-width="1.5"/>
    <line x1="490" y1="86" x2="490" y2="98" stroke="#9aa4b2" stroke-width="1.5"/>
    <text x="90" y="112" fill="#9aa4b2" font-size="10.5" text-anchor="middle">6/18 00:00</text>
    <text x="290" y="112" fill="#9aa4b2" font-size="10.5" text-anchor="middle">6/19 00:00</text>
    <text x="490" y="112" fill="#9aa4b2" font-size="10.5" text-anchor="middle">6/20 00:00</text>
    <rect x="92" y="64" width="196" height="22" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="190" y="79" fill="#e6e6e6" font-size="11.5" text-anchor="middle">資料區間 = 6/18</text>
    <rect x="292" y="64" width="196" height="22" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="390" y="79" fill="#e6e6e6" font-size="11.5" text-anchor="middle">資料區間 = 6/19</text>
    <path d="M290,40 L284,28 L296,28 z" fill="#4f6df5"/>
    <line x1="290" y1="40" x2="290" y2="62" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="290" y="22" fill="#4f6df5" font-size="11" text-anchor="middle">6/18 的 run 在這觸發</text>
    <path d="M490,40 L484,28 L496,28 z" fill="#4f6df5"/>
    <line x1="490" y1="40" x2="490" y2="62" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="490" y="22" fill="#4f6df5" font-size="11" text-anchor="middle">6/19 的 run</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">「6/18 的 run」其實在 6/19 00:00 才跑;它的 logical_date = 區間起點 = 6/18</figcaption>
</figure>

這也解釋了那個惡名昭彰的欄位 **`logical_date`**(舊名 `execution_date`):它**不是「執行時間」**,而是「這個 run 代表的區間起點」。難怪以前叫 execution_date 時大家全被搞混。

## 四個排程相關的關鍵字

| 參數 / 概念 | 意義 |
|---|---|
| **`schedule`** | 多久跑一次:cron(`"0 3 * * *"`)、preset(`@daily`)、`timedelta(hours=6)`、`None`(只手動)。它定義了區間怎麼切。 |
| **`start_date`** | **第一個資料區間的起點**(不是「開始運作的時間」)。必須是**靜態**時間,別用 `datetime.now()`。 |
| **`data_interval_start` / `end`** | 這個 run 負責的區間 `[start, end)`;run 在 `end` 之後觸發。 |
| **`catchup`** | 啟用 DAG 時,要不要把 `start_date` 到現在**錯過的區間全部補跑**。 |

```python
from datetime import datetime, timedelta

schedule="@daily"             # preset:@hourly / @daily / @weekly / @monthly
schedule="0 3 * * *"          # cron:每天 03:00
schedule=timedelta(hours=6)   # 每 6 小時
schedule=None                 # 不排程,只手動觸發
```

## catchup:那個「一開就噴出一堆 run」的兇手

假設你 `start_date=6/15`、`schedule="@daily"`,然後在 **6/18** 才打開這個 DAG:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 200" role="img" aria-label="catchup True 補跑所有錯過區間,False 只跑最近一個" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="180" y="26" fill="#9aa4b2" font-size="11" text-anchor="middle">6/15</text>
    <text x="300" y="26" fill="#9aa4b2" font-size="11" text-anchor="middle">6/16</text>
    <text x="420" y="26" fill="#9aa4b2" font-size="11" text-anchor="middle">6/17</text>
    <text x="500" y="26" fill="#9aa4b2" font-size="9.5" text-anchor="middle">(6/18 開啟)</text>
    <text x="12" y="78" fill="#e6e6e6" font-size="12" text-anchor="start">catchup=True</text>
    <circle cx="180" cy="74" r="15" fill="#4f6df5"/><text x="180" y="78" fill="#fff" font-size="12" text-anchor="middle">✓</text>
    <circle cx="300" cy="74" r="15" fill="#4f6df5"/><text x="300" y="78" fill="#fff" font-size="12" text-anchor="middle">✓</text>
    <circle cx="420" cy="74" r="15" fill="#4f6df5"/><text x="420" y="78" fill="#fff" font-size="12" text-anchor="middle">✓</text>
    <text x="180" y="104" fill="#9aa4b2" font-size="10" text-anchor="middle">錯過的 6/15~6/17 全部補跑</text>
    <text x="12" y="150" fill="#e6e6e6" font-size="12" text-anchor="start">catchup=False</text>
    <circle cx="180" cy="146" r="15" fill="none" stroke="#3a4154" stroke-width="1.5"/>
    <circle cx="300" cy="146" r="15" fill="none" stroke="#3a4154" stroke-width="1.5"/>
    <circle cx="420" cy="146" r="15" fill="#4f6df5"/><text x="420" y="150" fill="#fff" font-size="12" text-anchor="middle">✓</text>
    <text x="300" y="176" fill="#9aa4b2" font-size="10" text-anchor="middle">只跑最近的一個(6/17)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同樣的 start_date,catchup=True 會把歷史區間一次補完;False 只跑最近一個</figcaption>
</figure>

`catchup` 的**預設值是 `True`**(由設定 `catchup_by_default` 控制)。所以如果你把 `start_date` 設在三個月前、又沒關 catchup,一啟用 DAG 就會瞬間排出近百個 run —— 這就是 [[airflow-first-dag|上一篇]]叫你先 `catchup=False` 的原因。

## backfill:刻意回補,跟 catchup 不一樣

- **catchup**:啟用 DAG 時**自動**補跑錯過的區間。
- **backfill**:你**刻意**去重跑某段歷史區間(改了邏輯要重算、或某天資料當初壞了)。用 CLI:

```bash
airflow dags backfill daily_report \
  --start-date 2026-06-01 --end-date 2026-06-07
```

兩者能成立的前提都一樣:**task 必須冪等**(可重跑不出錯)—— 這正是 [[airflow-intro|第一篇]]強調的心智。

## 把區間用對:run 該吃自己那段資料

最後一塊拼圖:task 裡要用 **區間時間**決定處理哪段資料,**絕不要用 `datetime.now()`**。這樣同一個 run 不管是即時跑、補跑、還是重跑,結果都一致。

```python
from airflow.decorators import dag, task
from datetime import datetime


@dag(
    schedule="@daily",
    start_date=datetime(2026, 6, 1),   # 靜態起點
    catchup=False,
    tags=["scheduling"],
)
def daily_report():

    @task
    def process(**context):
        start = context["data_interval_start"]   # = logical_date
        end = context["data_interval_end"]
        # 用「區間」決定要處理哪天的資料,而不是 now()
        partition = start.strftime("%Y-%m-%d")
        print(f"處理區間 {start} ~ {end},覆寫分區 {partition}")

    process()


daily_report()
```

(傳統 Operator 裡則用模板變數:`{{ ds }}` = 區間起點的 `YYYY-MM-DD`、`{{ data_interval_start }}`、`{{ data_interval_end }}`。)

> **Airflow 3.x 小提醒**:`execution_date` 已正式移除,一律用 `logical_date`;而且 3.x 裡**手動觸發**的 run 可能沒有資料區間(`logical_date` 為 `None`),所以別在程式裡假設它一定存在 —— 真要用區間,以排程觸發為準。

## 反思

### 「run 代表區間、在區間結束才跑」是整個 Airflow 的鑰匙

我認為這是學 Airflow 投報率最高的一個觀念。一旦你不再把 `logical_date` 讀成「執行時間」,而是「**這批 run 負責的那段資料的起點**」,後面所有看似奇怪的行為(為什麼半夜才跑、為什麼 6/18 的報表 logical_date 是 6/18 卻在 6/19 出現)就全部通了。我看過太多人卡在這、甚至在 task 裡硬用 `now()` 去算「今天」,結果一 backfill 整個資料就錯亂。

### `catchup` 預設 True 是個甜蜜陷阱

它預設 True 是有道理的(資料管線本來就該補齊歷史),但對「邊學邊試」或「臨時補個 DAG」的人來說,配上一個放在過去的 `start_date`,就是一場 run 海嘯。我的習慣是:**新 DAG 一律先寫死 `catchup=False`**,等到我真的想要它補歷史、而且確認 task 冪等([[airflow-intro|第一篇]]那條紀律)時,才有意識地打開。預設值幫你做的決定,往往不是你當下要的決定。

### 把 `now()` 趕出 task,是可重跑的根本

這點跟 [[airflow-intro|第一篇]]的冪等、以及之後會寫的可靠性是同一件事的不同面向:**run 處理哪段資料,應該由它的 data interval 決定,而不是由「現在幾點」決定**。做到這件事,backfill、重試、災難重跑才會給出一致結果;做不到,你的 pipeline 就永遠只能「當下跑剛好對」,一回頭補資料就爆。
