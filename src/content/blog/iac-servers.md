---
title: "Servers as Code:烘烤線畫在哪,決定你開機多快、改動多痛"
date: 2026-08-06
category: tech
description: "往下一層,進到伺服器本身。機器上的東西分層看:基底 OS、套件、agent、應用、instance 設定——每一層都要回答同一個問題:烤進 image(bake),還是開機時才灌(fry)?烘烤線畫得越低,改動回饋越快但開機越慢越不穩;畫得越高,開機即用但改一行要重建 image。至於改一台跑著的伺服器,只有兩個誠實的流派:持續同步收斂,或乾脆不改——換一台。"
tags:
  - iac
  - devops
  - book-notes
series: "Infrastructure as Code 讀書筆記"
seriesOrder: 8
comments: true
draft: false
---
[[iac-stacks|Stack 那層]]管的是「有哪些資源」;這篇往下鑽進資源裡最有內容物的那種——伺服器本身。一台 server 從開機到能服務,身上堆了一整疊東西,而 IaC 在這層要回答兩個問題:**這疊東西什麼時候放上去?**以及**放上去之後要改,怎麼改?** 兩個問題各有一組取捨,書把它們講成了這章最好用的兩個模型。

## 伺服器上的東西,先分層再談

談「怎麼建一台 server」之前先把內容物攤開——因為不同層的答案不一樣:

- **基底 OS**:發行版、核心設定——幾個月才動一次。
- **套件與 runtime**:語言環境、函式庫、系統工具——幾週一動。
- **agent 與共用設定**:監控 agent、log 收集、公司統一的安全設定——偶爾動。
- **應用與它的設定**:部署頻率最高的一層——天天動。
- **資料與狀態**:嚴格說**不屬於伺服器**。log 送出去、資料放外部儲存——狀態外移不了,[[iac-principles|可拋棄]]就是空話,這台機器自動變回寵物。

## Bake vs Fry:烘烤線畫在哪

上面那疊東西,每一層都有兩個上車時機:**烤進 image**(bake——用 Packer 這類工具預先建好機器映像檔),或**開機時才灌**(fry——cloud-init 跑 script、組態工具開機時收斂)。分界線我叫它「烘烤線」,而它畫在哪,就是這章的核心取捨:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 250" role="img" aria-label="伺服器內容分層與烘烤線:由下往上是基底 OS、套件與 runtime、agent 與共用設定、應用、instance 專屬設定;烘烤線以下烤進 image,每台一樣、開機即用;以上開機時才灌,有彈性但慢且可能失敗;線往下移回饋快,往上移開機快" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="svArr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#4f6df5"/></marker><marker id="svArr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="40" y="24" width="220" height="34" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="150" y="45" fill="#e6e6e6" font-size="10" text-anchor="middle">instance 專屬設定</text>
    <rect x="40" y="62" width="220" height="34" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="150" y="83" fill="#e6e6e6" font-size="10" text-anchor="middle">應用與它的設定</text>
    <line x1="24" y1="106" x2="352" y2="106" stroke="#4f6df5" stroke-width="1.8" stroke-dasharray="7 5"/>
    <text x="308" y="99" fill="#4f6df5" font-size="9.5" text-anchor="middle">烘烤線</text>
    <rect x="40" y="116" width="220" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="150" y="137" fill="#e6e6e6" font-size="10" text-anchor="middle">agent・共用設定</text>
    <rect x="40" y="154" width="220" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="150" y="175" fill="#e6e6e6" font-size="10" text-anchor="middle">套件與 runtime</text>
    <rect x="40" y="192" width="220" height="34" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="150" y="213" fill="#e6e6e6" font-size="10" text-anchor="middle">基底 OS</text>
    <text x="368" y="48" fill="#e6e6e6" font-size="9.5" text-anchor="start">線以上:開機時才灌(fry)</text>
    <text x="368" y="64" fill="#9aa4b2" font-size="9" text-anchor="start">彈性、改了馬上生效;</text>
    <text x="368" y="78" fill="#9aa4b2" font-size="9" text-anchor="start">但開機慢、開機時可能失敗</text>
    <text x="368" y="150" fill="#e6e6e6" font-size="9.5" text-anchor="start">線以下:烤進 image(bake)</text>
    <text x="368" y="166" fill="#9aa4b2" font-size="9" text-anchor="start">每台一模一樣、開機即用;</text>
    <text x="368" y="180" fill="#9aa4b2" font-size="9" text-anchor="start">但改一行要重建 image</text>
    <line x1="330" y1="126" x2="330" y2="88" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#svArr2)"/>
    <line x1="330" y1="88" x2="330" y2="126" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="280" y="244" fill="#9aa4b2" font-size="9.5" text-anchor="middle">線可以移:往上移=開機快、變更慢;往下移=變更快、開機慢——沒有免費的方向</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同一疊內容、一條可移動的烘烤線:穩定的層往下烤(一致、開機快),常變的層留在線上(回饋快)。兩個極端都是陷阱</figcaption>
