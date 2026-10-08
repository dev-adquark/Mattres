/**
 * Match Scoring Engine
 * --------------------
 * Versioned, rule-based scorer that takes a structured Sleep Profile and a
 * Mattress spec and returns an overall score, six category sub-scores, and
 * an array of risk flags (each with a machine-readable code, a human
 * rationale, and a mitigation suggestion).
 *
 * Ported directly from the original project's src/scoreEngine.js (same
 * logic, same rules dataset, only the file paths changed to fit this
 * Next.js project's lib/ layout). Server-only (uses Node's fs/path), so it
 * must be called from an API route or Server Component/Action, never
 * imported into a 'use client' component directly.
 *
 * TypeScript port: the types describe the existing behaviour, they do not
 * change it. Every expression, string and object-key order is kept exactly
 * as in the JavaScript engine, because v0.1 output must stay byte-identical
 * (lib/scoreEngine.regression.test.ts) and the root Node CLI copy
 * (../src/scoreEngine.js) must keep producing the same output as this file
 * (scripts/test-score-engine.js compares both engines output-for-output).
 *
 * This module only imports Node built-ins and types, so Node's built-in
 * type stripping can load it directly (the root test does exactly that).
 *
 * Design goals for this skeleton (v0.1):
 *  - Deterministic: same inputs always produce the same output. No RNG,
 *    no wall-clock time in the scoring math.
 *  - Transparent: every threshold/weight/baseline lives in a versioned JSON
 *    dataset under lib/rules/<version>.json, not hardcoded in this file.
 *  - Explainable: every risk flag rationale references the actual numbers
 *    that triggered it, not just a static description.
 *
 * This is intentionally a v0.1 skeleton: the adjustment math is simple and
 * linear so it's easy to reason about and extend. It has NOT been
 * calibrated against real product or review data.
 */

