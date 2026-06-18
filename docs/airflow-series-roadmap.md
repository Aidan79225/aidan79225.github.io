# Airflow 學習筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Airflow 學習筆記"`。

邊學邊寫:學完一個主題就寫對應那篇。寫好一篇 → 把該篇 `draft: true` 改成 `false` 發佈。
草稿狀態的系列文在正式站上不會出現在系列盒(走 `getPublishedPosts()`),`npm run dev` 看得到。

跨篇可用 `[[slug]]` / `[[slug#段落]]` 互連,發佈後 backlinks 會自動長出來。

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `airflow-intro` | Apache Airflow 是什麼?從 cron 到工作流程編排 | 定位、為何不只是 cron、核心概念、架構、心智轉變 | ✅ 已寫(draft) |
| 2 | `airflow-first-dag` | 跑起第一個 Airflow | `docker compose` 起本機環境、寫第一個 DAG、Web UI 操作 | ⬜ 待寫 |
| 3 | `airflow-scheduling` | Airflow 排程的真相 | `schedule` / `start_date` / `catchup` / data interval / backfill | ⬜ 待寫 |
| 4 | `airflow-xcom` | 任務之間怎麼傳資料 | XCom、TaskFlow 進階、`params` | ⬜ 待寫 |
| 5 | `airflow-providers` | 連接外部系統 | Operators / Sensors / Hooks / Providers(DB、S3、HTTP…) | ⬜ 待寫 |
| 6 | `airflow-control-flow` | 複雜流程控制 | branching、trigger rules、TaskGroup、dynamic task mapping | ⬜ 待寫 |
| 7 | `airflow-reliability` | 可靠性實戰 | retries、SLA、告警、冪等寫法(呼應 #1) | ⬜ 待寫 |
| 8 | `airflow-testing-deploy` | 測試與部署 | DAG 單元測試、CI、managed(MWAA / Astronomer)、最佳實務 | ⬜ 待寫 |
| 9 | `airflow-advanced` | 進階主題(選配) | Datasets 資料感知排程、deferrable operators、executor 選型 | ⬜ 選配 |

## 寫每篇時的慣例
- front matter:`series: "Airflow 學習筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 沿用 ASCII:`airflow` + 該篇主題(如 `scheduling`、`testing`)。
- 依 `.claude/skills/writing-blog-post`:摘要要比文件更清楚 + 一段真實反思(你實作時踩到的坑最有價值)。
- 圖例用站台深色 SVG(SVG 內不可有空行)。
