---
title: "資料工程是什麼:讀《Fundamentals of Data Engineering》Ch.1"
date: 2026-06-28
category: tech
tags:
  - data-engineering
  - book-notes
series: "Fundamentals of Data Engineering 讀書筆記"
seriesOrder: 1
comments: true
draft: false
---
我開一個新系列,讀 Joe Reis 與 Matt Housley 的 *Fundamentals of Data Engineering*。這本書最大的價值,是把「資料工程」這個常被講得很模糊的職能,收斂成一套清楚的框架與語言。第一章先回答最根本的問題:**資料工程到底是什麼、資料工程師實際在做什麼、他站在整個資料世界的哪個位置。**

## 資料工程的定義:把原始資料變成「可用」的那段系統工程

書裡的定義值得記下來:**資料工程是「開發、實作、維護那些把原始資料轉成高品質、一致的資訊,以支援下游用途(分析、ML)」的系統與流程。** 它橫跨六個面向的交集 —— 安全、資料管理、DataOps、資料架構、編排(orchestration)、軟體工程。

關鍵認知:**資料工程的產出不是「資料」,是「可信、可用的資料系統」。** 重點在「系統與流程」這幾個字 —— 它不是一次性把資料搬過去,而是建立一條能持續、可靠地產出乾淨資料的管線。這跟我寫 [[dbt-intro|dbt]] 時的結論完全一致:賣的不是「用 SQL 轉資料」,是工程紀律。

## 資料科學的需求金字塔:DE 是地基

全書最有名的一張圖,是借自 Monica Rogati 的「資料科學需求金字塔」—— 仿馬斯洛需求層次,說明**在做 ML / AI 之前,底層的資料工程必須先打好**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 520 268" role="img" aria-label="資料科學需求金字塔:底部三層(收集、搬運儲存、彙整標註)是資料工程,上面兩層(學習最佳化、AI)才是 ML/AI" style="width:100%;max-width:560px;height:auto;margin:0 auto;">
    <polygon points="153.5,111 306.5,111 420,240 40,240" fill="#4f6df5" fill-opacity="0.16"/>
    <polygon points="230,24 420,240 40,240" fill="none" stroke="#3a4154" stroke-width="1.6"/>
    <line x1="191.3" y1="68" x2="268.7" y2="68" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="153.5" y1="111" x2="306.5" y2="111" stroke="#4f6df5" stroke-width="1.4"/>
    <line x1="115.6" y1="154" x2="344.4" y2="154" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="77.8" y1="197" x2="382.2" y2="197" stroke="#3a4154" stroke-width="1.2"/>
    <text x="230" y="50" fill="#9aa4b2" font-size="11" text-anchor="middle">AI / 深度學習</text>
    <text x="230" y="93" fill="#9aa4b2" font-size="11" text-anchor="middle">學習・最佳化(A/B、ML)</text>
    <text x="230" y="135" fill="#e6e6e6" font-size="11" text-anchor="middle">彙整・標註(分析、指標)</text>
    <text x="230" y="178" fill="#e6e6e6" font-size="11" text-anchor="middle">搬運・儲存(pipeline、ETL)</text>
    <text x="230" y="221" fill="#e6e6e6" font-size="11" text-anchor="middle">收集(紀錄、感測、外部資料)</text>
    <text x="446" y="86" fill="#9aa4b2" font-size="10.5" text-anchor="start">ML / AI</text>
    <line x1="430" y1="95" x2="430" y2="28" stroke="#3a4154" stroke-width="1.2"/>
    <text x="446" y="182" fill="#4f6df5" font-size="10.5" text-anchor="start">資料工程</text>
    <line x1="430" y1="240" x2="430" y2="111" stroke="#4f6df5" stroke-width="1.4"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">底部三層是資料工程的地盤;沒先把收集、搬運、彙整做好,上面的 ML/AI 都是空中樓閣</figcaption>
</figure>

這張圖的訊息很狠:**大家都想做最上面那層華麗的 AI,但九成的失敗是因為地基沒打好。** 資料工程師的價值,正是把金字塔底部那幾層撐起來。

## 資料工程師的兩種光譜:A 型 vs B 型

書裡用一個好記的分法描述資料工程師的取向:

| | A 型(Abstraction) | B 型(Build) |
|---|---|---|
| 核心 | **抽象化**:盡量用現成、託管的方案 | **建造**:自己打造工具與框架 |
| 心態 | 避免「沒有差異化的粗活」 | 為規模與內部需求造輪子 |
| 適合 | 多數團隊、早中期 | 規模大、現成方案不夠用時 |

書的立場(也是我的立場):**多數人該先當 A 型** —— 別一上來就造輪子,把力氣留給真正有差異化的問題。B 型不是更高級,而是「規模到了、現成的真的不夠」時才需要。

## 資料成熟度:同一個職稱,三種不同的工作

書裡還有一個很實用的「資料成熟度」三階段模型 —— 提醒你**「資料工程師」在不同成熟度的公司,做的事天差地遠**:

1. **Starting with data(剛起步)**:幾乎沒有資料基礎建設。DE 像通才,什麼都要碰 —— 先把資料能流動、能存起來。
2. **Scaling with data(規模化)**:資料量與團隊都在長。DE 開始建可擴展、可重複的系統,導入正式工具與實踐。
3. **Leading with data(以資料領先)**:資料是核心競爭力。DE 做自動化、自助化,讓組織能規模化地用資料。

這解釋了一個常見困惑:為什麼兩個都叫「資料工程師」的人,聊起來像在做完全不同的工作 —— 因為他們的公司在不同的成熟度階段。

## 反思

### 「會用工具」不等於「會資料工程」

我最有共鳴的一點,是書把資料工程定位成**系統工程**,而不是「會用 Airflow / Spark / Kafka 的人」。工具只是手段 —— 我這半年寫了一整排工具的筆記([[airflow-intro|Airflow]]、[[spark-intro|Spark]]、[[kafka-intro|Kafka]]、[[dbt-intro|dbt]]),但這本書提醒我:把這些串成一個**可信、可維護、能持續產出乾淨資料的系統**,才是真本事。會敲指令的人很多,能設計出不會在半夜爆掉的資料系統的人很少。

### A 型優先,是我一路講的同一件事

書裡「多數人該先當 A 型工程師」的主張,跟我在每一篇工具筆記的結論驚人地一致 —— 我寫 [[airflow-intro|Airflow]]、[[spark-running|Spark]]、[[kafka-intro|Kafka]] 都在說同一句話:**先確認痛點到了那個量級,再上重武器;能用託管/現成的就別自架。** 造輪子的衝動很迷人,但「沒有差異化的粗活」自己扛,往往只是把維運債堆給未來的自己。B 型的時機是規模逼出來的,不是拿來證明技術力的。

### 需求金字塔,是我看過最該貼在牆上的一張圖

太多團隊(包括我看過的)急著做最上層的 ML/AI,卻沒先把收集、搬運、彙整這幾層做穩 —— 結果模型吃的是髒資料,garbage in, garbage out。這張金字塔給了我一個對外溝通的利器:當有人問「為什麼還不能上 AI」,我可以指著它說「因為地基還沒好」。資料工程不性感,但它是上面所有東西能成立的前提 —— 這也是我決定認真讀這本書、把這個系列寫下去的理由。
