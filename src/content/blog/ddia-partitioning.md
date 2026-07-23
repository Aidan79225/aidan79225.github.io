---
title: "分區:range 還是 hash、二級索引擺哪、以及怎麼重新平衡"
date: 2026-07-24
category: tech
description: "複製是同一份資料放多台;分區(partitioning / sharding)是把資料切開、每台只放一部分——一台裝不下、寫不動時的唯一出路。DDIA Ch6 把分區的三道難題講透:怎麼切(range 保順序但怕熱點、hash 打散熱點但失去範圍掃描)、二級索引擺哪(local 寫便宜讀要 scatter/gather、global 讀精準寫要跨區)、以及節點增減時怎麼重新平衡(千萬別 hash mod N;固定分區數是主流解法——Redis Cluster 的 16384 個 slot 就是它的活教材)。"
tags:
  - distributed-systems
  - book-notes
  - partitioning
series: "Designing Data-Intensive Applications 讀書筆記"
seriesOrder: 6
comments: true
draft: false
---
[[ddia-replication|複製]]是同一份資料放多台;**分區(partitioning,也叫 sharding)是把資料切開,每台只放一部分**——當資料量一台裝不下、或寫入 throughput 一台吃不消,這是唯一的出路。兩者幾乎總是**並用**:資料先切成分區,每個分區自己再做主從複製。你其實已經見過好幾個分區系統了:[[redis-cluster|Redis Cluster 的 16384 個 slot]]、[[kafka-topics|Kafka 的 partition]]、[[sql-mpp|MPP 資料庫的分片]]——這章給你的,是它們背後共通的三道難題:**怎麼切、索引擺哪、怎麼重新平衡。**

## 第一題:怎麼切——range 保順序,hash 打熱點

