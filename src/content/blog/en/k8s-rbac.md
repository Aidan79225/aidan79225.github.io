---
title: "RBAC: Who Can Do What to the Cluster"
date: 2026-07-18
category: tech
tags:
  - kubernetes
  - security
series: "Kubernetes — Learning Notes"
seriesOrder: 11
comments: true
draft: false
translationOf: k8s-rbac
---
The previous ten posts were about making things "run and be reachable". This one switches dimension: **who has the right to give the cluster orders?** A `kubectl delete` hits the API Server — how does it know who you are, and on what grounds does it let you delete? That's the territory of **RBAC (Role-Based Access Control)**, and the piece most worth digesting in the Cluster Architecture domain that carries the biggest weight on the CKA. The opening move is separating two things that are constantly conflated: **authentication** and **authorization**.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 176" role="img" aria-label="A request entering the API Server passes two gates: the first, authentication (authn), asks who you are, verifying identity via certificates, tokens or OIDC, and fails with 401; the second, authorization (authz, which is RBAC), asks whether you may perform this action, refusing with 403; only when both pass does the API Server actually execute" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="ra" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="12" y="56" width="112" height="52" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="68" y="78" fill="#e6e6e6" font-size="10" text-anchor="middle">kubectl / Pod</text>
    <text x="68" y="94" fill="#9aa4b2" font-size="8" text-anchor="middle">sends a request</text>
    <line x1="124" y1="82" x2="156" y2="82" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ra)"/>
    <rect x="158" y="50" width="148" height="64" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="232" y="72" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">① authn</text>
    <text x="232" y="87" fill="#9aa4b2" font-size="8.2" text-anchor="middle">who are you?</text>
    <text x="232" y="100" fill="#9aa4b2" font-size="8.2" text-anchor="middle">certs · token · OIDC</text>
    <line x1="306" y1="82" x2="338" y2="82" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ra)"/>
    <rect x="340" y="50" width="150" height="64" rx="8" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.9"/>
    <text x="415" y="72" fill="#9b6ff0" font-size="10.5" font-weight="bold" text-anchor="middle">② authz</text>
    <text x="415" y="87" fill="#9aa4b2" font-size="8.2" text-anchor="middle">may you do this?</text>
    <text x="415" y="100" fill="#9aa4b2" font-size="8.2" text-anchor="middle">← this is RBAC</text>
    <line x1="490" y1="82" x2="522" y2="82" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ra)"/>
    <rect x="524" y="56" width="84" height="52" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/>
    <text x="566" y="78" fill="#54b890" font-size="9.5" text-anchor="middle">execute</text>
    <text x="566" y="94" fill="#9aa4b2" font-size="8" text-anchor="middle">API Server</text>
    <text x="232" y="140" fill="#e05a7d" font-size="8.5" text-anchor="middle">identity unverified → 401</text>
    <text x="415" y="140" fill="#e05a7d" font-size="8.5" text-anchor="middle">no permission → 403</text>
    <text x="310" y="162" fill="#9aa4b2" font-size="8.5" text-anchor="middle">two gates, one job each: first confirm "who you are", then decide "whether you may"</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Every request into the API Server passes two gates: <b>① authentication</b> confirms who you are (fails with 401), <b>② authorization (RBAC)</b> decides whether you may perform this action (fails with 403). RBAC governs only the second gate — it <b>assumes your identity has already been verified</b></figcaption>
</figure>

## Authentication vs authorization: K8s only governs the second gate

The division between these two words is the foundation for understanding RBAC: **authentication (authn) asks "who are you"; authorization (authz) asks "what may you do".** RBAC is purely the latter — it never verifies identity; it only decides, on the premise that "identity is known", whether this person may perform some action.

One counter-intuitive fact: **there is no "User" object in K8s at all.** You don't `kubectl create user`. Human identity is decided by **external** authentication mechanisms — client certificates, bearer tokens, cloud IAM, OIDC… After the API Server verifies, all it holds is a string of "username + groups", and RBAC matches permissions against that string. The only identity K8s manages itself is the **ServiceAccount**, for programs (covered below). **Remember: User / Group come from outside; only the ServiceAccount is an in-cluster object.**

## RBAC's building blocks: a Role is permissions, a Binding is glue

