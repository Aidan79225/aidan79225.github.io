---
title: "高可用:Sentinel 怎麼自動故障轉移"
date: 2026-07-20
category: tech
tags:
  - redis
  - high-availability
series: "Redis 學習筆記"
seriesOrder: 9
comments: true
draft: false
---
[[redis-replication|上一篇]]的主從複製給了你副本,但留了一個大洞:**master 掛了,不會自動有人接手。** 你得半夜爬起來,手動把某個 replica 升成 master、把其他 replica 改指向它、再叫所有客戶端換位址——一整套手忙腳亂。**Sentinel** 就是把這套流程自動化的看門狗:它自動偵測 master 死亡、自動故障轉移(failover)、自動告訴客戶端新 master 在哪。

## 一次自動故障轉移,長這樣

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 216" role="img" aria-label="Sentinel 自動故障轉移的流程。第一步監控:Sentinel 群一直 ping master。第二步主觀下線 SDOWN:某一個 Sentinel 覺得 master 沒回應。第三步客觀下線 ODOWN:過半的 Sentinel 都同意 master 真的掛了。第四步選出一個 Sentinel leader,由它挑一個最完整的 replica 升為新 master,其餘 replica 改指向新 master。第五步通知客戶端新的 master 位址。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="sf" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Sentinel 自動故障轉移的五步</text>
    <rect x="16" y="34" width="120" height="52" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="76" y="53" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">① 監控</text><text x="76" y="68" fill="#9aa4b2" font-size="7.4" text-anchor="middle">一直 ping master</text><text x="76" y="80" fill="#9aa4b2" font-size="7.4" text-anchor="middle">與 replica</text>
    <rect x="152" y="34" width="120" height="52" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="212" y="53" fill="#d6a45c" font-size="8.8" text-anchor="middle" font-weight="bold">② 主觀下線</text><text x="212" y="68" fill="#9aa4b2" font-size="7.4" text-anchor="middle">某個 Sentinel</text><text x="212" y="80" fill="#9aa4b2" font-size="7.4" text-anchor="middle">覺得沒回應(SDOWN)</text>
    <rect x="288" y="34" width="130" height="52" rx="7" fill="#3a2626" stroke="#e05a7d" stroke-width="1.5"/><text x="353" y="53" fill="#e05a7d" font-size="8.8" text-anchor="middle" font-weight="bold">③ 客觀下線</text><text x="353" y="68" fill="#9aa4b2" font-size="7.4" text-anchor="middle">過半同意「真掛了」</text><text x="353" y="80" fill="#e05a7d" font-size="7.4" text-anchor="middle">(ODOWN)</text>
    <line x1="136" y1="60" x2="150" y2="60" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#sf)"/>
    <line x1="272" y1="60" x2="286" y2="60" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#sf)"/>
    <line x1="353" y1="86" x2="353" y2="108" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#sf)"/>
    <rect x="150" y="112" width="270" height="52" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/><text x="285" y="131" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">④ 選出 Sentinel leader → 挑 replica 升主</text><text x="285" y="146" fill="#9aa4b2" font-size="7.4" text-anchor="middle">選一個最完整的 replica 升為新 master</text><text x="285" y="158" fill="#9aa4b2" font-size="7.4" text-anchor="middle">其餘 replica 改指向新 master</text>
    <line x1="150" y1="138" x2="140" y2="138" stroke="#9aa4b2" stroke-width="1.2"/><line x1="140" y1="138" x2="140" y2="190" stroke="#9aa4b2" stroke-width="1.2"/><line x1="140" y1="190" x2="150" y2="190" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#sf)"/>
    <rect x="152" y="176" width="270" height="30" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="287" y="195" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">⑤ 通知客戶端新 master 位址</text>
    <text x="490" y="150" fill="#9aa4b2" font-size="7.8" text-anchor="middle">客戶端向</text><text x="490" y="163" fill="#9aa4b2" font-size="7.8" text-anchor="middle">Sentinel 問</text><text x="490" y="176" fill="#9aa4b2" font-size="7.8" text-anchor="middle">「現在誰是</text><text x="490" y="189" fill="#9aa4b2" font-size="7.8" text-anchor="middle">master?」</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">整條流程的關鍵在<b style="color:#d6a45c">②→③</b> 那一步:單一 Sentinel 覺得 master 掛了,只是<b style="color:#d6a45c">主觀下線(SDOWN)</b>——它可能只是自己網路抖了一下。要<b style="color:#e05a7d">過半 Sentinel 都同意</b>,才升級成<b style="color:#e05a7d">客觀下線(ODOWN)</b>、真的啟動 failover。之後選出一個 leader 主導,挑最完整的 <b style="color:#54b890">replica 升為新 master</b>,再把新位址廣播出去。<b>「偵測」比「切換」難得多——難的是確定它真的掛了,而不是網路打了個嗝</b></figcaption>
