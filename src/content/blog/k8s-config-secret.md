---
title: "ConfigMap 與 Secret:把設定和機密從映像檔裡拆出來"
date: 2026-07-17
category: tech
description: "真實的 app 需要設定——DB 位址、feature flag、密碼、API key——而這些鐵律上都不該寫死在映像檔裡。K8s 用 ConfigMap(非機密)和 Secret(機密)把設定外部化、執行時注入,讓同一個不可變映像檔能跑遍 Development/Staging/Production。這篇講設定與映像檔分離的道理、ConfigMap vs Secret 的差別、兩種注入方式(環境變數 vs 掛成檔案),以及一個最多人誤解的坑:Secret 預設只是 base64,不是加密。"
tags:
  - kubernetes
  - concept
series: "Kubernetes 學習筆記"
seriesOrder: 5
comments: true
draft: false
---
前面幾篇,你已經能把一個 app [[k8s-deployment|部署]]、[[k8s-service|對外服務]]了。但真實的 app 還缺一塊:**設定**——資料庫位址、feature flag,還有密碼、API key、憑證。這些東西有一條鐵律:**不該寫死在映像檔或程式碼裡**。K8s 用 **ConfigMap**(非機密設定)和 **Secret**(機密)把設定外部化,在執行時才注入 Pod。這篇講為什麼要這樣、兩者差在哪、以及怎麼注入。

## 為什麼:同一個映像檔,要能跑遍所有環境

設定與映像檔要分開,核心理由只有一句:**映像檔要「不可變、可跨環境重用」。** 同一個 `my-app:1.0`,應該能原封不動地跑在 Development、Staging、Production——差別只在**注入的設定不同**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 208" role="img" aria-label="同一個映像檔跑遍所有環境。左邊一個不可變的映像檔 my-app 1.0。中間三份設定 ConfigMap 加 Secret,分別是 Development、Staging、Production。同一個映像檔配上每個環境各自的設定,就跑出三個環境的 Pod。下方原則:設定放環境或外部、不烤進映像檔,同一映像檔才能跨環境重用,這是 12-factor 的 config 原則。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="cs" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">同一個映像檔,跑遍所有環境</text>
    <rect x="14" y="74" width="104" height="60" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="66" y="96" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">映像檔</text><text x="66" y="110" fill="#e6e6e6" font-size="8" text-anchor="middle">my-app:1.0</text><text x="66" y="123" fill="#9aa4b2" font-size="7.4" text-anchor="middle">(不可變)</text>
    <rect x="196" y="38" width="176" height="34" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/><text x="284" y="52" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">Development</text><text x="284" y="65" fill="#9aa4b2" font-size="7.2" text-anchor="middle">ConfigMap + Secret</text>
    <rect x="196" y="86" width="176" height="34" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/><text x="284" y="100" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">Staging</text><text x="284" y="113" fill="#9aa4b2" font-size="7.2" text-anchor="middle">ConfigMap + Secret</text>
    <rect x="196" y="134" width="176" height="34" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/><text x="284" y="148" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">Production</text><text x="284" y="161" fill="#9aa4b2" font-size="7.2" text-anchor="middle">ConfigMap + Secret</text>
    <line x1="118" y1="98" x2="194" y2="56" stroke="#4f6df5" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#cs)"/><line x1="118" y1="104" x2="194" y2="103" stroke="#4f6df5" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#cs)"/><line x1="118" y1="110" x2="194" y2="151" stroke="#4f6df5" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#cs)"/>
    <line x1="372" y1="55" x2="410" y2="55" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cs)"/><line x1="372" y1="103" x2="410" y2="103" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cs)"/><line x1="372" y1="151" x2="410" y2="151" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cs)"/>
    <rect x="412" y="40" width="150" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="487" y="59" fill="#e6e6e6" font-size="8.2" text-anchor="middle">Pod(dev)</text>
    <rect x="412" y="88" width="150" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="487" y="107" fill="#e6e6e6" font-size="8.2" text-anchor="middle">Pod(staging)</text>
    <rect x="412" y="136" width="150" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="487" y="155" fill="#e6e6e6" font-size="8.2" text-anchor="middle">Pod(production)</text>
    <text x="290" y="192" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">12-factor:設定放環境/外部,不烤進映像檔——同一映像檔才能跨環境重用</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同一個<b style="color:#4f6df5">不可變映像檔</b>(藍),配上三個環境各自的 <b style="color:#d6a45c">ConfigMap + Secret</b>(橘),就跑出三個環境的 Pod。這正是 12-factor 的核心原則——<b>設定放在環境裡、不烤進映像檔</b>。把設定抽出來,你才能「一次 build、到處跑」,而不是每個環境各 build 一個塞死設定的映像檔;這跟 <a href="/blog/sre-automation-release/">hermetic build</a> 追求的「產物可重現、可跨環境」是同一種偏執</figcaption>
