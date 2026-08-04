---
title: "關聯:從一個尖峰,點到那一行 log"
date: 2026-08-04
category: tech
tags:
  - observability
  - grafana
  - correlation
series: "Grafana LGTM 可觀測性"
seriesOrder: 8
comments: true
---
整個系列從[[obs-intro|第一篇]]的黃金路徑就一直押著一句:metric 看**有沒有**、trace 看**在哪**、log 看**是什麼**,由粗到細。但我一直跳過最關鍵的一步——這三格之間,到底怎麼「跳」過去?[[obs-traces-tempo|Tempo 那篇]]說「找 trace-id 的活交給 metric 和 log」、[[obs-collection|採集層那篇]]說「關聯是採集時種下的」,兩個伏筆都指向這篇。這篇把它收掉:讓黃金路徑不只是一張概念圖,而是事故當下**真的能一路點過去**的路徑——而它能成立的秘密,反直覺地不在 Grafana,在採集端。

## 黃金路徑,這次真的能「點」過去

先看它在事故當下長什麼樣。重點是:你不是「開 metric 系統 → 開 trace 系統 → 開 log 系統 → 手動對時間戳」,而是在**同一塊玻璃上,三步都是「點」,不是「查」**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 196" role="img" aria-label="排障黃金路徑真的能點過去。第一格 Metric 答有沒有問題:一條折線出現尖峰,尖峰頂端有一個 exemplar 小點，掛著 trace_id，你先看到「痛」。沿著 trace_id 點過去到第二格 Trace 答在哪一段:一個 waterfall 有幾條 span，其中紅色那一段是慢或 error 的 span，把範圍縮到哪個服務哪一段。再帶著 trace_id 點過去到第三格 Log 答是什麼:幾行 log 裡紅色那行是 error，例如 NPE，而且這幾行都帶同一個 trace_id，讓你看到根因那一行。整條路徑由粗到細，一路用 trace_id 點過去，而不是分別去三個系統手動查、對時間戳。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="cra" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#d6a45c"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">黃金路徑:由粗到細,一路「點」過去</text>
    <rect x="14" y="32" width="164" height="126" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="96" y="50" fill="#4f6df5" font-size="8.4" text-anchor="middle" font-weight="bold">① Metric:有沒有</text>
    <rect x="26" y="58" width="140" height="54" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <polyline points="32,100 56,97 78,99 92,99 100,70 110,99 132,97 160,97" fill="none" stroke="#4f6df5" stroke-width="1.6"/>
    <circle cx="100" cy="70" r="4" fill="#d6a45c" stroke="#1f2330" stroke-width="1"/>
    <text x="96" y="128" fill="#d6a45c" font-size="6.8" text-anchor="middle">↑ exemplar = trace_id</text>
    <text x="96" y="145" fill="#9aa4b2" font-size="7" text-anchor="middle">先看到「痛」</text>
    <rect x="208" y="32" width="164" height="126" rx="8" fill="#26324a" stroke="#9b6ff0" stroke-width="1.5"/>
    <text x="290" y="50" fill="#9b6ff0" font-size="8.4" text-anchor="middle" font-weight="bold">② Trace:在哪一段</text>
    <rect x="224" y="60" width="126" height="12" rx="2" fill="#2a2340" stroke="#9b6ff0" stroke-width="1"/>
    <rect x="240" y="76" width="78" height="12" rx="2" fill="#2a2340" stroke="#9b6ff0" stroke-width="1"/>
    <rect x="252" y="92" width="100" height="14" rx="2" fill="#331f22" stroke="#d66b5c" stroke-width="1.4"/>
    <rect x="268" y="110" width="46" height="12" rx="2" fill="#2a2340" stroke="#9b6ff0" stroke-width="1"/>
    <text x="290" y="135" fill="#e08b7c" font-size="6.8" text-anchor="middle">紅色那段 = 慢/error</text>
    <text x="290" y="147" fill="#9aa4b2" font-size="7" text-anchor="middle">縮到哪個服務、哪段</text>
    <rect x="402" y="32" width="164" height="126" rx="8" fill="#26324a" stroke="#54b890" stroke-width="1.5"/>
    <text x="484" y="50" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">③ Log:是什麼</text>
    <rect x="414" y="60" width="140" height="15" rx="2" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="420" y="71" fill="#9aa4b2" font-size="6.4" text-anchor="start" font-family="monospace">info  handling req</text>
    <rect x="414" y="79" width="140" height="15" rx="2" fill="#331f22" stroke="#d66b5c" stroke-width="1.2"/><text x="420" y="90" fill="#e08b7c" font-size="6.4" text-anchor="start" font-family="monospace">error NPE at line 42</text>
    <rect x="414" y="98" width="140" height="15" rx="2" fill="#1f2330" stroke="#3a4154" stroke-width="1"/><text x="420" y="109" fill="#9aa4b2" font-size="6.4" text-anchor="start" font-family="monospace">info  retry ok</text>
    <text x="484" y="132" fill="#d6a45c" font-size="6.8" text-anchor="middle">都帶同一個 trace_id</text>
    <text x="484" y="147" fill="#9aa4b2" font-size="7" text-anchor="middle">看到根因那一行</text>
    <line x1="178" y1="95" x2="206" y2="95" stroke="#d6a45c" stroke-width="1.4" marker-end="url(#cra)"/><text x="192" y="88" fill="#d6a45c" font-size="6.2" text-anchor="middle">trace_id</text>
    <line x1="372" y1="95" x2="400" y2="95" stroke="#d6a45c" stroke-width="1.4" marker-end="url(#cra)"/><text x="386" y="88" fill="#d6a45c" font-size="6.2" text-anchor="middle">trace_id</text>
    <text x="290" y="182" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">三步都是「點」,不是「查」:看有沒有 → 看在哪 → 看是什麼</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">看到 <b style="color:#4f6df5">p99 尖峰</b> → 點尖峰上那個 <b style="color:#d6a45c">exemplar</b> 小點,直接跳進那條 <b style="color:#9b6ff0">trace</b> → 在 waterfall 上看到<b style="color:#e08b7c">紅色那段 span</b>(慢/error)→ 點它,<b style="color:#54b890">log</b> 已經用 <code>trace_id</code> 幫你篩好、根因那一行就在眼前。整條路徑<b>由粗到細,一路用 <code>trace_id</code> 點過去</b>——這才是「一塊玻璃」真正的價值:不是把三個東西擺在一起,是把它們<b>串成一條路</b></figcaption>
