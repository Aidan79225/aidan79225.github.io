---
title: "交易:快照隔離擋不住的 write skew,與可串行化的三條路"
date: 2026-07-24
category: tech
description: "隔離層級與 MVCC 在 SQL 系列講過了;DDIA Ch7 真正的加值,是點名兩個連快照隔離都擋不住的陰險傢伙:lost update(讀-改-寫互相蓋掉)和 write skew(兩筆交易各自都對、合起來打破不變量——值班醫生同時請假的經典)。以及,如果你真的需要最強保證,通往可串行化的三條路:真的一筆一筆跑(Redis/VoltDB 的單執行緒)、兩階段鎖(悲觀)、SSI(樂觀,先跑完再驗證)。"
tags:
  - distributed-systems
  - book-notes
  - transactions
series: "Designing Data-Intensive Applications 讀書筆記"
seriesOrder: 7
comments: true
draft: false
---
交易的地基我在 [[sql-transactions|SQL 系列]]鋪過了:ACID 的重點是 I、髒讀/不可重複讀/幻讀三種怪事、四個隔離層級的光譜、MVCC 怎麼讀不擋寫——那些這篇不重複。DDIA Ch7 真正的加值在後半:**兩個連「快照隔離」都擋不住的陰險傢伙**(lost update 與 write skew),以及當你真的需要最強保證時,**通往可串行化(serializable)的三條路**。先說結論:多數人以為開了快照隔離就安全了——**這章專門打破這個安全感。**

## Lost update:兩個「讀-改-寫」互相蓋掉

第一個傢伙還算好認:**兩筆交易都做「讀出來 → 算一算 → 寫回去」**,並發時彼此看不見對方——各自從 42 讀起、各自 +1、各自寫回 43,**其中一次更新就這樣蒸發了**。解法你其實都見過:**用原子操作**(`UPDATE SET counter = counter + 1`,把讀改寫壓成一步——[[redis-single-thread|Redis 的 INCR]] 同款)、**顯式上鎖**(`SELECT ... FOR UPDATE`)、或**CAS 樂觀鎖**(寫回時驗證值沒被動過——[[redis-pipeline-transaction|Redis 的 WATCH]] 同款)。lost update 有成熟的藥,真正難纏的是下一個。

## Write skew:各自都對,合起來錯

**Write skew** 是這章的招牌,也是最違反直覺的一個。經典場景:醫院規定**至少要有兩位醫生值班**,現在 Alice 和 Bob 都想請假:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 242" role="img" aria-label="write skew 的時序。系統不變量:至少兩位醫生值班,目前 Alice 與 Bob 都在值班。兩筆交易並發:Alice 的交易先檢查目前值班人數,讀到 2、大於等於 2,檢查通過,於是把自己改成請假;同一時間 Bob 的交易也檢查,因為快照隔離讓它看到的還是舊快照,也讀到 2,檢查也通過,也把自己改成請假。兩筆交易改的是不同的列,沒有寫入衝突,快照隔離兩筆都放行。結果值班人數變成 0,不變量被打破。關鍵:每筆交易單獨看都正確,合起來卻錯,因為檢查所依據的條件,被對方的寫入悄悄改變了。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="ws" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">不變量:值班醫生 ≥ 2(目前:Alice、Bob 都在)</text>
    <text x="60" y="46" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">Alice 的交易</text>
    <rect x="110" y="34" width="180" height="22" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="200" y="49" fill="#e6e6e6" font-size="7.4" text-anchor="middle">① 查值班人數 → 讀到 2 ≥ 2 ✓</text>
    <rect x="322" y="34" width="180" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="412" y="49" fill="#e6e6e6" font-size="7.4" text-anchor="middle">② 把「自己」改成請假</text>
    <line x1="290" y1="45" x2="320" y2="45" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ws)"/>
    <text x="60" y="94" fill="#d6a45c" font-size="9" text-anchor="middle" font-weight="bold">Bob 的交易</text>
    <rect x="110" y="82" width="180" height="22" rx="4" fill="#262b3a" stroke="#d6a45c" stroke-width="1.2"/><text x="200" y="97" fill="#e6e6e6" font-size="7.4" text-anchor="middle">① 查值班人數 → 也讀到 2 ✓</text>
    <rect x="322" y="82" width="180" height="22" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="412" y="97" fill="#e6e6e6" font-size="7.4" text-anchor="middle">② 把「自己」改成請假</text>
    <line x1="290" y1="93" x2="320" y2="93" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ws)"/>
    <text x="200" y="122" fill="#9aa4b2" font-size="7" text-anchor="middle">(快照隔離:兩人看到的都是「舊快照」的 2)</text>
    <text x="412" y="122" fill="#9aa4b2" font-size="7" text-anchor="middle">(改的是「不同列」→ 沒有寫入衝突,都放行)</text>
    <rect x="140" y="140" width="300" height="30" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.6"/>
    <text x="290" y="159" fill="#e05a7d" font-size="9.4" text-anchor="middle" font-weight="bold">結果:值班人數 = 0,不變量被打破 💥</text>
    <rect x="40" y="184" width="500" height="44" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="202" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">每筆交易「單獨看」都對;錯在:你檢查所依據的條件,被對方的寫入悄悄改掉了</text>
    <text x="290" y="219" fill="#9aa4b2" font-size="7.6" text-anchor="middle">同款劇本:會議室重複預訂、帳號搶同一個 username、餘額分兩筆同時扣</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">兩筆交易都是「<b>先檢查、再動作</b>」:各自查值班人數(快照隔離下都讀到舊快照的 2 ✓),各自把<b>自己那一列</b>改成請假。因為改的是<b>不同的列</b>,沒有寫入衝突,快照隔離兩筆都放行——結果值班人數歸零。<b style="color:#e05a7d">每筆交易單獨看都正確,合起來卻打破了不變量</b>——因為你檢查所依據的條件,被對方的寫入悄悄改掉了。這就是 <b>write skew</b>;把「查人數」換成「查會議室空不空」「查 username 有沒有人用」,就是你身邊的版本。而幻讀(phantom)是它的燃料:你檢查的是「某個條件的查詢結果」,而別人的寫入改變了那個結果</figcaption>
