---
title: "庫存:不能超賣,是這個系統唯一的鐵律"
date: 2026-07-26
category: tech
description: "直播代購的心臟章:不存「剩餘」、存上限與消耗的帳本設計,Serializable 先查再扣的失敗偏差,一次由需求變更與 migration 引爆的真實超賣,以及檔期結算與每小時重算的自我修復。"
tags:
  - war-story
  - live-commerce
  - inventory
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 5
comments: true
draft: false
---
[[rezero-comment-order|留言]]解析完、[[rezero-identity|身分]]掛好單,主線走到心臟:**庫存**。這個系統的功能清單可以慢慢長,但只有一條規則從第一天就是鐵律——**不能超賣**。賣掉不存在的貨,是要一個一個跟客人道歉退款的。這章講當年怎麼守這條不變量、它被什麼打破過(答案會出乎意料),以及重來會怎麼守。

## 帳本的形狀:不存「剩餘」,存上限與消耗

最直覺的庫存設計,是存一個「剩餘庫存」欄位,賣一件減一、退一件加一。當年沒有這樣做,而是把帳本拆成**一個上限、兩個消耗**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 300" role="img" aria-label="庫存帳本的模型。左側是 product 表,放價格與商品資訊,直播中會變動。右側是與它一對一的庫存表,存三個數字:庫存上限(主播追加貨就是調這裡)、購物車數量(預留)、訂單數量(成交);付款時購物車數量轉為訂單數量,在同一筆交易內完成。中間標出不變量:購物車加訂單必須小於等於上限;可賣是導出值,不另外儲存。下方四個寫入者:FSM batch 下單與改單、客人調數量、客服清除調整、營運追加貨與結束檔期,全部指向這張庫存表。最底下標註每小時從 cart items 與 order items 全量重算兩個計數,作為派生值的自我修復。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rvf" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rvm" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="20" y="46" width="170" height="58" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="105" y="66" fill="#e6e6e6" font-size="8.8" text-anchor="middle" font-weight="bold">product</text>
    <text x="105" y="81" fill="#9aa4b2" font-size="6.8" text-anchor="middle">價格、商品資訊</text>
    <text x="105" y="94" fill="#9aa4b2" font-size="6.8" text-anchor="middle">直播中會一直變</text>
    <line x1="190" y1="75" x2="228" y2="75" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="209" y="66" fill="#9aa4b2" font-size="6.4" text-anchor="middle">1:1</text>
    <rect x="230" y="24" width="326" height="122" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.6"/>
    <text x="393" y="42" fill="#d6a45c" font-size="9.2" text-anchor="middle" font-weight="bold">庫存表(熱資料,獨立一張)</text>
    <rect x="246" y="52" width="294" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="393" y="68" fill="#e6e6e6" font-size="7.6" text-anchor="middle">庫存上限 —— 主播追加貨=只調這裡</text>
    <rect x="246" y="82" width="140" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="316" y="98" fill="#4f6df5" font-size="7.4" text-anchor="middle">購物車數量(預留)</text>
    <rect x="400" y="82" width="140" height="24" rx="4" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="470" y="98" fill="#54b890" font-size="7.4" text-anchor="middle">訂單數量(成交)</text>
    <line x1="386" y1="94" x2="398" y2="94" stroke="#54b890" stroke-width="1.2" marker-end="url(#rvf)"/>
    <text x="393" y="120" fill="#9aa4b2" font-size="6.6" text-anchor="middle">付款:購物車 → 訂單,同一筆交易內轉移</text>
    <text x="393" y="136" fill="#e6e6e6" font-size="7.8" text-anchor="middle" font-weight="bold">不變量:購物車 + 訂單 ≤ 上限(可賣=導出值,不存「剩餘」)</text>
    <rect x="20" y="196" width="120" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="80" y="212" fill="#e6e6e6" font-size="7.4" text-anchor="middle">FSM batch</text>
    <text x="80" y="226" fill="#9aa4b2" font-size="6.2" text-anchor="middle">下單・LWW 改單</text>
    <rect x="160" y="196" width="120" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="220" y="212" fill="#e6e6e6" font-size="7.4" text-anchor="middle">客人</text>
    <text x="220" y="226" fill="#9aa4b2" font-size="6.2" text-anchor="middle">自行調整數量</text>
    <rect x="300" y="196" width="120" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="360" y="212" fill="#e6e6e6" font-size="7.4" text-anchor="middle">客服</text>
    <text x="360" y="226" fill="#9aa4b2" font-size="6.2" text-anchor="middle">清除・調整購物車</text>
    <rect x="440" y="196" width="120" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="500" y="212" fill="#e6e6e6" font-size="7.4" text-anchor="middle">營運</text>
    <text x="500" y="226" fill="#9aa4b2" font-size="6.2" text-anchor="middle">追加貨・結束檔期</text>
    <line x1="80" y1="196" x2="290" y2="150" stroke="#4f6df5" stroke-width="1" marker-end="url(#rvf)"/>
    <line x1="220" y1="196" x2="340" y2="150" stroke="#4f6df5" stroke-width="1" marker-end="url(#rvf)"/>
    <line x1="360" y1="196" x2="390" y2="150" stroke="#4f6df5" stroke-width="1" marker-end="url(#rvf)"/>
    <line x1="500" y1="196" x2="450" y2="150" stroke="#4f6df5" stroke-width="1" marker-end="url(#rvf)"/>
    <text x="290" y="264" fill="#9aa4b2" font-size="7.4" text-anchor="middle">寫入者有四方——但每小時會從 cart/order items 全量重算兩個計數(派生值的自我修復)</text>
    <line x1="290" y1="270" x2="393" y2="150" stroke="#9aa4b2" stroke-width="0.9" stroke-dasharray="3 3" opacity="0"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">帳本三個數字:上限只被追加貨調整、兩個消耗各自累積;「剩餘」永遠用算的,不用存的。</figcaption>
