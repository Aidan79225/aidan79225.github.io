---
title: "Jenkins 是什麼:CI 不是「有跑測試」,是「頻繁合回主幹」"
date: 2026-08-22
updated: 2026-08-23
category: tech
description: "很多團隊裝了 Jenkins、每次 push 都跑測試、儀表板一片綠,然後理直氣壯地說「我們有做 CI」。但 CI 的 I 是 Integration——它問的不是你有沒有跑測試,而是你多久把程式碼合回主幹一次。這篇把 CI / Continuous Delivery / Continuous Deployment 三個被混用的詞掰開,說明 Jenkins 在這條路上站的位置(controller 調度、agent 幹活),並用一個最小的 Jenkinsfile 帶出整個系列的紀律:能寫成程式碼的就寫成程式碼、進 git。"
tags:
  - jenkins
  - ci-cd
  - concept
series: "Jenkins 學習筆記"
seriesOrder: 1
comments: true
draft: false
---
大部分人第一次碰 Jenkins,情境都差不多:公司有一台跑很久的 Jenkins,你要在上面「加一個 job」。點進去、複製隔壁專案的設定、改幾個欄位、按存檔——會動了,收工。這樣用了兩年,你會很熟練,但你對 CI 的理解可能還是零。

因為 CI 從來不是一台伺服器,而是一種**團隊怎麼合併程式碼的紀律**。這個系列的第一篇,我想先把幾個天天被混用的詞掰乾淨,再回頭看 Jenkins 到底站在哪個位置。

## 先把三個詞掰開:CI / Continuous Delivery / Continuous Deployment

這三個詞常被縮寫成一句「CI/CD」帶過,但它們是三段不同長度的路——差別在**這條路自動化到哪裡為止**,以及**最後那顆按鈕是人按還是機器按**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 625 250" role="img" aria-label="CI 與 CD 的範圍對照。一條由左到右的路:提交程式碼、自動建置與測試、打包成可部署的產物、部署到測試環境驗收、上到 Production。持續整合 CI 涵蓋提交到建置測試;持續交付 Continuous Delivery 再往右涵蓋到打包與驗收,產物隨時可上線,但最後上 Production 由人按下按鈕;持續部署 Continuous Deployment 涵蓋到底,通過所有關卡就自動上 Production,沒有人工按鈕。三者的差別是自動化到哪裡為止,以及最後那顆按鈕是人按還是機器按。" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="ci1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="312" y="18" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">同一條路,三個名字——差別只在自動化走到哪裡</text>
    <rect x="14" y="32" width="104" height="46" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="66" y="52" fill="#e6e6e6" font-size="10" text-anchor="middle">① 提交程式碼</text><text x="66" y="68" fill="#9aa4b2" font-size="8.2" text-anchor="middle">push / open PR</text>
    <rect x="136" y="32" width="104" height="46" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="188" y="52" fill="#e6e6e6" font-size="10" text-anchor="middle">② 建置 + 測試</text><text x="188" y="68" fill="#9aa4b2" font-size="8.2" text-anchor="middle">自動、每次都跑</text>
    <rect x="258" y="32" width="104" height="46" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="310" y="52" fill="#e6e6e6" font-size="10" text-anchor="middle">③ 打包產物</text><text x="310" y="68" fill="#9aa4b2" font-size="8.2" text-anchor="middle">一顆可部署的東西</text>
    <rect x="380" y="32" width="104" height="46" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="432" y="52" fill="#e6e6e6" font-size="10" text-anchor="middle">④ 測試環境驗收</text><text x="432" y="68" fill="#9aa4b2" font-size="8.2" text-anchor="middle">隨時可上線的狀態</text>
    <rect x="502" y="32" width="108" height="46" rx="7" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.6"/><text x="556" y="52" fill="#e6e6e6" font-size="10" text-anchor="middle">⑤ 上 Production</text><text x="556" y="68" fill="#d6a45c" font-size="8.2" text-anchor="middle">誰按下這一步?</text>
    <line x1="118" y1="55" x2="134" y2="55" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ci1)"/>
    <line x1="240" y1="55" x2="256" y2="55" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ci1)"/>
    <line x1="362" y1="55" x2="378" y2="55" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ci1)"/>
    <line x1="484" y1="55" x2="500" y2="55" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ci1)"/>
    <rect x="14" y="100" width="226" height="26" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="127" y="117" fill="#4f6df5" font-size="9.5" text-anchor="middle" font-weight="bold">CI(持續整合)</text>
    <text x="252" y="117" fill="#9aa4b2" font-size="8.4" text-anchor="start">合回主幹 + 每次都自動驗證</text>
    <rect x="14" y="134" width="470" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="249" y="151" fill="#54b890" font-size="9.5" text-anchor="middle" font-weight="bold">Continuous Delivery(持續交付)</text>
    <text x="496" y="151" fill="#9aa4b2" font-size="8.4" text-anchor="start">隨時可上線,但人按</text>
    <rect x="14" y="168" width="596" height="26" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.3"/><text x="312" y="185" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">Continuous Deployment(持續部署)——過關就自動上,沒有那顆按鈕</text>
    <text x="312" y="216" fill="#e6e6e6" font-size="9.2" text-anchor="middle">兩個 CD 的差別不是技術,是<tspan fill="#d6a45c" font-weight="bold">你敢不敢把那顆按鈕拿掉</tspan></text>
    <text x="312" y="234" fill="#9aa4b2" font-size="8.6" text-anchor="middle">敢不敢,取決於前面幾關擋得住多少——這也是為什麼品質關卡與回滾是後面幾篇的重點</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">大多數團隊真正需要、也真正做得到的是<b>持續交付</b>:讓「隨時可上線」變成常態,上不上線變成商業決策,而不是技術能不能。持續部署把最後那顆按鈕也拿掉,它不是更高級的技術,而是對前面所有關卡的信任投票</figcaption>
