---
title: "Redis Persistence: RDB Snapshots vs AOF Logs, and Whether Data Is Actually Lost"
date: 2026-07-16
category: tech
description: "\"Redis is an in-memory database; lose power and everything's gone\" — half right, half wrong. Redis has two persistence mechanisms: RDB periodically snapshots the whole memory (small, fast to load, but loses what happened between snapshots), and AOF records every write command as a running log (safe, but big files and slow loads). This post makes clear how the two approaches differ, how the fsync strategy picks a spot between \"safe\" and \"fast\", the fork + copy-on-write mechanics behind the scenes and the memory-spike trap, and an honest conclusion: Redis persistence isn't a financial-grade guarantee; it's an acceleration layer, not your source of truth."
tags:
  - redis
  - persistence
series: "Redis — Learning Notes"
seriesOrder: 4
comments: true
draft: false
translationOf: redis-persistence
---
"Redis is an in-memory database; lose power and all the data's gone" — that line is **half right, half wrong**. Right in that it lives mainly in memory; wrong in that it does have persistence, can write data to disk and restore it after a restart. Its persistence semantics are just weaker than a traditional database's, and you have to understand them to use them right. Redis gives you two mechanisms with completely different approaches: **take snapshots (RDB)** and **keep a running log (AOF)**.

## Two approaches: snapshots vs a running log

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 224" role="img" aria-label="RDB snapshots versus the AOF log. Top row, RDB takes a periodic full-picture snapshot: a snapshot file is saved every so often along the timeline, and data between the last snapshot and the crash is lost; the upsides are a small file, fast load, good for backups. Bottom row, AOF logs every write command: dense records along the timeline, and a crash loses at most one fsync interval; the upside is more safety, the downside big files and slow loads that replay. Below, hybrid mode: an RDB snapshot at the head of the AOF followed by incremental commands, fast to load with little loss, the modern recommendation." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Snapshot (RDB) vs running log (AOF)</text>
    <text x="16" y="52" fill="#4f6df5" font-size="9.4" text-anchor="start" font-weight="bold">RDB snapshot</text><text x="16" y="65" fill="#9aa4b2" font-size="7.4" text-anchor="start">periodic full picture</text>
    <line x1="110" y1="58" x2="500" y2="58" stroke="#3a4154" stroke-width="1.4"/>
    <rect x="150" y="50" width="16" height="16" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><rect x="270" y="50" width="16" height="16" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><rect x="390" y="50" width="16" height="16" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <rect x="406" y="50" width="80" height="16" rx="2" fill="#3a2626" stroke="#e0733a" stroke-width="1" stroke-dasharray="3 2"/><text x="446" y="62" fill="#e0733a" font-size="6.6" text-anchor="middle">loss window</text>
    <text x="500" y="55" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">⚡</text>
    <text x="290" y="86" fill="#9aa4b2" font-size="7.8" text-anchor="middle">small file, fast load, good for backups ✓ | lose what happened between snapshots (maybe minutes) ✗</text>
    <line x1="40" y1="104" x2="540" y2="104" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="16" y="134" fill="#54b890" font-size="9.4" text-anchor="start" font-weight="bold">AOF log</text><text x="16" y="147" fill="#9aa4b2" font-size="7.4" text-anchor="start">every write logged</text>
    <line x1="110" y1="140" x2="500" y2="140" stroke="#3a4154" stroke-width="1.4"/>
    <line x1="130" y1="132" x2="130" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="152" y1="132" x2="152" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="174" y1="132" x2="174" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="196" y1="132" x2="196" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="218" y1="132" x2="218" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="240" y1="132" x2="240" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="262" y1="132" x2="262" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="284" y1="132" x2="284" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="306" y1="132" x2="306" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="328" y1="132" x2="328" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="350" y1="132" x2="350" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="372" y1="132" x2="372" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="394" y1="132" x2="394" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="416" y1="132" x2="416" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="438" y1="132" x2="438" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="460" y1="132" x2="460" y2="148" stroke="#54b890" stroke-width="1.4"/>
    <text x="500" y="137" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">⚡</text>
    <text x="290" y="168" fill="#9aa4b2" font-size="7.8" text-anchor="middle">safer (lose at most one fsync interval) ✓ | big file, slow load (replay) ✗</text>
    <rect x="40" y="184" width="500" height="32" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="290" y="204" fill="#e6e6e6" font-size="8" text-anchor="middle">Hybrid (Redis 4+): RDB snapshot at the head of the AOF + incremental commands → fast load, little loss (recommended)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">RDB</b> is like taking a panoramic photo every so often: compact file, fast to load on restart, best suited for backups; the downside is that whatever happened between two photos is gone if you crash. <b style="color:#54b890">AOF</b> is like a ledger, recording every write command and replaying them on restart: much safer, at the cost of a file that grows large and a slow load that re-runs every entry. Modern setups mostly use <b>hybrid mode</b> — an RDB snapshot as the base, AOF for the increments, getting both "fast load" and "little loss"</figcaption>
