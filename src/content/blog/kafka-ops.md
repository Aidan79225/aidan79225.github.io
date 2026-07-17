---
title: "Kafka 維運與部署:KRaft、retention/compaction 與監控"
date: 2026-06-26
category: tech
tags:
 - kafka
 - data-engineering
 - operations
series: "Kafka 學習筆記"
seriesOrder: 5
comments: true
draft: false
---
前四篇講的是「Kafka 怎麼用」—— [[kafka-intro|可重播的 log]]、[[kafka-topics|核心模型]]、[[kafka-delivery|投遞保證]]、[[kafka-ecosystem|生態系]]。這篇收尾,換個視角:當 Kafka 真的上線、要長期穩定跑,**維運面**得懂哪些事?四塊 —— **KRaft(叢集怎麼管自己)、retention 與 compaction(log 怎麼不爆又留得住)、監控(該盯什麼)、容量規劃(要幾台、幾個 partition)**。

## KRaft:Kafka 終於擺脫 ZooKeeper

長久以來,一套 Kafka 其實是**兩個系統**:broker 負責資料,另外還要養一個獨立的 **ZooKeeper** 叢集,管所有 metadata —— 誰是 controller、partition 分配到哪、ISR 是哪些。這帶來三個痛點:兩套系統兩套維運、ZooKeeper 成為額外的故障點、而且它管 metadata 的能力會在 partition 數很大時變成瓶頸。

**KRaft(Kafka Raft)把這件事內化了**:metadata 改用 Kafka 自己的一條內部 log(`__cluster_metadata`)以 Raft 協定管理,**controller 變成 broker 的一種角色,不再需要外部 ZooKeeper**。好處很直接:

- **單一系統**:部署、升級、監控都只剩 Kafka 一套。
- **metadata 擴展性更好**:支援的 partition 數量級拉高,failover 與啟動也更快(新 controller 不必從 ZK 慢慢載入,讀自己的 log 即可)。

新版 Kafka 已預設 KRaft、ZooKeeper 模式正式淘汰 —— 現在起新叢集不必再學 ZooKeeper,是維運上實打實的減負。

## Retention:log 不會無限長,但你決定它留多久

Kafka 是 log 不是 queue —— 事件被讀走不會消失。但磁碟有限,所以每個 topic 都有 **retention(保存)策略**決定舊資料何時清掉。實體上,每個 partition 在磁碟上切成多個 **segment** 檔,清理以「整個 segment」為單位:

- **依時間**:`retention.ms`(預設 7 天)—— 超過就刪。
- **依大小**:`retention.bytes` —— partition 超過上限就刪最舊的 segment。

這裡藏著一個呼應整個系列主軸的關鍵:**「你能重播多久的歷史」,等於你的 retention 設得多長。** 想讓新接的 consumer 能回讀過去 30 天,retention 就得 ≥ 30 天 —— 重播能力不是免費的,它直接換算成磁碟成本。

## Log Compaction:每個 key 只留最新值

`delete` 是按時間/大小砍掉舊資料;但有些 topic 你要的不是「最近 7 天」,而是「**每個 key 的最新狀態,永遠留著**」—— 例如「每個使用者的最新設定」。這就是另一種 retention:**compaction**。

它的機制:背景 cleaner 掃過 log,**同一個 key 只保留最後一筆值**,舊值壓掉;若某 key 的最新值是 `null`(稱為 **tombstone**),代表這個 key 被刪除。

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 560 200" role="img" aria-label="Log compaction 前後對比:壓縮前同一個 key 有多筆歷史值,壓縮後每個 key 只保留最後一筆" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <defs><marker id="ko1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <text x="40" y="40" fill="#9aa4b2" font-size="11" text-anchor="start">壓縮前</text>
 <rect x="40" y="50" width="58" height="34" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="69" y="71" fill="#9aa4b2" font-size="10.5" text-anchor="middle">k1:a</text>
 <rect x="102" y="50" width="58" height="34" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="131" y="71" fill="#9aa4b2" font-size="10.5" text-anchor="middle">k2:x</text>
 <rect x="164" y="50" width="58" height="34" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="193" y="71" fill="#9aa4b2" font-size="10.5" text-anchor="middle">k1:b</text>
 <rect x="226" y="50" width="58" height="34" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="255" y="71" fill="#9aa4b2" font-size="10.5" text-anchor="middle">k3:p</text>
 <rect x="288" y="50" width="58" height="34" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="317" y="71" fill="#9aa4b2" font-size="10.5" text-anchor="middle">k2:y</text>
 <rect x="350" y="50" width="58" height="34" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="379" y="71" fill="#e6e6e6" font-size="10.5" text-anchor="middle">k1:c</text>
 <line x1="224" y1="104" x2="224" y2="128" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ko1)"/>
 <text x="248" y="122" fill="#d4af37" font-size="10" text-anchor="start">cleaner:每個 key 留最後一筆</text>
 <text x="40" y="156" fill="#9aa4b2" font-size="11" text-anchor="start">壓縮後</text>
 <rect x="40" y="166" width="58" height="34" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="69" y="187" fill="#e6e6e6" font-size="10.5" text-anchor="middle">k3:p</text>
 <rect x="102" y="166" width="58" height="34" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="131" y="187" fill="#e6e6e6" font-size="10.5" text-anchor="middle">k2:y</text>
 <rect x="164" y="166" width="58" height="34" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="193" y="187" fill="#e6e6e6" font-size="10.5" text-anchor="middle">k1:c</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Compaction:k1 的 a、b 被壓掉只留最新的 c;結果是「每個 key 的最新值」的快照</figcaption>
