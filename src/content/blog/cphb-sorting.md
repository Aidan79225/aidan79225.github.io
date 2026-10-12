---
title: "排序是最便宜的結構:比較的下界、counting sort 與二分搜尋"
date: 2026-10-12
category: tech
description: "CPHB 第 3 章。排序不只是「把東西排好」——它是用 n log n 的代價,替後面的每個問題買一個結構。這篇講三件事:為什麼靠比較的排序法逃不掉 n log n(決策樹),counting sort 怎麼繞過它,以及二分搜尋真正需要的不是排好序的陣列,是一個單調的判定。附 bubble sort、二分搜尋賽跑、counting sort 三個可以逐步操作的動畫。"
tags:
  - algorithms
  - cphb
  - sorting
  - binary-search
  - book-notes
series: "Competitive Programmer's Handbook 讀書筆記"
seriesOrder: 2
comments: true
draft: true
---
[[cphb-complexity|上一篇]]講的是看到 $n$ 就知道該寫什麼複雜度。這一篇講 CPHB 第 3 章:排序。原書這章很短,但它藏著一個我覺得比排序演算法本身更重要的觀念——**排序不是目的,是在替後面的問題製造結構。** 很多題目難在「元素是亂的」,排好之後,重複的會靠在一起、該配對的會變成鄰居、要找的東西可以用二分搜尋逼近。你付 $O(n \log n)$,買到的是之後每一步都變便宜。

這篇照原書的三段走:排序的理論(為什麼是 $n \log n$、什麼時候能更快)、程式裡怎麼用(原書講 C++,這裡換成 Python)、二分搜尋。

## 為什麼是 n log n

### 先看最笨的:bubble sort,每次交換只少一個 inversion

原書用 bubble sort 開場——$n$ 輪,每一輪從左到右,相鄰兩個順序不對就交換:

```python
for i in range(n):
    for j in range(n - 1):
        if array[j] > array[j + 1]:
            array[j], array[j + 1] = array[j + 1], array[j]
```

兩層迴圈,$O(n^2)$。但原書接著講了一個很漂亮的論證,解釋為什麼**所有只交換相鄰元素的排序法都至少 $O(n^2)$**。工具是 **inversion**:一對位置 $a < b$ 但 $\text{array}[a] > \text{array}[b]$,也就是「前面的比後面的大」。陣列裡的 inversion 數就是「離排好還有多遠」:排好 = 0 個,完全倒序 = $n(n-1)/2$ 個。

關鍵一句:**交換相鄰的兩個元素,剛好消掉一個 inversion。** 不多不少。所以只靠相鄰交換,最壞要交換 $n(n-1)/2$ 次——這就是 $O(n^2)$ 的來源。

動畫裡的計數條畫的就是「剩下幾個 inversion」。按幾步看看:它只會在交換的那一步減一,而且每次剛好減一。

<div data-algo="bubble-sort"><p>(這裡是互動動畫,需要 JavaScript。原書的例子 [1, 3, 8, 2, 9, 2, 5, 6] 一開始有 9 個 inversion,bubble sort 剛好交換 9 次。)</p></div>

### 要更快,就得一次消掉很多 inversion:merge sort

$O(n \log n)$ 的排序法不受「相鄰交換」的限制。原書的代表是 merge sort,它的形狀是遞迴:

1. 只有一個元素就不用動。
2. 從中間切成兩半。
3. 兩半各自遞迴排好。
4. **合併**兩個已經排好的半邊——因為兩邊都有序,合併只要 $O(n)$(兩個指標各往右走,每次挑小的)。

每層遞迴把範圍砍半,所以有 $O(\log n)$ 層;每一層合併的總工作量是 $O(n)$。相乘就是 $O(n \log n)$。一次合併可以把一個元素跨過很多個元素,這就是它消 inversion 比 bubble sort 快的原因。

### 下界:靠比較,逃不掉 n log n

