---
title: "可觀測性是什麼:三大支柱與 LGTM 全家桶"
date: 2026-07-23
category: tech
tags:
  - observability
  - grafana
series: "Grafana LGTM 可觀測性"
seriesOrder: 1
comments: true
draft: false
---
一個系統可不可靠,先看你**看不看得見它在幹嘛**。這系列講 Grafana 的 **LGTM** 這套可觀測性工具怎麼把「看見」做到位。第一篇立好整個系列的框架:**monitoring 和 observability 差在哪、三大支柱各答什麼問題、LGTM 這四個字母怎麼對應**。而貫穿全系列有一句話我會一直回扣——**觀測的終點不是「看到」,是「行動」**。

## monitoring vs observability:從「已知的未知」到「未知的未知」

這兩個詞常被當同義詞,但差別很關鍵。**Monitoring** 是監看你**預先知道要看**的東西:CPU、錯誤率、佇列長度——你事先想好可能會壞的地方,擺個儀表板、設個告警。它回答的是**「已知的未知」**(known unknowns):我知道要問這題,只是不知道答案。

**Observability** 更進一步:系統把足夠的內部狀態往外吐,讓你能回答**當初根本沒想到要問的問題**——**「未知的未知」**(unknown unknowns)。而 Production 的事故,九成都是你沒預想到的那種。差別一句話:**monitoring 是「我知道要問什麼」,observability 是「我能問出我當初沒想到的問題」。**

## 三大支柱:各答一個問題

要做到後者,靠的是三種互補的訊號——metrics、logs、traces。它們**各答一個不同的問題**,而且合起來剛好是排障的黃金路徑:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 236" role="img" aria-label="可觀測性三大支柱各答一個問題。Metrics 指標,對應 Prometheus 與 Mimir,答有沒有問題、多嚴重,特性是數字時序、可聚合、便宜可長存,但沒有細節。Traces 追蹤,對應 Tempo,答在哪個服務、哪一段慢,特性是一個請求跨服務的完整路徑。Logs 日誌,對應 Loki,答那裡到底發生什麼,特性是事件的完整細節,但量大、貴、難聚合。三者合起來是排障黃金路徑:先用 metric 看有沒有問題,再用 trace 定位在哪,最後用 log 看到底發生什麼,由粗到細逐步收斂。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ob" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">三大支柱:各答一個問題</text>
    <rect x="18" y="26" width="176" height="128" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="106" y="44" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">Metrics(指標)</text><text x="106" y="56" fill="#9aa4b2" font-size="7.2" text-anchor="middle">→ Prometheus / Mimir</text>
    <text x="106" y="80" fill="#e6e6e6" font-size="9.6" text-anchor="middle" font-weight="bold">有沒有問題?</text><text x="106" y="94" fill="#e6e6e6" font-size="9.6" text-anchor="middle" font-weight="bold">多嚴重?</text>
    <text x="106" y="118" fill="#9aa4b2" font-size="7.4" text-anchor="middle">數字時序・可聚合</text><text x="106" y="130" fill="#9aa4b2" font-size="7.4" text-anchor="middle">便宜・可長期存</text><text x="106" y="145" fill="#e0733a" font-size="7.4" text-anchor="middle">但沒有細節</text>
    <rect x="202" y="26" width="176" height="128" rx="8" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.6"/><text x="290" y="44" fill="#9b6ff0" font-size="9.6" text-anchor="middle" font-weight="bold">Traces(追蹤)</text><text x="290" y="56" fill="#9aa4b2" font-size="7.2" text-anchor="middle">→ Tempo</text>
    <text x="290" y="80" fill="#e6e6e6" font-size="9.6" text-anchor="middle" font-weight="bold">在哪個服務?</text><text x="290" y="94" fill="#e6e6e6" font-size="9.6" text-anchor="middle" font-weight="bold">哪一段慢?</text>
    <text x="290" y="118" fill="#9aa4b2" font-size="7.4" text-anchor="middle">一個請求的完整路徑</text><text x="290" y="130" fill="#9aa4b2" font-size="7.4" text-anchor="middle">跨服務串起來</text>
    <rect x="386" y="26" width="176" height="128" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="474" y="44" fill="#54b890" font-size="9.6" text-anchor="middle" font-weight="bold">Logs(日誌)</text><text x="474" y="56" fill="#9aa4b2" font-size="7.2" text-anchor="middle">→ Loki</text>
    <text x="474" y="80" fill="#e6e6e6" font-size="9.6" text-anchor="middle" font-weight="bold">那裡到底</text><text x="474" y="94" fill="#e6e6e6" font-size="9.6" text-anchor="middle" font-weight="bold">發生什麼?</text>
    <text x="474" y="118" fill="#9aa4b2" font-size="7.4" text-anchor="middle">事件的完整細節</text><text x="474" y="130" fill="#9aa4b2" font-size="7.4" text-anchor="middle">量大・貴・難聚合</text>
    <rect x="18" y="174" width="544" height="48" rx="8" fill="#1f2330" stroke="#d6a45c" stroke-width="1.4"/><text x="290" y="192" fill="#d6a45c" font-size="9" text-anchor="middle" font-weight="bold">排障黃金路徑:由粗到細,逐步收斂</text>
    <text x="106" y="210" fill="#4f6df5" font-size="8.2" text-anchor="middle" font-weight="bold">metric:有沒有</text><text x="197" y="210" fill="#9aa4b2" font-size="10" text-anchor="middle">→</text><text x="290" y="210" fill="#9b6ff0" font-size="8.2" text-anchor="middle" font-weight="bold">trace:在哪</text><text x="381" y="210" fill="#9aa4b2" font-size="10" text-anchor="middle">→</text><text x="474" y="210" fill="#54b890" font-size="8.2" text-anchor="middle" font-weight="bold">log:是什麼</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三支柱不是三個工具,是三種<b>問問題的粒度</b>:<b style="color:#4f6df5">Metrics</b> 是聚合的數字,答「<b>有沒有</b>問題、多嚴重」,便宜、可長存、能告警,但沒有細節;<b style="color:#9b6ff0">Traces</b> 把一個請求跨服務的路徑串起來,答「問題<b>在哪</b>一段」;<b style="color:#54b890">Logs</b> 是事件的完整記錄,答「那裡到底<b>發生什麼</b>」。合起來就是排障的黃金路徑——<b>先用 metric 看有沒有、再用 trace 定位在哪、最後用 log 看是什麼,由粗到細</b>。跟 <a href="/blog/k8s-troubleshooting/">K8s 排障</a>的 get→describe→logs 漏斗是同一種收斂</figcaption>
