---
title: "起手式:五個元件與一條 CI/CD"
date: 2026-07-25
category: tech
description: "直播代購平台的當年武器庫:PostgreSQL、Django、RabbitMQ、Redis、Celery——五個 boring 元件如何各司其職,以及讓六個工程師每天上線十幾個 feature 的那條 CI/CD。重來也不換的理由。"
tags:
  - war-story
  - system-design
  - django
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 2
comments: true
draft: false
---
[[rezero-overview|全景]]鋪完,講留言、庫存那些戰役之前,先把當年的武器庫攤開——因為後面每一章的取捨,都是在這套技術棧的邊界裡做的。團隊很小:**3 個後端、3 個前端**,偶爾發包給外包 1–2 位工程師。武器庫也很樸素:**PostgreSQL、Django(API + WebSocket)、RabbitMQ、Redis、Celery**,全套跑在 GCP 上。這篇要回答兩個問題:為什麼是這五個,以及——小團隊跑得快的原因,其實不在技術棧上。

## 五個元件,三種時間尺度

這五個元件不是隨便湊的。回頭看,它們剛好是**每一種時間尺度各請一位專家**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 306" role="img" aria-label="五個元件按三種時間尺度分工。左欄同步,毫秒級,Django API 處理請求與回應。中欄即時推送,WebSocket 把客人留言即時推給主播 dashboard。右欄非同步,秒到分鐘級,RabbitMQ 當管道、Celery worker 消化抓留言、FSM 下單、開發票、寄 email、匯出訂單。三欄底下共用兩個基座:PostgreSQL 是唯一的事實,Redis 放 banned user 名單負責速度。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rsm" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker><marker id="rsg" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <text x="105" y="24" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">同步・毫秒級</text>
    <rect x="20" y="34" width="170" height="64" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="105" y="56" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">Django API</text>
    <text x="105" y="72" fill="#9aa4b2" font-size="7.2" text-anchor="middle">請求進、回應出</text>
    <text x="105" y="86" fill="#9aa4b2" font-size="7.2" text-anchor="middle">購物車・結帳・會員</text>
    <text x="290" y="24" fill="#9b6ff0" font-size="9.6" text-anchor="middle" font-weight="bold">即時・推送</text>
    <rect x="205" y="34" width="170" height="64" rx="6" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.4"/>
    <text x="290" y="56" fill="#9b6ff0" font-size="9.4" text-anchor="middle" font-weight="bold">WebSocket</text>
    <text x="290" y="72" fill="#9aa4b2" font-size="7.2" text-anchor="middle">客人留言 → 即時推給</text>
    <text x="290" y="86" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-weight="bold">主播 dashboard</text>
    <text x="475" y="24" fill="#54b890" font-size="9.6" text-anchor="middle" font-weight="bold">非同步・秒~分</text>
    <rect x="390" y="34" width="170" height="26" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/>
    <text x="475" y="51" fill="#54b890" font-size="8.4" text-anchor="middle">RabbitMQ(管道)</text>
    <line x1="475" y1="60" x2="475" y2="74" stroke="#54b890" stroke-width="1.2" marker-end="url(#rsg)"/>
    <rect x="390" y="78" width="170" height="56" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.4"/>
    <text x="475" y="96" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Celery workers</text>
    <text x="475" y="111" fill="#9aa4b2" font-size="6.8" text-anchor="middle">抓留言・FSM 下單・開發票</text>
    <text x="475" y="124" fill="#9aa4b2" font-size="6.8" text-anchor="middle">寄 email・匯出訂單</text>
    <line x1="105" y1="98" x2="105" y2="188" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rsm)"/>
    <line x1="290" y1="98" x2="220" y2="188" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rsm)"/>
    <line x1="475" y1="134" x2="475" y2="188" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rsm)"/>
    <rect x="40" y="192" width="240" height="52" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="160" y="214" fill="#e6e6e6" font-size="9.2" text-anchor="middle" font-weight="bold">PostgreSQL</text>
    <text x="160" y="230" fill="#9aa4b2" font-size="7.4" text-anchor="middle">唯一的事實:訂單・庫存・會員</text>
    <rect x="320" y="192" width="240" height="52" rx="6" fill="#3a2626" stroke="#dc4c3f" stroke-width="1.4"/>
    <text x="440" y="214" fill="#dc4c3f" font-size="9.2" text-anchor="middle" font-weight="bold">Redis</text>
    <text x="440" y="230" fill="#9aa4b2" font-size="7.4" text-anchor="middle">速度:banned user 快速判斷</text>
    <text x="290" y="278" fill="#9aa4b2" font-size="8" text-anchor="middle">三種時間尺度各請一位專家,底下一份事實、一份速度</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">五個元件的分工:同步走 Django、即時推 WebSocket、慢工交 Celery;PostgreSQL 管事實,Redis 管速度。</figcaption>
