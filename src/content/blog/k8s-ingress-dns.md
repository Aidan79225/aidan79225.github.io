---
title: "Ingress 與叢集 DNS:一個入口進來、一個名字相認"
date: 2026-07-17
category: tech
tags:
  - kubernetes
  - networking
series: "Kubernetes 學習筆記"
seriesOrder: 9
comments: true
draft: false
---
[[k8s-service|第四篇]]給了短命 Pod 一個固定門牌 Service,但留了兩個尾巴:一是「外面怎麼用**一個入口**進來、再按網址分流到不同服務?」——那張對外類型圖裡最上面的 **Ingress**;二是叢集內服務彼此互打時,那個 `http://web` 的**名字**到底是誰在解析?這篇把兩件事收掉:對外靠 **Ingress**、對內靠**叢集 DNS**。它們是同一枚硬幣的兩面——**都在解決「怎麼靠名字、而不是 IP 找到服務」。**

先看對外這半邊,關鍵是 Service 與 Ingress 分工在不同的網路層:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 300" role="img" aria-label="Ingress 是 L7 入口:讀 HTTP 的 Host 與 path,把 shop.com 的根路徑導到 web-svc、shop.com/api 導到 api-svc、img.shop.com 導到 img-svc,每個都是叢集內的 ClusterIP Service。相對地 Service LoadBalancer 是 L4,只看 IP 與 port、看不到網址,一個對外服務要一個 IP" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="ig" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="12" y="112" width="106" height="60" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="65" y="134" fill="#e6e6e6" font-size="10.5" text-anchor="middle">使用者</text>
    <text x="65" y="150" fill="#9aa4b2" font-size="8" text-anchor="middle">一個網域</text>
    <text x="65" y="163" fill="#9aa4b2" font-size="8" text-anchor="middle">一個對外 IP</text>
    <line x1="118" y1="142" x2="176" y2="142" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ig)"/>
    <text x="147" y="106" fill="#9aa4b2" font-size="7.5" text-anchor="middle">GET shop.com/api</text>
    <rect x="178" y="66" width="190" height="180" rx="10" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.9"/>
    <text x="273" y="90" fill="#9b6ff0" font-size="11.5" font-weight="bold" text-anchor="middle">Ingress</text>
    <text x="273" y="105" fill="#9aa4b2" font-size="8" text-anchor="middle">L7:讀 HTTP 的 Host + path</text>
    <text x="194" y="140" fill="#e6e6e6" font-size="9" text-anchor="start">shop.com/</text>
    <text x="194" y="176" fill="#e6e6e6" font-size="9" text-anchor="start">shop.com/api</text>
    <text x="194" y="212" fill="#e6e6e6" font-size="9" text-anchor="start">img.shop.com</text>
    <text x="273" y="234" fill="#d6a45c" font-size="7.5" text-anchor="middle">順便在這裡卸 TLS(https → http)</text>
    <rect x="440" y="116" width="168" height="48" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="524" y="136" fill="#54b890" font-size="9.5" text-anchor="middle">web-svc</text>
    <text x="524" y="151" fill="#9aa4b2" font-size="7.5" text-anchor="middle">ClusterIP → web Pod</text>
    <rect x="440" y="168" width="168" height="46" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="524" y="187" fill="#54b890" font-size="9.5" text-anchor="middle">api-svc</text>
    <text x="524" y="202" fill="#9aa4b2" font-size="7.5" text-anchor="middle">ClusterIP → api Pod</text>
    <rect x="440" y="218" width="168" height="46" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="524" y="237" fill="#54b890" font-size="9.5" text-anchor="middle">img-svc</text>
    <text x="524" y="252" fill="#9aa4b2" font-size="7.5" text-anchor="middle">ClusterIP → img Pod</text>
    <line x1="368" y1="136" x2="438" y2="138" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ig)"/>
    <line x1="368" y1="172" x2="438" y2="188" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ig)"/>
    <line x1="368" y1="208" x2="438" y2="238" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ig)"/>
    <text x="310" y="288" fill="#9aa4b2" font-size="8.5" text-anchor="middle">一個 IP、一個入口,按網址分流到多個內部 Service —— 這是 L4 的 Service 做不到的</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b>Ingress 是 L7</b>:它讀得懂 HTTP 的 <b>Host 與 path</b>,所以能用一個 IP 把不同網址分給不同 Service。相對地 <b>Service(LoadBalancer)是 L4</b>——只認 IP:port、看不到網址,每個對外服務就得配一個 IP</figcaption>
