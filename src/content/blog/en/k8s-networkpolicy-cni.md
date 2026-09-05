---
title: "NetworkPolicy and CNI: The Firewall Between Pods"
date: 2026-07-17
category: tech
tags:
  - kubernetes
  - networking
series: "Kubernetes — Learning Notes"
seriesOrder: 10
comments: true
draft: false
translationOf: k8s-networkpolicy-cni
---
[[k8s-service|Service]] and [[k8s-ingress-dns|Ingress]] were about "how traffic **finds** a service", but underneath sits a more basic, more easily ignored question: **can Pods reach each other by default?** The answer shocks many people — **everything is open by default; any Pod can connect to any other Pod in the cluster.** This post covers two things: the layer that gives Pods a network at all (**CNI**), and the firewall that turns "all open" into "allow-list" (**NetworkPolicy**).

## K8s's network model: a fully connected flat network by default

K8s makes only one hard demand of the network: **every Pod has its own IP, and any two Pods can talk directly by IP, across nodes or not, with no NAT in between.** That brings a security fact that's often underestimated: **there is no isolation by default.** The frontend Pod can reach the database Pod, service A can reach service B's internal port — anyone who knows the other's IP (or [[k8s-ingress-dns|Service name]]) gets through. Convenient, but it also means **once one Pod is compromised, it can move laterally across the whole cluster.**

## CNI: the layer that actually gives Pods a network

The promise "every Pod has an IP and they can all reach each other" is something K8s **does not implement itself** — it outsources it to a plugin standard, **CNI (Container Network Interface)**. Every time the kubelet creates a Pod, it calls the CNI plugin to **assign an IP, attach a virtual NIC, set up routes**, and only then is the Pod actually on the network. So when the CNI is missing or broken, the classic symptom is **Pods stuck in `ContainerCreating` and the node showing `NotReady`** — not a scheduling problem; nobody wired up the network at all.

Common plugins are **Flannel** (a simple overlay that gives you only "all open"), **Calico** and **Cilium** (the latter two also **enforce NetworkPolicy** on top of connectivity). It's another of K8s's "leave a blank for plugins" designs, with the same flavour as [[k8s-ingress-dns|Ingress needing a Controller]]: **the core defines the spec; capabilities come from plugins.**

## NetworkPolicy: turning "all open" into "allow-list"

To switch off the default openness, you use **NetworkPolicy**. Its mechanism has one key twist you must commit to memory: **as soon as a Pod is selected by any NetworkPolicy, it flips, in that direction (ingress / egress), from "default allow" to "default deny", and from then on only traffic the rules explicitly list gets through.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 290" role="img" aria-label="Left, the default: any two of the web, api and db Pods can reach each other. Right, after applying one NetworkPolicy protecting only db: db flips to default deny and allows only traffic from api, so web to db is blocked; web and api, not selected by any policy, remain fully open to each other" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="ok" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#54b890"/></marker><marker id="no" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#e05a7d"/></marker></defs>
    <rect x="8" y="30" width="288" height="252" rx="10" fill="none" stroke="#3a4154" stroke-width="1.4"/>
    <text x="152" y="22" fill="#9aa4b2" font-size="10" text-anchor="middle">default: any two Pods can talk</text>
    <rect x="104" y="50" width="96" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="152" y="73" fill="#e6e6e6" font-size="10.5" text-anchor="middle">web</text>
    <rect x="40" y="150" width="96" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="88" y="173" fill="#e6e6e6" font-size="10.5" text-anchor="middle">api</text>
    <rect x="168" y="150" width="96" height="36" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="216" y="173" fill="#e6e6e6" font-size="10.5" text-anchor="middle">db</text>
    <line x1="128" y1="86" x2="96" y2="148" stroke="#54b890" stroke-width="1.5" marker-end="url(#ok)"/>
    <line x1="176" y1="86" x2="208" y2="148" stroke="#54b890" stroke-width="1.5" marker-end="url(#ok)"/>
    <line x1="136" y1="168" x2="166" y2="168" stroke="#54b890" stroke-width="1.5" marker-end="url(#ok)"/>
    <text x="152" y="215" fill="#9aa4b2" font-size="8.5" text-anchor="middle">all open = no isolation</text>
    <text x="152" y="230" fill="#9aa4b2" font-size="8.5" text-anchor="middle">web can reach db too</text>
    <rect x="324" y="30" width="288" height="252" rx="10" fill="none" stroke="#3a4154" stroke-width="1.4"/>
    <text x="468" y="22" fill="#9aa4b2" font-size="10" text-anchor="middle">apply one policy protecting only db</text>
    <rect x="420" y="50" width="96" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="468" y="73" fill="#e6e6e6" font-size="10.5" text-anchor="middle">web</text>
    <rect x="356" y="150" width="96" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="404" y="173" fill="#e6e6e6" font-size="10.5" text-anchor="middle">api</text>
    <rect x="484" y="150" width="96" height="36" rx="7" fill="#1f2330" stroke="#54b890" stroke-width="2.1"/><text x="532" y="169" fill="#e6e6e6" font-size="10.5" text-anchor="middle">db</text><text x="532" y="181" fill="#54b890" font-size="7" text-anchor="middle">default deny</text>
    <line x1="452" y1="168" x2="482" y2="168" stroke="#54b890" stroke-width="1.6" marker-end="url(#ok)"/><text x="467" y="160" fill="#54b890" font-size="7.5" text-anchor="middle">✓</text>
    <line x1="492" y1="86" x2="524" y2="148" stroke="#e05a7d" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#no)"/><text x="524" y="112" fill="#e05a7d" font-size="7.5" text-anchor="middle">✗ web blocked</text>
    <line x1="444" y1="86" x2="412" y2="148" stroke="#54b890" stroke-width="1.3" marker-end="url(#ok)"/>
    <text x="468" y="225" fill="#9aa4b2" font-size="8.5" text-anchor="middle">db allows only api; web↔api not selected, still open</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Left is the default "all open". Right applies one policy to <b>db</b> only, and <b>db flips from all-open to default deny</b>, allowing only api; web to db is blocked. Note that <b>web↔api aren't selected by any policy and stay fully open</b> — NetworkPolicy is "an allow-list added per Pod", not a cluster-wide switch</figcaption>
