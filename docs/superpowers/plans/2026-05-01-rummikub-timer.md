# Rummikub Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first Rummikub turn timer at `/rummikub-timer/` with per-player color backgrounds, tap-to-switch, and a "time's up" alarm that beeps + vibrates until the next tap.

**Architecture:** Single-file inline HTML/CSS/JS Jekyll page (`layout: none`) following the existing `parking_lottery.html` pattern. Two states (Setup / Game) toggled via `display:none`. Countdown uses `Date.now()`-based math so it stays correct after backgrounding. Reuses `metronome.html`'s Web Audio approach for beeps; adds Vibration API + Wake Lock with feature detection.

**Tech Stack:** Jekyll (minimal-mistakes remote_theme, dark skin), vanilla HTML/CSS/JS. No build step. No test framework — site has no automated tests; verification is manual in the browser per task.

**Spec:** `docs/superpowers/specs/2026-05-01-rummikub-timer-design.md`

**Conventions for this plan:**
- Each task ends with a manual verification step + a commit. Refresh the local Jekyll server and check the listed behavior — that is the "test" for this codebase.
- Run shell commands from the repo root: `C:\Users\Aidan\aidan79225.github.io`.
- All commands shown work in PowerShell. The `git commit -m "..."` heredoc-style works via the Bash tool; if running interactively in PowerShell use the single-quoted here-string variant (`@'...'@`).

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `_pages/rummikub_timer.html` | Create | The entire page — HTML + CSS + JS inline |
| `_data/navigation.yml` | Modify | Add "Rummikub Timer" entry under `main` |

Single-file page is intentional: matches existing pages (`metronome.html`, `parking_lottery.html`), no build step, easy to deploy on GitHub Pages, fits in one mental model.

---

## Task 0: Verify local Jekyll serves

This is a one-time setup so subsequent tasks can be verified quickly. Skip if `bundle exec jekyll serve` is already running.

**Files:** none

- [ ] **Step 1: Install gems if needed**

In PowerShell from repo root:
```
bundle install
```
Expected: completes without error (or "Bundle complete!" if already installed).

- [ ] **Step 2: Start the Jekyll dev server**

```
bundle exec jekyll serve --livereload
```
Expected output ends with:
```
Server address: http://127.0.0.1:4000
Server running... press ctrl-c to stop.
```

Leave this running in a separate terminal for the rest of the plan. It auto-rebuilds on file changes (livereload also auto-refreshes the browser).

- [ ] **Step 3: Confirm site loads**

Open http://127.0.0.1:4000 in a browser. Expected: home page renders.

No commit for this task.

---

## Task 1: Page scaffold + navigation entry

Create the empty page so the route works, and add the nav link. Verifies routing before any UI work.

**Files:**
- Create: `_pages/rummikub_timer.html`
- Modify: `_data/navigation.yml`

- [ ] **Step 1: Create the page skeleton**

Create `_pages/rummikub_timer.html` with this exact content:

```html
---
layout: none
permalink: /rummikub-timer/
---
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>拉密計時</title>
  <style>
    body {
      margin: 0;
      background: #0d1117;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", sans-serif;
    }
  </style>
</head>
<body>
  <p>TODO: rummikub timer</p>
</body>
</html>
```

- [ ] **Step 2: Add navigation entry**

Open `_data/navigation.yml`. After the existing `Metronome` entry, add:

```yaml
  - title: "Rummikub Timer"
    url: "/rummikub-timer/"
```

Final file should look like:

```yaml
main:
  - title: "Home"
    url: "/"
  - title: "About"
    url: "/about/"
  - title: "Tech"
    url: "/tech/"
  - title: "Food"
    url: "/food/"
  - title: "Metronome"
    url: "/metronome/"
  - title: "Rummikub Timer"
    url: "/rummikub-timer/"
```

- [ ] **Step 3: Manually verify**

In the browser:
1. Visit http://127.0.0.1:4000/rummikub-timer/ — expected: dark background, "TODO: rummikub timer" text
2. Visit http://127.0.0.1:4000/ — expected: nav now shows "Rummikub Timer" link, clicking it goes to the page

If the page doesn't appear, check Jekyll terminal for build errors (most likely a YAML indentation issue in `navigation.yml`).

