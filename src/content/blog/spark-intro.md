---
title: "Apache Spark 是什麼?一篇搞懂分散式資料處理"
date: 2026-06-14
category: tech
tags:
 - spark
 - data-engineering
 - pyspark
series: "Spark 學習筆記"
seriesOrder: 1
comments: true
draft: false
---
## Spark 是什麼

一句話:**Apache Spark 是一個把「大到單台機器裝不下、算不完」的資料,切成很多份、分散到一整個叢集上平行運算的引擎**。它源自 UC Berkeley(2009),2014 成為 Apache 專案;最大的賣點是**把資料放在記憶體裡運算**,對需要反覆讀同一份資料的工作(報表彙總、機器學習迭代)比老一代的 Hadoop MapReduce 快上許多。

你用 Python / SQL / Scala 寫一段看起來像在操作「一張大表」的程式,Spark 在背後把它拆成任務、分到幾十台機器上跑,再把結果收回來。

### 跟 pandas / 單機程式差在哪?

| 面向 | pandas(單機) | Spark(分散式) |
|---|---|---|
| 資料規模 | 受限於單台記憶體 | 可橫向擴展到整個叢集 |
| 運算方式 | 馬上執行 | **惰性**:先建計畫,碰到 action 才跑 |
| 平行度 | 單機(頂多多核) | 多機 × 多核,按**分區**平行 |
| 失敗復原 | 自己處理 | 內建(task 失敗自動重算) |
| 適合場景 | 幾 MB ~ 幾 GB | 幾十 GB ~ TB/PB |

重點不是「Spark 比較強」,而是**規模**:資料塞得進一台機器時,pandas / DuckDB / SQL 又快又簡單;只有當資料真的超過單機、或要橫向擴展時,Spark 的分散式機制才開始划算。

### 核心概念

| 概念 | 是什麼 |
|---|---|
| **Driver** | 跑你主程式的地方,建立 `SparkSession`、把程式編成執行計畫(DAG)、調度任務 |
| **Executor** | 散在叢集各節點上真正幹活的行程,持有資料**分區**、執行 task |
| **Cluster Manager** | 分配資源、決定 executor 開在哪(YARN / Kubernetes / Standalone) |
| **RDD** | 最底層的「彈性分散式資料集」,可容錯、可重算 |
| **DataFrame** | 有 schema 的分散式表格(PySpark 主力,推薦);背後有 Catalyst 最佳化器 |
| **Partition(分區)** | 資料被切成的小塊,平行運算的最小單位 |
| **Transformation** | `filter`、`select`、`groupBy`、`join`… **惰性**,只建計畫 |
| **Action** | `count`、`show`、`collect`、`write`… **觸發**整個計畫真的執行 |
| **Shuffle** | `groupBy` / `join` 等需要跨分區搬資料的動作 —— 最貴的操作 |

### 架構:程式跑起來誰在動

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 540 230" role="img" aria-label="Spark 架構:Driver 透過 Cluster Manager 調度多個 Executor" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <defs><marker id="sp" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <line x1="186" y1="46" x2="336" y2="46" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#sp)"/>
 <line x1="96" y1="70" x2="92" y2="158" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#sp)"/>
 <line x1="120" y1="70" x2="262" y2="158" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#sp)"/>
 <line x1="140" y1="70" x2="432" y2="158" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#sp)"/>
 <rect x="28" y="24" width="158" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="107" y="44" fill="#e6e6e6" font-size="13" text-anchor="middle">Driver</text>
 <text x="107" y="60" fill="#9aa4b2" font-size="10" text-anchor="middle">SparkSession · DAG</text>
 <rect x="338" y="24" width="174" height="46" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
 <text x="425" y="44" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Cluster Manager</text>
 <text x="425" y="60" fill="#9aa4b2" font-size="10" text-anchor="middle">YARN / K8s</text>
 <rect x="30" y="160" width="124" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="92" y="181" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Executor</text>
 <text x="92" y="197" fill="#9aa4b2" font-size="10" text-anchor="middle">tasks + 分區</text>
 <rect x="200" y="160" width="124" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="262" y="181" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Executor</text>
 <text x="262" y="197" fill="#9aa4b2" font-size="10" text-anchor="middle">tasks + 分區</text>
 <rect x="370" y="160" width="124" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="432" y="181" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Executor</text>
 <text x="432" y="197" fill="#9aa4b2" font-size="10" text-anchor="middle">tasks + 分區</text>
 <text x="261" y="38" fill="#9aa4b2" font-size="9.5" text-anchor="middle">申請資源</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Driver 把計畫拆成 task,透過 Cluster Manager 取得資源,分派給各 Executor 按分區平行執行</figcaption>
</figure>

### 惰性求值:transformation vs action

