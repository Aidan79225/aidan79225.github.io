---
title: "驗收的手藝:怎麼 review AI 的 code"
date: 2026-10-08
category: tech
description: "我在一份 AI 寫的 PR 裡埋了三個 bug,測試 1294 個全綠。然後自己盲測 review 二十分鐘,同時讓九個 AI reviewer 各跑一次。結果:AI 把我懶得驗的東西一分鐘驗完,我抓到的是它要靠規範才穩定看得到的東西——而有一個我沒抓到的真 bug,是它找出來的。驗收的手藝不是讀得更仔細,是把證據、判斷和護欄分給對的人。"
tags:
  - ai
  - code-review
  - leadership
series: "帶 AI 的手藝(2026)"
seriesOrder: 6
draft: true
---
## 前言

[[responsibility-funnel|第一篇]]說,頸寬等於你能負責任地驗收的頻寬;[[ai-spec-craft|上一篇]]說,規範決定的是「什麼時候算做完」。這篇往下走一步:**東西做完了,交到你手上,你怎麼驗?**

「review AI 的 code」聽起來跟 review 人的 code 是同一件事,只是量變大了。我原本也這麼想。所以這篇不從論述開始,從一場實驗開始——我當受試者。

## 實驗:一份埋了三個 bug 的綠燈 PR

素材是上一篇實驗留下來的:AI 在 [[gitcrisp|GitCrisp]] 做的「Create branch from stash…」,一份真的由 AI 寫出來、一百六十多行的 PR。我在裡面埋了三個不同層次的 bug,條件只有一個:**現有測試全部要過**——1294 個測試,全綠,就像你每天收到的那種 PR。

- **B1 邏輯邊界**:stash 的 index 被「翻譯」了一次,上面附一句信心十足的註解:「`get_stashes()` 是最舊的排前面,git 從最新的開始數,所以要換算。」這句話是錯的。只有一個 stash 時,換算前後剛好一樣,所以測試會過;有兩個以上,使用者點的是最新的,被拿去開 branch、然後被丟掉的是最舊的。
- **B2 靜默回歸**:改到一行既有的 wiring——「Apply」被接到了「Pop」。從此按 Apply 會順便把 stash 刪掉。新功能完全沒問題,壞的是旁邊本來好好的東西,而現有測試只驗了 signal 有沒有發出去,沒驗它接到哪。
- **B3 架構**:新流程在 presentation 層直接 `import pygit2` 驗 branch 名稱,繞過了 port。功能上完全正確,是一個「該不該這樣寫」的問題。

