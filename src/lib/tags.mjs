// 標籤 taxonomy 的規則。純函式,無 DOM、無 Astro 相依。
//
// 一個只有一篇文章的 tag 頁,對讀者沒有導覽價值(點進去就是他剛看完的那篇),
// 對搜尋引擎則是 thin content。所以 tag 仍然留在文章的 frontmatter 上(那是
// 準確的描述),但低於門檻的不產生獨立頁面,chip 也不做成連結。

/** 產生 tag 頁的門檻:至少要有這麼多篇文章。 */
export const MIN_TAG_POSTS = 2;

/** 從文章清單數每個 tag 的篇數。posts: [{ data: { tags } }] */
export function countTags(posts) {
  const counts = new Map();
  for (const p of posts ?? []) {
    for (const t of p?.data?.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return counts;
}

/** 這個 tag 有沒有自己的頁面? */
export function tagHasPage(counts, tag) {
  return (counts?.get(tag) ?? 0) >= MIN_TAG_POSTS;
}

/** 要產頁面的 tag,依篇數多到少、同篇數依字母序。 */
export function pageTags(counts) {
  return [...(counts ?? new Map()).entries()]
    .filter(([, c]) => c >= MIN_TAG_POSTS)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
