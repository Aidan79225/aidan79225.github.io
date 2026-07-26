---
title: "購物車到訂單:被主播拔掉的狀態機"
date: 2026-07-26
category: tech
description: "交易主線收尾:兩種購物車一張表、跨檔期合併結帳的三層結構(付錢/履約/會計各一層)、訂單狀態為什麼是五個欄位而不是一個狀態機——以及那台真的被主播拔掉的狀態機。"
tags:
  - war-story
  - live-commerce
  - system-design
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 6
comments: true
draft: false
---
交易主線的最後一站:單怎麼從購物車走到訂單。[[rezero-comment-order|留言]]進了購物車、[[rezero-identity|身分]]掛好了單、[[rezero-inventory|庫存]]卡住了不變量——這章把它們聚合成一筆可以付錢、可以出貨、可以開發票的東西。標題不是比喻:這個系統裡真的有一台狀態機,被主播們用行動拔掉了。

## 兩種購物車,一張表

[[rezero-overview|全景]]說過購物車有兩種:直播下單的**佔庫存**、商城自己加的**不佔**。資料模型的答案在身分章亮過相:**一張 cart item 表,用 content type + object id(泛型外鍵)標記來源**。佔不佔、算直播價還是商城價,由來源決定;數量調整、結帳、清除,全走同一套邏輯。

調整數量的邊界也因此很乾淨:佔庫存的單要**加量**,就是再打一次庫存章那句條件更新——搶得到才加;**減量**就是釋放,把差額還給計數。留言的 LWW 改單、客人自己調、客服代調,三條路徑走的是同一組動作,只是觸發者不同。

## 合併結帳:三層,各自對應一個現實

結帳有個當年就支援的狠需求:**跨檔期合併結帳**——不同檔期、不同實況主買的東西,一次付清。這逼出了三層結構:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 300" role="img" aria-label="合併結帳的三層結構。最上方兩種購物車:佔庫存的直播購物車可橫跨多個檔期,與不佔庫存的商城購物車,一起進入合併結帳。往下是 orders payment,付錢的單位,跨檔期一次付清、聚合第三方付款事實。payment 之下按檔期切出多張 order,履約的單位,各自跟著該檔期的到貨與出貨節奏,檔期限定的優惠也記在這層。每張 order 之下是 order item,會計的單位,成交時定格金額,發票與退款都以它為準。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rco" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker></defs>
    <rect x="55" y="16" width="215" height="40" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="162" y="32" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">佔庫存購物車(直播)</text>
    <text x="162" y="47" fill="#9aa4b2" font-size="6.6" text-anchor="middle">可橫跨多個檔期/實況主</text>
    <rect x="310" y="16" width="215" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="417" y="32" fill="#e6e6e6" font-size="8.2" text-anchor="middle" font-weight="bold">不佔庫存購物車(商城)</text>
    <text x="417" y="47" fill="#9aa4b2" font-size="6.6" text-anchor="middle">同一張 cart item 表,來源多型</text>
    <line x1="162" y1="56" x2="252" y2="82" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rco)"/>
    <line x1="417" y1="56" x2="328" y2="82" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rco)"/>
    <rect x="190" y="86" width="200" height="24" rx="12" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="290" y="102" fill="#4f6df5" font-size="8.4" text-anchor="middle" font-weight="bold">合併結帳</text>
    <line x1="290" y1="110" x2="290" y2="126" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rco)"/>
    <rect x="165" y="130" width="250" height="42" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="290" y="147" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">orders payment —— 付錢的單位</text>
    <text x="290" y="162" fill="#9aa4b2" font-size="6.8" text-anchor="middle">跨檔期一次付清・聚合第三方付款事實(下一章)</text>
    <line x1="220" y1="172" x2="130" y2="196" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rco)"/>
    <line x1="290" y1="172" x2="290" y2="196" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rco)"/>
    <line x1="360" y1="172" x2="450" y2="196" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rco)"/>
    <rect x="45" y="200" width="170" height="40" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="130" y="216" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">order(檔期 A)</text>
    <text x="130" y="231" fill="#9aa4b2" font-size="6.4" text-anchor="middle">履約單位・檔期優惠記這層</text>
    <rect x="225" y="200" width="130" height="40" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="290" y="216" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">order(檔期 B)</text>
    <text x="290" y="231" fill="#9aa4b2" font-size="6.4" text-anchor="middle">按檔期切</text>
    <rect x="365" y="200" width="170" height="40" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="450" y="216" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">order(檔期 C)</text>
    <text x="450" y="231" fill="#9aa4b2" font-size="6.4" text-anchor="middle">跟著各自的出貨節奏</text>
    <line x1="290" y1="240" x2="290" y2="256" stroke="#54b890" stroke-width="1.1" marker-end="url(#rco)"/>
    <rect x="120" y="260" width="340" height="26" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="290" y="277" fill="#e6e6e6" font-size="7.6" text-anchor="middle">order item —— 會計單位:成交時定格金額,發票/退款以它為準</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三層不是架構潔癖:付錢、履約、會計是三個節奏不同的現實,各要一層。</figcaption>
