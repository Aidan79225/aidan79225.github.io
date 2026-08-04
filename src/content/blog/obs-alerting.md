---
title: "Grafana 告警:從看見到行動"
date: 2026-07-27
category: tech
tags:
  - observability
  - grafana
  - alerting
series: "Grafana LGTM 可觀測性"
seriesOrder: 7
comments: true
draft: false
---
這系列從[[obs-intro|第一篇]]就一直押著一句話——**觀測的終點不是「看到」,是「行動」**。前面六篇把「看到」講完了:三支柱怎麼存、怎麼查、怎麼進來。這篇補上最後那一哩、也是整個系列的 payoff——**告警(Alerting):把那塊玻璃,接上人的行動。** 沒有它,再漂亮的儀表板也只是等人去盯;有了它,系統壞掉的那一刻,是它來找你,不是你剛好在看。

## 告警規則:一條定時跑的查詢 + 一個門檻 + 一段 for

先破一個直覺:告警不是什麼特殊機制,它就是**一條會自己定時跑的查詢**。Grafana 的 Unified Alerting,一條 **alert rule** 做的事就三步——每隔一個 interval 對 data source 跑一次查詢(PromQL 問 Mimir、LogQL 問 Loki,跟儀表板用的是同一種問法),把結果跟**門檻**比,**連續超標撐過 `for` 這段時間**,才真的觸發。這裡最容易被忽略、卻最關鍵的是 `for`——它是一條告警的「抗抖動閥」:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="告警的狀態機與 for 的作用。上方一張小圖畫查詢值隨時間變化與一條門檻線:一次短暫尖峰超過門檻又馬上掉回來,一次持續超標一直待在門檻之上。下方是狀態機:Normal 正常,值超過門檻就進 Pending 等待,如果沒撐過 for 這段時間就回 Normal、不告警;如果持續超標撐過了 for,才進 Firing 觸發、送出通知。所以短暫抖動在 Pending 階段就被 for 吸收掉、不會吵醒你,只有真正持續的問題才會 page。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="al" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">告警的狀態機:for 把短暫抖動吸收掉</text>
    <rect x="20" y="26" width="540" height="80" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1"/>
    <text x="30" y="40" fill="#9aa4b2" font-size="7.4" text-anchor="start">查詢值 vs 門檻(每個 interval 評估一次)</text>
    <line x1="30" y1="70" x2="512" y2="70" stroke="#d6a45c" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="548" y="73" fill="#d6a45c" font-size="7" text-anchor="end">門檻</text>
    <polyline points="30,96 120,94 150,56 180,56 205,94 300,95 360,94 392,52 520,52" fill="none" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="178" y="118" fill="#9aa4b2" font-size="7.2" text-anchor="middle">短暫尖峰(&lt; for)</text>
    <text x="456" y="118" fill="#e08b7c" font-size="7.2" text-anchor="middle" font-weight="bold">持續超標(≥ for)</text>
    <rect x="24" y="142" width="96" height="36" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="72" y="164" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">Normal</text>
    <line x1="120" y1="160" x2="166" y2="160" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#al)"/><text x="143" y="153" fill="#9aa4b2" font-size="6.6" text-anchor="middle">超門檻</text>
    <rect x="168" y="142" width="144" height="36" rx="6" fill="#2a2340" stroke="#d6a45c" stroke-width="1.4"/><text x="240" y="160" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">Pending</text><text x="240" y="171" fill="#9aa4b2" font-size="6.6" text-anchor="middle">在 for 期間持續觀察</text>
    <line x1="312" y1="160" x2="358" y2="160" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#al)"/><text x="335" y="153" fill="#9aa4b2" font-size="6.6" text-anchor="middle">撐過 for</text>
    <rect x="360" y="142" width="120" height="36" rx="6" fill="#331f22" stroke="#d66b5c" stroke-width="1.6"/><text x="420" y="164" fill="#e08b7c" font-size="8.4" text-anchor="middle" font-weight="bold">Firing</text>
    <line x1="480" y1="160" x2="524" y2="160" stroke="#d66b5c" stroke-width="1.3" marker-end="url(#al)"/><text x="546" y="163" fill="#9aa4b2" font-size="7" text-anchor="end">送通知</text>
    <path d="M204,178 L204,196 L72,196 L72,180" fill="none" stroke="#54b890" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#al)"/>
    <text x="150" y="210" fill="#54b890" font-size="6.8" text-anchor="middle">沒撐過 for → 回 Normal(不 page)</text>
    <text x="290" y="234" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">for 是抗抖動閥:短暫尖峰在 Pending 就被吸收,只有真正持續的問題才會吵醒你</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一條告警規則的一生:<b style="color:#54b890">Normal</b> → 值超過門檻進 <b style="color:#d6a45c">Pending</b> → <b>撐過 <code>for</code></b> 才進 <b style="color:#e08b7c">Firing</b> 送通知。<code>for</code> 是最容易被漏掉、卻最救命的一格:一次網路抖動、一次 GC 造成的瞬間尖峰,如果沒撐過 <code>for</code>,就在 Pending 階段被<b>吸收掉、回 Normal,不會 page</b>。少了它,你的告警會因為每個毛刺狂響——而<b>一個會亂叫的告警,很快就會被所有人靜音,等於沒有</b></figcaption>
