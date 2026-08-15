# Day 4|留言即下單(下):為拇指設計的迷你語言

昨天講了留言怎麼接進來;今天拆管線的心臟——把「2601藍+1紅+2」變成訂單的那台手寫 FSM,我們直接讀程式碼。

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
        self.state = self.State.STYLE            # 收尾路徑用;途中結帳會被 _handle_number 蓋成 DETERMIN
        self.current_str = ""
        self.current_number = ""
```

(節錄:省略了 `_reset` 和 STYLE、NUMBER、DETERMIN、ERROR 四個 handler——它們做的事都畫在下面的狀態圖裡。)

![FSM 的狀態轉移:KEYWORD 收數字、STYLE 收款式、NUMBER 收數量;DETERMIN 決定接力還是開新 key。](day04-1.png)

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
3. **狀態少到可以用眼睛驗證,測試也真的到位。** 整台機器的可變狀態只有三個字串加一個 enum;`parse()` 是純函式的形狀——字串進、dict 出,單元測試一行一個 case。而且當年它就**被大量測試案例罩著**——敢手寫解析器、敢在直播季一直改它,底氣就是這層保護。進了 ERROR 之後,每個後續字元都持續清空結果,壞掉的留言**不可能漏出半筆**——fail-closed 用最笨、也最不會出錯的方式做到了。

### 重來,解析器會改嗎?

核心不會。單趟 FSM+寬鬆解析+DB 驗證,對這個文法規模就是最適解——regex 到這個複雜度已經不可維護,parser generator 又是殺雞用牛刀。測試也不用從零開始:當年就有大量測試案例守著它。重來要補的,是三種當年還沒有的保護:

- **把文法的邊界寫成測試。** 款式名不能以數字開頭——`2XL` 這種尺寸,開頭的 `2` 會被 DETERMIN 判成新 key 的起點,解出錯的複合字串。當年的逃生門是建檔時把 keyword 留空、完整字串放款式欄,配對照樣成立;但這條規則只活在大家的默契裡。重來,它要變成建檔時的驗證與解析器的固定測試案例——**默契不會隨團隊擴編而複製,測試會**。
- **語法與語意分層。** `+0` 濾掉(禁止取消)、中段作廢(可疑不下)是**產品規則**,現在埋在 `_add_result` 的 try/except 裡——改產品規則得動解析器。重來會讓 FSM 只負責解析出「意圖列表」,產品裁決放在下一層,各自可測、各自可改。
- **拿真實流量餵它。** 解析器最怕的是改版 regression。raw 留下來之後(下一節),歷史留言就能離線重放:新舊解析器並排跑、diff 結果,改文法之前先知道會影響幾筆。再加一層 property-based testing——隨機字串灌進去,唯一要求的不變量是「絕不 crash、永遠回 dict」。

一句話收:**好程式碼的標準不是聰明,是改它的人知道會發生什麼。** 這台 FSM 當年已經及格了,重來補的不是重寫,是讓它「可以放心改」的那圈外圍。

## 反思

### 解析器的智慧,是把難題推給資料庫

這台 FSM 我現在回頭看,最精妙的不是狀態設計,是**它拒絕回答困難的問題**。「這句留言是不是下單?」——不答,解出複合字串查 DB,查到就是、查不到就不是。「字母 key 怎麼支援?」——不改文法,keyword 留空放款式欄。「主播重喊怎麼辦?」——mapping 在 DB 裡,改綁定就是新事實。每一個看似要改解析器的需求,最後都被資料層吸收了。當年我說這是運氣好,現在我會說:**把唯一事實放對位置的人,會一直「運氣好」下去。**

### 限制是設計出來的,而且常常是最好的設計

這章出現了三個「缺陷即 feature」:`+0` 無效(喊單禁止取消)、重喊不通知(主播即通知系統)、中段錯誤整句作廢(可疑就不下)。它們沒有一個是技術限制——每一個都是**跟業務一起做出的產品決定**,只是長成了程式碼的樣子。工程師常以為自己在妥協,其實是在定義產品的邊界;而好的邊界比功能更能定義一個產品。直播電商的本質是急迫感,系統每貼心一分,急迫感就漏掉一分。

明天換一個更容易被低估的問題:留言的那個人,到底是誰?

---
> 本文改寫自我的部落格系列《Re:從零開始做直播代購電商平台》,本篇完整版:https://blog.aidan.tw/blog/rezero-comment-order/