</figure>

Sentinel 自己是一組獨立進程(通常 3 個以上、奇數),用它自己的埠跑:

```bash
# sentinel.conf:監控名為 mymaster 的 master,最後那個 2 是 quorum
sentinel monitor mymaster 10.0.0.1 6379 2
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster   # 客戶端問:現在 master 是誰
redis-cli -p 26379 SENTINEL replicas mymaster                  # 看它管的 replica
```

## 主觀 vs 客觀下線:為什麼一定要過半

上面那個「過半」不是隨便設的,它是整套機制的安全核心。想像沒有它:任何一個 Sentinel 只要自己連不上 master,就擅自把某個 replica 升成 master——那**網路分區時,兩邊各升一個,你就有了兩個 master(split-brain),資料直接分岔**。過半就是為了堵死這件事:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 210" role="img" aria-label="為什麼 Sentinel 要過半。三個 Sentinel S1、S2、S3 一起監控一個 master 加兩個 replica。網路分區把它們切成兩邊。左邊少數側只有 master 和 S1 一個 Sentinel,湊不出過半,所以不敢做 failover。右邊多數側有 S2 和 S3 兩個 Sentinel 加上 replica,兩票過半,於是確認 master 掛了、把 replica 升成新 master。因為只有過半那一側能選出新 master,所以不會同時冒出兩個 master,避免了 split-brain 腦裂。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">網路分區時,只有「過半」那側能升新 master</text>
    <line x1="290" y1="28" x2="290" y2="168" stroke="#e0733a" stroke-width="1.6" stroke-dasharray="5 4"/><text x="290" y="182" fill="#e0733a" font-size="7.8" text-anchor="middle" font-weight="bold">網路分區</text>
    <text x="140" y="42" fill="#9aa4b2" font-size="8.6" text-anchor="middle" font-weight="bold">少數側(1 個 Sentinel)</text>
    <rect x="40" y="52" width="90" height="34" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="85" y="72" fill="#e6e6e6" font-size="8" text-anchor="middle">Master(被隔開)</text>
    <rect x="150" y="52" width="90" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="195" y="72" fill="#e6e6e6" font-size="8" text-anchor="middle">S1</text>
    <rect x="40" y="100" width="200" height="46" rx="7" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="140" y="119" fill="#e05a7d" font-size="8.4" text-anchor="middle" font-weight="bold">1 票,湊不出過半</text><text x="140" y="134" fill="#9aa4b2" font-size="7.6" text-anchor="middle">→ 不敢 failover(即使連不到 master)</text>
    <text x="430" y="42" fill="#9aa4b2" font-size="8.6" text-anchor="middle" font-weight="bold">多數側(2 個 Sentinel)</text>
    <rect x="330" y="52" width="70" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="365" y="72" fill="#e6e6e6" font-size="8" text-anchor="middle">S2</text>
    <rect x="410" y="52" width="70" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="445" y="72" fill="#e6e6e6" font-size="8" text-anchor="middle">S3</text>
    <rect x="490" y="52" width="66" height="34" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="523" y="68" fill="#54b890" font-size="7.6" text-anchor="middle">replica</text><text x="523" y="80" fill="#9aa4b2" font-size="6.6" text-anchor="middle">×2</text>
    <rect x="330" y="100" width="226" height="46" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="443" y="119" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">2 票過半 → 確認 ODOWN</text><text x="443" y="134" fill="#9aa4b2" font-size="7.6" text-anchor="middle">→ 把 replica 升成新 master ✓</text>
    <text x="290" y="200" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">同一時間只有一側湊得出過半 → 不會冒出兩個 master → 防 split-brain</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">分區把叢集切成兩半:<b style="color:#e05a7d">少數側</b>(只有 1 個 Sentinel)無論多想 failover,都<b>湊不出過半</b>,只能乾等;<b style="color:#54b890">多數側</b>(2 個 Sentinel)兩票過半,確認 ODOWN、把 replica 升成新 master。因為<b>同一時間只有一側能湊出過半</b>,就保證了不會同時冒出兩個 master。這跟 <a href="/blog/sre-consensus/">共識演算法的 quorum</a>、<a href="/blog/redis-cluster/">Cluster 的過半故障轉移</a>是同一個定理的不同臉——<b>過半不是為了效率,是為了在網路撕裂時仍只有一個真相</b></figcaption>
