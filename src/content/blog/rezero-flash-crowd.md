---
title: "開賣瞬間:主播喊完 key 的那三秒"
date: 2026-08-01
category: tech
description: "橫切篇開場:13,000 人在線、起標瞬間 200 則留言每秒——尖峰的真實形狀;批次路徑淤而不倒、同步路徑一觸即炸的兩種命運;毒藥訊息讓整批下單消失的最痛事故;以及從 fat API、traefik、DDoS 到雲端菩薩的讀路徑戰記。"
tags:
  - war-story
  - live-commerce
  - scalability
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 14
comments: true
draft: false
---
交易主線和營運面都寫完了,接下來三章是橫切:尖峰、維運、對帳。先從所有直播電商的原點講起——**主播喊完 key 的那三秒**。這章有真實的數字、最痛的一次事故,和一條從被打爆一路通往「雲端菩薩」的戰記。

## 尖峰的形狀:一堵牆,和一連串浪

先給數字。一場大直播,**最高 13,000 人在線**,一般尖峰也有 9,000。主播介紹商品時,留言平均**每秒 10–20 則**;喊出 key、起標的瞬間——**每秒 200 則**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 250" role="img" aria-label="一場結標的留言流量形狀。介紹商品期間每秒約十到二十則,起標瞬間一秒內跳到每秒兩百則——一堵垂直的牆;隨後回落,結標期間主播不定時放出優惠,流量再度脈衝拉高,形成一連串浪;平均一場結標三分鐘,短的十秒。旁註:一萬三千人在線,副台同時起標時最壞疊加約每秒兩百五十則。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="56" y1="196" x2="560" y2="196" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="56" y1="196" x2="56" y2="28" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="56" y1="44" x2="560" y2="44" stroke="#3a4154" stroke-width="0.8" stroke-dasharray="4 4"/>
    <text x="50" y="48" fill="#9aa4b2" font-size="7" text-anchor="end">200/s</text>
    <line x1="56" y1="178" x2="560" y2="178" stroke="#3a4154" stroke-width="0.8" stroke-dasharray="4 4"/>
    <text x="50" y="182" fill="#9aa4b2" font-size="7" text-anchor="end">10–20/s</text>
    <path d="M 60 180 L 195 179 L 200 46 L 245 52 L 285 118 L 318 124 L 328 62 L 348 68 L 378 128 L 398 132 L 408 72 L 428 78 L 468 150 L 556 172" fill="none" stroke="#4f6df5" stroke-width="2"/>
    <text x="128" y="168" fill="#9aa4b2" font-size="7" text-anchor="middle">介紹商品</text>
    <text x="212" y="32" fill="#e05a7d" font-size="7.6" text-anchor="middle" font-weight="bold">起標:一秒內 10–20 倍</text>
    <text x="380" y="52" fill="#d6a45c" font-size="7.2" text-anchor="middle">結標中不定時放優惠 → 一連串浪</text>
    <text x="308" y="216" fill="#9aa4b2" font-size="7" text-anchor="middle">一場結標:短則 10 秒,平均 3 分鐘</text>
    <text x="308" y="236" fill="#9aa4b2" font-size="7" text-anchor="middle">13,000 人在線;副台同時起標時,最壞疊加 ~250 則/秒</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">尖峰不是曲線,是牆——而且牆後面不是平原,是主播放優惠時一波波再起的浪。</figcaption>
</figure>

兩個形狀上的重點:**它是階躍,不是爬升**——主播一句話,流量一秒內跳 10–20 倍,任何 autoscaling 都反應不過來,容量只能按峰值準備、削峰只能靠結構;**它是脈衝串,不是單峰**——結標平均三分鐘,長結標裡主播不定時放優惠、流量一波波再起。[[rezero-comment-order|自適應抓取]](爆量就帶著 paging key 加速、空閒就放慢)當年看是直覺,對著這個形狀看是精準:固定速率的輪詢對脈衝負載兩頭吃虧。

還有一件事值得先講,因為它是整章的地基:**13,000 人在線,寫入洪峰卻只有 200 則/秒——尖峰時大家都在留言區,網站的寫入反而不多。** 如果這是傳統電商的搶購,13,000 人就是 13,000 個併發結帳請求直接砸在你的 API 上;「用留言買東西」把一萬三千人的購買意圖**壓進一條線性的文字通道**,FB 的聊天室基礎設施免費幫你扛了 fan-in,你的系統只需要消化一條 200/s 的串流。**這個商業模式自帶削峰**——看似原始的互動方式,恰好是天才的流量設計,只是當年沒有人這樣想過它。

## 兩種命運:批次淤而不倒,同步一觸即炸

