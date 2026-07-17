---
title: "快取三大災難:穿透、擊穿、雪崩,與正確解法"
date: 2026-07-17
category: tech
description: "把 Redis 當快取,最經典的模式是 cache-aside,但它有三個著名破口:穿透(查根本不存在的 key,cache 永遠擋不住)、擊穿(單一熱 key 剛好過期,並發全湧向 DB)、雪崩(大量 key 同時過期,DB 大範圍被打爆)。三個名字很像、常被搞混,但其實是三種不同的失敗——穿透是查不存在、擊穿是一個熱點、雪崩是一大片。這篇把三者的差別講清楚,並對症下藥:空值快取加布隆過濾器、互斥鎖重建、隨機 TTL 打散。"
tags:
  - redis
  - cache
series: "Redis 學習筆記"
seriesOrder: 6
comments: true
draft: false
---
把 Redis 當快取,最經典的模式是 **cache-aside(旁路快取)**:讀取先查 cache,命中就回傳、沒命中(miss)才查資料庫,再把結果回填進 cache。平常運作得很好——直到某些情況下,**大量請求繞過 cache、直接打爆後面的資料庫**。這類破口有三個著名的名字:**穿透、擊穿、雪崩**。它們念起來很像、常被搞混,但其實是三種不同的失敗,各有各的解法。

## 三兄弟長不一樣:穿透 / 擊穿 / 雪崩

先把三者的**差別**講清楚——搞懂它們「破在哪」,解法就不會亂套:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 210" role="img" aria-label="快取三大災難的對比。穿透是查根本不存在的 key,cache 和資料庫都沒有,cache 擋不住所以每次都直達資料庫。擊穿是單一熱門 key 剛好過期,瞬間大量並發同時 miss 全湧向資料庫重建。雪崩是大量 key 在同一時間一起過期,大範圍 miss 把資料庫打崩引發連鎖。三者共通點都是請求繞過 cache 打爆資料庫,差別在破口:不存在的 key、一個熱點、一大片。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">三種破口,長得不一樣</text>
    <rect x="10" y="32" width="182" height="130" rx="8" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.4"/>
    <text x="101" y="52" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">穿透 Penetration</text>
    <rect x="30" y="62" width="142" height="24" rx="4" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="101" y="78" fill="#e6e6e6" font-size="8" text-anchor="middle">查「不存在」的 key</text>
    <text x="101" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">cache 沒有、DB 也沒有</text>
    <text x="101" y="122" fill="#9aa4b2" font-size="8" text-anchor="middle">→ cache 永遠擋不住</text>
    <text x="101" y="146" fill="#e0733a" font-size="8.6" text-anchor="middle" font-weight="bold">每次都直達 DB</text>
    <rect x="199" y="32" width="182" height="130" rx="8" fill="#3a3320" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="290" y="52" fill="#d6a45c" font-size="10" text-anchor="middle" font-weight="bold">擊穿 Breakdown</text>
    <rect x="219" y="62" width="142" height="24" rx="4" fill="#1f2330" stroke="#d6a45c" stroke-width="1"/><text x="290" y="78" fill="#e6e6e6" font-size="8" text-anchor="middle">單一熱 key ⏰ 剛過期</text>
    <text x="290" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">瞬間大量並發同時 miss</text>
    <text x="290" y="122" fill="#9aa4b2" font-size="8" text-anchor="middle">→ 全湧向 DB 重建</text>
    <text x="290" y="146" fill="#d6a45c" font-size="8.6" text-anchor="middle" font-weight="bold">集中打一個點</text>
    <rect x="388" y="32" width="182" height="130" rx="8" fill="#3a2632" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="479" y="52" fill="#e05a7d" font-size="10" text-anchor="middle" font-weight="bold">雪崩 Avalanche</text>
    <rect x="408" y="62" width="142" height="24" rx="4" fill="#1f2330" stroke="#e05a7d" stroke-width="1"/><text x="479" y="78" fill="#e6e6e6" font-size="8" text-anchor="middle">大量 key ⏰ 同時過期</text>
    <text x="479" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">(或 Redis 整個掛掉)</text>
    <text x="479" y="122" fill="#9aa4b2" font-size="8" text-anchor="middle">→ 大範圍 miss</text>
    <text x="479" y="146" fill="#e05a7d" font-size="8.6" text-anchor="middle" font-weight="bold">DB 崩 → 連鎖</text>
    <text x="290" y="184" fill="#9aa4b2" font-size="8.4" text-anchor="middle">共通:請求繞過 cache 打爆 DB;差別在破口——</text>
    <text x="290" y="200" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">不存在的 key(穿透)· 一個熱點(擊穿)· 一大片(雪崩)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一句話記住差別:<b style="color:#e0733a">穿透</b>是查「<b>不存在</b>」的資料,cache 和 DB 都沒有,所以每一次都會打到 DB;<b style="color:#d6a45c">擊穿</b>是「<b>一個</b>熱門 key」剛好過期的瞬間,大量並發同時撲空、集中打向那一個點;<b style="color:#e05a7d">雪崩</b>是「<b>一大片</b> key」同時失效(常因為都設一樣的 TTL,或 Redis 整台掛掉),造成大範圍崩塌。搞清楚是「不存在 / 一個熱點 / 一大片」,才知道該用哪種解法</figcaption>
