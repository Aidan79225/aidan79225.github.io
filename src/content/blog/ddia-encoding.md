---
title: "編碼與演化:讓新舊程式碼,讀得懂彼此的資料"
date: 2026-07-23
category: tech
description: "為什麼要在意 Avro、Protobuf 這些編碼格式?因為兩個躲不掉的事實:資料比程式碼活得久(五年前寫進 DB 的資料還在),而滾動更新讓新舊版程式碼永遠並存。於是 schema 一定會變,而變的那一刻,新程式要讀得懂舊資料(向後相容)、舊程式也要讀得懂新資料(向前相容——最容易被忘的那一半)。DDIA Ch4 講透這件事:JSON 的含糊、Protobuf/Thrift 靠 field tag 演化的機制、Avro 的 writer/reader schema,以及 schema 作為一份「跨時間的契約」該怎麼管。"
tags:
  - distributed-systems
  - book-notes
  - data-engineering
series: "Designing Data-Intensive Applications 讀書筆記"
seriesOrder: 4
comments: true
draft: false
---
[[ddia-storage-engines|上一篇]]講資料怎麼放上磁碟,這篇講一個更容易被輕視的問題:**資料寫出去時,是用什麼格式編碼的?** 你可能覺得「JSON 就好了啊」——直到 schema 要改的那一天。這章的重量,來自兩個躲不掉的事實:**資料比程式碼活得久**(程式碼你今天就能全部換新,但五年前寫進資料庫的那筆資料還躺在那),而且**新舊版程式碼會同時運作**(只要你用[[k8s-deployment|滾動更新]],這就是常態,不是意外)。這兩件事合起來,把「編碼格式」從小事變成了**跨版本、跨時間的相容性工程**。

## 為什麼需要「兩種」相容:滾動更新把新舊逼到同一時刻

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="滾動更新期間,新版與舊版程式碼同時在跑、共用同一個資料庫。於是資料雙向流動:新程式會讀到舊程式寫的資料,這需要向後相容;舊程式也會讀到新程式寫的資料,這需要向前相容。向後相容大家都記得,向前相容最常被忘,但在滾動更新與回滾的窗口裡它天天發生。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="ec" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker><marker id="ec2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e0733a"/></marker></defs>
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">滾動更新中:新舊版同時在跑,資料雙向流動</text>
    <rect x="36" y="36" width="150" height="54" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.6"/><text x="111" y="58" fill="#4f6df5" font-size="9.6" text-anchor="middle" font-weight="bold">新版程式 v2</text><text x="111" y="76" fill="#9aa4b2" font-size="7.4" text-anchor="middle">已升級的那幾台</text>
    <rect x="394" y="36" width="150" height="54" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.4"/><text x="469" y="58" fill="#e6e6e6" font-size="9.6" text-anchor="middle" font-weight="bold">舊版程式 v1</text><text x="469" y="76" fill="#9aa4b2" font-size="7.4" text-anchor="middle">還沒輪到的那幾台</text>
    <path d="M218 62 v30 a72 8 0 0 0 144 0 v-30" fill="#33291a" stroke="#d6a45c" stroke-width="1.6"/><ellipse cx="290" cy="62" rx="72" ry="8" fill="#33291a" stroke="#d6a45c" stroke-width="1.6"/><text x="290" y="85" fill="#d6a45c" font-size="8.6" text-anchor="middle" font-weight="bold">同一個資料庫 / topic</text>
    <path d="M186 54 C 220 40, 252 44, 268 54" fill="none" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2"/><path d="M394 54 C 360 40, 328 44, 312 54" fill="none" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2"/>
    <text x="290" y="36" fill="#9aa4b2" font-size="7" text-anchor="middle">兩邊都在寫、也都在讀</text>
    <rect x="30" y="128" width="256" height="56" rx="8" fill="#1f2330" stroke="#54b890" stroke-width="1.5"/>
    <text x="158" y="148" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">向後相容 backward</text>
    <text x="158" y="164" fill="#e6e6e6" font-size="8.2" text-anchor="middle">新程式,讀得懂「舊資料」</text>
    <text x="158" y="177" fill="#9aa4b2" font-size="7.2" text-anchor="middle">大家都記得(migration 思維)</text>
    <rect x="294" y="128" width="256" height="56" rx="8" fill="#1f2330" stroke="#e0733a" stroke-width="1.5"/>
    <text x="422" y="148" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">向前相容 forward</text>
    <text x="422" y="164" fill="#e6e6e6" font-size="8.2" text-anchor="middle">舊程式,讀得懂「新資料」</text>
    <text x="422" y="177" fill="#9aa4b2" font-size="7.2" text-anchor="middle">最常被忘,但滾動與回滾窗口天天發生</text>
    <line x1="140" y1="96" x2="152" y2="126" stroke="#54b890" stroke-width="1.3" marker-end="url(#ec)"/>
    <line x1="440" y1="96" x2="428" y2="126" stroke="#e0733a" stroke-width="1.3" marker-end="url(#ec2)"/>
    <text x="290" y="212" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">schema 每一次變更,兩種相容都要顧——少一邊,滾動到一半就開始噴錯</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><a href="/blog/k8s-deployment/">滾動更新</a>期間,<b style="color:#4f6df5">新版</b>與<b>舊版</b>程式同時在跑、共用同一個資料庫或 topic——於是資料<b>雙向</b>流動。<b style="color:#54b890">向後相容</b>(新讀舊)大家都記得,因為那是 migration 的日常;<b style="color:#e0733a">向前相容</b>(舊讀新)才是最常被忘的那一半——可它在每次滾動的窗口、以及<b>回滾</b>(退回舊版後,新版已寫入的資料還在!)時天天發生。schema 的每一次變更,兩種相容都要顧</figcaption>