</figure>

我看過太多團隊在會議上爭論「我們要不要做 CD」,但講的其實是兩件不同的事:一邊在說「產物要隨時能上」,另一邊在說「不用人審就自動上」。**這兩件事的難度差一個數量級**,先講清楚是在講哪一個,討論才會有結論。

## CI 的真義:不是「有跑測試」,是「頻繁合回主幹」

回到最前面那一段。**CI 的 I 是 Integration(整合),不是 Inspection(檢查)。** 它原本要解決的痛,是每個人抱著自己那份改動離主幹越來越遠,最後在合併那天一次爆炸。跑測試只是為了讓「頻繁合回」這件事變安全的**手段**,不是 CI 本身。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 250" role="img" aria-label="長命分支與頻繁合回主幹的對照。左邊:一條分支拉出去三週才合回,合併點是一次巨大的整合,四十幾個檔案同時進來,衝突要一次解完,測試紅了不知道是哪一段造成的,想退回就得退掉三週的工作。右邊:同樣三週,但每天合回主幹一次,每次的差異都很小,紅燈馬上知道是剛才那一小段造成的,回滾一次只退掉一小塊。結論:整合的痛苦跟距離成正比,批次越小越好退。" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="ci2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="310" y1="20" x2="310" y2="212" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="20" fill="#e0733a" font-size="10.5" text-anchor="middle" font-weight="bold">長命分支:三週後一次合回</text>
    <line x1="24" y1="58" x2="276" y2="58" stroke="#9aa4b2" stroke-width="1.6" marker-end="url(#ci2)"/>
    <text x="18" y="52" fill="#9aa4b2" font-size="8" text-anchor="start">main</text>
    <path d="M60,58 L76,104 L240,104 L262,60" fill="none" stroke="#e0733a" stroke-width="1.6"/>
    <text x="152" y="118" fill="#e0733a" font-size="8.4" text-anchor="middle">feature branch 一路長大(3 週)</text>
    <circle cx="264" cy="58" r="9" fill="#3a2626" stroke="#e0733a" stroke-width="1.8"/><text x="264" y="61" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">!</text>
    <text x="150" y="146" fill="#e6e6e6" font-size="8.8" text-anchor="middle">一次進來 40+ 個檔案</text>
    <text x="150" y="162" fill="#9aa4b2" font-size="8.4" text-anchor="middle">衝突一次解完 · 解到懷疑人生</text>
    <text x="150" y="178" fill="#9aa4b2" font-size="8.4" text-anchor="middle">紅燈了,但不知道是哪一段造成的</text>
    <text x="150" y="194" fill="#e0733a" font-size="8.6" text-anchor="middle" font-weight="bold">想退?要退掉三週的工作</text>
    <text x="466" y="20" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">頻繁合回:每天一次小合併</text>
    <line x1="340" y1="58" x2="596" y2="58" stroke="#9aa4b2" stroke-width="1.6" marker-end="url(#ci2)"/>
    <text x="334" y="52" fill="#9aa4b2" font-size="8" text-anchor="start">main</text>
    <path d="M360,58 L368,86 L396,86 L404,58" fill="none" stroke="#54b890" stroke-width="1.5"/>
    <path d="M412,58 L420,86 L448,86 L456,58" fill="none" stroke="#54b890" stroke-width="1.5"/>
    <path d="M464,58 L472,86 L500,86 L508,58" fill="none" stroke="#54b890" stroke-width="1.5"/>
    <path d="M516,58 L524,86 L552,86 L560,58" fill="none" stroke="#54b890" stroke-width="1.5"/>
    <circle cx="404" cy="58" r="4.5" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <circle cx="456" cy="58" r="4.5" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <circle cx="508" cy="58" r="4.5" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <circle cx="560" cy="58" r="4.5" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="466" y="106" fill="#54b890" font-size="8.4" text-anchor="middle">每條分支活 1~2 天就回家</text>
    <text x="466" y="146" fill="#e6e6e6" font-size="8.8" text-anchor="middle">每次只進來 3~5 個檔案</text>
    <text x="466" y="162" fill="#9aa4b2" font-size="8.4" text-anchor="middle">衝突小到當下就解掉</text>
    <text x="466" y="178" fill="#9aa4b2" font-size="8.4" text-anchor="middle">紅燈=剛才那一小段,五分鐘定位</text>
    <text x="466" y="194" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">想退?退掉一小塊就好</text>
    <text x="310" y="222" fill="#d6a45c" font-size="9.6" text-anchor="middle" font-weight="bold">整合的痛苦,跟「距離」成正比</text>
    <text x="310" y="240" fill="#9aa4b2" font-size="8.8" text-anchor="middle">同樣是三週的工作量,分成 15 次進來跟一次進來,是兩個世界——CI 買的就是這個</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左右兩邊的<b>總工作量一模一樣</b>,差別只在切成幾次進主幹。左邊那顆合併點是整個團隊都在怕的那一天;右邊沒有那一天,因為它被拆成十五個沒人記得的小事件。裝了 Jenkins 但分支照樣活三週,那台 Jenkins 只是在幫你更早知道「等等會很痛」而已</figcaption>
