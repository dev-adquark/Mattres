/**
 * Domain types for the Mattress Match Score app - the one place UI, lib and
 * route code get their data shapes from.
 *
 * Every type here is derived from real runtime code or data, never invented:
 *   - MattressEntry      lib/data/mattress-catalog.json (field-by-field audit of all 37 records)
 *   - SleepProfile ...   lib/profileValidation.ts + lib/rules/0.2.json (mirrors ../src/contracts/mattress-match.ts,
 *                        which this app cannot import: it builds nothing from outside react-version/)
 *   - ScoreResult        lib/scoreEngine.ts return value (v0.1 + v0.2 fields)
 *   - MatchItem          lib/matchLogic.ts matchProfile() results[]
 *   - Explanation        lib/explain.ts explainMatch()
 *   - Tier               lib/scoreTiers.ts
 *   - OutboundCta        lib/outbound.ts ctaFor()
 *   - AnalyticsEventName lib/analytics.ts EVENTS (re-exported)
 *   - Nav*               lib/site.ts NAV_MENU / FOOTER_GROUPS
 *   - Search*            lib/searchIndex.ts
 *   - Guide, CategoryPage, CompareTopic, VsPage  lib/content/guides.ts, lib/categoryPages.ts,
 *                        lib/compareTopics.ts, lib/comparePairs.data.mts
 *
 * Types only: importing this module has no runtime cost.
 */

// ---------------------------------------------------------------------------
// Controlled vocabularies
// ---------------------------------------------------------------------------

/** Keys of firmnessComfortBands in lib/rules/*.json. */
export type SleepPosition = 'side' | 'back' | 'stomach' | 'combination';

/** Keys of firmnessLabelScale in lib/rules/*.json. */
export type FirmnessLabel = 'soft' | 'medium-soft' | 'medium' | 'medium-firm' | 'firm' | 'extra-firm';

export type SleepTemperature = 'cold' | 'neutral' | 'hot';
export type MotionSensitivity = 'single' | 'couple-low' | 'couple-high';
export type MattressType = 'foam' | 'hybrid' | 'innerspring' | 'latex';
/** v0.2 single-value pain focus (lib/profileValidation.ts). */
export type PainFocus = 'shoulders' | 'hips' | 'lower-back' | 'whole-body' | 'none';
/** Legacy v0.1 array form, normalised by the engine's painFocusAliases. */
export type LegacyPainFocusArea = 'shoulder' | 'hip' | 'lowerBack' | 'neck';
export type EdgeImportance = 'low' | 'medium' | 'high';
export type ScoreVersion = '0.1' | '0.2';
export type DimensionProvenance = 'measured' | 'estimated';

/** The six dimensions the engine scores, in lib/explain.ts DIMENSIONS order. */
export type ScoreCategory = 'pressureRelief' | 'support' | 'heat' | 'motion' | 'edge' | 'durability';
export type SubScores = Record<ScoreCategory, number>;

export type RiskFlagCode =
  | 'SUPPORT_THRESHOLD_MISMATCH'
  | 'PREFERRED_FIRMNESS_MISMATCH'
  | 'HEAT_RETENTION_LIKELY'
  | 'EDGE_SUPPORT_CONCERN'
  | 'DURABILITY_SAG_RISK'
  | 'MOTION_TRANSFER_LIKELY'
  | 'PRESSURE_POINT_RISK';

/** lib/dataIntegrity.ts getVerificationLevel(). Recomputed from fields - never trust a stored flag. */
export type VerificationLevel = 'verified' | 'partially_verified' | 'unverified' | 'unknown';

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface FirmnessRange {
  min: number;
  max: number;
}

/** Sizes that appear as priceBySize keys in the catalog. */
export type MattressSize =
  | 'Twin'
  | 'TwinXL'
  | 'Full'
  | 'Queen'
  | 'King'
  | 'CalKing'
  | 'SplitKing'
  | 'TwinTwinXL'
  | 'FullQueen'
  | 'KingCalKing';

export interface CatalogReviewHighlight {
  label: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  snippet: string;
}

export interface ReviewSource {
  sourceName: string;
  sourceUrl: string;
}

