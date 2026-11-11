import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    // Optional date of the last substantive revision. Shown on the post and
    // fed to dateModified / article:modified_time; omit for unrevised posts.
    updated: z.coerce.date().optional(),
    // Coarse bucket, drives the top nav: `tech` (articles, /tech/) or
    // `fiction` (chapters of the serialised novel 《霧港白露》, /fiction/).
    category: z.enum(['tech', 'fiction']),
    // Optional hand-written SEO/social description. When omitted, an excerpt is
    // derived from the post body (see excerpt() in src/lib/post.ts).
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    comments: z.boolean().default(true),
    commentsIssue: z.number().optional(),
    draft: z.boolean().default(false),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    // English translations only (files under src/content/blog/en/): the slug
    // of the zh-Hant original this post translates. Links the pair together
    // for the language switcher and hreflang alternates.
    translationOf: z.string().optional(),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

export const collections = { blog, guides };
