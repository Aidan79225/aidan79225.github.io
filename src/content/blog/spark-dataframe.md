---
title: "Spark DataFrame 實戰:讀取、轉換、寫出與 Spark SQL"
date: 2026-06-21
category: tech
tags:
  - spark
  - pyspark
series: "Spark 學習筆記"
seriesOrder: 2
comments: true
draft: false
---
[[spark-intro|上一篇]]把 Spark 的概念講完了:Driver / Executor、分區、惰性求值、shuffle。這篇動手用 **DataFrame** 實際轉一份資料 —— 讀進來、清洗、彙總、寫出去,並看看 **Spark SQL** 怎麼和 DataFrame API 殊途同歸。

## 為什麼幾乎都用 DataFrame,而不是 RDD

[[spark-intro|上一篇]]提過 RDD 是最底層的抽象。但日常工作九成用 **DataFrame**,因為它有兩個 RDD 沒有的東西:

- **Schema(欄位與型別)**:像一張有結構的表,讀起來像在寫 SQL。
- **Catalyst 最佳化器**:你寫的是「要什麼」,Catalyst 幫你決定「怎麼做最快」(調換順序、下推 filter…)。RDD 是你叫它怎麼做就怎麼做,沒人幫你最佳化。

換句話說:**DataFrame 是宣告式、被最佳化的;RDD 是命令式、要自己顧效能。** 除非你需要極細粒度的控制,否則 DataFrame 又快又好讀。

## 讀取:給它 schema 比較好

```python
from pyspark.sql import SparkSession, functions as F

spark = SparkSession.builder.appName("orders").getOrCreate()

# parquet 自帶 schema 與型別,比 csv inferSchema 快又準
df = spark.read.parquet("orders.parquet")
df.printSchema()   # 看欄位與型別
```

CSV 也能讀(`spark.read.csv(..., header=True, inferSchema=True)`),但 `inferSchema` 要多掃一次資料、型別還可能猜錯;正式的 pipeline 我會用 parquet 或明確給 schema。

## 常用轉換:像操作一張表

```python
monthly = (
    df.filter(F.col("status") == "paid")                         # 篩選(narrow)
      .withColumn("month", F.date_format("order_date", "yyyy-MM"))  # 新增欄位
      .groupBy("month")                                          # 分組(wide,要 shuffle)
      .agg(
          F.sum("amount").alias("revenue"),
          F.countDistinct("customer_id").alias("buyers"),
      )
      .orderBy("month")
)
monthly.show()
```

`select` / `withColumn` / `filter` 這些是 **narrow**:每個分區自己做,不用跨節點搬資料,幾乎免費。`groupBy` / `join` 是 **wide**:要把同一組的資料拉到一起,就得 shuffle —— 這是 [[spark-intro|上一篇]]說的「最貴的操作」。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 520 210" role="img" aria-label="narrow 轉換不 shuffle,wide 轉換需要 shuffle" style="width:100%;max-width:580px;height:auto;margin:0 auto;">
    <defs><marker id="d2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="10" y="52" fill="#9aa4b2" font-size="11" text-anchor="start">narrow</text>
    <text x="10" y="66" fill="#9aa4b2" font-size="9" text-anchor="start">filter/select</text>
    <line x1="142" y1="42" x2="142" y2="66" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#d2)"/>
    <line x1="247" y1="42" x2="247" y2="66" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#d2)"/>
    <line x1="352" y1="42" x2="352" y2="66" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#d2)"/>
    <rect x="112" y="20" width="60" height="22" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="142" y="35" fill="#e6e6e6" font-size="10" text-anchor="middle">分區1</text>
    <rect x="217" y="20" width="60" height="22" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="247" y="35" fill="#e6e6e6" font-size="10" text-anchor="middle">分區2</text>
    <rect x="322" y="20" width="60" height="22" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="352" y="35" fill="#e6e6e6" font-size="10" text-anchor="middle">分區3</text>
    <rect x="112" y="68" width="60" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="142" y="83" fill="#e6e6e6" font-size="10" text-anchor="middle">分區1</text>
    <rect x="217" y="68" width="60" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="247" y="83" fill="#e6e6e6" font-size="10" text-anchor="middle">分區2</text>
    <rect x="322" y="68" width="60" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="352" y="83" fill="#e6e6e6" font-size="10" text-anchor="middle">分區3</text>
    <text x="430" y="58" fill="#9aa4b2" font-size="9.5" text-anchor="middle">1對1,不搬</text>
    <text x="10" y="150" fill="#9aa4b2" font-size="11" text-anchor="start">wide</text>
    <text x="10" y="164" fill="#9aa4b2" font-size="9" text-anchor="start">groupBy/join</text>
    <rect x="112" y="118" width="60" height="22" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="142" y="133" fill="#e6e6e6" font-size="10" text-anchor="middle">分區1</text>
    <rect x="217" y="118" width="60" height="22" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="247" y="133" fill="#e6e6e6" font-size="10" text-anchor="middle">分區2</text>
    <rect x="322" y="118" width="60" height="22" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="352" y="133" fill="#e6e6e6" font-size="10" text-anchor="middle">分區3</text>
    <rect x="92" y="150" width="310" height="20" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="247" y="164" fill="#e6e6e6" font-size="10.5" text-anchor="middle">shuffle:跨分區重新分配</text>
    <rect x="112" y="180" width="60" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="142" y="195" fill="#e6e6e6" font-size="10" text-anchor="middle">輸出1</text>
    <rect x="217" y="180" width="60" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="247" y="195" fill="#e6e6e6" font-size="10" text-anchor="middle">輸出2</text>
    <rect x="322" y="180" width="60" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="352" y="195" fill="#e6e6e6" font-size="10" text-anchor="middle">輸出3</text>
    <line x1="142" y1="140" x2="200" y2="150" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="247" y1="140" x2="247" y2="150" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="352" y1="140" x2="294" y2="150" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="200" y1="170" x2="142" y2="180" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#d2)"/>
    <line x1="247" y1="170" x2="247" y2="180" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#d2)"/>
    <line x1="294" y1="170" x2="352" y2="180" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#d2)"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">narrow:每個分區各自做、不搬資料;wide:要經 shuffle 把資料跨分區重新分配</figcaption>
