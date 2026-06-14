import type { CollectionEntry } from 'astro:content';
import type { BacklinkRef } from './backlinks';

export type { BacklinkRef };

export interface BacklinkGroup {
  label: string;
  sources: CollectionEntry<'blog'>[];
}

export function groupBySection(
  backlinks: BacklinkRef[],
  headings: { slug: string; text: string }[] | undefined
): BacklinkGroup[];
