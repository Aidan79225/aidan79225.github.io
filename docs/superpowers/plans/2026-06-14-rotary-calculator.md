# Rotary-Dial Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a retro rotary-dial calculator — a full vintage desk telephone whose single 17-symbol dial drives a 4-function calculator that evaluates the whole expression on `=` with operator precedence.

**Architecture:** Two pure, fully-tested `.mjs` modules (`calculator.mjs` math engine, `dial-geometry.mjs` dial math) plus a React island (`RotaryCalculator` → `PhoneFrame` + `NixieDisplay` + `RotaryDial`) mounted on a new Astro page and listed in the Tools hub.

**Tech Stack:** Astro 6, React 19 (`@astrojs/react`, `client:load`), Tailwind v4, `node:test` for unit tests. Pure modules in `src/lib/`, components in `src/components/rotary-calculator/`.

**Spec:** `docs/superpowers/specs/2026-06-14-rotary-calculator-design.md`

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/calculator.mjs` | Pure expression engine: token reducer, precedence eval on `=`. No DOM. |
| `src/lib/dial-geometry.mjs` | Pure dial math: hole layout, pointer→angle, rotation clamp, finger-stop detection. No DOM. |
| `test/calculator.test.mjs` | Unit tests for the engine. |
| `test/dial-geometry.test.mjs` | Unit tests for the geometry. |
| `src/components/rotary-calculator/symbols.mjs` | The shared ordered list of 17 dial symbols (`{label, value}`). |
| `src/components/rotary-calculator/NixieDisplay.jsx` | Presentational glowing readout. |
| `src/components/rotary-calculator/RotaryDial.jsx` | SVG dial + drag/spin-back interaction; emits a symbol. |
| `src/components/rotary-calculator/PhoneFrame.jsx` | Telephone chrome (body, handset, cradle) with display + dial slots. |
| `src/components/rotary-calculator/RotaryCalculator.jsx` | Island container: `useReducer(calculator)`, wires dial → engine → display. |
| `src/components/rotary-calculator/rotary-calculator.css` | Dark phone body, nixie glow, dial styling, spin animation. |
| `src/pages/rotary-calculator.astro` | Route `/rotary-calculator/`; mounts the island via `BaseLayout`. |
| `src/pages/tools.astro` | Add a hub card for the calculator. |

---

## Task 1: Calculator engine (`calculator.mjs`)

**Files:**
- Create: `src/lib/calculator.mjs`
- Test: `test/calculator.test.mjs`

The engine builds an expression as tokens arrive and evaluates only on `=`, with `×`/`÷` binding before `+`/`−`.

State shape: `{ tokens, entry, display, justEvaluated, error, lastResult }` where `tokens` is the committed expression (alternating numbers and operator strings `'+' '-' '×' '÷'`), `entry` is the number currently being typed.

- [ ] **Step 1: Write the failing tests**

Create `test/calculator.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reduce } from '../src/lib/calculator.mjs';

// Feed a sequence of tokens through reduce, return final state.
function run(tokens) {
  return tokens.reduce(reduce, initialState());
}
const display = (tokens) => run(tokens).display;

test('initial display is 0', () => {
  assert.equal(initialState().display, '0');
});

test('typing digits builds the entry', () => {
  assert.equal(display(['1', '2', '3']), '123');
});

test('leading zero is replaced by the next digit', () => {
  assert.equal(display(['0', '5']), '5');
  assert.equal(display(['0', '0']), '0');
});

test('decimal point is added once; a second dot is ignored', () => {
  assert.equal(display(['1', '.', '5']), '1.5');
  assert.equal(display(['1', '.', '5', '.', '2']), '1.52');
});

test('a leading dot becomes 0.', () => {
  assert.equal(display(['.', '5']), '0.5');
});

test('expression string grows as operators are added', () => {
  assert.equal(display(['2', '+', '3', '×', '4']), '2+3×4');
});

