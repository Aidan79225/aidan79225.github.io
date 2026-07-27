---
title: "出貨前處理:賣的是承諾,出的是現實"
date: 2026-07-27
category: tech
description: "錢與貨的第二章:兩本庫存(銷售承諾與實體現實)天生會歪,配貨系統是它們之間的橋——配貨紀錄可以事件重建、機制歸系統政策歸人;以及重來版的三步:履約單位下放到 order item、shipment 成為一級實體、整段拆成可替換的貨運系統。"
tags:
  - war-story
  - live-commerce
  - fulfillment
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 8
comments: true
draft: false
---
[[rezero-payment|錢收完了]],該出貨了。這章是系統與實體世界的交界——留言、庫存、金流都活在資料庫裡,但貨是真的紙箱、真的倉庫、真的宅配司機。也因此,這是全系列「系統邊界」劃得最有意識的一章:哪些歸系統管、哪些交給人,當年的答案比我記憶中更聰明。

## 兩本庫存:賣的是承諾,到的是現實

先把時序擺正:主播直播時跟廠商談好「有多少貨」——這個數字進了[[rezero-inventory|庫存章]]的上限,系統拿它守住不能超賣。但**下播之後,採購流程才真正開始**;採購本身不在系統內,系統看到的下一個事實,是營運把實際到貨填成**入庫單**——一筆一筆 append 的紀錄,庫存的每次調整都有 log 可看。

所以這個系統其實有**兩本庫存**,庫存表上就是分開的兩個欄位、各司其職:

- **銷售庫存(承諾)**:主播喊的量。它的工作是在下單瞬間守住「賣出 ≤ 上限」,活在毫秒級的交易裡。
- **實體庫存(現實)**:入庫單累積的量。它的工作是誠實記錄倉庫裡真的有什麼,活在天級的物流節奏裡。

兩本帳**天生會歪**——談好 100 件、廠商到貨 80 件(短交),或貨損、或規格不符。這不是 bug,是代購這門生意的常態。問題只有一個:歪了之後,誰的單有貨、誰的單要等?

## 配貨:把承諾對到現實