import fs from 'node:fs';
import path from 'node:path';
import type {
  CategoryRuleUsage,
  ComfortBand,
  DimensionProvenance,
  FirmnessFit,
  PainFocus,
  RiskFlag,
  RiskFlagCode,
  RiskRuleUsage,
  ScoreCategory,
  ScoreResult,
  ScoreTrace,
  ScoreVersion,
  SubScores,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Types (rules datasets + engine inputs)
// ---------------------------------------------------------------------------

/** [min, max] firmness comfort range on the 1-10 scale. */
export type FirmnessBand = [number, number];

export interface WeightBand {
  key: string;
  minLb?: number;
  maxLb?: number;
}

interface CategoryRuleDef {
  id: string;
  description: string;
  categories?: ScoreCategory[];
  rationale?: string;
}

interface RiskFlagRuleDef {
  code: RiskFlagCode;
  category: ScoreCategory;
  description: string;
  thresholdId: string;
  mitigation: string;
  rationale?: string;
}

/** Shape shared by every rules dataset (lib/rules/*.json). */
interface RulesBase {
  version: string;
  description: string;
  categories: ScoreCategory[];
  weightBands: WeightBand[];
  firmnessLabelScale: Record<string, number>;
  /** position -> weight band -> [min, max]; also carries a "description" string in 0.2. */
  firmnessComfortBands: Record<string, Record<string, FirmnessBand> | string>;
  categoryRuleCatalog: CategoryRuleDef[];
  riskFlagRules: RiskFlagRuleDef[];
}

/** lib/rules/0.1.json */
export interface RulesV01 extends RulesBase {
  weights: SubScores;
  mattressTypeBaselines: { default: SubScores; [type: string]: SubScores };
  adjustments: {
    supportPenaltyPerFirmnessPoint: number;
    supportBonusInBand: number;
    pressureReliefPenaltyPerFirmnessPoint: number;
    pressureReliefBonusWhenSofterThanBand: number;
    coolingCoverHeatBonus: number;
    noCoolingFoamHeatPenalty: number;
    reinforcedEdgeBonus: number;
    coupleHighMotionPenaltyLowIsolationTypes: number;
    lowDensityHighWeightDurabilityPenalty: number;
    highDensityDurabilityBonus: number;
  };
  thresholds: {
    heatRetentionMaxHeatScore: number;
    edgeSupportMinScore: number;
    durabilityMinFoamDensityLbFt3: number;
    durabilityHighWeightLb: number;
    lowIsolationTypesForCoupleHigh: string[];
    preferredFirmnessMismatchPoints: number;
  };
}

export interface WeightModifierRule {
  id: string;
  /** Exactly one condition: a profile field equality, weightLbAtLeast or painFocus. */
  when: { weightLbAtLeast?: number; painFocus?: string; [profileField: string]: string | number | undefined };
  multiply: Partial<Record<ScoreCategory, number>>;
  description: string;
  rationale: string;
}

export interface WeightRuleUsage {
  ruleId: string;
  description: string;
  multiply: Partial<Record<ScoreCategory, number>>;
}

/** lib/rules/0.2.json */
export interface RulesV02 extends RulesBase {
  baseWeights: SubScores;
  weightModifiers: { description: string; rules: WeightModifierRule[] };
  /** Legacy/v0.2 pain value -> v0.2 value; also carries a "description" key (skipped by the engine). */
  painFocusAliases: Record<string, string>;
  typeBaselines: { default: SubScores; [type: string]: SubScores };
  estimateCap: number;
  estimateCapRationale: string;
  /** dimension -> catalog rating field; also carries a "description" key (skipped by the engine). */
  ratedDimensions: Record<string, string>;
  firmnessFit: {
    description: string;
    insideEdgeFit: number;
    outsidePerPointLoss: number;
    supportFloor: number;
    supportRange: number;
    supportTooSoftExtraPerPoint: number;
    supportTypeModifier: { default: number; [type: string]: number };
    pressureTypeBase: { default: number; [type: string]: number };
    pressureInBandBonusAtSoftEdge: number;
    pressureInBandBonusAtFirmEdge: number;
    pressureTooFirmPerPoint: number;
    pressureTooSoftBonus: number;
    unknownFirmnessNeutral: number;
    unknownFirmnessNote: string;
  };
  preferenceFit: { description: string; tolerancePoints: number; pointsPerFirmnessPoint: number; maxPenalty: number };
  durability: {
    heavierSleeperLb: number;
    heavierSleeperFoamPenalty: number;
    lowDensityThresholdLbFt3: number;
    lowDensityHighWeightLb: number;
    lowDensityPenalty: number;
  };
  thresholds: {
    heatRetentionMaxHeatScore: number;
    edgeSupportMinScore: number;
    edgeSupportMinScoreWhenImportant: number;
    motionTransferMinScore: number;
    pressurePointMinScore: number;
    durabilityHeavierSleeperMinScore: number;
    preferredFirmnessMismatchPoints: number;
  };
}

export type EngineRules = RulesV01 | RulesV02;

/**
 * The profile fields the engine reads. Deliberately looser than the
 * validated SleepProfile: the engine also scores partial profiles (weight
 * presets on the methodology/home pages) and odd shapes (regression grid),
 * and an unknown value simply matches no rule. A SleepProfile is always
 * assignable to this.
 */
export interface EngineProfile {
  sleepPosition?: string;
  weightLb?: number;
  /** Numeric 1-10 preference; wins over preferredFirmnessLabel when present. */
  preferredFirmness?: number;
  preferredFirmnessLabel?: string;
  sleepTemperature?: string;
  motionSensitivity?: string;
  /** v0.2 single value or the legacy array form. */
  painFocus?: string | readonly string[] | null;
  edgeImportance?: string | null;
  mattressTypePreference?: readonly string[];
  budgetUsd?: { min?: number | null; max?: number | null } | null;
  scoreVersion?: string;
}

/** v0.1 engine input (lib/matchLogic adaptCatalogEntryForScoring().scoringInput). */
export interface ScoringInputV01 {
  id?: string;
  type: string;
  firmnessRating: number;
  hasCoolingCover?: boolean;
  edgeSupportReinforced?: boolean;
  topFoamDensityLbFt3?: number | null;
}

/** v0.2 engine input (lib/matchLogic adaptCatalogEntryForScoringV2()). Missing ratings stay null. */
export interface ScoringInputV02 {
  id?: string;
  type: string;
  firmnessRating?: number | null;
  coolingRatingOutOf10?: number | null;
  motionIsolationRatingOutOf10?: number | null;
  edgeSupportRatingOutOf10?: number | null;
  durabilityRatingOutOf10?: number | null;
  topFoamDensityLbFt3?: number | null;
}

/** Either engine input; each version reads only its own fields. */
export type EngineMattress = ScoringInputV01 | ScoringInputV02;

/** v0.2 category-rule trace entries can also carry the resulting value. */
export interface CategoryRuleUsageV02 extends CategoryRuleUsage {
  value?: number;
}

/**
 * The subset of a v0.2 rules dataset computeEffectiveWeights() reads. Loose
 * enough that the JSON module type (`typeof import('@/lib/rules/0.2.json')`,
 * whose arrays widen to string[]) is accepted as well as RulesV02.
 */
export interface WeightRulesInput {
  categories: readonly string[];
  baseWeights: SubScores;
  weightModifiers: {
    rules: readonly {
      id: string;
      when: { [condition: string]: string | number | undefined };
      multiply: Partial<Record<ScoreCategory, number>>;
      description: string;
    }[];
  };
  painFocusAliases: Record<string, string>;
}

type WeightRuleInput = WeightRulesInput['weightModifiers']['rules'][number];

export interface EffectiveWeights {
  effective: SubScores;
  weightRulesUsed: WeightRuleUsage[];
  painFocusList: PainFocus[];
}

// ---------------------------------------------------------------------------
// Rules loading + shared helpers
// ---------------------------------------------------------------------------

const RULES_DIR = path.join(process.cwd(), 'lib', 'rules');

/** In-memory cache so repeated calls in the same process don't re-read disk. */
const rulesCache = new Map<string, EngineRules>();

/**
 * Loads the rules dataset for a given scoring model version.
 * @param version e.g. "0.1"
 */
export function loadRules(version: '0.1'): RulesV01;
export function loadRules(version: '0.2'): RulesV02;
export function loadRules(version: string): EngineRules;
export function loadRules(version: string): EngineRules {
  const cached = rulesCache.get(version);
  if (cached) return cached;

  const filePath = path.join(RULES_DIR, `${version}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No rules dataset found for scoring model version "${version}" (expected ${filePath}).`
    );
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  // Trusted, versioned, git-committed dataset (see lib/rules/*.json).
  const parsed = JSON.parse(raw) as EngineRules;
  rulesCache.set(version, parsed);
  return parsed;
}

/** Clamp a number into [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to 1 decimal place, deterministic. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Resolves a profile's weight-band key (e.g. "130-180") from the
 * weightBands table in the rules dataset.
 *
 * A missing weight compares false against every bound (as in the JS
 * original), so it falls through to the last band.
 */
export function resolveWeightBand(rules: Pick<RulesBase, 'weightBands'>, weightLb: number | undefined): string {
  const weight = weightLb as number;
  for (const band of rules.weightBands) {
    const aboveMin = band.minLb === undefined || weight >= band.minLb;
    const belowMax = band.maxLb === undefined || weight < band.maxLb;
    if (aboveMin && belowMax) return band.key;
  }
  return (rules.weightBands[rules.weightBands.length - 1] as WeightBand).key;
}

/**
 * Resolves the numeric firmness (1-10 scale) for a profile, accepting
 * either a pre-supplied numeric preference or a label looked up in
 * rules.firmnessLabelScale.
 */
export function resolveProfileFirmness(
  rules: Pick<RulesBase, 'firmnessLabelScale'>,
  profile: Pick<EngineProfile, 'preferredFirmness' | 'preferredFirmnessLabel'>
): number | null {
  if (typeof profile.preferredFirmness === 'number') {
    return profile.preferredFirmness;
  }
  const label = profile.preferredFirmnessLabel;
  if (label && rules.firmnessLabelScale[label] !== undefined) {
    return rules.firmnessLabelScale[label];
  }
  return null;
}

/**
 * Resolves the [min, max] firmness comfort band for a sleep position +
 * weight band, with a safe fallback if the combination isn't in the table.
 */
export function resolveComfortBand(
  rules: Pick<RulesBase, 'firmnessComfortBands'>,
  sleepPosition: string | undefined,
  weightBandKey: string
): FirmnessBand {
  const byPosition = rules.firmnessComfortBands[sleepPosition as string];
  if (byPosition && typeof byPosition === 'object' && byPosition[weightBandKey]) return byPosition[weightBandKey];
  return [4, 7];
}

function indexById<T extends { id: string }>(list: readonly T[]): Record<string, T> {
  return Object.fromEntries(list.map((r) => [r.id, r]));
}

function indexByCode(list: readonly RiskFlagRuleDef[]): Record<string, RiskFlagRuleDef> {
  return Object.fromEntries(list.map((r) => [r.code, r]));
}

/** Rules referenced by a hard-coded id/code always exist in the dataset; a missing one is a dataset bug and throws (as in the JS original). */
function must<T>(value: T | undefined): T {
  return value as T;
}

// ===========================================================================
// v0.1 implementation
// ===========================================================================

/** Core v0.1 scoring implementation (see original project for full commentary). */
function scoreV0_1(rules: RulesV01, profile: EngineProfile, mattress: ScoringInputV01): ScoreResult {
  const adj = rules.adjustments;
  const thresholds = rules.thresholds;
  const ruleCatalogById = indexById(rules.categoryRuleCatalog);

  const weightBandKey = resolveWeightBand(rules, profile.weightLb);
  const comfortBand = resolveComfortBand(rules, profile.sleepPosition, weightBandKey);
  const [bandMin, bandMax] = comfortBand;
  // Weight comparisons below mirror the JS original: a missing weight compares false.
  const weightLb = profile.weightLb as number;

  const baseline =
    rules.mattressTypeBaselines[mattress.type] || rules.mattressTypeBaselines.default;

  const sub: SubScores = { ...baseline };

  const categoryRulesUsed: CategoryRuleUsage[] = [];
  function recordCategoryRule(ruleId: string, category: ScoreCategory | null, delta: number, note: string): void {
    categoryRulesUsed.push({
      ruleId,
      category,
      description: must(ruleCatalogById[ruleId]).description,
      delta: round1(delta),
      note,
    });
  }

  recordCategoryRule(
    'BASELINE_BY_TYPE',
    null,
    0,
    `Mattress type "${mattress.type}" baseline: ${JSON.stringify(baseline)}.`
  );

  let distanceOutsideBand = 0;
  if (mattress.firmnessRating < bandMin) {
    distanceOutsideBand = bandMin - mattress.firmnessRating;
    const delta = -distanceOutsideBand * adj.supportPenaltyPerFirmnessPoint;
    sub.support += delta;
    recordCategoryRule(
      'SUPPORT_BAND_PENALTY',
      'support',
      delta,
      `Firmness ${mattress.firmnessRating}/10 is ${distanceOutsideBand} point(s) below the ${bandMin}-${bandMax} band.`
    );
  } else if (mattress.firmnessRating > bandMax) {
    distanceOutsideBand = mattress.firmnessRating - bandMax;
    const delta = -distanceOutsideBand * adj.supportPenaltyPerFirmnessPoint;
    sub.support += delta;
    recordCategoryRule(
      'SUPPORT_BAND_PENALTY',
      'support',
      delta,
      `Firmness ${mattress.firmnessRating}/10 is ${distanceOutsideBand} point(s) above the ${bandMin}-${bandMax} band.`
    );
  } else {
    sub.support += adj.supportBonusInBand;
    recordCategoryRule(
      'SUPPORT_BAND_BONUS',
      'support',
      adj.supportBonusInBand,
      `Firmness ${mattress.firmnessRating}/10 is within the ${bandMin}-${bandMax} band.`
    );
  }

  if (mattress.firmnessRating < bandMin) {
    sub.pressureRelief += adj.pressureReliefBonusWhenSofterThanBand;
    recordCategoryRule(
      'PRESSURE_RELIEF_SOFTER_BONUS',
      'pressureRelief',
      adj.pressureReliefBonusWhenSofterThanBand,
      `Firmness ${mattress.firmnessRating}/10 is softer than the ${bandMin}-${bandMax} band.`
    );
  } else if (mattress.firmnessRating > bandMax) {
    const overBy = mattress.firmnessRating - bandMax;
    const delta = -overBy * adj.pressureReliefPenaltyPerFirmnessPoint;
    sub.pressureRelief += delta;
    recordCategoryRule(
      'PRESSURE_RELIEF_FIRMER_PENALTY',
      'pressureRelief',
      delta,
      `Firmness ${mattress.firmnessRating}/10 is ${overBy} point(s) firmer than the ${bandMin}-${bandMax} band.`
    );
  }

  if (mattress.hasCoolingCover) {
    sub.heat += adj.coolingCoverHeatBonus;
    recordCategoryRule('HEAT_COOLING_COVER_BONUS', 'heat', adj.coolingCoverHeatBonus, 'Mattress has a cooling cover.');
  } else if (mattress.type === 'foam') {
    sub.heat -= adj.noCoolingFoamHeatPenalty;
    recordCategoryRule(
      'HEAT_NO_COOLING_FOAM_PENALTY',
      'heat',
      -adj.noCoolingFoamHeatPenalty,
      'All-foam construction with no cooling cover.'
    );
  }

  const isLowIsolationType = thresholds.lowIsolationTypesForCoupleHigh.includes(mattress.type);
  if (profile.motionSensitivity === 'couple-high' && isLowIsolationType) {
    sub.motion -= adj.coupleHighMotionPenaltyLowIsolationTypes;
    recordCategoryRule(
      'MOTION_COUPLE_HIGH_LOW_ISOLATION_PENALTY',
      'motion',
      -adj.coupleHighMotionPenaltyLowIsolationTypes,
      `Profile reports "couple-high" motion sensitivity and mattress type "${mattress.type}" is on the low-isolation list.`
    );
  }

  if (mattress.edgeSupportReinforced) {
    sub.edge += adj.reinforcedEdgeBonus;
    recordCategoryRule('EDGE_REINFORCED_BONUS', 'edge', adj.reinforcedEdgeBonus, 'Mattress has a reinforced perimeter.');
  }

  const density = mattress.topFoamDensityLbFt3;
  if (density != null) {
    if (density < thresholds.durabilityMinFoamDensityLbFt3 && weightLb >= thresholds.durabilityHighWeightLb) {
      sub.durability -= adj.lowDensityHighWeightDurabilityPenalty;
      recordCategoryRule(
        'DURABILITY_LOW_DENSITY_HIGH_WEIGHT_PENALTY',
        'durability',
        -adj.lowDensityHighWeightDurabilityPenalty,
        `Top foam density ${density} lb/ft³ is below ${thresholds.durabilityMinFoamDensityLbFt3} lb/ft³ and profile weight ${profile.weightLb} lb is at/above ${thresholds.durabilityHighWeightLb} lb.`
      );
    } else if (density >= thresholds.durabilityMinFoamDensityLbFt3 + 0.5) {
      sub.durability += adj.highDensityDurabilityBonus;
      recordCategoryRule(
        'DURABILITY_HIGH_DENSITY_BONUS',
        'durability',
        adj.highDensityDurabilityBonus,
        `Top foam density ${density} lb/ft³ comfortably exceeds the ${thresholds.durabilityMinFoamDensityLbFt3} lb/ft³ threshold.`
      );
    }
  }

  for (const key of rules.categories) {
    sub[key] = round1(clamp(sub[key], 0, 10));
  }

  let weightedSum = 0;
  for (const key of rules.categories) {
    weightedSum += sub[key] * rules.weights[key];
  }
  const overallScore = Math.round(clamp(weightedSum, 0, 10) * 10);

  const riskFlags: RiskFlag[] = [];
  const riskRulesUsed: RiskRuleUsage[] = [];
  const ruleByCode = indexByCode(rules.riskFlagRules);

  {
    const rule = must(ruleByCode.SUPPORT_THRESHOLD_MISMATCH);
    const triggered = mattress.firmnessRating < bandMin || mattress.firmnessRating > bandMax;
    const direction = mattress.firmnessRating < bandMin ? 'softer' : 'firmer';
    const rationale = triggered
      ? `This mattress's firmness rating (${mattress.firmnessRating}/10) is ${direction} than the ` +
        `${bandMin}-${bandMax}/10 comfort band typical for a ${profile.sleepPosition} sleeper in the ` +
        `${weightBandKey} lb range.`
      : `Firmness rating (${mattress.firmnessRating}/10) falls within the ${bandMin}-${bandMax}/10 comfort band; rule not triggered.`;
    riskRulesUsed.push({
      ruleId: rule.code,
      triggered,
      thresholdId: `firmnessComfortBands.${profile.sleepPosition}.${weightBandKey}`,
      thresholdValue: [bandMin, bandMax],
      evaluatedValue: mattress.firmnessRating,
    });
    if (triggered) {
      riskFlags.push({ code: rule.code, category: rule.category, rationale, mitigation: rule.mitigation });
    }
  }

  {
    // Ported from src/scoreEngine.js exactly (see that file for the full
    // explanation): resolveProfileFirmness() was defined and exported
    // here too but never actually invoked - the same orphaned-function
    // bug existed in this duplicated copy. Purely additive: does not
    // touch bandMin/bandMax, sub.support, or SUPPORT_THRESHOLD_MISMATCH.
    const rule = must(ruleByCode.PREFERRED_FIRMNESS_MISMATCH);
    const preferredFirmness = resolveProfileFirmness(rules, profile);
    const mismatchThreshold = thresholds.preferredFirmnessMismatchPoints;
    const triggered =
      preferredFirmness !== null && Math.abs(mattress.firmnessRating - preferredFirmness) > mismatchThreshold;
    const rationale =
      preferredFirmness === null
        ? 'No firmness preference was given, so this check was skipped.'
        : triggered
          ? `You said you prefer a firmness around ${preferredFirmness}/10, but this mattress rates ${mattress.firmnessRating}/10 - a ${round1(Math.abs(mattress.firmnessRating - preferredFirmness))}-point difference.`
          : `This mattress's firmness (${mattress.firmnessRating}/10) is close to your stated preference (${preferredFirmness}/10).`;
    riskRulesUsed.push({
      ruleId: rule.code,
      triggered,
      thresholdId: 'thresholds.preferredFirmnessMismatchPoints',
      thresholdValue: mismatchThreshold,
      evaluatedValue: preferredFirmness === null ? null : round1(Math.abs(mattress.firmnessRating - preferredFirmness)),
    });
    if (triggered) {
      riskFlags.push({ code: rule.code, category: rule.category, rationale, mitigation: rule.mitigation });
    }
  }

  {
    const rule = must(ruleByCode.HEAT_RETENTION_LIKELY);
    const triggered = profile.sleepTemperature === 'hot' && sub.heat <= thresholds.heatRetentionMaxHeatScore;
    riskRulesUsed.push({
      ruleId: rule.code,
      triggered,
      thresholdId: 'thresholds.heatRetentionMaxHeatScore',
      thresholdValue: thresholds.heatRetentionMaxHeatScore,
      evaluatedValue: sub.heat,
    });
    if (triggered) {
      riskFlags.push({
        code: rule.code,
        category: rule.category,
        rationale:
          `Heat & airflow sub-score is ${sub.heat}/10 (at or below the ${thresholds.heatRetentionMaxHeatScore}/10 ` +
          `threshold), and this profile reports sleeping hot.`,
        mitigation: rule.mitigation,
      });
    }
  }

  {
    const rule = must(ruleByCode.EDGE_SUPPORT_CONCERN);
    const triggered = !mattress.edgeSupportReinforced && sub.edge < thresholds.edgeSupportMinScore;
    riskRulesUsed.push({
      ruleId: rule.code,
      triggered,
      thresholdId: 'thresholds.edgeSupportMinScore',
      thresholdValue: thresholds.edgeSupportMinScore,
      evaluatedValue: sub.edge,
    });
    if (triggered) {
      riskFlags.push({
        code: rule.code,
        category: rule.category,
        rationale:
          `No reinforced perimeter is specified, and the edge support sub-score is ${sub.edge}/10 ` +
          `(below the ${thresholds.edgeSupportMinScore}/10 threshold).`,
        mitigation: rule.mitigation,
      });
    }
  }

  {
    const rule = must(ruleByCode.DURABILITY_SAG_RISK);
    const triggered =
      density != null &&
      density < thresholds.durabilityMinFoamDensityLbFt3 &&
      weightLb >= thresholds.durabilityHighWeightLb;
    riskRulesUsed.push({
      ruleId: rule.code,
      triggered,
      thresholdId: 'thresholds.durabilityMinFoamDensityLbFt3 & thresholds.durabilityHighWeightLb',
      thresholdValue: {
        minDensity: thresholds.durabilityMinFoamDensityLbFt3,
        highWeightLb: thresholds.durabilityHighWeightLb,
      },
      evaluatedValue: { density: density ?? null, weightLb: profile.weightLb },
    });
    if (triggered) {
      riskFlags.push({
        code: rule.code,
        category: rule.category,
        rationale:
          `Top foam density is ${density} lb/ft³ (below the ${thresholds.durabilityMinFoamDensityLbFt3} lb/ft³ ` +
          `threshold) for a sleeper at ${profile.weightLb} lb (at or above the ${thresholds.durabilityHighWeightLb} lb ` +
          `threshold), which raises long-term sag risk.`,
        mitigation: rule.mitigation,
      });
    }
  }

  return {
    modelVersion: rules.version,
    scoreModelVersion: rules.version,
    mattressId: mattress.id || null,
    overallScore,
    subScores: sub,
    weights: rules.weights,
    comfortBand: { min: bandMin, max: bandMax, weightBand: weightBandKey },
    riskFlags,
    trace: {
      modelVersion: rules.version,
      categoryRulesUsed,
      riskRulesUsed,
    },
  };
}

// ===========================================================================
// v0.2 implementation (BEGIN v0.2). The root Node CLI copy in
// ../src/scoreEngine.js implements the same block in plain JavaScript;
// scripts/test-score-engine.js and lib/scoreEngine.v02.test.ts compare the
// two engines' outputs, not their source text.
// ===========================================================================

/** Round to 4 decimal places (weights), deterministic. */
function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function isRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10;
}

