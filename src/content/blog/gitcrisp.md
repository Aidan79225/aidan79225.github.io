---
title: "GitCrisp:我和 AI 一起寫了一個 Git 桌面客戶端"
date: 2026-08-07
category: tech
tags:
  - side-project
  - system-design
  - ai
---
## 前言

[GitCrisp](https://blog.aidan.tw/GitCrisp/) 是一個桌面版的 Git 客戶端:視覺化 commit graph、逐 hunk staging、互動式 rebase、衝突解決介面、多倉庫管理,Python + PySide6(Qt)寫的,MIT 授權,[原始碼公開](https://github.com/Aidan79225/GitCrisp)。

幾個數字先講在前面:從開 repo 到功能齊全,三個半月、一百多個 PR、一萬六千行程式碼——加一萬三千行測試。一個人做不到這個速度;確切地說,是**一個人加 Claude Code** 做的。這篇想講的不是「Git 客戶端怎麼寫」,而是這個組合工作起來像什麼——因為我發現,帶一個 AI 開發產品,跟我白天帶工程師團隊,用的居然是同一套方法。

## 為什麼要再寫一個 Git 客戶端

市面上不缺 Git GUI:Fork、SourceTree、lazygit、GitKraken。但自己每天用的工具,永遠有幾個「要是它能這樣就好了」的瞬間;而 2026 年的不同在於——把這些瞬間變成一個真的產品的成本,已經低到一個人的下班時間就付得起。所以 GitCrisp 同時是兩件事:一個照我自己工作流長出來的 Git 客戶端,和一場實驗——**AI 協作的開發產線,撐不撐得起一個有架構、有測試、有打包發布的完整桌面產品?**

## 架構:分層不是儀式,是給 AI 的護欄

GitCrisp 用 Clean Architecture 分四層,依賴一律指向內圈:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 300" role="img" aria-label="GitCrisp 的 Clean Architecture 分層:presentation(PySide6 widgets、graph delegate、MD3 主題)與 infrastructure(pygit2 十個 ops mixin、subprocess)都依賴內圈;application(commands/queries)包住 domain(entities 與 ports protocol)。CLAUDE.md 把這個結構寫成給 AI 的規則。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <rect x="20" y="20" width="380" height="260" rx="10" fill="#262b3a" stroke="#3a4154"/>
    <text x="210" y="44" fill="#d6a45c" font-size="12" text-anchor="middle" font-weight="bold">presentation — PySide6</text>
    <text x="210" y="62" fill="#9aa4b2" font-size="10" text-anchor="middle">main window · graph delegate · MD3 theme tokens</text>
    <rect x="50" y="76" width="320" height="180" rx="10" fill="#1f2330" stroke="#4f6df5"/>
    <text x="210" y="100" fill="#4f6df5" font-size="12" text-anchor="middle" font-weight="bold">application</text>
    <text x="210" y="118" fill="#9aa4b2" font-size="10" text-anchor="middle">commands / queries(薄薄一層 use-case)</text>
    <rect x="90" y="132" width="240" height="100" rx="10" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="210" y="156" fill="#54b890" font-size="12" text-anchor="middle" font-weight="bold">domain</text>
    <text x="210" y="174" fill="#e6e6e6" font-size="10" text-anchor="middle">entities(純資料類)</text>
    <text x="210" y="190" fill="#e6e6e6" font-size="10" text-anchor="middle">ports(Protocol 介面)</text>
    <text x="210" y="208" fill="#9aa4b2" font-size="9" text-anchor="middle">零框架依賴</text>
    <rect x="440" y="76" width="180" height="180" rx="10" fill="#262b3a" stroke="#e05a7d"/>
    <text x="530" y="100" fill="#e05a7d" font-size="12" text-anchor="middle" font-weight="bold">infrastructure</text>
    <text x="530" y="118" fill="#9aa4b2" font-size="10" text-anchor="middle">pygit2 composite</text>
    <text x="530" y="136" fill="#9aa4b2" font-size="10" text-anchor="middle">十個 ops mixin:</text>
    <text x="530" y="154" fill="#e6e6e6" font-size="9" text-anchor="middle">branch / commit / diff / stage</text>
    <text x="530" y="170" fill="#e6e6e6" font-size="9" text-anchor="middle">merge-rebase / stash / tag</text>
    <text x="530" y="186" fill="#e6e6e6" font-size="9" text-anchor="middle">remote / submodule / worktree</text>
    <text x="530" y="212" fill="#9aa4b2" font-size="9" text-anchor="middle">+ subprocess(git apply)</text>
    <line x1="440" y1="166" x2="330" y2="166" stroke="#9aa4b2" stroke-width="1.5"/>
    <text x="385" y="158" fill="#9aa4b2" font-size="9" text-anchor="middle">實作 ports</text>
    <text x="320" y="292" fill="#9aa4b2" font-size="10" text-anchor="middle">依賴指向內圈:presentation → application → domain ← infrastructure</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">和這個部落格「從這裡開始」的組織方式是同一張圖——內圈穩定,外圈可換。</figcaption>
</figure>

在一人 side project 裡搞這套,以前我會說是儀式感;跟 AI 協作之後,我改口了:**架構約束是給 AI 的護欄**。這個結構連同規則被寫成 repo 裡的 `CLAUDE.md`——「domain 不准 import 框架」「所有顏色必須走 theme token,不准硬編碼色碼」——AI 每次動工前都會讀它。沒有這層護欄,AI 生成的程式碼會朝著「能跑就好」的方向熵增;有了它,一百多個 PR 累積下來,4 層邊界仍然乾淨。這跟帶團隊訂 coding standards 是同一件事,只是執行者從人變成了模型。

## pygit2,和它做不到的事

Git 操作主力走 [pygit2](https://www.pygit2.org/)(libgit2 的 Python 綁定):讀 commit graph、staging、branch、stash 都是程式庫內完成,不用每個動作都 fork 一個 `git` 行程。但 libgit2 有做不到的事——**逐 hunk staging** 就是其一。GitCrisp 的解法很務實:自己從 diff 組出只含那個 hunk 的 patch,丟給 `git apply --cached`,再把 index 讀回來。

這是我很喜歡的一種工程姿態:**用程式庫做它擅長的,遇到它的邊界就退回 CLI,不硬撐**。為了「純 pygit2」而重造 patch 引擎沒有任何意義——使用者只在乎勾了那個 hunk 之後,staged 的東西對不對。

## 桌面 App 的「即時感」是設計出來的

用過 Git GUI 的人都懂那個煩躁:在終端機 commit 了一筆,切回 GUI 還是舊畫面。GitCrisp 的自動刷新長這樣:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 240" role="img" aria-label="GitCrisp 自動刷新機制:QFileSystemWatcher 監看 .git 目錄的外部寫入,應用程式取得焦點時輪詢工作樹,兩個訊號源都匯入 200 毫秒防抖器後觸發重載;GitCrisp 自己引發的變更則有 500 毫秒抑制窗,避免自我觸發的無限刷新。重載後保留列表捲動位置。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <rect x="20" y="30" width="180" height="54" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="110" y="52" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">.git/ 檔案監看</text>
    <text x="110" y="70" fill="#9aa4b2" font-size="9" text-anchor="middle">終端機的 commit / checkout…</text>
    <rect x="20" y="110" width="180" height="54" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="110" y="132" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">視窗取得焦點</text>
    <text x="110" y="150" fill="#9aa4b2" font-size="9" text-anchor="middle">在編輯器改完檔案切回來</text>
    <rect x="260" y="70" width="130" height="54" rx="27" fill="#1f2330" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="325" y="92" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">防抖 200ms</text>
    <text x="325" y="110" fill="#9aa4b2" font-size="9" text-anchor="middle">連續事件併一次</text>
    <rect x="450" y="70" width="170" height="54" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="535" y="92" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">重新載入</text>
    <text x="535" y="110" fill="#9aa4b2" font-size="9" text-anchor="middle">保留捲動位置</text>
    <line x1="200" y1="57" x2="260" y2="90" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="200" y1="137" x2="260" y2="104" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="390" y1="97" x2="450" y2="97" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 535 124 C 535 180 325 190 325 140" fill="none" stroke="#e05a7d" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="430" y="185" fill="#e05a7d" font-size="10" text-anchor="middle">自己引發的變更 → 抑制 500ms,不自我觸發</text>
    <text x="320" y="228" fill="#9aa4b2" font-size="10" text-anchor="middle">兩個訊號源、一個防抖器、一個自我抑制窗——「畫面永遠是新的」其實是三個小機制</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">「它自己就更新了」的體感,拆開來是防抖、抑制、狀態保留三件小事,每一件都不難,難的是想到。</figcaption>
</figure>

這種功能不會出現在需求清單上——它是**每天用自己的工具**才會長出來的。dogfooding 不是口號:GitCrisp 的日常開發就是在 GitCrisp 裡 stage、commit、看 graph,自己的煩躁自己修。

## 一萬三千行測試在守什麼

測試碼量幾乎追平產品碼(13.5k vs 16.5k),對一人專案來說比例高得離譜——但這是 AI 產線的第二道護欄。AI 改東西又快又大膽,人工 review 接得住邏輯,接不住回歸;pytest + pytest-qt 的測試網讓每個 PR 都先過一輪「有沒有踩壞別人」的檢查,我才敢放心讓迭代保持這個速度。順帶一提,桌面 App 也掛了 Sentry——當工具發到別人手上,「使用者不會回報錯誤,只會默默不用」,可觀測性的習慣從後端一路帶到 desktop。

## 反思

### 帶 AI 跟帶團隊,是同一門手藝

這個專案給我最大的收穫,是驗證了一件事:我在工作裡當 Engineering Manager 的那套方法,對 AI 一樣有效——**把規範寫成文件**(CLAUDE.md 就是 onboarding 手冊)、**用架構劃邊界**(分層就是職責切分)、**用測試守質量**(CI 就是不知疲倦的 reviewer)、**每個 PR 都 review**(方向由我把、細節可以放)。反過來說也成立:如果一個人沒辦法把要求寫清楚、只會說「你就看著辦」,那他帶 AI 跟帶人都會失敗。AI 沒有降低工程管理的門檻,它把這門手藝的槓桿放大了。

### 完整度是練出來的,不是想出來的

寫到能動很容易,寫到「是個產品」很難:Windows installer、macOS 簽章、主題系統、錯誤回報、landing page——這些邊角佔掉的時間遠超過核心功能,卻是「工具」和「產品」的分界線。工作上這些事有專人分工,side project 逼你全部自己走一遍;走過一遍之後,你對團隊裡每個角色的同理心都是真的,不是想像的。

### 三個半月,一百個 PR,然後呢

GitCrisp 對我的意義不是「又多了一個作品」,而是校準:2026 年,一個工程師的下班時間 + AI 產線,可以產出這個等級的東西——那麼團隊的產出基準線在哪裡、工程師該把時間花在哪裡(答案越來越清楚:**規格、架構、review、品味**),這些問題我現在有第一手的手感,而不是轉述別人的觀點。這可能是 side project 在 AI 時代的新價值:它是你自己的實驗室。

工具在這裡:[GitCrisp 下載頁](https://blog.aidan.tw/GitCrisp/) · [GitHub](https://github.com/Aidan79225/GitCrisp)。用了覺得哪裡煩躁,開 issue——說不定下一個版本就是 AI 修給你的。
