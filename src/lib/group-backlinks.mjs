// Pure grouping for the "被引用於" panel. No I/O — unit-testable under node:test.
// backlinks: Array<{ post, anchor: string|null }>  (post has .id and .data.title)
// headings:  Array<{ slug, text }>                  (the target post's own headings)
// Returns ordered groups: sections that have sources in heading order, then a
// single "整篇文章" group last. Whole-post links (anchor null) and anchors that
// match no heading fold into "整篇文章". Sources within a group are deduped by
// post.id (a post referencing both the whole post and a stale section, or the
// same target twice, appears once per group).
const WHOLE_POST_LABEL = '整篇文章';

function dedupById(posts) {
  const seen = new Set();
  const out = [];
  for (const p of posts) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

export function groupBySection(backlinks, headings) {
  const heads = headings ?? [];
  const textBySlug = new Map(heads.map((h) => [h.slug, h.text]));
  const sectionSources = new Map(); // anchor -> post[]
  const wholePost = [];
  for (const { post, anchor } of backlinks ?? []) {
    if (anchor && textBySlug.has(anchor)) {
      if (!sectionSources.has(anchor)) sectionSources.set(anchor, []);
      sectionSources.get(anchor).push(post);
    } else {
      wholePost.push(post);
    }
  }
  const groups = [];
  for (const h of heads) {
    const sources = sectionSources.get(h.slug);
    if (sources && sources.length) groups.push({ label: h.text, sources: dedupById(sources) });
  }
  if (wholePost.length) groups.push({ label: WHOLE_POST_LABEL, sources: dedupById(wholePost) });
  return groups;
}
