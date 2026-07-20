---
title: "NetworkPolicy 與 CNI:Pod 之間的防火牆"
date: 2026-07-17
category: tech
tags:
  - kubernetes
  - networking
series: "Kubernetes 學習筆記"
seriesOrder: 10
comments: true
draft: false
---
[[k8s-service|Service]] 與 [[k8s-ingress-dns|Ingress]] 講的是「流量怎麼**找到**服務」,但底下有個更基本、也更容易被忽略的問題:**Pod 跟 Pod 之間,預設能不能互通?** 答案會嚇到很多人——**預設全通,任何一顆 Pod 都連得到叢集裡任何一顆 Pod。** 這篇談兩件事:讓 Pod 有網路的那層(**CNI**),以及把「全通」收成「白名單」的防火牆(**NetworkPolicy**)。

## K8s 的網路模型:預設是一張全連通的扁平網路

K8s 對網路只有一條硬性要求:**每顆 Pod 有自己的 IP,而且任兩顆 Pod 之間可以直接用 IP 互通,跨不跨 node 都一樣、中間不做 NAT。** 這帶來一個常被低估的資安事實:**預設沒有任何隔離。** 前端 Pod 連得到資料庫 Pod、A 服務連得到 B 服務的內部埠,只要知道對方 IP(或 [[k8s-ingress-dns|Service 名]])就通。方便,但也代表**一顆 Pod 被打下來,它能橫向摸到整個叢集。**

## CNI:讓 Pod 真的有網路的那層

「每顆 Pod 有 IP、彼此互通」這個承諾,K8s 自己**不實作**——它把這件事外包給一個插件標準 **CNI(Container Network Interface)**。kubelet 每建一顆 Pod,就呼叫 CNI 插件去**配 IP、接虛擬網卡、設好路由**,Pod 才真的上得了網。所以 CNI 沒裝或壞掉時,最典型的症狀是 **Pod 卡在 `ContainerCreating`、node 顯示 `NotReady`**——不是排程問題,是根本沒人幫它接網路。

常見的插件有 **Flannel**(簡單的 overlay,只給你「全通」)、**Calico**、**Cilium**(後兩者除了連通,還能**執行 NetworkPolicy**)。這是 K8s 又一個「留白給插件」的設計,跟 [[k8s-ingress-dns|Ingress 要 Controller]] 同一個味道:**核心定義規格,能力靠插件補。**

## NetworkPolicy:把「全通」改成「白名單」

要關掉預設全通,就靠 **NetworkPolicy**。它的機制有一個關鍵轉折,一定要記牢:**只要一顆 Pod 被任何一條 NetworkPolicy 選中,它在那個方向(進 / 出)就從「預設全通」翻轉成「預設拒絕」,之後只有規則明列的流量能過。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 290" role="img" aria-label="左邊是預設狀態:web、api、db 三顆 Pod 任兩顆都能互通。右邊套了一條只保護 db 的 NetworkPolicy 後:db 翻成預設拒絕,只放行來自 api 的流量,web 連 db 被擋;沒被 policy 選到的 web、api 之間仍然全通" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="ok" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#54b890"/></marker><marker id="no" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#e05a7d"/></marker></defs>
    <rect x="8" y="30" width="288" height="252" rx="10" fill="none" stroke="#3a4154" stroke-width="1.4"/>
    <text x="152" y="22" fill="#9aa4b2" font-size="10" text-anchor="middle">預設:任兩顆 Pod 都通</text>
    <rect x="104" y="50" width="96" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="152" y="73" fill="#e6e6e6" font-size="10.5" text-anchor="middle">web</text>
    <rect x="40" y="150" width="96" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="88" y="173" fill="#e6e6e6" font-size="10.5" text-anchor="middle">api</text>
    <rect x="168" y="150" width="96" height="36" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="216" y="173" fill="#e6e6e6" font-size="10.5" text-anchor="middle">db</text>
    <line x1="128" y1="86" x2="96" y2="148" stroke="#54b890" stroke-width="1.5" marker-end="url(#ok)"/>
    <line x1="176" y1="86" x2="208" y2="148" stroke="#54b890" stroke-width="1.5" marker-end="url(#ok)"/>
    <line x1="136" y1="168" x2="166" y2="168" stroke="#54b890" stroke-width="1.5" marker-end="url(#ok)"/>
    <text x="152" y="215" fill="#9aa4b2" font-size="8.5" text-anchor="middle">全通 = 沒有隔離</text>
    <text x="152" y="230" fill="#9aa4b2" font-size="8.5" text-anchor="middle">web 也連得到 db</text>
    <rect x="324" y="30" width="288" height="252" rx="10" fill="none" stroke="#3a4154" stroke-width="1.4"/>
    <text x="468" y="22" fill="#9aa4b2" font-size="10" text-anchor="middle">套一條只保護 db 的 policy</text>
    <rect x="420" y="50" width="96" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="468" y="73" fill="#e6e6e6" font-size="10.5" text-anchor="middle">web</text>
    <rect x="356" y="150" width="96" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="404" y="173" fill="#e6e6e6" font-size="10.5" text-anchor="middle">api</text>
    <rect x="484" y="150" width="96" height="36" rx="7" fill="#1f2330" stroke="#54b890" stroke-width="2.1"/><text x="532" y="169" fill="#e6e6e6" font-size="10.5" text-anchor="middle">db</text><text x="532" y="181" fill="#54b890" font-size="7" text-anchor="middle">預設拒絕</text>
    <line x1="452" y1="168" x2="482" y2="168" stroke="#54b890" stroke-width="1.6" marker-end="url(#ok)"/><text x="467" y="160" fill="#54b890" font-size="7.5" text-anchor="middle">✓</text>
    <line x1="492" y1="86" x2="524" y2="148" stroke="#e05a7d" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#no)"/><text x="524" y="112" fill="#e05a7d" font-size="7.5" text-anchor="middle">✗ web 被擋</text>
    <line x1="444" y1="86" x2="412" y2="148" stroke="#54b890" stroke-width="1.3" marker-end="url(#ok)"/>
    <text x="468" y="225" fill="#9aa4b2" font-size="8.5" text-anchor="middle">db 只放行 api;web↔api 沒被選中,照舊全通</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左邊是預設的「全通」。右邊只對 <b>db</b> 套一條 policy,<b>db 就從全通翻成預設拒絕</b>、只放行 api;web 連 db 被擋。注意 <b>web↔api 沒被任何 policy 選中,依然全通</b>——NetworkPolicy 是「逐顆 Pod 加白名單」,不是全叢集開關</figcaption>
