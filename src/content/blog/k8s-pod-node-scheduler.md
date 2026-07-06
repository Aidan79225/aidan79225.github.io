---
title: "Pod、Node、Scheduler:Kubernetes 叢集的三個原子"
date: 2026-07-06
category: tech
description: "上一篇的 reconcile loop 幫你維持「我要 3 個」,但那 3 個到底是什麼、落在哪台機器、誰決定?這篇講 K8s 最基本的三個原子——Pod、Node、Scheduler,並解釋為什麼 Pod 是短命的。"
tags:
  - kubernetes
  - concept
series: "Kubernetes 學習筆記"
seriesOrder: 2
comments: true
draft: false
---
[[k8s-intro|上一篇]]講了 K8s 的靈魂:你宣告期望,reconcile loop 不斷把現實拉過去。但那句「我要 3 個」——**3 個什麼?落在哪台機器上?誰決定放哪?** 這篇把叢集最基本的三個原子講清楚:**Pod、Node、Scheduler。**

## Pod:最小單位,而且不是「容器」

第一個反直覺的點:**K8s 排程與伸縮的最小單位不是容器,是 Pod。** 一個 Pod 包住**一個(或少數幾個)容器**,讓它們**同生共死、共享網路與儲存**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 480 224" role="img" aria-label="Pod 解剖:一個 Pod 包住一或多個容器(app 與選配的 sidecar),它們共享同一個 IP(彼此用 localhost 通)與共享 Volume" style="width:100%;max-width:520px;height:auto;margin:0 auto;">
    <rect x="50" y="34" width="380" height="176" rx="12" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="240" y="56" fill="#4f6df5" font-size="12.5" font-weight="bold" text-anchor="middle">Pod</text>
    <text x="240" y="71" fill="#9aa4b2" font-size="8.5" text-anchor="middle">最小部署單位・排程與伸縮的單位</text>
    <rect x="78" y="86" width="150" height="60" rx="7" fill="#1f2330" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="153" y="112" fill="#e6e6e6" font-size="10.5" text-anchor="middle">容器:app</text>
    <text x="153" y="128" fill="#9aa4b2" font-size="8" text-anchor="middle">你的服務</text>
    <rect x="252" y="86" width="150" height="60" rx="7" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3"/>
    <text x="327" y="112" fill="#e6e6e6" font-size="10.5" text-anchor="middle">容器:sidecar</text>
    <text x="327" y="128" fill="#9aa4b2" font-size="8" text-anchor="middle">選配(log / proxy)</text>
    <rect x="78" y="158" width="324" height="38" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="240" y="181" fill="#54b890" font-size="9.5" text-anchor="middle">共享:一個 IP(彼此用 localhost 通)· 共享 Volume</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Pod 把「同生共死」的一或多個容器包成一個單位,共享網路(同一 IP)與儲存。多數 Pod 只有一個容器;sidecar 是選配</figcaption>
</figure>

為什麼要多這層包裝?因為有些容器**天生該綁在一起** —— 例如主服務 ＋ 一個幫它收 log 或當代理的 sidecar,它們要共用網路、一起被排程、一起生死。**但別過度用:多數 Pod 就是一個容器。** 記住這句話就好:**容器是「跑什麼」,Pod 是 K8s 真正搬動、複製、排程的單位。**

## Node:一台機器

**Node 就是一台真正的機器**(雲上多半是一台 VM)。[[k8s-intro|上一篇]]提過叢集分兩半:

- **Control Plane(大腦)**:決定要跑什麼、排到哪、持續修正落差。
- **Worker Node(工人)**:真正跑你 Pod 的機器。每台上面有個 **kubelet**,負責照顧本機的 Pod、回報狀態給大腦。

所以「我要 3 個 Pod」的實際樣子,就是這 3 個 Pod 被分配到某幾台 Node 上跑。而決定「哪個 Pod 去哪台 Node」的,是第三個原子。

## Scheduler:決定 Pod 落哪台

