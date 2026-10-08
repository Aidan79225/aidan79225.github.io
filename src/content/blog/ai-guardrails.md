---
title: "護欄工程:測試與規範在 AI 產線的新角色"
date: 2026-10-08
category: tech
description: "GitCrisp 的 CI 五個月跑了 231 次、紅了 15 次,沒有一次漏進 master;其中一次攔下的,是一個會讓衝突中的 repo 看起來一切正常的靜默 bug。但同一套 1294 個測試,被故意改壞 49 處之後,只有六成的錯會讓它變紅——而漏掉的,集中在層與層之間的接縫。護欄的價值不在有沒有,在它錯了的時候會不會紅。"
tags:
  - ai
  - testing
  - side-project
series: "帶 AI 的手藝(2026)"
seriesOrder: 7
draft: true
---
## 前言

[[responsibility-funnel|第一篇]]把護欄定義成「加寬頸的工具」——把每次都要人眼看的檢查交給機器,人的驗收頻寬留給機器驗不了的東西。[[ai-review-craft|上一篇]]在一份綠燈 PR 裡看到這句話的反面:1294 個測試全綠,但它們全部只用一個 stash,剛好是錯的和對的給出同一個答案的那個點。**一個在錯誤和正確之間無法分辨的測試,不是護欄,是裝飾。**

所以這篇不討論「該不該寫測試」——在 AI 幫你寫測試的年代,這個問題的成本面已經變了。這篇問兩個可以量的問題,用 [[gitcrisp|GitCrisp]] 當樣本:

1. **它擋下了什麼?**——CI 五個月的紅燈紀錄。
2. **它會漏掉什麼?**——故意把 code 改壞,看測試會不會紅。

兩份帳本的數據都是我請 AI 去挖、去跑的:一份讀 GitHub Actions 的執行紀錄,一份做 mutation testing。

## 帳本一:CI 五個月擋下了什麼

