---
title: "你寫的 SQL 不是照你寫的順序跑"
date: 2026-07-07
category: tech
description: "大家寫 SQL 都是 SELECT 開頭,於是以為它從 SELECT 開始跑——但其實 SELECT 幾乎最後才執行。搞懂真正的邏輯執行順序 FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY→LIMIT,一票「為什麼這樣寫會錯」的謎題會一次解開。"
tags:
  - sql
  - concept
series: "SQL 我以為我懂"
seriesOrder: 1
comments: true
draft: false
---
你寫 SQL,幾乎都是 `SELECT` 開頭。寫久了很自然會以為:它就是**從 `SELECT` 開始跑**的。但不是——SQL 是宣告式的,你寫的是「要什麼」,引擎自己決定「怎麼跑、照什麼順序跑」,而**它跑的順序跟你寫的順序差很多**。這篇就把這個順序刻進腦子,後面一票「為什麼這樣寫會錯」的謎題,會一次全解開。

## 你這樣寫,它不這樣跑

你習慣的書寫順序是 `SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT`。但引擎真正的**邏輯執行順序**是這樣:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 330" role="img" aria-label="左欄是你書寫的順序 SELECT 在最上面,右欄是實際邏輯執行順序 FROM①→WHERE②→GROUP BY③→HAVING④→SELECT⑤→ORDER BY⑥→LIMIT⑦。SELECT 寫在最前卻第五個才跑,用一條藍線標出這個大跳躍" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="99" y="24" fill="#9aa4b2" font-size="10.5" text-anchor="middle" font-weight="bold">你這樣寫</text>
    <text x="461" y="24" fill="#9aa4b2" font-size="10.5" text-anchor="middle" font-weight="bold">DB 這樣跑(邏輯順序)</text>
    <line x1="174" y1="54" x2="386" y2="214" stroke="#4f6df5" stroke-width="1.9"/>
    <line x1="174" y1="94" x2="386" y2="54" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="174" y1="134" x2="386" y2="94" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="174" y1="174" x2="386" y2="134" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="174" y1="214" x2="386" y2="174" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="174" y1="254" x2="386" y2="254" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="174" y1="294" x2="386" y2="294" stroke="#3a4154" stroke-width="1.2"/>
    <rect x="24" y="38" width="150" height="32" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="99" y="59" fill="#4f6df5" font-size="11.5" text-anchor="middle" font-weight="bold">SELECT</text>
    <rect x="24" y="78" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="99" y="99" fill="#e6e6e6" font-size="11" text-anchor="middle">FROM / JOIN</text>
    <rect x="24" y="118" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="99" y="139" fill="#e6e6e6" font-size="11" text-anchor="middle">WHERE</text>
    <rect x="24" y="158" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="99" y="179" fill="#e6e6e6" font-size="11" text-anchor="middle">GROUP BY</text>
    <rect x="24" y="198" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="99" y="219" fill="#e6e6e6" font-size="11" text-anchor="middle">HAVING</text>
    <rect x="24" y="238" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="99" y="259" fill="#e6e6e6" font-size="11" text-anchor="middle">ORDER BY</text>
    <rect x="24" y="278" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="99" y="299" fill="#e6e6e6" font-size="11" text-anchor="middle">LIMIT</text>
    <rect x="386" y="38" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="461" y="59" fill="#e6e6e6" font-size="11" text-anchor="middle">① FROM / JOIN</text>
    <rect x="386" y="78" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="461" y="99" fill="#e6e6e6" font-size="11" text-anchor="middle">② WHERE</text>
    <rect x="386" y="118" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="461" y="139" fill="#e6e6e6" font-size="11" text-anchor="middle">③ GROUP BY</text>
    <rect x="386" y="158" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="461" y="179" fill="#e6e6e6" font-size="11" text-anchor="middle">④ HAVING</text>
    <rect x="386" y="198" width="150" height="32" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="461" y="219" fill="#4f6df5" font-size="11.5" text-anchor="middle" font-weight="bold">⑤ SELECT</text>
    <rect x="386" y="238" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="461" y="259" fill="#e6e6e6" font-size="11" text-anchor="middle">⑥ ORDER BY</text>
    <rect x="386" y="278" width="150" height="32" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="461" y="299" fill="#e6e6e6" font-size="11" text-anchor="middle">⑦ LIMIT</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">你習慣 <code>SELECT</code> 開頭,但它幾乎最後才跑(第 5 位)。真正的順序是 FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY→LIMIT——記住這條線,下面一票「為什麼會錯」就自己解開了</figcaption>
