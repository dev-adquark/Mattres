import type { SleepProfile } from '@/lib/types';
import type { WireMatchResponse } from '@/lib/matchPayload';

export type MatchErrorKind = 'rate' | 'offline' | 'server';

/** The outcome of one POST /api/match, or null when the request was aborted. */
export type MatchOutcome = { data: WireMatchResponse } | { error: MatchErrorKind };

/**
 * POST /api/match. Scores only ever come from this route. Resolves to
 * {data} on success, {error} on a rate limit / server / network failure,
 * or null if `signal` aborted the request.
 */
export async function requestMatch(profile: SleepProfile, signal: AbortSignal): Promise<MatchOutcome | null> {
  try {
    const res = await fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
      signal,
    });
    if (res.status === 429) return { error: 'rate' };
    if (!res.ok) return { error: 'server' };
    // Response boundary: the shape is checked (results array) before use.
    const data: unknown = await res.json();
    if (!data || typeof data !== 'object' || !Array.isArray((data as { results?: unknown }).results)) return { error: 'server' };
    return { data: data as WireMatchResponse };
  } catch (err) {
    if (err && typeof err === 'object' && (err as { name?: unknown }).name === 'AbortError') return null;
    return { error: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'server' };
  }
}
