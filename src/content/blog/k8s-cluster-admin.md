---
title: "叢集管理:kubeadm、etcd 備份、升級"
date: 2026-07-18
category: tech
tags:
  - kubernetes
  - operations
series: "Kubernetes 學習筆記"
seriesOrder: 12
comments: true
draft: false
---
前面十一篇都站在「**用**叢集」的位置。這篇換到「**建與養**叢集」的位置——CKA 佔 25% 的 Cluster Architecture 裡最硬的 ops 活。三件事貫穿一個管理員的一生:**怎麼把一堆機器變成叢集(kubeadm)、怎麼在災難來時把它救回來(etcd 備份)、怎麼升級而不停機(upgrade)。** 第二件是全 CKA 最該練到手起刀落的一題,先講清楚它為什麼這麼重要。

## kubeadm:一鍵把一堆機器變成叢集

手動拉起一個 control plane(簽一堆憑證、配 api-server、接 etcd)是惡夢。**kubeadm** 把這件事變成兩個指令:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 236" role="img" aria-label="kubeadm 流程:在第一台機器跑 kubeadm init,它把 control plane 組件 api-server、scheduler、controller-manager 和 etcd 都拉成 static pod,並吐出一段 join token;其他 worker 與 control plane 節點用 kubeadm join 帶著 token 加入。所有叢集狀態都存在 etcd" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="ka" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="14" y="30" width="266" height="176" rx="10" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="147" y="50" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">Control Plane node · kubeadm init</text>
    <rect x="30" y="62" width="112" height="30" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/><text x="86" y="81" fill="#e6e6e6" font-size="8.8" text-anchor="middle">api-server</text>
    <rect x="152" y="62" width="112" height="30" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/><text x="208" y="81" fill="#e6e6e6" font-size="8.8" text-anchor="middle">scheduler</text>
    <rect x="30" y="98" width="112" height="30" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/><text x="86" y="117" fill="#e6e6e6" font-size="8.5" text-anchor="middle">controller-mgr</text>
    <path d="M168 100 v30 a40 6 0 0 0 80 0 v-30" fill="#1f2330" stroke="#d6a45c" stroke-width="1.5"/><ellipse cx="208" cy="100" rx="40" ry="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.5"/><text x="208" y="122" fill="#d6a45c" font-size="9" text-anchor="middle">etcd</text>
    <text x="147" y="152" fill="#9aa4b2" font-size="8" text-anchor="middle">都是 static pod:kubelet 讀 /etc/kubernetes/manifests</text>
    <text x="147" y="170" fill="#9aa4b2" font-size="8" text-anchor="middle">拉起來就自動維持</text>
    <rect x="34" y="180" width="226" height="18" rx="4" fill="#262b3a" stroke="#54b890" stroke-width="1.1" stroke-dasharray="4 3"/><text x="147" y="193" fill="#54b890" font-size="8" text-anchor="middle">吐出 join token + 指令</text>
    <line x1="280" y1="188" x2="322" y2="188" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ka)"/>
    <text x="360" y="176" fill="#9aa4b2" font-size="8" text-anchor="middle">kubeadm join &lt;token&gt;</text>
    <rect x="330" y="42" width="272" height="40" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="466" y="60" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Worker node</text><text x="466" y="74" fill="#9aa4b2" font-size="7.5" text-anchor="middle">只跑 kubelet + 你的 Pod</text>
    <rect x="330" y="90" width="272" height="40" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="466" y="108" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Worker node</text><text x="466" y="122" fill="#9aa4b2" font-size="7.5" text-anchor="middle">要幾台加幾台</text>
    <rect x="330" y="192" width="272" height="34" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4" stroke-dasharray="5 4"/><text x="466" y="213" fill="#9aa4b2" font-size="8.5" text-anchor="middle">再加 CP node(join)→ HA control plane</text>
    <line x1="322" y1="196" x2="322" y2="62" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="2 3"/>
    <line x1="322" y1="62" x2="328" y2="62" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ka)"/>
    <line x1="322" y1="110" x2="328" y2="110" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ka)"/>
    <line x1="322" y1="208" x2="328" y2="208" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ka)"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><code>kubeadm init</code> 在第一台把 control plane 組件(含 etcd)拉成 <b>static pod</b>、吐出一段 join token;其他機器用 <code>kubeadm join</code> 帶 token 加入,worker 只跑 kubelet 與你的 Pod。整個叢集的狀態,全存在那顆 <b>etcd</b> 裡</figcaption>
