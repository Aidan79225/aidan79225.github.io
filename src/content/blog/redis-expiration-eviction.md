---
title: "Redis 的過期與淘汰:TTL、惰性刪除與 maxmemory 政策"
date: 2026-07-16
category: tech
description: "過期(expiration)和淘汰(eviction)常被混為一談,其實是兩回事:過期是『這個 key 自己時間到了該走』,淘汰是『記憶體滿了,得請人走』。這篇講清楚 Redis 怎麼用惰性刪除 + 定期抽樣兩管齊下清過期 key(以及一個反直覺:過期不等於立刻釋放記憶體),以及 maxmemory 撞頂時的 8 種淘汰政策怎麼選——allkeys 還是 volatile、LRU 還是 LFU,選錯的代價是寫入全掛或誤刪重要資料。"
tags:
  - redis
  - cache
series: "Redis 學習筆記"
seriesOrder: 5
comments: true
draft: false
---
把 Redis 當快取,遲早會碰到兩個問題:**設了 TTL 的 key 到期後怎麼被清掉?** 以及 **記憶體滿了會怎樣?** 這兩件事常被混為一談,其實是兩回事——前者是**過期(expiration)**:「這個 key 自己時間到了、該走了」;後者是**淘汰(eviction)**:「地方不夠了,得請人走」。分清這兩者,是把 Redis 當快取用好的基礎。

## 過期:key 到期了,怎麼被清掉

你以為一個 key 的 TTL 一到,Redis 就立刻把它刪掉、釋放記憶體?**其實不是。** Redis 用兩種機制搭配著清過期 key,而它們都不保證「即時」:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 202" role="img" aria-label="Redis 清除過期 key 的兩種機制。中間是一個 TTL 已到期但還躺在記憶體裡的 key。它靠兩種方式被清掉:第一惰性刪除,有人來 GET 它時才發現過期、當場刪掉並回 nil;第二定期刪除,背景每秒抽樣約十次,從有 TTL 的 key 隨機抽一批、刪掉過期的。下方說明:所以過期不等於立刻釋放記憶體,TTL 到了但沒人碰、也還沒被抽到,它就先躺著。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ee" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">過期 key 怎麼被清:惰性 + 定期,兩管齊下</text>
    <rect x="196" y="34" width="188" height="42" rx="7" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.5"/><text x="290" y="53" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">TTL 到期的 key</text><text x="290" y="68" fill="#e6e6e6" font-size="8" text-anchor="middle">仍佔著記憶體(還沒被清)</text>
    <line x1="150" y1="112" x2="230" y2="80" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ee)"/>
    <line x1="430" y1="112" x2="350" y2="80" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ee)"/>
    <rect x="20" y="112" width="240" height="60" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="34" y="132" fill="#4f6df5" font-size="9" text-anchor="start" font-weight="bold">① 惰性刪除(被動)</text><text x="34" y="149" fill="#e6e6e6" font-size="8" text-anchor="start">有人來 GET 它 →</text><text x="34" y="163" fill="#9aa4b2" font-size="8" text-anchor="start">發現過期 → 當場刪、回 nil</text>
    <rect x="320" y="112" width="240" height="60" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="334" y="132" fill="#54b890" font-size="9" text-anchor="start" font-weight="bold">② 定期刪除(主動)</text><text x="334" y="149" fill="#e6e6e6" font-size="8" text-anchor="start">背景每秒抽樣 ~10 次 →</text><text x="334" y="163" fill="#9aa4b2" font-size="8" text-anchor="start">從有 TTL 的隨機抽一批刪</text>
    <text x="290" y="192" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">所以「過期」≠「立刻釋放」——沒人碰、也還沒被抽到,它就先躺著</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">惰性刪除</b>省 CPU(不主動掃),但過期後沒人存取的 key 會一直佔記憶體;<b style="color:#54b890">定期刪除</b>補上這個洞——背景每秒跑幾次,從「有 TTL 的 key」裡<b>隨機抽樣</b>一批來刪(過期比例高就多抽幾輪)。注意它是<b>抽樣</b>而不是掃全部,正是為了避免 O(N) 掃描<a href="/blog/redis-single-thread/">卡住單執行緒</a>。兩者搭配,在 CPU 與記憶體之間取得平衡——但代價是「過期」不是精準即時的</figcaption>
</figure>

