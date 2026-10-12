// Bubble sort 的逐步 frame 產生器 —— CPHB Ch3。重點不在排序本身,在「每一次交換
// 剛好消掉一個 inversion」:計數條畫的是剩下的 inversion 數,它每次交換只會減一,
// 所以只交換相鄰元素的排序法至少要 O(n²)。
// 純函式、不碰 DOM。

import { parseInput as parseArray, MAX_LENGTH } from './kadane.mjs';

const CODE = [
  'for i in range(n):',
  '    for j in range(n - 1):',
  '        if array[j] > array[j + 1]:',
  '            array[j], array[j + 1] = array[j + 1], array[j]',
];

const TEXT = {
  'zh-hant': {
    init: (inv) => `一開始有 ${inv} 個 inversion(前面比後面大的配對)。每交換一對相鄰元素,剛好消掉一個。`,
    compareSwap: (j, a, b, inv) => `array[${j}] = ${a} > array[${j + 1}] = ${b},交換。inversion 剩 ${inv}。`,
    compareKeep: (j, a, b) => `array[${j}] = ${a} ≤ array[${j + 1}] = ${b},不動。`,
    roundDone: (i, n) => `第 ${i + 1} 輪結束:最大的 ${i + 1} 個已經在正確位置。`,
    done: (swaps, n) =>
      `排好了,共交換 ${swaps} 次——剛好等於一開始的 inversion 數。最壞情況(倒序)是 n(n−1)/2 = ${(n * (n - 1)) / 2} 次。`,
    earlyDone: (swaps, i) => `第 ${i + 1} 輪一次都沒交換,代表已經排好,提早結束。共交換 ${swaps} 次。`,
    meter: 'inversion 剩餘',
  },
  en: {
    init: (inv) => `${inv} inversions to start with (pairs where the earlier element is larger). Each adjacent swap removes exactly one.`,
    compareSwap: (j, a, b, inv) => `array[${j}] = ${a} > array[${j + 1}] = ${b}: swap. ${inv} inversions left.`,
    compareKeep: (j, a, b) => `array[${j}] = ${a} ≤ array[${j + 1}] = ${b}: leave it.`,
    roundDone: (i, n) => `Round ${i + 1} done: the ${i + 1} largest elements are in place.`,
    done: (swaps, n) =>
      `Sorted after ${swaps} swaps — exactly the number of inversions we started with. The worst case (reverse order) is n(n−1)/2 = ${(n * (n - 1)) / 2}.`,
    earlyDone: (swaps, i) => `Round ${i + 1} made no swaps, so the array is sorted; stop early. ${swaps} swaps in total.`,
    meter: 'inversions left',
  },
};

export const DEFAULT_INPUT = [1, 3, 8, 2, 9, 2, 5, 6]; // CPHB Ch3 的範例

export function countInversions(a) {
  let inv = 0;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) inv++;
  return inv;
}

export function parseInput(text) {
  return parseArray(text);
}

export function randomInput(rand = Math.random) {
  const n = 6 + Math.floor(rand() * 3);
  return Array.from({ length: n }, () => 1 + Math.floor(rand() * 9));
}

export function frames(input, lang = 'zh-hant') {
  const t = TEXT[lang] ?? TEXT['zh-hant'];
  const array = [...input];
  const n = array.length;
  const total = countInversions(array);
  let inv = total;
  let swaps = 0;
  const out = [];

  const snap = (line, note, cursor, extra = [], sortedFrom = n) => {
    const ranges = [];
    if (sortedFrom < n) ranges.push({ from: sortedFrom, to: n - 1, kind: 'sorted' });
    ranges.push(...extra);
    out.push({
      line,
      note,
      array: [...array],
      cursor,
      ranges,
      vars: [
        { name: 'swaps', value: swaps },
        { name: 'inversions', value: inv },
      ],
      meter: { value: inv, max: Math.max(total, 1) },
    });
  };

  snap(0, t.init(total), -1);
  for (let i = 0; i < n; i++) {
    let swappedThisRound = 0;
    for (let j = 0; j < n - 1 - i; j++) {
      if (array[j] > array[j + 1]) {
        [array[j], array[j + 1]] = [array[j + 1], array[j]];
        inv--;
        swaps++;
        swappedThisRound++;
        snap(3, t.compareSwap(j, array[j + 1], array[j], inv), j, [{ from: j, to: j + 1, kind: 'swap' }], n - i);
      } else {
        snap(2, t.compareKeep(j, array[j], array[j + 1]), j, [{ from: j, to: j + 1, kind: 'current' }], n - i);
      }
    }
    if (swappedThisRound === 0) {
      snap(-1, t.earlyDone(swaps, i), -1, [], 0);
      return out;
    }
    if (i < n - 1) snap(0, t.roundDone(i, n), -1, [], n - i - 1);
  }
  snap(-1, t.done(swaps, n), -1, [], 0);
  return out;
}

export default {
  code: CODE,
  defaultInput: DEFAULT_INPUT,
  maxLength: MAX_LENGTH,
  parseInput,
  randomInput,
  frames,
  defaultSpeed: 'fast',
  // 單一 lane 也可以有計數條:把 lane 的 meter 畫出來
  lanes: [{ code: CODE }],
  meterLabel: { 'zh-hant': TEXT['zh-hant'].meter, en: TEXT.en.meter },
  legend: {
    'zh-hant': { current: '正在比較的兩格', swap: '這一步交換的兩格', sorted: '已經在正確位置' },
    en: { current: 'pair being compared', swap: 'pair swapped this step', sorted: 'already in place' },
  },
};
