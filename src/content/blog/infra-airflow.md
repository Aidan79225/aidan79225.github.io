---
title: "Airflow:排程器、worker 與那個藏起來的狀態"
date: 2026-07-20
category: tech
description: "上一篇 Spark 埋了個伏筆:每個系統都有一塊逃不掉的狀態。Airflow 是最好的例子——它表面上全是看似無狀態、可重啟的組件(scheduler、webserver、worker),但整個系統的記憶其實藏在一顆你可能沒特別注意的 metadata DB 裡。這篇純從 infra 角度看 Airflow:那顆 DB 才是真狀態與命門、worker 的樣子怎麼被 executor(Celery vs Kubernetes)決定、連多 scheduler 的 HA 都靠這顆 DB 協調,以及在 k8s 上怎麼跑。"
tags:
 - infrastructure
 - airflow
series: "從 Infra 角度看資料工具"
seriesOrder: 7
comments: true
draft: false
---
[[infra-spark|上一篇]]埋了個伏筆:**每個系統都有一塊逃不掉的狀態,認出它就掌握了命門。** Airflow 是這句話最好的示範。它表面上全是**看似無狀態、可重啟**的組件——scheduler、webserver、worker,你 kill 掉哪個再拉起來都沒事。但整個系統的記憶(哪些 DAG 跑過、哪個 task 卡在哪、上次成功是什麼時候)其實藏在一個你可能沒特別注意的地方:**metadata DB**。這一篇,就從這顆藏起來的 DB 講起。

## 狀態(樞紐):真狀態全在 metadata DB

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 214" role="img" aria-label="Airflow 的組件與狀態。上排三個看似無狀態、可重啟的組件:Scheduler 解析 DAG 排 task、Webserver 是 UI、Worker 執行 task 可多開。它們底下共用一顆 metadata DB(Postgres),那才是真狀態與命門。三個組件都讀寫這顆 DB。下方說明:組件掛了都能換,但 DB 掉了整個系統的記憶就歸零;連多個 scheduler 的 HA 都是靠這顆 DB 上鎖協調。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
  <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">看似無狀態的組件,真狀態藏在一顆 metadata DB</text>
  <rect x="26" y="32" width="156" height="54" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="104" y="50" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">Scheduler</text><text x="104" y="64" fill="#9aa4b2" font-size="7.2" text-anchor="middle">解析 DAG、排 task</text><text x="104" y="77" fill="#54b890" font-size="7" text-anchor="middle">無狀態・可重啟</text>
  <rect x="198" y="32" width="120" height="54" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="258" y="50" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">Webserver</text><text x="258" y="64" fill="#9aa4b2" font-size="7.2" text-anchor="middle">那個 UI</text><text x="258" y="77" fill="#54b890" font-size="7" text-anchor="middle">無狀態</text>
  <rect x="334" y="32" width="160" height="54" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="414" y="50" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Worker × N</text><text x="414" y="64" fill="#9aa4b2" font-size="7.2" text-anchor="middle">執行 task</text><text x="414" y="77" fill="#54b890" font-size="7" text-anchor="middle">可多開・可重啟</text>
  <defs><marker id="af" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
  <line x1="104" y1="86" x2="238" y2="122" stroke="#9aa4b2" stroke-width="1.2" marker-start="url(#af)" marker-end="url(#af)"/>
  <line x1="258" y1="86" x2="285" y2="120" stroke="#9aa4b2" stroke-width="1.2" marker-start="url(#af)" marker-end="url(#af)"/>
  <line x1="414" y1="86" x2="342" y2="122" stroke="#9aa4b2" stroke-width="1.2" marker-start="url(#af)" marker-end="url(#af)"/>
  <path d="M195 128 v40 a95 10 0 0 0 190 0 v-40" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.8"/><ellipse cx="290" cy="128" rx="95" ry="10" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.8"/><text x="290" y="150" fill="#e6e6e6" font-size="9.4" text-anchor="middle" font-weight="bold">Metadata DB(Postgres)</text><text x="290" y="165" fill="#e0733a" font-size="8" text-anchor="middle" font-weight="bold">真狀態・命門</text>
  <text x="290" y="192" fill="#9aa4b2" font-size="8" text-anchor="middle">組件掛了都能換;DB 掉了 = 整個系統的記憶歸零(哪些跑過、誰在跑、誰失敗)</text>
  <text x="290" y="207" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">連多個 scheduler 的 HA,都靠對這顆 DB 上鎖(row lock)來協調</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Airflow 的組件——<b style="color:#4f6df5">Scheduler</b>(解析 DAG、決定哪個 task 該跑)、<b style="color:#4f6df5">Webserver</b>(UI)、<b style="color:#54b890">Worker</b>(執行 task)——全是<b>無狀態、可重啟、可多開</b>的。它們共用底下那顆 <b style="color:#e0733a">metadata DB</b>,而<b>那才是真狀態</b>:每一次 DAG run、每個 task 的狀態、connection、variable 全存在裡面。任何組件掛了拉起來就好,唯獨這顆 DB 掉了——整個系統就失憶了。這正是 <a href="/blog/infra-spark/">上一篇</a>說的「每個系統都有一塊逃不掉的狀態」,Airflow 的那塊就在這</figcaption>
