---
title: "Redis 的靈魂:五大資料結構 + 進階武器"
date: 2026-07-15
category: tech
description: "上一篇說 Redis 的本質是資料結構伺服器,這篇就把工具箱打開。五個核心結構——String、List、Hash、Set、Sorted Set——各自對應一類問題:選對結構,問題就解一半;選錯,你會用一堆 GET/SET 硬幹本來一行命令的事。再加上四件進階武器 Bitmap、HyperLogLog、Geo、Stream,它們的共通點是『用一點精度或限制,換巨大的空間或速度』。"
tags:
  - redis
  - data-structures
series: "Redis 學習筆記"
seriesOrder: 2
comments: true
draft: false
---
[[redis-intro|上一篇]]說 Redis 的靈魂是「資料結構」——那這篇就把工具箱打開。Redis 用得好不好,九成看你會不會**選對結構**:選對了,一個排行榜三行命令搞定;選錯了,你會用一堆 `GET`/`SET` 在應用端硬幹本來伺服器一行就能做的事。先看五個核心結構,以及它們各自的招牌用途:

## 五大核心結構

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 264" role="img" aria-label="Redis 五大核心資料結構速查。String 是位元組或數字,用於快取、計數器 INCR、分散式鎖 SETNX。List 有序可兩端進出,用於佇列 LPUSH RPOP、最新 N 筆。Hash 是 field 到 value 的 map,用於存物件、只改一個欄位免整包搬。Set 無序自動去重,用於去重、標籤、交集共同好友 SINTER。Sorted Set 每個成員帶 score 自動排序,用於排行榜、範圍查詢、延遲佇列 score 等於時間。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">五大核心結構:選對一個,問題解一半</text>
    <rect x="14" y="32" width="552" height="40" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="28" y="52" fill="#4f6df5" font-size="10.5" text-anchor="start" font-weight="bold">String</text><text x="28" y="66" fill="#9aa4b2" font-size="7.6" text-anchor="start">bytes / 數字</text>
    <rect x="150" y="42" width="42" height="20" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="171" y="56" fill="#e6e6e6" font-size="8.4" text-anchor="middle">42</text>
    <text x="240" y="56" fill="#e6e6e6" font-size="8.6" text-anchor="start">快取 · 計數器(INCR)· 分散式鎖(SET NX)</text>
    <rect x="14" y="76" width="552" height="40" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="28" y="96" fill="#54b890" font-size="10.5" text-anchor="start" font-weight="bold">List</text><text x="28" y="110" fill="#9aa4b2" font-size="7.6" text-anchor="start">有序,兩端進出</text>
    <rect x="150" y="86" width="24" height="20" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><rect x="176" y="86" width="24" height="20" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><rect x="202" y="86" width="24" height="20" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/>
    <text x="240" y="100" fill="#e6e6e6" font-size="8.6" text-anchor="start">佇列(LPUSH / RPOP)· 最新 N 筆(LPUSH+LTRIM)</text>
    <rect x="14" y="120" width="552" height="40" rx="6" fill="#2b2540" stroke="#9b6ff0" stroke-width="1.2"/>
    <text x="28" y="140" fill="#9b6ff0" font-size="10.5" text-anchor="start" font-weight="bold">Hash</text><text x="28" y="154" fill="#9aa4b2" font-size="7.6" text-anchor="start">field → value</text>
    <rect x="150" y="128" width="66" height="24" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="158" y="139" fill="#9aa4b2" font-size="7" text-anchor="start">name: Aidan</text><text x="158" y="149" fill="#9aa4b2" font-size="7" text-anchor="start">age: 30</text>
    <text x="240" y="144" fill="#e6e6e6" font-size="8.6" text-anchor="start">存物件 · 只改一個欄位,免整包搬進搬出</text>
    <rect x="14" y="164" width="552" height="40" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="28" y="184" fill="#d6a45c" font-size="10.5" text-anchor="start" font-weight="bold">Set</text><text x="28" y="198" fill="#9aa4b2" font-size="7.6" text-anchor="start">無序、自動去重</text>
    <rect x="150" y="174" width="22" height="20" rx="10" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><rect x="176" y="174" width="22" height="20" rx="10" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><rect x="202" y="174" width="22" height="20" rx="10" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/>
    <text x="240" y="188" fill="#e6e6e6" font-size="8.6" text-anchor="start">去重 · 標籤 · 交集(共同好友 SINTER)</text>
    <rect x="14" y="208" width="552" height="46" rx="6" fill="#3a2632" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="28" y="228" fill="#e05a7d" font-size="10.5" text-anchor="start" font-weight="bold">Sorted Set</text><text x="28" y="242" fill="#9aa4b2" font-size="7.6" text-anchor="start">成員帶 score、自動排序</text>
    <rect x="150" y="220" width="26" height="20" rx="3" fill="#1f2330" stroke="#e05a7d" stroke-width="1"/><text x="163" y="234" fill="#e6e6e6" font-size="7.4" text-anchor="middle">a:1</text><rect x="178" y="220" width="26" height="20" rx="3" fill="#1f2330" stroke="#e05a7d" stroke-width="1"/><text x="191" y="234" fill="#e6e6e6" font-size="7.4" text-anchor="middle">b:2</text><rect x="206" y="220" width="26" height="20" rx="3" fill="#1f2330" stroke="#e05a7d" stroke-width="1"/><text x="219" y="234" fill="#e6e6e6" font-size="7.4" text-anchor="middle">c:3</text>
    <text x="240" y="234" fill="#e6e6e6" font-size="8.6" text-anchor="start">排行榜 · 範圍查詢 · 延遲佇列(score=時間)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">五個結構就是五類問題的答案:要<b>計數</b>用 String(<code>INCR</code> 原子加一);要<b>先進先出</b>用 List;要存<b>物件的欄位</b>用 Hash;要<b>去重或算交集</b>用 Set;要<b>排序、排名、範圍</b>用 Sorted Set。選結構的訣竅,是先問「我要對這份資料做什麼<b>操作</b>」——結構的本質,就是把你最常做的那個操作變成 O(1) 或 O(log N)</figcaption>
