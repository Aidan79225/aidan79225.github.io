import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawLots, uniqueLines, compareNames, toRows, makeRng, shuffleArray } from '../src/lib/lottery.mjs';

const SEED = 1789056000000;
const base = {
  seed: SEED,
  priorityHouseholds: ['53-1F', '55-1F'],
  priorityParkings: ['B1-01', 'B1-02', 'B1-03'],
  households: ['53-2F', '53-3F', '53-4F', '55-2F', '55-3F', '55-4F'],
  parkings: ['B1-07', 'B2-01', 'B2-02'],
};

test('同一個 seed 重跑得到完全相同的結果（可稽核的關鍵）', () => {
  assert.deepEqual(drawLots(base).result, drawLots(base).result);
});

test('換一個 seed 會得到不同的分配', () => {
  const a = drawLots(base).result;
  const b = drawLots({ ...base, seed: SEED + 1 }).result;
  assert.notDeepEqual(a, b);
});

test('中籤戶數等於車位數，且沒有人拿到兩個車位', () => {
  const d = drawLots(base);
  const winners = Object.values(d.result);
  assert.equal(winners.length, d.parkings.length);
  assert.equal(new Set(winners).size, winners.length);
  assert.equal(d.losers.length, d.households.length - winners.length);
  assert.equal(d.leftovers.length, 0);
});

test('每個中籤戶都來自名單，未中籤戶不會出現在分配裡', () => {
  const d = drawLots(base);
  const roster = new Set(d.households);
  for (const who of Object.values(d.result)) assert.ok(roster.has(who));
  for (const loser of d.losers) assert.ok(!Object.values(d.result).includes(loser));
});

test('優先車位優先給中籤的優先戶', () => {
  const d = drawLots(base);
  const priorityWinners = Object.values(d.result).filter((w) => d.priorityHouseholds.includes(w));
  // 中籤的優先戶有幾戶，前幾個優先車位就該是他們的
  const taken = d.priorityParkings.filter((p) => d.priorityHouseholds.includes(d.result[p]));
  assert.equal(taken.length, priorityWinners.length);
});

test('優先車位比優先戶多時，多的優先車位回到一般池，不會從缺', () => {
  const d = drawLots(base); // 3 個優先車位、2 戶優先戶
  const leftToGeneral = d.priorityParkings.filter((p) => !d.priorityHouseholds.includes(d.result[p]));
  assert.ok(leftToGeneral.length >= 1);
  for (const p of leftToGeneral) assert.ok(d.result[p], '優先車位沒被優先戶用完時應分給一般戶');
});

test('車位少於戶數時，其餘住戶列為未中籤', () => {
  const d = drawLots({ ...base, parkings: [], priorityParkings: ['B1-01'] });
  assert.equal(Object.keys(d.result).length, 1);
  assert.equal(d.losers.length, 7);
});

test('車位多於戶數時，多出來的車位列為無人承租', () => {
  const d = drawLots({
    seed: SEED,
    households: ['A'],
    priorityHouseholds: [],
    parkings: ['P1', 'P2', 'P3'],
    priorityParkings: [],
  });
  assert.equal(Object.keys(d.result).length, 1);
  assert.deepEqual(d.leftovers.length, 2);
});

test('同時列在優先與一般名單的戶，只佔一個名額', () => {
  const d = drawLots({ ...base, households: [...base.households, '53-1F'] });
  assert.equal(d.households.filter((h) => h === '53-1F').length, 1);
});

test('重複的行會被去掉', () => {
  const d = drawLots({ ...base, households: ['53-2F', '53-2F', '53-3F'], priorityHouseholds: [] });
  assert.deepEqual(d.households.slice().sort(compareNames), ['53-2F', '53-3F']);
});

test('空名單不會爆掉', () => {
  const d = drawLots({ seed: SEED, households: [], priorityHouseholds: [], parkings: [], priorityParkings: [] });
  assert.deepEqual(d.result, {});
  assert.deepEqual(d.losers, []);
  assert.deepEqual(d.leftovers, []);
});

test('uniqueLines 去空白、去空行、去重複', () => {
  assert.deepEqual(uniqueLines('  A \n\n B\nA\n'), ['A', 'B']);
  assert.deepEqual(uniqueLines(''), []);
  assert.deepEqual(uniqueLines(undefined), []);
});

test('排序把數字當數字比（B2-9 在 B2-10 前面）', () => {
  assert.deepEqual(['B2-10', 'B2-9', 'B1-2'].sort(compareNames), ['B1-2', 'B2-9', 'B2-10']);
});

test('toRows 依車位排序攤平，並標出優先車位', () => {
  const rows = toRows(drawLots(base));
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.map((r) => r.parking), ['B1-01', 'B1-02', 'B1-03', 'B1-07', 'B2-01', 'B2-02']);
  assert.deepEqual(rows.map((r) => r.priority), [true, true, true, false, false, false]);
});

test('不同標籤是各自獨立的亂數流', () => {
  const a = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8], makeRng(SEED, 'winners'));
  const b = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8], makeRng(SEED, 'parkings'));
  assert.notDeepEqual(a, b);
});

test('相鄰 seed 不會產生相關的洗牌結果', () => {
  const a = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8], makeRng(SEED, 'winners'));
  const b = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8], makeRng(SEED + 1, 'winners'));
  assert.notDeepEqual(a, b);
});

test('候補順位涵蓋所有未中籤戶,且不含中籤戶', () => {
  const d = drawLots(base);
  assert.deepEqual(d.waitlist.slice().sort(compareNames), d.losers);
  for (const h of d.waitlist) assert.ok(!Object.values(d.result).includes(h));
});

test('候補順位是同一次抽籤洗牌的後段', () => {
  const d = drawLots(base);
  const order = shuffleArray([...d.households], makeRng(d.seed, 'winners'));
  assert.deepEqual(d.waitlist, order.slice(d.parkings.length));
});

test('候補順位不是照門牌排的(不然小門牌永遠排第一)', () => {
  // 單一 seed 可能碰巧洗出門牌順序，看多個 seed：只要有一個不同就證明沒被排序掉
  const differs = Array.from({ length: 20 }, (_, i) => drawLots({ ...base, parkings: [], seed: SEED + i }))
    .some((d) => d.waitlist.join() !== d.waitlist.slice().sort(compareNames).join());
  assert.ok(differs, '每個 seed 的候補順位都剛好等於門牌排序，八成是被 sort 掉了');
});

test('同一個 seed 的候補順位可重現', () => {
  assert.deepEqual(drawLots(base).waitlist, drawLots(base).waitlist);
  assert.notDeepEqual(drawLots(base).waitlist, drawLots({ ...base, seed: base.seed + 1 }).waitlist);
});

test('車位夠給所有人時沒有候補', () => {
  const d = drawLots({ seed: SEED, households: ['A'], priorityHouseholds: [], parkings: ['P1', 'P2'], priorityParkings: [] });
  assert.deepEqual(d.waitlist, []);
});

test('候補順位每一戶只出現一次', () => {
  const d = drawLots({ ...base, parkings: [] });
  assert.equal(new Set(d.waitlist).size, d.waitlist.length);
  assert.equal(d.waitlist.length + Object.keys(d.result).length, d.households.length);
});
