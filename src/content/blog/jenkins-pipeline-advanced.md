---
title: "進階 pipeline:平行、條件、失敗處理與那個很貴的人工關卡"
date: 2026-08-23
category: tech
description: "一條 pipeline 從「會動」到「跑得快、失敗得清楚」,差的是這幾個東西:parallel 與 matrix 怎麼把牆鐘時間壓下來(以及它不是免費的)、when 加上 beforeAgent 才真的省得到、post 是唯一保證會執行的地方、timeout/retry/catchError 三把刀別拿錯——尤其 retry 用在網路、不該用來蓋 flaky test。最後談 input:那個看起來只是「等人按一下」、實際上會把 executor 跟 workspace 一起鎖住的最貴 step。"
tags:
  - jenkins
  - ci-cd
  - pipeline
series: "Jenkins 學習筆記"
seriesOrder: 5
comments: true
draft: false
---
前面四篇處理的是「在哪跑」與「東西放哪」。這一篇回到 Jenkinsfile 本身:同樣一條會動的 pipeline,怎麼讓它**跑得快、失敗得清楚、而且不會在半夜卡住一台機器**。

這批東西的共同點是:它們都很好學,但**用錯的代價要很久以後才會顯現**——尤其是 `retry` 跟 `input` 這兩個。

## 平行:最直接的加速,但不是免費的

最容易拿到的加速,是把互不相依的 stage 攤平一起跑:

```groovy
stage('Verify') {
  parallel {
    stage('Unit')        { steps { sh './scripts/unit.sh' } }
    stage('Integration') { agent { label 'linux && docker' }
                           steps { sh './scripts/it.sh' } }
    stage('Lint')        { steps { sh './scripts/lint.sh' } }
  }
}
```

效果是這樣:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 258" role="img" aria-label="序列與平行執行的牆鐘時間對照。上半部序列執行:單元測試四分鐘、整合測試六分鐘、靜態檢查一分鐘、打包映像檔三分鐘,一個接一個跑完共十四分鐘。下半部平行執行:四個工作同時從零分開始,最長的整合測試六分鐘結束時整體就結束,總共六分鐘。結論:平行後的總時間等於最慢的那一條,所以繼續加平行不會更快,要縮短的是那條最慢的。同時列出平行的三個代價:每條平行分支各佔一個 executor 格子、同一台機器上互搶 CPU 與硬碟、日誌交錯變得難讀。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <text x="16" y="26" fill="#e0733a" font-size="10" text-anchor="start" font-weight="bold">序列:一個接一個</text>
    <line x1="88" y1="72" x2="596" y2="72" stroke="#3a4154" stroke-width="1.1"/>
    <rect x="88" y="36" width="136" height="30" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="156" y="55" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Unit 4m</text>
    <rect x="224" y="36" width="204" height="30" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="326" y="55" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Integration 6m</text>
    <rect x="428" y="36" width="34" height="30" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="445" y="55" fill="#e6e6e6" font-size="7.4" text-anchor="middle">1m</text>
    <rect x="462" y="36" width="102" height="30" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="513" y="55" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Image 3m</text>
    <text x="588" y="55" fill="#e0733a" font-size="9.6" text-anchor="end" font-weight="bold">14m</text>
    <text x="88" y="86" fill="#9aa4b2" font-size="7.6" text-anchor="middle">0</text><text x="428" y="86" fill="#9aa4b2" font-size="7.6" text-anchor="middle">10 分</text>
    <text x="16" y="116" fill="#54b890" font-size="10" text-anchor="start" font-weight="bold">平行:同時開跑</text>
    <rect x="88" y="106" width="136" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="156" y="120" fill="#e6e6e6" font-size="8" text-anchor="middle">Unit 4m</text>
    <rect x="88" y="130" width="204" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.6"/><text x="190" y="144" fill="#e6e6e6" font-size="8" text-anchor="middle">Integration 6m ← 最慢的那條</text>
    <rect x="88" y="154" width="34" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="105" y="168" fill="#e6e6e6" font-size="7.4" text-anchor="middle">1m</text>
    <rect x="88" y="178" width="102" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="139" y="192" fill="#e6e6e6" font-size="8" text-anchor="middle">Image 3m</text>
    <line x1="292" y1="100" x2="292" y2="204" stroke="#54b890" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="302" y="204" fill="#54b890" font-size="9.6" text-anchor="start" font-weight="bold">6m —— 總時間 = 最慢的那一條</text>
    <text x="310" y="226" fill="#d6a45c" font-size="9.2" text-anchor="middle" font-weight="bold">所以再加平行不會更快,要動的是那條 6 分鐘的</text>
    <text x="310" y="244" fill="#9aa4b2" font-size="8.4" text-anchor="middle">平行的代價:每條各佔一個 executor 格子 · 同機互搶 CPU 與硬碟 · 日誌交錯變難讀</text>
    <text x="310" y="256" fill="#9aa4b2" font-size="8.4" text-anchor="middle">格子不夠時,「平行」會退化成「排隊」——只是排在 Jenkins 內部,你在 UI 上看不出來</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">平行化的收益有天花板,而且天花板由<b>最慢的那一條</b>決定。這也是為什麼「先量再改」很重要:很多團隊把四條快的攤平,省了兩分鐘,卻沒發現真正該處理的是那條六分鐘的整合測試</figcaption>
