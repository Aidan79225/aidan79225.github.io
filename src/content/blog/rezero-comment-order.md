---
title: "留言即下單:把聊天室變成下單通道"
date: 2026-07-25
category: tech
description: "直播代購主線第一戰:單一行程輪抓三個平台的留言、自適應節奏、清洗落地,再用一台自製 FSM 把「2601藍+1紅+2」解析成訂單——逐段拆解這台狀態機的設計與精妙處,以及「失敗直接略過」這個最痛的取捨。"
tags:
  - war-story
  - live-commerce
  - fsm
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 3
comments: true
draft: false
---
[[rezero-overview|全景]]和[[rezero-stack|起手式]]鋪完,進主線第一戰:**一則留言,怎麼變成一筆單**。這章講「接進來」和「解析」兩段,佔庫存的攻防留給下一章。主角是把聊天室變成收銀機的那台有限狀態機——我們會直接讀它的程式碼。

## 當年的管線:一條迴圈,吃下三個平台

留言來自三個源:**FB、IG、自建直播間**,流量比例大約 **100:10:1**——FB 是絕對主戰場。當年的接法樸素到有點可愛:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="當年的留言處理管線。左側三個來源:FB 流量占比一百、IG 十、自建一。單一行程的連續 job 依序輪抓三源,節奏自適應:一輪超過兩秒就帶著 paging key 立刻續抓,空閒就放慢。抓到的留言清洗成統一 message 格式後 append 進資料庫,但原文不保留。下游每批兩百筆,用 FSM 解析、查 bidding key、扣賣出數量並建立身分。兩個痛點以警示標出:原文不留等於無法重放修正;處理失敗直接略過、沒有補救路徑,尖峰時延遲可達幾分鐘。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rcf" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rcp" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e05a7d"/></marker></defs>
    <rect x="16" y="24" width="88" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="60" y="40" fill="#e6e6e6" font-size="7.6" text-anchor="middle">FB(100)</text>
    <rect x="16" y="56" width="88" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="60" y="72" fill="#e6e6e6" font-size="7.6" text-anchor="middle">IG(10)</text>
    <rect x="16" y="88" width="88" height="24" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="60" y="104" fill="#e6e6e6" font-size="7.6" text-anchor="middle">自建(1)</text>
    <line x1="104" y1="68" x2="124" y2="68" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rcf)"/>
    <rect x="128" y="40" width="128" height="56" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="192" y="60" fill="#4f6df5" font-size="8.6" text-anchor="middle" font-weight="bold">單一行程・依序輪抓</text>
    <text x="192" y="75" fill="#9aa4b2" font-size="6.6" text-anchor="middle">超過 2 秒→帶 paging key 續抓</text>
    <text x="192" y="87" fill="#9aa4b2" font-size="6.6" text-anchor="middle">空閒→把間隔放慢</text>
    <line x1="256" y1="68" x2="276" y2="68" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rcf)"/>
    <rect x="280" y="40" width="128" height="56" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="344" y="60" fill="#e6e6e6" font-size="8.6" text-anchor="middle" font-weight="bold">清洗 → 落地</text>
    <text x="344" y="75" fill="#9aa4b2" font-size="6.6" text-anchor="middle">統一 message 格式 append</text>
    <text x="344" y="87" fill="#9aa4b2" font-size="6.6" text-anchor="middle">去重鍵:source+message id</text>
    <line x1="408" y1="68" x2="428" y2="68" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rcf)"/>
    <rect x="432" y="40" width="132" height="56" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="498" y="60" fill="#d6a45c" font-size="8.6" text-anchor="middle" font-weight="bold">batch 200・FSM</text>
    <text x="498" y="75" fill="#9aa4b2" font-size="6.6" text-anchor="middle">解析 → 查 bidding key</text>
    <text x="498" y="87" fill="#9aa4b2" font-size="6.6" text-anchor="middle">扣賣出數量+建立身分</text>
    <line x1="344" y1="96" x2="344" y2="130" stroke="#e05a7d" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rcp)"/>
    <text x="344" y="146" fill="#e05a7d" font-size="7.4" text-anchor="middle" font-weight="bold">raw 原文不留 → 清洗漏了就無法重放</text>
    <line x1="498" y1="96" x2="498" y2="170" stroke="#e05a7d" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#rcp)"/>
    <text x="470" y="186" fill="#e05a7d" font-size="7.4" text-anchor="middle" font-weight="bold">處理失敗 → 直接略過,沒有補救路徑</text>
    <text x="290" y="222" fill="#9aa4b2" font-size="7.8" text-anchor="middle">一切為了主播眼中最新鮮的庫存狀態;代價:尖峰 lag 可達幾分鐘、掉單無聲</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">當年的留言管線:單一行程輪抓三源、清洗落地、批次解析下單。兩處虛線是這章要算的帳。</figcaption>
