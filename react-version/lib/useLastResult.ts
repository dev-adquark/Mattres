'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { DEVICE_DATA_CLEARED_EVENT, STORAGE_KEYS } from '@/lib/deviceStorage';
import type { MatchResponse, ScoreVersion, SleepProfile, VerificationLevel } from '@/lib/types';
import type { WireMatchItem } from '@/lib/matchPayload';
import type { QuizAnswers } from '@/components/match/quizModel';

export const LAST_RESULT_KEY: string = STORAGE_KEYS.lastResult; // 'mms_last_result'
const STORAGE_KEY = LAST_RESULT_KEY;

/** lib/dataIntegrity.ts auditCatalog(), as returned by POST /api/match. */
export interface CatalogAudit {
  total: number;
  verifiedCount: number;
  unverifiedCount: number;
  unverifiedIds: string[];
  missingByEntry: Record<string, string[]>;
  byLevel: Record<VerificationLevel, number>;
}

/**
 * Stored payload, version 2, written by components/match/MatchExperience.
 * `answersKey` ties the result to the quiz answers that produced it;
 * `results` are matchProfile() items as POST /api/match serializes them
 * (without the engine trace - see lib/matchPayload.ts), best first.
 */
export interface StoredMatchResult {
  version: 2;
  savedAt: string;
  answersKey: string;
  answers: QuizAnswers;
  /** The Sleep Profile sent to POST /api/match. */
  profile: SleepProfile;
  scoreVersion: ScoreVersion | null;
  modelVersion: string | null;
  results: WireMatchItem[];
  top: WireMatchItem | null;
  all: MatchResponse['all'];
  catalogAudit: CatalogAudit | null;
  catalogSource: string | null;
}

/**
 * What a reader may find in storage: a v2 payload, or an older
 * version-less one that only had {profile, top, results, all, modelVersion}.
 * Consumers look a mattress up in `results` first and fall back to `top`.
 * It is parsed from sessionStorage, so every field is optional.
 */
export type LastResultPayload = Partial<StoredMatchResult>;

export interface ResultLookup {
  item: WireMatchItem;
  /** 1-based rank, or null. */
  rank: number | null;
  total: number;
}

export interface UseLastResult {
  payload: LastResultPayload | null;
  setPayload: (next: StoredMatchResult) => void;
  clearPayload: () => void;
  hydrated: boolean;
}

/**
 * Ported from the original single-file project's sessionStorage-based
 * pattern, which let a fresh quiz result "broadcast" to the Sleep DNA /
 * Universe / Match Score / Reasoning sections on the home page even though
 * they lived in a completely different part of the same static file.
 *
 * In this Next.js version those sections live on different real ROUTES
 * (the find-match page vs. the home page), so the same mechanism now also
 * has to survive real client-side navigation, not just being in different
 * DOM subtrees of one page - sessionStorage still does exactly that job.
 *
 * payload is null until a quiz has actually been submitted (this session) -
 * every consumer must handle that null case honestly (an empty/example
 * state), never invent placeholder data.
 *
 * Built on useSyncExternalStore rather than useState+useEffect: setting
 * state synchronously inside an effect body causes an extra, avoidable
 * render pass on every mount, which is exactly what useSyncExternalStore
 * exists to solve for reading an external store (sessionStorage) without a
 * hydration mismatch or a wasted render. getSnapshot caches its parsed
 * result and only re-parses when the raw stored string actually changes,
 * so repeated calls return a referentially stable value.
 */
let cachedRaw: string | null | undefined;
let cachedPayload: LastResultPayload | null = null;

function getSnapshot(): LastResultPayload | null {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null; // sessionStorage unavailable (e.g. private mode) - non-fatal.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      // Untrusted storage boundary: only "is an object" is checked here;
      // consumers treat every field as optional (see LastResultPayload).
      cachedPayload = parsed && typeof parsed === 'object' ? (parsed as LastResultPayload) : null;
    } catch {
      cachedPayload = null;
    }
  }
  return cachedPayload;
}

function getServerSnapshot(): null {
  return null; // No sessionStorage during SSR - honest "no result yet" state.
}

const listeners = new Set<() => void>();
function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  // "Forget everything on this device" (/privacy) clears storage directly.
  window.addEventListener(DEVICE_DATA_CLEARED_EVENT, callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener(DEVICE_DATA_CLEARED_EVENT, callback);
  };
}

export function useLastResult(): UseLastResult {
  const payload = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // True once this has rendered on the client at least once - lets a
  // consumer distinguish "still resolving" from "resolved to no result".
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const setPayload = useCallback((next: StoredMatchResult) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal - in-memory state (and thus the current page) still works,
      // it just won't survive navigating away and back.
    }
    listeners.forEach((cb) => cb());
  }, []);

  const clearPayload = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Non-fatal.
    }
    listeners.forEach((cb) => cb());
  }, []);

  return { payload, setPayload, clearPayload, hydrated };
}

/**
 * True once this tab holds a scored match result (false during SSR and
 * hydration). For "Find My Match" vs "Your matches" CTAs: e.g.
 *   const hasMatch = useHasLastResult();
 *   <Button href="/find-match">{hasMatch ? 'Your matches' : 'Find My Match'}</Button>
 * /find-match shows the stored results directly when they exist.
 */
export function useHasLastResult(): boolean {
  const { payload } = useLastResult();
  return !!(payload && Array.isArray(payload.results) && payload.results.length);
}

/**
 * The visitor's scored result item for one mattress from a stored payload
 * (any version), or null. Pure; safe for any consumer of useLastResult.
 */
export function findResultFor(payload: LastResultPayload | null | undefined, mattressId: string | null | undefined): ResultLookup | null {
  if (!payload || !mattressId) return null;
  const results: (WireMatchItem | null | undefined)[] = Array.isArray(payload.results) ? payload.results : [];
  const index = results.findIndex((r) => r && r.entry && r.entry.id === mattressId);
  const found = index !== -1 ? results[index] : null;
  if (found) return { item: found, rank: index + 1, total: results.length };
  if (payload.top && payload.top.entry && payload.top.entry.id === mattressId) return { item: payload.top, rank: 1, total: results.length || 1 };
  return null;
}
