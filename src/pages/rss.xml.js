import rss from '@astrojs/rss';
import { getPublishedPosts, byDateDesc } from '../lib/posts';

export async function GET(context) {
  const posts = await getPublishedPosts();
  return rss({
    title: "Aidan's Blog",
    description: 'Aidan 的部落格',
    site: context.site,
    items: posts
      .sort(byDateDesc)
      .map((post) => ({
        title: post.data.title,
        pubDate: post.data.date,
        link: `/blog/${post.id}/`,
      })),
  });
}