</figure>

有一點值得單獨強調:Grafana 的告警是**跨 data source** 的——同一套規則引擎,可以拿 PromQL 對指標下門檻、也可以拿 LogQL 對日誌數量下門檻。所以「告警」在這套裡不是某個支柱的附屬功能,而是**架在三支柱之上的一層**。它跟儀表板共用同一種查詢語言,這代表:**你能一眼看懂的儀表板,就能直接長成一條告警**——看見與告警,是同一個問句的兩種輸出。

## 規則與通知解耦:alert 帶 label,notification policy 分流

第二個關鍵設計,是 Grafana 刻意**把「什麼壞了」和「通知誰」拆成兩件事**。告警規則觸發時,產生的不是一則寫死收件人的訊息,而是一個**帶著一組 label 的 alert**(`severity=critical`、`team=payments`…)。它要送去哪、吵醒誰,完全由另一個東西——**notification policy(一棵 routing tree)**——依 label 比對後決定:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 218" role="img" aria-label="規則與通知用 label 解耦。左邊:一條告警觸發後產生一個 alert，帶著一組 label，例如 severity 等於 critical、team 等於 payments、alertname 等於 5xx 過高。中間:通知策略是一棵 routing tree，由上往下用 label 比對，severity 等於 critical 這條被命中。右邊:命中後路由到對應的 contact point，critical 打電話給值班的 PagerDuty，warning 送 Slack 頻道，其它走 Email。重點是告警規則本身不知道也不在乎會通知誰，通知誰完全由策略依 label 決定，兩層解耦。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="rt" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="rth" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#d6a45c"/></marker></defs>
    <text x="290" y="15" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">規則只管「發生什麼」,策略才管「通知誰」</text>
    <rect x="16" y="42" width="150" height="150" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="91" y="60" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">觸發的 alert</text>
    <text x="91" y="72" fill="#9aa4b2" font-size="6.8" text-anchor="middle">帶著一組 label</text>
    <rect x="28" y="82" width="126" height="24" rx="4" fill="#2a2340" stroke="#d6a45c" stroke-width="1.2"/><text x="91" y="98" fill="#d6a45c" font-size="7.4" text-anchor="middle" font-family="monospace">severity=critical</text>
    <rect x="28" y="112" width="126" height="24" rx="4" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="91" y="128" fill="#e6e6e6" font-size="7.2" text-anchor="middle" font-family="monospace">team=payments</text>
    <rect x="28" y="142" width="126" height="24" rx="4" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="91" y="158" fill="#e6e6e6" font-size="7" text-anchor="middle" font-family="monospace">alertname=5xx高</text>
    <line x1="166" y1="117" x2="204" y2="117" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#rt)"/><text x="185" y="110" fill="#9aa4b2" font-size="6.4" text-anchor="middle">帶 label 送去</text>
    <rect x="206" y="42" width="158" height="150" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="285" y="60" fill="#54b890" font-size="8.6" text-anchor="middle" font-weight="bold">通知策略(routing)</text>
    <text x="285" y="72" fill="#9aa4b2" font-size="6.6" text-anchor="middle">依 label 比對,由上往下</text>
    <rect x="218" y="82" width="134" height="28" rx="4" fill="#2a2340" stroke="#d6a45c" stroke-width="1.4"/><text x="285" y="100" fill="#d6a45c" font-size="7.4" text-anchor="middle" font-family="monospace">severity=critical ✓</text>
    <rect x="218" y="116" width="134" height="26" rx="4" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="285" y="133" fill="#9aa4b2" font-size="7.4" text-anchor="middle" font-family="monospace">severity=warning</text>
    <rect x="218" y="148" width="134" height="26" rx="4" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="285" y="165" fill="#9aa4b2" font-size="7.2" text-anchor="middle">default(其它)</text>
    <line x1="352" y1="96" x2="412" y2="96" stroke="#d6a45c" stroke-width="1.5" marker-end="url(#rth)"/>
    <line x1="352" y1="129" x2="412" y2="129" stroke="#9aa4b2" stroke-width="1" marker-end="url(#rt)"/>
    <line x1="352" y1="161" x2="412" y2="161" stroke="#9aa4b2" stroke-width="1" marker-end="url(#rt)"/>
    <rect x="414" y="82" width="152" height="30" rx="6" fill="#331f22" stroke="#d66b5c" stroke-width="1.5"/><text x="490" y="97" fill="#e08b7c" font-size="7.6" text-anchor="middle" font-weight="bold">PagerDuty</text><text x="490" y="107" fill="#9aa4b2" font-size="6.4" text-anchor="middle">打電話叫醒值班</text>
    <rect x="414" y="116" width="152" height="26" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="490" y="133" fill="#e6e6e6" font-size="7.4" text-anchor="middle">Slack #alerts</text>
    <rect x="414" y="148" width="152" height="26" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="490" y="165" fill="#9aa4b2" font-size="7.4" text-anchor="middle">Email(存查)</text>
    <text x="290" y="208" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">告警規則不知道也不在乎通知誰 —— 兩層靠 label 解耦,改路由不用動規則</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">告警規則只負責<b>判斷「發生什麼」</b>並貼上 label;<b style="color:#54b890">通知策略</b>才負責<b>「通知誰、多急」</b>。這層解耦很值錢:<code>severity=critical</code> 走 <b style="color:#e08b7c">PagerDuty</b> 半夜打電話,<code>warning</code> 丟 <b>Slack</b> 白天看,其它進 Email 存查——而這一切都是<b>路由設定</b>,改「誰值班、哪個管道」時,一條告警規則都不用動。策略層還順手做兩件事:<b>grouping</b>(把同批告警併成一則,不然一次當機轟你五十封)和 <b>silence</b>(維護時段先靜音,避免計劃性施工也 page)</figcaption>
