// 兩個 list 有幾個共同元素 —— CPHB Ch4「Comparison to sorting」。
// 兩種做法接著跑:先用 set(把 A 全部放進 set,再掃 B 一個一個查),
// 再用排序(A、B 各自排好,兩個指標一起往右走)。兩種都是 O(n log n) 或更好,
// 原書的重點是常數:排序一次做完、之後只有線性掃描,比一路維護結構便宜。
// 四條 lane:A、B(查 set)、排好的 A、排好的 B。
// 輸入格式:「5 2 8 9 | 3 2 9 5」。

const CODE = [
  '# 做法 1:set',
  'seen = set(A)',
  'count = sum(1 for x in B if x in seen)',
  '# 做法 2:排序 + 兩個指標',
  'A.sort(); B.sort(); i = j = 0',
  'while i < len(A) and j < len(B):',
  '    if A[i] == B[j]: count += 1; i += 1; j += 1',
  '    elif A[i] < B[j]: i += 1',
  '    else: j += 1',
];

const TEXT = {
  'zh-hant': {
    laneA: 'A',
    laneB: 'B(逐一查 set)',
    laneSA: '排好的 A(指標 i)',
    laneSB: '排好的 B(指標 j)',
    meter: '步數',
    init: (n) => `A、B 各 ${n} 個元素,要算有幾個共同元素。先用 set,再用排序,看兩種做法各走幾步。`,
    insert: (x) => `把 A 的 ${x} 放進 set。`,
    hit: (x) => `B 的 ${x} 在 set 裡,count + 1。`,
    miss: (x) => `B 的 ${x} 不在 set 裡。`,
    setDone: (c, steps) => `做法 1 完成:${c} 個共同元素,${steps} 步——但每一步都是一次雜湊與查表。`,
    sorted: () => `做法 2:先把 A、B 各自排好(排序只做一次),然後兩個指標從頭開始。`,
    eq: (x) => `A[i] = B[j] = ${x}:共同元素,count + 1,兩個指標都往右。`,
    lt: (a, b) => `A[i] = ${a} < B[j] = ${b}:${a} 不可能在 B 的後面出現了,i 往右。`,
    gt: (a, b) => `A[i] = ${a} > B[j] = ${b}:${b} 不可能在 A 的後面出現了,j 往右。`,
    done: (c1, c2, s1, s2) =>
      (c1 === c2
        ? `兩種做法答案都是 ${c1}。`
        : `set 算出 ${c1}、雙指標算出 ${c2}——有重複元素時兩者定義不同:set 算「B 裡有幾個元素出現在 A」,雙指標算多重集合的交集。`) +
      `set 走了 ${s1} 步、排序後的雙指標走了 ${s2} 步——步數差不多,差的是每一步的價錢:雙指標的每一步只是一次比較和一次加法。`,
    waiting: '',
    invalid: '請輸入兩組 1 到 12 個整數,用「|」隔開,例如「5 2 8 9 | 3 2 9 5」。',
  },
  en: {
    laneA: 'A',
    laneB: 'B (look each up in the set)',
    laneSA: 'sorted A (pointer i)',
    laneSB: 'sorted B (pointer j)',
    meter: 'steps',
    init: (n) => `A and B have ${n} elements each; count the common ones. First with a set, then with sorting, and compare the steps.`,
    insert: (x) => `Insert ${x} from A into the set.`,
    hit: (x) => `${x} from B is in the set: count + 1.`,
    miss: (x) => `${x} from B is not in the set.`,
    setDone: (c, steps) => `Approach 1 done: ${c} common elements in ${steps} steps — but every step is a hash and a table lookup.`,
    sorted: () => `Approach 2: sort A and B first (one sort each), then start two pointers from the left.`,
    eq: (x) => `A[i] = B[j] = ${x}: common element, count + 1, both pointers move right.`,
    lt: (a, b) => `A[i] = ${a} < B[j] = ${b}: ${a} can no longer appear further along B, so i moves right.`,
    gt: (a, b) => `A[i] = ${a} > B[j] = ${b}: ${b} can no longer appear further along A, so j moves right.`,
    done: (c1, c2, s1, s2) =>
      (c1 === c2
        ? `Both approaches answer ${c1}. `
        : `The set says ${c1}, the two pointers say ${c2} — with duplicates the two count different things: the set counts elements of B that appear in A, the pointers count the multiset intersection. `) +
      `The set took ${s1} steps, the two pointers after sorting took ${s2} — about the same count; the difference is the price of a step: a pointer step is one comparison and one increment.`,
    waiting: '',
    invalid: 'Enter two groups of 1 to 12 integers separated by "|", e.g. "5 2 8 9 | 3 2 9 5".',
  },
};

export const MAX_LENGTH = 12;
export const DEFAULT_INPUT = { a: [5, 2, 8, 9], b: [3, 2, 9, 5] }; // CPHB Ch4 的例子

const parseList = (s) => {
  const parts = s.replace(/[−–]/g, '-').split(/[\s,，、]+/).filter(Boolean);
  if (parts.length === 0 || parts.length > MAX_LENGTH) return null;
  const nums = parts.map(Number);
  if (nums.some((v) => !Number.isInteger(v) || Math.abs(v) > 99)) return null;
  return nums;
};

export function parseInput(text) {
  const [left, right, ...rest] = String(text).split('|');
  if (rest.length || right === undefined) return null;
  const a = parseList(left);
  const b = parseList(right);
  if (!a || !b) return null;
  return { a, b };
}

