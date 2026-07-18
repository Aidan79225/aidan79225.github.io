---
title: "RBAC:誰能對叢集做什麼"
date: 2026-07-18
category: tech
tags:
  - kubernetes
  - security
series: "Kubernetes 學習筆記"
seriesOrder: 11
comments: true
draft: false
---
前面十篇都在讓東西「跑起來、連得到」。這篇換一個維度:**誰有權對叢集下命令?** 一個 `kubectl delete` 打進 API Server,它憑什麼知道你是誰、又憑什麼准你刪?這是 **RBAC(Role-Based Access Control)**的地盤,也是 CKA 佔比最高的 Cluster Architecture 領域裡最該吃透的一塊。起手式是先分清兩件常被混為一談的事:**認證**與**授權**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 176" role="img" aria-label="一個請求進 API Server 要過兩道門:第一道認證(authn)問你是誰,靠憑證、token、OIDC 驗身分,失敗回 401;第二道授權(authz,也就是 RBAC)問你能不能做這個動作,不准回 403;兩關都過,API Server 才真的執行" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="ra" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="12" y="56" width="112" height="52" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="68" y="78" fill="#e6e6e6" font-size="10" text-anchor="middle">kubectl / Pod</text>
    <text x="68" y="94" fill="#9aa4b2" font-size="8" text-anchor="middle">發一個請求</text>
    <line x1="124" y1="82" x2="156" y2="82" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ra)"/>
    <rect x="158" y="50" width="148" height="64" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="232" y="72" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">① 認證 authn</text>
    <text x="232" y="87" fill="#9aa4b2" font-size="8.2" text-anchor="middle">你是誰?</text>
    <text x="232" y="100" fill="#9aa4b2" font-size="8.2" text-anchor="middle">憑證 · token · OIDC</text>
    <line x1="306" y1="82" x2="338" y2="82" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ra)"/>
    <rect x="340" y="50" width="150" height="64" rx="8" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.9"/>
    <text x="415" y="72" fill="#9b6ff0" font-size="10.5" font-weight="bold" text-anchor="middle">② 授權 authz</text>
    <text x="415" y="87" fill="#9aa4b2" font-size="8.2" text-anchor="middle">你能做這動作嗎?</text>
    <text x="415" y="100" fill="#9aa4b2" font-size="8.2" text-anchor="middle">← 這就是 RBAC</text>
    <line x1="490" y1="82" x2="522" y2="82" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ra)"/>
    <rect x="524" y="56" width="84" height="52" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/>
    <text x="566" y="78" fill="#54b890" font-size="9.5" text-anchor="middle">執行</text>
    <text x="566" y="94" fill="#9aa4b2" font-size="8" text-anchor="middle">API Server</text>
    <text x="232" y="140" fill="#e05a7d" font-size="8.5" text-anchor="middle">驗不出身分 → 401</text>
    <text x="415" y="140" fill="#e05a7d" font-size="8.5" text-anchor="middle">沒權限 → 403</text>
    <text x="310" y="162" fill="#9aa4b2" font-size="8.5" text-anchor="middle">兩道門各管一件事:先確認「你是誰」,再判斷「你能不能」</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">每個請求進 API Server 要過兩道門:<b>①認證</b>確認你是誰(失敗 401)、<b>②授權(RBAC)</b>判斷你能不能做這個動作(失敗 403)。RBAC 只管第二道——它<b>假設你的身分已經驗好了</b></figcaption>
</figure>

## 認證 vs 授權:K8s 只管第二道門

這兩個詞的分工是理解 RBAC 的地基:**認證(authn)問「你是誰」,授權(authz)問「你能做什麼」。** RBAC 純粹是後者——它從不驗證身分,只在「身分已知」的前提下判斷這個人能不能執行某動作。

有件事很反直覺:**K8s 裡根本沒有「使用者(User)」這種物件。** 你不會 `kubectl create user`。人類身分是由**外部**認證機制決定的——客戶端憑證、bearer token、雲商 IAM、OIDC……API Server 驗完之後,只拿到一個「使用者名 + 所屬群組」的字串,RBAC 就拿這個字串去比對權限。唯一由 K8s 自己管理的身分,是給程式用的 **ServiceAccount**(後面會講)。**記住:User / Group 是外面來的,ServiceAccount 才是叢集內的物件。**