</figure>

這裡有個容易混淆的細節值得點清楚:設定裡那個 `quorum`(上面的 `2`)只決定「**多少 Sentinel 同意才算 ODOWN**」;但真正要**啟動 failover、選出主導的 leader**,還需要**全體 Sentinel 的過半**授權。所以 Sentinel 總數要**奇數且 ≥ 3**——兩者都是為了在分歧時逼出一個明確多數。

## 選 leader、挑 replica、切過去

確認 ODOWN 之後,Sentinel 之間先用一輪**類 Raft 的過半投票**選出一個 leader,由它獨自主導這次 failover(避免多個 Sentinel 各切各的)。leader 接著挑一個**最適合的 replica**升主——優先看**複製最完整**(offset 最新、資料丟最少),再看設定的優先級。升好之後,把其餘 replica `REPLICAOF` 到新 master,並透過 pub/sub 廣播一個 `+switch-master` 事件。**懂 Sentinel 的客戶端**不會把 master 位址寫死,而是先問 Sentinel「現在誰是 master」,收到事件就自動重連新位址——這也是 Sentinel 順帶提供的**服務發現**。

## 反思

### Sentinel 教我的:偵測比切換難,誤判比不作為更貴

failover 的技術動作其實不難——升一個 replica、改幾個指向,幾行事就做完了。Sentinel 真正的重量,全壓在 `SDOWN → ODOWN` 那一步:**怎麼「確定」master 真的掛了,而不是網路抖了一下、或 Sentinel 自己那條線斷了?** 這是所有自動化補救機制的共通難題——auto-healing、自動重啟、熔斷,動作都好寫,難的是判斷。而且判斷錯的代價往往**比不作為更大**:master 其實還活著,你卻誤判去 failover,反而製造了一次本來不會有的中斷、甚至雙 master。所以 Sentinel 用「過半才算數」給偵測上了一道保險。這讓我對任何「自動修復」都多一分敬畏——**先問它怎麼避免誤判,再談它多會修**。

### 過半,是分散式系統的免疫系統

Sentinel 裡藏了**兩層過半**:判定 ODOWN 要過半、選 leader 也要過半。它們都在防同一件事——**少數節點(或被分區隔開的一側)擅自行動,造成 split-brain**。寫到這篇我越發覺得,「過半」是分散式世界一條近乎萬用的免疫機制:[[sre-consensus|共識演算法]]靠它、[[redis-cluster|Cluster]] 靠它、etcd / ZooKeeper 靠它、連 Sentinel 這種相對樸素的 HA 也靠它。它的精神一句話講完:**當節點們意見分歧、或網路把大家撕成兩半時,只讓「湊得出多數」的那一側行動,系統就永遠只有一個真相。** 這不是為了跑得快,是為了在最混亂的那一刻不分裂。看懂過半,你就拿到了理解幾乎所有分散式 HA 的通用鑰匙。

### Sentinel 解「可用性」,但不解「容量」——別用錯

最後把定位講清楚,免得選錯工具。Sentinel 很稱職地解決了**可用性**:master 掛了自動有人頂上,不用人半夜救火。但它**不解決容量**——整個叢集還是一個 master 扛所有寫入,資料量與寫入 throughput 的天花板,跟單機是一樣的;而且 failover 有**秒級的空窗**,非同步複製下還可能丟掉最後幾筆沒複製出去的寫入。所以它跟 [[redis-cluster|Cluster]] 的分工很清楚:**要「掛了有人頂」用 Sentinel(主從 + 自動 failover);要「一台裝不下、寫不動」才上 Cluster(分片 + 每片各自主從)**。認清「Sentinel 解可用性、Cluster 解可用性 + 容量」,你就不會在只需要前者時,硬扛 Cluster 那套 multi-key 限制的複雜;也不會在資料早就爆掉單機時,還在拿 Sentinel 硬撐。**先看你缺的是『不中斷』還是『裝得下』,答案自己就浮出來。**
