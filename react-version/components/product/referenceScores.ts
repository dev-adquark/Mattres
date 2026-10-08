import { toReferenceVoice } from '@/lib/explain';
import { matchProfile } from '@/lib/matchLogic';
import { eligibleRanks } from '@/components/catalog/referenceRankings';
import type { DimensionProvenance, MatchResponse, ScoreCategory, SleepPosition, SleepProfile, SubScores } from '@/lib/types';

/**
 * Engine-computed scores for fixed, fully disclosed REFERENCE sleepers - used
 * for the "Best for side / back sleepers" catalog sorts and the "How it
 * scores for typical sleepers" table on a mattress page. These are real
 * scoreEngine outputs (default model), never hand-written rankings, and the
 * UI always shows REFERENCE_PROFILE_TEXT next to them because they describe
 * a typical sleeper, not the visitor.
 *
 * The reference sleeper weighs 160 lb (the middle of the engine's
 * 130-180 lb band), sleeps neither hot nor cold, sleeps alone and gives no
 * firmness preference, so no preference penalty is applied - only the sleep
 * position changes between profiles.
 */

export interface ReferencePosition {
  id: SleepPosition;
  label: string;
}

/** One mattress's engine output for one reference sleeper. */
export interface ReferenceScore {
  score: number;
  tier: string | null;
  headline: string | null;
  subScores: SubScores | null;
  provenance: Record<ScoreCategory, DimensionProvenance> | null;
  /**
   * Place among the RANKED mattresses for this sleeper (the same eligible set
   * and order as the /mattresses/<position>-sleepers pages), or null when
   * this mattress has too little data to be ranked (see components/catalog/referenceRankings MIN_MEASURED).
   */
  rank: number | null;
  /** How many mattresses are ranked for this sleeper. */
  total: number;
}

export interface ReferenceScores {
  modelVersion: string | null;
  /** position id -> mattress id -> score */
  byPosition: Partial<Record<SleepPosition, Record<string, ReferenceScore>>>;
}

export const REFERENCE_POSITIONS: readonly ReferencePosition[] = [
  { id: 'side', label: 'Side sleeper' },
  { id: 'back', label: 'Back sleeper' },
  { id: 'stomach', label: 'Stomach sleeper' },
  { id: 'combination', label: 'Combination sleeper' },
];

export const REFERENCE_BASE: Pick<SleepProfile, 'weightLb' | 'sleepTemperature' | 'motionSensitivity'> = {
  weightLb: 160,
  sleepTemperature: 'neutral',
  motionSensitivity: 'single',
};

export const REFERENCE_PROFILE_TEXT =
  'Reference sleeper: 160 lb, sleeps neither hot nor cold, sleeps alone, no stated firmness preference. Only the sleep position changes.';

/**
 * @param positions subset of REFERENCE_POSITIONS ids
 * Each entry also carries the engine's 0-10 subScores, its per-dimension
 * provenance ('measured' | 'estimated'), and rank/total: where this mattress
 * places among the ranked entries for that position (rank null = not ranked).
 */
export async function getReferenceScores(positions: readonly SleepPosition[] = REFERENCE_POSITIONS.map((p) => p.id)): Promise<ReferenceScores> {
  const byPosition: ReferenceScores['byPosition'] = {};
  let modelVersion: string | null = null;
  for (const position of positions) {
    const out: Pick<MatchResponse, 'modelVersion' | 'results'> = await matchProfile({ ...REFERENCE_BASE, sleepPosition: position });
    modelVersion = modelVersion || out.modelVersion;
    const scores: Record<string, ReferenceScore> = {};
    byPosition[position] = scores;
    // Same ranking integrity rule (and order) as the category pages.
    const { rankOf, total } = eligibleRanks(out.results);
    out.results.forEach((item) => {
      scores[item.entry.id] = {
        score: item.result.overallScore,
        tier: item.explanation?.tier?.label || null,
        headline: item.explanation?.headline ? toReferenceVoice(item.explanation.headline) : null,
        subScores: item.result.subScores || null,
        provenance: item.result.dimensionProvenance || null,
        rank: rankOf.get(item.entry.id) ?? null,
        total,
      };
    });
  }
  return { modelVersion, byPosition };
}

/**
 * One row of the "score by position" story for a single mattress: a
 * reference position plus its engine output (all null when the engine did
 * not score this mattress for that sleeper) and the position guide link.
 */
export interface ReferenceRow {
  id: SleepPosition;
  label: string;
  score: number | null;
  tier: string | null;
  headline: string | null;
  subScores: SubScores | null;
  provenance: Record<ScoreCategory, DimensionProvenance> | null;
  rank: number | null;
  total: number | null;
  href: string | null;
}

/** The four reference rows for one mattress, in REFERENCE_POSITIONS order. */
export function referenceRowsFor(reference: ReferenceScores, mattressId: string, hrefFor: (position: SleepPosition) => string | null): ReferenceRow[] {
  return REFERENCE_POSITIONS.map((p) => ({
    ...p,
    score: null,
    tier: null,
    headline: null,
    subScores: null,
    provenance: null,
    rank: null,
    total: null,
    ...(reference.byPosition[p.id]?.[mattressId] || {}),
    href: hrefFor(p.id),
  }));
}
