---
title: "串流:雙寫的陷阱、CDC,與流表二象性"
date: 2026-07-24
category: tech
description: "批次的另一半:資料不再一批一批,而是一直來。Kafka 的 log 與投遞保證、串流的視窗與 watermark,我在別的系列講過;DDIA Ch11 真正的獨門,是三個更根本的觀念:雙寫的陷阱(同一份資料分頭寫進 DB、快取、搜尋索引——部分失敗與亂序讓它們永久分歧,這是最常見的沉默資料事故)、CDC(把資料庫的複製 log 開放出來,讓所有下游變成它的 follower),以及流表二象性(表是流摺疊到現在的狀態、流是表的 changelog——一個等價,把 materialized view、log compaction、複製串流全部講通)。"
tags:
  - distributed-systems
  - book-notes
  - streaming
series: "Designing Data-Intensive Applications 讀書筆記"
seriesOrder: 11
comments: true
draft: false
---
[[ddia-batch|批次]]處理「已經齊了」的資料;串流處理「一直來」的資料。這章很多地基我在別處鋪過了:log 與 offset 在 [[kafka-intro|Kafka 系列]]、投遞保證在 [[kafka-delivery|delivery 那篇]]、視窗與 event time 在 [[spark-streaming|Spark Streaming]]——都不重複。DDIA Ch11 真正的獨門,是三個更根本的觀念:**為什麼「分頭寫兩份」注定出事、怎麼讓資料庫自己變成事件的源頭(CDC)、以及「流」和「表」其實是同一個東西的兩面。**

## 雙寫的陷阱:同一份資料,分頭寫進三個系統

真實系統裡,同一份資料常要同時存在好幾個地方:DB 是主存放、Redis 是快取、Elasticsearch 是搜尋索引。最直覺的做法是**應用程式自己分頭寫三份(dual write)**——而這正是最常見的沉默資料事故的源頭:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 250" role="img" aria-label="雙寫陷阱與 log 先行的對比。左邊雙寫:應用程式分頭把同一筆更新寫進資料庫、快取、搜尋索引三個系統。兩個病:一,部分失敗——寫完 DB 之後應用當掉,快取與索引沒寫到,而且沒有交易能跨系統回滾;二,亂序——兩個並行請求寫入三個系統的到達順序不同,DB 收到先 A 後 B、快取收到先 B 後 A,兩邊收斂到不同的最終值。結果:三個系統永久分歧,而且無聲無息。右邊 log 先行:只寫一個地方(log 或資料庫),所有下游按同一順序消費同一條 log,快取、索引都是 follower,順序一致、掉了可以重放,最終一致。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="dw" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e05a7d"/></marker><marker id="dwg" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <line x1="290" y1="14" x2="290" y2="200" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#e05a7d" font-size="9.4" text-anchor="middle" font-weight="bold">✗ 雙寫:應用自己寫三份</text>
    <rect x="96" y="36" width="100" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="146" y="52" fill="#e6e6e6" font-size="7.4" text-anchor="middle">應用程式</text>
    <line x1="116" y1="60" x2="72" y2="88" stroke="#e05a7d" stroke-width="1.2" marker-end="url(#dw)"/><line x1="146" y1="60" x2="146" y2="88" stroke="#e05a7d" stroke-width="1.2" marker-end="url(#dw)"/><line x1="176" y1="60" x2="220" y2="88" stroke="#e05a7d" stroke-width="1.2" marker-end="url(#dw)"/>
    <rect x="32" y="90" width="80" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="72" y="106" fill="#e6e6e6" font-size="7.2" text-anchor="middle">DB</text>
    <rect x="106" y="90" width="80" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="146" y="106" fill="#e6e6e6" font-size="7.2" text-anchor="middle">快取</text>
    <rect x="180" y="90" width="80" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="220" y="106" fill="#e6e6e6" font-size="7.2" text-anchor="middle">搜尋索引</text>
    <rect x="26" y="128" width="240" height="28" rx="5" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="146" y="140" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">病一:寫到一半當掉 → 有的寫了有的沒寫</text>
    <text x="146" y="151" fill="#9aa4b2" font-size="6.6" text-anchor="middle">沒有交易能跨三個系統回滾</text>
    <rect x="26" y="162" width="240" height="28" rx="5" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="146" y="174" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">病二:並行寫抵達順序不同</text>
    <text x="146" y="185" fill="#9aa4b2" font-size="6.6" text-anchor="middle">DB 收到先A後B、快取先B後A → 收斂到不同值</text>
    <text x="146" y="200" fill="#e05a7d" font-size="7.4" text-anchor="middle" font-weight="bold">→ 三個系統永久分歧,無聲無息</text>
    <text x="434" y="26" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">✓ log 先行:只寫一個地方</text>
    <rect x="384" y="36" width="100" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="434" y="52" fill="#e6e6e6" font-size="7.4" text-anchor="middle">應用程式</text>
    <line x1="434" y1="60" x2="434" y2="84" stroke="#54b890" stroke-width="1.4" marker-end="url(#dwg)"/><text x="474" y="76" fill="#54b890" font-size="6.8" text-anchor="middle">只寫這裡</text>
    <rect x="334" y="86" width="200" height="26" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/><text x="434" y="103" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">一條有順序的 log(source of truth)</text>
    <line x1="374" y1="112" x2="356" y2="138" stroke="#54b890" stroke-width="1.1" marker-end="url(#dwg)"/><line x1="434" y1="112" x2="434" y2="138" stroke="#54b890" stroke-width="1.1" marker-end="url(#dwg)"/><line x1="494" y1="112" x2="512" y2="138" stroke="#54b890" stroke-width="1.1" marker-end="url(#dwg)"/>
    <rect x="318" y="140" width="76" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="356" y="156" fill="#e6e6e6" font-size="7" text-anchor="middle">DB</text>
    <rect x="398" y="140" width="76" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="436" y="156" fill="#e6e6e6" font-size="7" text-anchor="middle">快取</text>
    <rect x="478" y="140" width="76" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="516" y="156" fill="#e6e6e6" font-size="7" text-anchor="middle">搜尋索引</text>
    <text x="434" y="182" fill="#54b890" font-size="7.2" text-anchor="middle" font-weight="bold">全部照「同一順序」消費 → 順序一致、掉了可重放</text>
    <text x="434" y="197" fill="#9aa4b2" font-size="6.8" text-anchor="middle">下游全是 follower,最終收斂到同一狀態</text>
    <rect x="30" y="212" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="229" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">一份資料要進 N 個系統?選一個當 source of truth,其他全部當 follower</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e05a7d">雙寫</b>的兩個病無藥可醫:<b>部分失敗</b>(寫完 DB 應用當掉,快取沒跟上——跨系統沒有交易能回滾)與<b>亂序</b>(兩個並行寫抵達三個系統的順序不同,各自收斂到不同值)——三個系統<b>永久分歧,而且無聲無息</b>。<b style="color:#54b890">Log 先行</b>把問題結構性地消滅:只寫一個地方(一條有順序的 log),所有下游照<b>同一順序</b>消費——順序一致、掉了從 offset 重放。這其實就是 <a href="/blog/ddia-replication/">複製</a>那章的 leader–follower,推廣到「異質系統之間」:<b>選一個 source of truth,其他全部當 follower</b></figcaption>
