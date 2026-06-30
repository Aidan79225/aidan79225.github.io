---
title: "Airflow + Spark 跑在 K8s 上:不同的 node 怎麼跑不同的 pod"
date: 2026-06-30
category: tech
tags:
  - kubernetes
  - airflow
  - spark
  - data-engineering
comments: true
draft: false
---
[[airflow-intro|Airflow]] 負責「**什麼時候、用什麼順序**」跑作業,[[spark-running|Spark]] 負責「**把大資料算完**」。當這兩個東西都搬到 Kubernetes 上,最常見的困惑是:**到底有哪些東西在跑、它們各自是不是一個 pod、又被丟到哪一台機器上?** 這篇用兩張圖把它畫清楚 —— K8s 上不同的 node 怎麼承載 Airflow 與 Spark 各式各樣的 pod。

## 先把三個詞定義死:Node、Pod、Scheduler

在 K8s 的世界,只要記住三個角色,後面全都串得起來:

- **Node**:一台真正的機器(雲上多半是一台 VM)。它是**相對長壽**的硬體資源,有固定的 CPU 與記憶體上限。
- **Pod**:K8s 最小的部署單位,裡面跑一個(或幾個)容器。它是**用完即丟**的 —— 跑完、掛掉、被重排都很正常。
- **Scheduler**(在 control plane 裡):看每個 pod 宣告要多少資源(`requests`)、有沒有指定偏好(affinity / nodeSelector),然後決定**這個 pod 該塞進哪個 node**。

一句話收斂:**Node 是房子、Pod 是住客、Scheduler 是仲介。** Airflow 與 Spark 在 K8s 上的一切,都是「誰生出哪些 pod、Scheduler 又把它們安排去哪個 node」。

