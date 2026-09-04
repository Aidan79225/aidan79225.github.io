---
title: "Pub/Sub vs Stream:Redis 版的訊息系統"
date: 2026-07-21
category: tech
tags:
  - redis
  - distributed-systems
series: "Redis 學習筆記"
seriesOrder: 12
comments: true
draft: false
---
Redis 也能當訊息系統,但它有**兩套截然不同**的東西,用錯就會莫名其妙掉訊息、或殺雞用牛刀:**Pub/Sub**(廣播,丟了就丟)和 **Stream**(留著的 log,像一台縮小版 Kafka)。這是整個 Redis 系列的收尾,也剛好把它接回 [[kafka-intro|Kafka]]——因為 Stream 幾乎就是把 Kafka 的核心概念,濃縮進一個 Redis 資料結構。

## 一個丟了就丟,一個留著可重播

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 220" role="img" aria-label="Redis Pub/Sub 與 Stream 的對比。左邊 Pub/Sub:publisher 把訊息發到一個 channel,只有當下正在訂閱的 subscriber 收得到,兩個在線的收到了,一個離線的就漏掉了,而且訊息不留存、沒有重播、沒有 ack。右邊 Stream:producer 用 XADD 把訊息append 進一條 log,訊息 m1 到 m5 都留著,consumer 可以從任意位置讀、離線後上線還能從上次的位置補讀,而且有 consumer group 和 ack。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ps" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="26" x2="290" y2="196" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="42" fill="#e0733a" font-size="9.6" text-anchor="middle" font-weight="bold">Pub/Sub:廣播,丟了就丟</text>
    <rect x="30" y="52" width="212" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="136" y="68" fill="#e6e6e6" font-size="7.8" text-anchor="middle">PUBLISH news "…"</text>
    <line x1="136" y1="76" x2="136" y2="88" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ps)"/>
    <rect x="30" y="90" width="212" height="22" rx="5" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.3"/><text x="136" y="105" fill="#e0733a" font-size="7.8" text-anchor="middle">channel: news(不留存)</text>
    <line x1="70" y1="112" x2="63" y2="130" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ps)"/><line x1="146" y1="112" x2="146" y2="130" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ps)"/><line x1="210" y1="112" x2="228" y2="130" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ps)"/>
    <rect x="26" y="132" width="72" height="34" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="62" y="147" fill="#54b890" font-size="7.6" text-anchor="middle">Sub 線上</text><text x="62" y="159" fill="#9aa4b2" font-size="7" text-anchor="middle">✓ 收到</text>
    <rect x="110" y="132" width="72" height="34" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="146" y="147" fill="#54b890" font-size="7.6" text-anchor="middle">Sub 線上</text><text x="146" y="159" fill="#9aa4b2" font-size="7" text-anchor="middle">✓ 收到</text>
    <rect x="194" y="132" width="76" height="34" rx="5" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="232" y="147" fill="#e05a7d" font-size="7.6" text-anchor="middle">Sub 離線</text><text x="232" y="159" fill="#e05a7d" font-size="7" text-anchor="middle">✗ 漏掉</text>
    <text x="146" y="186" fill="#9aa4b2" font-size="7.6" text-anchor="middle">沒人在聽 → 沒了・無持久・無重播・無 ack</text>
    <text x="434" y="42" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">Stream:留著的 log,可重播</text>
    <rect x="318" y="52" width="232" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="434" y="68" fill="#e6e6e6" font-size="7.8" text-anchor="middle">XADD stream * …(append)</text>
    <line x1="434" y1="76" x2="434" y2="86" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ps)"/>
    <rect x="322" y="90" width="42" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="343" y="105" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m1</text><rect x="368" y="90" width="42" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="389" y="105" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m2</text><rect x="414" y="90" width="42" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="435" y="105" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m3</text><rect x="460" y="90" width="42" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="481" y="105" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m4</text><rect x="506" y="90" width="42" height="22" rx="3" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="527" y="105" fill="#9aa4b2" font-size="7.4" text-anchor="middle">m5</text>
    <line x1="343" y1="130" x2="343" y2="114" stroke="#54b890" stroke-width="1.2" marker-end="url(#ps)"/><line x1="481" y1="130" x2="481" y2="114" stroke="#d6a45c" stroke-width="1.2" marker-end="url(#ps)"/>
    <text x="343" y="142" fill="#54b890" font-size="7" text-anchor="middle">舊 consumer</text><text x="481" y="142" fill="#d6a45c" font-size="7" text-anchor="middle">另一個從這讀</text>
    <text x="434" y="164" fill="#9aa4b2" font-size="7.6" text-anchor="middle">訊息留著(可設 MAXLEN 上限)</text>
    <text x="434" y="186" fill="#9aa4b2" font-size="7.6" text-anchor="middle">可從任意位置重讀・離線再上線能補・有 group + ack</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e0733a">Pub/Sub</b> 是純廣播:訊息發到 channel,只有<b>當下正在訂閱</b>的人收得到,離線的、晚來的一律<b>漏掉</b>——沒有留存、沒有重播、沒有 ack(fire-and-forget)。<b style="color:#4f6df5">Stream</b> 則是一條 <b>append-only 的 log</b>:訊息 <code>XADD</code> 進去就<b>留著</b>(可設 MAXLEN 上限),consumer 能從任意位置讀、離線後上線還能從上次位置補讀,還帶 consumer group 與 ack。這個「丟了就丟 vs 留著記帳」的差別,跟 <a href="/blog/infra-rabbitmq/">RabbitMQ 的 queue vs Kafka 的 log</a> 是同一條軸</figcaption>