/**
 * Normalises the optional painFocus input. Accepts the v0.2 single value
 * ('shoulders' | 'hips' | 'lower-back' | 'whole-body' | 'none') or the
 * legacy array form (e.g. ['shoulder', 'hip']), mapped through
 * rules.painFocusAliases. Returns a sorted, de-duplicated list without 'none'.
 */
export function normalizePainFocus(rules: Pick<RulesV02, 'painFocusAliases'>, painFocus: unknown): PainFocus[] {
  const raw: readonly unknown[] = Array.isArray(painFocus) ? painFocus : painFocus == null ? [] : [painFocus];
  const out = new Set<PainFocus>();
  for (const value of raw) {
    if (typeof value !== 'string' || value === 'description') continue;
    const mapped = rules.painFocusAliases[value];
    if (mapped && mapped !== 'none') out.add(mapped as PainFocus);
  }
  return [...out].sort();
}

/** True when a weightModifiers rule's `when` clause matches the profile. */
function weightRuleApplies(rule: WeightRuleInput, profile: EngineProfile, painFocusList: readonly string[]): boolean {
  const when = rule.when;
  if (when.weightLbAtLeast !== undefined) return typeof profile.weightLb === 'number' && profile.weightLb >= (when.weightLbAtLeast as number);
  if (when.painFocus !== undefined) return painFocusList.indexOf(when.painFocus as string) !== -1;
  const key = Object.keys(when)[0] as string;
  return (profile as Record<string, unknown>)[key] === when[key];
}

