---
title: "進階排程:讓 Pod 去對的 node"
date: 2026-07-17
category: tech
tags:
  - kubernetes
  - scheduling
series: "Kubernetes 學習筆記"
seriesOrder: 7
comments: true
draft: false
---
[[k8s-pod-node-scheduler|第二篇]]講過 Scheduler 幫 Pending 的 Pod 挑 node 分兩步:**先過濾(裝得下、規則允許)、再評分(挑最佳)。** 那時我說「過濾與評分背後的旋鈕之後專門一篇講」——就是這篇。預設 Scheduler 已經很聰明,多數時候你什麼都不用管;但當你需要「這批 Pod 給我跑在 GPU 機器」「別跟那個吵鄰居擠同一台」「這池機器只保留給特定服務」時,就得動這些旋鈕。這也是 [[airflow-spark-on-k8s|Airflow + Spark on K8s]] 那篇「把 Airflow 核心釘穩定 node、把 Spark executor 丟 spot node」背後真正的機制。

先建立一個最容易搞混的心智模型:**是誰在挑誰?**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 250" role="img" aria-label="排程三種關係:affinity/nodeSelector 是 Pod 依 node 的 label 去挑 node(拉);taint 是 node 把沒有對應 toleration 的 Pod 趕走(推);toleration 只是讓 Pod 對某個 taint 免疫,不等於把它吸過去" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="pull" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#54b890"/></marker><marker id="push" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#e0733a"/></marker></defs>
    <rect x="34" y="80" width="168" height="104" rx="11" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="118" y="104" fill="#4f6df5" font-size="12.5" font-weight="bold" text-anchor="middle">Pod</text>
    <text x="118" y="126" fill="#9aa4b2" font-size="9" text-anchor="middle">nodeSelector / affinity</text>
    <text x="118" y="140" fill="#9aa4b2" font-size="9" text-anchor="middle">「我想去 disk=ssd 的 node」</text>
    <rect x="46" y="152" width="144" height="22" rx="5" fill="#1f2330" stroke="#54b890" stroke-width="1.3"/>
    <text x="118" y="167" fill="#54b890" font-size="8.5" text-anchor="middle">toleration:對 gpu taint 免疫</text>
    <rect x="358" y="80" width="168" height="104" rx="11" fill="#262b3a" stroke="#54b890" stroke-width="1.9"/>
    <text x="442" y="104" fill="#54b890" font-size="12.5" font-weight="bold" text-anchor="middle">Node</text>
    <text x="442" y="126" fill="#9aa4b2" font-size="9" text-anchor="middle">label: disk=ssd</text>
    <rect x="370" y="140" width="144" height="34" rx="5" fill="#1f2330" stroke="#e0733a" stroke-width="1.3"/>
    <text x="442" y="156" fill="#e0733a" font-size="8.5" text-anchor="middle">taint: gpu=true:NoSchedule</text>
    <text x="442" y="169" fill="#9aa4b2" font-size="7.5" text-anchor="middle">沒免疫的 Pod 一律趕走</text>
    <path d="M202 108 C 270 92, 300 92, 356 108" fill="none" stroke="#54b890" stroke-width="1.8" marker-end="url(#pull)"/>
    <text x="279" y="86" fill="#54b890" font-size="9.5" text-anchor="middle">拉:Pod 依 label 挑 node</text>
    <path d="M356 158 C 300 176, 270 176, 204 160" fill="none" stroke="#e0733a" stroke-width="1.8" marker-end="url(#push)"/>
    <text x="279" y="200" fill="#e0733a" font-size="9.5" text-anchor="middle">推:node 把沒免疫的 Pod 趕走</text>
    <text x="279" y="222" fill="#9aa4b2" font-size="8.5" text-anchor="middle">toleration 只是免疫,不會把 Pod「吸」過去</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三種關係別搞混:<b>affinity / nodeSelector</b> 是 Pod 主動挑 node(拉)、<b>taint</b> 是 node 趕走 Pod(推)、<b>toleration</b> 只是讓 Pod 對某個 taint 免疫——「免疫」不等於「被吸過去」,這是最常見的誤解</figcaption>
