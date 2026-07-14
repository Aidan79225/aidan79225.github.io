---
title: "負載平衡:先選對機房,再選對機器"
date: 2026-07-14
category: tech
description: "流量進來要回答兩個層次的問題:去哪個資料中心?進了之後給哪台機器?這是兩層不同的負載平衡。這篇講前端與資料中心兩層各自要顧什麼,以及一個很多人踩過的坑——Round Robin 雨露均霑看似公平,其實假設每個請求一樣重、每台機器一樣強、沒有壞掉的,三個假設全錯,所以『平均分配』不等於『平均負載』。最反直覺的陷阱:一台快速失敗的機器看起來最閒,反而會吸走最多流量。"
tags:
  - sre
  - networking
series: "Google SRE 讀書筆記"
seriesOrder: 13
comments: true
draft: false
---
一個請求從使用者送出到被處理,其實要通過**兩層**負載平衡,回答兩個不同層次的問題:**去哪個資料中心?** 進了之後**分給哪台機器?** 這兩層顧的事情完全不同,把它們分開看,負載平衡就清楚多了。

## 兩層負載平衡:先選機房,再選機器

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 206" role="img" aria-label="一個請求通過兩層負載平衡。使用者先到前端負載平衡,依地理、健康、容量從多個資料中心選一個,手段是 DNS、Anycast、VIP。進了資料中心後,再由機房內負載平衡依真實負載與健康,把請求分給某個 backend task。兩層顧的問題不同:前端顧去哪個機房,機房內顧給哪台機器。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="lb" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">一個請求,要通過兩層負載平衡</text>
    <rect x="12" y="58" width="72" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="48" y="79" fill="#e6e6e6" font-size="9" text-anchor="middle">使用者</text><text x="48" y="94" fill="#9aa4b2" font-size="7.6" text-anchor="middle">世界各地</text>
    <line x1="84" y1="81" x2="106" y2="81" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#lb)"/>
    <rect x="108" y="50" width="132" height="62" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="174" y="70" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">① 前端 LB</text><text x="174" y="86" fill="#e6e6e6" font-size="8" text-anchor="middle">選哪個機房?</text><text x="174" y="101" fill="#9aa4b2" font-size="7.4" text-anchor="middle">DNS · Anycast · VIP</text>
    <text x="174" y="128" fill="#9aa4b2" font-size="7.8" text-anchor="middle">依 地理 / 健康 / 容量</text>
    <line x1="240" y1="81" x2="262" y2="81" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#lb)"/>
    <rect x="264" y="58" width="64" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="296" y="78" fill="#e6e6e6" font-size="8.6" text-anchor="middle">資料中心</text><text x="296" y="93" fill="#9aa4b2" font-size="7.6" text-anchor="middle">(選中的)</text>
    <line x1="328" y1="81" x2="350" y2="81" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#lb)"/>
    <rect x="352" y="50" width="132" height="62" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.5"/><text x="418" y="70" fill="#54b890" font-size="9.6" text-anchor="middle" font-weight="bold">② 機房內 LB</text><text x="418" y="86" fill="#e6e6e6" font-size="8" text-anchor="middle">給哪台機器?</text><text x="418" y="101" fill="#9aa4b2" font-size="7.4" text-anchor="middle">依 真實負載 / 健康</text>
    <line x1="484" y1="70" x2="512" y2="61" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lb)"/>
    <line x1="484" y1="81" x2="512" y2="81" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lb)"/>
    <line x1="484" y1="92" x2="512" y2="101" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lb)"/>
    <rect x="514" y="52" width="54" height="18" rx="4" fill="#262b3a" stroke="#54b890" stroke-width="1"/><text x="541" y="65" fill="#e6e6e6" font-size="7.4" text-anchor="middle">task 1</text>
    <rect x="514" y="72" width="54" height="18" rx="4" fill="#262b3a" stroke="#54b890" stroke-width="1"/><text x="541" y="85" fill="#e6e6e6" font-size="7.4" text-anchor="middle">task 2</text>
    <rect x="514" y="92" width="54" height="18" rx="4" fill="#262b3a" stroke="#54b890" stroke-width="1"/><text x="541" y="105" fill="#e6e6e6" font-size="7.4" text-anchor="middle">task 3</text>
    <text x="174" y="164" fill="#9aa4b2" font-size="8.2" text-anchor="middle">顧「跨機房」的事:</text><text x="174" y="178" fill="#9aa4b2" font-size="8.2" text-anchor="middle">就近、避開故障機房、分散容量</text>
    <text x="418" y="164" fill="#9aa4b2" font-size="8.2" text-anchor="middle">顧「機房內」的事:</text><text x="418" y="178" fill="#9aa4b2" font-size="8.2" text-anchor="middle">別讓某台過載、別送給壞掉的</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">前端 LB</b> 用 DNS / Anycast / VIP 把使用者導到最好的資料中心——但 DNS 有先天限制(會被快取、TTL 沒到不會更新、看不到後端健康),所以不能只靠它。<b style="color:#54b890">機房內 LB</b> 才是真正逐請求、看即時負載與健康做細緻分配的地方。這一層,正是 K8s 的 <a href="/blog/k8s-service/">Service</a> 在做的事:擋在一群 Pod 前面,只把流量送給健康的那些</figcaption>