Spark 最關鍵的心智模型:**你寫的一連串 transformation 不會馬上執行**,它只是在累積一張「要怎麼算」的計畫(DAG);直到你呼叫一個 **action**,Spark 才把整張計畫最佳化後丟到叢集上跑。

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 540 150" role="img" aria-label="Spark 惰性求值:前面都是 transformation,到 action 才執行" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <defs><marker id="sl" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <line x1="116" y1="52" x2="148" y2="52" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#sl)"/>
 <line x1="248" y1="52" x2="280" y2="52" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#sl)"/>
 <line x1="394" y1="52" x2="426" y2="52" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#sl)"/>
 <rect x="18" y="30" width="98" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="67" y="57" fill="#e6e6e6" font-size="13" text-anchor="middle">read</text>
 <rect x="150" y="30" width="98" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="199" y="57" fill="#e6e6e6" font-size="13" text-anchor="middle">filter</text>
 <rect x="282" y="30" width="112" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="338" y="57" fill="#e6e6e6" font-size="13" text-anchor="middle">groupBy</text>
 <rect x="428" y="30" width="104" height="44" rx="8" fill="#4f6df5" stroke="#4f6df5" stroke-width="1.5"/>
 <text x="480" y="57" fill="#ffffff" font-size="13" text-anchor="middle">count</text>
 <text x="199" y="96" fill="#9aa4b2" font-size="10" text-anchor="middle">transformation(惰性)</text>
 <text x="338" y="110" fill="#9aa4b2" font-size="10" text-anchor="middle">transformation</text>
 <text x="338" y="22" fill="#9aa4b2" font-size="9.5" text-anchor="middle">shuffle</text>
 <text x="480" y="96" fill="#4f6df5" font-size="10" text-anchor="middle">action 觸發執行</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">read → filter → groupBy 都只是建計畫;呼叫 count(action)才真正跑;groupBy 之間要 shuffle(跨分區搬資料)</figcaption>
</figure>

## Python(PySpark)範例

### DataFrame:像操作一張大表

```python
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

spark = SparkSession.builder.appName("sales").getOrCreate()

# 讀進來(可換成 parquet / jdbc / kafka…)
df = spark.read.csv("orders.csv", header=True, inferSchema=True)

# 一連串 transformation —— 全是惰性的,只是在累積「計畫」
daily = (
 df.filter(F.col("status") == "paid")
 .groupBy("date")
 .agg(F.sum("amount").alias("revenue"))
 .orderBy("date")
)

# action —— 到這一行才真正觸發整條 pipeline 在叢集上跑
daily.show()
```

`filter`、`groupBy`、`agg`、`orderBy` 全是 transformation,執行到那幾行其實**什麼都還沒算**;直到 `daily.show()` 這個 action,Spark 才把整張計畫交給 Catalyst 最佳化、再分到 executors 上執行。

### RDD:看清 transformation 與 action 的分界

```python
rdd = spark.sparkContext.parallelize([1, 2, 3, 4, 5])

# transformation(惰性,只是疊計畫)
doubled = rdd.map(lambda x: x * 2).filter(lambda x: x > 4)

# action(到這裡才觸發,把結果收回 Driver)
print(doubled.collect()) # [6, 8, 10]
```

`map` / `filter` 回傳的是「新的 RDD 計畫」而不是資料;`collect()` 才會真的執行,並把結果**收回 Driver**(所以 `collect()` 在大資料上很危險 —— 可能把整個叢集的資料灌爆單台 Driver 記憶體)。

## 反思

### 大部分人的「大數據」其實沒那麼大

我看過最常見的誤用,是資料才幾百 MB、幾 GB 就搬出 Spark。分散式不是免費的:JVM 啟動、叢集調度、序列化、shuffle 過網路 —— 這些固定成本,在資料塞得進一台機器時遠大於它省下的時間。**塞得進單機就用 pandas / Polars / DuckDB / SQL**,又快又好 debug;只有當資料真的超過單機、或要橫向擴展 throughput 時,Spark 才開始划算。先確認「資料真的大到一台裝不下」這個前提,再決定要不要扛這份複雜度 —— 跟我看 Airflow、看任何基礎設施的態度一樣。

### 真正要對付的成本是 shuffle

寫 Spark 的效能直覺,八成都在一件事上:**少 shuffle**。`groupBy`、`join`、`distinct` 這些寬依賴會把資料跨節點搬來搬去,是整個作業最慢的環節。實務上最有效的幾招都圍著它轉:能 `filter` 就先把資料變小再算、小表用 broadcast join 避免大 shuffle、注意分區數別過多或過少。把 shuffle 想清楚,比背一堆 API 有用得多。

### 惰性求值是雙面刃

惰性讓 Spark 能做全域最佳化,但也讓新手踩兩個坑:一是 **debug 時搞不清楚「到底哪一行才真的跑」**(答案是 action);二是**對同一條 pipeline 反覆呼叫 action**(例如先 `count()` 再 `show()`),每次都會從頭重算 —— 這時要用 `cache()` / `persist()` 把中間結果留住。理解「計畫 vs 執行」的分界,是寫對 Spark 的前提。

### 維運交給別人

跟 Airflow 一樣,自己養 Spark 叢集(資源調度、版本、調參)成本很高。多數團隊用 managed(Databricks / EMR / Glue)更划算,把力氣花在資料邏輯而不是顧叢集。工具是要放大團隊產出,不是讓你多一份維運債。
