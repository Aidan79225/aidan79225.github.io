---
title: "Stack 與環境:staging 不該是另一份 code,是同一份的另一個 instance"
date: 2026-08-06
category: tech
description: "Stack 是基礎設施的變更單位:一起 plan、一起 apply、一起冒險的那包東西。環境問題的正解只有一種——一份定義、多個 instance,dev/staging/prod 的差異只留在參數檔;複製貼上會各自漂移,全裝在同一個 stack 則讓環境共用爆炸半徑。參數化也有甜蜜點:參數每多一個,測試矩陣就乘一次,config 長出 if/else 的那天,它就變成另一種程式語言。"
tags:
  - iac
  - devops
  - book-notes
series: "Infrastructure as Code 讀書筆記"
seriesOrder: 7
comments: true
draft: false
---
進入書的第二部分:stack。前面[[iac-small-pieces|講切割]]時一直在說「一個 stack」怎樣怎樣,這篇先把這個詞站穩,再處理它最日常的應用場景——**同一包基礎設施,要生出 dev、staging、prod 好幾份**。這件事幾乎每個團隊都在做,而且大多數是用錯的方式做的。

## Stack:基礎設施的變更單位

書給 stack 的定義很乾脆:**一組被當成同一個單位來定義、建立、變更的基礎設施資源**——用白話說,就是「一起 plan、一起 apply、一起冒險」的那包東西。Terraform 的一份 state、CloudFormation 的一個 stack、Pulumi 的一個 project,都是這個概念的實體。

三個常被混用的詞在這裡值得掰開:**repo** 是放 code 的地方、**module** 是可重用的程式庫、**stack** 是變更的單位——repo 裡可以有多個 stack,一個 stack 可以用很多 module,但「改了之後會一起上線的範圍」只由 stack 決定。[[iac-small-pieces|上一篇]]的爆炸半徑,量的就是 stack 的邊界。

## 環境問題:一份定義,多個 instance

