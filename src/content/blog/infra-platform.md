---
title: "把它們兜成一個資料平台"
date: 2026-07-22
category: tech
description: "系列收官:前面八篇一個一個工具看,這篇把它們兜成一個平台。而兜的方法,不是把七個工具背起來,是抓住那條從第一篇就在講的軸——stateful ↔ stateless。它一句話決定了每個工具在平台裡的位置:怎麼跑(StatefulSet vs Deployment)、能不能 autoscale、HA 要不要過半、要不要自己養。這篇畫出一個資料平台的分層、用 self-host vs managed 的兩個維度決定每塊自己養還是託管、以及怎麼用 LGTM 一塊玻璃看住這一整片異質工具。"
tags:
 - infrastructure
 - platform
series: "從 Infra 角度看資料工具"
seriesOrder: 9
comments: true
draft: false
---
前面八篇,一個一個工具看。這篇把它們兜成一個平台。而「兜」的方法,不是把七個工具的細節背起來——是抓住那條[[infra-intro|從第一篇就在講的軸]]:**stateful ↔ stateless**。這條軸一句話決定了每個工具在平台裡的位置:怎麼跑、能不能 autoscale、HA 要不要過半、要不要自己養。整個系列,最後就收束成這一張圖、一條軸、一塊玻璃、一筆人力帳。

## 一個資料平台,長這樣

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 580 250" role="img" aria-label="一個資料平台的分層。最底層是 Kubernetes 底座,含 control plane 與 etcd,所有東西跑在上面。中間分兩欄:左欄是 stateful 核心,用 StatefulSet 加 PV 跑,包含 Kafka、Redis、RabbitMQ、Metadata DB,特性是少動、保護狀態、HA 靠過半、傾向 managed。右欄是 stateless 運算,用 Deployment 加 autoscale 跑,包含 Spark、Airflow worker、Connect worker,特性是可拋、隨開隨關、借外部狀態、傾向 self-host。最上層橫貫一條 LGTM 觀測層,用一塊玻璃看全平台。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
  <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">一個資料平台的分層</text>
  <rect x="24" y="24" width="532" height="32" rx="7" fill="#2a2340" stroke="#9b6ff0" stroke-width="1.5"/><text x="290" y="39" fill="#9b6ff0" font-size="9" text-anchor="middle" font-weight="bold">監控 LGTM:一塊玻璃看全平台</text><text x="290" y="51" fill="#9aa4b2" font-size="7.4" text-anchor="middle">Grafana · Loki(logs)· Tempo(traces)· Prometheus / Mimir(metrics)</text>
  <rect x="24" y="66" width="266" height="114" rx="8" fill="none" stroke="#e0733a" stroke-width="1.5"/><text x="157" y="82" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">Stateful 核心 — StatefulSet + PV</text>
  <rect x="38" y="90" width="116" height="28" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/><text x="96" y="108" fill="#e6e6e6" font-size="8.4" text-anchor="middle">Kafka</text><rect x="160" y="90" width="116" height="28" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/><text x="218" y="108" fill="#e6e6e6" font-size="8.4" text-anchor="middle">Redis</text>
  <rect x="38" y="122" width="116" height="28" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/><text x="96" y="140" fill="#e6e6e6" font-size="8.4" text-anchor="middle">RabbitMQ</text><rect x="160" y="122" width="116" height="28" rx="5" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/><text x="218" y="140" fill="#e6e6e6" font-size="8" text-anchor="middle">Metadata DB</text>
  <text x="157" y="167" fill="#9aa4b2" font-size="7.4" text-anchor="middle">少動・保護狀態・HA 過半・傾向 managed</text>
  <rect x="300" y="66" width="256" height="114" rx="8" fill="none" stroke="#54b890" stroke-width="1.5"/><text x="428" y="82" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">Stateless 運算 — Deployment + autoscale</text>
  <rect x="314" y="90" width="228" height="24" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="428" y="106" fill="#e6e6e6" font-size="8.4" text-anchor="middle">Spark executor</text>
  <rect x="314" y="118" width="228" height="24" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="428" y="134" fill="#e6e6e6" font-size="8.4" text-anchor="middle">Airflow worker</text>
  <rect x="314" y="146" width="228" height="20" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="428" y="160" fill="#e6e6e6" font-size="8" text-anchor="middle">Kafka Connect worker</text>
  <text x="428" y="175" fill="#9aa4b2" font-size="7.4" text-anchor="middle">可拋・隨開隨關・借外部狀態・傾向 self-host</text>
  <rect x="24" y="190" width="532" height="32" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="290" y="205" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">Kubernetes 底座</text><text x="290" y="217" fill="#9aa4b2" font-size="7.4" text-anchor="middle">control plane + etcd —— 所有東西都跑在這上面</text>
  <text x="290" y="240" fill="#d6a45c" font-size="8" text-anchor="middle" font-weight="bold">一條軸決定分層:有狀態的沉在核心層少動;無狀態的浮在運算層隨開隨關</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">整個平台是一個三明治:<b style="color:#4f6df5">Kubernetes</b> 當底座,中間分成兩層——<b style="color:#e0733a">stateful 核心</b>(Kafka / Redis / RabbitMQ / 各種 metadata DB)沉在下面,用 <b>StatefulSet + PV</b> 跑,少動、保護、HA 靠過半;<b style="color:#54b890">stateless 運算</b>(Spark / Airflow / Connect 的 worker)浮在上面,用 <b>Deployment + autoscale</b> 跑,可拋、隨開隨關。最上面橫貫一條 <b style="color:#9b6ff0">LGTM 觀測層</b>,把這一整片異質工具收進一塊玻璃。<b>你不用記七個工具怎麼部署,只要問一句「它有狀態嗎」,它該落哪一層就定了</b></figcaption>