</figure>

## 靠什麼跳:一條 trace_id 穿過三種訊號

上面那條路能一路點過去,靠的是同一個東西——**`trace_id` 同時活在三種訊號裡**。而且它不是查詢時才算出來的,是**採集時**由同一套 context(OTel / Alloy)種進去的:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 226" role="img" aria-label="同一個 trace_id 穿過三種訊號。左邊採集端 OTel 或 Alloy 種下一個 trace_id 等於 abc123。這個同樣的 ID 自動出現在三種訊號裡:Metric 資料點旁邊掛一個 exemplar，值是 abc123；Trace 本身就用 abc123 當 key；Log 每一行帶 trace_id 等於 abc123。三個 abc123 是同一個字串，像一條線穿過三種訊號。重點:關聯不是 Grafana 查詢時算出來的，是採集時就把同一個 ID 種進三種訊號，Grafana 只是認出這個 ID、跟著它跳。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="cr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">同一個 trace_id,穿過三種訊號</text>
    <rect x="16" y="84" width="150" height="64" rx="8" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.5"/>
    <text x="91" y="104" fill="#9b6ff0" font-size="8.4" text-anchor="middle" font-weight="bold">採集端種下 ID</text>
    <text x="91" y="119" fill="#9aa4b2" font-size="7" text-anchor="middle">OTel / Alloy</text>
    <text x="91" y="137" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-family="monospace">trace_id=abc123</text>
    <line x1="166" y1="104" x2="358" y2="65" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cr2)"/>
    <line x1="166" y1="116" x2="358" y2="121" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cr2)"/>
    <line x1="166" y1="128" x2="358" y2="177" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cr2)"/>
    <rect x="360" y="42" width="206" height="46" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="372" y="60" fill="#4f6df5" font-size="8" text-anchor="start" font-weight="bold">Metric 資料點</text>
    <text x="372" y="78" fill="#9aa4b2" font-size="7" text-anchor="start" font-family="monospace">p99…  exemplar:</text><text x="486" y="78" fill="#d6a45c" font-size="7" text-anchor="start" font-family="monospace">abc123</text>
    <rect x="360" y="98" width="206" height="46" rx="6" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.4"/>
    <text x="372" y="116" fill="#9b6ff0" font-size="8" text-anchor="start" font-weight="bold">Trace</text>
    <text x="372" y="134" fill="#9aa4b2" font-size="7" text-anchor="start" font-family="monospace">trace </text><text x="406" y="134" fill="#d6a45c" font-size="7" text-anchor="start" font-family="monospace">abc123</text><text x="452" y="134" fill="#9aa4b2" font-size="7" text-anchor="start" font-family="monospace">{ spans }</text>
    <rect x="360" y="154" width="206" height="46" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="372" y="172" fill="#54b890" font-size="8" text-anchor="start" font-weight="bold">Log 一行</text>
    <text x="372" y="190" fill="#9aa4b2" font-size="7" text-anchor="start" font-family="monospace">error trace_id=</text><text x="460" y="190" fill="#d6a45c" font-size="7" text-anchor="start" font-family="monospace">abc123</text>
    <text x="290" y="217" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">關聯是採集時種下的 ID,不是查詢時算的 —— Grafana 只是跟著 ID 跳</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三個 <b style="color:#d6a45c">abc123</b> 是同一個字串,像一條線穿過三種訊號——這就是互跳的全部秘密。<b>exemplar</b> 讓聚合的 metric 留一根線頭(「這個尖峰的其中一個樣本請求,trace_id 是這個」);結構化 log 每行帶 <code>trace_id</code>,於是 <b style="color:#9b6ff0">trace</b> ↔ <b style="color:#54b890">log</b> 雙向可跳。而這一切的前提,是這個 ID 在<b>採集端由同一套 context 種進三種訊號</b>——不是三套工具各記各的。<b style="color:#d66b5c">三孤島的失敗模式</b>就敗在這:trace 一套 agent、log 一套 shipper,ID 對不齊,黃金路徑當場斷成三段</figcaption>