分區的目標是把資料和負載**攤平**;最怕的就是**傾斜(skew)**——大家擠在同一區(熱點),分了等於沒分。兩種主流切法,正好是一對取捨:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="兩種分區策略對比。左邊按 key 範圍切:像百科全書分冊,A 到 F 一區、G 到 R 一區、S 到 Z 一區,key 保持有序,範圍掃描很高效;但若 key 是時間戳,今天的寫入全部砸在最後一區,熱點嚴重。右邊按 key 的 hash 切:hash 把相鄰的 key 均勻噴到各區,負載攤得很平、熱點被打散;但順序被打亂,範圍掃描得問所有分區。下方:Cassandra 的折衷是複合主鍵,第一欄 hash 選分區、其餘欄位在分區內排序;而 hash 也救不了單一超熱 key,名人 key 要在應用層加鹽分攤。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="290" y1="14" x2="290" y2="176" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">按 key 範圍切(range)</text>
    <rect x="30" y="38" width="70" height="30" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="65" y="57" fill="#e6e6e6" font-size="8" text-anchor="middle">A–F</text>
    <rect x="110" y="38" width="70" height="30" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="145" y="57" fill="#e6e6e6" font-size="8" text-anchor="middle">G–R</text>
    <rect x="190" y="38" width="70" height="30" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="225" y="57" fill="#e6e6e6" font-size="8" text-anchor="middle">S–Z</text>
    <text x="146" y="86" fill="#9aa4b2" font-size="7" text-anchor="middle">像百科全書分冊,key 有序</text>
    <text x="146" y="106" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">✓ 範圍掃描高效(讀連續一段)</text>
    <rect x="36" y="118" width="220" height="28" rx="5" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="146" y="130" fill="#e05a7d" font-size="7.2" text-anchor="middle" font-weight="bold">✗ key 是時間戳 → 今天的寫入</text>
    <text x="146" y="141" fill="#e05a7d" font-size="7.2" text-anchor="middle" font-weight="bold">全砸最後一區(熱點)</text>
    <text x="146" y="164" fill="#9aa4b2" font-size="6.8" text-anchor="middle">HBase / 早期 Bigtable</text>
    <text x="434" y="26" fill="#d6a45c" font-size="9.6" text-anchor="middle" font-weight="bold">按 key 的 hash 切</text>
    <rect x="318" y="38" width="70" height="30" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="353" y="57" fill="#e6e6e6" font-size="8" text-anchor="middle">分區 0</text>
    <rect x="398" y="38" width="70" height="30" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="433" y="57" fill="#e6e6e6" font-size="8" text-anchor="middle">分區 1</text>
    <rect x="478" y="38" width="70" height="30" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="513" y="57" fill="#e6e6e6" font-size="8" text-anchor="middle">分區 2</text>
    <text x="434" y="86" fill="#9aa4b2" font-size="7" text-anchor="middle">hash 把相鄰 key 均勻噴散</text>
    <text x="434" y="106" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">✓ 負載攤平,熱點被打散</text>
    <rect x="324" y="118" width="220" height="28" rx="5" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="434" y="130" fill="#e05a7d" font-size="7.2" text-anchor="middle" font-weight="bold">✗ 順序沒了 → 範圍掃描</text>
    <text x="434" y="141" fill="#e05a7d" font-size="7.2" text-anchor="middle" font-weight="bold">得問「所有」分區</text>
    <text x="434" y="164" fill="#9aa4b2" font-size="6.8" text-anchor="middle">Cassandra / Redis Cluster(CRC16)/ Kafka</text>
    <rect x="30" y="186" width="520" height="44" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="203" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-weight="bold">折衷:複合主鍵(第一欄 hash 選分區,其餘欄位在「分區內」照樣排序)—— Cassandra 的招牌</text>
    <text x="290" y="220" fill="#9aa4b2" font-size="7.6" text-anchor="middle">而 hash 救不了「單一超熱 key」(名人問題)—— 那得在應用層加鹽,把一把 key 拆成多把</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">Range 切</b>像百科全書分冊:key 有序,「查 7 月所有訂單」這種<b>範圍掃描</b>只讀連續一段、超高效;但 key 若是時間戳,今天的寫入<b>全砸在最後一冊</b>——熱點。<b style="color:#d6a45c">Hash 切</b>把相鄰 key 均勻噴散:負載攤得平,但<b>順序沒了</b>,範圍掃描得問遍所有分區。折衷是<b>複合主鍵</b>(hash 決定分區、其餘欄位在分區內排序)。還有一個誰都救不了的:<b>單一超熱 key</b>(名人貼文、爆款商品)——hash 再均勻,同一把 key 就是落同一區,只能在應用層「加鹽」把它拆開,跟 <a href="/blog/redis-cache-patterns/">快取擊穿</a>是親戚問題</figcaption>
</figure>

## 第二題:二級索引擺哪——local 還是 global