/**
 * Computes the profile's effective dimension weights: base weights x every
 * applicable modifier, renormalised to sum to 1. Returns the weights plus
 * the list of modifier rules that applied (for the trace).
 */
export function computeEffectiveWeights(rules: WeightRulesInput, profile: EngineProfile): EffectiveWeights {
  // A rules dataset's categories are always the six score dimensions.
  const categories = rules.categories as readonly ScoreCategory[];
  const painFocusList = normalizePainFocus(rules, profile.painFocus);
  const raw: SubScores = { ...rules.baseWeights };
  const weightRulesUsed: WeightRuleUsage[] = [];
  for (const rule of rules.weightModifiers.rules) {
    if (!weightRuleApplies(rule, profile, painFocusList)) continue;
    for (const [dim, factor] of Object.entries(rule.multiply) as [ScoreCategory, number][]) raw[dim] *= factor;
    weightRulesUsed.push({ ruleId: rule.id, description: rule.description, multiply: rule.multiply });
  }
  const total = categories.reduce((sum, key) => sum + raw[key], 0);
  const effective = {} as SubScores;
  for (const key of categories) effective[key] = raw[key] / total;
  return { effective, weightRulesUsed, painFocusList };
}

/** 1.0 at band centre, insideEdgeFit at the band edges, then falling per point outside (floored at 0). */
function bandFitFor(fit: RulesV02['firmnessFit'], firmness: number, bandMin: number, bandMax: number): number {
  const centre = (bandMin + bandMax) / 2;
  const halfWidth = (bandMax - bandMin) / 2;
  if (firmness >= bandMin && firmness <= bandMax) {
    const offCentre = halfWidth > 0 ? Math.abs(firmness - centre) / halfWidth : 0;
    return 1 - (1 - fit.insideEdgeFit) * offCentre;
  }
  const distance = firmness < bandMin ? bandMin - firmness : firmness - bandMax;
  return Math.max(0, fit.insideEdgeFit - fit.outsidePerPointLoss * distance);
}

