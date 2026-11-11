---
title: "OOAD 到底在做什麼:一連串「這件事歸誰」的決定"
date: 2026-11-11
category: tech
description: "新系列開場。OOAD 不是畫 UML,也不是背設計模式——它是一連串「這件事歸誰」的決定。拿一支從 2021 活到現在的真 App 當案例:同一個判斷,五年裡住過五個地方;搬對了家之後,後面每一次改規則都知道該去哪裡改。"
tags:
  - ooad
  - object-design
  - kotlin
series: "OOAD 我以為我懂"
seriesOrder: 1
comments: true
draft: true
---
站內已經有一個「我以為我懂」了——[[sql-execution-order|SQL 那個系列]]拆的是查詢;這是第二個,拆的是物件導向。

封裝、繼承、多型,三個詞誰都背得出來;設計模式聽過二十三個,SOLID 五個字母也唸得出來。可是真正讓人停下手的從來不是這些名詞,是寫到一半的那一秒:**這段邏輯,到底該放哪?**

OOAD(Object-Oriented Analysis and Design)就是回答這一題的手藝。這個系列每篇挑一個天天在用、心智模型卻是糊的概念,拆回它在解的那個問題。第一篇先把整個系列的主張講完:

**OOAD 不是畫 UML,也不是背設計模式——它是一連串「這件事歸誰」的決定。**

## 先看一段 2021 年的程式

