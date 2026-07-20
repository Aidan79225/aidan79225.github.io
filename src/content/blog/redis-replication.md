---
title: "主從複製:讀寫分離與複製延遲的怪現象"
date: 2026-07-20
category: tech
tags:
  - redis
  - distributed-systems
series: "Redis 學習筆記"
seriesOrder: 8
comments: true
draft: false
---
一台 Redis 再快也有記憶體與流量的上限,而且它一掛,資料就懸在半空。走向高可用的第一塊地基,就是**主從複製(replication)**:一個 **master** 負責寫、若干 **replica** 各複製一份、分擔讀流量。這也是後面 [[redis-cluster|Cluster]] 每個分片、以及 Sentinel 自動故障轉移的底層原型。看懂它,你其實是看懂了所有複製系統的通用骨架。

## 主從拓撲:一個寫、多個讀

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Redis 主從複製的拓撲。應用程式的寫請求打到唯一的 master,master 負責讀寫。master 用非同步的方式把資料複製給多個 replica,replica 只能讀。應用程式的讀請求可以分散到各個 replica,達成讀寫分離與讀流量的水平擴展。重點:master 只有一個是單一寫入點,replica 可以有多個、只讀、分擔讀流量,而複製是非同步的,master 不等 replica 確認就回覆客戶端。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="rpa" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#d6a45c"/></marker></defs>
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">一個 master 寫,多個 replica 讀</text>
    <rect x="20" y="80" width="96" height="52" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="68" y="103" fill="#e6e6e6" font-size="9" text-anchor="middle">應用程式</text><text x="68" y="118" fill="#9aa4b2" font-size="7.4" text-anchor="middle">寫走 master、讀走 replica</text>
    <rect x="200" y="78" width="120" height="56" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="2"/><text x="260" y="100" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">Master</text><text x="260" y="116" fill="#e6e6e6" font-size="8" text-anchor="middle">讀寫・單一寫入點</text><text x="260" y="128" fill="#9aa4b2" font-size="7" text-anchor="middle">只有一個</text>
    <line x1="116" y1="98" x2="198" y2="98" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#rp)"/><text x="157" y="91" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">寫</text>
    <rect x="420" y="34" width="140" height="46" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="490" y="54" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Replica 1</text><text x="490" y="69" fill="#9aa4b2" font-size="7.4" text-anchor="middle">只讀</text>
    <rect x="420" y="132" width="140" height="46" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="490" y="152" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Replica 2</text><text x="490" y="167" fill="#9aa4b2" font-size="7.4" text-anchor="middle">只讀</text>
    <line x1="320" y1="98" x2="418" y2="60" stroke="#d6a45c" stroke-width="1.4" marker-end="url(#rpa)"/><line x1="320" y1="112" x2="418" y2="150" stroke="#d6a45c" stroke-width="1.4" marker-end="url(#rpa)"/><text x="372" y="94" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">非同步複製</text>
    <path d="M68 132 C 68 175, 420 175, 480 178" fill="none" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#rp)"/><text x="250" y="196" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">讀</text><text x="250" y="208" fill="#9aa4b2" font-size="7.4" text-anchor="middle">讀流量分散到各 replica → 水平擴展讀</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">Master</b> 是<b>唯一的寫入點</b>(所有寫都走它);<b style="color:#54b890">Replica</b> 可以有很多個、預設<b>只讀</b>,把讀流量攤開來擴展。而 master 把資料同步給 replica 是<b style="color:#d6a45c">非同步</b>的——它<b>不等 replica 確認就先回覆客戶端</b>。這個「非同步」換來了寫入的速度,但也埋下了下一節的那個怪現象</figcaption>
</figure>

設定起來很簡單,在 replica 上一句話就掛上去:

```bash
REPLICAOF 10.0.0.1 6379   # 叫這台當 10.0.0.1:6379 的 replica(舊名 SLAVEOF)
INFO replication          # 看 role:master/slave、connected_slaves、各自的 offset 與 lag
```

## 非同步複製的代價,與那個怪現象

