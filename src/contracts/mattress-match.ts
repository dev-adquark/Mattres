/**
 * mattress-match.ts
 * -----------------
 * The single internal data contract used end-to-end: form input -> canonical
 * SleepProfile -> scoring -> RecommendationResult -> results page rendering.
 *
 * Design rule for this file: every field exists because something concrete
 * reads it. Where that "something" is existing runtime code, the comment
 * says so directly:
 *   - src/scoreEngine.js        (scoring engine v0.1)
 *   - src/ingest/tagReviews.js  (review-tag ingestion)
 *   - data/schema/*.json        (controlled vocabularies)
 * Where it's a UI/API behavior this task is defining for the first time, the
 * comment points at the example adapter in this same directory that
 * exercises it (formToProfile.example.ts, buildRecommendationResult.example.ts,
 * resultsPageViewModel.example.ts) so nothing here is speculative.
 */

// ---------------------------------------------------------------------------
// Enums / controlled vocabularies
// These string unions are copy-aligned with the JSON datasets already in the
// repo, not invented independently, so the contract can't silently drift
// from the data that actually drives scoring and tagging.
// ---------------------------------------------------------------------------

/** Matches the keys of firmnessComfortBands in data/rules/0.1.json. */
export type SleepPosition = 'side' | 'back' | 'stomach' | 'combination';

/** Matches the keys of firmnessLabelScale in data/rules/0.1.json. */
export type FirmnessLabel =
  | 'soft'
  | 'medium-soft'
  | 'medium'
  | 'medium-firm'
  | 'firm'
  | 'extra-firm';

/** Read by scoreEngine.js's HEAT_RETENTION_LIKELY rule (branches on 'hot'). */
export type SleepTemperature = 'cold' | 'neutral' | 'hot';

/** Read by scoreEngine.js's motion-isolation adjustment (branches on 'couple-high'). */
export type MotionSensitivity = 'single' | 'couple-low' | 'couple-high';

/** Matches the `type` enum in data/schema/mattress.schema.json (latex added with scoring v0.2). */
export type MattressType = 'foam' | 'hybrid' | 'innerspring' | 'latex';

/**
 * Comfort/pain priorities collected on the full form. Used to build the
 * "priority chips" summary and to bias review-highlight ordering — see
 * formToProfile.example.ts and resultsPageViewModel.example.ts.
 */
export type PainFocusArea = 'shoulder' | 'hip' | 'lowerBack' | 'neck';

/**
 * v0.2 single-value pain focus (react-version/lib/profileValidation.ts).
 * Re-weights dimensions in scoring v0.2 (see weightModifiers in
 * data/rules/0.2.json). Legacy PainFocusArea arrays are still accepted and
 * normalised via painFocusAliases ('neck' has no v0.2 effect).
 */
export type PainFocus = 'shoulders' | 'hips' | 'lower-back' | 'whole-body' | 'none';

/** Optional v0.2 input: how much edge support matters to the sleeper. */
export type EdgeImportance = 'low' | 'medium' | 'high';

/** Scoring model versions the engine implements. v0.2 is the default for /api/match. */
export type ScoreVersion = '0.1' | '0.2';

/** v0.2: whether a dimension's sub-score is based on real catalog data or a construction-type estimate. */
export type DimensionProvenance = 'measured' | 'estimated';

/** Matches the `tag` values in data/schema/review-tags.vocabulary.json exactly. */
export type ReviewTag =
  | 'sleepsHot'
  | 'coolSleeper'
  | 'greatEdgeSupport'
  | 'poorEdgeSupport'
  | 'tooFirm'
  | 'tooSoft'
  | 'offGassing'
  | 'motionIsolationGood'
  | 'sagsAfterTime'
  | 'pressureReliefGood'
  | 'greatValue';

/** Matches the six categories scoreEngine.js computes sub-scores for. */
export type ScoreCategory = 'pressureRelief' | 'support' | 'heat' | 'motion' | 'edge' | 'durability';

/** Matches the risk-flag rule codes in data/rules/0.1.json and data/rules/0.2.json (the last two are v0.2 only). */
export type RiskFlagCode =
  | 'SUPPORT_THRESHOLD_MISMATCH'
  | 'PREFERRED_FIRMNESS_MISMATCH'
  | 'HEAT_RETENTION_LIKELY'
  | 'EDGE_SUPPORT_CONCERN'
  | 'DURABILITY_SAG_RISK'
  | 'MOTION_TRANSFER_LIKELY'
  | 'PRESSURE_POINT_RISK';

