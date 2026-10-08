'use client';

import { useEffect, useState } from 'react';
import { useLastResult } from '@/lib/useLastResult';
import type { ProfileLike } from '@/lib/compareTopics';
import type { MatchItem } from '@/lib/types';
import { slimItem } from './compareModel';
import type { SlimItem } from './types';

export type ProfileScoreStatus = 'pending' | 'none' | 'loading' | 'ready' | 'error';

export interface ProfileScores {
  /** 'pending' = not hydrated yet (sessionStorage not read). */
  status: ProfileScoreStatus;
  /** Slimmed engine items by mattress id (empty unless status is 'ready'). */
  items: Record<string, SlimItem>;
  profile: ProfileLike | null;
  retry: () => void;
}

type ScoreResponse = { key: string; items: Record<string, SlimItem>; error?: undefined } | { key: string; error: true; items?: undefined };

/**
 * Scores the given mattress ids for the visitor's saved sleep profile
 * (sessionStorage 'mms_last_result', written by the quiz) by calling the real
 * engine through POST /api/match. Nothing is computed or guessed here.
 *
 * The saved profile's budget and type filters are dropped for this request so
 * every mattress the visitor picked can be scored (neither affects a score;
 * they only decide eligibility). The page marks prices above the budget.
 */
export function useProfileScores(ids: readonly string[]): ProfileScores {
  const { payload, hydrated } = useLastResult();
  // The stored payload is untyped JSON from sessionStorage; only an object profile is used.
  const stored: unknown = payload && typeof payload === 'object' ? (payload as { profile?: unknown }).profile : null;
  const profile = stored && typeof stored === 'object' ? (stored as ProfileLike) : null;
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<ScoreResponse | null>(null);

  // Primitive keys, so the request re-runs only when the profile, the ids or the retry count change.
  const profileJson = profile ? JSON.stringify(profile) : null;
  const idsKey = ids.join(',');
  const requestKey = profileJson && ids.length ? `${profileJson}|${idsKey}|${attempt}` : null;

  useEffect(() => {
    if (!profileJson || !idsKey) return undefined;
    const key = `${profileJson}|${idsKey}|${attempt}`;
    const wanted = idsKey.split(',');
    const controller = new AbortController();
    const { budgetUsd, mattressTypePreference, scoreVersion, ...scoringProfile } = JSON.parse(profileJson) as ProfileLike;
    fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scoringProfile),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? (res.json() as Promise<{ results?: (MatchItem | null)[] }>) : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        const items: Record<string, SlimItem> = {};
        for (const item of data.results || []) {
          if (item && item.entry && wanted.includes(item.entry.id)) items[item.entry.id] = slimItem(item);
        }
        setResponse({ key, items });
      })
      .catch((err: unknown) => {
        if (err && typeof err === 'object' && (err as { name?: unknown }).name === 'AbortError') return;
        setResponse({ key, error: true });
      });
    return () => controller.abort();
  }, [profileJson, idsKey, attempt]);

  let status: ProfileScoreStatus;
  if (!hydrated) status = 'pending';
  else if (!profile) status = 'none';
  else if (!response || response.key !== requestKey) status = 'loading';
  else status = response.error ? 'error' : 'ready';

  return {
    status,
    items: status === 'ready' && response && response.items ? response.items : {},
    profile,
    retry: () => setAttempt((a) => a + 1),
  };
}