</figure>

先把 JSON 的問題說完:它人類可讀、到處都通,但**沒有 schema 強制力**(欄位改名、型別改掉,編譯期沒人攔你,炸在 runtime)、數字含糊(大整數精度、int/float 不分)、又肥。小系統無所謂;**一旦資料要跨團隊、跨服務、活很多年,你就需要「有 schema 的二進位格式」**——這就輪到 Thrift、Protocol Buffers 和 Avro 上場。

## Field tag:讓演化安全的那個小機關

Protobuf / Thrift 的核心巧思,是編碼時**不寫欄位名稱,只寫「field tag」(一個數字)**。schema 是雙方各自持有的說明書,tag 是資料裡的座標。而正是這個小機關,讓 schema 可以安全地演化:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 224" role="img" aria-label="field tag 如何讓新舊互讀都安全。中間是 schema:tag 1 是 name、tag 2 是 email,v2 新增 tag 3 是 phone。左下:舊程式讀到新資料,遇到不認識的 tag 3,直接跳過,照樣讀出 name 與 email,向前相容成立。右下:新程式讀舊資料,找不到 tag 3,就用預設值,向後相容成立。底下三條鐵律:新欄位一定用新 tag、tag 永遠不能改或重用、新欄位必須可省略或有預設值。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="290" y="18" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">編碼裡沒有欄位名,只有 tag——演化因此安全</text>
    <rect x="170" y="30" width="240" height="66" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="290" y="46" fill="#4f6df5" font-size="8.6" text-anchor="middle" font-weight="bold">schema v2</text>
    <text x="290" y="61" fill="#e6e6e6" font-size="8" text-anchor="middle" font-family="monospace">1: name    2: email</text>
    <text x="290" y="76" fill="#54b890" font-size="8" text-anchor="middle" font-family="monospace">3: phone(v2 新增,optional)</text>
    <text x="290" y="89" fill="#9aa4b2" font-size="6.8" text-anchor="middle">資料裡只存 tag 編號 + 值,不存名稱</text>
    <rect x="24" y="120" width="262" height="62" rx="8" fill="#1f2330" stroke="#e0733a" stroke-width="1.5"/>
    <text x="155" y="138" fill="#e0733a" font-size="8.8" text-anchor="middle" font-weight="bold">舊程式(只認識 tag 1、2)讀「新資料」</text>
    <text x="155" y="154" fill="#e6e6e6" font-size="7.8" text-anchor="middle">遇到不認識的 tag 3 → 跳過</text>
    <text x="155" y="170" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">name / email 照讀 → 向前相容 ✓</text>
    <rect x="294" y="120" width="262" height="62" rx="8" fill="#1f2330" stroke="#54b890" stroke-width="1.5"/>
    <text x="425" y="138" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">新程式讀「舊資料」(沒有 tag 3)</text>
    <text x="425" y="154" fill="#e6e6e6" font-size="7.8" text-anchor="middle">找不到 tag 3 → 用預設值</text>
    <text x="425" y="170" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">不會炸 → 向後相容 ✓</text>
    <rect x="60" y="192" width="460" height="24" rx="6" fill="#33291a" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="290" y="208" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-weight="bold">鐵律:新欄位用新 tag · tag 永不改/重用 · 新欄位必須 optional 或有預設值</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">因為編碼裡只有 <b>tag 編號</b>、沒有名稱:<b style="color:#e0733a">舊程式讀新資料</b>時,遇到不認識的 tag 直接<b>跳過</b>,其餘照讀(向前相容);<b style="color:#54b890">新程式讀舊資料</b>時,找不到新 tag 就用<b>預設值</b>(向後相容)。整套演化安全就靠三條鐵律:新欄位一定用<b>新的 tag</b>、tag <b>永遠不能改或重用</b>(那是舊資料的座標!)、新欄位必須 optional 或有預設值。順帶一提,欄位「改名」因此是安全的——編碼裡本來就沒有名字</figcaption>
