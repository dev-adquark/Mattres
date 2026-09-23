'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'mms_last_result';

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
 * Returns { payload, setPayload, hydrated }. payload is null until a quiz
 * has actually been submitted (this session) - every consumer must handle
 * that null case honestly (an empty/example state), never invent
 * placeholder data.
 *
 * Built on useSyncExternalStore rather than useState+useEffect (the
 * original approach here) - not a style preference, but a fix for a real
 * ESLint/React error: setting state synchronously inside an effect body
 * causes an extra, avoidable render pass on every mount, which is exactly
 * what useSyncExternalStore exists to solve for reading an external store
 * (sessionStorage) without a hydration mismatch or a wasted render.
 * getSnapshot caches its parsed result and only re-parses when the raw
 * stored string actually changes, so repeated calls return a referentially
 * stable value - required for useSyncExternalStore to avoid re-rendering
 * on every call.
 */
let cachedRaw;
let cachedPayload;

function getSnapshot() {
  let raw;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null; // sessionStorage unavailable (e.g. private mode) - non-fatal.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedPayload = raw ? JSON.parse(raw) : null;
    } catch {
      cachedPayload = null;
    }
  }
  return cachedPayload;
}

function getServerSnapshot() {
  return null; // No sessionStorage during SSR - honest "no result yet" state.
}

const listeners = new Set();
function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function useLastResult() {
  const payload = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // True once this has rendered on the client at least once - lets a
  // consumer distinguish "still resolving" from "resolved to no result".
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const setPayload = useCallback((next) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal - in-memory state (and thus the current page) still works,
      // it just won't survive navigating away and back.
    }
    listeners.forEach((cb) => cb());
  }, []);

  return { payload, setPayload, hydrated };
}
