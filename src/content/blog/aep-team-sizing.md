---
title: "團隊該多大:6 到 8 這個數字在買什麼"
date: 2026-09-11
category: tech
description: "Larson 給的數字很硬:一個 manager 帶 6 到 8 個工程師,manager of managers 帶 4 到 6 個 manager,少於四個人的團隊「跟個人沒兩樣」。但數字不是重點——重點是每個區間會把你這個 manager 變成完全不同的角色:TLM、投資者,還是只剩安全網。以及一條更少人講的下限,和「管理幅度不等於人頭」。"
tags:
  - engineering-management
series: "An Elegant Puzzle 讀書筆記"
seriesOrder: 2
comments: true
draft: false
---
「團隊該幾個人」聽起來像 HR 的題目——其實它是這本書第一個、也是最有操作性的系統設計題。Larson 給的數字很直接:**一個 manager 帶 6 到 8 個工程師,一個帶 manager 的 manager 帶 4 到 6 個 manager。**

但數字本身不是重點。重點是**每個區間會把你這個 manager 變成一個完全不同的角色**——而且多數人是在人數已經錯了之後,才發現自己的工作內容不知不覺換了一種。

## 6 到 8:這個數字在買什麼

先看整條軸。人數不是「你管得動幾個」的極限測試,而是**你每週還剩多少時間做投資型的事**:coaching、寫策略、推動跨團隊的改變。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 288" role="img" aria-label="一條以直屬人數為橫軸的圖,分成四個區間,並在上方畫出可投資時間的倒 U 形曲線。一到三人:你是 TLM,還在分擔設計與實作,可投資時間低,因為時間花在寫程式。四到五人:勉強成團,能輪替但很薄。六到八人:甜蜜點,可投資時間最高,還有餘裕做 coaching、寫策略、推動改變。九人以上:你退化成教練與安全網,只剩救火,投資時間趨近於零。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="310" y="22" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">直屬人數,決定你這個 manager 實際在做什麼</text>
    <text x="34" y="52" fill="#9aa4b2" font-size="9">可投資的時間(coaching / 寫策略 / 推動改變)</text>
    <polyline points="125,104 233,82 300,64 342,62 407,72 500,106 560,112" fill="none" stroke="#d6a45c" stroke-width="1.8"/>
    <circle cx="125" cy="104" r="3" fill="#d6a45c"/><circle cx="320" cy="62" r="3.5" fill="#d6a45c"/><circle cx="500" cy="106" r="3" fill="#d6a45c"/>
    <text x="320" y="50" fill="#d6a45c" font-size="9" text-anchor="middle">最高點</text>
    <rect x="60" y="122" width="130" height="66" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <text x="125" y="143" fill="#e6e6e6" font-size="10.5" text-anchor="middle">1–3 人</text>
    <text x="125" y="160" fill="#9aa4b2" font-size="9" text-anchor="middle">你是 TLM</text>
    <text x="125" y="176" fill="#9aa4b2" font-size="8.5" text-anchor="middle">還在分擔設計與實作</text>
    <rect x="196" y="122" width="80" height="66" rx="6" fill="#33291a" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="236" y="143" fill="#e6e6e6" font-size="10.5" text-anchor="middle">4–5 人</text>
    <text x="236" y="160" fill="#9aa4b2" font-size="9" text-anchor="middle">勉強成團</text>
    <text x="236" y="176" fill="#9aa4b2" font-size="8.5" text-anchor="middle">輪得動,但很薄</text>
    <rect x="282" y="122" width="122" height="66" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.8"/>
    <text x="343" y="143" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">6–8 人</text>
    <text x="343" y="160" fill="#54b890" font-size="9" text-anchor="middle">甜蜜點:你是投資者</text>
    <text x="343" y="176" fill="#9aa4b2" font-size="8.5" text-anchor="middle">帶人 + 寫策略 + 推改變</text>
    <rect x="410" y="122" width="150" height="66" rx="6" fill="#262b3a" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="485" y="143" fill="#e6e6e6" font-size="10.5" text-anchor="middle">9 人以上</text>
    <text x="485" y="160" fill="#e05a7d" font-size="9" text-anchor="middle">你退化成教練 + 安全網</text>
    <text x="485" y="176" fill="#9aa4b2" font-size="8.5" text-anchor="middle">只接得住問題,投資歸零</text>
    <line x1="60" y1="206" x2="580" y2="206" stroke="#3a4154" stroke-width="1.3"/>
    <text x="320" y="224" fill="#9aa4b2" font-size="9" text-anchor="middle">直屬工程師人數 →</text>
    <text x="310" y="252" fill="#9aa4b2" font-size="9" text-anchor="middle">同一條軸的上一層:manager of managers 帶 4–6 個 manager</text>
    <text x="310" y="270" fill="#9aa4b2" font-size="9" text-anchor="middle">(人再多,連「協調 manager」都會變成純轉發)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">兩端都不是「管不動」——兩端都是<b style="color:#d6a45c">可投資的時間被吃掉</b>:左邊被你自己的實作工作吃掉,右邊被接不完的問題吃掉。中間那段才是 manager 這個角色真正能產生複利的地方</figcaption>