type BandDirection = 'in-band' | 'softer' | 'firmer';

function scoreV0_2(rules: RulesV02, profile: EngineProfile, mattress: ScoringInputV02): ScoreResult {
  const fit = rules.firmnessFit;
  const thresholds = rules.thresholds;
  const ruleCatalogById = indexById(rules.categoryRuleCatalog);
  const ruleByCode = indexByCode(rules.riskFlagRules);
  const type = mattress.type;
  const typeKey = rules.typeBaselines[type] ? type : 'default';
  const baseline = rules.typeBaselines[typeKey] as SubScores;

  const weightBandKey = resolveWeightBand(rules, profile.weightLb);
  const [bandMin, bandMax] = resolveComfortBand(rules, profile.sleepPosition, weightBandKey);
  const { effective: effectiveWeights, weightRulesUsed, painFocusList } = computeEffectiveWeights(rules, profile);

  // Keys are filled in a fixed order below (support, pressureRelief, then
  // the rated dimensions); that insertion order is part of the output.
  const sub = {} as SubScores;
  const dimensionProvenance = {} as Record<ScoreCategory, DimensionProvenance>;
  const categoryRulesUsed: CategoryRuleUsageV02[] = [];
  function record(ruleId: string, category: ScoreCategory, delta: number, note: string, value?: number): void {
    const entry: CategoryRuleUsageV02 = { ruleId, category, description: must(ruleCatalogById[ruleId]).description, delta: round1(delta), note };
    if (value !== undefined) entry.value = round1(value);
    categoryRulesUsed.push(entry);
  }

  // --- Firmness-derived dimensions: support + pressure relief ---
  const firmnessKnown = isRating(mattress.firmnessRating);
  const firmness = firmnessKnown ? (mattress.firmnessRating as number) : fit.unknownFirmnessNeutral;
  const bandFit = bandFitFor(fit, firmness, bandMin, bandMax);
  let bandDistance = 0;
  let bandDirection: BandDirection = 'in-band';
  if (firmness < bandMin) { bandDistance = bandMin - firmness; bandDirection = 'softer'; }
  else if (firmness > bandMax) { bandDistance = firmness - bandMax; bandDirection = 'firmer'; }

  let support = fit.supportFloor + fit.supportRange * bandFit;
  record('SUPPORT_FIRMNESS_FIT', 'support', 0,
    `Firmness ${round1(firmness)}/10 vs comfort band ${bandMin}-${bandMax}: band fit ${round1(bandFit * 100)}%.`, support);
  const typeMod = fit.supportTypeModifier[typeKey] ?? fit.supportTypeModifier.default;
  if (typeMod !== 0) {
    support += typeMod;
    record('SUPPORT_TYPE_MODIFIER', 'support', typeMod, `Construction type "${type}".`);
  }
  if (bandDirection === 'softer') {
    const extra = -fit.supportTooSoftExtraPerPoint * bandDistance;
    support += extra;
    record('SUPPORT_FIRMNESS_FIT', 'support', extra, `${round1(bandDistance)} point(s) softer than the band: extra alignment penalty.`);
  }

  let pressure = fit.pressureTypeBase[typeKey] ?? fit.pressureTypeBase.default;
  let pressureDelta: number;
  if (bandDirection === 'firmer') {
    pressureDelta = -fit.pressureTooFirmPerPoint * bandDistance;
  } else if (bandDirection === 'softer') {
    pressureDelta = fit.pressureTooSoftBonus;
  } else {
    const position = bandMax > bandMin ? (firmness - bandMin) / (bandMax - bandMin) : 0;
    pressureDelta = fit.pressureInBandBonusAtSoftEdge +
      (fit.pressureInBandBonusAtFirmEdge - fit.pressureInBandBonusAtSoftEdge) * position;
  }
  pressure += pressureDelta;
  record('PRESSURE_FIRMNESS_FIT', 'pressureRelief', pressureDelta,
    `Type "${type}" base ${fit.pressureTypeBase[typeKey] ?? fit.pressureTypeBase.default}; firmness ${round1(firmness)}/10 is ${bandDirection === 'in-band' ? 'within' : bandDirection + ' than'} the ${bandMin}-${bandMax} band.`, pressure);

  if (firmnessKnown) {
    dimensionProvenance.support = 'measured';
    dimensionProvenance.pressureRelief = 'measured';
  } else {
    // Unknown firmness must not read as a strong positive OR a strong
    // negative, so the band-fit math above is discarded and the capped
    // construction-type estimate is used instead (still traced above).
    support = Math.min(baseline.support, rules.estimateCap);
    pressure = Math.min(baseline.pressureRelief, rules.estimateCap);
    dimensionProvenance.support = 'estimated';
    dimensionProvenance.pressureRelief = 'estimated';
    record('FIRMNESS_UNKNOWN', 'support', 0, `No firmness on file; "${type}" support baseline ${baseline.support}/10 capped at ${rules.estimateCap}.`, support);
    record('FIRMNESS_UNKNOWN', 'pressureRelief', 0, `No firmness on file; "${type}" pressure-relief baseline ${baseline.pressureRelief}/10 capped at ${rules.estimateCap}.`, pressure);
  }
  sub.support = support;
  sub.pressureRelief = pressure;

  // --- Rated dimensions: heat, motion, edge, durability ---
  for (const [key, field] of Object.entries(rules.ratedDimensions)) {
    if (key === 'description') continue;
    const dim = key as ScoreCategory;
    const rating = (mattress as unknown as Record<string, unknown>)[field];
    if (isRating(rating)) {
      sub[dim] = rating;
      dimensionProvenance[dim] = 'measured';
      record('RATED_DIMENSION', dim, 0, `Third-party rating ${rating}/10 (${field}).`, rating);
    } else {
      const estimate = Math.min(baseline[dim], rules.estimateCap);
      sub[dim] = estimate;
      dimensionProvenance[dim] = 'estimated';
      record('ESTIMATED_FROM_TYPE', dim, 0, `No rating on file; "${type}" baseline ${baseline[dim]}/10, capped at ${rules.estimateCap}.`, estimate);
    }
  }

  // --- Durability adjustments ---
  const dur = rules.durability;
  if (type === 'foam' && typeof profile.weightLb === 'number' && profile.weightLb >= dur.heavierSleeperLb) {
    sub.durability -= dur.heavierSleeperFoamPenalty;
    record('DURABILITY_HEAVIER_SLEEPER_FOAM', 'durability', -dur.heavierSleeperFoamPenalty,
      `All-foam construction for a sleeper at ${profile.weightLb} lb (>= ${dur.heavierSleeperLb} lb).`);
  }
  const density = isRating(mattress.topFoamDensityLbFt3) ? mattress.topFoamDensityLbFt3 : null;
  const lowDensityRisk = density != null && density < dur.lowDensityThresholdLbFt3 &&
    typeof profile.weightLb === 'number' && profile.weightLb >= dur.lowDensityHighWeightLb;
  if (lowDensityRisk) {
    sub.durability -= dur.lowDensityPenalty;
    record('DURABILITY_LOW_DENSITY_HIGH_WEIGHT_PENALTY', 'durability', -dur.lowDensityPenalty,
      `Top foam density ${density} lb/ft³ is below ${dur.lowDensityThresholdLbFt3} lb/ft³ for a sleeper at ${profile.weightLb} lb.`);
  }

  for (const key of rules.categories) sub[key] = round1(clamp(sub[key], 0, 10));

  // --- Overall: weighted sub-scores, then the stated-preference adjustment ---
  let weightedSum = 0;
  for (const key of rules.categories) weightedSum += sub[key] * effectiveWeights[key];
  const weightedTotal = clamp(weightedSum, 0, 10) * 10;

  const preferred = resolveProfileFirmness(rules, profile);
  const pref = rules.preferenceFit;
  const preferenceDistance = preferred !== null && firmnessKnown ? Math.abs(firmness - preferred) : null;
  let preferenceAdjustment = 0;
  const overallAdjustments: NonNullable<ScoreTrace['overallAdjustments']> = [];
  if (preferenceDistance !== null) {
    preferenceAdjustment = -Math.min(pref.maxPenalty, Math.max(0, preferenceDistance - pref.tolerancePoints) * pref.pointsPerFirmnessPoint);
    if (preferenceAdjustment !== 0) {
      overallAdjustments.push({
        ruleId: 'PREFERENCE_FIT_PENALTY',
        description: must(ruleCatalogById.PREFERENCE_FIT_PENALTY).description,
        delta: round1(preferenceAdjustment),
        note: `Firmness ${round1(firmness)}/10 is ${round1(preferenceDistance)} point(s) from the stated preference (${preferred}/10).`,
      });
    }
  }
  const overallScore = Math.round(clamp(weightedTotal + preferenceAdjustment, 0, 100));

  // --- Risk flags (every rule evaluated + recorded) ---
  const riskFlags: RiskFlag[] = [];
  const riskRulesUsed: RiskRuleUsage[] = [];
  function evaluate(
    code: RiskFlagCode,
    triggered: boolean,
    details: { thresholdValue: unknown; evaluatedValue: unknown },
    rationale: string,
    basis: DimensionProvenance
  ): void {
    const rule = must(ruleByCode[code]);
    riskRulesUsed.push({ ruleId: code, triggered, thresholdId: rule.thresholdId, ...details });
    if (triggered) riskFlags.push({ code, category: rule.category, rationale, mitigation: rule.mitigation, basis });
  }

  evaluate('SUPPORT_THRESHOLD_MISMATCH', firmnessKnown && bandDirection !== 'in-band',
    { thresholdValue: [bandMin, bandMax], evaluatedValue: firmnessKnown ? firmness : null },
    `This mattress's firmness (${round1(firmness)}/10) is ${round1(bandDistance)} point(s) ${bandDirection} than the ${bandMin}-${bandMax}/10 range typical for a ${profile.sleepPosition} sleeper in the ${weightBandKey} lb range.`,
    'measured');

  evaluate('PREFERRED_FIRMNESS_MISMATCH', preferenceDistance !== null && preferenceDistance > thresholds.preferredFirmnessMismatchPoints,
    { thresholdValue: thresholds.preferredFirmnessMismatchPoints, evaluatedValue: preferenceDistance === null ? null : round1(preferenceDistance) },
    `You said you prefer a firmness around ${preferred}/10, but this mattress is about ${round1(firmness)}/10 - a ${round1(preferenceDistance ?? 0)}-point difference.`,
    'measured');

  evaluate('HEAT_RETENTION_LIKELY', profile.sleepTemperature === 'hot' && sub.heat <= thresholds.heatRetentionMaxHeatScore,
    { thresholdValue: thresholds.heatRetentionMaxHeatScore, evaluatedValue: sub.heat },
    dimensionProvenance.heat === 'measured'
      ? `Its cooling is rated ${sub.heat}/10 by an independent reviewer, and you sleep hot.`
      : `No independent cooling rating is on file; based on its construction, cooling is estimated at ${sub.heat}/10, and you sleep hot.`,
    dimensionProvenance.heat);

  const edgeImportant = profile.edgeImportance === 'high';
  const edgeThreshold = edgeImportant ? thresholds.edgeSupportMinScoreWhenImportant : thresholds.edgeSupportMinScore;
  evaluate('EDGE_SUPPORT_CONCERN', profile.edgeImportance !== 'low' && sub.edge < edgeThreshold,
    { thresholdValue: edgeThreshold, evaluatedValue: sub.edge },
    dimensionProvenance.edge === 'measured'
      ? `Edge support is rated ${sub.edge}/10 by an independent reviewer${edgeImportant ? ', and you said edge support matters a lot' : ''}.`
      : `No independent edge rating is on file; based on its construction, edge support is estimated at ${sub.edge}/10.`,
    dimensionProvenance.edge);

  evaluate('MOTION_TRANSFER_LIKELY', profile.motionSensitivity === 'couple-high' && sub.motion < thresholds.motionTransferMinScore,
    { thresholdValue: thresholds.motionTransferMinScore, evaluatedValue: sub.motion },
    dimensionProvenance.motion === 'measured'
      ? `Motion isolation is rated ${sub.motion}/10 by an independent reviewer, and you are easily woken by a partner's movement.`
      : `No independent motion rating is on file; based on its construction, motion isolation is estimated at ${sub.motion}/10, and you are easily woken by a partner's movement.`,
    dimensionProvenance.motion);

  const pressureSensitive = profile.sleepPosition === 'side' || painFocusList.indexOf('shoulders') !== -1 || painFocusList.indexOf('hips') !== -1;
  evaluate('PRESSURE_POINT_RISK', pressureSensitive && sub.pressureRelief < thresholds.pressurePointMinScore,
    { thresholdValue: thresholds.pressurePointMinScore, evaluatedValue: sub.pressureRelief },
    `Pressure relief scores ${sub.pressureRelief}/10 for your profile; ${profile.sleepPosition === 'side' ? 'side sleeping' : 'shoulder or hip discomfort'} makes pressure points more likely.`,
    dimensionProvenance.pressureRelief);

  const heavier = typeof profile.weightLb === 'number' && profile.weightLb >= dur.heavierSleeperLb;
  const ratedWearRisk = heavier && dimensionProvenance.durability === 'measured' && sub.durability < thresholds.durabilityHeavierSleeperMinScore;
  evaluate('DURABILITY_SAG_RISK', lowDensityRisk || ratedWearRisk,
    { thresholdValue: { minDensity: dur.lowDensityThresholdLbFt3, heavierSleeperLb: dur.heavierSleeperLb, minRatedDurability: thresholds.durabilityHeavierSleeperMinScore },
      evaluatedValue: { density, weightLb: profile.weightLb ?? null, durability: sub.durability, durabilityProvenance: dimensionProvenance.durability } },
    lowDensityRisk
      ? `Top foam density is ${density} lb/ft³ (below ${dur.lowDensityThresholdLbFt3}) for a sleeper at ${profile.weightLb} lb, which raises long-term sag risk.`
      : `Durability scores ${sub.durability}/10 against an independent rating, and at ${profile.weightLb} lb you will put more wear on the comfort layers.`,
    'measured');

  const roundedWeights = {} as SubScores;
  for (const key of rules.categories) roundedWeights[key] = round4(effectiveWeights[key]);

  const comfortBand: ComfortBand = { min: bandMin, max: bandMax, weightBand: weightBandKey };
  const firmnessFit: FirmnessFit = {
    firmness: firmnessKnown ? round1(firmness) : null,
    known: firmnessKnown,
    bandDirection: firmnessKnown ? bandDirection : 'unknown',
    bandDistance: firmnessKnown ? round1(bandDistance) : null,
    bandFit: round4(bandFit),
    preferred,
    preferenceDistance: preferenceDistance === null ? null : round1(preferenceDistance),
  };

  return {
    modelVersion: rules.version,
    scoreModelVersion: rules.version,
    mattressId: mattress.id || null,
    overallScore,
    subScores: sub,
    weights: roundedWeights,
    effectiveWeights: roundedWeights,
    baseWeights: rules.baseWeights,
    dimensionProvenance,
    comfortBand,
    firmnessFit,
    scoreBreakdown: {
      weightedSubScoreTotal: round1(weightedTotal),
      preferenceAdjustment: round1(preferenceAdjustment),
    },
    profileFactors: {
      painFocus: painFocusList,
      edgeImportance: (profile.edgeImportance ?? null) as NonNullable<ScoreResult['profileFactors']>['edgeImportance'],
      motionSensitivity: (profile.motionSensitivity ?? null) as NonNullable<ScoreResult['profileFactors']>['motionSensitivity'],
    },
    riskFlags,
    trace: {
      modelVersion: rules.version,
      categoryRulesUsed,
      riskRulesUsed,
      weightRulesUsed,
      overallAdjustments,
    },
  };
}

