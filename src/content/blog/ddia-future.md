---
title: "資料系統的未來:拆開的資料庫、Kappa,與端到端的正確性(完結)"
date: 2026-07-24
category: tech
description: "DDIA 終章,Kleppmann 把整本書收攏成一個大膽的視角:未來的資料架構,是一台『由內翻外的資料庫』——把資料庫裡捆在一起的元件(儲存、索引、快取、materialized view)拆開,用一條 log 當中樞,讓各個特化系統當它的 follower。你的資料平台,其實就是一台拆開的資料庫。加上兩個實務收尾:lambda vs kappa(兩套邏輯 vs 一條可重播的 log),以及最誠實的一課——exactly-once 走到底,正確性的最後一哩永遠在端到端(request id、稽核),不能盲信任何中間件。"
tags:
  - distributed-systems
  - book-notes
  - data-engineering
series: "Designing Data-Intensive Applications 讀書筆記"
seriesOrder: 12
comments: true
draft: false
---
終章。前面十一章把儲存、複製、分區、交易、共識、批次、串流一塊塊講完,Kleppmann 在這章把它們收攏成一個大膽的視角:**別再把「資料庫」當成一個盒子——把它拆開。** 而讀到這裡你會發現,這個「未來」你其實已經住在裡面了。

## Unbundling:你的資料平台,就是一台拆開的資料庫

