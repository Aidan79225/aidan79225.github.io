# OOAD 我以為我懂 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "OOAD 我以為我懂"`。
(名稱對齊 `SQL 我以為我懂`:英文縮寫 + 半形空格,沒有逗號。英文系列名 `OOAD: I Thought I Knew It`。開寫前若要改,趁還沒有文章、改 series 鍵即可。)

**自創系列**,不跟單一本書。Larman、Wirfs-Brock、GoF、Fowler、Meyer、Parnas 是引用來源,不是章節骨架(書目見〈引用來源〉)。

**2026-11-10 作者拍板的四件事**:① 自創、走「我以為我懂」的破除迷思路線;② 與 `架構,我以為我懂` **並存**,OOAD 當前傳;③ 要有一個貫穿全系列的真實案例(評估結果見〈貫穿案例〉);④ 四種第一手素材都有——Android 的 OO 設計坑、後端領域建模、正式學過 / 用過 UML、帶人與驗收 AI 產出(細節還沒訪談,見〈仍待補的訪談題〉)。

定位:**OOAD 不是畫 UML,也不是背設計模式——它是一連串「這件事歸誰」的決定。** 分析決定問題裡有哪些概念,設計決定每個概念該知道什麼、該做什麼、該找誰幫忙;封裝、繼承、多型、use case、領域模型、設計模式、SOLID,全部是在回答這同一個問題的不同工具。網路上的 OO 文章多半教語法(`class` / `extends` / `interface`)或教目錄(23 個模式、SOLID 五個字母),剛好跳過唯一重要的那門手藝——**責任分配**——也整個跳過「分析」。結果是一堆背得出 SOLID、卻答不出「這段邏輯該放哪」的人。這個系列每篇挑一個「大家天天用、但心智模型是糊的」概念,拆回它在解的那個「歸誰」問題。

2026 年還寫這個的理由:class 可以叫 AI 寫,而且寫得又快又工整;**責任歸誰還是要人判**,判錯了 AI 會很有效率地把錯的設計鋪滿整個 repo。這條軸只在開場與收尾各扣一次,細節留給 `帶 AI 的手藝(2026)`。

護城河(只有作者給得出的東西):
1. **一個從 2021 活到現在的真 App**:貫穿案例 SportRecorder 的 git 歷史上,同時有 2021 年作者親手寫的 Android 版本,和 2026 年重構之後的版本——「當年的我把它放在 Fragment 裡」不是回憶,是可以連過去的 commit。
2. **兩種把人推離好設計的框架都待過**:近 8 年 Android(about 頁)加上之後的 Python / Django 後端。Android 用**繼承**綁你(生命週期類別是最方便的落腳處),Django 用 **Active Record** 綁你(資料表的一列就是物件)。同一個人在兩邊各踩過一次,才講得出「框架替你做了哪個決定」。
3. **已經公開的判例庫**:`Re:從零開始做直播代購電商平台` 21 篇裡現成的物件設計決定(`SoftDeleteModel`、被拔掉的狀態機、分攤政策類別、每個金流一張事實表),以及 `[[btl-7]]` 那段擋下同事 clean architecture 的自白。
4. **驗收者的位置**:兩個案例 repo 2026 年的程式都是作者與 AI 協作做出來的,規格與驗收在作者手上——review 物件設計時到底看什麼,是第一手的,不是轉述。

