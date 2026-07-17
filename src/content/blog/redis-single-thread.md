---
title: "Redis 單執行緒為什麼反而快?——以及 O(N) 命令的地雷"
date: 2026-07-15
category: tech
description: "單執行緒不是慢嗎?為什麼 Redis 刻意單執行緒還能跑出十萬級 QPS?因為它的瓶頸從來不是 CPU,而是記憶體與網路;單執行緒換來的是無鎖、無 race、命令天生原子的簡單與可預測,再靠 event loop + epoll 一個執行緒服務上萬連線。但這個設計有一體兩面的代價:所有命令排同一條隊,任何一個 O(N) 的慢命令(KEYS *、大 HGETALL、刪超大 key)都會卡住所有人。這篇講清楚快的原理、Redis 6 多執行緒到底多了什麼,以及怎麼避開慢命令這個最容易踩的坑。"
tags:
  - redis
  - performance
series: "Redis 學習筆記"
seriesOrder: 3
comments: true
draft: false
---
[[redis-intro|第一篇]]說 Redis 快的原因之一是「單執行緒 + 免鎖」。這聽起來很反直覺——**單執行緒不是慢嗎?** 這篇就把這件事講透:為什麼單執行緒反而快、它換來什麼,以及它一體兩面的代價——一個慢命令會卡住所有人。

## 單執行緒為什麼反而快

關鍵在於:**Redis 的瓶頸從來不是 CPU,而是記憶體與網路。** 它的每個命令都是簡單的記憶體操作,CPU 幾乎永遠有餘力;真正的限制在「資料搬多快、網路吞多快」。既然 CPU 不是瓶頸,多執行緒能帶來的那點平行運算好處就很有限,反而要付出**鎖、競態、context switch**的代價。所以 Redis 反其道而行:乾脆單執行緒,把這些代價全部省掉。

那一個執行緒怎麼同時服務上萬條連線?答案是 **event loop + I/O 多工(epoll)**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 206" role="img" aria-label="Redis 單執行緒加 event loop 的模型。左邊上萬條 client 連線,經過 epoll I/O 多工由一個執行緒盯住全部,命令排成一條隊,再由單執行緒逐一執行、每個命令原子完成。下方說明:Redis 6 的多執行緒只用在讀寫 socket 這些網路雜活,命令執行仍是單執行緒,所以原子性不變。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="st" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">單執行緒 + event loop:一條隊,一個一個處理</text>
    <rect x="10" y="46" width="60" height="18" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="40" y="59" fill="#e6e6e6" font-size="7.4" text-anchor="middle">client</text>
    <rect x="10" y="68" width="60" height="18" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="40" y="81" fill="#e6e6e6" font-size="7.4" text-anchor="middle">client</text>
    <rect x="10" y="90" width="60" height="18" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="40" y="103" fill="#e6e6e6" font-size="7.4" text-anchor="middle">client</text>
    <rect x="10" y="112" width="60" height="18" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="40" y="125" fill="#e6e6e6" font-size="7.4" text-anchor="middle">client</text>
    <text x="40" y="144" fill="#9aa4b2" font-size="7.4" text-anchor="middle">上萬連線</text>
    <line x1="72" y1="88" x2="94" y2="88" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#st)"/>
    <rect x="96" y="60" width="110" height="56" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="151" y="82" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">epoll</text><text x="151" y="97" fill="#e6e6e6" font-size="7.6" text-anchor="middle">I/O 多工</text><text x="151" y="109" fill="#9aa4b2" font-size="7.2" text-anchor="middle">一個執行緒盯全部</text>
    <line x1="206" y1="88" x2="228" y2="88" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#st)"/>
    <rect x="230" y="60" width="158" height="56" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="309" y="78" fill="#e6e6e6" font-size="8.2" text-anchor="middle">命令佇列(一條隊)</text><rect x="242" y="88" width="40" height="20" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="262" y="102" fill="#9aa4b2" font-size="7.2" text-anchor="middle">cmd1</text><rect x="288" y="88" width="40" height="20" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="308" y="102" fill="#9aa4b2" font-size="7.2" text-anchor="middle">cmd2</text><rect x="334" y="88" width="40" height="20" rx="3" fill="#1f2330" stroke="#9aa4b2" stroke-width="1"/><text x="354" y="102" fill="#9aa4b2" font-size="7.2" text-anchor="middle">cmd3</text>
    <line x1="388" y1="88" x2="410" y2="88" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#st)"/>
    <rect x="412" y="60" width="156" height="56" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.5"/><text x="490" y="82" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">單執行緒執行</text><text x="490" y="98" fill="#e6e6e6" font-size="7.8" text-anchor="middle">逐一執行、每個原子</text><text x="490" y="110" fill="#9aa4b2" font-size="7.2" text-anchor="middle">無鎖、無 race</text>
    <text x="290" y="168" fill="#9aa4b2" font-size="8.4" text-anchor="middle">Redis 6 的「多執行緒」只用在讀寫 socket 這些網路雜活——</text>
    <text x="290" y="184" fill="#d6a45c" font-size="8.4" text-anchor="middle" font-weight="bold">命令的「執行」仍是單執行緒,所以原子性、免鎖的好處通通不變</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一個執行緒用一個迴圈,靠 <b>epoll</b> 同時盯住上萬條連線:誰有資料進來就處理誰,把命令排進<b>一條隊</b>,再一個一個執行完。這個模型換來三件事——<b>無鎖</b>(沒有多執行緒搶資源)、<b>無 race</b>(不會有兩個命令同時改同一個 key)、<b>原子</b>(每個命令跑完才輪下一個,天生不可分割)。單執行緒不是妥協,是拿「簡單與可預測」換來的設計優勢</figcaption>
