# Spark 學習筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Spark 學習筆記"`。

邊學邊寫:學完一個主題就寫對應那篇。寫好一篇 → 把該篇 `draft: true` 改成 `false` 發佈。
草稿狀態的系列文在正式站上不會出現在系列盒(走 `getPublishedPosts()`),`npm run dev` 看得到。
跨篇可用 `[[slug]]` / `[[slug#段落]]` 互連,發佈後 backlinks 會自動長出來(也可跨系列連到 Airflow)。

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `spark-intro` | Apache Spark 是什麼?一篇搞懂分散式資料處理 | 定位、pandas vs Spark、核心概念、惰性求值、shuffle | ✅ 已發布 |
| 2 | `spark-dataframe` | Spark DataFrame 實戰:讀取、轉換、寫出與 Spark SQL | DataFrame vs RDD、讀寫、常用轉換、Spark SQL、narrow/wide | ✅ 已發布 |
| 3 | `spark-shuffle` | Spark 效能的本體:shuffle 與調校 | narrow/wide 複習、broadcast join、partition 數、AQE、cache/persist | ⬜ 待寫 |
| 4 | `spark-running` | 把 Spark 跑起來與部署 | 本機 PySpark、`spark-submit`、cluster 模式、managed(Databricks/EMR/Glue) | ⬜ 待寫 |
| 5 | `spark-streaming` | Structured Streaming 入門(選配) | 串流即「無界表」、watermark、輸出模式 | ⬜ 選配 |
| 6 | `spark-pitfalls` | 常見坑與除錯(選配) | data skew、OOM、small files、broadcast 上限 | ⬜ 選配 |

## 寫每篇時的慣例
- front matter:`series: "Spark 學習筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 沿用 ASCII:`spark` + 該篇主題(如 `pyspark`、`performance`)。
- 依 `.claude/skills/writing-blog-post`:摘要要比文件更清楚 + 一段真實反思;台灣用語(見 `docs/zh-tw-style-guide.md`,數據/依賴/函式 等保留不換)。
- 圖例用站台深色 SVG(SVG 內不可有空行)。
- 效能類主題盡量扣回 shuffle 這條主軸;冪等/排程可跨系列連到 `[[airflow-scheduling]]`。
