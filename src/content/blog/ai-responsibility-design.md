---
title: "看板上的頸:工具怎麼設計人的責任——兩個開源專案的對照稽核"
date: 2026-08-13
category: tech
tags:
  - ai
  - leadership
series: "帶 AI 的手藝(2026)"
seriesOrder: 3
---
## 前言

[[responsibility-funnel|第一篇]]立了模型:AI 吃寬層,人守頸口。[[ai-incident-clock|第二篇]]把模型丟進事故現場驗證。這一篇看工具——因為 2026 年的工程師不是在白紙上跟 AI 協作,是在一堆新工具裡:agent 看板、多 agent 編排、spec 工作流。這些工具越來越多,但用久了會有一種不安:**它們讓工作看起來井然有序,卻好像沒有人在扛責任。**

這種不安值得認真對待,所以我做了一次稽核:挑兩個有代表性的開源專案,不讀文案、讀 code,看「人的責任」在它們的設計裡被放在哪。兩個樣本剛好是光譜的兩端:**Multica**(agent team 看板)和 **Superpowers**(spec-first 開發工作流)。引用都釘在稽核當下的 commit(Multica `6bce42b`、Superpowers `44c9b2d`)——程式碼會變,結論以當時為準。

先說明:這不是抹黑文。兩個專案都是各自品類裡認真思考過的作品——正因為認真,才值得當樣本解剖。

## 樣本一:Multica——頸畫在下游,但沒裝鎖