</figure>

## 先決條件:requests 決定「裝不裝得下」

在挑 node 之前,過濾的第一關永遠是資源。每個 Pod 可以宣告 `requests`(我至少要這麼多)與 `limits`(我最多用到這),但對排程來說,**只有 `requests` 有意義**:

- Scheduler 把每台 node 上**所有 Pod 的 `requests` 加總**,看還剩多少,判斷新 Pod 塞不塞得下。
- 它**不看 node 的實際使用率**,也**不看 `limits`**。就算一台 node 上的 Pod 實際只用了 10% CPU,只要 `requests` 已經加總到滿,新 Pod 就是排不進去。

這帶出兩個常踩的坑:**`requests` 寫太大** → Pod 卡在 Pending(明明機器很閒卻排不進);**`requests` 寫太小或不寫** → 一台 node 被塞爆,大家搶資源互相拖垮。`requests` 是排程的依據,`limits` 是執行期的天花板——**排程只認前者。**

## 讓 Pod 挑 node:nodeSelector 與 node affinity

想叫 Pod「去某一種 node」,前提是 node 身上得有 **label**(`kubectl label node node1 disk=ssd`)。接著由淺到深有三種寫法:

- **nodeSelector**:最簡單,Pod 寫 `nodeSelector: {disk: ssd}`,就是「**只**去 label 完全吻合的 node」。硬性、只能相等比對。
- **node affinity(required)**:`requiredDuringSchedulingIgnoredDuringExecution`——一樣硬性「非去不可」,但表達力更強,支援 `In / NotIn / Exists` 這種運算子(例如「disk 是 ssd **或** nvme」)。
- **node affinity(preferred)**:`preferredDuringSchedulingIgnoredDuringExecution`——**軟性偏好**,附一個權重。有符合的 node 就優先,**沒有也還是排得上去**,不會卡 Pending。

那串又臭又長的名字其實是兩段資訊:`requiredDuringScheduling`=排程時硬性要求;`IgnoredDuringExecution`=**排上去之後**,就算 node 的 label 事後被改掉,**已經在跑的 Pod 也不會被踢走**。記住這個字尾,就懂了 affinity 的作用範圍只在「排程那一刻」。

## 讓 node 挑 pod:taint 與 toleration

affinity 是 Pod 主動挑,**taint 則是 node 反過來排斥 Pod。** 你在 node 上打一個污點(`kubectl taint node node1 gpu=true:NoSchedule`),預設情況下**沒有對應 toleration 的 Pod 一律不准排上來**。effect 有三種,力道遞增:

| effect | 對還沒排上的 Pod | 對已經在跑的 Pod |
|---|---|---|
| `PreferNoSchedule` | 盡量別排上來(軟性) | 不動 |
| `NoSchedule` | 不准排上來(硬性) | 不動 |
| `NoExecute` | 不准排上來 | **連正在跑的都驅逐**(除非它容忍) |