</figure>

## CDC:讓資料庫自己變成事件源頭

「log 先行」聽起來要改寫整個應用——但有個聰明的捷徑:**資料庫本來就有一條寫入順序的 log**([[ddia-storage-engines|WAL]] / binlog,複製 follower 就是靠它同步的)。**CDC(change data capture)就是把這條內部的複製 log 接出來、變成人人可訂閱的事件流**——Debezium 之類的工具偽裝成一個 replication follower,把每筆變更寫進 [[kafka-ecosystem|Kafka]]。應用程式一行不用改、照常寫 DB;快取、索引、數倉全部改吃這條流。**DB 仍是 source of truth,但它的每一次心跳,全世界都聽得見**——這也是現代資料平台把 OLTP 資料餵進[[ddia-batch|分析側]]的主流姿勢。

## 流表二象性:表是流的積分,流是表的微分

這章最漂亮的觀念,是**流(stream)和表(table)是同一個東西的兩面**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 218" role="img" aria-label="流表二象性。左邊是一條 changelog 流:依序四筆事件,k1 設為 a、k2 設為 x、k1 改為 b、k2 刪除。往右摺疊套用到現在,就得到表:k1 等於 b,k2 不存在——表是流摺疊到當下的狀態。往左,對表的每一次改動發一筆事件,就還原出流——流是表的 changelog。下方:log compaction 是只保留每個 key 最後一筆的流,等於可以重建表的最小流;materialized view、Redis 的複製串流、Kafka 的 compacted topic,全是這個等價的化身。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="sd" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker><marker id="sd2" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#d6a45c"/></marker></defs>
    <text x="146" y="24" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">流:一條 changelog</text>
    <rect x="36" y="36" width="220" height="24" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="146" y="52" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-family="monospace">① k1=a</text>
    <rect x="36" y="66" width="220" height="24" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="146" y="82" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-family="monospace">② k2=x</text>
    <rect x="36" y="96" width="220" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="146" y="112" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-family="monospace">③ k1=b(蓋掉 a)</text>
    <rect x="36" y="126" width="220" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="146" y="142" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-family="monospace">④ k2=∅(刪除)</text>
    <text x="146" y="168" fill="#9aa4b2" font-size="7.2" text-anchor="middle">每一筆「改變」都是一個事件,依序排好</text>
    <path d="M266 78 C 310 70, 330 70, 368 78" fill="none" stroke="#54b890" stroke-width="1.6" marker-end="url(#sd)"/>
    <text x="318" y="62" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">摺疊到現在(套用每筆)</text>
    <path d="M368 110 C 330 118, 310 118, 266 110" fill="none" stroke="#d6a45c" stroke-width="1.6" marker-end="url(#sd2)"/>
    <text x="318" y="132" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">每次改動發一筆(changelog)</text>
    <text x="470" y="24" fill="#54b890" font-size="9.6" text-anchor="middle" font-weight="bold">表:當下的狀態</text>
    <rect x="386" y="52" width="168" height="64" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.6"/>
    <text x="470" y="76" fill="#e6e6e6" font-size="8.4" text-anchor="middle" font-family="monospace">k1 = b</text>
    <text x="470" y="98" fill="#9aa4b2" font-size="8" text-anchor="middle" font-family="monospace">(k2 已刪)</text>
    <text x="470" y="138" fill="#9aa4b2" font-size="7.2" text-anchor="middle">同一份資訊,凍結在「現在」</text>
    <rect x="30" y="184" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="201" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-weight="bold">log compaction=只留每個 key 最後一筆(能重建表的最小流)· materialized view=一直在摺疊的表</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">流</b>是「每一次改變」的序列;把它從頭到尾<b style="color:#54b890">摺疊(依序套用)</b>,就得到<b style="color:#54b890">表</b>——當下的狀態。反過來,把表的<b style="color:#d6a45c">每次改動發成一筆事件</b>,就還原出流。工程師版的說法:<b>表是流的積分,流是表的微分</b>。一堆你見過的東西是它的化身:<a href="/blog/kafka-delivery/">log compaction</a>(只留每 key 最後一筆=能重建表的最小流)、materialized view(一張持續在摺疊的表)、<a href="/blog/redis-replication/">複製串流</a>(把 leader 的表變回流、傳給 follower 再摺回表)。<a href="/blog/ddia-consistency-consensus/">狀態機複製</a>其實也是它:log 是流、每台節點的狀態是表</figcaption>