</figure>

## Redis 6 的「多執行緒」是什麼(別誤會)

你可能聽過「Redis 6 開始支援多執行緒了」——這句話很容易讓人誤會。事實是:Redis 6 加的多執行緒,**只用在網路 I/O**(讀取請求、把回應寫回 socket 這些序列化雜活,在高流量下確實佔時間);但**命令的執行本身,依然是單執行緒**。所以它沒有變成「多執行緒資料庫」,前面說的無鎖、原子那些好處全都還在。理解這點很重要:別因為「Redis 現在多執行緒了」就以為慢命令的問題消失了——沒有,執行還是排一條隊。

## 代價:一個慢命令,卡住所有人

單執行緒最大的代價,就藏在「所有命令排同一條隊」這件事裡:**只要有一個命令跑得久,後面所有 client 全部乾等。** 因為沒有第二個執行緒能去服務他們:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="慢命令卡住所有人的對比。上排錯誤示範:KEYS 星號或大 HGETALL 是 O(N),一次做完佔住唯一的執行緒,這段時間 client B、C、D 全部乾等到 timeout,上游 retry 讓情況雪上加霜。下排正確做法:SCAN 游標分批,每次只掃一小批 O(1),中間讓別的命令插空,不卡全場。下方補充:HSCAN、SSCAN、ZSCAN 同理,大 key 刪除用 UNLINK 非同步取代 DEL,開 SLOWLOG 抓慢命令。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">一個慢命令,卡住所有人</text>
    <text x="60" y="52" fill="#e0733a" font-size="8.4" text-anchor="middle" font-weight="bold">❌ 一次做完</text>
    <rect x="118" y="38" width="404" height="28" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.4"/><text x="320" y="56" fill="#e6e6e6" font-size="8.4" text-anchor="middle">KEYS *　掃全庫 O(N)　一次做完(佔住唯一執行緒)</text>
    <text x="290" y="86" fill="#e0733a" font-size="8.2" text-anchor="middle">→ 這段時間 client B、C、D 全部乾等 → timeout → 上游 retry → 雪上加霜</text>
    <line x1="60" y1="100" x2="520" y2="100" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="60" y="128" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">✅ 游標分批</text>
    <rect x="118" y="114" width="76" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="156" y="131" fill="#e6e6e6" font-size="7.6" text-anchor="middle">SCAN(1)</text>
    <rect x="198" y="114" width="60" height="26" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="228" y="131" fill="#9aa4b2" font-size="7.4" text-anchor="middle">別的 cmd</text>
    <rect x="262" y="114" width="76" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="300" y="131" fill="#e6e6e6" font-size="7.6" text-anchor="middle">SCAN(2)</text>
    <rect x="342" y="114" width="60" height="26" rx="4" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="372" y="131" fill="#9aa4b2" font-size="7.4" text-anchor="middle">別的 cmd</text>
    <rect x="406" y="114" width="76" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="444" y="131" fill="#e6e6e6" font-size="7.6" text-anchor="middle">SCAN(3)</text>
    <text x="290" y="160" fill="#54b890" font-size="8.2" text-anchor="middle">每次只掃一小批 O(1),中間讓別的命令插空 → 不卡全場</text>
    <rect x="40" y="176" width="500" height="30" rx="7" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="195" fill="#9aa4b2" font-size="8" text-anchor="middle">同理 HSCAN / SSCAN / ZSCAN;大 key 刪除用 UNLINK(非同步)取代 DEL;開 SLOWLOG 抓慢命令</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">因為只有一條隊,一個 O(N) 的慢命令會讓整台 Redis 在那幾十、幾百毫秒裡對<b>所有</b> client 沒反應。可怕的是後果會放大:客戶端 timeout → 重試 → 更多壓力,一路滾成 <a href="/blog/sre-cascading-failures/">連鎖失效</a>。解法的共通精神是<b>「別一次做完,分批做、讓路」</b>——用 <code>SCAN</code> 家族游標分批取代 <code>KEYS</code>/<code>HGETALL</code> 全撈,用 <code>UNLINK</code> 非同步釋放大 key</figcaption>
