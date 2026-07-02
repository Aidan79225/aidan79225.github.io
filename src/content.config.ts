import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['tech', 'food']),
    // Optional hand-written SEO/social description. When omitted, an excerpt is
    // derived from the post body (see src/lib/excerpt.ts).
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    comments: z.boolean().default(true),
    commentsIssue: z.number().optional(),
    draft: z.boolean().default(false),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
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
