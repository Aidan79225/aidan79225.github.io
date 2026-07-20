---
title: "Spark:短命 executor 的彈性運算"
date: 2026-07-20
category: tech
description: "前三篇的 Kafka、Redis、RabbitMQ 都在光譜的 stateful 那一端——狀態綁在自己的磁碟或記憶體,擴縮要搬資料。這篇翻到另一端:Spark,第一個 stateless 的運算工具。同一套 infra 體檢表套上去,你會發現它幾乎每一題都跟前面相反:executor 短命可拋、水平擴不用搬資料、dynamic allocation 隨 backlog 自動加減、真正的資料全在叢集外。這篇純從 infra 角度看 Spark 的拓撲、那塊藏在 driver 裡逃不掉的狀態、在 k8s 上怎麼取代 YARN。"
tags:
 - infrastructure
 - spark
series: "從 Infra 角度看資料工具"
seriesOrder: 6
comments: true
draft: false
---
前三篇([[infra-kafka|Kafka]]、[[infra-redis|Redis]]、[[infra-rabbitmq|RabbitMQ]])都在光譜的 **stateful** 那一端——狀態綁在自己的磁碟或記憶體,擴縮要搬資料、故障要救資料。這篇翻到光譜的另一端:**Spark**,系列第一個 **stateless** 的運算工具。同一套 [[infra-intro|體檢表]]套上去,你會發現它幾乎每一題都跟前面**相反**——而這一切,都源自一件事:**Spark 幾乎不存狀態,它「借」外部的。**

## 拓撲與狀態:算在叢集內,資料在叢集外

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 224" role="img" aria-label="Spark 的拓撲與狀態。中間一個 Spark app,裡面有一個 driver 負責協調、是單點命門,底下一排短命可拋的 executor 負責幹活。左邊是叢集外的資料源 S3、DB、Kafka,executor 從這裡讀資料;右邊是叢集外的輸出 sink,executor 把結果寫回去。真正 durable 的資料全在叢集外,Spark 自己近乎無狀態。executor 掛了靠 lineage 重算那一塊、不丟資料。對比前三篇:狀態等於服務本體;Spark 把狀態借給外部。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
  <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">無狀態運算:算在叢集內,狀態在叢集外</text>
  <path d="M28 96 v44 a40 7 0 0 0 80 0 v-44" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.5"/><ellipse cx="68" cy="96" rx="40" ry="7" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.5"/><text x="68" y="120" fill="#e6e6e6" font-size="8.4" text-anchor="middle">資料源</text><text x="68" y="133" fill="#9aa4b2" font-size="7" text-anchor="middle">S3/DB/Kafka</text>
  <path d="M472 96 v44 a40 7 0 0 0 80 0 v-44" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.5"/><ellipse cx="512" cy="96" rx="40" ry="7" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.5"/><text x="512" y="120" fill="#e6e6e6" font-size="8.4" text-anchor="middle">輸出 sink</text><text x="512" y="133" fill="#9aa4b2" font-size="7" text-anchor="middle">寫回結果</text>
  <rect x="146" y="36" width="288" height="128" rx="9" fill="none" stroke="#3a4154" stroke-width="1.4" stroke-dasharray="5 4"/>
  <text x="290" y="52" fill="#9aa4b2" font-size="8" text-anchor="middle">Spark app(叢集內)</text>
  <rect x="248" y="58" width="84" height="28" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="290" y="76" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">Driver</text>
  <text x="290" y="98" fill="#9aa4b2" font-size="6.8" text-anchor="middle">協調 · 單點命門</text>
  <rect x="158" y="108" width="80" height="40" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="198" y="126" fill="#e6e6e6" font-size="8.2" text-anchor="middle">Executor</text><text x="198" y="139" fill="#9aa4b2" font-size="6.6" text-anchor="middle">短命可拋</text>
  <rect x="250" y="108" width="80" height="40" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="290" y="126" fill="#e6e6e6" font-size="8.2" text-anchor="middle">Executor</text><text x="290" y="139" fill="#9aa4b2" font-size="6.6" text-anchor="middle">短命可拋</text>
  <rect x="342" y="108" width="80" height="40" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="382" y="126" fill="#e6e6e6" font-size="8.2" text-anchor="middle">Executor</text><text x="382" y="139" fill="#9aa4b2" font-size="6.6" text-anchor="middle">短命可拋</text>
  <line x1="272" y1="86" x2="205" y2="106" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="2 2"/><line x1="290" y1="86" x2="290" y2="106" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="2 2"/><line x1="308" y1="86" x2="375" y2="106" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="2 2"/>
  <defs><marker id="sp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker></defs>
  <line x1="108" y1="112" x2="156" y2="120" stroke="#54b890" stroke-width="1.4" marker-end="url(#sp)"/><text x="132" y="106" fill="#54b890" font-size="7" text-anchor="middle">讀</text>
  <line x1="424" y1="120" x2="472" y2="112" stroke="#54b890" stroke-width="1.4" marker-end="url(#sp)"/><text x="448" y="106" fill="#54b890" font-size="7" text-anchor="middle">寫</text>
  <text x="290" y="182" fill="#9aa4b2" font-size="8" text-anchor="middle">executor 掛 → 靠 lineage 重算那一塊,不丟資料;真正 durable 的資料全在叢集外</text>
  <text x="290" y="199" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">對比前三篇:狀態 = 服務本體;Spark:狀態借外部,自己近乎無狀態</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Spark 的拓撲就三個角色:<b style="color:#4f6df5">Driver</b>(一個,負責協調、切 task、追進度——也是單點命門)、一群 <b style="color:#54b890">Executor</b>(幹活的,短命可拋)、加上一個 cluster manager(YARN 或現在的 K8s)。關鍵是那條軸線:<b>真正的資料(source / sink)全在叢集外</b>,Spark 只是把它讀進來算完、再寫回去。executor 中途掛了,靠 <a href="/blog/spark-running/">lineage(血緣)</a>重算它負責那一塊就好,不會丟資料——因為資料本來就不歸它保管。這跟前三篇「狀態就是服務本體、掛了要救資料」是完全相反的世界</figcaption>
