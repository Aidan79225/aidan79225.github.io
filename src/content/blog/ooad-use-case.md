---
title: "Use case 不是功能清單:難的都不在主線上"
date: 2026-11-18
category: tech
description: "OOAD 的第一步不是開 class,是弄清楚有哪些事要判。功能清單答不了這一題,use case 可以——因為它逼你寫出主線以外的每一種走法。拿 SportRecorder 逆向寫兩個 use case:一條 2021 年就在的規則,2026 年搬家時只搬了一半;一個一句話講得完的功能,後面跟了三個 PR。"
tags:
  - ooad
  - use-case
  - requirements
  - kotlin
series: "OOAD 我以為我懂"
seriesOrder: 2
comments: true
draft: true
---
[[ooad-intro|上一篇]]把 OOAD 講成一連串「這件事歸誰」的決定。可是在判之前還有更早的一題:**有哪些事要判?**

最常見的答案是一張功能清單。這個系列的案例 SportRecorder 是一支飲食紀錄 App,它最核心的功能「記一餐」寫成清單,大概是這樣:

- 可以新增一筆餐點
- 可以選日期與時間
- 可以附照片、備註、店家與位置

每一條都對,拿去排工作也夠用。可是照著它把功能做完,下面這些事沒有一件有人回答過:選的時間在未來怎麼辦?使用者不給定位權限,還能不能存?照片匯不進來呢?填到一半關掉,剛拍的那幾張照片留不留?

這些才是要判的事。把它們逼出來的寫法有個名字,叫 **use case**。

## 把「記一餐」寫成 use case

我請 AI 把這個流程從程式和 spec 逆向寫回來。格式是 Alistair Cockburn 在 *Writing Effective Use Cases* 裡的骨架,只留最要緊的幾欄:

**Use case:記一餐**

- **Primary actor**:想留下飲食紀錄的使用者
- **目標層級**:user goal
- **actor 在意的事**:記錄要快、要輕鬆
- **主線**(main success scenario)
  1. 使用者在首頁按「+」。
  2. 系統開出一筆新的餐點:時間是現在,用餐時間一小時,並帶上目前的位置;其餘空著。
  3. 使用者按「新增」。
  4. 系統存下這一餐,重排提醒;首頁的圓環跟著更新。
- **Extensions**
  - 1a. 使用者不想打開 App:從下拉通知欄按一下「記一餐」,系統直接記一筆「現在」,不開編輯畫面。
  - 2a. 使用者拒絕提供位置,或一時定不到位:位置那一列顯示「無位置」,照樣能存。
  - 3a. 選的時間在未來:系統不存。
  - 3b. 照片匯不進來:不加這一張,其餘照舊。
  - 3c. 這一餐和另一餐的時間重疊:照記。
  - 3d. 沒按「新增」就關掉:這次拍的照片檔一併刪掉,已經存過的不動。

主線四步,拿給誰看都會點頭。六條 extensions 就不一樣了——每一條都是一個要有人負責的決定,而且沒有一條是為了這篇文章編的:

| | 在 repo 裡的出處 |
|---|---|
| 1a | `QuickRecordMealUseCase`,2026-10-04 加的。註解寫著它存在的理由:*it costs one tap from outside the app* |
| 2a | 2026-06-10 的 spec:「拒絕 / 取不到 → lat/lng 為 null,紀錄仍可儲存」 |
| 3a | 2021 年就在的規則,下一節專門講 |
| 3b | 匯入失敗時回傳 null,ViewModel 收到 null 就不加這一張 |
| 3c | 2026-11-07 的 spec:*meals may overlap — the app records, it does not judge* |
| 3d | 2026-06-11 的 spec:「未存檔就關閉:只刪本次 `pendingPhotos` 的檔……既有照片絕不動」 |

3c 值得多看一眼:它的處理是「不處理」。兩餐重疊,系統照記——這不是漏掉,是 spec 上白紙黑字的決定,理由就是這支 App 的原則:只記錄,不評價。**列出 extension 不代表每一條都要擋;它逼的是每一條都要有人決定。**

## 一條 extension 的五年

3a 是這六條裡最老的。2021 年我寫的版本長這樣(節錄):

```kotlin
// CreateEatTimeViewModel.kt,2021 年 8 月(commit 583bdfb)
suspend fun createEatingTime(): Boolean {
    return if (currentCalendar.timeInMillis > Calendar.getInstance().timeInMillis) {
        false
    } else {
        eatTimeDao.insert(EatTime(time = currentCalendar.timeInMillis))
        true
    }
}
```

