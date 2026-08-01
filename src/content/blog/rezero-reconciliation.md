---
title: "對帳:我們沒有做,為什麼帳還是對的"
date: 2026-08-01
category: tech
description: "這章本來要寫我們怎麼對三本帳,查證的結果是:系統層根本沒有對帳——而帳幾乎沒錯過。答案分散在前面十五章:整個系統是一台拆開的資料庫,而我們補回一致性的方式不是寫對帳程式,是少物化、多派生,讓漂移無處發生。"
tags:
  - war-story
  - live-commerce
  - data-consistency
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 16
comments: true
draft: false
---
這章在規劃裡叫「三本帳:庫存帳、訂單帳、金流帳」,本來要寫我們怎麼對帳。動筆前照慣例回去查證當年的實際做法,結果是:**我們沒有做對帳。** 系統裡沒有對帳排程、結束檔期不核帳、上線後也幾乎沒處理過錯帳。

一個處理真金白銀的系統,沒有對帳機制,帳卻幾乎沒錯過——這句話比任何對帳架構都值得解釋。答案分散在前面十五章裡,這章把它們收束起來。

## 一台拆開的資料庫

先講一個寫到系列中段才浮現的體悟。有一天我盯著這個系統的全貌,突然發現它很眼熟:**我們做的每一件事,都是一台資料庫內部構造的放大版。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 288" role="img" aria-label="一台拆開的資料庫:左欄是資料庫內部構造,右欄是我們系統的對應物,逐列對照。先寫日誌對應留言清洗後先落地;log consumer 建索引對應 FSM batch 建購物車;物化視圖對應賣出數量計數;讀時計算的 view 對應付款與訂單狀態讀時派生;redo log 對應可重放的配貨紀錄;內建排程對應 heartbeat 掃表;repair 對應每小時重算賣出數量。底部結論:拆開的代價,是資料庫免費送的交易保證得自己一項項補回來。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="145" y="24" fill="#4f6df5" font-size="8.4" text-anchor="middle" font-weight="bold">一台資料庫的裡面</text>
    <text x="435" y="24" fill="#9ccc65" font-size="8.4" text-anchor="middle" font-weight="bold">我們的系統</text>
    <rect x="30" y="36" width="230" height="22" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/>
    <text x="145" y="51" fill="#e6e6e6" font-size="6.8" text-anchor="middle">WAL:先寫日誌,再做別的</text>
    <rect x="320" y="36" width="230" height="22" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="435" y="51" fill="#e6e6e6" font-size="6.8" text-anchor="middle">留言清洗後先 append 落地</text>
    <line x1="260" y1="47" x2="320" y2="47" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <rect x="30" y="64" width="230" height="22" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/>
    <text x="145" y="79" fill="#e6e6e6" font-size="6.8" text-anchor="middle">log consumer:消化日誌、建索引</text>
    <rect x="320" y="64" width="230" height="22" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="435" y="79" fill="#e6e6e6" font-size="6.8" text-anchor="middle">FSM batch 消化留言、建購物車</text>
    <line x1="260" y1="75" x2="320" y2="75" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <rect x="30" y="92" width="230" height="22" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/>
    <text x="145" y="107" fill="#e6e6e6" font-size="6.8" text-anchor="middle">物化視圖:先算好存起來</text>
    <rect x="320" y="92" width="230" height="22" rx="4" fill="#1f2330" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="435" y="107" fill="#e6e6e6" font-size="6.8" text-anchor="middle">賣出數量計數(唯一的物化)</text>
    <line x1="260" y1="103" x2="320" y2="103" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <rect x="30" y="120" width="230" height="22" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/>
    <text x="145" y="135" fill="#e6e6e6" font-size="6.8" text-anchor="middle">view:讀的時候才計算</text>
    <rect x="320" y="120" width="230" height="22" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="435" y="135" fill="#e6e6e6" font-size="6.8" text-anchor="middle">付款/訂單狀態讀時派生</text>
    <line x1="260" y1="131" x2="320" y2="131" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <rect x="30" y="148" width="230" height="22" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/>
    <text x="145" y="163" fill="#e6e6e6" font-size="6.8" text-anchor="middle">redo log:可重放的變更史</text>
    <rect x="320" y="148" width="230" height="22" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="435" y="163" fill="#e6e6e6" font-size="6.8" text-anchor="middle">配貨紀錄:可整段重建</text>
    <line x1="260" y1="159" x2="320" y2="159" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <rect x="30" y="176" width="230" height="22" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/>
    <text x="145" y="191" fill="#e6e6e6" font-size="6.8" text-anchor="middle">內建排程:vacuum、checkpoint</text>
    <rect x="320" y="176" width="230" height="22" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="435" y="191" fill="#e6e6e6" font-size="6.8" text-anchor="middle">heartbeat 掃表:催付、結算</text>
    <line x1="260" y1="187" x2="320" y2="187" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <rect x="30" y="204" width="230" height="22" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/>
    <text x="145" y="219" fill="#e6e6e6" font-size="6.8" text-anchor="middle">repair:壞了照事實修回來</text>
    <rect x="320" y="204" width="230" height="22" rx="4" fill="#1f2330" stroke="#54b890" stroke-width="1.2"/>
    <text x="435" y="219" fill="#e6e6e6" font-size="6.8" text-anchor="middle">每小時重算賣出數量</text>
    <line x1="260" y1="215" x2="320" y2="215" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="290" y="252" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">拆開的代價:資料庫免費送的交易保證,得自己一項項補回來</text>
    <text x="290" y="272" fill="#9aa4b2" font-size="6.8" text-anchor="middle">這章要回答的就是:「一致性」這項,我們是怎麼補的</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">整個系統,是一台被拆開攤在桌上的資料庫——每個元件都對得上號。</figcaption>