</figure>

前端這層要處理的是「地理與災難」等級的問題:把使用者導到**離他近、還活著、且吃得下**的機房。常見手段是 DNS、Anycast、VIP——但 DNS 有個先天弱點:它會被層層快取、TTL 沒到不會更新、而且它**看不到後端現在健康不健康**。所以 DNS 只能做粗粒度的分流,真正細緻的活,留給機房內那一層。

## Round Robin 為什麼不夠好

進了機房,最直覺的分法是 **Round Robin**——請求輪流發給每台機器,雨露均霑。聽起來很公平,但它偷偷假設了三件事,而這三件事在現實裡**全是錯的**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Round Robin 與依真實負載加權的對照。左邊 Round Robin 輪流均分:每台拿到一樣多的請求數,但請求輕重不同機器強弱不同還有的壞了,導致有人過載有人閒置,負載不均。右邊依真實負載加權:看後端回報的使用率決定給誰,忙的少給弱的少給不健康不給,負載真正均衡。陷阱:一台快速失敗的機器看起來最閒,反而被塞爆。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rb" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="16" x2="290" y2="158" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="28" fill="#e0733a" font-size="9.5" text-anchor="middle" font-weight="bold">Round Robin(輪流均分)</text>
    <rect x="24" y="40" width="252" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="150" y="57" fill="#e6e6e6" font-size="8.2" text-anchor="middle">每台拿到「一樣多的請求數」</text>
    <rect x="24" y="72" width="252" height="42" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="150" y="89" fill="#9aa4b2" font-size="8" text-anchor="middle">但請求輕重不同、機器強弱不同、</text><text x="150" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">還有的根本壞了</text>
    <line x1="150" y1="116" x2="150" y2="126" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rb)"/>
    <rect x="24" y="128" width="252" height="28" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="150" y="146" fill="#e0733a" font-size="8.8" text-anchor="middle" font-weight="bold">有人過載、有人閒置 → 負載不均</text>
    <text x="430" y="28" fill="#54b890" font-size="9.5" text-anchor="middle" font-weight="bold">依真實負載加權</text>
    <rect x="304" y="40" width="252" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="430" y="57" fill="#e6e6e6" font-size="8.2" text-anchor="middle">看後端回報的使用率決定給誰</text>
    <rect x="304" y="72" width="252" height="42" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="430" y="89" fill="#9aa4b2" font-size="8" text-anchor="middle">忙的少給、弱的少給、</text><text x="430" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">不健康的不給</text>
    <line x1="430" y1="116" x2="430" y2="126" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rb)"/>
    <rect x="304" y="128" width="252" height="28" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="430" y="146" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">負載真正均衡</text>
    <text x="290" y="182" fill="#d6a45c" font-size="8.8" text-anchor="middle" font-weight="bold">⚠ 陷阱:一台「快速失敗」的機器,看起來最閒</text>
    <text x="290" y="198" fill="#9aa4b2" font-size="8.3" text-anchor="middle">→ 反而吸走最多流量、被塞爆(failure attracts traffic)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Round Robin 均分的是「請求數」,但我們真正想均分的是「負載」——而請求有輕有重、機器有強有弱,兩者根本不等價。所以要看 backend <b>回報的即時使用率</b>來加權。最陰險的坑是:一台壞掉但「秒回錯誤」的機器,在「挑最閒的」策略眼中反而最誘人,於是流量全灌過去、雪上加霜</figcaption>
