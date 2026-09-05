---
title: "Cluster Administration: kubeadm, etcd Backups, Upgrades"
date: 2026-07-18
category: tech
tags:
  - kubernetes
  - operations
series: "Kubernetes — Learning Notes"
seriesOrder: 12
comments: true
draft: false
translationOf: k8s-cluster-admin
---
The previous eleven posts all stood in the position of "**using** the cluster". This one moves to "**building and keeping** the cluster" — the hardest ops work in the Cluster Architecture domain that's 25% of the CKA. Three things run through an administrator's whole career: **how to turn a pile of machines into a cluster (kubeadm), how to bring it back when disaster strikes (etcd backups), and how to upgrade without downtime (upgrade).** The second is the one question in the whole CKA you should practise until it's reflex, so first let me be clear about why it matters so much.

## kubeadm: a pile of machines into a cluster in one step

Bringing up a control plane by hand (signing a heap of certificates, configuring the api-server, wiring in etcd) is a nightmare. **kubeadm** turns it into two commands:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 236" role="img" aria-label="The kubeadm flow: run kubeadm init on the first machine; it brings up the control plane components api-server, scheduler, controller-manager and etcd as static pods and prints a join token; other worker and control plane nodes join with kubeadm join carrying the token. All cluster state lives in etcd" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="ka" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="14" y="30" width="266" height="176" rx="10" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/>
    <text x="147" y="50" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">Control Plane node · kubeadm init</text>
    <rect x="30" y="62" width="112" height="30" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/><text x="86" y="81" fill="#e6e6e6" font-size="8.8" text-anchor="middle">api-server</text>
    <rect x="152" y="62" width="112" height="30" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/><text x="208" y="81" fill="#e6e6e6" font-size="8.8" text-anchor="middle">scheduler</text>
    <rect x="30" y="98" width="112" height="30" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2"/><text x="86" y="117" fill="#e6e6e6" font-size="8.5" text-anchor="middle">controller-mgr</text>
    <path d="M168 100 v30 a40 6 0 0 0 80 0 v-30" fill="#1f2330" stroke="#d6a45c" stroke-width="1.5"/><ellipse cx="208" cy="100" rx="40" ry="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.5"/><text x="208" y="122" fill="#d6a45c" font-size="9" text-anchor="middle">etcd</text>
    <text x="147" y="152" fill="#9aa4b2" font-size="8" text-anchor="middle">all static pods: kubelet reads /etc/kubernetes/manifests</text>
    <text x="147" y="170" fill="#9aa4b2" font-size="8" text-anchor="middle">brings them up and keeps them running</text>
    <rect x="34" y="180" width="226" height="18" rx="4" fill="#262b3a" stroke="#54b890" stroke-width="1.1" stroke-dasharray="4 3"/><text x="147" y="193" fill="#54b890" font-size="8" text-anchor="middle">prints a join token + command</text>
    <line x1="280" y1="188" x2="322" y2="188" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ka)"/>
    <text x="360" y="176" fill="#9aa4b2" font-size="8" text-anchor="middle">kubeadm join &lt;token&gt;</text>
    <rect x="330" y="42" width="272" height="40" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="466" y="60" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Worker node</text><text x="466" y="74" fill="#9aa4b2" font-size="7.5" text-anchor="middle">runs only the kubelet + your Pods</text>
    <rect x="330" y="90" width="272" height="40" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/><text x="466" y="108" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Worker node</text><text x="466" y="122" fill="#9aa4b2" font-size="7.5" text-anchor="middle">add as many as you need</text>
    <rect x="330" y="192" width="272" height="34" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4" stroke-dasharray="5 4"/><text x="466" y="213" fill="#9aa4b2" font-size="8.5" text-anchor="middle">add more CP nodes (join) → HA control plane</text>
    <line x1="322" y1="196" x2="322" y2="62" stroke="#9aa4b2" stroke-width="1" stroke-dasharray="2 3"/>
    <line x1="322" y1="62" x2="328" y2="62" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ka)"/>
    <line x1="322" y1="110" x2="328" y2="110" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ka)"/>
    <line x1="322" y1="208" x2="328" y2="208" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ka)"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><code>kubeadm init</code> brings the control plane components (etcd included) up as <b>static pods</b> on the first machine and prints a join token; other machines join with <code>kubeadm join</code> carrying the token, and workers run only the kubelet and your Pods. The state of the whole cluster lives entirely in that one <b>etcd</b></figcaption>
