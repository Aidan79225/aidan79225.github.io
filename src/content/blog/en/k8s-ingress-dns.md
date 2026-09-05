---
title: "Ingress and Cluster DNS: One Entrance In, One Name to Recognise Each Other"
date: 2026-07-17
category: tech
tags:
  - kubernetes
  - networking
series: "Kubernetes — Learning Notes"
seriesOrder: 9
comments: true
draft: false
translationOf: k8s-ingress-dns
---
[[k8s-service|The fourth post]] gave short-lived Pods a fixed address, the Service, but left two loose ends: first, "how does the outside come in through **one entrance** and get routed by URL to different services?" — the **Ingress** at the top of that exposure-types diagram; second, when services inside the cluster call each other, who actually resolves the **name** `http://web`? This post closes both: outward via **Ingress**, inward via **cluster DNS**. They're two sides of one coin — **both solve "how to find a service by name rather than by IP".**

The outward half first; the key is that Service and Ingress divide the work across different network layers:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 300" role="img" aria-label="Ingress is the L7 entrance: it reads the HTTP Host and path, sending shop.com's root to web-svc, shop.com/api to api-svc and img.shop.com to img-svc, each a ClusterIP Service inside the cluster. By contrast a LoadBalancer Service is L4: it sees only IP and port, not URLs, so each external service needs its own IP" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="ig" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="12" y="112" width="106" height="60" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="65" y="134" fill="#e6e6e6" font-size="10.5" text-anchor="middle">user</text>
    <text x="65" y="150" fill="#9aa4b2" font-size="8" text-anchor="middle">one domain</text>
    <text x="65" y="163" fill="#9aa4b2" font-size="8" text-anchor="middle">one public IP</text>
    <line x1="118" y1="142" x2="176" y2="142" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ig)"/>
    <text x="147" y="106" fill="#9aa4b2" font-size="7.5" text-anchor="middle">GET shop.com/api</text>
    <rect x="178" y="66" width="190" height="180" rx="10" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.9"/>
    <text x="273" y="90" fill="#9b6ff0" font-size="11.5" font-weight="bold" text-anchor="middle">Ingress</text>
    <text x="273" y="105" fill="#9aa4b2" font-size="8" text-anchor="middle">L7: reads the HTTP Host + path</text>
    <text x="194" y="140" fill="#e6e6e6" font-size="9" text-anchor="start">shop.com/</text>
    <text x="194" y="176" fill="#e6e6e6" font-size="9" text-anchor="start">shop.com/api</text>
    <text x="194" y="212" fill="#e6e6e6" font-size="9" text-anchor="start">img.shop.com</text>
    <text x="273" y="234" fill="#d6a45c" font-size="7.5" text-anchor="middle">terminates TLS here too (https → http)</text>
    <rect x="440" y="116" width="168" height="48" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="524" y="136" fill="#54b890" font-size="9.5" text-anchor="middle">web-svc</text>
    <text x="524" y="151" fill="#9aa4b2" font-size="7.5" text-anchor="middle">ClusterIP → web Pods</text>
    <rect x="440" y="168" width="168" height="46" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="524" y="187" fill="#54b890" font-size="9.5" text-anchor="middle">api-svc</text>
    <text x="524" y="202" fill="#9aa4b2" font-size="7.5" text-anchor="middle">ClusterIP → api Pods</text>
    <rect x="440" y="218" width="168" height="46" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="524" y="237" fill="#54b890" font-size="9.5" text-anchor="middle">img-svc</text>
    <text x="524" y="252" fill="#9aa4b2" font-size="7.5" text-anchor="middle">ClusterIP → img Pods</text>
    <line x1="368" y1="136" x2="438" y2="138" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ig)"/>
    <line x1="368" y1="172" x2="438" y2="188" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ig)"/>
    <line x1="368" y1="208" x2="438" y2="238" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ig)"/>
    <text x="310" y="288" fill="#9aa4b2" font-size="8.5" text-anchor="middle">one IP, one entrance, routed by URL to many internal Services — something an L4 Service can't do</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b>Ingress is L7</b>: it understands the HTTP <b>Host and path</b>, so one IP can hand different URLs to different Services. By contrast a <b>Service (LoadBalancer) is L4</b> — it knows only IP:port and can't see URLs, so every external service needs its own IP</figcaption>
</figure>

## Ingress: one entrance, routed by URL

Recall the LoadBalancer type of [[k8s-service|Service]]: every external service you open gets its own public IP from the cloud. Ten services means ten IPs and ten bills, and it's **L4** — it looks only at destination IP and port, **can't see the HTTP URL**, so there's no "same domain, `/api` goes here, `/img` goes there".