</figure>

**RDB (Redis Database)** is a snapshot: at some point in time, dump the whole memory into one compact binary file (`dump.rdb`). **AOF (Append Only File)** is an operation log: append every **write command** to a file, and on restart replay those commands to rebuild the state. They aren't either/or — you can enable both and take the best of each with hybrid mode.

## fsync: picking a spot between "safe" and "fast"

AOF has a key setting: after writing to the log, **how often is it actually `fsync`ed to disk**? That choice directly decides "how much you can lose at most". Lay every option on one spectrum and you'll find persistence has no "right answer", only "where you stand between safety and performance":

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 196" role="img" aria-label="The durability versus performance spectrum of persistence. From left to right: AOF always fsyncs every command, loses nothing but is slowest; AOF everysec fsyncs every second, the default, losing at most one second; hybrid RDB plus AOF loses at most one second and loads fast; periodic RDB loses minutes; persistence off loses everything on a crash but is fastest. The left end is high durability and slower, the right end high performance and more loss. Further left loses less but is slower, further right is faster but loses more; there's no best setting, only the position that fits this data." style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#54b890"/><stop offset="1" stop-color="#e0733a"/></linearGradient></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Persistence has no standard answer, only "where you stand"</text>
    <text x="40" y="46" fill="#54b890" font-size="8.2" text-anchor="start" font-weight="bold">◀ more durable · slower</text><text x="540" y="46" fill="#e0733a" font-size="8.2" text-anchor="end" font-weight="bold">faster · lose more ▶</text>
    <rect x="40" y="58" width="500" height="12" rx="6" fill="url(#pg)"/>
    <line x1="90" y1="54" x2="90" y2="74" stroke="#e6e6e6" stroke-width="1.3"/><line x1="200" y1="54" x2="200" y2="74" stroke="#e6e6e6" stroke-width="1.3"/><line x1="300" y1="54" x2="300" y2="74" stroke="#e6e6e6" stroke-width="1.3"/><line x1="410" y1="54" x2="410" y2="74" stroke="#e6e6e6" stroke-width="1.3"/><line x1="500" y1="54" x2="500" y2="74" stroke="#e6e6e6" stroke-width="1.3"/>
    <text x="90" y="90" fill="#e6e6e6" font-size="8" text-anchor="middle" font-weight="bold">AOF always</text><text x="90" y="104" fill="#9aa4b2" font-size="7.4" text-anchor="middle">lose 0 (fsync per cmd)</text>
    <text x="200" y="90" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">everysec ★default</text><text x="200" y="104" fill="#9aa4b2" font-size="7.4" text-anchor="middle">≤ 1 second</text>
    <text x="300" y="90" fill="#e6e6e6" font-size="8" text-anchor="middle" font-weight="bold">hybrid</text><text x="300" y="104" fill="#9aa4b2" font-size="7.4" text-anchor="middle">≤ 1 s · fast load</text>
    <text x="410" y="90" fill="#e6e6e6" font-size="8" text-anchor="middle" font-weight="bold">RDB periodic</text><text x="410" y="104" fill="#9aa4b2" font-size="7.4" text-anchor="middle">lose minutes</text>
    <text x="500" y="90" fill="#e6e6e6" font-size="8" text-anchor="middle" font-weight="bold">no persistence</text><text x="500" y="104" fill="#9aa4b2" font-size="7.4" text-anchor="middle">crash = all gone</text>
    <rect x="60" y="130" width="460" height="48" rx="8" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="150" fill="#e6e6e6" font-size="8.6" text-anchor="middle">Persistence has no "best" setting, only the position that fits this data:</text>
    <text x="290" y="168" fill="#d6a45c" font-size="8.6" text-anchor="middle" font-weight="bold">further left loses less but is slower; further right is faster but loses more</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">AOF's <code>fsync</code> is one of three: <b>always</b> (flush on every write command, lose 0 but slowest), <b>everysec</b> (flush once a second, the default, lose at most 1 second — the sweet spot for the vast majority of cases), <b>no</b> (leave it to the OS, fastest but least safe). Add RDB and hybrid mode, and you see persistence isn't an "on or off" switch but a spectrum. Where you stand depends on whether this data can lose a second, a minute, or not a single entry</figcaption>
</figure>

## Behind the scenes: fork + copy-on-write (and the memory-spike trap)

