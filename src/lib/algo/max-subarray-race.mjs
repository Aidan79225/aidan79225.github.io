// 最大子陣列和:O(n²) 暴力解與 O(n) Kadane 並排賽跑 —— CPHB Ch2。
// 兩邊共用同一個時鐘:每一步各做「一次加法 + 一次比較」,所以讀者直接看見
// Kadane 早早做完、暴力解還在一個區間一個區間地加。
// 純函式、不碰 DOM;播放器以多條 lane 的方式畫出來。

import { parseInput, randomInput, DEFAULT_INPUT, MAX_LENGTH } from './kadane.mjs';

const BRUTE_CODE = [
  'int best = 0;',
  'for (int a = 0; a < n; a++) {',
  '    int sum = 0;',
  '    for (int b = a; b < n; b++) {',
  '        sum += array[b];',
  '        best = max(best, sum);',
  '    }',
  '}',
];

const KADANE_CODE = [
  'int best = 0, sum = 0;',
  'for (int k = 0; k < n; k++) {',
  '    sum = max(array[k], sum + array[k]);',
  '    best = max(best, sum);',
  '}',
];

const TEXT = {
  'zh-hant': {
    brute: 'O(n²) 暴力解',
    kadane: 'O(n) Kadane',
    ops: '加法次數',
    init: (n, total) =>
      `兩邊從同一個陣列出發,每一步各做一次加法。n = ${n}:暴力解要試 ${total} 個區間,Kadane 只要看 ${n} 格。`,
    tick: (t, total, k, n) => `第 ${t} 步:暴力解 ${t} / ${total} 次加法,Kadane ${k} / ${n} 次。`,
    kadaneDone: (n, t, total) =>
      `Kadane 做完了(${n} 次加法),暴力解才做到 ${t} / ${total}。後面全是暴力解一個人在跑。`,
    done: (best, total, n) =>
      `兩邊答案一樣都是 ${best},但暴力解做了 ${total} 次加法、Kadane 只做了 ${n} 次。n = 10⁵ 時,差距是約 5×10⁹ 次對 10⁵ 次。`,
    bruteStart: (a) => `換新的起點 a = ${a},sum 歸零重新加。`,
    bruteSum: (a, b, s) => `array[${a}..${b}] 的和 = ${s}。`,
    better: (b) => `比 best 大,best 更新為 ${b}。`,
    kadaneFirst: (x) => `看第一格 array[0] = ${x}:sum = ${x}。`,
    kadaneExtend: (k, x, s) => `看 array[${k}] = ${x}:接上去,sum = ${s}。`,
    kadaneRestart: (k, x, s) => `看 array[${k}] = ${x}:前面的 sum 是負的,從這格重新開始,sum = ${s}。`,
    laneDone: (best, ops) => `完成:best = ${best},共 ${ops} 次加法。`,
    waiting: '還沒開始。',
  },
  en: {
    brute: 'O(n²) brute force',
    kadane: 'O(n) Kadane',
    ops: 'additions',
    init: (n, total) =>
      `Both start from the same array and do one addition per step. n = ${n}: brute force tries ${total} subarrays, Kadane looks at ${n} elements.`,
    tick: (t, total, k, n) => `Step ${t}: brute force ${t} / ${total} additions, Kadane ${k} / ${n}.`,
    kadaneDone: (n, t, total) =>
      `Kadane is done (${n} additions) while brute force is only at ${t} / ${total}. From here on brute force runs alone.`,
    done: (best, total, n) =>
      `Same answer, ${best}, but brute force did ${total} additions and Kadane only ${n}. At n = 10⁵ that is about 5×10⁹ versus 10⁵.`,
    bruteStart: (a) => `New start a = ${a}; sum resets to 0.`,
    bruteSum: (a, b, s) => `Sum of array[${a}..${b}] = ${s}.`,
    better: (b) => `Beats best, so best = ${b}.`,
    kadaneFirst: (x) => `First element array[0] = ${x}: sum = ${x}.`,
    kadaneExtend: (k, x, s) => `array[${k}] = ${x}: extend, sum = ${s}.`,
    kadaneRestart: (k, x, s) => `array[${k}] = ${x}: the running sum is negative, start over here, sum = ${s}.`,
    laneDone: (best, ops) => `Done: best = ${best} after ${ops} additions.`,
    waiting: 'Not started yet.',
  },
};

