---
title: "全景:留言下單的一筆訂單,會經過哪些系統"
date: 2026-07-25
category: tech
description: "新系列開場:直播代購電商怎麼運作——主播喊 key、留言 +1 下單、佔庫存、金流到出貨。一筆訂單的完整旅程、三個真正難的點,以及如果重來的總架構。"
tags:
  - war-story
  - live-commerce
  - system-design
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 1
comments: true
draft: false
---
這是一個新系列,也是這個部落格第一個**戰爭故事**。我在前公司實際做過一個直播代購電商平台——使用者看直播、在留言區打字下單,後面接著庫存、金流、物流一整條鏈。這系列不是回憶錄:我想帶著現在的功力(DDIA、Redis、Kafka、SRE 都重新讀過一輪之後)把當年的仗**重打一次**——每章從一個真實需求出發,先講當年怎麼做、踩了什麼,再給重來版的設計。第一篇先把全景鋪開。

## 這門生意:讓聊天室變成收銀機

規則其實很簡單:

- 主播開直播賣代購商品,講到一件商品就喊出它的 **key**(例如「2601」)。
- 想買的人在留言區打 **`2601+2`**:key + 數量,這樣就是下單 2 件。
- 同一個人對同一個 key 重複留言,**以最後一筆為準**——打了 `2601+2` 又改打 `2601+1`,就是買 1 件。
- 留言成立的單直接進購物車,而且**佔庫存**;商品有庫存上限,**不能超賣**。
- 購物車分兩種:直播下單的**佔庫存**,自己在電商平台上加入的**不佔**;數量都可以隨時調整。
- 留言來源不只一個平台:**FB、IG、自建直播間**都有,規則要一體適用。
- 最麻煩的一條:留言下單的人,**可能根本還沒註冊帳號**——但庫存還是要先卡給他。

每一條規則單看都是一個週末的工作量。難的是把它們放在同一句話裡:**三千人同時留言,搶 20 件庫存,一半的人沒帳號,留言來自三個平台**——這才是這個系統真實的樣子。

## 一筆訂單的旅程