- [ ] **Step 4: Commit**

```
git add _pages/rummikub_timer.html _data/navigation.yml
git commit -m "Add empty Rummikub timer page and nav entry"
```

---

## Task 2: Setup state HTML structure + base CSS

Lay out the setup screen (no interactivity yet). Just static markup with proper styling so the next tasks can wire it up.

**Files:**
- Modify: `_pages/rummikub_timer.html`

- [ ] **Step 1: Replace the body and add CSS**

Replace the entire `<style>` block and `<body>` with the following:

```html
  <style>
    body {
      margin: 0;
      background: #0d1117;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", sans-serif;
      -webkit-text-size-adjust: 100%;
    }

    button, select {
      font-family: inherit;
    }

    /* ---------- Setup state ---------- */
    .setup {
      max-width: 400px;
      margin: 0 auto;
      padding: 1.5rem 1rem 3rem;
    }

    .setup h1 {
      text-align: center;
      font-size: 1.75rem;
      margin: 0 0 2rem;
      font-weight: 600;
    }

    .setup .field {
      margin-bottom: 1.75rem;
    }

    .setup .field-label {
      display: block;
      font-size: 0.95rem;
      color: #8b949e;
      margin-bottom: 0.5rem;
    }

    .player-count-row {
      display: flex;
      gap: 0.5rem;
    }

    .player-count-btn {
      flex: 1;
      min-height: 48px;
      background: #161b22;
      color: #c9d1d9;
      border: 1px solid #30363d;
      border-radius: 6px;
      font-size: 1.1rem;
      cursor: pointer;
    }

    .player-count-btn.active {
      background: #1f6feb;
      border-color: #1f6feb;
      color: #fff;
    }

    .time-row {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .time-row select {
      flex: 1;
      min-height: 48px;
      background: #161b22;
      color: #c9d1d9;
      border: 1px solid #30363d;
      border-radius: 6px;
      font-size: 1rem;
      padding: 0 0.75rem;
    }

    .time-row .time-unit {
      color: #8b949e;
      font-size: 0.95rem;
    }

    .color-preview {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .color-dot {
      width: 28px;
      height: 28px;
      border-radius: 50%;
    }

    .start-btn {
      display: block;
      width: 100%;
      min-height: 56px;
      background: #238636;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 1.15rem;
      font-weight: 600;
      cursor: pointer;
    }

    .start-btn:disabled {
      background: #30363d;
      color: #8b949e;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <section class="setup" id="setupView">
    <h1>拉密計時</h1>

    <div class="field">
      <label class="field-label">人數</label>
      <div class="player-count-row" id="playerCountRow">
        <button type="button" class="player-count-btn" data-count="2">2</button>
        <button type="button" class="player-count-btn" data-count="3">3</button>
        <button type="button" class="player-count-btn active" data-count="4">4</button>
        <button type="button" class="player-count-btn" data-count="5">5</button>
        <button type="button" class="player-count-btn" data-count="6">6</button>
      </div>
    </div>

    <div class="field">
      <label class="field-label">每回合時間</label>
      <div class="time-row">
        <select id="minutesSelect">
          <option value="0">0</option>
          <option value="1" selected>1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
        <span class="time-unit">分</span>
        <select id="secondsSelect">
          <option value="0">0</option>
          <option value="15">15</option>
          <option value="30" selected>30</option>
          <option value="45">45</option>
        </select>
        <span class="time-unit">秒</span>
      </div>
    </div>

    <div class="field">
      <label class="field-label">玩家配色</label>
      <div class="color-preview" id="colorPreview"></div>
    </div>

    <button type="button" class="start-btn" id="startBtn">開始遊戲</button>
  </section>
</body>
```

- [ ] **Step 2: Manually verify**

Refresh http://127.0.0.1:4000/rummikub-timer/ in the browser:
1. Title "拉密計時" centered at top
2. "人數" row with 5 buttons (2/3/4/5/6); the "4" button highlighted blue
3. "每回合時間" row with two selects, defaults showing "1 分 30 秒"
4. "玩家配色" label (the dots area is empty for now — JS will fill it next task)
5. "開始遊戲" green button at bottom
6. On a narrow viewport (Chrome devtools mobile mode, e.g. iPhone SE 375px), nothing overflows

