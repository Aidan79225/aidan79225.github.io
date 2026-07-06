---
title: "Service:擋在短命 Pod 前面的固定門牌"
date: 2026-07-06
category: tech
description: "Pod 隨時會被換掉、IP 會變,那別的服務怎麼穩定找到它?答案是 Service——一個固定的 IP 與 DNS 名字,擋在一群生生死死的 Pod 前面,並自動把流量分到健康的那些。這篇把 Service、背後的 Endpoints 名單、以及對外的幾種類型講清楚。"
tags:
  - kubernetes
  - concept
  - networking
series: "Kubernetes 學習筆記"
seriesOrder: 4
comments: true
draft: false
---
[[k8s-pod-node-scheduler|第二篇]]留了一個問題:既然 Pod 是短命的、被換掉就有**新的 IP**,那別的服務要怎麼穩定找到它?你總不能把某顆 Pod 的 IP 寫死在設定裡——它下一秒可能就不在了。這篇的主角 **Service**,就是 K8s 給這個問題的答案:**一個固定的門牌,擋在一群會變的 Pod 前面。**

## 先看清問題:Pod 的 IP 不能記

[[k8s-deployment|上一篇]]的滾動更新,每換一次版,舊 Pod 全被新 Pod 取代——**而新 Pod 有新 IP。** ReplicaSet 補一顆掛掉的 Pod 時,補上的也是**全新的 IP**。也就是說,Pod 的 IP **本質上是浮動的**。任何「我先查到後端 Pod 的 IP,然後記起來連它」的做法,都注定會在某次重排、某次換版之後斷線。你需要的是一個**不會變**的東西當中介。

## Service:一個固定 IP + 一個 DNS 名字

Service 就是那個不變的中介。你給它一個 **label selector**(例如 `app=web`),它就代表**所有帶這個標籤的 Pod**;對外它有一個**固定的虛擬 IP(ClusterIP)**和一個**固定的 DNS 名字**。呼叫方永遠打這個門牌,Service 再把流量**負載均衡**到背後健康的 Pod:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 250" role="img" aria-label="呼叫方只打 Service 的固定 IP 與 DNS 名字;Service 用 selector app=web 選中一群 Pod,把流量負載均衡分過去。背後 Pod 生死、IP 從 .8 換成 .31,呼叫方完全無感" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="sv" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="20" y="95" width="110" height="60" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="75" y="120" fill="#e6e6e6" font-size="11" text-anchor="middle">呼叫方</text>
    <text x="75" y="137" fill="#9aa4b2" font-size="8.5" text-anchor="middle">只認 web 這名字</text>
    <line x1="130" y1="125" x2="186" y2="125" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sv)"/>
    <rect x="188" y="86" width="192" height="80" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="284" y="107" fill="#4f6df5" font-size="11.5" font-weight="bold" text-anchor="middle">Service:web</text>
    <text x="284" y="124" fill="#9aa4b2" font-size="8" text-anchor="middle">固定 IP 10.96.0.10 · DNS web.*.svc</text>
    <text x="284" y="140" fill="#54b890" font-size="8.5" text-anchor="middle">selector: app=web</text>
    <text x="284" y="155" fill="#9aa4b2" font-size="8" text-anchor="middle">自動負載均衡到健康 Pod</text>
    <line x1="380" y1="120" x2="436" y2="46" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#sv)"/>
    <line x1="380" y1="127" x2="436" y2="122" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#sv)"/>
    <line x1="380" y1="134" x2="436" y2="198" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#sv)"/>
    <rect x="438" y="24" width="150" height="44" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="513" y="42" fill="#e6e6e6" font-size="10" text-anchor="middle">Pod · 10.1.2.7</text>
    <text x="513" y="57" fill="#54b890" font-size="8.5" text-anchor="middle">✓ 健康</text>
    <rect x="438" y="100" width="150" height="44" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="513" y="118" fill="#e6e6e6" font-size="10" text-anchor="middle">Pod · IP 會變</text>
    <text x="513" y="133" fill="#d6a45c" font-size="8.5" text-anchor="middle">掛了換新:.8 → .31</text>
    <rect x="438" y="176" width="150" height="44" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="513" y="194" fill="#e6e6e6" font-size="10" text-anchor="middle">Pod · 10.1.4.2</text>
    <text x="513" y="209" fill="#54b890" font-size="8.5" text-anchor="middle">✓ 健康</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">呼叫方永遠打 Service 的固定門牌;背後 Pod 生生死死、IP 一直換,它完全無感——這就是 Service 的核心價值:用穩定的抽象擋住會變的實體</figcaption>
</figure>

宣告一個 Service 其實很短,重點就是那個 selector:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    app: web           # 選中所有帶這個標籤的 Pod(不管它現在幾個、IP 是多少)
  ports:
    - port: 80         # Service 對外的 port
      targetPort: 8080 # 實際轉到 Pod 的 port
```

有了它,叢集裡其他服務要連,只要用**名字**——`http://web`(同 namespace)或 `http://web.default.svc.cluster.local`(跨 namespace 的完整寫法)。**沒有人需要知道背後 Pod 是誰、有幾個、IP 是多少。**

## 背後是一份會自動更新的名單

Service 怎麼知道現在哪些 Pod 該收流量?它背後有一份 **Endpoints(新版叫 EndpointSlice)名單**,列出「**目前符合 selector 且通過健康檢查的 Pod IP**」。而這份名單不是你維護的——**又是 reconcile loop:**

- Pod 增減、被重排、換版 → controller 立刻更新這份名單。
- Pod 還沒 ready(readiness probe 沒過)→ **不會被放進名單**,流量不會打過去。

