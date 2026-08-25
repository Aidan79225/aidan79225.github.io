---
title: "Shared Library:把十份幾乎一樣的 Jenkinsfile,變成公司資產"
date: 2026-08-25
category: tech
description: "十個專案十份用複製貼上長出來的 Jenkinsfile,是十份技術債——沒人知道哪份才是對的,一個安全性修補要改十次。Shared Library 是收斂的答案,但它同時帶來兩個新問題:改一次會同時影響所有專案(所以必須釘版本,不然半年前的 build 再也重現不了),以及抽象很容易做過頭——當 Jenkinsfile 只剩一行 standardPipeline(),你就把可審查性又藏回去了,那跟在 UI 上點按鈕沒兩樣。"
tags:
  - jenkins
  - ci-cd
  - pipeline
series: "Jenkins 學習筆記"
seriesOrder: 7
comments: true
draft: false
---
[[jenkins-first-pipeline|第 2 篇]]的結論是:把 pipeline 寫成程式碼、放進 repo。這件事在一個專案上是純粹的勝利,但當公司有十個、三十個專案之後,會長出一個新問題——**十份幾乎一樣、但又不完全一樣的 Jenkinsfile。**

這篇講怎麼把它們收斂成一份共用函式庫,以及收斂之後接踵而來的兩個新麻煩:**版本**與**抽象的分寸**。

## 複製貼上長出來的十份 Jenkinsfile,是十份技術債

