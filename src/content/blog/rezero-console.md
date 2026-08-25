---
title: "主播與營運後台:沒有一個叫「後台」的東西"
date: 2026-07-27
category: tech
description: "營運面第一章:直播現場的分工——主播看數據抓節奏、助理操作起結標、營運管檔期與配貨、客服善後、工程師守著 admin。五種角色五組介面,以及「介面的投資額度=需求的確定度」這條內部工具哲學。"
tags:
  - war-story
  - live-commerce
  - internal-tools
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 9
comments: true
draft: false
---
前八章寫的是交易的骨架:留言進來、庫存卡住、錢收好、貨出門。這章換一個視角——**站在直播現場的人,看到的是什麼**。講「後台」之前先劇透結論:這個系統裡**沒有一個叫「後台」的東西**,有的是一組角色介面,每個人打開的畫面,只做他此刻的事。

## 一場直播,是一場演出

先看現場的分工。主播在鏡頭前喊 key、講價、跟廠商加貨——**他沒有時間操作任何平台**;所有平台操作都交給**直播助理**:商品資訊、起標結標、追加庫存。但主播不能瞎演:賣了幾件、誰在下單、多少人在看——**這些數據他要即時看到,才抓得住直播的節奏**——賣爆了現場加碼,冷場了趕快換品。

