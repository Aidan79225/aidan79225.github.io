---
title: "Redis 持久化:RDB 快照 vs AOF 日誌,資料到底會不會丟"
date: 2026-07-16
category: tech
description: "『Redis 是記憶體資料庫,一斷電資料就全沒』——這句話半對半錯。Redis 有兩套持久化:RDB 定時把整個記憶體拍成快照(小、載入快,但兩次之間會丟),AOF 把每個寫命令記成流水帳(安全,但檔大、載入慢)。這篇講清楚兩種思路的差別、fsync 策略怎麼在『安全』與『效能』之間選位置、fork + copy-on-write 的幕後與記憶體暴增的坑,以及一個誠實的結論:Redis 的持久化不是金融級保證,它是加速層,不是你的真相來源。"
tags:
  - redis
  - persistence
series: "Redis 學習筆記"
seriesOrder: 4
comments: true
draft: false
---
「Redis 是記憶體資料庫,一斷電資料就全沒了」——這句話**半對半錯**。對的是它主要活在記憶體;錯的是它其實有持久化,能把資料寫到磁碟、重啟後還原。只是它的持久化語意比傳統資料庫弱,你得懂才用得對。Redis 給你兩套機制,思路完全不同:**拍快照(RDB)** 和 **記流水帳(AOF)**。

## 兩種思路:拍快照 vs 記流水帳

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 224" role="img" aria-label="RDB 快照與 AOF 日誌的對比。上排 RDB 定時拍全景快照,時間軸上每隔一段時間存一個快照檔,最後一個快照到當機之間的資料會丟失;優點是檔小、載入快、適合備份。下排 AOF 每個寫命令都記帳,時間軸上密集記錄,當機最多丟一個 fsync 間隔;優點更安全,缺點是檔大、載入慢要重放。下方說明混合模式:AOF 開頭放 RDB 快照加後面接增量命令,載入快又丟得少,現代推薦。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">拍快照(RDB) vs 記流水帳(AOF)</text>
    <text x="16" y="52" fill="#4f6df5" font-size="9.4" text-anchor="start" font-weight="bold">RDB 快照</text><text x="16" y="65" fill="#9aa4b2" font-size="7.4" text-anchor="start">定時拍全景</text>
    <line x1="110" y1="58" x2="500" y2="58" stroke="#3a4154" stroke-width="1.4"/>
    <rect x="150" y="50" width="16" height="16" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><rect x="270" y="50" width="16" height="16" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/><rect x="390" y="50" width="16" height="16" rx="3" fill="#26324a" stroke="#4f6df5" stroke-width="1.2"/>
    <rect x="406" y="50" width="80" height="16" rx="2" fill="#3a2626" stroke="#e0733a" stroke-width="1" stroke-dasharray="3 2"/><text x="446" y="62" fill="#e0733a" font-size="6.6" text-anchor="middle">丟失視窗</text>
    <text x="500" y="55" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">⚡</text>
    <text x="290" y="86" fill="#9aa4b2" font-size="7.8" text-anchor="middle">檔小、載入快、適合備份 ✓　｜　兩次快照之間會丟(可能幾分鐘)✗</text>
    <line x1="40" y1="104" x2="540" y2="104" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="16" y="134" fill="#54b890" font-size="9.4" text-anchor="start" font-weight="bold">AOF 日誌</text><text x="16" y="147" fill="#9aa4b2" font-size="7.4" text-anchor="start">每筆寫都記</text>
    <line x1="110" y1="140" x2="500" y2="140" stroke="#3a4154" stroke-width="1.4"/>
    <line x1="130" y1="132" x2="130" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="152" y1="132" x2="152" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="174" y1="132" x2="174" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="196" y1="132" x2="196" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="218" y1="132" x2="218" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="240" y1="132" x2="240" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="262" y1="132" x2="262" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="284" y1="132" x2="284" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="306" y1="132" x2="306" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="328" y1="132" x2="328" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="350" y1="132" x2="350" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="372" y1="132" x2="372" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="394" y1="132" x2="394" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="416" y1="132" x2="416" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="438" y1="132" x2="438" y2="148" stroke="#54b890" stroke-width="1.4"/><line x1="460" y1="132" x2="460" y2="148" stroke="#54b890" stroke-width="1.4"/>
    <text x="500" y="137" fill="#e0733a" font-size="9" text-anchor="middle" font-weight="bold">⚡</text>
    <text x="290" y="168" fill="#9aa4b2" font-size="7.8" text-anchor="middle">更安全(最多丟一個 fsync 間隔)✓　｜　檔大、載入慢(要重放)✗</text>
    <rect x="40" y="184" width="500" height="32" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.2"/>
    <text x="290" y="204" fill="#e6e6e6" font-size="8" text-anchor="middle">混合模式(Redis 4+):AOF 開頭放一個 RDB 快照 + 後面接增量命令 → 載入快又丟得少(現代推薦)</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;"><b style="color:#4f6df5">RDB</b> 像每隔一段時間拍一張全景照:檔案緊湊、重啟載入快、最適合拿來備份;缺點是兩張照片之間發生的事,當機就沒了。<b style="color:#54b890">AOF</b> 像一本流水帳,把每個寫命令都記下來、重啟時重放一遍:安全得多,代價是檔案會長很大、載入要一條條重跑而變慢。現代多半用<b>混合模式</b>——用 RDB 快照當底、AOF 記增量,同時吃到「載入快」和「丟得少」</figcaption>