主鍵查詢好辦(key → 分區),麻煩的是**二級索引**:「找出所有紅色的車」——紅色的車散在每個分區裡,索引該擺哪?兩種答案,又是一對取捨:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="二級索引的兩種擺法。左邊 local index 文件分區索引:每個分區只索引自己的資料,寫入只動一區很便宜;但查 color 等於 red 時,紅色的車散在各區,必須 scatter gather 問遍所有分區再合併。右邊 global index 詞條分區索引:索引本身也被分區,red 這個詞條歸某一區管、blue 歸另一區,查詢只問管 red 的那一區就好,讀精準;但一筆寫入若動到多個詞條,要更新多個分區上的索引,通常非同步。下方:local 等於寫便宜讀貴、global 等於讀便宜寫貴,又是同一筆帳選付款時間。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="pt6" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e0733a"/></marker><marker id="pt6g" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <line x1="290" y1="14" x2="290" y2="176" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">Local index(各管各的)</text>
    <rect x="30" y="58" width="70" height="42" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="65" y="74" fill="#e6e6e6" font-size="7" text-anchor="middle">分區 0</text><text x="65" y="90" fill="#9aa4b2" font-size="6.2" text-anchor="middle">紅:2 台</text>
    <rect x="110" y="58" width="70" height="42" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="145" y="74" fill="#e6e6e6" font-size="7" text-anchor="middle">分區 1</text><text x="145" y="90" fill="#9aa4b2" font-size="6.2" text-anchor="middle">紅:1 台</text>
    <rect x="190" y="58" width="70" height="42" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="225" y="74" fill="#e6e6e6" font-size="7" text-anchor="middle">分區 2</text><text x="225" y="90" fill="#9aa4b2" font-size="6.2" text-anchor="middle">紅:3 台</text>
    <rect x="96" y="26" width="100" height="16" rx="4" fill="#262b3a" stroke="#e0733a" stroke-width="1.2"/><text x="146" y="37" fill="#e0733a" font-size="6.8" text-anchor="middle">查 color=red</text>
    <line x1="118" y1="42" x2="70" y2="56" stroke="#e0733a" stroke-width="1.1" marker-end="url(#pt6)"/><line x1="146" y1="42" x2="146" y2="56" stroke="#e0733a" stroke-width="1.1" marker-end="url(#pt6)"/><line x1="174" y1="42" x2="222" y2="56" stroke="#e0733a" stroke-width="1.1" marker-end="url(#pt6)"/>
    <text x="146" y="118" fill="#e05a7d" font-size="7.4" text-anchor="middle" font-weight="bold">讀:scatter/gather 問遍所有分區再合併 ✗</text>
    <text x="146" y="134" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">寫:只動自己那一區 ✓</text>
    <text x="146" y="158" fill="#9aa4b2" font-size="6.8" text-anchor="middle">MongoDB / Cassandra / Elasticsearch</text>
    <text x="434" y="26" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">Global index(按詞條分區)</text>
    <rect x="330" y="58" width="86" height="42" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="373" y="74" fill="#d6a45c" font-size="7" text-anchor="middle" font-weight="bold">「red」歸這區</text><text x="373" y="90" fill="#9aa4b2" font-size="6.2" text-anchor="middle">紅車全名單</text>
    <rect x="452" y="58" width="86" height="42" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.1"/><text x="495" y="74" fill="#9aa4b2" font-size="7" text-anchor="middle">「blue」歸這區</text><text x="495" y="90" fill="#9aa4b2" font-size="6.2" text-anchor="middle">藍車全名單</text>
    <rect x="384" y="26" width="100" height="16" rx="4" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/><text x="434" y="37" fill="#54b890" font-size="6.8" text-anchor="middle">查 color=red</text>
    <line x1="414" y1="42" x2="380" y2="56" stroke="#54b890" stroke-width="1.3" marker-end="url(#pt6g)"/>
    <text x="434" y="118" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">讀:只問管「red」的那一區 ✓</text>
    <text x="434" y="134" fill="#e05a7d" font-size="7.4" text-anchor="middle" font-weight="bold">寫:一筆動多個詞條 → 跨區更新(多為非同步)✗</text>
    <text x="434" y="158" fill="#9aa4b2" font-size="6.8" text-anchor="middle">DynamoDB GSI(非同步)</text>
    <rect x="30" y="186" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="203" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">local = 寫便宜、讀貴(scatter/gather)· global = 讀便宜、寫貴(跨區)—— 又是選「帳付在哪」</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">Local index</b>:每個分區只索引<b>自己</b>的資料——寫入只動一區、很便宜;但「找所有紅色的車」得 <b>scatter/gather</b>:問遍所有分區、各自查、再合併,分區越多讀越貴。<b style="color:#d6a45c">Global index</b>:把索引本身也分區、但<b>按詞條切</b>——「red」的完整名單歸某一區管,查詢<b>只問那一區</b>;代價是一筆寫入若動到多個詞條,要更新多個分區上的索引(所以實務多為<b>非同步</b>,例如 DynamoDB 的 GSI——索引會慢半拍)。<b>local 把帳記在讀、global 把帳記在寫</b>——跟 <a href="/blog/ddia-storage-engines/">儲存引擎那篇</a>「整理費付在哪個時間點」是同一道選擇題</figcaption>
</figure>

## 第三題:節點增減了,怎麼重新平衡

