---
title: "Kafka Connect:連接器的執行時"
date: 2026-07-22
category: tech
description: "收尾 stateless 這一批的最後一個:Kafka Connect。它專門在 Kafka 與外部系統(資料庫、S3、Elasticsearch)之間搬資料,不用寫消費者/生產者、只配一份 connector。從 infra 角度,它是這個系列「無狀態運算 + 借外部狀態」模式最漂亮的示範——它把自己的狀態(設定、offset、狀態)全部存回它所依賴的 Kafka。這篇看它的拓撲(connector/task/worker)、狀態怎麼存回 Kafka、加 worker 怎麼 rebalance、source/sink 的平行度上限,以及在 k8s 上怎麼跑。"
tags:
 - infrastructure
 - kafka
series: "從 Infra 角度看資料工具"
seriesOrder: 8
comments: true
draft: false
---
收尾 stateless 這一批的最後一個:**Kafka Connect**。它是一套專門在 [[infra-kafka|Kafka]] 與外部系統(資料庫、S3、Elasticsearch)之間**搬資料**的框架——你不用每次都手寫消費者/生產者,只要配一份 connector。從 infra 角度,它是這個系列「**無狀態運算 + 借外部狀態**」模式最漂亮的一個示範,因為它把自己的狀態,存回了它所依賴的 Kafka。

## 拓撲與狀態:worker 無狀態,狀態全存回 Kafka

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 226" role="img" aria-label="Kafka Connect 的拓撲與狀態。一個 connector 是一份 config,被拆成 N 個 task。task 分給多個 worker 執行,worker 是無狀態的。Connect 把自己的狀態,包括 connector 設定、offset、task 狀態,全部存回 Kafka 叢集裡的三個內部 topic(configs、offsets、status)。所以 worker 掛掉時,它的 task 會 rebalance 到別的 worker,不會丟狀態,因為狀態在 Kafka。整個 Connect 的命門是 Kafka 叢集本身。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
  <defs><marker id="kc" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
  <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">worker 無狀態,狀態全存回 Kafka</text>
  <rect x="196" y="26" width="188" height="32" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="290" y="41" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">Connector(一份 config)</text><text x="290" y="53" fill="#9aa4b2" font-size="7.4" text-anchor="middle">→ 拆成 N 個 task</text>
  <line x1="250" y1="58" x2="165" y2="74" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#kc)"/><line x1="330" y1="58" x2="415" y2="74" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#kc)"/>
  <rect x="40" y="76" width="210" height="52" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="145" y="92" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">Worker 1(無狀態・可拋)</text>
  <rect x="54" y="100" width="86" height="20" rx="4" fill="#1f2330" stroke="#54b890" stroke-width="1"/><text x="97" y="114" fill="#e6e6e6" font-size="7.4" text-anchor="middle">task-1</text><rect x="150" y="100" width="86" height="20" rx="4" fill="#1f2330" stroke="#54b890" stroke-width="1"/><text x="193" y="114" fill="#e6e6e6" font-size="7.4" text-anchor="middle">task-2</text>
  <rect x="330" y="76" width="210" height="52" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="435" y="92" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">Worker 2(無狀態・可拋)</text>
  <rect x="344" y="100" width="86" height="20" rx="4" fill="#1f2330" stroke="#54b890" stroke-width="1"/><text x="387" y="114" fill="#e6e6e6" font-size="7.4" text-anchor="middle">task-3</text><rect x="440" y="100" width="86" height="20" rx="4" fill="#1f2330" stroke="#54b890" stroke-width="1"/><text x="483" y="114" fill="#e6e6e6" font-size="7.4" text-anchor="middle">task-4</text>
  <line x1="145" y1="128" x2="210" y2="150" stroke="#d6a45c" stroke-width="1.3" marker-end="url(#kc)"/><line x1="435" y1="128" x2="370" y2="150" stroke="#d6a45c" stroke-width="1.3" marker-end="url(#kc)"/><text x="290" y="142" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">狀態存回 Kafka</text>
  <rect x="90" y="152" width="400" height="48" rx="8" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.5"/><text x="290" y="167" fill="#e0733a" font-size="8.6" text-anchor="middle" font-weight="bold">Kafka 叢集(Connect 的 state store)</text>
  <rect x="104" y="174" width="116" height="20" rx="4" fill="#1f2330" stroke="#d6a45c" stroke-width="1"/><text x="162" y="188" fill="#e6e6e6" font-size="7.2" text-anchor="middle">configs</text><rect x="232" y="174" width="116" height="20" rx="4" fill="#1f2330" stroke="#d6a45c" stroke-width="1"/><text x="290" y="188" fill="#e6e6e6" font-size="7.2" text-anchor="middle">offsets</text><rect x="360" y="174" width="116" height="20" rx="4" fill="#1f2330" stroke="#d6a45c" stroke-width="1"/><text x="418" y="188" fill="#e6e6e6" font-size="7.2" text-anchor="middle">status</text>
  <text x="290" y="216" fill="#9aa4b2" font-size="8" text-anchor="middle">worker 掛 → task rebalance 到別台,一則不丟(狀態在 Kafka);命門 = Kafka 本身</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三個角色要分清:<b style="color:#4f6df5">Connector</b> 是一份「要搬什麼、從哪搬到哪」的 config,被拆成若干 <b>task</b>(平行的單位);<b style="color:#54b890">Worker</b> 是真正跑 task 的行程,而且<b>完全無狀態</b>。最漂亮的是那條橘線——Connect 把自己的狀態(connector 設定、<b>offset</b>、task 狀態)全部<b style="color:#e0733a">存回它所依賴的 Kafka</b> 的三個內部 topic。所以一個 worker 掛掉,只是它的 task 被 <b>rebalance</b> 到別的 worker,狀態一則不丟。它的命門,就是底下那個 Kafka 叢集本身</figcaption>