- [ ] **Step 3: Commit**

```
git add _pages/rummikub_timer.html
git commit -m "Add Rummikub timer setup view layout"
```

---

## Task 3: Wire up player count buttons + color preview

Add the JS for player count selection. The active button highlights and the color preview reflects the count.

**Files:**
- Modify: `_pages/rummikub_timer.html`

- [ ] **Step 1: Add the script block**

Add this `<script>` block immediately before `</body>`:

```html
  <script>
    // ---------- Constants ----------
    const COLORS = ['#8957e5', '#388bfd', '#3fb950', '#d29922', '#db6d28', '#f85149'];

    // ---------- State ----------
    const config = {
      playerCount: 4,
      turnSeconds: 90
    };

    // ---------- DOM refs ----------
    const playerCountRow = document.getElementById('playerCountRow');
    const colorPreview = document.getElementById('colorPreview');

    // ---------- Setup wiring ----------
    function renderColorPreview() {
      colorPreview.innerHTML = '';
      for (let i = 0; i < config.playerCount; i++) {
        const dot = document.createElement('div');
        dot.className = 'color-dot';
        dot.style.background = COLORS[i];
        colorPreview.appendChild(dot);
      }
    }

    function setPlayerCount(n) {
      config.playerCount = n;
      for (const btn of playerCountRow.querySelectorAll('.player-count-btn')) {
        btn.classList.toggle('active', Number(btn.dataset.count) === n);
      }
      renderColorPreview();
    }

    playerCountRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.player-count-btn');
      if (!btn) return;
      setPlayerCount(Number(btn.dataset.count));
    });

    // ---------- Init ----------
    renderColorPreview();
  </script>
```

- [ ] **Step 2: Manually verify**

Refresh the page:
1. The "玩家配色" row now shows 4 colored dots: purple, blue, green, yellow
2. Click "2" — only 2 dots shown (purple, blue), button "2" highlighted, button "4" un-highlighted
3. Click "6" — 6 dots shown in COLORS order, button "6" highlighted
4. Click "3" — 3 dots, button "3" highlighted

- [ ] **Step 3: Commit**

```
git add _pages/rummikub_timer.html
git commit -m "Wire up player count selection and color preview"
```

---

## Task 4: Wire up time selects + start button validation

The two selects update `config.turnSeconds`; if total time is 0, the start button is disabled.

**Files:**
- Modify: `_pages/rummikub_timer.html`

- [ ] **Step 1: Extend the script**

Inside the existing `<script>` block, just before the `// ---------- Init ----------` line, add:

```js
    const minutesSelect = document.getElementById('minutesSelect');
    const secondsSelect = document.getElementById('secondsSelect');
    const startBtn = document.getElementById('startBtn');

    function updateTurnSeconds() {
      const m = Number(minutesSelect.value);
      const s = Number(secondsSelect.value);
      config.turnSeconds = m * 60 + s;
      startBtn.disabled = config.turnSeconds === 0;
    }

    minutesSelect.addEventListener('change', updateTurnSeconds);
    secondsSelect.addEventListener('change', updateTurnSeconds);
```

Then in the `// ---------- Init ----------` section (at the very bottom), add this line below `renderColorPreview();`:

```js
    updateTurnSeconds();
```

- [ ] **Step 2: Manually verify**

Refresh:
1. Default: 1 分 30 秒 → start button enabled (green)
2. Change minutes to 0, seconds to 0 → start button disabled (grey, not clickable)
3. Change seconds to 15 → start button enabled again
4. Change minutes to 5, seconds to 45 → start button enabled

(You can verify `config.turnSeconds` in devtools console: type `config.turnSeconds` after each change.)

- [ ] **Step 3: Commit**

```
git add _pages/rummikub_timer.html
git commit -m "Wire up time selects and start button enabled state"
```

---

## Task 5: Game state UI scaffold (hidden)

Add the game-state markup and CSS. Keep it hidden — the next task makes it appear.

**Files:**
- Modify: `_pages/rummikub_timer.html`

- [ ] **Step 1: Add CSS for game state**