## RBAC 的積木:Role 是權限、Binding 是膠水

RBAC 只有四種物件,兩兩成對,想通「角色」與「綁定」的分工就通了:

- **Role / ClusterRole**:一組**權限**——「能對哪些資源、做哪些動作」。它只是一張權限清單,**本身不屬於任何人**。
- **RoleBinding / ClusterRoleBinding**:一條**綁定**——把某個 Role **黏到**某個主體(subject)身上。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 232" role="img" aria-label="RBAC 綁定鏈:左邊三種主體 User aidan、Group dev、ServiceAccount ci-bot;中間 RoleBinding 是膠水;右邊 Role pod-reader 定義權限,規則是對 pods 資源允許 get、list、watch 三個動作。主體本身零權限、Role 也只是躺著的權限,RoleBinding 把兩者黏起來才生效" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="rb" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="14" y="44" width="170" height="150" rx="10" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="99" y="64" fill="#4f6df5" font-size="10" font-weight="bold" text-anchor="middle">主體 Subjects(誰)</text>
    <rect x="30" y="76" width="138" height="30" rx="6" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/><text x="99" y="95" fill="#e6e6e6" font-size="9" text-anchor="middle">User: aidan</text>
    <rect x="30" y="112" width="138" height="30" rx="6" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/><text x="99" y="131" fill="#e6e6e6" font-size="9" text-anchor="middle">Group: dev</text>
    <rect x="30" y="148" width="138" height="34" rx="6" fill="#1f2330" stroke="#54b890" stroke-width="1.3"/><text x="99" y="164" fill="#e6e6e6" font-size="9" text-anchor="middle">ServiceAccount:</text><text x="99" y="176" fill="#9aa4b2" font-size="8" text-anchor="middle">ci-bot(叢集內物件)</text>
    <line x1="184" y1="119" x2="236" y2="119" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#rb)"/>
    <rect x="238" y="92" width="140" height="56" rx="9" fill="#1f2330" stroke="#d6a45c" stroke-width="1.8"/>
    <text x="308" y="114" fill="#d6a45c" font-size="10" font-weight="bold" text-anchor="middle">RoleBinding</text>
    <text x="308" y="130" fill="#9aa4b2" font-size="8" text-anchor="middle">把主體黏到角色</text>
    <text x="308" y="141" fill="#9aa4b2" font-size="8" text-anchor="middle">(膠水)</text>
    <line x1="378" y1="119" x2="430" y2="119" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#rb)"/>
    <rect x="432" y="44" width="176" height="150" rx="10" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.8"/>
    <text x="520" y="64" fill="#9b6ff0" font-size="10" font-weight="bold" text-anchor="middle">Role: pod-reader</text>
    <text x="520" y="79" fill="#9aa4b2" font-size="8" text-anchor="middle">一組權限(不屬於任何人)</text>
    <rect x="446" y="90" width="148" height="94" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="520" y="108" fill="#9aa4b2" font-size="8.5" text-anchor="middle">apiGroups: ""</text>
    <text x="520" y="126" fill="#e6e6e6" font-size="9" text-anchor="middle">resources: pods</text>
    <text x="520" y="150" fill="#9aa4b2" font-size="8.5" text-anchor="middle">verbs:</text>
    <text x="520" y="167" fill="#54b890" font-size="9" text-anchor="middle">get · list · watch</text>
    <text x="310" y="216" fill="#9aa4b2" font-size="8.5" text-anchor="middle">主體本身零權限、Role 也只是躺著的權限——RoleBinding 把兩者黏起來,權限才生效</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">RBAC 的核心是這條鏈:<b>主體</b>(User / Group / ServiceAccount)靠 <b>RoleBinding</b> 綁上一個 <b>Role</b>。Role 定義「能對什麼資源做什麼動作」(這裡是對 pods 的 get/list/watch)。少了 Binding,Role 只是躺著沒人擁有的權限;主體在被綁之前也一無所有</figcaption>
</figure>

