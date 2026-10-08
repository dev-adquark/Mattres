import type { MatchItem, SleepProfile } from '@/lib/types';

/**
 * Reads the visitor's last quiz result (lib/useLastResult payload, stored in
 * sessionStorage as { profile, top, results, ... }) defensively: any shape
 * problem means "no result", never a made-up score.
 */

/** The profile stored next to a result. Read loosely: it came from device storage. */
export type StoredProfile = Partial<SleepProfile>;

export interface LastResultIndex {
  scores: Record<string, number>;
  items: Record<string, MatchItem>;
  profile: StoredProfile | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

/**
 * Guard for one stored result item. Only the fields every consumer relies on
 * (entry.id, result.overallScore) are checked; the rest is the engine's own
 * matchProfile() output written to storage by this app, so it is trusted as
 * MatchItem past this point.
 */
function isItem(item: unknown): item is MatchItem {
  if (!isRecord(item) || !isRecord(item.entry) || !isRecord(item.result)) return false;
  return typeof item.entry.id === 'string' && typeof item.result.overallScore === 'number';
}

export function indexLastResult(payload: unknown): LastResultIndex | null {
  if (!isRecord(payload)) return null;
  const list: MatchItem[] = Array.isArray(payload.results) ? payload.results.filter(isItem) : [];
  if (!list.length && isItem(payload.top)) list.push(payload.top);
  if (!list.length) return null;
  const scores: Record<string, number> = {};
  const items: Record<string, MatchItem> = {};
  for (const item of list) {
    scores[item.entry.id] = item.result.overallScore;
    items[item.entry.id] = item;
  }
  return { scores, items, profile: isRecord(payload.profile) ? (payload.profile as StoredProfile) : null };
}

/** The stored result item for one mattress, or null. */
export function lastResultFor(payload: unknown, mattressId: string): MatchItem | null {
  const index = indexLastResult(payload);
  return index ? index.items[mattressId] || null : null;
}

const POSITION: Record<string, string> = { side: 'Side sleeper', back: 'Back sleeper', stomach: 'Stomach sleeper', combination: 'Combination sleeper' };
const TEMP: Record<string, string> = { hot: 'sleeps hot', cold: 'sleeps cold', neutral: 'neutral temperature' };

/** Short, non-identifying summary of a stored profile, e.g. "Side sleeper · medium-soft · sleeps hot". */
export function profileSummary(stored: unknown): string | null {
  if (!isRecord(stored)) return null;
  // Read loosely: it came from device storage. Unknown values map to nothing.
  const profile = stored as StoredProfile;
  const parts = [
    profile.sleepPosition ? POSITION[profile.sleepPosition] : undefined,
    profile.preferredFirmnessLabel,
    profile.sleepTemperature ? TEMP[profile.sleepTemperature] : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