RBAC has only four object kinds, in two pairs, and it all clicks once you see the division between "role" and "binding":

- **Role / ClusterRole**: a set of **permissions** — "which actions on which resources". It's just a list of permissions; **it belongs to nobody on its own**.
- **RoleBinding / ClusterRoleBinding**: a **binding** — it **glues** a Role onto some subject.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 232" role="img" aria-label="The RBAC binding chain: on the left three kinds of subject, User aidan, Group dev, ServiceAccount ci-bot; in the middle the RoleBinding is the glue; on the right the Role pod-reader defines permissions, its rule allowing get, list and watch on the pods resource. A subject has zero permissions on its own and a Role is just permissions lying around; the RoleBinding glues the two together and only then does it take effect" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="rb" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="14" y="44" width="170" height="150" rx="10" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="99" y="64" fill="#4f6df5" font-size="10" font-weight="bold" text-anchor="middle">Subjects (who)</text>
    <rect x="30" y="76" width="138" height="30" rx="6" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/><text x="99" y="95" fill="#e6e6e6" font-size="9" text-anchor="middle">User: aidan</text>
    <rect x="30" y="112" width="138" height="30" rx="6" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/><text x="99" y="131" fill="#e6e6e6" font-size="9" text-anchor="middle">Group: dev</text>
    <rect x="30" y="148" width="138" height="34" rx="6" fill="#1f2330" stroke="#54b890" stroke-width="1.3"/><text x="99" y="164" fill="#e6e6e6" font-size="9" text-anchor="middle">ServiceAccount:</text><text x="99" y="176" fill="#9aa4b2" font-size="8" text-anchor="middle">ci-bot (in-cluster object)</text>
    <line x1="184" y1="119" x2="236" y2="119" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#rb)"/>
    <rect x="238" y="92" width="140" height="56" rx="9" fill="#1f2330" stroke="#d6a45c" stroke-width="1.8"/>
    <text x="308" y="114" fill="#d6a45c" font-size="10" font-weight="bold" text-anchor="middle">RoleBinding</text>
    <text x="308" y="130" fill="#9aa4b2" font-size="8" text-anchor="middle">glues subject to role</text>
    <text x="308" y="141" fill="#9aa4b2" font-size="8" text-anchor="middle">(the glue)</text>
    <line x1="378" y1="119" x2="430" y2="119" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#rb)"/>
    <rect x="432" y="44" width="176" height="150" rx="10" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.8"/>
    <text x="520" y="64" fill="#9b6ff0" font-size="10" font-weight="bold" text-anchor="middle">Role: pod-reader</text>
    <text x="520" y="79" fill="#9aa4b2" font-size="8" text-anchor="middle">a set of permissions (owned by nobody)</text>
    <rect x="446" y="90" width="148" height="94" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="520" y="108" fill="#9aa4b2" font-size="8.5" text-anchor="middle">apiGroups: ""</text>
    <text x="520" y="126" fill="#e6e6e6" font-size="9" text-anchor="middle">resources: pods</text>
    <text x="520" y="150" fill="#9aa4b2" font-size="8.5" text-anchor="middle">verbs:</text>
    <text x="520" y="167" fill="#54b890" font-size="9" text-anchor="middle">get · list · watch</text>
    <text x="310" y="216" fill="#9aa4b2" font-size="8.5" text-anchor="middle">a subject has zero permissions; a Role is just permissions lying around — the RoleBinding glues them, and only then do they apply</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The core of RBAC is this chain: a <b>subject</b> (User / Group / ServiceAccount) is bound to a <b>Role</b> via a <b>RoleBinding</b>. The Role defines "which actions on which resources" (here get/list/watch on pods). Without the Binding, the Role is just permissions lying around that nobody owns; before being bound, the subject has nothing at all</figcaption>
</figure>

A rule has three parts: **apiGroups** (which API group the resource belongs to) + **resources** (pods, deployments…) + **verbs** (get, list, watch, create, update, delete…). And RBAC has the same temperament as [[k8s-networkpolicy-cni|NetworkPolicy]]: **allow only, no deny; rules add up as a union; the default is nothing permitted.** You can only "add" permissions one at a time, until they're just enough.

## Namespaced or cluster-wide: two dimensions not to confuse

