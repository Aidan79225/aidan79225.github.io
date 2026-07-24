---
title: "一致性與共識:linearizability、CAP 的誠實版,與全序廣播"
date: 2026-07-24
category: tech
description: "Ch8 的結論是『真相由多數決定』;Ch9 講多數怎麼安全地決定——這是 DDIA 全書的理論高潮。三個台柱:linearizability(讓系統看起來只有一份資料的最強保證——也貴得驚人,而你真正需要它的地方比想像少)、CAP 的誠實版(分區不是讓你選的,是會發生的故障;『三選二』是誤導)、以及全書最漂亮的等價:全序廣播 ≡ 共識——共識聽起來玄,說穿了就是『大家對一條 log 的順序達成一致』,而 Raft 的 log、Kafka 的 partition、資料庫的複製串流,全是同一個形狀。"
tags:
  - distributed-systems
  - book-notes
  - consistency
series: "Designing Data-Intensive Applications 讀書筆記"
seriesOrder: 9
comments: true
draft: false
---
[[ddia-distributed-trouble|上一篇]]的結論是:任何單一節點的判斷都不可信,**真相只能由多數決定**。這章講的就是「多數怎麼**安全地**決定」——DDIA 全書的理論高潮。演算法細節(Raft、Paxos、Zab 怎麼投票換屆)我在 [[sre-consensus|SRE 共識那篇]]拆過了,這篇取 Ch9 獨有的三個台柱:**最強的一致性保證長什麼樣、CAP 到底在說什麼、以及「共識」這個玄詞的真身**。

## Linearizability:讓系統「看起來只有一份資料」

一致性保證的天花板叫 **linearizability(線性一致)**,定義可以講得很白話:**整個系統表現得像只有「一份」資料,而且每個操作都是原子的**——只要**任何人**讀到了新值,**之後所有人**都必須讀到新值,不准再看到舊的。DDIA 用一場球賽講它:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 224" role="img" aria-label="linearizability 被打破的一幕。比賽結束,裁判把結果寫進 leader。Alice 查詢,打到已同步的 replica,看到終場比分,興奮地告訴 Bob:結束了!Bob 聽到後自己重新整理,卻打到還沒追上的另一個 replica,看到比賽還在進行。從系統外部看:Alice 已經讀到新值之後,Bob 的讀取卻回到舊值——時間上發生在後的讀,讀到了更舊的狀態,單一資料的幻覺破滅。linearizability 要求:任何人讀到新值之後,所有人都必須讀到新值。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="cc9" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">終場哨響:結果寫入,但兩個 replica 進度不同</text>
    <path d="M232 36 v22 a58 6 0 0 0 116 0 v-22" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><ellipse cx="290" cy="36" rx="58" ry="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="290" y="54" fill="#4f6df5" font-size="8" text-anchor="middle" font-weight="bold">leader:2 : 1 終場</text>
    <rect x="96" y="86" width="150" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="171" y="105" fill="#54b890" font-size="8" text-anchor="middle">replica 1(已同步):2:1 終場</text>
    <rect x="334" y="86" width="150" height="30" rx="6" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.4"/><text x="409" y="105" fill="#e0733a" font-size="8" text-anchor="middle">replica 2(落後):1:1 進行中</text>
    <line x1="252" y1="62" x2="186" y2="84" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#cc9)"/><line x1="328" y1="62" x2="394" y2="84" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#cc9)"/>
    <rect x="60" y="140" width="220" height="30" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/><text x="170" y="159" fill="#e6e6e6" font-size="8" text-anchor="middle">① Alice 查到「終場 2:1」→ 告訴 Bob</text>
    <rect x="300" y="140" width="220" height="30" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.4"/><text x="410" y="159" fill="#e05a7d" font-size="8" text-anchor="middle" font-weight="bold">② Bob 重新整理 → 「還在踢」?!</text>
    <line x1="171" y1="118" x2="171" y2="138" stroke="#54b890" stroke-width="1.1" marker-end="url(#cc9)"/><line x1="409" y1="118" x2="409" y2="138" stroke="#e05a7d" stroke-width="1.1" marker-end="url(#cc9)"/>
    <line x1="282" y1="155" x2="298" y2="155" stroke="#9aa4b2" stroke-width="1" marker-end="url(#cc9)"/>
    <rect x="60" y="186" width="460" height="28" rx="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="290" y="204" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">發生在「後」的讀,讀到「更舊」的狀態 → 「單一資料」的幻覺破滅 = 不 linearizable</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">終場結果已寫入,Alice 打到<b style="color:#54b890">已同步的 replica</b> 看到 2:1、興奮地告訴 Bob;Bob 自己重新整理,卻打到<b style="color:#e0733a">落後的 replica</b>——「還在踢」。注意這不只是 <a href="/blog/ddia-replication/">複製延遲怪象</a>的重演:Bob 的讀<b>在時間上發生於 Alice 之後</b>,卻讀到更舊的狀態——「整個系統只有一份資料」的幻覺當場破滅。<b>linearizability 就是守住這個幻覺的保證:只要有人讀到新值,之後所有人都必須讀到新值</b></figcaption>