</figure>

一句話記住:**先決定「從哪來、留哪些列」,再「分組、篩組」,然後才「算出你要的欄位」,最後排序、取數。** `SELECT` 只是你寫在最前面,它其實排在第五。

## 一次解開三個「為什麼」

這個順序不是冷知識,它直接解釋了三個幾乎每個人都踩過的坑。

**為什麼 `WHERE` 不能用 `SELECT` 取的別名?** 因為 `WHERE`(②)比 `SELECT`(⑤)早跑,別名那時候**還不存在**:

```sql
SELECT price * qty AS revenue
FROM orders
WHERE revenue > 1000;   -- ❌ revenue 此時還沒被算出來

SELECT price * qty AS revenue
FROM orders
WHERE price * qty > 1000;  -- ✅ 直接寫算式(或包一層子查詢/CTE)
```

**為什麼同一個別名,`ORDER BY` 卻可以用?** 因為 `ORDER BY`(⑥)比 `SELECT`(⑤)**晚**跑,這時 `revenue` 已經誕生了:

```sql
SELECT price * qty AS revenue
FROM orders
ORDER BY revenue DESC;   -- ✅ 排序時別名已存在
```

**為什麼 window function 不能塞進 `WHERE`?** 同一個道理——window function 在 `SELECT`(⑤)階段才計算,`WHERE`(②)時它根本還沒發生:

```sql
-- ❌ 想「只留每類排名第一」,但 WHERE 時 rn 還沒算出來
SELECT *, ROW_NUMBER() OVER (PARTITION BY cat ORDER BY sales DESC) AS rn
FROM products
WHERE rn = 1;

-- ✅ 標準解法:包成子查詢,在外層才篩
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY cat ORDER BY sales DESC) AS rn
  FROM products
) t
WHERE rn = 1;
```

那個「為什麼 window 一定要包一層子查詢」的千古疑問,答案就是這張圖:它算得比 `WHERE` 晚。(window function 是[[sql-window|系列第 5 篇]]的主角,這裡先知道它的位置。)

## WHERE 篩「列」,HAVING 篩「組」

順序也一次講清楚 `WHERE` 和 `HAVING` 的差別:一個在分組前、一個在分組後,所以它們過濾的東西根本不同:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 230" role="img" aria-label="上排 WHERE 逐列過濾發生在分組前,五個列有兩個被剔除;中間 GROUP BY 把剩下的列收合成組;下排 HAVING 逐組過濾發生在分組後,三個組有一個因總額不足被剔除" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="24" y="28" fill="#54b890" font-size="11" text-anchor="start" font-weight="bold">WHERE ·逐列過濾(分組前 ②)</text>
    <rect x="150" y="40" width="60" height="30" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="180" y="59" fill="#e6e6e6" font-size="9.5" text-anchor="middle">列 ✓</text>
    <rect x="218" y="40" width="60" height="30" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="248" y="59" fill="#e6e6e6" font-size="9.5" text-anchor="middle">列 ✓</text>
    <rect x="286" y="40" width="60" height="30" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/><text x="316" y="59" fill="#9aa4b2" font-size="9.5" text-anchor="middle">列 ✗</text>
    <rect x="354" y="40" width="60" height="30" rx="5" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="384" y="59" fill="#e6e6e6" font-size="9.5" text-anchor="middle">列 ✓</text>
    <rect x="422" y="40" width="60" height="30" rx="5" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/><text x="452" y="59" fill="#9aa4b2" font-size="9.5" text-anchor="middle">列 ✗</text>
    <line x1="300" y1="78" x2="300" y2="104" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#go)"/>
    <defs><marker id="go" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="312" y="96" fill="#9aa4b2" font-size="9" text-anchor="start">GROUP BY 收合成組(③)</text>
    <text x="24" y="140" fill="#d6a45c" font-size="11" text-anchor="start" font-weight="bold">HAVING ·逐組過濾(分組後 ④)</text>
    <rect x="150" y="154" width="118" height="40" rx="6" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="209" y="171" fill="#e6e6e6" font-size="9.5" text-anchor="middle">A 組</text><text x="209" y="185" fill="#9aa4b2" font-size="8.5" text-anchor="middle">SUM=1500 ✓</text>
    <rect x="286" y="154" width="118" height="40" rx="6" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="345" y="171" fill="#e6e6e6" font-size="9.5" text-anchor="middle">B 組</text><text x="345" y="185" fill="#9aa4b2" font-size="8.5" text-anchor="middle">SUM=1200 ✓</text>
    <rect x="422" y="154" width="118" height="40" rx="6" fill="#1f2330" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/><text x="481" y="171" fill="#9aa4b2" font-size="9.5" text-anchor="middle">C 組</text><text x="481" y="185" fill="#9aa4b2" font-size="8.5" text-anchor="middle">SUM=300 ✗</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><code>WHERE</code> 砍的是「列」、在分組前;<code>HAVING</code> 砍的是「組」、在分組後。位置不同,能做的事就不同</figcaption>