有了流量的形狀,就能講這章的主題句:尖峰之下,這個系統的元件分成兩種命運。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="尖峰下的兩種命運。左側批次路徑,淤而不倒:FSM batch 消費留言、FB batch API 發通知、WebSocket 批次推留言瀑布——過載的表現是積壓變慢,用延遲付帳,降級模式內建。右側同步路徑,一觸即炸:肥大的檔期列表 API 回應包山包海,單一 process 直接被打爆,緊急插入 traefik 開四台撐住,技債擱置後被 DDoS 引爆,最後靠 Cloudflare 解決——過載的表現是崩潰,用可用性付帳。底部結論:能批次的都批次化,剩下的同步路徑瘦到極致。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="290" y1="14" x2="290" y2="222" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="30" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">批次路徑:淤而不倒</text>
    <rect x="30" y="44" width="240" height="24" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="150" y="60" fill="#e6e6e6" font-size="7" text-anchor="middle">留言下單:FSM batch 消費</text>
    <rect x="30" y="76" width="240" height="24" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="150" y="92" fill="#e6e6e6" font-size="7" text-anchor="middle">得標通知:FB batch API</text>
    <rect x="30" y="108" width="240" height="24" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="150" y="124" fill="#e6e6e6" font-size="7" text-anchor="middle">主播瀑布:WebSocket 也打 batch</text>
    <text x="150" y="160" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">過載的表現:積壓、變慢</text>
    <text x="150" y="176" fill="#9aa4b2" font-size="7" text-anchor="middle">用「延遲」付帳・降級模式內建</text>
    <text x="430" y="30" fill="#e05a7d" font-size="9" text-anchor="middle" font-weight="bold">同步路徑:一觸即炸</text>
    <rect x="310" y="44" width="240" height="36" rx="5" fill="#3a2632" stroke="#e05a7d" stroke-width="1.2"/>
    <text x="430" y="59" fill="#e6e6e6" font-size="7" text-anchor="middle">檔期列表 API:回應包山包海</text>
    <text x="430" y="73" fill="#e05a7d" font-size="6.4" text-anchor="middle">每個登入使用者一發「全站詳情」</text>
    <text x="430" y="100" fill="#e05a7d" font-size="7" text-anchor="middle">→ 單一 process 被打爆</text>
    <text x="430" y="118" fill="#d6a45c" font-size="7" text-anchor="middle">→ 急插 traefik・開四台撐住</text>
    <text x="430" y="136" fill="#9aa4b2" font-size="7" text-anchor="middle">→「撐住就先放著」</text>
    <text x="430" y="154" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">→ DDoS 直接炸開</text>
    <text x="430" y="176" fill="#9aa4b2" font-size="7" text-anchor="middle">用「可用性」付帳・沒有降級可言</text>
    <text x="290" y="210" fill="#e6e6e6" font-size="8.2" text-anchor="middle" font-weight="bold">生存法則:能批次的都批次化,剩下的同步路徑瘦到極致</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同一場尖峰,兩種付帳方式:批次用延遲付,同步用可用性付。</figcaption>
</figure>

批次那一欄,是 batch 在這個系統的第三次救場:留言下單靠 [[rezero-comment-order|FSM batch]](起標時積壓幾分鐘,但不崩)、得標通知靠 [[rezero-notification|FB batch API]]、連主播 dashboard 的留言瀑布都**打 batch 推送**——200 則/秒照樣扛住。批次系統過載的表現是**淤**:隊伍變長、延遲變大,但它不會倒;它用延遲付帳,不用可用性付帳。

這也解釋了一件事後看很有趣的事:**這個系統沒有任何降級功能**——不是疏忽,當年的說法是「都還沒遇到什麼事故,要做什麼降級」。這句話對了一半;另一半更深:**降級開關是同步系統的必需品,因為同步系統的過載是雪崩;批次系統的降級是內建的**,它天生淤而不倒。唯一真正炸過的,全部在同步那一欄——這就要講戰記了。

## 最痛的一次:毒藥訊息

先講批次側唯一的重傷,它不是被流量打的,是被**一筆資料**毒的。

當時系統還沒完全正式上線——有些測試驗收還沒做完,但主播跟原本第三方軟體公司的**合約提早談崩了**,系統直接被推上實戰:上線的時間表,從來不是我們定的。然後某場直播,詭異的事發生了:**留言看起來很多,下單量只有小貓兩三隻**。主播氣瘋。

兇手是一行邊界:batch 200 裡只要有**一筆留言 parsing 意外失敗,整批放棄**——一則怪留言,拖著 199 個無辜的訂單陪葬。串流處理的世界管這叫 **poison pill(毒藥訊息)**,而我們的版本特別痛在**爆炸半徑**:失敗的粒度是「批」,不是「筆」。症狀還極具欺騙性:ingestion 一切正常、留言瀑布照流,只有轉換率悄悄歸零——監控上最難抓的,就是這種「什麼都沒壞,只是沒有產出」的失敗。

修法就是 [[rezero-comment-order|留言章]]講過的那個「下策」:**單筆失敗直接略過、其他照跑**——記憶有點久遠,但應該就是這次事故之後改的。放進演化史看,那個被檢討過的「略過」其實是從更慘的「整批死」止血而來:整批死(事故)→ 單筆略過(最快的止血)→ dead-letter 補救(重來版的第三步)。**爆炸半徑先縮小,完整性之後再補**——順序是對的,只是第三步當年沒走完。

