// Pure wiki-link parsing. No filesystem I/O — safe to import from Node (remark
// plugin) and from the Vite/Astro side (backlinks helper).
import GithubSlugger from 'github-slugger';

// Matches [[target]] or [[target|label]]. `target` may contain '#section'.
export function wikiLinkRegex() {
  return /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
}

// Heading text -> anchor id, matching Astro's github-slugger output. A fresh
// slugger per call yields the base slug (matches a heading's first occurrence).
export function slugifyHeading(text) {
  return new GithubSlugger().slug(text);
}

// Split a wikilink target into { slug, section } on the first '#'.
// slug === '' means a same-page link; section === undefined means no '#'.
export function parseTarget(raw) {
  const hash = raw.indexOf('#');
  if (hash === -1) return { slug: raw, section: undefined };
  return { slug: raw.slice(0, hash), section: raw.slice(hash + 1) };
}

// Turn a plain-text string into mdast nodes, converting wikilinks to links.
// ctx: { titleMap, headingsMap = {}, currentSlug = null, onWarn }
//  - titleMap:    slug -> post title (for default link text on whole-post links)
//  - headingsMap: slug -> array of heading anchors (for section validation)
//  - currentSlug: the post being rendered (for same-page [[#section]] validation)
//  - onWarn(msg): called for unknown slug or unknown section
export function splitWikiLinks(value, ctx) {
  const { titleMap = {}, headingsMap = {}, currentSlug = null, onWarn } = ctx ?? {};
  const warn = (msg) => { if (onWarn) onWarn(msg); };
  const re = wikiLinkRegex();
  const nodes = [];
  let last = 0;
  let m;
  while ((m = re.exec(value)) !== null) {
    if (m.index > last) nodes.push({ type: 'text', value: value.slice(last, m.index) });
    const raw = m[1].trim();
    const label = m[2] ? m[2].trim() : undefined;
    const { slug, section } = parseTarget(raw);
    const sectionText = section !== undefined ? section.trim() : undefined;
    const hasSection = !!sectionText;
    const link = (url, text) => nodes.push({ type: 'link', url, children: [{ type: 'text', value: text }] });
    const rawText = () => nodes.push({ type: 'text', value: m[0] });

    if (slug === '') {
      // Same-page link: [[#section]]
      if (!hasSection) {
        rawText(); // [[#]] — nothing to point at
      } else {
        const anchor = slugifyHeading(sectionText);
        if (currentSlug && headingsMap[currentSlug] && !headingsMap[currentSlug].includes(anchor)) {
          warn(`unknown section [[#${sectionText}]] in ${currentSlug}`);
        }
        link(`#${anchor}`, label || sectionText);
      }
    } else {
      const title = titleMap[slug];
      if (title === undefined) {
        warn(`unknown slug: [[${slug}]]`);
        rawText();
      } else if (!hasSection) {
        link(`/blog/${slug}/`, label || title);
      } else {
        const anchor = slugifyHeading(sectionText);
        if (headingsMap[slug] && !headingsMap[slug].includes(anchor)) {
          warn(`unknown section [[${slug}#${sectionText}]]`);
        }
        link(`/blog/${slug}/#${anchor}`, label || sectionText);
      }
    }
    last = m.index + m[0].length;
  }
  if (last < value.length) nodes.push({ type: 'text', value: value.slice(last) });
  return nodes;
}

// Collect referenced links as { slug, anchor }. anchor = slugified section, or
// null for a whole-post link. Same-page links (empty slug) are ignored.
export function extractLinks(body) {
  const re = wikiLinkRegex();
  const links = [];
  let m;
  // A '|' inside a Markdown table cell must be escaped as '\|' so it isn't read
  // as a column separator. The rendered mdast unescapes it, but this runs on the
  // raw source — normalise '\|' -> '|' first, or the slug captures a trailing
  // backslash (e.g. "fode-7\") and the backlink/graph edge is lost.
  const src = (body ?? '').replace(/\\\|/g, '|');
  while ((m = re.exec(src)) !== null) {
    const { slug, section } = parseTarget(m[1].trim());
    if (slug === '') continue;
    const sectionText = section !== undefined ? section.trim() : undefined;
    links.push({ slug, anchor: sectionText ? slugifyHeading(sectionText) || null : null });
  }
  return links;
}

// Collect referenced base slugs (section stripped; same-page links ignored).
export function extractTargets(body) {
  return extractLinks(body).map((l) => l.slug);
}
