---
title: "資料管線與資料完整性:有備份不等於能還原"
date: 2026-07-13
category: tech
description: "資料系統的可靠度,除了『服務不掛』,還有更根本的一層:資料本身不能不見、不能錯。這篇講資料管線的隱形陷阱(backlog、一個 stage 卡住全卡),以及一個會顛覆直覺的觀念——『有備份』不等於『能還原』:沒演練過還原的備份,是薛丁格的備份。真正重要的不是備份,是恢復。"
tags:
  - sre
  - data-engineering
series: "Google SRE 讀書筆記"
seriesOrder: 11
comments: true
draft: false
---
這篇剛好接回我的主場:資料。一個資料系統的可靠度,除了前面講的「服務不掛」,還有一層更根本的東西——**資料本身不能不見、不能錯**。這篇講兩件事:資料管線的可靠度,以及一個會顛覆你直覺的觀念:**「有備份」不等於「能還原」。**

## 資料管線:週期性管線的隱形陷阱

資料管線(pipeline)的可靠度,跟線上服務不太一樣。最常見的隱形陷阱,是**週期性管線的積壓**:資料量慢慢長大 → 單次處理時間變長 → 錯過排程視窗 → backlog 越積越多 → 下一輪一次要嗑超大批(thundering herd)→ 更慢。而且 pipeline 常常是多個 stage 串起來的,**任何一個 stage 卡住或吐出壞資料,整條就卡住、或悄悄汙染下游**。

所以資料管線的可靠度,要顧的跟線上服務不同:**資料新鮮度的 SLA**(產出要多新)、**每個 stage 都要監控**(別等最後才發現中間爛了)、以及最關鍵的——**冪等、可重跑**([[airflow-scheduling|接我 Airflow 那篇]]):壞了能安全地重跑一遍、結果一致,而不是重跑就重複或炸掉。

## 「有備份」不等於「能還原」

接著是這篇最想讓你記住的一句話。大家對資料安全的直覺是「我們有備份,放心」——但這份安心,很可能是**假的**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 208" role="img" aria-label="左邊你以為的安全:每天都有備份,帳面上很安全。右邊真的要還原時翻車:備份檔本身壞了從沒驗過、還原程序沒人跑過手忙腳亂、還原太慢超過 SLA。結論:沒演練過還原的備份等於薛丁格的備份,重要的不是備份是恢復。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="dp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="288" y1="16" x2="288" y2="164" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="140" y="28" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">你以為的安全</text>
    <rect x="44" y="60" width="196" height="52" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.4"/>
    <text x="142" y="84" fill="#e6e6e6" font-size="10" text-anchor="middle">每天都有備份 ✓✓✓</text>
    <text x="142" y="100" fill="#9aa4b2" font-size="8.3" text-anchor="middle">「帳面上」很安全</text>
    <text x="140" y="146" fill="#9aa4b2" font-size="8.3" text-anchor="middle">真的要還原時…</text>
    <line x1="240" y1="120" x2="296" y2="120" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#dp)"/>
    <text x="430" y="28" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">真出事時翻車</text>
    <rect x="308" y="40" width="252" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="434" y="57" fill="#e6e6e6" font-size="8.3" text-anchor="middle">備份檔本身壞了(從沒驗過)</text>
    <rect x="308" y="72" width="252" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="434" y="89" fill="#e6e6e6" font-size="8.3" text-anchor="middle">還原程序沒人跑過 → 手忙腳亂</text>
    <rect x="308" y="104" width="252" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="434" y="121" fill="#e6e6e6" font-size="8.3" text-anchor="middle">還原太慢 → 超過 SLA、資料回不來</text>
    <text x="290" y="184" fill="#d6a45c" font-size="9" text-anchor="middle" font-weight="bold">沒演練過還原的備份 = 薛丁格的備份(不打開不知道死活)</text>
    <text x="290" y="200" fill="#9aa4b2" font-size="8.5" text-anchor="middle">重要的不是「備份」,是「恢復」—— 備份只是達到恢復的手段</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">「我們有備份」是最危險的安全感之一。備份檔可能早就壞了、還原程序可能沒人跑過、還原可能慢到趕不上 SLA——這些都要<b>真的演練還原</b>才會發現。所以真正該衡量的指標,是「能不能、在期限內、真的把資料救回來」,不是「有沒有備份」</figcaption>
</figure>

## 資料完整性:假設每一層都會漏

