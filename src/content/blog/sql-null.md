---
title: "NULL 不是值,是「不知道」"
date: 2026-07-08
category: tech
description: "把 NULL 當成 0 或空字串,是無數 SQL bug 的源頭。NULL 不是一個值,是「不知道」——任何跟它比較的結果不是 TRUE 也不是 FALSE,而是第三種:UNKNOWN。搞懂三值邏輯,NOT IN 回空、AVG 分母不對、= NULL 篩不到這些坑會一次通。"
tags:
  - sql
  - concept
series: "SQL 我以為我懂"
seriesOrder: 3
comments: true
draft: false
---
[[sql-joins|上一篇]]的 LEFT JOIN,會幫沒配到的列補上 `NULL`。那個 `NULL` 就是這篇的主角——它是無數 SQL bug 的源頭,而根本原因只有一句:**`NULL` 不是一個值,是「不知道」。** 一旦你把它讀成「不知道」而不是「0」或「空字串」,一票怪事就全解釋得通了。

## 跟 NULL 比較,結果是第三種:UNKNOWN

因為 `NULL` 代表「不知道」,所以任何跟它的比較,答案也只能是「不知道」。`age = NULL` 不是 `TRUE`、也**不是 `FALSE`**,而是第三種邏輯值:`UNKNOWN`。**SQL 的邏輯有三個值,不是兩個:**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 220" role="img" aria-label="SQL 邏輯有三個值:TRUE 條件成立、FALSE 條件不成立、UNKNOWN 不知道。任何跟 NULL 的比較都落在 UNKNOWN。而 WHERE/ON/HAVING 只放行 TRUE,FALSE 和 UNKNOWN 都被丟掉,所以 = NULL 篩不到東西,要改用 IS NULL" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="20" y="28" fill="#9aa4b2" font-size="11" text-anchor="start" font-weight="bold">SQL 的邏輯有三個值(不是兩個)</text>
    <rect x="70" y="42" width="120" height="46" rx="7" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/>
    <text x="130" y="62" fill="#54b890" font-size="12" text-anchor="middle" font-weight="bold">TRUE</text>
    <text x="130" y="78" fill="#9aa4b2" font-size="8.5" text-anchor="middle">條件成立</text>
    <rect x="210" y="42" width="120" height="46" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/>
    <text x="270" y="62" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">FALSE</text>
    <text x="270" y="78" fill="#9aa4b2" font-size="8.5" text-anchor="middle">條件不成立</text>
    <rect x="350" y="42" width="160" height="46" rx="7" fill="#33291a" stroke="#d6a45c" stroke-width="1.7"/>
    <text x="430" y="62" fill="#d6a45c" font-size="12" text-anchor="middle" font-weight="bold">UNKNOWN</text>
    <text x="430" y="78" fill="#9aa4b2" font-size="8.5" text-anchor="middle">不知道</text>
    <text x="430" y="108" fill="#d6a45c" font-size="8.5" text-anchor="middle">↑ 任何跟 NULL 的比較都落這裡</text>
    <text x="430" y="120" fill="#9aa4b2" font-size="8" text-anchor="middle">age = NULL、age &lt;&gt; NULL 都是</text>
    <text x="20" y="152" fill="#9aa4b2" font-size="11" text-anchor="start" font-weight="bold">WHERE / ON / HAVING 只放行 TRUE</text>
    <rect x="70" y="166" width="120" height="38" rx="7" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/>
    <text x="130" y="189" fill="#54b890" font-size="10" text-anchor="middle">TRUE → ✓ 保留</text>
    <rect x="210" y="166" width="120" height="38" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="270" y="189" fill="#9aa4b2" font-size="10" text-anchor="middle">FALSE → ✗ 丟</text>
    <rect x="350" y="166" width="160" height="38" rx="7" fill="#1f2330" stroke="#d6a45c" stroke-width="1.3" stroke-dasharray="4 3"/>
    <text x="430" y="189" fill="#d6a45c" font-size="10" text-anchor="middle">UNKNOWN → ✗ 丟</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><code>= NULL</code> 得到的是 <code>UNKNOWN</code>,不是 <code>FALSE</code>;而 <code>WHERE</code> 只放行 <code>TRUE</code>,所以 <code>UNKNOWN</code> 跟 <code>FALSE</code> 一樣被丟。這就是為什麼 <code>WHERE age = NULL</code> 永遠篩不到東西——要改用 <code>IS NULL</code></figcaption>
</figure>