</figure>

control plane 的組件都以 **static pod** 形式跑——kubelet 監看 `/etc/kubernetes/manifests` 目錄,把裡面的 manifest 拉起來並維持。這也是為什麼你 debug control plane 時,是去那台機器看這幾個檔案、看這幾顆 pod,而不是用一般的 Deployment 邏輯去找。

## etcd:叢集的唯一真相,也是唯一的死穴

看那張圖裡的 etcd——**你叢集裡的每一個物件(Deployment、Service、Secret、RBAC…)的狀態,全部只存在 etcd 這一個地方。** [[k8s-intro|第一篇]]說 reconcile loop 不斷把現實拉向「期望」,而那份「期望」就住在 etcd。它用 [[sre-consensus|Raft 共識]]維持多副本一致,所以 HA 部署要**奇數台**(3 台容忍掛 1、5 台容忍掛 2)才湊得出多數決、避免 split-brain。

但再多副本也擋不住「誤刪」「憑證爛掉」「整個 etcd 資料毀損」。所以管理員的第一戒律是:**定期把 etcd 快照存到叢集外。** 這是你唯一的還原點——沒有它,叢集掛了就是從零重建。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 214" role="img" aria-label="etcd 備份與還原流程:平時用 etcdctl snapshot save 把 etcd 的狀態存成 snapshot.db 檔案,放到叢集外或異地;災難發生時,用 etcdctl snapshot restore 把 snapshot.db 還原成一個新的 data 目錄,再讓 etcd 指向它重啟,叢集就回到快照那一刻的狀態" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="et" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <path d="M40 44 v34 a34 7 0 0 0 68 0 v-34" fill="#262b3a" stroke="#d6a45c" stroke-width="1.7"/><ellipse cx="74" cy="44" rx="34" ry="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.7"/><text x="74" y="66" fill="#e6e6e6" font-size="9.5" text-anchor="middle">etcd</text><text x="74" y="98" fill="#9aa4b2" font-size="7.5" text-anchor="middle">唯一真相</text>
    <line x1="112" y1="62" x2="196" y2="62" stroke="#54b890" stroke-width="1.5" marker-end="url(#et)"/>
    <text x="154" y="54" fill="#54b890" font-size="8" text-anchor="middle">snapshot save</text>
    <rect x="198" y="42" width="150" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/><text x="273" y="62" fill="#e6e6e6" font-size="9.5" text-anchor="middle">snapshot.db</text><text x="273" y="77" fill="#9aa4b2" font-size="7.5" text-anchor="middle">存叢集外 / 異地</text>
    <line x1="273" y1="86" x2="273" y2="128" stroke="#e05a7d" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#et)"/>
    <text x="273" y="112" fill="#e05a7d" font-size="8" text-anchor="middle">災難:etcd 毀了 / 誤刪</text>
    <rect x="198" y="130" width="150" height="42" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="273" y="156" fill="#e6e6e6" font-size="9" text-anchor="middle">snapshot.db(手上這份)</text>
    <line x1="348" y1="151" x2="404" y2="151" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#et)"/>
    <text x="376" y="143" fill="#9aa4b2" font-size="7.5" text-anchor="middle">restore</text>
    <rect x="406" y="130" width="118" height="42" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="465" y="150" fill="#e6e6e6" font-size="8.6" text-anchor="middle">新的 data 目錄</text><text x="465" y="164" fill="#9aa4b2" font-size="7.5" text-anchor="middle">restore 產生</text>
    <line x1="524" y1="151" x2="556" y2="151" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#et)"/>
    <path d="M560 132 v30 a24 5 0 0 0 48 0 v-30" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><ellipse cx="584" cy="132" rx="24" ry="5" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="584" y="153" fill="#54b890" font-size="8.5" text-anchor="middle">etcd</text>
    <text x="430" y="196" fill="#9aa4b2" font-size="8.5" text-anchor="middle">etcd 指向新目錄重啟 → 叢集回到「快照那一刻」的狀態</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">備份就一行 <code>etcdctl snapshot save</code>,把狀態存成 <code>snapshot.db</code> 放叢集外。災難時 <code>snapshot restore</code> 把它還原成新的 data 目錄、讓 etcd 指過去重啟,叢集就回到快照那一刻。<b>沒有這份快照,etcd 一毀就是從零重建</b></figcaption>
