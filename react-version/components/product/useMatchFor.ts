'use client';

import { useEffect, useState } from 'react';
import { useLastResult } from '@/lib/useLastResult';
import { loadSavedProfile, DEVICE_DATA_CLEARED_EVENT } from '@/lib/deviceStorage';
import type { MatchItem, MatchResponse } from '@/lib/types';
import { indexLastResult, type StoredProfile } from './lastResult';

/** A POST /api/match response re-scored from the profile saved on this device. */
interface SavedRescore extends MatchResponse {
  profile: unknown;
  fromSavedProfile: true;
}

function isMatchResponse(data: unknown): data is MatchResponse {
  return Boolean(data) && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results);
}

// One re-score per page load for a profile the visitor chose to remember on
// this device (lib/deviceStorage, opt-in). Shared by every hook instance.
let savedRequest: Promise<SavedRescore | null> | null = null;

function rescoreSavedProfile(): Promise<SavedRescore | null> {
  if (savedRequest) return savedRequest;
  const profile: unknown = loadSavedProfile();
  if (!profile) return Promise.resolve(null);
  savedRequest = fetch('/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
    .then((res) => (res.ok ? (res.json() as Promise<unknown>) : null))
    .then((data): SavedRescore | null => (isMatchResponse(data) ? { ...data, profile, fromSavedProfile: true } : null))
    .catch(() => null);
  return savedRequest;
}

export interface MatchFor {
  /** sessionStorage has been read (false during SSR and the first client render). */
  hydrated: boolean;
  /** The visitor has any quiz result (this session or a remembered profile). */
  hasQuiz: boolean;
  /** The engine's result for this mattress, or null when it was filtered out / there is no quiz. */
  item: MatchItem | null;
  profile: StoredProfile | null;
}

/**
 * The visitor's engine result for one mattress: from this session's quiz
 * (sessionStorage) first, otherwise re-scored from a profile they opted to
 * remember on this device. Never a placeholder.
 */
export function useMatchFor(mattressId: string): MatchFor {
  const { payload, hydrated } = useLastResult();
  const [saved, setSaved] = useState<SavedRescore | null>(null);

  useEffect(() => {
    if (!hydrated || payload) return undefined;
    let alive = true;
    rescoreSavedProfile().then((data) => {
      if (alive && data) setSaved(data);
    });
    const onCleared = () => {
      savedRequest = null;
      setSaved(null);
    };
    window.addEventListener(DEVICE_DATA_CLEARED_EVENT, onCleared);
    return () => {
      alive = false;
      window.removeEventListener(DEVICE_DATA_CLEARED_EVENT, onCleared);
    };
  }, [hydrated, payload]);

  const index = indexLastResult(payload || saved);
  return {
    hydrated,
    hasQuiz: Boolean(index),
    item: index ? index.items[mattressId] || null : null,
    profile: index ? index.profile : null,
  };
}
