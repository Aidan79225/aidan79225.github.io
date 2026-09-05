---
title: "Storage Engines: LSM-Trees, B-Trees, and Column-Oriented Storage"
date: 2026-07-23
category: tech
description: "How does a database actually put data on disk and find it again? DDIA Ch3 starts from a two-line bash \"world's simplest database\" and collapses every storage engine into one trade-off: how much organising cost do you pay at write time for the sake of later reads? There are only two big schools — LSM-trees (append-only, fast sequential writes, tidied up afterwards by compaction) and B-trees (update in place, steady reads, kept alive by a WAL). It ends with why OLTP and OLAP split: the same data, laid out row-wise to serve transactions and column-wise to serve analytics — no single layout serves both."
tags:
  - distributed-systems
  - book-notes
  - storage
series: "Designing Data-Intensive Applications — Reading Notes"
seriesOrder: 3
comments: true
draft: false
translationOf: ddia-storage-engines
---
[[ddia-data-models|The previous post]] chose the data model. This one drills to the very bottom: **how does a database actually put data on disk, and get it back?** DDIA opens the chapter with a two-line bash "world's simplest database" — `db_set` **appends** a line to the end of a file, `db_get` **greps the whole file and takes the last match**. Writes are as fast as they get (sequential append); reads are hopelessly slow (an O(n) full scan). And the whole chapter — really every storage engine — answers the same question: **to make reads a bit faster, how much organising cost are you willing to pay on writes?** An index is the name of that trade-off — **it spends extra work at write time to buy speed at read time**; [[sql-index|indexes aren't free]], and this chapter shows you exactly how the bill is paid.

## Two schools: LSM tidies up later, B-trees update in place

Push the "how do you pay the organising fee" question all the way down and there are really only two schools of storage engine:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 250" role="img" aria-label="The two schools of storage engine compared. Left, LSM-tree: writes go first into an in-memory memtable; when it fills, the whole batch is flushed sequentially into an immutable SSTable file on disk, and background compaction merges and deduplicates. Writes are always sequential appends, so they are fast; a read may have to look through several SSTable levels from newest to oldest, sped up by a bloom filter. Right, B-tree: data lives in a tree of fixed-size pages; a write finds the page and overwrites it in place; a read walks three or four levels down the tree, so reads are steady. But in-place updates are random I/O and the WAL must be written first to survive crashes. Bottom line: LSM favours writes, as in RocksDB and Cassandra; B-trees have steady reads, as in nearly every relational database." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="se" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="14" x2="290" y2="206" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="24" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">LSM-tree: append-only, tidy later</text>
    <rect x="36" y="36" width="104" height="30" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="88" y="49" fill="#e6e6e6" font-size="7.8" text-anchor="middle">memtable</text><text x="88" y="60" fill="#9aa4b2" font-size="6.6" text-anchor="middle">in memory, catches writes</text>
    <line x1="88" y1="66" x2="88" y2="82" stroke="#54b890" stroke-width="1.2" marker-end="url(#se)"/><text x="138" y="78" fill="#54b890" font-size="6.4" text-anchor="middle">full → flush batch sequentially</text>
    <rect x="36" y="86" width="104" height="20" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1.1"/><text x="88" y="99" fill="#9aa4b2" font-size="6.8" text-anchor="middle">SSTable (new, immutable)</text>
    <rect x="36" y="110" width="104" height="20" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="88" y="123" fill="#9aa4b2" font-size="6.8" text-anchor="middle">SSTable (older)</text>
    <rect x="36" y="134" width="104" height="20" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="88" y="147" fill="#9aa4b2" font-size="6.8" text-anchor="middle">SSTable (oldest)</text>
    <path d="M148 96 C 172 110, 172 134, 148 144" fill="none" stroke="#d6a45c" stroke-width="1.2" marker-end="url(#se)"/><text x="200" y="122" fill="#d6a45c" font-size="6.8" text-anchor="middle">compaction</text><text x="200" y="132" fill="#9aa4b2" font-size="6.2" text-anchor="middle">background merge + dedupe</text>
    <text x="146" y="176" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">write: always sequential append → fast</text>
    <text x="146" y="190" fill="#9aa4b2" font-size="7.2" text-anchor="middle">read: may search several SSTables (bloom filter helps)</text>
    <text x="434" y="24" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">B-tree: page tree, update in place</text>
    <rect x="404" y="38" width="60" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="434" y="53" fill="#9aa4b2" font-size="6.8" text-anchor="middle">root page</text>
    <rect x="336" y="76" width="60" height="22" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.1"/><text x="366" y="91" fill="#9aa4b2" font-size="6.8" text-anchor="middle">page</text>
    <rect x="472" y="76" width="60" height="22" rx="3" fill="#262b3a" stroke="#4f6df5" stroke-width="1.1"/><text x="502" y="91" fill="#9aa4b2" font-size="6.8" text-anchor="middle">page</text>
    <rect x="336" y="114" width="60" height="22" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="366" y="129" fill="#e6e6e6" font-size="6.8" text-anchor="middle">✎ overwrite in place</text>
    <rect x="472" y="114" width="60" height="22" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="502" y="129" fill="#9aa4b2" font-size="6.8" text-anchor="middle">leaf page</text>
    <line x1="420" y1="60" x2="376" y2="74" stroke="#9aa4b2" stroke-width="1"/><line x1="448" y1="60" x2="492" y2="74" stroke="#9aa4b2" stroke-width="1"/><line x1="366" y1="98" x2="366" y2="112" stroke="#9aa4b2" stroke-width="1"/><line x1="502" y1="98" x2="502" y2="112" stroke="#9aa4b2" stroke-width="1"/>
    <rect x="346" y="146" width="176" height="18" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.2"/><text x="434" y="158" fill="#d6a45c" font-size="6.6" text-anchor="middle">WAL: sequential log entry before touching a page</text>
    <text x="434" y="180" fill="#4f6df5" font-size="7.6" text-anchor="middle" font-weight="bold">read: walk 3–4 levels down → steady</text>
    <text x="434" y="194" fill="#9aa4b2" font-size="7.2" text-anchor="middle">write: random I/O in place + WAL first</text>
    <rect x="30" y="214" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="231" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">LSM: write-optimised (RocksDB / Cassandra / HBase) · B-tree: steady reads (nearly every relational DB)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#54b890">LSM-tree</b> (log-structured): writes go first into an in-memory <b>memtable</b>; when it fills, the batch is <b>flushed sequentially</b> into an immutable <b>SSTable</b> file that is never modified again — old values are cleared by background <b>compaction</b>. Writes are always the sequential appends disks love, so they fly; the price is that reading one key may mean searching several levels from newest to oldest (a bloom filter lets you skip levels that don't have it). <b style="color:#4f6df5">B-tree</b>: data lives in a tree of fixed-size (say 4KB) pages; a write finds the page and <b>overwrites it in place</b>; a read walks three or four levels and it's there — fast and steady. The price is that in-place updates are random I/O, and to survive "crashed halfway through", every write first goes to a <b style="color:#d6a45c">WAL</b>. <b>Same organising fee — LSM chooses to owe it and pay later (compaction), B-tree pays on the spot (random writes + WAL)</b></figcaption>
</figure>

The trade-off compresses to one line: **LSM treats the disk as a log — writes are extremely fast, but the organising debt has to be paid back slowly by compaction (which also amplifies the write volume); B-trees put each write in its place immediately, so the read path is short and stable — that's been the skeleton of relational databases for decades.** You've met both already: [[redis-persistence|Redis's AOF]] is a pure append log, a [[infra-kafka|Kafka]] partition is an append-only log (sequential writes are the secret behind its "disk is king"), and behind every SQL you run, [[sql-index|that index]] is very nearly a B-tree.

## OLTP vs OLAP: same data, two layouts

The second big theme: when the **shape of the read** differs, even whether data should be laid **across or down** differs. Transactional (OLTP) reads and writes are "**fetch a few complete records**" — look up an order, edit a member; analytical (OLAP) is "**scan hundreds of millions of rows but only two or three columns each**" — daily revenue totals for last quarter. Serve both read shapes with one layout and one side is guaranteed to hurt:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 226" role="img" aria-label="Row-oriented versus column-oriented storage. Left, row-oriented: all fields of one order sit together, so an OLTP lookup of one order reads one place and gets the whole record, fast; but an analytical query that only needs the amount column is forced to read every field of every row. Right, column-oriented: values of the same column sit together — a run of ids, a run of dates, a run of amounts; analytics reads only the amount run, saving an order of magnitude of I/O, and same-typed neighbours compress extremely well; but reassembling one complete record means reaching across several places. Bottom line: OLTP uses rows, OLAP uses columns, which is the root reason databases and data warehouses split." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="290" y1="14" x2="290" y2="182" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="26" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">Row-oriented: the OLTP layout</text>
    <rect x="34" y="38" width="224" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="146" y="53" fill="#e6e6e6" font-size="7.2" text-anchor="middle">id=1 · 2026-07-01 · ¥120 · Taipei …</text>
    <rect x="34" y="64" width="224" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="146" y="79" fill="#e6e6e6" font-size="7.2" text-anchor="middle">id=2 · 2026-07-01 · ¥80 · Hsinchu …</text>
    <rect x="34" y="90" width="224" height="22" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><text x="146" y="105" fill="#e6e6e6" font-size="7.2" text-anchor="middle">id=3 · 2026-07-02 · ¥200 · Taichung …</text>
    <text x="146" y="132" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">✓ one order: contiguous, one read gets it all</text>
    <text x="146" y="148" fill="#e0733a" font-size="7.6" text-anchor="middle">✗ only need amount, still read whole rows</text>
    <text x="434" y="26" fill="#d6a45c" font-size="10" text-anchor="middle" font-weight="bold">Column-oriented: the OLAP layout</text>
    <rect x="322" y="38" width="224" height="22" rx="3" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="434" y="53" fill="#9aa4b2" font-size="7.2" text-anchor="middle">id: 1, 2, 3, …</text>
    <rect x="322" y="64" width="224" height="22" rx="3" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="434" y="79" fill="#9aa4b2" font-size="7.2" text-anchor="middle">date: 07-01, 07-01, 07-02, …</text>
    <rect x="322" y="90" width="224" height="22" rx="3" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/><text x="434" y="105" fill="#d6a45c" font-size="7.2" text-anchor="middle" font-weight="bold">amount: 120, 80, 200, … ← read only this</text>
    <text x="434" y="132" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">✓ a billion rows, one column: 10× less I/O</text>
    <text x="434" y="148" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">✓ same-typed neighbours → compress well</text>
    <text x="434" y="164" fill="#e0733a" font-size="7.6" text-anchor="middle">✗ rebuilding one full record spans many places</text>
    <rect x="30" y="192" width="520" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="209" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">OLTP → rows (DB) · OLAP → columns (warehouse / Parquet) — why DB and warehouse split</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">Row-oriented</b> lays all fields of one record contiguously — one order is one read, OLTP is blazing; but when analytics only wants the <code>amount</code> column, you're forced to scan every field of every row. <b style="color:#d6a45c">Column-oriented</b> flips it, laying values of the same column contiguously — scanning a billion rows reads only that one run, I/O drops an order of magnitude, and <b>same-typed values sit next to each other, so compression is extreme</b> (a run of repeated dates squashes to almost nothing). That's why the analytics world is all columnar: warehouses, and Parquet in the <a href="/blog/spark-intro/">Spark</a> ecosystem, all use this layout. <b>The split between databases and data warehouses comes down to "different read shapes → you can only pick one layout"</b></figcaption>
</figure>

So the everyday DE question "why can't we just run analytics on the Production DB" is already answered at the storage layer: **the DBA isn't being stingy — a row layout is inherently unable to serve full-table-scan reads** (and vice versa). Copying data out of OLTP into a columnar warehouse before analysing it — that's the underlying reason [[medallion-architecture|layered data architectures]] and the entire data-engineering pipeline exist.

## Reflections

### "Append-only to please the disk" is a hidden thread through modern data systems

Only after this chapter did the scattered dots join up: LSM's SSTables, the B-tree's WAL, [[redis-persistence|Redis's AOF]], [[infra-kafka|Kafka's partition log]] — **all the same trick: sequential append.** Disks (even SSDs) hate random writes and love sequential ones, so decades of storage design have all, at heart, been doing one thing: **rewriting random write demand as a sequential log.** Even the most "update-in-place" structure, the B-tree, doesn't dare touch a page without an append-only WAL. Once you see that thread, your first question about any new storage system becomes: **where does it turn random writes into sequential ones?** Nearly every time there's an answer — that's the power of a good principle, one line stringing ten tools together.

### Choosing an engine is choosing *when* to pay the organising fee

LSM vs B-tree has been argued for years over which is faster, but the cleanest understanding this chapter gave me is: **both pay the same "organise for reads" fee; the only difference is when.** B-trees pay on the spot (every write goes to its place: random I/O + WAL), so the read path is always short and stable; LSM runs a tab (writes just append) and leaves the organising debt to background compaction — lovely during write spikes, but the debt compounds (write amplification) and the compaction that repays it can fight the foreground for I/O. **Neither is faster — one moves the cost to a moment you can better afford.** I use this ruler everywhere now: write-heavy, read-light, can tolerate occasional read jitter → the LSM family (Cassandra, RocksDB); balanced, need stable query latency → the B-tree family (relational). When a selection argument breaks out, translate the question into "when do you want to pay the organising fee" and the argument usually ends.

### The OLTP/OLAP split taught me: no single layout serves every read shape

The column-storage section explained the reason my profession exists, right down to the root. The same order data — the transactional system wants "one record at a time, the whole record", analytics wants "a billion rows, two columns" — **different read shapes mean different optimal physical layouts, and one copy of data can only have one layout at a time.** So the data has to be copied out of OLTP, turned columnar, and fed to analytics — ETL, warehouses, [[medallion-architecture|Medallion]], right through to Part III of DDIA on "derived data", are all downstream consequences of this physical constraint. It also keeps me sober about "one system does OLTP + OLAP" marketing: not impossible, but underneath there's necessarily some "two layouts, kept in sync" mechanism, and that sync is new complexity. **Much of data engineering is, in essence, maintaining a "second layout" of the same data — see that, and you'll know much better which physics problem your daily work is actually solving.**
