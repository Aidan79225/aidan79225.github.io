---
title: "分散式鎖:從 SETNX 到 Redlock,與那場著名的爭議"
date: 2026-07-20
category: tech
tags:
  - redis
  - distributed-systems
series: "Redis 學習筆記"
seriesOrder: 7
comments: true
draft: false
---
多個行程、多台機器要搶同一個資源(同一時間只准一個人扣庫存、跑一個排程),就需要一把**分散式鎖**。Redis 因為快又原子,常被拿來當這把鎖。但這是個「看起來三行就能寫完、其實坑深到見底」的題目——一路踩下去,還會撞上一場分散式系統界著名的學術爭議。這篇從最天真的寫法,一步步補到 Redlock,再誠實面對那個「Redis 鎖到底安不安全」的問題。

## 一把正確的單機鎖:SET NX PX + Lua 釋放

先看最常見、單一 Redis 節點上「大致正確」的寫法。它的每個零件,都在補一個天真寫法會踩的洞:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 234" role="img" aria-label="一把正確的單機 Redis 鎖的解剖。取得鎖用一行命令 SET lock:res token NX PX 30000。NX 表示只有 key 不存在才設,達成互斥。PX 30000 表示自帶 30 秒 TTL,持有者就算當掉鎖也會自動釋放,不會永久死鎖。token 是一個隨機值,用來證明這把鎖是我的。釋放鎖要用 Lua 腳本,先 GET 比對 token 相等才 DEL,是原子操作,只刪自己的鎖。如果直接 DEL 不驗 token,可能誤刪別人續租的新鎖。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">取得鎖:一行原子命令</text>
    <rect x="70" y="26" width="440" height="30" rx="6" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="46" font-size="11" text-anchor="middle" font-family="monospace"><tspan fill="#9aa4b2">SET lock:res </tspan><tspan fill="#54b890" font-weight="bold">&lt;token&gt;</tspan><tspan fill="#4f6df5" font-weight="bold"> NX</tspan><tspan fill="#d6a45c" font-weight="bold"> PX 30000</tspan></text>
    <rect x="24" y="72" width="172" height="56" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/><text x="110" y="90" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">NX</text><text x="110" y="105" fill="#9aa4b2" font-size="7.6" text-anchor="middle">只有 key 不存在才設</text><text x="110" y="119" fill="#54b890" font-size="7.6" text-anchor="middle">→ 互斥</text>
    <rect x="204" y="72" width="172" height="56" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.4"/><text x="290" y="90" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">PX 30000</text><text x="290" y="105" fill="#9aa4b2" font-size="7.6" text-anchor="middle">自帶 30 秒 TTL</text><text x="290" y="119" fill="#54b890" font-size="7.6" text-anchor="middle">→ 持有者掛了也自動釋放,不死鎖</text>
    <rect x="384" y="72" width="172" height="56" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/><text x="470" y="90" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">&lt;token&gt;</text><text x="470" y="105" fill="#9aa4b2" font-size="7.6" text-anchor="middle">隨機值</text><text x="470" y="119" fill="#54b890" font-size="7.6" text-anchor="middle">→ 標記「這把鎖是我的」</text>
    <text x="290" y="152" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">釋放鎖:要驗 owner(Lua,原子)</text>
    <rect x="30" y="162" width="360" height="52" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="210" y="182" font-size="9" text-anchor="middle" font-family="monospace" fill="#e6e6e6">if GET(key)==token then DEL(key)</text><text x="210" y="201" fill="#54b890" font-size="7.8" text-anchor="middle">GET 與 DEL 必須原子 → 只刪自己的鎖</text>
    <rect x="400" y="162" width="156" height="52" rx="7" fill="#3a2626" stroke="#e05a7d" stroke-width="1.4"/><text x="478" y="182" fill="#e05a7d" font-size="8.2" text-anchor="middle" font-weight="bold">直接 DEL 不驗 token</text><text x="478" y="199" fill="#9aa4b2" font-size="7.6" text-anchor="middle">→ 誤刪別人續租的鎖 ✗</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">三個零件各補一個天真寫法的洞:<b style="color:#4f6df5">NX</b> 達成互斥(只有第一個設得成功);<b style="color:#d6a45c">PX 30000</b> 給鎖一個 TTL,萬一持有者當掉,鎖會自動過期、不會永久死鎖;<b style="color:#54b890">&lt;token&gt;</b> 是隨機值,讓釋放時能<b>驗證身分</b>。釋放一定要用 <b>Lua</b> 把「比對 token、相符才刪」包成一個原子操作——否則若你先 GET、正要 DEL 時鎖剛好過期又被別人拿走,你就<b>誤刪了別人的鎖</b></figcaption>
