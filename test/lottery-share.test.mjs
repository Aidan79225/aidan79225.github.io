import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeShare, decodeShare, rowsToList, compareAllocation } from '../src/lib/lottery-share.mjs';
import { drawLots, toRows } from '../src/lib/lottery.mjs';

const input = {
  seed: 1789360267486,
  households: ['53-12F', '57-08F', '61-09F'],
  priorityHouseholds: ['53-1F'],
  parkings: ['1', '2', 'B1-50'],
  priorityParkings: ['B1-01'],
};

test('驗證連結來回編碼後，名單與順序一字不差', () => {
  assert.deepEqual(decodeShare(encodeShare(input)), input);
});

test('中文戶名也能正確還原', () => {
  const zh = { ...input, households: ['一號樓-3F', '二號樓-12F'] };
  assert.deepEqual(decodeShare(encodeShare(zh)).households, zh.households);
});

test('連結還原後重跑，結果與原本相同', () => {
  const a = drawLots(input);
  const b = drawLots(decodeShare(encodeShare(input)));
  assert.deepEqual(b.result, a.result);
  assert.deepEqual(b.waitlist, a.waitlist);
});

test('壞掉的連結要丟錯，不能跑出一份假結果', () => {
  assert.throws(() => decodeShare('這不是連結'), /格式不正確/);
  assert.throws(() => decodeShare(encodeShare({ ...input, seed: NaN })), /seed/);
  const wrongVersion = Buffer.from(JSON.stringify({ v: 99, s: 1 })).toString('base64url');
  assert.throws(() => decodeShare(wrongVersion), /版本/);
});

test('空名單也能編碼還原', () => {
  const empty = { seed: 1, households: [], priorityHouseholds: [], parkings: [], priorityParkings: [] };
  assert.deepEqual(decodeShare(encodeShare(empty)), empty);
});

test('rowsToList 依登記序號還原順序(被 Excel 排序過也救得回來)', () => {
  const rows = [
    { 登記序號: 3, 一般戶名: '53-4F' },
    { 登記序號: 1, 一般戶名: '53-2F' },
    { 登記序號: 2, 一般戶名: '53-3F' },
  ];
  assert.deepEqual(rowsToList(rows, '一般戶名'), ['53-2F', '53-3F', '53-4F']);
});

test('rowsToList 在沒有登記序號時照列的先後(相容舊版匯出檔)', () => {
  const rows = [{ 一般戶名: '53-4F' }, { 一般戶名: '53-2F' }];
  assert.deepEqual(rowsToList(rows, '一般戶名'), ['53-4F', '53-2F']);
});

test('rowsToList 去掉空白與空列，並保留字串型別', () => {
  const rows = [{ 一般車位: ' 1 ' }, { 一般車位: '' }, { 一般車位: 2 }, {}];
  assert.deepEqual(rowsToList(rows, '一般車位'), ['1', '2']);
  assert.deepEqual(rowsToList(undefined, '一般車位'), []);
});

test('compareAllocation：逐筆相同才算通過', () => {
  const d = drawLots(input);
  const rows = toRows(d).filter((r) => r.household).map((r) => ({ 戶名: r.household, 車位: r.parking }));
  const v = compareAllocation(toRows(d), rows);
  assert.equal(v.ok, true);
  assert.equal(v.checked, rows.length);
});

test('compareAllocation：車位被改過會被抓出來', () => {
  const d = drawLots(input);
  const rows = toRows(d).filter((r) => r.household).map((r) => ({ 戶名: r.household, 車位: r.parking }));
  rows[0].車位 = '天上一號';
  const v = compareAllocation(toRows(d), rows);
  assert.equal(v.ok, false);
  assert.equal(v.mismatched.length, 1);
  assert.equal(v.mismatched[0].expected, '天上一號');
});

test('compareAllocation：多一戶少一戶都要抓出來', () => {
  const d = drawLots(input);
  const rows = toRows(d).filter((r) => r.household).map((r) => ({ 戶名: r.household, 車位: r.parking }));
  const v1 = compareAllocation(toRows(d), [...rows, { 戶名: '99-9F', 車位: 'X' }]);
  assert.deepEqual(v1.missing, ['99-9F']);
  const v2 = compareAllocation(toRows(d), rows.slice(1));
  assert.deepEqual(v2.extra, [rows[0].戶名]);
});

test('compareAllocation：沒有分配結果可比時不算通過', () => {
  assert.equal(compareAllocation([{ household: 'A', parking: '1' }], []).ok, false);
});