這個系列有一個貫穿的案例:[SportRecorder](https://github.com/Aidan79225/SportRecorder),一支從斷食出發的飲食紀錄 App。使用者選一個斷食類型(例如 16:8——十六小時斷食、八小時進食),每吃一餐記一筆,首頁的圓環告訴你現在是**進食中**、**斷食中**,還是**斷食達標**。

它是我 2021 年寫的 Android App,原始碼公開,歷史也都還在。當年首頁「現在算哪個階段」的判斷長這樣(節錄):

```kotlin
// DietFragment.kt,2021 年 8 月(commit a6633b5)
fun updateTime(eatTime: Pair<Long, Long>) {
    val remainTime = System.currentTimeMillis() - eatTime.first
    val eatingHours = dietPreference.preference.getLong(Constants.DIET_EATING_TIME_INTERVAL, 8)
    val eatingTimeMillis = TimeUnit.HOURS.toMillis(eatingHours)
    // …斷食時數也是同樣的讀法

    when {
        remainTime < eatingTimeMillis -> {
            statusImageView.setImageResource(R.drawable.ic_baseline_fastfood_24)
            statusTextView.text = getString(R.string.diet_status_eating)
            timerTextView.text = getTimeString(eatingTimeMillis - remainTime)
        }
        fastingTime > fastingTimeMillis -> { /* 斷食達標:換圖示、換文字 */ }
        else -> { /* 斷食中:換圖示、換文字 */ }
    }
}
```

三十行,三件不相干的事:**讀設定**(斷食幾小時,直接從 SharedPreferences 拿)、**算階段**(那個 `when`)、**改畫面**(換圖示、換文字、換倒數)。它能跑,這個檔案也一路留到 2026 年才被換掉。

同一件事,現在是三個各管各的東西:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 290" role="img" aria-label="左右對照。左邊是 2021 年:一個函式 DietFragment.updateTime 裡住著三件事——讀設定(直接伸手進 SharedPreferences)、算階段(進食中、斷食中、斷食達標)、改畫面(換圖示、換文字、換倒數);要測、要重用,都得先把畫面跑起來。右邊是現在:三件事各有一個家——DietSettingsRepository 只有它知道設定存在哪,把進食與斷食時數交給 DietWindow.compute;DietWindow.compute 只算階段,現在幾點是參數,算出 DietWindowState 交給 DietScreen;DietScreen 只負責畫出來。DietWindow 旁邊另外接著提醒(ReminderPlanner)與回顧(InsightsAggregator),共用同一條規則,不用再抄一份。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="ooad1a" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="135" y="24" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">2021:一個函式,三件事</text>
    <rect x="20" y="38" width="230" height="212" rx="10" fill="#1f2330" stroke="#3a4154" stroke-width="1.4"/>
    <text x="135" y="60" fill="#e6e6e6" font-size="10.5" text-anchor="middle">DietFragment.updateTime()</text>
    <rect x="36" y="72" width="198" height="48" rx="7" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="135" y="92" fill="#d6a45c" font-size="11" text-anchor="middle" font-weight="bold">① 讀設定</text>
    <text x="135" y="108" fill="#9aa4b2" font-size="9" text-anchor="middle">直接伸手進 SharedPreferences</text>
    <rect x="36" y="130" width="198" height="48" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="135" y="150" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">② 算階段</text>
    <text x="135" y="166" fill="#9aa4b2" font-size="9" text-anchor="middle">進食中 / 斷食中 / 斷食達標</text>
    <rect x="36" y="188" width="198" height="48" rx="7" fill="#262b3a" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="135" y="208" fill="#e05a7d" font-size="11" text-anchor="middle" font-weight="bold">③ 改畫面</text>
    <text x="135" y="224" fill="#9aa4b2" font-size="9" text-anchor="middle">換圖示、換文字、換倒數</text>
    <text x="135" y="270" fill="#9aa4b2" font-size="9.5" text-anchor="middle">要測、要重用,都得先把畫面跑起來</text>
    <line x1="256" y1="144" x2="296" y2="144" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#ooad1a)"/>
    <text x="276" y="134" fill="#9aa4b2" font-size="9.5" text-anchor="middle">搬家</text>
    <text x="464" y="24" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">現在:三件事,三個家</text>
    <rect x="304" y="38" width="196" height="50" rx="7" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="402" y="59" fill="#e6e6e6" font-size="10.5" text-anchor="middle">DietSettingsRepository</text>
    <text x="402" y="76" fill="#d6a45c" font-size="9.5" text-anchor="middle">① 只有它知道設定存在哪</text>
    <line x1="402" y1="88" x2="402" y2="112" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ooad1a)"/>
    <text x="410" y="104" fill="#9aa4b2" font-size="9">進食 / 斷食時數</text>
    <rect x="304" y="116" width="196" height="50" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="402" y="137" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">DietWindow.compute()</text>
    <text x="402" y="154" fill="#4f6df5" font-size="9.5" text-anchor="middle">② 只算階段,現在幾點是參數</text>
    <line x1="402" y1="166" x2="402" y2="190" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ooad1a)"/>
    <text x="410" y="182" fill="#9aa4b2" font-size="9">DietWindowState</text>
    <rect x="304" y="194" width="196" height="50" rx="7" fill="#262b3a" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="402" y="215" fill="#e6e6e6" font-size="10.5" text-anchor="middle">DietScreen</text>
    <text x="402" y="232" fill="#e05a7d" font-size="9.5" text-anchor="middle">③ 只負責畫出來</text>
    <line x1="500" y1="132" x2="526" y2="112" stroke="#54b890" stroke-width="1.2" stroke-dasharray="4 3"/>
    <line x1="500" y1="150" x2="526" y2="170" stroke="#54b890" stroke-width="1.2" stroke-dasharray="4 3"/>
    <rect x="526" y="92" width="98" height="38" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="575" y="108" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">提醒</text>
    <text x="575" y="122" fill="#9aa4b2" font-size="9" text-anchor="middle">ReminderPlanner</text>
    <rect x="526" y="152" width="98" height="38" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="575" y="168" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">回顧</text>
    <text x="575" y="182" fill="#9aa4b2" font-size="8.5" text-anchor="middle">InsightsAggregator</text>
    <text x="575" y="210" fill="#54b890" font-size="9" text-anchor="middle">同一條規則,</text>
    <text x="575" y="223" fill="#54b890" font-size="9" text-anchor="middle">不用再抄一份</text>
    <text x="464" y="270" fill="#9aa4b2" font-size="9.5" text-anchor="middle">② 有了自己的家,提醒和回顧才借得到</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左邊不是寫壞了,是三個責任住在同一間。右邊多出來的不是程式碼,是三個各自答得出來的問題:設定存在哪、現在算哪個階段、畫面長什麼樣</figcaption>
</figure>

## 同一個判斷,五年住過五個地方

從左邊走到右邊不是一步到位。「現在算哪個階段」這個判斷,在 git 歷史上住過五個地方:

