---
title: "上傳容易,刪除難:圖片與資源的生命週期"
date: 2026-08-01
category: tech
description: "商品圖從直播截圖貼進 dialog 開始:前端切圖轉 webp 是優化,後端一律重編碼是保證——轉檔即驗證;image_metadata 的雙向引用、每日 sweep、一張從沒理賠過的保險單;以及我親手寫出來的 bug 產生器 SoftDeleteModel——上傳只要一個下午,刪除是一輩子的事。"
tags:
  - war-story
  - live-commerce
  - system-design
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 17
comments: true
draft: false
---
橫切這一批的最後,插一個看起來最不起眼的題目:**商品圖**。「不就是上傳檔案嗎」——這章會用一半的篇幅講上傳,另一半講一件難得多的事:**刪除**。上傳只要一個下午就能做完;刪除,是一輩子的事。

## 生:一條為現場設計的上傳管線

先看這條管線的真實使用場景,因為整條設計都是從它長出來的。[[rezero-console|#9]] 說過,直播現場操作平台的是助理——同一個人同時在操控直播設定。商品圖哪裡來?**看直播截圖,貼進我們前端的 dialog,確認,上傳。**主播拿著貨在鏡頭前講,助理把畫面截下來,Ctrl+V,商品圖就有了——**商品圖的來源,就是直播本身**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="圖片上傳管線。直播現場:助理看直播截圖、貼進 dialog;前端:切正方形、轉 webp,標注為優化,為了體驗與頻寬;後端:一律重編碼,webp 進來也重編,並做出 thumbnail,標注為保證,原始 bytes 不落地,轉檔即驗證;最後存進 GCS 原圖加縮圖兩檔,並在資料庫寫入 image_metadata。底部標注:資料庫存 path 是事實,API 回應時解出 URL 是派生,實際供圖走 GCS 掛 CDN。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="24" y="40" width="120" height="64" rx="6" fill="#1f2330" stroke="#e05a7d" stroke-width="1.2"/>
    <text x="84" y="60" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">直播現場</text>
    <text x="84" y="76" fill="#e6e6e6" font-size="6.4" text-anchor="middle">助理看直播截圖</text>
    <text x="84" y="90" fill="#9aa4b2" font-size="6.4" text-anchor="middle">貼進 dialog、確認</text>
    <line x1="144" y1="72" x2="166" y2="72" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 162 68 L 168 72 L 162 76 Z" fill="#9aa4b2"/>
    <rect x="168" y="40" width="120" height="64" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="228" y="60" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">前端:優化</text>
    <text x="228" y="76" fill="#e6e6e6" font-size="6.4" text-anchor="middle">切正方形・轉 webp</text>
    <text x="228" y="90" fill="#9aa4b2" font-size="6.4" text-anchor="middle">為了體驗與頻寬</text>
    <line x1="288" y1="72" x2="310" y2="72" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 306 68 L 312 72 L 306 76 Z" fill="#9aa4b2"/>
    <rect x="312" y="40" width="130" height="64" rx="6" fill="#1f2330" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="377" y="60" fill="#4f6df5" font-size="7" text-anchor="middle" font-weight="bold">後端:保證</text>
    <text x="377" y="76" fill="#e6e6e6" font-size="6.4" text-anchor="middle">一律重編碼+thumbnail</text>
    <text x="377" y="90" fill="#9aa4b2" font-size="6.4" text-anchor="middle">原始 bytes 不落地</text>
    <line x1="442" y1="72" x2="464" y2="72" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 460 68 L 466 72 L 460 76 Z" fill="#9aa4b2"/>
    <rect x="466" y="40" width="90" height="64" rx="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="511" y="60" fill="#d6a45c" font-size="7" text-anchor="middle" font-weight="bold">GCS</text>
    <text x="511" y="76" fill="#e6e6e6" font-size="6.4" text-anchor="middle">原圖+縮圖</text>
    <text x="511" y="90" fill="#9aa4b2" font-size="6.4" text-anchor="middle">兩檔</text>
    <text x="377" y="122" fill="#4f6df5" font-size="6.8" text-anchor="middle" font-weight="bold">轉檔即驗證:解不開的檔,轉檔自己失敗</text>
    <rect x="168" y="140" width="274" height="30" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/>
    <text x="305" y="159" fill="#e6e6e6" font-size="6.8" text-anchor="middle">image_metadata:path・content type・object id</text>
    <line x1="377" y1="104" x2="377" y2="140" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="290" y="196" fill="#9aa4b2" font-size="6.8" text-anchor="middle">DB 存 path(事實);API 回應時解出 URL(派生)——實際供圖走 GCS 掛 CDN</text>
    <text x="290" y="216" fill="#9aa4b2" font-size="6.8" text-anchor="middle">前端的處理是優化,後端的處理是保證</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">整條管線為「直播現場、剪貼簿貼圖」量身訂做:截圖任意長寬比所以切正方形,現場頻寬珍貴所以先轉 webp,貼上的東西不可信所以一律重編碼。</figcaption>
</figure>

前後端各做一次 webp 處理,乍看重工,其實是兩件完全不同的事:

**前端切正方形、轉 webp,是優化**——截圖的長寬比什麼都有,切成正方形版面才好排;現場頻寬珍貴,webp 先壓一輪,上傳快、體驗好。但前端做的一切都可以被繞過,所以——

**後端不信前端,一律重編碼,是保證**。這章動筆前我回去查了當年的程式碼:**webp 進來也重編碼一次**,原始上傳的 bytes 一律不落地。這個設計比它看起來深:檔案驗證是一把梯子——驗副檔名、驗宣告的 Content-Type、驗魔術數字、真正解碼、重新編碼——越往上越強,而**重編碼是最強的一層**:解不開的檔,轉檔自己就失敗;能活過 decode+encode 的,必然是一張真的圖;藏在檔案裡的 payload、夾帶的 EXIF,全部在重編碼時銷毀。

我們沒有寫任何一條「檢查檔案是否安全」的 if。驗證不是流程前的關卡,**是正常流程的副產品**——跟 [[rezero-comment-order|#3]] 的「查詢即驗證」(解析出來的 key 查不到 DB 就自然丟棄)是同一個哲學:**轉檔即驗證**。

最後一個小而美的細節:DB 裡存的是 **path(事實)**,API 回應時才把它解成完整的 **URL(派生)**——實際供圖走 GCS 掛 CDN。哪天換 CDN、換 bucket,改一行解析邏輯,零筆 migration。[[rezero-flash-crowd|#14]] 說過商品圖靠 CDN 扛,所以尖峰時 DB 硬扛的只有列表 API——供圖這條路,從第一天就不經過我們的機器。

## 活:一張表,和一張從沒理賠過的保險單

圖存好了,誰記得它?**`image_metadata`**:存 GCS path,加上 content type + object id——[[rezero-cart-order|泛型外鍵]]在這個系統的**第四次登場**(購物車來源、[[rezero-risk|黑名單]]、留言溯源之後)。同時 product 和 style 也直接存 image_metadata 的 id。

注意這是**雙向引用**,而兩個方向的存在理由完全不同:**正向**(product → image)是為了讀取服務,每次出商品資料都在用;**反向**(image → 擁有者)只為一件事——**清理**。GCS 不在資料庫的管轄範圍裡,外鍵約束保護不了它;這張表等於把 FK 的紀律**手動延伸到 blob storage 上**——[[rezero-reconciliation|拆開的資料庫]]又補回了一塊:DB 有 pg 自己管的 TOAST 與 vacuum,我們的「大物件」在 GCS,就得自己記帳、自己回收。

那反向引用實際用了嗎?誠實時間:**沒有。**「從 image_metadata 反查 product/style 是否還在用」這條查詢,從來沒被寫出來。它是一張**從沒理賠過的保險單**——投保的理由千真萬確,理賠的那天永遠沒來。

## 死(一):每日 sweep

那清理是怎麼跑的?真實機制比我原本記的更簡單,也更有意思:

1. 助理**換圖**時,系統把舊的 image_metadata **標記待刪除**。
2. **每日排程** sweep:把標記過的,**真的刪掉 GCS 物件、清掉 metadata**。

用垃圾回收的語言說:這不是掃描全局找活引用的 tracing GC,是**變更當下就知道誰死了的墓碑機制**——換圖的瞬間,舊圖的死亡是確定的事實,直接標記;每日 sweep 只負責執行,不負責判斷。判斷(反查還有沒有人用)理論上該有,實際上漏了——但**沒出過事**。

為什麼沒出事?因為**刪除的入口只有一個**:換圖。唯一會標記待刪除的地方,就是明確知道舊圖已被取代的地方,標記永遠是對的,反查自然多餘。[[rezero-reconciliation|上一章]]的句式又出現了:「不做,是因為結構讓它不必做」——但這次我要補一個 but:**這是僥倖版**。上一章的「不必做」是設計出來的(冗餘被刻意壓掉);這裡的「不必做」只是恰好成立——哪天多了第二個刪除入口(批次匯入、商品複製、後台清理工具),沒有反查的 sweep 就會開始誤殺。重來版一行結論:**sweep 前反查一次**,一條便宜的 query,把僥倖升級成保證。

## 死(二):我親手寫的 bug 產生器

資源的死講完了,講資料的死——**軟刪除**。這段是我的誠實失敗,源頭就是我寫的。

當年我定義了一個 `SoftDeleteModel`:加一個 `is_deleted` 欄位,配一個自訂 manager——`actived`、`deleted` 兩個 method,**預設 queryset 只回傳 actived**,原本的 `objects` 改名叫 `all_objects`。然後,**全部 model 都繼承它**。用起來很舒服:每個查詢自動濾掉已刪的,乾淨。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 270" role="img" aria-label="SoftDeleteModel 的崩壞鏈,五步。第一步:定義 SoftDeleteModel,is_deleted 欄位加預設只回傳 actived 的 queryset,objects 改名 all_objects,全部 model 繼承。第二步:某天要加 deleted_at,但改 base model 會動到全部 model。第三步:部分 model 取消繼承,隱式與顯式開始混用。第四步:每個呼叫點都要先判斷這個 model 是哪一派,心智負擔太重,工程師乾脆一律用 all_objects。第五步:忘記濾 is_deleted 的 bug 開始出現,bug 產生器誕生。底部:病根是 objects 說謊——它不再是 all。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="40" y="20" width="500" height="34" rx="6" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="290" y="34" fill="#e6e6e6" font-size="6.8" text-anchor="middle">定義 SoftDeleteModel:is_deleted+預設 queryset 只回 actived,objects 變 all_objects</text>
    <text x="290" y="48" fill="#4f6df5" font-size="6.6" text-anchor="middle">全部 model 都繼承——用起來很乾淨</text>
    <line x1="290" y1="54" x2="290" y2="68" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 286 64 L 290 70 L 294 64 Z" fill="#9aa4b2"/>
    <rect x="40" y="70" width="500" height="30" rx="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="290" y="89" fill="#e6e6e6" font-size="6.8" text-anchor="middle">某天想加 deleted_at——但改 base model 會動到全部 model</text>
    <line x1="290" y1="100" x2="290" y2="114" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 286 110 L 290 116 L 294 110 Z" fill="#9aa4b2"/>
    <rect x="40" y="116" width="500" height="30" rx="6" fill="#1f2330" stroke="#e0733a" stroke-width="1.2"/>
    <text x="290" y="135" fill="#e6e6e6" font-size="6.8" text-anchor="middle">部分 model 取消繼承 → 隱式過濾與顯式過濾開始混用</text>
    <line x1="290" y1="146" x2="290" y2="160" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 286 156 L 290 162 L 294 156 Z" fill="#9aa4b2"/>
    <rect x="40" y="162" width="500" height="30" rx="6" fill="#3a2632" stroke="#e05a7d" stroke-width="1.2"/>
    <text x="290" y="181" fill="#e6e6e6" font-size="6.8" text-anchor="middle">每個呼叫點都要先判斷這個 model 是哪一派 → 乾脆一律用 all_objects</text>
    <line x1="290" y1="192" x2="290" y2="206" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 286 202 L 290 208 L 294 202 Z" fill="#9aa4b2"/>
    <rect x="40" y="208" width="500" height="30" rx="6" fill="#3a2632" stroke="#e05a7d" stroke-width="1.6"/>
    <text x="290" y="227" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">忘記濾 is_deleted 的 bug 開始出現——bug 產生器誕生</text>
    <text x="290" y="258" fill="#9aa4b2" font-size="7" text-anchor="middle">病根只有一個:objects 說謊——它不再是 all</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">崩壞不是從 bug 開始的,是從「想加一個欄位卻改不動 base model」開始的——魔法的帳單,在混用的那天寄到。</figcaption>
</figure>

崩壞鏈如圖。有一天我們想記錄 `deleted_at`,但改 base model 會動到全部 model——於是部分 model 取消繼承,**隱式和顯式開始混用**。從此每個呼叫點都要先想一下:「這個 model 是哪一派?要不要用 `all_objects`?要不要自己濾?」心智負擔一天天加重,工程師的理性選擇是收斂到一個不用想的統一解:**一律用 `all_objects`**——安全,不會漏資料。然後,忘記補濾 `is_deleted` 的查詢開始出現。**bug 產生器**,是我對它的蓋棺定論。

病根不在崩壞鏈的任何一步,在第一天:**`objects` 說謊**。它的名字承諾「所有物件」,行為卻是「未刪除的物件」——每個信了這句謊的呼叫點都埋著一顆雷,而混用只是把雷接上引信。半套抽象比沒有抽象更貴:全隱式或全顯式都能活,**混用讓每個呼叫點多付一次判斷**,而人在重複判斷面前一定會找捷徑,捷徑一定選錯邊。[[rezero-permission|#10]] 的權限三幕劇是同款結構——框架的魔法被半用,比不用更痛。

## 重來:讓每一種死法名正言順

重來版三條,全部是「顯式」的變奏:

**一、欄位存事實,不存旗標。**`deleted_at`(nullable timestamp),不要 `is_deleted`。「刪了沒」是 `deleted_at IS NOT NULL` 派生出來的;「何時刪的」第一天就有答案——當年想補 `deleted_at` 補不進去的那場崩壞,根本不會發生。事實 append、狀態派生,[[rezero-payment|這條系列鐵律]]連刪除欄位都適用。

**二、共用 QuerySet,不共用 base model;`objects` 永遠誠實。**

```python
class SoftDeleteQuerySet(models.QuerySet):
    def active(self) -> "SoftDeleteQuerySet":
        return self.filter(deleted_at__isnull=True)

    def deleted(self) -> "SoftDeleteQuerySet":
        return self.filter(deleted_at__isnull=False)


class Product(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True)  # 欄位顯式宣告在每個 model
    objects = SoftDeleteQuerySet.as_manager()                 # objects 不說謊:預設=全部

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["keyword"],
                condition=Q(deleted_at__isnull=True),   # 軟刪過的 row 不佔住唯一鍵
                name="uniq_active_keyword",
            ),
        ]
```

規則只剩一條:`objects` 永遠是全部,要濾就寫 `.active()`——每個呼叫點顯式、可 grep、不用判斷。**繼承共用的是政策,組合共用的才是機制**:機制(QuerySet 方法)大家共用,事實(欄位)每個 model 自己宣告,之後想加 `deleted_by`,加的人自己加,誰也不動誰。附帶的條件式 unique constraint 是隱藏坑的疫苗:沒有它,軟刪過的 keyword 會永遠佔住唯一鍵,同名商品再也建不回來。

**三、軟刪除是 per-table 的政策,不是全域的預設。**「全部 model 都繼承」這個決定,比 manager 怎麼寫更早出錯。這個系統的資料天然分三類,每類有自己名正言順的死法:

| 資料的角色 | 死法 | 例子 |
|---|---|---|
| **事實** | 永不刪——沒有「刪除」這回事 | order、orders payment、配貨紀錄 |
| **被事實引用的主資料** | 軟刪——硬刪會斷歷史 | product、style、image_metadata |
| **暫態** | 硬刪——理直氣壯地清 | 購物車項目 |

有趣的是,當年的行為早就照這張表在走:[[rezero-cart-order|結束檔期]]清購物車是理直氣壯的硬刪,訂單從來沒有人敢刪——只是 base model 把三類強行拉平成一種。需要軟刪的表,數下來五六張,顯式宣告一點都不累。

## 反思

**上傳是功能,刪除是責任。**上傳的程式一個下午寫完,demo 完美,上線歡呼;但從按下上傳那一刻起,每一個 byte 都開始計費、每一筆引用都可能斷、每一張圖都終將面對「還有人要你嗎」的一天。做上傳功能時就把刪除想清楚的人很少——我們算半個:表建了、反查卻沒寫。資源的生命週期不是「上傳成功」就結束,**是從那一刻才開始**。

**最好的驗證,是沒有驗證關卡。**轉檔即驗證、查詢即驗證——這個系統最強韌的兩道防線,都不是 if 寫出來的,是把「必經流程」設計成天然的過濾器。關卡會被繞過、會忘了加、會跟主流程漂移;副產品不會,因為它就是主流程。

**隱式是借來的方便。**`objects` 自動濾掉已刪的那種舒服,是跟未來借的——利息在混用的那天開始計,由每個呼叫點的判斷成本分期支付,最後用 bug 一次結清。顯式多打七個字(`.active()`),買斷的是永遠不用再判斷。這條教訓值多少?值一個「bug 產生器」的蓋棺定論,和一章的篇幅。

第五批到此收工:尖峰、維運、對帳、生命週期,橫切的仗打完了。接下來是演進弧的開場,也是全系列規模最大的一次動刀——**拆與不拆:monolith 到三個微服務**。