</figure>

所以要判斷一個團隊有沒有在做 CI,我從來不看它有沒有 Jenkins,只問一句:**你們的分支平均活多久?** 超過兩三天,那就不是 CI,是「有一台會跑測試的伺服器」——測試跑得再勤,合併地獄一天都不會少。

這也是這個系列主軸的第一課:**批次越小,越好退。** Google SRE 講發布工程時說的「高頻率、小步發」([[sre-automation-release|自動化與發布工程]]),講的是同一件事的另一端——這裡是合併的批次,那裡是上線的批次。一次合回 3 個檔案,出事時 `git revert` 一下就乾淨了;一次合回 40 個檔案,你連要退哪一段都要開會討論。可回滾不是等到部署那一刻才要想的事,它從你決定分支要活多久的那一刻就決定了。

## 但「能不能合」,常常不是工程師能決定的

上面那個判準有個地方我要先講清楚,不然它讀起來會很不公平:**分支活很久,往往不是工程師拖,是這個功能還不能被看到。** 行銷檔期還沒到、合約還沒簽、要跟合作夥伴同時上線——這些都是商業決策,不是誰不想合。

但這正好戳中 CI 最關鍵、也最常被誤解的一件事:**合併(merge)不等於發布(release)。** CI 要求的是「程式碼回到主幹」,從來沒有要求「功能對使用者可見」。一個團隊之所以會覺得「還不能合」,通常是因為它把這兩件事綁成同一件——**主幹上有的東西,使用者就看得到。** 一旦這條線鬆開,「什麼時候合」是工程決定,「什麼時候給誰看」是商業決定,兩邊各自最佳化,誰也不用等誰。