</figure>

## 好告警的唯一標準:每一則都能「行動」

機制講完,剩下最難、也最重要的一問:**什麼該告警?** 我的判準只有一條——**每一則會 page 你的告警,都必須是「收到就有明確動作」的**。從這條會長出兩個具體原則:一是**對症狀告警,不對原因告警**(alert on symptoms):使用者痛的是「結帳失敗率破 5%」「p99 破 2 秒」,不是「某台 CPU 到 90%」——CPU 高但使用者沒事,你不該被吵醒。二是**分級**:真的要人半夜起床處理的,才配 page;其餘降級成 Slack、看板。更成熟的做法是接上 [[sre-slo|SLO 的 error budget]],用**燒錢速率(burn rate)**告警——「照這個速度,budget 幾小時內燒完」——比單一門檻更貼近「使用者到底痛不痛」。這一段的完整戰術,我在 [[sre-alerting-oncall|SRE 告警與 on-call]]那篇講得更細;這裡只留一句心法:**告警的品質,不看你設了幾條,看你半夜被吵醒時,有幾則是白吵的。**

## 反思

### 不能行動的告警,不是告警,是雜訊

我對告警的態度,是被一次慘痛經驗校正的。早期我們的心態是「多設總比漏設好」,於是 CPU、記憶體、磁碟、每個微服務的每個指標,全掛上門檻。結果是一天上百則告警塞爆頻道,大家先是一則則看,接著開始略過,最後**整個頻道被 mute**——真正該救命的那一則 5xx 暴衝,就淹死在雜訊裡,沒人看到。那次之後我立了一條鐵規:**一則告警要能存在,先回答「收到它,我下一步做什麼?」——答不出具體動作的,一律砍掉或降級成看板。** 告警不是「把所有異常都吼出來」,是「只在需要人動手時,才動用人的注意力」。人的注意力是整個 on-call 系統裡最貴、最容易耗盡的資源——**每多一則沒用的告警,都是在替真正重要的那則挖墳。** 我現在評估一套告警是否健康,不看規則數量,看一個數字:**每週的告警裡,有多少則事後被判定「其實不用理」**——這個比例,就是這套系統正在浪費多少信任。

### 對症狀告警,把「為什麼」留給那塊玻璃

「對症狀不對原因」這條,想通之後,我發現它剛好把整個 LGTM 系列串了起來。告警負責的是最粗的那一格——「使用者**有沒有**在痛」,它只要夠準地把人叫醒就好,**不需要**在告警訊息裡塞滿原因。因為「為什麼痛」那一段,正是後面那塊玻璃、那三支柱要接手的:被 page 醒之後,我打開 Grafana,沿著[[obs-intro|由粗到細]]收斂——先看儀表板確認症狀範圍,用 [[obs-traces-tempo|trace]] 縮到哪個服務哪一段,再鑽進那一小段的 [[obs-logs-loki|log]] 看到底是什麼。告警與觀測,是一組漂亮的分工:**告警只管「叫不叫人」,診斷交給玻璃。** 硬要在告警規則裡塞一堆原因判斷,只會讓它又脆又吵——**讓告警保持愚蠢而可靠,把聰明留給事後那塊玻璃。**

### 這篇是整個系列的 payoff:把玻璃接上人

寫到這篇,我才覺得這個系列真正閉環了。從第一篇我就一直說「觀測的終點是行動」,而告警,就是「觀測」與「行動」之間那條實體的線——沒有它,前面六篇蓋起來的一切,都只是等人剛好在看的漂亮儀表板。但我想收一個更進一步的判斷:**告警不是設完就結束的東西,它是會演進的。** 最好的告警規則,幾乎都不是一開始設計出來的,而是**每次事故的 postmortem 長出來的**——這次半夜被一個沒用的告警吵醒,下次就把它降級;這次一個真問題沒告警、靠人肉發現,下次就補一條。所以我把「調整告警」列進每份 [[sre-postmortem|事後檢討]]的固定動作:**每一次事故,都該讓你的告警比昨天更準一點。** 一套觀測系統成不成熟,最終不看它今天多完整,看它有沒有一個「從事故裡持續自我修正」的迴路——**能看見,只是起點;能在對的時間叫對的人、做對的事,才是這一整套的終點。**
