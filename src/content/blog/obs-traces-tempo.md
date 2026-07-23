---
title: "追蹤與 Tempo:一個請求走過的路"
date: 2026-07-23
category: tech
tags:
  - observability
  - tracing
series: "Grafana LGTM 可觀測性"
seriesOrder: 5
comments: true
draft: false
---
三支柱最後一個:traces。它補的是 metric 和 log 之間那個最關鍵的洞——**「在哪一段?」** [[obs-metrics-prometheus|Metric]] 告訴你「checkout 慢」,但一個請求橫跨了八個服務,到底卡在哪一 hop?[[obs-logs-loki|Log]] 是每個服務各自、斷開的。**Trace 把一趟請求的完整旅程縫成一條,讓你「看見」是哪一段拖慢了它。**

## 一個 trace,就是一趟請求的 waterfall

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 210" role="img" aria-label="一個請求的 trace 以 waterfall 呈現。橫軸是時間，從 0 到 1000 毫秒。gateway 這個 span 涵蓋整段 0 到 1000。它底下 auth 很短、checkout 從 200 到 950。checkout 底下又有 payment 從 250 到 850、佔了 600 毫秒是瓶頸，inventory 從 250 到 400 跟 payment 平行，db 在最後 860 到 940。metric 只能說 checkout 慢，trace 指出真正慢的是 payment 那 600 毫秒。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">一個請求的 trace:spans 排在時間軸上(waterfall)</text>
    <text x="8" y="41" fill="#9b6ff0" font-size="8" text-anchor="start" font-weight="bold">gateway</text><rect x="110" y="30" width="438" height="15" rx="3" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.3"/>
    <text x="20" y="65" fill="#9aa4b2" font-size="8" text-anchor="start">auth</text><rect x="132" y="54" width="44" height="15" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/>
    <text x="20" y="89" fill="#4f6df5" font-size="8" text-anchor="start">checkout</text><rect x="198" y="78" width="328" height="15" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="30" y="113" fill="#e05a7d" font-size="8" text-anchor="start" font-weight="bold">payment</text><rect x="219" y="102" width="263" height="15" rx="3" fill="#3a2626" stroke="#e05a7d" stroke-width="1.5"/><text x="490" y="113" fill="#e05a7d" font-size="7.4" text-anchor="start">← 600ms 瓶頸</text>
    <text x="30" y="137" fill="#9aa4b2" font-size="8" text-anchor="start">inventory</text><rect x="219" y="126" width="66" height="15" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/>
    <text x="30" y="161" fill="#9aa4b2" font-size="8" text-anchor="start">db write</text><rect x="487" y="150" width="34" height="15" rx="3" fill="#262b3a" stroke="#d6a45c" stroke-width="1.2"/>
    <line x1="110" y1="176" x2="548" y2="176" stroke="#3a4154" stroke-width="1.2"/><text x="110" y="188" fill="#9aa4b2" font-size="7" text-anchor="middle">0</text><text x="329" y="188" fill="#9aa4b2" font-size="7" text-anchor="middle">500</text><text x="548" y="188" fill="#9aa4b2" font-size="7" text-anchor="middle">1000 ms</text>
    <text x="290" y="204" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">metric 只說「checkout 慢」;trace 指出是 payment 那 600ms —— 這是 metric/log 給不了的「在哪一段」</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一個 <b>trace</b> = 一趟請求的完整旅程;裡面每一段工作是一個 <b>span</b>(有名字、起訖時間 → 長度、以及 parent → 樹狀關係)。把這些 span 依時間排開,就是一張 <b>waterfall</b>——你<b>一眼就看出</b>哪一段最長、哪些平行跑、哪一段出錯。這張圖裡,<a href="/blog/obs-metrics-prometheus/">metric</a> 只能告訴你「checkout 這服務慢」,但 trace 直接指著 <b style="color:#e05a7d">payment 那 600ms</b> 說「就是這裡」。「橫跨多服務、到底卡在哪一 hop」——這是三支柱裡<b>只有 trace 能回答</b>的問題</figcaption>
</figure>

## 靠什麼把它縫起來:context propagation

