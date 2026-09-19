// remark-wiki-link 是全站 1000+ 個 [[wiki-link]] 的渲染入口，卻是 src/lib 裡
// 唯一沒有測試的模組。這裡蓋兩件事：標題 → 錨點的解析（parseHeadings，
// 決定 [[slug#段落]] 能不能對上），以及 plugin 真的把文字節點換成連結。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import remarkWikiLink, { parseHeadings } from '../src/lib/remark-wiki-link.mjs';

test('parseHeadings 抓得到各層級標題', () => {
  assert.deepEqual(parseHeadings('# 一\n## 二\n###### 六\n'), ['一', '二', '六']);
});

test('parseHeadings 跳過 front matter', () => {
  const raw = '---\ntitle: "# 這不是標題"\n---\n## 真標題\n';
  assert.deepEqual(parseHeadings(raw), ['真標題']);
});

test('parseHeadings 跳過 code fence 裡的 #（註解不是標題）', () => {
  const raw = '## 真標題\n\n```bash\n# 這是註解\n```\n\n## 另一個\n';
  assert.deepEqual(parseHeadings(raw), ['真標題', '另一個']);
});

test('parseHeadings 認得 ~~~ 與更長的 fence', () => {
  const raw = '~~~~\n# 註解\n~~~~\n## 標題\n';
  assert.deepEqual(parseHeadings(raw), ['標題']);
});

test('parseHeadings 重複標題會加序號（對上 Astro 的 github-slugger）', () => {
  assert.deepEqual(parseHeadings('## 反思\n## 反思\n## 反思\n'), ['反思', '反思-1', '反思-2']);
});

test('parseHeadings 去掉結尾的 closing hashes', () => {
  assert.deepEqual(parseHeadings('## 標題 ##\n'), ['標題']);
});

/** 跑一次 plugin，回傳處理後的樹。 */
function run(tree, file = { data: {} }) {
  remarkWikiLink()(tree, file);
  return tree;
}

const paragraph = (value) => ({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', value }] }] });

test('plugin 把 [[slug]] 換成指向該篇的連結，並用該篇標題當文字', () => {
  const tree = run(paragraph('看 [[lottery]] 這篇'));
  const kids = tree.children[0].children;
  const link = kids.find((n) => n.type === 'link');
  assert.ok(link, '應該產生 link 節點');
  assert.equal(link.url, '/blog/lottery/');
  assert.ok(link.children[0].value.length > 0, '連結文字應該是該篇標題');
  assert.equal(kids[0].value, '看 ');
});

test('plugin 用得到自訂標籤', () => {
  const link = run(paragraph('[[lottery|抽籤那篇]]')).children[0].children[0];
  assert.equal(link.url, '/blog/lottery/');
  assert.equal(link.children[0].value, '抽籤那篇');
});

test('plugin 碰到不存在的 slug 就原樣留著，不生出死連結', () => {
  const kids = run(paragraph('[[這篇不存在]]')).children[0].children;
  assert.equal(kids.length, 1);
  assert.equal(kids[0].type, 'text');
  assert.equal(kids[0].value, '[[這篇不存在]]');
});

test('plugin 不碰 inlineCode 與 code 區塊裡的 [[...]]', () => {
  const tree = {
    type: 'root',
    children: [
      { type: 'paragraph', children: [{ type: 'inlineCode', value: '[[lottery]]' }] },
      { type: 'code', value: '[[lottery]]' },
    ],
  };
  run(tree);
  assert.equal(tree.children[0].children[0].type, 'inlineCode');
  assert.equal(tree.children[0].children[0].value, '[[lottery]]');
  assert.equal(tree.children[1].value, '[[lottery]]');
});
