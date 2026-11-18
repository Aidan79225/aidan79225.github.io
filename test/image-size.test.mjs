// image-size 從 public/ 裡的圖檔檔頭讀出寬高,給 markdown 圖片(rehype-img)和
// 列表卡片的封面(PostCard)用,免得圖載入時版面往下跳。這裡蓋兩件事:WebP 三種
// 檔頭的寬高讀得對、讀不出來時回 null 而不是丟例外;以及哪些網址會去 public/ 找檔案。
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { webpSize, publicImageSize } from '../src/lib/image-size.mjs';
import { lossy, lossless, extended, webp } from './fixtures/webp-headers.mjs';

test('webpSize 讀得出有損、無損、延伸三種檔頭的寬高', () => {
  assert.deepEqual(webpSize(lossy(1200, 821)), { width: 1200, height: 821 });
  assert.deepEqual(webpSize(lossless(1200, 821)), { width: 1200, height: 821 });
  assert.deepEqual(webpSize(extended(1200, 821)), { width: 1200, height: 821 });
  assert.deepEqual(webpSize(extended(70000, 3)), { width: 70000, height: 3 });
  assert.deepEqual(webpSize(lossy(1, 16383)), { width: 1, height: 16383 });
  assert.deepEqual(webpSize(lossless(16384, 1)), { width: 16384, height: 1 });
});

test('webpSize 不把寬高旁邊的位元算進去(有損的縮放位元、無損的 alpha 與版本位元)', () => {
  const scaled = lossy(1200, 821);
  scaled[27] |= 0xc0; // 寬度上面的兩個縮放位元
  scaled[29] |= 0x40; // 高度上面的縮放位元
  assert.deepEqual(webpSize(scaled), { width: 1200, height: 821 });
  const flagged = lossless(1200, 821);
  flagged[24] |= 0xf0; // alpha 旗標和三個版本位元
  assert.deepEqual(webpSize(flagged), { width: 1200, height: 821 });
});

test('webpSize 遇到不是 WebP、太短或認不得的 chunk 回 null', () => {
  assert.equal(webpSize(Buffer.from('not an image at all, just some text here')), null);
  assert.equal(webpSize(Buffer.from('RIFF')), null);
  assert.equal(webpSize(webp('ALPH', [])), null);
  assert.equal(webpSize(webp('VP8 ', [0, 0, 0, 0, 0, 0, 1, 0, 1, 0])), null); // 沒有起始碼
  assert.equal(webpSize(webp('VP8L', [0x00, 1, 0, 0, 0])), null); // 沒有簽名位元組
  const wave = extended(1200, 821);
  wave.write('WAVE', 8, 'latin1'); // RIFF 容器,但不是 WebP
  assert.equal(webpSize(wave), null);
  const notRiff = extended(1200, 821);
  notRiff.write('JUNK', 0, 'latin1');
  assert.equal(webpSize(notRiff), null);
  assert.equal(webpSize(lossy(1200, 821).subarray(0, 29)), null); // 少一個位元組
});

const publicDir = mkdtempSync(join(tmpdir(), 'image-size-'));
after(() => rmSync(publicDir, { recursive: true, force: true }));
mkdirSync(join(publicDir, 'images'), { recursive: true });
writeFileSync(join(publicDir, 'images', 'a.webp'), lossy(1200, 821));
writeFileSync(join(publicDir, 'images', 'a b.webp'), lossless(640, 480));
writeFileSync(join(publicDir, 'images', 'broken.webp'), 'RIFF');
writeFileSync(join(publicDir, 'images', 'a.png'), lossy(10, 10));

test('publicImageSize 用站內絕對路徑到 public/ 找檔案', () => {
  assert.deepEqual(publicImageSize('/images/a.webp', publicDir), { width: 1200, height: 821 });
  assert.deepEqual(publicImageSize('/images/a.webp?v=2#top', publicDir), { width: 1200, height: 821 });
  assert.deepEqual(publicImageSize('/images/a.webp#only-hash', publicDir), { width: 1200, height: 821 });
  assert.deepEqual(publicImageSize('/images/a%20b.webp', publicDir), { width: 640, height: 480 });
});

test('publicImageSize 沒給資料夾時,找的是工作目錄底下的 public/', () => {
  // 元件(PostCard)被打包之後才執行,模組自己的位置已經不在 src/lib/,所以預設值
  // 用工作目錄:astro build、astro dev、npm test 都從專案根目錄跑。
  const project = mkdtempSync(join(tmpdir(), 'image-size-cwd-'));
  mkdirSync(join(project, 'public', 'images'), { recursive: true });
  writeFileSync(join(project, 'public', 'images', 'b.webp'), extended(300, 200));
  const before = process.cwd();
  try {
    process.chdir(project);
    assert.deepEqual(publicImageSize('/images/b.webp'), { width: 300, height: 200 });
  } finally {
    process.chdir(before);
    rmSync(project, { recursive: true, force: true });
  }
});

test('publicImageSize 只認站內絕對路徑的 WebP,其他一律 null', () => {
  // 少了開頭的斜線或是 // 開頭(別的主機):就算 public/ 裡有同名的檔案也不去讀。
  assert.equal(publicImageSize('images/a.webp', publicDir), null);
  assert.equal(publicImageSize('//images/a.webp', publicDir), null);
  assert.equal(publicImageSize('https://example.com/images/a.webp', publicDir), null);
  assert.equal(publicImageSize('/images/a.png', publicDir), null); // 檔頭是 WebP,但副檔名不是
});

test('publicImageSize 找不到檔案、檔案壞掉、跳脫字元寫錯都回 null,不丟例外', () => {
  assert.equal(publicImageSize('/images/missing.webp', publicDir), null);
  assert.equal(publicImageSize('/images/broken.webp', publicDir), null);
  assert.equal(publicImageSize('/images/%E0%A4%A.webp', publicDir), null);
  assert.equal(publicImageSize('/images/', publicDir), null);
});
