---
title: "當 SQL 跑在 MPP 上:Greenplum 與 Cloudberry"
date: 2026-07-11
category: tech
description: "SQL 系列壓軸:把前面 11 篇的單機 PostgreSQL 放到 MPP(大規模平行處理)上會怎樣?語法幾乎不變(Cloudberry 是 Greenplum 的開源接班人、GP 又源自 PG),但你多了一個必須在建表時就想清楚的東西——資料放哪個節點。分佈鍵選錯,就會資料傾斜、跨節點搬資料,而那正是 MPP 版的 shuffle。"
tags:
  - sql
  - data-engineering
series: "SQL 我以為我懂"
seriesOrder: 12
comments: true
draft: false
---
整個 SQL 系列的壓軸。前面 11 篇都跑在**單機 PostgreSQL**,這篇把同一批 SQL 放到 **MPP(Massively Parallel Processing,大規模平行處理)** 上——**Greenplum**、以及它的開源接班人 **Apache Cloudberry**(Apache 孵化中)。好消息:因為 Cloudberry 源自 Greenplum、Greenplum 又源自 PostgreSQL,**語法幾乎不變**,前面 11 篇你全部可以直接用;壞消息:你多了一個單機時代不用想的東西——**資料放在哪個節點**。而這個決定,會左右你所有查詢的快慢。

## 從單機到 MPP:一個 coordinator + 一堆 segment

MPP 的架構很直觀:一個 **coordinator**(大腦)負責收 query、規劃、分派;下面一堆 **segment**(每個其實就是一個獨立的 PostgreSQL 實例)各自存一份資料、平行處理自己那份。一張表怎麼分散到各 segment,由**分佈鍵(distribution key)**決定:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="MPP 架構:上方一個 coordinator 負責收 query、規劃、分派,下方三個 segment 各自是獨立的 PostgreSQL 實例、各存一份資料平行處理。整張表用 hash 分佈鍵打散到各 segment。若分佈鍵不均勻,某個 segment 資料爆多造成傾斜,最慢的那台會拖垮整個查詢。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="mp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="205" y="22" width="170" height="40" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="290" y="41" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">Coordinator</text>
    <text x="290" y="55" fill="#9aa4b2" font-size="8" text-anchor="middle">收 query、規劃、分派</text>
    <line x1="290" y1="62" x2="105" y2="98" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#mp)"/>
    <line x1="290" y1="62" x2="290" y2="98" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#mp)"/>
    <line x1="290" y1="62" x2="475" y2="98" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#mp)"/>
    <rect x="30" y="100" width="150" height="72" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="105" y="117" fill="#54b890" font-size="9.5" text-anchor="middle" font-weight="bold">Segment 1</text>
    <rect x="44" y="126" width="122" height="9" rx="2" fill="#2e4a40"/><rect x="44" y="139" width="122" height="9" rx="2" fill="#2e4a40"/><rect x="44" y="152" width="122" height="9" rx="2" fill="#2e4a40"/>
    <rect x="215" y="100" width="150" height="72" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="290" y="117" fill="#54b890" font-size="9.5" text-anchor="middle" font-weight="bold">Segment 2</text>
    <rect x="229" y="126" width="122" height="9" rx="2" fill="#2e4a40"/><rect x="229" y="139" width="122" height="9" rx="2" fill="#2e4a40"/><rect x="229" y="152" width="122" height="9" rx="2" fill="#2e4a40"/>
    <rect x="400" y="100" width="150" height="72" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="475" y="117" fill="#54b890" font-size="9.5" text-anchor="middle" font-weight="bold">Segment 3</text>
    <rect x="414" y="126" width="122" height="9" rx="2" fill="#2e4a40"/><rect x="414" y="139" width="122" height="9" rx="2" fill="#2e4a40"/><rect x="414" y="152" width="122" height="9" rx="2" fill="#2e4a40"/>
    <text x="290" y="192" fill="#9aa4b2" font-size="8.5" text-anchor="middle">DISTRIBUTED BY (分佈鍵):用 hash(分佈鍵) 決定每列落哪個 segment,查詢在每台平行跑</text>
    <text x="290" y="212" fill="#d6a45c" font-size="8.5" text-anchor="middle">⚠ 分佈鍵不均勻 → 某 segment 資料爆多(skew),平行失效、最慢那台拖垮全部</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">MPP = 一個 coordinator 指揮、一群 segment 平行幹活。速度來自「大家同時做自己那份」,所以只要有一台特別慢(資料傾斜),整體就被它拖住——分佈鍵的第一個責任,就是讓資料<b>分得均勻</b></figcaption>
