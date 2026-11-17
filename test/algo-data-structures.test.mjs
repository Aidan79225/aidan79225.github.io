import { test } from 'node:test';
import assert from 'node:assert/strict';
import growth, { frames as growthFrames, randomInput as randomGrowth } from '../src/lib/algo/list-growth.mjs';
import common, { frames as commonFrames, parseInput, formatInput, randomInput as randomCommon } from '../src/lib/algo/common-elements.mjs';

const lcg = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const varOf = (f, name) => f.vars.find((v) => v.name === name).value;

// ── list growth ──
test('list growth: moved elements never exceed 2n, capacity is a power of two ≥ n', () => {
  const rand = lcg(5);
  for (let r = 0; r < 200; r++) {
    const input = randomGrowth(rand);
    const fs = growthFrames(input);
    const last = fs.at(-1);
    const n = input.length;
    assert.ok(varOf(last, 'moved') < 2 * n, `input ${input}`);
    const cap = varOf(last, 'capacity');
    assert.ok(cap >= n && (cap & (cap - 1)) === 0);
    assert.deepEqual(last.array.slice(0, n), input);
    assert.ok(last.array.slice(n).every((v) => v === '·'));
    // 每個 frame 的 array 長度等於 capacity,前 size 格是輸入的前綴
    for (const f of fs) {
      assert.equal(f.array.length, varOf(f, 'capacity'));
      assert.deepEqual(f.array.slice(0, varOf(f, 'size')), input.slice(0, varOf(f, 'size')));
    }
  }
});

test('list growth: exactly log2(cap) grow frames, each at size == old capacity', () => {
  const fs = growthFrames([1, 2, 3, 4, 5]);
  const grows = fs.filter((f) => f.ranges.some((r) => r.kind === 'swap'));
  assert.deepEqual(grows.map((f) => varOf(f, 'size')), [1, 2, 4]);
  assert.equal(varOf(fs.at(-1), 'moved'), 1 + 2 + 4);
  assert.equal(fs.length, 1 + 5 + 3 + 1);
});

test('list growth: every frame highlights a real line or none', () => {
  for (const f of growthFrames(growth.defaultInput, 'en')) assert.ok(f.line >= -1 && f.line < growth.code.length);
});

// ── common elements ──
const brute = (a, b) => b.filter((x) => a.includes(x)).length;

test('common elements: book example answers 3 both ways', () => {
  const fs = commonFrames(common.defaultInput);
  const last = fs.at(-1);
  assert.match(last.note, /3/);
  assert.ok(last.lanes.every((l) => l.done));
});

test('common elements: both approaches match brute force on random inputs; pointers only move right', () => {
  const rand = lcg(17);
  for (let r = 0; r < 200; r++) {
    const input = randomCommon(rand);
    const { a, b } = input;
    const fs = commonFrames(input);
    // 做法 1 的 count 在 setDone 那一格
    const setDone = fs.find((f) => /做法 1 完成|Approach 1 done/.test(f.note));
    assert.equal(varOf(setDone.lanes[0], 'count'), brute(a, b), formatInput(input));
    // 做法 2:指標單調,最後的 count 等於排序後雙指標的答案(多重集合交集,與 brute 的定義一致嗎?)
    let pi = -1;
    let pj = -1;
    for (const f of fs.filter((x) => x.lanes[2].cursor >= 0 || x.lanes[3].cursor >= 0)) {
      const i = f.lanes[2].cursor;
      const j = f.lanes[3].cursor;
      if (i >= 0) { assert.ok(i >= pi); pi = i; }
      if (j >= 0) { assert.ok(j >= pj); pj = j; }
    }
    // 排序雙指標算的是多重集合交集;set 算的是 B 裡有幾個元素出現在 A。兩者在無重複時相等
    const distinct = new Set(a).size === a.length && new Set(b).size === b.length;
    if (distinct) assert.equal(varOf(fs.at(-1).lanes[0], 'count'), brute(a, b), formatInput(input));
  }
});

test('common elements: parseInput needs one "|" and rejects junk', () => {
  assert.deepEqual(parseInput('5 2 | 3, 2'), { a: [5, 2], b: [3, 2] });
  assert.equal(parseInput('5 2'), null);
  assert.equal(parseInput('5 | 2 | 3'), null);
  assert.equal(parseInput('x | 2'), null);
  assert.equal(formatInput({ a: [1], b: [2, 3] }), '1 | 2, 3');
});

test('common elements: lane frames point at real code lines', () => {
  for (const f of commonFrames(common.defaultInput, 'en')) {
    assert.ok(f.lanes[0].line >= -1 && f.lanes[0].line < common.lanes[0].code.length);
    assert.ok(f.note.length > 0);
  }
});