「非同步」是理解主從一切怪現象的鑰匙:master 寫完**不等** replica,直接回你「成功」。這很快,但帶來兩個後果——**其一**,master 突然當掉時,那些還沒傳到 replica 的寫入**就這樣丟了**;**其二**,replica 永遠比 master 慢半拍,於是會出現這個經典場面:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 196" role="img" aria-label="複製延遲的怪現象。時間軸上,應用程式先把 x 設成 1 寫到 master,master 立刻回覆成功。應用程式緊接著從 replica 讀 x,但這時複製還沒追上,replica 上的 x 還是舊值 0,於是讀到了舊資料,這就是 read-your-writes 破功。再過一小段時間,複製追上了,replica 的 x 也變成 1。中間那段就是複製延遲窗口。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rl" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">剛寫完馬上讀 replica → 讀到舊值</text>
    <text x="40" y="52" fill="#4f6df5" font-size="8.6" text-anchor="middle" font-weight="bold">Master</text>
    <rect x="70" y="42" width="130" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="135" y="57" fill="#e6e6e6" font-size="7.8" text-anchor="middle">① 寫 x=1 → 回 OK</text>
    <text x="40" y="106" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">Replica</text>
    <rect x="70" y="96" width="150" height="22" rx="4" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="145" y="111" fill="#e05a7d" font-size="7.6" text-anchor="middle">② 讀 x → 還是舊值 0 ✗</text>
    <rect x="300" y="96" width="150" height="22" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="375" y="111" fill="#e6e6e6" font-size="7.6" text-anchor="middle">③ 複製追上 → x=1</text>
    <line x1="200" y1="53" x2="240" y2="53" stroke="#d6a45c" stroke-width="1.3" stroke-dasharray="3 2" marker-end="url(#rl)"/><path d="M240 53 C 270 60, 270 90, 245 100" fill="none" stroke="#d6a45c" stroke-width="1.3" stroke-dasharray="3 2" marker-end="url(#rl)"/><text x="285" y="76" fill="#d6a45c" font-size="7.4" text-anchor="middle">複製中…</text>
    <rect x="70" y="130" width="380" height="1" fill="#3a4154"/><line x1="220" y1="128" x2="220" y2="150" stroke="#3a4154" stroke-width="1" stroke-dasharray="2 2"/><line x1="300" y1="128" x2="300" y2="150" stroke="#3a4154" stroke-width="1" stroke-dasharray="2 2"/><text x="260" y="145" fill="#9aa4b2" font-size="7.4" text-anchor="middle">複製延遲窗口</text>
    <line x1="70" y1="160" x2="470" y2="160" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#rl)"/><text x="470" y="174" fill="#9aa4b2" font-size="8" text-anchor="end">時間 →</text>
    <text x="290" y="190" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">要「寫完立刻讀得到」→ 這種讀改走 master,或用 WAIT / 容忍舊值</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">你在 <b style="color:#4f6df5">master</b> 寫 <code>x=1</code>、拿到成功回覆,緊接著從 <b style="color:#54b890">replica</b> 讀 <code>x</code>——卻讀到<b style="color:#e05a7d">舊值</b>,因為複製還沒追上。這叫 <b>read-your-writes 破功</b>,不是 bug,是非同步複製的物理必然。解法不是消滅延遲(消不掉),而是<b>分類你的讀</b>:需要「寫完立刻讀得到」的關鍵讀走 master;能容忍稍舊的讀,才放心走 replica。這正是 <a href="/blog/ddia-reliable-scalable/">DDIA</a> 講的複製一致性層級</figcaption>
</figure>

要更強的保證,Redis 給了半套工具:`WAIT 1 100` 會讓寫入**阻塞等到至少 1 個 replica 確認**(或逾時);搭配 `min-replicas-to-write`,可以要求「沒有足夠 replica 跟上就拒絕寫入」。但這些都是拿**延遲**換**安全**,不是免費的——本質上你是在非同步的快、和同步的穩之間,自己挑一個點。

## 斷線重連不必從頭:PSYNC 部分重同步

replica 跟 master 的連線偶爾會斷一下(網路抖動)。早期版本一斷線重連就得**整包重來**——master 存一份 RDB、整個傳給 replica,大實例上非常痛。現在的 **PSYNC** 聰明多了:master 手上有一段**複製積壓緩衝(replication backlog)**,replica 記著自己複製到哪個 **offset**。重連時:

- **斷得不久**(缺的資料還在 backlog 裡)→ **部分重同步**:master 只補那一小段 offset 之後的資料。
- **斷太久 / 第一次連 / offset 對不上**(`FULLRESYNC`)→ 才乖乖來一次全量:傳整份 RDB。

所以你在 `INFO replication` 看到的那個 **`master_repl_offset`**,就是主從進度的量尺;兩邊 offset 的差距,就是即時的複製延遲。

## 反思

### 非同步複製,是 Redis「要快」的性格在複製層的延伸

Redis 選擇非同步複製(而不是等 replica 都確認才回),跟它 [[redis-persistence|持久化預設不 always fsync]]是同一種性格:**它把「快」放在「零丟失」前面**。這很符合它作為熱資料層的定位——多數場景,複製延遲幾毫秒、故障時丟掉最後幾筆寫入,是可以接受的代價,換來的是它招牌的低延遲。但這也提醒我:**一個系統的預設值,藏著它的價值觀**。用 Redis 前,得先認同它「速度優先」這個立場;如果你的資料一筆都不能丟,那要嘛用 `WAIT` 補、要嘛一開始就別把它當真相來源。工具的性格要跟你的需求對得上,勉強不來。

### 複製延遲不是 bug,是物理;工程師的活是「分類讀」

「寫完馬上讀不到」這件事,第一次遇到會以為是 Redis 壞了,其實它是**分散式的物理定律**——只要複製是非同步、只要資料要跨越距離,就一定有一個延遲窗口。想通這點後,我處理它的方式徹底變了:**不再妄想消滅延遲,而是去分類我的每一種讀**——哪些是「非得看到自己剛寫的」(下單後看訂單、改完密碼馬上登入),那就走 master;哪些「稍微舊一點無所謂」(看排行榜、逛商品列表),那就放心走 replica 擴展。這套「按一致性需求把讀分流」的思路,是 [[ddia-reliable-scalable|DDIA]] 給我最實用的一課,它適用於每一個做了讀寫分離的系統,不只 Redis。

### 主從是所有高可用系統的「原型骨架」

寫到這篇我更確定一件事:**Redis 主從的這套骨架——一份主資料 + 若干複本 + 非同步同步 + 延遲取捨——幾乎是所有複製系統的通用原型。** [[infra-kafka|Kafka 的 partition + ISR]]、Postgres 的主從、MySQL 的 binlog 複製、甚至 [[sre-consensus|etcd]] 的 Raft(只是它同步、要過半),骨架都是同一副,差別只在「同步還是非同步、要不要過半、誰能當寫入點」這幾個旋鈕。所以我從不孤立地學一個系統的複製,而是把它掛回這副共通骨架上——**看它在那幾個旋鈕上各選了什麼,就懂了它的取捨**。學透 Redis 這一組最簡單的主從,再看 Kafka、看資料庫的複製,都是同一個故事的變奏。這也是為什麼我說:看懂它,你看懂的遠不只 Redis。
