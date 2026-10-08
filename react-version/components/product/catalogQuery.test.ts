import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { slugify } from '@/lib/searchIndex';
import {
  parseState,
  serializeState,
  passes,
  facetCounts,
  sortIntoGroups,
  inFirmnessBand,
  effectiveSort,
  limitingFilters,
  SORTS,
  EMPTY_STATE,
  queryCategory,
  headlineScore,
  bestFitFor,
  positionScoresFor,
} from './catalogQuery';
import type { CatalogState } from './catalogQuery';
import { comparableQueenPriceUsd } from '@/lib/commerce';
import { lineupFacts, groupByBrand, positioningFor, materialsList } from './productData';
import type { MattressEntry } from '@/lib/types';

const CATALOG: MattressEntry[] = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'lib', 'data', 'mattress-catalog.json'), 'utf8'));
const slugOf = (b: string): string => slugify(b);
const state = (over: Partial<CatalogState>): CatalogState => ({ ...EMPTY_STATE, ...over });

describe('URL state', () => {
  it('round-trips and omits defaults', () => {
    const s = state({ q: 'casper', types: ['hybrid', 'foam'], price: '1000-2000', rated: ['cooling', 'durability'], fit: ['side'], material: ['latex'], sort: 'price-desc' });
    expect(parseState(Object.fromEntries(new URLSearchParams(serializeState(s))))).toEqual(s);
    expect(serializeState(EMPTY_STATE)).toBe('');
  });

  it('drops unknown values and maps legacy params', () => {
    expect(parseState({ type: 'memory-foam,waterbed', sort: 'price-asc', price: 'free', rated: 'vibes' })).toEqual(
      state({ types: ['foam'], sort: 'price-asc' })
    );
    expect(parseState({ brand: 'casper,nope' }, { brandSlugs: ['casper'] }).brands).toEqual(['casper']);
  });
});

describe('filters', () => {
  it('search matches brand, model, type and firmness words', () => {
    const ids = (q: string) => CATALOG.filter((e) => passes(e, state({ q }), slugOf)).map((e) => e.id);
    expect(ids('casper')).toHaveLength(CATALOG.filter((e) => e.brand === 'Casper').length);
    expect(ids('purple hybrid').every((id) => id.startsWith('purple'))).toBe(true);
    expect(ids('latex').length).toBeGreaterThan(0);
    expect(ids('zzzz-not-a-mattress')).toEqual([]);
  });

  it('a multi-firmness model matches every band its range touches; unknown firmness matches none', () => {
    const range = { firmnessRange: { min: 3, max: 8 } };
    expect(inFirmnessBand(range, 'medium-soft')).toBe(true);
    expect(inFirmnessBand(range, 'firm')).toBe(true);
    expect(inFirmnessBand(range, 'extra-firm')).toBe(false);
    expect(inFirmnessBand({ firmnessRange: null }, 'medium')).toBe(false);
  });

  it('price buckets never include a mattress without a published Queen price', () => {
    for (const price of ['under-1000', '1000-2000', '2000-3000', '3000-plus'] as const) {
      for (const e of CATALOG.filter((x) => passes(x, state({ price }), slugOf))) expect(typeof e.priceUsd).toBe('number');
    }
  });

  it('"rated 7+" only includes entries that have that third-party rating', () => {
    const hits = CATALOG.filter((e) => passes(e, state({ rated: ['cooling'] }), slugOf));
    expect(hits.length).toBeGreaterThan(0);
    for (const e of hits) expect(e.coolingRatingOutOf10).toBeGreaterThanOrEqual(7);
  });

  it('facet counts reflect the other active filters', () => {
    const counts = facetCounts(CATALOG, state({ types: ['latex'] }), slugOf);
    expect(counts.types.hybrid).toBe(CATALOG.filter((e) => e.type === 'hybrid').length);
    const latexBrands = Object.entries(counts.brands).filter(([, n]) => n > 0).map(([slug]) => slug);
    expect(latexBrands.sort()).toEqual([...new Set(CATALOG.filter((e) => e.type === 'latex').map((e) => slugOf(e.brand)))].sort());
  });
});