| 時間 | 它住在哪 | 這一站變了什麼 |
|---|---|---|
| 2021 年 8 月 | `DietFragment.updateTime()` | 跟讀設定、改畫面住在一起 |
| 2026-06-10 | `DietViewModel`(`6838606`) | 離開畫面了,但還是自己讀設定、自己看現在幾點 |
| 2026-06-11 | `DietWindow.compute()`(`d2955a0`) | 設定與「現在幾點」都變成參數;同一個 commit 帶進這個 repo 第一批真的單元測試,十個 |
| 2026-06-12 | 搬進 `domain/diet`(`729f986`) | 位置對了:它從來就不是畫面的東西 |
| 2026-06-20 | 搬進跨平台的 `:shared` 模組(`5bd1e2e`) | 為 iOS 鋪路:同一份規則,不必再寫一次 |

第三站最值得多看一眼。把「現在幾點」從 `System.currentTimeMillis()` 換成一個參數之後,測試變成一行一個情境(節錄):

```kotlin
// DietWindowTest.kt,2026-06-11:吃完第一餐兩小時後,還在進食視窗裡
@Test fun singleEat_duringWindow_isEating() {
    val s = DietWindow.compute(listOf(f), eh, fh, f + h(2))
    assertEquals(DietPhase.EATING, s.phase)
}
```

2021 年那個版本要驗同一件事,得先把畫面跑起來、把 SharedPreferences 塞好值,再想辦法騙過系統時間。在這個 commit 之前,整個 repo 的測試只有專案樣板附的那兩個範例。

## 搬對家之後,後面的改動才有地方去

