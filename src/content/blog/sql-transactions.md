---
title: "交易與隔離層級:併發不打架的分級"
date: 2026-07-11
category: tech
description: "前面幾篇講一個查詢怎麼跑得快,這篇講『很多交易同時跑』怎麼不打架。ACID 裡真正有趣的是 I(隔離):併發會冒出髒讀、不可重複讀、幻讀三種怪事,而四個隔離層級就是一條讓你在『安全 vs 效能』之間選點的光譜。順帶看 PostgreSQL 怎麼用 MVCC 做到讀不擋寫,以及死鎖怎麼來、怎麼躲。"
tags:
  - sql
  - concept
series: "SQL 我以為我懂"
seriesOrder: 11
comments: true
draft: false
---
第三幕的最後一篇。前面講的都是「一個查詢怎麼跑得快」([[sql-index|索引]]、[[sql-explain|EXPLAIN]]),這篇換個維度:**很多交易同時跑,怎麼不互相打架?** 這就是交易與隔離層級。(這裡講**單機 PostgreSQL** 的實務;分散式交易與一致性,交給姊妹作 [[ddia-reliable-scalable|DDIA 系列]]往下深入,兩邊不重複。)

## ACID:重點其實是 I(隔離)

交易的 ACID 四個字母:**A**tomicity(全成或全不成)、**C**onsistency(不破壞約束)、**I**solation(併發互不干擾)、**D**urability(commit 了就不會丟)。其中三個相對直覺,真正有趣、也最常出包的是 **Isolation(隔離)**——因為「完美隔離」很貴,於是它被切成好幾級讓你選。

## 併發會冒出的三種怪事

兩個交易同時跑,如果隔離不夠,會出現三種經典的讀取異常。用一個具體場景就很有感——你(T1)在查一個帳戶餘額,而另一個人(T2)同時在操作它:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 260" role="img" aria-label="三種讀取異常的時間軸,以查帳戶餘額與訂單為例。髒讀:T2 把餘額改成 200 但尚未提交,T1 就讀到 200,而 T2 隨後 ROLLBACK,T1 讀到的是從未存在的假數字。不可重複讀:T1 先讀餘額 100,T2 把餘額改成 200 並提交,T1 同一交易內再讀變成 200。幻讀:T1 查到 3 筆訂單,T2 插入一筆符合條件的訂單並提交,T1 再查變 4 筆。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="20" y="34" fill="#e6e6e6" font-size="10" text-anchor="start" font-weight="bold">① Dirty Read 髒讀</text>
    <line x1="56" y1="52" x2="560" y2="52" stroke="#2a3040" stroke-width="1"/>
    <line x1="56" y1="74" x2="560" y2="74" stroke="#2a3040" stroke-width="1"/>
    <text x="34" y="55" fill="#9aa4b2" font-size="8" text-anchor="middle">T1</text>
    <text x="34" y="77" fill="#9aa4b2" font-size="8" text-anchor="middle">T2</text>
    <rect x="72" y="64" width="120" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="132" y="78" fill="#e6e6e6" font-size="7.6" text-anchor="middle">餘額改 200(未提交)</text>
    <rect x="250" y="42" width="96" height="20" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="298" y="56" fill="#e0733a" font-size="7.6" text-anchor="middle">讀到餘額 200 ❌</text>
    <rect x="400" y="64" width="80" height="20" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="440" y="78" fill="#e0733a" font-size="7.6" text-anchor="middle">ROLLBACK</text>
    <text x="20" y="110" fill="#e6e6e6" font-size="10" text-anchor="start" font-weight="bold">② Non-repeatable Read 不可重複讀</text>
    <line x1="56" y1="130" x2="560" y2="130" stroke="#2a3040" stroke-width="1"/>
    <line x1="56" y1="152" x2="560" y2="152" stroke="#2a3040" stroke-width="1"/>
    <text x="34" y="133" fill="#9aa4b2" font-size="8" text-anchor="middle">T1</text>
    <text x="34" y="155" fill="#9aa4b2" font-size="8" text-anchor="middle">T2</text>
    <rect x="72" y="120" width="80" height="20" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.1"/><text x="112" y="134" fill="#e6e6e6" font-size="7.6" text-anchor="middle">讀餘額 100</text>
    <rect x="210" y="142" width="122" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="271" y="156" fill="#e6e6e6" font-size="7.6" text-anchor="middle">餘額改 200 並提交</text>
    <rect x="360" y="120" width="110" height="20" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="415" y="134" fill="#e0733a" font-size="7.6" text-anchor="middle">又讀餘額 200 ❌</text>
    <line x1="345" y1="122" x2="345" y2="160" stroke="#d6a45c" stroke-width="1" stroke-dasharray="3 2"/>
    <text x="20" y="188" fill="#e6e6e6" font-size="10" text-anchor="start" font-weight="bold">③ Phantom Read 幻讀</text>
    <line x1="56" y1="206" x2="560" y2="206" stroke="#2a3040" stroke-width="1"/>
    <line x1="56" y1="228" x2="560" y2="228" stroke="#2a3040" stroke-width="1"/>
    <text x="34" y="209" fill="#9aa4b2" font-size="8" text-anchor="middle">T1</text>
    <text x="34" y="231" fill="#9aa4b2" font-size="8" text-anchor="middle">T2</text>
    <rect x="72" y="196" width="80" height="20" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.1"/><text x="112" y="210" fill="#e6e6e6" font-size="7.6" text-anchor="middle">查到 3 筆訂單</text>
    <rect x="200" y="218" width="142" height="20" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="271" y="232" fill="#e6e6e6" font-size="7.6" text-anchor="middle">插入 1 筆符合訂單並提交</text>
    <rect x="360" y="196" width="110" height="20" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="415" y="210" fill="#e0733a" font-size="7.6" text-anchor="middle">又查到 4 筆 ❌</text>
    <line x1="345" y1="198" x2="345" y2="236" stroke="#d6a45c" stroke-width="1" stroke-dasharray="3 2"/>
    <text x="558" y="252" fill="#9aa4b2" font-size="7.5" text-anchor="end">時間 →</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e0733a">髒讀</b>:讀到別人還沒 commit(還可能 rollback)的值;<b style="color:#e0733a">不可重複讀</b>:同一列讀兩次、值被別人改了;<b style="color:#e0733a">幻讀</b>:同一查詢兩次、列數被別人 insert 改了。三者嚴重度遞增</figcaption>