這裡的反直覺點值得記住:**一個 key 的 TTL 到了,不代表它立刻從記憶體消失。** 如果沒人去存取它(惰性刪除沒觸發)、背景抽樣也還沒抽到它,它就會**先躺在記憶體裡**——只是你 `GET` 它會拿到 `nil`(邏輯上已過期),但實體記憶體還沒釋放。順帶一提,replica 不會自己刪過期 key,它等 master 過期後送來的 `DEL`——這是為了保證主從資料一致,由 master 當過期的權威。

## 淘汰:記憶體滿了,踢誰走

過期是 key 自己該走;**淘汰**則是另一回事——當記憶體用量撞到 `maxmemory` 上限,Redis 得**主動踢掉一些 key** 來騰出空間。踢誰?由 **eviction policy** 決定,總共 8 種(外加一個「不踢」):

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 224" role="img" aria-label="Redis 的淘汰政策矩陣。當 maxmemory 撞頂,依政策選要踢掉的 key。政策由兩個維度組成:範圍與策略。範圍 allkeys 從所有 key 挑,volatile 只從有 TTL 的 key 挑。策略有 LRU 最久沒用、LFU 最少用、random 隨機、ttl 最接近過期。組合出 allkeys-lru、allkeys-lfu、allkeys-random,以及 volatile-lru、volatile-lfu、volatile-random、volatile-ttl。allkeys 沒有 ttl 這一格。另外預設是 noeviction 不踢、寫入直接報錯。下方說明:LRU 是最久沒用、LFU 是最少用可抗掃描污染;純 cache 用 allkeys 系列,有不能丟的資料用 volatile 系列或 noeviction。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">maxmemory 撞頂,踢誰?——8 種政策</text>
    <text x="146" y="46" fill="#9aa4b2" font-size="8" text-anchor="middle" font-weight="bold">LRU</text><text x="146" y="56" fill="#9aa4b2" font-size="6.6" text-anchor="middle">最久沒用</text>
    <text x="256" y="46" fill="#9aa4b2" font-size="8" text-anchor="middle" font-weight="bold">LFU</text><text x="256" y="56" fill="#9aa4b2" font-size="6.6" text-anchor="middle">最少用</text>
    <text x="366" y="46" fill="#9aa4b2" font-size="8" text-anchor="middle" font-weight="bold">random</text><text x="366" y="56" fill="#9aa4b2" font-size="6.6" text-anchor="middle">隨機</text>
    <text x="476" y="46" fill="#9aa4b2" font-size="8" text-anchor="middle" font-weight="bold">ttl</text><text x="476" y="56" fill="#9aa4b2" font-size="6.6" text-anchor="middle">最接近過期</text>
    <text x="16" y="82" fill="#4f6df5" font-size="8.4" text-anchor="start" font-weight="bold">allkeys</text><text x="16" y="93" fill="#9aa4b2" font-size="6.6" text-anchor="start">所有 key</text>
    <rect x="100" y="66" width="92" height="26" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="146" y="83" fill="#e6e6e6" font-size="7.6" text-anchor="middle">allkeys-lru</text>
    <rect x="210" y="66" width="92" height="26" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="256" y="83" fill="#e6e6e6" font-size="7.6" text-anchor="middle">allkeys-lfu</text>
    <rect x="320" y="66" width="92" height="26" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="366" y="83" fill="#e6e6e6" font-size="7.4" text-anchor="middle">allkeys-random</text>
    <rect x="430" y="66" width="92" height="26" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="476" y="83" fill="#9aa4b2" font-size="7.6" text-anchor="middle">—(無)</text>
    <text x="16" y="112" fill="#54b890" font-size="8.4" text-anchor="start" font-weight="bold">volatile</text><text x="16" y="123" fill="#9aa4b2" font-size="6.6" text-anchor="start">只挑有 TTL 的</text>
    <rect x="100" y="98" width="92" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="146" y="115" fill="#e6e6e6" font-size="7.6" text-anchor="middle">volatile-lru</text>
    <rect x="210" y="98" width="92" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="256" y="115" fill="#e6e6e6" font-size="7.6" text-anchor="middle">volatile-lfu</text>
    <rect x="320" y="98" width="92" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="366" y="115" fill="#e6e6e6" font-size="7.4" text-anchor="middle">volatile-random</text>
    <rect x="430" y="98" width="92" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="476" y="115" fill="#e6e6e6" font-size="7.6" text-anchor="middle">volatile-ttl</text>
    <rect x="100" y="136" width="422" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="311" y="153" fill="#e6e6e6" font-size="7.8" text-anchor="middle">noeviction(預設):不踢任何 key,記憶體滿了 → 寫入直接報錯</text>
    <rect x="40" y="176" width="500" height="40" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="194" fill="#9aa4b2" font-size="7.8" text-anchor="middle">LRU=最久沒碰　·　LFU=最少被用(能抗「偶爾全掃一遍」污染 cache)</text>
    <text x="290" y="208" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-weight="bold">純 cache → allkeys-lru / lfu;有不能丟的資料 → volatile-* 或 noeviction</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">政策由兩個維度組成:<b>範圍</b>(<b style="color:#4f6df5">allkeys</b> 從所有 key 挑 / <b style="color:#54b890">volatile</b> 只挑有 TTL 的)× <b>策略</b>(LRU 最久沒碰 / LFU 最少被用 / random 隨機 / ttl 最接近過期)。<b>LFU</b> 比 LRU 更能抗「某個批次任務偶爾把冷資料全掃一遍」造成的 cache 污染。而 Redis 的 LRU/LFU 其實是<b>近似</b>的(抽樣估算,不維護完整的存取鏈)——又一次「用一點精度換記憶體」</figcaption>