</figure>

這個形狀有三個當年就做對的判斷:

- **熱冷分離。** 商品資訊直播中會一直變——主播現場喊價、現場跟廠商追加到貨——所以 product 表是「會被營運頻繁編輯的冷資料」,庫存表是「被下單交易高頻打的熱資料」,拆開,鎖的範圍就只罩熱列。
- **不存「剩餘」。** 剩餘=上限−購物車−訂單,永遠用算的。存剩餘的問題是**語意混濁**:每一次補償、改單、追加貨都在同一個數字上疊,錯一次就永久漂移,而且你永遠不知道它「本來應該是多少」。分開存,每個數字語意單純:上限只被追加貨動、購物車只進不出(付款轉出、改單修正)、訂單只在付款時加——歪掉時,每個數字都有自己的對帳對象。
- **預留與成交分開數。** 購物車數量(佔著但還沒付)與訂單數量(付了)分開,超賣公式是**兩者之和**對上限;主播看的「賣了多少」是總和,一樣即時,而「預留→成交」的轉化率順便成了免費的營運指標——棄單率,風控那章會再見到它。

## 扣庫存:當年的三板斧,與它的偏差

併發扣庫存的標準選項有三條路:資料庫鎖、[[redis-distributed-lock|Redis 原子操作]]、單一寫入者排隊。當年的組合是第一條的重裝版:**ORM + transaction、先查再扣、Serializable 隔離、噴錯就重試**。[[ddia-transactions|Serializable]] 保證「先查再扣」的間隙不會被人插隊——擠進來的交易會直接失敗,重試,重試再失敗⋯⋯然後,**那位顧客就被略過了**。

先講公道話:這套當年**沒有超賣過**(超賣另有兇手,下一節)。單一 batch 消費者本來就把大部分的寫入天然序列化了,Serializable 是對付其餘寫入者(客人調數量、客服調整、營運追加)的保險帶,邏輯上無懈可擊。

問題出在失敗的**分佈**。重試耗盡的顧客不是隨機掉的:衝突集中在哪裡,犧牲就集中在哪裡——衝突永遠集中在**最搶手的商品**。也就是說:**你賣得越好的商品,無聲消失的客人越多。** 這個偏差安靜、不報錯、不進任何儀表板,是我現在回看最想修的一刀。

重來的修法出奇地便宜——把「先查再扣」壓成**一句條件更新**:

```sql
UPDATE inventory
   SET cart_qty = cart_qty + 2
 WHERE product_id = :pid
   AND stock_cap - cart_qty - order_qty >= 2;
-- 影響 0 列=沒搶到,直接回「完售」;
-- 查與扣之間沒有間隙,也就沒有 Serializable、沒有重試風暴
```

