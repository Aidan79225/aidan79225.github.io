---
title: "Controller 與 Agent:工作到底在哪台機器上跑"
date: 2026-08-22
category: tech
description: "Jenkinsfile 裡那行 sh 到底在哪台機器上執行?這篇拆開 Jenkins 的兩種角色:controller 只負責讀檔、排隊、派工、留紀錄,真正跑 build 的是 agent。順著講清楚三件常被誤解的事——排隊等的是 executor 格子而不是機器、label 是 Jenkinsfile 對平台開出的能力需求(而不是機器名),以及為什麼「只有 03 號機才 build 得過」代表你的建置其實綁在一台機器的狀態上。"
tags:
  - jenkins
  - ci-cd
  - infrastructure
series: "Jenkins 學習筆記"
seriesOrder: 3
comments: true
draft: true
---
上一篇那份 Jenkinsfile 裡有一行 `sh './scripts/ci-build.sh'`。它到底在**哪台機器**上執行?

這個問題聽起來很基本,但它決定了三件事:你的 build 要等多久、失敗時該去哪台機器查、以及最重要的——**換一台機器跑,還會不會過**。

## Controller 不 build,它只做四件事

Jenkins 的 controller(以前叫 master)其實不碰你的程式碼。它負責的是:

1. **讀 Jenkinsfile**——從 repo 拉下來、解析結構;
2. **排隊**——把待跑的 build 放進佇列;
3. **派工**——依照 label 找到合適的 agent,把工作丟過去;
4. **保存**——紀錄、日誌、產物、以及那個大家都在看的 UI。

**它不該執行 build。** 這不是潔癖,是很實際的理由:controller 是單點,它一倒,全公司不能上線;而 build 是最會吃 CPU、吃記憶體、寫滿硬碟、偶爾把整台機器搞掛的工作。把兩者放同一台,等於拿最脆弱的東西去承受最粗暴的負載。

實務上第一件該做的事,就是把內建節點的 executor 數設成 0——用 JCasC 寫是這樣(這份檔案本身也該進 git,第 12 篇會專門講):

```yaml
# jenkins.yaml —— Configuration as Code
jenkins:
  numExecutors: 0        # 內建節點不接工作:controller 只調度,不建置
  labelString: "built-in"
```

## 一個 build 從觸發到真的開始跑

