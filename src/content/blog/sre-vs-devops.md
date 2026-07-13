---
title: "DevOps vs SRE:一個是介面,一個是實作"
date: 2026-07-13
category: tech
description: "『DevOps 和 SRE 有什麼不同?要選哪個?』是很常被問、但其實是假問題——因為兩者根本不在同一層。Google 一句話就破題:class SRE implements interface DevOps。DevOps 是定義『該做什麼』的哲學,SRE 是給出『怎麼做』的具體實作。這篇把 DevOps 的原則,一條條對到 SRE 的具體做法。"
tags:
  - sre
  - culture
series: "Google SRE 讀書筆記"
seriesOrder: 1.5
comments: true
draft: false
---
[[sre-intro|前一篇]]講完 SRE 是什麼,順手補一個超常被問、但其實是**假問題**的比較:「DevOps 和 SRE 有什麼不同?要選哪個?」之所以是假問題,是因為**兩者根本不在同一層**。Google 用一句很工程師的話破了題:**`class SRE implements interface DevOps`。**

## 一個是介面,一個是實作

這句話翻成白話:**DevOps 是一個「介面」——它定義了「該做什麼」的原則,但沒規定「怎麼做」;SRE 是 Google 對這個介面的一個「實作」——給出了具體、有主張的做法。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 216" role="img" aria-label="DevOps 是介面,定義該做什麼的原則:減少 silo、接受失敗為常態、逐步變更、量測一切、自動化。SRE 是實作 class SRE implements DevOps,給出怎麼做的具體方法:error budget、blameless postmortem、canary、SLI/SLO、消除 toil。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="dv" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="70" y="30" width="440" height="60" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="90" y="50" fill="#4f6df5" font-size="11" text-anchor="start" font-weight="bold">interface DevOps</text>
    <text x="300" y="50" fill="#9aa4b2" font-size="8.5" text-anchor="start">← 哲學/文化:定義「該做什麼」</text>
    <text x="90" y="72" fill="#e6e6e6" font-size="8.7" text-anchor="start">減少 silo · 接受失敗為常態 · 逐步變更 · 量測一切 · 自動化</text>
    <line x1="290" y1="90" x2="290" y2="122" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#dv)"/>
    <text x="300" y="110" fill="#9aa4b2" font-size="8.5" text-anchor="start">implements(給出具體做法)</text>
    <rect x="70" y="124" width="440" height="60" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.6"/>
    <text x="90" y="144" fill="#54b890" font-size="11" text-anchor="start" font-weight="bold">class SRE implements DevOps</text>
    <text x="356" y="144" fill="#9aa4b2" font-size="8.5" text-anchor="start">← 怎麼做</text>
    <text x="90" y="166" fill="#e6e6e6" font-size="8.7" text-anchor="start">error budget · blameless postmortem · canary · SLI/SLO · 消除 toil</text>
    <text x="290" y="204" fill="#9aa4b2" font-size="8.5" text-anchor="middle">DevOps 是方向與原則,SRE 是一個具體實作——不是二選一,是不同層次</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">DevOps</b> 是一場文化運動,講的是原則(打破 Dev/Ops 的高牆、擁抱失敗、快速迭代);<b style="color:#54b890">SRE</b> 是 Google 把這些原則落地的一套具體方法。問「要選哪個」,就像問「要選物件導向還是 Java」——層次搞錯了</figcaption>
</figure>

## 把原則翻成做法:一條條對照

