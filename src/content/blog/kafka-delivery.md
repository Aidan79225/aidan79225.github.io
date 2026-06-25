---
title: "Kafka 的投遞保證:acks、ISR 與 at-least-once / exactly-once"
date: 2026-06-25
category: tech
tags:
  - kafka
  - data-engineering
  - reliability
series: "Kafka 學習筆記"
seriesOrder: 3
comments: true
draft: false
---
[[kafka-topics|第二篇]]講完事件「怎麼擺、誰來讀」,留了一個更尖銳的問題:崩潰重啟後,一筆事件到底會被**重複處理**、還是**漏掉**?這篇把 Kafka 的可靠性講透 —— **acks、複本與 ISR、commit 時機,以及 at-most-once / at-least-once / exactly-once 三種投遞語意**。

## 一筆事件的旅程,有三個地方會出事

要談「保證」,得先看清楚一筆事件從產生到被處理,中間經過哪幾段、每段怎麼壞:

1. **Producer → Broker**:網路斷了、broker 還沒回 ack —— producer 不知道到底寫進去沒,重送就可能**重複**,不重送就可能**丟失**。
2. **Broker 自己**:收下事件的那台機器掛了 —— 如果只存一份,資料就跟著沒了。
3. **Broker → Consumer**:消費者讀了、處理到一半 crash —— 重啟後從哪接,決定了它**重做一次**還是**跳過**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 150" role="img" aria-label="事件從 producer 經 broker 到 consumer,三段各有一個失誤點:寫入確認、複本存放、消費 commit" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="kd1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="14" y="50" width="104" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="66" y="71" fill="#e6e6e6" font-size="12" text-anchor="middle">Producer</text>
    <text x="66" y="86" fill="#9aa4b2" font-size="9" text-anchor="middle">acks?</text>
    <rect x="228" y="50" width="104" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="280" y="71" fill="#e6e6e6" font-size="12" text-anchor="middle">Broker</text>
    <text x="280" y="86" fill="#9aa4b2" font-size="9" text-anchor="middle">複本 / ISR</text>
    <rect x="442" y="50" width="104" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="494" y="71" fill="#e6e6e6" font-size="12" text-anchor="middle">Consumer</text>
    <text x="494" y="86" fill="#9aa4b2" font-size="9" text-anchor="middle">commit 時機</text>
    <line x1="118" y1="73" x2="226" y2="73" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#kd1)"/>
    <line x1="332" y1="73" x2="440" y2="73" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#kd1)"/>
    <text x="172" y="40" fill="#d4af37" font-size="10" text-anchor="middle">① 丟失 / 重複</text>
    <text x="280" y="130" fill="#d4af37" font-size="10" text-anchor="middle">② 機器掛了會不會丟</text>
    <text x="494" y="130" fill="#d4af37" font-size="10" text-anchor="middle">③ 重做 / 跳過</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三段旅程、三個失誤點 —— acks 管第一段、複本與 ISR 管第二段、commit 時機管第三段</figcaption>
</figure>

把這三段對應到三個設定,Kafka 的可靠性就拆得開了。

## 生產端:`acks` 決定「寫到什麼程度才算成功」

producer 送出一筆事件後,要等到什麼程度才認定「成功」?這由 `acks` 控制:

- **`acks=0`**:送出就當成功,不等任何確認。最快,但 broker 沒收到也不知道 —— 可能**丟失**。
- **`acks=1`**:等 leader 寫進去就算成功。但 leader 寫完、複本還沒跟上時掛掉,那筆就沒了 —— 仍可能丟。
- **`acks=all`**(或 `-1`):等 leader **以及所有同步中的複本**都寫進去才算成功。最慢,但只要還有一個同步複本活著,資料就在。

要不丟,起點是 `acks=all`。但 `acks=all` 單獨設沒有用 —— 它依賴下面的複本機制,兩者得一起講。

## 複本與 ISR:資料存幾份、誰說了算

每個 partition 可以設 **replication factor**(複本數),例如 3 —— 同一條 log 在三台 broker 上各存一份。其中一台是 **leader**,負責所有讀寫;其餘是 **follower**,持續從 leader 拉資料跟上。

關鍵概念是 **ISR(In-Sync Replicas,同步複本集合)**:**目前跟得上 leader 進度的那些複本。** follower 落後太多就被踢出 ISR,跟上了再加回來。

`acks=all` 的「all」,指的正是 **ISR 裡的複本**,而不是全部複本。所以還要搭一個設定:

- **`min.insync.replicas`**:ISR 至少要有幾個複本,寫入才被接受。設成 2,代表「至少 leader + 1 個同步複本都寫到」才算數;ISR 掉到剩 1 時,寫入直接被拒(寧可不收,也不收一份沒備份的資料)。

**`acks=all` + `replication.factor=3` + `min.insync.replicas=2`** 是最常見的「不丟」組合:容許一台 broker 掛掉,資料仍有兩份、仍可寫入。這三個要一起設才有意義 —— 只設 `acks=all` 但 `min.insync.replicas=1`,等於還是允許「只存一份就回成功」,那道保證是空的。

