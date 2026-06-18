---
title: "Apache Airflow 是什麼?從 cron 到工作流程編排"
date: 2026-06-14
category: tech
tags:
  - airflow
  - data-engineering
  - orchestration
series: "Airflow 學習筆記"
seriesOrder: 1
comments: true
draft: true
---
## Airflow 是什麼

一句話:**Apache Airflow 是用 Python 把「一連串有相依關係、要定時執行、失敗要能重試與監控」的工作編排起來的工具**。它最初由 Airbnb 在 2014 年開發,現在是 Apache 的頂級專案,核心理念是 **workflows as code** —— 你的流程不是設定在某個 UI 表單裡,而是寫成 Python 程式,能版控、能 code review、能測試。

最典型的使用場景是**資料工程的 ETL / 報表 / 對帳**:每天定時把資料從各來源拉出來、清洗、寫進資料倉儲,中間任何一步失敗都要看得到、能重跑。

### 為什麼不直接用 cron?

很多排程一開始都是 cron 一行解決。但當工作變多、彼此有相依,cron 就會露出破綻。把兩者攤開對照:

| 需求 | cron | Airflow |
|---|---|---|
| 定時觸發 | ✅ | ✅ |
| 任務 A 成功後才跑 B | ❌(只能 `sleep` 賭時間) | ✅ 明確相依 |
| 失敗自動重試 | ❌ | ✅ 可設次數/間隔 |
| 補跑過去某一天(backfill) | ❌ | ✅ |
| 一眼看出哪個 task 卡住/失敗 | ❌(SSH 進去翻 log) | ✅ Web UI |
| 失敗告警 | 自己接 | ✅ 內建 |
| 流程版控、review | ❌ | ✅(它就是 Python) |

cron 是「時間到、跑一個指令」;Airflow 是「**一張有相依的任務圖,定時被觸發,而且每一步都看得到、控得住**」。

### 核心概念

| 概念 | 是什麼 |
|---|---|
| **DAG** | 有向無環圖 —— 就是「一個工作流程」,由多個 task 與它們的相依組成,不能有循環 |
| **Task** | 流程裡的一個工作節點 |
| **Operator** | task 的模板:`PythonOperator`、`BashOperator`、各種 `Sensor`… |
| **TaskFlow API** | 用 `@task` 裝飾器把普通 Python 函式變成 task 的現代寫法 |
| **Scheduler** | 解析 DAG,在「排程到期 + 相依滿足」時觸發 task |
| **Executor / Workers** | 決定 task 在哪、怎麼跑(Local / Celery / Kubernetes) |
| **Metadata DB** | 存所有 DAG / task 的狀態與歷史(通常是 Postgres) |
| **Web UI** | 視覺化流程、看狀態、看 log、手動觸發 |
| **XCom** | task 之間傳遞**少量**資料的機制 |

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 480 200" role="img" aria-label="Airflow DAG:擷取後分流清洗,再匯合載入" style="width:100%;max-width:560px;height:auto;margin:0 auto;">
    <defs><marker id="ah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="120" y1="90" x2="166" y2="60" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#ah)"/>
    <line x1="120" y1="110" x2="166" y2="140" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#ah)"/>
    <line x1="292" y1="60" x2="340" y2="90" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#ah)"/>
    <line x1="292" y1="140" x2="340" y2="110" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#ah)"/>
    <rect x="22" y="78" width="98" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="71" y="105" fill="#e6e6e6" font-size="14" text-anchor="middle">extract</text>
    <rect x="168" y="38" width="124" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="230" y="65" fill="#e6e6e6" font-size="13" text-anchor="middle">transform_A</text>
    <rect x="168" y="118" width="124" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="230" y="145" fill="#e6e6e6" font-size="13" text-anchor="middle">transform_B</text>
    <rect x="342" y="78" width="98" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="391" y="105" fill="#e6e6e6" font-size="14" text-anchor="middle">load</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一個 DAG:extract 跑完分流給兩個清洗任務平行跑,再匯合到 load。箭頭就是相依</figcaption>
</figure>

箭頭就是相依關係,Scheduler 會自動依這張圖決定「誰現在可以跑」:`transform_A`、`transform_B` 要等 `extract` 成功才會開始,而 `load` 要等兩個清洗都完成。

### 架構:背後是誰在動

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 240" role="img" aria-label="Airflow 架構:DAG 檔、Scheduler、Workers、Web UI 與 Metadata DB" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="142" y1="52" x2="186" y2="52" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#ar)"/>
    <line x1="332" y1="52" x2="386" y2="52" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#ar)"/>
    <line x1="262" y1="76" x2="312" y2="158" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#ar)"/>
    <line x1="452" y1="76" x2="416" y2="158" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#ar)"/>
    <line x1="142" y1="183" x2="246" y2="183" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#ar)"/>
    <rect x="20" y="30" width="122" height="44" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="81" y="51" fill="#e6e6e6" font-size="12.5" text-anchor="middle">DAG 檔 (.py)</text>
    <text x="81" y="66" fill="#9aa4b2" font-size="10" text-anchor="middle">你寫的流程</text>
    <rect x="188" y="30" width="144" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="260" y="57" fill="#e6e6e6" font-size="13" text-anchor="middle">Scheduler</text>
    <rect x="388" y="30" width="132" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="454" y="51" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Executor</text>
    <text x="454" y="66" fill="#9aa4b2" font-size="10" text-anchor="middle">/ Workers</text>
    <rect x="20" y="160" width="122" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="81" y="188" fill="#e6e6e6" font-size="13" text-anchor="middle">Web UI</text>
    <rect x="248" y="158" width="224" height="48" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="2"/>
    <text x="360" y="180" fill="#e6e6e6" font-size="13" text-anchor="middle">Metadata DB</text>
    <text x="360" y="196" fill="#9aa4b2" font-size="10" text-anchor="middle">所有狀態的真相來源</text>
    <text x="164" y="44" fill="#9aa4b2" font-size="9.5" text-anchor="middle">解析</text>
    <text x="359" y="44" fill="#9aa4b2" font-size="9.5" text-anchor="middle">派送</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Scheduler 解析 DAG、派任務給 Workers;狀態全寫進 Metadata DB,Web UI 從 DB 讀來顯示</figcaption>