**Ingress fills exactly that layer.** It's the **L7 (HTTP layer)** entrance, and an Ingress rule looks like this:

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
  tls:                       # https is terminated at the Ingress layer; backends receive plain http
    - hosts: [shop.com]
      secretName: shop-tls
```

One public IP, splitting traffic by **Host + path** across a crowd of ClusterIP Services behind it, and doing **TLS termination** at this layer as a bonus (decrypt https to http before forwarding, so backend Pods don't each handle certificates). This is exactly the most common combination [[k8s-service|the fourth post]] described: "an Ingress in front + a bunch of internal ClusterIP Services".

## A pit: an Ingress is only "rules"; a Controller has to execute them

This is where most people get stuck: **you `kubectl apply` an Ingress and nothing happens.** Because the Ingress object **is only a rule table** — it needs an actually running **Ingress Controller** (commonly ingress-nginx or Traefik) to read those rules and configure its internal reverse proxy before any traffic flows.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 174" role="img" aria-label="The Ingress object is only a rule table stored in etcd; the Ingress Controller Pod keeps watching those rules and converges its own reverse-proxy configuration onto them; external traffic actually hits the Controller, usually with a LoadBalancer in front" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="ic" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="20" y="60" width="150" height="54" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4" stroke-dasharray="5 4"/>
    <text x="95" y="82" fill="#e6e6e6" font-size="10.5" text-anchor="middle">Ingress object</text>
    <text x="95" y="99" fill="#9aa4b2" font-size="8" text-anchor="middle">just a rule table (in etcd)</text>
    <line x1="170" y1="87" x2="224" y2="87" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ic)"/>
    <text x="197" y="79" fill="#9aa4b2" font-size="7.5" text-anchor="middle">watches</text>
    <rect x="226" y="52" width="168" height="70" rx="8" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.9"/>
    <text x="310" y="76" fill="#9b6ff0" font-size="11" font-weight="bold" text-anchor="middle">Ingress Controller</text>
    <text x="310" y="92" fill="#9aa4b2" font-size="8" text-anchor="middle">a Pod that's actually running</text>
    <text x="310" y="106" fill="#9aa4b2" font-size="8" text-anchor="middle">configures the reverse proxy per the rules</text>
    <line x1="394" y1="87" x2="448" y2="87" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ic)"/>
    <rect x="450" y="60" width="130" height="54" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="515" y="82" fill="#54b890" font-size="9.5" text-anchor="middle">backend Services</text>
    <text x="515" y="99" fill="#9aa4b2" font-size="8" text-anchor="middle">the various ClusterIPs</text>
    <line x1="310" y1="28" x2="310" y2="50" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ic)"/>
    <text x="310" y="20" fill="#9aa4b2" font-size="8.5" text-anchor="middle">external traffic (usually a LoadBalancer in front)</text>
    <text x="197" y="150" fill="#9aa4b2" font-size="8.5" text-anchor="middle">the reconcile loop again: the Controller converges "proxy config" onto "what the rules say"</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The Ingress object is the "desired routing rules"; the <b>Ingress Controller</b> is the Pod that actually watches the rules and converges the reverse-proxy configuration onto them. Without a Controller installed, Ingress rules are just a sheet of paper lying in etcd that nobody executes</figcaption>
</figure>

A cluster can run several kinds of Controller at once, with **IngressClass** deciding which one a given Ingress belongs to. It's the familiar pattern again: **you declare a desired state (routing rules), and a controller keeps converging reality (proxy config) onto it** — exactly the same loop as [[k8s-deployment|Deployment]] and [[k8s-service|Endpoints]], only this time what converges is nginx's config file.

## Cluster DNS: how services recognise each other by "name"

Now the inward half. [[k8s-service|The fourth post]] said services call each other by names like `http://web`, but **who translates the name into a ClusterIP?** The answer is the cluster's built-in DNS — **CoreDNS** (running as a Deployment in `kube-system`, exposed through a Service). When each Pod is created, its `/etc/resolv.conf` is pointed at CoreDNS, so every DNS query from inside a Pod goes there.

