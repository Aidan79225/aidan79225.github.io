---
title: "資料從哪來:源頭系統與資料生成,讀《Fundamentals of Data Engineering》Ch.5"
date: 2026-06-30
category: tech
tags:
  - data-engineering
  - book-notes
series: "Fundamentals of Data Engineering 讀書筆記"
seriesOrder: 5
comments: true
draft: false
---
前四章在講大方向 —— [[fode-2|生命週期]]、[[fode-3|架構]]、[[fode-4|選技術]]。從這章開始,書一階一階走進生命週期的每個環節。第一站是最前面、也最容易被工程師輕看的一段:**資料到底是怎麼、在哪裡被生出來的?** 這章最該記住的一句話是 —— **資料生在你不擁有的系統裡,你永遠是下游。**

## 定調:你是下游,源頭由別人掌控

資料工程師很少**生**資料,我們**接**資料 —— 接的是 App 開發者、SaaS、感測器、別的團隊吐出來的東西。這帶來一個貫穿全章的事實:**那些源頭系統不歸你管,你攔不住它們改 schema、改邏輯、改格式。** 你能做的,是把它們**理解透**,並對它們的變化**建立韌性**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 280" role="img" aria-label="資料工程的起點:左邊是各種源頭系統(應用資料庫、API/SaaS、檔案日誌、IoT、訊息串流),它們由別人擁有、會自己改變;跨過你的邊界後,匯入你負責的 Ingestion 擷取階段" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="src" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="119" y="16" fill="#9aa4b2" font-size="10" text-anchor="middle">源頭系統 — 別人擁有、會自己改變</text>
    <rect x="14" y="24" width="210" height="236" rx="10" fill="none" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="5 4"/>
    <rect x="30" y="44" width="178" height="32" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="119" y="64" fill="#e6e6e6" font-size="10.5" text-anchor="middle">應用資料庫(OLTP)</text>
    <rect x="30" y="86" width="178" height="32" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="119" y="106" fill="#e6e6e6" font-size="10.5" text-anchor="middle">API / SaaS</text>
    <rect x="30" y="128" width="178" height="32" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="119" y="148" fill="#e6e6e6" font-size="10.5" text-anchor="middle">檔案 / 日誌</text>
    <rect x="30" y="170" width="178" height="32" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="119" y="190" fill="#e6e6e6" font-size="10.5" text-anchor="middle">IoT / 感測器</text>
    <rect x="30" y="212" width="178" height="32" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="119" y="232" fill="#e6e6e6" font-size="10.5" text-anchor="middle">訊息佇列 / 串流</text>
    <line x1="300" y1="28" x2="300" y2="258" stroke="#3a4154" stroke-width="1.3" stroke-dasharray="4 5"/>
    <text x="300" y="16" fill="#9aa4b2" font-size="9.5" text-anchor="middle">你的邊界</text>
    <line x1="208" y1="60" x2="370" y2="132" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#src)"/>
    <line x1="208" y1="102" x2="370" y2="140" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#src)"/>
    <line x1="208" y1="144" x2="370" y2="144" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#src)"/>
    <line x1="208" y1="186" x2="370" y2="150" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#src)"/>
    <line x1="208" y1="228" x2="370" y2="158" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#src)"/>
    <rect x="372" y="116" width="150" height="56" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="447" y="140" fill="#e6e6e6" font-size="11.5" text-anchor="middle">Ingestion 擷取</text>
    <text x="447" y="156" fill="#9aa4b2" font-size="8.5" text-anchor="middle">你的生命週期從這開始</text>
    <line x1="522" y1="144" x2="572" y2="144" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#src)"/>
    <text x="556" y="134" fill="#4f6df5" font-size="8.5" text-anchor="middle">下游</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">資料工程的起點:資料生在你不擁有的系統裡。跨過邊界進到你負責的 Ingestion 之前,你只能理解它、並對它的變化建立韌性</figcaption>
</figure>

## 源頭有哪些種類

書把常見的源頭系統盤點了一輪。記住這份清單的用處,是**每一種的脾氣不一樣**,擷取策略也跟著不同:

