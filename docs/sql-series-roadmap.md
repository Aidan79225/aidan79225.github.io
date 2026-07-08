# SQL 我以為我懂 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "SQL 我以為我懂"`。

定位:**不寫 SELECT 入門。** 每篇挑一個「大家天天用、但心智模型其實是糊的」概念,用一張圖給出正確機制,順帶把效能講進去 —— 走本站一貫的「把黑箱還原成機制」路線。

基準引擎:**PostgreSQL**(語法標準、`EXPLAIN` 好講、MVCC 是經典教材),需要時附註 MySQL 差異。
兩條主線交織:**破除迷思**(正確模型)+ **DE 日常 analytical pattern**(去重、gaps-and-islands、SCD、時間分桶)。
壓軸轉 **MPP**:前 11 篇單機 PG 打穩,第 12 篇轉 **Greenplum / Apache Cloudberry**,把同一批概念在分散式下重講一次。Cloudberry 定位為「Greenplum 的開源接班人(Apache 孵化)」,語法幾乎與 GP/PG 一致,所以前面的 SQL 全可無痛沿用 —— 這正是這條路線能成立的原因。

邊學邊寫:寫好一篇 → 把該篇 `draft: true` 改成 `false` 發佈。草稿狀態的系列文正式站不會出現在系列盒(走 `getPublishedPosts()`),`npm run dev` 看得到。跨篇用 `[[slug]]` 互連,發佈後 backlinks 自動長出來(效能/計畫類可跨系列連到 Spark)。

## 第一幕 — 破除迷思(單機 PG,你以為你懂)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `sql-execution-order` | 你寫的 SQL 不是照你寫的順序跑 | `FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY→LIMIT`;為何 WHERE 不能用 SELECT 別名、GROUP BY 在 SELECT 之前 | ✅ 已發布 |
| 2 | `sql-joins` | JOIN 的真相:先算笛卡爾積,再過濾 | INNER/LEFT/FULL/CROSS 的列配對格子圖;`LEFT JOIN` 又在 `WHERE` 篩右表=偷偷變 INNER;fan-out | ✅ 已發布 |
| 3 | `sql-null` | NULL 不是值,是「不知道」 | 三值邏輯 TRUE/FALSE/UNKNOWN;`=NULL` 永遠不成立、`NOT IN (含NULL)` 回空、`COUNT(col)` 跳過 NULL、COALESCE/NULLIF/IS DISTINCT FROM | ✅ 已發布 |
| 4 | `sql-group-by` | GROUP BY:把多列收合成一列 | rows→groups 收合;為何不能選沒 group 的欄;聚合忽略 NULL;`HAVING` vs `WHERE`;`ROLLUP`/`CUBE`/`GROUPING SETS` 帶過 | ✅ 已發布 |
| 5 | `sql-window` | Window function:不收合的聚合 | frame 滑動窗(`PARTITION BY`→`ORDER BY`→`ROWS BETWEEN`);`ROW_NUMBER`/`RANK`/`LAG`/累計加總 | ⬜ ★ 壓箱寶 |

## 第二幕 — DE 日常 pattern(analytical SQL)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 6 | `sql-dedup` | 去重的正確姿勢 | `DISTINCT` vs `GROUP BY` vs `ROW_NUMBER`;抓「每組最新一筆」的標準寫法 | ⬜ |
| 7 | `sql-gaps-islands` | Gaps and Islands:連續區間怎麼抓 | 斷點偵測、連續登入天數、把連續區間收成一段;window function 最漂亮的實戰 | ⬜ ★ |
| 8 | `sql-time-scd` | 時間序列與 SCD | `date_trunc`/`generate_series` 補洞分桶;slowly changing dimension type 2 的區間表 | ⬜ |

## 第三幕 — 引擎與效能(為什麼慢)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 9 | `sql-index` | 索引為什麼快 —— 也為什麼失效 | B-tree 查找路徑(有 vs 無 index);複合索引「最左欄」、covering index;`WHERE func(col)` 讓索引失效 | ⬜ ★ |
| 10 | `sql-explain` | 讀懂 EXPLAIN 與 JOIN 演算法 | nested loop / hash / merge join(**cross-link `[[spark-explain]]`**);seq scan vs index scan;怎麼讀 plan | ⬜ ★ |
| 11 | `sql-transactions` | 交易與隔離層級 | 兩條 transaction 時間軸圖;MVCC、dirty/non-repeatable/phantom read、deadlock | ⬜ |

## 第四幕 — 從單機到 MPP(Greenplum / Apache Cloudberry)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 12 | `sql-mpp` | 當 SQL 跑在 MPP 上 | segment、distribution key;分佈鍵選錯 = 資料傾斜 + 跨節點 motion(重分配);把 JOIN/GROUP BY 在分散式下重講,扣回 `[[spark-shuffle]]`、`[[fode-6]]` | ⬜ 壓軸 |

★ = 投報率最高的四篇(5、7、9、10)。第一幕五篇是地基,優先寫;二三四幕可依興趣調順序。

## 寫每篇時的慣例
- front matter:`series: "SQL 我以為我懂"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`sql` + 該篇主題(如 `performance`、`data-modeling`、`window-function`)。
- 依 `.claude/skills/writing-blog-post`:摘要比文件更清楚 + 一段真實反思;台灣用語(見 `docs/zh-tw-style-guide.md`,資料/函式/欄位 等保留不換)。
- 每篇一張以上站台深色 SVG(SVG 內不可有空行);概念圖要能「只看圖就懂大意」。
- 基準 PostgreSQL;跨引擎差異(MySQL / GP / Cloudberry)用附註,不打斷主線。
- 效能/計畫類扣回 `[[spark-explain]]`、`[[spark-shuffle]]`;MPP 收尾扣回 `[[fode-6]]` 運算與儲存分離。
