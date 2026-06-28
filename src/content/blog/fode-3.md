---
title: "好的資料架構怎麼設計:讀《Fundamentals of Data Engineering》Ch.3"
date: 2026-06-29
category: tech
tags:
  - data-engineering
  - book-notes
  - architecture
series: "Fundamentals of Data Engineering 讀書筆記"
seriesOrder: 3
comments: true
draft: false
---
[[fode-2|上一篇]]給了生命週期的全貌(資料在做什麼);這一章問的是 —— **怎麼把承載它的系統設計得「好」?** 這章最反直覺、也最該記住的一句話是:**好的架構不是一張固定的藍圖,而是一個「用權衡換取彈性與可逆」的決策過程。** 沒有最好的架構,只有在這個脈絡下相對好的取捨。

## 先把「架構」定義清楚

書的定義值得抄下來:**資料架構是「為了支撐企業不斷演變的資料需求,透過審慎評估權衡、做出有彈性且可逆的決策,所設計出的系統」。** 拆開看,關鍵字是三個:**權衡(trade-offs)、彈性(flexible)、可逆(reversible)。**

順帶釐清一組常被混用的詞:

- **架構(Architecture)= 為什麼(why)**:為什麼這樣切系統、為什麼選這個取捨。
- **工程(Engineering)= 怎麼做(how)**:把架構決策落地成能跑的東西。

這一章整本在談的是 why,不是 how。

## 好架構的九個原則

書借鏡 AWS / GCP 的 well-architected 框架,給了九條原則。我把它濃縮成一張表:

| 原則 | 一句話 |
|---|---|
| 明智選用共用元件 | 共用的東西(儲存、權限、監控)要選得讓全公司都受益 |
| 為失敗而設計 | 假設東西一定會壞,先想好可用性、復原目標(RTO/RPO) |
| 為可擴展而架構 | 能水平擴、也能在不需要時縮回來 |
| **架構即領導** | 架構師的產出不只是圖,是帶人做對的取捨 |
| **持續架構** | 架構是動詞,不是一次性交付的文件 |
| **建立鬆耦合系統** | 元件能各自獨立演進、抽換 |
| **做可逆決策** | 盡量讓決策回得來 |
| 優先安全 | 最小權限、零信任,安全是地基不是外掛 |
| 擁抱 FinOps | 雲端成本是一個要持續設計的變數 |

其中最該深挖、也最能改變你做決策方式的,是**可逆決策**與**鬆耦合**這兩條。

## 核心一:可逆決策 —— 雙向門 vs 單向門

書借用 Jeff Bezos 的比喻:決策分兩種門。

- **雙向門(可逆)**:走錯了能走回來。→ **決策可以快**,試了不對就改。
- **單向門(不可逆)**:一旦過去就很難回頭。→ **決策要慎重**,值得多花時間評估。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 188" role="img" aria-label="可逆決策像雙向門(現狀與新方案之間可來回),不可逆決策像單向門(過去就回不來)" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ar3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4f6df5"/></marker><marker id="as3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="135" y="28" fill="#4f6df5" font-size="11.5" text-anchor="middle">雙向門(可逆)</text>
    <rect x="40" y="52" width="74" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="77" y="79" fill="#e6e6e6" font-size="10.5" text-anchor="middle">現狀</text>
    <rect x="156" y="52" width="74" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="193" y="79" fill="#e6e6e6" font-size="10.5" text-anchor="middle">新方案</text>
    <line x1="116" y1="68" x2="154" y2="68" stroke="#4f6df5" stroke-width="1.5" marker-end="url(#ar3)"/>
    <line x1="154" y1="82" x2="116" y2="82" stroke="#4f6df5" stroke-width="1.5" marker-end="url(#ar3)"/>
    <text x="135" y="124" fill="#9aa4b2" font-size="10" text-anchor="middle">回得來 → 決策可以快</text>
    <line x1="270" y1="20" x2="270" y2="150" stroke="#3a4154" stroke-width="1"/>
    <text x="405" y="28" fill="#9aa4b2" font-size="11.5" text-anchor="middle">單向門(不可逆)</text>
    <rect x="310" y="52" width="74" height="46" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.5"/>
    <text x="347" y="79" fill="#e6e6e6" font-size="10.5" text-anchor="middle">現狀</text>
    <rect x="426" y="52" width="74" height="46" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.5"/>
    <text x="463" y="79" fill="#e6e6e6" font-size="10.5" text-anchor="middle">新方案</text>
    <line x1="386" y1="75" x2="424" y2="75" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#as3)"/>
    <text x="405" y="118" fill="#9aa4b2" font-size="13" text-anchor="middle">✕ 回不去</text>
    <text x="405" y="135" fill="#9aa4b2" font-size="10" text-anchor="middle">→ 決策要慎重</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">好的架構盡量把決策設計成雙向門 —— 保留改主意的能力,就是保留未來的選項</figcaption>
