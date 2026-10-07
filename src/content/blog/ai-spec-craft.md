---
title: "規範即程式:CLAUDE.md 是新時代的 onboarding 文件"
date: 2026-10-07
category: tech
description: "同一個任務,給 AI 跑兩次:一次有 CLAUDE.md,一次沒有。程式碼幾乎一模一樣——差的是 branch、發布閘門、驗收,和它敢不敢代你寫「我的經驗」。再翻三個 repo 的 git 歷史:每一條規則都是一道疤,而規範跟程式一樣會有 bug、會過期、會長出死碼。"
tags:
  - ai
  - leadership
  - side-project
series: "帶 AI 的手藝(2026)"
seriesOrder: 5
draft: true
---
## 前言

前四篇立的是公理:[[responsibility-funnel|責任守恆]]、[[ai-incident-clock|頸上有時鐘]]、[[ai-responsibility-design|工具怎麼設計責任]]、[[ai-responsibility-premium|AI 不收保費]]。從這篇開始是推導——如果責任百分之百收斂在你身上,那第一個推得出來的手藝就是:**你的要求必須寫清楚。**

這個推論聽起來像常識,但它有一個不太常識的結論:`CLAUDE.md` 不是給 AI 的使用說明,是**你責任的書面形式**。你沒寫下來的要求,出事時沒有人能幫你證明你要求過;你寫錯的要求,AI 會一字不差地執行到底。

這篇用兩種實例來拆:一個 A/B 實驗(同一個任務,有規範 vs 沒規範),和三個 repo 的規範考古——這個部落格、[[gitcrisp|GitCrisp]],和一個私人的 Godot 遊戲專案。

## 實驗:同一個任務,有規範 vs 沒規範

做法:把 repo 複製成兩份乾淨的副本,一份原封不動,一份刪掉所有規範檔(`CLAUDE.md`、`.claude/skills/`、術語表與風格指南),然後用 headless 的 Claude Code 對兩份下**一字不差的同一句指令**。兩個任務:

- **部落格**:「寫一篇新文章,解釋 API 的 Idempotency Key……寫完幫我 commit。」
- **GitCrisp**:「在 sidebar 的 stash 右鍵選單加一個『Create branch from stash…』,做的事等同 `git stash branch`。做完 commit。」

