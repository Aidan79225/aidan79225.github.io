---
title: "Packaging and Deployment: Helm and Kustomize"
date: 2026-07-19
category: tech
tags:
  - kubernetes
  - operations
series: "Kubernetes — Learning Notes"
seriesOrder: 14
comments: true
draft: false
translationOf: k8s-packaging
---
Every previous post taught you to write YAML, but practice has an unavoidable pain: **the same app goes to Development, Staging and Production, and ninety percent of the YAML for the three environments is identical, with only a few differences** — replica count, image tag, resource sizes, the external hostname. If you copy-paste three sets and maintain each separately, changing one shared field means syncing three times, and sooner or later something slips. This post covers the two mainstream tools for this: **Helm** and **Kustomize**, and the two very different worldviews behind them.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 214" role="img" aria-label="The pain of cross-environment deployment: one app's pile of YAML has to be deployed to Development, Staging and Production, and ninety percent of the content is the same across the three, with only replica count, image tag, resource sizes and external hostname differing. Rather than copying three sets and maintaining each, keep one shared source plus each environment's differences" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="pk" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="18" y="78" width="150" height="60" rx="9" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="93" y="102" fill="#4f6df5" font-size="10.5" font-weight="bold" text-anchor="middle">one app</text>
    <text x="93" y="119" fill="#9aa4b2" font-size="8" text-anchor="middle">a pile of YAML</text>
    <text x="93" y="131" fill="#9aa4b2" font-size="8" text-anchor="middle">90% shared content</text>
    <line x1="168" y1="98" x2="236" y2="52" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pk)"/>
    <line x1="168" y1="108" x2="236" y2="108" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pk)"/>
    <line x1="168" y1="118" x2="236" y2="166" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#pk)"/>
    <rect x="238" y="24" width="346" height="52" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="252" y="43" fill="#54b890" font-size="9.5" font-weight="bold" text-anchor="start">Development</text><text x="252" y="60" fill="#9aa4b2" font-size="8" text-anchor="start">replicas:1 · image:app:dev · small resources · host:dev.local</text>
    <rect x="238" y="82" width="346" height="52" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="252" y="101" fill="#d6a45c" font-size="9.5" font-weight="bold" text-anchor="start">Staging</text><text x="252" y="118" fill="#9aa4b2" font-size="8" text-anchor="start">replicas:2 · image:app:rc · host:stg.example.com</text>
    <rect x="238" y="140" width="346" height="52" rx="8" fill="#262b3a" stroke="#e05a7d" stroke-width="1.4"/><text x="252" y="159" fill="#e05a7d" font-size="9.5" font-weight="bold" text-anchor="start">Production</text><text x="252" y="176" fill="#9aa4b2" font-size="8" text-anchor="start">replicas:10 · image:app:1.4 · big resources · host:example.com</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The essence of cross-environment deployment: one app, three environments, <b>90% identical YAML, only a few values differ</b>. Rather than copying three sets and maintaining each (one change, three syncs), keep "<b>one shared source + each environment's differences</b>" — Helm and Kustomize are two ways of doing exactly that</figcaption>
</figure>

## Two philosophies: fill in a template vs stack patches

