---
title: "故障排除:Pod、Node、Control Plane 怎麼查"
date: 2026-07-19
category: tech
tags:
  - kubernetes
  - troubleshooting
series: "Kubernetes 學習筆記"
seriesOrder: 13
comments: true
draft: false
---
CKA 佔比最高的一塊是故障排除(30%),但它其實**不是新知識**——它是把前面整個系列串起來的能力。排障最忌諱用猜的、亂試一通。真正的心法只有一句:**沿著 Pod 的生命週期,一關一關問「它卡在哪」**——因為 K8s 很貼心,**它把「卡在哪一關」直接寫在狀態裡了。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 344" role="img" aria-label="Pod 從 apply 到收流量要過四關,每一關卡住都對應一個特定狀態:第一關排程到 node,卡住是 Pending(資源不足、taint 沒 toleration、PVC 綁不到);第二關拉映像檔,卡住是 ImagePullBackOff(映像名打錯、私有 registry 少 imagePullSecret);第三關起容器並活著,卡住是 CrashLoopBackOff 或 OOMKilled;第四關通過 readiness 進 Endpoints,卡住是 Running 卻 not Ready 或連不到。四關全過才是正常收流量" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="tg" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#54b890"/></marker><marker id="tr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#e05a7d"/></marker></defs>
    <rect x="20" y="30" width="180" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/><text x="110" y="50" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">① 排程到 node</text><text x="110" y="66" fill="#9aa4b2" font-size="8" text-anchor="middle">Scheduler 挑一台</text>
    <rect x="20" y="94" width="180" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/><text x="110" y="114" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">② 拉映像檔</text><text x="110" y="130" fill="#9aa4b2" font-size="8" text-anchor="middle">kubelet 去 registry 拉</text>
    <rect x="20" y="158" width="180" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/><text x="110" y="178" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">③ 起容器・活著</text><text x="110" y="194" fill="#9aa4b2" font-size="8" text-anchor="middle">跑起來且不崩</text>
    <rect x="20" y="222" width="180" height="52" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/><text x="110" y="242" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">④ Ready・進 Endpoints</text><text x="110" y="258" fill="#9aa4b2" font-size="8" text-anchor="middle">通過 readiness 才收流量</text>
    <rect x="34" y="296" width="152" height="34" rx="8" fill="#1f2330" stroke="#54b890" stroke-width="1.7"/><text x="110" y="317" fill="#54b890" font-size="10" font-weight="bold" text-anchor="middle">✓ 正常收流量</text>
    <line x1="110" y1="76" x2="110" y2="92" stroke="#54b890" stroke-width="1.6" marker-end="url(#tg)"/>
    <line x1="110" y1="140" x2="110" y2="156" stroke="#54b890" stroke-width="1.6" marker-end="url(#tg)"/>
    <line x1="110" y1="204" x2="110" y2="220" stroke="#54b890" stroke-width="1.6" marker-end="url(#tg)"/>
    <line x1="110" y1="274" x2="110" y2="294" stroke="#54b890" stroke-width="1.6" marker-end="url(#tg)"/>
    <line x1="200" y1="53" x2="230" y2="53" stroke="#e05a7d" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#tr)"/>
    <rect x="232" y="32" width="352" height="42" rx="7" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3"/><text x="244" y="49" fill="#e05a7d" font-size="9.5" font-weight="bold" text-anchor="start">Pending</text><text x="244" y="65" fill="#9aa4b2" font-size="8" text-anchor="start">資源不足 / taint 沒 toleration / PVC 綁不到</text>
    <line x1="200" y1="117" x2="230" y2="117" stroke="#e05a7d" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#tr)"/>
    <rect x="232" y="96" width="352" height="42" rx="7" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3"/><text x="244" y="113" fill="#e05a7d" font-size="9.5" font-weight="bold" text-anchor="start">ImagePullBackOff · ErrImagePull</text><text x="244" y="129" fill="#9aa4b2" font-size="8" text-anchor="start">映像名打錯 / 私有 registry 少 imagePullSecret</text>
    <line x1="200" y1="181" x2="230" y2="181" stroke="#e05a7d" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#tr)"/>
    <rect x="232" y="160" width="352" height="42" rx="7" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3"/><text x="244" y="177" fill="#e05a7d" font-size="9.5" font-weight="bold" text-anchor="start">CrashLoopBackOff · OOMKilled</text><text x="244" y="193" fill="#9aa4b2" font-size="8" text-anchor="start">起來就掛一直重啟 / 超過記憶體 limit 被砍</text>
    <line x1="200" y1="248" x2="230" y2="248" stroke="#e05a7d" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#tr)"/>
    <rect x="232" y="224" width="352" height="48" rx="7" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3"/><text x="244" y="241" fill="#e05a7d" font-size="9.5" font-weight="bold" text-anchor="start">Running 卻 not Ready · 連不到</text><text x="244" y="257" fill="#9aa4b2" font-size="8" text-anchor="start">readiness 失敗 / Endpoints 空(selector 錯)</text><text x="244" y="268" fill="#9aa4b2" font-size="8" text-anchor="start">/ DNS 解不到 / NetworkPolicy 擋掉</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一張圖收掉大半排障:Pod 從 apply 到收流量要過四關,<b>每一關卡住都對應一個特定狀態</b>。看到狀態,就知道問題卡在生命週期的哪一段——這也是為什麼整個系列讀完,排障才會從「亂猜」變成「按圖索驥」</figcaption>
