---
title: "為可靠度測試:測試不是證明沒 bug,是讓你敢快"
date: 2026-07-13
category: tech
description: "可靠度不是靠「不改」得來的——你一定得改。測試的意義,是把每次改動的『賭』變成『有信心的推進』,讓你敢頻繁小步發布。這篇講測試金字塔(底層多、上層少)、為什麼綠燈不等於 Production 健康(canary 用真實流量當最後一道測試),以及 flaky test 為什麼是測試界的『狼來了』。"
tags:
  - sre
  - reliability
series: "Google SRE 讀書筆記"
seriesOrder: 9
comments: true
draft: false
---
這篇講一個常被當成「開發的事」、其實是**可靠度基石**的東西:測試。關鍵觀念先講:**可靠度不是靠「不改」得來的**——你一定得改(修 bug、加功能、換設定),而每次改動都是一場賭。測試的意義,就是把這場賭變成**有信心的推進**,讓你敢頻繁小步發布(這正是 [[sre-intro|error budget]] 想要的:改得起、也退得回)。

## 測試金字塔:底層多、上層少

測試分幾層,而它們的**數量該呈金字塔**——底層(便宜、快、穩)要多,上層(貴、慢、脆)要少:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 224" role="img" aria-label="測試金字塔三層。底層 Unit 單元測試最多最快最穩,測單一函式。中層 Integration 整合測試,測幾個元件兜起來。頂層 E2E 端到端測試最少最慢最脆,像使用者走完整路徑。越下面越多越快越穩,越上面越少越慢越脆。倒過來一堆 E2E 少 unit 是反模式,慢又 flaky 又難定位。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <polygon points="200,40 152,88 248,88" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="200" y="72" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">E2E</text>
    <polygon points="152,90 248,90 298,136 102,136" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="200" y="118" fill="#4f6df5" font-size="9.5" text-anchor="middle" font-weight="bold">Integration</text>
    <polygon points="102,138 298,138 348,184 52,184" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="200" y="166" fill="#54b890" font-size="9.5" text-anchor="middle" font-weight="bold">Unit</text>
    <text x="380" y="66" fill="#d6a45c" font-size="8.3" text-anchor="start">↑ 少、慢、脆(像使用者走完整路徑)</text>
    <text x="380" y="118" fill="#9aa4b2" font-size="8.3" text-anchor="start">元件兜起來(service + DB…)</text>
    <text x="380" y="170" fill="#54b890" font-size="8.3" text-anchor="start">↓ 多、快、穩(測單一函式)</text>
    <line x1="366" y1="52" x2="366" y2="182" stroke="#3a4154" stroke-width="1.1"/>
    <text x="290" y="208" fill="#9aa4b2" font-size="8.3" text-anchor="middle">倒過來(一堆 E2E、少 unit)= 反模式:慢、flaky、出事還難定位到哪層</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">底層 <b style="color:#54b890">Unit</b> 又快又穩,該佔絕大多數;<b style="color:#4f6df5">Integration</b> 測元件之間;頂層 <b style="color:#d6a45c">E2E</b> 最像真實使用者但也最慢最脆,點到為止。把金字塔倒過來(一堆 E2E)是常見反模式——跑得慢、還常常紅得不明不白</figcaption>
</figure>

## 綠燈不等於 Production 健康:用 Canary 收尾

