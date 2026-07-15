# Google SRE 讀書筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Google SRE 讀書筆記"`。
書:*Site Reliability Engineering: How Google Runs Production Systems*(Beyer, Jones, Petoff, Murphy;O'Reilly 2016)。全書免費線上版:sre.google/books。

**收全部 34 章,但按投報率排序**:能遷移到任何團隊的核心觀念先寫(第一、二批),Google 規模 / 管理 / 較 niche 的章節移到後面(第三、四批)再寫。多個相關章節會併成一篇,不逐章翻譯。

定位:**不獵奇「Google 怎麼做」,而是提煉能遷移的觀念**——SRE 把「維運」從救火英雄主義,變成有指標、有預算、可工程化的學科。每篇一張招牌圖 + 一段 backend lead 視角的反思。

邊讀邊寫:寫好一篇 → `draft: true` 改 `false` 發佈。草稿狀態的系列文正式站不出現在系列盒(走 `getPublishedPosts()`),`npm run dev` 看得到。跨篇 / 跨系列用 `[[slug]]` 互連。

`seriesOrder` = 寫作優先序(不是書本章節序)。

## 第一批 — 核心地基(先寫,優先)

| # | slug | 對應章 | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `sre-intro` | Ch 1, 3 (Ch 2 當背景) | SRE 是什麼、用軟體工程做維運;擁抱風險;100% 不是目標;**Error Budget** 把「快 vs 穩」變成數學 | ✅ 已發布 |
| 1.5 | `sre-vs-devops` | 補充(非章節) | DevOps vs SRE:class SRE implements interface DevOps;介面(原則)vs 實作(做法);原則→做法對照;假對立 | ✅ 已發布 |
| 2 | `sre-slo` | Ch 4 | SLI / SLO / SLA 的骨架;error budget = 1 − SLO;SLA<SLO≤SLI 與安全 buffer;好的 SLI = 好事件/有效事件 | ✅ 已發布 |
| 3 | `sre-toil` | Ch 5 | toil 六特徵;隨規模線性成長的陷阱與惡性循環;50% 護欄;自動化 ROI(不是全砍) | ✅ 已發布 |
| 4 | `sre-monitoring` | Ch 6 | 四個黃金訊號(latency / traffic / errors / saturation);別看平均看 p99;症狀 vs 原因、黑箱 vs 白箱 | ✅ 已發布 |
| 5 | `sre-alerting-oncall` | Ch 10, 11 | 告警三級 Page/Ticket/Log;症狀 vs 原因;error budget burn rate 告警;on-call 止血優先、runbook、自我改善迴圈 | ✅ 已發布 |
| 6 | `sre-troubleshooting` | Ch 12 | 反模式(換零件);Triage→Examine→Diagnose→Treat;分而治之/二分定位;一次改一個變因、相信資料別猜 | ✅ 已發布 |
| 7 | `sre-postmortem` | Ch 15 | Blameless(對事不對人):究責 vs 良性循環;人不是 root cause(誤刪 DB 例);blameless≠不負責、action item 具體 | ✅ 已發布 |

## 第二批 — 事件與可靠度實務

| # | slug | 對應章 | 主題 | 狀態 |
|---|---|---|---|---|
| 8 | `sre-incident-response` | Ch 13, 14, 16 | 敵人是混亂;ICS 角色(IC/Ops/Comms/Scribe)、IC 不動手;早宣告、共同管道、handoff、演練、追蹤 outage | ✅ 已發布 |
| 9 | `sre-testing` | Ch 17 | 測試金字塔(底多上少)、倒金字塔反模式;綠燈≠生產健康 → canary 用真實流量;設定/災難演練;flaky test = 狼來了 | ✅ 已發布 |
| 10 | `sre-cascading-failures` | Ch 21, 22 | 連鎖失效骨牌 + retry storm 正回饋、thundering herd;過載主動保護:load shedding/degradation/backpressure、circuit breaker;扣回 Kafka 背壓 | ✅ 已發布 |
| 11 | `sre-data-pipelines` | Ch 25, 26 | 週期性管線的積壓陷阱、資料新鮮度 SLA、冪等可重跑;資料完整性深度防禦(軟刪除/備份+還原演練/早期偵測);「有備份」≠「能還原」= 薛丁格的備份——收回 DE 系列 | ✅ 已發布 |

## 第三批 — 進階 / 深水區(後面再寫)

| # | slug | 對應章 | 主題 | 狀態 |
|---|---|---|---|---|
| 12 | `sre-automation-release` | Ch 7, 8, 9 | 自動化演進階梯(終點=把人從迴圈拿掉)、blast radius 的兩面刃;發布工程四原則、hermetic build 可重現;簡單性=可靠度來源、「每行程式都是負債」 | ✅ 已發布 |
| 13 | `sre-load-balancing` | Ch 19, 20 | 兩層負載平衡(前端選機房 DNS/Anycast/VIP、機房內選機器);Round Robin 三個錯假設、平均分配≠平均負載;failure attracts traffic 陷阱;subsetting、lame duck 優雅退場 | ✅ 已發布 |
| 14 | `sre-consensus` | Ch 23 | 管理關鍵狀態:split brain(土砲選 leader 的死法)、多數決 quorum(任兩過半必重疊、2f+1 容忍 f、奇數)、safety vs liveness、replicated log;三種實作對照 Paxos/Raft/Zab(領導模型 × 好不好懂);別自己造輪子(etcd/ZooKeeper/KRaft) | ✅ 已發布 |
| 14.5 | `sre-onboarding-inhouse` | 補充(非章節,實戰) | SRE 空降「全自建」公司前 90 天:trace 一個請求走完全程、Grafana LGTM 全家桶看可觀測性、從零重建環境逼出隱藏依賴、先理解後動手的節奏 | ✅ 已發布 |
| 15 | `sre-cron` | Ch 24 | 可靠的 cron:單機=SPOF、分散式難在「跑過沒」的狀態要靠共識(Paxos)存;崩潰空窗 → 跳過 vs 重複無 exactly-once、冪等是逃生門;午夜 thundering herd 加 jitter——接 `[[airflow-scheduling]]`、`[[sre-consensus]]` | ✅ 已發布 |
| 16 | `sre-swe-launches` | Ch 18, 27 | SRE 裡的軟體工程、可靠的產品發表(launch checklist) | ⬜ |

## 第四批 — 管理與文化(最後)

| # | slug | 對應章 | 主題 | 狀態 |
|---|---|---|---|---|
| 17 | `sre-management` | Ch 28, 29, 30 | 帶新人上 on-call、處理中斷(interrupt)、拯救過載的團隊 | ⬜ |
| 18 | `sre-collaboration` | Ch 31, 32 | 溝通協作、演進中的 SRE 合作模式 | ⬜ |
| 19 | `sre-lessons` | Ch 33, 34 | 借鏡其他產業、全書結語 | ⬜ |

★ = 投報率最高(1、2、4、7、10、11)。第一批七篇是地基,優先寫;第三、四批依興趣調順序。34 章全數涵蓋(部分併篇)。

## 寫每篇時的慣例
- front matter:`series: "Google SRE 讀書筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`sre` + 該篇主題(如 `reliability`、`monitoring`、`incident`、`culture`)。
- 依 `.claude/skills/writing-blog-post`:摘要比原書更清楚 + 一段真實反思;台灣用語(見 `docs/zh-tw-style-guide.md`)。
- 每篇一張以上站台深色 SVG(SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號)。
- 跨系列連結是重點:error budget/可逆性 ↔ `[[pain-before-power]]`;連鎖失效/背壓 ↔ Kafka、Spark;資料完整性/pipeline ↔ FoDE、Airflow;blameless/文化 ↔ 成為 Tech Leader。