需要多個環境時,直覺會走向兩條歧路,而正解是第三條:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 240" role="img" aria-label="三種做多環境的方式:複製貼上——每個環境一份 code,三份各自漂移;一包全裝——所有環境塞同一個 stack,共用爆炸半徑;可重用 stack——一份定義生出多個 instance,差異只在參數檔" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="stArr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="186" y1="12" x2="186" y2="228" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="4 4"/>
    <line x1="372" y1="12" x2="372" y2="228" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="4 4"/>
    <text x="93" y="28" fill="#e6e6e6" font-size="11.5" text-anchor="middle">複製貼上</text>
    <text x="279" y="28" fill="#e6e6e6" font-size="11.5" text-anchor="middle">一包全裝</text>
    <text x="465" y="28" fill="#e6e6e6" font-size="11.5" text-anchor="middle">可重用 stack</text>
    <rect x="14" y="46" width="50" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="39" y="64" fill="#9aa4b2" font-size="8.5" text-anchor="middle">code A</text>
    <rect x="68" y="46" width="50" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="93" y="64" fill="#9aa4b2" font-size="8.5" text-anchor="middle">code A'</text>
    <rect x="122" y="46" width="50" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="147" y="64" fill="#9aa4b2" font-size="8.5" text-anchor="middle">code A''</text>
    <line x1="39" y1="74" x2="39" y2="96" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#stArr)"/>
    <line x1="93" y1="74" x2="93" y2="96" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#stArr)"/>
    <line x1="147" y1="74" x2="147" y2="96" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#stArr)"/>
    <rect x="14" y="100" width="50" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="39" y="118" fill="#e6e6e6" font-size="8.5" text-anchor="middle">dev</text>
    <rect x="68" y="100" width="50" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="93" y="118" fill="#e6e6e6" font-size="8.5" text-anchor="middle">staging</text>
    <rect x="122" y="100" width="50" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="147" y="118" fill="#e6e6e6" font-size="8.5" text-anchor="middle">prod</text>
    <text x="93" y="196" fill="#9aa4b2" font-size="9" text-anchor="middle">✗ 三份 code 各自漂移</text>
    <text x="93" y="212" fill="#9aa4b2" font-size="9" text-anchor="middle">改三次,忘一次就失真</text>
    <rect x="224" y="46" width="110" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="279" y="64" fill="#9aa4b2" font-size="8.5" text-anchor="middle">一份 code</text>
    <line x1="279" y1="74" x2="279" y2="96" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#stArr)"/>
    <rect x="204" y="100" width="150" height="66" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4" stroke-dasharray="6 4"/>
    <text x="279" y="116" fill="#9aa4b2" font-size="8" text-anchor="middle">同一個 stack(同一份 state)</text>
    <rect x="214" y="126" width="42" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="235" y="144" fill="#e6e6e6" font-size="8.5" text-anchor="middle">dev</text>
    <rect x="262" y="126" width="42" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="283" y="144" fill="#e6e6e6" font-size="8.5" text-anchor="middle">stg</text>
    <rect x="310" y="126" width="42" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="331" y="144" fill="#e6e6e6" font-size="8.5" text-anchor="middle">prod</text>
    <text x="279" y="196" fill="#9aa4b2" font-size="9" text-anchor="middle">✗ 環境共用爆炸半徑</text>
    <text x="279" y="212" fill="#9aa4b2" font-size="9" text-anchor="middle">改 dev 的失誤可能炸到 prod</text>
    <rect x="410" y="46" width="110" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="465" y="64" fill="#e6e6e6" font-size="8.5" text-anchor="middle">一份定義</text>
    <line x1="435" y1="74" x2="418" y2="112" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#stArr)"/>
    <line x1="465" y1="74" x2="465" y2="112" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#stArr)"/>
    <line x1="495" y1="74" x2="512" y2="112" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#stArr)"/>
    <rect x="392" y="116" width="50" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="417" y="134" fill="#e6e6e6" font-size="8.5" text-anchor="middle">dev</text>
    <rect x="446" y="116" width="50" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="471" y="134" fill="#e6e6e6" font-size="8.5" text-anchor="middle">staging</text>
    <rect x="500" y="116" width="50" height="28" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="525" y="134" fill="#e6e6e6" font-size="8.5" text-anchor="middle">prod</text>
    <text x="465" y="164" fill="#4f6df5" font-size="8.5" text-anchor="middle">各自的 state,差異只在參數檔</text>
    <text x="465" y="196" fill="#e6e6e6" font-size="9" text-anchor="middle">✓ 測過的那份定義</text>
    <text x="465" y="212" fill="#e6e6e6" font-size="9" text-anchor="middle">就是上線的那份</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左、中是兩條歧路:複製貼上讓環境各自演化成不同的東西;全裝一包讓「改測試環境」揹著正式環境的風險。正解是右邊:環境=同一份定義的不同 instance</figcaption>
</figure>

- **複製貼上環境**:每個環境一個資料夾、一份 code,「反正只是先複製一下」。三個月後三份各長各的——修 bug 要改三次,總有一次忘掉,於是 staging 驗證的再度不是 prod 會跑的東西([[iac-test-deliver|上一篇]]的環境失真,根源常常就在這)。
- **一包全裝**:dev、staging、prod 全定義在同一個 stack、同一份 state。看似 DRY,實際上是把[[iac-small-pieces|爆炸半徑]]橫跨到環境之間——你只想動 dev,但 plan 掃過 prod 的資源,一個 drift、一個手滑,炸的就是正式環境。環境隔離的意義被 state 一鍋端掉了。
- **可重用 stack(正解)**:一份定義,per 環境各起一個 instance、各持一份 state,環境差異全部收進小小的參數檔。這才同時拿到兩個世界:定義同源(staging 驗的就是 prod 要跑的),風險隔離(每個 instance 自己的爆炸半徑)。

順帶把一個常見誤會打掉:**環境不是 git branch**。用 branch 區分環境,本質上就是複製貼上的變形——merge 漏了就是漂移,而且你永遠說不清楚 prod branch 上「多出來的那幾個 commit」是什麼。環境差異屬於參數,不屬於版本歷史。

## 參數化的甜蜜點:參數是介面,不是垃圾抽屜