</figure>

選政策的關鍵,是先問一句:**這台 Redis 是純快取,還是也存了不能丟的東西?**
- **純快取**(所有 key 丟了都能從後面資料庫重建):用 `allkeys-lru` 或 `allkeys-lfu`,讓 Redis 自由踢掉最沒用的,把記憶體留給熱資料。
- **混著存了重要資料**:用 `volatile-*`——只踢「有設 TTL 的可丟資料」,保護那些沒 TTL 的重要 key;或用 `noeviction` + 自己控管容量。
- **千萬別**在「當快取用」的場景留著預設的 `noeviction`——記憶體一滿,**所有寫入都會開始報錯**,而你可能以為 Redis 只是「舊資料被自動清掉」而已。

## 反思

### 過期 vs 淘汰:分清「自己該走」和「地方不夠請人走」

剛用 Redis 時,我一直把過期和淘汰當同一件事,結果配 `maxmemory` 時完全搞錯方向。後來想通:**過期是 key 的個人時程(TTL 到了自己該走),淘汰是系統的空間壓力(記憶體滿了得請人走)**——兩者獨立,一個沒設 TTL 的 key 永遠不會「過期」,但照樣可能被「淘汰」。這個區分看似細節,卻直接決定你怎麼設計:哪些 key 該給 TTL(讓它自然過期)、記憶體上限設多少、撞頂時該踢誰。把「時間到了」和「空間不夠」這兩種淘汰壓力分開想,很多 Redis 的容量問題就清晰了。

### 近似 LRU:又一個「用一點精度換記憶體」

Redis 的 LRU 不是「精確地踢最久沒用的那個」——維護一條完整的 LRU 鏈太耗記憶體。它改用**抽樣近似**:隨機抽幾個 key,踢掉其中最久沒用的。這又是 Redis 一貫的哲學,跟 [[redis-data-structures|HyperLogLog]] 用 12KB 估上億基數、[[redis-persistence|fork COW]] 只複製被改的頁,是同一種思路——**在「完全精確」與「省資源」之間,聰明地選擇不那麼精確**。而且它通常夠好:cache 淘汰本來就不需要「數學上最優」,近似的 LRU 對命中率的影響微乎其微,卻省下維護精確結構的大量開銷。我越來越覺得,分辨「哪裡需要精確、哪裡近似就好」,是資深工程師和新手最明顯的差距之一。

### eviction policy 選錯,是「平常沒事、滿了才爆」的隱形炸彈

淘汰政策是那種「你不主動想、它就用預設咬你」的設定。預設的 `noeviction` 對「當快取」的場景是災難——平常記憶體沒滿時風平浪靜,一旦資料長到撞頂,**不是自動清舊資料,而是所有寫入開始報錯**,整個服務跟著掛。我看過不只一次這種事故:大家以為 Redis 會「自己清掉舊的」,結果它其實在拒絕新的。這件事教我一個更普遍的教訓:**任何有「上限」的資源,都要主動想清楚「撞到上限時會發生什麼」**——是自動回收、拒絕服務、還是直接崩潰?這個「邊界行為」平常看不到,卻往往是半夜事故的主角。上線前把每個上限的撞頂行為都想一遍,是很值得的偏執。
