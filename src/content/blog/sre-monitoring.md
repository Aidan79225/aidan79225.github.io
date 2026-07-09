---
title: "監控:四個黃金訊號"
date: 2026-07-10
category: tech
description: "監控不是『收集一堆數字』,是回答兩個問題:壞了嗎?快壞了嗎?但該量什麼?Google 把它精煉到只剩四個——延遲、流量、錯誤、飽和度。如果一個服務只能盯四個指標,就盯這四個。另外一個關鍵:別看平均,平均會把長尾藏起來,要看 p99。"
tags:
  - sre
  - monitoring
series: "Google SRE 讀書筆記"
seriesOrder: 4
comments: true
draft: false
---
[[sre-slo|上一篇]]說 SLI 是量到的可靠度數字——而那些數字,就來自監控。但監控最容易走歪的地方,是把它當成「收集越多數字越好」,結果儀表板上一百個圖,真出事時反而找不到重點。這篇講 Google 給的精煉答案:如果一個服務只能盯四個指標,盯哪四個——**四個黃金訊號**。

## 監控其實只要回答兩個問題

先把目的講清楚。監控不是為了好看的儀表板,是為了回答兩個問題:**「現在壞了嗎?」**(即時偵測)和**「快壞了嗎?」**(趨勢預警)。抓住這兩個問題,你就不會掉進「什麼都量、但什麼都看不出來」的陷阱。而能同時回答這兩題、又幾乎涵蓋所有使用者面向服務健康的,就是這四個訊號:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 262" role="img" aria-label="你的服務周圍四個黃金訊號:延遲 Latency 請求要多久才回、要分開成功與失敗;流量 Traffic 系統多忙 QPS;錯誤 Errors 多少請求失敗含 200 但內容錯;飽和度 Saturation 離極限多近、最能預警。前三個是使用者體感可當 SLI,第四個是還能撐多久的預警" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="290" y1="134" x2="134" y2="68" stroke="#3a4154" stroke-width="1.1"/>
    <line x1="290" y1="134" x2="446" y2="68" stroke="#3a4154" stroke-width="1.1"/>
    <line x1="290" y1="134" x2="134" y2="200" stroke="#3a4154" stroke-width="1.1"/>
    <line x1="290" y1="134" x2="446" y2="200" stroke="#3a4154" stroke-width="1.1"/>
    <rect x="240" y="112" width="100" height="44" rx="8" fill="#262b3a" stroke="#e6e6e6" stroke-width="1.5"/>
    <text x="290" y="139" fill="#e6e6e6" font-size="11" text-anchor="middle">你的服務</text>
    <rect x="28" y="40" width="212" height="56" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="40" y="60" fill="#4f6df5" font-size="10.5" text-anchor="start" font-weight="bold">① Latency 延遲</text>
    <text x="40" y="75" fill="#9aa4b2" font-size="8.5" text-anchor="start">請求要多久才回?</text>
    <text x="40" y="88" fill="#9aa4b2" font-size="8" text-anchor="start">分開看「成功」與「失敗」的延遲</text>
    <rect x="340" y="40" width="212" height="56" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="352" y="60" fill="#54b890" font-size="10.5" text-anchor="start" font-weight="bold">② Traffic 流量</text>
    <text x="352" y="75" fill="#9aa4b2" font-size="8.5" text-anchor="start">系統現在多忙?</text>
    <text x="352" y="88" fill="#9aa4b2" font-size="8" text-anchor="start">QPS / 每秒請求數</text>
    <rect x="28" y="172" width="212" height="56" rx="8" fill="#262b3a" stroke="#e0733a" stroke-width="1.5"/>
    <text x="40" y="192" fill="#e0733a" font-size="10.5" text-anchor="start" font-weight="bold">③ Errors 錯誤</text>
    <text x="40" y="207" fill="#9aa4b2" font-size="8.5" text-anchor="start">多少請求失敗了?</text>
    <text x="40" y="220" fill="#9aa4b2" font-size="8" text-anchor="start">失敗率(含「回 200 但內容是錯的」)</text>
    <rect x="340" y="172" width="212" height="56" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="352" y="192" fill="#d6a45c" font-size="10.5" text-anchor="start" font-weight="bold">④ Saturation 飽和度</text>
    <text x="352" y="207" fill="#9aa4b2" font-size="8.5" text-anchor="start">離極限還有多近?</text>
    <text x="352" y="220" fill="#9aa4b2" font-size="8" text-anchor="start">資源用了幾成 → 最能預警</text>
    <text x="290" y="252" fill="#9aa4b2" font-size="8.7" text-anchor="middle">前三個 = 使用者體感(可直接當 SLI);第四個「飽和度」= 還能撐多久的預警</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">四個黃金訊號。前三個(延遲、流量、錯誤)貼著使用者體感,可以直接當 SLI;第四個(飽和度)量「還剩多少餘裕」,是最能提前預警的一個</figcaption>
</figure>

四個各自的重點:

- **Latency 延遲**:請求要多久才回。有個陷阱——**一定要把成功和失敗的延遲分開看**。失敗請求可能很快(直接回 500)也可能很慢(卡到 timeout),混進成功請求裡算,平均會被嚴重誤導。
- **Traffic 流量**:系統現在多忙,通常是 QPS 或每秒交易數。它是理解另外三個的背景——延遲變高,是因為流量暴增還是系統出問題?
- **Errors 錯誤**:失敗請求的比例。要小心「隱性失敗」——回了 200、但內容是錯的;或「政策失敗」——回得太慢,對你就算失敗。
- **Saturation 飽和度**:系統有多滿、離極限多近(CPU、記憶體、連線池用了幾成)。它最難量,卻**最能預警**——因為它告訴你「還能撐多久」,而不是「已經倒了」。

