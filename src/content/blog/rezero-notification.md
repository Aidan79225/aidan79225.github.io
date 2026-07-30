---
title: "通知系統:兩個欄位、一支排程,和一通電話"
date: 2026-07-31
category: tech
description: "營運面第四章:渠道帳本(private reply、email、電話的嚴重度階梯——電話這條渠道是用免運買來的)、事實表兼任通知隊列與投遞帳、被 FB 文件坑的限速戰記、10 秒規則,以及「催付名單不是功能,是一次查詢」。"
tags:
  - war-story
  - live-commerce
  - notification
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 12
comments: true
draft: false
---
「通知系統」四個字在教科書裡的長相:一套 notification service、一組 message queue、模板引擎、多渠道 SDK、退避重試框架。這章要講的版本是:**兩個欄位、一支排程掃描、一條十秒規則,和客服的一通電話**。它小得不像個系統——而它送達了 99% 的通知,剩下的 1% 也有人接。

## 渠道帳本:成本與嚴重度對齊

先盤點渠道。這個系統的通知走四條路,嚴重度越高、渠道越貴:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 264" role="img" aria-label="通知渠道的嚴重度階梯。第一級 private reply:自動、免費、量大,用於得標通知並附綁定 token,受 FB 政策牆限制一則留言只能回覆一次。第二級 email:常規與內部通知,async 任務完成通知走這裡,用 Google Workspace,缺點是會沉底。第三級電話:人工、最貴,保留給最後通牒——錢要被清、人要進黑名單之前,由客服撥打;這條渠道是用「綁定電話送免運」的活動買來的。旁支簡訊:只用於身份認證 OTP。底部結論:渠道成本與訊息嚴重度對齊,觸達權是產品換來的。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rnt" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="252" y="22" fill="#9aa4b2" font-size="7.6" text-anchor="middle">訊息嚴重度 →</text>
    <line x1="120" y1="30" x2="390" y2="30" stroke="#3a4154" stroke-width="1" marker-end="url(#rnt)"/>
    <rect x="16" y="44" width="170" height="108" rx="8" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.4"/>
    <text x="101" y="66" fill="#9b6ff0" font-size="8.6" text-anchor="middle" font-weight="bold">private reply</text>
    <text x="101" y="84" fill="#e6e6e6" font-size="6.8" text-anchor="middle">自動・免費・量大</text>
    <text x="101" y="100" fill="#e6e6e6" font-size="6.8" text-anchor="middle">得標通知+綁定 token</text>
    <text x="101" y="122" fill="#e05a7d" font-size="6.2" text-anchor="middle">政策牆:一則留言</text>
    <text x="101" y="134" fill="#e05a7d" font-size="6.2" text-anchor="middle">只能回一次</text>
    <rect x="206" y="44" width="170" height="108" rx="8" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="291" y="66" fill="#4f6df5" font-size="8.6" text-anchor="middle" font-weight="bold">email</text>
    <text x="291" y="84" fill="#e6e6e6" font-size="6.8" text-anchor="middle">常規・內部通知</text>
    <text x="291" y="100" fill="#e6e6e6" font-size="6.8" text-anchor="middle">async 完成通知走這裡</text>
    <text x="291" y="122" fill="#9aa4b2" font-size="6.2" text-anchor="middle">Google Workspace 現成</text>
    <text x="291" y="134" fill="#9aa4b2" font-size="6.2" text-anchor="middle">缺點:會沉底</text>
    <rect x="396" y="44" width="170" height="108" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.6"/>
    <text x="481" y="66" fill="#d6a45c" font-size="8.6" text-anchor="middle" font-weight="bold">電話(客服)</text>
    <text x="481" y="84" fill="#e6e6e6" font-size="6.8" text-anchor="middle">人工・最貴・必達</text>
    <text x="481" y="100" fill="#e6e6e6" font-size="6.8" text-anchor="middle">最後通牒:錢要被清、</text>
    <text x="481" y="113" fill="#e6e6e6" font-size="6.8" text-anchor="middle">人要進黑名單之前</text>
    <text x="481" y="134" fill="#54b890" font-size="6.2" text-anchor="middle" font-weight="bold">渠道來源:綁電話送免運</text>
    <rect x="206" y="170" width="170" height="34" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="291" y="185" fill="#e6e6e6" font-size="7" text-anchor="middle">簡訊:只做身份認證(OTP)</text>
    <text x="291" y="197" fill="#9aa4b2" font-size="6" text-anchor="middle">渠道用途有紀律,不混用</text>
    <text x="290" y="238" fill="#9aa4b2" font-size="7.6" text-anchor="middle">渠道成本與訊息嚴重度對齊;而觸達權不是接 API 就有的——它是產品換來的</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三級階梯加一條旁支:越嚴重的訊息走越貴的渠道,最貴的那條靠人。</figcaption>
</figure>