The Role pair has a namespaced / cluster split, and so does the Binding pair — these **two dimensions are independent**, and their combination decides "where the permission takes effect":

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 224" role="img" aria-label="Scope of three combinations: Role plus RoleBinding, permission only in a single namespace; ClusterRole plus ClusterRoleBinding, permission across the whole cluster including cluster-level resources like nodes; ClusterRole plus RoleBinding, borrowing the cluster-level permission definition but taking effect only in one namespace, a common reuse trick" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <text x="112" y="30" fill="#9aa4b2" font-size="9" text-anchor="middle" font-weight="bold">permission definition</text>
    <text x="300" y="30" fill="#9aa4b2" font-size="9" text-anchor="middle" font-weight="bold">binding</text>
    <text x="500" y="30" fill="#9aa4b2" font-size="9" text-anchor="middle" font-weight="bold">scope</text>
    <defs><marker id="rs" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="24" y="44" width="176" height="42" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="112" y="63" fill="#4f6df5" font-size="9.5" text-anchor="middle">Role</text><text x="112" y="77" fill="#9aa4b2" font-size="7.5" text-anchor="middle">namespaced</text>
    <rect x="228" y="44" width="144" height="42" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="300" y="68" fill="#d6a45c" font-size="9" text-anchor="middle">RoleBinding</text>
    <line x1="372" y1="65" x2="404" y2="65" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#rs)"/>
    <rect x="406" y="44" width="192" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/><text x="502" y="69" fill="#e6e6e6" font-size="8.8" text-anchor="middle">a single namespace only</text>
    <rect x="24" y="94" width="176" height="42" rx="7" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.6"/><text x="112" y="113" fill="#9b6ff0" font-size="9.5" text-anchor="middle">ClusterRole</text><text x="112" y="127" fill="#9aa4b2" font-size="7.5" text-anchor="middle">cluster-wide</text>
    <rect x="228" y="94" width="144" height="42" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="300" y="113" fill="#d6a45c" font-size="8.6" text-anchor="middle">ClusterRoleBinding</text>
    <line x1="372" y1="115" x2="404" y2="115" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#rs)"/>
    <rect x="406" y="94" width="192" height="42" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/><text x="502" y="112" fill="#e6e6e6" font-size="8.6" text-anchor="middle">whole cluster (all ns +</text><text x="502" y="126" fill="#9aa4b2" font-size="8" text-anchor="middle">cluster-level resources like nodes)</text>
    <rect x="24" y="144" width="176" height="42" rx="7" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.6"/><text x="112" y="163" fill="#9b6ff0" font-size="9.5" text-anchor="middle">ClusterRole</text><text x="112" y="177" fill="#9aa4b2" font-size="7.5" text-anchor="middle">borrowed definition</text>
    <rect x="228" y="144" width="144" height="42" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="300" y="163" fill="#d6a45c" font-size="9" text-anchor="middle">RoleBinding</text><text x="300" y="177" fill="#9aa4b2" font-size="7" text-anchor="middle">in ns-A</text>
    <line x1="372" y1="165" x2="404" y2="165" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#rs)"/>
    <rect x="406" y="144" width="192" height="42" rx="7" fill="#1f2330" stroke="#54b890" stroke-width="1.3"/><text x="502" y="162" fill="#e6e6e6" font-size="8.4" text-anchor="middle">takes effect only in ns-A</text><text x="502" y="176" fill="#9aa4b2" font-size="7.5" text-anchor="middle">(reusing the cluster-level definition)</text>
    <text x="310" y="210" fill="#9aa4b2" font-size="8.5" text-anchor="middle">the third row is the handiest: write one generic ClusterRole, and scope it down per namespace with RoleBindings</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">"Permission definition" and "binding" are two independent dimensions. The first two rows are the intuitive combinations; <b>the third (ClusterRole + RoleBinding)</b> is the practitioner's favourite trick — write the permission definition once as a generic ClusterRole, then scope it down to a given namespace with a RoleBinding, instead of rewriting a Role in every namespace</figcaption>
</figure>

One more key point: **cluster-level resources that "belong to no namespace" — nodes, PersistentVolumes, namespaces themselves — can only be authorised with a ClusterRole**; a Role can't reach them. To give someone "view all nodes", it's always ClusterRole + ClusterRoleBinding.

## ServiceAccount: an identity for workloads

