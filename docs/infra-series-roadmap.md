# 從 Infra 角度看資料工具 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "從 Infra 角度看資料工具"`。

定位:**橫切的維運/部署視角**。既有的「XX 學習筆記」講的是「這工具怎麼運作(原理)」;這系列問的是**「這工具怎麼在生產跑起來——部署拓撲、狀態與儲存、擴展、HA、容量、監控、調校、故障模式」**,而且用**同一套框架**去看每一個,凸顯它們的共通與取捨。核心軸線是 **stateful ↔ stateless**:有狀態的(Kafka/Redis/RabbitMQ)難擴難搬、要 StatefulSet + PV;無狀態的(Spark executor/Airflow worker/Connect worker)短命可拋、好水平擴——這條軸決定了每個工具在 k8s 上怎麼跑。

**與既有系列的關係(差異化)**:每篇 `infra-X` 都 cross-link 回對應的 `X 學習筆記`(要原理去那邊),這裡只談 infra 面;深度維運(如 `kafka-ops`)也互連、不重複,這系列的獨特價值是**「一套框架套在所有工具上 + 在 k8s 上怎麼跑 + 跟隔壁工具比取捨」**的橫向比較。跨連 SRE(可靠度/容量/監控 LGTM)、DDIA(複製/分片/狀態原理)。

一篇一~兩個工具,共 9 篇。★ = 框架/最高價值(1、2、3)。邊寫邊發:`draft: true` → `false`。`seriesOrder` = 寫作順序。

## 第一批 — 框架與底座

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `infra-intro` | 從 Infra 角度看一個工具,要問哪些問題 | 「Infra 體檢表」8 題(拓撲/狀態★樞紐/擴展/HA/容量/監控/調校/故障);核心軸 stateful↔stateless(把 7 工具擺上光譜、決定在 k8s 上 StatefulSet+PV vs Deployment+autoscale、混血認出狀態核心) | ✅ 已發布 |
| 2 | `infra-k8s` | Kubernetes:所有東西跑的底座 | 底座解剖(control plane 偏 stateless + etcd 是命門/Raft/失明);requests/limits/QoS(OOMKill vs throttle、誰先死);HPA/VPA/Cluster Autoscaler 三層;stateless→Deployment、stateful→StatefulSet+PV——接 `[[k8s-intro]]`、`[[sre-consensus]]` | ✅ 已發布 |

## 第二批 — 有狀態的重量級(stateful:難擴難搬)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 3 | `infra-kafka` | Kafka:磁碟為王的有狀態叢集 | 狀態在磁碟(partition=append log + replication/ISR)、磁碟為王(sequential+page cache+zero-copy);有狀態的代價=擴縮要搬 partition、partition 數難減;k8s 上 StatefulSet+PV;監控 lag/URP/磁碟——接 `[[kafka-ops]]`、`[[infra-k8s]]` | ✅ 已發布 |
| 4 | `infra-redis` | Redis:記憶體為界的有狀態服務 | 記憶體為界(maxmemory 硬牆、fork headroom、對照 Kafka 磁碟為王);拓撲階梯 單機/主從/Sentinel/Cluster(各解什麼、別跳級上 Cluster);容量/監控/k8s memory limit 要留 headroom——接 `[[redis-persistence]]`、`[[infra-kafka]]` | ✅ 已發布 |
| 5 | `infra-rabbitmq` | RabbitMQ:訊息 broker 的叢集與流控 | log vs queue(留著 vs 拿走)撐開兩套 infra;招牌坑=queue 堆積撞 memory/disk watermark → alarm → block publisher 背壓;HA quorum queue(Raft)取代 mirrored;監控 queue depth;k8s StatefulSet——接 `[[infra-kafka]]`、`[[sre-cascading-failures]]` | ✅ 已發布 |

## 第三批 — 無狀態的運算/連接器(stateless:好水平擴)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 6 | `infra-spark` | Spark:短命 executor 的彈性運算 | 第一個 stateless:拓撲(driver 命門/executor 短命可拋)、狀態借外部(shuffle/driver 協調是過渡態、durable 在 S3/DB)、dynamic allocation(backlog 驅動,對比 Kafka 搬 partition)、driver on-demand vs executor spot、容量 shuffle/skew/OOM、on k8s 取代 YARN——接 `[[spark-running]]`、`[[airflow-spark-on-k8s]]` | ✅ 已發布 |
| 7 | `infra-airflow` | Airflow:排程器、worker 與那個藏起來的狀態 | 組件全無狀態(scheduler/webserver/worker)、真狀態=metadata DB(命門)、HA scheduler 靠 DB row lock 協調、executor(Celery 固定池+broker vs KubernetesExecutor 一 task 一 pod)、容量瓶頸常在 DB、on k8s Helm + 觸發 Spark——接 `[[airflow-scheduling]]`、`[[infra-spark]]` | ✅ 已發布 |
| 8 | `infra-kafka-connect` | Kafka Connect:連接器的執行時 | stateless 收尾:connector(config)/task(平行單位)/worker(無狀態);狀態全存回 Kafka 三個內部 topic(configs/offsets/status)=借外部狀態極致;source/sink 對稱 + 平行度天花板(source 受來源分片、sink 受 topic partition/consumer group);rebalance(incremental cooperative)、task FAILED 不自動重啟 + DLQ、REST API 管理、最好上 k8s——接 `[[kafka-ecosystem]]`、`[[infra-kafka]]`、`[[infra-spark]]`、`[[infra-airflow]]` | ✅ 已發布 |

## 第四批 — 兜成一個平台

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 9 | `infra-platform` | 把它們兜成一個資料平台 | 平台分層(K8s 底座 + stateful 核心 StatefulSet+PV + stateless 運算 Deployment+autoscale + LGTM 觀測層);一條軸決定一切的 7 工具對照表;self-host vs managed 兩維度(狀態可怕 × 團隊能量);LGTM 一塊玻璃=認知負擔統一;算維運人力不是授權費——接 `[[infra-intro]]`、`[[infra-k8s]]`、`[[sre-monitoring]]`、`[[sre-onboarding-inhouse]]`、`[[pain-before-power]]` | ✅ 已發布(系列完成 1-9) |

★ = 框架與最高價值(1、2、3)。第一批兩篇是骨架(框架 + 底座),優先寫;第二/三批把框架套在每個工具上;第四批收成平台視角。

## 寫每篇時的慣例
- front matter:`series: "從 Infra 角度看資料工具"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`infrastructure` + 該工具(如 `kafka`、`redis`、`kubernetes`、`spark`、`airflow`、`rabbitmq`)。
- 依 `.claude/skills/writing-blog-post`:摘要提煉成模型/對照 + 一段真實反思;台灣用語(見 `docs/zh-tw-style-guide.md`)。
- 每篇一張以上站台深色 SVG(SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號;figcaption 內不放 wikilink,要連結用 `<a href>`)。
- **每篇都套同一套「Infra 體檢表」**(拓撲/狀態/擴展/HA/容量/監控/調校/故障),讓讀者一路對照;結尾扣回 stateful↔stateless 主軸。
- **cross-link 是重點**:原理 ↔ 對應「學習筆記」;可靠度/容量/監控 ↔ SRE 系列(`[[sre-slo]]`、`[[sre-monitoring]]`、`[[sre-onboarding-inhouse]]` 的 LGTM);複製/分片/狀態 ↔ DDIA;在 k8s 上跑 ↔ `[[airflow-spark-on-k8s]]`。
