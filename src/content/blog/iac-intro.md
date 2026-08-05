---
title: "Infrastructure as Code 是什麼?從「變更」的成本翻轉講起"
date: 2026-08-05
category: tech
description: "鐵器時代的基礎設施是實體硬體,變更又慢又貴,所以整套管理文化都在防變更;雲時代開機器只是一次 API 呼叫,限制翻轉了,該防的不再是變更,而是不敢變更。Kief Morris 第三版開篇給 IaC 下的定義:把軟體工程的紀律——版本控制、測試、持續交付——整套搬到基礎設施上,讓變更又快又安全;而這一版的新戰場,是收拾大家倉促上雲後留下的那一大包難維護的基礎設施程式碼。"
tags:
  - iac
  - devops
  - book-notes
series: "Infrastructure as Code 讀書筆記"
seriesOrder: 1
comments: true
draft: false
---
開一個新系列:讀 Kief Morris 的 *Infrastructure as Code*,用的是**第三版**(2025)——副標從第二版的 *Dynamic Systems for the Cloud Age* 改成 *Designing and Delivering Dynamic Systems for the Cloud Age*,多出來的 **Designing** 正是這一版的重點,後面會講到。前一篇 [[ansible-intro|Ansible]] 從雪花伺服器講起,講的是「一個工具怎麼解這個問題」;這本書則是把鏡頭拉遠——工具年年在換(CFEngine、Puppet、Ansible、Terraform……),但「用程式碼管基礎設施」背後的原則不會換。第一章回答最根本的兩件事:**IaC 到底是什麼,以及為什麼雲時代的基礎設施非這樣管不可。**

## 鐵器時代 → 雲時代:變更的成本翻轉了

書裡把基礎設施的歷史分成兩個時代,我覺得是全章最好的一個框架:

- **鐵器時代(Iron Age)**:基礎設施等於實體硬體。買機器、上架、接線,一次變更以週、月計價。變更又慢又貴,所以整套管理文化都在**減少變更**——預先做大設計、變更審批委員會、變更凍結窗口。錯不起,就少改。
- **雲時代(Cloud Age)**:基礎設施變成軟體。開一台機器是一次 API 呼叫,幾分鐘的事。變更本身變得又快又便宜——**限制翻轉了,該最佳化的方向也該跟著翻轉**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 236" role="img" aria-label="鐵器時代與雲時代對比:鐵器時代變更慢又貴,最佳化方向是減少變更,靠重審批流程;雲時代變更快又便宜,最佳化方向是擁抱變更,靠自動化與快速回饋顧品質" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="iacArr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="280" y1="14" x2="280" y2="226" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 4"/>
    <text x="140" y="28" fill="#e6e6e6" font-size="12.5" text-anchor="middle">鐵器時代 · Iron Age</text>
    <text x="420" y="28" fill="#e6e6e6" font-size="12.5" text-anchor="middle">雲時代 · Cloud Age</text>
    <rect x="45" y="44" width="190" height="36" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="140" y="66" fill="#e6e6e6" font-size="10.5" text-anchor="middle">實體硬體:變更以週、月計</text>
    <line x1="140" y1="80" x2="140" y2="98" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#iacArr)"/>
    <rect x="45" y="102" width="190" height="36" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="140" y="124" fill="#e6e6e6" font-size="10.5" text-anchor="middle">最佳化方向:減少變更</text>
    <line x1="140" y1="138" x2="140" y2="156" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#iacArr)"/>
    <rect x="45" y="160" width="190" height="36" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="140" y="182" fill="#9aa4b2" font-size="10.5" text-anchor="middle">重審批、重文件、凍結窗口</text>
    <rect x="325" y="44" width="190" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="420" y="66" fill="#e6e6e6" font-size="10.5" text-anchor="middle">軟體定義:變更是 API 呼叫</text>
    <line x1="420" y1="80" x2="420" y2="98" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#iacArr)"/>
    <rect x="325" y="102" width="190" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="420" y="124" fill="#e6e6e6" font-size="10.5" text-anchor="middle">最佳化方向:擁抱變更</text>
    <line x1="420" y1="138" x2="420" y2="156" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#iacArr)"/>
    <rect x="325" y="160" width="190" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="420" y="182" fill="#e6e6e6" font-size="10.5" text-anchor="middle">自動化 + 快速回饋顧品質</text>
    <text x="140" y="216" fill="#9aa4b2" font-size="9.5" text-anchor="middle">錯不起 → 少改</text>
    <text x="420" y="216" fill="#4f6df5" font-size="9.5" text-anchor="middle">改得快又安全 → 常改、用變更學習</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">限制翻轉,策略就該翻轉:鐵器時代用流程防變更;雲時代用工程讓變更又快又安全。最常見的病是拿左邊的流程管右邊的雲</figcaption>
