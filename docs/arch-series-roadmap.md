# 架構,我以為我懂 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "架構,我以為我懂"`。
(名稱暫定,對齊 `SQL 我以為我懂` 的破除迷思路線;開寫前若要改,趁還沒有文章、改 series 鍵即可。)

DDD 與 Clean Architecture **合成一個系列**(兩者重疊大:分層、依賴反轉、邊界),不分開寫。

定位:**架構的本質是管理「依賴的方向」與「邊界的畫法」,好讓改動變便宜。** 不走教科書,走「你以為你懂」的破除迷思路線:拆穿 cargo-cult、給打過仗的取捨、誠實講「什麼時候別用」。

## 最大差異化:雙 runtime 實戰對照

作者 Android 5 年 + Backend 2 年,**每篇都內建「Android vs Backend」對照小節**——同一套原則在兩個 runtime 長得多像、又踩不同的坑(例:UseCase/ViewModel ↔ Application Service;Repository 兩邊都愛卻常做錯;依賴反轉在 UI 框架綁很死的 Android 上更痛)。這個跨領域視角是本系列的護城河,別人難複製。

## 避開兩個罩門(寫作紀律)
1. **圖別畫成裝飾**:不要畫大家都畫過的 Clean Arch 同心圓、六邊形當「說明」。讓圖扛**決策**或 **before/after 重構**——例如「依賴方向反轉」把箭頭真的翻過來、「IO 推到邊緣」把 DB/UI 從核心移出去。圖要揭露機制,不是貼 logo。
2. **內容別變抽象說教**:每篇綁一個**具體 code / 重構例子**,反思要有真實戰場的意見,不要只複述原則。

## 第一幕 — 地基:依賴與邊界

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `arch-what-problem` | 架構到底在解什麼問題 | 架構 = 管理依賴,讓變更便宜;不是為了「乾淨」而乾淨;變更成本這把尺 | ⬜ ★ 脊椎・先寫 |
| 2 | `arch-dependency-inversion` | 依賴反轉,到底反轉了什麼 | DIP:before `Service→DB`,after `Service→介面←DB`;箭頭翻過來的機制;Android/Backend 對照 | ⬜ ★ |
| 3 | `arch-layering` | 別無腦分層:同心圓的本質 | 分層 vs Clean Arch;圈的唯一規則「依賴只能向內」;為何三層常淪為傳話 | ⬜ |

## 第二幕 — Clean Architecture 落地

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 4 | `arch-clean-layers` | Clean Architecture 四層各放什麼 | Entities / Use Cases / Interface Adapters / Frameworks;Android(UseCase/ViewModel/Repo)vs Backend(domain/application/infra)對照 | ⬜ |
| 5 | `arch-ports-adapters` | Ports & Adapters:把 IO 推到邊緣 | 六邊形;core 不知道 DB/HTTP/UI;driver vs driven side | ⬜ |
| 6 | `arch-testability` | 可測試性是架構的照妖鏡 | 好架構 = 不起 DB/UI 就能測 core;依賴反轉 → 用假實作換掉邊緣 | ⬜ ★ |

## 第三幕 — DDD

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 7 | `arch-ddd-tactical` | DDD 戰術:Entity、Value Object、Aggregate | 一致性邊界(aggregate)、VO 的不可變、別讓 model 變貧血 | ⬜ ★ |
| 8 | `arch-ddd-strategic` | DDD 戰略:Bounded Context 與通用語言 | context map;語言即邊界;跟微服務、跟 `[[ddia-data-models|資料建模]]` 的關係 | ⬜ ★ |
| 9 | `arch-repository` | Repository 模式:兩邊都愛、都常做錯 | 該回 domain 物件不是 DTO;別把 ORM 洩到 domain;Android vs Backend 各自的坑 | ⬜ |

## 第四幕 — 反面

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 10 | `arch-when-not` | 什麼時候別用:過度設計的代價 | CRUD app 不需要 DDD;抽象的維護稅;扣 `[[pain-before-power]]` | ⬜ ★ |

★ = 投報率最高(2、6、7、8、10)。第一幕三篇是地基,優先寫。可先寫 1 篇(建議 ② 依賴反轉)試水溫再展開。

## 術語表(Ubiquitous Language)

**自創系列**:這些術語是作者自己造的,沒有原書可以對 —— 所以中英文都要在這裡定死,之後每篇照抄。

**這個系列還沒發第一篇** —— 這張表先從定位與章節表定,動筆時邊寫邊補。

全系列同一個概念只准一個中文寫法;英文欄是翻譯時直接照抄的來源。
寫到表上沒有的術語就補一列。跨系列共用的通用詞(快取、佇列、可觀測性)在
`docs/ubiquitous-language.md`(全站術語表),這裡只放本系列特有的。

| 中文用詞 | 英文 | 備註 |
|---|---|---|
| 依賴方向 | dependency direction | 系列定位第一句;不寫「相依方向」(但內文的「相依」照 zh guide 保留) |
| 邊界 | boundary | 邊界的畫法 |
| 改動成本 | cost of change | 「好讓改動變便宜」 |
| 耦合 / 內聚 | coupling / cohesion | 與 FoDE 的鬆耦合對齊 |
| 抽象洩漏 | leaky abstraction | |
| 分層 | layering | 與 medallion / k8s 的分層對齊 |
| 什麼時候別用 | when not to use it | 系列招牌段落,措辭固定 |

## 寫每篇時的慣例
- front matter:`series: "架構,我以為我懂"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`architecture` + 該篇主題(如 `clean-architecture`、`ddd`、`backend`、`android`)。
- 每篇一張以上站台深色 SVG(SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號;圖說 figcaption 內不可放 `[[wikilink]]`,要連結用純 `<a>`)。
- **每篇內建「Android vs Backend 對照」小節**——這是招牌,別省。
- 依 `.claude/skills/writing-blog-post`:摘要比原文更清楚 + 一段真實反思(這系列反思=賣點,務必用打過仗的具體意見);台灣用語(見 `docs/zh-tw-style-guide.md`)。
- 語言不拘(Android 用 Kotlin、後端隨例),重點在結構不在語法。
- cross-link:過度設計 ↔ `[[pain-before-power]]`;bounded context ↔ `[[ddia-data-models]]`;依賴反轉/宣告式的「把怎麼做交出去」可呼應 SQL/DDIA 那條線。
