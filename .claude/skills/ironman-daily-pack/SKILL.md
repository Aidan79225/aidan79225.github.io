---
name: ironman-daily-pack
description: Use when the user asks for the 鐵人賽「當日發文包」, asks which Day to post today, or wants help publishing a docs/ironman/dayNN.md article to ithelp — assemble the day's article and images, run pre-flight checks, deliver the files, and give paste-ready posting instructions.
---

# 鐵人賽當日發文包

## 背景
- 系列:《Re:從零開始做直播代購電商平台》,30 天存稿在 `docs/ironman/`(`README.md` 有 30 天地圖、改編原則與每日 SOP)。
- **開賽日 2026-09-15 = Day 1**,連續 30 天到 2026-10-14;Day N 的發文日 = 2026-09-14 + N 天(台北時區)。
- ithelp 沒有發文 API,使用者**手動貼文**。這個 skill 的職責:把當日要用的一切備好、檢查完、遞到使用者手上——**不自動發文、不碰 ithelp 帳號**。

## 流程

### 1. 定天數
使用者指定 Day N 就用它;沒指定就用今天日期算(N = 今日 − 2026-09-14)。N 不在 1–30 → 說明並跟使用者確認,不要猜。

### 2. Pre-flight 檢查(全部要跑,結果進回覆)
對 `docs/ironman/dayNN.md`(NN 兩位數零填):

- 第一行 H1 取標題(`# Day N|…` 去掉 `# `)——對照 `README.md` 地圖的該列(標題、來源章、圖)是否一致。
- `grep -n '!\['` 列出圖片標記與**行號**;`ls docs/ironman/img/dayNN-*.png` 比對張數——不一致要明確警告(README 標了無圖的天,如 day17、day21,零張是正常)。
- 字數:`wc -m` ≥ 300(規則下限;存稿實際都遠超)。
- 文末 footer 有部落格原文連結(`blog.aidan.tw/blog/`)——自證自創的憑據,不可缺。
- 無 wikilink 殘留(`grep '\[\['`)、無 KaTeX `$`(ithelp 不渲染)。
- 上/下篇銜接詞抽查:拆章的兩篇有「明天」「昨天」字樣時,確認指涉的天數對。

### 3. 連貫性 review(以前 5 天為前提)
讀 `day(N-5)`~`day(N-1)`(存在範圍內)的存稿,以它們為前提快速 review 今天這篇:

- 前情句/預告句的指涉成立(昨天說「明天講 X」,今天真的是 X)。
- 跨日引用(「Day M 說過」)的天數與內容正確。
- 術語、數字、金句與前幾天一致,沒有走樣或重複把同一個梗當新料講。

發現問題 → 照〈邊界〉的規矩先修(blog 原文與存稿同步、開 PR)再遞包;小到不值得改的,在回覆裡註記即可。

### 4. 遞包
`SendUserFile` 一次送 `dayNN.md` + 全部 `dayNN-*.png`,caption 寫標題與每張圖的插入位置摘要。無圖的天只送 md 並說明本日無圖。

### 5. 回覆固定格式
1. **標題欄**要貼的字串(H1 去掉 `# `)。
2. ⚠️ 內文貼上前**刪掉第一行 H1**(標題欄已有,不刪會重複大標)。
3. 每張圖一條:標記所在行號+圖說開頭幾個字;指示「游標移到該行 → 編輯器圖片上傳 → 把圖說搬進新 `![圖說](url)` → 刪舊標記行」。
4. 提醒:發布前預覽(圖、粗體、程式碼區塊、footer 連結);**修改應於當日內完成——評選以主辦單位的當日快照為準;平台之後未必鎖編輯,但賽後刪文=取消完賽資格**;發完貼連結回來核渲染。

### 6. 發文後(使用者貼回連結時)
核四件事:圖有出來、圖說在、粗體/程式碼區塊正常、footer 連結可點。有問題趁當日修。

## 邊界
- 存稿當天要改內容時,照全站規矩:blog 原文與 `dayNN.md` 同步改、開 branch + PR;鐵人賽貼的是 `dayNN.md` 的最終版。
- 進度異常(斷賽、換日補發)不在此 skill 的權限內——攤開現況問使用者。
