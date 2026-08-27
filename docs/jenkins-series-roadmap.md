# Jenkins 學習筆記 — 系列 Roadmap

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Jenkins 學習筆記"`。

定位:**把「CI/CD」從觀念落地成一套會用的工具。** SRE 系列講的是發布工程的**為什麼**(`[[sre-automation-release]]` 的 hermetic build、自助式、小步發),IaC 系列講的是交付的**原則**(`[[iac-test-deliver]]` 的測試金字塔、pipeline 晉級制),這個系列講的是**「Jenkins 這台機器到底怎麼運作、怎麼把那些原則變成真的 Jenkinsfile」**——實作導向、圖解 + 反思。

## 貫穿全系列的主軸

**一次提交,要能被信任地送上線。** 而「可信」不是感覺,是三個可以逐項檢查的性質:

| 性質 | 在問什麼 | 沒有它會怎樣 |
|---|---|---|
| **可重現** | 同樣的輸入,今天跑、半年後跑、在誰的機器上跑,結果都一樣嗎? | 「在我機器上明明可以」;上線的產物沒人說得清是怎麼組出來的 |
| **可審查** | 這條路上的每一步,都攤在別人看得到、改得動、能 review 的地方嗎? | 流程躺在 UI 或某個人腦裡;他請假那天全公司不能上線 |
| **可回滾** | 出事的時候,退回去跟送上去一樣快、一樣有把握嗎? | 只能往前修;每次上線都是一場豪賭,於是大家越發越少、批次越大 |

三個性質之上,有一條全系列不打折的**紀律**:**這條路上凡是能寫成程式碼的,就寫成程式碼、進 git。**build 步驟、部署動作、品質關卡、通知、甚至 Jenkins 自己的設定(JCasC)——只要它進了 repo,就同時買到三件事:**可審查**(能 review、能 blame、能問「這行為什麼在」)、**可重現**(build 的行為由簽入的內容決定,不是由某台機器當下的狀態決定)、**可回滾**(流程壞了就 `git revert`,跟回滾程式碼是同一個動作)。所以它不是三個性質之外的第四項,而是**同時服務三項的那一招**——這也是為什麼它值得當成預設立場,每篇都在做,而不是只在某一篇喊口號。

但**主軸不等於口號**:「要程式碼化、要版控」這句話本身在 2026 年已經沒有資訊量,讀者要的是**那段程式碼長什麼樣、放在 repo 哪裡、review 的人該看什麼**。所以本系列的作法是——**精神每篇都在,但用範例呈現,不用口號重複**(見下面〈每篇的程式碼範例〉,那是硬性要求)。

每篇扣哪一項(寫的時候用來檢查「這篇到底在服務什麼」):

| 扣回 | 篇 |
|---|---|
| **可重現** | #3 agent 是 cattle、#4 artifact 與 hermetic build、#11 build once deploy many、#12 每次 build 開一顆乾淨 pod |
| **可審查** | #2 Jenkinsfile 進 repo、#7 Shared Library、#8 PR check、#13 JCasC |
| **可回滾** | #1 小步合回主幹、#8 短命分支、#10 品質關卡擋在前面、#11 回滾要一鍵 |
| **路要安全**(前提) | #6 憑證與遮蔽的極限、#13 備份、權限、外掛升級、#14 硬碟滿與殘留的 token |
| **路要夠快**(前提) | #5 平行化、#15 build 慢是一種 toil、#12 動態 agent 的容量、#14 清理與容量規劃 |

