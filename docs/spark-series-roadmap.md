# Spark 學習筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Spark 學習筆記"`。

定位:**Spark 最漂亮的地方是「你只說要什麼」——這系列講的是那句話的代價,以及看穿它的方法。** 官方文件教你 API,這裡教你**成本模型**:一段宣告式的 code 被 Catalyst 翻成計畫、在幾十台機器上跑,而帳單幾乎都由**資料搬移(shuffle)**在付。抽象好用的時候你不用管它;它漏水的時候(慢、OOM、skew),你得能把它打開來看——所以系列的骨架是「抽象 → 成本 → 看穿」。

護城河:**DE 日常視角,不是 API 導覽**——每篇都在回答「這個東西什麼時候會咬你、你怎麼看出來」;跨系列把同一套「宣告式 + 最佳化器」的課在 PG(`[[sql-explain]]`)與 Spark(`[[spark-explain]]`)兩邊對照,單一工具教學給不出這個。

罩門(寫成紀律,這系列最容易寫爛的兩件事):
1. **別變成官方文件的參數表**——不逐一抄設定,抓「為什麼這樣設計、什麼時候會咬你」;每個參數都要附「調它之前先問什麼」。
2. **圖別畫成 Driver→Executor 三個方塊的裝飾**——圖要扛機制:narrow vs wide 的資料流、stage 被 wide 切開的位置、無界表往下長、計畫樹由下往上讀。看得懂圖就抓得到成本。

