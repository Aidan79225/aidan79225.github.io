---
title: "小而簡單的元件:爆炸半徑決定你敢不敢改"
date: 2026-08-06
category: tech
description: "第三個核心實踐講切割:單體 infra stack 的問題不是醜,是爆炸半徑——改一行,整包一起 plan、一起冒險,於是沒人敢動,又回到恐懼螺旋。切割的準則不是照資源種類分資料夾,是「一起變的放一起、變更頻率不同的分開」;而切太碎跟不切一樣糟——好壞的檢驗指標只有一個:一次日常變更,通常落在幾個 stack 裡?"
tags:
  - iac
  - devops
  - book-notes
series: "Infrastructure as Code 讀書筆記"
seriesOrder: 6
comments: true
draft: false
---
三個核心實踐的最後一個。[[iac-test-deliver|上一篇]]說變更批次要小,這篇補上它的前提:**批次小得起來,元件先要小**——如果整個系統是一包巨大的 stack,再小的改動也會被迫帶著整包一起上路。這章講的就是怎麼把基礎設施切成「小而簡單、可以獨立變更的元件」,以及——同樣重要的——怎麼避免切壞。

## 單體 stack 的真正問題:爆炸半徑

一開始大家都這樣:一個 repo、一份 state、所有東西塞在一起,反正東西還少。痛是慢慢長出來的——書裡給了一個很好用的詞來描述:**blast radius(爆炸半徑)——一次變更「可能」波及的範圍**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 240" role="img" aria-label="單體與小元件對比:單體 stack 把網路、資料庫、服務、監控全關在一起,改一行就整包一起 plan 一起冒險,爆炸半徑是全部;切成小 stack 後,改服務 A 只動服務 A 那一塊,爆炸半徑縮小到一塊" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="280" y1="14" x2="280" y2="230" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 4"/>
    <text x="140" y="30" fill="#e6e6e6" font-size="12" text-anchor="middle">單體:爆炸半徑 = 全部</text>
    <text x="420" y="30" fill="#e6e6e6" font-size="12" text-anchor="middle">小元件:爆炸半徑 = 一塊</text>
    <rect x="36" y="46" width="208" height="160" rx="9" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.6" stroke-dasharray="6 4"/>
    <rect x="52" y="62" width="84" height="34" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="94" y="83" fill="#9aa4b2" font-size="9.5" text-anchor="middle">網路</text>
    <rect x="146" y="62" width="84" height="34" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="188" y="83" fill="#9aa4b2" font-size="9.5" text-anchor="middle">資料庫</text>
    <rect x="52" y="108" width="84" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="94" y="129" fill="#e6e6e6" font-size="9.5" text-anchor="middle">服務 A ← 改這</text>
    <rect x="146" y="108" width="84" height="34" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="188" y="129" fill="#9aa4b2" font-size="9.5" text-anchor="middle">服務 B</text>
    <rect x="52" y="154" width="84" height="34" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="94" y="175" fill="#9aa4b2" font-size="9.5" text-anchor="middle">監控</text>
    <rect x="146" y="154" width="84" height="34" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="188" y="175" fill="#9aa4b2" font-size="9.5" text-anchor="middle">權限</text>
    <text x="140" y="223" fill="#9aa4b2" font-size="9.5" text-anchor="middle">改一行,整包一起 plan、一起冒險</text>
    <rect x="316" y="62" width="92" height="34" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="362" y="83" fill="#9aa4b2" font-size="9.5" text-anchor="middle">網路 stack</text>
    <rect x="432" y="62" width="92" height="34" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="478" y="83" fill="#9aa4b2" font-size="9.5" text-anchor="middle">資料 stack</text>
    <rect x="316" y="128" width="92" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="362" y="149" fill="#e6e6e6" font-size="9.5" text-anchor="middle">服務 A ← 改這</text>
    <rect x="432" y="128" width="92" height="34" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="478" y="149" fill="#9aa4b2" font-size="9.5" text-anchor="middle">服務 B</text>
    <line x1="362" y1="128" x2="362" y2="98" stroke="#9aa4b2" stroke-width="1.1"/>
    <line x1="478" y1="128" x2="478" y2="98" stroke="#9aa4b2" stroke-width="1.1"/>
    <line x1="404" y1="145" x2="446" y2="96" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="420" y="223" fill="#4f6df5" font-size="9.5" text-anchor="middle">只 plan、只動這一塊;其他透過介面往來</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">單體的問題不是醜,是每次變更都揹著全部的風險:plan 越來越慢、review 的 diff 越來越不可讀、多個團隊排隊搶同一份 state——最後沒人敢動,回到恐懼螺旋</figcaption>
</figure>

爆炸半徑大的代價是複利的:plan 從十秒變二十分鐘 → 大家減少 apply 次數 → 批次變大 → 每次 apply 更可怕 → [[iac-intro|恐懼螺旋]]完成閉環。而且風險是「綁售」的——你只是想改服務 A 的一個參數,但 plan 裡列著網路和資料庫的資源,一個手滑或一個沒人注意到的 drift,炸的是不相干的東西。

## 怎麼切:跟著「變更」切,不是跟著「東西」切