</figure>

書裡點出一個很普遍的病:**很多組織已經上雲,管理文化卻還留在鐵器時代**——開一台 VM 只要九十秒,但申請開這台 VM 的簽核流程要跑兩週。雲的速度被流程整碗吃掉,錢照付,好處沒拿到。

## 第三版的新戰場:從「要不要採用」變成「採用後的沉積層」

三個版本剛好對應三個階段:第一版(2016)在說服大家「基礎設施可以用程式碼管」,第二版(2020)在講雲時代該怎麼管,到了第三版,雲和 IaC 都已經是主流——**新的問題反而是大家在數位轉型的浪潮裡衝太快,留下一大片蔓生、難以維護的基礎設施程式碼。** 基礎設施程式碼一樣會累積技術債:複製貼上的 Terraform、沒人敢動的 module、改一個參數要動十個 repo。

所以副標才多了 *Designing*:這一版把重心從「採用」移到**「把軟體設計的教訓——模組化、低耦合、可演進——用在基礎設施的程式碼庫上」**,並回答基礎設施程式碼在整個平台策略裡的位置。用寫程式的類比說:前兩版教你「開始寫 code」,第三版教你「怎麼讓一個長大了的 codebase 不變成大泥球」。這也是我選第三版讀的原因——現在的痛點早就不是「要不要寫 IaC」,是「寫了三年之後怎麼收拾」。

## IaC 的定義:把軟體工程的紀律搬到基礎設施上

書給的定義收斂起來是一句話:**用管理程式碼的方式管理基礎設施**——基礎設施寫成定義檔、進版本控制、由自動化工具執行,而且套上軟體工程的完整紀律:測試、code review、CI/CD。

關鍵在「紀律」兩個字。寫 script 自動化維運不是新鮮事,shell script 從 Unix 誕生就存在——IaC 的差別不在「有沒有寫 code」,而在**基礎設施的變更從此走軟體的流程**:有版本、可 review、可測試、可重現、可回滾。這也是為什麼書名不叫 *Scripting Your Servers*。

## 「要嘛快、要嘛穩」是假選擇題

反對自動化最常見的理由:「頻繁變更太危險,穩定要靠管制。」書直接引 DORA(*Accelerate*)的研究打臉:**高績效組織是又快又穩,低績效組織是又慢又不穩**——速度和品質不是二選一,是互相成就。衡量用的就是四個關鍵指標:

| 指標 | 量什麼 |
|---|---|
| Deployment frequency | 多常部署 |
| Lead time | 一個變更從提交到上線多久 |
| Change failure rate | 變更造成失敗的比例 |
| MTTR | 壞掉之後多快恢復 |

背後的機制其實很好懂:重審批的慢流程並不會讓變更更安全,只會讓變更**累積成大批次**——而批次越大、風險越高、出錯越難定位,形成惡性循環。反過來,小步、頻繁、每步都有自動化驗證的變更,批次小到出錯也好找、好回滾。**穩定不是「少改」改出來的,是「常改而且每次都走同一條可靠路徑」練出來的。**

## 自動化恐懼螺旋

