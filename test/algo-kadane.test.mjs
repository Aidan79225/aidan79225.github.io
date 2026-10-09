import { test } from 'node:test';
import assert from 'node:assert/strict';
import kadane, { frames, parseInput, randomInput, DEFAULT_INPUT } from '../src/lib/algo/kadane.mjs';

// O(n²) 暴力解當對照:允許空子陣列,所以至少 0。
const brute = (a) => {
  let best = 0;
  for (let i = 0; i < a.length; i++) {
    let s = 0;
    for (let j = i; j < a.length; j++) best = Math.max(best, (s += a[j]));
  }
  return best;
};
const varOf = (f, name) => f.vars.find((v) => v.name === name).value;
const sumOf = (a, r) => a.slice(r.from, r.to + 1).reduce((s, x) => s + x, 0);

test('the book example ends with best = 10 over array[1..5]', () => {
  const fs = frames(DEFAULT_INPUT);
  const last = fs.at(-1);
  assert.equal(varOf(last, 'best'), 10);
  assert.deepEqual(last.ranges, [{ from: 1, to: 5, kind: 'best' }]);
  assert.equal(last.line, 5);
});

test('one init frame, two frames per element, one done frame', () => {
  assert.equal(frames([3, -1, 2]).length, 1 + 2 * 3 + 1);
});

test('final best matches brute force, and the best range really sums to it', () => {
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let n = 0; n < 300; n++) {
    const a = randomInput(rand);
    const fs = frames(a);
    const last = fs.at(-1);
    assert.equal(varOf(last, 'best'), brute(a), `input ${a}`);
    const bestRange = last.ranges.find((r) => r.kind === 'best');
    if (bestRange) assert.equal(sumOf(a, bestRange), brute(a), `input ${a}`);
    else assert.equal(brute(a), 0, `input ${a}`);
    // 每一步的 current 區間和都等於當下的 sum
    for (const f of fs) {
      const cur = f.ranges.find((r) => r.kind === 'current');
      if (cur) assert.equal(sumOf(a, cur), varOf(f, 'sum'), `input ${a} step ${f.note}`);
    }
  }
});

test('all-negative input keeps the empty subarray', () => {
  const last = frames([-3, -1, -2]).at(-1);
  assert.equal(varOf(last, 'best'), 0);
  assert.equal(last.ranges.length, 0);
});

test('every frame highlights a real code line', () => {
  for (const f of frames(DEFAULT_INPUT, 'en')) {
    assert.ok(f.line >= 0 && f.line < kadane.code.length);
    assert.ok(f.note.length > 0);
  }
});

test('parseInput accepts commas, spaces, full-width commas and unicode minus', () => {
  assert.deepEqual(parseInput('-1, 2 4,-3'), [-1, 2, 4, -3]);
  assert.deepEqual(parseInput('−5,3'), [-5, 3]);
  assert.deepEqual(parseInput('1\uFF0C2\u30013'), [1, 2, 3]);
});

test('parseInput rejects junk, empty input, huge numbers and overlong arrays', () => {
  assert.equal(parseInput(''), null);
  assert.equal(parseInput('1, x, 3'), null);
  assert.equal(parseInput('1.5'), null);
  assert.equal(parseInput('100'), null);
  assert.equal(parseInput(Array(17).fill(1).join(',')), null);
});
