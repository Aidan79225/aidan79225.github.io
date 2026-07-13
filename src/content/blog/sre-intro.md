---
title: "SRE 是什麼?從 Error Budget 講起"
date: 2026-07-09
category: tech
description: "SRE 常被誤解成『高級維運』或『會寫程式的 SysAdmin』。它的靈魂其實是一個轉念加一個機制:100% 可靠不是對的目標,而 Error Budget(= 1 − SLO)把『開發要快 vs 系統要穩』這場沒完沒了的戰爭,變成一道大家一起算的數學題。"
tags:
  - sre
  - reliability
series: "Google SRE 讀書筆記"
seriesOrder: 1
comments: true
draft: false
---
「SRE」這個詞很紅,但很常被誤解成「高級一點的維運」或「會寫程式的 SysAdmin」。讀完 Google 這本書我的體會是:它的靈魂根本不在職稱,而在**一個轉念 + 一個機制**——「100% 可靠不是對的目標」,以及用 **Error Budget** 把「開發要快 vs 系統要穩」這場永恆戰爭,變成一道兩邊一起算的數學題。先把這兩件事講透。

## SRE 是什麼:讓軟體工程師來做維運

Google 對 SRE 的原始定義很妙:**「當你叫一個軟體工程師去設計維運團隊,會發生的事。」** 一句話——**把維運當成一個軟體問題來解**,而不是用人力去堆。傳統維運遇到「事情變多」的答案往往是「加人」,人數跟著服務規模線性長;SRE 的答案是「寫程式把它自動化掉」,讓人力跟規模脫鉤。這個出發點,決定了後面所有實務的味道:能自動化的就別用人做、重複的手動操作被當成「待消滅的東西」而不是「認命要做的雜事」。

## 先破一個迷思:100% 可靠是錯的目標

大多數人直覺覺得可靠度當然是越高越好、最好 100%。但 SRE 的第一個反直覺是:**追求 100% 不但不對,還有害。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 202" role="img" aria-label="一條代表服務請求的長條:綠色 99.9% 是必須成功的 SLO 目標,紅色 0.1% 是允許失敗的 error budget,等於一個月約 43 分鐘。error budget = 1 減 SLO。註記:追到 100% 成本爆炸、邊際效益趨近零,使用者也分不出 99.9% 和 100%" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="280" y="26" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">可靠度目標訂在 99.9%,不是 100%</text>
    <text x="280" y="45" fill="#9aa4b2" font-size="9" text-anchor="middle">剩下的 0.1% 不是遺憾,是可以花的「預算」</text>
    <line x1="424" y1="66" x2="520" y2="66" stroke="#e0733a" stroke-width="1.3"/>
    <text x="472" y="60" fill="#e0733a" font-size="9" text-anchor="middle">Error Budget = 1 − SLO</text>
    <rect x="40" y="72" width="384" height="48" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/>
    <text x="232" y="100" fill="#e6e6e6" font-size="10.5" text-anchor="middle">服務成功 ≥ 99.9%(SLO 目標)</text>
    <rect x="424" y="72" width="96" height="48" rx="5" fill="#33291a" stroke="#e0733a" stroke-width="1.6"/>
    <text x="472" y="94" fill="#e0733a" font-size="9" text-anchor="middle">失敗 ≤ 0.1%</text>
    <text x="472" y="108" fill="#9aa4b2" font-size="7" text-anchor="middle">(刻意放大顯示)</text>
    <text x="472" y="138" fill="#9aa4b2" font-size="8.5" text-anchor="middle">≈ 一個月約 43 分鐘可壞</text>
    <text x="280" y="172" fill="#9aa4b2" font-size="8.7" text-anchor="middle">追到 100%:成本爆炸、邊際效益趨近零——使用者還分不出 99.9% 和 100%</text>
    <text x="280" y="187" fill="#9aa4b2" font-size="8.2" text-anchor="middle">(他手上的網路、手機、Wi-Fi 本來就沒那麼可靠)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">把可靠度訂成一個「夠好」的目標(SLO),剩下允許出錯的額度就是 <b style="color:#e0733a">Error Budget = 1 − SLO</b>。99.9% 聽起來很嚴,其實一個月還有約 43 分鐘的「壞掉預算」可花</figcaption>
</figure>

為什麼 100% 是錯的?三個理由:**成本**——從 99.9% 每往上一個「9」,投入都要翻好幾倍;**邊際效益**——趨近於零;**使用者根本感受不到**——他家的網路、手機、Wi-Fi 本來就沒那麼穩,你把後端從 99.9% 拉到 99.999%,他那端的體感一點差別都沒有。所以正確的問法不是「怎麼不出錯」,而是**「多可靠才算夠好」**——訂一個目標(SLO,下一篇專講),剩下那段允許出錯的額度,就叫 **Error Budget**。

## Error Budget:把 dev vs ops 的戰爭變成數學