畫面那一頭收到 `false`,就跳一則訊息告訴你:時間不能超過現在。

同一條規則,[現在住在這裡](https://github.com/Aidan79225/SportRecorder/blob/d294a3bccea01856998b92c3733581993f29f3c7/shared/src/commonMain/kotlin/com/crazystudio/sportrecorder/domain/usecase/SaveEatRecordUseCase.kt)(節錄):

```kotlin
// SaveEatRecordUseCase.kt
suspend operator fun invoke(
    record: EatRecord,
    newPhotoFileNames: List<String>,
    removedPhotos: List<EatPhoto>,
    now: Long = Clock.System.now().toEpochMilliseconds(),
): Boolean {
    if (record.time > now) return false
    repository.save(record, newPhotoFileNames, removedPhotos)
    rescheduleReminders.reschedule()
    return true
}
```

條件一個字都沒變:時間比現在晚,就回傳 `false`。變的是它住的地方——從 ViewModel 搬進一個只管存檔的類別,「現在幾點」變成參數,所以測得到(跟上一篇的 `DietWindow` 是同一招)。搬過去的那個 commit(`30d8919`,2026-06-12)帶了兩個測試,現在是三個。

到這裡都是好消息。問題在另一半。

Craig Larman 在 *Applying UML and Patterns* 講 use case 的那一章(這篇引的句子出自第二版的第六章)提醒過:一條 extension 有兩個部分,條件和處理——*the condition and the handling*。2021 年的版本兩半都在:條件在 ViewModel,處理在 Fragment。2026 年 6 月 10 日,把這個畫面換成 Compose 的那個 commit(`a3293b5`)刪掉了 Fragment,那則訊息跟著走了。新的畫面只接了成功的那一邊,[到今天都是](https://github.com/Aidan79225/SportRecorder/blob/d294a3bccea01856998b92c3733581993f29f3c7/app/src/main/java/com/crazystudio/sportrecorder/ui/AppRoot.kt#L341-L343):

```kotlin
// AppRoot.kt
onConfirm = {
    scope.launch { if (vm.save()) navController.popBackStack() }
},
```

沒有 `else`。所以今天選一個未來的時間、按下「新增」:不會存,畫面不會關,**也沒有任何一個字告訴你為什麼**。那則訊息的字串還躺在資源檔裡,lint 把它標成沒有人用。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 290" role="img" aria-label="左右對照,同一條 extension「選的時間在未來」的兩半。左邊是 2021 年:條件住在 CreateEatTimeViewModel——選的時間在未來就回傳 false;false 往下交給 CreateEatTimeDialogFragment,處理住在那裡——跳一則訊息,畫面留著讓你改。當時沒有測試,但使用者知道為什麼沒存。中間一個箭頭寫著搬家。右邊是現在:條件搬進了 SaveEatRecordUseCase,旁邊有三個測試;false 往下交給 AppRoot 的畫面,處理那一格是虛線——沒有跟來:不存、不關畫面,也不說為什麼。條件有了家、有了測試;訊息掉在搬家的路上。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="ooad2a" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="150" y="24" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">2021:條件和處理都在</text>
    <rect x="16" y="38" width="268" height="214" rx="10" fill="#1f2330" stroke="#3a4154" stroke-width="1.4"/>
    <text x="150" y="60" fill="#e6e6e6" font-size="10.5" text-anchor="middle">CreateEatTimeViewModel</text>
    <rect x="32" y="70" width="236" height="48" rx="7" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="150" y="90" fill="#d6a45c" font-size="11" text-anchor="middle" font-weight="bold">條件</text>
    <text x="150" y="106" fill="#9aa4b2" font-size="9.5" text-anchor="middle">選的時間在未來 → 回傳 false</text>
    <line x1="150" y1="118" x2="150" y2="150" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ooad2a)"/>
    <text x="158" y="138" fill="#9aa4b2" font-size="9">false</text>
    <text x="150" y="172" fill="#e6e6e6" font-size="10.5" text-anchor="middle">CreateEatTimeDialogFragment</text>
    <rect x="32" y="182" width="236" height="48" rx="7" fill="#262b3a" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="150" y="202" fill="#e05a7d" font-size="11" text-anchor="middle" font-weight="bold">處理</text>
    <text x="150" y="218" fill="#9aa4b2" font-size="9.5" text-anchor="middle">跳一則訊息,畫面留著讓你改</text>
    <text x="150" y="272" fill="#9aa4b2" font-size="9.5" text-anchor="middle">沒有測試,但使用者知道為什麼沒存</text>
    <line x1="290" y1="146" x2="332" y2="146" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#ooad2a)"/>
    <text x="311" y="136" fill="#9aa4b2" font-size="9.5" text-anchor="middle">搬家</text>
    <text x="481" y="24" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">現在:只搬了一半</text>
    <rect x="338" y="38" width="286" height="214" rx="10" fill="#1f2330" stroke="#3a4154" stroke-width="1.4"/>
    <text x="481" y="60" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">SaveEatRecordUseCase</text>
    <rect x="354" y="70" width="176" height="48" rx="7" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="442" y="90" fill="#d6a45c" font-size="11" text-anchor="middle" font-weight="bold">條件</text>
    <text x="442" y="106" fill="#9aa4b2" font-size="9.5" text-anchor="middle">時間在未來 → 回傳 false</text>
    <rect x="538" y="70" width="70" height="48" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="573" y="90" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">測試</text>
    <text x="573" y="106" fill="#9aa4b2" font-size="9.5" text-anchor="middle">3 個</text>
    <line x1="481" y1="118" x2="481" y2="150" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ooad2a)"/>
    <text x="489" y="138" fill="#9aa4b2" font-size="9">false</text>
    <text x="481" y="172" fill="#e6e6e6" font-size="10.5" text-anchor="middle">AppRoot(畫面)</text>
    <rect x="354" y="182" width="254" height="48" rx="7" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3" stroke-dasharray="5 4"/>
    <text x="481" y="202" fill="#e05a7d" font-size="11" text-anchor="middle" font-weight="bold">處理:沒有跟來</text>
    <text x="481" y="218" fill="#9aa4b2" font-size="9.5" text-anchor="middle">不存、不關畫面,也不說為什麼</text>
    <text x="481" y="272" fill="#9aa4b2" font-size="9.5" text-anchor="middle">條件有了家、有了測試;訊息掉在搬家的路上</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一條 extension 有兩半:什麼情況(條件)、遇到了怎麼辦(處理)。條件是系統裡面的事,寫得成測試;處理是 actor 看到的事,沒有寫成文字,就沒有東西可以拿來對</figcaption>
