---
title: "選容器就是選複雜度:list、set、heapq,以及為什麼先排序常常更快"
date: 2026-10-16
category: tech
description: "CPHB 第 4 章講 C++ 標準函式庫的資料結構;這篇換成 Python 的 list、set / dict、heapq、deque,外加一個 Python 沒有的東西:平衡樹。核心只有一個問題——這個容器哪些操作是便宜的?一張表把它畫出來,再用兩個動畫看 list 為什麼 append 是攤銷 O(1)、以及原書那個「排序比 set 快十倍」的實驗在講什麼。"
tags:
  - algorithms
  - cphb
  - data-structures
  - python
  - book-notes
series: "Competitive Programmer's Handbook 讀書筆記"
seriesOrder: 3
comments: true
draft: false
---
CPHB 第 4 章是一章「工具介紹」:C++ 標準函式庫裡的 `vector`、`set`、`map`、`priority_queue`、`deque`、`bitset`。原書把它寫得很像使用手冊,但開頭有一句話比手冊重要得多:**選資料結構,關鍵的問題是「這個結構裡,哪些操作是便宜的?」** 每個容器都只對幾種操作便宜,其他的要嘛貴、要嘛做不到。你選的不是容器,是接下來每一步要付的價錢。

這篇照原書的順序走,但把 C++ 換成 Python:動態陣列(`list`)、集合與映射(`set` / `dict`)、其他結構(`deque`、`heapq`、位元),最後是原書那個很有意思的實驗——「用資料結構」跟「先排序」解同一題,誰快。

## 一張表:哪些操作便宜

