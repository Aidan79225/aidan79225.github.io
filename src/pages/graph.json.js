// Build-time graph of the article web: nodes = published posts, edges = wiki
// links between them (deduped, directed source→target but drawn undirected).
// Reuses extractLinks() so edges match the same wiki-link resolution as the
// in-post backlinks. Consumed by src/components/Graph.jsx.
import { getPublishedPosts, byDateDesc } from '../lib/posts';
import { extractLinks } from '../lib/wiki-link.mjs';

export async function GET() {
  const posts = (await getPublishedPosts()).sort(byDateDesc);
  const ids = new Set(posts.map((p) => p.id));

  const edgeSet = new Set();
  const edges = [];
  for (const p of posts) {
    const targets = new Set();
    for (const { slug } of extractLinks(p.body ?? '')) {
      if (slug !== p.id && ids.has(slug)) targets.add(slug);
    }
    for (const t of targets) {
      const key = `${p.id}->${t}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({ source: p.id, target: t });
    }
  }

  const degree = {};
  for (const e of edges) {
    degree[e.source] = (degree[e.source] || 0) + 1;
    degree[e.target] = (degree[e.target] || 0) + 1;
  }

  const nodes = posts.map((p) => ({
    id: p.id,
    title: p.data.title,
    url: `/blog/${p.id}/`,
    series: p.data.series ?? null,
    category: p.data.category,
    degree: degree[p.id] || 0,
  }));

  return new Response(JSON.stringify({ nodes, edges }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
