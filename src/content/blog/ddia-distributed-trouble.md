---
title: "分散式系統的麻煩:不可靠的網路、不可信的時鐘,與半死不活的節點"
date: 2026-07-24
category: tech
description: "DDIA Ch8 是全書最哲學、也最實用的一章:單機世界要嘛全好、要嘛全壞;分散式世界的常態卻是『部分失效』——半死不活。三個不可靠貫穿全章:網路(送出請求沒回應,四種原因你永遠分不出來,timeout 只是猜測)、時鐘(time-of-day 會回跳、節點之間永遠有時差,拿時間戳排序事件會默默丟資料)、以及行程本身(GC 暫停讓節點以為自己還活著)。結論只有一條路:你無法確定任何單一節點的狀態,所以真相只能由多數決定。" 
tags:
  - distributed-systems
  - book-notes
  - reliability
series: "Designing Data-Intensive Applications 讀書筆記"
seriesOrder: 8
comments: true
draft: false
---
[[ddia-transactions|上一篇]]結尾埋了個鉤子:當系統跨到多台機器,連「鎖」和「驗證」本身都變得不可靠。這章就是那個「不可靠」的總清算——也是我認為全書最該精讀的一章。核心一句話:**單機世界是確定性的,要嘛全好、要嘛全壞;分散式世界的常態,是「部分失效(partial failure)」——一部分壞了、其他還在跑,而且你常常分不清誰是誰。** 三個不可靠,層層遞進:網路、時鐘、然後是節點自己。

## 不可靠的網路:「沒有回應」有四種原因,而你分不出來

你送一個請求出去,遲遲沒有回應——**發生了什麼?** 這章最重要的一張圖,就是這個問題的答案:**你不知道,而且原則上無法知道。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 234" role="img" aria-label="送出請求卻沒有回應的四種不可區分的原因。你的節點送出請求後等待,可能是:一、請求在網路上遺失,對方根本沒收到;二、對方節點當掉了;三、對方只是很慢,例如正在 GC 暫停,等一下就會處理;四、對方處理完了,但回應在路上遺失。這四種情況在你這端看起來一模一樣:沒有回應。你唯一的工具是 timeout,但 timeout 到了只代表你決定不等了,不代表你知道發生了什麼——對方可能還在處理,甚至已經做完了。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="dt8" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="20" y="80" width="110" height="56" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="75" y="104" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">你的節點</text>
    <text x="75" y="121" fill="#9aa4b2" font-size="7.4" text-anchor="middle">送出請求,等待…</text>
    <line x1="130" y1="100" x2="196" y2="52" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#dt8)"/>
    <line x1="130" y1="106" x2="196" y2="100" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#dt8)"/>
    <line x1="130" y1="112" x2="196" y2="148" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#dt8)"/>
    <line x1="130" y1="118" x2="196" y2="196" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#dt8)"/>
    <rect x="200" y="34" width="356" height="36" rx="6" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="212" y="49" fill="#e05a7d" font-size="8.2" text-anchor="start" font-weight="bold">① 請求在網路上丟了</text><text x="212" y="62" fill="#9aa4b2" font-size="7" text-anchor="start">對方根本沒收到</text>
    <rect x="200" y="82" width="356" height="36" rx="6" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="212" y="97" fill="#e05a7d" font-size="8.2" text-anchor="start" font-weight="bold">② 對方當掉了</text><text x="212" y="110" fill="#9aa4b2" font-size="7" text-anchor="start">真的死了</text>
    <rect x="200" y="130" width="356" height="36" rx="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="212" y="145" fill="#d6a45c" font-size="8.2" text-anchor="start" font-weight="bold">③ 對方只是很慢(過載、GC 暫停中)</text><text x="212" y="158" fill="#9aa4b2" font-size="7" text-anchor="start">等一下它會處理——甚至正在處理</text>
    <rect x="200" y="178" width="356" height="36" rx="6" fill="#1f2330" stroke="#e05a7d" stroke-width="1.3"/>
    <text x="212" y="193" fill="#e05a7d" font-size="8.2" text-anchor="start" font-weight="bold">④ 對方做完了,但「回應」在路上丟了</text><text x="212" y="206" fill="#9aa4b2" font-size="7" text-anchor="start">動作已經發生,你卻以為沒有</text>
    <text x="75" y="158" fill="#e0733a" font-size="7.6" text-anchor="middle" font-weight="bold">在你這端:</text>
    <text x="75" y="172" fill="#e0733a" font-size="7.6" text-anchor="middle" font-weight="bold">四種一模一樣</text>
    <text x="75" y="186" fill="#9aa4b2" font-size="7" text-anchor="middle">= 沒有回應</text>
    <text x="290" y="228" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">timeout 到了,只代表「你決定不等了」,不代表「你知道發生了什麼」</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">請求沒有回應的四種原因——<b style="color:#e05a7d">請求丟了、對方死了、回應丟了</b>、或<b style="color:#d6a45c">對方只是慢</b>——在你這端<b>看起來完全一樣</b>。你唯一的工具是 <b>timeout</b>,但它是個殘酷的妥協:設太短,把只是慢的節點誤判成死的(然後你重送請求,可能把事情做兩遍——這正是 <a href="/blog/kafka-delivery/">exactly-once 難題</a>的根源);設太長,真死了你乾等。最陰的是 ④:<b>動作已經發生了,你卻以為沒有</b>。這張圖是分散式所有麻煩的起點</figcaption>