</figure>

A few properties that trip people up: **it's namespaced** (governs only its own namespace); **allow-list only, no deny-list** (you can only list "who is allowed", never "who is blocked"); **multiple policies add up as a union** (rules only ever widen, they never veto each other). To get "everything in this namespace denied by default", apply a policy with `podSelector: {}` (selects every Pod) and no ingress rules at all — everyone selected, nothing allowed, so everything is shut, and then you open allow-list entries one by one.

## One policy has "two selectors" — don't mix them up

The most disorienting part of NetworkPolicy is that it contains **two selectors with different jobs** — one picks "whom to protect", the other "whom to allow":

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 250" role="img" aria-label="The structure of one NetworkPolicy: the outermost podSelector decides which Pods the rule applies to (protecting app=db); the podSelector inside ingress.from decides which Pods may connect in (allowing app=api); ports then narrows it to a specific port, 5432. The two selectors have different jobs" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="np" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="176" y="24" width="248" height="202" rx="10" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.9"/>
    <text x="300" y="46" fill="#9b6ff0" font-size="11" font-weight="bold" text-anchor="middle">NetworkPolicy (namespaced)</text>
    <rect x="192" y="58" width="216" height="52" rx="7" fill="#1f2330" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="300" y="77" fill="#4f6df5" font-size="9.5" font-weight="bold" text-anchor="middle">① podSelector: app=db</text>
    <text x="300" y="92" fill="#9aa4b2" font-size="8" text-anchor="middle">which Pods this rule "protects"</text>
    <text x="300" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">the selected ones flip to default deny</text>
    <rect x="192" y="120" width="216" height="56" rx="7" fill="#1f2330" stroke="#54b890" stroke-width="1.5"/>
    <text x="300" y="139" fill="#54b890" font-size="9.5" font-weight="bold" text-anchor="middle">② ingress.from: app=api</text>
    <text x="300" y="154" fill="#9aa4b2" font-size="8" text-anchor="middle">which Pods are "allowed" in</text>
    <text x="300" y="166" fill="#9aa4b2" font-size="8" text-anchor="middle">source can be pod / namespace / ipBlock</text>
    <rect x="192" y="186" width="216" height="30" rx="7" fill="#1f2330" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="300" y="205" fill="#d6a45c" font-size="9" text-anchor="middle">ports: 5432 — narrow to a specific port</text>
    <rect x="24" y="96" width="120" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="84" y="116" fill="#e6e6e6" font-size="10" text-anchor="middle">db Pod</text>
    <text x="84" y="131" fill="#9aa4b2" font-size="7.5" text-anchor="middle">the protected Pod</text>
    <line x1="190" y1="84" x2="146" y2="112" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#np)"/>
    <rect x="456" y="120" width="120" height="46" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.7"/>
    <text x="516" y="140" fill="#e6e6e6" font-size="10" text-anchor="middle">api Pod</text>
    <text x="516" y="155" fill="#9aa4b2" font-size="7.5" text-anchor="middle">the allowed source</text>
    <line x1="410" y1="146" x2="454" y2="146" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#np)"/>
    <text x="300" y="240" fill="#9aa4b2" font-size="8.5" text-anchor="middle">likewise egress.to governs "who can be reached going out"; no egress section means outbound is unrestricted</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The two selectors in one policy have completely different jobs: <b>① the outermost podSelector</b> decides "whom to protect" (who flips to default deny); <b>② the selector in ingress.from</b> decides "whom to allow". Confuse the two and you'll protect the wrong Pod, or allow the wrong source</figcaption>
