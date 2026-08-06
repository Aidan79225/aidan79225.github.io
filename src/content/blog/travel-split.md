---
title: "旅遊分帳:把 Google Sheet 當後端,寫一個不會把帳弄丟的分帳工具"
date: 2026-08-05
category: tech
tags:
  - side-project
  - system-design
  - distributed-systems
---
## 前言

每次跟朋友出國,分帳都是同一個劇本:有人先墊機票、有人刷了租車、晚餐又是另一個人付——回國後對著一堆收據算「誰欠誰多少」,算到懷疑人生。市面上的分帳 App 不是要每個人都註冊帳號,就是要大家都裝同一個 App;而現實是,你永遠說服不了全部的同行者為了一趟旅行多裝一個 App。

所以我把需求收斂成三句話:**開網頁就能用、不用註冊、帳不會弄丟**。做出來就是 [旅遊分帳](/travel-split/) 這個工具——前端一頁靜態網頁,「後端」是一份你自己的 Google 試算表。這篇講它背後幾個我覺得值得寫下來的設計。

## 沒有後端的後端

整個系統沒有我維護的伺服器。資料預設存在瀏覽器的 localStorage,純本機就能用;想跟同行的人共享,就開一份自己的 Google 試算表、貼上我提供的 Apps Script 範本、部署成 Web App,拿到一個 `/exec` 網址當同步端點——同一組「行程代碼」的人,就共享同一份帳。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 300" role="img" aria-label="旅遊分帳的架構:三台裝置各自把資料存在 localStorage,透過同一個 Google Apps Script /exec 端點同步,資料落在使用者自己的 Google 試算表。同步循環是:GET 拉雲端、本機合併、POST 推回、伺服器在鎖內再合併一次並回傳權威版本。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <rect x="20" y="30" width="150" height="52" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="95" y="52" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">手機 A</text>
    <text x="95" y="70" fill="#9aa4b2" font-size="10" text-anchor="middle">localStorage</text>
    <rect x="20" y="104" width="150" height="52" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="95" y="126" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">手機 B</text>
    <text x="95" y="144" fill="#9aa4b2" font-size="10" text-anchor="middle">localStorage</text>
    <rect x="20" y="178" width="150" height="52" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="95" y="200" fill="#e6e6e6" font-size="12" text-anchor="middle" font-weight="bold">電腦 C</text>
    <text x="95" y="218" fill="#9aa4b2" font-size="10" text-anchor="middle">localStorage</text>
    <rect x="260" y="90" width="160" height="82" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="340" y="112" fill="#4f6df5" font-size="12" text-anchor="middle" font-weight="bold">Apps Script /exec</text>
    <text x="340" y="130" fill="#9aa4b2" font-size="10" text-anchor="middle">doGet / doPost</text>
    <text x="340" y="148" fill="#e05a7d" font-size="10" text-anchor="middle">LockService:鎖內合併</text>
    <rect x="480" y="90" width="140" height="82" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="550" y="112" fill="#54b890" font-size="12" text-anchor="middle" font-weight="bold">Google 試算表</text>
    <text x="550" y="130" fill="#9aa4b2" font-size="10" text-anchor="middle">trips 表(JSON)</text>
    <text x="550" y="148" fill="#9aa4b2" font-size="10" text-anchor="middle">明細分頁(唯讀鏡像)</text>
    <line x1="170" y1="56" x2="260" y2="110" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="170" y1="130" x2="260" y2="130" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="170" y1="204" x2="260" y2="152" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="420" y1="131" x2="480" y2="131" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="215" y="120" fill="#9aa4b2" font-size="9" text-anchor="middle">同一組行程代碼</text>
    <rect x="20" y="252" width="600" height="34" rx="6" fill="#1f2330" stroke="#3a4154"/>
    <text x="320" y="273" fill="#d6a45c" font-size="11" text-anchor="middle">同步循環:① GET 拉雲端 → ② 本機合併 → ③ POST 推回 → ④ 伺服器鎖內再合併,回傳權威版本</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">沒有我維護的伺服器:資料放使用者自己的試算表,Apps Script 是唯一的「後端」。</figcaption>
