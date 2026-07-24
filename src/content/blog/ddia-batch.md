---
title: "批次處理:MapReduce 的精神、join 的兩條路,與不可變輸入的美德"
date: 2026-07-24
category: tech
description: "Part III 開場:資料開始在系統之間流動,而最古老可靠的流動方式是批次。DDIA Ch10 把 MapReduce 講成『跨一千台機器的 Unix pipe』——小工具、統一介面、不可變的輸入。三個重點:map–shuffle–reduce 的解剖(shuffle 是最貴的一步)、批次 join 的兩條路(reduce-side sort-merge 通用但重、map-side broadcast 快但小表要裝得進記憶體——正是 Spark broadcast join 的祖先),以及批次最被低估的美德:輸入不可變、輸出可重算,於是人為錯誤有了救生索。"
tags:
  - distributed-systems
  - book-notes
  - data-engineering
series: "Designing Data-Intensive Applications 讀書筆記"
seriesOrder: 10
comments: true
draft: false
---
[[ddia-consistency-consensus|Part II]] 在單一系統內把一致性守住了;Part III 的主題換成**資料在系統之間流動**——而最古老、也最可靠的流動方式,是**批次(batch)**。DDIA 講 MapReduce 的切入點很別緻:先講 **Unix 哲學**——小工具、各做好一件事、用統一的介面(檔案與串流)用 pipe 接起來。然後一句話點題:**MapReduce 就是跨一千台機器的 Unix pipe**——輸入不可變、輸出寫成新檔案、工具之間靠統一格式銜接。這個精神,比 MapReduce 本身活得久得多。

## MapReduce 解剖:map、shuffle、reduce——貴的是中間那步

