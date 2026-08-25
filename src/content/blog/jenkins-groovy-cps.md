---
title: "Jenkinsfile 不是 Groovy:CPS、序列化與沙箱"
date: 2026-08-25
category: tech
description: "前面幾篇一直在說「別在 Jenkinsfile 裡寫程式」,理由都很軟——好讀、好測、好搬家。這篇給硬的那個:Jenkinsfile 裡的 Groovy 會被 CPS 轉換,好讓 pipeline 能暫停、能在 controller 重啟後續跑,而代價是每個活著的變數都必須可序列化。NotSerializableException、@NonCPS 為什麼不能包 sh、sandbox 為什麼要管理員核准——這些看似無關的怪事,全部源自同一個設計。"
tags:
  - jenkins
  - ci-cd
  - groovy
series: "Jenkins 學習筆記"
seriesOrder: 9
comments: true
draft: false
---
這個系列到目前為止給過三次同一個建議:**Jenkinsfile 只做編排,邏輯放到 shell 腳本或 `src/` 的 class 裡。** 但我給的理由一直都很軟——好讀(半夜看它的人不一定會 Groovy)、好測(本機跑得動)、好搬家(換 CI 工具只搬三十行的殼)。

這篇補上硬的那個理由:**Jenkinsfile 裡的 Groovy,不是你熟悉的那個 Groovy。** 它被動過手腳,而那個手腳解釋了幾乎所有你會遇到的怪事。

## 為什麼 Jenkins 要動你的程式碼

一條 pipeline 可能跑好幾個小時、跨好幾台 agent、中間還會停下來等人核准。而 Jenkins 想保證一件事:**controller 重新啟動之後,正在跑的 build 要能接著跑完**,不是從頭來過。

要做到這件事,它必須能在任何一個步驟之間,把「這條 pipeline 現在執行到哪、變數裡有什麼」完整地存到磁碟:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 252" role="img" aria-label="CPS 轉換與續跑機制。一條 pipeline 依序執行四個步驟:取出程式碼、執行建置、執行測試、部署。每兩個步驟之間,Jenkins 都把整個程式的執行狀態寫進磁碟上的狀態檔。當 controller 在測試步驟前後重新啟動時,build 不會從頭來過,而是從最後一次存檔的狀態繼續往下跑。為了做到隨時存檔,Jenkins 必須把你的 Groovy 程式碼轉換成可以一步一步暫停的形式,也就是 CPS;而存檔的前提是所有還活著的變數都必須可以序列化。這就是 NotSerializableException、@NonCPS 這些怪事的共同源頭。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="cps1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="24" y="46" width="106" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="77" y="66" fill="#e6e6e6" font-size="8.4" text-anchor="middle">checkout</text>
    <rect x="166" y="46" width="106" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="219" y="66" fill="#e6e6e6" font-size="8.4" text-anchor="middle">sh 'build'</text>
    <rect x="308" y="46" width="106" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="361" y="66" fill="#e6e6e6" font-size="8.4" text-anchor="middle">sh 'test'</text>
    <rect x="450" y="46" width="106" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="503" y="66" fill="#e6e6e6" font-size="8.4" text-anchor="middle">deploy</text>
    <line x1="130" y1="62" x2="164" y2="62" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#cps1)"/><line x1="272" y1="62" x2="306" y2="62" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#cps1)"/><line x1="414" y1="62" x2="448" y2="62" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#cps1)"/>
    <line x1="147" y1="78" x2="147" y2="108" stroke="#4f6df5" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#cps1)"/><line x1="289" y1="78" x2="289" y2="108" stroke="#4f6df5" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#cps1)"/><line x1="431" y1="78" x2="431" y2="108" stroke="#4f6df5" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#cps1)"/>
    <rect x="24" y="110" width="532" height="30" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="290" y="129" fill="#4f6df5" font-size="8.6" text-anchor="middle" font-weight="bold">每個步驟之間,把「執行到哪 + 變數裡有什麼」整包寫到磁碟</text>
    <text x="361" y="30" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">⚡ controller 在這裡重啟</text>
    <line x1="361" y1="34" x2="361" y2="44" stroke="#e0733a" stroke-width="1.4"/>
    <rect x="24" y="152" width="532" height="28" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="290" y="170" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">重啟後:從最後一次存檔的狀態接著跑,不用從頭來過</text>
    <text x="310" y="204" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">為了能隨時存檔,Jenkins 把你的 Groovy 轉成「可以一步步暫停」的形式(CPS)</text>
    <text x="310" y="222" fill="#e6e6e6" font-size="8.8" text-anchor="middle">而能存檔的前提是:<tspan fill="#e0733a" font-weight="bold">所有還活著的變數,都必須可以序列化</tspan></text>
    <text x="310" y="242" fill="#9aa4b2" font-size="8.4" text-anchor="middle">NotSerializableException、@NonCPS、某些寫法行為詭異——全部源自這一句話</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">這張圖是本篇唯一需要記住的東西。Jenkins 給你的是<b>可續跑</b>這個很強的保證,而你付的價錢是「你的程式碼要能被切成一段一段、隨時存進磁碟」。所有奇怪的限制,都是這筆交易的分期付款</figcaption>