用劇場的話說:**演員看提詞機,舞台監督控機關**。這個分工直接決定了介面怎麼切:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 302" role="img" aria-label="五種角色、五組介面的全景。主播介面只看不操作:留言流附黑名單標籤、販賣數量與下單的人、FB 觀看人數,用數據抓直播節奏。直播助理是操作台:商品資訊可事前填也可臨時開、起標結標與重新起標、追加庫存。營運是另外的獨立頁面:結束檔期、運費設定、入庫單與配貨。客服介面:調整購物車、多重綁定。工程師用 Django admin:安全操作台、設定 Celery task、花式需求的半成品。五組介面底下共用同一套事實與 API——同一份資料,五扇不同的窗。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="16" y="20" width="104" height="216" rx="8" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.4"/>
    <text x="68" y="40" fill="#9b6ff0" font-size="8.4" text-anchor="middle" font-weight="bold">主播</text>
    <text x="68" y="53" fill="#9aa4b2" font-size="6.2" text-anchor="middle">只看,不操作</text>
    <text x="68" y="80" fill="#e6e6e6" font-size="6.4" text-anchor="middle">留言流</text>
    <text x="68" y="92" fill="#e6e6e6" font-size="6.4" text-anchor="middle">(帶黑名單標籤)</text>
    <text x="68" y="116" fill="#e6e6e6" font-size="6.4" text-anchor="middle">販賣數量</text>
    <text x="68" y="128" fill="#e6e6e6" font-size="6.4" text-anchor="middle">下單的人</text>
    <text x="68" y="152" fill="#e6e6e6" font-size="6.4" text-anchor="middle">觀看人數</text>
    <text x="68" y="164" fill="#9aa4b2" font-size="5.8" text-anchor="middle">(FB API)</text>
    <text x="68" y="210" fill="#9b6ff0" font-size="6.2" text-anchor="middle" font-weight="bold">用數據抓節奏</text>
    <rect x="130" y="20" width="104" height="216" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="182" y="40" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">直播助理</text>
    <text x="182" y="53" fill="#9aa4b2" font-size="6.2" text-anchor="middle">直播的操作台</text>
    <text x="182" y="80" fill="#e6e6e6" font-size="6.4" text-anchor="middle">商品資訊填入</text>
    <text x="182" y="92" fill="#9aa4b2" font-size="5.8" text-anchor="middle">(事前填/臨時開)</text>
    <text x="182" y="116" fill="#e6e6e6" font-size="6.4" text-anchor="middle">起標・結標</text>
    <text x="182" y="128" fill="#e6e6e6" font-size="6.4" text-anchor="middle">重新起標</text>
    <text x="182" y="152" fill="#e6e6e6" font-size="6.4" text-anchor="middle">追加庫存</text>
    <text x="182" y="210" fill="#d6a45c" font-size="6.2" text-anchor="middle" font-weight="bold">替主播動手</text>
    <rect x="244" y="20" width="104" height="216" rx="8" fill="#233528" stroke="#54b890" stroke-width="1.4"/>
    <text x="296" y="40" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">營運</text>
    <text x="296" y="53" fill="#9aa4b2" font-size="6.2" text-anchor="middle">另外的獨立頁面</text>
    <text x="296" y="80" fill="#e6e6e6" font-size="6.4" text-anchor="middle">結束檔期</text>
    <text x="296" y="104" fill="#e6e6e6" font-size="6.4" text-anchor="middle">運費設定</text>
    <text x="296" y="128" fill="#e6e6e6" font-size="6.4" text-anchor="middle">入庫單</text>
    <text x="296" y="152" fill="#e6e6e6" font-size="6.4" text-anchor="middle">配貨</text>
    <text x="296" y="210" fill="#54b890" font-size="6.2" text-anchor="middle" font-weight="bold">管檔期的節奏</text>
    <rect x="358" y="20" width="104" height="216" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="410" y="40" fill="#4f6df5" font-size="8.4" text-anchor="middle" font-weight="bold">客服</text>
    <text x="410" y="53" fill="#9aa4b2" font-size="6.2" text-anchor="middle">處理例外</text>
    <text x="410" y="80" fill="#e6e6e6" font-size="6.4" text-anchor="middle">調整購物車</text>
    <text x="410" y="104" fill="#e6e6e6" font-size="6.4" text-anchor="middle">清除購物車</text>
    <text x="410" y="128" fill="#e6e6e6" font-size="6.4" text-anchor="middle">多重綁定</text>
    <text x="410" y="210" fill="#4f6df5" font-size="6.2" text-anchor="middle" font-weight="bold">接住殘量</text>
    <rect x="472" y="20" width="96" height="216" rx="8" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="520" y="40" fill="#e6e6e6" font-size="8.4" text-anchor="middle" font-weight="bold">工程師</text>
    <text x="520" y="53" fill="#9aa4b2" font-size="6.2" text-anchor="middle">Django admin</text>
    <text x="520" y="80" fill="#e6e6e6" font-size="6.4" text-anchor="middle">安全操作台</text>
    <text x="520" y="104" fill="#e6e6e6" font-size="6.4" text-anchor="middle">Celery task</text>
    <text x="520" y="128" fill="#e6e6e6" font-size="6.4" text-anchor="middle">花式需求</text>
    <text x="520" y="140" fill="#9aa4b2" font-size="5.8" text-anchor="middle">(半成品試驗場)</text>
    <text x="520" y="210" fill="#9aa4b2" font-size="6.2" text-anchor="middle" font-weight="bold">不確定的先住這</text>
    <rect x="16" y="252" width="552" height="26" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="292" y="269" fill="#9aa4b2" font-size="7.4" text-anchor="middle">底下是同一套事實與 API——同一份資料,五扇不同的窗</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">沒有一個叫「後台」的東西:每個角色打開的畫面,只做他此刻的事。</figcaption>
</figure>

## 主播 dashboard:數據是節奏感

主播的畫面沒有任何按鈕值得按——它是[[rezero-stack|起手式]]裡那條 WebSocket 唯一服務的對象:留言即時推上來、賣了幾件、誰下了單、FB API 拉回來的觀看人數。全部**只看**。

兩個細節值得停:

- **留言流上帶著黑名單標籤。** 系統層面,黑名單的留言 batch 根本不處理;但介面層面,主播**看得到**這個人是黑名單——喊單現場的人肉決策(這位的單口頭跳過、不留貨)有了即時情報。風控不只是過濾器,還是**遞到決策者手上的一張情報卡**,這條線(連同 batch 怎麼快判黑名單)[[rezero-risk|風控章]]會收回來。
- **數據的組成是「自家事實+平台數據」的混搭。** 賣量、下單人來自自己的帳本,觀看數來自 FB API——主播不在乎來源,他在乎的是「現在場子熱不熱、貨走不走得動」。儀表板的組織原則是**使用者的問題**,不是資料的出處——這跟我後來在 [[obs-grafana|Grafana]] 系列寫的「一個 panel 回答一個問題」是同一件事,只是當年沒有這些詞彙。

## 助理與營運:操作台的兩種節奏

助理 dashboard 是直播的操作台,按鈕跟著直播的分鐘級節奏走:商品資訊(**支援事前建檔,也支援臨時開**——主播現場拿到貨就要賣,系統不賭「一定來得及事前填」)、起標、結標、重新起標([[rezero-comment-order|重喊]]的 UI 殼)、追加庫存——[[rezero-inventory|庫存章]]那個熱列重試的現場操作者,就是助理。

營運的頁面是**另外一組**,節奏是檔期級的:結束檔期([[rezero-inventory|大掃除]])、運費設定、入庫單、[[rezero-fulfillment|配貨]]。同樣是「操作」,直播操作和檔期管理被拆成兩組介面——因為操作的**節奏**不同:一個以秒計,搶的是直播的當下;一個以天計,管的是檔期的收與放。把它們混在同一個畫面,快的會被慢的擋路。

## admin:不確定需求的試驗場

工程師自己的介面是 Django admin,而且**只有工程師能用**——第一個理由很樸素:直接改 DB 太危險,admin 是一層不會手滑的安全操作台,順手管 Celery task 排程。

第二個理由值得一整節:**admin 是不確定需求的試驗場**。需求進來,做好要花時間、但沒人確定它是不是真需求——最貴的兩種錯誤是「花兩週做一個沒人用的漂亮介面」和「直接拒絕、錯過真需求」。當年的第三條路:**用部分 admin 功能拼一個不是很好用的半成品**,先讓需求活著:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 196" role="img" aria-label="介面的成熟度光譜,由左至右代表需求從不確定到確定。第一站:admin 半成品——醜但便宜,通常由工程師代操,需求在這裡證明自己;被抱怨難用,就是畢業申請。第二站:自建的角色介面——被證明的需求住這裡,好用是標配。第三站:dashboard——最高頻、最即時的需求,連操作都省掉,只留下看。底部結論:介面的投資額度等於需求的確定度。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rc9" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <line x1="30" y1="30" x2="550" y2="30" stroke="#3a4154" stroke-width="1.2"/>
    <text x="60" y="20" fill="#9aa4b2" font-size="7" text-anchor="start">需求:不確定</text>
    <text x="520" y="20" fill="#9aa4b2" font-size="7" text-anchor="end">確定・高頻</text>
    <rect x="30" y="48" width="150" height="72" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="105" y="68" fill="#e6e6e6" font-size="7.8" text-anchor="middle" font-weight="bold">admin 半成品</text>
    <text x="105" y="84" fill="#9aa4b2" font-size="6.2" text-anchor="middle">醜,但便宜・工程師代操</text>
    <text x="105" y="98" fill="#9aa4b2" font-size="6.2" text-anchor="middle">需求在這裡證明自己</text>
    <line x1="180" y1="84" x2="212" y2="84" stroke="#54b890" stroke-width="1.2" marker-end="url(#rc9)"/>
    <text x="196" y="72" fill="#54b890" font-size="5.8" text-anchor="middle">被抱怨=</text>
    <text x="196" y="106" fill="#54b890" font-size="5.8" text-anchor="middle">畢業申請</text>
    <rect x="216" y="48" width="150" height="72" rx="7" fill="#233528" stroke="#54b890" stroke-width="1.3"/>
    <text x="291" y="68" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">自建角色介面</text>
    <text x="291" y="84" fill="#9aa4b2" font-size="6.2" text-anchor="middle">被證明的需求住這裡</text>
    <text x="291" y="98" fill="#9aa4b2" font-size="6.2" text-anchor="middle">好用是標配</text>
    <line x1="366" y1="84" x2="398" y2="84" stroke="#54b890" stroke-width="1.2" marker-end="url(#rc9)"/>
    <text x="382" y="72" fill="#54b890" font-size="5.8" text-anchor="middle">高頻到</text>
    <text x="382" y="106" fill="#54b890" font-size="5.8" text-anchor="middle">極致</text>
    <rect x="402" y="48" width="150" height="72" rx="7" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.3"/>
    <text x="477" y="68" fill="#9b6ff0" font-size="7.8" text-anchor="middle" font-weight="bold">dashboard</text>
    <text x="477" y="84" fill="#9aa4b2" font-size="6.2" text-anchor="middle">連操作都省掉</text>
    <text x="477" y="98" fill="#9aa4b2" font-size="6.2" text-anchor="middle">只留下「看」</text>
    <text x="290" y="164" fill="#e6e6e6" font-size="8.6" text-anchor="middle" font-weight="bold">介面的投資額度 = 需求的確定度</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">半成品不是恥辱,是策略:真需求會用抱怨替自己申請畢業,偽需求便宜地死在 admin 裡。</figcaption>
