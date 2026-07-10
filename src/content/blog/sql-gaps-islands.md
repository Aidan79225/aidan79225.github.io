---
title: "Gaps and Islands:把連續區間抓出來"
date: 2026-07-10
category: tech
description: "連續登入幾天、把連續日期收成一段區間、偵測序號斷點——這些看似不同的需求,骨子裡都是同一個經典難題:gaps and islands。名字嚇人,但有一招極優雅的解法:value 減掉 ROW_NUMBER,同一段連續區間會得到固定的常數,GROUP BY 它就切出每一座島。"
tags:
  - sql
  - data-engineering
series: "SQL 我以為我懂"
seriesOrder: 7
comments: true
draft: false
---
[[sql-window|Window function]] 學會之後,這篇是它最漂亮的一個實戰。「連續登入幾天」「把連續的日期收成一段段區間」「找出序號的斷點」——這些看起來各不相同的需求,其實是同一個經典題:**gaps and islands(缺口與島)**。名字聽起來嚇人,但有一招優雅到會讓你「喔!」出聲的解法。

## 什麼是 gaps and islands

先把畫面建立起來。把一串有序的資料(日期、序號)攤在時間軸上,**連續的一段就是一座「島」(island),島跟島中間的空缺就是「缺口」(gap)**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 176" role="img" aria-label="時間軸上的日期點:第1到3天連成島A、第7到8天連成島B、第12天是島C。島與島之間是缺口 gap。目標是把散落的連續點,收合成一座座島" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <line x1="48" y1="98" x2="516" y2="98" stroke="#3a4154" stroke-width="1.4"/>
    <rect x="46" y="76" width="102" height="44" rx="8" fill="none" stroke="#54b890" stroke-width="1.4" stroke-dasharray="4 3"/>
    <text x="97" y="68" fill="#54b890" font-size="8.7" text-anchor="middle">島 A:連 3 天</text>
    <rect x="256" y="76" width="66" height="44" rx="8" fill="none" stroke="#4f6df5" stroke-width="1.4" stroke-dasharray="4 3"/>
    <text x="289" y="68" fill="#4f6df5" font-size="8.7" text-anchor="middle">島 B:連 2 天</text>
    <rect x="431" y="76" width="30" height="44" rx="8" fill="none" stroke="#d6a45c" stroke-width="1.4" stroke-dasharray="4 3"/>
    <text x="446" y="68" fill="#d6a45c" font-size="8.7" text-anchor="middle">島 C:1 天</text>
    <circle cx="60" cy="98" r="6" fill="#54b890"/><circle cx="97" cy="98" r="6" fill="#54b890"/><circle cx="134" cy="98" r="6" fill="#54b890"/>
    <circle cx="271" cy="98" r="6" fill="#4f6df5"/><circle cx="307" cy="98" r="6" fill="#4f6df5"/>
    <circle cx="446" cy="98" r="6" fill="#d6a45c"/>
    <text x="200" y="116" fill="#9aa4b2" font-size="8.5" text-anchor="middle">缺口</text>
    <text x="377" y="116" fill="#9aa4b2" font-size="8.5" text-anchor="middle">缺口</text>
    <text x="60" y="146" fill="#9aa4b2" font-size="8" text-anchor="middle">7/1</text>
    <text x="134" y="146" fill="#9aa4b2" font-size="8" text-anchor="middle">7/3</text>
    <text x="271" y="146" fill="#9aa4b2" font-size="8" text-anchor="middle">7/7</text>
    <text x="446" y="146" fill="#9aa4b2" font-size="8" text-anchor="middle">7/12</text>
    <text x="508" y="116" fill="#9aa4b2" font-size="8.5" text-anchor="end">日期 →</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">目標:把散落的連續點,收合成一座座「島」(例如算出每段連續登入的起訖與天數)。難的地方是——SQL 沒有現成的「連續」概念,你得自己造一個</figcaption>
</figure>

## 招式一:value − ROW_NUMBER 的魔法