</figure>

「自訂斷食類型不能重複」是同一個故事(`7f0671d`):條件搬進了 `CreateCustomFastingTypeUseCase`,有測試;2021 年那則提醒你類型重複的訊息沒有跟來,現在按下確認,畫面直接關掉。

兩條規則、兩次搬家,掉的都是同一半。原因不難懂。**條件是系統裡面的事,寫得成測試**——那三個測試,加上 repo 的測試規格裡關於這條規則的三列,看的都是系統裡面:回傳值、有沒有寫入、提醒有沒有重排。**處理是 actor 看到的事**,它不在任何一個回傳值裡。沒有一份文字寫著「使用者會看到什麼」,就沒有東西可以拿來對。

這兩處是這次逆向寫 use case 的時候對出來的,寫這篇的當下還沒修。

## Use case 是什麼

照 Larman 的講法,use case 是一組相關的成功與失敗情境,描述 actor 怎麼用一個系統達成一個目標。四件事值得記:

- **它是文字,不是圖。** Larman 寫得很直接:*Use cases are text documents, not diagrams*。Cockburn 在序言裡說得更白——寫 use case 根本上是在寫文章。
- **它從 actor 的目標出發。** 名字是一個目標(「記一餐」),不是一個畫面(「編輯器」),也不是一個動作(「寫入資料庫」)。
- **主線很短,其餘都在 extensions。** Cockburn 給的寫作順序是先寫主線,三到九步;再把系統偵測得到、而且必須處理的條件**窮舉**出來;最後才替每一條寫處理。Extensions 也不等於「例外」——上面的 1a 一點都不例外,它只是另一種走法。
- **它把系統當黑箱。** 只寫系統**做什麼**,不寫怎麼做:寫「系統存下這一餐」,不寫「系統在一個交易裡新增一列」。

第四點是它跟這個系列接上的地方。Larman 說,黑箱式的 use case 是把系統描述成一個**有責任的東西**。換句話說,use case 列的是「系統」這個最大的物件要負的責任;設計接下來做的事,是把這些責任往下分給裡面的物件。

Larman 還有一句很誠實的話:*There is nothing object-oriented about use cases*。Use case 本身一點都不物件導向,它是需求,是物件導向設計的**輸入**。所以這個系列的第一幕叫「分析」——還沒開始分配,先弄清楚有什麼要分。

## 三個「我以為」