</figure>

幾個分工的細節,比圖上多講一點:

- **API 層用的是 Django Ninja。** 寫起來非常像 FastAPI——型別註記、自動 OpenAPI 文件、輕薄的 router——但底下還是完整的 Django:ORM、migration、admin 一樣不少。等於**用 FastAPI 的開發體驗,換到 Django 的生態紅利**,對只有三個後端的團隊是雙倍划算。
- **WebSocket 的服務對象是主播,不是客人。** 它唯一的工作,是把客人留言即時推到主播 dashboard——主播要看現場聊天才能帶節奏。客人的下單可以慢幾秒(尖峰時甚至幾分鐘),但主播的視野必須是現場。整個系統的**延遲預算全押在主播體驗上**:直播的節奏由主播控,主播不斷貨、不喊錯,客訴自然少。這個取捨後面每一章都會再出現。
- **RabbitMQ 從頭到尾只做一件事:當 [[infra-rabbitmq|Celery]] 的管道。** 所有適合非同步的工作都在 Celery 上:抓留言、FSM 批次下單、開發票、寄 email、匯出訂單。發票這種又慢又不能失敗的外部呼叫,跟抓留言這種每兩秒跑一次的迴圈,天生就不該擠在同一條請求路徑上。
- **Redis 只放 banned user,沒有 session。** 認證直接用 JWT、權限塞在 token 裡——完全 stateless,每台 API server 都能獨立驗,不用查任何共享狀態。而 JWT 的教科書弱點是「發出去就收不回來」;Redis 那份黑名單,恰好就是**撤銷機制**:留言進來先問 Redis 在不在名單裡,在就直接不理。無狀態的快,加一個集中式的否決權——這套組合拳我們當年是憑直覺拼出來的,後來才知道它就是業界的標準解法。Redis 重啟怎麼辦?從 DB 的黑名單表重建——**快速判斷放 Redis,事實永遠在 DB**,這是 [[redis-cache-patterns|cache]] 的正確姿勢。

## 一條 CI/CD:每天十幾個 feature 的底氣

技術棧樸素,但 pipeline 很完整——這才是當年真正的競爭力:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 190" role="img" aria-label="當年的 CI/CD 流程。開發者 push 之後,GitHub Actions 跑測試與驗證;採 GitLab flow 分支策略,合進 staging 分支就自動部署到 staging 環境;要上正式環境則 push prod 分支,進 Cloud Build 等人工按下核准才部署到 GCP 正式環境。成果是每天團隊可以上線十幾個 feature。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rsc" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker></defs>
    <rect x="16" y="40" width="96" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="64" y="59" fill="#e6e6e6" font-size="8.6" text-anchor="middle" font-weight="bold">push</text>
    <text x="64" y="73" fill="#9aa4b2" font-size="6.8" text-anchor="middle">GitLab flow 分支</text>
    <rect x="130" y="40" width="118" height="44" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="189" y="59" fill="#4f6df5" font-size="8.6" text-anchor="middle" font-weight="bold">GitHub Actions</text>
    <text x="189" y="73" fill="#9aa4b2" font-size="6.8" text-anchor="middle">測試+驗證擋關</text>
    <rect x="266" y="16" width="130" height="40" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.3"/>
    <text x="331" y="33" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">staging:自動部署</text>
    <text x="331" y="47" fill="#9aa4b2" font-size="6.8" text-anchor="middle">push 了就上</text>
    <rect x="266" y="68" width="130" height="40" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="331" y="85" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">prod:Cloud Build</text>
    <text x="331" y="99" fill="#9aa4b2" font-size="6.8" text-anchor="middle">人工核准後才部署</text>
    <rect x="428" y="40" width="130" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="493" y="59" fill="#e6e6e6" font-size="8.6" text-anchor="middle" font-weight="bold">GCP</text>
    <text x="493" y="73" fill="#9aa4b2" font-size="6.8" text-anchor="middle">全套跑在雲上</text>
    <line x1="112" y1="62" x2="128" y2="62" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rsc)"/>
    <line x1="248" y1="55" x2="264" y2="40" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rsc)"/>
    <line x1="248" y1="70" x2="264" y2="85" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rsc)"/>
    <line x1="396" y1="36" x2="426" y2="55" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rsc)"/>
    <line x1="396" y1="88" x2="426" y2="70" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rsc)"/>
    <text x="290" y="150" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">成果:六個工程師,每天上線十幾個 feature</text>
    <text x="290" y="168" fill="#9aa4b2" font-size="7.6" text-anchor="middle">staging 推了就上、prod 一顆核准鈕、CI 永遠擋在前面</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">分支策略 GitLab flow、CI 在 GitHub Actions、CD 在 Cloud Build——三個平台各管一段,但開發者只感覺到「push 完就上了」。</figcaption>