</figure>

- **Scheduler** 持續掃描 DAG 檔,把「到期且相依滿足」的 task 寫進 Metadata DB,並透過 Executor 派送出去。
- **Workers** 真正執行 task,把結果與狀態寫回 DB。
- **Web UI** 從 DB 讀資料把流程畫給你看,也能手動觸發或重跑。
- **Metadata DB** 是整個系統的**真相來源** —— 所有狀態都在這裡,所以它掛了 Airflow 就瞎了。

### 排程的兩個心智轉變

1. **冪等(idempotent)**:因為會重試、會 backfill,**同一個 task 用同樣參數重跑,結果必須一致**(例如「覆寫當日分區」而不是「append」)。這是寫 Airflow task 最重要的紀律。
2. **Airflow 是編排器,不是運算引擎**:它負責「叫誰在什麼時候做事」,真正的重運算該推給 Spark、SQL 倉儲或外部服務。把幾 GB 資料讀進 task 裡用 pandas 硬算,是最常見的誤用。

## Python 範例

### TaskFlow API(推薦的現代寫法)

```python
from datetime import datetime
from airflow.decorators import dag, task


@dag(
    schedule="0 3 * * *",            # 每天凌晨 3 點(cron 語法)
    start_date=datetime(2026, 1, 1),
    catchup=False,                   # 不自動回補過去未跑的排程
    tags=["etl"],
)
def daily_sales_etl():

    @task
    def extract() -> list[dict]:
        # 從來源(DB / API)拉出當日訂單
        return [{"order_id": 1, "amount": 100}, {"order_id": 2, "amount": 250}]

    @task
    def transform(rows: list[dict]) -> float:
        # 算出當日營收
        return sum(r["amount"] for r in rows)

    @task
    def load(total: float) -> None:
        # 寫進報表 / 資料倉儲(這裡用 print 示意)
        print(f"今日營收:{total}")

    load(transform(extract()))       # 相依關係由「函式呼叫」自然表達


daily_sales_etl()
```

相依關係不用額外宣告 —— `load(transform(extract()))` 這個函式呼叫本身就表達了 `extract → transform → load`,而且回傳值會**自動透過 XCom 傳遞**給下一個 task。這就是 TaskFlow API 好用的地方:讀起來像普通 Python,Airflow 在背後幫你接線。

### 傳統 Operator 寫法

```python
from datetime import datetime
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator


def _check_quality() -> None:
    # 做資料品質檢查,不通過就 raise 讓這個 task 失敗
    ...


with DAG(
    dag_id="report_pipeline",
    schedule="@daily",
    start_date=datetime(2026, 1, 1),
    catchup=False,
) as dag:
    pull = BashOperator(task_id="pull_data", bash_command="python pull.py")
    check = PythonOperator(task_id="check_quality", python_callable=_check_quality)
    notify = BashOperator(task_id="notify", bash_command="echo done")

    pull >> check >> notify          # 用 >> 串出相依:拉資料 → 檢查 → 通知
```

`pull >> check >> notify` 裡的 `>>` 就是在串相依:先拉資料,品質檢查通過了,才發通知。任何一步失敗,後面就不會跑,而且會在 Web UI 上標紅。兩種寫法可以混用(TaskFlow 的 task 也能用 `>>` 跟 Operator 接)。

## 反思

### 多數團隊其實還不需要 Airflow

誠實說,大部分排程用 cron 加一支寫好的 script 就夠了。真正該導入 Airflow 的訊號很具體:當你開始「**為了今天報表沒出來而 SSH 進機器翻 log**」、當「**上游抓資料失敗、下游卻照樣吃到舊資料算出錯的數字**」、當排程多到沒人說得清彼此的相依 —— 這時 Airflow 帶來的「可視化 + 相依 + 重試」才真正划算。在痛點出現之前就上,只是把複雜度提早扛上身。

### 冪等是在替未來的自己省麻煩

我認為 Airflow 最痛的坑都不是它本身,而是 **task 不冪等**:重跑一次就重複入帳、backfill 一段時間就把資料灌成兩倍。所以原則是每個 task 一律設計成「能安全重跑」—— 用 upsert、用「覆寫某個分區」,而不是盲目 append。這條紀律比任何 Airflow 技巧都值錢,因為會重試、會回補本來就是這套工具的前提。

### 維運不是免費的

自架 Airflow 要顧 scheduler、metadata DB、worker,還有 DAG 解析效能(DAG 檔的 top-level 不要放重程式碼,否則每次掃描都被拖慢)。團隊不大的話,我會優先考慮 managed 版本(Cloud Composer / MWAA / Astronomer),把維運外包,人力花在真正的 pipeline 邏輯上。工具是要讓團隊產出更好,而不是養出一個新的維運負擔 —— 這點跟我看待任何基礎設施的態度一致:**先確定痛點,再決定要不要扛這份複雜度**。
