import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { splitWikiLinks } from './wiki-link.mjs';

const BLOG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'blog');

// Read each post's front-matter title once, keyed by slug (filename without .md).
function buildTitleMap() {
  const map = {};
  for (const file of readdirSync(BLOG_DIR)) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace(/\.md$/, '');
    const raw = readFileSync(join(BLOG_DIR, file), 'utf8');
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const block = fm ? fm[1] : raw;
    const t = block.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    map[slug] = t ? t[1] : slug;
  }
  return map;
}

let cachedMap = null;

export default function remarkWikiLink() {
  if (!cachedMap) cachedMap = buildTitleMap();
  const titleMap = cachedMap;
  const onMissing = (slug) => console.warn(`[wiki-link] unknown slug: [[${slug}]]`);

  const walk = (node) => {
    if (!Array.isArray(node.children)) return;
    const out = [];
    for (const child of node.children) {
      if (child.type === 'link') {
        out.push(child); // do not recurse into existing links (avoid nested anchors)
      } else if (child.type === 'text' && child.value.includes('[[')) {
        out.push(...splitWikiLinks(child.value, titleMap, onMissing));
      } else {
        walk(child);
        out.push(child);
      }
    }
    node.children = out;
  };

  return (tree) => walk(tree);
}