那有沒有可能比 $n \log n$ 更快?原書給了一個簡潔的證明:**只要你的排序法是靠「比大小」在運作的,就不可能。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 300" role="img" aria-label="比較排序的決策樹,以三個元素 a、b、c 為例。每個內部節點是一次比較,往左是小於、往右是大於;葉子是六種可能的排好序結果,也就是 3! 種排列。樹要有 n! 片葉子,高度至少 log2(n!),大約是 n log n,所以任何只靠比較的排序法最壞情況至少要 n log n 次比較。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="300" y="22" fill="#e6e6e6" font-size="13" font-weight="bold" text-anchor="middle">每一次比較只能把「還有可能的排列」分成兩半</text>
    <rect x="268.0" y="45" width="64" height="26" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="300" y="62" fill="#e6e6e6" font-size="11.5" text-anchor="middle">a < b ?</text>
    <rect x="128.0" y="105" width="64" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="160" y="122" fill="#e6e6e6" font-size="11.5" text-anchor="middle">b < c ?</text>
    <rect x="408.0" y="105" width="64" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="440" y="122" fill="#e6e6e6" font-size="11.5" text-anchor="middle">a < c ?</text>
    <line x1="300" y1="71" x2="160" y2="105" stroke="#3a4154" stroke-width="1.2"/>
    <text x="220.0" y="90.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">小於</text>
    <line x1="300" y1="71" x2="440" y2="105" stroke="#3a4154" stroke-width="1.2"/>
    <text x="380.0" y="90.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">大於</text>
    <rect x="40" y="166" width="60" height="24" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="70" y="182" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">a b c</text>
    <rect x="168.0" y="165" width="64" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="200" y="182" fill="#e6e6e6" font-size="11.5" text-anchor="middle">a < c ?</text>
    <rect x="350" y="166" width="60" height="24" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="380" y="182" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">b a c</text>
    <rect x="488.0" y="165" width="64" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="520" y="182" fill="#e6e6e6" font-size="11.5" text-anchor="middle">b < c ?</text>
    <line x1="160" y1="131" x2="70" y2="165" stroke="#3a4154" stroke-width="1.2"/>
    <text x="105.0" y="150.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">小於</text>
    <line x1="160" y1="131" x2="200" y2="165" stroke="#3a4154" stroke-width="1.2"/>
    <text x="190.0" y="150.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">大於</text>
    <line x1="440" y1="131" x2="380" y2="165" stroke="#3a4154" stroke-width="1.2"/>
    <text x="400.0" y="150.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">小於</text>
    <line x1="440" y1="131" x2="520" y2="165" stroke="#3a4154" stroke-width="1.2"/>
    <text x="490.0" y="150.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">大於</text>
    <rect x="120" y="226" width="60" height="24" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="150" y="242" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">a c b</text>
    <rect x="220" y="226" width="60" height="24" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="250" y="242" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">c a b</text>
    <rect x="440" y="226" width="60" height="24" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="470" y="242" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">b c a</text>
    <rect x="540" y="226" width="60" height="24" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="570" y="242" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">c b a</text>
    <line x1="200" y1="191" x2="150" y2="225" stroke="#3a4154" stroke-width="1.2"/>
    <text x="165.0" y="210.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">小於</text>
    <line x1="200" y1="191" x2="250" y2="225" stroke="#3a4154" stroke-width="1.2"/>
    <text x="235.0" y="210.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">大於</text>
    <line x1="520" y1="191" x2="470" y2="225" stroke="#3a4154" stroke-width="1.2"/>
    <text x="485.0" y="210.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">小於</text>
    <line x1="520" y1="191" x2="570" y2="225" stroke="#3a4154" stroke-width="1.2"/>
    <text x="555.0" y="210.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">大於</text>
    <text x="300" y="282" fill="#d6a45c" font-size="12" font-weight="bold" text-anchor="middle">n! 片葉子 → 高度 ≥ log₂(n!) ≈ n log n → 最壞情況至少 n log n 次比較</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三個元素有 3! = 6 種排列,每次比較最多把候選砍一半,所以至少要 log₂6 ≈ 2.6,也就是 3 次比較才能分辨。把 3 換成 n,就是比較排序的下界——只要你的排序法是靠「比大小」運作的,就逃不掉。</figcaption>
</figure>

把排序想成一棵決策樹:每個節點問一次「$x < y$?」,往左或往右;走到葉子,就知道這 $n$ 個元素該怎麼排。$n$ 個元素有 $n!$ 種排法,所以這棵樹至少要有 $n!$ 片葉子,高度至少 $\log_2(n!)$。而 $\log_2(n!) \ge (n/2)\log_2(n/2)$,大約就是 $n \log n$。樹的高度就是最壞情況的比較次數——**下界證完了。**

