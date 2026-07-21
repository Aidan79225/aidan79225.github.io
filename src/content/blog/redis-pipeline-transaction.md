---
title: "管線、事務與 Lua:省 RTT 與原子性"
date: 2026-07-21
category: tech
tags:
  - redis
  - distributed-systems
series: "Redis 學習筆記"
seriesOrder: 11
comments: true
draft: false
---
有三個東西常被混在一起,其實各解**完全不同**的問題:**pipeline** 解「網路來回太多」、**MULTI/EXEC**(事務)解「一組命令要一起執行不被插隊」、**Lua** 解「要原子、又要帶邏輯」。搞混它們,你會拿 pipeline 當事務用、或以為 Redis 事務像資料庫一樣能 rollback——兩個都會踩坑。這篇把三者的分工一次講清。

## Pipelining:把 N 次往返壓成 1 次

先講最容易被低估的瓶頸:**網路往返(RTT)**。你連打 100 個命令,如果一條一條來——送出、等回應、再送下一條——那就是 **100 個 RTT**。命令本身在 Redis 裡快到微秒級,時間全花在網路來回上。Pipeline 就是把它們**一次打包送出、回應一起收**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="逐條送命令與 pipeline 的對比。左邊逐條:client 送一條命令給 server,等 server 回應,再送下一條,三條命令就是三個來回,總共三倍 RTT。右邊 pipeline:client 把三條命令一次打包送出,server 把三個回應一起送回,只需要一個來回,一倍 RTT。命令本身很快,時間都花在網路來回,所以打包省下大量 RTT。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="pp" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">逐條 N × RTT　vs　pipeline 1 × RTT</text>
    <rect x="10" y="30" width="272" height="176" rx="9" fill="none" stroke="#e0733a" stroke-width="1.3"/>
    <text x="146" y="48" fill="#e0733a" font-size="9.4" text-anchor="middle" font-weight="bold">① 逐條:每條都等一個來回</text>
    <text x="50" y="66" fill="#9aa4b2" font-size="7.6" text-anchor="middle">client</text><text x="242" y="66" fill="#9aa4b2" font-size="7.6" text-anchor="middle">server</text>
    <line x1="50" y1="70" x2="50" y2="192" stroke="#3a4154" stroke-width="1"/><line x1="242" y1="70" x2="242" y2="192" stroke="#3a4154" stroke-width="1"/>
    <line x1="52" y1="80" x2="240" y2="86" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#pp)"/><line x1="240" y1="96" x2="52" y2="102" stroke="#54b890" stroke-width="1.2" marker-end="url(#pp)"/>
    <line x1="52" y1="118" x2="240" y2="124" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#pp)"/><line x1="240" y1="134" x2="52" y2="140" stroke="#54b890" stroke-width="1.2" marker-end="url(#pp)"/>
    <line x1="52" y1="156" x2="240" y2="162" stroke="#4f6df5" stroke-width="1.2" marker-end="url(#pp)"/><line x1="240" y1="172" x2="52" y2="178" stroke="#54b890" stroke-width="1.2" marker-end="url(#pp)"/>
    <text x="146" y="200" fill="#e0733a" font-size="8" text-anchor="middle" font-weight="bold">3 條 = 3 個來回 = 3 × RTT</text>
    <rect x="298" y="30" width="272" height="176" rx="9" fill="none" stroke="#54b890" stroke-width="1.3"/>
    <text x="434" y="48" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">② pipeline:打包成一個來回</text>
    <text x="338" y="66" fill="#9aa4b2" font-size="7.6" text-anchor="middle">client</text><text x="530" y="66" fill="#9aa4b2" font-size="7.6" text-anchor="middle">server</text>
    <line x1="338" y1="70" x2="338" y2="192" stroke="#3a4154" stroke-width="1"/><line x1="530" y1="70" x2="530" y2="192" stroke="#3a4154" stroke-width="1"/>
    <line x1="340" y1="104" x2="528" y2="110" stroke="#4f6df5" stroke-width="2.4" marker-end="url(#pp)"/><text x="434" y="98" fill="#9aa4b2" font-size="7.2" text-anchor="middle">cmd1 ; cmd2 ; cmd3 一次送</text>
    <line x1="528" y1="140" x2="340" y2="146" stroke="#54b890" stroke-width="2.4" marker-end="url(#pp)"/><text x="434" y="162" fill="#9aa4b2" font-size="7.2" text-anchor="middle">三個回應一起收</text>
    <text x="434" y="200" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">3 條 = 1 個來回 = 1 × RTT ✓</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#e0733a">逐條</b>送命令,每一條都得等一個網路來回,N 條就是 N × RTT——瓶頸根本不在 Redis,在網路。<b style="color:#54b890">Pipeline</b> 把多條命令<b>一次打包送出、回應一起收</b>,N 條壓成 1 個來回。但務必記住:<b>pipeline 只是省網路,不保證原子</b>——打包裡的命令之間,別的客戶端照樣能插進來執行。它解的是「來回太多」,不是「要不被打斷」</figcaption>
