'use client';

import { useSyncExternalStore } from 'react';

/** The one reduced-motion media query (lib/deviceTier and others import it). */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const QUERY = REDUCED_MOTION_QUERY;

function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** Non-hook check, safe on the server (returns false). */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches;
}

/** Live `prefers-reduced-motion: reduce` (false during SSR / first hydration pass). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
