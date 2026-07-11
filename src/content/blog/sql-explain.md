---
title: "讀懂 EXPLAIN:優化器到底怎麼跑你的 query"
date: 2026-07-11
category: tech
description: "上一篇問『索引到底有沒有被用到?』——答案就在 EXPLAIN 裡。這篇是 Spark 執行計畫那篇的 SQL 版姊妹作:同一套讀計畫找瓶頸的思維。教你讀 EXPLAIN、認出三種掃描與三種 JOIN 演算法(nested loop / hash / merge),以及為什麼 cost 只是估計、EXPLAIN ANALYZE 才是事實。"
tags:
  - sql
  - performance
series: "SQL 我以為我懂"
seriesOrder: 10
comments: true
draft: false
---
[[sql-index|上一篇]]留了一個問題:索引到底有沒有被用到?答案就在 `EXPLAIN` 裡。這篇是我之前寫的 [[spark-explain|Spark 執行計畫那篇]]的 SQL 版姊妹作——**同一套「讀計畫、找瓶頸」的思維,換一個引擎**。學會讀 `EXPLAIN`,你就從「猜為什麼慢」升級成「打開來看」。

## EXPLAIN:把優化器的計畫攤開

`EXPLAIN <query>` 會印出優化器**打算**怎麼跑這個查詢——不用真的執行,是靜態估計。`EXPLAIN ANALYZE` 則會**真的跑一次**,附上每一步的實際時間與實際列數。讀法跟 Spark 那篇一樣:**縮排最深的先執行(由內而外)**,一層層往上到最終結果。

計畫裡先認「掃描方式」——這正好接[[sql-index|上一篇的索引]]:

- **Seq Scan**:全表掃描(沒用索引)。
- **Index Scan**:走索引找到位置、再回表拿資料。
- **Index Only Scan**:要的欄位都在索引裡,連表都不用回(covering index)。
- **Bitmap Heap Scan**:命中的列不多不少時,先用索引收集一批再一次讀。

## 三種 JOIN 演算法