| 源頭 | 一句話 | 擷取要注意 |
|---|---|---|
| **應用資料庫(OLTP)** | 線上系統的後端庫,多是 CRUD | 別直接拿來跑分析(見下) |
| **API / SaaS** | 第三方服務的對外介面 | 限流、分頁、schema 由對方說了算 |
| **檔案 / 日誌** | CSV、JSON、log 檔 | 格式雜、無 schema 保證 |
| **IoT / 感測器** | 裝置持續吐的訊號 | 量大、亂序、會斷線重送 |
| **訊息佇列 / 串流** | 事件即時流過 | 投遞語義與順序(見 [[kafka-delivery\|Kafka 投遞保證]]) |

書也提了一個容易被忽略的源頭:**類比轉數位**。很多資料的真正起點是現實世界(一句話、一個動作),被某個系統「數位化」的那一刻才誕生 —— 而那一步怎麼做,決定了你下游拿到的資料品質。

## 來源資料庫:是 OLTP,別直接拿來分析

最常見的源頭就是某個 App 背後的資料庫,而它幾乎都是 **OLTP** —— 為「大量又小又快的交易」最佳化(下單、改地址、按讚),靠 **ACID** 保證每筆交易要嘛成功要嘛回滾。它**不是**為「掃幾億列做彙總」設計的。**在生產 OLTP 上硬跑分析查詢,等於跟線上使用者搶資源** —— 這是新手最常闖的禍。

另一個要分清楚的,是資料**怎麼留痕**:

- **CRUD**:就地改、就地刪。`UPDATE` 之後,舊值**直接消失** —— 你只看得到現在,看不到歷史。
- **Insert-only(只增不改)**:每次變動都**新增一列**,舊版本全留著。代價是表會一直長,但你換來完整歷史與可重播。

**CRUD 省空間卻丟歷史,insert-only 留歷史卻長很快。** 這個取捨會一路影響到你下游怎麼建快照、能不能回溯 —— 跟 [[medallion-architecture|Medallion]] 守著 Bronze「不可變、可重播」是同一條神經。

## 從來源庫取數的兩條路:批次查詢 vs CDC

既然不該一直壓著 OLTP 查,那資料怎麼搬出來?書講了兩種主要做法,差別值得畫清楚:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 220" role="img" aria-label="從來源資料庫取數的兩條路:上方是定期批次查詢,只抓當下快照、會壓到 OLTP;下方是 CDC 讀資料庫變更日誌,逐筆串出 insert/update/delete、近即時又不壓主庫" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="cd1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker><marker id="cd2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#54b890"/></marker></defs>
    <path d="M24 84 v52 a40 7 0 0 0 80 0 v-52" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><ellipse cx="64" cy="84" rx="40" ry="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="64" y="110" fill="#e6e6e6" font-size="11" text-anchor="middle">App DB</text><text x="64" y="125" fill="#9aa4b2" font-size="8" text-anchor="middle">OLTP</text>
    <line x1="104" y1="98" x2="188" y2="50" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#cd1)"/><text x="142" y="58" fill="#9aa4b2" font-size="8.5" text-anchor="middle">拉現況</text>
    <rect x="190" y="26" width="156" height="46" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="268" y="46" fill="#e6e6e6" font-size="10.5" text-anchor="middle">定期批次查詢</text><text x="268" y="61" fill="#9aa4b2" font-size="8" text-anchor="middle">snapshot</text>
    <text x="356" y="44" fill="#9aa4b2" font-size="8.5" text-anchor="start">每隔 N 分鐘抓一次當下</text>
    <text x="356" y="58" fill="#9aa4b2" font-size="8.5" text-anchor="start">→ 漏掉中間變化、壓到主庫</text>
    <line x1="104" y1="122" x2="188" y2="170" stroke="#54b890" stroke-width="1.3" marker-end="url(#cd2)"/><text x="142" y="162" fill="#54b890" font-size="8.5" text-anchor="middle">讀變更 log</text>
    <rect x="190" y="148" width="156" height="46" rx="7" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="268" y="168" fill="#e6e6e6" font-size="10.5" text-anchor="middle">CDC(讀 DB log)</text><text x="268" y="183" fill="#9aa4b2" font-size="8" text-anchor="middle">log-based</text>
    <text x="356" y="166" fill="#9aa4b2" font-size="8.5" text-anchor="start">逐筆 insert / update / delete</text>
    <text x="356" y="180" fill="#9aa4b2" font-size="8.5" text-anchor="start">→ 近即時、不壓主庫</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">批次查詢只看得到當下快照,兩次之間的變化會漏掉;CDC 讀資料庫的變更日誌,把每一筆異動串出來 —— 也是餵事件流最常見的來源</figcaption>
