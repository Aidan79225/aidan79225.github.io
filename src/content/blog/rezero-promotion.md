---
title: "優惠與金額:折扣算錯,比超賣還難查"
date: 2026-07-30
category: tech
description: "營運面第三章:券的三軸模型(效果×門檻×範疇)、不需券的多件優惠、admin 裡的實驗性買A送B;當年寫了 NP-hard 的最優組合演算法,主播要求換成按順序最大扣除——以及 floor-and-subtract 讓退款分攤永遠對帳的算術。"
tags:
  - war-story
  - live-commerce
  - pricing
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 11
comments: true
draft: false
---
超賣會炸、金流會叫,折扣算錯**不會有任何聲音**——客人多付了 13 元不會知道,少收了 13 元你也不會知道,直到對帳那天一筆一筆挖。這章講優惠:規則怎麼收納、聰明演算法怎麼輸給主播的一句話、以及讓分攤永遠加總相等的笨算術。

## 優惠的地圖:規則、慣例、實驗

當年的優惠分三個棲息地:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 286" role="img" aria-label="優惠的三個棲息地。上半部是需要券的優惠,由三個正交參數組成:效果是折抵或免運,門檻是滿額額度,範疇分特定檔期、多個檔期、全檔期合算,還可以加商品白名單限定哪些商品算進額度;一張券就是三個參數的一次組合,例如滿三千折三百、限檔期 A、限指定商品。左下是不需要券的多件優惠:買多少送多少,一個商品可以掛多種。右下是實驗層:各種買 A 送 B 的花式組合塞在 Django admin 緊急套用,站穩了才升級成正式規則。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="16" y="18" width="548" height="132" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="290" y="38" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">需要券:一張券 = 三個參數的組合</text>
    <rect x="34" y="50" width="160" height="58" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="114" y="68" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">效果</text>
    <text x="114" y="84" fill="#9aa4b2" font-size="6.6" text-anchor="middle">滿額折抵</text>
    <text x="114" y="98" fill="#9aa4b2" font-size="6.6" text-anchor="middle">滿額免運</text>
    <rect x="210" y="50" width="160" height="58" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="290" y="68" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">門檻</text>
    <text x="290" y="84" fill="#9aa4b2" font-size="6.6" text-anchor="middle">滿額多少才生效</text>
    <text x="290" y="98" fill="#9aa4b2" font-size="6.6" text-anchor="middle">+ 商品白名單(算進額度的)</text>
    <rect x="386" y="50" width="160" height="58" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="466" y="68" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">範疇</text>
    <text x="466" y="84" fill="#9aa4b2" font-size="6.6" text-anchor="middle">特定檔期/多個檔期</text>
    <text x="466" y="98" fill="#9aa4b2" font-size="6.6" text-anchor="middle">全檔期合算</text>
    <rect x="120" y="118" width="340" height="22" rx="11" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="290" y="133" fill="#54b890" font-size="7" text-anchor="middle">例:「滿 3000 折 300・限檔期 A・限指定商品」</text>
    <rect x="16" y="166" width="266" height="96" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="149" y="188" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">不需要券:多件優惠</text>
    <text x="149" y="208" fill="#e6e6e6" font-size="6.8" text-anchor="middle">買多少送多少</text>
    <text x="149" y="224" fill="#9aa4b2" font-size="6.6" text-anchor="middle">一個商品可以掛多種</text>
    <text x="149" y="246" fill="#9aa4b2" font-size="6.4" text-anchor="middle">套用順序的故事在下一節</text>
    <rect x="298" y="166" width="266" height="96" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="431" y="188" fill="#e6e6e6" font-size="8.4" text-anchor="middle" font-weight="bold">實驗層:Django admin</text>
    <text x="431" y="208" fill="#9aa4b2" font-size="6.8" text-anchor="middle">各種買 A 送 B 的花式組合</text>
    <text x="431" y="224" fill="#9aa4b2" font-size="6.6" text-anchor="middle">實驗性緊急套用</text>
    <text x="431" y="246" fill="#9aa4b2" font-size="6.4" text-anchor="middle">站穩了,才升級成正式規則</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">參數化你會重複的(券的三軸),隔離你不確定的(admin 裡的花式)。</figcaption>