A question you may have wondered: Redis is [[redis-single-thread|single-threaded]], so how does it save a snapshot (`BGSAVE`) or rewrite the AOF **without blocking** the main process from serving? The answer is **fork + copy-on-write (COW)**: Redis `fork`s a child process; the child "freezes" a snapshot of memory as of that moment and writes the file at leisure; the main process keeps serving. Parent and child initially **share the same memory pages**, and only when the main process **modifies** a page does the OS copy that page for it (copy only on write) — untouched pages take no extra space at all.

But a trap hides here: if writes are **very frequent** during the snapshot, more and more pages get modified and more and more COW copies are made, and **memory can spike briefly**, in the worst case close to double. So when running Redis in Production, always leave enough memory headroom, or a `BGSAVE` triggers, memory climbs and you OOM — this is the culprit behind many a "fine all day, dies whenever it backs up".

## Don't misread it: Redis persistence isn't a financial-grade guarantee

One honest conclusion to finish: even with AOF `always`, **Redis isn't giving you a "never lose a single entry" strong-durability guarantee** — by design it leads with speed. The real value of its persistence is **"warm up fast after a restart, avoid a stampede of origin fetches hammering the database behind it"**, not serving as the source of truth you can't afford to lose. That echoes [[redis-intro|the first post]]'s positioning exactly: Redis is the **hot data layer**; the authoritative copy should live in the database behind it; what's in Redis is a **rebuildable acceleration layer**. Set that role straight, and the anxiety of "if Redis dies, is the data gone" downgrades from "disaster" to "a slow trip to the origin for a while".

## redis-cli: the three knobs for persistence

The trade-offs above land as three knobs (all settable with `CONFIG SET`, no restart):

```bash
# view / adjust settings
CONFIG GET save            # RDB snapshot triggers, e.g. "3600 1 300 100 60 10000"
CONFIG SET appendonly yes  # enable the AOF log
CONFIG GET appendfsync     # AOF flush policy: always / everysec (default) / no
CONFIG REWRITE             # write the current settings back to redis.conf (or a restart reverts them)
# trigger manually and inspect
BGSAVE                     # fork in the background and save an RDB
BGREWRITEAOF               # compact the AOF file
LASTSAVE                   # timestamp of the last successful save (use it to confirm nothing's stuck)
INFO persistence           # rdb_last_bgsave_status, aof_enabled, aof_last_write_status…
```

`save` (how often RDB snapshots), `appendonly` (whether to keep the log), `appendfsync` (how often to flush) — those three knobs decide where you stand on the "durability ↔ performance" spectrum. **Remember `CONFIG SET` only changes the running instance; you need `CONFIG REWRITE` to save it to the config file**, or a restart wipes your changes.

## Reflections

### "Will it lose data" isn't yes/no; it's "how much performance will you trade for how much safety"

When I first learned Redis persistence, I kept looking for the one "most correct" setting, until I realised the question was wrong. Persistence has no standard answer, only **coordinates on a trade-off**: for this data, can you accept losing a second? A minute? Not a single entry? — different answers, different mechanisms. For a session cache, `everysec` is more than enough; for anything involving money, it shouldn't live only in Redis in the first place. Now, whenever I configure persistence (not just Redis), I first ask "how much loss can we tolerate" and then go back and choose the setting, rather than blindly chasing "safest" — because safest is usually also slowest, and you may not need it at all. **Define the failure you can accept first, then pick the technology** — that order matters more than anything.

### What fork + copy-on-write taught me: the most elegant concurrency is often "share, and copy only on write"

fork + COW is a design I love. The problem it solves is "how to take a consistent snapshot of something that keeps changing, without stopping service" — and its answer isn't "lock it and copy it" (too expensive) but **"share first, and only when someone wants to write, copy that one small piece"**. This "copy on write" idea is everywhere once you look: immutable data structures in programming languages, a database's [[sql-transactions|MVCC]] snapshots, even Git's object store. Their shared wisdom: **most things won't actually be modified, so don't copy everything up front; pay only for the changes that really happen.** Once you understand COW, a lot of seemingly magical "lock-free snapshots" stop being magical.

### Get Redis's role in the architecture straight, and half the persistence anxiety disappears

I've seen plenty of teams agonise over "how strong should Redis persistence be", but the root of that anxiety is **not having settled what role Redis plays in the architecture**. If it's an acceleration layer and the data can be rebuilt from the database behind it, then persistence only needs "restart fast, fetch less from origin", and `everysec` or hybrid mode is plenty; if you find you need it to "never lose a single entry", the real problem isn't "how to set persistence" but **"this data shouldn't live only in Redis"**. Many technical anxieties, traced to the bottom, aren't technical problems but **positioning problems** — think through each component's responsibility in the system, and half the agonising dissolves on its own. It's also the deepest lesson of my years doing architecture: **first sort out who is the truth and who is the accelerator, then talk about settings.**
