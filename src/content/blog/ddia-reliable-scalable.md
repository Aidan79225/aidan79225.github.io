---
title: "可靠、可擴展、可維護:資料系統的三個目標"
date: 2026-07-11
category: tech
description: "DDIA 開篇問一個根本問題:一個好的資料系統,到底該追求什麼?答案是三個非功能需求——可靠(出錯也能運作)、可擴展(負載增加也扛得住)、可維護(讓人好好在上面工作)。功能決定系統能不能用,這三個決定它長期活不活得下去。這是整個系列、也是可靠度工程的原理源頭。"
tags:
  - distributed-systems
  - book-notes
series: "Designing Data-Intensive Applications 讀書筆記"
seriesOrder: 1
comments: true
draft: false
---
開一個新系列:讀 Martin Kleppmann 的 *Designing Data-Intensive Applications*(簡稱 DDIA)。它跟 [[fode-1|FoDE]] 互補——FoDE 是資料工程的實務地圖,DDIA 是「分散式資料系統為什麼長這樣」的原理。而全書的骨架,就是第一章問的一個根本問題:**一個好的資料系統,到底該追求什麼?** 答案是三個目標:可靠、可擴展、可維護。這篇也剛好是我正在寫的 [[sre-intro|SRE]] 那條可靠度線的原理源頭。

## 現代系統拚的是「資料」,不是「算力」

先講書名裡的 data-intensive。現在多數應用的瓶頸,**不是 CPU 算不夠快,而是資料**——資料的量、資料的複雜度、資料變化的速度。你的系統要存資料、要能查、要記住結果、要在服務之間搬資料。所以難的不再是「算法多快」,而是「這麼多資料,怎麼存得可靠、查得夠快、改得動」。這正是那三個目標要回答的。

## 三個決定成敗的目標

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="資料系統的三個目標:Reliability 可靠是出錯也能運作,重點是容錯不是無錯、fault 不等於 failure、主動製造故障測試;Scalability 可擴展是負載增加也扛得住,重點是先描述負載、用 percentile 看效能、scale up 或 out;Maintainability 可維護是讓人好好在上面工作,重點是好維運、少意外複雜度、易演進" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="16" y="34" width="176" height="150" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/>
    <text x="104" y="56" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">Reliability 可靠</text>
    <text x="104" y="72" fill="#9aa4b2" font-size="8.5" text-anchor="middle">出錯也能正常運作</text>
    <text x="30" y="98" fill="#e6e6e6" font-size="8.7" text-anchor="start">· 容錯,不是無錯</text>
    <text x="30" y="118" fill="#e6e6e6" font-size="8.7" text-anchor="start">· fault ≠ failure</text>
    <text x="30" y="138" fill="#e6e6e6" font-size="8.7" text-anchor="start">· 主動製造故障來測</text>
    <text x="30" y="158" fill="#9aa4b2" font-size="8" text-anchor="start">硬體 / 軟體 / 人為錯誤</text>
    <rect x="202" y="34" width="176" height="150" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="290" y="56" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">Scalability 可擴展</text>
    <text x="290" y="72" fill="#9aa4b2" font-size="8.5" text-anchor="middle">負載增加也扛得住</text>
    <text x="216" y="98" fill="#e6e6e6" font-size="8.7" text-anchor="start">· 先描述「負載長相」</text>
    <text x="216" y="118" fill="#e6e6e6" font-size="8.7" text-anchor="start">· 用 percentile 看效能</text>
    <text x="216" y="138" fill="#e6e6e6" font-size="8.7" text-anchor="start">· scale up vs scale out</text>
    <text x="216" y="158" fill="#9aa4b2" font-size="8" text-anchor="start">加機器前,先懂負載</text>
    <rect x="388" y="34" width="176" height="150" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.6"/>
    <text x="476" y="56" fill="#d6a45c" font-size="11" text-anchor="middle" font-weight="bold">Maintainability 可維護</text>
    <text x="476" y="72" fill="#9aa4b2" font-size="8.5" text-anchor="middle">讓人好好在上面工作</text>
    <text x="402" y="98" fill="#e6e6e6" font-size="8.7" text-anchor="start">· Operability 好維運</text>
    <text x="402" y="118" fill="#e6e6e6" font-size="8.7" text-anchor="start">· Simplicity 少意外複雜</text>
    <text x="402" y="138" fill="#e6e6e6" font-size="8.7" text-anchor="start">· Evolvability 易演進</text>
    <text x="402" y="158" fill="#9aa4b2" font-size="8" text-anchor="start">複雜的代價是別人來付</text>
    <text x="290" y="204" fill="#9aa4b2" font-size="8.7" text-anchor="middle">三個「非功能需求」——功能決定能不能用,這三個決定長期活不活得下去</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">全書其實都在把這三個目標展開:後面講的複製、分片、一致性,都是為了在「資料很多、機器會壞」的現實裡,把可靠、可擴展、可維護同時做到</figcaption>