當 reconcile loop 要補一個新 Pod,這個 Pod 一開始是 **Pending**(還沒有 Node)。**Scheduler** 的工作,就是幫它挑一台落腳:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 250" role="img" aria-label="排程流程:一個 Pending 的新 Pod 要 2 CPU,Scheduler 先過濾裝得下且規則允許的 node,再評分挑最佳;Node A 已滿裝不下、Node C 被 taint 擋,選中剩 4 CPU 的 Node B" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="sc" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker><marker id="scg" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4f6df5"/></marker></defs>
    <rect x="20" y="98" width="120" height="56" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5" stroke-dasharray="4 3"/>
    <text x="80" y="120" fill="#e6e6e6" font-size="10.5" text-anchor="middle">新 Pod</text>
    <text x="80" y="137" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Pending · 要 2 CPU</text>
    <line x1="140" y1="126" x2="176" y2="126" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sc)"/>
    <rect x="178" y="92" width="140" height="68" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="248" y="114" fill="#4f6df5" font-size="11.5" font-weight="bold" text-anchor="middle">Scheduler</text>
    <text x="248" y="131" fill="#9aa4b2" font-size="8.5" text-anchor="middle">① 過濾:裝得下、規則允許</text>
    <text x="248" y="145" fill="#9aa4b2" font-size="8.5" text-anchor="middle">② 評分:挑最佳</text>
    <rect x="378" y="22" width="200" height="54" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="478" y="44" fill="#9aa4b2" font-size="10" text-anchor="middle">Node A · 已滿 ✗</text>
    <text x="478" y="61" fill="#9aa4b2" font-size="8.5" text-anchor="middle">剩 0.5 CPU → 裝不下</text>
    <rect x="378" y="96" width="200" height="54" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="478" y="118" fill="#e6e6e6" font-size="10" text-anchor="middle">Node B · 挑中 ✓</text>
    <text x="478" y="135" fill="#9aa4b2" font-size="8.5" text-anchor="middle">剩 4 CPU → 綁這台</text>
    <rect x="378" y="170" width="200" height="54" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="478" y="192" fill="#9aa4b2" font-size="10" text-anchor="middle">Node C · 被 taint 擋 ✗</text>
    <text x="478" y="209" fill="#9aa4b2" font-size="8.5" text-anchor="middle">有污點,Pod 沒 toleration</text>
    <line x1="318" y1="120" x2="376" y2="55" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 3" marker-end="url(#sc)"/>
    <line x1="318" y1="126" x2="376" y2="123" stroke="#4f6df5" stroke-width="1.6" marker-end="url(#scg)"/>
    <line x1="318" y1="132" x2="376" y2="192" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 3" marker-end="url(#sc)"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Scheduler 先「過濾」出裝得下、規則允許的 node,再「評分」挑最佳綁上去 —— reconcile loop 幫你補 Pod 時,那顆新 Pod 就是這樣找到落腳處的</figcaption>
</figure>

過濾與評分背後的旋鈕——**requests/limits、node 親和性、taint/toleration**——是[[airflow-spark-on-k8s|後面]]控制「誰跑在哪」的關鍵,這個系列之後會專門一篇講。這裡先知道:**Pod 落在哪台不是隨機,是 Scheduler 依資源與規則算出來的。**

## 關鍵心態:Pod 是短命的

最後一個一定要現在就建立的觀念:**Pod 是用完即丟的。** 它掛掉、被重排、滾動更新換新版時,舊的 Pod 直接消失,reconcile loop 開一個**全新的** Pod 補上——**新 Pod 有新的 IP。**

這代表:**你永遠不該記住某個 Pod 的 IP、也別把狀態存在 Pod 裡。** Pod 是牛,不是寵物——壞了就換一頭,不是抱著醫。這帶出兩個之後的主題:既然 Pod 的 IP 會變,別的服務怎麼穩定找到它?(→ [[k8s-service|Service]],系列第 4 篇);Pod 沒了資料就沒了,那資料庫這種有狀態的怎麼辦?(→ Volume 與 StatefulSet,第 6 篇)。

## 反思

### 「Pod 不是容器」這個區分,想通就順了

我剛學 K8s 時卡最久的,就是「明明是跑容器,為什麼要多一個 Pod?」後來想通:**Pod 是 K8s 的排程單位,容器是執行單位。** K8s 要搬動、複製、放置的是 Pod;至於 Pod 裡放一個還是幾個容器,是「這些東西要不要同生共死」的設計選擇。九成情況一個 Pod 一個容器,別為了炫技硬塞 sidecar。把「單位」這件事分清楚,後面 Deployment 管 Pod、Service 指向 Pod、排程排的是 Pod——全部一次順起來。

### Pod 短命是特性,不是 bug

「Pod 隨時會消失、IP 會變」聽起來很不安,但這其實是 K8s 自我修復的**前提**,不是缺陷。正因為 Pod 被當成可拋棄的,壞了才能無痛換一個。這跟我在 [[spark-running|Spark]]、[[airflow-spark-on-k8s|Spark on K8s]] 那幾篇反覆講的「executor 用完即刪」是同一種思維——**把運算單位當成牛而非寵物**。一旦接受這點,你就不會去做「記住某個 Pod」這種注定會痛的事,而會轉去用 K8s 給你的穩定抽象(Service、Volume)。

### Scheduler 幫你想「放哪」,但你可以介入

預設 Scheduler 會自動挑一台裝得下的 node,多數時候你不用管。但當你有「這批 Pod 要跑在高記憶體機器」「別跟那個吵鄰居擠同一台」這種需求時,requests、affinity、taint 這些旋鈕就是你介入的方式——我在 [[airflow-spark-on-k8s|Airflow + Spark on K8s]] 那篇用它把 Airflow 核心釘在穩定 node、把 Spark executor 丟去便宜的 spot node,就是這個道理。**先讓 Scheduler 自動幫你放,真的有需求再出手調**——這也是我對所有 K8s 進階功能的態度:預設夠用,別為了用而用。
