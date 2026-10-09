# Competitive Programmer's Handbook 讀書筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Competitive Programmer's Handbook 讀書筆記"`。
書:*Competitive Programmer's Handbook*(Antti Laaksonen;自出版,持續更新版,前言署 2019-08),簡稱 CPHB。線上 PDF:<https://cses.fi/book/book.pdf>;LaTeX 原始檔:<https://github.com/pllk/cphb>(CC BY-NC-SA 4.0);練習題:CSES Problem Set <https://cses.fi/problemset/>。印刷擴充版為 *Guide to Competitive Programming*(Springer)。

> 2026-10-09 規劃時,sandbox 連不到 cses.fi(proxy 擋),章節結構取自 `pllk/cphb` 的 `chapter01–30.tex`(與 PDF 同源)。

定位:**每一個更快的解法,都是看出了一個暴力解沒用上的結構——這個系列把競賽技巧當成「看結構」的訓練,再把每個結構帶回 Production 找它的真身。** 網路上 CPHB 筆記和題解一抓一大把,本站憑的是三件別人給不出的東西:

1. **上班對照**:每篇固定一段「這招在哪裡上班」,接到站內已經寫過的系統——拓撲排序就是 Airflow 排 task 的方式、雙指標就是 sort-merge join、Fenwick / 前綴和就是 SQL window function 的累計、背包問題就是 rezero 那篇「最優惠組合是 NP-hard 嗎?」。站內 180 多篇是這個系列最大的槓桿。
2. **工程師 / EM 視角**:誠實回答「後端工程師到底用不用得到線段樹」——大部分用不到,但**估算複雜度、辨認問題屬於哪一類(尤其辨認 NP-hard 然後停手)**每天都在用。招人的角度也講:演算法面試在量什麼、沒量到什麼。
3. **2026 年為什麼還學這個**:AI 寫得出 CSES 的 AC 解,但「它給的解在 n = 10^5 時會不會 TLE」「這個 greedy 對不對」是驗收問題——接 `[[ai-review-craft]]`:你看不出結構,就沒辦法 review AI 給的演算法。

4. **能親手操作的逐步動畫**(2026-10-09 作者定案,本系列的招牌):每篇都有具體的例子,核心演算法做成**可以一步一步播放的動畫**——讀者能前進、後退、自動播放、拖進度條、改輸入重跑。靜態圖只能給結論,動畫讓讀者看見「暴力解浪費的那一步,快解法是怎麼省下來的」。這是紙本書和題解站給不出的東西。

**罩門(寫成紀律)**:
- **別寫成又一份題解 / 教科書翻譯**。原書已經很精簡,摘要要比原書更清楚(一張圖講清楚一個模型),證明只留直覺,形式證明指回原書。
- **上班對照不准硬湊**。對不上真實系統的章(Nim、騎士巡邏、Burnside)就誠實寫「這招在工作上幾乎不會遇到,學它是為了 X」,不要編一個假的 Production 場景。
- **動畫不是裝飾**。每一個 frame 的說明文字都要回答「這一步在做什麼、為什麼」,不是只把變數值換掉;動畫跑完,讀者應該能自己講出演算法。
- **反思必須是真的**。作者自己的刷題經驗、面試經驗、工作上真的用到的那次——動筆前先跟作者確認,沒有就不寫,不腦補。

**與既有系列的關係(差異化 / cross-link 分工)**:
- ↔ **Redis 學習筆記**(`[[redis-data-structures]]`):那邊講 Redis 提供哪些資料結構與用法;這裡講那些結構底下的演算法(有序集合 ↔ 平衡樹 / skip list 的複雜度、Bitmap ↔ 位元運算、HyperLogLog ↔ 機率)。不重講 Redis 指令。
- ↔ **DDIA 讀書筆記**(`[[ddia-storage-engines]]`、`[[ddia-batch]]`):那邊講「資料系統為什麼長這樣」;這裡只在演算法層補一刀(SSTable 合併 = 雙指標 merge、sort-merge join、Bloom filter 的誤判率),不重講儲存引擎。
- ↔ **SQL 我以為我懂**(`[[sql-window]]`、`[[sql-gaps-islands]]`、`[[sql-index]]`):那邊講 SQL 怎麼寫、優化器怎麼跑;這裡講前綴和 / 區間查詢 / 二分搜尋的演算法本體,SQL 篇是它們的「上班版」。
- ↔ **Airflow / Jenkins**(`[[airflow-first-dag]]`、`[[airflow-scheduling]]`、`[[jenkins-pipeline-advanced]]`):那邊講工具怎麼用;這裡講 DAG、拓撲排序、環偵測的演算法——為什麼 Airflow 拒絕有環的 DAG。
- ↔ **Re:從零開始做直播代購電商平台**(`[[rezero-promotion]]`、`[[rezero-permission]]`、`[[rezero-inventory]]`):那邊是戰爭故事;這裡在 DP / 位元 / 複雜度篇引用那些場景當「上班對照」,不重講事故。
- ↔ **站外小品**(`[[travel-split]]`、`[[lottery]]`):分帳的「最少筆數還款」貪婪法 → 貪婪篇的實例(以及它為什麼不是最優解);抽籤的 Fisher–Yates → 排列生成 / 隨機演算法篇的實例。
- ↔ **帶 AI 的手藝(2026)**(`[[ai-review-craft]]`):那邊講怎麼驗收 AI 的 code;這裡第 1 篇與收尾篇各扣一次「看得出結構,才驗得了 AI 的解」。不在每篇重複。
- ↔ **K8s**(`[[k8s-pod-node-scheduler]]`):scheduler 的 bin packing 在貪婪篇當「greedy 夠用就好」的例子,一句帶過。