</figure>

- **需要券的,收斂成三個正交參數**:效果(折抵/免運)× 門檻(滿額多少,外加「哪些商品算進額度」的白名單)× 範疇(特定檔期/多個檔期/全檔期合算)。新券=填一組參數,不是寫一段 if——[[rezero-comment-order|檔期]]第四次成為系統的自然邊界:券的生效範圍,直接用檔期表達。
- **不需要券的多件優惠**(買多少送多少),掛在商品上,一個商品可以掛多種——它的套用順序是下一節的主角。
- **分類不了的,進 [[rezero-console|admin 試驗場]]**:各種買 A 送 B 的花式組合,實驗性緊急套用——上一章的成熟度光譜,在優惠這裡有了最頻繁的用例:行銷的點子永遠比規則表快,試驗場讓點子先跑,站穩了才值得一個正式參數。

## 最優解輸給了順序

多件優惠可以疊,一個商品掛多種——那客人的購物車該套哪個組合?當年的第一版答案很工程師:寫一個**最優惠組合演算法**,幫客人算出全場最省的套法。這是組合優化,朝著 NP-hard 的方向長,但商品數不大,算是算得動。

然後主播說:**不要。按照順序,每次採最大扣除就好。**

我很久之後才真正理解這個要求有多對。最優解的問題不在算力,在**它的答案沒辦法對人解釋**:

- **不穩定**:客人多加一件商品,整個最優組合可能重排——螢幕上的折扣數字跳來跳去,客人不會覺得你聰明,只會覺得被坑。
- **不能口播**:主播在鏡頭前要能一句話講清楚規則。「按順序、每次挑折最多的」講得出口;「我們的演算法會為您求解全域最優」講出口就是客訴。
- **不單調**:最優解下,多買有時反而讓某個舊折扣消失——「我多買一件,那邊怎麼變貴了」是客服解釋不完的災難。

greedy 每一步都挑當下扣最多的,答案穩定、單調、可預期——它不是全域最省,但**每一步都看得懂**。這跟[[rezero-cart-order|狀態機被主播拔掉]]是同一族的故事:工程師寫了聰明的,現場要求換笨的,而現場是對的。收一句:**演算法的正確性標準由使用情境定義——直播的「正確」,是客人聽得懂、數字不跳。**

## 錢往哪放:三層各有欄位

優惠算完的結果,直接在 [[rezero-cart-order|orders payment、order、order item]] 上開欄位——哪層合適放哪層。這不是隨性,是三層結構的正確用法:**錢的欄位跟著它的語意住**——商品自己的多件優惠寫在 item、檔期限定券寫在 order(它的範疇就是檔期)、全檔期合算的寫在 payment。金額一經結帳就定格([[rezero-cart-order|承諾點]]原則),發票、退款、對帳全部站在定格值上。

## 整數、捨去、減法:分攤的算術