</figure>

**Avro** 走另一條更極致的路:編碼裡**連 tag 都沒有**,就是值一個接一個排——所以它最省空間,但讀取時必須拿著 **writer's schema**(寫入當時的)和 **reader's schema**(你現在期望的)做**解析對照**,由 Avro 負責把兩個版本的差異調和掉(欄位比對用名稱、缺的補預設)。這個「讀時調和兩份 schema」的設計,讓它特別適合 schema 常變、或**動態產生 schema** 的場景(例如從資料庫 dump 整批資料)——這也是它成為大資料與 [[kafka-ecosystem|Kafka Schema Registry]] 生態主流的原因:registry 集中管 schema 版本、檢查每次變更有沒有破壞相容,把這章講的紀律變成了自動把關。

## 反思

### 資料比程式碼活得久——相容性是一份「跨時間的 API」

這章最打到我的一句話是 **data outlives code**。程式碼你今天就能全部換新,但五年前寫進資料庫的那筆資料、三年前落在 [[kafka-intro|log]] 裡的那則事件,還原封不動躺在那,等著未來某天被讀。所以 schema 相容性的本質,不是「格式的小事」,是**你跟過去與未來的自己簽的 API 契約**——向後相容是對過去負責,向前相容是對未來謙虛。想通這點後,我看 schema 變更的嚴肅程度,跟看對外 API 的 breaking change 是同一等級:**改一個欄位,就是在改一份所有歷史資料都引用中的介面。**

### 向前相容,是最容易被忘、卻天天在發生的那一半

向後相容大家都有 sense(migration 思維);**向前相容——舊程式讀得懂新資料——才是實務上最常炸的那半**。它發生在兩個你躲不掉的窗口:滾動更新進行中(舊實例讀到新實例剛寫的資料),以及**回滾之後**(退回舊版了,但新版已經寫進去的資料還在!)。我的教訓是把它變成部署紀律:**schema 變更和程式變更分開上、schema 先行**——先上「能讀新格式但還不寫」的版本,確認全面鋪開,才開始寫新格式。這跟 [[k8s-deployment|滾動更新]]「小步、可回退」是同一種安全感的兩面:**程式可以回滾,資料不能——所以資料格式的每一步,都要讓前後兩個版本都接得住。**

### 沒有 schemaless 這回事,只有「沒寫下來的 schema」

做資料這行越久,我越不相信「schemaless 很自由」這句話。資料只要被讀,就一定有人對它的結構抱著預期——**schema 永遠存在,差別只是它被顯式寫下來、有人把關,還是散落在每個讀取方的程式碼裡、靠默契維持**。[[ddia-data-models|上上篇]]的 schema-on-read 是把檢查延後,不是讓結構消失;而所謂的自由,常常是「寫入方自由了,讀取方在半夜收爛攤」。所以我的立場很清楚:**資料要跨團隊或跨時間,契約就要顯式化**——Protobuf/Avro 的 schema 檔進版控、[[kafka-ecosystem|Schema Registry]] 自動擋不相容的變更。這跟我在 [[k8s-intro|宣告式與版控]]、dashboard as code 一路講的是同一條紀律:**重要的約定,不能活在人的腦袋裡。**
