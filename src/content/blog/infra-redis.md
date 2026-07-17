---
title: "Redis:記憶體為界的有狀態服務"
date: 2026-07-17
category: tech
description: "Redis 跟 Kafka 剛好是一組對照——Kafka 磁碟為王,Redis 記憶體為界。同樣有狀態,但『狀態放哪』不同,infra 決策就完全不同:Redis 的容量硬上限是記憶體、maxmemory 是一道撞了就 evict 或報錯的牆、持久化只是為了重啟回暖。這篇從 infra 角度看 Redis:記憶體為什麼是硬牆、fork 時要留的 headroom、單機/主從/Sentinel/Cluster 四種拓撲各解決什麼、以及在 k8s 上怎麼跑。"
tags:
 - infrastructure
 - redis
series: "從 Infra 角度看資料工具"
seriesOrder: 4
comments: true
draft: false
---
第二個有狀態的重量級是 Redis,而它跟 [[infra-kafka|上一篇的 Kafka]] 剛好是一組完美對照:**Kafka 磁碟為王,Redis 記憶體為界**。兩者都有狀態,但[[infra-intro|體檢表]]第②題「狀態放哪」的答案不同——一個在磁碟、一個在記憶體——它們的 infra 決策就走向了完全不同的方向。

## 記憶體為界:硬牆在 RAM

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 210" role="img" aria-label="Redis 記憶體為界。一根代表實體 RAM 的直條:底部是已用資料在記憶體裡,往上是可成長空間,再往上有一條 maxmemory 硬牆,撞到牆就開始 evict 淘汰或在 noeviction 下寫入報錯;maxmemory 到實體 RAM 頂之間要留 fork headroom,因為持久化 fork 時記憶體可能翻倍。資料主要在記憶體,容量的硬上限就是 RAM;持久化 RDB 或 AOF 到磁碟只是為了重啟回暖不是主角。對照:Kafka 瓶頸是磁碟,Redis 瓶頸是記憶體容量。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <defs><marker id="rr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
 <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">記憶體為界:硬牆在 RAM(對照 Kafka 磁碟為王)</text>
 <rect x="238" y="42" width="104" height="52" rx="0" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.1"/><text x="290" y="64" fill="#d6a45c" font-size="7.6" text-anchor="middle">fork headroom</text><text x="290" y="76" fill="#9aa4b2" font-size="6.6" text-anchor="middle">(持久化時可能翻倍)</text><text x="290" y="88" fill="#9aa4b2" font-size="6.6" text-anchor="middle">實體 RAM 頂 ↑</text>
 <line x1="230" y1="94" x2="350" y2="94" stroke="#e0733a" stroke-width="1.6"/><text x="348" y="92" fill="#e0733a" font-size="7.6" text-anchor="start" font-weight="bold">← maxmemory 硬牆</text>
 <rect x="238" y="94" width="104" height="40" rx="0" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="290" y="118" fill="#9aa4b2" font-size="7.6" text-anchor="middle">可成長空間</text>
 <rect x="238" y="134" width="104" height="50" rx="0" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="290" y="156" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">已用資料</text><text x="290" y="169" fill="#9aa4b2" font-size="6.8" text-anchor="middle">(在記憶體)</text>
 <text x="120" y="120" fill="#e6e6e6" font-size="8" text-anchor="middle">資料在記憶體</text><text x="120" y="134" fill="#9aa4b2" font-size="7.6" text-anchor="middle">→ 容量硬上限 = RAM</text>
 <text x="470" y="110" fill="#e0733a" font-size="7.8" text-anchor="middle" font-weight="bold">撞牆 → evict</text><text x="470" y="123" fill="#9aa4b2" font-size="7.4" text-anchor="middle">或 noeviction 報錯</text>
 <rect x="60" y="158" width="70" height="24" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="95" y="174" fill="#9aa4b2" font-size="7.4" text-anchor="middle">磁碟</text>
 <line x1="238" y1="170" x2="132" y2="170" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rr)"/><text x="185" y="164" fill="#9aa4b2" font-size="6.8" text-anchor="middle">RDB/AOF 重啟回暖</text>
 <text x="290" y="200" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">對照:Kafka 瓶頸=磁碟 throughput / 容量　·　Redis 瓶頸=記憶體容量</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Redis 的資料主要活在記憶體,所以它的容量有一道<b>硬牆</b>——<b style="color:#e0733a">maxmemory</b>。撞到牆會怎樣?看 <a href="/blog/redis-expiration-eviction/">eviction 政策</a>:要嘛淘汰舊 key、要嘛(noeviction)直接讓寫入報錯。而 maxmemory 不能貼著實體 RAM 設,得留一段 <b>fork headroom</b>——因為<a href="/blog/redis-persistence/">持久化</a>時 fork + copy-on-write 會讓記憶體短暫暴增、最壞接近翻倍。至於落到磁碟的 RDB/AOF,不是主角,只是為了「重啟能快速回暖」。看 Redis,先看記憶體</figcaption>
