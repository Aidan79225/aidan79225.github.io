---
title: "Workspace 與 Artifact:build 出來的東西去哪了"
date: 2026-08-23
category: tech
description: "同一個 commit,在 CI 上綠燈、在同事機器上爆掉——十次有八次是 workspace 裡上一次 build 留下的殘骸在幫忙。這篇講清楚檔案在 Jenkins 裡的四種住處(workspace / stash / archive / artifact repository)各自的壽命與可見範圍、fingerprint 怎麼回答「線上這顆是哪次 build 出來的」,以及快取這件事的本質:它是拿可重現去換速度,你至少要知道自己在換什麼。"
tags:
  - jenkins
  - ci-cd
  - build
series: "Jenkins 學習筆記"
seriesOrder: 4
comments: true
draft: false
---
上一篇解決了「在哪台機器上跑」。這一篇往下挖一層:**跑起來之後,檔案到底放在哪、留多久、誰看得到。**

這聽起來很枝微末節,但它其實是整個系列主軸裡「可重現」最常破功的地方——而且破得很安靜:你的 CI 一片綠,問題要等到換一台機器、或某個同事拉下同一個 commit 的時候才會現形。

## Workspace:一個會被重複使用的目錄

Jenkins 在 agent 上給每個 job 一個工作目錄,大概長這樣:

```
/home/jenkins/workspace/payment-api-build/        ← 一般 job
/home/jenkins/workspace/payment-api_feature-abc/  ← multibranch 會帶分支名
```

關鍵是這句:**下一次同一個 job 跑,預設還是用同一個目錄。** 這是刻意的設計,為了快——git 只要抓增量、相依不用重載、編譯可以增量。代價是:**上一次 build 留下的東西,還在那裡。**

而 `checkout` 只會把「git 追蹤的檔案」更新到目標版本;那些 build 過程產生、卻沒被 git 追蹤的檔案,它一個都不會清:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 244" role="img" aria-label="髒 workspace 造成的假綠燈。第一步:build 編號 41 跑完,workspace 裡留下編譯產物 target 目錄、node_modules、build 過程產生的設定檔、以及相依快取。第二步:build 編號 42 開始,checkout 只把 git 追蹤的檔案更新到新版本,那些沒被 git 追蹤的殘留檔案原封不動留著。第三步:build 42 綠燈通過,但測試其實讀到的是 41 留下來的設定檔,換一台乾淨的機器就會爆掉。底部提問:同一個 commit,在一個全新的環境跑,還會過嗎?答不出來,你的綠燈就是靠殘留撐著。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="wa1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="14" y="26" width="180" height="86" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="104" y="46" fill="#e6e6e6" font-size="9.6" text-anchor="middle" font-weight="bold">① build #41 跑完</text><text x="104" y="64" fill="#9aa4b2" font-size="8" text-anchor="middle">target/ · node_modules/</text><text x="104" y="79" fill="#9aa4b2" font-size="8" text-anchor="middle">build 時產生的 config.yml</text><text x="104" y="94" fill="#9aa4b2" font-size="8" text-anchor="middle">.gradle / .m2 快取</text><text x="104" y="107" fill="#d6a45c" font-size="7.6" text-anchor="middle">全部留在 workspace 裡</text>
    <line x1="194" y1="69" x2="214" y2="69" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#wa1)"/>
    <rect x="216" y="26" width="180" height="86" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="306" y="46" fill="#e6e6e6" font-size="9.6" text-anchor="middle" font-weight="bold">② build #42 開始</text><text x="306" y="66" fill="#9aa4b2" font-size="8" text-anchor="middle">checkout 更新 git 追蹤的檔案</text><text x="306" y="83" fill="#e0733a" font-size="8.2" text-anchor="middle">沒被追蹤的殘骸 → 原封不動</text><text x="306" y="101" fill="#9aa4b2" font-size="7.8" text-anchor="middle">(它不是 clean,只是 update)</text>
    <line x1="396" y1="69" x2="416" y2="69" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#wa1)"/>
    <rect x="418" y="26" width="188" height="86" rx="8" fill="#3a2626" stroke="#e0733a" stroke-width="1.6"/><text x="512" y="46" fill="#e6e6e6" font-size="9.6" text-anchor="middle" font-weight="bold">③ build #42 綠燈 ✓</text><text x="512" y="66" fill="#9aa4b2" font-size="8" text-anchor="middle">但測試讀到的是 #41 產生的</text><text x="512" y="80" fill="#9aa4b2" font-size="8" text-anchor="middle">那份 config.yml</text><text x="512" y="100" fill="#e0733a" font-size="8.4" text-anchor="middle" font-weight="bold">換一台乾淨機器 → 爆</text>
    <rect x="14" y="128" width="592" height="30" rx="6" fill="#1f2430" stroke="#d6a45c" stroke-width="1.3"/><text x="310" y="147" fill="#d6a45c" font-size="9" text-anchor="middle">同一個 workspace 目錄,被 #41、#42、#43… 重複使用——它是一個沒人在管的共用狀態</text>
    <text x="310" y="186" fill="#e6e6e6" font-size="9.6" text-anchor="middle" font-weight="bold">檢驗問題:同一個 commit,在一個全新的環境跑,還會過嗎?</text>
    <text x="310" y="206" fill="#9aa4b2" font-size="8.6" text-anchor="middle">答不出來,你的綠燈就是靠殘留撐著——而殘留遲早會被清掉、或換一台 agent 就消失</text>
    <text x="310" y="228" fill="#9aa4b2" font-size="8.6" text-anchor="middle">這也是「在我機器上明明可以」的反面:<tspan fill="#e0733a">在 CI 上明明可以</tspan></text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">髒 workspace 最壞的地方不是它會讓 build 失敗,而是它會讓 build <b>不該過卻過了</b>。失敗至少會被發現;假綠燈會一路放行到 Production,然後在某次換機器、清目錄之後,以「莫名其妙壞掉」的形式回來找你</figcaption>
