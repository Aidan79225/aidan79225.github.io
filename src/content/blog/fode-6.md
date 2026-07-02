---
title: "資料要存在哪:儲存的階層與抽象,讀《Fundamentals of Data Engineering》Ch.6"
date: 2026-07-01
category: tech
tags:
  - data-engineering
  - book-notes
series: "Fundamentals of Data Engineering 讀書筆記"
seriesOrder: 6
comments: true
draft: false
---
[[fode-5|上一篇]]講資料從源頭生出來。生出來之後第一件事就是:**存去哪?** 這章談儲存 —— 而它最反直覺的一點是:**儲存不是「一個東西」,而是一整條從奈秒到小時、從天價到白菜價的階層。** 看懂這條階層,後面所有「該放哪、放多久、花多少」的決定才有依據。

## 儲存是一條階層,不是一個選項

書從最底層的物理材料往上疊:CPU 快取、RAM、SSD、HDD、物件儲存、冷儲存。它們的差別不是「好壞」,而是**同一組取捨的不同落點** —— 越快的越貴、容量越小;越便宜的越慢、容量越大。中間**單價和延遲各差好幾個數量級**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 300" role="img" aria-label="儲存階層:由上到下為 CPU 快取、RAM、SSD、HDD、物件儲存、冷儲存;越上面越快越貴容量越小,越下面越慢越便宜容量越大,物件儲存是資料工程的重心" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="280" y="18" fill="#9aa4b2" font-size="9.5" text-anchor="middle">↑ 越上面:越快、越貴、容量越小</text>
    <rect x="215" y="30" width="130" height="34" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="280" y="52" fill="#e6e6e6" font-size="10" text-anchor="middle">CPU 快取</text><text x="548" y="52" fill="#9aa4b2" font-size="8.5" text-anchor="end">~1 ns</text>
    <rect x="193" y="70" width="175" height="34" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="280" y="92" fill="#e6e6e6" font-size="10" text-anchor="middle">RAM 記憶體</text><text x="548" y="92" fill="#9aa4b2" font-size="8.5" text-anchor="end">~100 ns · 揮發</text>
    <rect x="168" y="110" width="225" height="34" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="280" y="132" fill="#e6e6e6" font-size="10" text-anchor="middle">SSD</text><text x="548" y="132" fill="#9aa4b2" font-size="8.5" text-anchor="end">~0.1 ms</text>
    <rect x="138" y="150" width="285" height="34" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3"/><text x="280" y="172" fill="#e6e6e6" font-size="10" text-anchor="middle">HDD 磁碟(轉盤)</text><text x="548" y="172" fill="#9aa4b2" font-size="8.5" text-anchor="end">~10 ms</text>
    <rect x="100" y="190" width="360" height="34" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.9"/><text x="280" y="212" fill="#e6e6e6" font-size="10.5" text-anchor="middle">物件儲存(S3 / GCS)</text><text x="548" y="212" fill="#9aa4b2" font-size="8.5" text-anchor="end">~100 ms · 超便宜</text>
    <rect x="65" y="230" width="430" height="34" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.3" stroke-dasharray="4 3"/><text x="280" y="252" fill="#e6e6e6" font-size="10" text-anchor="middle">封存 / 冷儲存</text><text x="548" y="252" fill="#9aa4b2" font-size="8.5" text-anchor="end">分鐘~小時 · 最便宜</text>
    <text x="280" y="286" fill="#9aa4b2" font-size="9.5" text-anchor="middle">↓ 越下面:越慢、越便宜、容量越大</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">儲存是一條速度↔成本的階層,單價與延遲各差好幾個數量級;資料工程的重心落在最便宜、幾乎無限的物件儲存(藍)</figcaption>
</figure>

這條階層也是**快取(cache)**的原理:把熱資料往上搬(快、貴),冷資料留在下面(慢、便宜)。[[spark-shuffle|Spark 把資料 cache 進記憶體]]、資料庫用 RAM 當 buffer,都是同一招 —— 拿貴的空間換速度。

## 對資料工程最重要的一層:物件儲存

上層那些(RAM、SSD)多半被資料庫、引擎藏在底下,你不太直接碰。真正天天打交道的是**物件儲存(S3、GCS、Azure Blob)**,書也花最多篇幅在它。快速對照三種系統儲存:

| 型態 | 像什麼 | DE 場景 |
|---|---|---|
| **檔案儲存** | 一般檔案系統、資料夾 | 開發、小量、掛載 |
| **區塊儲存** | 一顆裸硬碟(EBS) | 資料庫 / VM 的底層 |
| **物件儲存** | 一個超大 key-value 倉庫 | **資料湖的地基** |

物件儲存為什麼贏得資料湖?因為它:**幾乎無限擴充、按用量計費超便宜、物件不可變(適合當可重播的原始層)、且天生分離於運算之外。** 最後這點,牽出這章最大的主題。

## 這章最大的主題:運算與儲存分離

傳統資料庫或 Hadoop,**運算和儲存綁在同一台機器上** —— 想加算力,連硬碟一起加;想加容量,連 CPU 一起加,兩邊永遠一起伸縮,結果常常一邊爆滿、一邊閒置。雲時代把它拆開了:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 250" role="img" aria-label="運算與儲存分離的前後對比:傳統把 compute 與 disk 綁在同一台機器一起伸縮;現代把資料放在共用的物件儲存,多個運算引擎按需長出來、算完關掉、各自獨立伸縮" style="width:100%;max-width:660px;height:auto;margin:0 auto;">
    <defs><marker id="st1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="300" y1="30" x2="300" y2="232" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 5"/>
    <text x="150" y="22" fill="#9aa4b2" font-size="10.5" text-anchor="middle">傳統:compute 與 storage 綁死</text>
    <rect x="64" y="48" width="80" height="96" rx="6" fill="none" stroke="#3a4154" stroke-width="1.4"/>
    <rect x="72" y="56" width="64" height="40" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="104" y="80" fill="#e6e6e6" font-size="9" text-anchor="middle">Compute</text>
    <rect x="72" y="100" width="64" height="38" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="104" y="123" fill="#e6e6e6" font-size="9" text-anchor="middle">Disk</text>
    <rect x="168" y="48" width="80" height="96" rx="6" fill="none" stroke="#3a4154" stroke-width="1.4"/>
    <rect x="176" y="56" width="64" height="40" rx="4" fill="#2e4a40" stroke="#54b890" stroke-width="1.3"/><text x="208" y="80" fill="#e6e6e6" font-size="9" text-anchor="middle">Compute</text>
    <rect x="176" y="100" width="64" height="38" rx="4" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="208" y="123" fill="#e6e6e6" font-size="9" text-anchor="middle">Disk</text>
    <text x="150" y="172" fill="#9aa4b2" font-size="8.5" text-anchor="middle">加算力得連硬碟一起加、</text>
    <text x="150" y="186" fill="#9aa4b2" font-size="8.5" text-anchor="middle">加容量得連 CPU 一起加</text>
    <text x="150" y="204" fill="#e6e6e6" font-size="8.5" text-anchor="middle">→ 綁死、常常一邊浪費</text>
    <text x="450" y="22" fill="#9aa4b2" font-size="10.5" text-anchor="middle">現代:compute / storage 分離</text>
    <rect x="340" y="56" width="66" height="42" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="373" y="81" fill="#e6e6e6" font-size="9.5" text-anchor="middle">Spark</text>
    <rect x="417" y="56" width="66" height="42" rx="6" fill="#2e4a40" stroke="#54b890" stroke-width="1.4"/><text x="450" y="81" fill="#e6e6e6" font-size="9.5" text-anchor="middle">SQL 引擎</text>
    <rect x="494" y="56" width="66" height="42" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.3" stroke-dasharray="4 3"/><text x="527" y="81" fill="#e6e6e6" font-size="9.5" text-anchor="middle">臨時作業</text>
    <line x1="373" y1="98" x2="392" y2="148" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#st1)"/>
    <line x1="450" y1="98" x2="450" y2="148" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#st1)"/>
    <line x1="527" y1="98" x2="508" y2="148" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#st1)"/>
    <rect x="336" y="150" width="228" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.7"/><text x="450" y="170" fill="#e6e6e6" font-size="10" text-anchor="middle">物件儲存(共用・持久)</text><text x="450" y="185" fill="#9aa4b2" font-size="8" text-anchor="middle">便宜、幾乎無限</text>
    <text x="450" y="214" fill="#9aa4b2" font-size="8.5" text-anchor="middle">各自獨立伸縮 · 按需開關 · 用完即走</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">運算與儲存分離是雲時代最大的轉變:資料躺在便宜持久的物件儲存,運算引擎按需長出來、算完關掉,兩邊互不綁死</figcaption>
