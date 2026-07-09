---
title: "消除 Toil:把重複的維運當成待消滅的 bug"
date: 2026-07-10
category: tech
description: "Toil 不是『辛苦工作』的同義詞,而是一類有明確特徵、該被消滅的工作:手動、重複、可自動化、做完系統卻沒變更好、還會隨服務規模線性成長。它最可怕的地方是會自然膨脹到吃光你做工程的時間——所以 Google 設了一條 50% 的護欄。"
tags:
  - sre
  - reliability
series: "Google SRE 讀書筆記"
seriesOrder: 3
comments: true
draft: false
---
[[sre-intro|第一篇]]說 SRE 的內核是「維運可以被工程化」。這篇講的 **toil**,就是那個要被工程化掉的東西。很多人以為 toil 就是「辛苦的工作」,其實不是——它是**一類有明確特徵的工作**,而且如果你不主動砍它,它會自然膨脹到吃光你所有做工程的時間。

## 什麼是 toil(以及什麼不是)

Toil 指的是「跟跑生產服務有關、但具備下面這些特徵」的工作。符合越多,它就越是 toil:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 258" role="img" aria-label="判斷是不是 toil 的六個特徵:手動要人一步步動手、重複做過很多次還會再做、可自動化機器能做只是還沒寫、無長期價值做完系統沒變更好、隨規模線性成長服務變大它就變多、被動反應被觸發才做非主動規劃。符合越多越是 toil。開會規劃 email 是 overhead 不是 toil" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="280" y="26" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">是不是 toil?看這六個特徵</text>
    <rect x="56" y="40" width="448" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/>
    <text x="76" y="57" fill="#54b890" font-size="11" text-anchor="middle">✓</text><text x="94" y="57" fill="#e6e6e6" font-size="9.5" text-anchor="start">手動 —— 要人一步步動手做</text>
    <rect x="56" y="70" width="448" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/>
    <text x="76" y="87" fill="#54b890" font-size="11" text-anchor="middle">✓</text><text x="94" y="87" fill="#e6e6e6" font-size="9.5" text-anchor="start">重複 —— 做過很多次、之後還會再做</text>
    <rect x="56" y="100" width="448" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/>
    <text x="76" y="117" fill="#54b890" font-size="11" text-anchor="middle">✓</text><text x="94" y="117" fill="#e6e6e6" font-size="9.5" text-anchor="start">可自動化 —— 機器能做,只是還沒有人去寫</text>
    <rect x="56" y="130" width="448" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/>
    <text x="76" y="147" fill="#54b890" font-size="11" text-anchor="middle">✓</text><text x="94" y="147" fill="#e6e6e6" font-size="9.5" text-anchor="start">無長期價值 —— 做完,系統並沒有變得更好</text>
    <rect x="56" y="160" width="448" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/>
    <text x="76" y="177" fill="#54b890" font-size="11" text-anchor="middle">✓</text><text x="94" y="177" fill="#e6e6e6" font-size="9.5" text-anchor="start">隨規模線性成長 —— 服務變大,它就跟著變多</text>
    <rect x="56" y="190" width="448" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/>
    <text x="76" y="207" fill="#54b890" font-size="11" text-anchor="middle">✓</text><text x="94" y="207" fill="#e6e6e6" font-size="9.5" text-anchor="start">被動反應 —— 被觸發才做,不是主動規劃出來的</text>
    <text x="280" y="240" fill="#9aa4b2" font-size="8.7" text-anchor="middle">符合越多 → 越是 toil。注意:開會、規劃、寫文件是 overhead,不算 toil</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Toil 的六個特徵。它不是「累」,而是「做完什麼都沒留下」——手動、重複、系統沒因此變好。而開會、規劃、email 這些雖然也煩,是 overhead,不是 toil</figcaption>
</figure>

分清楚一件事很重要:**toil ≠ 所有討厭的工作。** 開會、寫文件、規劃、回 email 這些是 overhead,雖然也佔時間,但不是 toil。Toil 特指那種**手動、重複、機器本來就能做、做完系統卻沒變好**的操作——手動重啟服務、手動改設定、手動處理每一次一樣的告警。也不是說一點 toil 都不能有;少量 toil 可以接受,關鍵是**不能讓它膨脹**。

## 為什麼一定要砍:它會隨規模線性成長

