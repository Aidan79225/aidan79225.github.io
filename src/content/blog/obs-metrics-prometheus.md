---
title: "指標與 Prometheus:時序、pull、PromQL 與 cardinality 的坑"
date: 2026-07-23
category: tech
tags:
  - observability
  - prometheus
series: "Grafana LGTM 可觀測性"
seriesOrder: 3
comments: true
draft: false
---
三大支柱進第一個,也是**骨幹**:metrics。它是你「[[obs-intro|有沒有問題]]」的第一道防線,也是後面告警和 SLO 的底層數字。而 metrics 世界的事實標準,是 **Prometheus**。這篇講它的資料模型、為什麼用 pull、PromQL 怎麼問,以及一個會讓 Prometheus **當場暴斃**的坑——cardinality。

## 資料模型:一個指標 = 名字 + labels + 一串時序

先把最根本的資料模型立起來,因為那個致命的坑就藏在這裡。Prometheus 的一條 **time series** = 一個**名字** + 一組 **labels**(key-value)+ 一串 `(時間, 數值)`。而**每一個唯一的 label 組合,就是獨立的一條 series**。這件事決定了 Prometheus 的生死:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 218" role="img" aria-label="cardinality 的坑。一個指標 http_requests_total,它展開成多少條 time series，等於每個 label 基數的乘積。左邊好的做法：用低基數的 label，service 三個乘 method 四個乘 status 五個，等於 60 條 series，Prometheus 輕鬆扛。右邊壞的做法：多加一個高基數的 label user_id 一百萬，變成六千萬條 series，記憶體被吃光、Prometheus 暴斃。所以 label 只放低基數維度，高基數的東西像 user_id、request_id、email、URL 要丟去 logs 或 traces。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="mp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">cardinality:series 數 = 每個 label 基數的乘積</text>
    <rect x="176" y="26" width="228" height="26" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="290" y="43" fill="#e6e6e6" font-size="9" text-anchor="middle" font-family="monospace">http_requests_total{...}</text>
    <line x1="240" y1="52" x2="150" y2="64" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#mp)"/><line x1="340" y1="52" x2="430" y2="64" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#mp)"/>
    <rect x="18" y="66" width="256" height="108" rx="8" fill="#1f2330" stroke="#54b890" stroke-width="1.5"/><text x="146" y="84" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">✓ 低基數 labels</text>
    <text x="146" y="106" fill="#e6e6e6" font-size="8.6" text-anchor="middle">service(3) × method(4) × status(5)</text>
    <text x="146" y="130" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">= 60 條 series</text>
    <text x="146" y="152" fill="#9aa4b2" font-size="7.8" text-anchor="middle">Prometheus 輕鬆扛</text>
    <rect x="306" y="66" width="256" height="108" rx="8" fill="#1f2330" stroke="#e05a7d" stroke-width="1.5"/><text x="434" y="84" fill="#e05a7d" font-size="9" text-anchor="middle" font-weight="bold">✗ 多加一個高基數 label</text>
    <text x="434" y="106" fill="#e6e6e6" font-size="8.6" text-anchor="middle">… × user_id(100 萬)</text>
    <text x="434" y="130" fill="#e05a7d" font-size="11" text-anchor="middle" font-weight="bold">= 6000 萬條 series 💥</text>
    <text x="434" y="152" fill="#9aa4b2" font-size="7.8" text-anchor="middle">記憶體被吃光,Prometheus 暴斃</text>
    <text x="290" y="196" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">label 只放低基數維度;高基數(user_id / request_id / email / URL)丟去 logs / traces</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一個指標展開成多少條 series,等於<b>每個 label 基數的乘積</b>。<b style="color:#54b890">低基數 labels</b>(service、method、status——選項有限)相乘,不過幾十到幾千條,Prometheus 輕鬆扛。但只要<b style="color:#e05a7d">多加一個高基數 label</b>(user_id、request_id 這種近乎無界的),series 數就直接乘爆——幾千變幾千萬,記憶體瞬間被吃光。這叫 <b>cardinality 爆炸</b>,是搞死 Prometheus 的頭號死因。鐵律:<b>label 只放「選項有限」的維度,高基數的東西是 logs / traces 的活,不是 metric 的</b></figcaption>
</figure>