**貫穿主軸**:**更快的解法,來自看出暴力解沒用上的結構。** 拆成可檢查的結構標記,章節表註明每篇主要在練哪一種:
- **【單調】** 答案或指標只往一個方向走(二分搜尋、雙指標、滑動視窗、單調堆疊)
- **【重疊】** 子問題重複出現,算一次存起來(DP、樹 DP、DAG 上的 DP)
- **【可合併】** 結果能由兩半合起來(前綴和、Fenwick、線段樹、併查集、矩陣乘法)
- **【順序】** 存在一個處理順序讓問題變簡單(排序、拓撲排序、掃描線、離線處理)
- **【交換】** 換一個角度 / 換一個問題(貪婪的交換論證、最大流 = 最小割、補集計數、曼哈頓距離旋轉)
- **【極限】** 結構不存在——辨認出 NP-hard / 只能暴力,然後用剪枝、折半、近似止損

呈現方式:**每篇開頭先給暴力解,再問「它浪費了什麼」**,快解法就是把那份浪費撿回來;結尾點名用到哪個標記。不用口號重複。

**涵蓋範圍與併篇**:全書 3 Part / 30 章全數涵蓋;以「一篇講清楚一個模型」為準併成 **28 篇**(Ch1+2 併、Ch11+12 併,其餘一章一篇)。Ch1 的 C++ 語法、輸入輸出、比賽資源只取「估算」相關的部分,其餘略。

`seriesOrder` = 寫作順序 = **書本章節序**——演算法前後依賴很硬(位元 DP 要先有 DP、樹查詢要先有樹與 DFS),所以這個系列不按投報率重排。★ = 骨架篇 / 上班對照最豐富(1、6、7、8、14、18)。邊讀邊寫:`draft: true` → `false`。

## 第一批 — Basic techniques:看出結構的基本功(Part I,Ch1–10)