金額全部用**整數**算——這是錢的程式碼的第一戒律。真正的考驗在**分攤**:一張檔期券折了 100 元,攤在兩件商品上;客人退其中一件,該退多少?

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 236" role="img" aria-label="floor-and-subtract 分攤示範。情境:兩件商品六百九十九元與三百零一元,共一千元,檔期券折一百。第一步按比例分攤:第一件應攤的折扣是六十九點九元,優惠後價格六百二十九點一元,無條件捨去小數成六百二十九元。第二步最後一件用減法收尾:實付總額九百元減去六百二十九,等於二百七十一元。檢查:六百二十九加二百七十一恰好等於九百,折扣合計恰好一百;退第一件就退六百二十九。捨去的零頭由公司吸收,總和永遠恆等。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="290" y="24" fill="#e6e6e6" font-size="8.6" text-anchor="middle" font-weight="bold">情境:699 + 301 = 1000,檔期券折 100 → 實付 900</text>
    <rect x="30" y="42" width="250" height="76" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="155" y="62" fill="#4f6df5" font-size="7.8" text-anchor="middle" font-weight="bold">① 按比例攤,然後無條件捨去</text>
    <text x="155" y="80" fill="#e6e6e6" font-size="6.8" text-anchor="middle">item A:699 − (699/1000 × 100)</text>
    <text x="155" y="94" fill="#e6e6e6" font-size="6.8" text-anchor="middle">= 629.1 → 捨去 → 629</text>
    <text x="155" y="110" fill="#9aa4b2" font-size="6.2" text-anchor="middle">0.1 元的零頭:公司吸收</text>
    <rect x="300" y="42" width="250" height="76" rx="7" fill="#233528" stroke="#54b890" stroke-width="1.3"/>
    <text x="425" y="62" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">② 最後一件,用減法收尾</text>
    <text x="425" y="80" fill="#e6e6e6" font-size="6.8" text-anchor="middle">item B:900 − 629 = 271</text>
    <text x="425" y="94" fill="#e6e6e6" font-size="6.8" text-anchor="middle">不再算比例,直接補到總額</text>
    <text x="425" y="110" fill="#9aa4b2" font-size="6.2" text-anchor="middle">減法保證總和恆等</text>
    <rect x="90" y="140" width="400" height="52" rx="7" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="290" y="160" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-weight="bold">檢查:629 + 271 = 900 ✓ 折扣 70 + 30 = 100 ✓</text>
    <text x="290" y="178" fill="#e6e6e6" font-size="6.8" text-anchor="middle">退 item A 就退 629——每一分錢都有主,對帳永遠對得起來</text>
    <text x="290" y="218" fill="#9aa4b2" font-size="7.2" text-anchor="middle">類似的分攤情境,一律照這個方式處理——一個規則,全系統通用</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">floor-and-subtract:捨去讓零頭有主(公司吸收),減法讓總和恆等——醜,但每一分錢都對得起來。</figcaption>
</figure>

規則只有兩條:**按比例算出的優惠後價格,無條件捨去小數**(零頭讓給客人,公司吸收——爭議永遠往對客人有利的方向倒);**最後一份不算比例,用減法補到總額**(總和恆等是用結構保證的,不是用測試保證的)。這是 largest-remainder 分攤法的務實簡化,而且當年立了個好規矩:**類似的情境一律照此處理**——分攤算法全系統只有一種,對帳的人只需要理解一次。

## 反思

### 聰明演算法的墳墓,是解釋成本

最優組合演算法是我們寫過技術含量最高的程式碼之一,也是被砍得最快的之一。它輸給 greedy 的原因,值得每個工程師背下來:**演算法的總成本=計算成本+解釋成本**,而面向消費者的系統裡,解釋成本幾乎總是大頭。客人問「為什麼是這個折扣」時,客服要能答、主播要能講、工程師要能查——最優解在這三關全滅。這是主播第三次教我們設計(狀態機、重喊、greedy),而三次的教訓是同一條:**現場智慧的核心是可解釋性,系統要嘛遷就它,要嘛被繞過。**

### 參數化你會重複的,隔離你不確定的

優惠系統最怕長成 if 海——每檔活動加一段特判,兩年後沒人敢動。當年的結構避開了它:會重複的模式(滿額×範疇×效果)收斂成參數表,新券=填表;不確定的點子(花式買 A 送 B)隔離進 admin 試驗場,爛了就丟、站穩了才升格。**規則引擎的真義不是「能表達一切」——是把重複的變便宜、把實驗的變安全。**兩層各司其職,行銷的創意速度和系統的可維護性才能同時活著。

### 錢的正確性是會計性質,不是數學性質

floor-and-subtract 在數學家眼裡很醜:分攤不按精確比例、最後一份用減法硬補。但錢的程式碼要回答的從來不是「分得準不準」,是**「加總相不相等、零頭歸不歸屬、事後查不查得清」**——這是會計的標準,不是數學的標準。0.1 元分給誰根本不重要,重要的是每一分錢都有主、退款永遠退得出一個明確的數、對帳永遠對得平。**錢的程式碼,優雅讓位給對帳**——這句話值得貼在每個電商工程師的螢幕上。