</figure>

兩個極端各自的下場都很具體。**全烤(線拉到頂)**:開機即用、台台一致,但應用改一個參數也要重建 image——回饋迴路從秒級變成幾十分鐘,大家開始繞過 pipeline 直接 SSH 上去改,雪花回歸。**全灌(線拉到底)**:image 就是裸 OS,彈性最大,但每次開機都要重灌全世界——開機十分鐘起跳,而且開機過程依賴外部套件庫,mirror 一掛、版本一飄,**同一份 code 今天和上週開出來的機器不一樣**,冪等被戳破。

書的建議務實:**穩定的往下烤,常變的留在線上**——而且 image 本身要有自己的 pipeline(build → 測試 → 發版),它跟任何 artifact 一樣是版本化的產物,不是某人手上那顆「大家都用的 AMI」。

## 改一台跑著的伺服器:只有兩個誠實的流派

機器起來之後,世界繼續變——套件要更新、設定要調。這章把「怎麼改活著的機器」收斂成兩個流派:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 210" role="img" aria-label="兩個流派:持續同步——組態工具定期對長壽伺服器收斂,把飄移拉回定義;immutable——伺服器不改,變更等於建新 image、起新機、切流量、銷毀舊機" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="scArr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="280" y1="14" x2="280" y2="200" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 4"/>
    <text x="140" y="32" fill="#e6e6e6" font-size="12" text-anchor="middle">持續同步</text>
    <text x="420" y="32" fill="#e6e6e6" font-size="12" text-anchor="middle">Immutable:換,不修</text>
    <rect x="40" y="56" width="200" height="36" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="140" y="78" fill="#e6e6e6" font-size="10" text-anchor="middle">組態工具(定義檔)</text>
    <rect x="40" y="136" width="200" height="36" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="140" y="158" fill="#e6e6e6" font-size="10" text-anchor="middle">長壽的伺服器(有 drift)</text>
    <path d="M 110 92 Q 96 114 110 134" fill="none" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#scArr)"/>
    <path d="M 170 134 Q 184 114 170 94" fill="none" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#scArr)"/>
    <text x="140" y="118" fill="#9aa4b2" font-size="9" text-anchor="middle">定期收斂</text>
    <text x="140" y="192" fill="#9aa4b2" font-size="9.5" text-anchor="middle">機器長壽,一致性靠反覆執行拉回來</text>
    <rect x="306" y="56" width="100" height="32" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="356" y="76" fill="#e6e6e6" font-size="9.5" text-anchor="middle">建新版 image</text>
    <line x1="406" y1="72" x2="428" y2="72" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#scArr)"/>
    <rect x="430" y="56" width="100" height="32" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="480" y="76" fill="#e6e6e6" font-size="9.5" text-anchor="middle">起新的一批</text>
    <line x1="480" y1="88" x2="480" y2="110" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#scArr)"/>
    <rect x="430" y="114" width="100" height="32" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="480" y="134" fill="#e6e6e6" font-size="9.5" text-anchor="middle">切流量過去</text>
    <line x1="428" y1="130" x2="406" y2="130" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#scArr)"/>
    <rect x="306" y="114" width="100" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="356" y="134" fill="#9aa4b2" font-size="9.5" text-anchor="middle">銷毀舊的一批</text>
    <text x="420" y="192" fill="#9aa4b2" font-size="9.5" text-anchor="middle">機器短命,一致性靠「根本沒機會飄」</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">持續同步接受機器長壽,用反覆收斂對抗飄移;immutable 直接取消問題——跑著的機器永遠不改,變更=換一批新的</figcaption>