</figure>

幾個容易踩的性質:**它是 namespaced 的**(只管同一個 namespace);**只有白名單、沒有黑名單**(你只能列「允許誰」,不能寫「擋掉誰」);**多條 policy 相加取聯集**(規則越加越寬,不會互相否決)。想做「這個 namespace 全部預設拒絕」,就套一條 `podSelector: {}`(選中全部 Pod)、且不給任何 ingress 規則的 policy——所有人都被選中、又沒有放行項,等於全關,再逐條開白名單。

## 一條 policy 裡有「兩個 selector」,別搞混

NetworkPolicy 最容易繞暈的,是裡面**有兩個各司其職的 selector**——一個選「保護誰」,一個選「放行誰」:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 250" role="img" aria-label="一條 NetworkPolicy 的結構:最外層的 podSelector 決定這條規則套用在哪些 Pod（保護 app=db）;裡面 ingress.from 的 podSelector 決定允許哪些 Pod 連進來（放行 app=api）;ports 再收斂到特定埠 5432。兩個 selector 職責不同" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="np" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="176" y="24" width="248" height="202" rx="10" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.9"/>
    <text x="300" y="46" fill="#9b6ff0" font-size="11" font-weight="bold" text-anchor="middle">NetworkPolicy(namespaced)</text>
    <rect x="192" y="58" width="216" height="52" rx="7" fill="#1f2330" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="300" y="77" fill="#4f6df5" font-size="9.5" font-weight="bold" text-anchor="middle">① podSelector: app=db</text>
    <text x="300" y="92" fill="#9aa4b2" font-size="8" text-anchor="middle">這條規則「保護」哪些 Pod</text>
    <text x="300" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">被選中的就翻成預設拒絕</text>
    <rect x="192" y="120" width="216" height="56" rx="7" fill="#1f2330" stroke="#54b890" stroke-width="1.5"/>
    <text x="300" y="139" fill="#54b890" font-size="9.5" font-weight="bold" text-anchor="middle">② ingress.from: app=api</text>
    <text x="300" y="154" fill="#9aa4b2" font-size="8" text-anchor="middle">「放行」哪些 Pod 連進來</text>
    <text x="300" y="166" fill="#9aa4b2" font-size="8" text-anchor="middle">來源可是 pod / namespace / ipBlock</text>
    <rect x="192" y="186" width="216" height="30" rx="7" fill="#1f2330" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="300" y="205" fill="#d6a45c" font-size="9" text-anchor="middle">ports: 5432 — 再收斂到特定埠</text>
    <rect x="24" y="96" width="120" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="84" y="116" fill="#e6e6e6" font-size="10" text-anchor="middle">db Pod</text>
    <text x="84" y="131" fill="#9aa4b2" font-size="7.5" text-anchor="middle">被保護的 Pod</text>
    <line x1="190" y1="84" x2="146" y2="112" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#np)"/>
    <rect x="456" y="120" width="120" height="46" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.7"/>
    <text x="516" y="140" fill="#e6e6e6" font-size="10" text-anchor="middle">api Pod</text>
    <text x="516" y="155" fill="#9aa4b2" font-size="7.5" text-anchor="middle">被放行的來源</text>
    <line x1="410" y1="146" x2="454" y2="146" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#np)"/>
    <text x="300" y="240" fill="#9aa4b2" font-size="8.5" text-anchor="middle">同理有 egress.to 管「出去能連誰」;沒寫 egress 就不限制出向</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一條 policy 裡的兩個 selector 職責完全不同:<b>①最外層 podSelector</b> 決定「保護誰」(誰翻成預設拒絕);<b>②ingress.from 的 selector</b> 決定「放行誰」。搞混這兩個,規則就會寫成保護錯 Pod、或放行錯來源</figcaption>
