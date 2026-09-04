---
title: "複製:單主、多主、無主,與延遲的三個怪象"
date: 2026-07-24
category: tech
description: "把同一份資料放在多台機器上(複製),只為三件事:高可用、低延遲、擴讀。難的從來不是複製本身,是「資料會變」。DDIA Ch5 把全世界的複製方案收斂成三種拓撲——單主(寫都走一個 leader,衝突消滅在源頭,但 failover 難)、多主(多資料中心各自收寫,要解寫入衝突)、無主(客戶端直接寫多個副本,靠 w+r>n 的 quorum 重疊)。再把非同步複製的延遲怪象講成三個有名字的病:read-your-writes、單調讀、一致前綴——有名字,才能對症下藥。"
tags:
  - distributed-systems
  - book-notes
  - replication
series: "Designing Data-Intensive Applications 讀書筆記"
seriesOrder: 5
comments: true
draft: false
---
進入 Part II,資料開始跨機器。第一招是**複製(replication)**:同一份資料放多台,為的是三件事——**一台掛了還能服務(高可用)、資料放得離使用者近(低延遲)、讀流量攤出去(擴讀)**。如果資料不會變,複製就是複製貼上而已;**所有的難,都難在「資料會變」——變更要怎麼傳到每一份副本?** 我在 [[redis-replication|Redis 主從]]那篇拆過其中一種(單主、非同步)的實戰;這篇拉到 DDIA 的高度:**全世界的複製方案,其實只有三種拓撲**,而它們的差別,是「把寫入衝突放在哪裡處理」。

