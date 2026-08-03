# Day 15|權限:誰能按哪顆按鈕——我們改了三次

權限是我自己認證**當年沒做好的部分之一**:改了三次,每次都花了真實的時間,每次都只對了一半。有趣的是,把三次改版排開來看,它剛好走完了權限系統的經典演化路徑——所以這章與其說是懺悔,不如說是幫後人把路標插好。

## 三幕劇:每一步都是局部合理的

![三次改版,每次都對一半:粒度、載體、語意、組合——權限的四個問題被一次一個地踩過去。](day15-1.png)

**第一幕:Django 內建的 group + permission。** 省時間、有文件、跟 admin 整合——起手完全合理。但內建 permission 是 model 級的 add/change/delete/view:它是**機器的粒度**,描述的是資料表。而這個系統的真實語意是**任務**:「助理可以起標」「客服可以清購物車」「營運可以結束檔期」——一個任務橫跨好幾張表、一張表被好幾個任務碰。兩套座標系對不齊,每次授權都在做人肉翻譯,翻譯錯了就是漏權限或多權限。

**第二幕:把 permission 塞進 JWT,花了一週。** 動機也合理——起手式說過,這個系統的認證是無狀態的 JWT,權限跟著 token 走,每台 server 獨立驗,漂亮。但塞進去的還是那套錯誤粒度的 permission:token 肥大是小事,真正的成本是**錯的模型被澆了水泥**——之後每次想改粒度,都多一層「token 裡的舊權限怎麼辦」要處理。生效問題倒是務實地解了:改權限等重新登入,因為權限的主體都是內部人員,叫得動、等得起。**權限系統的即時性要求,跟著主體走**——對內部人可以粗,對外部人才需要細。

**第三幕:轉 role-based,然後 role 開始暴增。** 語意終於對了——你是誰,決定你能做什麼。但很快撞上另一堵牆:**正交維度**。這個系統最敏感的資料是**成本**——公司跟廠商的進貨價,誰能看、誰不能看,跟職能完全無關:營運有的要看有的不用、工程師平常不用看。把「能不能看成本」編進 role 名字,role 數量立刻翻倍:營運、能看成本的營運、助理、能看成本的助理⋯⋯每多一個這種維度,再翻一倍。

**落點:新增一個叫 cost monitor 的 role。** 一個只代表單一能力的 role,可以疊加在任何職能 role 上。當年我自嘲「有點又回到 permission 的粒度」——現在我會給它正名:這是 **role 組合(composition)**,而且是正確的落點。

## 乘法變加法——這條數學第三次救場

![正交的東西不要乘進名字裡——讓它們獨立存在、自由疊加。](MISSING.png)

如果你從第一篇追到現在,這個數學應該眼熟:多平台留言用 adapter 收斂是 M×N→M+N、可觀測性的 collector 是 M×N→M+N——**權限也是**。正交的東西乘進名字裡,組合數就爆炸;讓它們獨立存在、自由疊加,總數就只是相加。順帶一提,Kubernetes 的 RBAC 走的是同一條路:role 只能疊加、沒有 deny——業界最後都收斂到加法,因為乘法在數學上就輸了。

## 外包的邊界:看得到程式,看不到資料

權限這章有一刀當年劃得很乾脆:**外包工程師用 GitHub 的權限管 repo,但 GCP 一概不給——碰不到正式環境、碰不到資料**。協作需要的是程式碼;而營業的秘密(成本、客戶、訂單)全在資料裡。這條線跟 出貨章的資訊流/實體流分界是同一種思路:**邊界劃在違約成本的斷面上**。程式碼外流有 license 和法務兜底,資料外流是生意直接受傷——一刀切開,連灰色地帶都不留。

## 重來會怎麼做

權限是那種很難「第一天就做對」的東西——day 1 就上完整的 RBAC+ABAC 是過度設計,day N 才補又是三次改版。重來我不追求一步到位,追求**讓改版便宜**:

1. **權限判斷的家,在 use case 的入口。** 用 Clean Architecture 的語言說:授權是**應用層的業務規則**——「助理可以起標」描述的不是資料表(所以不在 entity/ORM)、也不是 HTTP(所以不在 controller),是**這個任務本身允許誰做**;而任務的程式化身就是 use case。所以 enforcement point 收斂在 use case 的邊界:每個 use case 宣告誰能呼叫它,進門先問 `can(user, this_use_case, resource)`。這個選擇跟本章的結論互相鎖定——權限的正確粒度=任務=use case,**role 就是一組 use case 的集合**,權限模型和程式結構從此說同一種語言。外圈可以留一道 middleware 粗篩(登入了嗎、有沒有基本 role)當縱深防禦,但那只是快速失敗的禮貌;前端藏按鈕更只是體驗——**作準的永遠是 use case 入口**,因為只有它擋得住「換個入口重打同一個操作」。兩個特例:資源歸屬(只能動自己的購物車)要載入 entity 才判得了,就在 use case 內部、拿到資料後判;欄位可見性(成本)的**決策在 use case、執行在 presenter**——沒授權的欄位在資料出門前剝掉。當年三次改版之所以貴,一半的成本花在權限判斷散落各處——收斂到 use case 邊界後,permission 換 role、role 換組合,都只動一層。
2. **第一天就用「職能+能力」的雙軌 role。** 職能 role 對齊五組介面(上一章說過:介面切法=權限模型,兩者描述的都是「誰在做什麼」);敏感能力(成本、個資)從第一天就是獨立可疊加的 role——不是預測未來,是承認「正交維度一定會出現」這個規律。
3. **JWT 裡只放 role 名單。** 幾個字串,token 不肥;role 到權限的展開放在 server 側,改權限的生效速度就不被 token 綁架——重登只在 role 本身變動時需要。
4. **敏感資料的存取留 audit。** 誰在什麼時候看了成本——這不是不信任,是讓「圍住最貴的東西」有證據可查。

拿最常見的場景把上面四則一次落地——get product API,成本只給 cost monitor。先講回應的形狀:直覺寫法是繼承(`ProductWithCostOut(ProductOut)`),但維度一多,schema 數量就是 2^N——**把能力乘進型別名字,跟把維度乘進 role 名字是同一個錯**。加法版是 **base + 可疊加的 section**,跟能力 role 同構。

先把權限模型本身寫完——它小到只有幾個型別、一張表、一個函式:

```python
from dataclasses import dataclass
from enum import StrEnum


class Role(StrEnum):
    OPERATOR = "operator"                  # 職能 role
    ASSISTANT = "assistant"
    COST_MONITOR = "cost_monitor"          # 能力 role,可疊加


class Capability(StrEnum):
    SEE_COST = "see_cost"                  # use case 的輸出資格,view 只認識這個


@dataclass(frozen=True)
class Principal:
    account_id: int
    roles: frozenset[Role]                 # JWT 解出來的全部內容,就這麼小

    def has_role(self, role: Role) -> bool:
        return role in self.roles


class PermissionDenied(Exception):
    pass


# 「role 是一組 use case 的集合」——這句話直接長成資料結構。
# 全系統的授權真相只有這張表(活在 composition root,匯入所有 use case)。
ROLE_USE_CASES: dict[Role, frozenset[type]] = {
    Role.OPERATOR:     frozenset({GetProductUseCase, EndPeriodUseCase}),
    Role.ASSISTANT:    frozenset({GetProductUseCase, StartBiddingUseCase}),
    Role.COST_MONITOR: frozenset(),        # 能力 role 不開任何門,只給資格
}


def require(principal: Principal, use_case: type) -> None:
    if not any(use_case in ROLE_USE_CASES[r] for r in principal.roles):
        raise PermissionDenied(f"{principal.account_id} cannot {use_case.__name__}")
```

注意這裡**沒有 AuthorizationService**——權限檢查不需要一個 service:role 清單躺在 `Principal` 上(entity 自己的資料)、role 對 use case 的映射是一張常數表、`require` 是一個純函式。想把它包成 service 的衝動,多半來自權限判斷散落各處的年代;收斂到 use case 邊界之後,它小得不值得一個 class。

use case 本體只依賴兩個 port,用 injector 注入(這也是當年整個 codebase 的真實方言):

```python
from typing import Protocol

from injector import inject


class ProductRepository(Protocol):         # port:use case 只依賴介面
    def get(self, product_id: int) -> Product: ...


class AuditLog(Protocol):
    def viewed_cost(self, principal: Principal, product_id: int) -> None: ...


@dataclass(frozen=True)
class GetProductResult:
    product: Product
    capabilities: frozenset[Capability]


class GetProductUseCase:
    @inject
    def __init__(self, products: ProductRepository, audit: AuditLog) -> None:
        self._products = products
        self._audit = audit

    def execute(self, principal: Principal, product_id: int) -> GetProductResult:
        require(principal, type(self))                      # enforcement point:進門先驗

        product = self._products.get(product_id)

        caps: set[Capability] = set()
        if principal.has_role(Role.COST_MONITOR):           # role → 資格的翻譯只發生在這裡
            caps.add(Capability.SEE_COST)
            self._audit.viewed_cost(principal, product_id)  # 敏感存取留痕(第 4 則)

        return GetProductResult(product=product, capabilities=frozenset(caps))
```

再看 view——它是 presenter,只挑出口:

