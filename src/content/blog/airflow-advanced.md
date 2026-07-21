---
title: "Airflow 進階:Datasets、deferrable operators 與 executor 選型"
date: 2026-07-22
category: tech
tags:
  - airflow
  - data-engineering
series: "Airflow 學習筆記"
seriesOrder: 9
comments: true
draft: false
---
主線走完,這篇收三個進階功能。它們看似無關,其實有個共同點:**都在解 Airflow 某個「死板」或「浪費」**——排程只認時間、sensor 佔著 slot 空等、worker 一刀切。三個都是選配,但每個都能讓你的平台更聰明、更省。

## 從時間驅動到資料驅動:Datasets

跨 DAG 協調,最土的做法是用 cron **對時間**:DAG A 排 02:00,DAG B 排 02:30——賭 A 半小時內跑完。但 A 一遲到,B 在 02:30 照樣跑,吃到舊資料甚至空的。**Datasets(資料感知排程)**把這件事翻轉成資料驅動:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 202" role="img" aria-label="時間驅動與資料驅動的對比。左邊時間驅動:DAG A 排 02:00、DAG B 排 02:30,B 只是賭 A 半小時內跑完,如果 A 遲到,B 在 02:30 照樣跑就吃到舊資料或空資料,很脆弱。右邊資料驅動:DAG A 產出一個叫 sales 的 dataset,DAG B 的 schedule 設成這個 dataset,A 一更新 sales,B 就立刻被觸發,不早不晚。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <line x1="280" y1="20" x2="280" y2="182" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="140" y="36" fill="#e05a7d" font-size="10.5" text-anchor="middle" font-weight="bold">時間驅動:cron 對時(脆弱)</text>
    <rect x="40" y="48" width="200" height="26" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="140" y="65" fill="#e6e6e6" font-size="8.6" text-anchor="middle">DAG A @ 02:00</text>
    <line x1="140" y1="74" x2="140" y2="90" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2"/><text x="140" y="86" fill="#9aa4b2" font-size="7.2" text-anchor="middle">賭 A 跑完了</text>
    <rect x="40" y="92" width="200" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="140" y="109" fill="#e6e6e6" font-size="8.6" text-anchor="middle">DAG B @ 02:30(猜的)</text>
    <rect x="40" y="128" width="200" height="42" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="140" y="145" fill="#e05a7d" font-size="8.2" text-anchor="middle" font-weight="bold">A 遲到 → B 照跑</text><text x="140" y="160" fill="#9aa4b2" font-size="7.4" text-anchor="middle">→ 吃到舊 / 空資料 ✗</text>
    <text x="420" y="36" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">資料驅動:Dataset(精準)</text>
    <rect x="320" y="48" width="200" height="26" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="420" y="65" fill="#e6e6e6" font-size="8.6" text-anchor="middle">DAG A → 產出 sales</text>
    <line x1="420" y1="74" x2="420" y2="86" stroke="#54b890" stroke-width="1.2" marker-end="url(#av1)"/>
    <defs><marker id="av1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker></defs>
    <rect x="352" y="88" width="136" height="24" rx="10" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.3"/><text x="420" y="104" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">Dataset: sales</text>
    <line x1="420" y1="112" x2="420" y2="124" stroke="#54b890" stroke-width="1.2" marker-end="url(#av1)"/>
    <rect x="320" y="126" width="200" height="26" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.3"/><text x="420" y="143" fill="#e6e6e6" font-size="8.4" text-anchor="middle">DAG B  schedule=[sales]</text>
    <text x="420" y="168" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">A 一更新 → B 立刻觸發,不早不晚 ✓</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e05a7d">時間驅動</b>是「賭上游好了」——DAG B 排在 A 後面半小時,A 一遲到就吃到舊資料。<b style="color:#54b890">資料驅動</b>是「上游告訴我好了」:DAG A 宣告它<b>產出(produces)</b>一個 <code>Dataset</code>,DAG B 的 <code>schedule</code> 直接設成那個 dataset——A 一更新它,B <b>立刻</b>被觸發,不早不晚。這比舊的 <a href="/blog/airflow-scheduling/">cron 對時</a>或 ExternalTaskSensor 精準太多,是從<b>輪詢時間</b>到<b>被事件驅動</b>的轉變</figcaption>
