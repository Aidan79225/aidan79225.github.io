import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitWikiLinks, extractTargets } from '../src/lib/wiki-link.mjs';

const MAP = { 'btl-3': '領導力 - 成長模型' };

test('plain text with no wikilink returns a single text node', () => {
  assert.deepEqual(splitWikiLinks('hello world', MAP), [
    { type: 'text', value: 'hello world' },
  ]);
});

test('[[slug]] becomes a link using the target title', () => {
  assert.deepEqual(splitWikiLinks('[[btl-3]]', MAP), [
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '領導力 - 成長模型' }] },
  ]);
});

test('[[slug|label]] uses the custom label as link text', () => {
  assert.deepEqual(splitWikiLinks('[[btl-3|成長那篇]]', MAP), [
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '成長那篇' }] },
  ]);
});

test('surrounding text is preserved around the link', () => {
  assert.deepEqual(splitWikiLinks('看 [[btl-3]] 這篇', MAP), [
    { type: 'text', value: '看 ' },
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '領導力 - 成長模型' }] },
    { type: 'text', value: ' 這篇' },
  ]);
});

test('unknown slug is left as raw text and reported via onMissing', () => {
  const missing = [];
  const nodes = splitWikiLinks('[[nope]]', MAP, (s) => missing.push(s));
  assert.deepEqual(nodes, [{ type: 'text', value: '[[nope]]' }]);
  assert.deepEqual(missing, ['nope']);
});

test('extractTargets returns slugs, ignoring labels', () => {
  assert.deepEqual(extractTargets('a [[x]] b [[y|z]] c'), ['x', 'y']);
});

test('extractTargets returns an empty array when there are no links', () => {
  assert.deepEqual(extractTargets('no links here'), []);
});

test('splitWikiLinks handles multiple links in one string', () => {
  assert.deepEqual(splitWikiLinks('[[btl-3]] 和 [[btl-3|別名]]', MAP), [
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '領導力 - 成長模型' }] },
    { type: 'text', value: ' 和 ' },
    { type: 'link', url: '/blog/btl-3/', children: [{ type: 'text', value: '別名' }] },
  ]);
});

test('splitWikiLinks returns an empty array for an empty string', () => {
  assert.deepEqual(splitWikiLinks('', MAP), []);
});
