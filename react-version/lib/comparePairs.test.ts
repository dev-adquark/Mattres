import { describe, expect, it } from 'vitest';
import catalogJson from '@/lib/data/mattress-catalog.json';
import { validateProfile } from '@/lib/profileValidation';
import { getGuide } from '@/lib/content/guides';
import { firmnessFor } from '@/lib/firmness';
import { COMPARE_TOPIC_SLUGS, COMPARE_PAIRS as REEXPORTED } from '@/lib/compareTopics';
import {
  COMPARE_PAIRS,
  MIN_MEASURED_DIMENSIONS,
  MIN_SUBSCORE_DELTA,
  getPair,
  getReversedPair,
  lineupIdsForBrand,
  measuredCount,
  pairSlug,
  pairsFor,
  pairsForBrand,
  spotlightProfile,
} from '@/lib/comparePairs';
import { columnName } from '@/components/compare-page/compareModel';
import { buildPairData, chooseLists, constructionText, firmnessSourceLabel, largestGap, positionTally, specRows } from '@/components/compare-page/pairModel';
import { getReferenceScores } from '@/components/product/referenceScores';
import type { MattressEntry, PairClaims } from '@/lib/types';

const catalog = catalogJson as MattressEntry[];
const byId = new Map(catalog.map((e) => [e.id, e]));

/** Looks a catalog id up; the registry test above fails first if one is missing. */
function entryFor(id: string): MattressEntry {
  return byId.get(id) as MattressEntry;
}

describe('head-to-head registry gate', () => {
  it('is curated, small, unique, and does not collide with profile topics', () => {
    expect(COMPARE_PAIRS.length).toBeGreaterThan(0);
    expect(COMPARE_PAIRS.length).toBeLessThanOrEqual(12);
    const slugs = COMPARE_PAIRS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of COMPARE_PAIRS) {
      expect(COMPARE_TOPIC_SLUGS).not.toContain(p.slug);
      expect(slugs).not.toContain(pairSlug(p.b, p.a));
      expect(p.a).not.toBe(p.b);
    }
    expect(REEXPORTED).toBe(COMPARE_PAIRS);
  });

  for (const pair of COMPARE_PAIRS) {
    describe(pair.slug, () => {
      const a = entryFor(pair.a);
      const b = entryFor(pair.b);

      it('both mattresses exist, the title uses their real names, and each has enough independent ratings', () => {
        expect(byId.get(pair.a), pair.a).toBeTruthy();
        expect(byId.get(pair.b), pair.b).toBeTruthy();
        expect(pair.title).toBe(`${columnName(a)} vs ${columnName(b)}`);
        expect(measuredCount(a)).toBeGreaterThanOrEqual(MIN_MEASURED_DIMENSIONS);
        expect(measuredCount(b)).toBeGreaterThanOrEqual(MIN_MEASURED_DIMENSIONS);
        for (const g of pair.guides) expect(getGuide(g), g).toBeTruthy();
        // The quiz validator requires a firmness answer; demo sleepers state none (like the
        // product pages' reference sleeper) unless the spotlight sets one. Every other field must be valid.
        if (pair.spotlight) expect(validateProfile({ preferredFirmnessLabel: 'medium', ...spotlightProfile(pair) })).toBeNull();
      });

      it('the facts in its angle hold for the catalog', () => {
        const c: PairClaims = pair.claims;
        const fa = firmnessFor(a);
        const fb = firmnessFor(b);
        if (c.sameBrand) expect(a.brand).toBe(b.brand);
        if (c.sameType) {
          expect(a.type).toBe(c.sameType);
          expect(b.type).toBe(c.sameType);
        }
        if (c.types) expect([a.type, b.type]).toEqual(c.types);
        if (c.sameFirmness) expect(fa?.rating).toBe(fb?.rating);
        if (c.aFirmer) expect(fa?.rating).toBeGreaterThan(fb?.rating as number);
        if (c.bTaller) expect(b.heightIn).toBeGreaterThan(a.heightIn as number);
        if (c.aCheaper) expect(a.priceUsd).toBeLessThan(b.priceUsd as number);
        if (c.bPricier) expect(b.priceUsd).toBeGreaterThan(a.priceUsd as number);
        if (c.bothUnder) {
          expect(a.priceUsd).toBeLessThan(c.bothUnder);
          expect(b.priceUsd).toBeLessThan(c.bothUnder);
        }
      });

      it(`at least one engine sub-score differs by ${MIN_SUBSCORE_DELTA} or more for some reference sleeper`, async () => {
        const built = await buildPairData(pair);
        expect(built).toBeTruthy();
        const data = built as NonNullable<typeof built>;
        const gap = largestGap(data.rows.filter((r) => r.kind === 'reference'));
        expect(gap?.delta).toBeGreaterThanOrEqual(MIN_SUBSCORE_DELTA - 1e-9);
        const choose = chooseLists(data.rows, data.entries);
        expect(choose.a.length + choose.b.length).toBeGreaterThan(0);
        const tally = positionTally(data.rows);
        expect(tally.a + tally.b + tally.tie).toBe(4);
      });
    });
  }
});