</figure>

## 第一步永遠是這三條指令:get → describe → logs

不管什麼症狀,起手式固定這個順序,由外而內剝洋蔥:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 234" role="img" aria-label="排障指令漏斗:kubectl get 看現在什麼狀態、kubectl describe 看為什麼(重點是最下面的 Events 段)、kubectl logs 看程式自己說了什麼、kubectl exec 或 debug 進去現場戳。另外先確認是哪一層:Pod 層用前面那組指令、Node 層看 NotReady(kubelet 掛或磁碟壓力)、Control Plane 層看 api-server 與 etcd 是否掛掉導致全叢集失靈" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="tf" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="10" y="34" width="138" height="46" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="79" y="53" fill="#e6e6e6" font-size="9.2" text-anchor="middle">kubectl get</text><text x="79" y="69" fill="#9aa4b2" font-size="8" text-anchor="middle">現在什麼狀態?</text>
    <line x1="148" y1="57" x2="168" y2="57" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#tf)"/>
    <rect x="170" y="34" width="150" height="46" rx="7" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.9"/><text x="245" y="53" fill="#9b6ff0" font-size="9.2" font-weight="bold" text-anchor="middle">kubectl describe</text><text x="245" y="69" fill="#9aa4b2" font-size="8" text-anchor="middle">為什麼?看 Events 段</text>
    <line x1="320" y1="57" x2="340" y2="57" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#tf)"/>
    <rect x="342" y="34" width="138" height="46" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="411" y="53" fill="#e6e6e6" font-size="9.2" text-anchor="middle">kubectl logs</text><text x="411" y="69" fill="#9aa4b2" font-size="8" text-anchor="middle">程式自己說了什麼?</text>
    <line x1="480" y1="57" x2="500" y2="57" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#tf)"/>
    <rect x="502" y="34" width="108" height="46" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="556" y="53" fill="#e6e6e6" font-size="8.8" text-anchor="middle">exec / debug</text><text x="556" y="69" fill="#9aa4b2" font-size="8" text-anchor="middle">進去現場戳</text>
    <text x="310" y="112" fill="#9aa4b2" font-size="9" text-anchor="middle">但動手前先問一句:這是哪一層的事?</text>
    <rect x="20" y="128" width="188" height="76" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="114" y="150" fill="#4f6df5" font-size="10" font-weight="bold" text-anchor="middle">Pod 層</text><text x="114" y="168" fill="#9aa4b2" font-size="8" text-anchor="middle">狀態 / Events / logs</text><text x="114" y="184" fill="#9aa4b2" font-size="8" text-anchor="middle">上面那組指令就夠</text><text x="114" y="198" fill="#9aa4b2" font-size="8" text-anchor="middle">最常見、先查這層</text>
    <rect x="216" y="128" width="188" height="76" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.6"/><text x="310" y="150" fill="#d6a45c" font-size="10" font-weight="bold" text-anchor="middle">Node 層</text><text x="310" y="168" fill="#9aa4b2" font-size="8" text-anchor="middle">node NotReady</text><text x="310" y="184" fill="#9aa4b2" font-size="8" text-anchor="middle">kubelet 掛 / 磁碟壓力</text><text x="310" y="198" fill="#9aa4b2" font-size="8" text-anchor="middle">journalctl -u kubelet</text>
    <rect x="412" y="128" width="196" height="76" rx="8" fill="#262b3a" stroke="#e05a7d" stroke-width="1.6"/><text x="510" y="150" fill="#e05a7d" font-size="10" font-weight="bold" text-anchor="middle">Control Plane 層</text><text x="510" y="168" fill="#9aa4b2" font-size="8" text-anchor="middle">api-server / etcd 掛</text><text x="510" y="184" fill="#9aa4b2" font-size="8" text-anchor="middle">→ 整個叢集指令失靈</text><text x="510" y="198" fill="#9aa4b2" font-size="8" text-anchor="middle">看 static pod manifest</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">排障漏斗:<code>get</code>(什麼狀態)→ <code>describe</code>(為什麼——<b>Events 段是金礦</b>)→ <code>logs</code>(程式說了什麼)→ <code>exec/debug</code>(進現場)。但動手前先分層:多數問題在 <b>Pod 層</b>,查不到再往 <b>Node</b> 與 <b>Control Plane</b> 上找</figcaption>
