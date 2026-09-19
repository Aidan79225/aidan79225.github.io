import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldPrecache, toUrl } from '../src/lib/sw-manifest.mjs';

test('precaches pages, hashed assets and JSON indexes', () => {
  for (const p of [
    'index.html',
    '404.html',
    'blog/ddia-batch/index.html',
    '_astro/index.abc123.css',
    '_astro/katex-font.woff2',
    'search-index.json',
    'graph.json',
    'favicon.svg',
    'icon-192.png',
    'manifest.webmanifest',
    'assets/some-image.png',
  ]) {
    assert.equal(shouldPrecache(p), true, `${p} should be precached`);
  }
});

test('skips OG images, feeds and machine files', () => {
  for (const p of [
    'og/default.png',
    'og/ddia-batch.png',
    'sitemap-index.xml',
    'sitemap-0.xml',
    'rss.xml',
    'robots.txt',
    'CNAME',
    'sw.js',
    'en/index.html',
    'en/tech/index.html',
    'en/blog/pain-before-power/index.html',
  ]) {
    assert.equal(shouldPrecache(p), false, `${p} should be skipped`);
  }
});

test('maps dist paths to served URLs', () => {
  assert.equal(toUrl('index.html'), '/');
  assert.equal(toUrl('blog/ddia-batch/index.html'), '/blog/ddia-batch/');
  assert.equal(toUrl('404.html'), '/404.html');
  assert.equal(toUrl('_astro/index.abc123.css'), '/_astro/index.abc123.css');
  assert.equal(toUrl('graph.json'), '/graph.json');
});

test('windows-style separators are normalised', () => {
  assert.equal(toUrl('blog\\ddia-batch\\index.html'), '/blog/ddia-batch/');
  assert.equal(shouldPrecache('og\\x.png'), false);
});

test('tag 頁不預快取,但 tag 索引(導覽用的那頁)要', () => {
  assert.equal(shouldPrecache('tags/data-engineering/index.html'), false);
  assert.equal(shouldPrecache('tags/index.html'), true);
});

test('列表分頁第 2 頁以後不預快取,第 1 頁要', () => {
  assert.equal(shouldPrecache('tech/2/index.html'), false);
  assert.equal(shouldPrecache('tech/10/index.html'), false);
  assert.equal(shouldPrecache('tech/index.html'), true);
});

test('文章頁一律預快取 —— 離線可讀是這個 worker 的重點', () => {
  assert.equal(shouldPrecache('blog/lottery/index.html'), true);
  assert.equal(shouldPrecache('blog/btl-1/index.html'), true);
});
