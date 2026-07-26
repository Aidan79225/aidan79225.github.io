---
title: "第三方金流:教科書的三個坑,與一個沒有坑的地形"
date: 2026-07-26
category: tech
description: "錢與貨的第一章:兩家銀行、智慧轉帳與信用卡、部分付款拆五張轉帳——per-provider 事實表加讀取時派生,如何讓 webhook 的重複、亂序、失蹤三個坑整組失去攻擊面,以及退款 API 沒人用之後的觀察者模式。"
tags:
  - war-story
  - live-commerce
  - payment
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 7
comments: true
draft: false
---
[[rezero-cart-order|上一章]]把單聚合成了三層,現在要收錢了。金流是這個系統第一次把「正確」交到別人手上——付款發生在銀行那邊,你只能透過[[ddia-distributed-trouble|不可靠的網路]]得知結果。教科書會警告你三個坑:通知會重複、會亂序、會根本不來。這章要講的是:當年這三個坑,我們**一個都沒踩**——不是運氣好,是設計選了一個沒有坑的地形。

## 當年的付款版圖

付款方式四種:**兩家銀行**,提供**智慧轉帳**和**信用卡**,外加一個自訂的**現金付款**(營運線下收款後入帳)。而且有個一開始就存在的硬需求:**部分付款**——轉帳單筆上限 30,000,一筆 150,000 的結帳,客人要拆五張轉帳付完。

這個需求宣判了「`is_paid` 布林」的死刑:錢是**分批、分渠道、非同步**到的。當年的資料模型是:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 292" role="img" aria-label="付款事實的架構。最上方是 orders payment,它的狀態不儲存,而是讀取時從事實聚合派生:已付等於入帳事實加總大於等於應付金額。中層是四張各自獨立的事實表:銀行 A 智慧轉帳事實、銀行 A 信用卡事實、銀行 B 付款事實、現金入帳由營運標記。左側標註部分付款:一筆十五萬因轉帳單筆上限三萬,拆成五筆轉帳事實。最下方兩個寫入通道:webhook 即時通知與 polling 主動查單,雙通道寫進同一組事實表,因事實冪等,重疊無害、互為備援。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rpu" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rpg" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <rect x="130" y="16" width="320" height="46" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="290" y="35" fill="#4f6df5" font-size="9.2" text-anchor="middle" font-weight="bold">orders payment</text>
    <text x="290" y="52" fill="#9aa4b2" font-size="7" text-anchor="middle">狀態不儲存,讀取時聚合:已付 = SUM(入帳事實) ≥ 應付</text>
    <line x1="150" y1="112" x2="220" y2="64" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rpu)"/>
    <line x1="245" y1="112" x2="268" y2="64" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rpu)"/>
    <line x1="335" y1="112" x2="312" y2="64" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rpu)"/>
    <line x1="430" y1="112" x2="360" y2="64" stroke="#4f6df5" stroke-width="1.1" marker-end="url(#rpu)"/>
    <rect x="88" y="116" width="118" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="147" y="134" fill="#e6e6e6" font-size="7.2" text-anchor="middle" font-weight="bold">銀行 A・智慧轉帳</text>
    <text x="147" y="149" fill="#9aa4b2" font-size="6.4" text-anchor="middle">事實表</text>
    <rect x="216" y="116" width="118" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="275" y="134" fill="#e6e6e6" font-size="7.2" text-anchor="middle" font-weight="bold">銀行 A・信用卡</text>
    <text x="275" y="149" fill="#9aa4b2" font-size="6.4" text-anchor="middle">事實表</text>
    <rect x="344" y="116" width="118" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="403" y="134" fill="#e6e6e6" font-size="7.2" text-anchor="middle" font-weight="bold">銀行 B・付款</text>
    <text x="403" y="149" fill="#9aa4b2" font-size="6.4" text-anchor="middle">事實表</text>
    <rect x="472" y="116" width="96" height="44" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="520" y="134" fill="#d6a45c" font-size="7.2" text-anchor="middle" font-weight="bold">現金入帳</text>
    <text x="520" y="149" fill="#9aa4b2" font-size="6.4" text-anchor="middle">營運標記</text>
    <rect x="14" y="112" width="62" height="52" rx="5" fill="none" stroke="#9b6ff0" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="45" y="130" fill="#9b6ff0" font-size="6.2" text-anchor="middle">150,000</text>
    <text x="45" y="142" fill="#9b6ff0" font-size="6.2" text-anchor="middle">單筆上限 3 萬</text>
    <text x="45" y="154" fill="#9b6ff0" font-size="6.2" text-anchor="middle">= 五筆事實</text>
    <rect x="120" y="212" width="160" height="40" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="200" y="228" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">webhook(即時)</text>
    <text x="200" y="243" fill="#9aa4b2" font-size="6.4" text-anchor="middle">銀行主動通知</text>
    <rect x="300" y="212" width="160" height="40" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="380" y="228" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">polling(兜底)</text>
    <text x="380" y="243" fill="#9aa4b2" font-size="6.4" text-anchor="middle">排程主動查單</text>
    <line x1="200" y1="212" x2="240" y2="162" stroke="#54b890" stroke-width="1.1" marker-end="url(#rpg)"/>
    <line x1="380" y1="212" x2="350" y2="162" stroke="#54b890" stroke-width="1.1" marker-end="url(#rpg)"/>
    <text x="290" y="278" fill="#9aa4b2" font-size="7.4" text-anchor="middle">雙通道寫進同一組事實表——事實冪等,重疊無害,互為備援</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">每個 provider 一張事實表、只進不改;payment 的狀態是讀取時算出來的,不是被誰更新出來的。</figcaption>