</figure>

為什麼一般手段治不了它:兩筆交易**寫的是不同的列**,所以偵測「同列寫入衝突」的快照隔離抓不到;你想 `FOR UPDATE` 鎖,但**該鎖的東西可能根本還不存在**(檢查「沒有人訂這間會議室」——你要鎖的是「不存在的訂單」,這就是幻讀搞的鬼)。治本只有兩條:**具體化衝突**(把「抽象的條件」變成一列真實的資料去鎖,例如每個時段一列的會議室表),或者——升級到真正的**可串行化**。

## 可串行化的三條路

Serializable 的定義很純:**執行結果等同於「所有交易一筆接一筆跑」**。有趣的是,實作它的三條路,性格天差地遠:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 226" role="img" aria-label="通往可串行化的三條路。第一條:真的一筆一筆跑,單執行緒序列執行,沒有並發就沒有並發問題,Redis 與 VoltDB 走這條,前提是每筆交易要快、資料在記憶體、不能有互動等待。第二條:兩階段鎖 2PL,悲觀派,讀寫都上鎖、讀寫互擋,先擋再說,安全但延遲高、throughput 差、會死鎖。第三條:SSI 可串行化快照隔離,樂觀派,大家先跑,提交時驗證有沒有被別人影響,有就 abort 重試,衝突少時效能好,衝突多時一直重試。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="193" y1="14" x2="193" y2="186" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="387" y1="14" x2="387" y2="186" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="97" y="28" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">① 真的一筆一筆跑</text>
    <rect x="36" y="42" width="122" height="52" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/>
    <text x="97" y="62" fill="#e6e6e6" font-size="7.6" text-anchor="middle">單執行緒序列執行</text>
    <text x="97" y="78" fill="#9aa4b2" font-size="7" text-anchor="middle">沒有並發 = 沒有並發問題</text>
    <text x="97" y="114" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">最強隔離,來自最笨的方法</text>
    <text x="97" y="132" fill="#e0733a" font-size="7" text-anchor="middle">前提:每筆都快(記憶體、無互動)</text>
    <text x="97" y="152" fill="#9aa4b2" font-size="6.8" text-anchor="middle">Redis(Lua/MULTI)/ VoltDB</text>
    <text x="290" y="28" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">② 兩階段鎖 2PL(悲觀)</text>
    <rect x="229" y="42" width="122" height="52" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="290" y="62" fill="#e6e6e6" font-size="7.6" text-anchor="middle">讀寫都上鎖、讀寫互擋</text>
    <text x="290" y="78" fill="#9aa4b2" font-size="7" text-anchor="middle">「先擋再說」</text>
    <text x="290" y="114" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">安全,歷史悠久</text>
    <text x="290" y="132" fill="#e0733a" font-size="7" text-anchor="middle">延遲高、throughput 差、會死鎖</text>
    <text x="290" y="152" fill="#9aa4b2" font-size="6.8" text-anchor="middle">傳統 serializable(MySQL 等)</text>
    <text x="483" y="28" fill="#9b6ff0" font-size="9.4" text-anchor="middle" font-weight="bold">③ SSI(樂觀)</text>
    <rect x="422" y="42" width="122" height="52" rx="6" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.4"/>
    <text x="483" y="62" fill="#e6e6e6" font-size="7.6" text-anchor="middle">大家先跑,提交時驗證</text>
    <text x="483" y="78" fill="#9aa4b2" font-size="7" text-anchor="middle">被人影響過 → abort 重試</text>
    <text x="483" y="114" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">衝突少時,幾乎不付代價</text>
    <text x="483" y="132" fill="#e0733a" font-size="7" text-anchor="middle">衝突多時,一直 abort 重試</text>
    <text x="483" y="152" fill="#9aa4b2" font-size="6.8" text-anchor="middle">PostgreSQL 的 serializable</text>
    <rect x="30" y="196" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="213" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">交易夠短夠快 → ①;衝突機率高 → ②(先鎖);衝突少 → ③(先跑,偶爾重試)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#54b890">① 序列執行</b>:乾脆不並發——單執行緒一筆接一筆,並發問題從根本上不存在。<a href="/blog/redis-single-thread/">Redis</a>(MULTI/Lua)與 VoltDB 走這條;前提是每筆交易都快(資料在記憶體、交易內不等外部)。<b style="color:#4f6df5">② 2PL</b>(悲觀):讀寫都上鎖、讀寫互擋——「反正會出事,先擋再說」;安全但延遲與 throughput 都難看,還會<a href="/blog/sql-transactions/">死鎖</a>。<b style="color:#9b6ff0">③ SSI</b>(樂觀):讓大家先跑,提交時驗證「你讀過的東西有沒有被別人改」,有就 abort 重試——衝突少時幾乎免費,衝突多時一直重試白工。<b>選哪條,取決於你的交易多快、衝突多常發生</b></figcaption>