</figure>

所以更好的做法,是讓 backend **主動回報自己的即時使用率**,LB 依這個去加權分配(Weighted Round Robin)——忙的少給、弱的少給、不健康的不給。而那個「快速失敗反而吸走流量」的陷阱,本質上就是[[sre-cascading-failures|連鎖失效]]的一種:壞掉的節點不但沒被隔離,還被獎勵了更多流量。

## 兩個容易忽略的實務細節

- **Subsetting(連線子集)**:如果每個 client 都跟**每一台** backend 建連線,`N × M` 條連線會爆炸。實務上讓每個 client 只連一個**子集**——省下大量連線與健康檢查的成本,又不犧牲太多平衡。
- **Lame duck(跛鴨)狀態**:要下線一台機器時,別直接砍掉——它手上可能還有處理到一半的請求。正確做法是先進入「跛鴨」狀態:**告訴 LB 別再送新請求來,但把手上的做完**,排空(drain)之後才真正關掉。健康 → 跛鴨(排水)→ 死,而不是一刀砍斷。這跟 K8s 的 readiness probe + 優雅關機是同一套思路。

## 反思

### 「平均分配」不等於「平均負載」——這是我踩過的坑

Round Robin 最迷人的地方,是它**看起來太公平了**——每台輪流拿一個,還有什麼比這更平均?但我自己就吃過虧:早年做一個服務,前面掛 Round Robin,壓測數字很漂亮,上線後卻總有一兩台 CPU 特別高、偶爾還會超時。查了半天才懂,問題不在機器,在**我均分錯了東西**:我均分的是「請求數」,但有些請求要跑一個很重的查詢、有些秒回,而機器規格其實也有新有舊。**數量相等,負載天差地遠。** 從那次之後,我對任何「均分」的機制都會多問一句:**我分的這個單位,跟我真正想平衡的東西,是同一件事嗎?** 分請求數、分連線數、分 partition 數——這些常常都不等於分「真實的工作量」。

### 壞掉的東西反而吸走流量,是最反直覺的一種故障

「挑最閒的機器」聽起來絕對正確,直到你意識到:**一台正在秒速噴錯的機器,在『挑最閒的』眼中,就是最閒的那台**——因為它回應快(雖然回的是錯誤)、佇列是空的。於是負載平衡器興高采烈地把流量全導過去,等於親手把所有使用者送進火坑。這個坑讓我學到:健康判斷不能只看「反應快不快」,要看「**有沒有真的把事做對**」。快速失敗如果沒被正確標記成不健康,比慢還危險——它會偽裝成高效能。這也是為什麼健康檢查([[sre-monitoring|監控]])要看的是**成功率**,而不只是延遲。

### 優雅退場,是一個系統成不成熟的分水嶺

Lame duck 這個概念我特別有感,因為「怎麼把一台機器安全地拿下來」這件事,看起來很小,卻最能區分一個系統成不成熟。不成熟的系統下線靠**一刀砍**——手上做到一半的請求全部變成使用者眼中的錯誤;成熟的系統會**先擋新的、把舊的做完、排空了才走**。我在 K8s 上反覆體會到同一件事:一個 Pod 要被換掉時,得先讓它從 [[k8s-service|Service]] 的名單摘除、停止接新流量,再給它一段寬限期收尾。**能不能優雅地退場,往往比能不能華麗地上線更能看出功力**——因為退場時你面對的是「正在進行中的真實流量」,騙不了人。