</figure>

三個細節值得放大:

- **自適應節奏其實是一個自調的速率控制器。** 一輪抓完看耗時:超過 2 秒代表留言正湧入,帶著 paging key 立刻接著抓;低於 2 秒代表場子冷,把間隔放慢一點。不用外部設定、不用監控儀表,迴圈自己感知流量、自己調速——小團隊憑直覺做出來的東西,事後看是很標準的 adaptive polling。它的缺點只有一個:**三個源綁在同一條迴圈上**,FB 爆量加速時,IG 和自建的新鮮度被拖著走;FB 被限流卡住時,另外兩源也一起等。
- **去重鍵選對了:`source + message id`。** 輪詢一定會抓到重疊區間,靠平台原生的留言 ID 當唯一鍵,重抓幾次都不會重複入庫——這是接入層的冪等,做對了後面全順。
- **清洗完,原文就丟了。** 留言直接被轉成自訂的 message 格式落地,raw 不留。這個決定當年沒人多想,後來成了最貴的一筆學費——清洗規則漏接的留言,**連「漏接了什麼」都無從知道**,除錯只能用猜的。

## 解析:一個為拇指設計的迷你語言

客人在直播裡打的不是指令,是**搶時間的縮寫**。文法長這樣:`2601+1` 是 key 2601 下單 1 件;商品有款式(顏色、尺寸)時,`2601藍+1紅+2` 一句話對同一個 key 下兩種款式各自的數量——**key 只打一次,款式接力**,因為在搶單的幾秒裡,少打三個字就是贏。一句留言也可以下多個 key。

解析這個語法,當年沒有用 regex,而是手寫了一台逐字元的有限狀態機(節錄,註解是我現在加的):

```python
class CommentsFSM:
    class State(Enum):
        KEYWORD = "keyword"
        STYLE = "style"
        NUMBER = "number"
        DETERMIN_KEYWORD_OR_STYLE = "determin_keyword_or_style"
        ERROR = "error"

    def __init__(self) -> None:
        # 狀態 → handler 的 dispatch table:主迴圈永遠只有一行
        self.fsm: dict[CommentsFSM.State, Callable[[str], None]] = {
            self.State.KEYWORD: self._handle_keyword,
            self.State.STYLE: self._handle_style,
            self.State.NUMBER: self._handle_number,
            self.State.DETERMIN_KEYWORD_OR_STYLE: self._handle_determin_keyword_or_style,
            self.State.ERROR: self._handle_error,
        }
        self._reset()
        self.separate_chars = set([" ", ",", "，", "、"])  # 半形全形逗號、頓號都算分隔

    def parse(self, text: str) -> dict[str, int]:
        self._reset()
        for c in text:
            self.fsm[self.state](c)              # 逐字元,一個字一步
        if self.current_number:
            self._add_result()                   # 收尾:結尾停在數字上
        return {k: q for k, q in self.results}   # 同 key 重複 → 最後一筆勝

    def _handle_keyword(self, char: str) -> None:
        if char.isdigit():
            self.current_str += char             # key 只累積開頭的連續數字
        elif char == "+" or char == "＋":        # 全形加號也是加號
            self.keyword = self.current_str
            self.state = self.State.NUMBER
            self.current_str = ""
        else:
            self.keyword = self.current_str      # 其餘字元轉進款式
            self.state = self.State.STYLE
            self.current_str = char

    def _add_result(self) -> None:
        try:
            quantity = int(self.current_number)
            if quantity > 0:                     # +0 沒有意義:喊單禁止取消
                self.results.append((self.keyword + self.current_str, quantity))
        except ValueError:
            self.results.clear()                 # 中段壞掉:整則作廢
            self.state = self.State.ERROR
            return
        self.state = self.State.STYLE
        self.current_str = ""
        self.current_number = ""
```