Helm and Kustomize both solve "one source + per-environment differences", but their approaches point in opposite directions. One treats YAML as **a template with variables** to fill in; the other treats YAML as **data** and stacks patches on it:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 296" role="img" aria-label="Helm versus Kustomize. Left, Helm fills in a template: template.yaml has placeholders like replicas equals double-brace Values.replicas, paired with value files values-dev and values-prod; helm install or upgrade renders it into concrete YAML and applies it. Right, Kustomize stacks patches: the base directory is plain YAML that is valid and directly applicable on its own, the overlays directory holds a small patch per environment, and kubectl apply -k merges the patch into base and applies it" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="ph" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="8" y="26" width="298" height="262" rx="10" fill="none" stroke="#9b6ff0" stroke-width="1.5"/>
    <text x="157" y="46" fill="#9b6ff0" font-size="11" font-weight="bold" text-anchor="middle">Helm: fill in a template</text>
    <rect x="26" y="58" width="150" height="52" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="101" y="76" fill="#e6e6e6" font-size="8.8" text-anchor="middle">template.yaml</text><text x="101" y="92" fill="#9aa4b2" font-size="7.8" text-anchor="middle">replicas:</text><text x="101" y="103" fill="#54b890" font-size="7.8" text-anchor="middle">{{ .Values.replicas }}</text>
    <rect x="192" y="58" width="112" height="52" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="248" y="78" fill="#d6a45c" font-size="8.4" text-anchor="middle">values-dev.yaml</text><text x="248" y="94" fill="#d6a45c" font-size="8.4" text-anchor="middle">values-prod.yaml</text><text x="248" y="105" fill="#9aa4b2" font-size="7.5" text-anchor="middle">the values to fill in</text>
    <line x1="101" y1="110" x2="140" y2="140" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ph)"/>
    <line x1="248" y1="110" x2="180" y2="140" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ph)"/>
    <rect x="46" y="144" width="222" height="40" rx="7" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.6"/><text x="157" y="162" fill="#9b6ff0" font-size="9" text-anchor="middle">helm install / upgrade</text><text x="157" y="177" fill="#9aa4b2" font-size="7.8" text-anchor="middle">renders variables into concrete values</text>
    <line x1="157" y1="184" x2="157" y2="208" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ph)"/>
    <rect x="46" y="210" width="222" height="34" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="157" y="231" fill="#e6e6e6" font-size="8.8" text-anchor="middle">filled-in concrete YAML</text>
    <line x1="157" y1="244" x2="157" y2="266" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ph)"/>
    <text x="157" y="281" fill="#54b890" font-size="9" text-anchor="middle">→ apply to the cluster</text>
    <rect x="314" y="26" width="298" height="262" rx="10" fill="none" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="463" y="46" fill="#4f6df5" font-size="11" font-weight="bold" text-anchor="middle">Kustomize: stack patches</text>
    <rect x="332" y="58" width="150" height="52" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/><text x="407" y="78" fill="#54b890" font-size="8.8" text-anchor="middle">base/ plain YAML</text><text x="407" y="94" fill="#9aa4b2" font-size="7.8" text-anchor="middle">valid on its own</text><text x="407" y="105" fill="#9aa4b2" font-size="7.8" text-anchor="middle">can be applied directly</text>
    <rect x="498" y="58" width="106" height="52" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="551" y="78" fill="#d6a45c" font-size="8.2" text-anchor="middle">overlays/prod</text><text x="551" y="93" fill="#9aa4b2" font-size="7.8" text-anchor="middle">a small patch</text><text x="551" y="104" fill="#9aa4b2" font-size="7.5" text-anchor="middle">only what changes</text>
    <line x1="407" y1="110" x2="446" y2="140" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ph)"/>
    <line x1="551" y1="110" x2="486" y2="140" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ph)"/>
    <rect x="352" y="144" width="222" height="40" rx="7" fill="#1f2330" stroke="#4f6df5" stroke-width="1.6"/><text x="463" y="162" fill="#4f6df5" font-size="9" text-anchor="middle">kubectl apply -k</text><text x="463" y="177" fill="#9aa4b2" font-size="7.8" text-anchor="middle">merges the patch into base</text>
    <line x1="463" y1="184" x2="463" y2="208" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ph)"/>
    <rect x="352" y="210" width="222" height="34" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="463" y="231" fill="#e6e6e6" font-size="8.8" text-anchor="middle">merged YAML</text>
    <line x1="463" y1="244" x2="463" y2="266" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#ph)"/>
    <text x="463" y="281" fill="#54b890" font-size="9" text-anchor="middle">→ apply to the cluster</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Same goal, two worldviews: <b>Helm</b> treats YAML as "a template with variables", rendered after values fill the blanks; <b>Kustomize</b> treats YAML as "data" — base is itself valid, runnable YAML, and an overlay stacks only a small patch of what changes on top. The former has a template language; the latter is <b>plain YAML all the way, no variables</b></figcaption>
</figure>

## Helm: turning a K8s app into an installable, versioned, rollback-able package

Helm is often called "**the package manager for K8s**", and the analogy to apt / npm fits well. Its core is the **chart** — a folder holding `Chart.yaml` (package info), `values.yaml` (defaults) and `templates/` (YAML templates with variables). Deploying is three actions:

```bash
helm install web ./mychart -f values-prod.yaml   # install a release, applying prod values
helm upgrade web ./mychart -f values-prod.yaml    # new version: upgrade the same release
helm rollback web 3                               # one-step rollback to revision 3
```

