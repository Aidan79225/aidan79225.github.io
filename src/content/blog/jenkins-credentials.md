---
title: "憑證管理:機密怎麼進 pipeline,又不會漏出去"
date: 2026-08-24
category: tech
description: "把 pipeline 寫成程式碼、進 git、人人可 review——代價就是「什麼都看得到」,所以機密必須從一開始就不在裡面。這篇講 Jenkins 的 credentials store 與 scope 怎麼切、withCredentials 該綁多小,以及一件很多人誤解的事:日誌遮蔽只是輸出時的字串比對,base64 一下、set -x 一下、或讓子行程把它寫進檔案再 archive 出去,它就完全遮不住。真正的防線不是遮蔽,是這把鑰匙能做什麼、活多久、誰拿得到。"
tags:
  - jenkins
  - ci-cd
  - security
series: "Jenkins 學習筆記"
seriesOrder: 6
comments: true
draft: false
---
第 2 篇的結論是:pipeline 要寫成程式碼、進 git、讓每個人都能 review。這是整個系列的立場,但它有一個必須同時付的代價——**這條路上的每一行,所有能讀這個 repo 的人都看得到。**

所以機密不是「小心一點別被看到」的問題,而是**它從一開始就不能在裡面**。這篇講的就是:它該住哪、怎麼進 pipeline、以及為什麼你在日誌上看到的那排 `****`,遠比你以為的脆弱。

## 先講清楚:寫進 repo 的東西,刪掉也還在

最常見的三種錯,由淺到深:

```groovy
// ✗ 直接寫在 Jenkinsfile 裡
sh 'curl -H "Authorization: Bearer sk-live-9f3a..." https://api.example.com/deploy'

// ✗ 寫在 repo 的設定檔裡,想說「反正是內部 repo」
sh './deploy.sh --token=$(cat .env.production)'

// ✗ 塞在 job 的環境變數裡(至少不在 git,但也不可 review、不可輪替、誰都看得到)
```

第一種最糟的地方不是被看到,是**它會永遠留在 git 歷史裡**。你下一個 commit 把它刪掉,它還在;改成 `git rebase` 重寫歷史,別人的本機 clone 裡還在;repo 有 fork、有備份、有各種同步過去的副本,你追不完。

**所以憑證外洩的第一動作永遠是「換金鑰」,不是「刪 commit」。** 這件事我在反思會再講一次,因為它太常被搞反。

## Credentials store:憑證住的地方,以及 scope 怎麼切

Jenkins 把憑證存在自己的 store 裡,pipeline 只拿「ID」來指涉它——Jenkinsfile 裡出現的永遠只有 ID,不是值。

常用型別有幾種:Secret text(API token)、Username with password、SSH private key、Secret file(整個 kubeconfig 或 service account json)、Certificate。

