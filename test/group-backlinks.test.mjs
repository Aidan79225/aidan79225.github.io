import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupBySection } from '../src/lib/group-backlinks.mjs';

const post = (id, title) => ({ id, data: { title } });
const headings = [
  { slug: '障礙一看不到自己', text: '障礙一：看不到自己' },
  { slug: '反思', text: '反思' },
];

test('groups by section in heading order, 整篇文章 last', () => {
  const backlinks = [
    { post: post('btl-6', '用日記看見自己'), anchor: '障礙一看不到自己' },
    { post: post('other', '某篇'), anchor: null },
    { post: post('btl-7', '反思那篇'), anchor: '反思' },
  ];
  assert.deepEqual(groupBySection(backlinks, headings), [
    { label: '障礙一：看不到自己', sources: [post('btl-6', '用日記看見自己')] },
    { label: '反思', sources: [post('btl-7', '反思那篇')] },
    { label: '整篇文章', sources: [post('other', '某篇')] },
  ]);
});

test('stale anchor (no matching heading) folds into 整篇文章', () => {
  const backlinks = [{ post: post('x', 'X'), anchor: '已刪除的段' }];
  assert.deepEqual(groupBySection(backlinks, headings), [
    { label: '整篇文章', sources: [post('x', 'X')] },
  ]);
});

test('returns an empty array when there are no backlinks', () => {
  assert.deepEqual(groupBySection([], headings), []);
});

test('handles missing headings (everything folds into 整篇文章)', () => {
  const backlinks = [{ post: post('a', 'A'), anchor: '反思' }];
  assert.deepEqual(groupBySection(backlinks, undefined), [
    { label: '整篇文章', sources: [post('a', 'A')] },
  ]);
});

test('multiple distinct posts under the same section are all listed', () => {
  const backlinks = [
    { post: post('a', 'A'), anchor: '反思' },
    { post: post('b', 'B'), anchor: '反思' },
  ];
  assert.deepEqual(groupBySection(backlinks, headings), [
    { label: '反思', sources: [post('a', 'A'), post('b', 'B')] },
  ]);
});

test('a post linking both whole-post and a stale section appears once in 整篇文章', () => {
  const backlinks = [
    { post: post('a', 'A'), anchor: null },
    { post: post('a', 'A'), anchor: '已刪除的段' },
  ];
  assert.deepEqual(groupBySection(backlinks, headings), [
    { label: '整篇文章', sources: [post('a', 'A')] },
  ]);
});

test('a post linking both a section and the whole post appears only under the section', () => {
  const backlinks = [
    { post: post('a', 'A'), anchor: '反思' },
    { post: post('a', 'A'), anchor: null },
  ];
  assert.deepEqual(groupBySection(backlinks, headings), [
    { label: '反思', sources: [post('a', 'A')] },
  ]);
});