所以第一條鐵律:**判斷 NULL,只能用 `IS NULL` / `IS NOT NULL`,不能用 `= NULL` / `<> NULL`。** 後者不會報錯,只會默默永遠不成立——這正是它陰險的地方。

## 三值邏輯:UNKNOWN 會「傳染」

有了第三個值,`AND` / `OR` 的真值表就多了一整排。重點只有兩格要記:

| `AND` | TRUE | FALSE | UNKNOWN |
|---|---|---|---|
| **TRUE** | TRUE | FALSE | **UNKNOWN** |
| **FALSE** | FALSE | FALSE | **FALSE** |
| **UNKNOWN** | UNKNOWN | FALSE | UNKNOWN |

看這兩格就好:`TRUE AND UNKNOWN = UNKNOWN`(**一串 AND 只要摻進一個 UNKNOWN、又沒有任何 FALSE,結果就卡在 UNKNOWN,永遠到不了 TRUE**);而 `FALSE AND UNKNOWN = FALSE`(FALSE 有吸收性,能擋住傳染)。這條「UNKNOWN 會傳染」的規則,正是下面那個經典坑的根。

## 最陰險的坑:NOT IN 遇到 NULL 回空

這是我看過最多人栽、也最難自己看出來的一個。你想「找出不在黑名單裡的使用者」:

```sql
SELECT * FROM users
WHERE id NOT IN (SELECT blocked_id FROM blacklist);
```

只要那個子查詢**回傳的清單裡有一個 `NULL`**,這段就會**回傳空集合**——一筆都選不出來。為什麼?把 `NOT IN` 展開就看穿了:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 210" role="img" aria-label="x NOT IN (1, 2, NULL) 展開成 x<>1 AND x<>2 AND x<>NULL,以 x=5 代入求值得到 TRUE AND TRUE AND UNKNOWN,最後一項因為跟 NULL 比是 UNKNOWN,整串永遠到不了 TRUE,每一列都被 WHERE 丟掉,結果是空集合" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="nm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="196" y="14" width="188" height="30" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="290" y="34" fill="#e6e6e6" font-size="12" text-anchor="middle">x NOT IN (1, 2, NULL)</text>
    <line x1="290" y1="44" x2="290" y2="68" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#nm)"/>
    <text x="300" y="60" fill="#9aa4b2" font-size="8.5" text-anchor="start">展開成一串 AND</text>
    <rect x="157" y="70" width="54" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="184" y="90" fill="#e6e6e6" font-size="10" text-anchor="middle">x&lt;&gt;1</text>
    <text x="223" y="90" fill="#9aa4b2" font-size="9" text-anchor="middle">AND</text>
    <rect x="257" y="70" width="54" height="30" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/><text x="284" y="90" fill="#e6e6e6" font-size="10" text-anchor="middle">x&lt;&gt;2</text>
    <text x="323" y="90" fill="#9aa4b2" font-size="9" text-anchor="middle">AND</text>
    <rect x="357" y="70" width="66" height="30" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.6"/><text x="390" y="90" fill="#d6a45c" font-size="10" text-anchor="middle">x&lt;&gt;NULL</text>
    <line x1="290" y1="100" x2="290" y2="124" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#nm)"/>
    <text x="300" y="116" fill="#9aa4b2" font-size="8.5" text-anchor="start">代入 x=5 求值</text>
    <rect x="157" y="126" width="54" height="30" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="184" y="146" fill="#54b890" font-size="10" text-anchor="middle">TRUE</text>
    <text x="223" y="146" fill="#9aa4b2" font-size="9" text-anchor="middle">AND</text>
    <rect x="257" y="126" width="54" height="30" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="284" y="146" fill="#54b890" font-size="10" text-anchor="middle">TRUE</text>
    <text x="323" y="146" fill="#9aa4b2" font-size="9" text-anchor="middle">AND</text>
    <rect x="357" y="126" width="66" height="30" rx="5" fill="#33291a" stroke="#d6a45c" stroke-width="1.6"/><text x="390" y="146" fill="#d6a45c" font-size="10" text-anchor="middle">UNKNOWN</text>
    <line x1="290" y1="156" x2="290" y2="176" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#nm)"/>
    <rect x="110" y="178" width="360" height="28" rx="6" fill="#33291a" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="290" y="197" fill="#d6a45c" font-size="9.5" text-anchor="middle">整串永遠到不了 TRUE → 每一列都被丟 → 結果是空集合 ❌</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><code>NOT IN</code> 展開成一串 <code>AND</code>,只要清單裡有 <code>NULL</code>,就多一項 <code>x &lt;&gt; NULL = UNKNOWN</code>。由「UNKNOWN 會傳染」,整串卡在 UNKNOWN、到不了 TRUE,於是**每一列**都被淘汰</figcaption>