</figure>

這個「不可區分」不是工程沒做好,是**非同步網路的本質**——沒有任何機制能保證訊息在多久內送達。所以 [[redis-sentinel|Sentinel]] 才要分主觀下線(我覺得它掛了=我的 timeout 到了)與客觀下線(**過半**都覺得它掛了),所以重試一定要搭配[[airflow-reliability|冪等]]——因為你重送的那個請求,**可能第一次已經成功了**。

## 不可信的時鐘:想要順序,用序號,不要用時間

第二個不可靠更陰,因為它平時看起來很正常。先分清機器上的兩種鐘,再看誤用的災難:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 238" role="img" aria-label="兩種時鐘與誤用時間戳的災難。上半:time-of-day 時鐘回答現在幾點,會被 NTP 校正、可能往回跳,只能拿來標記時刻;monotonic 時鐘只保證單調往前,拿來量經過多久,量時間間隔一定要用它。下半:LWW 用時間戳決定誰贏的災難——節點 A 的鐘快了 3 秒,先發生的寫入 x=1 蓋著 10:00:05 的戳,節點 B 的鐘準,後發生的寫入 x=2 蓋著 10:00:03 的戳;LWW 比時間戳,x=2 這筆較新的寫入因為時間戳較小而被默默丟棄,資料無聲消失。結論:想要順序,用單調遞增的序號,例如 log offset 或 fencing token,不要用牆上的鐘。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="20" y="16" width="266" height="70" rx="8" fill="#1f2330" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="153" y="36" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">time-of-day 鐘:「現在幾點?」</text>
    <text x="153" y="54" fill="#9aa4b2" font-size="7.4" text-anchor="middle">會被 NTP 校正、可能「往回跳」</text>
    <text x="153" y="72" fill="#e0733a" font-size="7.4" text-anchor="middle" font-weight="bold">只能拿來「標記時刻」,別拿來排序、計時</text>
    <rect x="294" y="16" width="266" height="70" rx="8" fill="#1f2330" stroke="#54b890" stroke-width="1.4"/>
    <text x="427" y="36" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">monotonic 鐘:「經過多久?」</text>
    <text x="427" y="54" fill="#9aa4b2" font-size="7.4" text-anchor="middle">只保證單調往前,絕不回跳</text>
    <text x="427" y="72" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">量 timeout、量耗時,一律用它</text>
    <text x="290" y="108" fill="#e6e6e6" font-size="9.4" text-anchor="middle" font-weight="bold">誤用的災難:LWW 用時間戳決定誰贏</text>
    <rect x="36" y="120" width="240" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="156" y="136" fill="#e6e6e6" font-size="7.8" text-anchor="middle">節點 A(鐘快了 3 秒):寫 x=1</text>
    <text x="156" y="152" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-family="monospace">timestamp = 10:00:05(先發生)</text>
    <rect x="304" y="120" width="240" height="40" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="424" y="136" fill="#e6e6e6" font-size="7.8" text-anchor="middle">節點 B(鐘是準的):寫 x=2</text>
    <text x="424" y="152" fill="#d6a45c" font-size="7.8" text-anchor="middle" font-family="monospace">timestamp = 10:00:03(後發生)</text>
    <rect x="120" y="172" width="340" height="30" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.5"/>
    <text x="290" y="191" fill="#e05a7d" font-size="8.6" text-anchor="middle" font-weight="bold">LWW 比時間戳:x=2(較新的寫入)被默默丟棄 💥</text>
    <text x="290" y="222" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">想要順序 → 用單調遞增的「序號」(log offset、fencing token),不要用牆上的鐘</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">上半是基本功:<b style="color:#4f6df5">time-of-day 鐘</b>會被 NTP 校正、<b>可能往回跳</b>——拿它量耗時,你會量出負的;量 timeout、量間隔一律用<b style="color:#54b890">monotonic 鐘</b>。下半是真正的災難:多主複製常用 <b>LWW(last write wins)</b>拿時間戳決定衝突誰贏,但節點之間的鐘<b>永遠有時差</b>——鐘快 3 秒的節點,先發生的寫入蓋著「較新」的戳,於是<b style="color:#e05a7d">真正較新的寫入被默默丟棄</b>,沒有錯誤、沒有告警。結論刻進骨子:<b>想要事件的順序,用單調遞增的序號(Kafka 的 offset、fencing token),永遠不要信牆上的鐘</b></figcaption>
