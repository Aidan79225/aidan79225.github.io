---
title: "JOIN 的真相:先算笛卡爾積,再過濾"
date: 2026-07-08
category: tech
description: "很多人把 JOIN 想成「把兩張表黏起來」,還得背 INNER/LEFT/RIGHT 各是什麼。其實只要一個模型:所有 JOIN 都是先列出兩表所有列的組合(笛卡爾積),再用 ON 過濾。懂這句,連幾乎人人踩過的『LEFT JOIN 被 WHERE 悄悄變回 INNER』都一次看穿。"
tags:
  - sql
  - concept
series: "SQL 我以為我懂"
seriesOrder: 2
comments: true
draft: false
---
[[sql-execution-order|上一篇]]把「你寫的順序不是它跑的順序」講清楚了。這篇用同一把鑰匙拆穿 JOIN。很多人把 JOIN 想成「把兩張表黏在一起」,然後死背 INNER/LEFT/RIGHT/FULL 各自的行為。但其實它們**共用一個模型**:先列出兩表所有列的組合(笛卡爾積),再用 `ON` 過濾。懂這句,連最常見的 LEFT JOIN 陷阱都會一次看穿。

## 所有 JOIN 只有一個模型

概念上,`A JOIN B ON 條件` 做的是兩步:**① 把 A 的每一列,配上 B 的每一列(笛卡爾積);② 只留下「條件」成立的組合。** 差別只在「過濾後,要不要幫沒配到的列補一筆」:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 296" role="img" aria-label="左表三個使用者 A B C,右表三筆訂單分屬 A A B。把左表每列配右表每列成 3x3 格,key 相等的三格標綠(A 配到兩格、B 配到一格、C 配不到)。INNER 只留綠格共三列,LEFT 額外幫沒配到的 C 補一列 NULL 共四列" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="271" y="24" fill="#9aa4b2" font-size="9.5" text-anchor="middle">右表 R:訂單(user 欄)</text>
    <text x="189" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">A</text>
    <text x="271" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">A</text>
    <text x="353" y="52" fill="#9aa4b2" font-size="9" text-anchor="middle">B</text>
    <text x="20" y="158" fill="#9aa4b2" font-size="9.5" text-anchor="middle" transform="rotate(-90 20 158)">左表 L:使用者</text>
    <text x="92" y="98" fill="#e6e6e6" font-size="9.5" text-anchor="middle">使用者 A</text>
    <text x="92" y="162" fill="#e6e6e6" font-size="9.5" text-anchor="middle">使用者 B</text>
    <text x="92" y="226" fill="#e6e6e6" font-size="9.5" text-anchor="middle">使用者 C</text>
    <rect x="150" y="64" width="78" height="60" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="189" y="98" fill="#54b890" font-size="10" text-anchor="middle">✓</text>
    <rect x="232" y="64" width="78" height="60" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="271" y="98" fill="#54b890" font-size="10" text-anchor="middle">✓</text>
    <rect x="314" y="64" width="78" height="60" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="4 3"/>
    <rect x="150" y="128" width="78" height="60" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="4 3"/>
    <rect x="232" y="128" width="78" height="60" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="4 3"/>
    <rect x="314" y="128" width="78" height="60" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="353" y="162" fill="#54b890" font-size="10" text-anchor="middle">✓</text>
    <rect x="150" y="192" width="78" height="60" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="4 3"/>
    <rect x="232" y="192" width="78" height="60" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="4 3"/>
    <rect x="314" y="192" width="78" height="60" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="4 3"/>
    <text x="404" y="90" fill="#54b890" font-size="8.5" text-anchor="start">A 配到 2 筆</text>
    <text x="404" y="102" fill="#9aa4b2" font-size="8" text-anchor="start">→ 結果 A 出現兩次</text>
    <text x="404" y="160" fill="#9aa4b2" font-size="8.5" text-anchor="start">B 配到 1 筆</text>
    <text x="404" y="212" fill="#9aa4b2" font-size="8.5" text-anchor="start">C 配不到 →</text>
    <text x="404" y="224" fill="#9aa4b2" font-size="8" text-anchor="start">INNER 丟掉</text>
    <text x="404" y="236" fill="#d6a45c" font-size="8" text-anchor="start">LEFT 補 (C, NULL)</text>
    <rect x="150" y="266" width="13" height="11" rx="2" fill="#2e4a40" stroke="#54b890" stroke-width="1.2"/><text x="169" y="276" fill="#9aa4b2" font-size="8.5" text-anchor="start">ON 符合(留下)</text>
    <rect x="300" y="266" width="13" height="11" rx="2" fill="#1f2330" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="3 2"/><text x="319" y="276" fill="#9aa4b2" font-size="8.5" text-anchor="start">不符合(丟棄)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">把左表每列配右表每列(9 格),再用 <code>ON</code> 留下 key 相等的(綠格)。<b>INNER</b> = 只要綠格(3 列);<b>LEFT</b> = 綠格 + 幫沒配到的 C 補一列 <code>NULL</code>(4 列)。順帶注意:A 配到兩筆,結果就出現兩次——這是 join 的「放大」副作用</figcaption>