[Multica](https://github.com/multica-ai/multica) 是開源的 agent 工作區:AI agent 像同事一樣出現在看板上——被指派 issue、自己認領、邊做邊留言、完成後交回 review。首頁標語很誠實地說出了時代:「Your next 10 hires won't be human.」而它的文案也有意識地承諾了頸:「**nothing ships without a human saying so**」。

稽核結果是四個發現,一個比一個有意思。

**發現一:「agent 交付停在 in_review」是 prompt 慣例,不是狀態機。**餵給 agent 的 runtime 說明書寫著「deliver with `in_review`」;但同一份說明書列出 agent 可用的指令 `multica issue status <id> <status>`——合法值**包含 `done`**。伺服器端呢?更新 issue 的 API 只驗證 status 字串在枚舉裡,**沒有任何「你是誰」的檢查**。他們的原始碼註解把設計原則寫得明明白白:issue、留言這些範疇的預設契約是「**agent and human are interchangeable**」——agent 的請求視同主人本人。

**發現二:護頸的鎖他們造好了,只裝在錢上。**Multica 的認證層會替每個請求蓋一個防篡改的章:人類登入不蓋,agent 的 task token 蓋上 `X-Actor-Source: task_token`。有一個現成的 middleware `RequireHumanActor`,看到機器的章就回 403「this endpoint is only available to human actors」。它被掛在哪?**只有計費路由**——理由寫在註解裡:被 prompt injection 攻破的 agent 不能替攻擊者開結帳頁、不能偷看主人的錢包。完全正確的考量。但這意味著:讓 agent 拉不動 Done,距離他們只有一行 `r.Use()`——**他們選擇不裝**。錢有頸,Done 沒有。

**發現三:完成 = 沉默。**Multica 的通知系統把 `in_review` 當作「這需要你」的主要訊號——人的注意力路徑是掛在這個狀態上的。所以一個(被誘導或單純搞錯的)agent 直接把 issue 拉到 `done`,不只繞過了驗收,**連通知都不會響**。讀過[[ai-incident-clock|上一篇]]的人應該起雞皮疙瘩了:這是毒藥訊息「失敗 = 沉默」的組織版,而且更陰險——靜默完成比靜默失敗更不會有人去查。

**發現四:schema 裡沒有 accountable。**issue 只有一個 assignee 欄位(可以是人、可以是 agent)加一個 creator。RACI 裡那個不可轉讓的 A——「出事時誰站出來」——在資料模型裡**不存在**。反而 agent 對 agent 的權限做得很細:squad leader 才能動 parent issue 的狀態,防止別的 agent 亂推你的工作。**agent 之間的地盤劃得比人與 agent 之間的頸清楚。**

公平地說完:Multica 真正的出貨頸外包給了 GitHub——agent 進不了 main,PR merge 還是人按的;execution log 完整可回放,稽核性其實不差。所以結論不是「他們不懂」,而是更值得玩味的:**他們按價值排序裝鎖——錢 > code merge > 看板狀態**。而看板狀態恰好是團隊「以為自己看見真相」的地方,於是責任在最顯眼的地方蒸發得最無聲。

## 樣本二:Superpowers——頸搬到上游,而且上了鎖

[Superpowers](https://github.com/obra/superpowers) 是 Jesse Vincent 的開源開發方法論,用一組 skill 改造 coding agent 的行為:先 brainstorm 出 spec、人簽核、寫實作計畫、再放手讓 subagent 執行。我自己整個部落格的功能幾乎都是用它開發的——`docs/superpowers/specs/` 裡躺著十幾份日期命名的設計文件,從 wiki-link 反向連結到抽籤工具的 RNG。

它對責任的處理,跟 Multica 是鏡像。

**HARD-GATE:一切從「不准寫 code」開始。**brainstorming skill 裡有一個明文硬閘:呈現設計並獲得使用者批准之前,不准呼叫任何實作 skill、不准寫任何 code、不准 scaffold 任何專案。緊接著封死最常見的逃生口——「**沒有專案簡單到不需要設計**」,todo list 也一樣。對照漏斗語言:Multica 是把頸畫在下游等人來驗收(而且沒鎖),Superpowers 是 **AI 主動把人押到頸口,簽了名才放行**。

**一次一題,是責任設計不是 UX。**skill 規定澄清問題一次只問一個。一次丟十題,人會掃過去說「都好」;一次一題,人必須逐題做決策。它把你本來會默默委派給 AI 的判斷,一個一個逼回你手上——**你不能當乘客**。

**簽名有物理形式。**設計分段呈現、每段批准,然後寫成 `docs/superpowers/specs/日期-主題-design.md` **並 commit 進版本控制**。[[responsibility-funnel|第一篇]]說「簽名的人是你」,Superpowers 把這個簽名做成了檔案:出事可以考古,哪一天、哪份 spec、誰批准的。我對 spec 的「強烈負責感」正是從這裡來的——那個檔案上是我的名字,而且它會永遠留在 git 歷史裡。

**簽核之後,判斷力就不再被假設存在。**writing-plans skill 的名句:把實作計畫寫給「一個熱情但品味差、無判斷力、不懂專案脈絡、討厭測試的 junior 工程師」。這句話的深意是:**人的判斷力被全部前置,灌進 spec 和 plan;執行端被建模成零判斷的機器**。這是漏斗的重新配置——責任左移。而且經濟上划算:驗一份 spec,比驗它下游長出來的十個 PR 便宜。

**還有給 AI 自己戴的頸圈。**verification-before-completion skill 的鐵律:「NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE」——沒有剛跑過的驗證證據,不准宣稱完成;跳過任何一步「= 說謊,不是驗證」。對照很有趣:Multica 的機制是「通知人來看」,Superpowers 是「訓練 agent 沒證據不准喊完成」。一個管流程狀態,一個管誠實聲明。

但誠實的稽核也要給 Superpowers 記三筆:**前移的頸一樣會磨損**——每段批准、每份 spec review,次數多了會退化成「好、好、繼續」;HARD-GATE 擋得住 AI 亂衝,擋不住人亂簽。**簽了不等於簽對**——spec 給你的是「這是我的意圖」的責任感,但意圖與現實的落差要到上線才暴露,負責感不等於正確性。以及它終究**是 prompt 不是機制**——鐵律寫在 skill 文字裡,真正的硬保證還是得靠外面的 CI。

## 對照:同一個漏斗,兩種頸

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 330" role="img" aria-label="兩個漏斗的對照。左邊 Multica:AI agents 的產出流向看板,人的驗收畫在下游的 in_review,但以虛線表示——它是慣例不是強制,旁邊一條紅色捷徑讓 agent 可以直接把工作拉到 done,繞過通知。右邊 Superpowers:頸在上游,人的 spec 簽核是實線的硬閘(HARD-GATE),簽核之後 AI 以 TDD 實作、驗證後交付,真正的出貨仍由人 merge。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="160" y="26" fill="#e6e6e6" font-size="13" text-anchor="middle" font-weight="bold">Multica:頸在下游(虛線)</text>
    <rect x="40" y="44" width="240" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="160" y="66" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">AI agents 產出</text>
    <text x="160" y="84" fill="#9aa4b2" font-size="9" text-anchor="middle">認領 issue · 寫 code · 留言回報</text>
    <rect x="70" y="122" width="180" height="48" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="160" y="142" fill="#d6a45c" font-size="11" text-anchor="middle" font-weight="bold">in_review:人的驗收</text>
    <text x="160" y="160" fill="#9aa4b2" font-size="9" text-anchor="middle">prompt 慣例——伺服器不強制</text>
    <rect x="100" y="198" width="120" height="42" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="160" y="223" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">done</text>
    <line x1="160" y1="94" x2="160" y2="122" stroke="#9aa4b2" stroke-width="1.3"/>
    <line x1="160" y1="170" x2="160" y2="198" stroke="#9aa4b2" stroke-width="1.3"/>
    <path d="M 280 80 C 330 130 290 200 222 216" fill="none" stroke="#e05a7d" stroke-width="1.6" stroke-dasharray="5 4"/>
    <text x="318" y="140" fill="#e05a7d" font-size="9" text-anchor="middle">agent 可直拉 done</text>
    <text x="318" y="153" fill="#e05a7d" font-size="9" text-anchor="middle">(通知也不會響)</text>
    <text x="160" y="272" fill="#9aa4b2" font-size="10" text-anchor="middle">同一套認證能分辨人與機器——</text>
    <text x="160" y="288" fill="#9aa4b2" font-size="10" text-anchor="middle">但鎖只裝在計費 API 上</text>
    <line x1="345" y1="40" x2="345" y2="300" stroke="#3a4154" stroke-width="1"/>
    <text x="495" y="26" fill="#e6e6e6" font-size="13" text-anchor="middle" font-weight="bold">Superpowers:頸在上游(實線)</text>
    <rect x="405" y="44" width="180" height="48" rx="8" fill="#223528" stroke="#54b890" stroke-width="2"/>
    <text x="495" y="64" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">人:spec 簽核</text>
    <text x="495" y="82" fill="#9aa4b2" font-size="9" text-anchor="middle">HARD-GATE:未批准不准實作</text>
    <rect x="375" y="122" width="240" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="495" y="144" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">AI 實作(TDD · subagents)</text>
    <text x="495" y="162" fill="#9aa4b2" font-size="9" text-anchor="middle">計畫寫給「零判斷的執行端」</text>
    <rect x="405" y="198" width="180" height="42" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="495" y="216" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">驗證後交付</text>
    <text x="495" y="232" fill="#9aa4b2" font-size="9" text-anchor="middle">無證據不准宣稱完成</text>
    <line x1="495" y1="92" x2="495" y2="122" stroke="#9aa4b2" stroke-width="1.3"/>
    <line x1="495" y1="172" x2="495" y2="198" stroke="#9aa4b2" stroke-width="1.3"/>
    <text x="495" y="272" fill="#9aa4b2" font-size="10" text-anchor="middle">簽名寫成 specs/*.md 並 commit——</text>
    <text x="495" y="288" fill="#9aa4b2" font-size="10" text-anchor="middle">責任有物理形式;弱點是簽核疲勞</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同一個責任漏斗:一個把頸畫在下游但用虛線(慣例),一個把頸搬到上游並畫成實線(硬閘)。虛線的頸,壓力一來就不存在。</figcaption>
</figure>

把兩份稽核疊起來,結論其實很乾淨:

**責任感是可以被「設計」出來的。**責任守恆沒有變——不管用哪個工具,出貨的責任都在你。工具改變的是**體感**:你在哪個時間點、以什麼粒度、多不可迴避地感受到「我正在簽名」。Multica 的板子讓你當觀察者(工作自己在流動),Superpowers 的流程逼你當甲方(每一段都要你點頭)。同一條守恆定律,兩種完全不同的人類處境。

**理想的工作流,兩個頸都要。**上游簽意圖(spec 簽核),下游驗產出(review + 出貨閘)——Superpowers 給了上游的範本,Multica 若把現成的鎖裝上 Done、補一個 accountable 欄位,就是下游的範本。單靠任何一端都不完整:只有上游,簽完的意圖沒人對帳;只有下游,人被淹死在驗收裡。

**挑工具(或自己搭工作流)的四個檢查題**,這是我從這次稽核帶走的清單:

1. **誰能宣告完成?**「完成」這個狀態轉移,機器到底推不推得動?是慣例還是強制?
2. **簽名有沒有物理形式?**人的批准會不會留下可考古的紀錄(檔案、commit、audit log),還是只是一次點擊?
3. **通知路徑繞得過去嗎?**存不存在一條路,讓工作在沒有任何人被通知的情況下變成「完成」?
4. **出事時,一條 query 答得出「誰讓它上線的」嗎?**答不出來的工具,就是在製造不可問責機器。

## 反思

### 錢的優先權,洩露了整個行業的定價

Multica 最誠實的一刻,是把 `RequireHumanActor` 只裝在錢上。這不是疏忽,是定價:**損失可量化的東西(錢)得到硬保護,損失延遲且難歸因的東西(工作品質、責任歸屬)得到慣例**。整個行業都在做同一道算術——但[[ai-incident-clock|事故]]的成本最後還是會到帳,只是收據晚幾個月來,而且抬頭寫的是你的名字。等到 agent 工具圈出過幾次「板子全綠、production 全紅」的著名事故,今天只鎖錢的門,明天都會補鎖。我情願現在就自己補。

### 我的 specs 目錄,和我不敢細看的問題

寫這篇時我回頭翻了自己 `docs/superpowers/specs/` 的十幾份簽核紀錄。它們給過我踏實感——每個功能都有一份我點過頭的文件。但誠實地自問:第一份 spec 和最近一份 spec,我的閱讀深度一樣嗎?我不敢說是。前移的頸給了簽名儀式,儀式重複久了就會磨損——這不是 Superpowers 的失敗,是**所有頸的共同宿命**,跟 code review 的橡皮圖章、航空的自動化自滿是同一條曲線。我目前的對策不是「提醒自己認真」(沒用),是**把 spec 保持在一次讀得完的大小**——簽核疲勞跟 spec 長度是乘法關係,結構性地縮短它,比意志力可靠。這也是這個系列講了三篇的同一句話:防禦靠流程,不靠聰明。

### 工具會過期,問題不會

這篇稽核釘在兩個 commit 上,因為我很清楚:半年後 Multica 可能就把鎖裝上了,Superpowers 可能改版,2026 年的工具清單到 2027 年就是考古材料——這正是這個系列掛年份的原因。但那四個檢查題不會過期:誰能宣告完成、簽名有沒有形式、通知繞不繞得過、事後查不查得到。工具是答案,答案會換;問題是資產,**下一個新工具出現時,你拿著問題走進去,五分鐘就知道它把你的責任放在哪**。

系列前情:[[responsibility-funnel|#1 責任漏斗]] · [[ai-incident-clock|#2 頸上有時鐘]]
