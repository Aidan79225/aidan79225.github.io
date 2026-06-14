# Rotary-Dial Calculator — Design

**Date:** 2026-06-14
**Status:** Approved design, pending spec review
**Route:** `/rotary-calculator/`

## Summary

A retro **rotary-dial calculator** rendered as a React island on a new tool page,
added to the Tools hub. The whole UI is a **1950s desk telephone**: a handset
resting on the cradle, a single rotary dial mounted on the phone body, and a
glowing **nixie-style display strip** set into the phone face between the handset
and the dial.

One dial carries **all 17 symbols** — `0 1 2 3 4 5 6 7 8 9 . + − × ÷ = C` — and is
operated with **full skeuomorphic drag**: grab a hole, drag clockwise to the
finger-stop, release; the dial spins itself back, and the symbol registers when
the dial returns home. The calculator does **4-function math with decimals**.

This is the site's first React-island tool (existing tools are vanilla-JS
`.astro` pages). React 19 + `@astrojs/react` are already configured.

## Decisions (locked during brainstorming)

| Question | Decision |
| --- | --- |
| Operator input | **One big dial** holds digits *and* operators (no separate buttons) |
| Dialing interaction | **Full skeuomorphic drag** to finger-stop, with spin-back; registers on return |
| Math scope | **4-function with decimals** (`+ − × ÷ =`, `.`, `C`) |
| Aesthetic / display | **Dark retro-tech** with a glowing-orange **nixie** readout |
| Form factor | **Whole desk telephone** — handset on cradle + dial on the body |
| Display placement | **Nixie strip on the phone body, above the dial** |
| Evaluation model | **Immediate-execution** (`2 + 3 × 4 =` → `20`, like a pocket calculator) |

## Architecture

A small set of isolated units, each with one job:

### `src/lib/calculator.mjs` — pure math engine
- No React, no DOM. The TDD target.
- Immediate-execution 4-function state machine over single tokens.
- **API:** `initialState()` and `reduce(state, token) → state`, where
  `token ∈ { '0'…'9', '.', '+', '-', '×', '÷', '=', 'C' }`.
- **State:** current entry string, accumulator, pending operator,
  `display` string, `justEvaluated` flag, `error` flag.
- **Semantics:**
  - Digits append to the current entry; leading-zero normalized.
  - `.` is ignored if the current entry already has one.
  - An operator commits the current entry and stores the pending op; pressing a
    second operator before entering a number **replaces** the pending op.
  - `=` applies the pending op to (accumulator, current entry) and shows the result.
  - `C` resets to `initialState()`.
  - Divide-by-zero → `error` state, `display = "Error"`; cleared by `C` or by
    starting a new number.
  - Overlong results are truncated to the display width, falling back to
    exponential notation when they don't fit.

### `src/lib/dial-geometry.mjs` — pure geometry helpers
- No DOM. Unit-tested.
- **Responsibilities:** lay out the 17 holes at their angles around the dial;
  convert a pointer position to an angle; compute current rotation while dragging
  (clamped between the grabbed hole's home angle and the finger-stop); decide
  whether a release **reached the finger-stop** (i.e. registers) or falls short.
- **Example API:** `holeLayout(symbols) → [{symbol, angleDeg, x, y}]`,
  `pointerAngle(cx, cy, px, py) → deg`,
  `rotationFor(grabAngle, pointerAngle, stopAngle) → deg`,
  `reachedStop(rotation, stopAngle) → boolean`.

### `RotaryDial.jsx` — the interactive dial (presentational + interaction)
- Renders the SVG dial and 17 holes; owns **all** pointer-drag, rotation, and
  spin-back animation. Knows nothing about arithmetic.
- **Props:** `symbols: string[]`, `onDial(symbol)`, `disabled?`.
- **Interaction:**
  1. `pointerdown` on a hole captures the pointer and records the grabbed hole.
  2. `pointermove` rotates the whole dial so the grabbed hole tracks toward the
     finger-stop (clamped via `dial-geometry`).
  3. `pointerup`: if the drag reached the stop, call `onDial(symbol)`; then
     animate the dial back home (timed ease-out, roughly proportional to travel).
  4. While spinning back, **ignore new input** (mimics a real dial).
- Works with mouse and touch (Pointer Events).

### `NixieDisplay.jsx` — the readout (presentational)
- **Props:** `text: string`. Renders the glowing-orange nixie panel inside the
  body strip. Right-aligned; handles overflow / `Error`.

### `PhoneFrame` (phone chrome) — presentational
- The telephone body, handset, and cradle (SVG / CSS). Provides the layout slots:
  the **display strip** (top) and the **dial mount** (center). May start as markup
  inside `RotaryCalculator.jsx` and be extracted to `PhoneFrame.jsx` if it grows.

### `RotaryCalculator.jsx` — container island
- Holds engine state with `useReducer(reduce, initialState())`.
- Composes `PhoneFrame` → `NixieDisplay` (display strip) + `RotaryDial` (mount).
- `onDial(symbol)` dispatches the token; `state.display` feeds `NixieDisplay`.

### `src/pages/rotary-calculator.astro` — page
- Uses `BaseLayout`; mounts `<RotaryCalculator client:load />`.
- Imports a dedicated CSS file for the dark phone body, nixie glow, and dial
  styling (custom enough to warrant its own stylesheet rather than Tailwind utilities).

### `src/pages/tools.astro` — hub entry
- Add `{ icon: '☎️', title: '轉盤計算機', href: '/rotary-calculator/', desc: '用古董轉盤電話打數字的計算機', external: false }`.

## Data flow

```
drag hole → release at finger-stop
  → RotaryDial.onDial(symbol)
    → dispatch(token) → calculator.reduce → new state.display
      → NixieDisplay re-renders
(dial spin-back animation runs independently of the math)
```

## Error handling

- Divide-by-zero → `display = "Error"`, cleared by `C` or starting a new number.
- Second `.` within one number is ignored.
- Two operators in a row → the pending operator is replaced.
- Overlong results → truncate to display width, fall back to exponential.
- `=` with no pending operator → no-op (display unchanged).
- Input during spin-back → ignored.

## Testing

- **TDD (`node --test test/**/*.mjs`, the repo convention):**
  - `calculator.mjs`: digit & decimal entry, leading-zero normalization, each of
    `+ − × ÷`, operator chaining under immediate-execution, `=`, `C`,
    divide-by-zero → `Error`, double-`.` guard, operator replacement, overflow.
  - `dial-geometry.mjs`: hole layout angles, pointer→angle, clamped rotation,
    `reachedStop` threshold (reaches vs. falls short).
- **Manual:** dial *feel* (drag, finger-stop, spin-back, input lockout) verified
  via `npm run dev` and the visual companion — drag interaction isn't meaningfully
  unit-testable.

## Out of scope (YAGNI)

- Memory keys (M+, M−, MR), `%`, `±`, backspace.
- Scientific functions, history/paper-tape log.
- Keyboard input (dial-only by design; may revisit for accessibility later).
- Sound effects (could be a nice follow-up, not part of v1).
```
