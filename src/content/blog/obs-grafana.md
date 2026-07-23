---
title: "Grafana:一塊玻璃,只查不存"
date: 2026-07-23
category: tech
tags:
  - observability
  - grafana
series: "Grafana LGTM 可觀測性"
seriesOrder: 2
comments: true
draft: false
---
[[obs-intro|第一篇]]那張資料流圖,最右邊那格是 Grafana。這篇把它拆開——而理解 Grafana,其實只要抓住一句反直覺的話:**它不存任何觀測資料,它只是一塊拿來「問」的玻璃。** 想通這句,它的所有特性就都通了。

## Grafana 只查不存:資料在 data source

很多人第一個誤會,是以為指標和日誌「存在 Grafana 裡」。**不是。** Grafana 手上沒有任何時序資料——它是一層**查詢 + 視覺化 + 告警**的介面。真正的資料,住在它連過去的 **data source**(Prometheus/Mimir、Loki、Tempo,甚至 PostgreSQL、CloudWatch)裡。你在儀表板上看到的每一條線,都是 Grafana **當下去 data source 問來的**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="Grafana 只查不存的架構。左邊 Grafana 是一塊玻璃,只存 dashboard 與設定、不存觀測資料,裡面有三個 panel:錯誤率、延遲 p99、錯誤 log。每個 panel 各自去右邊對應的 data source 查詢:錯誤率用 PromQL 查 Prometheus 或 Mimir、延遲用 trace query 查 Tempo、錯誤 log 用 LogQL 查 Loki。資料真正住在這些 data source 裡。關掉 Grafana，資料一點都不會少，因為它在 data source；Grafana 只是問，不是存。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="gf" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Grafana 只查不存:資料在 data source</text>
    <rect x="18" y="30" width="220" height="154" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.8"/><text x="128" y="48" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">Grafana(一塊玻璃)</text><text x="128" y="61" fill="#9aa4b2" font-size="7.2" text-anchor="middle">只存 dashboard / 設定,不存資料</text>
    <rect x="34" y="70" width="188" height="30" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="128" y="89" fill="#e6e6e6" font-size="8.2" text-anchor="middle">panel:錯誤率</text>
    <rect x="34" y="106" width="188" height="30" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="128" y="125" fill="#e6e6e6" font-size="8.2" text-anchor="middle">panel:延遲 p99</text>
    <rect x="34" y="142" width="188" height="30" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="128" y="161" fill="#e6e6e6" font-size="8.2" text-anchor="middle">panel:錯誤 log</text>
    <text x="474" y="46" fill="#9aa4b2" font-size="7.6" text-anchor="middle">資料真正住這裡 ↓</text>
    <rect x="384" y="70" width="182" height="30" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="475" y="89" fill="#4f6df5" font-size="8.4" text-anchor="middle" font-weight="bold">Prometheus / Mimir</text>
    <rect x="384" y="106" width="182" height="30" rx="5" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.4"/><text x="475" y="125" fill="#9b6ff0" font-size="8.4" text-anchor="middle" font-weight="bold">Tempo</text>
    <rect x="384" y="142" width="182" height="30" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="475" y="161" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">Loki</text>
    <line x1="222" y1="85" x2="382" y2="85" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#gf)"/><text x="302" y="79" fill="#9aa4b2" font-size="7" text-anchor="middle">PromQL</text>
    <line x1="222" y1="121" x2="382" y2="121" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#gf)"/><text x="302" y="115" fill="#9aa4b2" font-size="7" text-anchor="middle">trace query</text>
    <line x1="222" y1="157" x2="382" y2="157" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#gf)"/><text x="302" y="151" fill="#9aa4b2" font-size="7" text-anchor="middle">LogQL</text>
    <text x="290" y="202" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">關掉 Grafana,資料一點不少(它在 data source);Grafana 只是「問」,不是「存」</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">Grafana</b> 手上只有 dashboard 定義與一些設定(存在它自己一個小 DB 裡),<b>沒有任何時序資料</b>。每個 <b>panel</b> 都是「一個查詢 + 一種視覺化」,查詢當下打到對應的 <b>data source</b>——用 PromQL 問 <b style="color:#4f6df5">Prometheus/Mimir</b>、用 LogQL 問 <b style="color:#54b890">Loki</b>、用 trace 查詢問 <b style="color:#9b6ff0">Tempo</b>。這個「只查不存」的定位,正是它能<b>同時接一堆異質來源</b>、又好部署好備份的原因——因為它沒有寶貴資料要顧,truth 全在後面的 data source</figcaption>