先把全章濃縮成一張表。列是你的程式會做的操作,欄是 Python 的容器,綠色是便宜的。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 322" role="img" aria-label="一張操作對容器的複雜度表。列是七種操作:尾端加入或移除、前端加入或移除、用索引取值、查某個值在不在、最小或最大、大於等於 x 的最小元素、照順序走訪。欄是五種 Python 容器:list、排好序的 list 加 bisect、set 或 dict、heapq、deque。綠色格子是便宜的操作,O(1) 或 O(log n)。沒有一個容器全綠:list 索引快但查值慢,set 查值快但沒有順序,排好序的 list 查值和找鄰居快但插入慢,heapq 只有最小值快,deque 兩端快但索引慢。選容器,就是選哪幾格要綠。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="300" y="20" fill="#e6e6e6" font-size="13" font-weight="bold" text-anchor="middle">沒有一個容器全綠——選容器,就是選哪幾格要綠</text>
    <text x="194.0" y="52" fill="#9aa4b2" font-size="11.5" font-weight="bold" text-anchor="middle">list</text>
    <text x="282.0" y="46" fill="#9aa4b2" font-size="10.5" font-weight="bold" text-anchor="middle">list + bisect</text>
    <text x="282.0" y="59" fill="#9aa4b2" font-size="10.5" font-weight="bold" text-anchor="middle">(排好序)</text>
    <text x="370.0" y="52" fill="#9aa4b2" font-size="11.5" font-weight="bold" text-anchor="middle">set / dict</text>
    <text x="458.0" y="52" fill="#9aa4b2" font-size="11.5" font-weight="bold" text-anchor="middle">heapq</text>
    <text x="546.0" y="52" fill="#9aa4b2" font-size="11.5" font-weight="bold" text-anchor="middle">deque</text>
    <text x="142" y="95" fill="#e6e6e6" font-size="11" text-anchor="end">尾端加入 / 移除</text>
    <rect x="152" y="78" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="194.0" y="95" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)*</text>
    <rect x="240" y="78" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="282.0" y="95" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="328" y="78" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="370.0" y="95" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)*</text>
    <rect x="416" y="78" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="458.0" y="95" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(log n)</text>
    <rect x="504" y="78" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="546.0" y="95" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)*</text>
    <text x="142" y="125" fill="#e6e6e6" font-size="11" text-anchor="end">前端加入 / 移除</text>
    <rect x="152" y="108" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="194.0" y="125" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="240" y="108" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="282.0" y="125" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="328" y="108" width="84" height="26" rx="4" fill="none" stroke="#3a4154" stroke-width="1"/>
    <text x="370.0" y="125" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">—</text>
    <rect x="416" y="108" width="84" height="26" rx="4" fill="none" stroke="#3a4154" stroke-width="1"/>
    <text x="458.0" y="125" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">—</text>
    <rect x="504" y="108" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="546.0" y="125" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)*</text>
    <text x="142" y="155" fill="#e6e6e6" font-size="11" text-anchor="end">用索引取值</text>
    <rect x="152" y="138" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="194.0" y="155" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)</text>
    <rect x="240" y="138" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="282.0" y="155" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)</text>
    <rect x="328" y="138" width="84" height="26" rx="4" fill="none" stroke="#3a4154" stroke-width="1"/>
    <text x="370.0" y="155" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">—</text>
    <rect x="416" y="138" width="84" height="26" rx="4" fill="none" stroke="#3a4154" stroke-width="1"/>
    <text x="458.0" y="155" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">—</text>
    <rect x="504" y="138" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="546.0" y="155" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <text x="142" y="185" fill="#e6e6e6" font-size="11" text-anchor="end">查某個值在不在</text>
    <rect x="152" y="168" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="194.0" y="185" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="240" y="168" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="282.0" y="185" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(log n)</text>
    <rect x="328" y="168" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="370.0" y="185" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)*</text>
    <rect x="416" y="168" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="458.0" y="185" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="504" y="168" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="546.0" y="185" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <text x="142" y="215" fill="#e6e6e6" font-size="11" text-anchor="end">最小 / 最大</text>
    <rect x="152" y="198" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="194.0" y="215" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="240" y="198" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="282.0" y="215" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)</text>
    <rect x="328" y="198" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="370.0" y="215" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="416" y="198" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="458.0" y="215" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(1)</text>
    <rect x="504" y="198" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="546.0" y="215" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <text x="142" y="245" fill="#e6e6e6" font-size="11" text-anchor="end">≥ x 的最小元素</text>
    <rect x="152" y="228" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="194.0" y="245" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="240" y="228" width="84" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="282.0" y="245" fill="#54b890" font-size="11" font-weight="bold" text-anchor="middle">O(log n)</text>
    <rect x="328" y="228" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="370.0" y="245" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="416" y="228" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="458.0" y="245" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="504" y="228" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="546.0" y="245" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <text x="142" y="275" fill="#e6e6e6" font-size="11" text-anchor="end">照順序走訪</text>
    <rect x="152" y="258" width="84" height="26" rx="4" fill="none" stroke="#3a4154" stroke-width="1"/>
    <text x="194.0" y="275" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">—</text>
    <rect x="240" y="258" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="282.0" y="275" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n)</text>
    <rect x="328" y="258" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="370.0" y="275" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n log n)</text>
    <rect x="416" y="258" width="84" height="26" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/>
    <text x="458.0" y="275" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">O(n log n)</text>
    <rect x="504" y="258" width="84" height="26" rx="4" fill="none" stroke="#3a4154" stroke-width="1"/>
    <text x="546.0" y="275" fill="#9aa4b2" font-size="11" font-weight="normal" text-anchor="middle">—</text>
    <text x="300" y="300" fill="#9aa4b2" font-size="10" text-anchor="middle">* 攤銷或平均:list.append 偶爾要搬家、set 最壞會撞雜湊,但平均是 O(1)。— 代表做不到或沒意義。</text>
    <text x="300" y="316" fill="#d6a45c" font-size="10.5" text-anchor="middle">Python 標準函式庫沒有平衡樹:C++ 的 set / map 那一欄,在 Python 是「排好序的 list + bisect」或第三方的 sortedcontainers</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">原書問的那句「這個資料結構哪些操作是便宜的?」畫成一張表。先列出你的程式會做哪幾種操作、各做幾次,再挑那一欄綠得最多的——而不是先挑一個熟的容器再想辦法。</figcaption>
</figure>

這張表有兩件事值得盯著看:

- **沒有一欄全綠。** `list` 索引快、查值慢;`set` 查值快、沒有順序;排好序的 `list` 查值和找鄰居快、插入慢;`heapq` 只有最小值快;`deque` 兩端快、索引慢。選容器就是在這張表上選「我要哪幾格綠」——所以要先列操作、再挑容器,不是反過來。
- **Python 少了一欄。** C++ 的 `set` / `map` 是平衡二元樹:$O(\log n)$ 插入、查值、找「$\ge x$ 的最小元素」、照順序走訪,全部便宜。Python 標準函式庫沒有這個東西。替代品是「排好序的 `list` + `bisect`」(查快、插入 $O(n)$),或第三方的 `sortedcontainers`。這是用 Python 刷題最常撞到的洞,後面會再講。

## 動態陣列:list

