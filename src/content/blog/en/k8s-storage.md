---
title: "K8s Storage: Volumes, PV/PVC and StatefulSets"
date: 2026-07-17
category: tech
description: "Pods are short-lived and disposable — but some things must not vanish with them, and that's data. A container's filesystem is ephemeral: reschedule the pod and whatever was written inside is gone. So K8s has to decouple \"storage\" from \"pod lifecycle\". This post covers the three layers of storage: Volumes (mount a disk into a pod), PV/PVC (separate storage supply from demand, plus StorageClass for dynamic provisioning), and StatefulSets (so each stateful pod recognises its own disk) — which is why Kafka and Redis on k8s always run as StatefulSets."
tags:
  - kubernetes
  - storage
series: "Kubernetes — Learning Notes"
seriesOrder: 6
comments: true
draft: false
translationOf: k8s-storage
---
Pods are short-lived and disposable — [[k8s-deployment|self-healing]] swaps them out at any moment. But some things must **not** vanish when a pod dies: **data**. And a container's filesystem is inherently **ephemeral**: reschedule the pod or restart the container and whatever was written inside is gone. So K8s has to **decouple** "storage" from "the pod's lifecycle". This post covers its three storage layers: Volume, PV/PVC, StatefulSet.

## Volume: mount a disk into the pod first