Toil 最危險的特徵是「**隨服務規模線性成長**」。服務長大一倍,手動維運的量也大約長一倍。如果你放著不管,需要的人力就會跟著規模一路往上,直到把團隊淹沒:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 244" role="img" aria-label="橫軸服務規模、縱軸需要的人力。放著不管 toil 的紅線隨規模線性陡升,最後把團隊淹沒;投資自動化的綠線前期多花一點,之後人力與規模脫鉤、趨於平緩。SRE 的護欄是花在 toil 的時間少於 50%,另一半拿去做減少未來 toil 的工程" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <line x1="60" y1="196" x2="524" y2="196" stroke="#3a4154" stroke-width="1.4"/>
    <line x1="60" y1="196" x2="60" y2="34" stroke="#3a4154" stroke-width="1.4"/>
    <text x="300" y="216" fill="#9aa4b2" font-size="9" text-anchor="middle">服務規模 →</text>
    <text x="30" y="112" fill="#9aa4b2" font-size="9" text-anchor="middle" transform="rotate(-90 30 112)">需要的人力 ↑</text>
    <polyline points="66,182 500,54" fill="none" stroke="#e0733a" stroke-width="2.4"/>
    <polyline points="66,170 150,120 260,98 400,90 500,86" fill="none" stroke="#54b890" stroke-width="2.4"/>
    <text x="486" y="46" fill="#e0733a" font-size="9" text-anchor="end">放著不管:人力隨規模線性長 → 淹沒</text>
    <text x="486" y="102" fill="#54b890" font-size="9" text-anchor="end">投資自動化:人力與規模脫鉤</text>
    <text x="300" y="236" fill="#9aa4b2" font-size="8.7" text-anchor="middle">SRE 護欄:花在 toil 的時間 &lt; 50%,另一半必須拿去做「減少未來 toil」的工程</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">放著不管,toil 隨規模線性長、把團隊淹沒(紅);投資自動化前期多花一點,之後人力與規模脫鉤(綠)。這正是 SRE「用軟體工程做維運」的核心:讓人力不再跟著規模走</figcaption>
</figure>

更糟的是**惡性循環**:toil 越多 → 越沒空寫自動化 → toil 繼續累積 → 更沒空……因為 toil 總是「緊急」(告警在響、服務要重啟),而自動化總是「重要但不緊急」,永遠被救火排擠到明天。為了打斷這個循環,Google 設了一條有名的護欄:**SRE 花在 toil 的時間應該低於 50%**,另一半必須拿去做「能減少未來 toil」的工程。這條線是刻意的——不強制圈出工程時間,它一定會被 toil 吃光。

## 怎麼砍(但不是全砍)

砍 toil 的主要武器就是**自動化**:把重複的手動操作寫成程式、做成自助工具、讓系統自己修復。但有個重要的前提——**不是所有 toil 都值得自動化。** 自動化本身有成本,你得算一筆帳:**自動化的投資 vs 未來能省下的 toil × 發生頻率**。一年才做一次的操作,花兩週去自動化它,通常不划算;但每天要做、每次十分鐘的,自動化的投報率就極高。所以砍 toil 不是無腦全自動化,而是**挑投報率高的先下手**。

## 反思

### Toil 的本質不是「累」,是「沒有累積」

我以前會把「這工作好煩、好累」跟「這是 toil」畫上等號,後來發現重點根本不在累不累,而在**做完有沒有留下東西**。蓋一個新功能很累,但它有累積、系統變好了,那不是 toil;手動重啟服務第一百次同樣累,但系統一點沒變、下次還得再來,那就是 toil。這個區分讓我更清楚該保護什麼——**我要守住的是「有累積」的時間,砍掉的是「純消耗」的時間**。把人放在會累積的地方,把純消耗交給機器,這才是 SRE 說「工程化」的真正意思。

### 50% 上限是一條「刻意的護欄」,不是理想值

我最欣賞 50% 這條線的地方,是它承認了一個現實:**如果不硬性圈出工程時間,它一定會被救火吃光。** 因為 toil 永遠比較「緊急」,自動化永遠比較「重要但不緊急」,而緊急的事總是贏。50% 不是說「理想上花一半在 toil」,而是「上限」——一條逼你把重要不緊急的事保護起來的護欄。這跟我做任何長期投資的紀律一樣:**重要但不緊急的事,不主動圈時間保護,就永遠不會發生。**

### 別為了自動化而自動化

砍 toil 也要防走火入魔——不是所有 toil 都值得自動化。我看過有人花一個月自動化一個一季才跑一次、五分鐘就做完的流程,純粹因為「手動很不 SRE」。但那筆帳算下來根本虧。自動化是手段不是信仰,判準永遠是那筆 ROI:**投資 vs 省下的 toil × 頻率**。這又回到 [[pain-before-power|先確認痛點再上重武器]]——先看這個 toil 到底痛不痛、夠不夠頻繁,值得了再自動化。把力氣花在天天在痛的那幾件事上,比追求「零手動」的潔癖實在得多。
