import { describe, it, expect, vi } from 'vitest';
import {
  displayTitle,
  adaptCatalogEntryForScoring,
  filterCatalog,
  badgeFor,
  buildWhyThisMatch,
  matchProfile,
  pickBestValueId,
  adaptCatalogEntryForScoringV2,
} from './matchLogic';

// getCatalog() is mocked everywhere in this file so these tests are
// deterministic and never touch the real database or the git-committed
// JSON fallback - matchProfile()'s own filter/score/badge/verification
// logic is what's under test, not lib/db/mattressRepo.ts.
vi.mock('@/lib/db/mattressRepo', () => ({ getCatalog: vi.fn() }));
import { getCatalog } from '@/lib/db/mattressRepo';
import type { CatalogSource } from '@/lib/db/mattressRepo';
import type { CatalogAudit } from '@/lib/dataIntegrity';
import type { MatchProfileInput } from './matchLogic';
import type { MattressEntry } from '@/lib/types';

const mockedGetCatalog = vi.mocked(getCatalog);

/** Serves one getCatalog() call with these entries. */
function catalogOnce({ entries, source }: { entries: MattressEntry[]; source: CatalogSource }) {
  mockedGetCatalog.mockResolvedValueOnce({ entries, source, error: null });
}

const BASE_PROFILE: MatchProfileInput = {
  sleepPosition: 'side',
  weightLb: 160,
  preferredFirmnessLabel: 'medium',
  sleepTemperature: 'neutral',
  motionSensitivity: 'single',
  painFocus: [],
  mattressTypePreference: [],
};

/** A test fixture: the fields matchProfile reads, with per-test overrides. */
function entry(overrides: Record<string, unknown> = {}): MattressEntry {
  return {
    id: 'test-entry',
    brand: 'TestBrand',
    model: 'Model One',
    type: 'foam',
    firmnessRange: { min: 5.5, max: 5.5 },
    coreMaterialNotes: null,
    priceUsd: 1000,
    trialDays: 100,
    warrantyYears: 10,
    warrantyLifetime: false,
    heightIn: 11,
    sourceUrl: 'https://example.com/product',
    lastVerified: '2026-01-01',
    reviewSources: [],
    sponsored: false,
    ...overrides,
  } as unknown as MattressEntry;
}

describe('displayTitle', () => {
  it('does not repeat the brand when the model already starts with it', () => {
    expect(displayTitle({ brand: 'Casper', model: 'Casper Snow' })).toBe('Casper Snow');
  });
  it('prefixes the brand when the model does not already include it', () => {
    expect(displayTitle({ brand: 'Bear', model: 'Elite Hybrid' })).toBe('Bear Elite Hybrid');
  });
});

describe('adaptCatalogEntryForScoring', () => {
  it('averages a real numeric firmnessRange and reports its real provenance', () => {
    const { scoringInput, dataProvenance } = adaptCatalogEntryForScoring(
      entry({ firmnessRange: { min: 4, max: 8 }, firmnessSource: 'stated_numeric_range_midpoint' })
    );
    expect(scoringInput.firmnessRating).toBe(6);
    expect(dataProvenance.firmness).toBe('stated_numeric_range_midpoint');
  });

  it('falls back to a neutral 5.5 firmness and flags it as such when no firmnessRange exists', () => {
    const { scoringInput, dataProvenance } = adaptCatalogEntryForScoring(entry({ firmnessRange: null }));
    expect(scoringInput.firmnessRating).toBe(5.5);
    expect(dataProvenance.firmness).toBe('unknown_neutral_fallback');
  });

  it('uses a real independent cooling rating over the materials-text heuristic when both are available', () => {
    const { scoringInput, dataProvenance } = adaptCatalogEntryForScoring(
      entry({ coolingRatingOutOf10: 8, coreMaterialNotes: 'no cooling-sounding words here' })
    );
    expect(scoringInput.hasCoolingCover).toBe(true);
    expect(dataProvenance.heat).toBe('independent_rating');
  });

  it('a real independent cooling rating below 7 is a real negative, not silently dropped', () => {
    const { scoringInput } = adaptCatalogEntryForScoring(entry({ coolingRatingOutOf10: 4 }));
    expect(scoringInput.hasCoolingCover).toBe(false);
  });

  it('falls back to the materials-text heuristic only when no independent cooling rating exists', () => {
    const withGel = adaptCatalogEntryForScoring(entry({ coolingRatingOutOf10: null, coreMaterialNotes: 'gel-infused memory foam' }));
    expect(withGel.scoringInput.hasCoolingCover).toBe(true);
    expect(withGel.dataProvenance.heat).toBe('heuristic_from_materials_text');

    const withoutGel = adaptCatalogEntryForScoring(entry({ coolingRatingOutOf10: null, coreMaterialNotes: 'plain polyfoam' }));
    expect(withoutGel.scoringInput.hasCoolingCover).toBe(false);
  });

  it('uses a real independent edge-support rating over the type-based heuristic when available', () => {
    // Real case this matters for: Casper Snow is a hybrid (heuristic would
    // assume reinforced), but its real Sleep Foundation rating (6/10,
    // "below average") says otherwise - the heuristic must not override it.
    const { scoringInput, dataProvenance } = adaptCatalogEntryForScoring(
      entry({ type: 'hybrid', edgeSupportRatingOutOf10: 6 })
    );
    expect(scoringInput.edgeSupportReinforced).toBe(false);
    expect(dataProvenance.edge).toBe('independent_rating');
  });

  it('falls back to the type heuristic (foam=false, other types=true) only when no independent edge rating exists', () => {
    const foam = adaptCatalogEntryForScoring(entry({ type: 'foam', edgeSupportRatingOutOf10: null }));
    expect(foam.scoringInput.edgeSupportReinforced).toBe(false);
    expect(foam.dataProvenance.edge).toBe('heuristic_from_type');

    const hybrid = adaptCatalogEntryForScoring(entry({ type: 'hybrid', edgeSupportRatingOutOf10: null }));
    expect(hybrid.scoringInput.edgeSupportReinforced).toBe(true);
  });

  it('reports durability as stated only when a real topFoamDensityLbFt3 figure exists', () => {
    expect(adaptCatalogEntryForScoring(entry({ topFoamDensityLbFt3: 2.2 })).dataProvenance.durability).toBe('stated');
    expect(adaptCatalogEntryForScoring(entry({ topFoamDensityLbFt3: null })).dataProvenance.durability).toBe('unknown');
  });
});