</figure>

## Ingress:一個入口,按網址分流

回想 [[k8s-service|Service]] 的 LoadBalancer 類型:每開一個對外服務,雲端就配一個對外 IP。十個服務就十個 IP、十筆帳單,而且它是 **L4**——只看目標 IP 與 port,**看不到 HTTP 網址**,沒辦法「同一個網域,`/api` 走這、`/img` 走那」。

**Ingress 補的就是這層。** 它是 **L7(HTTP 層)**的入口,一份 Ingress 規則長這樣:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
spec:
  rules:
    - host: shop.com
      http:
        paths:
          - path: /
            backend: { service: { name: web-svc, port: { number: 80 } } }
          - path: /api
            backend: { service: { name: api-svc, port: { number: 80 } } }
  tls:                       # https 在 Ingress 這一層卸掉,後端只收 http
    - hosts: [shop.com]
      secretName: shop-tls
```

一個對外 IP，靠 **Host + path** 把流量分給背後一堆 ClusterIP Service,還能順手在這層做 **TLS 終結**(把 https 解密成 http 再往後送,後端 Pod 不用各自處理憑證)。這正是 [[k8s-service|第四篇]]說的「Ingress 擺在前面 + 一堆內部 ClusterIP Service」那個最常見的組合。

## 一個坑:Ingress 只是「規則」,得有 Controller 來執行

這是最多人卡的地方:**你 `kubectl apply` 一份 Ingress,什麼事都不會發生。** 因為 Ingress 物件**只是一張規則表**——它需要一個真正在跑的 **Ingress Controller**(常見的是 ingress-nginx、Traefik)去讀這些規則、把自己內部的反向代理設好,才會真的有流量進來。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 174" role="img" aria-label="Ingress 物件只是規則表,存在 etcd;Ingress Controller 這個 Pod 持續監看這些規則、把自己的反向代理設定收斂成規則的樣子;外部流量其實打的是 Controller,前面通常還有一個 LoadBalancer" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="ic" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="20" y="60" width="150" height="54" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4" stroke-dasharray="5 4"/>
    <text x="95" y="82" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Ingress 物件</text>
    <text x="95" y="99" fill="#9aa4b2" font-size="8" text-anchor="middle">只是規則表(存 etcd)</text>
    <line x1="170" y1="87" x2="224" y2="87" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ic)"/>
    <text x="197" y="79" fill="#9aa4b2" font-size="7.5" text-anchor="middle">監看</text>
    <rect x="226" y="52" width="168" height="70" rx="8" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.9"/>
    <text x="310" y="76" fill="#9b6ff0" font-size="11" font-weight="bold" text-anchor="middle">Ingress Controller</text>
    <text x="310" y="92" fill="#9aa4b2" font-size="8" text-anchor="middle">一個真在跑的 Pod</text>
    <text x="310" y="106" fill="#9aa4b2" font-size="8" text-anchor="middle">依規則設好反向代理</text>
    <line x1="394" y1="87" x2="448" y2="87" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ic)"/>
    <rect x="450" y="60" width="130" height="54" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="515" y="82" fill="#54b890" font-size="9.5" text-anchor="middle">後端 Service</text>
    <text x="515" y="99" fill="#9aa4b2" font-size="8" text-anchor="middle">各個 ClusterIP</text>
    <line x1="310" y1="28" x2="310" y2="50" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ic)"/>
    <text x="310" y="20" fill="#9aa4b2" font-size="8.5" text-anchor="middle">外部流量(前面通常還有一個 LoadBalancer)</text>
    <text x="197" y="150" fill="#9aa4b2" font-size="8.5" text-anchor="middle">又是 reconcile loop:Controller 把「代理設定」收斂成「規則的樣子」</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Ingress 物件是「期望的路由規則」,<b>Ingress Controller</b> 才是真正監看規則、把反向代理設定收斂過去的那個 Pod。沒裝 Controller,Ingress 規則就只是躺在 etcd 裡沒人執行的一張紙</figcaption>
</figure>

叢集裡可以同時跑好幾種 Controller,靠 **IngressClass** 指定某份 Ingress 該歸誰管。這又是那個熟悉的模式:**你宣告期望(路由規則),一個 controller 持續把現實(代理設定)收斂過去**——跟 [[k8s-deployment|Deployment]]、[[k8s-service|Endpoints]] 一模一樣的迴圈,只是這次收斂的是 nginx 的設定檔。

## 叢集 DNS:服務怎麼靠「名字」相認

換到對內這半邊。[[k8s-service|第四篇]]說服務之間用 `http://web` 這種名字互打就好,但**誰把名字翻成 ClusterIP?** 答案是叢集內建的 DNS——**CoreDNS**(以一個 Deployment 跑在 `kube-system`,再用一個 Service 對外)。每顆 Pod 建立時,它的 `/etc/resolv.conf` 都被指向 CoreDNS,所以 Pod 裡任何 DNS 查詢都會問到它。

