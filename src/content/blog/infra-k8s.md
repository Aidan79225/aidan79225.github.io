---
title: "Kubernetes:所有東西跑的底座,它自己怎麼站穩"
date: 2026-07-17
category: tech
description: "這系列第一個體檢的工具是 Kubernetes——但它很特殊,因為別的工具都跑在它上面,它的可靠度就是所有東西的地基。用 Infra 體檢表看它,會發現連這個平台本身,也是『stateless 大腦 + 一個 stateful 核心(etcd)』的混血,而 etcd 就是它的命門。這篇從 infra 角度看 K8s:control plane 與 etcd 的 HA、最多人踩坑的 requests/limits/QoS 資源模型、HPA/VPA/Cluster Autoscaler 三層擴展,以及為什麼有狀態的東西要跑 StatefulSet + PV。"
tags:
  - infrastructure
  - kubernetes
series: "從 Infra 角度看資料工具"
seriesOrder: 2
comments: true
draft: false
---
這系列第一個要體檢的,是 Kubernetes——但它很特殊:**別的工具都跑在它上面**。它是底座,所以它自己的可靠度,就是後面 Kafka、Spark、Redis 全部的地基。用[[infra-intro|上一篇的體檢表]]看它,會發現一件有趣的事:連這個「平台」本身,也是「**stateless 大腦 + 一個 stateful 核心**」的混血——而那個 stateful 核心,就是它的命門。

## 底座的解剖:大腦、工人,與那個命門 etcd

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 218" role="img" aria-label="Kubernetes 的解剖。上半是 Control Plane 大腦,含 API Server 唯一入口、Scheduler 排 pod、Controller Manager 跑 reconcile loop,這三個偏 stateless 可多副本;還有 etcd,是唯一真正 stateful 的核心、用 Raft、是命門。下半是 Worker Nodes 工人,每個跑 kubelet 與 Pod。說明:etcd 存整個叢集的狀態真相,掛了整個叢集會失明,現有 pod 還在跑但無法排程更新或自癒;所以 etcd 要奇數台過半、定期備份、低延遲磁碟。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">底座解剖:大腦、工人,與命門 etcd</text>
    <rect x="24" y="30" width="532" height="76" rx="8" fill="#1f2330" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="40" y="46" fill="#4f6df5" font-size="8.6" text-anchor="start" font-weight="bold">Control Plane(大腦)</text>
    <rect x="40" y="54" width="120" height="42" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="100" y="72" fill="#e6e6e6" font-size="8.2" text-anchor="middle">API Server</text><text x="100" y="86" fill="#9aa4b2" font-size="7" text-anchor="middle">唯一入口</text>
    <rect x="168" y="54" width="110" height="42" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="223" y="72" fill="#e6e6e6" font-size="8.2" text-anchor="middle">Scheduler</text><text x="223" y="86" fill="#9aa4b2" font-size="7" text-anchor="middle">排 pod 放哪</text>
    <rect x="286" y="54" width="126" height="42" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="349" y="72" fill="#e6e6e6" font-size="8.2" text-anchor="middle">Controller Mgr</text><text x="349" y="86" fill="#9aa4b2" font-size="7" text-anchor="middle">reconcile loop</text>
    <rect x="420" y="50" width="126" height="50" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.8"/><text x="483" y="68" fill="#d6a45c" font-size="8.8" text-anchor="middle" font-weight="bold">etcd ★命門</text><text x="483" y="82" fill="#e6e6e6" font-size="7.2" text-anchor="middle">狀態真相 · Raft</text><text x="483" y="93" fill="#9aa4b2" font-size="6.8" text-anchor="middle">唯一 stateful</text>
    <line x1="290" y1="106" x2="290" y2="122" stroke="#9aa4b2" stroke-width="1.2"/>
    <rect x="24" y="122" width="532" height="42" rx="8" fill="#1f2330" stroke="#54b890" stroke-width="1.3"/>
    <text x="40" y="138" fill="#54b890" font-size="8.6" text-anchor="start" font-weight="bold">Worker Nodes(工人)</text>
    <rect x="180" y="130" width="110" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1"/><text x="235" y="147" fill="#e6e6e6" font-size="7.8" text-anchor="middle">kubelet + Pods</text>
    <rect x="300" y="130" width="110" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1"/><text x="355" y="147" fill="#e6e6e6" font-size="7.8" text-anchor="middle">kubelet + Pods</text>
    <rect x="420" y="130" width="110" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1"/><text x="475" y="147" fill="#e6e6e6" font-size="7.8" text-anchor="middle">kubelet + Pods</text>
    <text x="290" y="184" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">etcd 掛了 → 整個叢集「失明」(現有 pod 還跑,但不能排程 / 更新 / 自癒)</text>
    <text x="290" y="202" fill="#9aa4b2" font-size="8" text-anchor="middle">所以 etcd 要:奇數台過半、定期備份、低延遲磁碟——它是你最該小心的東西</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">K8s 的大腦其實是幾個偏 stateless 的組件(<b style="color:#4f6df5">API Server</b> 唯一入口、<b style="color:#4f6df5">Scheduler</b> 決定 pod 放哪、<b style="color:#4f6df5">Controller Manager</b> 跑那些 reconcile loop)——它們可以多副本、掛一個換一個。真正的命門是 <b style="color:#d6a45c">etcd</b>:它用 <a href="/blog/sre-consensus/">Raft</a> 存下整個叢集的狀態真相,是 K8s 裡<b>唯一真正 stateful</b> 的核心。連「平台」本身都逃不過上一篇的結論——<b>狀態,才是要小心對待的地方</b></figcaption>