最值得停的是電話那格。催付——檔期要結了、再不付款單就要被清、人要進黑名單——這種訊息交給任何自動渠道都不夠:private reply 有政策牆(FB 規定一則留言只能回一次,得標通知已經用掉了),email 會沉底。**必達的訊息只有電話**,但打電話要有號碼——所以當年做了「**綁定電話送免運**」的活動,很多客人綁了。用運費**採購**一條高觸達渠道,順便給簡訊 OTP 鋪路——**觸達權是稀缺資產,它不是接了 API 就有,是產品拿東西換來的**。這是我在這個系統裡最喜歡的增長設計之一。

## 沒有隊列的通知隊列

得標通知怎麼發?教科書會畫一條 message queue。當年的答案是:**不需要隊列,因為事實表就是隊列**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 262" role="img" aria-label="事實表兼任通知隊列的流程。中央是 fbmsgtocartitem 表,原有欄位 fb user、fb msg、cart item、bidding key 之外,再加兩個欄位:是否成功送訊息、重試次數。排程定時掃描這張表中已結標且未成功且重試少於五次的列,打 FB batch API 發出得標通知,回頭更新成功欄位或累加重試次數;成功或重試達五次即為終態,不再處理。送達率約百分之九十九,完全寄不出去的殘量由客服接手。這張表至此有五重身分:訂單溯源、LWW 的 upsert 目標、通知隊列、投遞帳、對帳錨點。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rnf" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker></defs>
    <rect x="150" y="16" width="280" height="76" rx="8" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="290" y="34" fill="#d6a45c" font-size="8.8" text-anchor="middle" font-weight="bold">fbmsgtocartitem</text>
    <text x="290" y="50" fill="#9aa4b2" font-size="6.6" text-anchor="middle">fb_user・fb_msg・cart_item・bidding_key</text>
    <rect x="170" y="58" width="115" height="20" rx="4" fill="#233528" stroke="#54b890" stroke-width="1"/>
    <text x="227" y="72" fill="#54b890" font-size="6.4" text-anchor="middle">是否成功送訊息</text>
    <rect x="295" y="58" width="115" height="20" rx="4" fill="#233528" stroke="#54b890" stroke-width="1"/>
    <text x="352" y="72" fill="#54b890" font-size="6.4" text-anchor="middle">重試次數</text>
    <line x1="90" y1="130" x2="180" y2="98" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rnf)"/>
    <rect x="20" y="132" width="140" height="40" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="90" y="148" fill="#4f6df5" font-size="7.4" text-anchor="middle" font-weight="bold">排程掃描</text>
    <text x="90" y="163" fill="#9aa4b2" font-size="6" text-anchor="middle">已結標・未成功・重試&lt;5</text>
    <line x1="160" y1="152" x2="216" y2="152" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rnf)"/>
    <rect x="220" y="132" width="140" height="40" rx="7" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.3"/>
    <text x="290" y="148" fill="#9b6ff0" font-size="7.4" text-anchor="middle" font-weight="bold">FB batch API</text>
    <text x="290" y="163" fill="#9aa4b2" font-size="6" text-anchor="middle">得標通知+綁定 token</text>
    <line x1="360" y1="152" x2="416" y2="152" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rnf)"/>
    <rect x="420" y="132" width="140" height="40" rx="7" fill="#233528" stroke="#54b890" stroke-width="1.3"/>
    <text x="490" y="148" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">回寫欄位</text>
    <text x="490" y="163" fill="#9aa4b2" font-size="6" text-anchor="middle">成功✓ 或 重試+1</text>
    <path d="M 490 132 Q 470 104 432 96" fill="none" stroke="#54b890" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rnf)"/>
    <text x="290" y="204 " fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">終態:成功,或重試滿 5 次——不再處理;送達 ~99%,殘量歸客服</text>
    <text x="290" y="232" fill="#9aa4b2" font-size="7.2" text-anchor="middle">這張表的第五個身分:訂單溯源・LWW upsert・通知隊列・投遞帳・對帳錨點</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">掃表就是取件、欄位就是投遞帳:兩個欄位換掉一套 message queue 加 notification service。</figcaption>
</figure>

流程一句話講完:[[rezero-comment-order|喊單]]會 upsert fbmsgtocartitem,排程掃這張表裡**已結標、未成功、重試不滿 5 次**的列,打 FB 的 batch API 發得標通知(附[[rezero-identity|綁定 token]]),回頭更新成功欄位或重試次數。**成功、或重試滿 5 次,就是終態**——有界的 at-least-once,不會有殭屍任務永遠重試。

這個設計的好,要跟教科書版對照才顯出來:多數團隊會為這個需求上一套 MQ + notification service + 投遞狀態表——三個新元件、三處新的一致性邊界。這裡是**兩個欄位**:隊列就是掃表的 WHERE 條件、投遞帳就是欄位本身,而「這位客人收到通知了嗎」是一句 SQL,不是跨三個系統的追蹤。fbmsgtocartitem 至此有了五重身分:訂單溯源、LWW 的 upsert 目標、通知隊列、投遞帳、對帳錨點——**一張表五個角色而不勉強,因為每個角色只讀寫自己的欄位,而它們共享同一個事實粒度:一則留言一列。**

