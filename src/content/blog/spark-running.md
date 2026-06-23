---
title: "把 Spark 跑起來:從本機到叢集與 managed 平台"
date: 2026-06-23
category: tech
tags:
  - spark
  - data-engineering
  - deployment
series: "Spark 學習筆記"
seriesOrder: 4
comments: true
draft: false
---
前三篇都在講 Spark **怎麼寫、怎麼跑得快**([[spark-intro|是什麼]]、[[spark-dataframe|DataFrame 實戰]]、[[spark-shuffle|shuffle 調校]])。但同一段程式碼,在你筆電上跑、跟在一個幾十台機器的叢集上跑,中間到底發生什麼事?這篇講 **runtime 與部署** —— 從本機單機,一路到 `spark-submit`、cluster 模式,再到你多半真正會用的 managed 平台。

## 先搞懂執行架構:Driver、Executor、Cluster Manager

不管跑在哪,一個 Spark 應用永遠是這三個角色:

- **Driver**:跑你的 `main` 程式、把轉換編成 DAG、切 stage 與 task,然後**排程**這些 task。它是大腦,但不做粗活。
- **Executor**:真正幹活的 worker 行程,執行 task、把 [[spark-shuffle|cache]] 的資料存在自己的記憶體裡。一個應用會有很多個 executor 平行跑。
- **Cluster Manager**:資源的房東 —— Driver 跟它要 CPU 跟記憶體,它去機器上把 executor 開起來。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 520 232" role="img" aria-label="Spark 執行架構:Driver 向 Cluster Manager 申請資源,Cluster Manager 啟動 Executor,Driver 直接派 task 給 Executor" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rn1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="186" y="12" width="148" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="260" y="33" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Driver</text>
    <text x="260" y="48" fill="#9aa4b2" font-size="9.5" text-anchor="middle">排程 task</text>
    <line x1="260" y1="56" x2="260" y2="86" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#rn1)"/>
    <text x="330" y="75" fill="#9aa4b2" font-size="9.5" text-anchor="middle">① 申請資源</text>
    <rect x="176" y="88" width="168" height="40" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.5" stroke-dasharray="4 3"/>
    <text x="260" y="113" fill="#e6e6e6" font-size="12" text-anchor="middle">Cluster Manager</text>
    <line x1="200" y1="128" x2="92" y2="170" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#rn1)"/>
    <line x1="260" y1="128" x2="260" y2="170" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#rn1)"/>
    <line x1="320" y1="128" x2="428" y2="170" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#rn1)"/>
    <text x="150" y="150" fill="#9aa4b2" font-size="9.5" text-anchor="middle">② 啟動</text>
    <rect x="24" y="172" width="130" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="89" y="193" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Executor</text>
    <text x="89" y="208" fill="#9aa4b2" font-size="9" text-anchor="middle">task + cache</text>
    <rect x="195" y="172" width="130" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="260" y="193" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Executor</text>
    <text x="260" y="208" fill="#9aa4b2" font-size="9" text-anchor="middle">task + cache</text>
    <rect x="366" y="172" width="130" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="431" y="193" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Executor</text>
    <text x="431" y="208" fill="#9aa4b2" font-size="9" text-anchor="middle">task + cache</text>
    <path d="M186 40 C 120 70, 70 120, 80 168" fill="none" stroke="#4f6df5" stroke-width="1.3" stroke-dasharray="3 3" marker-end="url(#rn1)"/>
    <text x="92" y="110" fill="#4f6df5" font-size="9.5" text-anchor="middle">③ 派 task</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Driver 向 Cluster Manager 要資源、Cluster Manager 啟動 Executor;之後 Driver 直接把 task 派給 Executor、收回結果</figcaption>
</figure>

**換部署環境,換的只是 Cluster Manager 跟 Driver 擺哪裡 —— 你的轉換程式碼幾乎不用動。** 這是底下所有變化的主軸。

## 本機:一台機器就能跑

最簡單的起點:`pip install pyspark`,master 設成 `local[*]`。這時根本沒有真叢集 —— Driver 跟 Executor 全擠在**同一個 JVM**,用本機的 N 條執行緒模擬平行。

```python
from pyspark.sql import SparkSession

spark = (SparkSession.builder
         .master("local[*]")     # * = 用滿所有 CPU 核心
         .appName("dev")
         .getOrCreate())
```

它適合開發、測試、跑小資料。**別小看它** —— 幾 GB 以內的資料、寫邏輯、除錯,本機模式完全夠用,而且省掉一整套叢集的麻煩。會用到叢集,是因為資料大到一台裝不下、算不完,不是因為「要練 Spark」。

## 提交到叢集:`spark-submit`

當資料真的要上叢集,提交的統一入口是 `spark-submit`:你把程式寫成一個 `.py`,連同資源需求一起丟出去。

