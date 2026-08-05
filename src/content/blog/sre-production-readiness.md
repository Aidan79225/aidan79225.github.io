---
title: "生產就緒審查(PRR):SRE 憑什麼接手一個服務"
date: 2026-08-04
category: tech
description: "前面十五篇都在講「服務已經在線上了怎麼更可靠」,但有個更前面的問題一直沒問:一個新服務憑什麼能上線、憑什麼值得 SRE 接手扛 pager?Google SRE 的答案是一道關卡——Production Readiness Review。這篇講它審什麼、為什麼要在上線「前」審,以及它背後那個對 lead 最有用的槓桿:SRE 可以說不。"
tags:
 - sre
 - reliability
series: "Google SRE 讀書筆記"
seriesOrder: 16
comments: true
draft: false
---
前面十五篇,講的幾乎都是「服務**已經**在線上了,怎麼讓它更可靠」——SLO、監控、postmortem、降級。但有一個更前面的問題一直沒問:**一個新服務,憑什麼可以上線、憑什麼值得 SRE 接手扛 pager?** Google SRE 的答案是一道關卡——**Production Readiness Review(PRR,生產就緒審查)**。這篇講這道關:它審什麼、為什麼一定要在上線「前」審,以及它背後那個對 lead 最有用的槓桿——**SRE 可以說不。**

## PRR 是一道關,不是一份文件

先看問題根源。傳統做法是開發把服務做完,丟過牆給 ops/SRE「顧」。但這裡有個致命的不對稱:**功能可以事後慢慢加,可靠度不行。** 上線後才發現沒監控、沒 rollback、某個依賴一掛就整個倒——那時候補,是最貴的補法,而且通常是伴著一場半夜的事故補。SRE 的解法很直接:在服務上線、SRE 接手之前,先過一道 **PRR**。它不是官僚簽核用的表格,是**一張把可靠度變成「上線硬門檻」的 checklist**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="PRR 是上線前的一道關。左邊開發把服務做出來，功能 OK 不等於可上線。中間是 PRR 生產就緒審查這道關，一張 checklist：一 SLO 定義了嗎、二 監控加告警、三 壓測容量與 load shedding、四 發布能不能快速 rollback、五 依賴掛了會怎樣要能降級、六 runbook 半夜照著能做。右邊是兩個分岔：過關就由 SRE 接手、共同扛 pager；沒過就退回補齊，在補齊之前 pager 留在開發手上。重點是這個沒過就別想讓我們接的權力，才是 PRR 真正的力量。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="pr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">PRR:上線前的一道關</text>
    <rect x="14" y="82" width="120" height="88" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/>
    <text x="74" y="106" fill="#e6e6e6" font-size="8.6" text-anchor="middle" font-weight="bold">開發</text>
    <text x="74" y="122" fill="#9aa4b2" font-size="7.4" text-anchor="middle">把服務做出來</text>
    <text x="74" y="146" fill="#d6a45c" font-size="7.4" text-anchor="middle">功能 OK</text>
    <text x="74" y="158" fill="#d6a45c" font-size="7.4" text-anchor="middle">≠ 可上線</text>
    <line x1="134" y1="126" x2="166" y2="126" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pr)"/>
    <rect x="168" y="32" width="214" height="186" rx="10" fill="#26324a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="275" y="50" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">PRR 生產就緒審查</text>
    <rect x="180" y="58" width="190" height="20" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="188" y="72" fill="#e6e6e6" font-size="7.4" text-anchor="start">① SLO 定義了嗎</text>
    <rect x="180" y="82" width="190" height="20" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="188" y="96" fill="#e6e6e6" font-size="7.4" text-anchor="start">② 監控 + 告警(黃金訊號)</text>
    <rect x="180" y="106" width="190" height="20" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="188" y="120" fill="#e6e6e6" font-size="7.4" text-anchor="start">③ 壓測 / 容量 / load shedding</text>
    <rect x="180" y="130" width="190" height="20" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="188" y="144" fill="#e6e6e6" font-size="7.4" text-anchor="start">④ 發布能不能快速 rollback</text>
    <rect x="180" y="154" width="190" height="20" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="188" y="168" fill="#e6e6e6" font-size="7.4" text-anchor="start">⑤ 依賴掛了會怎樣(降級)</text>
    <rect x="180" y="178" width="190" height="20" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="188" y="192" fill="#e6e6e6" font-size="7.4" text-anchor="start">⑥ runbook:半夜照著能做</text>
    <line x1="382" y1="96" x2="418" y2="82" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pr)"/><text x="400" y="76" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">過關</text>
    <line x1="382" y1="150" x2="418" y2="172" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pr)"/><text x="400" y="166" fill="#e08b7c" font-size="7" text-anchor="middle" font-weight="bold">沒過</text>
    <rect x="420" y="56" width="148" height="52" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.4"/>
    <text x="494" y="76" fill="#54b890" font-size="8.2" text-anchor="middle" font-weight="bold">SRE 接手</text>
    <text x="494" y="92" fill="#9aa4b2" font-size="7.2" text-anchor="middle">共同扛 pager</text>
    <rect x="420" y="150" width="148" height="52" rx="8" fill="#331f22" stroke="#d66b5c" stroke-width="1.4"/>
    <text x="494" y="170" fill="#e08b7c" font-size="8.2" text-anchor="middle" font-weight="bold">退回補齊</text>
    <text x="494" y="186" fill="#9aa4b2" font-size="7.2" text-anchor="middle">pager 先留在開發手上</text>
    <text x="290" y="232" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">SRE 不接「不可運維」的服務——PRR 把可靠度變成上線的硬門檻</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">關鍵不在 checklist 本身,在右邊那個<b>分岔</b>:<b style="color:#54b890">過關</b>,SRE 接手、共同扛 pager;<b style="color:#e08b7c">沒過</b>,退回補齊——而在補齊之前,<b>pager 留在開發手上</b>。這個「沒做到就別想讓我們接」的權力,才是 PRR 真正的力量。它把「上線後再補監控」這種空頭支票,變成一張<b>上線前就得兌現的清單</b></figcaption>
