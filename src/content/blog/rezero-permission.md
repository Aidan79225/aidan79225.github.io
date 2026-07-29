---
title: "權限:誰能按哪顆按鈕——我們改了三次"
date: 2026-07-28
category: tech
description: "營運面第二章,也是誠實的失敗章:Django permission 太細沒語意、塞進 JWT 把錯的粒度固化、轉 role-based 又遇上 role 暴增——最後停在可疊加的 role 組合。乘法變加法的數學第三次救場,以及外包權限的一刀:看得到程式,看不到資料。"
tags:
  - war-story
  - live-commerce
  - authorization
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 10
comments: true
draft: false
---
權限是我自己認證**當年沒做好的部分之一**:改了三次,每次都花了真實的時間,每次都只對了一半。有趣的是,把三次改版排開來看,它剛好走完了權限系統的經典演化路徑——所以這章與其說是懺悔,不如說是幫後人把路標插好。

## 三幕劇:每一步都是局部合理的

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="權限系統的三幕演化。第一幕使用 Django 內建的 group 加 permission,粒度是每個 model 的新增修改刪除檢視——機器的粒度,任務要手動翻譯成一堆表級權限。第二幕花了一週把權限塞進 JWT,結果錯的粒度被固化,token 肥大、改權限要等重新登入。第三幕轉向 role-based,語意對了,但正交維度讓 role 數量暴增。最後落點:新增可疊加的能力 role,例如 cost monitor,一個人等於職能 role 加能力 role,乘法變加法。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rpm" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="16" y="36" width="126" height="96" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="79" y="56" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">第一幕</text>
    <text x="79" y="72" fill="#e6e6e6" font-size="6.8" text-anchor="middle">Django group</text>
    <text x="79" y="84" fill="#e6e6e6" font-size="6.8" text-anchor="middle">+ permission</text>
    <text x="79" y="104" fill="#e05a7d" font-size="6.2" text-anchor="middle">model 級 CRUD</text>
    <text x="79" y="116" fill="#e05a7d" font-size="6.2" text-anchor="middle">機器的粒度,沒語意</text>
    <line x1="142" y1="84" x2="158" y2="84" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rpm)"/>
    <rect x="162" y="36" width="126" height="96" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="225" y="56" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">第二幕(+一週)</text>
    <text x="225" y="72" fill="#e6e6e6" font-size="6.8" text-anchor="middle">把 permission</text>
    <text x="225" y="84" fill="#e6e6e6" font-size="6.8" text-anchor="middle">塞進 JWT</text>
    <text x="225" y="104" fill="#e05a7d" font-size="6.2" text-anchor="middle">錯的粒度被固化</text>
    <text x="225" y="116" fill="#e05a7d" font-size="6.2" text-anchor="middle">改權限=等重登</text>
    <line x1="288" y1="84" x2="304" y2="84" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rpm)"/>
    <rect x="308" y="36" width="126" height="96" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="371" y="56" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">第三幕</text>
    <text x="371" y="72" fill="#e6e6e6" font-size="6.8" text-anchor="middle">轉 role-based</text>
    <text x="371" y="84" fill="#54b890" font-size="6.4" text-anchor="middle">語意終於對了</text>
    <text x="371" y="104" fill="#e05a7d" font-size="6.2" text-anchor="middle">但正交維度一出現</text>
    <text x="371" y="116" fill="#e05a7d" font-size="6.2" text-anchor="middle">role 數量開始暴增</text>
    <line x1="434" y1="84" x2="450" y2="84" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rpm)"/>
    <rect x="454" y="36" width="112" height="96" rx="7" fill="#233528" stroke="#54b890" stroke-width="1.5"/>
    <text x="510" y="56" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">落點</text>
    <text x="510" y="72" fill="#e6e6e6" font-size="6.8" text-anchor="middle">可疊加的</text>
    <text x="510" y="84" fill="#e6e6e6" font-size="6.8" text-anchor="middle">能力 role</text>
    <text x="510" y="104" fill="#54b890" font-size="6.2" text-anchor="middle">cost monitor</text>
    <text x="510" y="116" fill="#54b890" font-size="6.2" text-anchor="middle">乘法變加法</text>
    <text x="290" y="176" fill="#9aa4b2" font-size="7.4" text-anchor="middle">每一步都是局部合理的:用內建的(省時間)→ 塞 JWT(跟無狀態一致)→ 換 role(要語意)</text>
    <text x="290" y="194" fill="#9aa4b2" font-size="7.4" text-anchor="middle">錯不在任何一步,在沒有先問:這個系統的權限,天然的單位是什麼?</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三次改版,每次都對一半:粒度、載體、語意、組合——權限的四個問題被一次一個地踩過去。</figcaption>
