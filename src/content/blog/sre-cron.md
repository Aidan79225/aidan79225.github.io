---
title: "可靠的 cron:最單純的定時任務,一分散就變難"
date: 2026-07-15
category: tech
description: "cron 很簡單——時間到,跑一個任務,單機上誰都會寫。但一旦要它『可靠』(那台機器掛了,任務還是得照跑),它就從最簡單的東西,變成一個會扯到分散式共識的硬問題。這篇講兩件事:為什麼可靠的 cron 這麼難(狀態要跨 leader 接手不丟,底層得靠共識存),以及它逼你面對一個沒有完美解的抉擇——在崩潰的空窗裡,你只能選『寧可跳過』或『寧可重複』,而冪等是唯一的萬用逃生門。"
tags:
  - sre
  - reliability
series: "Google SRE 讀書筆記"
seriesOrder: 15
comments: true
draft: false
---
cron 大概是最單純的一種基礎設施:時間到,跑一個任務。單機上寫過 crontab 的人都覺得它理所當然。但只要加上兩個字——**「可靠」**(那台機器掛了,任務還是得照跑),它就從最簡單的東西,一夕變成一個會扯到分散式共識的硬問題。這篇講為什麼,以及它逼你面對的一個沒有完美解的抉擇。

## 單機 cron 很簡單,可靠的 cron 很難

單機 cron 的致命傷很明顯:**它是單點故障**。那台機器一掛,所有排程跟著停擺,而且你可能過了好幾個週期才發現。直覺的修法是把它做成分散式——多台副本、選一個 leader 來跑、掛了換人接手。但這一搬,立刻冒出一個新的硬問題:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 200" role="img" aria-label="單機 cron 很簡單但可靠的 cron 很難。左邊單機 cron 時間到就跑很簡單,但機器一掛排程全停是單點故障。中間箭頭要它掛了也能跑。右邊分散式 cron:三個副本,一個 leader 兩個待命,把哪些任務跑過了記在共識日誌 Paxos 裡。一台掛就重選 leader,狀態從共識還原,不重跑也不漏跑。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="cr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">單機 cron 很簡單,「可靠的」cron 很難</text>
    <rect x="20" y="48" width="170" height="56" rx="7" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.4"/><text x="105" y="70" fill="#d6a45c" font-size="9.6" text-anchor="middle" font-weight="bold">cron(單機)</text><text x="105" y="90" fill="#e6e6e6" font-size="8.4" text-anchor="middle">時間到就跑,超簡單</text>
    <text x="105" y="128" fill="#e0733a" font-size="8.4" text-anchor="middle">✗ 機器一掛 → 排程全停(SPOF)</text>
    <text x="216" y="68" fill="#9aa4b2" font-size="7.8" text-anchor="middle">要它掛了</text><text x="216" y="79" fill="#9aa4b2" font-size="7.8" text-anchor="middle">也能跑</text>
    <line x1="194" y1="88" x2="246" y2="88" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#cr)"/>
    <rect x="250" y="46" width="120" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="310" y="63" fill="#54b890" font-size="8.5" text-anchor="middle" font-weight="bold">副本(leader)</text>
    <rect x="250" y="76" width="120" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="310" y="93" fill="#e6e6e6" font-size="8.5" text-anchor="middle">副本 / 待命</text>
    <rect x="250" y="106" width="120" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="310" y="123" fill="#e6e6e6" font-size="8.5" text-anchor="middle">副本 / 待命</text>
    <line x1="370" y1="59" x2="390" y2="82" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cr)"/>
    <line x1="370" y1="89" x2="390" y2="90" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cr)"/>
    <line x1="370" y1="119" x2="390" y2="98" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cr)"/>
    <rect x="392" y="60" width="166" height="60" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="475" y="84" fill="#4f6df5" font-size="9.2" text-anchor="middle" font-weight="bold">共識日誌(Paxos)</text><text x="475" y="102" fill="#e6e6e6" font-size="8" text-anchor="middle">記錄:哪些任務跑過了</text>
    <text x="290" y="150" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">一台掛 → 重選 leader,狀態從共識還原 → 不重跑、不漏跑</text>
    <text x="290" y="172" fill="#9aa4b2" font-size="8.2" text-anchor="middle">把最單純的 cron 變可靠,底層就得用上分散式共識</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">分散式 cron 難的不是「選誰當 leader」,而是<b>「哪些任務已經跑過了」這個狀態,必須在 leader 換人接手時一個位元都不能丟</b>。因為新 leader 一旦搞不清楚某個任務跑了沒,結果不是重跑、就是漏跑。要讓這份紀錄可靠,底層就得靠上一篇的分散式共識——把「已跑清單」存進共識日誌,failover 才安全</figcaption>