describe('filterCatalog', () => {
  const catalog = [
    entry({ id: 'foam-priced', type: 'foam', priceUsd: 1000 }),
    entry({ id: 'hybrid-priced', type: 'hybrid', priceUsd: 3000 }),
    entry({ id: 'latex-unpriced', type: 'latex', priceUsd: null }),
  ];

  it('with no mattressTypePreference, does not filter by type', () => {
    const result = filterCatalog({ ...BASE_PROFILE, mattressTypePreference: [] }, catalog);
    expect(result.map((e) => e.id)).toEqual(['foam-priced', 'hybrid-priced', 'latex-unpriced']);
  });

  it('restricts to the requested type(s)', () => {
    const result = filterCatalog({ ...BASE_PROFILE, mattressTypePreference: ['latex'] }, catalog);
    expect(result.map((e) => e.id)).toEqual(['latex-unpriced']);
  });

  it('with no budgetUsd at all, does not filter unpriced entries out', () => {
    const result = filterCatalog({ ...BASE_PROFILE }, catalog);
    expect(result.map((e) => e.id)).toContain('latex-unpriced');
  });

  it('REGRESSION: budgetUsd.min of exactly 0 with no real max is not treated as a bound - an unpriced entry still passes', () => {
    // The match quiz sends `min: 0` whenever a user sets only a
    // max; this profile shape (min:0, no max at all) is the case a real
    // min:0-only submission produces, and previously excluded every
    // unpriced mattress even though a $0 floor can never be violated.
    const result = filterCatalog({ ...BASE_PROFILE, budgetUsd: { min: 0 } }, catalog);
    expect(result.map((e) => e.id)).toContain('latex-unpriced');
  });

  it('a genuine positive min excludes an unpriced entry (cannot confirm it clears the floor)', () => {
    const result = filterCatalog({ ...BASE_PROFILE, budgetUsd: { min: 500 } }, catalog);
    expect(result.map((e) => e.id)).not.toContain('latex-unpriced');
  });

  it('a genuine max excludes an unpriced entry (cannot confirm it is under the ceiling)', () => {
    const result = filterCatalog({ ...BASE_PROFILE, budgetUsd: { min: 0, max: 5000 } }, catalog);
    expect(result.map((e) => e.id)).not.toContain('latex-unpriced');
  });

  it('a real min/max range correctly includes/excludes priced entries by their actual price', () => {
    const result = filterCatalog({ ...BASE_PROFILE, budgetUsd: { min: 1500, max: 3500 } }, catalog);
    expect(result.map((e) => e.id)).toEqual(['hybrid-priced']); // $1000 is below min, $3000 is in range, unpriced is excluded.
  });
});