</figure>

## 一條軸,決定一個工具的一切

這張圖背後,是整個系列反覆驗證的一件事:**「它有沒有狀態」這一題,幾乎決定了一個工具的所有 infra 決策。** 把七個工具攤開對照,規律清楚到近乎機械:

| | **Stateful 核心** | **Stateless 運算** |
|---|---|---|
| 代表 | Kafka、Redis、RabbitMQ、Metadata DB | Spark executor、Airflow worker、Connect worker |
| 在 k8s 上 | StatefulSet + PV(穩定身分、綁自己的盤) | Deployment + autoscale(隨用隨拋) |
| 擴縮 | 難,要搬資料 / 搬 partition / 搬 slot | 易,加 worker 就好、還能自動擴 |
| HA | 靠**過半**(quorum / Sentinel / Raft) | 掛了 rebalance、重算,不丟東西 |
| 狀態在哪 | **就是它本體**,或它借的外部儲存 | 借外部(S3 / metadata DB / Kafka 自己) |
| 自己養? | 傾向 **managed**(狀態太可怕) | 傾向 **self-host**(反正可拋、省錢) |

所以下次來一個你沒見過的工具(ClickHouse、Flink、Pulsar…),別急著從頭學。先問那一句:**它的狀態在哪、可不可拋?** 答案一出來,它該用 StatefulSet 還 Deployment、能不能 autoscale、HA 要不要過半、該不該自己養——一整排答案就跟著有了框架。這才是這個系列想給你的:**一把尺,不是一堆零散的答案。**

## self-host vs managed:兩個維度,一塊一塊決定

「自己養還是託管」不該一刀切,而是**每一塊分開決定**。判準有兩個維度:**這塊的狀態多可怕**(丟了多痛),以及**你的團隊有沒有人養得動**:

<figure style="margin:1.5rem 0;text-align:center;">
 <svg viewBox="0 0 560 224" role="img" aria-label="self-host 與 managed 的決策,由兩個維度決定。橫軸是狀態多可怕，越往右丟了越痛。縱軸是團隊維運能量，越往上越有人養得動。左半邊是無狀態、可拋的東西，例如 Spark、Airflow、Connect，一律 self-host on K8s 最省錢。右下角是狀態可怕但團隊沒能量，例如 Kafka、Redis、資料庫，強烈建議用 managed，像 RDS、MSK、ElastiCache。右上角是狀態可怕但團隊有專人，可以 self-host 但要有人專門顧。底線是算的是維運人力，不是授權費。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
  <text x="280" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">self-host vs managed:兩個維度決定</text>
  <line x1="70" y1="180" x2="540" y2="180" stroke="#9aa4b2" stroke-width="1.2"/><text x="305" y="198" fill="#9aa4b2" font-size="8" text-anchor="middle">狀態多可怕(丟了多痛)→</text>
  <line x1="70" y1="180" x2="70" y2="30" stroke="#9aa4b2" stroke-width="1.2"/><text x="40" y="105" fill="#9aa4b2" font-size="8" text-anchor="middle" transform="rotate(-90 40 105)">團隊維運能量 →</text>
  <line x1="300" y1="30" x2="300" y2="180" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
  <rect x="78" y="36" width="212" height="138" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.3" opacity="0.5"/><text x="184" y="60" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">stateless / 可拋</text><text x="184" y="76" fill="#e6e6e6" font-size="8.4" text-anchor="middle">→ self-host on K8s 最省</text>
  <circle cx="150" cy="120" r="4" fill="#54b890"/><text x="150" y="136" fill="#9aa4b2" font-size="7.4" text-anchor="middle">Spark</text><circle cx="210" cy="100" r="4" fill="#54b890"/><text x="210" y="116" fill="#9aa4b2" font-size="7.4" text-anchor="middle">Airflow</text><circle cx="250" cy="140" r="4" fill="#54b890"/><text x="250" y="156" fill="#9aa4b2" font-size="7.4" text-anchor="middle">Connect</text>
  <rect x="310" y="110" width="224" height="64" rx="8" fill="#3a2626" stroke="#e05a7d" stroke-width="1.4"/><text x="422" y="130" fill="#e05a7d" font-size="9.4" text-anchor="middle" font-weight="bold">狀態可怕 + 團隊小</text><text x="422" y="146" fill="#e6e6e6" font-size="8.4" text-anchor="middle">→ managed(強烈建議)</text><text x="422" y="161" fill="#9aa4b2" font-size="7.4" text-anchor="middle">RDS / MSK / ElastiCache</text>
  <rect x="310" y="36" width="224" height="64" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="422" y="56" fill="#e6e6e6" font-size="9" text-anchor="middle" font-weight="bold">狀態可怕 + 有專人</text><text x="422" y="72" fill="#9aa4b2" font-size="8" text-anchor="middle">→ self-host 可,但要人專顧</text><text x="422" y="87" fill="#9aa4b2" font-size="7.4" text-anchor="middle">Kafka / Redis / DB 自建</text>
  <circle cx="360" cy="150" r="4" fill="#d6a45c"/><text x="360" y="166" fill="#9aa4b2" font-size="7.2" text-anchor="middle">Redis</text><circle cx="470" cy="150" r="4" fill="#d6a45c"/><text x="470" y="166" fill="#9aa4b2" font-size="7.2" text-anchor="middle">Kafka</text>
  <text x="280" y="216" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">算的是「維運人力」,不是授權費——狀態越可怕、團隊越小,越該租給雲商</text>
 </svg>
 <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">決策落在兩個維度上:<b style="color:#54b890">無狀態、可拋</b>的東西(Spark / Airflow / Connect)反正掛了重來,一律 <b>self-host on K8s</b> 最省。而<b style="color:#e05a7d">狀態可怕、團隊又小</b>的東西(Kafka / Redis / DB),強烈建議走 <b>managed</b>(RDS / MSK / ElastiCache)——把那座「顧好狀態」的山租給雲商。只有<b>狀態可怕但你有專人</b>時,自建才划算。關鍵是:這筆帳算的永遠是 <a href="/blog/airflow-testing-deploy/">維運人力</a>,不是帳面授權費——狀態越可怕、團隊越小,越該花錢買安穩</figcaption>