先看一筆訂單從留言到出貨的完整路徑,這條路徑就是整個系列的目錄:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 262" role="img" aria-label="一筆訂單的旅程,分兩排八站。上排由左到右:多平台留言(FB、IG、自建)、adapter 收斂成統一留言事件、解析 key 加 n 且同人重複留言取最後一筆、身分 identity 沒帳號也要能掛單。接著折返到下排,由右到左:佔庫存購物車扣掉 n 件且不能超賣、結帳時兩種購物車合併、第三方金流靠 webhook 回調、出貨前處理做合併出貨後交給物流。另有一條虛線從金流指回佔庫存購物車,代表逾期未付要釋放庫存。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rzf" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rza" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#d6a45c"/></marker></defs>
    <rect x="20" y="34" width="120" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="80" y="53" fill="#e6e6e6" font-size="9" text-anchor="middle" font-weight="bold">留言進來</text>
    <text x="80" y="68" fill="#9aa4b2" font-size="7" text-anchor="middle">FB / IG / 自建</text>
    <rect x="158" y="34" width="120" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="218" y="53" fill="#e6e6e6" font-size="9" text-anchor="middle" font-weight="bold">統一留言事件</text>
    <text x="218" y="68" fill="#9aa4b2" font-size="7" text-anchor="middle">每源一個 adapter</text>
    <rect x="296" y="34" width="120" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="356" y="53" fill="#e6e6e6" font-size="9" text-anchor="middle" font-weight="bold">解析 key+n</text>
    <text x="356" y="68" fill="#9aa4b2" font-size="7" text-anchor="middle">同人重複取最後一筆</text>
    <rect x="434" y="34" width="120" height="46" rx="6" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.2"/>
    <text x="494" y="53" fill="#9b6ff0" font-size="9" text-anchor="middle" font-weight="bold">身分 identity</text>
    <text x="494" y="68" fill="#9aa4b2" font-size="7" text-anchor="middle">沒帳號也要能掛單</text>
    <line x1="140" y1="57" x2="156" y2="57" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzf)"/>
    <line x1="278" y1="57" x2="294" y2="57" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzf)"/>
    <line x1="416" y1="57" x2="432" y2="57" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzf)"/>
    <line x1="494" y1="80" x2="494" y2="148" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzf)"/>
    <rect x="434" y="152" width="120" height="46" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="494" y="171" fill="#d6a45c" font-size="9" text-anchor="middle" font-weight="bold">佔庫存購物車</text>
    <text x="494" y="186" fill="#9aa4b2" font-size="7" text-anchor="middle">庫存 −n・不能超賣</text>
    <rect x="296" y="152" width="120" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="356" y="171" fill="#e6e6e6" font-size="9" text-anchor="middle" font-weight="bold">結帳</text>
    <text x="356" y="186" fill="#9aa4b2" font-size="7" text-anchor="middle">兩種購物車合併</text>
    <rect x="158" y="152" width="120" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="218" y="171" fill="#e6e6e6" font-size="9" text-anchor="middle" font-weight="bold">第三方金流</text>
    <text x="218" y="186" fill="#9aa4b2" font-size="7" text-anchor="middle">webhook・冪等</text>
    <rect x="20" y="152" width="120" height="46" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="80" y="171" fill="#e6e6e6" font-size="9" text-anchor="middle" font-weight="bold">出貨前處理</text>
    <text x="80" y="186" fill="#9aa4b2" font-size="7" text-anchor="middle">合併出貨・交物流</text>
    <line x1="432" y1="175" x2="418" y2="175" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzf)"/>
    <line x1="294" y1="175" x2="280" y2="175" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzf)"/>
    <line x1="156" y1="175" x2="142" y2="175" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzf)"/>
    <path d="M 238 150 Q 356 108 486 148" fill="none" stroke="#d6a45c" stroke-width="1.1" stroke-dasharray="4 3" marker-end="url(#rza)"/>
    <text x="356" y="120" fill="#d6a45c" font-size="7.4" text-anchor="middle">逾期未付 → 釋放庫存</text>
    <text x="290" y="234" fill="#9aa4b2" font-size="7.6" text-anchor="middle">每一站都是系列的一章:留言接入、身分、庫存、購物車、金流、出貨前處理</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一筆訂單的旅程:上排把「一則留言」變成「一筆掛在身分上的單」,下排把「佔到的庫存」變成「送到家的貨」。</figcaption>
</figure>

每一站展開都有自己的取捨,細節留給各章;這裡只點出每站「真正的問題是什麼」:

- **留言進來**:三個平台的取得方式完全不同(webhook、輪詢、自家直推),先各自收斂成統一的留言事件,下游才不用管來源。「重複留言取最後一筆」看似簡單,其實是 [[ddia-replication|LWW]]——你得先回答「以什麼順序為準」。
- **身分**:留言的是 `fb:12345`,不是我們的會員。庫存要卡給這個**身分**,帳號之後才出現、再把單認領回去。這是全系列最容易被低估的一章。
- **佔庫存**:不能超賣是這個系統唯一的鐵律,本質是[[ddia-transactions|不變量]]在併發下的保衛戰。佔了就要有釋放——逾期、取消、改數量,缺一個就會有庫存慢性失血。
- **結帳與金流**:兩種購物車在這裡合流;金流的 webhook 會重複、會亂序、會根本不來,[[ddia-distributed-trouble|不可靠網路]]的每一課這裡都會考。
- **出貨前處理**:代購的特色——多場直播的單**合併出貨**,等貨到齊、一人多單併一箱,揀貨那一刻庫存帳才真正落地。

## 真正難的三件事

功能列表不難,難的是三個橫貫整條鏈的性質:

1. **尖峰不是曲線,是牆。** 主播喊完 key 的那三秒,幾千則留言同時湧入——這不是一般電商的「大促流量爬升」,是一句話觸發的 thundering herd(開賣尖峰那章專門講)。
2. **不能超賣,而且是在併發下不能。** 庫存 20 件、三千人搶,任何「先查再扣」的天真寫法都會賣超。這條不變量必須在架構層保證,不能靠小心。
3. **三本帳要對齊。** 庫存帳、訂單帳、金流帳分屬三個系統,跑久了一定歪;歪了之後你要能回答「以誰為準」——沒有事實來源的系統,對帳只能用猜的(對帳那章專門講)。