</figure>

## ConfigMap vs Secret:差在「機密不機密」

兩者用法幾乎一樣,都是存 key-value(或整份設定檔),差別在**放的東西機不機密**:
- **ConfigMap**:非機密的一般設定——資料庫主機名、日誌等級、feature flag、整份 `application.yaml`。
- **Secret**:機密——資料庫密碼、API key、TLS 憑證、token。

但這裡有個**最多人誤解、也最危險的坑**:**Secret 預設只是 base64 編碼,不是加密。** base64 是「換一種表示法」,不是「上鎖」——任何能讀到那個 Secret 的人,一行指令就能還原出明文。所以要讓 Secret 真的安全,得再做三件事:**開啟 etcd 的 encryption at rest**(讓它在儲存層真的被加密)、**用 RBAC 嚴格限制誰能讀**、以及正式環境**接外部的 secret manager**(Vault、雲的 KMS)。把 Secret 當成「有存取控制的設定」,而不是「加密保險箱」,才不會被那個名字給的虛假安全感騙了。

## 兩種注入方式:環境變數 vs 掛成檔案

設定準備好了,怎麼送進 Pod?有兩種方式,各有適合的場景:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 202" role="img" aria-label="ConfigMap 與 Secret 注入 Pod 的兩種方式對比。左邊環境變數 env,把 key 當環境變數注入,簡單直覺適合少量設定,但缺點是改了設定要重啟 pod 才生效。右邊掛成檔案 volume,把設定掛成目錄裡的檔案,適合整份設定檔或 TLS 憑證,而且更新 ConfigMap 後掛載的檔案會自動更新不用重啟。下方警告:Secret 預設只是 base64 不是加密,要真安全得開 encryption at rest、用 RBAC 限制存取、正式環境接外部 KMS 或 Vault。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">兩種注入方式:環境變數 vs 掛成檔案</text>
    <rect x="20" y="34" width="260" height="102" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="150" y="54" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">① 環境變數(env)</text>
    <text x="150" y="74" fill="#e6e6e6" font-size="8.2" text-anchor="middle">把 key 當環境變數注入</text>
    <text x="150" y="92" fill="#9aa4b2" font-size="7.8" text-anchor="middle">✓ 簡單直覺、適合少量設定</text>
    <text x="150" y="110" fill="#e0733a" font-size="7.8" text-anchor="middle">✗ 改了設定要「重啟 pod」才生效</text>
    <text x="150" y="126" fill="#9aa4b2" font-size="7.4" text-anchor="middle">(env 是啟動時定的,不會熱更新)</text>
    <rect x="300" y="34" width="260" height="102" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.4"/>
    <text x="430" y="54" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">② 掛成檔案(volume)</text>
    <text x="430" y="74" fill="#e6e6e6" font-size="8.2" text-anchor="middle">掛成目錄裡的檔案</text>
    <text x="430" y="92" fill="#9aa4b2" font-size="7.8" text-anchor="middle">✓ 適合整份設定檔 / TLS 憑證</text>
    <text x="430" y="110" fill="#54b890" font-size="7.8" text-anchor="middle">✓ 更新 ConfigMap → 檔案自動更新</text>
    <text x="430" y="126" fill="#9aa4b2" font-size="7.4" text-anchor="middle">(不必重啟,app 需自己重讀)</text>
    <rect x="40" y="150" width="500" height="40" rx="8" fill="#3a2626" stroke="#e0733a" stroke-width="1.4"/>
    <text x="290" y="168" fill="#e0733a" font-size="8.6" text-anchor="middle" font-weight="bold">⚠ Secret 預設只是 base64,不是加密!</text>
    <text x="290" y="183" fill="#9aa4b2" font-size="8" text-anchor="middle">真安全要:encryption at rest + RBAC 限制存取 + 正式環境接外部 KMS / Vault</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">環境變數</b>最簡單,但它在 pod 啟動時就定好了,改了設定<b>得重啟 pod</b> 才生效。<b style="color:#54b890">掛成檔案</b>(volume)則適合整份設定檔或憑證,而且有個好處:更新 ConfigMap 之後,掛進去的檔案會<b>自動更新</b>(雖然 app 通常還是得自己重讀檔案)。實務上小量設定用 env、整份設定檔或憑證用 volume。無論哪種,都別忘了那個紅字——Secret 的名字給了你安全感,但預設它只是 base64</figcaption>
