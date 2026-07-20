---
title: "K8s 儲存:Volume、PV/PVC 與 StatefulSet"
date: 2026-07-17
category: tech
description: "Pod 是短命、可拋的——但有些東西死了不能跟著消失,那就是資料。容器的檔案系統是暫時的:pod 一重排,寫進去的檔案就沒了。所以 K8s 要把『儲存』跟『pod 生命週期』解耦。這篇講儲存三層:Volume(把盤掛進 pod)、PV/PVC(把儲存的供給與需求分開、加上 StorageClass 動態供應),以及 StatefulSet(讓每個有狀態 pod 都認得自己那塊盤)——也就是為什麼 Kafka、Redis 在 k8s 上都跑 StatefulSet。"
tags:
  - kubernetes
  - storage
series: "Kubernetes 學習筆記"
seriesOrder: 6
comments: true
draft: false
---
Pod 是短命、可拋的——[[k8s-deployment|自我修復]]隨時把它換一個。但有些東西死了**不能**跟著消失:**資料**。而容器的檔案系統天生是**暫時的(ephemeral)**:pod 一被重排、容器一重啟,寫在裡面的檔案就沒了。所以 K8s 得把「儲存」跟「pod 的生命週期」**解耦**。這篇講它的儲存三層:Volume、PV/PVC、StatefulSet。

## Volume:先把一塊盤掛進 pod

最基本的一層是 **Volume**——把一塊儲存掛進 pod 的某個路徑。有幾種類型:`emptyDir`(pod 生命期內的暫存,pod 一消失就沒了,適合容器間共享暫存)、`hostPath`(掛主機上的路徑,少用、綁死節點),以及真正重要的——**透過 PVC 掛一塊「活得比 pod 久」的持久儲存**。前兩種都不持久;要資料活過 pod 的死亡,就得往下看 PV/PVC。

## PV / PVC:把「供給」和「需求」分開

K8s 儲存最核心的設計,是把「**誰要儲存**」和「**儲存實際在哪**」拆成兩個東西:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 208" role="img" aria-label="PV 與 PVC 把儲存的需求與供給分開。左邊 Pod 要掛一塊盤,透過 PVC 表達需求:我要 10Gi、ReadWriteOnce,app 開發者只喊這個。K8s 把 PVC 綁定 bound 到一塊 PV,PV 是實際那塊 10Gi 儲存,底層可能是 AWS EBS、NFS 或 Ceph。上方 StorageClass 負責動態供應:PVC 一提出就自動生一塊 PV,不必管理員手動預先建。下方原則:供需分離,app 只喊我要多大、什麼存取模式,不用管底層是什麼硬體。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="sv" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">PV / PVC:把「需求」和「供給」分開</text>
    <rect x="300" y="30" width="262" height="28" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.3"/><text x="431" y="48" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">StorageClass:動態供應——PVC 一提出就自動生 PV</text>
    <rect x="16" y="86" width="88" height="46" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="60" y="107" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Pod</text><text x="60" y="120" fill="#9aa4b2" font-size="7.2" text-anchor="middle">要掛一塊盤</text>
    <line x1="104" y1="109" x2="124" y2="109" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#sv)"/>
    <rect x="126" y="82" width="156" height="54" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="204" y="102" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">PVC(需求)</text><text x="204" y="117" fill="#e6e6e6" font-size="8" text-anchor="middle">「我要 10Gi · RWO」</text><text x="204" y="130" fill="#9aa4b2" font-size="7" text-anchor="middle">app 開發者只喊這個</text>
    <line x1="282" y1="103" x2="356" y2="103" stroke="#54b890" stroke-width="1.3" marker-end="url(#sv)"/><line x1="356" y1="115" x2="282" y2="115" stroke="#54b890" stroke-width="1.3" marker-end="url(#sv)"/><text x="319" y="98" fill="#54b890" font-size="7.4" text-anchor="middle">bound</text>
    <rect x="358" y="82" width="156" height="54" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.5"/><text x="436" y="102" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">PV(供給)</text><text x="436" y="117" fill="#e6e6e6" font-size="8" text-anchor="middle">實際那塊 10Gi 儲存</text><text x="436" y="130" fill="#9aa4b2" font-size="7" text-anchor="middle">底層:EBS / NFS / Ceph…</text>
    <line x1="431" y1="58" x2="436" y2="80" stroke="#d6a45c" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#sv)"/>
    <text x="290" y="164" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">供需分離:app 只喊「我要多大、什麼存取模式」,不用管底層是什麼硬體</text>
    <text x="290" y="184" fill="#9aa4b2" font-size="8" text-anchor="middle">access modes:RWO(單節點)· ROX(多節點唯讀)· RWX(多節點讀寫,需 NFS 之類)</text>
    <text x="290" y="199" fill="#9aa4b2" font-size="8" text-anchor="middle">reclaim policy:PVC 刪掉後,PV 要 Retain(保留)還是 Delete(連底層一起刪)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">PVC(PersistentVolumeClaim)</b>是「需求」——app 只說「我要一塊 10Gi、ReadWriteOnce 的盤」;<b style="color:#54b890">PV(PersistentVolume)</b>是「供給」——實際那塊儲存,底層是 EBS 還是 NFS 都行。K8s 負責把兩者<b>綁定(bound)</b>。而 <b style="color:#d6a45c">StorageClass</b> 讓這件事自動化:PVC 一提出,就依 provisioner <b>動態供應</b>一塊新 PV,不必管理員手動預先建。這個「需求/供給分離」是很漂亮的抽象——寫 app 的人完全不用知道底層是哪家雲的哪種盤</figcaption>
