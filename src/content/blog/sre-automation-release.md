---
title: "自動化、發布工程與簡單性:讓『改變』又快又安全"
date: 2026-07-14
category: tech
description: "自動化、發布工程、簡單性看起來是三個沒關係的主題,其實在回答同一個問題:怎麼讓『變更』既快又不出事。自動化的終點是把人從迴圈裡拿掉,但它會放大 blast radius——能一致地做對,就能一致地闖禍。發布工程把『怎麼上線』當成一門專業,靠 hermetic build 讓同樣輸入永遠 build 出同樣結果。而最反直覺的一課是:可靠度的真正來源,是簡單——每一行程式都是負債。"
tags:
  - sre
  - automation
series: "Google SRE 讀書筆記"
seriesOrder: 12
comments: true
draft: false
---
自動化、發布工程、簡單性,乍看是三個不相干的主題。但把它們擺在一起,會發現它們在回答**同一個問題**:怎麼讓「變更」既快又不出事?SRE 的三招答案分別是——用機器**一致地**做、把上線做成**可重現**的流程、以及讓要改的東西**本身夠小**。

## 自動化:終點是「把人從迴圈裡拿掉」

大家對自動化的直覺是「省時間」,但 SRE 眼中,自動化最大的價值其實是**一致性**——人做十次會有十種微妙差異,機器做一萬次都一樣。省時只是附帶好處,真正的目標是沿著一條階梯往上爬,最後**讓系統自己管自己、把人從操作迴圈裡拿掉**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 236" role="img" aria-label="自動化的演進階梯,由下往上四層。最底層手動 toil 人肉重複,慢易錯不一致無法規模化。第二層針對任務寫腳本,省時但腳本要人養換場景就失效。第三層通用自動化平台,跨系統重用一致可擴展。最上層自主自癒系統,系統自己管自己人退出迴圈。左側箭頭向上表示自動化程度越高人越不用碰。但自動化會放大 blast radius,能一致地做對就能一致地闖禍。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="au" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker></defs>
    <text x="318" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">自動化的演進:一路往上,把人從迴圈裡拿掉</text>
    <line x1="52" y1="196" x2="52" y2="40" stroke="#54b890" stroke-width="1.4" marker-end="url(#au)"/>
    <text x="40" y="120" fill="#54b890" font-size="8" text-anchor="middle" transform="rotate(-90 40 120)">自動化↑ · 人越不用碰</text>
    <rect x="70" y="34" width="486" height="34" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="86" y="55" fill="#54b890" font-size="9.2" text-anchor="start" font-weight="bold">④ 自主 / 自癒系統</text><text x="546" y="55" fill="#9aa4b2" font-size="8.3" text-anchor="end">系統自己管自己 → 人退出迴圈</text>
    <rect x="70" y="74" width="486" height="34" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="86" y="95" fill="#4f6df5" font-size="9.2" text-anchor="start" font-weight="bold">③ 通用自動化平台</text><text x="546" y="95" fill="#9aa4b2" font-size="8.3" text-anchor="end">跨系統重用、一致、可擴展</text>
    <rect x="70" y="114" width="486" height="34" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="86" y="135" fill="#e6e6e6" font-size="9.2" text-anchor="start" font-weight="bold">② 針對任務寫腳本</text><text x="546" y="135" fill="#9aa4b2" font-size="8.3" text-anchor="end">省時,但腳本要人養、換場景就失效</text>
    <rect x="70" y="154" width="486" height="34" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/><text x="86" y="175" fill="#d6a45c" font-size="9.2" text-anchor="start" font-weight="bold">① 手動操作(toil)</text><text x="546" y="175" fill="#9aa4b2" font-size="8.3" text-anchor="end">慢、易錯、不一致、無法規模化</text>
    <text x="318" y="212" fill="#e0733a" font-size="8.6" text-anchor="middle" font-weight="bold">⚠ 但自動化會放大 blast radius</text>
    <text x="318" y="228" fill="#9aa4b2" font-size="8.3" text-anchor="middle">能一致地做對,就能一致地闖禍——一鍵下錯,關掉的可能是整個機房</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">自動化不只是省時,它的核心價值是<b>一致性</b>與<b>可規模化</b>。但同一枚硬幣的反面是:自動化把「做對」放大的同時,也把「做錯」放大——Google 就有過自動化工具一口氣關掉整個資料中心的慘案。所以越往上爬,越要配上護欄(dry-run、逐步生效、人為確認關卡)</figcaption>
