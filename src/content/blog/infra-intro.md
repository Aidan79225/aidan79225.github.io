---
title: "從 Infra 角度看一個工具,要問哪些問題"
date: 2026-07-17
category: tech
description: "學一個工具和把它放進 Production,是兩種完全不同的問題。學的時候問『怎麼用』;上 Production 問『它會怎麼掛、怎麼長大、半夜壞了怎麼救、要幾台、資料放哪』。這篇立下一套 Infra 體檢表——部署拓撲、狀態與儲存、擴展、HA、容量、監控、調校、故障模式,套在任何工具上都適用;以及貫穿整個系列的核心軸線:stateful ↔ stateless。一個工具有狀態還是無狀態,幾乎決定了它怎麼擴、怎麼做 HA、在 k8s 上怎麼跑、半夜掛了好不好救。"
tags:
  - infrastructure
  - concept
series: "從 Infra 角度看資料工具"
seriesOrder: 1
comments: true
draft: false
---
學一個工具、和把它**放進 Production**,是兩種完全不同的問題。學的時候你問「這個 API 怎麼用、這個概念是什麼」;上 Production 時你問的是另一組問題——**它會怎麼掛?怎麼長大?半夜壞了怎麼救?要幾台、多少記憶體?資料放哪、掉了能不能救回來?** 這個系列,就是用**同一套框架**,把每個工具當成「一塊 infra」來體檢。這第一篇,先把框架立起來。

## Infra 體檢表:看任何工具都問這 8 題

不管面對 Kafka、Spark 還是一個你沒看過的新東西,把它當 infra 看時,要問的其實是同一組問題:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 220" role="img" aria-label="Infra 體檢表,看任何工具都問這八題。第一部署拓撲,由哪些角色組成、幾台。第二狀態與儲存,有狀態嗎、資料放哪、掉了能不能重建,這題最關鍵。第三擴展,水平加機器還是垂直加規格。第四 HA 與故障轉移,掛一台誰接手、有沒有單點。第五容量,瓶頸是 CPU 記憶體磁碟還是網路。第六監控,該盯哪些指標。第七調校旋鈕,哪些設定決定生死。第八故障模式,最常怎麼壞。第二題狀態是樞紐,決定其他七題的答案。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">Infra 體檢表:看任何工具都問這 8 題</text>
    <rect x="14" y="32" width="272" height="38" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.2"/><text x="26" y="49" fill="#4f6df5" font-size="9" text-anchor="start" font-weight="bold">① 部署拓撲</text><text x="26" y="63" fill="#9aa4b2" font-size="7.6" text-anchor="start">由哪些角色組成?幾台?誰是大腦誰是工人?</text>
    <rect x="294" y="32" width="272" height="38" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.6"/><text x="306" y="49" fill="#d6a45c" font-size="9" text-anchor="start" font-weight="bold">② 狀態與儲存 ★樞紐</text><text x="306" y="63" fill="#e6e6e6" font-size="7.6" text-anchor="start">有狀態嗎?資料放哪?掉了能重建嗎?</text>
    <rect x="14" y="76" width="272" height="38" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="26" y="93" fill="#e6e6e6" font-size="9" text-anchor="start" font-weight="bold">③ 擴展</text><text x="26" y="107" fill="#9aa4b2" font-size="7.6" text-anchor="start">水平(加機器)還是垂直(加規格)?</text>
    <rect x="294" y="76" width="272" height="38" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="306" y="93" fill="#e6e6e6" font-size="9" text-anchor="start" font-weight="bold">④ HA / 故障轉移</text><text x="306" y="107" fill="#9aa4b2" font-size="7.6" text-anchor="start">掛一台誰接手?有沒有單點?</text>
    <rect x="14" y="120" width="272" height="38" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="26" y="137" fill="#e6e6e6" font-size="9" text-anchor="start" font-weight="bold">⑤ 容量規劃</text><text x="26" y="151" fill="#9aa4b2" font-size="7.6" text-anchor="start">瓶頸是 CPU / 記憶體 / 磁碟 / 網路?</text>
    <rect x="294" y="120" width="272" height="38" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="306" y="137" fill="#e6e6e6" font-size="9" text-anchor="start" font-weight="bold">⑥ 監控</text><text x="306" y="151" fill="#9aa4b2" font-size="7.6" text-anchor="start">該盯哪些指標?怎麼知道它快不行了?</text>
    <rect x="14" y="164" width="272" height="38" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="26" y="181" fill="#e6e6e6" font-size="9" text-anchor="start" font-weight="bold">⑦ 調校旋鈕</text><text x="26" y="195" fill="#9aa4b2" font-size="7.6" text-anchor="start">哪些設定會決定生死?</text>
    <rect x="294" y="164" width="272" height="38" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="306" y="181" fill="#e6e6e6" font-size="9" text-anchor="start" font-weight="bold">⑧ 故障模式</text><text x="306" y="195" fill="#9aa4b2" font-size="7.6" text-anchor="start">它最常怎麼壞?壞了長什麼樣?</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">這八題是這個系列的骨架,之後看每個工具都會一路對照。而其中<b style="color:#d6a45c">第②題「狀態」是樞紐</b>——它幾乎決定了其他七題的答案:一個工具有沒有狀態、狀態放哪,直接牽動它怎麼擴、怎麼做 HA、在 k8s 上怎麼跑、半夜掛了好不好救。所以看任何 infra,我第一個問的永遠是這題</figcaption>
