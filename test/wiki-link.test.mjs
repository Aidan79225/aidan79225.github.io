import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitWikiLinks, extractTargets, slugifyHeading, parseTarget, extractLinks } from '../src/lib/wiki-link.mjs';

const titleMap = { 'btl-3': '領導力 - 成長模型', 'btl-5': '領導力 - 創新的三大障礙' };
const headingsMap = { 'btl-5': ['障礙一看不到自己', '反思'], 'btl-6': ['用日記看見自己'] };
const ctx = (extra = {}) => ({ titleMap, headingsMap, currentSlug: 'btl-6', onWarn: () => {}, ...extra });

test('plain text with no wikilink returns a single text node', () => {
  assert.deepEqual(splitWikiLinks('hello world', ctx()), [{ type: 'text', value: 'hello world' }]);
});

test('[[slug]] becomes a link using the target title', () => {
  assert.deepEqual(splitWikiLinks('[[btl-3]]', ctx()), [
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '領導力 - 成長模型' }] },
  ]);
});

test('[[slug|label]] uses the custom label as link text', () => {
  assert.deepEqual(splitWikiLinks('[[btl-3|成長那篇]]', ctx()), [
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '成長那篇' }] },
  ]);
});

test('surrounding text is preserved around the link', () => {
  assert.deepEqual(splitWikiLinks('看 [[btl-3]] 這篇', ctx()), [
    { type: 'text', value: '看 ' },
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '領導力 - 成長模型' }] },
    { type: 'text', value: ' 這篇' },
  ]);
});

test('unknown slug is left as raw text and reported via onWarn', () => {
  const warnings = [];
  const nodes = splitWikiLinks('[[nope]]', ctx({ onWarn: (m) => warnings.push(m) }));
  assert.deepEqual(nodes, [{ type: 'text', value: '[[nope]]' }]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /nope/);
});

test('splitWikiLinks handles multiple links in one string', () => {
  assert.deepEqual(splitWikiLinks('[[btl-3]] 和 [[btl-3|別名]]', ctx()), [
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '領導力 - 成長模型' }] },
    { type: 'text', value: ' 和 ' },
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '別名' }] },
  ]);
});

test('splitWikiLinks returns an empty array for an empty string', () => {
  assert.deepEqual(splitWikiLinks('', ctx()), []);
});

test('[[slug#section]] links to the section anchor, text is the section', () => {
  assert.deepEqual(splitWikiLinks('[[btl-5#障礙一：看不到自己]]', ctx()), [
    { type: 'link', url: '/blog/btl-5/#障礙一看不到自己', children: [{ type: 'text', value: '障礙一：看不到自己' }] },
  ]);
});

test('[[slug#section|label]] uses the label', () => {
  assert.deepEqual(splitWikiLinks('[[btl-5#障礙一：看不到自己|看這段]]', ctx()), [
    { type: 'link', url: '/blog/btl-5/#障礙一看不到自己', children: [{ type: 'text', value: '看這段' }] },
  ]);
});

test('[[#section]] is a same-page link (no /blog/ prefix)', () => {
  assert.deepEqual(splitWikiLinks('[[#反思]]', ctx({ currentSlug: 'btl-5' })), [
    { type: 'link', url: '#反思', children: [{ type: 'text', value: '反思' }] },
  ]);
});

test('unknown section still links but warns', () => {
  const warnings = [];
  const nodes = splitWikiLinks('[[btl-5#不存在的段]]', ctx({ onWarn: (m) => warnings.push(m) }));
  assert.equal(nodes[0].type, 'link');
  assert.equal(nodes[0].url, '/blog/btl-5/#不存在的段');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /不存在的段/);
});

test('extractTargets strips #section and ignores same-page links', () => {
  assert.deepEqual(extractTargets('see [[btl-5#障礙一]] and [[#反思]] and [[btl-6|z]]'), ['btl-5', 'btl-6']);
});

test('slugifyHeading matches github-slugger output', () => {
  assert.equal(slugifyHeading('障礙二：沒問題綜合症（No-Problem Syndrome）'), '障礙二沒問題綜合症no-problem-syndrome');
  assert.equal(slugifyHeading('IQ'), 'iq');
});

test('parseTarget splits slug and section', () => {
  assert.deepEqual(parseTarget('btl-5#障礙一'), { slug: 'btl-5', section: '障礙一' });
  assert.deepEqual(parseTarget('btl-5'), { slug: 'btl-5', section: undefined });
  assert.deepEqual(parseTarget('#反思'), { slug: '', section: '反思' });
});

test('extractTargets returns an empty array for an empty body', () => {
  assert.deepEqual(extractTargets(''), []);
});

test('[[slug#]] with an empty section degrades to a whole-post link', () => {
  assert.deepEqual(splitWikiLinks('[[btl-3#]]', ctx()), [
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '領導力 - 成長模型' }] },
  ]);
});

test('extractLinks returns slug + anchor, ignoring same-page links', () => {
  assert.deepEqual(
    extractLinks('[[btl-5]] [[btl-5#障礙一：看不到自己]] [[#反思]] [[btl-6|z]]'),
    [
      { slug: 'btl-5', anchor: null },
      { slug: 'btl-5', anchor: '障礙一看不到自己' },
      { slug: 'btl-6', anchor: null },
    ]
  );
});

test('extractLinks returns an empty array for an empty body', () => {
  assert.deepEqual(extractLinks(''), []);
});