鬆開的手段有一整條階梯,由便宜到貴:

| 手段 | 適用 | 代價 |
|---|---|---|
| **不接線** | 新的類別、新的 API、新的頁面——合進去但不掛上路由/選單,使用者根本走不到 | 幾乎零 |
| **Branch by abstraction** | 要換掉既有實作:先合介面與新實作,舊的照常跑,最後才切換 | 多一層抽象,切換完要記得拆 |
| **Feature flag** | 真的要在執行期決定給誰看(灰度、A/B、按客戶開關) | 最貴——見下面 |

我的經驗是,**大部分「還不能合」其實只要不接線就解決了**。真正需要完整旗標系統的,是那種要在執行期分流的功能;把每個未完成的功能都塞進 flag,是在用最貴的工具解最便宜的問題。

### Feature flag 確實會讓程式碼變髒,這點沒有必要粉飾

而且不是一點點:每個 flag 是一個 if,n 個 flag 名目上就有 2ⁿ 種路徑組合;測試矩陣跟著膨脹;最糟的是**死掉的 flag 永遠沒人敢刪**——那個功能早就全量上線兩年了,但沒人確定關掉那條 else 會不會壞。我看過旗標系統本身變成一個沒人維護的隱藏設定管理系統,那確實比長命分支還糟。

所以這件事該誠實地說成:**這是拿一種債換另一種債。** 但兩種債的形狀完全不一樣——而這才是我認為換得過的理由:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 246" role="img" aria-label="合併債與旗標債的形狀對照。左邊合併債:隨著分支存活時間拉長,成本以指數方式上升,而且這條曲線是看不見的,它躺在別人的分支裡,爆發的時間點由合併那天決定,爆的時候還很難分辨是誰造成的。右邊旗標債:成本是線性累積的鋸齒狀,每次定期清理就掉回去,因為它就寫在程式碼裡可以被 grep、可以列清單、每個旗標有擁有者與到期日,所以是有界的。底部結論:用一種看得見、有邊界的債,去換一種看不見、沒有邊界的債,通常划算,但前提是你真的會還——不清理旗標的團隊,最後兩種債都會有。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <line x1="40" y1="196" x2="290" y2="196" stroke="#3a4154" stroke-width="1.2"/><line x1="40" y1="196" x2="40" y2="40" stroke="#3a4154" stroke-width="1.2"/>
    <text x="165" y="24" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">合併債:指數、看不見</text>
    <path d="M50,190 C130,186 195,176 258,52" fill="none" stroke="#e0733a" stroke-width="2"/>
    <text x="165" y="212" fill="#9aa4b2" font-size="8" text-anchor="middle">分支存活時間 →</text>
    <text x="26" y="120" fill="#9aa4b2" font-size="8" text-anchor="middle" transform="rotate(-90 26 120)">成本 →</text>
    <text x="150" y="70" fill="#9aa4b2" font-size="7.8" text-anchor="start">· 躺在別人的分支裡,看不到</text>
    <text x="150" y="86" fill="#9aa4b2" font-size="7.8" text-anchor="start">· 爆發點由「合併那天」決定</text>
    <text x="150" y="102" fill="#9aa4b2" font-size="7.8" text-anchor="start">· 爆了也難分辨是誰造成的</text>
    <text x="150" y="118" fill="#e0733a" font-size="7.8" text-anchor="start">· 沒有上限:拖越久越貴</text>
    <line x1="310" y1="16" x2="310" y2="206" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="350" y1="196" x2="600" y2="196" stroke="#3a4154" stroke-width="1.2"/><line x1="350" y1="196" x2="350" y2="40" stroke="#3a4154" stroke-width="1.2"/>
    <text x="475" y="24" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">旗標債:線性、看得見</text>
    <path d="M358,190 L404,166 L404,182 L450,158 L450,174 L496,150 L496,166 L560,142" fill="none" stroke="#54b890" stroke-width="2"/>
    <text x="475" y="212" fill="#9aa4b2" font-size="8" text-anchor="middle">時間 →(往下的每一格 = 一次清理)</text>
    <text x="368" y="70" fill="#9aa4b2" font-size="7.8" text-anchor="start">· 就寫在程式碼裡,grep 得到</text>
    <text x="368" y="86" fill="#9aa4b2" font-size="7.8" text-anchor="start">· 可以列清單、排進 sprint 清</text>
    <text x="368" y="102" fill="#9aa4b2" font-size="7.8" text-anchor="start">· 每個旗標有擁有者與到期日</text>
    <text x="368" y="118" fill="#54b890" font-size="7.8" text-anchor="start">· 有上限:清得掉就壓得住</text>
    <text x="310" y="232" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">用「看得見、有邊界」的債,換「看不見、沒邊界」的債</text>
    <text x="310" y="244" fill="#9aa4b2" font-size="8.4" text-anchor="middle">但前提是你真的會還——不清旗標的團隊,最後會兩種債都有</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">重點不是「旗標比較乾淨」——它不乾淨。重點是<b>旗標債攤在陽光下、可以被管理</b>:能 grep、能列表、能指派負責人、能設到期日。合併債則相反:它在合併那天才報到,而且金額由你拖了多久決定。前者是可以編列預算的成本,後者是不定時炸彈</figcaption>