</figure>

從 infra 的角度,這是最該先抓住的一點:**Spark 自己近乎無狀態。** 它上面看似有「狀態」的東西其實都是**過渡性、可重算**的——executor 本機磁碟上的 **shuffle 中間資料**(算壞了重算)、driver 記憶體裡的**協調狀態**(哪些 task 跑完了)。真正持久的資料,住在叢集外的 S3、資料庫、Kafka。**它借別人的狀態來算,自己不保管**——這一個事實,決定了它後面每一題 infra 的答案。

## 擴展:stateless 換來的甜頭

因為 executor 不保管資料,**加減 executor 完全不用搬資料**——這是無狀態最大的紅利。Spark 甚至能 **dynamic allocation**:按「還有多少 task 排隊(backlog)」自動長出、又自動收掉 executor:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 196" role="img" aria-label="Spark 的 dynamic allocation。左邊尖峰時,待處理 task backlog 很大,Spark 按 backlog 自動長出很多 executor;右邊離峰時沒什麼事做,閒置的 executor 過了 idle timeout 就自動縮掉。中間箭頭表示 backlog 驅動、自動加減。下方對比:stateless 才敢這樣隨開隨關;Kafka 這種 stateful 的擴縮要搬 partition,又慢又險,不可能這麼隨性。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
  <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">dynamic allocation:按 backlog 自動加減 executor</text>
  <rect x="18" y="34" width="250" height="102" rx="8" fill="#1f2330" stroke="#3a4154" stroke-width="1.3"/>
  <text x="143" y="50" fill="#e0733a" font-size="8.8" text-anchor="middle" font-weight="bold">尖峰:backlog 大</text>
  <rect x="34" y="60" width="70" height="20" rx="4" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.1"/><text x="69" y="74" fill="#9aa4b2" font-size="6.8" text-anchor="middle">task 排隊 ↑↑</text>
  <rect x="120" y="60" width="26" height="20" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/><rect x="150" y="60" width="26" height="20" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/><rect x="180" y="60" width="26" height="20" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/><rect x="210" y="60" width="26" height="20" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/>
  <rect x="120" y="86" width="26" height="20" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/><rect x="150" y="86" width="26" height="20" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/>
  <text x="143" y="124" fill="#54b890" font-size="7.6" text-anchor="middle">自動長出 executor</text>
  <rect x="312" y="34" width="250" height="102" rx="8" fill="#1f2330" stroke="#3a4154" stroke-width="1.3"/>
  <text x="437" y="50" fill="#9aa4b2" font-size="8.8" text-anchor="middle" font-weight="bold">離峰:沒事做</text>
  <rect x="328" y="60" width="70" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="363" y="74" fill="#9aa4b2" font-size="6.8" text-anchor="middle">task 空了</text>
  <rect x="420" y="60" width="26" height="20" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/>
  <rect x="452" y="60" width="26" height="20" rx="3" fill="#1f2330" stroke="#3a4154" stroke-width="1" stroke-dasharray="2 2"/><rect x="484" y="60" width="26" height="20" rx="3" fill="#1f2330" stroke="#3a4154" stroke-width="1" stroke-dasharray="2 2"/><rect x="516" y="60" width="26" height="20" rx="3" fill="#1f2330" stroke="#3a4154" stroke-width="1" stroke-dasharray="2 2"/>
  <text x="437" y="124" fill="#9aa4b2" font-size="7.6" text-anchor="middle">idle timeout → 自動縮掉</text>
  <line x1="268" y1="85" x2="312" y2="85" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="3 2"/>
  <text x="290" y="80" fill="#9aa4b2" font-size="7" text-anchor="middle">backlog</text><text x="290" y="98" fill="#9aa4b2" font-size="7" text-anchor="middle">驅動</text>
  <text x="290" y="164" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">stateless 才敢隨開隨關;Kafka 那種 stateful 擴縮要搬 partition,又慢又險</text>
  <text x="290" y="182" fill="#9aa4b2" font-size="7.8" text-anchor="middle">「會不會存資料、死了能不能重來」——決定一個組件敢不敢這樣彈性擴</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b>Dynamic allocation</b> 是 stateless 的紅利兌現:Spark 看還有多少 task 在排隊,尖峰就自動長出 executor、離峰閒置超過 idle timeout 就收掉,你不用預先猜要開幾個。這件事 <a href="/blog/infra-kafka/">Kafka</a> 做不到——它的 partition 綁著磁碟上的資料,擴縮得**搬 partition**,又慢又要小心。<b>能不能隨開隨關,關鍵永遠是那句:這東西存不存資料、死了能不能重來</b></figcaption>