</figure>

這張圖最想讓你記住的,是 **etcd 是整個 K8s 的單一狀態真相**。control plane 那幾個大腦組件掛了都好辦(多副本、重啟),但 etcd 一旦失去多數(quorum)、或資料損毀,整個叢集就會**失明**——你的 pod 還在跑,但誰也沒法排程新的、更新舊的、或在故障時自癒。所以自建 K8s 時,etcd 是你要最偏執對待的東西:奇數台(3/5)撐 quorum、定期備份、給它低延遲的磁碟(它對磁碟延遲極度敏感)。這也是為什麼很多人乾脆用託管 K8s——把 etcd 這個燙手山芋交給雲商。

## 資源模型:requests、limits、QoS(最多人踩的坑)

K8s 的 infra 面,最實用也最多人踩坑的,是**資源模型**。每個 pod 你可以宣告兩個數字——`requests` 和 `limits`,它們的意義天差地遠:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 220" role="img" aria-label="Kubernetes 的資源模型 requests limits 與 QoS。左邊一根資源條,下段是 requests 排程保證會保留給你,scheduler 靠它決定 pod 放哪;中段 requests 到 limits 之間是可爆用;上段超過 limits。超過 limits 的行為:CPU 會被 throttle 變慢,memory 會被 OOMKill 直接殺掉。右邊 QoS 三級決定記憶體不夠時誰先死:BestEffort 都沒設先死、Burstable requests 小於 limits 中間、Guaranteed requests 等於 limits 最後死。下方說明:不設 requests 排程器只能猜、node 超賣、半夜莫名 OOM。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">資源模型:requests(保證)vs limits(上限)</text>
    <rect x="40" y="42" width="70" height="24" rx="3" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="75" y="58" fill="#e0733a" font-size="7.6" text-anchor="middle">超過 limit</text>
    <rect x="40" y="66" width="70" height="76" rx="0" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="75" y="108" fill="#9aa4b2" font-size="7.6" text-anchor="middle">可爆用</text>
    <rect x="40" y="142" width="70" height="42" rx="3" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="75" y="160" fill="#54b890" font-size="7.6" text-anchor="middle">保證</text><text x="75" y="172" fill="#9aa4b2" font-size="7" text-anchor="middle">(保留)</text>
    <line x1="36" y1="142" x2="130" y2="142" stroke="#54b890" stroke-width="1.4"/><text x="118" y="140" fill="#54b890" font-size="7.6" text-anchor="start">← requests</text>
    <line x1="36" y1="66" x2="130" y2="66" stroke="#e0733a" stroke-width="1.4"/><text x="118" y="64" fill="#e0733a" font-size="7.6" text-anchor="start">← limits</text>
    <text x="122" y="98" fill="#9aa4b2" font-size="7.4" text-anchor="start">requests=排程保證</text><text x="122" y="112" fill="#9aa4b2" font-size="7.4" text-anchor="start">(scheduler 靠它放 pod)</text>
    <text x="250" y="52" fill="#e6e6e6" font-size="8.4" text-anchor="start" font-weight="bold">超過 limit 會怎樣?</text>
    <text x="250" y="70" fill="#9aa4b2" font-size="8" text-anchor="start">· CPU → throttle(變慢,不殺)</text>
    <text x="250" y="86" fill="#e0733a" font-size="8" text-anchor="start" font-weight="bold">· memory → OOMKill(直接殺)</text>
    <text x="250" y="112" fill="#e6e6e6" font-size="8.4" text-anchor="start" font-weight="bold">QoS:記憶體不夠,誰先死?</text>
    <rect x="250" y="120" width="300" height="22" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.1"/><text x="262" y="135" fill="#e6e6e6" font-size="7.8" text-anchor="start">BestEffort(都沒設)</text><text x="540" y="135" fill="#e0733a" font-size="7.8" text-anchor="end" font-weight="bold">先死</text>
    <rect x="250" y="144" width="300" height="22" rx="4" fill="#3a3320" stroke="#d6a45c" stroke-width="1.1"/><text x="262" y="159" fill="#e6e6e6" font-size="7.8" text-anchor="start">Burstable(req &lt; limit)</text><text x="540" y="159" fill="#d6a45c" font-size="7.8" text-anchor="end">中間</text>
    <rect x="250" y="168" width="300" height="22" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="262" y="183" fill="#e6e6e6" font-size="7.8" text-anchor="start">Guaranteed(req = limit)</text><text x="540" y="183" fill="#54b890" font-size="7.8" text-anchor="end" font-weight="bold">最後死</text>
    <text x="290" y="210" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">不設 requests → 排程器只能猜 → node 超賣、半夜莫名 OOM</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#54b890">requests</b> 是「排程保證」:scheduler 靠它決定把 pod 放到哪台 node、幫你保留這麼多資源。<b style="color:#e0733a">limits</b> 是上限:CPU 超過只是被<b>限速(throttle)</b>、變慢;但 memory 超過會被<b>直接 OOMKill</b>。而 <b>QoS</b> 三級決定了記憶體壓力下的生死順序——沒設任何值的 <b>BestEffort</b> 第一個被殺,<b>req=limit</b> 的 <b>Guaranteed</b> 活到最後。這組設定看似瑣碎,卻是「pod 半夜莫名被殺」這類事故最常見的根源</figcaption>