Humans log in with credentials; what identity does **a program running inside the cluster** use (a CI bot, a [[k8s-ingress-dns|controller]] that needs to read the K8s API)? The answer is the **ServiceAccount** — an identity purpose-built for workloads. Every Pod runs as some SA (the namespace's `default` SA if none is specified); the API Server mounts that SA's token into the Pod, and when the program calls the API with it, RBAC matches permissions against that SA.

So to let a Pod list Pods, the standard three steps: **create a ServiceAccount → create a Role (or ClusterRole) → bind the two with a RoleBinding**, then have the Pod specify that SA. The principle to hold on to here is **least privilege**: that `default` SA can do almost nothing by default, and that's deliberate — **don't hand a workload cluster-admin to save effort; that's leaving the keys to the whole cluster in the door.**

Those "standard three steps" in YAML are exactly the three blocks in the binding-chain diagram:

```yaml
apiVersion: v1
kind: ServiceAccount                 # ① subject: an identity for the workload
metadata: { name: ci-bot, namespace: ci }
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role                           # ② role: a set of permissions (namespaced, owned by nobody)
metadata: { name: pod-reader, namespace: ci }
rules:
  - apiGroups: [ "" ]                # "" = the core API group (where pods live)
    resources: [ "pods" ]
    verbs: [ "get", "list", "watch" ]  # read only, no delete
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding                    # ③ binding: glue the Role onto the subject
metadata: { name: ci-bot-can-read-pods, namespace: ci }
subjects:
  - { kind: ServiceAccount, name: ci-bot, namespace: ci }
roleRef:
  { kind: Role, name: pod-reader, apiGroup: rbac.authorization.k8s.io }
```

`roleRef` points at "which permissions to grant", `subjects` at "to whom" — **without this RoleBinding, `pod-reader` is just unowned permissions lying around, and `ci-bot` has nothing at all.** On the Pod side, write `serviceAccountName: ci-bot`, and when it runs and calls the API it has only read access to pods; everything else is 403.

To check whether a permission actually exists, don't guess; ask with `kubectl auth can-i`:

```bash
kubectl auth can-i delete pods                       # can I myself delete pods
kubectl auth can-i list nodes --as=system:serviceaccount:ci:ci-bot   # impersonate an SA to test
```

## Reflections

### Confuse authentication with authorization and you'll never fully learn RBAC

I've seen too many people (my earlier self included) treat "can connect to the cluster" and "can operate the cluster" as the same thing. They're **two independent gates**: a certificate only proves "you are aidan"; whether aidan may delete a Production Deployment is a separate RBAC matter. Once that line was clear, a lot of odd phenomena had instant answers — **`401` means identity wasn't verified (an authentication problem); `403` means identity is fine but there's no permission (an authorization problem)**, and the two are investigated in completely different directions. Now, whenever I hit a permission error, the first thing I do is check whether it's 401 or 403, and go straight to the right gate instead of poking blindly.

### "A Role belongs to nobody" is the most critical, and most counter-intuitive, point

RBAC seems to have a lot of parts when you first learn it, but the real key is understanding that **a Role is just a list of permissions floating in the air; it doesn't belong to anyone on its own**. For permissions to land on a person or a program, a **Binding** has to glue them across. This separation of "definition" from "grant" looks verbose at first, but the payoff is large: the same `pod-reader` can be bound to ten people and ten SAs, with the permission definition maintained once. It's the same security philosophy as the "allow-list, default deny, only add never subtract" I saw in [[k8s-networkpolicy-cni|NetworkPolicy]] — **a permission system's default must be "no", and every opening must be an explicit, traceable binding.**

### Least privilege isn't fastidiousness; it's caging the blast radius in advance

When granting workloads permissions, my discipline is **start from zero and add, not start from admin and trim**. It's especially tempting to compromise when busy — "give it broad permissions to get it running, tighten later" — and "later" never comes. But a ServiceAccount's permissions are exactly the capability an attacker inherits the instant a Pod is compromised: grant cluster-admin, and one fallen Pod is the whole cluster fallen. It's the permission-layer version of the "think about the blast radius first" I kept repeating in [[sre-automation-release|the SRE posts]] — **the value of least privilege isn't what it saves on ordinary days; it's that at the moment something goes wrong, it locks the disaster inside one namespace rather than the whole cluster.**