按下 build 到日誌開始滾動,中間這段路是很多人卡住卻不知道自己卡在哪的地方:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 272" role="img" aria-label="一個 build 從觸發到開始執行的派工流程。第一步觸發,來自 webhook 或 PR。第二步進入佇列排隊。第三步 controller 依照 Jenkinsfile 宣告的 label linux 且 docker 進行媒合。右側三台 agent:第一台帶有 linux 與 docker 標籤,三個 executor 格子中兩個已被佔用、剩一格空著,工作派給它;第二台只有 linux 標籤,雖然閒置但標籤不符,不會派過去;第三台是 mac 標籤,同樣不符。底部說明:排隊等的是 executor 格子不是機器,一台 agent 有幾個 executor 就能同時跑幾個 build;label 不符的 agent 就算全空也輪不到它。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="ca1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="ca2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker></defs>
    <rect x="12" y="70" width="86" height="44" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/><text x="55" y="88" fill="#e6e6e6" font-size="9.4" text-anchor="middle">① 觸發</text><text x="55" y="103" fill="#9aa4b2" font-size="8" text-anchor="middle">webhook / PR</text>
    <line x1="98" y1="92" x2="116" y2="92" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ca1)"/>
    <rect x="118" y="62" width="104" height="60" rx="7" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.4"/><text x="170" y="80" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">② 佇列</text><rect x="132" y="88" width="22" height="12" rx="2" fill="#262b3a" stroke="#9aa4b2" stroke-width="0.9"/><rect x="159" y="88" width="22" height="12" rx="2" fill="#262b3a" stroke="#9aa4b2" stroke-width="0.9"/><rect x="186" y="88" width="22" height="12" rx="2" fill="#262b3a" stroke="#9aa4b2" stroke-width="0.9"/><text x="170" y="115" fill="#9aa4b2" font-size="7.8" text-anchor="middle">等一個空格子</text>
    <line x1="222" y1="92" x2="240" y2="92" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ca1)"/>
    <rect x="242" y="62" width="118" height="60" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="301" y="80" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">③ 依 label 媒合</text><text x="301" y="97" fill="#e6e6e6" font-size="8" text-anchor="middle">Jenkinsfile 說:</text><text x="301" y="111" fill="#54b890" font-size="8.2" text-anchor="middle">linux &amp;&amp; docker</text>
    <line x1="360" y1="76" x2="386" y2="52" stroke="#54b890" stroke-width="1.4" marker-end="url(#ca2)"/>
    <line x1="360" y1="100" x2="386" y2="126" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="3 3"/>
    <line x1="360" y1="110" x2="386" y2="182" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="3 3"/>
    <rect x="388" y="26" width="218" height="52" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.6"/><text x="400" y="44" fill="#e6e6e6" font-size="9.2" text-anchor="start">agent-a</text><text x="596" y="44" fill="#54b890" font-size="8" text-anchor="end">label: linux docker</text><rect x="400" y="52" width="18" height="16" rx="3" fill="#54b890" stroke="#54b890" stroke-width="1"/><rect x="424" y="52" width="18" height="16" rx="3" fill="#54b890" stroke="#54b890" stroke-width="1"/><rect x="448" y="52" width="18" height="16" rx="3" fill="#1f2430" stroke="#54b890" stroke-width="1.2"/><text x="480" y="65" fill="#9aa4b2" font-size="7.8" text-anchor="start">3 個 executor,還剩 1 格 → 派這台</text>
    <rect x="388" y="88" width="218" height="52" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="400" y="106" fill="#9aa4b2" font-size="9.2" text-anchor="start">agent-b</text><text x="596" y="106" fill="#9aa4b2" font-size="8" text-anchor="end">label: linux</text><rect x="400" y="114" width="18" height="16" rx="3" fill="#1f2430" stroke="#3a4154" stroke-width="1.2"/><rect x="424" y="114" width="18" height="16" rx="3" fill="#1f2430" stroke="#3a4154" stroke-width="1.2"/><text x="456" y="127" fill="#e0733a" font-size="7.8" text-anchor="start">全空,但沒有 docker → 輪不到它</text>
    <rect x="388" y="150" width="218" height="52" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="400" y="168" fill="#9aa4b2" font-size="9.2" text-anchor="start">agent-mac</text><text x="596" y="168" fill="#9aa4b2" font-size="8" text-anchor="end">label: mac</text><rect x="400" y="176" width="18" height="16" rx="3" fill="#54b890" stroke="#54b890" stroke-width="1"/><rect x="424" y="176" width="18" height="16" rx="3" fill="#1f2430" stroke="#3a4154" stroke-width="1.2"/><text x="456" y="189" fill="#9aa4b2" font-size="7.8" text-anchor="start">簽 iOS 用的,別的工作不派來</text>
    <text x="310" y="228" fill="#d6a45c" font-size="9.6" text-anchor="middle" font-weight="bold">排隊等的是 executor 格子,不是機器</text>
    <text x="310" y="245" fill="#9aa4b2" font-size="8.6" text-anchor="middle">一台 agent 有幾個 executor,就能同時跑幾個 build——格子開太多,大家一起搶 CPU 與硬碟</text>
    <text x="310" y="262" fill="#9aa4b2" font-size="8.6" text-anchor="middle">而 label 不符的 agent,就算整台閒著也不會被派工:你的 build 在等的往往不是「機器」,是「對的機器」</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">卡在佇列裡的 build,原因通常是兩種之一:<b>符合 label 的 agent 全滿了</b>(要加機器或加格子),或是<b>根本沒有 agent 帶那個 label</b>(那會永遠等下去,而 UI 上只會顯示「等待中」,不會告訴你這件事)。分清楚這兩者,是排查 CI 變慢的第一步</figcaption>
