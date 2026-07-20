---
title: "打包與部署:Helm 與 Kustomize"
date: 2026-07-19
category: tech
tags:
  - kubernetes
  - operations
series: "Kubernetes 學習筆記"
seriesOrder: 14
comments: true
draft: false
---
前面每一篇都在教你寫 YAML,但實務有個逃不掉的痛:**同一個 app 要上 Development、Staging、Production,而三個環境九成的 YAML 一模一樣,只有幾個地方不同**——副本數、映像 tag、資源大小、對外網址。如果你 copy-paste 三份各自維護,改一個共同欄位就要同步三次,遲早出錯。這篇談兩個解決這件事的主流工具:**Helm** 與 **Kustomize**,以及它們背後兩種很不一樣的世界觀。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 214" role="img" aria-label="跨環境部署的痛點:同一個 app 的一堆 YAML,要部署到 Development、Staging、Production 三個環境,三者九成內容相同,只有副本數、映像 tag、資源大小、對外網址這幾個值不同。與其複製三份各自維護,不如一份共用來源加上每個環境的差異" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="pk" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="18" y="78" width="150" height="60" rx="9" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="93" y="102" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">同一個 app</text>
    <text x="93" y="119" fill="#9aa4b2" font-size="8" text-anchor="middle">一堆 YAML</text>
    <text x="93" y="131" fill="#9aa4b2" font-size="8" text-anchor="middle">九成內容共用</text>
    <line x1="168" y1="98" x2="236" y2="52" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pk)"/>
    <line x1="168" y1="108" x2="236" y2="108" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pk)"/>
    <line x1="168" y1="118" x2="236" y2="166" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pk)"/>
    <rect x="238" y="24" width="346" height="52" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="252" y="43" fill="#54b890" font-size="9.5" font-weight="bold" text-anchor="start">Development</text><text x="252" y="60" fill="#9aa4b2" font-size="8" text-anchor="start">replicas:1 · image:app:dev · 資源小 · host:dev.local</text>
    <rect x="238" y="82" width="346" height="52" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="252" y="101" fill="#d6a45c" font-size="9.5" font-weight="bold" text-anchor="start">Staging</text><text x="252" y="118" fill="#9aa4b2" font-size="8" text-anchor="start">replicas:2 · image:app:rc · host:stg.example.com</text>
    <rect x="238" y="140" width="346" height="52" rx="8" fill="#262b3a" stroke="#e05a7d" stroke-width="1.4"/><text x="252" y="159" fill="#e05a7d" font-size="9.5" font-weight="bold" text-anchor="start">Production</text><text x="252" y="176" fill="#9aa4b2" font-size="8" text-anchor="start">replicas:10 · image:app:1.4 · 資源大 · host:example.com</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">跨環境部署的本質:一份 app,三個環境,<b>九成 YAML 相同、只有幾個值不同</b>。與其複製三份各自維護(改一處要同步三次),不如「<b>一份共用來源 + 每個環境的差異</b>」——Helm 與 Kustomize 就是這件事的兩種做法</figcaption>
</figure>

## 兩種哲學:模板填空 vs 疊加補丁

