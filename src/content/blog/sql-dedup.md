---
title: "去重的正確姿勢:DISTINCT 不是唯一解"
date: 2026-07-09
category: tech
description: "資料重複太常見——重複匯入、CDC 多版本、JOIN fan-out。但去重不是只有 DISTINCT,而且資料工程最常要的那種去重,DISTINCT 根本解不了。關鍵是先分清兩種『重複』:完全相同的列,和同一個 key 有多筆版本——後者要用 ROW_NUMBER 挑代表那筆。"
tags:
  - sql
  - data-engineering
series: "SQL 我以為我懂"
seriesOrder: 6
comments: true
draft: false
---
資料重複幾乎是資料工程的日常:pipeline 重跑重複匯入、CDC 把同一筆的多個版本都撈進來、[[sql-joins|JOIN 的 fan-out]] 把列複製。很多人一講到去重就 `DISTINCT`——但去重根本不只 `DISTINCT`,而且 DE 最常遇到的那種去重,`DISTINCT` 還真解不了。這篇先幫你把「重複」分成兩種,對症下藥;而第二種的解法,正是[[sql-window|上一篇]]那個 window function 的第一個實戰。

## 先分清楚:你要去哪一種「重複」

「重複」其實有兩種,對應完全不同的解法——分不清就會用錯工具:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 246" role="img" aria-label="兩種重複:左邊是完全相同的列,三筆 1 A 100 一模一樣,用 DISTINCT 或 GROUP BY 去掉多的;右邊是同一個 key 有多筆版本,user1 有待付、已付、退款三個不同狀態的列,DISTINCT 沒用,要用 ROW_NUMBER 挑代表(最新)那筆" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="dm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="295" y1="18" x2="295" y2="230" stroke="#3a4154" stroke-width="1.1" stroke-dasharray="5 4"/>
    <text x="150" y="26" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">① 完全相同的列</text>
    <rect x="62" y="38" width="176" height="24" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="150" y="54" fill="#9aa4b2" font-size="9.5" text-anchor="middle">(1, A, 100)</text>
    <rect x="62" y="65" width="176" height="24" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="150" y="81" fill="#9aa4b2" font-size="9.5" text-anchor="middle">(1, A, 100)</text>
    <rect x="62" y="92" width="176" height="24" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="150" y="108" fill="#9aa4b2" font-size="9.5" text-anchor="middle">(1, A, 100)</text>
    <line x1="150" y1="118" x2="150" y2="142" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#dm)"/>
    <text x="212" y="134" fill="#9aa4b2" font-size="8" text-anchor="middle">DISTINCT</text>
    <rect x="62" y="144" width="176" height="30" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="150" y="163" fill="#e6e6e6" font-size="9.5" text-anchor="middle">(1, A, 100)</text>
    <text x="150" y="200" fill="#9aa4b2" font-size="8.5" text-anchor="middle">整列一模一樣 → 去掉多的</text>
    <text x="150" y="214" fill="#54b890" font-size="8.5" text-anchor="middle">DISTINCT / GROUP BY 就能解</text>
    <text x="440" y="26" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">② 同一 key、多筆版本</text>
    <rect x="336" y="38" width="208" height="24" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="440" y="54" fill="#e6e6e6" font-size="9" text-anchor="middle">user1 · 待付 · 2/01</text>
    <rect x="336" y="65" width="208" height="24" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="440" y="81" fill="#e6e6e6" font-size="9" text-anchor="middle">user1 · 已付 · 2/03</text>
    <rect x="336" y="92" width="208" height="24" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="440" y="108" fill="#e6e6e6" font-size="9" text-anchor="middle">user1 · 退款 · 2/05</text>
    <line x1="440" y1="118" x2="440" y2="142" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#dm)"/>
    <text x="508" y="134" fill="#9aa4b2" font-size="8" text-anchor="middle">ROW_NUMBER 留最新</text>
    <rect x="336" y="144" width="208" height="30" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="440" y="163" fill="#e6e6e6" font-size="9" text-anchor="middle">user1 · 退款 · 2/05</text>
    <text x="440" y="200" fill="#d6a45c" font-size="8.5" text-anchor="middle">列不相同 → DISTINCT 沒用</text>
    <text x="440" y="214" fill="#9aa4b2" font-size="8.5" text-anchor="middle">要挑「代表」那一筆</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左邊三列一模一樣,<code>DISTINCT</code> 去掉多的就好;右邊是同一個 user 的三個版本,列並不相同,<code>DISTINCT</code> 一筆都去不掉——你要的是「每個 user 留最新那筆」,這得靠 <code>ROW_NUMBER</code></figcaption>