</figure>

三個 CKA 常考、實務也要懂的細節都在圖裡:**access modes** 決定「幾個節點能同時掛、能不能寫」——最常見的 `RWO`(ReadWriteOnce,單節點讀寫,一般 block storage 的天性)、`RWX`(ReadWriteMany,多節點同時讀寫,要 NFS 這類檔案儲存才支援);**reclaim policy** 決定 PVC 刪掉後那塊 PV 的命運——`Retain`(保留資料等你手動處理)還是 `Delete`(連底層儲存一起刪掉)。這兩個設錯,輕則資源殘留、重則資料被自動刪光。

## StatefulSet:讓每個有狀態 pod 都認得自己那塊盤

有了持久儲存,還有一個問題:**一群有狀態的 pod,怎麼確保每個都掛回「自己」那塊盤?** [[k8s-deployment|Deployment]] 做不到——它的 pod 是可拋的複製品、名字隨機。答案是 **StatefulSet**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 208" role="img" aria-label="StatefulSet 與 Deployment 從儲存角度的對比。左邊 Deployment 無狀態,pod 名字隨機像 app-7f9、app-2k1,可拋、掛了換一個名字就變,不綁定特定的盤。右邊 StatefulSet 有狀態,pod 有穩定身分 pod-0、pod-1、pod-2,每個各自綁定一塊自己的 PVC 與 PV,透過 volumeClaimTemplates,重啟或重排都掛回自己那塊盤,而且部署與擴縮是有序的。下方:有狀態的東西像 Kafka、Redis、資料庫用 StatefulSet;無狀態用 Deployment。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ss" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="30" x2="290" y2="168" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#9aa4b2" font-size="9.4" text-anchor="middle" font-weight="bold">Deployment(無狀態)</text>
    <rect x="40" y="40" width="200" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="140" y="57" fill="#e6e6e6" font-size="8" text-anchor="middle">app-7f9c2 · app-2k1x8(名字隨機)</text>
    <text x="146" y="88" fill="#9aa4b2" font-size="8" text-anchor="middle">pod 可拋、掛了換一個 → 名字就變</text>
    <text x="146" y="106" fill="#e0733a" font-size="8" text-anchor="middle" font-weight="bold">不綁定特定的盤</text>
    <text x="434" y="26" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">StatefulSet(有狀態)</text>
    <rect x="316" y="40" width="72" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="352" y="56" fill="#e6e6e6" font-size="7.8" text-anchor="middle">pod-0</text>
    <rect x="404" y="40" width="72" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="440" y="56" fill="#e6e6e6" font-size="7.8" text-anchor="middle">pod-1</text>
    <rect x="492" y="40" width="72" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="528" y="56" fill="#e6e6e6" font-size="7.8" text-anchor="middle">pod-2</text>
    <line x1="352" y1="64" x2="352" y2="78" stroke="#9aa4b2" stroke-width="1" marker-end="url(#ss)"/><line x1="440" y1="64" x2="440" y2="78" stroke="#9aa4b2" stroke-width="1" marker-end="url(#ss)"/><line x1="528" y1="64" x2="528" y2="78" stroke="#9aa4b2" stroke-width="1" marker-end="url(#ss)"/>
    <rect x="316" y="80" width="72" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="352" y="95" fill="#4f6df5" font-size="7.4" text-anchor="middle">PVC-0</text>
    <rect x="404" y="80" width="72" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="440" y="95" fill="#4f6df5" font-size="7.4" text-anchor="middle">PVC-1</text>
    <rect x="492" y="80" width="72" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="528" y="95" fill="#4f6df5" font-size="7.4" text-anchor="middle">PVC-2</text>
    <text x="440" y="122" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">每個 pod 綁自己的盤(volumeClaimTemplates)</text>
    <text x="440" y="138" fill="#9aa4b2" font-size="7.8" text-anchor="middle">穩定身分 + 重啟認得自己那塊盤 + 有序擴縮</text>
    <rect x="60" y="176" width="460" height="26" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/><text x="290" y="193" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">有狀態的(Kafka / Redis / DB)→ StatefulSet;無狀態的 → Deployment</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#54b890">StatefulSet</b> 給每個 pod 三樣 Deployment 沒有的東西:<b>穩定的身分</b>(`pod-0`/`pod-1`,重啟名字不變)、<b>各自綁定的儲存</b>(靠 <code>volumeClaimTemplates</code> 讓每個 pod 自動有一塊專屬 PVC,重啟/重排都掛回同一塊盤)、以及<b>有序的部署與擴縮</b>(0→1→2)。這正是為什麼 <a href="/blog/infra-kafka/">Kafka</a>、<a href="/blog/infra-redis/">Redis</a> 這些有狀態的東西,在 k8s 上一律跑 StatefulSet + PV——它們的資料綁在特定身分與磁碟上,不能像無狀態 pod 那樣隨便換</figcaption>