| # | slug | 章 | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|---|
| 1 | `cphb-complexity` | Ch1–2 Introduction / Time complexity | 看到 n,就知道該寫什麼 | 系列開場:競賽 = 看結構的訓練、本系列的三個承諾(上班對照/EM 視角/AI 時代)。複雜度計算規則;**從 n 反推可接受的複雜度**(n ≤ 10 → n!、≤ 20 → 2^n、≤ 10^5 → n log n、≤ 10^6 → n)= 工程上的 back-of-the-envelope;最大子陣列和 O(n³) → O(n²) → O(n)(Kadane)當全系列的範本:暴力解浪費了什麼。招聘角度:演算法面試在量什麼。【單調】【重疊】起手 —— 接 `[[sre-production-readiness]]`(容量估算)、`[[ai-review-craft]]`、`[[sql-explain]]` | ⬜ ★ |
| 2 | `cphb-sorting` | Ch3 Sorting | 排序是最便宜的結構 | O(n log n) 下界(比較排序的決策樹)與 counting sort 的例外;**排序本身就是在製造結構**(排好之後找重複、找配對都變線性);C++ `sort` / 自訂比較子的嚴格弱序陷阱;二分搜尋三種寫法 + **對答案二分**(單調判定函數)。上班:`git bisect`、B-tree 索引的 range scan、SSTable 為什麼要排序。【順序】【單調】 —— 接 `[[sql-index]]`、`[[ddia-storage-engines]]` | ⬜ |
| 3 | `cphb-data-structures` | Ch4 Data structures | 選容器就是選複雜度 | vector 攤銷倍增、deque、`set`/`map`(平衡樹,有序、log n)vs `unordered_*`(雜湊,平均 O(1)、最壞與被攻擊時退化)、`priority_queue`、bitset;**Comparison to sorting:很多時候先排序比用 set 更快**(常數與快取友善)。上班:Redis Sorted Set、有序 vs 雜湊索引、hash flooding。可選:Kotlin `TreeMap`/`HashMap` 對照 —— 接 `[[redis-data-structures]]`、`[[sql-index]]` | ⬜ |
| 4 | `cphb-complete-search` | Ch5 Complete search | 暴力也要暴力得有章法 | 產生子集(遞迴 / 位元)、產生排列(`next_permutation`)、回溯(n 皇后)、**剪枝**(格子路徑計數的五刀)、**折半搜尋**(2^n → 2^(n/2))。主軸的【極限】:當結構不存在時怎麼止損。上班:Fisher–Yates 洗牌(lottery)、組合爆炸的設定測試 —— 接 `[[lottery]]`、`[[rezero-promotion]]` | ⬜ |
| 5 | `cphb-greedy` | Ch6 Greedy algorithms | 貪婪什麼時候是對的 | 硬幣問題(某些幣值系統 greedy 失效)、活動排程(選最早結束)、任務與截止期限、最小化總和(中位數/平均數)、Huffman 編碼;**交換論證**是證明 greedy 的唯一工具。上班:分帳的最少筆數還款(greedy 給 ≤ n−1 筆,但真正最少筆數是 NP-hard——「夠用就好」的判斷)、K8s scheduler 的 bin packing —— 接 `[[travel-split]]`、`[[k8s-pod-node-scheduler]]` | ⬜ |
| 6 | `cphb-dp` | Ch7 Dynamic programming | DP 是把暴力解記下來 | 從遞迴暴力出發 → 記憶化 → 迭代:**定義狀態是唯一的難點**;硬幣問題(最少數 vs 方法數)、LIS(n² 與 n log n)、格子路徑、背包、編輯距離、鋪磚計數(輪廓 DP)。上班:rezero 的優惠組合最佳化(背包 / NP-hard 的真實版本)、編輯距離 ↔ diff、模糊搜尋。【重疊】的主場 —— 接 `[[rezero-promotion]]`、`[[cphb-complete-search]]` | ⬜ ★ |
| 7 | `cphb-amortized` | Ch8 Amortized analysis | 平均下來是線性的 | 攤銷分析的直覺(總移動次數有上限);雙指標(子陣列和、2SUM)、最近較小元素(單調堆疊)、滑動視窗最小值(單調 deque)。上班:sort-merge join 與 SSTable 合併就是雙指標、滑動視窗限流、Prometheus 的區間函數、vector 倍增的攤銷 O(1)。【單調】的主場 —— 接 `[[ddia-batch]]`、`[[sql-joins]]`、`[[ddia-storage-engines]]`、`[[obs-metrics-prometheus]]`、`[[sre-cascading-failures]]` | ⬜ ★ |
| 8 | `cphb-range-queries` | Ch9 Range queries | 先算好一半,查詢就是減法 | 靜態:前綴和(一維、二維)、sparse table(min 查詢 O(1));動態:Fenwick tree(BIT)、線段樹;差分陣列等附加技巧。核心:**能合併(結合律)才能拆區間**,可逆(加法)才能用前綴相減。上班:SQL window function 的累計、時序資料的 rollup / downsampling、gaps-and-islands —— 接 `[[sql-window]]`、`[[sql-gaps-islands]]`、`[[obs-metrics-prometheus]]` | ⬜ ★ |
| 9 | `cphb-bits` | Ch10 Bit manipulation | 一個整數就是一個集合 | 二補數、位元運算、`__builtin_popcount`;用整數表示集合(聯集 = OR、子集列舉);bitset 優化(漢明距離、/64 常數);**子集 DP**(旅行推銷員 n·2^n、SOS DP)。上班:Redis Bitmap / BITCOUNT、權限 bitmask、Bloom filter 的位元陣列 —— 接 `[[redis-data-structures]]`、`[[rezero-permission]]`、`[[cphb-dp]]` | ⬜ |

## 第二批 — Graph algorithms:關係本身就是結構(Part II,Ch11–20)

