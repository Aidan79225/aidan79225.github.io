---
title: "責任漏斗:AI 能做掉九成的事,為什麼剩下的一成是你"
date: 2026-08-11
category: tech
tags:
  - ai
  - leadership
---
## 前言

寫完 [[gitcrisp|GitCrisp]] 和 [[blog-as-a-product|部落格產線]] 兩篇之後,讀者最自然的下一個問題是:如果 AI 能做掉這麼多事,那你還剩什麼?

我的答案是一個形狀:**漏斗**。工作的量,大部分真的可以交給 AI——code、測試、文件、初稿、查資料,上面那圈越來越寬;但有些東西不會被漏下去,它們往下擠,擠進一個越來越窄的頸——而頸口站著的,永遠是一個人。這篇想把這個形狀講清楚:為什麼是漏斗、頸裡裝的是什麼,以及站在頸口的人(包括還沒站上去的 junior)該怎麼辦。

## 責任守恆:給人是分流,給 AI 是全反射

先講漏斗底下那條物理定律。把工作交出去,有兩種完全不同的交法:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 250" role="img" aria-label="兩種授權的責任流向對比。左邊授權給人:我把工作交給同事,責任跟著分流一部分過去,出事時「這部分是他負責的」成立。右邊授權給 AI:工作交給 AI,但責任像鏡面全反射一樣全部彈回我身上,「這是 AI 寫的」不成立。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="165" y="30" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">授權給人:責任分流</text>
    <rect x="115" y="45" width="100" height="42" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="165" y="70" fill="#e6e6e6" font-size="12" text-anchor="middle">我</text>
    <rect x="115" y="150" width="100" height="42" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="165" y="175" fill="#e6e6e6" font-size="12" text-anchor="middle">同事</text>
    <line x1="150" y1="87" x2="150" y2="150" stroke="#9aa4b2" stroke-width="1.5"/>
    <line x1="180" y1="150" x2="180" y2="87" stroke="#54b890" stroke-width="1.5" stroke-dasharray="5 3"/>
    <text x="95" y="122" fill="#9aa4b2" font-size="10" text-anchor="end">工作 ↓</text>
    <text x="238" y="122" fill="#54b890" font-size="10" text-anchor="start">部分責任 ↑</text>
    <text x="165" y="222" fill="#9aa4b2" font-size="10" text-anchor="middle">「這部分是他負責的」——成立</text>
    <line x1="320" y1="40" x2="320" y2="210" stroke="#3a4154" stroke-width="1"/>
    <text x="475" y="30" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">授權給 AI:責任全反射</text>
    <rect x="425" y="45" width="100" height="42" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="475" y="70" fill="#e6e6e6" font-size="12" text-anchor="middle">我</text>
    <rect x="425" y="150" width="100" height="42" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="475" y="175" fill="#e6e6e6" font-size="12" text-anchor="middle">AI</text>
    <line x1="460" y1="87" x2="460" y2="150" stroke="#9aa4b2" stroke-width="1.5"/>
    <path d="M 490 150 C 520 120 520 100 490 87" fill="none" stroke="#e05a7d" stroke-width="1.8"/>
    <text x="405" y="122" fill="#9aa4b2" font-size="10" text-anchor="end">工作 ↓</text>
    <text x="548" y="122" fill="#e05a7d" font-size="10" text-anchor="start">責任 100% ↑</text>
    <text x="475" y="222" fill="#9aa4b2" font-size="10" text-anchor="middle">「這是 AI 寫的」——不成立</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">責任守恆定律:產出可以放大,責任不會稀釋——它只會收斂到出貨的那個人。</figcaption>
</figure>

把事情交給**人**,責任會跟著轉移一部分。這不是推託,是組織運作的基礎:出事時說「這一塊是他負責的」,說得成立,也應該成立——不然授權就是空話。

把事情交給 **AI**,工作交出去了,責任卻一分都沒有離開你。沒有任何一場 incident review 會接受「這是 AI 寫的」作為結論。我在 [[rezero-inventory|直播電商系列]] 寫過那次真的超賣的事故——事後沒有人問「那段 code 是誰寫的」,只問「是誰讓它上線的」。那時還沒有 AI 寫 code,但這個問法今天一個字都不用改。**產出可以被放大十倍,責任不會稀釋成十分之一;它守恆,而且全部收斂到簽名的人身上。**