每個 Service 自動有一個固定的 DNS 名字,規則是 `<service>.<namespace>.svc.cluster.local`:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 250" role="img" aria-label="Service DNS 名字 web.default.svc.cluster.local 拆解:web 是 Service 名、default 是 namespace、svc 表示這是個 Service、cluster.local 是叢集網域。下方流程:Pod 查短名 web,resolv.conf 用 search domain 補成完整名,問 CoreDNS,拿回 ClusterIP" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="dn" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="34" y="30" width="86" height="34" rx="6" fill="#1f2330" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="77" y="52" fill="#4f6df5" font-size="12" font-weight="bold" text-anchor="middle">web</text>
    <text x="127" y="52" fill="#9aa4b2" font-size="13" text-anchor="middle">.</text>
    <rect x="136" y="30" width="106" height="34" rx="6" fill="#1f2330" stroke="#54b890" stroke-width="1.6"/>
    <text x="189" y="52" fill="#54b890" font-size="12" font-weight="bold" text-anchor="middle">default</text>
    <text x="249" y="52" fill="#9aa4b2" font-size="13" text-anchor="middle">.</text>
    <rect x="258" y="30" width="70" height="34" rx="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.6"/>
    <text x="293" y="52" fill="#d6a45c" font-size="12" font-weight="bold" text-anchor="middle">svc</text>
    <text x="335" y="52" fill="#9aa4b2" font-size="13" text-anchor="middle">.</text>
    <rect x="344" y="30" width="150" height="34" rx="6" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.6"/>
    <text x="419" y="52" fill="#9b6ff0" font-size="12" font-weight="bold" text-anchor="middle">cluster.local</text>
    <text x="77" y="82" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Service 名</text>
    <text x="189" y="82" fill="#9aa4b2" font-size="8.5" text-anchor="middle">namespace</text>
    <text x="293" y="82" fill="#9aa4b2" font-size="8.5" text-anchor="middle">是個 Service</text>
    <text x="419" y="82" fill="#9aa4b2" font-size="8.5" text-anchor="middle">叢集網域</text>
    <rect x="24" y="150" width="130" height="58" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="89" y="173" fill="#e6e6e6" font-size="10" text-anchor="middle">Pod 查「web」</text>
    <text x="89" y="190" fill="#9aa4b2" font-size="8" text-anchor="middle">同 namespace 用短名</text>
    <line x1="154" y1="179" x2="214" y2="179" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#dn)"/>
    <text x="184" y="171" fill="#9aa4b2" font-size="7" text-anchor="middle">補全名</text>
    <rect x="216" y="150" width="164" height="58" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="298" y="173" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">CoreDNS</text>
    <text x="298" y="190" fill="#9aa4b2" font-size="8" text-anchor="middle">kube-system 裡的 DNS</text>
    <line x1="380" y1="179" x2="440" y2="179" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#dn)"/>
    <rect x="442" y="150" width="140" height="58" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="512" y="173" fill="#54b890" font-size="10" text-anchor="middle">ClusterIP</text>
    <text x="512" y="190" fill="#9aa4b2" font-size="8" text-anchor="middle">10.96.0.10</text>
    <text x="300" y="232" fill="#9aa4b2" font-size="8.5" text-anchor="middle">跨 namespace 就寫 web.other-ns;short name 只在同 namespace 有效</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Service 的 DNS 名字四段各有意思。Pod 在同一個 namespace 用短名 <code>web</code> 就行——<code>resolv.conf</code> 的 search domain 會自動補成完整名,交給 CoreDNS 換出 ClusterIP;跨 namespace 才需要寫到 <code>web.other-ns</code></figcaption>