| # | slug | 章 | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|---|
| 10 | `cphb-graph-traversal` | Ch11–12 Basics of graphs / Graph traversal | 先把問題畫成圖 | 圖的術語與三種表示法(鄰接串列 / 鄰接矩陣 / 邊串列,各自的成本);DFS、BFS;應用:連通性、找環、二分圖判定。**本批的核心技能是「建模」:把格子、狀態、相依關係畫成圖**。上班:服務相依圖、網路拓撲、爬蟲 —— 接 `[[infra-intro]]` | ⬜ |
| 11 | `cphb-shortest-paths` | Ch13 Shortest paths | 最短路三兄弟,各有不能碰的邊 | Bellman–Ford(負邊、負環偵測)、Dijkstra(非負邊、為什麼負邊會壞)、Floyd–Warshall(全點對、n³);選哪個看 n、m 與邊權。上班:路由協定(OSPF = Dijkstra、距離向量 = Bellman–Ford)、匯率套利 = 負環 —— 接 `[[cphb-graph-traversal]]` | ⬜ |
| 12 | `cphb-trees` | Ch14 Tree algorithms | 樹是沒有環的好脾氣圖 | 樹的遍歷、直徑(兩次 DFS / 樹 DP)、所有最長路徑(換根 DP)、二元樹的前中後序。【重疊】在樹上的版本 —— 接 `[[cphb-dp]]` | ⬜ |
| 13 | `cphb-spanning-trees` | Ch15 Spanning trees | 併查集:最便宜的「是不是同一群」 | Kruskal(排序 + 併查集)、併查集的路徑壓縮與按大小合併(近乎 O(1))、Prim(像 Dijkstra)。上班:分群 / 去重(同一使用者的多個帳號歸戶)、網路佈線成本 —— 接 `[[rezero-identity]]`、`[[cphb-shortest-paths]]` | ⬜ |
| 14 | `cphb-dag` | Ch16 Directed graphs | 為什麼 Airflow 不准你畫環 | 拓撲排序(DFS 後序 / Kahn)、DAG 上的 DP(路徑計數、最長路)、後繼路徑(functional graph、倍增跳 k 步)、Floyd 判圈(龜兔)。**有環就沒有拓撲序**——工作流引擎、建置系統、套件管理器拒絕循環相依的理由。【順序】的主場 —— 接 `[[airflow-first-dag]]`、`[[airflow-scheduling]]`、`[[jenkins-pipeline-advanced]]`、`[[cphb-dp]]` | ⬜ ★ |
| 15 | `cphb-scc` | Ch17 Strong connectivity | 把環縮成一個點 | Kosaraju 演算法(兩次 DFS)、縮點後得到 DAG;2SAT(蘊含圖 + SCC)。上班:死結偵測(等待圖)、循環相依的模組要怎麼拆 —— 接 `[[cphb-dag]]`、`[[ddia-transactions]]` | ⬜ |
| 16 | `cphb-tree-queries` | Ch18 Tree queries | 把樹攤平成陣列 | 找第 k 個祖先(倍增)、子樹與路徑查詢(Euler tour 把子樹變成連續區間 → 接區間查詢)、LCA 三種做法、離線演算法(小到大合併、離線 LCA)。【順序】+【可合併】 —— 接 `[[cphb-range-queries]]`、`[[cphb-trees]]` | ⬜ |
| 17 | `cphb-paths-circuits` | Ch19 Paths and circuits | 長得一樣,難度天差地遠 | 歐拉路徑(看度數就知道、Hierholzer 線性)vs 哈密頓路徑(NP-hard、只能位元 DP)——**同樣問「走過每個 X 一次」,邊與點差一個字就從 P 掉到 NP-hard**;De Bruijn 序列、騎士巡邏(Warnsdorf 啟發法)。【極限】的範例篇。上班對照誠實寫:很少見,學它是為了練「辨認難度」 —— 接 `[[cphb-bits]]` | ⬜ |
| 18 | `cphb-flows` | Ch20 Flows and cuts | 最大流等於最小割 | Ford–Fulkerson / Edmonds–Karp、**最大流 = 最小割**(對偶:要送多少就要砍多少);不交路徑、二分圖最大匹配(Kőnig 定理)、路徑覆蓋(Dilworth)。【交換】的主場。上班:系統裡最少砍幾條線會斷開(可靠度的反面)、工作指派、配對 —— 接 `[[sre-load-balancing]]`、`[[cphb-graph-traversal]]` | ⬜ ★ |

## 第三批 — Advanced topics:數學與進階結構(Part III,Ch21–30)