</figure>

## Pub/Sub:廣播,適合「漏了也沒差」的即時通知

Pub/Sub 的模型三句話講完:`SUBSCRIBE` 訂閱一個 channel、`PUBLISH` 往 channel 發、所有**當下在線**的訂閱者立刻收到。它是 **fire-and-forget**——broker 不記誰收過、不重送、不留存。所以它天生只適合**「漏一兩則也無所謂」的即時廣播**:線上狀態、即時通知、跨節點的快取失效廣播(叫大家把某個 key 清掉)。

```bash
SUBSCRIBE news          # 訂閱(這條連線進入訂閱模式)
PUBLISH news "hello"    # 另一條連線發佈,只有此刻在線的訂閱者收得到
```

**千萬別拿它做「不能掉」的任務派發**——訂閱者重啟的那幾秒、網路抖一下,那段時間的訊息就永遠消失了,而且你連「掉了」都不會知道。

## Stream:留著的 log + consumer group,像輕量 Kafka

要「不能掉、可重播、多個 worker 分工」,就用 **Stream**。它是一條 append-only log,`XADD` 寫入、每則有一個遞增 ID;更關鍵的是它有**消費者群組(consumer group)**,行為幾乎就是 Kafka 的翻版:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 196" role="img" aria-label="Redis Stream 的 consumer group 與 ack。一條 stream 有 m1 到 m6 六則訊息。一個叫 workers 的 consumer group 裡有兩個 consumer C1 和 C2,群組把訊息分給組內的成員,每則只交給一個人,C1 拿 m1 m3 m5,C2 拿 m2 m6。處理完要 XACK 確認,已確認的移出 pending。m4 交給了 C2 但還沒 ack,例如 C2 掛了,它就留在 pending entries list 裡,之後會被重新指派給別的 consumer 重送,達成 at-least-once。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="st" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Stream + consumer group:分工、ack、沒 ack 就重送</text>
    <text x="40" y="44" fill="#9aa4b2" font-size="8" text-anchor="middle">stream</text>
    <rect x="70" y="32" width="60" height="24" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="100" y="48" fill="#e6e6e6" font-size="7.6" text-anchor="middle">m1</text><rect x="134" y="32" width="60" height="24" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="164" y="48" fill="#e6e6e6" font-size="7.6" text-anchor="middle">m2</text><rect x="198" y="32" width="60" height="24" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="228" y="48" fill="#e6e6e6" font-size="7.6" text-anchor="middle">m3</text><rect x="262" y="32" width="60" height="24" rx="3" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.3"/><text x="292" y="48" fill="#d6a45c" font-size="7.6" text-anchor="middle">m4</text><rect x="326" y="32" width="60" height="24" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="356" y="48" fill="#e6e6e6" font-size="7.6" text-anchor="middle">m5</text><rect x="390" y="32" width="60" height="24" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="420" y="48" fill="#e6e6e6" font-size="7.6" text-anchor="middle">m6</text>
    <rect x="70" y="96" width="200" height="70" rx="8" fill="none" stroke="#54b890" stroke-width="1.4"/><text x="170" y="112" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">group: workers</text>
    <rect x="86" y="122" width="76" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="124" y="141" fill="#e6e6e6" font-size="8" text-anchor="middle">C1</text>
    <rect x="178" y="122" width="76" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="216" y="141" fill="#e6e6e6" font-size="8" text-anchor="middle">C2</text>
    <line x1="100" y1="56" x2="120" y2="120" stroke="#54b890" stroke-width="1" marker-end="url(#st)"/><line x1="228" y1="56" x2="128" y2="120" stroke="#54b890" stroke-width="1" marker-end="url(#st)"/>
    <line x1="164" y1="56" x2="212" y2="120" stroke="#9aa4b2" stroke-width="1" marker-end="url(#st)"/><line x1="420" y1="56" x2="222" y2="120" stroke="#9aa4b2" stroke-width="1" marker-end="url(#st)"/>
    <text x="124" y="164" fill="#9aa4b2" font-size="6.8" text-anchor="middle">m1·m3·m5</text><text x="216" y="164" fill="#9aa4b2" font-size="6.8" text-anchor="middle">m2·m6</text>
    <line x1="292" y1="56" x2="360" y2="92" stroke="#d6a45c" stroke-width="1.2" stroke-dasharray="3 2" marker-end="url(#st)"/>
    <rect x="330" y="94" width="230" height="34" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="445" y="110" fill="#e05a7d" font-size="7.8" text-anchor="middle" font-weight="bold">m4 給了 C2 但沒 XACK(C2 掛了)</text><text x="445" y="122" fill="#9aa4b2" font-size="7" text-anchor="middle">→ 留在 pending(PEL)→ 重新指派重送</text>
    <text x="445" y="150" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">處理完 XACK → 移出 pending</text>
    <text x="445" y="166" fill="#9aa4b2" font-size="7.6" text-anchor="middle">沒 ack 的一定被重送 → at-least-once</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一個 <b style="color:#54b890">consumer group</b>(workers)裡的多個 consumer <b>分工</b>消費同一條 stream——每則訊息只交給組內一個人(C1 拿 m1/m3/m5、C2 拿 m2/m6),這樣加 consumer 就能水平擴。處理完要 <code>XACK</code> 確認;<b style="color:#e05a7d">沒 ack 的訊息</b>(像 C2 拿了 m4 卻掛掉)會留在 <b>pending(PEL)</b>,之後被重新指派、<b>重送</b>——這就是 at-least-once。看出來了嗎?這幾乎是 <a href="/blog/kafka-intro/">Kafka consumer group</a> 的縮小版</figcaption>