真正的回報在後面。這個判斷有了自己的家之後,規則又改了三次,三次都改在[同一個檔案](https://github.com/Aidan79225/SportRecorder/blob/1fa8f8afcd593eac4ac9745f2930c35d4dea3249/shared/src/commonMain/kotlin/com/crazystudio/sportrecorder/domain/diet/DietWindow.kt):

- **2026-06-19**(`7e0ad7f`):稍微超過進食時數才吃的那一餐,併進同一個進食視窗,不另開新的。
- **2026-09-27**(`83f84f3`):回顧頁要把餐點分到「同一個進食日」——直接用同一條規則分,半夜十二點半的宵夜跟著前一晚的晚餐走。
- **2026-11-07**(`9e15ba6`):斷食改成從最後一餐**吃完**起算,不是從開始吃的那一刻。

三次,規則本身都只有一個地方要改。今天有四個地方在用這條規則——首頁的圓環、首頁的標語、回顧頁、提醒——測試從十個長到二十五個。

如果它還住在 Fragment 裡,提醒想知道「什麼時候達標」,只能把那段 `when` 抄一份出去;而抄出去的那一份,不會跟著上面這三次一起改。

**好的物件設計,是讓下一個改動有一個明顯該去的地方。** 這句話是整個系列的主軸,每一篇結尾都會回到它。

## OOAD 是哪兩件事

名字裡有兩個動詞。Craig Larman 在 *Applying UML and Patterns*(第三版)第一章的切法最乾淨:

- **分析(analysis)**:調查的是問題與需求,不是解法。放進物件導向,就是找出並描述**問題領域裡的概念**——餐點、進食視窗、斷食類型、店家。
- **設計(design)**:滿足需求的概念性解法,還不是實作。放進物件導向,就是定義**軟體物件**,以及它們怎麼**協作**來滿足需求。

他用一句話收:分析是 *do the right thing*,設計是 *do the thing right*。

同一章還有一句,是這個系列的脊椎。Larman 說,如果只能挑一項能力,物件導向開發裡最關鍵的是**把責任分配給軟體物件**(*a critical ability in OO development is to skillfully assign responsibilities to software objects*)。理由很樸素:這件事不管你是在畫圖還是在寫程式都**躲不掉**,而且它直接決定軟體好不好維護、能不能重用。

回頭看上面那張表——五列,每一列都是一次責任分配。

## 三個「我以為」

| 我以為 OOAD 是 | 其實 |
|---|---|
| 畫 UML | UML 只是記號。Larman 的原話是:它不是 OOA/D,也不是方法,「just diagramming notation」。會畫類別圖,跟知道哪個類別該負責什麼,是兩件事 |
| 背設計模式 | 模式是別人做過的責任分配,後來被取了名字。名字很有用——兩個字講完一個設計——但它是結果,不是起點 |
| 把需求裡的名詞變成 class | 那是分析的第一步,而且最容易做錯:名詞告訴你有哪些概念,沒告訴你事情歸誰 |

UML、設計模式、SOLID 這個系列都會談,但都排在後面。先會分配責任,那些工具才有地方用。

## 三個問題

這個系列把「好的物件設計」拆成三個問題,對任何一個物件都問得出口。剛好,2021 年那三十行每一題都答不出來:

### 歸誰:這段邏輯該住在哪?

2021 年它住在畫面裡,因為那裡最順手。現在它住在 `DietWindow`,而 `DietWindow` 只算階段。

### 藏什麼:它把哪個決定藏起來了?

2021 年,「設定存在 SharedPreferences」這件事誰都知道,畫面直接伸手去拿。現在這個決定藏在 `DietSettingsRepository` 後面——後來把儲存換成 DataStore,那個 commit(`07db03e`)只動了實作那一個檔,外加一份新測試。

### 叫什麼:名字講得出它是什麼嗎?

2021 年是 `eatTime.first` 和 `eatTime.second`:一個 `Pair<Long, Long>`,要讀完整個函式才猜得出兩個數字各是什麼。現在是 `windowStart`、`fastStartAt`、`fastTargetAt`——`DietWindowState` 的每個欄位都唸得出口。

之後每一篇都會交代它主要在練哪一題。

## 這件事歸誰

每一篇都有這一節:從案例裡拿一件真的事,列出候選人、各自的後果,然後判。這篇判的就是上面那一件。

**這件事**:判斷現在是進食中、斷食中,還是斷食達標。它需要三樣資訊——有哪些餐點、斷食類型的時數、現在幾點。

| 候選人 | 為什麼會想放這 | 放了之後 |
|---|---|---|
| 畫面(Fragment / Composable) | 結果就是要顯示在這裡 | 第二個要用的人只能抄;要測得先把畫面跑起來 |
| `DietViewModel` | 畫面的狀態本來就歸它管 | 提醒是開機後、在背景重排的,那裡沒有畫面,也沒有 ViewModel |
| 餐點自己(`EatRecord`) | 時間是它的資料 | 一筆餐點不認識別的餐點,也不知道使用者選了哪種斷食 |
| 一個只做這件事的 `DietWindow` | 三樣資訊都當參數交給它 | 多一個檔,多一次傳遞 |

**判給 `DietWindow`。** 它不握任何狀態,不認識畫面,也不認識儲存,只把「餐點 + 時數 + 現在」變成一個 `DietWindowState`。

**證據**有三:搬出來的那個 commit 同時帶進十個測試,在那之前這個判斷沒有任何測試;之後三次改規則都落在這個檔案;今天有四個地方共用它。

第三個候選人被否決的理由值得記一下。餐點確實握著時間,但這件事需要的資訊**不只在它身上**。「誰握有需要的資訊,事情就歸誰」是一條有名字的原則(Information Expert),系列後面會專門談它——包括它什麼時候會把你帶錯路。

## 什麼時候別用

答案就是 2021 年的那個版本。當時這個判斷只有一個使用者(首頁)、規則沒在變、也沒有任何測試——把它抽成獨立的物件,多出來的檔案與傳遞換不到任何東西。

該搬的訊號有三個,在這個 App 身上是 2026 年一次到齊:

1. **第二個使用者出現了。** 提醒要知道什麼時候達標,回顧要知道哪幾餐算同一天。
2. **規則開始變了。** 超時怎麼算、從哪一刻起算——每改一次,都要確定沒改壞別的。
3. **想測它了。** 跟時間有關的邏輯,不測就只能等。

一個都沒出現之前,把邏輯放在最順手的地方不是錯,是省。這跟[[pain-before-power|先痛過再上工具]]是同一個判準。

還有一件事要先講明。右邊那個 `DietWindow` 是 Kotlin 的 `object`——沒有狀態、沒有實例,就是一組純函式。它算不算「物件導向」?教科書大概會皺眉。這個系列的立場是:**責任分配這件事,不會因為你用的是 class、`object` 還是一個函式而消失。** 至於什麼時候該用物件、什麼時候不該,留到系列倒數第二篇。

## 這個系列的地圖

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 236" role="img" aria-label="系列地圖。上排五個方塊由左到右是五幕:第一幕分析,問題裡有什麼,談 use case、領域模型、不變量與契約;第二幕責任,這件事歸誰,談責任、資訊專家、封裝、耦合內聚、God class;第三幕形狀,類別長什麼樣,談狀態、值物件、繼承、組合、多型、介面;第四幕名字,前人取好的名字,談設計模式、SOLID、錯的抽象;第五幕演化,設計是改出來的,談測試回饋、重構、什麼時候別用、review。下排是三個問題,每一篇都在練其中一題:歸誰,這段邏輯該住在哪個物件;藏什麼,它把哪個決定藏起來了;叫什麼,它的名字業務聽得懂嗎。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="320" y="20" fill="#9aa4b2" font-size="9.5" text-anchor="middle">五幕,由左讀到右</text>
    <rect x="10" y="30" width="116" height="104" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="68" y="50" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">第一幕・分析</text>
    <text x="68" y="68" fill="#54b890" font-size="9.5" text-anchor="middle">問題裡有什麼</text>
    <text x="68" y="90" fill="#9aa4b2" font-size="9" text-anchor="middle">use case、領域模型</text>
    <text x="68" y="104" fill="#9aa4b2" font-size="9" text-anchor="middle">不變量與契約</text>
    <rect x="136" y="30" width="116" height="104" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="194" y="50" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">第二幕・責任</text>
    <text x="194" y="68" fill="#4f6df5" font-size="9.5" text-anchor="middle">這件事歸誰</text>
    <text x="194" y="90" fill="#9aa4b2" font-size="9" text-anchor="middle">責任、資訊專家、封裝</text>
    <text x="194" y="104" fill="#9aa4b2" font-size="9" text-anchor="middle">耦合內聚、God class</text>
    <rect x="262" y="30" width="116" height="104" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="320" y="50" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">第三幕・形狀</text>
    <text x="320" y="68" fill="#d6a45c" font-size="9.5" text-anchor="middle">類別長什麼樣</text>
    <text x="320" y="90" fill="#9aa4b2" font-size="9" text-anchor="middle">狀態、值物件、繼承</text>
    <text x="320" y="104" fill="#9aa4b2" font-size="9" text-anchor="middle">組合、多型、介面</text>
    <rect x="388" y="30" width="116" height="104" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/>
    <text x="446" y="50" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">第四幕・名字</text>
    <text x="446" y="68" fill="#9aa4b2" font-size="9.5" text-anchor="middle">前人取好的名字</text>
    <text x="446" y="90" fill="#9aa4b2" font-size="9" text-anchor="middle">設計模式、SOLID</text>
    <text x="446" y="104" fill="#9aa4b2" font-size="9" text-anchor="middle">錯的抽象</text>
    <rect x="514" y="30" width="116" height="104" rx="8" fill="#262b3a" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="572" y="50" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">第五幕・演化</text>
    <text x="572" y="68" fill="#e05a7d" font-size="9.5" text-anchor="middle">設計是改出來的</text>
    <text x="572" y="90" fill="#9aa4b2" font-size="9" text-anchor="middle">測試回饋、重構</text>
    <text x="572" y="104" fill="#9aa4b2" font-size="9" text-anchor="middle">什麼時候別用、review</text>
    <text x="131" y="86" fill="#9aa4b2" font-size="9" text-anchor="middle">›</text>
    <text x="257" y="86" fill="#9aa4b2" font-size="9" text-anchor="middle">›</text>
    <text x="383" y="86" fill="#9aa4b2" font-size="9" text-anchor="middle">›</text>
    <text x="509" y="86" fill="#9aa4b2" font-size="9" text-anchor="middle">›</text>
    <text x="320" y="160" fill="#9aa4b2" font-size="9.5" text-anchor="middle">每一篇都在練這三題的其中一題</text>
    <rect x="10" y="172" width="196" height="48" rx="8" fill="#1f2330" stroke="#3a4154" stroke-width="1.3"/>
    <text x="108" y="192" fill="#e6e6e6" font-size="11.5" text-anchor="middle" font-weight="bold">歸誰</text>
    <text x="108" y="209" fill="#9aa4b2" font-size="9" text-anchor="middle">這段邏輯該住在哪個物件?</text>
    <rect x="222" y="172" width="196" height="48" rx="8" fill="#1f2330" stroke="#3a4154" stroke-width="1.3"/>
    <text x="320" y="192" fill="#e6e6e6" font-size="11.5" text-anchor="middle" font-weight="bold">藏什麼</text>
    <text x="320" y="209" fill="#9aa4b2" font-size="9" text-anchor="middle">它把哪個決定藏起來了?</text>
    <rect x="434" y="172" width="196" height="48" rx="8" fill="#1f2330" stroke="#3a4154" stroke-width="1.3"/>
    <text x="532" y="192" fill="#e6e6e6" font-size="11.5" text-anchor="middle" font-weight="bold">叫什麼</text>
    <text x="532" y="209" fill="#9aa4b2" font-size="9" text-anchor="middle">它的名字,業務聽得懂嗎?</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">順序就是閱讀順序:先弄清楚問題裡有什麼,再決定事情歸誰,然後才談類別長什麼樣;名字與反面放在最後</figcaption>
</figure>

五幕各自在回答一件事:

- **分析**——跳過這一幕直接開 class,是最常見的起手式。use case、領域模型、不變量,都是在寫程式之前先把問題講清楚。
- **責任**——系列的核心。什麼叫責任、怎麼分、封裝到底在藏什麼、God class 是怎麼長出來的。
- **形狀**——最常吵架的幾題:狀態機該不該有、繼承是不是拿來重用的、多型什麼時候值得、介面是誰的。
- **名字**——設計模式與 SOLID。前面三幕做過的事,業界早就取好名字了;名字是拿來溝通的,不是拿來套的。
- **演化**——設計是改出來的,所以要談測試與重構;也有不該用物件的時候,所以要有一篇反面。

每一篇固定有四樣東西:一張扛著「責任搬家」的圖、真實程式碼的前後對照、一節〈這件事歸誰〉、一節〈什麼時候別用〉。例子只來自真的 repo——SportRecorder、[[gitcrisp|GitCrisp]],以及這個部落格寫過的那些戰場——**不會出現 Animal、Dog、Shape**。

案例以 Kotlin 為主,因為我寫了八年 Android;近兩年做的是 Backend 和 Data,所以後面也會有 Python 的例子。

## 反思

### 2021 年的寫法沒有錯

回頭看那三十行:當時我把判斷寫在 Fragment 裡,純粹是求快;而且邏輯還不複雜,抽進 MVVM 反而看起來更像 over design。

拿上面那三個訊號去對,2021 年一個都沒有亮——沒有第二個使用者、規則沒在變、也沒有人在測它。所以那不是一個錯的設計,是還沒到該搬的時候。真正的問題是另一種:訊號已經亮了,還讓它繼續住在原地。

所以這個系列不會寫成「正確答案大全」。同一段邏輯,放在 Fragment 裡可以是對的,放在獨立的物件裡也可以是對的,差別在那個當下它有幾個使用者、多常變。

### 停了五年,回來的理由

這個 repo 的歷史在 2021 年 8 月之後幾乎是空白,2026 年 6 月才又動起來。回來的理由很直接:有了 AI,才有時間做。我一直想要一個追蹤自己飲食的日記;原本的 repo 已經上架 Google Play,這次重構想把它做成 Compose Multiplatform,上架 iOS。

所以上面那張表的後四站,不是我一行一行敲出來的。方向是我指定的——我要它走 Clean Architecture;實作大部分交給 AI;我做的是訂規則和驗收。這個系列之後引用 2026 年的 commit,都是這個分工下的產物。

### 分層,現在是寫給 review 的人看的

我指定走 Clean Architecture,有一個很實際的理由:review 的時候,光看一段程式放在哪個資料夾,就能預先知道裡面該是哪一類實作。現在有 AI,明確的分層更方便人去 review。

我現在已經很少退回去叫 AI 重做了——因為在它動手之前,規則和 review 的規則就先寫好了。

規則寫得出來的前提,是寫規則的人自己答得出「這件事歸誰」。AI 一分鐘可以給你十個 class,每一個都工整;哪個判斷該住在哪,它不會替你決定,除非你先講。[[ai-review-craft|怎麼驗收 AI 寫的 code]] 是另一個系列的題目,這裡只補它的前提:**得先知道對的設計長什麼樣,才驗得出來。**

收一句這篇的判斷:**class 誰來寫都可以;這件事歸誰,得是你答得出來的。**
