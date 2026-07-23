---
title: "日誌與 Loki:只索引 label,不索引全文"
date: 2026-07-23
category: tech
tags:
  - observability
  - logging
series: "Grafana LGTM 可觀測性"
seriesOrder: 4
comments: true
draft: false
---
三支柱第二個:logs。而 Loki 最該懂的一件事,是它一個很聰明、很省的設計選擇——它**不像傳統 log 系統(ELK)那樣索引全文,而是「像 [[obs-metrics-prometheus|Prometheus]] 一樣只索引 label」**。這個選擇讓它便宜到能存海量 log,代價是換一種查法。而且你會發現,[[obs-metrics-prometheus|上一篇]]那個 cardinality 的坑,在這裡又原封不動地出現一次。

## 核心:只索引 label,內容靠 grep

傳統的 Elasticsearch / ELK 把**每一行 log 的全文**都建索引——任意關鍵字都能秒搜,但代價是索引巨大、吃大量 RAM 與磁碟,貴。Loki 反其道而行:**只索引一小組 label,原始 log 內容壓縮後丟 object storage、完全不索引。** 查詢因此變成兩步:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 210" role="img" aria-label="Loki 的兩步查詢與 ELK 的對比。一個查詢，例如 service 等於 checkout 而且包含 timeout。第一步用 label 索引，這個索引小而快，把範圍縮到幾個 chunk。第二步在縮小後的原始 chunk 上做 grep，這些 chunk 存在 object storage、不索引全文。對比之下 ELK 把每一行都建全文索引，任意全文秒搜但索引巨大、RAM 貴；Loki 只索引 label，先用 label 縮小再 grep，便宜到能存海量 log。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="lk" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Loki 的兩步查詢</text>
    <rect x="14" y="34" width="132" height="44" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="80" y="52" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-family="monospace">{service=checkout}</text><text x="80" y="66" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-family="monospace">|= "timeout"</text>
    <line x1="146" y1="56" x2="172" y2="56" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#lk)"/>
    <rect x="174" y="32" width="168" height="48" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.5"/><text x="258" y="50" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">① label 索引</text><text x="258" y="64" fill="#9aa4b2" font-size="7.4" text-anchor="middle">小而快 → 縮到幾個 chunk</text><text x="258" y="75" fill="#9aa4b2" font-size="7.4" text-anchor="middle">(只索引這個)</text>
    <line x1="342" y1="56" x2="368" y2="56" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#lk)"/>
    <rect x="370" y="32" width="196" height="48" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.5"/><text x="468" y="50" fill="#d6a45c" font-size="8.8" text-anchor="middle" font-weight="bold">② grep 那小堆原始 chunk</text><text x="468" y="64" fill="#9aa4b2" font-size="7.4" text-anchor="middle">存 object storage・不索引全文</text><text x="468" y="75" fill="#9aa4b2" font-size="7.4" text-anchor="middle">暴力掃,但範圍已很小</text>
    <rect x="14" y="104" width="272" height="66" rx="8" fill="#1f2330" stroke="#e05a7d" stroke-width="1.4"/><text x="150" y="122" fill="#e05a7d" font-size="9" text-anchor="middle" font-weight="bold">ELK:索引全文</text><text x="150" y="140" fill="#9aa4b2" font-size="7.8" text-anchor="middle">每行都建全文索引 → 任意全文秒搜</text><text x="150" y="156" fill="#e0733a" font-size="7.8" text-anchor="middle">但索引巨大、RAM 貴</text>
    <rect x="298" y="104" width="268" height="66" rx="8" fill="#1f2330" stroke="#54b890" stroke-width="1.4"/><text x="432" y="122" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Loki:只索引 label</text><text x="432" y="140" fill="#9aa4b2" font-size="7.8" text-anchor="middle">先用 label 縮小、再 grep</text><text x="432" y="156" fill="#54b890" font-size="7.8" text-anchor="middle">便宜到能存海量 log</text>
    <text x="290" y="192" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">賭注:你多半已知道要看哪個 service、哪段時間 → 先縮再 grep,夠用又便宜</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Loki 查詢分兩步:<b style="color:#54b890">①</b> 用 <b>label 索引</b>(小、快)把範圍縮到一小堆 chunk;<b style="color:#d6a45c">②</b> 在那一小堆<b>原始 log</b> 上 <b>grep</b>(它們壓縮存在 object storage、完全沒索引全文)。相對地 <b style="color:#e05a7d">ELK</b> 把每行全文都建索引——任意關鍵字秒搜,但索引巨大、貴。Loki 賭的是一件多半成立的事:<b>你排障時,通常已經知道要看哪個 service、哪段時間</b>(往往是 metric 先示警給的線索),那就先用 label 縮到一小堆、再暴力 grep——夠用,又便宜非常多</figcaption>