</figure>

三個設計決定,注意它們環環相扣:

- **每個第三方一張事實表。** 銀行 A 的轉帳、銀行 A 的信用卡、銀行 B、現金——各自的原始事實各自存,不揉進同一張「通用付款表」硬塞欄位。新增付款方式=新增一張事實表+一條聚合規則,「現金」就只是一個由營運標記入帳的 provider。
- **payment 的狀態是派生的,讀取時才算。** 已付與否=入帳事實加總對應付金額,不存在一個被 UPDATE 的狀態欄位。
- **webhook 和 polling 都做,寫同一組事實表。** 教科書要你在「即時但可能漏」和「可靠但慢」之間選——這裡全都要。

## 教科書的三個坑

先把坑講清楚,因為它們是真的,業界天天在踩。在「回調**更新狀態**」的世界裡:

1. **重複通知**:銀行重送一次「付款成功」,你的狀態就轉移兩次——輕則 log 髒掉,重則重複出貨、重複開發票。所以要設計冪等鍵。
2. **亂序**:「付款成功」比「訂單成立」的內部處理先到,或兩筆部分付款的通知顛倒——狀態機走錯方向,可能永遠回不來。所以要序號、要緩衝、要補償邏輯。
3. **根本不來**:網路丟了、銀行忘了,你的訂單卡在「等待付款」直到天荒地老。所以要主動查單兜底。

三個坑,三套防禦,每套都是額外的程式碼和額外的測試面——這是多數金流整合的日常。

## 沒有坑的地形

當年的系統,這三個坑的體感是:「**好像沒遇到什麼問題**」。把上面的架構代入,原因一目瞭然:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 234" role="img" aria-label="兩種世界的對比。左側打叉:回調更新狀態的世界,webhook 直接 UPDATE 訂單狀態——重複通知造成狀態轉移兩次、亂序讓狀態倒退、通知失蹤讓狀態永遠卡住,三個坑各需一套防禦。右側打勾:回調只寫事實、狀態讀取時派生的世界——重複等於同一筆事實再落一次,無害;亂序無所謂,聚合是讀的時候算的;失蹤由 polling 把事實補上。三個坑失去攻擊面,因為沒有可以被打壞的狀態。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="290" y1="14" x2="290" y2="210" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="145" y="28" fill="#e05a7d" font-size="9" text-anchor="middle" font-weight="bold">✗ 回調更新狀態</text>
    <rect x="40" y="40" width="210" height="26" rx="5" fill="#3a2632" stroke="#e05a7d" stroke-width="1.2"/>
    <text x="145" y="57" fill="#e6e6e6" font-size="7.2" text-anchor="middle">webhook → UPDATE 狀態欄位</text>
    <text x="145" y="92" fill="#e05a7d" font-size="7.4" text-anchor="middle">重複通知 → 狀態轉移兩次</text>
    <text x="145" y="116" fill="#e05a7d" font-size="7.4" text-anchor="middle">亂序 → 狀態倒退、走錯方向</text>
    <text x="145" y="140" fill="#e05a7d" font-size="7.4" text-anchor="middle">沒來 → 永遠卡在「等待付款」</text>
    <text x="145" y="176" fill="#9aa4b2" font-size="6.8" text-anchor="middle">每個坑都要一套防禦:</text>
    <text x="145" y="190" fill="#9aa4b2" font-size="6.8" text-anchor="middle">冪等鍵、序號緩衝、補償查詢</text>
    <text x="435" y="28" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">✓ 回調寫事實,狀態讀時派生</text>
    <rect x="330" y="40" width="210" height="26" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="435" y="57" fill="#e6e6e6" font-size="7.2" text-anchor="middle">webhook / polling → INSERT 事實</text>
    <text x="435" y="92" fill="#54b890" font-size="7.4" text-anchor="middle">重複 → 同一筆事實,落幾次都一樣</text>
    <text x="435" y="116" fill="#54b890" font-size="7.4" text-anchor="middle">亂序 → 聚合是讀時算的,不在乎順序</text>
    <text x="435" y="140" fill="#54b890" font-size="7.4" text-anchor="middle">沒來 → polling 把事實補上</text>
    <text x="435" y="176" fill="#9aa4b2" font-size="6.8" text-anchor="middle">沒有可以被打壞的狀態,</text>
    <text x="435" y="190" fill="#9aa4b2" font-size="6.8" text-anchor="middle">三個坑整組失去攻擊面</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同樣的三個威脅,兩種地形:一邊要蓋三座碉堡,一邊根本沒有可攻擊的東西。</figcaption>