</figure>

**RDB(Redis Database)** 是快照:在某個時間點,把整個記憶體 dump 成一個緊湊的二進位檔(`dump.rdb`)。**AOF(Append Only File)** 是操作日誌:把每一個**寫命令** append 進一個檔案,重啟時重放這些命令、把狀態重建回來。兩者不是二選一——你可以同時開,靠混合模式各取所長。

## fsync:在「安全」和「效能」之間選位置

AOF 有個關鍵設定:寫進 log 之後,**多久真的 `fsync` 刷到磁碟一次**?這個選擇,直接決定了你「最多會丟多少」。把所有選項排在一條光譜上,你會發現持久化其實沒有「對的答案」,只有「你要在安全和效能之間站哪裡」:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 196" role="img" aria-label="持久化的持久性與效能光譜。從左到右:AOF always 每個命令刷盤丟零筆但最慢,AOF everysec 每秒刷是預設最多丟一秒,混合 RDB 加 AOF 最多丟一秒且載入快,RDB 定時快照丟幾分鐘,關閉持久化崩了全沒但最快。左端持久性高較慢,右端效能高丟較多。越往左越不丟但越慢,越往右越快但丟越多,持久化沒有最好的設定,只有最適合這份資料的位置。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#54b890"/><stop offset="1" stop-color="#e0733a"/></linearGradient></defs>
    <text x="290" y="20" fill="#e6e6e6" font-size="10.5" text-anchor="middle" font-weight="bold">持久化沒有標準答案,只有「你站哪」</text>
    <text x="40" y="46" fill="#54b890" font-size="8.2" text-anchor="start" font-weight="bold">◀ 持久性高 · 較慢</text><text x="540" y="46" fill="#e0733a" font-size="8.2" text-anchor="end" font-weight="bold">效能高 · 丟較多 ▶</text>
    <rect x="40" y="58" width="500" height="12" rx="6" fill="url(#pg)"/>
    <line x1="90" y1="54" x2="90" y2="74" stroke="#e6e6e6" stroke-width="1.3"/><line x1="200" y1="54" x2="200" y2="74" stroke="#e6e6e6" stroke-width="1.3"/><line x1="300" y1="54" x2="300" y2="74" stroke="#e6e6e6" stroke-width="1.3"/><line x1="410" y1="54" x2="410" y2="74" stroke="#e6e6e6" stroke-width="1.3"/><line x1="500" y1="54" x2="500" y2="74" stroke="#e6e6e6" stroke-width="1.3"/>
    <text x="90" y="90" fill="#e6e6e6" font-size="8" text-anchor="middle" font-weight="bold">AOF always</text><text x="90" y="104" fill="#9aa4b2" font-size="7.4" text-anchor="middle">丟 0(每命令刷)</text>
    <text x="200" y="90" fill="#54b890" font-size="8" text-anchor="middle" font-weight="bold">everysec ★預設</text><text x="200" y="104" fill="#9aa4b2" font-size="7.4" text-anchor="middle">≤ 1 秒</text>
    <text x="300" y="90" fill="#e6e6e6" font-size="8" text-anchor="middle" font-weight="bold">混合</text><text x="300" y="104" fill="#9aa4b2" font-size="7.4" text-anchor="middle">≤ 1 秒·載入快</text>
    <text x="410" y="90" fill="#e6e6e6" font-size="8" text-anchor="middle" font-weight="bold">RDB 定時</text><text x="410" y="104" fill="#9aa4b2" font-size="7.4" text-anchor="middle">丟幾分鐘</text>
    <text x="500" y="90" fill="#e6e6e6" font-size="8" text-anchor="middle" font-weight="bold">不持久化</text><text x="500" y="104" fill="#9aa4b2" font-size="7.4" text-anchor="middle">崩了全沒</text>
    <rect x="60" y="130" width="460" height="48" rx="8" fill="#1f2330" stroke="#3a4154" stroke-width="1.2"/>
    <text x="290" y="150" fill="#e6e6e6" font-size="8.6" text-anchor="middle">持久化沒有「最好」的設定,只有「最適合這份資料」的位置:</text>
    <text x="290" y="168" fill="#d6a45c" font-size="8.6" text-anchor="middle" font-weight="bold">越往左越不丟、但越慢;越往右越快、但丟越多</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">AOF 的 <code>fsync</code> 三選一:<b>always</b>(每個寫命令都刷盤,丟 0 但最慢)、<b>everysec</b>(每秒刷一次,預設,最多丟 1 秒——絕大多數場景的甜蜜點)、<b>no</b>(交給作業系統決定,最快但最不安全)。再加上 RDB 與混合模式,你會發現持久化不是「開或不開」的開關,而是一條光譜。選在哪,取決於你這份資料丟一秒、丟一分鐘、還是一筆都不能丟</figcaption>