</figure>

## 對症下藥:三種破口,三種補法

差別搞懂了,解法就很自然——每一種破口,都對應一種「讓失敗別集中」的手法:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 206" role="img" aria-label="三大災難的對應解法。穿透的解法是空值也快取,查不到時把空結果也寫進 cache 短 TTL 擋住,再加布隆過濾器前置攔截一定不存在的 key。擊穿的解法是互斥鎖,只放一個請求去重建資料庫,其他請求等它回填。雪崩的解法是 TTL 加隨機抖動打散過期時間,再加高可用與降級,別讓 Redis 單點全掛。共通精神是別讓失敗集中:擋住、收斂、打散。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="cp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">對症下藥:破口 → 補法</text>
    <rect x="16" y="34" width="96" height="34" rx="6" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.4"/><text x="64" y="55" fill="#e0733a" font-size="9.4" text-anchor="middle" font-weight="bold">穿透</text>
    <line x1="112" y1="51" x2="134" y2="51" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cp)"/>
    <rect x="136" y="34" width="428" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="350" y="49" fill="#e6e6e6" font-size="8.4" text-anchor="middle">空值也快取(查不到也寫進 cache、短 TTL 擋住)</text><text x="350" y="62" fill="#9aa4b2" font-size="8" text-anchor="middle">+ 布隆過濾器:前置攔截「一定不存在」的 key</text>
    <rect x="16" y="86" width="96" height="34" rx="6" fill="#3a3320" stroke="#d6a45c" stroke-width="1.4"/><text x="64" y="107" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">擊穿</text>
    <line x1="112" y1="103" x2="134" y2="103" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cp)"/>
    <rect x="136" y="86" width="428" height="34" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="350" y="101" fill="#e6e6e6" font-size="8.4" text-anchor="middle">互斥鎖:只放「一個」請求去重建 DB,其餘等它回填</text><text x="350" y="114" fill="#9aa4b2" font-size="8" text-anchor="middle">(或熱 key 邏輯過期 + 背景刷新,不設實體 TTL)</text>
    <rect x="16" y="138" width="96" height="34" rx="6" fill="#3a2632" stroke="#e05a7d" stroke-width="1.4"/><text x="64" y="159" fill="#e05a7d" font-size="9.4" text-anchor="middle" font-weight="bold">雪崩</text>
    <line x1="112" y1="155" x2="134" y2="155" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cp)"/>
    <rect x="136" y="138" width="428" height="34" rx="6" fill="#2b2540" stroke="#9b6ff0" stroke-width="1.2"/><text x="350" y="153" fill="#e6e6e6" font-size="8.4" text-anchor="middle">TTL 加隨機抖動(jitter)打散過期時間</text><text x="350" y="166" fill="#9aa4b2" font-size="8" text-anchor="middle">+ 高可用 / 降級:別讓 Redis 單點全掛</text>
    <text x="290" y="194" fill="#d6a45c" font-size="8.6" text-anchor="middle" font-weight="bold">共通精神:別讓失敗集中 —— 擋住 · 收斂 · 打散</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e0733a">穿透</b>用「<b>空值也快取</b>」把不存在的查詢也擋在 cache(配短 TTL 避免髒資料),更嚴謹再加<b>布隆過濾器</b>在最前面攔掉一定不存在的 key;<b style="color:#d6a45c">擊穿</b>用<b>互斥鎖</b>,讓熱 key 過期時只有一個請求去重建、其餘乖乖等,避免萬箭齊發;<b style="color:#e05a7d">雪崩</b>用<b>隨機 TTL</b> 把過期時間錯開,別讓大家在同一秒到期——這招跟 <a href="/blog/sre-cron/">可靠 cron</a> 對付午夜驚群的 jitter,是同一個道理</figcaption>