</figure>

指令的骨架長這樣(實際要帶 endpoints 與那三張憑證 `--cacert/--cert/--key`):

```bash
# 平時:定期備份,把 snapshot.db 收到叢集外
ETCDCTL_API=3 etcdctl snapshot save snapshot.db
# 災難後:還原成新目錄,再改 etcd static pod manifest 指過去、重啟
ETCDCTL_API=3 etcdctl snapshot restore snapshot.db --data-dir /var/lib/etcd-restore
```

**「有沒有可用的 etcd 備份」這一題,幾乎定義了一個叢集的災難復原能力。** 別等出事才發現快照從沒跑成功過。

## 升級:一次一個節點的接力賽

叢集要升 K8s 版本,規矩很硬:**一次只能跳一個 minor 版本**(1.29 → 1.30,不能 1.29 → 1.31),而且 **control plane 要先於 worker**。整個過程是一場「一次動一台、其餘照常服務」的接力賽:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 224" role="img" aria-label="叢集升級:規則是一次只跳一個 minor、control plane 先於 worker。節點順序 control plane 第一、worker 隨後,一次一台。每台的四步循環:cordon 加 drain 把 Pod 趕走、升 kubeadm 跑 upgrade、升 kubelet 與 kubectl、uncordon 讓它重新收 Pod" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="up" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="14" y="26" width="592" height="26" rx="6" fill="#1f2330" stroke="#e0733a" stroke-width="1.3"/>
    <text x="310" y="43" fill="#e0733a" font-size="9" text-anchor="middle">鐵律:一次只跳一個 minor(1.29 → 1.30)· control plane 先、worker 後</text>
    <rect x="40" y="66" width="150" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/><text x="115" y="84" fill="#4f6df5" font-size="9.5" text-anchor="middle">① Control Plane</text><text x="115" y="98" fill="#9aa4b2" font-size="7.5" text-anchor="middle">kubeadm upgrade apply</text>
    <line x1="190" y1="86" x2="222" y2="86" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#up)"/>
    <rect x="224" y="66" width="150" height="40" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="299" y="84" fill="#54b890" font-size="9.5" text-anchor="middle">② Worker</text><text x="299" y="98" fill="#9aa4b2" font-size="7.5" text-anchor="middle">kubeadm upgrade node</text>
    <line x1="374" y1="86" x2="406" y2="86" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#up)"/>
    <rect x="408" y="66" width="150" height="40" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="483" y="84" fill="#54b890" font-size="9.5" text-anchor="middle">③ Worker …</text><text x="483" y="98" fill="#9aa4b2" font-size="7.5" text-anchor="middle">一台接一台</text>
    <text x="310" y="130" fill="#9aa4b2" font-size="8.5" text-anchor="middle">每一台節點,都跑這一輪四步:</text>
    <rect x="20" y="142" width="132" height="44" rx="7" fill="#1f2330" stroke="#d6a45c" stroke-width="1.4"/><text x="86" y="162" fill="#d6a45c" font-size="9" text-anchor="middle">cordon + drain</text><text x="86" y="176" fill="#9aa4b2" font-size="7.5" text-anchor="middle">把 Pod 疏散走</text>
    <line x1="152" y1="164" x2="180" y2="164" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#up)"/>
    <rect x="182" y="142" width="132" height="44" rx="7" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.3"/><text x="248" y="162" fill="#e6e6e6" font-size="9" text-anchor="middle">升 kubeadm</text><text x="248" y="176" fill="#9aa4b2" font-size="7.5" text-anchor="middle">upgrade apply/node</text>
    <line x1="314" y1="164" x2="342" y2="164" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#up)"/>
    <rect x="344" y="142" width="132" height="44" rx="7" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.3"/><text x="410" y="162" fill="#e6e6e6" font-size="9" text-anchor="middle">升 kubelet</text><text x="410" y="176" fill="#9aa4b2" font-size="7.5" text-anchor="middle">+ kubectl,重啟</text>
    <line x1="476" y1="164" x2="504" y2="164" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#up)"/>
    <rect x="506" y="142" width="98" height="44" rx="7" fill="#1f2330" stroke="#54b890" stroke-width="1.4"/><text x="555" y="162" fill="#54b890" font-size="9" text-anchor="middle">uncordon</text><text x="555" y="176" fill="#9aa4b2" font-size="7.5" text-anchor="middle">重新收 Pod</text>
    <text x="310" y="206" fill="#9aa4b2" font-size="8.5" text-anchor="middle">一次只動一台、其餘照常扛流量 —— 這就是「升級不停機」的原理</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">升級是一場接力賽:<b>control plane 先、worker 後</b>,一次只動一台。每台都跑同一輪四步——<code>cordon + drain</code> 把 Pod 疏散、升 kubeadm 跑 <code>upgrade</code>、升 kubelet、<code>uncordon</code> 讓它重新收 Pod。其餘節點照常扛流量,所以整體不中斷</figcaption>