</figure>

處理方式有三層,由輕到重:

```groovy
pipeline {
  agent { label 'linux' }
  stages {
    stage('Build') {
      steps {
        sh './gradlew clean assemble'   // ① 最輕:讓建置工具自己清它的產物
      }
    }
  }
  post {
    cleanup { cleanWs() }               // ② 每次跑完清掉整個 workspace
  }
}
```

第三層是根本解:**每次 build 開一個全新的容器或 pod**(第 12 篇),那就沒有「上一次」可言了。

取捨很直接:**乾淨 = 慢**。所以我的實務作法是分開處理——PR build 允許重用 workspace 換速度,但**發布用的 build 一定乾淨跑**;另外排一條每天一次的乾淨建置,專門用來抓「我們是不是又開始依賴殘留了」。

## 檔案的四種住處,壽命完全不同

Jenkins 裡「把檔案留下來」有四種方式,新手最常搞混。它們真正的差別是**活多久**與**誰看得到**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 268" role="img" aria-label="檔案四種住處的壽命與可見範圍對照。橫軸是壽命,由左到右從這個 stage、這次 build、保留策略決定、到長期版本化。縱軸是可見範圍,由下到上從單一 agent、這次 build 內、團隊看得到、到全公司與下游系統。左下角是 workspace,只在那台 agent 上,下次 build 可能還在也可能被清掉,用途是幹活的地方。中間偏左是 stash 與 unstash,存在 controller 上,只在這次 build 內有效,用途是跨 stage 或跨 agent 搬運檔案,不適合搬幾百 MB。中間是 archiveArtifacts,跟著 build 紀錄保存,受保留策略影響,團隊可以在 UI 上下載,用途是稽核與查看。右上角是 artifact repository,例如 Nexus、Artifactory 或容器 registry,長期保存、有版本、不可變,全公司與下游系統取用,是正式產物真正該住的地方。底部結論:用途決定住處,搬運用 stash、稽核用 archive、發佈用 repository。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="wb1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="60" y1="212" x2="600" y2="212" stroke="#3a4154" stroke-width="1.3" marker-end="url(#wb1)"/>
    <line x1="60" y1="212" x2="60" y2="24" stroke="#3a4154" stroke-width="1.3" marker-end="url(#wb1)"/>
    <text x="330" y="232" fill="#9aa4b2" font-size="8.6" text-anchor="middle">壽命 —— 這個 stage → 這次 build → 保留策略決定 → 長期、版本化</text>
    <text x="20" y="120" fill="#9aa4b2" font-size="8.6" text-anchor="middle" transform="rotate(-90 20 120)">可見範圍 —— 一台 agent → 全公司</text>
    <rect x="72" y="158" width="126" height="46" rx="7" fill="#3a2626" stroke="#e0733a" stroke-width="1.5"/><text x="135" y="176" fill="#e6e6e6" font-size="9.2" text-anchor="middle" font-weight="bold">workspace</text><text x="135" y="190" fill="#9aa4b2" font-size="7.6" text-anchor="middle">幹活的地方</text><text x="135" y="200" fill="#e0733a" font-size="7.4" text-anchor="middle">下次可能還在,也可能沒了</text>
    <rect x="212" y="112" width="126" height="46" rx="7" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.5"/><text x="275" y="130" fill="#e6e6e6" font-size="9.2" text-anchor="middle" font-weight="bold">stash / unstash</text><text x="275" y="144" fill="#9aa4b2" font-size="7.6" text-anchor="middle">跨 stage、跨 agent 搬運</text><text x="275" y="154" fill="#d6a45c" font-size="7.4" text-anchor="middle">build 結束就消失</text>
    <rect x="352" y="76" width="126" height="46" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="415" y="94" fill="#e6e6e6" font-size="9.2" text-anchor="middle" font-weight="bold">archiveArtifacts</text><text x="415" y="108" fill="#9aa4b2" font-size="7.6" text-anchor="middle">跟著 build 紀錄</text><text x="415" y="118" fill="#4f6df5" font-size="7.4" text-anchor="middle">稽核與查看用</text>
    <rect x="466" y="30" width="140" height="46" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.7"/><text x="536" y="48" fill="#e6e6e6" font-size="9.2" text-anchor="middle" font-weight="bold">artifact repository</text><text x="536" y="62" fill="#9aa4b2" font-size="7.6" text-anchor="middle">Nexus / Artifactory / registry</text><text x="536" y="72" fill="#54b890" font-size="7.4" text-anchor="middle">有版本、不可變、下游取用</text>
    <text x="330" y="252" fill="#d6a45c" font-size="9.6" text-anchor="middle" font-weight="bold">用途決定住處:搬運用 stash · 稽核用 archive · 發佈用 repository</text>
    <text x="330" y="266" fill="#9aa4b2" font-size="8.6" text-anchor="middle">最常見的誤用,是把 Jenkins 的 archive 當成發佈通道——讓下游直接從 build 頁面抓檔案</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">四者不是替代關係,是<b>不同壽命的層級</b>。往右上走一格,東西活得更久、看得到的人更多,但你也要為它多負一分責任(命名、版本、保留策略、儲存成本)</figcaption>
