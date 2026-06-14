import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { extractLinks } from './wiki-link.mjs';

export interface BacklinkRef {
  post: CollectionEntry<'blog'>;
  anchor: string | null;
}

// Backlinks to targetSlug as { post, anchor } (anchor = section slug, or null
// for a whole-post link), deduped per (post, anchor), newest post first.
export async function getBacklinks(targetSlug: string): Promise<BacklinkRef[]> {
  const posts = (await getCollection('blog'))
    .filter((p) => p.id !== targetSlug)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const refs: BacklinkRef[] = [];
  const seen = new Set<string>();
  for (const post of posts) {
    for (const { slug, anchor } of extractLinks(post.body ?? '')) {
      if (slug !== targetSlug) continue;
      const key = `${post.id}#${anchor ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({ post, anchor });
    }
  }
  return refs;
}