</figure>

## PRR 審什麼:把前面每一篇,在上線前驗收一遍

PRR 的清單看起來嚇人,但你會發現裡面**沒有一項是新的**——它就是把這個系列學過的東西,在上線前用一張表逐條驗收:

- **SLO 定義了嗎?**([[sre-slo|SLI/SLO]])沒有目標,就無從判斷「夠不夠可靠」,後面的告警與容量也都失去基準。
- **監控與告警?**([[sre-monitoring|四個黃金訊號]]、[[sre-alerting-oncall|對症狀告警]])上線的第一刻就要能被看見、能在真的痛時把人叫醒。
- **容量與壓測?**([[sre-cascading-failures|load shedding]])知道自己的極限在哪,過載時主動卸載,而不是硬吞到一起爛。
- **發布與 rollback?**([[sre-automation-release|發布工程]])壞了能不能一鍵、快速、安全地退回——這是上線後最常用到的逃生門。
- **依賴與失效模式?**([[sre-cascading-failures|降級]])某個依賴掛了,是降級到堪用,還是整條鏈一起倒?
- **Runbook 與文件?**([[sre-incident-response|事件應變]])on-call 半夜照著就能操作,而不是只有作者腦裡知道。

一句話:**PRR 不引入任何新要求,它是把整個系列的實踐,壓進上線前的一次體檢。** 你前面每一篇學的,PRR 就是那張驗收表。

## 為什麼一定要在「上線前」:把可靠度左移

