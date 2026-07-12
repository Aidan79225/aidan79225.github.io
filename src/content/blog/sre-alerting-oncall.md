---
title: "告警與 On-call:什麼時候該把人吵醒"
date: 2026-07-12
category: tech
description: "告警的目的不是『通知』,是『該有人動手了』。所以真正的問題不是要不要響,而是——這值得把人半夜吵醒嗎?這篇講告警的三級分流(Page / Ticket / Log)、為什麼要綁在症狀與 error budget 的燃燒速度而非 CPU,以及被叫到的人怎麼健康地 on-call:目標是止血,不是當場逞英雄。"
tags:
  - sre
  - incident
series: "Google SRE 讀書筆記"
seriesOrder: 5
comments: true
draft: false
---
[[sre-monitoring|上一篇]]結尾留了一句:什麼時候該把人吵醒?這篇回答。它其實是兩件事:**告警**(什麼該響、響到誰)和 **on-call**(被叫到的人怎麼健康地扛)。核心觀念只有一句:**告警的目的不是「通知」,是「該有人動手了」。** 抓住這句,一堆告警設計的問題就有了判準。

## 告警分三級:不是每件事都值得把人吵醒

最常見的錯誤,是把「所有異常」都設成會叫醒人的告警。正確做法是依「**需不需要人、急不急**」分三級:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="告警三級分流。Page 呼叫:需要人立刻介入否則使用者正在受影響,會把人吵醒。Ticket 工單:需要人處理但不急,上班時間看。Log 記錄:不需要人看,存著備查與事後分析。把不夠急的都塞進 Page 會造成告警疲勞、狼來了,真的出事反而被忽略。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="290" y="26" fill="#9aa4b2" font-size="10.5" text-anchor="middle" font-weight="bold">一個告警進來:需要人嗎?多急?</text>
    <rect x="40" y="38" width="500" height="44" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.5"/>
    <text x="58" y="58" fill="#e0733a" font-size="10.5" text-anchor="start" font-weight="bold">Page 呼叫</text>
    <text x="58" y="73" fill="#9aa4b2" font-size="8.5" text-anchor="start">需要人「立刻」介入,否則使用者正在受影響</text>
    <text x="522" y="64" fill="#e0733a" font-size="9" text-anchor="end">→ 把人吵醒</text>
    <rect x="40" y="88" width="500" height="44" rx="6" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="58" y="108" fill="#d6a45c" font-size="10.5" text-anchor="start" font-weight="bold">Ticket 工單</text>
    <text x="58" y="123" fill="#9aa4b2" font-size="8.5" text-anchor="start">需要人處理,但不急</text>
    <text x="522" y="114" fill="#d6a45c" font-size="9" text-anchor="end">→ 上班時間看</text>
    <rect x="40" y="138" width="500" height="44" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="58" y="158" fill="#54b890" font-size="10.5" text-anchor="start" font-weight="bold">Log 記錄</text>
    <text x="58" y="173" fill="#9aa4b2" font-size="8.5" text-anchor="start">不需要人看,存著備查 / 事後分析</text>
    <text x="522" y="164" fill="#54b890" font-size="9" text-anchor="end">→ 不打擾任何人</text>
    <text x="290" y="202" fill="#9aa4b2" font-size="8.5" text-anchor="middle">把不夠急的都塞進 Page → 告警疲勞、狼來了,真的出事反而被忽略</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">只有「需要人立刻動手」的才配當 Page。分不清等級、什麼都叫醒人,結果就是<b>告警疲勞(alert fatigue)</b>——人被雜訊麻痺,真正的緊急反而被淹沒</figcaption>
</figure>

告警疲勞是這裡最真實的敵人:當半夜的呼叫十次有九次是「其實不用理」,人就會開始無視、關通知、或處理得越來越慢。所以**告警的品質遠比數量重要**——每砍掉一個沒用的 Page,剩下的 Page 就更被當一回事。

## 好告警綁「症狀 + 燒得多快」,不綁「原因」

那什麼樣的告警才配當 Page?兩個原則。第一,綁**症狀**不綁**原因**([[sre-monitoring|接上一篇]]):使用者在乎「網頁打不開」,不在乎「某台 CPU 高」——CPU 高不一定有人受影響,拿它叫醒人常常是假警報。而且每個 Page 都該是 **actionable**(有明確能做的事)且 **novel**(不是每天重複的雜訊)。