</figure>

The control plane components all run as **static pods** — the kubelet watches the `/etc/kubernetes/manifests` directory, brings up the manifests inside and keeps them running. That's also why, when debugging the control plane, you go to that machine and look at those files and those pods, rather than reasoning with ordinary Deployment logic.

## etcd: the cluster's single source of truth, and its single weak spot

Look at etcd in that diagram — **the state of every object in your cluster (Deployment, Service, Secret, RBAC…) lives in exactly one place: etcd.** [[k8s-intro|The first post]] said the reconcile loop keeps pulling reality towards the "desired state", and that desired state lives in etcd. It keeps multiple replicas consistent with [[sre-consensus|Raft consensus]], so an HA deployment needs an **odd number** of members (3 tolerates 1 down, 5 tolerates 2) to form a majority and avoid split brain.

But no number of replicas protects against "accidental delete", "broken certificates", or "the whole etcd datastore corrupted". So the administrator's first commandment is: **regularly snapshot etcd to somewhere outside the cluster.** It's your only restore point — without it, a dead cluster means rebuilding from zero.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 214" role="img" aria-label="etcd backup and restore: in normal times, etcdctl snapshot save writes etcd's state to a snapshot.db file kept outside the cluster or off-site; when disaster strikes, etcdctl snapshot restore turns snapshot.db into a new data directory, etcd is pointed at it and restarted, and the cluster returns to the state at the moment of the snapshot" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="et" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <path d="M40 44 v34 a34 7 0 0 0 68 0 v-34" fill="#262b3a" stroke="#d6a45c" stroke-width="1.7"/><ellipse cx="74" cy="44" rx="34" ry="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.7"/><text x="74" y="66" fill="#e6e6e6" font-size="9.5" text-anchor="middle">etcd</text><text x="74" y="98" fill="#9aa4b2" font-size="7.5" text-anchor="middle">source of truth</text>
    <line x1="112" y1="62" x2="196" y2="62" stroke="#54b890" stroke-width="1.5" marker-end="url(#et)"/>
    <text x="154" y="54" fill="#54b890" font-size="8" text-anchor="middle">snapshot save</text>
    <rect x="198" y="42" width="150" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/><text x="273" y="62" fill="#e6e6e6" font-size="9.5" text-anchor="middle">snapshot.db</text><text x="273" y="77" fill="#9aa4b2" font-size="7.5" text-anchor="middle">kept outside the cluster / off-site</text>
    <line x1="273" y1="86" x2="273" y2="128" stroke="#e05a7d" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#et)"/>
    <text x="273" y="112" fill="#e05a7d" font-size="8" text-anchor="middle">disaster: etcd destroyed / bad delete</text>
    <rect x="198" y="130" width="150" height="42" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="273" y="156" fill="#e6e6e6" font-size="9" text-anchor="middle">snapshot.db (the copy in hand)</text>
    <line x1="348" y1="151" x2="404" y2="151" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#et)"/>
    <text x="376" y="143" fill="#9aa4b2" font-size="7.5" text-anchor="middle">restore</text>
    <rect x="406" y="130" width="118" height="42" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="465" y="150" fill="#e6e6e6" font-size="8.6" text-anchor="middle">new data directory</text><text x="465" y="164" fill="#9aa4b2" font-size="7.5" text-anchor="middle">produced by restore</text>
    <line x1="524" y1="151" x2="556" y2="151" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#et)"/>
    <path d="M560 132 v30 a24 5 0 0 0 48 0 v-30" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><ellipse cx="584" cy="132" rx="24" ry="5" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="584" y="153" fill="#54b890" font-size="8.5" text-anchor="middle">etcd</text>
    <text x="430" y="196" fill="#9aa4b2" font-size="8.5" text-anchor="middle">point etcd at the new directory, restart → cluster is back to "the moment of the snapshot"</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Backup is one line, <code>etcdctl snapshot save</code>, writing the state to <code>snapshot.db</code> kept outside the cluster. In a disaster, <code>snapshot restore</code> turns it into a new data directory; point etcd at it and restart, and the cluster is back to the moment of the snapshot. <b>Without that snapshot, a destroyed etcd means rebuilding from zero</b></figcaption>
