// Build-time search index for the client-side site search (see
// src/components/Search.jsx). Emitted as a static /search-index.json — one
// small record per published post. Kept to title/tags/description/series so the
// payload stays a few KB; substring matching over these covers "find the post
// about X" without a full-text engine.
import { getPublishedPosts, byDateDesc } from '../lib/posts';
import { excerpt } from '../lib/excerpt';

export async function GET() {
  const posts = (await getPublishedPosts()).sort(byDateDesc);
  const index = posts.map((p) => ({
    title: p.data.title,
    url: `/blog/${p.id}/`,
    tags: p.data.tags ?? [],
    category: p.data.category,
    series: p.data.series ?? '',
    description: p.data.description ?? excerpt(p.body ?? '', 100),
  }));
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
