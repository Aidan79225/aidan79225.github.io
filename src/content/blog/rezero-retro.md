---
title: "Re:如果真的重來"
date: 2026-08-02
category: tech
description: "終章。政治因素一筆帶過——我們是工程師,專注在該專注的地方;真正要寫的是最後一個月:1 on 1、陪跑面試、一起研究 AI 工具、解散前夕還在交付;一顆隕石的翻案、三個寫作中段才浮現的體悟、「重來也不換」與「重來要補」的兩張清單——以及 Re: 這個字,到底是什麼意思。"
tags:
  - war-story
  - live-commerce
  - retrospective
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 21
comments: true
draft: false
---
這個系列從[[rezero-overview|一則留言的旅程]]開始,寫了二十章。終章不新增任何架構,只做四件事:交代結局、講完最後一個月、把三個寫到中段才浮現的體悟收起來,然後回答書名的問題——**如果真的重來,我會改什麼**。

## 那一天之後

[[rezero-microservices|#19]] 講過那一天:暫停開發、合約重談、一個月後剩三個人。再後來,專案因為**政治因素**走向關閉與資遣。

政治的細節,這裡不寫。不是不能寫,是不值得寫——**我們是工程師,專注在該專注的地方。**商業和政治的力量可以關掉一個專案,這件事工程師無法控制;工程師能控制的,是在專案活著的每一天把東西做對,以及在它死掉的那一天,帶著什麼離開。這一章只寫後者。

## 最後一個月

得知結局確定之後,我做的第一件事是**馬上跟每個同仁約 1 on 1**。沒有人需要被安撫——他們都能理解老闆的決定;工程師對「合約談崩了,錢不夠了」這種因果,接受得比想像中快。真正要談的是下一步。

我跟他們說:最後這一個月,**可以去找工作**——需要的話,我陪你們跑 mock interview。然後,把剩下的時間變成加速期:一起研究當時正在爆發的 AI 工具——OpenClaw、opencode、Claude Code、multica——把履歷之外的競爭力也補上。

最後一件事,是我把 **multica 架了起來,讓其他部門的人也可以自己寫 task,工程師負責 review**。團隊要解散了,但需求不會消失;與其留下一堆沒人接的許願,不如留下一個「非工程師寫 task、工程師把關」的運作方式。[[rezero-ops|#15]] 說過,當年缺的是「事故的語言」——離開前的最後一個交付,恰好是給了留下來的人一套「需求的語言」。

解散前夕還在出貨,這不是敬業表演。工程師的尊嚴不在專案的成敗裡——專案的成敗一半在別人手上;**尊嚴在「直到最後一天,東西都是好的」**。

## 一顆隕石的翻案

有一個故事,從 [[rezero-ops|#15]] 欠到現在:後選樣式。

週二半夜,電話打給 CTO:主播要一個「後選樣式」的功能——客人直播中先喊單、下播後再選確定的樣式——**這週六的直播就要用**。我跟同仁趕工把它做出來,測試做好做滿,十足的信心,如期上線。

然後,**三個月,一次都沒有被用過。**

CTO 去問,得到一句回答:「**知道能用跟不能用,就有差別。**」我跟同仁和 CTO 當年的心境,是啼笑皆非——半夜的隕石、整週的趕工,換一個沒人碰的按鈕。

但寫完這二十章,我想給這顆隕石翻案。[[rezero-asset-lifecycle|#17]] 有一張「從沒理賠過的保險單」——image_metadata 的反向引用,投保的理由千真萬確,理賠的那天永遠沒來;[[rezero-ops|#15]] 說監控的終極產品不是資訊,是**安心**。後選樣式是同一個東西:主播買的從來不是那個按鈕,是「**這週六如果需要,我有**」的安心。保險沒理賠,不代表保費白繳——**備而不用,就是有產生效果。**當年我們用工程師的帳本記它(零使用=零價值),主播用的是另一本帳;寫這個系列的此刻,我才看懂她那本帳是對的。

## 三個體悟

這個系列寫到中段,有三件事自己浮出來——不是當年就知道的,是寫作逼出來的。按浮現的順序收在這裡。

**其一:當年,其實做得還不錯。**開始寫這個系列時,我以為會寫出一本悔過書;寫到一半發現,「重來也不換」的清單長得異常:[[rezero-comment-order|FSM 與查詢即驗證]]、[[rezero-payment|事實表與讀時派生]]、[[rezero-flash-crowd|批次淤而不倒]]、[[rezero-cart-order|3NF 的紀律]]、[[rezero-stack|五個 boring 元件]]、[[rezero-team|排序不排期]]……為什麼記憶跟事實有落差?因為**做對的決策是安靜的**——它們不出事,不出事就不留記憶;痛的記憶永遠比對的決策鮮明。工程師回顧自己時,天然帶著倖存者偏差的反面:只記得傷疤,忘了鎧甲。

**其二:我當年不是 DE,卻做了很多 DE 在做的事。**抓留言是 EL 管線、FSM batch 是串流消費、賣出數量是物化視圖、每小時重算是排程修復、配貨紀錄是事件溯源、匯出是資料交付——[[rezero-reconciliation|對帳那章]]收束的一切,今天我的職稱叫 Data Engineering 的,全部都在。**DE 不是一個職稱,是一組問題**;當年這組問題長在一個電商後端身上,後來我換了工作,只是搬到這組問題是主業的地方。從後端到 DE 的 EM,外人看是轉行,我自己知道:**問題沒變,變的是它終於有了名字。**

**其三:整個系統,是一台拆開的資料庫。**這條在 [[rezero-reconciliation|#16]] 展開過,終章只補最後一層:前兩個體悟其實是它的推論。「當年做得不錯」,是因為我們無意間遵守了資料庫的內部紀律(先寫日誌、派生不物化、修復照事實);「做了 DE 的事」,是因為拆開的資料庫的每個元件,本來就是 DE 的日常。三個體悟是同一件事的三面——**我們花兩年,親手造了一台資料庫,而且直到寫這個系列,我才知道。**

## 如果真的重來,我最想改的一件事

書名的問題,答案應該是某個架構吧?FSM?狀態機?微服務的時機?

都不是。核心的架構,上一節說了,重來也不換。**我最想改的,是監控。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 288" role="img" aria-label="兩張清單。左邊綠色,重來也不換的核心:FSM 與查詢即驗證、事實 append 加讀時派生、批次淤而不倒、3NF 與庫存雙欄位、per-provider 金流事實表、五個 boring 元件、排序不排期、轉檔即驗證。右邊琥珀色,重來要補的保護:四個黃金訊號加 batch lag、事故的語言 severity 與 runbook、dead-letter、第一天就上 Cloudflare、invariant query 排程、deleted_at 與 sweep 前反查、負載測試與另外半張 checklist。底部結論:核心是對的,欠的全是保護——這也解釋了我後來為什麼走向 SRE。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="152" y="26" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">重來也不換(核心)</text>
    <rect x="24" y="38" width="256" height="196" rx="8" fill="#233528" stroke="#54b890" stroke-width="1.3"/>
    <text x="152" y="60" fill="#e6e6e6" font-size="6.6" text-anchor="middle">FSM・查詢即驗證</text>
    <text x="152" y="82" fill="#e6e6e6" font-size="6.6" text-anchor="middle">事實 append+讀時派生</text>
    <text x="152" y="104" fill="#e6e6e6" font-size="6.6" text-anchor="middle">批次淤而不倒</text>
    <text x="152" y="126" fill="#e6e6e6" font-size="6.6" text-anchor="middle">3NF・庫存雙欄位</text>
    <text x="152" y="148" fill="#e6e6e6" font-size="6.6" text-anchor="middle">per-provider 金流事實表</text>
    <text x="152" y="170" fill="#e6e6e6" font-size="6.6" text-anchor="middle">五個 boring 元件・一台 VM</text>
    <text x="152" y="192" fill="#e6e6e6" font-size="6.6" text-anchor="middle">排序不排期・merge 即上線</text>
    <text x="152" y="214" fill="#e6e6e6" font-size="6.6" text-anchor="middle">轉檔即驗證・泛型外鍵</text>
    <text x="428" y="26" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">重來要補(保護)</text>
    <rect x="300" y="38" width="256" height="196" rx="8" fill="#1f2330" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="428" y="60" fill="#d6a45c" font-size="6.6" text-anchor="middle" font-weight="bold">四個黃金訊號+batch lag 量表</text>
    <text x="428" y="82" fill="#e6e6e6" font-size="6.6" text-anchor="middle">事故的語言:severity・runbook</text>
    <text x="428" y="104" fill="#e6e6e6" font-size="6.6" text-anchor="middle">毒藥訊息的 dead-letter</text>
    <text x="428" y="126" fill="#e6e6e6" font-size="6.6" text-anchor="middle">第一天就上 Cloudflare</text>
    <text x="428" y="148" fill="#e6e6e6" font-size="6.6" text-anchor="middle">invariant query 排程(自我對帳)</text>
    <text x="428" y="170" fill="#e6e6e6" font-size="6.6" text-anchor="middle">deleted_at・sweep 前反查</text>
    <text x="428" y="192" fill="#e6e6e6" font-size="6.6" text-anchor="middle">負載測試・另外半張 checklist</text>
    <text x="428" y="214" fill="#9aa4b2" font-size="6.4" text-anchor="middle">——全是「保護」,沒有一項是「功能」</text>
    <text x="290" y="258" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">核心是對的,欠的全是保護</text>
    <text x="290" y="276" fill="#9aa4b2" font-size="6.8" text-anchor="middle">這也解釋了我後來為什麼走向 SRE</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">二十章的重來聲部收成兩張清單:左邊是鎧甲,右邊是當年沒穿上的那件。</figcaption>
</figure>

把二十章的「重來」聲部全部倒出來看,右邊那張清單有個共同點:**沒有一項是功能,全部是保護**——看得見的量表、說得清的事故、接得住的毒藥、擋得掉的攻擊。而左邊那張清單解釋了為什麼系統活得下來,右邊那張解釋了為什麼**人**活得那麼辛苦:[[rezero-ops|每一場直播的恐懼、模模糊糊的 Sentry、半夜的電話]]——系統淤而不倒,人一觸即炸。

所以如果真的重來,我最想改的不是任何一行架構,是**把監控做好——不要讓任何一個工程師,有機會經歷像我一樣的 suffer**。重來之最,不是為了系統,是為了人。系統的帳,當年就算對了;人的帳,是我後來才學會算的。

## Re:

系列的名字玩了一個梗,但「Re:」這個字,寫到最後我發現它有三個意思,剛好是三層收尾。

**Re: 是重來(retry)。**這個系列每一章都有「如果重來」的聲部——那不是懊悔的清單,是把當年的每一場仗,用現在的功力重打一次。重打完的結論在上面兩張清單裡:核心不換,補上保護。技術上的重來,到此結清。

**Re: 是回信(reply)。**寫作的中途我才意識到,這二十一章其實是一封回信——回給當年那個提心吊膽跟播、半夜改 bug 的自己。信的內容用一句話總結:**你做得比你以為的好;你欠的那些,後來都補上了。**

**Re: 是繼續(resume)。**專案死了。技術全對,專案仍然會死——這是這個行業最誠實的一課:**成敗一半在別人手上,能力全部在自己身上。**平台關閉那天,程式碼歸了公司,但 FSM 的手感、事實與派生的直覺、批次的膽識、對帳的紀律、帶人的方法——這些跟著我走。半年後我成了 EM,先兼 interim SRE;今天我帶著一個 DE 團隊,把當年欠自己的監控,一格一格補給現在的工程師。

船沒有出航,航海的人還在海上。

**繼續往前。**
