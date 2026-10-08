/**
 * Serialisable shapes the homepage server data (homeData.ts) hands to its
 * sections. Every value is engine- or catalog-derived; none is hand-written
 * per product. Type-only module.
 */
import type {
  DimensionProvenance,
  EdgeImportance,
  FirmnessLabel,
  MattressType,
  MotionSensitivity,
  PainFocus,
  ScoreCategory,
  SleepPosition,
  SleepProfile,
  SleepTemperature,
  SubScores,
  TierId,
  WatchOut,
} from '@/lib/types';
import type { FirmnessInfo } from '@/lib/firmness';

/** [min, max] on the 1-10 firmness scale, as stored in the rules dataset. */
export type BandTuple = readonly [number, number];
/** {min, max} on the 1-10 firmness scale (engine comfortBand without weightBand). */
export interface BandRange {
  min: number;
  max: number;
}
export type BandLike = BandTuple | BandRange;

/** lib/firmness firmnessFor(). */
export type FirmnessSummary = FirmnessInfo;

export interface HomeFacts {
  total: number;
  brands: number;
  dimensions: number;
  sponsoredCount: number;
}

export interface ContrastSleeper {
  id: string;
  label: string;
  score: number;
  tier: string;
  band: BandRange | null;
  headline: string;
}

export interface HomeContrast {
  id: string;
  brand: string;
  title: string;
  type: MattressType;
  firmness: FirmnessSummary | null;
  sleepers: ContrastSleeper[];
}

export interface PositionOption {
  id: SleepPosition;
  label: string;
}

export interface FirmnessOption {
  id: FirmnessLabel;
  label: string;
}

export interface HomePersonal {
  positionBands: (PositionOption & { band: BandTuple })[];
  weightBands: { key: string; label: string; side: BandTuple }[];
  cooling: { base: number; hot: number; neutral: number; multiplier: number | null };
}

/** A body-weight band (rules weightBands key) and the weight it is scored at. */
export interface WeightOption {
  id: string;
  label: string;
  short: string;
  weightLb: number;
}

export interface ChoiceOption<T extends string> {
  id: T;
  label: string;
}

/** A budget ceiling (USD, published Queen price); max null = no limit. */
export interface BudgetOption {
  id: string;
  label: string;
  max: number | null;
}

export interface PreviewDefaults {
  position: SleepPosition;
  firmness: FirmnessLabel;
  weight: string;
  temperature: SleepTemperature;
  sharing: MotionSensitivity;
  /** What the grid is scored with; any other choice is scored live. */
  pain: PainFocus;
  edge: EdgeImportance;
  budget: string;
}

/** The engine's top organic match for one preview profile (decoded from a PreviewCell). */
export interface PreviewTop {
  id: string;
  brand: string;
  title: string;
  type: MattressType;
  typeLabel: string;
  score: number;
  tier: { id: TierId; label: string };
  reasons: string[];
  firmness: number | null;
  strongCount: number;
  total: number;
}

/** A mattress that is the top match for at least one preview profile. */
export interface PreviewMattress {
  id: string;
  brand: string;
  title: string;
  type: MattressType;
  typeLabel: string;
  /** The engine's firmnessFit.firmness for this mattress, when known. */
  firmness: number | null;
}

/**
 * One scored preview profile, packed so the full grid stays small on the wire:
 * [mattress index, overall score, tier index, strong-match count, results scored, reason indexes].
 * null when nothing in the catalog could be scored for that profile.
 */
export type PreviewCell = readonly [number, number, number, number, number, readonly number[]] | null;

export interface HomePreview {
  scoreVersion: string;
  positions: PositionOption[];
  firmness: (FirmnessOption & { value: number })[];
  weights: WeightOption[];
  temperatures: ChoiceOption<SleepTemperature>[];
  sharing: ChoiceOption<MotionSensitivity>[];
  /** Scored live (POST /api/match) when not the default (defaults.pain / edge / budget), which the grid uses. */
  pains: ChoiceOption<PainFocus>[];
  edges: ChoiceOption<EdgeImportance>[];
  budgets: BudgetOption[];
  defaults: PreviewDefaults;
  mattresses: PreviewMattress[];
  tiers: { id: TierId; label: string }[];
  reasons: string[];
  /** Row-major over positions x firmness x weights x temperatures x sharing (see previewGrid.ts). */
  cells: PreviewCell[];
  /** Engine comfort range keyed `${position}|${weightId}`. */
  comfortBands: Record<string, BandRange>;
}

export interface AnatomyPreset {
  id: string;
  label: string;
  note: string;
  weights: SubScores;
}

export interface HomeAnatomy {
  dimensions: { id: ScoreCategory; label: string }[];
  presets: AnatomyPreset[];
  preference: { tolerance: number; perPoint: number; maxPenalty: number };
  tiers: { id: TierId; label: string; min: number | null; max: number | null }[];
}

export interface StoryAttribute {
  label: string;
  value: string;
}

export interface StorySlideData {
  id: string;
  brand: string;
  title: string;
  type: MattressType;
  typeLabel: string;
  firmnessLabel: string | null;
  positioning: string;
  attributes: StoryAttribute[];
  trialDays: number | null;
  priceUsd: number | null;
  priceFromUsd: number | null;
  /** Credited RTINGS photo for this exact mattress, when it has an eligible one. */
  photo: import('@/lib/types').MattressEntry['photo'];
}

export interface SleepCategoryCard {
  slug: string;
  href: string;
  title: string;
  description: string;
  /** Mattresses the destination page lists. */
  shown: number;
  /** How many of those it ranks (integrity rule: enough backed dimensions). */
  ranked: number;
  /** Short reference-sleeper label for profile-ranked pages, else null. */
  profileLabel: string | null;
  /** The destination page's full "ranked for" disclosure. */
  profileText: string;
  type: MattressType;
  seed: string;
  /** The destination page's rank 1, with the same metric it shows. */
  top: { id: string; brand: string; title: string; display: string; metricKind: 'score' | 'rating'; metricLabel: string } | null;
}

export interface CompareFinalist {
  id: string;
  brand: string;
  title: string;
  type: MattressType;
  typeLabel: string;
  priceUsd: number | null;
  priceFromUsd: number | null;
  firmness: FirmnessSummary | null;
  score: number;
  tier: string;
  subScores: SubScores;
  provenance: Record<ScoreCategory, DimensionProvenance> | null;
  watchOut: WatchOut | null;
  isBestValue: boolean;
}

export interface HomeCompare {
  profile: SleepProfile;
  finalists: CompareFinalist[];
}

export interface CoverageRow {
  id: string;
  label: string;
  count: number;
}

export interface HomeTrust {
  total: number;
  verified: number;
  partial: number;
  unverified: number;
  incomplete: number;
  sponsoredCount: number;
  coverage: CoverageRow[];
}

export interface HomeData {
  facts: HomeFacts;
  contrast: HomeContrast | null;
  personal: HomePersonal;
  preview: HomePreview;
  anatomy: HomeAnatomy;
  story: StorySlideData[];
  bySleep: SleepCategoryCard[];
  compare: HomeCompare;
  trust: HomeTrust;
}