</figure>

哪些事**非它不可**?清單其實很短:**唯一性約束**(兩個人同時搶同一個 username、最後一個機位——本質都是「所有人必須對『誰先』有共識」)、**[[redis-sentinel|leader 選舉]]**(不能有兩個節點都以為自己是 leader)、跨系統的時序依賴。而它**貴得驚人**:單主同步複製慢、[[ddia-replication|Dynamo 式 quorum]] 嚴格說也不 linearizable(除非加同步 read repair)、而且分區時你必須犧牲可用性——這就接到了那個被講爛的定理。

## CAP 的誠實版:分區不是讓你「選」的

CAP 常被講成「一致性、可用性、分區容忍,三選二」——DDIA 對此很不客氣,而它的批評值得原文精神照登:**網路分區(P)不是一個你可以不選的選項,它是一種「會發生」的故障。** 你不能「選擇不要分區」,就像不能選擇不要地震。所以真正的取捨是:

- **分區發生時**:你只能在 **C**(拒絕服務以保一致)和 **A**(繼續服務但可能不一致)之間選——這是 CAP 唯一說了的事。
- **沒有分區的平時**(絕大多數時間):CAP 什麼都沒說;你真正在權衡的是**一致性 vs 延遲**(linearizable 的讀寫要跨節點協調,慢)。

所以「我們是 AP 系統」「那是 CP 資料庫」這種粗標籤,多半經不起追問——同一個系統的不同操作常常落在不同點上。**比起背三個字母,不如問兩個具體問題:分區的那幾分鐘你要保什麼?平時你願意為多強的一致付多少延遲?**

## 共識的真身:全序廣播,就是「大家同意同一條 log」

「共識」聽起來玄,DDIA 給了它一個工程師秒懂的等價形式——**全序廣播(total order broadcast)**:所有節點以**同樣的順序**收到**同樣的一串訊息**,不丟不重。而這跟共識是**同一個問題**:對訊息順序達成一致 = 反覆地做共識(第 1 筆是什麼?第 2 筆是什麼?…)。它的力量在於:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="全序廣播與狀態機複製。各節點的寫入請求先送進共識模組,共識模組把它們排成一條所有人都同意的全序 log:第一筆 x=1、第二筆 y=2、第三筆 x=3。三個節點各自照同一順序逐筆套用這條 log,因為起點相同、輸入序列相同、套用是確定性的,三台的最終狀態必然相同。下方點出:這個形狀就是 Raft 的 replicated log、Kafka 單一 partition 的全序、資料庫的複製串流——共識系統的核心就是一條被過半保護的 log。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="tob" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="70" y="30" fill="#9aa4b2" font-size="8" text-anchor="middle">各方寫入請求</text>
    <rect x="30" y="40" width="80" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="70" y="54" fill="#e6e6e6" font-size="7.2" text-anchor="middle" font-family="monospace">x=1</text>
    <rect x="30" y="66" width="80" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="70" y="80" fill="#e6e6e6" font-size="7.2" text-anchor="middle" font-family="monospace">y=2</text>
    <rect x="30" y="92" width="80" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="70" y="106" fill="#e6e6e6" font-size="7.2" text-anchor="middle" font-family="monospace">x=3</text>
    <line x1="110" y1="76" x2="150" y2="76" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#tob)"/>
    <rect x="152" y="52" width="112" height="48" rx="8" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.7"/>
    <text x="208" y="72" fill="#9b6ff0" font-size="8.8" text-anchor="middle" font-weight="bold">共識模組</text>
    <text x="208" y="88" fill="#9aa4b2" font-size="7" text-anchor="middle">把訊息排成大家同意的順序</text>
    <line x1="264" y1="76" x2="304" y2="76" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#tob)"/>
    <rect x="306" y="56" width="240" height="40" rx="6" fill="#33291a" stroke="#d6a45c" stroke-width="1.6"/>
    <text x="426" y="72" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">一條「全序」log(所有人同意)</text>
    <text x="426" y="88" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-family="monospace">① x=1 → ② y=2 → ③ x=3</text>
    <line x1="360" y1="96" x2="300" y2="130" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#tob)"/><line x1="426" y1="96" x2="426" y2="130" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#tob)"/><line x1="492" y1="96" x2="552" y2="130" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#tob)"/>
    <rect x="234" y="132" width="130" height="38" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="299" y="148" fill="#e6e6e6" font-size="7.6" text-anchor="middle">節點 1:照序套用</text><text x="299" y="162" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">x=3, y=2</text>
    <rect x="374" y="132" width="104" height="38" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="426" y="148" fill="#e6e6e6" font-size="7.6" text-anchor="middle">節點 2:同序</text><text x="426" y="162" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">x=3, y=2</text>
    <rect x="488" y="132" width="88" height="38" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="532" y="148" fill="#e6e6e6" font-size="7.6" text-anchor="middle">節點 3:同序</text><text x="532" y="162" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">x=3, y=2</text>
    <text x="290" y="192" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">同一起點 + 同一順序 + 確定性套用 = 狀態必然相同(狀態機複製)</text>
    <rect x="46" y="202" width="488" height="24" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="218" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-weight="bold">同一個形狀:Raft 的 replicated log · Kafka 單一 partition 的全序 · 資料庫的複製串流</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">各方的寫入先經過<b style="color:#9b6ff0">共識模組</b>,被排成一條<b style="color:#d6a45c">所有人都同意順序的 log</b>;每個節點照同一順序、確定性地逐筆套用——<b>起點相同 + 序列相同,狀態必然相同</b>(狀態機複製)。這就是共識的工程真身:<b>不是投票的儀式,是「大家共享同一條 log」</b>。你早就見過這個形狀:<a href="/blog/sre-consensus/">Raft</a> 的 replicated log、<a href="/blog/kafka-topics/">Kafka 單一 partition 內的全序</a>、資料庫的複製串流——<a href="/blog/zookeeper/">ZooKeeper</a>/etcd 本質上就是「一條被過半保護的 log + 一台狀態機」</figcaption>
