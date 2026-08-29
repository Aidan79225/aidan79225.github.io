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
| 5 | `obs-traces-tempo` | 追蹤與 Tempo:一個請求走過的路 | trace/span/waterfall(補 metric/log 之間「在哪一 hop」的洞)、context propagation(trace-id 靠 traceparent 一路傳、斷一跳就斷 trace)、Tempo(不索引內容、給 trace-id 換 trace、object storage=同 Loki 省錢哲學)、取樣 head vs tail(留異常不留隨機)——接 `[[obs-metrics-prometheus]]`、`[[obs-logs-loki]]`、`[[obs-intro]]`、`[[k8s-service]]` | ✅ 已發布(三支柱完成) |

## 第三批 — 串起來 & 採集

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 6 | `obs-collection` | 採集層:資料怎麼進來——OpenTelemetry 與 Alloy | M×N→M+N(直連 vs collector:OTLP 一協定、批次/重試/脫敏/路由集中、換後端不改 app);OTel 統一三訊號一套 SDK+共用 context(trace-id 進 log、exemplar 掛 metric=互跳的地基)、auto vs manual 埋測;Alloy=collector(OTLP+scrape+撿 log);K8s 三種佈法(DaemonSet 首選/sidecar 特例/gateway 做 tail sampling 全域決策)+兩層組合——接 `[[obs-intro]]`、`[[obs-traces-tempo]]`、`[[kafka-ecosystem]]`、`[[k8s-networkpolicy-cni]]`、`[[ddia-encoding]]`、`[[pain-before-power]]` | ✅ 已發布 |
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

## 術語表(Ubiquitous Language)

工具系列:API 名稱、資源型別、設定鍵、CLI 參數**一律不譯**(照原文寫)。這張表管的是「用中文寫的那些概念」怎麼統一。

全系列同一個概念只准一個中文寫法;英文欄是翻譯時直接照抄的來源。
寫到表上沒有的術語就補一列。跨系列共用的通用詞(快取、佇列、可觀測性)在
`docs/en-translation-glossary.md` B 區,這裡只放本系列特有的。

| 中文用詞 | 英文 | 備註 |
|---|---|---|
| 監控 vs 可觀測性 | monitoring vs observability | 「已知的未知」→「未知的未知」;兩個詞不可互換 |
| 三種訊號 | the three signals | metrics / logs / traces,一律用英文原詞 |
| 一塊玻璃 | single pane of glass | 系列招牌說法;為了壓力下還能思考,不是為了美觀 |
| 基數 | cardinality | metric 第一戒律;不寫「維度爆炸」 |
| 粒度 | granularity | |
| 拉取 / 推送 | pull / push | Prometheus 主動去抓;「不回應」本身是信號 |
| 抓取 | scrape | Prometheus 用語,不寫「採集」 |
| 標籤 | label | 「label 進索引、內容進 line」是 Loki 的核心取捨 |
| 儀表板 / 面板 | dashboard / panel | 一個 panel 回答一個問題 |
| 儀表板即程式碼 | dashboard as code | 與 IaC 的 everything as code 對齊 |
| 模板變數 | template variable | 一張儀表板服務一百個目標 |
| 追蹤 | trace | trace-id 不譯 |
| 上下文傳遞 | context propagation | OTel 的殺手級價值 |
| 取樣 | sampling | |
| 告警 | alert / alerting | 與 SRE 系列對齊;不寫「警報 / 報警」 |
| LGTM | Loki / Grafana / Tempo / Mimir | 四個字母展開時照原文 |

## 寫每篇時的慣例
- front matter:`series: "Grafana LGTM 可觀測性"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`observability` + 該篇主題(如 `prometheus`、`grafana`、`logging`、`tracing`、`alerting`、`slo`)。
- 依 `.claude/skills/writing-blog-post`:一張招牌深色 SVG(SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號;figcaption 內不放 wikilink,要連結用 `<a href>`)+ 比官方文件更清楚的摘要 + 一段真實反思。
- 台灣用語(見 `docs/zh-tw-style-guide.md`);程式碼/查詢語言(PromQL/LogQL)用 code block,工程師視角要有實際查詢範例。
- **貫穿主軸**:每篇結尾扣回「觀測的終點是**行動**,不是看到」;三支柱、告警、SLO 都是為了讓人在對的時間做對的事。
- **cross-link 是重點**:可靠性觀念/文化 ↔ SRE 系列(`[[sre-monitoring]]`、`[[sre-slo]]`、`[[sre-cascading-failures]]`);一塊玻璃/平台 ↔ `[[infra-platform]]`、`[[infra-k8s]]`;資料可靠性 ↔ `[[airflow-reliability]]`、(未來)Data Quality;pull/時序 ↔ `[[infra-kafka]]`(拉模型對照)。
