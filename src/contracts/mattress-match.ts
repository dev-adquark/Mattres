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

/** Matches the `type` enum in data/schema/mattress.schema.json. */
export type MattressType = 'foam' | 'hybrid' | 'innerspring';

/**
 * Comfort/pain priorities collected on the full form. Used to build the
 * "priority chips" summary and to bias review-highlight ordering — see
 * formToProfile.example.ts and resultsPageViewModel.example.ts.
 */
export type PainFocusArea = 'shoulder' | 'hip' | 'lowerBack' | 'neck';

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

/** Matches the four risk-flag rule codes defined in data/rules/0.1.json. */
export type RiskFlagCode =
  | 'SUPPORT_THRESHOLD_MISMATCH'
  | 'HEAT_RETENTION_LIKELY'
  | 'EDGE_SUPPORT_CONCERN'
  | 'DURABILITY_SAG_RISK';

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
  painFocus: PainFocusArea[];
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
  scoreModelVersion: string;
  overallScore: number;
  subScores: Record<ScoreCategory, number>;
  comfortBand: ComfortBand;
  riskFlags: RiskFlag[];
  mattress: MattressSummary;
  reviewHighlights: ReviewHighlight[];
  placement: ListingPlacement;
  /** 1-based position in the ranked list for this profile; used to derive isTopMatch and for stable display order. */
  rank: number;
  /** Comparison-tray selection state; toggled by the UI, not recomputed by scoring. */
  isSelectedForComparison: boolean;
}