計畫裡最值得看懂的,是 `JOIN` 用了哪種演算法。這也補完了[[sql-joins|第二篇]]講 join 記憶體時埋的伏筆——優化器會依表大小、有沒有排序、有沒有索引,在三種裡挑一種:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 190" role="img" aria-label="三種 JOIN 演算法對照:Nested Loop 外表每列去內表找一次,適合小表或內表有索引;Hash Join 把小表建成 hash 表放記憶體、大表流過來 probe,適合大表等值 join;Merge Join 兩側先排序再像拉鍊合併,適合資料已排序或有索引" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="jj" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="193" y1="16" x2="193" y2="178" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="387" y1="16" x2="387" y2="178" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="100" y="28" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">Nested Loop</text>
    <rect x="24" y="42" width="40" height="16" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="44" y="54" fill="#9aa4b2" font-size="8" text-anchor="middle">外</text>
    <rect x="24" y="64" width="40" height="16" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="44" y="76" fill="#9aa4b2" font-size="8" text-anchor="middle">外</text>
    <rect x="24" y="86" width="40" height="16" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="44" y="98" fill="#9aa4b2" font-size="8" text-anchor="middle">外</text>
    <rect x="118" y="52" width="62" height="42" rx="5" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="149" y="70" fill="#e6e6e6" font-size="8.5" text-anchor="middle">內表</text><text x="149" y="83" fill="#9aa4b2" font-size="7.5" text-anchor="middle">(有索引更快)</text>
    <line x1="64" y1="50" x2="116" y2="62" stroke="#9aa4b2" stroke-width="1" marker-end="url(#jj)"/>
    <line x1="64" y1="72" x2="116" y2="72" stroke="#9aa4b2" stroke-width="1" marker-end="url(#jj)"/>
    <line x1="64" y1="94" x2="116" y2="84" stroke="#9aa4b2" stroke-width="1" marker-end="url(#jj)"/>
    <text x="100" y="150" fill="#9aa4b2" font-size="8.3" text-anchor="middle">外表每列 → 查內表一次</text>
    <text x="100" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">適合:小表 / 內表有索引</text>
    <text x="291" y="28" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">Hash Join</text>
    <rect x="212" y="44" width="46" height="18" rx="3" fill="#262b3a" stroke="#54b890" stroke-width="1.2"/><text x="235" y="57" fill="#e6e6e6" font-size="8.5" text-anchor="middle">小表</text>
    <rect x="292" y="42" width="78" height="22" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="331" y="57" fill="#e6e6e6" font-size="8.3" text-anchor="middle">Hash 表(記憶體)</text>
    <line x1="258" y1="53" x2="290" y2="53" stroke="#9aa4b2" stroke-width="1" marker-end="url(#jj)"/>
    <rect x="212" y="88" width="46" height="18" rx="3" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="235" y="101" fill="#9aa4b2" font-size="8.5" text-anchor="middle">大表</text>
    <line x1="258" y1="97" x2="326" y2="68" stroke="#9aa4b2" stroke-width="1" marker-end="url(#jj)"/>
    <text x="291" y="150" fill="#9aa4b2" font-size="8.3" text-anchor="middle">小表建 hash,大表 probe</text>
    <text x="291" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">適合:大表、等值 join</text>
    <text x="483" y="28" fill="#d6a45c" font-size="10.5" text-anchor="middle" font-weight="bold">Merge Join</text>
    <rect x="416" y="42" width="34" height="16" rx="3" fill="#262b3a" stroke="#d6a45c" stroke-width="1.1"/><text x="433" y="54" fill="#e6e6e6" font-size="8" text-anchor="middle">1</text>
    <rect x="416" y="62" width="34" height="16" rx="3" fill="#262b3a" stroke="#d6a45c" stroke-width="1.1"/><text x="433" y="74" fill="#e6e6e6" font-size="8" text-anchor="middle">3</text>
    <rect x="416" y="82" width="34" height="16" rx="3" fill="#262b3a" stroke="#d6a45c" stroke-width="1.1"/><text x="433" y="94" fill="#e6e6e6" font-size="8" text-anchor="middle">5</text>
    <rect x="516" y="42" width="34" height="16" rx="3" fill="#262b3a" stroke="#d6a45c" stroke-width="1.1"/><text x="533" y="54" fill="#e6e6e6" font-size="8" text-anchor="middle">2</text>
    <rect x="516" y="62" width="34" height="16" rx="3" fill="#262b3a" stroke="#d6a45c" stroke-width="1.1"/><text x="533" y="74" fill="#e6e6e6" font-size="8" text-anchor="middle">4</text>
    <rect x="516" y="82" width="34" height="16" rx="3" fill="#262b3a" stroke="#d6a45c" stroke-width="1.1"/><text x="533" y="94" fill="#e6e6e6" font-size="8" text-anchor="middle">6</text>
    <path d="M450,50 C480,50 486,90 514,90" fill="none" stroke="#9aa4b2" stroke-width="1"/>
    <path d="M450,70 C480,70 486,50 514,50" fill="none" stroke="#9aa4b2" stroke-width="1"/>
    <text x="483" y="150" fill="#9aa4b2" font-size="8.3" text-anchor="middle">兩側排序後,像拉鍊合併</text>
    <text x="483" y="164" fill="#9aa4b2" font-size="8" text-anchor="middle">適合:已排序 / 有索引</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三種 JOIN 沒有絕對優劣,只有適不適合:<b style="color:#4f6df5">Nested Loop</b> 小表(或內表有索引)快、<b style="color:#54b890">Hash Join</b> 對付大表等值 join、<b style="color:#d6a45c">Merge Join</b> 在資料已排序時省事。這跟 Spark 的 broadcast vs sort-merge 是同一組概念</figcaption>
</figure>

## 讀一個真實的計畫