What it gives you beyond plain YAML is **what a package manager should have**: every install/upgrade is a numbered **release**, and when it breaks `helm rollback` takes you back in seconds; you can also declare **dependencies** (my app needs a Redis). The best part is the **ready-made ecosystem** — want Redis, Prometheus, cert-manager in your cluster? One `helm install` line, instead of hand-assembling hundreds of lines of YAML. The price is that Go template language: `{{ }}`, indentation, conditionals and loops pile up, and a complex chart can be hard to read and debug (rendering it first with `helm template` to see the result is the life-saving move).

## Kustomize: plain YAML, base + overlay per environment

Kustomize takes the other road: **no templates, no variables, everything is valid YAML.** You write a `base/` (complete YAML that `kubectl apply` could take as is), then for each environment an `overlays/<env>/` holding **only the small patch this environment changes**:

```yaml
# overlays/prod/kustomization.yaml
resources: [../../base]      # stacked on base
replicas:
  - name: web
    count: 10                # Production gets 10 copies, everything else inherited from base
images:
  - name: app
    newTag: "1.4"            # swap the image tag
```

It's built into kubectl (`kubectl apply -k overlays/prod`), no extra tool to install, and comes with a set of handy transformers: `namePrefix`, `commonLabels`, `images` (change tags), `replicas`, and `configMapGenerator` — the last **appends a content hash to the ConfigMap's name**, so when the content changes the name changes, so the Pod template changes, and **a rolling update triggers automatically**. That neatly disposes of [[k8s-deployment|the pit from post three]]: editing a [[k8s-config-secret|ConfigMap]] doesn't restart Pods by itself — with Kustomize's generator, you get that right for free.

## Which one?

It isn't either/or, but the direction is clear:

| Situation | Leans Helm | Leans Kustomize |
|---|---|---|
| Installing **third-party** ready-made apps (Redis, Prometheus) | ✓ one-line install, ecosystem | |
| Managing **your own** app manifests | | ✓ plain YAML, easy to read and review |
| Need versioning / one-step rollback / dependency management | ✓ the release mechanism | |
| Heavy parameterisation, shipping to others | ✓ values are the parameter panel | |
| Don't want another tool, don't want to learn a template language | | ✓ built into kubectl |

In practice many teams **use both**: Helm for third-party packages, Kustomize to layer environments for their own app; some even run Helm's output through Kustomize via a post-renderer. **First ask whether you're solving "installing someone else's package" or "splitting my own YAML by environment" — that one question basically decides which to pick up first.**

## Reflections

### "Template" and "overlay" are two kinds of mental load; pick the one you can bear

The difference between Helm and Kustomize is tools on the surface and, underneath, **whether you're willing to treat YAML as code or as data**. Helm turns YAML into a template with variables and logic — powerful, but you carry an extra cognitive tax of a template language, and when things go wrong you have to "render" in your head to know what it actually looks like. Kustomize insists everything stays valid YAML; you can `kubectl apply -k` at any time and see the final result, the mental model is clean, and the price is that highly dynamic parameterisation ties your hands. My own preference is **Kustomize whenever Kustomize will do** — the readability and reviewability of plain YAML is badly undervalued as a long-term asset on a team; only when "the parameters get so numerous it feels like programming" do I concede that Helm's templates are the right tool.

### Packaging is the last mile of "externalised config"; only both layers together give one build that runs everywhere

This post is really an extension of [[k8s-config-secret|the ConfigMap/Secret post]]. That one covered "digging the config out of the image", so **the same image** can run in every environment; this one covers "pulling the **environment differences** out of the YAML", so **the same deployment source** can produce each environment's manifests. The two layers are the first and second half of one ideal: **build once, externalise all config and deployment differences, one artefact runs from Dev to Production.** Drop either layer and somewhere you fall back to copy-paste. Once that clicked, my view of CI/CD changed too — a good pipeline isn't "build once per environment"; it's "build once, and place it into different environments through config and overlays".

### Don't Helm-ify simple things to look professional

The customary cold water to finish. I've seen small projects with two or three environments start out with a homemade Helm chart full of `{{ }}`, and then wrestle the template language every time they change a replica count — **wrapping something a three-line diff would solve into a package that has to be maintained.** Packaging tools exist to **reduce** cross-environment repetition and risk, not to show off the tech stack. My priority is always [[pain-before-power|confirm the pain first, then bring in the heavy weapons]]: few environments, small differences, raw YAML or a thin layer of Kustomize is enough; only with genuinely many environments, many teams, and packages to publish for shared use does Helm's machinery earn its keep. **The weight of the tool has to match the weight of the problem** — after walking the whole K8s series, that's the one line I most want to leave behind.