## 別看平均,平均會騙你

第二個一定要建立的觀念:**看延遲(或任何分佈)時,別看平均,看分佈——尤其是 p99。** 平均最會騙人,因為它把長尾藏起來了:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 226" role="img" aria-label="延遲的分佈直方圖:大多數請求很快,形成左邊的高峰,右邊拖著一條長尾。平均約 120ms 看起來還好,但 p99 落在長尾約 850ms,代表 1% 的使用者體驗極差,而平均完全看不出來。所以要看分佈與 p99,不要看平均" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <line x1="56" y1="182" x2="524" y2="182" stroke="#3a4154" stroke-width="1.3"/>
    <line x1="56" y1="182" x2="56" y2="34" stroke="#3a4154" stroke-width="1.3"/>
    <text x="300" y="202" fill="#9aa4b2" font-size="9" text-anchor="middle">延遲(ms) →</text>
    <text x="32" y="108" fill="#9aa4b2" font-size="9" text-anchor="middle" transform="rotate(-90 32 108)">請求數 ↑</text>
    <rect x="64" y="142" width="30" height="40" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="102" y="72" width="30" height="110" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="140" y="52" width="30" height="130" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="178" y="82" width="30" height="100" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="216" y="112" width="30" height="70" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="254" y="134" width="30" height="48" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="292" y="150" width="30" height="32" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="330" y="160" width="30" height="22" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="368" y="166" width="30" height="16" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="406" y="170" width="30" height="12" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="444" y="173" width="30" height="9" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <rect x="482" y="175" width="30" height="7" fill="#26324a" stroke="#4f6df5" stroke-width="1"/>
    <line x1="200" y1="44" x2="200" y2="182" stroke="#9aa4b2" stroke-width="1.4" stroke-dasharray="4 3"/>
    <text x="200" y="38" fill="#9aa4b2" font-size="8.7" text-anchor="middle">平均 ≈120ms</text>
    <text x="200" y="28" fill="#9aa4b2" font-size="8" text-anchor="middle">(看起來還好)</text>
    <line x1="459" y1="44" x2="459" y2="182" stroke="#e0733a" stroke-width="1.6" stroke-dasharray="4 3"/>
    <text x="459" y="38" fill="#e0733a" font-size="8.7" text-anchor="middle">p99 ≈850ms</text>
    <text x="459" y="28" fill="#e0733a" font-size="8" text-anchor="middle">(這 1% 很痛)</text>
    <text x="300" y="220" fill="#9aa4b2" font-size="8.5" text-anchor="middle">平均把長尾藏起來:少數使用者體驗極差,平均完全看不出來 → 看分佈(p99),別看平均</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">大多數請求很快,拉低了平均;但長尾那 1%(p99)的使用者可能等了快一秒。平均報「120ms、很健康」,那群人卻在罵——這就是為什麼 SLI、SLO 幾乎都用 percentile,不用平均</figcaption>
</figure>

這也解釋了[[sre-slo|上一篇]]為什麼 SLI/SLO 幾乎都用 percentile(「99% 的請求 < 300ms」),而不是「平均 < 300ms」。**平均對你好看,p99 對使用者誠實。**

## 對「症狀」告警,黑箱 + 白箱一起用

最後兩個要點,順帶帶到下一篇。第一,**監控要盯「症狀」而不是「原因」**:使用者在乎的是「網頁打不開」(症狀),不是「某台 DB 的 CPU 高」(原因——它可能根本沒影響到任何人)。所以黃金訊號才好用,因為它們天生是症狀。第二,**黑箱與白箱要一起用**:黑箱監控從外面像使用者一樣打你的服務(「現在到底通不通」),白箱監控從裡面看內部指標(出事時幫你找「為什麼」)。黑箱抓症狀、白箱查原因——兩個配著用。至於「什麼時候該把人吵醒」,是下一篇告警的主題。

## 反思

### 「只能量四個」的紀律,比「什麼都量」有用

我看過的監控問題,九成不是「量得太少」,而是「量得太多、太雜」——幾百個圖表沒人真的看得懂,真出事時大家在儀表板海裡撈半天找不到重點。四個黃金訊號的價值,不在它列了哪四個,而在它**逼你聚焦**:先把這四個顧到位,再談其他。這跟我做任何事的習慣一樣——[[pain-before-power|先抓住最關鍵的那幾個]],而不是貪心地什麼都要。監控的成熟,是敢於只看少數幾個真正重要的訊號。

### 平均是最會騙人的統計

「別看平均、看 p99」這件事,我覺得遠不只適用於監控。平均的本質就是把差異抹平,而**真正的問題往往就藏在被抹平的那條尾巴裡**——延遲如此,成本、回應時間、甚至團隊負載都如此。少數極端值(那 1% 等了一秒的使用者、那幾個爆量的請求)才是會咬你的東西,平均卻讓它們隱形。所以我現在看任何指標,反射動作是問一句:「這是平均嗎?分佈長怎樣?尾巴呢?」——被平均安慰過太多次,就學乖了。

### 對症狀告警,而不是對原因

這個原則改變了我設計監控的方式。以前會忍不住對每個內部指標(CPU、記憶體、佇列長度)都設告警,結果半夜被一堆「其實沒影響使用者」的原因吵醒。後來想通:**該叫醒人的是症狀(使用者受影響了),原因是查問題時才需要的線索。** 把告警綁在症狀(黃金訊號、SLI)上,不但少了一堆假警報,也讓「什麼時候該緊張」跟「使用者痛不痛」對齊了。這正好是下一篇要展開的:告警,到底該在什麼條件下把人吵醒。
