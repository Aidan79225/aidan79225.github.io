# Grafana LGTM 可觀測性 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Grafana LGTM 可觀測性"`。

定位:**把「可觀測性」從觀念落地成一套會用的工具。** SRE 系列講的是「可靠性的觀念與文化」(SLO、告警哲學、事故);這系列講的是**「LGTM 這套工具到底怎麼運作、怎麼把那些觀念變成真的儀表板、告警、SLO」**——實作導向、圖解 + 反思。核心信念貫穿全系列:**觀測的終點不是「看到」,是「行動」**——一塊玻璃、三支柱、一套告警,最後都要能讓人在對的時間做對的事。

**與既有系列的關係(差異化)**:
- ↔ **SRE 系列**(`[[sre-monitoring]]`、`[[sre-slo]]`、`[[sre-onboarding-inhouse]]` 的 LGTM 全家桶):那邊是可靠性的「為什麼/文化」,這裡是「用什麼工具、怎麼做」。互連、不重複。
- ↔ **從 Infra 角度看資料工具**(`[[infra-platform]]` 的「一塊玻璃」):那篇點到 LGTM 是平台監控的收斂,這系列把那塊玻璃拆開講透。
- ↔ 收尾扣回 **DE × SRE 焊點**:最後一篇把 LGTM 用在資料平台上(pipeline 指標、freshness/lag、資料 SLO、data incident),接回作者 EM(DE)+ SRE 的定位。

★ = 框架 / 最高投報(1、3、8、10、11)。邊寫邊發:`draft: true` → `false`。`seriesOrder` = 寫作順序。

## 第一批 — 地基(觀念 + Grafana 本身)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `obs-intro` | 可觀測性是什麼:三大支柱與 LGTM 全家桶 | monitoring vs observability(已知的未知 vs 未知的未知)、三支柱各答一問(metric 有沒有/trace 在哪/log 是什麼)+ 排障黃金路徑由粗到細、LGTM 四字母對應 + Prometheus/Alloy 採集、Grafana 只查不存、一塊玻璃——接 `[[k8s-troubleshooting]]`、`[[infra-platform]]` | ✅ 已發布 ★ |
| 2 | `obs-grafana` | Grafana:一塊玻璃,只查不存 | Grafana 只查不存(資料在 data source、自己近乎無狀態、能統一異質來源);dashboard/panel(一 panel 答一問);template variable(一張模板服務百目標=規模化);dashboard as code(JSON/git/provisioning)——接 `[[obs-intro]]`、`[[k8s-packaging]]`、`[[k8s-intro]]` | ✅ 已發布 |

## 第二批 — 三大支柱各講透

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 3 | `obs-metrics-prometheus` | 指標與 Prometheus:時序、pull、PromQL 與 cardinality 的坑 | 時序資料模型(name+labels、series=label 組合)、**cardinality 爆炸**(series=各 label 基數乘積、高基數 ID 別當 label)、pull vs push(up=0 內建偵測)、metric 四型配四種讀法(counter→rate/gauge 直接/histogram→quantile/summary 少用)、PromQL rate→sum by→閾值、Mimir 水平擴+長期保留+多租戶——接 `[[obs-intro]]`、`[[k8s-troubleshooting]]`、`[[infra-kafka]]` | ✅ 已發布 ★ |
| 4 | `obs-logs-loki` | 日誌與 Loki:只索引 label,不索引全文 | 只索引 label 不索引全文(兩步查詢:label 縮小→grep chunks、object storage 便宜)、vs ELK 全文索引取捨、同一個 cardinality 陷阱(高基數欄位放 structured line 不當 label)、LogQL(selector+pipeline、`| json`、rate() 把 log 變 metric)——接 `[[obs-metrics-prometheus]]`、`[[obs-intro]]` | ✅ 已發布 |
| 5 | `obs-traces-tempo` | 追蹤與 Tempo:一個請求走過的路 | distributed tracing、trace/span、context propagation(trace-id 怎麼一路帶)、Tempo(只用 object storage、靠 trace-id 撈)、取樣(sampling)取捨 | ⬜ |

