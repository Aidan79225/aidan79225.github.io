---
title: "最該重視卻最被忽略的一章:安全與隱私,讀《Fundamentals of Data Engineering》Ch.10"
date: 2026-07-05
category: tech
description: "書把安全排在很後面,卻說它最重要也最常被忽略。這篇拆《Fundamentals of Data Engineering》Ch.10——安全其實是人的問題不是工具問題,以及「資料是資產也是負債」這個會改變你收資料態度的反轉。"
tags:
  - data-engineering
  - book-notes
  - security
series: "Fundamentals of Data Engineering 讀書筆記"
seriesOrder: 10
comments: true
draft: false
---
走完[[fode-9|服務]],生命週期還有一條**貫穿全程的暗流**沒單獨講:**安全與隱私**。書把它排在很後面,卻直說這是**最重要、也最常被忽略**的一章。而它最反直覺的第一句話是 —— **安全主要是「人」的問題,不是「工具」的問題。**

## 第一課:安全是人的問題,不是買工具就好

大多數的資料外洩,不是密碼學被破解,而是**人為疏失與社交工程** —— 一個被釣魚的帳號、一個開太大的權限、一份放錯地方的匯出檔。所以安全的地基是**行為與文化**,不是再買一套資安產品。書給了三個心法:

- **最小權限(least privilege)**:只給剛好夠用的權限、剛好夠用的時間。**別預設用 admin / root** 幹活,別讓服務帳號擁有它根本用不到的權力。
- **負面思考**:像攻擊者一樣想。假設每個入口都會被試探、每筆敏感資料都可能外流,再回頭補洞。
- **這是持續的習慣,不是一次性專案**。安全不是上線前 checklist 打勾就結束,是每天的預設姿勢。

## 心態的反轉:資料是資產,也是負債

工程師習慣把資料當**資產** —— 越多越好、先收再說。但這章逼你補上另一半:**你留的每一筆敏感資料,同時也是一份負債。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="敏感資料同時是資產與負債:當資產帶來分析、ML、決策的價值;當負債帶來外洩、合規罰款、勒索、信任崩壞的風險。結論是只收該收的、該刪就刪" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="se1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="232" y="92" width="116" height="56" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="290" y="115" fill="#e6e6e6" font-size="11.5" text-anchor="middle">敏感資料</text>
    <text x="290" y="133" fill="#9aa4b2" font-size="8.5" text-anchor="middle">PII・金流…</text>
    <text x="110" y="42" fill="#54b890" font-size="12" font-weight="bold" text-anchor="middle">當資產 · 價值</text>
    <rect x="20" y="54" width="180" height="112" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="110" y="82" fill="#e6e6e6" font-size="10.5" text-anchor="middle">分析洞察</text>
    <text x="110" y="106" fill="#e6e6e6" font-size="10.5" text-anchor="middle">訓練 ML 模型</text>
    <text x="110" y="130" fill="#e6e6e6" font-size="10.5" text-anchor="middle">支撐決策</text>
    <text x="470" y="42" fill="#e06a5a" font-size="12" font-weight="bold" text-anchor="middle">當負債 · 風險</text>
    <rect x="380" y="54" width="180" height="112" rx="8" fill="#262b3a" stroke="#e06a5a" stroke-width="1.5"/>
    <text x="470" y="78" fill="#e6e6e6" font-size="10.5" text-anchor="middle">外洩</text>
    <text x="470" y="99" fill="#e6e6e6" font-size="10.5" text-anchor="middle">合規罰款</text>
    <text x="470" y="120" fill="#e6e6e6" font-size="10.5" text-anchor="middle">勒索軟體</text>
    <text x="470" y="141" fill="#e6e6e6" font-size="10.5" text-anchor="middle">信任崩壞</text>
    <line x1="232" y1="112" x2="202" y2="110" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#se1)"/>
    <line x1="348" y1="112" x2="378" y2="110" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#se1)"/>
    <text x="290" y="200" fill="#9aa4b2" font-size="10" text-anchor="middle">每一筆敏感資料都同時是這兩面 —— 所以:只收該收的、該刪就刪</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">資料不只是資產。你手上每一筆敏感資料,都是一份等著出事的風險 —— 這是「資料最小化(data minimization)」的理由:先別問能收什麼,先問非收不可的是什麼</figcaption>
</figure>

**「先收再說」在這個框架下是危險的預設** —— 你收的每一筆 PII,都是未來某次外洩、某張罰單的引信。少收、少留,風險就少一大半。

## 核心技術實踐

心態擺對之後,才輪到工具。書給的幾個基本盤:

| 實踐 | 重點 |
|---|---|
| **加密** | 傳輸中(TLS)與靜態(at rest)都要;但**不是萬靈丹** —— 拿到合法憑證的人照樣進得去 |
| **存取控制 / IAM** | 角色化、最小權限;定期檢視「誰有什麼權限、還需不需要」 |
| **日誌 / 監控 / 稽核** | 出事查得到、平時看得到異常;沒有日誌等於瞎著眼 |
| **縱深防禦** | 別把賭注押在單一道牆(見下) |

### 縱深防禦:一層破了,還有下一層

安全不能靠單點。**縱深防禦(defense in depth)** 是把資料一層層包起來,任一層被突破,還有下一層擋著:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 440 260" role="img" aria-label="縱深防禦的同心層:最外層監控與稽核,往內是存取控制與最小權限,再往內是加密,最核心是資料;任一層被突破還有下一層" style="width:100%;max-width:480px;height:auto;margin:0 auto;">
    <rect x="30" y="30" width="380" height="200" rx="12" fill="none" stroke="#9aa4b2" stroke-width="1.4" stroke-dasharray="5 4"/>
    <text x="220" y="50" fill="#9aa4b2" font-size="11" text-anchor="middle">監控 · 稽核 (logging / audit)</text>
    <rect x="80" y="72" width="280" height="116" rx="10" fill="none" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="220" y="91" fill="#4f6df5" font-size="11" font-weight="bold" text-anchor="middle">存取控制 · 最小權限 (IAM)</text>
    <rect x="140" y="112" width="160" height="60" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="220" y="128" fill="#54b890" font-size="10.5" text-anchor="middle">加密 (傳輸 / 靜態)</text>
    <rect x="180" y="136" width="80" height="30" rx="6" fill="#4f6df5" fill-opacity="0.2" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="220" y="155" fill="#e6e6e6" font-size="11" text-anchor="middle">資料</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一層層把資料包起來,任一層被突破還有下一層;而每一層的預設都是「最小權限」——只給剛好夠用的存取</figcaption>
</figure>

## 隱私與法規:資料是負債的法律版本

「資料是負債」不只是心態,現在還是**法律**。**GDPR、CCPA** 這些法規把隱私變成硬規則,罰起來很痛。對資料工程的具體要求:

- **PII 要處理**:該遮罩(masking)、匿名(anonymize)、代幣化(tokenize)的欄位,別原封不動散在各張表。
- **資料最小化 + 保存期限**:只收必要的、過期就刪 —— 這正是 [[fode-6|Ch.6 儲存那章的 retention]]換到隱私角度的同一件事。**留得越久越多,合規風險越大。**
- **可被遺忘**:法規可能要求「刪掉某個人的所有資料」,你的架構得做得到。

換句話說:**合規不是法務的事,是從你怎麼建表、怎麼設保存期限就開始的工程決定。**

## 反思

### 安全是「每個人的事」,而最小權限是我唯一敢說無腦照做的

寫這章我最有感的一句是「安全是人的問題」。我看過太多把安全外包給「資安團隊」或一套工具的團隊 —— 結果洞都開在日常操作裡:service account 給到 admin、測試資料裡塞真實 PII、匯出的 CSV 躺在共用雲端硬碟。這些工具都擋不住,只有**習慣**能。而所有安全原則裡,**最小權限**是我唯一敢說「幾乎無腦照做」的:預設給最小、需要再加,下檔風險趨近於零,擋掉的禍卻極多。它跟我對 [[pain-before-power|工具]]的態度剛好相反 —— 這一條,先做就對了。

### 「資料是負債」這個反轉,改掉了我「先收再說」的壞習慣

工程師的直覺是資料多多益善,我以前也是 —— 欄位先全收、log 全留,想說「以後搞不好用得到」。這章的反轉讓我戒掉這個:**每一筆你留著的敏感資料,都是一份等著出事的負債。** 現在我設計 schema 的第一個問題不是「能收什麼」,而是「**哪些是非收不可的**」;能不落地的 PII 就不落地、能匿名的就匿名、該過期的就設 retention 自動刪。少留一筆,就少一份未來的風險與罰單。這跟 [[fode-9|Ch.9 的信任]]是一體兩面:**會保護資料的人,才配得上別人把資料交給你。**

### 這章該排最後,但心態要擺最前

有趣的是,安全被書排在生命週期的最後、又被稱為「暗流」——因為它**不是一個階段,是貫穿每個階段的底層**。從 [[fode-5|源頭]]收什麼、[[fode-6|儲存]]留多久、到 [[fode-9|服務]]給誰看,每一步都有安全與隱私的決定。所以它雖然放最後講,卻該在你動手建第一張表之前就放進腦子裡。我的體會是:**安全做得好的時候沒人看得到,做不好的時候一次賠掉前面所有的努力與信任。** 這也是為什麼它最該重視、卻最常被忽略。