</figure>

**Reliability(可靠)** 的核心觀念是:目標不是「不出錯」,而是「**出錯也能運作**」——容錯(fault-tolerant),不是消除 fault。這裡有個重要區分:**fault(故障)是某個元件偏離了規格,failure(失效)是整個系統停止對使用者服務**。你無法阻止 fault 發生(硬體會壞、人會手滑、軟體有 bug),但可以設計成「fault 發生時不演變成 failure」。最反直覺、也最厲害的一招是**主動製造 fault**——像 Netflix 的 Chaos Monkey 隨機殺正式環境的機器,逼你平常就把容錯做好。這整套思維,正是 [[sre-intro|SRE]] 那條線的原理地基。

**Scalability(可擴展)** 是系統在負載成長時還撐得住的能力。它最反直覺的一點是:談擴展之前,你得先能**具體描述「負載長什麼樣」**——讀寫比、熱點在哪、fan-out 多大;不先量清楚這些,「加機器」根本無從加起。這點是整本書 Part II 的引子,所以我留到下一節單獨展開。

**Maintainability(可維護)** 常被忽略,但它決定系統的長期成本。三個設計原則:**Operability**(讓維運容易——監控好、自動化夠,呼應 [[sre-toil|消除 toil]])、**Simplicity**(管理複雜度,砍掉「意外複雜度」)、**Evolvability**(讓系統容易被改變,因為需求一定會變)。

三個目標裡,可擴展牽動的問題最多,值得單獨拉出來講。

## Scalability:先問「負載長什麼樣」

多數人一講「擴展」就想「加機器」。但 DDIA 的洞見是:**擴展的第一步不是加機器,是描述你的「負載長相」(load parameters)**——讀寫比、每秒請求數、資料的 fan-out、熱點分佈。不先搞懂負載,你根本選不出對的架構。書裡最經典的例子,是 Twitter 首頁 timeline 的兩種做法:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Twitter timeline 的兩種 fan out:讀時展開 fan-out on read,發文只寫一筆,讀者看 timeline 時即時去合併所有追蹤對象的推文,讀很貴寫很省;寫時展開 fan-out on write,發文時就把推文推進每個粉絲的收件匣,寫很貴讀很省。選哪個取決於讀寫比與 fan-out 分佈,Twitter 用混合" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="dd" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="16" x2="290" y2="172" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="28" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">Fan-out on read(讀時展開)</text>
    <rect x="30" y="46" width="60" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="60" y="62" fill="#9aa4b2" font-size="8" text-anchor="middle">推文</text>
    <rect x="30" y="84" width="60" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="60" y="100" fill="#9aa4b2" font-size="8" text-anchor="middle">推文</text>
    <rect x="30" y="122" width="60" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="60" y="138" fill="#9aa4b2" font-size="8" text-anchor="middle">推文</text>
    <rect x="182" y="72" width="76" height="48" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="220" y="92" fill="#e6e6e6" font-size="8.7" text-anchor="middle">讀者</text><text x="220" y="106" fill="#9aa4b2" font-size="7.5" text-anchor="middle">timeline</text>
    <line x1="92" y1="58" x2="180" y2="88" stroke="#9aa4b2" stroke-width="1" marker-end="url(#dd)"/>
    <line x1="92" y1="96" x2="180" y2="96" stroke="#9aa4b2" stroke-width="1" marker-end="url(#dd)"/>
    <line x1="92" y1="134" x2="180" y2="104" stroke="#9aa4b2" stroke-width="1" marker-end="url(#dd)"/>
    <text x="150" y="164" fill="#9aa4b2" font-size="8.2" text-anchor="middle">讀時才合併全部追蹤 → 讀貴、寫省</text>
    <text x="430" y="28" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">Fan-out on write(寫時展開)</text>
    <rect x="302" y="72" width="70" height="48" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="337" y="92" fill="#e6e6e6" font-size="8.7" text-anchor="middle">發文者</text><text x="337" y="106" fill="#9aa4b2" font-size="7.5" text-anchor="middle">發一則</text>
    <rect x="474" y="46" width="76" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="512" y="62" fill="#9aa4b2" font-size="7.8" text-anchor="middle">粉絲收件匣</text>
    <rect x="474" y="84" width="76" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="512" y="100" fill="#9aa4b2" font-size="7.8" text-anchor="middle">粉絲收件匣</text>
    <rect x="474" y="122" width="76" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="512" y="138" fill="#9aa4b2" font-size="7.8" text-anchor="middle">粉絲收件匣</text>
    <line x1="372" y1="88" x2="472" y2="58" stroke="#9aa4b2" stroke-width="1" marker-end="url(#dd)"/>
    <line x1="372" y1="96" x2="472" y2="96" stroke="#9aa4b2" stroke-width="1" marker-end="url(#dd)"/>
    <line x1="372" y1="104" x2="472" y2="134" stroke="#9aa4b2" stroke-width="1" marker-end="url(#dd)"/>
    <text x="430" y="164" fill="#9aa4b2" font-size="8.2" text-anchor="middle">發文時推給每個粉絲 → 寫貴、讀省</text>
    <text x="290" y="196" fill="#9aa4b2" font-size="8.6" text-anchor="middle">選哪個看「負載長相」(讀寫比、fan-out)。Twitter 用混合:一般用寫時、名人用讀時</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同一個功能(看 timeline),兩種 fan out、兩種成本結構——選哪個完全取決於負載長相。這就是為什麼「先描述負載」是擴展的第一步:不先量清楚讀寫比,根本選不出對的做法</figcaption>
