---
title: "基礎設施平台:你家的雲,是真的雲嗎?"
date: 2026-08-05
category: tech
description: "IaC 要有東西可以 code,那個東西就是動態基礎設施平台。第三章給出分層模型(應用/執行環境/平台)與三種資源原語(運算、儲存、網路),但最實用的是一張檢驗表:可程式化、隨需、自助——三個條件缺一個,你擁有的就不是雲,只是有 API 的鐵器時代。"
tags:
  - iac
  - devops
  - book-notes
series: "Infrastructure as Code 讀書筆記"
seriesOrder: 3
comments: true
draft: false
---
前兩章講完 [[iac-intro|為什麼]]和[[iac-principles|原則]],第三章回頭補一個地基問題:IaC 要有東西可以 code——你的定義檔寫得再漂亮,也要有一個**收到 API 呼叫就能生出資源的平台**在下面接著。這章就在講這個「動態基礎設施平台」:它在系統裡的位置、它提供什麼、以及——我覺得最有殺傷力的——**怎麼判斷你家的平台是不是真的**。

## 系統的三層:平台是最下面那層地基

書裡把整個系統切成三層,各層的變動節奏和負責的團隊都不一樣:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 252" role="img" aria-label="基礎設施系統分層:最上層是應用層,中間是應用執行環境(Kubernetes、PaaS),最下層是基礎設施平台,內含運算、儲存、網路三種資源原語,以可程式化、隨需、自助的方式提供" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="30" y="16" width="340" height="48" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="200" y="36" fill="#e6e6e6" font-size="11.5" text-anchor="middle">應用層</text>
    <text x="200" y="53" fill="#9aa4b2" font-size="9.5" text-anchor="middle">你的產品與服務</text>
    <rect x="30" y="76" width="340" height="48" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="200" y="96" fill="#e6e6e6" font-size="11.5" text-anchor="middle">應用執行環境</text>
    <text x="200" y="113" fill="#9aa4b2" font-size="9.5" text-anchor="middle">Kubernetes、PaaS、資料庫叢集</text>
    <rect x="30" y="136" width="340" height="96" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="200" y="160" fill="#e6e6e6" font-size="11.5" text-anchor="middle">基礎設施平台</text>
    <rect x="46" y="176" width="95" height="42" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="93" y="194" fill="#e6e6e6" font-size="10" text-anchor="middle">運算</text>
    <text x="93" y="209" fill="#9aa4b2" font-size="8.5" text-anchor="middle">VM · 容器 · FaaS</text>
    <rect x="152" y="176" width="95" height="42" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="199" y="194" fill="#e6e6e6" font-size="10" text-anchor="middle">儲存</text>
    <text x="199" y="209" fill="#9aa4b2" font-size="8.5" text-anchor="middle">block · object · DB</text>
    <rect x="258" y="176" width="95" height="42" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="305" y="194" fill="#e6e6e6" font-size="10" text-anchor="middle">網路</text>
    <text x="305" y="209" fill="#9aa4b2" font-size="8.5" text-anchor="middle">VPC · LB · DNS</text>
    <line x1="372" y1="153" x2="396" y2="153" stroke="#4f6df5" stroke-width="1.2" stroke-dasharray="4 3"/>
    <rect x="398" y="140" width="146" height="26" rx="13" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="471" y="157" fill="#e6e6e6" font-size="9.5" text-anchor="middle">可程式化(API)</text>
    <line x1="372" y1="185" x2="396" y2="185" stroke="#4f6df5" stroke-width="1.2" stroke-dasharray="4 3"/>
    <rect x="398" y="172" width="146" height="26" rx="13" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="471" y="189" fill="#e6e6e6" font-size="9.5" text-anchor="middle">隨需(分鐘級)</text>
    <line x1="372" y1="217" x2="396" y2="217" stroke="#4f6df5" stroke-width="1.2" stroke-dasharray="4 3"/>
    <rect x="398" y="204" width="146" height="26" rx="13" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="471" y="221" fill="#e6e6e6" font-size="9.5" text-anchor="middle">自助(不用開票)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三層模型:應用跑在執行環境上,執行環境跑在平台上;平台的本質是把運算、儲存、網路三種原語,用可程式化、隨需、自助的方式端出來</figcaption>
</figure>

分層的重點不是畫圖好看,是**責任切割**:應用團隊理想上只該面對中間那層(部署到 k8s、連上 DBaaS),不該人人都去碰 raw VM 和 VPC;平台團隊則把最下層打包成穩定的產品。IaC 的程式碼主要活在下面兩層——這也是為什麼這個系列跟我之前寫的 [[infra-platform|自建平台]]那條線,最後會匯流到同一個地方。

## 三種資源原語:雲的服務目錄再長,拆開都是這三樣

AWS 的服務列表破兩百項,看起來學不完——但書裡一句話把它砍回人能理解的尺寸:**平台提供的資源本質上只有三種:運算、儲存、網路。** 其他一切都是這三種原語的組合加代管:

| 原語 | 原始形態 | 越來越代管的形態 |
|---|---|---|
| 運算 | 實體機、VM | 容器、應用叢集(k8s)、FaaS |
| 儲存 | block storage(掛給 VM 的磁碟) | object storage、代管資料庫 |
| 網路 | VPC、subnet、route | LB、DNS、API gateway、防火牆規則 |