</figure>

- **重複通知?** 回調只是把「銀行 A 說這筆轉帳入帳了」這個事實寫下來——同一筆事實寫幾次,聚合出來的答案都一樣。
- **亂序?** 五筆部分付款誰先到誰後到,根本不重要——事實各自落地,`SUM` 是讀的時候算的。
- **沒來?** polling 排程會把漏掉的事實補上——而且因為冪等,polling 和 webhook 重疊也無害,雙通道互為備援。

三套防禦的成本歸零,因為**沒有可以被打壞的狀態**。這是整個系列「事實 append、狀態派生」主旋律的最終回收:同一個原則,在[[rezero-comment-order|留言層]]給了你重放、在[[rezero-inventory|庫存層]]給了你對帳、在金流層直接讓最兇的一類 bug 絕種。

對帳也順著這個結構分了級:某家銀行的付款記錄會帶 orders payment id,**自動對回**;現金靠營運標記——又是一個「自動收大宗、人工收殘量」的漏斗,跟[[rezero-identity|身分章]]的綁定漏斗同構。

## 退款:系統退到觀察者的位置

退款的故事是[[rezero-cart-order|狀態機教訓]]的姊妹篇。當年認真做了退款 API——串好銀行、包好流程——結果**營運人員不愛用**。他們習慣直接開銀行後台按退款,快、熟、看得到餘額。

掙扎過後的決定:放手。營運去銀行按他們的,按完把訂單狀態標成「退款中」——然後**排程接手,sync 退款的實際進度**。系統從「執行者」退到「觀察者」:**人做動作,系統對帳**。

這個退位其實跟整章的架構一脈相承:退款進度也只是另一組事實,誰觸發的不重要,系統的職責是把事實追回來、把狀態派生對。硬要營運走你的 API,本質上是把自尊建在「別人要不要用你的介面」上;讓系統有能力追上現實,才是把工程花在對的地方。

## 反思

### 最好的防禦,是選地形

金流整合的文章多半在教你怎麼把三個坑守好:冪等鍵怎麼設計、亂序怎麼緩衝、補償查詢多久跑一次。這些都對,但它們是**在錯的地形上打仗的技巧**。當年的系統沒有這些防禦,卻也沒有這些傷——因為「事實只進不改、狀態讀時派生」讓坑本身不存在。這給我的長期教訓是:遇到一類反覆出現的 bug,先別急著加防禦,**問一句:有沒有一種資料模型,讓這類 bug 沒有立足點?** 防禦是利息,地形是本金。

### 錢的系統,謙遜比聰明重要

這章有兩次「退讓」:狀態不做轉移限制(跟著事實走)、退款不走自家 API(讓營運去銀行按)。兩次都是系統對現實低頭——而回頭看,兩次都對。錢的流動牽著銀行、營運、客人三方,你的系統永遠只是其中一個參與者;把自己定位成「所有金錢事實的忠實帳本」,而不是「金錢流程的唯一入口」,反而讓正確性更容易守住。**帳本不需要控制世界,只需要如實記下世界。**

### 「沒遇到什麼問題」是最高級的戰果

金流照理是整個系統最容易出事的地方——外部依賴最多、不可靠網路、錢的違約成本最高——但它是這個系列寫到現在最平靜的一章。連著兩章「無聊」([[rezero-cart-order|上一章]]的結帳也是),而且無聊的原因相同:前面把事實與派生的關係擺對了,後面的複雜度就長不出來。這也是工程裡最不公平的一件事:**好架構的回報,以「沒有故事」的形式發放**——出事救火的人人看得見,讓火燒不起來的人沒有戰功。我後來當 EM,很大一部分工作就是學會看見、並獎勵這種「沒有故事」的人。