</figure>

這裡最容易犯的錯,是**不設 `requests`**:scheduler 沒有依據,只能亂猜,結果把一堆 pod 塞到同一台 node、超賣到爆,尖峰一來大家一起 OOM。反過來,**memory `limit` 設太低**也是災難——pod 平常好好的,某次記憶體用量一衝高就被 OOMKill,而且它「平常沒事、偶爾暴斃」的特性超難查。我的原則是:**至少一定要設 `requests`(讓排程器有依據),memory 的 `request` 和 `limit` 盡量設一樣(避免 OOM 驚喜)。**

## 擴展的三層:HPA / VPA / Cluster Autoscaler

K8s 的自動擴展分三層,各管一件事,搞清楚就不會亂用:
- **HPA(Horizontal Pod Autoscaler)**:依指標(CPU、記憶體、自訂)自動增減**pod 的「數量」**——水平擴。這是[[infra-intro|無狀態工人]]最爽的用法:流量大就多開幾個 pod。
- **VPA(Vertical Pod Autoscaler)**:自動調整單一 pod 的 **`requests`/`limits`**——垂直擴。適合不好水平擴、但吃資源會變的東西。
- **Cluster Autoscaler**:當 pod 因為資源不夠而**排不進去(Pending)**,就自動**加一台 node**;閒置太多就縮。
三層合起來,叢集才能真的「自己長大、自己縮小」。注意 HPA 加的是 pod、Cluster Autoscaler 加的是 node——兩者常要搭配:HPA 想多開 pod、但 node 不夠,就靠 Cluster Autoscaler 補上機器。

