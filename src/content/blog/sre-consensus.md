---
title: "分散式共識:一群會掛的機器,如何對同一件事達成一致"
date: 2026-07-14
category: tech
description: "誰是 leader?鎖在不在誰手上?最新的值是多少?在有機器會掛、網路會斷、時鐘不可信的世界裡,讓一群機器對『同一件事』達成一致,是分散式系統最難的問題之一。這篇講兩件事:為什麼自己用 heartbeat + timeout 土砲選 leader,一斷線就會 split brain、資料分岔對不回來;以及共識的核心機制——多數決,為什麼任兩個過半集合一定重疊,於是衝突的決定不可能同時成立。結論:別自己造共識輪子,用 etcd、ZooKeeper 這些被驗證過的。"
tags:
  - sre
  - distributed-systems
series: "Google SRE 讀書筆記"
seriesOrder: 14
comments: true
draft: false
---
一群機器要對「同一件事」達成一致——**誰是 leader?這把鎖在誰手上?最新的值是多少?**——聽起來很簡單,卻是分散式系統**最難**的問題之一。難在哪?因為機器會掛、網路會斷、時鐘不可信,而你要在這些前提下,讓大家對一個答案有共識,而且**永遠不會分歧**。

## 為什麼「自己搞」會出事:split brain

最直覺的土砲解法是:大家互發心跳(heartbeat),誰沒回應就把它當死的、重新選一個 leader。平常沒事,但**網路一斷**就出事了:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 208" role="img" aria-label="土砲選 leader 遇到網路分割就 split brain。原本一個叢集,網路從中間斷開分成左右兩半。左半 Node A 自封 leader 收到寫入 X 等於 1,右半 Node B 也自封 leader 收到寫入 X 等於 2。網路恢復後 X 到底是 1 還是 2,兩邊都以為自己對,資料分岔對不回來。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">土砲選 leader:網路一斷,兩邊各自為政</text>
    <path d="M290,32 L282,52 L296,70 L286,92 L298,112 L290,132" fill="none" stroke="#e0733a" stroke-width="1.8" stroke-dasharray="1 0"/>
    <text x="290" y="150" fill="#e0733a" font-size="8.4" text-anchor="middle">網路斷了 ✂</text>
    <rect x="40" y="44" width="200" height="88" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="140" y="66" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">左半:Node A</text>
    <text x="140" y="84" fill="#e6e6e6" font-size="8.6" text-anchor="middle">「我沒收到 B → 我當 leader」</text>
    <rect x="70" y="94" width="140" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="140" y="111" fill="#e6e6e6" font-size="8.6" text-anchor="middle">收到寫入 X = 1</text>
    <rect x="340" y="44" width="200" height="88" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="440" y="66" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">右半:Node B</text>
    <text x="440" y="84" fill="#e6e6e6" font-size="8.6" text-anchor="middle">「我沒收到 A → 我當 leader」</text>
    <rect x="370" y="94" width="140" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="440" y="111" fill="#e6e6e6" font-size="8.6" text-anchor="middle">收到寫入 X = 2</text>
    <rect x="120" y="164" width="340" height="34" rx="7" fill="#3a2626" stroke="#e0733a" stroke-width="1.4"/>
    <text x="290" y="179" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">網路恢復後:X 到底是 1 還是 2?</text>
    <text x="290" y="192" fill="#9aa4b2" font-size="8" text-anchor="middle">兩邊都以為自己對 → 資料分岔,對不回來(split brain)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b>split brain(腦裂)</b>是土砲共識的經典死法:網路一分割,兩邊各自「合理地」推論出「對方死了、我來當家」,於是同時接受寫入。可怕的地方不是有人掛掉,而是<b>兩邊都還活著、都自認正確</b>——等網路恢復,兩份互相矛盾的資料誰都不服誰,可能就是無法挽回的損毀</figcaption>
</figure>

問題的根源是:**「對方沒回應」和「對方掛了」,你其實分不清楚**——可能只是網路斷了,對方活得好好的。土砲演算法把「收不到」當成「死了」,於是網路分割時,兩邊都得出「我該當 leader」的結論。要根治,需要一個數學上能保證「絕不分歧」的機制。

## 共識的核心:多數決(quorum)

