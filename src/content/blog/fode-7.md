---
title: "把資料搬進來:批次還是串流?讀《Fundamentals of Data Engineering》Ch.7"
date: 2026-07-02
category: tech
description: "資料工程生命週期的第二站:把資料從源頭搬進系統。批次還是串流?push、pull 還是 poll?用光譜圖與三種取數模式講清楚,並說明為什麼批次到今天仍是預設。"
tags:
  - data-engineering
  - book-notes
  - ingestion
series: "Fundamentals of Data Engineering 讀書筆記"
seriesOrder: 7
comments: true
draft: false
---
[[fode-5|源頭]]生出資料、[[fode-6|儲存]]準備好接,中間那條把資料**搬進來**的動作,就是這章的主角:**Ingestion(擷取)**。它是生命週期的第二站,也是最多人一上來就糾結「要不要即時」的地方。這章最該先想清楚的一句話是 —— **批次還是串流,不是技術品味問題,是業務價值問題。**

## 先問對問題:ingestion 的幾條關鍵軸

書提醒:在選任何工具之前,先想清楚這幾個面向。它們合起來決定你的擷取長什麼樣:

| 面向 | 在問什麼 |
|---|---|
| **頻率** | 批次?串流?還是介於中間的微批次?(下節主角) |
| **有界 / 無界** | 一份固定的檔,還是永不結束的事件流? |
| **push / pull** | 來源主動送,還是你主動去拿?(見下) |
| **同步 / 非同步** | 要等它完成,還是丟了就走? |
| **payload** | 資料多大、什麼格式、schema 會不會變?([[fode-5\|源頭那章]]的痛) |
| **可靠性** | 掉一筆會怎樣?能不能重送、去重? |

這些問題的答案,幾乎都指向同一個核心決定:**多即時?**

## 核心光譜:批次 ↔ 微批次 ↔ 串流

「批次還是串流」其實不是二選一,而是一條**光譜**。往即時走一步,就多付一分複雜度與成本:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 210" role="img" aria-label="擷取頻率光譜:左邊批次(小時到天、成熟便宜、預設),中間微批次(秒到分),右邊串流(毫秒到秒、即時但複雜貴);越往右延遲越低、複雜度與成本越高" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="in1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto-start-reverse"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="65" y="30" width="150" height="80" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="140" y="55" fill="#4f6df5" font-size="13" font-weight="bold" text-anchor="middle">批次 Batch</text>
    <text x="140" y="78" fill="#e6e6e6" font-size="11.5" text-anchor="middle">小時 ~ 天</text>
    <text x="140" y="97" fill="#9aa4b2" font-size="8.5" text-anchor="middle">定時/定量・成熟(預設)</text>
    <rect x="225" y="30" width="150" height="80" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="300" y="55" fill="#e6e6e6" font-size="12.5" text-anchor="middle">微批次 Micro-batch</text>
    <text x="300" y="78" fill="#e6e6e6" font-size="11.5" text-anchor="middle">秒 ~ 分</text>
    <text x="300" y="97" fill="#9aa4b2" font-size="8.5" text-anchor="middle">每一小批處理一次</text>
    <rect x="385" y="30" width="150" height="80" rx="8" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/>
    <text x="460" y="55" fill="#54b890" font-size="13" font-weight="bold" text-anchor="middle">串流 Streaming</text>
    <text x="460" y="78" fill="#e6e6e6" font-size="11.5" text-anchor="middle">毫秒 ~ 秒</text>
    <text x="460" y="97" fill="#9aa4b2" font-size="8.5" text-anchor="middle">逐筆事件・即時</text>
    <line x1="140" y1="110" x2="140" y2="138" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="300" y1="110" x2="300" y2="138" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="460" y1="110" x2="460" y2="138" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="40" y1="140" x2="560" y2="140" stroke="#9aa4b2" stroke-width="1.4" marker-start="url(#in1)" marker-end="url(#in1)"/>
    <text x="40" y="165" fill="#9aa4b2" font-size="9" text-anchor="start">高延遲・低複雜・便宜</text>
    <text x="560" y="165" fill="#9aa4b2" font-size="9" text-anchor="end">低延遲・高複雜・貴</text>
    <text x="300" y="192" fill="#9aa4b2" font-size="9.5" text-anchor="middle">每往即時走一步,就多付一分複雜度與成本</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">擷取頻率是一條光譜,不是二選一;批次仍是成熟、便宜的預設,串流用延遲換來的即時,代價是複雜度與成本</figcaption>
