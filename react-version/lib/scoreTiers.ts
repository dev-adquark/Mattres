/**
 * Match-score tiers and per-dimension labels - the single place the UI gets
 * the words for a number. Pure (no Node APIs), safe to import from client
 * components. Components must not invent their own thresholds.
 *
 * tierFor(score 0-100)      -> { id, label, description, min, max }
 * dimensionLabel(sub 0-10)  -> 'Excellent' | 'Strong' | 'Good' | 'Moderate' | 'Weak' | 'Unknown'
 */

import type { Tier } from '@/lib/types';

/** A scored tier always has numeric bounds. */
export type ScoredTier = Tier & { min: number; max: number };

export interface DimensionLevel {
  min: number;
  label: 'Excellent' | 'Strong' | 'Good' | 'Moderate' | 'Weak';
}

export type DimensionLabel = DimensionLevel['label'] | 'Unknown';

export const TIERS: readonly ScoredTier[] = [
  { id: 'excellent', min: 90, max: 100, label: 'Excellent match', description: 'Fits your profile on nearly every dimension we score.' },
  { id: 'strong', min: 80, max: 89, label: 'Strong match', description: 'Fits your profile well, with at most minor trade-offs.' },
  { id: 'good', min: 70, max: 79, label: 'Good match', description: 'A solid fit with some trade-offs worth reading.' },
  { id: 'fair', min: 60, max: 69, label: 'Fair match', description: 'Works on some dimensions but misses on others.' },
  { id: 'weak', min: 0, max: 59, label: 'Weak match', description: 'Poor fit for your profile on the dimensions we score.' },
];

/** Returned for a missing/non-numeric score so callers never crash and never mislabel "no score" as a weak match. */
export const UNSCORED_TIER: Tier = { id: 'unscored', min: null, max: null, label: 'Not scored', description: 'No match score is available for this mattress.' };

export function tierFor(score: unknown): Tier {
  const value = typeof score === 'number' ? score : score == null || score === '' ? NaN : Number(score);
  if (!Number.isFinite(value)) return { ...UNSCORED_TIER };
  const rounded = Math.round(value);
  const tier = TIERS.find((t) => rounded >= t.min) || (TIERS[TIERS.length - 1] as ScoredTier);
  return { ...tier };
}

export const DIMENSION_LEVELS: readonly DimensionLevel[] = [
  { min: 9, label: 'Excellent' },
  { min: 8, label: 'Strong' },
  { min: 7, label: 'Good' },
  { min: 5.5, label: 'Moderate' },
  { min: -Infinity, label: 'Weak' },
];

export function dimensionLabel(sub: unknown): DimensionLabel {
  const value = typeof sub === 'number' ? sub : sub == null || sub === '' ? NaN : Number(sub);
  if (!Number.isFinite(value)) return 'Unknown';
  // The last level's min is -Infinity, so a finite value always finds one.
  return (DIMENSION_LEVELS.find((level) => value >= level.min) as DimensionLevel).label;
}
