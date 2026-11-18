// 文章裡用 markdown 寫的站內圖片(`![alt](/images/…)`,目前是《霧港白露》的插圖)
// 必須真的在 public/ 裡,而且讀得出尺寸。少一張圖 build 不會失敗(rehype-img 和
// PostCard 讀不到尺寸就略過),頁面上卻是破圖 —— 所以在這裡擋。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { publicImageSize } from '../src/lib/image-size.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_DIR = join(ROOT, 'src', 'content', 'blog');
const PUBLIC_DIR = join(ROOT, 'public');

function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
}

// 每一篇文章裡站內絕對路徑的 markdown 圖片:[文章, 圖片網址]。
const references = markdownFiles(BLOG_DIR).flatMap((file) =>
  [...readFileSync(file, 'utf8').matchAll(/!\[[^\]]*\]\((\/[^)\s]+)[^)]*\)/g)].map((m) => [relative(ROOT, file), m[1]]),
);

test('文章引用的站內圖片都在 public/ 裡', () => {
  for (const [post, src] of references) {
    assert.ok(existsSync(join(PUBLIC_DIR, decodeURIComponent(src.split(/[?#]/)[0]))), `${post} 引用的 ${src} 不在 public/`);
  }
});

test('文章引用的站內 WebP 都讀得出寬高(版面才留得住位置)', () => {
  for (const [post, src] of references.filter(([, s]) => /\.webp(?:[?#]|$)/i.test(s))) {
    const size = publicImageSize(src, PUBLIC_DIR);
    assert.ok(size && size.width > 0 && size.height > 0, `${post} 引用的 ${src} 讀不出尺寸`);
  }
});

test('有英文版的文章,兩個語言放的是同一批圖、同樣的順序', () => {
  const imagesOf = (post) => references.filter(([file]) => file === post).map(([, src]) => src);
  const english = join('src', 'content', 'blog', 'en');
  const translated = [...new Set(references.map(([file]) => file))].filter((file) => file.startsWith(english));
  for (const en of translated) {
    const zh = join('src', 'content', 'blog', relative(english, en));
    assert.deepEqual(imagesOf(zh), imagesOf(en), `${zh} 和 ${en} 的圖不一樣`);
  }
  // 這條規則現在管得到東西:第一章的中英文版各有五張插圖。
  assert.equal(imagesOf(join('src', 'content', 'blog', 'white-dew-01.md')).length, 5);
});
