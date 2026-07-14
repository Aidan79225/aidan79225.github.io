---
title: "SRE 空降一間『什麼都自建』的公司,前 90 天怎麼站穩"
date: 2026-07-13
category: tech
description: "換工作最刺激的一種,是加入一間幾乎全自建的公司——沒有現成雲服務、沒有 Datadog、連 Stack Overflow 都幫不了你,因為這裡的工具全世界只有這家在用。你過去累積的『某某工具怎麼用』大半失效。這篇講一個 SRE 在這種環境下怎麼快速上手:最有效的一招是抓一個真實請求跟著它走完全程,以及前 90 天該有的節奏——先把系統地圖畫進腦子,再動手。核心心法:別急著證明自己,先理解,後動手。"
tags:
  - sre
  - career
comments: true
draft: false
---
換工作最刺激的一種,是加入一間**幾乎什麼都自建**的公司:沒有現成的雲服務、沒有 Datadog、連 Stack Overflow 都幫不上忙——因為這裡的基礎設施、部署工具、監控系統,全世界只有這一家在用。你過去累積的「某某工具怎麼設定」大半失效,知識不在網路上,而是藏在**程式碼、少數幾個人的腦子、以及過去的事故紀錄裡**。這種環境怎麼快速上手?我的心法濃縮成一句話:**別急著證明自己,先把系統的地圖畫進腦子。**

## 上手第一招:抓一個真實請求,跟著它走完全程

如果只能做一件事,就做這個。Wiki 上的架構圖是**理想、而且通常過期**的;真正逼你理解系統的,是挑**一個真實的使用者請求**,親手追蹤它從進來到回應,中間經過的每一跳:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 236" role="img" aria-label="上手第一招:抓一個真實請求跟它走完全程。請求從使用者,經過自建入口 LB、自建 API 服務、自建訊息佇列、資料庫。每一跳都停下來問四個問題:這是什麼元件誰維護、怎麼看它健康監控在哪、它壞了下游會怎樣、正常時流量資料長怎樣。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ob" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">抓一個真實請求,跟著它走完全程</text>
    <rect x="10" y="42" width="94" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="57" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">使用者</text><text x="57" y="74" fill="#9aa4b2" font-size="7.4" text-anchor="middle">一個真實請求</text>
    <line x1="104" y1="63" x2="118" y2="63" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob)"/>
    <rect x="120" y="42" width="94" height="42" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="167" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">自建入口 LB</text><text x="167" y="74" fill="#4f6df5" font-size="7.4" text-anchor="middle">(自建)</text>
    <line x1="214" y1="63" x2="228" y2="63" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob)"/>
    <rect x="230" y="42" width="94" height="42" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="277" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">API 服務</text><text x="277" y="74" fill="#4f6df5" font-size="7.4" text-anchor="middle">(自建框架)</text>
    <line x1="324" y1="63" x2="338" y2="63" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob)"/>
    <rect x="340" y="42" width="94" height="42" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="387" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">自建佇列</text><text x="387" y="74" fill="#4f6df5" font-size="7.4" text-anchor="middle">(自建)</text>
    <line x1="434" y1="63" x2="448" y2="63" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ob)"/>
    <rect x="450" y="42" width="94" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="497" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle">資料庫</text><text x="497" y="74" fill="#9aa4b2" font-size="7.4" text-anchor="middle">最終落點</text>
    <rect x="22" y="104" width="536" height="112" rx="9" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="124" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">每一跳都停下來,問這四題</text>
    <text x="46" y="150" fill="#54b890" font-size="8.8" text-anchor="start">① 這是什麼元件?誰維護?</text>
    <text x="302" y="150" fill="#54b890" font-size="8.8" text-anchor="start">② 怎麼看它健康?監控 / log 在哪?</text>
    <text x="46" y="178" fill="#54b890" font-size="8.8" text-anchor="start">③ 它壞了,下游會怎樣?</text>
    <text x="302" y="178" fill="#54b890" font-size="8.8" text-anchor="start">④ 正常時,流量 / 資料長怎樣?</text>
    <text x="290" y="204" fill="#9aa4b2" font-size="8.2" text-anchor="middle">走完一輪,你腦中就有一張「活的」架構圖——比任何 wiki 都準</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">跟著真實請求走一遍,你看到的是系統<b>現在真的長怎樣</b>——包含所有 wiki 沒寫的醜陋特例、繞路、和「暫時的」workaround。每一跳問完那四題,你不只畫出了架構圖,還順手摸清了「這裡壞掉會怎樣、我要去哪看」——那正是 SRE 的本職。這招其實就是 <a href="/blog/sre-troubleshooting/">排障</a>的分而治之,只是拿來上手</figcaption>