</figure>

```bash
XADD orders * item book qty 2                 # 寫一則(* = 自動生遞增 ID)
XGROUP CREATE orders workers 0                 # 建一個從頭開始的 group
XREADGROUP GROUP workers c1 COUNT 10 STREAMS orders >   # c1 取新訊息
XACK orders workers 1699-0                      # 處理完,確認這則(否則留在 PEL)
XPENDING orders workers                         # 看有哪些「拿了還沒 ack」的
```

## 那到底何時該直接上 Kafka?

Stream 這麼像 Kafka,那還要 Kafka 幹嘛?分界在**規模與定位**:

- **用 Redis Stream**:輕量的訊息 / 任務佇列,量沒有大到誇張、保留時間短、你**本來就有 Redis**、不想為了一個佇列再架一整套 Kafka。
- **直接上 [[infra-kafka|Kafka]]**:超大 throughput、要**長期保留**(TB 級、幾天到幾週,可回溯重算)、**巨量 fan-out**(幾十個消費組各讀一份)、要生態(Kafka Connect、Streams)、要更硬的持久保證。**Redis Stream 的資料活在記憶體裡**(靠 [[redis-persistence|RDB/AOF]] 落盤、又通常設 MAXLEN 截斷),它天生不是為「保留海量歷史」設計的。

一句話:**Redis Stream 是「順手好用的輕量佇列」,不是「Kafka 的替代品」。** 需求還小就別為了一個佇列扛一座 Kafka;但真需要 Kafka 那些能力時,硬用 Stream 撐,就是在重造一個殘缺的 Kafka。

## 反思

### 「丟了就丟」還是「留著記帳」,先問這一句

Pub/Sub 和 Stream 的選擇,說到底只有一個問題:**漏掉一則,你承受得起嗎?** 承受得起(即時通知、狀態廣播),Pub/Sub 又輕又簡單;承受不起(訂單、扣款、任務派發),就得用會留存、能重播、有 ack 的 Stream。這跟我在 [[infra-rabbitmq|RabbitMQ]] 那條「留著 vs 拿走」、Kafka 的「log vs queue」是同一種思考——**選訊息方案前,先想清楚『漏一則會發生什麼』,答案自己就把工具挑好了**。我看過太多事故,root cause 就是拿 fire-and-forget 的東西去送「絕對不能掉」的訊息,還一直以為是別的地方壞了。

### 好的抽象會「長成同一個形狀」

Redis Stream 讓我很有感的一點:它幾乎是把 Kafka 的核心——append log、offset、consumer group、ack、pending——**濃縮進一個 Redis 資料結構**。兩個團隊、兩套完全不同的實作,最後長出的骨架卻高度雷同。這說明那些概念**不是 Kafka 的專利,而是「可靠的持久訊息」這個問題的自然解**——誰認真去做,都會長出 log + offset + group + ack 這副形狀。這也是我學東西越來越省力的原因:**看懂一個好抽象,就看懂了一票**。學透 Kafka 的 consumer group,再看 Redis Stream、看別家的訊息系統,都是同一個故事換套皮。

### 收尾:Redis 的每一面,都在證明「它不只是快取」

寫到這篇,整個 [[redis-intro|Redis 系列]]剛好收口。回頭看這一路——資料結構、單執行緒、持久化、過期淘汰、快取三災、分散式鎖、複製、Sentinel、Cluster、交易與 Lua、到這篇的訊息系統——每一面其實都在證明開篇那句話:**Redis 是一台記憶體資料結構伺服器,「快取」只是它最出名的一個用法。** 它能當鎖、當佇列、當排行榜、當計數器、當輕量訊息 log,是因為它給了你一套**又快又原子的資料結構**,剩下的是你怎麼組合。這也是我最想留給讀完整個系列的你的一句話:**別把 Redis 框在「快取」那個小盒子裡**——當你開始把它當「手邊一台隨叫隨到的資料結構伺服器」,很多原本要架大東西才能解的問題,會突然變得又輕又簡單。