四次執行,每次兩到三分鐘、0.3 到 0.5 美元。先講清楚:**每組只跑一次**,這是一次觀察,不是統計。但它的結果跟我預期的方向不一樣,所以值得寫。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 400" role="img" aria-label="A/B 實驗結果對照。上方橫跨兩欄的一條:程式碼層幾乎一樣——GitCrisp 兩組改了同樣六個正式程式檔、同樣的分層,因為 codebase 本身就是隱性規範。下方五列是責任層的差異,左欄沒有規範、右欄有規範:出貨路徑,直接 commit 到 master 對比開 branch 等 PR;發布閘門,draft false 寫完即發對比 draft true 等作者確認;第一手經驗,代寫「我的經驗是」對比拒絕代寫並標出要作者補;驗收,只跑單元測試對比真的把 app 跑起來做 e2e;切分,一個 commit 對比照架構分層拆兩個。結論:規範改變的不是 code 長什麼樣,是責任落在哪裡。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="252" y="24" fill="#e05a7d" font-size="12" text-anchor="middle" font-weight="bold">沒有規範</text>
    <text x="508" y="24" fill="#54b890" font-size="12" text-anchor="middle" font-weight="bold">有規範</text>
    <rect x="130" y="38" width="500" height="54" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="380" y="61" fill="#e6e6e6" font-size="12" text-anchor="middle">同樣六個正式程式檔、同樣的分層、幾乎同樣的行數</text>
    <text x="380" y="80" fill="#9aa4b2" font-size="10" text-anchor="middle">既有的 codebase 本身就是一份隱性規範——兩組都照著它長</text>
    <text x="118" y="70" fill="#9aa4b2" font-size="11" text-anchor="end">程式碼</text>
    <line x1="20" y1="106" x2="630" y2="106" stroke="#3a4154" stroke-dasharray="4 3"/>
    <text x="20" y="124" fill="#d6a45c" font-size="10" text-anchor="start">責任層:差異全在這裡</text>
    <text x="118" y="157" fill="#9aa4b2" font-size="11" text-anchor="end">出貨路徑</text>
    <rect x="130" y="136" width="245" height="36" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="252" y="158" fill="#e6e6e6" font-size="11" text-anchor="middle">直接 commit 到 master</text>
    <rect x="385" y="136" width="245" height="36" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="508" y="158" fill="#e6e6e6" font-size="11" text-anchor="middle">開 branch,等 PR</text>
    <text x="118" y="201" fill="#9aa4b2" font-size="11" text-anchor="end">發布閘門</text>
    <rect x="130" y="180" width="245" height="36" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="252" y="202" fill="#e6e6e6" font-size="11" text-anchor="middle">draft: false,寫完即發</text>
    <rect x="385" y="180" width="245" height="36" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="508" y="202" fill="#e6e6e6" font-size="11" text-anchor="middle">draft: true,等作者確認圖</text>
    <text x="118" y="245" fill="#9aa4b2" font-size="11" text-anchor="end">第一手經驗</text>
    <rect x="130" y="224" width="245" height="36" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="252" y="246" fill="#e6e6e6" font-size="11" text-anchor="middle">代寫「我的經驗是……」</text>
    <rect x="385" y="224" width="245" height="36" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="508" y="246" fill="#e6e6e6" font-size="11" text-anchor="middle">拒絕代寫,標出要作者補</text>
    <text x="118" y="289" fill="#9aa4b2" font-size="11" text-anchor="end">驗收</text>
    <rect x="130" y="268" width="245" height="36" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="252" y="290" fill="#e6e6e6" font-size="11" text-anchor="middle">跑單元測試,沒開 app</text>
    <rect x="385" y="268" width="245" height="36" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="508" y="290" fill="#e6e6e6" font-size="11" text-anchor="middle">把 app 真的跑起來(e2e)</text>
    <text x="118" y="333" fill="#9aa4b2" font-size="11" text-anchor="end">切分</text>
    <rect x="130" y="312" width="245" height="36" rx="6" fill="#3a2632" stroke="#e05a7d"/>
    <text x="252" y="334" fill="#e6e6e6" font-size="11" text-anchor="middle">一個 commit</text>
    <rect x="385" y="312" width="245" height="36" rx="6" fill="#223528" stroke="#54b890"/>
    <text x="508" y="334" fill="#e6e6e6" font-size="11" text-anchor="middle">照架構分層拆兩個 commit</text>
    <text x="380" y="380" fill="#d6a45c" font-size="12" text-anchor="middle" font-weight="bold">規範改變的不是 code 長什麼樣,是責任落在哪裡</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">兩個任務、四次執行的對照。程式碼那一條兩組幾乎重疊;分岔的全是「什麼時候算做完、誰來簽」。</figcaption>
</figure>

### 發現一:codebase 本身就是規範

我原本預期沒規範的那組會亂長——架構越界、命名走鐘。結果完全沒有。GitCrisp 那題,兩組改的是**同樣六個正式程式檔**:port、command、infrastructure、bus、flow、sidebar,一層不多、一層不少。原因很簡單:一個已經照 Clean Architecture 分好層的 codebase,每個既有功能都是一份範例,AI 讀幾個檔案就學會了。

部落格那題更明顯。沒規範的那組自己說:「README 提到的寫作 skill 不存在,所以我照既有文章(`redis-cache-patterns`、`medallion-architecture`)的格式寫。」——它找不到規範,就把整個 `src/content/blog/` 當規範。而且寫得還不差:三張圖、比另一組長一倍,甚至自己用 SQLite 模擬了一遍重送流程。**單看文章品質,沒規範那組不輸。**

這是第一個要修正的直覺:**規範不是用來教 AI 寫 code 的。**寫 code 的品味,它從你的 codebase 學得到;如果你的 codebase 是一團亂,那份 `CLAUDE.md` 寫得再漂亮也蓋不過四百個反例。

### 發現二:規範決定的是「什麼時候算做完」

那差別在哪?全在圖的下半部——沒有一項跟 code 長什麼樣有關,每一項都跟**責任**有關:

- **出貨路徑**:有規範的那組第一個動作是開 branch,收尾說「按 `CLAUDE.md`,改動要走 PR 進 `master`,所以我沒有直接動 `master`」。沒規範的那組直接 commit 在 master 上。
- **發布閘門**:沒規範的那篇 `draft: false`——如果這是真的 repo,下一次 deploy 它就上線了,帶著一句它自己承認「憑記憶寫的」Stripe 保留期限。有規範的那篇設 `draft: true`,理由是「作者還沒確認 SVG」——因為 skill 裡寫著截圖給作者確認才算定稿。
- **第一手經驗**:這是讓我最在意的一條。沒規範那篇的反思寫著「**我的經驗是**,別為了省這個成本而讓 client 去猜」——一個不存在的經驗,掛在我的名字底下。有規範的那篇說:「反思裡我沒有編造你的親身經歷……最有說服力的是你在 Production 遇過的重複扣款或重複下單事件,建議你自己補上。」skill 裡寫的是「反思要有真實案例」,它讀懂了這句話的另一面:**真實案例只有作者能給**。
- **驗收**:GitCrisp 的 `CLAUDE.md` 有一段「CI 綠了不代表做完——啟動 app,實際操作你改到的地方」。有規範的那組因此多寫了一條 e2e journey,用真的 `MainWindow` 對真的 repo 操作一遍;沒規範的那組老實說「我沒有啟動 app 去點選單」。正式程式碼同樣六個檔,測試卻多了三倍多。

所以規範的價值不在 code 的那一條,在 code 以外的那五條。它寫的不是「怎麼做」,是**「做到哪裡才准交、交給誰、誰簽名」**——也就是[[responsibility-funnel|漏斗]]的頸畫在哪。

## 考古:每一條規則都是一道疤

實驗回答了「規範改變什麼」。另一個問題是:**規範是怎麼長出來的?**我把三個 repo 的規範檔 `git log` 翻了一遍,把每條規則追回它出生的那個 commit:

| 規則 | 出生的那一次 |
|---|---|
| 「概念文**預期**要有圖,不是選配」(本站 skill) | 舊版寫的是「don't force one」——於是四篇概念文沒有圖。改措辭那天,順手補了四張 |
| 「不要無腦替換:數據、依賴……」(本站風格指南 §2) | 規則把作者慣用的「數據」「依賴」也機械替換掉了,同一天 revert,另開一節寫例外 |
| 全站單一術語表 | 合併三張各做一半的表時,抓到 transaction 全站 113 處寫「交易」、21 處寫「事務」——21 處全在同一個系列 |
| 字數用 Python 數中文字,不用 `wc -m` | locale 沒設時 `wc -m` 數的是 bytes:一篇實際 717 字,回報 2,824 |
| SVG 一律截圖給作者確認 | 爆框、字重疊在 markdown 原始碼裡看不出來 |
| PR 超過 ~400 行先提拆分,照架構分層拆(GitCrisp) | file history 功能一個 PR 進來:21 個檔、761 行,接縫在合併的 diff 裡全看不見 |
| 每次 merge 都要讓 master 可以發版(GitCrisp) | CI 只跑 domain + application 的測試,app 開不起來它不會知道 |
| 不要 `./test.sh \| tail && git commit`(遊戲專案) | 管線會吃掉失敗的結束碼——紅燈可以被當成綠燈 commit 進去 |
| 程式註解裡不要放雙引號包的中文(遊戲專案) | 翻譯抽取工具把註解也當成待翻字串 |

一張表看下來,**沒有一條規則是事先想出來的**。每一條都對應一次出包、一次被抓到、一次「下次別再這樣」。那個遊戲專案最極端:前兩百七十多個 commit 都沒有 `CLAUDE.md`,它是在疤夠多之後才一次寫下來的——寫下來的那天,內容幾乎全是前面幾百個 commit 裡反覆踩過的坑。

而且這些疤是有效的。GitCrisp 的 PR 粒度規則在 8/26 寫進 `CLAUDE.md`,前後對照 merge 進 master 的 PR 大小:

| | 規則前(74 個 PR) | 規則後(56 個 PR) |
|---|---|---|
| 最大 PR | 5,921 行 | 797 行 |
| 第 90 百分位 | 1,884 行 | 505 行 |
| 超過 400 行的比例 | 36% | 20% |

規則後那 20% 超過 400 行的 PR,我逐一看過:大半有四到六成是測試,另一個是 README 改寫。規則守住的是「reviewer 一次要讀的正式程式碼量」,不是一個死數字。

## 規範即程式:它有 bug、會過期、會長出死碼