把上面兜起來,看一個 `orders JOIN customers` 的計畫該怎麼讀:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 200" role="img" aria-label="一個 EXPLAIN 計畫:最上層 Hash Join 用 hash join;底下一支是 Seq Scan on orders 對大表全表掃、要注意該不該建索引;另一支 Hash 底下是 Index Scan on customers 小表走了索引。讀法是縮排最深的先跑,cost 是估計,EXPLAIN ANALYZE 才給真實 actual" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="30" y="42" fill="#54b890" font-size="11" text-anchor="start" font-weight="bold">Hash Join</text>
    <text x="118" y="42" fill="#9aa4b2" font-size="9.5" text-anchor="start">(cost=… rows=500)</text>
    <line x1="300" y1="38" x2="332" y2="38" stroke="#54b890" stroke-width="1" stroke-dasharray="3 2"/>
    <text x="338" y="41" fill="#54b890" font-size="8.7" text-anchor="start">用 Hash Join(小表建表、大表 probe)</text>
    <text x="56" y="76" fill="#9aa4b2" font-size="10" text-anchor="start">-&gt;</text>
    <text x="92" y="76" fill="#e0733a" font-size="10.5" text-anchor="start" font-weight="bold">Seq Scan on orders</text>
    <line x1="300" y1="72" x2="332" y2="72" stroke="#e0733a" stroke-width="1" stroke-dasharray="3 2"/>
    <text x="338" y="75" fill="#e0733a" font-size="8.7" text-anchor="start">orders 全表掃 —— 該不該建索引?</text>
    <text x="56" y="110" fill="#9aa4b2" font-size="10" text-anchor="start">-&gt;  Hash</text>
    <text x="80" y="144" fill="#9aa4b2" font-size="10" text-anchor="start">-&gt;</text>
    <text x="116" y="144" fill="#4f6df5" font-size="10.5" text-anchor="start" font-weight="bold">Index Scan on customers</text>
    <line x1="332" y1="140" x2="360" y2="140" stroke="#4f6df5" stroke-width="1" stroke-dasharray="3 2"/>
    <text x="366" y="143" fill="#4f6df5" font-size="8.7" text-anchor="start">customers 走了索引 ✓</text>
    <line x1="30" y1="164" x2="590" y2="164" stroke="#3a4154" stroke-width="1"/>
    <text x="310" y="184" fill="#9aa4b2" font-size="8.5" text-anchor="middle">讀法:縮排最深的先執行;cost 是優化器的「估計」,EXPLAIN ANALYZE 才給真實 actual time / rows</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">由內而外讀:先掃 customers(走索引)建 hash、掃 orders 去 probe,最後 Hash Join 合起來。看到大表 <code>Seq Scan</code> 就該問一句「這裡是不是缺索引」——這就是把效能問題變成螢幕上指得出來的一行</figcaption>
</figure>

讀計畫時最該抓的三件事:**① 該用索引的地方卻是 `Seq Scan`?**(缺索引,或[[sql-index|被函式/型別搞失效]]了)**② JOIN 演算法選得對嗎?**(小表 join 卻用了 Nested Loop 掃大表就慘了)**③ 估計的 `rows` 跟 `EXPLAIN ANALYZE` 的實際差幾個數量級嗎?**——差很多代表**統計過時**,優化器拿著錯的估計就會選錯計畫,跑一次 `ANALYZE` 更新統計往往就好了。

## 反思

### 讀計畫,是把「猜」變成「看」

這篇的收穫跟 [[spark-explain|Spark 那篇]]幾乎一字不差:**在你會讀計畫之前,效能是玄學;會讀之後,它是螢幕上一行行看得懂的東西。** 我以前 debug 慢查詢,是靠經驗猜、靠改改看;現在第一步一定是 `EXPLAIN ANALYZE`,讓計畫直接告訴我瓶頸在哪一步、掃了多少列、join 怎麼做。這套「先讀計畫再動手」的紀律,SQL 和 Spark 完全共用——**跨引擎的底層思維是相通的,學會一個,另一個就通了一半。**

### cost 是估計,ANALYZE 才是事實

`EXPLAIN` 的 `rows`、`cost` 都是優化器**根據統計猜的**,不是真的。我吃過的虧是盯著漂亮的 cost 以為沒問題,結果實際跑起來慢到爆——因為統計過時,優化器把一個其實有一百萬列的步驟估成一千列,計畫整個選歪。所以我現在只信 `EXPLAIN ANALYZE` 的 `actual`。這件事有個更大的道理:**優化器再聰明,也只跟它手上的統計一樣準。** 估計與現實脫節,是很多「莫名其妙變慢」的根源——而修法常常樸素到好笑:更新統計而已。

### JOIN 演算法沒有最好,只有最適合

Nested Loop、Hash、Merge 各有主場,優化器多數時候選得對。但「多數時候」不是「總是」——當它的估計歪了,就可能對著大表用 Nested Loop、慢上千倍。你要有能力看懂「它為什麼選這個、本來該是哪個」,才判斷得出優化器有沒有選錯。這需要你真的懂三種演算法的脾氣,而這份知識,跟[[sql-joins|第二篇的 join 記憶體]]、跟 Spark 的 broadcast vs sort-merge 是**同一組**——講到底,「資料怎麼被配對」這件事,在單機和分散式是同一套物理。把它學透一次,到哪個引擎都用得上。
