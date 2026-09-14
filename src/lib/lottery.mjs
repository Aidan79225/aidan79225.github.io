// 車位抽籤 —— 純抽籤邏輯（無 DOM、無時間、無 Math.random），方便 node --test 驗證。
//
// 核心要求是「可重現」：公布 seed 後，任何住戶把同一份名單填回去重跑，
// 必須得到完全相同的結果，抽籤才站得住腳（見 /blog/lottery/）。
// 因此亂數一律來自 seed：mulberry32(xmur3(`${seed}:${label}`))。
//
// 六條具名亂數流（各自獨立，不用 seed + offset 衍生，避免相鄰 seed 相關）：
//   households / priorityHouseholds / parkings / priorityParkings
//   winners / remainingParkings

/** 字串雜湊：把 "seed:label" 攪成一個 32-bit 種子。 */
export function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^= h >>> 16) >>> 0;
}

/** Mulberry32：統計品質良好的有種子 PRNG，回傳 [0,1) 浮點。 */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 用 seed + 標籤產生一條獨立的亂數流。 */
export function makeRng(seed, label) {
  return mulberry32(xmur3(`${seed}:${label}`));
}

/** Fisher–Yates：每個排列出現機率一致；亂數由外部傳入，維持可重現。 */
export function shuffleArray(array, rng) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 一行一筆的輸入 → 去空白、去空行、去重複。 */
export function uniqueLines(text) {
  return [...new Set(String(text ?? '').split(/\n+/).map((s) => s.trim()).filter(Boolean))];
}

const collator = new Intl.Collator('zh-Hant', { numeric: true, sensitivity: 'base' });
/** 顯示與匯出共用的排序：中文字典序，數字依數值大小（B2-9 在 B2-10 之前）。 */
export const compareNames = (a, b) => collator.compare(a, b);

/**
 * 執行一次抽籤。
 *
 * @param {object} input
 * @param {number} input.seed                  毫秒時間戳，決定整場結果
 * @param {string[]} input.households           一般戶
 * @param {string[]} input.priorityHouseholds   優先戶（同時出現在一般戶者，只算優先）
 * @param {string[]} input.parkings             一般車位
 * @param {string[]} input.priorityParkings     優先車位（同上）
 * @returns {{
 *   seed: number,
 *   result: Record<string, string>,   // 車位 → 中籤戶
 *   households: string[],             // 參與抽籤的全體住戶（優先戶在前）
 *   parkings: string[],               // 全部車位（優先車位在前）
 *   priorityParkings: string[],
 *   priorityHouseholds: string[],
 *   waitlist: string[],               // 候補順位（未中籤戶，依抽籤順序；第一位先遞補）
 *   losers: string[],                 // 未中籤戶（依門牌排序，供核對名單）
 *   leftovers: string[],              // 無人承租的車位
 * }}
 */
export function drawLots({ seed, households = [], priorityHouseholds = [], parkings = [], priorityParkings = [] }) {
  // 重複報名與「優先＋一般都填了」的情形，一律以優先為準，避免一戶佔兩個名額。
  let generalHouseholds = [...new Set(households)].filter((h) => !priorityHouseholds.includes(h));
  let priorityHouseholdList = [...new Set(priorityHouseholds)];
  let generalParkings = [...new Set(parkings)].filter((p) => !priorityParkings.includes(p));
  let priorityParkingList = [...new Set(priorityParkings)];

  generalHouseholds = shuffleArray(generalHouseholds, makeRng(seed, 'households'));
  priorityHouseholdList = shuffleArray(priorityHouseholdList, makeRng(seed, 'priorityHouseholds'));
  generalParkings = shuffleArray(generalParkings, makeRng(seed, 'parkings'));
  priorityParkingList = shuffleArray(priorityParkingList, makeRng(seed, 'priorityParkings'));

  const totalHouseholds = [...priorityHouseholdList, ...generalHouseholds];
  const totalParkings = [...priorityParkingList, ...generalParkings];

  // 先決定「誰中籤」：把全體住戶洗成一個完整排列，有幾個車位就取前幾名。
  // 後段不是廢料 —— 那就是候補順位：同一次 Fisher–Yates 洗出來的均勻排列，
  // 每一戶排到任一候補名次的機率相同，且同樣由 seed 決定，住戶可自行重跑驗證。
  const drawOrder = shuffleArray([...totalHouseholds], makeRng(seed, 'winners'));
  const winners = drawOrder.slice(0, totalParkings.length);
  const waitlist = drawOrder.slice(totalParkings.length);

  // 中籤者中屬於優先戶的，先填優先車位。
  const result = {};
  const remainingPriorityHouseholds = winners.filter((w) => priorityHouseholdList.includes(w));
  priorityParkingList.forEach((p) => {
    if (remainingPriorityHouseholds.length > 0) result[p] = remainingPriorityHouseholds.shift();
  });

  // 其餘中籤者填入剩下的車位（含沒被優先戶用完的優先車位）。
  const assigned = new Set(Object.values(result));
  const remainingWinners = winners.filter((w) => !assigned.has(w));
  const remainingParkings = shuffleArray(
    totalParkings.filter((p) => !Object.prototype.hasOwnProperty.call(result, p)),
    makeRng(seed, 'remainingParkings'),
  );
  remainingParkings.forEach((p) => {
    if (remainingWinners.length > 0) result[p] = remainingWinners.shift();
  });

  const finalAssigned = new Set(Object.values(result));
  return {
    seed,
    result,
    households: totalHouseholds,
    parkings: totalParkings,
    priorityParkings: priorityParkingList,
    priorityHouseholds: priorityHouseholdList,
    waitlist,
    losers: totalHouseholds.filter((h) => !finalAssigned.has(h)).sort(compareNames),
    leftovers: totalParkings.filter((p) => !Object.prototype.hasOwnProperty.call(result, p)).sort(compareNames),
  };
}

/** 分配結果攤平成一列一位（依車位排序），供畫面與 Excel／複製共用。 */
export function toRows(draw) {
  const priority = new Set(draw.priorityParkings);
  return draw.parkings
    .slice()
    .sort(compareNames)
    .map((parking) => ({
      parking,
      household: draw.result[parking] ?? '',
      priority: priority.has(parking),
    }));
}
