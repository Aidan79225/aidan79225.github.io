import type { CollectionEntry } from 'astro:content';

export interface BacklinkRef {
  post: CollectionEntry<'blog'>;
  anchor: string | null;
}

export interface BacklinkGroup {
  label: string;
  sources: CollectionEntry<'blog'>[];
}

export function groupBySection(
  backlinks: BacklinkRef[],
  headings: { slug: string; text: string }[] | undefined
): BacklinkGroup[];
