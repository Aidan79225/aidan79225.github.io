---
title: "採集層:資料怎麼進來——OpenTelemetry 與 Alloy"
date: 2026-07-25
category: tech
tags:
  - observability
  - opentelemetry
series: "Grafana LGTM 可觀測性"
seriesOrder: 6
comments: true
draft: false
---
三支柱講完了,但有個前提一直被我跳過:**訊號要先「進得來」,才有得看**。[[obs-intro|第一篇]]資料流圖中間那格「採集層」,這篇把它拆開。兩個主角:**OpenTelemetry**(統一三種訊號的標準)與 **Grafana Alloy**(收集、處理、轉送的那隻 agent)。而理解採集層的價值,先看沒有它的世界有多糟。

## 為什麼要一層 collector:把 M×N 變成 M+N

最直覺的做法,是讓每個 app **直接**把 metrics 寫給 Mimir、log 寫給 Loki、trace 寫給 Tempo。app 一多,這條路就崩了:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="直連與經過 collector 的對比。左邊直連:三個 app 各自直接連三個後端,連線是 M 乘 N 條;每個 app 都要知道每個後端的位址與格式、自己處理批次與重試,換一個後端要改所有 app。右邊經過 collector:app 只用 OTLP 一種協定丟給本地的 collector(Alloy),由 collector 統一做批次、重試、脫敏、轉換,再路由到三個後端;連線變 M 加 N 條,換後端只改 collector 設定,app 一行不動。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="col" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e05a7d"/></marker><marker id="colg" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <line x1="290" y1="14" x2="290" y2="200" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#e05a7d" font-size="9.4" text-anchor="middle" font-weight="bold">✗ 直連:M × N 條耦合</text>
    <rect x="30" y="40" width="64" height="22" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="62" y="55" fill="#e6e6e6" font-size="7" text-anchor="middle">app 1</text>
    <rect x="106" y="40" width="64" height="22" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="138" y="55" fill="#e6e6e6" font-size="7" text-anchor="middle">app 2</text>
    <rect x="182" y="40" width="64" height="22" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="214" y="55" fill="#e6e6e6" font-size="7" text-anchor="middle">app 3</text>
    <rect x="30" y="128" width="64" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="62" y="143" fill="#4f6df5" font-size="7" text-anchor="middle">Mimir</text>
    <rect x="106" y="128" width="64" height="22" rx="4" fill="#26324a" stroke="#54b890" stroke-width="1.2"/><text x="138" y="143" fill="#54b890" font-size="7" text-anchor="middle">Loki</text>
    <rect x="182" y="128" width="64" height="22" rx="4" fill="#26324a" stroke="#9b6ff0" stroke-width="1.2"/><text x="214" y="143" fill="#9b6ff0" font-size="7" text-anchor="middle">Tempo</text>
    <line x1="62" y1="62" x2="62" y2="126" stroke="#e05a7d" stroke-width="0.9" marker-end="url(#col)"/><line x1="62" y1="62" x2="134" y2="126" stroke="#e05a7d" stroke-width="0.9" marker-end="url(#col)"/><line x1="62" y1="62" x2="206" y2="126" stroke="#e05a7d" stroke-width="0.9" marker-end="url(#col)"/>
    <line x1="138" y1="62" x2="66" y2="126" stroke="#e05a7d" stroke-width="0.9" marker-end="url(#col)"/><line x1="138" y1="62" x2="138" y2="126" stroke="#e05a7d" stroke-width="0.9" marker-end="url(#col)"/><line x1="138" y1="62" x2="210" y2="126" stroke="#e05a7d" stroke-width="0.9" marker-end="url(#col)"/>
    <line x1="214" y1="62" x2="70" y2="126" stroke="#e05a7d" stroke-width="0.9" marker-end="url(#col)"/><line x1="214" y1="62" x2="142" y2="126" stroke="#e05a7d" stroke-width="0.9" marker-end="url(#col)"/><line x1="214" y1="62" x2="214" y2="126" stroke="#e05a7d" stroke-width="0.9" marker-end="url(#col)"/>
    <text x="146" y="172" fill="#e05a7d" font-size="7.2" text-anchor="middle" font-weight="bold">每個 app 都要懂每個後端(位址/格式/重試)</text>
    <text x="146" y="188" fill="#9aa4b2" font-size="7" text-anchor="middle">換一個後端 → 改「所有」app</text>
    <text x="434" y="26" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">✓ 經過 collector:M + N 條</text>
    <rect x="322" y="40" width="64" height="22" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="354" y="55" fill="#e6e6e6" font-size="7" text-anchor="middle">app 1</text>
    <rect x="398" y="40" width="64" height="22" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="430" y="55" fill="#e6e6e6" font-size="7" text-anchor="middle">app 2</text>
    <rect x="474" y="40" width="64" height="22" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="506" y="55" fill="#e6e6e6" font-size="7" text-anchor="middle">app 3</text>
    <line x1="354" y1="62" x2="414" y2="88" stroke="#54b890" stroke-width="1.1" marker-end="url(#colg)"/><line x1="430" y1="62" x2="430" y2="88" stroke="#54b890" stroke-width="1.1" marker-end="url(#colg)"/><line x1="506" y1="62" x2="446" y2="88" stroke="#54b890" stroke-width="1.1" marker-end="url(#colg)"/>
    <text x="530" y="80" fill="#54b890" font-size="6.6" text-anchor="middle">OTLP 一種協定</text>
    <rect x="366" y="90" width="128" height="30" rx="6" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.6"/><text x="430" y="103" fill="#9b6ff0" font-size="8" text-anchor="middle" font-weight="bold">Collector(Alloy)</text><text x="430" y="114" fill="#9aa4b2" font-size="6.4" text-anchor="middle">批次・重試・脫敏・路由</text>
    <line x1="394" y1="120" x2="358" y2="146" stroke="#54b890" stroke-width="1.1" marker-end="url(#colg)"/><line x1="430" y1="120" x2="430" y2="146" stroke="#54b890" stroke-width="1.1" marker-end="url(#colg)"/><line x1="466" y1="120" x2="502" y2="146" stroke="#54b890" stroke-width="1.1" marker-end="url(#colg)"/>
    <rect x="322" y="148" width="64" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="354" y="163" fill="#4f6df5" font-size="7" text-anchor="middle">Mimir</text>
    <rect x="398" y="148" width="64" height="22" rx="4" fill="#26324a" stroke="#54b890" stroke-width="1.2"/><text x="430" y="163" fill="#54b890" font-size="7" text-anchor="middle">Loki</text>
    <rect x="474" y="148" width="64" height="22" rx="4" fill="#26324a" stroke="#9b6ff0" stroke-width="1.2"/><text x="506" y="163" fill="#9b6ff0" font-size="7" text-anchor="middle">Tempo</text>
    <text x="434" y="190" fill="#54b890" font-size="7.2" text-anchor="middle" font-weight="bold">換後端 → 只改 collector 設定,app 一行不動</text>
    <rect x="30" y="206" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="223" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">M 個 app × N 個後端 → M + N:app 只認一種協定(OTLP),後端只面對 collector</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e05a7d">直連</b>是 M×N 條耦合:每個 app 都得知道每個後端的位址、格式,自己搞批次與重試;換一個後端(Loki 換版、搬家、換廠商)得改<b>所有</b> app。<b style="color:#54b890">加一層 collector</b> 把它變成 M+N:app 只用 <b>OTLP</b> 一種協定丟給本地的 <b style="color:#9b6ff0">Alloy</b>,批次、重試、<b>脫敏</b>(把 PII 濾掉)、路由全部集中在一處;換後端只改 collector 設定。跟 <a href="/blog/kafka-ecosystem/">Schema Registry</a>、<a href="/blog/k8s-networkpolicy-cni/">CNI</a> 同一種「中間標準層」的智慧——<b>解耦生產者與消費者,是基礎設施百用不膩的一招</b></figcaption>