(節錄:省略了 `_reset` 和 STYLE、NUMBER、DETERMIN、ERROR 四個 handler——它們做的事都畫在下面的狀態圖裡。)

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="留言解析狀態機的轉移圖。KEYWORD 狀態累積開頭數字,遇到加號進 NUMBER,遇到其他字元進 STYLE。STYLE 累積款式字元,遇到加號進 NUMBER。NUMBER 累積數字,遇到非數字先記下一筆結果再進 DETERMIN 狀態;DETERMIN 依下一個字元是不是數字決定回 KEYWORD 開新 key 還是進 STYLE 接續同 key 的下一個款式。數字解析失敗進 ERROR,整則留言作廢。下方以 2601藍+1紅+2 為例:解析出 2601藍一件、2601紅兩件——key 只打一次,款式接力。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rcs" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rce" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#e05a7d"/></marker></defs>
    <rect x="24" y="34" width="104" height="34" rx="17" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="76" y="55" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">KEYWORD</text>
    <rect x="238" y="34" width="104" height="34" rx="17" fill="#262b3a" stroke="#9b6ff0" stroke-width="1.4"/>
    <text x="290" y="55" fill="#9b6ff0" font-size="8.8" text-anchor="middle" font-weight="bold">STYLE</text>
    <rect x="452" y="34" width="104" height="34" rx="17" fill="#233528" stroke="#54b890" stroke-width="1.4"/>
    <text x="504" y="55" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">NUMBER</text>
    <rect x="238" y="128" width="130" height="34" rx="17" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="303" y="145" fill="#d6a45c" font-size="7.6" text-anchor="middle" font-weight="bold">DETERMIN</text>
    <text x="303" y="156" fill="#9aa4b2" font-size="6.2" text-anchor="middle">下一段是新 key 還是款式?</text>
    <rect x="452" y="128" width="104" height="34" rx="17" fill="#3a2632" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="504" y="149" fill="#e05a7d" font-size="8.8" text-anchor="middle" font-weight="bold">ERROR</text>
    <line x1="128" y1="51" x2="236" y2="51" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rcs)"/>
    <text x="182" y="44" fill="#9aa4b2" font-size="6.6" text-anchor="middle">非數字→款式</text>
    <line x1="342" y1="51" x2="450" y2="51" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#rcs)"/>
    <text x="396" y="44" fill="#9aa4b2" font-size="6.6" text-anchor="middle">+ / ＋</text>
    <path d="M 490 68 Q 420 110 370 132" fill="none" stroke="#54b890" stroke-width="1.2" marker-end="url(#rcs)"/>
    <text x="438" y="106" fill="#54b890" font-size="6.6" text-anchor="middle">非數字:先記一筆</text>
    <path d="M 262 128 Q 180 100 106 70" fill="none" stroke="#d6a45c" stroke-width="1.2" marker-end="url(#rcs)"/>
    <text x="168" y="116" fill="#d6a45c" font-size="6.6" text-anchor="middle">數字→新 key</text>
    <path d="M 303 128 Q 296 96 292 70" fill="none" stroke="#d6a45c" stroke-width="1.2" marker-end="url(#rcs)"/>
    <text x="330" y="100" fill="#d6a45c" font-size="6.6" text-anchor="middle">其他→續款式</text>
    <line x1="368" y1="145" x2="450" y2="145" stroke="#e05a7d" stroke-width="1.2" marker-end="url(#rce)"/>
    <text x="409" y="138" fill="#e05a7d" font-size="6.6" text-anchor="middle">數字壞掉→整則作廢</text>
    <text x="290" y="200" fill="#e6e6e6" font-size="8.6" text-anchor="middle" font-weight="bold">「2601藍+1紅+2」 → { 2601藍: 1, 2601紅: 2 }</text>
    <text x="290" y="218" fill="#9aa4b2" font-size="7.4" text-anchor="middle">key 只打一次,款式接力;產出複合字串,拿去查 bidding key 表</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">FSM 的狀態轉移:KEYWORD 收數字、STYLE 收款式、NUMBER 收數量;DETERMIN 決定接力還是開新 key。</figcaption>
</figure>

這台機器有幾個藏在細節裡的設計,值得一條一條拆:

- **解析器不判斷「這是不是下單」——資料庫才是驗證器。** FSM 產出的是 `keyword + style` 拼起來的**複合字串**(`2601藍`),直接拿去查 bidding key 表(主播開賣時 start bidding API 已把所有複合 key 寫進 DB)。所以解析器可以放心寬鬆:閒聊留言沒有 `+數字`,解出空結果;就算解出 `讚+1`,查不到「讚」這個 key,自然丟棄。**寬鬆的解析器+嚴格的查表**,把「判斷下單意圖」這個模糊難題,收斂成一次精確的 lookup。
- **單則留言內建 LWW。** 最後一行的 dict 收斂,讓 `2601+1 2601+3` 自動只剩 `+3`——同一句話裡改主意,免費處理。
- **台灣輸入法的現實全接住了**:全形 `＋` 有特判、分隔符收了空格和中文逗號頓號;而全形數字 `１２` 能動則是個彩蛋——Python 的 `isdigit()` 和 `int()` 原生就接受全形數字,當年可能根本沒人知道自己支援了這個。
- **`+0` 被靜默濾掉——因為喊單禁止取消,這是 feature。** 直播喊單的張力就是「留言即承諾」,允許 `+0` 反悔,搶單就失去意義,還會被拿來惡意反覆佔庫存。要退?那是購物車和逾期釋放的事,不是留言的事。
- **中段壞掉整則作廢、尾巴殘缺前段保留。** 數字解析失敗會進 ERROR、把整則已解出的結果清空——整句可疑就寧可不下;但 `2601藍+1紅+` 這種尾巴斷掉的,前面的 `2601藍+1` 照收。不對稱,但目標一致:**盡量配對成功,可疑就整句放棄**。
- **連「字母 key」都有解——而且不用改程式。** FSM 的 keyword 只認開頭數字,那想用 `A01` 這種 key 怎麼辦?把 product 的 keyword 留空、完整字串放進款式欄——複合字串照樣拼得出來、照樣查得到。文法的限制被資料層吸收掉了,又一次 single source of truth 的紅利。

### 寫法的三個精妙處

上面講的是「它做了什麼決定」,這裡講「它寫得好在哪」——這台機器有三個值得偷學的手法:

1. **狀態表就是程式的骨架。** `dict[State, Callable]` 的 dispatch table,讓主迴圈永遠只有一行 `self.fsm[self.state](c)`——沒有 if/elif 森林。文法規則、狀態轉移圖、程式結構**三位一體**:review 時拿著轉移圖就能逐格對程式碼,加一個狀態=加一個 entry、一個 method,不會碰到既有邏輯。
2. **單趟、零回溯,靠「轉手」做到一格前瞻。** 每個字元恰好被讀一次,O(n)、沒有 regex 最壞情況的 backtracking。最漂亮的是 `_handle_number` 遇到非數字那一刻:先結帳、把狀態切到 DETERMIN,**然後把同一個字元原地轉交給新狀態的 handler 再處理一次**——效果等於向前看了一格,卻不需要 pushback buffer、不需要偷看下一個字。這是手寫 lexer 的標準招式,而它是被直覺寫出來的。
3. **狀態少到可以用眼睛驗證。** 整台機器的可變狀態只有三個字串加一個 enum;`parse()` 是純函式的形狀——字串進、dict 出,單元測試一行一個 case。進了 ERROR 之後,每個後續字元都持續清空結果,壞掉的留言**不可能漏出半筆**——fail-closed 用最笨、也最不會出錯的方式做到了。

### 重來,解析器會改嗎?

核心不會。單趟 FSM+寬鬆解析+DB 驗證,對這個文法規模就是最適解——regex 到這個複雜度已經不可維護,parser generator 又是殺雞用牛刀。重來要補的是三件外圍的事:

- **把文法的邊界寫成測試。** 款式名不能以數字開頭——`2XL` 這種尺寸,開頭的 `2` 會被 DETERMIN 判成新 key 的起點,解出錯的複合字串。當年的逃生門是建檔時把 keyword 留空、完整字串放款式欄,配對照樣成立;但這條規則只活在大家的默契裡。重來,它要變成建檔時的驗證與解析器的固定測試案例——**默契不會隨團隊擴編而複製,測試會**。
- **語法與語意分層。** `+0` 濾掉(禁止取消)、中段作廢(可疑不下)是**產品規則**,現在埋在 `_add_result` 的 try/except 裡——改產品規則得動解析器。重來會讓 FSM 只負責解析出「意圖列表」,產品裁決放在下一層,各自可測、各自可改。
- **拿真實流量餵它。** 解析器最怕的是改版 regression。raw 留下來之後(下一節),歷史留言就能離線重放:新舊解析器並排跑、diff 結果,改文法之前先知道會影響幾筆。再加一層 property-based testing——隨機字串灌進去,唯一要求的不變量是「絕不 crash、永遠回 dict」。

一句話收:**好程式碼的標準不是聰明,是改它的人知道會發生什麼。** 這台 FSM 當年已經及格了,重來補的不是重寫,是讓它「可以放心改」的那圈外圍。

