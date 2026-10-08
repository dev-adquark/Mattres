import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { scoreEngine as scoreAny, loadRules, computeEffectiveWeights } from '@/lib/scoreEngine';
import type { EngineMattress, EngineProfile, ScoringInputV02 } from '@/lib/scoreEngine';
import { adaptCatalogEntryForScoring, adaptCatalogEntryForScoringV2 } from '@/lib/matchLogic';
import catalogJson from '@/lib/data/mattress-catalog.json';
import type { MattressEntry, ScoreCategory, ScoreResult } from '@/lib/types';

// Exhaustive grid x catalog sweeps: tens of thousands of engine runs. They
// finish in ~1-2 s on an idle machine but exceed vitest's 5 s default under
// load (parallel workers, other processes), so give them an explicit budget.
const EXHAUSTIVE_TIMEOUT_MS = 60_000;

const catalog = catalogJson as MattressEntry[];
const DIMS: ScoreCategory[] = ['pressureRelief', 'support', 'heat', 'motion', 'edge', 'durability'];
const rules = loadRules('0.2');

/** v0.2 always fills the optional v0.2 fields of ScoreResult. */
function scoreEngine(version: '0.2', profile: EngineProfile, mattress: EngineMattress): Required<ScoreResult> {
  return scoreAny(version, profile, mattress) as Required<ScoreResult>;
}

const PROFILE: EngineProfile = { sleepPosition: 'back', weightLb: 160, preferredFirmnessLabel: 'medium-firm', sleepTemperature: 'neutral', motionSensitivity: 'single' };
const RATED: ScoringInputV02 = {
  id: 'rated', type: 'hybrid', firmnessRating: 6.5,
  coolingRatingOutOf10: 8, motionIsolationRatingOutOf10: 8, edgeSupportRatingOutOf10: 8.5, durabilityRatingOutOf10: 8.5,
};
const UNRATED: ScoringInputV02 = { id: 'unrated', type: 'foam', firmnessRating: 6.5 };

function quizGrid(extra: EngineProfile = {}): EngineProfile[] {
  const out: EngineProfile[] = [];
  for (const sleepPosition of ['side', 'back', 'stomach', 'combination'])
    for (const weightLb of [120, 160, 200, 250])
      for (const preferredFirmnessLabel of ['soft', 'medium-soft', 'medium', 'medium-firm', 'firm', 'extra-firm'])
        for (const sleepTemperature of ['cold', 'neutral', 'hot'])
          out.push({ sleepPosition, weightLb, preferredFirmnessLabel, sleepTemperature, motionSensitivity: 'single', ...extra });
  return out;
}

describe('rules 0.2 dataset', () => {
  it('documents every category rule and risk rule with id/code, description and rationale', () => {
    for (const r of rules.categoryRuleCatalog) {
      expect(r.id).toBeTruthy(); expect(r.description).toBeTruthy(); expect(r.rationale).toBeTruthy();
    }
    for (const r of rules.riskFlagRules) {
      expect(r.code).toBeTruthy(); expect(r.description).toBeTruthy(); expect(r.rationale).toBeTruthy(); expect(r.mitigation).toBeTruthy();
    }
    for (const r of rules.weightModifiers.rules) {
      expect(r.id).toBeTruthy(); expect(r.description).toBeTruthy(); expect(r.rationale).toBeTruthy();
    }
  });

  it('base weights sum to 1', () => {
    expect(DIMS.reduce((s, d) => s + rules.baseWeights[d], 0)).toBeCloseTo(1, 10);
  });

  it('the root data/rules copy is identical', () => {
    const root = path.join(process.cwd(), '..', 'data', 'rules', '0.2.json');
    if (!fs.existsSync(root)) return; // react-version deployed on its own
    expect(fs.readFileSync(root, 'utf8')).toBe(fs.readFileSync(path.join(process.cwd(), 'lib', 'rules', '0.2.json'), 'utf8'));
  });

  // The repo-root src/scoreEngine.js is the plain-JS Node CLI copy of this
  // engine (scripts/score-demo.js, the root API demo and the root tests run
  // under bare `node`, no TypeScript toolchain). Since this file became
  // TypeScript the two can no longer be compared as text, so they are
  // compared output-for-output instead: every quiz-grid profile x every
  // catalog entry, both versions, byte-identical JSON.
  it('the root src/scoreEngine.js (Node CLI copy) produces byte-identical output', () => {
    const root = path.join(process.cwd(), '..', 'src', 'scoreEngine.js');
    if (!fs.existsSync(root)) return; // react-version deployed on its own
    const rootEngine = createRequire(import.meta.url)(root) as { scoreEngine: typeof scoreAny };
    const profiles = [
      ...quizGrid(),
      ...quizGrid({ motionSensitivity: 'couple-high', edgeImportance: 'high', painFocus: 'shoulders' }),
      ...quizGrid({ motionSensitivity: 'couple-low', edgeImportance: 'low', painFocus: ['hip', 'lowerBack'] }),
    ];
    let compared = 0;
    for (const p of profiles) {
      for (const e of catalog) {
        const v1 = adaptCatalogEntryForScoring(e).scoringInput;
        expect(JSON.stringify(rootEngine.scoreEngine('0.1', p, v1))).toBe(JSON.stringify(scoreAny('0.1', p, v1)));
        const v2 = adaptCatalogEntryForScoringV2(e);
        expect(JSON.stringify(rootEngine.scoreEngine('0.2', p, v2))).toBe(JSON.stringify(scoreAny('0.2', p, v2)));
        compared += 2;
      }
    }
    expect(compared).toBe(profiles.length * catalog.length * 2);
  }, EXHAUSTIVE_TIMEOUT_MS);
});