</figure>

**CDC(Change Data Capture)** 是這章的重點概念:與其反覆去查整張表,不如**讀資料庫自己寫的變更日誌**(那份它本來就為了復原而存在的 log),把每一筆 `insert / update / delete` 連續串出來。它近即時、又幾乎不增加主庫負擔,所以常被拿來當 [[kafka-intro|Kafka]] 這類事件流的上游 —— 把一個 CRUD 資料庫的異動,變成一條可重播的事件流。

## Schema drift:資料工程的永恆之痛

源頭不歸你管,最具體的痛就是 **schema 會變**。某天 App 工程師把 `user_name` 改名、把一個欄位從字串改成物件、悄悄多塞一層巢狀 —— **你下游的管線就無聲無息地壞了或污染了。** 書區分兩種源頭:**固定 schema**(關聯式資料庫,寫入時就強制結構)與 **schemaless**(很多 NoSQL / JSON,結構藏在資料裡、隨時會漂)。後者尤其危險。

務實的應對,書與我的經驗一致:**別假設源頭穩定。** 對關鍵來源談好「資料合約(data contract)」、在擷取入口就**監控 schema 變化**、讓壞掉的是告警而不是悄悄錯一週的報表。這正是 [[fode-2|生命週期]]裡「資料品質」與「監控」這兩條底層暗流,在最上游的具體落地。

## 訊息與串流、還有「時間」

源頭若是即時事件,會碰到兩種基礎設施 —— 書的區分跟我 [[kafka-intro|Kafka 系列]]講過的完全一致:**訊息佇列**(訊息被消費完就刪)vs **事件串流平台**(事件留存、可重播)。細節我在 [[kafka-topics|Topic/Partition]] 跟 [[kafka-delivery|投遞保證]]那兩篇拆過,這裡不重講。

最後一個容易忽略、卻會反覆咬你的概念是**時間**。同一筆事件有三個時間:**事件時間**(它真正發生的當下)、**擷取時間**(進到你系統的當下)、**處理時間**(你算它的當下)。三者幾乎不相等 —— 網路會延遲、裝置會離線後補送。**搞混了就會算錯**(例如用處理時間當事件時間做每日彙總),這也是我在 [[spark-streaming|Structured Streaming]] 那篇強調要盯事件時間與 watermark 的原因。

## 反思

### 「你不擁有來源」這個認知,改變了我寫管線的姿勢

這章最戳中我的,是把一件我隱約知道、卻沒講白的事釘死了:**源頭是別人的,它一定會在我沒被通知的情況下改變。** 早年我寫擷取,預設「上游給的格式就是這樣」,結果被一次悄悄的欄位改名,搞到報表錯了好幾天才有人發現。現在我的姿勢完全反過來 —— **防禦性地接資料**:入口就驗 schema、對關鍵來源談資料合約、寧可在邊界吵架(告警),也不要讓錯誤無聲流進下游。這跟 [[fode-4|Ch.4]] 講的「對易變的東西保持可抽換」是同一種戒心,只是換到了資料層。

### CDC 是我看過 CP 值最高的一招

「別一直壓 OLTP」這條,我用 CDC 嚐到甜頭。把一個本來要每十分鐘全表掃一次、又重又漏變化的批次,換成讀資料庫 log 的 CDC 之後,**主庫負擔降下來、資料新鮮度反而上去**,還順手把它接成一條可重播的事件流餵下游。它漂亮在「**借力資料庫本來就在寫的東西**」——那份為了復原而存在的 log,被我們拿來當作異動的真實來源。看懂這招,很多「即時 vs 不壓主庫」的兩難就解開了。

### 最上游的問題,常常不是技術問題,是人的問題

寫完這章我更確定:源頭這一段,**真正的難點在協作,不在程式。** 因為源頭歸別的團隊管,schema 何時變、為什麼變,是溝通問題不是工程問題。我現在會主動去跟上游的 App 工程師對齊「哪些欄位是契約、不能隨便動」,把自己擺進他們的變更流程裡,而不是被動等東西壞掉。這呼應 [[fode-2|生命週期]]裡那條最軟、卻最關鍵的暗流 —— 資料工程到頭來是一門跨團隊的學問,而它從最上游的源頭就開始了。