## 一張圖看懂:誰是 pod、各自落在哪個 node

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 450" role="img" aria-label="K8s 叢集裡,control plane scheduler 把不同 pod 排到不同 node:Node 1 是 on-demand 池跑 Airflow 常駐 pod 與掛 PersistentVolume 的 Metadata DB,Node 2、Node 3 是 spot 池跑 Spark driver 與 executor pod,executor 再去叢集外的 Business DB 讀寫營運資料" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="kp1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker><marker id="kp2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#54b890"/></marker><marker id="kp3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto-start-reverse"><path d="M0,0 L0,6 L8,3 z" fill="#a679d6"/></marker></defs>
    <rect x="180" y="10" width="240" height="44" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4" stroke-dasharray="5 4"/>
    <text x="300" y="30" fill="#e6e6e6" font-size="12" text-anchor="middle">K8s Control Plane · Scheduler</text>
    <text x="300" y="45" fill="#9aa4b2" font-size="8.5" text-anchor="middle">依 resource request / affinity 決定 pod 落哪個 node</text>
    <line x1="300" y1="54" x2="108" y2="98" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kp1)"/>
    <line x1="300" y1="54" x2="300" y2="98" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kp1)"/>
    <line x1="300" y1="54" x2="492" y2="98" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kp1)"/>
    <rect x="18" y="100" width="174" height="222" rx="10" fill="none" stroke="#3a4154" stroke-width="1.5"/>
    <rect x="213" y="100" width="174" height="222" rx="10" fill="none" stroke="#3a4154" stroke-width="1.5"/>
    <rect x="408" y="100" width="174" height="222" rx="10" fill="none" stroke="#3a4154" stroke-width="1.5"/>
    <text x="105" y="122" fill="#e6e6e6" font-size="12" text-anchor="middle">Node 1</text>
    <text x="105" y="137" fill="#9aa4b2" font-size="9" text-anchor="middle">on-demand 池(穩定)</text>
    <text x="300" y="122" fill="#e6e6e6" font-size="12" text-anchor="middle">Node 2</text>
    <text x="300" y="137" fill="#9aa4b2" font-size="9" text-anchor="middle">spot 池</text>
    <text x="495" y="122" fill="#e6e6e6" font-size="12" text-anchor="middle">Node 3</text>
    <text x="495" y="137" fill="#9aa4b2" font-size="9" text-anchor="middle">spot 池</text>
    <rect x="33" y="150" width="144" height="32" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="105" y="170" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Airflow Scheduler</text>
    <rect x="33" y="190" width="144" height="32" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="105" y="210" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Airflow Webserver</text>
    <rect x="33" y="230" width="144" height="32" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="105" y="250" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Airflow Triggerer</text>
    <path d="M71 276 v26 a34 6 0 0 0 68 0 v-26" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><ellipse cx="105" cy="276" rx="34" ry="6" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="105" y="297" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Metadata DB</text><text x="105" y="316" fill="#9aa4b2" font-size="7.5" text-anchor="middle">PersistentVolume(有狀態)</text>
    <rect x="228" y="150" width="144" height="32" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/><text x="300" y="170" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Spark Driver</text>
    <rect x="228" y="190" width="144" height="32" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="300" y="210" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Spark Executor</text>
    <rect x="423" y="150" width="144" height="32" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="495" y="170" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Spark Executor</text>
    <rect x="423" y="190" width="144" height="32" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="495" y="210" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Spark Executor</text>
    <rect x="423" y="230" width="144" height="32" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="495" y="250" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Spark Executor</text>
    <path d="M372 200 C 398 230, 400 175, 421 168" fill="none" stroke="#54b890" stroke-width="1.3" stroke-dasharray="3 3" marker-end="url(#kp2)"/>
    <text x="300" y="300" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Driver 申請的 executor 由 Scheduler 散到各 node</text>
    <path d="M470 324 C 430 344, 384 348, 356 352" fill="none" stroke="#a679d6" stroke-width="1.4" marker-start="url(#kp3)" marker-end="url(#kp3)"/>
    <text x="300" y="340" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Executor 讀取來源 / 寫回結果</text>
    <path d="M222 356 v30 a78 8 0 0 0 156 0 v-30" fill="#262b3a" stroke="#a679d6" stroke-width="1.5"/><ellipse cx="300" cy="356" rx="78" ry="8" fill="#262b3a" stroke="#a679d6" stroke-width="1.5"/><text x="300" y="375" fill="#e6e6e6" font-size="11" text-anchor="middle">Business DB</text><text x="300" y="390" fill="#9aa4b2" font-size="8" text-anchor="middle">叢集外的營運資料源 / 輸出</text>
    <rect x="30" y="420" width="15" height="12" rx="2" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="50" y="430" fill="#9aa4b2" font-size="8.5" text-anchor="start">Airflow pod</text>
    <rect x="150" y="420" width="15" height="12" rx="2" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="170" y="430" fill="#9aa4b2" font-size="8.5" text-anchor="start">Spark Driver</text>
    <rect x="278" y="420" width="15" height="12" rx="2" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="298" y="430" fill="#9aa4b2" font-size="8.5" text-anchor="start">Spark Executor</text>
    <rect x="412" y="420" width="15" height="12" rx="2" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="432" y="430" fill="#9aa4b2" font-size="8.5" text-anchor="start">Metadata DB</text>
    <rect x="520" y="420" width="15" height="12" rx="2" fill="#262b3a" stroke="#a679d6" stroke-width="1.4"/><text x="540" y="430" fill="#9aa4b2" font-size="8.5" text-anchor="start">Business DB</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同一個叢集,Scheduler 把 Airflow 常駐 pod(含掛著 PersistentVolume 的 Metadata DB)放在穩定的 on-demand node、把可重來的 Spark executor 散到便宜的 spot node;executor 再去叢集外的 Business DB 讀寫真正的營運資料</figcaption>
</figure>

這張圖就是整篇的心智模型:**叢集是一池 node,Airflow 與 Spark 都只是「會生出 pod 的應用」,真正決定誰跑在哪台機器的是 Scheduler。** 接下來兩節,分別看 Airflow 與 Spark 各自會生出哪些 pod。

## Airflow 在 K8s 上有哪些 pod

Airflow 的 pod 分兩種壽命:**常駐的核心元件**,跟**用完即丟的任務**。

**常駐 pod**(圖中 Node 1,跑著就不關):

- **Scheduler**:解析 DAG、決定哪個 task 該跑了 —— Airflow 的大腦。
- **Webserver**:那個 UI。
- **Triggerer**:跑 deferrable operator(等外部事件時不佔 worker)。
- **Metadata DB**:存所有 DAG / task 的狀態,通常是 Postgres。它是整個 Airflow 唯一**有狀態**的角色 —— 在 K8s 上以 StatefulSet 搭一個 **PersistentVolume** 跑(圖中 Node 1 那個圓柱),好讓 pod 被重排或重啟時資料還在。實務上更常**直接外接一個 managed 資料庫**(RDS / Cloud SQL),把「顧好這顆 DB」的責任丟給雲商。它跟用完即刪的 Spark pod 剛好是兩個極端:**一個必須記住一切,一群可以隨時消失。**