</figure>

選 Google Sheet 當後端不是妥協,是算過的:一團旅伴 5–10 人、一天幾十筆支出,這個量級要的不是資料庫,是**零維運、零成本、資料在使用者自己手上**。附帶一個意外的好處——每次同步時順手把支出重建成一個「可讀明細」分頁,不想開網頁的人直接看試算表就好,連工具都不用碰。

## 錢,只能用整數算

分帳工具最不能錯的就是錢,而浮點數是錢的天敵:`0.1 + 0.2 !== 0.3`。所以計算核心把所有金額**換成「分」(0.01 元)做整數運算**,對外才轉回元。

先澄清一個容易誤會的點:「用整數算」不代表結餘會是整數。多幣別換匯後金額天生帶著角分——6991 JPY × 匯率 0.2 就是 1398.20 TWD——結餘自然也會有小數。整數運算避免的是**浮點誤差**,不是小數;它給的保證是:那些小數都是精確的「分」,**每筆分攤加總恰好等於支出總額、所有人的結餘加總恰好歸零**,一分不多不少。反過來,硬把結餘湊成整數(四捨五入到元)才會做出一本加總不歸零的帳。三種分攤模式各有一個「加總守恆」的細節:

- **平均分攤**:總額除不盡時,餘數一分一分地分給排序後的前幾個人——確定性的,同一筆資料誰來算都一樣。
- **權重分攤**:用最大餘數法,小數部分最大的人先拿到剩下的分。
- **指定金額(多幣別)**:每人的原幣金額各自換算成台幣後再加總當作總額——而不是「原幣總額 × 匯率」,否則逐筆四捨五入會產生一分錢的誤差,結餘表永遠差一分,強迫症看了會發作。

結餘算出來後,用貪婪法產生**最少筆數**的還款方案:每次讓欠最多的人還給被欠最多的人。這不是理論最優解的場景——是「回國後大家轉帳轉最少次」的場景,貪婪剛剛好。

## 多人同步:帳可以晚點對,但不能弄丟

真正有趣的問題在同步。多人各自在自己手機上記帳、訊號時有時無,這其實就是一個小型的[[ddia-replication|無主複寫]]系統——衝突不會消失,只會搬家。我的答案是一個 60 行的 CRDT 式合併:

- 每個成員、每筆支出、每筆還款都有 `id` 和 `updatedAt`,合併時**同 id 取較新者**(last-write-wins)。
- 刪除不是真的刪,是留一個 `deleted` **墓碑**——否則「A 刪掉的支出」會在跟 B 合併時復活。
- 合併函式**可交換、可結合、冪等**:不管誰先跟誰合併、合併幾次,最終大家收斂到同一份資料。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 250" role="img" aria-label="兩台裝置離線各自修改同一筆支出:手機 A 在 10:01 把午餐金額改成 1200,手機 B 在 10:03 刪除午餐留下墓碑。合併時同 id 取 updatedAt 較新者,所以無論 A 合併 B 還是 B 合併 A,結果都是墓碑獲勝——順序不影響結果,資料收斂。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <rect x="20" y="20" width="280" height="66" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="160" y="42" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">手機 A(離線)</text>
    <text x="160" y="60" fill="#9aa4b2" font-size="10" text-anchor="middle">午餐 1000 → 1200</text>
    <text x="160" y="76" fill="#d6a45c" font-size="10" text-anchor="middle">updatedAt = 10:01</text>
    <rect x="340" y="20" width="280" height="66" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="480" y="42" fill="#e6e6e6" font-size="11" text-anchor="middle" font-weight="bold">手機 B(離線)</text>
    <text x="480" y="60" fill="#9aa4b2" font-size="10" text-anchor="middle">刪除午餐 → deleted 墓碑 🪦</text>
    <text x="480" y="76" fill="#d6a45c" font-size="10" text-anchor="middle">updatedAt = 10:03</text>
    <line x1="160" y1="86" x2="300" y2="150" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="480" y1="86" x2="340" y2="150" stroke="#9aa4b2" stroke-width="1.2"/>
    <rect x="220" y="150" width="200" height="60" rx="8" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="320" y="172" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">合併:同 id 取較新者</text>
    <text x="320" y="192" fill="#e6e6e6" font-size="10" text-anchor="middle">10:03 墓碑獲勝 → 午餐已刪除</text>
    <text x="320" y="234" fill="#9aa4b2" font-size="10" text-anchor="middle">A∪B = B∪A:合併順序不影響結果,所有裝置最終收斂到同一份帳</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">LWW + 墓碑:衝突不用問人,規則決定;付出的代價是「較舊的那次修改會輸」——對分帳來說完全可接受。</figcaption>