但這裡有個 SRE 特別在意的真相:**測試全綠,只代表「你想到要測的情境」過了**——真實世界的流量、資料、時序,永遠有你沒測到的。所以光在測試環境過還不夠,最後一道防線是 **Canary(金絲雀發布)**:新版先只放給一小撮真實流量,盯著 SLI,沒問題再逐步全推:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 208" role="img" aria-label="Canary 金絲雀發布。流量進來後分流,現行版 v1 承接 95% 流量,新版 v2 只承接 5% 當金絲雀。監控盯著 v2 的 SLI 與 error budget:SLI 穩就逐步把 v2 擴大到 100%;SLI 壞就立刻回滾,只有那 5% 的使用者受影響。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="cy" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="16" y="86" width="62" height="34" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="47" y="107" fill="#e6e6e6" font-size="9" text-anchor="middle">流量</text>
    <line x1="78" y1="103" x2="120" y2="70" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cy)"/>
    <line x1="78" y1="103" x2="120" y2="138" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cy)"/>
    <rect x="122" y="52" width="180" height="34" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="212" y="73" fill="#e6e6e6" font-size="8.7" text-anchor="middle">現行版 v1 · 95% 流量</text>
    <rect x="122" y="122" width="180" height="34" rx="6" fill="#33291a" stroke="#d6a45c" stroke-width="1.6"/><text x="212" y="143" fill="#e6e6e6" font-size="8.7" text-anchor="middle">新版 v2 · 5%(金絲雀)</text>
    <line x1="302" y1="139" x2="340" y2="139" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cy)"/>
    <rect x="342" y="122" width="104" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="394" y="138" fill="#e6e6e6" font-size="8" text-anchor="middle">盯 SLI /</text><text x="394" y="149" fill="#e6e6e6" font-size="8" text-anchor="middle">error budget</text>
    <line x1="446" y1="130" x2="474" y2="106" stroke="#54b890" stroke-width="1.2" marker-end="url(#cy)"/>
    <line x1="446" y1="148" x2="474" y2="172" stroke="#e0733a" stroke-width="1.2" marker-end="url(#cy)"/>
    <text x="480" y="100" fill="#54b890" font-size="8.3" text-anchor="start">✓ 穩 → 逐步擴到 100%</text>
    <text x="480" y="176" fill="#e0733a" font-size="8.3" text-anchor="start">✗ 壞 → 回滾,只 5% 中招</text>
    <text x="290" y="198" fill="#9aa4b2" font-size="8.2" text-anchor="middle">用一小撮真實流量當最後一道測試 —— 綠燈之後,再賭一小口,而不是一次全押</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Canary 把「一次全押」變成「先賭一小口」:新版只吃 5% 流量,盯著它的 SLI;穩了才擴大、壞了立刻回滾且只有 5% 使用者受影響。這其實是「用真實流量當測試」</figcaption>
</figure>

還有兩個常被忽略的:**設定(configuration)也要測**——很多故障來自改設定而不是改 code,而設定常常沒人測就上;以及**主動的災難演練**——[[sre-intro|像 Chaos Monkey]] 那樣故意注入故障,測「壞了會怎樣」,而不只測「正常會怎樣」。

## Flaky test 是測試界的「狼來了」

最後一個一定要治的病:**flaky test(不穩定測試)**——偶爾紅、re-run 一下又綠了。它比沒有測試更毒,因為它訓練整個團隊養成「看到紅燈先重跑,通常就過了」的習慣,於是**真正的紅燈也被無視**。這跟 [[sre-alerting-oncall|告警疲勞]]是同一個病:雜訊麻痺了訊號。我的原則很硬:**flaky test 要嘛當天修好、要嘛移除**,絕不放著——放著它,會慢慢腐蝕整個團隊對「綠燈」的信任。

## 反思

### 測試的目的不是「證明沒 bug」,是「讓你敢快」

我年輕時把測試當成「證明我的 code 沒問題」的檢查關卡,壓力很大、也很挫折(因為根本證不完)。後來心態轉了:**測試證明不了沒 bug(不可能窮舉),但它能大幅降低改動的風險——而風險一低,你就敢頻繁、小步地推進。** 可靠度從來不是靠「少改、別動」換來的,是靠「敢頻繁驗證」。這跟 [[sre-intro|error budget]]、跟我在 K8s 滾動更新講的「讓改變可逆,人就敢頻繁前進」完全一致。把測試當**加速器**、不是**路障**,你跟測試的關係就順了。

### 綠燈只代表「你測到的那些」過了

測試全綠很爽,但它保證的範圍,只到「你當初想得到要測的情境」為止。真實世界的流量分佈、髒資料、奇怪時序,永遠在你的測試之外。所以我學會不把「測試過了」當成「一定沒事」,而是當成「風險已經降到,可以放一小撮真實流量去驗證」——然後用 canary 收尾。**測試環境給你信心去賭,canary 讓你只賭一小口。** 這個「分批下注、邊放邊看」的心態,比追求「上線前測到滴水不漏」務實太多——因為後者根本做不到。

### Flaky test 會腐蝕整個團隊的判斷力

一個偶爾紅的測試,傷害的不只是它自己,是**整套測試的公信力**。當「紅燈 = 重跑一下」變成團隊的肌肉記憶,你就等於把警報系統關靜音了——真的出事時,那個紅燈也只會換來一次無意識的 re-run。這跟 [[sre-alerting-oncall|告警]]、跟我一貫講的「訊號要精準」是同一件事:**寧可少一個測試,也不要一個會說謊的測試。** 維護測試的「可信度」,和維護測試的「覆蓋率」一樣重要——一套沒人信的綠燈,跟沒有燈沒兩樣。