比型別更重要的是 **scope**,因為它決定了爆炸半徑:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 246" role="img" aria-label="憑證作用範圍造成的爆炸半徑對照。左邊是一把萬能鑰匙:Production 部署金鑰放在全域範圍且長期有效,結果四個不同的 job 都拿得到,包括來自外部貢獻者的 PR 建置,任何人只要能讓一個 build 跑起來就等於拿到那把鑰匙。右邊是切開的作法:依資料夾分層,前端與後端資料夾各自只有自己需要的憑證,Production 部署的憑證只放在 deploy 資料夾,而且是每次建置才發、建置結束就失效的短期票。底部三個必問的問題:這把鑰匙能做什麼、活多久、誰拿得到。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <line x1="310" y1="16" x2="310" y2="200" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="152" y="24" fill="#e0733a" font-size="10.5" text-anchor="middle" font-weight="bold">✗ 一把萬能鑰匙,放 Global</text>
    <rect x="86" y="36" width="134" height="34" rx="7" fill="#3a2626" stroke="#e0733a" stroke-width="1.7"/><text x="153" y="50" fill="#e6e6e6" font-size="8.8" text-anchor="middle" font-weight="bold">prod-deploy-key</text><text x="153" y="63" fill="#e0733a" font-size="7.6" text-anchor="middle">Global · 永久有效 · 全權限</text>
    <line x1="120" y1="70" x2="60" y2="104" stroke="#e0733a" stroke-width="1.1"/><line x1="145" y1="70" x2="128" y2="104" stroke="#e0733a" stroke-width="1.1"/><line x1="165" y1="70" x2="196" y2="104" stroke="#e0733a" stroke-width="1.1"/><line x1="188" y1="70" x2="262" y2="104" stroke="#e0733a" stroke-width="1.1"/>
    <rect x="20" y="106" width="80" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="60" y="123" fill="#9aa4b2" font-size="7.6" text-anchor="middle">前端 build</text>
    <rect x="104" y="106" width="80" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="144" y="123" fill="#9aa4b2" font-size="7.6" text-anchor="middle">後端 build</text>
    <rect x="188" y="106" width="80" height="26" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="228" y="123" fill="#9aa4b2" font-size="7.6" text-anchor="middle">工具 job</text>
    <rect x="226" y="140" width="80" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.4"/><text x="266" y="157" fill="#e0733a" font-size="7.6" text-anchor="middle">外部 PR build</text>
    <text x="152" y="184" fill="#e0733a" font-size="8.4" text-anchor="middle" font-weight="bold">能讓任何一個 build 跑起來的人</text>
    <text x="152" y="198" fill="#9aa4b2" font-size="8.2" text-anchor="middle">= 拿到了 Production 的鑰匙</text>
    <text x="466" y="24" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">✓ 按 folder 切 + 短期票</text>
    <rect x="336" y="36" width="118" height="30" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="395" y="48" fill="#e6e6e6" font-size="8" text-anchor="middle">folder: web</text><text x="395" y="60" fill="#9aa4b2" font-size="7.4" text-anchor="middle">只有 npm registry token</text>
    <rect x="466" y="36" width="140" height="30" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="536" y="48" fill="#e6e6e6" font-size="8" text-anchor="middle">folder: api</text><text x="536" y="60" fill="#9aa4b2" font-size="7.4" text-anchor="middle">只有內部 maven 憑證</text>
    <rect x="366" y="80" width="240" height="44" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.7"/><text x="486" y="96" fill="#e6e6e6" font-size="8.8" text-anchor="middle" font-weight="bold">folder: deploy</text><text x="486" y="109" fill="#54b890" font-size="7.6" text-anchor="middle">prod 憑證只在這裡 · 只能部署,不能刪叢集</text><text x="486" y="120" fill="#54b890" font-size="7.6" text-anchor="middle">每次 build 現發,build 結束就失效</text>
    <text x="466" y="146" fill="#9aa4b2" font-size="8.2" text-anchor="middle">PR build 在 web / api folder 底下</text>
    <text x="466" y="162" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">它根本看不到 deploy folder 的憑證</text>
    <text x="310" y="224" fill="#d6a45c" font-size="9.6" text-anchor="middle" font-weight="bold">看憑證只問三題:能做什麼 · 活多久 · 誰拿得到</text>
    <text x="310" y="240" fill="#9aa4b2" font-size="8.4" text-anchor="middle">三題都答得出來,才輪得到討論「有沒有加密」——那從來不是重點</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">憑證的風險不是「會不會被看到」,而是<b>看到的人能做多少事、能做多久</b>。放 Global 的那一刻,任何能觸發任何一個 job 的人(包含送 PR 的外部貢獻者)就都在你的信任邊界內了</figcaption>
</figure>

我的預設是:**憑證放 folder,不放 Global**;Production 相關的另外開一個 folder,權限跟其他專案切乾淨。System scope 留給 Jenkins 自己用(例如連 agent 的金鑰),pipeline 拿不到。

## withCredentials:綁定範圍越小越好

```groovy
stage('Deploy') {
  steps {
    withCredentials([
      string(credentialsId: 'deploy-token', variable: 'DEPLOY_TOKEN'),
      usernamePassword(credentialsId: 'registry', usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS'),
      file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')
    ]) {
      sh './scripts/deploy.sh'     // ← 只有這幾行拿得到,出了這個區塊就沒了
    }
  }
}
```

`environment { TOKEN = credentials('deploy-token') }` 是更短的寫法,但它有兩個要注意的地方:一是作用範圍變成整個 pipeline 或整個 stage(**綁得比需要的大**),二是用在 username-password 型別時會自動多產生 `TOKEN_USR` 與 `TOKEN_PSW` 兩個變數——不知道這件事的人,常常在日誌裡看到莫名其妙的變數名。

原則很簡單:**綁定要像 try-catch 一樣,包住剛好需要的那幾行。**

## 遮蔽不等於安全

