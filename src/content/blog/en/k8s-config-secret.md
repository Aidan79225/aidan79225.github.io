---
title: "ConfigMap and Secret: Pulling Configuration and Secrets Out of the Image"
date: 2026-07-17
category: tech
description: "Real apps need configuration — DB addresses, feature flags, passwords, API keys — and the iron rule is that none of it belongs baked into the image. K8s externalises configuration with ConfigMaps (non-secret) and Secrets (secret) and injects it at runtime, so one immutable image can run across Development, Staging and Production. This post covers why config and image are separated, ConfigMap vs Secret, the two injection methods (environment variables vs mounted files), and the most misunderstood trap of all: a Secret is only base64 by default, not encryption."
tags:
  - kubernetes
  - concept
series: "Kubernetes — Learning Notes"
seriesOrder: 5
comments: true
draft: false
translationOf: k8s-config-secret
---
Over the previous posts you've learned to [[k8s-deployment|deploy]] an app and [[k8s-service|expose it as a service]]. But a real app is still missing one piece: **configuration** — database addresses, feature flags, plus passwords, API keys, certificates. There's an iron rule for these: **they must not be hard-coded into the image or the code**. K8s externalises configuration with **ConfigMaps** (non-secret settings) and **Secrets** (secrets), injecting them into the Pod only at runtime. This post covers why, how the two differ, and how injection works.

## Why: one image has to run in every environment

The core reason to separate config from image is one sentence: **the image must be "immutable and reusable across environments".** The same `my-app:1.0` should run untouched in Development, Staging and Production — the only difference being **the configuration injected**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 208" role="img" aria-label="One image runs in every environment. On the left, one immutable image my-app 1.0. In the middle, three sets of config, ConfigMap plus Secret, for Development, Staging and Production. The same image paired with each environment's own config yields Pods for all three environments. The principle below: config lives in the environment or outside, never baked into the image; only then can one image be reused across environments. This is the 12-factor config principle." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="cs" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">One image, every environment</text>
    <rect x="14" y="74" width="104" height="60" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="66" y="96" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">image</text><text x="66" y="110" fill="#e6e6e6" font-size="8" text-anchor="middle">my-app:1.0</text><text x="66" y="123" fill="#9aa4b2" font-size="7.4" text-anchor="middle">(immutable)</text>
    <rect x="196" y="38" width="176" height="34" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/><text x="284" y="52" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">Development</text><text x="284" y="65" fill="#9aa4b2" font-size="7.2" text-anchor="middle">ConfigMap + Secret</text>
    <rect x="196" y="86" width="176" height="34" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/><text x="284" y="100" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">Staging</text><text x="284" y="113" fill="#9aa4b2" font-size="7.2" text-anchor="middle">ConfigMap + Secret</text>
    <rect x="196" y="134" width="176" height="34" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/><text x="284" y="148" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">Production</text><text x="284" y="161" fill="#9aa4b2" font-size="7.2" text-anchor="middle">ConfigMap + Secret</text>
    <line x1="118" y1="98" x2="194" y2="56" stroke="#4f6df5" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#cs)"/><line x1="118" y1="104" x2="194" y2="103" stroke="#4f6df5" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#cs)"/><line x1="118" y1="110" x2="194" y2="151" stroke="#4f6df5" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#cs)"/>
    <line x1="372" y1="55" x2="410" y2="55" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cs)"/><line x1="372" y1="103" x2="410" y2="103" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cs)"/><line x1="372" y1="151" x2="410" y2="151" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#cs)"/>
    <rect x="412" y="40" width="150" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="487" y="59" fill="#e6e6e6" font-size="8.2" text-anchor="middle">Pod (dev)</text>
    <rect x="412" y="88" width="150" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="487" y="107" fill="#e6e6e6" font-size="8.2" text-anchor="middle">Pod (staging)</text>
    <rect x="412" y="136" width="150" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="487" y="155" fill="#e6e6e6" font-size="8.2" text-anchor="middle">Pod (production)</text>
    <text x="290" y="192" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">12-factor: config in the environment, never baked in — only then can one image be reused</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The same <b style="color:#4f6df5">immutable image</b> (blue), paired with each environment's own <b style="color:#d6a45c">ConfigMap + Secret</b> (orange), yields Pods for all three environments. This is the core 12-factor principle — <b>config lives in the environment, not baked into the image</b>. Only by pulling config out can you "build once, run anywhere", instead of building a separate image with hard-wired settings per environment; it's the same obsession as <a href="/blog/sre-automation-release/">hermetic builds</a>: an artefact that's reproducible and portable across environments</figcaption>