這個證明的漂亮之處在於它跟演算法無關。它不是說「merge sort 不能再快」,是說「任何靠比較的方法都不能再快」。

### 繞過下界:counting sort,不比較就不受限

下界的前提是「靠比較」。不比較呢?**counting sort** 拿元素的值當索引:開一個計數陣列,第一輪數每個值出現幾次,第二輪照索引順序把它們倒回去。$O(n)$,前提是元素都是 $0 \ldots c$ 的整數,而且 $c = O(n)$——計數陣列要放得下。

<div data-algo="counting-sort"><p>(這裡是互動動畫,需要 JavaScript。原書的例子 [1, 3, 6, 9, 9, 3, 5, 9] 用 8 + 10 = 18 步排好,全程沒有比較過任何兩個元素。)</p></div>

注意動畫跑完第一輪的那個狀態:計數陣列已經是「排好序的陣列的壓縮版」——每個值出現幾次。第二輪只是把它展開。它快,是因為它用了一個比較排序沒用的資訊:**元素的值本身就是位置。** 代價是這個資訊必須存在(整數、範圍小),不然就沒得用。

## Python 裡怎麼排

原書的態度很明確:**比賽裡幾乎不該自己寫排序。** 標準函式庫的排序又快又對,自己寫的不會更好。原書講的是 C++ 的 `sort`,換成 Python 是 `sorted` 和 `list.sort`——底下是 Timsort,穩定、$O(n \log n)$,而且是 C 實作的,比你用 Python 迴圈寫的任何排序都快得多。

```python
v = [4, 2, 5, 3, 5, 8, 3]
sorted(v)                        # [2, 3, 3, 4, 5, 5, 8],回傳新的 list
v.sort()                         # 原地排
v.sort(reverse=True)             # 遞減
"".join(sorted("monkey"))        # 字串也能排:"ekmnoy"
```

要排自訂的東西,Python 的做法跟 C++ 不一樣:C++ 給 `sort` 一個「比較兩個元素」的函式,Python 給 `sorted` 一個 **`key`**——「每個元素拿什麼來排」。三條路:

| 做法 | 什麼時候用 |
|---|---|
| 直接排;tuple 依序比較(先比第一個,相同再比第二個) | 多數情況。要「先依 A 再依 B」,把資料裝成 tuple 就好:`sorted(pairs)` |
| `key=lambda x: (len(x), x)` | 同一型別要用不同順序排,例如字串先比長度再比字典序。`key` 回傳 tuple 就是多重排序鍵 |
| 在 class 裡定義 `__lt__` | 自己的型別,而且只有一種自然的順序 |

```python
words = ["banana", "kiwi", "apple", "fig"]
sorted(words, key=lambda w: (len(w), w))     # ['fig', 'kiwi', 'apple', 'banana']
sorted(words, key=len, reverse=True)         # 長的在前
```

`key` 這個設計避掉了 C++ 比較函式最常踩的坑:比較函式必須是**嚴格弱序**(strict weak ordering),`a < a` 要回傳 false,用 `<=` 寫會在特定資料上排出垃圾。`key` 只是把每個元素換成另一個值再用內建的 `<` 比,寫不出不一致的順序。真的需要「比較兩個元素」的舊式寫法,`functools.cmp_to_key` 可以轉,但幾乎用不到。

## 二分搜尋

### 在排好序的陣列裡找 x

沒排序的陣列裡找一個值,只能一格一格看,$O(n)$——沒有任何資訊告訴你該往哪找。**排好序之後,順序本身就是導航。** 二分搜尋每一步看中間那格:等於就找到了;比 $x$ 大,右半邊全部不用看;比 $x$ 小,左半邊全部不用看。

```python
a, b = 0, n - 1
while a <= b:
    k = (a + b) // 2
    if array[k] == x:
        return k          # 找到了
    if array[k] > x:
        b = k - 1
    else:
        a = k + 1
```

「還有可能的範圍」$a \ldots b$ 每一步砍半,所以 $O(\log n)$。下面把它跟線性掃描並排,兩邊每一步各做一次比較。注意右邊藍色的範圍怎麼縮——還有左邊變淡的格子,那是線性掃描「已經排除」的,每一步只多一格。