</figure>

有了這個模型,四種 JOIN 就不用背了,它們只是「過濾後保留哪側」的差別:

- **INNER**:只留綠格(兩邊都配得到的)。
- **LEFT**:保證**左表每列至少出現一次**,右邊沒配到就補 `NULL`。
- **RIGHT**:反過來,保證右表每列都在。
- **FULL**:兩邊都保,誰沒配到誰補 `NULL`。
- **CROSS**:根本不過濾,就是那張完整的笛卡爾積(9 格全要)。

還有一個一定要記的副作用:**一對多會讓列數變多(fan-out)。** 上圖 A 配到 2 筆訂單,結果 A 就出現 2 列。這在你 join 完又 `SUM` 時會**重複計算**——是報表金額莫名變大的經典元兇。

## 那笛卡爾積,不會把記憶體撐爆嗎?

這是「笛卡爾積再過濾」最容易嚇到人的地方:兩張各一百萬列的表,乘起來是 10^12 列——真要算出來,哪台機器扛得住?**好消息是:那個乘積是「邏輯模型」,是幫你想對答案用的,引擎從不會真的把它物化出來。** 優化器會挑一種 join 演算法,**邊配對邊把不符的丟掉,整個乘積從頭到尾不落地**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 200" role="img" aria-label="左邊是腦中的邏輯模型:N×M 所有組合全展開再過濾,標註引擎不會真的算出這張表;右邊是引擎實際做的,以 Hash Join 為例:把小表建成 hash 表放進記憶體,大表逐列比對後吐出符合的列,記憶體正比於小表而不是 N×M" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="jm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="300" y1="28" x2="300" y2="184" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="5 4"/>
    <text x="150" y="40" fill="#9aa4b2" font-size="10.5" text-anchor="middle" font-weight="bold">腦中的模型(邏輯)</text>
    <rect x="38" y="56" width="224" height="86" rx="8" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="5 4"/>
    <text x="150" y="94" fill="#9aa4b2" font-size="17" text-anchor="middle">N × M</text>
    <text x="150" y="114" fill="#9aa4b2" font-size="8.8" text-anchor="middle">所有組合全展開 → 再用 ON 篩</text>
    <text x="150" y="170" fill="#d6a45c" font-size="9.5" text-anchor="middle">⚠ 引擎不會真的算出這張表</text>
    <text x="452" y="40" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">引擎實際做的(例:Hash Join)</text>
    <rect x="322" y="56" width="76" height="30" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="360" y="75" fill="#e6e6e6" font-size="9.5" text-anchor="middle">小表 R</text>
    <line x1="400" y1="71" x2="428" y2="71" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#jm)"/>
    <rect x="432" y="56" width="150" height="30" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <text x="507" y="75" fill="#e6e6e6" font-size="8.8" text-anchor="middle">建 Hash 表(進記憶體)</text>
    <rect x="322" y="104" width="76" height="30" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="360" y="123" fill="#e6e6e6" font-size="9.5" text-anchor="middle">大表 L</text>
    <line x1="400" y1="119" x2="428" y2="119" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#jm)"/>
    <rect x="432" y="104" width="150" height="30" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="507" y="123" fill="#e6e6e6" font-size="8.5" text-anchor="middle">逐列比對 → 吐出符合列</text>
    <line x1="507" y1="104" x2="507" y2="88" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#jm)"/>
    <text x="452" y="170" fill="#54b890" font-size="9.5" text-anchor="middle">記憶體 ∝ 小表,不是 N × M ✓</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左邊那張 N×M 的表只存在你腦中,幫你推導答案;引擎實際是挑一種演算法(這裡以 Hash Join 為例),邊配對邊丟,乘積從不落地。所以單一個 join,不會吃 N×M 的記憶體</figcaption>
