# Day 4|手寫 FSM:為拇指設計的迷你語言

昨天講了留言怎麼接進來,今天讀把留言變成訂單的那台機器的程式碼。

## 一個為拇指設計的文法

客人在直播裡打的不是指令,是**搶時間的縮寫**:`2601+1` 是 key 2601 下單 1 件;商品有款式時,`2601藍+1紅+2` 一句話對同一個 key 下兩種款式各自的數量——**key 只打一次,款式接力**,因為在搶單的幾秒裡,少打三個字就是贏。

解析這個語法,當年沒有用 regex,而是手寫了一台逐字元的有限狀態機(節錄):

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
        self.fsm = {
            self.State.KEYWORD: self._handle_keyword,
            self.State.STYLE: self._handle_style,
            self.State.NUMBER: self._handle_number,
            self.State.DETERMIN_KEYWORD_OR_STYLE: self._handle_determin_keyword_or_style,
            self.State.ERROR: self._handle_error,
        }
        self._reset()
        self.separate_chars = set([" ", ",", "，", "、"])

    def parse(self, text: str) -> dict[str, int]:
        self._reset()
        for c in text:
            self.fsm[self.state](c)              # 逐字元,一個字一步
        if self.current_number:
            self._add_result()
        return {k: q for k, q in self.results}   # 同 key 重複 → 最後一筆勝

    def _add_result(self) -> None:
        try:
            quantity = int(self.current_number)
            if quantity > 0:                     # +0 沒有意義:喊單禁止取消
                self.results.append((self.keyword + self.current_str, quantity))
        except ValueError:
            self.results.clear()                 # 中段壞掉:整則作廢
            self.state = self.State.ERROR
```

![FSM 的狀態轉移:KEYWORD 收數字、STYLE 收款式、NUMBER 收數量;DETERMIN 決定接力還是開新 key](day04-1.png)

## 藏在細節裡的設計

- **解析器不判斷「這是不是下單」——資料庫才是驗證器。**FSM 產出 `keyword + style` 拼起來的複合字串(`2601藍`),直接拿去查 bidding key 表。所以解析器可以放心寬鬆:就算把閒聊解出 `讚+1`,查不到「讚」這個 key,自然丟棄。**寬鬆的解析器+嚴格的查表**,把「判斷下單意圖」這個模糊難題,收斂成一次精確的 lookup。
- **單則留言內建 LWW。**最後一行的 dict 收斂,讓 `2601+1 2601+3` 自動只剩 `+3`。
- **`+0` 被靜默濾掉——喊單禁止取消,這是 feature。**直播喊單的張力就是「留言即承諾」;允許 `+0` 反悔,搶單就失去意義。
- **連「字母 key」都有解,而且不用改程式。**keyword 只認開頭數字,想用 `A01`?把 product 的 keyword 留空、完整字串放款式欄——複合字串照樣拼得出來、照樣查得到。文法的限制被資料層吸收掉了。

## 寫法的三個精妙處

1. **狀態表就是程式的骨架。**dispatch table 讓主迴圈永遠只有一行——沒有 if/elif 森林;文法規則、狀態轉移圖、程式結構三位一體,加一個狀態=加一個 entry、一個 method。
2. **單趟、零回溯,靠「轉手」做到一格前瞻。**NUMBER 遇到非數字的那一刻:先結帳、切狀態,**然後把同一個字元原地轉交給新狀態的 handler 再處理一次**——效果等於向前看了一格,卻不需要 pushback buffer。這是手寫 lexer 的標準招式,而它是被直覺寫出來的。
3. **狀態少到可以用眼睛驗證,測試也真的到位。**`parse()` 是純函式的形狀——字串進、dict 出;當年它就被大量測試案例罩著,敢在直播季一直改它,底氣就是這層保護。

## 重來,解析器會改嗎?

核心不會:單趟 FSM+寬鬆解析+DB 驗證,對這個文法規模就是最適解。重來補的是外圍:把文法邊界寫成測試(默契不會隨團隊擴編而複製,測試會)、語法與語意分層(`+0` 是產品規則,不該埋在解析器裡)、raw 留下來之後拿真實流量離線重放新舊解析器。

一句話收:**好程式碼的標準不是聰明,是改它的人知道會發生什麼。**這台 FSM 當年已經及格了,重來補的不是重寫,是讓它「可以放心改」的那圈外圍。

明天換一個更容易被低估的問題:留言的那個人,到底是誰?

---
> 本文改寫自我的部落格系列《Re:從零開始做直播代購電商平台》,本篇完整版:https://blog.aidan.tw/blog/rezero-comment-order/
