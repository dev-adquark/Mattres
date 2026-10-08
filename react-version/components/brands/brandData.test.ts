import { describe, expect, it } from 'vitest';
import rawCatalog from '@/lib/data/mattress-catalog.json';
import { groupByBrand } from '@/components/product/productData';
import type { MattressEntry } from '@/lib/types';
import { COMPARE_PAIRS } from '@/lib/compareTopics';
import { entriesForCategory } from '@/lib/categories';
import { getReferenceScores } from '@/components/product/referenceScores';
import {
  lineupFacts,
  brandSentence,
  buyLeadCopy,
  commerceSummary,
  brandVerdicts,
  categoriesForBrand,
  compareHref,
  dominantType,
  median,
  nearestPairs,
  ordinal,
  pairsForBrand,
  ratingStandings,
  referenceStandings,
  rivalsFor,
  typeMix,
} from './brandData';
import type { BrandGroup } from './brandData';

// The JSON import is typed by inference; lib/types MattressEntry is the audited shape of every record.
const catalog = rawCatalog as unknown as MattressEntry[];
const groups: BrandGroup[] = groupByBrand(catalog);
const byName = (n: string): BrandGroup => {
  const g = groups.find((x) => x.name === n);
  if (!g) throw new Error(`brand ${n} missing from catalog`);
  return g;
};