</figure>

## 一條軸決定一切:stateful ↔ stateless

為什麼「狀態」是樞紐?因為一個工具**有狀態(stateful)還是無狀態(stateless)**,幾乎決定了它在 Production 的一切。這條軸是整個系列最重要的一把尺:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="Stateful 與 stateless 的對比,以及在 k8s 上怎麼跑。左邊 stateful 有狀態,資料就在它身上,例如 Kafka 的 log、Redis 的記憶體、RabbitMQ 的 queue、Airflow 的 metadata DB;特徵是難擴難搬、掛了可能丟資料,在 k8s 上要用 StatefulSet 加 PV 加穩定身分。右邊 stateless 無狀態,身上沒有不可取代的資料只是幹活,例如 Spark executor、Airflow worker、Kafka Connect worker;特徵是好水平擴、可拋換一個就好,在 k8s 上跑 Deployment 加 autoscale。兩者共同的底座是 Kubernetes。認出哪部分有狀態是關鍵,多數工具是混血,有 stateful 核心加 stateless 工人。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">一條軸決定一切:stateful ↔ stateless</text>
    <line x1="290" y1="30" x2="290" y2="164" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="146" y="44" fill="#d6a45c" font-size="9.6" text-anchor="middle" font-weight="bold">Stateful 有狀態</text><text x="146" y="56" fill="#9aa4b2" font-size="7.6" text-anchor="middle">資料就在它身上</text>
    <rect x="18" y="62" width="120" height="20" rx="4" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1"/><text x="78" y="76" fill="#e6e6e6" font-size="7.6" text-anchor="middle">Kafka(log)</text>
    <rect x="146" y="62" width="120" height="20" rx="4" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1"/><text x="206" y="76" fill="#e6e6e6" font-size="7.6" text-anchor="middle">Redis(記憶體)</text>
    <rect x="18" y="86" width="120" height="20" rx="4" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1"/><text x="78" y="100" fill="#e6e6e6" font-size="7.6" text-anchor="middle">RabbitMQ(queue)</text>
    <rect x="146" y="86" width="120" height="20" rx="4" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1"/><text x="206" y="100" fill="#e6e6e6" font-size="7.4" text-anchor="middle">Airflow metadata</text>
    <text x="146" y="126" fill="#9aa4b2" font-size="7.8" text-anchor="middle">難擴難搬 · 掛了可能丟</text>
    <text x="146" y="142" fill="#e0733a" font-size="8" text-anchor="middle" font-weight="bold">k8s → StatefulSet + PV</text>
    <text x="434" y="44" fill="#54b890" font-size="9.6" text-anchor="middle" font-weight="bold">Stateless 無狀態</text><text x="434" y="56" fill="#9aa4b2" font-size="7.6" text-anchor="middle">身上沒有不可取代的資料</text>
    <rect x="314" y="62" width="120" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1"/><text x="374" y="76" fill="#e6e6e6" font-size="7.6" text-anchor="middle">Spark executor</text>
    <rect x="442" y="62" width="120" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1"/><text x="502" y="76" fill="#e6e6e6" font-size="7.6" text-anchor="middle">Airflow worker</text>
    <rect x="314" y="86" width="248" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1"/><text x="438" y="100" fill="#e6e6e6" font-size="7.6" text-anchor="middle">Kafka Connect worker</text>
    <text x="434" y="126" fill="#9aa4b2" font-size="7.8" text-anchor="middle">好水平擴 · 可拋、換一個就好</text>
    <text x="434" y="142" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">k8s → Deployment + autoscale</text>
    <rect x="18" y="172" width="544" height="26" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="290" y="189" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">Kubernetes:兩者共同的底座</text>
    <text x="290" y="216" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">認出「哪部分有狀態」是關鍵——多數工具是混血:stateful 核心 + stateless 工人</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#d6a45c">Stateful</b> 的資料就長在它身上(Kafka 的 log、Redis 的記憶體、RabbitMQ 的 queue),所以難擴(要搬資料)、難搬(綁著磁碟/記憶體)、掛了可能丟——在 k8s 上得用 <b>StatefulSet + PV</b> 給它穩定的身分與儲存。<b style="color:#54b890">Stateless</b> 身上沒有不可取代的東西,只是幹活,所以好擴、可拋——跑 <b>Deployment + autoscale</b> 就好。而多數工具其實是<b>混血</b>:Airflow 的 worker 無狀態、但它的 metadata DB 有狀態且是命門——認出「哪一塊有狀態」,是看懂一個工具 infra 的第一步</figcaption>