</figure>

**第一幕:Django 內建的 group + permission。** 省時間、有文件、跟 admin 整合——起手完全合理。但內建 permission 是 model 級的 add/change/delete/view:它是**機器的粒度**,描述的是資料表。而這個系統的真實語意是**任務**:「助理可以起標」「客服可以清購物車」「營運可以結束檔期」——一個任務橫跨好幾張表、一張表被好幾個任務碰。兩套座標系對不齊,每次授權都在做人肉翻譯,翻譯錯了就是漏權限或多權限。

**第二幕:把 permission 塞進 JWT,花了一週。** 動機也合理——[[rezero-stack|起手式]]說過,這個系統的認證是無狀態的 JWT,權限跟著 token 走,每台 server 獨立驗,漂亮。但塞進去的還是那套錯誤粒度的 permission:token 肥大是小事,真正的成本是**錯的模型被澆了水泥**——之後每次想改粒度,都多一層「token 裡的舊權限怎麼辦」要處理。生效問題倒是務實地解了:改權限等重新登入,因為權限的主體都是內部人員,叫得動、等得起。**權限系統的即時性要求,跟著主體走**——對內部人可以粗,對外部人才需要細。

**第三幕:轉 role-based,然後 role 開始暴增。** 語意終於對了——你是誰,決定你能做什麼。但很快撞上另一堵牆:**正交維度**。這個系統最敏感的資料是**成本**——公司跟廠商的進貨價,誰能看、誰不能看,跟職能完全無關:營運有的要看有的不用、工程師平常不用看。把「能不能看成本」編進 role 名字,role 數量立刻翻倍:營運、能看成本的營運、助理、能看成本的助理⋯⋯每多一個這種維度,再翻一倍。

**落點:新增一個叫 cost monitor 的 role。** 一個只代表單一能力的 role,可以疊加在任何職能 role 上。當年我自嘲「有點又回到 permission 的粒度」——現在我會給它正名:這是 **role 組合(composition)**,而且是正確的落點。

