export function toPlainText(body: string): string {
  return (body ?? '')
    .replace(/```[\s\S]*?```/g, ' ')           // code fences
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ') // figures (inline SVG)
    .replace(/<[^>]+>/g, ' ')                   // remaining HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')      // markdown images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')    // markdown links -> text
    .replace(/^#{1,6}\s+.*$/gm, '')             // strip heading lines entirely
    .replace(/[#>*_`~|]/g, '')                  // markdown syntax chars
    .replace(/\s+/g, ' ')                       // collapse whitespace
    .trim();
}

export function excerpt(body: string, len = 100): string {
  const text = toPlainText(body);
  return text.length > len ? text.slice(0, len) + '…' : text;
}

export function readingMinutes(body: string): number {
  const chars = toPlainText(body).length;
  return Math.max(1, Math.round(chars / 400));
}

export type Cover =
  | { type: 'svg'; svg: string }
  | { type: 'img'; src: string; alt: string }
  | null;

// Pull the first visual out of a post body to use as a card cover: the first
// inline <svg> figure (tech posts) or the first markdown image (food posts),
// whichever appears earlier. Returns null when a post has neither, so cards
// without a diagram just fall back to a text-only layout.
export function coverFromBody(body: string): Cover {
  const text = body ?? '';
  const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
  const imgMatch = text.match(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/);
  const svgAt = svgMatch ? svgMatch.index! : Infinity;
  const imgAt = imgMatch ? imgMatch.index! : Infinity;
  if (svgAt === Infinity && imgAt === Infinity) return null;

  if (svgAt <= imgAt) {
    // Drop the root tag's inline sizing so the card CSS controls how it fits.
    const svg = svgMatch![0].replace(/^<svg[^>]*>/i, (tag) =>
      tag.replace(/\s(?:style|width|height)="[^"]*"/gi, ''),
    );
    return { type: 'svg', svg };
  }
  return { type: 'img', src: imgMatch![2], alt: imgMatch![1] };
}