</figure>

這條軸的威力在於,它把一個看似複雜的問題**收斂成一個問句**:面對任何工具,先問「它哪一部分有狀態?」——答案幾乎自動推出後面所有 infra 決策。無狀態的部分,加機器、掛了就換,輕鬆;有狀態的部分,才是你要小心翼翼對待的地方——它的複製、備份、故障轉移、擴縮時的資料搬遷,才是真正的難題。也因此,這系列後面會先寫**有狀態的重量級**(Kafka、Redis、RabbitMQ),再寫**無狀態的運算與連接器**(Spark、Airflow worker、Kafka Connect)——因為狀態,才是 infra 的難度所在。

## 反思

### Infra 視角,是從「怎麼用」升級到「怎麼養」

我職涯的一個轉捩點,是意識到「會用一個工具」和「能把它養在 Production」是兩種能力。前者靠讀文件、跑 tutorial 就會;後者要你回答一堆文件不太教的問題——它半夜三點會怎麼壞、擴容時會不會掉資料、監控該盯什麼才能提早發現。剛工作時我以為「學會用」就夠了,直到第一次被 on-call 叫醒、對著一個「明明教學都跑得好好的」系統束手無策,才懂那之間差了一整個維度。這個系列就是想補上那個維度:**不是教你怎麼用這些工具,而是教你怎麼把它們當 infra 養活、養穩、養大。**

### 「哪裡有狀態」是我看任何系統的第一個問題

做了幾年後端和資料,我越來越相信一句話:**狀態是複雜度的根源。** 無狀態的東西幾乎不會給你惹麻煩——它可以隨便複製、隨便重啟、隨便丟掉換一個;所有真正的難題,幾乎都圍繞著「狀態」打轉:資料一致性、故障轉移、擴縮容時怎麼搬、備份怎麼還原。所以我現在看任何系統(不只這些工具),第一個問的永遠是「**狀態在哪、誰擁有它、掉了會怎樣**」。把有狀態的那一小塊圈出來、小心對待,其餘的無狀態部分反而好辦。這個「先找狀態」的直覺,是我覺得最能遷移、最值錢的 infra 素養。

### 一套可遷移的框架,勝過十個工具的操作手冊

這系列刻意用「同一套體檢表」去看每個工具,不是偷懶,而是我真心相信**框架比細節更值得學**。工具會過時、指令會忘記,但「看一個 infra 該問哪 8 個問題」這套框架,是能跟著你一輩子的。有了它,哪天遇到一個沒人教過的新工具,你也能自己上手——照著體檢表問一遍拓撲、狀態、擴展、故障,答案就浮出來了。這也呼應了我在 [[sre-onboarding-inhouse|空降新公司]]那篇的心得:面對陌生的系統,**你需要的不是背下所有細節,而是一套能套上去、逼出正確問題的框架**。可遷移的思考方式,才是對抗「工具一直換」的唯一解。