</figure>

所以我對 feature flag 的立場是有條件的:**要用,就要連清理紀律一起買。** 具體是三條——每個 flag 上線時就寫下擁有者與預計移除時間;flag 只做「開關」不做「業務邏輯的分岔點」(不然它會長成第二套程式碼);定期盤點,超過期限的 flag 要嘛清掉、要嘛重新說明為什麼還在。做不到這三條的團隊,我不會建議它為了追求 trunk-based 而大量導入 flag——那真的會換來更糟的東西。

### 判準是拿來指向系統的,不是指向工程師

最後回到公平性。「分支平均活多久」這個判準,我從來不是拿來評價工程師努不努力——**它評價的是這個組織有沒有把「合併」與「發布」解開。** 如果答案是分支活三週、而原因是商業檔期,那結論不是「這些工程師沒在做 CI」,是「**這個組織還沒有 CI,而那是組織層級的題目**」。

這個區分很重要,因為它決定你要去說服誰。跟工程師講「你們要勤合併」沒有用,他們知道;真正要談的是跟產品與商業那一側達成一個共識:**程式碼進主幹不代表功能上線**,我們用不接線、抽象層或旗標把「看得到」這件事單獨控制,換來的是整合風險大幅下降、上線時間反而更可預測。這個對話,是我認為 tech lead 最該去打的一場——它比任何 CI 工具的導入都值錢。

## 那 Jenkins 到底是什麼

把上面那條路攤開之後,Jenkins 的定位其實很單純:**它是一台「在某件事發生時,在某台機器上,照著一份腳本做事,並且把結果留下來」的伺服器。** 就這樣。所有花俏的外掛都是這句話的延伸。