</figure>

放進一個例子就很清楚:

```sql
SELECT customer_id, SUM(amount) AS total
FROM orders
WHERE amount > 0             -- ② 先逐列剔除無效資料(退款、0 元)
GROUP BY customer_id
HAVING SUM(amount) > 1000;   -- ④ 分組後,只留總額破千的『組』
```

這裡還藏了一個效能原則:**能用 `WHERE` 先砍掉的列,別留到 `HAVING`。** `WHERE` 在分組前就把資料變小,後面要分組、要算的東西都少了;丟給 `HAVING` 等於讓一堆注定被淘汰的列先跑完分組,白做工。這個「越早過濾越好」的直覺,跟我在 [[spark-shuffle|Spark 那篇]]講的「先 filter 把資料變小再 shuffle」是同一件事。

## 反思

### 記住「跑的順序」,一半的 SQL 謎題自己會解

我剛開始寫 SQL 時,把「別名不能在 WHERE 用」「window 要包子查詢」「WHERE 跟 HAVING 到底差在哪」當成三條各自要背的規則。後來才發現它們是**同一件事的三個切面**——你寫的順序不是它跑的順序。一旦把那張執行順序圖刻進腦子,這些就不再是要死背的規則,而是「當然會這樣」的推論。我現在遇到別人問「這個 query 為什麼報錯」,第一個反射動作就是在腦中跑一遍 `FROM→WHERE→GROUP BY→…`,八成當場就看出是哪個階段引用了還沒誕生的東西。**把規則還原成機制,是我學任何東西的第一步**,SQL 也不例外。

### 這其實又是「宣告式」的一體兩面

SQL「你寫的順序 ≠ 執行的順序」,本質上跟我在 [[k8s-intro|K8s]]、[[spark-dataframe|Spark DataFrame]] 反覆講的**宣告式**是同一種東西:你描述「要什麼」,引擎決定「怎麼做、照什麼順序做」。好處是你不用管執行細節、引擎還能幫你最佳化;代價是——**你不能假設它照你寫的字面順序跑。** 這就是為什麼「懂執行模型」對 SQL 這麼關鍵:不懂,你會寫出一堆「看起來對、其實錯」或「跑得出來、但慢得莫名其妙」的 query;懂了,你才有能力預測、也才有能力調。宣告式工具都是這樣,方便的背面,是你得花力氣去理解那台替你做決定的引擎。

### 「先把資料變小」是跨工具的共同直覺

`WHERE` 早於 `HAVING`、能砍的列盡早砍——這個在 SQL 裡的小習慣,放大到任何資料系統都成立。Spark 要你[[spark-explain|先 filter 再 shuffle、把 filter 下推到掃描層]];這裡是先 `WHERE` 再 `GROUP BY`。背後是同一句話:**越晚處理的資料,每一列都更貴**(它得先扛過前面所有階段)。所以我看任何一段資料處理,不管是 SQL、Spark 還是一條 pipeline,都會先問同一題:**最會過濾掉資料的那一步,能不能再往前挪?** 這是投報率最穩定的一種最佳化——不靠聰明,只靠順序對。