Jenkins 會在日誌裡把憑證值換成 `****`,很多人因此以為「反正會被遮掉」。但遮蔽的原理只是:**輸出的時候,拿憑證的字串去比對、替換掉。** 它不追蹤這個值流去了哪裡。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 278" role="img" aria-label="日誌遮蔽擋得住什麼、擋不住什麼。憑證從 credentials store 經由 withCredentials 綁成環境變數之後,直接印出來會被遮成星號,這是遮蔽唯一有效的情況。但只要經過任何變形就失效:把值做 base64 或網址編碼再輸出、用 set -x 讓 shell 把整行指令連參數印出來、讓子行程把值寫進檔案然後被封存出去、用 curl 的詳細模式把授權標頭印在日誌裡、或是值出現在測試報告、當機傾印、第三方外掛倒出的設定裡。原因是遮蔽只是輸出時的字串比對,不是資訊流追蹤。結論:遮蔽是安全網,不是安全機制。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <rect x="14" y="86" width="118" height="44" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="73" y="104" fill="#e6e6e6" font-size="8.6" text-anchor="middle">credentials store</text><text x="73" y="118" fill="#9aa4b2" font-size="7.6" text-anchor="middle">withCredentials</text>
    <line x1="132" y1="108" x2="158" y2="108" stroke="#9aa4b2" stroke-width="1.3"/>
    <rect x="158" y="90" width="104" height="36" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="210" y="105" fill="#e6e6e6" font-size="8.4" text-anchor="middle">$DEPLOY_TOKEN</text><text x="210" y="118" fill="#9aa4b2" font-size="7.4" text-anchor="middle">環境變數</text>
    <line x1="262" y1="100" x2="292" y2="40" stroke="#54b890" stroke-width="1.2"/><line x1="262" y1="104" x2="292" y2="80" stroke="#e0733a" stroke-width="1.1"/><line x1="262" y1="108" x2="292" y2="118" stroke="#e0733a" stroke-width="1.1"/><line x1="262" y1="112" x2="292" y2="156" stroke="#e0733a" stroke-width="1.1"/><line x1="262" y1="116" x2="292" y2="194" stroke="#e0733a" stroke-width="1.1"/>
    <rect x="294" y="24" width="312" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.5"/><text x="306" y="43" fill="#54b890" font-size="8.4" text-anchor="start">✓ echo $DEPLOY_TOKEN → 日誌顯示 ****</text>
    <rect x="294" y="62" width="312" height="30" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="306" y="76" fill="#e0733a" font-size="8.4" text-anchor="start">✗ echo $TOKEN | base64 / urlencode / 切兩段</text><text x="306" y="88" fill="#9aa4b2" font-size="7.4" text-anchor="start">變形之後,字串比對就認不出來了</text>
    <rect x="294" y="100" width="312" height="30" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="306" y="114" fill="#e0733a" font-size="8.4" text-anchor="start">✗ set -x / sh -x</text><text x="306" y="126" fill="#9aa4b2" font-size="7.4" text-anchor="start">shell 把整行指令連參數一起印出來</text>
    <rect x="294" y="138" width="312" height="30" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="306" y="152" fill="#e0733a" font-size="8.4" text-anchor="start">✗ 子行程寫進檔案 → 被 archiveArtifacts 帶走</text><text x="306" y="164" fill="#9aa4b2" font-size="7.4" text-anchor="start">遮蔽只管日誌,不管你封存了什麼</text>
    <rect x="294" y="176" width="312" height="30" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="306" y="190" fill="#e0733a" font-size="8.4" text-anchor="start">✗ curl -v / debug log / 測試報告 / core dump</text><text x="306" y="202" fill="#9aa4b2" font-size="7.4" text-anchor="start">授權標頭、堆疊、記憶體傾印都可能夾帶它</text>
    <text x="310" y="232" fill="#d6a45c" font-size="9.6" text-anchor="middle" font-weight="bold">遮蔽 = 輸出時的字串比對,不是資訊流追蹤</text>
    <text x="310" y="250" fill="#9aa4b2" font-size="8.6" text-anchor="middle">它擋得住「不小心印出來」,擋不住任何經過一次變形或換一個出口的情況</text>
    <text x="310" y="268" fill="#9aa4b2" font-size="8.6" text-anchor="middle">所以它是<tspan fill="#e0733a" font-weight="bold">安全網</tspan>,不是安全機制——真正的防線是那把鑰匙本身能做什麼、活多久</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">把遮蔽當成保護,是這個題目最常見的認知錯誤。它的定位比較接近<b>安全帶</b>:該繫,但你不會因為繫了安全帶就閉著眼睛開車</figcaption>
</figure>

實際寫的時候,幾個具體的習慣就能擋掉大半:

```groovy
// ✗ 反例:token 出現在指令列上(ps 看得到、set -x 印得出來、shell 歷史也可能留)
sh "curl -H 'Authorization: Bearer ${TOKEN}' https://api.example.com/deploy"

// ✓ 正例:讓子行程自己從環境變數讀,值不進指令列
withCredentials([string(credentialsId: 'deploy-token', variable: 'TOKEN')]) {
  sh '''
    set +x                                  # 這一段不要展開指令
    curl -sS -H "Authorization: Bearer ${TOKEN}" https://api.example.com/deploy
  '''
}
```