</figure>

落成命令就這兩段:

```bash
# 取得:NX(互斥)+ PX(TTL)一次完成,token 用 UUID 這種隨機值
SET lock:order:42 3f9a...e1 NX PX 30000
```
```lua
-- 釋放:GET 比對 token,相符才 DEL(整段用 EVAL 跑,保證原子)
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
```

早年還有人用 `SETNX` + 另一句 `EXPIRE` 兩步設鎖——**千萬別**:兩句之間若當掉,鎖就沒了 TTL、變成永久死鎖。`SET ... NX PX` 把「設鎖」和「設過期」合成一個原子命令,正是為了堵這個洞。

## 但這樣就安全了嗎?TTL 鎖的致命假設

到這裡看起來很完整了。但 Martin Kleppmann(《DDIA》作者)提出一個殺傷力極大的質疑:**只要有 TTL,鎖就無法保證真正的互斥。** 問題出在一個誰都躲不掉的東西——**行程暫停(GC 的 stop-the-world、OS 排程、甚至機器被 suspend)**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="TTL 鎖為什麼仍不安全的時間軸。Client A 取得鎖,TTL 30 秒。接著 A 發生一次很長的 stop-the-world GC 暫停,超過 30 秒。暫停期間鎖過期,Client B 合法地取得同一把鎖並開始寫入資源。然後 A 從暫停中醒來,它並不知道鎖已經過期,以為自己還持有,也去寫入資源。於是 A 和 B 同時操作同一個資源,互斥被打破。解法是 fencing token:每次取得鎖給一個單調遞增的號碼,資源端只接受比看過的更大的號碼,A 醒來用舊號碼寫入會被拒絕。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="dl" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="16" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">一次夠長的 GC 暫停,就打破互斥</text>
    <text x="44" y="52" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">A</text>
    <rect x="60" y="42" width="120" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="120" y="56" fill="#e6e6e6" font-size="7.6" text-anchor="middle">取得鎖(TTL 30s)</text>
    <rect x="182" y="42" width="180" height="20" rx="4" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/><text x="272" y="56" fill="#d6a45c" font-size="7.6" text-anchor="middle">STW GC 暫停(&gt; 30s)</text>
    <rect x="364" y="42" width="150" height="20" rx="4" fill="#3a2626" stroke="#e05a7d" stroke-width="1.3"/><text x="439" y="56" fill="#e05a7d" font-size="7.6" text-anchor="middle">醒來,以為還持有 → 寫入 ✗</text>
    <line x1="362" y1="36" x2="362" y2="150" stroke="#e0733a" stroke-width="1" stroke-dasharray="3 3"/><text x="362" y="32" fill="#e0733a" font-size="7.4" text-anchor="middle">TTL 到,鎖過期</text>
    <text x="44" y="96" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">B</text>
    <rect x="366" y="86" width="150" height="20" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="441" y="100" fill="#e6e6e6" font-size="7.6" text-anchor="middle">合法取得同一把鎖 → 寫入</text>
    <rect x="364" y="118" width="152" height="26" rx="5" fill="#3a2626" stroke="#e05a7d" stroke-width="1.4"/><text x="440" y="135" fill="#e05a7d" font-size="8" text-anchor="middle" font-weight="bold">A、B 同時寫 → 互斥破功</text>
    <line x1="60" y1="160" x2="516" y2="160" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#dl)"/><text x="516" y="174" fill="#9aa4b2" font-size="8" text-anchor="end">時間 →</text>
    <rect x="40" y="184" width="500" height="40" rx="8" fill="#1f2330" stroke="#4f6df5" stroke-width="1.3"/><text x="290" y="201" fill="#4f6df5" font-size="8.6" text-anchor="middle" font-weight="bold">解法:fencing token(單調遞增號碼)</text><text x="290" y="216" fill="#9aa4b2" font-size="7.8" text-anchor="middle">資源端只接受比看過的更大的 token → A 拿舊號碼(33)來寫,被擋在資源那一關</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">致命的一幕:<b style="color:#54b890">A</b> 拿到鎖後,發生一次比 TTL 還長的 <b style="color:#d6a45c">GC 暫停</b>;暫停中鎖過期,<b style="color:#54b890">B</b> 合法拿到同一把鎖開始工作;A 醒來卻<b>不知道自己的鎖早沒了</b>,也繼續寫——互斥就這樣破了。關鍵洞見是:<b>鎖的 TTL 建立在「時間」的假設上,而分散式系統裡沒有人能保證時間</b>。真正的防護不在鎖,而在資源端:每次取鎖發一個<b>單調遞增的 fencing token</b>,資源只認更大的號碼,A 醒來用舊號碼寫入會被<b>資源這一關</b>擋下</figcaption>