</figure>

換句話說,可靠的 cron 難點不在排程本身,而在**狀態的持久性**:那份「哪些任務、在哪個週期、跑過了沒」的帳,必須撐得過任何一台機器的崩潰與 leader 的改朝換代。而這正是[[sre-consensus|分散式共識]]的應用題——用 Paxos 之類的共識,把這份帳存成一份大家都同意、且失效也不會丟的日誌。

## 沒有免費的 exactly-once:跳過 vs 重複,選一個

就算有了共識存狀態,還有一個更狡猾的問題,藏在「**決定要跑**」和「**記錄跑過了**」這兩個動作之間的**空窗**裡。leader 只要在這個空窗中崩潰,你就必然踩到兩種災難之一:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="崩在空窗裡,跳過與重複沒有兩全。上排先記錄再啟動:記錄已跑之後崩潰,還沒真的啟動任務,結果是跳過,標記了卻沒跑。下排先啟動再記錄:啟動任務之後崩潰,還沒記錄,接手的 leader 看到沒紀錄就重跑,結果是重複。分散式沒有免費的 exactly-once,只能選寧可跳過或寧可重複。逃生門是把任務做成冪等,重複就無害,於是可以大膽選先啟動再記錄。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="cw" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">崩在空窗裡:跳過 vs 重複,沒有兩全</text>
    <text x="70" y="58" fill="#9aa4b2" font-size="8.2" text-anchor="middle">先記錄</text><text x="70" y="70" fill="#9aa4b2" font-size="8.2" text-anchor="middle">再啟動</text>
    <rect x="118" y="44" width="94" height="30" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="165" y="63" fill="#e6e6e6" font-size="8.3" text-anchor="middle">記錄「已跑」</text>
    <text x="234" y="63" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">⚡崩</text>
    <rect x="258" y="44" width="94" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="3 2"/><text x="305" y="63" fill="#9aa4b2" font-size="8.3" text-anchor="middle">啟動任務</text>
    <line x1="352" y1="59" x2="372" y2="59" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cw)"/>
    <rect x="374" y="44" width="192" height="30" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="470" y="63" fill="#e0733a" font-size="8.4" text-anchor="middle" font-weight="bold">跳過 miss:標記了卻沒跑</text>
    <text x="70" y="118" fill="#9aa4b2" font-size="8.2" text-anchor="middle">先啟動</text><text x="70" y="130" fill="#9aa4b2" font-size="8.2" text-anchor="middle">再記錄</text>
    <rect x="118" y="104" width="94" height="30" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="165" y="123" fill="#e6e6e6" font-size="8.3" text-anchor="middle">啟動任務</text>
    <text x="234" y="123" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">⚡崩</text>
    <rect x="258" y="104" width="94" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="3 2"/><text x="305" y="123" fill="#9aa4b2" font-size="8.3" text-anchor="middle">記錄「已跑」</text>
    <line x1="352" y1="119" x2="372" y2="119" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cw)"/>
    <rect x="374" y="104" width="192" height="30" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="470" y="123" fill="#e0733a" font-size="8.4" text-anchor="middle" font-weight="bold">重複 double:接手者再跑一次</text>
    <rect x="40" y="152" width="500" height="48" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="290" y="171" fill="#e6e6e6" font-size="8.8" text-anchor="middle">分散式沒有免費的 exactly-once —— 你只能選:寧可跳過,還是寧可重複?</text>
    <text x="290" y="190" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">逃生門:把任務做成冪等 → 重複就無害 → 大膽選「先啟動再記錄」</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">兩種順序、兩種災難:<b>先記錄再啟動</b>,崩在中間就是「標記完成卻根本沒跑」的<b>跳過</b>;<b>先啟動再記錄</b>,崩在中間就是「跑了沒留紀錄、接手者又跑一次」的<b>重複</b>。分散式系統裡沒有免費的 exactly-once,你只能挑一種風險。而唯一的萬用解,是把任務寫成<b>冪等</b>——重複執行結果一樣,那你就能安心選「寧可重複」,穩穩落在 at-least-once</figcaption>
