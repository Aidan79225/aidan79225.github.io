// 最大子陣列和(Kadane)的逐步 frame 產生器 —— CPHB Ch2 的 O(n) 解法。
// 跟書上一樣允許空子陣列,所以 best 從 0 起跳、答案至少是 0。
// 純函式、不碰 DOM:播放器(src/lib/algo/player.mjs)只負責把 frame 畫出來。

const CODE = [
  'int best = 0, sum = 0;',
  'for (int k = 0; k < n; k++) {',
  '    sum = max(array[k], sum + array[k]);',
  '    best = max(best, sum);',
  '}',
  'cout << best << "\\n";',
];

const NOTES = {
  'zh-hant': {
    init: 'best 和 sum 都從 0 開始(允許空子陣列,所以答案至少是 0)。',
    first: (x) => `看第一格 array[0] = ${x}:前面沒有東西可以接,sum = ${x}。`,
    extend: (k, x, s) => `看 array[${k}] = ${x}:接在前面的子陣列後面,sum 變成 ${s}。`,
    restart: (k, x, s) =>
      `看 array[${k}] = ${x}:前面累積的 sum 是負的,接上去只會更小,所以從這格重新開始,sum = ${s}。`,
    better: (s, b) => `sum = ${s} 比 best = ${b} 大,更新 best。`,
    keep: (s, b) => `sum = ${s} 沒有超過 best = ${b},best 不變。`,
    done: (b, lo, hi) =>
      lo < 0
        ? `掃完了:每個元素都是負的,最好的選擇是空子陣列,答案 ${b}。`
        : `掃完了:答案 best = ${b},是 array[${lo}..${hi}] 的和。每個元素只看一次,所以是 O(n)。`,
  },
  en: {
    init: 'best and sum both start at 0 (the empty subarray is allowed, so the answer is at least 0).',
    first: (x) => `First element array[0] = ${x}: nothing to extend yet, so sum = ${x}.`,
    extend: (k, x, s) => `array[${k}] = ${x}: extend the current subarray, so sum becomes ${s}.`,
    restart: (k, x, s) =>
      `array[${k}] = ${x}: the running sum is negative and would only drag it down, so start over here, sum = ${s}.`,
    better: (s, b) => `sum = ${s} beats best = ${b}, so best is updated.`,
    keep: (s, b) => `sum = ${s} does not beat best = ${b}; best stays.`,
    done: (b, lo, hi) =>
      lo < 0
        ? `Done: every element is negative, so the best choice is the empty subarray, answer ${b}.`
        : `Done: best = ${b}, the sum of array[${lo}..${hi}]. Each element is visited once, so this is O(n).`,
  },
};

export const MAX_LENGTH = 16;
export const DEFAULT_INPUT = [-1, 2, 4, -3, 5, 2, -5, 2]; // CPHB Ch2 的範例

// "−1, 2 4,-3" → [-1, 2, 4, -3]。格式不對回傳 null,讓播放器顯示錯誤而不是畫壞。
export function parseInput(text) {
  const parts = String(text)
    .replace(/[−–]/g, '-')
    .split(/[\s,\uFF0C\u3001]+/)
    .filter(Boolean);
  if (parts.length === 0 || parts.length > MAX_LENGTH) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isInteger(n) || Math.abs(n) > 99)) return null;
  return nums;
}

export function randomInput(rand = Math.random) {
  const n = 6 + Math.floor(rand() * 5);
  return Array.from({ length: n }, () => Math.floor(rand() * 19) - 9);
}

const range = (from, to, kind) => ({ from, to, kind });

export function frames(array, lang = 'zh-hant') {
  const t = NOTES[lang] ?? NOTES['zh-hant'];
  const out = [];
  let best = 0;
  let sum = 0;
  let start = 0; // 目前子陣列的起點
  let bestLo = -1; // best 對應的區間;-1 = 空子陣列
  let bestHi = -1;

  const snapshot = (line, note, cursor, extra = []) => {
    const ranges = [];
    if (bestLo >= 0) ranges.push(range(bestLo, bestHi, 'best'));
    ranges.push(...extra);
    out.push({
      line,
      note,
      array,
      cursor,
      ranges,
      vars: [
        { name: 'k', value: cursor < 0 ? '–' : cursor },
        { name: 'sum', value: sum },
        { name: 'best', value: best },
      ],
    });
  };

  snapshot(0, t.init, -1);
  for (let k = 0; k < array.length; k++) {
    const x = array[k];
    if (k === 0) {
      sum = x;
      snapshot(2, t.first(x), k, [range(start, k, 'current')]);
    } else if (x > sum + x) {
      start = k;
      sum = x;
      snapshot(2, t.restart(k, x, sum), k, [range(start, k, 'current')]);
    } else {
      sum = sum + x;
      snapshot(2, t.extend(k, x, sum), k, [range(start, k, 'current')]);
    }
    if (sum > best) {
      const prev = best;
      best = sum;
      bestLo = start;
      bestHi = k;
      snapshot(3, t.better(sum, prev), k, [range(start, k, 'current')]);
    } else {
      snapshot(3, t.keep(sum, best), k, [range(start, k, 'current')]);
    }
  }
  snapshot(5, t.done(best, bestLo, bestHi), -1);
  return out;
}

export default {
  code: CODE,
  defaultInput: DEFAULT_INPUT,
  maxLength: MAX_LENGTH,
  parseInput,
  randomInput,
  frames,
  legend: {
    'zh-hant': { current: '目前的子陣列(sum)', best: '目前最好的子陣列(best)' },
    en: { current: 'current subarray (sum)', best: 'best subarray so far (best)' },
  },
};
