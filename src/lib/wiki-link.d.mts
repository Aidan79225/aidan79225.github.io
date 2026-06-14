export interface MdastNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdastNode[];
}

export interface WikiLinkContext {
  titleMap: Record<string, string>;
  headingsMap?: Record<string, string[]>;
  currentSlug?: string | null;
  onWarn?: (message: string) => void;
}

export function wikiLinkRegex(): RegExp;
export function slugifyHeading(text: string): string;
export function parseTarget(raw: string): { slug: string; section: string | undefined };
export function splitWikiLinks(value: string, ctx: WikiLinkContext): MdastNode[];
export function extractTargets(body: string): string[];
export function extractLinks(body: string): { slug: string; anchor: string | null }[];