</figure>

`failFast: true` 可以在任一條失敗時砍掉其他條,省資源;但代價是你只會看到第一個錯,重跑才知道還有沒有別的。我的習慣是:**PR build 開 failFast(要快),主幹的定時 build 不開(要看全貌)。**

需要跑版本矩陣時用 `matrix`,它會自動展開組合:

```groovy
stage('Compat') {
  matrix {
    axes {
      axis { name 'JDK';  values '17', '21' }
      axis { name 'OS';   values 'linux', 'windows' }
    }
    excludes { exclude { axis { name 'OS'; values 'windows' }
                         axis { name 'JDK'; values '17' } } }   // 這組不測
    stages {
      stage('Test') { steps { sh "./scripts/test.sh --jdk=${JDK}" } }
    }
  }
}
```

矩陣很好用,但它會**乘法級地吃掉 executor**:2 × 2 就是四格,而且每一格都是一個完整的 workspace。開之前先看一眼你有幾個格子([[jenkins-controller-agent|第 3 篇那張派工圖]])。

## when:讓分支只跑該跑的,但記得加 beforeAgent

不是每個分支都需要跑完整條 pipeline:

```groovy
stage('Deploy to Staging') {
  when {
    beforeAgent true               // ← 關鍵:先判斷再決定要不要佔 agent
    branch 'main'
  }
  agent { label 'linux' }
  steps { sh './scripts/deploy.sh staging' }
}
```

**`beforeAgent true` 是這裡最容易漏的一行。** 沒有它,Jenkins 會先配一個 agent、拉一份程式碼,才發現條件不成立然後跳過——你省了執行時間,卻沒省到排隊與 checkout 的成本。在一個 stage 很多的 pipeline 上,這個差別很有感。

其他常用條件:`changeset '**/*.sql'`(只有動到 SQL 才跑遷移檢查)、`changeRequest()`(只在 PR 跑)、`expression { params.FULL_RUN }`。

但有條線我會守得很緊:**`when` 是拿來省時間的,不是拿來偷偷跳過品質關卡的。** 「這個分支比較急,先跳過整合測試」這種條件一旦寫進去,它會活得比那次急件久很多——關卡該怎麼設計是第 9 篇的主題。

## post:唯一保證會執行的地方

`post` 是 declarative 相對 scripted 最實用的一個好處:不用自己寫 `try/finally`。

```groovy
post {
  always    { junit 'build/test-results/**/*.xml' }        // 成敗都要收報告
  success   { sh './scripts/notify.sh ok' }
  failure   { sh './scripts/notify.sh fail' }
  unstable  { echo '測試有失敗,但 build 本身沒炸' }
  changed   { sh './scripts/notify.sh changed' }           // 只有狀態翻轉時才吵人
  cleanup   { cleanWs() }                                  // 最後一定跑,清 workspace
}
```

兩個常被忽略的:

- **`changed`** 只在「由綠轉紅」或「由紅轉綠」時執行。把通知掛在這裡,而不是 `failure`,可以讓一條連紅五天的 pipeline 不要吵五天——**通知的價值在於狀態改變,不在於現在是什麼狀態**。
- **`cleanup`** 保證最後執行,適合放清理;`always` 則是在成敗判定後、cleanup 之前跑。

## timeout、retry、catchError:三把刀,別拿錯

```groovy
options { timeout(time: 30, unit: 'MINUTES') }     // ① 整條 pipeline 的上限

stage('Fetch deps') {
  steps {
    retry(3) { sh './scripts/fetch-deps.sh' }      // ② 只包「會因為網路而失敗」的動作
  }
}

stage('Upload report') {
  steps {
    catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE') {
      sh './scripts/upload-report.sh'              // ③ 非關鍵:失敗就記一筆,別擋整條
    }
  }
}
```