同一列由左到右,是「自己組」到「平台代管」的光譜——越往右,你管得越少、被綁得越深。這個表也是學雲的正確路徑:**從原語學,不要從服務目錄學**。原語懂了,兩百個服務只是排列組合;原語不懂,每個服務都像新東西。

## 檢驗表:可程式化、隨需、自助——缺一個都不是雲

全章我認為最實用的部分,是「動態平台」的三個必要條件。很多組織自認有私有雲,拿這張表一照就現形:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 212" role="img" aria-label="對比:左邊是有虛擬化但非動態平台的流程——開票申請、排隊人工審核、三天後拿到機器;右邊是動態平台——呼叫 API、九十秒拿到機器、用完即還" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="pfArr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="280" y1="14" x2="280" y2="202" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 4"/>
    <text x="140" y="30" fill="#e6e6e6" font-size="12" text-anchor="middle">有虛擬化 ≠ 動態平台</text>
    <text x="420" y="30" fill="#e6e6e6" font-size="12" text-anchor="middle">動態基礎設施平台</text>
    <rect x="60" y="46" width="160" height="32" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="140" y="66" fill="#e6e6e6" font-size="10.5" text-anchor="middle">開票申請 VM</text>
    <line x1="140" y1="78" x2="140" y2="98" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#pfArr)"/>
    <rect x="60" y="102" width="160" height="32" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="140" y="122" fill="#e6e6e6" font-size="10.5" text-anchor="middle">排隊等人工審核</text>
    <line x1="140" y1="134" x2="140" y2="154" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#pfArr)"/>
    <rect x="60" y="158" width="160" height="32" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="140" y="178" fill="#9aa4b2" font-size="10.5" text-anchor="middle">三天後拿到機器</text>
    <rect x="340" y="46" width="160" height="32" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="420" y="66" fill="#e6e6e6" font-size="10.5" text-anchor="middle">pipeline 呼叫 API</text>
    <line x1="420" y1="78" x2="420" y2="98" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#pfArr)"/>
    <rect x="340" y="102" width="160" height="32" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="420" y="122" fill="#e6e6e6" font-size="10.5" text-anchor="middle">90 秒拿到機器</text>
    <line x1="420" y1="134" x2="420" y2="154" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#pfArr)"/>
    <rect x="340" y="158" width="160" height="32" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="420" y="178" fill="#e6e6e6" font-size="10.5" text-anchor="middle">用完即還,自動回收</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左邊的技術可能跟右邊一模一樣——差的是流程:API 前面擋一道人工審核,可程式化就死了,IaC 的自動化也跟著斷在那裡</figcaption>
</figure>

- **可程式化(programmable)**:一切透過 API 操作,工具和 pipeline 才接得上。
- **隨需(on-demand)**:要資源的時候分鐘級拿到,不用等採購、等排程。
- **自助(self-service)**:用的團隊自己來,不用向另一個團隊開票、等審批。

三個條件是相乘不是相加——**API 前面只要擋一道人工簽核,前面兩項就同時歸零**,因為你的自動化 pipeline 會在那一步斷掉,退化成「產生一張票,然後等人」。至於平台的形態——公有雲、私有雲(OpenStack)、bare-metal、混合——書的態度很務實:那是由資料主權、既有投資、規模這些**約束**決定的選擇,不是信仰問題;只要三個條件成立,IaC 在哪個形態上都成立。

## 反思

### 「有 API 的鐵器時代」比沒有 API 更迷惑人

上一篇發完之後我被問了一個好問題:公司還在鐵器時代,適合做 IaC 嗎?讀完這章我會把答案講得更準:**該擔心的不是機房,是流程。** 一個有 VMware、有 API、卻規定開 VM 要走三天簽核流的組織,比純鐵器時代更難改——因為帳面上「我們有雲了」,轉型的預算和決心都撥不下來,實際上自動化在第一道審核就斷頭。反而是誠實的鐵器時代組織,從組態管理開始做、再補虛擬化,路徑很清楚。**判斷成熟度,別問「用什麼技術」,問「從想要一台機器到拿到,中間有幾個人」——答案大於零,就還不是動態平台。**

### 分層讓「誰該碰什麼」變成可以講理的事

三層模型對我最大的用處是組織上的:它給了「應用工程師該不該懂 infra」這個老戰場一個清楚的停火線——**應用團隊面對執行環境層的介面(部署描述檔、連線字串),平台團隊負責把下面兩層做成產品**。沒有這條線,要嘛人人都在寫 Terraform、各寫各的(變異爆炸,直接踩爛[[iac-principles|上一篇]]的最小化變異原則),要嘛全部丟給一個 infra 團隊開票處理(自助歸零)。分層不是官僚,是讓每一層可以獨立變更——這跟微服務切邊界是同一個道理,只是這次切的是基礎設施。

### 從原語學雲,是我面試時最常看的分水嶺

「運算、儲存、網路三原語」這個收斂,完全命中我看人的經驗:面試聊到雲,有人報得出一長串服務名字,但一問「這個服務底下是什麼、它跟另一家的對應物差在哪」就空了——因為他是從服務目錄學的,學的是型錄不是模型。反過來,原語紮實的人,丟一朵沒用過的雲給他,半天就能上手,因為 GCP 的 VPC 和 AWS 的 VPC 在原語層根本是同一件事。這也影響我帶新人的順序:先讓他把一台 VM、一顆磁碟、一段網路用 IaC 開出來再說,managed service 是之後的甜點——**地基的理解不可代管,能代管的只有地基的維運。**
