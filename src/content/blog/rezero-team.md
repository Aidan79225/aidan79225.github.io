---
title: "六個工程師,跑出二十個人的速度"
date: 2026-08-01
category: tech
description: "前面十七章的系統,是誰做出來的?六個工程師、一個專職做 PM 的 CTO、一個我不熟的選標小組;一段失敗的外包、一套沒有估點與 demo 的流程、一種跟著架構走的測試形狀——以及快的真正來源:不是英雄主義,是摩擦低。"
tags:
  - war-story
  - live-commerce
  - engineering-management
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 18
comments: true
draft: false
---
橫切的仗打完了,最後這一批講人、講拆、講結局。開場先回答一個問題:前面十七章的系統——FSM、三層訂單、金流事實表、一台 VM 的帝國——**是誰做出來的?**

帳面答案:六個工程師。真實答案更狠一點:**商城這條線,是四個工程師。**

## 陣容:兩條線,七個人

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 250" role="img" aria-label="團隊組織圖。左邊商城線:backend lead 也就是作者、一位後端、兩位前端,加上專職做 PM 不寫程式的 CTO——四個工程師的工程輸出。右邊選標線:一位後端、一位前端、一位專屬 PM,獨立運作,作者標注不熟這條線。下方虛線框:初期單人後端時期曾有外包一到二人,後來不再外包。底部標注:全遠端團隊;拆分線等於組織線,是下一章微服務的伏筆。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="24" y="36" width="300" height="130" rx="8" fill="#1f2330" stroke="#9ccc65" stroke-width="1.3"/>
    <text x="174" y="56" fill="#9ccc65" font-size="8" text-anchor="middle" font-weight="bold">商城線</text>
    <rect x="40" y="68" width="128" height="26" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="104" y="85" fill="#e6e6e6" font-size="6.6" text-anchor="middle">我(backend lead)</text>
    <rect x="180" y="68" width="128" height="26" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="244" y="85" fill="#e6e6e6" font-size="6.6" text-anchor="middle">後端 ×1</text>
    <rect x="40" y="102" width="128" height="26" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="104" y="119" fill="#e6e6e6" font-size="6.6" text-anchor="middle">前端 ×2</text>
    <rect x="180" y="102" width="128" height="26" rx="5" fill="#262b3a" stroke="#d6a45c" stroke-width="1.1"/>
    <text x="244" y="114" fill="#d6a45c" font-size="6.4" text-anchor="middle">CTO:專職做 PM</text>
    <text x="244" y="124" fill="#9aa4b2" font-size="5.8" text-anchor="middle">商城期間不寫程式</text>
    <text x="174" y="152" fill="#9aa4b2" font-size="6.4" text-anchor="middle">工程輸出=4 個工程師</text>
    <rect x="352" y="36" width="204" height="130" rx="8" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.3"/>
    <text x="454" y="56" fill="#9b6ff0" font-size="8" text-anchor="middle" font-weight="bold">選標線(獨立)</text>
    <rect x="368" y="68" width="172" height="24" rx="5" fill="#262b3a" stroke="#9b6ff0" stroke-width="1"/>
    <text x="454" y="84" fill="#e6e6e6" font-size="6.6" text-anchor="middle">後端 ×1・前端 ×1</text>
    <rect x="368" y="100" width="172" height="24" rx="5" fill="#262b3a" stroke="#9b6ff0" stroke-width="1"/>
    <text x="454" y="116" fill="#e6e6e6" font-size="6.6" text-anchor="middle">專屬 PM ×1</text>
    <text x="454" y="152" fill="#9aa4b2" font-size="6.4" text-anchor="middle">老實說:我不熟這條線</text>
    <rect x="24" y="182" width="300" height="28" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1" stroke-dasharray="5 4"/>
    <text x="174" y="200" fill="#9aa4b2" font-size="6.4" text-anchor="middle">(初期)外包 1–2 人——單人後端時期的止血帶</text>
    <text x="290" y="238" fill="#e6e6e6" font-size="7" text-anchor="middle">全遠端・拆分線=組織線(下一章的伏筆)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">兩條產品線,兩個小組。後來微服務怎麼拆,這張圖已經先畫好了。</figcaption>
