// Pure helpers for the service-worker precache manifest (used by
// scripts/gen-sw.mjs at build time; unit-tested in test/sw-manifest.test.mjs).
//
// Policy: precache what makes the site *readable* offline — every post, the
// entry points that lead to them, and the assets/indexes those pages need.
// Everything else is left to the runtime cache (handleNav is network-first and
// stores each page it serves), so a reader who actually visits a tag page still
// gets it offline afterwards — they just don't pay for all 100 of them up front.
//
// Skipped: OG share images (crawler-only, the bulk of dist/), machine-facing
// files (sitemap/RSS/robots), the worker itself, the /en/ i18n-fallback tree,
// tag pages (~3.2MB across 100 pages) and listing pages past page 1.

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
  // Tag pages: 100 pages / ~3.2MB of the same post cards re-sliced. The tag
  // index (the cloud that links to them) is small and stays.
  if (p.startsWith('tags/') && p !== 'tags/index.html') return false;
  // Paginated listings: page 1 is the entry point, later pages are navigation
  // a reader only reaches by clicking — and by then they're online.
  if (/^[^/]+\/\d+\/index\.html$/.test(p)) return false;
  return true;
}

/** Map a dist-relative file path to the URL it is served at. */
export function toUrl(relPath) {
  const p = relPath.replace(/\\/g, '/');
  if (p === 'index.html') return '/';
  if (p.endsWith('/index.html')) return '/' + p.slice(0, -'index.html'.length);
  return '/' + p;
}