</figure>

## 反思

### 「先檢查、再動作」是並發世界的頭號紅旗

write skew 給我的最大禮物,是一個**可掃描的程式碼氣味**:任何「先 SELECT 檢查條件、通過後再寫入」的段落,在並發下都是嫌疑犯——因為**檢查與動作之間,世界可能已經變了**。查餘額再扣款、查庫存再下單、查 username 沒人用再註冊、[[redis-distributed-lock|查鎖是自己的再釋放]]——全是同一個 check-then-act 的形狀。現在我 review 到這種段落,反射動作就是三連問:**這兩步是原子的嗎?不是的話,靠什麼保證中間沒人插進來?插進來會打破什麼不變量?** 十次有八次,作者沒想過第三題。這個氣味偵測器,比背任何隔離層級的定義都值錢。

### 最強的隔離,來自最笨的方法——這件事很美

可串行化的三條路裡,我最愛的是第一條:**乾脆不要並發。** 幾十年來大家拚命發明更聰明的鎖、更精巧的驗證,結果 Redis 和 VoltDB 說:記憶體夠快了,我單執行緒一筆一筆跑,並發問題**從定義上就不存在**。這正是我在 [[redis-single-thread|Redis 單執行緒]]那篇讚嘆過的「用簡單換可預測」——而 DDIA 把它放進交易理論的脈絡後更清楚了:**那不是取巧,是一條正統的 serializable 實作路線**,前提條件(交易短、資料在記憶體、不等外部)寫得明明白白。它提醒我:當硬體或場景變了,「最笨的方法」要重新評估一次——很多聰明設計,只是在為已經消失的瓶頸付複雜度。

### 悲觀還是樂觀,問衝突率就對了

2PL vs SSI,說到底又是那道熟題:**成本付在事前(先鎖住,人人排隊)還是事後(先跑完,撞到重試)?** 判準乾淨得很——**衝突率**。搶同一筆熱資料的交易多,樂觀派會 abort 到懷疑人生,不如悲觀先鎖;衝突稀少,悲觀派的鎖就是白付的稅,樂觀幾乎免費。這跟 [[redis-pipeline-transaction|Redis 的 WATCH]]、跟 git 的 merge(樂觀:先各改各的,衝突才解)是同一道光譜。我後來把它用成一個通用決策框架:**任何「協調」機制,先估衝突率,再決定買保險(悲觀)還是自負額(樂觀)。** 下一章更狠——當交易要跨機器,連「鎖」和「驗證」本身都變得不可靠,那才是分散式真正的麻煩。