</figure>

搞混這兩種,是去重最常見的錯誤:對「多版本」的資料用 `DISTINCT`,結果一筆都沒少(因為每列真的都不同),還以為去重了。

## 完全相同的列:DISTINCT(和它的真面目)

第一種最單純,`DISTINCT` 或 `GROUP BY` 都行。但 `DISTINCT` 有個一定要知道的真相:**它是「整列」去重,不是「某欄」去重。**

```sql
SELECT DISTINCT user_id, status FROM events;
-- ⚠ 這是 (user_id, status) 的『組合』去重
-- 不是「user_id 去重、順便帶 status」——同一個 user 有兩種 status 就會留兩列
```

很多人以為 `DISTINCT user_id, status` 會「每個 user 一列」,其實它保留的是所有不同的 `(user_id, status)` 組合。另外,`DISTINCT` 其實就是 [[sql-group-by|GROUP BY 所有欄位]]的特例——所以當你想「去重的同時順便算個數」,直接用 `GROUP BY` 就好,不用先 `DISTINCT` 再包一層。

## 同一 key 留一筆:ROW_NUMBER 去重

這才是 DE 每天在做的去重:**同一個實體有多筆版本,我只要一筆(通常是最新的)。** 標準解法是 `ROW_NUMBER()`——用[[sql-window|上一篇]]的 window function 給每組編號,再留 1 號:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 232" role="img" aria-label="ROW_NUMBER 去重機制:PARTITION BY user_id 把列分成 user1 與 user2 兩組,各自依 updated_at DESC 排序編號。user1 的三列編 1 2 3,只有編號 1(2/05 退款)留下;user2 的兩列編 1 2,只有編號 1(2/04 已付)留下。WHERE rn=1 就是每組留排序後的第一筆" style="width:100%;max-width:580px;height:auto;margin:0 auto;">
    <text x="20" y="22" fill="#9aa4b2" font-size="9" text-anchor="start">PARTITION BY user_id = 1　·　ORDER BY updated_at DESC</text>
    <circle cx="40" cy="45" r="11" fill="#54b890" stroke="#54b890" stroke-width="1.2"/><text x="40" y="49" fill="#1f2330" font-size="10" text-anchor="middle" font-weight="bold">1</text>
    <rect x="66" y="32" width="300" height="26" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="80" y="49" fill="#e6e6e6" font-size="9.5" text-anchor="start">2/05 · 退款</text>
    <text x="410" y="49" fill="#54b890" font-size="9.5" text-anchor="start">✓ 留</text>
    <circle cx="40" cy="75" r="11" fill="none" stroke="#3a4154" stroke-width="1.3"/><text x="40" y="79" fill="#9aa4b2" font-size="10" text-anchor="middle">2</text>
    <rect x="66" y="62" width="300" height="26" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="80" y="79" fill="#9aa4b2" font-size="9.5" text-anchor="start">2/03 · 已付</text>
    <text x="410" y="79" fill="#9aa4b2" font-size="9.5" text-anchor="start">✗ 丟</text>
    <circle cx="40" cy="105" r="11" fill="none" stroke="#3a4154" stroke-width="1.3"/><text x="40" y="109" fill="#9aa4b2" font-size="10" text-anchor="middle">3</text>
    <rect x="66" y="92" width="300" height="26" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="80" y="109" fill="#9aa4b2" font-size="9.5" text-anchor="start">2/01 · 待付</text>
    <text x="410" y="109" fill="#9aa4b2" font-size="9.5" text-anchor="start">✗ 丟</text>
    <text x="20" y="146" fill="#9aa4b2" font-size="9" text-anchor="start">PARTITION BY user_id = 2　·　ORDER BY updated_at DESC</text>
    <circle cx="40" cy="169" r="11" fill="#54b890" stroke="#54b890" stroke-width="1.2"/><text x="40" y="173" fill="#1f2330" font-size="10" text-anchor="middle" font-weight="bold">1</text>
    <rect x="66" y="156" width="300" height="26" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="80" y="173" fill="#e6e6e6" font-size="9.5" text-anchor="start">2/04 · 已付</text>
    <text x="410" y="173" fill="#54b890" font-size="9.5" text-anchor="start">✓ 留</text>
    <circle cx="40" cy="199" r="11" fill="none" stroke="#3a4154" stroke-width="1.3"/><text x="40" y="203" fill="#9aa4b2" font-size="10" text-anchor="middle">2</text>
    <rect x="66" y="186" width="300" height="26" rx="5" fill="#1f2330" stroke="#3a4154" stroke-width="1.1"/><text x="80" y="203" fill="#9aa4b2" font-size="9.5" text-anchor="start">2/02 · 待付</text>
    <text x="410" y="203" fill="#9aa4b2" font-size="9.5" text-anchor="start">✗ 丟</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><code>PARTITION BY</code> 定義「誰算同一個」、<code>ORDER BY</code> 定義「誰算代表」、<code>rn = 1</code> 留下那筆。編號在每個 partition 各自從 1 開始——這就是「每個 user 留最新一筆」</figcaption>
