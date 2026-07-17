---
title: "Kafka 的核心模型:Topic、Partition、Offset 與 Consumer Group"
date: 2026-06-24
category: tech
tags:
 - kafka
 - data-engineering
 - messaging
series: "Kafka 學習筆記"
seriesOrder: 2
comments: true
draft: false
---
[[kafka-intro|第一篇]]把 Kafka 的心智模型定成一句話:**一條可重播的事件 log**。但那條 log 實際上怎麼擺、怎麼平行化、一群消費者又怎麼分工?這篇把 Kafka 的四個核心名詞講透 —— **Topic、Partition、Offset、Consumer Group** —— 它們合起來決定了 throughput、順序與擴展。

## Topic 與 Partition:一條 log 怎麼變成可平行的多條

**Topic** 是一個具名的事件流,是邏輯上的分類 —— 例如 `orders`、`clicks`。但如果一個 topic 就只是「一條 log」,那它的 throughput 就被單一檔案、單一機器卡死了。

所以 Kafka 把每個 topic 切成多個 **Partition**:**真正那條 append-only log,其實是 partition,而不是 topic。** Topic 只是「這些 partition 的集合」這個名字。Partition 是 Kafka 一切平行與順序的單位 —— 不同 partition 可以散在不同 broker 上同時讀寫, throughput 就隨 partition 數放大。

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 560 210" role="img" aria-label="Topic orders 被切成三個 partition,每個 partition 是一條獨立有序的 log,producer 依 key 的 hash 決定事件落在哪個 partition" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
 <defs><marker id="kt1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <rect x="12" y="84" width="92" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
 <text x="58" y="103" fill="#e6e6e6" font-size="12" text-anchor="middle">Producer</text>
 <text x="58" y="118" fill="#9aa4b2" font-size="9" text-anchor="middle">key → hash</text>
 <rect x="150" y="16" width="398" height="184" rx="10" fill="none" stroke="#3a4154" stroke-width="1.5" stroke-dasharray="5 4"/>
 <text x="206" y="34" fill="#9aa4b2" font-size="11" text-anchor="middle">Topic: orders</text>
 <text x="174" y="74" fill="#9aa4b2" font-size="11" text-anchor="middle">P0</text>
 <rect x="200" y="55" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="220" y="75" fill="#9aa4b2" font-size="10" text-anchor="middle">0</text>
 <rect x="244" y="55" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="264" y="75" fill="#9aa4b2" font-size="10" text-anchor="middle">1</text>
 <rect x="288" y="55" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="308" y="75" fill="#9aa4b2" font-size="10" text-anchor="middle">2</text>
 <rect x="332" y="55" width="40" height="30" rx="4" fill="none" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="3 3"/><text x="352" y="75" fill="#9aa4b2" font-size="10" text-anchor="middle">3</text>
 <text x="174" y="122" fill="#9aa4b2" font-size="11" text-anchor="middle">P1</text>
 <rect x="200" y="103" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="220" y="123" fill="#9aa4b2" font-size="10" text-anchor="middle">0</text>
 <rect x="244" y="103" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="264" y="123" fill="#9aa4b2" font-size="10" text-anchor="middle">1</text>
 <rect x="288" y="103" width="40" height="30" rx="4" fill="none" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="3 3"/><text x="308" y="123" fill="#9aa4b2" font-size="10" text-anchor="middle">2</text>
 <text x="174" y="170" fill="#9aa4b2" font-size="11" text-anchor="middle">P2</text>
 <rect x="200" y="151" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="220" y="171" fill="#9aa4b2" font-size="10" text-anchor="middle">0</text>
 <rect x="244" y="151" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="264" y="171" fill="#9aa4b2" font-size="10" text-anchor="middle">1</text>
 <rect x="288" y="151" width="40" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="308" y="171" fill="#9aa4b2" font-size="10" text-anchor="middle">2</text>
 <rect x="332" y="151" width="40" height="30" rx="4" fill="none" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="3 3"/><text x="352" y="171" fill="#9aa4b2" font-size="10" text-anchor="middle">3</text>
 <line x1="104" y1="100" x2="168" y2="70" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kt1)"/>
 <line x1="104" y1="106" x2="168" y2="118" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kt1)"/>
 <line x1="104" y1="112" x2="168" y2="166" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kt1)"/>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Topic 是名字,partition 才是真正那條有序的 log; throughput 隨 partition 數放大,各自往尾端 append</figcaption>
</figure>

## Producer 怎麼決定事件進哪個 partition

寫入時,**有沒有指定 key,決定了事件落點 —— 也決定了順序保證**:

- **有 key**:Kafka 對 key 取 hash 再對 partition 數取模,**同一個 key 永遠進同一個 partition**。把 `order_id` 當 key,同一筆訂單的所有事件就保證落在同一條 log、嚴格有序。
- **沒有 key**:平均分散(round-robin / sticky)到各 partition,換取最大 throughput ,但放棄跨事件的順序。

這是 Kafka 最關鍵的一個設計選擇:**「要哪些事件之間有序」這件事,是你透過 key 自己決定的,不是 Kafka 免費給的。**

## Offset:事件在 partition 內的位置

**Offset** 是每筆事件在「它那條 partition」裡單調遞增的序號(0、1、2…)。它只在單一 partition 內有意義,跨 partition 不能比大小。

呼應上一篇的書籤比喻:消費者讀到哪,就是「我在 P0 讀到 offset 5、在 P1 讀到 offset 3」。這個「讀到哪」的位置會被**提交(commit)**起來,讓消費者重啟後能接著讀 —— 而 commit 的時機,正是下一篇要談的「重複或漏掉」問題的源頭。