</figure>

## 半死不活的節點:你連「自己還活著」都不能確定

第三層最哲學:**連節點自己的判斷都不可信。** 一個行程可能在任何一行程式碼之間被暫停——GC stop-the-world、VM 被 suspend、還不完的 page fault——**暫停幾秒甚至幾分鐘,而它自己毫無知覺**。醒來的那一刻,它以為自己還是 leader、以為鎖還在手上,但世界早就變了。這正是我在[[redis-distributed-lock|分散式鎖]]畫過的那場戲:GC 暫停超過 TTL,兩個 client 同時「持有」鎖——而解法(**fencing token**,單調遞增的序號、由資源端把關)也在那篇講透了,這裡不重畫。

把三層合起來,Ch8 的結論就浮出來了:**任何單一節點的判斷——包括它對自己的判斷——都不可信;所以「真相」在分散式系統裡,只能是多數節點投票的結果(quorum)。** 一個節點就算自認活著,只要過半宣告它死了,它就「死」了,必須讓位。這就是 [[redis-sentinel|Sentinel 的過半]]、[[redis-cluster|Cluster 的過半]]一路埋的伏筆——而「多數怎麼安全地達成一個決定」,正是下一章**共識**的主題。(至於「節點會說謊」的拜占庭故障:除非你在做區塊鏈或航太,一般自家機房**假設節點誠實但會壞**就夠了——別為用不到的威脅模型付設計稅。)

## 反思

### timeout 不是「知識」,是「決定」——想通這句,重試與冪等就成了信仰

那張「四種原因不可區分」的圖,是我認為整本 DDIA 最值得裱框的一張。它戳破一個工程師普遍的錯覺:timeout 到了 = 對方掛了。不,**timeout 到了只代表「你決定不再等」——你依然不知道請求是沒到、做了一半、還是做完了但回應丟了**。這個「不知道」推出兩條我奉為紀律的實務規則:第一,**重試是必須的,所以冪等不是選項**([[airflow-reliability|可靠性那篇]]的地基,原來根在這);第二,**任何單點的死活判斷都只是猜測,要行動就得湊多數**([[redis-sentinel|SDOWN→ODOWN]] 的設計,原來理論在這)。一章書,把我散落在 Airflow、Redis、SRE 的三個實務習慣,收攏成同一條公理的推論。

### 「想要順序,用序號,不要用時鐘」——資料工程的每一天都在用這句話

LWW 靠時間戳丟資料那一幕,對做資料的人應該格外刺痛,因為我們天天在跟它的變體搏鬥:[[spark-streaming|event time vs processing time]]、遲到的事件、跨機房的日誌合併排序。這章給了我一個統一的答案:**牆上的鐘只能拿來「大概標記」,凡是正確性依賴順序的地方,一律用單調遞增的序號**——Kafka 的 offset、資料庫的 LSN、fencing token,全是這個原則的化身。我現在設計任何 pipeline,看到「用 timestamp 判斷誰新誰舊」就會停下來問:**這兩個 timestamp 來自同一個鐘嗎?** 不是的話,就換序號、或接受近似。這句話便宜、好記、能擋住一整類無聲的資料損毀。

### 部分失效不是要修的 bug,是要接受的世界觀

讀完這章,我對「分散式」三個字的敬畏又深了一層:**單機是「要嘛全好、要嘛全壞」的確定性世界,分散式是「永遠有一部分半死不活」的機率世界**——而後者不是工程不夠好,是本質。這給我兩個層次的啟示。往下,它解釋了為什麼 [[k8s-intro|K8s 的 reconcile loop]]、[[sre-cascading-failures|SRE 的一切設計]]都圍繞「預期失敗」——在這個世界觀裡,可靠性不是「不出事」,是**出事時系統還能收斂**。往上,它再次替 [[pain-before-power|先確認痛點]]背書:**每跨出一台機器,你就把自己從確定性世界搬進機率世界**,那是一整套認知稅——網路、時鐘、quorum、fencing 全要補課。單機扛得住,就別急著分散;真要分散,就把這章當入場券,一字一字讀完再上路。