</figure>

先把誠實的部分講完:**選標系統我不熟。**它由一個後端、一個前端加一位專屬 PM 獨立運作,和商城幾乎是兩個世界——這也是為什麼整個系列寫了十七章,選標只出現過一次(被主播拔掉的[[rezero-cart-order|狀態機]],還是二手轉述)。戰爭故事只寫自己在場的仗,這條線我只能給它一張組織圖上的位置。

商城這邊,編制很有意思:**CTO 在商城期間不寫程式,專職做 PM 的事。**他是需求漏斗——業務、主播、營運的所有想要,先進他那裡翻譯一輪再變成 task。[[rezero-ops|#15]] 的半夜電話為什麼打給他?現在拼圖完整了:不只因為他職級最高,因為**他就是產品的單一窗口**,連胡亂許願都有明確的收件人。

所以「六個工程師跑出二十個人的速度」這句話,拆開來是:選標兩個工程師,商城四個——**四個工程師,做出前面十七章寫的一切**。

## 成長弧:從一個人,到有資格談流程

團隊不是第一天就長這樣。最早的後端,只有我一個。

單人期的人力缺口,用**外包**當止血帶——而這裡有一段值得完整交代的失敗。當時把**優惠券**包給一位外包工程師:模組看起來邊界清楚、規格寫得出來,是教科書上「適合外包」的樣子。兩個月後,他來說沒時間繼續做;我打開 PR 一看,品質很差——**最後直接放棄了整個 PR**,兩個月歸零。

事後看,錯在第一步:優惠券「看起來」獨立,「實際上」是全系統語意最重的地方之一——[[rezero-promotion|#11]] 寫過,它跟購物車、訂單、金流的金額欄位深度咬合,錢的正確性是會計性質。**功能上獨立,不等於語意上獨立;發包邊界要用語意耦合量,不是用功能邊界量。**後來其他正職到位,就再也沒有外包了。

招到第二個後端那天,我開始做 lead。小團隊的 lead 沒有「離開產線」這個選項——**維持高輸出**之外,多扛三個把關點:**task 的技術拆解**(工作的入口)、**review**(程式碼的出口)、**技術選型**(系統的邊界)。選型把關做得怎樣,有一張全系列都看得到的成績單:[[rezero-stack|#2]] 那張技術棧清單,五個 boring 元件,**兩年沒有膨脹過**——沒有人偷渡過新玩具進來。

## 流程:排序,不排期

速度的核心不在人(人也重要),在流程的形狀。我們跑的東西內部叫 **Adaptive Agile**,拆開來是這樣:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="開發流程圖。左側是 Notion 裡帶順序的 task 佇列,狀態有 pending、in progress、done、cancelled、blocked;工程師從佇列頂端拉 task。中間是每個 task 的五站流程:研究(把 task 寫完整、設計解決方案)、設計、開發、測試、review,最後 merge 即上線。右下標注:全遠端,每日 sync 三問——昨天做了什麼、今天要做什麼、什麼被卡住。底部:沒有估點、沒有 sprint、沒有 demo——排序不排期。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="24" y="32" width="150" height="150" rx="8" fill="#1f2330" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="99" y="52" fill="#d6a45c" font-size="7.2" text-anchor="middle" font-weight="bold">Notion 佇列(有序)</text>
    <rect x="38" y="62" width="122" height="18" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="99" y="74" fill="#e6e6e6" font-size="6" text-anchor="middle">task 1(最優先)</text>
    <rect x="38" y="84" width="122" height="18" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="99" y="96" fill="#e6e6e6" font-size="6" text-anchor="middle">task 2</text>
    <rect x="38" y="106" width="122" height="18" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="99" y="118" fill="#e6e6e6" font-size="6" text-anchor="middle">task 3⋯</text>
    <text x="99" y="142" fill="#9aa4b2" font-size="6" text-anchor="middle">pending / in progress / done</text>
    <text x="99" y="154" fill="#9aa4b2" font-size="6" text-anchor="middle">cancelled / blocked</text>
    <text x="99" y="172" fill="#9aa4b2" font-size="6.2" text-anchor="middle">優先序:CTO 排;工程師從頂端拉</text>
    <line x1="174" y1="100" x2="204" y2="100" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 200 96 L 206 100 L 200 104 Z" fill="#9aa4b2"/>
    <text x="189" y="92" fill="#9aa4b2" font-size="6" text-anchor="middle">pull</text>
    <rect x="206" y="40" width="88" height="30" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="250" y="53" fill="#54b890" font-size="6.6" text-anchor="middle" font-weight="bold">研究</text>
    <text x="250" y="64" fill="#9aa4b2" font-size="5.6" text-anchor="middle">實作者把 task 寫完整</text>
    <rect x="206" y="78" width="88" height="24" rx="5" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="250" y="94" fill="#e6e6e6" font-size="6.6" text-anchor="middle">設計</text>
    <rect x="206" y="110" width="88" height="24" rx="5" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="250" y="126" fill="#e6e6e6" font-size="6.6" text-anchor="middle">開發</text>
    <rect x="206" y="142" width="88" height="24" rx="5" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="250" y="158" fill="#e6e6e6" font-size="6.6" text-anchor="middle">測試</text>
    <rect x="206" y="174" width="88" height="24" rx="5" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="250" y="190" fill="#e6e6e6" font-size="6.6" text-anchor="middle">review</text>
    <line x1="294" y1="186" x2="330" y2="186" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 326 182 L 332 186 L 326 190 Z" fill="#9aa4b2"/>
    <rect x="332" y="172" width="110" height="28" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.3"/>
    <text x="387" y="190" fill="#54b890" font-size="6.8" text-anchor="middle" font-weight="bold">merge=上線</text>
    <rect x="332" y="40" width="224" height="98" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/>
    <text x="444" y="60" fill="#e6e6e6" font-size="6.8" text-anchor="middle" font-weight="bold">全遠端・每日 sync 三問</text>
    <text x="444" y="82" fill="#9aa4b2" font-size="6.4" text-anchor="middle">昨天做了什麼</text>
    <text x="444" y="100" fill="#9aa4b2" font-size="6.4" text-anchor="middle">今天要做什麼</text>
    <text x="444" y="118" fill="#9aa4b2" font-size="6.4" text-anchor="middle">什麼被卡住</text>
    <text x="290" y="234" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-weight="bold">沒有估點・沒有 sprint・沒有 demo——排序,不排期</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一條有序佇列、一套五站流程、一個 merge 即上線的閉環——每天 1x 個 feature 的速度,是這個形狀跑出來的。</figcaption>
</figure>

幾個設計值得放大:

**排序,不排期。**task 放 Notion、帶順序,工程師照順序拉。沒有估點、沒有 sprint 排程、沒有 demo。Scrum 那套儀式買的是「預測」——什麼時候完成、這個 sprint 承諾多少;我們不買預測,只維護一個排好序的佇列。**優先序集中(CTO 的漏斗排序),執行分散(工程師自主拉取)**——對一個四人團隊,預測的價值趨近於零,儀式的成本卻是實打實的,這筆帳算得很清楚。

**規格由實作者產出。**流程的第一站是「研究」:接到 task 的工程師自己把 task 寫完整、設計好解決方案,再進開發。不是 PM 寫好規格發包給工程師——**寫規格的人就是寫程式的人**,translation loss 為零,而 lead 的拆解與 review 就是這個自由度的配重。

**上線就是 merge。**[[rezero-stack|#2]] 那條 CI/CD 在這裡閉環:release 不是一個需要開會的事件,是 merge 的自然結果。每天 1x 個 feature 的節奏,一半是這個閉環給的。

**全遠端,每日 sync 三問**:昨天做了什麼、今天要做什麼、什麼被卡住。那個年代全遠端是稀有物種;能撐住,靠的是前面那些——有序佇列讓「做什麼」無歧義,寫完整的 task 讓知識落在文字上,三問讓阻塞浮出水面。

## 品質防線:測試形狀跟著架構走

速度要有煞車。我們的測試策略走過一次有意識的轉向,值得講:

一開始寫了很多 unit test——然後我發現**不對勁:mock 太多,測試變得失真**。這個系統的正確性重心在資料([[rezero-comment-order|DB-as-validator]]、[[rezero-payment|事實表]]、[[rezero-reconciliation|讀時派生]]),mock 掉 DB 的 unit test,等於把系統的語意 mock 掉了,綠燈綠得毫無說服力。教科書的測試金字塔是為「邏輯住在物件裡」的系統發明的;**我們的邏輯住在資料裡,測試重心就該搬過去**。

於是後來補了大量 **integration test:主要不 mock,直接驗 DB 寫入的資料**——把「這個操作之後,表裡應該長什麼樣」寫成斷言。最貴的 **e2e 只買兩條路:金流和發票**——錢跨出系統邊界的地方,[[rezero-payment|第三方]]的地形學再教一次:e2e 有時紅是第三方自己的問題,**但每次都要看清楚**,因為那盞紅燈可能不是測試壞了,是真實世界在說話。

review 的 gate 很簡單:unit 和 integration 一定要 pass。形式問題不進人腦——**ruff、mypy 把風格和型別機械化**,前端還加了 AI review;人只花在機器管不了的地方:語意。我自己 review 有個固定動作:**先看測試**。測試是規格的固化——研究階段寫的「這個 task 要做到什麼」,最後長成測試的斷言;先讀測試,等於先讀作者對正確性的理解,再看實作有沒有兌現它。

## 重來

流程本身,重來幾乎不改——它是我後來每個團隊都在複製的原型。真正要改的只有一件事,就是那段失敗的外包:**用自家流程管外包**。當年給外包的是「一個模組、兩個月、到時見」;重來會要求**每日 sync、研究/設計/開發/測試每個階段我都介入**,明確知道他的狀態——不要等兩個月才發現不對勁。說穿了就是把 [[rezero-ops|#15]] 的監控哲學套到人身上:每日 sync 是 heartbeat,階段 gate 是 pipeline,知道狀態是可觀測性。**外包便宜的是薪資,不是管理成本**;當年省下的管理,最後用兩個月的沉沒成本補繳。

還有一筆帳這章先掛著:這種速度也有代價。半夜許願、隔週上線的功能,三個月無人使用——那個故事,連同它教我的事,留給終章。

## 反思

**快是結構性的,不是英雄主義。**四個工程師每天出 feature,靠的不是加班,是摩擦低:儀式趨近零、merge 即上線、排序不排期、規格零轉譯。要複製這個團隊的速度,不要找四個超人,先把這四個摩擦拆掉——速度是流程形狀的函數,人是係數,形狀是指數。

**把關的本質,是讓別人敢快。**lead 的三個把關點——入口的拆解、出口的 review、邊界的選型——表面上是控制,實際上是解放:因為入口有人把方向、出口有人接品質、邊界有人擋玩具,中間那段每個人才能全速跑。煞車做得好,車才敢開快;把關做得好,團隊才敢每天上線。

**看得見自己的邊界,也是一種誠實。**同一間公司、七個人,選標那條線我至今說不出細節——知識的牆比想像中矮得多也近得多。這件事當年看是分工自然,現在看是伏筆:組織怎麼分,系統就怎麼長;牆砌在哪裡,拆分線就落在哪裡。

而這支跑得飛快的團隊,有一件事所有人都沒預料到:**它的終點,比所有人想的都近。**下一章,暫停開發的那一天。