</figure>

所以真正要先問的問題是:**這個任務,跳過比較痛,還是重複比較痛?** 寄一封帳單通知,重複寄兩次很尷尬,寧可有機制擋重複;產一份可覆寫的報表,漏產一次比產兩次糟,那寧可重跑。而最漂亮的解法是把選擇權拿掉——**把任務做成冪等**,重複執行也無害,你就能永遠選「至少跑一次」,睡得著覺。這正是我在[[airflow-scheduling|Airflow 排程]]那篇一直強調的:冪等可重跑,是資料任務的地基,不是加分項。

## 還有一個坑:午夜的驚群

最後一個實務陷阱:大家排程都愛整點,尤其 `0 0 * * *`(午夜)。結果就是每天 00:00:00 那一瞬間,成百上千個任務同時湧出、同時搶資源、同時打同一個下游——這就是 **thundering herd(驚群)**。解法很簡單但常被忘記:**加抖動(jitter)**,把觸發時間在一個小區間內隨機打散,別讓所有任務擠在同一秒。

## 反思

### cron 是「簡單的東西一分散就變難」的最佳範例

我很喜歡拿 cron 當例子,因為它完美示範了分散式系統的一個殘酷規律:**一個東西在單機上有多簡單,搬到分散式就有多難。** 單機 cron 是新手都能寫的 crontab;可靠的 cron 卻要用上 leader 選舉、共識日誌、崩潰空窗分析——難度差了好幾個數量級,而需求聽起來只是「多加兩個字:可靠」。這讓我對「這需求很簡單吧?」這句話越來越警惕——很多時候,簡單的是**happy path**,真正的成本全藏在「掛了怎麼辦、剛好崩在中間怎麼辦」的邊界裡。估工時,要估的是那些邊界,不是那條快樂路徑。

### 跳過還是重複,先想清楚你的任務怕哪一個

「沒有免費的 exactly-once」是我覺得每個做排程、做訊息、做資料管線的人都該刻進骨子裡的一句話。太多人預設系統會「剛好跑一次」,然後在某次故障後,對著重複的帳單或漏掉的結算一臉錯愕。現實是:你**必然**要在跳過和重複之間選一個,那不如提早、清醒地選。而我的預設答案幾乎永遠是——**把任務做成冪等,然後選「寧可重複」**。因為冪等把一個「二選一的兩難」變成了「怎麼選都沒差」的舒適區,這是我看過投報率最高的一種防禦性設計,它跟[[sre-data-pipelines|資料管線]]的可重跑、訊息系統的去重,講的都是同一件事。

### 說到底,可靠的 cron 是共識的一道應用題

寫這篇最有意思的體會,是發現「可靠 cron」根本不是一個獨立的題目,而是[[sre-consensus|分散式共識]]的應用。你以為在解排程,實際上在解的是「一群會掛的機器,如何對『這個任務跑過了沒』達成一致」——這跟選 leader、管分散式鎖是**同一個**問題的不同外衣。這也再次印證了我的一個信念:分散式系統的難題,翻來覆去其實就那幾個核心(共識、狀態、故障邊界),把核心啃透,遇到的各種「新問題」,多半只是老問題換了張臉。也因此,這種底層設施更該用被驗證過的現成方案,而不是每個團隊自己重造一次那道空窗。
