---
title: "連鎖失效與過載:別讓一台倒下拖垮全部"
date: 2026-07-13
category: tech
description: "最可怕的故障不是一台機器壞掉,是一台壞掉引發骨牌、把整個系統拖垮的連鎖失效。它最常見的加速器是 retry storm——失敗引發重試、重試加重負載、負載製造更多失敗的正回饋。這篇講連鎖失效怎麼發生,以及過載時該做的三件事:主動卸載、優雅降級、backpressure,而不是硬吞到一起爛。"
tags:
 - sre
 - reliability
series: "Google SRE 讀書筆記"
seriesOrder: 10
comments: true
draft: false
---
[[sre-intro|第一篇]]說可靠度的目標是「出錯也能運作」。但有一種故障特別難纏,因為它會**自我放大**:一個小問題引發骨牌,幾分鐘內把整個系統拖垮——這就是**連鎖失效(cascading failure)**。它最可怕的地方,是系統在過載時不是線性變慢,而是**斷崖式崩潰**。

## 連鎖失效:小故障如何滾成大災難

最經典的劇本:一台機器過載倒下,它的流量被轉移到其他台,於是其他台也過載、跟著倒,一台壓垮一台,像骨牌:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 226" role="img" aria-label="連鎖失效骨牌:Server A 先過載倒下,流量轉移到 Server B 讓它也過載倒下,再全壓到 Server C 也倒,骨牌式全滅。下方 retry storm 正回饋循環:請求失敗或變慢、客戶端重試、總負載更高、造成更多失敗,火上加油。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
 <defs><marker id="cf" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="cfr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e0733a"/></marker></defs>
 <text x="290" y="22" fill="#9aa4b2" font-size="9.5" text-anchor="middle">一台倒下 → 流量轉移壓垮下一台 → 骨牌式全滅</text>
 <rect x="30" y="38" width="150" height="50" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.5"/><text x="105" y="58" fill="#e6e6e6" font-size="9.5" text-anchor="middle" font-weight="bold">Server A</text><text x="105" y="74" fill="#e0733a" font-size="8" text-anchor="middle">先過載 → 倒 ✗</text>
 <rect x="215" y="38" width="150" height="50" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.5"/><text x="290" y="58" fill="#e6e6e6" font-size="9.5" text-anchor="middle" font-weight="bold">Server B</text><text x="290" y="74" fill="#e0733a" font-size="8" text-anchor="middle">接手 A 流量 → 也倒 ✗</text>
 <rect x="400" y="38" width="150" height="50" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.5"/><text x="475" y="58" fill="#e6e6e6" font-size="9.5" text-anchor="middle" font-weight="bold">Server C</text><text x="475" y="74" fill="#e0733a" font-size="8" text-anchor="middle">全壓過來 → 倒 ✗</text>
 <line x1="180" y1="63" x2="213" y2="63" stroke="#e0733a" stroke-width="1.3" marker-end="url(#cfr)"/>
 <line x1="365" y1="63" x2="398" y2="63" stroke="#e0733a" stroke-width="1.3" marker-end="url(#cfr)"/>
 <text x="290" y="120" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">而 retry storm(重試風暴)火上加油:</text>
 <rect x="44" y="132" width="132" height="30" rx="5" fill="#262b3a" stroke="#e0733a" stroke-width="1.2"/><text x="110" y="151" fill="#e6e6e6" font-size="8.3" text-anchor="middle">請求失敗 / 變慢</text>
 <rect x="224" y="132" width="132" height="30" rx="5" fill="#262b3a" stroke="#e0733a" stroke-width="1.2"/><text x="290" y="151" fill="#e6e6e6" font-size="8.3" text-anchor="middle">客戶端重試</text>
 <rect x="404" y="132" width="132" height="30" rx="5" fill="#262b3a" stroke="#e0733a" stroke-width="1.2"/><text x="470" y="151" fill="#e6e6e6" font-size="8.3" text-anchor="middle">總負載更高</text>
 <line x1="176" y1="147" x2="222" y2="147" stroke="#e0733a" stroke-width="1.2" marker-end="url(#cfr)"/>
 <line x1="356" y1="147" x2="402" y2="147" stroke="#e0733a" stroke-width="1.2" marker-end="url(#cfr)"/>
 <path d="M470,162 C470,196 110,196 110,164" fill="none" stroke="#e0733a" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#cfr)"/>
 <text x="290" y="192" fill="#9aa4b2" font-size="8" text-anchor="middle">正回饋:越失敗 → 越重試 → 越失敗(自我放大)</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">連鎖失效的兩個引擎:<b>流量轉移</b>讓故障像骨牌一台壓垮一台;<b>retry storm</b> 則是正回饋——失敗引發重試、重試加重負載、負載製造更多失敗,把小問題在幾分鐘內滾成全站崩潰</figcaption>
</figure>

除了 retry storm,還有**驚群(thundering herd)**:快取一失效或服務一重啟,大量請求同時湧向後端,瞬間把它打垮。它們的共通點,都是**很多請求在同一時間、同一方向擠過去**。

## 過載時要「主動保護」,不要「硬吞」