/** Matches the `id` values in data/rules/0.1.json's categoryRuleCatalog. */
export type CategoryRuleId =
  | 'BASELINE_BY_TYPE'
  | 'SUPPORT_BAND_BONUS'
  | 'SUPPORT_BAND_PENALTY'
  | 'PRESSURE_RELIEF_SOFTER_BONUS'
  | 'PRESSURE_RELIEF_FIRMER_PENALTY'
  | 'HEAT_COOLING_COVER_BONUS'
  | 'HEAT_NO_COOLING_FOAM_PENALTY'
  | 'MOTION_COUPLE_HIGH_LOW_ISOLATION_PENALTY'
  | 'EDGE_REINFORCED_BONUS'
  | 'DURABILITY_LOW_DENSITY_HIGH_WEIGHT_PENALTY'
  | 'DURABILITY_HIGH_DENSITY_BONUS'
  // v0.2 (data/rules/0.2.json categoryRuleCatalog)
  | 'RATED_DIMENSION'
  | 'ESTIMATED_FROM_TYPE'
  | 'SUPPORT_FIRMNESS_FIT'
  | 'SUPPORT_TYPE_MODIFIER'
  | 'PRESSURE_FIRMNESS_FIT'
  | 'FIRMNESS_UNKNOWN'
  | 'DURABILITY_HEAVIER_SLEEPER_FOAM'
  | 'PREFERENCE_FIT_PENALTY';

// ---------------------------------------------------------------------------
// Form input contracts
// Two distinct shapes because the landing "Quick Match" and the full profile
// form collect different fields, but both must normalize into one
// SleepProfile — see formToProfile.example.ts.
// ---------------------------------------------------------------------------

/**
 * Landing page "Quick Match" — the minimum needed to run the scoring engine
 * at all (sleepPosition + weightLb resolve a comfort band; firmnessPreference
 * and sleepTemperature drive the support/heat adjustments in scoreEngine.js).
 * Deliberately 4 fields: this form's entire job is to be fast.
 */
export interface QuickMatchFormInput {
  sleepPosition: SleepPosition;
  weightLb: number;
  firmnessPreference: FirmnessLabel;
  sleepTemperature: SleepTemperature;
}

/**
 * Full Sleep Profile form. A superset of the quick match fields, plus the
 * detail needed for risk flags beyond support/heat (motionSensitivity feeds
 * the motion-isolation adjustment; painFocus/heightIn/mattressTypePreference/
 * budgetUsd are read on the results page — see the example adapters).
 */
export interface SleepProfileFormInput extends QuickMatchFormInput {
  motionSensitivity: MotionSensitivity;
  /** Empty array is valid — "no particular pain focus" is a real answer. */
  painFocus: PainFocusArea[];
  heightIn?: number;
  /** Empty/undefined = no type preference; used to pre-filter the catalog. */
  mattressTypePreference?: MattressType[];
  budgetUsd?: { min: number; max: number };
}

// ---------------------------------------------------------------------------
// SleepProfile — the canonical, normalized shape used end-to-end
// ---------------------------------------------------------------------------

/**
 * The single normalized Sleep Profile shape passed to the scoring engine and
 * carried alongside results for audit/analytics. Both QuickMatchFormInput
 * and SleepProfileFormInput normalize into this one shape (see
 * formToProfile.example.ts) so scoring and rendering never have to branch on
 * which form produced the input.
 *
 * Fields consumed directly by scoreEngine.js: sleepPosition, weightLb,
 * preferredFirmnessLabel (as `preferredFirmnessLabel` — see
 * resolveProfileFirmness), sleepTemperature, motionSensitivity.
 * Fields consumed by UI/API examples in this directory: profileId, source,
 * createdAt, painFocus, heightIn, mattressTypePreference, budgetUsd.
 */