</figure>

這個「先用 label 縮小、再暴力掃」的設計,配上 object storage 當後端,讓 Loki 便宜到你**敢把 log 全開、留久**。它跟 metric 的 [[obs-intro|黃金路徑]]也接得剛好:metric 告訴你「哪個 service、什麼時候」,你拿這兩個 label 進 Loki 一縮,範圍就小了。

## 同一個 cardinality 陷阱,又出現了

既然 Loki 的 label 也是拿來建索引的,那 [[obs-metrics-prometheus|上一篇]]那個 cardinality 的坑就**原封不動**:**label 高基數 → 索引爆炸 → Loki 一樣會死。** 所以千萬別把 `trace_id`、`user_id`、`order_id` 這種高基數的東西當 label。那它們要放哪?**放進 log 內容本身**——而且用 structured 的格式,查詢時再撈出來:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 198" role="img" aria-label="label 進索引、內容進 chunk 的分工。一筆 log 分兩部分：左邊是 label，例如 service 等於 checkout、level 等於 error，這些是低基數，進 label 索引。右邊是 log 內容，用 structured 的 JSON 格式，包含 msg 是 timeout、order_id 是 a9f3、trace_id 等高基數欄位，這些進 object storage 的 chunk。下面是 LogQL 的 pipeline：先用大括號 service 等於 checkout、level 等於 error 的 label 選擇器縮小範圍，再用管線 json 解析，再用 order_id 等於 a9f3 撈欄位。所以高基數欄位放進 structured line、查詢時撈，不要當 label，就避開了 cardinality 爆炸。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="lk2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">label 進索引(低基數)・內容進 chunk(可高基數)</text>
    <rect x="16" y="30" width="196" height="52" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.5"/><text x="114" y="47" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">labels(進索引)</text><text x="114" y="62" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-family="monospace">service=checkout</text><text x="114" y="74" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-family="monospace">level=error</text>
    <rect x="220" y="30" width="344" height="52" rx="7" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.5"/><text x="392" y="47" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">log 內容:structured JSON(進 object storage chunk)</text><text x="392" y="64" fill="#e6e6e6" font-size="7.4" text-anchor="middle" font-family="monospace">{"msg":"timeout", "order_id":"a9f3", "trace_id":"7c.."}</text><text x="392" y="75" fill="#9aa4b2" font-size="7" text-anchor="middle">高基數欄位放這裡,不當 label</text>
    <text x="290" y="104" fill="#9aa4b2" font-size="8.2" text-anchor="middle" font-weight="bold">LogQL:先用 label 索引縮小 → 再解析內容撈欄位</text>
    <rect x="30" y="114" width="176" height="34" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.3"/><text x="118" y="131" fill="#54b890" font-size="7.4" text-anchor="middle" font-family="monospace">{service="checkout",</text><text x="118" y="142" fill="#54b890" font-size="7.4" text-anchor="middle" font-family="monospace">level="error"}</text>
    <line x1="206" y1="131" x2="228" y2="131" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#lk2)"/>
    <rect x="230" y="114" width="120" height="34" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="290" y="135" fill="#e6e6e6" font-size="7.8" text-anchor="middle" font-family="monospace">| json</text>
    <line x1="350" y1="131" x2="372" y2="131" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#lk2)"/>
    <rect x="374" y="114" width="176" height="34" rx="5" fill="#262b3a" stroke="#d6a45c" stroke-width="1.2"/><text x="462" y="135" fill="#e6e6e6" font-size="7.8" text-anchor="middle" font-family="monospace">| order_id="a9f3"</text>
    <text x="290" y="172" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">高基數的東西放進 structured line、查詢時撈 → 避開 cardinality 爆炸</text>
    <text x="290" y="188" fill="#9aa4b2" font-size="7.6" text-anchor="middle">索引保持小而快,細節保持可查而便宜</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">解法很優雅:<b style="color:#54b890">低基數的維度</b>(service、level、namespace)當 <b>label</b> 進索引;<b style="color:#d6a45c">高基數的欄位</b>(order_id、trace_id)放進 <b>structured 的 log 內容</b>(JSON / logfmt),查詢時再用 <code>| json</code> 解析、當場撈出來過濾。這樣<b>索引保持小而快、細節保持可查而便宜</b>——同一筆資料,擺對地方,就同時避開了 <a href="/blog/obs-metrics-prometheus/">上一篇</a>的 cardinality 爆炸。所以請務必用 <b>structured logging</b>,別再吐一坨無結構的字串</figcaption>