</figure>

這裡最反直覺的一課,是**自動化的危險來自它的優點**。一段會自動修復的腳本,寫對了能一致地救全世界,寫錯了也能一致地毀全世界——而且是用機器的速度、在你反應過來之前。所以 SRE 對自動化的態度不是「全自動最好」,而是**能力越大、護欄要越厚**:高風險動作要 dry-run 預演、要逐步生效(先一台、再一區)、要留人為確認的關卡。

## 發布工程:把「怎麼上線」當成一門專業

第二招是把「從程式碼到上線」這條路,當成一門**獨立的專業**來經營,而不是每個工程師各自手動兜。它的地基是四個原則,其中最關鍵的是 **hermetic build(密封建置)**:

- **自助式(self-service)**:團隊自己就能發布,不用排隊等某個人。
- **高頻率、小步發**:發得越頻繁,每次的差異越小、越好回滾——這跟 DevOps 的「逐步變更」是同一件事。
- **hermetic build(可重現)**:同樣的原始碼,今天 build、半年後 build、在誰的機器上 build,都吐出**位元完全一樣**的結果——不依賴「這台機器剛好裝了什麼」。
- **政策內建(enforced)**:哪些能上線、要通過哪些檢查,寫成流程強制執行,不是靠人自律。

hermetic build 為什麼重要?因為它把「**在我機器上明明可以**」這句話從根上消滅了。build 的結果只由你簽入的東西決定,跟環境無關——於是「這版到底包含什麼」變得**可稽核、可重現、可回滾**。出事時你能精準地退回上一個已知好的版本,而不是對著一個「大概是這樣組出來的」神秘產物束手無策。

## 簡單性:可靠度真正的來源

前兩招都在讓「改變」這件事變安全,但第三章給了一個更釜底抽薪的答案:**讓要改的東西本身變小**。可靠度最深的來源不是更多防護,而是**簡單**——因為能壞的地方,跟系統的複雜度成正比。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 210" role="img" aria-label="複雜度與可靠度的對照。左邊放任複雜長大:一直加功能特例選項,導致出錯面變大行為難預測,可靠度下降。右邊刻意保持簡單:最小 API 砍特例主動刪程式碼,出錯面小行為可預測,可靠度上升。結論每一行程式都是負債,能動的程式碼越少能壞的地方越少。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="sp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="18" x2="290" y2="162" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="30" fill="#e0733a" font-size="9.5" text-anchor="middle" font-weight="bold">放任複雜長大</text>
    <rect x="30" y="42" width="240" height="30" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="150" y="61" fill="#e6e6e6" font-size="8.4" text-anchor="middle">一直加功能 · 特例 · 選項</text>
    <line x1="150" y1="74" x2="150" y2="86" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#sp)"/>
    <rect x="30" y="88" width="240" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="150" y="107" fill="#9aa4b2" font-size="8.4" text-anchor="middle">出錯面變大、行為難預測</text>
    <line x1="150" y1="120" x2="150" y2="132" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#sp)"/>
    <rect x="30" y="134" width="240" height="28" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="150" y="152" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">可靠度 ↓</text>
    <text x="430" y="30" fill="#54b890" font-size="9.5" text-anchor="middle" font-weight="bold">刻意保持簡單</text>
    <rect x="310" y="42" width="240" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="430" y="61" fill="#e6e6e6" font-size="8.4" text-anchor="middle">最小 API · 砍特例 · 主動刪程式碼</text>
    <line x1="430" y1="74" x2="430" y2="86" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#sp)"/>
    <rect x="310" y="88" width="240" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="430" y="107" fill="#9aa4b2" font-size="8.4" text-anchor="middle">出錯面小、行為可預測</text>
    <line x1="430" y1="120" x2="430" y2="132" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#sp)"/>
    <rect x="310" y="134" width="240" height="28" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="430" y="152" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">可靠度 ↑</text>
    <text x="290" y="186" fill="#d6a45c" font-size="9" text-anchor="middle" font-weight="bold">「每一行程式都是負債」</text>
    <text x="290" y="202" fill="#9aa4b2" font-size="8.5" text-anchor="middle">能動的程式碼越少,能壞的地方越少——SRE 把「刪掉的行數」當成正面成就</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">功能會一直有引力把系統推向複雜,而複雜度直接換算成「更多能出錯的地方、更難預測的行為」。所以簡單不是自然發生的,是要<b>刻意維護</b>的紀律:最小的 API、拒絕不必要的選項、甚至主動刪掉用不到的程式碼。無聊、可預測,在可靠度工程裡是美德,不是缺點</figcaption>
