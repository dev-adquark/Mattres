'use client';

import { useEffect, useRef, useState } from 'react';
import type { SleepProfile } from '@/lib/types';
import { topFromRun, type PreviewRunItem } from './previewGrid';
import type { PreviewTop } from './types';

export type LiveState =
  | { status: 'idle' }
  | { status: 'loading'; key: string }
  | { status: 'ready'; key: string; top: PreviewTop | null }
  | { status: 'error'; key: string; message: string };

/** Wait this long after the last change before scoring, so a run of clicks is one request. */
const DEBOUNCE_MS = 220;

/**
 * Scores a preview profile live through POST /api/match - the same validated
 * engine endpoint the full match uses - when the answers are outside the
 * precomputed grid. `profile` null = use the grid (no request). Results are
 * cached per profile for the page view, so stepping back is instant and
 * never re-requests. Every value shown comes from the response; on failure
 * the caller shows the error instead of a stale or guessed result.
 */
export function useLivePreview(profile: SleepProfile | null): LiveState {
  const key = profile ? JSON.stringify(profile) : null;
  // Settled answers per profile key (a scored top, or an error message).
  const [settled, setSettled] = useState<ReadonlyMap<string, { top: PreviewTop | null } | { error: string }>>(() => new Map());
  const settledRef = useRef(settled);
  useEffect(() => {
    settledRef.current = settled;
  });

  useEffect(() => {
    if (!key) return undefined;
    // Scored answers are kept for the page view; a failed one is retried when it is chosen again.
    const prior = settledRef.current.get(key);
    if (prior && !('error' in prior)) return undefined;
    const controller = new AbortController();
    const settle = (value: { top: PreviewTop | null } | { error: string }) =>
      setSettled((prev) => {
        const next = new Map(prev);
        next.set(key, value);
        return next;
      });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: key,
          signal: controller.signal,
        });
        const body = (await res.json().catch(() => null)) as { results?: PreviewRunItem[] } | null;
        if (!res.ok || !body || !Array.isArray(body.results)) {
          settle({
            error: res.status === 429 ? 'Too many changes in a minute. Wait a moment, then change an answer again.' : 'This combination could not be scored right now.',
          });
          return;
        }
        settle({ top: topFromRun(body.results) });
      } catch (err) {
        if ((err as { name?: string } | null)?.name === 'AbortError') return;
        settle({ error: 'This combination could not be scored right now.' });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  if (!key) return { status: 'idle' };
  const hit = settled.get(key);
  if (!hit) return { status: 'loading', key };
  if ('error' in hit) return { status: 'error', key, message: hit.error };
  return { status: 'ready', key, top: hit.top };
}
