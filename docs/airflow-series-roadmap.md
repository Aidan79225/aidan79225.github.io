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

## 術語表(Ubiquitous Language)

工具系列:API 名稱、設定鍵、CLI 參數**一律不譯**(照原文寫)。這張表管的是「用中文寫的那些概念」怎麼統一。

全系列同一個概念只准一個中文寫法;英文欄是翻譯時直接照抄的來源。
寫到表上沒有的術語就補一列。跨系列共用的通用詞(快取、佇列、可觀測性)在
`docs/ubiquitous-language.md`(全站術語表),這裡只放本系列特有的。

| 中文用詞 | 英文 | 備註 |
|---|---|---|
| DAG | DAG | 不譯、不展開成「有向無環圖」除非第一次解釋 |
| 任務 | task | |
| 運算子 | operator | 內文多直接用 Operator |
| 感測器 | sensor | 等待外部條件;背後會吃 slot |
| 掛鉤 | hook | 內文多直接用 Hook |
| 排程器 / 執行器 | scheduler / executor | |
| 回補 | backfill | **刻意回補**,與 catchup 是兩件事,不可混用 |
| catchup | catchup | 不譯;預設 True 是甜蜜陷阱 |
| XCom | XCom | 不譯;不是資料管道 |
| 連線 | connection | 把帳密從程式碼抽出來 |
| 變數 | variable | 與 params 用途不同,別混 |
| 觸發規則 | trigger rule | 與 branching 綁在一起 |
| 任務群組 | TaskGroup | 解決的是「人」的問題 |
| 動態映射 | dynamic task mapping | |
| 資料區間 | data interval | 不寫「執行區間」 |
| 編排 | orchestration | 與 FoDE 的 orchestration undercurrent 對齊 |

## 寫每篇時的慣例
- front matter:`series: "Airflow 學習筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 沿用 ASCII:`airflow` + 該篇主題(如 `scheduling`、`testing`)。
- 依 `.claude/skills/writing-blog-post`:摘要要比文件更清楚 + 一段真實反思(你實作時踩到的坑最有價值)。
- 圖例用站台深色 SVG(SVG 內不可有空行)。
