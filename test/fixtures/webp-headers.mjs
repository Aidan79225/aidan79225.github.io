// WebP 檔頭的最小樣本,給 image-size 與 rehype-img 的測試用:只有 RIFF 容器加第一個
// chunk 的前幾個位元組,其餘補零。真的圖檔不必進測試。

/** RIFF/WEBP 容器加一個 chunk;body 從 chunk 資料的起點(offset 20)開始放。 */
export function webp(chunk, body) {
  const buf = Buffer.alloc(40);
  buf.write('RIFF', 0, 'latin1');
  buf.write('WEBP', 8, 'latin1');
  buf.write(chunk, 12, 'latin1');
  Buffer.from(body).copy(buf, 20);
  return buf;
}

/** 有損(VP8 ):frame tag 三個位元組、起始碼 9d 01 2a、寬與高各 14 bits。 */
export const lossy = (w, h) => webp('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, w & 0xff, w >> 8, h & 0xff, h >> 8]);

/** 無損(VP8L):簽名 2f,接著寬減一與高減一各 14 bits。 */
export function lossless(w, h) {
  const bits = ((w - 1) | ((h - 1) << 14)) >>> 0;
  return webp('VP8L', [0x2f, bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, (bits >>> 24) & 0xff]);
}

/** 延伸(VP8X):旗標與保留位元組之後,畫布寬減一與高減一各 24 bits。 */
export function extended(w, h) {
  const a = w - 1;
  const b = h - 1;
  return webp('VP8X', [0, 0, 0, 0, a & 0xff, (a >> 8) & 0xff, a >> 16, b & 0xff, (b >> 8) & 0xff, b >> 16]);
}
