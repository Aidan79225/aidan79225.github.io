import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldPrecache, cachedOnDemand, toUrl } from '../src/lib/sw-manifest.mjs';

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

test('小說插圖不預快取(看過的由執行期快取留住),其他圖照舊', () => {
  assert.equal(shouldPrecache('images/white-dew/white-dew-01-2.webp'), false);
  assert.equal(shouldPrecache('images\\white-dew\\white-dew-17-5.webp'), false);
  assert.equal(shouldPrecache('assets/images/avatar.webp'), true);
  assert.equal(shouldPrecache('blog/white-dew-01/index.html'), true);
});

test('每一章的第一張插圖是列表卡片的封面,要預快取 —— 不然離線的首頁第一格是破圖', () => {
  assert.equal(shouldPrecache('images/white-dew/white-dew-01-1.webp'), true);
  assert.equal(shouldPrecache('images\\white-dew\\white-dew-17-1.webp'), true);
  assert.equal(shouldPrecache('images/white-dew/white-dew-01-11.webp'), false); // 第十一張不是封面
});

test('不預快取的插圖仍要算進 worker 的版本 —— 同檔名換圖時讀者才拿得到新的', () => {
  assert.equal(cachedOnDemand('images/white-dew/white-dew-01-3.webp'), true);
  assert.equal(cachedOnDemand('images\\white-dew\\white-dew-02-4.webp'), true);
  // 封面已經在預快取裡(本來就算進版本);其他檔案不歸這條規則管。
  assert.equal(cachedOnDemand('images/white-dew/white-dew-01-1.webp'), false);
  assert.equal(cachedOnDemand('assets/images/avatar.webp'), false);
  assert.equal(cachedOnDemand('og/white-dew-01.png'), false);
  assert.equal(cachedOnDemand('blog/white-dew-01/index.html'), false);
});

test('每個檔案不是預快取、就是另外算進版本、或兩者都不是,不會兩邊都算', () => {
  for (const p of ['index.html', 'images/white-dew/white-dew-01-1.webp', 'images/white-dew/white-dew-01-2.webp', 'og/x.png', 'en/index.html']) {
    assert.equal(shouldPrecache(p) && cachedOnDemand(p), false, p);
  }
});

test('文章頁一律預快取 —— 離線可讀是這個 worker 的重點', () => {
  assert.equal(shouldPrecache('blog/lottery/index.html'), true);
  assert.equal(shouldPrecache('blog/btl-1/index.html'), true);
});