/**
 * One record of lib/data/mattress-catalog.json. Nullable fields are null in
 * at least one real record; optional fields are absent from some records.
 * Missing data must render honestly ("Not yet verified"), never be filled in.
 */
export interface MattressEntry {
  /**
   * RTINGS product photo, attached at read time by lib/db/mattressRepo (never stored in
   * the catalog): present only for published, exactly matched, slug-consistent photos.
   * The page keeps its original render when this is absent.
   */
  photo?: import('@/lib/rtings/photo').EntryPhoto | null;
  id: string;
  brand: string;
  model: string;
  slug: string;
  manufacturer: string | null;
  officialProductUrl: string | null;
  officialProductUrlNote?: string;
  type: MattressType;
  firmnessDescription: string;
  firmnessRange: FirmnessRange | null;
  firmnessSource: string;
  firmnessNote?: string;
  firmnessPaPerMm?: number;
  firmnessLabelFromRtings?: string;
  heightIn: number | null;
  heightNote?: string;
  coreMaterialNotes: string;
  cooling: string | null;
  coolingRatingOutOf10: number | null;
  motionIsolationRatingOutOf10: number | null;
  edgeSupportRatingOutOf10: number | null;
  durabilityRatingOutOf10: number | null;
  topFoamDensityLbFt3: number | null;
  trialDays: number | null;
  warrantyYears: number | null;
  warrantyLifetime: boolean;
  returnPolicy: string | null;
  priceUsd: number | null;
  priceFromUsd?: number;
  priceBySize: Partial<Record<MattressSize, number>>;
  priceCurrency?: string;
  priceNote?: string;
  priceNeedsReverification?: boolean;
  priceUpdatedAt?: string;
  retailPartners: string[];
  retailerUrls: string[];
  sponsored: boolean;
  placementSlot: string;
  disclosureText: string | null;
  dataOrigin: string;
  reviewHighlights: CatalogReviewHighlight[];
  reviewSources: ReviewSource[];
  sourceConfidence: string;
  verified: boolean;
  verificationStatus: string;
  verifiedFields: string[];
  sourceUrl: string;
  sourceName: string;
  lastVerified?: string;
  lastVerifiedAt?: string;
  sourceCheckedAt?: string;
  rtingsRecommendedFor?: string[];
  rtingsCrossCheckedAt?: string;
  rtingsIdentityResolutionNote?: string;
  /** Commerce fields read by lib/commerce.ts when present (none are populated today). */
  affiliateUrl?: string | null;
  affiliateStatus?: string | null;
}

// ---------------------------------------------------------------------------
// Profile + engine output
// ---------------------------------------------------------------------------

export interface BudgetRange {
  min: number;
  max: number;
}

/** The validated profile POST /api/match scores (lib/profileValidation.ts). */
export interface SleepProfile {
  sleepPosition: SleepPosition;
  weightLb: number;
  preferredFirmnessLabel: FirmnessLabel;
  sleepTemperature: SleepTemperature;
  motionSensitivity?: MotionSensitivity;
  painFocus?: PainFocus | LegacyPainFocusArea[];
  edgeImportance?: EdgeImportance;
  mattressTypePreference?: MattressType[];
  budgetUsd?: BudgetRange;
  scoreVersion?: ScoreVersion;
}

export interface RiskFlag {
  code: RiskFlagCode;
  category: ScoreCategory;
  rationale: string;
  mitigation: string;
  /** v0.2 only. */
  basis?: DimensionProvenance;
}

export interface ComfortBand {
  min: number;
  max: number;
  weightBand: string;
}

export interface CategoryRuleUsage {
  ruleId: string;
  category: ScoreCategory | null;
  description: string;
  delta: number;
  note: string;
}

export interface RiskRuleUsage {
  ruleId: RiskFlagCode;
  triggered: boolean;
  thresholdId: string;
  thresholdValue: unknown;
  evaluatedValue: unknown;
}

export interface ScoreTrace {
  modelVersion: string;
  categoryRulesUsed: CategoryRuleUsage[];
  riskRulesUsed: RiskRuleUsage[];
  weightRulesUsed?: { ruleId: string; description: string; multiply: Partial<Record<ScoreCategory, number>> }[];
  overallAdjustments?: { ruleId: string; description: string; delta: number; note: string }[];
}

