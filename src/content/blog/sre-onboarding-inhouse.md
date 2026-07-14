---
title: "SRE 空降一間『什麼都自建』的公司,前 90 天怎麼站穩"
date: 2026-07-13
category: tech
description: "換工作最刺激的一種,是加入一間幾乎全自建的公司——沒有現成雲服務、連 Stack Overflow 都幫不了你,因為這裡的工具全世界只有這家在用。這篇講一個 SRE 怎麼用三個角度快速啃下一套陌生系統:由外而內跟著一個真實請求走完全程、由上而下用 Grafana LGTM 全家桶(Loki/Grafana/Tempo/Mimir)看它活著的樣子、由零把整個環境重建起來逼出所有隱藏依賴,最後用前 90 天的節奏收尾。核心心法:別急著證明自己,先把系統地圖畫進腦子,先理解,後動手。"
tags:
  - sre
  - career
comments: true
draft: false
---
換工作最刺激的一種,是加入一間**幾乎什麼都自建**的公司:沒有現成的雲服務、連 Stack Overflow 都幫不上忙——因為這裡的基礎設施、部署工具,全世界只有這一家在用。你過去累積的「某某工具怎麼設定」大半失效,知識不在網路上,而是藏在**程式碼、少數幾個人的腦子、以及過去的事故紀錄裡**。

這種環境怎麼快速上手?我用**三個角度**去啃一套陌生系統——**由外而內**跟著一個請求走、**由上而下**用可觀測性看它活著的樣子、**由零重建**把所有隱藏依賴逼出來——最後用一套節奏收尾。核心心法濃縮成一句話:**別急著證明自己,先把系統的地圖畫進腦子。**

(順帶一提:自建公司通常不會連監控也從零造——很多會直接用開源的 **Grafana LGTM 全家桶**;就算他們真的自己造,LGTM 的心智模型也能套上去,所以下面我直接用它當範例。)

## 上手第一招:抓一個真實請求,跟著它走完全程

如果只能做一件事,就做這個。Wiki 上的架構圖是**理想、而且通常過期**的;真正逼你理解系統的,是挑**一個真實的使用者請求**,親手追蹤它從進來到回應,中間經過的每一跳:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 236" role="img" aria-label="上手第一招:抓一個真實請求跟它走完全程。請求從使用者,經過自建入口 LB、自建 API 服務、自建訊息佇列、資料庫。每一跳都停下來問四個問題:這是什麼元件誰維護、怎麼看它健康監控在哪、它壞了下游會怎樣、正常時流量資料長怎樣。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ob" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">抓一個真實請求,跟著它走完全程</text>
    <rect x="10" y="42" width="94" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="57" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">使用者</text><text x="57" y="74" fill="#9aa4b2" font-size="7.4" text-anchor="middle">一個真實請求</text>
    <line x1="104" y1="63" x2="118" y2="63" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob)"/>
    <rect x="120" y="42" width="94" height="42" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="167" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">自建入口 LB</text><text x="167" y="74" fill="#4f6df5" font-size="7.4" text-anchor="middle">(自建)</text>
    <line x1="214" y1="63" x2="228" y2="63" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob)"/>
    <rect x="230" y="42" width="94" height="42" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="277" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">API 服務</text><text x="277" y="74" fill="#4f6df5" font-size="7.4" text-anchor="middle">(自建框架)</text>
    <line x1="324" y1="63" x2="338" y2="63" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob)"/>
    <rect x="340" y="42" width="94" height="42" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="387" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">自建佇列</text><text x="387" y="74" fill="#4f6df5" font-size="7.4" text-anchor="middle">(自建)</text>
    <line x1="434" y1="63" x2="448" y2="63" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob)"/>
    <rect x="450" y="42" width="94" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="497" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">資料庫</text><text x="497" y="74" fill="#9aa4b2" font-size="7.4" text-anchor="middle">最終落點</text>
    <rect x="22" y="104" width="536" height="112" rx="9" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="124" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">每一跳都停下來,問這四題</text>
    <text x="46" y="150" fill="#54b890" font-size="8.8" text-anchor="start">① 這是什麼元件?誰維護?</text>
    <text x="302" y="150" fill="#54b890" font-size="8.8" text-anchor="start">② 怎麼看它健康?監控 / log 在哪?</text>
    <text x="46" y="178" fill="#54b890" font-size="8.8" text-anchor="start">③ 它壞了,下游會怎樣?</text>
    <text x="302" y="178" fill="#54b890" font-size="8.8" text-anchor="start">④ 正常時,流量 / 資料長怎樣?</text>
    <text x="290" y="204" fill="#9aa4b2" font-size="8.2" text-anchor="middle">走完一輪,你腦中就有一張「活的」架構圖——比任何 wiki 都準</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">跟著真實請求走一遍,你看到的是系統<b>現在真的長怎樣</b>——包含所有 wiki 沒寫的醜陋特例、繞路、和「暫時的」workaround。每一跳問完那四題,你不只畫出了架構圖,還順手摸清了「這裡壞掉會怎樣、我要去哪看」——那正是 SRE 的本職。這招其實就是 <a href="/blog/sre-troubleshooting/">排障</a>的分而治之,只是拿來上手</figcaption>