</figure>

還有一個描述「效能」的關鍵,直接呼應我在 [[sre-monitoring|SRE 監控]]那篇畫過的圖:**看回應時間要看 percentile(p99),不是平均**——平均會把長尾那群體驗最差的使用者藏起來。這不是巧合,DDIA 和 SRE 講的是同一件事,只是一個從系統設計、一個從維運的角度。至於怎麼擴展,才輪到 scale up(換更強的機器)vs scale out(加更多機器)——而 scale out 帶來的所有難題(資料放哪、怎麼同步、壞了怎麼辦),正是這本書 Part II 的全部內容。

## 反思

### 「三個 -ility」是我看任何系統的預設清單

可靠、可擴展、可維護——這三個非功能需求,比「功能做不做得出來」更決定一個系統長期的死活。功能有 bug 可以修,但一個不可靠、擴不動、沒人敢改的系統,是會慢慢把團隊拖垮的。我現在 review 架構,會刻意把這三個當成檢查清單問一遍:它遇到故障會怎樣?負載長十倍會怎樣?三個月後別人接手改得動嗎?**很多當下看起來很聰明的設計,套進這三題就露餡了**——這是我從這章帶走最實用的一副眼鏡。

### 擴展的第一步不是「加機器」,是「描述負載」

工程師談擴展,反射動作是加機器、分片、上 K8s。但 DDIA 提醒的是更前面一步:**你得先能量化描述「你的負載長什麼樣」**——讀寫比多少?熱點在哪?fan-out 多大?Twitter 那個例子最傳神:不先搞清楚「讀遠多於寫、但名人 fan-out 爆炸」,你連「讀時還是寫時展開」都選不出來,加再多機器都白搭。這跟我一直講的 [[pain-before-power|先確認痛點再上重武器]]根本是同一句話——**先把問題量清楚,解法才有意義。**

### 意外複雜度,是可維護性的頭號敵人

DDIA 把複雜度分成兩種:**本質複雜度**(問題本身就難)和**意外複雜度**(我們自己搞出來的)。前者躲不掉,後者是能砍的——而它多半來自過度設計、為了炫技加的抽象、還沒發生就先準備的「彈性」。這跟 SRE 的 Simplicity、跟 [[sre-toil|消除 toil]] 是同一個信念:**能簡單就別複雜,因為複雜的代價,是未來每一個維護它的人來付。** 我越來越相信,資深的標誌不是「能把系統做得多複雜」,而是「能把該做的事做得多簡單」——留一個三個月後的自己、或接手的同事,看得懂、改得動的系統。