```python
from django.http import HttpRequest
from ninja import Router, Schema


class CostSection(Schema):
    cost: int
    margin: float


class ProductOut(Schema):
    id: int
    name: str
    price: int
    cost_info: CostSection | None = None   # 能力 section:一個能力一塊


router = Router()


@router.get("/products/{product_id}", response=ProductOut, exclude_none=True)
def get_product(request: HttpRequest, product_id: int) -> ProductOut:
    use_case = request.injector.get(GetProductUseCase)   # django-injector 綁定
    result = use_case.execute(request.auth, product_id)

    out = ProductOut.from_orm(result.product)
    if Capability.SEE_COST in result.capabilities:       # 不做權限推理,只挑出口
        out.cost_info = CostSection.from_orm(result.product)
    return out
```

幾個細節是刻意的:

- **授權的真相是一張表。** `ROLE_USE_CASES` 就是全系統權限的單一事實:review 權限=review 一張表,新人問「營運能做什麼」=看一行,產權限文件=迭代一個 dict。三次改版的年代,回答這些問題要 grep 整個 codebase。
- **section 是加法。** 再多一個敏感維度(個資、毛利)就是再多一個 `xxx_info: Section | None`——schema 總數相加,不相乘。能力 role 疊加、回應 section 疊加,同一條數學管到 API 的形狀。
- **`exclude_none=True` 讓沒授權的 section 連 key 都不出現。** `"cost_info": null` 也是洩漏——它告訴對方「有這個欄位存在」。
- **view 不認識任何 role。** 它拿到的是 use case 翻譯過的資格(`SEE_COST`);role 改名、拆併、換模型,view 一行不動。`StrEnum` 讓這些識別字有型別、有補全,打錯字在測試就爆,不會活到線上變成一個永遠 false 的字串比對。
- **repo 走 injector 注入。** use case 依賴的是 `ProductRepository` 介面——權限判斷的單元測試換個假 repo 就能跑,不用碰資料庫;一個 use case class 只有一個公開的 `execute`,多了就會滑向 service 大雜燴。

最後,還有一個更徹底的版本:**敏感欄位獨立成子資源**——`GET /products/{id}/cost`,權限掛在資源上,schema 完全不用玩花樣,audit 天然分離、公開資料放心快取。但要小心它的判準:**不是「成本屬於別的領域」**——成本的事實雖然生於採購,主播喊價卻非知道成本不可,它是定價現場的必需品,硬歸給採購域是違反業務現實的紙上分類。子資源真正的判準是**存取邊界**:同一筆資料,讀的人、頻率、敏感度跟本體差異夠大,就值得自己的一道門——一道門一種權限、一份 audit、一種快取策略。section 是「必須內嵌」時的加法解,子資源是「存取邊界夠清楚」時的徹底解。

## 反思

### 摩擦型的債,沒有催收機制

超賣會爆炸、金流會爆炸——它們的債有利息、有催收,你不還就出事。權限做錯了不爆炸,它只**摩擦**:每次授權多五分鐘、每個新人多問一輪、每個需求多繞一下。沒有告警、沒有事故報告,永遠排不進 sprint——直到某天有人受不了,才發現大家已經各自難受很久了。我後來的判準:**當一個內部流程人人抱怨、卻永遠沒人排期修它,那就是摩擦債**——它不會自己浮上來,要有人固定去撈。

### 粒度的標準不是安全,是語意

三次改版繞的其實是同一個問題:權限的**單位**該多大。太細(model 級)沒有語意,授權變翻譯;太粗(一顆 is_admin)沒有邊界,授權變賭注。正確的粒度只有一個標準:**使用它的人開口說話的單位**。營運說的是「她要能結檔期」、老闆說的是「他不能看成本」——role 和能力,就是這些句子的名詞。權限模型做得好不好,測試方法很簡單:把授權需求用一句人話說出來,看系統能不能一對一翻譯——翻譯要加註解的,就是模型錯了。

### 沒做好,但沒出事——為什麼

誠實說完彎路,也要誠實回答一個問題:改了三次的權限系統,為什麼從來沒出過事?因為**最貴的東西從第一天就圍好了**——成本可見性有專門管制、外包碰不到資料、主體全是內部人員。權限模型的優雅與否,影響的是摩擦;**資產有沒有圍好,影響的才是存亡**。這給我的排序啟示是:先用最笨的方式把最貴的資料圍死,再慢慢優化模型的優雅度——反過來做的團隊,模型漂亮,然後在某次外包交接時把成本表整包送出去。

明天進入錢的深水區:優惠與金額——折扣算錯,比超賣還難查。

---
> 本文改寫自我的部落格系列《Re:從零開始做直播代購電商平台》,本篇完整版:https://blog.aidan.tw/blog/rezero-permission/