describe('badgeFor', () => {
  it('a sponsored entry always gets the sponsored badge, even if it would otherwise be the top match', () => {
    expect(badgeFor(entry({ sponsored: true }), true)).toEqual({ label: 'Sponsored', className: 'badge-sponsored' });
  });
  it('the first non-sponsored entry gets the top-match badge', () => {
    expect(badgeFor(entry({ sponsored: false }), true)).toEqual({ label: 'Top match — Algorithmic Pick', className: 'badge-top' });
  });
  it('a later non-sponsored entry gets the plain algorithmic-pick badge', () => {
    expect(badgeFor(entry({ sponsored: false }), false)).toEqual({ label: 'Algorithmic Pick', className: 'badge-none' });
  });
});

describe('buildWhyThisMatch', () => {
  it('returns the plain-language note for positive-delta rules only, in order', () => {
    const scored = {
      trace: {
        categoryRulesUsed: [
          { category: 'support', delta: 1.5, note: 'in band' },
          { category: 'heat', delta: -2, note: 'no cooling' },
          { category: 'edge', delta: 0, note: 'baseline only' },
        ],
        riskRulesUsed: [],
      },
    };
    expect(buildWhyThisMatch(scored)).toEqual(['in band']);
  });

  it('does not surface risk flags - those are shown separately on the card', () => {
    const scored = {
      trace: {
        categoryRulesUsed: [],
        riskRulesUsed: [
          { triggered: true, ruleId: 'EDGE_SUPPORT_CONCERN' },
          { triggered: false, ruleId: 'HEAT_RETENTION_LIKELY' },
        ],
      },
    };
    expect(buildWhyThisMatch(scored)).toEqual([]);
  });

  it('returns an empty array when nothing improved the score', () => {
    expect(buildWhyThisMatch({ trace: { categoryRulesUsed: [], riskRulesUsed: [] } })).toEqual([]);
  });
});

describe('matchProfile (integration - real scoreEngine, mocked getCatalog)', () => {
  it('returns empty results (with catalogSource preserved) when every entry is filtered out', async () => {
    catalogOnce({ entries: [entry({ type: 'foam' })], source: 'database' });
    const result = await matchProfile({ ...BASE_PROFILE, mattressTypePreference: ['innerspring'] });
    expect(result).toEqual({ results: [], modelVersion: null, all: [], catalogSource: 'database' });
  });

  it('sorts results by descending overall score and marks the top 3 as preselected', async () => {
    catalogOnce({
      entries: [
        entry({ id: 'firm-match', firmnessRange: { min: 8.5, max: 8.5 } }), // profile prefers 'medium' - a firm mattress should score lower on support/pressure than an exact medium match.
        entry({ id: 'exact-match', firmnessRange: { min: 5.5, max: 5.5 } }),
      ],
      source: 'json_fallback',
    });
    const result = await matchProfile(BASE_PROFILE);
    expect(result.all[0]?.id).toBe('exact-match');
    expect(result.all[0]?.score).toBeGreaterThanOrEqual(result.all[1]?.score as number);
    expect(result.results.every((r, i) => r.preselect === (i < 3))).toBe(true);
  });

  it('a sponsored entry never claims the top-match badge, even if it scores highest', async () => {
    catalogOnce({
      entries: [
        entry({ id: 'sponsored-best-fit', sponsored: true, firmnessRange: { min: 5.5, max: 5.5 } }),
        entry({ id: 'algorithmic-runner-up', sponsored: false, firmnessRange: { min: 8.5, max: 8.5 } }),
      ],
      source: 'database',
    });
    const result = await matchProfile(BASE_PROFILE);
    const sponsoredResult = result.results.find((r) => r.entry.id === 'sponsored-best-fit');
    const algorithmicResult = result.results.find((r) => r.entry.id === 'algorithmic-runner-up');
    expect(sponsoredResult?.badge.className).toBe('badge-sponsored');
    expect(algorithmicResult?.badge.className).toBe('badge-top');
  });

  it('attaches real verification fields per result, and a real catalog-wide audit', async () => {
    const verifiedEntry = entry({ id: 'complete-and-sourced' }); // has sourceUrl + lastVerified + every required field.
    const incompleteEntry = entry({ id: 'missing-height', heightIn: null });
    catalogOnce({ entries: [verifiedEntry, incompleteEntry], source: 'database' });
    const result = await matchProfile(BASE_PROFILE);

    const verifiedResult = result.results.find((r) => r.entry.id === 'complete-and-sourced');
    expect(verifiedResult?.verified).toBe(true);
    expect(verifiedResult?.verificationLevel).toBe('verified');
    expect(verifiedResult?.missingFields).toEqual([]);

    const incompleteResult = result.results.find((r) => r.entry.id === 'missing-height');
    expect(incompleteResult?.verified).toBe(false);
    expect(incompleteResult?.verificationLevel).toBe('unknown');
    expect(incompleteResult?.missingFields).toContain('heightIn');

    expect((result.catalogAudit as CatalogAudit).total).toBe(2);
    expect((result.catalogAudit as CatalogAudit).verifiedCount).toBe(1);
  });

  it('a real lifetime warranty (no numeric warrantyYears) still counts as a complete field, not a gap', async () => {
    const lifetimeEntry = entry({ id: 'lifetime-warranty', warrantyYears: null, warrantyLifetime: true });
    catalogOnce({ entries: [lifetimeEntry], source: 'database' });
    const result = await matchProfile(BASE_PROFILE);
    expect(result.results[0]?.verified).toBe(true);
    expect(result.results[0]?.missingFields).not.toContain('warrantyYears');
  });
});

