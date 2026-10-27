---
title: "工程管理是一道優雅的謎題:別修事件,修系統"
date: 2026-09-10
updated: 2026-10-27
category: tech
description: "新系列開場:讀 Will Larson 的《An Elegant Puzzle》。這本書的立場很硬——管理不是把事情一件一件解決掉,是設計那個一直在吐出事情的系統。先把這個轉念講清楚,再把全書五章拆成五個問題,最後誠實回答:一本寫給火箭船的書,四個工程師的團隊怎麼讀。"
tags:
  - engineering-management
series: "An Elegant Puzzle 讀書筆記"
seriesOrder: 1
comments: true
draft: false
---
站內已經有一個領導力系列了([[btl-1|成為 Tech Leader]]),為什麼還要再開一個?

因為那本書談的是**人怎麼長成一個 leader**——影響力、自我覺察、願景;而 Will Larson 的 *An Elegant Puzzle: Systems of Engineering Management* 談的是**這個 leader 手上的那套系統怎麼設計**:團隊該多大、狀態怎麼診斷、風險擺在哪、技術債怎麼還、政策怎麼寫、職級怎麼定、招募怎麼量。作者的履歷剛好給了他這個視角——他待過 Digg、Uber、Stripe,後兩家都是組織擴張得極快的地方,一個管理難題還沒解完,規模已經把它變成另一個難題。

書名叫「優雅的謎題」不是文青,是**立場**:Larson 把每個管理難題都寫成有存量、有流量、有時間差的系統題。這剛好是這個部落格一直在用的視角——前面的系列拿「系統」去看資料庫與叢集,這個系列拿它看組織。

## 一個轉念:EM 的產出不是「處理完的事」,是「不再發生的事」

這本書的第一個、也是最重要的主張:**管理要動的是系統,不是事件。**

發布又出包、需求又插隊、某個人又被燒到、面試又放鳥——這些是**事件**。事件會一件一件掉到你桌上,而且你接得越快、接得越漂亮,它們來得越理所當然。真正決定你一週有幾件事的,是上游那個**一直在吐事件的系統**:誰跟誰一組、什麼事需要誰簽、哪些規則是寫下來的、哪些只活在你腦裡。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 262" role="img" aria-label="左右對照。左邊「處理事件」:上方一個系統方塊持續吐出六顆事件,全部掉進下方的「你」,你一件一件處理完,但一條虛線繞回系統表示源頭速率沒有改變,下週一樣多。右邊「改系統」:同一個系統方塊上加了一條政策或一個機制,只吐出兩顆事件,你的負擔變小,但標注提醒效果有幾週到幾個月的時間差。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="aep1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="156" y="24" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">處理事件</text>
    <text x="156" y="41" fill="#9aa4b2" font-size="9" text-anchor="middle">接得越快,來得越理所當然</text>
    <rect x="46" y="54" width="220" height="34" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <text x="156" y="75" fill="#e6e6e6" font-size="10" text-anchor="middle">系統(編制 / 流程 / 沒寫下來的規則)</text>
    <circle cx="86" cy="104" r="4" fill="#e05a7d"/><circle cx="110" cy="118" r="4" fill="#e05a7d"/><circle cx="134" cy="104" r="4" fill="#e05a7d"/><circle cx="158" cy="118" r="4" fill="#e05a7d"/><circle cx="182" cy="104" r="4" fill="#e05a7d"/><circle cx="206" cy="118" r="4" fill="#e05a7d"/>
    <line x1="156" y1="88" x2="156" y2="146" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#aep1)"/>
    <rect x="106" y="150" width="100" height="34" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="156" y="171" fill="#e6e6e6" font-size="11" text-anchor="middle">你</text>
    <text x="156" y="204" fill="#9aa4b2" font-size="9" text-anchor="middle">一件一件處理完 ✓</text>
    <path d="M 236 167 C 288 150 288 78 268 71" fill="none" stroke="#e05a7d" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#aep1)"/>
    <text x="156" y="232" fill="#e05a7d" font-size="9.5" text-anchor="middle">下週一樣多——源頭一根寒毛都沒動</text>
    <line x1="310" y1="30" x2="310" y2="240" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="464" y="24" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">改系統</text>
    <text x="464" y="41" fill="#9aa4b2" font-size="9" text-anchor="middle">同一件事第三次,就別再接了</text>
    <rect x="354" y="54" width="220" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="464" y="75" fill="#e6e6e6" font-size="10" text-anchor="middle">系統 + 一條政策 / 一個機制</text>
    <circle cx="440" cy="110" r="4" fill="#e05a7d"/><circle cx="488" cy="110" r="4" fill="#e05a7d"/>
    <line x1="464" y1="88" x2="464" y2="146" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#aep1)"/>
    <rect x="414" y="150" width="100" height="34" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="464" y="171" fill="#e6e6e6" font-size="11" text-anchor="middle">你</text>
    <text x="464" y="204" fill="#54b890" font-size="9" text-anchor="middle">剩下的才需要你判斷 ✓</text>
    <text x="464" y="232" fill="#9aa4b2" font-size="9.5" text-anchor="middle">代價:幾週到幾個月後才看得到效果</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">兩邊的當週工作量差不多,差別在下週:左邊的源頭沒動,右邊的源頭少吐了一點——而右邊的效果不會當週出現,這個時間差就是多數人放棄改系統的原因</figcaption>
