---
title: "索引為什麼快 —— 也為什麼會失效"
date: 2026-07-11
category: tech
description: "加了索引查詢快幾百倍,但有時加了卻沒用——關鍵在懂它的資料結構 B-tree。沒索引是全表掃 O(n),有索引是沿樹往下 O(log n)。但索引不是免費的(拖慢寫入),複合索引有最左前綴的規矩,而把欄位包進函式、用前導萬用字元,都會讓它悄悄失效。"
tags:
  - sql
  - performance
series: "SQL 我以為我懂"
seriesOrder: 9
comments: true
draft: false
---
接下來換個主題:引擎與效能。第一個要懂的就是**索引**——為什麼加了它查詢快幾百倍,又為什麼有時加了卻好像沒用。這兩個問題的答案,都藏在它的資料結構裡:**B-tree**。

## 沒索引 vs 有索引:全掃 vs 直達

沒有索引時,`WHERE id = 500` 這種查詢只能做 **Seq Scan(全表掃描)**——從第一列開始一列一列比對,直到找到。有索引時,資料庫多維護了一棵**排好序的 B-tree**,查找變成從樹根往下走幾步就到:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 236" role="img" aria-label="左邊沒索引是 Seq Scan,一列一列往下掃過整張表才找到目標,複雜度 O(n);右邊有索引是 B-tree,從樹根往下經過一個節點就到達目標葉子,複雜度 O(log n)" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="ix" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#e0733a"/></marker></defs>
    <text x="140" y="26" fill="#e0733a" font-size="11" text-anchor="middle" font-weight="bold">沒索引:Seq Scan(全表掃)</text>
    <rect x="64" y="42" width="140" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="134" y="57" fill="#9aa4b2" font-size="9" text-anchor="middle">列 1</text>
    <rect x="64" y="68" width="140" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="134" y="83" fill="#9aa4b2" font-size="9" text-anchor="middle">列 2</text>
    <rect x="64" y="94" width="140" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="134" y="109" fill="#9aa4b2" font-size="9" text-anchor="middle">列 3</text>
    <rect x="64" y="120" width="140" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="134" y="135" fill="#9aa4b2" font-size="9" text-anchor="middle">列 4</text>
    <rect x="64" y="146" width="140" height="22" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="134" y="161" fill="#e6e6e6" font-size="9" text-anchor="middle">列 5 ← 目標</text>
    <rect x="64" y="172" width="140" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="134" y="187" fill="#9aa4b2" font-size="9" text-anchor="middle">列 6</text>
    <line x1="52" y1="44" x2="52" y2="196" stroke="#e0733a" stroke-width="1.6" marker-end="url(#ix)"/>
    <text x="140" y="214" fill="#9aa4b2" font-size="8.5" text-anchor="middle">逐列掃過才找到 → O(n),資料越多越慢</text>
    <text x="440" y="26" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">有索引:B-tree</text>
    <rect x="405" y="42" width="76" height="24" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="443" y="58" fill="#e6e6e6" font-size="9" text-anchor="middle">根</text>
    <rect x="346" y="96" width="64" height="24" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="378" y="112" fill="#9aa4b2" font-size="9" text-anchor="middle">節點</text>
    <rect x="456" y="96" width="64" height="24" rx="5" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="488" y="112" fill="#e6e6e6" font-size="9" text-anchor="middle">節點</text>
    <rect x="332" y="150" width="46" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="355" y="166" fill="#9aa4b2" font-size="8.5" text-anchor="middle">葉</text>
    <rect x="384" y="150" width="46" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="407" y="166" fill="#9aa4b2" font-size="8.5" text-anchor="middle">葉</text>
    <rect x="452" y="150" width="46" height="24" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.5"/><text x="475" y="166" fill="#e6e6e6" font-size="8" text-anchor="middle">目標</text>
    <rect x="504" y="150" width="46" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="527" y="166" fill="#9aa4b2" font-size="8.5" text-anchor="middle">葉</text>
    <line x1="430" y1="66" x2="382" y2="96" stroke="#3a4154" stroke-width="1.1"/>
    <line x1="456" y1="66" x2="488" y2="96" stroke="#54b890" stroke-width="1.6"/>
    <line x1="470" y1="120" x2="360" y2="150" stroke="#3a4154" stroke-width="1.1"/>
    <line x1="384" y1="120" x2="407" y2="150" stroke="#3a4154" stroke-width="1.1"/>
    <line x1="484" y1="120" x2="475" y2="150" stroke="#54b890" stroke-width="1.6"/>
    <line x1="500" y1="120" x2="527" y2="150" stroke="#3a4154" stroke-width="1.1"/>
    <text x="440" y="214" fill="#9aa4b2" font-size="8.5" text-anchor="middle">沿樹往下幾步就到 → O(log n)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">索引就像一本排好序的目錄:不用一頁頁翻,直接用二分逼近。而且因為葉子是<b>有序</b>的,範圍查詢(<code>&gt;</code>、<code>BETWEEN</code>)、<code>ORDER BY</code>、前綴 <code>LIKE 'abc%'</code> 也都吃得到索引——找到起點後順著葉子走就好</figcaption>
