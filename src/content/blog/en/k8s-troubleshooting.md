---
title: "Troubleshooting: How to Investigate Pods, Nodes and the Control Plane"
date: 2026-07-19
category: tech
tags:
  - kubernetes
  - troubleshooting
series: "Kubernetes — Learning Notes"
seriesOrder: 13
comments: true
draft: false
translationOf: k8s-troubleshooting
---
The biggest slice of the CKA is troubleshooting (30%), but it's really **not new knowledge** — it's the ability that ties the whole series together. The worst thing in troubleshooting is guessing and trying things at random. The real method is one sentence: **walk the Pod's lifecycle and ask, gate by gate, "where is it stuck"** — because K8s is considerate: **it writes "which gate it's stuck at" straight into the status.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 344" role="img" aria-label="A Pod passes four gates from apply to receiving traffic, and getting stuck at each maps to a specific status: gate one, scheduling to a node, stuck is Pending (not enough resources, taint without toleration, PVC won't bind); gate two, pulling the image, stuck is ImagePullBackOff (image name typo, private registry missing imagePullSecret); gate three, starting the container and staying alive, stuck is CrashLoopBackOff or OOMKilled; gate four, passing readiness and entering Endpoints, stuck is Running but not Ready, or unreachable. Only past all four is it receiving traffic normally" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="tg" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#54b890"/></marker><marker id="tr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#e05a7d"/></marker></defs>
    <rect x="20" y="30" width="180" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/><text x="110" y="50" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">① scheduled to a node</text><text x="110" y="66" fill="#9aa4b2" font-size="8" text-anchor="middle">the Scheduler picks one</text>
    <rect x="20" y="94" width="180" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/><text x="110" y="114" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">② image pulled</text><text x="110" y="130" fill="#9aa4b2" font-size="8" text-anchor="middle">kubelet pulls from the registry</text>
    <rect x="20" y="158" width="180" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/><text x="110" y="178" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">③ container up · alive</text><text x="110" y="194" fill="#9aa4b2" font-size="8" text-anchor="middle">starts and doesn't crash</text>
    <rect x="20" y="222" width="180" height="52" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/><text x="110" y="242" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">④ Ready · in Endpoints</text><text x="110" y="258" fill="#9aa4b2" font-size="8" text-anchor="middle">traffic only after readiness passes</text>
    <rect x="34" y="296" width="152" height="34" rx="8" fill="#1f2330" stroke="#54b890" stroke-width="1.7"/><text x="110" y="317" fill="#54b890" font-size="10" font-weight="bold" text-anchor="middle">✓ serving traffic</text>
    <line x1="110" y1="76" x2="110" y2="92" stroke="#54b890" stroke-width="1.6" marker-end="url(#tg)"/>
    <line x1="110" y1="140" x2="110" y2="156" stroke="#54b890" stroke-width="1.6" marker-end="url(#tg)"/>
    <line x1="110" y1="204" x2="110" y2="220" stroke="#54b890" stroke-width="1.6" marker-end="url(#tg)"/>
    <line x1="110" y1="274" x2="110" y2="294" stroke="#54b890" stroke-width="1.6" marker-end="url(#tg)"/>
    <line x1="200" y1="53" x2="230" y2="53" stroke="#e05a7d" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#tr)"/>
    <rect x="232" y="32" width="352" height="42" rx="7" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3"/><text x="244" y="49" fill="#e05a7d" font-size="9.5" font-weight="bold" text-anchor="start">Pending</text><text x="244" y="65" fill="#9aa4b2" font-size="8" text-anchor="start">not enough resources / taint without toleration / PVC won't bind</text>
    <line x1="200" y1="117" x2="230" y2="117" stroke="#e05a7d" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#tr)"/>
    <rect x="232" y="96" width="352" height="42" rx="7" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3"/><text x="244" y="113" fill="#e05a7d" font-size="9.5" font-weight="bold" text-anchor="start">ImagePullBackOff · ErrImagePull</text><text x="244" y="129" fill="#9aa4b2" font-size="8" text-anchor="start">image name typo / private registry missing imagePullSecret</text>
    <line x1="200" y1="181" x2="230" y2="181" stroke="#e05a7d" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#tr)"/>
    <rect x="232" y="160" width="352" height="42" rx="7" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3"/><text x="244" y="177" fill="#e05a7d" font-size="9.5" font-weight="bold" text-anchor="start">CrashLoopBackOff · OOMKilled</text><text x="244" y="193" fill="#9aa4b2" font-size="8" text-anchor="start">crashes on start, restarts forever / killed for exceeding memory limit</text>
    <line x1="200" y1="248" x2="230" y2="248" stroke="#e05a7d" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#tr)"/>
    <rect x="232" y="224" width="352" height="48" rx="7" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3"/><text x="244" y="241" fill="#e05a7d" font-size="9.5" font-weight="bold" text-anchor="start">Running but not Ready · unreachable</text><text x="244" y="257" fill="#9aa4b2" font-size="8" text-anchor="start">readiness failing / Endpoints empty (bad selector)</text><text x="244" y="268" fill="#9aa4b2" font-size="8" text-anchor="start">/ DNS won't resolve / NetworkPolicy blocking</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">One diagram covers most troubleshooting: a Pod passes four gates from apply to receiving traffic, and <b>getting stuck at each gate maps to a specific status</b>. See the status, and you know which stage of the lifecycle the problem is in — which is why, once you've read the whole series, troubleshooting turns from "random guessing" into "following the map"</figcaption>