| 我以為 use case 是 | 其實 |
|---|---|
| 那張小人加橢圓的圖 | 圖是目錄:看得到有哪些 actor、哪些 use case,看不到任何一條「萬一」。內容全在文字裡 |
| user story 或功能清單的另一種寫法 | 三個東西回答的問題不同。功能清單答**做哪些**(範圍);user story 答**這次排哪一塊**——Martin Fowler 的說法是把需求切成一塊一塊,為的是排計畫(*chunks for planning purposes*);use case 答**系統要怎麼表現**(行為)。一張 story 可以是某個 use case 的一條情境,或其中幾步 |
| 主線寫完就寫完了 | 主線是最不用寫的部分。Cockburn 後來寫過一篇〈Why I still use use cases〉,理由之一就是 extension conditions:它給了一個框架,去追那些瑣碎、卻吃掉八成時間與預算的事(*take up 80% of the development time and budget*) |

User story 沒有不好。Ron Jeffries 把它講得很清楚:卡片本身不是需求,只是一個提醒大家「這件事要找人談」的信物——它本來就沒打算把行為寫完。問題出在拿卡片當 use case 用:Cockburn 在同一篇文章裡說,一疊 story 給不了設計的人脈絡,也看不出「是不是都想到了」。

站內有兩個現成的例子。[[rezero-overview|直播代購那個系列的第一篇]]列過那門生意的規則:`2601+2` 就是下單兩件、重複留言以最後一筆為準、還沒註冊的人也要先卡庫存——第一條是主線,後面每一條都是 extension;那篇自己的說法是「功能列表不難」。[[lottery|社區抽籤那篇]]是另一種:實際跑過一場之後,才發現「名單順序也是輸入的一部分」。沒被列出來的條件,通常都是這樣被發現的。

## 寫在哪個高度

同一件事可以寫得很大(「管理我的飲食」),也可以寫得很小(「選日期」)。Cockburn 把目標層級(goal level)分成三層,用海平面來比喻:

| 層級 | 白話 | 在 SportRecorder |
|---|---|---|
| summary(雲、風箏) | 要好幾次、好幾天才做得完 | 養成記錄的習慣(README 寫的循環:Capture → Reflect → Insight → Re-engage) |
| **user goal(海平面)** | 一個人一次做完,做完有看得見的價值 | 記一餐;從 Google 地圖分享一個地點進來 |
| subfunction(海面下) | 沒有人會為了它打開 App | 選日期;挑一家店;讀一筆餐點出來 |

要寫的是海平面那一層。Larman 的測法很生動:老闆問你今天做了什麼,你回答「我登入了二十次」——登入不是一個 user goal。

這裡有一個名字上的陷阱。SportRecorder 裡有十個名字以 `UseCase` 結尾的 class,那是 Clean Architecture 的一層,跟這篇講的 use case 同名,卻不是同一個東西:

- `LoadEatRecordUseCase` 只有一行:`repository.findById(id)`。它在海面下。
- 「記一餐」的主線會經過 `SaveEatRecordUseCase`,1a 那條經過 `QuickRecordMealUseCase`——一個 use case 對到兩個 class。
- 「從 Google 地圖分享一個地點進來」沒有任何一個 `UseCase` class 對得上。把它串起來的那一段(讀連結 → 比對 → 寫入)目前住在[一個 789 行的 ViewModel](https://github.com/Aidan79225/SportRecorder/blob/d294a3bccea01856998b92c3733581993f29f3c7/shared/src/commonMain/kotlin/com/crazystudio/sportrecorder/ui/diet/editor/EatTimeEditorViewModel.kt) 裡,repo 自己的待重構清單上記著要把它抽出來。

連 repo 的 spec 也一樣:38 份裡,標題叫「Use cases」的小節有兩個,指的都是這一層 class。

上一篇的三個問題,這篇主要在練**叫什麼**。Use case 是整個設計裡第一個得用 actor 的話寫的東西:它叫「記一餐」——下拉通知欄那顆按鈕上寫的也是這三個字——不叫「新增 `EatRecord`」。名字在這裡定下來,後面的 class 才有東西可以對。同一個名字指兩件事,就是這一題沒答好的樣子。這篇之後講 use case,指的都是文字的那一個。

## 第二個 use case:一句話講得完,後面跟了三個 PR

「記一餐」的 extensions 還算少。同一支 App 裡有另一個功能,把這篇的標題整個演了一遍:從 Google 地圖把一家店分享進來。

[它的 spec](https://github.com/Aidan79225/SportRecorder/blob/d294a3bccea01856998b92c3733581993f29f3c7/docs/superpowers/specs/2026-10-10-maps-share-design.md) 開頭的 Goal,自己就是一條主線:*in Maps, tap Share → SportRecorder → Save*。寫成 use case:

**Use case:從 Google 地圖分享一個地點進來**

- **Primary actor**:人在 Google 地圖裡、剛找到一家店的使用者
- **主線**
  1. 使用者對一個地點按「分享」,選 SportRecorder。
  2. 系統開出一筆新的餐點:時間是現在,店家已經填好,名字和位置都來自那個連結。
  3. 使用者按「新增」。
  4. 系統存下這一餐,把使用者送回 Google 地圖。
- **最低保證**:連結讀不讀得出來,這一餐都存得了。

最低保證(minimal guarantee)是 Cockburn 骨架裡的一欄:就算 actor 的目標沒達成,系統也要守住的那句話。這一句不用逆向——spec 有一節的標題就叫 *Failure — a share never blocks a meal*。

Extensions 畫在圖上:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 380" role="img" aria-label="「從 Google 地圖分享一個地點進來」這個 use case 的解剖。左邊是主線,四步由上到下:一,使用者在地圖按分享,選這個 App;二,系統開一筆新餐點,店家已填好;三,使用者按新增;四,系統存檔,送使用者回地圖。右邊是 extensions,主線以外的每一種走法,共七條,每一條都對到程式裡一個有名字的東西。從第二步岔出去的五條:2a 分享進來的不是 Google 地圖連結,對到 MapsLink.find,白名單外的網址造不出來;2b 連結讀不到,例如沒網路或逾時,對到 MapsLinkResolver,只送一個請求,五秒放棄;2c 連結裡沒有位置,手機 App 產生的連結就是這樣,對到 MapsPlaceReader,改用地址去查位置;2d 同名的店存過了,就在五十公尺內,對到 SharedVenueMatch.Use,直接用,不問;2e 同名的店存過了,但離很遠,對到 SharedVenueMatch.AskWhichStore,問使用者是哪一家。任何一步都可能發生的兩條:星號 a,讀到一半使用者自己選了店家,對到 dropSharedPlace,使用者的選擇優先;星號 b,問到一半 App 被系統回收,對到 PlaceRun.Share,答過的不再問一次。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="ooad2b" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="92" y="22" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">主線:四步</text>
    <text x="412" y="22" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">Extensions:主線以外的每一種走法</text>
    <rect x="16" y="36" width="152" height="50" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="92" y="56" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">① 使用者</text>
    <text x="92" y="73" fill="#9aa4b2" font-size="9" text-anchor="middle">在地圖按分享,選這個 App</text>
    <line x1="92" y1="86" x2="92" y2="101" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ooad2b)"/>
    <rect x="16" y="104" width="152" height="50" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="92" y="124" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">② 系統</text>
    <text x="92" y="141" fill="#9aa4b2" font-size="9" text-anchor="middle">開一筆新餐點,店家已填好</text>
    <line x1="92" y1="154" x2="92" y2="169" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ooad2b)"/>
    <rect x="16" y="172" width="152" height="50" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="92" y="192" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">③ 使用者</text>
    <text x="92" y="209" fill="#9aa4b2" font-size="9" text-anchor="middle">按「新增」</text>
    <line x1="92" y1="222" x2="92" y2="237" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ooad2b)"/>
    <rect x="16" y="240" width="152" height="50" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="92" y="260" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">④ 系統</text>
    <text x="92" y="277" fill="#9aa4b2" font-size="9" text-anchor="middle">存檔,送使用者回地圖</text>
    <line x1="168" y1="129" x2="184" y2="129" stroke="#d6a45c" stroke-width="1.2"/>
    <line x1="184" y1="57" x2="184" y2="249" stroke="#d6a45c" stroke-width="1.2"/>
    <line x1="184" y1="57" x2="200" y2="57" stroke="#d6a45c" stroke-width="1.2"/>
    <line x1="184" y1="105" x2="200" y2="105" stroke="#d6a45c" stroke-width="1.2"/>
    <line x1="184" y1="153" x2="200" y2="153" stroke="#d6a45c" stroke-width="1.2"/>
    <line x1="184" y1="201" x2="200" y2="201" stroke="#d6a45c" stroke-width="1.2"/>
    <line x1="184" y1="249" x2="200" y2="249" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="80" y="317" fill="#9aa4b2" font-size="9.5" text-anchor="middle">*:任何一步</text>
    <text x="80" y="331" fill="#9aa4b2" font-size="9.5" text-anchor="middle">都可能發生</text>
    <line x1="120" y1="321" x2="184" y2="321" stroke="#d6a45c" stroke-width="1.2" stroke-dasharray="4 3"/>
    <line x1="184" y1="297" x2="184" y2="345" stroke="#d6a45c" stroke-width="1.2" stroke-dasharray="4 3"/>
    <line x1="184" y1="297" x2="200" y2="297" stroke="#d6a45c" stroke-width="1.2" stroke-dasharray="4 3"/>
    <line x1="184" y1="345" x2="200" y2="345" stroke="#d6a45c" stroke-width="1.2" stroke-dasharray="4 3"/>
    <rect x="200" y="36" width="424" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="208" y="43" width="26" height="16" rx="4" fill="#2e2a20" stroke="#d6a45c" stroke-width="1"/>
    <text x="221" y="55" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">2a</text>
    <text x="244" y="54" fill="#e6e6e6" font-size="10.5">分享進來的不是 Google 地圖連結</text>
    <text x="244" y="70" font-size="9.5"><tspan fill="#4f6df5">→ MapsLink.find()</tspan><tspan fill="#9aa4b2">:白名單外的網址造不出來</tspan></text>
    <rect x="200" y="84" width="424" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="208" y="91" width="26" height="16" rx="4" fill="#2e2a20" stroke="#d6a45c" stroke-width="1"/>
    <text x="221" y="103" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">2b</text>
    <text x="244" y="102" fill="#e6e6e6" font-size="10.5">連結讀不到(沒網路、逾時)</text>
    <text x="244" y="118" font-size="9.5"><tspan fill="#4f6df5">→ MapsLinkResolver</tspan><tspan fill="#9aa4b2">:只送一個請求,五秒放棄</tspan></text>
    <rect x="200" y="132" width="424" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="208" y="139" width="26" height="16" rx="4" fill="#2e2a20" stroke="#d6a45c" stroke-width="1"/>
    <text x="221" y="151" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">2c</text>
    <text x="244" y="150" fill="#e6e6e6" font-size="10.5">連結裡沒有位置(手機 App 產生的)</text>
    <text x="244" y="166" font-size="9.5"><tspan fill="#4f6df5">→ MapsPlaceReader</tspan><tspan fill="#9aa4b2">:改用地址去查位置</tspan></text>
    <rect x="200" y="180" width="424" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="208" y="187" width="26" height="16" rx="4" fill="#2e2a20" stroke="#d6a45c" stroke-width="1"/>
    <text x="221" y="199" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">2d</text>
    <text x="244" y="198" fill="#e6e6e6" font-size="10.5">同名的店存過了,就在 50 公尺內</text>
    <text x="244" y="214" font-size="9.5"><tspan fill="#4f6df5">→ SharedVenueMatch.Use</tspan><tspan fill="#9aa4b2">:直接用,不問</tspan></text>
    <rect x="200" y="228" width="424" height="42" rx="7" fill="#1f2330" stroke="#e05a7d" stroke-width="1.4"/>
    <rect x="208" y="235" width="26" height="16" rx="4" fill="#2e2a20" stroke="#d6a45c" stroke-width="1"/>
    <text x="221" y="247" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">2e</text>
    <text x="244" y="246" fill="#e6e6e6" font-size="10.5">同名的店存過了,但離很遠</text>
    <text x="244" y="262" font-size="9.5"><tspan fill="#4f6df5">→ SharedVenueMatch.AskWhichStore</tspan><tspan fill="#9aa4b2">:問使用者是哪一家</tspan></text>
    <rect x="200" y="276" width="424" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="208" y="283" width="26" height="16" rx="4" fill="#2e2a20" stroke="#d6a45c" stroke-width="1"/>
    <text x="221" y="295" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">*a</text>
    <text x="244" y="294" fill="#e6e6e6" font-size="10.5">讀到一半,使用者自己選了店家</text>
    <text x="244" y="310" font-size="9.5"><tspan fill="#4f6df5">→ dropSharedPlace()</tspan><tspan fill="#9aa4b2">:使用者的選擇優先</tspan></text>
    <rect x="200" y="324" width="424" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="208" y="331" width="26" height="16" rx="4" fill="#2e2a20" stroke="#d6a45c" stroke-width="1"/>
    <text x="221" y="343" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">*b</text>
    <text x="244" y="342" fill="#e6e6e6" font-size="10.5">問到一半,App 被系統回收</text>
    <text x="244" y="358" font-size="9.5"><tspan fill="#4f6df5">→ PlaceRun.Share</tspan><tspan fill="#9aa4b2">:答過的不再問一次</tspan></text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左邊四步,spec 用一句話就講完了。右邊每一條,後來都在程式裡有了名字——型別、介面,或一個函式。2e 是下面〈這件事歸誰〉要判的那一條</figcaption>