</figure>

## 幕後:fork + copy-on-write(以及記憶體暴增的坑)

有個問題你可能想過:Redis 是[[redis-single-thread|單執行緒]]的,那它在存快照(`BGSAVE`)或重寫 AOF 時,怎麼**不卡住**主行程對外服務?答案是 **fork + copy-on-write(COW)**:Redis `fork` 出一個子行程,子行程「凍結」一份當下的記憶體快照、慢慢寫檔;主行程繼續服務。父子一開始**共享同一份記憶體頁**,只有當主行程**改到**某一頁時,作業系統才複製那一頁給它改(寫時才複製)——沒被改到的頁完全不佔額外空間。

但這裡藏了一個坑:如果快照期間**寫入非常頻繁**,被改到的頁越來越多、COW 複製的頁也越來越多,**記憶體可能短暫暴增**,最壞情況接近兩倍。所以線上跑 Redis,一定要留足夠的記憶體 headroom,否則 `BGSAVE` 一觸發、記憶體一漲就 OOM——這是很多人「平常好好的、一備份就掛」的元兇。

## 別誤會:Redis 的持久化不是金融級保證

最後一個誠實的結論:即使你開了 AOF `always`,**Redis 也不是要給你「絕不丟任何一筆」的強持久化保證**——它從設計上就是主打速度的。它的持久化,真正的價值在於**「重啟能快速回暖、少回源打爆後面的資料庫」**,而不是拿來當那個輸不起的真相來源。這正好呼應[[redis-intro|第一篇]]的定位:Redis 是**熱資料層**,權威副本應該在後面的資料庫;Redis 裡的資料是**可重建的加速層**。把這個角色擺正,「Redis 掛了資料會不會不見」的焦慮,就從「災難」降級成「回源慢一下」。

