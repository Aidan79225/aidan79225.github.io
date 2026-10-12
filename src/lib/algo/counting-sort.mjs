// Counting sort 的逐步 frame 產生器 —— CPHB Ch3。不比較元素,拿元素的值當索引:
// 第一輪把每個值出現幾次記進計數陣列,第二輪照索引順序把它們倒回去。三條 lane:
// 原陣列、計數陣列(bookkeeping)、輸出。
// 元素限定 0..9,因為計數陣列要畫得下;真正的限制是 c = O(n)。

const CODE = [
  'cnt = [0] * (c + 1)',
  'for v in array:',
  '    cnt[v] += 1',
  'out = []',
  'for v in range(c + 1):',
  '    out += [v] * cnt[v]',
];

const TEXT = {
  'zh-hant': {
    input: '原陣列',
    counts: '計數陣列 cnt(索引 = 值)',
    output: '輸出',
    meter: '步數',
    init: (n, c) => `元素都在 0..${c} 之間,所以可以拿「值」當索引。第一輪數每個值出現幾次,第二輪照索引順序倒回去。`,
    count: (i, v, cnt) => `array[${i}] = ${v} → cnt[${v}] 變成 ${cnt}。`,
    countDone: (n) => `數完了,${n} 步。cnt 已經是「排好序的陣列的壓縮版」:每個值出現幾次。`,
    emit: (v, p) => `cnt[${v}] 還有,寫一個 ${v} 到 out[${p}]。`,
    skip: (v) => `cnt[${v}] = 0,跳過。`,
    done: (n, c, steps) =>
      `排好了,共 ${steps} 步 = n + (c + 1) = ${n} + ${c + 1}。沒有做過任何一次「比較」,所以 n log n 的下界管不到它——代價是 c 必須小到計數陣列放得下。`,
    waiting: '',
    invalid: '請輸入 1 到 16 個介於 0 和 9 的整數,用逗號或空白隔開。',
  },
  en: {
    input: 'input array',
    counts: 'count array cnt (index = value)',
    output: 'output',
    meter: 'steps',
    init: (n, c) => `Every element is in 0..${c}, so the value itself can be an index. Pass one counts each value; pass two writes them back in index order.`,
    count: (i, v, cnt) => `array[${i}] = ${v} → cnt[${v}] becomes ${cnt}.`,
    countDone: (n) => `Counting done in ${n} steps. cnt is already the sorted array in compressed form: how many of each value.`,
    emit: (v, p) => `cnt[${v}] is not exhausted: write a ${v} to out[${p}].`,
    skip: (v) => `cnt[${v}] = 0: skip.`,
    done: (n, c, steps) =>
      `Sorted in ${steps} steps = n + (c + 1) = ${n} + ${c + 1}. Not a single comparison was made, so the n log n lower bound does not apply — the price is that c must be small enough for the count array to fit.`,
    waiting: '',
    invalid: 'Enter 1 to 16 integers between 0 and 9, separated by commas or spaces.',
  },
};

export const C = 9;
export const MAX_LENGTH = 16;
export const DEFAULT_INPUT = [1, 3, 6, 9, 9, 3, 5, 9]; // CPHB Ch3 的範例

export function parseInput(text) {
  const parts = String(text).split(/[\s,，、]+/).filter(Boolean);
  if (parts.length === 0 || parts.length > MAX_LENGTH) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > C)) return null;
  return nums;
}

export function randomInput(rand = Math.random) {
  const n = 6 + Math.floor(rand() * 5);
  return Array.from({ length: n }, () => Math.floor(rand() * (C + 1)));
}

export function frames(input, lang = 'zh-hant') {
  const t = TEXT[lang] ?? TEXT['zh-hant'];
  const array = [...input];
  const n = array.length;
  const cnt = Array(C + 1).fill(0);
  const out = Array(n).fill('·');
  const totalSteps = n + C + 1;
  let steps = 0;
  const frames = [];

  const lane = (arr, cursor, ranges, vars, line, note, withMeter = false) => ({
    line,
    note,
    array: [...arr],
    cursor,
    ranges,
    vars,
    done: false,
    ...(withMeter ? { meter: { value: steps, max: totalSteps } } : {}),
  });
  const snap = (note, { line = -1, inCur = -1, cntCur = -1, outCur = -1, cntHit = -1, outFilled = 0, phase = 1 } = {}) => {
    const emptyOut = outFilled < n ? [{ from: outFilled, to: n - 1, kind: 'empty' }] : [];
    frames.push({
      note,
      lanes: [
        lane(
          array,
          inCur,
          phase === 2 ? [{ from: 0, to: n - 1, kind: 'dim' }] : [],
          [{ name: 'i', value: inCur < 0 ? '–' : inCur }],
          line,
          '',
          true,
        ),
        {
          ...lane(cnt, cntCur, cntHit >= 0 ? [{ from: cntHit, to: cntHit, kind: 'swap' }] : [], [{ name: 'v', value: cntCur < 0 ? '–' : cntCur }], -1, ''),
        },
        lane(
          out,
          outCur,
          [...(outFilled > 0 ? [{ from: 0, to: outFilled - 1, kind: 'sorted' }] : []), ...emptyOut],
          [{ name: 'p', value: outFilled }],
          -1,
          '',
        ),
      ],
    });
  };

  snap(t.init(n, C), { line: 0 });
  for (let i = 0; i < n; i++) {
    const v = array[i];
    cnt[v]++;
    steps++;
    snap(t.count(i, v, cnt[v]), { line: 2, inCur: i, cntHit: v });
  }
  snap(t.countDone(n), { line: 3 });
  let p = 0;
  for (let v = 0; v <= C; v++) {
    steps++;
    if (cnt[v] === 0) {
      snap(t.skip(v), { line: 4, cntCur: v, outFilled: p, phase: 2 });
      continue;
    }
    while (cnt[v] > 0) {
      cnt[v]--;
      out[p] = v;
      p++;
      snap(t.emit(v, p - 1), { line: 5, cntCur: v, outCur: p - 1, outFilled: p, phase: 2 });
    }
  }
  snap(t.done(n, C, steps), { line: -1, outFilled: n, phase: 2 });
  for (const l of frames.at(-1).lanes) l.done = true;
  return frames;
}

export default {
  lanes: [
    { title: { 'zh-hant': TEXT['zh-hant'].input, en: TEXT.en.input }, code: CODE },
    { title: { 'zh-hant': TEXT['zh-hant'].counts, en: TEXT.en.counts } },
    { title: { 'zh-hant': TEXT['zh-hant'].output, en: TEXT.en.output } },
  ],
  meterLabel: { 'zh-hant': TEXT['zh-hant'].meter, en: TEXT.en.meter },
  invalid: { 'zh-hant': TEXT['zh-hant'].invalid, en: TEXT.en.invalid },
  defaultInput: DEFAULT_INPUT,
  maxLength: MAX_LENGTH,
  parseInput,
  randomInput,
  frames,
  legend: {
    'zh-hant': { swap: '這一步加一的計數格', sorted: '已經寫好的輸出' },
    en: { swap: 'count cell incremented this step', sorted: 'output written so far' },
  },
};
