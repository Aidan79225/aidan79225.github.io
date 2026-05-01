# 拉密計時器 (Rummikub Timer) — Design

**日期**：2026-05-01
**作者**：Aidan
**狀態**：Approved → 待實作

## 目標

在個人 Jekyll 站 (`aidan79225.github.io`) 加一個手機優先的拉密計時頁面，協助玩家輪流計時、時間到自動提醒。

## 使用情境

實體桌遊「拉密 (Rummikub)」3-6 人對戰，每位玩家每回合的思考時間需要限制。手機放桌邊，輪到誰的回合時，背景變成該玩家的顏色並倒數。時間到一直響到下一位玩家點螢幕為止。

## 範圍

### 在範圍內
- 設定 2-6 位玩家
- 設定每回合時間（分 + 秒）
- 玩家固定配色（紫/藍/綠/黃/橘/紅）
- 點擊任意處換人 + 重新倒數
- 時間到嗶聲 + 震動，到下一位點擊為止
- 結束遊戲按鈕（含確認）
- 螢幕保持喚醒（Wake Lock）

### 不在範圍內 (YAGNI)
- 暫停功能
- 玩家自訂顏色 / 名字
- 累計時間統計
- 設定儲存到 localStorage
- 音效自選
- 累計時間池或 increment 制計時

## 整合位置

- **檔案**：`_pages/rummikub_timer.html`
- **layout**：`none` (standalone HTML，不掛 Jekyll header)
- **permalink**：`/rummikub-timer/`
- **navigation**：在 `_data/navigation.yml` 加入口

選擇 `layout: none` 而非 `single` 的原因：game state 需要全螢幕背景換色，Jekyll header 會干擾。風格參考 `parking_lottery.html`。

## 架構

### 檔案結構
單一檔案 inline HTML/CSS/JS，跟既有 `metronome.html` / `parking_lottery.html` 一致。約 250-350 行。

### 兩個 State：Setup / Game

單頁切換，用 `display:none` 切，不做 page navigation。

**Setup state**：
```
拉密計時

人數
[ 2 ][ 3 ][ 4 ][ 5 ][ 6 ]

每回合時間
[ 1 分 ▾]   [ 30 秒 ▾]

玩家配色預覽：● ● ● ●

[        開始遊戲        ]
```

**Game state**：
```
✕                                    ← 左上結束按鈕
        玩家 3
        00:45                        ← 大字倒數
   (整個背景 = 當前玩家顏色)
   點擊任何位置換下一位
```

## 資料模型

```js
let config = {
  playerCount: 4,        // 2-6
  turnSeconds: 90        // = 分*60 + 秒
};

let game = {
  currentPlayer: 0,        // 0-indexed
  remainingMs: 0,
  endTime: 0,              // Date.now() 基準的結束時刻
  intervalId: null,        // 倒數顯示 setInterval
  alarmIntervalId: null,   // 嗶聲 setInterval
  vibrateIntervalId: null,
  audioCtx: null,
  wakeLock: null
};

const COLORS = ['#8957e5','#388bfd','#3fb950','#d29922','#db6d28','#f85149'];
// 玩家 1=紫, 2=藍, 3=綠, 4=黃, 5=橘, 6=紅 (GitHub dark theme 配色)
```

## 計時邏輯

每次「換人」（包括首次「開始遊戲」）：
1. 停止目前倒數 (`clearInterval(intervalId)`)
2. 停止 alarm（嗶聲 + 震動）
3. 首次開始時 `currentPlayer = 0`，否則 `currentPlayer = (currentPlayer + 1) % playerCount`
4. 背景換成 `COLORS[currentPlayer]`，更新「玩家 N」文字
5. `endTime = Date.now() + turnSeconds * 1000`
6. 啟動 `setInterval` 100ms 一次：
   - `remainingMs = endTime - Date.now()`
   - 更新顯示 `MM:SS`
   - 若 `remainingMs <= 0`：顯示 `00:00`、停止倒數 interval、啟動 alarm

**為什麼用 `Date.now()` 基準**：手機螢幕關閉、tab 切走時 `setInterval` 不準。用結束時刻減目前時間，回到前景時自動正確。

## 聲音 + 震動

複用 `metronome.html` 的 Web Audio 模式：

```js
function playBeep() {
  // 800Hz 短音 100ms (跟 metronome 一致)
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.frequency.value = 800;
  gain.gain.setValueAtTime(1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function startAlarm() {
  alarmIntervalId = setInterval(playBeep, 600);
  if (navigator.vibrate) {
    vibrateIntervalId = setInterval(() => navigator.vibrate(200), 600);
  }
}

function stopAlarm() {
  clearInterval(alarmIntervalId); alarmIntervalId = null;
  clearInterval(vibrateIntervalId); vibrateIntervalId = null;
  if (navigator.vibrate) navigator.vibrate(0);
}
```

**iOS 限制**：`AudioContext` 必須在使用者 gesture 後才能 `play`。在「開始遊戲」按鈕第一次按下時 `audioCtx = new AudioContext()`。

