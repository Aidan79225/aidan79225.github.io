import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkWikiLink from './src/lib/remark-wiki-link.mjs';

export default defineConfig({
  site: 'https://blog.aidan.tw',
  base: '/',
  // /series/ shipped briefly before being folded into /start/ — keep the URL alive.
  redirects: { '/series/': '/start/' },
  integrations: [react(), sitemap()],
  markdown: {
    remarkPlugins: [remarkCjkFriendly, remarkMath, remarkWikiLink],
    rehypePlugins: [rehypeKatex],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
