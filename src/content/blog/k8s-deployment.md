---
title: "Deployment 與自我修復:reconcile loop 的實戰"
date: 2026-07-06
category: tech
description: "你幾乎不會手動建 Pod——真正宣告的是 Deployment。這篇看 reconcile loop 最實用的化身:Deployment → ReplicaSet → Pod 怎麼自我修復、又怎麼零停機滾動更新與一鍵回滾。"
tags:
  - kubernetes
  - concept
series: "Kubernetes 學習筆記"
seriesOrder: 3
comments: true
draft: false
---
[[k8s-intro|第一篇]]給了靈魂(reconcile loop),[[k8s-pod-node-scheduler|第二篇]]給了原子(Pod)。但實務上你**幾乎不會手動去建一個 Pod** —— 你宣告的是 **Deployment**,而它正是 reconcile loop 最實用、最常見的化身。這篇看它怎麼**自我修復**、又怎麼**零停機換版**。

## 為什麼不直接建 Pod

因為**裸 Pod 掛了沒人救。** 你手動建一個 Pod,它一旦當掉或所在的 node 壞了,就這樣沒了 —— 沒有任何東西記得「本來該有它」。你要的不是「開一個 Pod」,而是「**永遠維持 N 個健康的 Pod**」。這正是需要一個 controller 幫你盯著的事,而 Deployment 就是幹這個的:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 262" role="img" aria-label="Deployment 管理 ReplicaSet、ReplicaSet 管理 3 個 Pod;其中一個 Pod 掛了,ReplicaSet 觀察到只剩 2 個、立刻補一個新的回到 3 個" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="dp" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="170" y="16" width="220" height="48" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="280" y="38" fill="#4f6df5" font-size="11.5" font-weight="bold" text-anchor="middle">Deployment</text>
    <text x="280" y="54" fill="#9aa4b2" font-size="8.5" text-anchor="middle">期望:replicas = 3 · image v1</text>
    <line x1="280" y1="64" x2="280" y2="90" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#dp)"/>
    <rect x="170" y="92" width="220" height="48" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="280" y="114" fill="#e6e6e6" font-size="11" text-anchor="middle">ReplicaSet</text>
    <text x="280" y="130" fill="#9aa4b2" font-size="8.5" text-anchor="middle">確保永遠有 3 個 Pod</text>
    <line x1="280" y1="140" x2="113" y2="176" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#dp)"/>
    <line x1="280" y1="140" x2="260" y2="176" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#dp)"/>
    <line x1="280" y1="140" x2="447" y2="176" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#dp)"/>
    <rect x="66" y="178" width="94" height="50" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="113" y="200" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Pod</text>
    <text x="113" y="216" fill="#54b890" font-size="9" text-anchor="middle">✓ 健康</text>
    <rect x="213" y="178" width="94" height="50" rx="7" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3"/>
    <text x="260" y="200" fill="#9aa4b2" font-size="10.5" text-anchor="middle">Pod</text>
    <text x="260" y="216" fill="#9aa4b2" font-size="9" text-anchor="middle">✗ 掛了</text>
    <rect x="400" y="178" width="94" height="50" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="447" y="200" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Pod</text>
    <text x="447" y="216" fill="#54b890" font-size="9" text-anchor="middle">✓ 健康</text>
    <text x="280" y="250" fill="#54b890" font-size="9.5" text-anchor="middle">少一個 → ReplicaSet 觀察到落差 → 立刻補一個新的回到 3 個</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">你宣告 Deployment,它透過 ReplicaSet 維持「永遠有 3 個 Pod」;掛了一個就自動補一個 —— 這就是 reconcile loop 的自我修復</figcaption>
</figure>

分工很清楚:**Deployment** 管版本與更新策略;它底下的 **ReplicaSet** 只負責一件事——**盯著實際 Pod 數,少了就補、多了就砍。** 你只宣告「我要 3 份 v1」,剩下的都是那個迴圈在跑。

## 自我修復:reconcile loop 一直在跑

所謂「K8s 會自我修復」,拆開來一點都不神秘,就是 reconcile loop 在做它該做的:

- 你宣告**期望** = 3 個 Pod。
- ReplicaSet controller 不斷比對**實際**:現在幾個健康的?
- Pod 當掉、或整台 node 壞掉 → 實際變 2 → **有落差** → 建一個新 Pod 補回 3。

**你半夜不用被叫起來重啟服務,因為那個迴圈替你做了。** 這也是為什麼[[k8s-pod-node-scheduler|上一篇]]說 Pod 短命是特性:正因為它可拋棄,壞了才能無痛換新的。

## 滾動更新:把「部署」變成日常