</figure>

最被低估的一條是 **`kubectl describe`**:它最下面的 **Events 段**,幾乎把 K8s 剛才「想做什麼、卡在哪」全寫出來了——排程失敗的原因、映像拉不動的錯誤、readiness probe 一直失敗、被 OOM 砍掉,全在這。**很多人一出事就衝去看 logs,但答案往往在 Events 裡,而且更直接。** 幾條常用的:

```bash
kubectl get pods -o wide              # 狀態、重啟次數、落在哪台 node
kubectl describe pod <p>              # 看最底下 Events 段(最重要)
kubectl logs <p> --previous           # CrashLoop 必用:看「上一個掛掉的」實例日誌
kubectl get events --sort-by=.lastTimestamp   # 全 namespace 依時間排的事件流
```

`logs --previous` 是排 **CrashLoopBackOff** 的關鍵:容器已經崩掉重啟了,當下的 logs 是新實例、常常空的,你要的是**上一個崩掉那次**留下的最後幾行。

## 讀懂 Pod 狀態:每個狀態都在指路

把第一張圖的四關攤成一張對照表,看到狀態就知道往哪查、根因大概是什麼:

| 狀態 | 卡在哪一關 | 最常見根因 | 先查 |
|---|---|---|---|
| **Pending** | ① 排不進 node | 資源不夠、[[k8s-scheduling-advanced|taint 沒 toleration]]、PVC 綁不到 PV | `describe` 的 Events(FailedScheduling) |
| **ContainerCreating** 卡住 | ①→② 之間 | CNI 沒配好、Volume 掛不上、Secret/ConfigMap 不存在 | `describe` Events |
| **ImagePullBackOff** | ② 拉映像 | 映像名 / tag 打錯、私有 registry 少 imagePullSecret | `describe` Events(Failed to pull) |
| **CrashLoopBackOff** | ③ 起了就掛 | 程式啟動即崩、設定錯、[[k8s-config-secret|少了環境變數]]、probe 設太嚴 | `logs --previous` |
| **OOMKilled** | ③ 記憶體爆 | 實際用量超過 memory limit 被砍 | `describe`(Last State: OOMKilled)、調 limit |
| **Running 但 0/1 READY** | ④ 沒通過 readiness | readiness probe 一直失敗 → 不進 [[k8s-service|Endpoints]]、收不到流量 | `describe` Events、probe 設定 |
| **Running 但連不到** | ④ 網路層 | selector 打錯 Endpoints 是空的、[[k8s-ingress-dns|DNS]] 解不到、[[k8s-networkpolicy-cni|NetworkPolicy]] 擋掉 | `get endpoints`、DNS 測試 |

這張表就是把整個系列反過來用:**每一種故障,都是前面某一篇講過的機制在「沒運作」。** 排障排的不是新東西,是你懂不懂那些機制。

## 換一層看:Node 與 Control Plane