加機器、換機器,分區要跟著搬——**rebalancing** 的鐵則只有一條:**千萬別用 `hash mod N`。** N 一變,幾乎**所有** key 的歸屬都變,等於整庫大搬家。主流解法你其實已經在 [[redis-cluster|Redis Cluster]] 那篇看過活教材:

- **固定分區數**:一開始就切出遠多於節點數的分區(Redis Cluster 的 **16384 個 slot**、Kafka 的 partition、Elasticsearch 的 shard),節點增減時**只搬整個分區的歸屬**,key→分區的對應永遠不變。**加一層間接,搬家變成搬整齊的箱子。**
- **動態分區**:分區大到門檻就自動分裂、小了就合併(HBase)——分區數跟著資料量長。
- **自動 vs 手動**:全自動 rebalancing 很誘人,但 DDIA 提醒它有個陰暗面——**節點只是過載變慢時,自動化若誤判它掛了、開始搬資料,搬移本身的負載會把事情雪上加霜**,像極了[[sre-cascading-failures|連鎖失效]]的劇本。所以成熟系統多半「自動提案、**人類按下確認鍵**」。

最後是**路由**:請求怎麼找到對的分區?三種——隨便問一台由它轉發、掛一層路由服務(靠 [[zookeeper|ZooKeeper]] 記分區表)、或**客戶端自己知道**(Redis Cluster 的 `MOVED` 就是讓客戶端把 slot 表快取起來的這一型)。

## 反思

### 「保順序」和「打熱點」不可兼得,複合主鍵是我最愛的折衷

range vs hash 這對取捨,我在真實資料裡撞過:時間序列資料按時間 range 切,結果**所有當下的寫入永遠砸在最後一個分區**——分了十個區,九個在納涼。想通這章後我才看懂 Cassandra 複合主鍵的漂亮:**用 hash 決定「去哪一區」(打散熱點),用其餘欄位在「區內」排序(保住範圍掃描)**——兩個要求各給一半,但各給在對的維度上。這也解釋了 [[kafka-topics|Kafka 的 key→partition]]、[[redis-cluster|Redis 的 hash tag]] 為什麼都長這樣:**先用 hash 公平地分家,再在家裡維持秩序。** 遇到「既要均勻又要有序」的需求,先想「能不能把兩個要求拆到兩個層級」,常常就解了。

### 同一道「帳付在哪」的選擇題,第三次出現了

local vs global index,我讀到一半就笑了——**這不就是 [[ddia-storage-engines|LSM vs B-tree]]、乃至一路以來那道題嗎:同一筆成本,你要付在寫入時,還是付在讀取時?** local index 寫入便宜(只動本區),把帳掛在每次讀的 scatter/gather 上;global index 讀取精準,把帳掛在跨區的寫入上(所以多半只敢非同步,索引慢半拍)。判準也跟從前一致:**讀寫比例決定一切**——讀遠多於寫、查詢模式集中,global 划算;寫入密集、查詢能忍 scatter,local 簡單可靠。一個模式在一本書裡反覆出現三次,那它就不是知識點,是**這個領域的地心引力**——把它內化,新工具的文件你能一目十行。

### 過載時的自動搬遷,是好心辦壞事的經典劇本

Rebalancing 那段對「全自動」的警告,踩中我 SRE 的神經:**節點過載變慢 → 自動化誤判它死了 → 開始把它的分區搬走 → 搬移吃掉更多頻寬與 I/O → 其他節點也慢了 → 更多誤判、更多搬移**——教科書級的[[sre-cascading-failures|連鎖失效]],而且每一步都是「為你好」。這跟我在 [[redis-sentinel|Sentinel]] 講的「誤判比不作為更貴」同源,但資料搬移的版本更兇,因為**搬資料本身就是重負載**。所以我對「資料層的自動化」的立場比對「無狀態層」保守一級:Pod 掛了自動補、沒問題;**但要大規模搬資料的決定,自動提案、人來按鍵**——在最混亂的時刻,把「踩油門」的權力留給人。這章用一個機制設計,講透了一條維運哲學。