</figure>

## ConfigMap vs Secret: the difference is "secret or not"

The two are used almost identically; both store key-value pairs (or whole config files). The difference is **whether what's inside is secret**:
- **ConfigMap**: non-secret, ordinary settings — database hostname, log level, feature flags, a whole `application.yaml`.
- **Secret**: secrets — database passwords, API keys, TLS certificates, tokens.

But here's **the most misunderstood, and most dangerous, trap**: **a Secret is only base64-encoded by default; it is not encrypted.** base64 is "a different representation", not "a lock" — anyone who can read the Secret can recover the plaintext with one command. So to make Secrets actually secure you need three more things: **turn on etcd encryption at rest** (so they're really encrypted at the storage layer), **restrict who can read them strictly with RBAC**, and in Production **connect an external secret manager** (Vault, the cloud's KMS). Treat a Secret as "configuration with access control", not as "an encrypted safe", and the false sense of security in the name won't fool you.

## Two ways to inject: environment variables vs mounted files

Config is ready; how does it get into the Pod? Two ways, each with its own fit:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 202" role="img" aria-label="Two ways to inject ConfigMaps and Secrets into a Pod. Left, environment variables: inject keys as env vars, simple and intuitive, good for a few settings, but a config change needs a pod restart to take effect. Right, mounted as files via a volume: config appears as files in a directory, good for whole config files or TLS certificates, and after a ConfigMap update the mounted files refresh automatically without a restart. Warning below: a Secret is only base64 by default, not encryption; real security needs encryption at rest, RBAC-restricted access, and an external KMS or Vault in Production." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Two ways to inject: env vars vs mounted files</text>
    <rect x="20" y="34" width="260" height="102" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="150" y="54" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">① Environment variables (env)</text>
    <text x="150" y="74" fill="#e6e6e6" font-size="8.2" text-anchor="middle">inject each key as an env var</text>
    <text x="150" y="92" fill="#9aa4b2" font-size="7.8" text-anchor="middle">✓ simple, intuitive, good for a few settings</text>
    <text x="150" y="110" fill="#e0733a" font-size="7.8" text-anchor="middle">✗ a change needs a pod restart to apply</text>
    <text x="150" y="126" fill="#9aa4b2" font-size="7.4" text-anchor="middle">(env is fixed at start; no hot reload)</text>
    <rect x="300" y="34" width="260" height="102" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.4"/>
    <text x="430" y="54" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">② Mounted as files (volume)</text>
    <text x="430" y="74" fill="#e6e6e6" font-size="8.2" text-anchor="middle">appears as files in a directory</text>
    <text x="430" y="92" fill="#9aa4b2" font-size="7.8" text-anchor="middle">✓ good for whole config files / TLS certs</text>
    <text x="430" y="110" fill="#54b890" font-size="7.8" text-anchor="middle">✓ update the ConfigMap → files refresh</text>
    <text x="430" y="126" fill="#9aa4b2" font-size="7.4" text-anchor="middle">(no restart, but the app must re-read)</text>
    <rect x="40" y="150" width="500" height="40" rx="8" fill="#3a2626" stroke="#e0733a" stroke-width="1.4"/>
    <text x="290" y="168" fill="#e0733a" font-size="8.6" text-anchor="middle" font-weight="bold">⚠ A Secret is only base64 by default — not encryption!</text>
    <text x="290" y="183" fill="#9aa4b2" font-size="8" text-anchor="middle">Real security: encryption at rest + RBAC-restricted access + external KMS / Vault in Production</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">Environment variables</b> are simplest, but they're fixed when the pod starts, so a config change <b>needs a pod restart</b> to take effect. <b style="color:#54b890">Mounting as files</b> (volume) suits whole config files or certificates, with a bonus: after you update the ConfigMap, the mounted files <b>refresh automatically</b> (though the app usually still has to re-read them). In practice: a few settings via env, whole config files or certificates via volume. Either way, don't forget the red text — the name Secret gives you a sense of safety, but by default it's only base64</figcaption>
</figure>

## In YAML: create the config, then inject it into the Pod

Turning the two diagrams into actual declarations. First create the ConfigMap (plaintext) and the Secret (note `data` takes **base64** values, or use `stringData` to write plaintext and let K8s encode it):

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: web-config }
data:
  LOG_LEVEL: "info"                 # non-secret: plaintext as is
  application.yaml: |               # a whole config file works too
    server:
      timeout: 30s
