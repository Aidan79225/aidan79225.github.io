---
title: "RabbitMQ:訊息 broker 的叢集與流控"
date: 2026-07-17
category: tech
description: "RabbitMQ 跟 Kafka 都是訊息中介,但 infra 形狀差很多,關鍵在一個字:Kafka 是 log(訊息留著、consumer 用 offset 自己讀、可重播),RabbitMQ 是 queue(被取走 ack 就消失、broker 追蹤每筆)。這篇純從 infra 角度看 RabbitMQ:log vs queue 撐開的兩套不同 infra、它最招牌的坑——queue backlog 撞 memory/disk watermark 觸發 alarm、反過來 block publisher 的 backpressure 機制,以及 HA 用 quorum queue(Raft)、在 k8s 上怎麼跑。"
tags:
 - infrastructure
 - rabbitmq
series: "從 Infra 角度看資料工具"
seriesOrder: 5
comments: true
draft: false
---
收尾「有狀態的重量級」這一批,第三個是 RabbitMQ。它跟 [[infra-kafka|Kafka]] 都是訊息中介,但 infra 形狀差很多,而差別可以濃縮成**一個字**:**Kafka 是 log,RabbitMQ 是 queue。** 這個字的差別,讓它們的狀態、擴展、故障全走向了不同的方向。

## log vs queue:一個字的差別,兩種 infra

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 210" role="img" aria-label="Kafka 的 log 與 RabbitMQ 的 queue 對比。左邊 Kafka 是 log,訊息 m1 到 m5 寫進去就留著,consumer A 和 consumer B 各自用自己的 offset 標記讀到哪、互不影響,可以重播、可以多消費者 fan out。右邊 RabbitMQ 是 queue,訊息排隊,consumer 從前面取走並 ack 之後,訊息就從 queue 消失,broker 負責追蹤每一筆的 ack。下方:狀態上 Kafka 是一條消費留痕的 log,RabbitMQ 是 queue 裡待處理的訊息、消費即減少;取捨上要事件流可重播 High-throughput 選 Kafka,要任務佇列複雜路由 per-message 控制選 RabbitMQ。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <defs><marker id="rq" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
 <line x1="290" y1="16" x2="290" y2="150" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
 <text x="145" y="32" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">Kafka:log</text>
 <rect x="24" y="44" width="46" height="24" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="47" y="60" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m1</text><rect x="72" y="44" width="46" height="24" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="95" y="60" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m2</text><rect x="120" y="44" width="46" height="24" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="143" y="60" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m3</text><rect x="168" y="44" width="46" height="24" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1"/><text x="191" y="60" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m4</text><rect x="216" y="44" width="46" height="24" rx="3" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="239" y="60" fill="#9aa4b2" font-size="7.4" text-anchor="middle">m5</text>
 <line x1="95" y1="88" x2="95" y2="70" stroke="#54b890" stroke-width="1.2" marker-end="url(#rq)"/><text x="95" y="100" fill="#54b890" font-size="7" text-anchor="middle">B 讀到 m2</text>
 <line x1="191" y1="88" x2="191" y2="70" stroke="#d6a45c" stroke-width="1.2" marker-end="url(#rq)"/><text x="191" y="100" fill="#d6a45c" font-size="7" text-anchor="middle">A 讀到 m4</text>
 <text x="145" y="122" fill="#9aa4b2" font-size="7.6" text-anchor="middle">訊息留著 · 各自用 offset 讀</text>
 <text x="145" y="136" fill="#9aa4b2" font-size="7.6" text-anchor="middle">可重播 · 多消費者 fan out</text>
 <text x="435" y="32" fill="#e0733a" font-size="9.6" text-anchor="middle" font-weight="bold">RabbitMQ:queue</text>
 <rect x="316" y="44" width="40" height="24" rx="3" fill="#3a2d1f" stroke="#e0733a" stroke-width="1"/><text x="336" y="60" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m4</text><rect x="358" y="44" width="40" height="24" rx="3" fill="#3a2d1f" stroke="#e0733a" stroke-width="1"/><text x="378" y="60" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m3</text><rect x="400" y="44" width="40" height="24" rx="3" fill="#3a2d1f" stroke="#e0733a" stroke-width="1"/><text x="420" y="60" fill="#e6e6e6" font-size="7.4" text-anchor="middle">m2</text>
 <line x1="442" y1="56" x2="474" y2="56" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#rq)"/>
 <rect x="476" y="44" width="80" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="516" y="60" fill="#e6e6e6" font-size="7.4" text-anchor="middle">consumer</text>
 <text x="435" y="90" fill="#e0733a" font-size="7.4" text-anchor="middle" font-weight="bold">m1 已被取走 + ack → 消失</text>
 <text x="435" y="122" fill="#9aa4b2" font-size="7.6" text-anchor="middle">消費即移除 · broker 追蹤 ack</text>
 <text x="435" y="136" fill="#9aa4b2" font-size="7.6" text-anchor="middle">複雜路由 · per-message 控制</text>
 <rect x="30" y="158" width="520" height="42" rx="8" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
 <text x="290" y="176" fill="#e6e6e6" font-size="8" text-anchor="middle">狀態:Kafka = 一條「消費留痕」的 log(磁碟為王)　·　RabbitMQ = queue 裡待處理的訊息(消費即減少)</text>
 <text x="290" y="192" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">取捨:事件流 / 可重播 / High-throughput → Kafka　·　任務佇列 / 複雜路由 / per-message → RabbitMQ</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">Kafka(log)</b>:訊息寫進去就<b>留著</b>,每個 consumer 用自己的 offset 記錄讀到哪、互不干擾——所以能重播、能多消費者各自 fan out。<b style="color:#e0733a">RabbitMQ(queue)</b>:訊息排隊等人拿,被取走並 <b>ack</b> 之後就從 queue <b>消失</b>,由 broker 逐筆追蹤誰 ack 了沒。這個「留著 vs 拿走」的模型差,直接決定了兩者的脾氣:Kafka 適合 High-throughput 的事件流,RabbitMQ 適合要複雜路由、要 per-message 控制(優先級、延遲、逐筆重試)的任務分派</figcaption>