</figure>

三層各自的存在理由,比「正規化」更務實:

- **payment 是付錢的單位。** 客人不在乎你的檔期,他要一次付清——所以聚合層必須存在。它的狀態由第三方付款事實聚合而來(部分付款、多渠道,精彩留給下一章)。
- **order 是履約的單位,按檔期切。** 代購的貨跟著檔期到、出貨跟著檔期走,售後的節奏天生以檔期為界;檔期限定的優惠券也記在這層。
- **order item 是會計的單位。** 成交那一刻定格金額——發票、退款、對帳,全部站在這個不再變動的數字上。

## 訂單的「狀態」:五個欄位,零個狀態機

教科書會教你給訂單畫一張漂亮的狀態機:建立 → 待付款 → 已付款 → 備貨 → 出貨 → 完成。當年的系統不是這樣——訂單的「狀態」是**五個各自獨立的欄位**:付款狀態、開發票狀態、退款狀態、物流狀態、客服標記。大部分**跟著事實更新,沒有轉移限制**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="單一狀態機與多欄位狀態的對比。左側打叉:把付款、發票、退款、物流、客服五個維度塞進一台狀態機,狀態數是五個維度的笛卡兒積,數百個組合各需定義轉移規則,而現實中主播想改就改,模型必輸。右側打勾:一張 order 上五個正交的狀態欄位,各自跟著自己的事實來源更新——付款狀態跟付款事實、發票狀態跟開票回執、退款狀態跟退款事實、物流狀態跟物流商回報、客服標記跟客服操作;只記錄、不強制。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rcg" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <line x1="290" y1="14" x2="290" y2="230" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="145" y="26" fill="#e05a7d" font-size="9" text-anchor="middle" font-weight="bold">✗ 一台大狀態機</text>
    <rect x="30" y="40" width="230" height="76" rx="8" fill="#3a2632" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="145" y="62" fill="#e05a7d" font-size="7.8" text-anchor="middle" font-weight="bold">付款 × 發票 × 退款 × 物流 × 客服</text>
    <text x="145" y="80" fill="#e6e6e6" font-size="7.2" text-anchor="middle">= 數百個組合狀態</text>
    <text x="145" y="96" fill="#9aa4b2" font-size="6.6" text-anchor="middle">每一個都要定義「誰能轉到誰」</text>
    <text x="145" y="136" fill="#e05a7d" font-size="7.2" text-anchor="middle">而主播想改就改——</text>
    <text x="145" y="150" fill="#e05a7d" font-size="7.2" text-anchor="middle">模型管不了的現實,規則只是阻力</text>
    <text x="145" y="176" fill="#9aa4b2" font-size="6.8" text-anchor="middle">(選標系統真的做過,</text>
    <text x="145" y="189" fill="#9aa4b2" font-size="6.8" text-anchor="middle">最後被拔掉)</text>
    <text x="435" y="26" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">✓ 五個正交欄位,跟著事實走</text>
    <rect x="316" y="40" width="112" height="180" rx="8" fill="#233528" stroke="#54b890" stroke-width="1.4"/>
    <text x="372" y="58" fill="#54b890" font-size="8.2" text-anchor="middle" font-weight="bold">order</text>
    <rect x="326" y="68" width="92" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="372" y="83" fill="#e6e6e6" font-size="6.8" text-anchor="middle">付款狀態</text>
    <rect x="326" y="96" width="92" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="372" y="111" fill="#e6e6e6" font-size="6.8" text-anchor="middle">發票狀態</text>
    <rect x="326" y="124" width="92" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="372" y="139" fill="#e6e6e6" font-size="6.8" text-anchor="middle">退款狀態</text>
    <rect x="326" y="152" width="92" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="372" y="167" fill="#e6e6e6" font-size="6.8" text-anchor="middle">物流狀態</text>
    <rect x="326" y="180" width="92" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="372" y="195" fill="#e6e6e6" font-size="6.8" text-anchor="middle">客服標記</text>
    <line x1="540" y1="79" x2="420" y2="79" stroke="#54b890" stroke-width="1" marker-end="url(#rcg)"/><text x="482" y="72" fill="#9aa4b2" font-size="6.2" text-anchor="middle">付款事實表</text>
    <line x1="540" y1="107" x2="420" y2="107" stroke="#54b890" stroke-width="1" marker-end="url(#rcg)"/><text x="482" y="100" fill="#9aa4b2" font-size="6.2" text-anchor="middle">開票回執</text>
    <line x1="540" y1="135" x2="420" y2="135" stroke="#54b890" stroke-width="1" marker-end="url(#rcg)"/><text x="482" y="128" fill="#9aa4b2" font-size="6.2" text-anchor="middle">退款事實</text>
    <line x1="540" y1="163" x2="420" y2="163" stroke="#54b890" stroke-width="1" marker-end="url(#rcg)"/><text x="482" y="156" fill="#9aa4b2" font-size="6.2" text-anchor="middle">物流商回報</text>
    <line x1="540" y1="191" x2="420" y2="191" stroke="#54b890" stroke-width="1" marker-end="url(#rcg)"/><text x="482" y="184" fill="#9aa4b2" font-size="6.2" text-anchor="middle">客服操作</text>
    <text x="435" y="236" fill="#9aa4b2" font-size="6.8" text-anchor="middle">只記錄、不強制——狀態是事實的影子</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">五個維度硬塞進一台狀態機,狀態數是笛卡兒積;正交地存,各自跟著自己的事實走。</figcaption>