**與既有系列的關係(差異化)**:
- ↔ **Kafka 系列**(`[[kafka-intro]]`、`[[kafka-ecosystem]]`、`[[kafka-delivery]]`):那邊講事件從哪來、投遞保證怎麼談;這裡只講「拿到之後怎麼把它當一張表算」。micro-batch vs Kafka Streams 的取捨放 #5,互連、不重複。
- ↔ **Airflow 系列**(`[[airflow-scheduling]]`、`[[airflow-reliability]]`):**誰來排、失敗怎麼重跑、冪等怎麼保證是 Airflow 的事**;Spark 只管一支 job 內部發生什麼。寫出用 `partitionBy` 覆寫分區(#2)是兩邊的焊點。
- ↔ **從 Infra 角度看資料工具**(`[[infra-spark]]`):那邊是「把 Spark 當 infra 養」——拓撲、stateless 那端的擴縮、dynamic allocation、在 k8s 上取代 YARN;這裡是**開發者視角**:怎麼寫、怎麼提交、為什麼慢。#4 與 infra-spark 是同一台機器的兩張臉,務必互連。
- ↔ **SQL 我以為我懂**(`[[sql-explain]]`、`[[sql-mpp]]`):單機 PostgreSQL 的最佳化器與 `EXPLAIN` 在那邊;Catalyst 與 physical plan 在這邊。**同一套心法的兩個實作**,#6 明講這層對照;MPP(Greenplum/Cloudberry)的分散式 SQL 讓 SQL 系列收,這裡不搶。
- ↔ **DDIA**(`[[ddia-batch]]`、`[[ddia-streaming]]`):MapReduce 血統、批次與串流為什麼會統一,原理在 DDIA;這裡是拿 Spark 把它跑出來。
- ↔ **FoDE / Medallion**(`[[fode-8]]`、`[[medallion-architecture]]`):轉換在資料工程生命週期的位置在那邊,這裡不重講定位。

**貫穿主軸**:**你只說要什麼,Spark 決定怎麼做——但帳單是資料搬移在付。** 拆成三個可逐項檢查的性質(表格用 **【】** 標記,寫之前先確認這篇在服務哪一項,免得結尾硬套同一句話):

| 性質 | 在問什麼 | 沒有它會怎樣 |
|---|---|---|
| **【宣告式】** | 這篇在講「把怎麼做交出去」的哪一層抽象?(DataFrame/SQL、串流即表、程式碼與叢集解耦) | 讀者以為 Spark 是「另一種 pandas 語法」,寫得出來但不知道自己交出了什麼 |
| **【資料搬移】** | 這篇的成本最後扣不扣得回 shuffle / 跨網路搬資料? | 變成 API 導覽:每個函式都會用,一上量就慢得莫名其妙 |
| **【看得見】** | 這篇有沒有給一個「打開來看」的把手?(`.explain()`、Spark UI、watermark、`deploy-mode`) | 只能通靈調參數——「相信最佳化器」變成「不敢看它做了什麼」 |

★ = 骨架 / 最高投報(1、3、6)。邊寫邊發:`draft: true` → `false`。`seriesOrder` = 寫作順序。

## 每篇的程式碼與圖(硬性要求)

宣告式的東西**用講的最沒說服力**,所以每篇至少要有:

| 要求 | 規矩 |
|---|---|
| **一段最小可跑的 PySpark**(或 Spark SQL) | 砍到只剩要講的那個概念,但貼上去不會壞;不逐一抄參數 |
| **一張扛機制的深色 SVG** | 圖要能單獨看懂大意:資料怎麼流、在哪裡跨網路、stage 在哪被切開 |
| **一個「打開來看」的動作** | 這篇教的東西,讀者回去怎麼在自己的 job 上驗證(印計畫、看 UI、看 watermark) |

## 第一批 — 地基:抽象是什麼

| # | slug | 標題 | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `spark-intro` | Apache Spark 是什麼?一篇搞懂分散式資料處理 | **【宣告式】** 定位與 pandas 對照(放不下 / 算不完才需要它);核心概念(partition/task/RDD vs DataFrame);架構圖=Driver 拆 task→Cluster Manager 要資源→Executor 按分區平行跑;**惰性求值**:transformation 只是建計畫、action 才真的跑(圖:read→filter→groupBy 建計畫,`count()` 觸發,groupBy 之間要 shuffle)——shuffle 在這裡第一次登場;反思:大部分人的「大數據」其實沒那麼大(接 `[[pain-before-power]]`)、真正的成本是 shuffle、惰性是雙面刃(錯誤延後到 action 才炸)、維運交給別人 | ✅ 已發布 ★ |
| 2 | `spark-dataframe` | Spark DataFrame 實戰:讀取、轉換、寫出與 Spark SQL | **【宣告式】** 為什麼幾乎都用 DataFrame 不用 RDD(給了結構,Catalyst 才最佳化得動);讀取**明確給 schema**(`inferSchema` 掃兩次);常用轉換像操作一張表;**Spark SQL 與 DataFrame 殊途同歸**(圖:兩條路編成同一個實體計畫,所以效能一樣、挑可讀性就好);寫出用 `partitionBy` 覆寫分區**讓重跑冪等**——接 `[[airflow-scheduling]]`;narrow vs wide 首圖;反思:兩種寫法不要二選一、效能直覺八成回到 shuffle、宣告式的好處是把最佳化交給比你聰明的東西 | ✅ 已發布 |

## 第二批 — 成本與看穿(這系列的核心)

寫作順序上 #6 隔了兩篇才補回來,但它其實是 #3 的下半場:**#3 給成本模型,#6 給看見成本的工具**。閱讀時建議連著看。

| # | slug | 標題 | 主題 | 狀態 |
|---|---|---|---|---|
| 3 | `spark-shuffle` | Spark 效能的本體:shuffle 與調校 | **【資料搬移】** shuffle 為什麼貴(寫磁碟 + 跨網路 + stage barrier 全員等最慢的);圖:narrow 在同一 stage 內串接、碰到 wide 就切新 stage;四招由重要到次要——① 先 filter/select 把資料變小再 shuffle ② **broadcast join**(只複製小表、大表原地 join,CP 值最高,附圖對照 shuffle join)③ `spark.sql.shuffle.partitions` 分區數 ④ AQE 與 `cache/persist`;反思:先想「少 shuffle」再想調參數、別過早最佳化讓 Spark UI 帶你找瓶頸(接 `[[pain-before-power]]`) | ✅ 已發布 ★ |
| 6 | `spark-explain` | 讀懂 Spark 執行計畫:`.explain()` 到底在說什麼 | **【看得見】** 補上前幾篇欠的那塊——一直叫人「相信 Catalyst」「打開 UI 找瓶頸」卻沒教怎麼看;一行 code 的旅程(unresolved→analyzed→optimized logical plan→physical plan,圖:DataFrame 與 SQL 第一步就合流);`.explain()` 各模式怎麼印;**physical plan 由下往上讀**,盯三個字:`Exchange`(=shuffle 在這)、`BroadcastHashJoin`(=小表被廣播了)、`PushedFilters`(=過濾有沒有推到資料源);陷阱:**AQE 會在執行期改計畫**,印出來的只是假設;反思:相信最佳化器 ≠ 不看它做了什麼、看到 Exchange 就該心頭一緊、**explain 是假設、Spark UI 是事實**——接 `[[spark-shuffle]]`、`[[sql-explain]]`(單機 PG 的同一課)、`[[pain-before-power]]` | ✅ 已發布 ★ |

## 第三批 — 跑起來與串流

| # | slug | 標題 | 主題 | 狀態 |
|---|---|---|---|---|
| 4 | `spark-running` | 把 Spark 跑起來:從本機到叢集與 managed 平台 | **【宣告式 + 看得見】** 執行架構三角(Driver 要資源、Cluster Manager 起 Executor、之後 Driver 直接派 task,圖);本機 PySpark 起手;`spark-submit` 最小骨架;**`client` vs `cluster`:Driver 到底跑在哪**——最常見的坑(本機 client 模式抓 log 方便、正式環境 cluster 模式才不會被你的筆電綁架);Cluster Manager 四種與現況;managed 平台(Databricks / EMR / Glue)何時直接買;反思:最漂亮的抽象是**程式碼跟跑在哪解耦**、別為了用 Spark 而架叢集(接 `[[pain-before-power]]`)——維運面交給 `[[infra-spark]]`、在 k8s 上的 pod 生命週期看 `[[airflow-spark-on-k8s]]` | ✅ 已發布 |
| 5 | `spark-streaming` | Structured Streaming 入門:把串流當成一張無界的表 | **【宣告式 + 看得見】** 招牌抽象:串流 = 一張不斷在尾端 append 的**無界表**,同一個批次查詢套上去、Spark 增量重算(圖);最小串流程式跟批次幾乎一樣;三個串流才有的新問題——① Output Mode(每次輸出什麼)② **event time + watermark**(遲到的資料算不算、狀態什麼時候能丟)③ checkpoint(崩了怎麼接回來);micro-batch 其實是「很快的批次」,對照 Kafka Streams 的逐筆模型;反思:無界表是我看過最高明的抽象之一、難點不在 API 而在 event time 與遲到、**不是所有「即時」都需要串流**——接 `[[kafka-ecosystem]]`、`[[kafka-delivery]]`、`[[airflow-scheduling]]`(批次 vs 串流的界線) | ✅ 已發布 |

## 主幹已完成(1–6)

六篇把主軸走完一輪:**抽象(1、2)→ 成本(3)→ 看穿(6)→ 部署(4)→ 把同一套抽象推到串流(5)**。系列可以就此收在完整狀態,不必為了湊數字硬開新篇。

## 候補(缺了不影響完整性,依需要再挑)

- `spark-pitfalls` — **常見坑與除錯**:data skew(熱鍵 salting)、OOM(driver `collect()` vs executor 記憶體)、small files、broadcast 上限。原本排在 #6 選配,位置被 `spark-explain` 頂掉。真要寫,定位必須是**「症狀 → 病因」的現場對照表 + Spark UI 實戰**,才跟前面分得開:#3 給成本模型、#6 給計畫、這篇給**現場長什麼樣**。
- **表格式 / lakehouse(Delta、Iceberg)** — 開之前先想清楚跟 `[[medallion-architecture]]`、`[[fode-6]]` 的分工;很可能該長在資料架構那條線,不是 Spark 系列。
- **Spark SQL vs Trino vs Cloudberry 的引擎對照** — 與 `[[sql-mpp]]` 重疊大,傾向留在 SQL 系列收,這裡最多在 #6 補一句對照。

紀律:候補一篇都不寫也沒關係。**補一篇不如把跨系列的連結補好**——這系列的價值有一半長在 Kafka / Airflow / SQL / Infra 的交會處。

## 建議閱讀順序
1. **地基**(1→2):先有「惰性 + 分區 + 宣告式」的心智模型,後面才不是背 API。
2. **成本與看穿**(3→6):shuffle 是這系列的本體;讀完 3 直接接 6,把成本從「聽說很貴」變成「在計畫裡看得到 `Exchange`」。
3. **跑起來**(4):知道 job 在哪跑、`deploy-mode` 的坑,才有辦法自己驗證前面學的東西。
4. **串流**(5):把同一套宣告式抽象推到無界資料,順勢接回 Kafka 那條線。

## 術語表(Ubiquitous Language)

工具系列:API 名稱、設定鍵、CLI 參數**一律不譯**(照原文寫)。這張表管的是「用中文寫的那些概念」怎麼統一。

全系列同一個概念只准一個中文寫法;英文欄是翻譯時直接照抄的來源。
寫到表上沒有的術語就補一列。跨系列共用的通用詞(快取、佇列、可觀測性)在
`docs/ubiquitous-language.md`(全站術語表),這裡只放本系列特有的。

| 中文用詞 | 英文 | 備註 |
|---|---|---|
| 轉換 / 動作 | transformation / action | RDD 章的分界;惰性求值 = lazy evaluation |
| 分區 | partition | 與 Kafka / DDIA 對齊 |
| shuffle | shuffle | 不譯;「分散式運算的房租」 |
| 寬相依 / 窄相依 | wide / narrow dependency | |
| 資料傾斜 | data skew | 不寫「資料歪斜」 |
| broadcast join | broadcast join | 不譯成「廣播連接」 |
| 執行計畫 | execution plan | `.explain()` 印出來的東西 |
| 最佳化器 | Catalyst optimizer | 「相信最佳化器」不等於「不看它做了什麼」 |
| 自適應查詢執行 | adaptive query execution (AQE) | 會在執行期改計畫 |
| 驅動程式 / 執行器 | driver / executor | 內文多直接用 driver / executor |
| 部署模式 | deploy mode | `client` vs `cluster`,值照原文 |
| 無界表 | unbounded table | 「串流即無界表」是系列招牌抽象,措辭固定 |
| 微批次 | micro-batch | 與 FoDE 的批次 / 微批次 / 串流光譜對齊 |
| 水位線 | watermark | 遲到資料怎麼算 |
| 檢查點 | checkpoint | 崩潰了怎麼接回來 |
| 輸出模式 | output mode | append / update / complete 值照原文 |

## 寫每篇時的慣例
- front matter:`series: "Spark 學習筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`spark` + `data-engineering` + 該篇主題(如 `pyspark`、`performance`、`deployment`、`stream-processing`)。
- 依 `.claude/skills/writing-blog-post`:一張招牌深色 SVG + 比官方文件更清楚的摘要 + 一段真實反思。
- SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號;figcaption 內不放 `[[wikilink]]`,要連結用 `<a href>`。
- 台灣用語(見 `docs/zh-tw-style-guide.md`;數據/依賴/函式 等保留不換)。
- **每篇附最小可跑的 PySpark / Spark SQL 片段**(見〈每篇的程式碼與圖〉),不逐一抄參數表。
- **貫穿主軸**:每篇結尾扣回「**你只說要什麼,Spark 決定怎麼做——但帳單是資料搬移在付**」,並確認這篇服務的是 **【宣告式】/【資料搬移】/【看得見】** 哪一項(表格的 **【】** 標記就是這個用途)。
- **cross-link 是重點**:效能/計畫 ↔ `[[sql-explain]]`、`[[sql-index]]`;串流來源與語義 ↔ `[[kafka-ecosystem]]`、`[[kafka-delivery]]`;排程與冪等重跑 ↔ `[[airflow-scheduling]]`、`[[airflow-reliability]]`;維運與 k8s ↔ `[[infra-spark]]`、`[[airflow-spark-on-k8s]]`;原理 ↔ `[[ddia-batch]]`、`[[ddia-streaming]]`;先確認痛點 ↔ `[[pain-before-power]]`。
- Git:開 branch → push → PR,不直接動 master(CLAUDE.md 硬規矩)。

## 修訂紀錄
- **2026-08-27**:roadmap 補上定位 / 差異化 / 貫穿主軸 / 分批 / 建議閱讀順序;主題欄依已發布內容回填成定稿骨架。**更正**:`spark-explain`(`seriesOrder: 6`,2026-07-07 發布)先前漏記在表上,原表 #6 的 `spark-pitfalls` 已移進候補區。