當年的答案是一套**配貨系統**:把實際到的庫存,分配給承諾過的訂單。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 306" role="img" aria-label="兩本庫存與配貨橋。左上是銷售庫存,代表承諾:上限與賣出計數,在下單瞬間守住不能超賣。右上是實體庫存,代表現實:營運填入庫單,append 紀錄、調整可見。兩者天生會歪,例如談好一百件實際到八十件。中間是配貨系統:把實際庫存分配給訂單,每次分配寫入配貨紀錄表,庫存變動可以用全部事件重建;分配的方式由營運決定,機制歸系統、政策歸人。往下的規則是 order 全部配齊才產生出貨單,order items 一起出。最下方兩個出口:7-11 超商取貨走 API、客人網頁選店號;宅配由人工匯出 CSV 交給貨運。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rff" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker></defs>
    <rect x="28" y="24" width="230" height="56" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="143" y="44" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">銷售庫存(承諾)</text>
    <text x="143" y="59" fill="#9aa4b2" font-size="6.8" text-anchor="middle">上限・賣出計數——下單瞬間守超賣</text>
    <text x="143" y="72" fill="#9aa4b2" font-size="6.8" text-anchor="middle">活在毫秒級的交易裡</text>
    <rect x="322" y="24" width="230" height="56" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.4"/>
    <text x="437" y="44" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">實體庫存(現實)</text>
    <text x="437" y="59" fill="#9aa4b2" font-size="6.8" text-anchor="middle">入庫單 append——營運登記實際到貨</text>
    <text x="437" y="72" fill="#9aa4b2" font-size="6.8" text-anchor="middle">活在天級的物流節奏裡</text>
    <text x="290" y="100" fill="#e05a7d" font-size="7.4" text-anchor="middle">兩本帳天生會歪:談好 100 件,到貨 80 件</text>
    <line x1="143" y1="80" x2="235" y2="128" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rff)"/>
    <line x1="437" y1="80" x2="345" y2="128" stroke="#54b890" stroke-width="1.2" marker-end="url(#rff)"/>
    <rect x="165" y="132" width="250" height="62" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.6"/>
    <text x="290" y="152" fill="#d6a45c" font-size="9.2" text-anchor="middle" font-weight="bold">配貨系統</text>
    <text x="290" y="167" fill="#9aa4b2" font-size="6.8" text-anchor="middle">實際庫存 → 分給訂單;怎麼分,營運決定</text>
    <text x="290" y="182" fill="#e6e6e6" font-size="6.8" text-anchor="middle" font-weight="bold">配貨紀錄表 append——庫存變動可用全部事件重建</text>
    <line x1="290" y1="194" x2="290" y2="212" stroke="#d6a45c" stroke-width="1.3" marker-end="url(#rff)"/>
    <rect x="130" y="216" width="320" height="26" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="290" y="233" fill="#e6e6e6" font-size="7.6" text-anchor="middle">order「全部」配齊 → 產生出貨單(items 一起出,不拆件)</text>
    <line x1="220" y1="242" x2="185" y2="260" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rff)"/>
    <line x1="360" y1="242" x2="395" y2="260" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rff)"/>
    <rect x="90" y="264" width="190" height="32" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="185" y="278" fill="#e6e6e6" font-size="7.2" text-anchor="middle">7-11 超商取貨</text>
    <text x="185" y="290" fill="#9aa4b2" font-size="6.2" text-anchor="middle">API 介接・客人網頁選店號</text>
    <rect x="300" y="264" width="190" height="32" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="395" y="278" fill="#e6e6e6" font-size="7.2" text-anchor="middle">宅配(自配貨運)</text>
    <text x="395" y="290" fill="#9aa4b2" font-size="6.2" text-anchor="middle">人工匯出 CSV 交給貨運</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">配貨是兩本庫存之間的橋:承諾在左、現實在右,每一次分配都留下事件。</figcaption>
</figure>

配貨系統有三個設計,每個都值得停一下:

- **配貨紀錄表是 append 的,而且當年就明確知道:庫存變動可以用全部事件重建。** 前幾章我說這個團隊「無意識地長成 event sourcing」——這章要修正:至少在配貨這裡,是**有意識的**。入庫是事件、配貨是事件,[[ddia-streaming|事實的全集]]隨時可以重放出當下狀態,帳歪了有地方對。
- **機制歸系統,政策歸人。** 配貨系統提供的是「怎麼分都行」的機制,加上每次分配的紀錄;**至於怎麼分——短交時犧牲誰、誰先出——是營運的商業判斷**。系統不越權替人做政策,但把每個政策決定都記成可追溯的事實。這跟[[rezero-cart-order|狀態機被拔掉]]、[[rezero-payment|退款走銀行]]是同一個哲學的第三次落地。
- **規則簡單到不會錯:order 全部配齊,才產生出貨單,items 一起出。** 不拆件,所以沒有「拆到一半」的中間態;出貨時機大部分由營運依配貨情況決定,客人急了找客服——又是機制與政策的分工。

## 系統的邊界:管到出貨單為止

這章最值得學的,其實是**系統選擇不做什麼**:實際上有很多個倉,系統不管;揀貨怎麼撿、有沒有條碼、短少怎麼辦,系統都不管。系統的責任在「訂單變出貨單」畫上句點,之後——7-11 走 API(客人在網頁選店號)、宅配靠**人工匯出 CSV** 交給貨運——剩下是營運的世界。運費和條件則設定在檔期層,跟優惠券、結算同一個範疇,檔期第三次證明自己是這個系統天然的設定邊界。

這條線劃的位置有邏輯:它恰好是**資訊流和實體流的分界**。資訊錯了會超賣、會收錯錢——違約成本高、人眼看不見,系統必須守;實體錯了(撿錯貨、少一箱)現場看得到、當場能修——人比系統更適合守。六個工程師的複雜度預算,再一次花在刀口上。

