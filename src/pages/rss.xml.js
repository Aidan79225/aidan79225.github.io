import rss from '@astrojs/rss';
import { getPublishedPosts, byDateDesc } from '../lib/posts';
import { excerpt } from '../lib/post';

export async function GET(context) {
  const posts = await getPublishedPosts();
  return rss({
    title: "Aidan's Blog",
    description: 'Aidan 的部落格 —— 用圖像加精簡的文字,把資料工程與技術領導講清楚。',
    site: context.site,
    items: posts
      .sort(byDateDesc)
      .map((post) => ({
        title: post.data.title,
        pubDate: post.data.date,
        link: `/blog/${post.id}/`,
        description: post.data.description ?? excerpt(post.body ?? '', 140),
        categories: post.data.tags ?? [],
      })),
    customData: '<language>zh-Hant</language>',
  });
}
