---
title: "跑起第一個 Airflow:Docker 環境 + 你的第一個 DAG"
date: 2026-06-16
category: tech
tags:
  - airflow
  - docker
series: "Airflow 學習筆記"
seriesOrder: 2
comments: true
draft: false
---
[[airflow-intro|上一篇]]把 Airflow 的概念與架構講清楚了;這篇動手把它**在本機跑起來**,寫出第一個 DAG,並在 Web UI 上看著它跑完。目標很單純:從零到「我親眼看到自己的 DAG 在介面上變綠」。

## 兩種起法:先選一個

| 方式 | 指令 | 適合 |
|---|---|---|
| **`airflow standalone`** | `pip install apache-airflow` 後一行啟動 | 只想**快速摸 DAG**、不在意元件 |
| **官方 Docker Compose** | 一份 compose 檔起整套 | 想看到**真實多元件架構**(scheduler / worker / DB) |

學習階段我推薦**直接用 Docker Compose** —— 它把 [[airflow-intro|上一篇]]講的 Scheduler、Worker、Metadata DB 全變成你看得到、摸得到的容器,概念才會落地。

## 用 Docker Compose 起 Airflow

```bash
# 1. 抓官方 compose 檔
curl -LfO 'https://airflow.apache.org/docs/apache-airflow/stable/docker-compose.yaml'

# 2. 建掛載資料夾,並設定 UID(Linux/macOS)
mkdir -p ./dags ./logs ./plugins ./config
echo "AIRFLOW_UID=$(id -u)" > .env

# 3. 初始化:建 metadata DB、建 admin 帳號
docker compose up airflow-init

# 4. 起整套(背景執行)
docker compose up -d
```