## Consumer Group:消費者怎麼分工與擴展

單一消費者讀不完怎麼辦?把多個消費者組成一個 **Consumer Group**,Kafka 會把 partition **分配**給組裡的成員,平行分攤。

規則只有兩條,但很關鍵:

- **同一個 group 內,每個 partition 只會指派給一個 consumer。** 所以同 group 的消費者是「分攤」一個 topic —— 這讓 Kafka 表現得像個可水平擴展的**佇列**。
- **不同 group 各自獨立讀全量。** 帳務組一個 group、推薦組一個 group,兩邊都讀到每一筆 —— 這讓 Kafka 同時又像個**廣播**。

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 540 200" role="img" aria-label="一個 topic 的三個 partition 分配給 consumer group 裡的兩個 consumer:P0、P1 給 Consumer 1,P2 給 Consumer 2" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
 <defs><marker id="kt2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
 <rect x="18" y="28" width="112" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="74" y="52" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Partition 0</text>
 <rect x="18" y="84" width="112" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="74" y="108" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Partition 1</text>
 <rect x="18" y="140" width="112" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="74" y="164" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Partition 2</text>
 <rect x="300" y="18" width="224" height="164" rx="10" fill="none" stroke="#3a4154" stroke-width="1.5" stroke-dasharray="5 4"/>
 <text x="412" y="36" fill="#9aa4b2" font-size="11" text-anchor="middle">Consumer Group: billing</text>
 <rect x="332" y="50" width="160" height="40" rx="8" fill="#262b3a" stroke="#d4af37" stroke-width="1.5"/><text x="412" y="74" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Consumer 1</text>
 <rect x="332" y="122" width="160" height="40" rx="8" fill="#262b3a" stroke="#d4af37" stroke-width="1.5"/><text x="412" y="146" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Consumer 2</text>
 <line x1="130" y1="47" x2="332" y2="62" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kt2)"/>
 <line x1="130" y1="103" x2="332" y2="78" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kt2)"/>
 <line x1="130" y1="159" x2="332" y2="142" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#kt2)"/>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同 group 內每個 partition 只指派給一個 consumer(平行分攤);換一個 group 則各自獨立讀全部(廣播)</figcaption>
</figure>

兩個推論很實用:

- **平行度的上限 = partition 數。** group 裡的消費者比 partition 還多,多出來的只能閒置 —— 因為一個 partition 不會同時餵給兩個成員。
- **成員變動會觸發重新平衡(rebalance)。** 有消費者加入或掛掉,Kafka 會重新分配 partition。rebalance 期間消費會短暫暫停,partition 多、成員多時尤其有感 —— 這是維運上要心裡有數的代價。

## 順序保證:只在 partition 內成立

把前面收斂成一句最該記住的話:**Kafka 只保證「同一個 partition 內」嚴格有序,跨 partition 不保證任何順序。**

所以「順序」在 Kafka 裡是設計出來的,不是預設的:**你想要哪些事件之間有序,就讓它們用同一個 key、進同一個 partition。** 整個 topic 的全域順序?那等於把 partition 數壓成 1 —— 也就放棄了平行,通常不值得。實務上是退一步問:「我真正需要有序的單位是什麼?」往往是「同一筆訂單」「同一個使用者」,而不是「全世界」。

## 反思

### partition 數是最重要、也最難回頭的前期決定

partition 數一次同時決定了三件事:** throughput 上限、消費者平行度上限、以及順序的顆粒度**。偏偏它「能加不能減」——之後想加 partition 很容易,但加完會打亂既有 key 的 hash 落點(同一個 key 可能換到別的 partition,歷史順序就接不起來了)。所以我的習慣是**前期就抓一個有餘裕、但別誇張的數字**,寧可一開始稍微多給,也不要上線後才發現卡死又動不得。這是 Kafka 少數「開頭沒想清楚、後面很痛」的設計點。

### 選 key,就是在設計你的順序與負載

我認為 partition key 的選擇,被低估得很嚴重 —— 它表面上只是「資料進哪條 log」,實際上一次決定了順序與負載分布。key 選太粗(例如固定一個值),所有資料擠進同一個 partition,變成熱點、平行度歸零;key 選得好(例如 `order_id`),既保住「同一筆訂單有序」,又把負載均勻打散。**先想清楚「我的順序單位是什麼」,再回頭挑 key** —— 順序需求驅動 key,而不是隨手抓一個欄位。

### Consumer Group 是 Kafka 能同時當佇列又當廣播的關鍵

剛學的時候我一直困惑:Kafka 到底是佇列還是發布訂閱?後來才懂,答案藏在 consumer group 這個設計裡 —— **同一個 group 內分攤(像佇列),不同 group 間廣播(像 pub/sub)。** 要水平擴一個服務的消費速度,就往同一個 group 加消費者;要讓一個新團隊接這份事件,就開一個新 group。同一套機制兩種用法,這是我覺得 Kafka 模型最漂亮的地方。

### 但這套順序與分配,還沒回答「會不會重複或漏掉」

這篇講的是「事件怎麼擺、誰來讀」,但有個更尖銳的問題還沒碰:消費者把 offset commit 在哪個時機,決定了崩潰重啟後是**重複處理**還是**漏掉**。這正是 [[kafka-intro|Kafka]] 作為基礎建設最需要被認真對待的部分 —— **投遞保證(delivery guarantee)**,留到下一篇講 at-least-once、exactly-once 與複本機制時,一次說清楚。
