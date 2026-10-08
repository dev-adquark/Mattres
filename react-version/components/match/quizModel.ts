/**
 * Match quiz model: the steps, the answer options, and the mapping from
 * quiz answers to the Sleep Profile accepted by POST /api/match
 * (lib/profileValidation.ts). Pure and client-safe; unit-tested in
 * quizModel.test.ts. No scoring happens here.
 */

import { formatUsd } from '@/lib/format';
import { validateProfile } from '@/lib/profileValidation';
import type {
  EdgeImportance,
  FirmnessLabel,
  MattressType,
  MotionSensitivity,
  PainFocus,
  SleepPosition,
  SleepProfile,
  SleepTemperature,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StepId = 'sleep' | 'body' | 'comfort' | 'environment' | 'priorities' | 'match';
export type QuestionStepId = Exclude<StepId, 'match'>;

export interface QuizStep<Id extends StepId = StepId> {
  id: Id;
  index: string;
  label: string;
}

export type WeightBandId = 'under-130' | '130-180' | '180-230' | '230-plus';

/** One answer tile / option. `visual` is attached by the UI, never stored. */
export interface ChoiceOption<V extends string = string> {
  value: V;
  label: string;
  desc?: string;
}

export interface WeightBandOption extends ChoiceOption<WeightBandId> {
  desc: string;
  /** Representative weight sent to the engine for this band. */
  weightLb: number;
}

export interface FirmnessOption extends ChoiceOption<FirmnessLabel> {
  short: string;
  /** Position on the 1-10 firmness scale. */
  scale: number;
  desc: string;
}

/** Quiz answers as stored in sessionStorage ('mms_quiz_state'). */
export interface QuizAnswers {
  position: SleepPosition | null;
  weightBand: WeightBandId | null;
  weightExact: string;
  firmness: FirmnessLabel | null;
  painFocus: PainFocus | null;
  temperature: SleepTemperature | null;
  sharing: MotionSensitivity | null;
  edge: EdgeImportance | null;
  types: MattressType[];
  budgetMax: number | null;
}

/** Field (or 'eligible') -> inline error message. Empty = valid. */
export type QuizErrorKey = keyof QuizAnswers | 'eligible';
export type QuizErrors = Partial<Record<QuizErrorKey, string>>;

/**
 * answersToProfile() output: a Sleep Profile whose required fields are
 * still null until the matching question is answered. lib/profileValidation
 * rejects it until complete (see isScorableProfile).
 */
export type ProfileDraft = Omit<SleepProfile, 'sleepPosition' | 'weightLb' | 'preferredFirmnessLabel' | 'sleepTemperature'> & {
  sleepPosition: SleepPosition | null;
  weightLb: number | null;
  preferredFirmnessLabel: FirmnessLabel | null;
  sleepTemperature: SleepTemperature | null;
};

export type ProfileChipId = 'position' | 'weight' | 'firmness' | 'pain' | 'temperature' | 'sharing' | 'edge' | 'types' | 'budget';

export interface ProfileChip {
  id: ProfileChipId;
  /** QUESTION_STEPS index that edits this answer. */
  step: number;
  label: string;
}

/** The slice of a catalog record the quiz needs for its "N fit" count. */
export interface QuizCatalogItem {
  type: MattressType;
  priceUsd: number | null;
}

// ---------------------------------------------------------------------------
// Steps + options
// ---------------------------------------------------------------------------

export const QUIZ_STORAGE_KEY = 'mms_quiz_state';
export const QUIZ_STATE_VERSION = 1;

const FIRST_STEP: QuizStep<QuestionStepId> = { id: 'sleep', index: '01', label: 'Sleep' };

export const QUESTION_STEPS: readonly QuizStep<QuestionStepId>[] = [
  FIRST_STEP,
  { id: 'body', index: '02', label: 'Body' },
  { id: 'comfort', index: '03', label: 'Comfort' },
  { id: 'environment', index: '04', label: 'Environment' },
  { id: 'priorities', index: '05', label: 'Priorities' },
];

/** The question step at an index (the first step for an out-of-range index). */
export function questionStepAt(index: number): QuizStep<QuestionStepId> {
  return QUESTION_STEPS[index] ?? FIRST_STEP;
}

/** All chapters: the five answerable steps, then the separate Results marker. */
export const STEPS: readonly QuizStep[] = [...QUESTION_STEPS, { id: 'match', index: '06', label: 'Results' }];

export const POSITIONS: readonly ChoiceOption<SleepPosition>[] = [
  { value: 'side', label: 'Side', desc: 'Shoulders and hips carry most of your weight.' },
  { value: 'back', label: 'Back', desc: 'Weight spreads evenly; the lower back needs support.' },
  { value: 'stomach', label: 'Stomach', desc: 'Hips tend to sink, so the surface needs to stay level.' },
  { value: 'combination', label: 'Combination', desc: 'You change position through the night.' },
];

/**
 * Weight bands match the engine's own bands (lib/rules/0.2.json
 * weightBands). Each band sends a representative weight inside that band;
 * the engine only reads the band for firmness ranges, plus the 230 lb
 * heavier-sleeper threshold, which every band respects. An exact weight,
 * when given, is sent instead.
 */
export const WEIGHT_BANDS: readonly WeightBandOption[] = [
  { value: 'under-130', label: 'Under 130 lb', desc: 'Under 59 kg', weightLb: 115 },
  { value: '130-180', label: '130–179 lb', desc: '59–82 kg', weightLb: 155 },
  { value: '180-230', label: '180–229 lb', desc: '82–104 kg', weightLb: 205 },
  { value: '230-plus', label: '230 lb and up', desc: '104 kg or more', weightLb: 260 },
];

export const FIRMNESS: readonly FirmnessOption[] = [
  { value: 'soft', label: 'Soft', short: 'Soft', scale: 2, desc: 'You sink in and feel cradled.' },
  { value: 'medium-soft', label: 'Medium-soft', short: 'Med-soft', scale: 4, desc: 'Plush on top with gentle support beneath.' },
  { value: 'medium', label: 'Medium', short: 'Medium', scale: 5.5, desc: 'Balanced: some give, nothing sags.' },
  { value: 'medium-firm', label: 'Medium-firm', short: 'Med-firm', scale: 7, desc: 'Supportive with a thin layer of comfort.' },
  { value: 'firm', label: 'Firm', short: 'Firm', scale: 8.5, desc: 'You rest on top with very little sink.' },
  { value: 'extra-firm', label: 'Extra-firm', short: 'Extra-firm', scale: 10, desc: 'Flat and solid, almost no give.' },
];

export const PAIN_FOCUS: readonly ChoiceOption<PainFocus>[] = [
  { value: 'shoulders', label: 'Shoulders', desc: 'Pressure relief counts for more.' },
  { value: 'hips', label: 'Hips', desc: 'Pressure relief counts for more.' },
  { value: 'lower-back', label: 'Lower back', desc: 'Support and alignment count for more.' },
  { value: 'whole-body', label: 'Whole body', desc: 'General aches; pressure relief and support both matter.' },
  { value: 'none', label: 'No specific area', desc: 'The default weighting is used.' },
];

export const TEMPERATURES: readonly ChoiceOption<SleepTemperature>[] = [
  { value: 'cold', label: 'Cool', desc: 'I usually feel cold at night.' },
  { value: 'neutral', label: 'Neutral', desc: 'Rarely too hot or too cold.' },
  { value: 'hot', label: 'Warm', desc: 'I often wake up overheated.' },
];

export const SHARING: readonly ChoiceOption<MotionSensitivity>[] = [
  { value: 'single', label: 'I sleep alone', desc: 'Motion isolation counts for less.' },
  { value: 'couple-low', label: 'Shared, sound sleeper', desc: 'A partner moving rarely wakes me.' },
  { value: 'couple-high', label: 'Shared, light sleeper', desc: 'I wake when my partner moves.' },
];

export const EDGE_IMPORTANCE: readonly ChoiceOption<EdgeImportance>[] = [
  { value: 'low', label: 'Not important' },
  { value: 'medium', label: 'Somewhat' },
  { value: 'high', label: 'Very important' },
];

export const MATTRESS_TYPES: readonly ChoiceOption<MattressType>[] = [
  { value: 'foam', label: 'All-foam', desc: 'Contouring, quiet, isolates motion.' },
  { value: 'hybrid', label: 'Hybrid', desc: 'Foam comfort layers over pocketed coils.' },
  { value: 'innerspring', label: 'Innerspring', desc: 'Traditional coil feel, bouncy and breathable.' },
  { value: 'latex', label: 'Latex', desc: 'Buoyant, responsive and durable.' },
];

/** Budget slider stops (maximum Queen price). The final stop means no limit. */
export const BUDGET_STOPS: readonly (number | null)[] = [750, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000, null];

export const EMPTY_ANSWERS: Readonly<QuizAnswers> = Object.freeze({
  position: null,
  weightBand: null,
  weightExact: '',
  firmness: null,
  painFocus: null,
  temperature: null,
  sharing: null,
  edge: null,
  types: [],
  budgetMax: null,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The option whose value equals `value` (any unknown input), or null. */
function byValue<O extends ChoiceOption>(list: readonly O[], value: unknown): O | null {
  return list.find((o) => o.value === value) || null;
}

/** Narrows unknown input to one of the list's values, or null. */
function pick<V extends string>(list: readonly ChoiceOption<V>[], value: unknown): V | null {
  return byValue(list, value) ? (value as V) : null;
}

export const optionLabel = (list: readonly ChoiceOption[], value: unknown): string | null => byValue(list, value)?.label ?? null;

export { formatUsd };

export function budgetLabel(max: number | null | undefined): string {
  return typeof max === 'number' ? `Up to ${formatUsd(max)}` : 'No limit';
}

/** Index on BUDGET_STOPS for a stored budgetMax (null = no limit = last stop). */
export function budgetStopIndex(max: number | null | undefined): number {
  if (typeof max !== 'number') return BUDGET_STOPS.length - 1;
  const i = BUDGET_STOPS.indexOf(max);
  return i === -1 ? BUDGET_STOPS.length - 1 : i;
}

export interface ExactWeight {
  value: number | null;
  error: string | null;
}

/** Parses the optional exact weight. */
export function parseExactWeight(raw: unknown): ExactWeight {
  const text = String(raw ?? '').trim();
  if (!text) return { value: null, error: null };
  const n = Number(text);
  if (!Number.isFinite(n)) return { value: null, error: 'Enter your weight as a number of pounds, or leave it blank.' };
  if (n < 50 || n > 700) return { value: null, error: 'Enter a weight between 50 and 700 lb, or leave it blank.' };
  return { value: Math.round(n), error: null };
}

/** The weight band an exact weight falls into (same boundaries as the engine). */
export function bandForWeight(lb: number): WeightBandId {
  if (lb < 130) return 'under-130';
  if (lb < 180) return '130-180';
  if (lb < 230) return '180-230';
  return '230-plus';
}

/** Inline validation for one step. Returns {field: message} (empty object = valid). */
export function validateStep(stepId: StepId, answers: QuizAnswers): QuizErrors {
  const errors: QuizErrors = {};
  if (stepId === 'sleep' && !byValue(POSITIONS, answers.position)) {
    errors.position = 'Choose the position you sleep in most.';
  }
  if (stepId === 'body') {
    const exact = parseExactWeight(answers.weightExact);
    if (exact.error) errors.weightExact = exact.error;
    else if (exact.value == null && !byValue(WEIGHT_BANDS, answers.weightBand)) {
      errors.weightBand = 'Choose a weight range, or enter an exact weight.';
    }
  }
  if (stepId === 'comfort' && !byValue(FIRMNESS, answers.firmness)) {
    errors.firmness = 'Set the firmness you prefer on the scale.';
  }
  if (stepId === 'environment' && !byValue(TEMPERATURES, answers.temperature)) {
    errors.temperature = 'Choose how warm you usually sleep.';
  }
  return errors;
}

/** First step (index into QUESTION_STEPS) that still has a validation error, or -1. */
export function firstInvalidStep(answers: QuizAnswers): number {
  return QUESTION_STEPS.findIndex((s) => Object.keys(validateStep(s.id, answers)).length > 0);
}

/**
 * Quiz answers -> Sleep Profile for POST /api/match. Only fields the user
 * actually answered are sent; optional ones are omitted, never guessed.
 */
export function answersToProfile(answers: QuizAnswers): ProfileDraft {
  const exact = parseExactWeight(answers.weightExact).value;
  const band = byValue(WEIGHT_BANDS, answers.weightBand);
  const profile: ProfileDraft = {
    sleepPosition: answers.position,
    weightLb: exact ?? (band ? band.weightLb : null),
    preferredFirmnessLabel: answers.firmness,
    sleepTemperature: answers.temperature,
  };
  if (byValue(SHARING, answers.sharing) && answers.sharing) profile.motionSensitivity = answers.sharing;
  if (byValue(PAIN_FOCUS, answers.painFocus) && answers.painFocus) profile.painFocus = answers.painFocus;
  if (byValue(EDGE_IMPORTANCE, answers.edge) && answers.edge) profile.edgeImportance = answers.edge;
  const types = (answers.types || []).filter((t) => byValue(MATTRESS_TYPES, t));
  if (types.length) profile.mattressTypePreference = types;
  if (typeof answers.budgetMax === 'number') profile.budgetUsd = { min: 0, max: answers.budgetMax };
  return profile;
}

/**
 * True when lib/profileValidation accepts the draft, i.e. it is a complete
 * Sleep Profile that POST /api/match will score (the same check the route runs).
 */
export function isScorableProfile(profile: ProfileDraft): profile is SleepProfile {
  return !validateProfile(profile);
}

/** Firmness from a URL value: a label ('medium-firm') or a 1-10 number (nearest label). */
export function firmnessFromParam(raw: unknown): FirmnessLabel | null {
  if (raw == null) return null;
  const text = String(raw).trim().toLowerCase();
  const exact = pick(FIRMNESS, text);
  if (exact) return exact;
  const n = Number(text);
  if (!text || !Number.isFinite(n) || n < 1 || n > 10) return null;
  let best: FirmnessOption | null = null;
  for (const f of FIRMNESS) if (!best || Math.abs(f.scale - n) < Math.abs(best.scale - n)) best = f;
  return best ? best.value : null;
}

/** Prefill from ?position=&firmness= (homepage teaser). Returns partial answers. */
export function answersFromSearch(search: string | null | undefined): Partial<QuizAnswers> {
  const params = new URLSearchParams(search || '');
  const out: Partial<QuizAnswers> = {};
  const position = pick(POSITIONS, (params.get('position') || '').trim().toLowerCase());
  if (position) out.position = position;
  const firmness = firmnessFromParam(params.get('firmness'));
  if (firmness) out.firmness = firmness;
  return out;
}

/** Sanitises answers read back from storage (untrusted JSON), dropping anything unrecognised. */
export function sanitiseAnswers(raw: unknown): QuizAnswers {
  const a: Record<string, unknown> = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const budgetMax = a.budgetMax;
  return {
    position: pick(POSITIONS, a.position),
    weightBand: pick(WEIGHT_BANDS, a.weightBand),
    weightExact: typeof a.weightExact === 'string' ? a.weightExact.slice(0, 6) : '',
    firmness: pick(FIRMNESS, a.firmness),
    painFocus: pick(PAIN_FOCUS, a.painFocus),
    temperature: pick(TEMPERATURES, a.temperature),
    sharing: pick(SHARING, a.sharing),
    edge: pick(EDGE_IMPORTANCE, a.edge),
    types: Array.isArray(a.types)
      ? [...new Set(a.types.map((t: unknown) => pick(MATTRESS_TYPES, t)).filter((t): t is MattressType => t !== null))]
      : [],
    budgetMax: typeof budgetMax === 'number' && BUDGET_STOPS.includes(budgetMax) ? budgetMax : null,
  };
}

/**
 * How many catalog mattresses survive the type/budget filters. Mirrors
 * lib/matchLogic.ts filterCatalog (types; with a budget, unpriced
 * mattresses are excluded because they can't be confirmed to fit) so the
 * quiz can warn before an empty result.
 */
export function countEligible(catalog: readonly QuizCatalogItem[] | null | undefined, answers: QuizAnswers): number {
  const types = answers.types || [];
  const max = answers.budgetMax;
  return (catalog || []).filter((m) => {
    if (types.length && !types.includes(m.type)) return false;
    if (typeof max === 'number') {
      if (typeof m.priceUsd !== 'number') return false;
      if (m.priceUsd > max) return false;
    }
    return true;
  }).length;
}

/** Short chips describing the profile, for the results summary. */
export function profileChips(answers: QuizAnswers): ProfileChip[] {
  const chips: ProfileChip[] = [];
  const pos = byValue(POSITIONS, answers.position);
  if (pos) chips.push({ id: 'position', step: 0, label: `${pos.label} sleeper` });
  const exact = parseExactWeight(answers.weightExact).value;
  const band = byValue(WEIGHT_BANDS, exact != null ? bandForWeight(exact) : answers.weightBand);
  if (exact != null) chips.push({ id: 'weight', step: 1, label: `${exact} lb` });
  else if (band) chips.push({ id: 'weight', step: 1, label: band.label });
  const firm = byValue(FIRMNESS, answers.firmness);
  if (firm) chips.push({ id: 'firmness', step: 2, label: `Prefers ${firm.label.toLowerCase()}` });
  const pain = byValue(PAIN_FOCUS, answers.painFocus);
  if (pain && pain.value !== 'none') chips.push({ id: 'pain', step: 2, label: `Support: ${pain.label.toLowerCase()}` });
  const temp = byValue(TEMPERATURES, answers.temperature);
  if (temp) chips.push({ id: 'temperature', step: 3, label: temp.value === 'hot' ? 'Sleeps warm' : temp.value === 'cold' ? 'Sleeps cool' : 'Neutral temperature' });
  const share = byValue(SHARING, answers.sharing);
  if (share) chips.push({ id: 'sharing', step: 3, label: share.label });
  const edge = byValue(EDGE_IMPORTANCE, answers.edge);
  if (edge) chips.push({ id: 'edge', step: 4, label: `Edge support: ${edge.label.toLowerCase()}` });
  const types = (answers.types || []).map((t) => optionLabel(MATTRESS_TYPES, t)).filter(Boolean);
  chips.push({ id: 'types', step: 4, label: types.length ? types.join(', ') : 'Any mattress type' });
  chips.push({ id: 'budget', step: 4, label: typeof answers.budgetMax === 'number' ? `Budget ${budgetLabel(answers.budgetMax).toLowerCase()}` : 'Any budget' });
  return chips;
}

/** Stable key for a set of answers, so a stored result can be matched to the answers that produced it. */
export function answersKey(answers: QuizAnswers): string {
  return JSON.stringify(answersToProfile(answers));
}

/** A stored profile-shaped object (untrusted: read back from localStorage). */
export type StoredProfileLike = Partial<Record<keyof SleepProfile, unknown>>;

/**
 * Sleep Profile (e.g. the opt-in saved profile from lib/deviceStorage) ->
 * quiz answers, so a remembered profile can be re-scored and edited.
 * A weight equal to a band's representative weight maps back to that band;
 * any other weight becomes the exact-weight answer. Round-trips through
 * answersToProfile(). Returns null for a missing profile.
 */
export function profileToAnswers(profile: StoredProfileLike | null | undefined): QuizAnswers | null {
  if (!profile || typeof profile !== 'object') return null;
  const weight = profile.weightLb;
  const lb = typeof weight === 'number' && Number.isFinite(weight) ? Math.round(weight) : null;
  const band = lb == null ? null : WEIGHT_BANDS.find((b) => b.weightLb === lb) || null;
  const budget = profile.budgetUsd;
  const budgetMax = budget && typeof budget === 'object' && typeof (budget as { max?: unknown }).max === 'number' ? (budget as { max: number }).max : null;
  return sanitiseAnswers({
    position: profile.sleepPosition,
    weightBand: band ? band.value : lb != null ? bandForWeight(lb) : null,
    weightExact: band || lb == null ? '' : String(lb),
    firmness: profile.preferredFirmnessLabel,
    painFocus: typeof profile.painFocus === 'string' ? profile.painFocus : null,
    temperature: profile.sleepTemperature,
    sharing: profile.motionSensitivity,
    edge: profile.edgeImportance,
    types: Array.isArray(profile.mattressTypePreference) ? profile.mattressTypePreference : [],
    budgetMax,
  });
}