## 重來版的總架構:先寫下事實,再派生一切

當年的系統其實已經摸到這個門口:留言抓進來會先清洗、落地進 DB,再由一個 job 批次消費。重來,我只做一件事——把這個當年只當成「緩衝」的東西,扶正成整個架構的中心:**留言不是待處理的輸入,是要永久留下的事實**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 292" role="img" aria-label="重來版總架構分四層。最上層三個留言來源 FB、IG、自建,各自經過 adapter 收斂;第二層是一條 append-only 的留言與訂單事件流,標註為唯一事實來源;第三層五個服務各自消費事件流:下單解析、身分、庫存預留、購物車與訂單、金流與出貨;最下層是三本帳對帳,庫存帳、訂單帳、金流帳都是從事件流派生的視圖,定期對齊、歪了以事件流為準。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rzb" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rzm" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="90" y="14" width="110" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="145" y="30" fill="#e6e6e6" font-size="8.4" text-anchor="middle">FB 留言</text>
    <rect x="235" y="14" width="110" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="290" y="30" fill="#e6e6e6" font-size="8.4" text-anchor="middle">IG 留言</text>
    <rect x="380" y="14" width="110" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="435" y="30" fill="#e6e6e6" font-size="8.4" text-anchor="middle">自建直播間</text>
    <line x1="145" y1="38" x2="145" y2="56" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rzm)"/>
    <line x1="290" y1="38" x2="290" y2="56" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rzm)"/>
    <line x1="435" y1="38" x2="435" y2="56" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rzm)"/>
    <rect x="60" y="60" width="460" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="290" y="76" fill="#9aa4b2" font-size="8.4" text-anchor="middle">adapter × N:每源一個,收斂成統一留言事件(M×N → M+N)</text>
    <line x1="290" y1="84" x2="290" y2="102" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#rzb)"/>
    <rect x="40" y="106" width="500" height="32" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="290" y="126" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">留言/訂單事件流(append-only・唯一事實來源)</text>
    <line x1="90" y1="138" x2="90" y2="162" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rzb)"/>
    <line x1="190" y1="138" x2="190" y2="162" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rzb)"/>
    <line x1="290" y1="138" x2="290" y2="162" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rzb)"/>
    <line x1="390" y1="138" x2="390" y2="162" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rzb)"/>
    <line x1="490" y1="138" x2="490" y2="162" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rzb)"/>
    <rect x="40" y="166" width="100" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="90" y="184" fill="#e6e6e6" font-size="8.2" text-anchor="middle">下單解析</text>
    <text x="90" y="198" fill="#9aa4b2" font-size="6.6" text-anchor="middle">key+n・LWW</text>
    <rect x="148" y="166" width="92" height="42" rx="6" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.2"/>
    <text x="194" y="184" fill="#9b6ff0" font-size="8.2" text-anchor="middle">身分</text>
    <text x="194" y="198" fill="#9aa4b2" font-size="6.6" text-anchor="middle">identity→account</text>
    <rect x="248" y="166" width="92" height="42" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="294" y="184" fill="#d6a45c" font-size="8.2" text-anchor="middle">庫存預留</text>
    <text x="294" y="198" fill="#9aa4b2" font-size="6.6" text-anchor="middle">不能超賣</text>
    <rect x="348" y="166" width="92" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="394" y="184" fill="#e6e6e6" font-size="8.2" text-anchor="middle">購物車・訂單</text>
    <text x="394" y="198" fill="#9aa4b2" font-size="6.6" text-anchor="middle">狀態機</text>
    <rect x="448" y="166" width="92" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="494" y="184" fill="#e6e6e6" font-size="8.2" text-anchor="middle">金流・出貨</text>
    <text x="494" y="198" fill="#9aa4b2" font-size="6.6" text-anchor="middle">冪等介接</text>
    <line x1="150" y1="208" x2="205" y2="238" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rzm)"/>
    <line x1="290" y1="208" x2="290" y2="238" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rzm)"/>
    <line x1="430" y1="208" x2="375" y2="238" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rzm)"/>
    <rect x="120" y="242" width="340" height="28" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/>
    <text x="290" y="260" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">三本帳對帳:庫存帳・訂單帳・金流帳(派生視圖,定期對齊)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">重來版架構:事件流是唯一的事實來源,每個服務用自己的節奏消費;三本帳都是派生視圖,歪了以事件流為準。</figcaption>