以「算每個網址的點擊數」為例,三步走完:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="MapReduce 的三步解剖。輸入是散在各台機器上的 log 分片。第一步 map:每台機器就地逐筆處理自己那份,抽出 key value,例如網址與 1,不搬資料。第二步 shuffle:按 key 重新分發,同一個 key 的所有資料跨網路搬到同一台 reducer 並排序——這是唯一要大規模搬資料的一步,也是整個作業最貴的一步。第三步 reduce:每台 reducer 對聚齊的同 key 整組聚合,輸出結果檔。下方註記:所有分散式運算引擎的成本都花在 shuffle,懂它就懂效能調校的一半。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="mr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker><marker id="mrO" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e0733a"/></marker></defs>
    <text x="80" y="22" fill="#9aa4b2" font-size="8.4" text-anchor="middle" font-weight="bold">輸入(不可變)</text>
    <rect x="30" y="32" width="100" height="22" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="80" y="47" fill="#9aa4b2" font-size="7" text-anchor="middle">log 分片 1</text>
    <rect x="30" y="60" width="100" height="22" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="80" y="75" fill="#9aa4b2" font-size="7" text-anchor="middle">log 分片 2</text>
    <rect x="30" y="88" width="100" height="22" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="80" y="103" fill="#9aa4b2" font-size="7" text-anchor="middle">log 分片 3</text>
    <text x="212" y="22" fill="#4f6df5" font-size="8.4" text-anchor="middle" font-weight="bold">① map(就地、平行)</text>
    <rect x="162" y="32" width="100" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="212" y="47" fill="#e6e6e6" font-size="6.8" text-anchor="middle" font-family="monospace">(/a,1)(/b,1)…</text>
    <rect x="162" y="60" width="100" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="212" y="75" fill="#e6e6e6" font-size="6.8" text-anchor="middle" font-family="monospace">(/a,1)(/c,1)…</text>
    <rect x="162" y="88" width="100" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="212" y="103" fill="#e6e6e6" font-size="6.8" text-anchor="middle" font-family="monospace">(/b,1)(/a,1)…</text>
    <line x1="130" y1="43" x2="160" y2="43" stroke="#9aa4b2" stroke-width="1" marker-end="url(#mr)"/><line x1="130" y1="71" x2="160" y2="71" stroke="#9aa4b2" stroke-width="1" marker-end="url(#mr)"/><line x1="130" y1="99" x2="160" y2="99" stroke="#9aa4b2" stroke-width="1" marker-end="url(#mr)"/>
    <text x="212" y="126" fill="#9aa4b2" font-size="6.8" text-anchor="middle">逐筆抽 (key, value),不搬資料</text>
    <text x="357" y="22" fill="#e0733a" font-size="8.4" text-anchor="middle" font-weight="bold">② shuffle(按 key 重分發)</text>
    <path d="M262 43 C 300 43, 310 52, 336 56" fill="none" stroke="#e0733a" stroke-width="1.2" marker-end="url(#mrO)"/>
    <path d="M262 71 C 300 71, 310 60, 336 60" fill="none" stroke="#e0733a" stroke-width="1.2" marker-end="url(#mrO)"/>
    <path d="M262 99 C 300 99, 310 92, 336 88" fill="none" stroke="#e0733a" stroke-width="1.2" marker-end="url(#mrO)"/>
    <text x="357" y="128" fill="#e0733a" font-size="6.8" text-anchor="middle" font-weight="bold">同 key 跨網路聚到同一台+排序</text>
    <text x="357" y="140" fill="#e0733a" font-size="6.8" text-anchor="middle" font-weight="bold">唯一大搬家的一步=最貴</text>
    <text x="470" y="22" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">③ reduce(整組聚合)</text>
    <rect x="404" y="46" width="132" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="470" y="62" fill="#e6e6e6" font-size="6.8" text-anchor="middle" font-family="monospace">/a:(1,1,1)→ /a=3</text>
    <rect x="404" y="78" width="132" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="470" y="94" fill="#e6e6e6" font-size="6.8" text-anchor="middle" font-family="monospace">/b:(1,1)→ /b=2 …</text>
    <line x1="470" y1="70" x2="470" y2="76" stroke="#9aa4b2" stroke-width="0"/>
    <rect x="404" y="152" width="132" height="22" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="470" y="167" fill="#d6a45c" font-size="7" text-anchor="middle">輸出:寫成「新」檔案</text>
    <line x1="470" y1="102" x2="470" y2="150" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#mr)"/>
    <rect x="30" y="192" width="520" height="36" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="207" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">map 就地跑(把運算搬到資料旁)· shuffle 是唯一的大搬家,也是一切成本所在</text>
    <text x="290" y="222" fill="#9aa4b2" font-size="7.4" text-anchor="middle">groupBy、join、去重……凡是「同 key 要相聚」的操作,背後都是一次 shuffle</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">map</b> 在資料所在的機器<b>就地</b>逐筆抽出 (key, value)——運算搬到資料旁,不搬資料;<b style="color:#e0733a">shuffle</b> 把<b>同一個 key</b> 的資料跨網路聚到同一台並排序——整個作業<b>唯一的大搬家,也是最貴的一步</b>;<b style="color:#54b890">reduce</b> 對聚齊的每組 key 做聚合,輸出寫成<b>新檔案</b>(輸入永遠不動)。<a href="/blog/spark-intro/">Spark</a> 的 stage 邊界、效能調校的一半功夫,全在 shuffle 這一步——<b>凡是「同 key 要相聚」的操作(groupBy、join、去重),背後都是一次 shuffle</b></figcaption>
</figure>

## 批次 join 的兩條路:要嘛都搬,要嘛帶小抄

