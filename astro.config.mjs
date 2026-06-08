import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://aidan79225.github.io',
  base: '/',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