// ===========================================================================
// END v0.2
// ===========================================================================

type Implementation = (rules: EngineRules, profile: EngineProfile, mattress: EngineMattress) => ScoreResult;

// Each version reads only its own input fields; the caller (lib/matchLogic)
// builds the matching adapter shape for the version it asks for.
const VERSION_IMPLEMENTATIONS: Record<ScoreVersion, Implementation> = {
  '0.1': (rules, profile, mattress) => scoreV0_1(rules as RulesV01, profile, mattress as ScoringInputV01),
  '0.2': (rules, profile, mattress) => scoreV0_2(rules as RulesV02, profile, mattress),
};

/**
 * Public entry point.
 * @param version e.g. "0.1"
 * @param profile Sleep Profile
 * @param mattress Mattress spec (the adapter shape for that version)
 */
export function scoreEngine(version: string, profile: EngineProfile, mattress: EngineMattress): ScoreResult {
  // Plain property lookup, exactly like the JS original.
  const impl = (VERSION_IMPLEMENTATIONS as Record<string, Implementation | undefined>)[version];
  if (!impl) {
    throw new Error(
      `Unsupported scoring model version "${version}". Supported versions: ${Object.keys(
        VERSION_IMPLEMENTATIONS
      ).join(', ')}`
    );
  }
  const rules = loadRules(version);
  return impl(rules, profile, mattress);
}