批次世界最常見的重活是 **join**(點擊 log join 使用者表)。[[sql-joins|單機的 join 演算法]]我在 SQL 系列講過;分散式版本的核心問題變成:**兩份資料散在不同機器上,同 key 的列要怎麼相遇?** 兩條路:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 234" role="img" aria-label="分散式批次 join 的兩條路。左邊 reduce-side join(sort-merge):兩邊資料都按 join key 做 shuffle,同 key 的 log 與使用者資料在同一台 reducer 相遇合併;通用、不需要任何前提,但兩邊都要大搬家,最重。右邊 map-side join(broadcast):如果其中一邊夠小,例如使用者表裝得進記憶體,就把小表整份複製到每一台 mapper 當小抄,大表就地查小抄完成 join,完全不用 shuffle,快非常多;但前提是小表必須裝得進記憶體。下方:Spark 的 broadcast join 就是這一條,判準只有一句:小表裝得進記憶體嗎。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="bj" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e0733a"/></marker><marker id="bjg" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <line x1="290" y1="14" x2="290" y2="186" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#e0733a" font-size="9.4" text-anchor="middle" font-weight="bold">reduce-side(sort-merge):都搬</text>
    <rect x="36" y="40" width="92" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="82" y="56" fill="#9aa4b2" font-size="7" text-anchor="middle">點擊 log(大)</text>
    <rect x="160" y="40" width="92" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="206" y="56" fill="#9aa4b2" font-size="7" text-anchor="middle">使用者表(大)</text>
    <line x1="82" y1="64" x2="126" y2="102" stroke="#e0733a" stroke-width="1.3" marker-end="url(#bj)"/>
    <line x1="206" y1="64" x2="162" y2="102" stroke="#e0733a" stroke-width="1.3" marker-end="url(#bj)"/>
    <text x="146" y="88" fill="#e0733a" font-size="7" text-anchor="middle" font-weight="bold">兩邊都按 user_id shuffle</text>
    <rect x="76" y="106" width="140" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="146" y="125" fill="#e6e6e6" font-size="7.4" text-anchor="middle">同 key 在同一台 reducer 相遇</text>
    <text x="146" y="158" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">✓ 通用:不需要任何前提</text>
    <text x="146" y="174" fill="#e0733a" font-size="7.4" text-anchor="middle">✗ 兩邊都大搬家,最重</text>
    <text x="434" y="26" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">map-side(broadcast):帶小抄</text>
    <rect x="324" y="40" width="92" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="370" y="56" fill="#9aa4b2" font-size="7" text-anchor="middle">點擊 log(大)</text>
    <rect x="448" y="40" width="100" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="498" y="56" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">使用者表(小)</text>
    <line x1="486" y1="64" x2="400" y2="100" stroke="#54b890" stroke-width="1.2" stroke-dasharray="3 2" marker-end="url(#bjg)"/><line x1="498" y1="64" x2="470" y2="100" stroke="#54b890" stroke-width="1.2" stroke-dasharray="3 2" marker-end="url(#bjg)"/>
    <text x="500" y="88" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">整份複製到每台</text>
    <rect x="332" y="104" width="100" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="382" y="116" fill="#e6e6e6" font-size="6.8" text-anchor="middle">mapper 1</text><text x="382" y="128" fill="#9aa4b2" font-size="6.4" text-anchor="middle">就地查小抄 join</text>
    <rect x="444" y="104" width="100" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="494" y="116" fill="#e6e6e6" font-size="6.8" text-anchor="middle">mapper 2</text><text x="494" y="128" fill="#9aa4b2" font-size="6.4" text-anchor="middle">就地查小抄 join</text>
    <text x="434" y="158" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">✓ 完全不 shuffle,快非常多</text>
    <text x="434" y="174" fill="#e0733a" font-size="7.4" text-anchor="middle">✗ 前提:小表裝得進記憶體</text>
    <rect x="30" y="196" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="213" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">Spark 的 broadcast join 就是右邊這條——判準只有一句:「小表,裝得進記憶體嗎?」</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e0733a">Reduce-side join</b>:兩邊都按 join key 做 shuffle,同 key 的列在同一台 reducer 相遇、sort-merge 合併——<b>通用</b>(不需要任何前提),但兩邊都大搬家、最重。<b style="color:#54b890">Map-side broadcast join</b>:一邊夠小,就把它<b>整份複製到每台 mapper</b> 當「小抄」,大表就地查表完成 join——<b>完全跳過 shuffle</b>,快非常多,但小表必須裝得進記憶體。<a href="/blog/spark-intro/">Spark</a> 的 broadcast join 正是這條路的直系後代;選哪條,判準就一句:<b>小的那邊,裝得進記憶體嗎?</b></figcaption>