**iOS Safari**：不支援 Vibration API，只會有聲音；用 feature detection (`if (navigator.vibrate)`) 安全降級。

## UI 互動表

| 動作 | 觸發 | 行為 |
|---|---|---|
| 設定人數 | 點 2-6 任一按鈕 | 該按鈕高亮 (active class)，更新 `config.playerCount`，更新配色預覽 |
| 設定分鐘 | 分鐘 select (0-5) | 更新 `config.turnSeconds` |
| 設定秒鐘 | 秒鐘 select (0/15/30/45) | 更新 `config.turnSeconds` |
| 開始遊戲 | 大按鈕 | 初始化 audioCtx + wakeLock，切到 game state，玩家 0，開始計時 |
| 換人 | 點 game 畫面任意處 | 停 alarm + 進下一玩家 + 重啟計時 |
| 結束遊戲 | 點左上 ✕ | `confirm("結束遊戲？")` → 停所有 timer/alarm/wakeLock → 回 setup |

**關鍵細節**：結束按鈕的 `onclick` 必須 `event.stopPropagation()`，避免冒泡觸發背景的「換人」。

## Wake Lock（防螢幕鎖）

```js
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); }
  catch {}
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}
```

進 game state → request；回 setup state → release。
頁面回前景 (`visibilitychange` listener) 時重新 request（瀏覽器隱藏頁面時會自動釋放）。

iOS Safari < 16.4 不支援 → feature detection 跳過，不影響功能。

## CSS 重點

- `body { background: #0d1117; color: #c9d1d9; font-family: -apple-system, sans-serif; }` — GitHub dark
- Setup state：`max-width: 400px`、置中、padding 1rem
- Game state：`position: fixed; inset: 0;` 全螢幕
- 背景色 `transition: background-color 0.3s ease`
- 倒數字型：`font-variant-numeric: tabular-nums` 避免數字跳動
- 大字倒數：`font-size: clamp(4rem, 20vw, 8rem)`，置中
- `user-select: none; -webkit-touch-callout: none; touch-action: manipulation;` 防雙擊放大、長按選字
- 人數按鈕、開始按鈕：min-height 48px (觸控友善)
- 結束 ✕ 按鈕：48x48 的圓角方塊，左上 16px 邊距，半透明黑底

## 錯誤處理 / Edge Cases

| 情況 | 處理 |
|---|---|
| 時間設定 = 0 (0分0秒) | 「開始」按鈕 disabled |
| 背景頁面 → 回前景 | `Date.now()` 基準自動正確（已內建） |
| WakeLock 被自動釋放 | `visibilitychange` listener 重 request |
| 切換玩家時還在 alarming | switch 邏輯第一步就 `stopAlarm()` |
| 連點 ✕ | confirm dialog 自然處理 |
| 不支援 Wake Lock / Vibration | feature detection 安全降級 |

## 測試計畫

由於是純前端互動頁，主要靠手動測試：

1. **設定階段**：
   - 切換人數按鈕：高亮正確，配色預覽更新
   - 時間 select：分秒組合正確、0+0 時開始按鈕 disabled
2. **遊戲階段**：
   - 開始 → 玩家 1 紫色背景，倒數正確
   - 點擊 → 換玩家 2 藍色，倒數重置
   - 6 人時點擊到玩家 6 紅色 → 再點回玩家 1 紫色（mod 正確）
   - 倒數到 0 → 嗶聲 + 震動持續
   - 點擊 → 嗶聲停 + 換下一位
3. **結束**：
   - 點 ✕ → confirm → 取消：繼續計時
   - 點 ✕ → confirm → 確認：回設定，alarm 停
   - 結束按鈕點擊不會觸發換人
4. **跨情境**：
   - 螢幕鎖住一段時間後解鎖：時間正確
   - 切到別的 app 30 秒後回來：時間正確
   - iOS Safari：聲音正常、無震動但不爆
   - Android Chrome：聲音 + 震動正常

## Navigation 整合

`_data/navigation.yml` 加入口（依現有結構，可能在 main 或某個 collection 下）：

```yaml
- title: "拉密計時"
  url: /rummikub-timer/
```

實作時確認現有 navigation 結構並依樣加入。

## 實作 checklist (供 plan 階段參考)

- [ ] 建立 `_pages/rummikub_timer.html`，layout: none, permalink: /rummikub-timer/
- [ ] HTML 結構：setup section + game section
- [ ] CSS：dark theme + 全螢幕 game state
- [ ] JS：config / game state、人數按鈕邏輯、時間 select 邏輯
- [ ] JS：開始遊戲、換人、結束按鈕
- [ ] JS：倒數計時 + Date.now 基準
- [ ] JS：Web Audio beep + Vibration alarm
- [ ] JS：Wake Lock + visibilitychange
- [ ] CSS：觸控優化（user-select, touch-action, 按鈕大小）
- [ ] 加 navigation 入口
- [ ] 手機實機測試（至少測一台 Android、一台 iOS 若可用）
