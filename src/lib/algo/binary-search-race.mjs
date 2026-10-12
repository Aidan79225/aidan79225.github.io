// 在排好序的陣列裡找 x:線性掃描 O(n) 與二分搜尋 O(log n) 並排 —— CPHB Ch3。
// 兩邊共用同一個時鐘,每一步各做一次比較。二分搜尋每一步把「還有可能的範圍」砍半,
// 線性掃描每一步只排除一格。
// 輸入格式:「1 3 5 7 | 7」,直線後面是要找的 x;陣列會先排好序。

import { MAX_LENGTH } from './kadane.mjs';

const LINEAR_CODE = [
  'for i in range(n):',
  '    if array[i] == x:',
  '        return i  # found',
];

const BINARY_CODE = [
  'a, b = 0, n - 1',
  'while a <= b:',
  '    k = (a + b) // 2',
  '    if array[k] == x: return k  # found',
  '    if array[k] > x: b = k - 1',
  '    else: a = k + 1',
];

const TEXT = {
  'zh-hant': {
    linear: 'O(n) 線性掃描',
    binary: 'O(log n) 二分搜尋',
    meter: '比較次數',
    init: (n, x) => `同一個排好序的陣列(n = ${n}),兩邊都要找 x = ${x},每一步各做一次比較。`,
    tick: (t, lin, bin) => `第 ${t} 次比較:線性掃描還剩 ${lin} 格沒看,二分搜尋還剩 ${bin} 格有可能。`,
    binDone: (t, found) =>
      found
        ? `二分搜尋在第 ${t} 次比較就找到了;線性掃描還在一格一格看。`
        : `二分搜尋在第 ${t} 次比較後確定 x 不在陣列裡;線性掃描還在一格一格看。`,
    done: (lin, bin, n) =>
      `結束:線性掃描比了 ${lin} 次,二分搜尋比了 ${bin} 次。n = 10⁶ 時是最多 10⁶ 次對最多 20 次。`,
    linStep: (i, v, x) => (v === x ? `array[${i}] = ${v},找到了。` : `array[${i}] = ${v} ≠ ${x},下一格。`),
    linMiss: (x) => `掃完了,${x} 不在陣列裡。`,
    binMid: (k, v, x) =>
      v === x
        ? `中間 array[${k}] = ${v},找到了。`
        : v > x
          ? `中間 array[${k}] = ${v} > ${x}:右半邊全部不用看,b = ${k - 1}。`
          : `中間 array[${k}] = ${v} < ${x}:左半邊全部不用看,a = ${k + 1}。`,
    binMiss: (x) => `範圍空了(a > b),${x} 不在陣列裡。`,
    laneDone: (ops) => `完成,共 ${ops} 次比較。`,
    waiting: '還沒開始。',
    invalid: '請輸入 1 到 16 個整數,再用「|」接要找的數字,例如「1 3 5 7 | 5」。',
  },
  en: {
    linear: 'O(n) linear scan',
    binary: 'O(log n) binary search',
    meter: 'comparisons',
    init: (n, x) => `Same sorted array (n = ${n}), both looking for x = ${x}, one comparison per step each.`,
    tick: (t, lin, bin) => `Comparison #${t}: linear scan has ${lin} cells left to check, binary search has ${bin} cells still possible.`,
    binDone: (t, found) =>
      found
        ? `Binary search found it on comparison #${t}; the linear scan is still going cell by cell.`
        : `After comparison #${t} binary search knows x is not there; the linear scan is still going cell by cell.`,
    done: (lin, bin, n) =>
      `Done: linear scan made ${lin} comparisons, binary search ${bin}. At n = 10⁶ that is up to 10⁶ versus at most 20.`,
    linStep: (i, v, x) => (v === x ? `array[${i}] = ${v}: found.` : `array[${i}] = ${v} ≠ ${x}: next cell.`),
    linMiss: (x) => `Scanned everything; ${x} is not in the array.`,
    binMid: (k, v, x) =>
      v === x
        ? `Middle array[${k}] = ${v}: found.`
        : v > x
          ? `Middle array[${k}] = ${v} > ${x}: drop the whole right half, b = ${k - 1}.`
          : `Middle array[${k}] = ${v} < ${x}: drop the whole left half, a = ${k + 1}.`,
    binMiss: (x) => `Region is empty (a > b); ${x} is not in the array.`,
    laneDone: (ops) => `Done after ${ops} comparisons.`,
    waiting: 'Not started yet.',
    invalid: 'Enter 1 to 16 integers, then "|" and the value to find, e.g. "1 3 5 7 | 5".',
  },
};

export const DEFAULT_INPUT = { array: [1, 3, 4, 7, 9, 12, 15, 18, 21], target: 18 };

export function parseInput(text) {
  const [left, right, ...rest] = String(text).split('|');
  if (rest.length || right === undefined) return null;
  const parts = left.replace(/[−–]/g, '-').split(/[\s,，、]+/).filter(Boolean);
  if (parts.length === 0 || parts.length > MAX_LENGTH) return null;
  const nums = parts.map(Number);
  const target = Number(right.replace(/[−–]/g, '-').trim());
  if ([...nums, target].some((n) => !Number.isInteger(n) || Math.abs(n) > 99)) return null;
  return { array: [...nums].sort((p, q) => p - q), target };
}