分散式共識(Paxos、Raft、Zab 是它的幾種實作)靠的其實是一個小學就懂的原理——**多數決**:任何決定都必須拿到「過半」節點的同意才算數。而過半有一個關鍵性質:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 210" role="img" aria-label="多數決:任兩個過半集合一定重疊。五個節點 N1 到 N5,過半等於三票。提案 A 拿到 N1 N2 N3 共三票通過。提案 B 想拿 N3 N4 N5,但 N3 已經答應 A,於是拒絕 B,B 拿不到過半被擋下。任兩組過半必定共用至少一個節點,那個節點會拒絕第二個衝突提案,所以兩個矛盾的決定不可能同時成立。五台容忍兩台掛,用奇數最划算。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">多數決:任兩個「過半」集合,一定重疊</text>
    <line x1="90" y1="58" x2="290" y2="58" stroke="#54b890" stroke-width="1.6"/><line x1="90" y1="58" x2="90" y2="78" stroke="#54b890" stroke-width="1.6"/><line x1="290" y1="58" x2="290" y2="78" stroke="#54b890" stroke-width="1.6"/>
    <text x="190" y="50" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">提案 A → N1 N2 N3(3 票)✓ 通過</text>
    <line x1="290" y1="150" x2="490" y2="150" stroke="#e0733a" stroke-width="1.6"/><line x1="290" y1="130" x2="290" y2="150" stroke="#e0733a" stroke-width="1.6"/><line x1="490" y1="130" x2="490" y2="150" stroke="#e0733a" stroke-width="1.6"/>
    <text x="390" y="168" fill="#e0733a" font-size="8.6" text-anchor="middle" font-weight="bold">提案 B → N3 N4 N5:N3 已被 A 佔 → 拒絕 ✗</text>
    <circle cx="90" cy="104" r="19" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="90" y="108" fill="#e6e6e6" font-size="9" text-anchor="middle">N1</text>
    <circle cx="190" cy="104" r="19" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="190" y="108" fill="#e6e6e6" font-size="9" text-anchor="middle">N2</text>
    <circle cx="290" cy="104" r="21" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.8"/><text x="290" y="101" fill="#e6e6e6" font-size="9" text-anchor="middle">N3</text><text x="290" y="114" fill="#d6a45c" font-size="6.6" text-anchor="middle">重疊點</text>
    <circle cx="390" cy="104" r="19" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="390" y="108" fill="#e6e6e6" font-size="9" text-anchor="middle">N4</text>
    <circle cx="490" cy="104" r="19" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="490" y="108" fill="#e6e6e6" font-size="9" text-anchor="middle">N5</text>
    <text x="290" y="196" fill="#9aa4b2" font-size="8.3" text-anchor="middle">5 台 → 過半=3;任兩組過半必共用 ≥1 台 → 衝突決定不可能並存 · 容忍 2 台掛 · 用奇數最划算</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">為什麼多數決能根治 split brain?因為<b>任兩個過半集合,一定至少共用一個節點</b>——而那個節點不會對兩個互相衝突的提案都點頭。於是就算網路分割,最多只有「擁有過半」的那一邊能做決定,另一邊自動失能,不可能兩個 leader 並存。這也是為什麼共識系統一律用奇數台(3、5):`2f+1` 台能容忍 `f` 台掛掉還維持過半</figcaption>
</figure>

有了多數決,共識系統能給出兩個關鍵保證:**安全性(safety)——永遠不會有兩個矛盾的決定,這條在任何情況下都成立**;以及**活性(liveness)——只要過半節點活著且能通訊,最終一定能有結論**。注意安全性是無條件的:就算網路爛到只剩一半能通,系統寧可停下來(不可用)也**絕不給出錯誤的答案**——這正是 CAP 裡「分割時選一致性」的體現。

## 同一個問題的三種實作:Paxos、Raft、Zab