</figure>

## Step one is always these three commands: get → describe → logs

Whatever the symptom, the opening sequence is fixed, peeling the onion from the outside in:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 234" role="img" aria-label="The troubleshooting funnel: kubectl get for the current status, kubectl describe for why (the Events section at the bottom is the key), kubectl logs for what the program itself said, kubectl exec or debug to poke around inside. Also decide the layer first: the Pod layer with those commands; the Node layer for NotReady (kubelet dead or disk pressure); the Control Plane layer when api-server or etcd is down and the whole cluster stops responding" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="tf" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="10" y="34" width="138" height="46" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="79" y="53" fill="#e6e6e6" font-size="9.2" text-anchor="middle">kubectl get</text><text x="79" y="69" fill="#9aa4b2" font-size="8" text-anchor="middle">what's the status now?</text>
    <line x1="148" y1="57" x2="168" y2="57" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#tf)"/>
    <rect x="170" y="34" width="150" height="46" rx="7" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.9"/><text x="245" y="53" fill="#9b6ff0" font-size="9.2" font-weight="bold" text-anchor="middle">kubectl describe</text><text x="245" y="69" fill="#9aa4b2" font-size="8" text-anchor="middle">why? read the Events section</text>
    <line x1="320" y1="57" x2="340" y2="57" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#tf)"/>
    <rect x="342" y="34" width="138" height="46" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="411" y="53" fill="#e6e6e6" font-size="9.2" text-anchor="middle">kubectl logs</text><text x="411" y="69" fill="#9aa4b2" font-size="8" text-anchor="middle">what did the program say?</text>
    <line x1="480" y1="57" x2="500" y2="57" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#tf)"/>
    <rect x="502" y="34" width="108" height="46" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="556" y="53" fill="#e6e6e6" font-size="8.8" text-anchor="middle">exec / debug</text><text x="556" y="69" fill="#9aa4b2" font-size="8" text-anchor="middle">poke around inside</text>
    <text x="310" y="112" fill="#9aa4b2" font-size="9" text-anchor="middle">but before acting, ask: which layer is this?</text>
    <rect x="20" y="128" width="188" height="76" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/><text x="114" y="150" fill="#4f6df5" font-size="10" font-weight="bold" text-anchor="middle">Pod layer</text><text x="114" y="168" fill="#9aa4b2" font-size="8" text-anchor="middle">status / Events / logs</text><text x="114" y="184" fill="#9aa4b2" font-size="8" text-anchor="middle">the commands above suffice</text><text x="114" y="198" fill="#9aa4b2" font-size="8" text-anchor="middle">most common; check here first</text>
    <rect x="216" y="128" width="188" height="76" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.6"/><text x="310" y="150" fill="#d6a45c" font-size="10" font-weight="bold" text-anchor="middle">Node layer</text><text x="310" y="168" fill="#9aa4b2" font-size="8" text-anchor="middle">node NotReady</text><text x="310" y="184" fill="#9aa4b2" font-size="8" text-anchor="middle">kubelet dead / disk pressure</text><text x="310" y="198" fill="#9aa4b2" font-size="8" text-anchor="middle">journalctl -u kubelet</text>
    <rect x="412" y="128" width="196" height="76" rx="8" fill="#262b3a" stroke="#e05a7d" stroke-width="1.6"/><text x="510" y="150" fill="#e05a7d" font-size="10" font-weight="bold" text-anchor="middle">Control Plane layer</text><text x="510" y="168" fill="#9aa4b2" font-size="8" text-anchor="middle">api-server / etcd down</text><text x="510" y="184" fill="#9aa4b2" font-size="8" text-anchor="middle">→ whole cluster stops responding</text><text x="510" y="198" fill="#9aa4b2" font-size="8" text-anchor="middle">check the static pod manifests</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The troubleshooting funnel: <code>get</code> (what status) → <code>describe</code> (why — <b>the Events section is a goldmine</b>) → <code>logs</code> (what the program said) → <code>exec/debug</code> (go inside). But decide the layer before acting: most problems are in the <b>Pod layer</b>; only when nothing turns up do you go up to the <b>Node</b> and <b>Control Plane</b></figcaption>