</figure>

落成程式碼,就是「A 掛 outlet、B 拿 dataset 當 schedule」:

```python
from airflow.datasets import Dataset

sales = Dataset("s3://warehouse/sales")

@task(outlets=[sales])          # A:宣告「我這個 task 會更新 sales」
def build_sales(): ...

@dag(schedule=[sales], ...)     # B:sales 一被更新就自動觸發(不用寫 cron)
def downstream(): ...
```

## 別讓 sensor 佔著 slot 空等:deferrable operators

[[airflow-providers|Sensor 那篇]]講過 sensor 用來「等外部條件」(等一個檔案、等一個外部 job)。但傳統 sensor 有個浪費:它**整段等待時間都佔著一個 worker slot** 在那反覆 poke。等的東西越多,slot 被空等吃得越乾淨:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 200" role="img" aria-label="傳統 sensor 與 deferrable operator 的對比。左邊傳統 sensor:worker 池裡三個 slot 全被空等的 sensor 佔住,反覆 poke 外部條件,N 個 sensor 等於 N 個 slot 卡死,worker 被等待吃光。右邊 deferrable:sensor 把等待這件事 defer 讓給 triggerer,triggerer 是一個 async 進程、用 asyncio 同時等上千個,worker 的 slot 立刻釋放去跑真正的 task,事件到了才把 task 喚回。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <line x1="280" y1="20" x2="280" y2="182" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="140" y="34" fill="#e05a7d" font-size="10.5" text-anchor="middle" font-weight="bold">傳統 sensor:佔 slot 空等</text>
    <rect x="30" y="44" width="220" height="90" rx="7" fill="none" stroke="#9aa4b2" stroke-width="1.2"/><text x="140" y="60" fill="#9aa4b2" font-size="8" text-anchor="middle">worker 池</text>
    <rect x="44" y="68" width="192" height="18" rx="3" fill="#3a2626" stroke="#e05a7d" stroke-width="1"/><text x="140" y="81" fill="#e05a7d" font-size="7.4" text-anchor="middle">slot 1:sensor 空等…</text>
    <rect x="44" y="90" width="192" height="18" rx="3" fill="#3a2626" stroke="#e05a7d" stroke-width="1"/><text x="140" y="103" fill="#e05a7d" font-size="7.4" text-anchor="middle">slot 2:sensor 空等…</text>
    <rect x="44" y="112" width="192" height="18" rx="3" fill="#3a2626" stroke="#e05a7d" stroke-width="1"/><text x="140" y="125" fill="#e05a7d" font-size="7.4" text-anchor="middle">slot 3:sensor 空等…</text>
    <text x="140" y="152" fill="#e05a7d" font-size="8" text-anchor="middle" font-weight="bold">N 個 sensor = N 個 slot 卡死</text>
    <text x="140" y="168" fill="#9aa4b2" font-size="7.4" text-anchor="middle">worker 被「等待」吃光,真 task 排不進</text>
    <text x="420" y="34" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">deferrable:丟給 triggerer</text>
    <rect x="310" y="44" width="220" height="52" rx="7" fill="none" stroke="#54b890" stroke-width="1.2"/><text x="420" y="60" fill="#54b890" font-size="8" text-anchor="middle">worker 池(slot 釋放)</text>
    <rect x="324" y="68" width="192" height="18" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/><text x="420" y="81" fill="#54b890" font-size="7.4" text-anchor="middle">空出來 → 去跑真正的 task ✓</text>
    <rect x="310" y="106" width="220" height="40" rx="7" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.4"/><text x="420" y="122" fill="#9b6ff0" font-size="8.4" text-anchor="middle" font-weight="bold">Triggerer(1 個 async 進程)</text><text x="420" y="136" fill="#9aa4b2" font-size="7.2" text-anchor="middle">用 asyncio 同時等上千個</text>
    <text x="420" y="164" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">等待幾乎免費;事件到了才喚回 worker</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e05a7d">傳統 sensor</b> 在等的整段時間,都<b>佔著一個 worker slot</b> 反覆 poke——10 個 sensor 就卡死 10 個 slot,真正要幹活的 task 反而排不進。<b style="color:#54b890">Deferrable operator</b> 把「等待」這件事 <code>defer</code> 出去,交給 <a href="/blog/infra-airflow/">triggerer</a>(一個 async 進程,用 asyncio 同時等上千個),<b>worker slot 立刻釋放</b>去跑真 task,等到事件成立才把 task 喚回。等待從「昂貴地佔資源」變成「幾乎免費」</figcaption>