</figure>

把四個區間攤開來講:

| 直屬人數 | 你實際變成什麼 | 代價 |
|---|---|---|
| **少於 4** | **TLM**(tech lead manager)——還在分擔設計與實作 | Larson 講得很白:這個位置對某些人是強項的舞台,但**職涯機會有限**。它是一個位置,不是一個階段 |
| **4–5** | 勉強是一個團隊 | 輪替得動,但一個人請長假就見底(下一節專講) |
| **6–8** | **投資者**——時間夠做 active coaching、協調、寫策略、推動改變 | 這是 Larson 給的甜蜜點,原因不是「管得動」,是**投資型工作還塞得進行事曆** |
| **超過 8–9** | **教練 + 安全網**——別人撞牆你接住 | 忙到沒辦法投資團隊、也沒辦法投資團隊負責的那塊領域。看起來很忙、很重要,但你已經停止改變任何事 |

這張表最值得停下來的一格是 **9 人以上**。它的症狀不是「有人沒被照顧到」——那太明顯了,反而會被處理;真正的症狀是**你每天都很忙、每件事都有接到、但這一季你沒有改掉任何一個系統**。對照[[aep-intro|第一篇]]講的:你變成了一台專門接事件的機器,而源頭一根寒毛都沒動。

## 下限比上限更重要:少於四個人,不是團隊

多數人講團隊規模只講上限——「超過幾個人就該拆」。Larson 反過來也給了下限,而且措辭很狠:**少於四個人的團隊是一個會漏的抽象(leaky abstraction),行為上跟個人沒兩樣。**

「抽象會漏」在這裡是精準的技術比喻:你以為你在跟一個團隊講話,實際上你在跟某個人講話。團隊這層抽象本來要提供的東西——**能輪替、能吸收波動、能在某個人不在時繼續運作**——三個人以下通通提供不了。一個人請假,團隊就不是「產能降 33%」,是**某一塊區域直接停擺**。

書上沒有算下限的公式,所以下面這條是我自己的:**真正的下限計算機是輪值。** 一個要 on-call 的團隊,人數不夠就沒有輪值表可言,只有「那個人」——他休假、他生病、他離職,系統就沒有人接。[[sre-alerting-oncall|SRE 那篇]]講告警與 on-call 的機制,但機制的前提是**有人可以輪**;人數不足時,再漂亮的 runbook 都只是給同一個人看的。

所以三人以下的隊伍不是「小團隊」,是「**一個人加上兩個幫手**」。這不必然是壞事——很多階段就是這樣,而且跑得很快。壞的是你用團隊的語言去管理它:訂了團隊的 KPI、設計了團隊的流程、期待它有團隊的韌性,然後在那個人離職的那一天發現什麼都沒有。

## 團隊怎麼長出來:養到 8–10 再分裂,絕不開空團隊