## 儲存:stateless 跑 Deployment、stateful 跑 StatefulSet + PV

最後回到[[infra-intro|那條主軸]]。在 K8s 上,一個東西是有狀態還是無狀態,決定了你用什麼跑它:
- **無狀態** → **Deployment**:pod 是可拋的複製品,誰死了隨便換一個、名字 IP 都無所謂。Spark executor、Airflow worker 都這樣跑。
- **有狀態** → **StatefulSet + PV**:StatefulSet 給每個 pod **穩定的身分**(`kafka-0`、`kafka-1`,重啟還是同一個名字)+ 各自**綁定的持久儲存**(透過 PVC / StorageClass / CSI 動態供應一塊 PV),重啟後還認得自己那顆磁碟。這就是為什麼後面 Kafka、Redis 在 K8s 上都得跑 StatefulSet——它們的資料綁在特定的身分與磁碟上,不能像 stateless 那樣隨便換。

## 反思

### 底座的可靠度,是所有東西的地基;而底座的命門,又是狀態

把 K8s 當 infra 看,最大的體悟是:**它是所有東西的地基,而地基的命門偏偏又是「狀態」——那顆叫 etcd 的核心。** 這幾乎是[[infra-intro|上一篇]]結論的一次完美印證:連一個以「調度無狀態容器」聞名的平台,自己最脆弱、最要小心的地方,還是那一小塊有狀態的核心。這讓我對「狀態是複雜度的根源」這句話更堅信了。也因此,我評估任何平台的可靠度時,都會直接問:**它的狀態存在哪、那個東西掛了會怎樣、怎麼備份與還原?** 把命門找出來、重點保護,比平均用力顧每個組件有效得多。

### requests/limits 是最樸實、也最容易被忽略的一課

K8s 有一堆炫的功能,但真正在半夜咬你的,往往是 `requests`/`limits` 這種最樸實的東西。它的本質是:**你要主動告訴排程器「我需要多少」,它才能幫你做對決策;你不說,它就只能猜,而猜錯的代價是超賣、是 OOM、是連鎖崩潰。** 這件事教我一個更普遍的道理——**在共享資源的系統裡,「講清楚你要多少」是一種責任,不是可選項**。不宣告需求的 pod,不只害了自己,還會拖累同一台 node 上所有鄰居。這跟團隊協作其實很像:不講清楚自己的需求與界線,系統(或團隊)就只能靠猜,而猜通常猜不準。

### K8s 把「宣告期望、持續逼近」做成了基礎設施,但它不是魔法

我很欣賞 K8s 的核心哲學——你宣告「我想要三個副本、這樣的資源」,它就持續地把現實逼近你的期望([[k8s-intro|reconcile loop]])。這種「宣告式 + 自癒」的思路,把很多過去要人肉盯著的維運變成了自動。但用久了我也提醒自己:**它把複雜藏起來,不代表複雜消失了。** 你還是得懂資源模型(不然 OOM)、懂狀態(不然 etcd 或 PV 出事)、懂它的故障模式(不然出事時一臉茫然)。K8s 讓你「宣告期望」很輕鬆,但「宣告對的期望」——設對 requests、認出誰有狀態、備份好 etcd——那份功課,還是得你自己做。好的抽象讓簡單的事更簡單,但不會讓你免於理解它底下發生了什麼。