</figure>

**Executor 是這裡最常被誤解的概念。** 它不是一台機器,而是一台 agent 上的**並行格子**:一台 agent 設 4 個 executor,就能同時跑 4 個 build。所以「加機器」跟「加 executor」是兩種不同的解法——而且後者很容易變成災難,我在反思那段會講。

## Label:Jenkinsfile 開需求,平台負責供給

工作要去哪一台,不是誰在 UI 上挑的,是 Jenkinsfile 裡宣告的:

```groovy
pipeline {
  agent { label 'linux && docker' }   // 需要:Linux,而且裝了 docker
  // ...
}
```

label 支援布林運算(`&&`、`||`、`!`),所以你可以精確描述「這份工作需要什麼能力」。也可以整條 pipeline 不綁 agent,讓每個 stage 自己挑:

```groovy
pipeline {
  agent none                                  // 整條不佔 agent

  stages {
    stage('Build') {
      agent { label 'linux && docker' }
      steps { sh './scripts/ci-build.sh' }
    }
    stage('Sign iOS') {
      agent { label 'mac && xcode-16' }       // 只有這一段需要 mac
      steps { sh './scripts/sign.sh' }
    }
  }
}
```

這裡有個一定要知道的陷阱:**換 agent 就是換機器,也就換了 workspace。** 上一個 stage 產出的檔案不會自己跟過去,要靠 `stash` / `unstash` 搬運——這是下一篇的主題。

還有一個我看到就會在 review 提出來的反模式:

```groovy
agent { label 'build-server-03' }   // ✗ 這不是能力,是機器名
```

**label 應該描述「需要什麼能力」,不是「要哪一台機器」。** 寫成機器名,等於把實作細節寫進契約——那台機器退役、改名、或臨時要維護,所有指名它的 pipeline 一起壞掉。這個抽象跟 Kubernetes 的 nodeSelector 是同一個道理:[[k8s-scheduling-advanced|你宣告需求,排程器負責媒合]],而不是自己挑 node。

## Agent 怎麼接上來

三種接法,差別在**誰主動連誰**,以及**誰負責這台機器的生命週期**:

| 方式 | 連線方向 | 適合 | 代價 |
|---|---|---|---|
| **SSH** | controller 主動連 agent | 固定的 VM、地端機房 | controller 要能連到 agent(網路、金鑰要管) |
| **Inbound(JNLP)** | agent 主動連回 controller | NAT / 防火牆後面、雲端、跨網段 | agent 要拿得到連線密鑰 |
| **動態容器 / K8s Pod** | 每次 build 現開,跑完就丟 | 尖峰彈性、要乾淨環境 | 沒有暖好的快取,首次拉相依較慢(第 11 篇談) |

順帶一個安全提醒:**agent 拿得到 controller 派給它的一切**,包含那次 build 用到的憑證。所以「誰能在共用 agent 上跑 build」跟「誰能拿到正式環境的金鑰」是同一個問題——第 6 篇會專門談。

## 手養的 agent,是環境飄移的溫床