## 重來:三步把履約拆出去

當年的形狀能跑,但有一個結構性的彆扭:[[rezero-cart-order|上一章]]說 order 按檔期切、是履約單位——於是**payment 已經跨檔期了,出貨卻還被檔期綁著**。客人買了三個檔期的貨,想一箱寄來?結構不順。重來版分三步,一步比一步深:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 260" role="img" aria-label="當年與重來的履約結構對比。左側當年:order 以檔期為履約單位,全部配齊才產生出貨單,跨檔期合併困難、部分到貨只能等。右側重來三步:第一步履約單位下放到 order item,配齊哪個就能動哪個;第二步 shipment 成為一級實體,以收件人加地址聚合當下已配齊的 items,聚合那一刻定格地址;第三步履約整段獨立成貨運系統,電商系統的終點是匯出可履約訂單,貨運系統管入庫、配貨、出貨與物流,出貨與退回以事件回流電商——貨運系統從此可獨立演進,甚至整組替換成第三方物流。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rfr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker><marker id="rfm" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="200" y1="14" x2="200" y2="240" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="100" y="28" fill="#9aa4b2" font-size="8.8" text-anchor="middle" font-weight="bold">當年:order 即履約單位</text>
    <rect x="30" y="44" width="140" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="100" y="60" fill="#e6e6e6" font-size="7.4" text-anchor="middle">order(檔期)</text>
    <text x="100" y="74" fill="#9aa4b2" font-size="6.4" text-anchor="middle">全配齊才出、不拆件</text>
    <line x1="100" y1="84" x2="100" y2="102" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rfm)"/>
    <rect x="30" y="106" width="140" height="30" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="100" y="125" fill="#e6e6e6" font-size="7.2" text-anchor="middle">出貨單</text>
    <text x="100" y="168" fill="#e05a7d" font-size="6.8" text-anchor="middle">跨檔期合併難</text>
    <text x="100" y="182" fill="#e05a7d" font-size="6.8" text-anchor="middle">部分到貨只能等</text>
    <text x="390" y="28" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">重來:三步拆出去</text>
    <rect x="222" y="44" width="150" height="34" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="297" y="58" fill="#e6e6e6" font-size="6.8" text-anchor="middle">① 履約單位 = order item</text>
    <text x="297" y="71" fill="#9aa4b2" font-size="6" text-anchor="middle">配齊哪個,哪個就能動</text>
    <rect x="392" y="44" width="166" height="34" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="475" y="58" fill="#54b890" font-size="6.8" text-anchor="middle" font-weight="bold">② shipment 一級實體</text>
    <text x="475" y="71" fill="#9aa4b2" font-size="6" text-anchor="middle">收件人+地址聚合・地址定格</text>
    <line x1="372" y1="61" x2="390" y2="61" stroke="#54b890" stroke-width="1.1" marker-end="url(#rfr)"/>
    <rect x="252" y="112" width="276" height="66" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="390" y="132" fill="#4f6df5" font-size="8.2" text-anchor="middle" font-weight="bold">③ 履約獨立成「貨運系統」</text>
    <text x="390" y="147" fill="#9aa4b2" font-size="6.6" text-anchor="middle">電商的終點=匯出可履約訂單</text>
    <text x="390" y="161" fill="#9aa4b2" font-size="6.6" text-anchor="middle">貨運管入庫・配貨・出貨・物流</text>
    <line x1="297" y1="78" x2="330" y2="110" stroke="#54b890" stroke-width="1" marker-end="url(#rfr)"/>
    <line x1="475" y1="78" x2="440" y2="110" stroke="#54b890" stroke-width="1" marker-end="url(#rfr)"/>
    <path d="M 252 158 Q 220 190 250 214" fill="none" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#rfm)"/>
    <text x="300" y="216" fill="#9aa4b2" font-size="6.4" text-anchor="start">出貨/退回以「事件」回流電商(狀態照樣派生)</text>
    <text x="390" y="240" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">介面切對了,連 3PL 都能整組替換——電商一行不動</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三步一步比一步深:item 級配貨 → shipment 聚合 → 貨運自成系統;每一步都讓「等貨齊」更像政策、更不像結構限制。</figcaption>