</figure>

這個轉念的實際後果有兩個。第一,**衡量自己的方式要換**:「我這週接住了幾件事」是工時報告,「這個月有哪一類事不再發生」才是產出。第二,**改系統的回報都有延遲**——政策要一季才看得出效果、招募要三到六個月才有產能、職級制度要跑完一個週期才知道公不公平。改 code 是當天知道結果,改組織不是;這條時間差是全書反覆出現的東西,也是這個系列會反覆標出來的東西。

一句可以拿來用的判準:**同一件事發生第三次,就別再處理那件事了——去改那個一直吐出它的系統。**

## 這本書的形狀:五章,五個問題

書分七章:第 1 章是導論、第 7 章是附錄(分層的工具清單與書單),中間五章是主體。與其記章名,不如把它們讀成**五個先後有序的問題**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 296" role="img" aria-label="全書五章的地圖,每章一列。第二章組織,回答誰跟誰一組、這個團隊現在什麼狀態,代表招式是四種團隊狀態。第三章工具,回答你手上有什麼能改變組織,代表招式是遷移三階段。第四章態度,回答資訊不足時你用什麼預設值決定,代表招式是對政策工作。第五章文化,回答機會與歸屬怎麼分配,代表招式是別養英雄。第六章職涯,回答怎麼讓怎樣算做得好不用猜,代表招式是職級階梯與招募漏斗。最下方是第七章附錄:分層工具清單與書單。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="310" y="22" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">五章,是五個問題</text>
    <rect x="28" y="36" width="564" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="38" y="46" width="44" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/><text x="60" y="60" fill="#4f6df5" font-size="9.5" text-anchor="middle">Ch2</text>
    <text x="94" y="60" fill="#e6e6e6" font-size="10.5">組織</text>
    <text x="146" y="60" fill="#9aa4b2" font-size="9.5">誰跟誰一組、這個團隊現在什麼狀態</text>
    <rect x="404" y="44" width="176" height="24" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="492" y="60" fill="#9aa4b2" font-size="9" text-anchor="middle">四種團隊狀態</text>
    <rect x="28" y="84" width="564" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="38" y="94" width="44" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/><text x="60" y="108" fill="#4f6df5" font-size="9.5" text-anchor="middle">Ch3</text>
    <text x="94" y="108" fill="#e6e6e6" font-size="10.5">工具</text>
    <text x="146" y="108" fill="#9aa4b2" font-size="9.5">你手上有什麼東西可以改變組織</text>
    <rect x="404" y="92" width="176" height="24" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="492" y="108" fill="#9aa4b2" font-size="9" text-anchor="middle">遷移三階段</text>
    <rect x="28" y="132" width="564" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="38" y="142" width="44" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/><text x="60" y="156" fill="#4f6df5" font-size="9.5" text-anchor="middle">Ch4</text>
    <text x="94" y="156" fill="#e6e6e6" font-size="10.5">態度</text>
    <text x="146" y="156" fill="#9aa4b2" font-size="9.5">資訊不足時,你用什麼預設值做決定</text>
    <rect x="404" y="140" width="176" height="24" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="492" y="156" fill="#9aa4b2" font-size="9" text-anchor="middle">對政策工作</text>
    <rect x="28" y="180" width="564" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="38" y="190" width="44" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/><text x="60" y="204" fill="#4f6df5" font-size="9.5" text-anchor="middle">Ch5</text>
    <text x="94" y="204" fill="#e6e6e6" font-size="10.5">文化</text>
    <text x="146" y="204" fill="#9aa4b2" font-size="9.5">機會與歸屬,實際上是怎麼分配的</text>
    <rect x="404" y="188" width="176" height="24" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="492" y="204" fill="#9aa4b2" font-size="9" text-anchor="middle">別養英雄</text>
    <rect x="28" y="228" width="564" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="38" y="238" width="44" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/><text x="60" y="252" fill="#4f6df5" font-size="9.5" text-anchor="middle">Ch6</text>
    <text x="94" y="252" fill="#e6e6e6" font-size="10.5">職涯</text>
    <text x="146" y="252" fill="#9aa4b2" font-size="9.5">怎麼讓「怎樣算做得好」不用靠猜</text>
    <rect x="404" y="236" width="176" height="24" rx="4" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="492" y="252" fill="#9aa4b2" font-size="9" text-anchor="middle">職級階梯 + 招募漏斗</text>
    <text x="310" y="286" fill="#9aa4b2" font-size="9" text-anchor="middle">Ch1 導論 · Ch7 附錄:依管理層級分層的工具清單與書單</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">五章其實是同一條線:把一件事從「靠某個人記得」變成「系統本來就會」——先有編制,才談得上工具;有工具,才談得上態度與文化;最後用職涯制度把公平釘死</figcaption>