還有一個反直覺的事實:**資料遺失多半不是硬體壞,而是 bug 和人**——一個 bug 把欄位寫錯、一次誤操作刪錯、上游一批壞資料靜靜汙染了整個下游。所以防禦不能只靠「備份硬體故障」,要**深度防禦(defense in depth)**,疊好幾層:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 218" role="img" aria-label="資料完整性的深度防禦。威脅來自 bug、誤刪、壞資料汙染、硬體壞。要穿過三層才會真的遺失資料:第一層 Soft delete 軟刪除先標記延遲真刪給後悔時間;第二層 Backup 加 Recovery 備份加定期還原演練;第三層 Early detection 資料驗證與對帳在使用者發現前抓到。三層都擋住,資料才完整。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="di" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="22" fill="#e0733a" font-size="8.8" text-anchor="middle">威脅:bug · 誤刪 · 壞資料汙染下游 · 硬體壞</text>
    <line x1="290" y1="28" x2="290" y2="42" stroke="#e0733a" stroke-width="1.2" marker-end="url(#di)"/>
    <rect x="70" y="44" width="440" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="86" y="63" fill="#54b890" font-size="8.8" text-anchor="start" font-weight="bold">① Soft delete 軟刪除</text><text x="500" y="63" fill="#9aa4b2" font-size="8" text-anchor="end">先標記、延遲真刪 → 給後悔時間</text>
    <line x1="290" y1="74" x2="290" y2="86" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#di)"/>
    <rect x="70" y="88" width="440" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="86" y="107" fill="#54b890" font-size="8.8" text-anchor="start" font-weight="bold">② Backup + Recovery</text><text x="500" y="107" fill="#9aa4b2" font-size="8" text-anchor="end">備份 + 定期還原演練(不只是備份)</text>
    <line x1="290" y1="118" x2="290" y2="130" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#di)"/>
    <rect x="70" y="132" width="440" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="86" y="151" fill="#54b890" font-size="8.8" text-anchor="start" font-weight="bold">③ Early detection 早期偵測</text><text x="500" y="151" fill="#9aa4b2" font-size="8" text-anchor="end">資料驗證 / 對帳 → 使用者發現前抓到</text>
    <line x1="290" y1="162" x2="290" y2="174" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#di)"/>
    <rect x="220" y="176" width="140" height="28" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="290" y="194" fill="#e6e6e6" font-size="9" text-anchor="middle">資料完整 ✓</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">深度防禦:軟刪除給你反悔的時間、早期偵測在資料靜靜爛掉時就抓到、備份+還原兜最後的底。精神是——<b>假設任何一層都會失效</b>,所以疊多層,而不是把身家壓在單一道防線上</figcaption>
</figure>

## 反思

### 「有備份」是我看過最危險的安全感

備份給人一種很踏實的安心,但這份安心常常是假的——**沒演練過還原的備份,是薛丁格的備份,不打開不知道是活的還死的。** 備份檔可能默默損毀了半年、還原程序可能寫在某份沒人看的文件裡從沒被跑過、真要還原時可能慢到趕不上業務能忍受的期限。所以我現在聽到「我們有備份」,反射動作是問一句:**「上次真的做還原演練,是什麼時候?還原花了多久?」** 答不出來,那份安全感就是紙糊的。這跟 SRE 一貫的精神一致:[[sre-testing|別假設,去驗證]]——備份要定期真的還原一次,就像測試要定期真的跑一次。

### 資料遺失,多半不是硬體壞,是 bug 和人

一般人想到資料遺失就想到硬碟燒掉,但真實世界更常見的,是一個 bug 把整欄寫錯、一次手滑刪錯 table、上游一批髒資料無聲無息汙染了整條下游。這些用「硬體備援」擋不掉,只能靠**深度防禦**:軟刪除給後悔的時間、早期偵測(對帳、驗證)在使用者發現前就抓到、備份+還原兜最後的底。而且要**假設每一層都會漏**,才會疊得夠厚。這跟 [[sre-cascading-failures|連鎖失效那篇]]的悲觀是同一種——好的可靠度工程,都建立在「假設它會壞」而不是「希望它不壞」之上。

### 資料管線的可靠度,是資料工程的一半功夫

這章對我特別親切,因為資料管線正是我每天在做的事。它提醒我:一條 pipeline 的可靠度,遠不只是「今天有沒有跑成功」——是資料**夠不夠新**(新鮮度 SLA)、重跑**會不會壞**([[airflow-scheduling|冪等可重跑]])、backlog **追不追得上**、壞資料**會不會靜靜汙染下游**。我在 Airflow 那條線講的冪等、在 [[ddia-reliable-scalable|DDIA]] 講的可靠性,跟這章講的其實是同一件事:**讓資料在各種故障之下,依然「一直都在、而且正確」。** 服務掛了重啟就好,但資料錯了、丟了,往往是回不來的——所以資料的可靠度,值得比服務的可靠度更偏執一點。
