---
title: "Medallion 架構:用 Bronze / Silver / Gold 分層管資料品質"
date: 2026-06-23
category: tech
tags:
  - data-engineering
  - data-modeling
  - lakehouse
comments: true
draft: false
---
## Medallion 架構是什麼

一句話:**Medallion(獎牌)架構是一種把資料按「品質與精煉程度」分成三層的設計慣例 —— Bronze(原始)、Silver(清洗)、Gold(商業)—— 資料一層一層往上洗,愈往上愈乾淨、愈貼近業務**。它由 Databricks 推廣,在 lakehouse 場景特別常見,也叫 **multi-hop architecture**(多跳架構)。

關鍵認知:**它不是一個工具,而是一種「資料該怎麼分層擺放」的約定**。你用 [[spark-intro|Spark]] 也好、[[dbt-intro|dbt]] 也好、純 SQL 也好,都能實作它。它真正在規範的是「每一層該負什麼責任」,而不是「用什麼跑」。

### 三層各自在做什麼

| 層 | 裝什麼 | 主要處理 | 誰來用 |
|---|---|---|---|
| **Bronze 青銅** | 從來源原封不動載進來的原始資料,append-only | 幾乎不動內容,只加載入時間、來源檔名等中繼資料 | 資料工程師(重建下游、稽核用) |
| **Silver 白銀** | 清洗、去重、型別校正、合併過的「乾淨原子資料」 | 套 schema、品質規則、join 多個來源,洗成可信的企業視圖 | 資料分析師、資料科學家、ML |
| **Gold 黃金** | 商業層的彙總、維度模型、KPI,為特定用途打平 | 聚合、星狀綱要、報表就緒 | BI 儀表板、決策者、對外服務 |

每往上一層,只做「剛剛好」的轉換 —— Bronze 保真、Silver 求乾淨可信、Gold 求好用。這種分工讓每一層只扛一種責任,壞掉時容易定位。

### 資料怎麼一層一層往上洗

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 680 180" role="img" aria-label="Medallion 架構:來源資料經 Bronze、Silver、Gold 三層精煉後供 BI 與 ML 使用" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="md" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="100" y1="90" x2="140" y2="90" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#md)"/>
    <line x1="246" y1="90" x2="286" y2="90" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#md)"/>
    <line x1="392" y1="90" x2="432" y2="90" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#md)"/>
    <line x1="538" y1="90" x2="576" y2="90" stroke="#9aa4b2" stroke-width="1.5" marker-end="url(#md)"/>
    <rect x="8" y="66" width="92" height="48" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.5"/>
    <text x="54" y="87" fill="#e6e6e6" font-size="12" text-anchor="middle">來源</text>
    <text x="54" y="103" fill="#9aa4b2" font-size="9.5" text-anchor="middle">DB / API / 檔案</text>
    <rect x="142" y="62" width="104" height="56" rx="8" fill="#262b3a" stroke="#b08d57" stroke-width="2"/>
    <text x="194" y="86" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Bronze</text>
    <text x="194" y="103" fill="#9aa4b2" font-size="9.5" text-anchor="middle">原始保真</text>
    <rect x="288" y="62" width="104" height="56" rx="8" fill="#262b3a" stroke="#b9c2cc" stroke-width="2"/>
    <text x="340" y="86" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Silver</text>
    <text x="340" y="103" fill="#9aa4b2" font-size="9.5" text-anchor="middle">清洗去重</text>
    <rect x="434" y="62" width="104" height="56" rx="8" fill="#262b3a" stroke="#d4af37" stroke-width="2"/>
    <text x="486" y="86" fill="#e6e6e6" font-size="12.5" text-anchor="middle">Gold</text>
    <text x="486" y="103" fill="#9aa4b2" font-size="9.5" text-anchor="middle">商業彙總</text>
    <rect x="578" y="66" width="92" height="48" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="624" y="87" fill="#e6e6e6" font-size="12" text-anchor="middle">BI / ML</text>
    <text x="624" y="103" fill="#9aa4b2" font-size="9.5" text-anchor="middle">報表 / 模型</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">資料一跳一跳往上,每一層只負責一種精煉 —— 這就是「multi-hop」的由來</figcaption>