新專案要開 CI,最自然的動作是「複製隔壁專案的 Jenkinsfile 再改」。這動作本身沒錯,錯的是它會持續發生兩年:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 268" role="img" aria-label="十份複製貼上的 Jenkinsfile 與收斂成共用函式庫的對照。左邊五個專案各自帶著一份兩百行的 Jenkinsfile,彼此已經漂移:A 專案修過安全性設定但 B 沒有、C 是兩年前複製的舊版、D 被人改過但沒有人記得為什麼,結果沒有人知道哪一份才是對的,一個修補要改十次而且一定會漏。右邊每個專案的 Jenkinsfile 縮成十五行,共同的部分收斂進一份叫 pipeline-lib 的共用函式庫,但每個專案各自釘住自己要用的版本,有的在一點四、有的已經升到一點五。底部說明:收斂的好處是一次修補全體受惠,代價是一改可能全炸,所以必須釘版本,讓每個專案自己決定什麼時候升級。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <line x1="310" y1="16" x2="310" y2="222" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="152" y="24" fill="#e0733a" font-size="10.5" text-anchor="middle" font-weight="bold">✗ 十份複製貼上的 Jenkinsfile</text>
    <rect x="26" y="36" width="120" height="22" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="86" y="51" fill="#e6e6e6" font-size="7.8" text-anchor="middle">專案 A · 200 行</text><text x="156" y="51" fill="#9aa4b2" font-size="7.4" text-anchor="start">修過安全性設定</text>
    <rect x="26" y="62" width="120" height="22" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="86" y="77" fill="#e6e6e6" font-size="7.8" text-anchor="middle">專案 B · 205 行</text><text x="156" y="77" fill="#e0733a" font-size="7.4" text-anchor="start">沒跟上那個修補</text>
    <rect x="26" y="88" width="120" height="22" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="86" y="103" fill="#e6e6e6" font-size="7.8" text-anchor="middle">專案 C · 180 行</text><text x="156" y="103" fill="#9aa4b2" font-size="7.4" text-anchor="start">兩年前複製的版本</text>
    <rect x="26" y="114" width="120" height="22" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="86" y="129" fill="#e6e6e6" font-size="7.8" text-anchor="middle">專案 D · 240 行</text><text x="156" y="129" fill="#9aa4b2" font-size="7.4" text-anchor="start">有人改過,原因失傳</text>
    <rect x="26" y="140" width="120" height="22" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="86" y="155" fill="#e6e6e6" font-size="7.8" text-anchor="middle">專案 E · 200 行</text><text x="156" y="155" fill="#9aa4b2" font-size="7.4" text-anchor="start">複製自 C(所以也舊)</text>
    <text x="152" y="184" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">沒有人知道哪一份才是對的</text>
    <text x="152" y="200" fill="#9aa4b2" font-size="8.2" text-anchor="middle">一個修補要改十次,而且一定會漏掉兩個</text>
    <text x="152" y="216" fill="#9aa4b2" font-size="8.2" text-anchor="middle">「最佳實務」只存在於最早那份,之後只有漂移</text>
    <text x="466" y="24" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">✓ 收斂成一份,各自釘版本</text>
    <rect x="336" y="36" width="104" height="20" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="388" y="50" fill="#e6e6e6" font-size="7.6" text-anchor="middle">A · 15 行</text><rect x="446" y="36" width="46" height="20" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="469" y="50" fill="#4f6df5" font-size="7.2" text-anchor="middle">@1.4.0</text>
    <rect x="336" y="62" width="104" height="20" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="388" y="76" fill="#e6e6e6" font-size="7.6" text-anchor="middle">B · 15 行</text><rect x="446" y="62" width="46" height="20" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="469" y="76" fill="#4f6df5" font-size="7.2" text-anchor="middle">@1.4.0</text>
    <rect x="336" y="88" width="104" height="20" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="388" y="102" fill="#e6e6e6" font-size="7.6" text-anchor="middle">C · 18 行</text><rect x="446" y="88" width="46" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="469" y="102" fill="#54b890" font-size="7.2" text-anchor="middle">@1.5.0</text>
    <rect x="336" y="114" width="104" height="20" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="388" y="128" fill="#e6e6e6" font-size="7.6" text-anchor="middle">D · 22 行</text><rect x="446" y="114" width="46" height="20" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="469" y="128" fill="#4f6df5" font-size="7.2" text-anchor="middle">@1.4.0</text>
    <rect x="336" y="140" width="104" height="20" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="388" y="154" fill="#e6e6e6" font-size="7.6" text-anchor="middle">E · 15 行</text><rect x="446" y="140" width="46" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="469" y="154" fill="#54b890" font-size="7.2" text-anchor="middle">@1.5.0</text>
    <line x1="492" y1="46" x2="524" y2="88" stroke="#9aa4b2" stroke-width="1"/><line x1="492" y1="72" x2="524" y2="92" stroke="#9aa4b2" stroke-width="1"/><line x1="492" y1="98" x2="524" y2="96" stroke="#9aa4b2" stroke-width="1"/><line x1="492" y1="124" x2="524" y2="100" stroke="#9aa4b2" stroke-width="1"/><line x1="492" y1="150" x2="524" y2="104" stroke="#9aa4b2" stroke-width="1"/>
    <rect x="524" y="76" width="82" height="44" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.7"/><text x="565" y="94" fill="#e6e6e6" font-size="8.4" text-anchor="middle" font-weight="bold">pipeline-lib</text><text x="565" y="107" fill="#54b890" font-size="7.4" text-anchor="middle">一份 · 有版本</text>
    <text x="466" y="184" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">一次修補,全體受惠</text>
    <text x="466" y="200" fill="#9aa4b2" font-size="8.2" text-anchor="middle">但同一件事的反面是:一改,可能全炸</text>
    <text x="466" y="216" fill="#d6a45c" font-size="8.2" text-anchor="middle">所以要釘版本——升不升、什麼時候升,由專案自己決定</text>
    <text x="310" y="246" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">收斂解決的是「漂移」,版本解決的是「連坐」</text>
    <text x="310" y="262" fill="#9aa4b2" font-size="8.4" text-anchor="middle">只做前者不做後者,你會把十個獨立的小問題,換成一個全公司同時發作的大問題</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左邊的十份檔案不是「十個副本」,是<b>十個已經各自演化的分支</b>——而且沒有任何機制會讓它們再合回去。這跟長命分支的合併地獄是同一種病,只是發生在建置流程上</figcaption>
</figure>

## Shared Library 的三個目錄

一個 shared library 就是一個 git repo,結構固定:

```
pipeline-lib/
├── vars/                       # 給 Jenkinsfile 直接呼叫的「步驟」
│   ├── deployApp.groovy        #   → 步驟名就是檔名:deployApp(...)
│   └── notifySlack.groovy
├── src/                        # 正常的 Groovy class,放複雜邏輯
│   └── com/example/ci/Semver.groovy
└── resources/                  # 非 Groovy 的靜態檔(shell、模板)
    └── com/example/ci/deploy.sh
```

`vars/` 底下一支步驟長這樣:

```groovy
// vars/deployApp.groovy —— 呼叫端寫 deployApp(env: 'staging', image: '...')
def call(Map cfg) {
  assert cfg.env   : 'deployApp: 缺少 env'
  assert cfg.image : 'deployApp: 缺少 image'

  def script = libraryResource('com/example/ci/deploy.sh')   // 實際指令住在 shell 裡
  writeFile file: '.ci-deploy.sh', text: script

  withCredentials([file(credentialsId: "kubeconfig-${cfg.env}", variable: 'KUBECONFIG')]) {
    sh "bash .ci-deploy.sh ${cfg.env} ${cfg.image}"
  }
}
```

呼叫端只要一行宣告,而且**帶著版本**:

```groovy
@Library('pipeline-lib@1.4.0') _        // ← 釘住版本,不是抓 master

pipeline {
  agent { label 'linux' }
  stages {
    stage('Build')  { steps { sh './scripts/ci-build.sh' } }
    stage('Deploy') { steps { deployApp(env: 'staging', image: "app:${env.GIT_COMMIT}") } }
  }
  post { failure { notifySlack(channel: '#api-alerts') } }
}
```

我的習慣是**讓 `vars/` 保持薄**:它負責參數檢查、憑證綁定、組裝;真正的指令放在 `resources/` 的 shell 腳本裡(理由跟[[jenkins-first-pipeline|第 2 篇]]那段一樣——shell 全隊都看得懂,而且本機跑得動),複雜的計算才放 `src/` 的 class。

## 版本釘選:共用函式庫是一種 API,不是一個資料夾

`@Library('pipeline-lib')` 不加版本,預設抓的是 library 的預設分支。這寫法很方便,而且**會在某個週一早上讓全公司的 build 同時壞掉**。

更關鍵的是它會**打破可重現性**:第 2 篇那張圖說「checkout 舊 commit 就拿到當時的建置方式」,但如果 Jenkinsfile 抓的是 library 的 master,那半年前那個 commit 配到的是**今天的 library**——建置方式又變成一個沒有版本的全域變數,只是這次躲在別的 repo 裡。

所以規則很簡單:

- **一律釘 tag(或 commit SHA),用語意化版本**;`@1.4.0` 而不是 `@main`。
- **library 自己要有 changelog 與遷移說明**——它的使用者是其他工程師,破壞性變更要有遷移期:舊步驟保留、標記 deprecated、給時間。
- **唯一該強推的是安全性修補**,而且要主動通知,不是偷偷改。

## 抽象的甜蜜點:共用「怎麼做」,不共用「做什麼」

收斂會上癮。抽到後來,很容易出現這種東西:

```groovy
@Library('pipeline-lib@2.0.0') _
standardPipeline(type: 'springboot')      // 就這樣。一行。
```

