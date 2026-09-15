// 黃金檔回歸測試 —— 這個工具對住戶的承諾是「公布 seed 後結果永遠重現得出來」，
// 所以「結果變了」本身就是 bug，即使新規則看起來更合理。
//
// 這裡鎖住三組固定輸入的完整輸出（分配、候補順位、未中籤、無人承租）。
// 任何改動只要動到結果，這個測試就會紅 —— 那時要問的不是「怎麼讓測試過」，
// 而是「舊 seed 的歷史結果還能重現嗎？住戶手上的公告會不會對不上？」
// 真的要換規則，就是新版本：更新黃金檔、在頁面標明版本，並公告舊結果不再重現。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { drawLots } from '../src/lib/lottery.mjs';

const golden = JSON.parse(readFileSync(new URL('./fixtures/lottery-golden.json', import.meta.url), 'utf8'));

test('黃金檔：固定 seed 與名單的結果不能變', () => {
  assert.ok(golden.length >= 3, '黃金檔至少要涵蓋三種情境');
  for (const { name, input, expected } of golden) {
    const d = drawLots(input);
    assert.deepEqual(d.result, expected.result, `${name}：分配結果變了`);
    assert.deepEqual(d.waitlist, expected.waitlist, `${name}：候補順位變了`);
    assert.deepEqual(d.losers, expected.losers, `${name}：未中籤名單變了`);
    assert.deepEqual(d.leftovers, expected.leftovers, `${name}：無人承租車位變了`);
  }
});

test('黃金檔：連 result 的插入順序都要一致（Excel 與畫面依此輸出）', () => {
  for (const { name, input, expected } of golden) {
    assert.deepEqual(Object.keys(drawLots(input).result), Object.keys(expected.result), `${name}：分配順序變了`);
  }
});

test('黃金檔本身沒有自相矛盾（守門的也要被守）', () => {
  for (const { name, input, expected } of golden) {
    const households = [...new Set([...input.priorityHouseholds, ...input.households])];
    const parkings = [...new Set([...input.priorityParkings, ...input.parkings])];
    const winners = Object.values(expected.result);
    assert.equal(new Set(winners).size, winners.length, `${name}：有人拿到兩個車位`);
    assert.equal(winners.length, Math.min(households.length, parkings.length), `${name}：中籤數不對`);
    assert.deepEqual([...winners, ...expected.waitlist].sort(), households.sort(), `${name}：中籤＋候補 ≠ 全體住戶`);
    assert.equal(expected.leftovers.length, parkings.length - winners.length, `${name}：剩餘車位數不對`);
  }
});
