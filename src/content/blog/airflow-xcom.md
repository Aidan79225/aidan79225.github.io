---
title: "Airflow 任務間怎麼傳資料:XCom、TaskFlow 進階與 params"
date: 2026-06-21
category: tech
tags:
  - airflow
  - data-engineering
  - xcom
series: "Airflow 學習筆記"
seriesOrder: 4
comments: true
draft: false
---
[[airflow-scheduling|上一篇]]講完排程,這篇處理一個很實際的問題:**一個 task 算出來的東西,怎麼交給下一個 task?** Airflow 的答案是 XCom,而 TaskFlow 把它包得幾乎看不見。順帶也講 params —— 在觸發時把參數塞進整個 DAG run。

## XCom:任務之間的小型訊息板

XCom(cross-communication)就是**讓 task 互相傳遞「少量資料」的機制**。一個 task 把值 push 上去、另一個 task 再 pull 下來;這些值存在 Airflow 的 metadata DB 裡,像一塊大家共用的訊息板。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 180" role="img" aria-label="XCom:task A push 小資料到 metadata DB,task B pull 下來" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="x1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="120" y1="64" x2="206" y2="64" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#x1)"/>
    <line x1="334" y1="64" x2="420" y2="64" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#x1)"/>
    <rect x="20" y="42" width="100" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="70" y="69" fill="#e6e6e6" font-size="13" text-anchor="middle">task A</text>
    <rect x="208" y="36" width="126" height="56" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="2"/>
    <text x="271" y="60" fill="#e6e6e6" font-size="12.5" text-anchor="middle">XCom 訊息板</text>
    <text x="271" y="77" fill="#9aa4b2" font-size="9.5" text-anchor="middle">(metadata DB)</text>
    <rect x="422" y="42" width="100" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="472" y="69" fill="#e6e6e6" font-size="13" text-anchor="middle">task B</text>
    <text x="163" y="56" fill="#9aa4b2" font-size="9.5" text-anchor="middle">push</text>
    <text x="377" y="56" fill="#9aa4b2" font-size="9.5" text-anchor="middle">pull</text>
    <text x="271" y="126" fill="#9aa4b2" font-size="11" text-anchor="middle">只放「小東西」:id、筆數、旗標、檔案路徑…</text>
    <text x="271" y="146" fill="#9aa4b2" font-size="11" text-anchor="middle">大資料請寫到 S3 / 檔案,XCom 只傳「路徑」</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">XCom 是存在 metadata DB 的小型訊息板;適合傳 id/筆數/路徑,不適合傳大資料本身</figcaption>
</figure>

最重要的一條紀律:**XCom 只放小東西**。它存在 metadata DB,你要是把幾百 MB 的 DataFrame 塞進去,DB 會被灌爆、整個排程都被拖慢。大資料的正確做法是寫到外部儲存(S3、檔案系統),XCom 只傳那個**路徑**。

## TaskFlow 把 XCom 藏起來了

用傳統 Operator 時,你得手動 push / pull:

```python
def push_count(**context):
    context["ti"].xcom_push(key="count", value=120)

def use_count(**context):
    n = context["ti"].xcom_pull(task_ids="push_count", key="count")
    print(f"共 {n} 筆")
```

而 [[airflow-first-dag|TaskFlow]](`@task`)把這整套自動化:**函式的回傳值會自動變成 XCom,下一個 task 用「呼叫」就把它接過來**。

```python
from airflow.decorators import dag, task
from datetime import datetime


@dag(schedule=None, start_date=datetime(2026, 1, 1), catchup=False, tags=["xcom"])
def sales_flow():

    @task
    def extract() -> list[dict]:
        return [{"amount": 100}, {"amount": 250}]

    @task
    def total(rows: list[dict]) -> int:
        return sum(r["amount"] for r in rows)

    @task
    def report(amount: int) -> None:
        print(f"今日營收:{amount}")

    report(total(extract()))   # 呼叫 = 自動 push/pull,相依也一併建好


sales_flow()
```

`report(total(extract()))` 這一行同時做了三件事:建立相依關係、把 `extract` 的回傳值經 XCom 傳給 `total`、再把 `total` 的結果傳給 `report`。你完全不用碰 `xcom_push`/`xcom_pull`。

### multiple_outputs:把一個 dict 拆成多個 XCom

如果一個 task 回傳 dict,加上 `multiple_outputs=True`,Airflow 會把每個 key 拆成獨立的 XCom,下游就能各取所需:

```python
@task(multiple_outputs=True)
def fetch() -> dict:
    return {"rows": 120, "source": "orders"}

@task
def summarize(rows: int, source: str) -> None:
    print(f"{source}:{rows} 筆")

info = fetch()
summarize(rows=info["rows"], source=info["source"])
```

