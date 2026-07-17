---
title: "Kafka:磁碟為王的有狀態叢集"
date: 2026-07-17
category: tech
description: "從 infra 角度看 Kafka,一切都從『狀態』這題展開——它的資料(log)實實在在躺在 broker 的磁碟上,這一個事實決定了它 infra 面的全部:瓶頸是磁碟不是 CPU、擴容要手動搬 partition、在 k8s 上得跑 StatefulSet + PV。這篇講 Kafka 的狀態長什麼樣(partition = 磁碟上的 append log + replication)、為什麼磁碟也能很快(sequential I/O + page cache + zero-copy)、有狀態帶來的擴縮之痛,以及該盯的監控指標。"
tags:
  - infrastructure
  - kafka
series: "從 Infra 角度看資料工具"
seriesOrder: 3
comments: true
draft: false
---
進入有狀態的重量級,第一個是 Kafka。用[[infra-intro|體檢表]]看它,一切都從第②題「**狀態**」展開——Kafka 的資料(那條可重播的 log)不是抽象概念,它**實實在在躺在 broker 的磁碟上**。這一個事實,決定了它 infra 面的全部:瓶頸是什麼、怎麼擴、掛了怎麼辦、在 k8s 上怎麼跑。

## 狀態在磁碟上:磁碟為王

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 216" role="img" aria-label="Kafka 的狀態就躺在 broker 磁碟上。Producer 把資料寫進 Broker 1 上的 partition P0 的 leader 副本,leader 再複製到 Broker 2 與 Broker 3 上的 follower 副本,三個副本組成 ISR。每個 partition 是磁碟上的 append-only log。瓶頸是磁碟的吞吐與容量,Kafka 靠 sequential 順序寫加 page cache 加 zero-copy,讓磁碟也能很快。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="kf" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">磁碟為王:資料就躺在 broker 磁碟上</text>
    <rect x="14" y="88" width="86" height="30" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="57" y="107" fill="#e6e6e6" font-size="8.4" text-anchor="middle">Producer</text>
    <rect x="128" y="46" width="130" height="104" rx="7" fill="#1f2330" stroke="#54b890" stroke-width="1.4"/><text x="193" y="63" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">Broker 1</text><rect x="142" y="72" width="102" height="36" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="193" y="88" fill="#e6e6e6" font-size="8" text-anchor="middle">P0 · leader</text><text x="193" y="100" fill="#9aa4b2" font-size="6.8" text-anchor="middle">append log</text><text x="193" y="140" fill="#9aa4b2" font-size="7.4" text-anchor="middle">on disk</text>
    <rect x="278" y="46" width="130" height="104" rx="7" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/><text x="343" y="63" fill="#9aa4b2" font-size="8.4" text-anchor="middle" font-weight="bold">Broker 2</text><rect x="292" y="72" width="102" height="36" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="343" y="88" fill="#e6e6e6" font-size="8" text-anchor="middle">P0 · follower</text><text x="343" y="100" fill="#9aa4b2" font-size="6.8" text-anchor="middle">append log</text><text x="343" y="140" fill="#9aa4b2" font-size="7.4" text-anchor="middle">on disk</text>
    <rect x="428" y="46" width="130" height="104" rx="7" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/><text x="493" y="63" fill="#9aa4b2" font-size="8.4" text-anchor="middle" font-weight="bold">Broker 3</text><rect x="442" y="72" width="102" height="36" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="493" y="88" fill="#e6e6e6" font-size="8" text-anchor="middle">P0 · follower</text><text x="493" y="100" fill="#9aa4b2" font-size="6.8" text-anchor="middle">append log</text><text x="493" y="140" fill="#9aa4b2" font-size="7.4" text-anchor="middle">on disk</text>
    <line x1="100" y1="98" x2="140" y2="92" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#kf)"/><text x="120" y="82" fill="#4f6df5" font-size="7" text-anchor="middle">寫</text>
    <line x1="244" y1="82" x2="292" y2="86" stroke="#54b890" stroke-width="1.2" marker-end="url(#kf)"/><line x1="244" y1="94" x2="442" y2="94" stroke="#54b890" stroke-width="1.2" marker-end="url(#kf)"/><text x="343" y="36" fill="#54b890" font-size="7.4" text-anchor="middle">replicate → ISR(3 副本)</text>
    <text x="290" y="176" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">瓶頸是磁碟(吞吐 + 容量),不是 CPU / 記憶體</text>
    <text x="290" y="194" fill="#9aa4b2" font-size="8" text-anchor="middle">Kafka 靠 sequential 順序寫 + page cache + zero-copy,讓「磁碟」也能跑很快</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">每個 topic 切成多個 <b>partition</b>,而每個 partition 就是某台 broker 磁碟上一條 <b>append-only log</b>。為了不怕單機掛掉,每個 partition 有多個副本(<a href="/blog/kafka-delivery/">replication</a>,通常 3 份):一個 <b style="color:#54b890">leader</b> 負責讀寫、其餘 <b>follower</b> 同步跟上,三者組成 ISR。關鍵的 infra 認知是——<b>Kafka 的瓶頸是磁碟</b>(吞吐與容量),而它之所以還能這麼快,是靠 sequential 順序寫、page cache、zero-copy 把磁碟的潛力榨到極致。看 Kafka,先看磁碟</figcaption>