</figure>

這個架構的三個主張,也是整個系列反覆出現的主旋律:

1. **先寫下事實,再談業務。** 留言一進來就 append 到事件流,業務邏輯是事件流的消費者。這一步同時解掉三件事:尖峰(寫入只是 append,削峰交給 queue,[[kafka-intro|Kafka]] 就是為此而生)、除錯(所有輸入都留痕,可以重放)、對帳(有了「以誰為準」的答案)。這正是 [[ddia-streaming|DDIA 第三部分]]「寫快的事實來源+讀快的派生視圖」的實戰版。
2. **庫存是預留模型,預留主是身分不是帳號。** 「佔庫存」其實是 reservation:卡給 `fb:12345` 這個 identity,帳號註冊後再認領。身分先於帳號,是這個業務跟一般電商最不一樣的地方。
3. **所有外部介接,預設對方會重複、會亂序、會消失。** 平台 webhook、金流回調、物流狀態——冪等不是加分項,是第一天就要有的地基。

## 系列地圖

系列照一筆訂單的旅程排,再加上維運與演進的縱深(章節還在長,以最新的系列列表為準):

- **開場與地基**:全景(本篇)、技術棧與 CI/CD 起手式。
- **交易主線**:留言即下單、身分與帳號、庫存、購物車與訂單。
- **錢與貨**:第三方金流、出貨前處理。
- **營運面**:主播後台、權限、優惠券與金額、通知、風控與黑名單。
- **橫切與維運**:開賣尖峰、沒有 SRE 的上線維運、三本帳對帳。
- **演進與終局**:monolith 拆微服務、如果變成 SaaS、小團隊的 EM 視角,以及最後的「Re:如果真的重來」。

## 反思

### 當年最大的錯,不是技術選型

是把「落地」當成緩衝,而不是事實來源。我們其實做對了一半:留言抓進來會先清洗、寫進 DB,再批次消費——已經是半個 event log。但清洗完**原文就丟了**,清洗規則漏接的留言永遠追不回來;批次**處理失敗的留言直接略過**,沒有留痕、沒有補救路徑,那位顧客就無聲消失。這是當年刻意的取捨:為了讓主播看到最快的庫存狀態,寧可掉單。重來我仍然會選快——但**快可以用「晚點處理」換,不能用「丟掉事實」換**:事實還在,掉的單事後補得回來;事實丟了,連道歉都不知道要跟誰道。尖峰時消費跟不上,留言到下單成功可以差到幾分鐘,主播那頭的庫存認知跟系統對不上——客訴就是從那幾分鐘裡長出來的。

### 不變量比功能重要

功能寫錯,改掉重上就好;超賣是把不存在的貨賣掉,要一個一個跟客人道歉退款,信任賠進去就回不來。所以這個系統裡「不能超賣」「錢帳對齊」「介接冪等」這三條,我重來會在第一天就寫進設計文件的第一頁——不是因為優雅,是因為這三條的違約成本是用商譽付的。這也是我寫這系列想傳達的核心:**電商系統的難,不在功能,在不變量。**

### 為什麼用「重來」的形式寫

因為「如果重來你會怎麼設計」是我自己面試別人最愛問的問題,而我發現最誠實的回答方式,是拿一個自己真的做過、真的做錯過的系統來答。接下來每一章都會有兩個聲部:當年怎麼做、為什麼那樣做;重來怎麼做、又為什麼。有趣的從來不是標準答案,是中間那段差距——那才是這幾年真正學到的東西。