</figure>

實務上你幾乎只會用到短名:同 namespace 打 `web`、跨 namespace 打 `web.payments` 就夠了,後面那串 `.svc.cluster.local` 是 search domain 自動補的。有一個例外值得記:**headless Service**(`clusterIP: None`)不回傳單一虛擬 IP,而是回傳**每一顆 Pod 的 IP**,還讓每顆 Pod 有自己的 DNS 名字(`pod-0.web.default.svc...`)——這是 [[k8s-storage|StatefulSet]] 那種「要點名到特定一顆」的有狀態服務才需要的,一般無狀態服務用普通 Service 就好。

## 反思

### L4 與 L7 分清楚,「該用哪個」就不再猶豫

我剛接觸時,LoadBalancer 和 Ingress 常搞混——兩個看起來都是「對外」。分水嶺其實很利落:**看不看得懂 HTTP。** Service 停在 L4,只認 IP:port,適合「就是要把這個 port 開出去」(資料庫、gRPC、非 HTTP 的東西);Ingress 站上 L7,讀得懂 Host 與 path,適合「一個網域下一堆 HTTP 服務、想在同一個入口收 TLS、按網址分流」。想通這條線之後,我的預設就變成:**對外的 HTTP 一律走 Ingress、一個 IP 收全部;非 HTTP 或要獨立 IP 的才單開 LoadBalancer。** 省 IP、省帳單,憑證也集中一處管。

### 「規則」和「執行規則的人」是兩回事——這觀念能救很多 debug

Ingress apply 下去卻沒反應,是新手最常見的鬼打牆,而它背後是一個更通用的道理:**K8s 裡很多物件只是「期望」,得有一個 controller 在跑才會發生事情。** Ingress 要 Ingress Controller、NetworkPolicy 要 CNI 支援、CRD 要對應的 operator。我養成一個習慣:當某個資源「apply 了卻沒動靜」,第一反應不是懷疑寫錯,而是問——**「執行這條規則的那個 controller,到底有沒有在跑?」** 這一問常常直接命中要害。規則本身從不會自己動,動的永遠是那個盯著它的迴圈。

### 服務發現是 K8s 最被低估的送分題

從自建服務的年代一路走來,我對「服務發現」是有陰影的——Consul、Eureka、自己拼 etcd,光把「誰在哪」維護對就夠折騰。K8s 直接把這件事變成**內建、零設定**:建一個 Service 就自動有 DNS 名、CoreDNS 自動解析、Pod 換 IP 名字也不變。這跟 [[k8s-service|第四篇]]講的「依賴名字不依賴位置」是同一件事的底層支撐——**正是因為有這套 DNS,「用名字相認」才從一個願望變成預設行為。** 我現在會刻意提醒團隊別再自己造服務發現的輪子:K8s 已經把最難的那塊免費給你了,珍惜它。
