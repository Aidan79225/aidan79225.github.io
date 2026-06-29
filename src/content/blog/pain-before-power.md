---
title: "先確認痛點,再上重武器"
date: 2026-06-28
category: tech
tags:
  - concept
  - data-engineering
comments: true
---
> 這是一篇**概念筆記** —— 一個我反覆在用的判斷,獨立成篇,讓其他文章可以連回來。

一句話:**在引入任何重型工具或架構之前,先確認你的痛點真的到了需要它的量級。** 沒到,就別上 —— 因為重武器的成本不在「裝起來」,在「之後每天要餵養它」。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 200" role="img" aria-label="以痛點量級為橫軸:臨界點以左用輕量解,跨過臨界點才上重武器" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="pbp1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="20" y="40" width="248" height="98" rx="10" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <text x="144" y="62" fill="#e6e6e6" font-size="12" text-anchor="middle">痛點還沒到 → 輕量解</text>
    <text x="144" y="84" fill="#9aa4b2" font-size="10" text-anchor="middle">本機 PySpark · dbt + 倉儲</text>
    <text x="144" y="102" fill="#9aa4b2" font-size="10" text-anchor="middle">直接打 API · 兩層架構</text>
    <text x="144" y="124" fill="#9aa4b2" font-size="9.5" text-anchor="middle">成本低、好維護</text>
    <rect x="292" y="40" width="248" height="98" rx="10" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="416" y="62" fill="#e6e6e6" font-size="12" text-anchor="middle">痛點到了 → 才上重武器</text>
    <text x="416" y="84" fill="#9aa4b2" font-size="10" text-anchor="middle">Spark 叢集 · Kafka</text>
    <text x="416" y="102" fill="#9aa4b2" font-size="10" text-anchor="middle">Airflow · 多層 Medallion</text>
    <text x="416" y="124" fill="#d4af37" font-size="9.5" text-anchor="middle">威力強,但每天要餵養</text>
    <line x1="280" y1="28" x2="280" y2="150" stroke="#d4af37" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="280" y="22" fill="#d4af37" font-size="10" text-anchor="middle">痛點臨界點</text>
    <line x1="20" y1="172" x2="548" y2="172" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pbp1)"/>
    <text x="284" y="192" fill="#9aa4b2" font-size="10" text-anchor="middle">痛點量級(資料量 · 來源數 · 編排複雜度)→</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">判準是「成本 ÷ 痛點」的比值:痛點具體到那個量級才跨線上重武器;只是「聽起來該有」就先待在左邊</figcaption>
</figure>

## 什麼是「重武器」

我指的是那些威力強、但維運成本也高的東西:[[airflow-intro|Airflow]]、[[spark-intro|Spark]]、[[kafka-intro|Kafka]]、自架叢集、多層資料架構…… 它們都能解決真實且困難的問題。但每一個都同時帶來一整套要學、要監控、要值班、要除錯的負擔。**威力與負擔是綁在一起賣的,你不能只拿前者。**

## 失敗模式:把複雜度當成就

我看過最貴的錯,不是「沒上對工具」,而是**太早上、為了用而用**:

- 資料還在幾 GB,就先架一個 Spark 叢集 —— 其實本機 PySpark 甚至 [[dbt-intro|dbt]] + 倉儲就解決了。
- 兩三個服務偶爾傳個訊息,就扛一整套 [[kafka-intro|Kafka]] —— 直接打 API 或用輕量佇列往往更划算。
- 只有一兩個報表,就硬切三層 [[medallion-architecture|Medallion]] —— 兩層(原始 + 報表)就夠。

這些決定的共通點,是**把「用了很厲害的東西」當成工程成就**。但能扛的複雜度是有限的預算,花在這裡,就沒得花在真正有差異化的問題上。

## 判準:痛點到了那個量級了嗎

上重武器前,我會逼自己回答一個具體問題:**現在這個痛,是它要解的那種痛嗎?**

- 單機真的裝不下、算不完了嗎?→ 才輪到 Spark。
- 真的多來源、多消費者、要稽核與重建了嗎?→ 才輪到分層架構 / Kafka。
- 真的有「定時、相依、失敗要重試」的編排需求了嗎?→ 才輪到 Airflow。

痛點具體、可指認,才上;只是「聽起來該有」或「履歷想寫」,就先忍住。

## 但這不是「反對工具」

關鍵的反面:**一旦痛點到了,就別猶豫。** 這個原則不是叫你停在土法煉鋼 —— 是叫你把重武器留給對的時機。它也有例外:像 [[dbt-intro|dbt]],導入成本低、下檔風險小、投報率高,我就會說「幾乎可以直接上」。判準從來是**成本與痛點的比值**,不是「工具越少越好」。

重武器是**手段,不是成就**。複雜度要花在刀口上 —— 這是我幾乎每次做技術選型都會先過一遍的那把尺。
