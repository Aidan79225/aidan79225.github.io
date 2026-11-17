import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortBySeriesOrder } from '../src/lib/series-order.mjs';

const post = (id, date, series, seriesOrder) => ({
  id,
  data: { date: new Date(date), series, seriesOrder },
});
const ids = (posts) => sortBySeriesOrder(posts).map((p) => p.id);

test('同系列照 seriesOrder 由小到大,不管發布日期', () => {
  const posts = [
    post('ch3', '2026-03-01', '霧港白露', 3),
    post('ch1', '2026-01-01', '霧港白露', 1),
    post('ch2', '2026-02-01', '霧港白露', 2),
  ];
  assert.deepEqual(ids(posts), ['ch1', 'ch2', 'ch3']);
});

test('同系列同日期連發,日期不會蓋過 seriesOrder', () => {
  const posts = [
    post('ch2', '2026-01-01', '霧港白露', 2),
    post('ch1', '2026-01-01', '霧港白露', 1),
  ];
  assert.deepEqual(ids(posts), ['ch1', 'ch2']);
});

test('沒有系列的單篇照日期由新到舊', () => {
  const posts = [post('old', '2025-01-01'), post('new', '2026-01-01'), post('mid', '2025-06-01')];
  assert.deepEqual(ids(posts), ['new', 'mid', 'old']);
});

test('系列整組以最新一篇排在時間軸上,組內仍照 seriesOrder', () => {
  const posts = [
    post('a1', '2026-01-01', 'A', 1),
    post('solo', '2026-02-01'),
    post('a2', '2026-03-01', 'A', 2),
    post('b1', '2025-12-01', 'B', 1),
  ];
  // A 最新一篇是 2026-03 → 最前;solo 2026-02;B 最新 2025-12 → 最後。
  assert.deepEqual(ids(posts), ['a1', 'a2', 'solo', 'b1']);
});

test('缺 seriesOrder 的當 0,排在最前面', () => {
  const posts = [post('ch1', '2026-01-01', 'A', 1), post('prologue', '2026-01-02', 'A')];
  assert.deepEqual(ids(posts), ['prologue', 'ch1']);
});

test('不改原陣列,空陣列與 undefined 不會爆', () => {
  const posts = [post('b', '2026-01-01', 'A', 2), post('a', '2026-01-01', 'A', 1)];
  const copy = [...posts];
  sortBySeriesOrder(posts);
  assert.deepEqual(posts, copy);
  assert.deepEqual(sortBySeriesOrder([]), []);
  assert.deepEqual(sortBySeriesOrder(undefined), []);
});