</figure>

三個放進場景就一目了然:

- **髒讀**:T2 把餘額改成 200、但**還沒 commit**,你就讀到了 200——結果 T2 交易失敗 `ROLLBACK`,那個 200 **從來沒真正存在過**。你卻已經拿一個「幽靈數字」做了決定(例如判斷「餘額夠、放行提款」)。
- **不可重複讀**:你在**同一筆交易**裡查了兩次餘額,第一次 100、第二次 200(中間 T2 提交了一筆轉帳)。你的邏輯本來假設「同一交易內、同一列的值不會變」,這下對帳、加總全亂套。
- **幻讀**:你統計「今天所有訂單」先算到 3 筆,T2 插了一筆新訂單並提交,你再查變 4 筆。**跟不可重複讀的差別很關鍵**:不可重複讀是「**既有的列被改了值**」,幻讀是「**憑空冒出/消失了整列**」——一個管 `UPDATE`、一個管 `INSERT`/`DELETE`,所以要擋的手法也不同(擋幻讀要鎖住「範圍」,而不只是「那幾列」)。

## 四個隔離層級:一條「安全 vs 效能」光譜

隔離層級,就是「我願意容忍上面哪幾種怪事,換取多少併發效能」的分級。越嚴越安全,但併發能力越低:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 208" role="img" aria-label="隔離層級對照表。Read Uncommitted:髒讀、不可重複讀、幻讀都可能。Read Committed(PG 預設):防髒讀,不可重複讀與幻讀仍可能。Repeatable Read:三者都防(PostgreSQL 用 MVCC 連幻讀也擋)。Serializable:全防。越往下越安全,但併發效能越低。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="105" y="38" fill="#9aa4b2" font-size="8.5" text-anchor="middle" font-weight="bold">隔離層級</text>
    <text x="250" y="38" fill="#9aa4b2" font-size="8.5" text-anchor="middle" font-weight="bold">髒讀</text>
    <text x="350" y="38" fill="#9aa4b2" font-size="8.5" text-anchor="middle" font-weight="bold">不可重複讀</text>
    <text x="460" y="38" fill="#9aa4b2" font-size="8.5" text-anchor="middle" font-weight="bold">幻讀</text>
    <rect x="24" y="46" width="500" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="105" y="65" fill="#e6e6e6" font-size="8.7" text-anchor="middle">Read Uncommitted</text>
    <text x="250" y="65" fill="#e0733a" font-size="8.5" text-anchor="middle">可能</text><text x="350" y="65" fill="#e0733a" font-size="8.5" text-anchor="middle">可能</text><text x="460" y="65" fill="#e0733a" font-size="8.5" text-anchor="middle">可能</text>
    <rect x="24" y="80" width="500" height="30" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="105" y="99" fill="#e6e6e6" font-size="8.7" text-anchor="middle">Read Committed(PG 預設)</text>
    <text x="250" y="99" fill="#54b890" font-size="8.5" text-anchor="middle">防止</text><text x="350" y="99" fill="#e0733a" font-size="8.5" text-anchor="middle">可能</text><text x="460" y="99" fill="#e0733a" font-size="8.5" text-anchor="middle">可能</text>
    <rect x="24" y="114" width="500" height="30" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="105" y="133" fill="#e6e6e6" font-size="8.7" text-anchor="middle">Repeatable Read</text>
    <text x="250" y="133" fill="#54b890" font-size="8.5" text-anchor="middle">防止</text><text x="350" y="133" fill="#54b890" font-size="8.5" text-anchor="middle">防止</text><text x="460" y="133" fill="#54b890" font-size="8.5" text-anchor="middle">防止*</text>
    <rect x="24" y="148" width="500" height="30" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="105" y="167" fill="#e6e6e6" font-size="8.7" text-anchor="middle">Serializable</text>
    <text x="250" y="167" fill="#54b890" font-size="8.5" text-anchor="middle">防止</text><text x="350" y="167" fill="#54b890" font-size="8.5" text-anchor="middle">防止</text><text x="460" y="167" fill="#54b890" font-size="8.5" text-anchor="middle">防止</text>
    <text x="290" y="197" fill="#9aa4b2" font-size="8" text-anchor="middle">↓ 越往下越安全,但併發效能越低。* PG 的 Repeatable Read 用 MVCC 連幻讀也擋掉(標準只要求擋前兩個)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">四級由鬆到嚴。PostgreSQL 最低就是 <code>Read Committed</code>(不提供 Read Uncommitted)、也是預設;多數 OLTP 用它就夠,真的需要一致性的地方(轉帳、扣庫存)再升到 Repeatable Read 或 Serializable</figcaption>
