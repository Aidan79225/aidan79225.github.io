---
title: "三個人的微服務:暫停開發之後"
date: 2026-08-02
category: tech
description: "某天,CTO 通知全部工程師:暫停開發。一個月後,團隊剩三個人。然後我們拆了微服務——不是為了架構之美,是為了活下去:新業務蓋新房、選標搬出去、老 monolith 原地降格;停機遷移、同一把 JWT secret、一台 VM 兩份 docker compose。拆的本質是解耦,不是分散。"
tags:
  - war-story
  - live-commerce
  - microservices
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 19
comments: true
draft: false
---
[[rezero-team|上一章]]結尾說,這個團隊的終點比所有人想的都近。這章從那一天講起。

## 那一天,和一個月後

某天,CTO 通知全部工程師:**暫停開發。**與第三方的合約要重新談;可能會走向資遣;他會去幫大家爭取多一點資源。

政治的細節留給終章,這章只需要兩個事實。第一:**一個月後,團隊剩下三個人**——我、一個前端、CTO。第二:**商城還開著,但已經沒有客人了**,登入的主要是公司內部的人。前面十八章寫的那個系統——尖峰、FSM、跟播的四個視窗——還在跑,只是安靜下來了。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 208" role="img" aria-label="從全盛到拆分的時間線,五個節點。全盛:七人團隊、每天上線。那一天:CTO 宣布暫停開發,合約重談、可能資遣。一個月後:剩三個人,作者、一個前端、CTO。新方向:做接外部訂單的採購系統。拆:選標搬出、會員 service 升格、monolith 原地降格。底部標注:商城還開著,但已經沒有客人。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="40" y1="110" x2="548" y2="110" stroke="#3a4154" stroke-width="1.4"/>
    <path d="M 544 106 L 550 110 L 544 114 Z" fill="#3a4154"/>
    <circle cx="72" cy="110" r="4" fill="#54b890"/>
    <text x="72" y="76" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">全盛</text>
    <text x="72" y="92" fill="#9aa4b2" font-size="6.2" text-anchor="middle">七人・每天上線</text>
    <circle cx="188" cy="110" r="4" fill="#e05a7d"/>
    <text x="188" y="62" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">那一天</text>
    <text x="188" y="78" fill="#e6e6e6" font-size="6.2" text-anchor="middle">CTO:暫停開發</text>
    <text x="188" y="92" fill="#9aa4b2" font-size="6.2" text-anchor="middle">合約重談・可能資遣</text>
    <circle cx="304" cy="110" r="4" fill="#d6a45c"/>
    <text x="304" y="140" fill="#d6a45c" font-size="7" text-anchor="middle" font-weight="bold">一個月後</text>
    <text x="304" y="156" fill="#e6e6e6" font-size="6.2" text-anchor="middle">剩三個人</text>
    <text x="304" y="170" fill="#9aa4b2" font-size="6.2" text-anchor="middle">我・一個前端・CTO</text>
    <circle cx="420" cy="110" r="4" fill="#4f6df5"/>
    <text x="420" y="76" fill="#4f6df5" font-size="7" text-anchor="middle" font-weight="bold">新方向</text>
    <text x="420" y="92" fill="#9aa4b2" font-size="6.2" text-anchor="middle">接外部訂單的採購系統</text>
    <circle cx="516" cy="110" r="4" fill="#9b6ff0"/>
    <text x="516" y="140" fill="#9b6ff0" font-size="7" text-anchor="middle" font-weight="bold">拆</text>
    <text x="516" y="156" fill="#9aa4b2" font-size="6.2" text-anchor="middle">選標搬出・monolith 降格</text>
    <text x="290" y="196" fill="#9aa4b2" font-size="6.8" text-anchor="middle">背景音:商城還開著,但已經沒有客人</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">微服務不是在全盛期拆的——是在只剩三個人的時候拆的。動機從這裡開始就不是教科書那套。</figcaption>
</figure>

要先把這個背景釘死,因為它顛覆了「為什麼拆微服務」的一切教科書答案。我們不是因為流量大到要獨立擴縮、不是因為團隊多到要解耦協作——**恰恰相反:人少到只剩三個,拆是為了讓三個人養得動接下來的日子**。