</figure>

戴上 EM / SRE 的帽子後,這個判斷我看得更透:工程師容易覺得「自己架比較酷、比較省」,但一個 managed Postgres 的月費,常常遠低於一個工程師花半條命去修自建 DB 的隱形成本。**把寶貴的人力,留給只有你們團隊懂的業務,而不是去養一座全世界都會養的 DB。** 這跟 [[pain-before-power|先確認痛點再上重武器]]是同一種務實。

## 監控:LGTM 把異質收進一塊玻璃

最後一塊拼圖是**觀測**。七個工具七種脾氣,如果每個都要開它自己的後台去看,一個人的團隊根本顧不過來。所以平台級的監控,核心價值是**統一**——用 **LGTM**(Grafana + Loki 收 logs、Tempo 收 traces、Prometheus/Mimir 收 metrics)把全部收進**一個 Grafana**。這件事的價值不是炫,是**認知負擔的統一**:你只要學一套查法、一個地方,就能看住整片平台的健康。對人手不多的團隊,「能不能用一塊玻璃看住全部」,常常直接決定了「你能不能只用幾個人養一個平台」。這也是我在 [[sre-onboarding-inhouse|SRE 空降那篇]]、[[sre-monitoring|監控那篇]]反覆強調的:**先把一塊玻璃架起來,再談優化。**

## 反思

### 兜平台,不是背七個工具,是抓一條軸

做完這九篇,我最想留下的不是「Kafka 怎麼調、Redis 怎麼擴」這些會過時的細節,而是那條貫穿全系列的軸:**stateful ↔ stateless**。它像一把尺,量誰都準——一個工具有沒有狀態、狀態在哪、可不可拋,一問完,它在平台裡該怎麼跑、怎麼擴、怎麼救、要不要自己養,一整排答案就有了框架。工具會一直換(今天 Spark、明天 Flink),但這條軸不會。**與其追著學每個新工具,不如把這把尺磨利**——這是我做整個「從 infra 角度看」系列,最核心的一個信念:先有框架,細節才掛得上去,也才追得動這個一直在變的領域。

### 「一塊玻璃」是小團隊能扛住大平台的關鍵

戴上 EM/SRE 帽子後,我對「統一」的執念變重了。當你要用有限的人手,養住一片異質的工具,**每多一個「要單獨去看的地方」,都是壓在團隊身上的認知稅**。LGTM 的價值,不在技術多先進,在於它把七種脾氣收斂成「一個 Grafana、一套查法」。這個道理超出監控——統一部署方式(全上 K8s)、統一狀態判斷(那條軸)、統一觀測(一塊玻璃),每一個「統一」,都是在幫一個小團隊把「顧得動的東西」變多。**規模化一個平台,靠的往往不是更多人,是更少的『不一樣』。**

### 最好的 infra 決策,算的是人力,不是機器

這是我從工程師走到 EM/SRE，最深的一個轉變。以前我看 infra,想的是「怎麼跑得最快、架得最省(機器錢)」;現在我第一個算的,是**維運人力**這筆看不見卻最貴的帳。self-host 省下的授權費,可能遠不夠付那個「有人得半夜爬起來修它」的隱形成本;一個沒人看得懂的自建系統,再省錢也是團隊的負債。所以我現在做每一個 infra 決策——自建還託管、上不上 K8s、要不要引入一個新工具——都會先問一句:**這個決定,是讓我的團隊更輕、還是更重?** 機器的成本會寫在帳單上,人力的成本不會,但它才是決定一個平台長期活不活得下去的那一個。九篇走到這裡,七個工具、一條軸、一塊玻璃、一筆人力帳——這就是從 infra 角度,看一個資料平台的全部。
