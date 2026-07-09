---
title: "SLI / SLO / SLA:一個量測、一個目標、一個合約"
date: 2026-07-09
category: tech
description: "上一篇說 error budget = 1 − SLO,但 SLO 到底是什麼?它跟幾乎人人混用的 SLI、SLA 差在哪?一句話:SLI 是你量到的數字、SLO 是你內部拚的目標、SLA 是你對客戶的合約。而且 SLA 一定比 SLO 寬鬆——這個『對內嚴、對外鬆』的 buffer,是可靠度工程最成熟的一手。"
tags:
  - sre
  - reliability
series: "Google SRE 讀書筆記"
seriesOrder: 2
comments: true
draft: false
---
[[sre-intro|上一篇]]說 error budget = 1 − SLO。但 SLO 是什麼?它跟另外兩個幾乎人人混用的縮寫——SLI、SLA——又差在哪?這三個字分不清,可靠度就無從談起。一句話先記住:**SLI 是你「量到」的數字、SLO 是你「內部拚」的目標、SLA 是你「對客戶承諾」的合約。**

## 一個量測、一個目標、一個合約

三者是層層往外的關係,而且**門檻一層比一層鬆**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 210" role="img" aria-label="一條可靠度軸從 99% 到 100%。SLA 門檻 99.5% 是對外合約違反賠錢,SLO 門檻 99.9% 是內部目標,SLI 99.95% 是實際量到的落在健康區。低於 SLA 是違約區,SLA 到 SLO 之間是沒達標的安全 buffer,高於 SLO 是健康區。門檻鬆緊 SLA 小於 SLO 小於等於 SLI" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="60" y="102" fill="#9aa4b2" font-size="7.5" text-anchor="start">99.0%</text>
    <text x="520" y="102" fill="#9aa4b2" font-size="7.5" text-anchor="end">100%</text>
    <text x="170" y="50" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">SLA 99.5%</text>
    <text x="170" y="63" fill="#9aa4b2" font-size="7.5" text-anchor="middle">對外合約·違反賠錢</text>
    <text x="340" y="50" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">SLO 99.9%</text>
    <text x="340" y="63" fill="#9aa4b2" font-size="7.5" text-anchor="middle">內部目標(拚這個)</text>
    <line x1="170" y1="70" x2="170" y2="150" stroke="#e0733a" stroke-width="1.3" stroke-dasharray="4 3"/>
    <line x1="340" y1="70" x2="340" y2="150" stroke="#4f6df5" stroke-width="1.3" stroke-dasharray="4 3"/>
    <rect x="60" y="110" width="110" height="30" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/>
    <text x="115" y="129" fill="#e0733a" font-size="8.5" text-anchor="middle">違約區</text>
    <rect x="170" y="110" width="170" height="30" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="255" y="129" fill="#d6a45c" font-size="8.5" text-anchor="middle">沒達標(但還沒違約)</text>
    <rect x="340" y="110" width="180" height="30" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <text x="415" y="129" fill="#54b890" font-size="8.5" text-anchor="middle">健康區</text>
    <circle cx="440" cy="125" r="6" fill="#54b890" stroke="#e6e6e6" stroke-width="1.2"/>
    <text x="452" y="122" fill="#54b890" font-size="9" text-anchor="start">← SLI 99.95%</text>
    <text x="452" y="133" fill="#9aa4b2" font-size="7.5" text-anchor="start">實際量到的</text>
    <line x1="170" y1="158" x2="340" y2="158" stroke="#d6a45c" stroke-width="1.1"/>
    <text x="255" y="172" fill="#d6a45c" font-size="8.5" text-anchor="middle">安全 buffer:內部先痛,別讓客戶先痛</text>
    <text x="290" y="196" fill="#9aa4b2" font-size="8.7" text-anchor="middle">門檻鬆緊:SLA(鬆) &lt; SLO(嚴) ≤ SLI(健康時的實測)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#54b890">SLI</b> 是你實際量到的(99.95%);<b style="color:#4f6df5">SLO</b> 是內部拚的目標(99.9%);<b style="color:#e0733a">SLA</b> 是對客戶的合約(99.5%,違反賠錢)。SLA 刻意比 SLO 鬆一截,中間那段就是留給自己的安全 buffer</figcaption>
</figure>

拆開來看:

- **SLI(Indicator,指標)**:你**實際量到**的可靠度數字,例如「99.95% 的請求成功」。它回答「現在到底多可靠?」——是監控與 error budget 計算的原料。
- **SLO(Objective,目標)**:你對 SLI 設的**內部目標**,例如「請求成功率 ≥ 99.9%」。它回答「多可靠才算夠?」——[[sre-intro|error budget = 1 − SLO]] 就從這裡來。
- **SLA(Agreement,合約)**:你**對客戶的承諾**,違反要付代價(退費、賠償),例如「≥ 99.5%,否則退這個月費用」。它回答「沒做到會怎樣?」

關鍵是那個順序:**SLA 一定比 SLO 寬鬆。** 因為如果你對外承諾的門檻(SLA)跟內部目標(SLO)一樣高,那 SLO 一旦沒達成,你就直接違約賠錢了。留一段 buffer,讓自己在「還沒違約、但已經該緊張」時就先收到警報——**內部先痛,別讓客戶先痛。**

## 什麼是好的 SLI