## 乘法變加法——這條數學第三次救場

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 226" role="img" aria-label="role 暴增與 role 組合的對比。左側打叉:把正交維度乘進 role 名字,營運、能看成本的營運、助理、能看成本的助理、客服、能看成本的客服——三個職能乘上一個布林維度就是六個 role,每加一個維度翻一倍。右側打勾:職能 role 三個加上能力 role 一個,例如 cost monitor;一個人的權限等於職能 role 加上零或多個能力 role 的疊加,role 總數是相加不是相乘。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="290" y1="14" x2="290" y2="200" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="145" y="28" fill="#e05a7d" font-size="9" text-anchor="middle" font-weight="bold">✗ 維度乘進名字:M × 2ᴺ</text>
    <rect x="36" y="44" width="100" height="22" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="86" y="59" fill="#e6e6e6" font-size="6.6" text-anchor="middle">營運</text>
    <rect x="150" y="44" width="110" height="22" rx="5" fill="#3a2632" stroke="#e05a7d" stroke-width="1"/><text x="205" y="59" fill="#e05a7d" font-size="6.6" text-anchor="middle">營運+看成本</text>
    <rect x="36" y="76" width="100" height="22" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="86" y="91" fill="#e6e6e6" font-size="6.6" text-anchor="middle">助理</text>
    <rect x="150" y="76" width="110" height="22" rx="5" fill="#3a2632" stroke="#e05a7d" stroke-width="1"/><text x="205" y="91" fill="#e05a7d" font-size="6.6" text-anchor="middle">助理+看成本</text>
    <rect x="36" y="108" width="100" height="22" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="86" y="123" fill="#e6e6e6" font-size="6.6" text-anchor="middle">客服</text>
    <rect x="150" y="108" width="110" height="22" rx="5" fill="#3a2632" stroke="#e05a7d" stroke-width="1"/><text x="205" y="123" fill="#e05a7d" font-size="6.6" text-anchor="middle">客服+看成本</text>
    <text x="145" y="158" fill="#e05a7d" font-size="7" text-anchor="middle">每多一個正交維度,全部翻倍</text>
    <text x="145" y="172" fill="#9aa4b2" font-size="6.6" text-anchor="middle">再來一個「能看個資」就是 12 個 role</text>
    <text x="435" y="28" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">✓ 維度獨立疊加:M + N</text>
    <text x="365" y="52" fill="#9aa4b2" font-size="6.8" text-anchor="middle">職能 role</text>
    <rect x="320" y="60" width="90" height="22" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="365" y="75" fill="#e6e6e6" font-size="6.6" text-anchor="middle">營運</text>
    <rect x="320" y="88" width="90" height="22" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="365" y="103" fill="#e6e6e6" font-size="6.6" text-anchor="middle">助理</text>
    <rect x="320" y="116" width="90" height="22" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="365" y="131" fill="#e6e6e6" font-size="6.6" text-anchor="middle">客服</text>
    <text x="500" y="52" fill="#9aa4b2" font-size="6.8" text-anchor="middle">能力 role(可疊加)</text>
    <rect x="450" y="60" width="100" height="22" rx="11" fill="#233528" stroke="#54b890" stroke-width="1.3"/><text x="500" y="75" fill="#54b890" font-size="6.6" text-anchor="middle">cost monitor</text>
    <text x="500" y="106" fill="#9aa4b2" font-size="6.4" text-anchor="middle">(未來:pii viewer …)</text>
    <text x="435" y="160" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">一個人 = 職能 role + 零或多個能力 role</text>
    <text x="435" y="175" fill="#9aa4b2" font-size="6.6" text-anchor="middle">role 總數相加,不相乘</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">正交的東西不要乘進名字裡——讓它們獨立存在、自由疊加。</figcaption>
</figure>

如果你從第一篇追到現在,這個數學應該眼熟:多平台留言用 adapter 收斂是 [[rezero-comment-order|M×N→M+N]]、可觀測性的 [[obs-collection|collector]] 是 M×N→M+N——**權限也是**。正交的東西乘進名字裡,組合數就爆炸;讓它們獨立存在、自由疊加,總數就只是相加。順帶一提,[[k8s-rbac|Kubernetes 的 RBAC]] 走的是同一條路:role 只能疊加、沒有 deny——業界最後都收斂到加法,因為乘法在數學上就輸了。

## 外包的邊界:看得到程式,看不到資料

權限這章有一刀當年劃得很乾脆:**外包工程師用 GitHub 的權限管 repo,但 GCP 一概不給——碰不到正式環境、碰不到資料**。協作需要的是程式碼;而營業的秘密(成本、客戶、訂單)全在資料裡。這條線跟 [[rezero-fulfillment|出貨章]]的資訊流/實體流分界是同一種思路:**邊界劃在違約成本的斷面上**。程式碼外流有 license 和法務兜底,資料外流是生意直接受傷——一刀切開,連灰色地帶都不留。

## 重來會怎麼做

權限是那種很難「第一天就做對」的東西——day 1 就上完整的 RBAC+ABAC 是過度設計,day N 才補又是三次改版。重來我不追求一步到位,追求**讓改版便宜**:

1. **權限判斷的家,在 use case 的入口。** 用 Clean Architecture 的語言說:授權是**應用層的業務規則**——「助理可以起標」描述的不是資料表(所以不在 entity/ORM)、也不是 HTTP(所以不在 controller),是**這個任務本身允許誰做**;而任務的程式化身就是 use case。所以 enforcement point 收斂在 use case 的邊界:每個 use case 宣告誰能呼叫它,進門先問 `can(user, this_use_case, resource)`。這個選擇跟本章的結論互相鎖定——權限的正確粒度=任務=use case,**role 就是一組 use case 的集合**,權限模型和程式結構從此說同一種語言。外圈可以留一道 middleware 粗篩(登入了嗎、有沒有基本 role)當縱深防禦,但那只是快速失敗的禮貌;前端藏按鈕更只是體驗——**作準的永遠是 use case 入口**,因為只有它擋得住「換個入口重打同一個操作」。兩個特例:資源歸屬(只能動自己的購物車)要載入 entity 才判得了,就在 use case 內部、拿到資料後判;欄位可見性(成本)的**決策在 use case、執行在 presenter**——沒授權的欄位在資料出門前剝掉。當年三次改版之所以貴,一半的成本花在權限判斷散落各處——收斂到 use case 邊界後,permission 換 role、role 換組合,都只動一層。
2. **第一天就用「職能+能力」的雙軌 role。** 職能 role 對齊[[rezero-console|五組介面]](上一章說過:介面切法=權限模型,兩者描述的都是「誰在做什麼」);敏感能力(成本、個資)從第一天就是獨立可疊加的 role——不是預測未來,是承認「正交維度一定會出現」這個規律。
3. **JWT 裡只放 role 名單。** 幾個字串,token 不肥;role 到權限的展開放在 server 側,改權限的生效速度就不被 token 綁架——重登只在 role 本身變動時需要。
4. **敏感資料的存取留 audit。** 誰在什麼時候看了成本——這不是不信任,是讓「圍住最貴的東西」有證據可查。

拿最常見的場景把第 1 則落地——get product API,成本欄位只給 cost monitor(Django Ninja):

```python
from ninja import Router, Schema

router = Router()

class ProductOut(Schema):
    id: int
    name: str
    price: int                      # 售價:人人可看

class ProductWithCostOut(ProductOut):
    cost: int                       # 成本:只有 cost monitor 看得到

@router.get("/products/{product_id}",
            response=ProductWithCostOut | ProductOut)   # 較寬的 schema 放前面
def get_product(request, product_id: int):
    # use case:歸屬與資格在這裡判(單一 enforcement point)
    product, caps = get_product_use_case(request.auth, product_id)

    # presenter:依 use case 給的資格選 schema——執行只是挑一個出口
    if "cost_monitor" in caps:
        return ProductWithCostOut.from_orm(product)
    return ProductOut.from_orm(product)
```

兩個細節是刻意的:**用兩個 schema,而不是同一個 schema 塞 `null`**——`"cost": null` 也是洩漏,它告訴對方「有這個欄位存在」;沒資格的人拿到的 JSON 裡,成本這個 key **根本不存在**。以及**判斷在 use case、view 只挑出口**——view 層拿到的 `caps` 是 use case 給的結論,它自己不做任何權限推理,換權限模型時這段程式碼一行都不用動。

## 反思

### 摩擦型的債,沒有催收機制

超賣會爆炸、金流會爆炸——它們的債有利息、有催收,你不還就出事。權限做錯了不爆炸,它只**摩擦**:每次授權多五分鐘、每個新人多問一輪、每個需求多繞一下。沒有告警、沒有事故報告,永遠排不進 sprint——直到某天有人受不了,才發現大家已經各自難受很久了。我後來的判準:**當一個內部流程人人抱怨、卻永遠沒人排期修它,那就是摩擦債**——它不會自己浮上來,要有人固定去撈。

### 粒度的標準不是安全,是語意

三次改版繞的其實是同一個問題:權限的**單位**該多大。太細(model 級)沒有語意,授權變翻譯;太粗(一顆 is_admin)沒有邊界,授權變賭注。正確的粒度只有一個標準:**使用它的人開口說話的單位**。營運說的是「她要能結檔期」、老闆說的是「他不能看成本」——role 和能力,就是這些句子的名詞。權限模型做得好不好,測試方法很簡單:把授權需求用一句人話說出來,看系統能不能一對一翻譯——翻譯要加註解的,就是模型錯了。

### 沒做好,但沒出事——為什麼

誠實說完彎路,也要誠實回答一個問題:改了三次的權限系統,為什麼從來沒出過事?因為**最貴的東西從第一天就圍好了**——成本可見性有專門管制、外包碰不到資料、主體全是內部人員。權限模型的優雅與否,影響的是摩擦;**資產有沒有圍好,影響的才是存亡**。這給我的排序啟示是:先用最笨的方式把最貴的資料圍死,再慢慢優化模型的優雅度——反過來做的團隊,模型漂亮,然後在某次外包交接時把成本表整包送出去。
