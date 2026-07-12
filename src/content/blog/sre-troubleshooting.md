---
title: "有效除錯:除錯是方法,不是天分"
date: 2026-07-12
category: tech
description: "高手除錯看起來像魔法,其實不是——他們只是有一套系統化逼近答案的方法。這篇拆解 SRE 的除錯流程:先止血、再觀察、然後用『假設→測試→排除』診斷,而最鋒利的武器是分而治之(沿著請求路徑二分定位)。加上幾條鐵律:一次只改一個變因、相信資料別相信直覺、問『什麼變了』。"
tags:
  - sre
  - incident
series: "Google SRE 讀書筆記"
seriesOrder: 6
comments: true
draft: false
---
[[sre-alerting-oncall|上一篇]]說 on-call 被叫到先止血;但止完血,總得找出**為什麼**。這篇講除錯——而它最重要的一個觀念是:**除錯不是靠天分或運氣,是一套可以學的系統化方法。** 新手和老手的差別,不在「知道答案」,而在**有沒有一套逼近答案的流程**。

## 先認出反模式:亂猜與換零件

沒方法的除錯長什麼樣?**隨機改東西看會不會好**(換零件式除錯)、**只檢查自己熟的地方**、**一次改一堆設定**、**被「最近好像動過什麼」牽著鼻子走**。這些之所以沒用,是因為它們沒有在**縮小問題的範圍**——你只是在碰運氣,運氣好矇到、運氣差越弄越糟,而且事後你根本不知道到底是什麼修好的(因為一次改了太多)。

## 系統化除錯的流程

有方法的除錯,是一個有次序的迴圈:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 210" role="img" aria-label="系統化除錯流程四步:Triage 止血先讓系統活著、Examine 觀察看監控與 log 與黃金訊號、Diagnose 診斷用假設測試排除、Treat 修復一次改一個變因且可回復。若沒修好就從 Treat 回到 Diagnose 再提假設。反模式是亂猜、隨機換零件、一次改一堆變因。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="ts" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="18" y="58" width="120" height="58" rx="7" fill="#3a2626" stroke="#e0733a" stroke-width="1.5"/>
    <text x="78" y="80" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">① Triage 止血</text>
    <text x="78" y="96" fill="#9aa4b2" font-size="8" text-anchor="middle">先讓系統活著</text>
    <text x="78" y="107" fill="#9aa4b2" font-size="8" text-anchor="middle">(別急著找 root cause)</text>
    <rect x="158" y="58" width="120" height="58" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="218" y="80" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">② Examine 觀察</text>
    <text x="218" y="96" fill="#9aa4b2" font-size="8" text-anchor="middle">看監控 / log</text>
    <text x="218" y="107" fill="#9aa4b2" font-size="8" text-anchor="middle">四個黃金訊號</text>
    <rect x="298" y="58" width="120" height="58" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="358" y="80" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">③ Diagnose 診斷</text>
    <text x="358" y="96" fill="#9aa4b2" font-size="8" text-anchor="middle">假設 → 測試 → 排除</text>
    <text x="358" y="107" fill="#9aa4b2" font-size="8" text-anchor="middle">二分逼近</text>
    <rect x="438" y="58" width="120" height="58" rx="7" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="498" y="80" fill="#d6a45c" font-size="10" text-anchor="middle" font-weight="bold">④ Treat 修復</text>
    <text x="498" y="96" fill="#9aa4b2" font-size="8" text-anchor="middle">一次改一個變因</text>
    <text x="498" y="107" fill="#9aa4b2" font-size="8" text-anchor="middle">可回復</text>
    <line x1="138" y1="87" x2="156" y2="87" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ts)"/>
    <line x1="278" y1="87" x2="296" y2="87" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ts)"/>
    <line x1="418" y1="87" x2="436" y2="87" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ts)"/>
    <path d="M498,58 C498,34 358,34 358,56" fill="none" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="4 3" marker-end="url(#ts)"/>
    <text x="428" y="30" fill="#9aa4b2" font-size="8" text-anchor="middle">沒好?回頭再提假設</text>
    <text x="290" y="146" fill="#9aa4b2" font-size="8.5" text-anchor="middle">每一步都在「縮小範圍」;而反模式(亂猜、隨機換零件、一次改一堆)從不縮小,只是碰運氣</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">先止血讓使用者無感,再依監控觀察(四個黃金訊號),然後用「假設→測試→排除」一步步逼近,最後謹慎修復。跟反模式的差別只有一個:它<b>每一步都在縮小問題的範圍</b></figcaption>
</figure>

診斷(③)是整個流程的核心,而它的手法就一句話:**提出一個假設,想辦法驗證或否證它,藉此排除一部分可能。** 這跟二分搜尋一模一樣——每測一次,就砍掉一半的嫌疑範圍。

## 核心武器:分而治之(二分法)