</figure>

這招的威力在於它**同時**幫你補齊三件事:系統長相(元件與拓撲)、可觀測性(監控與 log 在哪)、以及故障想像(每一跳壞掉的後果)。而且它是**主動**的——你不是被動聽人簡報,而是自己動手挖,挖過的東西才真的長在腦子裡。

## 看懂系統「活著的樣子」:Grafana LGTM 全家桶

「跟著請求走」時,那句「怎麼看它健康?」要有工具回答。現代可觀測性的答案是**三種訊號**(metrics、logs、traces),而 Grafana 家的 **LGTM 全家桶**剛好一種訊號配一個後端,再全部匯進 Grafana 這塊「玻璃」:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="Grafana LGTM 全家桶。三種可觀測性訊號各配一個後端,再匯進 Grafana。指標 metrics 量延遲錯誤率進 Mimir 指標長期儲存相容 Prometheus。日誌 logs 發生了什麼細節進 Loki 日誌聚合。追蹤 traces 一個請求跨服務的完整路徑進 Tempo 分散式追蹤。三者都送進 Grafana 統一儀表板查詢與告警。用法:看 metrics 發現異常、查 logs 看細節、追 traces 定位是哪一跳壞的。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="lg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Grafana LGTM:指標、日誌、追蹤,匯進同一塊玻璃</text>
    <rect x="14" y="44" width="150" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="89" y="61" fill="#e6e6e6" font-size="8.8" text-anchor="middle">指標 Metrics</text><text x="89" y="75" fill="#9aa4b2" font-size="7.6" text-anchor="middle">量 · 延遲 · 錯誤率</text>
    <line x1="164" y1="64" x2="206" y2="64" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lg)"/>
    <rect x="208" y="44" width="150" height="40" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="283" y="61" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">Mimir(M)</text><text x="283" y="75" fill="#9aa4b2" font-size="7.6" text-anchor="middle">指標長期儲存 · 相容 Prometheus</text>
    <rect x="14" y="96" width="150" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="89" y="113" fill="#e6e6e6" font-size="8.8" text-anchor="middle">日誌 Logs</text><text x="89" y="127" fill="#9aa4b2" font-size="7.6" text-anchor="middle">發生了什麼細節</text>
    <line x1="164" y1="116" x2="206" y2="116" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lg)"/>
    <rect x="208" y="96" width="150" height="40" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="283" y="113" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Loki(L)</text><text x="283" y="127" fill="#9aa4b2" font-size="7.6" text-anchor="middle">日誌聚合 · label 索引</text>
    <rect x="14" y="148" width="150" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="89" y="165" fill="#e6e6e6" font-size="8.8" text-anchor="middle">追蹤 Traces</text><text x="89" y="179" fill="#9aa4b2" font-size="7.6" text-anchor="middle">跨服務的完整路徑</text>
    <line x1="164" y1="168" x2="206" y2="168" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lg)"/>
    <rect x="208" y="148" width="150" height="40" rx="6" fill="#2b2540" stroke="#9b6ff0" stroke-width="1.4"/><text x="283" y="165" fill="#9b6ff0" font-size="9" text-anchor="middle" font-weight="bold">Tempo(T)</text><text x="283" y="179" fill="#9aa4b2" font-size="7.6" text-anchor="middle">分散式追蹤</text>
    <line x1="358" y1="64" x2="402" y2="90" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lg)"/>
    <line x1="358" y1="116" x2="402" y2="116" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lg)"/>
    <line x1="358" y1="168" x2="402" y2="142" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#lg)"/>
    <rect x="404" y="60" width="162" height="112" rx="8" fill="#3a2d1f" stroke="#e0733a" stroke-width="1.6"/><text x="485" y="104" fill="#e0733a" font-size="11" text-anchor="middle" font-weight="bold">Grafana(G)</text><text x="485" y="122" fill="#e6e6e6" font-size="8" text-anchor="middle">統一儀表板 · 查詢 · 告警</text><text x="485" y="138" fill="#9aa4b2" font-size="7.4" text-anchor="middle">single pane of glass</text>
    <text x="290" y="212" fill="#9aa4b2" font-size="8.3" text-anchor="middle">看 metrics 發現異常 → 查 logs 看細節 → 追 traces 定位是「哪一跳」壞的</text>
    <text x="290" y="226" fill="#d6a45c" font-size="8" text-anchor="middle">L·G·T·M = Loki · Grafana · Tempo · Mimir</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">可觀測性的三根支柱:<b>metrics</b>(有沒有異常)、<b>logs</b>(細節是什麼)、<b>traces</b>(是哪一跳壞的),分別由 <b style="color:#4f6df5">Mimir</b>、<b style="color:#54b890">Loki</b>、<b style="color:#9b6ff0">Tempo</b> 承接,全部在 <b style="color:#e0733a">Grafana</b> 這塊玻璃上看。對新人最關鍵的是 <b>Tempo 的分散式追蹤</b>——它等於把上一節「跟著請求走」自動化了:一條 trace 就把請求跨了哪些服務、每一跳花多久,攤在你眼前(近年還常加上 Pyroscope 做效能剖析,湊成第四種訊號)</figcaption>
