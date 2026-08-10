---
title: "維運中斷:殺死生產力的不是工作量,是被切碎的時間"
date: 2026-08-04
category: tech
description: "一則則的 ticket、臨時的問題、隨手的 page——每個中斷單看都不大,合起來卻能讓工程師一整天『很忙但沒產出』。因為中斷真正的成本不是它花掉的那幾分鐘,是它把剩下的時間切碎到做不了深度工作。這篇講中斷為什麼這麼貴,以及團隊層級的解法:interrupt shield,用一個人的專注換回一整隊的專注。"
tags:
 - sre
 - reliability
series: "Google SRE 讀書筆記"
seriesOrder: 17
comments: true
draft: false
---
[[sre-alerting-oncall|On-call 那篇]]講「怎麼設計告警、誰值班」,[[sre-toil|Toil 那篇]]講「用 50% 護欄別讓維運吃光工程時間」。但這兩條之間,漏了一個每天都在發生、卻很少被當成問題來管的東西:**中斷(interrupts)**——那些一則則的 ticket、臨時被問的問題、隨手丟來的 page。它們單看每個都不大,合起來卻能讓一個工程師一整天「很忙,但什麼都沒推動」。這篇講中斷為什麼這麼貴,以及怎麼在團隊層級管它。

## 中斷的成本,不是時間,是被切碎的時間

先破一個直覺:一個 5 分鐘的中斷,真正的代價**不是那 5 分鐘**。是它打斷了你的心流,而事後要花 20、30 分鐘才能重新爬回剛剛的思考狀態(ramp-up)。所以中斷殺死的不是「工作時間」,是**「連續的、能做深度工作的時間」**。這件事的殘酷之處在於:同樣的中斷總量,散開來、還是收成一塊,產出天差地遠:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="中斷的成本是被切碎的時間。圖例:綠色是真正的工作，橘色是被中斷後重新進入狀態的 ramp-up，紅色是中斷本身。第一列被切碎的一天:一條工作時間軸上散布六個紅色中斷，每個中斷後面都跟一段橘色 ramp-up，剩下的綠色工作被切成一小段一小段的碎片，完整深度工作幾乎沒有。第二列把中斷收成一塊:同樣數量的中斷全部集中到最右邊一個紅色時段，左邊留下一大段不被打斷的綠色深度工作。兩列的中斷總時間一樣，但第二列的深度工作是一整段。結論:中斷的成本不是它花掉的時間，是把剩下的時間切碎到做不了深度工作。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">中斷的成本:不是時間,是被切碎</text>
    <rect x="150" y="24" width="10" height="8" fill="#223528" stroke="#54b890" stroke-width="1"/><text x="164" y="31" fill="#9aa4b2" font-size="7" text-anchor="start">工作</text>
    <rect x="196" y="24" width="10" height="8" fill="#2e2a1a" stroke="#d6a45c" stroke-width="1"/><text x="210" y="31" fill="#9aa4b2" font-size="7" text-anchor="start">ramp-up</text>
    <rect x="270" y="24" width="10" height="8" fill="#331f22" stroke="#d66b5c" stroke-width="1"/><text x="284" y="31" fill="#9aa4b2" font-size="7" text-anchor="start">中斷</text>
    <text x="40" y="52" fill="#e6e6e6" font-size="8.4" text-anchor="start" font-weight="bold">① 被切碎的一天</text>
    <rect x="40" y="58" width="500" height="30" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/>
    <rect x="88" y="58" width="12" height="30" fill="#331f22" stroke="#d66b5c" stroke-width="1"/><rect x="100" y="58" width="22" height="30" fill="#2e2a1a" stroke="#d6a45c" stroke-width="0.8"/>
    <rect x="160" y="58" width="12" height="30" fill="#331f22" stroke="#d66b5c" stroke-width="1"/><rect x="172" y="58" width="22" height="30" fill="#2e2a1a" stroke="#d6a45c" stroke-width="0.8"/>
    <rect x="232" y="58" width="12" height="30" fill="#331f22" stroke="#d66b5c" stroke-width="1"/><rect x="244" y="58" width="22" height="30" fill="#2e2a1a" stroke="#d6a45c" stroke-width="0.8"/>
    <rect x="304" y="58" width="12" height="30" fill="#331f22" stroke="#d66b5c" stroke-width="1"/><rect x="316" y="58" width="22" height="30" fill="#2e2a1a" stroke="#d6a45c" stroke-width="0.8"/>
    <rect x="376" y="58" width="12" height="30" fill="#331f22" stroke="#d66b5c" stroke-width="1"/><rect x="388" y="58" width="22" height="30" fill="#2e2a1a" stroke="#d6a45c" stroke-width="0.8"/>
    <rect x="448" y="58" width="12" height="30" fill="#331f22" stroke="#d66b5c" stroke-width="1"/><rect x="460" y="58" width="22" height="30" fill="#2e2a1a" stroke="#d6a45c" stroke-width="0.8"/>
    <text x="290" y="104" fill="#e08b7c" font-size="7.8" text-anchor="middle" font-weight="bold">完整深度工作 ≈ 幾乎沒有(全是碎片)</text>
    <text x="40" y="130" fill="#e6e6e6" font-size="8.4" text-anchor="start" font-weight="bold">② 把中斷收成一塊</text>
    <rect x="40" y="136" width="500" height="30" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/>
    <rect x="452" y="136" width="14" height="30" fill="#2e2a1a" stroke="#d6a45c" stroke-width="0.8"/>
    <rect x="466" y="136" width="74" height="30" fill="#331f22" stroke="#d66b5c" stroke-width="1"/>
    <text x="244" y="155" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">不被打斷的深度工作(一整段)</text>
    <text x="503" y="154" fill="#e08b7c" font-size="6.4" text-anchor="middle">中斷時段</text>
    <text x="290" y="182" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">同樣的中斷總量 → 深度工作 = 一整段</text>
    <text x="290" y="212" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">中斷的成本不是它花的時間,是把剩下的時間切碎到做不了深度工作</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">兩列的<b>中斷總時間一模一樣</b>,產出卻天差地遠。<b>①</b> 散開的中斷,每一個後面都拖一段<b style="color:#d6a45c">重新進入狀態的 ramp-up</b>,把工作切成一小段一小段的碎片——<b style="color:#e08b7c">深度工作幾乎歸零</b>。<b>②</b> 同樣的中斷收成一塊,左邊就留下<b style="color:#54b890">一整段不被打斷的時間</b>。所以管中斷,不是管「總量」,是管「<b>碎片化</b>」——這也是為什麼「隨時被打斷一下」比「集中被打斷一次」傷得多</figcaption>