</figure>

這個 fencing token 的洞見很重要:**鎖只能「盡量」互斥,真正的正確性得靠資源端拒絕過期的寫入。** 而 fencing token 要單調遞增,本身就需要一個可靠的計數器——那又回到了真共識的地盤。

## Redlock,與那場爭議

antirez(Redis 作者)為了讓 Redis 鎖更可靠,提出了 **Redlock**:別只靠一台 Redis,而是準備 **N 台獨立的 master(通常 5 台)**,取鎖時去**跟過半數(≥3 台)**在限定時間內都搶到,才算成功;釋放時對全部節點解鎖。用「過半」來抵抗少數節點掛掉——精神上跟 [[redis-cluster|Cluster 的過半故障轉移]]、[[sre-consensus|共識演算法]]是同一路。

然後就吵起來了。**Kleppmann** 批評:Redlock 依賴「各節點時鐘走得夠準、行程不會長暫停」這類**時序假設**,而這些假設在真實系統裡不成立(GC pause、時鐘飄移),所以 Redlock 給人一種它其實給不了的安全感;要正確性,就得用 fencing token + 真共識系統。**antirez** 反駁:Kleppmann 的攻擊模型太嚴苛,多數實務場景 Redlock 已足夠,且 fencing token 那套一樣有它的假設。這場辯論沒有「誰贏」,但它逼出了一個至今最實用的分野。

## 那個分野:你要的是「效率鎖」還是「正確性鎖」

- **效率鎖(efficiency)**:鎖只是為了**避免重複做白工**——同一個快取重算兩次、同一封信寄兩遍,偶爾破防只是浪費一點資源,不會出大事。**這種鎖,單機 Redis 的 `SET NX PX` 綽綽有餘**,連 Redlock 都未必需要。
- **正確性鎖(correctness)**:**絕對不能有兩個人同時做**——扣款、開發票、轉帳。這種場景下,TTL 鎖的時序假設不夠格,你需要 **fencing token + 真共識**([[zookeeper|ZooKeeper]]、etcd),或乾脆把互斥交給資料庫的交易與唯一約束。

## 反思

### 「看起來三行就能寫完」的東西,往往最深

分散式鎖是我心中「魔鬼藏在細節」的頭號教材。從 `SETNX` 一路補到 Redlock,每一步都在堵一個你一開始根本沒想到的洞:忘了 TTL 會死鎖、忘了驗 token 會誤刪、忘了 GC pause 會破互斥……每個洞單獨看都「顯而易見」,但沒踩過就是想不到。這給我的長期習慣是:**遇到「這不是很簡單嗎」的念頭時,反而要更警覺**——越是被當成三行小事的東西,越可能在你沒看的角落埋著坑。真正的資深,不是會寫那三行,而是知道那三行「還漏了什麼」。

### 效率鎖 vs 正確性鎖,是我做技術決策最常用的一把尺

Kleppmann 那個分野,價值遠超出鎖本身。它教我在用**任何**「盡力而為」的機制前,先問一句:**萬一它偶爾失效,是『浪費一點』還是『出人命』?** 是前者(效率),就大方接受簡單方案的偶爾破防,別過度工程;是後者(正確性),就別自欺欺人地用時序假設換安全感,老實上真共識或資料庫交易。這條線讓我不再糾結「Redis 鎖到底安不安全」這種沒有絕對答案的問題,而是先定位「我這把鎖屬於哪一類」——**問題分類對了,工具的選擇就不再兩難**。

### 那場爭議教我的:工程沒有銀彈,只有假設

antirez 和 Kleppmann 誰對?我的答案是:他們吵的根本不是對錯,是**假設**。Kleppmann 假設一個會 GC pause、時鐘會飄的殘酷世界;antirez 假設一個大致正常的實務環境。假設不同,結論自然不同——而兩個假設在各自的場景裡都成立。這件事徹底改變了我看技術爭論的方式:**與其問「這個方案好不好」,不如問「它建立在什麼假設上、那些假設在我的場景成不成立」**。任何號稱安全、可靠、高效的方案,底下都躺著一組假設;把那組假設攤開來看,比聽誰的結論有用一百倍。這是分散式鎖這個小題目,教給我最大的一課。
