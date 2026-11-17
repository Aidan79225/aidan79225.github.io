// 系列閱讀順序的排序規則。純函式,無 Astro 相依(test/series-order.test.mjs)。
//
// /fiction/ 列的是連載章節:同一個系列的文章要照 seriesOrder 由小到大排,讀者才能
// 從第一章往下讀;不同系列之間、以及沒有系列的單篇,仍然照日期由新到舊。
//
// 這件事一個 comparator 做不到——A1 排在 A2 前靠 seriesOrder、A2 排在 B 前靠
// 日期、B 又排在 A1 前也靠日期,三條規則會互相矛盾。所以先把同系列的文章收成一組,
// 整組用「最新一篇的日期」排在時間軸上,組內再照 seriesOrder。

/**
 * posts: [{ data: { date, series?, seriesOrder? } }] → 排好序的新陣列(不改原陣列)。
 * 同系列照 seriesOrder 由小到大(缺的當 0,再平手照日期由新到舊);
 * 系列與系列(或單篇)之間照各自最新一篇的日期由新到舊。
 */
export function sortBySeriesOrder(posts) {
  const groups = new Map(); // series 名(單篇則用文章本身當 key)→ { latest, items }
  for (const p of posts ?? []) {
    const key = p.data.series ?? p;
    const g = groups.get(key) ?? { latest: -Infinity, items: [] };
    g.latest = Math.max(g.latest, p.data.date.valueOf());
    g.items.push(p);
    groups.set(key, g);
  }
  return [...groups.values()]
    .sort((a, b) => b.latest - a.latest)
    .flatMap((g) =>
      g.items.sort(
        (a, b) =>
          (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0) ||
          b.data.date.valueOf() - a.data.date.valueOf(),
      ),
    );
}