</figure>

對剛上手的人,LGTM 的用法有個固定套路,對應到[[sre-monitoring|四個黃金訊號]]:先看 **metrics** 抓到「哪裡不對勁」(延遲飆高、錯誤率上升),再翻對應時間的 **logs** 看「細節是什麼」,最後用 **traces** 定位「到底是哪一跳、哪個服務拖慢了整條鏈」。metrics 告訴你有事、logs 告訴你什麼事、traces 告訴你在哪——三者缺一,你就會在半夜的事故裡瞎猜。所以我進新公司第一件想搞清楚的基礎設施,往往就是「**我們的可觀測性長什麼樣、我要去哪一塊玻璃上看**」。

## 上手的終極測試:你能不能把整個環境重建起來

前面兩招讓你「看懂」系統,但有一個更狠、也更誠實的測試能逼你「真懂」:**試著從零把整個環境在本機或 sandbox 跑起來**。讀文件你會不知不覺跳過看不懂的段落;但重建不會騙你——**缺任何一層依賴,它就是起不來**,逼著你把每一個隱藏的相依關係都挖出來:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 246" role="img" aria-label="從零重建環境要疊起五層,每一層都藏著讀文件會漏的地雷。第一層源碼,git clone 但有幾個 repo、有沒有 private module。第二層 build 與依賴,套件版本內部 registry build 工具鏈。第三層相依服務,DB queue cache 要先起哪些。第四層設定與 secrets,env 憑證 feature flag,最常卡這一層。第五層資料網路與可觀測性,schema 種子資料 DNS 以及接上 LGTM。五層都齊,環境才在本機或 sandbox 跑起來,代表你真的懂了。讀文件會漏,重建不會騙你。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rb2" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker></defs>
    <text x="318" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">從零重建:缺一層就跑不起來,逼出所有隱藏依賴</text>
    <line x1="52" y1="202" x2="52" y2="46" stroke="#54b890" stroke-width="1.4" marker-end="url(#rb2)"/>
    <text x="40" y="126" fill="#54b890" font-size="8" text-anchor="middle" transform="rotate(-90 40 126)">往上疊,才跑得起來</text>
    <rect x="70" y="40" width="486" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="290" y="57" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">✓ 在本機 / sandbox 跑起來 = 你是真的懂了</text>
    <rect x="70" y="72" width="486" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="86" y="89" fill="#e6e6e6" font-size="8.4" text-anchor="start">⑤ 資料 · 網路 · 可觀測性</text><text x="540" y="89" fill="#9aa4b2" font-size="7.8" text-anchor="end">schema/種子、DNS、接上 LGTM</text>
    <rect x="70" y="104" width="486" height="26" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.4"/><text x="86" y="121" fill="#d6a45c" font-size="8.4" text-anchor="start" font-weight="bold">④ 設定 &amp; secrets</text><text x="540" y="121" fill="#9aa4b2" font-size="7.8" text-anchor="end">env、憑證、feature flag —— 最常卡這</text>
    <rect x="70" y="136" width="486" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="86" y="153" fill="#e6e6e6" font-size="8.4" text-anchor="start">③ 相依服務</text><text x="540" y="153" fill="#9aa4b2" font-size="7.8" text-anchor="end">DB / queue / cache 要先起哪些?</text>
    <rect x="70" y="168" width="486" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="86" y="185" fill="#e6e6e6" font-size="8.4" text-anchor="start">② build &amp; 依賴</text><text x="540" y="185" fill="#9aa4b2" font-size="7.8" text-anchor="end">套件版本、內部 registry、工具鏈</text>
    <rect x="70" y="200" width="486" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="86" y="217" fill="#e6e6e6" font-size="8.4" text-anchor="start">① 源碼</text><text x="540" y="217" fill="#9aa4b2" font-size="7.8" text-anchor="end">git clone —— 但有幾個 repo?private?</text>
    <text x="318" y="240" fill="#e0733a" font-size="8.2" text-anchor="middle">讀文件會跳過看不懂的地方;重建會逼你把每一層都弄懂</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">重建之所以是「照妖鏡」,是因為它<b>不允許你含糊</b>:少一個環境變數、漏一個相依服務、build 工具版本不對,系統就是起不來,逼你把每一層隱藏依賴都攤開。最常卡住的往往是<b style="color:#d6a45c">設定與 secrets</b>那層——因為那正是文件最愛省略、最靠口耳相傳的部分。能把整套環境從零跑起來,你對它的理解就從「看過」升級成「真懂」,順便也摸清了將來災難復原(DR)要重建什麼</figcaption>
