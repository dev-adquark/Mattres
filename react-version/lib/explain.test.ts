import { describe, it, expect, vi } from 'vitest';
import { explainMatch, DIMENSIONS, DIMENSION_BY_ID, toReferenceVoice } from '@/lib/explain';
import { scoreEngine } from '@/lib/scoreEngine';
import { adaptCatalogEntryForScoringV2, matchProfile } from '@/lib/matchLogic';
import { missingFields } from '@/lib/dataIntegrity';
import catalog from '@/lib/data/mattress-catalog.json';

vi.mock('@/lib/db/mattressRepo', () => ({ getCatalog: vi.fn() }));
import { getCatalog } from '@/lib/db/mattressRepo';
import type { EngineProfile } from '@/lib/scoreEngine';
import type { MattressEntry, ScoreCategory } from '@/lib/types';

const mockedGetCatalog = vi.mocked(getCatalog);

const PROFILE: EngineProfile = { sleepPosition: 'side', weightLb: 160, preferredFirmnessLabel: 'medium-soft', sleepTemperature: 'hot', motionSensitivity: 'couple-high', painFocus: 'shoulders', edgeImportance: 'high' };
const CODE_PATTERN = /\b[A-Z]{2,}(_[A-Z]{2,})+\b/;

function item(entry: MattressEntry, profile: EngineProfile = PROFILE) {
  return { entry, result: scoreEngine('0.2', profile, adaptCatalogEntryForScoringV2(entry)), missingFields: missingFields(entry) };
}

/** A test fixture: only the fields the explanation layer reads are set. */
function base(overrides: Record<string, unknown> = {}): MattressEntry {
  return {
    id: 'x', brand: 'B', model: 'M', type: 'hybrid', firmnessRange: { min: 4.5, max: 4.5 },
    coolingRatingOutOf10: 8.5, motionIsolationRatingOutOf10: 8.5, edgeSupportRatingOutOf10: 8, durabilityRatingOutOf10: 8,
    priceUsd: 1200, trialDays: 100, warrantyYears: 10, heightIn: 12, ...overrides,
  } as unknown as MattressEntry;
}

describe('DIMENSIONS', () => {
  it('describes the six engine dimensions with id, label and short description', () => {
    expect(DIMENSIONS.map((d) => d.id)).toEqual(['pressureRelief', 'support', 'heat', 'motion', 'edge', 'durability']);
    for (const d of DIMENSIONS) { expect(d.label).toBeTruthy(); expect(d.short).toBeTruthy(); }
    expect(DIMENSION_BY_ID.heat.label).toBe('Cooling');
  });
});