</figure>

## 落成 YAML:一個 PVC、一個 StatefulSet

先看「需求」那一半——一份 PVC 就是 app 開發者要寫的全部,它完全不提底層是哪種盤,只喊要多大、什麼存取模式、走哪個 StorageClass:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata: { name: data }
spec:
  accessModes: [ "ReadWriteOnce" ]     # RWO:單一節點讀寫
  storageClassName: fast-ssd           # 交給這個 class 動態供應一塊 PV
  resources:
    requests: { storage: 10Gi }        # 我要 10Gi
```

而有狀態服務不會自己手寫 PVC,而是用 **StatefulSet 的 `volumeClaimTemplates`**——它像一個「PVC 模子」,幫**每個** Pod(`pod-0`、`pod-1`…)各生一塊專屬的盤,重排也掛回同一塊:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata: { name: db }
spec:
  serviceName: db                      # 搭一個 headless Service 給每個 Pod 穩定的 DNS 名
  replicas: 3
  selector: { matchLabels: { app: db } }
  template:
    metadata: { labels: { app: db } }
    spec:
      containers:
        - name: db
          image: postgres:16
          volumeMounts:
            - { name: data, mountPath: /var/lib/postgresql/data }
  volumeClaimTemplates:                # ← 關鍵:每個 Pod 自動獲得一塊自己的 PVC
    - metadata: { name: data }
      spec:
        accessModes: [ "ReadWriteOnce" ]
        storageClassName: fast-ssd
        resources: { requests: { storage: 10Gi } }
```

兩個細節值得記:`volumeClaimTemplates` 生出的 PVC 會叫 `data-db-0`、`data-db-1`……**名字綁著 Pod 的序號**,這就是「`pod-0` 永遠掛回自己那塊盤」的實作;而且**縮容時這些 PVC 預設不會被刪**——K8s 寧可留著資料等你手動確認,也不敢自作主張刪掉有狀態的盤。這跟一般 Deployment「Pod 走了什麼都不留」是完全相反的預設,正是「有狀態」該有的謹慎。

## 反思

### PV/PVC 的「供需分離」,是我很欣賞的一個抽象

第一次搞懂 PV/PVC,我覺得這設計真漂亮。它把一個混在一起的東西,乾淨地切成兩半:**寫 app 的人只需要說「我要一塊 10Gi、可讀寫的盤」(PVC),完全不用知道底層是 AWS EBS、GCP PD、還是機房裡的一台 NFS。** 那些底層細節,交給管理員的 PV / StorageClass 去處理。這種「宣告需求、隱藏實作」的分離,其實就是好介面的本質——就像你叫 Uber 只說「我要從 A 到 B」,不用管司機開什麼車、走哪條路。我後來設計任何系統的邊界,都會想起 PVC:**讓使用方用「需求的語言」表達,而不是被逼著懂供給端的細節**,是降低耦合最有效的一招。

### StatefulSet 讓「短命的 pod」也能安全地擁有「不短命的資料」

K8s 一開始給人的印象,是「一切都可拋、一切都無狀態」——pod 死了換一個就好。但真實世界有資料,而資料**不能**可拋。StatefulSet 巧妙地調和了這個矛盾:**pod 本身依然可以死、可以被換,但它的『身分』和『那塊盤』是穩定的**——換上來的 pod-0,還是掛回原本 pod-0 那塊 PVC。這讓我想通一件事:「可拋」和「有狀態」不是非黑即白的對立。你可以讓**執行的軀殼可拋**(pod)、同時讓**它守護的資料持久**(PV)——把「會死的」和「不能死的」用一層抽象隔開,各自用最適合的方式對待。這也呼應了整個 [[infra-kafka|infra 系列]]的主軸:有狀態的東西難就難在那塊盤,而 StatefulSet 就是 k8s 給這個難題的標準答案。

### 儲存,是 K8s 從「跑容器」長成「跑真實系統」的關鍵一步

早期很多人說「有狀態的東西別放 K8s」,原因就是儲存這塊當年還不成熟。而 PV/PVC/StorageClass/StatefulSet 這一整套的出現,正是 K8s 從「只適合跑無狀態 web 服務」跨進「能跑資料庫、訊息佇列這些真實系統」的分水嶺。這給我的體會是:**一個平台成不成熟,往往看它怎麼處理『狀態』這塊最硬的骨頭。** 無狀態的東西人人會調度,真正的難題永遠在「資料怎麼安全地跟著走」。K8s 花了好幾個版本、好幾套抽象才把儲存做穩——這也提醒我,評估任何「號稱什麼都能跑」的平台時,第一個該戳的地方,就是它的儲存與狀態管理到底夠不夠硬。