## 三種拓撲:衝突不會消失,只會搬家

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="三種複製拓撲。左邊單主 single-leader:所有寫入走唯一的 leader,再複製給 follower,寫入衝突在源頭就被消滅,因為只有一個寫入點;代價是 leader 掛了要 failover,而 failover 很難。中間多主 multi-leader:常見於多資料中心,每個資料中心有自己的 leader 各自收寫,leader 之間互相同步;代價是兩邊可能同時改同一筆,寫入衝突必須事後解決。右邊無主 leaderless:沒有 leader,客戶端直接同時寫多個副本,讀也同時讀多個,靠 w 加 r 大於 n 的 quorum 重疊保證讀到新值;代價是讀寫路徑複雜,要 read repair。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rp5" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker><marker id="rp5g" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <line x1="193" y1="14" x2="193" y2="208" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="387" y1="14" x2="387" y2="208" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="97" y="26" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">單主 single-leader</text>
    <rect x="62" y="38" width="70" height="26" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="97" y="55" fill="#4f6df5" font-size="8" text-anchor="middle" font-weight="bold">Leader</text>
    <rect x="30" y="96" width="60" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="60" y="112" fill="#9aa4b2" font-size="7" text-anchor="middle">follower</text>
    <rect x="104" y="96" width="60" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="134" y="112" fill="#9aa4b2" font-size="7" text-anchor="middle">follower</text>
    <line x1="88" y1="64" x2="66" y2="94" stroke="#9aa4b2" stroke-width="1" marker-end="url(#rp5)"/><line x1="106" y1="64" x2="128" y2="94" stroke="#9aa4b2" stroke-width="1" marker-end="url(#rp5)"/>
    <line x1="97" y1="20" x2="97" y2="36" stroke="#54b890" stroke-width="1.4" marker-end="url(#rp5g)"/><text x="122" y="33" fill="#54b890" font-size="6.6" text-anchor="middle">所有寫入</text>
    <text x="97" y="140" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">衝突:源頭消滅(單一寫入點)</text>
    <text x="97" y="156" fill="#e0733a" font-size="7.4" text-anchor="middle">代價:failover 難(誰接任?)</text>
    <text x="97" y="172" fill="#9aa4b2" font-size="6.8" text-anchor="middle">MySQL / Postgres / Redis / Kafka</text>
    <text x="290" y="26" fill="#d6a45c" font-size="9.6" text-anchor="middle" font-weight="bold">多主 multi-leader</text>
    <rect x="212" y="44" width="70" height="26" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/><text x="247" y="61" fill="#d6a45c" font-size="7.4" text-anchor="middle" font-weight="bold">Leader A</text>
    <rect x="298" y="44" width="70" height="26" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/><text x="333" y="61" fill="#d6a45c" font-size="7.4" text-anchor="middle" font-weight="bold">Leader B</text>
    <text x="247" y="86" fill="#9aa4b2" font-size="6.4" text-anchor="middle">資料中心 1</text><text x="333" y="86" fill="#9aa4b2" font-size="6.4" text-anchor="middle">資料中心 2</text>
    <path d="M282 52 C 290 48, 290 48, 296 52" fill="none" stroke="#9aa4b2" stroke-width="1" marker-end="url(#rp5)"/><path d="M296 62 C 290 66, 290 66, 282 62" fill="none" stroke="#9aa4b2" stroke-width="1" marker-end="url(#rp5)"/>
    <line x1="247" y1="26" x2="247" y2="42" stroke="#54b890" stroke-width="1.2" marker-end="url(#rp5g)"/><line x1="333" y1="26" x2="333" y2="42" stroke="#54b890" stroke-width="1.2" marker-end="url(#rp5g)"/>
    <rect x="222" y="100" width="136" height="22" rx="4" fill="#3a2626" stroke="#e05a7d" stroke-width="1.2"/><text x="290" y="115" fill="#e05a7d" font-size="7" text-anchor="middle">兩邊同時改同一筆 → 衝突!</text>
    <text x="290" y="140" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">得利:各地就近寫、斷網照收</text>
    <text x="290" y="156" fill="#e0733a" font-size="7.4" text-anchor="middle">代價:寫入衝突要事後解</text>
    <text x="290" y="172" fill="#9aa4b2" font-size="6.8" text-anchor="middle">跨資料中心 / 離線編輯 / 協作文件</text>
    <text x="483" y="26" fill="#9b6ff0" font-size="9.6" text-anchor="middle" font-weight="bold">無主 leaderless</text>
    <rect x="410" y="52" width="44" height="22" rx="4" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.3"/><text x="432" y="67" fill="#9aa4b2" font-size="6.8" text-anchor="middle">副本</text>
    <rect x="462" y="52" width="44" height="22" rx="4" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.3"/><text x="484" y="67" fill="#9aa4b2" font-size="6.8" text-anchor="middle">副本</text>
    <rect x="514" y="52" width="44" height="22" rx="4" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.3"/><text x="536" y="67" fill="#9aa4b2" font-size="6.8" text-anchor="middle">副本</text>
    <text x="484" y="38" fill="#54b890" font-size="6.6" text-anchor="middle">client 同時寫 n 份</text>
    <line x1="462" y1="42" x2="436" y2="50" stroke="#54b890" stroke-width="1.1" marker-end="url(#rp5g)"/><line x1="484" y1="42" x2="484" y2="50" stroke="#54b890" stroke-width="1.1" marker-end="url(#rp5g)"/><line x1="506" y1="42" x2="532" y2="50" stroke="#54b890" stroke-width="1.1" marker-end="url(#rp5g)"/>
    <rect x="414" y="96" width="140" height="24" rx="4" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.2"/><text x="484" y="112" fill="#9b6ff0" font-size="7.6" text-anchor="middle" font-weight="bold">quorum:w + r > n</text>
    <text x="483" y="140" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">得利:沒有 leader,無 failover</text>
    <text x="483" y="156" fill="#e0733a" font-size="7.4" text-anchor="middle">代價:讀寫路徑複雜、read repair</text>
    <text x="483" y="172" fill="#9aa4b2" font-size="6.8" text-anchor="middle">Dynamo / Cassandra</text>
    <rect x="30" y="218" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="235" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">同一道題的三種答案:寫入衝突,你想在「源頭擋、事後解、還是讀時調和」?</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">單主</b>:所有寫入走唯一的 leader——衝突在<b>源頭就被消滅</b>(只有一個寫入點),代價是 leader 掛了的 <b>failover</b> 很難(<a href="/blog/redis-sentinel/">誰發現、誰接任、怎麼不裂腦</a>)。<b style="color:#d6a45c">多主</b>:多個資料中心各自有 leader 就近收寫、互相同步——斷網也能寫,但<b>兩邊同時改同一筆</b>的衝突,得事後解決(誰贏?怎麼合併?)。<b style="color:#9b6ff0">無主</b>:沒有 leader,客戶端直接同時寫多個副本、讀也多讀幾份,靠 <b>w + r &gt; n</b> 的重疊保證讀到新值——不用 failover,但讀寫路徑變複雜(讀到舊值要 read repair 補寫回去)。<b>衝突不會消失,只會搬家</b>——三種拓撲,是選它搬去哪</figcaption>
