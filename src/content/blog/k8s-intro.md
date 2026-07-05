---
title: "Kubernetes 是什麼:從「跑容器」到「宣告你要的狀態」"
date: 2026-07-07
category: tech
description: "K8s 難學,常常是因為先背 API 再學觀念。這篇從頭講:它到底解決什麼問題,以及讓一切都串起來的那一個核心觀念——宣告式的期望狀態 + reconcile loop。這是整個系列的地基。"
tags:
  - kubernetes
  - concept
series: "Kubernetes 學習筆記"
seriesOrder: 1
comments: true
draft: false
---
很多人學 Kubernetes(K8s)覺得難,是因為一上來就被 `kubectl`、一堆 YAML 欄位、幾十種資源名詞淹沒。但其實 K8s 只有**一個核心觀念**,抓住它,後面全部都是同一句話的變形。這個系列就從這個觀念開始 —— **宣告式的期望狀態,加上一個不斷把現實拉過去的 reconcile loop。**

## 先問:它到底解決什麼問題

假設你已經會用 Docker,手上有一個容器化的服務。上線時你會發現一堆麻煩事:

- 容器掛了,誰**自動重啟**它?
- 流量變大,誰**多開幾個**、流量小又**收回來**?
- 某台機器整台壞了,上面的容器**搬去哪**?
- 要出新版,怎麼**不中斷服務**滾動更新、出包了怎麼**回滾**?

手動一個個 `docker run`、壞了 SSH 上去救,幾台還行,幾十台就是災難。**K8s 就是那個幫你顧容器的「容器編排器」** —— 把「一堆容器要跑在一堆機器上、還要活著、要擴縮、要換版」這件事自動化。

## 核心觀念:宣告期望,讓它自己收斂

但 K8s 真正聰明的地方,不是「功能多」,而是**它達成這些的方式**。你不會去下「重啟這個容器」「在那台機器開一個」這種一步步的指令;你只**宣告你想要的最終狀態**,K8s 自己想辦法達成、而且**持續維持**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 240" role="img" aria-label="reconcile loop:你宣告期望狀態(要 3 個 Pod),Controller 讀期望、觀察實際狀態(現在 2 個),有落差就動作(建 1 個),不斷把實際拉向期望" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rl" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="24" y="92" width="140" height="58" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="94" y="116" fill="#e6e6e6" font-size="11.5" text-anchor="middle">期望狀態</text>
    <text x="94" y="134" fill="#9aa4b2" font-size="9" text-anchor="middle">你宣告:replicas = 3</text>
    <rect x="210" y="86" width="140" height="70" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="280" y="112" fill="#4f6df5" font-size="12" font-weight="bold" text-anchor="middle">Controller</text>
    <text x="280" y="130" fill="#9aa4b2" font-size="9" text-anchor="middle">控制迴圈</text>
    <text x="280" y="144" fill="#9aa4b2" font-size="9" text-anchor="middle">比較 & 修正</text>
    <rect x="396" y="92" width="140" height="58" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/>
    <text x="466" y="116" fill="#e6e6e6" font-size="11.5" text-anchor="middle">實際狀態</text>
    <text x="466" y="134" fill="#9aa4b2" font-size="9" text-anchor="middle">現在只有 2 個</text>
    <line x1="164" y1="121" x2="208" y2="121" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#rl)"/>
    <text x="186" y="112" fill="#9aa4b2" font-size="8.5" text-anchor="middle">① 讀期望</text>
    <line x1="350" y1="110" x2="394" y2="110" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#rl)"/>
    <text x="372" y="102" fill="#9aa4b2" font-size="8.5" text-anchor="middle">② 動作</text>
    <line x1="394" y1="136" x2="350" y2="136" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#rl)"/>
    <text x="372" y="150" fill="#9aa4b2" font-size="8.5" text-anchor="middle">③ 觀察</text>
    <text x="466" y="176" fill="#54b890" font-size="9" text-anchor="middle">2 → 建 1 個 → 3 ✓</text>
    <text x="280" y="212" fill="#9aa4b2" font-size="10" text-anchor="middle">reconcile loop:不斷比較期望與實際,有落差就修正 —— 這就是 K8s 的靈魂</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">你只宣告「我要 3 個」;Controller 持續觀察實際、發現落差就動手補齊。容器掛一個就補一個、機器壞了就換地方開 —— 全是這個迴圈的結果</figcaption>