</figure>

關鍵是**三個都要**。只有 metrics,你知道「壞了」卻不知道哪裡;只有 logs,你在事件大海裡撈針、還貴到存不起;只有 traces,你看得到路徑卻抓不到整體趨勢。**它們互補,不是三選一。**

## LGTM 全家桶:一塊玻璃,背後四個字母

那 Grafana 的 **LGTM** 怎麼對應這三支柱?這四個字母其實是四個元件(順帶一提,LGTM 也雙關 code review 那句 "Looks Good To Me"):

- **L**oki —— 收 **logs**(下一批會講:它像 Prometheus 一樣只索引 label、不做全文索引,所以便宜)
- **G**rafana —— **一塊玻璃**:查詢 + 視覺化 + 告警的介面。注意它**只查不存**,資料在各支柱的儲存裡
- **T**empo —— 收 **traces**(只靠 object storage + trace-id)
- **M**imir —— 收 **metrics**,是可水平擴、可長期保留的 Prometheus 後端

再加上採集 metrics 的 **Prometheus**、以及把資料送進來的 agent(**Grafana Alloy / OpenTelemetry**),就是完整的一套:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 196" role="img" aria-label="LGTM 全家桶的資料流。左邊你的 app、服務、K8s 產生訊號,經過中間的採集層,包含 Grafana Alloy、OpenTelemetry Collector、Prometheus,分別送進三個儲存:Mimir 存 metrics、Loki 存 logs、Tempo 存 traces。這三個儲存都被最右邊的 Grafana 查詢，Grafana 是一塊玻璃、只查不存。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ob2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">LGTM 全家桶的資料流</text>
    <rect x="14" y="74" width="104" height="52" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="66" y="96" fill="#e6e6e6" font-size="8.6" text-anchor="middle">app / 服務</text><text x="66" y="110" fill="#9aa4b2" font-size="7.6" text-anchor="middle">/ K8s</text>
    <line x1="118" y1="100" x2="146" y2="100" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ob2)"/>
    <rect x="148" y="66" width="128" height="68" rx="7" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.4"/><text x="212" y="84" fill="#9b6ff0" font-size="8.6" text-anchor="middle" font-weight="bold">採集層</text><text x="212" y="99" fill="#9aa4b2" font-size="7.2" text-anchor="middle">Grafana Alloy /</text><text x="212" y="110" fill="#9aa4b2" font-size="7.2" text-anchor="middle">OpenTelemetry /</text><text x="212" y="121" fill="#9aa4b2" font-size="7.2" text-anchor="middle">Prometheus</text>
    <rect x="306" y="44" width="120" height="26" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="366" y="61" fill="#4f6df5" font-size="8.2" text-anchor="middle" font-weight="bold">Mimir(metrics)</text>
    <rect x="306" y="86" width="120" height="26" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.3"/><text x="366" y="103" fill="#54b890" font-size="8.2" text-anchor="middle" font-weight="bold">Loki(logs)</text>
    <rect x="306" y="128" width="120" height="26" rx="5" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.3"/><text x="366" y="145" fill="#9b6ff0" font-size="8.2" text-anchor="middle" font-weight="bold">Tempo(traces)</text>
    <line x1="276" y1="92" x2="304" y2="60" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob2)"/><line x1="276" y1="100" x2="304" y2="99" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob2)"/><line x1="276" y1="108" x2="304" y2="138" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob2)"/>
    <line x1="426" y1="57" x2="454" y2="86" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob2)"/><line x1="426" y1="99" x2="454" y2="99" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob2)"/><line x1="426" y1="141" x2="454" y2="112" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob2)"/>
    <rect x="456" y="72" width="110" height="56" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.9"/><text x="511" y="92" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">Grafana</text><text x="511" y="107" fill="#e6e6e6" font-size="7.6" text-anchor="middle">一塊玻璃</text><text x="511" y="119" fill="#9aa4b2" font-size="7.2" text-anchor="middle">只查不存</text>
    <text x="290" y="176" fill="#9aa4b2" font-size="8" text-anchor="middle">資料進來(採集)→ 各支柱各自存 → Grafana 統一查</text>
    <text x="290" y="190" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">這就是 LGTM 全家桶:三種訊號、一塊玻璃</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">整套的資料流是一條線:你的 app 產生訊號 → <b style="color:#9b6ff0">採集層</b>(Alloy / OpenTelemetry / Prometheus)把它們送進三個各自的儲存 → <b style="color:#4f6df5">Mimir</b>(metrics)、<b style="color:#54b890">Loki</b>(logs)、<b style="color:#9b6ff0">Tempo</b>(traces)→ 最後全部被 <b style="color:#4f6df5">Grafana</b> 查詢。這裡最該記住的一點:<b>Grafana 只是「一塊玻璃」,它只查、不存</b>——真正的資料在後面那三個儲存裡。後面每一篇,就是把這條線上的每一格拆開講透</figcaption>