</figure>

## 落成 YAML:建立設定、再注入 Pod

把上面兩張圖落成實際的宣告。先建 ConfigMap(明文)與 Secret(注意 `data` 要放 **base64** 後的值,或用 `stringData` 直接寫明文讓 K8s 幫你編):

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: web-config }
data:
  LOG_LEVEL: "info"                 # 非機密:直接明文
  application.yaml: |               # 也可以放「整份設定檔」
    server:
      timeout: 30s
---
apiVersion: v1
kind: Secret
metadata: { name: web-secret }
type: Opaque
stringData:
  DB_PASSWORD: "s3cr3t"             # stringData:寫明文,K8s 存進去時自動 base64(仍非加密)
```

接著在 Deployment 的 Pod 樣板裡,**兩種注入方式**都示範一次——`env` 拉成環境變數、`volumeMounts` 掛成檔案:

```yaml
    spec:
      containers:
        - name: web
          image: myrepo/web:1.0
          env:
            - name: LOG_LEVEL       # ① 環境變數:從 ConfigMap 拉一個 key
              valueFrom: { configMapKeyRef: { name: web-config, key: LOG_LEVEL } }
            - name: DB_PASSWORD     # 機密也一樣,改用 secretKeyRef
              valueFrom: { secretKeyRef: { name: web-secret, key: DB_PASSWORD } }
          volumeMounts:
            - { name: cfg, mountPath: /etc/web }   # ② 掛成檔案:整份 application.yaml 出現在這個目錄
      volumes:
        - name: cfg
          configMap: { name: web-config }
```

兩個對照就是前面第二張圖的重點:`env`/`...KeyRef` 是**環境變數注入**(啟動時定死,改了要重啟 Pod);`volumeMounts` + `volumes.configMap` 是**掛成檔案**(更新 ConfigMap 後檔案會自動更新,但 app 得自己重讀)。要一次把整份 ConfigMap/Secret 灌成環境變數,還有 `envFrom` 可用,少寫很多行。

## 反思

### 設定與映像檔分離,是「一次建置、到處執行」的地基

剛學 Docker/K8s 時,我幹過把 DB 位址、甚至帳密直接寫進映像檔的蠢事——結果就是每換一個環境就得重 build 一個映像檔,dev 一個、prod 一個,亂成一團,還差點把密碼推上 git。ConfigMap/Secret 教我的,是一個乾淨的分界:**映像檔管「程式碼與相依」,設定管「這次跑在哪、用什麼參數」,兩者分開。** 這個分界的價值,是讓「同一個產物跑遍所有環境」成真——你在 Staging 驗過的那個映像檔,一個位元都不用改就能上 Production,只換一份設定。這跟 [[sre-automation-release|hermetic build]] 講的「產物可重現、可跨環境」根本是同一件事的一體兩面:一個管建置產物的純淨,一個管執行設定的注入。

### Secret 只是 base64——名字給了你虛假的安全感

「Secret」這個名字很危險,因為它聽起來就很安全,讓人不自覺以為「放進 Secret 就上鎖了」。但它預設只是 base64,任何能存取它的人都能一秒還原明文。這件事給我的教訓超越了 K8s 本身:**別讓一個東西的「名字」替你做安全判斷。** 我現在看到任何號稱「加密」「安全」「保護」的功能,都會多問一句「它到底做了什麼、防住了誰」——是真的加密,還是只是編碼?是防住外人,還是連內部有權限的人也擋?名字是行銷,實際的威脅模型才是工程。搞清楚一個安全機制**具體防住什麼、沒防住什麼**,遠比記住它叫什麼重要。

### 好的設定管理,是讓「改設定」不等於「改程式」

我越來越覺得,一個系統成不成熟,看它「改一個設定有多痛」就知道。不成熟的系統,改一個參數要動程式碼、重新 build、重新部署,一改就是一趟大工程,於是大家能不改就不改、把設定寫死。成熟的系統,設定是外部的、注入的——改一個 feature flag、調一個閾值,不必碰程式碼、甚至不必重啟(掛成檔案的話)。ConfigMap/Secret 把設定變成一等公民,讓「調整行為」跟「改寫邏輯」徹底分開,這個分離本身就是一種可維護性。把「會變的東西」(設定)和「不太變的東西」(程式)分開，讓前者可以便宜地調整——這不只是 K8s 的智慧,是我看過所有好架構共通的一條線。