</figure>

## 第一個症狀:`NotSerializableException`

最常見的爆法,是把一個「不能序列化」的東西放進變數,然後讓它活過一個 pipeline step:

```groovy
// ✗ 會炸:JsonSlurper 解析出來的物件不可序列化,而它活過了下一個 sh
def json = new groovy.json.JsonSlurper().parseText(readFile('build-info.json'))
sh "echo 版本是 ${json.version}"      // → java.io.NotSerializableException
```

```groovy
// ✓ 用 step 解析(readJSON 來自 Pipeline Utility Steps 外掛),而且立刻取成基本型別
def version = readJSON(file: 'build-info.json').version.toString()
sh "echo 版本是 ${version}"
```

正規表示式是另一個經典陷阱,因為 `=~` 產生的 `Matcher` 也不可序列化:

```groovy
// ✗ Matcher 活過了 sh
def m = (readFile('app.log') =~ /version=(\d+)/)
if (m) { sh "echo ${m[0][1]}" }

// ✓ 當場取出值,用完立刻把 Matcher 丟掉
def ver = 'unknown'
def matcher = (readFile('app.log') =~ /version=(\d+)/)
if (matcher.find()) { ver = matcher.group(1) }
matcher = null                      // 別讓它活到下一個 step
sh "echo ${ver}"
```

規律很好記:**任何不是字串、數字、List、Map 的東西,都不要讓它活過一個 step。** 用完當場榨成基本型別。

## `@NonCPS`:逃出轉換,但也逃出 pipeline

有些寫法在 CPS 底下就是會怪(`each`、`sort`、`collect` 搭 closure 尤其容易出事)。`@NonCPS` 讓一個方法**不做 CPS 轉換**,裡面就是原汁原味的 Groovy:

```groovy
@NonCPS
def topFailures(String junitXml) {
  // 這裡可以放心用完整 Groovy:closure、sort、collect 都正常
  return new XmlSlurper().parseText(junitXml)
      .testcase.findAll { it.failure.size() > 0 }
      .collect { it.@name.toString() }
      .sort()
      .take(5)
}
```

但它的代價很硬,而且很多人不知道:

- **不能在 `@NonCPS` 方法裡呼叫任何 pipeline step**——`sh`、`echo`、`withCredentials` 都不行。因為那些 step 的本質是「暫停,等結果回來再繼續」,而你剛剛才把暫停能力關掉。
- 它**不能被中斷、不會存檔**,所以裡面別做長時間的事。
- 出錯時的堆疊訊息會比平常更難讀。

我的規則因此很簡單:**`@NonCPS` 只做純計算,輸入輸出都是字串 / List / Map。** 它是一個函式,不是一段流程。

## Sandbox:你的 Jenkinsfile 是「不受信任的程式碼」

第三件怪事:有些完全正常的 Groovy,會被擋下來說要管理員核准。

```
Scripts not permitted to use method java.io.File getText
```

理由其實很正當,而且跟這個系列的主軸直接相關:[[jenkins-first-pipeline|第 2 篇]]我們大力主張「Jenkinsfile 進 repo、人人可 review、任何人都能發 PR 改它」。那麼反過來看——**任何能對這個 repo 發 PR 的人,都能讓一段 Groovy 在你的 Jenkins 上執行。** 如果不設限,那等於把 controller 的檔案系統、憑證、JVM 全部交出去。

所以 Jenkins 預設把 Jenkinsfile 跑在 **Groovy sandbox** 裡:只有白名單上的方法能用,其餘要管理員在 script approval 頁面核准。