</figure>

這裡面最該花時間認識的是 **Sorted Set(ZSet)**,它是 Redis 的皇冠上的寶石:每個成員都綁一個 score,Redis 幫你**永遠維持排序**。這一個特性就長出好幾種殺手級用法——排行榜(`ZADD` 記分、`ZREVRANGE` 取榜)是最直覺的;但把 **score 設成時間戳**,它立刻變成一個**延遲佇列**(`ZRANGEBYSCORE` 撈出「到期該處理」的任務);把 score 設成分頁游標,又能做穩定的範圍分頁。同一個結構,換個 score 的語意,就是完全不同的武器。

## 四件進階武器

核心五種之外,Redis 還有幾個為特定問題量身打造的進階結構,它們的共通哲學是——**用一點精度或限制,換巨大的空間或速度**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 190" role="img" aria-label="Redis 四件進階武器。Bitmap 每人一個 bit,用於簽到、活躍使用者統計,省空間到一億人約 12MB。HyperLogLog 近似基數統計 count distinct,固定 12KB 估上億 UV、誤差約 0.81%。Geo 地理座標底層是 Sorted Set,用於附近的人、範圍搜尋。Stream 可持久化的 append log 加 consumer group,像輕量 Kafka,第 12 篇深入。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">四件進階武器:用一點精度/限制,換空間或速度</text>
    <rect x="24" y="34" width="532" height="32" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="40" y="54" fill="#4f6df5" font-size="9.4" text-anchor="start" font-weight="bold">Bitmap</text><text x="150" y="54" fill="#e6e6e6" font-size="8.2" text-anchor="start">每人一個 bit → 簽到、活躍統計</text><text x="540" y="54" fill="#9aa4b2" font-size="8" text-anchor="end">省空間:1 億人 ≈ 12MB</text>
    <rect x="24" y="72" width="532" height="32" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="40" y="92" fill="#54b890" font-size="9.4" text-anchor="start" font-weight="bold">HyperLogLog</text><text x="150" y="92" fill="#e6e6e6" font-size="8.2" text-anchor="start">近似基數(count distinct)</text><text x="540" y="92" fill="#9aa4b2" font-size="8" text-anchor="end">固定 12KB 估上億 UV,誤差 ~0.81%</text>
    <rect x="24" y="110" width="532" height="32" rx="6" fill="#2b2540" stroke="#9b6ff0" stroke-width="1.3"/><text x="40" y="130" fill="#9b6ff0" font-size="9.4" text-anchor="start" font-weight="bold">Geo</text><text x="150" y="130" fill="#e6e6e6" font-size="8.2" text-anchor="start">地理座標(底層是 Sorted Set)</text><text x="540" y="130" fill="#9aa4b2" font-size="8" text-anchor="end">附近的人、範圍搜尋</text>
    <rect x="24" y="148" width="532" height="32" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.3"/><text x="40" y="168" fill="#d6a45c" font-size="9.4" text-anchor="start" font-weight="bold">Stream</text><text x="150" y="168" fill="#e6e6e6" font-size="8.2" text-anchor="start">持久化 log + consumer group</text><text x="540" y="168" fill="#9aa4b2" font-size="8" text-anchor="end">像輕量 Kafka(第 12 篇深入)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">Bitmap</b> 用一個個 bit 表達布林狀態,省空間到極致;<b style="color:#54b890">HyperLogLog</b> 犧牲一點準度(誤差不到 1%),就能用固定 12KB 算出上億的不重複數;<b style="color:#9b6ff0">Geo</b> 其實是 Sorted Set 的包裝(把經緯度編碼成 score);<b style="color:#d6a45c">Stream</b> 則是持久化的訊息流,像一個內建在 Redis 裡的輕量 Kafka。它們都在示範同一種取捨:放棄一點「什麼都精確、什麼都能做」,換來對某個特定問題壓倒性的效率</figcaption>