```bash
spark-submit \
  --master yarn \
  --deploy-mode cluster \
  --num-executors 10 \
  --executor-cores 4 \
  --executor-memory 8g \
  jobs/daily_etl.py
```

幾個最常用的旗標:`--master`(交給哪個 Cluster Manager)、`--deploy-mode`(Driver 擺哪,見下節)、以及 `--num-executors` / `--executor-cores` / `--executor-memory` 這組決定你跟叢集要多少資源。**這幾個數字直接決定平行度與成本**,是調效能之外最該搞懂的旋鈕。

## `client` vs `cluster`:Driver 到底跑在哪

`--deploy-mode` 是實務最常搞混、也最容易踩坑的一個設定。差別只有一句:**Driver 跑在你提交的機器上,還是跑進叢集裡。**

| | `client` 模式 | `cluster` 模式 |
|---|---|---|
| Driver 位置 | 你提交的那台(筆電 / edge node) | 叢集內某個節點 |
| 日誌 | 直接噴回你的終端機 | 要去叢集 / 平台撈 |
| 終端機關掉 | **作業跟著死** | 不受影響,繼續跑 |
| 適合 | 互動式、開發、`spark-shell` | 正式排程的生產作業 |

新手最常見的災難,就是在本機 `client` 模式下跑得好好的,搬到生產用排程器觸發時,要嘛 Driver 跟著 session 一起斷、要嘛找不到日誌。**生產作業幾乎都該用 `cluster` 模式** —— 讓 Driver 活在叢集裡,不依賴你那台會關機的機器。生產的觸發通常交給 [[airflow-scheduling|Airflow]] 之類的排程器,而它要的正是「提交完就不必掛著」的 `cluster` 模式。

## Cluster Manager 有哪幾種

`--master` 後面接的就是它。常見三種:

| Cluster Manager | 場景 |
|---|---|
| **Standalone** | Spark 自帶的簡易管理器,小叢集 / 自架最快上手 |
| **YARN** | 跟 Hadoop 生態綁定,傳統企業大數據平台主流 |
| **Kubernetes** | 雲原生時代的主流,Spark 以 pod 形式跑,彈性伸縮好做 |

(早年還有 Mesos,現已式微。)選哪個多半不是你決定的 —— 取決於公司既有的基礎建設。

## Managed 平台:你多半不會自己架叢集

上面這些聽起來很硬,但坦白說:**多數團隊根本不該自己從零架 Spark 叢集**。雲上的 managed 平台幫你把叢集開關、自動伸縮、版本維護全包了,你只管把作業或 notebook 丟上去。

| 平台 | 一句話 |
|---|---|
| **Databricks** | Spark 原班人馬做的託管平台,notebook + 自動叢集 + lakehouse 一條龍 |
| **AWS EMR** | AWS 上的託管 Hadoop/Spark 叢集,跟 S3、IAM 整合 |
| **AWS Glue** | Serverless Spark,連叢集都不用管,適合純 ETL |
| **GCP Dataproc** | GCP 上的託管 Spark/Hadoop,啟動快、按秒計費 |

它們之間的取捨,本質是「**你想管多少**」:從 EMR(還看得到叢集)到 Glue(連叢集都被抽象掉)。但不變的是 —— 你前三篇學的那套 DataFrame 與 shuffle 知識,在每個平台上都照用。

## 反思

### Spark 最漂亮的抽象,是「程式碼跟跑在哪解耦」

寫完這篇我更確定一件事:Spark 真正值錢的設計,是**同一段轉換邏輯,從本機 `local[*]` 到十台機器的 YARN 叢集,幾乎一個字都不用改** —— 變的只是 `--master` 跟 `--deploy-mode`。這讓我可以在筆電上用小資料把邏輯寫對、測完,再原封不動丟上叢集放大。能享受這個好處的前提,是別在程式裡寫死任何跟環境綁定的東西(路徑、平行度、資源),把那些通通留給提交時的參數。

### `deploy-mode` 是我最常提醒人的坑

「本機跑得動、上生產就炸」十次有八次跟 `client`/`cluster` 脫不了關係 —— Driver 擺錯地方,作業跟著終端機一起死,或日誌憑空消失。我的原則很簡單:**互動除錯用 `client`,排程上線一律 `cluster`**。這跟 [[airflow-scheduling|Airflow]] 那篇講的冪等與可重跑是同一套思路 —— 生產作業不能依賴「某個人的某台機器剛好開著」。

### 別為了用 Spark 而架叢集

跟我看 [[airflow-intro|Airflow]]、看任何基礎建設的態度一模一樣:**先確認痛點,再上重武器。** 資料還在幾 GB,本機 PySpark 甚至 [[dbt-intro|dbt]] + 倉儲就解決了,硬架一個叢集只是給自己找維運。真的撞到「單機裝不下、算不完」這道牆,也優先選 managed 平台 —— 把架叢集、調 YARN、修 OOM 的力氣,省下來花在把資料邏輯做對。自架叢集是手段,不是成就。
