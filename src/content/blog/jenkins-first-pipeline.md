---
title: "第一個 Jenkinsfile:pipeline as code 為什麼贏過 UI 點按鈕"
date: 2026-08-22
category: tech
description: "Freestyle job 也是檔案——只是那個檔案住在 controller 上,不在你的 repo 裡:沒有 diff、沒有作者、沒有理由,而且不管你 checkout 哪個版本,配的永遠是「今天」的那一份設定。這篇把同一個 build 用 config.xml 與 Jenkinsfile 各寫一次,拆解 declarative pipeline 的四層骨架,說明為什麼「設定跟程式碼走同一個 commit」買到的不只是可審查,還有可重現與可回滾。"
tags:
  - jenkins
  - ci-cd
  - pipeline
series: "Jenkins 學習筆記"
seriesOrder: 2
comments: true
draft: true
---
上一篇最後那份 Jenkinsfile 只有二十行,語法簡單到不需要解釋。但我還是要為它寫一整篇——因為這二十行真正的價值不在語法,而在**它躺在哪裡**。

同一個 build,你可以在 Jenkins 的 UI 上點出來,也可以寫成一份進 git 的檔案。功能上兩者跑起來一模一樣;差別要等到半年後、事故當下、或是有人「臨時改一下」的時候才會現形。

## Freestyle job:它其實也是檔案,只是住在別人家

先破除一個誤解:在 UI 上點出來的 Freestyle job,**不是沒有設定檔**。Jenkins 會把它存成 `$JENKINS_HOME/jobs/<job 名>/config.xml`,長這樣:

```xml
<!-- $JENKINS_HOME/jobs/payment-api-build/config.xml —— 在 controller 的硬碟上,不在你的 repo 裡 -->
<project>
  <builders>
    <hudson.tasks.Shell>
      <command>./gradlew clean assemble -DskipTests=true</command>
    </hudson.tasks.Shell>
  </builders>
  <publishers>
    <hudson.tasks.junit.JUnitResultArchiver>
      <testResults>build/test-results/**/*.xml</testResults>
    </hudson.tasks.junit.JUnitResultArchiver>
  </publishers>
</project>
```

看到那個 `-DskipTests=true` 了嗎?**它是什麼時候長出來的、誰加的、為了解決什麼問題,這個檔案一個字都不會告訴你。** 它不在任何 PR 裡、沒有 commit message、沒有 reviewer。有 Jenkins 權限的任何人,在任何一個下午,都可以把它改成任何樣子,而全公司沒有一個人會收到通知。

這就是 Freestyle 的四個原罪:

| 原罪 | 具體長什麼樣 |
|---|---|
| **不能 review** | 改設定沒有 diff、沒有 PR;「這行為什麼在這」永遠問不到答案 |
| **不能回滾** | UI 沒有版本歷史(要另外裝外掛才勉強有);改壞了只能靠記憶改回去 |
| **不能跟著分支走** | 一份設定服務所有分支——feature branch 想加一個步驟?那就改到大家頭上 |
| **不能複製** | 新專案要開 job,標準作法是「複製那個 job 再改」,於是十個 job 十種樣子 |

## 但真正致命的,是設定跟程式碼不同步