## 戰記:被 FB 文件坑的那次限速

這章唯一的事故。一開始發通知是一則一則打 FB API——然後**被限速了**,得標通知大塞車,客人在留言區問「怎麼還沒收到」,**主播罵死**(得標通知是她服務的一部分,晚了丟的是她的臉)。

最嘔的是:打的量**明明離 FB 文件寫的速率上限還很遠**。對著文件檢查了半天,沒有超,但就是被限。最後的修法是改用 batch API 一次打包,從此穩定,送達率 99%——剩下那 1% 是無論如何都寄不出去的帳號(FB 端的因素),靠客服補。

教訓兩條:**外部平台的文件是參考值,不是 SLA**——真實限額只能實測,尤其當你的流量模式(直播結標瞬間的爆發)跟平台想像的不一樣時;以及**「發不出去」必須是可見的狀態**——表上那個成功欄位,讓 1% 的殘量有地方可查、有人可接,而不是無聲蒸發。這跟[[rezero-comment-order|留言章]]「失敗略過」的教訓遙相呼應:當年在留言那頭學到的課,在通知這頭做對了。

## 三條小規則,省掉一個系統

這章剩下的部分,是三條各自省掉一個子系統的規則:

- **10 秒規則。** 任何超過 10 秒的操作,一律做成 async task+完成後寄 email 給操作者(例:匯出檔期訂單)。「要不要 async」從逐案的架構討論變成一條常數規則,內部使用者也學會了心智模型:**久的事情,信箱見**。順帶一提,內部人員登入本來就是公司 email+OTP——通知和認證共用同一條信任鏈,零密碼。
- **催付名單不是功能,是一次查詢。** 客服要打電話催付,名單哪來?後台的訂單/購物車管理頁支援可組合的花式搜尋(Django Ninja 把 filters 組起來),「快結束檔期下的未付 cart item」就是一組查詢條件。**通用查詢機制做得夠好,專用清單頁的需求會自己消失**——[[rezero-console|機制歸系統,政策歸人]]:系統給查詢能力,打給誰、先打誰,客服決定。
- **站內通知,不做。** 站內通知意味著一整套:未讀狀態、通知列表、已讀回報、推播——而 email 已經躺在 Google Workspace 裡。「還不值得自建」是這個團隊反覆展現的判斷力:**抽象和基礎設施,等第二個真實需求出現再蓋。**

還有一條「不通知」也值得回收:[[rezero-comment-order|重喊清單不通知]]——主播口播就是通知,系統貼心一分,直播的急迫感就漏一分。通知系統的邊界,不只是「發什麼」,也是「刻意不發什麼」。

## 重來會怎麼做

這是全系列重來清單最短的一章:**幾乎原樣保留**。兩個欄位的投遞帳、掃表的隊列、渠道分級、10 秒規則,放到今天依然是對的尺寸。真要挑,只有兩件小事:

1. **「寄不出去」變成客服頁的預設 filter。** 殘量已經可查(成功欄位在),重來把它做成一鍵——讓 1% 的名單主動出現在客服眼前,而不是等有人想到去查。
2. **等第二個渠道再抽象。** 如果 LINE、簡訊行銷這些渠道真的要加,才值得立一層通知抽象(渠道介面+統一投遞帳);在那之前,任何「通知中心」都是替想像中的需求蓋房子。

## 反思

### 觸達權是買來的,不是接來的

工程師的直覺是「接上 API 就能發通知」——實際上每條渠道都有它的牆:FB 有政策(一則留言回一次、24 小時窗口),email 有沉底,簡訊有成本。真正稀缺的不是發送能力,是**對方會看到**的權利。「綁定電話送免運」教我的是:觸達權要當資產經營——它可以被購買(免運換號碼)、會折舊(騷擾就失效)、要省著用(電話只留給最後通牒)。通知系統設計的第一問不是「怎麼發」,是**「我憑什麼發,而他為什麼會看」**。

### 最好的基礎設施,是你沒有蓋的那些

這章從頭到尾在講「沒有蓋的東西」:沒有 message queue(掃表)、沒有 notification service(兩個欄位)、沒有站內通知(email)、沒有催付功能(一次查詢)。每個「沒有」都不是能力不足,是判斷——**在需求被證明之前,基礎設施是負債不是資產**。而支撐這些「沒有」的,是幾個做得特別紮實的「有」:可組合的查詢、事實粒度正確的表、現成的 Workspace。基礎設施的減法,靠的是地基的加法。

### 99% 的系統,1% 的人

綁定漏斗收到 99%,通知送達 99%,催付最後靠電話——這個系統到處都是同一個形狀:**自動化把大宗收走,把殘量標記出來,交給人**。很多工程師把「還有 1% 要人工」當成系統的恥辱,拚命想把它自動化到零;這個系統把 1% 當成設計的一部分:給它欄位、給它查詢、給它一個負責的角色。**通知的終點不是「送出」,是「沒送到的,有人接」**——把這句換成任何系統都成立:自動化的品質,不在覆蓋率的九有幾個,在殘量落地的姿勢好不好看。
