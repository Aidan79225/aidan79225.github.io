import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, type Locale } from './i18n';

// English translations live under src/content/blog/en/, so their collection
// ids carry an `en/` prefix; everything else is the zh-Hant original.
export function postLang(post: CollectionEntry<'blog'>): Locale {
  return post.id.startsWith('en/') ? 'en' : DEFAULT_LOCALE;
}

// Canonical URL path for a post in its own language.
export function postUrl(post: CollectionEntry<'blog'>): string {
  return postLang(post) === 'en' ? `/en/blog/${post.id.slice(3)}/` : `/blog/${post.id}/`;
}

// Published posts in one language, excluding drafts in production builds.
// Defaults to zh-Hant so every pre-i18n caller (listings, tags, RSS, search
// index, graph, backlinks) keeps seeing only the original posts; pass 'en'
// explicitly for the English routes. Posts marked `draft: true` stay visible
// under `astro dev` (for previewing) but are hidden from the built site.
export async function getPublishedPosts(lang: Locale = DEFAULT_LOCALE) {
  return getCollection(
    'blog',
    ({ id, data }) =>
      (id.startsWith('en/') ? 'en' : DEFAULT_LOCALE) === lang &&
      (import.meta.env.PROD ? !data.draft : true),
  );
}

// The other-language counterpart of a post, if one is published: an English
// post names its zh original via `translationOf`; a zh post's translation is
// the English post pointing back at it. Returns null when there isn't one.
export async function getTranslation(
  post: CollectionEntry<'blog'>,
): Promise<CollectionEntry<'blog'> | null> {
  if (postLang(post) === 'en') {
    const original = post.data.translationOf;
    if (!original) return null;
    return (await getPublishedPosts()).find((p) => p.id === original) ?? null;
  }
  return (
    (await getPublishedPosts('en')).find((p) => p.data.translationOf === post.id) ?? null
  );
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