一條規則(rule)由三段組成:**apiGroups**(資源屬於哪個 API 群組)＋ **resources**(pods、deployments…)＋ **verbs**(get、list、watch、create、update、delete…)。而且 RBAC 跟 [[k8s-networkpolicy-cni|NetworkPolicy]] 是同一種脾氣:**只有允許、沒有拒絕,規則相加取聯集,預設一律不准。** 你只能一條條把權限「加上去」,加到剛好夠用為止。

## namespaced 還是 cluster-wide:兩個維度別搞混

Role 那對有 namespaced / cluster 之分,Binding 那對也有——這**兩個維度是獨立的**,組合起來才決定「權限在哪裡生效」:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 224" role="img" aria-label="三種組合的生效範圍:Role 加 RoleBinding 權限只在單一 namespace;ClusterRole 加 ClusterRoleBinding 權限遍及全叢集含 node 等叢集級資源;ClusterRole 加 RoleBinding 借用叢集級的權限定義但只在某 namespace 生效,是重用的常見技巧" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <text x="112" y="30" fill="#9aa4b2" font-size="9" text-anchor="middle" font-weight="bold">權限定義</text>
    <text x="300" y="30" fill="#9aa4b2" font-size="9" text-anchor="middle" font-weight="bold">綁定</text>
    <text x="500" y="30" fill="#9aa4b2" font-size="9" text-anchor="middle" font-weight="bold">生效範圍</text>
    <defs><marker id="rs" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="24" y="44" width="176" height="42" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="112" y="63" fill="#4f6df5" font-size="9.5" text-anchor="middle">Role</text><text x="112" y="77" fill="#9aa4b2" font-size="7.5" text-anchor="middle">namespaced</text>
    <rect x="228" y="44" width="144" height="42" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="300" y="68" fill="#d6a45c" font-size="9" text-anchor="middle">RoleBinding</text>
    <line x1="372" y1="65" x2="404" y2="65" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#rs)"/>
    <rect x="406" y="44" width="192" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/><text x="502" y="69" fill="#e6e6e6" font-size="8.8" text-anchor="middle">只在單一 namespace</text>
    <rect x="24" y="94" width="176" height="42" rx="7" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.6"/><text x="112" y="113" fill="#9b6ff0" font-size="9.5" text-anchor="middle">ClusterRole</text><text x="112" y="127" fill="#9aa4b2" font-size="7.5" text-anchor="middle">cluster-wide</text>
    <rect x="228" y="94" width="144" height="42" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="300" y="113" fill="#d6a45c" font-size="8.6" text-anchor="middle">ClusterRoleBinding</text>
    <line x1="372" y1="115" x2="404" y2="115" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#rs)"/>
    <rect x="406" y="94" width="192" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/><text x="502" y="112" fill="#e6e6e6" font-size="8.6" text-anchor="middle">全叢集(所有 ns +</text><text x="502" y="126" fill="#9aa4b2" font-size="8" text-anchor="middle">node 等叢集級資源)</text>
    <rect x="24" y="144" width="176" height="42" rx="7" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.6"/><text x="112" y="163" fill="#9b6ff0" font-size="9.5" text-anchor="middle">ClusterRole</text><text x="112" y="177" fill="#9aa4b2" font-size="7.5" text-anchor="middle">借用定義</text>
    <rect x="228" y="144" width="144" height="42" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="300" y="163" fill="#d6a45c" font-size="9" text-anchor="middle">RoleBinding</text><text x="300" y="177" fill="#9aa4b2" font-size="7" text-anchor="middle">在 ns-A</text>
    <line x1="372" y1="165" x2="404" y2="165" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#rs)"/>
    <rect x="406" y="144" width="192" height="42" rx="7" fill="#1f2330" stroke="#54b890" stroke-width="1.3"/><text x="502" y="162" fill="#e6e6e6" font-size="8.4" text-anchor="middle">只在 ns-A 生效</text><text x="502" y="176" fill="#9aa4b2" font-size="7.5" text-anchor="middle">(重用叢集級定義)</text>
    <text x="310" y="210" fill="#9aa4b2" font-size="8.5" text-anchor="middle">第三列最好用:寫一次通用的 ClusterRole,靠 RoleBinding 把它限縮到各個 namespace 重複用</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">「權限定義」與「綁定」是兩個獨立維度。前兩列是直覺組合;<b>第三列(ClusterRole + RoleBinding)</b>是實務最愛的技巧——把權限定義寫成一份通用 ClusterRole,再用 RoleBinding 限縮到指定 namespace,不必每個 namespace 重寫一份 Role</figcaption>