跑完打開 <code>http://localhost:8080</code>,用預設帳密 `airflow` / `airflow` 登入,就看到 Airflow 的 Web UI 了。這份 compose 會起這些服務:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 220" role="img" aria-label="Docker Compose 本機 Airflow:你的 dags 資料夾掛載進容器,瀏覽器連 8080" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="f1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="134" y1="64" x2="194" y2="64" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#f1)"/>
    <line x1="326" y1="64" x2="398" y2="64" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#f1)"/>
    <line x1="261" y1="88" x2="261" y2="150" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#f1)"/>
    <line x1="468" y1="150" x2="468" y2="90" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#f1)"/>
    <rect x="14" y="42" width="120" height="46" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="74" y="62" fill="#e6e6e6" font-size="12" text-anchor="middle">./dags/*.py</text>
    <text x="74" y="78" fill="#9aa4b2" font-size="9.5" text-anchor="middle">你寫的 DAG</text>
    <rect x="196" y="42" width="130" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="261" y="69" fill="#e6e6e6" font-size="13" text-anchor="middle">Scheduler</text>
    <rect x="400" y="42" width="140" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="470" y="63" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Web UI</text>
    <text x="470" y="79" fill="#9aa4b2" font-size="9.5" text-anchor="middle">:8080</text>
    <rect x="196" y="152" width="130" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="261" y="179" fill="#e6e6e6" font-size="13" text-anchor="middle">Worker</text>
    <rect x="400" y="152" width="140" height="46" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="470" y="173" fill="#e6e6e6" font-size="12.5" text-anchor="middle">瀏覽器</text>
    <text x="470" y="189" fill="#9aa4b2" font-size="9.5" text-anchor="middle">你</text>
    <text x="164" y="56" fill="#9aa4b2" font-size="9.5" text-anchor="middle">掛載/解析</text>
    <text x="362" y="56" fill="#9aa4b2" font-size="9.5" text-anchor="middle">顯示</text>
    <text x="286" y="124" fill="#9aa4b2" font-size="9.5" text-anchor="middle">派送任務</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">你本機的 ./dags 資料夾被掛載進容器;Scheduler 解析它、派任務給 Worker;你用瀏覽器連 :8080 操作</figcaption>
</figure>

(背後還有 Postgres 當 metadata DB、Redis 當 Celery 的 broker —— 這份官方 compose 用的是 CeleryExecutor,所以多了 worker 與 redis。)

## 寫你的第一個 DAG

在剛剛建的 `./dags/` 裡新增 `hello_airflow.py`:

```python
from datetime import datetime
from airflow.decorators import dag, task


@dag(
    schedule=None,                 # 先不排程,純手動觸發
    start_date=datetime(2026, 1, 1),
    catchup=False,                 # 別自動回補過去(學習期務必設 False)
    tags=["tutorial"],
)
def hello_airflow():

    @task
    def say_hello() -> str:
        return "hello"

    @task
    def shout(word: str) -> None:
        print(f"{word.upper()}!")   # 在 task log 裡會看到 HELLO!

    shout(say_hello())


hello_airflow()
```

存檔後**什麼都不用做** —— Scheduler 每隔一小段時間會掃 `./dags/`,大約 30 秒內,`hello_airflow` 就會自己出現在 Web UI 的 DAG 列表裡。這個「改檔案 → 自動出現」的瞬間,就是 Airflow 從抽象變具體的時刻。

## 在 Web UI 跑一輪

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 104" role="img" aria-label="第一個 DAG 的生命週期:放進 dags、UI 出現、觸發、看圖與 log" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="f2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="126" y1="52" x2="150" y2="52" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#f2)"/>
    <line x1="280" y1="52" x2="304" y2="52" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#f2)"/>
    <line x1="402" y1="52" x2="426" y2="52" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#f2)"/>
    <rect x="14" y="30" width="112" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="70" y="57" fill="#e6e6e6" font-size="12.5" text-anchor="middle">放進 dags/</text>
    <rect x="152" y="30" width="128" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="216" y="57" fill="#e6e6e6" font-size="12.5" text-anchor="middle">UI 自動出現</text>
    <rect x="306" y="30" width="96" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="354" y="57" fill="#e6e6e6" font-size="12.5" text-anchor="middle">▶ 觸發</text>
    <rect x="428" y="30" width="104" height="44" rx="8" fill="#4f6df5" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="480" y="57" fill="#ffffff" font-size="12.5" text-anchor="middle">看 Graph/Log</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">第一個 DAG 的完整一輪:存檔 → 自動出現 → 手動觸發 → 看執行圖與 log</figcaption>
</figure>

1. **打開開關**:DAG 列表左邊有個 toggle,新 DAG 預設是暫停的,點亮它。
2. **手動觸發**:右邊的 ▶(Trigger DAG)按下去。
3. **看 Graph / Grid**:點進 DAG,Graph 檢視會看到 `say_hello → shout` 兩個方塊依序變綠。
4. **看 log**:點任一個 task → Logs,會看到 `shout` 印出的 `HELLO!`。
5. **重跑**:對 task 按 Clear,它會重新跑一次 —— 這就是 [[airflow-intro|上一篇]]說的「可重試」最直觀的體驗。

## 反思

### docker-compose 很適合「學」,但它不是 production

官方那份 compose 檔開頭就寫明 **"not suitable for production"**。它的價值是**讓你一次看到所有元件**(scheduler、worker、redis、postgres 全在那),對理解架構很棒;但它也很重,而且預設配置不是拿來上線的。我的建議:用它來「看懂整套怎麼運作」,真要部署再走 managed(MWAA / Astronomer)或正式的 K8s 部署 —— 別把學習用的 compose 直接搬上 production。

### 第一個坑幾乎都是「DAG 沒出現」

新手最常卡在「我存檔了,UI 卻沒出現我的 DAG」。九成是 **DAG 檔本身有 parse error** —— Scheduler 匯入失敗,DAG 自然不會出現。解法很固定:看 UI 上方的 **Import Errors**,或去翻 scheduler 的 log。記住 [[airflow-intro|上一篇]]提過的:DAG 檔的 top-level 會被反覆 import,所以那層不要放會出錯或很慢的程式碼。

### `catchup=False` 是學習期的保命符

`start_date` 設在過去 + `catchup=True`(預設)會讓 Airflow 一啟用就**狂補跑**從 start_date 到現在的每一個排程,瞬間塞爆。學習階段一律先 `schedule=None` 或 `catchup=False`,等真的搞懂 [[airflow-intro|排程模型]]再開 —— 這也正好是下一篇要拆解的主題。