</figure>

其中 **HyperLogLog** 最能體現這種哲學:算「不重複的訪客數(UV)」如果用 Set 存每一個 user id,一億個訪客就要吃掉好幾 GB;HLL 用機率演算法,固定只花 **12KB**,就能估出上億的基數,誤差不到 1%。對「大概幾百萬 UV」這種**不需要絕對精確**的統計,這是壓倒性的划算——這也是工程判斷的一個縮影:**先問「這真的需要精確嗎」,常常不需要,而不需要的地方,就有巨大的優化空間。**

## 選結構的心法:先看操作,再選結構

貫穿這一切的心法只有一句:**別從「我要存什麼」出發,要從「我要對它做什麼操作」出發。** 同一份「使用者分數」,如果你只是要存起來讀回,String/Hash 就夠;但只要出現「排名」「取前十」「某分數區間」這種**操作**,答案立刻變成 Sorted Set。結構選對,那個操作就是 O(log N) 的一行命令;選錯,就是把整包資料撈回應用端、自己排序的一場災難。Redis 逼你重新重視一件學校教過、但工作後常忘記的事——**資料結構的選擇,本身就是效能設計**。

## 反思

### 選對資料結構,是 Redis 用得好不好的分水嶺

我帶新人時,最愛看的一個指標,就是他用 Redis 只會不會 `GET`/`SET`。只會這兩招的,通常把 Redis 當「快一點的 KV」,遇到排行榜就撈回來排、遇到去重就自己用一個 array 檢查;會用 ZSet、Set、Hash 的,同樣的需求程式碼少一半、又快又原子。這個差距不在「熟不熟 Redis 指令」,而在**有沒有『用資料結構思考』的習慣**——看到需求,先在腦中問「這對應到哪個結構」。這也是為什麼我覺得 Redis 對後端是很好的訓練:它把抽象的資料結構課,變成你每天都會用到、且立刻有效能回饋的實戰。

### 進階結構教我的:先問「這真的需要精確嗎」

HyperLogLog 對我是個觀念衝擊。以前我預設「統計就是要準」,直到看懂用 12KB 估上億 UV、誤差不到 1% 這件事——對一個放在 dashboard 上、給人看趨勢的 UV 數字,99% 準跟 100% 準有差嗎?沒有,但成本差了好幾個數量級。從那之後,我在做任何統計、任何查詢前都會多問一句:**「這個結果,需要多精確?」** 很多時候答案是「差不多就好」,而「差不多就好」的地方,往往藏著最大的優化空間。用一點點精度換巨大的資源節省,是工程上極划算、卻常被忽略的一手。

### Redis 讓資料結構這門課「活」了過來

大學的資料結構課,對很多人是背複雜度、考完就還給老師的東西。但 Redis 把它變成活的:你每選一次結構,都在真實地決定系統的效能與行為;`ZADD` 是 O(log N)、`SINTER` 的成本取決於最小集合、對大 List 做 `LINDEX` 是 O(N)——這些不再是考卷上的符號,而是「會不會拖垮線上服務」的實際後果。我甚至覺得,想快速幫一個工程師打好資料結構的底,讓他認真用一輪 Redis,比刷題還有效——因為它把「選錯結構的代價」直接擺在你眼前,而痛過的東西,才記得住。