把上面的考古攤開來看,會發現規範檔的生命週期跟程式碼一模一樣:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 320" role="img" aria-label="規範的生命週期,四個框繞成一圈:左上是出包,一條規則的起點;右上是寫成規則,附理由、例外、檢查指令;右下是 AI 照字面執行,每一個 session、每一次;左下是規則失效,有四種:過度執行、過期、死碼、規則本身有 bug。失效又是下一次出包,回到起點。中間寫著:規範即程式——要 review、要重構、要刪。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <rect x="40" y="30" width="200" height="60" rx="8" fill="#262b3a" stroke="#e05a7d" stroke-width="1.5"/>
    <text x="140" y="56" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">出包</text>
    <text x="140" y="76" fill="#9aa4b2" font-size="10" text-anchor="middle">一條規則的起點</text>
    <rect x="400" y="30" width="200" height="60" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="500" y="56" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">寫成規則</text>
    <text x="500" y="76" fill="#9aa4b2" font-size="10" text-anchor="middle">附理由、例外、檢查指令</text>
    <rect x="400" y="200" width="200" height="60" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="500" y="226" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">AI 照字面執行</text>
    <text x="500" y="246" fill="#9aa4b2" font-size="10" text-anchor="middle">每一個 session、每一次</text>
    <rect x="40" y="180" width="200" height="110" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="140" y="204" fill="#d6a45c" font-size="12" text-anchor="middle" font-weight="bold">規則失效</text>
    <text x="60" y="226" fill="#e6e6e6" font-size="10" text-anchor="start">過度執行:數據 → 資料</text>
    <text x="60" y="244" fill="#e6e6e6" font-size="10" text-anchor="start">過期:mixin 數量、語言數</text>
    <text x="60" y="262" fill="#e6e6e6" font-size="10" text-anchor="start">死碼:2/3 是工具樣板</text>
    <text x="60" y="280" fill="#e6e6e6" font-size="10" text-anchor="start">本身有 bug:wc -m 數 bytes</text>
    <line x1="240" y1="60" x2="392" y2="60" stroke="#9aa4b2" stroke-width="1.5"/>
    <polygon points="398,60 388,55 388,65" fill="#9aa4b2"/>
    <line x1="500" y1="90" x2="500" y2="192" stroke="#9aa4b2" stroke-width="1.5"/>
    <polygon points="500,198 495,188 505,188" fill="#9aa4b2"/>
    <line x1="400" y1="230" x2="248" y2="230" stroke="#9aa4b2" stroke-width="1.5"/>
    <polygon points="242,230 252,225 252,235" fill="#9aa4b2"/>
    <line x1="140" y1="180" x2="140" y2="98" stroke="#9aa4b2" stroke-width="1.5"/>
    <polygon points="140,92 135,102 145,102" fill="#9aa4b2"/>
    <text x="150" y="140" fill="#9aa4b2" font-size="10" text-anchor="start">下一道疤</text>
    <text x="320" y="132" fill="#d6a45c" font-size="12" text-anchor="middle" font-weight="bold">規範即程式</text>
    <text x="320" y="152" fill="#9aa4b2" font-size="10" text-anchor="middle">要 review、要重構、要刪</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">規範的生命週期。差別只在執行者:程式碼由機器執行,規範由 AI 執行——而且同樣照字面。</figcaption>
</figure>

四種失效,四個實例:

**過度執行——規則沒寫例外,AI 會執行到底。**風格指南一開始只寫「中國用語 → 台灣用語」的對照,「數據」「依賴」也在表上。AI 很盡責地把它們全換掉了——包括我自己文章裡本來就這樣寫的地方。人類 editor 讀到這條會自動補上「依語境」三個字,AI 不會。修法不是刪規則,是**把例外寫進去**:現在術語表有一整節就叫「依語境——不要無腦替換」。

**過期——規範描述的世界變了,規範沒跟上。**GitCrisp 的 `CLAUDE.md` 寫「`Pygit2Repository` 由十一個 mixin 組成」,實際上早就是十三個;遊戲專案加了簡體中文之後,`CLAUDE.md` 還寫著「兩種語言」。兩次都是事後順手才發現的。過期的規範比沒有規範危險:AI 會相信它,然後去找第十二個 mixin 該放在哪。

**死碼——沒有人敢刪的段落。**GitCrisp 的 `CLAUDE.md` 有 211 行,其中 138 行是一個 token 壓縮工具自動塞進去的使用說明,裡面列著 `cargo build`、`jest`、`next build`——在一個 Python 專案裡。實驗裡有規範的那組讀到它,發現工具沒裝,就略過了。這次沒造成傷害,但它每個 session 都在吃 context,而且稀釋了真正重要的那 73 行。

**本身有 bug——規範裡的檢查指令也是程式。**鐵人賽的發文 skill 用 `wc -m` 檢查「至少 300 字」,在沒設 locale 的環境它數的是 bytes,一個中文字算三個。報告的字數虛胖近三倍,300 字的下限形同虛設——一篇只有 100 個中文字的稿子也會過關。這不是 AI 的錯,是我寫進規範的那行指令有 bug。

