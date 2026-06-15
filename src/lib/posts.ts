import { getCollection } from 'astro:content';

// All blog posts, excluding drafts in production builds. Posts marked
// `draft: true` stay visible under `astro dev` (for previewing) but are hidden
// from the built site — listings, the /blog/<slug>/ route, tags, RSS, and
// backlinks all go through here.
export async function getPublishedPosts() {
  return getCollection('blog', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
}
