// Every hard-coded colour in an inline SVG diagram needs a light-theme
// counterpart, otherwise the diagram keeps a dark-palette shape on a white
// page. Scan the content + pages + components for hex literals used as a
// colour and assert each one is either mapped or explicitly kept.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MAP, KEEP } from '../scripts/theme-map.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['src/content/blog', 'src/pages', 'src/components'];
const EXT = /\.(md|mdx|astro|jsx|tsx)$/;
// The rotary calculator is a deliberately dark skeuomorphic object (a 1970s
// phone) and keeps its own palette in both themes.
const SKIP = /rotary-calculator/;

// Matches a hex used as a colour: fill="#…", stroke:#…, stop-color="#…",
// color:#… — not `url(#id)` references, which share the `#` sigil.
const COLOR_RE = /(?:fill|stroke|stop-color|color)\s*[=:]\s*"?\s*(#[0-9a-fA-F]{3,8})/g;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (SKIP.test(p)) continue;
    if (e.isDirectory()) yield* walk(p);
    else if (EXT.test(e.name)) yield p;
  }
}

test('every diagram colour has a light-theme mapping', async () => {
  const unmapped = new Map();
  for (const dir of DIRS) {
    for await (const file of walk(join(ROOT, dir))) {
      const body = await readFile(file, 'utf8');
      for (const m of body.matchAll(COLOR_RE)) {
        const hex = m[1].toLowerCase();
        if (MAP[hex] || KEEP.has(hex)) continue;
        if (!unmapped.has(hex)) unmapped.set(hex, file);
      }
    }
  }
  assert.deepEqual(
    [...unmapped].map(([hex, file]) => `${hex} (first seen in ${file.slice(ROOT.length + 1)})`),
    [],
    'add these to MAP in scripts/theme-map.mjs, then run `npm run theme:css`',
  );
});
