import { describe, it, expect } from 'vitest';
import catalogJson from '@/lib/data/mattress-catalog.json';
import { CATEGORY_PAGES, categoryCounts, categoryTagsFor, countLabel, getCategoryPage } from '@/lib/categoryPages';
import type { MattressEntry } from '@/lib/types';

// JSON imports widen string unions; the catalog's shape is MattressEntry (audited in lib/types.ts).
const catalog = catalogJson as MattressEntry[];

describe('categoryPages', () => {
  const counts = categoryCounts(catalog);

  it('counts come from real fields (UX architect audit)', () => {
    expect(counts.hybrid).toBe(23);
    expect(counts.foam).toBe(11);
    expect(counts['memory-foam']).toBe(18);
    expect(counts.latex).toBe(8);
    expect(counts.firm).toBe(10);
    // 3, not 4: Silk & Snow's $658.75 has no confirmed currency, so it is not a comparable USD price.
    expect(counts['under-1000']).toBe(3);
    expect(counts.best).toBe(catalog.length);
  });

  it('never defines categories the data cannot support', () => {
    const slugs = CATEGORY_PAGES.map((c) => c.slug);
    for (const banned of ['organic', 'extra-firm', 'innerspring', 'highest-rated']) expect(slugs).not.toContain(banned);
    for (const c of CATEGORY_PAGES) expect(counts[c.slug]).toBeGreaterThan(1);
  });

  it('labels counts and tags', () => {
    expect(countLabel('hybrid', 23)).toBe('23 hybrids');
    expect(countLabel(getCategoryPage('hybrid'), 1)).toBe('1 hybrid');
    expect(categoryTagsFor(null)).toEqual([]);
  });
});
