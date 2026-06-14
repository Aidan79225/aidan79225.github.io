import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holeLayout, holeMaxRotation, reachedStop } from '../src/lib/dial-geometry.mjs';
import { DIAL_GEOMETRY } from '../src/components/rotary-calculator/dial-config.mjs';
import { DIAL_SYMBOLS } from '../src/components/rotary-calculator/symbols.mjs';

const { startDeg, stepDeg, holeRadius, cx, cy, fingerStopDeg } = DIAL_GEOMETRY;

test('all 17 dial symbols are registerable and clear of the jitter boundary', () => {
  const holes = holeLayout(DIAL_SYMBOLS.map((s) => s.label), { startDeg, stepDeg, radius: holeRadius, cx, cy });
  assert.equal(holes.length, 17);
  for (const h of holes) {
    const maxRot = holeMaxRotation(h.angleDeg, fingerStopDeg);
    assert.ok(maxRot > 0, `${h.symbol}: maxRot ${maxRot} must be > 0`);
    assert.ok(maxRot < 330, `${h.symbol}: maxRot ${maxRot} must be < 330 (jitter-guard boundary)`);
    assert.ok(reachedStop(maxRot, maxRot), `${h.symbol}: must register when dragged to its stop`);
  }
});

test('the first symbol (1) is the shortest dial', () => {
  const holes = holeLayout(DIAL_SYMBOLS.map((s) => s.label), { startDeg, stepDeg, radius: holeRadius, cx, cy });
  const maxRots = holes.map((h) => holeMaxRotation(h.angleDeg, fingerStopDeg));
  assert.equal(Math.min(...maxRots), maxRots[0]);
});