那要怎麼從一隊變兩隊?Larson 的做法違反直覺,但邏輯很硬:**先把現有團隊養到 8 到 10 人,再分裂(bud)成兩個 4 到 5 人的團隊——絕對不要先開一個空團隊再往裡面招人。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 262" role="img" aria-label="兩種建立新團隊的方式對照。上方是分裂法:先把一個六到八人的團隊養到八到十人,再分裂成兩個各四到五人的團隊,兩隊一出生就能運作。下方是開空團隊法:先開一個空的新團隊,從原團隊抽走一兩個人,再慢慢對外招募,結果原團隊被掏空、新團隊長期不到三人,兩邊同時變弱。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="aep2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="46" y="26" fill="#54b890" font-size="11" text-anchor="start" font-weight="bold">分裂:養大再分</text>
    <rect x="46" y="38" width="108" height="44" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <text x="100" y="58" fill="#e6e6e6" font-size="10" text-anchor="middle">既有團隊</text>
    <text x="100" y="73" fill="#9aa4b2" font-size="9" text-anchor="middle">6–8 人</text>
    <line x1="154" y1="60" x2="196" y2="60" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#aep2)"/>
    <text x="175" y="50" fill="#9aa4b2" font-size="8.5" text-anchor="middle">先招</text>
    <rect x="200" y="38" width="108" height="44" rx="7" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/>
    <text x="254" y="58" fill="#e6e6e6" font-size="10" text-anchor="middle">養到 8–10 人</text>
    <text x="254" y="73" fill="#54b890" font-size="9" text-anchor="middle">暫時超載,但撐得住</text>
    <line x1="308" y1="60" x2="350" y2="60" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#aep2)"/>
    <text x="329" y="50" fill="#9aa4b2" font-size="8.5" text-anchor="middle">再分</text>
    <rect x="354" y="26" width="104" height="32" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/>
    <text x="406" y="46" fill="#e6e6e6" font-size="9.5" text-anchor="middle">新隊 A · 4–5 人</text>
    <rect x="354" y="64" width="104" height="32" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/>
    <text x="406" y="84" fill="#e6e6e6" font-size="9.5" text-anchor="middle">新隊 B · 4–5 人</text>
    <text x="540" y="54" fill="#54b890" font-size="9" text-anchor="middle">兩隊一出生</text>
    <text x="540" y="68" fill="#54b890" font-size="9" text-anchor="middle">就能運作 ✓</text>
    <line x1="40" y1="118" x2="580" y2="118" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="46" y="146" fill="#e05a7d" font-size="11" text-anchor="start" font-weight="bold">開空團隊:先有框,再找人</text>
    <rect x="46" y="158" width="108" height="44" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <text x="100" y="178" fill="#e6e6e6" font-size="10" text-anchor="middle">既有團隊</text>
    <text x="100" y="193" fill="#9aa4b2" font-size="9" text-anchor="middle">6–8 人</text>
    <line x1="154" y1="180" x2="196" y2="180" stroke="#e05a7d" stroke-width="1.3" marker-end="url(#aep2)"/>
    <text x="175" y="170" fill="#e05a7d" font-size="8.5" text-anchor="middle">抽人</text>
    <rect x="200" y="158" width="108" height="44" rx="7" fill="#262b3a" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="254" y="178" fill="#e05a7d" font-size="10" text-anchor="middle">原隊剩 4–6 人</text>
    <text x="254" y="193" fill="#9aa4b2" font-size="9" text-anchor="middle">交付能力先掉一截</text>
    <rect x="354" y="158" width="104" height="44" rx="7" fill="#262b3a" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="406" y="178" fill="#e05a7d" font-size="9.5" text-anchor="middle">新隊 1–2 人</text>
    <text x="406" y="193" fill="#9aa4b2" font-size="9" text-anchor="middle">等招募,一等半年</text>
    <line x1="308" y1="180" x2="350" y2="180" stroke="#e05a7d" stroke-width="1.3" marker-end="url(#aep2)"/>
    <text x="540" y="174" fill="#e05a7d" font-size="9" text-anchor="middle">兩邊同時變弱</text>
    <text x="540" y="188" fill="#e05a7d" font-size="9" text-anchor="middle">而且沒人負責 ✗</text>
    <text x="310" y="238" fill="#9aa4b2" font-size="9" text-anchor="middle">空團隊的真正代價:它在組織圖上已經存在、在 roadmap 上已經被算進去,</text>
    <text x="310" y="252" fill="#9aa4b2" font-size="9" text-anchor="middle">但在現實裡半年內不會有交付能力——而那半年的期待,是原團隊在還</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">分裂法讓兩支隊伍一出生就過得了「四人下限」;開空團隊則是同時製造兩個過小的團隊,再用招募的時間差把帳掛在原團隊頭上</figcaption>