describe('explainMatch', () => {
  it('builds headline, reasons, watch-outs, profile factors and data notes', () => {
    const ex = explainMatch(item(base()), PROFILE);
    expect(ex.tier.id).toBeTruthy();
    expect(ex.headline).toMatch(/^(Excellent|Strong|Good|Fair|Weak) match for a side sleeper(: strongest on [a-z &]+)?\.$/);
    expect(ex.reasons.length).toBeGreaterThan(0);
    expect(ex.reasons.find((r) => r.dimension === 'heat')?.text).toMatch(/8\.5\/10.*sleep hot/);
    expect(ex.profileFactors.map((f) => f.id)).toEqual(expect.arrayContaining(['position', 'preference', 'temperature', 'motion', 'edge', 'pain-shoulders']));
    expect(ex.dataNotes).toEqual([]);
  });

  it('NEVER emits a reason for an estimated dimension (only discloses it as a data note)', () => {
    // Every rating missing: heat/motion/edge/durability are estimated.
    const entry = base({ coolingRatingOutOf10: null, motionIsolationRatingOutOf10: null, edgeSupportRatingOutOf10: null, durabilityRatingOutOf10: null });
    const it1 = item(entry);
    const ex = explainMatch(it1, PROFILE);
    for (const r of ex.reasons) {
      if (r.dimension !== 'preference') expect(it1.result.dimensionProvenance?.[r.dimension as ScoreCategory]).toBe('measured');
    }
    expect(ex.reasons.map((r) => r.dimension)).not.toEqual(expect.arrayContaining(['heat']));
    expect(ex.dataNotes.find((n) => n.id === 'limited-data')?.text).toMatch(/Limited verified data: 4 of 6/);
  });

  it('holds across the real catalog and many profiles', () => {
    for (const entry of catalog as MattressEntry[]) {
      for (const profile of [PROFILE, <EngineProfile>{ sleepPosition: 'back', weightLb: 240, preferredFirmnessLabel: 'firm', sleepTemperature: 'neutral', motionSensitivity: 'single' }]) {
        const it1 = item(entry, profile);
        const ex = explainMatch(it1, profile);
        for (const r of ex.reasons) {
          if (r.dimension !== 'preference') expect(it1.result.dimensionProvenance?.[r.dimension as ScoreCategory]).toBe('measured');
          expect(r.text).not.toMatch(CODE_PATTERN);
        }
        for (const w of ex.watchOuts) {
          expect(['info', 'caution', 'warning']).toContain(w.severity);
          expect(w.title).not.toMatch(CODE_PATTERN);
          expect(w.text).not.toMatch(CODE_PATTERN);
          expect(w.mitigation).toBeTruthy();
        }
        for (const n of ex.dataNotes) expect(n.text).not.toMatch(CODE_PATTERN);
        expect(ex.headline).not.toMatch(CODE_PATTERN);
      }
    }
  });

  it('notes an unverified price and warranty', () => {
    const entry = base({ priceUsd: null, warrantyYears: null });
    const ex = explainMatch(item(entry), PROFILE);
    expect(ex.dataNotes.map((n) => n.text)).toEqual(expect.arrayContaining(['Price not yet verified.', 'Warranty length not yet verified.']));
  });

  it('turns risk flags into human watch-outs with severity (estimated basis is softer)', () => {
    const hotUnrated = explainMatch(item(base({ type: 'foam', coolingRatingOutOf10: null })), PROFILE);
    const heat = hotUnrated.watchOuts.find((w) => w.code === 'HEAT_RETENTION_LIKELY');
    expect(heat?.title).toBe('May sleep warm');
    expect(heat?.severity).toBe('caution');
    const hotRated = explainMatch(item(base({ coolingRatingOutOf10: 5 })), PROFILE);
    expect(hotRated.watchOuts.find((w) => w.code === 'HEAT_RETENTION_LIKELY')?.severity).toBe('warning');
  });

  it('discloses multi-firmness listings as info, and orders warnings first', () => {
    const ex = explainMatch(item(base({ firmnessRange: { min: 3, max: 8 }, coolingRatingOutOf10: 5 })), PROFILE);
    const info = ex.watchOuts.find((w) => w.code === 'MULTIPLE_FIRMNESS_OPTIONS');
    expect(info?.severity).toBe('info');
    expect(ex.watchOuts[ex.watchOuts.length - 1]?.severity).toBe('info');
    expect(ex.watchOuts[0]?.severity).toBe('warning');
  });

  it('works for a v0.1 result (no dimensionProvenance): only firmness-derived dimensions can be reasons', () => {
    const entry = base();
    const result = scoreEngine('0.1', PROFILE, { id: 'x', type: 'hybrid', firmnessRating: 4.5, hasCoolingCover: true, edgeSupportReinforced: true, topFoamDensityLbFt3: null });
    const ex = explainMatch({ entry, result, missingFields: [], dataProvenance: { firmness: 'stated' } }, PROFILE);
    for (const r of ex.reasons) expect(['support', 'pressureRelief', 'preference']).toContain(r.dimension);
  });

  it('is attached to every matchProfile result item', async () => {
    mockedGetCatalog.mockResolvedValueOnce({ entries: [base({ id: 'a' }), base({ id: 'b', firmnessRange: null })], source: 'json_fallback', error: null });
    const out = await matchProfile(PROFILE);
    for (const r of out.results) {
      expect(r.explanation.headline).toBeTruthy();
      expect(r.whyThisMatch).toEqual(r.explanation.reasons.map((x) => x.text));
    }
    const unknown = out.results.find((r) => r.entry.id === 'b');
    expect(unknown?.explanation.dataNotes.map((n) => n.id)).toContain('firmness-unverified');
  });
});

describe('toReferenceVoice', () => {
  it('rewrites second-person phrases so reference pages never read as a claim about the visitor', () => {
    expect(toReferenceVoice('Its firmness sits inside the 5–7/10 range that keeps a side sleeper at your weight aligned.')).toContain('at this weight');
    expect(toReferenceVoice('Independent reviewers rate its cooling 8/10, which matters because you sleep hot.')).toContain('a hot sleeper');
    expect(toReferenceVoice('Strong pressure relief for your profile.')).toBe('Strong pressure relief for this profile.');
    expect(toReferenceVoice('Independent reviewers rate its motion isolation 7/10, helpful when you share the bed.')).toContain('when sharing a bed');
  });
  it('leaves text with no second-person phrasing unchanged', () => {
    const text = 'Independent reviewers rate its durability 7/10.';
    expect(toReferenceVoice(text)).toBe(text);
  });
});