</figure>

先講數學再講人。**數學**:這五件事各自獨立演進——付款完成不影響發票開不開得出來,退款可以發生在物流的任何階段。塞進單一狀態機,狀態數是五個維度的笛卡兒積,幾百個組合裡大半沒有業務意義,但每個都要你回答「誰能轉到誰」。正交的東西就該正交地存。

**人**:這台狀態機不是紙上談兵——選標系統的同仁真的做過轉移限制,然後發現**主播們想改就改**。改狀態被擋下來的每一次,對他們都是阻力而不是保護,最後狀態機被拔掉了。這個故事我認為是健康的認輸,但值得收一個更精確的教訓:**狀態機適合你能控制的流程,不適合你只是在記錄的現實。** 系統裡有兩種東西——**硬不變量**(不能超賣、錢要對),用資料庫層的約束守死,誰來都不能繞;**軟狀態**(人的作業進度),只記錄、不強制,因為主播、廠商、客服的現實你本來就管不了。當年最後的形狀恰好正確:超賣守死、狀態自由。很多系統犯的是相反的錯——把人的流程綁死,把錢的約束放鬆。

## 價格的生命週期:承諾之前查事實,承諾之後不再變

價格在這個系統裡有一條清楚的生命線:

- **購物車階段:不存價,永遠查現價。** 主播現場喊價、營運事後才補登金額——如果加入購物車時就把價格拷貝進 cart item,每次補登都要跑大量回填。查現價,零回填。[[ddia-data-models|正規化]]的優勢第三次出現(前兩次:身分章的反正規化判準、庫存章的檔期大掃除)。cart item 因為帶著來源,直播價和商城價自然分流——同一件商品,兩個通路兩個價,不用任何特殊處理。
- **成交那一刻:定格。** order item 把金額存死——不只是發票和退款需要一個不再變動的數字,更因為**客人的心理契約**:付過錢的東西,數字不能變。優惠也在這一刻算清:優惠券、免運,有的記在 order item、有的記在檔期層(檔期限定券),各自留下事實。

一句話收:**snapshot 只發生在承諾點——承諾之前永遠查事實,承諾之後永遠不再變。** cart 是意向,order 是承諾,兩邊的價格策略相反,而且都是對的。

## 反思

### 狀態機輸給主播,是我看過最健康的一次認輸

工程師對狀態機有種天然的迷戀——它精確、可證明、畫在白板上很漂亮。但選標系統那台狀態機的下場提醒我:**模型的職責是服務現實,不是糾正現實。** 主播不是不守規矩,是他們的工作本來就充滿例外:貨臨時到、價格臨時改、客人臨時換——每一個例外都合理,合起來就是「想改就改」。在這種現實上蓋轉移規則,擋下的全是正當操作。正確的花費方式是把「強制」的預算全部投給錢和庫存,把「記錄」留給其他一切——約束是稀缺資源,要花在違約成本最高的地方。

### 三層結構不是潔癖,是三個現實各要一層

payment、order、order item 這三層,如果當年是為了「架構好看」而分,大概撐不過第一次需求變更。它們撐住了,是因為每層背後有一個**獨立變動的現實**:客人要一次付清(付錢的節奏)、貨按檔期到(履約的節奏)、帳要經得起發票與退款(會計的節奏)。後來跨檔期合併、部分付款、檔期限定券這些複雜需求一個個冒出來,結構都接得住——**複雜需求殺不死職責單純的結構,殺得死聰明但混雜的結構。** 判斷要不要多一層的標準,從來不是「教科書說要」,是「這層對應的現實,會不會獨立於其他層變動」。

### 這一章之所以「無聊」,是前面的章在還債

寫到這章我發現一件事:它沒有事故可講。沒有超賣等級的爆炸、沒有被打爆的 API——結帳這段當年就是穩穩地跑。回頭看不是運氣:購物車一張表多型,所以合併結帳不用縫合兩套邏輯;單掛在身分上,所以誰來結帳都不用搬資料;帳本雙計數,所以 cart→order 的轉移一筆交易就完成。**結帳只是把前面章節做對的事實聚合起來而已。** 系統設計裡最被低估的讚美就是「無聊」——會爆炸的章節好寫,無聊的章節難得。願你的結帳流程也無聊。
