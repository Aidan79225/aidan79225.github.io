---
title: "Multibranch 與 PR 觸發:讓每個分支都有自己的 pipeline"
date: 2026-08-25
category: tech
description: "一個 repo 同時有 main、五個 feature branch、三個 PR——Multibranch Pipeline 讓它們各自跑自己那版的 Jenkinsfile,連 pipeline 的改動都能在 PR 上被驗證。這篇講自動發現與 job 的生命週期、webhook 為什麼該取代 polling、required status check 怎麼把「大家記得跑測試」變成「不需要記得」,以及最重要的一件事:trunk-based 不是叫工程師勤勞一點,而是先把「合併」與「發布」這兩件事解開——用不接線、抽象層或旗標,讓程式碼進得了主幹,再單獨決定誰看得到。"
tags:
  - jenkins
  - ci-cd
  - branching
series: "Jenkins 學習筆記"
seriesOrder: 8
comments: true
draft: false
---
前面七篇談的都是「一條 pipeline」。但真實的 repo 從來不只有一條路:main 上有人在合、三個 feature branch 在跑、還有兩個 PR 等著 review。

這篇處理的就是這件事——**怎麼讓每個分支與 PR 都有自己的 pipeline**,以及為什麼這件事做好之後,你才真的擁有[[jenkins-intro|第 1 篇]]說的那個「頻繁合回主幹」。

## Multibranch Pipeline:一個 repo,一群 pipeline

Multibranch 做的事很單純:掃描 repo,**凡是有 Jenkinsfile 的分支與 PR,自動長出一個 job**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 262" role="img" aria-label="Multibranch Pipeline 的自動發現與生命週期。左邊一個 git 儲存庫底下有主幹 main、兩個功能分支、以及兩個來自 PR 的分支。Jenkins 收到 webhook 通知後掃描,凡是帶有 Jenkinsfile 的分支與 PR 都自動長出一個對應的 job,右邊因此出現五個 job,而且每一個 job 執行的是那個分支自己那一版的 Jenkinsfile,不是共用一份。下方兩個重點:第一,分支被刪掉之後對應的 job 也會依照孤兒 job 清理策略自動消失,否則就會變成堆積;第二,因為每個分支跑自己那版 Jenkinsfile,所以修改 pipeline 本身的 PR,會用改過之後的版本來執行——pipeline 的變更因此也能在合併前被 review 與驗證。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="mb1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="14" y="30" width="150" height="152" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/><text x="89" y="48" fill="#e6e6e6" font-size="9" text-anchor="middle" font-weight="bold">payment-api(repo)</text>
    <rect x="26" y="58" width="126" height="20" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="89" y="72" fill="#e6e6e6" font-size="7.6" text-anchor="middle">main</text>
    <rect x="26" y="82" width="126" height="20" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="89" y="96" fill="#9aa4b2" font-size="7.6" text-anchor="middle">feature/refund</text>
    <rect x="26" y="106" width="126" height="20" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="89" y="120" fill="#9aa4b2" font-size="7.6" text-anchor="middle">feature/webhook</text>
    <rect x="26" y="130" width="126" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="89" y="144" fill="#54b890" font-size="7.6" text-anchor="middle">PR #12</text>
    <rect x="26" y="154" width="126" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="89" y="168" fill="#54b890" font-size="7.6" text-anchor="middle">PR #15</text>
    <line x1="164" y1="106" x2="212" y2="106" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#mb1)"/><text x="188" y="98" fill="#9aa4b2" font-size="7.4" text-anchor="middle">webhook</text><text x="188" y="120" fill="#9aa4b2" font-size="7.4" text-anchor="middle">掃描</text>
    <rect x="214" y="72" width="118" height="66" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/><text x="273" y="94" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">Multibranch</text><text x="273" y="110" fill="#9aa4b2" font-size="7.6" text-anchor="middle">有 Jenkinsfile 的</text><text x="273" y="124" fill="#9aa4b2" font-size="7.6" text-anchor="middle">就自動長一個 job</text>
    <line x1="332" y1="90" x2="376" y2="46" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#mb1)"/><line x1="332" y1="100" x2="376" y2="76" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#mb1)"/><line x1="332" y1="108" x2="376" y2="106" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#mb1)"/><line x1="332" y1="116" x2="376" y2="136" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#mb1)"/><line x1="332" y1="126" x2="376" y2="166" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#mb1)"/>
    <rect x="378" y="32" width="228" height="26" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="390" y="49" fill="#e6e6e6" font-size="7.8" text-anchor="start">job: main</text><text x="596" y="49" fill="#9aa4b2" font-size="7.2" text-anchor="end">跑 main 的 Jenkinsfile</text>
    <rect x="378" y="62" width="228" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="390" y="79" fill="#9aa4b2" font-size="7.8" text-anchor="start">job: feature/refund</text><text x="596" y="79" fill="#9aa4b2" font-size="7.2" text-anchor="end">跑「它自己那版」</text>
    <rect x="378" y="92" width="228" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="390" y="109" fill="#9aa4b2" font-size="7.8" text-anchor="start">job: feature/webhook</text><text x="596" y="109" fill="#9aa4b2" font-size="7.2" text-anchor="end">跑「它自己那版」</text>
    <rect x="378" y="122" width="228" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="390" y="139" fill="#54b890" font-size="7.8" text-anchor="start">job: PR-12</text><text x="596" y="139" fill="#9aa4b2" font-size="7.2" text-anchor="end">合併前先驗</text>
    <rect x="378" y="152" width="228" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="390" y="169" fill="#54b890" font-size="7.8" text-anchor="start">job: PR-15</text><text x="596" y="169" fill="#9aa4b2" font-size="7.2" text-anchor="end">合併前先驗</text>
    <text x="310" y="206" fill="#d6a45c" font-size="9.2" text-anchor="middle" font-weight="bold">每個分支跑「它自己那一版」Jenkinsfile,不是共用一份</text>
    <text x="310" y="224" fill="#9aa4b2" font-size="8.4" text-anchor="middle">所以改 pipeline 的 PR,是用改過之後的版本跑的——建置流程的變更,合併前就被驗過了</text>
    <text x="310" y="246" fill="#9aa4b2" font-size="8.4" text-anchor="middle">分支刪掉,對應的 job 也要跟著消失(孤兒 job 清理策略)——否則就是下一批要清的堆積</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">這張圖最值得記住的是中間那句:<b>PR 是用它自己那版 Jenkinsfile 跑的</b>。這代表「改建置流程」跟「改業務程式碼」享有完全一樣的待遇——寫進 PR、被 review、在合併前先跑一次證明它會動。第 2 篇說「pipeline 是程式碼」,multibranch 才讓這句話真正閉環</figcaption>
