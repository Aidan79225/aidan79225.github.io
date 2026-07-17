# Kubernetes 學習筆記 — 系列 Roadmap(以 CKA 為目標)

內部規劃文件(不發佈;Astro 不會 build `docs/`)。系列鍵:`series: "Kubernetes 學習筆記"`。

**目標:涵蓋 CKA(Certified Kubernetes Administrator)五大考試領域**,用這個 blog 一貫的「一張圖 + 精簡文字 + 反思」把每個知識點講清楚。不是抄考古題,而是把 CKA 要求的觀念地基打牢;真正考前的動手練習(kubectl 操作、killer.sh)另外做,但觀念這一層讀完這個系列就夠。

## CKA 五大領域與涵蓋對照

| CKA 領域 | 權重 | 對應本系列文章 |
|---|---|---|
| Cluster Architecture, Installation & Configuration | 25% | #11 RBAC、#12 叢集管理(kubeadm/etcd/upgrade)、(選)#14 Helm/Kustomize |
| Workloads & Scheduling | 15% | #3 Deployment、#5 ConfigMap/Secret、#7 進階排程、#8 實戰跑 workload |
| Services & Networking | 20% | #4 Service、#9 Ingress + DNS、#10 NetworkPolicy + CNI |
| Storage | 10% | #6 儲存(PV/PVC/StorageClass/StatefulSet) |
| Troubleshooting | **30%** | #13 故障排除(貫穿全系列,考試最大宗) |