</figure>

- **持續同步**:接受機器長壽,讓組態工具排程反覆執行,把飄移不斷拉回定義——[[ansible-intro|Ansible]] 那條線的世界觀,也是[[iac-everything-as-code|冪等]]價值最大化的地方。弱點:同步範圍之外的東西照樣飄(工具只管它定義過的),而且「反覆對活機器動手」永遠有一絲不確定。
- **Immutable server**:跑著的機器**永遠不改**——變更一律走「新 image → 起新機 → 切流量 → 銷毀舊機」。飄移這個問題類別被直接取消:機器活不過下一次部署,哪來的時間累積個性。代價是門檻:image pipeline 要夠快夠熟,狀態要全部外移,不然你 immutable 掉的會是別人的資料。

值得說破的是:這不是新舊之爭,是**前提之爭**。狀態外移做不到、image pipeline 不成熟、機器天生長壽(資料庫節點),持續同步就是對的;反之,無狀態的服務層沒有理由不走 immutable——它是[[iac-principles|「牛,不是寵物」]]的完全體。

## 反思

### 烘烤線的位置,用「一天改幾次」來畫最準

我自己的踩坑經驗剛好是兩個極端各一次。一次是 CI runner 的環境全用開機 script 灌——每次起 runner 等八分鐘,套件庫抽風時整條 CI 跟著躺;後來把工具鏈全烤進 image,開機三十秒,但又矯枉過正把跑測試用的設定檔也烤了進去,改一個環境變數要等 image pipeline 跑二十分鐘。最後穩定下來的判準其實很土:**把每一層的「平均變更頻率」寫出來,一天會改超過一次的,絕對不准進 image;一個月改不到一次的,絕對不留在開機時**。中間的灰色地帶才需要討論,而灰色地帶通常沒幾層。

### Immutable 的門檻在狀態,不在 image

很多團隊評估 immutable 時,力氣都花在「image pipeline 怎麼建」,但那是工具問題,一週就能解;真正卡住的都是**「這台機器上有什麼東西是砍掉會痛的」**——本機的 log 沒人送走、跑批的中間檔落在本機磁碟、某個服務把 session 存在記憶體。這張清單才是 immutable 的真正前置作業,而且它有個好處:就算你最後不走 immutable,把清單清空的過程本身就在還債——每清掉一項,機器就少一分寵物性。我的建議是把「這台機器現在可以直接砍掉嗎?」放進 架構 review 的固定問題清單,答案是「不行」的每一個理由,都是一筆記錄在案的風險。

### 容器把這章的答案內建了,但沒有取消這章

用容器的人讀這章會一直點頭:Dockerfile 就是 bake pipeline,container 天生 immutable,「改就是換」是預設而不是選項——這章的結論被整包內建成容器的世界觀,這也是容器贏的真正原因之一。但別急著把這章歸檔成歷史:**你的 k8s node 本身還是一台 server**,node image 怎麼建、烘烤線畫哪、node 要不要 immutable rolling 換——問題一個都沒少,只是搬到了下一層。[[k8s-intro|K8s]] 把應用層的伺服器問題解掉了,代價是平台團隊把同一組問題原封不動接了過去。