// 暴力解:每呼叫一次 step() 做一次內層迴圈(一次加法)。
function bruteRunner(array) {
  const n = array.length;
  let a = 0;
  let b = -1;
  let sum = 0;
  let best = 0;
  let bestRange = null;
  let ops = 0;
  return {
    get done() {
      return ops === (n * (n + 1)) / 2;
    },
    step(t) {
      const notes = [];
      if (b === n - 1 || b < a) {
        if (b === n - 1) a++;
        b = a - 1;
        sum = 0;
        notes.push(t.bruteStart(a));
      }
      b++;
      sum += array[b];
      ops++;
      notes.push(t.bruteSum(a, b, sum));
      if (sum > best) {
        best = sum;
        bestRange = { from: a, to: b, kind: 'best' };
        notes.push(t.better(best));
      }
      return notes.join('');
    },
    view(t, note) {
      const ranges = [];
      if (bestRange) ranges.push(bestRange);
      if (!this.done && ops > 0) ranges.push({ from: a, to: b, kind: 'current' });
      const finished = this.done;
      return {
        line: ops === 0 ? 0 : finished ? -1 : 4,
        note: finished ? t.laneDone(best, ops) : note,
        array,
        cursor: ops === 0 || finished ? -1 : b,
        ranges,
        done: finished,
        vars: [
          { name: 'a', value: ops === 0 || finished ? '–' : a },
          { name: 'b', value: ops === 0 || finished ? '–' : b },
          { name: 'sum', value: sum },
          { name: 'best', value: best },
        ],
        meter: { value: ops, max: (n * (n + 1)) / 2 },
      };
    },
    get best() {
      return best;
    },
  };
}

// Kadane:每呼叫一次 step() 看一格(一次加法)。
function kadaneRunner(array) {
  const n = array.length;
  let k = -1;
  let sum = 0;
  let best = 0;
  let start = 0;
  let bestRange = null;
  return {
    get done() {
      return k === n - 1;
    },
    step(t) {
      k++;
      const x = array[k];
      let note;
      if (k === 0) {
        sum = x;
        note = t.kadaneFirst(x);
      } else if (x > sum + x) {
        start = k;
        sum = x;
        note = t.kadaneRestart(k, x, sum);
      } else {
        sum += x;
        note = t.kadaneExtend(k, x, sum);
      }
      if (sum > best) {
        best = sum;
        bestRange = { from: start, to: k, kind: 'best' };
        note += t.better(best);
      }
      return note;
    },
    view(t, note) {
      const ranges = [];
      if (bestRange) ranges.push(bestRange);
      if (!this.done && k >= 0) ranges.push({ from: start, to: k, kind: 'current' });
      const finished = this.done;
      return {
        line: k < 0 ? 0 : finished ? -1 : 2,
        note: finished ? t.laneDone(best, n) : note,
        array,
        cursor: k < 0 || finished ? -1 : k,
        ranges,
        done: finished,
        vars: [
          { name: 'k', value: k < 0 || finished ? '–' : k },
          { name: 'sum', value: sum },
          { name: 'best', value: best },
        ],
        meter: { value: k + 1, max: (n * (n + 1)) / 2 },
      };
    },
    get best() {
      return best;
    },
  };
}

export function frames(array, lang = 'zh-hant') {
  const t = TEXT[lang] ?? TEXT['zh-hant'];
  const n = array.length;
  const total = (n * (n + 1)) / 2;
  const brute = bruteRunner(array);
  const kadane = kadaneRunner(array);
  const out = [];

  out.push({
    note: t.init(n, total),
    lanes: [brute.view(t, t.waiting), kadane.view(t, t.waiting)],
  });

  let kadaneNote = '';
  for (let tick = 1; tick <= total; tick++) {
    const bruteNote = brute.step(t);
    let note = t.tick(tick, total, Math.min(tick, n), n);
    if (!kadane.done) {
      kadaneNote = kadane.step(t);
      if (kadane.done) note = t.kadaneDone(n, tick, total);
    }
    if (brute.done) note = t.done(brute.best, total, n);
    out.push({ note, lanes: [brute.view(t, bruteNote), kadane.view(t, kadaneNote)] });
  }
  return out;
}

export default {
  lanes: [
    { title: { 'zh-hant': TEXT['zh-hant'].brute, en: TEXT.en.brute }, code: BRUTE_CODE },
    { title: { 'zh-hant': TEXT['zh-hant'].kadane, en: TEXT.en.kadane }, code: KADANE_CODE },
  ],
  defaultSpeed: 'fast', // 暴力解的步數是 n(n+1)/2,用中速要等太久
  meterLabel: { 'zh-hant': TEXT['zh-hant'].ops, en: TEXT.en.ops },
  defaultInput: DEFAULT_INPUT,
  maxLength: MAX_LENGTH,
  parseInput,
  randomInput,
  frames,
  legend: {
    'zh-hant': { current: '正在算的子陣列(sum)', best: '目前最好的子陣列(best)' },
    en: { current: 'subarray being summed (sum)', best: 'best subarray so far (best)' },
  },
};