第二,也是現代 SRE 的關鍵一招:**把告警綁在 [[sre-slo|error budget]] 的「燃燒速度」上**。同樣是燒預算,燒得多快決定了急不急:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 216" role="img" aria-label="橫軸時間、縱軸剩餘 error budget 從 100% 到 0。快速燃燒的紅線幾小時就逼近預算警戒線,對應 Page 立刻處理;緩慢燃燒的琥珀線慢慢下降,照這速度到月底才用完,對應只開 Ticket 從容處理。重點是把告警綁在燒多快,而不是綁在 CPU 之類的原因。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <line x1="56" y1="40" x2="56" y2="176" stroke="#3a4154" stroke-width="1.3"/>
    <line x1="56" y1="176" x2="524" y2="176" stroke="#3a4154" stroke-width="1.3"/>
    <text x="30" y="108" fill="#9aa4b2" font-size="8.5" text-anchor="middle" transform="rotate(-90 30 108)">剩餘 error budget</text>
    <text x="300" y="196" fill="#9aa4b2" font-size="8.5" text-anchor="middle">時間 →</text>
    <text x="52" y="46" fill="#9aa4b2" font-size="7.5" text-anchor="end">100%</text>
    <line x1="56" y1="150" x2="524" y2="150" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="520" y="146" fill="#9aa4b2" font-size="7.5" text-anchor="end">警戒</text>
    <polyline points="58,46 200,168" fill="none" stroke="#e0733a" stroke-width="2.4"/>
    <polyline points="58,52 520,132" fill="none" stroke="#d6a45c" stroke-width="2.4"/>
    <text x="238" y="112" fill="#e0733a" font-size="8.7" text-anchor="start">燒太快:幾小時就要燒光</text>
    <text x="238" y="125" fill="#e0733a" font-size="8.7" text-anchor="start">→ Page(立刻處理)</text>
    <text x="330" y="96" fill="#d6a45c" font-size="8.7" text-anchor="start">慢慢燒:照這速度月底才用完</text>
    <text x="330" y="109" fill="#d6a45c" font-size="8.7" text-anchor="start">→ Ticket(從容處理)</text>
    <text x="290" y="210" fill="#9aa4b2" font-size="8.2" text-anchor="middle">把告警綁在「error budget 燒多快」,而不是綁在 CPU 之類的原因</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同樣是燒 error budget,速度決定緊急程度:幾小時要燒光 → 立刻 Page;慢慢滲漏、月底才用完 → 開 Ticket 從容處理。這就是「多視窗多燒率(multi-window multi-burn-rate)」告警的精神</figcaption>
</figure>

## On-call:目標是止血,不是逞英雄

告警設好了,總得有人接。**On-call** 就是「拿著呼叫器、隨時準備介入」的責任。健康的 on-call 有幾個要件:**輪值公平**(別一個人扛)、**每班的 Page 量有上限**(超過就代表系統或告警有問題,該回頭修而不是硬撐)、**有補償**、**有明確的 escalation**(搞不定時知道找誰)。

但最重要的是**心態**:on-call 被叫到時,目標是**快速止血(mitigate),不是當場找出並修好 root cause**。半夜、腦子不清楚、壓力又大,最該做的是回滾、切流量、重啟——**讓使用者先好**,root cause 留給白天清醒、能好好調查的時候。相信 **runbook / playbook**,照著止血步驟走,別靠臨場英雄——因為英雄式救火不可規模化、也不可持續,今天靠你救、明天你請假就爆了。

## 反思

### 告警疲勞,是「狼來了」的工程版

我對這章最有共鳴的,是它把一個心理現象講成了工程問題:**什麼都告警,等於什麼都沒告警。** 人被雜訊麻痺之後,真正的緊急反而會被無視——這就是狼來了。所以我現在看告警系統,第一個問的不是「夠不夠全」,而是「**這裡面有多少是其實不用理的**」。每砍掉一個沒用的 Page,是在**替真正重要的那個 Page 買回注意力**。這跟第 3 篇 [[sre-toil|消除 toil]]、跟我一貫的「少即是多」一脈相承:告警的價值在精準,不在數量。

### On-call 的目標是止血,不是當場當英雄

我看過(也當過)那種 on-call 被叫醒後,硬要半夜把 root cause 挖出來修好的人——結果搞到天亮、還可能因為腦子不清楚改出新的包。這章糾正了我:**on-call 的第一要務是讓使用者先好(止血),不是滿足自己「解謎」的衝動。** 回滾、切流量、重啟這些「不優雅但有效」的手段,半夜遠比「找出真相」重要;真相留給白天。而且要**相信 runbook**——把止血步驟寫成人人能照做的手冊,而不是靠某個英雄的臨場反應,這才是能規模化、能讓你安心請假的維運。

### 健康的 on-call 是一個「會自我改善」的迴圈

最後一個體會:好的 on-call 制度,會讓 Page **越來越少**,而不是讓人越來越累。關鍵在每被叫一次,事後都認真問兩個問題:**這能不能自動化掉([[sre-toil|toil]])?這能不能根治(postmortem,下一篇)?** 如果你的 on-call 每週都在處理同一批鳥事,那不是「on-call 很辛苦」這麼簡單,是**沒有人把那個改善迴圈跑起來**。我因此把 on-call 當成一個訊號源:它反覆在痛的地方,正是系統最該被投資的地方——**被同一件事吵醒第二次,就該動手根治它,而不是認命再被吵第三次。**