</figure>

這招的威力在於它**同時**幫你補齊三件事:系統長相(元件與拓撲)、可觀測性(監控與 log 在哪)、以及故障想像(每一跳壞掉的後果)。而且它是**主動**的——你不是被動聽人簡報,而是自己動手挖,挖過的東西才真的長在腦子裡。

## 前 90 天的節奏:先理解,後動手

新人最容易犯的錯,是第一週就急著「做點什麼證明自己」——改設定、提重構、嫌東嫌西。在一間自建系統的公司,這幾乎注定踩雷,因為每個看似奇怪的設計背後,常有你還沒看到的血淚原因。我給自己排的節奏是這樣:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="前 90 天的節奏,由下往上四階段。第一階段週 1 到 2 建地圖:trace 一個真實請求、讀架構、學內部黑話。第二階段週 3 到 6 見習值班:shadow on-call、讀過去 postmortem、看 dashboard 學正常長相。第三階段月 2 第一個貢獻:補缺的 runbook 或文件,低風險高價值。第四階段月 3 開始自動化:挑一個親身受夠的 toil 動手。貫穿全部:先理解再動手,別在第一週就大改。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="oc" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker></defs>
    <text x="318" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">前 90 天:先理解,後動手</text>
    <line x1="52" y1="192" x2="52" y2="40" stroke="#54b890" stroke-width="1.4" marker-end="url(#oc)"/>
    <text x="40" y="118" fill="#54b890" font-size="8" text-anchor="middle" transform="rotate(-90 40 118)">投入深度 · 信任↑</text>
    <rect x="70" y="34" width="486" height="32" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="86" y="54" fill="#54b890" font-size="9" text-anchor="start" font-weight="bold">月 3 · 開始自動化</text><text x="546" y="54" fill="#9aa4b2" font-size="8.2" text-anchor="end">挑一個你親身受夠的 toil 動手</text>
    <rect x="70" y="72" width="486" height="32" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="86" y="92" fill="#4f6df5" font-size="9" text-anchor="start" font-weight="bold">月 2 · 第一個貢獻</text><text x="546" y="92" fill="#9aa4b2" font-size="8.2" text-anchor="end">補缺的 runbook / 文件(低風險、高價值)</text>
    <rect x="70" y="110" width="486" height="32" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="86" y="130" fill="#4f6df5" font-size="9" text-anchor="start" font-weight="bold">週 3–6 · 見習值班</text><text x="546" y="130" fill="#9aa4b2" font-size="8.2" text-anchor="end">shadow on-call、讀 postmortem、學「正常長相」</text>
    <rect x="70" y="148" width="486" height="32" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.3"/><text x="86" y="168" fill="#d6a45c" font-size="9" text-anchor="start" font-weight="bold">週 1–2 · 建地圖</text><text x="546" y="168" fill="#9aa4b2" font-size="8.2" text-anchor="end">trace 一個真實請求、讀架構、學內部黑話</text>
    <text x="318" y="204" fill="#e0733a" font-size="8.6" text-anchor="middle" font-weight="bold">⚠ 別在讀懂前就大改</text>
    <text x="318" y="220" fill="#9aa4b2" font-size="8.2" text-anchor="middle">自建系統的每個怪設計,背後常有你還沒看到的理由(Chesterton's fence)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">節奏的脊椎是「先理解、後動手」:前六週幾乎只做輸入(建地圖、見習、讀事故),月 2 才用最低風險的方式產出第一個貢獻(補文件),月 3 才碰自動化。越往上,動作越大、需要的信任越多——而信任,是你前面幾週用「先把系統搞懂」換來的</figcaption>
</figure>

其中**見習值班 + 讀過去的 postmortem**,是我認為投報率最高的一段。過去的 postmortem 等於一份「這個系統真的會怎麼壞、在哪壞」的濃縮教材——比任何架構簡報都值錢,因為它講的是真實發生過的血案,而不是設計者的一廂情願。而看 dashboard 學「正常長相」則是另一半:你得先知道系統健康時長什麼樣,出事時才分得出異常。

## 全自建公司的幾個特殊玩法

- **知識藏在三個地方**:程式碼(最終真相)、過去的 postmortem(哪裡會爆)、那位「什麼都知道」的資深(問他,但別只依賴他——人會離職)。網路上查不到,就往這三處挖。
- **早點建一份黑話表**:自建工具都有自己的內部命名、縮寫、術語。第一週就開始記,兩週後你會感謝自己。
- **把「code 都在手上」當紅利**:用 SaaS 你只能對著黑箱猜,但自建系統的每一行都在你的 repo 裡——你能**真的讀到底、也真的改得動**。這是自建環境唯一比別人爽的地方,好好利用。
- **先問「為什麼自己造」再說換掉**:別急著喊「這個用開源的 X 換掉就好」。他們當初沒用現成的,通常有你還沒踩到的理由——先搞懂,再評估。

## 反思

### 新人最大的資產是「不懂」,別急著浪費它

剛進公司的前幾週,你擁有一個**再也拿不回來**的東西:一雙「什麼都不覺得理所當然」的眼睛。你上手時每一個卡住的地方、每一個「這什麼?怎麼沒人寫」的瞬間,都精準地標記出**文件的缺口**——而這正是你第一個月最好的貢獻清單。我每次到新環境都會開一份「我卡住的地方」筆記,兩個月後它就變成我補的第一批 runbook。**因為再過陣子你就『習慣』了,那些坑會變成你視而不見的日常,這個視角就永遠消失了。** 不懂不是弱點,是有保鮮期的資產。

### 先理解再動手,不是慢,是對系統複雜度的尊重

我年輕時很想用「第一週就修好一個東西」來證明自己值得被錄取,結果常常是改了一個我以為多餘的設計,才發現它在擋一個我沒看到的邊界狀況。自建系統尤其如此——那些看起來很蠢的特例,很多是某次半夜事故留下的疤。所以我現在的紀律是:**看到怪東西,先問「為什麼會變成這樣」,而不是「這也太爛了吧」。** 這跟 [[sre-troubleshooting|排障]]的精神一樣——**相信證據、別憑直覺猜**;也跟 [[sre-postmortem|blameless]] 的底層假設一致:眼前這個設計不是因為前人蠢,是因為他們面對過你還沒面對的處境。理解在前,批判在後。

### 讀 postmortem,是我看過最高效的入職教材

如果讓我只推薦一件事給空降的 SRE,那就是**把過去半年到一年的 postmortem 全部讀一遍**。一份好的事故報告,濃縮了系統最脆弱的關節、最容易被誤解的地方、以及真實壓力下人會怎麼反應——這些東西,新人訓練簡報永遠不會告訴你,因為它們太真實、太不光彩。我讀 postmortem 的一週,對系統的理解勝過前面聽簡報的一個月。這也讓我更確信 [[sre-monitoring|監控]]和 [[sre-postmortem|postmortem]] 文化的價值:一個願意誠實記錄自己怎麼壞掉的組織,等於幫每一個未來的新人,預先寫好了最珍貴的那本地圖。
