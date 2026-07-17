---
title: "Apache ZooKeeper:分散式系統的協調核心"
date: 2026-07-15
category: tech
description: "你很少直接用 ZooKeeper,卻天天間接依賴它——舊版 Kafka、HBase、Hadoop 的高可用都靠它撐著。它把『分散式協調』這件難事,收斂成一棵像檔案系統的小樹(znode)加上幾個簡單原語(ephemeral、sequential、watch),讓上層系統不必自己實作共識。這篇詳細講 ZooKeeper 的資料模型、ensemble 架構(寫走 leader、讀就地)、以及怎麼用『ephemeral-sequential + 只 watch 前一個』拼出分散式鎖與 leader 選舉又不引發驚群,最後談它的極限與為什麼有些系統開始離開它。"
tags:
 - distributed-systems
 - zookeeper
comments: true
draft: false
---
[[sre-consensus|上一篇共識]]帶到 Zab 是 ZooKeeper 的引擎,但 ZooKeeper 本身值得單獨講一篇。它是分散式系統的**協調核心(coordination service)**:你很少直接用它,卻天天間接依賴它——舊版 Kafka、HBase、Hadoop 的高可用,底下都是它在撐。它最漂亮的地方,是把「分散式協調」這件難事,收斂成一棵**像檔案系統的小樹**加上幾個簡單原語,讓上層系統不必自己去碰共識那個泥沼。

## 它不是資料庫,是「協調」的專用工具

先擺正定位:ZooKeeper **不是拿來存資料的**,它存的是**少量、但極關鍵的中繼資料**(誰是 leader、有哪些節點活著、設定是什麼),資料量是 KB 等級。它的價值不在容量,而在**高可用 + 強一致 + 一組剛好夠用的協調原語**。你把「一群機器怎麼對關鍵狀態達成一致」這個最難的問題外包給它,自己就能專心做業務。

## 資料模型:一棵像檔案系統的樹

ZooKeeper 對外的樣子出乎意料地簡單:一棵樹,每個節點叫 **znode**,用路徑定址(像 `/services/node-1`),每個 znode 能存一小塊資料、也能有子節點。真正的巧思在 znode 的**三種型別**和 **watch**:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 244" role="img" aria-label="ZooKeeper 資料模型是一棵像檔案系統的樹。根節點斜線下有 config、services、lock 三個持久節點。config 存 db_url 設定資料。services 下有 node-1、node-2 兩個 ephemeral 節點,client session 一斷就自動消失。lock 下有 lock-0000000001、lock-0000000002 兩個 ephemeral sequential 節點。client 對 config 設 watch,變更就通知。圖例:P persistent 永久除非刪除、E ephemeral 綁 session 斷線即消失、S sequential 自動加遞增編號、watch 訂閱變更一次性通知。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">資料模型:一棵像檔案系統的樹(znode)</text>
 <rect x="16" y="40" width="42" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="37" y="56" fill="#e6e6e6" font-size="10" text-anchor="middle">/</text>
 <line x1="58" y1="52" x2="94" y2="53" stroke="#3a4154" stroke-width="1.1"/><line x1="58" y1="52" x2="94" y2="102" stroke="#3a4154" stroke-width="1.1"/><line x1="58" y1="52" x2="94" y2="164" stroke="#3a4154" stroke-width="1.1"/>
 <rect x="96" y="40" width="150" height="28" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="106" y="52" fill="#e6e6e6" font-size="8.4" text-anchor="start">/config</text><text x="238" y="52" fill="#4f6df5" font-size="7.6" text-anchor="end">[P]</text><text x="106" y="63" fill="#9aa4b2" font-size="7" text-anchor="start">data: db_url=…</text>
 <rect x="96" y="90" width="120" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="106" y="106" fill="#e6e6e6" font-size="8.4" text-anchor="start">/services</text><text x="208" y="106" fill="#4f6df5" font-size="7.6" text-anchor="end">[P]</text>
 <rect x="96" y="152" width="120" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="106" y="168" fill="#e6e6e6" font-size="8.4" text-anchor="start">/lock</text><text x="208" y="168" fill="#4f6df5" font-size="7.6" text-anchor="end">[P]</text>
 <line x1="216" y1="102" x2="248" y2="93" stroke="#3a4154" stroke-width="1.1"/><line x1="216" y1="102" x2="248" y2="119" stroke="#3a4154" stroke-width="1.1"/>
 <rect x="250" y="82" width="150" height="22" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="260" y="97" fill="#e6e6e6" font-size="8" text-anchor="start">node-1</text><text x="392" y="97" fill="#54b890" font-size="7.4" text-anchor="end">[E]</text>
 <rect x="250" y="108" width="150" height="22" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="260" y="123" fill="#e6e6e6" font-size="8" text-anchor="start">node-2</text><text x="392" y="123" fill="#54b890" font-size="7.4" text-anchor="end">[E]</text>
 <line x1="216" y1="164" x2="248" y2="159" stroke="#3a4154" stroke-width="1.1"/><line x1="216" y1="164" x2="248" y2="185" stroke="#3a4154" stroke-width="1.1"/>
 <rect x="250" y="148" width="180" height="22" rx="5" fill="#2b2540" stroke="#9b6ff0" stroke-width="1.2"/><text x="260" y="163" fill="#e6e6e6" font-size="8" text-anchor="start">lock-0000000001</text><text x="422" y="163" fill="#9b6ff0" font-size="7.4" text-anchor="end">[E+S]</text>
 <rect x="250" y="174" width="180" height="22" rx="5" fill="#2b2540" stroke="#9b6ff0" stroke-width="1.2"/><text x="260" y="189" fill="#e6e6e6" font-size="8" text-anchor="start">lock-0000000002</text><text x="422" y="189" fill="#9b6ff0" font-size="7.4" text-anchor="end">[E+S]</text>
 <line x1="470" y1="54" x2="248" y2="54" stroke="#d6a45c" stroke-width="1.1" stroke-dasharray="3 2"/><text x="472" y="50" fill="#d6a45c" font-size="7.6" text-anchor="start">client</text><text x="472" y="61" fill="#d6a45c" font-size="7.2" text-anchor="start">watch</text>
 <text x="470" y="120" fill="#9aa4b2" font-size="7.4" text-anchor="start">client session</text><text x="470" y="131" fill="#9aa4b2" font-size="7.4" text-anchor="start">一斷 → [E] 消失</text>
 <text x="290" y="218" fill="#9aa4b2" font-size="7.8" text-anchor="middle">[P] persistent 永久(除非刪除)　　[E] ephemeral 綁 session、斷線即消失</text>
 <text x="290" y="232" fill="#9aa4b2" font-size="7.8" text-anchor="middle">[S] sequential 自動加遞增編號　　watch 訂閱變更、一次性通知</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三種 znode 是所有魔法的來源:<b style="color:#54b890">ephemeral</b>(綁在 client 的 session 上,client 一斷線就自動消失)讓「偵測誰死了」變成資料模型的自然結果;<b style="color:#9b6ff0">sequential</b>(ZooKeeper 自動幫名字補上遞增編號)給出全域唯一的排序;兩者合起來(E+S)就是鎖與選主的積木。再配上 <b style="color:#d6a45c">watch</b>(訂閱某個 znode,一變更就收到一次性通知),你就有了一套 event-driven、免輪詢的協調工具</figcaption>