上面四點都很煩,不過它們都還算「日常的痛」。真正會在事故當下咬你一口的是這件事:**程式碼有版本,UI 上的設定沒有。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 268" role="img" aria-label="建置設定住在哪裡的兩種後果。左邊:程式碼有 v1、v2、v3 三個版本躺在時間軸上,但 Jenkins UI 上的 job 設定只有現在這一份,三個版本全部共用它。所以 checkout 半年前的 v1 重新建置時,配的其實是今天的設定,建置方式已經被改過好幾輪,那顆產物再也組不回來。右邊:每個 commit 自己帶著當時的 Jenkinsfile,checkout v1 就拿到 v1 當時的建置方式,程式碼與建置方式永遠同版本。結論:設定跟程式碼走同一個 commit,可重現與可回滾才成立。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="fp1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="fp2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e0733a"/></marker></defs>
    <line x1="310" y1="16" x2="310" y2="230" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="152" y="20" fill="#e0733a" font-size="10.5" text-anchor="middle" font-weight="bold">設定住在 Jenkins UI 上</text>
    <line x1="24" y1="56" x2="286" y2="56" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#fp1)"/>
    <circle cx="66" cy="56" r="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="66" y="42" fill="#9aa4b2" font-size="8.2" text-anchor="middle">v1 · 1月</text>
    <circle cx="152" cy="56" r="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="152" y="42" fill="#9aa4b2" font-size="8.2" text-anchor="middle">v2 · 3月</text>
    <circle cx="238" cy="56" r="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="238" y="42" fill="#9aa4b2" font-size="8.2" text-anchor="middle">v3 · 8月</text>
    <rect x="34" y="128" width="238" height="40" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.6"/><text x="153" y="146" fill="#e6e6e6" font-size="9.4" text-anchor="middle">job 設定(config.xml)</text><text x="153" y="160" fill="#e0733a" font-size="8.4" text-anchor="middle">只有「現在」這一份</text>
    <line x1="80" y1="126" x2="68" y2="68" stroke="#e0733a" stroke-width="1.1" stroke-dasharray="3 3" marker-end="url(#fp2)"/>
    <line x1="153" y1="126" x2="153" y2="68" stroke="#e0733a" stroke-width="1.1" stroke-dasharray="3 3" marker-end="url(#fp2)"/>
    <line x1="226" y1="126" x2="238" y2="68" stroke="#e0733a" stroke-width="1.1" stroke-dasharray="3 3" marker-end="url(#fp2)"/>
    <text x="152" y="190" fill="#e6e6e6" font-size="8.8" text-anchor="middle">checkout v1 想重 build 一次</text>
    <text x="152" y="206" fill="#9aa4b2" font-size="8.4" text-anchor="middle">配到的是 8 月的設定,不是 1 月的</text>
    <text x="152" y="222" fill="#e0733a" font-size="8.8" text-anchor="middle" font-weight="bold">那顆產物,再也組不回來</text>
    <text x="466" y="20" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">設定住在 repo 裡</text>
    <line x1="336" y1="56" x2="598" y2="56" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#fp1)"/>
    <circle cx="378" cy="56" r="7" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="378" y="42" fill="#9aa4b2" font-size="8.2" text-anchor="middle">v1 · 1月</text>
    <circle cx="464" cy="56" r="7" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="464" y="42" fill="#9aa4b2" font-size="8.2" text-anchor="middle">v2 · 3月</text>
    <circle cx="550" cy="56" r="7" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="550" y="42" fill="#9aa4b2" font-size="8.2" text-anchor="middle">v3 · 8月</text>
    <rect x="340" y="76" width="76" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="378" y="93" fill="#54b890" font-size="8" text-anchor="middle">Jenkinsfile</text>
    <rect x="426" y="76" width="76" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="464" y="93" fill="#54b890" font-size="8" text-anchor="middle">Jenkinsfile</text>
    <rect x="512" y="76" width="76" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="550" y="93" fill="#54b890" font-size="8" text-anchor="middle">Jenkinsfile</text>
    <text x="466" y="126" fill="#9aa4b2" font-size="8.4" text-anchor="middle">每個 commit 自己帶著當時的建置方式</text>
    <text x="466" y="190" fill="#e6e6e6" font-size="8.8" text-anchor="middle">checkout v1 想重 build 一次</text>
    <text x="466" y="206" fill="#9aa4b2" font-size="8.4" text-anchor="middle">拿到的就是 1 月那份 Jenkinsfile</text>
    <text x="466" y="222" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">程式碼與建置方式永遠同版本</text>
    <text x="310" y="248" fill="#d6a45c" font-size="9.6" text-anchor="middle" font-weight="bold">「這版是怎麼 build 出來的?」——只有右邊答得出來</text>
    <text x="310" y="264" fill="#9aa4b2" font-size="8.6" text-anchor="middle">同一個 commit、同一次 review、同一次 revert:可審查買一送二,順便買到可重現與可回滾</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左邊的 job 設定是一個<b>沒有版本的全域變數</b>,而你的程式碼有版本。時間一長,兩者必然對不起來——你以為在重現半年前那顆產物,其實是拿舊程式碼配新設定,組出一個從來沒存在過的東西</figcaption>
