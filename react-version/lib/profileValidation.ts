/**
 * Validation for the Sleep Profile accepted by POST /api/match. Kept out of
 * the route file (route files may only export HTTP handlers / segment
 * config) so it can be unit-tested directly.
 *
 * Returns a user-facing error string, or null when the profile is valid.
 */

import type {
  EdgeImportance,
  FirmnessLabel,
  MattressType,
  MotionSensitivity,
  PainFocus,
  ScoreVersion,
  SleepPosition,
  SleepTemperature,
} from '@/lib/types';

export const POSITIONS: readonly SleepPosition[] = ['side', 'back', 'stomach', 'combination'];
export const FIRMNESS_LABELS: readonly FirmnessLabel[] = ['soft', 'medium-soft', 'medium', 'medium-firm', 'firm', 'extra-firm'];
export const TEMPERATURES: readonly SleepTemperature[] = ['cold', 'neutral', 'hot'];
export const MOTION_SENSITIVITIES: readonly MotionSensitivity[] = ['single', 'couple-low', 'couple-high'];
export const MATTRESS_TYPES: readonly MattressType[] = ['foam', 'hybrid', 'innerspring', 'latex'];
export const PAIN_FOCUS: readonly PainFocus[] = ['shoulders', 'hips', 'lower-back', 'whole-body', 'none'];
/** Legacy array values still sent by older callers (lib/compareTopics etc.); normalised by the engine. */
export const LEGACY_PAIN_FOCUS: readonly string[] = ['shoulder', 'hip', 'back', 'lowerBack', 'neck'];
export const EDGE_IMPORTANCE: readonly EdgeImportance[] = ['low', 'medium', 'high'];
export const SCORE_VERSIONS: readonly ScoreVersion[] = ['0.1', '0.2'];

/** The explicit "no firmness preference" value accepted by POST /api/match. */
export const NO_FIRMNESS_PREFERENCE = 'none';

/** True when a request states no firmness preference (omitted, null or 'none'). */
export function isNoFirmnessPreference(value: unknown): boolean {
  return value === undefined || value === null || value === NO_FIRMNESS_PREFERENCE;
}

const has = (list: readonly string[], value: unknown): boolean => list.indexOf(value as string) !== -1;

/** Validates an untrusted request body. Returns a user-facing error, or null when valid. */
export function validateProfile(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Profile must be a JSON object.';
  // Untrusted JSON: every field is checked below before it is relied on.
  const profile = input as Record<string, unknown> & { weightLb?: number; budgetUsd?: unknown; painFocus?: unknown };
  if (!has(POSITIONS, profile.sleepPosition)) return 'Choose a valid sleep position.';
  const weightLb = profile.weightLb as number;
  if (!Number.isFinite(weightLb) || weightLb < 50 || weightLb > 700) return 'Weight must be a number between 50 and 700 lb.';
  // Optional: omitted, null or 'none' means "no firmness preference" - the
  // engine then skips its preference check (this is the reference sleeper
  // behind every published product / category / brand score).
  if (!isNoFirmnessPreference(profile.preferredFirmnessLabel) && !has(FIRMNESS_LABELS, profile.preferredFirmnessLabel)) {
    return 'Choose a valid firmness preference.';
  }
  if (!has(TEMPERATURES, profile.sleepTemperature)) return 'Choose a valid sleep temperature.';
  if (profile.motionSensitivity !== undefined && !has(MOTION_SENSITIVITIES, profile.motionSensitivity)) return 'Choose a valid motion sensitivity.';
  if (profile.mattressTypePreference !== undefined &&
      (!Array.isArray(profile.mattressTypePreference) ||
       profile.mattressTypePreference.some((type) => !has(MATTRESS_TYPES, type)))) {
    return 'Mattress type preferences must be a list of supported types.';
  }
  if (profile.budgetUsd !== undefined) {
    const budgetValue = profile.budgetUsd;
    if (!budgetValue || typeof budgetValue !== 'object' || Array.isArray(budgetValue)) return 'Budget must be an object.';
    const budget = budgetValue as { min?: number | null; max?: number | null };
    const min = (budget.min ?? 0) as number;
    const max = budget.max;
    if (!Number.isFinite(min) || min < 0 || min > 100000 ||
        (max !== undefined && max !== null && (!Number.isFinite(max) || max < 0 || max > 100000)) ||
        (max !== undefined && max !== null && max < min)) {
      return 'Budget must use valid amounts between $0 and $100,000, with maximum not below minimum.';
    }
  }
  if (profile.painFocus !== undefined && profile.painFocus !== null) {
    const pf = profile.painFocus;
    const ok = typeof pf === 'string'
      ? has(PAIN_FOCUS, pf)
      : Array.isArray(pf) && pf.length <= 5 && pf.every((v) => has(PAIN_FOCUS, v) || has(LEGACY_PAIN_FOCUS, v));
    if (!ok) return 'Choose a valid pain focus.';
  }
  if (profile.edgeImportance !== undefined && profile.edgeImportance !== null && !has(EDGE_IMPORTANCE, profile.edgeImportance)) {
    return 'Choose a valid edge-support importance.';
  }
  if (profile.scoreVersion !== undefined && !has(SCORE_VERSIONS, profile.scoreVersion)) {
    return 'Unsupported score version.';
  }
  return null;
}