它的內部只有兩種角色——這是後面每一篇都會用到的地基:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 236" role="img" aria-label="Jenkins 的 controller 與 agent 架構。左邊 Git 儲存庫透過 webhook 通知 Jenkins controller。Controller 負責讀取 repo 裡的 Jenkinsfile、排隊、依照 label 派工、保存每次建置的紀錄與產物,但它本身不執行建置。右邊三台 agent 各自帶著 label:linux 的常駐機、macOS 的實體機、以及 Kubernetes 上用完即丟的 pod。工作要去哪一台,由 Jenkinsfile 裡宣告的 label 決定。下方註記:controller 只調度不建置,在 controller 上跑建置的 Jenkins 遲早會倒。" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="ci3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="12" y="72" width="96" height="52" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/><text x="60" y="94" fill="#e6e6e6" font-size="10" text-anchor="middle">Git 儲存庫</text><text x="60" y="110" fill="#9aa4b2" font-size="8.2" text-anchor="middle">含 Jenkinsfile</text>
    <line x1="108" y1="98" x2="176" y2="98" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ci3)"/><text x="142" y="90" fill="#9aa4b2" font-size="8" text-anchor="middle">webhook</text>
    <rect x="178" y="56" width="152" height="86" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.9"/><text x="254" y="78" fill="#4f6df5" font-size="11.5" text-anchor="middle" font-weight="bold">Controller</text><text x="254" y="96" fill="#9aa4b2" font-size="8.3" text-anchor="middle">讀 Jenkinsfile · 排隊</text><text x="254" y="111" fill="#9aa4b2" font-size="8.3" text-anchor="middle">依 label 派工</text><text x="254" y="126" fill="#9aa4b2" font-size="8.3" text-anchor="middle">留下紀錄與產物</text>
    <line x1="330" y1="80" x2="396" y2="52" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ci3)"/>
    <line x1="330" y1="99" x2="396" y2="99" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ci3)"/>
    <line x1="330" y1="118" x2="396" y2="146" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ci3)"/>
    <rect x="398" y="28" width="208" height="42" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="414" y="47" fill="#e6e6e6" font-size="9.4" text-anchor="start">Agent · 常駐 Linux 機</text><text x="592" y="47" fill="#54b890" font-size="8.4" text-anchor="end">label: linux</text><text x="414" y="61" fill="#9aa4b2" font-size="8" text-anchor="start">一般 build / test 都在這</text>
    <rect x="398" y="78" width="208" height="42" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="414" y="97" fill="#e6e6e6" font-size="9.4" text-anchor="start">Agent · macOS 實體機</text><text x="592" y="97" fill="#9aa4b2" font-size="8.4" text-anchor="end">label: mac</text><text x="414" y="111" fill="#9aa4b2" font-size="8" text-anchor="start">只有它能簽 iOS app</text>
    <rect x="398" y="128" width="208" height="42" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="414" y="147" fill="#e6e6e6" font-size="9.4" text-anchor="start">Agent · K8s Pod</text><text x="592" y="147" fill="#4f6df5" font-size="8.4" text-anchor="end">用完即丟</text><text x="414" y="161" fill="#9aa4b2" font-size="8" text-anchor="start">每次 build 開一顆新的</text>
    <text x="310" y="196" fill="#e0733a" font-size="9.4" text-anchor="middle" font-weight="bold">Controller 只調度、不建置</text>
    <text x="310" y="212" fill="#9aa4b2" font-size="8.6" text-anchor="middle">把 build 塞在 controller 上跑的 Jenkins,遲早會被自己的工作壓垮——它一倒,全公司不能上線</text>
    <text x="310" y="230" fill="#9aa4b2" font-size="8.6" text-anchor="middle">工作去哪一台,不是誰在 UI 上挑的,是 Jenkinsfile 裡宣告的 label 決定的</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Controller 是大腦(排隊、派工、保存紀錄),agent 是手腳(真正跑 build 的地方)。這個「調度與執行分離」的模型不是 Jenkins 獨有的——GitHub Actions 的 runner、GitLab 的 executor 都是同一件事換個名字,學會這裡,換工具只是換語法</figcaption>
</figure>

Jenkins 的三個特徵,順著看就是它的優點,反過來看就是它的代價:

| 特徵 | 好處 | 代價 |
|---|---|---|
| **自架** | 機器、網路、資料都在自己手上;地端、內網、有合規要求的環境進得去 | 它變成一個你要備份、要升級、要顧權限的正式服務(這個系列後面會專門講怎麼養它) |
| **外掛生態** | 幾乎什麼都能接——舊的、冷門的、自家的系統都有辦法 | 什麼都能接=什麼都要自己維護;外掛版本互卡是 Jenkins 最著名的痛 |
| **Jenkinsfile** | 整條 pipeline 是程式碼,跟專案一起版控 | 得先學會把流程寫成程式碼,而不是在 UI 上點 |