</figure>

設定本身也該是程式碼([[jenkins-credentials|第 6 篇]]的立場一路延伸到這裡),用 JCasC 寫大概長這樣:

```yaml
# jenkins.yaml —— Multibranch,連掃描規則與孤兒清理都寫進 git
jobs:
  - script: >
      multibranchPipelineJob('payment-api') {
        branchSources { github { id('payment-api'); repoOwner('acme'); repository('payment-api') } }
        orphanedItemStrategy {                  // 分支刪了,job 也清掉
          discardOldItems { numToKeep(10) }
        }
        factory { workflowBranchProjectFactory { scriptPath('Jenkinsfile') } }
      }
```

如果整個 organization 都用同一套慣例,還可以再上一層用 **Organization Folder**:掃整個 GitHub org,任何 repo 只要放了 Jenkinsfile 就自動接上 CI——新專案不用「找人幫忙開 job」。

## Webhook vs Polling

Jenkins 怎麼知道有新 commit?兩條路:

| | Polling(定時去問) | Webhook(它主動通知) |
|---|---|---|
| 延遲 | 平均是掃描間隔的一半——設 5 分鐘,平均白等 2.5 分鐘 | 幾秒 |
| 成本 | repo 一多就是持續的無效流量,controller 一直在跟 git 講話 | 事件才有動作 |
| 網路 | Jenkins 連得出去就行 | git 服務要連得到 Jenkins(內網要處理) |

**能用 webhook 就用 webhook。** polling 是很典型的 [[sre-toil|toil]]:重複、可自動化、而且量會隨規模線性長大——一百個 repo 每兩分鐘掃一次,那是三萬次無效請求。

唯一合理留著 polling 的情況,是 Jenkins 在內網、git 服務打不進來。這時折衷做法是把間隔拉長(例如 15 分鐘)當保險,主要靠開發者手動觸發,或改用 GitHub App / 反向代理把 webhook 送進來。

