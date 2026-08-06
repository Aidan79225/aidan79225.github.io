---
title: "一切皆程式碼:宣告式寫終點,程序式寫路徑"
date: 2026-08-06
category: tech
description: "三個核心實踐的第一個:把所有東西定義成程式碼。宣告式語言寫「終點長什麼樣」,工具負責比對現況、算出差異、收斂過去——冪等讓再跑一次永遠安全;程序式語言寫「怎麼做」,適合封裝抽象。最重要的警訊反而是:當你開始在 YAML 裡寫 if 和迴圈,就是邏輯該搬家的時候。"
tags:
  - iac
  - devops
  - book-notes
series: "Infrastructure as Code 讀書筆記"
seriesOrder: 4
comments: true
draft: false
---
前三章鋪完[[iac-intro|為什麼]]、[[iac-principles|原則]]、[[iac-platforms|平台]],從這章開始進入三個核心實踐,第一個就是招牌:**把所有東西定義成程式碼**——不只伺服器,網路、pipeline、監控、權限,全部。好處書裡列得很整齊(可重用、一致、透明、可測試、可 review),但這章真正的重頭戲是一個更根本的問題:**「定義」用什麼語言寫?** 宣告式和程序式的分工,決定了你的 IaC 三年後是資產還是災難。

## 宣告式:你寫終點,工具找路

宣告式(declarative)語言——Terraform 的 HCL、CloudFormation、Kubernetes 的 manifest——寫的不是「做什麼」,是「**做完之後世界長什麼樣**」。剩下的交給工具:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 232" role="img" aria-label="宣告式的收斂機制:定義檔寫 web 伺服器三台,現況只有兩台,工具比對算出差異加一台,執行變更把現況推向定義;再跑一次差異為零,什麼都不做,這就是冪等" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="ecArr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="ecArr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#4f6df5"/></marker></defs>
    <rect x="24" y="34" width="170" height="40" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="109" y="52" fill="#e6e6e6" font-size="10.5" text-anchor="middle">定義檔(想要的終點)</text>
    <text x="109" y="67" fill="#9aa4b2" font-size="9" text-anchor="middle">web 伺服器 × 3</text>
    <rect x="24" y="150" width="170" height="40" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="109" y="168" fill="#e6e6e6" font-size="10.5" text-anchor="middle">現況</text>
    <text x="109" y="183" fill="#9aa4b2" font-size="9" text-anchor="middle">web 伺服器 × 2</text>
    <line x1="194" y1="66" x2="248" y2="100" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ecArr)"/>
    <line x1="194" y1="158" x2="248" y2="124" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ecArr)"/>
    <rect x="252" y="90" width="120" height="44" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="312" y="108" fill="#e6e6e6" font-size="10.5" text-anchor="middle">比對(plan)</text>
    <text x="312" y="123" fill="#9aa4b2" font-size="9" text-anchor="middle">差異:+1 台</text>
    <line x1="372" y1="112" x2="416" y2="112" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ecArr)"/>
    <rect x="420" y="90" width="120" height="44" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="480" y="108" fill="#e6e6e6" font-size="10.5" text-anchor="middle">執行(apply)</text>
    <text x="480" y="123" fill="#9aa4b2" font-size="9" text-anchor="middle">只補差異的部分</text>
    <path d="M 470 134 Q 420 190 198 172" fill="none" stroke="#4f6df5" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#ecArr2)"/>
    <text x="360" y="185" fill="#4f6df5" font-size="9.5" text-anchor="middle">把現況推向定義</text>
    <text x="280" y="219" fill="#9aa4b2" font-size="9.5" text-anchor="middle">跑第二次?比對差異 = 0 → 什麼都不做。這就是冪等</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">宣告式的核心機制是收斂:比對「定義」與「現況」,只補差異。同一份定義跑一次和跑十次,結果一樣</figcaption>
</figure>

這個機制送你兩個大禮:

- **冪等(idempotency)**:重複執行是安全的——這正是[[iac-intro|恐懼螺旋]]出口(「更常跑」)的技術前提。不冪等的 script 跑兩次會建出兩倍的東西,誰敢排程每天跑?
- **plan/diff 可以先看**:變更執行前,工具能告訴你「將會改什麼」——基礎設施的變更第一次有了像 code review 的 diff 可讀。

## 程序式:你寫路徑,適合寫抽象

程序式(imperative / procedural)寫的是步驟與邏輯——一路從 shell script 到用真程式語言寫基礎設施的 Pulumi、CDK。它的強項是宣告式的弱項:**條件、迴圈、組合、封裝**。書的建議是把它用在「寫可重用的抽象」——把「我們公司一個標準服務要配的十樣東西」包成一個函式庫、一個模組,給團隊呼叫。

## 最重要的一節:別在宣告式語言裡寫程式