</figure>

## MVCC:PostgreSQL 怎麼做到「讀不擋寫」

你可能會問:要防這些異常,不就是加鎖、讓大家排隊?那併發不就慘了?PostgreSQL 的答案是 **MVCC(多版本併發控制)**:**每次 `UPDATE` 不是就地改,而是產生一個新版本的列**;而每個交易讀取時,看到的是**它開始那一刻的快照**。於是「讀」永遠讀得到一個一致的舊版本,不必等「寫」放鎖——**讀不擋寫、寫不擋讀**,併發大幅提升。這也是為什麼 PG 的 Repeatable Read 能順便擋掉幻讀:整個交易都看同一個快照。(MVCC 背後那套「保留多版本」的儲存機制,正是 [[ddia-reliable-scalable|DDIA]] 儲存與交易那幾章會深入的。)

## 死鎖 Deadlock:循環等待

併發還有一個經典麻煩:**死鎖**。T1 鎖了 A、想再鎖 B;T2 鎖了 B、想再鎖 A——兩邊互相等對方放手,誰也動不了。資料庫會**偵測到這個循環,然後殺掉其中一個交易**(回傳 deadlock 錯誤),讓另一個過。避免的關鍵招數很樸素:**讓所有交易用固定的順序加鎖**(例如永遠先鎖 id 小的),循環就構不成。

## 反思

### 隔離層級是一條你要「自己選」的光譜

我以前直覺覺得「當然選最安全的 Serializable」,後來才懂這是錯的——**最安全也最慢**,併發一高就一堆交易被迫序列化、互相卡。正確的心態是:知道每一級「放行了哪些異常」,然後在**真的會出事的地方**(轉帳、扣庫存、搶票)才升級,其餘用預設的 Read Committed。這跟 [[sre-intro|SRE 的 error budget]] 是同一種思維:**不是追求極致,是選一個對得起場景的取捨點。** 無腦拉到最高,跟無腦不管,都是沒想清楚。

### MVCC 把「衝突」從「當下互斥」變成「版本管理」

MVCC 的「讀不擋寫」第一次看很反直覺,想通之後覺得很漂亮:它沒有用「大家排隊搶一份資料」來解衝突,而是**保留多個版本、讓每個交易看自己該看的快照**。衝突於是從「當下你死我活的互斥」,變成「井然有序的版本管理」。這個轉念影響很深——很多現代系統的併發設計(包括 [[ddia-reliable-scalable|DDIA]] 後面講的分散式一致性)骨子裡都是這套「多版本 + 快照」的變形。**把互斥換成版本,是併發設計裡投報率極高的一招。**

### 死鎖不是靠運氣躲,是靠「固定順序」

死鎖的解法讓我學到一個更通用的道理:**很多看似隨機、難重現的併發 bug,根源是缺一個一致的順序。** 兩個交易以不同順序搶同幾把鎖,遲早撞成循環;而只要全系統約定「永遠照同一個順序加鎖」,循環在數學上就不可能成立。這跟我在 [[sql-execution-order|執行順序那篇]]的體會、甚至跟 [[sre-intro|團隊需要一把公認的尺]]是同一件事——**一致的順序/標準,常常是把混亂變可控的最省力解法。** 併發如此,協作也是如此。