</figure>

The most underrated one is **`kubectl describe`**: its **Events section** at the bottom writes out almost everything K8s "just tried to do, and where it got stuck" — why scheduling failed, the error pulling the image, a readiness probe failing again and again, being OOM-killed, it's all there. **Many people rush to the logs the moment something breaks, but the answer is often in Events, and more direct.** A few common commands:

```bash
kubectl get pods -o wide              # status, restart count, which node it landed on
kubectl describe pod <p>              # read the Events section at the bottom (most important)
kubectl logs <p> --previous           # essential for CrashLoop: logs of the "previous instance that died"
kubectl get events --sort-by=.lastTimestamp   # namespace-wide event stream ordered by time
```

`logs --previous` is the key to **CrashLoopBackOff**: the container has already crashed and restarted, so the current logs belong to the new instance and are often empty; what you want is the last few lines left by **the previous crash**.

## Reading Pod status: every status points the way

Spreading the four gates of the first diagram into a lookup table — see the status, know where to look and roughly what the root cause is:

| Status | Stuck at | Most common root cause | Check first |
|---|---|---|---|
| **Pending** | ① can't schedule onto a node | not enough resources, [[k8s-scheduling-advanced|taint without toleration]], PVC won't bind to a PV | `describe` Events (FailedScheduling) |
| **ContainerCreating** stuck | between ① and ② | CNI not configured, Volume won't mount, Secret/ConfigMap doesn't exist | `describe` Events |
| **ImagePullBackOff** | ② pulling the image | image name / tag typo, private registry missing imagePullSecret | `describe` Events (Failed to pull) |
| **CrashLoopBackOff** | ③ dies on start | program crashes on start-up, bad config, [[k8s-config-secret|missing environment variable]], probe too strict | `logs --previous` |
| **OOMKilled** | ③ memory blown | actual usage exceeded the memory limit and got killed | `describe` (Last State: OOMKilled), adjust the limit |
| **Running but 0/1 READY** | ④ readiness not passing | readiness probe keeps failing → not in [[k8s-service|Endpoints]], receives no traffic | `describe` Events, probe settings |
| **Running but unreachable** | ④ network layer | selector typo so Endpoints are empty, [[k8s-ingress-dns|DNS]] won't resolve, [[k8s-networkpolicy-cni|NetworkPolicy]] blocking | `get endpoints`, DNS test |

This table is the whole series used in reverse: **every failure is some mechanism from an earlier post "not operating".** Troubleshooting doesn't investigate anything new; it tests whether you understand those mechanisms.

