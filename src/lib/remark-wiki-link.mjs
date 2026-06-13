import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import GithubSlugger from 'github-slugger';
import { splitWikiLinks } from './wiki-link.mjs';

const BLOG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'blog');

// Heading anchors for one post body, matching Astro's github-slugger ids.
// Skips the front-matter block and fenced code blocks; one slugger per file
// reproduces Astro's per-document de-duplication.
// NOTE: headings are parsed from raw source, not the mdast tree, so a heading
// containing inline markdown (links/images/HTML) would slug differently from
// Astro's id. No current post does this; revisit if one ever does.
function parseHeadings(raw) {
  const slugger = new GithubSlugger();
  const anchors = [];
  const lines = raw.split(/\r?\n/);
  let inFrontMatter = false;
  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line.trim() === '---') { inFrontMatter = true; continue; }
    if (inFrontMatter) { if (line.trim() === '---') inFrontMatter = false; continue; }
    if (inFence) {
      // A closing fence is only fence chars (same char, length >= opener).
      const close = line.match(/^(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fenceChar && close[1].length >= fenceLen) inFence = false;
      continue;
    }
    const open = line.match(/^(`{3,}|~{3,})/);
    if (open) { inFence = true; fenceChar = open[1][0]; fenceLen = open[1].length; continue; }
    const h = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (h) anchors.push(slugger.slug(h[1]));
  }
  return anchors;
}

function buildMaps() {
  const titleMap = {};
  const headingsMap = {};
  for (const file of readdirSync(BLOG_DIR)) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace(/\.md$/, '');
    const raw = readFileSync(join(BLOG_DIR, file), 'utf8');
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const block = fm ? fm[1] : raw;
    const t = block.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    titleMap[slug] = t ? t[1] : slug;
    headingsMap[slug] = parseHeadings(raw);
  }
  return { titleMap, headingsMap };
}

let cachedMaps = null; // built once per process; restart `astro dev` after adding a post

export default function remarkWikiLink() {
  if (!cachedMaps) cachedMaps = buildMaps();
  const { titleMap, headingsMap } = cachedMaps;
  const onWarn = (msg) => console.warn(`[wiki-link] ${msg}`);

  return (tree, file) => {
    const path = file?.path || (file?.history && file.history[0]) || '';
    const currentSlug = path ? basename(path).replace(/\.md$/, '') : null;
    const ctx = { titleMap, headingsMap, currentSlug, onWarn };

    const walk = (node) => {
      if (!Array.isArray(node.children)) return;
      const out = [];
      for (const child of node.children) {
        if (child.type === 'link' || child.type === 'linkReference') {
          out.push(child); // do not recurse into existing links (avoid nested anchors)
        } else if (child.type === 'text' && child.value.includes('[[')) {
          out.push(...splitWikiLinks(child.value, ctx));
        } else {
          walk(child);
          out.push(child);
        }
      }
      node.children = out;
    };
    walk(tree);
  };
}