| # | slug | 章 | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|---|
| 19 | `cphb-number-theory` | Ch21 Number theory | 模運算:讓大數字乖乖待在 64 位元裡 | 質數與因數(篩法、試除到 √n)、模運算(快速冪、費馬小定理求反元素)、解方程(擴展歐幾里得、中國剩餘定理)、Wilson 等其他結果。上班:雜湊 mod 質數、RSA 的骨架、`hash % N` 分區 —— 接 `[[redis-cluster]]`、`[[ddia-partitioning]]` | ⬜ |
| 20 | `cphb-combinatorics` | Ch22 Combinatorics | 數得出來,就不用列舉 | 二項式係數(帕斯卡、模反元素算 nCk)、Catalan 數(括號序列)、排容原理(錯排)、Burnside 引理(旋轉等價的計數)、Cayley 公式。【交換】:補集計數、對稱性 —— 接 `[[cphb-number-theory]]` | ⬜ |
| 21 | `cphb-matrices` | Ch23 Matrices | 線性遞迴,log n 步走完 | 矩陣運算、**矩陣快速冪**解線性遞迴(費氏數列 O(log n))、圖與矩陣(鄰接矩陣的 k 次方 = 長度 k 的路徑數)。【可合併】(矩陣乘法有結合律)—— 接 `[[cphb-number-theory]]`、`[[cphb-dag]]` | ⬜ |
| 22 | `cphb-probability` | Ch24 Probability | 隨機不是運氣,是工具 | 期望值的線性性、事件與條件機率、隨機變數(幾何分布)、馬可夫鏈、**隨機化演算法**(Monte Carlo vs Las Vegas、快速選擇、圖著色)。上班:HyperLogLog、Bloom filter 誤判率、retry jitter、可重現的隨機(lottery 的 seed) —— 接 `[[redis-data-structures]]`、`[[redis-cache-patterns]]`、`[[lottery]]`、`[[ddia-storage-engines]]` | ⬜ |
| 23 | `cphb-game-theory` | Ch25 Game theory | 必勝態與必敗態 | 遊戲狀態(勝/敗態的遞推)、Nim(XOR = 0 必敗)、Sprague–Grundy 定理(把多個遊戲合成一個)。上班對照誠實寫:幾乎沒有;學它是因為「把狀態分類再遞推」與 DP 同構 —— 接 `[[cphb-dp]]`、`[[cphb-bits]]` | ⬜ |
| 24 | `cphb-strings` | Ch26 String algorithms | 字串比對的三種偷懶法 | 字串術語(前綴、後綴、週期)、trie、**字串雜湊**(多項式雜湊、生日悖論與碰撞機率、雙模數)、Z 演算法(線性找所有出現位置)。上班:自動完成 = trie、內容去重與 rolling hash(rsync / 分塊去重)、log 搜尋 —— 接 `[[cphb-probability]]`、`[[obs-logs-loki]]` | ⬜ |
| 25 | `cphb-sqrt` | Ch27 Square root algorithms | √n:兩種爛解法的中間值 | 平方根分解(分塊)、依大小換演算法(小的暴力、大的另解)、整數分拆、Mo's algorithm(離線排序查詢)。【順序】+【極限】:結構不夠漂亮時的工程折衷 —— 接 `[[cphb-range-queries]]` | ⬜ |
| 26 | `cphb-segment-tree-advanced` | Ch28 Segment trees revisited | 線段樹的進階:延遲、持久、二維 | 延遲標記(區間更新)、動態開點與**持久化線段樹**(只複製改到的那條路徑)、節點存資料結構、二維線段樹。上班:持久化 = 不可變快照(MVCC、Git 物件、copy-on-write)—— 接 `[[cphb-range-queries]]`、`[[ddia-transactions]]`、`[[sql-transactions]]` | ⬜ |
| 27 | `cphb-geometry` | Ch29 Geometry | 外積解決一半的幾何題 | 用複數表示點、外積判斷左右 / 線段相交、多邊形面積(鞋帶公式、Pick 定理)、距離函數(曼哈頓距離旋轉 45° 變 Chebyshev)。【交換】:換座標系 —— 接 `[[cphb-sweep-line]]` | ⬜ |
| 28 | `cphb-sweep-line` | Ch30 Sweep line algorithms | 把二維問題變成一串事件 | 交點計數(事件 + Fenwick)、最近點對(n log n)、凸包(Andrew 單調鏈)。**掃描線 = 按時間排序的事件處理**。上班:會議室 / 時段重疊、區間合併、事件串流的「同時在線人數」。【順序】收尾篇;全系列完結時扣回第 1 篇與 `[[ai-review-craft]]` —— 接 `[[cphb-range-queries]]`、`[[cphb-geometry]]`、`[[sql-gaps-islands]]` | ⬜ |

## 互動動畫(本系列硬性要求)

### 播放器(已建好)
- 在 markdown 裡插一個 div 就有播放器,沒有 JS 時顯示 div 裡原本的內容:
  ```html
  <div data-algo="kadane" data-input="-1, 2, 4, -3, 5, 2, -5, 2"><p>(互動動畫需要 JavaScript)</p></div>
  ```
- 版面:左邊程式碼(目前執行的那一行會亮起來)、右邊資料視圖 + 變數表,下面一行說明;控制列有 ⇤ ← 播放 → ⇥、進度條、速度(慢 / 中 / 快),以及「改輸入 / 隨機」。鍵盤:← → 逐步、空白鍵播放;手動操作會自動暫停,讓讀者自己控制節奏。
- 檔案:
  - `src/lib/algo/<name>.mjs` — **frame 產生器**(純函式,可測試):`frames(input, lang)` 回傳每一步的 `{ line, note, array, cursor, ranges, vars }`;另外提供 `code`、`defaultInput`、`parseInput`、`randomInput`、`legend`。說明文字中英兩份,英文翻譯直接共用同一個動畫。
  - `src/lib/algo/registry.mjs` — `data-algo` 名稱 → 模組,登記一行。
  - `src/lib/algo/player.mjs` — 原生 DOM 播放器(不用 React,理由同站內搜尋:不為一個元件下載 react-dom)。
  - `src/components/AlgoPlayers.astro` — 只在內文有 `data-algo=` 的文章載入;捲到附近才下載播放器與演算法模組。
  - `test/algo-<name>.test.mjs` — **每個動畫都要有測試**:最後一個 frame 的答案要跟暴力解對拍(隨機輸入跑幾百次),frame 之間的不變量要成立(例如 Kadane 每一步 current 區間的和 = sum)。動畫畫錯比沒有動畫更糟。