</figure>

「絕不開空團隊」這條在小公司特別容易被違反,因為開一個團隊的名字幾乎零成本:寫進組織圖、開個 channel、指定一個 owner,就宣告成立了。但**團隊是一種承諾,不是一個標籤**——它一旦存在,就會有人把需求丟進去、把 roadmap 上的工作算給它;而它在真的招到人以前,唯一的產能來源是原團隊。

同樣的邏輯也適用於「我們人太多了,拆成兩隊吧」:把 8 個人拆成 4+4 是分裂,把 6 個人拆成 3+3 是**同時製造兩個跟個人沒兩樣的隊伍**,而且你還多了一條需要協調的邊界。多數團隊在拆之前該問的不是「幾個人」,是「這兩塊工作真的可以獨立走嗎」——不行的話,拆完只是把原本的內部溝通變成跨團隊溝通,成本翻倍。

## 管理幅度不等於人頭

書的第 4 章有一節專門講 **managerial scope(管理幅度)**,和這章配起來讀剛好補上一個常見誤會:**想成長不是去要更多人頭,是去接更重要、更複雜的一塊。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 200" role="img" aria-label="兩個帶同樣六個人的 manager 對照。左邊 A 負責一個內部後台,責任面積小、外部相依少;右邊 B 負責整條結帳與金流鏈,責任面積大、串接多個外部系統、出事會直接影響營收。兩人的人頭數相同,管理幅度完全不同。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="155" y="24" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">Manager A · 6 人</text>
    <circle cx="155" cy="104" r="38" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="155" y="100" fill="#9aa4b2" font-size="9" text-anchor="middle">內部後台</text>
    <text x="155" y="114" fill="#9aa4b2" font-size="9" text-anchor="middle">一個模組</text>
    <text x="155" y="168" fill="#9aa4b2" font-size="9" text-anchor="middle">壞掉:有人抱怨</text>
    <line x1="310" y1="30" x2="310" y2="180" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="465" y="24" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">Manager B · 6 人</text>
    <circle cx="465" cy="104" r="62" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="465" y="94" fill="#e6e6e6" font-size="9.5" text-anchor="middle">結帳 + 金流 + 對帳</text>
    <text x="465" y="110" fill="#9aa4b2" font-size="9" text-anchor="middle">三個外部系統相依</text>
    <text x="465" y="126" fill="#9aa4b2" font-size="9" text-anchor="middle">跨三個團隊協調</text>
    <text x="465" y="180" fill="#e05a7d" font-size="9" text-anchor="middle">壞掉:今天不能收錢</text>
    <text x="310" y="196" fill="#9aa4b2" font-size="9" text-anchor="middle">人頭一樣,管理幅度差好幾倍——成長要的是右邊那個圈變大,不是圈裡的人變多</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">管理幅度 = 你為多重要、多複雜的一塊負責。Larson 還補了一句很實用的話:<b style="color:#e6e6e6">搶人頭的人很多,搶「更多工作」的人很少</b></figcaption>
</figure>

這節的實用價值在於它給了一條**不需要組織擴張也能成長**的路:接下沒人想接的爛攤子、接下跨團隊的協調、接下一塊會上新聞的系統。人頭要等公司長大才有,scope 往往只需要你舉手。

順帶劃一條線:這裡的「管理幅度」和我在[[responsibility-funnel|責任漏斗]]裡講的「頸寬」不是同一件事——**scope 是你負責的面積,頸寬是你驗收的頻寬**;面積變大而頻寬沒跟著變,結果就是你簽了一堆自己沒看懂的東西。

## 四個工程師版

這一章對四人團隊最有用的,不是叫你去湊到 6–8 人(你湊不到),而是三件可以馬上做的事:

1. **承認你是 TLM,並且說出口。** 四個人的 lead 沒有「離開產線」這個選項,這不是失敗,是這個規模的正常型態。但要誠實面對 Larson 那句「職涯機會有限」——**TLM 是一個位置,不是一個會自動長大的階段**;想成長,走的是 scope 那條路,不是等人頭。
2. **替下限買保險。** 人數補不上,就用別的東西補抽象的漏:每塊區域至少兩個人碰過、決策寫下來而不是留在腦裡、輪值表就算只有兩個人也要有。目標不是變成真的團隊,是**讓某個人消失時,系統不會跟著消失**。
3. **不要為了「看起來像組織」而拆線。** 四個人拆成 2+2,你不會得到兩個團隊,你會得到兩個個人加一條新的協調成本。

## 反思

### 商城線四個人,剛好卡在 Larson 說的下限上

[[rezero-team|那篇團隊的文章]]裡算過一次帳:六個工程師,但商城這條線實際上是**四個**——一個 backend lead(我)、一位後端、兩位前端,再加一位不寫程式、專職做 PM 的 CTO。前面十七章寫的所有系統,是這四個人做出來的。

當時我對這個數字沒有任何感覺,只覺得「人有點少但跑得動」。現在用這章回頭看,我們是**剛好踩在下限線上**:再少一個人,團隊這層抽象就漏光了。而且它的脆弱是隱形的——四個人的時候,每個人心裡都清楚「前端只有兩個、後端只有兩個」,但沒有人把它寫成一句話:**我們沒有任何一塊是兩個人以上熟的**。這件事平常不會痛,痛的時候是有人要請長假,或有人遞辭呈。

更誠實的是後來的發展:[[rezero-microservices|合約重談之後]],團隊一個月內剩三個人。從四到三看起來只少一個,但按這章的標準,那是**從「勉強是團隊」掉到「跟個人沒兩樣」**——而當時我們對這個轉折唯一的處理方式,是每個人多撐一點。

### 我做了兩年 TLM,而且沒意識到那是一個有天花板的位置

[[rezero-team|同一篇]]還記了一段我自己的軌跡:最早後端只有我一個,招到第二個後端那天,我開始做 lead。**小團隊的 lead 沒有「離開產線」這個選項**——維持高輸出之外,多扛三個把關點:task 的技術拆解、code review、技術選型。

那就是 TLM 的定義,一字不差。而我當時的自我認知是「我在做 lead」,沒有意識到自己站的是一個 Larson 明講**職涯機會有限**的位置。這裡我要幫 TLM 說句公道話:那兩年我學到的東西沒有一樣是浪費——把關點怎麼設、什麼該擋什麼該放,是後來所有判斷的底子。**但我確實把一個位置誤當成一條路徑**,以為只要一直做好 lead 該做的事,自然會長成下一階。

真正的成長那時候是有機會的,只是我沒看到它長什麼樣:**scope**。當年我對選標那條線的態度是「不熟、不碰」——那是誠實,但也是一條沒有走的路;把手伸進另一條線、把兩條線之間的技術邊界扛起來,是那個階段唯一不需要人頭就能變大的東西。這是我讀這一節最有感的地方,也是為什麼我覺得 4.7 比 2.1 更值錢:**人頭要等公司給,scope 只要你舉手。**

### 拆線就是拆組織,而且資訊邊界會跟著長出來

[[rezero-team|團隊那篇]]我寫過一句話:拆分線就是組織線。商城與選標兩條線各有各的人、各有各的 PM,然後整個系列寫了十七章,選標只出現過一次,還是二手轉述——**我不熟那條線,是組織設計的結果,不是我不夠好奇。**

這件事放到這一章的脈絡下就清楚了:當你把人分成兩堆,你同時也在決定**誰會知道什麼**。Conway 定律講的是組織形狀會長進系統裡,但反過來也成立——**組織的邊界會決定資訊的邊界,而資訊的邊界最後會變成人的邊界**。所以「要不要拆成兩隊」從來不是人數問題,是你願不願意讓這兩塊從此以後只靠會議溝通。

我現在的判準很簡單:**如果拆完之後,兩邊的人再也不會讀對方的 code,那就先別拆。** 人數會再長,邊界一旦立起來就很難拆掉了。
