import { getCatalog } from '@/lib/db/mattressRepo';
import type { MattressEntry } from '@/lib/types';

/**
 * The live catalog entries for editorial pages (database first, committed
 * JSON fallback - see lib/db/mattressRepo). This is the one typed boundary
 * between the untyped CommonJS repository and the editorial components.
 */
export async function loadCatalogEntries(): Promise<MattressEntry[]> {
  const { entries } = await getCatalog();
  return entries as MattressEntry[];
}
