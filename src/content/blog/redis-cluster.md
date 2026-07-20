---
title: "Redis Cluster:16384 個 slot 怎麼分片與擴縮"
date: 2026-07-20
category: tech
tags:
  - redis
  - distributed-systems
series: "Redis 學習筆記"
seriesOrder: 10
comments: true
draft: false
---
[[redis-single-thread|單執行緒]]那篇說過,一台 Redis 的瓶頸是記憶體與網路。當一台裝不下、或流量頂到單機上限,就要把資料**分片(sharding)**到多台——這就是 **Redis Cluster**。但它的分片方式很有個性:不用一致性雜湊,而是把整個 key 空間切成**固定的 16384 個 hash slot**。這個看似古怪的數字,其實是它擴縮容能又快又乾淨的關鍵。

## key 落哪台:CRC16 → 16384 slot → node

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 230" role="img" aria-label="Redis Cluster 的分片模型。一把 key user:1000 先算 CRC16 再對 16384 取餘數,得到 slot 5798。整個 16384 個 slot 被分給三個 master 節點:Node A 負責 0 到 5460、Node B 負責 5461 到 10922、Node C 負責 10923 到 16383。slot 5798 落在 B 的範圍,所以這把 key 由 Node B 保管。下方重點:16384 個固定 slot 是中間層,node 只是認領一段 slot,所以搬資料就是搬 slot,擴縮容乾淨可控。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rc" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">key 落哪台:CRC16 → 16384 slot → node</text>
    <rect x="30" y="36" width="150" height="30" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="105" y="55" fill="#e6e6e6" font-size="9" text-anchor="middle">key:「user:1000」</text>
    <line x1="180" y1="51" x2="214" y2="51" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#rc)"/>
    <rect x="216" y="34" width="180" height="34" rx="6" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.4"/><text x="306" y="49" fill="#9b6ff0" font-size="8.6" text-anchor="middle" font-weight="bold">CRC16(key) % 16384</text><text x="306" y="62" fill="#9aa4b2" font-size="7.6" text-anchor="middle">= slot 5798</text>
    <line x1="306" y1="68" x2="306" y2="92" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#rc)"/>
    <rect x="24" y="98" width="168" height="60" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="108" y="118" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">Node A</text><text x="108" y="134" fill="#9aa4b2" font-size="8" text-anchor="middle">slot 0 – 5460</text><text x="108" y="149" fill="#9aa4b2" font-size="7.4" text-anchor="middle">(+ 一個 replica)</text>
    <rect x="206" y="98" width="168" height="60" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="2"/><text x="290" y="118" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">Node B ✓</text><text x="290" y="134" fill="#e6e6e6" font-size="8" text-anchor="middle">slot 5461 – 10922</text><text x="290" y="149" fill="#54b890" font-size="7.6" text-anchor="middle">5798 在這 → 由 B 保管</text>
    <rect x="388" y="98" width="168" height="60" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="472" y="118" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">Node C</text><text x="472" y="134" fill="#9aa4b2" font-size="8" text-anchor="middle">slot 10923 – 16383</text><text x="472" y="149" fill="#9aa4b2" font-size="7.4" text-anchor="middle">(+ 一個 replica)</text>
    <line x1="290" y1="92" x2="290" y2="96" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rc)"/>
    <text x="290" y="184" fill="#9aa4b2" font-size="8" text-anchor="middle">16384 個固定 slot 是「中間層」,node 只是認領一段 slot</text>
    <text x="290" y="202" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">所以搬資料 = 搬 slot;擴縮容乾淨可控,不必重算全部 key 的位置</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">找一把 key 的家分三步:<b>CRC16(key) % 16384</b> 算出 slot 編號,再看哪個 node <b>認領</b>了這個 slot。這裡的巧思是那層<b style="color:#9b6ff0">固定的 16384 個 slot</b>——key 對應到 slot 是永遠不變的,會變的只是「哪個 node 認領哪些 slot」。所以擴縮容時,你搬的是<b>整段 slot(連同裡面的 key)</b>,而不是像一致性雜湊那樣重算一堆 key 的落點。這跟 <a href="/blog/infra-kafka/">Kafka 的 partition</a> 是同一種「固定分片單位」的智慧</figcaption>
</figure>

要自己驗證很簡單:`CLUSTER KEYSLOT user:1000` 就會回傳那把 key 的 slot 編號。**key→slot 是純函數、永遠不變;slot→node 才是會隨叢集變動的那一半。**

## 客戶端不會迷路:MOVED 與 ASK

分片之後,客戶端怎麼知道該連哪台?答案是**節點會糾正你**。你隨便打一台,如果那把 key 的 slot 不歸它管,它不會幫你轉發,而是回一個 **`MOVED <slot> <正確節點>`**——聰明的客戶端收到後,會**把整張 slot→node 對照表快取起來**,之後直接打對的節點,不再繞路。