面對過載,工程師的直覺常是「盡量都服務到」——但這正是災難的開始:硬吞的結果是排隊爆炸、資源耗盡,然後**大家一起爛**。正確的做法是**主動保護**:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 226" role="img" aria-label="過載的兩種應對。左邊硬吞被動:過載來襲、全部照收排隊、資源耗盡斷崖式全爛。右邊主動保護:Load shedding 卸載丟掉一部分回 503 保住其餘;Graceful degradation 降級回舊快取或關次要功能;Backpressure 對上游說我滿了讓上游減速。另可加 circuit breaker 斷路器,下游一直失敗就先別打快速失敗。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
 <line x1="280" y1="16" x2="280" y2="184" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
 <text x="140" y="28" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">❌ 硬吞(被動)</text>
 <rect x="44" y="42" width="188" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="138" y="58" fill="#e6e6e6" font-size="8.5" text-anchor="middle">過載來襲</text>
 <rect x="44" y="76" width="188" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="138" y="92" fill="#e6e6e6" font-size="8.5" text-anchor="middle">全部照收、無限排隊</text>
 <rect x="44" y="110" width="188" height="24" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="138" y="126" fill="#e6e6e6" font-size="8.5" text-anchor="middle">資源耗盡 → 斷崖式全爛</text>
 <line x1="138" y1="66" x2="138" y2="74" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cf)"/>
 <line x1="138" y1="100" x2="138" y2="108" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cf)"/>
 <text x="138" y="158" fill="#9aa4b2" font-size="8.2" text-anchor="middle">想全服務,結果全滅</text>
 <text x="430" y="28" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">✓ 主動保護</text>
 <rect x="300" y="40" width="260" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="314" y="52" fill="#54b890" font-size="8.5" text-anchor="start" font-weight="bold">① Load shedding 卸載</text><text x="314" y="64" fill="#9aa4b2" font-size="7.8" text-anchor="start">丟掉一部分(回 503),保住其餘</text>
 <rect x="300" y="76" width="260" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="314" y="88" fill="#54b890" font-size="8.5" text-anchor="start" font-weight="bold">② Graceful degradation 降級</text><text x="314" y="100" fill="#9aa4b2" font-size="7.8" text-anchor="start">回舊快取 / 關次要功能 → 堪用就好</text>
 <rect x="300" y="112" width="260" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="314" y="124" fill="#54b890" font-size="8.5" text-anchor="start" font-weight="bold">③ Backpressure</text><text x="314" y="136" fill="#9aa4b2" font-size="7.8" text-anchor="start">對上游說「我滿了」→ 讓上游減速</text>
 <text x="430" y="158" fill="#9aa4b2" font-size="8.2" text-anchor="middle">部分成功 &gt; 全部失敗</text>
 <text x="290" y="204" fill="#9aa4b2" font-size="8.3" text-anchor="middle">另可加 Circuit Breaker(斷路器):下游一直失敗就先別打、快速失敗,保護雙方</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">過載時的心法是<b>「部分成功 &gt; 全部失敗」</b>:主動丟掉一部分(load shedding)、退回堪用的降級版(degradation)、或把「我滿了」往上游傳(backpressure)。硬要全服務,換來的是大家一起崩</figcaption>
</figure>

## 讓連鎖失效不發生的幾招

把上面收斂成一份實用清單:

- **重試要有節制**:限次數、**指數退避(exponential backoff)+ 抖動(jitter)**(別讓大家同時重試)、**retry budget**(整體重試量設上限)。沒節制的重試,是連鎖失效最大的幫兇。
- **Circuit breaker(斷路器)**:偵測到某個下游一直失敗,就**先不打了**(快速失敗),給它喘息、也不讓自己被拖住,過一陣再試探性放行。
- **限流 / 限並發(rate limiting)**:在入口就擋掉超過容量的量,別讓它進來排隊。
- **容量規劃 + load shedding**:平時留餘裕,過載時主動卸載——**在崩潰前就丟,而不是崩了才丟。**

## 反思

### 連鎖失效的可怕,在於「正回饋」

一般的故障是線性、局部的:一台壞了就少一台。但連鎖失效可怕在它有**正回饋**——失敗引發重試、重試加重負載、負載又製造更多失敗,自我放大成一個把整個系統吸進去的漩渦。所以我看系統時,會特別警惕任何「**失敗會讓情況更糟**」的迴圈:沒有 backoff 的重試、沒有防護的快取失效、沒有斷路器的下游呼叫——這些都是埋著的正回饋炸彈,平時看不出來,一旦點燃就是幾分鐘全站崩。**找出並剪斷這些放大迴圈,比事後救火重要得多。**

### 過載時,「部分成功」遠勝「全部失敗」

Load shedding 這招第一次聽很反直覺:系統已經在掙扎了,你還主動丟掉請求?但想通就懂了——**硬要全服務,結果是全滅;主動丟掉 10%,保住 90%。** 10% 的人拿到一個乾脆的 503,遠好過 100% 的人一起 timeout。這個「有損但可控 > 無損但失控」的取捨,跟 [[sre-intro|error budget]]、跟 SLO 的精神完全一致:**承認你不能全都要,然後選一個守得住的點。** 成熟的系統不是「永遠不拒絕」,是「懂得在對的時候、有尊嚴地拒絕」。

### Backpressure:把「我滿了」誠實地往上游說

我最欣賞的一招是 backpressure。最健康的系統,是會**誠實表達自己極限**的系統——滿了就往上游傳訊號,讓上游減速,而不是假裝還吞得下、然後一起崩。這其實是一種謙遜。我在 [[kafka-intro|Kafka]] 那條線看過同一件事的優雅版:消費者跟不上,就讓它**按自己的節奏去拉**,而不是被上游推爆——pull 模型天生就帶 backpressure。把「我做不到、請慢一點」誠實地往上游講,是分散式系統、其實也是團隊協作裡,最被低估的一種美德:**逞強硬吞,往往才是拖垮全體的那個人。**
