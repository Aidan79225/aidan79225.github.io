# Infrastructure as Code 讀書筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Infrastructure as Code 讀書筆記"`。
書:*Infrastructure as Code: Designing and Delivering Dynamic Systems for the Cloud Age*(Kief Morris;**3rd ed. 2025**,O'Reilly)。副標多出的 *Designing* 是這版重點:IaC 主流化之後,戰場從「要不要採用」移到「收拾倉促上雲留下的難維護 codebase」。

定位:**backend lead 視角**——工具(Terraform/Ansible/K8s)各自有系列了,這個系列讀的是工具背後**不會過期的原則**:變更成本、爆炸半徑、宣告式思維、pipeline 交付。跟 [[ansible-intro]](工具實作)、[[sre-intro]](可靠性)、[[k8s-intro]] 三條線互相支援。每篇一~兩張招牌圖 + 反思。

邊讀邊寫:寫好一篇 → 開 PR 發佈(本系列目前逐篇直接發佈,不走 draft)。跨篇 / 跨系列用 `[[slug]]` 互連。

注:手邊依第三版閱讀進度逐篇寫;後半部(stacks/servers/delivery/組織)的章節對應與併篇,**讀到時依第三版實際目錄微調**,下表主題先照全書骨架排。

## 第一批 — Foundations(why / 原則 / 平台 / 三個核心實踐)

| # | slug | 對應主題 | 內容 | 狀態 |
|---|---|---|---|---|
| 1 | `iac-intro` | Ch 1 What Is IaC | 鐵器時代→雲時代(變更成本翻轉)、IaC 定義、速度 vs 品質假選擇題(DORA 四指標)、自動化恐懼螺旋、三個核心實踐總覽、第三版新定位 | ✅ 已發布 |
| 2 | `iac-principles` | Ch 2 Principles | 前提:假設一切會壞;原則讀成因果鏈(可重複+低變異 → 可重現 → 可拋棄 → 故障=例行重建);cattle not pets | ✅ 已發布 |
| 3 | `iac-platforms` | Ch 3 Platforms | 系統三層(應用/執行環境/平台)、三資源原語(運算/儲存/網路)、動態平台檢驗表:可程式化・隨需・自助 | ✅ 已發布 |
| 4 | `iac-everything-as-code` | 核心實踐一 | 宣告式(比對/收斂/冪等)vs 程序式(抽象);別在宣告式語言裡寫程式(混種地帶警訊) | ✅ 已發布 |
| 5 | `iac-test-deliver` | 核心實踐二 | 測試金字塔(policy as code 性價比之王)、宣告式測試陷阱(測結果不測宣告)、pipeline 晉級制、環境同源 | ✅ 已發布 |
| 6 | `iac-small-pieces` | 核心實踐三 | 爆炸半徑、跟著變更切不是跟著東西切(變更頻率分層、Conway)、切太碎=另一種單體、「一次變更落在幾個 stack」檢驗法 | ✅ 已發布 |

## 第二批 — Stacks 與 Servers(定義與組裝基礎設施)

| # | slug | 對應主題 | 內容 | 狀態 |
|---|---|---|---|---|
| 7 | `iac-stacks` | Stacks + Environments(已併篇) | stack=變更單位(repo/module/stack 三詞掰開);環境三解法(複製貼上✗/一包全裝✗/可重用 stack✓)、環境≠branch;參數化甜蜜點與准入審查 | ✅ 已發布 |
| 8 | `iac-servers` | Servers as code | 內容物分層(資料不屬於 server)、烘烤線(bake vs fry 取捨)、image pipeline、持續同步 vs immutable(前提之爭:狀態外移) | 🔄 本批 PR |
| 9 | `iac-clusters` | Clusters as code | 應用執行環境層(K8s 等)的生命週期管理;cluster 本身也是 cattle——接 `[[k8s-intro]]` 系列 | ⬜ |

## 第三批 — Delivery 與設計(把變更安全送進正式環境)

| # | slug | 對應主題 | 內容 | 狀態 |
|---|---|---|---|---|
| 10 | `iac-dependencies` | Stack 間整合 | 依賴的傳遞方式(輸出值/查詢/registry)與耦合光譜;別伸手進別人的 state | ⬜ |
| 11 | `iac-changing-live` | 改動運行中系統 | 對活著的系統動刀:expand-contract、藍綠、資料的連續性;「不能停機」下的變更策略 | ⬜ |
| 12 | `iac-codebase-design` | Codebase 設計 | 第三版重點章:模組化、抽象層、避免大泥球;infra codebase 的演進與重構 | ⬜ |

## 第四批 — 組織與收尾

| # | slug | 對應主題 | 內容 | 狀態 |
|---|---|---|---|---|
| 13 | `iac-org` | 團隊與治理 | 平台團隊產品思維、self-service 的權限與 guardrail、governance as code——接 `[[infra-platform]]` | ⬜ |
| 14 | `iac-retro` | 系列回顧 | 全書一張圖總結 + 三條線(Ansible/SRE/K8s)的匯流;讀完之後我改變了哪些做法 | ⬜ |

## 術語表(Ubiquitous Language)

書:*Infrastructure as Code*(Kief Morris,O'Reilly;2nd ed. 2020)。**英文欄填原書用字**。

全系列同一個概念只准一個中文寫法;英文欄是翻譯時直接照抄的來源。
寫到表上沒有的術語就補一列。跨系列共用的通用詞(快取、佇列、可觀測性)在
`docs/ubiquitous-language.md`(全站術語表),這裡只放本系列特有的。

| 中文用詞 | 英文 | 備註 |
|---|---|---|
| 一切皆程式碼 | everything as code | 全系列核心紀律 |
| 基礎設施即程式碼 | infrastructure as code | 系列名;縮寫 IaC |
| 鐵器時代 / 雲時代 | the iron age / the cloud age | Ch1;「有 API 的鐵器時代」是本系列說法 |
| 牛,不是寵物 | cattle, not pets | 不寫「牲畜 vs 寵物」 |
| 可拋棄性 | disposability | 搭配 cattle not pets |
| 不可變基礎設施 | immutable infrastructure | 門檻在狀態,不在 image |
| 設定飄移 | configuration drift | 不寫「配置漂移」 |
| 雪花伺服器 | snowflake server | Ch1 反模式 |
| 自動化恐懼螺旋 | automation fear spiral | Ch1;半自動化比全手動更危險 |
| 爆炸半徑 | blast radius | 單體 stack 的真正問題 |
| 堆疊 | stack | 基礎設施的變更單位,書上是 infrastructure stack |
| 資源原語 | infrastructure resources | 運算 / 儲存 / 網路三樣 = compute / storage / networking |
| 烘烤 vs 現炸 | bake vs fry | image 先做好 vs 開機才裝 |
| 宣告式 / 命令式 | declarative / imperative | 宣告式 = 寫終點 |
| 冪等 | idempotent | 「敢常跑」的地基 |
| 測試金字塔 | test pyramid | Ch9 基礎設施版 |
| 策略即程式碼 | policy as code | 性價比之王那篇 |
| 晉級 | promotion | 一條 pipeline 一路晉級到 Production |
| 可重現 | reproducibility | 靠演習維持,不靠信仰 |
| 參數 | parameter | 參數是介面,不是垃圾抽屜 |

## 寫每篇時的慣例
- front matter:`series: "Infrastructure as Code 讀書筆記"`、`seriesOrder: <#>`、`category: tech`、tags:`iac` + `devops` + `book-notes`。
- 依 `.claude/skills/writing-blog-post`:每篇至少一張深色 SVG 招牌圖(SVG 內不可有空行)、摘要比原書清楚、反思要具體有立場。
- 收稿前跑台灣用詞 grep(見 `docs/zh-tw-style-guide.md`);`npm run build` 驗證。
- Git:開 branch → push → PR,不直接動 master(CLAUDE.md 硬規矩)。
