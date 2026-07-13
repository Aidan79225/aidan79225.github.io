---
title: "時間分桶與 SCD:SQL 處理時間的兩個坑"
date: 2026-07-10
category: tech
description: "時間在 SQL 裡有兩個很多人踩的坑,而且都跟『區間』有關。一是分桶:GROUP BY date_trunc 只會產出有資料的桶,沒事件的時段整列悄悄消失,時間序列就斷了。二是維度會變:客戶搬家、產品改分類,你得用 SCD Type 2 把歷史的樣子記下來,而不是直接覆蓋。"
tags:
  - sql
  - data-engineering
series: "SQL 我以為我懂"
seriesOrder: 8
comments: true
draft: false
---
接著[[sql-gaps-islands|上一篇]]的「區間」,這篇講時間在 SQL 裡的兩個坑——它們都源自同一件事:**時間是連續的,但你的資料是離散的事件。** 中間必然有「什麼都沒發生」的空隙,以及「值變了但你沒記」的變化。SQL 不會自動幫你處理這些,你得主動出手。

## 坑一:時間分桶會漏掉空桶

做「每日/每小時」聚合,標準做法是 `date_trunc('day', ts)` 把時間戳歸到桶裡再 `GROUP BY`。但這裡藏了一個安靜的坑:**`GROUP BY` 只會產出「有資料」的桶——沒有任何事件的那天,整列直接消失**,你的時間序列就這樣斷了一個洞:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="左邊直接 GROUP BY date_trunc 的結果:7/01 有 3 筆、7/02 有 5 筆、7/04 有 2 筆,而 7/03 因為沒訂單整列消失。右邊用 generate_series 補洞加 COALESCE 0 的結果:7/01 3、7/02 5、7/03 補上 0、7/04 2,時間序列連續" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="tm" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="140" y="26" fill="#9aa4b2" font-size="9.5" text-anchor="middle" font-weight="bold">直接 GROUP BY date_trunc</text>
    <text x="100" y="46" fill="#9aa4b2" font-size="8.5" text-anchor="middle">日期</text><text x="195" y="46" fill="#9aa4b2" font-size="8.5" text-anchor="middle">筆數</text>
    <rect x="55" y="52" width="170" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="100" y="68" fill="#e6e6e6" font-size="9" text-anchor="middle">7/01</text><text x="195" y="68" fill="#e6e6e6" font-size="9" text-anchor="middle">3</text>
    <rect x="55" y="79" width="170" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="100" y="95" fill="#e6e6e6" font-size="9" text-anchor="middle">7/02</text><text x="195" y="95" fill="#e6e6e6" font-size="9" text-anchor="middle">5</text>
    <rect x="55" y="106" width="170" height="24" rx="4" fill="#1f2330" stroke="#e0733a" stroke-width="1.1" stroke-dasharray="4 3"/><text x="140" y="122" fill="#e0733a" font-size="8.5" text-anchor="middle">7/03 沒這列 ✗</text>
    <rect x="55" y="133" width="170" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="100" y="149" fill="#e6e6e6" font-size="9" text-anchor="middle">7/04</text><text x="195" y="149" fill="#e6e6e6" font-size="9" text-anchor="middle">2</text>
    <line x1="232" y1="95" x2="338" y2="95" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#tm)"/>
    <text x="285" y="88" fill="#9aa4b2" font-size="7.8" text-anchor="middle">補洞</text>
    <text x="440" y="26" fill="#9aa4b2" font-size="9.5" text-anchor="middle" font-weight="bold">generate_series + COALESCE 0</text>
    <rect x="345" y="52" width="170" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="390" y="68" fill="#e6e6e6" font-size="9" text-anchor="middle">7/01</text><text x="480" y="68" fill="#e6e6e6" font-size="9" text-anchor="middle">3</text>
    <rect x="345" y="79" width="170" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="390" y="95" fill="#e6e6e6" font-size="9" text-anchor="middle">7/02</text><text x="480" y="95" fill="#e6e6e6" font-size="9" text-anchor="middle">5</text>
    <rect x="345" y="106" width="170" height="24" rx="4" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/><text x="390" y="122" fill="#e6e6e6" font-size="9" text-anchor="middle">7/03</text><text x="480" y="122" fill="#d6a45c" font-size="9" text-anchor="middle" font-weight="bold">0</text>
    <rect x="345" y="133" width="170" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="390" y="149" fill="#e6e6e6" font-size="9" text-anchor="middle">7/04</text><text x="480" y="149" fill="#e6e6e6" font-size="9" text-anchor="middle">2</text>
    <text x="290" y="190" fill="#9aa4b2" font-size="8.5" text-anchor="middle">GROUP BY 只產出「有資料」的桶 —— 沒訂單的 7/03 整列消失,時間序列就斷了</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">左:直接分桶,沒訂單的 7/03 悄悄不見了。右:先用 <code>generate_series</code> 造出完整的日期軸,再 <code>LEFT JOIN</code> 資料、<code>COALESCE</code> 補 0——空桶也有一列</figcaption>