</figure>

這裡最關鍵的設計,是 **ephemeral 節點綁定 session**:client 和 ZooKeeper 之間維持一個有心跳的 session,一旦心跳停了(client 崩潰、網路斷)、session 逾時,它建立的所有 ephemeral 節點會**自動消失**。這一招把分散式系統裡最惱人的「怎麼知道某個節點死了」直接內建成資料模型的行為——你不用自己寫心跳偵測,只要看那個 ephemeral 節點還在不在。

## 架構:一個 ensemble,寫走 leader、讀就地

ZooKeeper 自己也是分散式的——它由一組(奇數台,通常 3 或 5)伺服器組成一個 **ensemble**,靠 [[sre-consensus|Zab]] 選出一個 leader,其餘是 follower。讀寫走的是兩條很不對稱的路:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 210" role="img" aria-label="ZooKeeper 架構:一個 ensemble,寫走 leader,讀就地。左邊 client A 的寫請求一律走 leader,leader 用 Zab 原子廣播給兩個 follower,過半 ack 才 commit。client B 的讀請求由任何一台就地回答,可能稍舊。下方說明:寫是線性化全序、過半才算數;讀可擴展、就地回答可能稍舊、要最新用 sync;另有 observer 不投票專門擴充讀 throughput。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <defs><marker id="zk" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="zg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker></defs>
 <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">架構:一個 ensemble,寫走 leader、讀就地</text>
 <rect x="14" y="54" width="76" height="28" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="52" y="72" fill="#e6e6e6" font-size="8.6" text-anchor="middle">client A</text>
 <rect x="14" y="116" width="76" height="28" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="52" y="134" fill="#e6e6e6" font-size="8.6" text-anchor="middle">client B</text>
 <rect x="250" y="42" width="160" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.5"/><text x="330" y="61" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Leader(Zab 選出)</text>
 <rect x="250" y="88" width="160" height="28" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="330" y="106" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Follower</text>
 <rect x="250" y="124" width="160" height="28" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="330" y="142" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Follower</text>
 <line x1="90" y1="62" x2="248" y2="58" stroke="#54b890" stroke-width="1.3" marker-end="url(#zg)"/><text x="168" y="50" fill="#54b890" font-size="7.8" text-anchor="middle">寫 → 一律走 leader</text>
 <line x1="410" y1="57" x2="470" y2="57" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#zk)"/><text x="500" y="54" fill="#9aa4b2" font-size="7.6" text-anchor="middle">Zab 廣播</text><text x="500" y="65" fill="#9aa4b2" font-size="7.6" text-anchor="middle">過半 ack</text>
 <line x1="330" y1="72" x2="330" y2="86" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#zk)"/><line x1="330" y1="72" x2="330" y2="122" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#zk)"/>
 <line x1="90" y1="130" x2="248" y2="138" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#zk)"/><text x="168" y="126" fill="#9aa4b2" font-size="7.8" text-anchor="middle">讀 → 任何一台就地回答</text>
 <text x="290" y="182" fill="#9aa4b2" font-size="8.3" text-anchor="middle">寫:線性化、全序(過半才算數)　·　讀:可擴展、就地回答(可能稍舊,要最新用 sync())</text>
 <text x="290" y="198" fill="#9aa4b2" font-size="8.3" text-anchor="middle">另有 observer(不投票)專門擴充讀 throughput </text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">ZooKeeper 的讀寫刻意不對稱:<b>寫</b>一律繞到 leader,經 Zab 原子廣播、過半 ack 才 commit——所以寫是<b>線性化</b>的、有全序,但也較慢、受過半往返限制。<b>讀</b>則由任何一台就地回答,因此讀可以水平擴展,代價是可能讀到<b>稍舊</b>的值(要保證最新可先呼叫 <code>sync()</code>)。這個「寫強一致、讀可擴展但容許稍舊」的取捨,正是它能扛住海量協調流量的關鍵</figcaption>