## PR check:把「記得跑測試」變成「不需要記得」

Multibranch 會為每個 PR 跑一次 build,並把結果回報成 GitHub 上的 status check。真正的價值在下一步:**把它設成 required**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 214" role="img" aria-label="必要狀態檢查如何把合併變成一道擋得住的門。上排是一個測試沒過的 PR:建置通過、測試失敗、靜態檢查通過,即使已經有一個人核准,合併按鈕仍然是灰的按不下去。下排是同一個 PR 修好之後:三個檢查全綠加上一個核准,合併按鈕才亮起來。底部說明:這不是不信任人,而是不讓「忘記」有機會變成事故;同時提醒 PR 的建置不應該帶著任何部署憑證,因為它執行的是外部帶進來的程式碼。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <text x="16" y="26" fill="#e0733a" font-size="9.6" text-anchor="start" font-weight="bold">測試沒過的 PR</text>
    <rect x="16" y="34" width="104" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="68" y="50" fill="#e6e6e6" font-size="8.4" text-anchor="middle">PR #12</text><text x="68" y="64" fill="#9aa4b2" font-size="7.4" text-anchor="middle">3 個檔案</text>
    <rect x="136" y="30" width="92" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="182" y="44" fill="#54b890" font-size="7.6" text-anchor="middle">✓ build</text>
    <rect x="136" y="54" width="92" height="20" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="182" y="68" fill="#e0733a" font-size="7.6" text-anchor="middle">✗ test</text>
    <rect x="136" y="78" width="92" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="182" y="92" fill="#54b890" font-size="7.6" text-anchor="middle">✓ lint</text>
    <rect x="244" y="42" width="92" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="290" y="58" fill="#9aa4b2" font-size="7.6" text-anchor="middle">👤 1 approval</text>
    <rect x="356" y="40" width="120" height="28" rx="5" fill="#2a2f3d" stroke="#3a4154" stroke-width="1.3"/><text x="416" y="58" fill="#6b7280" font-size="8.6" text-anchor="middle" font-weight="bold">Merge(按不下去)</text>
    <text x="492" y="58" fill="#9aa4b2" font-size="7.6" text-anchor="start">有人核准也沒用</text>
    <line x1="16" y1="112" x2="604" y2="112" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="16" y="134" fill="#54b890" font-size="9.6" text-anchor="start" font-weight="bold">修好之後</text>
    <rect x="16" y="142" width="104" height="40" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="68" y="158" fill="#e6e6e6" font-size="8.4" text-anchor="middle">PR #12</text><text x="68" y="172" fill="#9aa4b2" font-size="7.4" text-anchor="middle">4 個檔案</text>
    <rect x="136" y="138" width="92" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="182" y="152" fill="#54b890" font-size="7.6" text-anchor="middle">✓ build</text>
    <rect x="136" y="162" width="92" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="182" y="176" fill="#54b890" font-size="7.6" text-anchor="middle">✓ test</text>
    <rect x="244" y="150" width="92" height="24" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="290" y="166" fill="#9aa4b2" font-size="7.6" text-anchor="middle">👤 1 approval</text>
    <rect x="356" y="148" width="120" height="28" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.6"/><text x="416" y="166" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">Merge ✓</text>
    <text x="492" y="166" fill="#9aa4b2" font-size="7.6" text-anchor="start">機制放行,不靠自律</text>
    <text x="310" y="204" fill="#9aa4b2" font-size="8.4" text-anchor="middle">不是不信任人——是不讓「忘記」有機會變成事故。另外:PR build 跑的是外部帶進來的程式碼,別給它部署憑證</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Required check 把品質從「每個人都要記得」變成「系統擋著」。這是我認為投報率最高的一次性設定之一:設定一次,之後每一個 PR 都自動享有</figcaption>
</figure>

同一份 Jenkinsfile 要能分辨自己現在跑在哪種情境,靠的是分支條件:

```groovy
stages {
  stage('Verify') {                      // 所有分支與 PR 都跑,要快
    steps { sh './scripts/ci-verify.sh' }
  }
  stage('Full IT') {
    when { beforeAgent true; not { changeRequest() } }   // PR 不跑重的
    steps { sh './scripts/it.sh' }
  }
  stage('Deploy staging') {
    when { beforeAgent true; branch 'main' }             // 只有 main 才部署
    steps { deployApp(env: 'staging', image: "app:${env.GIT_COMMIT}") }
  }
  stage('Release') {
    when { beforeAgent true; buildingTag() }             // 打 tag 才發版
    steps { deployApp(env: 'production', image: "app:${env.TAG_NAME}") }
  }
}
```

`beforeAgent true` 的重要性在[[jenkins-pipeline-advanced|第 5 篇]]講過:沒有它,Jenkins 會先配好 agent、拉完程式碼,才發現這個 stage 不用跑。

## 但 trunk-based 不是叫工程師勤勞一點

技術設定到這裡就齊了:每個分支有 pipeline、PR 有擋得住的門、main 才部署。但這些都不會自動讓分支變短——因為**分支活多久,常常根本不是工程師決定的。**

第 1 篇提過這條線,這裡把它講完。關鍵是分清楚兩件被綁在一起的事:

- **合併(merge)**:程式碼進不進得了主幹——這是**工程**決定。
- **發布(release)**:功能給不給使用者看見——這是**商業**決定。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 196" role="img" aria-label="合併與發布解耦之後的時間軸。上面一排是程式碼:從第一天到第十八天,每一兩天就有一次小合併進入主幹,而且每次合併之後都照常部署上線,總共十次左右。下面一排是使用者看得到的功能:從第一天到第十九天,旗標一直是關的,使用者什麼都沒看到,直到第二十天把旗標打開,功能才對使用者出現,而那一刻不需要部署、也不需要合併任何程式碼。結論:程式碼已經進主幹、甚至已經在線上跑,不等於使用者看得到——把這兩條線分開,工程節奏與商業節奏就不用互相等待。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <text x="16" y="30" fill="#54b890" font-size="9" text-anchor="start" font-weight="bold">程式碼:每天進主幹、照常上線</text>
    <line x1="40" y1="58" x2="588" y2="58" stroke="#3a4154" stroke-width="1.3"/>
    <circle cx="70" cy="58" r="5" fill="#223528" stroke="#54b890" stroke-width="1.5"/><circle cx="122" cy="58" r="5" fill="#223528" stroke="#54b890" stroke-width="1.5"/><circle cx="174" cy="58" r="5" fill="#223528" stroke="#54b890" stroke-width="1.5"/><circle cx="226" cy="58" r="5" fill="#223528" stroke="#54b890" stroke-width="1.5"/><circle cx="278" cy="58" r="5" fill="#223528" stroke="#54b890" stroke-width="1.5"/><circle cx="330" cy="58" r="5" fill="#223528" stroke="#54b890" stroke-width="1.5"/><circle cx="382" cy="58" r="5" fill="#223528" stroke="#54b890" stroke-width="1.5"/><circle cx="434" cy="58" r="5" fill="#223528" stroke="#54b890" stroke-width="1.5"/><circle cx="486" cy="58" r="5" fill="#223528" stroke="#54b890" stroke-width="1.5"/><circle cx="538" cy="58" r="5" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="314" y="44" fill="#9aa4b2" font-size="7.6" text-anchor="middle">每 1~2 天一次小合併 + 部署</text>
    <text x="16" y="96" fill="#d6a45c" font-size="9" text-anchor="start" font-weight="bold">使用者看到的:旗標決定</text>
    <line x1="40" y1="126" x2="560" y2="126" stroke="#3a4154" stroke-width="1.3" stroke-dasharray="3 3"/>
    <line x1="40" y1="126" x2="538" y2="126" stroke="#d6a45c" stroke-width="2.4"/>
    <text x="280" y="118" fill="#d6a45c" font-size="7.8" text-anchor="middle">flag = off —— 使用者什麼都沒看到</text>
    <circle cx="538" cy="126" r="7" fill="#3a2d1f" stroke="#d6a45c" stroke-width="2"/>
    <line x1="538" y1="126" x2="580" y2="126" stroke="#54b890" stroke-width="2.4"/>
    <text x="556" y="146" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">flag = on</text>
    <text x="556" y="160" fill="#9aa4b2" font-size="7.4" text-anchor="middle">不用部署、不用合併</text>
    <text x="310" y="182" fill="#d6a45c" font-size="9.2" text-anchor="middle" font-weight="bold">程式碼進主幹、甚至已經在線上跑 ≠ 使用者看得到</text>
    <text x="310" y="194" fill="#9aa4b2" font-size="8.2" text-anchor="middle">兩條線分開,工程節奏與商業節奏就不必互相等待——這才是 trunk-based 真正的前提</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">上面那排綠點是<b>整合風險被攤平</b>的樣子:每次只進來一點點,錯了退一小塊。下面那條線則讓商業端保有完整的決定權——上線時間點沒有被工程進度綁架,反而更可控</figcaption>