三者裡,SLI 是根——SLO、SLA 都是建在它上面的門檻。所以定義一個**好的** SLI 特別重要。好的 SLI 幾乎都是同一個形狀:**「好事件」佔「有效事件」的比例**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 208" role="img" aria-label="SLI 等於好事件除以有效事件乘以 100%。用十個請求方塊示意,九個成功一個失敗,SLI 等於 90%。常見的好 SLI 有四類:可用性是成功除以總請求、延遲是夠快的除以總請求、正確性是正確除以總數、新鮮度是夠新的除以總數。要選使用者真正在乎的,不是你好量的" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="280" y="30" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">SLI = 好事件 ÷ 有效事件 × 100%</text>
    <rect x="90" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="128" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="166" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="204" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="242" y="48" width="34" height="28" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/>
    <rect x="280" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="318" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="356" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="394" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <rect x="432" y="48" width="34" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/>
    <text x="280" y="94" fill="#9aa4b2" font-size="8.5" text-anchor="middle">9 個成功 / 10 個請求 = 90%(示意)</text>
    <text x="60" y="120" fill="#9aa4b2" font-size="9" text-anchor="start" font-weight="bold">常見的好 SLI:</text>
    <rect x="40" y="128" width="245" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="52" y="146" fill="#e6e6e6" font-size="8.8" text-anchor="start">可用性:成功請求 / 總請求</text>
    <rect x="295" y="128" width="245" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="307" y="146" fill="#e6e6e6" font-size="8.8" text-anchor="start">延遲:夠快的請求(&lt;300ms) / 總請求</text>
    <rect x="40" y="160" width="245" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="52" y="178" fill="#e6e6e6" font-size="8.8" text-anchor="start">正確性:正確結果 / 總數</text>
    <rect x="295" y="160" width="245" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="307" y="178" fill="#e6e6e6" font-size="8.8" text-anchor="start">新鮮度:夠新的資料 / 總數</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">好的 SLI 是「好事件 / 有效事件」的比例,而且要選<b>使用者真正在乎的</b>——他請求成功嗎?夠快嗎?結果對嗎?資料夠新嗎?CPU 使用率、記憶體這種內部指標不是 SLI,因為使用者根本感受不到</figcaption>
</figure>

最常見的錯誤,是拿「你好量的」當 SLI——一堆 CPU、記憶體、磁碟的數字。但那些是**原因**,不是**使用者體感**。SLI 要貼著使用者的旅程走:他發的請求成功了嗎?回得夠快嗎?這逼你從使用者的角度定義「什麼叫好」,而不是從機房的角度。

## SLO 怎麼訂、SLA 為什麼要更鬆

訂 SLO 有幾個要點:**別訂 100%**([[sre-intro|上一篇]]講過,太貴又感受不到);用「**時間窗 + 百分比**」表達,例如「過去 28 天,99.9% 的請求成功」;而且從**使用者體感**反推——低到使用者開始抱怨的那條線之上一點,就是合理的 SLO。

至於 SLA,記住兩件事:**不是每個服務都需要 SLA**(對內服務通常只有 SLO 就夠);而且**SLA 一定比 SLO 鬆**——SLO 是你給自己的早期警報,在真正違約、要賠錢之前,就先逼你回頭修。這一切的終點又回到 [[sre-intro|error budget]]:訂好 SLO,`1 − SLO` 就是你這段時間能花的預算,而 SLI 的實測告訴你花掉多少了。**SLI 量現況、SLO 定目標、error budget 管節奏、SLA 兜底線**——四個東西,一條線串起來。

## 反思

### 「對內嚴、對外鬆」是我覺得最成熟的一手

SLA 比 SLO 鬆這個設計,第一次看可能覺得多此一舉,但它其實藏著很成熟的思維:**給自己設一條比對外承諾更高的標準,當早期警報。** 等到客戶那條線(SLA)被踩才反應,已經太遲——要賠錢、要道歉、信任已經掉了。內部先立一條更嚴的線(SLO),讓自己在「還沒出事、但苗頭不對」時就先動手。這個「自己先痛、別讓客戶先痛」的紀律,我覺得遠不只適用於可靠度——任何對外的承諾,內部都該有一條更嚴的自我要求墊在前面。

### 好的指標選「使用者在乎的」,不是「你好量的」

我看過太多監控儀表板,滿滿的 CPU、記憶體、QPS,好看、也好抓,但沒有一個回答得了「使用者現在爽不爽」。SLI 的定義逼我換位:**站在使用者那一端,他判斷這個服務好不好,是看什麼?** 幾乎都是「成不成功、快不快、對不對、新不新」,而不是我機房裡的資源數字。這個換位很基本,卻是很多團隊監控做半天卻抓不到重點的根因——**你量的是你的方便,不是他的體感。**

### SLO 是一種「刻意寫下來的不完美」

這篇跟[[sre-intro|上一篇]]合起來,講的其實是同一件事:**先有一把大家公認的尺,後面的一切(error budget、發布決策、告警)才立得起來。** 而這把尺的本質,是把「多穩才算夠」這個模糊的共識,量化、明講、寫下來。沒有 SLO,團隊對「穩不穩」永遠各說各話,error budget 無從算、告警不知道該不該響。把「夠好」明確定義出來,聽起來不起眼,卻是可靠度工程真正的起點——**能被寫下來的目標,才管得動。**