</figure>

一致性上抓三個重點就夠:**寫是線性化的**(全序、過半才算數)、**同一個 client 的操作依送出順序生效**、而**讀可能稍舊**(有界的、不是任意舊)。這組保證對「協調」剛剛好——你要的是「對關鍵狀態達成一致」,不是「每次讀都毫秒級最新」。

## 怎麼用它:協調原語都是「znode + watch」拼出來的

ZooKeeper 只給你這些積木,不直接給你「鎖」或「leader 選舉」——那些是你用積木**拼**出來的「食譜(recipes)」。最經典的一道,是用 **ephemeral + sequential** 做分散式鎖 / leader 選舉:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 216" role="img" aria-label="用 ephemeral-sequential 做分散式鎖或選 leader 的食譜。lock 節點下,三個 client 各建一個 ephemeral sequential 節點 lock-0000000001、0002、0003。編號最小的 0001 持有鎖或當 leader。0002 只 watch 0001、0003 只 watch 0002,每個只盯前一個。持有者掛掉時 ephemeral 節點消失,只喚醒下一個接手,沒有驚群,因為不是所有人搶同一個。這就是 leader election 與分散式鎖的標準模式。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <defs><marker id="zw" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#d6a45c"/></marker></defs>
 <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">食譜:ephemeral-sequential 做鎖 / 選 leader</text>
 <text x="150" y="44" fill="#9aa4b2" font-size="8.2" text-anchor="middle">/lock 下,每個 client 各建一個 [E+S] 節點:</text>
 <rect x="150" y="54" width="200" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.5"/><text x="164" y="73" fill="#e6e6e6" font-size="8.6" text-anchor="start">lock-0000000001</text><text x="336" y="73" fill="#54b890" font-size="7.8" text-anchor="end">最小 = 持有 ✓</text>
 <rect x="150" y="104" width="200" height="30" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="164" y="123" fill="#e6e6e6" font-size="8.6" text-anchor="start">lock-0000000002</text><text x="336" y="123" fill="#9aa4b2" font-size="7.8" text-anchor="end">等待中</text>
 <rect x="150" y="154" width="200" height="30" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="164" y="173" fill="#e6e6e6" font-size="8.6" text-anchor="start">lock-0000000003</text><text x="336" y="173" fill="#9aa4b2" font-size="7.8" text-anchor="end">等待中</text>
 <path d="M366,119 C400,119 400,73 368,71" fill="none" stroke="#d6a45c" stroke-width="1.2" marker-end="url(#zw)"/><text x="418" y="97" fill="#d6a45c" font-size="7.8" text-anchor="middle">只 watch</text><text x="418" y="108" fill="#d6a45c" font-size="7.8" text-anchor="middle">前一個</text>
 <path d="M366,169 C400,169 400,123 368,121" fill="none" stroke="#d6a45c" stroke-width="1.2" marker-end="url(#zw)"/>
 <text x="290" y="204" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">持有者掛掉([E] 消失)→ 只喚醒下一個接手 → 沒有驚群(不是全部人搶同一個)</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">食譜的精髓有兩層:一是<b>編號最小者持有</b>——因為 sequential 給了全域唯一順序,誰先到誰先得,天然公平;二是<b>每個等待者只 watch「比自己小一號」的那一個</b>,而不是全部盯著鎖本身。這樣持有者一釋放(或 client 崩潰、ephemeral 節點消失),只有緊接在後的那一個會被喚醒去接手,避免了所有人同時被叫醒、一起搶鎖的<b>驚群(thundering herd)</b>——這跟 <a href="/blog/sre-cron/">可靠 cron</a> 那篇談的午夜驚群,是同一種要刻意迴避的模式</figcaption>
