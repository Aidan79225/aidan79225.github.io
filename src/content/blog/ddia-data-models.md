---
title: "資料模型:關聯式、文件、圖,你在選什麼"
date: 2026-07-12
category: tech
description: "選關聯式、文件還是圖,不是技術選型的小事——它決定你怎麼把現實映射成資料、怎麼想問題。這章給了一把最實用的尺:一對多用文件很自然,多對多還是關聯式/圖強。它也回答一個歷史問題:關聯式當年為什麼贏(把存取路徑交給 optimizer 的宣告式勝利),以及文件模型為什麼又回來了。"
tags:
  - distributed-systems
  - book-notes
  - data-modeling
series: "Designing Data-Intensive Applications 讀書筆記"
seriesOrder: 2
comments: true
draft: false
---
[[ddia-reliable-scalable|第一篇]]講了資料系統要追求什麼(可靠、可擴展、可維護)。這篇往下一層:**你要用什麼「資料模型」來裝資料?** 關聯式、文件、還是圖——這個選擇不是小事,它是你**把現實映射成資料**的底層抽象,決定了你怎麼建模、怎麼查、甚至怎麼想問題。

## 三種資料模型

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 216" role="img" aria-label="三種資料模型:關聯式用表加外鍵,以 SQL 查,多對多與 join 強;文件用巢狀的 JSON,一對多很自然、資料局部性好、讀一次拿整份;圖用節點加邊,適合高度連結的資料,關係本身是主角。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="193" y1="16" x2="193" y2="180" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="387" y1="16" x2="387" y2="180" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="97" y="26" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">關聯式 Relational</text>
    <rect x="36" y="42" width="58" height="40" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><line x1="36" y1="53" x2="94" y2="53" stroke="#4f6df5" stroke-width="0.8"/><line x1="36" y1="64" x2="94" y2="64" stroke="#3a4154" stroke-width="0.6"/><line x1="36" y1="73" x2="94" y2="73" stroke="#3a4154" stroke-width="0.6"/><text x="65" y="51" fill="#9aa4b2" font-size="6.5" text-anchor="middle">users</text>
    <rect x="108" y="60" width="58" height="40" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><line x1="108" y1="71" x2="166" y2="71" stroke="#4f6df5" stroke-width="0.8"/><line x1="108" y1="82" x2="166" y2="82" stroke="#3a4154" stroke-width="0.6"/><text x="137" y="69" fill="#9aa4b2" font-size="6.5" text-anchor="middle">orders</text>
    <line x1="94" y1="72" x2="108" y2="80" stroke="#54b890" stroke-width="1"/><text x="101" y="90" fill="#54b890" font-size="6" text-anchor="middle">FK</text>
    <text x="97" y="150" fill="#9aa4b2" font-size="8" text-anchor="middle">表 + 外鍵,SQL 查</text>
    <text x="97" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">多對多、join 強</text>
    <text x="290" y="26" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">文件 Document</text>
    <rect x="238" y="42" width="104" height="66" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.3"/>
    <rect x="248" y="50" width="84" height="12" rx="2" fill="#223528" stroke="#54b890" stroke-width="0.8"/><text x="290" y="59" fill="#9aa4b2" font-size="6.5" text-anchor="middle">姓名、email</text>
    <rect x="248" y="66" width="84" height="16" rx="2" fill="#1f2330" stroke="#3a4154" stroke-width="0.8"/><text x="290" y="77" fill="#9aa4b2" font-size="6.5" text-anchor="middle">經歷 [ … ](巢狀)</text>
    <rect x="248" y="86" width="84" height="16" rx="2" fill="#1f2330" stroke="#3a4154" stroke-width="0.8"/><text x="290" y="97" fill="#9aa4b2" font-size="6.5" text-anchor="middle">學歷 [ … ](巢狀)</text>
    <text x="290" y="150" fill="#9aa4b2" font-size="8" text-anchor="middle">巢狀 JSON,一對多自然</text>
    <text x="290" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">局部性好(讀一次拿整份)</text>
    <text x="483" y="26" fill="#9b6ff0" font-size="10" text-anchor="middle" font-weight="bold">圖 Graph</text>
    <circle cx="452" cy="58" r="12" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.3"/>
    <circle cx="516" cy="58" r="12" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.3"/>
    <circle cx="484" cy="102" r="12" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.3"/>
    <line x1="464" y1="58" x2="504" y2="58" stroke="#9b6ff0" stroke-width="1"/>
    <line x1="456" y1="69" x2="476" y2="92" stroke="#9b6ff0" stroke-width="1"/>
    <line x1="512" y1="69" x2="492" y2="92" stroke="#9b6ff0" stroke-width="1"/>
    <text x="483" y="150" fill="#9aa4b2" font-size="8" text-anchor="middle">節點 + 邊,高度連結</text>
    <text x="483" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">關係本身是主角</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">關聯式</b>把資料攤成表、用外鍵連;<b style="color:#54b890">文件</b>把相關資料巢狀塞進一份;<b style="color:#9b6ff0">圖</b>讓「關係」變成一等公民。三者不是誰取代誰,是各自擅長不同「形狀」的資料</figcaption>