</figure>

從 infra 的角度,這個模型差最關鍵的後果是**狀態的形狀不同**:Kafka 的狀態是一條只增不減、以磁碟 throughput 為王的 log;RabbitMQ 的狀態是一堆 queue 裡「還沒被處理掉」的訊息——它會**隨消費而減少、隨 backlog 而膨脹**。而正是這個「會膨脹的 queue」,埋下了 RabbitMQ 最招牌的坑。

## RabbitMQ 的招牌坑:queue backlog 與 backpressure 

RabbitMQ 的頭號故障模式,是 **queue backlog**——一旦 consumer 跟不上 producer,queue 就會越積越大,而 RabbitMQ 有一套自我保護機制會在此時啟動:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 200" role="img" aria-label="RabbitMQ 的流控與 backpressure。Publisher 往 queue 寫,consumer 從 queue 取但跟不上,於是 queue 越堆越大,記憶體或磁碟用量撞到 watermark 水位線,觸發 alarm。RabbitMQ 反過來阻擋 publisher,也就是 backpressure ,讓上游暫時寫不進去。這是一種自我保護,免得 broker 被撐爆 OOM,但對上游來說是突然寫不進去。解法是監控 queue depth、確保消費速率跟得上、設 queue 上限或 TTL 或 dead-letter。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <defs><marker id="rb" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="rr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e0733a"/></marker></defs>
 <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">queue backlog → 撞 watermark → backpressure 擋住 publisher</text>
 <rect x="20" y="70" width="90" height="34" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="65" y="91" fill="#e6e6e6" font-size="8.4" text-anchor="middle">Publisher</text>
 <line x1="110" y1="87" x2="150" y2="87" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#rb)"/>
 <rect x="152" y="58" width="150" height="58" rx="7" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.5"/><text x="227" y="78" fill="#d6a45c" font-size="8.8" text-anchor="middle" font-weight="bold">Queue backlog ↑↑</text><text x="227" y="94" fill="#9aa4b2" font-size="7.4" text-anchor="middle">消費跟不上,越積越大</text><text x="227" y="108" fill="#e0733a" font-size="7.6" text-anchor="middle">撞 memory/disk watermark</text>
 <line x1="302" y1="87" x2="342" y2="87" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#rb)"/>
 <rect x="344" y="70" width="120" height="34" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="404" y="86" fill="#e6e6e6" font-size="8.2" text-anchor="middle">Consumer</text><text x="404" y="98" fill="#9aa4b2" font-size="7.2" text-anchor="middle">(慢,跟不上)</text>
 <rect x="480" y="62" width="86" height="30" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.4"/><text x="523" y="81" fill="#e0733a" font-size="8.4" text-anchor="middle" font-weight="bold">⚠ alarm</text>
 <line x1="227" y1="58" x2="227" y2="44" stroke="#e0733a" stroke-width="1.2"/><line x1="227" y1="44" x2="510" y2="44" stroke="#e0733a" stroke-width="1.2"/><line x1="510" y1="44" x2="510" y2="60" stroke="#e0733a" stroke-width="1.2" marker-end="url(#rr2)"/>
 <path d="M480,77 C300,140 180,140 65,106" fill="none" stroke="#e0733a" stroke-width="1.4" marker-end="url(#rr2)"/><text x="290" y="150" fill="#e0733a" font-size="8.2" text-anchor="middle" font-weight="bold">block publisher(backpressure)——上游暫時寫不進去</text>
 <text x="290" y="176" fill="#9aa4b2" font-size="8" text-anchor="middle">這是自我保護(免得 broker OOM 撐爆),但對上游是「突然寫不進去」</text>
 <text x="290" y="191" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">解法:監控 queue depth、確保消費跟得上、設 queue 上限 / TTL / dead-letter</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">當 consumer 跟不上、queue 一路堆高,broker 的記憶體或磁碟用量會撞到 <b>watermark</b> 水位線、觸發 <b>alarm</b>,接著 RabbitMQ 會反過來<b>阻擋 publisher</b>(flow control)——這是一種 <a href="/blog/sre-cascading-failures/">backpressure</a>,寧可讓上游暫時寫不進去,也不讓 broker 自己被撐爆 OOM。它是好的自我保護,但如果你沒在監控 <b>queue depth</b>,第一個察覺的方式往往是「上游突然全部寫入失敗」。所以 RabbitMQ 的維運核心,就是盯住 queue 別讓它積起來</figcaption>
