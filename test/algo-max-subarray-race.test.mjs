import { test } from 'node:test';
import assert from 'node:assert/strict';
import race, { frames } from '../src/lib/algo/max-subarray-race.mjs';
import { randomInput, DEFAULT_INPUT } from '../src/lib/algo/kadane.mjs';

const brute = (a) => {
  let best = 0;
  for (let i = 0; i < a.length; i++) {
    let s = 0;
    for (let j = i; j < a.length; j++) best = Math.max(best, (s += a[j]));
  }
  return best;
};
const varOf = (lane, name) => lane.vars.find((v) => v.name === name).value;
const sumOf = (a, r) => a.slice(r.from, r.to + 1).reduce((s, x) => s + x, 0);

test('book example: one init frame + n(n+1)/2 ticks, both lanes answer 10', () => {
  const fs = frames(DEFAULT_INPUT);
  assert.equal(fs.length, 1 + 36);
  const [b, k] = fs.at(-1).lanes;
  assert.equal(varOf(b, 'best'), 10);
  assert.equal(varOf(k, 'best'), 10);
  assert.equal(b.meter.value, 36);
  assert.equal(k.meter.value, 8);
  assert.ok(b.done && k.done);
});

test('Kadane finishes after exactly n ticks and then stays put', () => {
  const fs = frames(DEFAULT_INPUT);
  assert.equal(fs[7].lanes[1].done, false);
  assert.equal(fs[8].lanes[1].done, true);
  for (const f of fs.slice(8)) assert.deepEqual(f.lanes[1], fs[8].lanes[1]);
});

test('random inputs: both lanes match brute force, ranges sum to their variables', () => {
  let seed = 11;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let n = 0; n < 200; n++) {
    const a = randomInput(rand);
    const fs = frames(a);
    for (const f of fs) {
      for (const lane of f.lanes) {
        for (const r of lane.ranges) {
          const expected = r.kind === 'best' ? varOf(lane, 'best') : varOf(lane, 'sum');
          assert.equal(sumOf(a, r), expected, `input ${a}`);
        }
        assert.ok(lane.meter.value <= lane.meter.max);
      }
    }
    const last = fs.at(-1);
    for (const lane of last.lanes) assert.equal(varOf(lane, 'best'), brute(a), `input ${a}`);
  }
});

test('brute force visits every subarray exactly once, in order', () => {
  const a = [3, -1, 2, -5];
  const seen = frames(a)
    .slice(1)
    .map((f) => f.lanes[0])
    .filter((l) => !l.done)
    .map((l) => l.ranges.find((r) => r.kind === 'current'))
    .map((r) => `${r.from}-${r.to}`);
  // 最後一個區間那一步 lane 已經 done,不畫 current
  assert.deepEqual(seen, ['0-0', '0-1', '0-2', '0-3', '1-1', '1-2', '1-3', '2-2', '2-3']);
});

test('highlighted lines exist in each lane’s code, notes are never empty', () => {
  for (const lang of ['zh-hant', 'en']) {
    for (const f of frames(DEFAULT_INPUT, lang)) {
      assert.ok(f.note.length > 0);
      f.lanes.forEach((lane, i) => {
        assert.ok(lane.line >= -1 && lane.line < race.lanes[i].code.length);
        assert.ok(lane.note.length > 0);
      });
    }
  }
});

test('single element: one tick, both lanes done at once', () => {
  const fs = frames([5]);
  assert.equal(fs.length, 2);
  assert.ok(fs[1].lanes.every((l) => l.done));
  assert.equal(varOf(fs[1].lanes[0], 'best'), 5);
});