</figure>

那 join 到底吃不吃記憶體?吃,但成本不在「乘積」,而在這兩個地方。

**一、join 演算法本身。** 優化器會依表的大小、有沒有索引、有沒有排好序,挑一種做法,而它們的記憶體胃口差很多:

- **Nested Loop**:外表每一列,去內表逐一找。幾乎不吃額外記憶體,但沒索引時很慢——適合小表,或內表剛好有索引可查。
- **Hash Join**:把**較小那側**建成一個 hash 表塞進記憶體,大表流過來比對。記憶體 ∝ **小表大小**,這是 join 最常見的吃記憶體點。
- **Merge Join**:要求兩側**已排序**;沒排好就得先排,而排序用的 buffer 也吃記憶體。

(這三種怎麼在 `EXPLAIN` 裡認出來、優化器憑什麼挑,是這個系列後面會專門講的一篇。這裡先抓一句就好:**join 的記憶體主要來自 hash 表和排序,不是那個乘積。**)

**二、fan-out 把結果撐大。** join 本身不物化乘積,但一對多把**輸出**列數放大是實實在在的:A 配到 100 筆,結果就有 100 列。這個放大後的結果真的存在,接下來你再 `ORDER BY`、`GROUP BY` 它,排序和聚合就得處理更多資料。**所以 join 的記憶體痛點,常常不在 join 那一步,而在它放大後餵給下游那一步。**

在 **PostgreSQL**,hash 表和排序這些節點能用多少記憶體,由 `work_mem` 這個參數管。**吃超過上限,它會 spill 到磁碟**(寫暫存檔)——結果是變慢,不是直接 OOM,這是它的安全閥。要小心的反而是另一頭:`work_mem` 開太大、又有很多節點平行跑,加起來才可能真的把整台機器的記憶體吃爆。

你其實在 [[spark-shuffle|Spark 那篇]]已經看過這件事的極端版:**broadcast join 把小表複製到每一個 executor**,本質就是「Hash Join 的 build 側」搬到分散式——小表太大,每台的記憶體會一起爆。單機的 `work_mem` spill、分散式的 broadcast 上限,是同一個道理的兩種尺度。

## 那個幾乎人人踩過的 LEFT JOIN 陷阱

你想「列出**所有**使用者,連同他們**已付款**的訂單,沒訂單的使用者也要留著」。很自然會這樣寫:

```sql
SELECT u.id, o.amount
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.status = 'paid';   -- ❌ 沒訂單的使用者,在這裡被砍光了
```

