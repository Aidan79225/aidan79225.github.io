export interface MdastNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdastNode[];
}

export function wikiLinkRegex(): RegExp;
export function splitWikiLinks(
  value: string,
  titleMap: Record<string, string>,
  onMissing?: (slug: string) => void
): MdastNode[];
export function extractTargets(body: string): string[];
