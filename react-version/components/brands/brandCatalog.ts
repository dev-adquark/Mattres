import { getCatalog } from '@/lib/db/mattressRepo';
import { groupByBrand } from '@/components/product/productData';
import type { MattressEntry } from '@/lib/types';
import type { BrandGroup } from './brandData';

/**
 * Typed server-side access to the catalog for the brand routes.
 * lib/db/mattressRepo.ts is CommonJS (required by root Node scripts) and
 * untyped; its rows are mapped to the audited MattressEntry shape there.
 */
export async function loadCatalogEntries(): Promise<MattressEntry[]> {
  const { entries } = (await getCatalog()) as { entries: MattressEntry[] };
  return entries;
}

export function brandGroups(entries: readonly MattressEntry[]): BrandGroup[] {
  return groupByBrand(entries);
}

/** One brand plus the full catalog (verdicts and rivals rank against all of it), or null. */
export async function loadBrand(slug: string): Promise<{ group: BrandGroup; entries: MattressEntry[] } | null> {
  const entries = await loadCatalogEntries();
  const group = brandGroups(entries).find((g) => g.slug === slug);
  return group ? { group, entries } : null;
}