Deployment 真正值錢的另一半,是**換版不中斷服務**。你把 image 從 v1 改成 v2,它不會一次全砍掉重開,而是**新版一個個起、舊版一個個收**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 220" role="img" aria-label="滾動更新三個時間點:開始時三個 v1;更新中兩個 v1 一個 v2;完成時三個 v2。新版一個個起、舊版一個個收,全程維持服務不中斷" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="ru" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="88" y="24" fill="#9aa4b2" font-size="10" text-anchor="middle">開始</text>
    <text x="290" y="24" fill="#9aa4b2" font-size="10" text-anchor="middle">更新中</text>
    <text x="492" y="24" fill="#9aa4b2" font-size="10" text-anchor="middle">完成</text>
    <rect x="53" y="36" width="70" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="88" y="56" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v1</text>
    <rect x="53" y="74" width="70" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="88" y="94" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v1</text>
    <rect x="53" y="112" width="70" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="88" y="132" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v1</text>
    <rect x="255" y="36" width="70" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="290" y="56" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v1</text>
    <rect x="255" y="74" width="70" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="290" y="94" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v1</text>
    <rect x="255" y="112" width="70" height="30" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="290" y="132" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v2</text>
    <rect x="457" y="36" width="70" height="30" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="492" y="56" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v2</text>
    <rect x="457" y="74" width="70" height="30" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="492" y="94" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v2</text>
    <rect x="457" y="112" width="70" height="30" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="492" y="132" fill="#e6e6e6" font-size="9.5" text-anchor="middle">v2</text>
    <line x1="130" y1="89" x2="248" y2="89" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ru)"/>
    <line x1="332" y1="89" x2="450" y2="89" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ru)"/>
    <text x="88" y="176" fill="#4f6df5" font-size="9" text-anchor="middle">■ 舊版 v1</text>
    <text x="200" y="176" fill="#54b890" font-size="9" text-anchor="middle">■ 新版 v2</text>
    <text x="290" y="198" fill="#9aa4b2" font-size="9.5" text-anchor="middle">新版起一個、舊版收一個 → 全程有服務;出包 kubectl rollout undo 一鍵回滾</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">滾動更新:一次換一點,新舊版交棒,服務不中斷;背後是 Deployment 開一個新 ReplicaSet(v2)、慢慢把舊的(v1)縮到 0</figcaption>
</figure>

背後的機制還是同一套:更新時 Deployment 開一個**新的 ReplicaSet(v2)**,一邊把它擴上去、一邊把舊 ReplicaSet(v1)縮下來。出包了怎麼辦?因為舊 ReplicaSet 還留著,**一行 `kubectl rollout undo` 就秒回到 v1。**

日常操作其實就這幾條,全是「改期望」:

```bash
kubectl apply -f web.yaml                    # 宣告期望(3 份 v1)
kubectl set image deploy/web web=web:2.0     # 換版 → 觸發滾動更新
kubectl rollout undo deploy/web              # 出包 → 一鍵回滾
kubectl scale deploy/web --replicas=5        # 改份數 → loop 幫你補到 5
```

注意:你從頭到尾**沒有下過一個「開容器」「停容器」的指令** —— 你只是不斷更新那份「期望」,reconcile loop 把現實收斂過去。

> **一個常見的坑:改了 ConfigMap / Secret,Pod 會自動換嗎?不會。** reconcile loop 盯的是 Deployment 的 **Pod 樣板**;你去 `kubectl edit` 一份被引用的 [[k8s-config-secret|ConfigMap/Secret]],樣板本身沒變,Deployment 就**不會觸發滾動更新**。用 env 注入的 Pod 會**繼續拿舊值**,直到你手動 `kubectl rollout restart deploy/web`(或在樣板加一個內容 hash 的 annotation,讓值一改樣板就跟著變、自動滾動)。用 volume 掛載的檔案雖然會被 kubelet 更新,但**應用程式得自己重讀**才會生效。一句話:**滾動更新只認「樣板變了沒」,不認「樣板指到的東西變了沒」。**

## 反思

### 「自我修復」不是魔法,是那個迴圈一直在跑

第一次看到 Pod 被 kill 掉、幾秒後自己又冒出來,確實很神奇。但拆開就發現一點都不玄:**ReplicaSet controller 只是不停地問「實際幾個?和期望差多少?」,有差就動手。** 想通這件事之後,K8s 的「韌性」對我不再是黑魔法,而是一個很樸素的迴圈 —— 這也讓我 debug 更有方向:服務沒被拉回來,那八成是這個迴圈被什麼卡住了(資源不夠排不進、健康檢查一直失敗…),而不是「玄學」。**把神奇的東西還原成機制,是我學任何系統的第一步。**

### 滾動更新讓「部署」從緊張大事變成日常

我很吃這一套。以前部署是件要挑半夜、全員待命、深怕中斷服務的大事;有了 Deployment 的滾動更新 + 一鍵回滾,部署變成**低風險的日常動作** —— 新版慢慢頂替、出包秒退。這跟我在 [[airflow-scheduling|Airflow]] 那篇講的「Production 作業要冪等、可重跑」是同一種安全感:**讓「改變」變得可逆、可控,人就敢頻繁地小步前進**,而不是攢一大包、賭一次大的。

### 你宣告「要什麼」,不是「怎麼做」——Deployment 是最好的示範

整個系列的主軸在這篇最具體:你給 Deployment 的永遠是**目標狀態**(3 份、v2),從不是**步驟**(先開這個、再停那個)。這份「期望」還能寫進 Git、版控、review —— 就是[[k8s-intro|第一篇]]說的宣告式 + GitOps 的紅利。之後你會遇到的 Service、StatefulSet、HPA,全是同一個模式的不同套用。**抓住「宣告期望、loop 收斂」,K8s 後面的東西就都是變形題。**