原書的 `vector` 在 Python 就是 `list`:尾端加入(`append`)、移除(`pop`)、用索引取值,都很快;`len`、切片、`for x in v` 照用。底下是一塊連續的記憶體,**滿了就開一塊更大的、把舊元素全部搬過去**。搬家很貴——但很少發生,所以 `append` 平均是 $O(1)$。原書只講到這裡;「為什麼很少發生」值得看一次。

<div data-algo="list-growth"><p>(這裡是互動動畫,需要 JavaScript。容量從 1 開始、滿了就倍增;連續 append 11 個元素,只搬家 4 次、共搬 15 個元素,不到 2n。)</p></div>

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 600 236" role="img" aria-label="動態陣列倍增的成本。往右是連續 append,容量 1、2、4、8、16 一路倍增;每次容量滿了就搬一次家,搬的元素數是 1、2、4、8。所有搬家加起來是 1 加 2 加 4 加 8,等於 15,小於兩倍的 n。所以 n 次 append 的總成本不到 3n,攤到每一次是 O(1)。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="300" y="20" fill="#e6e6e6" font-size="13" font-weight="bold" text-anchor="middle">搬家很貴,但搬一次就能撐到下一次倍增</text>
    <rect x="41" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="56.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">1</text>
    <rect x="73" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="88.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">2</text>
    <rect x="105" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="120.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">3</text>
    <rect x="137" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="152.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">4</text>
    <rect x="169" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="184.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">5</text>
    <rect x="201" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="216.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">6</text>
    <rect x="233" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="248.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">7</text>
    <rect x="265" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="280.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">8</text>
    <rect x="297" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="312.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">9</text>
    <rect x="329" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="344.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">10</text>
    <rect x="361" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="376.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">11</text>
    <rect x="393" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="408.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">12</text>
    <rect x="425" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="440.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">13</text>
    <rect x="457" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="472.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">14</text>
    <rect x="489" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="504.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">15</text>
    <rect x="521" y="46" width="30" height="24" rx="3" fill="#262b3a" stroke="#3a4154"/>
    <text x="536.0" y="62" fill="#e6e6e6" font-size="10" text-anchor="middle">16</text>
    <text x="40" y="38" fill="#9aa4b2" font-size="10" text-anchor="start">第幾次 append →</text>
    <text x="552" y="314" fill="#4f6df5" font-size="10" text-anchor="end"></text>
    <line x1="42" y1="82" x2="70" y2="82" stroke="#4f6df5" stroke-width="2"/>
    <text x="56.0" y="96" fill="#4f6df5" font-size="10" text-anchor="middle">1</text>
    <line x1="74" y1="82" x2="102" y2="82" stroke="#4f6df5" stroke-width="2"/>
    <text x="88.0" y="96" fill="#4f6df5" font-size="10" text-anchor="middle">2</text>
    <line x1="106" y1="82" x2="166" y2="82" stroke="#4f6df5" stroke-width="2"/>
    <text x="136.0" y="96" fill="#4f6df5" font-size="10" text-anchor="middle">容量 4</text>
    <line x1="170" y1="82" x2="294" y2="82" stroke="#4f6df5" stroke-width="2"/>
    <text x="232.0" y="96" fill="#4f6df5" font-size="10" text-anchor="middle">容量 8</text>
    <line x1="298" y1="82" x2="550" y2="82" stroke="#4f6df5" stroke-width="2"/>
    <text x="424.0" y="96" fill="#4f6df5" font-size="10" text-anchor="middle">容量 16</text>
    <text x="40" y="116" fill="#9aa4b2" font-size="10" text-anchor="start">容量滿時搬家(搬幾個元素):</text>
    <line x1="72" y1="70" x2="72" y2="140" stroke="#dc4c3f" stroke-width="1.2" stroke-dasharray="3 2"/>
    <rect x="58" y="126" width="28" height="18" rx="4" fill="#3a2626" stroke="#dc4c3f"/>
    <text x="72" y="139" fill="#dc4c3f" font-size="10.5" font-weight="bold" text-anchor="middle">1</text>
    <line x1="104" y1="70" x2="104" y2="140" stroke="#dc4c3f" stroke-width="1.2" stroke-dasharray="3 2"/>
    <rect x="90" y="126" width="28" height="18" rx="4" fill="#3a2626" stroke="#dc4c3f"/>
    <text x="104" y="139" fill="#dc4c3f" font-size="10.5" font-weight="bold" text-anchor="middle">2</text>
    <line x1="168" y1="70" x2="168" y2="140" stroke="#dc4c3f" stroke-width="1.2" stroke-dasharray="3 2"/>
    <rect x="154" y="126" width="28" height="18" rx="4" fill="#3a2626" stroke="#dc4c3f"/>
    <text x="168" y="139" fill="#dc4c3f" font-size="10.5" font-weight="bold" text-anchor="middle">4</text>
    <line x1="296" y1="70" x2="296" y2="140" stroke="#dc4c3f" stroke-width="1.2" stroke-dasharray="3 2"/>
    <rect x="282" y="126" width="28" height="18" rx="4" fill="#3a2626" stroke="#dc4c3f"/>
    <text x="296" y="139" fill="#dc4c3f" font-size="10.5" font-weight="bold" text-anchor="middle">8</text>
    <text x="300" y="174" fill="#e6e6e6" font-size="12" text-anchor="middle">搬家總量 = 1 + 2 + 4 + 8 = 15 < 2 × 16</text>
    <text x="300" y="194" fill="#d6a45c" font-size="12" font-weight="bold" text-anchor="middle">n 次 append 的總成本 < n + 2n = 3n → 攤銷後每次 O(1)</text>
    <text x="300" y="212" fill="#9aa4b2" font-size="10" text-anchor="middle">CPython 的 list 不是倍增,是約 1.125 倍再加一點(0, 4, 8, 16, 24, 32, 40, 52, 64…),搬家更頻繁、省記憶體,結論一樣是攤銷 O(1)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">「平均 O(1)」的來源:倍增讓搬家的次數只有 log n 次,而且每次搬的量加起來是等比級數,永遠不到 2n。</figcaption>
