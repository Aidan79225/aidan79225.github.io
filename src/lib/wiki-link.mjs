// Pure wiki-link parsing. No I/O — safe to import from Node (remark plugin)
// and from the Vite/Astro side (backlinks helper).

// Matches [[slug]] or [[slug|label]]. Inside the char class, \] is a literal
// closing bracket and | is a literal pipe (the alternation meaning does not
// apply inside [...]).
export function wikiLinkRegex() {
  return /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
}

// Split a plain-text string into an array of mdast nodes, turning each
// [[slug]] / [[slug|label]] into a link node. Unknown slugs (not in titleMap)
// are kept verbatim as text and reported through onMissing.
export function splitWikiLinks(value, titleMap, onMissing) {
  const re = wikiLinkRegex();
  const nodes = [];
  let last = 0;
  let m;
  while ((m = re.exec(value)) !== null) {
    if (m.index > last) {
      nodes.push({ type: 'text', value: value.slice(last, m.index) });
    }
    const slug = m[1].trim();
    const label = m[2] ? m[2].trim() : undefined;
    const title = titleMap[slug];
    if (title === undefined) {
      if (onMissing) onMissing(slug);
      nodes.push({ type: 'text', value: m[0] });
    } else {
      nodes.push({
        type: 'link',
        url: `/blog/${slug}/`,
        children: [{ type: 'text', value: label || title }],
      });
    }
    last = m.index + m[0].length;
  }
  if (last < value.length) {
    nodes.push({ type: 'text', value: value.slice(last) });
  }
  return nodes;
}

// Collect every referenced slug in a raw markdown body (labels ignored).
export function extractTargets(body) {
  const re = wikiLinkRegex();
  const targets = [];
  let m;
  while ((m = re.exec(body ?? '')) !== null) {
    targets.push(m[1].trim());
  }
  return targets;
}