</figure>

## OpenTelemetry:三種訊號,一套標準

採集層能這麼乾淨,靠的是 **OpenTelemetry(OTel)** 這個業界統一標準。它解決的歷史問題是:以前**三支柱各有各的 SDK 與協定**——metrics 用 Prometheus client、log 用各家 shipper、trace 用 Jaeger/Zipkin——三套東西各自為政,**log 裡想帶個 trace-id 都要自己接**。OTel 把三者統一:**一套 SDK、一個協定(OTLP)、共用同一份 context**。實務上兩層:

- **Instrumentation(埋測)**:**自動埋測**先上——各語言的 OTel agent 自動幫 HTTP server/client、DB driver、訊息佇列產生 trace 與 metrics,常常**零改碼**就有八成覆蓋;**手動埋測**再補——業務關鍵處自己開 span、記自訂 metric。
- **共用 context 是關鍵紅利**:因為三種訊號出自同一套 SDK,**trace-id 會自動塞進 log、exemplar 會自動掛上 metric**——[[obs-traces-tempo|上一篇]]說「找 trace-id 的活交給 metric 和 log」,能成立的前提就是這裡接好了。這也是下一篇「三支柱互跳」的地基。

而 **Grafana Alloy** 就是那隻在你環境裡跑的 collector(OTel Collector 的 Grafana 發行版,前身 Grafana Agent):收 OTLP、也能像 [[obs-metrics-prometheus|Prometheus]] 一樣主動 scrape `/metrics`、也能撿容器的 log 檔——收齊後統一處理、轉送 LGTM。

