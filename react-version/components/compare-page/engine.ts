/**
 * Server-side access to the catalog and the scoring engine for the compare
 * area. A thin pass-through: no logic lives here, the values are returned
 * unchanged.
 */
import { getCatalog } from '@/lib/db/mattressRepo';
import { matchProfile, type MatchProfileInput } from '@/lib/matchLogic';
import type { MatchItem, MattressEntry } from '@/lib/types';

export interface EngineRanking {
  results: MatchItem[];
  modelVersion: string | null;
}

/** Every catalog record (database, or the committed JSON fallback). */
export async function loadCatalog(): Promise<MattressEntry[]> {
  const { entries } = await getCatalog();
  return entries;
}

/** matchProfile() for a profile: the engine's ranked results and model version. */
export async function rankForProfile(profile: MatchProfileInput): Promise<EngineRanking> {
  const { results, modelVersion } = await matchProfile(profile);
  return { results, modelVersion };
}