Pod 這邊寫上對應的 **toleration**,就拿到「這個 taint 擋不住我」的入場券。這裡是全篇最該記牢的一點:**toleration 只是「免疫」,不是「吸引」。** 一個帶 GPU toleration 的 Pod,並不會因此被**拉去** GPU node——它只是「可以」去,Scheduler 大可把它排到別台空的一般 node。想真正做到「這池機器**只**給某種 Pod、而且那種 Pod **一定**來這」,得三個旋鈕一起上:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 280" role="img" aria-label="專屬 node 的組合技:GPU node 打了 NoSchedule taint。Pod A 沒有 toleration 被擋掉、落到一般 node;Pod B 有 toleration 但沒有 affinity,雖然進得去 GPU node 卻也可能被排到一般 node;Pod C 有 toleration 加上 nodeAffinity=gpu,才會穩定落在 GPU node" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="ok" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#54b890"/></marker><marker id="no" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="410" y="24" width="192" height="96" rx="10" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.8"/>
    <text x="506" y="46" fill="#9b6ff0" font-size="11.5" font-weight="bold" text-anchor="middle">GPU node</text>
    <text x="506" y="63" fill="#9aa4b2" font-size="8.5" text-anchor="middle">label: hw=gpu</text>
    <text x="506" y="78" fill="#e0733a" font-size="8.5" text-anchor="middle">taint: gpu=true:NoSchedule</text>
    <text x="506" y="100" fill="#9aa4b2" font-size="8" text-anchor="middle">只想留給要 GPU 的 Pod</text>
    <rect x="410" y="176" width="192" height="80" rx="10" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.5"/>
    <text x="506" y="200" fill="#e6e6e6" font-size="11.5" text-anchor="middle">一般 node</text>
    <text x="506" y="217" fill="#9aa4b2" font-size="8.5" text-anchor="middle">沒有 taint</text>
    <text x="506" y="234" fill="#9aa4b2" font-size="8" text-anchor="middle">誰都排得上來</text>
    <rect x="14" y="24" width="196" height="34" rx="7" fill="#1f2330" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="112" y="39" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Pod A · 無 toleration</text>
    <text x="112" y="52" fill="#9aa4b2" font-size="8" text-anchor="middle">被 taint 擋 → 落一般 node</text>
    <rect x="14" y="112" width="196" height="34" rx="7" fill="#1f2330" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="112" y="127" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Pod B · 有 toleration</text>
    <text x="112" y="140" fill="#9aa4b2" font-size="8" text-anchor="middle">進得去,但沒 affinity → 不一定去</text>
    <rect x="14" y="200" width="196" height="34" rx="7" fill="#1f2330" stroke="#54b890" stroke-width="1.6"/>
    <text x="112" y="215" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Pod C · toleration + affinity</text>
    <text x="112" y="228" fill="#54b890" font-size="8" text-anchor="middle">免疫 ＋ 被拉 → 穩定落 GPU node</text>
    <path d="M210 45 C 300 70, 330 190, 408 205" fill="none" stroke="#54b890" stroke-width="1.5" marker-end="url(#ok)"/>
    <path d="M210 36 C 300 30, 330 30, 408 40" fill="none" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 3" marker-end="url(#no)"/>
    <text x="322" y="20" fill="#9aa4b2" font-size="8" text-anchor="middle">✗ 被擋</text>
    <path d="M210 129 C 300 118, 330 90, 408 78" fill="none" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#no)"/>
    <path d="M210 138 C 300 175, 330 200, 408 210" fill="none" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#no)"/>
    <text x="330" y="150" fill="#9aa4b2" font-size="8" text-anchor="middle">兩邊都可能</text>
    <path d="M210 217 C 300 210, 340 90, 408 74" fill="none" stroke="#54b890" stroke-width="1.8" marker-end="url(#ok)"/>
    <text x="322" y="256" fill="#54b890" font-size="8" text-anchor="middle">✓ 一定落 GPU node</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">「專屬 node」的組合技:<b>taint</b> 把閒雜 Pod 擋在外面(Pod A)、<b>toleration</b> 讓對的 Pod 拿到入場券(Pod B)、<b>node affinity</b> 再把它真正拉進來(Pod C)。少了 affinity,有免疫的 Pod 也可能跑去別台——三個一起才鎖得住</figcaption>
</figure>

## 最後手段:nodeName 直接手動排程

如果你連 Scheduler 都不想經過,Pod 裡直接寫 `nodeName: node1`——這台是我指定的,**繞過整個排程流程**,kubelet 直接在那台把它拉起來。代價是:它**不做任何檢查**,那台裝不下就卡死(Pod 一直 Pending 也沒人幫你換一台),node 掛了也不會被重排到別處。這是 debug 或極特殊需求才用的逃生門,**正常情況一律讓 Scheduler 決定**——把「放哪」交給會算的它,你只描述約束,別自己指定答案。

> 順帶一提,除了 Pod 挑 node,還有 Pod 挑 **Pod**:`podAffinity`(把相關的 Pod 湊在同一區,減少跨區延遲)、`podAntiAffinity`(把同一個服務的副本**打散**到不同 node,一台掛了不會全滅),以及 `topologySpreadConstraints`(更精細地要求跨 zone / node 平均分布)。原理跟 node affinity 一樣是「拉」與「推」,只是這回挑的是別的 Pod,不是 node。真要打散高可用副本時,`podAntiAffinity` 是最常用的一招。

## 落成 YAML:三個旋鈕一起上

把「專屬 node」那張組合技圖落成宣告。先給 GPU node 打一個污點(這是指令,不是 YAML):

```bash
kubectl label node gpu-1 hw=gpu                          # 貼標籤:讓 affinity 挑得到
kubectl taint node gpu-1 gpu=true:NoSchedule             # 打污點:趕走沒免疫的 Pod
```

然後在 Pod 樣板裡把三個旋鈕寫齊——`resources.requests`(排程的容量依據)、`nodeAffinity`(拉:我要去 `hw=gpu` 的 node)、`tolerations`(免疫:我扛得住那個 taint):

```yaml
    spec:
      containers:
        - name: trainer
          image: myrepo/trainer:1.0
          resources:
            requests: { cpu: "2", memory: "8Gi" }   # Scheduler 靠這個判斷裝不裝得下
      affinity:
        nodeAffinity:                               # 拉:硬性要求去 hw=gpu 的 node
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - { key: hw, operator: In, values: [ "gpu" ] }
      tolerations:                                  # 免疫:容忍 gpu=true:NoSchedule
        - { key: gpu, operator: Equal, value: "true", effect: NoSchedule }
```

三段各對應圖裡的一環:少了 `tolerations`,Pod 被 taint 擋在門外;少了 `nodeAffinity`,有免疫的 Pod 也可能飄去別台。**兩個一起,才鎖得住「這台只給這種 Pod、且這種 Pod 一定來這」。** `requests` 則是無論如何都要寫對的地基——它是排程的帳本。

## 反思

### 「拉、推、免疫」分清楚,taint/toleration 就不再繞

我當初學這塊卡最久的,就是把 toleration 當成「把 Pod 送去那台 node 的咒語」——結果打了 taint、加了 toleration,Pod 卻跑去別台,百思不解。想通的那一刻很簡單:**toleration 只解決「能不能進」,不解決「要不要來」。** taint 是門口的保全(推),toleration 是通行證(免疫),affinity 才是真正把人帶進門的邀請(拉)。三者各司其職,少一個就漏。之後每次要設計「專屬機器池」,我都在腦裡跑一遍這張圖:**誰擋門、誰有通行證、誰負責把對的人拉進來**——一次就設對,不再試錯。

### 大多數時候,最好的排程策略是「不排」

寫了這麼多旋鈕,我的實際建議反而是**能不用就不用**。預設 Scheduler 的 bin-packing 已經處理掉九成情況,每多綁一條 affinity / taint,就多一份「以後 node 池變動、標籤改名時會爆」的耦合。我看過團隊把一堆 Pod 硬釘死在特定 node,結果某天那批機器要退役,牽一髮動全身。**先讓 Scheduler 自動放,真的有痛點(要 GPU、要隔離吵鄰居、要打散高可用副本)再出手**——這跟我對所有 K8s 進階功能的態度一致:預設夠用,別為了展示會用而用。約束加得越少,系統越有餘裕自己找最佳解。

### requests 才是排程的真相,不是 CPU 用量

最反直覺、也最常害人 debug 到深夜的一點:**Scheduler 從頭到尾不看實際使用率,只看 `requests` 的加總。** 我踩過一次——監控上 node CPU 明明才 30%,新 Pod 卻死活排不進去,查半天才發現是上面幾個 Pod 的 `requests` 開得太寬,把「帳面額度」佔滿了。從那次起我把 `requests` 當成**跟 node 簽的資源合約**在寫,而不是隨手填的數字:填太大排不進、填太小擠爆別人。要調到準,得靠實際用量的觀測回饋——這又接回 [[airflow-spark-on-k8s|上 K8s 就得把 observability 補起來]]那件事。**排程排的是你宣告的數字,不是你真正用的量;帳報得準,叢集才排得準。**