</figure>

這件事在事故當下特別致命。線上出包要退回上一個好版本,你 checkout 了那個 tag,重新 build——但這半年來有人在 job 設定裡換過 JDK 版本、加過參數、改過打包方式。**你手上這顆產物,跟當初上線那顆不是同一個東西。** 它可能跑得起來,也可能在最糟的時間點給你另一個驚喜。

所以「Jenkinsfile 要進 repo」表面上是為了**可審查**(有 PR、有 diff、有理由),實際上是一次買三個:設定跟著 commit 走,自然就**可重現**(舊版本配舊設定)、也**可回滾**(`git revert` 一下,建置流程跟著回去)。這跟 [[iac-everything-as-code|IaC 講的 everything as code]] 是同一個信念——差別只在那邊管的是基礎設施,這邊管的是「怎麼把程式碼變成產物」。

## 同一件事,寫成 Jenkinsfile

把上面那個 Freestyle job 翻成 declarative pipeline,放在 repo 根目錄:

```groovy
// Jenkinsfile —— repo 根目錄,跟程式碼一起 commit、一起 review、一起 revert
pipeline {
  agent { label 'linux' }

  options {
    timeout(time: 30, unit: 'MINUTES')   // 卡住的 build 不該佔著 agent 過夜
    disableConcurrentBuilds()            // 同一個分支不要兩個 build 打架
  }

  stages {
    stage('Build') {
      steps { sh './gradlew clean assemble' }
    }
    stage('Test') {
      steps { sh './gradlew test' }
    }
    stage('Archive') {
      steps { archiveArtifacts artifacts: 'build/libs/*.jar', fingerprint: true }
    }
  }

  post {
    always  { junit 'build/test-results/**/*.xml' }
    failure { echo "build #${env.BUILD_NUMBER} 失敗,先修再說" }
  }
}
```

跟前面那份 `config.xml` 比,它**短、看得懂、而且會被 review**。更重要的是:當有人想把測試關掉的時候,他得送出這樣一個 PR——

```diff
     stage('Test') {
-      steps { sh './gradlew test' }
+      steps { sh './gradlew test -DskipTests=true' }   // 先擋一下,QA 那邊卡著
     }
```

**這個 diff 會出現在 code review 上,有作者、有時間、有理由,而且三週後有人查得到。** UI 上的同一個改動,只會安靜地生效,然後被所有人忘記。

## Declarative pipeline 的四層骨架

