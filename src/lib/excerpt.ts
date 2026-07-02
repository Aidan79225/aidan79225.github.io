// Derive a plain-text excerpt from a Markdown post body, for use as the meta
// description / Open Graph description when a post has no hand-written
// `description` front-matter field. Strips code blocks, inline HTML/SVG,
// tables, wiki-links, and Markdown syntax, then trims to `max` characters.
// CJK text has no word boundaries, so slicing anywhere is safe.
export function excerpt(body: string, max = 140): string {
  let t = body;
  t = t.replace(/```[\s\S]*?```/g, ' '); // fenced code blocks
  t = t.replace(/<[^>]+>/g, ' '); // HTML / SVG tags (figure, svg, ...)
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, ' '); // images
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'); // links -> text
  t = t.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1'); // [[slug|label]] -> label
  t = t.replace(/\[\[([^\]]+)\]\]/g, '$1'); // [[slug]] -> slug
  t = t.replace(/^\s*\|.*$/gm, ' '); // table rows
  t = t.replace(/^\s*#{1,6}\s+/gm, ''); // headings
  t = t.replace(/^\s*>\s?/gm, ''); // blockquotes
  t = t.replace(/^\s*[-*+]\s+/gm, ''); // list markers
  t = t.replace(/[*_`~]/g, ''); // emphasis / inline code
  t = t.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  // Avoid cutting a Latin word in half; for CJK this is a no-op.
  return t.slice(0, max).replace(/\s+\S*$/, '').trim() + '…';
}