## redis-cli:調持久化的三個旋鈕

前面的取捨,落成命令就是三個旋鈕(全都能 `CONFIG SET` 免重啟):

```bash
# 看 / 調設定
CONFIG GET save            # RDB 快照觸發條件,如 "3600 1 300 100 60 10000"
CONFIG SET appendonly yes  # 開 AOF 日誌
CONFIG GET appendfsync     # AOF 刷盤策略:always / everysec(預設) / no
CONFIG REWRITE             # 把當前設定寫回 redis.conf(否則重啟就打回原形)
# 手動觸發與檢查
BGSAVE                     # 背景 fork 存一次 RDB
BGREWRITEAOF               # 壓縮 AOF 檔
LASTSAVE                   # 上次成功存檔的時間戳(拿來確認有沒有卡住)
INFO persistence           # rdb_last_bgsave_status、aof_enabled、aof_last_write_status…
```

`save`(RDB 多久拍一次)、`appendonly`(要不要記流水帳)、`appendfsync`(多常刷盤)——這三個旋鈕就決定了你在「持久性↔效能」光譜上站哪個位置。**記得 `CONFIG SET` 只改當下,要 `CONFIG REWRITE` 才會存回設定檔**,不然重啟就白調了。

## 反思

### 「會不會丟資料」不是 yes/no,是「你願意用多少效能換多少安全」

剛學 Redis 持久化時,我一直想找一個「最正確」的設定,後來才明白這問題問錯了。持久化沒有標準答案,只有**取捨的座標**:你這份資料,丟一秒能接受嗎?丟一分鐘呢?一筆都不能丟嗎?——答案不同,選的機制就不同。做 session 快取,`everysec` 綽綽有餘;做涉及金錢的東西,那它根本不該只活在 Redis 裡。我現在配任何持久化(不只 Redis),都先問這一句「丟多少能忍」,再回頭選設定,而不是盲目追求「最安全」——因為最安全往往也最慢,而你可能根本不需要。**先定義你能接受的失敗,再選技術**,這個順序比什麼都重要。

### fork + copy-on-write 教我的:最優雅的並行,常是「共享 + 寫時才複製」

fork + COW 是我很喜歡的一個設計。它要解的問題是「如何在不停止服務的情況下,對一個一直在變的東西拍一張一致的快照」——而它的答案不是「鎖起來複製一份」(太貴),而是**「先共享,等到有人要改,才複製那一小塊」**。這個「寫時才複製」的思路,其實到處都是:程式語言的不可變資料結構、資料庫的 [[sql-transactions|MVCC]] 快照、甚至 Git 的物件存儲。它們共通的智慧是——**大多數東西其實不會被改,所以別預先複製全部,只為真的發生的改動付代價**。理解了 COW,很多看似神奇的「無鎖快照」就都不神奇了。

### 想清楚 Redis 在架構裡的角色,持久化的焦慮就消一半

我看過不少團隊在「Redis 要多強的持久化」上糾結很久,但其實那份焦慮的根源,是**沒想清楚 Redis 在架構裡是什麼角色**。如果它是加速層、資料能從後面的資料庫重建,那持久化只要「重啟快、少回源」就夠,`everysec` 或混合模式綽綽有餘;如果你發現自己需要它「一筆都不能丟」,那真正的問題不是「該怎麼設持久化」,而是**「這份資料根本不該只放在 Redis」**。很多技術焦慮,追到底都不是技術問題,是**定位問題**——把每個元件在系統裡的職責想清楚,一半的糾結會自己消失。這也是我一路做架構最深的體會:**先分清楚誰是真相、誰是加速,再談怎麼設定。**