檢查和扣減在同一個原子動作裡,不變量由 `WHERE` 子句守著:搶不到就是乾淨的 0 列,不用隔離級別撐腰、不用重試、也就沒有重試耗盡的偏差。單列的原子條件更新,是關聯式資料庫最被低估的併發原語。

## 那次真的超賣:兇手不是併發,是一次 migration

這個系統真的超賣過一次。所有人的直覺都會猜是鎖沒上好——不是。**公式從頭到尾沒破,破的是公式裡一個詞的定義。**

原設計裡,只有直播下單的購物車**佔**賣出數量;商城(平台)加入的購物車是**意向**,不佔。後來需求方希望商城購物車也算進賣出數量——改起來不難,改完跑一次 migration,把歷史的商城購物車全部納入計數。然後:**賣出數量瞬間暴增,直接衝破庫存上限。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 216" role="img" aria-label="超賣事故的前後對比。改動前:庫存上限一百,直播購物車佔用六十,商城購物車是意向、五十件、不計入佔用,不變量成立。需求變更加上 migration 之後:歷史商城購物車被追溯升格為佔用,佔用變成六十加五十共一百一十,超過上限一百,超賣十件。公式沒變,是「賣出」的定義被改了,而且追溯套用到歷史資料。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rvp" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e05a7d"/></marker></defs>
    <text x="145" y="26" fill="#54b890" font-size="9.2" text-anchor="middle" font-weight="bold">改動前:意向不佔庫存</text>
    <rect x="30" y="40" width="230" height="26" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/>
    <rect x="30" y="40" width="138" height="26" rx="5" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="99" y="57" fill="#d6a45c" font-size="7.2" text-anchor="middle">直播購物車 60(佔)</text>
    <text x="214" y="57" fill="#9aa4b2" font-size="7" text-anchor="middle">餘 40</text>
    <text x="145" y="82" fill="#9aa4b2" font-size="7" text-anchor="middle">上限 100</text>
    <rect x="30" y="94" width="115" height="24" rx="5" fill="none" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="87" y="110" fill="#9aa4b2" font-size="6.8" text-anchor="middle">商城購物車 50(意向)</text>
    <text x="145" y="140" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">60 ≤ 100 ✓ 不變量成立</text>
    <line x1="290" y1="30" x2="290" y2="150" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="435" y="26" fill="#e05a7d" font-size="9.2" text-anchor="middle" font-weight="bold">需求變更 + migration 之後</text>
    <rect x="320" y="40" width="230" height="26" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/>
    <rect x="320" y="40" width="138" height="26" rx="5" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.2"/>
    <rect x="458" y="40" width="92" height="26" rx="5" fill="#3a2632" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="389" y="57" fill="#d6a45c" font-size="7.2" text-anchor="middle">直播 60(佔)</text>
    <text x="504" y="57" fill="#e05a7d" font-size="7" text-anchor="middle">商城 50(佔)</text>
    <line x1="560" y1="53" x2="576" y2="53" stroke="#e05a7d" stroke-width="1.2" marker-end="url(#rvp)"/>
    <text x="435" y="82" fill="#9aa4b2" font-size="7" text-anchor="middle">上限 100,佔用 110——溢出的 10 件,就是超賣</text>
    <text x="435" y="140" fill="#e05a7d" font-size="8" text-anchor="middle" font-weight="bold">110 &gt; 100 ✗ 歷史意向被追溯升格成佔用</text>
    <text x="290" y="186" fill="#9aa4b2" font-size="7.6" text-anchor="middle">公式沒變、鎖也沒失守——是「賣出」兩個字的定義變了,而且套用到了歷史資料上</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">殺死不變量的不是併發:migration 把過去的「意向」一夜之間全部升格成「佔用」,歷史不會替新定義騰出空間。</figcaption>
</figure>

事後拆解,這裡有兩個獨立的錯誤疊在一起:

1. **語意錯誤**:商城購物車是「還沒承諾的意向」,把它算進佔用,等於把庫存借給不一定會來的人——原設計的「直播佔、商城不佔」區分,其實正是**預留(reservation)與意向(intent)**的正確分界。
2. **追溯錯誤**:就算業務真的要改,migration 把新語意**套到歷史資料上**才是引爆點。歷史資料是在舊規則下形成的,新規則生效的那一刻,世界不會重新排隊給你。