describe('sorting', () => {
  const scoresFor = async () => (await import('@/components/catalog/referenceRankings')).getCatalogReference();

  it('price: priced in order (both directions), unpriced in their own labelled group', () => {
    for (const sort of ['price-asc', 'price-desc']) {
      const [priced, unpriced] = sortIntoGroups(CATALOG, sort).groups;
      const prices = (priced?.items ?? []).map((i) => i.entry.priceUsd ?? NaN);
      const dir = sort === 'price-asc' ? 1 : -1;
      expect(prices).toEqual([...prices].sort((a, b) => dir * (a - b)));
      expect(unpriced?.id).toBe('unpriced');
      // Unpriced = no comparable Queen price (missing, provisional or currency-unconfirmed).
      expect(unpriced?.items.every((i) => comparableQueenPriceUsd(i.entry) === null)).toBe(true);
    }
  });

  it('rating sorts (incl. durability) put unrated entries last, never interleaved', () => {
    const cases = [
      ['edge', 'edgeSupportRatingOutOf10'],
      ['durability', 'durabilityRatingOutOf10'],
    ] as const;
    for (const [sort, field] of cases) {
      const { groups } = sortIntoGroups(CATALOG, sort);
      expect(groups[0]?.items.every((i) => typeof i.entry[field] === 'number')).toBe(true);
      expect(groups[0]?.items[0]?.annotation).toMatch(/Independent/);
      expect(groups.at(-1)?.items.every((i) => i.entry[field] == null)).toBe(true);
    }
  });

  it('there is no "highest rated" sort: the catalog has no overall rating field', () => {
    expect(SORTS.map((s) => s.id)).not.toContain('rated');
    expect(SORTS.some((s) => /^highest rated$/i.test(s.label))).toBe(false);
  });

  it('reference sorts fall back to A–Z when their data is missing; legacy params map', () => {
    expect(effectiveSort('side', { reference: null })).toBe('az');
    expect(sortIntoGroups(CATALOG, 'recommended').sort).toBe('az');
    expect(parseState({ sort: 'price' }).sort).toBe('price-asc');
    expect(parseState({ sort: 'match' }).sort).toBe('recommended');
  });

  it('recommended uses the visitor\'s own scores when present and separates entries their quiz filtered out', () => {
    const [a, b, c] = CATALOG;
    if (!a || !b || !c) throw new Error('catalog fixture needs three entries');
    const { groups, basis } = sortIntoGroups([a, b, c], 'recommended', { matchScores: { [a.id]: 70, [b.id]: 90 } });
    expect(basis).toBe('match');
    expect(groups[0]?.items.map((i) => i.entry.id)).toEqual([b.id, a.id]);
    expect(groups[1]?.items.map((i) => i.entry.id)).toEqual([c.id]);
  });

  it('reference sorts only rank entries with enough measured dimensions', async () => {
    const reference = await scoresFor();
    for (const sort of ['recommended', 'side', 'back', 'stomach', 'pressure', 'couples']) {
      const { groups, basis } = sortIntoGroups(CATALOG, sort, { reference });
      expect(basis).toBe('reference');
      for (const item of groups[0]?.items ?? []) expect(reference.measured[item.entry.id]).toBeGreaterThanOrEqual(3);
      if (groups[1]) expect(groups[1].title).toBe('Not enough data to rank');
    }
    const side = sortIntoGroups(CATALOG, 'side', { reference });
    expect(side.groups[0]?.items[0]?.entry.id).toBe('purple-restore');
    expect(sortIntoGroups(CATALOG, 'pressure', { reference }).groups[0]?.items[0]?.annotation).toMatch(/^Pressure-relief sub-score for a reference side sleeper: \d/);
  });

  it('sleep-position fit and material filters read engine scores and construction notes', async () => {
    const reference = await scoresFor();
    const ctx = { reference };
    const side = CATALOG.filter((e) => passes(e, state({ fit: ['side'] }), slugOf, null, ctx));
    expect(side.length).toBe(Object.values(reference.side).filter((s) => s >= 80).length);
    const latex = CATALOG.filter((e) => passes(e, state({ material: ['latex'] }), slugOf));
    expect(latex.every((e) => /latex/i.test(e.coreMaterialNotes))).toBe(true);
    const none = state({ types: ['innerspring'], material: ['latex'] });
    const limits = limitingFilters(CATALOG, none, slugOf, ctx);
    expect(CATALOG.filter((e) => passes(e, none, slugOf, null, ctx))).toHaveLength(0);
    expect(limits[0]?.results).toBeGreaterThan(0);
  });
});

describe('productData', () => {
  it('lineup facts use only published prices', () => {
    const casper: { slug: string; entries: MattressEntry[] } | undefined = groupByBrand(CATALOG).find((g: { slug: string }) => g.slug === 'casper');
    if (!casper) throw new Error('catalog fixture has no Casper entries');
    const facts = lineupFacts(casper.entries);
    const priced = casper.entries.map((e) => e.priceUsd).filter((p): p is number => typeof p === 'number');
    expect(facts.pricedCount).toBe(priced.length);
    expect(facts.priceMin).toBe(Math.min(...priced));
  });

  it('positioning lines and material lists are built from the entry itself', () => {
    for (const e of CATALOG) {
      expect(positioningFor(e)).toContain(e.brand);
      expect(materialsList(e).join('; ')).toBe((e.coreMaterialNotes || '').split(';').map((s) => s.trim()).filter(Boolean).join('; '));
    }
  });
});