</figure>

解開的手段有三階,選最便宜的那個就好:

| 手段 | 什麼時候用 | 代價 |
|---|---|---|
| **不接線** | 新類別、新 API、新頁面——合進去但不掛路由與選單 | 幾乎零 |
| **Branch by abstraction** | 要替換既有實作:介面與新實作先合,舊的照跑,最後切換 | 多一層抽象,切完要記得拆 |
| **Feature flag** | 真的需要執行期分流:灰度、A/B、按客戶開關 | 最貴,而且會弄髒程式碼 |

**大部分「還不能合」其實只要不接線就解決了。** 旗標是最貴的一把,別拿它當萬用解。

而如果真的要用旗標,就要連清理紀律一起買——這三條我在 review 會直接要求:

1. **每個旗標上線時就寫下擁有者與預計移除日期**,寫在程式碼註解或旗標系統裡都行,但要寫。
2. **旗標只做開關,不做業務邏輯的分岔點**——一旦 `if (flag)` 底下長出第二套流程,它就不是旗標了,是一個沒人維護的分支。
3. **定期盤點**,過期的要嘛清掉、要嘛重新說明為什麼還在。

做不到這三條,我不會建議一個團隊為了追求 trunk-based 而大量導入旗標——那真的會換來比長命分支更糟的東西。

## 反思

### Required check 是我做過投報率最高的一次性設定

我在幾個團隊都做過同一件事:把 build、test、lint 設成 required,並開啟「分支落後主幹時要先更新才能合」。設定大概花二十分鐘,之後每一個 PR 都自動享有。

它真正改變的不是品質,是**對話的內容**。在那之前,review 常常在講「你這個有跑測試嗎」「記得補一下 lint」;之後這些話題完全消失了,因為機器已經講完了,人可以專心討論設計。**把機器能檢查的事交給機器,人的注意力才有機會放在機器檢查不了的地方**——這是我認為 required check 最被低估的價值。

有一點要提醒:PR build 跑的是外部帶進來的程式碼,所以它不該拿得到任何部署憑證,理由在[[jenkins-credentials|第 6 篇]]講過。

### 我看過 polling 把一台 Jenkins 拖垮

有個環境累積到大約兩百個 job,每個都設 `H/2 * * * *`(每兩分鐘 poll 一次)。結果 controller 幾乎所有時間都在跟 git 講話,執行緒池被 polling 佔滿,**真正的 build 反而排不進去**——大家的體感是「Jenkins 好慢」,但沒有人想到慢的原因是它在忙著問「有沒有新東西」。

改成 webhook 之後,那些請求歸零,順帶把觸發延遲從平均一分鐘變成幾秒。這件事讓我學到一個更一般的教訓:**輪詢的成本會隨規模線性成長,但它平常完全不痛**——它不會壞、不會報錯,只會安靜地吃掉你的容量,直到某天你以為自己需要加機器。

### 分支保護是要保護主幹,不是為難開發者

反過來的失敗我也看過:某個團隊把六個 check 全設成 required,其中兩個各要跑十幾分鐘。結果不是品質變好,是**大家開始想辦法繞過去**——小修改直接推 main(因為有管理員權限)、或是把 check 設成 optional 之後忘了改回來。

我現在的原則是:**每個 required check 都要能回答「它擋掉過什麼」**。擋過真實問題的,留著;從來沒紅過、或紅了大家都直接 re-run 的,那不是關卡,是儀式——該修好它、加快它,或乾脆拿掉。門檻設得比團隊承受能力高,人不會變乖,只會找路繞——而繞過去之後,你連他們繞了都不知道。

下一篇進第三批,談品質關卡本身:測試報告、覆蓋率與靜態分析,怎麼從「有跑」變成「擋得住」,以及為什麼 flaky test 是這道門最大的敵人。