最優雅的解法只有一個念頭:**連續的值每次 +1,而 [[sql-window|ROW_NUMBER]] 也每次 +1,所以「值 − row_number」在同一座島裡會是固定的常數**;一遇到缺口,值跳了、row_number 沒跳,差就變了。那個常數,就成了島的身分證:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 520 252" role="img" aria-label="表格四欄:value、ROW_NUMBER、value 減 rn、島。值 1 2 3 對應 rn 1 2 3,差都是 0,屬於島 A;值 7 8 對應 rn 4 5,差都是 3,屬於島 B;值 12 對應 rn 6,差是 6,屬於島 C。value 減 rn 這欄在同一島內固定不變,GROUP BY 它就切出島" style="width:100%;max-width:540px;height:auto;margin:0 auto;">
    <rect x="250" y="46" width="128" height="180" rx="6" fill="#26324a" stroke="#d6a45c" stroke-width="1.3" stroke-dasharray="4 3"/>
    <text x="95" y="40" fill="#9aa4b2" font-size="9" text-anchor="middle" font-weight="bold">value</text>
    <text x="190" y="40" fill="#9aa4b2" font-size="9" text-anchor="middle" font-weight="bold">ROW_NUMBER</text>
    <text x="314" y="40" fill="#d6a45c" font-size="9" text-anchor="middle" font-weight="bold">value − rn</text>
    <text x="440" y="40" fill="#9aa4b2" font-size="9" text-anchor="middle" font-weight="bold">島</text>
    <text x="95" y="66" fill="#e6e6e6" font-size="10" text-anchor="middle">1</text><text x="190" y="66" fill="#9aa4b2" font-size="10" text-anchor="middle">1</text><text x="314" y="66" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">0</text><text x="440" y="66" fill="#54b890" font-size="9.5" text-anchor="middle">A</text>
    <text x="95" y="92" fill="#e6e6e6" font-size="10" text-anchor="middle">2</text><text x="190" y="92" fill="#9aa4b2" font-size="10" text-anchor="middle">2</text><text x="314" y="92" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">0</text><text x="440" y="92" fill="#54b890" font-size="9.5" text-anchor="middle">A</text>
    <text x="95" y="118" fill="#e6e6e6" font-size="10" text-anchor="middle">3</text><text x="190" y="118" fill="#9aa4b2" font-size="10" text-anchor="middle">3</text><text x="314" y="118" fill="#54b890" font-size="10.5" text-anchor="middle" font-weight="bold">0</text><text x="440" y="118" fill="#54b890" font-size="9.5" text-anchor="middle">A</text>
    <line x1="40" y1="130" x2="490" y2="130" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="95" y="150" fill="#e6e6e6" font-size="10" text-anchor="middle">7</text><text x="190" y="150" fill="#9aa4b2" font-size="10" text-anchor="middle">4</text><text x="314" y="150" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">3</text><text x="440" y="150" fill="#4f6df5" font-size="9.5" text-anchor="middle">B</text>
    <text x="95" y="176" fill="#e6e6e6" font-size="10" text-anchor="middle">8</text><text x="190" y="176" fill="#9aa4b2" font-size="10" text-anchor="middle">5</text><text x="314" y="176" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">3</text><text x="440" y="176" fill="#4f6df5" font-size="9.5" text-anchor="middle">B</text>
    <line x1="40" y1="188" x2="490" y2="188" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="95" y="208" fill="#e6e6e6" font-size="10" text-anchor="middle">12</text><text x="190" y="208" fill="#9aa4b2" font-size="10" text-anchor="middle">6</text><text x="314" y="208" fill="#d6a45c" font-size="10.5" text-anchor="middle" font-weight="bold">6</text><text x="440" y="208" fill="#d6a45c" font-size="9.5" text-anchor="middle">C</text>
    <text x="260" y="242" fill="#9aa4b2" font-size="8.5" text-anchor="middle">value − ROW_NUMBER 在同一島內固定不變 → GROUP BY 它,就把每座島切出來</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">連續值 +1、row_number 也 +1,兩者相減在同一島內是常數(0、3、6);缺口讓它跳號。這個常數就是「島 id」——<code>GROUP BY</code> 它即可</figcaption>