## 消費端:`commit` 時機決定「重複還是漏掉」

消費者讀到哪,靠 commit offset 記住。問題在於 **commit 與「實際處理完」的先後**:

- **先 commit、再處理**:萬一處理到一半 crash,offset 已經前進了 —— 重啟後從下一筆開始,**這筆就被跳過(漏掉)**。這是 **at-most-once**。
- **先處理、再 commit**:處理完才推進 offset。若處理完、commit 前 crash,重啟後會**再讀一次同一筆(重複)**。這是 **at-least-once**。

沒有「免費」的選項 —— 你只能選「寧可漏、還是寧可重複」。而絕大多數系統選 **at-least-once**:重複可以靠**幂等**消化,漏掉的資料卻通常救不回來。

## 三種投遞語意,一張表看完

| 語意 | 意思 | 怎麼來的 | 代價 |
|---|---|---|---|
| **at-most-once** | 最多一次,可能漏 | 先 commit 後處理 | 會掉資料 |
| **at-least-once** | 至少一次,可能重複 | 先處理後 commit | 下游要能去重 |
| **exactly-once** | 不重不漏 | 幂等 producer + 交易 | 設定複雜、有效能成本 |

## exactly-once 不是魔法,是兩塊拼起來的

很多人以為 exactly-once 是打開一個開關。實際上它是兩個機制疊起來,而且**範圍有限**:

- **幂等 producer**(`enable.idempotence=true`):broker 給每個 producer 一個 PID,並對每筆訊息編序號,**自動去掉重送造成的重複**。解決的是「第一段重試導致的重複寫入」。
- **交易(transactions)**:把「讀一批、處理、寫結果、推進 offset」包成一個原子單位 —— 要嘛整批生效、要嘛整批不算。這讓 Kafka **內部**的 read-process-write(典型是 Kafka Streams)能做到 exactly-once。

但要劃清界線:**Kafka 的 exactly-once 只在「Kafka 進、Kafka 出」的封閉迴路內成立。** 一旦你的消費者把結果寫到外部資料庫、呼叫外部 API,那一步 Kafka 的交易管不到 —— 跨出 Kafka 的 exactly-once,終究得靠**業務層自己幂等**(用 `order_id` 之類的唯一鍵去重、`upsert` 取代 `insert`)。

## 反思

### 務實的預設是「at-least-once + 下游幂等」,不是 exactly-once

我看過不少團隊一上來就追 exactly-once,結果設定複雜、效能掉、還是沒真的不重複 —— 因為他們的終點是外部資料庫,那段根本不在 Kafka 的交易範圍裡。我的預設一律是 **at-least-once(先處理後 commit),然後在消費端做幂等**:用業務唯一鍵去重、能 `upsert` 就不 `insert`。這套又簡單又穩,而且「處理本身可重入」這個性質,在重試、回補、重播歷史資料時全都用得上 —— **與其追求事件只來一次,不如讓你的處理「來幾次結果都一樣」。** 後者是你完全掌握的,前者不是。

### `acks=all` 沒搭 `min.insync.replicas` 是最常見的假保證

這是我複盤事故時反覆遇到的陷阱:有人設了 `acks=all` 就以為高枕無憂,卻把 `min.insync.replicas` 留在預設的 1。那等於說「只要 ISR 裡有一個複本(也就是 leader 自己)寫到就回成功」—— 一旦那台掛了,沒備份的資料照樣消失。**`acks=all` 是承諾,`min.insync.replicas` 才是兌現那個承諾的底線。** 兩個要一起看,否則只是心理安慰。我現在 review 設定,看到 `acks=all` 一定追問下一句:那 `min.insync.replicas` 是多少?

### 可靠性是成本,該按資料重要性分級

把所有 topic 都拉到最高保證(`acks=all`、三複本、交易)聽起來安全,但吞吐與延遲是要付帳的。我傾向**按資料重要性分級**:金流、訂單這種錯一筆都不行的,給滿;點擊流、行為日誌這種掉個幾筆無傷大雅、但量極大的,`acks=1`、複本數低一點,換吞吐。**可靠性不是越高越好,是「配得上這份資料的代價」才好** —— 把預算花在真正不能錯的地方。

### 真正該先問的,是「漏」和「重複」哪個你的業務承受得起

學投遞保證最容易陷進參數細節,但每次設計我都先退一步問這句。答案幾乎都是「重複我能處理(去重就好),漏掉我賠不起」—— 於是 at-least-once 自然勝出,後面的 acks、複本、commit 時機全是為了這個結論服務。**先定義你怕的是什麼,再回頭挑機制** —— 而不是被一堆參數牽著走。這也呼應了整個系列的調子:Kafka 給的從來不是免費的保證,而是一組「你想要什麼、就得自己設計到位」的工具。