</figure>

這就是 Connect 最聰明的 infra 設計:**它不自己維護狀態,而是把 Kafka —— 它本來就依賴的東西 —— 當成自己的 state store。** worker 因此變成純粹的無狀態運算層,可拋、可換、可隨便加。這跟 [[infra-spark|Spark]] 借 S3、[[infra-airflow|Airflow]] 借 metadata DB 是同一個配方,只是 Connect 借的,是它自己腳下的 Kafka。

## source 與 sink:兩個方向,平行度各有天花板

Connect 做的事對稱得很乾淨:**source** 把外部資料**灌進** Kafka、**sink** 把 Kafka 的資料**倒去**外部。而它能開多平行,由 `tasks.max` 設上限,但真正的天花板在兩端:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 194" role="img" aria-label="Kafka Connect 的 source 與 sink 兩個方向。左邊 source connector:從外部資料庫,由 source task 讀出來,寫進 Kafka 的 topic,平行度受來源的分片數限制。右邊 sink connector:從 Kafka 的 topic,由 sink task 讀出來,寫進外部的 S3 或 Elasticsearch,sink task 其實就是一個 consumer group 的成員,所以平行度受 topic 的 partition 數限制。中間是 Kafka 的 topic 有多個 partition。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
  <defs><marker id="kc2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
  <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">source 灌進 Kafka　·　sink 倒去外部</text>
  <path d="M20 60 v40 a30 6 0 0 0 60 0 v-40" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.4"/><ellipse cx="50" cy="60" rx="30" ry="6" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.4"/><text x="50" y="82" fill="#e6e6e6" font-size="7.6" text-anchor="middle">外部 DB</text>
  <rect x="104" y="66" width="80" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="144" y="81" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">source task</text><text x="144" y="91" fill="#9aa4b2" font-size="6.6" text-anchor="middle">讀</text>
  <line x1="80" y1="80" x2="102" y2="80" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#kc2)"/><line x1="184" y1="80" x2="212" y2="80" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#kc2)"/>
  <rect x="214" y="52" width="152" height="76" rx="8" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.4"/><text x="290" y="68" fill="#e0733a" font-size="8.4" text-anchor="middle" font-weight="bold">Kafka topic</text><rect x="226" y="76" width="128" height="14" rx="3" fill="#1f2330" stroke="#d6a45c" stroke-width="1"/><text x="290" y="87" fill="#9aa4b2" font-size="6.8" text-anchor="middle">partition 0</text><rect x="226" y="94" width="128" height="14" rx="3" fill="#1f2330" stroke="#d6a45c" stroke-width="1"/><text x="290" y="105" fill="#9aa4b2" font-size="6.8" text-anchor="middle">partition 1</text><rect x="226" y="112" width="128" height="12" rx="3" fill="#1f2330" stroke="#d6a45c" stroke-width="1"/><text x="290" y="122" fill="#9aa4b2" font-size="6.6" text-anchor="middle">partition 2</text>
  <rect x="396" y="66" width="80" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="436" y="81" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">sink task</text><text x="436" y="91" fill="#9aa4b2" font-size="6.6" text-anchor="middle">= consumer group 成員</text>
  <line x1="366" y1="80" x2="394" y2="80" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#kc2)"/><line x1="476" y1="80" x2="498" y2="80" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#kc2)"/>
  <path d="M500 60 v40 a30 6 0 0 0 60 0 v-40" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.4"/><ellipse cx="530" cy="60" rx="30" ry="6" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.4"/><text x="530" y="82" fill="#e6e6e6" font-size="7.4" text-anchor="middle">S3 / ES</text>
  <text x="144" y="150" fill="#9aa4b2" font-size="7.8" text-anchor="middle">source 平行度</text><text x="144" y="163" fill="#9aa4b2" font-size="7.8" text-anchor="middle">受「來源分片數」限</text>
  <text x="436" y="150" fill="#9aa4b2" font-size="7.8" text-anchor="middle">sink 平行度</text><text x="436" y="163" fill="#9aa4b2" font-size="7.8" text-anchor="middle">受「topic partition 數」限</text>
  <text x="290" y="184" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">tasks.max 只是上限;真正的天花板在兩端的分片數</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#54b890">source</b> 把外部資料灌進 Kafka topic,<b style="color:#54b890">sink</b> 把 topic 倒去外部。你用 <code>tasks.max</code> 設平行度上限,但真正搬得多快,卡在兩端的分片:source 受<b>來源的分片數</b>(例如幾張表、DB 的幾個 partition)限;而 <b>sink task 本質就是一個 <a href="/blog/kafka-intro/">consumer group</a> 的成員</b>,所以它的平行度受 <b>topic partition 數</b>限——partition 有幾個,sink 最多就幾個 task 有效。加 worker 加不過這道牆</figcaption>