</figure>

`redis-cli --pipe` 可以把大量命令灌進去,程式裡則是用 client 的 pipeline API。**它跟「原子」一點關係都沒有**——這是最常見的誤會。要「不被插隊」,得看下面兩個。

## MULTI/EXEC:一起執行,但別叫它 ACID

`MULTI` 開一個事務,之後的命令**先排隊不執行**,直到 `EXEC` 才**一次跑完、中間不被別的客戶端插隊**。聽起來像資料庫事務,但有個關鍵差異會嚇到人:**Redis 事務不能 rollback。**

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 212" role="img" aria-label="MULTI EXEC 事務與 WATCH 樂觀鎖。上排:MULTI 之後命令先排隊不執行,EXEC 時一次跑完、中間不被插隊,達成隔離。但沒有 rollback,如果某一條在執行時出錯,例如對一個 String 下 LPUSH,那一條失敗,後面的命令照樣執行。下排:WATCH 盯著一把 key,如果在 EXEC 之前這把 key 被別的客戶端改過,EXEC 就回 nil、整個事務作廢,由你自己重試,這是樂觀鎖 CAS。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="mt" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">MULTI/EXEC:一起執行不被插隊,但不能 rollback</text>
    <rect x="16" y="30" width="66" height="30" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="49" y="49" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">MULTI</text>
    <line x1="82" y1="45" x2="98" y2="45" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#mt)"/>
    <rect x="100" y="30" width="196" height="30" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="198" y="49" fill="#9aa4b2" font-size="8" text-anchor="middle">cmd1 · cmd2 · cmd3(排隊,先不跑)</text>
    <line x1="296" y1="45" x2="312" y2="45" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#mt)"/>
    <rect x="314" y="30" width="62" height="30" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="345" y="49" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">EXEC</text>
    <line x1="376" y1="45" x2="392" y2="45" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#mt)"/>
    <rect x="394" y="30" width="172" height="30" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="480" y="49" fill="#54b890" font-size="8" text-anchor="middle">一次跑完 · 不被插隊 ✓</text>
    <rect x="16" y="72" width="550" height="30" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.4"/><text x="291" y="91" fill="#e05a7d" font-size="8.2" text-anchor="middle" font-weight="bold">✗ 沒有 rollback:某條 runtime 出錯(如對 String 下 LPUSH),那條失敗、後面照跑</text>
    <text x="290" y="128" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">WATCH:樂觀鎖(CAS)</text>
    <rect x="30" y="138" width="140" height="36" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.4"/><text x="100" y="153" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">WATCH balance:1</text><text x="100" y="167" fill="#9aa4b2" font-size="7" text-anchor="middle">EXEC 前先盯著它</text>
    <line x1="170" y1="156" x2="192" y2="156" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#mt)"/>
    <rect x="194" y="138" width="180" height="36" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="284" y="153" fill="#e6e6e6" font-size="8" text-anchor="middle">EXEC 前它被別人改過?</text><text x="284" y="167" fill="#9aa4b2" font-size="7" text-anchor="middle">(有沒有人搶先動手)</text>
    <line x1="374" y1="156" x2="396" y2="156" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#mt)"/>
    <rect x="398" y="138" width="168" height="36" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="482" y="153" fill="#e05a7d" font-size="8" text-anchor="middle">被改 → EXEC 回 nil 作廢</text><text x="482" y="167" fill="#9aa4b2" font-size="7" text-anchor="middle">→ 你自己重試</text>
    <text x="290" y="198" fill="#9aa4b2" font-size="8" text-anchor="middle">MULTI 給你「一起跑、不被插隊」;WATCH 給你「有人搶先就作廢」——但都不是 rollback</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Redis 事務保證的是<b style="color:#54b890">「一起執行、不被插隊」</b>(隔離),而<b style="color:#e05a7d">不是「全成功或全失敗」</b>——某條命令在執行時出錯,前後的命令<b>照樣執行</b>,不會回滾。(唯一例外:命令有語法錯,`EXEC` 前就會整批拒絕。)要處理「讀了再改」的競態,配 <b style="color:#d6a45c">WATCH</b>:盯住一把 key,只要它在 <code>EXEC</code> 前被別人改過,整個事務就<b>作廢回 nil</b>,由你重試——這是樂觀鎖(CAS),不是鎖住別人,是「有人搶先我就重來」</figcaption>