</figure>

問題的根在「缺席被靜默地當成不存在」。修法是**別讓資料決定有哪些桶,自己先造出完整的時間軸**:用 `generate_series` 產生每一天,再把資料 [[sql-joins|LEFT JOIN]] 上去,沒對到的用 [[sql-null|COALESCE]] 補 0:

```sql
-- ❌ 沒訂單的日子整列不會出現
SELECT date_trunc('day', created_at) AS day, COUNT(*) AS orders
FROM orders
GROUP BY 1 ORDER BY 1;

-- ✅ 先造完整日期軸,再補洞
SELECT d.day, COALESCE(COUNT(o.id), 0) AS orders
FROM generate_series(DATE '2026-07-01', DATE '2026-07-04', INTERVAL '1 day') AS d(day)
LEFT JOIN orders o ON date_trunc('day', o.created_at) = d.day
GROUP BY d.day ORDER BY d.day;
```

## 坑二:維度會變,你要記住歷史

第二個坑:**維度會慢慢變**——客戶搬家、產品改分類、業務換負責區。如果你直接把舊值覆蓋掉,歷史就永遠回不去了:去年那張訂單當時算的是哪個稅區?那筆成交掛在誰名下?資料倉儲對這題的標準解法叫 **SCD(Slowly Changing Dimension)**,而最常用的是 **Type 2:不覆蓋,而是每次變化新增一列,用有效區間標記**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 224" role="img" aria-label="客戶 1 的城市隨時間變化:2026-01-01 到 03-15 是台北,03-15 之後是台南且為目前值,搬家發生在 03-15。底下兩列資料:台北 valid_from 2026-01-01 valid_to 2026-03-15 is_current false;台南 valid_from 2026-03-15 valid_to 9999-12-31 is_current true。查某時刻的樣子用 valid_from 小於等於 t 小於 valid_to" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="290" y="24" fill="#9aa4b2" font-size="9.5" text-anchor="middle" font-weight="bold">客戶 #1 的「城市」隨時間變化</text>
    <rect x="60" y="38" width="220" height="30" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="170" y="58" fill="#e6e6e6" font-size="9.5" text-anchor="middle">台北</text>
    <rect x="280" y="38" width="230" height="30" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="395" y="58" fill="#e6e6e6" font-size="9.5" text-anchor="middle">台南　(is_current)</text>
    <line x1="280" y1="34" x2="280" y2="78" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="280" y="90" fill="#d6a45c" font-size="8" text-anchor="middle">2026-03-15 搬家</text>
    <text x="60" y="90" fill="#9aa4b2" font-size="7.8" text-anchor="start">2026-01-01</text>
    <text x="510" y="90" fill="#9aa4b2" font-size="7.8" text-anchor="end">現在</text>
    <text x="100" y="120" fill="#9aa4b2" font-size="8.2" text-anchor="middle">city</text><text x="245" y="120" fill="#9aa4b2" font-size="8.2" text-anchor="middle">valid_from</text><text x="370" y="120" fill="#9aa4b2" font-size="8.2" text-anchor="middle">valid_to</text><text x="480" y="120" fill="#9aa4b2" font-size="8.2" text-anchor="middle">is_current</text>
    <rect x="45" y="126" width="490" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.1"/><text x="100" y="143" fill="#e6e6e6" font-size="8.5" text-anchor="middle">台北</text><text x="245" y="143" fill="#e6e6e6" font-size="8.5" text-anchor="middle">2026-01-01</text><text x="370" y="143" fill="#e6e6e6" font-size="8.5" text-anchor="middle">2026-03-15</text><text x="480" y="143" fill="#9aa4b2" font-size="8.5" text-anchor="middle">false</text>
    <rect x="45" y="155" width="490" height="26" rx="4" fill="#1e2a40" stroke="#4f6df5" stroke-width="1.1"/><text x="100" y="172" fill="#e6e6e6" font-size="8.5" text-anchor="middle">台南</text><text x="245" y="172" fill="#e6e6e6" font-size="8.5" text-anchor="middle">2026-03-15</text><text x="370" y="172" fill="#e6e6e6" font-size="8.5" text-anchor="middle">9999-12-31</text><text x="480" y="172" fill="#54b890" font-size="8.5" text-anchor="middle">true</text>
    <text x="290" y="205" fill="#9aa4b2" font-size="8.5" text-anchor="middle">查「某時刻的樣子」→ valid_from ≤ t &lt; valid_to;Type 1 直接覆蓋(丟歷史),Type 2 新增列(留歷史)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">SCD Type 2:每次變化插一列,用 <code>valid_from</code> / <code>valid_to</code> 標出有效區間,<code>is_current</code> 標目前值。整段歷史都留著,想回到任何時間點看當時的樣子都可以</figcaption>
