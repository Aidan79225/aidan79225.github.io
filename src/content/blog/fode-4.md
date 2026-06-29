---
title: "技術到底該怎麼選:讀《Fundamentals of Data Engineering》Ch.4"
date: 2026-06-30
category: tech
tags:
  - data-engineering
  - book-notes
series: "Fundamentals of Data Engineering 讀書筆記"
seriesOrder: 4
comments: true
draft: false
---
[[fode-3|上一篇]]講架構(why);這一章接著問:在那個架構底下,**技術(how)到底該怎麼選?** 這章最該先釘進腦袋的一句話是 —— **先有架構,才選技術,不是反過來。** 工具是手段,被架構的取捨牽著走;一上來就問「要用哪個工具」,順序就已經錯了。

## 一個太常見的錯誤:先愛上工具

很多團隊的決策長這樣:看到一個當紅的工具 → 決定要用 → 再回頭把架構湊上去。書直接把它翻過來:**架構決策(為什麼這樣切系統、願意拿什麼換什麼)在前,技術決策(用哪個產品落地)在後。** 工具只是服務於取捨的選項,不該是出發點。

那麼,當你站對了順序、要開始選技術時,書給了一整排判準。我把它濃縮成一張表:

| 判準 | 在問什麼 |
|---|---|
| 團隊規模與能力 | 你們養得起、駕馭得了這個東西嗎? |
| 上市速度 | 多快能把價值交出去?(常被低估) |
| 互通性 | 跟既有的東西接得起來嗎? |
| 成本 | TCO、TOCO、FinOps(見下) |
| 現在 vs 未來 | 不變的地基 vs 易變的表層(見下) |
| 位置 | 雲端 / 地端 / 混合 |
| 自建 vs 採購 | 這值得你自己造嗎?(見下) |
| 單體 vs 模組 | 綁成一塊,還是可拆換的元件? |
| 無伺服器 vs 伺服器 | 誰來扛維運? |

這表裡有三條我覺得最該深挖、也最能改變決策方式的:**現在 vs 未來、自建 vs 採購、成本。**

## 核心一:不變的地基 vs 易變的表層

書區分兩種技術:**不變的(immutable)**與**易變的(transitory)**。不變的,是那些撐了幾十年、短期內不會消失的底層 —— 物件儲存、SQL、網路、Unix / bash;易變的,是來來去去的框架、函式庫、當紅工具,可能三年後就沒人提了。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 232" role="img" aria-label="技術分兩層:上層是易變、會來來去去的框架與工具(設計成可抽換),下層是不變的地基如物件儲存、SQL、網路、Unix,架構應錨定在地基" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="270" y="22" fill="#9aa4b2" font-size="11.5" text-anchor="middle">易變的表層 — 框架・函式庫・當紅工具</text>
    <rect x="48" y="36" width="96" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="96" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">當紅框架</text>
    <rect x="168" y="36" width="96" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="216" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">新潮工具</text>
    <rect x="288" y="36" width="96" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="336" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">函式庫</text>
    <rect x="408" y="36" width="84" height="42" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2" stroke-dasharray="4 3"/>
    <text x="450" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">平台 SDK</text>
    <text x="270" y="100" fill="#9aa4b2" font-size="10" text-anchor="middle">會隨潮流來來去去 → 設計成可抽換</text>
    <line x1="40" y1="120" x2="500" y2="120" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <rect x="48" y="146" width="444" height="62" rx="8" fill="#4f6df5" fill-opacity="0.16" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="270" y="174" fill="#4f6df5" font-size="11.5" text-anchor="middle">不變的地基</text>
    <text x="270" y="194" fill="#e6e6e6" font-size="10.5" text-anchor="middle">物件儲存 · SQL · 網路 · Unix / bash</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">把賭注下在幾十年不變的地基上,讓會過時的表層保持可抽換 —— 這是 Ch.3 鬆耦合與可逆的延伸</figcaption>
</figure>

書的建議很清楚:**把架構錨定在不變的地基上,把易變的表層設計成可抽換。** SQL 跟物件儲存你押三十年都不太會錯;某個今年最紅的框架,別讓它滲進系統每個角落、把你綁死。這跟 [[fode-3|Ch.3]] 講的鬆耦合與可逆是同一條神經 —— 賭在穩的東西上,讓會變的東西可以局部換掉。

## 核心二:自建 vs 採購

