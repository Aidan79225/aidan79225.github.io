---
title: "儲存引擎:LSM-tree、B-tree,與欄式儲存"
date: 2026-07-23
category: tech
description: "資料庫到底怎麼把資料放上磁碟、又怎麼找回來?DDIA Ch3 從一個兩行 bash 的「全世界最簡單資料庫」出發,把所有儲存引擎收斂成一道取捨:寫進來的資料,要為『之後怎麼讀』先付多少整理成本。世界上只有兩大流派——LSM-tree(append-only,順序寫快,靠 compaction 事後整理)與 B-tree(就地更新,讀穩,靠 WAL 保命)。最後講 OLTP 與 OLAP 為什麼分家:同一份資料,列式擺法伺候交易、欄式擺法伺候分析,沒有一種擺法能兩全。"
tags:
  - distributed-systems
  - book-notes
  - storage
series: "Designing Data-Intensive Applications 讀書筆記"
seriesOrder: 3
comments: true
draft: false
---
[[ddia-data-models|上一篇]]選好了資料模型,這篇往最底層鑽:**資料庫到底怎麼把資料放上磁碟、又怎麼找回來?** DDIA 這章從一個兩行 bash 的「全世界最簡單資料庫」開場——`db_set` 就是往檔案尾巴 **append** 一行,`db_get` 就是 **grep 全檔取最後一筆**。寫入快到極致(順序附加),讀取慢到絕望(O(n) 全掃)。而全章、甚至所有儲存引擎,都在回答同一道題:**為了讓「讀」快一點,你願意讓「寫」付出多少整理成本?** 索引就是這道取捨的名字——**它用寫入時的額外功夫,買讀取時的速度**;[[sql-index|索引不是免費的]],這章告訴你那筆帳到底怎麼付。

## 兩大流派:事後整理的 LSM,就地更新的 B-tree