三者的分工:

| | 用來對付 | 用錯的樣子 |
|---|---|---|
| **timeout** | 卡住不動的 build(等鎖、等回應、無窮迴圈) | 沒設——一條卡住的 build 佔著 executor 一整夜 |
| **retry** | **暫時性、外部、冪等**的失敗:拉相依、推 image、call API | 拿來包測試,把 flaky 蓋掉 |
| **catchError** | 非關鍵步驟失敗時不想擋住整條 | 包住關鍵步驟,讓紅的變綠的 |

**`retry` 的前提是那個動作冪等**——做兩次跟做一次結果一樣。拉相依、下載檔案沒問題;但「呼叫一個會扣款的 API」重試三次可能扣三次。這件事跟 [[sre-cron|排程任務要能安全重跑]] 是同一個道理,只是換了個場景。

至於 `timeout`,我的立場是**每條 pipeline 都該有一個**。理由在第 3 篇講過:卡住的 build 不會自己放手,它會抱著 executor 格子跟 workspace 睡到天亮,然後隔天早上所有人的 build 都在排隊。

## input:看起來最無害,實際上最貴的 step

`input` 讓 pipeline 停下來等人按「同意」。語法簡單到危險:

```groovy
stage('Approve') {
  steps {
    input message: '要部署到 Production 嗎?', ok: '部署', submitter: 'release-managers'
  }
}
```

問題是:**這個 stage 停在哪裡,它就抱著哪些資源。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 236" role="img" aria-label="人工核准關卡的兩種寫法對照。上面是錯誤寫法:整條 pipeline 綁在一個 agent 上,建置完成後停在 input 等人按同意,可能等一整夜,這段期間 executor 格子被佔住、workspace 被鎖著、其他 build 只能排隊。下面是正確寫法:核准放在一個 agent none 的獨立 stage,不佔任何 agent,並且加上 timeout 讓沒人按時自動結束,按下同意之後才重新配一台 agent 進行部署。底部提醒:更根本的作法是把要不要上線拆成另一條 pipeline,建置與部署不要綁在同一次執行裡。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="pa1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="16" y="26" fill="#e0733a" font-size="10" text-anchor="start" font-weight="bold">✗ input 卡在有 agent 的 stage 裡</text>
    <rect x="16" y="36" width="120" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="76" y="57" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Build(佔 agent)</text>
    <line x1="136" y1="53" x2="152" y2="53" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#pa1)"/>
    <rect x="154" y="36" width="286" height="34" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.7"/><text x="297" y="52" fill="#e6e6e6" font-size="8.8" text-anchor="middle">input:等人按「同意」</text><text x="297" y="65" fill="#e0733a" font-size="8" text-anchor="middle">可能等一整夜(下班了、在開會、忘了)</text>
    <line x1="440" y1="53" x2="456" y2="53" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#pa1)"/>
    <rect x="458" y="36" width="120" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="518" y="57" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Deploy</text>
    <text x="297" y="86" fill="#e0733a" font-size="8.2" text-anchor="middle">這段期間:executor 格子被佔 · workspace 被鎖 · 別人的 build 在排隊</text>
    <line x1="16" y1="100" x2="604" y2="100" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="16" y="122" fill="#54b890" font-size="10" text-anchor="start" font-weight="bold">✓ input 放在 agent none 的獨立 stage</text>
    <rect x="16" y="132" width="120" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="76" y="153" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Build(佔 agent)</text>
    <line x1="136" y1="149" x2="152" y2="149" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#pa1)"/>
    <rect x="154" y="132" width="286" height="34" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.6"/><text x="297" y="148" fill="#e6e6e6" font-size="8.8" text-anchor="middle">agent none + input + timeout</text><text x="297" y="161" fill="#54b890" font-size="8" text-anchor="middle">不佔 agent;沒人按就自動結束,不會卡到天亮</text>
    <line x1="440" y1="149" x2="456" y2="149" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#pa1)"/>
    <rect x="458" y="132" width="120" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="518" y="149" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Deploy</text><text x="518" y="161" fill="#9aa4b2" font-size="7.4" text-anchor="middle">按了才重配 agent</text>
    <text x="310" y="196" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">更根本的解法:把「要不要上線」拆成另一條 pipeline</text>
    <text x="310" y="214" fill="#9aa4b2" font-size="8.6" text-anchor="middle">建置與部署綁在同一次執行裡,等於讓一個人的猶豫,變成整個團隊的排隊</text>
    <text x="310" y="230" fill="#9aa4b2" font-size="8.6" text-anchor="middle">拆開之後:建置永遠跑完就結束,部署是拿著某顆已經存在的產物去執行</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">「等人按一下」在流程圖上只是一個小方框,在系統裡卻是一段<b>持有資源的等待</b>。最低限度要做的是把它移出 agent 並加上 timeout;真正乾淨的作法,是讓建置與部署成為兩件事</figcaption>