</figure>

The skeleton of the commands (in reality you pass the endpoints and the three certificate flags `--cacert/--cert/--key`):

```bash
# normal times: back up regularly, move snapshot.db outside the cluster
ETCDCTL_API=3 etcdctl snapshot save snapshot.db
# after disaster: restore into a new directory, then point the etcd static pod manifest at it and restart
ETCDCTL_API=3 etcdctl snapshot restore snapshot.db --data-dir /var/lib/etcd-restore
```

**"Is there a usable etcd backup" practically defines a cluster's disaster-recovery capability.** Don't wait for an incident to discover the snapshot never actually succeeded.

## Upgrades: a relay race, one node at a time

Upgrading the cluster's K8s version has hard rules: **only one minor version at a time** (1.29 → 1.30, never 1.29 → 1.31), and **the control plane before the workers**. The whole process is a relay race of "touch one machine at a time, the rest keep serving":

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 224" role="img" aria-label="Cluster upgrade: the rules are one minor version at a time and control plane before workers. Node order: control plane first, then workers, one at a time. Each node goes through a four-step cycle: cordon plus drain to evict its Pods, upgrade kubeadm and run upgrade, upgrade kubelet and kubectl, uncordon so it accepts Pods again" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="up" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="14" y="26" width="592" height="26" rx="6" fill="#1f2330" stroke="#e0733a" stroke-width="1.3"/>
    <text x="310" y="43" fill="#e0733a" font-size="9" text-anchor="middle">iron rules: one minor at a time (1.29 → 1.30) · control plane first, workers after</text>
    <rect x="40" y="66" width="150" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/><text x="115" y="84" fill="#4f6df5" font-size="9.5" text-anchor="middle">① Control Plane</text><text x="115" y="98" fill="#9aa4b2" font-size="7.5" text-anchor="middle">kubeadm upgrade apply</text>
    <line x1="190" y1="86" x2="222" y2="86" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#up)"/>
    <rect x="224" y="66" width="150" height="40" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="299" y="84" fill="#54b890" font-size="9.5" text-anchor="middle">② Worker</text><text x="299" y="98" fill="#9aa4b2" font-size="7.5" text-anchor="middle">kubeadm upgrade node</text>
    <line x1="374" y1="86" x2="406" y2="86" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#up)"/>
    <rect x="408" y="66" width="150" height="40" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="483" y="84" fill="#54b890" font-size="9.5" text-anchor="middle">③ Worker …</text><text x="483" y="98" fill="#9aa4b2" font-size="7.5" text-anchor="middle">one after another</text>
    <text x="310" y="130" fill="#9aa4b2" font-size="8.5" text-anchor="middle">every node runs the same four steps:</text>
    <rect x="20" y="142" width="132" height="44" rx="7" fill="#1f2330" stroke="#d6a45c" stroke-width="1.4"/><text x="86" y="162" fill="#d6a45c" font-size="9" text-anchor="middle">cordon + drain</text><text x="86" y="176" fill="#9aa4b2" font-size="7.5" text-anchor="middle">evacuate the Pods</text>
    <line x1="152" y1="164" x2="180" y2="164" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#up)"/>
    <rect x="182" y="142" width="132" height="44" rx="7" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.3"/><text x="248" y="162" fill="#e6e6e6" font-size="9" text-anchor="middle">upgrade kubeadm</text><text x="248" y="176" fill="#9aa4b2" font-size="7.5" text-anchor="middle">upgrade apply/node</text>
    <line x1="314" y1="164" x2="342" y2="164" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#up)"/>
    <rect x="344" y="142" width="132" height="44" rx="7" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.3"/><text x="410" y="162" fill="#e6e6e6" font-size="9" text-anchor="middle">upgrade kubelet</text><text x="410" y="176" fill="#9aa4b2" font-size="7.5" text-anchor="middle">+ kubectl, restart</text>
    <line x1="476" y1="164" x2="504" y2="164" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#up)"/>
    <rect x="506" y="142" width="98" height="44" rx="7" fill="#1f2330" stroke="#54b890" stroke-width="1.4"/><text x="555" y="162" fill="#54b890" font-size="9" text-anchor="middle">uncordon</text><text x="555" y="176" fill="#9aa4b2" font-size="7.5" text-anchor="middle">accepts Pods again</text>
    <text x="310" y="206" fill="#9aa4b2" font-size="8.5" text-anchor="middle">only one machine touched at a time, the rest carry traffic as usual — that's how "upgrade without downtime" works</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">An upgrade is a relay race: <b>control plane first, workers after</b>, one machine at a time. Every machine runs the same four steps — <code>cordon + drain</code> to evacuate Pods, upgrade kubeadm and run <code>upgrade</code>, upgrade the kubelet, <code>uncordon</code> so it accepts Pods again. The other nodes carry traffic as usual, so overall there's no interruption</figcaption>
