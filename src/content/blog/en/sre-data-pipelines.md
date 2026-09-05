---
title: "Data Pipelines and Data Integrity: Having a Backup Doesn't Mean You Can Restore"
date: 2026-07-13
category: tech
description: "Beyond \"the service stays up\", a data system's reliability has a more fundamental layer: the data itself must not go missing or go wrong. This post covers the hidden traps of data pipelines (backlog, one stuck stage stalling everything), and an idea that upends intuition — \"having a backup\" isn't \"being able to restore\": a backup you've never practised restoring from is Schrödinger's backup. What actually matters isn't the backup; it's the recovery."
tags:
  - sre
  - data-engineering
series: "Google SRE — Reading Notes"
seriesOrder: 11
comments: true
draft: false
translationOf: sre-data-pipelines
---
Beyond the "service stays up" reliability covered so far, a data system has a more fundamental layer — **the data itself must not go missing or go wrong**. This post covers two things: the reliability of data pipelines, and an idea that will upend your intuition: **"having a backup" isn't "being able to restore".**

## Data pipelines: the hidden traps of periodic pipelines

Pipeline reliability differs from online-service reliability. The most common hidden trap is **backlog in a periodic pipeline**: data volume grows slowly → each run takes longer → it misses its scheduling window → backlog piles up → the next run has to chew through a giant batch (thundering herd) → slower still. And pipelines are usually several stages chained together, so **any one stage that sticks or emits bad data stalls the whole chain, or quietly pollutes downstream**.