describe('brandData', () => {
  it('median handles odd, even and empty lists', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it('ordinal', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']);
  });

  it('brand sentence uses only published facts and never invents a price', () => {
    for (const g of groups) {
      const facts = lineupFacts(g.entries);
      const s = brandSentence(g.name, facts);
      expect(s).toContain(g.name);
      if (!facts.pricedCount) expect(s).not.toMatch(/\$/);
    }
  });

  it('type mix covers the whole lineup', () => {
    for (const g of groups) {
      const mix = typeMix(lineupFacts(g.entries));
      expect(mix.reduce((s, m) => s + m.count, 0)).toBe(g.entries.length);
      expect(g.entries.some((e) => e.type === dominantType(g.entries))).toBe(true);
    }
  });

  it('rating standings report unrated instead of guessing', () => {
    const saatva = byName('Saatva');
    expect(saatva).toBeTruthy();
    expect(ratingStandings(saatva.entries, catalog).every((r) => r.verdict === 'unrated')).toBe(true);
    const { strengths, weaknesses, gaps } = brandVerdicts('Saatva', saatva.entries, catalog, {});
    expect(strengths.filter((s) => s.id.startsWith('rating-'))).toHaveLength(0);
    expect(weaknesses.filter((s) => s.id.startsWith('rating-'))).toHaveLength(0);
    expect(gaps.join(' ')).toMatch(/No independent ratings/);
  });

  it('reference standings take the rank from the ranked set, never from raw scores', () => {
    const ids = catalog.map((e) => e.id);
    // The top scorer is unranked (too little data); the second is ranked 1st of 2.
    const side = Object.fromEntries(ids.map((id, i) => [id, { score: i === 0 ? 95 : i === 1 ? 90 : 50, rank: i === 1 ? 1 : i === 2 ? 2 : null, total: 2 }]));
    const first = catalog[0];
    const second = catalog[1];
    if (!first || !second) throw new Error('empty catalog');
    const [s] = referenceStandings([first, second], { side });
    if (!s) throw new Error('no standing');
    expect(s.score).toBe(95);
    expect(s.entry.id).toBe(first.id);
    expect(s.ranked?.entry.id).toBe(second.id);
    expect(s.ranked?.rank).toBe(1);
    expect(s.total).toBe(2);
    const [u] = referenceStandings([first], { side });
    expect(u?.ranked).toBeNull();
    const v = brandVerdicts('X', [first, second], catalog, { side });
    for (const item of [...v.strengths, ...v.weaknesses]) expect(item.basis).toBeTruthy();
    expect(v.strengths.find((x) => x.id === 'ref-side')?.detail).toMatch(/1st of 2 ranked\.$/);
  });

  it('brand strengths quote the same rank and total as the product and category pages', async () => {
    const { byPosition } = await getReferenceScores();
    for (const g of groups) {
      for (const s of referenceStandings(g.entries, byPosition)) {
        const pos = byPosition[s.position as keyof typeof byPosition];
        if (!pos) throw new Error('missing position');
        const ranked = Object.values(pos).filter((r) => r.rank !== null).length;
        expect(s.total).toBe(ranked);
        expect(s.total).toBeLessThan(catalog.length);
        if (s.ranked) expect(s.ranked.rank).toBe(pos[s.ranked.entry.id]?.rank);
      }
      const v = brandVerdicts(g.name, g.entries, catalog, byPosition);
      for (const item of v.strengths.filter((x) => x.id.startsWith('ref-'))) expect(item.detail).toMatch(/of \d+ ranked\.$/);
      for (const item of [...v.strengths, ...v.weaknesses]) expect(item.detail).not.toMatch(/in the catalog/);
    }
  });

  it('categoriesForBrand lists exactly the category pages that hold a brand model', () => {
    for (const g of groups) {
      const links = categoriesForBrand(g.entries, catalog);
      expect(links.some((l) => l.slug === 'best')).toBe(false);
      for (const l of links) {
        const members = entriesForCategory(l.slug, catalog);
        expect(l.href).toBe(`/mattresses/${l.slug}`);
        expect(l.of).toBe(members.length);
        expect(l.count).toBe(members.filter((e) => e.brand === g.name).length);
        expect(l.count).toBeGreaterThan(0);
      }
    }
    expect(categoriesForBrand(byName('Bear').entries, catalog).length).toBeGreaterThan(0);
  });

  it('nearestPairs links a curated pair of the closest rival for brands without their own', () => {
    for (const g of groups) {
      const lead = g.entries[0];
      const near = nearestPairs(lead, catalog, COMPARE_PAIRS, 1);
      expect(near.length).toBeLessThanOrEqual(1);
      for (const p of near) {
        expect(COMPARE_PAIRS.some((c) => c.slug === p.slug && (c.a === p.rival.id || c.b === p.rival.id))).toBe(true);
        expect(p.rival.brand).not.toBe(g.name);
        expect(rivalsFor(lead, catalog, catalog.length).some((r) => r.id === p.rival.id)).toBe(true);
      }
    }
    expect(nearestPairs(null, catalog, COMPARE_PAIRS)).toEqual([]);
    expect(nearestPairs(byName('Bear').entries[0], catalog, [])).toEqual([]);
  });

  it('pairsForBrand tolerates empty and malformed pair lists', () => {
    const g = byName('Casper');
    expect(pairsForBrand(g.entries, [])).toEqual([]);
    expect(pairsForBrand(g.entries, undefined)).toEqual([]);
    const id = g.entries[0]?.id;
    expect(pairsForBrand(g.entries, [{ slug: 'x-vs-y', title: 'X vs Y', a: id, b: 'other' }, null, { slug: 'n', a: 'q', b: 'r' }])).toEqual([
      { slug: 'x-vs-y', title: 'X vs Y', href: '/compare/x-vs-y' },
    ]);
  });

  it('compareHref matches the compare store format', () => {
    expect(compareHref(['a b', 'c'])).toBe('/compare?ids=a%20b,c');
  });

  describe('buyLeadCopy', () => {
    const cta = (kind: 'affiliate' | 'retailer' | 'brand' | 'unavailable', retailerName: string | null = null) =>
      ({ entry: {} as MattressEntry, cta: { kind, retailerName, host: null, href: null, label: '', rel: null, disclosure: null, event: null } }) as never;
    const summary = (items: ReturnType<typeof cta>[]) => {
      const list = items as unknown as { cta: { kind: string } }[];
      const n = (k: string) => list.filter((c) => c.cta.kind === k).length;
      return { ctas: items, affiliate: n('affiliate'), retailer: n('retailer'), brand: n('brand'), unavailable: n('unavailable') } as Parameters<typeof buyLeadCopy>[1];
    };

    it('names the retailer for Novaform (catalog: Costco listing, no brand page)', () => {
      const copy = buyLeadCopy('Novaform', commerceSummary(byName('Novaform').entries));
      expect(copy).toContain('Costco');
      expect(copy).not.toMatch(/own page/);
    });
    it('only claims own pages when every link is a brand link', () => {
      expect(buyLeadCopy('X', summary([cta('brand', 'X'), cta('brand', 'X')]))).toContain('these links go to X’s own pages.');
    });
    it('describes mixed brand and retailer links', () => {
      expect(buyLeadCopy('X', summary([cta('brand', 'X'), cta('retailer', 'Costco'), cta('retailer', 'Target')]))).toContain(
        'X’s own page or listings at Costco and Target',
      );
    });
    it('does not mention links when none exist', () => {
      const copy = buyLeadCopy('X', summary([cta('unavailable'), cta('unavailable')]));
      expect(copy).toContain('no retailer or brand links are on file yet');
      expect(copy).not.toMatch(/go(es)? to/);
    });
    it('counts affiliate links against linked models only and notes missing ones', () => {
      expect(buyLeadCopy('X', summary([cta('affiliate', 'Shop'), cta('brand', 'X'), cta('unavailable')]))).toBe(
        '1 of 2 links is an affiliate link and is labeled. It never changes a score. 1 model has no retailer or brand link on file yet.',
      );
    });
  });
});