一台資料庫,其實是一堆功能的**捆綁包**:儲存引擎、索引、快取、materialized view、複製 log——全部裝在一個盒子裡,由 DB 內部保證它們一致。Kleppmann 的觀察是:**現代資料平台正在把這個盒子拆開**——每個功能由一個特化系統負責,而讓它們一致的膠水,正是[[ddia-streaming|上一篇]]的那條 log:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="unbundling the database。上半:傳統資料庫是一個盒子,裡面捆著儲存引擎、索引、快取、materialized view、複製 log,由 DB 內部保證一致。下半:拆開的資料平台——中間一條 log(Kafka)當中樞,周圍的特化系統各自認領一個功能:OLTP 資料庫負責儲存與交易、Elasticsearch 負責索引、Redis 負責快取、數倉負責 materialized view,每個都是 log 的 follower,照同一順序消費保持一致。下方結論:同一台資料庫,由內翻外——你的資料平台就是一台拆開的資料庫,而讓它不散架的,是那條 log。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="ub" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <text x="290" y="18" fill="#e6e6e6" font-size="9.6" text-anchor="middle" font-weight="bold">傳統:一個盒子,全部捆在一起</text>
    <rect x="120" y="26" width="340" height="46" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <rect x="132" y="36" width="70" height="26" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/><text x="167" y="53" fill="#9aa4b2" font-size="6.6" text-anchor="middle">儲存引擎</text>
    <rect x="208" y="36" width="56" height="26" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/><text x="236" y="53" fill="#9aa4b2" font-size="6.6" text-anchor="middle">索引</text>
    <rect x="270" y="36" width="56" height="26" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/><text x="298" y="53" fill="#9aa4b2" font-size="6.6" text-anchor="middle">快取</text>
    <rect x="332" y="36" width="60" height="26" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1"/><text x="362" y="53" fill="#9aa4b2" font-size="6.6" text-anchor="middle">mat. view</text>
    <rect x="398" y="36" width="50" height="26" rx="4" fill="#1f2330" stroke="#d6a45c" stroke-width="1"/><text x="423" y="53" fill="#d6a45c" font-size="6.6" text-anchor="middle">log</text>
    <text x="290" y="90" fill="#9aa4b2" font-size="8.6" text-anchor="middle">↓ 拆開(unbundle),每個功能交給一個特化系統 ↓</text>
    <rect x="180" y="104" width="220" height="26" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.6"/><text x="290" y="121" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">log 當中樞(Kafka)— 定順序的膠水</text>
    <line x1="212" y1="130" x2="128" y2="158" stroke="#54b890" stroke-width="1.1" marker-end="url(#ub)"/>
    <line x1="264" y1="130" x2="242" y2="158" stroke="#54b890" stroke-width="1.1" marker-end="url(#ub)"/>
    <line x1="316" y1="130" x2="338" y2="158" stroke="#54b890" stroke-width="1.1" marker-end="url(#ub)"/>
    <line x1="368" y1="130" x2="452" y2="158" stroke="#54b890" stroke-width="1.1" marker-end="url(#ub)"/>
    <rect x="64" y="160" width="128" height="40" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="128" y="176" fill="#e6e6e6" font-size="7.6" text-anchor="middle">OLTP DB</text><text x="128" y="190" fill="#9aa4b2" font-size="6.6" text-anchor="middle">儲存 + 交易</text>
    <rect x="200" y="160" width="84" height="40" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="242" y="176" fill="#e6e6e6" font-size="7.6" text-anchor="middle">Elasticsearch</text><text x="242" y="190" fill="#9aa4b2" font-size="6.6" text-anchor="middle">= 索引</text>
    <rect x="292" y="160" width="84" height="40" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="334" y="176" fill="#e6e6e6" font-size="7.6" text-anchor="middle">Redis</text><text x="334" y="190" fill="#9aa4b2" font-size="6.6" text-anchor="middle">= 快取</text>
    <rect x="384" y="160" width="132" height="40" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="450" y="176" fill="#e6e6e6" font-size="7.6" text-anchor="middle">數倉 / Gold 層</text><text x="450" y="190" fill="#9aa4b2" font-size="6.6" text-anchor="middle">= materialized view</text>
    <text x="290" y="216" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">每個系統都是 log 的 follower,照同一順序消費 → 各自一致</text>
    <rect x="60" y="226" width="460" height="22" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="241" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-weight="bold">你的資料平台 = 一台「由內翻外」的資料庫;讓它不散架的,是那條 log</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">上半是傳統資料庫:儲存、索引、快取、materialized view <b>捆在一個盒子裡</b>,由 DB 內部保證一致。下半是 unbundling:同樣的功能被<b>特化系統各自認領</b>——OLTP DB 管儲存與交易、<b>Elasticsearch 就是拆出來的索引、Redis 就是拆出來的快取、數倉就是拆出來的 materialized view</b>——而讓它們一致的,是中間那條 <b style="color:#d6a45c">log</b>(每個系統都是它的 <a href="/blog/ddia-streaming/">follower</a>)。換句話說:<a href="/blog/infra-platform/">你養的那個資料平台</a>,本質上是一台<b>由內翻外的資料庫</b>——設計它的紀律,也該跟資料庫一樣:log 定順序、衍生資料可重建</figcaption>
</figure>

這個視角的實用價值:**「幫平台加一個搜尋功能」= 「幫這台大資料庫建一個索引」**——做法也一樣:從 log 重放、長出一個新 follower,不碰現有系統。資料庫內建索引時你信任它自動維護;拆開之後,**維護「索引跟上主資料」的責任落到了你頭上**——這正是資料工程師這個職業存在的深層原因。

## Lambda vs Kappa:兩套邏輯,還是一條 log