Every Service automatically gets a fixed DNS name, following `<service>.<namespace>.svc.cluster.local`:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 250" role="img" aria-label="The Service DNS name web.default.svc.cluster.local broken down: web is the Service name, default the namespace, svc marks it as a Service, cluster.local is the cluster domain. Flow below: a Pod queries the short name web, resolv.conf completes it with the search domain, CoreDNS is asked, and the ClusterIP comes back" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
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
    <text x="77" y="82" fill="#9aa4b2" font-size="8.5" text-anchor="middle">Service name</text>
    <text x="189" y="82" fill="#9aa4b2" font-size="8.5" text-anchor="middle">namespace</text>
    <text x="293" y="82" fill="#9aa4b2" font-size="8.5" text-anchor="middle">it's a Service</text>
    <text x="419" y="82" fill="#9aa4b2" font-size="8.5" text-anchor="middle">cluster domain</text>
    <rect x="24" y="150" width="130" height="58" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="89" y="173" fill="#e6e6e6" font-size="10" text-anchor="middle">Pod asks for "web"</text>
    <text x="89" y="190" fill="#9aa4b2" font-size="8" text-anchor="middle">short name, same namespace</text>
    <line x1="154" y1="179" x2="214" y2="179" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#dn)"/>
    <text x="184" y="171" fill="#9aa4b2" font-size="7" text-anchor="middle">complete it</text>
    <rect x="216" y="150" width="164" height="58" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="298" y="173" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">CoreDNS</text>
    <text x="298" y="190" fill="#9aa4b2" font-size="8" text-anchor="middle">the DNS in kube-system</text>
    <line x1="380" y1="179" x2="440" y2="179" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#dn)"/>
    <rect x="442" y="150" width="140" height="58" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="512" y="173" fill="#54b890" font-size="10" text-anchor="middle">ClusterIP</text>
    <text x="512" y="190" fill="#9aa4b2" font-size="8" text-anchor="middle">10.96.0.10</text>
    <text x="300" y="232" fill="#9aa4b2" font-size="8.5" text-anchor="middle">across namespaces write web.other-ns; the short name only works within the same namespace</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Each of the four parts of a Service's DNS name means something. Within the same namespace a Pod can just use the short name <code>web</code> — the search domain in <code>resolv.conf</code> completes it to the full name and CoreDNS turns it into the ClusterIP; only across namespaces do you need to write <code>web.other-ns</code></figcaption>
</figure>

In practice you'll almost only use short names: `web` within the namespace, `web.payments` across namespaces — that trailing `.svc.cluster.local` is filled in automatically by the search domain. One exception worth remembering: a **headless Service** (`clusterIP: None`) doesn't return a single virtual IP; it returns **the IP of every Pod**, and gives each Pod its own DNS name (`pod-0.web.default.svc...`) — needed only by stateful services like a [[k8s-storage|StatefulSet]] that have to "address one specific member"; ordinary stateless services use a normal Service.

## Reflections

### Separate L4 from L7, and "which one" stops being a dilemma

When I started, LoadBalancer and Ingress were easy to confuse — both look like "external". The watershed is actually crisp: **does it understand HTTP.** A Service stops at L4, knows only IP:port, and suits "I just need this port opened up" (databases, gRPC, non-HTTP things); Ingress stands at L7, reads Host and path, and suits "a pile of HTTP services under one domain, TLS collected at one entrance, routed by URL". Once that line was clear, my default became: **external HTTP always goes through Ingress, one IP for everything; only non-HTTP, or things needing their own IP, get a separate LoadBalancer.** Saves IPs, saves bills, and certificates are managed in one place.

### "The rules" and "the thing that executes the rules" are two different things — this idea saves a lot of debugging

An Ingress applied with no effect is the most common newbie ghost story, and behind it is a more general truth: **many objects in K8s are only "desired state"; something has to happen only if a controller is running.** Ingress needs an Ingress Controller, NetworkPolicy needs CNI support, a CRD needs its operator. I've built a habit: when a resource "applied but nothing moved", my first reaction isn't to suspect a typo but to ask — **"is the controller that executes this rule actually running?"** That question often hits the mark directly. Rules never move on their own; what moves is always the loop watching them.

### Service discovery is K8s's most underrated free gift

Coming from the era of self-built services, I have scars from "service discovery" — Consul, Eureka, hand-assembled etcd; just keeping "who is where" correct was exhausting. K8s made it **built in, zero config**: create a Service and it automatically has a DNS name, CoreDNS resolves it automatically, and the name stays the same when Pods change IP. It's the underlying support for [[k8s-service|the fourth post]]'s "depend on names, not locations" — **precisely because this DNS exists, "recognising each other by name" went from a wish to the default behaviour.** I now deliberately remind teams not to build their own service-discovery wheel: K8s has handed you the hardest piece for free; treasure it.
