import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shareOf,
  computeBalances,
  settle,
  totalSpent,
  mergeTrips,
  round2,
} from '../src/lib/travel-split.mjs';

const sum = (obj) => round2(Object.values(obj).reduce((s, x) => s + x, 0));

test('even split divides equally and sums back to the total', () => {
  const s = shareOf({ amount: 100, splitMode: 'even', sharedBy: ['a', 'b', 'c', 'd'] });
  assert.deepEqual(s, { a: 25, b: 25, c: 25, d: 25 });
  assert.equal(sum(s), 100);
});

test('even split spreads the leftover cents deterministically', () => {
  const s = shareOf({ amount: 100, splitMode: 'even', sharedBy: ['a', 'b', 'c'] });
  // 100 / 3 = 33.33...；餘 1 分給排序最前的 a
  assert.equal(sum(s), 100);
  assert.equal(s.a, 33.34);
  assert.equal(s.b, 33.33);
  assert.equal(s.c, 33.33);
});

test('weight split is proportional and sums back to the total', () => {
  const s = shareOf({ amount: 120, splitMode: 'weight', weights: { a: 1, b: 2, c: 3 } });
  assert.equal(sum(s), 120);
  assert.equal(s.a, 20);
  assert.equal(s.b, 40);
  assert.equal(s.c, 60);
});

test('exact split uses the given amounts', () => {
  const s = shareOf({ amount: 90, splitMode: 'exact', exact: { a: 50, b: 40 } });
  assert.deepEqual(s, { a: 50, b: 40 });
});

test('deleted expense contributes nothing', () => {
  assert.deepEqual(shareOf({ amount: 100, deleted: true, splitMode: 'even', sharedBy: ['a'] }), {});
});

test('balances: payer is credited, sharers are debited, and the ledger nets to zero', () => {
  const members = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const expenses = [
    { id: 'e1', amount: 90, payerId: 'a', splitMode: 'even', sharedBy: ['a', 'b', 'c'] },
    { id: 'e2', amount: 30, payerId: 'b', splitMode: 'even', sharedBy: ['b', 'c'] },
  ];
  const net = computeBalances(members, expenses);
  // a 付 90 分攤 30 → +60；b 付 30 分攤 30+15 → -15；c 分攤 30+15 → -45
  assert.equal(net.a, 60);
  assert.equal(net.b, -15);
  assert.equal(net.c, -45);
  assert.equal(sum(net), 0);
});

test('balances ignore deleted members and expenses', () => {
  const members = [{ id: 'a' }, { id: 'b' }, { id: 'z', deleted: true }];
  const expenses = [
    { id: 'e1', amount: 100, payerId: 'a', splitMode: 'even', sharedBy: ['a', 'b'] },
    { id: 'e2', amount: 500, payerId: 'a', deleted: true, splitMode: 'even', sharedBy: ['a', 'b'] },
  ];
  const net = computeBalances(members, expenses);
  assert.deepEqual(net, { a: 50, b: -50 });
});

test('settle produces transfers that clear every balance', () => {
  const net = { a: 60, b: -15, c: -45 };
  const transfers = settle(net);
  const applied = { ...net };
  transfers.forEach((t) => {
    assert.ok(t.amount > 0);
    applied[t.from] = round2(applied[t.from] + t.amount);
    applied[t.to] = round2(applied[t.to] - t.amount);
  });
  Object.values(applied).forEach((v) => assert.equal(v, 0));
});

test('settle minimises transfer count for a simple two-party debt', () => {
  const transfers = settle({ a: -30, b: 30 });
  assert.equal(transfers.length, 1);
  assert.deepEqual(transfers[0], { from: 'a', to: 'b', amount: 30 });
});

test('totalSpent skips deleted expenses', () => {
  assert.equal(
    totalSpent([{ amount: 100 }, { amount: 50, deleted: true }, { amount: 25 }]),
    125,
  );
});

test('mergeTrips unions members/expenses by id, newest updatedAt wins', () => {
  const a = {
    code: 'T', name: 'A 版', currency: 'TWD', metaUpdatedAt: 1,
    members: [{ id: 'm1', name: '小明', updatedAt: 1 }],
    expenses: [{ id: 'e1', desc: '午餐', amount: 100, updatedAt: 5 }],
  };
  const b = {
    code: 'T', name: 'B 版', currency: 'JPY', metaUpdatedAt: 2,
    members: [
      { id: 'm1', name: '小明(改名)', updatedAt: 3 },
      { id: 'm2', name: '小華', updatedAt: 2 },
    ],
    expenses: [
      { id: 'e1', desc: '午餐(改)', amount: 120, updatedAt: 4 }, // 舊,不覆蓋
      { id: 'e2', desc: '晚餐', amount: 200, updatedAt: 2 },
    ],
  };
  const m = mergeTrips(a, b);
  assert.equal(m.name, 'B 版'); // metaUpdatedAt 2 > 1
  assert.equal(m.currency, 'JPY');
  assert.equal(m.members.length, 2);
  assert.equal(m.members.find((x) => x.id === 'm1').name, '小明(改名)'); // updatedAt 3 > 1
  assert.equal(m.expenses.find((x) => x.id === 'e1').amount, 100); // updatedAt 5 > 4
  assert.equal(m.expenses.length, 2);
});

test('mergeTrips honours deletion tombstones and is commutative', () => {
  const a = {
    code: 'T', metaUpdatedAt: 1, members: [], name: '', currency: '',
    expenses: [{ id: 'e1', amount: 100, updatedAt: 1 }],
  };
  const b = {
    code: 'T', metaUpdatedAt: 1, members: [], name: '', currency: '',
    expenses: [{ id: 'e1', amount: 100, deleted: true, updatedAt: 2 }],
  };
  const ab = mergeTrips(a, b);
  const ba = mergeTrips(b, a);
  assert.equal(ab.expenses[0].deleted, true);
  assert.equal(ba.expenses[0].deleted, true);
  assert.equal(computeBalances([{ id: 'x' }], ab.expenses).x, 0);
});