export function formatInput({ a, b }) {
  return `${a.join(', ')} | ${b.join(', ')}`;
}

export function randomInput(rand = Math.random) {
  const n = 4 + Math.floor(rand() * 5);
  // 各自不重複,兩種做法的答案才會一樣(原書的例子也是)
  const pick = () => {
    const s = new Set();
    while (s.size < n) s.add(1 + Math.floor(rand() * 14));
    return [...s];
  };
  return { a: pick(), b: pick() };
}

export function frames({ a, b }, lang = 'zh-hant') {
  const t = TEXT[lang] ?? TEXT['zh-hant'];
  const sa = [...a].sort((p, q) => p - q);
  const sb = [...b].sort((p, q) => p - q);
  const out = [];
  let steps = 0;
  let count = 0;

  const lane = (arr, cursor, ranges, vars, line = -1) => ({ line, note: '', array: arr, cursor, ranges, vars, done: false });
  const snap = (note, { line = -1, aIns = -1, bCur = -1, bHits = [], bMisses = [], i = -1, j = -1, phase = 1, eqs = [] } = {}) => {
    const dimAll = (arr) => [{ from: 0, to: arr.length - 1, kind: 'dim' }];
    out.push({
      note,
      lanes: [
        {
          ...lane(
            a,
            phase === 1 ? aIns : -1,
            phase === 1 ? (aIns >= 0 ? [{ from: 0, to: aIns, kind: 'sorted' }] : []) : dimAll(a),
            [{ name: 'count', value: count }],
            line,
          ),
          meter: { value: steps, max: 2 * (a.length + b.length) },
        },
        lane(
          b,
          phase === 1 ? bCur : -1,
          phase === 1
            ? [...bHits.map((k) => ({ from: k, to: k, kind: 'found' })), ...bMisses.map((k) => ({ from: k, to: k, kind: 'dim' }))]
            : dimAll(b),
          [],
        ),
        lane(sa, phase === 2 ? i : -1, phase === 2 ? [...(i > 0 ? [{ from: 0, to: Math.min(i, sa.length) - 1, kind: 'dim' }] : []), ...eqs.filter((e) => e[0] >= 0).map((e) => ({ from: e[0], to: e[0], kind: 'found' }))] : [], [
          { name: 'i', value: phase === 2 && i < sa.length ? i : '–' },
        ]),
        lane(sb, phase === 2 ? j : -1, phase === 2 ? [...(j > 0 ? [{ from: 0, to: Math.min(j, sb.length) - 1, kind: 'dim' }] : []), ...eqs.filter((e) => e[1] >= 0).map((e) => ({ from: e[1], to: e[1], kind: 'found' }))] : [], [
          { name: 'j', value: phase === 2 && j < sb.length ? j : '–' },
        ]),
      ],
    });
  };

  snap(t.init(a.length), { line: 0 });
  // 做法 1
  for (let k = 0; k < a.length; k++) {
    steps++;
    snap(t.insert(a[k]), { line: 1, aIns: k });
  }
  const seen = new Set(a);
  const hits = [];
  const misses = [];
  for (let k = 0; k < b.length; k++) {
    steps++;
    if (seen.has(b[k]) ) {
      count++;
      hits.push(k);
      snap(t.hit(b[k]), { line: 2, aIns: a.length - 1, bCur: k, bHits: [...hits], bMisses: [...misses] });
    } else {
      misses.push(k);
      snap(t.miss(b[k]), { line: 2, aIns: a.length - 1, bCur: k, bHits: [...hits], bMisses: [...misses] });
    }
  }
  const steps1 = steps;
  const count1 = count;
  snap(t.setDone(count1, steps1), { line: 2, aIns: a.length - 1, bHits: [...hits], bMisses: [...misses] });

  // 做法 2
  steps = 0;
  count = 0;
  let i = 0;
  let j = 0;
  const eqs = [];
  snap(t.sorted(), { line: 4, phase: 2, i, j });
  while (i < sa.length && j < sb.length) {
    steps++;
    if (sa[i] === sb[j]) {
      count++;
      eqs.push([i, j]);
      i++;
      j++;
      snap(t.eq(sa[i - 1]), { line: 6, phase: 2, i, j, eqs: [...eqs] });
    } else if (sa[i] < sb[j]) {
      i++;
      snap(t.lt(sa[i - 1], sb[j]), { line: 7, phase: 2, i, j, eqs: [...eqs] });
    } else {
      j++;
      snap(t.gt(sa[i], sb[j - 1]), { line: 8, phase: 2, i, j, eqs: [...eqs] });
    }
  }
  snap(t.done(count1, count, steps1, steps), { line: -1, phase: 2, i, j, eqs: [...eqs] });
  for (const l of out.at(-1).lanes) l.done = true;
  return out;
}

export default {
  lanes: [
    { title: { 'zh-hant': TEXT['zh-hant'].laneA, en: TEXT.en.laneA }, code: CODE },
    { title: { 'zh-hant': TEXT['zh-hant'].laneB, en: TEXT.en.laneB } },
    { title: { 'zh-hant': TEXT['zh-hant'].laneSA, en: TEXT.en.laneSA } },
    { title: { 'zh-hant': TEXT['zh-hant'].laneSB, en: TEXT.en.laneSB } },
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
    'zh-hant': { sorted: '已放進 set 的 A', found: '共同元素' },
    en: { sorted: 'A inserted into the set', found: 'common element' },
  },
};