## 讀路徑戰記:從 fat API 到雲端菩薩

同步側的戰記是一條完整的因果鏈,值得按時間順序講完。

**第一環:一支包山包海的 API。** 使用者登入首頁,打「檔期列表」API——回應裡是詳細資訊,甚至一路帶到商品資訊。打爆單 process 的從來不是 13,000 人這個數字,是**每個請求的重量**:查詢深、序列化重、payload 肥,每個登入使用者都來一發「全站詳情」。

**第二環:緊急止血。** 立刻把單 process 撤下,中間插上 traefik,開四台 API service——撐住了。但「要做的事太多,撐住就先放著了」——肥端點原封不動地留在那裡。這是技債的標準生命週期:止血和治本之間隔著的不是能力,是永遠排不進的優先序。

**第三環:下一次壓力測試,是攻擊者免費做的。** 某天 DDoS 直接炸開——**一小時內動都動不了**。緊急開了 GCP 的 Cloud Armor,**沒屁用**;帳單倒是一小時多了 **1,000 美元**,還要另外付 Cloud Armor 的費用。GCP 真的是很會賺。

**第四環:雲端菩薩。** 最後把 domain name 那層轉到 Cloudflare——**就沒事了,還免費**。真的是雲端菩薩拯救世人。

這條鏈的教訓,每一環一條:API 的 schema 設計就是容量工程的第一線(最便宜的 scaling 是不要傳沒人要的欄位);「撐住就先放著」的下場是讓攻擊者替你排技債的優先序;以及最少人講明白的一條——**你的防禦不能跟攻擊一起計費**。per-request 計價的 L7 防禦,在 DDoS 之下等於幫攻擊者放大你的帳單;Cloudflare 在 DNS/邊緣層把流量吸掉,免費層就夠——**防禦的正確位置在邊緣,不在 origin 門口**。

## 重來會怎麼做

1. **列表 API 站穩立場。** 列表只回部分需要的欄位,而且是全站一致的規範;堅守 RESTful,不要什麼有的沒的都塞在一起。這一條要在需求會議裡贏,不是在機房裡贏——前端多要一個欄位很便宜,13,000 人各拿一份就是容量事故。
2. **第一天就把 domain 放上 Cloudflare。** 專業的東西交給專業的,不要讓統包商多賺一手還不一定好用——DDoS 防禦、CDN、免費層,一次到位。
3. **毒藥的正解走完第三步。** 單筆略過之後,失敗的事件進 dead-letter 留著重放([[rezero-comment-order|留言章]]重來版已經展開)——爆炸半徑縮到單筆,完整性由補救路徑接住。
4. **給批次積壓裝一個儀表。** 「淤而不倒」的前提是**你看得到淤**——batch lag 是這個架構唯一重要的健康指標,它應該在主播開播前就出現在某個螢幕上,而不是等留言區有人問「怎麼還沒收到」。

## 反思

### 過載一定要付帳,架構師決定用什麼貨幣

尖峰之下沒有免費的午餐:負載超過容量,系統一定在某個維度付出代價——批次系統用**延遲**付,同步系統用**可用性**付。這章兩條故事線的全部差異就在貨幣:留言積壓幾分鐘,客訴幾句,系統活著;fat API 一觸即炸,整站陪葬。所以「能批次的都批次化」不是效能優化,是**選擇破產方式**——延遲的帳可以分期(慢慢消化積壓),可用性的帳是即期全額。設計系統時問自己:每一條路徑過載時,我是在用哪種貨幣付帳?付不起的那種,就把它改成付得起的那種。

### 尖峰是商業模式的形狀,不是流量的形狀

200 則/秒的牆、放優惠的脈衝串、主副台的疊加——這些不是「流量特性」,是**生意的節奏直接投影在系統上**:主播喊 key 是牆的成因、放優惠是浪的成因、留言下單是削峰的成因。做容量規劃之前先看懂生意怎麼運作,比任何壓測都準——而反過來,[[sre-cascading-failures|雪崩式故障]]的第一課也是:系統的失效模式,同樣是被業務的形狀決定的。當年那個「商業模式自帶削峰」的紅利,我們享受了很久才意識到它的存在——最好的架構決策,有時候是業務替你做的。

### 帳單也是攻擊面

DDoS 那一小時,系統動不了是一種傷,**帳單多一千美元是另一種**——而且後者在攻擊結束後還會繼續:你為了防禦加購的服務,也在跟著流量計費。雲端時代的安全設計必須把成本模型算進去:攻擊者的成本趨近零,你的防禦若隨請求計價,這場仗在經濟上就輸了。把攻擊擋在計費表之外(邊緣層、固定費率、免費層),跟把攻擊擋在系統之外一樣重要——**安全架構的一半,是財務架構**。