</figure>

這顆 DB 的地位怎麼強調都不為過:它是整個 Airflow 的 **single source of truth**。而且有個很漂亮(也很危險)的設計——**連 scheduler 的 HA 都建在它上面**。Airflow 2.0 之後可以同時跑多個 active scheduler,它們怎麼不搶同一個 task?靠**對 metadata DB 的資料列上鎖(row-level lock)**。也就是說,Airflow 把「狀態」和「協調」**兩件事都壓在同一顆 DB**上——這讓所有組件都能無狀態化、隨便擴,代價是那顆 DB 成了更集中的瓶頸與命門。所以維運 Airflow 的頭號功課,就是**把這顆 DB 當心臟養**:用 managed 的 Postgres(RDS / Cloud SQL)、做好備份與 HA,而不是隨手在角落塞一個。

## worker 怎麼長,取決於 executor

Airflow 的 worker 到底是「固定一群」還是「用完即拋」,由你選的 **executor** 決定。這是 Airflow on infra 最該先想清楚的一題:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 208" role="img" aria-label="Airflow 兩種 executor 的對比。左邊 CeleryExecutor:scheduler 把 task 丟進一個 broker(Redis 或 RabbitMQ 的 queue),由固定一群常駐的 worker 去搶著執行,所以要多養一個 broker。右邊 KubernetesExecutor:scheduler 幫每個 task 直接開一個 pod,跑完就刪,沒有固定 worker、像 Spark 一樣彈性,代價是每個 task 有開 pod 的延遲。下方:兩種的 task 本身都是無狀態、可重跑,差別在固定池加 broker、還是一 task 一 pod。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
  <defs><marker id="ax" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
  <line x1="290" y1="28" x2="290" y2="168" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="146" y="26" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">CeleryExecutor</text>
  <rect x="26" y="38" width="86" height="26" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="69" y="55" fill="#e6e6e6" font-size="8" text-anchor="middle">Scheduler</text>
  <line x1="112" y1="51" x2="140" y2="51" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ax)"/>
  <rect x="142" y="36" width="120" height="30" rx="5" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.3"/><text x="202" y="50" fill="#e0733a" font-size="8" text-anchor="middle" font-weight="bold">Broker(queue)</text><text x="202" y="61" fill="#9aa4b2" font-size="6.8" text-anchor="middle">Redis / RabbitMQ</text>
  <line x1="170" y1="66" x2="120" y2="94" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ax)"/><line x1="230" y1="66" x2="230" y2="94" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ax)"/>
  <rect x="72" y="96" width="96" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="120" y="115" fill="#e6e6e6" font-size="8" text-anchor="middle">worker(常駐)</text>
  <rect x="182" y="96" width="96" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="230" y="115" fill="#e6e6e6" font-size="8" text-anchor="middle">worker(常駐)</text>
  <text x="146" y="148" fill="#9aa4b2" font-size="7.8" text-anchor="middle">固定一群 worker + 要多養一個 broker</text>
  <text x="434" y="26" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">KubernetesExecutor</text>
  <rect x="390" y="38" width="88" height="26" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="434" y="55" fill="#e6e6e6" font-size="8" text-anchor="middle">Scheduler</text>
  <line x1="420" y1="64" x2="380" y2="92" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ax)"/><line x1="448" y1="64" x2="488" y2="92" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ax)"/>
  <rect x="330" y="94" width="100" height="32" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2" stroke-dasharray="4 3"/><text x="380" y="108" fill="#e6e6e6" font-size="7.6" text-anchor="middle">task-pod-a</text><text x="380" y="120" fill="#9aa4b2" font-size="6.6" text-anchor="middle">跑完即刪</text>
  <rect x="440" y="94" width="100" height="32" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2" stroke-dasharray="4 3"/><text x="490" y="108" fill="#e6e6e6" font-size="7.6" text-anchor="middle">task-pod-b</text><text x="490" y="120" fill="#9aa4b2" font-size="6.6" text-anchor="middle">跑完即刪</text>
  <text x="434" y="148" fill="#9aa4b2" font-size="7.8" text-anchor="middle">一 task 一 pod,像 Spark 一樣彈性(有開 pod 延遲)</text>
  <rect x="40" y="168" width="500" height="30" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
  <text x="290" y="187" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">兩種的 task 都無狀態、可重跑;差在「固定池 + broker」還是「一 task 一 pod」</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">CeleryExecutor</b>:scheduler 把 task 丟進一個 <a href="/blog/infra-redis/">Redis</a> / <a href="/blog/infra-rabbitmq/">RabbitMQ</a> 的 <b>broker</b>,由<b>固定一群常駐 worker</b> 搶著跑——任務量穩定時省下開 pod 的延遲,但你得<b>多養一個 broker</b>。<b style="color:#54b890">KubernetesExecutor</b>:scheduler 幫<b>每個 task 開一個 pod</b>、跑完即刪,沒有固定 worker、像 <a href="/blog/infra-spark/">Spark executor</a> 一樣彈性,代價是每個 task 都有開 pod 的啟動延遲。共同點是:worker/task 全是無狀態、可重跑的——真正的記憶還是在那顆 DB</figcaption>