有個特別的變體在**擴縮容遷移中**出現:某個 slot 正在從舊節點搬去新節點,這時對「已經搬走的 key」,舊節點回的是 **`ASK`**(暫時性、只導這一次),而不是 `MOVED`(永久性、更新對照表)。這個 `MOVED` / `ASK` 的分工,正好對應下面擴縮容那張圖。

## 一個限制:multi-key 操作與 hash tag

分片帶來一個逃不掉的限制:**跨 slot 的 multi-key 操作不允許**。`MGET a b c`、`MULTI` 事務、Lua 腳本裡碰多把 key——只要這些 key 落在不同 slot(多半在不同 node),Redis 直接回錯,因為它不做跨節點的協調。

解法是 **hash tag**:在 key 裡用大括號 `{}` 圈一段,Redis 就**只拿大括號裡的內容去算 slot**。把相關的 key 綁同一個 tag,它們就保證落在同一個 slot、同一台:

```bash
# user:1000 的多把 key,用 {1000} 綁到同一個 slot
SET {user:1000}:profile "..."
SET {user:1000}:cart    "..."
MGET {user:1000}:profile {user:1000}:cart   # ✓ 同 slot,multi-key 可用
```

**要對一組 key 做原子操作,就在設計 key 時先用 hash tag 把它們綁在一起**——這是 Cluster 下寫程式最該內化的一條習慣。

## 各種操作:建叢集、擴容、縮容

重頭戲。Cluster 的日常維運幾乎都靠 `redis-cli --cluster` 這組工具:

```bash
# 建叢集:6 個節點,每個 master 配 1 個 replica(→ 3 主 3 從)
redis-cli --cluster create \
  10.0.0.1:6379 10.0.0.2:6379 10.0.0.3:6379 \
  10.0.0.4:6379 10.0.0.5:6379 10.0.0.6:6379 \
  --cluster-replicas 1

# 檢視(-c 讓 redis-cli 自動跟隨 MOVED/ASK 重定向)
redis-cli -c -p 6379 CLUSTER INFO       # 叢集狀態,看 cluster_state:ok
redis-cli -c -p 6379 CLUSTER NODES      # 每個節點的 id、角色(master/replica)、負責的 slot
redis-cli -c -p 6379 CLUSTER SLOTS      # slot 範圍 → node 對照
redis-cli -c CLUSTER KEYSLOT user:1000  # 某 key 落在哪個 slot

# 擴容:加一台 → 把一部分 slot(連同 key)搬過去
redis-cli --cluster add-node 10.0.0.7:6379 10.0.0.1:6379   # 先加入(預設 master、0 個 slot)
redis-cli --cluster reshard  10.0.0.1:6379                 # 互動式:搬幾個 slot、從誰搬、給誰
redis-cli --cluster rebalance 10.0.0.1:6379               # 或自動把 slot 攤平到所有 master

# 縮容:先把 slot 全搬走,再踢節點(直接 del 有 slot 的節點會出事)
redis-cli --cluster reshard 10.0.0.1:6379 --cluster-from <退休node-id> --cluster-to <其他node-id> --cluster-slots 16384 --cluster-yes
redis-cli --cluster del-node 10.0.0.1:6379 <退休node-id>

# 健檢
redis-cli --cluster check 10.0.0.1:6379   # 檢查 slot 有沒有涵蓋滿、有沒有不一致
```

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 216" role="img" aria-label="Redis Cluster 的擴容就是搬 slot。原本三個 master A、B、C 各自負責一段 slot。加入一台新的 Node D 之後,執行 reshard,從 A、B、C 各撥一部分 slot 連同裡面的 key 搬到 D。搬遷過程中,舊節點對已經搬走的 key 回覆 ASK,把該次請求臨時導向 D;搬完後對照表更新,之後改回 MOVED。下方重點:因為分片單位是固定的 slot,擴縮容只是搬 slot,搬到哪、搬多少都精準可控。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rc2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#d6a45c"/></marker></defs>
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">擴容 = 搬 slot:加一台 D,從 A/B/C 各撥一段過去</text>
    <rect x="26" y="40" width="120" height="46" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="86" y="60" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Node A</text><text x="86" y="75" fill="#9aa4b2" font-size="7.4" text-anchor="middle">0 – 5460</text>
    <rect x="156" y="40" width="120" height="46" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="216" y="60" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Node B</text><text x="216" y="75" fill="#9aa4b2" font-size="7.4" text-anchor="middle">5461 – 10922</text>
    <rect x="286" y="40" width="120" height="46" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="346" y="60" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Node C</text><text x="346" y="75" fill="#9aa4b2" font-size="7.4" text-anchor="middle">10923 – 16383</text>
    <rect x="430" y="40" width="124" height="46" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="2" stroke-dasharray="5 3"/><text x="492" y="60" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">Node D(新)</text><text x="492" y="75" fill="#9aa4b2" font-size="7.4" text-anchor="middle">認領搬來的 slot</text>
    <path d="M86 86 C 120 120, 400 120, 452 88" fill="none" stroke="#d6a45c" stroke-width="1.3" marker-end="url(#rc2)"/>
    <path d="M216 88 C 280 118, 410 116, 456 88" fill="none" stroke="#d6a45c" stroke-width="1.3" marker-end="url(#rc2)"/>
    <path d="M346 88 C 380 108, 430 104, 460 88" fill="none" stroke="#d6a45c" stroke-width="1.3" marker-end="url(#rc2)"/>
    <text x="290" y="140" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">reshard:各撥一段 slot(連同裡面的 key)搬到 D</text>
    <rect x="70" y="156" width="440" height="44" rx="8" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="174" fill="#9aa4b2" font-size="8" text-anchor="middle">搬遷中:舊節點對已搬走的 key 回 <tspan fill="#e0733a" font-weight="bold">ASK &lt;D&gt;</tspan>(臨時導這一次)</text>
    <text x="290" y="190" fill="#9aa4b2" font-size="8" text-anchor="middle">搬完:對照表更新,之後改回永久的 <tspan fill="#e6e6e6" font-weight="bold">MOVED</tspan></text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">擴容的本質就是<b style="color:#d6a45c">搬 slot</b>:加一台 <b style="color:#4f6df5">Node D</b>,再 <code>reshard</code> 從既有節點各撥一段 slot(連同裡面的 key)給它。因為分片單位是<b>固定的 slot</b>,你能精準決定「搬多少、從誰搬、給誰」;縮容則相反——先把要退休節點的 slot 全 <code>reshard</code> 走,再 <code>del-node</code>。搬遷過程中那把正在搬的 key,舊節點用 <b style="color:#e0733a">ASK</b> 把請求臨時導去新家,搬完才改回 <b>MOVED</b>,全程不中斷服務</figcaption>