## 順序與重複:LWW 的三個先決問題

「同一人重複留言,以最後一筆為準」——[[ddia-replication|LWW]] 一句話就講完,但「最後」這個字要先回答三個問題:

1. **以什麼時鐘為準?** 跨 FB/IG/自建三個源,各平台的時間戳基準不可比。當年的答案很務實:**以我們抓到的順序為主、平台時間戳為輔**——反正只有一條抓取迴圈,它進 DB 的順序就是全域順序。單一消費者的意外好處:**你自己就是時鐘**。
2. **覆蓋的粒度是什麼?** 是 key+style 級:後留的 `2601藍+1` 只蓋藍色,先前的 `2601紅+2` 還在。而且這是一個**帶副作用的 LWW**——蓋掉 `+2` 變 `+1`,購物車數量要改、賣出數量表要補回差額。一般系統的 LWW 丟掉舊值就完事,這裡的舊值佔著庫存,覆蓋即補償。
3. **「最後」的邊界在哪一場?** 主播有**重喊**的需求——同一個 key 重新開賣,舊場次的單**全部清除、完整重算**,客人要重新留言。所以 LWW 的有效鍵其實是「人+場次+style」:重喊即斷代。被清單的客人沒有系統通知,純靠主播口播——這也是 feature:主播就是這個平台的通知系統,「現在不留就沒了」的急迫感,正是直播銷售的引擎。

## 失敗的單去哪了:重來版的答案

當年最痛的取捨在管線末端:batch 沒有進度記錄,**處理失敗的留言直接略過**——那位客人的單無聲消失。這是刻意的:停下來救單,主播眼中的庫存就舊了;跳過,數字永遠最新。**為了主播的新鮮度,犧牲顧客的完整性。**

重來版不推翻這個優先序,只拆掉它的前提——當年之所以二選一,是因為「處理」和「事實」綁在同一條命脈上。拆開就好:

- **每源一條抓取迴圈**,自適應節奏保留,但 FB 的洪峰不再拖累 IG 和自建;
- **raw 原文與統一事件都落地**([[ddia-streaming|事件流]]是唯一事實來源),清洗規則漏接,重放就能補;
- **快路徑照樣跳過失敗**——但失敗的事件進 dead-letter 佇列留著,一條慢速補救路徑事後重放([[kafka-delivery|投遞語意]]那套在這裡全用得上);
- 解析與扣庫存**拆成兩段**:解析是純函式、可以平行,扣庫存才需要排隊——當年它們擠在同一個 batch 迴圈裡,慢的拖著快的。

一句話:**快用「晚點處理」換,不用「丟掉事實」換。** 主播照樣看到最新的數字,而那位失敗的客人,幾秒後會被補救路徑撈回來。

## 反思

### 解析器的智慧,是把難題推給資料庫

這台 FSM 我現在回頭看,最精妙的不是狀態設計,是**它拒絕回答困難的問題**。「這句留言是不是下單?」——不答,解出複合字串查 DB,查到就是、查不到就不是。「字母 key 怎麼支援?」——不改文法,keyword 留空放款式欄。「主播重喊怎麼辦?」——mapping 在 DB 裡,改綁定就是新事實。每一個看似要改解析器的需求,最後都被資料層吸收了。當年我說這是運氣好,現在我會說:**把唯一事實放對位置的人,會一直「運氣好」下去。**

### 限制是設計出來的,而且常常是最好的設計

這章出現了三個「缺陷即 feature」:`+0` 無效(喊單禁止取消)、重喊不通知(主播即通知系統)、中段錯誤整句作廢(可疑就不下)。它們沒有一個是技術限制——每一個都是**跟業務一起做出的產品決定**,只是長成了程式碼的樣子。工程師常以為自己在妥協,其實是在定義產品的邊界;而好的邊界比功能更能定義一個產品。直播電商的本質是急迫感,系統每貼心一分,急迫感就漏掉一分。

### 誠實面對那條虛線

但我不想把當年美化成處處是智慧。圖上那兩條粉紅虛線——raw 不留、失敗略過——是真實傷過客人的:漏接的留言無從得知、失敗的單無聲消失,而我們**連道歉都不知道要跟誰道**。這兩刀都不是技術難題,是當年沒把「事實」當成需要被保護的資產。如果這系列只能帶走一句話,我希望是這句:**功能可以慢慢長,事實一開始就要留下來**——因為功能寫錯了可以改,事實丟掉了,神仙也救不回。