## params:在觸發時把參數塞進整個 run

XCom 是 run **執行期間**任務之間傳的資料;params 則是**整個 DAG run 的輸入參數**,在定義時給預設值、觸發時可覆寫。適合「同一個 DAG,想用不同門檻 / 日期手動跑一次」。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 168" role="img" aria-label="params:觸發時帶設定,整個 run 的 task 都讀得到" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="p1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="186" y1="58" x2="232" y2="58" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#p1)"/>
    <line x1="360" y1="58" x2="406" y2="58" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#p1)"/>
    <rect x="16" y="34" width="170" height="48" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="101" y="55" fill="#e6e6e6" font-size="12" text-anchor="middle">Trigger w/ config</text>
    <text x="101" y="72" fill="#9aa4b2" font-size="10" text-anchor="middle">{threshold: 200}</text>
    <rect x="234" y="34" width="126" height="48" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="2"/>
    <text x="297" y="55" fill="#e6e6e6" font-size="12" text-anchor="middle">DAG run</text>
    <text x="297" y="72" fill="#9aa4b2" font-size="10" text-anchor="middle">params.threshold</text>
    <rect x="408" y="34" width="116" height="48" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="466" y="62" fill="#e6e6e6" font-size="12" text-anchor="middle">每個 task 讀得到</text>
    <text x="270" y="120" fill="#9aa4b2" font-size="11" text-anchor="middle">沒帶設定就用 DAG 定義的預設值;UI「Trigger DAG w/ config」可覆寫</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">params 是整個 run 的輸入:定義時給預設,觸發時可覆寫,run 內每個 task 都讀得到</figcaption>
</figure>

```python
@dag(
    schedule=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    params={"threshold": 100, "dry_run": False},   # 預設值
)
def cleanup():

    @task
    def run(**context):
        threshold = context["params"]["threshold"]   # 讀這次 run 的參數
        dry_run = context["params"]["dry_run"]
        print(f"清掉低於 {threshold} 的資料(dry_run={dry_run})")

    run()


cleanup()
```

在 Web UI 用「**Trigger DAG w/ config**」就能填一段 JSON 覆寫這次的 `threshold`;傳統 Operator 裡也能用模板 `{{ params.threshold }}`。

## 四種「傳東西」的機制,別搞混

| 機制 | 是什麼 | 生命週期 / 範圍 |
|---|---|---|
| **XCom** | task 之間傳的小資料 | 單一 run 內,執行期產生 |
| **params** | 整個 run 的輸入參數 | 單一 run,觸發時決定 |
| **Variable** | 跨 DAG 的全域設定 | 全站長期,手動維護 |
| **Connection** | 連線資訊 / 密鑰(DB、S3…) | 全站長期,安全儲存 |

挑哪個,看「**這東西活多久、給誰用**」:這次 run 內任務間傳 → XCom;這次 run 的輸入旋鈕 → params;所有 DAG 共用的設定 → Variable;帳密端點 → Connection。

## 反思

### XCom 最大的坑,是拿它當資料管道

我看過最常見的誤用,就是把它當成搬資料的管子 —— 一個 task 讀進一大包資料、回傳給下一個 task,結果全部塞進 metadata DB。XCom 的設計初衷是「**留個小紙條**」:傳 id、傳筆數、傳一個檔案路徑。資料本體該落在 S3 或檔案系統,XCom 只負責告訴下游「東西放哪」。一旦把這條界線守住,metadata DB 就不會莫名其妙變慢、變肥。

### TaskFlow 很甜,但要知道甜在哪

`report(total(extract()))` 讀起來像普通 Python 函式呼叫,這正是它好用的地方;但也因為太自然,新手常忘了**背後其實是 push/pull 一趟 metadata DB**。我的習慣是:享受它的簡潔,但 debug 時心裡清楚「值是經 XCom 流動的」,卡住就去 UI 的 XCom 頁面直接看那一格存了什麼 —— 往往比讀 log 還快定位。

### params vs Variable:用錯了會痛

這兩個最容易混。我的判準很簡單:**會「每次 run 不一樣」的,用 params;所有 run 共用、偶爾才改的,用 Variable。** 把「這次要處理的門檻」放進 Variable,等於把單次輸入塞進全域狀態 —— 哪天兩個 run 同時要不同值就打架了。而且呼應 [[airflow-scheduling|排程那篇]]:一個 run 真正要處理「哪一段資料」,應該由 data interval 決定,不是靠人去改 Variable;params 比較適合拿來做「手動補跑、臨時換門檻」這種有意識的覆寫。