The most basic layer is the **Volume** — a piece of storage mounted at some path inside the pod. There are several types: `emptyDir` (scratch space for the pod's lifetime, gone when the pod goes; good for sharing temp files between containers), `hostPath` (a path on the host; rarely used, ties you to the node), and the one that really matters — **persistent storage that "outlives the pod", mounted through a PVC**. The first two aren't persistent; for data to survive the pod's death, read on to PV/PVC.

## PV / PVC: separate "supply" from "demand"

The central design of K8s storage is splitting "**who needs storage**" and "**where the storage actually is**" into two separate things:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 208" role="img" aria-label="PV and PVC separate storage demand from supply. On the left, a Pod wants to mount a disk and expresses the need through a PVC: I want 10Gi, ReadWriteOnce; the app developer only asks for this. K8s binds the PVC to a PV, the actual 10Gi of storage, whose backend might be AWS EBS, NFS or Ceph. Above, a StorageClass handles dynamic provisioning: when a PVC is submitted a PV is created automatically, with no administrator pre-creating it. The principle below: supply and demand are separated; the app only says how big and which access mode, never what hardware is underneath." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="sv" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">PV / PVC: separating "demand" from "supply"</text>
    <rect x="300" y="30" width="262" height="28" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.3"/><text x="431" y="48" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">StorageClass: dynamic provisioning — a PVC arrives, a PV is created</text>
    <rect x="16" y="86" width="88" height="46" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="60" y="107" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Pod</text><text x="60" y="120" fill="#9aa4b2" font-size="7.2" text-anchor="middle">wants a disk</text>
    <line x1="104" y1="109" x2="124" y2="109" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#sv)"/>
    <rect x="126" y="82" width="156" height="54" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="204" y="102" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">PVC (demand)</text><text x="204" y="117" fill="#e6e6e6" font-size="8" text-anchor="middle">"I want 10Gi · RWO"</text><text x="204" y="130" fill="#9aa4b2" font-size="7" text-anchor="middle">all the app developer asks for</text>
    <line x1="282" y1="103" x2="356" y2="103" stroke="#54b890" stroke-width="1.3" marker-end="url(#sv)"/><line x1="356" y1="115" x2="282" y2="115" stroke="#54b890" stroke-width="1.3" marker-end="url(#sv)"/><text x="319" y="98" fill="#54b890" font-size="7.4" text-anchor="middle">bound</text>
    <rect x="358" y="82" width="156" height="54" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.5"/><text x="436" y="102" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">PV (supply)</text><text x="436" y="117" fill="#e6e6e6" font-size="8" text-anchor="middle">the actual 10Gi of storage</text><text x="436" y="130" fill="#9aa4b2" font-size="7" text-anchor="middle">backend: EBS / NFS / Ceph…</text>
    <line x1="431" y1="58" x2="436" y2="80" stroke="#d6a45c" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#sv)"/>
    <text x="290" y="164" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">Supply / demand separation: the app says "how big, which access mode", never what hardware</text>
    <text x="290" y="184" fill="#9aa4b2" font-size="8" text-anchor="middle">access modes: RWO (one node) · ROX (many nodes, read-only) · RWX (many nodes read-write; needs NFS or similar)</text>
    <text x="290" y="199" fill="#9aa4b2" font-size="8" text-anchor="middle">reclaim policy: after the PVC is deleted, Retain the PV or Delete it (backend included)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The <b style="color:#4f6df5">PVC (PersistentVolumeClaim)</b> is the "demand" — the app only says "I want a 10Gi ReadWriteOnce disk"; the <b style="color:#54b890">PV (PersistentVolume)</b> is the "supply" — the actual storage, whether EBS or NFS underneath. K8s <b>binds</b> the two. And the <b style="color:#d6a45c">StorageClass</b> automates it: when a PVC is submitted, a new PV is <b>dynamically provisioned</b> by the provisioner, with no administrator pre-creating anything. This "demand/supply separation" is a beautiful abstraction — whoever writes the app never needs to know which cloud's which kind of disk sits underneath</figcaption>
</figure>

Three details the CKA loves and practice needs are in the diagram: **access modes** decide "how many nodes can mount at once, and can they write" — most common are `RWO` (ReadWriteOnce, read-write from a single node, the nature of ordinary block storage) and `RWX` (ReadWriteMany, read-write from many nodes at once, which needs file storage like NFS); **reclaim policy** decides the fate of the PV after the PVC is deleted — `Retain` (keep the data for you to handle manually) or `Delete` (delete the underlying storage too). Get these two wrong and at best you leak resources, at worst your data is deleted automatically.

## StatefulSet: so each stateful pod recognises its own disk

With persistent storage in place, one problem remains: **for a group of stateful pods, how do you make sure each one mounts back onto "its own" disk?** A [[k8s-deployment|Deployment]] can't — its pods are disposable replicas with random names. The answer is the **StatefulSet**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 208" role="img" aria-label="StatefulSet versus Deployment from a storage angle. Left, Deployment, stateless: pod names are random like app-7f9 and app-2k1, disposable, a replacement gets a new name, not bound to any particular disk. Right, StatefulSet, stateful: pods have stable identities pod-0, pod-1, pod-2, each bound to its own PVC and PV via volumeClaimTemplates, remounting its own disk after a restart or reschedule, with ordered deployment and scaling. Below: stateful things like Kafka, Redis and databases use StatefulSets; stateless things use Deployments." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ss" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="30" x2="290" y2="168" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#9aa4b2" font-size="9.4" text-anchor="middle" font-weight="bold">Deployment (stateless)</text>
    <rect x="40" y="40" width="200" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="140" y="57" fill="#e6e6e6" font-size="8" text-anchor="middle">app-7f9c2 · app-2k1x8 (random names)</text>
    <text x="146" y="88" fill="#9aa4b2" font-size="8" text-anchor="middle">pods are disposable; a replacement → new name</text>
    <text x="146" y="106" fill="#e0733a" font-size="8" text-anchor="middle" font-weight="bold">not bound to any particular disk</text>
    <text x="434" y="26" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">StatefulSet (stateful)</text>
    <rect x="316" y="40" width="72" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="352" y="56" fill="#e6e6e6" font-size="7.8" text-anchor="middle">pod-0</text>
    <rect x="404" y="40" width="72" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="440" y="56" fill="#e6e6e6" font-size="7.8" text-anchor="middle">pod-1</text>
    <rect x="492" y="40" width="72" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="528" y="56" fill="#e6e6e6" font-size="7.8" text-anchor="middle">pod-2</text>
    <line x1="352" y1="64" x2="352" y2="78" stroke="#9aa4b2" stroke-width="1" marker-end="url(#ss)"/><line x1="440" y1="64" x2="440" y2="78" stroke="#9aa4b2" stroke-width="1" marker-end="url(#ss)"/><line x1="528" y1="64" x2="528" y2="78" stroke="#9aa4b2" stroke-width="1" marker-end="url(#ss)"/>
    <rect x="316" y="80" width="72" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="352" y="95" fill="#4f6df5" font-size="7.4" text-anchor="middle">PVC-0</text>
    <rect x="404" y="80" width="72" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="440" y="95" fill="#4f6df5" font-size="7.4" text-anchor="middle">PVC-1</text>
    <rect x="492" y="80" width="72" height="22" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.1"/><text x="528" y="95" fill="#4f6df5" font-size="7.4" text-anchor="middle">PVC-2</text>
    <text x="440" y="122" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">each pod owns its disk (volumeClaimTemplates)</text>
    <text x="440" y="138" fill="#9aa4b2" font-size="7.8" text-anchor="middle">stable identity + remounts its own disk + ordered scaling</text>
    <rect x="60" y="176" width="460" height="26" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/><text x="290" y="193" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">stateful (Kafka / Redis / DB) → StatefulSet; stateless → Deployment</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">A <b style="color:#54b890">StatefulSet</b> gives each pod three things a Deployment doesn't: a <b>stable identity</b> (<code>pod-0</code>/<code>pod-1</code>, name unchanged across restarts), <b>its own bound storage</b> (via <code>volumeClaimTemplates</code>, each pod automatically gets a dedicated PVC and remounts the same disk after a restart or reschedule), and <b>ordered deployment and scaling</b> (0→1→2). That's exactly why stateful things like <a href="/blog/infra-kafka/">Kafka</a> and <a href="/blog/infra-redis/">Redis</a> always run as StatefulSet + PV on k8s — their data is tied to a specific identity and disk, and can't be swapped around like a stateless pod</figcaption>
</figure>

## In YAML: one PVC, one StatefulSet

First the "demand" half — a PVC is everything the app developer has to write, and it says nothing about what kind of disk sits underneath, only how big, which access mode, and which StorageClass:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata: { name: data }
spec:
  accessModes: [ "ReadWriteOnce" ]     # RWO: read-write from a single node
  storageClassName: fast-ssd           # let this class dynamically provision a PV
  resources:
    requests: { storage: 10Gi }        # I want 10Gi
```

A stateful service doesn't hand-write PVCs, though; it uses the **StatefulSet's `volumeClaimTemplates`** — a "PVC mould" that stamps out a dedicated disk for **each** Pod (`pod-0`, `pod-1`…), remounted after a reschedule:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata: { name: db }
spec:
  serviceName: db                      # pair with a headless Service so each Pod gets a stable DNS name
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
  volumeClaimTemplates:                # ← the key: each Pod automatically gets its own PVC
    - metadata: { name: data }
      spec:
        accessModes: [ "ReadWriteOnce" ]
        storageClassName: fast-ssd
        resources: { requests: { storage: 10Gi } }
```

Two details worth remembering: the PVCs produced by `volumeClaimTemplates` are named `data-db-0`, `data-db-1`… — **the name is tied to the Pod's ordinal**, which is how "`pod-0` always remounts its own disk" is implemented; and **these PVCs are not deleted by default when you scale down** — K8s would rather keep the data and wait for your manual confirmation than presume to delete a stateful disk. That's the exact opposite default from a Deployment's "the Pod leaves, nothing remains", and exactly the caution "stateful" deserves.

## Reflections

### The "supply/demand separation" of PV/PVC is an abstraction I admire

The first time I really understood PV/PVC, I thought the design was beautiful. It takes something tangled together and cuts it cleanly in two: **whoever writes the app only needs to say "I want a 10Gi read-write disk" (the PVC), and never needs to know whether underneath it's AWS EBS, GCP PD, or an NFS box in the machine room.** Those details go to the administrator's PV / StorageClass. This "declare the need, hide the implementation" separation is really the essence of a good interface — like calling an Uber and saying only "from A to B", without caring what car the driver has or which route they take. Whenever I design a system boundary now, I think of the PVC: **let the consumer speak in "the language of needs" rather than forcing them to understand the supply side's details** — the most effective move I know for reducing coupling.

### StatefulSet lets "short-lived pods" safely own "long-lived data"

K8s first gives the impression that "everything is disposable, everything is stateless" — a pod dies, replace it and move on. But the real world has data, and data **can't** be disposable. The StatefulSet cleverly reconciles the contradiction: **the pod itself can still die and be replaced, but its "identity" and "its disk" are stable** — the replacement pod-0 remounts the original pod-0's PVC. That made something click for me: "disposable" and "stateful" aren't a black-and-white opposition. You can make **the executing shell disposable** (the pod) while making **the data it guards persistent** (the PV) — separating "what can die" from "what can't" with a layer of abstraction, and treating each the way it deserves. It echoes the spine of the whole [[infra-kafka|infra series]]: what's hard about stateful things is that disk, and the StatefulSet is k8s's standard answer to it.

### Storage is the key step in K8s growing from "running containers" to "running real systems"

Early on, many people said "don't put stateful things on K8s", because storage wasn't mature back then. The arrival of the whole PV/PVC/StorageClass/StatefulSet set is exactly the watershed where K8s crossed from "only good for stateless web services" to "able to run databases, message queues, real systems". My takeaway: **how mature a platform is often shows in how it handles "state", the hardest bone of all.** Anyone can schedule stateless things; the real difficulty is always "how does the data follow along safely". K8s took several releases and several abstractions to make storage solid — a reminder that when evaluating any platform that "claims to run anything", the first place to poke is whether its storage and state management are actually hard enough.