還有一條我會在 review 直接擋下來的:**`archiveArtifacts` 之前要確認產物裡沒有機密**。最容易中的是「debug 用的設定 dump」「整包 `.env`」「把回應存下來的 json」——這些檔案一旦被封存,就跟著 build 紀錄躺在那,而且遮蔽完全管不到。

## 最小權限與短命 token:真正的防線

既然遮蔽靠不住,防線就要往前挪到憑證本身。我看憑證只問三個問題:

| 問題 | 好的答案長什麼樣 |
|---|---|
| **能做什麼?** | 只能做這條 pipeline 需要的事(能推 image,不能刪 registry;能部署,不能改 IAM) |
| **活多久?** | 每次 build 現發、跑完失效;而不是三年前建的、沒人記得的長命 token |
| **誰拿得到?** | 特定 folder / 特定 job;**外部 PR 的 build 一定拿不到部署憑證** |

第三題在開源或有外部貢獻者的專案特別要命:PR 來自 fork,而 PR build 會執行那個 PR 帶進來的程式碼——如果那次 build 拿得到部署金鑰,等於任何人送一個 PR 就能把金鑰印出來(還可以先 base64 一下)。這也是為什麼很多專案的 PR build 是**不帶任何憑證的**。

短命憑證的做法,現在的主流是接外部 secret manager 或雲端的身分聯合:

```groovy
// 骨架示意:向 Vault 換一組「這次 build 才有效」的資料庫憑證
withVault(vaultSecrets: [[
  path: 'database/creds/deployer',
  secretValues: [[envVar: 'DB_USER', vaultKey: 'username'],
                 [envVar: 'DB_PASS', vaultKey: 'password']]
]]) {
  sh './scripts/migrate.sh'
}
```

好處不只是安全:**輪替變成常態而不是專案**。長命憑證最大的問題其實是「不敢換」——換了不知道會壞掉哪些東西,於是一放三年。動態憑證從根本消滅這個恐懼。

這條線跟 [[k8s-config-secret|K8s 的 Secret 其實沒有加密]] 是同一個思路:**別把「存起來」當成「保護好了」**,要看的是誰能讀、能用它做什麼。Ansible 那邊的對應是 [[ansible-playbooks-advanced|Vault 管密文]],同樣是把機密從程式碼裡挪出去。

## 反思

### 我處理過的洩漏,沒有一次是「有人把密碼貼在 Jenkinsfile」

真正發生過的長這樣:某個部署腳本為了 debug,把要送出的完整 request 印出來——header 裡就有 token。因為那是**組合出來的字串**,遮蔽沒認出來,乾乾淨淨地印在 build 日誌上。而那條日誌又被日誌聚合系統收走了,於是它同時存在三個地方。

會犯這種錯的都不是不懂安全的人,他們只是在解一個很急的問題。所以我後來不太相信「大家小心一點」這種對策——**能被印出去的東西,總有一天會被印出去。** 該做的是讓那個 token 就算被印出去,傷害也有限:權限最小、有效期短、範圍切乾淨。

### 洩漏的第一動作是換金鑰,不是刪日誌

我看過團隊發現洩漏之後,花兩小時去刪 build 紀錄、清日誌、rebase git 歷史,然後鬆一口氣。那兩小時幾乎是白費的——**你不知道誰看過、備份在哪、日誌被同步到哪個系統、有沒有被爬走。**

正確的順序是:**先換金鑰(讓外洩的那份失效),再處理殘留,最後才檢討怎麼流出去的。** 換金鑰之所以常被拖延,通常是因為「不知道換了會壞掉哪些東西」——而這恰恰證明那把金鑰的作用範圍太大、被太多地方用著。所以「能不能十分鐘內換掉一把金鑰」,其實是憑證管理做得好不好的最佳單一指標。

### 憑證是「可審查」這件事唯一的例外,而它必須是明確的例外

整個系列的立場是:**能寫成程式碼的就寫成程式碼、進 git。** 憑證是這條原則唯一不適用的東西——但正因為它是例外,更要處理得明確:Jenkinsfile 裡出現的是 **ID 不是值**,ID 本身是可 review 的(「這個 stage 為什麼需要 production 的憑證?」是一個好問題,而且看得到才問得出來);值住在 store 或 secret manager,有自己的稽核與輪替機制。

換句話說,**機密不進 git,但「誰在哪裡用了什麼機密」要進 git。** 這樣可審查性其實沒有破口——你 review 的不是那串字,是那個授權關係。這是我認為最漂亮的一個切法:例外只有一個,而且例外本身也被管理著。

下一篇處理另一個規模化的問題:十個專案十份幾乎一樣的 Jenkinsfile,怎麼抽成一份共用函式庫,又不會抽出一個沒人看得懂的 DSL。