</figure>

這就是**攤銷分析**的第一個例子——單次操作可能很貴,但一整串操作的總成本有上限,平均下來每次便宜。第 7 篇會用同一個想法講雙指標。

CPython 實際的做法不是倍增,是每次多配約 1/8 再加一點(容量序列 0, 4, 8, 16, 24, 32, 40, 52, 64…),搬家比倍增頻繁、但少浪費記憶體;結論不變,`append` 攤銷 $O(1)$。反過來,**`insert(0, x)` 和 `pop(0)` 是 $O(n)$**——整個陣列要往後挪一格。要在前端進出,用 `deque`。

字串在 Python 也像陣列,但**不可變**:`s += "x"` 每次都是新字串,迴圈裡累加字串是 $O(n^2)$。收集片段用 `list`,最後 `"".join`。

## 集合與映射:set / dict

原書的 `set` 是平衡樹、`unordered_set` 是雜湊表;Python 的 `set` 和 `dict` 只有雜湊表這一種:插入、查值、刪除平均 $O(1)$,但**沒有順序**。原書提醒的事 Python 一樣適用:

- 元素不重複。`s.add(5)` 三次,`5 in s` 還是一個;要計數,用 `collections.Counter`(原書的 `multiset` 大致對應它)。
- `dict` 是「索引可以是任何東西的陣列」:`m["banana"] = 3`。原書提到 C++ 的 `m["aybabtu"]` 會偷偷插入一個預設值;Python 的 `dict` 查不到會丟 `KeyError`,要那種行為用 `defaultdict(int)`。
- `dict` 從 3.7 起保證**插入順序**——但那不是排序,不要把它當有序集合用。

```python
seen = set()
seen.add(3); seen.add(2); seen.add(5)
3 in seen                     # True,平均 O(1)
seen.discard(3)               # 不存在也不會丟錯誤

from collections import Counter, defaultdict
cnt = Counter([5, 5, 5, 2])   # Counter({5: 3, 2: 1})
m = defaultdict(int)
m["aybabtu"] += 1             # 不存在就從 0 開始
```

### 「平均 O(1)」的但書

雜湊表的 $O(1)$ 是平均值,前提是鍵的雜湊值分布得開。兩個情況會讓它退化:

- **對抗性輸入。** 原書沒講,但競賽圈很有名:Codeforces 有人會針對 C++ `unordered_map` 構造全部撞在同一格的測資,把 $O(1)$ 打成 $O(n)$。Python 的 `int` 雜湊就是它自己(`hash(5) == 5`),同樣構造得出來;`str` 的雜湊有隨機化(每次啟動不同),比較難打。CSES 的測資不是對抗性的,這件事在那裡不會發生,但 Production 會——下面「上班」段再講。
- **常數。** 每次查值都要算雜湊、找桶、比對;比陣列索引貴很多。這也是原書最後那個實驗的主題。