GitCrisp 的 CI 從 5 月 17 日開始跑,到 10 月 5 日一共 231 次:每個 PR 在 Linux、Windows、macOS 三個平台各跑一次完整 pytest,另外跑 ruff 和 mypy(mypy 只檢查 domain 和 application 兩層)。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 300" role="img" aria-label="GitCrisp CI 五個月的紅燈帳本。231 次執行,194 次綠燈、22 次被較新的執行取消、15 次紅燈。15 次紅燈的原因:測試 8 次、lint 4 次、基礎設施 3 次(下載被限流、apt 雜湊錯誤、checkout 失敗),mypy 0 次。8 次測試紅燈裡:pygit2 1.20 讓 repo 狀態悄悄變成 CLEAN 的靜默 bug 擋了 3 次、只在單一作業系統出現且內容已確認的 bug 2 次、同樣只在單一作業系統紅但 log 已過期的 2 次、flaky 測試 1 次。15 次紅燈全部發生在 PR branch 上,漏進 master 的是 0 次;唯一一個帶著紅燈 merge 的 PR,紅的是那次 flaky 測試。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="20" y="28" fill="#e6e6e6" font-size="12" text-anchor="start" font-weight="bold">231 次 CI 執行</text>
    <rect x="20" y="40" width="497" height="26" rx="4" fill="#223528" stroke="#54b890"/>
    <text x="268" y="58" fill="#e6e6e6" font-size="11" text-anchor="middle">綠燈 194</text>
    <rect x="519" y="40" width="57" height="26" rx="4" fill="#262b3a" stroke="#3a4154"/>
    <text x="547" y="58" fill="#9aa4b2" font-size="10" text-anchor="middle">取消 22</text>
    <rect x="578" y="40" width="42" height="26" rx="4" fill="#3a2632" stroke="#e05a7d"/>
    <text x="599" y="58" fill="#e6e6e6" font-size="10" text-anchor="middle">紅 15</text>
    <line x1="599" y1="66" x2="599" y2="84" stroke="#e05a7d" stroke-width="1.3"/>
    <line x1="20" y1="84" x2="599" y2="84" stroke="#e05a7d" stroke-width="1.3"/>
    <line x1="20" y1="84" x2="20" y2="96" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="20" y="114" fill="#e6e6e6" font-size="12" text-anchor="start" font-weight="bold">15 次紅燈,原因</text>
    <rect x="20" y="124" width="288" height="26" rx="4" fill="#3a2632" stroke="#e05a7d"/>
    <text x="164" y="142" fill="#e6e6e6" font-size="11" text-anchor="middle">測試 8</text>
    <rect x="312" y="124" width="144" height="26" rx="4" fill="#2e2a1a" stroke="#d6a45c"/>
    <text x="384" y="142" fill="#e6e6e6" font-size="11" text-anchor="middle">lint 4</text>
    <rect x="460" y="124" width="108" height="26" rx="4" fill="#262b3a" stroke="#3a4154"/>
    <text x="514" y="142" fill="#9aa4b2" font-size="10" text-anchor="middle">基礎設施 3</text>
    <text x="576" y="142" fill="#9aa4b2" font-size="10" text-anchor="start">mypy 0</text>
    <text x="20" y="178" fill="#e6e6e6" font-size="12" text-anchor="start" font-weight="bold">8 次測試紅燈,攔下了</text>
    <rect x="20" y="188" width="108" height="44" rx="4" fill="#3a2632" stroke="#e05a7d"/>
    <text x="74" y="206" fill="#e6e6e6" font-size="10.5" text-anchor="middle">靜默 bug ×3</text>
    <text x="74" y="222" fill="#9aa4b2" font-size="9.5" text-anchor="middle">repo 狀態變 CLEAN</text>
    <rect x="132" y="188" width="72" height="44" rx="4" fill="#3a2632" stroke="#e05a7d"/>
    <text x="168" y="206" fill="#e6e6e6" font-size="10.5" text-anchor="middle">單一 OS ×2</text>
    <text x="168" y="222" fill="#9aa4b2" font-size="9.5" text-anchor="middle">內容已確認</text>
    <rect x="208" y="188" width="72" height="44" rx="4" fill="#262b3a" stroke="#3a4154"/>
    <text x="244" y="206" fill="#9aa4b2" font-size="10.5" text-anchor="middle">單一 OS ×2</text>
    <text x="244" y="222" fill="#9aa4b2" font-size="9.5" text-anchor="middle">log 已過期</text>
    <rect x="284" y="188" width="36" height="44" rx="4" fill="#2e2a1a" stroke="#d6a45c"/>
    <text x="302" y="214" fill="#e6e6e6" font-size="9.5" text-anchor="middle">flaky</text>
    <rect x="340" y="188" width="280" height="44" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="480" y="207" fill="#54b890" font-size="12" text-anchor="middle" font-weight="bold">15 次全在 PR branch</text>
    <text x="480" y="223" fill="#e6e6e6" font-size="10" text-anchor="middle">漏進 master:0 次</text>
    <text x="20" y="262" fill="#9aa4b2" font-size="10" text-anchor="start">「log 已過期」的兩次只知道紅在哪個平台、不知道是哪個測試。flaky 那次是唯一帶著紅燈 merge 的 PR。</text>
    <text x="20" y="282" fill="#9aa4b2" font-size="10" text-anchor="start">取消 22 次:21 次是 master 上被較新的 merge 取代,1 次是 PR 上被新 push 取代。</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">GitCrisp CI 的紅燈帳本(2026-05-17 至 10-05)。紅燈不多,但每一次都停在 PR 上——這是護欄唯一該在的位置。</figcaption>
</figure>

數字本身很平淡:15 次紅燈,一半是測試,lint 和基礎設施各占一些,mypy 一次都沒紅過。真正值得講的是那 8 次測試紅燈裡的兩組。

**pygit2 1.20 的靜默 bug。**Dependabot 開了一個升級 pygit2 的 PR,CI 在三個平台全紅,而且連紅了三次、卡了十一天。原因是 pygit2 1.20 拿掉了舊的 `GIT_*` 常數,而 GitCrisp 讀 repo 狀態的那段 code 是用 `getattr(pygit2, name, None)` 去查表的——常數不見了不會報錯,只是整張對照表變空,`state()` 一路落到預設值 `CLEAN`。修掉它的那個 commit 寫得很清楚:**「使用者看到的後果比 import 失敗還糟。」**一個卡在 merge 衝突中間的 repo 會顯示「沒有進行中的操作」,衝突提示不會出現,abort / continue 的按鈕也點不到。