test('nothing is computed until = is pressed', () => {
  // before '=' the display is still the expression, not 5
  assert.equal(display(['2', '+', '3']), '2+3');
});

test('= evaluates with precedence: 2+3×4 = 14', () => {
  assert.equal(display(['2', '+', '3', '×', '4', '=']), '14');
});

test('= respects left-to-right within a level: 8÷4÷2 = 1', () => {
  assert.equal(display(['8', '÷', '4', '÷', '2', '=']), '1');
});

test('subtraction and addition: 10-3+1 = 8', () => {
  assert.equal(display(['1', '0', '-', '3', '+', '1', '=']), '8');
});

test('a second operator replaces the pending one', () => {
  assert.equal(display(['5', '+', '-', '2', '=']), '3');
});

test('after =, a digit starts a fresh expression', () => {
  const s = run(['2', '+', '3', '=']);      // display 5
  const s2 = reduce(s, '7');
  assert.equal(s2.display, '7');
});

test('after =, an operator continues from the result', () => {
  const s = run(['2', '+', '3', '=']);      // 5
  const s2 = ['×', '4', '='].reduce(reduce, s);
  assert.equal(s2.display, '20');
});

test('divide by zero shows Error', () => {
  assert.equal(display(['5', '÷', '0', '=']), 'Error');
});

test('Error is cleared by starting a new number', () => {
  const s = run(['5', '÷', '0', '=']);      // Error
  const s2 = reduce(s, '9');
  assert.equal(s2.display, '9');
});

test('C resets everything', () => {
  assert.equal(display(['1', '2', '+', '3', 'C']), '0');
});

test('trailing operator before = is ignored: 2+ = 2', () => {
  assert.equal(display(['2', '+', '=']), '2');
});