把「怎麼付整理費」這個問題推到底,世界上的儲存引擎其實只有兩大流派:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 250" role="img" aria-label="兩大儲存引擎流派對比。左邊 LSM-tree:寫入先進記憶體的 memtable,寫滿就整批順序刷成磁碟上不可變的 SSTable 檔,背景再由 compaction 合併去重;寫入永遠是順序 append 所以快,讀取可能要從新到舊翻好幾層 SSTable,靠 bloom filter 加速。右邊 B-tree:資料放在固定大小的 page 組成的樹,寫入是找到那個 page 就地覆寫,讀取沿樹走三四層就到,讀穩;但就地更新是隨機 I/O,且要先寫 WAL 防當機。下方結論:LSM 寫優,代表 RocksDB、Cassandra;B-tree 讀穩,代表幾乎所有關聯式資料庫。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="se" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="14" x2="290" y2="206" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="24" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">LSM-tree:append-only,事後整理</text>
    <rect x="36" y="36" width="104" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="88" y="49" fill="#e6e6e6" font-size="7.8" text-anchor="middle">memtable</text><text x="88" y="60" fill="#9aa4b2" font-size="6.6" text-anchor="middle">記憶體,先接住寫入</text>
    <line x1="88" y1="66" x2="88" y2="82" stroke="#54b890" stroke-width="1.2" marker-end="url(#se)"/><text x="130" y="78" fill="#54b890" font-size="6.6" text-anchor="middle">寫滿→整批順序刷盤</text>
    <rect x="36" y="86" width="104" height="20" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1.1"/><text x="88" y="99" fill="#9aa4b2" font-size="6.8" text-anchor="middle">SSTable(新,不可變)</text>
    <rect x="36" y="110" width="104" height="20" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="88" y="123" fill="#9aa4b2" font-size="6.8" text-anchor="middle">SSTable(較舊)</text>
    <rect x="36" y="134" width="104" height="20" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="88" y="147" fill="#9aa4b2" font-size="6.8" text-anchor="middle">SSTable(更舊)</text>
    <path d="M148 96 C 172 110, 172 134, 148 144" fill="none" stroke="#d6a45c" stroke-width="1.2" marker-end="url(#se)"/><text x="196" y="122" fill="#d6a45c" font-size="6.8" text-anchor="middle">compaction</text><text x="196" y="132" fill="#9aa4b2" font-size="6.2" text-anchor="middle">背景合併去重</text>
    <text x="146" y="176" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">寫:永遠順序 append → 快</text>
    <text x="146" y="190" fill="#9aa4b2" font-size="7.2" text-anchor="middle">讀:可能翻好幾層 SSTable(bloom filter 救)</text>
    <text x="434" y="24" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">B-tree:page 樹,就地更新</text>
    <rect x="404" y="38" width="60" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="434" y="53" fill="#9aa4b2" font-size="6.8" text-anchor="middle">root page</text>
    <rect x="336" y="76" width="60" height="22" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.1"/><text x="366" y="91" fill="#9aa4b2" font-size="6.8" text-anchor="middle">page</text>
    <rect x="472" y="76" width="60" height="22" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.1"/><text x="502" y="91" fill="#9aa4b2" font-size="6.8" text-anchor="middle">page</text>
    <rect x="336" y="114" width="60" height="22" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="366" y="129" fill="#e6e6e6" font-size="6.8" text-anchor="middle">✎ 就地覆寫</text>
    <rect x="472" y="114" width="60" height="22" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="502" y="129" fill="#9aa4b2" font-size="6.8" text-anchor="middle">leaf page</text>
    <line x1="420" y1="60" x2="376" y2="74" stroke="#9aa4b2" stroke-width="1"/><line x1="448" y1="60" x2="492" y2="74" stroke="#9aa4b2" stroke-width="1"/><line x1="366" y1="98" x2="366" y2="112" stroke="#9aa4b2" stroke-width="1"/><line x1="502" y1="98" x2="502" y2="112" stroke="#9aa4b2" stroke-width="1"/>
    <rect x="360" y="146" width="148" height="18" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.2"/><text x="434" y="158" fill="#d6a45c" font-size="6.8" text-anchor="middle">WAL:改 page 前先順序記一筆(防當機)</text>
    <text x="434" y="180" fill="#4f6df5" font-size="7.6" text-anchor="middle" font-weight="bold">讀:沿樹走 3~4 層就到 → 穩</text>
    <text x="434" y="194" fill="#9aa4b2" font-size="7.2" text-anchor="middle">寫:隨機 I/O 就地改 + 先寫 WAL</text>
    <rect x="30" y="214" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="231" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">LSM 寫優(RocksDB / Cassandra / HBase)· B-tree 讀穩(幾乎所有關聯式 DB)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#54b890">LSM-tree</b>(log-structured):寫入先進記憶體的 <b>memtable</b>,滿了整批<b>順序刷</b>成一個不可變的 <b>SSTable</b> 檔,永不回頭改——舊值靠背景的 <b>compaction</b> 合併清掉。寫入永遠是磁碟最愛的順序 append,所以寫得飛快;代價是讀一個 key 可能要從新到舊翻好幾層(bloom filter 幫你快速跳過沒有的)。<b style="color:#4f6df5">B-tree</b>:資料放在固定大小(如 4KB)page 組成的樹,寫入是找到那個 page <b>就地覆寫</b>;讀取沿樹走三四層就到,又快又穩。代價是就地更新是隨機 I/O、而且為了防「改到一半當機」,每次都得先寫一筆 <b style="color:#d6a45c">WAL</b>。<b>同一筆整理費,LSM 選擇欠著之後付(compaction),B-tree 選擇當場付(隨機寫 + WAL)</b></figcaption>
</figure>