</figure>

落成命令,一個「安全扣款」的樂觀鎖長這樣:

```bash
WATCH balance:1          # 盯著餘額
# ...GET balance:1,在程式裡算出夠不夠扣...
MULTI
DECRBY balance:1 100
EXEC                     # 若 balance:1 在這期間被別人改過 → 回 nil,整批作廢,自己重試
```

## Lua:真正「原子 + 帶邏輯」的那一個

`MULTI` 有個天生的限制:命令是**預先排好隊**的,你**沒辦法「先讀一個值、再依結果決定要不要寫」**——因為排隊時還沒有結果。`WATCH` + 重試能繞,但囉嗦。**Lua 腳本**才是現代的正解:`EVAL` 把整段腳本送到伺服器,靠 [[redis-single-thread|Redis 單執行緒]]的天性,**整段原子執行、中間不被插隊**,而且能在腳本裡讀值、做條件判斷、再寫:

```lua
-- 讀了再判斷再寫,整段原子(這是 MULTI 做不到的條件邏輯)
local b = tonumber(redis.call('GET', KEYS[1]))
if b >= 100 then
  return redis.call('DECRBY', KEYS[1], 100)   -- 夠才扣
else
  return -1                                    -- 不夠就回報
end
```

一段 Lua 同時給你三件事:**省 RTT**(邏輯在伺服器端跑,不用來回)、**原子**(單執行緒保證整段不被打斷)、**帶邏輯**(可以 if/else)。這就是為什麼 [[redis-distributed-lock|分散式鎖]]釋放鎖時,一定要用 Lua 把「比對 token、相符才刪」包成一段——那正是「讀了再依結果決定寫」的原子操作,`MULTI` 給不了。

## 反思

### 「省 RTT」和「原子性」是兩個問題,先分清是哪個

我看過最常見的誤用,是拿 pipeline 當事務——以為把命令打包送出,它們就會「一起、不被打斷」。不會。**pipeline 解的是網路(來回太多),事務/Lua 解的是並行(不想被插隊),這是兩個維度。** 想通這點後,我選工具的第一問永遠是:**我現在痛的是網路,還是並行?** 痛網路(要打幾百條命令)就 pipeline;痛並行(這幾步不能被別人插進來)就 MULTI 或 Lua。把問題歸對類,工具自己就選好了——這比背 API 有用得多。

### Redis 「事務不能 rollback」不是缺陷,是誠實

第一次知道 Redis 事務不會回滾,我有點傻眼——那還叫事務嗎?後來理解那是**刻意的取捨**:Redis 認為命令在執行期出錯,幾乎都是「你程式寫錯了」(對 String 用了 List 命令),那種錯就算 rollback 也救不回邏輯,不如保持引擎簡單快速、不背 rollback 這個重擔。它沒有假裝自己是關聯式資料庫。這件事教我一個看功能的習慣:**別被名字唬住,去看它「實際保證什麼」。** 「事務」「Secret」「鎖」這些詞都自帶光環,但光環底下的真實保證,常常比名字窄。真正要對照完整 ACID 的,還是回去看 [[sql-transactions|資料庫的事務]];Redis 的「事務」,就當它是「一批不被插隊的命令」來用,剛剛好。

### Lua 的哲學:把邏輯搬到資料旁邊

Lua 讓我最欣賞的,是它體現了一個古老又好用的智慧——**與其把資料搬到邏輯那裡(讀回客戶端、判斷、再寫回去,來回三趟還有 race),不如把邏輯搬到資料那裡**,原子地一次跑完。這跟 [[redis-distributed-lock|分散式鎖]]用 Lua 驗 owner、跟資料庫的 stored procedure、甚至 [[infra-spark|Spark 的 data locality]](運算推去資料所在的節點)是同一條脈絡:**移動昂貴、就地處理便宜。** Redis 的單執行緒讓這招格外乾淨——你送過去的整段邏輯,天生就是原子的,不必再操心並行。我現在遇到「讀-改-寫」又怕競態的場景,第一個念頭已經不是加鎖,而是:**能不能把這整段變成一個原子操作,送到資料旁邊跑完?**
