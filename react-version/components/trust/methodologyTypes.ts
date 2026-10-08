/**
 * Shapes of the /methodology payload built by methodologyData.ts. Kept in
 * a type-only module so the client components (WeightExplorer,
 * FirmnessFitChart) can type their props without touching the
 * server-only data builder.
 */
import type { CatalogSource } from '@/lib/db/mattressRepo';
import type { CatalogAudit } from '@/lib/dataIntegrity';
import type { RulesV02, WeightModifierRule } from '@/lib/scoreEngine';
import type { ComfortBand, DimensionProvenance, FirmnessFit, MattressType, ScoreCategory, SubScores } from '@/lib/types';
import type { MonetizationStatus } from './monetization';

/* ---------- Weight explorer ---------- */

export type ExplorerFieldId = 'sleepPosition' | 'sleepTemperature' | 'motionSensitivity' | 'edgeImportance' | 'painFocus' | 'bodyWeight';

export interface ExplorerOption {
  value: string;
  label: string;
  /** Body-weight options only: the representative weight scored for that group. */
  weightLb?: number;
}

export interface ExplorerField {
  id: ExplorerFieldId;
  legend: string;
  options: readonly ExplorerOption[];
  defaultValue: string;
}

/** The chosen option value per explorer field. */
export type ExplorerSelection = Record<ExplorerFieldId, string>;

/** A v0.2 weight rule as shown on the page (no `when`, which the page never prints). */
export type WeightRuleSummary = Pick<WeightModifierRule, 'id' | 'description' | 'rationale' | 'multiply'>;

export interface ExplorerData {
  fields: readonly ExplorerField[];
  /** Values per combination: one permyriad weight per dimension, then a bitmask of the rules applied. */
  stride: number;
  table: number[];
}

/* ---------- Firmness fit curves ---------- */

export type CurvePosition = 'side' | 'back' | 'stomach' | 'combination';

export interface CurvePoint {
  firmness: number;
  support: number;
  pressureRelief: number;
  bandFit: number | null;
}

export interface CurveSeries {
  position: CurvePosition;
  band: Pick<ComfortBand, 'min' | 'max'>;
  points: CurvePoint[];
}

/* ---------- Worked example ---------- */

/** A disclosed example profile: the engine reads these fields (see EngineProfile). */
export interface ExampleProfile {
  sleepPosition: CurvePosition;
  weightLb: number;
  preferredFirmnessLabel: string;
  sleepTemperature: string;
  motionSensitivity: string;
  painFocus?: string;
}

export interface ContrastProfile {
  id: string;
  label: string;
  profile: ExampleProfile;
}

export interface ContrastScore {
  id: string;
  label: string;
  score: number;
}

export interface WorkedExample {
  contrasts: ContrastScore[];
  id: string;
  brand: string;
  title: string;
  type: MattressType;
  overallScore: number;
  subScores: SubScores;
  effectiveWeights: SubScores;
  dimensionProvenance: Record<ScoreCategory, DimensionProvenance>;
  scoreBreakdown: { weightedSubScoreTotal: number; preferenceAdjustment: number };
  firmnessFit: FirmnessFit | null;
  comfortBand: ComfortBand;
  riskFlagCount: number;
}

/* ---------- Version comparison ---------- */

export interface TopScoreStats {
  version: '0.1' | '0.2';
  distribution: { score: number; count: number }[];
  min: number;
  max: number;
  distinctScores: number;
  distinctTopMattresses: number;
}

export interface VersionComparison {
  profiles: number;
  v1: TopScoreStats;
  v2: TopScoreStats;
}

/* ---------- Provenance ---------- */

export type CoverageId = 'firmness' | 'trial' | 'height' | 'price' | 'warranty' | 'motion' | 'edge' | 'durability' | 'cooling' | 'density';

export interface CoverageRow {
  id: CoverageId;
  label: string;
  count: number;
}

export interface Provenance {
  audit: Pick<CatalogAudit, 'total' | 'byLevel'>;
  lastVerified: { earliest: string; latest: string } | null;
  rtingsCrossChecks: { count: number; latest: string | null };
  /** The RTINGS sync pipeline as the site reads it (lib/rtings/evidence loadRtingsPipelineStatus). */
  rtingsPipeline: {
    store: 'supabase' | 'file' | 'memory' | null;
    databaseConnected: boolean;
    publishedReviews: number | null;
    syncIntervalDays: number;
    actorSlug: string;
  };
  reviewSources: { name: string; count: number }[];
  officialSource: number;
  /** Entries whose source page is the brand's own product page (an officialProductUrl is on file). */
  brandPageSource: number;
  /** Entries sourced from a retailer listing instead (a source link but no brand product page). */
  retailerSource: number;
  /** Entries whose firmness number comes from an independent review rather than the brand (firmnessSource independent_*). */
  independentFirmness: number;
  coverage: CoverageRow[];
}

/* ---------- Whole page ---------- */

export interface MethodologyRules {
  version: string;
  baseWeights: SubScores;
  v1Weights: SubScores;
  weightRules: WeightRuleSummary[];
  typeBaselines: RulesV02['typeBaselines'];
  estimateCap: number;
  estimateCapRationale: string;
  ratedDimensions: RulesV02['ratedDimensions'];
  firmnessFit: RulesV02['firmnessFit'];
  preferenceFit: RulesV02['preferenceFit'];
  thresholds: RulesV02['thresholds'];
  durability: RulesV02['durability'];
  riskFlagRules: Pick<RulesV02['riskFlagRules'][number], 'code' | 'category' | 'description' | 'mitigation'>[];
  firmnessLabelScale: RulesV02['firmnessLabelScale'];
}

export interface MethodologyData {
  catalogSource: CatalogSource;
  catalog: { total: number; brands: number };
  rules: MethodologyRules;
  explorer: ExplorerData;
  curves: { weightLb: number; series: CurveSeries[] };
  example: { profile: ExampleProfile; match: WorkedExample | null };
  versions: VersionComparison | null;
  provenance: Provenance;
  money: MonetizationStatus;
  dimensionCoverage: Record<ScoreCategory, number>;
}

/** Props shared by every methodology section that reads the payload. */
export interface MethodologySectionProps {
  data: MethodologyData;
}