</figure>

### 為什麼要分層,而不是一步到位

直接從原始資料寫一段 SQL 算出報表,當然跑得動 —— 但分層換來的是這幾件事:

- **可重建(reprocessability)**:Bronze 保留原始全貌,下游邏輯改了、或發現算錯,直接從 Bronze 重跑就好,不用回頭跟來源系統要資料。這是分層最被低估的價值。
- **責任單一**:清洗的歸 Silver、business logic 歸 Gold。出問題時你知道去哪一層找,不會所有邏輯糊成一坨。
- **多種消費者各取所需**:資料科學家想要乾淨但細的原子資料(Silver),老闆只想看打平的 KPI(Gold)—— 同一份資料在不同層用不同顆粒度服務不同人。
- **品質是漸進的**:不要求一步洗到完美,每一跳只前進一個品質等級,容易測、容易維護。

### 它跟你已知的東西怎麼對上

| 你熟悉的 | 對應到 Medallion |
|---|---|
| ELT 的 **E、L** | 把資料載進 **Bronze** |
| ELT 的 **T** | Bronze→Silver→Gold 的兩跳轉換 |
| dbt 的 staging / intermediate / marts | 幾乎就是 Silver / 中介 / Gold |
| 傳統倉儲的 staging / ODS / data mart | 概念同源,Medallion 只是換個說法並標準化 |

所以 Medallion 不是要取代 ELT 或維度建模 —— 它是把這些既有實務,收斂成一套「三層、職責清楚」的共同語言。

## 反思

### 它是一種紀律,不是命名魔法

我看過最常見的誤用,是把三個 S3 路徑(或三個 schema)命名成 `bronze` / `silver` / `gold`,就宣稱「我們上了 Medallion 架構」—— 然後 Gold 裡塞著沒清過的髒資料、Silver 直接 join 了一堆 business logic。**分層的價值來自每一層真的守住自己的職責,而不是來自名字**。名字只是標籤,守不守紀律才是重點。這跟我寫 [[dbt-intro|dbt]] 時的結論一樣:工具/慣例給你的是框架,真正值錢的是你願不願意在框架裡守規矩。

### 最該死守的一條:Bronze 不可變、可重播

如果三層裡只能堅持一件事,我會選「**Bronze 永遠 append-only、原封不動、可重播**」。因為這條一旦破功,整個架構最大的好處(可重建)就沒了 —— 你會回到「下游算錯只能重新跟來源要資料」的窘境,而來源往往已經沒有那個時間點的快照。實務上我會要求 Bronze 連來源的髒、連重複、連格式怪的都照收,清洗一律往後推到 Silver。Bronze 的工作是「忠實記錄發生過什麼」,不是「先幫忙弄乾淨」。把這兩件事混在一起,是我看過最貴的錯。

### Silver 跟 Gold 的界線,才是真正難的決定

Bronze 很好定義(照收就對了),難的是 Silver 跟 Gold 怎麼切。我的判準是:**Silver 放「不綁特定用途、誰來都能用」的乾淨原子資料;Gold 放「為某個報表/某個團隊打平」的彙總**。一旦你發現某張 Silver 表開始為了某個儀表板做特殊聚合 —— 那它其實該是 Gold。反過來,如果每個 Gold 需求都從 Bronze 重洗一遍、Silver 形同虛設,那是另一種味道:你少了可複用的中間層。這條線沒有標準答案,但「會不會被多個下游共用」是我最常用的試金石。

### 不要為了三層而三層

我不會無腦對所有專案套三層。小專案、資料源單純、只有一兩個報表的情況,硬切三層只是徒增 pipeline 複雜度與運算成本 —— 兩層(原始 + 報表)往往就夠。Medallion 的三層是「當你有多來源、多消費者、需要稽核與重建」時才回本的投資。[[pain-before-power|先確認痛點]]再分層,別把它當成預設動作 —— 這跟我對 [[airflow-intro|Airflow]]、[[spark-intro|Spark]] 的態度一致:架構是用來解決具體痛點的,不是拿來證明自己很 enterprise 的。