</figure>

實務上的地雷清單值得背下來:`KEYS *`(掃全庫)、對大集合做 `HGETALL`/`SMEMBERS`/`LRANGE 0 -1`(整包撈回)、`SORT` 大集合、`DEL` 一個幾百萬元素的大 key(光是釋放記憶體就是 O(N))、以及跑太久的 Lua 腳本。它們的共通點都是 **O(N) 且一次做完**,而在單執行緒的世界裡,「一次做完」就等於「這段時間誰都別想用」。

## 反思

### 單執行緒是「用簡單換可預測」的經典取捨

Redis 的單執行緒設計,是我最愛拿來講「工程取捨」的例子。多數人的直覺是「多執行緒 = 快 = 好」,但 Redis 反過來證明:當你的瓶頸不在 CPU 時,多執行緒帶來的平行好處很小,付出的鎖與競態代價卻很大——**這時候「單執行緒」才是更快、更簡單、更可預測的選擇**。它讓我學會一件事:效能設計不是「把所有能加速的都加上」,而是**先搞清楚瓶頸在哪**,再決定投資方向。加了一堆用不到的平行能力,只會換來一堆用得到的 bug。搞錯瓶頸的優化,是白費力氣裡最貴的一種。

### 慢命令卡全場,是我看過最容易踩、後果最嚴重的 Redis 坑

`KEYS *` 這個坑,我看太多人踩過——在本機資料少的時候跑得飛快,一上 Production、庫裡幾百萬個 key,一行 `KEYS *` 就讓整台 Redis 凍住好幾百毫秒,所有依賴它的服務同時 timeout。最陰險的是它**平常完全沒事**,只在資料長大、且剛好有人手賤下一個全掃命令時爆炸。從那之後我立了兩條規矩:Production **禁用** `KEYS`(用 `SCAN`),以及**任何會碰到「整個集合」的操作都要先問一句「這集合會不會長很大」**。單執行緒的好處是可預測,但這份可預測是有前提的——前提是你沒有往那條唯一的隊裡,塞一個跑不完的命令。

### 看命令的複雜度,是用好任何記憶體系統的基本功

Redis 逼我養成一個好習慣:**用一個命令前,先去看它的時間複雜度。** Redis 文件很貼心,每個命令都標了複雜度——`GET` 是 O(1)、`ZADD` 是 O(log N)、`SMEMBERS` 是 O(N)、`SINTERSTORE` 取決於最小集合。這些不是學術細節,而是「這行命令會不會在半夜搞垮服務」的直接指標。我現在的習慣是:凡是看到 O(N) 或更糟的命令,就自動多想一步「這個 N 會多大、會不會爆」。這個習慣不只用在 Redis——任何你要放進熱路徑的操作,先估它的複雜度與最壞情況,是把「平常很快、偶爾炸掉」這種最難查的問題,擋在上線之前的基本功。