</figure>

同一套積木還能拼出其他協調原語:

- **服務發現 / 成員管理**:每個服務在 `/services` 下建一個 **ephemeral** 節點,它活著節點就在、它一死節點就消失——`/services` 底下有哪些子節點,就是「現在誰還活著」的即時名單。
- **設定管理**:把設定存成一個 znode,所有 client 對它下 **watch**;設定一改,大家立刻收到通知去重載,不用輪詢、也不用重啟。
- **屏障(barrier)、佇列**:一樣是 znode + watch 的變形,協調「大家都到齊了才開始」這類同步點。

## 它的極限,與為什麼有些系統開始離開它

ZooKeeper 很強,但不是萬靈丹,用之前要知道它的邊界:

- **只放小中繼資料**:它是協調服務,不是資料庫。znode 資料是 KB 級,別拿它存業務資料。
- **它本身是一套要維運的系統**:多一個 ZooKeeper ensemble,就多一套要顧的叢集、一個共享的故障點;而且當上層的 metadata 操作量很大時,它會變成瓶頸。這正是 [[kafka-ops|Kafka 走向 KRaft]] 的原因——把原本外包給 ZooKeeper 的 metadata 管理,用內建的 Raft 收回自己家,少養一套系統。
- **語意有陷阱**:watch 是**一次性**的(觸發後要重新註冊,中間的變更可能漏看)、session 逾時與 ephemeral 節點消失的時機,都是實務上容易踩的坑。

另外補一個對照:ZooKeeper 的現代同類是 **etcd**(用 [[sre-consensus|Raft]]),它是 [[k8s-intro|Kubernetes]] 的狀態儲存核心——你可以把「ZooKeeper 之於 Kafka/HBase」類比成「etcd 之於 Kubernetes」:都是把最難的一致性,收斂到一個被驗證過的協調核心裡。

## 反思

### ZooKeeper 是「別自己造輪子」最具體的化身

[[sre-consensus|共識那篇]]我下過一個結論:別自己造共識輪子。ZooKeeper 就是那句話最實際的樣子——它把 Zab、leader 選舉、線性化寫這些硬核的東西全部封裝好,對你只露出「一棵樹 + 幾個原語」。我特別欣賞這種**抽象的收斂**:它沒有要你懂 Paxos/Zab,而是把那些理論的成果,包裝成連新手都能用的 `create`、`watch`、`getChildren`。好的基礎設施就該是這樣——**把最難的複雜度吃進肚子裡,對外只吐出簡單**。每次我想「這個分散式協調我自己寫一下就好」,都會想起 ZooKeeper 背後那些論文和踩過的坑,然後乖乖去用現成的。

### 「ephemeral + watch」把「偵測死亡」變成資料模型的副作用

ZooKeeper 設計裡我最拍案叫絕的,是 **ephemeral 節點**。分散式系統最惱人的問題之一,是「怎麼可靠地知道某個節點死了」——心跳、逾時、誤判,一堆坑。而 ZooKeeper 的解法是:把「活著」這件事,綁進資料模型——你活著,你的 ephemeral 節點就在;你一斷線,它自動消失。於是「偵測死亡」不再是一段你要自己寫的邏輯,而是**查一下那個節點還在不在**就好。這種「把一個難問題,轉化成另一個系統天生就會處理的形式」的思路,是我覺得最高級的一種工程設計——不是把問題解掉,而是讓它**根本不需要被解**。

### 協調核心的真正價值:把一致性收斂到一個地方

用久了 ZooKeeper(以及它的表親 etcd),我體會到一個架構層面的智慧:**與其讓系統裡每個元件都自己處理一致性,不如把「需要強一致的那一小撮狀態」,全部收斂到一個專門的協調核心**。這跟我在共識那篇說的「只讓最關鍵的狀態走共識」是同一件事的放大版——ZooKeeper 就是那個「唯一需要昂貴一致性」的地方,其他所有服務都變成它的 client,自己維持無狀態、可水平擴展。把最難的部分集中管理、其餘保持簡單,這不只是 ZooKeeper 的設計哲學,幾乎是所有耐得住規模的分散式架構共通的骨架。