讀過[[ai-incident-clock|事故篇]]的人應該認得這個形狀:**失敗等於沉默。**它不會 crash、不會跳錯誤,它只是安靜地告訴你一切正常。這種 bug 在 Production 上最難發現,而它在這裡被幾個寫死了「merge 中間要讀到 MERGING」的測試擋在 PR 上——三個平台全紅。

**只在一個作業系統出現的 bug。**一個 macOS 才有的版面重疊(差 1px)、一個 Windows 才有的 heap corruption;另外還有兩次只在 Linux 或只在 Windows 紅,但 log 已經過期,查不到是哪個測試。三平台矩陣讓 CI 跑三倍的時間,換來的就是這幾次——在單一平台的 CI 上,它們都是綠的。

另外要誠實記一筆:**唯一一個帶著紅燈 merge 的 PR,紅的是一個 flaky 測試**——一個跟排程器賽跑的 debounce 測試,跟那個 PR 的改動無關。它事後被另一個 PR 修掉了。flaky 測試的真正成本不是那一次,是它教會人「紅燈有時候可以不理」。

## 帳本二:故意改壞,測試會不會紅

帳本一回答了「它擋下了什麼」,但它只看得到有人真的寫錯的那幾次。要知道護欄有多強,得反過來問:**如果 code 錯了,它會不會紅?**這就是 mutation testing 的做法——故意在程式裡改一個地方(`==` 換成 `!=`、`and` 換成 `or`、數字加一、回傳值換成 `None`),跑一次完整測試,看有沒有任何一個測試變紅。紅了,叫「殺掉」這個 mutant;全綠,就是它「存活」——一個測試網沒接住的錯。

我請 AI 在 GitCrisp 的四層架構裡各隨機抽 15 處(domain 只找得到 4 處可改的,因為那一層幾乎只有資料結構和介面定義),一共 49 個 mutant,每個跑一次完整的 1294 個測試。存活的 24 個再逐一人工分類:有 7 個是**等價變異**——改了也不影響行為,像是 Protocol 介面上的預設參數(實作從不執行它)、版面邊距從 4px 變 5px——這些測試抓不到是應該的,不算缺口。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 330" role="img" aria-label="GitCrisp 四層架構的護欄強度。由上到下:presentation 層,一萬五千行程式、一萬三千七百行測試,扣掉等價變異後十一個 mutant 殺掉五個,約百分之四十五;application 層,八百行程式、八百行測試,十五個殺掉十二個,百分之八十;infrastructure 層,三千一百行程式、四千一百行測試,十五個殺掉七個,約百分之四十七;domain 層,四百行,只有一個有效 mutant,被殺掉。右側標注每一層有沒有被 mypy 檢查:只有 application 和 domain 有。層與層之間的接縫用虛線標出:各層的測試都在自己那層裡測,presentation 的測試把下層 mock 掉,接縫只靠 e2e 守——e2e 測試只占全部測試的百分之一點七,卻殺掉了二十五個裡的四個。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="20" y="22" fill="#9aa4b2" font-size="10" text-anchor="start">層 · 程式 / 測試行數</text>
    <text x="400" y="22" fill="#9aa4b2" font-size="10" text-anchor="start">mutant 被殺掉的比例(扣掉等價變異)</text>
    <rect x="20" y="34" width="200" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="120" y="55" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">presentation</text>
    <text x="120" y="73" fill="#9aa4b2" font-size="10" text-anchor="middle">15.2k / 13.7k</text>
    <rect x="240" y="47" width="150" height="24" rx="4" fill="#262b3a" stroke="#3a4154"/>
    <rect x="240" y="47" width="68" height="24" rx="4" fill="#3a2632" stroke="#e05a7d"/>
    <text x="400" y="64" fill="#e6e6e6" font-size="11" text-anchor="start">5 / 11 ≈ 45%</text>
    <line x1="120" y1="84" x2="120" y2="110" stroke="#d6a45c" stroke-width="1.5" stroke-dasharray="4 3"/>
    <text x="132" y="101" fill="#d6a45c" font-size="9.5" text-anchor="start">接縫:下層被 mock 掉</text>
    <rect x="20" y="110" width="200" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="120" y="131" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">application</text>
    <text x="120" y="149" fill="#9aa4b2" font-size="10" text-anchor="middle">0.8k / 0.8k</text>
    <rect x="240" y="123" width="150" height="24" rx="4" fill="#262b3a" stroke="#3a4154"/>
    <rect x="240" y="123" width="120" height="24" rx="4" fill="#223528" stroke="#54b890"/>
    <text x="400" y="140" fill="#e6e6e6" font-size="11" text-anchor="start">12 / 15 = 80%</text>
    <line x1="120" y1="160" x2="120" y2="186" stroke="#d6a45c" stroke-width="1.5" stroke-dasharray="4 3"/>
    <text x="132" y="177" fill="#d6a45c" font-size="9.5" text-anchor="start">接縫:各測各的</text>
    <rect x="20" y="186" width="200" height="50" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="120" y="207" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">infrastructure</text>
    <text x="120" y="225" fill="#9aa4b2" font-size="10" text-anchor="middle">3.1k / 4.2k</text>
    <rect x="240" y="199" width="150" height="24" rx="4" fill="#262b3a" stroke="#3a4154"/>
    <rect x="240" y="199" width="70" height="24" rx="4" fill="#3a2632" stroke="#e05a7d"/>
    <text x="400" y="216" fill="#e6e6e6" font-size="11" text-anchor="start">7 / 15 ≈ 47%</text>
    <rect x="20" y="246" width="200" height="40" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="120" y="263" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">domain</text>
    <text x="120" y="278" fill="#9aa4b2" font-size="10" text-anchor="middle">0.4k / 0.3k</text>
    <text x="240" y="271" fill="#9aa4b2" font-size="10.5" text-anchor="start">有效 mutant 只有 1 個(被殺掉)</text>
    <text x="520" y="140" fill="#54b890" font-size="10" text-anchor="start">mypy ✓</text>
    <text x="520" y="64" fill="#9aa4b2" font-size="10" text-anchor="start">mypy ✗</text>
    <text x="520" y="216" fill="#9aa4b2" font-size="10" text-anchor="start">mypy ✗</text>
    <text x="520" y="271" fill="#54b890" font-size="10" text-anchor="start">mypy ✓</text>
    <text x="20" y="312" fill="#d6a45c" font-size="11" text-anchor="start">守接縫的只有 e2e:占全部測試的 1.7%,卻殺掉了 25 個 mutant 裡的 4 個</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">GitCrisp 四層的護欄強度。測試行數跟程式行數差不多(全部 20.3k 對 19.8k),但強度差很多——而漏網的錯,集中在層與層之間。</figcaption>