</figure>

這張圖和 Kafka 那張放在一起看,就是這系列想訓練的眼睛:**同樣有狀態,但狀態的「介質」不同,瓶頸和決策就全不一樣。** Kafka 的資料在磁碟,你煩惱的是磁碟 throughput 與 TB 級容量;Redis 的資料在記憶體,你煩惱的是那道貴又硬的 RAM 牆——記憶體不像磁碟能便宜地一直加,所以 Redis 的 infra,幾乎都圍繞「怎麼在有限記憶體裡活好」打轉。

## 拓撲階梯:你到底需要哪一種?

Redis 的第二個核心 infra 決策,是**拓撲**。從單機到 Cluster 是一道階梯,每爬一階,解決一個新問題、也多一分複雜:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 224" role="img" aria-label="Redis 拓撲階梯,由下往上四層,越上面可用性與容量越高、複雜度也越高。第一層單機,最簡單,但是單點故障、容量受限於單機記憶體。第二層主從複製,replica 可以分擔讀、也是 HA 的基礎,但故障時要人工切換。第三層 Sentinel,監控加自動故障轉移,靠過半選出一個 Sentinel 主導 failover。第四層 Cluster,用 16384 個 slot 分片,突破單機記憶體上限,代價是 multi-key 操作受限、整體較複雜。下方決策:要 HA 就上 Sentinel;資料超過單機記憶體才上 Cluster;別為了不需要的規模上 Cluster。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <defs><marker id="rl" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker></defs>
 <text x="318" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">拓撲階梯:每爬一階,解一個新問題</text>
 <line x1="52" y1="188" x2="52" y2="40" stroke="#54b890" stroke-width="1.4" marker-end="url(#rl)"/>
 <text x="40" y="116" fill="#54b890" font-size="7.6" text-anchor="middle" transform="rotate(-90 40 116)">可用性 / 容量 · 複雜度 ↑</text>
 <rect x="70" y="34" width="486" height="34" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="86" y="55" fill="#54b890" font-size="9" text-anchor="start" font-weight="bold">④ Cluster(分片)</text><text x="546" y="55" fill="#9aa4b2" font-size="8" text-anchor="end">16384 slot 分片、突破單機 RAM｜multi-key 受限、較複雜</text>
 <rect x="70" y="72" width="486" height="34" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="86" y="93" fill="#4f6df5" font-size="9" text-anchor="start" font-weight="bold">③ Sentinel</text><text x="546" y="93" fill="#9aa4b2" font-size="8" text-anchor="end">監控 + 自動故障轉移(過半選 leader 主導 failover)</text>
 <rect x="70" y="110" width="486" height="34" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="86" y="131" fill="#4f6df5" font-size="9" text-anchor="start" font-weight="bold">② 主從複製</text><text x="546" y="131" fill="#9aa4b2" font-size="8" text-anchor="end">replica 分擔讀 + HA 基礎｜故障要人工切</text>
 <rect x="70" y="148" width="486" height="34" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.3"/><text x="86" y="169" fill="#d6a45c" font-size="9" text-anchor="start" font-weight="bold">① 單機</text><text x="546" y="169" fill="#9aa4b2" font-size="8" text-anchor="end">最簡單｜單點故障、容量 = 單機記憶體</text>
 <text x="318" y="204" fill="#e6e6e6" font-size="8.2" text-anchor="middle" font-weight="bold">要 HA → 上 Sentinel　·　資料超過單機 RAM → 才上 Cluster</text>
 <text x="318" y="219" fill="#e0733a" font-size="8" text-anchor="middle" font-weight="bold">別為了不需要的規模上 Cluster——它的複雜度不是免費的</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">四種拓撲,對應四種需求:<b>單機</b>夠簡單但單點又受限於單機記憶體;<b style="color:#4f6df5">主從複製</b>讓 replica 分擔讀、也是 HA 的地基(但故障得人工切);<b style="color:#4f6df5">Sentinel</b> 加上自動故障轉移——由多個 Sentinel <a href="/blog/sre-consensus/">過半</a>選出一個來主導 failover;<b style="color:#54b890">Cluster</b> 才用 slot 分片突破單機記憶體上限,代價是 multi-key 操作受限、整體複雜。選型的關鍵是別跳級:<b>要高可用就上 Sentinel,但只有當資料真的裝不進單機記憶體時,才需要 Cluster</b></figcaption>