</figure>

流程只有三句話:push 之後 GitHub Actions 跑測試與驗證;合進 staging 分支就自動部署,想試什麼推上去馬上看;要上正式環境,推 prod 分支、到 Cloud Build 按一顆核准鈕。**staging 零摩擦、prod 一道人閘、CI 永遠擋在最前面**——就這樣,六個工程師的團隊每天可以上線十幾個 feature。

我後來的結論是:**技術棧決定你能做什麼,CI/CD 決定你做多快。** boring tech 誰都會選,但同樣五個元件,有的團隊一週上一次版都心驚膽跳。差別從來不在元件,在 push 到上線之間有多少人工步驟——每多一步,疊代就慢一截,而小團隊唯一的優勢就是快。

## 反思

### 重來也不換

這是我想了很久之後的誠實答案:**這五個元件,重來一次我全部保留。** 最大的理由是 Django admin——它的地位幾乎無可取代,但角色要講清楚:**admin 只給工程師用**。它是工程師的安全操作台——比直接對 DB 下 SQL 安全得多,設定 Celery 排程、處理各種花式的一次性需求,註冊個 model 就有介面;營運和客服的介面則是自建的(這個團隊本來就以好用的內部工具為傲,後台那章細講)。對只有 3 個後端的團隊,admin 等於免費多了一層「不會手滑」的維運介面。第二個理由是 Celery:配上 RabbitMQ 和 heartbeat 排程,你就有了**一套類似 [[infra-airflow|Airflow]] 的能力,但完全不用管 Airflow 的維運**。抓留言、批次下單、發票、對帳 job 全跑在上面。工作流平台是好東西,但它有自己的伺服器要養、自己的坑要踩——在每天十幾個 feature 的節奏裡,「不用管維運」本身就是最大的 feature。

### 複雜度預算要花在刀口上

小團隊的複雜度預算是固定的:你在 infra 上花掉一點,業務上就少一點。當年這套選擇的高明之處(老實說有一半是運氣),是把預算幾乎全留給了業務——留言解析的 FSM、庫存的不變量、金流的冪等,這些才是這個產品的難點。infra 全選最無聊的:每個元件都成熟到不會半夜給你驚喜,文件多到外包工程師進來一週就能動手。[[pain-before-power|先痛過,才知道工具在解什麼]]——反過來也成立:還沒痛過的地方,先不要買解藥。

### 快是真的,穩是後來補課的

但我必須把另一面也講出來:這章講的「快」,是用「穩」欠債換的。上線初期 API server 只開一台 process、單一 CPU,直播一開就被打爆,緊急上 traefik 開了四個行程才扛住;那個年代團隊裡沒有 SRE 這個角色,所有 infrastructure 都是我這個 backend lead 兼著扛,每場直播人肉跟播、提心吊膽。CI/CD 讓我們把 feature 送上線送得飛快——但**上線之後會發生什麼,當年幾乎是裸奔**。這筆帳我留到維運那章算,這裡先記一句:起手式決定你跑多快,跑得久不久,是另一門功課。