兩種語言各自都好,災難發生在混用的地帶:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 178" role="img" aria-label="語言光譜:左邊宣告式寫終點,適合定義固定形狀的東西;右邊程序式寫路徑,適合封裝邏輯與抽象;中間是混種地帶——在宣告式語言裡寫迴圈與條件,是該把邏輯搬家的警訊" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="110" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">HCL · K8s manifest · YAML</text>
    <text x="280" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">count · for_each · {{if}} 巢狀 template</text>
    <text x="450" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">Pulumi · CDK · 一般程式語言</text>
    <rect x="30" y="62" width="160" height="46" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="110" y="81" fill="#e6e6e6" font-size="11" text-anchor="middle">宣告式</text>
    <text x="110" y="97" fill="#9aa4b2" font-size="9" text-anchor="middle">寫終點:東西長什麼樣</text>
    <rect x="205" y="62" width="150" height="46" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="5 4"/>
    <text x="280" y="81" fill="#e6e6e6" font-size="11" text-anchor="middle">混種地帶</text>
    <text x="280" y="97" fill="#9aa4b2" font-size="9" text-anchor="middle">YAML 裡長出 if 和迴圈</text>
    <rect x="370" y="62" width="160" height="46" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="450" y="81" fill="#e6e6e6" font-size="11" text-anchor="middle">程序式</text>
    <text x="450" y="97" fill="#9aa4b2" font-size="9" text-anchor="middle">寫路徑:邏輯與抽象</text>
    <text x="110" y="134" fill="#e6e6e6" font-size="9.5" text-anchor="middle">適合:變異低、重複高的定義</text>
    <text x="280" y="134" fill="#9aa4b2" font-size="9.5" text-anchor="middle">警訊:邏輯該搬家了</text>
    <text x="450" y="134" fill="#e6e6e6" font-size="9.5" text-anchor="middle">適合:封裝成模組與函式庫</text>
    <text x="280" y="162" fill="#9aa4b2" font-size="9.5" text-anchor="middle">兩端都是好工具,中間才是災難——用錯語言做另一邊的事</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">宣告式語言為「描述固定形狀」而生,硬塞進迴圈和條件,就是在用一個不是為寫程式設計的語言寫程式</figcaption>
</figure>

宣告式語言是為「描述固定形狀的東西」設計的,但需求一複雜,大家就開始往裡面塞 `count`、`for_each`、三層巢狀的 `{{ if }}` template——**用一個不是為寫程式設計的語言寫程式**:沒有好的測試框架、沒有 debugger、錯誤訊息天書。反過來混也一樣糟:用程序式語言把一份本來三行宣告能講完的定義,包進三層自己發明的抽象,讀的人要先考古你的框架。

書的解法很清楚:**兩邊各安其位**——固定形狀的定義留在宣告式,需要邏輯的部分抽出來用程序式寫成模組;當一邊開始長出另一邊的長相,就是搬家的訊號,不是加更多 workaround 的訊號。

## 反思

### YAML 裡的第一個 if,是最便宜的警報器

這章給了我一個可以直接用的 code review 準則:**看到宣告式檔案裡出現第一個條件或迴圈,就停下來問「這段邏輯是不是進錯語言了」。** 我在 Helm chart 的 template 裡看過最痛的版本——`{{- if }}` 套 `{{- range }}` 再套 `{{- with }}`,一份 values 要對著 template 心算三層才知道會 render 出什麼,改一行要禱告。當時我以為那是 Helm 的原罪,讀完這章才看清:那是「在宣告式語言裡寫程式」這個 anti-pattern 的通例,Helm 只是其中一個現場。訊號出現時的正解是把變異收斂(回到[[iac-principles|最小化變異]])或把邏輯搬去真的程式語言,而不是繼續堆 template 技巧。

### 「一切皆程式碼」最大的紅利是 diff,不是自動化

推 IaC 之前,基礎設施變更的溝通是「我等一下要去改 LB 設定」這種口頭廣播;推完之後,**每個變更是一個 PR,有 diff、有 review、有紀錄,部署前還有 plan 告訴你會動到什麼**。半年後回頭看,自動化省的時間反而是配角——真正改變團隊的是變更第一次變得「可讀」:新人用讀 PR 補基礎設施的來龍去脈,事故時用 git log 反查那天動了什麼。知識從「在誰腦袋裡」變成「在版本庫裡」,這才是把 [[ansible-intro|雪花]]連根拔掉的那一下。

### 冪等是「敢常跑」的技術地基

第一篇說恐懼螺旋的出口是「所有變更走自動化、而且常跑」,這章補上了為什麼做得到:**冪等讓重跑的成本趨近於零**。一份不冪等的 script,每次執行前你都要先想「現在的狀態跑下去安全嗎」——這個心智成本就是沒人敢排程它的原因。宣告式 + 冪等把這件事反過來:比對之後沒差異就什麼都不做,於是「每小時收斂一次」可以無腦開著,飄移永遠活不過六十分鐘。我的檢驗法也跟著升級:一套 IaC 健不健康,看它的自動化「上一次執行」是多久以前——排程在天天跑的,才是活的;要人鼓起勇氣才跑的,已經在螺旋裡了。