然後兩邊同時開跑。**人的那組是作者本人盲測**——不知道埋了幾個、埋在哪,先只讀 PR 說明寫下預測,再計時讀 diff。**AI 的那組**是乾淨的 Claude Code,同一句「review 這個 PR,不要改檔案」,分三種條件各跑三次:什麼都沒有的裸 review、帶 GitCrisp 的 `CLAUDE.md`、再加一份 review skill(改編自我另一個專案的 review 迴圈,核心一條是「每個發現都要寫出『輸入/狀態 → 錯誤結果』,寫不出來就不算」)。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 330" role="img" aria-label="抓蟲結果矩陣。欄位是作者本人盲測二十分鐘,以及三種 AI reviewer 條件各跑三次:裸 review、加 CLAUDE.md、再加 review skill。B1 stash index 反轉:作者指出沒有 test 釘住行為但沒驗證,三種 AI 都是三次全中,而且九份裡有八份寫了一次性腳本實測。B2 Apply 被接到 Pop:四組全中。B3 presentation 直接用 pygit2:作者抓到,裸 AI 三次中一次,加 CLAUDE.md 三次中兩次,加 review skill 三次全中。沒埋的真 bug——部分失敗時已經切到新 branch 卻只報錯:作者沒抓到,裸 AI 一次,加 CLAUDE.md 一次,加 review skill 三次全中。最下面一列:作者花二十分鐘;AI 每次零點四到二點二分鐘、零點零九到零點一九美元。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="292" y="24" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">作者盲測</text>
    <text x="392" y="24" fill="#9aa4b2" font-size="11" text-anchor="middle">裸 AI</text>
    <text x="484" y="24" fill="#9aa4b2" font-size="11" text-anchor="middle">+CLAUDE.md</text>
    <text x="576" y="24" fill="#9aa4b2" font-size="11" text-anchor="middle">+review skill</text>
    <text x="16" y="62" fill="#e6e6e6" font-size="11" text-anchor="start">B1 index 反轉</text>
    <text x="16" y="78" fill="#9aa4b2" font-size="9.5" text-anchor="start">邏輯邊界</text>
    <rect x="244" y="44" width="96" height="44" rx="6" fill="#2e2a1a" stroke="#d6a45c"/>
    <text x="292" y="63" fill="#d6a45c" font-size="11" text-anchor="middle">△ 沒有 test</text>
    <text x="292" y="78" fill="#d6a45c" font-size="9.5" text-anchor="middle">釘住,沒驗證</text>
    <rect x="352" y="44" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="392" y="71" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <rect x="444" y="44" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="484" y="71" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <rect x="536" y="44" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="576" y="71" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <text x="16" y="114" fill="#e6e6e6" font-size="11" text-anchor="start">B2 Apply 變 Pop</text>
    <text x="16" y="130" fill="#9aa4b2" font-size="9.5" text-anchor="start">靜默回歸</text>
    <rect x="244" y="96" width="96" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="292" y="123" fill="#e6e6e6" font-size="12" text-anchor="middle">✓</text>
    <rect x="352" y="96" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="392" y="123" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <rect x="444" y="96" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="484" y="123" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <rect x="536" y="96" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="576" y="123" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <text x="16" y="166" fill="#e6e6e6" font-size="11" text-anchor="start">B3 越層用 pygit2</text>
    <text x="16" y="182" fill="#9aa4b2" font-size="9.5" text-anchor="start">架構判斷</text>
    <rect x="244" y="148" width="96" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="292" y="175" fill="#e6e6e6" font-size="12" text-anchor="middle">✓</text>
    <rect x="352" y="148" width="80" height="44" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="392" y="175" fill="#e6e6e6" font-size="12" text-anchor="middle">1/3</text>
    <rect x="444" y="148" width="80" height="44" rx="6" fill="#2e2a1a" stroke="#d6a45c"/>
    <text x="484" y="175" fill="#e6e6e6" font-size="12" text-anchor="middle">2/3</text>
    <rect x="536" y="148" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="576" y="175" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <text x="16" y="218" fill="#e6e6e6" font-size="11" text-anchor="start">沒埋的真 bug</text>
    <text x="16" y="234" fill="#9aa4b2" font-size="9.5" text-anchor="start">部分失敗卻只報錯</text>
    <rect x="244" y="200" width="96" height="44" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="292" y="227" fill="#e6e6e6" font-size="12" text-anchor="middle">✗</text>
    <rect x="352" y="200" width="80" height="44" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="392" y="227" fill="#e6e6e6" font-size="12" text-anchor="middle">1/3</text>
    <rect x="444" y="200" width="80" height="44" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="484" y="227" fill="#e6e6e6" font-size="12" text-anchor="middle">1/3</text>
    <rect x="536" y="200" width="80" height="44" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="576" y="227" fill="#e6e6e6" font-size="12" text-anchor="middle">3/3</text>
    <line x1="16" y1="258" x2="624" y2="258" stroke="#3a4154" stroke-dasharray="4 3"/>
    <text x="16" y="282" fill="#9aa4b2" font-size="11" text-anchor="start">花費</text>
    <text x="292" y="282" fill="#e6e6e6" font-size="11" text-anchor="middle">20 分鐘</text>
    <text x="484" y="282" fill="#e6e6e6" font-size="11" text-anchor="middle">每次 0.4–2.2 分鐘、$0.09–0.19</text>
    <text x="16" y="306" fill="#9aa4b2" font-size="11" text-anchor="start">B1 怎麼確認</text>
    <text x="292" y="306" fill="#e6e6e6" font-size="11" text-anchor="middle">讀 diff</text>
    <text x="484" y="306" fill="#e6e6e6" font-size="11" text-anchor="middle">9 份裡 8 份寫腳本實測 pygit2</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一份綠燈 PR、三個埋的 bug、一個沒埋的。人和 AI 抓到的東西大半重疊——不重疊的那幾格,才是這篇要講的。</figcaption>