</figure>

## 真正的分水嶺:一對多 vs 多對多

要在關聯式和文件之間選,最實用的一把尺,是問**資料的關係是「一對多」還是「多對多」**。DDIA 用履歷(LinkedIn profile)當例子講得很傳神:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="左邊一對多:一個人有多筆經歷與學歷,巢狀塞進同一份履歷文件,讀一次全拿到,文件模型很自然。右邊多對多:履歷 A 與履歷 B 都指向同一間公司 X,公司是被很多人共享的實體,文件模型只能存公司 id 再自己 join,或把公司資料複製進每份履歷造成重複,這是文件模型的弱點。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="dm2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e0733a"/></marker></defs>
    <line x1="290" y1="16" x2="290" y2="176" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="28" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">一對多 → 文件很自然</text>
    <rect x="70" y="42" width="160" height="104" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="150" y="58" fill="#e6e6e6" font-size="8.5" text-anchor="middle">履歷(一份文件)</text>
    <rect x="84" y="66" width="132" height="18" rx="3" fill="#1f2330" stroke="#3a4154" stroke-width="0.9"/><text x="150" y="78" fill="#9aa4b2" font-size="7.5" text-anchor="middle">經歷 1</text>
    <rect x="84" y="88" width="132" height="18" rx="3" fill="#1f2330" stroke="#3a4154" stroke-width="0.9"/><text x="150" y="100" fill="#9aa4b2" font-size="7.5" text-anchor="middle">經歷 2</text>
    <rect x="84" y="110" width="132" height="18" rx="3" fill="#1f2330" stroke="#3a4154" stroke-width="0.9"/><text x="150" y="122" fill="#9aa4b2" font-size="7.5" text-anchor="middle">學歷</text>
    <text x="150" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">一個人多筆經歷 → 巢狀在同一份,讀一次全拿 ✓</text>
    <text x="430" y="28" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">多對多 → 文件的痛</text>
    <rect x="308" y="44" width="86" height="34" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="351" y="65" fill="#e6e6e6" font-size="8" text-anchor="middle">履歷 A</text>
    <rect x="308" y="102" width="86" height="34" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="351" y="123" fill="#e6e6e6" font-size="8" text-anchor="middle">履歷 B</text>
    <rect x="452" y="72" width="96" height="38" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.4"/><text x="500" y="88" fill="#d6a45c" font-size="8" text-anchor="middle">公司 X</text><text x="500" y="100" fill="#9aa4b2" font-size="7" text-anchor="middle">共享實體</text>
    <line x1="394" y1="61" x2="450" y2="82" stroke="#e0733a" stroke-width="1.1" marker-end="url(#dm2)"/>
    <line x1="394" y1="119" x2="450" y2="100" stroke="#e0733a" stroke-width="1.1" marker-end="url(#dm2)"/>
    <text x="430" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">公司被很多人指向 → 存 id 自己 join,或複製到重複 ✗</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一個人有多筆經歷(一對多),巢狀進一份文件超自然;但「公司」是被很多履歷共享的實體(多對多),文件模型只能存 id 再自己 join、或複製到滿地重複——這正是關聯式/圖的主場</figcaption>
