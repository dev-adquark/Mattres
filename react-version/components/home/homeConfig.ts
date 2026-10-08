/**
 * The stated, disclosed inputs behind the homepage's engine runs: which
 * profiles are scored, which presets are shown and which catalog fields are
 * surfaced. Nothing here is a score or a product fact; every number the
 * page shows is computed from these inputs by the real engine (homeData.ts).
 */
import type { EdgeImportance, FirmnessLabel, MattressEntry, MattressType, MotionSensitivity, PainFocus, ScoreCategory, ScoreVersion, SleepPosition, SleepProfile, SleepTemperature } from '@/lib/types';
import type { BudgetOption, ChoiceOption, FirmnessOption, PositionOption, PreviewDefaults, WeightOption } from './types';

export const SCORE_VERSION = '0.2' satisfies ScoreVersion;

/**
 * The homepage sleep-profile preview varies five answers: position, feel,
 * body weight, temperature and who shares the bed. Every combination is run
 * through the engine on the server (homeSections.buildPreviewGrid). Weight
 * bands mirror the full quiz (components/match/quizModel WEIGHT_BANDS) and
 * are scored at the same representative weight the quiz uses for each band.
 */
export const PREVIEW_WEIGHTS: WeightOption[] = [
  { id: 'under-130', label: 'Under 130 lb', short: 'Under 130', weightLb: 115 },
  { id: '130-180', label: '130–179 lb', short: '130–179', weightLb: 155 },
  { id: '180-230', label: '180–229 lb', short: '180–229', weightLb: 205 },
  { id: '230-plus', label: '230 lb and up', short: '230+', weightLb: 260 },
];

export const PREVIEW_TEMPERATURES: ChoiceOption<SleepTemperature>[] = [
  { id: 'cold', label: 'Cool' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'hot', label: 'Warm' },
];

export const PREVIEW_SHARING: ChoiceOption<MotionSensitivity>[] = [
  { id: 'single', label: 'Just me' },
  { id: 'couple-low', label: 'Partner' },
  { id: 'couple-high', label: 'Light sleeper' },
];

/**
 * Three more answers the preview exposes: where it aches, how much the edge
 * is used and a budget. They are not part of the precomputed grid (it would
 * grow 48x); every grid profile is scored with the defaults below
 * (no specific pain, edge 'medium', no budget), sent to the engine explicitly
 * so the grid and a live POST /api/match for the same answers are the same
 * run. Any other choice is scored live by that endpoint. Labels mirror the
 * full quiz (components/match/quizModel PAIN_FOCUS, EDGE_IMPORTANCE, BUDGET_STOPS).
 */
export const PREVIEW_PAIN: ChoiceOption<PainFocus>[] = [
  { id: 'none', label: 'None' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'hips', label: 'Hips' },
  { id: 'lower-back', label: 'Lower back' },
];

export const PREVIEW_EDGE: ChoiceOption<EdgeImportance>[] = [
  { id: 'low', label: 'Rarely' },
  { id: 'medium', label: 'Sometimes' },
  { id: 'high', label: 'Often' },
];

/** Budget ceilings on the published Queen price; null = no limit. */
export const PREVIEW_BUDGETS: BudgetOption[] = [
  { id: 'any', label: 'Any', max: null },
  { id: '1000', label: '$1,000', max: 1000 },
  { id: '1500', label: '$1,500', max: 1500 },
  { id: '2000', label: '$2,000', max: 2000 },
];

/** The preview's opening state (the same answers a first-time visitor sees). */
export const PREVIEW_DEFAULTS: PreviewDefaults = {
  position: 'side',
  firmness: 'medium',
  weight: '130-180',
  temperature: 'neutral',
  sharing: 'single',
  pain: 'none',
  edge: 'medium',
  budget: 'any',
};

export const PREVIEW_POSITIONS: PositionOption[] = [
  { id: 'side', label: 'Side' },
  { id: 'back', label: 'Back' },
  { id: 'stomach', label: 'Stomach' },
  { id: 'combination', label: 'Combination' },
];

export const PREVIEW_FIRMNESS: FirmnessOption[] = [
  { id: 'soft', label: 'Soft' },
  { id: 'medium-soft', label: 'Medium-soft' },
  { id: 'medium', label: 'Medium' },
  { id: 'medium-firm', label: 'Medium-firm' },
  { id: 'firm', label: 'Firm' },
  { id: 'extra-firm', label: 'Extra-firm' },
];

/**
 * Disclosed demo profile for the "Compare your finalists" section - the
 * same stated profile app/compare used before the redesign, so the demo
 * comparison is a real engine output for a real, stated profile.
 */