兩派的取捨可以壓成一句:**LSM 把磁碟當 log 用、寫入極快,但欠下的整理債要用 compaction 慢慢還(還會放大寫入量);B-tree 每筆寫當場歸位、讀取路徑短而穩定,是幾十年來關聯式資料庫的骨架。** 你其實兩邊都早就見過:[[redis-persistence|Redis 的 AOF]] 就是純 append 的 log、[[infra-kafka|Kafka]] 的 partition 就是一條只增不減的 log(它「磁碟為王」的秘密正是順序寫),而你每天下的 SQL 背後,[[sql-index|那顆索引]]幾乎就是一棵 B-tree。

## OLTP vs OLAP:同一份資料,兩種擺法

第二個大主題,是「**讀的形狀**」不同,連資料該怎麼**橫著擺還是直著擺**都不同。交易型(OLTP)的讀寫是「**取少數幾筆的完整資料**」——查一張訂單、改一個會員;分析型(OLAP)是「**掃過幾億筆、但每筆只要兩三個欄位**」——算上季每天的營收總和。用同一種擺法伺候兩種讀法,注定有一邊很痛:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 226" role="img" aria-label="列式與欄式儲存對比。左邊列式 row-oriented:每一筆訂單的所有欄位連續放在一起,OLTP 查一筆訂單時讀一個地方就拿到整筆,很快;但分析查詢只要 amount 一欄,卻被迫把每一列的所有欄位都讀進來。右邊欄式 column-oriented:同一個欄位的值連續放在一起,id 一串、date 一串、amount 一串;分析時只讀 amount 那一串,I/O 省一個數量級,而且同型別資料相鄰、壓縮率極高;但要重組出完整的一筆得跨好幾處。下方結論:OLTP 用列式、OLAP 用欄式,這就是資料庫與資料倉儲分家的底層原因。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="290" y1="14" x2="290" y2="182" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">列式(row):OLTP 的擺法</text>
    <rect x="34" y="38" width="224" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="146" y="53" fill="#e6e6e6" font-size="7.2" text-anchor="middle">id=1 · 2026-07-01 · ¥120 · 台北 …</text>
    <rect x="34" y="64" width="224" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="146" y="79" fill="#e6e6e6" font-size="7.2" text-anchor="middle">id=2 · 2026-07-01 · ¥80 · 新竹 …</text>
    <rect x="34" y="90" width="224" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="146" y="105" fill="#e6e6e6" font-size="7.2" text-anchor="middle">id=3 · 2026-07-02 · ¥200 · 台中 …</text>
    <text x="146" y="132" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">✓ 查一筆訂單:整筆連續放,讀一處全拿</text>
    <text x="146" y="148" fill="#e0733a" font-size="7.6" text-anchor="middle">✗ 只要 amount 一欄,卻得整列全讀</text>
    <text x="434" y="26" fill="#d6a45c" font-size="10" text-anchor="middle" font-weight="bold">欄式(column):OLAP 的擺法</text>
    <rect x="322" y="38" width="224" height="22" rx="3" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="434" y="53" fill="#9aa4b2" font-size="7.2" text-anchor="middle">id:1, 2, 3, …</text>
    <rect x="322" y="64" width="224" height="22" rx="3" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="434" y="79" fill="#9aa4b2" font-size="7.2" text-anchor="middle">date:07-01, 07-01, 07-02, …</text>
    <rect x="322" y="90" width="224" height="22" rx="3" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/><text x="434" y="105" fill="#d6a45c" font-size="7.2" text-anchor="middle" font-weight="bold">amount:120, 80, 200, … ← 只讀這串</text>
    <text x="434" y="132" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">✓ 掃十億筆只要一欄:I/O 省一個數量級</text>
    <text x="434" y="148" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">✓ 同型別相鄰 → 壓縮率極高</text>
    <text x="434" y="164" fill="#e0733a" font-size="7.6" text-anchor="middle">✗ 要重組完整一筆,得跨好幾處撈</text>
    <rect x="30" y="192" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="209" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">OLTP → 列式(DB)· OLAP → 欄式(倉儲 / Parquet)—— 這就是資料庫與數倉分家的底層原因</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">列式</b>把一筆資料的所有欄位連續擺——查一張訂單讀一處全拿,OLTP 超快;但分析只要 <code>amount</code> 一欄時,你被迫把每列的全部欄位都掃進來。<b style="color:#d6a45c">欄式</b>反過來,把同一欄的值連續擺——掃十億筆只讀那一串,I/O 直接省一個數量級,而且<b>同型別的值相鄰、壓縮率極高</b>(一串重複的日期壓到不像話)。這就是為什麼分析世界全是欄式:數倉、<a href="/blog/spark-intro/">Spark</a> 生態的 Parquet,都是這個擺法。<b>資料庫與資料倉儲的分家,根子上就是「讀的形狀不同 → 擺法只能二選一」</b></figcaption>
