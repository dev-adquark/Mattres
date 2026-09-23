'use client';

import { useCallback, useEffect, useState } from 'react';

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
 * Returns [payload, setPayload]. payload is null until a quiz has actually
 * been submitted (this session) - every consumer must handle that null
 * case honestly (an empty/example state), never invent placeholder data.
 */
export function useLastResult() {
  const [payload, setPayloadState] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setPayloadState(JSON.parse(raw));
    } catch {
      // sessionStorage unavailable (e.g. private mode) - non-fatal, caller
      // just keeps showing its example/empty state.
    }
    setHydrated(true);
  }, []);

  const setPayload = useCallback((next) => {
    setPayloadState(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal - in-memory state (and thus the current page) still works,
      // it just won't survive navigating away and back.
    }
  }, []);

  return { payload, setPayload, hydrated };
}