這是全篇最該記牢的一句:**label 是拿來「切片」的低基數維度,不是拿來「識別」的高基數 ID。** 想按 user 查?那是 [[obs-intro|logs / traces]] 的活。把這條守住,你就避開了 Prometheus 九成的事故。

## pull 不 push:Prometheus 主動去「抓」

跟很多監控系統相反,Prometheus 是 **pull**:它按排程,主動去每個 target 的 `/metrics` HTTP 端點**抓**(scrape),而不是等 app 把資料 push 過來。這個選擇很有道理:

- **Prometheus 掌握節奏**,不會被 app 端的爆量 push 打垮;
- **「抓不到」本身就是信號**——target 掛了,scrape 失敗,`up` 這個指標立刻變 0,你不用另外做心跳;
- 搭配 **service discovery**(K8s 上自動發現 pod),target 來來去去它自己跟上。

少數例外是**短命的 batch job**(還沒被抓就結束了),那種才用 Pushgateway 讓它主動推。但預設心法是:**讓 Prometheus 去抓,別讓 app 來推。**

## 四種 metric,配四種讀法

metric 有四種型別,而每一種**該怎麼讀**都不一樣——這是新手最常搞錯的地方:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 206" role="img" aria-label="四種 metric 型別與各自的讀法。Counter 計數器，只增不減的累計，例如 requests_total，讀法是看 rate 的變化率、絕對值沒意義。Gauge 量表，可上可下的瞬時值，例如 queue_length，讀法是直接看當下的值。Histogram 直方圖，把觀測值分桶計數，讀法是用 histogram_quantile 算 p95、p99 延遲。Summary 摘要，分位數在 client 端先算好，少用，因為不能跨實例聚合。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">四種 metric,配四種讀法</text>
    <rect x="16" y="26" width="130" height="40" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="81" y="43" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">Counter</text><text x="81" y="57" fill="#9aa4b2" font-size="7.4" text-anchor="middle">只增不減的累計</text>
    <rect x="156" y="26" width="408" height="40" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="170" y="43" fill="#e6e6e6" font-size="8.4" text-anchor="start">例:requests_total、errors_total</text><text x="170" y="57" fill="#54b890" font-size="8" text-anchor="start">讀法:看 rate() 的變化率(絕對值沒意義,重啟還會歸零)</text>
    <rect x="16" y="72" width="130" height="40" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="81" y="89" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">Gauge</text><text x="81" y="103" fill="#9aa4b2" font-size="7.4" text-anchor="middle">可上可下的瞬時值</text>
    <rect x="156" y="72" width="408" height="40" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="170" y="89" fill="#e6e6e6" font-size="8.4" text-anchor="start">例:queue_length、memory_usage、temperature</text><text x="170" y="103" fill="#54b890" font-size="8" text-anchor="start">讀法:直接看「當下的值」</text>
    <rect x="16" y="118" width="130" height="40" rx="6" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.5"/><text x="81" y="135" fill="#9b6ff0" font-size="9.4" text-anchor="middle" font-weight="bold">Histogram</text><text x="81" y="149" fill="#9aa4b2" font-size="7.4" text-anchor="middle">把觀測值分桶計數</text>
    <rect x="156" y="118" width="408" height="40" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="170" y="135" fill="#e6e6e6" font-size="8.4" text-anchor="start">例:request_duration_seconds_bucket</text><text x="170" y="149" fill="#54b890" font-size="8" text-anchor="start">讀法:histogram_quantile() 算 p95 / p99 延遲 ← 延遲監控關鍵</text>
    <rect x="16" y="164" width="130" height="34" rx="6" fill="#262b3a" stroke="#d6a45c" stroke-width="1.3"/><text x="81" y="181" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">Summary</text><text x="81" y="193" fill="#9aa4b2" font-size="7" text-anchor="middle">client 端先算好分位</text>
    <rect x="156" y="164" width="408" height="34" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="170" y="185" fill="#9aa4b2" font-size="8" text-anchor="start">少用:分位數在 client 算死,<tspan fill="#e0733a">不能跨實例聚合</tspan>——多數情況用 Histogram</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">最常踩的錯,是拿 <b style="color:#4f6df5">Counter</b> 的絕對值來看——它只增不減、還會在重啟時歸零,所以你要的永遠是 <code>rate()</code> 的「每秒變化率」。<b style="color:#54b890">Gauge</b> 才是直接看當下值。要算延遲的 p99,得用 <b style="color:#9b6ff0">Histogram</b>(server 端分桶)配 <code>histogram_quantile()</code>——這是延遲監控的關鍵。<b style="color:#d6a45c">Summary</b> 因為分位數在 client 端就算死了、不能跨實例聚合,多數情況別用</figcaption>