</figure>

第一台 control plane 用 `kubeadm upgrade apply` 定調整個叢集要升到的版本,其餘 control plane 與 worker 節點都用 `kubeadm upgrade node` 跟上。`drain` 會**尊重 [[k8s-deployment|Deployment]] 的多副本**:它把 Pod 從這台趕走,ReplicaSet 立刻在別台補回來,所以只要你的服務有多份、又設了 PodDisruptionBudget,滾動升級全程有服務。

## 反思

### etcd 備份是那種「不出事沒人記得、出事沒它就完蛋」的事

我對備份的敬畏,是被真實的恐懼餵大的。叢集所有的狀態濃縮在 etcd 一個地方,這設計很優雅,但也意味著**它是整座叢集的單點死穴**——多副本擋得住機器掛,擋不住一次誤操作把關鍵物件刪光、或憑證過期到 etcd 起不來。那一刻,你手上有沒有一份**驗證過、還原得回去**的快照,是「十分鐘恢復」和「熬夜重建整個叢集」的差別。所以我把 etcd 備份當成 [[sre-automation-release|SRE 那幾篇]]講的可靠性基本功:**不只要排程備份,還要真的定期演練還原**——沒還原過的備份,只是一份你以為存在的安心感。

### 「一次一個節點」的升級哲學,其實跟滾動更新是同一件事

升級叢集看起來很嚇人,但拆開就發現它跟 [[k8s-deployment|Deployment 的滾動更新]]是同一個心法的放大版:**永遠只讓一小部分處於變動中,其餘維持服務,壞了還能退。** 應用層是「一次換幾顆 Pod」,叢集層是「一次升一台 node」;`drain` 之於 node,就像 readiness probe 之於 Pod——**先把流量挪乾淨,再動手**。想通這個對稱,我對「動 Production」的恐懼就小很多:方法一樣,只是把單位從 Pod 換成 node。**把大動作切成一連串可回退的小步,是我在整個 K8s 世界裡看到最一致、也最值得內化的一條原則。**

### 管理員的價值,在平時看不見的準備裡

寫到這篇我更確定:會 `kubectl apply` 只是入門,真正把叢集扛在肩上的能力,藏在這些平時無聲的準備裡——**備份跑成功了嗎?還原演練過嗎?升級路徑試過嗎?憑證什麼時候到期?** 這些事平順時毫無存在感,一出事卻是全部。這跟我對 SRE 的理解完全一致:**可靠性不是出事那天才臨場發揮的英雄主義,而是出事之前、日復一日、沒人鼓掌的紀律。** 系列下一篇談故障排除——當這些準備還是沒擋住問題時,怎麼一層層把它揪出來。