</figure>

The first control plane node uses `kubeadm upgrade apply` to set the version the whole cluster is moving to; the remaining control plane and worker nodes follow with `kubeadm upgrade node`. `drain` **respects a [[k8s-deployment|Deployment]]'s multiple replicas**: it evicts Pods from this machine, the ReplicaSet immediately replaces them elsewhere, so as long as your service has several copies and a PodDisruptionBudget, the rolling upgrade keeps serving throughout.

## Reflections

### etcd backup is the kind of thing nobody remembers until the day nothing works without it

My respect for backups was fed by real fear. All of the cluster's state condensed into one place, etcd, is elegant design, but it also means **it's the single point of death for the whole cluster** — replicas withstand a machine dying, but not one bad operation deleting critical objects, or certificates expiring so etcd won't start. In that moment, whether you have a **verified, restorable** snapshot in hand is the difference between "ten minutes to recover" and "an all-nighter rebuilding the whole cluster". So I treat etcd backups as the reliability basics [[sre-automation-release|the SRE posts]] describe: **not just scheduling backups, but actually rehearsing restores regularly** — a backup you've never restored from is only a sense of safety you think you have.

### The "one node at a time" upgrade philosophy is really the same thing as a rolling update

Upgrading a cluster looks scary, but taken apart it's the scaled-up version of the same idea as [[k8s-deployment|a Deployment's rolling update]]: **only ever let a small part be in flux, keep the rest serving, and be able to back out if it breaks.** At the application layer it's "swap a few Pods at a time"; at the cluster layer it's "upgrade one node at a time"; `drain` is to a node what a readiness probe is to a Pod — **move the traffic off cleanly, then act**. Once I saw that symmetry, my fear of "touching Production" shrank a lot: the method is the same, only the unit changed from Pod to node. **Cutting a big move into a chain of reversible small steps is the most consistent, most worth-internalising principle I've seen across the whole K8s world.**

### An administrator's value lies in the invisible everyday preparation

Writing this post made me surer: being able to `kubectl apply` is just the entry ticket; the real ability to carry a cluster on your shoulders hides in these silent preparations — **did the backup succeed? Has the restore been rehearsed? Has the upgrade path been tested? When do the certificates expire?** These have no presence at all when things are smooth, and are everything when things break. It matches my understanding of SRE exactly: **reliability isn't heroics improvised on the day of the incident; it's the discipline before the incident, day after day, with nobody clapping.** The next post in the series covers [[k8s-troubleshooting|troubleshooting]] — when all this preparation still didn't stop the problem, how to dig it out layer by layer.
