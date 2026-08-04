# Ansible for DevOps 讀書筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Ansible for DevOps 讀書筆記"`。
書:*Ansible for DevOps: Server and configuration management for humans*(Jeff Geerling;2nd ed. 2020,自出版/Leanpub)。範例程式:github.com/geerlingguy/ansible-for-devops;手稿:geerlingguy/ansible-for-devops-manuscript。

**收全部 16 章,但按投報率排序併篇**:核心心智模型與 playbook 地基先寫(第一批),部署/安全/CI 實戰第二批,plugins、Docker/K8s 等生態圈題目最後(第三批)。附錄 A(Windows 工作站)略過;附錄 B(best practices)拆散融入各篇慣例,不獨立成篇。

定位:**backend lead 視角,不是全職 ops**——重點不在背模組,而在「把維運知識從人腦搬進版本控制」這件事怎麼落地:冪等、宣告式、可重跑、可審查。每篇一張招牌圖 + 一段真實反思。書偏 hands-on、範例很多,筆記要**提煉模型**而不是抄指令。

邊讀邊寫:寫好一篇 → `draft: true` 改 `false` 發佈。草稿狀態的系列文正式站不出現在系列盒(走 `getPublishedPosts()`),`npm run dev` 看得到。跨篇 / 跨系列用 `[[slug]]` 互連。

`seriesOrder` = 寫作優先序(不是書本章節序)。

## 第一批 — 核心地基(先寫,優先)

| # | slug | 對應章 | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `ansible-intro` | Ch 1 | Ansible 是什麼:雪花伺服器與組態飄移;**Agentless**(SSH 推送 vs master+agent 拉取);**冪等**(描述終點不是步驟);第一個 inventory + ad-hoc | ✅ 已發布 |
| 2 | `ansible-adhoc` | Ch 2, 3 | 本機實驗環境(Vagrant/容器,能重建才敢玩)+ ad-hoc 指令實戰:一行管一群機器、常用模組(ping/command/yum/service/setup)、`-m` vs 裸 shell 的差別、什麼時候該升級成 playbook | ✅ 已發布 |
| 3 | `ansible-playbooks` | Ch 4 | 第一份 playbook:tasks / handlers / notify;從 shell 腳本翻譯成宣告式的思路;`--check` dry run;冪等在實戰裡長什麼樣 | ⬜ |
| 4 | `ansible-playbooks-advanced` | Ch 5 | 進階 playbook:變數優先序、facts、register、when / loop、blocks 與錯誤處理、tags;**Vault 管密文**;環境變數與 prompt | ⬜ |
| 5 | `ansible-roles` | Ch 6 | 組織之道:role 的標準目錄結構;include vs import(動態 vs 靜態);Ansible Galaxy 現成 role 的取捨;可重用性 = 團隊資產(附錄 B 慣例融入此篇) | ⬜ |
| 6 | `ansible-inventories` | Ch 8 | Inventory 進階:多環境(dev/staging/prod)佈局、group_vars / host_vars 的變數階層、**dynamic inventory**(雲端機器不用手抄 IP) | ⬜ |

## 第二批 — 實戰:部署、安全、CI

| # | slug | 對應章 | 主題 | 狀態 |
|---|---|---|---|---|
| 7 | `ansible-deployments` | Ch 10 | 用 Ansible 部署應用:單機部署 → **rolling update(`serial`)**、zero-downtime、藍綠;部署失敗的中斷與重試;跟 `[[sre-automation-release]]` 的發布工程對照 | ⬜ |
| 8 | `ansible-security` | Ch 11 | 安全自動化:SSH 硬化(禁 root / 禁密碼登入)、最小權限、自動安全更新、防火牆;「安全設定也要冪等」——手動硬化必然飄移 | ⬜ |
| 9 | `ansible-cookbooks` | Ch 9, 14 | 實戰配方:LAMP / 多層架構的完整範例怎麼讀;**Let's Encrypt / TLS 憑證自動化**——「會過期的東西」最該自動化 | ⬜ |
| 10 | `ansible-cicd` | Ch 12, 13 | 自動化你的自動化:AWX / Tower(給 playbook 一個有權限、有紀錄的家)、CI 跑 playbook;**Molecule + lint 測試 role**——組態程式碼也是程式碼,要測試 | ⬜ |

## 第三批 — 生態圈與容器時代(後面再寫)

| # | slug | 對應章 | 主題 | 狀態 |
|---|---|---|---|---|
| 11 | `ansible-collections` | Ch 7 | Plugins 與 Content Collections:ansible-core 與 collections 的拆分、FQCN、自己寫 module/plugin 的門檻 | ⬜ |
| 12 | `ansible-docker` | Ch 15 | Ansible × Docker:build image、管容器主機;界線在哪——Dockerfile 能做的別用 Ansible 硬做 | ⬜ |
| 13 | `ansible-k8s` | Ch 16 | Ansible × Kubernetes:管 cluster 生命週期 vs 管 cluster 裡的資源;跟 Helm/GitOps 的分工——接 `[[k8s-intro]]`、`[[k8s-packaging]]` | ⬜ |

★ = 投報率最高(1、3、4、5、7)。第一批六篇是地基,順序照寫;第三批依興趣調順序。16 章全數涵蓋(Ch 2+3、Ch 9+14、Ch 12+13 併篇;附錄 A 略、附錄 B 融入 #5)。

## 寫每篇時的慣例
- front matter:`series: "Ansible for DevOps 讀書筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`ansible` + 該篇主題(如 `devops`、`automation`、`deployment`、`security`、`ci`)。
- 依 `.claude/skills/writing-blog-post`:摘要比原書更清楚 + 一段真實反思;台灣用語(見 `docs/zh-tw-style-guide.md`)。
- 每篇一張以上站台深色 SVG(SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號)。
- 跨系列連結是重點:自動化消滅 toil ↔ `[[sre-toil]]`、`[[sre-automation-release]]`;基礎設施全景 ↔ `[[infra-intro]]`;容器/叢集 ↔ K8s 系列;冪等可重跑 ↔ `[[sre-cron]]`、`[[sre-data-pipelines]]`。
- 書的範例偏 CentOS/Debian 雙棧,筆記不逐指令抄——抓「為什麼這樣設計」的模型,指令留最小可跑的骨架。