</figure>

## In YAML: shut everything first, then open one allow-list entry

The safe approach in practice is two layers: first give the whole namespace a **default-deny** (close the front door), then open allow-list entries one by one. default-deny is "select every Pod, but give no ingress rules":

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny-ingress }
spec:
  podSelector: {}                 # empty = select every Pod in this namespace
  policyTypes: [ Ingress ]        # Ingress type only, and no from entries listed → inbound fully shut
```

Then separately allow "api may reach db on 5432" — note the **two selectors inside have different jobs**:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: db-allow-api }
spec:
  podSelector:
    matchLabels: { app: db }      # ① whom this rule "protects": db
  policyTypes: [ Ingress ]
  ingress:
    - from:
        - podSelector:
            matchLabels: { app: api }   # ② whom to "allow" in: api
      ports:
        - { protocol: TCP, port: 5432 } # narrowed to a specific port
```

Stacked together, the effect is the right half of the first diagram: db, selected by a policy, flips to default deny; only Pods labelled `app=api` can reach 5432; everything else is blocked. To allow **another namespace**, swap `from` to a `namespaceSelector`; to allow an IP range outside the cluster, use `ipBlock`. Rules only ever add, never subtract, and take the union — to be stricter, stack a narrower one on top rather than trying to write a "deny".

## A big pit: NetworkPolicy only works with a CNI behind it

This is the sneakiest point, and it ties the post's two protagonists together: **the NetworkPolicy object itself is only rules; what actually "drops packets" is the CNI plugin.** If your cluster uses a **CNI that doesn't support policy (plain Flannel, say)**, then you can `kubectl apply` a pile of NetworkPolicies — **and they'll be quietly ignored; not one packet gets blocked.** No error, no warning; you think the database is locked down, and the door is wide open. It's exactly the same pit as [[k8s-ingress-dns|an Ingress doing nothing without a Controller]]: **the object is a desired state; something actually running, and supporting it, has to execute it.** Before applying policies, confirm your CNI (Calico / Cilium and the like) really enforces them.

## Reflections

### "All open by default" is something I wish I'd known earlier

Early on I had a dangerous illusion: that once things were in the cluster, each service running in its own namespace, they were naturally isolated from each other. **Badly wrong.** K8s is by default a **fully connected flat network**; the frontend Pod can connect straight to the database Pod's internal port — not a single wall. What truly woke me up was imagining "what happens when an externally exposed Pod is compromised": under the default openness, the moment an attacker lands, the door to lateral movement across the whole cluster is wide open. Since then I treat **NetworkPolicy as table stakes for going live**, especially for databases and internal APIs, things that "should only be reachable by a specific few services" — **secure by default is never free; you have to build the walls yourself.**

### Remember "allow-list, per-Pod, flips the default" once and you won't misconfigure again

Nearly every mine I've stepped on with NetworkPolicy came from not having its model straight: it **can only write allow, never deny**; it **takes effect per Pod**, and Pods not selected by any policy stay fully open; and **once a Pod is selected, that direction flips to default deny**. Those three together explain the two most common newbie ghost stories — "I only meant to block web, and now nobody can reach db" (selection means shut everything; they forgot to add the allow-list), and "I wrote a policy and nothing happened" (the Pod wasn't selected at all, or the CNI doesn't enforce). **Getting the mental model right is a hundred times more useful than memorising YAML fields.**

### "Spec and plugin" again — K8s's beauty and pain live here

Finishing this post, I'm more certain that K8s's soul is a kind of **restraint**: almost none of the hard capabilities are done by K8s itself; it defines an interface and leaves it to plugins. Networking (CNI), storage ([[k8s-storage|CSI]]), L7 routing ([[k8s-ingress-dns|Ingress Controller]]) all follow the pattern. The upside is enormous flexibility — you can swap in Calico, Cilium, any conforming implementation; the price is that **"K8s is installed" doesn't mean "the capability is there"**; you have to know exactly what your cluster has plugged in and whether it supports the feature you want. Whenever I take over a cluster now, my first batch of questions always includes: **"Which CNI? Does it support NetworkPolicy?"** — because the answer directly decides whether the isolation rules I write are a real wall, or a sheet of paper pasted onto thin air.