</figure>

所以「為什麼不能直接在 Production DB 上跑分析」這個 DE 日常問題,答案在儲存層就寫死了:**不是 DBA 小氣,是列式擺法天生伺候不了掃全表的讀法**(反之亦然)。把資料從 OLTP 搬去欄式的倉儲再分析——這正是 [[medallion-architecture|分層資料架構]]、整個資料工程管線存在的底層理由。

## 反思

### 「append-only 討好磁碟」是貫穿現代資料系統的一條暗線

讀完這章我才把散落各處的點連成線:LSM 的 SSTable、B-tree 的 WAL、[[redis-persistence|Redis 的 AOF]]、[[infra-kafka|Kafka 的 partition log]]——**全都是同一招:順序 append。** 磁碟(連 SSD 都是)天生痛恨隨機寫、熱愛順序寫,所以幾十年來的儲存設計,骨子裡都在做同一件事:**把隨機的寫入需求,改寫成順序的 log。** 連最「就地更新」的 B-tree,都得靠一條 append-only 的 WAL 才敢動手。認出這條暗線之後,我看任何新儲存系統的第一個問題都變成:**它在哪裡把隨機寫變成了順序寫?** 幾乎每次都問得到答案——這就是好原理的力量,一條線串起十個工具。

### 選引擎,是選「整理費付在哪個時間點」

LSM vs B-tree 吵了很多年誰快,但這章給我最乾淨的理解是:**兩邊付的是同一筆「為了讀而整理」的費用,差別只在付款時間。** B-tree 當場付清(每筆寫就地歸位、隨機 I/O + WAL),所以讀取路徑永遠短而穩;LSM 先賒帳(寫入只管 append),把整理債留給背景的 compaction 慢慢還——寫入尖峰時很爽,但債會利滾利(寫入放大),還債的 compaction 還可能跟前台搶 I/O。**沒有比較快,只有把成本搬到你比較付得起的時刻。** 這把尺我現在到處用:寫多讀少、能容忍讀取偶爾抖動 → LSM 系(Cassandra、RocksDB);讀寫均衡、要穩定的查詢延遲 → B-tree 系(關聯式)。選型吵架時把問題翻譯成「你想什麼時候付整理費」,爭論通常就結束了。

### OLTP / OLAP 分家教我:沒有一種擺法能伺候所有讀法

欄式儲存那一節,替我把 DE 這行的「存在理由」講到了根上。同一份訂單資料,交易系統要「一次一筆、整筆拿」,分析要「十億筆、只挑兩欄」——**讀的形狀不同,最佳的物理擺法就是不同的,而一份資料同時只能有一種擺法。** 所以才需要把資料從 OLTP 複製出來、轉成欄式、餵給分析——ETL、數倉、[[medallion-architecture|Medallion]]、乃至之後 DDIA 第三部的「衍生資料」,全是這個物理限制的下游後果。這也讓我對「一個系統通吃 OLTP + OLAP」的宣傳保持清醒:它不是不可能,但底下一定藏著「兩份擺法、自動同步」之類的機制,而那個同步就是新的複雜度。**資料工程的很多工作,本質上就是在替同一份資料維護「第二種擺法」——想通這點,你會更清楚自己每天在做的事,到底在解哪道物理題。**