★ = CKA 高權重、必讀(#6、#11、#12、#13,以及貫穿的排程與網路)。

## 地基篇(是什麼、怎麼動)

| # | slug | 標題 | 主題 | 狀態 |
|---|---|---|---|---|
| 1 | `k8s-intro` | Kubernetes 是什麼:從「跑容器」到「宣告你要的狀態」 | 宣告式、reconcile loop、控制迴圈 | ✅ 已發布 |
| 2 | `k8s-pod-node-scheduler` | Pod、Node、Scheduler:叢集的三個原子 | Pod/Node/Scheduler、control plane 解剖 | ✅ 已發布 |
| 3 | `k8s-deployment` | Deployment 與自我修復:reconcile loop 的實戰 | Deployment、rolling update / rollback、自我修復、replica | ✅ 已發布 |

## Workloads & Scheduling(15%)

| # | slug | 標題 | 主題 | 狀態 |
|---|---|---|---|---|
| 5 | `k8s-config-secret` | ConfigMap 與 Secret | 設定/機密外部化、env vs volume 注入、Secret≠加密 | ✅ 已發布 |
| 7 | `k8s-scheduling-advanced` | 進階排程:讓 pod 去對的 node | labels/selectors、node affinity(required/preferred)、taints & tolerations(拉/推/免疫)、requests 影響排程、nodeName 手動排程、pod (anti)affinity/topology spread | ✅ 已發布 |
| 8 | `airflow-spark-on-k8s` | Airflow + Spark 跑在 K8s 上 | 不同 node 跑不同 pod(實戰示範 selector/affinity) | ✅ 已發布 |

## Services & Networking(20%)

| # | slug | 標題 | 主題 | 狀態 |
|---|---|---|---|---|
| 4 | `k8s-service` | Service:擋在短命 Pod 前面的固定門牌 | ClusterIP/NodePort/LoadBalancer、Endpoints、kube-proxy | ✅ 已發布 |
| 9 | `k8s-ingress-dns` | Ingress 與叢集 DNS:一個入口進來、一個名字相認 | Ingress(L7 vs Service L4)、TLS 終結、Ingress Controller + IngressClass(規則≠執行)、CoreDNS、`<svc>.<ns>.svc.cluster.local` 命名與 search domain、headless service DNS | ✅ 已發布 |
| 10 | `k8s-networkpolicy-cni` | NetworkPolicy 與 CNI:Pod 之間的防火牆 | pod 網路模型(預設全通、扁平)、CNI 是什麼(Flannel/Calico/Cilium)、NetworkPolicy(選中即翻預設拒絕、白名單、逐 Pod、兩個 selector)、policy 要 CNI enforce 才有效 | ✅ 已發布 |

## Storage(10%)

| # | slug | 標題 | 主題 | 狀態 |
|---|---|---|---|---|
| 6 | `k8s-storage` | K8s 儲存:Volume、PV/PVC 與 StatefulSet | Volume 類型(emptyDir/hostPath/PVC)、PV/PVC 供需分離綁定、StorageClass 動態供應、access modes RWO/ROX/RWX、reclaim policy、StatefulSet(volumeClaimTemplates/穩定身分/有序)——接 `[[infra-kafka]]`、`[[infra-redis]]` | ✅ 已發布 ★ |

## Cluster Architecture, Installation & Configuration(25%)

| # | slug | 標題 | 主題 | 狀態 |
|---|---|---|---|---|
| 11 | `k8s-rbac` | RBAC:誰能對叢集做什麼 | ServiceAccount、Role/ClusterRole、RoleBinding/ClusterRoleBinding、認證 vs 授權 | ⬜ ★ |
| 12 | `k8s-cluster-admin` | 叢集管理:kubeadm、etcd 備份、升級 | kubeadm 建/加入叢集、HA control plane、**etcd backup/restore**、cluster upgrade 流程——接 `[[sre-consensus]]`、`[[infra-k8s]]` | ⬜ ★ |
| 14 | `k8s-packaging` | 打包與部署:Helm 與 Kustomize | Helm chart/values、Kustomize overlay、跨環境部署(接 `[[k8s-config-secret]]`) | ⬜ (選) |

## Troubleshooting(30% — 考試最大宗)

| # | slug | 標題 | 主題 | 狀態 |
|---|---|---|---|---|
| 13 | `k8s-troubleshooting` | 故障排除:pod、node、control plane 怎麼查 | `kubectl describe/logs/events`、pod 生命週期與常見狀態(Pending/CrashLoopBackOff/ImagePullBackOff)、node 與 control plane 組件排障、`kubectl debug`——接 `[[sre-troubleshooting]]` | ⬜ ★ |

## 建議閱讀順序(CKA 導向)
1. 先把**地基**(1→2→3)讀熟——沒有 reconcile / Pod 的心智模型,後面都是背。
2. **Workloads & Scheduling**(5→7,搭 8 實戰):CKA 天天在 `kubectl create/scale/edit`。
3. **Storage**(6):PV/PVC/StatefulSet,考試必有。
4. **Networking**(4→9→10):Service→Ingress/DNS→NetworkPolicy。
5. **Cluster Admin**(11 RBAC→12 kubeadm/etcd/upgrade):25% 且最「管理員」。
6. **Troubleshooting**(13):30%,但它其實是把前面全部串起來的能力——放最後,當總複習。

## 寫每篇時的慣例
- front matter:`series: "Kubernetes 學習筆記"`、`seriesOrder: <#>`、`category: tech`、`draft: true`(寫好再發)。
- tags 用 ASCII:`kubernetes` + 該篇主題(如 `storage`、`networking`、`security`、`scheduling`、`troubleshooting`)。
- 依 `.claude/skills/writing-blog-post`:一張招牌 SVG + 比官方文件更清楚的摘要 + 一段真實反思;台灣用語(見 `docs/zh-tw-style-guide.md`)。
- **與「從 Infra 角度看資料工具」系列分工**:那邊是「把工具當 infra 養」的橫向視角(requests/limits/QoS、StatefulSet 在 `[[infra-k8s]]`);這裡是**逐主題把 K8s 本身講清楚、對齊 CKA**。重疊處互連、不重複(如資源模型深談在 infra-k8s,這裡點到即可)。
- cross-link:儲存/StatefulSet ↔ `[[infra-kafka]]`/`[[infra-redis]]`;etcd/共識 ↔ `[[sre-consensus]]`;故障排除 ↔ `[[sre-troubleshooting]]`;監控 ↔ `[[sre-monitoring]]`、`[[sre-onboarding-inhouse]]`(LGTM)。