這就是「帶 AI 像帶團隊」([[gitcrisp|GitCrisp 那篇]]的結論)唯一不像的地方:方法一樣——寫規範、劃邊界、review——但帶人的終點是把責任也交出去,帶 AI 的終點永遠是自己收下全部。

## 漏斗:量遞減,責任密度遞增

把責任守恆放進日常工作流,就得到漏斗的形狀:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 330" role="img" aria-label="責任漏斗:最上層寬帶是 AI 的大量產出(code、測試、文件、初稿);往下是護欄層(測試、規範、自動檢查);再往下是人的 review 與抽查;最窄的頸是決策與簽名——一個人的名字。右側標注:量往下遞減,責任密度往下遞增。頸寬等於驗收頻寬,是整條產線的吞吐上限。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <polygon points="60,20 560,20 515,80 105,80" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="310" y="45" fill="#4f6df5" font-size="12" text-anchor="middle" font-weight="bold">AI 產出</text>
    <text x="310" y="65" fill="#9aa4b2" font-size="10" text-anchor="middle">code · 測試 · 文件 · 初稿 · 研究——量大而便宜</text>
    <polygon points="105,80 515,80 470,140 150,140" fill="#262b3a" stroke="#3a4154"/>
    <text x="310" y="105" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">護欄</text>
    <text x="310" y="125" fill="#9aa4b2" font-size="10" text-anchor="middle">測試 · 規範文件 · 自動檢查——機器先驗一輪</text>
    <polygon points="150,140 470,140 425,200 195,200" fill="#262b3a" stroke="#3a4154"/>
    <text x="310" y="165" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">人的 review 與抽查</text>
    <text x="310" y="185" fill="#9aa4b2" font-size="10" text-anchor="middle">方向對不對 · 邊界乾不乾淨 · 聞起來臭不臭</text>
    <polygon points="195,200 425,200 350,262 270,262" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="310" y="228" fill="#54b890" font-size="12" text-anchor="middle" font-weight="bold">決策與簽名</text>
    <text x="310" y="248" fill="#e6e6e6" font-size="10" text-anchor="middle">一個人的名字</text>
    <line x1="580" y1="30" x2="580" y2="250" stroke="#9aa4b2" stroke-width="1.2"/>
    <polygon points="580,258 575,246 585,246" fill="#9aa4b2"/>
    <text x="596" y="90" fill="#9aa4b2" font-size="10" text-anchor="start" transform="rotate(90 596 90)">量遞減</text>
    <line x1="40" y1="250" x2="40" y2="30" stroke="#e05a7d" stroke-width="1.2"/>
    <polygon points="40,22 35,34 45,34" fill="#e05a7d"/>
    <text x="26" y="240" fill="#e05a7d" font-size="10" text-anchor="start" transform="rotate(-90 26 240)">責任密度遞增</text>
    <text x="310" y="295" fill="#d6a45c" font-size="11" text-anchor="middle" font-weight="bold">頸寬 = 你能「負責任地驗收」的頻寬 = 整條產線的吞吐上限</text>
    <text x="310" y="315" fill="#9aa4b2" font-size="10" text-anchor="middle">AI 再快,東西都得擠過這裡才能出貨——這是 AI 生產力的 Amdahl 定律</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">往下每一層:東西變少,但每一件的責任變重。頸不是流程的一站,是責任的匯流點。</figcaption>
</figure>

這張圖有一個工程上的推論,值得單獨講:**整條產線的吞吐量,上限不在 AI 的產出速度,在頸的寬度**。AI 一天能生二十個 PR,你一天能負責任地驗收幾個,產線就只能跑幾個——多出來的要嘛排隊,要嘛沒被真的驗過就流出去(後面會講這有多危險)。平行化再強,守恆的那段就是壓不掉——這是 Amdahl 定律,只是這次不可平行化的部分叫「責任」。

所以「用了 AI 之後你的價值是什麼」有了一個具體的答案:**你的價值等於你的頸寬**——你能負責任地驗收多少東西,你就值多少。