診斷時最鋒利的一招,是**分而治之**:沿著請求的路徑,不要逐段瞎試,而是**先量中間**——問「問題在這一段之前,還是之後?」一刀砍掉一半:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 190" role="img" aria-label="請求路徑 Client 到 LB 到 App 到 Cache 到 DB。使用者回報慢,不要逐段瞎試,而是先量中間的 App,判斷問題在它之前還是之後,一刀砍一半,最後定位到 DB 變慢。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="tp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="20" y="70" width="96" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="68" y="94" fill="#e6e6e6" font-size="9" text-anchor="middle">Client</text>
    <rect x="134" y="70" width="96" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="182" y="94" fill="#e6e6e6" font-size="9" text-anchor="middle">LB</text>
    <rect x="248" y="70" width="96" height="40" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="296" y="94" fill="#e6e6e6" font-size="9" text-anchor="middle">App</text>
    <rect x="362" y="70" width="96" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="410" y="94" fill="#e6e6e6" font-size="9" text-anchor="middle">Cache</text>
    <rect x="476" y="70" width="96" height="40" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.6"/><text x="524" y="90" fill="#e6e6e6" font-size="9" text-anchor="middle">DB</text><text x="524" y="102" fill="#e0733a" font-size="7.5" text-anchor="middle">慢 ❌</text>
    <line x1="116" y1="90" x2="132" y2="90" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#tp)"/>
    <line x1="230" y1="90" x2="246" y2="90" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#tp)"/>
    <line x1="344" y1="90" x2="360" y2="90" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#tp)"/>
    <line x1="458" y1="90" x2="474" y2="90" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#tp)"/>
    <text x="296" y="52" fill="#4f6df5" font-size="8.5" text-anchor="middle">① 先量中間(App)</text>
    <line x1="296" y1="56" x2="296" y2="66" stroke="#4f6df5" stroke-width="1.2" stroke-dasharray="3 2"/>
    <path d="M320,64 C400,44 470,50 500,66" fill="none" stroke="#e0733a" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#tp)"/>
    <text x="430" y="44" fill="#e0733a" font-size="8.5" text-anchor="middle">② App 之後才慢 → 縮到後段 → DB</text>
    <text x="290" y="150" fill="#9aa4b2" font-size="8.5" text-anchor="middle">沿路徑一次砍一半 → 幾步就定位,而不是從頭逐段瞎試</text>
    <text x="290" y="168" fill="#9aa4b2" font-size="8" text-anchor="middle">使用者回報:慢。別猜「大概是 X」,去量、去二分</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">二分法把「大海撈針」變成「幾步定位」:先量路徑中間,判斷問題在前段還後段,砍掉一半,再對剩下的一半重複。這招在任何分層系統都通用</figcaption>
</figure>

## 幾條鐵律

流程之外,有幾條讓除錯不走歪的鐵律:

- **一次只改一個變因**。同時改三個東西然後好了,你永遠不知道是哪個修好的、其他兩個有沒有埋雷。
- **相信資料,別相信直覺**。去看監控、log、[[sre-monitoring|黃金訊號]],用資料**否證**假設,而不是用直覺去**確認**成見。
- **問「什麼變了」**。多數故障跟「最近的一次變動」有關(部署、設定、流量)——先看變更紀錄,常常一秒破案;但也別被它綁架到不看別的。
- **記錄你做了什麼**。方便回溯、方便交接、也是之後寫 postmortem(下一篇)的原料。

## 反思

### 除錯是方法,不是天分

我剛入行時覺得資深工程師除錯像有神通——瞄一眼就知道哪裡壞。後來近距離看才發現,那不是神通,是**一套穩定的逼近方法**:先看資料、再提假設、然後二分縮小。他們不是「知道答案」,是「有辦法在幾步內逼出答案」。這個認知對我影響很大——它把除錯從「靠靈感的玄學」變成「可以刻意練習的技能」。我帶新人時最先教的也是這個:**別急著猜,先看;別亂改,先縮小。** 方法對了,任何人都能穩定除錯。

### 二分法是除錯的萬用鑰匙

「沿著資料流一次砍一半」這招,我用到哪裡都靈。它的威力在於**每一步都讓問題空間減半**——十段路徑,三四步就定位,而不是從頭試到尾。想通之後我發現,這跟我在 [[sql-explain|讀 SQL 執行計畫]]找瓶頸、在 [[sql-gaps-islands|gaps-and-islands]] 縮小問題、甚至在 code review 找 bug,用的都是同一種「縮小搜尋空間」的思維。**學會二分定位,比背下任何特定 bug 的解法都值錢**,因為它適用於你還沒遇過的所有問題。

### 「相信資料,別相信直覺」——去看,別猜

除錯最大的敵人,其實是「我覺得應該是 X」的成見。成見很危險,因為它讓你**只去找支持它的證據、自動忽略矛盾的線索**,於是你在錯的方向上越挖越深。系統化流程的價值,就在它強迫你去「**看**」——看監控、看 log、看執行計畫——用事實去否證假設,而不是用直覺去確認。這跟我在 [[sre-monitoring|SLI 看使用者體感]]、在 [[sql-explain|讀 EXPLAIN 而不是猜]]反覆講的是同一個信念:**讓事實說話。** 工程師最該訓練的,不是猜得準,是**忍住不猜、先去看**的紀律。