</figure>

真需求會被抱怨「這個好難用」——**抱怨就是畢業申請**,值得升級成自建介面;偽需求就安靜地死在 admin 裡,成本趨近零。回頭看,「每天上線十幾個 feature」的另一面就在這:不是每個 feature 都做到好,是**每個 feature 都花了恰如其分的成本**。

## 重來會補什麼

這章的當年設計,重來幾乎全部保留——角色分工、成熟度光譜、看與操作分離,都是對的。只補兩件:

1. **後台操作的 audit log 全面化。** 入庫單、配貨當年就有紀錄,但起標結標、追加庫存、運費變更這些操作也該一律留痕(誰、何時、改了什麼)——它是對帳章的證據鏈,也是權限章的地基。
2. **追加庫存走調整帳。** [[rezero-inventory|庫存章]]提過的 adjustments ledger——受益者就是那位在直播現場按到失敗、只能重按的助理。

## 反思

### 內部使用者,是你最重的 power user

外部客人一天用你的系統三分鐘,助理和營運**一天用八小時**;客人遇到卡頓會離開,助理遇到卡頓,主播的節奏就斷在鏡頭前。內部工具的每一秒延遲、每一次誤觸,都在直播現場被放大成真金白銀。這個團隊從第一天就把內部工具當產品做([[rezero-identity|身分章]]講過它的出身),而我後來的體會是:**內部工具的品質,決定的不是「員工爽不爽」,是整個營運的反應速度**——它是組織的神經傳導速度。

### 半成品是策略,不是恥辱

admin 試驗場教我的事:做產品的本質是**管理不確定性**,而介面是最貴的下注方式之一。把每個需求都做到好看,等於對每個未經證實的假設下重注;試驗場讓下注額度跟著證據走——半成品的「難用」不是品質問題,是**刻意保留的畢業門檻**:願意忍受難用還一直來用的,才是真需求。工程師的自尊常常受不了自己交出半成品——但恰如其分的粗糙,比不合時宜的精緻更專業。

### 為「看」設計和為「做」設計,是兩種專業

主播的畫面一顆按鈕都沒有,助理的畫面全是按鈕——這不是巧合,是**任務決定介面**:看的介面要的是掃一眼就懂(資訊密度、即時性、不打擾),做的介面要的是不出錯(明確的動作、可預期的結果、防呆)。多數難用的後台,病根都是把兩者揉在一起——要看的人繞過一堆按鈕,要做的人在圖表裡找入口。切介面的判準從來不是「這些功能相不相關」,是**「這個人此刻的任務是什麼」**——一個畫面,一種任務,一種節奏。
