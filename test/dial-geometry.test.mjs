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
