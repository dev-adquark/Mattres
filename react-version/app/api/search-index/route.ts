import { getCatalog } from '@/lib/db/mattressRepo';
import { buildSearchIndex } from '@/lib/searchIndex';
import { COMPARE_PAIRS } from '@/lib/compareTopics';

// The index only changes when the catalog does; regenerate at most hourly.
export const revalidate = 3600;

/**
 * Compact site-search index (ids, names, types, firmness labels, category
 * counts, routes) - not the full catalog. Curated A-vs-B pairs are included
 * from lib/compareTopics COMPARE_PAIRS ([{ slug, title, href? }]).
 */
export async function GET(): Promise<Response> {
  const { entries } = await getCatalog();
  const pairs = Array.isArray(COMPARE_PAIRS) ? COMPARE_PAIRS : [];
  const index = buildSearchIndex(entries, { pairs });
  return Response.json(index, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
  });
}