</figure>

還有一個配套是 `milestone`:當新版本已經跑到後面,擋住還卡在核准階段的舊版本,避免有人半夜按了同意、結果把三天前的舊產物推上去。

## 參數化:方便,但別變成 UI 點按鈕的復辟

```groovy
parameters {
  choice(name: 'TARGET', choices: ['staging', 'production'], description: '部署目標')
  booleanParam(name: 'FULL_RUN', defaultValue: false, description: '跑完整測試矩陣')
}
```

參數很有用,但我 review 時會盯一種用法:**拿參數當「跳過檢查」的開關**。`SKIP_TESTS`、`FORCE_DEPLOY` 這類參數一旦存在,它就會在最忙、最急、最不該省的那天被打勾——而且跟 UI 點按鈕一樣,不會留下「為什麼」。

需要緊急放行的機制不是不能有,但它應該**留下痕跡**(誰、何時、為什麼),而不是一個藏在下拉選單裡的核取方塊。

## 反思

### 我最後悔的一次 retry,是把 flaky test 包起來

有段時間某個整合測試大概每十次失敗一次。查了半天沒結論,我就先用 `retry(2)` 包住,想著「等有空再處理」。紅燈立刻消失,大家都很開心。

三個月後,Production 出現一個偶發的資料錯亂,查到最後是一個 race condition——**而那個 flaky test 從頭到尾都在告訴我們這件事**。它不是不穩定,它是**間歇性地說對了**。我親手把唯一的警報器包了層棉花。

所以現在我對 `retry` 的規則很硬:**只包網路與外部相依,不包測試。** 測試不穩定就當成 bug 開單處理——查不出來也要先隔離、標記、留紀錄,而不是重試到它閉嘴。這跟 [[sre-testing|測試的意義]] 是同一件事:測試存在的價值是告訴你真相,你把真相重試掉了,剩下的只是一個很花時間的儀式。

### 加平行之前先量,不然你會在錯的地方省時間

第一次接手一條 14 分鐘的 pipeline,我的直覺是「攤平就好」。攤完剩 9 分鐘,不錯——但再往下就卡住了,因為整合測試那條就要 8 分鐘。

實際去量之後才發現,那 8 分鐘裡有將近 5 分鐘是**測試裡的固定 `sleep`**:等服務起來、等資料寫入、等訊息消費。改成輪詢等待條件成立之後,那條變成 3 分鐘,整條 pipeline 掉到 4 分鐘——**而這件事跟平行化一點關係都沒有。**

從那之後我的順序固定是:**先量每個 stage 的時間 → 找最慢那條 → 問它慢在哪 → 最後才考慮平行。** 平行是把時間攤開,不是把時間變少;真正的加速通常來自刪掉不必要的等待。這個題目第 14 篇會完整展開。

### input 是一種流程設計的味道

最後一個是觀念上的。我現在看到 pipeline 中間有 `input`,第一個念頭不是「這裡要加 timeout」,而是**「為什麼建置和部署被綁在同一條 pipeline 裡?」**

把它們拆開之後,幾乎所有問題自己就消失了:建置永遠跑完就結束(不會有人在等),部署是一次獨立的執行、拿著一顆**已經存在且不可變的產物**去做事(想部署哪個版本就給哪個版本,不用重跑建置)。連審核紀錄都變好了——「誰在什麼時候把哪個版本推到 Production」變成一次獨立事件,而不是藏在某次 build 的第七個 stage 裡。

`input` 本身沒有錯,錯的是**用它把兩件不同節奏的事黏在一起**。這條線怎麼拆,是第 10 篇的主題。

下一篇處理一個踩雷成本最高的題目:憑證。機密怎麼進 pipeline、Jenkins 的遮蔽到底遮得住什麼,以及為什麼「一條可審查的 pipeline」的代價,就是機密必須從一開始就不在裡面。