</figure>

先講誠實的部分:每個條件只跑三次,而受試的人只有一個(我)。這不是統計,是一次對照觀察。另外,裸 review 那組我第一次的設定有漏洞——`CLAUDE.md` 雖然刪了,卻還留在 git 歷史裡,有兩份 review 讀到了它。圖上是把 `CLAUDE.md` 從歷史裡也拿掉、重跑之後的數字。

### 我抓到的,和我怎麼抓到的

二十分鐘,三個都碰到了,但碰到的方式不一樣。

B2 是讀出來的。diff 裡大部分是新增,只有那一行是「改」——`connect(self._on_stash_apply)` 變成 `connect(self._on_stash_pop)`。一個加功能的 PR 沒有理由改到 Apply 的 wiring,這種「理論上不應該有改動」的地方,眼睛會停下來。

B3 是預測到的。讀 diff 之前我寫下的預測是:**「實作完成和架構是否一致是兩回事」**——AI 很擅長把功能做完,但做完的那條路未必走在 Clean Architecture 的格線上。所以讀到 presentation 層出現 `import pygit2`,我知道要找的就是這個。

B1 最有意思,因為我**沒有**抓到它錯。我預測的第二件事是「我不確定 pygit2 這類 lib 的行為,會需要一些證明」。讀到那句「最舊的排前面」的註解時,我查不到證據證明它對,也查不到證據證明它錯——而老實說,身為 reviewer,我也不想為了它去細查。所以我的 review 意見是:**「雖然 comment 表示 oldest 在前面,但沒有 test case 釘住行為。」**

### AI 抓到的,和它怎麼抓到的

B1 和 B2,九份報告全中。而 B1 的抓法跟我完全不同:**九份裡有八份,當場寫了一支一次性腳本**——開一個暫存 repo、stash 兩次、印出 pygit2 回傳的順序——然後拿著輸出說「這句註解是錯的,我實測過」。我不想做的那一步,它花一兩分鐘、十幾美分就做完了。

B3 就不一樣了。裸 review 三次只有一次提到,帶 `CLAUDE.md` 是三次兩次,加上那份明寫「presentation 不得繞過 port 碰 infrastructure」的 review skill 之後才三次全中,而且其中兩次把它標成 blocking。**判斷題,AI 要靠規範才穩定看得到。**

然後是那一格我輸掉的:原本 AI 寫的 PR 本來就有一個我沒埋的 bug。stash 帶著 untracked 檔案、而工作目錄剛好有一個同名檔時,`git stash branch` 已經建好新 branch 並切過去,卻在還原 stash 時失敗——UI 只顯示一行 ERROR,使用者不知道自己已經站在另一個 branch 上。我事後寫腳本重現過,是真的。我沒看到;帶 review skill 的三次全都看到了。

另一面也要講:**每份 AI 報告除了這些,還附了三到七條 non-blocking 意見**——有的有用(名稱以 `-` 開頭會被 git 當成參數),有的是推測(「`index.read()` 可能沒刷新 HEAD」),有一條的機制還說錯了(它說工作目錄髒的時候會留下半套狀態,我實測是乾淨地失敗)。這些都要有人一條一條判斷。

## 驗收的分工:證據、判斷、護欄