describe('adaptCatalogEntryForScoringV2', () => {
  it('passes real graded ratings through unchanged and keeps missing ones null', () => {
    const input = adaptCatalogEntryForScoringV2(entry({
      firmnessRange: { min: 5, max: 7 }, coolingRatingOutOf10: 8, motionIsolationRatingOutOf10: null, edgeSupportRatingOutOf10: 6.5,
    }));
    expect(input).toMatchObject({ firmnessRating: 6, coolingRatingOutOf10: 8, motionIsolationRatingOutOf10: null, edgeSupportRatingOutOf10: 6.5, durabilityRatingOutOf10: null, topFoamDensityLbFt3: null });
  });
  it('reports null firmness (not a guessed neutral) when the catalog has none', () => {
    expect(adaptCatalogEntryForScoringV2(entry({ firmnessRange: null })).firmnessRating).toBeNull();
  });
});

describe('pickBestValueId', () => {
  it('never treats a null price as 0', () => {
    const results = [
      { entry: { id: 'unpriced', priceUsd: null } },
      { entry: { id: 'cheap', priceUsd: 899 } },
      { entry: { id: 'pricey', priceUsd: 1999 } },
      { entry: { id: 'missing' } },
    ];
    expect(pickBestValueId(results)).toBe('cheap');
  });
  it('returns null when no result has a real price', () => {
    expect(pickBestValueId([{ entry: { id: 'a', priceUsd: null } }, { entry: { id: 'b' } }])).toBeNull();
    expect(pickBestValueId([])).toBeNull();
  });
});

describe('matchProfile scoring versions', () => {
  it('defaults to v0.2, attaches dimensionProvenance/effectiveWeights/explanation and a null-safe bestValueId', async () => {
    catalogOnce({
      entries: [entry({ id: 'unpriced', priceUsd: null }), entry({ id: 'priced', priceUsd: 1500, coolingRatingOutOf10: 8 })],
      source: 'json_fallback',
    });
    const out = await matchProfile(BASE_PROFILE);
    expect(out.modelVersion).toBe('0.2');
    expect(out.scoreVersion).toBe('0.2');
    expect(out.bestValueId).toBe('priced');
    for (const r of out.results) {
      expect(r.result.dimensionProvenance).toBeTruthy();
      expect(r.result.effectiveWeights).toBeTruthy();
      expect(r.explanation).toBeTruthy();
      expect(r.isBestValue).toBe(r.entry.id === 'priced');
    }
    expect(out.results.find((r) => r.entry.id === 'priced')?.result.dimensionProvenance?.heat).toBe('measured');
  });

  it('scoreVersion 0.1 still produces the v0.1 engine output', async () => {
    catalogOnce({ entries: [entry()], source: 'json_fallback' });
    const out = await matchProfile(BASE_PROFILE, { scoreVersion: '0.1' });
    expect(out.modelVersion).toBe('0.1');
    expect(out.results[0]?.result.dimensionProvenance).toBeUndefined();
    expect(out.results[0]?.explanation.headline).toBeTruthy();
  });

  it('rejects an unsupported scoreVersion', async () => {
    await expect(matchProfile(BASE_PROFILE, { scoreVersion: '7' })).rejects.toThrow(/Unsupported/);
  });

  it('breaks v0.2 score ties deterministically (more rated dimensions first, then id)', async () => {
    catalogOnce({ entries: [entry({ id: 'z' }), entry({ id: 'a' })], source: 'json_fallback' });
    const out = await matchProfile(BASE_PROFILE);
    expect(out.results[0]?.result.overallScore).toBe(out.results[1]?.result.overallScore);
    expect(out.all.map((x) => x.id)).toEqual(['a', 'z']);
  });
});