</figure>

這個定位帶來三個好處:**Grafana 自己近乎無狀態**(掛了重開、換一台都不痛,因為資料不在它身上);**能統一異質來源**(不管後面是 Prometheus 還是雲商的監控,對它都只是「一個可以問的地方」);而**「一塊玻璃」的價值也就在這**——把散在各處的資料,收進一個地方問。分清「呈現層(Grafana)」和「儲存層(data source)」,是用好它的第一步。

## dashboard 與 panel:一個 panel 回答一個問題

Grafana 的組成很單純:**一個 dashboard = 一組 panel;一個 panel = 一個查詢 + 一種視覺化**(折線、單一數字、表格、熱圖…)。心法就一句——**一個 panel 只回答一個問題**。別把十個指標塞進一張圖,那樣事故當下沒人讀得懂;讓每個 panel 清楚地回答「錯誤率多少」「p99 延遲多少」,一眼就能掃。(什麼圖配什麼問題,系列後面的儀表板設計那篇會專門講。)

## template variable:一張儀表板,服務一百個目標

如果每個服務都手刻一張儀表板,五十個服務就是五十張、改一個共同欄位要改五十次——這跟 [[k8s-packaging|Kustomize]] 要解的跨環境重複是同一個病。Grafana 的解法是 **template variable**:把會變的部分(namespace、service…)抽成一個下拉選單,查詢裡用 `$service` 代入,一張模板就能套遍所有目標:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 196" role="img" aria-label="template variable 讓一張儀表板服務很多目標。左邊一張模板儀表板,最上面有一個下拉選單 service 目前選 checkout,底下的 panel 查詢裡用 service 變數代入，例如 rate errors 大括號 service 等於 service。換下拉，整張圖就換成另一個目標。右邊列出 checkout、payment、orders 等五十個服務，全部共用同一張圖、只是不同目標。沒有變數就得每個服務手刻一張、改一次改五十次；有變數就一張套全部。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="gf2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">一張模板 + 一個下拉 = 服務所有目標</text>
    <rect x="18" y="28" width="270" height="150" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/><text x="153" y="45" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">一張模板儀表板</text>
    <rect x="34" y="54" width="180" height="24" rx="5" fill="#1f2330" stroke="#d6a45c" stroke-width="1.3"/><text x="124" y="70" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">$service ▾ = checkout</text>
    <rect x="34" y="86" width="240" height="26" rx="4" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="154" y="103" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-family="monospace">rate(errors{service="$service"})</text>
    <rect x="34" y="118" width="240" height="26" rx="4" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="154" y="135" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-family="monospace">p99 latency of $service</text>
    <text x="153" y="163" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">換下拉 → 整張圖就換目標</text>
    <line x1="288" y1="100" x2="320" y2="100" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#gf2)"/>
    <rect x="326" y="40" width="118" height="22" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="385" y="55" fill="#e6e6e6" font-size="7.8" text-anchor="middle">checkout</text>
    <rect x="326" y="66" width="118" height="22" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="385" y="81" fill="#9aa4b2" font-size="7.8" text-anchor="middle">payment</text>
    <rect x="326" y="92" width="118" height="22" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="385" y="107" fill="#9aa4b2" font-size="7.8" text-anchor="middle">orders</text>
    <text x="385" y="133" fill="#9aa4b2" font-size="7.6" text-anchor="middle">… 五十個服務</text>
    <text x="490" y="82" fill="#9aa4b2" font-size="7.6" text-anchor="middle" transform="rotate(90 490 82)">同一張圖・不同目標</text>
    <text x="290" y="190" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">沒變數 → 五十張、改一次改五十次;有變數 → 一張套全部</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#d6a45c">Template variable</b> 把「會變的目標」抽成一個下拉選單,查詢裡用 <code>$service</code> 代入。於是<b>一張模板儀表板,就能套遍所有服務</b>——選 checkout 看 checkout、切 payment 看 payment,同一張圖、不同目標。少了它,你得為每個服務手刻一張、共同欄位改一次要改五十次。好的觀測平台<b>不是儀表板多,是「一張能套很多目標」</b>——變數是規模化的關鍵武器</figcaption>