Inside the existing `<style>` block, append the following at the end (before `</style>`):

```css
    /* ---------- Game state ---------- */
    .game {
      position: fixed;
      inset: 0;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0d1117;
      transition: background-color 0.3s ease;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      touch-action: manipulation;
      cursor: pointer;
    }

    .game.visible {
      display: flex;
    }

    .game .player-label {
      font-size: 1.5rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.85);
      margin-bottom: 1rem;
    }

    .game .countdown {
      font-size: clamp(4rem, 20vw, 8rem);
      font-weight: 700;
      color: #fff;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.05em;
    }

    .game .hint {
      position: absolute;
      bottom: 2rem;
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.6);
    }

    .end-btn {
      position: absolute;
      top: 16px;
      left: 16px;
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.4);
      color: #fff;
      border: none;
      font-size: 1.4rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
```

- [ ] **Step 2: Add the game-state markup**

Inside `<body>`, immediately after the closing `</section>` of `setupView` (and before `<script>`), add:

```html
  <section class="game" id="gameView">
    <button type="button" class="end-btn" id="endBtn" aria-label="結束遊戲">✕</button>
    <div class="player-label" id="playerLabel">玩家 1</div>
    <div class="countdown" id="countdown">00:00</div>
    <div class="hint">點擊任何位置換下一位</div>
  </section>
```

- [ ] **Step 3: Manually verify**

Refresh — the page should look identical to before (game view is `display:none`). To preview the game view, in devtools console run:
```
gameView.classList.add('visible');
gameView.style.background = '#8957e5';
```
Expected: full-screen purple background covers the setup view, "玩家 1" label, big "00:00" countdown, "點擊任何位置換下一位" hint at bottom, "✕" button top-left. After verifying, run:
```
gameView.classList.remove('visible');
gameView.style.background = '';
```

- [ ] **Step 4: Commit**

```
git add _pages/rummikub_timer.html
git commit -m "Add game state UI scaffold (hidden)"
```

---

## Task 6: Start game + countdown rendering

Wire up the start button to enter game state, render the first turn, and tick the countdown using a `Date.now()`-based scheme.

**Files:**
- Modify: `_pages/rummikub_timer.html`

- [ ] **Step 1: Extend the script**

Inside the existing `<script>` block, add the following BEFORE the `// ---------- Init ----------` section:

```js
    // ---------- Game refs ----------
    const setupView = document.getElementById('setupView');
    const gameView = document.getElementById('gameView');
    const playerLabel = document.getElementById('playerLabel');
    const countdownEl = document.getElementById('countdown');

    // ---------- Game state ----------
    const game = {
      currentPlayer: 0,
      endTime: 0,
      tickIntervalId: null,
      timeIsUp: false
    };

    function formatTime(ms) {
      if (ms < 0) ms = 0;
      const totalSec = Math.ceil(ms / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function tick() {
      const remaining = game.endTime - Date.now();
      countdownEl.textContent = formatTime(remaining);
      if (remaining <= 0 && !game.timeIsUp) {
        game.timeIsUp = true;
        clearInterval(game.tickIntervalId);
        game.tickIntervalId = null;
        // Alarm hook in a later task
      }
    }

    function startTurn() {
      game.timeIsUp = false;
      gameView.style.background = COLORS[game.currentPlayer];
      playerLabel.textContent = '玩家 ' + (game.currentPlayer + 1);
      game.endTime = Date.now() + config.turnSeconds * 1000;
      countdownEl.textContent = formatTime(config.turnSeconds * 1000);
      if (game.tickIntervalId) clearInterval(game.tickIntervalId);
      game.tickIntervalId = setInterval(tick, 100);
    }

    function startGame() {
      setupView.style.display = 'none';
      gameView.classList.add('visible');
      game.currentPlayer = 0;
      startTurn();
    }

    startBtn.addEventListener('click', startGame);
```

- [ ] **Step 2: Manually verify**

