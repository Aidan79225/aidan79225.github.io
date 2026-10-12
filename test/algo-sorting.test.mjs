import { test } from 'node:test';
import assert from 'node:assert/strict';
import bubble, { frames as bubbleFrames, countInversions, randomInput as randomArray } from '../src/lib/algo/bubble-sort.mjs';
import race, { frames as raceFrames, parseInput as parseRace, formatInput, randomInput as randomRace } from '../src/lib/algo/binary-search-race.mjs';
import counting, { frames as countFrames, parseInput as parseCount, randomInput as randomCount, C } from '../src/lib/algo/counting-sort.mjs';

const lcg = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const varOf = (f, name) => f.vars.find((v) => v.name === name).value;
const sorted = (a) => [...a].sort((p, q) => p - q);

// ── bubble sort ──
test('bubble sort: book example ends sorted, swaps == initial inversions', () => {
  const fs = bubbleFrames(bubble.defaultInput);
  const last = fs.at(-1);
  assert.deepEqual(last.array, sorted(bubble.defaultInput));
  assert.equal(varOf(last, 'swaps'), countInversions(bubble.defaultInput));
  assert.equal(varOf(last, 'inversions'), 0);
});

test('bubble sort: every swap frame removes exactly one inversion', () => {
  const rand = lcg(3);
  for (let r = 0; r < 200; r++) {
    const a = randomArray(rand);
    const fs = bubbleFrames(a);
    let prev = countInversions(a);
    for (const f of fs) {
      const inv = countInversions(f.array);
      assert.equal(inv, varOf(f, 'inversions'), `input ${a}`);
      if (f.ranges.some((x) => x.kind === 'swap')) assert.equal(inv, prev - 1, `input ${a}`);
      else assert.equal(inv, prev, `input ${a}`);
      prev = inv;
      // 每個 frame 都是同一組數字的排列
      assert.deepEqual(sorted(f.array), sorted(a));
    }
    assert.deepEqual(fs.at(-1).array, sorted(a));
  }
});

test('bubble sort: already-sorted input stops after one round', () => {
  const fs = bubbleFrames([1, 2, 3, 4]);
  assert.equal(fs.length, 1 + 3 + 1);
  assert.equal(varOf(fs.at(-1), 'swaps'), 0);
});

test('bubble sort: reverse order costs n(n-1)/2 swaps', () => {
  assert.equal(varOf(bubbleFrames([5, 4, 3, 2, 1]).at(-1), 'swaps'), 10);
});

// ── binary search race ──
test('binary search race: finds the target, binary search within ceil(log2(n+1)) comparisons', () => {
  const rand = lcg(9);
  for (let r = 0; r < 300; r++) {
    const input = randomRace(rand);
    const { array, target } = input;
    const fs = raceFrames(input);
    const [lin, bin] = fs.at(-1).lanes;
    assert.ok(lin.done && bin.done);
    const expect = array.indexOf(target);
    const linFound = lin.ranges.find((x) => x.kind === 'found');
    const binFound = bin.ranges.find((x) => x.kind === 'found');
    if (expect >= 0) {
      assert.equal(linFound.from, expect, `input ${formatInput(input)}`);
      assert.equal(array[binFound.from], target, `input ${formatInput(input)}`);
      assert.equal(lin.meter.value, expect + 1);
    } else {
      assert.equal(linFound, undefined);
      assert.equal(binFound, undefined);
      assert.equal(lin.meter.value, array.length);
    }
    assert.ok(bin.meter.value <= Math.ceil(Math.log2(array.length + 1)), `input ${formatInput(input)} took ${bin.meter.value}`);
    // 二分搜尋的 region 每一步都包住目標(目標存在時),而且單調縮小
    let prevSize = Infinity;
    for (const f of fs.slice(1)) {
      const region = f.lanes[1].ranges.find((x) => x.kind === 'region');
      if (!region) continue;
      const size = region.to - region.from + 1;
      assert.ok(size < prevSize, `region must shrink: ${formatInput(input)}`);
      prevSize = size;
      if (expect >= 0) assert.ok(region.from <= expect && expect <= region.to, `region must contain target: ${formatInput(input)}`);
    }
  }
});

test('binary search race: parseInput sorts, needs exactly one "|", rejects junk', () => {
  assert.deepEqual(parseRace('7 3 5 | 5'), { array: [3, 5, 7], target: 5 });
  assert.deepEqual(parseRace('1,2,3|−2'), { array: [1, 2, 3], target: -2 });
  assert.equal(parseRace('1 2 3'), null);
  assert.equal(parseRace('1 2 | 3 | 4'), null);
  assert.equal(parseRace('1 x | 3'), null);
  assert.equal(parseRace('1 2 | 100'), null);
  assert.equal(formatInput(parseRace('3 1 | 2')), '1, 3 | 2');
});

test('binary search race: single element, both lanes finish on tick 1', () => {
  const fs = raceFrames({ array: [4], target: 4 });
  assert.equal(fs.length, 2);
  assert.ok(fs[1].lanes.every((l) => l.done));
});

test('binary search race: every lane frame points at a real code line', () => {
  for (const f of raceFrames(race.defaultInput, 'en')) {
    f.lanes.forEach((l, i) => assert.ok(l.line >= -1 && l.line < race.lanes[i].code.length));
    assert.ok(f.note.length > 0);
  }
});

// ── counting sort ──
test('counting sort: output is the sorted input, steps == n + c + 1', () => {
  const rand = lcg(21);
  for (let r = 0; r < 200; r++) {
    const a = randomCount(rand);
    const fs = countFrames(a);
    const last = fs.at(-1);
    assert.deepEqual(last.lanes[2].array, sorted(a), `input ${a}`);
    assert.deepEqual(last.lanes[1].array, Array(C + 1).fill(0), 'counts drained');
    assert.equal(last.lanes[0].meter.value, a.length + C + 1);
    assert.ok(last.lanes.every((l) => l.done));
    // 輸出 lane 已寫好的部分永遠是遞增的
    for (const f of fs) {
      const written = f.lanes[2].array.filter((v) => v !== '·');
      assert.deepEqual(written, sorted(written));
    }
  }
});

test('counting sort: after the counting pass, cnt[v] equals the multiplicity of v', () => {
  const a = counting.defaultInput;
  const fs = countFrames(a);
  const afterCount = fs[a.length + 1].lanes[1].array;
  for (let v = 0; v <= C; v++) assert.equal(afterCount[v], a.filter((x) => x === v).length);
});

test('counting sort: parseInput only accepts 0..9', () => {
  assert.deepEqual(parseCount('1 3 6, 9'), [1, 3, 6, 9]);
  assert.equal(parseCount('10'), null);
  assert.equal(parseCount('-1'), null);
  assert.equal(parseCount(''), null);
});