SRE 真正的貢獻,是**把 DevOps 那些正確、但抽象的原則,翻成一條條可以照做、可以量測的具體規則**。這個系列前面講的每一招,幾乎都能對回一條 DevOps 原則:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 224" role="img" aria-label="DevOps 原則對到 SRE 做法。減少 silo 共擔責任對到 Error Budget 讓 dev 與 ops 用同一把尺。接受失敗為常態對到 Blameless postmortem。逐步頻繁變更對到 Canary 與滾動發布。量測一切對到 SLI SLO 與黃金訊號。減少人工對到消除 Toil 上限 50%。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="mp2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker></defs>
    <text x="128" y="30" fill="#4f6df5" font-size="9.5" text-anchor="middle" font-weight="bold">DevOps 原則</text>
    <text x="440" y="30" fill="#54b890" font-size="9.5" text-anchor="middle" font-weight="bold">SRE 的具體做法</text>
    <rect x="24" y="40" width="216" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="132" y="59" fill="#e6e6e6" font-size="8.5" text-anchor="middle">減少 silo、共擔責任</text>
    <rect x="330" y="40" width="226" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="443" y="59" fill="#e6e6e6" font-size="8.3" text-anchor="middle">Error Budget(同一把尺決策)</text>
    <line x1="242" y1="55" x2="328" y2="55" stroke="#54b890" stroke-width="1.1" marker-end="url(#mp2)"/>
    <rect x="24" y="76" width="216" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="132" y="95" fill="#e6e6e6" font-size="8.5" text-anchor="middle">接受失敗為常態</text>
    <rect x="330" y="76" width="226" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="443" y="95" fill="#e6e6e6" font-size="8.3" text-anchor="middle">Blameless postmortem</text>
    <line x1="242" y1="91" x2="328" y2="91" stroke="#54b890" stroke-width="1.1" marker-end="url(#mp2)"/>
    <rect x="24" y="112" width="216" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="132" y="131" fill="#e6e6e6" font-size="8.5" text-anchor="middle">逐步、頻繁變更</text>
    <rect x="330" y="112" width="226" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="443" y="131" fill="#e6e6e6" font-size="8.3" text-anchor="middle">Canary、滾動發布</text>
    <line x1="242" y1="127" x2="328" y2="127" stroke="#54b890" stroke-width="1.1" marker-end="url(#mp2)"/>
    <rect x="24" y="148" width="216" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="132" y="167" fill="#e6e6e6" font-size="8.5" text-anchor="middle">量測一切</text>
    <rect x="330" y="148" width="226" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="443" y="167" fill="#e6e6e6" font-size="8.3" text-anchor="middle">SLI / SLO、黃金訊號</text>
    <line x1="242" y1="163" x2="328" y2="163" stroke="#54b890" stroke-width="1.1" marker-end="url(#mp2)"/>
    <rect x="24" y="184" width="216" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="132" y="203" fill="#e6e6e6" font-size="8.5" text-anchor="middle">減少人工、自動化</text>
    <rect x="330" y="184" width="226" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="443" y="203" fill="#e6e6e6" font-size="8.3" text-anchor="middle">消除 Toil(上限 50%)</text>
    <line x1="242" y1="199" x2="328" y2="199" stroke="#54b890" stroke-width="1.1" marker-end="url(#mp2)"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左邊每一條 DevOps 原則,SRE 都給了一個具體、可執行、可量測的答案。這也是為什麼這個系列讀起來像「DevOps 的實作手冊」——它把抽象的信念,變成一條條照著做就有效的規則</figcaption>
</figure>

## 所以「vs」是假問題

看懂上面,就知道「DevOps vs SRE」問錯了:**你可以「奉行 DevOps」而採用別的實作**(SRE 只是 Google 給的、最成體系的一種);SRE 也不是要取代 DevOps,而是把它落地。名詞上的混亂多半來自兩件事:「SRE」常同時指一種**方法論**和一種**職稱/團隊**;「DevOps」則常被誤用成「一個會寫 CI/CD 的工程師」或某個工具鏈——但它的本質從來是**文化**,不是職缺。把層次分清,爭論就消失了。

## 反思

### 「A vs B」有時根本是層次搞錯

「DevOps vs SRE」讓我學到一個看待技術爭論的角度:很多「A vs B」的辯論,其實 A 和 B 不在同一維度——一個是哲學、一個是做法,一個是介面規範、一個是具體實作。問「要選哪個」就像問「要選物件導向還是 Java」。我現在遇到這種比較,會先退一步問:**這兩個東西,是同一層的替代品,還是不同層的關係?** 分清「原則 vs 做法」「目標 vs 手段」,一大半假對立會自己瓦解——這個習慣在技術選型、甚至在讀任何論戰時都很好用。

### 好方法論的價值,是把抽象原則翻成可執行的規則

DevOps 說「減少 silo」——很對,但**怎麼做?** SRE 說:給 dev 和 ops 同一個 error budget,逼他們用同一把尺決策。DevOps 說「接受失敗」——SRE 說:blameless postmortem。SRE 最讓我佩服的,不是它講了什麼新哲學(它沒有),而是它把 DevOps 那些**正確但飄在空中**的原則,一條條翻成了可以照做、可以量測、可以檢核的具體制度。**抽象的信念人人會講,能落地成規則的才真正改變行為。** 這也是我判斷一套方法論值不值得學的標準:它有沒有把「你應該…」變成「你可以這樣做,並這樣量它有沒有做到」。

### 別為名詞打架,看你有沒有拿到好處

我看過太多團隊糾結「我們算 DevOps 團隊還是 SRE 團隊」「這個職缺該叫哪個」——但這些都是**名詞**。真正該問的是那些**實質的好處**有沒有拿到:silo 有沒有變少?失敗能不能被安全地攤開來談([[sre-postmortem|blameless]])?變更是不是又快又可逆?量測([[sre-slo|SLO]])是不是真的在驅動決策?拿到這些,叫什麼名字都行;沒拿到,名片印得再漂亮也是空的。**工具和方法論是為結果服務的,別把手段當成目的**——這句話,套在 DevOps、SRE、甚至任何新潮的技術名詞上,都一樣成立。