</figure>

每章各挑一個最有代表性的東西當開胃菜:

| 章 | 在回答什麼 | 一個代表招式 |
|---|---|---|
| **Ch2 組織** | 團隊多大、現在是什麼狀態 | **四種團隊狀態**:落後 / 踩水 / 還債 / 創新——四種狀態要用**四種不同的處方**,而不是通通加人 |
| **Ch3 工具** | 你能拿什麼改變組織 | **遷移是唯一能規模化還技術債的機制**:去風險 → 賦能 → 收尾,而且**沒收尾的遷移是最貴的債** |
| **Ch4 態度** | 你的預設值是什麼 | **對政策工作,不要對例外工作**——每次「這次特別通融」都是在對系統下一道沒有版本控制的指令 |
| **Ch5 文化** | 誰拿到機會、誰被當自己人 | **別養英雄**:英雄的存在讓其他人無法有意義地參與,而且他遲早會先燒完 |
| **Ch6 職涯** | 怎麼不用猜 | **招募是一條可以量測的產線**;**職級階梯**的用途不是排名,是讓人不用靠關係猜自己在哪 |

這五個招式我一個都沒有在這篇展開——它們各自是後面一篇文章。這裡只要先看出一件事:**它們全都是「把重複發生的事,搬到系統那一層去解」的不同版本。**

## 這個系列每篇都會扣的三件事

讀管理書最容易發生的事,是讀的時候一直點頭,回到座位還是一件一件救火。所以這個系列給自己上三個標記,每篇都要交代:

- **【哪個系統在吐事件】**——這篇處理的重複事件,背後那個系統到底是什麼?說不出來,這篇就只是心法散文。
- **【時間差】**——這一招多久才生效?加人要三到六個月、遷移以季為單位、職級制度要一個完整週期。不講時間差,讀者做兩週沒效果就會放棄。
- **【四個工程師版】**——沒有 HR、沒有職級階梯、沒有 recruiter,團隊只有四個人的時候,這一招的**最低可行版本**是什麼?哪幾招根本不該做?

第三個是這個系列的招牌,也是下一節要先講清楚的事。

## 誠實面:一本寫給火箭船的書,四個工程師怎麼讀

這本書的素材來自每季新增一整個團隊的地方。我在這個部落格寫過的那段帶人經驗,規模完全是另一回事——[[rezero-team|六個工程師,商城線只有四個]],沒有估點也沒有 demo,全遠端,PM 是不寫程式的 CTO 專職在做;結局也不是長大,是[[rezero-retro|暫停開發、合約重談、一個月後剩三個人、最後收攤]]。

所以這個系列的讀法從第一篇就講明:**這是翻譯,不是轉貼。** 三條翻譯規則:

1. **先問這一招在解什麼問題,再看它長什麼形狀。** 形狀(委員會、校準會議、升等包)是規模的產物,問題(誰決定、憑什麼、下次還算不算數)在四個人的團隊一樣存在,只是解法從一份制度變成一段共識與一頁文件。
2. **沒有制度的地方,不代表沒有制度。** 沒有明文的職級階梯,不等於沒有職級階梯——它只是活在主管腦裡,沒有人能確定這一次的標準跟上一次一樣。這種「隱形制度」最麻煩的地方,是它沒辦法被檢查。
3. **縮編時,有一條處方會直接消失。** 書的素材幾乎都來自成長中的組織,四種團隊狀態的第一個處方就是「加人」;當組織在縮小,那條路沒了,剩下的只有收斂戰線與加時間。**縮編的那一半,這個系列留到最後一篇專門談**——上面那段經歷的結局,剛好落在那裡。

要先幫 Larson 說一句公道話:他自己在第 6 章開頭就寫過一節,標題直接講明:**超速成長是個人成長的弱預測指標**(*Roles over rocket ships, and why hypergrowth is a weak predictor of personal growth*)——真正決定你長多快的是你拿到什麼角色與機會,不是公司長多快。所以「小團隊視角」不是跟這本書唱反調,反而是把他那條線拉長。

## 反思

### 當年的四個做法:兩個交給了工具,兩個靠人

我在[[btl-1|這個部落格的第一篇領導力文章]]裡寫過當時的做法:用 code review 傳知識、訂 coding style 保持一致、上 type checker 減輕維持一致性的負擔、定期 1 on 1。同一篇的反思也寫了兩個問題:**有時拖太久沒做 code review,會拖慢團隊;1 on 1 沒有持續追蹤,反而顯得有點無效。**

拿這本書的眼光重看那張清單,會看到一個很整齊的切分。四個做法裡,**coding style 和型別一致性交給了工具**——那篇自己就說 type checker 是拿來「減輕維持專案內一致性的負擔」的,[[rezero-team|團隊那篇]]也寫了「形式問題不進人腦——ruff、mypy 把風格和型別機械化」;**被點名出問題的,剛好是另外兩個只能靠人的做法**:review 的節奏、1 on 1 的追蹤。這正是這本書第一個轉念要處理的那一類東西——靠人撐住的機制會跟著人的狀態起伏,而且出問題時,通常沒有任何東西會先發出警告。

這本書的處方可以直接變成一個習慣:想說「我提醒你一下」的時候,先數這是第幾次。第三次還在提醒,該補的就不是記性,是那個一直讓這件事需要被提醒的系統——一份檢查清單、一個預設值、一條 CI 規則,什麼都好,只要它不是某個人的注意力。

### 「速度是流程形狀的函數」——同一個轉念的戰場版

[[rezero-team|那篇團隊的文章]]的反思裡,我寫過這樣一段:**「快是結構性的,不是英雄主義。……要複製這個團隊的速度,不要找四個超人,先把這四個摩擦拆掉——速度是流程形狀的函數,人是係數,形狀是指數。」** 那四個摩擦怎麼拆,那篇也列了:儀式趨近零、merge 即上線、排序不排期、規格零轉譯。

把這段放在這本書旁邊讀,兩者講的是同一件事:**別在事件上加力氣,去改產生事件的那個形狀。** 英雄主義就是在事件上加力氣——某個人更拚、撐得更久;Larson 在第 5 章把它講得很重,節名就叫 *Kill your heroes, stop doing it harder*。

這本書會追問的下一題是:**這個形狀換一批人,還跑不跑得動?** 寫下來的部分有多少、新人第一天能照著做到哪裡、哪一塊其實只靠某一個人——系列後面談風險擺在哪、談英雄的那兩篇,會回來檢查這件事。

### AI 進場之後,這本書談的那一層更重要

我在[[responsibility-funnel|責任漏斗]]裡講過一個形狀:AI 能吃掉的是漏斗上面那一大圈——寫 code、寫測試、查資料、寫初稿;吃不掉的是頸口那個要簽名的人。

把那個形狀疊到這本書上,可以推出一個延伸——這是推論,不是書上的:**當「處理事件」的單位成本被 AI 壓低,管理者之間的差距會更集中在「有沒有在改系統」。** 這本書 2019 年出版,目錄裡沒有任何一節談 AI;但它談的那一層——編制、流程、政策——正是頸口那個人得自己決定的東西。這個系列和 AI 系列的分工也在這裡:**AI 的責任軸不在這裡碰**,那條線[[responsibility-funnel|已經有自己的系列]]了,這裡只講組織本身。

最後收一句這篇的判斷:**管理最貴的錯覺,是把「我每件事都接住了」當成做得好——接得住,只代表那個系統還沒被修,而且它正在算利息。**
