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
  // zh-Hant stays unprefixed (all existing URLs unchanged); English lives
  // under /en/. Every route exists under /en/: real English pages are authored
  // in src/pages/en/, and everything else falls back to a rewrite of the
  // zh-Hant content — so navigation never drops out of the /en/ prefix.
  // Fallback pages mark themselves with rel=canonical to the zh URL (see
  // BaseLayout) to avoid duplicate-content SEO issues.
  i18n: {
    defaultLocale: 'zh-hant',
    locales: ['zh-hant', 'en'],
    fallback: { en: 'zh-hant' },
    routing: { prefixDefaultLocale: false, fallbackType: 'rewrite' },
  },
  integrations: [react(), sitemap()],
  markdown: {
    remarkPlugins: [remarkCjkFriendly, remarkMath, remarkWikiLink],
    rehypePlugins: [rehypeKatex],
    // Highlight every block twice and emit both palettes as CSS variables
    // (--shiki-light / --shiki-dark); global.css picks one per theme, so code
    // blocks switch with the rest of the page and need no re-render.
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