「同一份資料要同時算得準(批次)又算得快(即時)」,歷史上有兩個答案:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 222" role="img" aria-label="lambda 與 kappa 架構對比。左邊 lambda:資料同時進兩條軌,batch layer 定期全量重算求準、speed layer 串流補即時,查詢時要把兩邊結果合併;同一套業務邏輯要寫兩份、批次與串流框架各一,兩倍維護、兩邊對不上時難排查。右邊 kappa:只有一條可重播的 log 與一套串流邏輯;平時串流一直算,要重算歷史就起一個新 job 從 log 開頭重放、追上後切換過去;一套程式碼,重算靠重放。前提是 log 保留得夠久、重放 throughput 夠。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="lk12" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="14" x2="290" y2="186" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#e0733a" font-size="9.4" text-anchor="middle" font-weight="bold">Lambda:兩條軌</text>
    <rect x="40" y="38" width="80" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="80" y="54" fill="#9aa4b2" font-size="7" text-anchor="middle">資料進來</text>
    <line x1="120" y1="44" x2="158" y2="70" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lk12)"/><line x1="120" y1="56" x2="158" y2="112" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lk12)"/>
    <rect x="160" y="62" width="104" height="34" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="212" y="76" fill="#e6e6e6" font-size="7.2" text-anchor="middle">batch layer</text><text x="212" y="89" fill="#9aa4b2" font-size="6.4" text-anchor="middle">定期全量重算(準)</text>
    <rect x="160" y="104" width="104" height="34" rx="5" fill="#26324a" stroke="#9b6ff0" stroke-width="1.3"/><text x="212" y="118" fill="#e6e6e6" font-size="7.2" text-anchor="middle">speed layer</text><text x="212" y="131" fill="#9aa4b2" font-size="6.4" text-anchor="middle">串流補即時(快)</text>
    <rect x="96" y="148" width="140" height="24" rx="5" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="166" y="164" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">查詢:兩邊結果要「合併」</text>
    <text x="146" y="196" fill="#e0733a" font-size="7.2" text-anchor="middle" font-weight="bold">✗ 同一套邏輯寫兩份(批次+串流),兩倍維護</text>
    <text x="434" y="26" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">Kappa:一條 log</text>
    <rect x="330" y="42" width="208" height="26" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/><text x="434" y="59" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">一條可重播的 log(留得夠久)</text>
    <line x1="400" y1="68" x2="384" y2="94" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lk12)"/><line x1="468" y1="68" x2="484" y2="94" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#lk12)"/>
    <rect x="330" y="96" width="106" height="34" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="383" y="110" fill="#e6e6e6" font-size="7.2" text-anchor="middle">串流 job v1</text><text x="383" y="123" fill="#9aa4b2" font-size="6.4" text-anchor="middle">一直在線上算</text>
    <rect x="444" y="96" width="106" height="34" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3" stroke-dasharray="4 3"/><text x="497" y="110" fill="#e6e6e6" font-size="7.2" text-anchor="middle">串流 job v2</text><text x="497" y="123" fill="#9aa4b2" font-size="6.4" text-anchor="middle">要重算:從頭重放</text>
    <line x1="497" y1="130" x2="440" y2="152" stroke="#54b890" stroke-width="1.1" marker-end="url(#lk12)"/>
    <text x="434" y="164" fill="#54b890" font-size="7.2" text-anchor="middle" font-weight="bold">追上後切換 → 一套程式碼,重算=重放</text>
    <text x="434" y="196" fill="#9aa4b2" font-size="7.2" text-anchor="middle">前提:log 留得夠久、重放的 throughput 撐得住</text>
    <rect x="30" y="204" width="520" height="0" rx="0" fill="none"/>
    <text x="290" y="214" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-weight="bold">邏輯改版頻繁、養不起兩套 → kappa;重算量大到串流重放不划算 → 保留批次那條</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e0733a">Lambda</b>:batch layer 定期全量重算(準)+ speed layer 串流補即時(快),查詢時合併兩邊——代價是<b>同一套業務邏輯要用兩個框架寫兩份</b>,兩倍維護,兩邊對不上時排查地獄。<b style="color:#54b890">Kappa</b>:只留一條<b>可重播的 log</b> 和一套串流邏輯;要重算歷史(改了邏輯、修了 bug),就<b>起一個新 job 從 log 開頭重放</b>、追上後切換——<a href="/blog/ddia-batch/">批次的「人為容錯」</a>用串流的形式做到了。前提是 log 留得夠久、重放 throughput 撐得住;<a href="/blog/spark-streaming/">流批統一的引擎</a>(同一套程式跑兩種模式)也在從框架層消掉「寫兩份」這個痛</figcaption>