</figure>

## LogQL:還能把 log 變成 metric

LogQL 刻意設計得很像 PromQL,分兩段:**label selector**(用索引縮小)+ **pipeline**(過濾、解析)。而它有個很殺的能力——**把 log 當場算成 metric**:

```logql
{service="checkout", level="error"} |= "timeout"      # 撈出 checkout 的 timeout 錯誤
{service="checkout"} | json | status >= 500           # 解析 JSON、再按欄位過濾

# 把 log 變成 metric:每秒的錯誤行數(可以直接拿去畫圖、告警)
sum(rate({service="checkout"} |= "error" [5m]))
```

最後那條很重要:**你不必為每件事都預先埋一個 metric**——很多時候直接對 log `rate()` 一下,就得到一條可畫可告警的曲線。這讓 log 和 metric 的界線變得很靈活。

## 反思

### Loki 是「把 Prometheus 的哲學搬到 log」的漂亮示範

Loki 最打動我的,是它把同一個好想法——**只索引低基數的 label**——從 metric 原封不動搬到了 log:在 metric 上,它避免 series 爆炸;在 log 上,它避免索引爆炸。看懂一個好想法的「形狀」,你就會在別的地方一眼認出它。而 Loki 的取捨也很誠實:它**不追求「任意全文都秒搜」**(那是 ELK 用錢換來的),而是賭「你排障時多半已經知道要看哪個 service、哪段時間」。對「[[obs-intro|metric 示警 → 我知道哪個服務出事 → 去看它的 log]]」這個最常見的路徑,這個賭注幾乎總是對的。**認清自己的常見場景、然後為它(而不是為每種極端)最佳化,是很成熟的工程判斷。**

### 「label 進索引、內容進 line」,是一次乾淨的「把貴的東西放對地方」

高基數的 `order_id`、`trace_id` 不能進索引(會爆),但你又需要能按它查——Loki 的答案漂亮地化解了這個張力:**把它放進 structured 的 log 內容,查詢時再 `| json` 撈出來。** 索引保持小而快,細節保持可查而便宜。這種「**熱路徑放低基數、細節留在冷資料裡按需撈**」的分層,其實是所有可觀測性、甚至資料庫索引設計共通的智慧。它也再次驗證了 [[obs-metrics-prometheus|上一篇]]那句:**同一筆資料,擺對地方,結果天差地遠。** 工程上很多問題,不是「能不能存」,而是「該把它放進『快而貴的索引』還是『慢而便宜的儲存』」——分對了,又快又省。

### 「便宜」不是次要指標,是決定你「敢不敢全都留」的關鍵

戴上 EM/SRE 的成本帽子後,我對「便宜」的敬意越來越高。log 最痛的取捨,是「留多久、留多細」,而這**直接被成本決定**:ELK 貴,逼你砍 retention、砍 log level,結果事故回溯時,你要的那段 log 早就被清掉了;Loki 便宜,讓你敢把 log 留久、留全,於是它在你需要的那一刻**還在**。一個便宜到你敢全開的觀測系統,實務價值往往勝過一個功能華麗、卻貴到你只敢開一半的。這收束回這系列的主軸——觀測的終點是**行動**,而**你留不起的資料,在事故當下幫不了你行動**。省下的每一塊錢,買的其實是「事故當天,證據還在」。這對人手與預算都有限的團隊,是生死線,不是 nice to have。
