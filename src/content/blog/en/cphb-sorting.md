---
title: "Sorting Is the Cheapest Structure: The Comparison Lower Bound, Counting Sort, and Binary Search"
date: 2026-10-12
category: tech
description: "CPHB chapter 3. Sorting isn't just \"putting things in order\" — it spends n log n once to buy a structure that every later question gets to use. Three things here: why any sort that compares elements can't beat n log n (the decision tree), how counting sort sidesteps it, and why binary search needs not a sorted array but a monotone predicate. With three step-by-step animations: bubble sort, a linear-versus-binary-search race, and counting sort."
tags:
  - algorithms
  - cphb
  - sorting
  - binary-search
  - book-notes
series: "Competitive Programmer's Handbook — Reading Notes"
seriesOrder: 2
comments: true
draft: false
translationOf: cphb-sorting
---
[[cphb-complexity|Part one]] was about reading $n$ and knowing which complexity to write. This part covers CPHB chapter 3: sorting. It's a short chapter, but it hides an idea I find more important than any sorting algorithm — **sorting isn't the goal, it manufactures structure for the problems that come after.** A lot of problems are hard only because the elements are in no particular order; once sorted, duplicates sit next to each other, things that belong together become neighbours, and whatever you're looking for can be closed in on with binary search. You pay $O(n \log n)$, and every step after that gets cheaper.

The post follows the book's three sections: the theory (why $n \log n$, and when you can do better), using it in code (the book does C++; here it's Python), and binary search.

## Why n log n

### Start with the dumbest one: bubble sort, one inversion per swap

The book opens with bubble sort — $n$ rounds, each sweeping left to right and swapping any adjacent pair that's out of order:

```python
for i in range(n):
    for j in range(n - 1):
        if array[j] > array[j + 1]:
            array[j], array[j + 1] = array[j + 1], array[j]
```

Two nested loops, $O(n^2)$. But the book follows it with a lovely argument for why **every sort that only swaps adjacent elements is at least $O(n^2)$**. The tool is the **inversion**: a pair of positions $a < b$ with $\text{array}[a] > \text{array}[b]$ — an earlier element that's larger than a later one. The number of inversions measures how far the array is from sorted: sorted means 0, fully reversed means $n(n-1)/2$.

The key sentence: **swapping two adjacent elements removes exactly one inversion.** No more, no less. So if adjacent swaps are all you have, the worst case needs $n(n-1)/2$ of them — and that's where $O(n^2)$ comes from.

The meter in the animation shows "inversions left". Step through a few: it only drops on a swap step, and it always drops by exactly one.