</figure>

## 最誠實的一課:正確性的最後一哩,在端到端

全書最後的技術段落,Kleppmann 潑了一盆重要的冷水:**別盲信任何中間件的保證。** [[kafka-delivery|exactly-once]] 很強,但它的保證有邊界——資料出了那個邊界(寫進外部系統、呼叫外部 API、使用者按兩次送出),語意就斷了。真正可靠的去重,只有**端到端**的做法:請求從源頭就帶一個唯一的 **request id(冪等鍵)**,一路帶到最終寫入的地方,由終點做最後的把關——這是網路領域古老的 **end-to-end argument** 在資料系統的重演,也是 [[airflow-reliability|冪等]]那條紀律的理論根據。再往上一層,他主張系統要**稽核(audit)**:定期驗證資料的完整性(數量對不對、加總對不對),而不是假設「pipeline 沒報錯 = 資料是對的」——**沒報錯只代表沒發現錯**。這句話,正是資料品質工程的起點。

## 反思

### 「平台是一台拆開的資料庫」——這個視角把我的整張地圖翻了過來

Unbundling 是我讀完全書後座力最強的觀念。回頭看[[infra-platform|我自己養的平台]]:Kafka 是 commit log、Elasticsearch 是索引、Redis 是快取、數倉的 Gold 層是 materialized view——**我每天維運的,其實是一台攤開在 K8s 上的巨型資料庫**,而我的職責,就是資料庫核心工程師的職責:保證這些「拆開的元件」跟主資料一致。這個視角立刻給了我兩條紀律:**設計上**,任何新元件都該是 log 的 follower,而不是另一個雙寫的受害者;**債務上**,資料庫用交易「免費」保證的一致性,拆開後每一分都要自己還——所以拆之前先問:這個功能,單機資料庫真的做不到了嗎?[[pain-before-power|又是那道題]]。

### 「沒報錯 ≠ 資料是對的」——稽核是資料工程的下一站

end-to-end 那一課,對我這個角色是量身訂做的提醒。做 [[sre-monitoring|SRE]] 久了,很容易把「監控綠燈」當成「一切正常」;但 Kleppmann 點破:pipeline 全綠,只代表**系統**沒報錯,不代表**資料**是對的——筆數悄悄少了 2%、某個 join 默默對空、金額欄位單位錯了,監控一聲不吭。**系統的可靠性靠監控,資料的正確性靠稽核**——後者是獨立驗證(對帳、數量核對、不變量檢查),不是看 log。這正是我接下來想開的 Data Quality 系列要處理的主題:把「資料對不對」從一種祈禱,變成一門有指標、有告警、有 SLO 的工程。DDIA 的最後一章,剛好是那個系列最好的引言。

### 全書收官:它給的不是答案,是一套提問的框架

十二章讀完,如果要我說 DDIA 到底給了什麼,我的答案是:**一套永遠不會過時的問題清單。** 資料怎麼擺(讀的形狀)?狀態在哪、誰是 source of truth?順序由誰決定、被什麼保護?保證的邊界在哪、最後一哩誰把關?——工具會換(書裡不少範例已經老了),但這些問題會問到你退休。這也是整個部落格走到這裡的收束:DDIA 是原理層,Redis/Kafka/Spark/K8s 是實作層,SRE/LGTM 是維運層——**同一張網,原理讓你看懂工具,工具讓你驗證原理,維運讓你為兩者付出代價、也收穫敬畏**。最後,Kleppmann 選擇用整整一節倫理收尾:資料是權力,而權力需要自律——我們這行天天在決定「記錄什麼、留多久、給誰看」,那從來不只是技術決策。**能力越大的系統,越需要克制的工程師**——這本書,收在這裡。