describe('one reference sleeper across the site', () => {
  it('pair pages score the four positions exactly like the product pages', async () => {
    const reference = await getReferenceScores();
    for (const pair of COMPARE_PAIRS) {
      const data = await buildPairData(pair);
      expect(data).toBeTruthy();
      for (const row of (data as NonNullable<typeof data>).rows.filter((r) => r.kind === 'reference')) {
        const byId = reference.byPosition[row.id as keyof typeof reference.byPosition] || {};
        expect(row.a.score).toBe(byId[pair.a]?.score);
        expect(row.b.score).toBe(byId[pair.b]?.score);
        expect(row.a.rank).toBe(byId[pair.a]?.rank);
      }
    }
  });
});

describe('head-to-head helpers', () => {
  it('resolves canonical and reversed slugs', () => {
    const p = COMPARE_PAIRS[0] as (typeof COMPARE_PAIRS)[number];
    expect(getPair(p.slug)).toBe(p);
    expect(getPair(pairSlug(p.b, p.a))).toBeNull();
    expect(getReversedPair(pairSlug(p.b, p.a))).toBe(p);
    expect(getReversedPair(p.slug)).toBeNull();
  });

  it('finds pairs per mattress and per brand, and a lineup by measured data only', () => {
    expect(pairsFor('casper-dream').length).toBeGreaterThanOrEqual(2);
    expect(pairsForBrand(catalog, 'Casper').every((p) => entryFor(p.a).brand === 'Casper' && entryFor(p.b).brand === 'Casper')).toBe(true);
    const ids = lineupIdsForBrand(catalog, 'Purple');
    expect(ids.length).toBeLessThanOrEqual(3);
    for (const id of ids) expect(entryFor(id).brand).toBe('Purple');
    expect(lineupIdsForBrand(catalog, 'No Such Brand')).toEqual([]);
  });

  it('never shows raw source codes or research notes', () => {
    expect(firmnessSourceLabel('label_mapped_range')).not.toMatch(/_/);
    expect(firmnessSourceLabel(undefined)).toBe('Source not yet verified');
    const notes = constructionText({ coreMaterialNotes: 'TEMPUR-Material. No layer-by-layer foam breakdown stated on this page.' });
    expect(notes).not.toMatch(/this page/);
    // Fixtures: only the fields the price row reads.
    const rows = specRows(
      { id: 'x', priceUsd: null, type: 'foam' } as unknown as MattressEntry,
      { id: 'y', priceUsd: 999, priceUpdatedAt: '2026-09-25', type: 'hybrid' } as unknown as MattressEntry
    );
    const price = rows.find((r) => r.id === 'price');
    expect(price?.a.missing).toBe('No published price');
    expect(price?.b.text).toBe('$999');
  });
});