那 Tempo 怎麼知道這八個服務的 span,屬於「同一個請求」?靠一個貫穿全程的 **trace-id**。它在**入口生成一次**,然後隨著每一次服務呼叫,透過 **HTTP header**(W3C 標準的 `traceparent`)**一路傳下去**;每個服務都把自己的 span 掛在**同一個 trace-id** 底下回報。這個「把 context 傳下去」的動作,就是整套 tracing 的命脈:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 190" role="img" aria-label="context propagation 的機制。入口生成一個 trace-id abc123，Gateway、Checkout、Payment 三個服務串在一起，每次呼叫都透過 HTTP header traceparent 把 abc123 傳給下一個。每個服務各自把自己的 span 回報給 Tempo，都掛在 trace-id abc123 底下，於是 Tempo 能把它們縫成同一條 trace。下方警告：鏈上任何一個服務忘了轉發 header，trace 就從那裡斷成兩截。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="tr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">context propagation:一個 trace-id,一路傳下去</text>
    <rect x="24" y="34" width="120" height="36" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="84" y="56" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Gateway</text>
    <rect x="230" y="34" width="120" height="36" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="290" y="56" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Checkout</text>
    <rect x="436" y="34" width="120" height="36" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="496" y="56" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Payment</text>
    <line x1="144" y1="52" x2="228" y2="52" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#tr)"/><text x="186" y="46" fill="#d6a45c" font-size="6.8" text-anchor="middle">traceparent=abc123</text>
    <line x1="350" y1="52" x2="434" y2="52" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#tr)"/><text x="392" y="46" fill="#d6a45c" font-size="6.8" text-anchor="middle">traceparent=abc123</text>
    <line x1="84" y1="70" x2="250" y2="122" stroke="#9b6ff0" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#tr)"/><line x1="290" y1="70" x2="290" y2="122" stroke="#9b6ff0" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#tr)"/><line x1="496" y1="70" x2="330" y2="122" stroke="#9b6ff0" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#tr)"/>
    <text x="405" y="98" fill="#9b6ff0" font-size="7" text-anchor="middle">各自回報 span(都掛 trace=abc123)</text>
    <rect x="205" y="124" width="170" height="34" rx="6" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.6"/><text x="290" y="140" fill="#9b6ff0" font-size="8.6" text-anchor="middle" font-weight="bold">Tempo</text><text x="290" y="152" fill="#9aa4b2" font-size="7" text-anchor="middle">用同一個 trace-id 縫成一條 trace</text>
    <text x="290" y="180" fill="#e05a7d" font-size="8" text-anchor="middle" font-weight="bold">鏈上任一服務忘了轉發 header → trace 就從那裡斷成兩截 ✗</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一個 <b style="color:#d6a45c">trace-id</b> 在入口生成,靠 HTTP header(<code>traceparent</code>)<b>一路傳下去</b>;每個服務把自己的 span 掛在同一個 trace-id 回報給 <b style="color:#9b6ff0">Tempo</b>,Tempo 就能把它們縫成一條完整的 trace。這也是 tracing <b>最脆弱</b>的地方:只要鏈上有一個服務忘了把 header 轉發下去,<b style="color:#e05a7d">trace 就從那裡斷成兩截</b>——你會在最想看到全貌時只看到一半。所以導入 tracing,第一件事是確認 propagation 每一跳都沒斷(用 OpenTelemetry 的自動注入能省掉大半手工)</figcaption>
</figure>

## Tempo:給我 trace-id,我給你整條 trace

Tempo 的省錢哲學,跟 [[obs-logs-loki|Loki]] 一模一樣:**它不索引 span 的內容**,只需要 **trace-id** 就能撈出整條 trace,所有資料丟 **object storage**。所以它便宜到能收海量 trace。那「我沒有 trace-id、想找出所有很慢的 trace」怎麼辦?靠另外兩支柱給你線索——從一個 [[obs-metrics-prometheus|metric]] 尖峰或一行 error log 拿到 trace-id(這叫 exemplar / 關聯,是[[obs-intro|下一批]]的主題),再交給 Tempo 撈。心智模型一句話:**Tempo 負責「給 ID 換整條 trace」,找 ID 的活交給 metric 和 log。**

## 取樣:留下「有趣的」,丟掉無聊的

每個請求都是一條 trace,量大到你**不可能 100% 全留**,得取樣。兩種思路:

- **頭部取樣(head sampling)**:請求一進來就擲骰子,例如固定留 1%。簡單,但它會用**同樣的機率丟掉你最想看的那條出錯 trace**。
- **尾部取樣(tail sampling)**:等整條 trace 跑完再決定——**留下所有出錯的、所有很慢的**,把無聊的成功請求丟掉。貴一點(要先緩衝整條),但它留下的是**異常**。

判準很清楚:**你事後會回去看的,永遠是「不對勁」的那些,不是平均的那些。** 所以只要撐得起,尾部取樣「留異常」幾乎總是更值。

## 反思

### trace 補的洞,是微服務自己挖出來的

在單體時代,「一個請求卡在哪」這題根本不存在——就一個程序,堆疊一攤開就看到了。是**微服務把「一個請求的因果鏈」打散到了好幾台機器上**,才讓「在哪一 hop」變成一個需要專門工具才能回答的問題。這讓我看清一件事:**每一種可觀測性訊號,往往是為了補某個架構演化帶出來的盲點。** 你把系統拆得越散、跨越的服務越多,trace 就從「有了不錯」變成「沒有就瞎」。所以要不要上 tracing,其實不是看它多潮,而是看你的請求要橫跨幾個服務——[[k8s-service|服務多到你講不清一個請求的全貌]]時,它就是必需品,不是奢侈品。

### context propagation 教我:分散式系統裡,難的是「把上下文接好」

整套 tracing 幾百萬的價值,全繫在一個小到不能再小的細節:那個 trace-id 有沒有被**每一跳都乖乖傳下去**。只要鏈上有一個服務忘了轉發 header,trace 就斷了,你就在最需要全貌的時候看到半截。這件事給我的體會遠超 tracing——**在分散式系統裡,「上下文的傳遞」往往比「單點的正確」更難、也更容易被忽略。** 每個服務單獨看都對,但沒把 context(trace-id、使用者身分、request deadline…)一路接好,整體就是瞎的。所以我現在看任何跨服務的設計,都會多問一句:**這條鏈上,該一起傳下去的東西,每一跳都接住了嗎?** 這比檢查任何單一服務的正確性都重要。

### 取樣逼你誠實回答:留不起全部,那你想留下什麼?

traces 貴到你**必須**取樣,而取樣的設計,會逼你把一個平常含糊帶過的問題攤開:**當我留不起全部,我到底想留下什麼?** 頭部取樣的隨機 1% 最省事,卻會用同樣機率丟掉那條你最想看的出錯 trace;尾部取樣多花一點,換來的是「所有異常都留著」。想通這個取捨後,我把它變成一條通用原則:**凡是留不起全部的地方——trace、log、抽樣分析——都該優先留下『偏離正常』的,而不是隨機的樣本。** 因為你會為之行動的,從來是那些不對勁的東西,不是平均值。這正收束回這系列的主軸——觀測的終點是**行動**,而異常,才是行動的起點。三支柱到此講完,下一批我們把它們**串起來**:讓一個 metric 尖峰,能一鍵跳到那條 trace、再跳到那行 log。
