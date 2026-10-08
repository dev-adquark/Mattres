import { describe, it, expect } from 'vitest';
import catalogJson from '@/lib/data/mattress-catalog.json';
import { buildSearchIndex, searchIndex, slugify } from '@/lib/searchIndex';
import { tierFor, dimensionLabel } from '@/lib/scoreTiers';
import type { MattressEntry } from '@/lib/types';

const catalog = catalogJson as MattressEntry[];

describe('searchIndex', () => {
  const index = buildSearchIndex(catalog);

  it('indexes every catalog entry and every brand once', () => {
    expect(index.mattresses).toHaveLength(catalog.length);
    expect(index.brands).toHaveLength(new Set(catalog.map((e) => e.brand)).size);
  });

  it('links brand results to their /brands/{slug} page', () => {
    for (const b of index.brands) expect(b.href).toBe(`/brands/${slugify(b.title)}`);
  });

  it('finds a mattress by brand prefix', () => {
    const groups = searchIndex(index, 'casp');
    const mattresses = groups.find((g) => g.id === 'mattresses');
    expect(mattresses?.items.length).toBeGreaterThan(0);
    expect(mattresses?.items.every((i) => i.brand === 'Casper')).toBe(true);
  });

  it('requires every token to match', () => {
    expect(searchIndex(index, 'casper zzzzqq')).toEqual([]);
  });

  it('returns guides and comparisons for topical queries', () => {
    const ids = searchIndex(index, 'side').map((g) => g.id);
    expect(ids).toContain('guides');
    expect(ids).toContain('comparisons');
  });

  it('slugifies brand names', () => {
    expect(slugify('Brooklyn Bedding')).toBe('brooklyn-bedding');
  });
});

describe('scoreTiers', () => {
  it('maps scores to tiers at the agreed thresholds', () => {
    expect(tierFor(90).label).toBe('Excellent match');
    expect(tierFor(89).label).toBe('Strong match');
    expect(tierFor(70).label).toBe('Good match');
    expect(tierFor(60).label).toBe('Fair match');
    expect(tierFor(59).label).toBe('Weak match');
  });
  it('labels dimensions', () => {
    expect(dimensionLabel(9)).toBe('Excellent');
    expect(dimensionLabel(5.5)).toBe('Moderate');
    expect(dimensionLabel(5.4)).toBe('Weak');
  });
});

describe('searchIndex v2 (categories, tags, chips)', () => {
  const index = buildSearchIndex(catalog, { pairs: [{ slug: 'casper-dream-vs-casper-snow', title: 'Casper Dream vs Casper Snow' }] });

  it('builds a categories group with live counts and no empty categories', () => {
    expect(index.categories.length).toBeGreaterThan(5);
    for (const c of index.categories) {
      expect(c.count).toBeGreaterThan(0);
      expect(c.href).toBe(`/mattresses/${c.id}`);
    }
  });

  it('"cool" ranks the cooling category first and surfaces highly rated mattresses', () => {
    const groups = searchIndex(index, 'cool');
    expect(groups[0]?.id).toBe('categories');
    expect(groups[0]?.items[0]?.id).toBe('cooling');
    const mattresses = groups.find((g) => g.id === 'mattresses')?.items ?? [];
    expect(mattresses.length).toBeGreaterThan(3);
    // Name matches (e.g. "Cooling Select") are legitimate; tag matches need a real rating.
    const ratings = mattresses.filter((m) => !/cool/i.test(m.title)).map((m) => catalog.find((e) => e.id === m.id)?.coolingRatingOutOf10);
    expect(ratings.every((r) => typeof r === 'number' && r >= 7)).toBe(true);
    expect(ratings.filter((r) => typeof r === 'number' && r >= 8).length).toBeGreaterThanOrEqual(3);
  });

  it('only tags cooling when an independent rating >= 7 is on file', () => {
    for (const m of index.mattresses) {
      const e = catalog.find((x) => x.id === m.id);
      expect(m.tags?.includes('cooling')).toBe(typeof e?.coolingRatingOutOf10 === 'number' && e.coolingRatingOutOf10 >= 7);
    }
  });

  it('restricts results to one group when a chip is active', () => {
    const groups = searchIndex(index, 'side', undefined, { group: 'guides' });
    expect(groups.map((g) => g.id)).toEqual(['guides']);
  });

  it('includes curated pairs in comparisons', () => {
    const groups = searchIndex(index, 'dream vs snow');
    const cmp = groups.find((g) => g.id === 'comparisons');
    expect(cmp?.items[0]?.href).toBe('/compare/casper-dream-vs-casper-snow');
  });
  it('an exact or prefix brand name leads, so Enter opens the brand page', () => {
    for (const q of ['purple', 'Saatva', 'purp']) {
      const groups = searchIndex(index, q);
      expect(groups[0]?.id, q).toBe('brands');
      expect(groups[0]?.items[0]?.href, q).toMatch(/^\/brands\//);
      // Models of that brand still follow.
      expect(groups.some((g) => g.id === 'mattresses'), q).toBe(true);
    }
  });

  it('a model query still leads with mattresses', () => {
    const groups = searchIndex(index, 'helix midnight');
    expect(groups.find((g) => g.items.length)?.id).toBe('mattresses');
  });
});