<div data-algo="binary-search-race" data-input="1, 3, 4, 7, 9, 12, 15, 18, 21 | 18"><p>(這裡是互動動畫,需要 JavaScript。找 18:線性掃描比 8 次,二分搜尋比 3 次。)</p></div>

$n = 9$ 時是 8 次對 3 次。$n = 10^6$ 時是最多 $10^6$ 次對最多 20 次。

原書還給了第二種寫法:從左邊開始**跳**,跳距從 $n/2$ 開始每輪減半,跳得過就跳、跳不過就縮小步伐。結果一樣是 $O(\log n)$,但這個寫法沒有「中間」的概念,之後樹上的倍增(第 16 篇)會再看到它。

```python
k = 0
b = n // 2
while b >= 1:
    while k + b < n and array[k + b] <= x:
        k += b
    b //= 2
if array[k] == x:
    pass                  # 找到了,在 k
```

標準函式庫也有,在 `bisect` 模組:`bisect_left`(第一個 $\ge x$ 的位置,對應 C++ 的 `lower_bound`)、`bisect_right`(第一個 $> x$ 的位置,對應 `upper_bound`)。兩者相減就是 $x$ 出現的次數:

```python
from bisect import bisect_left, bisect_right
count = bisect_right(array, x) - bisect_left(array, x)
```

### 真正的二分搜尋:對答案二分

這一節是整章最值錢的地方。

