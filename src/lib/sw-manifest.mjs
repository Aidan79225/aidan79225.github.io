// Pure helpers for the service-worker precache manifest (used by
// scripts/gen-sw.mjs at build time; unit-tested in test/sw-manifest.test.mjs).
//
// Policy: precache everything a reader needs to browse the whole site offline
// (pages, hashed assets, search/graph indexes, icons) and skip what they
// don't (OG share images are the bulk of dist/ and only matter to crawlers;
// sitemaps/RSS/robots are machine-facing).

/** Should this dist-relative file path be precached? */
export function shouldPrecache(relPath) {
  const p = relPath.replace(/\\/g, '/');
  if (p.startsWith('og/')) return false; // social share images: ~8.5MB, crawler-only
  // /en/ is mostly i18n fallback pages — duplicates of the zh content at a
  // second URL. Precaching them would double the HTML payload (~10MB) for
  // little value, so the English side is online-only.
  if (p.startsWith('en/')) return false;
  if (p.endsWith('.xml')) return false; // sitemap / rss
  if (p === 'robots.txt' || p === 'CNAME') return false;
  if (p === 'sw.js') return false; // never cache the worker itself
  return true;
}

/** Map a dist-relative file path to the URL it is served at. */
export function toUrl(relPath) {
  const p = relPath.replace(/\\/g, '/');
  if (p === 'index.html') return '/';
  if (p.endsWith('/index.html')) return '/' + p.slice(0, -'index.html'.length);
  return '/' + p;
}