罩門(寫成紀律,這系列最容易寫爛的六件事):
1. **別寫成 UML 語法教學或模式圖鑑**——每個概念先回答:它在解哪一個「歸誰」的問題、不用它會怎樣、什麼時候別用。
2. **不准用 Animal / Dog / Shape**——例子只能來自兩個案例 repo 或站內已發布的戰場。找不到真實例子的概念,先懷疑它值不值得一篇。
3. **圖別畫成二十個框的類別圖**——圖要扛一次「責任搬家」的 before / after,或一次協作的訊息流。本站的招牌是圖,而 UML 最容易被畫成裝飾。
4. **別搶 arch 的題**——寫到依賴方向、分層、Aggregate 的一致性邊界、Bounded Context、Repository 就停手連過去(交界題的歸屬表見下一節)。
5. **別把 OO 寫成唯一解**——兩個案例自己都不太「物件導向」,這件事要誠實寫(#22),每篇也固定一節〈什麼時候別用〉。
6. **當年聲部不腦補**——2021 的程式碼可以直接引;但「當時為什麼這樣寫」、Android 職場的經驗、UML 實際用在哪,**沒問過作者就不寫**(「我」= 作者本人的硬規矩,見 `writing-blog-post`)。

## 與既有系列的關係(差異化)

- ↔ **架構,我以為我懂**(`[[arch-what-problem]]` 等十篇,未動筆):**同一把尺的兩個刻度**。這裡是物件層級——一個類別該知道什麼、做什麼、跟誰協作;那邊是模組 / 系統層級——依賴方向、分層、邊界、DDD 戰略。OOAD 是前傳:arch 每一篇都可以假設讀者已經會分配責任。招牌也不同:arch 是「Android vs Backend 的 runtime 對照」,這裡是〈這件事歸誰〉的判決。交界題的歸屬寫死:

  | 交界題 | 歸誰 | 另一邊怎麼寫 |
  |---|---|---|
  | 依賴反轉(DIP) | arch #2 `arch-dependency-inversion` | OOAD #16 只講到「介面是使用者的」,箭頭怎麼翻過來連過去 |
  | Value Object | OOAD #12 | arch #7 只引用,不重講 |
  | Entity 的身分、Aggregate 的一致性邊界 | arch #7 `arch-ddd-tactical` | OOAD #12 講到「看身分還是看值」為止 |
  | 貧血模型 | OOAD #22(邏輯該不該住在物件裡) | arch #7 只引用 |
  | Repository | arch #9 `arch-repository` | OOAD 只在 #16 把它歸類成 Pure Fabrication,不展開 |
  | 可測試性 | 物件層級(test double、mock 太多是設計在求救)歸 OOAD #20 | 「不起 DB / UI 就能測 core」歸 arch #6 |
  | 過度設計 | 類別層級(錯的抽象、過早的介面、模式濫用)歸 OOAD #19 | 系統層級(CRUD 不需要 DDD)歸 arch #10;兩邊都扣 `[[pain-before-power]]` |
  | 通用語言 | 「程式的詞 = 業務的詞」的物件層級做法歸 OOAD #3 | Bounded Context 與 context map 歸 arch #8 |
  | 分層、Controller 住哪一層 | OOAD #9 只講「誰接第一個訊息」 | 四層各放什麼歸 arch #4 |

- ↔ **Re:從零開始做直播代購電商平台**:**判例庫**。那邊講的是「當年怎麼做、重來怎麼設計」的系統故事;這裡只把其中的物件設計決定抽出來當判例,引用時連過去、**不重講情節**。已經確認過原文的判例:`[[rezero-asset-lifecycle]]`(`SoftDeleteModel`:「繼承共用的是政策,組合共用的才是機制」「`objects` 說謊」)、`[[rezero-cart-order]]`(「狀態機適合你能控制的流程,不適合你只是在記錄的現實」)、`[[rezero-comment-order]]`(手寫 `CommentsFSM`、純 `parse()`)、`[[rezero-inventory]]`(「不變量是語意契約,寫在程式碼之前」)、`[[rezero-promotion]]`(分攤規則從慣例升級成一個 class)、`[[rezero-payment]]`(每個第三方一張事實表,不做「通用付款表」)、`[[rezero-identity]]`、`[[rezero-permission]]`(繼承會長成 2^N 個 schema;「沒有 AuthorizationService」)、`[[rezero-notification]]`(等第二個渠道再抽象)、`[[rezero-fulfillment]]`(機制歸系統、政策歸人)、`[[rezero-team]]`(「mock 太多,測試變得失真」「功能上獨立,不等於語意上獨立」)。
- ↔ **成為 Tech Leader 讀書筆記**(`[[btl-7]]`、`[[btl-10]]`):那邊從領導力的角度講同一件事——當 reviewer 時擋下同事獨立的 domain entity、堅持 ORM model 直接當 entity,後來才發現「原來我才是那個小丑」。這裡在 #22 從**設計面**重判一次。情節一律連過去,不複述。
- ↔ **帶 AI 的手藝(2026)**(`[[ai-spec-craft]]`、`[[ai-review-craft]]`、`[[ai-guardrails]]`):**AI 軸整條在那邊**——規範怎麼寫、驗收的風險分級、護欄怎麼蓋。這裡只做一件那邊沒做的事:給出**物件設計**的三個檢查題(#23),而且同一套題目對人的 PR 與 AI 的 PR 都適用。不開「用 AI 做 OOAD」的專篇。
- ↔ **DDIA / FoDE / SQL**(`[[ddia-data-models]]`、`[[fode-8]]`、`[[ddia-transactions]]`、`[[sql-transactions]]`):資料模型 vs 物件模型。關聯 / 文件 / 圖的取捨、正規化、隔離等級都留在那邊;這裡只講「領域模型不是資料表」(#3)與「邏輯住在資料裡的系統」(#22)。不變量在並行下怎麼守,一律連過去。
- ↔ **IaC / FoDE / Kafka**(`[[iac-small-pieces]]`、`[[fode-3]]`、`[[kafka-intro]]`):耦合與內聚在那邊是基礎設施與資料架構的原則;#8 回到它的原生場景(類別),把那幾篇當「同一把尺放大之後」的證據互連。
- ↔ **Jenkins / Airflow / K8s / 可觀測性**(`[[jenkins-shared-library]]`、`[[jenkins-groovy-cps]]`、`[[airflow-testing-deploy]]`、`[[airflow-providers]]`、`[[k8s-networkpolicy-cni]]`、`[[obs-collection]]`):工具系列裡散落的設計判例——一行就跑完的 `standardPipeline()` 是 #19 的站內代表作;「定一個標準,把 M×N 變成 M+N」是 #16 的三個現成例子。這裡只引用,不重講工具。
- ↔ **單篇**:`[[gitcrisp]]` 講的是「分層是給 AI 的護欄」(產線角度),這裡講它裡面的物件,而且多半當反例(見〈貫穿案例〉的紀律 6);`[[travel-split]]` 的三種分帳方式是多型最乾淨的小例子、金額用整數分是值物件;`[[lottery]]` 把「什麼算輸入」寫成正式條件,是需求分析的小例子;`[[sre-vs-devops]]` 的 `class SRE implements interface DevOps` 是站內最有名的 OO 比喻,#16 開場可以用;`[[pain-before-power]]` 是全站「先痛過再上工具」的判準,#19、#22 扣回去。

## 貫穿主軸

**好的物件設計,是讓下一個改動有一個明顯該去的地方。** 拆成三個對任何一個物件都問得出口的問題(章節表用 **【】** 標記每篇主要在練哪一題;寫之前先確認,免得結尾硬套同一句口號):

| 問題 | 在問什麼 | 答不出來會怎樣 |
|---|---|---|
| **【歸誰】** | 新需求來,講得出這段邏輯該住在哪個物件嗎?(責任有沒有一個明顯的家) | 邏輯落在「最方便的地方」——Fragment、ViewModel、`util`——每個人放的位置都不一樣,同一條規則長出第二份 |
| **【藏什麼】** | 這個物件把哪個決定藏起來了?那個決定改掉時,外面要跟著改幾個地方? | 封裝只剩 `private` 加 getter;換一個儲存方式、改一個型別,二十個呼叫端一起動 |
| **【叫什麼】** | 它在程式裡的名字,拿去跟不寫程式的人講,對方聽得懂嗎?同一個概念是不是只有一個名字? | 業務講「店家」,程式叫 `place`、`location`、`shop` 三個名字;每次討論都要翻譯一次,規則就掉在翻譯裡 |

**怎麼呈現主軸**:不用口號。每篇固定一節 **〈這件事歸誰〉**——在案例上做一次真的判決:這件事是什麼 → 候選人(至少兩個)→ 各自的後果 → 判給誰 → 證據(哪個 commit、哪段程式)。這一節相當於 `架構,我以為我懂` 的「Android vs Backend 對照」與 `An Elegant Puzzle` 的〈四個工程師版〉,**標題固定,不要每篇換名字**。

## 貫穿案例:SportRecorder(主)+ GitCrisp(副)

2026-11-10 作者點名三個自己的專案請評估。逐一讀過程式與 git 歷史之後的結論:

| 候選 | 是什麼 | 領域好不好懂 | 物件設計的料 | before / after | 能不能公開引用 | 結論 |
|---|---|---|---|---|---|---|
| **SportRecorder** | 從斷食出發的飲食紀錄 App(Kotlin Multiplatform + Compose,Android 出貨中) | 高:記一餐、進食視窗、店家,兩段話講得完 | 中:純 `object` 計算器 + 不可變 `data class` + sealed;幾乎沒有繼承與類別式的模式 | **強**:2021 年手寫的版本(44 個 `.kt`)與 2026 年重構後的版本在同一條歷史上 | 可:GitHub 公開,PolyForm Strict(作者引用自己的程式沒有問題) | **主案例** |
| **GitCrisp** | Git 桌面客戶端(Python + PySide6) | 中高:讀者天天用 Git,但有趣的規則偏冷門 | 中低:domain 明文規定是純資料類,行為在 pygit2 與 Qt widget 裡 | 中:大量小而說明清楚的 commit、兩次「大類別拆成 mixin」 | 可:GitHub 公開,MIT;站內已有 `[[gitcrisp]]` | **副案例**(Python 對照 + 反例庫) |
| 第三個候選(私人專案,不具名) | — | — | 裡面有三者之中最漂亮的狀態設計(純函式狀態機 + 命令式外殼) | 弱:歷史只有十來天 | **不可**:private repo、沒有授權條款 | 不採用。日後若公開,#11 可以補它當第二案例 |

**為什麼是 SportRecorder**:
1. **領域零門檻**——一餐一個時間點、可加照片與店家;選一個斷食類型(16:8 這類的組合,也可以自訂);首頁的圓環顯示現在是進食、斷食,還是達標。讀者不用先學任何行話。
2. **當年聲部是真的**——2021-03 到 2021-08 的 63 個 commit 是作者手寫的 XML view + Fragment + LiveData;之後幾乎停了五年(2023 一個、2024 六個),2026-06 起才重構。兩個版本都在歷史上,可以逐檔對照。
3. **分析文件現成**——`docs/superpowers/specs/` 37 份 spec(每份都有決定、Out of scope 與「初衷對照」),其中 `2026-10-05-venue-design.md` 把「店家該是實體還是字串欄位」的兩個選項與代價寫下來了。
4. **有一張還沒還的債單**——`docs/DEVELOPMENT.md`〈待重構〉列了五筆,每一筆都對得上這個系列的一篇(見下方〈還債上鏡〉)。

**誠實面(寫成紀律)**:
1. **它不是教科書式的 OO。** 規則住在無狀態的 `object` 計算器與 repository 的 SQL 裡,model 幾乎都是不可變的 `data class`,多型多半是 sealed + `when`,介面大多只有「一個正式實作 + 一份 fake」。**沒有的東西不硬寫**:繼承(#13)的當年聲部靠作者 Android 職場的口述 + rezero 的 `SoftDeleteModel`;mixin(#14)的主場是 GitCrisp;模式(#17)只講兩個 repo 真的出現過的。這個「不太 OO」本身是 #22 的題目,不是要藏的缺點。
2. **「之後」不是作者一個人寫的。** SportRecorder `master` 上非 merge 的 516 個 commit 裡 431 個帶 AI 共同作者(第一個在 2026-06-10);GitCrisp 是 1451 個裡的 1067 個。所以:2021 的程式可以寫「我當年這樣寫」;2026 的重構要寫成「我訂了規格、AI 實作、我驗收」。**哪個決定是作者自己下的,以 spec 的文字或訪談為準**——例如 venue spec 明寫便宜的字串欄位才是被建議的方案,選實體的是 owner。
3. **2021 的基線很小。** 44 個 `.kt`、只有範例測試、commit 訊息幾乎只有檔名(「Update DailyAdapter.kt, DailyFragment.kt, and 4 more files...」),看不出當時的意圖。當年聲部撐得起來的只有 #1、#5、#6、#7、#9、#11、#12、#13、#20;其他篇不要硬湊「2021 對照」。
4. **引用歷史的邊界。** 2021 年的歷史只引 `.kt` 原始碼,不引 build 設定與簽章相關的檔案。連結一律用釘了 commit hash 的 GitHub 永久連結,不連 branch。
5. **兩個 repo 都還在快速變動。** 這份 roadmap 提到的檔名與數字是 2026-11-10 的快照:GitCrisp 是 `master` @ `f5aa99fc`;SportRecorder 看的是當時 checkout 的 `claude/meal-duration` @ `34618e7`(PR #93「用餐時長」,**還沒併入 `master`**)。只存在於那條分支上的東西有:`EatRecord.endTime`、`MealSpan`、`MealDuration`、commit `4081bda`,以及 789 行這個數字(`master` 是 784 行)——#93 若沒併、或併的時候改了形狀,#6、#12、#17 用到它們的例子要跟著換。動筆時以 repo 當下為準,文章裡的引用釘 hash。
6. **拿 GitCrisp 當反例要公平。** 那些設計是在「一個人 + AI、七個月做到能發布」的條件下做的取捨,repo 的 spec 裡有當時的理由,也記著被否決的替代案。文章要寫出當時為什麼這樣選,不是事後挑毛病——而且那是作者自己的專案,要嘲諷也只能嘲諷自己。

**還債上鏡**(機制;作者可以否決):`docs/DEVELOPMENT.md`〈待重構〉的五筆債各對一篇。寫那一篇時,把〈這件事歸誰〉的判決落成 SportRecorder 的一個真 PR,文章連過去——讀者看到的不是「應該這樣改」,是「改了,這是 diff」。

| 債(照 repo 原文摘) | 對應篇 |
|---|---|
| `EatTimeEditorViewModel` 約 780 行:把分享 / 貼上的「讀連結 → 比對 → 寫入」抽成 domain 服務,店家編輯另成一個 helper | #9、#10 |
| 位置改用值物件:`MapsPlace`、`VenueRepository.setPosition/findOrCreate` 仍是兩個獨立的 `Double?`,應統一為 `GeoPoint?` | #12 |
| 「地址跟著位置走」的規則散在 `VenueRepositoryImpl`、`VenueDao` SQL 與兩份 fake;應有單一歸屬 | #4、#7 |
| `GluedVenueRepair` 以多次 repository 呼叫做 check-then-act;改成一個交易性的 repository 操作 | #4 |
| 兩份 `FakeVenueRepository` 會漂移 | #20 |

**事實核對狀態(2026-11-10)**:下列各項是直接看 repo 確認過的——兩個 repo 的公開狀態與授權、commit 數與 AI 共同作者比例、2021 年的 `DietFragment` / `DietViewModel` / `BaseFragment`(`a6633b5`)、現在的 `DietWindow`、`EatTimeEditorViewModel`(分支上 789 行、11 個建構子依賴)、`MapsLink`、`GeoPoint`、`Venue`、`EatRecord`、`BackupJobState`、`LoadEatRecordUseCase`、venue spec 的決定段、債單原文、GitCrisp 兩個合成類別的 mixin 數(14 與 13)、拆之前的行數(969 與 1422)、command / query 類別數(60 + 33)、表中每一個 commit hash 的日期與標題(SportRecorder 的部分,除了 `4081bda` 都已經在 `master` 上)。**沒有逐一確認的**:各 commit 實際動到哪些檔、每個設計決定當時的理由——動筆前讀該 commit 的 diff 與對應的 spec。

## 每篇的產物與圖(硬性要求)

| 要求 | 規矩 |
|---|---|
| **一張扛「責任搬家」的深色 SVG** | 圖要單獨看懂:某件事 before 住在哪、after 住在哪(#1 的搬家路線是範本);或一次協作的訊息流;或兩個候選設計的對照。二十個框的類別圖、UML 符號教學都不算 |
| **真實程式碼的 before / after** | 來自兩個案例 repo 或站內已發布的 rezero 文;附釘了 hash 的 GitHub 永久連結;節錄到讀者三十秒看得完,其餘連過去 |
| **〈這件事歸誰〉小節** | 固定格式的一次判決(事情 → 候選人 → 各自的後果 → 判給誰 → 證據)。每篇都要有 |
| **〈什麼時候別用〉小節** | 這個概念的代價與不該用的場合。與 `架構,我以為我懂` 共用這個招牌詞,措辭固定 |
| **原典用字對照** | 概念第一次出現附英文原詞,照〈術語表〉;引句動筆前回原文核對,不引二手摘要 |
| **一段真實反思** | Android 那幾年、後端、帶人與驗收 AI——問過作者的才寫;沒有就明講「這篇沒有當年聲部」 |

語言:主案例是 Kotlin,副案例與 rezero 判例是 Python。每篇的最小示範擇一即可,不必兩種都寫——重點在結構不在語法(同 arch 的慣例)。

## 章節表

比固定表頭多一欄 **案例**:這篇在兩個 repo 上具體做什麼(相當於讀書筆記系列的「對應節」)。`seriesOrder` = 寫作順序 = 閱讀順序(分析 → 責任 → 形狀 → 名字 → 演化)——這個系列不按投報率重排,因為案例是一路累積的,後面的篇會引用前面做出來的模型與判決。

## 第一幕 — 分析:先搞清楚問題裡有什麼

多數人跳過這一幕直接開 class。這四篇在案例上做的是**逆向分析**:App 已經存在,把它的 use case、概念與規則挖回來,再問「如果當初先做這一步,程式會長得不一樣嗎」。

| # | slug | 標題(暫定) | 主題 | 案例 | 狀態 |
|---|---|---|---|---|---|
| 1 | `ooad-intro` | OOAD 到底在做什麼:一連串「這件事歸誰」的決定 | **【歸誰】** 全系列論點在這裡立起來。分析 = 弄清楚問題裡有哪些概念,設計 = 決定軟體物件各自的責任與怎麼協作(Larman 的切法:do the right thing / do the thing right);Larman 開宗明義的那句——OO 開發最關鍵的能力是**把責任分配給軟體物件**——就是本系列的脊椎;**要破的迷思**:OOAD = 畫 UML / 背 23 個模式 / 把名詞變成 class——UML、模式、SOLID 都是工具,不是那門手藝本身;三個問題(歸誰、藏什麼、叫什麼)各示範一次;全系列地圖與「為什麼是這個順序」;誠實面:OO 不是唯一解(預告 #22);2026 的理由:class 可以叫 AI 寫,責任歸誰要你判——接 `[[gitcrisp]]`、`[[ai-review-craft]]`、`[[arch-what-problem]]`(等 arch 開寫) | 案例登場。**一件事的五次搬家**:「現在是進食還是斷食」這個判斷,2021 年住在 `DietFragment.updateTime()`——同一個函式裡讀設定、算階段、改畫面(`a6633b5`)→ 2026-06 搬進 ViewModel(`6838606`)→ 抽成純計算的 `DietWindow`,同時有了這個 repo 第一批真的單元測試(`d2955a0`)→ domain model 與 use case(`773ddb1`、`30d8919`)→ 獨立的 `:shared` 模組(`5bd1e2e`)。招牌圖就畫這條路線 | ⬜ ★ |
| 2 | `ooad-use-case` | Use case 不是功能清單:難的都不在主線上 | **【叫什麼】** use case = 一個 actor 為了達成一個目標、與系統互動的**一段文字**,不是那張橢圓圖;Cockburn 的骨架:primary actor、目標層級(以 user goal 為主)、main success scenario、extensions、成功保證;**要破的迷思**:① use case 圖 = use case(圖只是目錄)② use case = user story = 功能清單(三者回答的問題不同:行為 / 排程單位 / 範圍)③ 主線寫完就寫完了——設計的難度大半在 extensions(失敗、中斷、重複、離線);把系統當黑箱:寫「系統做什麼」,不寫「怎麼做」;後面每一個要分配的責任,都是從某一條 extension 長出來的;它是「把要求寫清楚給 AI」這門手藝的老祖宗——接 `[[ai-spec-craft]]`、`[[lottery]]`、`[[rezero-overview]]` | 逆向替 SportRecorder 寫兩個 use case:「記一餐」與「從 Google 地圖分享一個地點進來」。extensions 從 repo 修過的規則裡挖:不能記未來的時間(`30d8919`)、自訂斷食類型不能重複(`7f0671d`)、分享進來的店已經存在但位置不同。對照 repo 自己的 spec 格式(Goal / 決定 / Out of scope / 初衷對照):它好在哪、跟 use case 差在哪 | ⬜ |
| 3 | `ooad-domain-model` | 領域模型不是資料表,也不是類別圖 | **【叫什麼】** 三張長得很像的圖:**領域模型**(問題裡有哪些概念)、**資料模型**(怎麼存)、**設計類別圖**(軟體類別長怎樣)——各自回答不同的問題,混著畫是多數設計走歪的起點;找概念的來源(名詞、既有的分類)與名詞法的陷阱;「這是屬性、關聯,還是另一個概念」的判準;**表徵落差要低**(low representational gap):軟體類別的名字與結構貼著領域模型,程式讀起來才像業務;**要破的迷思**:先開資料表、再讓 ORM 長出 class,就算做過領域建模——那是資料模型;概念的增、刪、改名本身就是分析的產出——接 `[[ddia-data-models]]`、`[[fode-8]]`(正規化留在那邊)、`[[rezero-identity]]`(identity 是事實、account 是聚合)、`[[arch-ddd-strategic]]`(通用語言與 Bounded Context 往那邊走) | **店家是一個實體,還是餐點上的一個字串欄位?** `2026-10-05-venue-design.md` 把兩個選項的代價寫下來了:便宜的字串欄位是被建議的那一個,作者選了實體(改名會傳播到每一筆舊紀錄、位置可以事後修正)。同一份 spec 的核心:`EatRecord.location`(你當時人在哪)與 `Venue` 的位置(食物從哪來)是**兩個事實,不是同一個事實的兩份**——外帶回家吃,兩個都是真的。另外三個現成的例子:`FoodRecord` 整個概念被拿掉(`c039c71`);`CreateEatTime*` 改名 `EatTimeEditor*`(`c14a301`,名字跟著責任變);App 叫 SportRecorder,但裡面沒有運動(把使用者看得到的名字改掉的 PR #87 還開著) | ⬜ ★ |
| 4 | `ooad-contracts` | 不變量與契約:先寫下系統要保證什麼 | **【歸誰】** 從 use case 到**系統操作**:使用者的一步 = 系統收到的一個事件(系統循序圖只畫這一層);操作契約:前置條件、後置條件;**不變量**:不管走哪條路都必須成立的那句話;Meyer 的 Design by Contract(precondition / postcondition / invariant)真正的重點是**誰負責檢查**;**要破的迷思**:驗證 = 到處加 if——契約是在決定「這條規則歸誰守」,而守的人只能有一個;不變量就是 #7 的封裝要守的東西;並行下怎麼守,不在這裡講——接 `[[rezero-inventory]]`(「不變量是語意契約,寫在程式碼之前」)、`[[rezero-reconciliation]]`(把不變量寫成定時的自我對帳)、`[[rezero-cart-order]]`(硬不變量守死、軟狀態只記錄)、`[[ddia-transactions]]`、`[[sql-transactions]]` | 「地址跟著位置走」這條規則,現在同時寫在 `Venue` 的註解、`VenueRepositoryImpl`、`VenueDao` 的 SQL 與兩份 fake 裡——**一條規則好幾個家**(債單上的一筆)。「不能記未來的時間」「自訂斷食類型不重複」各守在哪一層。`GluedVenueRepair` 用多次 repository 呼叫做 check-then-act(債單上的另一筆) | ⬜ |

## 第二幕 — 責任:這件事歸誰

系列的核心。前一幕挖出來的概念與規則,在這一幕找到家。

| # | slug | 標題(暫定) | 主題 | 案例 | 狀態 |
|---|---|---|---|---|---|
| 5 | `ooad-responsibility` | 物件不是資料加函式:責任、角色與協作 | **【歸誰】** 物件 = 一組責任。責任兩種:**知道**(knowing)與**做**(doing);做不完的請別人幫忙,就是協作;CRC 卡(Beck & Cunningham 1989)是最便宜的設計工具——一張卡寫不下,就是責任太多;Wirfs-Brock 的六種角色刻板(information holder / structurer / service provider / coordinator / controller / interfacer)當「這個物件是哪一種」的詞彙;**要破的迷思**:class = 資料結構 + 操作它的函式(那是模組;Alan Kay 說他後悔取了「物件」這個名字,重點其實是 messaging);`XxxManager` / `XxxHelper` / `XxxUtil` 是責任還沒被命名的訊號;一個無狀態的 `object` 也可以有很清楚的責任——接 `[[rezero-fulfillment]]`(機制歸系統、政策歸人)、`[[medallion-architecture]]`(每一層一個品質責任:同一個詞放大到資料架構)、`[[responsibility-funnel]]`(那邊的「責任」是組織意義,首次出現要分清) | 替 SportRecorder 的主要物件各寫一張 CRC 卡並對號入座:`EatRecord`(information holder)、`DietWindow`(service provider)、`EatTimeEditorViewModel`(controller——卡片寫不下)。2021 年的版本一張卡都寫不出來:只有 Room entity、DAO、Fragment 與 ViewModel,沒有任何 domain 物件。對照 GitCrisp:60 個 command + 33 個 query 類別,幾乎都是一行轉呼叫(`StageFiles.execute` 只做 `self._writer.stage(paths)`)——有類別,沒有責任 | ⬜ ★ |
| 6 | `ooad-expert-creator` | 這件事歸誰:資訊專家、建立者與 Tell, Don't Ask | **【歸誰】** GRASP 最基本的兩條:**Information Expert**(把責任交給擁有完成它所需資訊的那個物件)、**Creator**(誰包含它、記錄它、緊密使用它、握有建立它的資料,就由誰建立);Tell, Don't Ask:別把資料問出來自己算,叫擁有資料的物件做;Law of Demeter 與 `a.b().c().d()` 的火車殘骸;**要破的迷思**:Expert 永遠是對的——照著走到底,儲存、格式化、畫面全會塞進領域物件;這時候輪到 #8 的兩把尺與 #16 的 Pure Fabrication 出場;同一條規則出現第二份,通常是因為它沒有一個明顯的家——接 `[[rezero-promotion]]`(分攤的慣例升級成一個有名字的 class)、`[[rezero-permission]]`(role 清單躺在 `Principal` 自己身上) | 「這一餐什麼時候結束」歸 `EatRecord`(`endTime` 是它自己的派生屬性;PR #93,尚未併入);「這個時間點算哪一個進食視窗」歸 `DietWindow.groupIntoWindows`——註解寫明它是全 App 對「同一個進食日」唯一的定義。2021 的反例:`DietViewModel` 裡 `mergeInterval` 與 `mergeIntervalWithFourHours` 兩份複製貼上、8 小時寫死在函式裡。GitCrisp 的同一招:遠端分支名稱的拆法從對話框的 private static 搬進 domain(`838bcfd2`),兩份互相矛盾的版本收成一份(`210a6248`) | ⬜ |
| 7 | `ooad-encapsulation` | 封裝不是 private 加 getter:你藏的是決定 | **【藏什麼】** Parnas 1972:模組該藏的是**一個可能會變的設計決定**(information hiding),不是「資料」;封裝的單位是不變量——物件保證自己永遠處在合法狀態;**要破的迷思**:① 欄位設 private 再配 getter / setter = 封裝(那只是多打字的 public)② `data class` / `@dataclass` 是封裝好的物件(它是誠實的資料載體,這不是壞事,但別假裝它在守規則);判準只有一個:**把這個決定改掉,外面要跟著改幾個地方**;Meyer 的 Command–Query Separation;封裝、#4 的不變量、#6 的 Tell, Don't Ask 是同一件事的三個角度——接 `[[rezero-asset-lifecycle]]`(「`objects` 說謊」:名字承諾全部,行為偷偷藏了一個政策)、`[[rezero-inventory]]`、`[[travel-split]]`(金額一律用整數分) | 正例 `MapsLink`:建構子是 `internal`,`:shared` 以外要拿到一個 `Short` 只能透過 `find()`——沒過白名單的網址**造不出來**,安全規則藏進了型別。反例 `Venue`:「地址跟著位置走」寫在註解裡,物件自己守不住(接 #4)。2021 的反例:Fragment 直接 `dietPreference.preference.getLong(...)`,「設定存在 SharedPreferences」這個決定誰都知道。GitCrisp 的規則書有一條就叫「Invariants live with the data.」 | ⬜ ★ |
| 8 | `ooad-coupling-cohesion` | 耦合與內聚是兩把尺,不是兩句口號 | **【藏什麼】** GRASP 的 Low Coupling 與 High Cohesion 是**評估用**的,不是指派用的:拿來在兩個候選設計之間選;耦合 = 你知道了多少別人的決定(型別、欄位、建構方式、呼叫順序、語意——越後面越隱形、越貴);內聚 = 會一起變的放一起;兩把尺互相拉扯(把耦合壓到零,得到一個 God class);量法不用工具:改一個需求要動幾個檔、一個類別有幾種改它的理由;**要破的迷思**:依賴越少越好——依賴穩定的東西不是問題,依賴會變的東西才是——接 `[[iac-small-pieces]]`(高內聚低耦合、爆炸半徑)、`[[fode-3]]`(鬆耦合)、`[[rezero-team]]`(「功能上獨立,不等於語意上獨立」)、`[[kafka-intro]]`、`[[arch-what-problem]]`(同一把尺放大到模組) | 同一個 repo 的兩次「換零件」:SharedPreferences 換成 DataStore(`07db03e`、`2352028`)與 Hilt 換成 Koin(`8f82ae5`)——各動了幾個檔、哪些檔本來不該動,用 `git show --stat` 實際數,這就是耦合的量法。內聚的反面:`EatTimeEditorViewModel` 的 11 個建構子依賴 | ⬜ |
| 9 | `ooad-controller` | God class 是怎麼長出來的:誰來接第一個訊息 | **【歸誰】** GRASP **Controller**:畫面後面第一個接住系統操作的物件——只協調,不做業務;兩種選法(代表整個系統的 facade controller / 一個 use case 一個);bloated controller 的症狀;God class 的成因不是懶,是**框架把生命週期入口做成最方便的落腳處**(Activity、Fragment、ViewModel、Django 的 view);MVC → MVP → MVVM 在 OOAD 眼裡是同一題的三次重判:誰接訊息、誰握狀態;**要破的迷思**:ViewModel / Service 就是業務邏輯該住的地方——它們是 controller,住滿了就是下一個 God class;反方向的病:每個操作都包一層只轉呼叫的 use case——接 `[[rezero-permission]]`(一個 use case 只有一個公開的 `execute`,否則就滑成雜物間)、`[[arch-clean-layers]]`、`[[arch-layering]]`(三層為何淪為傳話) | God class 的兩代:2021 的 `DietFragment` → 2026 的 `EatTimeEditorViewModel`(約 780 行、11 個建構子依賴,壓著 `TooManyFunctions`;`@Suppress` 旁邊的辯護是「cohesive editor VM: one handler per UI interaction」——這個辯護成不成立,就是這篇的判決)。債單上的拆法:把「讀連結 → 比對 → 寫入」抽成 domain 服務。另一頭:十個 use case 裡,`LoadEatRecordUseCase` 只有一行。GitCrisp:969 行的 `MainWindow` 拆成 14 個 mixin 之後,`graph.py` 還有 1506 行。作者 Android 職場的 God Activity(待訪談) | ⬜ ★ |
| 10 | `ooad-interaction` | 先畫訊息,再畫類別:UML 當草圖 | **【歸誰】** 設計類別的方法不是盯著類別圖想,是**走一遍訊息**:誰送什麼給誰——類別與方法是從訊息裡掉出來的(動態先於靜態);循序圖當「分配責任的草稿紙」;UML 的三種用法(sketch / blueprint / programming language,Fowler)——這個系列只用第一種;一張夠用的循序圖只需要哪幾個符號;什麼時候值得畫(兩個以上的人要對齊、協作超過三個物件、要把流程講給 AI 聽)、什麼時候別畫;**要破的迷思**:UML 過時了——過時的是藍圖用法與重型工具,草圖沒有——接 `[[rezero-overview]]`(一筆訂單會經過哪些系統:系統尺度的同一種圖)、`[[obs-traces-tempo]]`(trace 是執行期自動畫出來的循序圖)、`[[ai-spec-craft]]` | 畫一次「從 Google 地圖分享進來 → 變成一筆新餐點」的循序圖,看債單上那個還不存在的 domain 服務怎麼從訊息裡掉出來(接 #9)。作者實際畫 UML 的場合(待訪談:哪門課、哪份工作、畫給誰看、現在還畫不畫) | ⬜ |

## 第三幕 — 類別的形狀:狀態、值、繼承、多型、介面

最常吵架的六題。每篇獨立,可以跳著讀。

| # | slug | 標題(暫定) | 主題 | 案例 | 狀態 |
|---|---|---|---|---|---|
| 11 | `ooad-state` | 狀態機:什麼時候該有,什麼時候該拔掉 | **【叫什麼】** 物件的生命週期 = 合法的狀態 + 合法的轉移;先分清兩種東西:**算出來的狀態**(每次從事實重算,沒有轉移可言)與**存起來的狀態**(有轉移,才需要狀態機);三種寫法的代價:布林 / enum 欄位加上到處 if、轉移表、每個狀態一個型別(sealed 或 State pattern,**非法狀態無法表示**);狀態爆炸的來源是把幾個獨立的維度塞進同一台機器(笛卡兒積);**要破的迷思**:有狀態欄位就該上狀態機——判準是「這個流程是你控制的,還是你只是在記錄現實」——接 `[[rezero-cart-order]]`(被主播拔掉的狀態機)、`[[rezero-comment-order]]`(手寫 `CommentsFSM`:文法 = 轉移圖 = 程式)、`[[rezero-asset-lifecycle]]`(每種資料角色有自己的死法)、`[[rezero-payment]]`(狀態在讀的時候推導) | `DietPhase`(IDLE / EATING / FASTING / SUCCESS)是**算出來的**:`DietWindow.compute()` 每次從餐點與現在時間重算,所以它只是一個 enum,不是一台狀態機。同一個 repo 裡真的狀態機是 `BackupJobState`(Idle → Running → Finished,要 acknowledge 才離開 Finished,同時只准一個工作)。編輯器的 `PendingStore` / `PendingMove` / `PendingDelete`:把「正在等使用者回答的那個問題」做成型別。2021 對照:`when` 的三個分支直接改畫面。GitCrisp 的反例:遠端操作的「槽」散在一個 mixin 的三個欄位裡(`_remote_running`、`_remote_op_name`、`_remote_op_commands`)——一台沒有名字的狀態機 | ⬜ |
| 12 | `ooad-value-object` | 值物件:讓型別替你守規則 | **【藏什麼】** 用「以值相等、不可變、建構時就驗證」的小型別,取代到處流竄的 `String` / `Int` / `Double`(primitive obsession);值物件與實體只差一個問題:看身分還是看值——講到這裡為止,實體的身分與聚合的一致性邊界交給 arch;投報率最高的四種:金額、位置與單位、時間區間、識別碼;語言對照:Kotlin `data class` / `value class`、Python `@dataclass(frozen=True)` 與 enum;**要破的迷思**:值物件是做 DDD 才需要的東西——它是最便宜的封裝,不需要任何架構;代價也要講:儲存對映、序列化、轉換的樣板——接 `[[travel-split]]`(金額一律整數分)、`[[rezero-promotion]]`、`[[arch-ddd-tactical]]` | `GeoPoint`(`isOnEarth`;`orNull()` 讓「缺一半的座標」造不出來)、`RoundedDistance`,以及 PR #93 加的 `MealSpan(start, end)`。還沒還的債:`Venue` 的位置仍是兩個各自可空的 `Double?`——「有緯度沒經度」這個非法狀態是表示得出來的。2021 對照:時間區間是 `Pair<Long, Long>`。GitCrisp:把滿地的字串字面值換成 StrEnum(`a0e77b33`),規則書寫「A value from a closed set is an enum, not a literal.」 | ⬜ |
| 13 | `ooad-inheritance` | 繼承不是拿來重用程式碼的 | **【藏什麼】** 繼承同時做了兩件事——**子型別**(可以代換)與**重用**(少打字)——麻煩幾乎都來自只想要後者;Liskov 代換原則要用行為講(子類別不能要求更多、不能保證更少),不是用「is-a」講;fragile base class:父類別每動一次,所有子類別一起被改;繼承會打破封裝(子類別知道了父類別的內部);框架逼你繼承的地方(生命週期類別、ORM 的 Model 基底)怎麼止血:繼承留給框架要的那一層,自己的邏輯不要再往下長一層 `BaseXxx`;繼承真正適合的地方:封閉的型別族(sealed)、框架留的擴充點、真的可以代換的子型別;語言對照:Kotlin 預設 `final`、Python 的多重繼承與 MRO——接 `[[rezero-asset-lifecycle]]`(`SoftDeleteModel`:「繼承共用的是政策,組合共用的才是機制」)、`[[rezero-permission]]`(`ProductWithCostOut(ProductOut)` 會長成 2^N 個 schema)、`[[ansible-playbooks-advanced]]`(變數優先序與多層繼承是同一種病) | `BaseFragment` 化石:2021 年開的一個空的 `open class`,到今天零個子類別,還留在 repo 裡——「先開一個 Base,以後會用到」的標本。這個 App 2026 年幾乎沒有繼承,因為 Compose 不再要你繼承生命週期類別。**這篇的當年聲部主要靠作者 Android 職場的 `BaseActivity` 繼承鏈(待訪談);沒問到就不要發** | ⬜ ★ |
| 14 | `ooad-composition` | 組合優於繼承——但 mixin 不是組合 | **【藏什麼】** GoF 第二條原則(favor object composition over class inheritance)的實際操作:把會變的那一塊做成一個**被持有的物件**,原本的類別把工作轉交給它(委派);換到什麼(可以單獨建立、單獨測試、執行期可換、不被父類別拖著改)、付出什麼(轉交的樣板、物件變多、要有人負責組裝);Kotlin 的 `by` 把樣板拿掉;**mixin 是長得像組合的繼承**:它切開的是檔案,不是責任——mixin 之間照樣透過 `self` 共用狀態;判準:這一塊能不能**單獨 new 出來、單獨測**;重構手法:Replace Superclass with Delegate / Replace Subclass with Delegate(Fowler 第二版);2^N 個子類別 → N 個可疊加的零件——接 `[[rezero-permission]]`(base + 可疊加的 section)、`[[rezero-asset-lifecycle]]`(重來版改成共用的 QuerySet 方法)、`[[gitcrisp]]` | **GitCrisp 是這篇的主場**:1422 行的 pygit2 adapter 拆成 13 個 mixin(2026-04-18 起),969 行的 `MainWindow` 拆成 14 個(到 04-21)——合成後的類別「只負責建構」,但 mixin 之間靠 `self` 共用隱性狀態,不能單獨實例化,也不能單獨測;spec 裡記著當時被否決的替代案(facade、presenter 類別)與理由。同一個 repo 的正例:`ViewportBlockLoader`——兩個 widget 重複的邏輯抽成一個被持有的協作者,行為用 callback 傳進去(`61132fbd`、`14785c35`)。SportRecorder:`BackupJobHost.None`(平台掛鉤 + Null Object) | ⬜ |
| 15 | `ooad-polymorphism` | 多型:把 if 換成型別,什麼時候值得 | **【歸誰】** GRASP **Polymorphism**:行為隨型別而變時,把那段行為交給型別自己,而不是在外面 `if type == …`;重構手法 Replace Conditional with Polymorphism;**兩個方向的代價**(expression problem 的白話版):介面 + 多個實作 → 加新型別便宜、加新操作貴;sealed / enum + `when` → 加新操作便宜、加新型別貴(但編譯器會幫你抓漏);判準是「以後比較常加哪一種」;只有一個方法的多型,可以直接是一個函式參數;**要破的迷思**:看到 if / when 就該換成多型——只出現一次的分支不值得一個型別族,而且有時候答案根本不是物件多型,是一張表——接 `[[travel-split]]`(均分 / 加權 / 固定金額三種分法)、`[[rezero-payment]]`(每個第三方一張事實表,不做「通用付款表」)、`[[rezero-cart-order]]`(generic FK 的表多型)、`[[rezero-overview]]`(每個留言來源一個 adapter,M×N → M+N) | `PlaceRun.Share` / `PlaceRun.Paste`:同一個 `answered`,兩種存法(一個要撐過行程被系統回收,一個不用)——用多型取代一個旗標。`MapsLink.Short` / `Full`、`SharedVenueMatch`:封閉的型別族 + `when`。GitCrisp 走的是另一條路:三條字串 if 階梯換成一張以 enum 為鍵的表(`5f528275`、`b7373f45`),拿按鈕文字當分派鍵的地方改成 enum(`379bb9a4`)——**不是多型,是查表**,而且這樣剛好 | ⬜ ★ |
| 16 | `ooad-interface` | 介面是使用者的,不是實作者的 | **【藏什麼】** 介面應該由**用它的那一方**的需要來定(role interface),不是把實作類別的 public 方法抄一份(header interface);ISP 的本意;GRASP 剩下的三條一次講完:**Protected Variations**(在預期會變的點周圍包一層穩定的介面)、**Indirection**(加一個中介把兩邊解開)、**Pure Fabrication**(領域裡沒有、為了內聚與低耦合造出來的物件——Repository、Service、Mapper 都是);GoF 第一條原則 program to an interface, not an implementation;Python `Protocol`(看結構)與 Kotlin `interface`(看宣告)對「介面歸誰」的影響;**要破的迷思**:每個 class 都配一個 `IXxx` + `XxxImpl`——只有一個實作、也沒有要換的介面是純成本(接 #19),除非它的第二個實作是測試用的 fake(接 #20);**箭頭方向那一半(介面放哪一層、依賴怎麼翻過來)交給 arch**——接 `[[arch-dependency-inversion]]`、`[[arch-ports-adapters]]`、`[[sre-vs-devops]]`、`[[obs-collection]]`(M×N → M+N)、`[[k8s-networkpolicy-cni]]`、`[[airflow-providers]]`、`[[rezero-permission]]`(`ProductRepository` Protocol) | `PhotoImporter`:有了這個平台抽象,`EatTimeEditorViewModel` 不再碰 Android `Context`(`99eaafb`);`DietSettingsRepository` 背後換掉儲存(接 #8);Kotlin Multiplatform 把「平台」明講成變化點。誠實面:這些介面都只有一個正式實作加一份 fake——值不值得?GitCrisp 同題:四個 Protocol 各只有一個正式實作 | ⬜ |

## 第四幕 — 名字:模式與原則

前面三幕做過的事,業界早就取好名字了。名字是拿來溝通的,不是拿來套的。

| # | slug | 標題(暫定) | 主題 | 案例 | 狀態 |
|---|---|---|---|---|---|
| 17 | `ooad-patterns` | 設計模式是詞彙,不是目標 | **【歸誰】** GoF 的 23 個模式是 1994 年 C++ / Smalltalk 常見解法的目錄;它留下來的價值是**名字**(兩個字講完一個設計)與**被記下來的取捨**;用 GRASP 重讀一次:Strategy = Polymorphism、Adapter = Indirection + Protected Variations、Factory = Pure Fabrication、Observer = 把依賴反過來、Facade 是 Controller 的親戚、State = #11、Command = 把一個請求做成物件;**被語言特性溶掉的模式**:lambda 之於 Strategy / Command、`object` 之於 Singleton、sealed + `when` 之於 Visitor、Flow / signal 之於 Observer、`by` 之於 Decorator / Proxy;**要破的迷思**:會的模式越多設計越好——模式是重構走到的終點,不是設計的起點;**只深入兩個案例真的出現過的那幾個**,其餘一張對照表帶過——接 `[[rezero-microservices]]`(strangler fig、facade)、`[[rezero-overview]]`、`[[airflow-providers]]`、`[[travel-split]]` | SportRecorder 真的有的:Repository、Mapper(`4081bda`,在 PR #93 的分支上:每一列餐點資料都改由同一個 `EatRecord.toEntity` 組出來)、Observer(Flow / StateFlow)、Null Object、Use Case。GitCrisp 真的有的:Command / Query bus、Adapter、composition root、Qt signal、用 callback 當 Strategy、Singleton(主題管理員——規則書明文「No new module-level singletons.」)。兩個 repo 都**沒有**的:Template Method、Decorator、Visitor、類別版的 State / Strategy——沒有就不硬寫 | ⬜ |
| 18 | `ooad-solid` | SOLID 是事後檢查表,不是設計方法 | **(索引篇)** 五個字母各自在問的問題,以及它在這個系列**已經講過的那一篇**:S(一個類別只對一種改它的理由負責)→ #8;O(加新行為不必改舊程式)→ #15 與 #16 的 Protected Variations;L → #13;I → #16;D → `[[arch-dependency-inversion]]`;**要破的迷思**:① SRP =「一個 class 只做一件事」② OCP = 舊程式永遠不能改 ③ DIP = 用了 DI 框架 ④ 五條都滿足才算好設計;SOLID 與 GRASP 的關係:GRASP 講**怎麼分配**,SOLID 講**分配完哪裡會痛**;篇幅短,主要是回頭連結 | 不引新案例;用 #5–#16 的判決回填一張「五個字母 × 兩個 repo」的對照表 | ⬜ |
| 19 | `ooad-wrong-abstraction` | 錯的抽象比重複更貴 | **【藏什麼】** Sandi Metz〈The Wrong Abstraction〉:重複遠比錯的抽象便宜;錯的抽象怎麼長出來(兩段很像 → 抽成一個 → 第三個需求來了加參數 → 再加一個 if)與怎麼退回去(先 inline 回重複,再重新找);rule of three;過早的介面、為了「以後可能」留的擴充點(speculative generality)、每個操作一個只轉呼叫的類別;判準:抽出來的東西共用的是「怎麼做」,還是「做什麼」;**誠實面**:重複也有成本——同一條業務規則寫兩份是 bug 工廠(#6 的 `mergeInterval`),分辨的方法是問「它們是不是同一個知識」——接 `[[jenkins-shared-library]]`(「共用『怎麼做』,不共用『做什麼』」與那個一行就跑完的 `standardPipeline()`)、`[[rezero-notification]]`(等第二個渠道再抽象)、`[[rezero-asset-lifecycle]]`(半套抽象比沒有抽象更貴)、`[[pain-before-power]]`、`[[arch-when-not]]` | 前一天抽出來、隔天就刪掉的 `DietHistoryCalculator`(`ab1d139` → `6ff603f`);只有一行的 `LoadEatRecordUseCase`;2021 年的空 `BaseFragment`。GitCrisp:93 個轉呼叫的 command / query 類別,配一個有 93 個欄位的 bus;`ensure_identity` 的失敗掛鉤加了四天就移除(`122583bb` → `d82726a7`,標題直接寫 no caller can use) | ⬜ ★ |

## 第五幕 — 演化與反面:設計是改出來的,也可以不用

| # | slug | 標題(暫定) | 主題 | 案例 | 狀態 |
|---|---|---|---|---|---|
| 20 | `ooad-test-feedback` | 測試是設計的第一個使用者 | **【歸誰】** 難測是設計在求救:要 mock 五個東西才能測一個方法 = 協作者太多(耦合);要先跑一長串 setup = 責任太多(內聚);根本測不到 = 邏輯住在不該住的地方(畫面、框架回呼);test double 的五種(dummy / stub / spy / mock / fake)與「mock 太多,測試就失真」;把時間、時區、亂數當參數傳進去;把邏輯抽成純函式或純物件,是最便宜的可測性;**要破的迷思**:可測性靠 mock 框架——靠的是設計;只講物件層級,「不起 DB / UI 就能測 core」交給 arch——接 `[[rezero-team]]`(「mock 太多,測試變得失真」)、`[[rezero-comment-order]]`、`[[airflow-testing-deploy]]`(把邏輯抽成純函數)、`[[jenkins-groovy-cps]]`、`[[blog-as-a-product]]`、`[[ai-guardrails]]`、`[[arch-testability]]` | 2021:只有範例測試——邏輯在 Fragment 裡,想測也測不到;把階段計算抽成純的 `DietWindow` 的那個 commit(`d2955a0`),同時是這個 repo 第一批真的測試。`ReminderPlanner.plan(…, now, timeZone)`:時間與時區是參數。全 repo 約二十份手寫 fake,build 檔裡沒有 mock 函式庫;債:兩份 `FakeVenueRepository` 會漂移。GitCrisp:mixin 不能單獨測、widget 測試要用 `__new__` 繞過 `__init__`(repo 自己的檢討筆記寫的);規則書「Tests inject, they do not patch.」 | ⬜ |
| 21 | `ooad-refactoring` | 重構:把責任搬到對的地方 | **【歸誰】** 用這個系列的詞重讀 Fowler 的壞味道——每一個都是責任放錯了地方:Feature Envy(邏輯想搬去資料那邊住)、Data Class(只知道、不做)、Shotgun Surgery(一個決定沒被藏起來)、Divergent Change(一個類別有兩種改它的理由)、Large Class、Message Chains、Refused Bequest、Speculative Generality;對應的搬家手法:Move Function、Extract Class、Replace Conditional with Polymorphism、Replace Superclass with Delegate;小步,每一步都有測試擋著(#20);**要破的迷思**:重構 = 重寫;重構要另外排時間——接 `[[iac-small-pieces]]`(爆炸半徑決定你敢不敢改)、`[[rezero-microservices]]`(strangler fig:系統尺度的同一招) | 把 #1 那條搬家路線用真實的 commit 序列重播一次,每一步標出用了哪個手法、當時靠什麼確認沒壞:`6838606` → `d2955a0` → `773ddb1` / `30d8919` / `7f0671d` → `5bd1e2e`。這一段是 2026-06 由作者訂規格、AI 實作、作者驗收做的,文內要照實寫。GitCrisp 對照:13 個 mixin 那一次——拆的是檔案,還是責任(接 #14) | ⬜ |
| 22 | `ooad-when-not` | 邏輯不住在物件裡的系統:什麼時候別用物件導向 | **【歸誰】** 全系列的反面篇。Fowler 在 PoEAA 列的三種業務邏輯組織法(Transaction Script / Table Module / Domain Model),以及「貧血模型」為什麼被叫反模式、什麼時候它其實是對的;判準:規則是**跨多筆資料的集合運算**(資料庫擅長),還是**單一概念內部的狀態與不變量**(物件擅長);Active Record 型的框架(Django ORM、Room entity)把資料表的一列直接當物件——方便在哪、帳單在哪;一個純函式就夠的地方不要硬開 class;「不可變資料 + 純函式 + sealed」的寫法,責任分配照樣是核心問題,只是「物件」變成了模組——接 `[[btl-7]]`、`[[btl-10]]`(那次擋下同事獨立的 domain entity——這裡從設計面重判,情節不重講)、`[[rezero-team]]`(測試金字塔是為「邏輯住在物件裡」的系統發明的)、`[[rezero-permission]]`(「沒有 AuthorizationService」:小得不值得一個 class)、`[[rezero-payment]]`、`[[ddia-data-models]]`、`[[arch-ddd-tactical]]`、`[[arch-when-not]]`、`[[pain-before-power]]` | 兩個貫穿案例自己都不太「物件導向」:SportRecorder 的規則住在無狀態的 `object` 計算器與 repository 的 SQL 裡,model 幾乎全是不可變的 `data class`;GitCrisp 的架構規則直接寫 domain 是純資料類,Git 的行為住在 pygit2。這樣有什麼不好嗎?哪一條規則因此沒有家(接 #4 的地址規則)? | ⬜ ★ |
| 23 | `ooad-review` | Review 物件設計,我只問三個問題 | **(收尾篇)** 把三個問題變成 review 時的三個檢查題,各附一張紅旗清單:歸誰(邏輯落在「最方便的地方」、`Manager` / `Helper`、一行的轉呼叫)、藏什麼(改一個決定要動幾個檔、對外露出內部型別、`Base` 類別)、叫什麼(名字對不上業務的說法、同一個概念兩個名字);同一套題目拿去看人的 PR 與 AI 的 PR 有什麼不一樣;哪些可以寫進規範讓機器擋(import 方向、禁止字串字面值、禁止新的 singleton)、哪些只能靠人判;全系列 22 篇的回顧表(每篇主要在練哪一題);把棒子交給 arch 系列——接 `[[ai-review-craft]]`(風險分級在那邊,這裡只給物件設計的檢查題)、`[[ai-spec-craft]]`、`[[ai-guardrails]]`、`[[gitcrisp]]`、`[[btl-1]]`、`[[arch-what-problem]]` | GitCrisp 的 `quality.md`(review 用的設計規則書)是把檢查題寫成規範的實例;SportRecorder `DEVELOPMENT.md` 的〈待重構〉是 review 記下來、還沒還的債。作者實際 review 時會問的問題、AI 最常把責任放錯的實例(待訪談) | ⬜ ★ |

★ = 骨架 / 最高投報(1、3、5、7、9、13、15、19、22、23)。邊寫邊發:`draft: true` → `false`。

**供給紀律**:**第一、二幕(#1–#10)是必寫的骨幹**,當成第一季——寫完再回頭檢討後面三幕要不要動。第三幕以後若節奏跟不上,**優先併篇而不是拖稿**;可併的候選:#13 + #14、#17 + #18、#20 + #21。動了就改這張表。

## 素材對照:哪幾篇有第一手

| 篇 | 第一手強度 | 說明 |
|---|---|---|
| #1 #5 #6 #7 #9 #11 #12 #20 | ★★★ | 有 2021 年手寫的原始碼可以逐檔對照——當年聲部是程式本身;但「當時為什麼這樣寫」仍然要問作者 |
| #3 | ★★★ | venue spec 明載作者自己的選擇(便宜的方案是被建議的,選實體的是 owner) |
| #22 | ★★★ | `[[btl-7]]`、`[[btl-10]]` 的自白是已發布的第一手;rezero 的「邏輯住在資料裡」也已發布 |
| #14 #15 #19 | ★★ | 靠兩個 repo 的 commit 與 spec;「當時怎麼判的」要讀 spec 或問作者 |
| #13 | ★★(待訪談) | 案例裡只有一個空的 `BaseFragment`;這篇的重量靠作者 Android 職場的繼承鏈口述 + rezero 的 `SoftDeleteModel` |
| #10 #23 | ★★(待訪談) | UML 實際怎麼用、review 時實際問什麼——作者確認有,但細節還沒問 |
| #2 #4 #8 #16 #17 #21 | ★ | 模型為主,案例是 2026 年 AI 協作的產出;反思寫成不掛名的分析,或問到作者的看法再掛名 |
| #18 | — | 索引篇,不需要第一手 |

## 仍待補的訪談題(動筆前一次問完)

- **Android 那幾年**(YowooTech / Grindr / AirDroid,about 頁寫近 8 年):哪一條 `BaseActivity` / `BaseFragment` 繼承鏈最痛?幾層、裡面塞了什麼、後來怎麼拆?(#13)有沒有具體的 God Activity / Fragment / ViewModel——多大、怎麼發現的、MVP → MVVM 有沒有親身走過?(#9)
- **SportRecorder 2021**:當時為什麼開 `BaseFragment`?把階段判斷寫在 Fragment 裡,當時覺得有什麼問題嗎?(#1、#13)為什麼停了五年、2026 年為什麼決定重構而不是重寫?(#21)
- **AirDroid「導入 DDD」「重構計費流程」**(about 頁):實際做了什麼、哪些可以寫?(#3、#11、#21;前職素材發佈前確認邊界)
- **UML**:哪門課學的?工作上哪個場合真的畫過(use case、類別圖、循序圖)?畫給誰看、有沒有用?現在還畫嗎,用什麼畫?(#2、#10)
- **後端**:`[[btl-7]]` 那次 review,當時反對獨立 domain entity 的理由是什麼?現在同樣的 PR 會怎麼判?(#22)rezero 裡最後悔與最得意的一個 class 各是哪個?
- **帶人與驗收 AI**:review 物件設計時實際會問的問題是什麼?junior 最常把責任放錯在哪?AI 最常犯的設計錯誤有沒有一個具體的 PR?(#23)
- **兩個 repo 的 spec**:哪些決定是作者自己下的、哪些是照 AI 的建議?(誠實面紀律 2;每篇動筆前對該篇用到的 spec 問一次)
- **資歷的寫法**:`docs/arch-series-roadmap.md` 寫「Android 5 年 + Backend 2 年」,about 頁寫「近 8 年 Android」——文章裡以哪個為準?
- **還債上鏡**:願不願意讓五筆債照這個系列的節奏還?(不願意的話,那幾篇改成只做判決、不落 PR)

## 術語表(Ubiquitous Language)

**自創系列,但概念有原典**:英文欄填原典用字。⚠ = 自創或自譯的說法,翻譯時不可以掛在原典名下。

全系列同一個概念只准一個中文寫法;英文欄是翻譯時直接照抄的來源。寫到表上沒有的術語就補一列。跨系列共用的通用詞(物件、介面、類別……)在 `docs/ubiquitous-language.md`(全站術語表),這裡只放本系列特有的。

| 中文用詞 | 英文 | 備註 |
|---|---|---|
| 分析 / 設計 | analysis / design | 分析 = 問題裡有什麼;設計 = 軟體物件怎麼分工。內文縮寫 OOAD,不展開成全名 |
| 責任 | responsibility | **不寫「職責」**(站內既有文章兩者混用,本系列統一);與 `帶 AI 的手藝` 的組織責任同字不同義,每篇首次出現要點明 |
| 知道 / 做 | knowing / doing | 責任的兩種;不寫「認知型 / 行為型」 |
| 責任分配 | responsibility assignment | 系列脊椎;不寫「職責指派」 |
| 協作 / 協作者 | collaboration / collaborator | CRC 的第三個字 |
| CRC 卡 | CRC card | Class–Responsibility–Collaborator;Beck & Cunningham 1989 |
| 角色刻板 | role stereotype | Wirfs-Brock;六種名稱(information holder / structurer / service provider / coordinator / controller / interfacer)一律寫英文 |
| 這件事歸誰 | Who Owns This? ⚠ | 自創;每篇固定小節名,中英文標題都固定 |
| 歸誰 / 藏什麼 / 叫什麼 | Who owns it? / What does it hide? / What is it called? ⚠ | 自創;三個 **【】** 標記 |
| 責任搬家 | moving a responsibility ⚠ | 自創;圖與重構篇的固定說法,不寫「遷移」(那是 migration) |
| 判決 | the ruling ⚠ | 自創;〈這件事歸誰〉小節的結論 |
| use case | use case | **內文一律英文**;不寫「用例」「使用案例」「使用個案」 |
| actor | actor | 內文英文;primary actor 同 |
| 主線 | main success scenario | Cockburn;首次出現附英文 |
| extensions | extensions | Cockburn;內文英文,解釋時說「主線以外的每一種走法」。不寫「例外流程」——它不只是例外 |
| 目標層級 | goal level | summary / user goal / subfunction |
| 領域模型 | domain model | 不寫「領域模式」「域模型」 |
| 概念類別 / 軟體類別 | conceptual class / software class | Larman;兩個詞嚴格分用 |
| 表徵落差 | representational gap ⚠ | Larman 的 low representational gap;中文是自譯,首次出現附英文 |
| 資料模型 | data model | 與 `[[ddia-data-models]]` 同詞;指「怎麼存」 |
| 系統操作 | system operation | Larman |
| 系統循序圖 | system sequence diagram(SSD) | 只畫 actor 與系統之間那一層 |
| 操作契約 | operation contract | |
| 前置條件 / 後置條件 | precondition / postcondition | |
| 不變量 | invariant | 對齊 rezero 系列;不寫「不變式」「不變條件」 |
| 契約式設計 | Design by Contract | Meyer;內文可直接用英文 |
| GRASP | GRASP | 九條的名稱**一律英文**:Information Expert、Creator、Controller、Low Coupling、High Cohesion、Polymorphism、Pure Fabrication、Indirection、Protected Variations;首次出現附一句中文解釋(標題可用「資訊專家」「建立者」) |
| 封裝 | encapsulation | |
| 資訊隱藏 | information hiding | Parnas 1972 |
| 藏的是決定 | hide a design decision | 招牌句,措辭固定 |
| 耦合 / 內聚 | coupling / cohesion | 與 arch 系列同詞 |
| God class | God class | 內文英文;不譯「上帝類別」 |
| 轉呼叫 | pass-through ⚠ | 指只把呼叫原封不動轉給下一層的類別或方法;不寫「透傳」 |
| 循序圖 | sequence diagram | 不寫「時序圖」「序列圖」 |
| 類別圖 | class diagram | |
| 草圖 | sketch | Fowler 的 UML as sketch;對照 blueprint(藍圖) |
| 狀態機 | state machine | 對齊 rezero |
| 轉移 | transition | 不寫「轉換」「遷移」 |
| 算出來的狀態 / 存起來的狀態 | derived state / stored state ⚠ | 自創的對照說法 |
| 非法狀態無法表示 | make illegal states unrepresentable | Yaron Minsky |
| 值物件 | value object | arch roadmap 寫 Value Object,指同一件事 |
| 實體 | entity | 細節在 arch |
| 父類別 / 子類別 | superclass / subclass | 不寫「基類」「派生類」「超類」;`BaseXxx` 直接寫類別名 |
| 子型別 | subtype / subtyping | 與「重用」分開講,是 #13 的核心區分 |
| Liskov 代換原則 | Liskov Substitution Principle(LSP) | 不寫「里氏替換」 |
| fragile base class | fragile base class | 內文英文,首次出現附一句解釋 |
| 組合 | composition | 「組合優於繼承」 |
| 委派 | delegation | 不寫「委託」 |
| mixin | mixin | 內文英文 |
| 封閉的型別族 | sealed hierarchy ⚠ | 指 Kotlin `sealed` 與等價寫法;中文是自譯 |
| 角色介面 | role interface | Fowler;對照 header interface |
| 設計模式 | design pattern | 模式名一律英文(Strategy、Adapter……),不譯 |
| 錯的抽象 | the wrong abstraction | Sandi Metz |
| 過度設計 | over-engineering | 對齊 arch 與 rezero |
| 壞味道 | code smell | 味道名與重構手法名一律英文 |
| 測試替身 | test double | 五種(dummy / stub / spy / mock / fake)寫英文 |
| 純函式 | pure function | 全站「函式 / 函數」兩可,本系列統一用「函式」 |
| 貧血模型 | anemic domain model | Fowler;對齊 arch「別讓 model 變貧血」 |
| Transaction Script | Transaction Script | PoEAA;內文英文 |
| 什麼時候別用 | when not to use it | 與 arch 共用的招牌小節名,措辭固定 |
| 當年聲部 | the 2021 voice ⚠ | 沿用 rezero「當年 / 重來」的說法;本系列的「當年」專指 SportRecorder 2021 年的手寫版本,或作者口述的職場經驗 |

### 案例的領域詞彙(SportRecorder)

寫到案例時照這張表,用 repo 自己的說法(取自它的 README 與 `DEVELOPMENT.md`)。這張表本身就是 **【叫什麼】** 的示範。

| 中文用詞 | 英文 | 程式裡的名字 / 備註 |
|---|---|---|
| 餐點 | meal | `EatRecord`;2021 年的 Room entity 叫 `EatTime`,資料表到現在還叫 `eat_time` |
| 進食視窗 | eating window | `DietWindow`;不寫「進食窗口」「用餐區間」 |
| 斷食 / 斷食達標 | fasting / fast complete | 階段是 `DietPhase`:IDLE / EATING / FASTING / SUCCESS |
| 斷食類型 | fasting type | 進食與斷食時數的組合(16:8 這類),可以自訂 |
| 店家 | venue | `Venue`:食物從哪來。**不是**使用者人在哪 |
| 位置 | location / position | `EatRecord.location` = 人當時在哪;`Venue.position` = 店在哪。兩個詞對應兩個事實,嚴格分用 |
| 用餐時長 | meal duration | `MealDuration`(PR #93,尚未併入 `master`) |
| 回顧 | Insights | App 內的分頁名 |

## 引用來源

⚠ **這張書目與章節表裡的原典用字是憑記憶排的,沒有逐一對過原文。** `An Elegant Puzzle` 那份 roadmap 核對目次時就抓到過兩個二手訛傳——動筆前回原文確認該篇會引到的句子、名稱與年份,有出入就回填這裡。

- Craig Larman,*Applying UML and Patterns*(3rd ed.,Prentice Hall 2004)——GRASP、領域模型、系統循序圖、操作契約、low representational gap。#1、#3、#4、#6、#8、#9、#15、#16 的主要來源。
- Rebecca Wirfs-Brock & Alan McKean,*Object Design: Roles, Responsibilities, and Collaborations*(Addison-Wesley 2002)——責任驅動設計、角色刻板。#5。
- Kent Beck & Ward Cunningham,〈A Laboratory for Teaching Object-Oriented Thinking〉(OOPSLA 1989)——CRC 卡。#5。
- Alistair Cockburn,*Writing Effective Use Cases*(Addison-Wesley 2000)。#2。
- Bertrand Meyer,*Object-Oriented Software Construction*(2nd ed.,Prentice Hall 1997)——Design by Contract、Command–Query Separation。#4、#7。
- David Parnas,〈On the Criteria To Be Used in Decomposing Systems into Modules〉(CACM 1972)。#7。
- Barbara Liskov,〈Data Abstraction and Hierarchy〉(OOPSLA 1987);Liskov & Wing,〈A Behavioral Notion of Subtyping〉(1994)。#13。
- Gamma、Helm、Johnson、Vlissides,*Design Patterns*(Addison-Wesley 1994)——兩條原則與 23 個模式。#14、#16、#17。
- Martin Fowler,*Refactoring*(2nd ed. 2018)、*Patterns of Enterprise Application Architecture*(2002)、*UML Distilled*(3rd ed. 2003),以及 bliki 的 AnemicDomainModel、TellDontAsk、RoleInterface。#10、#14、#16、#21、#22。
- Robert C. Martin,SOLID(*Agile Software Development: Principles, Patterns, and Practices* 2002;*Clean Architecture* 2017 改用 actor 講 SRP)。#18。
- Sandi Metz,〈The Wrong Abstraction〉(2016)。#19。
- Lieberherr 等,Law of Demeter(1987–1989)。#6。
- Alan Kay 談 messaging 的那封信(1998);Yaron Minsky 的 make illegal states unrepresentable。#5、#11。

## 建議閱讀順序

1. **只讀四篇**(1→5→6→7):論點、什麼是責任、怎麼分配、封裝——這個系列的核心都在這裡。
2. **分析線**(2→3→4):接手一個不熟的領域,或要把需求寫給人或 AI 之前讀。
3. **最常吵架的幾題**(13→14→15→16):繼承、組合、多型、介面;各自獨立,可以跳著讀。
4. **如果你已經覺得 OO 被濫用**:先讀 19 與 22,再回頭讀 5——反面篇講的其實是同一件事。
5. **帶人,或在驗收 AI 的產出**:直接讀 23,它會指回你需要補的那幾篇。
6. 讀完接 `架構,我以為我懂`:這裡把一個類別的責任講清楚,那邊講一群類別之間的依賴方向與邊界。

## 開新系列的落地檢查清單

roadmap 寫完、**第一篇發布時**一起做(`series.ts` 一登記,/start/ 上方的系列 chip 就無條件出現,所以登記與發布必須同一批):

1. `src/data/series.ts` — `{ slug: 'ooad', name: 'OOAD 我以為我懂', enName: 'OOAD: I Thought I Knew It', blurb, enBlurb, color: 'var(--hue-blue)' }`。`hue-blue` 是 /start/「應用與架構 · Application」那一層的顏色,目前沒有任何系列在用。blurb 草稿:「把『以為懂了』的物件導向重新拆開——封裝、繼承、多型、use case、領域模型、設計模式,其實都在回答同一個問題:這件事歸誰。拿一個從 2021 活到現在的真 App 當案例。」
2. `src/components/Graph.jsx` — `SERIES` 加 `['OOAD 我以為我懂', '<hue>', 'OOAD']`。**13 個非灰色的 hue 已經全部用過**(green、pink 各有兩個系列共用)。建議與 `SQL 我以為我懂` 共用 `cyan`——「我以為我懂」家族一個顏色,靠 `OOAD` / `SQL` 標籤區分(同 aep 與 BTL 共用 pink 的先例),arch 開寫時也用同一個。**待作者拍板**。
3. `src/pages/start.astro` — 放「應用與架構 · Application」層(現在只有三篇單篇):`groups` 加 `sGroup('ooad', '物件層級 · ')`,arch 開寫後接在它後面。該層的 `blurb` 目前只講資料轉換,要補一句物件與架構。
4. `docs/en-translation-glossary.md` A 區 — 補上 `ooad` 一列,與 `series.ts` 的 `enName` 同步。
5. 本檔該篇狀態改 `✅ 已發布`。
6. `npm test` + `npm run build` 驗證。

## 寫每篇時的慣例
- front matter:`series: "OOAD 我以為我懂"`、`seriesOrder: <#>`、`category: tech`、`comments: true`、`draft: true`(寫好再發)。
- tags 用 ASCII:`ooad`(主 tag)+ 該篇主題(如 `object-design`、`domain-modeling`、`design-patterns`、`refactoring`、`kotlin`、`python`、`android`)。**不要用 `architecture` 當主 tag**,那是 arch 系列的;兩個系列的 tag 頁才不會糊在一起。
- 依 `.claude/skills/writing-blog-post`:一張招牌深色 SVG + 比原典更清楚的摘要 + 一段真實反思。
- SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號;figcaption 內不放 `[[wikilink]]`,要連結用 `<a href>`。
- 台灣用語(見 `docs/zh-tw-style-guide.md` 與全站術語表);動筆前先查上面的〈術語表〉,特別是「責任」不寫「職責」、use case 不譯。
- **每篇四樣東西不能省**(見〈每篇的產物與圖〉):扛責任搬家的圖、真實程式碼的 before / after、〈這件事歸誰〉、〈什麼時候別用〉。
- **貫穿主軸**:每篇結尾扣回「**好的物件設計,是讓下一個改動有一個明顯該去的地方**」,並確認這篇主要在練 **【歸誰】/【藏什麼】/【叫什麼】** 的哪一題——用判決呈現,不要複讀口號。
- **引用案例 repo**:連結釘 commit hash;2021 年的歷史只引 `.kt`;2026 年的重構照實寫成「訂規格 / AI 實作 / 驗收」,不寫成「我重構了」;拿 GitCrisp 當反例時寫出當時的理由。
- **守住與 arch 的線**:寫到依賴方向、分層、Aggregate、Bounded Context、Repository 就停手,照〈與既有系列的關係〉那張歸屬表連過去。arch 還沒發的篇**先不連**——章節表裡的 `[[arch-*]]` 是「等 arch 開寫再互連」的備忘(同 aep roadmap 的做法),arch 發布時回頭補。
- **守住與 ai-craft 的線**:AI 只在 #1 與 #23 正面談;其他篇提到就連 `[[ai-review-craft]]`、`[[ai-spec-craft]]`,不展開。
- **cross-link 是重點**:判例 ↔ `[[rezero-asset-lifecycle]]`、`[[rezero-cart-order]]`、`[[rezero-comment-order]]`、`[[rezero-inventory]]`、`[[rezero-promotion]]`、`[[rezero-payment]]`、`[[rezero-permission]]`、`[[rezero-team]]`;自白 ↔ `[[btl-7]]`、`[[btl-10]]`;資料 vs 物件 ↔ `[[ddia-data-models]]`、`[[fode-8]]`;耦合內聚 ↔ `[[iac-small-pieces]]`、`[[fode-3]]`;抽象的代價 ↔ `[[jenkins-shared-library]]`、`[[pain-before-power]]`;案例 ↔ `[[gitcrisp]]`、`[[travel-split]]`;驗收 ↔ `[[ai-review-craft]]`、`[[ai-spec-craft]]`、`[[ai-guardrails]]`。
- Git:開 branch → push → PR,不直接動 master(CLAUDE.md 硬規矩)。

## 修訂紀錄
- **2026-11-10(第一版)**:建立本 roadmap。作者拍板四件事(自創・我以為我懂 / 與 arch 並存當前傳 / 要貫穿案例 / 四種第一手素材都有)。作者點名三個自己的專案請評估,讀過程式與 git 歷史後定案 **SportRecorder(主)+ GitCrisp(副)**,第三個候選是 private repo,不採用。站內 189 篇中文文章掃過一輪找接點:rezero 的判例引句都回原文核對過;掃完確認站上**完全沒有**談過 UML、Android / Kotlin、SOLID 的名詞、GoF 模式本身與需求分析方法——這些是本系列要補的空白,不是可以連過去的既有文章。同批在 `docs/arch-series-roadmap.md` 補上回指的分工段。