export const COMPARE_DEMO_PROFILE: SleepProfile = {
  sleepPosition: 'side',
  weightLb: 155,
  preferredFirmnessLabel: 'medium-firm',
  sleepTemperature: 'hot',
  motionSensitivity: 'single',
};

/** Two sleepers who differ only in position - used to show one mattress scoring differently. */
export const CONTRAST_PROFILES: { id: string; label: string; profile: SleepProfile }[] = [
  { id: 'side', label: 'Side sleeper', profile: { sleepPosition: 'side', weightLb: 170, preferredFirmnessLabel: 'medium', sleepTemperature: 'neutral' } },
  { id: 'stomach', label: 'Stomach sleeper', profile: { sleepPosition: 'stomach', weightLb: 170, preferredFirmnessLabel: 'medium', sleepTemperature: 'neutral' } },
];

/** Weight presets for the score-anatomy figure. Each is a real profile run through computeEffectiveWeights. */
export const WEIGHT_PRESETS: { id: string; label: string; note: string; profile: Partial<SleepProfile> | null }[] = [
  { id: 'default', label: 'Default weights', note: 'Before any answers are applied.', profile: null },
  { id: 'side-hot', label: 'Side sleeper who sleeps hot', note: 'Side position + sleeps hot.', profile: { sleepPosition: 'side', sleepTemperature: 'hot' } },
  { id: 'couple', label: 'Light sleeper sharing a bed', note: 'Shares the bed, easily woken by movement.', profile: { sleepPosition: 'combination', sleepTemperature: 'neutral', motionSensitivity: 'couple-high' } },
  { id: 'back-heavy', label: 'Back sleeper, 240 lb, lower-back pain', note: 'Back position, 230 lb or more, lower-back discomfort.', profile: { sleepPosition: 'back', weightLb: 240, sleepTemperature: 'neutral', painFocus: 'lower-back' } },
];

/** Catalog rating fields (out of 10), keyed by the dimension they inform. */
export type RatingField = 'coolingRatingOutOf10' | 'motionIsolationRatingOutOf10' | 'edgeSupportRatingOutOf10' | 'durabilityRatingOutOf10';

export const RATING_FIELDS: { dim: ScoreCategory; field: RatingField }[] = [
  { dim: 'heat', field: 'coolingRatingOutOf10' },
  { dim: 'motion', field: 'motionIsolationRatingOutOf10' },
  { dim: 'edge', field: 'edgeSupportRatingOutOf10' },
  { dim: 'durability', field: 'durabilityRatingOutOf10' },
];

export const TYPE_ORDER: MattressType[] = ['hybrid', 'foam', 'latex', 'innerspring'];

/** Independent ratings a story slide may surface as a key attribute, in display order. */
export const ATTRIBUTE_FIELDS: { field: RatingField; label: string }[] = [
  { field: 'motionIsolationRatingOutOf10', label: 'Motion isolation' },
  { field: 'coolingRatingOutOf10', label: 'Cooling' },
  { field: 'edgeSupportRatingOutOf10', label: 'Edge support' },
  { field: 'durabilityRatingOutOf10', label: 'Durability' },
];

/** Sleep-style categories surfaced on the homepage "Discover by how you sleep" slider (all exist in lib/categoryPages). */
export const SLEEP_CATEGORY_SLUGS = ['side-sleepers', 'back-sleepers', 'stomach-sleepers', 'couples', 'cooling', 'firm', 'soft'] as const;

const POSITION_WORD: Record<SleepPosition, string> = { side: 'side', back: 'back', stomach: 'stomach', combination: 'combination' };
export const TEMP_WORD: Record<SleepTemperature, string> = { hot: 'sleeps hot', cold: 'sleeps cold', neutral: 'sleeps neutral' };
export const MOTION_WORD: Record<MotionSensitivity, string> = { single: 'sleeps alone', 'couple-low': 'shares the bed', 'couple-high': 'shares the bed, light sleeper' };

const firmnessWords = (label: FirmnessLabel): string => label.replace('-', ' ');

/** "160 lb combination sleeper, medium feel, sleeps neutral" - the disclosed profile a category pick was scored for. */
export function profileSentence(p: SleepProfile): string {
  return [
    `${p.weightLb} lb ${POSITION_WORD[p.sleepPosition] || p.sleepPosition} sleeper`,
    p.preferredFirmnessLabel ? `${firmnessWords(p.preferredFirmnessLabel)} feel` : null,
    TEMP_WORD[p.sleepTemperature],
    p.motionSensitivity ? MOTION_WORD[p.motionSensitivity] : null,
  ]
    .filter(Boolean)
    .join(', ');
}

export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Number of independent catalog ratings on file for an entry. */
export function measuredCount(entry: MattressEntry): number {
  return RATING_FIELDS.filter(({ field }) => isNum(entry[field])).length;
}