</figure>

## PromQL:counter → rate → 聚合 → 閾值

把它們串起來查,PromQL 的心法就一條路:**從 counter 取 rate、按維度聚合、再跟閾值比**。幾個最常用的:

```promql
rate(http_requests_total[5m])                          # 每秒請求數(5 分鐘窗)
sum by (service) (rate(http_requests_total[5m]))       # 按 service 聚合總 QPS

# 錯誤率 = 錯誤數 / 總數
sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))

# p99 延遲:histogram 的桶,先 sum by (le) 再算分位
histogram_quantile(0.99,
  sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
```

看懂這幾條,你就能讀懂九成的告警規則與儀表板——它們幾乎都是這個「rate → sum by → 比閾值」的變形。

## Mimir:單機 Prometheus 撞牆之後

Prometheus 很強,但它天生是**單機**的:資料存本機、保留時間有限(通常幾週)、一台的記憶體有上限。當你的 series 多到一台裝不下、或要保留一年來看趨勢、或要多團隊共用時,就換 **Mimir**(LGTM 的 M):它把 Prometheus 的儲存層**水平擴展**、後端接 **object storage** 做**長期保留**、還支援**多租戶**——而且**照樣講 PromQL**,你的查詢一行都不用改。心智模型很簡單:**Prometheus 負責抓、Mimir 負責大規模地存與查。**

## 反思

### cardinality 是 metric 的第一戒律,也是「用對粒度」的縮影

把高基數的東西塞進 label,是我看過最多人踩、也最致命的 Prometheus 事故——一個 `user_id` 標籤,就能讓 series 從幾千爆成幾千萬,記憶體當場被吃光。這個坑教我的,遠不只「別亂加 label」:它是「**每種訊號都有它擅長的粒度**」這件事最鮮明的例子。metric 的威力,來自它是「可聚合、低基數的數字」——你一旦想在它身上塞「識別到某一筆」的高基數細節,就是在用錯工具,而且會被狠狠懲罰。那些細節,是 [[obs-intro|logs 和 traces]] 的舞台。想通這點,我設定任何監控前都先問一句:**這個維度,是拿來『切片』的,還是拿來『識別』的?** 前者才配當 label。

### pull 模型最優雅的地方:「不回應」本身就是一個信號

Prometheus 選 pull 而非 push,我越想越欣賞。push 模型下,一個 target 悄悄消失,你可能好一陣子沒發現——它只是「沒再 push」,而「沒消息」很容易被當成「沒事」。pull 模型把這件事翻轉:Prometheus 主動去抓,抓不到,`up=0` 立刻告訴你「它掛了」。**它把『偵測失敗』內建進了正常流程,而不是外掛一個心跳。** 這跟我在 [[k8s-troubleshooting|K8s]]、在 SRE 一路看到的智慧一致——**好的系統讓失敗『顯而易見』,而不是讓失敗『安靜』**。一個要靠「沒消息就是好消息」來運作的系統,遲早會在某個沉默裡出事。

### metric 是「便宜的哨兵」,不是「詳細的檔案」

把四種 metric 怎麼用弄清楚後,我對 metric 的定位也更篤定了:**它是站在最前線、用最便宜的成本告訴你「有沒有事、多嚴重、趨勢往哪」的哨兵。** 它故意不記細節——因為記細節太貴,而那本來就不是它的工作。細節等哨兵示警、你確認真有事,再往 trace 和 log 去撈。這個「**便宜的粗、昂貴的細**」的分工,正是 [[obs-intro|三支柱]]能同時存在的經濟學:如果每一層都想記全部,你會破產。收束回這系列的主軸——metric 的終點也是**行動**:它是那個在半夜先把你叫起來、指個大方向的哨兵,而不是那份你事後才慢慢翻的檔案。把哨兵和檔案分清楚,你的監控才會又靈敏、又養得起。