</figure>

## gossip 與故障轉移

節點之間怎麼知道彼此的狀態?靠 **gossip 協定**——每個節點透過 cluster bus 不斷跟其他節點交換「誰活著、誰負責哪些 slot」,不需要一個中央協調者。當**過半的 master** 都認為某個 master 掛了(客觀下線),它的 **replica 就會升上來**接手那段 slot——這又是 [[sre-consensus|過半數決]]在真實系統裡的現身。所以 Cluster 的 master 數量建議是奇數、且每個 master 都要有 replica,否則一個 master 連同它的 slot 一起消失,整個叢集會因為「有 slot 沒人管」而拒絕服務。

## 反思

### 16384 個固定 slot,是「加一層間接」的經典勝利

第一次看到「16384 個 slot」我覺得很莫名——為什麼不直接把 key 雜湊到節點就好?想通之後非常佩服:**它在 key 和 node 之間插了一層固定的 slot**,而這一層間接,換來了整個擴縮容的乾淨。key→slot 永遠不變,擴縮容只動 slot→node 的歸屬,你能精準地說「把這 1000 個 slot 從 A 搬到 D」,而不是像一致性雜湊那樣「加一個節點,一堆 key 的落點被連帶重算」。這印證了那句電腦科學的老話——**「任何問題都可以用加一層間接來解決」**。slot 就是那層間接,它讓「分片」這件本來很亂的事,變成「搬整齊的箱子」。我後來設計任何要分片、要重新平衡的系統,都會先想:**我的『slot』該是什麼?** 找到那個固定的中間單位,擴縮容的難題就解一半。

### 分散式的便利,總在邊界處收費

Cluster 給你水平擴展,但它在 multi-key 這個邊界上明碼標價:跨 slot 不能一起操作。這讓我想起一條反覆出現的規律——**分散式系統的能力,幾乎都在某個邊界處對你收費**。單機 Redis 你可以隨意 `MULTI` 一堆 key,上了 Cluster 就得先用 hash tag 把相關 key 綁在一起、否則免談。這不是 Redis 的缺陷,是分片的本質:資料被切開放在不同機器,「一起操作」就一定有代價。所以我現在上任何分散式方案前,都會先問一句:**它把便利收在哪個邊界?**——是 multi-key、是跨分片交易、還是跨區延遲?看清楚那道收費站,才不會上線後才被帳單嚇到。

### 先確認你真的需要 Cluster

最後照例潑冷水。Cluster 很強,但它把很多東西變複雜了:multi-key 限制、客戶端要支援重定向、維運多了 slot 遷移這門功課。**很多以為需要 Cluster 的場景,其實一組 [[redis-single-thread|夠大的單機]] + replica 就解決了**——單機 Redis 一秒扛十萬級請求、幾十 GB 記憶體都很平常。真正需要 Cluster,是當你的**資料量大到單機記憶體裝不下**,或**寫入 throughput 高到單核吃不消**——這兩個是硬邊界,到了才上。在那之前,加記憶體、加 replica 分讀、優化大 key,通常更划算。**先確認痛點是「一台真的不夠」,再走進分片這座山**——這條原則,我在 Redis 上跟在別的重武器上,是一模一樣的。
