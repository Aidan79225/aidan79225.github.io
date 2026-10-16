// 動態陣列倍增的逐步 frame 產生器 —— CPHB Ch4 的 vector / Python 的 list。
// 容量滿了就開一塊兩倍大的新空間、把舊元素全部搬過去。搬家很貴,但很少發生:
// 計數條畫「累計搬了幾個元素」,上限是 2n,所以攤銷下來每次 append 是 O(1)。
// 純函式、不碰 DOM。

const CODE = [
  'def append(x):',
  '    if size == capacity:',
  '        new = [None] * (2 * capacity)',
  '        new[:size] = data        # 搬家',
  '        data, capacity = new, 2 * capacity',
  '    data[size] = x',
  '    size += 1',
];

const TEXT = {
  'zh-hant': {
    meter: '累計搬家',
    init: (n) => `要連續 append ${n} 個元素。容量從 1 開始,滿了就倍增。`,
    append: (x, size, cap) => `append(${x}):還有空位,直接放進 data[${size - 1}]。size = ${size} / capacity = ${cap}。`,
    grow: (size, cap, moved) =>
      `size = capacity = ${size},滿了:開一塊 ${cap} 格的新空間,把 ${size} 個元素搬過去(累計搬了 ${moved} 個)。`,
    done: (n, moved, cap) =>
      `${n} 次 append,總共搬了 ${moved} 個元素,不到 2n = ${2 * n}。搬家的總成本攤到每次 append 上是 O(1)。最後容量 ${cap}。`,
    invalid: '請輸入 1 到 16 個介於 -99 和 99 的整數,用逗號或空白隔開。',
  },
  en: {
    meter: 'elements moved',
    init: (n) => `Append ${n} elements in a row. Capacity starts at 1 and doubles whenever it is full.`,
    append: (x, size, cap) => `append(${x}): there is room, write it to data[${size - 1}]. size = ${size} / capacity = ${cap}.`,
    grow: (size, cap, moved) =>
      `size = capacity = ${size}, full: allocate ${cap} cells and move all ${size} elements over (${moved} moved so far).`,
    done: (n, moved, cap) =>
      `${n} appends, ${moved} elements moved in total, under 2n = ${2 * n}. Spread over the appends, the moves cost O(1) each. Final capacity ${cap}.`,
    invalid: 'Enter 1 to 16 integers between -99 and 99, separated by commas or spaces.',
  },
};

export const MAX_LENGTH = 16;
export const DEFAULT_INPUT = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];

export function parseInput(text) {
  const parts = String(text).replace(/[−–]/g, '-').split(/[\s,，、]+/).filter(Boolean);
  if (parts.length === 0 || parts.length > MAX_LENGTH) return null;
  const nums = parts.map(Number);
  if (nums.some((v) => !Number.isInteger(v) || Math.abs(v) > 99)) return null;
  return nums;
}

export function randomInput(rand = Math.random) {
  const n = 5 + Math.floor(rand() * 12);
  return Array.from({ length: n }, () => Math.floor(rand() * 10));
}

export function frames(input, lang = 'zh-hant') {
  const t = TEXT[lang] ?? TEXT['zh-hant'];
  const n = input.length;
  let capacity = 1;
  let size = 0;
  let moved = 0;
  let data = ['·'];
  const out = [];
  const snap = (line, note, cursor, ranges = []) =>
    out.push({
      line,
      note,
      array: [...data],
      cursor,
      ranges,
      vars: [
        { name: 'size', value: size },
        { name: 'capacity', value: capacity },
        { name: 'moved', value: moved },
      ],
      meter: { value: moved, max: 2 * n },
    });

  snap(0, t.init(n), -1, [{ from: 0, to: 0, kind: 'empty' }]);
  for (const x of input) {
    if (size === capacity) {
      capacity *= 2;
      moved += size;
      data = [...data, ...Array(capacity - size).fill('·')];
      snap(3, t.grow(size, capacity, moved), -1, [
        { from: 0, to: size - 1, kind: 'swap' },
        { from: size, to: capacity - 1, kind: 'empty' },
      ]);
    }
    data[size] = x;
    size++;
    snap(5, t.append(x, size, capacity), size - 1, [
      ...(size < capacity ? [{ from: size, to: capacity - 1, kind: 'empty' }] : []),
    ]);
  }
  snap(-1, t.done(n, moved, capacity), -1, [
    { from: 0, to: size - 1, kind: 'sorted' },
    ...(size < capacity ? [{ from: size, to: capacity - 1, kind: 'empty' }] : []),
  ]);
  return out;
}

export default {
  code: CODE,
  lanes: [{ code: CODE }],
  meterLabel: { 'zh-hant': TEXT['zh-hant'].meter, en: TEXT.en.meter },
  invalid: { 'zh-hant': TEXT['zh-hant'].invalid, en: TEXT.en.invalid },
  defaultInput: DEFAULT_INPUT,
  maxLength: MAX_LENGTH,
  parseInput,
  randomInput,
  frames,
  legend: {
    'zh-hant': { swap: '這一步搬過去的元素', sorted: '放好的元素' },
    en: { swap: 'elements moved this step', sorted: 'elements in place' },
  },
};