二分搜尋需要的其實不是「排好序的陣列」,是一個**單調的判定函數** $\text{ok}(x)$:在答案空間上先是一排 false、之後全是 true。只要這個形狀成立,就能用同一套砍半的方法找到**第一個 true 的位置**——那通常就是「最小的可行答案」。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 250" role="img" aria-label="二分搜尋的兩種形狀。左邊:在排好序的陣列裡找 x,還有可能的範圍每一步砍半,16 格變 8 格、4 格、2 格、1 格,四步結束。右邊:對答案二分,判定函數 ok(x) 在答案空間上先是一排 false、之後全是 true,只要這個單調性成立,同一套砍半的方法就能找到第一個 true 的位置;陣列只是它的特例。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="150" y="20" fill="#4f6df5" font-size="12.5" font-weight="bold" text-anchor="middle">在排好序的陣列裡找 x</text>
    <text x="150" y="36" fill="#9aa4b2" font-size="10.5" text-anchor="middle">還有可能的範圍,每一步砍一半</text>
    <rect x="20" y="50" width="260" height="18" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="20.0" y="50" width="260.0" height="18" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="288" y="63" fill="#9aa4b2" font-size="10" text-anchor="start">16 格</text>
    <line x1="150.0" y1="50" x2="150.0" y2="68" stroke="#d6a45c" stroke-width="1.5"/>
    <rect x="20" y="78" width="260" height="18" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="98.0" y="78" width="130.0" height="18" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="288" y="91" fill="#9aa4b2" font-size="10" text-anchor="start">8 格</text>
    <line x1="163.0" y1="78" x2="163.0" y2="96" stroke="#d6a45c" stroke-width="1.5"/>
    <rect x="20" y="106" width="260" height="18" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="137.0" y="106" width="65.0" height="18" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="288" y="119" fill="#9aa4b2" font-size="10" text-anchor="start">4 格</text>
    <line x1="169.5" y1="106" x2="169.5" y2="124" stroke="#d6a45c" stroke-width="1.5"/>
    <rect x="20" y="134" width="260" height="18" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="156.5" y="134" width="32.5" height="18" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="288" y="147" fill="#9aa4b2" font-size="10" text-anchor="start">2 格</text>
    <line x1="172.75" y1="134" x2="172.75" y2="152" stroke="#d6a45c" stroke-width="1.5"/>
    <rect x="20" y="162" width="260" height="18" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="166.25" y="162" width="16.25" height="18" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="288" y="175" fill="#9aa4b2" font-size="10" text-anchor="start">1 格</text>
    <text x="150" y="200" fill="#e6e6e6" font-size="11" text-anchor="middle">16 → 8 → 4 → 2 → 1:4 步 = log₂16</text>
    <text x="150" y="216" fill="#9aa4b2" font-size="10" text-anchor="middle">黃線 = 這一步看的中間那格</text>
    <line x1="318" y1="14" x2="318" y2="236" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="460" y="20" fill="#54b890" font-size="12.5" font-weight="bold" text-anchor="middle">對答案二分</text>
    <text x="460" y="36" fill="#9aa4b2" font-size="10.5" text-anchor="middle">只要 ok(x) 先 false 後 true,就能二分</text>
    <rect x="337.0" y="56" width="23.0" height="22" rx="3" fill="#3a2626" stroke="#dc4c3f" stroke-width="1"/>
    <text x="348.5" y="71" fill="#dc4c3f" font-size="9" text-anchor="middle">F</text>
    <rect x="362.0" y="56" width="23.0" height="22" rx="3" fill="#3a2626" stroke="#dc4c3f" stroke-width="1"/>
    <text x="373.5" y="71" fill="#dc4c3f" font-size="9" text-anchor="middle">F</text>
    <rect x="387.0" y="56" width="23.0" height="22" rx="3" fill="#3a2626" stroke="#dc4c3f" stroke-width="1"/>
    <text x="398.5" y="71" fill="#dc4c3f" font-size="9" text-anchor="middle">F</text>
    <rect x="412.0" y="56" width="23.0" height="22" rx="3" fill="#3a2626" stroke="#dc4c3f" stroke-width="1"/>
    <text x="423.5" y="71" fill="#dc4c3f" font-size="9" text-anchor="middle">F</text>
    <rect x="437.0" y="56" width="23.0" height="22" rx="3" fill="#3a2626" stroke="#dc4c3f" stroke-width="1"/>
    <text x="448.5" y="71" fill="#dc4c3f" font-size="9" text-anchor="middle">F</text>
    <rect x="462.0" y="56" width="23.0" height="22" rx="3" fill="#3a2626" stroke="#dc4c3f" stroke-width="1"/>
    <text x="473.5" y="71" fill="#dc4c3f" font-size="9" text-anchor="middle">F</text>
    <rect x="487.0" y="56" width="23.0" height="22" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/>
    <text x="498.5" y="71" fill="#54b890" font-size="9" text-anchor="middle">T</text>
    <rect x="512.0" y="56" width="23.0" height="22" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/>
    <text x="523.5" y="71" fill="#54b890" font-size="9" text-anchor="middle">T</text>
    <rect x="537.0" y="56" width="23.0" height="22" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/>
    <text x="548.5" y="71" fill="#54b890" font-size="9" text-anchor="middle">T</text>
    <rect x="562.0" y="56" width="23.0" height="22" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/>
    <text x="573.5" y="71" fill="#54b890" font-size="9" text-anchor="middle">T</text>
    <text x="336" y="92" fill="#9aa4b2" font-size="9.5" text-anchor="start">x = 0</text>
    <text x="586" y="92" fill="#9aa4b2" font-size="9.5" text-anchor="end">x = 9</text>
    <line x1="486.0" y1="48" x2="486.0" y2="84" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="486.0" y="104" fill="#d6a45c" font-size="10" font-weight="bold" text-anchor="middle">第一個 true = 答案</text>
    <text x="336" y="126" fill="#e6e6e6" font-size="10.5" font-weight="bold" text-anchor="start">同一套方法,換一個 ok(x):</text>
    <text x="340" y="143" fill="#9aa4b2" font-size="10" text-anchor="start">「x 是不是 ≥ 要找的值?」→ 陣列搜尋</text>
    <text x="340" y="159" fill="#9aa4b2" font-size="10" text-anchor="start">「k 台機器跑得完嗎?」→ 最少機器數</text>
    <text x="340" y="175" fill="#9aa4b2" font-size="10" text-anchor="start">「這個版本有 bug 嗎?」→ git bisect</text>
    <text x="340" y="191" fill="#9aa4b2" font-size="10" text-anchor="start">「這個容量撐得住嗎?」→ 壓測找上限</text>
    <text x="460" y="213" fill="#d6a45c" font-size="10.5" text-anchor="middle">每呼叫一次 ok 就砍半:O(log 範圍) 次呼叫</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">二分搜尋真正需要的不是「排好序的陣列」,是一個<b>單調</b>的判定:答案空間裡存在一條線,線的一邊全是 false、另一邊全是 true。排好序的陣列只是這條線最常見的長相。</figcaption>