這裡有個觀念要擺正:**核准不是「幫某個人開一次例外」,而是對整台 Jenkins 開放那個方法**——之後任何 job、任何 PR 帶進來的 Jenkinsfile 都能用它。它是一個安全決策,不是一個「同意」按鈕。[[jenkins-credentials|第 6 篇]]講的信任邊界,在這裡是同一條線。

於是「在 Jenkinsfile 裡寫一行聰明的 Groovy」的真實成本變成:**你可能要請一個管理員,替全公司承擔一個永久的風險擴張。** 而同一件事寫成 shell 腳本,成本是零。

## 同一段邏輯的三個住處

把上面三件事併起來看,答案就很清楚了:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 254" role="img" aria-label="同一段邏輯放在三個位置的能力對照表。第一欄是 Jenkinsfile 主體:一般 Groovy 寫法會受 CPS 限制、可以呼叫 sh 等步驟、本機不能跑、可能需要管理員核准,適合放流程編排。第二欄是標註 NonCPS 的方法:可以用完整 Groovy、但不能呼叫任何 pipeline 步驟、本機仍然不好跑、一樣受沙箱限制,適合放純計算。第三欄是 shell 腳本或共用函式庫的 src class:Groovy 或 shell 都正常、shell 可自由呼叫系統、本機可以直接執行、不需要沙箱核准,適合放真正的邏輯。結論:流程留在 Jenkinsfile,計算放 NonCPS 或可測試的 class,跟系統互動的事情放 shell。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <rect x="150" y="26" width="150" height="30" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="225" y="46" fill="#4f6df5" font-size="8.6" text-anchor="middle" font-weight="bold">Jenkinsfile 主體</text>
    <rect x="304" y="26" width="150" height="30" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.4"/><text x="379" y="46" fill="#d6a45c" font-size="8.6" text-anchor="middle" font-weight="bold">@NonCPS 方法</text>
    <rect x="458" y="26" width="150" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.6"/><text x="533" y="46" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">shell / src class</text>
    <text x="16" y="78" fill="#9aa4b2" font-size="8.2" text-anchor="start">一般 Groovy 寫法</text>
    <rect x="150" y="64" width="150" height="26" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.1"/><text x="225" y="81" fill="#e0733a" font-size="8" text-anchor="middle">✗ 受 CPS 限制</text>
    <rect x="304" y="64" width="150" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="379" y="81" fill="#54b890" font-size="8" text-anchor="middle">✓ 完整 Groovy</text>
    <rect x="458" y="64" width="150" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="533" y="81" fill="#54b890" font-size="8" text-anchor="middle">✓ 完全正常</text>
    <text x="16" y="112" fill="#9aa4b2" font-size="8.2" text-anchor="start">呼叫 sh / 憑證等 step</text>
    <rect x="150" y="98" width="150" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="225" y="115" fill="#54b890" font-size="8" text-anchor="middle">✓ 這就是它的工作</text>
    <rect x="304" y="98" width="150" height="26" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.1"/><text x="379" y="115" fill="#e0733a" font-size="8" text-anchor="middle">✗ 一律不行</text>
    <rect x="458" y="98" width="150" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="533" y="115" fill="#9aa4b2" font-size="8" text-anchor="middle">— 自己就是系統呼叫</text>
    <text x="16" y="146" fill="#9aa4b2" font-size="8.2" text-anchor="start">本機能不能跑</text>
    <rect x="150" y="132" width="150" height="26" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.1"/><text x="225" y="149" fill="#e0733a" font-size="8" text-anchor="middle">✗ 要 push 才知道</text>
    <rect x="304" y="132" width="150" height="26" rx="4" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.1"/><text x="379" y="149" fill="#d6a45c" font-size="8" text-anchor="middle">△ 要靠測試框架</text>
    <rect x="458" y="132" width="150" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="533" y="149" fill="#54b890" font-size="8" text-anchor="middle">✓ 直接執行</text>
    <text x="16" y="180" fill="#9aa4b2" font-size="8.2" text-anchor="start">需要沙箱核准嗎</text>
    <rect x="150" y="166" width="150" height="26" rx="4" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.1"/><text x="225" y="183" fill="#d6a45c" font-size="8" text-anchor="middle">可能要,且是全域開放</text>
    <rect x="304" y="166" width="150" height="26" rx="4" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.1"/><text x="379" y="183" fill="#d6a45c" font-size="8" text-anchor="middle">一樣受限</text>
    <rect x="458" y="166" width="150" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="533" y="183" fill="#54b890" font-size="8" text-anchor="middle">✓ 不需要</text>
    <text x="16" y="214" fill="#e6e6e6" font-size="8.4" text-anchor="start" font-weight="bold">該放什麼</text>
    <text x="225" y="214" fill="#4f6df5" font-size="8.4" text-anchor="middle" font-weight="bold">流程編排</text>
    <text x="379" y="214" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">純計算</text>
    <text x="533" y="214" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">真正的邏輯</text>
    <text x="310" y="244" fill="#d6a45c" font-size="9.2" text-anchor="middle" font-weight="bold">流程留 Jenkinsfile · 計算放可測試的 class · 跟系統互動的事情放 shell</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">這張表就是我前面幾篇「別在 Jenkinsfile 裡寫程式」的完整答案:<b>不是 Groovy 不好,是那個位置不好</b>。同一段邏輯往右移一格,你就換到了本機可跑、不需核准、全隊看得懂</figcaption>