我重來的立場很簡單:**這個需求我會踩死。** 如果真的頂不住,也只有兩個安全檔位——新語意只對**新資料**生效(不 migrate);或商城佔用另設配額與時效,並且上線前先 dry-run 算出每個商品的計數會變成多少。「直接改+migrate」是唯一絕對錯誤的選項,而它恰恰是最順手的那個。這條教訓值得放大成一句話:**不變量不是程式碼,是語意契約——改公式裡任何一個詞的定義,都是在重寫歷史資料的意義。**

## 守住之後:釋放、重算,與大掃除

佔了就要放,不然庫存會慢性失血。當年的釋放不是 TTL 倒數,是**結算日**:直播以一週一個檔期為購買週期,檔期結束打一支「結束檔期 API」——清掉檔期下的購物車、未付款的訂單,並依條件把不付款的人加入黑名單(懲罰在週期邊界執行,是下一檔期的門票管制)。這支一次清一整檔的 API,當年跑起來**意外地順**——回頭看是紀律的回報:除了那次量測後的精準反正規化([[rezero-identity|上一章]]的 fb_user_id),整個 schema 乖乖遵守 3NF,大掃除時沒有散落各處的派生資料要跟著擦。**正規化平常看不出好處,在大規模刪除和結算的那一刻連本帶利還你。**

另外兩道防線:

- **每小時全量重算。** 兩個計數的真相是 cart items 和 order items,計數只是它們的快取;每小時從真相重建一次,漂移的上界被壓在一小時內——最終一致性的自我修復,也是三本帳那章的迷你預告。重來只補一件事:**重算出的差異要記錄、要告警**——差異不為零代表某條增量路徑有 bug,默默蓋掉等於把 bug 的訊號一起擦掉。
- **追加貨改走調整帳。** 當年直播中追加庫存的 API 會打失敗——開賣瞬間幾百個下單交易在同一列上排隊,營運的 UPDATE 擠不進去,現場只能人工重打,等於讓營運當了重試機制。重來把追加貨改成 append 的**調整帳(adjustments ledger)**:`上限 = 初始 + SUM(調整)`,營運寫入永遠是 insert 新列、不碰熱列,而且自帶「誰、何時、加了多少」的 audit——後台章要的操作留痕,順便解決。

## 反思

### 不變量是語意契約,寫在程式碼之前

這章最重要的教訓,是超賣事故給的:守住不變量的最大威脅不是併發、不是 bug,是**一個聽起來很合理的需求變更**。「商城購物車也算賣出」在會議室裡毫無殺氣,沒有人覺得自己正在動一條鐵律的定義。工程師在這種時刻的職責,不是評估「改起來多難」——是認出**這個需求在改語意,不是在加功能**,然後把後果攤開來:要嘛不改,要嘛只對新資料生效,要嘛先 dry-run 給大家看數字。當年我們把它當一般需求做了;重來,這是我會用力說「不」的少數時刻。資深與否的差別,常常不在會多少技術,在**認得出哪些字不能隨便改**。

### 誠實的帳本,自己會長成 event sourcing 的形狀

把這個系統的資料模型排開:留言先落地再消費、上限與消耗分開存、付款是新增 order item 而不是改 cart item、重來版的追加貨是 append 調整帳、每小時從事實重算派生值——**事實只增不改,派生隨時可重建**。當年沒有人說過「我們來做 event sourcing」,這些設計是被一個個具體的痛(帳對不上、熱列打架、除錯沒線索)逼出來的。[[ddia-streaming|DDIA 第三部分]]講的那套「事實與派生」,在一個六人團隊的電商系統裡自己長了出來——好的架構模式不是拿來套的,是誠實面對資料語意之後,自然收斂到的形狀。

### 偏差比故障可怕

故障會叫:告警響、圖表掉、所有人衝進來。偏差不會——Serializable 重試耗盡的顧客,一個一個安靜地消失,而且**集中在你最熱賣的商品上**,系統毫無感覺。這是我帶 [[sre-monitoring|SRE]] 之後回頭看最有感的一刀:平均成功率 99% 的系統,可能在最重要的那 1% 流量上是 90%——**平均值會說謊,失敗的分佈才說真話**。重來版用一句條件更新把這個偏差從根拔掉,但更通用的功課是:每次設計「失敗就略過」的路徑時,先問一句——被略過的,會不會恰好都是同一群人?