Refresh:
1. Set time to 0 分 15 秒 → click 開始遊戲
2. Expected: setup disappears, full-screen purple background, "玩家 1" label, countdown ticks down from "00:15" to "00:00"
3. After it reaches "00:00", it stays there (alarm not implemented yet — that's Task 8)
4. Reload the page (no clean-up button yet — that's Task 9)

Try a longer time too: 1 分 0 秒 → countdown shows "01:00", "00:59", etc.

- [ ] **Step 3: Commit**

```
git add _pages/rummikub_timer.html
git commit -m "Implement start game and countdown rendering"
```

---

## Task 7: Tap-to-switch player

Clicking anywhere in the game view advances to the next player and resets the countdown. The `✕` button is added in the next task — for now, the whole game view is the click target.

**Files:**
- Modify: `_pages/rummikub_timer.html`

- [ ] **Step 1: Extend the script**

Inside the existing `<script>` block, add this AFTER the `startBtn.addEventListener('click', startGame);` line:

```js
    function nextPlayer() {
      game.currentPlayer = (game.currentPlayer + 1) % config.playerCount;
      startTurn();
    }

    gameView.addEventListener('click', nextPlayer);
```

- [ ] **Step 2: Manually verify**

Refresh:
1. Default 4 players, set 0 分 15 秒, click 開始遊戲
2. Expected: 玩家 1 紫色背景, 倒數 15 秒
3. Tap anywhere → 玩家 2 藍色, 倒數重置為 15 秒
4. Tap → 玩家 3 綠色, 倒數重置
5. Tap → 玩家 4 黃色
6. Tap → 玩家 1 紫色 (wraps around)
7. Try 6 玩家: setup → 6 → start → tap 5 times → reaches 玩家 6 紅色 → tap once more → 玩家 1 紫色

(Note: don't worry about the ✕ button conflicting — it's not added yet.)

- [ ] **Step 3: Commit**

```
git add _pages/rummikub_timer.html
git commit -m "Implement tap-to-switch player"
```

---

## Task 8: Time-up alarm (Web Audio + Vibration)

When the countdown hits 0, beep every 600ms and vibrate every 600ms (where supported) until the next tap.

**Files:**
- Modify: `_pages/rummikub_timer.html`

- [ ] **Step 1: Extend the script — add audio state and helpers**

Inside the existing `<script>` block, add the following AFTER the line `gameView.addEventListener('click', nextPlayer);`:

```js
    // ---------- Audio + vibration ----------
    let audioCtx = null;
    let alarmIntervalId = null;
    let vibrateIntervalId = null;

    function ensureAudioCtx() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      // Resume if suspended (mobile browsers can suspend after backgrounding)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    function playBeep() {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    }

    function startAlarm() {
      playBeep();
      alarmIntervalId = setInterval(playBeep, 600);
      if (navigator.vibrate) {
        navigator.vibrate(200);
        vibrateIntervalId = setInterval(() => navigator.vibrate(200), 600);
      }
    }

    function stopAlarm() {
      if (alarmIntervalId) {
        clearInterval(alarmIntervalId);
        alarmIntervalId = null;
      }
      if (vibrateIntervalId) {
        clearInterval(vibrateIntervalId);
        vibrateIntervalId = null;
      }
      if (navigator.vibrate) navigator.vibrate(0);
    }
```

- [ ] **Step 2: Wire alarm into tick + nextPlayer**

In the existing `tick()` function, replace this line:
```js
        // Alarm hook in a later task
```
with:
```js
        startAlarm();
```

In the existing `nextPlayer()` function, change it from:
```js
    function nextPlayer() {
      game.currentPlayer = (game.currentPlayer + 1) % config.playerCount;
      startTurn();
    }
```
to:
```js
    function nextPlayer() {
      stopAlarm();
      game.currentPlayer = (game.currentPlayer + 1) % config.playerCount;
      startTurn();
    }
```

In the existing `startGame()` function, change it from:
```js
    function startGame() {
      setupView.style.display = 'none';
      gameView.classList.add('visible');
      game.currentPlayer = 0;
      startTurn();
    }
```
to:
```js
    function startGame() {
      ensureAudioCtx();
      setupView.style.display = 'none';
      gameView.classList.add('visible');
      game.currentPlayer = 0;
      startTurn();
    }
```

- [ ] **Step 3: Manually verify**

Refresh:
1. Set 0 分 15 秒, click 開始遊戲
2. Wait for countdown to reach 00:00
3. Expected: beeps every 600ms (audible), background still purple, label still 玩家 1
4. Tap → beeps stop, background switches to blue (玩家 2), countdown resets to 00:15
5. Wait for 00:00 again → beeps again
6. Tap → beeps stop, switches to 玩家 3
7. (On a phone) the device should vibrate in sync with beeps

Devtools verification: while alarm is running, type `alarmIntervalId` in console → should be a number. After tap, → should be `null`.

- [ ] **Step 4: Commit**

```
git add _pages/rummikub_timer.html
git commit -m "Add time-up alarm: beep + vibrate until next tap"
```

---

## Task 9: End game button (with confirm + cleanup)

The ✕ button shows a confirm dialog; on confirm, stop everything and return to the setup view. The click on ✕ must NOT bubble up to the "next player" handler on `gameView`.

**Files:**
- Modify: `_pages/rummikub_timer.html`

- [ ] **Step 1: Extend the script**

Inside the existing `<script>` block, add these lines AFTER the `stopAlarm` function (and before any later code added in subsequent tasks):

```js
    // ---------- End game ----------
    const endBtn = document.getElementById('endBtn');

    function endGame() {
      if (game.tickIntervalId) {
        clearInterval(game.tickIntervalId);
        game.tickIntervalId = null;
      }
      stopAlarm();
      gameView.classList.remove('visible');
      gameView.style.background = '';
      setupView.style.display = '';
    }

    endBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('結束遊戲？')) {
        endGame();
      }
    });
```

- [ ] **Step 2: Manually verify**

Refresh:
1. Set 0 分 15 秒, click 開始遊戲 → game state appears
2. Tap ✕ button (top-left) → browser confirm dialog "結束遊戲？" appears
3. Click "Cancel" → dialog closes, countdown still running, NO change to player
4. Tap ✕ → dialog → click "OK" → returns to setup view, countdown stops
5. While alarm is beeping (let countdown hit 0), tap ✕ → confirm → OK → alarm stops, returns to setup
6. Critical: tap ✕ then cancel → confirm player did NOT advance (should still be the same color/number)

- [ ] **Step 3: Commit**

```
git add _pages/rummikub_timer.html
git commit -m "Add end game button with confirm dialog"
```

---

## Task 10: Wake Lock + visibility resume

Keep the screen on while in game state. When the page is hidden (user tabs away or screen locks) the wake lock auto-releases — re-request when the page becomes visible again.

**Files:**
- Modify: `_pages/rummikub_timer.html`

- [ ] **Step 1: Extend the script**

Inside the existing `<script>` block, add the following AFTER the end-game block (after the `endBtn.addEventListener` call):

```js
    // ---------- Wake Lock ----------
    let wakeLock = null;

    async function requestWakeLock() {
      if (!('wakeLock' in navigator)) return;
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch (_) {
        wakeLock = null;
      }
    }

    function releaseWakeLock() {
      if (wakeLock) {
        try { wakeLock.release(); } catch (_) {}
        wakeLock = null;
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && gameView.classList.contains('visible')) {
        requestWakeLock();
      }
    });
```

- [ ] **Step 2: Hook wake lock into start/end**

Modify the existing `startGame()` function from:
```js
    function startGame() {
      ensureAudioCtx();
      setupView.style.display = 'none';
      gameView.classList.add('visible');
      game.currentPlayer = 0;
      startTurn();
    }
```
to:
```js
    function startGame() {
      ensureAudioCtx();
      setupView.style.display = 'none';
      gameView.classList.add('visible');
      game.currentPlayer = 0;
      startTurn();
      requestWakeLock();
    }
```

Modify the existing `endGame()` function from:
```js
    function endGame() {
      if (game.tickIntervalId) {
        clearInterval(game.tickIntervalId);
        game.tickIntervalId = null;
      }
      stopAlarm();
      gameView.classList.remove('visible');
      gameView.style.background = '';
      setupView.style.display = '';
    }
```
to:
```js
    function endGame() {
      if (game.tickIntervalId) {
        clearInterval(game.tickIntervalId);
        game.tickIntervalId = null;
      }
      stopAlarm();
      releaseWakeLock();
      gameView.classList.remove('visible');
      gameView.style.background = '';
      setupView.style.display = '';
    }
```

- [ ] **Step 3: Manually verify**

Most of this is hard to test on desktop. The basic checks:

1. Start game in Chrome desktop → in devtools console type `wakeLock` → should be a `WakeLockSentinel` object (not null) on supported browsers
2. End game → `wakeLock` should be null
3. **On a phone**: open `/rummikub-timer/`, start game, set a longer time (e.g. 5 min), put the phone down. Screen should NOT auto-dim/lock. After ending the game, screen lock should resume normal behavior.
4. **Backgrounding**: start game, switch to another tab/app for 30s, return. Countdown should show the correct elapsed time (Date.now-based math, already covered by Task 6 — verify it still works).
5. Check console for errors (there should be none on iOS Safari < 16.4 because of feature detection).

- [ ] **Step 4: Commit**

```
git add _pages/rummikub_timer.html
git commit -m "Keep screen awake during game with Wake Lock API"
```

---

## Task 11: Final manual test pass + polish

Run the full test plan from the spec end-to-end. Fix anything that surfaces. Commit a tidy-up if needed.

**Files:** none (or small fixes if any issue surfaces)

- [ ] **Step 1: Run the spec's test plan**

Open http://127.0.0.1:4000/rummikub-timer/ in a browser sized to mobile (Chrome devtools → Toggle device → iPhone 12 Pro or similar). Run through every item:

**Setup:**
- [ ] Cycle through every player count 2-6 → button highlight + dot count both correct
- [ ] Try every minute value (0-5) and every second value (0/15/30/45) — all combinations work
- [ ] Set 0 分 0 秒 → start button disabled (greyed)
- [ ] Set 0 分 15 秒 → start button enabled

**Game:**
- [ ] Click 開始 → 玩家 1 紫色, 倒數 OK
- [ ] Tap → 玩家 2 藍色, 重置
- [ ] Set 6 玩家, tap through all → 紫→藍→綠→黃→橘→紅→紫 (mod correct)
- [ ] Let countdown hit 00:00 → beeps continue (audible), no errors
- [ ] Tap → beeps stop, next player starts
- [ ] After 00:00, wait ~5 seconds, then tap → beeps stop immediately

**End:**
- [ ] Tap ✕ → confirm → cancel → countdown continues, same player
- [ ] Tap ✕ → confirm → OK → returns to setup view
- [ ] During alarm, tap ✕ → OK → alarm stops, returns to setup
- [ ] After ending, immediately start a new game → fresh state (玩家 1)
- [ ] Tap on ✕ button does NOT also count as "next player" (player number unchanged after cancel)

**Robustness:**
- [ ] Open devtools console, perform all actions above → no errors logged
- [ ] Backgrounding: start game with 5 min timer, switch to another tab for 30s, switch back → countdown shows ~4:30 (not 4:59)
- [ ] No double-tap-zoom on the player count buttons or game view

**Mobile (if possible):**
- [ ] Test on actual Android device (Chrome): vibration works at time-up, screen stays on
- [ ] Test on actual iOS device (Safari): beep works at time-up, no errors (no vibration is OK)

- [ ] **Step 2: Fix any issues found**

If any test fails, fix the underlying code in `_pages/rummikub_timer.html`. Common issues that might surface:
- Click-through on ✕ → check `e.stopPropagation()` is in the handler
- Audio doesn't play on iOS → check `ensureAudioCtx()` is called inside `startGame` (user gesture)
- Number jitter in countdown → check `font-variant-numeric: tabular-nums` is on `.countdown`

- [ ] **Step 3: Commit any fixes (skip if none needed)**

```
git status
```
If clean, no commit needed. If there are fixes:
```
git add _pages/rummikub_timer.html
git commit -m "Polish Rummikub timer after manual test pass"
```

- [ ] **Step 4: Final review of the file**

Open `_pages/rummikub_timer.html` and skim it top to bottom. Confirm:
- File size is roughly 250-350 lines (matches spec estimate)
- No leftover `console.log`, `TODO`, or commented-out blocks
- Sections in order: frontmatter → `<style>` → `<body>` (setup, then game) → `<script>`

Done.