</figure>

這個等價的實用後果:**你可以永遠保留「流」,把「表」當成隨時可拋、隨時可重建的衍生品。** 快取壞了?從 log 重摺一次。想加一個新的搜尋索引?從 log 的開頭重放一遍,新 follower 就長出來了。[[ddia-batch|批次那章的「人為容錯」]]——輸入不可變、錯了重跑——被 log 原封不動帶進了串流世界:**只要 log 還在,一切狀態都只是快取。**

## 反思

### 「誰是 source of truth?」——一題問倒九成的資料架構

雙寫那張圖,是我工作裡見過最多次的事故原型:DB 和快取不一致、ES 索引跟主庫對不上、數倉數字跟線上差一截——追到根,幾乎都是**某個地方在分頭寫兩份,而沒有人是誰的 follower**。所以我現在看任何資料架構,第一個問題永遠是:**這份資料的 source of truth 是誰?其他副本是「照同一條有序 log 跟隨」,還是「各寫各的、祈禱一致」?** 是後者,就只是還沒出事。而 CDC 之所以優雅,是它不要求你改寫應用——**它把資料庫既有的複製機制,從內部設施升級成公共接口**,讓「加一個 follower」從大工程變成訂閱一條流。

### 「表是流的積分」——第三個看懂一票的等價

這系列我收集到第三個「一個等價、看懂一票」了:[[ddia-consistency-consensus|共識=一條大家同意的 log]]、[[ddia-batch|批次=不可變輸入的純函數]]、現在**表=流的摺疊**。它一下子把散落的東西串起來:Kafka 的 compacted topic 為什麼能當 KTable 的底、materialized view 為什麼叫「物化」(把流凍成表)、[[redis-replication|Redis 複製]]為什麼傳的是命令流而不是整份資料、Kafka Streams 的 state store 為什麼敢放本地(反正 changelog 在 Kafka,掉了重摺)。連 [[medallion-architecture|Medallion]] 都能用它重新敘述:Bronze 是流的存檔,Silver/Gold 是不同深度的摺疊。**抽象的等價關係,是知識最高的壓縮率。**

### 「只要 log 還在,一切狀態都只是快取」——這句話值一個架構

寫完這篇,我想把這個系列裡最有殺傷力的一句話單獨拎出來:**把不可變的 log 當唯一的真相,把所有狀態(快取、索引、報表、甚至資料庫本身)當成可重建的衍生品。** 它把「壞了怎麼辦」這個最難的問題,降維成「重放一次 log」;把「想加新視圖」從遷移專案,降維成「起一個新 consumer 從頭讀」。這正是 [[infra-rabbitmq|log vs queue]] 那條軸的最終回報——當年選了「留著」而不是「拿走」,今天才有資格說「一切皆可重建」。當然它不免費:log 要留多久、schema 要能[[ddia-encoding|演化]]、重放要冪等,全是要繳的稅。但作為架構的**預設傾向**,我已經完全站在 log 這邊。下一篇是全書終章:把這些拼圖兜成 Kleppmann 對資料系統未來的想像。
