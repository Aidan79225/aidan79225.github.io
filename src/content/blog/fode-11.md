---
title: "資料工程的未來:工具會變、地基不變,讀《Fundamentals of Data Engineering》Ch.11(完結)"
date: 2026-07-06
category: tech
description: "系列完結篇。資料工程的未來是什麼?這篇拆《Fundamentals of Data Engineering》最後一章——工具會一直變、還越來越簡單,但生命週期與暗流不變。押地基,別押工具。"
tags:
  - data-engineering
  - book-notes
series: "Fundamentals of Data Engineering 讀書筆記"
seriesOrder: 11
comments: true
draft: false
---
十一章走到這裡,最後一個問題:**資料工程的未來會長怎樣?** 書的答案既讓人安心、又有點反直覺 —— **工具會一直變、而且越來越簡單;但底下那套生命週期與暗流,不會變。** 這一篇,也是這個系列的完結。

## 核心訊息:工具會變,地基不變

這章把整本書的立場收成一句話:**別把賭注押在工具上,押在地基上。** 今年最紅的框架、明年的新平台,三年後可能沒人提;但 [[fode-2|資料工程生命週期]]——源頭、擷取、儲存、轉換、服務,加上貫穿全程的暗流——幾十年不會走:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 300" role="img" aria-label="會變的工具在上層(當紅框架、託管服務、新平台,虛線代表會過時);不變的地基在下層,是資料工程生命週期(源頭→擷取→儲存→轉換→服務)加上暗流(安全、資料管理、編排、軟體工程、DataOps)" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="fu1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="300" y="15" fill="#9aa4b2" font-size="10.5" text-anchor="middle">會變的工具 —— 一直換、越來越簡單</text>
    <rect x="40" y="24" width="118" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/><text x="99" y="48" fill="#e6e6e6" font-size="10" text-anchor="middle">當紅框架</text>
    <rect x="170" y="24" width="118" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/><text x="229" y="48" fill="#e6e6e6" font-size="10" text-anchor="middle">託管服務</text>
    <rect x="300" y="24" width="118" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/><text x="359" y="48" fill="#e6e6e6" font-size="10" text-anchor="middle">新平台</text>
    <rect x="442" y="24" width="118" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/><text x="501" y="48" fill="#e6e6e6" font-size="10" text-anchor="middle">明年的工具</text>
    <line x1="40" y1="82" x2="560" y2="82" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 4"/>
    <text x="40" y="98" fill="#9aa4b2" font-size="8.5" text-anchor="start">↑ 三年後可能沒人用</text>
    <text x="560" y="98" fill="#9aa4b2" font-size="8.5" text-anchor="end">↓ 押三十年不太會錯</text>
    <rect x="30" y="110" width="540" height="170" rx="10" fill="none" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="300" y="132" fill="#4f6df5" font-size="12" font-weight="bold" text-anchor="middle">不變的地基</text>
    <rect x="39" y="148" width="90" height="42" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="84" y="174" fill="#e6e6e6" font-size="10.5" text-anchor="middle">源頭</text>
    <rect x="147" y="148" width="90" height="42" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="192" y="174" fill="#e6e6e6" font-size="10.5" text-anchor="middle">擷取</text>
    <rect x="255" y="148" width="90" height="42" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="300" y="174" fill="#e6e6e6" font-size="10.5" text-anchor="middle">儲存</text>
    <rect x="363" y="148" width="90" height="42" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="408" y="174" fill="#e6e6e6" font-size="10.5" text-anchor="middle">轉換</text>
    <rect x="471" y="148" width="90" height="42" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="516" y="174" fill="#e6e6e6" font-size="10.5" text-anchor="middle">服務</text>
    <line x1="129" y1="169" x2="147" y2="169" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#fu1)"/>
    <line x1="237" y1="169" x2="255" y2="169" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#fu1)"/>
    <line x1="345" y1="169" x2="363" y2="169" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#fu1)"/>
    <line x1="453" y1="169" x2="471" y2="169" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#fu1)"/>
    <rect x="39" y="210" width="522" height="44" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="300" y="230" fill="#54b890" font-size="10.5" text-anchor="middle">暗流</text>
    <text x="300" y="246" fill="#9aa4b2" font-size="9" text-anchor="middle">安全 · 資料管理 · 編排 · 軟體工程 · DataOps</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">上層工具一直換、還越來越好用;但底下這套生命週期＋暗流,幾十年不變 —— 要押,押地基</figcaption>
</figure>

這正是 [[fode-4|Ch.4「把架構錨定在不變的地基上」]]的最終回:**學工具會過時,學生命週期與取捨思維不會。**

## 未來的幾個方向

那具體會往哪走?書給了幾個預測,我濃縮成一張表:

| 趨勢 | 一句話 |
|---|---|
| **簡化、抽象上升** | 工具越包越好,DE 從「接水管」被解放(見下) |
| **即時變預設** | [[fode-7|批次與串流]]的界線越來越模糊,live data 成常態 |
| **與軟體工程融合** | DE 越來越像 SWE:版控、測試、CI 變基本要求 |
| **暗流更吃重** | [[fode-10|安全]]、資料管理、編排、DataOps 從加分變必修 |
| **往上、更靠近業務** | 省下的力氣移到建模與商業價值,而不是修管線 |

### 抽象往上長:DE 從「水電工」被解放

書最核心的未來預測是**簡化**:託管服務、宣告式工具(SQL、[[dbt-intro|dbt]])把底層越包越好,資料工程師不用再自己架叢集、手接一堆膠水程式。省下的力氣往哪去?**往上,移到更靠近業務價值的地方。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 230" role="img" aria-label="抽象往上長:過去 DE 手接管線、自架叢集、寫膠水程式(靠近底層水電);未來用託管與宣告式工具,力氣移到建模與業務價值(靠近業務)" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="fu2" markerWidth="10" markerHeight="10" refX="5" refY="8" orient="auto"><path d="M0,8 L5,0 L10,8 z" fill="#4f6df5"/></marker></defs>
    <line x1="46" y1="205" x2="46" y2="30" stroke="#4f6df5" stroke-width="1.6" marker-end="url(#fu2)"/>
    <text x="30" y="120" fill="#9aa4b2" font-size="9.5" text-anchor="middle" transform="rotate(-90 30 120)">抽象 · 靠近業務 ↑</text>
    <rect x="90" y="145" width="410" height="62" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="295" y="169" fill="#e6e6e6" font-size="11" text-anchor="middle">過去:手接管線、自架叢集、寫一堆膠水程式</text>
    <text x="295" y="189" fill="#9aa4b2" font-size="9" text-anchor="middle">當水電工,力氣花在底層</text>
    <rect x="90" y="28" width="410" height="62" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="295" y="52" fill="#e6e6e6" font-size="11" text-anchor="middle">未來:託管服務、宣告式(SQL / dbt)</text>
    <text x="295" y="72" fill="#9aa4b2" font-size="9" text-anchor="middle">省下的力氣花在建模與業務價值</text>
    <line x1="295" y1="145" x2="295" y2="92" stroke="#4f6df5" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#fu2)"/>
    <text x="410" y="120" fill="#4f6df5" font-size="9" text-anchor="middle">工具變簡單 → DE 往上移</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">工具把底層越包越好,資料工程師從「接水管」被解放,力氣往上移到更靠近業務價值的地方 —— 這是這章對未來最核心的預測</figcaption>
</figure>

有人擔心「工具都自動化了,DE 是不是不用了?」書的看法相反:**底層被自動化,反而讓需求往上長** —— 有人要決定架構、要選型、要顧治理與品質、要把資料翻成業務看得懂的模型。這些**判斷**不會被工具取代。

## 反思

### 讀完十一章,最大的收穫是「別追工具」

這是我做這整個系列最想收下的一句。市面上教「某個工具怎麼用」的內容多到滿出來,但這本書從頭到尾在講的是**生命週期、暗流、與取捨思維** —— 那些換了工具也還在的東西。我寫 [[spark-intro|Spark]]、[[kafka-intro|Kafka]]、[[airflow-intro|Airflow]]、[[dbt-intro|dbt]] 那幾個系列時很清楚:工具只是載體,真正想傳的是它們背後**為什麼這樣設計、解決哪個取捨**。這章等於幫整本書、也幫我這系列蓋章:**工具是手段,地基才是本事。**

### 工具越簡單,基本功反而越值錢

這點很反直覺,但我越來越信。當架叢集、接管線都被託管服務包掉,「會操作某個工具」就不再是護城河 —— 因為大家都會了。真正拉開差距的,變成那些工具幫不了你的:**這個資料該怎麼建模、這個取捨該往哪邊倒、這條 pipeline 壞了怎麼從第一原理debug、這份資料的品質與信任誰來守。** 所以工具變簡單不是讓基本功貶值,是讓它**更值錢**。這也呼應我一路的判斷 —— 把賭注下在 [[fode-6|SQL、物件儲存]]這種幾十年不變的地基上,而不是今年最紅的框架。

### 這個系列到這裡完結,但這套思維才正要開始用

十一篇讀書筆記走完,《Fundamentals of Data Engineering》最珍貴的地方,是它**不教你追新工具,教你一套幾十年不會過時的思考骨架**:任何資料問題,都拆成生命週期的五個環節,再問每個環節的取捨、每條暗流的守護。往後不管冒出什麼新工具、什麼「AI 自動做資料工程」的浪潮,我都會用這套骨架去接它 —— 先問它落在生命週期哪一段、幫我解了哪個取捨,而不是被它的新奇牽著走。**這,就是這本書、也是這個系列,最想留下的東西。**