如果一整台 node 上的 Pod 全出事,別再盯著 Pod——問題在 **Node 層**。`kubectl get nodes` 看到 `NotReady`,通常是那台的 **kubelet 掛了、磁碟/記憶體壓力(DiskPressure / MemoryPressure)、或網路斷了**。這時候得 SSH 上去用 `journalctl -u kubelet` 看 kubelet 的日誌、用 `crictl` 直接問容器執行期,而不是隔著 API 猜。

再往上,如果連 `kubectl` 本身都開始逾時、整個叢集像失聯——那是 **Control Plane 層**。api-server 或 [[k8s-cluster-admin|etcd]] 出事,整個叢集的「下命令」能力就癱了。因為它們是 **static pod**,你得去 control plane 那台看 `/etc/kubernetes/manifests`、看那幾顆 pod 的容器狀態與日誌。**一層一層往上,是因為越上層炸得越大:Pod 掛只影響一個服務,control plane 掛影響整座叢集。**

## kubectl debug:連 shell 都沒有時

有個實務常撞的牆:現在很多映像檔為了精簡與安全,是 **distroless / 沒有 shell** 的,你 `kubectl exec -it -- sh` 直接失敗,無從進去看。**`kubectl debug`** 就是解法——它用 **ephemeral container** 把一個帶工具的臨時容器,塞進**同一個 Pod**、共享它的網路與行程空間,讓你在旁邊 curl、看檔案、抓封包,而完全不動原本的容器:

```bash
kubectl debug -it <p> --image=busybox --target=<container>   # 塞一個臨時容器進去查
kubectl debug node/<node> -it --image=busybox                # 連 node 都能開一個特權容器來查
```

不用為了 debug 去改映像檔硬塞工具、也不用重啟 Pod 破壞現場——**這是排查那些「精簡到沒東西可用」的 Production 容器時,最該記住的一招。**

## 反思

### 排障的功力,不在背指令,在有沒有一張「生命週期地圖」

我看過太多人排障靠玄學:狀態沒細看,就開始重啟 Pod、砍了重建、改一堆設定碰運氣。真正有效的排障,是心裡有第一張圖那張**生命週期地圖**——看到 `Pending` 就知道是排程關、看到 `ImagePullBackOff` 就知道是映像關、看到 `not Ready` 就知道往 readiness 與 [[k8s-service|Endpoints]] 查。**狀態不是報錯,是 K8s 在告訴你它走到哪一步走不下去了。** 把這張地圖內化之後,排障就從「亂試到好」變成「看一眼就知道往哪挖」,這中間的效率差距是十倍起跳。這也呼應我在 [[sre-troubleshooting|SRE 排障那篇]]的核心主張:**系統化的心智模型,永遠贏過臨場的靈光一閃。**

### Events 段是最被低估的金礦

如果只能留一條排障建議,我會說:**先 `describe`,看 Events。** 它是 K8s 主動幫你寫好的「剛才發生了什麼」——排程器為什麼放不進、映像為什麼拉不動、probe 為什麼失敗,全在那幾行。我早年的壞習慣是一出事就鑽進 logs,結果 logs 是應用層的輸出,常常跟「Pod 起不來」這種平台層問題根本無關。**先問平台(Events)、再問應用(logs)**,這個順序讓我少走無數冤枉路。工具早就把答案攤在那了,差別只在你有沒有先看對地方。

### 這一篇讀完,整個系列才真的閉環

寫到這裡,我特別有感:故障排除之所以是 CKA 最大宗,正因為它**不是獨立的一章,而是全部的驗收**。你得懂 [[k8s-intro|reconcile loop]] 才知道 Pod 為什麼會自己重啟、懂 [[k8s-scheduling-advanced|排程]]才看得懂 Pending、懂 [[k8s-service|Service]] 與 [[k8s-ingress-dns|DNS]] 才追得到「連不到」、懂 [[k8s-cluster-admin|etcd 與 control plane]]才敢動最上層。**排障能力是這些理解的總和,騙不了人。** 所以我從不把「會不會查問題」當成一種獨立技能去練——它是你對這個系統理解夠不夠深的溫度計。整個系列走到這,從「宣告式」到「排障」,剛好繞回原點:**你越懂它平常怎麼運作,出事時就越知道它是哪裡沒運作。**
