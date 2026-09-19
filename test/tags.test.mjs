import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countTags, tagHasPage, pageTags, MIN_TAG_POSTS } from '../src/lib/tags.mjs';

const posts = (...lists) => lists.map((tags) => ({ data: { tags } }));

test('countTags 數得出每個 tag 的篇數', () => {
  const c = countTags(posts(['sql', 'concept'], ['sql'], ['redis']));
  assert.equal(c.get('sql'), 2);
  assert.equal(c.get('concept'), 1);
  assert.equal(c.get('redis'), 1);
});

test('沒有 tags 欄位的文章不會爆', () => {
  assert.equal(countTags([{ data: {} }, {}, null]).size, 0);
  assert.equal(countTags(undefined).size, 0);
});

test('只有一篇的 tag 不產生頁面', () => {
  const c = countTags(posts(['sql', 'django'], ['sql']));
  assert.equal(tagHasPage(c, 'sql'), true);
  assert.equal(tagHasPage(c, 'django'), false);
  assert.equal(tagHasPage(c, '不存在'), false);
});

test('門檻就是 MIN_TAG_POSTS,不是寫死的 2', () => {
  const c = new Map([['x', MIN_TAG_POSTS], ['y', MIN_TAG_POSTS - 1]]);
  assert.equal(tagHasPage(c, 'x'), true);
  assert.equal(tagHasPage(c, 'y'), false);
});

test('pageTags 依篇數排序,同篇數依字母序,並濾掉未達門檻的', () => {
  const c = countTags(posts(['b', 'a', 'solo'], ['b', 'a'], ['b']));
  assert.deepEqual(pageTags(c), [['b', 3], ['a', 2]]);
});