一份定義伺候多個環境,靠的是參數——而參數的紀律,決定這個模式撐不撐得久:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 158" role="img" aria-label="參數化光譜:左端全寫死,改東西要改多份 code;中間少量參數是甜蜜點——名字、規模、少數旗標;右端過度參數化,config 長出 if/else,變成另一種程式語言" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="30" y="40" width="160" height="46" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="110" y="59" fill="#e6e6e6" font-size="11" text-anchor="middle">全寫死</text>
    <text x="110" y="75" fill="#9aa4b2" font-size="9" text-anchor="middle">只好每個環境複製一份</text>
    <rect x="205" y="40" width="150" height="46" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="280" y="59" fill="#e6e6e6" font-size="11" text-anchor="middle">少量參數</text>
    <text x="280" y="75" fill="#9aa4b2" font-size="9" text-anchor="middle">名字、規模、少數旗標</text>
    <rect x="370" y="40" width="160" height="46" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="5 4"/>
    <text x="450" y="59" fill="#e6e6e6" font-size="11" text-anchor="middle">過度參數化</text>
    <text x="450" y="75" fill="#9aa4b2" font-size="9" text-anchor="middle">config 長出 if/else</text>
    <text x="280" y="26" fill="#4f6df5" font-size="9.5" text-anchor="middle">甜蜜點</text>
    <text x="110" y="112" fill="#9aa4b2" font-size="9.5" text-anchor="middle">回到複製貼上的漂移</text>
    <text x="280" y="112" fill="#e6e6e6" font-size="9.5" text-anchor="middle">環境差異一眼看得完</text>
    <text x="450" y="112" fill="#9aa4b2" font-size="9.5" text-anchor="middle">變成另一種程式語言</text>
    <text x="280" y="142" fill="#9aa4b2" font-size="9.5" text-anchor="middle">參數每多一個,要測的組合就乘一次</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">參數化跟宣告式語言一樣有混種地帶:當參數檔開始控制「邏輯走哪條路」而不只是「值是多少」,你就是在用 config 寫程式了</figcaption>
</figure>

書裡給的參數傳遞手段從命令列、環境變數、per 環境參數檔到 parameter registry 都有,但工具選擇是小事,**紀律才是大事**:環境之間的差異應該小到「一個參數檔一眼看得完」——名字前綴、機器規格、instance 數量、少數功能旗標,就這樣。一旦定義裡出現 `if env == "prod"` 這種分岔,警鈴就該響:dev 和 prod 走的已經是不同的邏輯路徑,「測過的就是上線的」再次被打破——這正是[[iac-everything-as-code|宣告式混種地帶]]的參數版。

## 反思

### 我判斷環境健康的一行指令:diff 兩個環境的參數檔

這章給了我一個很省事的健檢法:**把 dev 和 prod 的差異攤開來,應該只剩兩個小參數檔的 diff**。做得到,代表定義同源、環境只是 instance;做不到——要 diff 整個資料夾、要人腦記得「prod 還有改過哪些」——就是已經在複製貼上的路上了。這個檢查殘酷的地方在於它沒有中間地帶:同源就是同源,「大部分一樣」在驗證的意義上等於不一樣,因為你不知道剩下那部分藏著什麼。

### 便宜環境是可重用 stack 送的紅利,而且比想像中值錢

一份定義能生任意多個 instance 之後,「環境」突然變得便宜:每個 feature branch 起一套完整環境跑測試、用完銷毀;要重現三個月前的事故,起一個當時版本的 instance 慢慢驗。這在複製貼上的世界裡想都不敢想——多一個環境就多一份要維護的 code。回頭看,這其實是[[iac-principles|可拋棄原則]]的環境級版本:環境從「稀缺的、要排隊共用的資產」變成「用完就丟的消耗品」,而搶 staging 排隊這件事,消耗的團隊時間遠比大家願意承認的多。

### 參數的准入審查:說得出「哪兩個 instance 要不同值」才准進

參數會自然增生——每次有人想留個彈性,就多一個參數,「以防之後要改」。但參數是這份 stack 的公開介面:多一個參數,使用它的人就多一個要理解的概念,測試要覆蓋的組合就乘一次,而「以防萬一」的參數十個有九個從來沒被改過第二個值。所以我現在對新參數只問一個問題:**現在、具體地,哪兩個 instance 需要不同的值?** 答不出來就寫死,等真的需要再開——這跟 API 設計「先窄後寬好過先寬後窄」是同一個判斷:收回一個參數是 breaking change,加一個永遠來得及。