</figure>

一句話記住:**沒索引是「逐列找」,有索引是「用排序好的結構逼近」。** 這也是為什麼索引不只加速 `=`,連範圍、排序都受惠——因為 B-tree 的葉子本身就是排好序的。

## 索引不是免費的

既然這麼快,為什麼不每一欄都加?因為**索引是「空間換時間」,而且會拖慢寫入**:每一筆 `INSERT` / `UPDATE` / `DELETE`,都得**同步維護每一個相關索引**(把新值插進那棵排序樹的正確位置)。索引越多,寫入越慢、佔的空間也越大。所以索引要**加在刀口上**——常被拿來 `WHERE` 過濾、`JOIN`、`ORDER BY` 的欄位,而不是無腦每欄都建。**讀多寫少的表值得多加,寫很兇的表要克制。**

## 複合索引:最左前綴

一個索引可以蓋多個欄位(複合索引),但它有個一定要懂的規矩:**最左前綴**——只能從最左欄開始、連續使用:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 212" role="img" aria-label="索引建在姓與名兩欄,資料照姓再照名排好像電話簿。WHERE 姓等於王用得到索引;WHERE 姓等於王且名等於安也用得到;但 WHERE 名等於安跳過了姓,只知道名沒法在電話簿定位,索引失效" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <rect x="140" y="18" width="280" height="42" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="280" y="37" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">INDEX (姓, 名)</text>
    <text x="280" y="52" fill="#9aa4b2" font-size="8" text-anchor="middle">資料照 姓 → 名 排好(像電話簿)</text>
    <rect x="60" y="72" width="440" height="38" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="80" y="95" fill="#54b890" font-size="13" text-anchor="middle">✓</text>
    <text x="104" y="90" fill="#e6e6e6" font-size="9.5" text-anchor="start">WHERE 姓 = '王'</text>
    <text x="104" y="103" fill="#9aa4b2" font-size="8" text-anchor="start">翻到「王」開頭 → 用得到索引</text>
    <rect x="60" y="116" width="440" height="38" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.3"/>
    <text x="80" y="139" fill="#54b890" font-size="13" text-anchor="middle">✓</text>
    <text x="104" y="134" fill="#e6e6e6" font-size="9.5" text-anchor="start">WHERE 姓 = '王' AND 名 = '安'</text>
    <text x="104" y="147" fill="#9aa4b2" font-size="8" text-anchor="start">先姓再名,精準定位 → 用得到索引</text>
    <rect x="60" y="160" width="440" height="38" rx="6" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/>
    <text x="80" y="183" fill="#e0733a" font-size="13" text-anchor="middle">✗</text>
    <text x="104" y="178" fill="#e6e6e6" font-size="9.5" text-anchor="start">WHERE 名 = '安'(跳過姓)</text>
    <text x="104" y="191" fill="#e0733a" font-size="8" text-anchor="start">只知道名,整本電話簿沒法定位 → 索引失效</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">複合索引像照「姓→名」排的電話簿:知道姓能翻、知道姓+名更精準;但只給「名」,整本都得翻——索引用不到。所以建複合索引時,欄位順序決定它能服務哪些查詢</figcaption>