test('float noise is rounded: 0.1+0.2 = 0.3', () => {
  assert.equal(display(['0', '.', '1', '+', '0', '.', '2', '=']), '0.3');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/lib/calculator.mjs'`.

- [ ] **Step 3: Implement the engine**

Create `src/lib/calculator.mjs`:

```js
// Pure 4-function calculator engine. No DOM, no React.
// Builds an expression of tokens and evaluates only on '='. × ÷ bind before + −.

const OPERATORS = new Set(['+', '-', '×', '÷']);

export function initialState() {
  return {
    tokens: [],        // committed expression: [number, op, number, op, ...]
    entry: '',         // number currently being typed
    display: '0',
    justEvaluated: false,
    error: false,
    lastResult: 0,
  };
}

function exprString(tokens, entry) {
  const s = tokens.map(String).join('') + entry;
  return s === '' ? '0' : s;
}

function appendDigit(entry, d) {
  if (entry === '0') return d === '0' ? '0' : d;
  return entry + d;
}

// Evaluate [num, op, num, op, ...] with precedence. Throws on divide-by-zero.
function evalExpression(tokens) {
  const pass1 = [tokens[0]];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const num = tokens[i + 1];
    if (op === '×') {
      pass1[pass1.length - 1] *= num;
    } else if (op === '÷') {
      if (num === 0) throw new Error('divide by zero');
      pass1[pass1.length - 1] /= num;
    } else {
      pass1.push(op, num);
    }
  }
  let acc = pass1[0];
  for (let i = 1; i < pass1.length; i += 2) {
    acc = pass1[i] === '+' ? acc + pass1[i + 1] : acc - pass1[i + 1];
  }
  return acc;
}

function formatResult(n) {
  if (!Number.isFinite(n)) return 'Error';
  const rounded = Number(n.toPrecision(12));
  let s = String(rounded);
  if (s.replace(/[-.]/g, '').length > 12) s = rounded.toExponential(6);
  return s;
}

function inputDigit(state, d) {
  const base = state.error || state.justEvaluated ? initialState() : state;
  const entry = appendDigit(base.entry, d);
  return { ...base, entry, justEvaluated: false, display: exprString(base.tokens, entry) };
}

function inputDot(state) {
  const base = state.error || state.justEvaluated ? initialState() : state;
  let entry = base.entry;
  if (entry === '') entry = '0.';
  else if (entry.includes('.')) entry = entry; // ignore second dot
  else entry = entry + '.';
  return { ...base, entry, justEvaluated: false, display: exprString(base.tokens, entry) };
}

function inputOperator(state, op) {
  if (state.error) return state;
  let tokens;
  let entry = '';
  if (state.justEvaluated) {
    tokens = [state.lastResult];
  } else {
    tokens = state.tokens.slice();
  }
  if (state.entry !== '' && !state.justEvaluated) {
    tokens.push(Number(state.entry));
  }
  const last = tokens[tokens.length - 1];
  if (tokens.length === 0) return state;            // nothing to operate on
  if (typeof last === 'string') tokens[tokens.length - 1] = op; // replace operator
  else tokens.push(op);
  return { ...state, tokens, entry, justEvaluated: false, error: false, display: exprString(tokens, '') };
}

function evaluate(state) {
  if (state.error) return state;
  const tokens = state.tokens.slice();
  if (state.entry !== '') tokens.push(Number(state.entry));
  if (typeof tokens[tokens.length - 1] === 'string') tokens.pop(); // drop trailing operator
  if (tokens.length === 0) return state;
  let result;
  try {
    result = evalExpression(tokens);
  } catch {
    return { ...initialState(), error: true, display: 'Error' };
  }
  if (!Number.isFinite(result)) return { ...initialState(), error: true, display: 'Error' };
  return { ...initialState(), display: formatResult(result), lastResult: result, justEvaluated: true };
}

export function reduce(state, token) {
  if (token === 'C') return initialState();
  if (token === '=') return evaluate(state);
  if (token === '.') return inputDot(state);
  if (OPERATORS.has(token)) return inputOperator(state, token);
  if (token >= '0' && token <= '9') return inputDigit(state, token);
  return state; // unknown token ignored
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all calculator tests green (plus the existing wiki-link tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculator.mjs test/calculator.test.mjs
git commit -m "feat: rotary calculator pure engine (precedence, eval on =)"
```

---

## Task 2: Dial geometry (`dial-geometry.mjs`)

**Files:**
- Create: `src/lib/dial-geometry.mjs`
- Test: `test/dial-geometry.test.mjs`

Angle convention: **degrees clockwise from 12 o'clock** (0 = top, 90 = right, 180 = bottom, 270 = left). Each hole rotates clockwise to a fixed finger-stop; per-hole max rotation = stop − hole angle.

- [ ] **Step 1: Write the failing tests**

Create `test/dial-geometry.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  holeLayout, pointerAngle, holeMaxRotation, rotationFor, reachedStop,
} from '../src/lib/dial-geometry.mjs';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('holeLayout places symbols at evenly spaced clockwise angles', () => {
  const holes = holeLayout(['a', 'b', 'c', 'd'], { startDeg: 0, stepDeg: 90, radius: 1 });
  assert.equal(holes.length, 4);
  assert.deepEqual(holes.map((h) => h.angleDeg), [0, 90, 180, 270]);
  close(holes[0].x, 0); close(holes[0].y, -1);   // top
  close(holes[1].x, 1); close(holes[1].y, 0);    // right
});

test('pointerAngle measures clockwise from the top', () => {
  close(pointerAngle(0, 0, 0, -1), 0);    // up = 0
  close(pointerAngle(0, 0, 1, 0), 90);    // right = 90
  close(pointerAngle(0, 0, 0, 1), 180);   // down = 180
  close(pointerAngle(0, 0, -1, 0), 270);  // left = 270
});

test('holeMaxRotation is the clockwise distance to the finger stop', () => {
  assert.equal(holeMaxRotation(0, 315), 315);
  assert.equal(holeMaxRotation(288, 315), 27);
});

test('rotationFor clamps a clockwise drag between 0 and the max', () => {
  assert.equal(rotationFor(0, 45, 300), 45);
  assert.equal(rotationFor(0, 300, 300), 300);
});

test('rotationFor pins past-the-stop drags to the max', () => {
  assert.equal(rotationFor(0, 310, 300), 300);
});

test('rotationFor treats counterclockwise jitter as 0', () => {
  assert.equal(rotationFor(0, 340, 300), 0);
});

test('reachedStop is true only near the max rotation', () => {
  assert.equal(reachedStop(300, 300), true);
  assert.equal(reachedStop(100, 300), false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/lib/dial-geometry.mjs'`.

- [ ] **Step 3: Implement the geometry**

Create `src/lib/dial-geometry.mjs`:

```js
// Pure dial geometry. Angles are degrees clockwise from 12 o'clock.

export function holeLayout(symbols, { startDeg = 0, stepDeg = 18, radius = 1, cx = 0, cy = 0 } = {}) {
  return symbols.map((symbol, i) => {
    const angleDeg = startDeg + i * stepDeg;
    const rad = (angleDeg * Math.PI) / 180;
    return {
      symbol,
      angleDeg,
      x: cx + radius * Math.sin(rad),
      y: cy - radius * Math.cos(rad),
    };
  });
}

export function pointerAngle(cx, cy, px, py) {
  let deg = (Math.atan2(px - cx, -(py - cy)) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

export function holeMaxRotation(holeAngleDeg, fingerStopDeg) {
  return (fingerStopDeg - holeAngleDeg + 360) % 360;
}

export function rotationFor(grabDeg, pointerDeg, maxRot, slack = 30) {
  const delta = (pointerDeg - grabDeg + 360) % 360;
  if (delta <= maxRot) return delta;
  if (delta >= 360 - slack) return 0; // counterclockwise jitter
  return maxRot;                       // dragged past the stop
}

export function reachedStop(rotation, maxRot, threshold = 0.9) {
  return rotation >= maxRot * threshold;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all dial-geometry tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dial-geometry.mjs test/dial-geometry.test.mjs
git commit -m "feat: pure dial geometry helpers"
```

---

## Task 3: Page scaffold, hub entry, and dial symbols

Stand up the route and island plumbing with a placeholder, so the build is green before adding UI.

**Files:**
- Create: `src/components/rotary-calculator/symbols.mjs`
- Create: `src/components/rotary-calculator/RotaryCalculator.jsx`
- Create: `src/components/rotary-calculator/rotary-calculator.css`
- Create: `src/pages/rotary-calculator.astro`
- Modify: `src/pages/tools.astro`

- [ ] **Step 1: Create the shared symbol list**

Create `src/components/rotary-calculator/symbols.mjs`:

```js
// The 17 symbols on the dial, in clockwise order. `label` is the glyph shown;
// `value` is the token fed to the calculator engine.
export const DIAL_SYMBOLS = [
  { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' },
  { label: '4', value: '4' }, { label: '5', value: '5' }, { label: '6', value: '6' },
  { label: '7', value: '7' }, { label: '8', value: '8' }, { label: '9', value: '9' },
  { label: '0', value: '0' }, { label: '.', value: '.' },
  { label: '+', value: '+' }, { label: '−', value: '-' },
  { label: '×', value: '×' }, { label: '÷', value: '÷' },
  { label: '=', value: '=' }, { label: 'C', value: 'C' },
];
```

- [ ] **Step 2: Create a minimal island and its CSS**

Create `src/components/rotary-calculator/rotary-calculator.css`:

```css
.rc-stage {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0;
}
```

Create `src/components/rotary-calculator/RotaryCalculator.jsx`:

```jsx
import './rotary-calculator.css';

export default function RotaryCalculator() {
  return (
    <div className="rc-stage">
      <p>Rotary calculator coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 3: Create the page**

Create `src/pages/rotary-calculator.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import RotaryCalculator from '../components/rotary-calculator/RotaryCalculator.jsx';
---
<BaseLayout title="轉盤計算機">
  <h1 class="text-2xl font-bold mb-6">轉盤計算機</h1>
  <RotaryCalculator client:load />
</BaseLayout>
```

- [ ] **Step 4: Add the Tools hub card**

In `src/pages/tools.astro`, add this entry to the `tools` array (after the MBTI entry):

```js
  { icon: '☎️', title: '轉盤計算機', href: '/rotary-calculator/', desc: '用古董轉盤電話打數字的計算機', external: false },
```

- [ ] **Step 5: Verify the build and route**

Run: `npm run build`
Expected: build succeeds; output includes `dist/rotary-calculator/index.html`.

Run: `node --test test/**/*.mjs` (i.e. `npm test`)
Expected: still PASS (no regressions).

- [ ] **Step 6: Commit**

```bash
git add src/components/rotary-calculator/symbols.mjs src/components/rotary-calculator/RotaryCalculator.jsx src/components/rotary-calculator/rotary-calculator.css src/pages/rotary-calculator.astro src/pages/tools.astro
git commit -m "feat: scaffold rotary-calculator page + tools hub entry"
```

---

## Task 4: Nixie display + engine wiring

Render the glowing readout and drive it from the engine via a temporary keyboard hook so the math is observable before the dial exists.

**Files:**
- Create: `src/components/rotary-calculator/NixieDisplay.jsx`
- Modify: `src/components/rotary-calculator/RotaryCalculator.jsx`
- Modify: `src/components/rotary-calculator/rotary-calculator.css`

- [ ] **Step 1: Create the NixieDisplay component**

Create `src/components/rotary-calculator/NixieDisplay.jsx`:

```jsx
export default function NixieDisplay({ text }) {
  return (
    <div className="rc-nixie" aria-live="polite">
      <span className="rc-nixie-text">{text}</span>
    </div>
  );
}
```

- [ ] **Step 2: Wire the engine into the container**

Replace `src/components/rotary-calculator/RotaryCalculator.jsx` with:

```jsx
import { useReducer, useEffect } from 'react';
import { initialState, reduce } from '../../lib/calculator.mjs';
import { DIAL_SYMBOLS } from './symbols.mjs';
import NixieDisplay from './NixieDisplay.jsx';
import './rotary-calculator.css';

export default function RotaryCalculator() {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);

  // Temporary: keyboard input so the engine is testable before the dial lands.
  // Removed in Task 5 once the dial drives dispatch.
  useEffect(() => {
    const keyToken = (k) => {
      if (k >= '0' && k <= '9') return k;
      if (k === '.') return '.';
      if (k === '+') return '+';
      if (k === '-') return '-';
      if (k === '*') return '×';
      if (k === '/') return '÷';
      if (k === 'Enter' || k === '=') return '=';
      if (k === 'Escape' || k === 'c' || k === 'C') return 'C';
      return null;
    };
    const onKey = (e) => {
      const t = keyToken(e.key);
      if (t) { e.preventDefault(); dispatch(t); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="rc-stage">
      <NixieDisplay text={state.display} />
      {/* dial added in Task 5; symbols list ready: */}
      <ul className="rc-symbol-preview">
        {DIAL_SYMBOLS.map((s) => <li key={s.value}>{s.label}</li>)}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Add nixie styling**

Append to `src/components/rotary-calculator/rotary-calculator.css`:

```css
.rc-stage { flex-direction: column; align-items: center; gap: 1rem; }

.rc-nixie {
  background: #000;
  border: 1px solid #2a2118;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  min-width: 14rem;
  text-align: right;
}
.rc-nixie-text {
  font-family: 'Courier New', monospace;
  font-size: 2rem;
  letter-spacing: 0.15em;
  color: #ff9a3c;
  text-shadow: 0 0 6px #ff7a00, 0 0 16px #ff5500;
}
.rc-symbol-preview { display: none; } /* preview only; dial replaces it in Task 5 */
```

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`
Open `http://localhost:4321/rotary-calculator/`. Type `2+3*4` then Enter.
Expected: the nixie display shows `2+3×4`, then `14` after Enter. `Escape` resets to `0`.

- [ ] **Step 5: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/rotary-calculator/NixieDisplay.jsx src/components/rotary-calculator/RotaryCalculator.jsx src/components/rotary-calculator/rotary-calculator.css
git commit -m "feat: nixie display wired to calculator engine"
```

---

## Task 5: Rotary dial with drag + spin-back

Build the interactive dial and replace the keyboard stub. The dial owns all pointer handling and uses `dial-geometry.mjs`.

**Files:**
- Create: `src/components/rotary-calculator/RotaryDial.jsx`
- Modify: `src/components/rotary-calculator/RotaryCalculator.jsx`
- Modify: `src/components/rotary-calculator/rotary-calculator.css`

Layout constants: 17 holes from `startDeg = 0`, `stepDeg = 18` (0…288°); finger stop at `330°`; SVG viewBox `0 0 320 320`, center `(160, 160)`, hole radius `122`.

- [ ] **Step 1: Create the RotaryDial component**

Create `src/components/rotary-calculator/RotaryDial.jsx`:

```jsx
import { useRef, useState } from 'react';
import { holeLayout, pointerAngle, holeMaxRotation, rotationFor, reachedStop } from '../../lib/dial-geometry.mjs';

const CX = 160, CY = 160, HOLE_R = 122, FINGER_STOP_DEG = 330;
const LAYOUT_OPTS = { startDeg: 0, stepDeg: 18, radius: HOLE_R, cx: CX, cy: CY };

export default function RotaryDial({ symbols, onDial }) {
  const svgRef = useRef(null);
  const drag = useRef(null);                 // { grabDeg, maxRot, value }
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const holes = holeLayout(symbols.map((s) => s.label), LAYOUT_OPTS);

  const svgAngle = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const scale = 320 / rect.width;
    const px = (e.clientX - rect.left) * scale;
    const py = (e.clientY - rect.top) * scale;
    return pointerAngle(CX, CY, px, py);
  };

  const onPointerDown = (e, sym, angleDeg) => {
    if (spinning) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { grabDeg: angleDeg, maxRot: holeMaxRotation(angleDeg, FINGER_STOP_DEG), value: sym.value };
    setRotation(0);
  };

  const onPointerMove = (e) => {
    if (!drag.current) return;
    const { grabDeg, maxRot } = drag.current;
    setRotation(rotationFor(grabDeg, svgAngle(e), maxRot));
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    const { maxRot, value } = drag.current;
    const registered = reachedStop(rotation, maxRot);
    drag.current = null;
    if (rotation > 0) {                       // only animate (and arm onTransitionEnd) if we actually moved
      setSpinning(true);                      // CSS transition animates rotation → 0
      setRotation(0);
    }
    if (registered) onDial(value);
  };

  return (
    <svg
      ref={svgRef}
      className="rc-dial"
      viewBox="0 0 320 320"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <circle cx={CX} cy={CY} r="150" className="rc-dial-face" />
      <g
        className={spinning ? 'rc-dial-rotor rc-spinning' : 'rc-dial-rotor'}
        style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${CX}px ${CY}px` }}
        onTransitionEnd={() => setSpinning(false)}
      >
        {holes.map((h, i) => (
          <g
            key={symbols[i].value}
            className="rc-hole"
            onPointerDown={(e) => onPointerDown(e, symbols[i], h.angleDeg)}
          >
            <circle cx={h.x} cy={h.y} r="20" className="rc-hole-bg" />
            <text x={h.x} y={h.y} className="rc-hole-label" dominantBaseline="central" textAnchor="middle">
              {h.symbol}
            </text>
          </g>
        ))}
      </g>
      <circle cx={CX} cy={CY} r="46" className="rc-dial-hub" />
      <rect x={CX + 96} y={CY + 70} width="26" height="16" rx="3" className="rc-finger-stop" />
    </svg>
  );
}
```

- [ ] **Step 2: Replace the keyboard stub with the dial**

Replace `src/components/rotary-calculator/RotaryCalculator.jsx` with:

```jsx
import { useReducer } from 'react';
import { initialState, reduce } from '../../lib/calculator.mjs';
import { DIAL_SYMBOLS } from './symbols.mjs';
import NixieDisplay from './NixieDisplay.jsx';
import RotaryDial from './RotaryDial.jsx';
import './rotary-calculator.css';

export default function RotaryCalculator() {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  return (
    <div className="rc-stage">
      <NixieDisplay text={state.display} />
      <RotaryDial symbols={DIAL_SYMBOLS} onDial={dispatch} />
    </div>
  );
}
```

- [ ] **Step 3: Add dial styling + spin animation**

Append to `src/components/rotary-calculator/rotary-calculator.css`:

```css
.rc-dial { width: 320px; max-width: 90vw; touch-action: none; user-select: none; }
.rc-dial-face { fill: #1c1c22; stroke: #2a2a33; stroke-width: 2; }
.rc-dial-hub { fill: #0e0e12; }
.rc-dial-rotor.rc-spinning { transition: transform 0.5s cubic-bezier(0.4, 1.4, 0.6, 1); }
.rc-hole { cursor: grab; }
.rc-hole-bg { fill: #000; stroke: #ff9a3c; stroke-width: 1; }
.rc-hole-label {
  fill: #ff9a3c; font-family: Georgia, serif; font-size: 18px;
  text-shadow: 0 0 4px #ff7a00; pointer-events: none;
}
.rc-finger-stop { fill: #c0392b; }
```

- [ ] **Step 4: Verify the dial in the browser**

Run: `npm run dev`
Open `http://localhost:4321/rotary-calculator/`. Drag the `2` hole clockwise to the finger stop and release; the dial spins back and `2` registers. Dial `2 + 3 × 4 =` and confirm `14`. Confirm a short drag that doesn't reach the stop registers nothing.

- [ ] **Step 5: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/rotary-calculator/RotaryDial.jsx src/components/rotary-calculator/RotaryCalculator.jsx src/components/rotary-calculator/rotary-calculator.css
git commit -m "feat: interactive rotary dial with drag and spin-back"
```

---

## Task 6: Telephone chrome (`PhoneFrame`)

Wrap the display and dial in a vintage desk-phone body with a handset on the cradle.

**Files:**
- Create: `src/components/rotary-calculator/PhoneFrame.jsx`
- Modify: `src/components/rotary-calculator/RotaryCalculator.jsx`
- Modify: `src/components/rotary-calculator/rotary-calculator.css`

- [ ] **Step 1: Create the PhoneFrame component**

Create `src/components/rotary-calculator/PhoneFrame.jsx`:

```jsx
// Presentational telephone chrome. `display` renders in the strip above the
// dial; `children` (the dial) sit in the body.
export default function PhoneFrame({ display, children }) {
  return (
    <div className="rc-phone">
      <div className="rc-handset">
        <span className="rc-earpiece" />
        <span className="rc-handle" />
        <span className="rc-earpiece" />
      </div>
      <div className="rc-body">
        <div className="rc-display-strip">{display}</div>
        <div className="rc-dial-mount">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Compose it into the container**

Replace `src/components/rotary-calculator/RotaryCalculator.jsx` with:

```jsx
import { useReducer } from 'react';
import { initialState, reduce } from '../../lib/calculator.mjs';
import { DIAL_SYMBOLS } from './symbols.mjs';
import NixieDisplay from './NixieDisplay.jsx';
import RotaryDial from './RotaryDial.jsx';
import PhoneFrame from './PhoneFrame.jsx';
import './rotary-calculator.css';

export default function RotaryCalculator() {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  return (
    <div className="rc-stage">
      <PhoneFrame display={<NixieDisplay text={state.display} />}>
        <RotaryDial symbols={DIAL_SYMBOLS} onDial={dispatch} />
      </PhoneFrame>
    </div>
  );
}
```

- [ ] **Step 3: Add the phone chrome styling**

Append to `src/components/rotary-calculator/rotary-calculator.css`:

```css
.rc-phone { display: flex; flex-direction: column; align-items: center; }
.rc-handset {
  display: flex; align-items: center; width: 19rem; max-width: 88vw; height: 2.6rem;
  margin-bottom: -0.8rem; z-index: 2;
}
.rc-earpiece {
  width: 3.2rem; height: 2.6rem; border-radius: 1.3rem / 1.1rem;
  background: linear-gradient(160deg, #2a2a30, #0c0c10);
  border: 1px solid #3a3a42;
}
.rc-handle { flex: 1; height: 1.2rem; background: #0e0e12; border: 1px solid #3a3a42; border-radius: 0.6rem; }
.rc-body {
  background: radial-gradient(circle at 40% 25%, #26262c, #111114);
  border: 2px solid #3a3a42; border-radius: 1.5rem 1.5rem 2rem 2rem;
  padding: 1.6rem 1.4rem 2rem; display: flex; flex-direction: column;
  align-items: center; gap: 1.1rem; box-shadow: 0 10px 28px rgba(0,0,0,.5);
}
.rc-display-strip { width: 100%; display: flex; justify-content: center; }
.rc-dial-mount { display: flex; justify-content: center; }
```

- [ ] **Step 4: Verify the whole phone in the browser**

Run: `npm run dev`
Open `http://localhost:4321/rotary-calculator/`. Confirm a recognizable desk phone: handset across the top, nixie strip below it, dial mounted in the body. Dial `7 ÷ 2 =` → `3.5`. Resize to a narrow viewport and confirm it stays usable.

- [ ] **Step 5: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/rotary-calculator/PhoneFrame.jsx src/components/rotary-calculator/RotaryCalculator.jsx src/components/rotary-calculator/rotary-calculator.css
git commit -m "feat: vintage telephone chrome around the dial"
```

---

## Task 7: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full test + build**

Run: `npm test && npm run build`
Expected: all unit tests pass; production build succeeds with `dist/rotary-calculator/index.html` present.

- [ ] **Step 2: Manual acceptance pass**

Run: `npm run dev` and at `http://localhost:4321/rotary-calculator/` confirm each:
- Dialing digits builds the expression on the nixie display.
- `2 + 3 × 4 =` → `14` (precedence holds).
- `5 ÷ 0 =` → `Error`; dialing a digit clears it.
- `C` resets to `0`.
- A drag that doesn't reach the finger stop registers nothing.
- Input is ignored while the dial is spinning back.
- The Tools hub (`/tools/`) shows the ☎️ 轉盤計算機 card linking here.

- [ ] **Step 3: Confirm clean tree**

Run: `git status`
Expected: working tree clean (everything committed across Tasks 1–6).

---

## Notes for the implementer

- **Operator glyphs vs tokens:** the dial shows `−` (U+2212) but the engine token is ASCII `-`; the mapping lives in `symbols.mjs` (`label` vs `value`). Don't feed labels to the engine.
- **Why a keyboard stub in Task 4:** it makes the engine observable in-browser one task before the dial exists, then is deleted in Task 5. This keeps each task independently verifiable.
- **Geometry is pure:** all dial math is unit-tested in `dial-geometry.mjs`; `RotaryDial.jsx` only translates pointer events into calls to those functions, so the untested surface stays thin.
```