export interface FirmnessFit {
  firmness: number | null;
  known: boolean;
  bandDirection: 'in-band' | 'softer' | 'firmer' | 'unknown';
  bandDistance: number | null;
  bandFit: number;
  preferred: number | null;
  preferenceDistance: number | null;
}

/** scoreEngine(version, profile, mattress). v0.2-only fields are optional. */
export interface ScoreResult {
  modelVersion: string;
  scoreModelVersion: string;
  mattressId: string | null;
  overallScore: number;
  subScores: SubScores;
  weights: SubScores;
  comfortBand: ComfortBand;
  riskFlags: RiskFlag[];
  trace: ScoreTrace;
  effectiveWeights?: SubScores;
  baseWeights?: SubScores;
  dimensionProvenance?: Record<ScoreCategory, DimensionProvenance>;
  firmnessFit?: FirmnessFit;
  scoreBreakdown?: { weightedSubScoreTotal: number; preferenceAdjustment: number };
  profileFactors?: { painFocus: PainFocus[]; edgeImportance: EdgeImportance | null; motionSensitivity: MotionSensitivity | null };
}

// ---------------------------------------------------------------------------
// Tiers + explanations
// ---------------------------------------------------------------------------

export type TierId = 'excellent' | 'strong' | 'good' | 'fair' | 'weak' | 'unscored';

/** lib/scoreTiers.ts tierFor(). */
export interface Tier {
  id: TierId;
  label: string;
  description: string;
  min: number | null;
  max: number | null;
}

export type WatchOutSeverity = 'info' | 'caution' | 'warning';

export interface WatchOut {
  /** Rendering/analytics key only - never shown to users. */
  code: RiskFlagCode | 'MULTIPLE_FIRMNESS_OPTIONS';
  severity: WatchOutSeverity;
  title: string;
  text: string;
  mitigation: string;
}

/** lib/explain.ts explainMatch(). */
export interface Explanation {
  tier: Tier;
  headline: string;
  reasons: { dimension: ScoreCategory | 'preference'; text: string }[];
  watchOuts: WatchOut[];
  profileFactors: { id: string; label: string; text: string }[];
  dataNotes: { id: string; text: string }[];
}

export interface MatchBadge {
  label: string;
  className: string;
}

/** One entry of matchProfile().results (lib/matchLogic.ts). */
export interface MatchItem {
  entry: MattressEntry;
  result: ScoreResult;
  dataProvenance: Record<string, string>;
  badge: MatchBadge;
  displayTitle: string;
  whyThisMatch: string[];
  preselect: boolean;
  verified: boolean;
  verificationLevel: VerificationLevel;
  missingFields: string[];
  explanation: Explanation;
  isBestValue?: boolean;
}

export interface MatchResponse {
  results: MatchItem[];
  modelVersion: string | null;
  scoreVersion?: ScoreVersion;
  bestValueId?: string | null;
  all: { id: string; brand: string; model: string; score: number }[];
  catalogAudit?: unknown;
  catalogSource: 'database' | 'json_fallback' | string;
}

// ---------------------------------------------------------------------------
// Commerce
// ---------------------------------------------------------------------------

export type OutboundKind = 'affiliate' | 'retailer' | 'brand' | 'unavailable';