Helm 與 Kustomize 都在解「一份來源 + 每環境差異」,但路數南轅北轍。一個把 YAML 當**有變數的模板**去填,一個把 YAML 當**資料**去疊補丁:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 296" role="img" aria-label="Helm 與 Kustomize 的對比。左邊 Helm 是模板填空:template.yaml 裡有 replicas 等於雙大括號 Values.replicas 這種變數佔位,搭配 values-dev、values-prod 這些值檔,helm install 或 upgrade 把它渲染成具體 YAML 再 apply。右邊 Kustomize 是疊加補丁:base 目錄是本身就合法可直接 apply 的純 YAML,overlays 目錄下每個環境放一小塊 patch,kubectl apply -k 把補丁合併進 base 再 apply" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="ph" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="8" y="26" width="298" height="262" rx="10" fill="none" stroke="#9b6ff0" stroke-width="1.5"/>
    <text x="157" y="46" fill="#9b6ff0" font-size="11" font-weight="bold" text-anchor="middle">Helm:模板填空</text>
    <rect x="26" y="58" width="150" height="52" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="101" y="76" fill="#e6e6e6" font-size="8.8" text-anchor="middle">template.yaml</text><text x="101" y="92" fill="#9aa4b2" font-size="7.8" text-anchor="middle">replicas:</text><text x="101" y="103" fill="#54b890" font-size="7.8" text-anchor="middle">{{ .Values.replicas }}</text>
    <rect x="192" y="58" width="112" height="52" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="248" y="78" fill="#d6a45c" font-size="8.4" text-anchor="middle">values-dev.yaml</text><text x="248" y="94" fill="#d6a45c" font-size="8.4" text-anchor="middle">values-prod.yaml</text><text x="248" y="105" fill="#9aa4b2" font-size="7.5" text-anchor="middle">要填的值</text>
    <line x1="101" y1="110" x2="140" y2="140" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ph)"/>
    <line x1="248" y1="110" x2="180" y2="140" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ph)"/>
    <rect x="46" y="144" width="222" height="40" rx="7" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.6"/><text x="157" y="162" fill="#9b6ff0" font-size="9" text-anchor="middle">helm install / upgrade</text><text x="157" y="177" fill="#9aa4b2" font-size="7.8" text-anchor="middle">把變數渲染成具體值</text>
    <line x1="157" y1="184" x2="157" y2="208" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ph)"/>
    <rect x="46" y="210" width="222" height="34" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="157" y="231" fill="#e6e6e6" font-size="8.8" text-anchor="middle">填好的具體 YAML</text>
    <line x1="157" y1="244" x2="157" y2="266" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ph)"/>
    <text x="157" y="281" fill="#54b890" font-size="9" text-anchor="middle">→ apply 到叢集</text>
    <rect x="314" y="26" width="298" height="262" rx="10" fill="none" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="463" y="46" fill="#4f6df5" font-size="11" font-weight="bold" text-anchor="middle">Kustomize:疊加補丁</text>
    <rect x="332" y="58" width="150" height="52" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="407" y="78" fill="#54b890" font-size="8.8" text-anchor="middle">base/ 純 YAML</text><text x="407" y="94" fill="#9aa4b2" font-size="7.8" text-anchor="middle">本身就合法</text><text x="407" y="105" fill="#9aa4b2" font-size="7.8" text-anchor="middle">可直接 apply</text>
    <rect x="498" y="58" width="106" height="52" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="551" y="78" fill="#d6a45c" font-size="8.2" text-anchor="middle">overlays/prod</text><text x="551" y="93" fill="#9aa4b2" font-size="7.8" text-anchor="middle">一小塊 patch</text><text x="551" y="104" fill="#9aa4b2" font-size="7.5" text-anchor="middle">只寫要改的</text>
    <line x1="407" y1="110" x2="446" y2="140" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ph)"/>
    <line x1="551" y1="110" x2="486" y2="140" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ph)"/>
    <rect x="352" y="144" width="222" height="40" rx="7" fill="#1f2330" stroke="#4f6df5" stroke-width="1.6"/><text x="463" y="162" fill="#4f6df5" font-size="9" text-anchor="middle">kubectl apply -k</text><text x="463" y="177" fill="#9aa4b2" font-size="7.8" text-anchor="middle">把 patch 合併進 base</text>
    <line x1="463" y1="184" x2="463" y2="208" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ph)"/>
    <rect x="352" y="210" width="222" height="34" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="463" y="231" fill="#e6e6e6" font-size="8.8" text-anchor="middle">合併後的 YAML</text>
    <line x1="463" y1="244" x2="463" y2="266" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ph)"/>
    <text x="463" y="281" fill="#54b890" font-size="9" text-anchor="middle">→ apply 到叢集</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同一個目標,兩種世界觀:<b>Helm</b> 把 YAML 當「有變數的模板」,靠 values 填空後渲染;<b>Kustomize</b> 把 YAML 當「資料」,base 本身就是合法可跑的 YAML,overlay 只疊上一小塊要改的 patch。前者有模板語言,後者<b>全程都是純 YAML、沒有變數</b></figcaption>
</figure>

## Helm:把 K8s app 變成可安裝、可版控、可回滾的套件

Helm 常被叫做「**K8s 的套件管理器**」,類比 apt / npm 很貼切。它的核心是 **chart**——一個資料夾,裝著 `Chart.yaml`(套件資訊)、`values.yaml`(預設值)、和 `templates/`(帶變數的 YAML 模板)。部署就三個動作:

```bash
helm install web ./mychart -f values-prod.yaml   # 安裝一個 release,套 prod 的值
helm upgrade web ./mychart -f values-prod.yaml    # 改版:同一個 release 升上去
helm rollback web 3                               # 一鍵回滾到第 3 版
```

它比純 YAML 多給你的,是**套件管理器該有的東西**:每次 install/upgrade 都是一個有版本號的 **release**,壞了 `helm rollback` 秒退;還能宣告**相依套件**(我的 app 需要一個 Redis)。最爽的是**現成生態系**——要在叢集裡跑 Redis、Prometheus、cert-manager?`helm install` 一行,不用自己拼幾百行 YAML。代價是那套 Go 模板語言:`{{ }}`、縮排、條件與迴圈堆起來,複雜的 chart 可以難讀難 debug(這時 `helm template` 先把它渲染出來看,是保命技)。

