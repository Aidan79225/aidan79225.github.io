import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkWikiLink from './src/lib/remark-wiki-link.mjs';

export default defineConfig({
  site: 'https://aidan79225.github.io',
  base: '/',
  integrations: [react()],
  markdown: {
    remarkPlugins: [remarkMath, remarkWikiLink],
    rehypePlugins: [rehypeKatex],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