</figure>

修法有兩個,擇一:**改用 `NOT EXISTS`**(它不受 NULL 影響,語義也更清楚),或**在子查詢裡先 `WHERE blocked_id IS NOT NULL` 把 NULL 濾掉**。我的預設是前者:

```sql
SELECT * FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM blacklist b WHERE b.blocked_id = u.id
);
```

## 其他一定會遇到的 NULL 行為

同一個「NULL = 不知道」的原則,還延伸出一串你遲早會撞到的行為:

- **`COUNT(*)` 數所有列,`COUNT(col)` 只數非 NULL 的**——兩者差幾筆,就是那欄有幾個 NULL。
- **`SUM` / `AVG` / `MAX` 忽略 NULL**。注意 `AVG`:它的分母是「非 NULL 的筆數」,不是把 NULL 當 0 算——你以為的平均,可能不是你算的那個。
- **`GROUP BY` 把所有 NULL 併成同一組**(這裡 SQL 反而當它們「相等」,是個例外)。
- **`ORDER BY`**:PostgreSQL 預設 `ASC` 時 NULL 排**最後**,可用 `NULLS FIRST` / `NULLS LAST` 明講。
- **`UNIQUE` 約束允許多個 NULL**:因為 `NULL = NULL` 也是 UNKNOWN,兩個 NULL 不算「重複」。

## 防身工具

處理 NULL 有幾個很實用的工具,記起來:

```sql
COALESCE(x, 0)              -- x 是 NULL 就給預設值 0(可接多個候選)
NULLIF(a, b)               -- a = b 時回 NULL;常用來防除以零:x / NULLIF(y, 0)
x IS DISTINCT FROM y       -- null-safe 的「不等於」:把 NULL 當普通值比,NULL 跟 NULL 算相等
```

`IS DISTINCT FROM` 特別好用:當你要比較兩個「可能是 NULL」的欄位、又希望「兩邊都是 NULL 算相同」時,用它就不會掉進 UNKNOWN 的坑。

## 反思

### 把 NULL 讀成「不知道」,一整排坑一次填平

我剛學 SQL 時,把這些當成一條條要背的怪規則:`= NULL` 不行、`NOT IN` 會出事、`AVG` 忽略 NULL……後來發現它們是**同一個念頭的延伸**——NULL 是「不知道」,不是「0」也不是「空」。跟「不知道」比較,結果當然是「不知道」(UNKNOWN);對一堆「不知道」取平均,當然得先把「不知道」排除在外。一旦這個語義換過來,我不再需要背規則,而是能**推**出 NULL 在任何情境下的行為。這跟[[sql-execution-order|執行順序]]、[[sql-joins|JOIN]]那兩篇的收穫是同一種:**找到那個一以貫之的念頭,規則就退化成推論。**

### 最貴的 bug,是「跑得出來、還不報錯」那種

NULL 的坑幾乎都不會讓你的 query 報錯——`NOT IN` 默默回空、`AVG` 默默算錯、`= NULL` 默默篩不到。這跟[[sql-joins|上一篇]]的「LEFT JOIN 悄悄變 INNER」是同一種陰險:**能跑、不報錯、數字看起來也像對的,只是錯了。** 這類 bug 最貴,因為沒有紅字提醒你,往往是下游對數字對到懷疑人生才追回來。我因此養成一條反射:**只要條件裡出現 `NOT IN`,或對一個可能為 NULL 的欄位做比較,就先停下來問一句「這欄會不會有 NULL?」** 這一問,擋掉的 bug 比任何工具都多。

### 在源頭就把 NULL 的語義定清楚

寫 query 時被 NULL 咬,很多時候問題其實在更上游:這個欄位當初**為什麼**允許 NULL?而且更麻煩的是,NULL 常常一詞多義——同一欄的 NULL,可能是「還沒發生」、「不適用」、也可能是「資料遺失」。我現在設計 schema 或 pipeline,會盡量在源頭就把它講清楚:能不放 NULL 就用明確的預設值,真要放,也想清楚它代表哪一種「沒有」。**語義在源頭定清楚,下游才不用一路 `COALESCE` 猜它到底是什麼意思**——這跟我對資料建模一貫的態度一致:混亂往上游推一步解決,比在每個下游各補一塊補丁划算。