最直覺的切法是照資源種類——所有 VM 一包、所有 DNS 一包、所有 LB 一包。書明確說這是壞切法:一個需求進來(上線一個新服務),你要橫跨五個 stack 各改一點。正確的準則跟軟體設計同一句話:**高內聚、低耦合——一起變的放一起,不常一起變的分開**。落到基礎設施,有一個特別好用的維度:**變更頻率**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 204" role="img" aria-label="依變更頻率分層:應用服務 stack 每天變,資料層每週或每月變,網路與基礎層每季變;依賴方向永遠是常變的依賴穩定的,變更頻率不同的東西不要關在同一個 stack" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="spArr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="60" y="20" width="300" height="42" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="210" y="38" fill="#e6e6e6" font-size="10.5" text-anchor="middle">服務 stack(每個服務一包)</text>
    <text x="210" y="54" fill="#9aa4b2" font-size="9" text-anchor="middle">日級變更:部署、參數、擴縮</text>
    <rect x="60" y="78" width="300" height="42" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="210" y="96" fill="#e6e6e6" font-size="10.5" text-anchor="middle">資料層 stack</text>
    <text x="210" y="112" fill="#9aa4b2" font-size="9" text-anchor="middle">週~月級:資料庫、儲存</text>
    <rect x="60" y="136" width="300" height="42" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="210" y="154" fill="#e6e6e6" font-size="10.5" text-anchor="middle">網路・基礎 stack</text>
    <text x="210" y="170" fill="#9aa4b2" font-size="9" text-anchor="middle">季級:VPC、DNS、權限骨架</text>
    <line x1="210" y1="62" x2="210" y2="76" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#spArr)"/>
    <line x1="210" y1="120" x2="210" y2="134" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#spArr)"/>
    <line x1="420" y1="40" x2="420" y2="158" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#spArr)"/>
    <text x="436" y="52" fill="#e6e6e6" font-size="9.5" text-anchor="start">變更頻率</text>
    <text x="436" y="68" fill="#9aa4b2" font-size="9.5" text-anchor="start">高 → 低</text>
    <text x="436" y="150" fill="#9aa4b2" font-size="9.5" text-anchor="start">依賴方向:</text>
    <text x="436" y="166" fill="#9aa4b2" font-size="9.5" text-anchor="start">常變 → 穩定</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">把天天變的和一季變一次的關在同一個 stack,等於讓最頻繁的變更每次都揹著最穩定資源的風險;依賴只能往下指——穩定的永遠不知道上面有誰</figcaption>
</figure>

除了變更頻率,另一條線是**團隊邊界**(Conway 定律在 infra 一樣靈):兩個團隊共用一份 state,就是兩個團隊互相阻塞;切開之後,各自的 pipeline 各自跑。切完的耦合處理也跟軟體一樣——stack 之間透過明確的介面往來(輸出值、資源名字查詢),而不是直接伸手進別人的 state 裡撈。

## 切太碎,是另一種形式的單體

把「小」當教條會走到另一個溝裡:每個資源一個 stack,改一個功能要照順序 apply 五個 stack、傳一串輸出值——**依賴網取代了單體,變更還是動不了一個地方就完事,還多了分散式的除錯**。書的立場是「小」永遠服務於「可獨立變更」:小是手段,獨立才是目的。檢驗切得好不好,我認為只需要一個指標:**回顧最近二十個日常變更,平均每個落在幾個 stack 裡?** 接近 1,切得好;經常 3 起跳,不管你的 stack 是太大還是太碎,邊界都畫錯了。

## 反思

### plan 的等待時間,是爆炸半徑的體感溫度計

我對單體 stack 的痛有具體的體感:plan 要等的時間,會直接改變人的行為。十秒的 plan,大家隨手就跑、天天 apply;二十分鐘的 plan,工程師會「攢一攢再一起跑」——不是懶,是理性選擇,但攢出來的正是大批次。所以切割的效益不用等架構圖來證明,看行為就知道:**切完之後,如果 apply 的頻率明顯上升、單次變更的 diff 明顯變小,就是切對了**。基礎設施的架構好壞,最終都會顯影在團隊的行為上——工具再好,人不敢按,就是零。

### 微服務切壞的教訓,infra 一行都沒少重演

「照資源種類切 stack」跟當年「照技術層切微服務」(controller 一個服務、DB access 一個服務)是同一個錯誤:**邊界畫在技術相似性上,而不是變更的相關性上**。下場也一樣——每個需求都要跨界,每次跨界都要協調。軟體圈用十年學會「以業務能力切服務」,infra 的對應答案就是這章的「以變更模式切 stack」。我的懶人包:切之前先把最近一季的變更紀錄攤開來,看**哪些東西總是一起改**——資料會告訴你邊界在哪,不用開白板會猜。

### 爆炸半徑是我用過最好賣的重構語言

跟管理層提「我們要重構 Terraform 結構」,聽起來像工程師的潔癖,排不進 roadmap;換成爆炸半徑的語言就完全不同:「現在改任何一個服務的設定,風險範圍是整個 production 的網路和資料庫;切完之後,風險範圍縮到那個服務自己」——這是風險管理,不是美學。[[btl-1|領導力]]那條線我一直在學的事情之一,就是把工程判斷翻譯成對方在乎的維度;blast radius 這個詞的價值,一半在工程,一半在它天生就是管理層聽得懂的語言。