</figure>

原書的寫法用的是跳躍版:

```python
x = -1
b = z
while b >= 1:
    while not ok(x + b):
        x += b
    b //= 2
k = x + 1        # 最小的 k 使得 ok(k) 成立
```

$z$ 要夠大,大到確定 $\text{ok}(z)$ 是 true。每呼叫一次 $\text{ok}$ 就砍半,所以總共 $O(\log z)$ 次呼叫;整體複雜度取決於 $\text{ok}$ 本身多貴——$\text{ok}$ 是 $O(n)$,整體就是 $O(n \log z)$。

這個想法把很多「求最小 / 最大的 X」的題目變成「判定 X 行不行」:**判定通常比求解容易很多**,而二分搜尋負責把判定變成求解。原書同一節還提到:先升後降的函數也能二分(找最後一個 $f(x) < f(x+1)$ 的位置),但相鄰的值不能相等,不然不知道該往哪邊走。

## 浪費了什麼

- **bubble sort → merge sort**:每次交換只動相鄰的兩個,一次只消一個 inversion;合併可以讓一個元素一次跨過一整段。
- **比較 → 計數**:比較排序只用了「誰比誰大」;counting sort 用了「值本身就是位置」,所以能繞過 $n \log n$ 的下界——當然,前提是這個資訊存在。
- **線性掃描 → 二分搜尋**:線性掃描每一步只排除一格;排好序之後,一次比較可以排除一半。

三個都是同一件事:**找到一個暴力解沒用上的順序。** 這篇的結構標記是【順序】——先把東西排好、或者發現答案空間本來就有順序——以及【單調】:二分搜尋的每一步都只往一個方向收。

## 這招在哪裡上班

- **資料庫索引就是「排好序然後二分」。** B-tree 的葉子是有序的,所以等值查詢是二分逼近,範圍查詢、`ORDER BY`、前綴 `LIKE` 也都吃得到——[[sql-index|索引那篇]]講的其實就是這一章。LSM tree 的 SSTable 也是先排好序再寫出去,[[ddia-storage-engines|合併]]就是 merge sort 的那個 merge。
- **對答案二分,工程上到處都是。** `git bisect` 就是對 commit 歷史二分,判定函數是「這個版本有沒有 bug」;壓測找系統上限,是對 QPS 二分,判定函數是「這個流量撐不撐得住」。只要判定是單調的,就不用一個一個試。
- **先排序常常比用 set 快。** 原書下一章會講:很多「找重複、找配對、算頻率」的問題,把陣列排好再掃一遍,比丟進雜湊結構更快也更省記憶體——常數小、快取友善。下一篇再展開。

## 練習

- CSES [Distinct Numbers](https://cses.fi/problemset/task/1621):排序後相鄰比較,或者 `set`——正好對照下一篇。
- CSES [Apartments](https://cses.fi/problemset/task/1084):兩邊都排序,再用兩個指標配對。

## 反思

<!-- TODO(作者):這一段要用作者的真實經驗。候選素材(需要作者確認):
  1. 工作上有沒有「對答案二分」的真實例子——壓測找上限、git bisect 找壞掉的 commit、或其他?
  2. 有沒有踩過自訂比較函式(<= 或不一致的順序)造成排序結果奇怪的坑?
  3. 「先排序再處理」vs「直接用 set / map」在工作上的選擇經驗?
  以下只先放已確認的素材。 -->

### 排序是在替後面的人付錢

上一篇說我工作上用得最多的是估算——看資料量決定這個計算過程行不行。排序是那個估算裡最常出現的一項:一張幾百萬筆的表,「先排好再做」跟「每一筆都去找」常常就是幾秒和幾小時的差別。索引的本質就是資料庫替你把這件事先做掉、而且維護著。

這章讓我把這件事講得更乾淨:**排序的成本是 $n \log n$,但它買到的是之後每一次查詢都變成 $\log n$。** 查一次,不划算;查很多次,排序就是最便宜的投資。這也是為什麼我看到一段程式在迴圈裡對同一份資料反覆線性搜尋,第一個反應不是「換個資料結構」,而是「先排好再說」。