### Python 沒有的那一欄:平衡樹

原書花了很多篇幅講 `set` 的 iterator、`lower_bound`、`upper_bound`——在有序集合裡找「$\ge x$ 的最小元素」或「最接近 $x$ 的元素」。Python 的 `set` 做不到這些,因為它沒有順序。三條路:

| 做法 | 什麼時候用 |
|---|---|
| `list` 排好序 + `bisect` | 集合建好之後**很少變動**,之後只查:`bisect_left` 就是 `lower_bound`,$O(\log n)$;但中途插入是 $O(n)$ |
| `heapq` | 只需要「最小的那個」:`heappush` / `heappop` 都是 $O(\log n)$,`h[0]` 看最小值 $O(1)$;但查任意值、找鄰居做不到 |
| `sortedcontainers.SortedList` | 需要完整的有序集合(插入、刪除、找鄰居都 $O(\log n)$)。第三方套件,CSES 的判題機沒有裝,比賽裡不能用;自己的專案可以 |

原書「找最接近 $x$ 的元素」那段程式,用 `bisect` 寫是這樣:

```python
from bisect import bisect_left
def nearest(sorted_list, x):
    k = bisect_left(sorted_list, x)        # 第一個 >= x 的位置
    if k == 0:
        return sorted_list[0]
    if k == len(sorted_list):
        return sorted_list[-1]
    a, b = sorted_list[k - 1], sorted_list[k]
    return a if x - a < b - x else b
```

比賽裡遇到「要一邊插入一邊找鄰居」的題,Python 的標準解法通常不是去模擬平衡樹,而是**換一個不需要它的做法**——離線處理、先排序、或用 `heapq` 改寫。這本身就是一種「看結構」。

## 其他結構

- **`deque`**(`collections.deque`):兩端加入、移除都是 $O(1)$,原書說它比 `vector` 慢一點、但兩端都快。Python 的 `deque` 底下是分塊的雙向鏈結串列,**用索引取中間的元素是 $O(n)$**——它是佇列,不是陣列。堆疊直接用 `list`(`append` / `pop`),佇列用 `deque`(`append` / `popleft`)。
- **優先佇列**(`heapq`):原書說它跟有序集合能做的事重疊,但常數小得多,因為 heap 比平衡樹簡單。Python 只有最小堆;要最大堆就把值取負放進去。插入和取出 $O(\log n)$,看最小值 $O(1)$。
- **位元集合**(`bitset`):Python 沒有 `bitset`,但 `int` 沒有位數上限,可以直接當位元陣列用:`s |= 1 << k` 設位元、`s >> k & 1` 讀位元、`bin(s).count("1")` 或 `s.bit_count()`(3.10+)數有幾個 1,`&` / `|` / `^` 對整個集合做交集、聯集、對稱差。第 9 篇位元運算會整篇講它。

```python
from collections import deque
import heapq

q = deque([5, 2]); q.appendleft(3); q.pop(); q.popleft()   # [5]

h = []
for x in [3, 5, 7, 2]:
    heapq.heappush(h, x)
heapq.heappop(h)             # 2,最小的先出來
heapq.heappush(h, -6)        # 要「最大的先出來」就存負數

s = 0
for k in [1, 3, 4, 7]:
    s |= 1 << k              # bitset 0010011010
s.bit_count()                # 4
```

原書最後提到 g++ 的 `indexed_set`(第 $k$ 小、某個值的排名,都 $O(\log n)$)。Python 沒有對應物;要做排名查詢,之後第 8 篇的 Fenwick tree 可以用。

## 原書的實驗:資料結構 vs 排序

這是本章最值得記住的一段。題目:兩個長度 $n$ 的 list $A$、$B$,算有幾個共同元素。原書比了三種做法:

1. 把 $A$ 放進平衡樹 `set`,掃 $B$ 逐一查:$O(n \log n)$。
2. 同上,但用雜湊 `unordered_set`:$O(n)$。
3. 不用資料結構:$A$、$B$ 各自排序,兩個指標一起往右走:$O(n \log n)$。

| $n$ | 1. 平衡樹 set | 2. 雜湊 set | 3. 排序 + 雙指標 |
|---|---|---|---|
| $10^6$ | 1.5 s | 0.3 s | 0.2 s |
| $2 \cdot 10^6$ | 3.7 s | 0.8 s | 0.3 s |
| $3 \cdot 10^6$ | 5.7 s | 1.3 s | 0.5 s |
| $4 \cdot 10^6$ | 7.7 s | 1.7 s | 0.7 s |
| $5 \cdot 10^6$ | 10.0 s | 2.3 s | 0.9 s |