同一個缺口——沒有 rollback、沒有降級路徑——在什麼時候補,成本天差地遠:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 200" role="img" aria-label="可靠度左移的成本曲線。橫軸是服務的生命週期，從設計、開發、PRR 上線關、到上線後事故。縱軸是修一個可靠度缺口的成本，隨時間往右上快速升高。在 PRR 這一關修補，位置偏左、成本低，是白天而且便宜；等到上線後某個半夜以一場事故的形式炸出來再修，位置偏右、成本高，很貴還附贈一次 postmortem。PRR 的價值就是把成本曲線上那些昂貴的修補，左移到還便宜的時候。" style="width:100%;max-width:580px;height:auto;margin:0 auto;">
    <defs><marker id="pr2" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">可靠度左移:越早補,越便宜</text>
    <line x1="44" y1="150" x2="552" y2="150" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#pr2)"/>
    <line x1="44" y1="150" x2="44" y2="34" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#pr2)"/>
    <text x="30" y="92" fill="#9aa4b2" font-size="7.6" text-anchor="middle" transform="rotate(-90 30 92)">修復成本</text>
    <polyline points="52,142 150,135 240,123 330,100 410,76 500,54" fill="none" stroke="#4f6df5" stroke-width="2"/>
    <line x1="330" y1="150" x2="330" y2="90" stroke="#d6a45c" stroke-width="1.2" stroke-dasharray="4 3"/>
    <circle cx="330" cy="100" r="5" fill="#54b890" stroke="#1f2330" stroke-width="1"/>
    <text x="330" y="118" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">在 PRR 修</text>
    <text x="330" y="129" fill="#9aa4b2" font-size="7" text-anchor="middle">白天、便宜</text>
    <circle cx="500" cy="54" r="5" fill="#d66b5c" stroke="#1f2330" stroke-width="1"/>
    <text x="500" y="44" fill="#e08b7c" font-size="7.6" text-anchor="middle" font-weight="bold">事故後修</text>
    <text x="500" y="34" fill="#9aa4b2" font-size="7" text-anchor="middle">半夜、很貴、帶 postmortem</text>
    <text x="96" y="166" fill="#9aa4b2" font-size="7.4" text-anchor="middle">設計</text>
    <text x="210" y="166" fill="#9aa4b2" font-size="7.4" text-anchor="middle">開發</text>
    <text x="330" y="166" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">PRR 上線關</text>
    <text x="480" y="166" fill="#9aa4b2" font-size="7.4" text-anchor="middle">上線後(事故)</text>
    <text x="290" y="188" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">PRR 把「上線後才會痛」的修補,提前到上線前便宜解決</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同一個缺口,在 <b style="color:#54b890">PRR 階段</b>補是白天、便宜、沒有代價;等它在上線後某個<b style="color:#e08b7c">半夜以一場事故</b>的形式炸出來再補,是最貴的補法,還附贈一次 postmortem。PRR 的全部價值,就是<b>把成本曲線上那些昂貴的修補,左移到還便宜的時候</b>——這跟[[sre-testing|為可靠度測試]]「越早抓、越便宜、讓你敢快」是同一種思維</figcaption>
</figure>

## 反思

### SRE 最大的槓桿,是「pager 是一種貨幣」

帶團隊這幾年我最有感的一課:**可靠度要求如果沒有一道「上線前必須通過」的關,它永遠會被 deadline 擠掉。** 「上線後再補監控」「先出再說,rollback 之後再弄」——這些話我聽過太多次,而它們幾乎總是變成「上線後炸了才補」。PRR 給 SRE 的,是一個實打實的籌碼:**「要我們接手扛 pager,就先做到這幾件事。」** 這個籌碼之所以有用,是因為 pager 是**稀缺的**——你不能無條件承諾為任何東西半夜起床。一旦「SRE 支援」不是免費贈品、而是要**掙來**的,可靠度就從「有空再說的善意」變成「上線前要兌現的條件」。我現在帶新服務,第一件事不是排功能,是先問一句:**這東西上線後半夜炸了,誰扛、照什麼做?** 答不清楚的,就還沒到可以上線的那一步。

### PRR 不是橡皮圖章,是一場設計 review

最糟的 PRR,是上線前一天丟出來的一張表,大家趕著在既成事實上打勾。它最有價值的時機**恰恰相反——要早**,在架構還改得動的時候就介入。因為好的 PRR 會逼出的,往往是**架構級**的問題:「這個下游依賴根本沒有降級路徑,它一掛你就跟著死」「這個寫入不是冪等的,重試會製造重複扣款」——這些一旦上線就幾乎改不動了,只能靠一堆維運 workaround 硬撐。所以我把 PRR 定位成 SRE 對開發**槓桿最大的一次協作**:它不是驗收,是趁還來得及,雙方一起把可靠度**設計進去**。把它做成事後打勾,等於把最值錢的時機浪費掉。

### 接手不是終點,engagement 是可撤回的

最後補一個常被忽略的下半段。服務會 **decay**:今天過了 PRR 乾乾淨淨,一年後可能塞滿 [[sre-toil|toil]]、SLO 長期破、runbook 早就過期。SRE 的 engagement model 有一條我很認同的原則——**接手之後,如果服務長期爛到把 SRE 拖進 toil 泥沼,SRE 有權把 pager 還回去。** 這不是威脅,是保護:它讓「可運維」不只是上線那一刻的快照,而是一個要**持續維持**的狀態,也逼開發不能上線後就放著不管。這也收束了整個系列——從 [[sre-intro|error budget]] 到 PRR,SRE 這一整套的底層邏輯,始終是同一句:**可靠度不是誰的善意,是有明確門檻、有籌碼、可以被拒絕的工程契約。**