</figure>

## HA、擴展、監控、在 k8s 上

- **擴展與 rebalance**:加 worker,task 就會**在 worker 之間重新分配(rebalance)**,行為跟 [[kafka-intro|consumer group]] 一模一樣。舊版 Connect 的 rebalance 是「stop-the-world」——一動全停;新版的 **incremental cooperative rebalancing** 只搬需要動的 task,大幅減少抖動。
- **HA**:distributed mode 下,workers 組成一個群組、透過 Kafka 協調,任何 worker 掛掉,它的 task 自動 rebalance 到存活的 worker——因為狀態在 Kafka,這是無痛的。唯一的單點是 **Kafka 叢集本身**:它不健康,Connect 就動不了。
- **監控與故障**:盯 **connector / task 的 status**(`RUNNING` / `FAILED` / `PAUSED`)、source/sink 的 lag、throughput。有個大坑:**task `FAILED` 後預設不會自動重啟**,得靠 REST API `restart` 或外部監控補上;遇到解不了的「毒訊息」(schema 不符),設 **dead letter queue** 把它丟到一邊、別卡住整條。
- **在 k8s 上**:worker 無狀態,所以它是這批工具裡**最好上 k8s 的**——就是一個 stateless 的 [[infra-k8s|Deployment]],甚至能直接 autoscale;connector 全靠 REST API(`POST /connectors`)管理,社群常用 Strimzi operator 把這些兜起來。

## 反思

### Connect 把「借外部狀態」玩到了極致

寫完這批 stateless 工具,Kafka Connect 給我的收尾特別漂亮:它不只是「不自己存狀態」,而是**把自己依賴的 Kafka,直接拿來當狀態儲存**。[[infra-spark|Spark]] 借 S3、[[infra-airflow|Airflow]] 借 metadata DB,而 Connect 借的是它腳下那個 Kafka——省得再多養一個狀態儲存。這讓我把這批工具的共通配方看得更清楚了:**無狀態運算層 = 純運算的 worker + 一個被指定來扛狀態的外部儲存。** 認出這個配方,你看任何號稱「無狀態、好水平擴」的服務,都會立刻去問同一句:**它的狀態,寄放在誰那裡?** 找到那個「誰」,你就找到了它真正的命門——對 Connect 來說,就是 Kafka。

### rebalance 是「工作單位可自由搬動」的帳單

Connect 好擴、掛了好修,根源都是同一件事:**task 是可以在 worker 之間自由重新分配的**。但這份自由不是免費的——每次 worker 進出,都要 rebalance,而 rebalance 本身會讓正在搬的資料短暫停頓。這跟 [[kafka-intro|consumer group]] 的 rebalance、跟 K8s 把 Pod 重排,是同一種取捨:**你讓工作單位變得可以隨處搬動,換來了彈性與韌性,但搬動的那一刻要付停頓的帳。** 成熟的系統不是消滅這個帳單(消不掉),而是把它壓到最小——Connect 的 incremental cooperative rebalance、K8s 的 PodDisruptionBudget,都是在做同一件事:讓「搬動」盡量不驚動還在好好幹活的部分。

### 好基礎設施的樣子:把重複的事變成一份設定

Connect 最打動我的,是它把「在 Kafka 和外部系統之間搬資料」這件每個團隊都要做一百遍的事,變成了**填一份 JSON、`POST` 給一個 API**,而不是每次都手寫一個消費者、一個生產者、自己管 offset。這種「把 80% 的常見需求收斂成宣告式設定,只有真的特殊才寫程式」的設計,是我心中成熟基礎設施的共通長相——[[infra-k8s|K8s]] 的宣告式、[[infra-airflow|Airflow]] 的 operator,都是這個精神。它把工程師從重複勞動裡解放出來,去做真正需要判斷的事。這也正好收束了 stateless 這一批:[[infra-spark|Spark]]、[[infra-airflow|Airflow]]、Connect 三個無狀態運算層,骨架其實一致——無狀態 worker、借外部狀態、可彈性擴。下一篇,就把這些 stateless 的、跟前面那些 stateful 的,兜成一個完整的資料平台。