最後這件事,是整篇最重要的:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 236" role="img" aria-label="寵物式 agent 與可拋棄 agent 的對照。左邊是手養的 agent:上面堆著 2019 年某人裝的 JDK、手動改過的系統設定、只有這台有的工具、以及暖了三年的快取。build 在這台是綠的,但換一台就爆,因為建置其實依賴這台機器的狀態,沒人敢動它、也不敢升級它。右邊是可拋棄的 agent:每次 build 從同一份映像檔開一台全新的,跑完就丟,三次 build 拿到三個一模一樣的環境,build 綠代表程式碼與映像檔的結果,跟哪台機器無關。中間的判斷法:這台 agent 明天被砍掉重建,build 還會過嗎?答不出來,它就是寵物。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <line x1="310" y1="16" x2="310" y2="196" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="152" y="22" fill="#e0733a" font-size="10.5" text-anchor="middle" font-weight="bold">寵物:手養的 agent</text>
    <rect x="40" y="34" width="224" height="106" rx="8" fill="#3a2626" stroke="#e0733a" stroke-width="1.6"/>
    <text x="152" y="52" fill="#e6e6e6" font-size="9.4" text-anchor="middle" font-weight="bold">build-server-03</text>
    <rect x="54" y="60" width="196" height="17" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="152" y="72" fill="#9aa4b2" font-size="7.8" text-anchor="middle">JDK 8(2019 年某人手動裝的)</text>
    <rect x="54" y="80" width="196" height="17" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="152" y="92" fill="#9aa4b2" font-size="7.8" text-anchor="middle">改過的系統設定,原因已失傳</text>
    <rect x="54" y="100" width="196" height="17" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="152" y="112" fill="#9aa4b2" font-size="7.8" text-anchor="middle">只有這台有的工具 + 暖了三年的快取</text>
    <text x="152" y="133" fill="#e0733a" font-size="8.4" text-anchor="middle" font-weight="bold">build 在這台是綠的</text>
    <text x="152" y="158" fill="#e6e6e6" font-size="8.8" text-anchor="middle">換一台 → 爆</text>
    <text x="152" y="174" fill="#9aa4b2" font-size="8.2" text-anchor="middle">沒人敢動它、不敢升級、不敢重灌</text>
    <text x="152" y="190" fill="#e0733a" font-size="8.4" text-anchor="middle">建置的結果,取決於這台機器的歷史</text>
    <text x="466" y="22" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">牛:可拋棄的 agent</text>
    <rect x="350" y="34" width="232" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="466" y="53" fill="#54b890" font-size="8.8" text-anchor="middle">同一份映像檔 / 同一份 Ansible playbook</text>
    <rect x="352" y="76" width="70" height="46" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/><text x="387" y="95" fill="#e6e6e6" font-size="8" text-anchor="middle">build #1</text><text x="387" y="110" fill="#9aa4b2" font-size="7.4" text-anchor="middle">現開現丟</text>
    <rect x="431" y="76" width="70" height="46" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/><text x="466" y="95" fill="#e6e6e6" font-size="8" text-anchor="middle">build #2</text><text x="466" y="110" fill="#9aa4b2" font-size="7.4" text-anchor="middle">現開現丟</text>
    <rect x="510" y="76" width="70" height="46" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/><text x="545" y="95" fill="#e6e6e6" font-size="8" text-anchor="middle">build #3</text><text x="545" y="110" fill="#9aa4b2" font-size="7.4" text-anchor="middle">現開現丟</text>
    <text x="466" y="141" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">三次拿到一模一樣的環境</text>
    <text x="466" y="166" fill="#e6e6e6" font-size="8.8" text-anchor="middle">壞了就砍掉重開,不用搶救</text>
    <text x="466" y="182" fill="#9aa4b2" font-size="8.2" text-anchor="middle">升級=換映像檔,而且看得到 diff</text>
    <text x="466" y="198" fill="#54b890" font-size="8.4" text-anchor="middle">建置的結果,只取決於程式碼與映像檔</text>
    <text x="310" y="222" fill="#d6a45c" font-size="9.6" text-anchor="middle" font-weight="bold">判斷法:這台 agent 明天被砍掉重建,build 還會過嗎?</text>
    <text x="310" y="236" fill="#9aa4b2" font-size="8.6" text-anchor="middle">答不出來,它就是寵物——而你的「可重現」其實是靠一台沒人敢碰的機器撐著</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左邊那台機器上的每一樣東西,都是某次「先手動裝一下」留下來的沉積層。它讓 build 過得去,也讓你的建置<b>悄悄依賴了一個沒有寫在任何地方的環境</b>——這正是 <a href="/blog/iac-principles/">IaC 說的 cattle not pets</a>:機器該是可重建的,不是可供奉的</figcaption>