</figure>

## 索引什麼時候會悄悄失效

索引最讓人踩坑的,是它常常**「加了、但沒被用到」**,而且不會報錯。幾個最常見的失效情境:

- **把欄位包進函式或運算**:`WHERE DATE(created_at) = '2026-07-11'` 或 `WHERE amount * 2 > 100` —— 索引存的是欄位的**原值**,不是 `DATE(...)` 或 `amount*2` 的值,所以用不到。改寫成讓欄位單獨站在一邊(`WHERE created_at >= '2026-07-11' AND created_at < '2026-07-12'`)。
- **前導萬用字元**:`LIKE '%abc'` 用不到索引(不知道從哪個字母開頭找),但 `LIKE 'abc%'` 可以。
- **型別不符的隱式轉換**:欄位是字串卻 `WHERE phone = 0912345678`(數字),資料庫可能被迫轉型而放棄索引。
- **選擇性太低**:像「性別」只有兩個值,索引篩不掉多少列,優化器可能寧願直接全表掃——**索引只對「能大幅縮小範圍」的欄位才划算**。

還有個進階但實用的觀念:**covering index(涵蓋索引)**——如果查詢要的欄位剛好都在索引裡,資料庫連原始表都不用回去讀(index-only scan),更快。

那要怎麼確認索引到底有沒有被用到?**看 `EXPLAIN`**——這正是[[spark-explain|跟 Spark 那篇執行計畫]]對應的、下一篇的主題:計畫裡是 `Index Scan` 還是 `Seq Scan`,一翻兩瞪眼。

## 反思

### 索引是「空間換時間」,沒有白吃的午餐

我看過不少人一遇到查詢慢就反射性加索引,加到後來寫入慢得要命還不知道為什麼。索引的加速是有代價的——**佔空間、拖慢每一次寫入**。所以我現在看到「查詢慢 → 加索引」時,一定會先多問一句:這張表是讀多還是寫多?這個查詢是不是真的夠頻繁、值得為它養一棵樹?**加索引不是免費的優化,是一筆要算的投資**——這跟 [[sql-time-scd|Type 2 留不留歷史]]、跟任何工程取捨一樣,關鍵是看清你在拿什麼換什麼。

### 「別把欄位包在函式裡」是一條跨工具的通則

`WHERE func(col)` 讓索引失效,原因很單純:索引存的是 `col` 的原值,不是 `func(col)` 的值。有趣的是,這跟 [[spark-shuffle|Spark 的 filter 下推]]被函式擋掉,是**同一件事**——把欄位包進運算,最佳化器就沒辦法用「欄位的原始樣子」去加速。所以我養成一個習慣:寫過濾條件時,盡量讓**欄位單獨站在一邊**(`col >= x` 而不是 `func(col) = y`),把運算挪到常數那側。這個小習慣,讓索引、下推這些底層最佳化有機會生效——**你怎麼寫條件,直接決定引擎幫不幫得了你。**

### 最左前綴逼你先想「查詢的形狀」

複合索引的最左前綴規矩,表面是個限制,實際上是逼你想清楚一件更重要的事:**我到底都怎麼查這張表?** 索引不是為「表」建的,是為「查詢模式」建的——欄位放哪個順序,取決於你最常一起用哪些欄過濾、哪個欄選擇性最高。這讓我建索引前一定先盤點實際的查詢,而不是憑感覺把幾個欄湊成一個索引。**先懂你怎麼查,才知道怎麼建**——這句話用在索引上最貼切,其實用在所有為了效能做的設計上都成立。