## 新的活路:採購

公司的新方向,是做**採購系統**——但這次的訂單,不是自己家的。

原本的採購為什麼好做?因為訂單從我們自己的系統來,[[rezero-fulfillment|#8]] 講過那條路:資料格式自己定、時序自己控。新局面是:**訂單來自第三方公司的軟體**,對方匯出、我們匯入,格式是人家的、節奏也是人家的——要設計一套能跟外部系統相處的方式。

實際的介面樸素到可愛:**人工上傳 Excel**。對方從他們的軟體匯出訂單,檔案傳過來,我們的系統吃進去;會**多次匯出、多次匯入**。撐住這個流程的是一個關鍵約定:**對方保證每筆匯出的訂單有唯一 key——我們直接拿它當冪等條件**。重複匯入?upsert 掉,無感。這是冪等鍵在這個系統的第三次登場:[[rezero-comment-order|留言去重]]用 source+message id、[[rezero-payment|金流]]靠事實表天生冪等、現在外部訂單靠對方的唯一 key——而它買到的東西,用當年的一句話總結最傳神:**「我們不管他多久會匯一次。」**冪等把頻率變成了別人的自由,連協調會議都省了。

有了訂單,就知道需求量;接下來怎麼採購,是這個新系統自己的業務。而它需要的東西——商品、使用者、權限——有些正躺在那個安靜的 monolith 裡。**於是,拆的理由出現了。**

## 拆的實況:蓋新房、搬家、降格

教科書的微服務拆分有標準劇本,叫 **strangler fig(絞殺榕)**:在 monolith 前面立一個 facade,一次抽一個 bounded context 出去做成新 service,資料靠雙寫、CDC、灰度切流在**不停機**的前提下搬家,重複到 monolith 被絞殺殆盡——刪掉,慶祝。這套華麗工具箱建立在兩個隱含前提上:**流量不能停,以及 monolith 終須死。**我們的處境,兩個前提剛好都不成立——所以實際做的,是三個完全不同的動作:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 300" role="img" aria-label="拆分後的架構圖。一台 VM 裡有兩個 docker compose 群組。舊 compose:電商服務,原 monolith 原地降格,配自己的資料庫,標注還開著、內部人在用。新 compose:採購服務全新打造配新資料庫,選標服務從 monolith 搬出配自己的資料庫,會員服務管認證與權限配自己的資料庫。外部第三方軟體以人工上傳 Excel 進採購,唯一 key 當冪等條件。服務間以 REST 溝通,JWT 認證且 secret key 同一把。底部:各自獨立 DB、一台 VM 兩份 compose——拆的是耦合,不是機器。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="16" y="30" width="548" height="230" rx="10" fill="#1f2330" stroke="#3a4154" stroke-width="1.3"/>
    <text x="552" y="46" fill="#9aa4b2" font-size="7" text-anchor="end">同一台 VM</text>
    <rect x="32" y="52" width="180" height="192" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="6 4"/>
    <text x="122" y="70" fill="#9aa4b2" font-size="6.6" text-anchor="middle">docker compose(舊)</text>
    <rect x="48" y="82" width="148" height="52" rx="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="122" y="100" fill="#d6a45c" font-size="7" text-anchor="middle" font-weight="bold">電商(原 monolith)</text>
    <text x="122" y="114" fill="#e6e6e6" font-size="6.2" text-anchor="middle">原地降格成一個 service</text>
    <text x="122" y="126" fill="#9aa4b2" font-size="6" text-anchor="middle">還開著・內部人在用</text>
    <rect x="48" y="146" width="148" height="26" rx="5" fill="#262b3a" stroke="#9b6ff0" stroke-width="1"/>
    <text x="122" y="163" fill="#9aa4b2" font-size="6.2" text-anchor="middle">商城 DB</text>
    <rect x="228" y="52" width="320" height="192" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="6 4"/>
    <text x="388" y="70" fill="#9aa4b2" font-size="6.6" text-anchor="middle">docker compose(新)</text>
    <rect x="244" y="82" width="140" height="46" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="314" y="100" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">採購(全新)</text>
    <text x="314" y="114" fill="#e6e6e6" font-size="6.2" text-anchor="middle">吃外部訂單・算需求量</text>
    <rect x="244" y="136" width="140" height="24" rx="5" fill="#262b3a" stroke="#9b6ff0" stroke-width="1"/>
    <text x="314" y="152" fill="#9aa4b2" font-size="6.2" text-anchor="middle">採購 DB(新開)</text>
    <rect x="396" y="82" width="140" height="46" rx="6" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="466" y="100" fill="#4f6df5" font-size="7" text-anchor="middle" font-weight="bold">選標(搬出)</text>
    <text x="466" y="114" fill="#e6e6e6" font-size="6.2" text-anchor="middle">停機・匯出匯入</text>
    <rect x="396" y="136" width="140" height="24" rx="5" fill="#262b3a" stroke="#9b6ff0" stroke-width="1"/>
    <text x="466" y="152" fill="#9aa4b2" font-size="6.2" text-anchor="middle">選標 DB(另開)</text>
    <rect x="300" y="176" width="200" height="46" rx="6" fill="#1f2330" stroke="#e05a7d" stroke-width="1.2"/>
    <text x="400" y="194" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">會員 service(認證+權限)</text>
    <text x="400" y="208" fill="#e6e6e6" font-size="6.2" text-anchor="middle">採購自建 → 選標接入而升格共用</text>
    <line x1="314" y1="160" x2="360" y2="176" stroke="#3a4154" stroke-width="1"/>
    <line x1="466" y1="160" x2="440" y2="176" stroke="#3a4154" stroke-width="1"/>
    <text x="290" y="238" fill="#9aa4b2" font-size="6.4" text-anchor="middle">服務間 REST・JWT 認證(secret key 同一把)</text>
    <rect x="16" y="270" width="230" height="24" rx="5" fill="#262b3a" stroke="#e0733a" stroke-width="1.1"/>
    <text x="131" y="286" fill="#e0733a" font-size="6.4" text-anchor="middle">第三方軟體 → 人工上傳 Excel(唯一 key=冪等)</text>
    <line x1="246" y1="282" x2="300" y2="128 " stroke="#e0733a" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="420" y="286" fill="#e6e6e6" font-size="6.8" text-anchor="middle">各自獨立 DB——拆的是耦合,不是機器</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三個動作:採購蓋新房、選標搬家、電商原地降格——沒有一個是教科書的「切 monolith」。</figcaption>
</figure>

**採購:蓋新房。**全新的 service、全新的 DB,不揹舊系統一行程式。新業務的需求形狀(外部訂單、匯入冪等、採購流程)跟商城根本是兩回事,硬塞進 monolith 才是折磨。

**選標:搬家。**拆 monolith 的主要動作就是把選標搬出去、另開自己的 DB。為什麼是它?[[rezero-team|上一章]]的組織圖已經給了答案:選標從第一天起就是獨立小組(1 後端+1 前端+1 PM),商城和它之間的耦合本來就薄——**Conway's law 在拆遷這天從詛咒變成禮物:組織的牆砌在哪裡,系統的自然斷面就在哪裡,拆的時候順著撕就好**。

**電商:原地降格。**monolith 沒有被切碎——它整個原地不動,從「系統本身」降格成「三個 service 之一」。沒有客人的商城不值得任何遷移成本,它只要繼續活著服務內部的人。絞殺榕其實不必絞死宿主——Fowler 自己也說過,不再需要改的部分留在原地完全合法;我們只是把這個分支用到了極端:整棵宿主樹都不用改了,新樹在旁邊自己長。

遷移手段,教科書最不推薦的那種:**停機,匯出,匯入**。那整套讓遷移不中斷的手法,存在理由只有一個:車在行進中,引擎得邊跑邊換;而一個沒有客人的系統,**車已經停了,停機成本是零**。這是全系列最悲傷的紅利:政治的死亡,給了技術完全的自由。換作全盛期,選標搬家會是一場數月的戰役;在寂靜期,它是一個週末。

## 黏合層:REST、一把 secret、一個升格的會員 service

拆完的三個 service 怎麼相處?原則一句話:**當作完全獨立的系統運作**。溝通用 REST——不是事件、不是共享 DB,呼叫就是呼叫,[[ddia-encoding|契約]]就是 API 的形狀。

認證用 JWT,而這裡有個三人團隊風格的決定:**secret key,大家用同一把。**任何 service 都能自己驗 token,不用每次回會員 service 問——零額外基礎設施,對三個人是完美的省。代價也要誠實記帳:一把 secret 洩漏等於全體淪陷、無法對單一 service 撤銷信任。這筆帳在「三個 service 全在同一台 VM、同一群人維護」的現實裡,風險本來就合在一起,分開 secret 買不到多少隔離——**知情地冒的險,和無知地冒的險,是兩種工程**。

會員 service 的誕生過程,比它的功能更值得寫。它不是架構圖上先畫好的「共用認證中心」——**新採購一開始做了自己的會員 service**,就是自家的登入和權限;後來選標搬出來,需要認證,就改程式把選標**接上同一個 service**,它才「升格」成共用的。共用服務的正確誕生時機,不是架構師預言的那天,**是第二個客戶出現的那天**——在那之前它只是某個系統的登入模組,在那之後它才配叫基礎設施。這是 rule of two 的實戰版:被兩個真實使用者拉出來的抽象,才是真的抽象。

最後是 infra 的收尾,也是這章我最喜歡的一個事實:拆完的三個 service 加會員 service,**還是跑在同一台 VM 上——只是變成了不同的 docker compose file**。沒有 k8s、沒有 service mesh、沒有多機房。如果你覺得「這樣也算微服務?」,那正是這章想留下的觀點:**微服務的邊界是程式碼、資料庫和部署單元的邊界,不是機器的邊界**。independent deploy、independent schema、independent failure domain——這些拆的本質利益,兩份 compose file 就全數兌現;把它們散到十台機器上,買的是規模,不是解耦。**拆的本質是解耦,不是分散。**

## 重來

這章的重來清單,出奇地短——因為在「三個人、零流量、活下去」的座標系裡,幾乎每個決定我今天都會重做一遍:蓋新房、搬選標、降格 monolith 是三人做得完的唯一拆法;停機遷移在零流量下是最優解;甚至同一把 secret,我大概還是會用,只是會在某個 README 裡寫下「我們知道這代表什麼」。

真正的重來藏在更早的地方:選標搬家之所以是一個週末而不是一場戰役,是因為它跟商城之間的耦合薄;而耦合薄,是[[rezero-team|組織分工]]、[[rezero-permission|權限邊界]]、[[rezero-reconciliation|事實與派生的紀律]]這些前面章節的決定累積出來的。**微服務拆得動不動,在拆之前很多年就決定了**——這章沒有新的重來,它是前面十八章所有重來的驗收。

## 反思

**拆的本質是解耦,不是分散。**一台 VM、兩份 compose file 的「微服務」,比十個 k8s cluster 上的分散式 monolith 更接近微服務的本意。先問「誰跟誰要能獨立演進」,再問「要不要分開跑」——多數團隊把這兩題的順序做反了,買了分散的成本,沒拿到解耦的利益。

**Conway's law 是可以拿來用的,不只是拿來警惕的。**教科書引用它時總是負面的:小心,你的架構會長成你的組織。反過來讀它就是槓桿:**想知道系統的自然斷面在哪,看組織的牆在哪**。選標小組獨立運作了兩年,等於免費幫未來的拆分畫了兩年的邊界——上一章那面「我不熟選標」的知識之牆,在這章變成了最乾淨的服務邊界。

**架構決策的正確性,是情境的函數。**停機遷移、同一把 secret、人工上傳 Excel——教科書會給這三個決定全部亮紅燈;在「三個人、沒有客人、公司在等一個新方向」的座標系裡,它們全是滿分解。工程師的成熟不是背下所有最佳實踐,**是知道自己此刻在哪個座標系裡做決定**——以及,座標系變了的時候,敢把昨天的紅燈變成今天的綠燈。

拆完的系統安靜地跑著,三個人養得動,新業務有了自己的家。故事的現實線,正在走向終點——但在那之前,下一章先岔出去一次:**如果這個平台沒有死,而是繼續長大成 SaaS,會發生什麼?**一次平行世界的思想實驗。
