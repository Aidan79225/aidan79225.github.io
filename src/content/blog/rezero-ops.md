---
title: "沒有 SRE 的年代:backend lead 的上線日記"
date: 2026-08-01
category: tech
description: "一台 VM、一顆 Cloud SQL,扛住 13,000 人在線;監控只有模模糊糊的 Sentry,告警系統是主播的聲音,跟播的第四個視窗是直播本身;半夜打給 CTO 的電話,和一句後來才想明白的話——當年缺的不是監控,是事故的語言。"
tags:
  - war-story
  - live-commerce
  - sre
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 15
comments: true
draft: false
---
[[rezero-flash-crowd|上一章]]講尖峰怎麼打;這一章講打仗的人。當年團隊沒有 SRE 這個職稱——身為 backend lead,infrastructure 的仗自然全落在我身上。這章是那段提心吊膽日子的日記:全部家當一台 VM、模模糊糊的監控、跟播的四個視窗,和半夜打給 CTO 的電話。

## 全部家當:一台 VM,一顆資料庫

先交代陣地。整個平台——traefik、四個 API process(Django,API 和 WebSocket 一起做)、三個 Celery 容器,連同 Redis 和 RabbitMQ——**全部擠在同一台 VM 上**。資料庫不自己養,直接用 Cloud SQL,開了 8 core。就這樣,兩台之力,扛住[[rezero-flash-crowd|最高 13,000 人在線的直播]]。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 268" role="img" aria-label="全部家當的架構圖。一台 VM 裡面由上而下:traefik 反向代理;四個 Django process 同時做 API 與 WebSocket;三個 Celery 容器——heartbeat 排程、抓留言專用只開一個 worker、async task 開十個 worker 並用 acks late;還有 Redis 與 RabbitMQ。VM 之外只有一顆 Cloud SQL,8 core。頂部標注一萬三千人在線的流量進入 traefik。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="200" y="20" fill="#e6e6e6" font-size="8.4" text-anchor="middle" font-weight="bold">13,000 人在線</text>
    <line x1="200" y1="26" x2="200" y2="48" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 196 44 L 200 50 L 204 44 Z" fill="#9aa4b2"/>
    <rect x="24" y="52" width="352" height="196" rx="8" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="368" y="66" fill="#9aa4b2" font-size="7" text-anchor="end">一台 VM</text>
    <rect x="44" y="62" width="140" height="22" rx="5" fill="#1f2330" stroke="#d6a45c" stroke-width="1.1"/>
    <text x="114" y="77" fill="#d6a45c" font-size="7.2" text-anchor="middle">traefik</text>
    <rect x="44" y="94" width="70" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <rect x="122" y="94" width="70" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <rect x="200" y="94" width="70" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <rect x="278" y="94" width="70" height="20" rx="4" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="79" y="108" fill="#e6e6e6" font-size="6.6" text-anchor="middle">API+WS</text>
    <text x="157" y="108" fill="#e6e6e6" font-size="6.6" text-anchor="middle">API+WS</text>
    <text x="235" y="108" fill="#e6e6e6" font-size="6.6" text-anchor="middle">API+WS</text>
    <text x="313" y="108" fill="#e6e6e6" font-size="6.6" text-anchor="middle">API+WS</text>
    <line x1="114" y1="84" x2="114" y2="94" stroke="#3a4154" stroke-width="1"/>
    <rect x="44" y="128" width="98" height="40" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="93" y="143" fill="#e6e6e6" font-size="6.6" text-anchor="middle">Celery:heartbeat</text>
    <text x="93" y="156" fill="#9aa4b2" font-size="6" text-anchor="middle">排程的心臟</text>
    <rect x="150" y="128" width="98" height="40" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="199" y="143" fill="#e6e6e6" font-size="6.6" text-anchor="middle">Celery:抓留言</text>
    <text x="199" y="156" fill="#d6a45c" font-size="6" text-anchor="middle">只有 1 個 worker</text>
    <rect x="256" y="128" width="98" height="40" rx="5" fill="#233528" stroke="#54b890" stroke-width="1.1"/>
    <text x="305" y="143" fill="#e6e6e6" font-size="6.6" text-anchor="middle">Celery:async task</text>
    <text x="305" y="156" fill="#9aa4b2" font-size="6" text-anchor="middle">10 workers・acks_late</text>
    <rect x="44" y="182" width="98" height="22" rx="5" fill="#1f2330" stroke="#dc4c3f" stroke-width="1.1"/>
    <text x="93" y="197" fill="#e6e6e6" font-size="6.6" text-anchor="middle">Redis</text>
    <rect x="150" y="182" width="98" height="22" rx="5" fill="#1f2330" stroke="#e0733a" stroke-width="1.1"/>
    <text x="199" y="197" fill="#e6e6e6" font-size="6.6" text-anchor="middle">RabbitMQ</text>
    <text x="200" y="234" fill="#9aa4b2" font-size="6.6" text-anchor="middle">刻意用盡量少的資源做——這是哲學,不是預算</text>
    <rect x="420" y="118" width="130" height="44" rx="6" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.2"/>
    <text x="485" y="136" fill="#e6e6e6" font-size="7.2" text-anchor="middle">Cloud SQL</text>
    <text x="485" y="151" fill="#9aa4b2" font-size="6.4" text-anchor="middle">8 core・不自己養 DB</text>
    <line x1="376" y1="140" x2="420" y2="140" stroke="#3a4154" stroke-width="1.2"/>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">兩台之力:一台 VM 裝下全部元件,一顆管理式資料庫。厲害吧。</figcaption>