</figure>

三種解法的手法不同,但骨子裡是同一句話:**別讓失敗集中在同一個時間、同一個點。** 空值快取是「把打不到的擋在門外」、互斥鎖是「把並發收斂成一個」、隨機 TTL 是「把同時發生的打散開」——擋住、收斂、打散,對應三種集中的破口。至於擊穿要用的互斥鎖,牽涉到「怎麼在分散式下正確地搶一把鎖」,那本身是個大題目,留到下一篇的分散式鎖細講。

## 反思

### 三個名字很像,但本質是三種不同的集中

穿透、擊穿、雪崩,我剛學時被這三個中文名搞得暈頭轉向——它們聽起來就像同一件事的三種說法。真正把它們釐清,是我意識到差別只在一個維度:**「打到 DB 的請求,為什麼集中?」** 穿透是因為查的東西根本不存在、cache 這道牆天生擋不住(空間上的漏);擊穿是因為一個熱點在過期瞬間、並發全撞上來(時間上的一個點);雪崩是因為一大片 key 剛好同時到期(時間上的一大片)。把它拆成「不存在 / 一個點 / 一大片」,名字就不再需要死背,而是能從情境自己推出來。**遇到一組容易混淆的術語,找到那個能區分它們的維度,比背定義有用一百倍。**

### 這些解法的共通精神:消除「同步性」

寫這篇最大的收穫,是發現三種解法其實在解同一個更深的問題——**同步性(synchronization)是災難的放大器**。一萬個請求如果錯開,DB 輕鬆消化;但如果它們**同時**發生(同時過期、同時撲向一個熱點),就會瞬間壓垮系統。所以隨機 TTL 的 jitter、互斥鎖的收斂,本質都是在**打破這種致命的同步**。這個模式我後來到處都看得到:[[sre-cron|排程]]加抖動避免午夜驚群、重試加隨機退避(backoff)避免 retry storm、啟動時錯開暖機避免驚群——**只要看到「大量東西同時做同一件事」,就要警覺它可能是下一場災難的引信**。把同步的尖峰抹平成分散的緩坡,是可靠度工程裡反覆出現的一招。

### 快取的難,不在快取本身,在「miss 的那一刻」

用 Redis 當快取,大家的注意力都放在「命中時多快」,但真正會出事的,永遠是 **miss 的那一刻**——cache 沒擋住,壓力瞬間傳導到後面的資料庫。這三大災難,全部都發生在 miss 之後。所以我現在設計任何快取層,第一個想的不是「命中率多高」,而是**「當它 miss、當它整個掛掉,後面的 DB 扛得住嗎?」** 一個沒想清楚 miss 行為的快取,平常幫你擋住流量、歲月靜好,但它同時也**養大了後面 DB 承受不起的真實流量**——一旦快取失守,那些流量就會原形畢露、瞬間壓垮 DB([[sre-cascading-failures|連鎖失效]])。快取是加速器,但別忘了它也是一道你遲早要面對「失守會怎樣」的防線。