**與既有系列的關係(差異化)**:
- ↔ **Google SRE 系列**(`[[sre-automation-release]]`、`[[sre-toil]]`、`[[sre-testing]]`):那邊講「為什麼變更要又快又安全」的哲學與文化,這裡講**拿 Jenkins 怎麼真的做到**。互連、不重複。
- ↔ **Infrastructure as Code 系列**(`[[iac-test-deliver]]`、`[[iac-everything-as-code]]`):那邊講 pipeline 晉級制、宣告式的通則,這裡把 declarative pipeline 的語法與陷阱講透。
- ↔ **Ansible / Kubernetes 系列**:Jenkins 是「誰來按下按鈕」,Ansible/K8s 是「按下去之後誰去做」——部署那批(#11、#12)明確接 `[[ansible-playbooks]]`、`[[k8s-packaging]]`。
- ↔ **Grafana LGTM 系列**:#13~#15 把 Jenkins 自己當成一個要被觀測的正式服務(磁碟、佇列、build 時間都是指標),接 `[[obs-metrics-prometheus]]`。

**為什麼 2026 年還寫 Jenkins?** 因為現實裡它還在跑——舊系統、地端環境、有合規要求的機房,GitHub Actions 進不去的地方 Jenkins 都在。而且 Jenkins 的概念(controller/agent、workspace、credential、shared library)幾乎是所有 CI 工具的共同祖先,學會它再看別家會很快。最後一篇(#16)會誠實談「什麼時候該搬走」。

★ = 框架 / 最高投報(1、2、6、9、11、13、14)。邊寫邊發:`draft: true` → `false`。`seriesOrder` = 寫作順序。

## 每篇的程式碼範例(硬性要求)

**跟 code 有關的篇,一律要有能貼進 repo 的範例**——不是截圖、不是外掛設定畫面,是一段**最小可跑、標明檔名與路徑**的程式碼。這是「pipeline 是程式碼」這條紀律在寫作上的具體要求:與其在結尾喊一句,不如讓讀者每篇都看到它長什麼樣。

| # | 必附的範例(至少) | 檔案 / 形式 |
|---|---|---|
| 1 | 三十行內的最小 pipeline(build → test),外加「它躺在 repo 根目錄」這件事本身 | `Jenkinsfile` |
| 2 | Freestyle 的 `config.xml` 片段 vs 同一件事的 Jenkinsfile 對照;declarative 完整骨架 + scripted 對照 | `Jenkinsfile`、`config.xml`(反例) |
| 3 | `agent { label 'linux && docker' }`、`agent none` + 各 stage 各自 agent | `Jenkinsfile` 片段 |
| 4 | `archiveArtifacts` + `fingerprint`、`stash` / `unstash`、`cleanWs`、快取目錄的掛法 | `Jenkinsfile` 片段 |
| 5 | `parallel` / `matrix` / `when` / `post` / `retry` + `timeout` / `input` 各一段 | `Jenkinsfile` 片段 |
| 6 | `withCredentials` 正確綁定 **+ 會洩漏的反例**(`echo`、`set -x`、artifact 夾帶);外部 secret manager 取用 | `Jenkinsfile` 片段(正例/反例並列) |
| 7 | 一支 `vars/` 步驟 + 呼叫端 `@Library('pipeline-lib@1.4.0')`;`src/` class 一例;函式庫的單元測試片段 | `vars/deployApp.groovy`、`src/...groovy`、`Jenkinsfile` |
| 8 | `when { branch 'main' }` 的部署閘門;Multibranch 的 job 設定(以 JCasC 表示,不用 UI 截圖) | `Jenkinsfile`、`jenkins.yaml` |
| 9 | 一段會拋 `NotSerializableException` 的反例 + 修好的版本;`@NonCPS` 正確用法(純計算、不含 `sh`);sandbox 被擋下來時的錯誤訊息長什麼樣 | `Jenkinsfile`、`src/...groovy` |
| 10 | `junit` 報告、覆蓋率門檻擋下 build 的那段、靜態分析接入 | `Jenkinsfile` 片段 |
| 11 | build once deploy many 的兩段式(promote 既有 artifact,不重 build);呼叫 `ansible-playbook` / `helm upgrade`;**rollback stage** | `Jenkinsfile` 片段 |
| 12 | kubernetes plugin 的 `podTemplate` YAML + `container('maven') { ... }`;快取用 PVC 的掛法 | `Jenkinsfile`(內嵌 pod YAML) |
| 13 | JCasC 設定(含權限與 job 定義)、外掛版本鎖定清單、`JENKINS_HOME` 備份腳本 | `jenkins.yaml`、`plugins.txt`、`backup.sh` |
| 14 | `options { buildDiscarder(logRotator(...)) }`(紀錄留久、產物留短)、multibranch 的 orphaned item 策略、JCasC 的全域保留預設、磁碟用量檢查與清理排程 | `Jenkinsfile`、`jenkins.yaml`、`housekeeping.sh` |
| 15 | 量測各 stage 耗時的作法、把測試切成 `parallel` 分片、相依快取設定 | `Jenkinsfile` 片段 |
| 16 | **同一條 pipeline 的三種寫法對照**:Jenkinsfile vs GitHub Actions workflow vs GitLab CI | `Jenkinsfile`、`.github/workflows/ci.yml`、`.gitlab-ci.yml` |

範例的規矩:
- **標檔名與路徑**(`Jenkinsfile`、`vars/deployApp.groovy`、`jenkins.yaml`),讀者要知道這段東西在 repo 的哪裡。
- **最小可跑**——砍到只剩要講的那個概念,但不要砍到貼上去會壞;不逐一抄外掛的所有參數。
- 以 **declarative** 為主,需要 scripted 才做得到的地方明講「為什麼這裡得逃出去」。
- 有反例的地方就並列正反(#6 的機密洩漏最需要),比純文字警告有用十倍。
- 每段範例心裡都要能回答一句:**這段進了 git 之後,review 的人該看什麼?**

## 第一批 — 地基(Jenkins 是什麼、pipeline 長什麼樣)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `jenkins-intro` | Jenkins 是什麼:CI 不是「有跑測試」,是「頻繁合回主幹」 | **【可回滾】** CI/CD 三個詞掰開(CI / Continuous Delivery / Continuous Deployment);持續整合的真義=小步、頻繁合回 trunk,不是「裝了一台 build server」——批次越小,錯了越好退;Jenkins 的定位(自架、外掛生態、什麼都能接的代價);controller/agent 架構速覽;為什麼 2026 還學它——接 `[[sre-automation-release]]`、`[[iac-intro]]` | ✅ 已發布 ★ |
| 2 | `jenkins-first-pipeline` | 第一個 Jenkinsfile:pipeline as code 為什麼贏過 UI 點按鈕 | **【可審查】** Freestyle job 的原罪(設定躺在 UI、不能 review、不能複製、不能回滾);Jenkinsfile 進 repo=跟著程式碼一起版本控制/review/回滾;declarative vs scripted(先學 declarative);`pipeline / agent / stages / stage / steps` 骨架;第一條 build→test→archive;`options`(timeout / disableConcurrentBuilds);PR diff 長什麼樣;`script { }` 逃生門——接 `[[iac-everything-as-code]]` | ✅ 已發布 ★ |
| 3 | `jenkins-controller-agent` | Controller 與 Agent:工作到底在哪台機器上跑 | **【可重現】** controller 只調度不 build(跑 build 的 controller 遲早倒);agent 連線方式(SSH / inbound JNLP / 容器);executor 與佇列(排隊等的是 executor 不是機器);**label 決定工作去哪台**(對照 `[[k8s-scheduling-advanced]]` 的 node selector);**手養的 agent 就是飄移的溫床**——agent 該是可拋棄的,接 `[[iac-principles]]` cattle not pets、`[[ansible-intro]]`(從寵物到牛的三階段);`numExecutors: 0` 的 JCasC 片段;label 寫機器名是反模式 | ✅ 已發布 |
| 4 | `jenkins-workspace-artifact` | Workspace 與 Artifact:build 出來的東西去哪了 | **【可重現】** workspace 生命週期(髒 workspace = 最常見的「在我機器上可以」);archiveArtifacts 與 fingerprint(這顆 jar 是哪次 build 出來的=可稽核);快取 vs 乾淨建置的取捨(快取是拿可重現換速度,要知道自己在換什麼);**hermetic build 在 Jenkins 上能做到幾分**;artifact repository(Nexus/Artifactory)的分工(archive 給人看、repository 給機器取)——接 `[[sre-automation-release]]` | ✅ 已發布 |

## 第二批 — Pipeline 進階(把 Jenkinsfile 寫成能維護的程式碼)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 5 | `jenkins-pipeline-advanced` | 進階 pipeline:平行、條件、失敗處理與人工關卡 | **【路要夠快】** `parallel` 與 `matrix`(縮短 build 時間最直接的一招);`when` 條件執行;`post`(always/success/failure)把通知與清理收在一處;`retry` / `timeout` / `catchError` 的正確用法——**retry 用在網路,不該用來蓋 flaky test**;`input` 人工核准關卡與它的代價(卡住 executor + workspace,解法:`agent none` + timeout + milestone);`when` 的 `beforeAgent true`;`post` 的 `changed`(狀態翻轉才通知);參數化與「別拿參數當跳過檢查的開關」 | ✅ 已發布 |
| 6 | `jenkins-credentials` | 憑證管理:機密怎麼進 pipeline 又不外洩 | **【路要安全】** Credentials store 與 scope(global/folder/job);`withCredentials` 綁定與自動遮蔽;**遮蔽不等於安全**(echo 進 log、子行程、`set -x`、artifact 夾帶的洩漏路徑);最小權限與短命 token;外部 secret manager(Vault/雲端 KMS)的接法;不要把 secret 寫進 Jenkinsfile——一條可審查的 pipeline 的代價是「什麼都看得到」,所以機密必須從一開始就不在裡面。接 `[[k8s-config-secret]]`、`[[ansible-playbooks-advanced]]`;外部 PR build 不該帶部署憑證;「十分鐘內能不能換掉一把金鑰」當單一指標;例外只有一個——值不進 git,但「誰在哪裡用了什麼機密」要進 git | ✅ 已發布 ★ |
| 7 | `jenkins-shared-library` | Shared Library:把重複的 pipeline 變成公司資產 | **【可審查】** 十個專案十份幾乎一樣的 Jenkinsfile = 十份技術債,而且沒人知道哪份才是對的;`vars/` / `src/` / `resources/` 結構;`@Library` 版本釘選(共用函式庫也要語意化版本,不然一改全炸);抽象的甜蜜點——別做出「另一個沒人看得懂的 DSL」,那是把可審查性又藏回去;treat pipeline code as code(要測試、要 review;沒有 CI 的共用函式庫=沒有 CI 的 CI 系統);判準「共用怎麼做、不共用做什麼」;抽象要留逃生門,否則會被 fork 繞過——接 `[[iac-small-pieces]]`(未來可補 `[[iac-codebase-design]]`、`[[ansible-roles]]`) | ✅ 已發布 |
| 8 | `jenkins-multibranch` | Multibranch 與 PR 觸發:讓每個分支都有自己的 pipeline | **【可回滾 + 可審查】** Multibranch Pipeline 與 Organization Folder(自動發現分支/PR);webhook vs polling(polling 是 toil 也是延遲);PR check 與 required status(把審查變成擋得住的門);**trunk-based 與短命分支**才是 CI 的前提——長命分支再多 CI 也救不了合併地獄,而且大批次=不好退;**「能不能合」常常是商業決定**——所以要把合併與發布解耦:不接線 / branch by abstraction / feature flag 三階梯(#1 已鋪陳,這裡展開),含旗標的清理紀律(擁有者 + 到期日、只做開關不做業務分岔、定期盤點)與旗標債 vs 合併債的取捨;branch 條件(只有 main 才部署 / buildingTag 才發版);orphanedItemStrategy 與 Organization Folder;required check 的價值是把對話從「你跑測試沒」變成設計討論——接 `[[sre-automation-release]]`、`[[sre-toil]]`;**修改既有行為**的四類分法(行為不變的優化不該進商業排期)、kill switch(預設 on)vs feature flag(預設 off)、拆 PR(純重構先合 + 切換一刀);**閘門在合約不在使用者**的委外情境——別拿旗標當談判籌碼,先給量化證據再給程式碼 | ✅ 已發布 ★ |
| 9 | `jenkins-groovy-cps` | Jenkinsfile 不是 Groovy:CPS、序列化與沙箱 | **【可審查 + 路要夠快】** 為什麼「看起來很正常的 Groovy」在 Jenkinsfile 裡會壞掉:declarative 是長在 scripted 之上的 DSL,而 pipeline 全程跑在 **CPS 轉換**下(可暫停、可在 controller 重啟後續跑),代價是**每個變數都要能序列化**(`NotSerializableException` 的真正原因)、部分 Groovy 慣用寫法(某些 closure / 迭代 / 正規表示式物件)行為詭異;`@NonCPS` 是什麼、什麼時候用、以及它為什麼不能包 `sh`;**Groovy sandbox 與 script approval**(誰能核准、為什麼那是一個安全決策);`src/` 的 class 也一樣受 CPS 影響;結論仍是那句——**別在 Jenkinsfile 裡寫程式**,邏輯放 shell 或 `src/`,讓 pipeline 只做編排 | ✅ 已發布 ★ |

## 第三批 — 交付(從綠燈到上線)

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 10 | `jenkins-quality-gates` | 品質關卡:測試報告、覆蓋率與靜態分析怎麼變成「擋得住的門」 | **【可回滾】** JUnit/測試報告與趨勢圖;覆蓋率門檻的用與濫用(數字當目標就會被作弊);靜態分析/lint/SAST 接進 pipeline;**pipeline 晉級制**(每關越貴越慢、越前面越便宜)——接 `[[iac-test-deliver]]`、`[[sre-testing]]`;flaky test 為什麼是紅燈疲勞的根源:紅燈失去意義的那天,這道門就不存在了 | ⬜ |
| 11 | `jenkins-deploy` | 從 CI 到 CD:部署要怎麼交給 Jenkins 才安全 | **【可重現 + 可回滾】** build once, deploy many(同一顆 artifact 走過各環境,不要每環境重 build——重 build 就等於沒驗過);環境晉級與核准;部署手法(rolling / 藍綠 / canary)交給誰做——Jenkins 呼叫 `[[ansible-playbooks]]` 或 `kubectl`/Helm(`[[k8s-packaging]]`);**push 式 CD vs GitOps pull 式**的界線;**回滾要跟部署一樣一鍵、一樣常演練**;上線前的 production readiness——接 `[[sre-production-readiness]]`、`[[iac-changing-live]]` | ⬜ ★ |
| 12 | `jenkins-on-kubernetes` | Jenkins 跑在 Kubernetes 上:動態 agent 與 pod template | **【可重現 + 路要夠快】** kubernetes plugin:每次 build 開一顆 pod、跑完就丟(agent 終於真的是 cattle,環境飄移歸零);pod template 與多容器(build 容器 + JNLP 容器);requests/limits 與排程(接 `[[k8s-scheduling-advanced]]`);**乾淨換來的代價是快取沒了**——PVC / 遠端快取怎麼補(接 `[[k8s-storage]]`);DinD / Kaniko 建 image 的取捨;controller 自己要不要上 K8s | ⬜ |

## 第四批 — 把 Jenkins 當正式服務養 & 收尾

| # | slug | 標題(暫定) | 主題 | 狀態 |
|---|---|---|---|---|
| 13 | `jenkins-ops` | 維運 Jenkins 自己:JCasC、備份與外掛地獄 | **【路要安全 + 可審查】** `JENKINS_HOME` 是唯一的真相(備份什麼、還原演練過沒);**Configuration as Code(JCasC)**——連 Jenkins 本身的設定都進 git,把「可審查」從 pipeline 推到平台自己,對照 `[[iac-everything-as-code]]`;外掛升級地獄與版本鎖定;權限(Role Strategy / folder 層級授權,對照 `[[k8s-rbac]]`);升級與災難復原;**Jenkins 掛掉=全公司不能上線,它就是 tier-1 服務**——接 `[[sre-production-readiness]]` | ⬜ ★ |
| 14 | `jenkins-housekeeping` | Jenkins 會堆積什麼:build 紀錄、產物、workspace 與孤兒 job 的清理 | **【路要安全 + 路要夠快】** 盤點會長大的東西:build 紀錄與日誌、archive 的產物(最吃硬碟)、每個分支一份的 workspace、multibranch 刪了分支卻留下的孤兒 job、fingerprint 的海量小檔、外掛升級留下的 `.bak`、離線 agent 與卡住的佇列、以及離職者還活著的 token;**保留策略要寫進 Jenkinsfile 的 `options { buildDiscarder(...) }` 與 JCasC**——保留多久也是程式碼,不是誰在 UI 上點的;**紀錄留久、產物留短**(正式產物在 repository,見 #4);磁碟用量要監控與告警(接 `[[obs-metrics-prometheus]]`);判準是「要回答什麼問題」而不是「硬碟還剩多少」;**硬碟滿 = 全公司不能上線**,清理是容量規劃不是打掃 | ⬜ ★ |
| 15 | `jenkins-performance` | Build 慢是一種 toil:pipeline 效能與開發者體感 | **【路要夠快】** 從「提交到綠燈」的時間拆解(排隊 / checkout / 相依下載 / 測試 / 打包);瓶頸在哪要先量再改(接 `[[obs-metrics-prometheus]]`、`[[sre-monitoring]]`);平行化、切分測試、快取相依、增量 build;**慢 CI 的真正代價是行為改變**——大家開始少 commit、批次變大、跳過測試、繞過流程,於是可重現/可審查/可回滾三個性質一起失效;排隊等 executor 的容量規劃——接 `[[sre-toil]]` | ⬜ |
| 16 | `jenkins-vs-alternatives` | Jenkins vs GitHub Actions / GitLab CI / Argo:什麼時候該留、什麼時候該搬 | **【總結】** 三種模型對照(自架萬能型 / SaaS 內建型 / K8s 原生 GitOps 型);維運成本 vs 控制權;搬遷該怎麼分批(先搬新專案、shared library 抽象是搬家的槓桿);留下來的理由(地端、合規、非典型 build);**用三個性質當評分表去比工具**,而不是比外掛數量;系列回顧:一張圖把可重現 × 可審查 × 可回滾 串起來,以及我因此改掉的做法 | ⬜ |

## 建議閱讀順序
1. **地基**(1→2→3→4):先弄懂「CI 是什麼」與「pipeline 進 repo」這兩件事;3、4 解釋 build 到底在哪跑、產物去哪(可重現的地基)。
2. **寫得好維護**(5→6→7→8→9):語法進階 → 機密 → 抽成 library → 分支策略 → 認清 Jenkinsfile 不是 Groovy。6 是踩雷成本最高的一篇,9 是最多人卡住卻查不到原因的一篇。
3. **交付**(10→11→12):品質關卡 → 部署 → 跑在 K8s 上。11 是整個系列的重點。
4. **養它**(13→14→15):備份與設定進 git → 清掉會堆積的東西 → 調效能。Jenkins 自己就是一個要備份、要監控、要做容量規劃的正式服務。
5. **收尾**(16):誠實比較,並回顧整條線。

## 寫每篇時的慣例
- front matter:`series: "Jenkins 學習筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`jenkins` + `ci-cd` + 該篇主題(如 `pipeline`、`devops`、`security`、`deployment`、`kubernetes`、`automation`)。
- 依 `.claude/skills/writing-blog-post`:一張招牌深色 SVG(SVG 內不可有空行;wikilink label 內不可放 inline code / 反引號;figcaption 內不放 wikilink,要連結用 `<a href>`)+ 比官方文件更清楚的摘要 + 一段真實反思。
- 台灣用語(見 `docs/zh-tw-style-guide.md`);Jenkinsfile / Groovy / YAML / shell 一律用 code block 並標語言,**每篇至少一段能看懂的最小可跑骨架**(對照上面的範例表),但不逐一抄外掛設定——抓「為什麼這樣設計」。
- **貫穿主軸**:每篇結尾扣回「一次提交要能被信任地送上線」,並明確指出這篇服務的是**可重現 / 可審查 / 可回滾**哪一項(或哪個前提)。表格裡的 **【】** 標記就是這個用途——寫之前先確認,免得每篇結尾變成硬套同一句話。
- **「pipeline 是程式碼、要版控」的精神每篇都在,但用範例做、不用口號喊**:每篇至少一段標明檔名路徑的最小可跑程式碼(見〈每篇的程式碼範例〉);該講「為什麼這段值得進 git、review 的人該看什麼」的時候就明講(#2、#7、#13 是主場),其餘篇章讓範例自己說話,不要每篇結尾硬套同一句口號。
- **cross-link 是重點**:發布工程/自動化 ↔ `[[sre-automation-release]]`、`[[sre-toil]]`、`[[sre-testing]]`;交付原則 ↔ `[[iac-test-deliver]]`、`[[iac-everything-as-code]]`;實際執行 ↔ `[[ansible-playbooks]]`、`[[k8s-packaging]]`、`[[k8s-scheduling-advanced]]`;觀測 ↔ `[[obs-metrics-prometheus]]`;排程/重跑對照 ↔ `[[airflow-intro]]`(工作流引擎 vs CI 引擎的界線,#1 或 #11 點一下)。
- Git:開 branch → push → PR,不直接動 master(CLAUDE.md 硬規矩)。
