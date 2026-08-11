# 帶 AI 的手藝(2026)— 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "帶 AI 的手藝(2026)"`。

**為什麼掛年份**:這門手藝正在快速變形,今天的最佳實踐一年後可能就是笑話。掛上 2026 是對時間誠實——這是「當下的答案」,不是永恆真理;也留下年度 franchise 的空間:2027 回頭重寫一輪,對照本身就是內容。

定位:**不是 AI 工具教學(最大紅海),是一個同時帶人也帶 AI 的 EM,把 AI 協作當一門手藝來拆**——責任、規範、驗收、護欄、品味。觀點型系列,沒有書當骨架,每篇都要自己立論。

## 紀律(觀點系列的存活條件)

1. **獨家料檢查(最重要)**:每篇發佈前必須回答「這篇有沒有只有我能給的東西?」——第一手數據(GitCrisp 100+ PR、部落格產線)、真實事故、EM 視角。答不出來就不發,寧缺勿濫。
1.5 **實例優先(#2 驗證過的勝利公式)**:能做實驗就做實驗,能重演就重演,能挖數據就挖數據——論述是骨架,實例是肉。〈頸上有時鐘〉的讀者回饋證實:真實實驗紀錄(含 AI 的原話節錄、含它可能錯的地方)比論述可信十倍。連帶學到的操作紀律:**餵給實驗的資訊必須用真實口徑**——症狀轉述失真,重演的就是另一場事故(#2 重跑過一次才對)。
2. **第一季只規劃 6 篇**:觀點文供給比讀書筆記難,斷更的系列比不開系列傷品牌。寫完 6 篇、還有素材,再開第二季表。
3. **時機**:9/15 鐵人賽開賽,連載期間(9/15–10/14)不發本系列新文;此系列是**鐵人賽後的主線**。開賽前只做素材入檔。
4. 素材隨手入檔本文件(學 rezero roadmap 的養法);跨系列用 `[[slug]]` 互連(gitcrisp、blog-as-a-product、travel-split 是本系列的案例庫)。

## 第一季(6 篇)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `responsibility-funnel` | 責任漏斗:AI 能做掉九成的事,為什麼剩下的一成是你 | 責任守恆(分流 vs 全反射)、漏斗模型、頸寬=驗收頻寬=Amdahl 上限、junior 三條路 | ✅ 已發布 |
| 2 | `ai-incident-clock` | 頸上有時鐘:事故中的 AI | 從候補升位(素材最熟、鐵人賽存稿已完成故產能無虞、開賽前讓系列有兩篇)。重播毒藥訊息事故的**真實重演實驗**(分階段餵 on-call 已知資訊給乾淨的 AI,記錄真實回應);詳細素材見下方候補區原始筆記 | ✅ 已發布 |
| 3 | `ai-responsibility-design` | 看板上的頸:工具怎麼設計人的責任——兩個開源專案的對照稽核 | 從候補升位(2026-08-13 討論定案,下一篇)。Multica(agent team 看板)與 Superpowers(spec-first 工作流)的 code-level 責任稽核對照;詳細素材見下方候補區筆記 | ✅ 已發布 |
| 4 | `ai-responsibility-premium` | 責任的保費:AI 不收,也不賠 | 從討論定案(2026-08-13):雇用的本質=勞動+責任分擔;薪水裡的責任費(簽證費/on-call 津貼/主管加給);組織=再保險網(分層自留),AI fleet=垂直瀑布全反射;合約稽核實例(民法承攬瑕疵擔保 vs GitHub 條款演化+賠償上限);AI 不能承保的三條件(skin in the game/持續身分/社會承認);黑暗版:職業蓋章人。第一手:前職承保地圖(選標同仁/前端同仁/PM/CTO 對外含毒藥事故) | ✅ 已發布 |
| 5 | `ai-spec-craft` | 規範即程式:CLAUDE.md 是新時代的 onboarding 文件 | 「把要求寫清楚」這門被低估的手藝;規範文件=給 AI 的護欄=給人的 onboarding;GitCrisp/本站 CLAUDE.md 實例解剖;寫不清楚要求的人帶 AI 跟帶人都會失敗 | ⬜ |
| 6 | `ai-review-craft` | 驗收的手藝:怎麼 review AI 的 code | 風險分級(哪些全文讀、哪些抽查、哪些機器擋)、預測→驗證迴圈的實際操作、review 測試比 review feature 更重(護欄壞了是靜默的) | ⬜ |
| 7 | `ai-guardrails` | 護欄工程:測試與規範在 AI 產線的新角色 | 護欄=把頸加寬;護欄的遞迴與止損點;GitCrisp 13.5k 行測試、本站 avoid-word/pre-commit 實例;護欄的投資報酬怎麼算 | ⬜ |
| 8 | `ai-false-neck` | 假頸解剖:automation complacency 六十年的教訓 | 航空業自動化失能研究 → code review 的對應;「十次有九次是對的,第十次你已經不看了」;維持頸的材質要刻意練習 | ⬜ |
| 9 | `ai-taste` | 品味經濟學:當產出免費,稀缺的是什麼 | taste 的工程定義(知道什麼是好、且能說出為什麼);品味怎麼練、怎麼寫進文件變成可傳承的;產出通膨時代的個人定價 | ⬜ |

## 每篇的實驗設計(實例優先的落地;寫作前可再調)

- **#3 看板上的頸**:對照稽核——Multica 與 Superpowers 的 code-level 責任稽核(引用釘 commit,可查證);第一手補強:本站 `docs/superpowers/specs/` 的簽核紀錄與體感;可選的行動環節:回饋 issue 給 Multica。
- **#4 責任的保費**:合約稽核(2026-08-13 已執行)——GitHub 條款演化實錄:2024 Copilot 版「You retain all responsibility for Your Code, including Suggestions」→ 2026-03 Generative AI Services 版「solely responsible for any application or agent you create」(產品越 agent 化,責任綁得越全面);General Terms 2025-03 賠償上限=12 個月費用。對照台灣民法承攬瑕疵擔保(法律預設綁在承攬人身上)。稽核限 GitHub 家族(egress 限制),文內如實聲明。
- **#5 規範即程式**:A/B 實驗——同一個開發任務,給乾淨的 AI 各跑一次「有 CLAUDE.md」vs「沒有 CLAUDE.md」,對照輸出的架構邊界、命名、測試習慣;把兩份 diff 的差異當文章主體。
- **#6 驗收的手藝**:抓蟲實驗——在一個 AI 產出的 PR 裡刻意埋 2–3 個不同層次的 bug(邏輯邊界/靜默回歸/風格),記錄自己用「預測→驗證」流程 review 的過程與漏抓率;或反向:讓另一個乾淨的 AI 當 reviewer,對照人機各自抓到什麼。
- **#7 護欄工程**:數據挖掘——GitCrisp repo 實測:統計測試攔下的回歸次數(CI 紅燈紀錄)、pre-commit/avoid-word 的攔截率;算一次護欄的投資報酬。
- **#8 假頸解剖**:自我實驗——連續 N 個 AI PR 刻意記錄自己的 review 深度(全文讀/抽查/掃過),畫出注意力衰減曲線;對照航空業的警覺衰減研究。
- **#9 品味經濟學**:對照實驗——同一需求讓 AI 生成三種實作,寫下自己選哪個、為什麼;再把「為什麼」寫成規則餵回去,看第二輪生成有沒有變好——品味能不能被文件化的實測。

## #3 稽核素材:ai-responsibility-design(2026-08-13 入檔)

兩份 code-level 稽核,引用皆釘在稽核當下的 commit(程式碼會變,發文前可重驗):

**Multica(multica-ai/multica @ 6bce42b)——頸在下游,沒裝鎖:**
- 「agent 交付停在 in_review」是 prompt 慣例,不是狀態機:agent runtime 說明書寫「deliver with in_review」,但同一份說明書列出 `multica issue status <id> <status>`,valid 值**含 `done`**(`runtime_config_sections.go:264`)。
- 伺服器端零 actor 檢查:`PUT /api/issues/:id` 只驗 status 在 enum 內(`handler/issue.go` validIssueStatuses)。設計原則明文:「the default contract elsewhere (issues, chat, etc.) is **"agent and human are interchangeable"**」(`handler/actor_guards.go` 註解)。
- **護頸機制存在但只鎖錢**:`X-Actor-Source` 由伺服器蓋章防篡改,`RequireHumanActor` middleware 現成——只掛在 billing 路由(理由:被 prompt injection 攻破的 agent 不能動錢)。讓 agent 拉不動 done 距離一行 `r.Use()`。錢有頸,Done 沒有。
- **完成 = 沉默**:Inbox 通知掛在 in_review(notification_listeners:「in_review 是 this needs you now 的主要訊號」);agent 直接拉 done 會繞過整條人類注意力路徑——毒藥訊息「失敗=沉默」的組織版。
- schema 無 accountable:issue 單一 assignee(member|agent)+ creator,RACI 的 A 不存在(`migrations/001_init.up.sql`)。
- agent 對 agent 的權限(squad leader 才能動 parent 狀態)防得比 agent 對 done 嚴。
- 公平面:真正的出貨頸外包給 GitHub PR merge;execution log 完整可回放;文案有意識(「nothing ships without a human saying so」)——**不是不懂,是按價值排序裝鎖:錢 > merge > 看板**。
- 可能的行動:回饋 issue「optional human-only done transition」,附他們自己的 RequireHumanActor 當實作建議(是否執行、措辭,發文前與作者確認)。

**Superpowers(obra/superpowers @ 44c9b2d)——頸在上游,裝了鎖:**
- **HARD-GATE**:brainstorming skill 明文「未呈現設計並獲使用者批准前,不准任何實作動作」,並封死「這太簡單不用設計」的逃生口。AI 主動把人押到頸口。
- **一次一題**是責任設計:逐題逼人做本來會默認委派的決策,人無法當乘客。
- **簽名有物理形式**:設計分段批准 → 寫入 `docs/superpowers/specs/日期-主題-design.md` 並 commit——簽核進版本控制,可考古。
- **判斷力前置**:writing-plans 把計畫寫給「熱情但品味差、無判斷力、討厭測試的 junior」——簽核後執行端被建模為零判斷;責任左移(shift-left),驗一份 spec 比驗十個 PR 便宜。
- **verification-before-completion**:「NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE」「skip any step = lying」——給 AI 自己的頸圈,管誠實聲明。
- 弱點:前移的頸一樣磨損(**簽核疲勞**——第 1 份與第 15 份 spec 的閱讀深度);**簽了不等於簽對**(負責感 ≠ 正確性,瀑布老風險);HARD-GATE 仍是 prompt 不是機制。
- 第一手素材:本站 `docs/superpowers/specs/` 十幾份已簽核 spec(wikilinks-backlinks、抽籤 RNG、Astro 遷移)——作者自己的簽名紀錄與體感。

**對照表(文章骨架)**:頸的位置(下游 vs 上游)/有無裝鎖(慣例 vs HARD-GATE)/責任載體(看板狀態無簽名 vs spec 檔案+commit)/弱點(責任劇場 vs 簽核疲勞)。收尾:責任感是可以被工作流「設計」出來的——工具改變不了責任守恆,但決定了你在哪個時間點、以什麼粒度感受到自己正在簽名。

## 候補(第二季素材池)

- `ai-incident-clock` — **頸上有時鐘:事故中的 AI**(2026-08-12 討論定案,素材最完整的候補,有資格與第一季換位)
  - **格式**:重播 [[rezero-flash-crowd]] 的毒藥訊息事故——「這次桌上有 AI」。逐段對照:當年花在找資料/拼敘事的時間 vs AI 在場能吃掉哪段、哪個決定仍然是人的、哪個瞬間可能被 AI 帶偏。全用已公開戰史,獨家料檢查直接過。
  - **為何選毒藥訊息**:症狀最具欺騙性——ingestion 正常、留言瀑布照流、只有轉換率悄悄歸零,「什麼都沒壞,只是沒有產出」。判斷前的路最長 → AI 壓縮空間最大;同時最能測 AI 極限:證據相關性不明顯時,AI 拼出的是正確敘事,還是一個貌似合理的錯誤敘事?(權威幻覺案例天然入戲;另有現場壓力:主播氣瘋、合約談崩被迫提早上線)
  - **核心論點**:漏斗通用化——AI 的角色是**壓縮「到達判斷點的成本」**。事故是頸上有時鐘的極端場景:on-call 頻寬被找資料/拼敘事/寫溝通三件寬層工作吃掉,AI 全能吃,省下的頻寬回灌到唯一不能外包的「決定」→ 事故中的 AI = 臨時把頸加寬。
  - **誠實面**:壓力下的權威幻覺——凌晨三點的 on-call 批判力最低,而 AI 的假設長得最像答案(automation complacency 的極端版,航空業:自動駕駛偏偏在暴風雨裡把飛機還給你)。設計原則:**事故中的 AI 輸出必須是「可驗證的線索」附驗證把手(查哪個 dashboard、跑哪條 query),不是結論**——讓人保持在驗證者位置,不滑進蓋章者位置。
  - **結構優勢**:三系列在此交會——可觀測性系列(關聯篇:把證據擺上桌)→ AI(幫你讀桌上的證據);SRE 系列的 Triage→Examine→Diagnose→Treat 逐段標注:Examine/Diagnose 的材料工 AI 化,Triage/Treat 的裁決留在人。
  - **收尾的普遍化**:每個職能都有自己的漏斗(incident、code review、架構決策、postmortem、招聘)——「AI 能用在哪」的判準從「會不會寫程式」變成「**這個工作的判斷點在哪、判斷前的路有多長**」。
- `ai-context-engineering` — 把團隊知識餵給 AI 的架構:roadmap / skill / 風格指南,本站產線就是活案例
- `ai-solo-limits` — 一個人的極限測試:GitCrisp 數據完整版(commit 分佈、PR 大小、時間都花在哪)
- junior 培養實戰(等有帶團隊導入的第一手觀察再寫;現職素材使用前先確認邊界)
- 2026 年終回顧:年初寫的哪些已經過時——franchise 的第一個對照點

## 寫每篇時的慣例

- front matter:`series: "帶 AI 的手藝(2026)"`、`seriesOrder: <#>`、`category: tech`、tags 含 `ai`(+ 該篇主題如 `leadership`、`code-review`)。
- 依 `.claude/skills/writing-blog-post`:每篇至少一張扛核心模型的圖;反思要有真實案例與數字;台灣用語(`docs/zh-tw-style-guide.md`)。
- 例子預設只用公開素材(side projects、已發佈的 rezero 戰史);現職相關內容發佈前逐篇確認。