Declarative 的語法看起來有點囉嗦,但那個結構是刻意的——它逼你把一條 pipeline 拆成四個問題來回答:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 252" role="img" aria-label="Declarative pipeline 的骨架解剖。最外層是 pipeline 區塊,裡面由上到下四層:agent 回答這份工作在哪台機器上跑;options 回答整條 pipeline 的共同規則,例如逾時與不要並行;stages 裡面是一個個 stage,每個 stage 裡是 steps,回答分成哪幾段、每段做什麼;最下面 post 回答不管成功失敗都要做的收尾,例如收測試報告與通知。右側標註每一層各自回答的問題。底部說明:declarative 的價值在於它逼你把四個問題都回答完,而且結構固定,所以 Jenkins 能在真正執行前就先驗證這份檔案寫得對不對。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <rect x="16" y="26" width="588" height="182" rx="9" fill="#1f2430" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="30" y="44" fill="#4f6df5" font-size="10" text-anchor="start" font-weight="bold">pipeline { }</text>
    <text x="590" y="44" fill="#9aa4b2" font-size="8.2" text-anchor="end">最外層:宣告「這是一條 declarative pipeline」</text>
    <rect x="30" y="52" width="560" height="30" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="44" y="71" fill="#54b890" font-size="9.4" text-anchor="start" font-weight="bold">agent { label 'linux' }</text><text x="576" y="71" fill="#9aa4b2" font-size="8.4" text-anchor="end">① 在哪跑?</text>
    <rect x="30" y="88" width="560" height="30" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="44" y="107" fill="#e6e6e6" font-size="9.4" text-anchor="start">options { timeout · disableConcurrentBuilds }</text><text x="576" y="107" fill="#9aa4b2" font-size="8.4" text-anchor="end">② 全域規則:逾時、不並行</text>
    <rect x="30" y="124" width="560" height="46" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="44" y="141" fill="#4f6df5" font-size="9.4" text-anchor="start" font-weight="bold">stages { }</text><text x="576" y="141" fill="#9aa4b2" font-size="8.4" text-anchor="end">③ 分成哪幾段?每段做什麼?</text>
    <rect x="120" y="146" width="140" height="18" rx="4" fill="#1f2430" stroke="#9aa4b2" stroke-width="1"/><text x="190" y="159" fill="#e6e6e6" font-size="8" text-anchor="middle">stage('Build') { steps }</text>
    <rect x="268" y="146" width="140" height="18" rx="4" fill="#1f2430" stroke="#9aa4b2" stroke-width="1"/><text x="338" y="159" fill="#e6e6e6" font-size="8" text-anchor="middle">stage('Test') { steps }</text>
    <rect x="416" y="146" width="140" height="18" rx="4" fill="#1f2430" stroke="#9aa4b2" stroke-width="1"/><text x="486" y="159" fill="#e6e6e6" font-size="8" text-anchor="middle">stage('Archive') { steps }</text>
    <rect x="30" y="176" width="560" height="26" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.4"/><text x="44" y="193" fill="#d6a45c" font-size="9.4" text-anchor="start" font-weight="bold">post { always · failure }</text><text x="576" y="193" fill="#9aa4b2" font-size="8.4" text-anchor="end">④ 不管成敗,收尾要做什麼?</text>
    <text x="310" y="226" fill="#e6e6e6" font-size="9.2" text-anchor="middle">結構固定,所以 Jenkins 能在<tspan fill="#54b890" font-weight="bold">真的開始跑之前</tspan>就先驗證這份檔案寫得對不對</text>
    <text x="310" y="244" fill="#9aa4b2" font-size="8.6" text-anchor="middle">寫錯 stage 名稱、少了 steps、放錯層級——這些在第一秒就報錯,不用等 build 跑到一半</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Declarative 的囉嗦是有回報的:它是一份<b>有結構的宣告</b>而不是一段程式,所以工具能檢查它、視覺化它、也讓下一個人一眼看懂這條 pipeline 分成幾段。<code>post</code> 最容易被忽略,但它是唯一能保證「失敗時也會執行」的地方——收報告、清理、通知都該住在這</figcaption>
</figure>

## Declarative vs Scripted:先學前者,別急著逃

Jenkins 有兩種 pipeline 語法。同一件事寫成 scripted 是這樣:

```groovy
// scripted —— 整份是一段 Groovy 程式,node/stage 只是函式呼叫
node('linux') {
  stage('Build') { sh './gradlew clean assemble' }
  stage('Test')  { sh './gradlew test' }
  // 想要「失敗也收報告」?自己 try/finally 包起來
}
```

差別不在能力,在**約束**:

| | Declarative | Scripted |
|---|---|---|
| 本質 | 有結構的宣告 | 一段 Groovy 程式 |
| 檢查時機 | 開跑前就驗證結構 | 跑到那一行才知道錯 |
| 失敗收尾 | `post` 內建 | 自己 `try / finally` |
| 可讀性 | 不熟 Jenkins 的人也看得懂 | 要會 Groovy |
| 動態產生 stage、複雜控制流 | 做不到(要開 `script { }` 逃生門) | 可以 |

我的建議很直接:**以 declarative 為主,真的需要程式邏輯時再用 `script { }` 開一個小逃生門**,不要整份改寫成 scripted。

```groovy
stage('Deploy') {
  steps {
    script {                                   // 只有這一小塊是程式
      def envs = params.TARGETS.split(',')
      envs.each { e -> sh "./scripts/deploy.sh ${e}" }
    }
  }
}
```

一份看得懂的 pipeline,價值遠高於一份寫得很聰明的 pipeline——**下一個要在半夜看它的人,可能不會 Groovy。**

## 反思

### 能被偷偷改的東西,就一定會被偷偷改

我印象最深的一次,是接手後發現某個服務的建置指令帶著 `-DskipTests=true`。追查下去,那是好幾個月前某次趕上線,有人為了「先擋一下」在 UI 上加的——加完就忘了。中間所有版本都沒跑過測試,而測試報告的頁面還好端端地掛在那,只是永遠是空的。

最讓我在意的不是那次事故,是**查不到任何紀錄**:沒有 commit、沒有作者、沒有時間。最後只能靠問「誰有那台 Jenkins 的權限」來縮小範圍,像在辦案。從那之後我的判斷很簡單:**一個能在下午被人默默改掉、而且沒有痕跡的設定,遲早會被默默改掉。** 這跟人品無關,趕上線的壓力下每個人都會這樣做——差別只在系統有沒有留下痕跡。

### 進 repo 之後,真正改變的是「誰有權改建置流程」

這是我後來才想通的一層。Jenkinsfile 進 repo,權限模型跟著整個翻轉:改建置流程的資格,從「**有 Jenkins 管理權的人**」變成「**能對這個 repo 發 PR 的人**」。

聽起來像是放寬,其實是收緊,而且收得更合理——改的人變成最懂這個專案的人,而不是最懂 Jenkins 的那個人;同時每一次改動都要經過該專案的 reviewer。附帶的好處是新人第一天就能改 pipeline:不用申請帳號、不用等人開權限,發 PR 就好。我看過太多團隊卡在「只有兩個人會動 Jenkins」,那不是技術問題,是把設定放錯地方造成的組織瓶頸。

### 但 pipeline as code 不是免費的——我的解法是讓 Jenkinsfile 只做編排

該講的代價也要講:Groovy 對後端工程師來說是陌生語言、本機沒辦法完整跑一次 pipeline、改一行常常要 push 一次才知道對不對。我看過有人為了調一個參數 push 了十幾次,commit 訊息全是 `fix ci`。

我自己的作法是**把 Jenkinsfile 當編排層,真正的指令收進 repo 裡的腳本**:

```groovy
stages {
  stage('Build') { steps { sh './scripts/ci-build.sh' } }
  stage('Test')  { steps { sh './scripts/ci-test.sh' } }
}
```

`ci-build.sh` 裡才是那一長串 gradle 參數。這樣有三個好處:**本機能跑同一套**(debug 不用 push)、**review 時看到的是 shell 不是 Groovy**(全隊都看得懂)、以及哪天要換 CI 工具,要搬的只是三十行的殼,腳本原封不動——這件事在系列最後一篇談搬家時會再出現。

代價是多一層間接:想知道 build 到底做了什麼,得多開一個檔案。我認為划算,但這是取捨,不是真理——如果你的建置就是一行 `make`,那就別為它蓋一層抽象。

下一篇會往下挖一層:這些 `sh` 到底是在**哪一台機器**上跑的,以及為什麼「工作去哪台」這件事不該由誰在 UI 上挑,而該由 Jenkinsfile 裡的一個 label 決定。