</figure>

**微批次(如 [[spark-streaming|Spark Structured Streaming]])是實務上很甜的中間點** —— 用「每幾秒跑一小批」逼近串流的即時,卻大致沿用批次那套熟悉的心智與工具。很多「我們需要即時」的需求,其實微批次就滿足了。

## 批次抽取的兩種姿勢:快照 vs 增量

走批次時,還有一個常踩的坑 —— 每次要搬**整份**還是只搬**新的**?

- **快照(snapshot)**:每次抓整張表的當下狀態。簡單、好推理,但資料一大就重、又慢又貴。
- **增量(differential / incremental)**:只抓上次之後變動的部分。省很多,但你得有辦法知道「哪些變了」—— 時間戳記、遞增 id,或更漂亮的 [[fode-5|CDC(讀資料庫變更日誌)]]。

**小資料用快照省心,資料一大就得改增量。** 這是批次擷取從能跑到跑得起的分水嶺。

## Push、Pull 還是 Poll:誰發起這件事

另一個容易混的維度:資料的移動,是**誰主動**?書分成三種模式:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 250" role="img" aria-label="三種取數模式:Push 由來源主動把資料推給擷取端;Pull 由擷取端發請求去要、資料再回來;Poll 由擷取端定期詢問有沒有新資料、有才回傳" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="ma" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker><marker id="mg" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#54b890"/></marker></defs>
    <text x="12" y="40" fill="#4f6df5" font-size="12" font-weight="bold" text-anchor="start">Push</text>
    <text x="12" y="56" fill="#9aa4b2" font-size="8.5" text-anchor="start">來源發起</text>
    <rect x="90" y="23" width="110" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="145" y="50" fill="#e6e6e6" font-size="11" text-anchor="middle">來源</text>
    <rect x="380" y="23" width="130" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="445" y="50" fill="#e6e6e6" font-size="11" text-anchor="middle">Ingestion</text>
    <line x1="200" y1="45" x2="378" y2="45" stroke="#54b890" stroke-width="1.5" marker-end="url(#mg)"/><text x="289" y="37" fill="#9aa4b2" font-size="8.5" text-anchor="middle">事件一發生就送(webhook・producer)</text>
    <text x="12" y="125" fill="#4f6df5" font-size="12" font-weight="bold" text-anchor="start">Pull</text>
    <text x="12" y="141" fill="#9aa4b2" font-size="8.5" text-anchor="start">你發起</text>
    <rect x="90" y="108" width="110" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="145" y="135" fill="#e6e6e6" font-size="11" text-anchor="middle">來源</text>
    <rect x="380" y="108" width="130" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="445" y="135" fill="#e6e6e6" font-size="11" text-anchor="middle">Ingestion</text>
    <line x1="378" y1="122" x2="202" y2="122" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#ma)"/><text x="289" y="116" fill="#9aa4b2" font-size="8.5" text-anchor="middle">① 我發請求</text>
    <line x1="200" y1="140" x2="378" y2="140" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#ma)"/><text x="289" y="153" fill="#9aa4b2" font-size="8.5" text-anchor="middle">② 資料回來(DB query・API GET)</text>
    <text x="12" y="210" fill="#4f6df5" font-size="12" font-weight="bold" text-anchor="start">Poll</text>
    <text x="12" y="226" fill="#9aa4b2" font-size="8.5" text-anchor="start">你定期問</text>
    <rect x="90" y="193" width="110" height="44" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="145" y="220" fill="#e6e6e6" font-size="11" text-anchor="middle">來源</text>
    <rect x="380" y="193" width="130" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="445" y="220" fill="#e6e6e6" font-size="11" text-anchor="middle">Ingestion</text>
    <line x1="378" y1="215" x2="202" y2="215" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#ma)"/><text x="289" y="209" fill="#9aa4b2" font-size="8.5" text-anchor="middle">定期問:有新的嗎?(×N,有才回傳)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Push 是來源主動送(webhook、串流 producer);Pull 是你主動去要(查 DB、打 API);Poll 是你定期去問有沒有新的 —— 決定了誰扛延遲與負載</figcaption>