</figure>

扣掉等價變異,42 個有效 mutant 殺掉 25 個,**約六成**。這個數字要分層看才有意義:

**application 層最強,80%。**這一層幾乎全是一行的 pass-through——`return self._reader.get_stashes()`——而它們大多有一個專門的 delegation 測試:「呼叫 query,確認它把參數原封不動交給 reader」。這種測試看起來很蠢,但它正是在檢查「錯了會不會紅」。

**infrastructure 和 presentation 都不到一半。**存活下來的 17 個真缺口裡,有幾個很實在:diff 比對檔名的 `==` 換成 `!=`,會回傳**別的檔案**的 hunk;刪除 remote tag 後更新快取的 `!=` 換成 `==`,快取裡會只剩被刪掉的那個 tag;worktree 被鎖住的錯誤判斷反過來,會跳錯對話框。測試全綠。

**最值得講的是接縫。**有三個 application 層的 mutant 存活了,包括「檔案歷史」的 query 直接回傳 `None`——檔案歷史這個功能整個壞掉,1294 個測試沒有一個紅。這不是因為沒人測檔案歷史:infrastructure 有專門測它的 reader,presentation 也有測「選單點下去會不會發出檔案歷史的 signal」。問題是 **presentation 那邊的 query 是 `MagicMock`,infrastructure 那邊直接測 reader**——兩邊各自都對,中間那一行 pass-through 斷掉,沒有任何一層的測試看得到。真正守住層與層之間的,只有 e2e journey:它們只占全部測試的 1.7%,卻殺掉了 25 個 mutant 裡的 4 個。

## 護欄的遞迴與止損點

[[responsibility-funnel|第一篇]]留了一個問題沒有答完:**測試也是 AI 寫的,那誰驗收測試?**這條遞迴沒有終點——驗收測試的東西也需要被驗收——當時給的止損點是「人對護欄本身做抽查」。