把那張矩陣攤開來看,我對「review AI 的 code」的理解換了一個形狀。它不是「讀得更仔細」,而是**把每一個疑點分到對的處理方式**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 300" role="img" aria-label="驗收的分工。左邊是 PR 裡的一個疑點,先問一個問題:要確認它,需要的是證據還是判斷。三條路:第一條,證據便宜——lib 行為、index 換算、邊界值——交給機器,寫一次性腳本或讓 AI reviewer 實測,幾分鐘、十幾美分。第二條,需要判斷——架構該不該、範圍對不對、這個改動有沒有理由——留給人,這是頸真正該花的地方;想讓機器幫忙,就把判斷寫成規範。第三條,證據拿不到或不該由你產生——行為沒有 test 釘住——退回去要求護欄,補一個會失敗的 test。三條路最後都匯到簽名。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <rect x="16" y="110" width="128" height="74" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="80" y="136" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">PR 裡的疑點</text>
    <text x="80" y="156" fill="#9aa4b2" font-size="10" text-anchor="middle">要確認它,需要的是</text>
    <text x="80" y="171" fill="#9aa4b2" font-size="10" text-anchor="middle">證據,還是判斷?</text>
    <line x1="144" y1="135" x2="196" y2="58" stroke="#9aa4b2" stroke-width="1.3"/>
    <line x1="144" y1="147" x2="196" y2="147" stroke="#9aa4b2" stroke-width="1.3"/>
    <line x1="144" y1="159" x2="196" y2="236" stroke="#9aa4b2" stroke-width="1.3"/>
    <rect x="200" y="22" width="300" height="72" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="214" y="44" fill="#54b890" font-size="12" text-anchor="start" font-weight="bold">證據便宜 → 交給機器</text>
    <text x="214" y="64" fill="#e6e6e6" font-size="10" text-anchor="start">lib 行為、index 換算、邊界值</text>
    <text x="214" y="81" fill="#9aa4b2" font-size="10" text-anchor="start">一次性腳本或 AI reviewer 實測——幾分鐘、十幾美分</text>
    <rect x="200" y="111" width="300" height="72" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="214" y="133" fill="#4f6df5" font-size="12" text-anchor="start" font-weight="bold">需要判斷 → 留給人</text>
    <text x="214" y="153" fill="#e6e6e6" font-size="10" text-anchor="start">架構該不該、範圍對不對、改動有沒有理由</text>
    <text x="214" y="170" fill="#9aa4b2" font-size="10" text-anchor="start">頸真正該花的地方;要機器幫忙,先寫成規範</text>
    <rect x="200" y="200" width="300" height="72" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="214" y="222" fill="#d6a45c" font-size="12" text-anchor="start" font-weight="bold">沒有證據 → 要求護欄</text>
    <text x="214" y="242" fill="#e6e6e6" font-size="10" text-anchor="start">行為沒有 test 釘住</text>
    <text x="214" y="259" fill="#9aa4b2" font-size="10" text-anchor="start">退回去,補一個「錯了就會失敗」的 test</text>
    <line x1="500" y1="58" x2="556" y2="135" stroke="#9aa4b2" stroke-width="1.3"/>
    <line x1="500" y1="147" x2="556" y2="147" stroke="#9aa4b2" stroke-width="1.3"/>
    <line x1="500" y1="236" x2="556" y2="159" stroke="#9aa4b2" stroke-width="1.3"/>
    <rect x="560" y="120" width="68" height="54" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="594" y="151" fill="#54b890" font-size="12" text-anchor="middle" font-weight="bold">簽名</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">驗收的分工。疑點本身不分難易,分的是「確認它要花什麼」——證據便宜的交給機器,判斷留給人,拿不到證據的要求護欄。</figcaption>
</figure>

**證據便宜的,交給機器。**pygit2 的 stash 順序是一個有標準答案的事實,答案藏在一個十行腳本的輸出裡。這種疑點以前靠 reviewer 的經驗或意願——有經驗的人記得,有意願的人去查,兩者都沒有就放過去。現在它的價格是一兩分鐘、十幾美分。我沒做那一步,不是因為我不會,是因為人的意願是稀缺資源;**稀缺資源不該花在十幾美分就能買到的東西上。**