## 在 K8s 上怎麼佈:DaemonSet、sidecar,還是 gateway

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 234" role="img" aria-label="collector 在 K8s 上的三種佈法。一,DaemonSet:每台 node 跑一隻 agent,收本機所有 pod 的訊號,便宜、預設首選。二,sidecar:每個 pod 塞一隻,隔離最好但成本乘上 pod 數,特殊需求才用。三,中央 gateway:一組 Deployment 當統一出口,做跨節點的處理——tail sampling 必須在這裡,因為整條 trace 要聚在一處才能判斷留不留。下方:實務常見兩層=DaemonSet 就地收、gateway 集中管,tail sampling、全域限流、統一出口都放 gateway。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="dep6" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="193" y1="14" x2="193" y2="176" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="387" y1="14" x2="387" y2="176" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="97" y="26" fill="#54b890" font-size="9.2" text-anchor="middle" font-weight="bold">① DaemonSet(預設首選)</text>
    <rect x="26" y="38" width="142" height="84" rx="8" fill="none" stroke="#3a4154" stroke-width="1.3"/><text x="97" y="52" fill="#9aa4b2" font-size="7" text-anchor="middle">node</text>
    <rect x="38" y="60" width="50" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="63" y="74" fill="#e6e6e6" font-size="6.6" text-anchor="middle">pod</text>
    <rect x="94" y="60" width="50" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="119" y="74" fill="#e6e6e6" font-size="6.6" text-anchor="middle">pod</text>
    <rect x="38" y="90" width="106" height="22" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="91" y="105" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">Alloy ×1(收整台)</text>
    <line x1="63" y1="80" x2="70" y2="88" stroke="#9aa4b2" stroke-width="0.9" marker-end="url(#dep6)"/><line x1="119" y1="80" x2="112" y2="88" stroke="#9aa4b2" stroke-width="0.9" marker-end="url(#dep6)"/>
    <text x="97" y="140" fill="#54b890" font-size="7.2" text-anchor="middle" font-weight="bold">每 node 一隻,成本固定</text>
    <text x="97" y="156" fill="#9aa4b2" font-size="6.8" text-anchor="middle">共享:一隻掛,整台暫時失明</text>
    <text x="290" y="26" fill="#d6a45c" font-size="9.2" text-anchor="middle" font-weight="bold">② Sidecar(特例才用)</text>
    <rect x="222" y="38" width="136" height="84" rx="8" fill="none" stroke="#3a4154" stroke-width="1.3"/><text x="290" y="52" fill="#9aa4b2" font-size="7" text-anchor="middle">pod</text>
    <rect x="234" y="62" width="52" height="44" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="260" y="87" fill="#e6e6e6" font-size="6.6" text-anchor="middle">app</text>
    <rect x="294" y="62" width="52" height="44" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="320" y="83" fill="#d6a45c" font-size="6.6" text-anchor="middle">agent</text><text x="320" y="95" fill="#9aa4b2" font-size="6" text-anchor="middle">每 pod 一隻</text>
    <text x="290" y="140" fill="#d6a45c" font-size="7.2" text-anchor="middle" font-weight="bold">隔離最好、設定可各自客製</text>
    <text x="290" y="156" fill="#e0733a" font-size="6.8" text-anchor="middle">成本 × pod 數,貴</text>
    <text x="483" y="26" fill="#9b6ff0" font-size="9.2" text-anchor="middle" font-weight="bold">③ 中央 gateway</text>
    <rect x="416" y="44" width="134" height="34" rx="6" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.6"/><text x="483" y="58" fill="#9b6ff0" font-size="7.6" text-anchor="middle" font-weight="bold">gateway(Deployment)</text><text x="483" y="70" fill="#9aa4b2" font-size="6.2" text-anchor="middle">統一出口・可水平擴</text>
    <text x="483" y="96" fill="#e6e6e6" font-size="7" text-anchor="middle">跨節點的處理放這:</text>
    <text x="483" y="112" fill="#9b6ff0" font-size="7" text-anchor="middle" font-weight="bold">tail sampling(整條 trace 聚一處才能判斷)</text>
    <text x="483" y="128" fill="#9aa4b2" font-size="6.8" text-anchor="middle">全域限流・統一對外出口(防火牆只開一個洞)</text>
    <text x="483" y="156" fill="#9aa4b2" font-size="6.8" text-anchor="middle">單獨用少;通常搭 ① 當第二層</text>
    <rect x="30" y="186" width="520" height="40" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="203" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">實務常見「兩層」:DaemonSet 就地收(便宜)→ gateway 集中管(取樣/限流/出口)</text>
    <text x="290" y="219" fill="#9aa4b2" font-size="7.4" text-anchor="middle">起步只要 ①;要 tail sampling 或多叢集統一出口時,再加 ③</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#54b890">① DaemonSet</b>:每台 node 跑一隻 Alloy,收本機所有 pod 的訊號——成本固定、佈署簡單,<b>預設首選</b>。<b style="color:#d6a45c">② Sidecar</b>:每 pod 塞一隻,隔離最好但成本乘上 pod 數,特殊隔離需求才用。<b style="color:#9b6ff0">③ 中央 gateway</b>:一組可水平擴的 Deployment 當統一出口,<b>跨節點的處理只能放這</b>——最典型的是 <a href="/blog/obs-traces-tempo/">tail sampling</a>:要「看完整條 trace 再決定留不留」,而一條 trace 的 span 散在多台 node,必須先聚到一處。實務常見<b>兩層</b>:DaemonSet 就地收、gateway 集中管——起步只要 ①,痛了再加 ③</figcaption>