</figure>

```sql
SELECT * FROM (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) AS rn
  FROM events
) t
WHERE rn = 1;   -- 每個 user 留最新那筆(接第一篇:window 不能放 WHERE,要包子查詢)
```

三個旋鈕對應三個問題:**`PARTITION BY`=「什麼算同一個」**(user?訂單?email?)、**`ORDER BY`=「哪一筆算代表」**(最新?金額最大?)、**`rn = 1`=「留代表」**。換掉這三個,就能表達幾乎任何「每組留一筆」的需求。

兩個補充:

- **`ROW_NUMBER` vs `RANK`**:`ROW_NUMBER` 保證每組**剛好一筆**(就算 `updated_at` 打平,也硬選一筆);`RANK` 遇到平手會留多筆。去重要唯一,幾乎都用 `ROW_NUMBER`——但要小心平手時它「選哪筆」是不定的,所以 `ORDER BY` 最好排到能決勝負(例如再加一個 `id DESC` 打破平手)。
- **PostgreSQL 有更短的寫法 `DISTINCT ON`**:

```sql
SELECT DISTINCT ON (user_id) *
FROM events
ORDER BY user_id, updated_at DESC;   -- 每個 user_id 留 ORDER BY 的第一筆
```

`DISTINCT ON` 是 PostgreSQL 專屬、很簡潔,但綁死 `ORDER BY` 要以那些欄位開頭,跨資料庫也不通用。要可攜、要更彈性(例如每組留前 N 名),還是 `ROW_NUMBER` 穩。

## 反思

### 去重的第一步,是先問「什麼算同一筆」

我看過太多去重 bug,根源都不是語法,而是**沒先定義清楚「重複」到底指什麼**。是整列一樣叫重複?還是同一個 email 就算同一人?還是同一張訂單的多次更新?這個定義沒講清楚,選工具就會錯——對「多版本」用 `DISTINCT`、或 `PARTITION BY` 的鍵選錯,去出來的結果全是錯的,還不會報錯。所以我現在動手去重前,一定先回答兩個問題:**「什麼欄位相同算同一筆(→ PARTITION BY)」、「同一筆裡留哪個版本(→ ORDER BY)」。** 把這兩題想清楚,SQL 幾乎是照抄。

### DISTINCT 不是你以為的「某欄去重」

`SELECT DISTINCT a, b` 是 `(a, b)` 組合去重,不是「a 去重順便帶 b」——這個誤解我看過無數次,而且它一樣是[[sql-null|那種]]「跑得出來、不報錯、只是結果多了幾列」的陰險 bug。真要「每個 a 留一列」,你要的從來不是 `DISTINCT`,而是 `ROW_NUMBER` 或 `DISTINCT ON`。**工具的名字聽起來對,不代表它做的事跟你想的一樣**——這也是這個系列一直在拆的:別被語感騙,要看它實際在幹嘛。

### 去重放在 pipeline 哪一層,比怎麼寫更重要

寫得出 `ROW_NUMBER` 去重之後,更值得想的是**「這個去重該發生在哪一層」**。同一份會重複的資料,你是每次查詢都即時去重(每次都付一次成本、還容易漏),還是在入湖/建模那一層就去乾淨、讓下游拿到的本來就唯一?我的傾向是後者:**把去重當成資料清理的一部分,盡量往上游做一次做乾淨**,而不是散在每個下游 query 各去一次。這跟我對 [[sql-null|NULL 語義]]、對 [[sql-joins|fan-out]] 的態度一致——**混亂在源頭解決一次,比在每個下游各補一塊補丁划算**。這也讓 pipeline 重跑時是冪等的:去重邏輯明確、跑幾次結果都一樣。