</figure>

這三種不只是名詞:**push 通常對應串流與低延遲,pull / poll 對應批次**。poll 太密會壓垮來源、太疏又延遲高,所以能 push(或 [[fode-5\|CDC]])時,往往比狂 poll 漂亮。

## 該不該上串流?書的答案很克制

講到這你可能想:那就上串流嘛,即時多好。但書(和我)的立場很保守:**批次到今天仍是預設,串流是為了業務價值才上的例外。** 兩個先問自己的問題:

1. **即時真的有價值嗎?** 報表明天看和五秒後看沒差,那串流只是徒增成本。
2. **下游用得到即時嗎?** 你辛苦串流進來,結果下游還是每天跑一次批次分析 —— 那即時在半路就被浪費掉了。

除非這兩題都是「是」,否則別為了即時而即時。這跟我那篇 [[pain-before-power|先確認痛點,再上重武器]]完全同調 —— 串流是重武器,先確認你真的痛。

## 怎麼把資料搬進來:別自己造輪子

最後是實際的搬運方式。書列了一整排,我按「你要碰多少底層」排:

| 方式 | 場景 |
|---|---|
| **直連資料庫(JDBC/ODBC)** | 最原始,自己查自己搬 |
| **[[fode-5\|CDC]]** | 讀變更日誌,近即時又不壓主庫 |
| **API** | 第三方 SaaS 的標準入口 |
| **訊息 / 事件串流** | 即時事件,見 [[kafka-intro\|Kafka]] |
| **託管連接器(Fivetran、Airbyte)** | 常見來源直接接好,免自己維護 |

最後一列是重點:**擷取這種「大家都在做、又沒差異化」的粗活,優先用託管連接器**,別自己刻一堆 API 串接又自己養。這正是 [[fode-4|Ch.4]]「預設買 / 用現成」在擷取這一站的落地。

## 反思

### 「要不要即時」是我看過最常被問錯的問題

幾乎每個資料需求,一開口都是「我要即時」。但這章把問題導正了:**先問即時有沒有價值、下游吃不吃得下,再決定頻率。** 我遇過太多「說要即時」的需求,追下去發現使用者其實一天看一次報表 —— 那串流純粹是給自己找維運。我現在的預設反過來:**先問能不能批次解決**,不行、且即時真的有商業價值,才往微批次、再往串流爬。批次不是落後,是還沒被證明不夠用之前最理性的選擇。

### 微批次是我最常推的「剛剛好」

真的需要更快時,我很少一步跳到逐筆串流,而是先試**微批次**。[[spark-streaming|Structured Streaming]]那種「每幾秒一小批」,大致沿用批次的心智與除錯方式,卻把延遲壓到秒級 —— 對絕大多數「想要更即時一點」的需求綽綽有餘,又躲掉了純串流那套狀態、亂序、exactly-once 的複雜度。用最小的複雜度增量換到夠用的即時,是我做擷取時反覆用的一條原則。

### push / CDC 讓我少 poll 出很多禍

早年我做擷取很愛用 poll —— 每分鐘去問來源一次,簡單直覺。但量一上來就兩難:問太密壓垮來源、問太疏又延遲高。後來學會**能 push 就 push、能讀日誌就 [[fode-5\|CDC]]**,很多這種兩難直接消失:資料一有變動就流過來,我不用一直敲門。這跟 [[fode-6|上一章]]「借力資料庫本來就在寫的 log」是同一種聰明 —— 與其自己狂輪詢,不如讓來源在對的時機告訴你。
