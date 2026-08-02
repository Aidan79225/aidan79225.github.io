---
title: "平行世界:如果變成 SaaS"
date: 2026-08-02
category: tech
description: "當年整個團隊降薪上船,說好要造的就是這艘 SaaS 大船——船還停在願景層,航程就結束了。這章把沒畫出來的設計圖畫完:bidding key 撞號、租戶級黑名單、尖峰的公平性、一顆 Cloud SQL 長成分散式的四站演進,以及用當年實測數字算出來的容量與成本——10、100、1000 個商家,各要燒多少錢。"
tags:
  - war-story
  - live-commerce
  - system-design
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 20
comments: true
draft: false
---
先交代一件前面十九章都沒說的事:**當年我們每一個人,都是降薪進來的。**降薪換的是一個承諾——現在做的直播代購平台只是第一站,真正要造的是一艘 SaaS 大船:把整套系統賣給每一個想做直播代購的商家。

船,停在願景層;航程,在[[rezero-microservices|上一章]]那天結束了。所以這一章是全系列唯一的平行世界:**把那張從來沒被畫出來的設計圖,畫完。**錨點全部來自前面十九章的真實系統與真實數字;設計是現在的我;而數字,是工程師的 Fermi 估算——抓量級,不抓小數點。

設定先釘死:**租戶=商家**,一個主播團隊的整套(主播、助理、營運、客服),用我們的平台開自己的直播代購生意。

## 快巡:一多租戶,什麼東西現形

最先撞牆的是最小的東西:**bidding key。**`2601` 在 A 商家是圍巾、在 B 商家是耳環——key 的 namespace 從全域變成 `(tenant, key)`。[[rezero-comment-order|FSM]] 一行都不用改(它解析的是文字),改的是查表那端:bidding key 查詢多帶一個 `tenant_id`。**查詢即驗證的紅利再現:驗證邏輯住在 DB 查詢裡,所以多租戶化只要改查詢,不用改解析器。**

然後是全面的 `tenant_id` 巡禮:檔期、商品、購物車、訂單、金流事實表、配貨紀錄、image_metadata——**每一張表都要帶**。巡完會發現一個此前沒人注意的事實:**這個系統的業務天然是租戶局部的**。所有交易都發生在「一個商家與他的客人」之間——留言下單在商家的直播裡、[[rezero-cart-order|跨檔期合併結帳]]是同一個商家的檔期、[[rezero-cart-order|結束檔期]]清的是自己的購物車。跨商家的業務動線,一條都沒有。這個觀察是後面每一節的地基。

## 身分與黑名單:劃在哪一級