<div data-algo="bubble-sort"><p>(This is an interactive animation and needs JavaScript. The book's example [1, 3, 8, 2, 9, 2, 5, 6] starts with 9 inversions, and bubble sort makes exactly 9 swaps.)</p></div>

### To go faster, remove many inversions at once: merge sort

An $O(n \log n)$ sort isn't bound by "adjacent swaps only". The book's representative is merge sort, and its shape is recursion:

1. A single element needs no work.
2. Split in the middle.
3. Sort each half recursively.
4. **Merge** the two sorted halves — since both are in order, merging takes $O(n)$ (two pointers walking right, always taking the smaller).

Each level of recursion halves the range, so there are $O(\log n)$ levels; the merging on each level adds up to $O(n)$. Multiply and you get $O(n \log n)$. One merge can carry an element past many others at once — that's why it kills inversions faster than bubble sort.

### The lower bound: if you compare, you can't escape n log n

Can anything beat $n \log n$? The book gives a compact proof: **not as long as your sort works by comparing elements.**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 300" role="img" aria-label="The decision tree of a comparison sort, for three elements a, b, c. Each internal node is one comparison, left for less than, right for greater; the leaves are the six possible sorted outputs, that is 3! permutations. A tree with n! leaves has height at least log2(n!), roughly n log n, so any sort that only compares elements needs at least n log n comparisons in the worst case." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="300" y="22" fill="#e6e6e6" font-size="13" font-weight="bold" text-anchor="middle">Each comparison can only split the remaining permutations in two</text>
    <rect x="268.0" y="45" width="64" height="26" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="300" y="62" fill="#e6e6e6" font-size="11.5" text-anchor="middle">a < b ?</text>
    <rect x="128.0" y="105" width="64" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="160" y="122" fill="#e6e6e6" font-size="11.5" text-anchor="middle">b < c ?</text>
    <rect x="408.0" y="105" width="64" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="440" y="122" fill="#e6e6e6" font-size="11.5" text-anchor="middle">a < c ?</text>
    <line x1="300" y1="71" x2="160" y2="105" stroke="#3a4154" stroke-width="1.2"/>
    <text x="220.0" y="90.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle"><</text>
    <line x1="300" y1="71" x2="440" y2="105" stroke="#3a4154" stroke-width="1.2"/>
    <text x="380.0" y="90.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">></text>
    <rect x="40" y="166" width="60" height="24" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="70" y="182" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">a b c</text>
    <rect x="168.0" y="165" width="64" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="200" y="182" fill="#e6e6e6" font-size="11.5" text-anchor="middle">a < c ?</text>
    <rect x="350" y="166" width="60" height="24" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="380" y="182" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">b a c</text>
    <rect x="488.0" y="165" width="64" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="520" y="182" fill="#e6e6e6" font-size="11.5" text-anchor="middle">b < c ?</text>
    <line x1="160" y1="131" x2="70" y2="165" stroke="#3a4154" stroke-width="1.2"/>
    <text x="105.0" y="150.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle"><</text>
    <line x1="160" y1="131" x2="200" y2="165" stroke="#3a4154" stroke-width="1.2"/>
    <text x="190.0" y="150.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">></text>
    <line x1="440" y1="131" x2="380" y2="165" stroke="#3a4154" stroke-width="1.2"/>
    <text x="400.0" y="150.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle"><</text>
    <line x1="440" y1="131" x2="520" y2="165" stroke="#3a4154" stroke-width="1.2"/>
    <text x="490.0" y="150.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">></text>
    <rect x="120" y="226" width="60" height="24" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="150" y="242" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">a c b</text>
    <rect x="220" y="226" width="60" height="24" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="250" y="242" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">c a b</text>
    <rect x="440" y="226" width="60" height="24" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="470" y="242" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">b c a</text>
    <rect x="540" y="226" width="60" height="24" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="570" y="242" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">c b a</text>
    <line x1="200" y1="191" x2="150" y2="225" stroke="#3a4154" stroke-width="1.2"/>
    <text x="165.0" y="210.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle"><</text>
    <line x1="200" y1="191" x2="250" y2="225" stroke="#3a4154" stroke-width="1.2"/>
    <text x="235.0" y="210.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">></text>
    <line x1="520" y1="191" x2="470" y2="225" stroke="#3a4154" stroke-width="1.2"/>
    <text x="485.0" y="210.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle"><</text>
    <line x1="520" y1="191" x2="570" y2="225" stroke="#3a4154" stroke-width="1.2"/>
    <text x="555.0" y="210.0" fill="#9aa4b2" font-size="9.5" text-anchor="middle">></text>
    <text x="300" y="282" fill="#d6a45c" font-size="12" font-weight="bold" text-anchor="middle">n! leaves → height ≥ log₂(n!) ≈ n log n → at least n log n comparisons in the worst case</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Three elements have 3! = 6 orderings, and each comparison halves the candidates at best, so telling them apart takes at least log₂6 ≈ 2.6, i.e. 3 comparisons. Swap 3 for n and you have the lower bound for comparison sorts — if your sort works by asking “which is bigger”, there is no way around it.</figcaption>
</figure>

Think of sorting as a decision tree: each node asks "$x < y$?" and goes left or right; at a leaf, you know how these $n$ elements are ordered. $n$ elements have $n!$ orderings, so the tree needs at least $n!$ leaves, which makes its height at least $\log_2(n!)$. And $\log_2(n!) \ge (n/2)\log_2(n/2)$, which is roughly $n \log n$. The height of the tree is the worst-case number of comparisons — **lower bound proved.**

What's nice about this proof is that it's algorithm-agnostic. It doesn't say "merge sort can't get faster"; it says "nothing that compares can get faster".

### Around the bound: counting sort, no comparisons, no limit

The bound assumes comparisons. Skip them? **Counting sort** uses each element's value as an index: allocate a count array, count how many times each value appears in one pass, then write them back out in index order in a second pass. $O(n)$, provided the elements are integers in $0 \ldots c$ with $c = O(n)$ — the count array has to fit.

<div data-algo="counting-sort"><p>(This is an interactive animation and needs JavaScript. The book's example [1, 3, 6, 9, 9, 3, 5, 9] is sorted in 8 + 10 = 18 steps without comparing any two elements.)</p></div>

Look at the state right after the first pass: the count array is already a compressed form of the sorted array — how many of each value. The second pass just unpacks it. It's fast because it uses a piece of information comparison sorts never touch: **the value itself is the position.** The price is that the information has to exist in the first place (integers, small range); without it there's nothing to use.

## Sorting in Python

The book is blunt: **you almost never write your own sort in a contest.** The standard library's sort is fast and correct, and yours won't be better. The book talks about C++'s `sort`; in Python that's `sorted` and `list.sort` — Timsort underneath, stable, $O(n \log n)$, and implemented in C, which makes it far faster than any sort you'd write in a Python loop.

```python
v = [4, 2, 5, 3, 5, 8, 3]
sorted(v)                        # [2, 3, 3, 4, 5, 5, 8], returns a new list
v.sort()                         # in place
v.sort(reverse=True)             # descending
"".join(sorted("monkey"))        # strings sort too: "ekmnoy"
```

Sorting your own things works differently from C++: C++ hands `sort` a function that compares two elements, Python hands `sorted` a **`key`** — what to sort each element *by*. Three routes:

| Approach | When |
|---|---|
| Sort directly; tuples compare element by element (first field, then second on ties) | Most cases. For "by A, then by B", pack the data into tuples: `sorted(pairs)` |
| `key=lambda x: (len(x), x)` | Same type, different order — e.g. strings by length first, then lexicographically. A `key` returning a tuple is a multi-level sort key |
| Define `__lt__` on the class | Your own type, with exactly one natural order |

```python
words = ["banana", "kiwi", "apple", "fig"]
sorted(words, key=lambda w: (len(w), w))     # ['fig', 'kiwi', 'apple', 'banana']
sorted(words, key=len, reverse=True)         # longest first
```

The `key` design sidesteps the classic C++ comparator trap: a comparator must be a **strict weak ordering**, `a < a` has to return false, and writing it with `<=` produces garbage on certain inputs. A `key` only maps each element to another value and compares with the built-in `<`, so an inconsistent order is impossible to write. If you really need the old "compare two elements" form, `functools.cmp_to_key` converts it — but you almost never will.

## Binary search

### Finding x in a sorted array

In an unsorted array, finding a value means checking cells one at a time, $O(n)$ — nothing tells you where to look. **Once sorted, the order itself is the navigation.** Binary search checks the middle cell each step: equal means found; larger than $x$ means the whole right half can be skipped; smaller means the whole left half can.

```python
a, b = 0, n - 1
while a <= b:
    k = (a + b) // 2
    if array[k] == x:
        return k          # found
    if array[k] > x:
        b = k - 1
    else:
        a = k + 1
```

The "still possible" region $a \ldots b$ halves every step, hence $O(\log n)$. Below it runs side by side with a linear scan, one comparison per step on each side. Watch the blue region on the right shrink — and the faded cells on the left, which are what the linear scan has "ruled out", growing by one cell per step.

<div data-algo="binary-search-race" data-input="1, 3, 4, 7, 9, 12, 15, 18, 21 | 18"><p>(This is an interactive animation and needs JavaScript. Looking for 18: the linear scan makes 8 comparisons, binary search makes 3.)</p></div>

At $n = 9$ it's 8 against 3. At $n = 10^6$ it's up to $10^6$ against at most 20.

The book also gives a second form: start from the left and **jump**, with a jump length that starts at $n/2$ and halves each round — jump if you can, shrink the stride if you can't. Still $O(\log n)$, but with no notion of "the middle", and it comes back when we do binary lifting on trees (part 16).

```python
k = 0
b = n // 2
while b >= 1:
    while k + b < n and array[k + b] <= x:
        k += b
    b //= 2
if array[k] == x:
    pass                  # found, at k
```

The standard library has it too, in the `bisect` module: `bisect_left` (the first position with value $\ge x$, C++'s `lower_bound`) and `bisect_right` (the first position with value $> x$, C++'s `upper_bound`). Their difference is how many times $x$ occurs:

```python
from bisect import bisect_left, bisect_right
count = bisect_right(array, x) - bisect_left(array, x)
```

### The real binary search: binary search on the answer

This section is the most valuable part of the chapter.

What binary search actually needs is not a sorted array but a **monotone predicate** $\text{ok}(x)$: over the answer space, a run of false followed by all true. As long as that shape holds, the same halving finds **the first true** — which is usually "the smallest feasible answer".

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 250" role="img" aria-label="The two shapes of binary search. Left: finding x in a sorted array, the still-possible region halves at every step, 16 cells to 8, 4, 2, 1, done in four steps. Right: binary search on the answer, where a predicate ok(x) over the answer space is a run of false followed by all true; as long as that monotonicity holds, the same halving finds the first true, and the sorted array is just the special case." style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="150" y="20" fill="#4f6df5" font-size="12.5" font-weight="bold" text-anchor="middle">Find x in a sorted array</text>
    <text x="150" y="36" fill="#9aa4b2" font-size="10.5" text-anchor="middle">the possible region halves every step</text>
    <rect x="20" y="50" width="260" height="18" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="20.0" y="50" width="260.0" height="18" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="288" y="63" fill="#9aa4b2" font-size="10" text-anchor="start">16 cells</text>
    <line x1="150.0" y1="50" x2="150.0" y2="68" stroke="#d6a45c" stroke-width="1.5"/>
    <rect x="20" y="78" width="260" height="18" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="98.0" y="78" width="130.0" height="18" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="288" y="91" fill="#9aa4b2" font-size="10" text-anchor="start">8 cells</text>
    <line x1="163.0" y1="78" x2="163.0" y2="96" stroke="#d6a45c" stroke-width="1.5"/>
    <rect x="20" y="106" width="260" height="18" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="137.0" y="106" width="65.0" height="18" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="288" y="119" fill="#9aa4b2" font-size="10" text-anchor="start">4 cells</text>
    <line x1="169.5" y1="106" x2="169.5" y2="124" stroke="#d6a45c" stroke-width="1.5"/>
    <rect x="20" y="134" width="260" height="18" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="156.5" y="134" width="32.5" height="18" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="288" y="147" fill="#9aa4b2" font-size="10" text-anchor="start">2 cells</text>
    <line x1="172.75" y1="134" x2="172.75" y2="152" stroke="#d6a45c" stroke-width="1.5"/>
    <rect x="20" y="162" width="260" height="18" rx="3" fill="none" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 2"/>
    <rect x="166.25" y="162" width="16.25" height="18" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="288" y="175" fill="#9aa4b2" font-size="10" text-anchor="start">1 cells</text>
    <text x="150" y="200" fill="#e6e6e6" font-size="11" text-anchor="middle">16 → 8 → 4 → 2 → 1: 4 steps = log₂16</text>
    <text x="150" y="216" fill="#9aa4b2" font-size="10" text-anchor="middle">yellow = the middle cell checked this step</text>
    <line x1="318" y1="14" x2="318" y2="236" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 3"/>
    <text x="460" y="20" fill="#54b890" font-size="12.5" font-weight="bold" text-anchor="middle">Binary search on the answer</text>
    <text x="460" y="36" fill="#9aa4b2" font-size="10.5" text-anchor="middle">any ok(x) that goes false… then true… will do</text>
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
    <text x="486.0" y="104" fill="#d6a45c" font-size="10" font-weight="bold" text-anchor="middle">first true = the answer</text>
    <text x="336" y="126" fill="#e6e6e6" font-size="10.5" font-weight="bold" text-anchor="start">Same method, different ok(x):</text>
    <text x="340" y="143" fill="#9aa4b2" font-size="10" text-anchor="start">“is array[x] ≥ target?” → array search</text>
    <text x="340" y="159" fill="#9aa4b2" font-size="10" text-anchor="start">“can k machines finish?” → fewest machines</text>
    <text x="340" y="175" fill="#9aa4b2" font-size="10" text-anchor="start">“is this commit broken?” → git bisect</text>
    <text x="340" y="191" fill="#9aa4b2" font-size="10" text-anchor="start">“does this capacity hold?” → load-test ceiling</text>
    <text x="460" y="213" fill="#d6a45c" font-size="10.5" text-anchor="middle">each call to ok halves the range: O(log range) calls</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">What binary search really needs is not a sorted array but a <b>monotone</b> predicate: somewhere in the answer space there is a line with all false on one side and all true on the other. A sorted array is just the most familiar shape of that line.</figcaption>
</figure>

The book's version uses the jumping form:

```python
x = -1
b = z
while b >= 1:
    while not ok(x + b):
        x += b
    b //= 2
k = x + 1        # the smallest k with ok(k) true
```

$z$ has to be large enough that $\text{ok}(z)$ is known to be true. Every call to $\text{ok}$ halves the range, so there are $O(\log z)$ calls in total; the overall complexity depends on what $\text{ok}$ itself costs — an $O(n)$ $\text{ok}$ makes the whole thing $O(n \log z)$.

This idea turns many "find the smallest / largest X" problems into "decide whether X works": **deciding is usually much easier than solving**, and binary search is what turns the decision into the solution. The same section notes that a function that rises and then falls can be binary-searched too (find the last $x$ with $f(x) < f(x+1)$), but adjacent values must not be equal, or you can't tell which way to go.

## What got wasted

- **bubble sort → merge sort**: a swap moves two adjacent elements and removes one inversion; a merge carries an element past a whole run at once.
- **comparing → counting**: a comparison sort only uses "which is bigger"; counting sort uses "the value is the position", which is how it gets under the $n \log n$ bound — provided that information exists.
- **linear scan → binary search**: a linear scan rules out one cell per step; once sorted, one comparison rules out half.

All three are the same move: **find an order the brute-force solution never used.** This post's structure tags are [order] — sort things first, or notice the answer space is already ordered — and [monotone]: every step of a binary search closes in from one direction only.

## Where this shows up at work

- **A database index is "sort, then binary search".** B-tree leaves are ordered, so an equality lookup is a binary search closing in, and range queries, `ORDER BY` and prefix `LIKE` all benefit — [[sql-index|the post on indexes]] is really this chapter. An LSM tree's SSTables are sorted before they're written, and the [[ddia-storage-engines|compaction merge]] is merge sort's merge.
- **Binary search on the answer is everywhere in engineering.** `git bisect` is binary search over commit history with the predicate "is this version broken?"; a load test looking for a system's ceiling is binary search over QPS with the predicate "does it hold at this rate?". As long as the predicate is monotone, you don't try values one by one.
- **Sorting first often beats a set.** The book's next chapter makes the point: for many "find duplicates, find pairs, count frequencies" problems, sorting the array and scanning it once is faster and leaner than throwing it into a hash structure — smaller constants, cache-friendly. The next post expands on it.

## Reflections

### Sorting pays on behalf of everyone who comes after

Last time I said the thing I use most at work is estimation — reading the size of the data to decide whether a computation is viable. Sorting is the item that shows up most often in that estimate: on a table of a few million rows, "sort first, then process" versus "look each one up" is routinely the difference between seconds and hours. An index is, at bottom, the database doing that sort for you ahead of time — and keeping it maintained.

This chapter let me say it more cleanly: **sorting costs $n \log n$, and what it buys is that every query after it becomes $\log n$.** Query once and it's not worth it; query many times and sorting is the cheapest investment there is. It's also why, when I see code doing a linear search over the same data inside a loop, my first reaction isn't "pick a different data structure" — it's "sort it first".