</figure>

**這個 reconcile loop 就是整個 K8s 的靈魂。** 之後你會遇到的 Deployment、Service、每一種資源,背後都是同一件事:你宣告一個期望,某個 controller 不斷地把現實拉過去。這個系列每一篇,我都會回扣這句話。

## 命令式 vs 宣告式:為什麼這個差別很重要

換個角度看這個轉變:

| | 命令式(過去) | 宣告式(K8s) |
|---|---|---|
| 你做什麼 | 下一步步的指令:開這個、停那個 | 描述**想要的結果**:我要 3 個、跑這版 |
| 誰維持狀態 | 你(壞了要自己救) | 系統(自動收斂、自我修復) |
| 可重複 | 難(指令有先後、有副作用) | 冪等(套幾次結果一樣) |
| 能版控嗎 | 難 | **可以**:一份 YAML 就是你的期望 |

宣告式最大的紅利,是**你的「期望」變成一份可以版控的檔案**。整個叢集該長什麼樣,寫在 Git 裡、能 review、能回溯 —— 這就是 GitOps 的基礎。

一份最小的「期望」長這樣:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3                # 我要 3 個
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: web
          image: myrepo/web:1.0   # 跑這個映像檔
```

然後 `kubectl apply -f web.yaml`。你沒有叫它「開三個容器」,你只說「我要 3 個 `web:1.0`」—— 剩下的交給 reconcile loop。

## 叢集長什麼樣:大腦與工人

那「Controller 不斷收斂」這件事發生在哪?K8s 叢集分成兩半:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 270" role="img" aria-label="K8s 叢集分兩半:Control Plane 是大腦,含 API Server、Scheduler、Controller Manager、etcd;下面是 Worker Node,每個跑 kubelet 與 Pod。你用 kubectl apply 把期望送給 API Server" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="ca" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="300" y="16" fill="#9aa4b2" font-size="9.5" text-anchor="middle">你:kubectl apply(宣告期望的 YAML)</text>
    <line x1="300" y1="22" x2="300" y2="40" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ca)"/>
    <rect x="30" y="42" width="540" height="86" rx="10" fill="none" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="80" y="60" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">Control Plane · 大腦</text>
    <rect x="44" y="70" width="118" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="103" y="90" fill="#e6e6e6" font-size="9.5" text-anchor="middle">API Server</text><text x="103" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">唯一入口</text>
    <rect x="172" y="70" width="118" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="231" y="90" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Scheduler</text><text x="231" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">pod 排到哪</text>
    <rect x="300" y="70" width="138" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="369" y="90" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Controller Mgr</text><text x="369" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">跑 reconcile loop</text>
    <rect x="448" y="70" width="108" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="502" y="90" fill="#e6e6e6" font-size="9.5" text-anchor="middle">etcd</text><text x="502" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">狀態資料庫</text>
    <line x1="300" y1="128" x2="120" y2="168" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ca)"/>
    <line x1="300" y1="128" x2="300" y2="168" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ca)"/>
    <line x1="300" y1="128" x2="480" y2="168" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ca)"/>
    <rect x="34" y="170" width="172" height="86" rx="8" fill="none" stroke="#3a4154" stroke-width="1.4"/>
    <text x="120" y="188" fill="#e6e6e6" font-size="10" text-anchor="middle">Worker Node</text>
    <text x="120" y="202" fill="#9aa4b2" font-size="8" text-anchor="middle">kubelet</text>
    <circle cx="95" cy="228" r="12" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="95" y="231" fill="#9aa4b2" font-size="8" text-anchor="middle">Pod</text>
    <circle cx="145" cy="228" r="12" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="145" y="231" fill="#9aa4b2" font-size="8" text-anchor="middle">Pod</text>
    <rect x="214" y="170" width="172" height="86" rx="8" fill="none" stroke="#3a4154" stroke-width="1.4"/>
    <text x="300" y="188" fill="#e6e6e6" font-size="10" text-anchor="middle">Worker Node</text>
    <text x="300" y="202" fill="#9aa4b2" font-size="8" text-anchor="middle">kubelet</text>
    <circle cx="300" cy="228" r="12" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="300" y="231" fill="#9aa4b2" font-size="8" text-anchor="middle">Pod</text>
    <rect x="394" y="170" width="172" height="86" rx="8" fill="none" stroke="#3a4154" stroke-width="1.4"/>
    <text x="480" y="188" fill="#e6e6e6" font-size="10" text-anchor="middle">Worker Node</text>
    <text x="480" y="202" fill="#9aa4b2" font-size="8" text-anchor="middle">kubelet</text>
    <circle cx="455" cy="228" r="12" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="455" y="231" fill="#9aa4b2" font-size="8" text-anchor="middle">Pod</text>
    <circle cx="505" cy="228" r="12" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="505" y="231" fill="#9aa4b2" font-size="8" text-anchor="middle">Pod</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Control Plane 是大腦(決定要跑什麼、排到哪、持續修正落差,狀態全存 etcd);Worker Node 是工人,每個跑一個 kubelet 照顧上面的 Pod</figcaption>
</figure>

- **Control Plane(大腦)**:`kubectl apply` 送到唯一入口 **API Server**;**Scheduler** 決定新 pod 排到哪台;**Controller Manager** 跑那些 reconcile loop;**etcd** 存下整個叢集的狀態。
- **Worker Node(工人)**:真正跑你 Pod 的機器,每台一個 **kubelet** 負責照顧本機的 pod。

這些元件的細節不用現在背 —— **Pod、Node、Scheduler** 是[[airflow-spark-on-k8s|下一篇]]的主角。這篇你只要先把那個迴圈刻進腦子。

## 反思

### K8s 難,常常是因為學的順序反了

我看很多人(包括當年的我)學 K8s 是**從 API 背起** —— 背 `kubectl` 指令、背 YAML 欄位、背一堆資源類型,結果學得很痛、又串不起來。後來我才想通:**應該先抓住那個 reconcile loop,再回頭看每個資源。** 一旦你知道「所有東西都是:你宣告期望、controller 把現實拉過去」,那些看似無關的名詞——Deployment、ReplicaSet、Service、HPA——瞬間都變成同一個模式的不同套用。**先有心智模型,細節才掛得上去**,這跟我讀 [[fode-2|資料工程生命週期]]的體會一模一樣。

### 「宣告式 + 版控」是我最欣賞 K8s 的地方

真正讓我覺得 K8s 漂亮的,不是它能自動重啟容器,而是**它把「叢集該長什麼樣」變成一份可版控的檔案**。整個系統的期望狀態寫在 Git 裡、能 review、能回溯、能一鍵重建 —— 這跟 [[dbt-intro|dbt]] 把資料轉換變成版控程式碼、是同一種工程紀律的勝利:**把「會變的東西」從人的腦袋與臨時操作裡,搬進可追蹤的宣告。** 命令式的世界靠「某個人記得怎麼救」,宣告式的世界靠「一份大家都看得到的期望」。

### 但別為了潮而上 K8s

最後照例潑冷水:K8s 很強,但它本身是一座**要人維運的大山**。服務還只有一兩個、團隊也沒有 K8s 底子時,硬上只是把「顧容器」的麻煩換成「顧容器 + 顧 K8s」的雙倍麻煩。我的順位一直是 [[pain-before-power|先確認痛點,再上重武器]]:先問「我是不是真的多到、雜到需要一個編排器」,再決定要不要走進這座山。看懂它的價值,和判斷自己該不該用它,是兩件事 —— 這個系列幫你做到前者,後者的判斷還是得回到你的痛點。