</figure>

寫成程式碼是這樣:

```groovy
pipeline {
  agent none
  stages {
    stage('Build') {
      agent { label 'linux' }
      steps {
        sh './gradlew clean assemble'
        stash name: 'jar', includes: 'build/libs/*.jar'   // 搬給下一個 stage(可能在別台機器)
      }
    }
    stage('Integration Test') {
      agent { label 'linux && docker' }                   // 換 agent = 換 workspace,檔案不會自己跟過來
      steps {
        unstash 'jar'
        sh './scripts/it.sh'
      }
    }
    stage('Publish') {
      agent { label 'linux' }
      steps {
        unstash 'jar'
        archiveArtifacts artifacts: 'build/libs/*.jar', fingerprint: true   // 留紀錄
        sh './scripts/publish-to-nexus.sh'                                  // 真正的發佈
      }
    }
  }
}
```

`stash` 有個容易踩的坑:**它會把檔案送回 controller 暫存**。搬幾 MB 的產物很合理,搬幾百 MB 的 `node_modules` 就是在拿 controller 的硬碟和網路開玩笑——那種東西該重裝或走遠端快取,不該 stash。

## Fingerprint:這顆 jar 是哪一次 build 出來的

`fingerprint: true` 只多做一件事:記下檔案的雜湊值。但它換來的能力很關鍵——**跨 job 追蹤同一個檔案**:哪次 build 產出了它、哪些下游 job 用了它。

事故當下你要回答的問題往往是:「線上這顆 jar,是哪個 commit build 出來的?」沒有 fingerprint,你只能靠檔名和時間戳去猜;有了它,Jenkins 直接告訴你來源那次 build,而那次 build 又綁著 commit 與當時的 Jenkinsfile(第 2 篇那張圖的價值就在這裡兌現)。

不過老實說,fingerprint 是**補救措施**。更根本的作法是產物本身就帶不可變的版本(語意化版本 + commit SHA),而且 [[sre-automation-release|一顆產物走完所有環境]],不要每個環境各 build 一次——那是第 11 篇的主題。

## 快取:拿可重現去換速度

快取幾乎是所有 CI 加速討論的第一招,但很少人講清楚它的本質:**快取就是刻意保留上一次的狀態。** 也就是說,它跟前面講的「髒 workspace」是同一件事的兩面——差別只在於一個是你有意識地留,一個是你不知道它還在。

三種快取的乾淨程度差很多:

| 作法 | 速度 | 可重現性 | 我的看法 |
|---|---|---|---|
| 直接靠 workspace 殘留 | 最快 | 最差 | 這不是快取,是運氣 |
| agent 上的共用目錄(`~/.m2`、`~/.gradle`) | 快 | 中等 | 常見且堪用,但要接受「不同 agent 結果可能不同」 |
| 遠端快取 / 內部 mirror(內容定址、可鎖版本) | 中等 | 好 | 值得投資,尤其相依很多的專案 |

我的原則是:**PR build 可以吃快取,發布用的 build 要乾淨**;另外固定跑一條不吃快取的建置(每天或每次 release 前),當作「可重現性的體檢」。快取壞掉的成本,通常不是慢,是**它讓你 build 出一顆跟你以為的不一樣的東西**。

## Hermetic build 在 Jenkins 上能做到幾分

Google SRE 講發布工程時強調 hermetic build:同樣的原始碼,今天 build、半年後 build、在誰的機器上 build,都吐出一樣的結果。完全做到很難,但可以拿四個問題來體檢:

1. **工具鏈固定了嗎?** JDK / Node / 編譯器版本寫在哪?(寫在容器映像檔裡 > 寫在 agent 上)
2. **相依鎖住了嗎?** 有 lockfile 嗎?會不會抓到 `latest`?外部來源掛掉時 build 會不會用到不同版本?
3. **環境殘留清掉了嗎?** 上面整篇講的事。
4. **有沒有藏著時間與隨機性?** 產物裡有沒有 build 時間戳、隨機 ID,讓兩次 build 的位元永遠對不起來?

Jenkins 本身只給你地基:**agent 可拋棄**(第 3 篇)、**Jenkinsfile 進 git**(第 2 篇)。剩下四題全都要靠專案自己回答——這也是為什麼我認為「CI 工具選哪家」遠沒有大家想像的重要,真正決定可重現性的是這四題。

## 反思

### 「重跑一次就好了」是狀態問題,不是 flaky

團隊裡最常見的一句話是「這個 build 怪怪的,重跑一次就過了」。以前我也跟著鬆一口氣,現在我把它當成警訊:**同一個 commit,兩次跑出不同結果,代表結果不只取決於程式碼。** 差異一定來自某個狀態——workspace 殘留、共用快取、agent 之間的差異、或是測試之間互相污染。

我的規則是:同一個 commit 重跑會過,就值得花二十分鐘查一次。查了通常會發現是一個很小的東西(某個測試會寫檔案到專案目錄、某個 port 被前一個 build 佔著、某個相依沒鎖版本)。而不查的代價是,這些小東西會累積成一個「大家都知道 CI 有時候會怪怪的」的文化——那時候你不只失去可重現性,還失去了紅燈的意義。

### 快取省下的時間,我曾經在一次事故裡全部還回去

有次為了加速,把相依快取設成全 agent 共用而且不設過期。跑了幾個月都很順,直到某次升級一個內部函式庫——版本號沒變、內容變了(對,這件事本身就有問題)。快取裡那份舊的一直被拿來用,於是 CI 上測的是舊版、Production 跑的是新版,兩邊行為不一樣,查了整整兩天。

那次之後我的立場很硬:**快取只能是效能手段,不能是正確性的一部分。** 具體來說就是:發布路徑上的 build 不吃可疑的快取;相依一律鎖版本;內部函式庫改內容一定換版本號。快取讓你快十分鐘,但它出錯時吃掉的是以「天」計的排查時間,而且通常發生在最不該發生的時候。

### 把 Jenkins 的 archive 當發佈通道,是我看過最常見的架構錯誤

很多團隊的下游流程,是直接從 Jenkins 的 build 頁面抓 jar 或 zip——URL 寫死在部署腳本或別的 job 裡。這件事在小團隊很方便,但它有兩個致命問題:**build 紀錄會被保留策略清掉**(那條 URL 有一天會 404),以及**沒有不可變的版本概念**(誰也說不準那個「最新成功的 build」現在指的是哪一顆)。

我的分工很明確:**archive 是給人看的,repository 是給機器取的。** Jenkins 上留一份方便查看與稽核、帶著 fingerprint;正式產物推進 Nexus / Artifactory / 容器 registry,帶上版本與 commit SHA,不可變、可稽核、有生命週期政策。部署流程只認 repository 裡的版本號——這樣「這版是哪來的」永遠有答案,而不是取決於某個 build 紀錄有沒有被清掉。

下一篇進入第二批,回到 Jenkinsfile 本身:平行、條件、失敗處理與那個很多人愛用、但代價比想像中高的人工核准關卡。