/** lib/outbound.ts ctaFor(): decided from real data only. */
export interface OutboundCta {
  kind: OutboundKind;
  href: string | null;
  label: string;
  retailerName: string | null;
  host: string | null;
  rel: string | null;
  disclosure: string | null;
  event: 'affiliate_click' | 'outbound_click' | null;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

/** Derived from lib/analytics.ts EVENTS (type-only re-export, no runtime import). */
export type { AnalyticsEventName } from '@/lib/analytics';
import type { AnalyticsEventName } from '@/lib/analytics';

/** Values track() forwards. Arrays are joined; anything else is dropped. */
export type AnalyticsValue = string | number | boolean | null | undefined | readonly (string | number)[];
export type AnalyticsProps = Record<string, AnalyticsValue>;

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  props?: AnalyticsProps;
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

export type CompareSource = string;
export type CompareAddResult = { ok: true } | { ok: false; reason: 'limit' | 'duplicate' };
export type CompareToggleResult = { ok: boolean; selected: boolean; reason?: 'limit' | 'duplicate' };

/** The device-local compare selection (lib/compareStore.ts). */
export interface CompareState {
  ids: readonly string[];
  labels: Readonly<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// Navigation (lib/site.ts)
// ---------------------------------------------------------------------------

export interface NavLink {
  label: string;
  href: string;
  caption?: string;
}

export interface NavGroup {
  id: string;
  title: string;
  links: NavLink[];
}

export interface RenderStillRef {
  type: MattressType;
  aspect: 'card' | 'product' | 'hero' | 'cutaway' | 'detail';
}

export interface NavFeature {
  eyebrow: string;
  title: string;
  href: string;
  categorySlug?: string;
  still: RenderStillRef;
  links: NavLink[];
}

export interface NavMenu {
  id: string;
  label: string;
  href: string;
  intro: string;
  groups: NavGroup[];
  feature: NavFeature | null;
}

export interface FooterGroup {
  title: string;
  links: { href: string; label: string }[];
}

// ---------------------------------------------------------------------------
// Search (lib/searchIndex.ts)
// ---------------------------------------------------------------------------

export type SearchGroupId = 'categories' | 'mattresses' | 'brands' | 'guides' | 'comparisons';
export type SearchKind = 'mattress' | 'brand' | 'category' | 'guide' | 'comparison';

export interface SearchItem {
  kind: SearchKind;
  id: string;
  title: string;
  meta: string;
  href: string;
  terms: string;
  brand?: string;
  tags?: string[];
  count?: number;
  facets?: Record<string, number>;
}

export type SearchIndexData = Record<SearchGroupId, SearchItem[]>;

export interface SearchGroup {
  id: SearchGroupId;
  label: string;
}

export interface SearchResultGroup extends SearchGroup {
  items: SearchItem[];
}

// ---------------------------------------------------------------------------
// Editorial registries
// ---------------------------------------------------------------------------

export type GuideHero =
  | { kind: 'diagram'; name: string }
  | { kind: 'numeral'; value: string; label: string }
  | { kind: 'render'; type: MattressType };

/** One entry of GUIDES (lib/content/guides.ts). */
export interface Guide {
  slug: string;
  title: string;
  emphasis?: string;
  description: string;
  dek: string;
  category: string;
  alsoIn?: string[];
  path: string;
  published: string;
  updated: string;
  hero: GuideHero;
  profileKey?: string;
  cover: { diagram: string; still: { material?: string; type?: MattressType; aspect?: string }; focus: string; zoom: number };
  categoryPages?: string[];
  featured?: boolean;
}

export interface GuideCategory {
  id: string;
  label: string;
  description: string;
}

/** One entry of CATEGORY_PAGES (lib/categoryPages.ts). */
export interface CategoryPage {
  slug: string;
  title: string;
  navLabel: string;
  chip: string;
  group: string;
  description: string;
  terms: string;
  href: string;
  filter: (entry: MattressEntry) => boolean;
  /** Suggested matchProfile() input for engine-ranked pages; null when the page is a plain filter. */
  countNoun: readonly [string, string];
}

/** One value of compareTopics (lib/compareTopics.ts). */
export interface CompareTopic {
  title: string;
  h1: string;
  metaTitle: string;
  description: string;
  intro: string;
  why: { title: string; text: string }[];
  guides: string[];
  profile: SleepProfile;
  chips?: string[];
}

/** Facts a pair's angle copy relies on; lib/comparePairs.test.ts checks each against the catalog. */
export interface PairClaims {
  sameBrand?: boolean;
  sameType?: string;
  types?: string[];
  sameFirmness?: boolean;
  aFirmer?: boolean;
  bTaller?: boolean;
  aCheaper?: boolean;
  bPricier?: boolean;
  bothUnder?: number;
}

/** An extra, disclosed demo sleeper whose result is the point of a head-to-head pair. */
export interface PairSpotlight {
  id: string;
  label: string;
  profile: Partial<SleepProfile>;
}

/** One entry of COMPARE_PAIRS / VS_PAGES (lib/comparePairs.ts). */
export interface VsPage {
  a: string;
  b: string;
  slug: string;
  href: string;
  title: string;
  short: string;
  angle: string;
  claims: PairClaims;
  spotlight: PairSpotlight | null;
  guides: string[];
}
