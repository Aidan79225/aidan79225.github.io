// Generate Open Graph / social share images (1200x630 PNG) for every published
// post, plus a site-wide default. Rendered here with `sharp`, which picks up an
// installed CJK font (e.g. WenQuanYi Zen Hei) via fontconfig, and committed to
// public/og/ as static assets. CI only serves the PNGs, so it needs no fonts.
//
// Run after adding or renaming a post:  npm run og
//
// Note: images are pre-rendered bitmaps committed to the repo — regenerate when
// you add a post, change a title, or restyle this template.
import sharp from 'sharp';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_DIR = join(ROOT, 'src/content/blog');
const OUT_DIR = join(ROOT, 'public/og');

const C = {
  base: '#1f2330',
  surface: '#262b3a',
  ink: '#e6e6e6',
  muted: '#9aa4b2',
  line: '#3a4154',
  accent: '#4f6df5',
};
const FONT = 'WenQuanYi Zen Hei, Noto Sans CJK TC, sans-serif';
const W = 1200;
const H = 630;

const xml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Wrap by estimated visual width. CJK glyphs ~1em, Latin/ASCII ~0.55em. CJK
// breaks per-character; a run of Latin word chars is kept whole by moving the
// in-progress run to the next line, so words like "Fundamentals" aren't split
// even when preceded by CJK punctuation (《) rather than a space.
function wrap(text, maxWidth, fontSize, maxLines) {
  const widthOf = (ch) => (/[\x00-\xff]/.test(ch) ? 0.55 : 1) * fontSize;
  const isWord = (ch) => /[A-Za-z0-9]/.test(ch);
  const measure = (s) => [...s].reduce((a, c) => a + widthOf(c), 0);
  const lines = [];
  let line = '';
  let w = 0;
  let runStart = -1; // index in `line` where the current Latin run began
  for (const ch of [...text]) {
    if (w + widthOf(ch) > maxWidth && line) {
      if (isWord(ch) && runStart > 0) {
        lines.push(line.slice(0, runStart).replace(/\s+$/, ''));
        line = line.slice(runStart) + ch;
        runStart = 0;
      } else {
        lines.push(line);
        line = ch;
        runStart = isWord(ch) ? 0 : -1;
      }
      w = measure(line);
    } else {
      if (isWord(ch)) {
        if (runStart < 0) runStart = line.length;
      } else {
        runStart = -1;
      }
      line += ch;
      w += widthOf(ch);
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, '…');
  }
  return lines;
}

// Minimal front-matter parse for the fields we need.
function parseFrontMatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = m[1];
  const pick = (k) => {
    const r = fm.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'));
    return r ? r[1].trim().replace(/^["']|["']$/g, '') : undefined;
  };
  const tags = [];
  const tagBlock = fm.match(/^tags:\s*\n((?:\s*-\s*.*\n?)+)/m);
  if (tagBlock) {
    for (const t of tagBlock[1].matchAll(/^\s*-\s*(.*)$/gm)) tags.push(t[1].trim());
  }
  return {
    title: pick('title'),
    category: pick('category'),
    series: pick('series'),
    draft: pick('draft') === 'true',
    tags,
  };
}

function template({ title, kicker, footer }) {
  const fontSize = title.length > 34 ? 52 : 60;
  const lineHeight = fontSize + 22;
  const lines = wrap(title, W - 200, fontSize, 4);
  const blockH = lines.length * lineHeight;
  const startY = 250 - blockH / 2 + fontSize; // vertically centre the title block
  const titleTspans = lines
    .map(
      (ln, i) =>
        `<text x="90" y="${startY + i * lineHeight}" font-family="${FONT}" font-size="${fontSize}" font-weight="bold" fill="${C.ink}">${xml(ln)}</text>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${C.base}"/><stop offset="1" stop-color="${C.surface}"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="16" height="${H}" fill="${C.accent}"/>
  <circle cx="1080" cy="120" r="230" fill="${C.accent}" opacity="0.06"/>
  <text x="90" y="118" font-family="${FONT}" font-size="34" font-weight="bold" fill="${C.accent}">Aidan's Blog</text>
  <text x="1110" y="118" font-family="${FONT}" font-size="26" fill="${C.muted}" text-anchor="end">${xml(kicker)}</text>
  ${titleTspans}
  <rect x="90" y="540" width="70" height="5" fill="${C.accent}"/>
  <text x="90" y="585" font-family="${FONT}" font-size="27" fill="${C.muted}">${xml(footer)}</text>
</svg>`;
}

async function render(svg, outPath) {
  await sharp(Buffer.from(svg)).png().toFile(outPath);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Site-wide default.
  await render(
    template({
      title: '用圖像加精簡的文字,把複雜的東西講清楚',
      kicker: 'Data Engineering · Tech Lead',
      footer: 'Airflow · Spark · Kafka · dbt · 資料架構',
    }),
    join(OUT_DIR, 'default.png'),
  );

  // Recursive: English translations live in en/ and get their own image
  // (en/<slug>.png), so a shared /en/ link previews with the English title.
  const files = (await readdir(BLOG_DIR, { recursive: true })).filter((f) => f.endsWith('.md'));
  let count = 0;
  for (const f of files) {
    const md = await readFile(join(BLOG_DIR, f), 'utf8');
    const fm = parseFrontMatter(md);
    if (!fm || fm.draft || !fm.title) continue;
    const slug = f.replace(/\.md$/, '');
    const isEn = slug.startsWith('en/');
    const kicker = fm.category === 'food' ? (isEn ? 'Food' : '美食') : (isEn ? 'Tech' : '技術');
    const footer = fm.series
      ? `${isEn ? 'Series' : '系列'} · ${fm.series}`
      : (fm.tags || []).slice(0, 4).map((t) => `#${t}`).join('  ');
    const outPath = join(OUT_DIR, `${slug}.png`);
    await mkdir(dirname(outPath), { recursive: true });
    await render(template({ title: fm.title, kicker, footer }), outPath);
    count++;
  }
  console.log(`Generated ${count} post OG images + default.png in public/og/`);
}

await main();