---
apiVersion: v1
kind: Secret
metadata: { name: web-secret }
type: Opaque
stringData:
  DB_PASSWORD: "s3cr3t"             # stringData: write plaintext, K8s base64-encodes on save (still not encrypted)
```

Then, in the Deployment's Pod template, demonstrate **both injection methods** — `env` pulls into environment variables, `volumeMounts` mounts as files:

```yaml
    spec:
      containers:
        - name: web
          image: myrepo/web:1.0
          env:
            - name: LOG_LEVEL       # ① env var: pull one key from the ConfigMap
              valueFrom: { configMapKeyRef: { name: web-config, key: LOG_LEVEL } }
            - name: DB_PASSWORD     # same for a secret, with secretKeyRef
              valueFrom: { secretKeyRef: { name: web-secret, key: DB_PASSWORD } }
          volumeMounts:
            - { name: cfg, mountPath: /etc/web }   # ② mounted as files: the whole application.yaml appears in this directory
      volumes:
        - name: cfg
          configMap: { name: web-config }
```

The two contrasts are the point of the second diagram: `env`/`...KeyRef` is **environment-variable injection** (fixed at start; a change needs a Pod restart); `volumeMounts` + `volumes.configMap` is **mount as files** (files refresh after the ConfigMap is updated, but the app has to re-read them). To pour a whole ConfigMap/Secret into environment variables in one go, there's also `envFrom`, which saves a lot of lines.

## Reflections

### Separating config from image is the foundation of "build once, run anywhere"

When I was learning Docker/K8s I did the stupid thing of writing the DB address, even credentials, straight into the image — the result was rebuilding an image every time I changed environments, one for dev, one for prod, a total mess, and I nearly pushed a password to git. What ConfigMap/Secret taught me is a clean boundary: **the image owns "code and dependencies"; config owns "where this runs and with what parameters"; keep them apart.** The value of that boundary is making "the same artefact runs in every environment" real — the image you validated in Staging goes to Production without a single bit changed, only a different config. It's the same coin as the "reproducible, portable artefact" of [[sre-automation-release|hermetic builds]], two faces: one guards the purity of the build artefact, the other the injection of runtime config.

### A Secret is only base64 — the name gives you a false sense of safety

The name "Secret" is dangerous because it sounds so safe that people unconsciously assume "put it in a Secret and it's locked". But by default it's only base64; anyone with access can recover the plaintext in a second. The lesson goes beyond K8s: **never let a thing's "name" do your security judgment for you.** Now whenever I see a feature claiming "encrypted", "secure", "protected", I ask one more question: "what does it actually do, and whom does it stop" — is it real encryption or just encoding? Does it stop outsiders, or also insiders with permissions? The name is marketing; the actual threat model is engineering. Knowing **specifically what a security mechanism blocks and what it doesn't** matters far more than remembering what it's called.

### Good config management makes "changing a setting" not the same as "changing the program"

I increasingly think you can tell how mature a system is by "how painful it is to change one setting". In an immature system, changing a parameter means touching code, rebuilding, redeploying — every change a big production — so people avoid changing anything and hard-code the settings. In a mature system, config is external and injected — flip a feature flag, adjust a threshold, no code touched, maybe not even a restart (if mounted as files). ConfigMap/Secret make config a first-class citizen, fully separating "adjusting behaviour" from "rewriting logic", and that separation is itself a form of maintainability. Separating "what changes" (config) from "what mostly doesn't" (code), so the former can be adjusted cheaply — this isn't just K8s wisdom; it's a thread running through every good architecture I've seen.