</figure>

## Spark SQL:同一份資料,換 SQL 寫

把 DataFrame 註冊成一張臨時表,就能直接寫 SQL —— 結果跟上面的 DataFrame 寫法**完全等價**:

```python
df.createOrReplaceTempView("orders")

monthly = spark.sql("""
    select date_format(order_date, 'yyyy-MM') as month,
           sum(amount)                        as revenue,
           count(distinct customer_id)        as buyers
    from orders
    where status = 'paid'
    group by 1
    order by 1
""")
```

為什麼兩種寫法等價?因為它們都被 **Catalyst** 編成同一個實體執行計畫:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 180" role="img" aria-label="DataFrame API 與 Spark SQL 都經 Catalyst 編成同一個執行計畫" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="d1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="166" y1="52" x2="208" y2="78" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#d1)"/>
    <line x1="166" y1="126" x2="208" y2="100" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#d1)"/>
    <line x1="350" y1="89" x2="384" y2="89" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#d1)"/>
    <rect x="16" y="30" width="150" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="91" y="51" fill="#e6e6e6" font-size="12" text-anchor="middle">DataFrame API</text>
    <text x="91" y="66" fill="#9aa4b2" font-size="9.5" text-anchor="middle">filter / groupBy</text>
    <rect x="16" y="104" width="150" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="91" y="125" fill="#e6e6e6" font-size="12" text-anchor="middle">Spark SQL</text>
    <text x="91" y="140" fill="#9aa4b2" font-size="9.5" text-anchor="middle">SELECT …</text>
    <rect x="210" y="65" width="140" height="48" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="2"/>
    <text x="280" y="86" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Catalyst</text>
    <text x="280" y="102" fill="#9aa4b2" font-size="9.5" text-anchor="middle">最佳化器</text>
    <rect x="386" y="65" width="140" height="48" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="456" y="86" fill="#e6e6e6" font-size="12" text-anchor="middle">同一個執行計畫</text>
    <text x="456" y="102" fill="#9aa4b2" font-size="9.5" text-anchor="middle">分散到 Executors</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">DataFrame API 與 Spark SQL 殊途同歸 —— 都被 Catalyst 編成同一個實體計畫</figcaption>
</figure>

## 寫出:用 partitionBy 讓重跑變冪等

```python
monthly.write \
    .mode("overwrite") \
    .partitionBy("month") \
    .parquet("out/monthly")
```

`partitionBy("month")` 會把輸出依月份切成不同資料夾;搭配 `mode("overwrite")`,重跑某個月就只覆寫那個月的分區。這正好呼應 [[airflow-scheduling|Airflow 排程那篇]]講的**冪等**:同一段資料重算,結果蓋掉舊的、不會變兩倍。Spark 負責算,Airflow 負責排程觸發,兩邊都守住冪等,整條 pipeline 才補得了、重跑得起。

## 反思

### DataFrame 和 SQL 不要二選一,挑可讀性

我不太理解「一定要用 DataFrame API」或「一定要寫 SQL」的教條。它們既然編成同一個計畫、效能一樣,那選擇標準就只有一個:**哪個讓這段邏輯更好讀、更好維護**。複雜的多步轉換、要拆函式重用,我用 DataFrame API;一段直白的彙總查詢,SQL 反而更短更清楚 —— 而且團隊裡每個人都看得懂 SQL。能混用就混用,別自我設限。

### 效能直覺,八成還是回到 shuffle

寫了一堆 DataFrame 操作後,真正會拖慢的幾乎都是 wide 轉換。我的習慣是先問自己三件事:能不能**先 filter 把資料變小**再 groupBy/join?join 的另一邊是不是小表、可以 **broadcast** 掉 shuffle?輸出分區數是不是合理?把這幾個顧好,比起糾結 select 怎麼寫,效益大得多。這跟 [[spark-intro|上一篇]]的結論一致:**少 shuffle 就是 Spark 效能的本體。**

### 宣告式的好處,是把最佳化交給比你聰明的東西

DataFrame 最值得體會的一點,是「我描述要什麼,Catalyst 決定怎麼做」。這跟自己用 RDD 手刻每一步、自己顧順序,是兩種心態。多數時候,相信最佳化器、把心力放在「邏輯對不對、shuffle 多不多」,比逐行微調划算 —— 這也是現代資料工具的共同方向:**把人從實作細節解放出來,專注在意圖。**