</figure>

那 shared library 的 `src/` 呢?它**一樣受 CPS 影響**(除非標 `@NonCPS`),但它有一個 Jenkinsfile 沒有的優勢:它是真正的 class,可以寫單元測試([[jenkins-shared-library|第 7 篇]]有範例)。所以我的分配是:

- 要跟 pipeline step 互動的 → `vars/` 的步驟
- 純運算、需要被測試的 → `src/` 的 class(必要時 `@NonCPS`)
- 跟系統、工具鏈互動的 → **shell 腳本**,而且放在專案 repo 裡

## 反思

### 教會我這件事的,是一個「只在 Jenkins 重啟後才失敗」的 bug

我第一次認真理解 CPS,是因為一個詭異到不行的狀況:某條 pipeline 平常都好好的,但只要那天 Jenkins 有升級或重啟,正在跑的 build 就會在重啟後爆掉,而錯誤訊息是一個我從沒看過的序列化例外。

追下去才發現,那段程式碼把一個 XML 解析物件放在變數裡,跨了兩個 step。平常沒事,是因為**根本沒發生存檔**;一旦 controller 要把狀態寫進磁碟,那個物件就送不出去。

那次讓我改變的不只是寫法,是**心智模型**:我以前把 Jenkinsfile 想成「一個從上到下執行的腳本」,那之後我把它想成「**一台狀態機,而它的狀態要能寫進磁碟**」。用這個模型去看,前面那些限制沒有一條是任性的——它們全都是為了同一個承諾。

### 在 Jenkinsfile 裡寫程式,成本是階梯狀的

這是我後來常跟團隊講的比喻:前十行程式碼幾乎免費,你會覺得「這樣寫很方便」;但從某一行開始,你會突然同時撞上序列化例外、`@NonCPS` 的限制、以及一個要管理員核准的方法呼叫——而那時候你已經投入很深,通常會選擇繼續硬幹,而不是退回去改架構。

所以我現在在 review 看到 Jenkinsfile 裡出現 `def` 開始接複雜結構、或出現第二層 closure,就會提早喊停:**這段程式碼想住的地方不是這裡。** 不是它寫得不好,是它會在錯誤的地方繼續長大。

### 「可審查」與「不受信任」是同一枚硬幣

sandbox 這件事一開始讓我覺得很煩,後來我認為它反而把一個道理講得很誠實:**我們之所以要 sandbox,正是因為我們成功了。** Jenkinsfile 進了 repo、任何人都能發 PR 改它——這是[[jenkins-first-pipeline|第 2 篇]]追求的目標,而它的另一面就是:這個檔案是**外部輸入**,不能無條件信任。

想通這點之後,我對「Jenkinsfile 該多薄」有了更硬的立場:**一個會被當成不受信任輸入的檔案,天生就不該是放核心邏輯的地方。** 邏輯應該住在經過 review、有測試、有版本的地方——shell 腳本、`src/` class、或共用函式庫。Jenkinsfile 只留下「先做什麼、再做什麼」這件事。

薄的 Jenkinsfile 不是為了好看,是因為它站在信任邊界上。

下一篇進第三批,談品質關卡:測試報告、覆蓋率與靜態分析,怎麼從「有跑」變成「擋得住」,以及為什麼 flaky test 是這道門最大的敵人。