第三點是這個系列真正的核心,而且它在 Jenkins 上是**選配**——你完全可以不寫 Jenkinsfile,一輩子在 UI 上點 Freestyle job。這也是為什麼下一篇要專門講:同樣一件事,寫成程式碼跟點在 UI 上,差的到底是什麼。

## 一個最小的 Jenkinsfile

先看它長什麼樣。這是一份能跑的完整 pipeline,放在 **repo 根目錄**,檔名就叫 `Jenkinsfile`:

```groovy
// Jenkinsfile —— 放在 repo 根目錄,跟程式碼一起 commit、一起 review
pipeline {
  agent { label 'linux' }          // 這份工作要在帶 linux 標籤的 agent 上跑

  stages {
    stage('Build') {
      steps { sh './gradlew clean assemble' }
    }
    stage('Test') {
      steps { sh './gradlew test' }
    }
  }

  post {
    always  { junit 'build/test-results/**/*.xml' }   // 不管成敗都收測試報告
    failure { echo '這次 build 紅了,先修再說' }
  }
}
```

語法後面會慢慢講,這裡只要看懂三件事:`agent` 決定**在哪跑**、`stages` 是**做什麼**、`post` 是**收尾**。

但這篇真正想讓你記住的,不是語法,是**這個檔案躺在 repo 根目錄**這件事本身。它跟你的程式碼:

- 走同一個 commit——這版程式碼是怎麼 build 的,`git log` 查得到;
- 走同一個 PR、同一次 review——改建置流程要有人看過,不是誰摸進 UI 改一改;
- 走同一次 `git revert`——流程改壞了,回滾它跟回滾程式碼是同一個動作。

這就是整個系列不打折的紀律:**這條路上凡是能寫成程式碼的,就寫成程式碼、進 git。** 從這份 Jenkinsfile,到共用函式庫,到最後連 Jenkins 自己的設定(JCasC)都是。

## 為什麼 2026 年還學 Jenkins

老實說,如果今天開一個全新的專案、程式碼放在 GitHub 上、也沒有奇怪的合規要求,我不會選 Jenkins——GitHub Actions 省掉的維運成本太可觀了。但我還是認為值得學它,有兩個理由——這跟 [[iac-intro|IaC]] 那條線的道理一樣:工具會換,但「把知識從人腦搬進版本控制」這個模型不會過期。

**第一,它還在那裡。** 地端機房、金融與醫療的內網、十幾年的舊系統、需要特殊硬體(iOS 簽章機、燒錄板子)的建置——這些地方 SaaS CI 進不去,而 Jenkins 進得去。接手一個有歷史的團隊,遇到 Jenkins 的機率高得驚人。

**第二,它是共同祖先。** Jenkins 的每個概念在別家都有對應:

| Jenkins | GitHub Actions | GitLab CI |
|---|---|---|
| Controller / Agent | (託管的)Runner | Runner / Executor |
| Jenkinsfile | `.github/workflows/*.yml` | `.gitlab-ci.yml` |
| Workspace | Workspace | Job 的工作目錄 |
| Credentials | Secrets | CI/CD Variables(masked) |
| Shared Library | Reusable workflow / composite action | `include:` + template |

**把 Jenkins 學透,換工具只是換語法。** 反過來只會 GitHub Actions 的人,碰到 agent 排隊、workspace 髒掉、憑證外洩這些問題時,常常不知道自己在面對什麼——因為那些細節被託管環境藏起來了。系列最後一篇我會誠實談什麼時候該搬走,但那是讀完之後的判斷,不是一開始的偏見。

## 這個系列想回答的問題

貫穿後面十三篇的,其實只有一句話:**一次提交,要能被信任地送上線。** 而「可信」不是感覺,是三個可以逐項檢查的性質——