export interface SleepProfile {
  /** Generated once per submission; correlates RecommendationResult back to the inputs that drove it. */
  profileId: string;
  sleepPosition: SleepPosition;
  weightLb: number;
  preferredFirmnessLabel: FirmnessLabel;
  sleepTemperature: SleepTemperature;
  motionSensitivity: MotionSensitivity;
  /** Legacy array form, or the v0.2 single value. */
  painFocus: PainFocusArea[] | PainFocus;
  /** v0.2 optional input; omitted = no edge re-weighting. */
  edgeImportance?: EdgeImportance;
  /** Optional; /api/match defaults to '0.2'. */
  scoreVersion?: ScoreVersion;
  heightIn?: number;
  mattressTypePreference?: MattressType[];
  budgetUsd?: { min: number; max: number };
  /** Which form produced this profile — read by results-page analytics (PRD success metric: form completion by entry point). */
  source: 'quick' | 'full';
  /** ISO 8601 timestamp. */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Scoring output pieces
// Shaped to match scoreEngine.js's real return value field-for-field.
// ---------------------------------------------------------------------------

/** Matches the object shape scoreEngine.js pushes into its `riskFlags` array. */
export interface RiskFlag {
  code: RiskFlagCode;
  category: ScoreCategory;
  rationale: string;
  mitigation: string;
  /** v0.2 only: whether the flag rests on real data or a construction-type estimate. */
  basis?: DimensionProvenance;
}

/** Matches scoreEngine.js's `comfortBand` return field exactly. */
export interface ComfortBand {
  min: number;
  max: number;
  weightBand: string;
}

/** Matches the shape tagReviews.js produces per highlight item. */
export interface ReviewHighlight {
  tag: ReviewTag;
  label: string;
  sentiment: 'positive' | 'negative';
  category: string;
  confidence: 'high' | 'medium' | 'low';
  matchCount: number;
  snippet: string;
}

// ---------------------------------------------------------------------------
// Scoring trace — auditability
// Matches scoreEngine.js's `trace` return field exactly, so the JSON coming
// back from GET /api/score-trace can be assigned directly to this type with
// no adapter. See src/scoreEngine.js's scoreV0_1() for where each of these
// entries is produced.
// ---------------------------------------------------------------------------

/**
 * One category-scoring rule that fired while computing a sub-score.
 * `category` is null for BASELINE_BY_TYPE, which seeds all six categories
 * at once rather than adjusting a single one.
 */
export interface CategoryRuleUsage {
  ruleId: CategoryRuleId;
  category: ScoreCategory | null;
  description: string;
  delta: number;
  note: string;
}

/**
 * One risk-flag rule as evaluated, whether or not it triggered. Untriggered
 * rules are included deliberately — "why didn't this flag fire?" is as much
 * a part of the audit trail as "why did it".
 */
export interface RiskRuleUsage {
  ruleId: RiskFlagCode;
  triggered: boolean;
  thresholdId: string;
  thresholdValue: unknown;
  evaluatedValue: unknown;
}

/** v0.2: a weight modifier that applied to this profile. */
export interface WeightRuleUsage {
  ruleId: string;
  description: string;
  multiply: Partial<Record<ScoreCategory, number>>;
}

/** v0.2: an adjustment applied to the overall score after the weighted sub-score total. */
export interface OverallAdjustment {
  ruleId: 'PREFERENCE_FIT_PENALTY';
  description: string;
  delta: number;
  note: string;
}

/** Matches scoreEngine.js's `trace` return field exactly. */
export interface ScoreTrace {
  modelVersion: string;
  categoryRulesUsed: CategoryRuleUsage[];
  riskRulesUsed: RiskRuleUsage[];
  /** v0.2 only. */
  weightRulesUsed?: WeightRuleUsage[];
  /** v0.2 only. */
  overallAdjustments?: OverallAdjustment[];
}

/** v0.2: how the mattress's stated firmness relates to the sleeper. */
export interface FirmnessFit {
  /** null when the catalog has no firmness. */
  firmness: number | null;
  known: boolean;
  bandDirection: 'in-band' | 'softer' | 'firmer' | 'unknown';
  bandDistance: number | null;
  bandFit: number;
  preferred: number | null;
  preferenceDistance: number | null;
}

/** Engine output (scoreEngine(version, profile, mattress)). v0.2-only fields are optional. */
export interface ScoreResult {
  modelVersion: string;
  scoreModelVersion: string;
  mattressId: string | null;
  overallScore: number;
  subScores: Record<ScoreCategory, number>;
  /** v0.1: fixed base weights. v0.2: the effective weights used (same as effectiveWeights). */
  weights: Record<ScoreCategory, number>;
  comfortBand: ComfortBand;
  riskFlags: RiskFlag[];
  trace: ScoreTrace;
  effectiveWeights?: Record<ScoreCategory, number>;
  baseWeights?: Record<ScoreCategory, number>;
  dimensionProvenance?: Record<ScoreCategory, DimensionProvenance>;
  firmnessFit?: FirmnessFit;
  scoreBreakdown?: { weightedSubScoreTotal: number; preferenceAdjustment: number };
  profileFactors?: { painFocus: PainFocus[]; edgeImportance: EdgeImportance | null; motionSensitivity: MotionSensitivity | null };
}

/** react-version/lib/explain.ts explainMatch() output, attached to every matchProfile() item as `explanation`. */
export interface MatchExplanation {
  tier: { id: 'excellent' | 'strong' | 'good' | 'fair' | 'weak' | 'unscored'; label: string; description: string; min: number | null; max: number | null };
  headline: string;
  /** dimension is a ScoreCategory, or 'preference' for the stated-firmness fit. Only measured dimensions appear. */
  reasons: { dimension: ScoreCategory | 'preference'; text: string }[];
  /** `code` is a rendering/analytics key only - never shown to users. */
  watchOuts: { code: RiskFlagCode | 'MULTIPLE_FIRMNESS_OPTIONS'; severity: 'info' | 'caution' | 'warning'; title: string; text: string; mitigation: string }[];
  profileFactors: { id: string; label: string; text: string }[];
  dataNotes: { id: string; text: string }[];
}

// ---------------------------------------------------------------------------
// Placement metadata — sponsored vs algorithmic
// ---------------------------------------------------------------------------

/**
 * A listing's placement determines which badge the UI shows. Modeled as a
 * discriminated union (rather than a loose `isSponsored: boolean`) so a
 * sponsored listing can't accidentally also claim to be a "top match" —
 * those are mutually exclusive by construction, matching the disclosures
 * page's promise that "a sponsored listing is never blended into, or
 * substituted for, a mattress's Match Score position."
 */
export type ListingPlacement =
  | { kind: 'algorithmic'; isTopMatch: boolean }
  | { kind: 'sponsored'; verifiedAt: string; sponsorName?: string };

/** The two canonical badge strings the UI renders, computed the same way everywhere. */
export interface PlacementBadge {
  label: 'Sponsored Verified' | 'Algorithmic Pick';
  /** True for the #1 algorithmic slot; UI can add a "Top match" ribbon on top of the base label. */
  emphasis: boolean;
}

export function getPlacementBadge(placement: ListingPlacement): PlacementBadge {
  if (placement.kind === 'sponsored') {
    return { label: 'Sponsored Verified', emphasis: false };
  }
  return { label: 'Algorithmic Pick', emphasis: placement.isTopMatch };
}

// ---------------------------------------------------------------------------
// Mattress summary — the catalog fields a result card actually renders
// ---------------------------------------------------------------------------

/**
 * A trimmed view of a data/mattress-catalog.json entry, plus the two fields
 * (priceUsd, affiliateUrl) the results page renders that ingestion doesn't
 * produce yet (see the "Known gaps" note in this file's companion README
 * section). Intentionally not the full catalog entry — dataQualityNotes,
 * sourceConfidence, etc. are ingestion-time concerns, not results-page ones.
 */
export interface MattressSummary {
  mattressId: string;
  brand: string;
  model: string;
  type: MattressType;
  retailPartners: string[];
  /** Not yet produced by scripts/ingest-mattresses.js — see README. */
  priceUsd?: number;
  affiliateUrl?: string;
}

// ---------------------------------------------------------------------------
// RecommendationResult — one row of the results page / comparison tray
// ---------------------------------------------------------------------------

/**
 * One scored mattress on the results/compare page. Aggregates the scoring
 * engine's output, the catalog summary, tagged review highlights, and
 * placement metadata into the single shape both the results list and the
 * comparison tray render from — see buildRecommendationResult.example.ts and
 * resultsPageViewModel.example.ts.
 */
export interface RecommendationResult {
  mattressId: string;
  /** Which SleepProfile produced this result — audit trail per the PRD's "audit-ready scoring logic". */
  profileId: string;
  /** Surfaced on the methodology page and on each recommendation card, per this task's brief. */
  modelVersion: string;
  overallScore: number;
  subScores: Record<ScoreCategory, number>;
  comfortBand: ComfortBand;
  riskFlags: RiskFlag[];
  /** Ties every sub-score and every risk flag back to the rule/threshold id that produced it — powers the "Why this match?" section. */
  trace: ScoreTrace;
  mattress: MattressSummary;
  reviewHighlights: ReviewHighlight[];
  placement: ListingPlacement;
  /** 1-based position in the ranked list for this profile; used to derive isTopMatch and for stable display order. */
  rank: number;
  /** Comparison-tray selection state; toggled by the UI, not recomputed by scoring. */
  isSelectedForComparison: boolean;
}