export function formatInput({ array, target }) {
  return `${array.join(', ')} | ${target}`;
}

export function randomInput(rand = Math.random) {
  const n = 8 + Math.floor(rand() * 7);
  const set = new Set();
  while (set.size < n) set.add(1 + Math.floor(rand() * 60));
  const array = [...set].sort((p, q) => p - q);
  // 七成找得到、三成找不到
  const target = rand() < 0.7 ? array[Math.floor(rand() * n)] : 1 + Math.floor(rand() * 60);
  return { array, target };
}

export function frames({ array, target: x }, lang = 'zh-hant') {
  const t = TEXT[lang] ?? TEXT['zh-hant'];
  const n = array.length;
  const out = [];

  // 線性掃描
  let i = -1;
  let linDone = false;
  let linOps = 0;
  let linFound = -1;
  let linNote = t.waiting;
  const linView = () => ({
    line: linDone ? -1 : i < 0 ? 0 : 1,
    note: linDone ? `${linNote} ${t.laneDone(linOps)}` : linNote,
    array,
    cursor: linDone || i < 0 ? -1 : i,
    ranges: [
      ...(i > 0 ? [{ from: 0, to: Math.min(i - 1, n - 1), kind: 'dim' }] : []),
      ...(linFound >= 0 ? [{ from: linFound, to: linFound, kind: 'found' }] : []),
    ],
    done: linDone,
    vars: [
      { name: 'i', value: i < 0 || linDone ? '–' : i },
      { name: 'x', value: x },
    ],
    meter: { value: linOps, max: n },
  });

  // 二分搜尋
  let a = 0;
  let b = n - 1;
  let k = -1;
  let binDone = false;
  let binOps = 0;
  let binFound = -1;
  let binNote = t.waiting;
  const binView = () => ({
    line: binDone ? -1 : k < 0 ? 0 : 2,
    note: binDone ? `${binNote} ${t.laneDone(binOps)}` : binNote,
    array,
    cursor: binDone || k < 0 ? -1 : k,
    ranges: [
      ...(a <= b && !binDone ? [{ from: a, to: b, kind: 'region' }] : []),
      ...(a > 0 ? [{ from: 0, to: a - 1, kind: 'dim' }] : []),
      ...(b < n - 1 ? [{ from: b + 1, to: n - 1, kind: 'dim' }] : []),
      ...(binFound >= 0 ? [{ from: binFound, to: binFound, kind: 'found' }] : []),
    ],
    done: binDone,
    vars: [
      { name: 'a', value: binDone ? '–' : a },
      { name: 'b', value: binDone ? '–' : b },
      { name: 'k', value: k < 0 || binDone ? '–' : k },
      { name: 'x', value: x },
    ],
    meter: { value: binOps, max: n },
  });

  out.push({ note: t.init(n, x), lanes: [linView(), binView()] });

  let tick = 0;
  while (!linDone || !binDone) {
    tick++;
    if (!linDone) {
      i++;
      linOps++;
      if (array[i] === x) {
        linFound = i;
        linDone = true;
        linNote = t.linStep(i, array[i], x);
      } else if (i === n - 1) {
        linDone = true;
        linNote = t.linMiss(x);
        i = n;
      } else {
        linNote = t.linStep(i, array[i], x);
      }
    }
    let binJustFinished = false;
    if (!binDone) {
      k = Math.floor((a + b) / 2);
      binOps++;
      const v = array[k];
      binNote = t.binMid(k, v, x);
      if (v === x) {
        binFound = k;
        binDone = true;
      } else {
        if (v > x) b = k - 1;
        else a = k + 1;
        if (a > b) {
          binDone = true;
          binNote = `${binNote} ${t.binMiss(x)}`;
        }
      }
      binJustFinished = binDone;
    }
    let note = t.tick(tick, linDone ? 0 : n - 1 - i, binDone ? 0 : b - a + 1);
    if (binJustFinished && !linDone) note = t.binDone(tick, binFound >= 0);
    if (linDone && binDone) note = t.done(linOps, binOps, n);
    out.push({ note, lanes: [linView(), binView()] });
  }
  return out;
}

export default {
  lanes: [
    { title: { 'zh-hant': TEXT['zh-hant'].linear, en: TEXT.en.linear }, code: LINEAR_CODE },
    { title: { 'zh-hant': TEXT['zh-hant'].binary, en: TEXT.en.binary }, code: BINARY_CODE },
  ],
  meterLabel: { 'zh-hant': TEXT['zh-hant'].meter, en: TEXT.en.meter },
  invalid: { 'zh-hant': TEXT['zh-hant'].invalid, en: TEXT.en.invalid },
  defaultInput: DEFAULT_INPUT,
  maxLength: MAX_LENGTH,
  parseInput,
  formatInput,
  randomInput,
  frames,
  legend: {
    'zh-hant': { region: '還有可能的範圍', found: '找到了' },
    en: { region: 'still possible', found: 'found' },
  },
};
