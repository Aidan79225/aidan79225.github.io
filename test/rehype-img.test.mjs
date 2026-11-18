// rehype-img 讓 markdown 圖片(目前是《霧港白露》的插圖)延遲載入,並補上檔案的寬高,
// 免得圖載入時下面的字往下跳。寬高怎麼讀在 image-size.test.mjs;這裡只蓋 plugin
// 補了什麼、什麼時候不補。
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import rehypeImg from '../src/lib/rehype-img.mjs';
import { lossy } from './fixtures/webp-headers.mjs';

const publicDir = mkdtempSync(join(tmpdir(), 'rehype-img-'));
after(() => rmSync(publicDir, { recursive: true, force: true }));
mkdirSync(join(publicDir, 'images'), { recursive: true });
writeFileSync(join(publicDir, 'images', 'a.webp'), lossy(1200, 821));

const img = (properties) => ({ type: 'element', tagName: 'img', properties, children: [] });
const paragraph = (...children) => ({ type: 'element', tagName: 'p', properties: {}, children });
const root = (...children) => ({ type: 'root', children });
const run = (tree) => rehypeImg({ publicDir })(tree);

test('markdown 圖片補上延遲載入和檔案的寬高', () => {
  const node = img({ src: '/images/a.webp', alt: '圖' });
  run(root(paragraph(node)));
  assert.deepEqual(node.properties, {
    src: '/images/a.webp', alt: '圖', loading: 'lazy', decoding: 'async', width: 1200, height: 821,
  });
});

test('前面的 plugin 已經設好的屬性不動', () => {
  const node = img({ src: '/images/a.webp', loading: 'eager', decoding: 'sync', width: 600 });
  run(root(node));
  assert.deepEqual(node.properties, { src: '/images/a.webp', loading: 'eager', decoding: 'sync', width: 600 });
});

test('只設了寬或只設了高都不補另一邊 —— 補了會把比例弄錯', () => {
  const onlyHeight = img({ src: '/images/a.webp', height: 300 });
  run(root(onlyHeight));
  assert.deepEqual(onlyHeight.properties, { src: '/images/a.webp', height: 300, loading: 'lazy', decoding: 'async' });
});

test('讀不出尺寸的圖(找不到檔案、外部網址、相對路徑):只延遲載入,不補寬高,也不讓 build 失敗', () => {
  for (const src of ['/images/missing.webp', 'https://example.com/images/a.webp', '//images/a.webp', 'images/a.webp']) {
    const node = img({ src });
    run(root(node));
    assert.deepEqual(node.properties, { src, loading: 'lazy', decoding: 'async' }, src);
  }
});

test('沒有 src 或沒有 properties 的 img 也不會出錯', () => {
  const bare = { type: 'element', tagName: 'img', children: [] };
  const noSrc = img({ alt: '只有替代文字' });
  run(root(bare, noSrc));
  assert.deepEqual(bare.properties, { loading: 'lazy', decoding: 'async' });
  assert.deepEqual(noSrc.properties, { alt: '只有替代文字', loading: 'lazy', decoding: 'async' });
});

test('深層的 img 都找得到;不是 img 的元素和文字不碰', () => {
  const deep = img({ src: '/images/a.webp' });
  const link = { type: 'element', tagName: 'a', properties: { href: '/images/a.webp' }, children: [deep] };
  const text = { type: 'text', value: '字' };
  run(root(paragraph(paragraph(link)), text));
  assert.equal(deep.properties.width, 1200);
  assert.deepEqual(link.properties, { href: '/images/a.webp' });
  assert.deepEqual(text, { type: 'text', value: '字' });
});

test('不給選項也能用:publicDir 沒給時交給 image-size 的預設(工作目錄的 public/)', () => {
  const node = img({ src: 'https://example.com/a.webp' });
  rehypeImg()(root(node));
  assert.deepEqual(node.properties, { src: 'https://example.com/a.webp', loading: 'lazy', decoding: 'async' });
});
