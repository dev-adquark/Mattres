import { toReferenceVoice } from '@/lib/explain';
import { matchProfile } from '@/lib/matchLogic';
import type { ReferenceProfileId } from '@/lib/categories';
import type { FirmnessLabel, ScoreResult, SleepProfile, SubScores } from '@/lib/types';

/**
 * Engine scores for fixed, fully disclosed REFERENCE sleepers, used by the
 * catalog sorts and the /mattresses/<category> rankings. Every number here
 * is a real scoreEngine output (default model); nothing is hand-ranked.
 *
 * Ranking integrity rule: an entry is only RANKED when at least
 * MIN_MEASURED of its six scored dimensions are 'measured' (backed by a
 * published spec or an independent rating) rather than 'estimated'. Others
 * are listed separately, alphabetically, as "Not enough independent data to
 * rank" - they still have a score, but we won't place them on a podium.
 */

export const MIN_MEASURED = 3;

// The rule's wording lives with the client-safe registry (lib/categories) so client components can share it.
export { RANKING_RULE_CLAUSE, RANKING_RULE_TEXT, UNRANKED_TITLE } from '@/lib/categories';

/** A matchProfile() input. Reference sleepers state no firmness preference unless the page is about one. */
export type ReferenceProfile = Omit<SleepProfile, 'preferredFirmnessLabel'> & { preferredFirmnessLabel?: FirmnessLabel };

export interface ReferenceProfileDef {
  profile: Readonly<ReferenceProfile>;
  /** Short label, e.g. "Side sleeper". */
  label: string;
  /** Full plain-language disclosure of who the list is ranked for. */
  text: string;
}

/** The base reference sleeper: 160 lb, neutral temperature, sleeps alone, no firmness preference. */
export const REFERENCE_BASE = Object.freeze({ weightLb: 160, sleepTemperature: 'neutral', motionSensitivity: 'single' } as const);

const P = (over: Pick<ReferenceProfile, 'sleepPosition'> & Partial<ReferenceProfile>): Readonly<ReferenceProfile> => Object.freeze({ ...REFERENCE_BASE, ...over });

/**
 * id -> { profile (matchProfile input), label (short), text (full disclosure) }.
 * Changing a profile here changes every page that ranks by it, and the
 * disclosure text changes with it.
 */
export const REFERENCE_PROFILES: Readonly<Record<ReferenceProfileId, ReferenceProfileDef>> = Object.freeze({
  side: { profile: P({ sleepPosition: 'side' }), label: 'Side sleeper', text: 'Side sleeper, 160 lb, sleeps neither hot nor cold, sleeps alone, no firmness preference.' },
  back: { profile: P({ sleepPosition: 'back' }), label: 'Back sleeper', text: 'Back sleeper, 160 lb, sleeps neither hot nor cold, sleeps alone, no firmness preference.' },
  stomach: { profile: P({ sleepPosition: 'stomach' }), label: 'Stomach sleeper', text: 'Stomach sleeper, 160 lb, sleeps neither hot nor cold, sleeps alone, no firmness preference.' },
  combination: { profile: P({ sleepPosition: 'combination' }), label: 'Combination sleeper', text: 'Combination sleeper, 160 lb, sleeps neither hot nor cold, sleeps alone, no firmness preference.' },
  couples: {
    profile: P({ sleepPosition: 'combination', motionSensitivity: 'couple-high' }),
    label: 'Couple, light sleeper',
    text: 'Combination sleeper, 160 lb, shares the bed with a partner and wakes easily when they move, sleeps neither hot nor cold, no firmness preference.',
  },
  hot: {
    profile: P({ sleepPosition: 'combination', sleepTemperature: 'hot' }),
    label: 'Hot sleeper',
    text: 'Combination sleeper, 160 lb, sleeps hot, sleeps alone, no firmness preference.',
  },
  firm: {
    profile: P({ sleepPosition: 'back', preferredFirmnessLabel: 'firm' }),
    label: 'Back sleeper who prefers firm',
    text: 'Back sleeper, 160 lb, prefers a firm feel, sleeps neither hot nor cold, sleeps alone.',
  },
  soft: {
    profile: P({ sleepPosition: 'side', preferredFirmnessLabel: 'soft' }),
    label: 'Side sleeper who prefers soft',
    text: 'Side sleeper, 160 lb, prefers a soft feel, sleeps neither hot nor cold, sleeps alone.',
  },
  heavy: {
    profile: P({ sleepPosition: 'back', weightLb: 260 }),
    label: 'Heavier back sleeper',
    text: 'Back sleeper, 260 lb (the engine’s heaviest weight band starts at 230 lb), sleeps neither hot nor cold, sleeps alone, no firmness preference.',
  },
});

export type MeanPosition = 'side' | 'back' | 'stomach' | 'combination';

/** The four positions averaged for the "mean reference score" used by /best and the type pages. */
export const MEAN_POSITIONS: readonly MeanPosition[] = ['side', 'back', 'stomach', 'combination'];
export const MEAN_TEXT =
  'Average of four reference sleepers (side, back, stomach and combination), each 160 lb, sleeping neither hot nor cold, alone, with no firmness preference.';

/** One mattress's engine output for one reference sleeper, reduced to what the pages show. */
export interface ReferenceScore {
  score: number;
  tier: string | null;
  headline: string | null;
  reasons: string[];
  watchOuts: { title: string | null; text: string | null }[];
  measured: number;
  subScores: Partial<SubScores>;
}

