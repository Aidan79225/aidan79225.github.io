import { getCollection, type CollectionEntry } from 'astro:content';

// All blog posts, excluding drafts in production builds. Posts marked
// `draft: true` stay visible under `astro dev` (for previewing) but are hidden
// from the built site — listings, the /blog/<slug>/ route, tags, RSS, and
// backlinks all go through here.
export async function getPublishedPosts() {
  return getCollection('blog', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
}

// Newest first. When two posts share the same date (common for series entries
// published together), break the tie by seriesOrder descending so the later
// part sits above the earlier one — matching reading order instead of falling
// back to arbitrary glob order.
export function byDateDesc(
  a: CollectionEntry<'blog'>,
  b: CollectionEntry<'blog'>,
): number {
  const byDate = b.data.date.valueOf() - a.data.date.valueOf();
  if (byDate !== 0) return byDate;
  return (b.data.seriesOrder ?? 0) - (a.data.seriesOrder ?? 0);
}