</figure>

## HA、容量、監控、在 k8s 上

- **HA:組件都好做,DB 才是關鍵**。scheduler(2.0 後可多 active)、webserver、worker 全能多開——因為它們無狀態。真正要花心思做 HA 的是**那顆 metadata DB**:它掛了,整個 Airflow 停擺。所以 DB 一律用 managed、多可用區、有備份。**這整套「組件無狀態、狀態全外部化」的架構,好處就是 HA 幾乎只剩一件事:顧好 DB。**
- **容量:瓶頸常在 DB**。scheduler 會頻繁查詢 DB 來排程,DAG 一多、parallelism 一高,**DB 連線與查詢往往是第一個撞牆的地方**——調 `parallelism`、`max_active_runs`、DB 連線池,常比加 worker 更關鍵。worker 端的容量就是 slot / pod 數量,那個好水平擴。
- **監控:盯排程健康與 backlog**。scheduler 的 heartbeat(有沒有在跑)、卡在 `queued` 的 task backlog、DAG run 成功率與 task 執行時間、DB 連線數、Celery 的 queue depth。task 一直卡在 queued,通常不是 worker 不夠就是 DB/broker 出事。
- **在 k8s 上**:scheduler / webserver 用 [[k8s-intro|Deployment]],executor 多半選 KubernetesExecutor(task = pod),metadata DB **外接 managed 或用 [[infra-k8s|StatefulSet + PV]]**,官方 Helm chart 幫你把這些兜起來。真正跑重活時,Airflow 常只是去**觸發**一個 [[airflow-spark-on-k8s|Spark 作業]],自己不搬資料。

## 反思

### 最危險的狀態,是你以為沒有的那個

Airflow 給人的第一印象是「一堆可重啟的組件」,這印象會讓人鬆懈——直到某天那顆被塞在角落、沒人好好照顧的 metadata DB 出事,你才發現**整個系統的記憶全在它身上**,而你從沒把它當一回事。這件事給我的教訓超越 Airflow:**一個系統最脆弱的地方,往往是它「看起來沒有狀態」而讓你忽略的那塊狀態。** 無狀態的組件會誠實地告訴你「我可拋」,於是你認真做了冗餘;有狀態的核心卻常常藏得很好,騙過你的注意力。所以我看任何系統,第一個動作永遠是 [[infra-intro|把狀態核心揪出來]]——不是問「它有沒有狀態」,而是問「它的狀態**藏在哪**」。找到那顆藏起來的 DB,你才知道該把備份與 HA 的力氣花在哪。

### 把狀態和協調都收斂到一個地方,其餘就能無狀態化

Airflow 用 metadata DB 同時扛「狀態」和「scheduler 的協調」,這個設計我越看越覺得有代表性。它其實是一個很通用的模式:**把難的東西(持久狀態 + 分散式協調)全部收斂到一個中心,系統其餘部分就能全部無狀態化、隨便擴。** K8s 把這個中心叫 [[sre-consensus|etcd]]、Kafka 早期叫 ZooKeeper、Airflow 就叫 metadata DB。這是一種聰明的偷懶——與其讓每個組件都自己處理狀態與共識,不如指定一顆「心臟」扛下全部,其餘器官都做成可替換的。代價很明確也很公平:**那顆心臟就是你必須用盡全力保護的單點**,它的可用性直接封頂整個系統的可用性。認得出這個模式,你看任何分散式系統都會先去找它的「那顆心臟」在哪。

### 好的編排器應該很「瘦」

最後一個體會,是關於 Airflow 的**分寸**。它是編排器——負責「什麼時候、用什麼順序」跑,而**不該親自扛運算**。理想的 Airflow task,常常只是去**觸發**一個 [[airflow-spark-on-k8s|Spark 作業]]、呼叫一個 API、送出一個查詢,真正的重活外包給專門的運算層。這讓 Airflow 自己保持輕盈:它不搬大資料,所以它的 worker 可以很小、它的瓶頸集中在排程與 DB 而非算力。我看過反例——把沉重的 pandas 運算硬塞進 Airflow task,結果 worker 記憶體爆掉、排程也被拖垮。**編排的歸編排、運算的歸運算**:一個好的編排器該像交通指揮,只管誰先走誰後走,絕不自己下場搬貨。這條界線劃清楚,整個資料平台的每一層才各自輕盈、各自好擴。
