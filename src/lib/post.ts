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