Error budget 真正的威力,是它化解了一場幾乎每個團隊都在打的仗:**開發想快、想多推功能;維運想穩、不想亂動。** 這兩邊的目標天生對立,傳統上只能靠吵架、比職級、或 politics 決勝負。Error budget 給了一個客觀的公親:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 226" role="img" aria-label="開發想快多推功能、維運想穩少變動,兩邊都看中間的 Error Budget 做決定。還有預算就綠燈放手發布、承擔風險;預算燒光就紅燈凍結發布、全隊修穩定。衝突從吵架比職級變成看同一個數字" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="eb" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="24" y="28" width="156" height="48" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="102" y="49" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">開發(Dev)</text>
    <text x="102" y="65" fill="#9aa4b2" font-size="8.5" text-anchor="middle">想快、多推新功能</text>
    <rect x="212" y="26" width="156" height="52" rx="8" fill="#33291a" stroke="#d6a45c" stroke-width="1.8"/>
    <text x="290" y="48" fill="#d6a45c" font-size="11" text-anchor="middle" font-weight="bold">Error Budget</text>
    <text x="290" y="64" fill="#9aa4b2" font-size="8.5" text-anchor="middle">= 1 − SLO</text>
    <rect x="400" y="28" width="156" height="48" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/>
    <text x="478" y="49" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">維運(Ops)</text>
    <text x="478" y="65" fill="#9aa4b2" font-size="8.5" text-anchor="middle">想穩、少變動</text>
    <line x1="180" y1="52" x2="208" y2="52" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#eb)"/>
    <line x1="400" y1="52" x2="372" y2="52" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#eb)"/>
    <text x="290" y="94" fill="#9aa4b2" font-size="8.5" text-anchor="middle">兩邊都看這個做決定</text>
    <rect x="40" y="108" width="500" height="30" rx="6" fill="#1f2330" stroke="#54b890" stroke-width="1.3"/>
    <circle cx="62" cy="123" r="6" fill="#54b890"/>
    <text x="80" y="127" fill="#e6e6e6" font-size="9.5" text-anchor="start">還有預算 → 綠燈:放手發布新功能、可以承擔風險</text>
    <rect x="40" y="146" width="500" height="30" rx="6" fill="#1f2330" stroke="#e0733a" stroke-width="1.3"/>
    <circle cx="62" cy="161" r="6" fill="#e0733a"/>
    <text x="80" y="165" fill="#e6e6e6" font-size="9.5" text-anchor="start">預算燒光 → 紅燈:凍結發布,全隊回頭修穩定</text>
    <text x="290" y="202" fill="#9aa4b2" font-size="8.7" text-anchor="middle">衝突從「吵架、比職級」變成「看同一個數字」——兩邊利益一致</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Error budget 是 dev 和 ops 的共同公親:還有預算就綠燈、放手發布;燒光就紅燈、全隊回頭修穩定。決策依據從嗓門與職級,變成一個客觀的數字</figcaption>
</figure>

機制很簡單:**還有 error budget → 綠燈**,可以大膽發布、上高風險功能,反正壞了還在預算內;**預算燒光 → 紅燈**,凍結所有新功能發布,全隊回頭把穩定度修回來。妙的地方是它讓兩邊**利益一致**了——維運不會再無腦擋所有變動(因為「還有預算」就沒理由擋),開發也不會再無腦硬推(因為燒光了大家一起被凍結)。大家都變成想「把有限的預算,花在最值得的功能上」。

## 反思

### error budget 最強的地方,不是技術,是把「吵架」變成「看數字」

我在不同團隊都看過同一齣戲:要不要上這個有點風險的功能,開發和維運各執一詞,最後往往是誰嗓門大、誰職級高、誰跟主管關係好就贏。這種決策方式很消耗、也很不公平。Error budget 的設計之所以讓我拍案,是它把一個**人的衝突**,轉成了一個**客觀的量化問題**——「我們這個月的預算還剩多少?」兩邊不再是敵人,而是同一個預算的共同管理者。這是我看過最漂亮的「用機制化解人性衝突」的例子;它提醒我,**很多團隊裡的爭執,根源是缺一把公認的尺,而不是缺道理。**

### 「100% 不是目標」幾乎是所有工程判斷的通則

「別追求完美,追求夠好」這句話,遠不只適用於可靠度。過度追求任何指標——100% 覆蓋率、零技術債、極致效能——本質都是**過度工程**,把資源砸在邊際效益趨近零的地方。這跟我一直在講的 [[pain-before-power|先確認痛點,再上重武器]]是同一種紀律:**先問「多好才算夠」,再決定投入多少。** 多數系統根本不需要五個九;把追求那兩個多餘的「9」省下來的力氣,拿去做真正會被使用者感受到的事,划算太多。SRE 用 error budget 把這個判斷制度化了,而我把它當成看任何工程取捨的預設問句。

### SRE 的內核:維運可以、也應該被工程化

這本書最打動我的底層信念是:**維運不是「認命要做的雜事」,而是一堆「還沒被工程化的問題」。** 一旦你把重複的手動操作看成待消滅的 bug、而不是宿命,你的行為就變了——你不會再被 on-call 追著跑、疲於奔命,而會主動去想「這件事怎麼自動化掉、以後不用再有人半夜爬起來」。這個心態轉變,比任何工具或流程都重要,它決定了你是維運的奴隸還是主人。後面會講的消除 toil、監控、自動化,全都是這個信念的展開——而它的起點,就是這篇的 error budget:先量化「多穩才夠」,才談得上聰明地把力氣花在刀口上。