所以「規範即程式」不是比喻:它被執行、它有輸入輸出、它會壞。唯一的差別是編譯器換成了 AI——而這個編譯器不會報 warning,它只會安靜地照做。

## onboarding 文件:寫給 AI 的,也是寫給人的

回頭看那張考古表,還有一件事:這些規則幾乎都附了**理由**。GitCrisp 的 PR 規則不只寫「超過 400 行要拆」,還寫了為什麼照 data → display → wiring 的順序拆:「data 合進去是隱形的,display 合進去是點不到的,wiring 才讓功能可以被點到——所以 wiring 最後、一次合完。」那個遊戲專案的 review skill 有一條我很喜歡:**「每個發現都要有『輸入/狀態 → 錯誤結果』的具體情境,寫不出情境就不算問題。」**

這些句子拿掉 AI 的語境,原封不動就是一份給新人的 onboarding 文件。這不是巧合:**能讓 AI 正確執行的規範,和能讓新人正確上手的規範,是同一種東西**——都要具體、都要附理由、都要寫出例外。差別只在 AI 每個 session 都是第一天上班的新人,而且從不會在午餐時間問學長「這條規則為什麼存在」。

反過來也成立:寫不清楚要求的人,帶 AI 和帶人都會失敗。只是帶人的時候,人會替你補完——新人會問、會猜、會在 standup 時提出疑問,你的模糊被同事的判斷力吸收掉了。AI 不吸收。它把你的模糊原封不動地放大成產出,然後交回來給你簽名。

## 反思

### 規範是責任的書面形式

實驗裡最讓我在意的不是 e2e 測試多寫了幾行,而是那句「我的經驗是」。沒有規範的 AI 沒有做錯任何技術上的事,它只是補完了一篇文章該有的樣子——而一篇好的技術文該有作者的經驗,所以它寫了一段。站在它的角度,這是盡責。

但那段經驗會掛在我的名字底下。這就是[[responsibility-funnel|責任守恆]]在規範這一層的樣子:**你沒寫下來的要求,AI 會用「平均來說合理」的東西補上,而平均來說合理的東西,不一定是你願意簽名的東西。**「反思要有真實案例」這一行字,在實驗裡守住的不是文章品質,是我的簽名。

所以我現在看 `CLAUDE.md` 的方式變了:它不是提示詞技巧,是我事先寫好的簽名條件。哪些事做完才准交、哪些東西只有我能給、哪條路必須經過我——寫在裡面的,就是我在[[ai-responsibility-design|看板上的頸]]那篇說的「把頸搬到上游、而且上鎖」。

### 先有疤,再有規則

如果要我給一個寫規範的建議,就是:**不要一開始就寫一份完美的 `CLAUDE.md`。**那個遊戲專案兩百七十多個 commit 都沒有它,這個部落格的 `CLAUDE.md` 到今天還只有七行(只管 git 流程,其他全在 skill 裡)。憑想像寫的規範有兩個問題:一是你不知道 AI 會在哪裡出錯,寫的多半是它本來就會做對的事——實驗已經證明,架構和風格它從 codebase 就學得到;二是沒有疤的規則沒有理由,沒有理由的規則會被過度執行。

我的做法是讓規範跟著疤長:每次抓到一個出包,問自己「這是這次的錯,還是下次還會再犯的錯?」後者就寫進去,**連同那次出包的經過一起寫進 commit message**。半年後回頭看,`git log -- CLAUDE.md` 就是一本這個專案的事故史。

### 我怎麼 review 一條規則

既然規範是程式,它就該被當程式 review。我現在對每一條新規則會問四個問題,剛好對應那四種失效:

1. **例外寫了嗎?**——沒寫,AI 會執行到底。
2. **它描述的事實,什麼時候會變?**——數字、清單、檔案路徑,都是會過期的硬編碼;能指向來源就別抄一份。
3. **這段是誰寫的?**——工具自動塞進來的段落,要像對待 vendored code 一樣審過才留。
4. **裡面的指令跑過了嗎?**——寫進規範的 shell 指令,先在乾淨環境跑一次。

這四題說穿了就是 code review 的基本功。帶 AI 的手藝很多時候不是新手藝,是把舊手藝搬到一個新的地方——只是這一次,**你寫的文件就是你的程式,而執行它的那一位,永遠照字面來。**

系列前情:[[responsibility-funnel|#1 責任漏斗]] · [[ai-incident-clock|#2 頸上有時鐘]] · [[ai-responsibility-design|#3 看板上的頸]] · [[ai-responsibility-premium|#4 責任的保費]]