</figure>

## dashboard as code:別用滑鼠拖出你的可靠性

最後一個工程紀律:**Grafana 的 dashboard 本質是一份 JSON**。你可以把它存進 git、用 provisioning 或 Terraform 部署,而不是靠某個人在 UI 上手動拖出來。手拖的儀表板,是拖的人腦裡的知識——他離職就沒了、無法 review、無法一鍵重建。存成程式碼,它才變成**團隊資產**。這跟我一路講的 [[k8s-intro|宣告式 + 版控]]是同一條紀律:把重要又會變的東西,從人的臨時操作,搬進可追蹤的宣告。

## 反思

### 分清「呈現層」和「儲存層」,是用好任何工具的基本功

「Grafana 只查不存」這句話,想通之後,我發現它是一把能套很多地方的尺。Grafana 是**呈現層**、data source 是**儲存層**——搞混這兩層,你會做出蠢事:以為刪了 Grafana 資料就沒了(其實資料在 data source)、或想在 Grafana 裡「存」什麼(它不是那種東西)。這個「呈現 vs 儲存」的分層,到處都是——[[obs-intro|三支柱]]的儲存 vs Grafana 的玻璃、MVC 的 view vs model、甚至 [[infra-airflow|Airflow]] 的 UI vs metadata DB。我看任何一個系統,都會先問一句:**它是在『呈現』還是在『儲存』?** 分清楚了,你就知道哪個掛了會痛、哪個換掉不痛、備份該備哪個。

### 規模化一個觀測平台,靠的是「一張套很多」,不是「圖很多」

template variable 這個小功能,背後是一個大道理。新手容易覺得「儀表板越多越專業」,結果做出一百張沒人維護、彼此重複的圖。真正能規模化的做法**恰恰相反**——是把重複的部分抽成變數,讓**一張模板服務一百個目標**。這跟我在 [[k8s-packaging|Kustomize]]、在 Airflow 那條「一份來源 + 每環境差異」是同一種思維:**規模化靠的是消除重複,不是堆數量。** 一個團隊的觀測成不成熟,我現在不看它有幾張儀表板,而看它「加一個新服務,要不要重刻一張圖」——答案是「不用、下拉多一個選項就好」的,才是做對了。

### 可版控的玻璃,才是可靠的玻璃

第一篇我說「一塊玻璃的價值,是事故當下少一層摩擦」。這篇要補一句:**那塊玻璃本身,也得是可靠的。** 一個靠某人手動點出來、沒進版控的儀表板,是脆弱的資產——它會在你最需要的時候,因為某次誤刪、某個人離職而消失。把 dashboard 存成 JSON、進 git、宣告式部署,它就從「某個人的手藝」變成「團隊能重建的資產」。這也收束回這系列的主軸:觀測的終點是**行動**,而你要在事故當下靠它行動的東西,自己絕不能是不可靠的。玻璃要透、要統一,但更根本的——**它得在你需要它的那一刻,還在那裡。**