</figure>

這張圖是 Kafka 一切 infra 決策的根。因為資料在磁碟、且要複製多份,所以:**容量的瓶頸是磁碟**(retention 設多久、多大,直接換算成要幾 TB);**HA 靠 replication**——一個 broker 掛,它上面 partition 的 leader 由 ISR 中的 follower 接手,而 `acks=all` + `min.insync.replicas=2` 決定「幾個副本確認才算寫成功」,那是持久性與可用性之間的[取捨旋鈕](/blog/kafka-delivery/)。這些全是「因為狀態在磁碟上」延伸出來的。

## 有狀態的代價:擴縮要搬資料,在 k8s 上要 StatefulSet

有狀態最貴的代價,是**擴縮**。無狀態的東西加一台就能用;但 Kafka 的資料綁在特定 broker 的磁碟上,擴縮就成了「搬資料」的苦工:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 208" role="img" aria-label="有狀態的代價與在 k8s 上怎麼跑。左邊難擴難搬:加 broker 不會自動搬舊資料,要手動做 partition reassignment;partition 數是 consumer 平行度的上限,而且難減少;所以容量與 partition 要一開始就規劃好。右邊在 k8s 上:用 StatefulSet 給 kafka-0、kafka-1、kafka-2 穩定身分,每個 broker 綁定自己的 PV 磁碟;監控要盯 consumer lag 與 under-replicated partitions。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="kk" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">有狀態的代價:擴縮要搬資料 + 在 k8s 上跑</text>
    <line x1="290" y1="30" x2="290" y2="178" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="46" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">難擴難搬</text>
    <rect x="20" y="56" width="252" height="30" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.1"/><text x="146" y="70" fill="#e6e6e6" font-size="7.8" text-anchor="middle">加 broker:不會自動搬舊資料</text><text x="146" y="81" fill="#9aa4b2" font-size="7" text-anchor="middle">→ 要手動 partition reassignment</text>
    <rect x="20" y="92" width="252" height="30" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.1"/><text x="146" y="106" fill="#e6e6e6" font-size="7.8" text-anchor="middle">partition 數 = consumer 平行度上限</text><text x="146" y="117" fill="#9aa4b2" font-size="7" text-anchor="middle">而且難減少</text>
    <rect x="20" y="128" width="252" height="28" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="146" y="146" fill="#e0733a" font-size="8" text-anchor="middle" font-weight="bold">→ 容量與 partition 要「一開始就規劃」</text>
    <text x="434" y="46" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">在 k8s 上:StatefulSet + PV</text>
    <rect x="316" y="56" width="70" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="351" y="75" fill="#e6e6e6" font-size="7.6" text-anchor="middle">kafka-0</text>
    <rect x="398" y="56" width="70" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="433" y="75" fill="#e6e6e6" font-size="7.6" text-anchor="middle">kafka-1</text>
    <rect x="480" y="56" width="70" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="515" y="75" fill="#e6e6e6" font-size="7.6" text-anchor="middle">kafka-2</text>
    <line x1="351" y1="86" x2="351" y2="98" stroke="#9aa4b2" stroke-width="1" marker-end="url(#kk)"/><line x1="433" y1="86" x2="433" y2="98" stroke="#9aa4b2" stroke-width="1" marker-end="url(#kk)"/><line x1="515" y1="86" x2="515" y2="98" stroke="#9aa4b2" stroke-width="1" marker-end="url(#kk)"/>
    <rect x="316" y="100" width="70" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="351" y="116" fill="#4f6df5" font-size="7.4" text-anchor="middle">PV</text>
    <rect x="398" y="100" width="70" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="433" y="116" fill="#4f6df5" font-size="7.4" text-anchor="middle">PV</text>
    <rect x="480" y="100" width="70" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="515" y="116" fill="#4f6df5" font-size="7.4" text-anchor="middle">PV</text>
    <text x="434" y="142" fill="#9aa4b2" font-size="7.6" text-anchor="middle">穩定身分 + 各自綁定的磁碟</text>
    <text x="434" y="156" fill="#e6e6e6" font-size="7.6" text-anchor="middle">監控盯:consumer lag、under-replicated</text>
    <text x="290" y="196" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">有狀態 = 難擴難搬 → partition 與容量規劃,是「先付的稅」</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">加一台 broker 不會自動幫你搬舊資料,你得手動做 <b>partition reassignment</b> 把負載挪過去;而 partition 數既是 consumer group 內的平行度上限、又很難事後減少——這些都逼你<b>一開始就把容量與 partition 規劃好</b>。在 k8s 上,因為每個 broker 綁著自己的資料,只能用 <a href="/blog/infra-k8s/">StatefulSet</a> 給它穩定身分(<code>kafka-0/1/2</code>)+ 各自的 <b>PV</b>,重啟後還認得自己那顆磁碟——這正是 stateful 工具在 k8s 上的標準長相</figcaption>