**任務 pod** 怎麼長,取決於你的 **executor** 選擇,這是 Airflow on K8s 最該先搞懂的決策:

| 方式 | 一個 task 是什麼 | 適合 |
|---|---|---|
| **KubernetesExecutor** | Scheduler 幫**每個 task** 開一個 pod,跑完就刪 | 任務量起伏大、想徹底隔離 |
| **CeleryExecutor** | task 丟進常駐的 worker pod 跑(worker 是固定一群) | 任務量穩定、想省開 pod 的延遲 |
| **KubernetesPodOperator** | 你在 DAG 裡明寫「這個 task 去開一個 pod 跑某個 image」 | 任務本身就是個容器化的程式 |

關鍵差異是:**KubernetesExecutor 是「Airflow 自動幫每個 task 包一個 pod」;KubernetesPodOperator 是「你主動叫 Airflow 去開一個 pod」。** 前者管的是 task 跑在哪,後者管的是 task 跑什麼。

## Spark 在 K8s 上有哪些 pod

[[spark-running|上一篇]]講過 Spark 永遠是 Driver + Executor + Cluster Manager 三角。搬到 K8s,變化只有一個:**Cluster Manager 就是 K8s 本身**,而 Driver 跟 Executor 全部變成 pod。

提交時 `--master` 指向叢集的 API server:

```bash
spark-submit \
  --master k8s://https://<api-server>:6443 \
  --deploy-mode cluster \
  --conf spark.executor.instances=4 \
  --conf spark.kubernetes.container.image=myrepo/spark:3.5 \
  jobs/daily_etl.py
```

之後發生的事:

1. K8s 先建一個 **Driver pod**(圖中 Node 2)。
2. Driver 啟動後,**直接呼叫 K8s API 去要 executor**,要幾個由 `spark.executor.instances` 決定。
3. K8s 建出 **Executor pod**,由 Scheduler 散到有空位的 node(圖中 Node 2、Node 3 都有)。
4. 作業跑完,**所有 Spark pod 被刪掉,node 留著等下一個作業**。

所以同一個 Spark 作業的 pod,**本來就會橫跨好幾個 node** —— 這正是它能水平擴展的原因。Executor 多到一台塞不下,就自然攤到別台去。

還有一件容易忽略的事:**Spark 要算的「資料」不在叢集裡。** Executor 起來後,會去外部的 **Business DB / 資料源**(營運用的 Postgres、MySQL、數倉或物件儲存)把資料撈進來算、再把結果寫回去(圖一最下方那顆)。它跟前面 Airflow 的 Metadata DB 是**完全不同的兩顆 DB**,別搞混:

| | **Metadata DB** | **Business DB** |
|---|---|---|
| 存什麼 | Airflow 的 DAG / task 排程狀態 | 真正要被處理的業務資料 |
| 誰在用 | Airflow Scheduler | Spark Executor 讀取 / 寫回 |
| 位置 | 叢集內(StatefulSet)或外接 managed | 幾乎都在叢集外,由資料團隊 / 雲商維運 |
| 一句話 | 記住「排程跑到哪」 | 記住「業務發生了什麼」 |

## 合起來:一次 DAG run 的 pod 生命週期