</figure>

無主那個 **quorum** 值得多一句:n 份副本,寫入要 **w** 份確認、讀取要問 **r** 份,只要 **w + r > n**(例如 n=3、w=2、r=2),讀跟寫的集合**必有交集**,你一定會碰到至少一份最新值(再從中挑新的)。數學很漂亮——但 DDIA 誠實地列了它的邊角:並行寫入的先後難定、寫入部分失敗不回滾、sloppy quorum 時保證會鬆動。**它是機率上很強的工程保證,不是絕對的數學證明**,這個分寸後面講[[sre-consensus|共識]]時會再回來。

## 複製延遲的三個怪象:有名字,才能對症下藥

只要複製是非同步的(絕大多數都是,原因見 [[redis-replication|Redis 那篇]]的取捨),replica 就永遠慢半拍,於是會冒出各種「見鬼了」的讀取結果。DDIA 最有價值的貢獻,是**給這些怪象起了名字**——三個病,三種藥:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 246" role="img" aria-label="複製延遲的三個怪象。第一個 read-your-writes:自己剛寫完馬上讀,卻讀到還沒追上的 replica,看不到自己的留言;藥方是自己的資料讀 leader。第二個單調讀 monotonic reads:兩次讀打到不同 replica,第一次讀到新的、第二次讀到更舊的,像時光倒流,留言出現又消失;藥方是同一個使用者固定讀同一台 replica。第三個一致前綴 consistent prefix:問句與答句複製速度不同,旁觀者先看到答再看到問,因果錯亂;藥方是有因果關係的寫入寫進同一分區或用因果追蹤。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="193" y1="14" x2="193" y2="200" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="387" y1="14" x2="387" y2="200" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="97" y="28" fill="#e05a7d" font-size="9.2" text-anchor="middle" font-weight="bold">① 讀不到自己的寫</text>
    <text x="97" y="42" fill="#9aa4b2" font-size="7" text-anchor="middle">read-your-writes</text>
    <rect x="26" y="54" width="142" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="97" y="70" fill="#e6e6e6" font-size="7.2" text-anchor="middle">我留言 → 寫進 leader ✓</text>
    <rect x="26" y="84" width="142" height="24" rx="4" fill="#3a2626" stroke="#e05a7d" stroke-width="1.2"/><text x="97" y="100" fill="#e05a7d" font-size="7.2" text-anchor="middle">重新整理 → 留言不見了?!</text>
    <text x="97" y="126" fill="#9aa4b2" font-size="6.8" text-anchor="middle">(讀到還沒追上的 replica)</text>
    <rect x="26" y="140" width="142" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="97" y="157" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">藥:自己的資料,讀 leader</text>
    <text x="290" y="28" fill="#d6a45c" font-size="9.2" text-anchor="middle" font-weight="bold">② 時光倒流</text>
    <text x="290" y="42" fill="#9aa4b2" font-size="7" text-anchor="middle">monotonic reads(單調讀)</text>
    <rect x="220" y="54" width="142" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="290" y="70" fill="#e6e6e6" font-size="7.2" text-anchor="middle">第一次讀:看到留言(新 replica)</text>
    <rect x="220" y="84" width="142" height="24" rx="4" fill="#3a2626" stroke="#e05a7d" stroke-width="1.2"/><text x="290" y="100" fill="#e05a7d" font-size="7.2" text-anchor="middle">再讀一次:留言消失(舊 replica)</text>
    <text x="290" y="126" fill="#9aa4b2" font-size="6.8" text-anchor="middle">(兩次打到進度不同的 replica)</text>
    <rect x="220" y="140" width="142" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="290" y="157" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">藥:同一使用者固定讀同一台</text>
    <text x="483" y="28" fill="#9b6ff0" font-size="9.2" text-anchor="middle" font-weight="bold">③ 因果錯亂</text>
    <text x="483" y="42" fill="#9aa4b2" font-size="7" text-anchor="middle">consistent prefix(一致前綴)</text>
    <rect x="414" y="54" width="142" height="24" rx="4" fill="#3a2626" stroke="#e05a7d" stroke-width="1.2"/><text x="483" y="70" fill="#e05a7d" font-size="7.2" text-anchor="middle">旁觀者先看到:「答:沒有」</text>
    <rect x="414" y="84" width="142" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="483" y="100" fill="#e6e6e6" font-size="7.2" text-anchor="middle">才看到:「問:吃飯了嗎?」</text>
    <text x="483" y="126" fill="#9aa4b2" font-size="6.8" text-anchor="middle">(問與答走不同分區,複製快慢不同)</text>
    <rect x="414" y="140" width="142" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="483" y="157" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">藥:有因果的寫入,進同一分區</text>
    <rect x="30" y="212" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="229" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">怪象是物理,消滅不了;但每個病都有便宜的對症藥——不必為此上完整的強一致</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三個怪象、三帖藥:<b style="color:#e05a7d">① read-your-writes</b>——自己剛留言、重新整理卻不見了(讀到落後的 replica);藥是「<b>自己的資料讀 leader</b>,別人的隨便」。<b style="color:#d6a45c">② 單調讀</b>——兩次讀打到進度不同的 replica,東西出現又消失、像時光倒流;藥是「<b>同一個使用者固定讀同一台</b>」(例如按 user id 挑 replica)。<b style="color:#9b6ff0">③ 一致前綴</b>——問句與答句走不同分區、複製快慢不同,旁觀者先看到答案再看到問題;藥是「<b>有因果關係的寫入放同一分區</b>」。注意每帖藥都<b>只治那個病、成本很低</b>——這正是分級一致性的精神:按需下藥,而不是為了怪象直接上最貴的強一致</figcaption>