做法 1 和 3 的複雜度一模一樣,都是 $O(n \log n)$,**但 3 快十倍**;連 $O(n)$ 的雜湊版本都輸給它兩倍。原書的解釋:排序是一個簡單的程序、只在開頭做一次,之後全是線性掃描;平衡樹則是整段時間都在維護一棵複雜的結構。雜湊表好一點,但每次查值還是要算雜湊、找桶、比對。

下面的動畫把做法 2 和 3 接著跑一遍。看步數的話兩邊差不多——這正是重點:**複雜度看不出差別,差別在每一步的價錢。** 雙指標的每一步只是一次比較、一次加一。

<div data-algo="common-elements" data-input="5, 2, 8, 9 | 3, 2, 9, 5"><p>(這裡是互動動畫,需要 JavaScript。原書的例子:A = [5, 2, 8, 9]、B = [3, 2, 9, 5],共同元素 3 個。)</p></div>

Python 的情況跟原書的數字不會一樣——Python 的 `set` 是 C 實作的,而 `sort` 也是;真要比,得自己量。但原書的結論在 Python 一樣成立:「找重複、找配對、算交集」這類題,**先排序再掃一遍**往往比把東西丟進 `set` 更快、也更省記憶體——陣列是連續的,快取友善;`set` 的每個元素都是一個散落在記憶體各處的物件。

## 浪費了什麼

這一章沒有「暴力解 → 快解法」的梯子,它講的是另一種浪費:**用錯容器,每一步都在付你不需要付的錢。**

- 用 `list` 做 `x in v`:每次都是 $O(n)$ 線性掃描——你需要的是雜湊,或者先排序。
- 用 `list.insert(0, x)` 做佇列:每次都搬整個陣列——你需要的是 `deque`。
- 用 `set` 維護「目前最小」:每次 `min(s)` 都是 $O(n)$——你需要的是 `heapq`。
- 反過來,用 `set` 查「這些元素有沒有共同的」而且只查一次:平均 $O(1)$ 沒錯,但一次排序加線性掃描更便宜。

結構標記是【順序】的延伸:**資料本身有沒有順序、你需不需要順序**,決定了該用哪一欄。

## 這招在哪裡上班

- **「哪些操作便宜」就是選儲存引擎的問題。** [[redis-data-structures|Redis]] 的 Sorted Set 就是「平衡樹那一欄」(底下是 skip list,同樣 $O(\log n)$ 的有序結構):範圍查詢、排名、找鄰居都便宜;Hash 是「set / dict 那一欄」。資料庫的 B-tree 索引是有序的、雜湊索引不是——[[sql-index|索引那篇]]的「範圍查詢吃不吃得到索引」,就是這張表的「$\ge x$ 的最小元素」那一列。
- **雜湊退化在 Production 是真的。** 對抗性的鍵——攻擊者控制的 query string、JSON 欄位名——曾經讓多種語言的 web 框架被打到 $O(n^2)$(2011 年的 hash flooding)。Python 從 3.3 起隨機化 `str` 的雜湊就是為了這個。選 `dict` 的時候,順便想一下鍵是誰給的。
- **先排序再掃,是批次處理的預設姿勢。** [[ddia-batch|MapReduce 的 shuffle]] 就是把資料排好序再交給 reducer,sort-merge join 就是原書的做法 3 放大到一千台機器。對一次性的大批資料,「排好、掃一遍」幾乎永遠比「建一個結構、一筆一筆查」便宜。

## 反思

### 平衡樹那一欄

我工作上實作過一次自己的資料結構——mobile 上的本機片語前綴搜尋,用壓縮 trie。那時候的問題就是這張表上的問題:要的操作是「給一個前綴,找出所有以它開頭的片語」,`dict` 做不到(沒有順序)、排好序的 `list` 做得到但要掃一段、trie 剛好是為這個操作設計的。細節留到第 24 篇。

這章讓我對 Python 多了一點戒心:**標準函式庫沒有平衡樹**這件事,寫後端的時候幾乎感覺不到,因為那一欄的工作都丟給資料庫的索引了。刷題的時候它就冒出來了——C++ 選手一行 `set` 解掉的題,Python 得換個思路。但換思路這件事本身,就是這個系列想練的東西。