</figure>

實務上不必真的把 production 級的規模重建出來,重點是**跑通那條依賴鏈**:哪些服務要先起、誰依賴誰、設定從哪來、資料怎麼種。很多公司有 `docker-compose` 或一鍵起本機環境的腳本——如果有,先照著跑一遍、再故意弄壞一個環節看它怎麼壞;如果沒有,那**幫他們把這個腳本補出來**,本身就是你上手期最有價值的貢獻之一(下一節會提到)。

## 前 90 天的節奏:先理解,後動手

新人最容易犯的錯,是第一週就急著「做點什麼證明自己」——改設定、提重構、嫌東嫌西。在一間自建系統的公司,這幾乎注定踩雷,因為每個看似奇怪的設計背後,常有你還沒看到的血淚原因。我給自己排的節奏是這樣:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="前 90 天的節奏,由下往上四階段。第一階段週 1 到 2 建地圖:trace 一個請求、讀 code、用 LGTM 看正常長相。第二階段週 3 到 6 見習加重建:shadow on-call、讀過去 postmortem、在 sandbox 重建環境。第三階段月 2 第一個貢獻:補缺的 runbook 或文件,低風險高價值。第四階段月 3 開始自動化:挑一個親身受夠的 toil 動手。貫穿全部:先理解再動手,別在第一週就大改。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="oc" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker></defs>
    <text x="318" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">前 90 天:先理解,後動手</text>
    <line x1="52" y1="192" x2="52" y2="40" stroke="#54b890" stroke-width="1.4" marker-end="url(#oc)"/>
    <text x="40" y="118" fill="#54b890" font-size="8" text-anchor="middle" transform="rotate(-90 40 118)">投入深度 · 信任↑</text>
    <rect x="70" y="34" width="486" height="32" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="86" y="54" fill="#54b890" font-size="9" text-anchor="start" font-weight="bold">月 3 · 開始自動化</text><text x="546" y="54" fill="#9aa4b2" font-size="8.2" text-anchor="end">挑一個你親身受夠的 toil 動手</text>
    <rect x="70" y="72" width="486" height="32" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="86" y="92" fill="#4f6df5" font-size="9" text-anchor="start" font-weight="bold">月 2 · 第一個貢獻</text><text x="546" y="92" fill="#9aa4b2" font-size="8.2" text-anchor="end">補缺的 runbook / 文件(低風險、高價值)</text>
    <rect x="70" y="110" width="486" height="32" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="86" y="130" fill="#4f6df5" font-size="9" text-anchor="start" font-weight="bold">週 3–6 · 見習 + 重建</text><text x="546" y="130" fill="#9aa4b2" font-size="8.2" text-anchor="end">shadow on-call、讀 postmortem、sandbox 重建環境</text>
    <rect x="70" y="148" width="486" height="32" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.3"/><text x="86" y="168" fill="#d6a45c" font-size="9" text-anchor="start" font-weight="bold">週 1–2 · 建地圖</text><text x="546" y="168" fill="#9aa4b2" font-size="8.2" text-anchor="end">trace 一個請求、讀 code、用 LGTM 看「正常長相」</text>
    <text x="318" y="204" fill="#e0733a" font-size="8.6" text-anchor="middle" font-weight="bold">⚠ 別在讀懂前就大改</text>
    <text x="318" y="220" fill="#9aa4b2" font-size="8.2" text-anchor="middle">自建系統的每個怪設計,背後常有你還沒看到的理由(Chesterton's fence)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">節奏的脊椎是「先理解、後動手」:前六週幾乎只做輸入(建地圖、見習、讀事故),月 2 才用最低風險的方式產出第一個貢獻(補文件),月 3 才碰自動化。越往上,動作越大、需要的信任越多——而信任,是你前面幾週用「先把系統搞懂」換來的</figcaption>
</figure>

其中**見習值班 + 讀過去的 postmortem**,是我認為投報率最高的一段。過去的 postmortem 等於一份「這個系統真的會怎麼壞、在哪壞」的濃縮教材——比任何架構簡報都值錢,因為它講的是真實發生過的血案,而不是設計者的一廂情願。而在 Grafana 上看「正常長相」則是另一半:你得先知道系統健康時長什麼樣,出事時才分得出異常。至於**在 sandbox 試著重建環境**,我把它放在這一段而不是更後面,是因為它最好在你「還敢問笨問題」的蜜月期做——重建過程你一定會卡,而卡住正是逼你去把依賴鏈問清楚、讀懂的最好藉口。

## 全自建公司的幾個特殊玩法

- **知識藏在三個地方**:程式碼(最終真相)、過去的 postmortem(哪裡會爆)、那位「什麼都知道」的資深(問他,但別只依賴他——人會離職)。網路上查不到,就往這三處挖。
- **早點建一份黑話表**:自建工具都有自己的內部命名、縮寫、術語。第一週就開始記,兩週後你會感謝自己。
- **把「code 都在手上」當紅利**:用 SaaS 你只能對著黑箱猜,但自建系統的每一行都在你的 repo 裡——你能**真的讀到底、也真的改得動**。這是自建環境唯一比別人爽的地方,好好利用。
- **先問「為什麼自己造」再說換掉**:別急著喊「這個用開源的 X 換掉就好」。他們當初沒用現成的,通常有你還沒踩到的理由——先搞懂,再評估。

## 反思

### 新人最大的資產是「不懂」,別急著浪費它

剛進公司的前幾週,你擁有一個**再也拿不回來**的東西:一雙「什麼都不覺得理所當然」的眼睛。你上手時每一個卡住的地方、每一個「這什麼?怎麼沒人寫」的瞬間,都精準地標記出**文件的缺口**——而這正是你第一個月最好的貢獻清單。我每次到新環境都會開一份「我卡住的地方」筆記,兩個月後它就變成我補的第一批 runbook。**因為再過陣子你就『習慣』了,那些坑會變成你視而不見的日常,這個視角就永遠消失了。** 不懂不是弱點,是有保鮮期的資產。

### 先理解再動手,不是慢,是對系統複雜度的尊重

我年輕時很想用「第一週就修好一個東西」來證明自己值得被錄取,結果常常是改了一個我以為多餘的設計,才發現它在擋一個我沒看到的邊界狀況。自建系統尤其如此——那些看起來很蠢的特例,很多是某次半夜事故留下的疤。所以我現在的紀律是:**看到怪東西,先問「為什麼會變成這樣」,而不是「這也太爛了吧」。** 這跟 [[sre-troubleshooting|排障]]的精神一樣——**相信證據、別憑直覺猜**;也跟 [[sre-postmortem|blameless]] 的底層假設一致:眼前這個設計不是因為前人蠢,是因為他們面對過你還沒面對的處境。理解在前,批判在後。

### 能不能親手重建,是「懂不懂」的照妖鏡

我對一套系統敢不敢說「我懂了」,標準只有一個:**我能不能自己把它從零跑起來。** 讀完文件、聽完簡報,你會有種「差不多懂了」的錯覺——但那個錯覺會在你真的動手重建時,一層一層被戳破:欸這個服務原來還依賴那個沒人提過的內部 API?這個環境變數哪來的?這份 secret 誰在管?**每一個讓你卡住的地方,都是你剛才『以為懂了』其實沒懂的證據。** 我很喜歡這個測試,因為它逼出的東西,剛好就是 SRE 最該掌握的:完整的依賴鏈、啟動順序、設定的來源——這些正是將來**災難復原(DR)**時,你得在半夜、在壓力下,徒手重建的同一批東西。上手期把環境重建一遍,等於預先演練了一次最壞情況;而把重建腳本(`docker-compose`、一鍵起環境)補好留給後人,更是把一次性的痛,變成整個團隊的資產。

### 讀 postmortem,是我看過最高效的入職教材

如果讓我只推薦一件事給空降的 SRE,那就是**把過去半年到一年的 postmortem 全部讀一遍**。一份好的事故報告,濃縮了系統最脆弱的關節、最容易被誤解的地方、以及真實壓力下人會怎麼反應——這些東西,新人訓練簡報永遠不會告訴你,因為它們太真實、太不光彩。我讀 postmortem 的一週,對系統的理解勝過前面聽簡報的一個月。這也讓我更確信 [[sre-monitoring|監控]]和 [[sre-postmortem|postmortem]] 文化的價值:一個願意誠實記錄自己怎麼壞掉的組織,等於幫每一個未來的新人,預先寫好了最珍貴的那本地圖。