</figure>

順帶一個相關的區分:文件模型多半是 **schema-on-read**(資料結構在讀取時才解釋,寫入很彈性),關聯式是 **schema-on-write**(寫入時就檢查結構,像靜態型別)。前者改結構方便、後者保證一致——這又是一個「彈性 vs 保證」的取捨,沒有絕對好壞,看你的資料多常變、多需要一致性。

## 為什麼關聯式當年會贏,文件又為何回來

這章還藏了一段很有意思的歷史。1970 年代,關聯式模型打敗了當時的**網狀/階層模型**,而關鍵不是效能,是**宣告式**:網狀模型要你在程式裡**寫死「怎麼一步步走訪到資料」**(存取路徑),換個查詢就得改一堆程式;關聯式讓你只說**「要什麼」**,把「怎麼走」交給 query optimizer。這聽起來是不是很熟?正是我在 [[sql-execution-order|SQL 系列]]反覆講的宣告式——**把「怎麼做」交給比你更懂資料分佈的引擎。**

而文件模型某種程度是**階層模型的復活**(巢狀、局部性好、讀一次拿整份),它回來是因為現代很多資料真的就是「一份自包含的文件」(貼文、訂單、事件)、加上 schema 彈性的吸引力。但注意:**它復活的是「階層/巢狀」這個結構,不是推翻了關聯式的宣告式勝利**——多對多這件事，關聯式和圖依然更強。

## 反思

### 選資料模型,是選「你想怎麼想問題」

我以前把「用什麼資料庫」當成技術選型的細節,後來才體會這是更根本的決定:**它框定了你怎麼把現實映射成資料。** 同一個業務,用表想、用文件想、用圖想,你的腦袋會走完全不同的路。所以我現在的順序是——先看資料的**形狀**:它是樹狀的(一對多,自然文件邊界)?網狀的(多對多,實體互相共享)?還是關係本身就是主角(社交、推薦、路網)?**先認出形狀,再選模型**,而不是反過來為了用某個潮的 DB 硬把資料塞進去。

### 一對多 vs 多對多,是我判斷「要不要用文件型 DB」的第一道題

這把尺太好用了。要不要上 MongoDB 這類文件庫,我第一個問的就是它:資料有沒有**自然的文件邊界**、關係是不是**一對多**(訂單+明細、貼文+留言、一個人+多筆經歷)→ 文件很爽,讀寫都在一份裡、局部性好。可是一旦出現**多對多的共享實體**(標籤、作者、公司、商品),文件模型就開始痛——不是把實體資料複製到每份文件(重複、難更新),就是存 id 然後在應用層自己 [[sql-joins|join]](把資料庫該做的事搬回程式)。**看到多對多,我就會很認真考慮關聯式。**

### 關聯式的勝利,是「宣告式」的勝利——這件事沒被推翻

DDIA 這段歷史讓我更確定一個信念:資料工具幾十年的大方向,是**不斷把「怎麼做」從人手上拿走、交給引擎**。關聯式打敗網狀模型靠這個(你說要什麼、optimizer 決定怎麼取)、SQL 的 [[sql-explain|EXPLAIN]] 是這個、Spark 的 Catalyst 也是這個。文件模型帶回了巢狀與彈性,是很好的補充,但它沒有、也不該推翻那個宣告式的內核。所以我看任何新的資料模型或查詢語言,都會先問一句:**它是讓我更專注在「意圖」,還是又把我拉回去管「步驟」?** 前者才是站在歷史正確的一邊。