</figure>

書的主張是:**好架構會盡量把決策設計成雙向門。** 因為需求一定會變,而保留「改主意的能力」本身就是價值。實務上這對應到「別把自己鎖死」—— 別簽五年合約、別讓資料只活在某個專有格式裡、別讓一個選擇綁死後面十個。

## 核心二:鬆耦合 —— 元件能各自演進

**緊耦合**的系統,元件彼此糾纏,改一個就牽動全身;**鬆耦合**的系統,元件透過清楚的介面溝通,能各自獨立開發、部署、抽換。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 176" role="img" aria-label="緊耦合是糾纏成一塊改一個動全身,鬆耦合是各自獨立透過介面溝通可抽換" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ac3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="135" y="26" fill="#9aa4b2" font-size="11.5" text-anchor="middle">緊耦合</text>
    <rect x="50" y="44" width="170" height="86" rx="10" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <rect x="66" y="62" width="60" height="50" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/>
    <rect x="110" y="74" width="60" height="50" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/>
    <rect x="150" y="58" width="60" height="50" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="135" y="150" fill="#9aa4b2" font-size="10" text-anchor="middle">糾纏成一塊 → 改一個動全身</text>
    <line x1="270" y1="16" x2="270" y2="140" stroke="#3a4154" stroke-width="1"/>
    <text x="405" y="26" fill="#4f6df5" font-size="11.5" text-anchor="middle">鬆耦合</text>
    <rect x="312" y="62" width="56" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <rect x="392" y="62" width="56" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <rect x="472" y="62" width="56" height="44" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <line x1="368" y1="84" x2="392" y2="84" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ac3)"/>
    <line x1="448" y1="84" x2="472" y2="84" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ac3)"/>
    <text x="405" y="132" fill="#9aa4b2" font-size="10" text-anchor="middle">透過介面溝通 → 各自演進、可抽換</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">鬆耦合讓你能單獨換掉、升級、重寫某個元件,而不必動到其他</figcaption>
</figure>

這跟 [[kafka-intro|Kafka]] 解耦生產者與消費者是同一個精神 —— 把元件之間的依賴降到「一個清楚的介面」,系統就能局部演進而不全面重來。

## 棕地 vs 綠地

最後一個實用的區分:你是在**棕地(brownfield)**還是**綠地(greenfield)**上蓋?

- **棕地**:既有系統上改建。受限於現況、技術債、不能停機 —— 自由度低,但風險也具體。
- **綠地**:一張白紙。自由度高,但也容易過度設計、低估未知。

書的提醒很中肯:綠地的自由是雙面刃,別把「沒有包袱」當成「可以什麼都上」。

## 反思

### 「沒有最好的架構,只有取捨」是這章最該內化的一句

我越做越同意:**架構的成熟,是從「找最佳解」轉向「講清楚取捨」。** 新手問「哪個架構最好」,資深的人反問「在你的約束下,你願意拿什麼換什麼」。這跟我那張概念筆記 [[pain-before-power|先確認痛點,再上重武器]]是同一條神經 —— 沒有脈絡的「best practice」是空話,所有選擇都該回到「這個痛、這個規模、這個團隊」來秤。書把這件事講成第一原則,我很買單。

### 可逆性,是我一直在買的「保險」

「盡量做雙向門」這條,其實我在很多篇都下意識實踐過。[[medallion-architecture|Medallion]]裡我堅持 **Bronze 不可變、可重播** —— 那本質上就是在保留可逆性:原始資料還在,下游怎麼改都能重來。避免專有格式鎖定、保留原始層、別簽長約,這些都是同一招:**用一點當下的成本,買未來改主意的權利。** 需求一定會變,而可逆性就是你對「不確定」收的保費。

### 「架構即領導」「持續架構」—— 這兩條把架構從技術拉回人

我最意外的收穫,是書把「架構即領導」「持續架構」列為原則。它在說:**架構不是某個資深工程師關起門畫完的圖,而是一個持續的、社會性的活動** —— 要帶著團隊一起做取捨、要隨需求演進、要被持續地溝通與修正。這跟我讀 [[btl-1|Tech Leader 那個系列]]的體會接上了:好的技術決策從來不只是技術問題,是「怎麼帶一群人在不確定裡持續做對取捨」。架構畫在白板上只是開始,讓它活在團隊的共識裡,才是真功夫。
