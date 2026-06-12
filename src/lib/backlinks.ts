import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { extractTargets } from './wiki-link.mjs';

// Posts whose body links to targetSlug via a wikilink, newest first.
export async function getBacklinks(
  targetSlug: string
): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog');
  return posts
    .filter((p) => p.id !== targetSlug && extractTargets(p.body ?? '').includes(targetSlug))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