/** mattress id -> score for one reference sleeper. */
export type ProfileScores = Record<string, ReferenceScore>;
export type ScoredProfiles = Partial<Record<ReferenceProfileId, ProfileScores>>;

function measuredCount(result: Pick<ScoreResult, 'dimensionProvenance'> | null | undefined): number {
  const prov = result && result.dimensionProvenance ? Object.values(result.dimensionProvenance) : [];
  return prov.filter((v) => v === 'measured').length;
}

/**
 * The integrity-rule ranking of one engine run, shared by the category pages,
 * the product page and the head-to-head pages so a mattress has one rank per
 * sleeper everywhere: only results with MIN_MEASURED+ backed dimensions are
 * ranked, by score, then backed dimensions, then id. `rankOf` has no entry
 * for an unranked mattress; `total` is how many are ranked.
 */
export function eligibleRanks(
  results: readonly { entry: { id: string }; result: Pick<ScoreResult, 'overallScore' | 'dimensionProvenance'> }[]
): { rankOf: Map<string, number>; total: number } {
  const ranked = results
    .filter((item) => measuredCount(item.result) >= MIN_MEASURED)
    .sort(
      (a, b) =>
        b.result.overallScore - a.result.overallScore || measuredCount(b.result) - measuredCount(a.result) || a.entry.id.localeCompare(b.entry.id)
    );
  return { rankOf: new Map(ranked.map((item, index) => [item.entry.id, index + 1])), total: ranked.length };
}

/** Scores one reference profile. */
export async function scoreReferenceProfile(profileId: ReferenceProfileId): Promise<{ modelVersion: string | null; byId: ProfileScores }> {
  const def = REFERENCE_PROFILES[profileId];
  if (!def) throw new Error(`Unknown reference profile: ${profileId}`);
  const out = await matchProfile({ ...def.profile });
  const byId: ProfileScores = {};
  for (const item of out.results) {
    const ex = item.explanation;
    byId[item.entry.id] = {
      score: item.result.overallScore,
      tier: ex?.tier ? ex.tier.label : null,
      headline: ex?.headline ? toReferenceVoice(ex.headline) : null,
      reasons: Array.isArray(ex?.reasons) ? ex.reasons.map((r) => toReferenceVoice(r.text)).filter(Boolean) : [],
      watchOuts: Array.isArray(ex?.watchOuts) ? ex.watchOuts.filter((w) => w && (w.title || w.text)).map((w) => ({ title: w.title || null, text: w.text ? toReferenceVoice(w.text) : null })) : [],
      measured: measuredCount(item.result),
      subScores: item.result.subScores || {},
    };
  }
  return { modelVersion: out.modelVersion || null, byId };
}

/** Scores several profiles at once: { modelVersion, profiles: { [id]: byId } }. */
export async function scoreReferenceProfiles(ids: readonly ReferenceProfileId[]): Promise<{ modelVersion: string | null; profiles: ScoredProfiles }> {
  const unique = [...new Set(ids)];
  const scored = await Promise.all(unique.map((id) => scoreReferenceProfile(id)));
  const profiles: ScoredProfiles = {};
  let modelVersion: string | null = null;
  unique.forEach((id, i) => {
    const s = scored[i];
    if (!s) return;
    profiles[id] = s.byId;
    modelVersion = modelVersion || s.modelVersion;
  });
  return { modelVersion, profiles };
}

/** Mean of the four position scores per entry, one decimal. Entries missing any position get no mean. */
export function meanScores(profiles: ScoredProfiles): Record<string, number> {
  const ids = new Set(MEAN_POSITIONS.flatMap((p) => Object.keys(profiles[p] || {})));
  const out: Record<string, number> = {};
  for (const id of ids) {
    const values = MEAN_POSITIONS.map((p) => profiles[p]?.[id]?.score);
    if (values.every((v): v is number => typeof v === 'number')) out[id] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }
  return out;
}

/**
 * Compact payload for the client catalog: scores per sort plus measured
 * counts, so the listing can apply the same integrity rule.
 */
export interface CatalogReference {
  modelVersion: string | null;
  mean: Record<string, number>;
  side: Record<string, number>;
  back: Record<string, number>;
  stomach: Record<string, number>;
  /** Reference combination sleeper (optional so older payloads still type-check). */
  combination?: Record<string, number>;
  couples: Record<string, number>;
  /** Pressure-relief sub-score (0-10) for the reference side sleeper. */
  pressure: Record<string, number | null>;
  measured: Record<string, number>;
}

export async function getCatalogReference(): Promise<CatalogReference> {
  const { modelVersion, profiles } = await scoreReferenceProfiles([...MEAN_POSITIONS, 'couples']);
  const pick = <T,>(p: ReferenceProfileId, fn: (s: ReferenceScore) => T): Record<string, T> =>
    Object.fromEntries(Object.entries(profiles[p] ?? {}).map(([id, s]) => [id, fn(s)]));
  return {
    modelVersion,
    mean: meanScores(profiles),
    side: pick('side', (s) => s.score),
    back: pick('back', (s) => s.score),
    stomach: pick('stomach', (s) => s.score),
    combination: pick('combination', (s) => s.score),
    couples: pick('couples', (s) => s.score),
    pressure: pick('side', (s) => (typeof s.subScores.pressureRelief === 'number' ? s.subScores.pressureRelief : null)),
    measured: pick('combination', (s) => s.measured),
  };
}