</figure>

## Interrupt shield:用一個人的專注,換回一整隊的專注

既然碎片化才是真正的敵人,團隊層級的解法就很清楚:**別讓每個人都分到一點中斷**(結果全員被切碎、整隊零深度工作),而是指定一個人(或一對)這段時間當「**盾**」,接下**所有**中斷,其餘的人換到完整、不被打斷的時間。下一輪再輪替:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Interrupt shield 一人當盾。左邊人人分一點:四個人的一天各自被三個紅色中斷切碎，四個人全被切碎，深度工作接近零。右邊一人當盾:第一個人整條是紅色，代表這輪接下全部中斷；另外三個人整條是綠色，得到完整不被打斷的專注時間，下週再輪替。結論:把中斷集中到一個人身上，是拿一個人的專注，換回其餘 N 減一個人的專注。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Interrupt shield:一人當盾,其餘專注</text>
    <line x1="290" y1="30" x2="290" y2="158" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="145" y="42" fill="#e08b7c" font-size="8.6" text-anchor="middle" font-weight="bold">人人分一點</text>
    <text x="145" y="54" fill="#9aa4b2" font-size="7" text-anchor="middle">每人各接 1/4 中斷</text>
    <rect x="36" y="62" width="218" height="16" rx="2" fill="#223528" stroke="#54b890" stroke-width="0.8"/><rect x="70" y="62" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="130" y="62" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="190" y="62" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/>
    <rect x="36" y="84" width="218" height="16" rx="2" fill="#223528" stroke="#54b890" stroke-width="0.8"/><rect x="58" y="84" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="120" y="84" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="200" y="84" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/>
    <rect x="36" y="106" width="218" height="16" rx="2" fill="#223528" stroke="#54b890" stroke-width="0.8"/><rect x="90" y="106" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="150" y="106" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="212" y="106" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/>
    <rect x="36" y="128" width="218" height="16" rx="2" fill="#223528" stroke="#54b890" stroke-width="0.8"/><rect x="64" y="128" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="140" y="128" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/><rect x="196" y="128" width="10" height="16" fill="#331f22" stroke="#d66b5c" stroke-width="0.8"/>
    <text x="145" y="160" fill="#e08b7c" font-size="7.6" text-anchor="middle" font-weight="bold">4 人全被切碎 → 深度工作 ≈ 0</text>
    <text x="435" y="42" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">一人當盾</text>
    <text x="435" y="54" fill="#9aa4b2" font-size="7" text-anchor="middle">盾接全部,其餘不被打斷</text>
    <rect x="326" y="62" width="218" height="16" rx="2" fill="#331f22" stroke="#d66b5c" stroke-width="1.1"/><text x="435" y="74" fill="#e08b7c" font-size="7.4" text-anchor="middle" font-weight="bold">盾:接下全部中斷</text>
    <rect x="326" y="84" width="218" height="16" rx="2" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="435" y="96" fill="#54b890" font-size="7.4" text-anchor="middle">完整專注</text>
    <rect x="326" y="106" width="218" height="16" rx="2" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="435" y="118" fill="#54b890" font-size="7.4" text-anchor="middle">完整專注</text>
    <rect x="326" y="128" width="218" height="16" rx="2" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="435" y="140" fill="#54b890" font-size="7.4" text-anchor="middle">完整專注</text>
    <text x="435" y="160" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">3 人完整專注 · 下週輪替</text>
    <text x="290" y="190" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">拿 1 個人的專注,換回 N−1 個人的專注 —— 而且輪流</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左邊每人各接一點中斷,結果是<b style="color:#e08b7c">四個人全被切碎</b>、整隊零深度工作。右邊指定一個人當<b style="color:#e08b7c">盾</b>接下全部中斷,另外三人就換到<b style="color:#54b890">完整不被打斷的時間</b>,下週再輪替。這筆交易很划算:<b>拿一個人的專注,換回其餘 N−1 個人的專注</b>。配套是「盾」要把時間<b>極化</b>——這段時間就全職處理中斷,不要一邊接 ticket 一邊想推專案,那等於兩頭都做不好</figcaption>