## Change layers: Node and Control Plane

If every Pod on a whole node is in trouble, stop staring at Pods — the problem is at the **Node layer**. When `kubectl get nodes` shows `NotReady`, it's usually that machine's **kubelet died, disk/memory pressure (DiskPressure / MemoryPressure), or the network dropped**. Then you have to SSH in and read the kubelet's logs with `journalctl -u kubelet`, and ask the container runtime directly with `crictl`, rather than guessing through the API.

Higher still, if `kubectl` itself starts timing out and the whole cluster seems unreachable — that's the **Control Plane layer**. When the api-server or [[k8s-cluster-admin|etcd]] is in trouble, the whole cluster's ability to "take orders" is paralysed. Because they're **static pods**, you go to the control plane machine and look at `/etc/kubernetes/manifests`, at the container status and logs of those few pods. **You climb layer by layer because the higher the layer, the bigger the blast: a dead Pod affects one service; a dead control plane affects the whole cluster.**

## kubectl debug: when there isn't even a shell

A wall you often hit in practice: many images nowadays are **distroless / without a shell** for size and security, so `kubectl exec -it -- sh` fails outright and there's no way in. **`kubectl debug`** is the answer — it uses an **ephemeral container** to insert a temporary container with tools into **the same Pod**, sharing its network and process namespace, so you can curl, read files, capture packets alongside it, without touching the original container at all:

```bash
kubectl debug -it <p> --image=busybox --target=<container>   # insert a temporary container to investigate
kubectl debug node/<node> -it --image=busybox                # even a node: open a privileged container to investigate
```

No need to modify the image to cram in tools for debugging, no need to restart the Pod and destroy the scene — **this is the move to remember when investigating Production containers "trimmed down to nothing usable".**

## Reflections

### Troubleshooting skill isn't memorising commands; it's having a "lifecycle map"

I've seen too many people troubleshoot by voodoo: without reading the status carefully, they start restarting Pods, deleting and recreating, changing a pile of settings on the off chance. Effective troubleshooting means having that **lifecycle map** from the first diagram in your head — see `Pending` and you know it's the scheduling gate; see `ImagePullBackOff` and it's the image gate; see `not Ready` and you look at readiness and [[k8s-service|Endpoints]]. **A status isn't an error message; it's K8s telling you which step it couldn't get past.** Once that map is internalised, troubleshooting turns from "try things until it works" into "one glance and you know where to dig", and the efficiency gap is tenfold at least. It echoes the core claim of my [[sre-troubleshooting|SRE troubleshooting post]]: **a systematic mental model always beats a flash of inspiration in the moment.**

### The Events section is the most underrated goldmine

If I could leave only one troubleshooting tip, it'd be: **`describe` first, read the Events.** It's the "what just happened" that K8s writes for you proactively — why the scheduler couldn't place it, why the image wouldn't pull, why the probe failed, all in those few lines. My old bad habit was diving into the logs the moment something broke, but logs are the application's output and often have nothing to do with platform-level problems like "the Pod won't start". **Ask the platform first (Events), then the application (logs)** — that order has saved me countless wasted detours. The tool laid the answer out long ago; the only difference is whether you looked in the right place first.

### Only with this post does the whole series truly close the loop

Writing this, I feel it strongly: troubleshooting is the biggest part of the CKA precisely because it **isn't a standalone chapter; it's the acceptance test for everything**. You have to understand the [[k8s-intro|reconcile loop]] to know why a Pod restarts itself, understand [[k8s-scheduling-advanced|scheduling]] to read Pending, understand [[k8s-service|Service]] and [[k8s-ingress-dns|DNS]] to chase "unreachable", understand [[k8s-cluster-admin|etcd and the control plane]] to dare touch the top layer. **Troubleshooting ability is the sum of these understandings, and it can't be faked.** So I never treat "can you find problems" as a separate skill to practise — it's the thermometer of how deeply you understand the system. The whole series, from "declarative" to "troubleshooting", circles back to where it started: **the better you understand how it normally works, the better you know, when something breaks, where it isn't working.**