</figure>

## 反思

### 三支柱是三種「問問題的粒度」,排障就是沿著它收斂

我剛開始用這套時,把 metrics/logs/traces 當成三個「要各自學的工具」,學得很散。後來想通:**它們其實是同一件事的三種粒度**——metric 是最粗的「有沒有」、trace 是中間的「在哪」、log 是最細的「是什麼」。而排障最有效的路徑,就是**沿著這三個粒度由粗到細收斂**:先看儀表板確認「真的有問題」,再用 trace 縮到「哪個服務、哪一段」,最後才鑽進那一小段的 log。這比一出事就跳進 log 大海撈針有效太多。這個「由粗到細」的收斂,跟我在 [[k8s-troubleshooting|K8s 排障]]講的 get→describe→logs 漏斗是同一種思維——**好的排障不是翻得快,是每一步都在縮小範圍。**

### observability 的真價值,是回答你「當初沒想到」的問題

monitoring 和 observability 的那條線,我越做越覺得重要。Monitoring 能告訴你「你當初設想的那些壞法,發生了沒」——但 Production 真正咬你的,幾乎都是你**沒設想到**的壞法。所以我現在評估一套觀測,不只看「儀表板漂不漂亮」,而是問一句更狠的:**當一個我從沒預期的問題發生時,我手上的資料夠不夠讓我現場問出答案?** 這就是為什麼三支柱的訊號要夠豐富、標籤要夠細(尤其 traces 和 high-cardinality 的資料)——不是為了平時好看,是為了那個你沒準備的半夜,還能靠它把真相問出來。**能回答預料之外的問題,才叫可觀測。**

### 「一塊玻璃」不是為了美觀,是為了在壓力下還能思考

Grafana 把三支柱收進「一塊玻璃」,這件事的價值,我是在一次事故當下才真的體會到的。事故現場,人腦的頻寬窄得可怕。如果 metrics 在一個系統、logs 在另一個後台、traces 又要開第三個工具,你會在**最需要冷靜思考的時刻**,把注意力耗在「切視窗、換 context、對時間戳」這些破碎的摩擦上。LGTM 把它們收進一個 Grafana、還能從一個指標尖峰直接跳到對應的 trace 和 log,價值不是「看起來整齊」,是**事故當下少一層摩擦、讓有限的腦力用在判斷上**。這也呼應了 [[infra-platform|上一個系列的收尾]]——一塊玻璃,是小團隊能扛住大平台的關鍵。而這一切的終點,始終不是「看到」,是**在對的時間、做對的事**。下一篇,先把那塊玻璃 Grafana 本身講清楚。