把 Airflow 觸發 Spark 串起來,實務上常用 **`SparkKubernetesOperator`**:Airflow 的一個 task 去 K8s 提交 Spark 作業,Driver 起來後再生 Executor,Executor 最後把算完的結果寫進 **Business DB**。整條鏈長這樣:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 604 140" role="img" aria-label="流程圖:Airflow task pod 提交 Spark 作業,建立 Spark Driver pod,Driver 申請 Executor pod,Executor 讀寫叢集外的 Business DB" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="kf1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="8" y="70" width="78" height="42" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="47" y="88" fill="#e6e6e6" font-size="11" text-anchor="middle">Airflow</text><text x="47" y="102" fill="#9aa4b2" font-size="7.5" text-anchor="middle">task pod</text>
    <rect x="134" y="70" width="78" height="42" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5" stroke-dasharray="4 3"/><text x="173" y="88" fill="#e6e6e6" font-size="11" text-anchor="middle">Spark</text><text x="173" y="102" fill="#9aa4b2" font-size="7.5" text-anchor="middle">spark-submit</text>
    <rect x="260" y="70" width="78" height="42" rx="7" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/><text x="299" y="88" fill="#e6e6e6" font-size="11" text-anchor="middle">Driver</text><text x="299" y="102" fill="#9aa4b2" font-size="7.5" text-anchor="middle">Spark pod</text>
    <rect x="386" y="70" width="78" height="42" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="425" y="88" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Executor</text><text x="425" y="102" fill="#9aa4b2" font-size="7.5" text-anchor="middle">×N pod</text>
    <path d="M516 76 v30 a35 6 0 0 0 70 0 v-30" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5"/><ellipse cx="551" cy="76" rx="35" ry="6" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5"/><text x="551" y="97" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Business DB</text>
    <line x1="88" y1="91" x2="132" y2="91" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kf1)"/><text x="110" y="84" fill="#9aa4b2" font-size="7.5" text-anchor="middle">提交作業</text>
    <line x1="214" y1="91" x2="258" y2="91" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kf1)"/><text x="236" y="84" fill="#9aa4b2" font-size="7.5" text-anchor="middle">建 Driver</text>
    <line x1="340" y1="91" x2="384" y2="91" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kf1)"/><text x="362" y="84" fill="#9aa4b2" font-size="7.5" text-anchor="middle">要 Executor</text>
    <line x1="466" y1="91" x2="510" y2="91" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kf1)"/><text x="488" y="84" fill="#9aa4b2" font-size="7.5" text-anchor="middle">讀寫資料</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一條作業的資料流:Airflow 觸發 → 提交 Spark 作業 → 建 Driver pod → Driver 開 Executor → Executor 讀寫 Business DB。中間每一格都是一個(或一群)pod,只有最右邊的 Business DB 在叢集外</figcaption>
</figure>

鏈上每一格(除了最右邊叢集外的 Business DB)都是一個或一群 pod。換個角度,把同一條鏈攤在時間軸上,最能看出「**誰常駐、誰用完即丟**」:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 250" role="img" aria-label="pod 生命週期時間軸:Airflow Scheduler、Webserver、Triggerer 全程常駐;task pod、Spark Driver、Executor 只在作業期間存在,跑完就消失" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="kt2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="120" y="44" fill="#9aa4b2" font-size="9.5" text-anchor="end">Scheduler</text>
    <rect x="130" y="34" width="420" height="14" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="120" y="72" fill="#9aa4b2" font-size="9.5" text-anchor="end">Webserver</text>
    <rect x="130" y="62" width="420" height="14" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="120" y="100" fill="#9aa4b2" font-size="9.5" text-anchor="end">Triggerer</text>
    <rect x="130" y="90" width="420" height="14" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="120" y="128" fill="#9aa4b2" font-size="9.5" text-anchor="end">task pod</text>
    <rect x="220" y="118" width="120" height="14" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3" stroke-dasharray="4 3"/>
    <text x="120" y="156" fill="#9aa4b2" font-size="9.5" text-anchor="end">Spark Driver</text>
    <rect x="300" y="146" width="180" height="14" rx="3" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/>
    <text x="120" y="184" fill="#9aa4b2" font-size="9.5" text-anchor="end">Executor ×N</text>
    <rect x="330" y="174" width="130" height="14" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <line x1="130" y1="210" x2="560" y2="210" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kt2)"/>
    <text x="555" y="228" fill="#9aa4b2" font-size="9.5" text-anchor="end">時間 →</text>
    <line x1="220" y1="30" x2="220" y2="210" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 4"/>
    <text x="220" y="24" fill="#9aa4b2" font-size="8" text-anchor="middle">DAG 觸發</text>
    <line x1="480" y1="30" x2="480" y2="210" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 4"/>
    <text x="480" y="24" fill="#9aa4b2" font-size="8" text-anchor="middle">作業完成</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">藍色長條是 Airflow 常駐 pod,跑著不關;短條是用完即刪的 pod —— task pod 開出 Spark Driver、Driver 再開 Executor,作業一完成全部消失</figcaption>
</figure>

看懂這張圖,就抓到 K8s 對 DE 最大的價值:**只有真正在算的時候才佔資源。** 沒作業時,叢集只剩幾個輕量的 Airflow 常駐 pod;尖峰時 Executor 一口氣長出來、算完即刪。這跟一直養著一票閒置 worker 的傳統做法,成本結構完全不同。