跑出來你會發現:**沒訂單的使用者全不見了**,LEFT JOIN 好像沒作用。原因正是[[sql-execution-order|上一篇]]那張執行順序圖——**`WHERE` 在 `JOIN` 之後才跑**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 186" role="img" aria-label="LEFT JOIN 先產出 A A B 與補了 NULL 的 C。條件放 WHERE 時 join 之後才跑,C 的 NULL 不符 status 條件被砍,退化成 INNER;條件放 ON 時 join 當下就篩,C 保留,還是 LEFT" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="20" y="46" fill="#e0733a" font-size="11" text-anchor="start" font-weight="bold">條件放 WHERE</text>
    <text x="20" y="61" fill="#9aa4b2" font-size="8" text-anchor="start">WHERE 在 join 之後才跑</text>
    <rect x="300" y="34" width="40" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="320" y="52" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A</text>
    <rect x="346" y="34" width="40" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="366" y="52" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A</text>
    <rect x="392" y="34" width="40" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="412" y="52" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B</text>
    <rect x="438" y="34" width="52" height="28" rx="4" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="4 3"/><text x="464" y="52" fill="#9aa4b2" font-size="8.5" text-anchor="middle">C·NULL ✗</text>
    <text x="500" y="52" fill="#e0733a" font-size="9.5" text-anchor="start" font-weight="bold">❌ 退化成 INNER</text>
    <line x1="20" y1="92" x2="580" y2="92" stroke="#3a4154" stroke-width="1"/>
    <text x="20" y="122" fill="#54b890" font-size="11" text-anchor="start" font-weight="bold">條件放 ON</text>
    <text x="20" y="137" fill="#9aa4b2" font-size="8" text-anchor="start">ON 在 join 當下就篩</text>
    <rect x="300" y="110" width="40" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="320" y="128" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A</text>
    <rect x="346" y="110" width="40" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="366" y="128" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A</text>
    <rect x="392" y="110" width="40" height="28" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="412" y="128" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B</text>
    <rect x="438" y="110" width="52" height="28" rx="4" fill="#262b3a" stroke="#d6a45c" stroke-width="1.3" stroke-dasharray="4 3"/><text x="464" y="128" fill="#d6a45c" font-size="8.5" text-anchor="middle">C·NULL ✓</text>
    <text x="500" y="128" fill="#54b890" font-size="9.5" text-anchor="start" font-weight="bold">✅ 還是 LEFT</text>
    <text x="20" y="170" fill="#9aa4b2" font-size="8.5" text-anchor="start">同一個 query,條件放哪裡,結果差一整種 join —— 因為過濾發生的「時機」不同</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">LEFT JOIN 先幫沒訂單的 C 補上 <code>NULL</code>。條件放 <code>WHERE</code>,它在 join 之後跑,<code>NULL = 'paid'</code> 不成立,C 被砍 → 悄悄變回 INNER。放進 <code>ON</code>,過濾在 join 當下發生,C 就留得住</figcaption>
</figure>

修法是把「對右表的條件」搬進 `ON`,讓它在 join 當下就參與過濾,而不是等 join 完再用 `WHERE` 砍:

```sql
SELECT u.id, o.amount
FROM users u
LEFT JOIN orders o
  ON o.user_id = u.id AND o.status = 'paid';  -- ✅ 所有使用者都留著
```

一句判準記起來:**對「要保留全部」那側(LEFT 的左表)的過濾,放 `WHERE` 沒問題;對「可有可無」那側(右表)的過濾,要放 `ON`,不然就把 LEFT 打回 INNER。**

## 反思

### JOIN 不是「黏表」,是「組合再過濾」

我剛學 SQL 時,INNER/LEFT/RIGHT/FULL 是四條各自要背的規則,還常常搞混 LEFT 到底保留哪邊。真正讓我不再背的,是換成「笛卡爾積再過濾」這個單一模型——四種 JOIN 只是同一件事「過濾後保留哪側」的四種選擇。這跟[[sql-execution-order|上一篇]]的收穫是同一種:**把一堆要死記的規則,還原成一個能推導的機制。** 一旦模型對了,你不只是「記得」LEFT 怎麼運作,而是「能算出」任何 join 會吐什麼——包括那些奇怪的邊界情況。

### LEFT JOIN 退化成 INNER,是我 code review 最常抓到的 bug

這個坑陰險在於:**它跑得出來、不報錯、數字看起來也「像對的」**,只是悄悄少了一批資料。我 review 別人的報表 SQL,只要看到「LEFT JOIN + 又在 WHERE 篩右表欄位」,幾乎都會停下來問一句「你確定不想留沒配到的那些嗎?」十次有七八次是 bug。而它的根,就是[[sql-execution-order|執行順序]]:`WHERE` 在 join 之後。這也是為什麼執行順序那篇這麼關鍵——**很多 SQL bug 不是語法錯,是你對『什麼時候發生』的直覺錯了。**

### join 完要 SUM 之前,先數一下列數

fan-out(一對多讓列數相乘)是另一個「跑得出來但算錯」的經典。我養成一個習慣:**任何 join 之前,先問一句「這個 key 在右表是唯一的嗎?」** 不唯一,就代表 join 後左表那側的列會被複製,這時直接 `SUM` 就會重複計算。解法通常是「先把右表聚合成一列、再 join」,或改用 window function。這個「先確認基數(cardinality)再 join」的習慣,幫我擋掉太多金額對不起來的怪事——**在資料的世界,能跑出數字從來不等於數字是對的。**