</figure>

## HA、容量、監控、在 k8s 上

- **HA:executor 可拋,driver 是命門**。executor 掛了,Spark 用 lineage 重算那塊、或 task retry,完全不影響最終結果——這是 stateless 的韌性。但 **driver 是單點**:它掛了,整個 app 的協調狀態就沒了、作業直接死。所以實務上 **driver 一定釘在穩定的 on-demand node、executor 才丟去便宜的 spot**(這條原則我在 [[airflow-spark-on-k8s|Airflow + Spark on K8s]] 那篇詳細畫過)。
- **容量:瓶頸在 executor 記憶體與 shuffle**。每個 executor 的記憶體切成 execution(算)與 storage(快取)兩區;算不下就 **spill 到本機磁碟**,慢但不會死。最常見的 OOM 來自 **data skew**(某個 key 的資料特別多,壓垮一個 task)和 **driver 上 `collect()` 太多資料**。
- **監控:看 stage/task 與 shuffle**。**Spark UI** 看當下、**History Server** 看跑完的作業;重點盯 stage 進度、shuffle read/write 量、GC 時間、以及有沒有某個 task 拖很久(skew 的訊號)、executor lost 的次數。
- **在 k8s 上:K8s 直接當 cluster manager,取代 YARN**。driver 與 executor 全部變成 [[k8s-intro|Pod]],`spark-submit --master k8s://…` 提交,Spark 直接呼叫 K8s API 要 executor pod。搭配 dynamic allocation,尖峰長出一堆 executor pod、算完即刪,只在真正運算時才佔資源。

## 反思

### 翻到光譜另一端,才看懂「無狀態」有多奢侈

連寫三篇有狀態工具再回頭看 Spark,我最大的感觸是:**stateless 的那些好處——好擴、好搬、好回收、掛了重算就好——全都是拿「自己不保管狀態」換來的。** Spark 之所以能 dynamic allocation 隨開隨關,不是因為它比 Kafka「進步」,而是因為它把最難的那塊(持久資料)**外包**給了 S3、資料庫。這讓我對「stateless 好棒棒」的迷思清醒很多:**沒有真正無狀態的系統,只有把狀態推去別處的系統。** 那塊狀態不會消失,只是換一個地方、換一個人扛。看一個架構,我現在都會多問一句:**它宣稱的「無狀態」,是把狀態丟到哪裡去了?**

### 每個系統都有一塊「逃不掉的狀態」,認出它就掌握了命門

即使 Spark 近乎無狀態,它還是有一塊逃不掉的——**driver 裡那份協調狀態**。而它偏偏是單點、是整個作業的命門。這呼應了 [[infra-intro|體檢表]]那個核心提醒:**再無狀態的系統,也總有一小塊狀態核心,而那塊往往就是它最脆弱、最該保護的地方。** Kafka 是磁碟上的 log、Redis 是記憶體、RabbitMQ 是 queue、Spark 是 driver 的協調——每個工具的「命門」都在它那塊狀態上。我看任何新系統,第一件事就是把這塊狀態找出來:**它存在哪、掛了會怎樣、怎麼保護**。找到它,就找到了這個系統 infra 上的七寸。(下一篇 [[airflow-scheduling|Airflow]] 更是如此——它的真狀態藏在一個你可能沒注意到的 metadata DB 裡。)

### 「死了能不能重來」是我判斷一切彈性的那把尺

寫完這篇,dynamic allocation 那句話我想再強調一次:**一個組件敢不敢隨開隨關、能不能水平彈性擴,根本不取決於它跑什麼,而取決於「它存不存資料、死了能不能重來」。** executor 能重來,所以放 spot、隨便縮;driver 不能重來,所以釘 on-demand、小心伺候。這把尺我後來套用在所有元件上——無狀態的運算層儘量做成可拋、可自動擴縮;有狀態的核心則收斂、保護、少動。**先分清楚哪些「死了能重來」、哪些「死了要人命」,再決定各自該怎麼養**——這是我做完 stateful、踏進 stateless 這批工具後,最想守住的一條設計紀律。