## 怎麼控制誰跑在哪個 node

預設 Scheduler 只會挑「裝得下」的 node,但 DE 場景你通常想**刻意安排**。常用的幾個旋鈕:

- **`requests` / `limits`**:每個 pod 宣告要多少 CPU/記憶體。Scheduler 靠 `requests` 做 bin-packing,**這個數字寫錯,要嘛排不進去、要嘛擠爆 node**。
- **nodeSelector / affinity**:把「Spark executor」釘到「spark 專用 node 池」,別跟 Airflow 核心搶資源。
- **taints + tolerations**:幫某些 node 上「鎖」,只有帶對應 toleration 的 pod 進得來 —— 例如保留一池高記憶體機器只給 Spark。
- **Cluster Autoscaler**:當 executor pod 因為沒 node 可排而卡在 pending,自動加開 node;閒下來再縮掉。

最實用的一個模式,就是圖一畫的 **node 分池**:

| Node 池 | 跑什麼 | 為什麼 |
|---|---|---|
| **on-demand(穩定)** | Airflow Scheduler / Webserver、Metadata DB、Spark Driver | 這些**掛了整批作業就完蛋**(尤其有狀態的 DB),不能用會被回收的機器 |
| **spot / preemptible(便宜)** | Spark Executor | 單一 executor 掛掉,Spark 會重算那塊 —— 容忍得起,換到大幅省錢 |

**會不會死、死了能不能重來,決定它該跑在哪種 node。** 這是把 Airflow + Spark 搬上 K8s 之後,最該想清楚的一條設計原則。

## 反思

### 「全部都是 pod」是這套架構最大的解放

我自己最有感的轉變,是從前 [[spark-running|Spark on YARN]] 跟 Airflow 的 worker 是兩套完全不同的資源世界 —— 一個調 YARN queue、一個調 Celery worker 數,各有各的脾氣。搬到 K8s 之後,**它們變成同一種東西:會宣告 `requests`、會被 Scheduler 排到某個 node 的 pod。** 監控、調度、擴縮、隔離,全部收斂成一套 K8s 的語彙。學一次,Airflow、Spark、甚至 dbt 容器,管法都一樣。這種「異質工作負載統一抽象」的爽度,是我會推薦團隊往這走的主因。

### 把常駐和 ephemeral 分清楚,是會省錢也會出事的地方

圖二那條「藍色長條 vs 短條」的分界,我吃過虧才真的記住:**曾經圖省錢,把 Airflow Scheduler 也丟到 spot node 上,結果 node 被雲商回收的那一刻,整個排程停擺、跑到一半的 DAG 狀態錯亂。** 教訓很簡單 —— Executor 可以跑在會消失的機器上,因為 Spark 會重算;但 Scheduler、Driver 這種「死了沒人接手」的角色,一定要釘在穩定的 on-demand node。判斷準則就一句:**這個 pod 死掉,系統能不能自己救回來?** 能,就放 spot 省錢;不能,就花錢買穩定。

### pod 用完即刪,逼你把 observability 補起來

K8s 最反直覺的副作用是:**出事的那個 executor pod,往往在你想看 log 時已經被刪掉了。** 在 YARN 時代我習慣 SSH 上去翻日誌,這招在這裡完全失效。所以上 K8s 的同時,日誌與 metrics 一定要**即時送出去**(集中式 logging + Spark History Server 之類),不能依賴「事後上機器撈」。這跟 [[airflow-scheduling|Airflow 那篇]]講的冪等與可重跑是同一種思維 —— 生產系統不能假設任何一台機器、任何一個 pod 事後還在。

### 還是那句:先確認痛點再上 K8s

最後潑個冷水。K8s 把這套架構講得很漂亮,但它本身是**一座要人維運的大山**。資料量還沒大到要橫跨多台、團隊也沒有 K8s 底子時,硬上只是把「調 Spark」的麻煩換成「調 Spark + 修 K8s」的雙倍麻煩。我的順位一律是 [[pain-before-power|先確認痛點,再上重武器]]:撐得住就 managed 平台(Databricks、EMR、Glue),真的需要把多種工作負載塞進同一池彈性資源、又有人顧得動,才是 K8s 發光的時候。**統一抽象是它的獎賞,維運成本是它的入場費 —— 兩個都要算進去。**