</figure>

幾個常見的「假共識」也在這章現形:**2PC 不是共識**——協調者在 prepare 之後掛掉,所有參與者**卡死等待**(blocking),單點沒了整局停擺;共識演算法正是靠**過半 + 可以換 leader** 治好這個病。**Lamport 時間戳**能事後排出全序,卻不能**當下**回答「這個 username 給不給」——要即時定案,還是得共識。而共識演算法裡的 **epoch / term 編號**(防舊 leader 醒來搗亂),你應該覺得眼熟——它就是 [[redis-distributed-lock|fencing token]] 的親戚:**又是單調遞增的數字 + 過半,分散式的終極答案永遠這兩味藥。**

## 反思

### 需要 linearizability 的地方,比你以為的少一個數量級

這章先把最強保證講得誘人,再誠實告訴你它多貴——而我的實戰結論是:**真正非 linearizable 不可的,幾乎只有「唯一性」和「誰是 leader」兩類**,它們的共同點是「全世界必須對一個裁決立刻一致」。其他場景,[[ddia-replication|一致性菜單]]上便宜的那幾道(read-your-writes、因果)幾乎都夠。這也讓我對「我們系統要強一致」的需求會多問一句:**是哪個操作、什麼裁決需要?** 十次有八次,挖下去只剩一個唯一性約束——那就把貴的保證圈在那一小塊(交給資料庫 unique index 或 [[zookeeper|協調服務]]),其餘放寬。**一致性跟安全庫存一樣,全域拉滿是浪費,關鍵位置備足才是本事。**

### 「共識=一條大家同意的 log」——這個等價讓我把五個系統看成一個

全序廣播 ≡ 共識,是我讀 DDIA 收穫最大的一個「啊哈」。共識從「神秘的投票演算法」變成一句話:**大家共享同一條順序不容爭議的 log,然後各自照抄。** 這一下打通了我地圖上五個原本孤立的點:Raft 的 replicated log、[[zookeeper|ZooKeeper]] 的 zxid 序列、[[kafka-topics|Kafka partition]] 的 offset 全序、資料庫的 WAL 複製串流、甚至 [[redis-replication|Redis 的複製流]]——**全是「一條 log + 照序套用」的形狀,差別只在那條 log 被保護得多嚴**(過半共識、單一 leader、還是盡力而為)。認出這個形狀後,新系統的複製文件我幾乎能用猜的:先找它的 log 在哪、誰決定順序、順序被什麼保護。**一個等價關係,勝過十份架構文件。**

### CAP 教我的不是理論,是「拒絕粗標籤」的紀律

DDIA 對 CAP 的批評,我讀完最大的收穫是一種**提問的紀律**。「我們是 AP 系統」這種話,在架構會議上聽起來專業,實際上什麼都沒說——分區時哪個操作降級?怎麼降?平時為一致性付了多少延遲?這跟我一路的體會合流:[[ddia-replication|一致性是菜單不是開關]]、[[ddia-transactions|隔離層級是光譜不是布林]]——**分散式的重要性質幾乎都是「按操作、分等級」的,任何把它壓成一個字母的說法,都是在逃避真正的設計決策。** 現在聽到三字母定理被搬出來,我就問兩個問題:分區的那幾分鐘你保什麼?平時你付多少延遲?答得出來,才算真的想過。DDIA Part II 到此完結——網路會斷、時鐘會飄、節點會裝死,而我們靠一條被過半保護的 log,在機率的世界裡搭出了確定性的小島。下一部,資料開始在系統之間流動。