</figure>

## 反思

### 我衡量團隊產能,看的是「完整時間塊」,不是「忙不忙」

帶團隊久了,我對「忙」越來越不信任。一個團隊可以每個人都很忙、都在加班、ticket 都有回、Slack 秒讀秒回——然後季度目標一項都沒動。因為沒有任何一個人,拿到過連續三小時去做真正需要思考的事。**忙,是中斷餵出來的假象;產出,來自不被打斷的整塊時間。** 所以我現在 review 團隊健康,不看「大家忙不忙」,看一個更誠實的數字:**這週,每個人拿到了幾個「不被打斷的兩小時」?** 這個數字,幾乎直接對應我們能不能做出需要動腦的東西。把它當指標之後,我對會議、對「同步一下」、對隨手的 @,都變得小氣很多——因為我知道我砍掉的不是幾分鐘,是別人一整段的心流。

### 半推半就的 available,是最糟的狀態

「我一邊做專案、一邊隨時看一下 Slack」,聽起來很負責,其實是所有狀態裡最差的一種:你既沒有真的專注(隨時準備被拉走,思考永遠停在淺層),中斷的回應也慢(卡在專案的脈絡裡切不過去)。**50/50 的 available,是專注和回應兩頭空。** 這也是 interrupt shield 的精髓——它逼你**極化**:要嘛全職當盾、要嘛完全被保護,不要待在中間。我對自己也套同一條規矩:當我決定今天要進 deep work,就把通知關掉、明確跟團隊說「今天找 X,先別找我」。這不是不負責——恰恰相反,它是把「負責回應」這件事,清楚交給此刻該做它的那個人,而不是每個人都心不在焉地半接著。

### 中斷率一直升高,是症狀,不是「該多請人」

最後一個是 lead 最容易做錯的判斷。當一個服務的 ticket 越來越多,直覺反應是「人手不夠,再加一個人來接」。但中斷率**持續**升高,幾乎總是**上游有東西壞了**的症狀:一個沒做好 [[sre-production-readiness|生產就緒]]的服務、一堆本該自動化卻沒做的 [[sre-toil|toil]]、一份過期的 runbook 讓同一個問題被一問再問。加人去接中斷,只是把症狀吸收掉,反而讓真正的病灶更難被看見——你花錢買了「看起來還撐得住」,代價是永遠不去修那個一直在生 ticket 的源頭。所以我把「中斷量」當成一個 SLI 在追:它一路往上,代表該回頭修的不是排班表,是那個源頭。這也收束回 SRE 的底層信念——**它對「人的時間」也做可靠度工程:專注,跟服務的正常運轉一樣,是一種會被侵蝕、必須主動保護的資源。**