這次的實驗把那個「抽查」具體化了:**不要逐行讀測試,去把 code 改壞,看測試有沒有發現。**兩萬行測試沒有人讀得完,但 49 個 mutant 在六個平行的 worker 上跑完,總計不到一個小時的機器時間,就畫出了上面那張地圖——哪一層強、哪一層弱、漏網的錯長什麼樣子。這是一個人用 review 永遠拿不到的視角:review 看的是測試寫了什麼,mutation 看的是測試**擋得住什麼**。

它跟[[ai-review-craft|上一篇]]的抓蟲實驗其實是同一件事的兩個方向:上一篇是「埋 bug,看 reviewer 抓不抓得到」,這一篇是「埋 bug,看測試抓不抓得到」。兩者都是在問同一個問題——**你以為有的那道防線,真的在嗎?**

## 護欄的投資報酬

護欄的投資報酬怎麼算?誠實的答案是:**擋下來的 bug 沒辦法標價**——pygit2 那個靜默 bug 如果漏進 release,會花掉多少使用者的時間、多少信任,沒有數字。但兩邊的成本結構可以看清楚:

- **成本那一邊,在 AI 年代大幅下降了。**GitCrisp 的測試行數跟程式行數幾乎一樣多(20.3k 對 19.8k),在人手寫測試的年代這是一個很重的比例;但這個專案 904 個非 merge commit 裡有 528 個標著 Claude 共同撰寫,寫測試的邊際成本已經接近寫 code 的邊際成本。還留在人身上的成本是另外兩種:**CI 的時間**(三平台矩陣讓每次跑三倍),和 **flaky 測試的信任成本**。
- **報酬那一邊,形狀沒變。**它依然是稀疏的、不可預測的——五個月 15 次紅燈,真正有份量的大概就一兩次。但那一兩次,就是靜默 bug 和只在某個平台出現的 bug,恰好是人最難靠 review 抓到的兩種。

所以在 AI 產線裡,問題從「要不要寫測試」移到了「**測試夠不夠強**」。前者的成本已經被 AI 壓低了;後者沒有,因為 AI 寫出來的測試,一樣會只用一個 stash。

## 反思

### 測試行數是產量,不是強度

GitCrisp 有兩萬行測試,這個數字很容易被拿來當成「護欄很完整」的證據。這次的實驗說明它不是:application 層八百行測試換到 80% 的攔截率,presentation 層一萬三千七百行只換到 45%。行數衡量的是 AI 寫了多少測試,不是測試擋住了多少錯。**一個指標如果 AI 可以輕易把它衝高,它就不再能告訴你護欄有多強**——行數、覆蓋率都是。mutation testing 的攔截率比較難灌水,因為要讓它上升,測試必須真的在錯的時候變紅。

### 漏網的錯住在接縫裡

Clean Architecture 讓每一層都容易測,這是它的優點,也是這次實驗看到的盲點:每一層的測試都在自己的格子裡測,而格子跟格子之間的那條線,不屬於任何一層。這正是 AI 產線最容易出事的地方——AI 很擅長把每一層各自做對、各自補上測試,但「這一層交給下一層的東西,下一層真的照著用嗎」不在任何一層的測試範圍裡。所以 e2e 測試在 AI 產線的地位應該被重新估價:它們慢、少、難寫,但它們是唯一跨越接縫的護欄。

### 護欄自己也要被驗收

這個系列反覆在講一件事:頸的存在不是畫出來的,是每一次真的擋下東西維持出來的。護欄也一樣——一套從來沒被故意打破過的測試,你不知道它是護欄還是裝飾。CI 帳本只能告訴你它擋下過什麼,mutation 才能告訴你它會漏掉什麼。**護欄不是寫完就好的東西,它要被定期打破、被驗收,就像它驗收 code 一樣。**

系列前情:[[responsibility-funnel|#1 責任漏斗]] · [[ai-incident-clock|#2 頸上有時鐘]] · [[ai-responsibility-design|#3 看板上的頸]] · [[ai-responsibility-premium|#4 責任的保費]] · [[ai-spec-craft|#5 規範即程式]] · [[ai-review-craft|#6 驗收的手藝]]