## 第三批 — 串起來 & 採集

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 6 | `obs-collection` | 採集層:資料怎麼進來(Alloy / OpenTelemetry) | 沒有採集就沒有觀測;Grafana Alloy / OpenTelemetry Collector 的角色、app instrumentation、在 k8s 上怎麼佈(agent/sidecar/DaemonSet)、OTel 當統一標準 | ⬜ |
| 7 | `obs-correlation` | 三支柱關聯:從一個尖峰,跳到 trace,再跳到 log | 「一塊玻璃」的真義=三支柱能互跳;exemplars(metric→trace)、trace→logs、共用 label 關聯;沒關聯的三支柱只是三個孤島 | ⬜ |

## 第四批 — 把觀測變行動(SRE 實踐)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 8 | `obs-alerting` | 告警:Alertmanager 與好告警的設計 | Prometheus alerting rules、Alertmanager(去重/分組/靜默/路由)、**告警疲勞**、symptom-based vs cause-based、只在該叫醒人時叫——接 `[[sre-monitoring]]`、`[[airflow-reliability]]` | ⬜ ★ |
| 9 | `obs-dashboards` | 儀表板設計:RED、USE 與四個黃金訊號 | 別做沒人看的儀表板;服務看 **RED**(Rate/Errors/Duration)、資源看 **USE**(Utilization/Saturation/Errors)、Google 四個黃金訊號;一張圖要能回答一個問題 | ⬜ |
| 10 | `obs-slo` | SLO 與 error budget 在 Grafana 落地 | 從 SLI 到 SLO、burn-rate alerting、error budget 怎麼算與怎麼用、用 Grafana/Mimir 落地——接 `[[sre-slo]]`(觀念)這裡談實作 | ⬜ ★ |

## 第五批 — 焊點(DE × SRE 延伸)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 11 | `obs-data-observability` | 資料平台的可觀測性:把 LGTM 用在 pipeline 上 | 把三支柱套到資料平台:pipeline 的 metrics、**freshness/lag 當可靠性指標**、資料 SLO、data incident 怎麼在 Grafana 上追;data observability vs 一般 observability 的差異——接 `[[airflow-reliability]]`、`[[infra-platform]]`、(未來)Data Quality | ⬜ ★ |

## 建議閱讀順序
1. **地基**(1→2):先懂三支柱與「Grafana 只是玻璃」的定位。
2. **三支柱**(3→4→5):Prometheus/Loki/Tempo 各講透,3 是重中之重(metrics 是骨幹)。
3. **串起來**(6 採集→7 關聯):資料怎麼進來、三支柱怎麼互跳成一塊玻璃。
4. **變行動**(8 告警→9 儀表板→10 SLO):把「看到」變「行動」,這批最貼 SRE 日常。
5. **焊點**(11):把整套用回資料平台,收束到 DE×SRE 定位。

## 寫每篇時的慣例
- front matter:`series: "Grafana LGTM 可觀測性"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`observability` + 該篇主題(如 `prometheus`、`grafana`、`logging`、`tracing`、`alerting`、`slo`)。
- 依 `.claude/skills/writing-blog-post`:一張招牌深色 SVG(SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號;figcaption 內不放 wikilink,要連結用 `<a href>`)+ 比官方文件更清楚的摘要 + 一段真實反思。
- 台灣用語(見 `docs/zh-tw-style-guide.md`);程式碼/查詢語言(PromQL/LogQL)用 code block,工程師視角要有實際查詢範例。
- **貫穿主軸**:每篇結尾扣回「觀測的終點是**行動**,不是看到」;三支柱、告警、SLO 都是為了讓人在對的時間做對的事。
- **cross-link 是重點**:可靠性觀念/文化 ↔ SRE 系列(`[[sre-monitoring]]`、`[[sre-slo]]`、`[[sre-cascading-failures]]`);一塊玻璃/平台 ↔ `[[infra-platform]]`、`[[infra-k8s]]`;資料可靠性 ↔ `[[airflow-reliability]]`、(未來)Data Quality;pull/時序 ↔ `[[infra-kafka]]`(拉模型對照)。