</figure>

這一拆,解釋了近十年一堆架構為什麼長這樣:資料一份放在物件儲存,**要跑 Spark 就開一批 [[airflow-spark-on-k8s|executor pod]]、要下 SQL 就叫一個查詢引擎,算完全部關掉、只留資料**。你不再為「尖峰時要多少算力」養一整年的機器,也不再因為資料變多就被迫加 CPU。[[spark-running|Spark 那套 driver/executor 按需伸縮]]、lakehouse、serverless 查詢,地基全是這一條。

## 三種資料工程的儲存抽象

在物件儲存這塊地基之上,DE 面對的是三個高層抽象。它們的差別在 [[medallion-architecture|Medallion 那篇]]也碰過,這裡用一張表釘清楚:

| 抽象 | 一句話 | schema 時機 |
|---|---|---|
| **資料倉儲(Warehouse)** | 結構化、為分析最佳化 | schema-on-write(進來就得對格式) |
| **資料湖(Lake)** | 什麼都先丟進來的原始池 | schema-on-read(讀的時候才套結構) |
| **資料湖倉(Lakehouse)** | 湖的彈性 + 倉的管理 | 兩者合流(在湖上加 ACID、schema) |

演進的方向很清楚:**湖太亂(什麼都丟、難治理)、倉太硬(貴、只吃結構化),lakehouse 想兩邊的好處都要** —— 在便宜的物件儲存上,補回交易保證與結構管理。

## 資料是有溫度的:冷熱分層與保存期限

最後一個實用概念:**資料溫度**。不是所有資料都該放在同一層。

- **熱(hot)**:常被查,放快的層(SSD / 記憶體 / 標準物件儲存),貴但快。
- **溫(warm)**:偶爾查,放便宜一點的層。
- **冷(cold)**:幾乎不查、但為了合規或備份得留,丟進封存(冷儲存),最便宜、取用最慢。

搭配的是**保存期限(retention)**:資料不是存了就永遠留著,而該有生命週期 —— 什麼時候降溫、什麼時候刪。這既是**省錢**(別讓冷資料佔著貴的層),也是**合規**(該刪的要刪)。跟 [[kafka-ops|Kafka 的 retention / compaction]]是同一種思維:**儲存要主動管理,不是無限堆積。**

## 反思

### 「運算與儲存分離」是我近幾年最有感的一次架構轉變

這章把一個我天天在用、卻沒歸納成一句話的東西講白了。以前資源就是一台台「CPU 配硬碟」的機器,一起買、一起閒置;現在我的預設是 **資料放物件儲存、運算按需長出來**。最直接的好處是成本結構變了 —— 沒作業時幾乎不花運算錢,尖峰時才把 [[airflow-spark-on-k8s|executor]] 開滿。我寫 [[spark-running|Spark 部署]]、[[airflow-spark-on-k8s|Spark on K8s]] 那兩篇時反覆講的「用完即刪」,追根究柢就是這章這條原理的落地。看懂它,很多雲上架構為什麼那樣設計,一下就通了。

### 我押注的儲存地基,還是物件儲存

回頭看 [[fode-4|Ch.4]]講的「賭在不變的地基上」,儲存這層我下的注很一致:**原始資料一律先落物件儲存**,不可變、可重播,再讓上面的引擎自由來去。這跟 [[medallion-architecture|Medallion]] 守著 Bronze 不可變是同一個決定的兩面。物件儲存便宜到「先存了再說」幾乎不痛,而它十年後大概還在 —— 把最重要的資產放在最穩、最便宜的一層,是我越做越安心的選擇。

### 資料溫度這件事,我是被帳單教會的

「冷熱分層」聽起來很基本,但我真正開始認真管,是被雲端儲存帳單嚇到之後。一堆一年被查不到一次的舊資料,躺在標準層按天燒錢。後來把生命週期規則設起來(自動降溫、自動封存、過期清掉),帳單立刻瘦一圈。教訓是:**儲存的成本不在「存」,在「忘了管」。** 現在我建任何資料層,retention 與分層規則會跟資料本身一起設計,而不是等帳單爆了才回頭補 —— 這跟我對 [[pain-before-power|工具]]的態度一樣,主動設計取捨,別讓預設值替你決定成本。