</figure>

還有個重點:**node、PersistentVolume、namespace 這類「不屬於任何 namespace」的叢集級資源,只能用 ClusterRole 授權**——Role 管不到它們。想給某人「看所有 node」的權限,一定是 ClusterRole ＋ ClusterRoleBinding。

## ServiceAccount:給 workload 的身分

人用憑證登入,那**跑在叢集裡的程式**(一個 CI bot、一個要讀 K8s API 的 [[k8s-ingress-dns|controller]])用什麼身分?答案是 **ServiceAccount**——專門給 workload 的身分。每個 Pod 都以某個 SA 的身分執行(沒指定就用該 namespace 的 `default` SA),API Server 會把這個 SA 的 token 掛進 Pod,程式拿它去呼叫 API 時,RBAC 就用這個 SA 去比對權限。

所以要讓一個 Pod 能列出 Pod,標準三步:**建一個 ServiceAccount → 建一個 Role(或 ClusterRole)→ 用 RoleBinding 把兩者綁起來**,然後讓 Pod 指定用那個 SA。這裡最該守住的原則是**最小權限**:那個 `default` SA 預設幾乎什麼都不能做,是刻意的——**別為了省事給 workload 一個 cluster-admin,那等於把整座叢集的鑰匙插在門上。**

想確認到底有沒有權限,不用猜,`kubectl auth can-i` 直接問:

```bash
kubectl auth can-i delete pods                       # 我自己能不能刪 pod
kubectl auth can-i list nodes --as=system:serviceaccount:ci:ci-bot   # 冒充某 SA 來測
```

## 反思

### 認證與授權分不清,RBAC 永遠學不透

我看過太多人(包括早年的自己)把「連得進叢集」跟「能操作叢集」當成同一件事。它們是**兩道獨立的門**:憑證只證明「你是 aidan」,至於 aidan 能不能刪 Production 的 Deployment,是 RBAC 另外一關的事。想通這條界線後,很多怪現象瞬間有解——**`401` 是身分沒驗過(認證問題),`403` 是身分沒問題但沒權限(授權問題)**,兩者的排查方向天差地遠。我現在遇到權限報錯,第一件事永遠是先看它是 401 還是 403,直接就分流到對的那道門去查,不再瞎試。

### 「Role 不屬於任何人」是最關鍵、也最反直覺的一點

RBAC 剛學會覺得零件很多,但真正的鑰匙是理解**Role 只是一張漂在空中的權限清單,它不主動屬於誰**。權限要落到人或程式身上,一定得經過一條 **Binding** 把它黏過去。這個「定義」與「授予」分離的設計乍看囉嗦,好處卻很大:同一份 `pod-reader` 可以綁給十個人、十個 SA,權限定義只維護一份。這跟我在 [[k8s-networkpolicy-cni|NetworkPolicy]] 看到的「白名單、預設拒絕、只加不減」是同一種安全哲學——**權限系統的預設值必須是『不准』,一切開放都得是明確、可追溯的一筆綁定。**

### 最小權限不是潔癖,是把爆炸半徑先關進籠子

給 workload 授權時,我的紀律是**從零開始加,而不是從 admin 往下砍**。這件事在忙的時候特別容易妥協——「先給個大權限讓它跑起來,之後再收」,而「之後」永遠不會來。但 ServiceAccount 的權限就是一顆 Pod 被打下來後,攻擊者立刻繼承的能力:給了 cluster-admin,一顆 Pod 淪陷等於整個叢集淪陷。這正是 [[sre-automation-release|我在 SRE 那幾篇]]反覆講的「先想爆炸半徑」在權限層的版本——**最小權限的價值,不在平時省了什麼,而在出事那一刻,它把災難鎖在一個 namespace、而不是整座叢集。**
