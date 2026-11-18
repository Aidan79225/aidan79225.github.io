// Pixel size of a picture served from public/, read from the file's header at
// build time. An <img> that carries its width and height lets the browser
// reserve the space before the file arrives, so the text does not jump.
// Used by the rehype plugin for markdown images (rehype-img.mjs) and by
// PostCard for a card's cover. WebP only: that is what the novel's exporter
// writes; anything else keeps its natural size.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The default folder is found from the working directory (the project root
// for `astro build`, `astro dev` and `npm test`), not from this module's own
// URL: a component that imports this file is bundled before it runs, and the
// bundle no longer sits in src/lib/.
const defaultPublicDir = () => join(process.cwd(), 'public');

/** Pixel size of a WebP file from its header, or null when it cannot be read from it. */
export function webpSize(buf) {
  if (buf.length < 30) return null;
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') return null;
  const chunk = buf.toString('latin1', 12, 16);
  if (chunk === 'VP8 ') {
    // Lossy: a 3-byte frame tag, the start code 9d 01 2a, then width and height
    // in 14 bits each (the two bits above them are a scaling hint).
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    // Lossless: the signature 2f, then 14 bits of width-1 and 14 bits of
    // height-1 (the four bits above them are the alpha flag and the version).
    if (buf[20] !== 0x2f) return null;
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') {
    // Extended (alpha, ICC, animation): 24 bits of canvas width-1, then of height-1.
    return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  }
  return null;
}

/**
 * Size of the picture a site-absolute URL (`/images/…`) points at in public/,
 * or null: not site-absolute, not a WebP, not there, or not readable. Never
 * throws, so a missing picture cannot fail the build (test/content-images
 * catches that instead).
 */
export function publicImageSize(src, publicDir = defaultPublicDir()) {
  if (!src.startsWith('/') || src.startsWith('//')) return null;
  const path = src.split(/[?#]/)[0];
  if (!/\.webp$/i.test(path)) return null;
  try {
    return webpSize(readFileSync(join(publicDir, decodeURIComponent(path))));
  } catch {
    return null;
  }
}