</figure>

MapReduce 本身有個大缺點:**每個作業的輸出都要完整落地到 HDFS,下個作業再讀回來**——一條十步的管線就要寫十次、讀十次磁碟。後來的**資料流引擎**([[spark-intro|Spark]]、Flink)就是針對這點進化:把整條管線畫成 operator 的 DAG、中間結果盡量留在記憶體、失敗靠 lineage 重算局部。**MapReduce 這個「產品」被取代了,但它的精神——分區平行、把運算搬到資料旁、shuffle 集中成本——原封不動活在每個現代引擎裡。**

## 批次最被低估的美德:輸入不可變,錯了可以重來

DDIA 這章有個容易被跳過、我卻認為最重要的觀察:批次處理繼承了 Unix 最好的品格——**輸入唯讀、輸出寫到新地方**。這帶來一種被作者稱為**「人為容錯(human fault tolerance)」**的能力:程式寫錯了、邏輯有 bug、昨天的報表算壞了——**修好程式,對著原封不動的輸入重跑一次就好**。錯誤不會累積、不會污染源頭,最壞情況就是浪費一輪運算。對照之下,直接 UPDATE 資料庫的管線,一個 bug 就把唯一的真相改壞了,還原得靠備份和眼淚。**可重跑,是批次給資料工程最大的禮物**——[[medallion-architecture|Medallion 保留不可變的 Bronze 層]]、[[airflow-reliability|Airflow 的冪等與 backfill]],全是這個美德的現代化身。

## 反思

### 「人為容錯」是我最想幫批次講的一句話

大家嫌批次舊、嫌它慢,但做了幾年資料我最感激它的,恰恰是這個不性感的美德:**人一定會犯錯,而批次讓錯誤變得可逆。** 邏輯寫錯?修好重跑。昨天的維度表壞了?從 Bronze 重建。這種「錯了可以回到出發點」的安全感,streaming 世界要花十倍力氣才換得到(事件流過就過了)。所以我給團隊的紀律一直是:**原始層唯讀、永遠保留、所有下游都當成「可以隨時燒掉重蓋」的衍生品**——這正是 [[medallion-architecture|Medallion]] 的靈魂,而它的理論根據就在這章。系統容錯靠副本,**人為容錯靠不可變**;後者被討論得太少,出的事卻更多。

### Shuffle 是分散式運算的房租——看懂它,調校就有了地圖

MapReduce 的三步裡,map 和 reduce 都「就地」,只有 shuffle 在搬資料——而**分散式運算的成本,幾乎全部住在這一步**。想通之後,一堆散落的實戰知識瞬間歸位:[[infra-spark|Spark]] 的 stage 為什麼在 shuffle 邊界切開、data skew 為什麼要命(某個 key 的資料全擠到一台)、broadcast join 為什麼快(整個跳過 shuffle)、為什麼 groupBy 前先 filter 能省大錢(搬之前先減量)。我現在看任何慢掉的批次作業,第一個問題永遠是:**它 shuffle 了多少資料?能不能少搬、早減量、或乾脆帶小抄不搬?** 這一問,就是調校的一半。

### 工具死了,哲學還活著——學東西要學到那一層

MapReduce 作為產品已經退役,但這章讀來毫不過時,因為它教的是三個還活著的思想:**把運算搬到資料旁**(而不是反過來)、**用不可變的檔案當工具之間的統一介面**(Unix pipe 的放大版)、**把跨機器的複雜度集中到 shuffle 一個地方**。Spark 是它們的新殼,dbt 的 model 鏈、[[medallion-architecture|Medallion]] 的分層,骨子裡也是「每步讀不可變輸入、寫新輸出」的同一套。這再次驗證我學技術的順位:**API 一兩年就換,架構三五年一改,但這種層級的設計思想,一用二十年。** 讀 DDIA 這種書的意義就在這——它讓你在下一個新工具發布時,一眼認出「喔,又是那個思想換了件衣服」。下一篇講它的另一半:當資料不再是「一批一批」,而是「一直來」——串流。
