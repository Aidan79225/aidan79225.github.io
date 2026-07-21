# Airflow 學習筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Airflow 學習筆記"`。

邊學邊寫:學完一個主題就寫對應那篇。寫好一篇 → 把該篇 `draft: true` 改成 `false` 發佈。
草稿狀態的系列文在正式站上不會出現在系列盒(走 `getPublishedPosts()`),`npm run dev` 看得到。

跨篇可用 `[[slug]]` / `[[slug#段落]]` 互連,發佈後 backlinks 會自動長出來。

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `airflow-intro` | Apache Airflow 是什麼?從 cron 到工作流程編排 | 定位、為何不只是 cron、核心概念、架構、心智轉變 | ✅ 已發布 |
| 2 | `airflow-first-dag` | 跑起第一個 Airflow:Docker 環境 + 你的第一個 DAG | `docker compose` 起本機環境、寫第一個 DAG、Web UI 操作 | ✅ 已發布 |
| 3 | `airflow-scheduling` | Airflow 排程的真相:data interval、catchup 與 backfill | `schedule` / `start_date` / `catchup` / data interval / backfill | ✅ 已發布 |
| 4 | `airflow-xcom` | Airflow 任務間怎麼傳資料:XCom、TaskFlow 進階與 params | XCom、TaskFlow 進階、`params` | ✅ 已發布 |
| 5 | `airflow-providers` | Airflow 怎麼連外部系統:Provider、Operator、Hook、Sensor | Provider / Operator / Hook / Sensor / Connection、poke vs reschedule | ✅ 已發布 |
| 6 | `airflow-control-flow` | Airflow 複雜流程控制:branching、trigger rules、TaskGroup、動態任務 | branching、trigger rules、TaskGroup、dynamic task mapping | ✅ 已發布 |
| 7 | `airflow-reliability` | Airflow 可靠性實戰:冪等、重試、SLA 與告警 | 三層防線=冪等(地基,覆寫分區/DELETE+INSERT)→ retries(retry_delay/指數退避/execution_timeout、暫時 vs 永久)→ SLA(慢也是故障)/ 告警(on_failure_callback→Slack、只在重試用完才響)——接 `[[airflow-scheduling]]`、`[[airflow-intro]]`、`[[sre-cron]]`、`[[sre-monitoring]]` | ✅ 已發布 |
| 8 | `airflow-testing-deploy` | Airflow 測試與部署:別讓一個 typo 弄垮整包 DAG | top-level parse 陷阱(scheduler 反覆解析→重活進 task)、測試三層(DagBag import 驗證/邏輯抽純函數單元測/dag.test())、CI 擋在 merge 前、部署 git-sync/S3/image、self-host vs managed(算維運人力)——接 `[[airflow-reliability]]`、`[[infra-airflow]]`、`[[pain-before-power]]` | ✅ 已發布 |
| 9 | `airflow-advanced` | Airflow 進階:Datasets、deferrable operators 與 executor 選型 | Datasets(時間驅動→資料驅動、outlets/schedule=[dataset])、deferrable operators(sensor 佔 slot 空等→triggerer async 等)、executor 選型速查(Local/Celery/K8s)——接 `[[airflow-providers]]`、`[[infra-airflow]]`、`[[infra-spark]]`、`[[redis-pubsub-stream]]`、`[[pain-before-power]]` | ✅ 已發布(系列完成 1-9) |

## 寫每篇時的慣例
- front matter:`series: "Airflow 學習筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 沿用 ASCII:`airflow` + 該篇主題(如 `scheduling`、`testing`)。
- 依 `.claude/skills/writing-blog-post`:摘要要比文件更清楚 + 一段真實反思(你實作時踩到的坑最有價值)。
- 圖例用站台深色 SVG(SVG 內不可有空行)。