**需要判斷的,留給人。**B3 沒有標準答案可以實測——`import pygit2` 會動、測試會過,問題在「這個專案該不該這樣寫」。這正是[[responsibility-funnel|漏斗]]的頸該花力氣的地方。而實驗的另一個結論是:判斷也可以部分外包,但前提是**先把判斷寫成規範**。裸 review 三次中一次,寫進 review skill 之後三次全中——這就是[[ai-spec-craft|上一篇]]說的「規範即程式」,只是這次跑它的是 reviewer。

**拿不到證據的,要求護欄。**回頭看我對 B1 的那句意見:「沒有 test case 釘住行為。」它沒有指出 bug,但它指向了正確的修法——補一個兩個 stash 的 test,而那個 test 一跑就會紅。這是 reviewer 一個被低估的動作:**證明的責任在作者,不在 reviewer。**我不必自己去證明它錯,我只需要拒絕在沒有證據的地方簽名。

## 反思

### 綠燈是一個說法,不是一個證據

這份 PR 最狡猾的地方,是 1294 個測試全綠——而且新增的測試寫得不差:infrastructure 有真 repo 的測試、presentation 有 flow 測試、還有一條 e2e journey。只是它們**全部只用一個 stash**,剛好是錯的換算和對的換算給出同一個答案的那個點。

這是[[responsibility-funnel|第一篇]]說的「護欄壞了是靜默的」的實物。所以我 review AI 的 PR 時,看測試的力道比看 feature 更重,而且問的不是「有沒有測試」,是**「如果這段 code 是錯的,這個測試會不會紅?」**一個在錯誤和正確之間無法分辨的測試,不是護欄,是裝飾。九份 AI 報告裡,帶 review skill 的三份都把「只用一個 stash」單獨列成一條 test gap,其中兩份標成 blocking——因為那份 skill 裡有一行:「測試真的會在 code 錯的時候失敗嗎?檢查每個測試實際 assert 了什麼。」

### 老實說「這塊我不能簽」,是頸寬的一部分

第一篇寫過:**頸寬 = 驗收速度 × 校準**,真正的頸寬包含知道自己哪裡看不懂,並對看不懂的部分降速、加護欄,或老實說「這塊我還不能簽」。寫的時候是論述,這次是實物——我對 B1 做的正是這件事。我不確定 pygit2 的行為,所以我沒有假裝確定,而是要求一個 test。

反過來想才可怕:如果我讀到那句「最舊的排前面」,覺得「嗯,聽起來合理」,然後放行——那就是[[ai-incident-clock|事故篇]]說的權威幻覺:AI 的註解長得最像答案。這句註解信心十足、語氣專業、還附上理由,而它是錯的。**AI 寫的註解不是文件,是待驗證的主張。**

### AI reviewer 不是第二雙眼睛,是一台證據機

實驗之前,我以為 AI reviewer 的價值是「多一雙眼睛」。實驗之後我覺得這個比喻錯了。它跟我抓到的東西大半重疊,所以它不是一雙**不同**的眼睛;它真正不同的地方,是它**願意為每一個小疑點付出驗證的成本**——開暫存 repo、跑腳本、重現失敗。那個沒埋的真 bug 也是這樣被找到的。

但它也是一台會產生雜訊的機器:每份報告三到七條 non-blocking,有推測、有說錯機制的。把它的輸出直接當結論,等於把頸換成另一種形式的蓋章——我只是從「蓋 AI 寫的 code」變成「蓋 AI 寫的 review」。所以我的用法會是:**讓它先跑,把它的發現當成待驗證的線索,我只花時間在兩種東西上——它標為 blocking 的,和它根本不會判斷的。**

這篇想留下的一句話是:review AI 的 code,難的不是讀懂每一行,是知道每一個疑點該由誰、用什麼代價來確認。**證據交給機器,判斷留給自己,沒有證據的地方,不簽名。**

系列前情:[[responsibility-funnel|#1 責任漏斗]] · [[ai-incident-clock|#2 頸上有時鐘]] · [[ai-responsibility-design|#3 看板上的頸]] · [[ai-responsibility-premium|#4 責任的保費]] · [[ai-spec-craft|#5 規範即程式]]