</figure>

平行的威力,建立在「每台的工作量差不多」。所以分佈鍵最忌**資料傾斜(skew)**——如果你拿一個值很集中的欄(例如「國家」而八成資料都是同一國)當分佈鍵,那一國全擠進同一個 segment,其他 segment 閒著、它累死,平行度直接報銷。

## 分佈鍵選錯,就會「跨節點搬資料」

傾斜之外,分佈鍵還有第二個、更隱形的責任:**決定 join / group by 要不要跨節點搬資料**。當你 join 兩張表,如果「要配對的資料」剛好在同一個 segment,就能各台**本地 join**;如果散在不同 segment,就得先把資料透過網路搬到一起——這個搬移,MPP 叫 **Motion**,它就是 [[spark-shuffle|Spark shuffle]] 的 MPP 版:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="左邊分佈鍵等於 join key:A 表與 B 表都按 join key 分散,同一個 key 的兩表資料天生落在同一個 segment,各 segment 本地 join,不用搬。右邊分佈鍵不等於 join key:要配對的 B 落在別的 segment,得把它透過網路搬到 A 所在的 segment,這就是 Redistribute Motion,也就是 MPP 版的 shuffle。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="mo" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e0733a"/></marker></defs>
    <line x1="290" y1="16" x2="290" y2="176" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="28" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">分佈鍵 = join key ✓</text>
    <rect x="34" y="42" width="210" height="46" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="52" y="58" fill="#9aa4b2" font-size="8" text-anchor="start">Segment 1</text>
    <rect x="52" y="64" width="60" height="18" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1"/><text x="82" y="77" fill="#e6e6e6" font-size="8" text-anchor="middle">A k=1</text>
    <rect x="118" y="64" width="60" height="18" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1"/><text x="148" y="77" fill="#e6e6e6" font-size="8" text-anchor="middle">B k=1</text>
    <text x="216" y="77" fill="#54b890" font-size="8" text-anchor="middle">本地</text>
    <rect x="34" y="98" width="210" height="46" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="52" y="114" fill="#9aa4b2" font-size="8" text-anchor="start">Segment 2</text>
    <rect x="52" y="120" width="60" height="18" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1"/><text x="82" y="133" fill="#e6e6e6" font-size="8" text-anchor="middle">A k=2</text>
    <rect x="118" y="120" width="60" height="18" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1"/><text x="148" y="133" fill="#e6e6e6" font-size="8" text-anchor="middle">B k=2</text>
    <text x="216" y="133" fill="#54b890" font-size="8" text-anchor="middle">本地</text>
    <text x="150" y="166" fill="#9aa4b2" font-size="8.2" text-anchor="middle">同 key 天生同一台 → 免搬(no motion)</text>
    <text x="430" y="28" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">分佈鍵 ≠ join key ✗</text>
    <rect x="316" y="42" width="210" height="46" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="334" y="58" fill="#9aa4b2" font-size="8" text-anchor="start">Segment 1</text>
    <rect x="334" y="64" width="60" height="18" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1"/><text x="364" y="77" fill="#e6e6e6" font-size="8" text-anchor="middle">A k=1</text>
    <rect x="400" y="64" width="72" height="18" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 2"/><text x="436" y="77" fill="#9aa4b2" font-size="7.5" text-anchor="middle">缺 B k=1</text>
    <rect x="316" y="98" width="210" height="46" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="334" y="114" fill="#9aa4b2" font-size="8" text-anchor="start">Segment 2</text>
    <rect x="400" y="120" width="60" height="18" rx="3" fill="#3a2626" stroke="#e0733a" stroke-width="1.1"/><text x="430" y="133" fill="#e6e6e6" font-size="8" text-anchor="middle">B k=1</text>
    <path d="M430,120 C430,100 430,96 400,84" fill="none" stroke="#e0733a" stroke-width="1.4" marker-end="url(#mo)"/>
    <text x="430" y="166" fill="#9aa4b2" font-size="8.2" text-anchor="middle">要配對的散在不同台 → 跨網路搬(Motion)= shuffle</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左:兩表都按 join key 分佈,同 key 天生同 segment,本地 join、零搬移。右:分佈鍵沒對上,要 join 的 B 在別台,得跨網路搬過來(<b>Redistribute Motion</b>)——這就是 MPP 的 shuffle。另有把小表複製到每台的 <b>Broadcast Motion</b>(對應 Spark 的 broadcast join)</figcaption>