</figure>

主線加上其中幾條 extensions,是第一個 PR。然後又來了兩個:

- **[#88](https://github.com/Aidan79225/SportRecorder/pull/88)**(2026-10-18 合併,15 個 commit):主線,加上 2a、2b、2d、\*a、\*b。
- **[#90](https://github.com/Aidan79225/SportRecorder/pull/90)**(2026-10-18 合併,19 個 commit):2e——連鎖店同名,卻不是同一家。同一個 PR 也做了店家的編輯、刪除與貼上連結。
- **[#91](https://github.com/Aidan79225/SportRecorder/pull/91)**(2026-10-28 合併,44 個 commit):2c——連結裡沒有位置。

第三個最值得講,因為它不是哪一條「萬一」,是**主線自己的假設錯了**。第 2 步寫「名字和位置都來自那個連結」,這句話是拿一個真的連結驗過的——只是那個連結是在 Google 地圖的**網站**上產生的。手機 App 分享出來的連結長得不一樣:裡面沒有位置,店名還跟地址黏成一串。spec 後來的增補記著那則 bug 回報:「貼上連結不會把店名和地址正確填入欄位」。

Cockburn 的骨架裡有一欄就是留給這種事的,叫 Technology and Data Variations:要做的事一樣,資料進來的樣子不只一種。「連結是誰產生的」當初沒有人列;補上它的那個 PR,有 44 個 commit。

## spec 照時間排,use case 照目標排

SportRecorder 不是沒有需求文件。`docs/superpowers/specs/` 裡有 38 份 spec;2026-06-20 起的二十份,每一份都以「初衷對照 / North-Star check」收尾,跟分享有關的那幾份還有 Goal、Decisions taken with the owner 與 Out of scope。拿它跟 use case 對一下,兩邊各有對方沒有的東西。

**spec 有、use case 沒有的:**

- **誰決定的。** 「Decisions taken with the owner」把每個岔路口的選擇記成一張表。Use case 只寫系統怎麼表現,不寫這個表現是誰拍板的。
- **回頭對初衷。** 最後一節拿 README 的那幾句(記錄要快、要輕鬆;只記錄,不評價)對一次;最近的幾份還會列出這次改動可能怎麼背離它。Cockburn 的骨架有一欄 Stakeholders and Interests 在做類似的事;這裡多做了一步。

**use case 有、spec 沒有的:**

- **照目標排。** spec 是一次改動一份,照日期排。「分享一個地點進來」現在的行為,散在 10 月 10 日、10 月 18 日兩份 spec 和一段增補裡,後面的會改寫前面的——第二份寫明它取代第一份整個比對的小節。要知道系統**現在**怎麼表現,得照日期讀完,再自己把改寫套上去。Use case 是一個目標一份,寫的是現在。
- **一個固定放「萬一」的地方。** 38 份 spec 裡,有一節專門寫失敗的只有 3 份。其他的「萬一」散在風險、測試表和程式註解裡——或者像 3a 的另一半,哪裡都沒有。
- **站在 actor 那一邊。** spec 是設計文件,同時寫做什麼與怎麼做(哪個 class、哪個介面)。這沒有錯,只是「使用者會看到什麼」很容易被「回傳 Boolean」蓋過去。

這個 repo 裡最接近 use case 的,是一份測試規格:它照流程分組,每一列標著 Happy path、Failure 或 Boundary。可是它對的是系統裡面——3a 的那一列寫的是「回傳 false、清單沒變」。

兩種文件不衝突。spec 記的是**這一次為什麼這樣改**,use case 記的是**改完之後系統是什麼樣子**。這個 repo 有前者,缺後者。

## 這件事歸誰

Use case 這一層的「歸誰」,候選人不是 class,是**系統和 actor**。

**這件事**:分享進來一家「麥當勞」,使用者存過一家同名的,可是兩個位置差了一公里多。它們是不是同一家店——誰說了算?

| 候選人 | 做法 | 後果 |
|---|---|---|
| 系統,看名字 | 同名就是同一家,位置改成地圖給的 | 兩家分店被併成一家;舊紀錄的位置跟著被改掉 |
| 系統,看距離 | 離得遠就是另一家,自動多建一家 | 同一家店只是當初位置記錯,從此變成兩家,紀錄分兩邊 |
| 系統,看有沒有歷史 | 沒有紀錄的直接搬;有紀錄才問「要不要搬」 | 問題問錯了:遇到連鎖店,使用者要的不是搬,是多一家 |
| 使用者 | 系統先選起最近的那一家,再問一次:是另一家分店/同一家,更新位置/同一家,位置不變 | 記一餐的路上多一個問題;所以 50 公尺內不問 |

第三列不是假想的。它是 10 月 10 日那份 spec 的規則,10 月 17 日寫成了程式,型別叫 `AskToMove`——隔天就被換掉了。

**判給使用者。** 理由寫在[取代它的那份 spec](https://github.com/Aidan79225/SportRecorder/blob/d294a3bccea01856998b92c3733581993f29f3c7/docs/superpowers/specs/2026-10-18-venue-branches-design.md) 裡:名字和距離都分不出「另一家分店」和「同一家,舊的位置記錯了」,所以只能問,而且要用使用者答得出來的話問。程式裡的註解更短:*only the user knows*。

**證據**有三:型別從 `AskToMove` 換成 `AskWhichStore`;問題從一個是非題變成三選一;關掉對話框等於「同一家,位置不變」——什麼都不建,什麼都不搬。

判完之後,系統手上剩下的那一半才輪到物件來分:50 公尺內算同一個地方、還沒有位置的那一家優先補上位置,這些現在都住在[一個純函式](https://github.com/Aidan79225/SportRecorder/blob/d294a3bccea01856998b92c3733581993f29f3c7/shared/src/commonMain/kotlin/com/crazystudio/sportrecorder/domain/venue/SharedVenue.kt#L59-L92) `SharedVenue.match()` 裡。那是下一幕的事。

## 什麼時候別用

Use case 不是免費的——Cockburn 自己都說它比 user story 重,也比較難寫。三種情況不值得:

1. **Extensions 一隻手數得完,而且都在一個人的腦袋裡。** 2021 年的 SportRecorder 就是這樣:整個 repo 沒有任何一份文件,63 個 commit 裡有 61 個的訊息只有檔名。當時「記一餐」在程式裡看得到的 extension 只有 3a 一條,而條件和處理都在。
2. **沒有 actor 在跟它互動的東西。** `DietWindow.compute()` 是純計算,資料管線也是這一類。Larman 舉的例子是中介軟體、資料庫這種後端系統:它們比較適合從功能的角度去想(「下一版要支援 XML」)。這類東西難的地方不在「誰對系統做了什麼」。
3. **CRUD 畫面:主線就是全部。** 列表、新增、修改、刪除,每一個都寫成完整的 use case,只是在抄欄位。Cockburn 的書為這種情況另外開了一章。

還有一個代價:照目標排的文件會過期。這篇逆向寫出來的兩份,對的是 2026-11-17 的 `master`;下一個 PR 進來,就得有人回頭改它。spec 寫完就可以不管,use case 不行。

## 反思

### 當年的分析,只留在程式裡

2021 年的 repo 裡沒有需求文件,也沒有 use case——那一年的「分析」只留在程式裡。所以這篇能引的當年,只有那一條 extension 和它的訊息。

UML 我是在工作上自學的,當時會畫來解釋設計;到今天也還會畫圖來解釋 pipeline。拿來解釋,圖是好工具。可是 use case 最值錢的那一部分——每一條「萬一」和它的處理——在 use case 圖上沒有地方畫。

### 交給 AI 的那一份,主線最不用寫

3a 的那則訊息是怎麼掉的,值得再看一次。2026 年 6 月 11 日的 spec 對這條規則的交代只有一條:拒絕時間在未來的紀錄,回傳成功或失敗。隔天的實作做到了這句話寫的每一件事,測試也測到了,一個字不多。訊息在前一天就不在了;這句話沒有提,也就沒有人把它補回來。

[[ai-spec-craft|規範那一篇]]我寫過:你沒寫下來的要求,AI 會用「平均來說合理」的東西補上。這次連補都沒有——沒寫下來的那一半,就是沒有了。

所以把需求交給 AI 的時候,主線是最不用寫的,它猜得到。要寫的是 extensions,而且每一條都要寫兩半:什麼情況,以及 **actor 會看到什麼**。後面那一半寫不進回傳值,也寫不進單元測試,只能寫成一句人看得懂的話。

分層和命名的規則擋得住「邏輯放錯地方」,擋不住「少做了一半」。後者要有一份站在 actor 那邊寫的文字,驗收的時候才有東西可以對。

回到這個系列的主軸——好的物件設計,是讓下一個改動有一個明顯該去的地方。Use case 給的是它的前提:一張「有哪些事要找地方住」的清單。主線上的事通常自己就有家;還沒有家的,都在 extensions 裡。

收一句這篇的判斷:**主線告訴你系統要做什麼;extensions 才告訴你,有哪些事得有人負責。**