</figure>

用盡量少的資源做,是刻意的哲學,不是預算不夠。這個選擇日後有代價([[rezero-flash-crowd|#14 的每一場仗]]都因此貼身肉搏),但也有紀律上的回報:資源少,就沒有「先開大一點再說」的逃生門,每個元件都得想清楚自己憑什麼佔一份 CPU。

三個 Celery 容器的分工,是這個小陣地裡最有設計感的部分:

- **heartbeat**:跟 Django 結合做排程,整個系統所有「定時發生的事」——抓留言的節奏、每小時重算賣出數量、催付掃表——心跳都從這裡來。[[rezero-stack|#2]] 說過,Django + Celery + heartbeat 就是我們的免維運版 Airflow。
- **抓留言:只有一個 worker。** 這不是省,是設計——單一 worker 天生序列化,[[rezero-comment-order|#3]] 講的「單一抓取 job 自己定義了全域順序」,讓 LWW 成立的物理基礎就是這一個 worker。它抓完留言,透過 Redis 的 group 把留言轉進 API server,由同一組 process 的 WebSocket 推上主播 dashboard——[[rezero-console|#9]] 的留言瀑布就是這條線。
- **async task:10 個 worker**,走 RabbitMQ,設 `acks_late`——**做完才認,寧可重做,不可丟單**。這是至少一次語意,代價是任務要冪等,[[rezero-payment|#7]] 那套「事實表天生冪等」在這裡再度收利息。發票 API 這種一打就好幾秒的慢呼叫,後來被隔離出去,免得慢任務佔滿 worker、快任務全部排隊。

## 監控:Sentry,和模模糊糊的我們

陣地交代完了,講難堪的部分:**監控基本上是純人肉**。當年的認知就到那裡——我們做到的只有用 Sentry 看 error。上線初期 Sentry 的容量一下就炸了,後來才學會加 sampling。團隊裡沒有人真的懂監控,我自己,大概也就是模模糊糊地看。

但 Sentry 有一筆真戰績,而且不在正式環境——在 demo 階段。系統要給其他部門的人試用,問題回報得七零八落;VM 裡的 log 有時被清掉,想查也查不到,這時 Sentry 就派上用場了。這件事教了我一課:**log 是揮發的,error tracker 是留底的**。Sentry 對我們的真實價值不是「監控」,是**持久化的錯誤記憶**——現場已經被打掃過,它還記得案發經過。

盲區也要誠實說:error tracker 只看得到 exception。延遲慢慢變高、CPU 逼近飽和、batch 越淤越深——這些都不會 raise,Sentry 一片綠,系統可能正在淹水。用 [[sre-monitoring|四個黃金訊號]]的語言說,我們四格只看得到 errors 一格;latency、traffic、saturation 三格,全靠下一節的人肉。

## 跟播:四個視窗

剛上線的第一個月,每一場直播我都跟播。開四個視窗:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 262" role="img" aria-label="跟播的四個視窗與退場曲線。四個視窗:主播 dashboard 看數據有沒有正常進來;VM terminal 盯各個 docker container 的 CPU;Django admin 隨時抽查 bidding key 狀態;第四個視窗是直播本身,聽主播有沒有說系統怪怪的——它被標為最靈敏的告警。底部退場曲線:第一個月每場跟,之後變成 CTO 有問題才 call,後來連 call 都沒有了。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="8.4" text-anchor="middle" font-weight="bold">跟播的四個視窗</text>
    <rect x="30" y="32" width="255" height="62" rx="6" fill="#1f2330" stroke="#4f6df5" stroke-width="1.1"/>
    <text x="157" y="52" fill="#4f6df5" font-size="7.2" text-anchor="middle" font-weight="bold">① 主播 dashboard</text>
    <text x="157" y="68" fill="#e6e6e6" font-size="6.6" text-anchor="middle">留言、下單、觀看數——</text>
    <text x="157" y="82" fill="#9aa4b2" font-size="6.6" text-anchor="middle">數據有沒有正常進來</text>
    <rect x="295" y="32" width="255" height="62" rx="6" fill="#1f2330" stroke="#54b890" stroke-width="1.1"/>
    <text x="422" y="52" fill="#54b890" font-size="7.2" text-anchor="middle" font-weight="bold">② VM terminal</text>
    <text x="422" y="68" fill="#e6e6e6" font-size="6.6" text-anchor="middle">盯各個 docker container</text>
    <text x="422" y="82" fill="#9aa4b2" font-size="6.6" text-anchor="middle">的 CPU 使用量</text>
    <rect x="30" y="104" width="255" height="62" rx="6" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.1"/>
    <text x="157" y="124" fill="#9b6ff0" font-size="7.2" text-anchor="middle" font-weight="bold">③ Django admin</text>
    <text x="157" y="140" fill="#e6e6e6" font-size="6.6" text-anchor="middle">隨時抽查 bidding key 狀態</text>
    <text x="157" y="154" fill="#9aa4b2" font-size="6.6" text-anchor="middle">工程師的抽樣檢查口</text>
    <rect x="295" y="104" width="255" height="62" rx="6" fill="#3a2632" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="422" y="124" fill="#e05a7d" font-size="7.2" text-anchor="middle" font-weight="bold">④ 直播本身</text>
    <text x="422" y="140" fill="#e6e6e6" font-size="6.6" text-anchor="middle">聽主播有沒有說「系統怪怪的」</text>
    <text x="422" y="154" fill="#e05a7d" font-size="6.6" text-anchor="middle" font-weight="bold">← 最靈敏的告警</text>
    <line x1="60" y1="206" x2="520" y2="206" stroke="#3a4154" stroke-width="1.2"/>
    <path d="M 516 202 L 522 206 L 516 210 Z" fill="#3a4154"/>
    <circle cx="90" cy="206" r="3" fill="#e05a7d"/>
    <text x="90" y="194" fill="#e6e6e6" font-size="6.8" text-anchor="middle">第一個月:每場跟</text>
    <circle cx="290" cy="206" r="3" fill="#d6a45c"/>
    <text x="290" y="194" fill="#e6e6e6" font-size="6.8" text-anchor="middle">之後:CTO 有問題才 call</text>
    <circle cx="470" cy="206" r="3" fill="#54b890"/>
    <text x="470" y="194" fill="#e6e6e6" font-size="6.8" text-anchor="middle">後來:連 call 都沒了</text>
    <text x="290" y="234" fill="#9aa4b2" font-size="6.8" text-anchor="middle">退場曲線:信任是一場一場平安的直播買回來的</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">四格監控,一格是量表、一格是 CPU、一格是抽查——最靈敏的那格,是直播的聲音。</figcaption>
</figure>

前三個視窗都還算正經:dashboard 看數據有沒有進來、terminal 看各 container 的 CPU、admin 抽查 bidding key 的狀態。真正的告警系統是第四個——**直播本身**。主播老闆一句「系統怪怪的」,比任何量表都快、都準:她站在使用者體驗的最前線,任何延遲、漏單、頁面異常,她的體感先於我的四個視窗。[[rezero-notification|#12]] 說過主播是這個平台的通知系統;這章要補上另一半——**她也是告警系統**。

跟播有一條退場曲線:第一個月每場跟;沒什麼問題之後,變成 CTO 有問題才 call 我;後來,連 call 都沒了。人肉監控的退役,不是換上了更好的儀表板——是**不再需要看**。信任是用一場一場平安的直播慢慢買回來的。

## 半夜的電話,和事故的語言

半夜的電話不打給我,打給 CTO——而且他常常被這樣對待。電話裡不只有事故,還有**許願**:各種胡亂許願,連許願的人自己都說不清楚要什麼的那種。最有名的一通:週二半夜打來,說要一個「後選樣式」的功能,這週六的直播就要用。我們真的趕出來了,也如期上線——它的完整故事和啼笑皆非的結局,留到系列終章再說。

這件事我後來才想明白:當年缺的不只是監控,是**「事故的語言」**。

- 沒有 severity 分級,「系統怪怪的」和「全站掛了」是同一通電話,半夜三點和下午三點是同一種待遇。
- 沒有事故入口,回報問題的唯一介面是「打給職級最高的技術人」——CTO 是人肉 pager,也是人肉 triage。
- 沒有 runbook,每一通電話的應對都是即興演出。

許願的人說不清楚要什麼,不是因為他們不專業——是**系統沒有給他們描述問題的詞彙**。使用者只能說「怪怪的」,因為我們沒給他們狀態頁;老闆只能半夜打電話,因為除了電話,我們沒給他任何分級和入口。[[sre-alerting-oncall|告警與 on-call]] 那套制度的本質,是一部**翻譯機**:把人類的不安翻譯成系統的動作,把翻譯成本從人肉搬進制度。沒有翻譯機的時候,翻譯工作不會消失——它會沿著職級往上爬,爬到最高的那個技術人為止,在半夜響鈴。

## 重來:pipeline 蓋不到的那半張 checklist

上線那天有沒有 checklist?沒有,硬著頭皮就上了。底氣是 infrastructure 很早就位:CI/CD 健全、staging 自動部署,[[rezero-stack|#2]] 講過這是小團隊最大的槓桿。事後看,這半張底氣是真的——**可重複的部署,本身就是一張每天都在自動執行的 checklist**,它持續驗證「部署是對的」。

但 pipeline 只保證部署是對的,**不保證部署之後扛得住**。checklist 的另外半張——容量、監控、告警——pipeline 一項都蓋不到,而那半張紙上的每一項,後來都變成一場仗:容量沒估,[[rezero-flash-crowd|單 process 被打爆]];監控沒建,Sentry 模模糊糊;告警沒分級,CTO 半夜接電話。重來一次,補的就是那半張:

1. **容量估算+負載測試**。開賣尖峰不是黑天鵝,[[rezero-flash-crowd|#14]] 畫過它的形狀——可預測的 200 則/秒。上線前用這個形狀重放一輪,單 process 的死法會在上線前出現,而不是直播中。
2. **最小監控組合**:[[sre-monitoring|四個黃金訊號]],加一個業務量表——batch lag(最舊未處理留言的年齡)。不需要 [[obs-intro|LGTM 全家桶]],當年一個 Grafana 加幾條 query 就夠。重點不是看得更多,是**把恐懼換成數字**。
3. **事故的語言**:三級 severity、一個事故入口、每級一頁 runbook。把「打給 CTO」變成最後一級,而不是唯一一級。
4. **跟播保留,但角色改變**:不再當監控用,當產品觀察用。跟播能看到儀表板永遠不會告訴你的東西——主播怎麼繞過你的設計、助理在哪個畫面卡住、[[rezero-console|哪個花式需求]]其實已經沒人在用。

那台 VM 要不要改?**不改。** 一台 VM 加 8 core 的 Cloud SQL 扛住了 13,000 人在線,證明資源從來不是瓶頸,缺的是保護。極簡不是錯,裸奔才是。

## 反思

**恐懼是最貴的監控。**人肉跟播的成本不是那幾個小時,是注意力和睡眠品質——第一個月,我是用恐懼在付監控費。儀表板的意義不是讓你知道更多,是**允許你不看**;監控系統的終極產品,是安心。我們的退場曲線也值得誠實檢討:正確的退場是「數字說可以不看了」,我們的退場是「習慣了沒出事」——這兩者的差距是賒帳,[[rezero-flash-crowd|DDoS 那天]]連本帶利討了回去。

**制度是翻譯機。**這章我最想留下的一句話:許願的人說不清楚,是因為我們沒給他語言。severity、runbook、狀態頁,這些東西表面上是流程,本質上是一套**翻譯協定**——把「怪怪的」翻譯成可操作的訊號。沒有協定,翻譯不會消失,只會由人肉完成,而且永遠是職級最高的那個人肉,在最不該醒著的時間。

**職稱可以缺席,問題不會缺席。**當年沒有 SRE 這個角色,但 SRE 的問題一個也沒少:容量、監控、告警、on-call,每一題都在,只是沒人認領——而沒人認領的問題,會自己長到離它最近的人身上。backend lead 兼 infra 不是能者多勞,是問題找上了離它最近的人。多年後我成了掛著 SRE 職責的人,回頭看,起點就是這段提心吊膽的日子。

系統活下來了,人也活下來了。但「活著」不等於「帳是對的」——庫存的數字、訂單的數字、銀行的數字,三本帳在各自的表裡安靜地漂移。下一章,對帳。