</figure>

## 容量與監控:盯磁碟、盯 lag、盯副本

Kafka 的體檢,收斂到三個最該盯的地方:
- **容量**:瓶頸幾乎永遠是**磁碟**。`retention.ms` / `retention.bytes` 留多久多大,乘上 replication factor,就是你要準備的磁碟總量。磁碟滿了 broker 會出事,所以 retention 要算、要留 buffer。
- **監控三大指標**:**consumer lag**(消費落後 producer 多少筆——最重要,直接反映「消費者跟不跟得上」)、**under-replicated partitions**(有副本沒跟上同步 = 你的冗餘正在失效,危險訊號)、**磁碟使用率**。這三個是我看 Kafka 健康的第一排儀表。
- **關鍵旋鈕**:`replication.factor`(通常 3)、`min.insync.replicas`(通常 2)、`acks`、`retention.*`、`num.partitions`——這些在 [[kafka-ops|Kafka 維運那篇]]有更細的展開,這裡從 infra 角度知道「它們決定磁碟用量與持久性」就夠。

## 反思

### Kafka 讓我重新認識了「磁碟」

在碰 Kafka 之前,我對磁碟的印象就是「慢」——所以看到「一個把資料全寫進磁碟的訊息系統,還號稱高吞吐」時,我是不信的。真正理解它怎麼做到的,顛覆了我的直覺:**磁碟慢的是隨機讀寫,順序讀寫其實快得驚人**,甚至因為有 page cache 幫忙,常常根本沒真的碰到磁碟。Kafka 就是把「只做順序 append」這個限制,變成了效能的來源。這件事給我的啟發遠超過 Kafka 本身——**很多「這東西不是很慢嗎」的直覺,其實是把某一種用法的慢,錯當成了本質的慢**。搞清楚一個元件「什麼情況快、什麼情況慢」,比記住「它快還是慢」有用得多。

### 有狀態的代價,全都藏在「搬資料」這三個字裡

從 infra 角度看過 Kafka,我對[[infra-intro|stateful 那條軸]]的體會更具體了:有狀態工具的所有麻煩,幾乎都能收斂成一句「**資料很難搬**」。加機器要搬 partition、縮容要搬走再下線、換 node 要確保資料還在——無狀態的東西「加一台就好」的輕鬆,在這裡通通不成立。這也是為什麼 Kafka 的 partition 與容量**必須一開始就規劃**:它不像 stateless 服務可以「先隨便開、之後再調」,因為之後調的代價是搬動 TB 級的資料。**有狀態系統的規劃,是一種「先付的稅」**——你當下多花的心思,是在替未來省下半夜搬資料的痛。

### 從 infra 看一個工具,才看得到它「真正的形狀」

我以前學 Kafka,學的是 topic、partition、offset 這些概念;但從 infra 角度重看一遍,才真正認識它——它不是一個抽象的「訊息佇列」,而是一叢**吃磁碟、綁磁碟、以磁碟為命的有狀態機器**。這個視角的轉換,讓很多原本要死記的規則變得理所當然:為什麼要規劃 partition?因為資料難搬。為什麼在 k8s 要 StatefulSet?因為身分要綁磁碟。為什麼監控盯 under-replicated?因為那是冗餘在失效。**當你看見一個工具的「狀態長在哪」,它的整個 infra 形狀就跟著浮現了**——這正是這個系列想訓練的那雙眼睛。