</figure>

要用它,除了把 operator 換成 deferrable 版本(很多內建 sensor 有 `deferrable=True` 開關),還得確定叢集有跑 **triggerer** 這個進程(`infra-airflow` 提過它是常駐元件之一)。當你有一堆在等外部系統的 task,這個改動能把 worker 的有效產能翻好幾倍。

## 選對執行器:executor

最後一個「別一刀切」的地方是 **executor**——它決定 task 實際怎麼被執行。[[infra-airflow|infra 那篇]]從部署角度深談過,這裡給一張「該選哪個」的速查:

| Executor | task 怎麼跑 | 適合 |
|---|---|---|
| **Local** | 在 scheduler 同機、以子行程跑 | 開發、小專案、量不大 |
| **Celery** | 丟進 broker(Redis/RabbitMQ),固定一群常駐 worker 搶著跑 | 任務量穩定、想省開 pod 的延遲 |
| **Kubernetes** | 每個 task 開一個 pod,跑完即刪 | 任務起伏大、要徹底隔離與彈性擴縮 |

判準跟 [[infra-spark|Spark]] 的 executor 一樣落在 stateless 那條軸:**任務量穩→Celery(固定池省延遲),任務量爆起爆落→Kubernetes(一 task 一 pod、算完即刪、不養閒置)。** 別從頭到尾只用同一種。

## 反思

### 從「按時間猜」到「按資料反應」,是可靠性的一次躍遷

Datasets 讓我體會到一個通用的道理:**time-driven 是猜,event-driven 是知道。** cron 排程的本質,永遠是「賭上游那時候好了」——賭錯就吃舊資料。而 Datasets 把它翻成「上游好了會告訴我」,那份不確定性就消失了。這個從**輪詢時間**到**被事件驅動**的轉變,不只在 Airflow——webhook 之於輪詢 API、reactive 之於 polling、[[redis-pubsub-stream|訊息驅動]]之於定時掃表,都是同一次躍遷。我現在看到任何「排個固定時間去猜對方好了沒」的設計,都會反射性地問一句:**能不能改成『對方好了就通知我』?** 那幾乎總是更準、也更省。

### 「等待」不該佔資源——這是個到處適用的效率洞見

deferrable operator 點破了一個我以前沒意識到的浪費:一個 sensor task,90% 的時間都在「等」,卻整段佔著一個 worker。把「等」和「做」分開、讓等待幾乎免費——這個念頭一旦有了,你會發現它到處都是:非阻塞 I/O、async/await、[[redis-single-thread|Redis 的 epoll]]、作業系統的中斷 vs 輪詢……全是同一個智慧:**用一個執行緒空轉去等一件事,是最笨的做法;正確的做法是「掛起、讓出、事件來了再喚醒」。** Airflow 的 triggerer 就是把這個 OS 級的老智慧,搬到了工作流程這一層。看懂一個,你就看懂了一整類效率問題的解法。

### 收尾整個系列:成熟不是會用最多功能,是知道何時還不需要

這三個功能都很香,但我要強調的收尾,恰恰是**它們都是選配**。沒有跨 DAG 協調的痛,別急著上 Datasets;sensor 不多、slot 不緊,deferrable 是過度工程;單機跑得動,別為了潮而上 KubernetesExecutor。這呼應了整個 Airflow 系列、乃至我對工具一貫的態度——[[pain-before-power|先確認痛點,再上重武器]]。回頭看這一路:從跑起[[airflow-first-dag|第一個 DAG]]、搞懂[[airflow-scheduling|排程區間]]、學會[[airflow-reliability|可靠性]]與[[airflow-testing-deploy|測試部署]],到這篇的進階武器——**真正的成熟,從來不是會用最多功能,而是清楚每個功能在解什麼痛、以及什麼時候你還不需要它。** 一個 DAG 從能跑、到可靠、到聰明,靠的不是堆功能,是每一步都問對「我現在真正缺的是什麼」。Airflow 系列,就收在這句話上。