- **可重現**:同樣的輸入,今天跑、半年後跑、在誰的機器上跑,結果都一樣;
- **可審查**:這條路上的每一步,都攤在別人看得到、改得動、能 review 的地方;
- **可回滾**:出事時退回去,跟送上去一樣快、一樣有把握。

而「pipeline 是程式碼、要進版控」之所以是全系列的預設立場,是因為它**一次服務這三項**:進了 git,就同時買到能 review、能追溯、能 `git revert`。這也是為什麼這篇的重點不是 Jenkins 有幾個外掛,而是那份躺在 repo 根目錄的檔案。

## 反思

### 我判斷一個團隊有沒有 CI,不看工具,只看分支活多久

早年我也覺得「CI = 有一台會跑測試的機器」。真正打醒我的是一次接手:團隊有 Jenkins、每次 push 都跑測試、儀表板一片綠,但每個人的 feature branch 都活兩三週。結果就是每個月都有一天叫「合併日」,那天所有人什麼事都做不了,只能解衝突;合併完的第一週線上一定出事,而且沒人查得出是誰的哪一段改的——因為那次合併有四十幾個檔案,是五個人三週的工作黏在一起。

那台 Jenkins 從頭到尾都在正常運作。它每天忠實地告訴大家「你的分支還是綠的」,而那個綠燈完全沒有意義,因為它驗的是一個**跟主幹已經差很遠的世界**。

所以現在我的第一個問題永遠是:**你們的分支平均活多久?** 這一題比「你們用什麼 CI 工具」有資訊量太多。工具兩週就能導入,把分支從三週壓到兩天,那是要動到拆任務方式、review 習慣、以及「合併與發布要不要解耦」的事——那才是真正的 CI。

但我也學會問第二題:**如果分支活很久,是誰決定的?** 如果答案是「功能還不能被看到」,那要修的不是工程師的習慣,而是前面講的那條線——先讓程式碼進得了主幹,再用不接線或旗標決定誰看得到。把這兩題分開問,對話才會落在真正的問題上,而不是變成一場檢討大會。

### 綠燈的價值,是靠「紅燈時停下來」養出來的

第二個常見的自欺,是 pipeline 紅了大家第一反應是「重跑一次看看」。我很堅持一條線:**retry 用在網路,不用在測試。** 網路抖動、拉套件逾時,重跑合理;測試紅了就重跑,那是在教全隊「紅燈是雜訊」。

一旦紅燈變成雜訊,這條 pipeline 就死了——它還在跑、還在花錢、還在浪費每個人等待的時間,但沒有人會因為它變紅而停下手邊的事。那時候你擁有的不是 CI,是一個很貴的螢幕保護程式。

我帶團隊的作法很簡單粗暴:**main 紅了,全隊停下來先修好,不准往上疊新的 commit。** 一開始大家覺得誇張,但實際上一個月只會發生兩三次,而且每次十幾分鐘就解決——因為批次夠小,問題就在剛才那一小段裡。真正貴的從來不是「停下來修」,是讓紅燈一直紅著,然後某天有人在紅著的主幹上又疊了三天的工作。

### 先問「這條路可不可信」,再問「要不要更自動」

最後一個心得偏管理面。很多團隊想跳過持續交付,直接談持續部署——「我們要做到 push 完就自動上線」。我通常會先潑一盆冷水:**你敢把那顆按鈕拿掉,是因為你信任前面幾關;而信任是要有證據的。**

我的順序一直是:先讓「隨時可上線」變成事實(產物可重現、關卡擋得住、回滾演練過),再來討論要不要拿掉那顆人工按鈕。倒過來做的團隊,最後不是回頭把按鈕加回去,就是在某次事故之後乾脆把整套自動部署關掉——那比一開始就沒做還糟,因為你同時失去了工具和大家的信心。

下一篇會從最實際的地方開始:同樣一個 build,設定在 UI 上點出來、跟寫成一份進 git 的 Jenkinsfile,差的到底是什麼——以及為什麼那個差別,在事故當下才會顯現。