這正是[[k8s-deployment|滾動更新]]能做到「不中斷」的關鍵:新 Pod 要**真的準備好**才會進名單收流量,舊 Pod 收乾淨才移除。你在[[k8s-intro|第一篇]]看到的那個「宣告期望、loop 收斂現實」的模式,在這裡又出現一次——只是這次收斂的對象是「哪些 Pod 該收流量」。

## 從叢集內到公網:Service 的幾種類型

上面的 ClusterIP 只有**叢集內**連得到。但總有些服務要讓外面連進來,於是 Service 有幾種「對外程度」遞增的類型:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 240" role="img" aria-label="四種對外方式由內到外:ClusterIP 只有叢集內、NodePort 每台 Node 開一個 port、LoadBalancer 雲端配對外 IP、Ingress 是 L7 智慧入口按 host 或 path 分流到多個 Service" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <rect x="40" y="18" width="452" height="42" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="70" y="44" fill="#4f6df5" font-size="11" font-weight="bold" text-anchor="start">ClusterIP</text>
    <text x="180" y="44" fill="#9aa4b2" font-size="8.8" text-anchor="start">預設 · 只有叢集內能連(後端服務彼此互打)</text>
    <rect x="40" y="68" width="452" height="42" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.7"/>
    <text x="70" y="94" fill="#54b890" font-size="11" font-weight="bold" text-anchor="start">NodePort</text>
    <text x="180" y="94" fill="#9aa4b2" font-size="8.8" text-anchor="start">每台 Node 開一個 port,外面用 Node:Port 連(測試常用)</text>
    <rect x="40" y="118" width="452" height="42" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.7"/>
    <text x="70" y="144" fill="#d6a45c" font-size="11" font-weight="bold" text-anchor="start">LoadBalancer</text>
    <text x="180" y="144" fill="#9aa4b2" font-size="8.8" text-anchor="start">雲端配一個對外 IP / LB,正式對外服務的做法</text>
    <rect x="40" y="168" width="452" height="42" rx="7" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.7"/>
    <text x="70" y="194" fill="#9b6ff0" font-size="11" font-weight="bold" text-anchor="start">Ingress</text>
    <text x="180" y="194" fill="#9aa4b2" font-size="8.8" text-anchor="start">L7 入口:一個 IP 按 host/path 分流到多個 Service</text>
    <line x1="524" y1="24" x2="524" y2="204" stroke="#3a4154" stroke-width="1.4" marker-end="url(#ex)"/>
    <defs><marker id="ex" markerWidth="9" markerHeight="9" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="548" y="100" fill="#9aa4b2" font-size="9" text-anchor="middle" transform="rotate(90 548 110)">對外程度遞增</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一層層把服務從叢集內推向公網。實務上對外多半是「Ingress 擺在 LoadBalancer 後面,按 path 把流量分給各個 ClusterIP Service」——它們最後都指向同一種內部門牌</figcaption>
</figure>

實務上最常見的組合,是**一個對外的 Ingress(或 LoadBalancer)+ 一堆內部的 ClusterIP Service**:外面只開一個入口,進來後按網址路由到各個服務。至於 ClusterIP 的一個變形——**headless Service**(不配虛擬 IP、不做負載均衡,而是讓你用 DNS 直接拿到**每一顆** Pod)——是有狀態服務(資料庫、[[k8s-pod-node-scheduler|StatefulSet]])會用到的,系列第 6 篇再談。

## 反思

### 「穩定的抽象擋在會變的實體前面」是整個 K8s 的招牌動作

Service 這個設計,我越想越覺得漂亮:它沒有讓 Pod 變得更穩定,而是**接受 Pod 就是會變**,然後在前面架一層永遠不動的門牌。這跟[[k8s-pod-node-scheduler|第二篇]]說的「Pod 是牛不是寵物」是同一套哲學的兩面——你不去馴服會變的東西,你在它前面放一個不變的介面。我在 [[airflow-spark-on-k8s|Airflow + Spark on K8s]] 那篇就吃過這個甜頭:Spark 的 executor 生生死死,但它們要找的 driver 靠一個固定的 Service 名字就找得到,不用管 driver Pod 實際落在哪台、IP 是多少。**一旦你習慣「用穩定抽象包住短命實體」這個模式,K8s 後面的東西——Volume、StatefulSet、Ingress——都是它的變形。**

### 服務之間用「名字」相認,而不是 IP

從寫死 IP 改成用 DNS 名字連服務,這個轉變比它看起來更重要。以前微服務之間互打,最痛的就是「那台機器 IP 換了、那個 port 改了」這種脆弱的耦合;在 K8s 裡,`http://web` 這個名字**幾乎永遠有效**,底層 Pod 怎麼搬、怎麼擴縮,名字都不變。這讓我在設計服務邊界時心態完全不同——**我依賴的是一個穩定的合約(名字 + port),不是一個易碎的位置(IP)。** 這也是為什麼我現在看任何系統,都會先問一句:「這裡耦合的是名字還是位置?」耦合位置的,遲早會為了那個位置的變動付出代價。

### 又是那個 reconcile loop——只是換了收斂對象

寫到這篇我更確定[[k8s-intro|第一篇]]的判斷:**reconcile loop 是理解 K8s 的那把萬能鑰匙。** Deployment 收斂的是「Pod 數量」,Service 背後的 Endpoints 收斂的是「哪些 Pod 該收流量」,本質是同一個迴圈。這對我 debug 特別有用:當「服務連不到後端」時,我不會瞎猜,而是直接去看那份名單——Endpoints 是不是空的?八成是 selector 標籤打錯、或 Pod 的 readiness probe 一直沒過所以沒進名單。**把每個功能都還原成「誰在收斂什麼」,問題就從玄學變成一條可以按圖索驥的線。**