</figure>

這章有句話我很喜歡:**軟體工程師常把「寫了多少行」當成產出,但 SRE 會把「刪掉多少行」當成成就**。每一行活著的程式碼,都是一份要維護、可能出錯、會拖慢理解的負債。所以面對複雜,SRE 的直覺不是「再加一層來罩住它」,而是**先問這複雜是不是必要的、能不能拿掉**。可預測與無聊,在 Production 是最高的讚美。

## 反思

### 自動化真正的兩面刃,是它把「一致」也用在錯誤上

我以前寫自動化,腦子裡只有「幫我省時間」。但這章讓我換了個角度:自動化最強的地方是**一致**——而一致是中性的,它會一致地做對,也會一致地做錯。人手動操作雖然慢又煩,但人有個隱形的好處:**做到一半覺得不對勁會停下來**。自動化沒有這個直覺,它會用全速、對所有目標、把錯誤忠實地執行到底。所以我現在寫任何有破壞性的自動化(批次刪除、大量更新、一鍵部署),都會先問一句:**「這如果跑錯,炸掉的範圍有多大?」** 範圍越大,我就越捨得加那些看起來很囉唆的護欄——dry-run、先跑一小批看看、關鍵步驟留一個人為確認。能力越大,護欄要越厚,這是我從這章帶走最實用的一條。

### hermetic build:把「在我機器上可以」從根上消滅

「在我電腦上明明就會動」大概是工程界最著名的一句廢話,而 hermetic build 是我看過對它最徹底的解法——不是叫大家「注意環境一致」,而是**從架構上讓 build 不可能依賴環境**。這也是為什麼我對 Docker、鎖版本的 lockfile、可重現建置這些東西越來越偏執:它們的價值不在「方便」,而在**讓「這版到底是什麼」變成一個確定、可回滾的答案**。出事的半夜,你最想要的不是猜,是能一秒退回上一個已知好的版本——而那個能力,是平常一點一滴的 hermetic 紀律換來的。這跟我在資料那邊講的[[airflow-scheduling|冪等可重跑]]其實是同一種偏執:讓結果只由輸入決定,跟「什麼時候、在哪裡跑」無關。

### 簡單是最難的紀律,因為複雜總是偷偷長出來

「保持簡單」聽起來像廢話,但真正做過就知道它有多難——因為複雜從來不是一次長出來的,是每次「就多加一個小選項嘛」「這個特例先 hardcode 一下」慢慢堆出來的,每一步都合情合理,加總起來就是一團沒人敢動的東西。這章把「**每一行程式都是負債**」這句話釘進我腦裡之後,我 review code 的問題變了:以前問「這樣寫對不對」,現在會多問一句「**這段有必要存在嗎?能不能不加、甚至刪掉?**」。刪掉一個沒人用的功能、一個多餘的設定選項,帶來的可靠度紅利,常常比再寫一層防護還高。這跟整個 SRE 系列的精神是一致的:[[sre-cascading-failures|連鎖失效]]之所以可怕,連鎖的節點越多、系統越複雜,骨牌就倒得越遠——最好的防線,是一開始就別讓系統複雜到你自己都預測不了它。