「多數決」是原理,但把它變成一個真的能跑、又不會出錯的演算法,細節多到嚇人。共識不是單一演算法,而是一整族;最常聽到的三個名字——**Paxos、Raft、Zab**——解的是同一題(用過半同意,湊出一份有序的日誌),但個性差很多:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="共識的三種實作對照。Paxos:1989 年 Lamport 提出的理論鼻祖,對稱式沒有強制 leader,正確但惡名昭彰地難懂難實作,Chubby 與 Spanner 在用。Raft:2014 年 Stanford 提出,強 leader,log 只從 leader 單向流向 follower,為好懂而生,etcd、Consul、KRaft、CockroachDB 在用。Zab:ZooKeeper 內建,強 leader,用 zxid 給狀態變更定序,主打原子廣播全序、為協調服務優化,ZooKeeper 進而撐起舊版 Kafka 與 HBase。三者都解同一題,差別在領導模型與好不好懂,現代新系統多半選 Raft。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">同一題,三種實作</text>
    <rect x="12" y="34" width="180" height="140" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="102" y="56" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">Paxos</text>
    <text x="26" y="82" fill="#e6e6e6" font-size="8" text-anchor="start">· 1989・Lamport,理論鼻祖</text>
    <text x="26" y="104" fill="#e6e6e6" font-size="8" text-anchor="start">· 對稱式,無強制 leader</text>
    <text x="26" y="126" fill="#e6e6e6" font-size="8" text-anchor="start">· 正確,但惡名昭彰地難實作</text>
    <text x="26" y="156" fill="#9aa4b2" font-size="7.8" text-anchor="start">用:Chubby、Spanner</text>
    <rect x="200" y="34" width="180" height="140" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="290" y="56" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">Raft</text>
    <text x="214" y="82" fill="#e6e6e6" font-size="8" text-anchor="start">· 2014・Stanford</text>
    <text x="214" y="104" fill="#e6e6e6" font-size="8" text-anchor="start">· 強 leader,log 單向流</text>
    <text x="214" y="126" fill="#e6e6e6" font-size="8" text-anchor="start">· 為「好懂」而生</text>
    <text x="214" y="156" fill="#9aa4b2" font-size="7.8" text-anchor="start">用:etcd、Consul、KRaft</text>
    <rect x="388" y="34" width="180" height="140" rx="8" fill="#2b2540" stroke="#9b6ff0" stroke-width="1.5"/>
    <text x="478" y="56" fill="#9b6ff0" font-size="11" text-anchor="middle" font-weight="bold">Zab</text>
    <text x="402" y="82" fill="#e6e6e6" font-size="8" text-anchor="start">· ZooKeeper 內建</text>
    <text x="402" y="104" fill="#e6e6e6" font-size="8" text-anchor="start">· 強 leader,zxid 定序</text>
    <text x="402" y="126" fill="#e6e6e6" font-size="8" text-anchor="start">· 主打原子廣播(全序)</text>
    <text x="402" y="156" fill="#9aa4b2" font-size="7.8" text-anchor="start">用:ZooKeeper→舊版 Kafka</text>
    <text x="290" y="196" fill="#9aa4b2" font-size="8.3" text-anchor="middle">三者都解同一題(過半 → 一份有序日誌);差別在「領導模型」與「好不好懂」</text>
    <text x="290" y="210" fill="#d6a45c" font-size="8" text-anchor="middle">現代新系統多半選 Raft——因為你真的實作得出來、而且不容易錯</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三者殊途同歸:都靠過半同意,湊出一份所有副本都認可、順序一致的日誌。真正的差異在<b>領導模型</b>(Paxos 經典版是對稱的,Raft 與 Zab 都是強 leader)和<b>好不好懂</b>——而「好不好懂」聽起來很軟,卻是 Raft 能後來居上、成為現代預設的關鍵:一個你實作得對的演算法,勝過一個理論更漂亮卻處處是坑的</figcaption>
</figure>

### Paxos:理論鼻祖,正確但難搞

Leslie Lamport 在 1989 年提出,是分散式共識的理論源頭,數學上證明過正確。但它**惡名昭彰地難懂**:原始論文只講「對單一個值達成共識」(basic Paxos),真實系統要的卻是對「一連串值」(一份 log)達成共識的 **Multi-Paxos**,而這部分論文語焉不詳,於是每家實作長得都不一樣、細節裡全是坑。Google 那篇〈Paxos Made Live〉整篇就在講「從論文到能上線的產品,中間有多少沒寫出來的血淚」。用它的是 Google 的 Chubby、Spanner 這類重量級系統。

### Raft:為了「讓人看得懂」而生