So pipeline reliability has different concerns from a service: **an SLA on data freshness** (how fresh must the output be), **monitoring on every stage** (don't wait until the end to discover the middle rotted), and the most critical — **idempotent and re-runnable** ([[airflow-scheduling|see my Airflow post]]): when it breaks you can safely re-run it and get the same result, rather than duplicates or an explosion.

## "Having a backup" isn't "being able to restore"

Now the one line this post most wants you to remember. Everyone's instinct about data safety is "we have backups, relax" — but that reassurance may well be **false**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 208" role="img" aria-label="Left, what you think is safe: backups every day, safe on paper. Right, when you actually need to restore, it falls apart: the backup file itself is corrupt and was never verified, nobody has ever run the restore procedure so it's a scramble, the restore is too slow and blows the SLA. Conclusion: a backup you've never practised restoring from is Schrödinger's backup; what matters isn't the backup but the recovery." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="dp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="288" y1="16" x2="288" y2="164" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="140" y="28" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">what you think is safe</text>
    <rect x="44" y="60" width="196" height="52" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.4"/>
    <text x="142" y="84" fill="#e6e6e6" font-size="10" text-anchor="middle">backups every day ✓✓✓</text>
    <text x="142" y="100" fill="#9aa4b2" font-size="8.3" text-anchor="middle">safe "on paper"</text>
    <text x="140" y="146" fill="#9aa4b2" font-size="8.3" text-anchor="middle">when you actually restore…</text>
    <line x1="240" y1="120" x2="296" y2="120" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#dp)"/>
    <text x="430" y="28" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">it falls apart for real</text>
    <rect x="308" y="40" width="252" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="434" y="57" fill="#e6e6e6" font-size="8.3" text-anchor="middle">backup file itself corrupt (never verified)</text>
    <rect x="308" y="72" width="252" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="434" y="89" fill="#e6e6e6" font-size="8.3" text-anchor="middle">restore procedure never run → scramble</text>
    <rect x="308" y="104" width="252" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="434" y="121" fill="#e6e6e6" font-size="8.3" text-anchor="middle">restore too slow → SLA blown, data gone</text>
    <text x="290" y="184" fill="#d6a45c" font-size="9" text-anchor="middle" font-weight="bold">never-restored backup = Schrödinger's backup (alive or dead? open it to find out)</text>
    <text x="290" y="200" fill="#9aa4b2" font-size="8.5" text-anchor="middle">what matters isn't the "backup", it's the "recovery" — the backup is only the means</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">"We have backups" is one of the most dangerous feelings of safety. The backup file may have been corrupt for ages, the restore procedure may never have been run, the restore may be too slow to meet the SLA — and you only find out by <b>actually practising a restore</b>. So the metric that matters is "can we really get the data back, within the deadline", not "do we have backups"</figcaption>
</figure>

## Data integrity: assume every layer will leak

Another counter-intuitive fact: **data loss is mostly not hardware failure; it's bugs and people** — a bug writes a column wrong, one wrong command deletes the wrong thing, a batch of bad upstream data quietly pollutes everything downstream. So the defence can't be just "back up against hardware failure"; it has to be **defense in depth**, several layers stacked:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 218" role="img" aria-label="Defense in depth for data integrity. Threats come from bugs, accidental deletes, bad data polluting downstream, and hardware. Data is only truly lost if it passes through three layers: first, soft delete, mark first and delete later to leave time for regret; second, backup plus recovery, backups plus regular restore drills; third, early detection, validation and reconciliation that catch problems before users do. With all three holding, the data stays intact." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="di" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="22" fill="#e0733a" font-size="8.8" text-anchor="middle">threats: bugs · accidental deletes · bad data polluting downstream · hardware</text>
    <line x1="290" y1="28" x2="290" y2="42" stroke="#e0733a" stroke-width="1.2" marker-end="url(#di)"/>
    <rect x="70" y="44" width="440" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="86" y="63" fill="#54b890" font-size="8.8" text-anchor="start" font-weight="bold">① Soft delete</text><text x="500" y="63" fill="#9aa4b2" font-size="8" text-anchor="end">mark first, delete later → time to regret</text>
    <line x1="290" y1="74" x2="290" y2="86" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#di)"/>
    <rect x="70" y="88" width="440" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="86" y="107" fill="#54b890" font-size="8.8" text-anchor="start" font-weight="bold">② Backup + Recovery</text><text x="500" y="107" fill="#9aa4b2" font-size="8" text-anchor="end">backups + regular restore drills (not just backups)</text>
    <line x1="290" y1="118" x2="290" y2="130" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#di)"/>
    <rect x="70" y="132" width="440" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="86" y="151" fill="#54b890" font-size="8.8" text-anchor="start" font-weight="bold">③ Early detection</text><text x="500" y="151" fill="#9aa4b2" font-size="8" text-anchor="end">validation / reconciliation → catch it before users do</text>
    <line x1="290" y1="162" x2="290" y2="174" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#di)"/>
    <rect x="220" y="176" width="140" height="28" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="290" y="194" fill="#e6e6e6" font-size="9" text-anchor="middle">data intact ✓</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Defense in depth: soft delete buys you time to change your mind, early detection catches data quietly rotting, backup + restore is the final safety net. The spirit is — <b>assume any single layer will fail</b>, so stack several, rather than betting everything on one line of defence</figcaption>
</figure>

## Reflections

### "We have backups" is the most dangerous sense of safety I've seen

Backups give a solid feeling of reassurance, but that reassurance is often false — **a backup you've never restored from is Schrödinger's backup: you don't know whether it's alive or dead until you open it.** The backup file may have been silently corrupt for six months, the restore procedure may live in a document nobody reads and has never been run, the real restore may be too slow for what the business can tolerate. So now when I hear "we have backups", my reflex is one question: **"When did you last actually run a restore drill? How long did it take?"** No answer, and that sense of safety is made of paper. It's consistent with SRE's standing spirit: [[sre-testing|don't assume, verify]] — backups need a real restore periodically, just as tests need a real run periodically.

### Data loss is mostly not hardware; it's bugs and people

When people think of data loss they picture a disk burning out, but far more common in the real world is a bug writing a whole column wrong, one slip deleting the wrong table, a batch of dirty upstream data silently polluting the whole downstream. "Hardware redundancy" can't block these; only **defense in depth** can: soft delete for time to regret, early detection (reconciliation, validation) to catch it before users do, backup + restore as the last net. And you have to **assume every layer will leak** to stack them thick enough. It's the same pessimism as [[sre-cascading-failures|the cascading-failures post]] — good reliability engineering is built on "assume it will break", never on "hope it won't".

### Pipeline reliability is half the craft of data engineering

This chapter felt especially close to home, because data pipelines are what I do every day. It reminded me that a pipeline's reliability is far more than "did today's run succeed" — it's whether the data is **fresh enough** (a freshness SLA), whether a re-run **breaks anything** ([[airflow-scheduling|idempotent and re-runnable]]), whether the backlog **can catch up**, whether bad data **quietly pollutes downstream**. The idempotency I talked about along the Airflow line, the reliability in [[ddia-reliable-scalable|DDIA]], and this chapter are all the same thing: **keep the data "always there, and correct" under every kind of failure.** A dead service comes back with a restart, but wrong or lost data often never comes back — so the reliability of data deserves a bit more paranoia than the reliability of services.