</figure>

## 反思

### 「中間加一層標準」是基礎設施最划算的一筆投資

M×N 變 M+N 這張圖,畫的時候我一直有既視感——[[kafka-ecosystem|Schema Registry]] 之於事件格式、[[k8s-networkpolicy-cni|CNI/CSI]] 之於 K8s 的網路與儲存、[[ddia-encoding|OTLP 之於觀測訊號]]——全是同一招:**在生產者與消費者之間立一個標準,兩邊就再也不用認識彼此。** 它的回報在「變動的那天」兌現:換掉 Loki、加一個新後端、或哪天離開 Grafana 生態,app 一行不用改。所以我把「埋測一律走 OTel,不用任何廠商私有 SDK」當成團隊的硬規矩——**埋測是散在幾百個服務裡、最難回頭改的程式碼,它必須綁標準,不能綁廠商。** 這是可觀測性領域裡,少數「現在多想一步、未來省一個大型專案」的決策。

### OTel 真正的殺手級價值,是「共用 context」

很多人把 OTel 理解成「又一套 SDK」,但它真正的殺手鐧是**三種訊號出自同一套 context**:trace-id 自動進 log、exemplar 自動掛上 metric——「從指標尖峰跳到那條 trace、再跳到那行 log」這條[[obs-intro|黃金路徑]],不是 Grafana 端的魔法,是**採集端就把關聯 ID 種好了**。這讓我想通一個常見的失敗模式:很多團隊三支柱都有、卻各自為政(metrics 一套 agent、log 一套 shipper、trace 另一套),結果事故當下三邊資料**對不起來**,一塊玻璃變三個孤島。**關聯不是查詢時才做的事,是採集時就要種下的事**——這句話是我看採集層架構時的第一檢查點,也是下一篇「三支柱互跳」的引子。

### 佈署拓撲的選擇,又是那道「成本 vs 隔離 vs 集中」的老題

DaemonSet、sidecar、gateway 三選,判準跟我在整個 infra 之旅看過的每一次都同構:**共享省錢(DaemonSet)、隔離貴但乾淨(sidecar)、集中才能做全域決策(gateway)**。最有意思的是 tail sampling 這個例子——它從**原理上**就規定了拓撲:整條 trace 的 span 散在多台機器,「看完再決定」就必須先聚到一處,所以這功能**只能**活在 gateway 層。這提醒我一件事:佈署拓撲很多時候不是風格選擇,是**功能的物理需求**反推出來的。我的實務順位照舊:**DaemonSet 起步,別過早架 gateway**——等你真的需要 tail sampling 或多叢集統一出口,那個「痛」自然會把第二層叫出來。[[pain-before-power|先確認痛點]],在採集層一樣適用。
