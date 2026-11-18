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
// tag pages (~3.2MB across 100 pages), listing pages past page 1 and the
// novel's illustrations other than each chapter's cover.

// The novel's illustrations: public/images/white-dew/white-dew-NN-N.webp,
// ~70KB each, a few per chapter, seventeen chapters.
const ILLUSTRATION = /^images\/white-dew\//;
// A chapter's first picture is also the cover of its card (PostCard takes a
// post's first image), and the pages that list the cards are precached.
const CHAPTER_COVER = /^images\/white-dew\/white-dew-\d+-1\.webp$/;

/**
 * Left out of the precache but cached once a reader has seen it (handleAsset
 * in the worker). gen-sw.mjs still feeds these files into the worker's
 * VERSION: they are served cache-first, so a picture replaced under the same
 * name would otherwise never reach a reader who has the old one.
 */
export function cachedOnDemand(relPath) {
  const p = relPath.replace(/\\/g, '/');
  return ILLUSTRATION.test(p) && !CHAPTER_COVER.test(p);
}

/** Should this dist-relative file path be precached? */
export function shouldPrecache(relPath) {
  const p = relPath.replace(/\\/g, '/');
  if (p.startsWith('og/')) return false; // social share images: ~8.5MB, crawler-only
  // A chapter reads fine without its pictures, so they are cached on demand —
  // all but each chapter's cover: without it the offline home page would open
  // with a broken picture.
  if (cachedOnDemand(p)) return false;
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