</figure>

## 落成 YAML:先全關,再開一條白名單

實務上安全的做法是兩層:先給整個 namespace 一條 **default-deny**(把大門關上),再逐條開白名單。default-deny 就是「選中全部 Pod、卻不給任何 ingress 規則」:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny-ingress }
spec:
  podSelector: {}                 # 空的 = 選中這個 namespace 的所有 Pod
  policyTypes: [ Ingress ]        # 只給 Ingress 型、又不列任何 from → 進向全關
```

然後單獨放行「api 可以連 db 的 5432」——注意裡面**兩個 selector 職責不同**:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: db-allow-api }
spec:
  podSelector:
    matchLabels: { app: db }      # ① 這條規則「保護」誰:db
  policyTypes: [ Ingress ]
  ingress:
    - from:
        - podSelector:
            matchLabels: { app: api }   # ② 「放行」誰進來:api
      ports:
        - { protocol: TCP, port: 5432 } # 再收斂到特定埠
```

疊起來的效果就是前面第一張圖的右半邊:db 因為被 policy 選中而翻成預設拒絕,只有帶 `app=api` 標籤的 Pod 打得進 5432,其餘一律擋。想放行**別的 namespace**,把 `from` 換成 `namespaceSelector`;想放行叢集外某個 IP 段,用 `ipBlock`。規則永遠只加不減、取聯集——要更嚴,就再疊一條更窄的,而不是去寫「拒絕」。

## 一個大坑:NetworkPolicy 要 CNI 撐腰才有效

這是最陰的一點,也把本篇兩個主角接了起來:**NetworkPolicy 物件本身只是規則,真正「擋封包」的是 CNI 插件。** 如果你的叢集用的是**不支援 policy 的 CNI(例如純 Flannel)**,那你 `kubectl apply` 一堆 NetworkPolicy——**它們會安安靜靜地被無視,一個封包都不會被擋。** 沒有錯誤、沒有警告,你以為資料庫鎖起來了,其實門大開。這跟 [[k8s-ingress-dns|Ingress 沒裝 Controller 就沒作用]]是一模一樣的坑:**物件是期望,得有一個真的在跑、且支援它的東西去執行。** 上 policy 前,先確認你的 CNI(Calico / Cilium 這類)真的會 enforce。

## 反思

### 「預設全通」這件事,我希望更早知道

我早年有個危險的錯覺:以為東西丟進叢集、每個服務各跑各的 namespace,彼此就自然隔離了。**大錯。** K8s 預設是一張**全連通的扁平網路**,前端 Pod 直接連得到資料庫 Pod 的內部埠——沒有任何一道牆。真正讓我警醒的,是想像「一顆對外的 Pod 被打下來會怎樣」:在全通的預設下,攻擊者落腳那一刻,整個叢集的橫向移動門戶洞開。從此我把 **NetworkPolicy 當成上線的基本盤**,尤其是資料庫、內部 API 這種「只該被特定幾個服務連」的東西——**預設安全從來不是免費的,你得自己把牆砌上去。**

### 「白名單、逐顆生效、翻轉預設」這三點,一次記牢就不再誤設

NetworkPolicy 我踩過的雷,幾乎都源自沒把它的模型吃透:它**只能寫允許、不能寫拒絕**;它**逐顆 Pod 生效**,沒被任何 policy 選中的 Pod 仍然全通;而**一旦被選中,那個方向就翻成預設拒絕**。這三點合起來,才解釋了新手最常見的兩種鬼故事——「我明明只想擋 web,結果 db 誰都連不上了」(其實是選中即全關,忘了補白名單);「我寫了 policy 怎麼沒效果」(其實是根本沒選中那顆 Pod,或 CNI 不 enforce)。**把心智模型建對,比背 YAML 欄位有用一百倍。**

### 又是「規格與插件」——K8s 的美與痛都在這

寫完這篇,我更確定 K8s 的靈魂是一種**克制**:它幾乎所有難的能力都不自己做,而是定義一個接口、留給插件。網路(CNI)、儲存([[k8s-storage|CSI]])、L7 路由([[k8s-ingress-dns|Ingress Controller]])都是這套路。好處是彈性爆棚——你能換 Calico、換 Cilium、換任何合規的實作;代價是**「裝了 K8s」不等於「能力就在」**,你得清楚自己這套叢集到底插了哪些東西、它們支不支援你要用的功能。我現在接手任何叢集,第一批問題永遠包含:**「CNI 是誰?支不支援 NetworkPolicy?」**——因為這一題的答案,直接決定我寫的隔離規則是真的牆,還是一張貼在空氣上的紙。