describe('scoreEngine v0.2', () => {
  it('is deterministic', () => {
    for (const e of catalog.slice(0, 10)) {
      const input = adaptCatalogEntryForScoringV2(e);
      expect(JSON.stringify(scoreEngine('0.2', PROFILE, input))).toBe(JSON.stringify(scoreEngine('0.2', { ...PROFILE }, { ...input })));
    }
  });

  it('effective weights always sum to 1 across every combination of inputs', () => {
    for (const p of quizGrid()) {
      for (const motionSensitivity of ['single', 'couple-low', 'couple-high', undefined])
        for (const painFocus of ['none', 'shoulders', 'hips', 'lower-back', 'whole-body', ['shoulder', 'hip'], undefined])
          for (const edgeImportance of ['low', 'medium', 'high', undefined]) {
            const { effective } = computeEffectiveWeights(rules, { ...p, motionSensitivity, painFocus, edgeImportance });
            expect(DIMS.reduce((s, d) => s + effective[d], 0)).toBeCloseTo(1, 10);
          }
    }
    const r = scoreEngine('0.2', { ...PROFILE, sleepTemperature: 'hot', painFocus: 'shoulders' }, RATED);
    expect(DIMS.reduce((s, d) => s + r.effectiveWeights[d], 0)).toBeCloseTo(1, 3);
  }, EXHAUSTIVE_TIMEOUT_MS);

  it('re-weights from profile inputs: hot sleepers weight cooling more, couple-high weights motion more', () => {
    const neutral = scoreEngine('0.2', PROFILE, RATED).effectiveWeights;
    const hot = scoreEngine('0.2', { ...PROFILE, sleepTemperature: 'hot' }, RATED).effectiveWeights;
    const couple = scoreEngine('0.2', { ...PROFILE, motionSensitivity: 'couple-high' }, RATED).effectiveWeights;
    const edge = scoreEngine('0.2', { ...PROFILE, edgeImportance: 'high' }, RATED).effectiveWeights;
    const back = scoreEngine('0.2', { ...PROFILE, painFocus: 'lower-back' }, RATED).effectiveWeights;
    expect(hot.heat).toBeGreaterThan(neutral.heat);
    expect(couple.motion).toBeGreaterThan(neutral.motion);
    expect(edge.edge).toBeGreaterThan(neutral.edge);
    expect(back.support).toBeGreaterThan(neutral.support);
  });

  it('uses real ratings as measured and marks missing ones estimated (capped)', () => {
    const rated = scoreEngine('0.2', PROFILE, RATED);
    expect(rated.dimensionProvenance).toEqual({ support: 'measured', pressureRelief: 'measured', heat: 'measured', motion: 'measured', edge: 'measured', durability: 'measured' });
    expect(rated.subScores.heat).toBe(8);
    expect(rated.subScores.edge).toBe(8.5);

    const unrated = scoreEngine('0.2', PROFILE, UNRATED);
    for (const d of ['heat', 'motion', 'edge', 'durability'] as const) {
      expect(unrated.dimensionProvenance[d]).toBe('estimated');
      expect(unrated.subScores[d]).toBeLessThanOrEqual(rules.estimateCap);
    }
    // foam motion baseline is 9 in v0.1, but an estimate is capped.
    expect(unrated.subScores.motion).toBe(rules.estimateCap);
  });

  it('unknown firmness is neither a strong positive nor a strong negative', () => {
    const r = scoreEngine('0.2', { ...PROFILE, sleepPosition: 'stomach', weightLb: 260 }, { ...RATED, firmnessRating: null });
    expect(r.dimensionProvenance.support).toBe('estimated');
    expect(r.dimensionProvenance.pressureRelief).toBe('estimated');
    expect(r.subScores.support).toBeLessThanOrEqual(rules.estimateCap);
    expect(r.subScores.support).toBeGreaterThanOrEqual(5);
    expect(r.riskFlags.map((f) => f.code)).not.toContain('SUPPORT_THRESHOLD_MISMATCH');
    expect(r.riskFlags.map((f) => f.code)).not.toContain('PREFERRED_FIRMNESS_MISMATCH');
    expect(r.scoreBreakdown.preferenceAdjustment).toBe(0);
  });

  it('firmness fit is graded by distance from the band and from the stated preference', () => {
    const scores = [6.5, 7.5, 8.5, 9.5].map((f) => scoreEngine('0.2', { ...PROFILE, preferredFirmnessLabel: 'medium' }, { ...RATED, firmnessRating: f }));
    for (let i = 1; i < scores.length; i++) expect(scores[i]?.overallScore).toBeLessThan(scores[i - 1]?.overallScore as number);
    const prefPenalties = scores.map((s) => s.scoreBreakdown.preferenceAdjustment);
    expect(prefPenalties[0]).toBeLessThan(0);
    expect(prefPenalties[3]).toBeLessThan(prefPenalties[1] as number);
    expect(scores[3]?.riskFlags.map((f) => f.code)).toEqual(expect.arrayContaining(['SUPPORT_THRESHOLD_MISMATCH', 'PREFERRED_FIRMNESS_MISMATCH']));
  });

  it('a mattress whose real data fits on every dimension can reach the high 80s+; a poor fit scores clearly lower', () => {
    const great = scoreEngine('0.2', PROFILE, { ...RATED, firmnessRating: 6.5, coolingRatingOutOf10: 9, motionIsolationRatingOutOf10: 9, edgeSupportRatingOutOf10: 9, durabilityRatingOutOf10: 9 });
    const poor = scoreEngine('0.2', PROFILE, { ...RATED, firmnessRating: 2.5, coolingRatingOutOf10: 5, motionIsolationRatingOutOf10: 5, edgeSupportRatingOutOf10: 5, durabilityRatingOutOf10: 5 });
    expect(great.overallScore).toBeGreaterThanOrEqual(88);
    expect(poor.overallScore).toBeLessThan(great.overallScore - 30);
  });

  it('flags carry a basis, and estimated data never triggers the sag-risk flag', () => {
    const heavy = { ...PROFILE, weightLb: 260, sleepTemperature: 'hot', motionSensitivity: 'couple-high' };
    const r = scoreEngine('0.2', heavy, { id: 'x', type: 'foam', firmnessRating: 7 });
    const codes = r.riskFlags.map((f) => f.code);
    expect(codes).toContain('HEAT_RETENTION_LIKELY');
    expect(r.riskFlags.find((f) => f.code === 'HEAT_RETENTION_LIKELY')?.basis).toBe('estimated');
    expect(codes).not.toContain('DURABILITY_SAG_RISK');
    const rated = scoreEngine('0.2', heavy, { ...RATED, firmnessRating: 7, durabilityRatingOutOf10: 6 });
    expect(rated.riskFlags.map((f) => f.code)).toContain('DURABILITY_SAG_RISK');
    expect(r.riskFlags.every((f) => !/[A-Z]{3,}_[A-Z]{3,}/.test(f.rationale))).toBe(true);
  });

  it('keeps the v0.1 output fields and adds dimensionProvenance + effectiveWeights', () => {
    const r = scoreEngine('0.2', PROFILE, RATED);
    for (const key of ['modelVersion', 'scoreModelVersion', 'mattressId', 'overallScore', 'subScores', 'weights', 'comfortBand', 'riskFlags', 'trace']) {
      expect(r).toHaveProperty(key);
    }
    expect(r.modelVersion).toBe('0.2');
    expect(r.trace.categoryRulesUsed.length).toBeGreaterThan(0);
    expect(r.trace.riskRulesUsed.length).toBe(rules.riskFlagRules.length);
    expect(Object.keys(r.effectiveWeights).sort()).toEqual([...DIMS].sort());
  });

  it('SPREAD: across 288 quiz profiles the top-1 match and its score vary (v0.1 was always 78)', () => {
    const tops = new Set();
    const topScores = new Set();
    let min = 100;
    let max = 0;
    for (const p of quizGrid()) {
      const scored = catalog.map((e) => ({ id: e.id, s: scoreEngine('0.2', p, adaptCatalogEntryForScoringV2(e)).overallScore }));
      scored.sort((a, b) => b.s - a.s || a.id.localeCompare(b.id));
      const top = scored[0] as { id: string; s: number };
      tops.add(top.id);
      topScores.add(top.s);
      for (const x of scored) { min = Math.min(min, x.s); max = Math.max(max, x.s); }
    }
    expect(tops.size).toBeGreaterThanOrEqual(4);
    expect(topScores.size).toBeGreaterThanOrEqual(8);
    expect(max - min).toBeGreaterThanOrEqual(40);
    expect(max).toBeLessThanOrEqual(100);
  }, EXHAUSTIVE_TIMEOUT_MS);
});