</figure>

但 client 端有合併還不夠。兩個人同時按下同步,各自「拉雲端 → 合併 → 推回」,後寫的人仍然會把先寫的人剛推上去的資料蓋掉——經典的 read-modify-write race。所以合併也要在**伺服器端做一次**:`doPost` 用 Apps Script 的 `LockService` 拿鎖,在鎖內「讀出目前雲端版本 → 跟送來的資料合併 → 寫回」,原子完成,並把合併結果回傳給前端當權威版本。全域一把大鎖聽起來很粗暴,但在「一團人分帳」的量級,它就是正確答案。

前端這側還有兩個小機制讓體驗順:**防抖**——連續記三筆帳只觸發一次同步(1.2 秒);**防重疊**——同步進行中又有新變更,不開第二條請求,記一個 flag 等這輪結束補跑一次。

## 工程之外:人的問題

真的帶團出去用之後,長出來的功能反而都跟演算法無關:

- **記錄者擁有權**:選了「我是誰」之後,你記的支出只有你能改能刪——不是防駭客,是防手滑改到別人的帳。
- **誤刪救回**:刪除後幾秒內可以一鍵復原。墓碑機制在這裡付了第二次紅利:復原只是把 `deleted` 拿掉再更新 `updatedAt`。
- **鎖定行程**:旅程結束、帳對完,一鍵鎖定禁止修改——鎖定狀態本身也走 LWW 合併,誰鎖的、什麼時候鎖的,多裝置間一樣收斂。

這些功能沒有一個是第一版就有的,全是實際用了之後被推著加的。

## 反思

### 量級決定架構,不是品味決定架構

「用 Google Sheet 當後端」這個決定,其實是我平常做架構評審的縮影。評審時我最常問的一句話是:**你的量級是多少?**一團 10 人、一天幾十筆,LockService 一把全域鎖綽綽有餘;同一把鎖搬到工作上的訂單系統就是災難。反過來說,如果我為了「正確的架構」給這個工具配一套資料庫加後端服務,朋友就得先看我把它維運起來——然後這個工具就不會有人用了。架構沒有絕對的好壞,只有跟量級配不配。

### 讀過的書,會在奇怪的地方還你

LWW、墓碑、冪等合併、read-modify-write race——這些全是 DDIA 複寫那幾章的內容。讀的時候覺得那是 Dynamo、Cassandra 等級的問題,離自己很遠;結果第一次真正落地,是在一個分帳網頁上。而且踩的坑一模一樣:早期版本只有 client 端合併,想清楚才發現兩人同時同步照樣互蓋,最後把合併搬進伺服器的鎖裡才閉環。規模差了六個數量級,問題的形狀完全一樣——這是我後來很願意花時間讀「離日常工作很遠」的書的原因。

### Side project 的價值在「完整」

工作上你多半接手一個既有系統的一角;side project 逼你走完整條線——需求取捨、資料模型、併發、錯誤處理、還有上線後被真實使用者(你的朋友)嫌棄然後迭代。擁有權、誤刪救回、鎖定行程,這些「人的功能」在需求清單上永遠排不進前三,但真的用起來,它們才是決定工具會不會被繼續用的東西。這跟做產品是同一件事:演算法決定工具能不能用,**對人的體貼決定工具會不會被用**。

工具在這裡:[旅遊分帳](/travel-split/)。帶著它出一次國,回來你就再也不想用試算表手算了——雖然,它的後端就是一張試算表。
