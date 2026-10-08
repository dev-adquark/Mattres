'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLastResult, findResultFor } from '@/lib/useLastResult';
import { loadSavedProfile } from '@/lib/deviceStorage';
import type { SleepProfile } from '@/lib/types';

type ScoreMap = Record<string, number>;

/** A /api/match result row as received over the wire; every field is checked before use. */
interface WireResult {
  entry?: { id?: unknown } | null;
  result?: { overallScore?: unknown } | null;
}

/** Scores for the story slides from this visitor's own profile, or {} when there is none. Never invented. */
export function useStoryScores(ids: string[]): ScoreMap {
  const { payload, hydrated } = useLastResult();
  const [fetched, setFetched] = useState<{ key: string; scores: ScoreMap } | null>(null);

  const fromSession = useMemo(() => {
    const out: ScoreMap = {};
    if (!payload) return out;
    ids.forEach((id) => {
      const score = findResultFor(payload, id)?.item?.result?.overallScore;
      if (typeof score === 'number') out[id] = score;
    });
    return out;
  }, [payload, ids]);

  // Re-score through the engine when a profile exists but this session has no
  // stored score for some slide (an opted-in saved profile, or a partial payload).
  const missing = ids.some((id) => fromSession[id] === undefined);
  const profile = hydrated && missing ? (payload && payload.profile) || loadSavedProfile() : null;
  const profileKey = profile ? JSON.stringify(profile) : '';

  useEffect(() => {
    if (!profileKey) return undefined;
    const controller = new AbortController();
    const body = JSON.parse(profileKey) as Partial<SleepProfile>;
    fetch('/api/match', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scoreVersion: (payload && payload.scoreVersion) || body.scoreVersion || '0.2', ...body }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? (res.json() as Promise<{ results?: unknown }>) : null))
      .then((data) => {
        if (!data || !Array.isArray(data.results)) return;
        const out: ScoreMap = {};
        (data.results as (WireResult | null)[]).forEach((r) => {
          const id = r?.entry?.id;
          const score = r?.result?.overallScore;
          if (typeof id === 'string' && typeof score === 'number') out[id] = score;
        });
        setFetched({ key: profileKey, scores: out });
      })
      .catch(() => {
        /* no score is better than a wrong one: the slide keeps its "Score it for me" link */
      });
    return () => controller.abort();
  }, [profileKey, payload]);

  const extra = fetched && fetched.key === profileKey ? fetched.scores : {};
  return { ...extra, ...fromSession };
}