第二個關鍵判準:這個東西,你該自己建,還是買 / 用現成的?書給的心法是一個問題 —— **這是不是你的核心差異化?**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 200" role="img" aria-label="自建 vs 採購的判準:問這是不是你的核心差異化;不是就買或用託管現成(預設),是才值得自己建" style="width:100%;max-width:560px;height:auto;margin:0 auto;">
    <defs><marker id="ab4" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4f6df5"/></marker><marker id="abm4" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <polygon points="140,50 238,100 140,150 42,100" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="140" y="96" fill="#e6e6e6" font-size="10.5" text-anchor="middle">這是你的</text>
    <text x="140" y="112" fill="#e6e6e6" font-size="10.5" text-anchor="middle">核心差異化嗎?</text>
    <line x1="238" y1="100" x2="300" y2="76" stroke="#4f6df5" stroke-width="1.5" marker-end="url(#ab4)"/>
    <text x="264" y="70" fill="#4f6df5" font-size="10" text-anchor="middle">否</text>
    <line x1="238" y1="100" x2="300" y2="146" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#abm4)"/>
    <text x="264" y="142" fill="#9aa4b2" font-size="10" text-anchor="middle">是</text>
    <rect x="302" y="52" width="204" height="46" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="404" y="72" fill="#e6e6e6" font-size="10.5" text-anchor="middle">買 / 用託管現成(預設)</text>
    <text x="404" y="88" fill="#9aa4b2" font-size="9" text-anchor="middle">沒有差異化的粗活,別自己扛</text>
    <rect x="302" y="124" width="204" height="46" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.5"/>
    <text x="404" y="144" fill="#e6e6e6" font-size="10.5" text-anchor="middle">自己建</text>
    <text x="404" y="160" fill="#9aa4b2" font-size="9" text-anchor="middle">只在這真的是你的優勢時</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">預設是買 / 用現成 —— 把工程力留給真正能拉開差距的地方,呼應 Ch.1 的「A 型優先」</figcaption>
</figure>

書的立場(也是我的立場):**預設買 / 用現成,自建是例外。** Amazon 那句「不做沒有差異化的粗活(undifferentiated heavy lifting)」就是這意思 —— 沒有差異化的東西自己扛,只是把維運債堆給未來的自己。這跟 [[fode-1|Ch.1]] 的「A 型工程師優先」是同一句話的不同講法:造輪子的時機是規模逼出來的,不是拿來證明技術力的。

順帶一提,「採購」也不是只有「全買商業產品」一種。它是一條光譜:社群版開源 → 商業化開源(有人幫你扛維運的託管版)→ 全託管專有產品。愈往右,你付愈多錢換愈少維運負擔 —— 又是一個取捨。

## 成本要算兩本帳:TCO 與 TOCO

選技術繞不開成本,但書提醒:成本不只一本帳。

| | TCO(總持有成本) | TOCO(總機會成本) |
|---|---|---|
| 在問 | 用這個要花多少? | 被綁在這、不選別的,放棄了什麼? |
| 算得到的 | 授權、機器、人力、維運 | —— |
| 容易漏的 | 隱性的整合與維運成本 | 鎖定、回不去、錯過更好的選項 |

大多數人只算 **TCO**(看得到的帳單),但書點出更隱形、也常常更貴的是 **TOCO** —— 你選了 A,等於放棄了 B、C、D,而且如果 A 把你鎖死,未來想換的代價會高到回不去。這跟 [[fode-3|Ch.3]] 的可逆性是同一件事的成本面:**不可逆的選擇,真正的價碼不在帳單上,而在「改不了主意」這件事上。**

再加上書一直強調的 **FinOps** —— 雲端成本不是簽完約就固定的數字,而是一個要持續設計、持續監看的變數。用多少付多少很彈性,但也代表帳單會隨著你寫的每一支爛 query 一起長。

## 反思

### 「先架構後工具」是我這半年最該對自己喊的一句

我寫了一整排工具筆記([[airflow-intro|Airflow]]、[[spark-intro|Spark]]、[[kafka-intro|Kafka]]、[[dbt-intro|dbt]]),很清楚那種「學到一個很炫的工具,就很想找地方用它」的衝動。但這章把順序釘死了:**先講清楚架構上的取捨,工具才上場。** 這跟我那篇 [[pain-before-power|先確認痛點,再上重武器]]根本是同一條神經 —— 沒有先確認痛點與約束,再潮的工具都是為了用而用。我現在檢視技術選型,第一句都先問「我們是為了解決哪個取捨而選它」,而不是「它有多強」。

### 我下注的地方,幾乎都在「不變的地基」

回頭看,我做過的選擇裡感覺最安心的,清一色押在 immutable 那一層:堅持用 **SQL** 當轉換語言、把原始資料攤在 **物件儲存** 上、在 [[medallion-architecture|Medallion]] 裡守著 **Bronze 不可變、可重播**。這些東西十年後大概還在。反過來,那些當年覺得「一定要用」的框架,不少已經沒人維護了 —— 慶幸的是我沒讓它們滲進系統的核心。**把賭注下在穩的東西上,讓會變的東西可拋棄**,是我越來越信的一條原則。

### 自建 vs 採購,我栽過「為了證明能力而造輪子」的跟頭

「預設用現成」這條,我是付過學費才真的信。早期我有過為了某個其實買得到的功能、硬是自己刻一套的經驗 —— 當下很有成就感,半年後變成沒人想碰的維運包袱。書用「沒有差異化的粗活」一刀切得很準:**自建的成本從來不是寫出來那一刻,而是之後每一年的維護。** 現在我的預設是買 / 用託管,只有當「這真的是我們能拉開差距的地方」才自己動手 —— 而這種地方,遠比工程師想像的少。