第一章最扎心的一段。很多團隊明明有自動化工具,卻不敢對跑在線上的系統執行——因為不確定會發生什麼事。於是這次先手動改,組態飄移更大,自動化跟現況差得更遠,下次更不敢跑……

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 258" role="img" aria-label="自動化恐懼螺旋:自動化和現況不一致,導致不敢跑自動化,只好手動改機器,造成組態飄移更大,回到不一致;唯一出口是所有變更一律走自動化" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="iacArr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="iacArr3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#4f6df5"/></marker></defs>
    <rect x="110" y="16" width="180" height="34" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="200" y="37" fill="#e6e6e6" font-size="10.5" text-anchor="middle">自動化和機器現況不一致</text>
    <rect x="300" y="105" width="150" height="34" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="375" y="126" fill="#e6e6e6" font-size="10.5" text-anchor="middle">更不敢跑自動化</text>
    <rect x="110" y="194" width="180" height="34" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="200" y="215" fill="#e6e6e6" font-size="10.5" text-anchor="middle">只好手動改機器</text>
    <rect x="20" y="105" width="140" height="34" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="90" y="126" fill="#e6e6e6" font-size="10.5" text-anchor="middle">組態飄移更大</text>
    <line x1="278" y1="50" x2="352" y2="102" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#iacArr2)"/>
    <line x1="352" y1="141" x2="278" y2="193" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#iacArr2)"/>
    <line x1="126" y1="193" x2="98" y2="143" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#iacArr2)"/>
    <line x1="98" y1="102" x2="126" y2="52" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#iacArr2)"/>
    <text x="200" y="128" fill="#9aa4b2" font-size="9.5" text-anchor="middle">恐懼螺旋</text>
    <rect x="330" y="212" width="215" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="437" y="234" fill="#e6e6e6" font-size="10.5" text-anchor="middle">出口:所有變更一律走自動化</text>
    <line x1="400" y1="142" x2="425" y2="208" stroke="#4f6df5" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#iacArr3)"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">螺旋的每一圈都讓下一圈更難逃:手動改一次,自動化就更不可信一分。出口不是「更小心地手動」,是讓自動化成為唯一的變更路徑,讓差異永遠沒機會長大</figcaption>
  </figure>

這個螺旋的殘酷之處在於:**它不能靠「更小心」解,只能靠「更常跑」解。** 自動化每天都在跑,定義和現況的差異就永遠只有一天份;三個月才跑一次,差異就大到沒人敢按下執行。信任是跑出來的,不是 review 出來的。

## 三個核心實踐

第一章結尾給出全書的骨架——IaC 的三個核心實踐,後面的章節全在展開它們:

1. **把所有東西定義成程式碼**:不只伺服器,網路、DNS、權限、監控,全部進版本控制,可重現、可追溯。
2. **持續測試與交付每一份進行中的工作**:不是寫完才驗,是每個小步驟都有自動化驗證跟著。
3. **用小而簡單、可獨立變更的元件組系統**:小批次的前提是元件夠小、耦合夠低,才能各自獨立地改。

## 反思

### 「先建起來,之後再自動化」是我聽過最貴的一句話

書裡列的反對意見中,「build first, automate later」我最有感。我的經驗是:**手動建的東西,三個月後就沒人敢動**——從 console 點出來的資源沒有紀錄、沒有理由、沒有重現方法,它為什麼長這樣只存在當初那個人的腦袋裡。這跟 [[ansible-intro|雪花伺服器]] 是同一件事,只是雲讓它更隱蔽:機器看起來是新潮的雲資源,管法卻是鐵器時代的手工藝。自動化債跟技術債一樣會生利息,而且利息用「恐懼」計價——欠越久,越沒人敢還。

### 半自動化比全手動更危險

恐懼螺旋我看過真實版,而且體會是:**最危險的狀態不是全手動,是「有自動化但不敢跑」。** 全手動的團隊至少知道自己在走鋼索,每一步都小心;有一份半年沒跑的 playbook 反而給人虛假的安全感——「我們有自動化」——直到某天真的執行,才發現它會把三個月來所有的手動修補全部蓋掉。所以我現在的立場很硬:一份自動化如果不敢隨時跑,它就不是資產,是負債。要嘛讓它成為唯一的變更路徑、頻繁地跑;要嘛刪掉,承認自己是手動維運,至少誠實。

### 跟 Error Budget 是同一個世界觀

「速度 vs 品質是假選擇題」這個主張,跟我在 [[sre-intro|SRE]] 讀到的 Error Budget 其實是同一個世界觀的兩面:SRE 用預算把「要快還是要穩」變成一道可以算的數學題,DORA 四指標則直接用資料證明快跟穩根本是同一群人做到的。兩本書共同的解法也一樣——**小批次、快回饋、自動化的變更路徑**,而不是用審批和凍結去買一個假的安全感。這也是我讀這本書想帶回團隊的判斷:下次有人提議「加一層簽核讓部署更穩」,我會先問——這層簽核會讓批次變小、回饋變快嗎?如果只是讓變更變慢、累積得更大,那它買到的不是穩定,是延後爆炸。