</figure>

而 Grafana 這一端做的,少得意外——它只是**認出那個 ID、生成一個可點的連結**。兩個機制:**exemplar**,Mimir 的 metric 點附帶 `trace_id`,Grafana 在圖上畫成可點的小點,一點就帶著 ID 打開 Tempo;**data link / derived field**,Loki 的 log 面板用一條 regex 把 `trace_id=xxx` 抽出來、渲染成連去 Tempo 的連結,反過來 Tempo 的 span 也有「看這段的 logs」按鈕,設定成用 `trace_id` 去 Loki 撈。看清楚:**真正的關聯早在採集端就綁好了,Grafana 只是跟著線頭走。**

## 反思

### 關聯是採集時種下的,不是查詢時算的

這句話,是我現在評估一套觀測時的第一道檢查題。很多團隊會很驕傲地說「我三支柱都上了」——但我只問一個問題:**隨便抓一個 metric 尖峰,你能不能兩下點到造成它的那一行 log?** 答不出來的,幾乎都是同一個病:metrics 一套 agent、logs 一套 shipper、traces 又另一套,三邊的 ID 對不齊,於是「三支柱」只是三個各自為政的孤島,事故當下還得靠人肉複製時間戳、去三個系統各查一次——一塊玻璃活生生用成三個瀏覽器分頁。所以我把「三種訊號共用同一套 trace context」當成採集層的**第一硬需求**,比「後端選 Loki 還是別的」重要得多。**關聯不是買三個工具就會有的,是你在埋測那一刻,決定讓不讓同一個 ID 流過三種訊號。** 這也正是[[obs-collection|採集層那篇]]我說「埋測一律走 OTel、綁標準不綁廠商」的真正回報所在——共用 context,就是在這裡兌現。

### 由粗到細,省的不是資料,是「注意力」

黃金路徑的價值,我一直到帶過幾次事故才想透:它省的**不是資料量,是注意力**。事故當下人腦的頻寬窄得可怕,而 metric→trace→log 這條由粗到細的收斂,每一步都在**縮小範圍**,讓你有限的腦力不用花在大海撈針、而是直接落在該看的那一行。這跟我在 [[k8s-troubleshooting|K8s 排障]]講的 get→describe→logs 漏斗、跟[[obs-alerting|告警]]那篇「叫醒你但不塞原因」是同一種思維——**好的排障不是翻得快,是每一步都在替你砍掉不用看的東西。** 所以我看一套觀測成不成熟,現在不看它能存多少資料,看一個更狠的指標:**從「發現有問題」到「看到那一行根因」,要幾下點擊、幾分鐘?** 這個數字,直接就是你的 MTTR。

### 打通關聯,一塊玻璃才真的是「一條路徑」

[[obs-intro|第一篇]]我說「一塊玻璃的價值,是事故當下少一層摩擦」。走到這篇我要把它講到底:**沒有關聯,一塊玻璃只是三個剛好開在同一個視窗的分頁。** 把 metrics、logs、traces 收進一個 Grafana,只是「擺在一起」;真正把它們**串成一條路**的,是那個穿過三種訊號的 `trace_id`。少了它,你還是得在最需要冷靜的時刻,把腦力耗在「切分頁、對時間戳」這種破碎的摩擦上。而這篇也讓整個系列閉環了:**看見**(三支柱)→ **叫醒**(告警)→ **一路點到根因**(關聯)→ **行動**。這一整套 LGTM,從頭到尾都在回答同一句我押了八篇的話——觀測的終點不是「看到」,是行動;而關聯,就是把「看到」高速接上「行動」的那段變速箱。