describe('text search answers category words', () => {
  const coolingIds = CATALOG.filter((e) => typeof e.coolingRatingOutOf10 === 'number' && e.coolingRatingOutOf10 >= 7).map((e) => e.id);
  const ids = (q: string) => CATALOG.filter((e) => passes(e, state({ q }), slugOf)).map((e) => e.id);

  it('"cool" and "cooling" include every mattress in the Cooling category', () => {
    for (const q of ['cool', 'cooling', 'cooling mattress']) {
      const hits = ids(q);
      for (const id of coolingIds) expect(hits).toContain(id);
    }
  });

  it('position words use the engine fit rule when reference scores exist, and stop words are ignored', () => {
    const side: Record<string, number> = Object.fromEntries(CATALOG.map((e, i) => [e.id, i % 2 ? 90 : 50]));
    const reference = { modelVersion: null, mean: {}, side, back: {}, stomach: {}, couples: {}, pressure: {}, measured: {} };
    const hits = CATALOG.filter((e) => passes(e, state({ q: 'side sleeper' }), slugOf, null, { reference })).map((e) => e.id);
    expect(hits).toEqual(CATALOG.filter((e) => (side[e.id] ?? 0) >= 80).map((e) => e.id));
    expect(ids('side sleeper')).toEqual([]);
  });

  it('names the category page a query refers to', () => {
    expect(queryCategory('cooling')?.category.slug).toBe('cooling');
    expect(queryCategory('best mattress for side sleepers')).toMatchObject({ position: 'side' });
    expect(queryCategory('casper')).toBeNull();
  });
});

describe('headlineScore', () => {
  const reference = {
    modelVersion: null,
    mean: { a: 76.5, b: 90 },
    side: { a: 81, b: 70 },
    back: {},
    stomach: {},
    couples: {},
    pressure: {},
    measured: { a: 4, b: 1 },
  };

  it('leads with the sort’s own reference score, and the mean otherwise', () => {
    expect(headlineScore({ id: 'a' }, 'side', { reference })).toEqual({ value: 81, basis: 'reference', caption: 'Reference side sleeper', decimals: 0 });
    expect(headlineScore({ id: 'a' }, 'az', { reference })).toEqual({ value: 76.5, basis: 'reference', caption: 'Avg. reference sleeper', decimals: 1 });
  });

  it('never shows a number for an entry the integrity rule leaves unranked', () => {
    expect(headlineScore({ id: 'b' }, 'recommended', { reference })?.value).toBeNull();
  });

  it('prefers the visitor’s own score except under a position sort', () => {
    const ctx = { reference, matchScores: { a: 88 } };
    expect(headlineScore({ id: 'a' }, 'recommended', ctx)).toEqual({ value: 88, basis: 'match', caption: 'Your Match Score', decimals: 0 });
    expect(headlineScore({ id: 'b' }, 'price-asc', ctx)).toEqual({ value: null, basis: 'match', caption: 'Not in your quiz results', decimals: 0 });
    expect(headlineScore({ id: 'a' }, 'side', ctx)?.basis).toBe('reference');
  });

  it('is absent without engine scores', () => {
    expect(headlineScore({ id: 'a' }, 'recommended', {})).toBeNull();
    expect(sortIntoGroups(CATALOG, 'az', {}).groups[0]?.items[0]?.headline).toBeNull();
  });
});

describe('bestFitFor', () => {
  const reference = {
    modelVersion: null,
    mean: {},
    side: { a: 70, b: 80 },
    back: { a: 81, b: 80 },
    stomach: { a: 60 },
    combination: { a: 75 },
    couples: {},
    pressure: {},
    measured: { a: 4, b: 1 },
  };
  it('picks the highest engine reference score; ties keep side-first order', () => {
    expect(bestFitFor('a', reference)).toEqual({ position: 'back', label: 'back sleepers', score: 81, estimated: false });
    expect(bestFitFor('b', reference)).toEqual({ position: 'side', label: 'side sleepers', score: 80, estimated: true });
  });
  it('returns null without engine output', () => {
    expect(bestFitFor('zzz', reference)).toBeNull();
    expect(bestFitFor('a', null)).toBeNull();
  });
  it('lists every scored position in a fixed order for the card reveal', () => {
    expect(positionScoresFor('a', reference)).toEqual([
      { position: 'side', short: 'Side', score: 70 },
      { position: 'back', short: 'Back', score: 81 },
      { position: 'stomach', short: 'Stomach', score: 60 },
      { position: 'combination', short: 'Combo', score: 75 },
    ]);
    expect(positionScoresFor('b', reference)?.map((p) => p.position)).toEqual(['side', 'back']);
    expect(positionScoresFor('zzz', reference)).toBeNull();
    expect(positionScoresFor('a', null)).toBeNull();
  });
});