</figure>

翻成 SQL,把連續登入的日期收成一段段區間:

```sql
SELECT user_id, MIN(login_date) AS start_date, MAX(login_date) AS end_date, COUNT(*) AS days
FROM (
  SELECT user_id, login_date,
         login_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date))::int AS grp
  FROM logins
) t
GROUP BY user_id, grp;   -- grp 就是那個「島 id」:同一段連續日期,grp 相同
```

`login_date − row_number` 在同一段連續日期裡會是同一個日期(常數),斷一天就跳掉。`GROUP BY user_id, grp` 一下去,每座島就收成一列,`MIN`/`MAX` 給你起訖、`COUNT` 給你天數。

## 招式二:LAG 抓斷點 + 累計加總(更通用)

差值法很美,但它有前提:**「連續」必須是嚴格的 +1**。如果你的「連續」定義比較鬆(例如「隔不到 3 天就算同一段」「同一個 session 內」),就用更通用的第二招——**[[sql-window|LAG]] 比對前一列抓出斷點,再用累計加總把斷點編號**:

```sql
SELECT user_id, MIN(login_date) AS start_date, MAX(login_date) AS end_date
FROM (
  SELECT user_id, login_date,
         SUM(is_new) OVER (PARTITION BY user_id ORDER BY login_date) AS island
  FROM (
    SELECT user_id, login_date,
           CASE WHEN login_date - LAG(login_date) OVER (PARTITION BY user_id ORDER BY login_date) > 1
                THEN 1 ELSE 0 END AS is_new     -- 跟前一筆差超過 1 天 → 新島開始
    FROM logins
  ) a
) b
GROUP BY user_id, island;
```

三層拆開看:最內層用 `LAG` 跟前一筆比,超過門檻就標 `is_new = 1`(新島的第一天);中層用[[sql-window|累計 SUM]]把這些旗標加起來——每遇到一個新島 `+1`,於是 `island` 就成了 1、1、1、2、2、3…的島 id;外層 `GROUP BY` 它收成區間。**門檻(`> 1`)想放多鬆就多鬆**,這是它比差值法通用的地方。

## 反思

### 換一個表示法,難題就消失了

value − row_number 這招之所以讓我著迷,是它示範了一件事:**很多難題不是解法難,是你用錯了表示法。** 「連續」這個性質,直接在 SQL 裡很難表達(沒有 `IS CONSECUTIVE` 這種東西);但你只要把它**轉換成「一個固定的常數」**,難題立刻塌縮成一個再普通不過的 `GROUP BY`。這種「找到對的表示法,問題就自己解開」的體驗,是我覺得寫 SQL——其實是所有分析型思考——最爽的時刻。遇到卡住的問題,我現在會先退一步問:**「有沒有辦法把這個怪性質,換成一個我已經會處理的東西?」**

### 優雅的解法要認得出它的前提

差值法很漂亮,但只在「嚴格 +1」時成立;真實資料常常沒那麼乖(跨週末、容忍幾天、不規則的 session)。這時硬套差值法就會出錯,得換成 LAG + 累計加總那招——醜一點,但門檻可調、通吃各種「連續」定義。這讓我學到:**優雅的解法通常有嚴格的前提,用之前要先確認前提成立。** 工程上我的判斷很簡單——先問「我的連續是不是嚴格 +1」,是就用差值法的優雅,不是就用 LAG 的通用。選哪招,看資料的形狀,不看哪招比較炫。

### 認得出 pattern,比會寫更值錢

Gaps and islands 最難的往往不是寫,是**認出來**——「連續在線的時段」「把相鄰的相同狀態合併成一段」「找出中斷的序號」表面看八竿子打不著,骨子裡全是同一題。認得出這個 pattern,你就能直接套招,而不是每次從零硬幹、還未必寫對。這也是為什麼我把它獨立成一篇:[[sql-window|window function]] 的價值,一半在「會用」,一半在「認得出什麼問題該用它」。**把常見的問題形狀記進腦子,遇到時就從『重新發明』變成『套用』**——這是我覺得資料工程功力進階最實在的一步。