</figure>

從寵物到牛,中間有一條可以逐步走的路,不必一步到位:

1. **手養**——SSH 上去裝東西,裝完就忘;
2. **可重建**——用 [[ansible-intro|Ansible]] 之類的工具把 agent 的組態寫成程式碼,隨時能照著重建一台(這已經解決八成問題);
3. **可拋棄**——每次 build 用容器或 K8s pod 現開現丟,環境飄移歸零(第 11 篇)。

多數團隊卡在第一階,而**跨到第二階的投報率最高**:你不需要動整套 K8s,只要「這台機器怎麼來的」有一份寫在 git 裡的答案,環境飄移就止血了。

## 反思

### 「只有 03 號機 build 得過」是我看過最貴的技術債

這句話我聽過不只一次,而且每次背後都是同一個故事:某台 agent 上有人為了救急手動裝了某個版本的工具,沒寫在任何地方;後來 build 開始只在那台過,於是大家很自然地在 Jenkinsfile 裡指名那台機器。從此那台機器變成聖物——不敢升級、不敢重灌、OS 有漏洞也不敢修。

代價在硬碟壞掉那天一次付清。重建花了兩天,不是因為裝機器慢,是因為**沒有人知道那台機器上到底有什麼**——只能靠考古:翻舊 build 的日誌、比對版本、一個一個試。

所以現在我對 agent 只有一個要求:**它必須是能被砍掉重建的。** 我甚至覺得,團隊該定期主動重建一台 agent,不是為了維護,是為了**驗證自己還做得到**。這跟備份一樣——沒還原演練過的備份,不算備份;沒重建過的 agent,不算可重建。

### Executor 開太多,是一種免費的錯覺

有次 CI 塞車,我第一直覺是把幾台 agent 的 executor 從 4 調到 8——反正機器閒著也是閒著。結果隊列確實變短了,但**每個 build 的執行時間拉長了快一倍**,而且開始出現詭異的偶發失敗:測試逾時、port 被佔用、磁碟寫入卡住。

原因很簡單:executor 是**並行格子,不是資源**。八個 build 擠在一台四核機器上,它們搶的是同一份 CPU、同一顆硬碟、同一段網路頻寬。從開發者的角度看,「排隊 5 分鐘 + 跑 10 分鐘」變成「排隊 1 分鐘 + 跑 19 分鐘」,體感更差,還多了一批查不出原因的 flaky。

後來我把它調回 4,甚至有幾台調到 2(那種 build 本身就會吃滿多核的專案)。**要看的指標從來不是「隊列長度」,是「從提交到綠燈」的總時間**——這件事第 13 篇會展開講。

### Label 是一份介面契約

最後一個觀念上的收穫:我現在把 label 看成 **pipeline 與平台之間的介面**。Jenkinsfile 那一側說「我需要一台 Linux、要有 docker」,平台那一側負責供給——中間怎麼實作(地端 VM、雲端機器、K8s pod)是平台的自由。

這個切法帶來的好處很實際:平台把地端 agent 換成 K8s 動態 pod 那次,只要新的 pod 帶著同一組 label,**沒有任何一個專案需要改 Jenkinsfile**。而那些當初圖方便寫了機器名的 pipeline,就是那次遷移裡唯一要一個一個去修的。

介面寫得抽象一點,當下多花五分鐘;寫成機器名,兩年後有人要花兩週。

下一篇會停在同一台 agent 上,看更細的東西:build 跑起來之後,檔案到底放在哪裡(workspace)、產物怎麼留下來(artifact 與 fingerprint),以及「快取」這件事到底是在拿什麼換什麼。