2014 年 Stanford 提出,動機直接寫在論文標題:〈In Search of an Understandable Consensus Algorithm〉——它就是受不了 Paxos 太難,**刻意設計成好懂**。做法是**強 leader** 模型:所有變更只從 leader 流向 follower(單向),再把問題拆成三塊好啃的子題——leader 選舉、log 複製、安全性。它還有一個很優雅的小招:**隨機化的選舉逾時**,自然避免大家同時搶著當 leader 的分票僵局。Raft 給的保證跟 Multi-Paxos 一樣,但你真的實作得出來、又不容易錯,所以成了現代預設——etcd、Consul、TiKV、CockroachDB、Kafka 的 [[kafka-ops|KRaft]] 都用它。

### Zab:ZooKeeper 的專用引擎

Zab(ZooKeeper Atomic Broadcast)是 Apache ZooKeeper 背後的協定,比 Raft 更早、風格也神似(同樣強 leader)。它為「協調服務」這個特定場景量身打造,主打**原子廣播(atomic broadcast)**——保證所有狀態變更在每台機器上都以**完全相同的順序**套用;leader 用單調遞增的 **zxid** 幫每筆變更編號定序,並圍繞「primary 崩潰後怎麼乾淨地恢復」做設計。你可能沒直接用過它,但八成間接依賴過——ZooKeeper 撐起了舊版 Kafka、HBase、Hadoop 一大票系統。

## 共識拿來做什麼:一份大家都同意的日誌

共識最常見的用法,是產出一份**所有副本都同意、順序一致的操作日誌**(replicated log)。每個副本照同樣的順序套用同樣的操作,狀態自然就一致了——這就是 replicated state machine。在這之上,可以蓋出一堆關鍵設施:

- **leader 選舉**:永遠只有一個 leader,不會 split brain。
- **分散式鎖**:誰真正持有鎖,全叢集有共識。
- **設定 / 中繼資料儲存**:整個系統的「真相來源(source of truth)」。

而 SRE 最重要的一句忠告是:**別自己造共識輪子。** 共識演算法的正確性極其微妙,土砲版幾乎必有隱藏 bug。實務上直接用被驗證過的現成系統——你天天在用的基礎設施,底層幾乎都是它:K8s 把整個叢集狀態託付給 [[k8s-intro|etcd]]——它走的是 Raft;Kafka 新版的 [[kafka-ops|KRaft]] 顧名思義也是 Raft;Google 內部則是 Chubby。

## 反思

### 「別自己造共識輪子」是我學費換來的信仰

我年輕時真的幹過「用資料庫的一個 flag 欄位 + 定時心跳來選 leader」這種事,當下覺得很聰明、很省。結果就是在一次網路抖動裡,兩個實例同時搶到「我是 leader」,各自跑了一輪本該互斥的任務,收拾了很久。**共識這種東西,平常跑一萬次都對,錯的是那第一萬零一次的邊界狀況——而分散式系統裡,罕見的邊界狀況每天都在發生。** 從那之後我信一條:凡是牽涉「一群機器要對某件事達成一致」的需求,我一律去找 etcd / ZooKeeper,而不是自己拼。這不是偷懶,是承認一件事——**這個問題比它看起來難一個數量級,而別人已經把它解對了。**

### split brain 教我的:最危險的故障是「大家都自認正確」

split brain 讓我對「故障」的想像變立體了。以前我以為故障就是「東西掛掉、沒回應」,那其實還算好處理——至少你知道它壞了。真正可怕的是 split brain 這種:**沒有人掛掉,每個節點都活得好好的、都在正常運作、都基於自己看到的局部資訊做出了「合理」的判斷,然後整體崩壞。** 這跟[[ddia-reliable-scalable|DDIA 講的]]「部分失效」是同一種陰影——分散式系統的難,往往不在單點壞掉,而在**沒有一個上帝視角**,每個節點只能看到局部,卻要做出全域一致的決定。多數決的優雅,正在於它用「重疊」這個幾何性質,幫這群各自為政的節點強加了一個唯一的真相。

### 共識不是免費的,所以要用在刀口上

多數決聽起來很美,但它有代價:每個決定都要等**過半節點來回確認**,這是實打實的延遲與吞吐瓶頸。所以好的架構不會把什麼都塞進共識,而是**只讓最關鍵、最不能出錯的那一小撮狀態走共識**(誰是 leader、鎖、關鍵設定),其餘大量的資料走比較便宜的複製。這也呼應了我一直的體會:可靠度從來不是「哪裡都拉到最高」,而是**分清楚哪些地方值得付昂貴的代價、哪些地方不必**——把最強的保證,留給真正輸不起的那條線。