第一道真正的設計題。同一個 FB 買家會跟十個商家買——[[rezero-identity|#4]] 辛苦建立的身分體系,是十份獨立資料,還是平台級的一份?[[rezero-risk|#13]] 的黑名單更尖銳:**A 商家拉黑的奧客,B 商家看不看得到?**

平台級的誘惑很具體:綁定一次到處能用(客服省 N 倍人工)、黑名單共享等於整個產業的徵信所——甚至可以當賣點。但我的答案是:**租戶級。**

- **客戶關係是商家的資產。**名單、電話、購買史、誰是奧客——這些是商家經營出來的。平台拿 A 的黑名單去保護 B,是拿 A 的資產補貼 A 的競爭對手;商家一旦意識到這件事,對平台的信任就沒了。
- **誤殺會跨租戶放大。**#13 說過,graduated sanctions 的價值是誤殺被結構吸收——在單一商家內,誤鎖一個月是可修復的。平台級連坐把一次誤殺放大成「在整個產業被封殺」,結構吸收不了這種殺傷。
- **法務與隱私**在跨租戶共享個資的那一刻變成完全不同量級的問題。

技術上就是 identity、綁定、banned user 全帶 `tenant_id`;同一個 FB 使用者在兩個商家,是兩份互不相識的身分。平台在底層**有能力**比對(同一個 FB app 的 asid 是同一把),但「能做」與「該做」分開——能力保留,產品不跨。唯一的平台級黑名單,是**對平台本身的攻擊者**(刷 API、打配額的):那是平台自己的資產,平台自己管。

## 尖峰的公平性:淤,要各淤各的

[[rezero-flash-crowd|#14]] 的美德在多租戶下會變成不公平。想像晚間黃金時段:大主播起標,200 則/秒的洪峰灌進 FSM batch;三分鐘後,某個小主播的客人喊了 `2601+1`——這 5 則留言,排在八千則之後。**小商家的客人,在為大商家的成功付延遲。**

單租戶時「淤而不倒」是美德,因為淤的是自己的隊、付的是自己的延遲;多租戶下,**延遲這種貨幣誰付**變成公平問題——而公平就是 SaaS 的 SLA。解法是一道階梯,按規模爬:

1. **per-tenant 隊列+公平消費**:留言按租戶分隊,batch 每輪 round-robin,每租戶每輪最多消化 N 則——大主播的洪峰只淤自己的隊,小主播的 5 則下一輪就處理。改動不大(抓取本來就知道留言屬於誰),買到的是「每個商家的延遲只跟自己的量有關」。
2. **大租戶專屬 worker**:付企業版的大主播,直接給獨立的消費者程序——運算層的 silo。
3. **抓取節奏 per-tenant 自適應**:[[rezero-comment-order|#3]] 的自適應抓取本來就是 per-source 的,天然合身。

一句話總結這節:**隔離不是為了效能,是為了公平。**

## 一顆 Cloud SQL,怎麼長成分散式

工程師最想問的題目:當年那顆 8-core Cloud SQL,怎麼一路長到千個商家?答案是四站,每站有明確的觸發條件——**觸發條件比技術選型重要,因為多數 SaaS 的正確答案是停在早期的站**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 292" role="img" aria-label="資料庫分散化的四站演進。第一站:單機加 tenant id,所有表帶租戶欄位、複合索引打頭,多數 SaaS 的終點站;觸發下一站的條件是連線數、資料量與噪音鄰居,不是感覺。第二站:讀寫分離,replica 吃報表與商城讀流量,買時間。第三站:Pool 加 Silo 混合,小商家共居共享分片,大主播獨立資料庫——同時是噪音鄰居的資料庫層解法與企業版商業分層,單租戶備份還原是殺手優點。第四站:真分片,Citus 類按 tenant id 分片或 NewSQL,誠實地說多數直播代購 SaaS 到不了這站。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="24" y="28" width="256" height="104" rx="7" fill="#1f2330" stroke="#54b890" stroke-width="1.3"/>
    <text x="152" y="48" fill="#54b890" font-size="7.4" text-anchor="middle" font-weight="bold">站 1:單機 + tenant_id</text>
    <text x="152" y="66" fill="#e6e6e6" font-size="6.4" text-anchor="middle">每張表帶 tenant_id・複合索引打頭</text>
    <text x="152" y="80" fill="#9aa4b2" font-size="6.2" text-anchor="middle">多數 SaaS 的終點站</text>
    <text x="152" y="100" fill="#d6a45c" font-size="6.2" text-anchor="middle">往下一站的觸發:連線數、資料量、</text>
    <text x="152" y="112" fill="#d6a45c" font-size="6.2" text-anchor="middle">噪音鄰居——不是「感覺該分散了」</text>
    <rect x="300" y="28" width="256" height="104" rx="7" fill="#1f2330" stroke="#4f6df5" stroke-width="1.3"/>
    <text x="428" y="48" fill="#4f6df5" font-size="7.4" text-anchor="middle" font-weight="bold">站 2:讀寫分離</text>
    <text x="428" y="66" fill="#e6e6e6" font-size="6.4" text-anchor="middle">replica 吃報表・商城讀流量</text>
    <text x="428" y="80" fill="#9aa4b2" font-size="6.2" text-anchor="middle">寫入仍單點,這站買的是時間</text>
    <text x="428" y="100" fill="#d6a45c" font-size="6.2" text-anchor="middle">觸發:讀流量壓過寫、報表打擾交易</text>
    <rect x="24" y="152" width="256" height="120" rx="7" fill="#1f2330" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="152" y="172" fill="#d6a45c" font-size="7.4" text-anchor="middle" font-weight="bold">站 3:Pool + Silo 混合</text>
    <text x="152" y="190" fill="#e6e6e6" font-size="6.4" text-anchor="middle">小商家共居 pool shard・大主播獨立 DB</text>
    <text x="152" y="204" fill="#9aa4b2" font-size="6.2" text-anchor="middle">噪音鄰居的 DB 層解法=企業版分層</text>
    <text x="152" y="218" fill="#9aa4b2" font-size="6.2" text-anchor="middle">per-tenant 備份還原=silo 殺手優點</text>
    <text x="152" y="238" fill="#d6a45c" font-size="6.2" text-anchor="middle">升艙搬家:單商家停機匯出匯入,</text>
    <text x="152" y="250" fill="#d6a45c" font-size="6.2" text-anchor="middle">只影響他自己,約在深夜搬</text>
    <rect x="300" y="152" width="256" height="120" rx="7" fill="#1f2330" stroke="#9b6ff0" stroke-width="1.3"/>
    <text x="428" y="172" fill="#9b6ff0" font-size="7.4" text-anchor="middle" font-weight="bold">站 4:真分片</text>
    <text x="428" y="190" fill="#e6e6e6" font-size="6.4" text-anchor="middle">Citus 類 shard by tenant_id / NewSQL</text>
    <text x="428" y="204" fill="#9aa4b2" font-size="6.2" text-anchor="middle">pool 本身要水平擴的那天才需要</text>
    <text x="428" y="224" fill="#e05a7d" font-size="6.4" text-anchor="middle" font-weight="bold">誠實地說:</text>
    <text x="428" y="238" fill="#e05a7d" font-size="6.2" text-anchor="middle">多數直播代購 SaaS 到不了這站</text>
    <line x1="280" y1="80" x2="300" y2="80" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 296 76 L 302 80 L 296 84 Z" fill="#9aa4b2"/>
    <line x1="428" y1="132" x2="428" y2="140" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="428" y1="140" x2="152" y2="140" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="152" y1="140" x2="152" y2="152" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 148 148 L 152 154 L 156 148 Z" fill="#9aa4b2"/>
    <line x1="280" y1="212" x2="300" y2="212" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 296 208 L 302 212 L 296 216 Z" fill="#9aa4b2"/>
    <text x="290" y="288" fill="#e6e6e6" font-size="7" text-anchor="middle" font-weight="bold">每一站都有觸發條件——沒被觸發,就留在原站;演進是回應,不是興趣</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">從一顆 8-core Cloud SQL 到分散式的四站——多數 SaaS 一輩子只需要前兩站,而這是好事。</figcaption>
</figure>

四站的細節圖上都有,值得展開的是「**分片之後,什麼會壞**」——因為這份清單,恰好是前面十九章紀律的總驗收:

- **跨 shard transaction**:分散式資料庫最貴的東西。而這個系統**幾乎沒有**——快巡那節說了,全部業務都是租戶局部,連身分和黑名單都選了租戶級;把資料按 `tenant_id` 分片後,**每一筆交易天然落在單一 shard 內**。找不到一條需要跨租戶交易的業務,這不是運氣,是 [[rezero-cart-order|3NF]]、[[rezero-payment|事實表]]、[[rezero-identity|身分分層]]累積出來的地形。
- **全域唯一 ID**:DB sequence 跨 shard 就失效,換成 per-tenant 序號或雪花演算法——小改動,但要在分片前改完。
- **fleet migration**:一條 schema migration 要跑 N 顆 DB,需要工具化(逐 shard 滾動、記錄版本)——這是站 3 之後隱形的維運稅。
- **repair loop 天然平行**:[[rezero-inventory|每小時重算]]、[[rezero-asset-lifecycle|每日 sweep]] 這些迴圈全是 per-tenant 的,分片後直接變成 per-shard 平行跑——[[rezero-reconciliation|#16]] 那台「拆開的資料庫」,每個元件都順著租戶的紋理裂開,**拆開的資料庫,比真的資料庫還好分片**。
- **跨租戶的需求只剩平台自己**:營運報表、計費、全平台數據——這些走 ELT 進資料倉儲,別碰交易庫。平台的分析需求和商家的交易需求,從第一天就該是兩條路。

## 容量與成本:這艘船要燒多少錢

工程師的 SaaS 夢,最後都要過這一關:**開多少機器、燒多少錢、收多少才活得下去。**這節用 Fermi 估算走一遍,而我們有一個罕見的奢侈:錨點不是猜的,是[[rezero-flash-crowd|#14]] 的實測。

**錨點(當年實測)**:一個大商家滿載=13,000 人在線、尖峰 200 則/秒,由一台 **e2-custom-8-21504**(8 vCPU、21 GB——當年真實的機型)加一顆 **8-core Cloud SQL** 扛住。牌價量級:VM 約 $200/月、Cloud SQL 約 $400/月——**一個大商家單位(含雜項)約 $700/月**。以下所有數字都建立在這個單位上,假設全部攤開,讀者可以自己換。

**分布假設**:商家大小照 power law——5% 大型(萬人在線)、15% 中型(千人,負載約大型的 1/10)、80% 小型(百人,約 1/100);直播集中在晚間黃金時段,**尖峰同播率抓 30%**。

| 規模 | 尖峰負載(大商家單位) | App VM(e2-8) | DB | 月成本量級 | 每商家攤提 |
|---|---|---|---|---|---|
| 10 商家 | ~0.4 | 2(低消) | pool ×1 | ~$1,000 | ~$100 |
| 100 商家 | ~2.7 | 6 | silo ×5+pool ×3 | ~$5,000 | ~$50 |
| 1,000 商家 | ~22 | 30 | silo ×50+pool ×25 | ~$40,000 | ~$40 |

三個從表裡讀出來的結論,比表本身重要:

1. **每商家攤提成本下降,就是 SaaS 毛利的來源**——但下降得比想像慢,因為 **silo DB 是成本大頭**(1,000 商家那檔,DB 佔掉四分之三)。定價的答案直接寫在成本結構裡:小商家訂閱月費落在 NT$3,000 上下才有健康毛利;大主播的 silo 與專屬 worker,就是企業版加價的成本依據——或者乾脆走 GMV 抽成,讓收入跟著商家的尖峰一起長。[[rezero-permission|#10]] 那個 cost monitor role,在這裡從內部角色升格成 per-tenant 計費表:**#14 說帳單也是攻擊面,這章要補一句——帳單也是商業模式。**
2. **整張表最敏感的參數是同播率**。30% 變 60%(想像週年慶檔期大家都加開),容量需求直接翻倍。單租戶時[[rezero-flash-crowd|商業模式自帶削峰]](口播節奏是天然流控);SaaS 層同一個定理再現一次:**不是所有商家同時開播,才是容量的救贖**——甚至可以做成產品:排播日曆、錯峰開播的折扣,把容量管理賣給商家。
3. 對照當年:整套商城,一台 VM 加一顆 DB,月燒不到一千美金。SaaS 的錢不是花在技術升級,**是花在把「一個商家的奇蹟」複製一千次**。

## 最貴的部分:把內部工具變成產品

以上全是可以估算的成本。真正貴的,是估不出來的這件事。

[[rezero-console|#9]] 寫過這個系統的營運哲學:五種角色五種介面,而「花式需求」的解法是**半成品+admin 補完**——不確定的需求先做一半,剩下靠工程師在 Django admin 裡手動支援。這個模式在單租戶是智慧:介面投資額度=需求確定度,不確定的東西不值得蓋完整介面。

**SaaS 把這個模式直接殺死。**工程師不可能幫 500 個商家跑 admin;「出錯喊一聲」「教學用嘴巴」「權限靠信任」——內部工具的所有隱含前提,都建立在使用者跟開發者同一個屋簷下。變成產品,每一項都要補:self-service 的設定介面、寫給外人看的錯誤訊息、onboarding 流程、文件、[[rezero-permission|#10]] 的 role 模型變成每個租戶自己的權限管理、audit log 變成商家可見的操作紀錄。五種介面全部要從「內部堪用」磨到「外人能自己用」。

這才是人力的大頭。分散式資料庫是**已解問題**——有 Citus、有雲、有四站路線圖照著走;把內部工具磨成產品,**沒有任何現成套件**,只有一個一個介面、一條一條文件地磨。而且它逼你面對一個單租戶時代可以迴避的紀律:每個花式需求都要決定「產品化,或不做」——**admin 那個舒服的中間態,不存在了**。

## 反思

**好拆的系統,是紀律的複利。**這章每個設計題的答案都短得可疑:身分早就分層、業務天然租戶局部、repair loop 天然平行、跨 shard 交易根本不存在。不是 SaaS 好做——是前面十九章把難題提前還完了。**架構的可演進性不是未來的功能,是過去的紀律**;你今天多存一份事實、少物化一個狀態,都是在幫三年後那個要分片的自己。

**商業模式自帶削峰,第二次。**單租戶時,主播的口播節奏是天然流控;SaaS 層,商家的錯峰開播是天然的容量攤平。兩次都是同一課:**容量規劃的第一頁不是機器,是商業模式的形狀**——讀懂它,省下的機器比任何最佳化都多。

**平行世界的意義,不是懊悔,是驗收。**寫完這章我發現一件安靜的事:這艘船的設計圖,其實一直都在——十九章裡的每個決定,身分分層、事實表、租戶局部、拆開的資料庫,都是船的一塊板。船沒有出航,但它撐得起夢想的重量。這句話,寫給當年每一個降薪上船的人。

平行世界到此為止。回到現實線——下一章,終章:**Re:,到底是什麼意思。**