</figure>

## HA、容量、在 k8s 上

- **HA:用 quorum queue,別用舊的 mirrored**。要讓 queue 本身不因單節點掛掉而丟訊息,現代做法是 **quorum queue**——底層是 [[sre-consensus|Raft]],過半副本確認才算數,取代了舊的 classic mirrored queue(同步慢、故障時可能丟訊息,已被淘汰)。又是共識在真實系統裡的一次現身。
- **容量與擴展**:瓶頸是記憶體 + 磁碟(那兩道 watermark)。要注意 **queue 本身難水平擴**——一個 queue 綁在一個節點上,單 queue 的 throughput 受單節點限制;要更 High-throughput 得靠多 queue 分流,或讓多個 consumer 並行搶同一個 queue(competing consumers)。
- **監控**:**queue depth(backlog 深度)是第一指標**,再來是消費速率、unacked 訊息數、memory/disk alarm 狀態、connection/channel 數。
- **在 k8s 上**:跟其他有狀態工具一樣——[[infra-k8s|StatefulSet + PV]] 放持久化訊息、給 cluster 節點穩定身分互相發現;官方的 RabbitMQ Cluster Operator 幫你管這些。

## 反思

### 一個字的模型差,撐開兩套完全不同的 infra

「Kafka 是 log,RabbitMQ 是 queue」——這句話我以前當成一個瑣碎的技術細節,直到從 infra 角度重看,才發現它是**一切的分水嶺**。留著 vs 拿走,這一個模型上的選擇,像骨牌一樣推倒了後面所有 infra 決策:狀態的形狀(只增的 log vs 會膨脹收縮的 queue)、故障模式(Kafka 是磁碟塞爆 vs RabbitMQ 是 queue backlog backpressure)、擴展方式(Kafka 分 partition vs RabbitMQ 分 queue)。這再次印證了[[infra-intro|體檢表]]那個核心信念——**看懂一個工具最根本的資料模型,它的整個 infra 形狀就跟著決定了**。而反過來,選型時也該從這裡切入:不是問「Kafka 和 RabbitMQ 哪個好」,而是問「我要的是 log 還是 queue」。

### 好的系統會「保護自己」,而不是硬撐到爆

RabbitMQ 的 backpressure 機制,我一開始覺得很煩——上游好好的怎麼突然寫不進去了?但想通之後反而很欣賞它:**一個成熟的系統,在快撐不住的時候,會選擇擋住入口、保護自己,而不是默默吞到記憶體爆掉、整台崩潰。** 「寧可拒絕新的、也不讓自己死掉」,這其實跟我在 [[sre-cascading-failures|連鎖失效]]那篇講的 load shedding、 backpressure 是同一種智慧——過載時主動、優雅地把壓力擋在門外,遠比硬撐到雪崩好。這個觀念我後來套用到很多地方:限流、熔斷、甚至個人的工作量管理——**懂得在滿載前說「我先擋一下」,是系統和人共通的成熟。**

### 選型是選「模型」,不是選「誰比較強」

做過這幾篇有狀態工具的對照,我對「技術選型」的理解變得更乾淨了:很多時候,兩個工具不是「一個強一個弱」,而是**體現了兩種不同的模型、服務兩種不同的需求**。Kafka 和 RabbitMQ 就是最好的例子——它們不是競品,是為不同問題長出來的不同形狀。硬要比「哪個好」,就像問「螺絲起子和鎚子哪個好」一樣沒意義;該問的是「我手上這顆,是螺絲還是釘子」。**先把自己的問題看清楚(要 log 還是 queue、要 throughput 還是要路由),答案自己就浮出來了**——這比追逐「業界最推薦哪個」有用太多。這也是我做完這批有狀態工具,最想留下的一句話。