</figure>

這三帖藥合起來,就是所謂的**因果一致性**的民間版本:不追求「全世界同步」,只保證「**跟你有關的、有因果的部分**看起來是對的」。多數產品要的其實就是這個——而它比強一致便宜太多了。

## 反思

### 三種拓撲,是「把衝突放在哪」的三種選擇

讀完這章,我把三種拓撲收斂成一句話:**寫入衝突不會消失,只會搬家——你只是在選它搬去哪。** 單主把衝突消滅在源頭(單一寫入點),於是把難處搬到了 failover([[redis-sentinel|誰發現、誰接任、怎麼不裂腦]]);多主讓各地都能寫,把難處搬到了事後的衝突解決(LWW 會默默丟資料、合併邏輯是應用的痛);無主不搞 leader,把難處搬進了每一次讀寫的路徑(quorum、read repair)。這個「**難處守恆**」的視角,跟我在 [[infra-spark|infra 系列]]講「沒有真正無狀態的系統,只有把狀態推去別處的系統」是同一種思維。所以選複製方案時,我的問題從「哪個好」變成了「**這三種苦,我的團隊最吞得下哪一種?**」——多數團隊的答案是單主,因為 failover 的苦有 Sentinel、K8s、managed 服務幫你扛,而衝突解決的苦只能自己吞。

### 給怪象起名字,是這章最被低估的貢獻

read-your-writes、monotonic reads、consistent prefix——第一次讀會覺得是學術詞彙,但實戰過就知道:**這些名字是「把玄學變工單」的把手。** 使用者回報「我留言不見了、重新整理又出現」,沒讀過這章的人會當成靈異事件重啟服務;讀過的人立刻說「這是單調讀破了,把同一個 user 釘到同一台 replica」——**病有名字,就有藥方,還能估價**。這跟 [[k8s-troubleshooting|K8s 排障]]那張「狀態→病因」對照表是同一種力量:工程能力的很大一部分,是腦中有一本「症狀 → 病名 → 藥方」的字典。DDIA 這章就是複製延遲的那幾頁字典,背下來,值回整本書價。

### 一致性是菜單,不是開關

這章教我最實用的心態是:一致性**不是「開或關」,是一份分級菜單**——全要(強一致)最貴,全不要(最終一致)最便宜但怪象叢生,而中間有一排「單點的藥」:自己的資料讀 leader、同一人固定一台、因果放同一分區。**多數產品要的不是「全世界即時一致」,是「跟我有關的部分看起來對」**——那用兩三帖便宜的藥就夠了,不必為此把整套系統升級成同步複製或分散式共識。這也是我做架構評審時常踩的煞車:有人一遇到延遲怪象就喊「上強一致」,我會先問——**你的使用者實際碰到的是三個病裡的哪一個?** 對症下那帖藥,成本常常只有十分之一。真正需要強保證的場景留給後面[[sre-consensus|共識]]那章;在那之前,先記住這句:**買一致性跟買保險一樣,買你需要的那幾項,不是全險。**