## 頸可以加寬,但拆不掉

[[gitcrisp|GitCrisp]] 一萬三千行測試、`CLAUDE.md` 裡的架構規範、[[blog-as-a-product|部落格產線]]的 avoid-word 掃描和 pre-commit hook——這些護欄的本質,現在可以說得更精確了:它們都是**加寬頸的工具**。把「每次都要人眼看」的檢查變成機器自動跑,人的驗收頻寬就留給機器驗不了的東西:方向、取捨、品味。

但有兩個誠實的邊界要講。

**第一,遞迴到底還是人。**測試也是 AI 寫的——那誰驗收測試?規範文件也是 AI 幫忙整理的——誰驗收規範?這條遞迴沒有終點,只有一個止損點:人對護欄本身做抽查。我 review 測試 PR 的力道比 feature PR 更重,因為護欄壞了是靜默的——它不會報錯,它只是從此攔不住錯。

**第二,橡皮圖章是假頸。**航空業幾十年前就學過這一課:自動化越好,人越容易失能——自動駕駛太可靠,機師的手動能力和警覺一起退化,等真的需要人接手時,接不住。Code review 的版本是:AI 的 code 十次有九次是對的,第十次你已經不看了。這時漏斗的頸還畫在圖上,但它其實已經不存在——所有東西直通出貨,責任卻還在你身上。**頸的存在不是畫出來的,是每一次真的看、真的擋下東西維持出來的。**這也是為什麼 GitCrisp 一百多個 PR 我每個都看:不只是為了那個 PR,是為了讓「我在看」這件事一直是真的。

## 反思:junior 怎麼辦

這個模型最殘忍的推論落在 junior 身上。以前的成長路徑是從漏斗的寬處開始:大量寫 code、寫壞、被 production 教訓,幾年下來長出判斷力,慢慢往頸口移動。現在寬處被 AI 佔了——**驗收能力的原料是產出的經驗,而產出被 AI 拿走了**。梯子最下面幾階,沒了。

我目前的答案是三條,寫給頸口還站不上去的人:

**一、判斷力的原料是失敗的經驗庫,不是打字量。**你聞得出 code 的臭味,是因為見過夠多的臭——自己寫壞的、追事故追出來的、review 時抓到的。打字只是舊時代累積這個經驗庫的載體,不是本體。所以新的練法是把「寫→錯→學」換成更高頻的**「預測→驗證」迴圈**:看 AI 的 diff 之前,先猜它會怎麼寫、哪裡會出問題,再打開來對答案。猜錯的每一次都是入庫。AI 讓這個練習變得空前便宜——你可以要它解釋每個決定、生三種替代寫法來對照。它拿走了舊訓練場,但開了一個新的;差別只在舊訓練場是被動就能受訓(不寫 code 專案就不會動),新訓練場要主動走進去——全收不問的人,什麼都練不到。

**二、頸寬 = 驗收速度 × 校準。**光快沒有用:驗得快但過度自信,是假頸——東西都流過去了,但沒有真的被驗過。真正的頸寬包含知道**自己哪裡看不懂**,並對看不懂的部分降速、加護欄,或老實說「這塊我還不能簽」。錯誤的自信比慢危險得多;而校準,恰好也是從失敗經驗庫裡長出來的。

**三、先當小漏斗的頸,再當大漏斗的頸。**「能負責的範圍」不只是認知問題,還是信任問題——你能負責的範圍,是別人敢讓你負責的範圍,那要靠簽名紀錄累積。與其在大系統裡負責一片寬層(反正那層 AI 越做越多),不如找一個小而完整的漏斗,從規格、驗收到出事扛鍋整條走完——一個 side project、一個小工具、一個小服務。這也是我現在回頭看 [[travel-split|旅遊分帳]] 和 GitCrisp 的方式:它們不只是作品,是我練「當頸」的地方。side project 在 AI 時代從加分項變成了正貨——因為它是唯一一個你從第一天就站在頸口的漏斗。

最後,把整篇收成一句話:AI 改變的是漏斗上面有多寬,沒有改變下面有多窄。**產出會通膨,責任不會**——而你的職涯,就是那個頸,慢慢變寬的過程。