</figure>

這正好接上 [[kafka-ecosystem|上一篇]]的 **KTable** —— 一個 compacted topic,本質就是一張「可被 key 更新的表」存成 log。兩種策略一張表收掉:

| | `delete` | `compact` |
|---|---|---|
| 留什麼 | 最近一段時間/大小內的**全部事件** | 每個 key 的**最新值** |
| 砍什麼 | 過期的舊 segment | 同 key 的舊值 |
| 適合 | 事件流(訂單、點擊) | 狀態快照(設定、最新餘額) |

## 監控:該盯哪些指標

Kafka 出事很少是「整個掛掉」,多半是某個指標悄悄惡化。最該盯的幾個,分三層:

- **Consumer Lag(最重要)**:`log 尾端 offset − consumer 已 commit offset`,也就是「消費者落後生產者多少筆」。持續變大 = 消費跟不上,延遲會一路累積。這是我第一個看的數字。
- **Under-replicated partitions**:ISR 數 < 複本數,代表有複本沒跟上 leader。這直接侵蝕 [[kafka-delivery|上上篇]]講的「不丟」保證 —— 數字 > 0 就要警覺,接近丟資料風險。
- **Broker 資源**:磁碟使用率(retention 沒設好會塞爆)、網路 throughput、request 延遲。

一句話抓重點:**Consumer Lag 顧「快不快」、Under-replicated 顧「會不會丟」**,這兩個盯住,大部分事故能提早攔下。

## 容量規劃:幾台 broker、幾個 partition

這塊是經驗法則,不是精算,但有幾個錨點:

- **partition 數**:給足 throughput 與平行度(回顧 [[kafka-topics|第二篇]]:平行度上限 = partition 數),但別爆量 —— 太多 partition 會拖累 metadata 與 rebalance(KRaft 緩解了上限,但仍非無限)。
- **複本數**:`3` 是常見起點(容許一台掛、仍有兩份)。
- **磁碟**:粗估 ≈ `每日 throughput × retention 天數 × 複本數`,再留緩衝。retention 拉長,磁碟就等比變大。
- **broker 數**:至少 ≥ 複本數,再依 throughput 與分散風險往上加。

## 反思

### Consumer Lag 是我第一個盯、也最該盯的指標

如果只能在儀表板上留一個 Kafka 指標,我會選 Consumer Lag。原因是它**同時反映上下游的健康**:lag 持續變大,可能是 consumer 變慢、掛了、卡在某筆毒訊息,也可能是上游突然暴量 —— 不管哪種,使用者很快會感受到「資料慢了」。而且它是**領先指標**:lag 在還沒釀成事故前就會先漲,給你反應時間。我的習慣是對它設兩道閾值,一道提醒、一道告警,別等到下游抱怨才回頭看。

### retention 是「重播能力」與「磁碟成本」的對帳,要當業務決策談

retention 表面是個技術參數,實際上是一筆帳:**留越久,重播與回補的能力越強,但磁碟錢越多。** 我看過兩種極端 —— 有人預設 7 天就不管了,結果某次要重算歷史才發現資料早被刪;也有人「保險起見」全開 90 天,磁碟成本默默翻幾倍卻幾乎沒用到。我現在會把它當成跟團隊一起拍板的決策:**這個 topic 的資料,最壞情況要能回讀多久?** 答案驅動 retention,而不是隨手用預設。重播能力是 Kafka 的招牌,但它是你付磁碟錢買來的。

### KRaft 之前,ZooKeeper 是最常被忽略卻最常出事的角落

回頭看,ZooKeeper 一直是 Kafka 維運裡那個「平常沒人理、一出事就很痛」的東西 —— 團隊全部心力都在 broker 和 topic,卻忘了底下還躺著一套要單獨照顧的協調系統,它的磁碟滿了、連線爆了,整個 Kafka 跟著不穩。**KRaft 把這個長年的隱藏故障點直接拿掉**,我認為是 Kafka 近年最有感的維運改進。新叢集直接上 KRaft,等於少維護一整套系統、少一個半夜被叫起來的理由。

### 維運的心法:Kafka 不會自己壞,是「承諾」沒被監控兌現

把這個系列收束成一句話:Kafka 給的每個保證,背後都有個你要守住的設定 —— `acks=all` 要配 `min.insync.replicas`、不丟要靠 ISR 健康、能重播要靠 retention 夠長。**這些承諾上線那天都成立,但會隨時間悄悄漂移** —— 複本掉出 ISR、磁碟逼近上限、lag 緩緩累積。維運的本質,就是**用監控持續確認那些當初設下的承諾還算數**。Kafka 很少自己壞掉;壞掉的,通常是沒人盯著的那個承諾。這也是整個系列一以貫之的調子:Kafka 給的從來不是免費的保證,而是一組你得自己設計到位、並且持續守住的工具。
