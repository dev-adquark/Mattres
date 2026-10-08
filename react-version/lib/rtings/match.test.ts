import { describe, expect, it } from 'vitest';
import { matchToCatalog } from './match';
import aliasesJson from './aliases.json';
import catalogJson from '@/lib/data/mattress-catalog.json';
import type { MattressEntry } from '@/lib/types';
import type { RtingsAlias } from './types';
import { REAL_IDS, TEST_CATALOG, realRecord, realRecords, syntheticRetitled } from './__fixtures__/records';
import { toNormalized } from './__fixtures__/normalized';

const NO_ALIASES: RtingsAlias[] = [];

describe('matchToCatalog: exact match', () => {
  it('matches by review URL listed in the catalog reviewSources (exact)', () => {
    const review = toNormalized(realRecord(REAL_IDS.bearEliteHybrid));
    expect(matchToCatalog(review, TEST_CATALOG, NO_ALIASES)).toEqual({
      kind: 'matched',
      mattressId: 'bear-elite-hybrid',
      method: 'review_url',
      confidence: 'exact',
    });
  });

  it('still matches by URL after RTINGS reformats the title and URL casing', () => {
    const review = toNormalized(syntheticRetitled(REAL_IDS.bearEliteHybrid));
    expect(matchToCatalog(review, TEST_CATALOG, NO_ALIASES)).toMatchObject({ kind: 'matched', mattressId: 'bear-elite-hybrid', confidence: 'exact' });
  });

  it('matches identical brand + model token sets with high confidence', () => {
    const review = toNormalized(realRecord(REAL_IDS.casperCoolingSelect));
    expect(matchToCatalog(review, TEST_CATALOG, NO_ALIASES)).toEqual({
      kind: 'matched',
      mattressId: 'casper-cooling-select',
      method: 'brand_model',
      confidence: 'high',
    });
  });

  it('review URL takes precedence over a brand+model match', () => {
    const review = toNormalized(realRecord(REAL_IDS.purpleRestorePlus));
    expect(matchToCatalog(review, TEST_CATALOG, NO_ALIASES)).toMatchObject({ mattressId: 'purple-restore-plus', method: 'review_url' });
  });
});

describe('matchToCatalog: alias match', () => {
  const review = toNormalized(realRecord(REAL_IDS.tuftMint));

  it('without an alias, "Tuft and Needle Mint" vs catalog "Mint Mattress II" is not auto-matched', () => {
    const result = matchToCatalog(review, TEST_CATALOG, NO_ALIASES);
    expect(result.kind).not.toBe('matched');
  });

  it('a curated alias (product id + URL) gives an exact match', () => {
    const alias: RtingsAlias = {
      rtingsProductId: REAL_IDS.tuftMint,
      reviewUrl: 'https://www.rtings.com/mattress/reviews/tuft-and-needle/mint-mattress',
      catalogId: 'tuft-and-needle-mint-ii',
      note: 'TEST-ONLY alias used by match.test.ts',
      addedAt: '2026-10-07T00:00:00.000Z',
    };
    expect(matchToCatalog(review, TEST_CATALOG, [alias])).toEqual({
      kind: 'matched',
      mattressId: 'tuft-and-needle-mint-ii',
      method: 'product_id_alias',
      confidence: 'exact',
    });
  });

  it('an alias pointing at an id missing from the catalog does not match', () => {
    const alias: RtingsAlias = {
      rtingsProductId: REAL_IDS.tuftMint,
      reviewUrl: 'https://www.rtings.com/mattress/reviews/tuft-and-needle/mint-mattress',
      catalogId: 'no-such-catalog-id',
      note: 'TEST-ONLY dangling alias',
      addedAt: '2026-10-07T00:00:00.000Z',
    };
    const result = matchToCatalog(review, TEST_CATALOG, [alias]);
    expect(result.kind === 'matched' && result.mattressId === 'no-such-catalog-id').toBe(false);
  });

  it('lib/rtings/aliases.json is a human-curated array of well-formed aliases', () => {
    expect(Array.isArray(aliasesJson)).toBe(true);
    for (const a of aliasesJson as RtingsAlias[]) {
      expect(a.reviewUrl).toMatch(/^https:\/\/www\.rtings\.com\/mattress\//);
      expect(a.catalogId.length).toBeGreaterThan(0);
      expect(a.note.length).toBeGreaterThan(0);
    }
  });
});

describe('matchToCatalog: duplicate and ambiguous', () => {
  it('a newer tier ("Midnight Luxe 2025") is ambiguous, never merged into "Midnight" or "Midnight Luxe"', () => {
    const review = toNormalized(realRecord(REAL_IDS.helixMidnightLuxe2025));
    const result = matchToCatalog(review, TEST_CATALOG, NO_ALIASES);
    expect(result.kind).toBe('ambiguous');
    if (result.kind === 'ambiguous') {
      expect(result.candidates.sort()).toEqual(['helix-midnight', 'helix-midnight-luxe']);
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });

  it('two catalog rows reducing to the same brand+model tokens (a duplicate) is ambiguous, not a pick', () => {
    const withDuplicate = [...TEST_CATALOG, { id: 'casper-cooling-select-duplicate', brand: 'Casper', model: 'The Cooling Select Mattress', reviewSources: [] }];
    const review = toNormalized(realRecord(REAL_IDS.casperCoolingSelect));
    const result = matchToCatalog(review, withDuplicate, NO_ALIASES);
    expect(result.kind).toBe('ambiguous');
    if (result.kind === 'ambiguous') expect(result.candidates.sort()).toEqual(['casper-cooling-select', 'casper-cooling-select-duplicate']);
  });

  it('a brand the catalog does not carry is a new_candidate', () => {
    const review = toNormalized(realRecord(REAL_IDS.allswellHybrid));
    expect(matchToCatalog(review, TEST_CATALOG, NO_ALIASES).kind).toBe('new_candidate');
  });
});

describe('matchToCatalog: real catalog + real sample', () => {
  const catalog = catalogJson as unknown as MattressEntry[];
  const results = new Map(realRecords().map((r) => [r.productId as string, matchToCatalog(toNormalized(r), catalog, aliasesJson as RtingsAlias[])]));

  it('matches every RTINGS URL that the catalog itself cites, exactly', () => {
    for (const entry of catalog) {
      for (const source of entry.reviewSources ?? []) {
        if (!source.sourceUrl.startsWith('https://www.rtings.com/')) continue;
        const raw = realRecords().find((r) => r.reviewUrl === source.sourceUrl);
        if (!raw) continue;
        expect(results.get(raw.productId as string)).toMatchObject({ kind: 'matched', mattressId: entry.id, confidence: 'exact' });
      }
    }
  });

  it('never matches Helix Midnight Luxe 2025 to helix-midnight', () => {
    const r = results.get(REAL_IDS.helixMidnightLuxe2025)!;
    expect(r.kind === 'matched' && r.mattressId === 'helix-midnight').toBe(false);
  });

  it('every match points at a real catalog id with exact/high confidence', () => {
    const ids = new Set(catalog.map((e) => e.id));
    for (const r of results.values()) {
      if (r.kind === 'matched') {
        expect(ids.has(r.mattressId)).toBe(true);
        expect(['exact', 'high']).toContain(r.confidence);
      }
    }
  });

  it('Allswell (not in the catalog) is a new_candidate', () => {
    expect(results.get(REAL_IDS.allswellHybrid)!.kind).toBe('new_candidate');
  });
});