- **並排比較**:模組提供 `lanes: [{ title, code }]`,frame 改成 `{ note, lanes: [...] }`,每條 lane 各自畫程式碼、陣列、變數,加上 `meter`(操作次數計數條,各 lane 用同一個 max,長短可以直接比)。適合「暴力解 vs 快解法」這種對照。
- 已完成:
  - `kadane`(#1,CPHB Ch2 的範例輸入)
  - `max-subarray-race`(#1,O(n²) 暴力解與 Kadane 並排,共用同一個時鐘、每步各做一次加法;Kadane 第 8 步做完,暴力解要到第 36 步)

### 視圖類型(依需要逐步加進播放器)
| 視圖 | 用在 | 狀態 |
|---|---|---|
| `array` 陣列 + 游標 + 區間色帶 | 1、2、3、7、8 | ✅(Kadane 已用) |
| `table` 二維 DP 表(格子填值、箭頭指向來源格) | 6、9、20 | ⬜ |
| `bars` 長條(排序、單調堆疊) | 2、7 | ⬜ |
| `tree` 樹 / 遞迴樹(展開、剪枝變灰) | 4、12、16、23、24、26 | ⬜ |
| `graph` 節點與邊(訪問順序、距離標籤、佇列 / 堆疊) | 10、11、13、14、15、17、18 | ⬜ |
| `bits` 位元列 | 9 | ⬜ |
| `plane` 二維平面(點、線段、掃描線) | 27、28 | ⬜ |

每加一種視圖,播放器只多一個 render 函式;frame 的共同欄位(`line`、`note`、`vars`)不變。

### 每篇的例子與動畫規劃
原則:**一篇至少一個動畫**;★ 篇可以有兩個(暴力解 vs 快解法並排,讓讀者看見差在哪)。範例輸入優先用原書的例子,方便讀者對照原書。

| # | 動畫(`data-algo`) | 例子 / 讀者要看見的事 |
|---|---|---|
| 1 | `kadane` ✅;`max-subarray-race` ✅ | 原書陣列 [-1,2,4,-3,5,2,-5,2]:O(n²) 一個一個區間試 vs Kadane 一次掃完,步數計數器並排 |
| 2 | `binary-search`、`counting-sort` | 每一步砍掉一半(剩餘區間縮小);對答案二分的判定函數 |
| 3 | `vector-growth` | 倍增時的搬家次數,攤銷後每次 push 是 O(1) |
| 4 | `subsets-backtrack`、`queens` | 遞迴樹展開;剪枝的分支直接變灰,計數器顯示少走多少 |
| 5 | `activity-selection`、`coin-greedy` | 選最早結束的活動;硬幣 {1,3,4} 湊 6 時 greedy 失敗的反例 |
| 6 | `coin-dp`、`lis`、`edit-distance` | DP 表一格一格填,箭頭指回它用到的格子;回溯出答案 |
| 7 | `two-pointers`、`monotonic-stack`、`sliding-min` | 兩個指標只往右走;單調堆疊的 push/pop |
| 8 | `prefix-sum`、`fenwick`、`segment-tree` | 區間和 = 兩個前綴相減;Fenwick 的 i & -i 跳法;線段樹更新沿路往上 |
| 9 | `bitmask-subsets`、`tsp-dp` | 用整數列舉子集;位元列跟集合同步亮起 |
| 10 | `dfs`、`bfs` | 同一張圖,DFS 用堆疊、BFS 用佇列,訪問順序不同 |
| 11 | `dijkstra`、`bellman-ford` | 距離標籤一路變小;負邊讓 Dijkstra 出錯的反例 |
| 12 | `tree-diameter` | 兩次 DFS 找直徑 |
| 13 | `kruskal-union-find` | 邊照權重排序,併查集合併 / 拒絕成環 |
| 14 | `topo-sort` | Kahn 演算法:入度歸零的節點進佇列;放一條成環的邊,看它卡住 |
| 15 | `kosaraju` | 兩次 DFS、縮點 |
| 16 | `euler-tour`、`binary-lifting` | 子樹攤平成連續區間;往上跳 2^k 步 |
| 17 | `hierholzer` | 歐拉迴路一筆畫完 |
| 18 | `max-flow` | 找增廣路徑、殘餘網路,最後畫出最小割 |
| 19 | `sieve`、`mod-pow` | 篩法一輪一輪劃掉倍數;快速冪看指數的二進位 |
| 20 | `pascal-triangle` | 帕斯卡三角形一層一層加出來 |
| 21 | `matrix-pow` | 費氏數列:矩陣平方 log n 次 |
| 22 | `monte-carlo-pi`、`fisher-yates` | 隨機點估 π;洗牌每一步的交換(接 lottery) |
| 23 | `nim` | 每堆的二進位 XOR,必勝的拿法 |
| 24 | `trie`、`z-algorithm` | trie 一個字一個字長出來;Z 盒子往右推 |
| 25 | `sqrt-blocks`、`mo` | 分塊查詢;Mo 的查詢排序讓指標少走 |
| 26 | `lazy-segment-tree` | 延遲標記往下推的時機 |
| 27 | `cross-product`、`shoelace` | 外積正負 = 左轉右轉;鞋帶公式逐邊累加 |
| 28 | `sweep-line`、`convex-hull` | 掃描線由左往右,事件進出;凸包的單調鏈 |

## 術語表(Ubiquitous Language)

書:*Competitive Programmer's Handbook*(Antti Laaksonen)。**英文欄填原書用字**(邊讀邊記,不要事後回譯)。

全系列同一個概念只准一個中文寫法。跨系列共用的通用詞(快取、佇列、雜湊)在 `docs/ubiquitous-language.md`,這裡只放本系列特有的。台灣用語:陣列不寫數組、程式不寫程序、元件不寫分量。

| 中文用詞 | 英文 | 備註 |
|---|---|---|
| 時間複雜度 | time complexity | Ch2;寫 O(n log n),不寫「時間複雜性」 |
| 暴力解 | brute force / complete search | 全系列主軸用詞;Ch5 的章名 complete search 譯「完全搜尋」 |
| 完全搜尋 | complete search | Ch5 |
| 回溯 | backtracking | Ch5 |
| 剪枝 | pruning | Ch5 |
| 折半搜尋 | meet in the middle | Ch5;不寫「中途相遇」 |
| 貪婪法 | greedy algorithm | Ch6;沿用 `travel-split` 的寫法,不寫「貪心」 |
| 交換論證 | exchange argument | Ch6 證明 greedy 的方法 |
| 動態規劃 | dynamic programming | Ch7;簡稱 DP |
| 記憶化 | memoization | Ch7 |
| 最長遞增子序列 | longest increasing subsequence | Ch7;簡稱 LIS |
| 背包問題 | knapsack problem | Ch7 |
| 編輯距離 | edit distance | Ch7 |
| 攤銷分析 | amortized analysis | Ch8;不寫「均攤」 |
| 雙指標 | two pointers method | Ch8 |
| 最近較小元素 | nearest smaller elements | Ch8;實作是單調堆疊(stack),「堆疊」不寫「棧」 |
| 滑動視窗 | sliding window | Ch8;不寫「滑動窗口」 |
| 區間查詢 | range query | Ch9 |
| 前綴和 | prefix sum | Ch9 |
| 差分陣列 | difference array | Ch9 additional techniques |
| Fenwick tree | binary indexed tree / Fenwick tree | Ch9;寫英文 Fenwick tree(或 BIT),**不寫「樹狀數組」** |
| 線段樹 | segment tree | Ch9、Ch28 |
| 延遲標記 | lazy propagation | Ch28;不寫「懶標記」 |
| 持久化線段樹 | persistent segment tree | Ch28 |
| 子集 DP | dynamic programming over subsets | Ch10 |
| 鄰接串列 / 鄰接矩陣 / 邊串列 | adjacency list / adjacency matrix / edge list | Ch11 |
| 深度優先搜尋 / 廣度優先搜尋 | depth-first search / breadth-first search | Ch12;簡稱 DFS / BFS |
| 二分圖 | bipartite graph | Ch12 |
| 最短路徑 | shortest path | Ch13 |
| 負環 | negative cycle | Ch13 |
| 直徑 | diameter | Ch14 |
| 生成樹 / 最小生成樹 | spanning tree / minimum spanning tree | Ch15 |
| 併查集 | union-find structure | Ch15;不寫「並查集」(台灣用「併」) |
| 拓撲排序 | topological sorting | Ch16 |
| 後繼路徑 | successor paths | Ch16;functional graph 寫英文 |
| 環偵測 | cycle detection | Ch16;不寫「判圈」(Floyd 判圈法的專名除外) |
| 強連通元件 | strongly connected component | Ch17;簡稱 SCC,不寫「強連通分量」 |
| 最低共同祖先 | lowest common ancestor | Ch18;簡稱 LCA |
| 離線演算法 | offline algorithm | Ch18、Ch27 |
| 歐拉路徑 / 哈密頓路徑 | Eulerian path / Hamiltonian path | Ch19 |
| 最大流 / 最小割 | maximum flow / minimum cut | Ch20 |
| 最大匹配 | maximum matching | Ch20 |
| 路徑覆蓋 | path cover | Ch20 |
| 模運算 | modular arithmetic | Ch21 |
| 模反元素 | modular inverse | Ch21 |
| 二項式係數 | binomial coefficient | Ch22 |
| 卡特蘭數 | Catalan number | Ch22 |
| 排容原理 | inclusion-exclusion | Ch22 |
| 矩陣快速冪 | matrix exponentiation | Ch23 |
| 線性遞迴 | linear recurrence | Ch23 |
| 期望值 | expected value | Ch24 |
| 馬可夫鏈 | Markov chain | Ch24 |
| 隨機化演算法 | randomized algorithm | Ch24;Monte Carlo / Las Vegas 寫英文 |
| 必勝態 / 必敗態 | winning state / losing state | Ch25 |
| Grundy 數 | Grundy number | Ch25;Sprague–Grundy 定理寫英文人名 |
| 字典樹 | trie | Ch26;第一次出現寫「trie(字典樹)」,之後寫 trie |
| 字串雜湊 | string hashing | Ch26 |
| 平方根分解 | square root decomposition | Ch27;Mo's algorithm 寫英文 |
| 外積 | cross product | Ch29 |
| 凸包 | convex hull | Ch30 |
| 掃描線 | sweep line | Ch30 |

## 建議閱讀順序
1. **地基**(1→2→3→7):估算、排序、容器、攤銷——工作上最常用、上班對照最多。只想讀四篇就讀這四篇。
2. **兩大思路**(5→6→4):貪婪 vs DP vs 暴力止損,三種「看結構」的態度放在一起讀。
3. **區間與位元**(8→9→26→25):從前綴和一路到線段樹進階與分塊。
4. **圖**(10→11→13→14→15→18):建模 → 最短路 → 併查集 → DAG → SCC → 流;14(DAG)是後端工程師最該讀的一篇。
5. **樹**(12→16):樹 DP 與樹查詢。
6. **數學**(19→20→21→22):模運算、計數、矩陣、機率;22 對後端最有用。
7. **選讀**(17、23、24、27、28):難度辨認、遊戲、字串、幾何與掃描線。

## 寫每篇時的慣例
- front matter:`series: "Competitive Programmer's Handbook 讀書筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`algorithms` + `cphb` + 該篇主題(如 `dynamic-programming`、`graph`、`segment-tree`)。
- 依 `.claude/skills/writing-blog-post`:一張招牌深色 SVG + 比原書更清楚的摘要 + 一段真實反思。演算法篇的 SVG 優先畫「暴力解浪費在哪 → 快解法撿回了什麼」的對照,或資料結構在一次操作中的變化。
- **例子與動畫(硬性要求)**:每篇至少一個具體例子,並把核心演算法做成逐步動畫(見〈互動動畫〉)。先寫 frame 產生器與對拍測試,再寫文章;文章裡先放動畫,再講它為什麼對。div 裡的備用內容放靜態 SVG 或文字說明,讓 RSS、鐵人賽轉貼這些沒有 JS 的地方也看得懂。
- **程式碼範例硬性要求**:每篇至少一段可編譯的 C++(原書語言、CSES 判題語言),只放核心函式,不放競賽模板巨集;能凸顯差異時才加 Kotlin / Python 對照(如 `TreeMap` vs `std::set`、Python 遞迴深度)。
- **CSES 練習**:每篇結尾列 2–3 題 CSES Problem Set 對應題(題名 + 連結),**只列作者實際 AC 過的**;作者踩過的 WA / TLE 是最好的反思素材。
- **每篇固定一段「這招在哪裡上班」**:對得上就接站內文章;對不上就誠實寫「工作上很少見,學它是為了 X」,不准硬湊。
- SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號;figcaption 內不放 `[[wikilink]]`,要連結用 `<a href>`。
- 數學式用 KaTeX(複雜度 `$O(n \log n)$`);證明只留直覺,形式證明指回原書章節。
- 台灣用語(見 `docs/zh-tw-style-guide.md`)。
- 發文前在 Chromium 實際操作過動畫:深淺兩種主題、手機寬度(375px)不出現水平捲動、鍵盤可操作。
- **貫穿主軸**:每篇從暴力解開始、問「它浪費了什麼」,結尾點名用到的結構標記(【單調】【重疊】【可合併】【順序】【交換】【極限】)。
- **cross-link 是重點**:DAG ↔ `[[airflow-first-dag]]`;雙指標 ↔ `[[ddia-batch]]`;前綴和 ↔ `[[sql-window]]`;DP ↔ `[[rezero-promotion]]`;位元 ↔ `[[redis-data-structures]]`;貪婪 ↔ `[[travel-split]]`;第 1 篇與第 28 篇 ↔ `[[ai-review-craft]]`。
- Git:開 branch → push → PR,不直接動 master(CLAUDE.md 硬規矩)。

## 第一篇發布時的註冊(待辦)
- `src/data/series.ts` 加一筆:`slug: 'cphb'`、`name` 與 front matter 一字不差、`enName: "Competitive Programmer's Handbook — Reading Notes"`(同步 `docs/en-translation-glossary.md` A 區)、blurb / enBlurb、color。
- `src/components/Graph.jsx` 的 `SERIES` 加 `["Competitive Programmer's Handbook 讀書筆記", <hue>, 'CPHB']`。
- `src/pages/start.astro`:**待決定放哪一層**——現有的 Domain / Application / Infrastructure / 橫切 / 戰爭故事 / 技術之外都不完全對。傾向在最底層新增「電腦科學地基」,或放進橫切;第一篇發布前跟作者定。

## 動筆前要跟作者確認的素材(2026-10-09 開檔)
- 作者的競賽 / 刷題經歷(有沒有打過比賽、刷過 CSES 幾題、從什麼時候開始)——決定第 1 篇的開場和反思的可信度。
- 工作上**真的**用到演算法的那幾次(例如 rezero 的優惠組合、分帳、抽籤之外還有沒有)。
- 以面試官 / EM 身分出演算法題的經驗與看法(第 1 篇「演算法面試在量什麼」要用)。
- 寫作節奏:邊刷題邊寫(每篇先 AC 對應的 CSES 題)還是先寫完一批再發。