## Kustomize:純 YAML,base + overlay 疊出各環境

Kustomize 走另一條路:**不要模板、不要變數,一切都是合法的 YAML。** 你寫一份 `base/`(本身就能 `kubectl apply` 的完整 YAML),再為每個環境寫一個 `overlays/<env>/`,裡面只放**這個環境要改的那一小塊 patch**:

```yaml
# overlays/prod/kustomization.yaml
resources: [../../base]      # 疊在 base 上
replicas:
  - name: web
    count: 10                # Production 改成 10 份,其餘全繼承 base
images:
  - name: app
    newTag: "1.4"            # 換 image tag
```

它內建在 kubectl 裡(`kubectl apply -k overlays/prod`),不用裝額外工具,還附一堆好用的 transformer:`namePrefix`、`commonLabels`、`images`(改 tag)、`replicas`,以及 `configMapGenerator`——後者會**在 ConfigMap 名字後面接一段內容 hash**,內容一改、名字就變,於是 Pod 樣板跟著變、**自動觸發滾動更新**。這正好順手解掉[[k8s-deployment|第三篇那個坑]]:改了 [[k8s-config-secret|ConfigMap]] 不會自動重啟 Pod——用 Kustomize 的 generator,這件事免費就對了。

## 該用哪個?

不必二選一,但方向很清楚:

| 情境 | 偏 Helm | 偏 Kustomize |
|---|---|---|
| 裝**第三方**現成 app(Redis、Prometheus) | ✓ 一行安裝、有生態系 | |
| 管**自己**的 app manifests | | ✓ 純 YAML、好讀好 review |
| 要版本化 / 一鍵 rollback / 相依管理 | ✓ release 機制 | |
| 重度參數化、要發給別人用 | ✓ values 就是參數面板 | |
| 不想多裝工具、不想學模板語言 | | ✓ 內建在 kubectl |

實務上很多團隊**兩個都用**:第三方套件用 Helm 裝,自家 app 用 Kustomize 疊環境;甚至用 Helm 的 post-renderer 再過一手 Kustomize。**先看你要解的是「安裝別人的套件」還是「把自己的 YAML 分環境」——這一題基本就決定了你該先拿哪把。**

## 反思

### 「模板」與「疊加」是兩種心智負擔,選你受得了的那種

Helm 與 Kustomize 的差別,表面是工具,底層是**你願意把 YAML 當程式、還是當資料**。Helm 把 YAML 變成有變數、有邏輯的模板——強大,但你多背了一層模板語言的認知稅,出錯時得先在腦中「渲染」才知道實際長怎樣。Kustomize 堅持一切都是合法 YAML,你隨時 `kubectl apply -k` 就能看到最終結果,心智模型乾淨,代價是遇到高度動態的參數化會綁手綁腳。我自己的偏好是**能用 Kustomize 就用 Kustomize**——純 YAML 的可讀性與可 review 性,在團隊裡的長期價值被嚴重低估;只有當「參數多到像在寫程式」時,我才承認 Helm 的模板是對的工具。

### 打包是「設定外部化」的最後一哩,兩層一起才真的一份 build 跑遍天下

這篇其實是 [[k8s-config-secret|ConfigMap/Secret 那篇]]的延伸。那篇講「把設定從映像檔裡挖出來」,讓**同一個映像檔**能跑遍所有環境;這篇講「把**環境差異**從 YAML 裡抽出來」,讓**同一份部署來源**能生出各環境的 manifest。兩層是同一個理想的上下半場:**build 一次、設定與部署差異全外部化,一份產物跑遍 Dev 到 Production。** 少了任何一層,你都會在某個環節退回去 copy-paste。想通這點,我看 CI/CD 的角度也變了——好的 pipeline,不是「為每個環境各建一次」,而是「建一次,靠設定與 overlay 把它擺進不同環境」。

### 別為了看起來專業,把簡單的事 Helm 化

最後照例潑冷水。我看過小專案、兩三個環境,一上來就搞一個滿是 `{{ }}` 的自製 Helm chart,結果每次改個副本數都要跟模板語言搏鬥——**把本來三行 diff 能解決的事,包成一個要維護的套件。** 打包工具是拿來**降低**跨環境的重複與風險的,不是拿來展示技術棧的。我的順位一律是 [[pain-before-power|先確認痛點、再上重武器]]:環境少、差異小,raw YAML 或薄薄一層 Kustomize 就夠;真的多環境、多團隊、要發佈共用,才值得 Helm 那套機制。**工具的重量,要配得上問題的重量**——這是我走完整個 K8s 系列後,最想留下的一句總結。