</figure>

有了這張歷史表,「回到某個時間點看當時的樣子」就只是一個區間查詢:

```sql
-- 查 2026-02-01 當下,客戶 1 登記的城市(答案:台北)
SELECT city FROM customer_history
WHERE customer_id = 1
  AND valid_from <= DATE '2026-02-01'
  AND DATE '2026-02-01' < valid_to;
```

對照之下,**Type 1** 就是直接 `UPDATE` 覆蓋舊值——省事,但歷史永遠消失。要不要留歷史,是個要在建模時就想清楚的取捨:會被拿來做歷史分析、稽核、「當時到底是多少」的維度,幾乎都該用 Type 2。

## 反思

### 「沒有資料」也是一種資料

分桶漏空桶這個坑,本質是「**缺席被靜默地當成不存在**」。但在時間序列裡,「那天是 0」跟「那天沒有這一列」意義天差地遠——一個是明確的資訊(那天真的沒訂單),一個是資料的破洞(你根本沒產出那格)。畫成圖、餵給下游模型時,這個差別會放大成錯誤的趨勢判讀。這跟 [[sql-null|NULL 那篇]]是同一種病灶:**「跑得出來、但悄悄少了東西」**。所以我現在做任何時間序列,第一件事就是先想「空的時段要怎麼呈現」,主動用 `generate_series` 把軸補滿,不讓 `GROUP BY` 幫我把 0 藏成「不存在」。

### SCD Type 2 是資料的「版本控制」

Type 2 想通之後,我覺得它本質就是給維度資料做 **git**——每次改動存一個帶時間戳的版本,而不是覆蓋。差別只在你存的是「有效區間」而不是 commit。這個視角讓我更容易判斷該用 Type 1 還 Type 2:**你會不會想 `git blame` 這個欄位?** 會(想知道當時的價格、當時的歸屬、當時的分類)就用 Type 2;不會、只在乎現值(例如使用者的顯示暱稱)就 Type 1 覆蓋掉沒關係。覆蓋很省事,代價是你永遠回不去——這個取捨在任何存狀態的系統裡都存在,不只資料倉儲。

### 時間讓 SQL 變難,因為它有「不存在的區間」

回頭看,這兩個坑其實同源,也跟[[sql-gaps-islands|上一篇]]的 gaps and islands 是一家人:**時間是連續的,資料卻是離散的**——中間一定有「什麼都沒發生的空隙」和「值換了但沒被記錄的變化」。SQL 不會自動幫你補這些,你得主動造出完整的時間軸(`generate_series`)、主動記錄變化的區間(`valid_from`/`valid_to`)。認清「**時間有你必須自己填的空隙與邊界**」,是處理任何時間序列的第一課;而這一整幕(去重、連續區間、時間)反覆在講的,其實是同一件事——**真實世界的資料很髒、很不連續,把它整理成乾淨、可分析的形狀,正是資料工程的日常手藝。**
