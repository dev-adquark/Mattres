/**
 * The wire shape of POST /api/match. The engine's per-result `trace` (the
 * full list of rules evaluated, ~4 KB per mattress) is omitted by default:
 * no page renders it, and it made the response ~370 KB. Callers that want
 * to audit it send `?trace=1`. Scores, reasons and warnings are unchanged -
 * this only drops a field from the serialized response, never from the
 * engine output (the v0.1 regression and v0.2 tests read the engine directly).
 */

import type { MatchItem, MatchResponse, ScoreResult } from '@/lib/types';

export type WireScoreResult = Omit<ScoreResult, 'trace'> & Partial<Pick<ScoreResult, 'trace'>>;
export type WireMatchItem = Omit<MatchItem, 'result'> & { result: WireScoreResult };
export type WireMatchResponse = Omit<MatchResponse, 'results'> & { results: WireMatchItem[] };

/** Drops `result.trace` from every item. Leaves anything that is not a results payload untouched. */
export function withoutTrace<T>(payload: T): T | WireMatchResponse {
  const results = (payload as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return payload;
  return {
    ...(payload as unknown as MatchResponse),
    results: (results as MatchItem[]).map((item) => {
      if (!item || typeof item !== 'object' || !item.result) return item;
      const { trace, ...result } = item.result;
      void trace;
      return { ...item, result };
    }),
  };
}
