---
title: "這個部落格本身,就是一個作品:把寫作做成一條產線"
date: 2026-08-07
category: tech
tags:
  - side-project
  - automation
  - ai
---
## 前言

寫了 [旅遊分帳](/blog/travel-split/) 和 [GitCrisp](/blog/gitcrisp/) 的介紹之後,發現漏了一個最常被使用的作品——你現在正在看的這個網站。它不是「架個 blog」:一百六十多篇文章、十幾個系列、一排小工具的背後,是一個 Astro 靜態站加上一整套自製的知識網絡,和一條把「寫作」當工程來跑的產線。這篇拆開來講。

## 文章之間會自己長出網絡

這個站最不像一般部落格的地方,是文章不是孤島。寫作時我只做一件事:在內文用 `[[slug|說法]]` 引用另一篇文章;剩下的,build 的時候自動發生:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 270" role="img" aria-label="一個 wiki-link 在 build 時展開成三個產物:文章內文的普通連結、被引用那篇文末「被引用於」的反向連結(依章節分組)、以及知識圖譜頁的一條邊。搜尋索引與 RSS 也由同一份內容產生。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <rect x="20" y="95" width="190" height="80" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="115" y="120" fill="#4f6df5" font-size="12" text-anchor="middle" font-weight="bold">寫作時只寫一個</text>
    <text x="115" y="142" fill="#e6e6e6" font-size="12" text-anchor="middle" font-family="monospace">[[slug|說法]]</text>
    <text x="115" y="162" fill="#9aa4b2" font-size="9" text-anchor="middle">remark plugin 在 build 時展開</text>
    <rect x="330" y="20" width="290" height="60" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="475" y="44" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">① 內文連結</text>
    <text x="475" y="62" fill="#9aa4b2" font-size="9" text-anchor="middle">讀者順著文脈跳到對的段落(支援標題錨點)</text>
    <rect x="330" y="100" width="290" height="60" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="475" y="124" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">② 對方文末的「🔗 被引用於」</text>
    <text x="475" y="142" fill="#9aa4b2" font-size="9" text-anchor="middle">反向連結自動生成,還依引用所在章節分組</text>
    <rect x="330" y="180" width="290" height="60" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="475" y="204" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">③ 知識圖譜的一條邊</text>
    <text x="475" y="222" fill="#9aa4b2" font-size="9" text-anchor="middle">/graph/ 頁把全站文章畫成一張互動網絡圖</text>
    <line x1="210" y1="120" x2="330" y2="50" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="210" y1="135" x2="330" y2="130" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="210" y1="150" x2="330" y2="210" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="320" y="258" fill="#9aa4b2" font-size="10" text-anchor="middle">寫一次,長三個地方——文章寫得越多,舊文章越值錢</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">自製的 remark wiki-link plugin:寫作端只留一個心智負擔,網絡是編譯出來的。</figcaption>
</figure>

同一份 Markdown 內容,還會再編譯出全站搜尋索引、RSS、sitemap 和系列導覽(每篇文章的系列框、上一篇/下一篇、[從這裡開始](/start/) 的分層地圖,全部由 frontmatter 的 `series` 欄位驅動,單一資料來源)。**寫作的介面越簡單,系統在背後做的事就得越多**——這個取捨永遠值得。

## 靜態站的「動態感」

整個站是純靜態的 GitHub Pages,零後端、零資料庫,但幾個機制讓它不像靜態站:

- **OG 分享圖自動生成**:pre-commit hook 偵測到文章變更,用 sharp 為每篇文章渲染 1200×630 的分享圖並跟著同一個 commit 進版——貼到社群的連結永遠有對的縮圖,而我從來不用想起這件事。
- **全站離線可讀**:build 時生成 service worker,把整個站(約 11MB)預快取;第一次造訪會在右下角看到一顆安靜的進度藥丸,跑完之後——飛機上也能讀完整個 DDIA 系列。
- **留言掛在 GitHub Issues 上**(utterances):靜態站不用自己養留言後端,而且留言的人就是會逛 GitHub 的人,雜訊天然過濾。

## 產線:寫作的工程化

真正讓這個站能穩定產出的,不是上面的功能,是 repo 裡那些讀者看不到的東西:

- **`docs/` 裡的系列 roadmap**——每個系列動筆前先有一份素材庫:章節規劃、事故細節、數字、金句,寫作時只是把已經想清楚的東西鋪出來。
- **寫作規範做成 Claude Code 的 skill**——文章結構(圖像 + 摘要 + 反思)、繁中台灣用語對照表(84 行的 style guide)、SVG 的技術陷阱,全部文件化;每次寫作,規範自動載入。
- **85 個測試**——小工具的計算邏輯(分帳、計算機、轉盤幾何)全部抽成無 DOM 的純函式,`node --test` 直接驗;連 wiki-link 解析器和 service worker 的預快取清單都有測試。
- **硬規矩**:不直接碰 master,所有改動走 branch + PR。一個人的專案也照跑——因為 review 的價值不在「另一個人」,在「另一個時刻的自己」。

然後是這條產線最誠實的一個事實:**這個站的工程面,大部分是 Claude Code 做的**。commit 紀錄的作者欄寫得清清楚楚。方法跟 [GitCrisp](/blog/gitcrisp/) 完全同一套——規範文件是護欄、測試是安全網、每個 PR 我來 review。分工也很清楚:文章的觀點、經驗、反思是我的;把功能長出來的手,很多時候是 AI 的。

## 反思

### 部落格是產品,不是日記

大多數技術部落格死於第四篇文章,死因是把寫作當意志力問題。我把它當系統設計問題:**降低單篇成本**(roadmap 先想清楚、規範自動載入、OG 圖自動生成),**提高單篇價值**(一張圖講清楚一個模型),**讓文章互相增值**(wiki-link 網絡,新文章會把舊文章連活)。意志力會耗盡,系統不會。這跟做產品是同一回事——你不會靠熱血維運一個服務,憑什麼靠熱血維運一個部落格。

### 自己的平台,才有實驗的自由

文章放 Medium 或 Facebook 也能被看到,但你不可能在別人的平台上長出 knowledge graph、離線快取,或者一個分帳工具。自有平台的意義不是「資料是我的」這種口號,是**這裡是我的實驗室**:任何一個「要是能這樣就好了」的念頭,週末就能變成上線的功能。這個站的每個特殊功能,都是這樣長出來的。

### 寫清楚,是槓桿最高的工程能力

回頭看,這條產線訓練的其實不是寫作,是**把事情想到能寫清楚的程度**:一個系列的 roadmap,方法上跟帶團隊拆一個大專案沒有兩樣;一篇文章的那張圖,就是把心智模型逼到攤在桌面上。白天當 Engineering Manager,寫規格、做決策記錄、review 設計文件——用的是完全同一塊肌肉。部落格是這塊肌肉的健身房,而且練出來的每一分,兩邊都用得上。

原始碼在這裡:[aidan79225.github.io](https://github.com/Aidan79225/aidan79225.github.io),MIT 授權——產線的每個零件(wiki-link plugin、OG 生成器、SW 腳本)都可以直接拿去用。