</figure>

Motion 有幾種,對應的正是你在 [[spark-shuffle|Spark]] 學過的招式:**Redistribute Motion**(兩表都依 join key 重新 hash 分散,= shuffle join)、**Broadcast Motion**(小表複製到每個 segment,= broadcast join)、**Gather Motion**(把各 segment 的結果收回 coordinator)。而在 [[sql-explain|執行計畫]]裡,這些 Motion 會明明白白列出來——看到大表被 Redistribute,就跟在 PG 看到 `Seq Scan`、在 Spark 看到 `Exchange` 一樣,是該停下來想「這搬移省得掉嗎」的訊號。

## 選分佈鍵的原則

綜合起來,選分佈鍵就兩個目標,而它們有時會打架:

- **分得均勻(避免 skew)**:選**高基數、分佈平均**的欄(例如 `user_id`、`order_id`),別選值很集中的欄(國家、狀態、布林)。
- **配對在本地(避免 motion)**:選**最常拿來 join 的欄**當分佈鍵。尤其**大表 join 大表**時,讓兩張表用**同一個 join key** 當分佈鍵——這樣同 key 的資料天生就在同一 segment,join 完全不用搬,這是 MPP 效能最關鍵的一招。

真的兩者兼顧不了時(join key 剛好很傾斜),就得取捨,或用 Broadcast 把小表複製掉。**建表 `DISTRIBUTED BY` 那一刻,你其實就決定了未來一票查詢的命運**——這是 MPP 跟單機最不一樣的地方。

## 反思

### MPP 的一切難題,都回到同一句話:少搬資料

Distribution key、motion、skew,名詞一堆,但骨子裡只有一件事:**資料在哪、要不要搬**。這跟 [[spark-shuffle|Spark 的 shuffle]] 根本是同一套物理——把「會一起被 join / group 的資料」放在一起,就免搬;放不對,就得跨網路搬,而網路搬移永遠是分散式運算最貴的一步。學過 Spark shuffle 再看 MPP,幾乎是無痛切換:換了名字(Exchange → Motion、broadcast join → Broadcast Motion),道理一模一樣。**跨引擎的效能物理是共通的**——這也是為什麼我一直說,學透一個分散式引擎,其他的就通了大半。

### 分散式的難,不在語法,在「位置」

這篇最大的體會:從單機到 MPP,**SQL 幾乎沒變,但你多了一整層要想的事——資料的「位置」**。單機你只煩惱「查詢怎麼寫」;MPP 你得先煩惱「資料怎麼分佈、運算在哪發生、要不要搬」。而且這個決定在**建表時**就定死了,選錯後面全部慢。這讓我更確定一件事:分散式系統真正的難點,從來不是 API,是**位置與移動**——資料放哪、算在哪、什麼時候得跨越邊界。這正好是我在寫的 [[fode-6|運算與儲存分離]]、以及 DDIA 分片那章的核心命題,MPP 只是它一個很具體的縮影。

### 整個系列,其實在講同一件事:別被「能跑」騙了

寫到最後一篇,回頭看這十二篇的共同主題其實只有一句:**SQL 很容易「跑得出來」,但「跑對、跑得快」需要你看穿底下的機制。** 執行順序、JOIN 怎麼配對、NULL 的三值邏輯、window 怎麼算、索引怎麼查、EXPLAIN 怎麼讀、MVCC 怎麼隔離、MPP 怎麼分佈——每一篇都在拆穿一個「你以為你懂、其實只是會用」的東西。看穿機制之後,你才從「會寫 SQL」變成「懂 SQL」。這就是這個系列名字的意思——**SQL,我以為我懂**;而讀完這一輪,希望你跟我一樣,真的更懂了一點。