</figure>

1. **履約單位下放到 order item。** 配齊哪個 item,哪個就具備出貨資格——「等貨齊」從結構限制變成營運政策:想等齊再出、想到貨先出,都只是聚合時收不收這個 item 的決定。order 退回純帳務分組(檔期優惠、對帳照舊),會計完全不動——order item 本來就是定格金額的會計單位,履約下放後「履約-會計」反而同粒度了。
2. **shipment(出貨單)升為一級實體,以「收件人+地址」聚合。** 跨檔期合併出貨自然發生、部分到貨自然拆件,不需要任何特殊邏輯。代價有三,寫下來才誠實:運費政策要重定義(檔期層留規則、shipment 層做計算——包裹才是實際產生運費的東西);地址是聚合鍵,所以**聚合那一刻要定格地址**——承諾點原則第三次出現;客人的查詢單位從 order 變成 shipment,前台和客服的敘事要跟著改。
3. **履約整段獨立成「貨運系統」。** 電商系統的終點=**匯出可履約訂單**;貨運系統吃訂單,管入庫、配貨、出貨單、物流介接的全部,出貨與退回以事件回流電商——電商照老規矩事實落地、狀態派生。這一步聽起來激進,其實有兩個當年的伏筆撐著:**人工匯出 CSV 給貨運,就是這個介面的人力版雛形**——這個邊界已經靠人力跑了好幾年;而專案終局把 monolith 拆成電商、選標、採購三個服務,用的正是同一種邊界直覺,貨運完全有資格當第四個。真正的回報在最後:介面一旦是「訂單匯入」,貨運系統就是**可替換的消費者**——自己養、換 3PL 第三方倉配、或混用,電商一行不動。**好邊界的複利,是連「要不要自己做」都變成可以隨時反悔的決定。**

## 反思

### 系統的邊界,劃在你能負責的地方為止

當年不做倉儲管理、不做揀貨系統、出貨靠人工 CSV——年輕時我大概會把這些列成「技術債清單」。現在我認為它們是**自知**:系統守資訊流(錯了會超賣、會錯錢、人看不見),人守實體流(錯了看得見、修得快)。把系統硬伸進倉庫,要處理的是條碼設備、盤點差異、人員操作習慣——每一項都是新的複雜度來源,而它們換來的正確性,人力本來就守得住。**邊界不是能力的極限,是責任的極限**:劃在你能為錯誤負責的地方,而不是技術能延伸到的地方。

### 機制歸系統,政策歸人——這是第三次了

狀態機被主播拔掉、退款讓營運去銀行按、配貨「按他們想要的方式」——同一個哲學在這個系統落地三次,沒有一次是妥協,每一次都是正確的分工:**系統擅長記錄與守不變量,人擅長判斷與扛例外**。配貨系統最聰明的地方,是它不試圖演算法化「短交時犧牲誰」這種商業判斷,但把每個判斷都變成配貨紀錄表裡可追溯的事件——人自由,帳清楚。這比「全自動配貨引擎」誠實,也比「Excel 裡自己喬」可靠,它站在兩者中間的甜蜜點上。

### 最好的架構演進,是把已經存在的縫變成介面

「履約拆成貨運系統」聽起來像大重構,但仔細看:那個介面(一批可履約的訂單)當年就以人工 CSV 的形式存在,而且一直跑得穩——重來只是把這條人力跑出來的斷面**正式化**。這是我對架構演進最相信的一件事:**好邊界不是設計出來的,是觀察出來的。** 系統裡那些「long-lived 的人工流程」——每週固定匯出的報表、營運固定貼給誰的檔案——都是還沒被承認的介面。想知道系統該從哪裡拆,別開白板會議,去看人們已經在哪裡交接。