看起來很美,實際上是把可審查性又藏回去了——**讀這個專案的 Jenkinsfile,你完全看不出它會做什麼**。這跟第 2 篇批評的「設定躺在 UI 裡」是同一種病,只是這次躺在另一個 repo 裡:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 244" role="img" aria-label="Jenkinsfile 抽象程度的光譜。最左邊是抽象太少:每個專案兩百行複製貼上的重複內容,好處是攤開來看得見,壞處是改一次要改十處而且會漂移。中間是甜蜜點:專案的 Jenkinsfile 大約三十行,還看得出這個專案有哪些階段,共用的部分是怎麼推映像檔、怎麼通知、怎麼掃描這類做法,專案保留自己有哪些階段的決定權。最右邊是抽象過頭:Jenkinsfile 只剩一行呼叫 standardPipeline,底下藏著八百行,讀 Jenkinsfile 看不出這個專案在做什麼,想加一個階段得去改公司函式庫並排隊等審核,於是團隊開始傳一堆旗標參數或乾脆分叉。底部判準:共用怎麼做,不共用做什麼;檢驗問題是新人只讀這個 repo 的 Jenkinsfile,能不能說出這條 pipeline 大概會發生什麼。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <line x1="30" y1="212" x2="592" y2="212" stroke="#3a4154" stroke-width="1.2"/>
    <text x="60" y="228" fill="#9aa4b2" font-size="8.4" text-anchor="start">重複 ←</text><text x="562" y="228" fill="#9aa4b2" font-size="8.4" text-anchor="end">→ 隱藏</text>
    <rect x="30" y="40" width="170" height="150" rx="8" fill="#3a2626" stroke="#e0733a" stroke-width="1.4"/>
    <text x="115" y="60" fill="#e0733a" font-size="9.4" text-anchor="middle" font-weight="bold">抽象太少</text>
    <text x="115" y="78" fill="#e6e6e6" font-size="8.2" text-anchor="middle">每個專案 200 行,全複製</text>
    <text x="115" y="104" fill="#54b890" font-size="8" text-anchor="middle">✓ 攤開來,看得見</text>
    <text x="115" y="126" fill="#e0733a" font-size="8" text-anchor="middle">✗ 改一次要改十處</text>
    <text x="115" y="146" fill="#e0733a" font-size="8" text-anchor="middle">✗ 必然漂移,沒人知道哪份對</text>
    <text x="115" y="172" fill="#9aa4b2" font-size="7.6" text-anchor="middle">看得見,但維護不動</text>
    <rect x="214" y="40" width="192" height="150" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.9"/>
    <text x="310" y="60" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">甜蜜點</text>
    <text x="310" y="78" fill="#e6e6e6" font-size="8.2" text-anchor="middle">專案 Jenkinsfile 約 30 行</text>
    <text x="310" y="102" fill="#54b890" font-size="8" text-anchor="middle">共用「怎麼做」</text>
    <text x="310" y="118" fill="#9aa4b2" font-size="7.6" text-anchor="middle">推映像檔 · 通知 · 掃描 · 憑證綁定</text>
    <text x="310" y="140" fill="#54b890" font-size="8" text-anchor="middle">專案保留「做什麼」</text>
    <text x="310" y="156" fill="#9aa4b2" font-size="7.6" text-anchor="middle">我有哪些 stage、跑什麼測試</text>
    <text x="310" y="178" fill="#e6e6e6" font-size="7.8" text-anchor="middle">看得懂,也維護得動</text>
    <rect x="420" y="40" width="172" height="150" rx="8" fill="#3a2626" stroke="#e0733a" stroke-width="1.4"/>
    <text x="506" y="60" fill="#e0733a" font-size="9.4" text-anchor="middle" font-weight="bold">抽象過頭</text>
    <text x="506" y="78" fill="#e6e6e6" font-size="8.2" text-anchor="middle">standardPipeline() 一行</text>
    <text x="506" y="102" fill="#e0733a" font-size="8" text-anchor="middle">✗ 看不出這專案在做什麼</text>
    <text x="506" y="124" fill="#e0733a" font-size="8" text-anchor="middle">✗ 加一個 stage 要改公司函式庫</text>
    <text x="506" y="144" fill="#e0733a" font-size="8" text-anchor="middle">✗ 於是開始傳旗標參數、或分叉</text>
    <text x="506" y="172" fill="#9aa4b2" font-size="7.6" text-anchor="middle">維護得動,但沒人看得見</text>
    <text x="310" y="240" fill="#d6a45c" font-size="9.2" text-anchor="middle" font-weight="bold">檢驗問題:新人只讀這個 repo 的 Jenkinsfile,說得出這條 pipeline 會發生什麼嗎?</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">兩端都是失敗,只是失敗的方向相反:左邊<b>看得見但維護不動</b>,右邊<b>維護得動但沒人看得見</b>。中間那格之所以是甜蜜點,是因為它同時保住了「一次修補全體受惠」與「讀 Jenkinsfile 就知道這個專案在幹嘛」</figcaption>
</figure>

我的判準是一句話:**共用「怎麼做」,不要共用「做什麼」。** 怎麼推 image、怎麼發通知、怎麼綁憑證、怎麼跑掃描——這些每個專案都一樣,收進 library;但「這個專案有哪幾個 stage、跑哪些測試、什麼條件才部署」,那是專案自己的事,應該留在它自己的 Jenkinsfile 裡看得見。

另外一定要留**逃生門**:library 的步驟要能接參數覆寫,或提供 hook 讓專案插入自己的步驟。沒有逃生門的抽象,最後一定會被繞過——工程師會 fork 一份自己改,而你甚至不會知道。這跟 [[iac-small-pieces|IaC 講的「切太碎是另一種單體」]] 是同一組取捨:抽象的邊界要跟著「誰會一起變」來切,不是跟著「看起來很像」來切。

## Pipeline code 也是 code:它要有自己的測試與 CI

這是最多團隊跳過、然後付代價的一步。共用函式庫一改就影響全公司,**它比大部分業務程式碼更需要測試**:

```groovy
// test/vars/DeployAppSpec.groovy —— 用 JenkinsPipelineUnit 假裝跑一次
class DeployAppSpec extends BasePipelineTest {
  @Test
  void '缺少 env 參數時要直接失敗'() {
    def deployApp = loadScript('vars/deployApp.groovy')
    shouldFail(AssertionError) { deployApp(image: 'app:abc') }
  }

  @Test
  void '會用對應環境的 kubeconfig'() {
    helper.registerAllowedMethod('withCredentials', [List, Closure]) { c, body -> body() }
    def deployApp = loadScript('vars/deployApp.groovy')
    deployApp(env: 'staging', image: 'app:abc')
    assertThat(helper.callStack.findAll { it.methodName == 'sh' }
                          .any { it.args[0].toString().contains('staging') }, is(true))
  }
}
```

library 自己也該有一條 pipeline:lint → 單元測試 → 打 tag 發版。**沒有 CI 的共用函式庫,是一個沒有 CI 的 CI 系統**——這句話聽起來像繞口令,但它就是很多公司的現況。

## 反思

### 我做過最失敗的抽象,是一行就跑完的 `standardPipeline()`

那時候我很得意:新專案接 CI 只要三行,一天內可以開十個。但三個月後開始出現兩種味道——第一種是參數爆炸,`standardPipeline(type: 'springboot', skipIT: true, extraStage: 'x', customImage: ...)`,那些旗標一路長到十幾個;第二種更糟,有兩個團隊直接把 library 複製一份改成自己的,因為「等你們排 review 太慢了」。

我後來想明白:那個抽象**把每個專案的差異都當成例外**,但差異才是常態。而且它踩到一個組織上的死穴——**建置流程的修改權被收回中央了**。工程師要動自己專案的 CI,得去改另一個 repo、等另一個團隊 review。第 2 篇說 Jenkinsfile 進 repo 讓「改建置流程的資格」回到專案手上,而我那個抽象親手把它收了回去。

現在我重做一次會這樣切:library 提供**步驟**(`deployApp`、`notifySlack`、`scanImage`),不提供**流程**;流程長什麼樣,永遠寫在專案自己的 Jenkinsfile 裡。多幾行沒關係,那幾行是給人看的。

### 那次「改 master」的週一早上

還有一次是版本問題。我們的 library 一直用 `@Library('pipeline-lib') _`,某個週五下午我改了一個共用步驟的預設值,測過我自己的專案,沒問題,合進 master。

週一早上,四個團隊的 build 同時紅了。最麻煩的不是修,是**沒有東西可以 revert**——壞掉的是他們的 build,但要 revert 的 commit 在另一個 repo,而且他們沒有任何一個人 review 過那次變更。那天我才真的理解:**共用函式庫是一種 API,而我一直把它當成一個資料夾在用。**

從那之後規矩就定死了:library 打 tag、走語意化版本、有 changelog;專案端一律釘版本,升級是專案自己發一個 PR(所以升級這件事本身也可 review、可 revert)。唯一例外是安全性修補,而且要在群組公告、給時間。**代價是升級變慢了,但換到的是「壞掉的時候有人可以按 revert」——這筆交易我認為划算得不得了。**

### 寫 library 的人,要有產品思維

最後一個心得比較軟。共用函式庫的使用者是**其他工程師**,而工程師這種使用者有個特性:**你的 API 難用,他們不會來抱怨,他們會繞過去**——fork 一份、複製貼上、或乾脆不用。等你發現的時候,收斂早就失敗了,而且你完全不知道是什麼時候失敗的。

所以我現在維護共用函式庫,會刻意做三件事:寫一份**帶可貼上範例的 README**(工程師不讀文件,但會抄範例)、每個破壞性變更附**遷移指引**、以及**定期去看有幾個專案還釘在舊版本**——那個數字比任何滿意度調查都誠實。如果有一半的專案卡在三個版本前,那不是他們懶,是我的升級成本設計得太高。

順帶一提,這份 library 之後還會再幫你一次:當有一天要評估搬去別的 CI 工具時,**抽象層就是搬家的槓桿**——要改的是一份 library,不是三十份 Jenkinsfile。這件事最後一篇會再回來談。

下一篇回到分支:multibranch 怎麼讓每個分支與 PR 都有自己的 pipeline,以及為什麼「trunk-based」不是叫工程師勤勞一點,而是要先把合併與發布這兩件事解開。