</figure>

留言清洗後先落地是 WAL([[rezero-comment-order|#3]]);FSM batch 消化留言建購物車,是 log consumer 在建索引;賣出數量是物化視圖([[rezero-inventory|#5]]);付款狀態讀時派生是 view([[rezero-payment|#7]]);配貨紀錄可整段重建,是 redo log([[rezero-fulfillment|#8]]);heartbeat 掃表是內建排程([[rezero-ops|#15]]);每小時重算,就是 repair。[[ddia-future|DDIA 最後一章]]管這個叫 **unbundled database**——把資料庫拆開,用一個個元件重新組裝。我們沒讀過那一章,卻用兩年把它蓋了出來。

拆開不是免費的。一台資料庫裡,index 永遠跟得上 heap、物化視圖有 refresh 保證、transaction 罩住一切;拆開之後,**這些保證得自己補**。對帳,理論上就是「自己補一致性」的最後一道防線——所以「我們沒做對帳」這件事,需要一個交代。

## 三本帳,誰會漂

先把三本帳和它們的 source of truth 攤開:

- **庫存帳**:庫存上限+賣出數量,[[rezero-inventory|一張獨立表、兩個欄位]]。
- **訂單帳**:order 與 order item,金額在成交當下[[rezero-cart-order|定格成會計事實]]。
- **金流帳**:orders payment,配上 [[rezero-payment|per-provider 的付款事實表]]。

帳會錯,必要條件是**同一個事實存在兩份、而且各自更新**——冗餘才會漂移。用這把尺量三本帳,結果很有趣:

**訂單帳和金流帳,幾乎沒有冗餘。**訂單「狀態」不是一個欄位,是讀取時從事實派生的;付款進度不是一個布林,是把 per-provider 事實表加總出來的。[[rezero-promotion|優惠金額]]用 floor-and-subtract,總和恆等是算法保證,不是事後核對出來的。**沒有第二本會漂的帳,就沒有帳要對**——這不是我們對帳做得好,是這兩本帳從結構上取消了對帳的必要。

**庫存帳,有一個冗餘。**賣出數量是全系統唯一刻意物化的數字——為了直播當下的速度,不物化不行。它也真的漂過:[[rezero-inventory|migrate 那次超賣]],就是這個數字被需求變更打歪。而它配的防線,就是每小時重算:照著購物車和訂單的事實,把計數整個算回來。**一個冗餘,配一個修復迴圈,收支平衡。**

所以「沒有對帳」的第一層答案:**對帳的需求,與物化的冗餘成正比。**我們把冗餘壓到只剩一個,對帳就縮到只剩一支排程——而它平常安靜到沒有人叫它對帳。

## 真正的對帳,在系統外面

第二層答案:對帳這件事存在,只是不在系統裡——**它在會計部門**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="系統外的對帳流程。系統把訂單按會計部門要求匯出;會計部門在每個檔期結束後對帳;發現不一致時請 CTO 派工程師查原因,之後分兩條路:少收的話由工程師調資料庫讓金額對上,屬於內部吸收;多收的話由客服聯絡客人退紅利點數或現金,屬於對外補償。備注:上線後幾乎沒有印象處理過錯帳。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="30" y="40" width="150" height="46" rx="6" fill="#1f2330" stroke="#9ccc65" stroke-width="1.2"/>
    <text x="105" y="59" fill="#e6e6e6" font-size="7" text-anchor="middle">系統的責任</text>
    <text x="105" y="74" fill="#9ccc65" font-size="6.6" text-anchor="middle">按會計要求匯出訂單</text>
    <line x1="180" y1="63" x2="240" y2="63" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 236 59 L 242 63 L 236 67 Z" fill="#9aa4b2"/>
    <text x="210" y="54" fill="#9aa4b2" font-size="6.2" text-anchor="middle">翻譯層</text>
    <rect x="242" y="40" width="150" height="46" rx="6" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="317" y="59" fill="#e6e6e6" font-size="7" text-anchor="middle">會計部門</text>
    <text x="317" y="74" fill="#9aa4b2" font-size="6.6" text-anchor="middle">每個檔期結束後對帳</text>
    <line x1="392" y1="63" x2="452" y2="63" stroke="#e05a7d" stroke-width="1.2"/>
    <path d="M 448 59 L 454 63 L 448 67 Z" fill="#e05a7d"/>
    <text x="422" y="54" fill="#e05a7d" font-size="6.2" text-anchor="middle">不一致</text>
    <rect x="454" y="40" width="96" height="46" rx="6" fill="#3a2632" stroke="#e05a7d" stroke-width="1.2"/>
    <text x="502" y="59" fill="#e6e6e6" font-size="6.8" text-anchor="middle">CTO 派工程師</text>
    <text x="502" y="74" fill="#9aa4b2" font-size="6.4" text-anchor="middle">查原因</text>
    <line x1="502" y1="86" x2="502" y2="106" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="160" y1="106" x2="502" y2="106" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="160" y1="106" x2="160" y2="126" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="420" y1="106" x2="420" y2="126" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="60" y="128" width="200" height="56" rx="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="160" y="147" fill="#d6a45c" font-size="7" text-anchor="middle" font-weight="bold">少收:內部吸收</text>
    <text x="160" y="162" fill="#e6e6e6" font-size="6.6" text-anchor="middle">工程師調 DB,讓金額對上</text>
    <text x="160" y="176" fill="#9aa4b2" font-size="6.2" text-anchor="middle">公司自己買單,安靜處理</text>
    <rect x="320" y="128" width="200" height="56" rx="6" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.2"/>
    <text x="420" y="147" fill="#9b6ff0" font-size="7" text-anchor="middle" font-weight="bold">多收:對外補償</text>
    <text x="420" y="162" fill="#e6e6e6" font-size="6.6" text-anchor="middle">客服聯絡客人</text>
    <text x="420" y="176" fill="#9aa4b2" font-size="6.2" text-anchor="middle">退紅利點數,或退現金</text>
    <text x="290" y="216" fill="#54b890" font-size="7.2" text-anchor="middle" font-weight="bold">實際戰績:上線後,幾乎沒印象處理過錯帳</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">對帳的機制歸系統(匯出),政策歸人(怎麼修、誰買單)——修帳的方向,決定用什麼貨幣付。</figcaption>
</figure>

系統的責任止於**匯出**:把訂單按會計部門的要求整理出去。這其實是一個翻譯層——把工程師的事實表,翻譯成會計的語言。對帳的執行、判斷、修正,全部在人的世界裡進行:會計對出不一致,請 CTO 派工程師查原因;查完之後,修法看方向——**少收,工程師調 DB 讓金額對上,公司內部吸收;多收,客服聯絡客人,退紅利點數或現金,對外補償**。

這個不對稱很值得看一眼。少收是公司的損失,對客人沒有影響,所以安靜地在內部處理;多收動了客人的錢,所以走最貴的渠道(客服電話)、給最有誠意的補償。**修帳的方向決定誰買單、用什麼貨幣付**——這又是一次[[rezero-fulfillment|機制歸系統、政策歸人]]:系統提供事實,人決定正義。

而這一整套的實際戰績是:**上線後,幾乎沒印象處理過錯帳。**連[[rezero-cart-order|結束檔期]]那個一次動幾千筆資料的大結算,都只做黑名單、清購物車、清未付款訂單——不核帳,照樣跑得意外地順。當年我們把這歸功於乖乖遵守 3NF;現在我可以講得更準:**3NF 就是「同一個事實只存一份」的紀律,它在源頭掐死了漂移。**

## 重來:把「幾乎沒事」變成「可證明沒事」

那重來一次,對帳還是什麼都不做嗎?不。「幾乎沒錯過帳」和「可以證明帳是對的」之間,有一條 [[rezero-ops|#15]] 講過的縫:我們的安心是「習慣了沒出事」,不是「數字說沒事」。重來會補三件小事,全部順著現有結構長:

1. **自我對帳 query,排程跑。**系統裡的不變量本來就寫得出來:每張 order 的金額等於 order item 加總、每筆 orders payment 的入帳不小於它蓋的訂單、賣出數量等於佔庫存購物車與訂單的加總。用 [[airflow-reliability|排程]]每天跑一輪,全綠不吵人、有紅才告警——成本是幾條 SQL,買到的是把「應該沒事」換成「驗證過沒事」。
2. **修帳用補償分錄,不直接調 DB。**當年少收就調 DB 讓金額對上——能理解,但嚴格說是**改歷史**:半年後沒人記得那筆數字為什麼長那樣。會計自己的規矩是對的:錯帳不塗改,加一筆沖銷。帳的歷史也是事實,[[rezero-payment|事實 append、狀態派生]]這條系列鐵律,修帳的時候也不該例外。
3. **匯出格式當契約管理。**會計的要求會變,而匯出是系統與會計之間唯一的介面——introduce 版本、留樣本、改格式走 review,像對待 API 一樣對待它。

就這三件。沒有對帳中台、沒有每日全量核對——**在一個冗餘只有一個的系統裡,蓋更大的對帳系統是在對抗不存在的敵人**。

## 反思

**最好的對帳,是讓帳沒有機會錯。**對帳需求與物化冗餘成正比——每多存一份派生數字,就多一本會漂的帳、多一支要寫的核對排程。把派生資料留在讀取端,是最便宜的一致性:它讓「對帳」這個詞從系統詞彙裡幾乎消失。我們當年不是對帳做得好,是把需要對帳的理由一個個設計掉了。

**「沒出事」不等於「證明沒事」。**這是 #15 的賒帳論在資料上的重演:我們的帳是乾淨的,但沒有任何量測能證明它乾淨——和[[rezero-risk|風控那章]]「沒收到抱怨」是同一種沉默。設計紅利是真的,但紅利要配一張成績單;三條 invariant query 的成本,買的就是那張成績單。

**這個系統教我最深的一課,是這章的標題反過來讀。**「我們沒有做 X,為什麼沒出事」——把 X 換成對帳、換成狀態機、換成通知抽象層,前面十五章反覆出現同一個結構:**不做,是因為結構讓它不必做**。工程的成熟不是把清單上的東西都蓋齊,是知道哪些東西你的結構已經免費送了、哪些必須親手補。拆開的資料庫攤在桌上,補得最成功的那一塊,恰恰是看起來什麼都沒做的地方。

下一章換個小而美的題目:圖片。上傳只要一個下午,刪除卻是一輩子的事——資源的生與死。