</figure>

## 容量、監控、在 k8s 上

- **容量**:記憶體是硬牆。設好 `maxmemory` + [[redis-expiration-eviction|eviction 政策]],並**預留 fork headroom**(別讓 maxmemory 貼死實體 RAM,否則持久化一 fork 就 OOM)。
- **監控**:`used_memory` vs `maxmemory`(離牆多近)、eviction / expired 數、快取命中率、replication lag(replica 落後多少)、slowlog(慢命令)、連線數。記憶體使用率是我第一個看的。
- **在 k8s 上**:StatefulSet + PV 放持久化檔;但重點是 **memory 的 `requests`/`limits` 要設對**——[[infra-k8s|memory 超 limit 會被 OOMKill]],而 Redis 又要留 fork headroom,所以 pod 的 memory limit 得比 maxmemory 高出一截,否則持久化一觸發就被 k8s 殺掉。這是很多人「Redis 一備份就被重啟」的元兇。

## 反思

### 同樣有狀態,「狀態放哪」決定了一切

把 Kafka 和 Redis 並排體檢,是我覺得這系列最值得的一組對照。它們都在[[infra-intro|stateful 那一端]],但因為狀態的介質不同——一個磁碟、一個記憶體——幾乎所有 infra 決策都分了岔:Kafka 煩惱磁碟 throughput 與 retention,Redis 煩惱 maxmemory 與 fork headroom;Kafka 擴容是搬 partition,Redis 擴容是加 replica 或上 Cluster。這讓我對體檢表第②題的威力更有感——**「有沒有狀態」只是第一層,「狀態存在什麼介質上」才真正決定一個工具的脾氣。** 看一個新的有狀態系統,我現在會追問到底:它的狀態是在記憶體、本地磁碟、還是遠端儲存?答案一出來,它的瓶頸、擴縮方式、故障模式就八九不離十了。

### 拓撲選型,是「別過度設計」的一道考題

Redis Cluster 很酷——slot 分片、自動 rebalance、水平擴展,聽起來就很「大規模」。但我看過太多團隊,資料明明幾 GB、單機記憶體綽綽有餘,卻一上來就架 Cluster,然後被 multi-key 操作的限制、slot 遷移的複雜、維運的負擔搞得焦頭爛額。**Cluster 解決的是「單機記憶體裝不下」這個特定問題;如果你沒有這個問題,它帶來的只有複雜度。** 大多數人真正需要的,其實只是「主從 + Sentinel」——有 HA、有讀擴展,就夠了。這道拓撲選型題,教我一個更普遍的紀律:**先確認你有那個問題,再上解那個問題的方案**;為了不存在的規模預先架設複雜架構,是我看過最常見、也最貴的一種過度設計。

### 記憶體是硬牆,而硬牆逼你面對取捨

我最喜歡 Redis 的一點,反而是它的「限制」——記憶體不像磁碟,不能便宜地一直加,所以它逼著你**面對取捨**:哪些資料值得放進這麼貴的記憶體?該設多長的 TTL?撞牆時要淘汰誰?這些問題,磁碟系統可以靠「再加一顆硬碟」拖延,但記憶體系統躲不掉。而我發現,正是這種「資源有硬上限」的約束,反而養出更好的設計直覺——當你不能無限擴張,你就被迫去想「什麼才是真正重要、值得留下的」。無論是記憶體、時間、還是團隊的注意力,**有限的資源逼出的取捨,往往比無限的資源養出的鋪張,更接近好的工程**。
