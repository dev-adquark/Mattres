'use client';

import { useSyncExternalStore } from 'react';

/**
 * A polite live region for /compare that survives the switch between the
 * workspace and the empty state, so "X removed from comparison" is still
 * read when the last mattress goes. Mounted once by app/compare/page.tsx;
 * announceCompare() can be called from anywhere on the page.
 */
let message = '';
const listeners = new Set<() => void>();

export function announceCompare(text: string): void {
  // Clearing first makes a repeated message (two removals in a row) re-announce.
  message = '';
  listeners.forEach((cb) => cb());
  requestAnimationFrame(() => {
    message = text;
    listeners.forEach((cb) => cb());
  });
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function CompareAnnouncer() {
  const text = useSyncExternalStore(
    subscribe,
    () => message,
    () => ''
  );
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {text}
    </p>
  );
}

/**
 * Focuses `selector` once it matches an element other than `stale` (the node
 * that is about to unmount), for up to ~2 s while the new route renders.
 */
export function focusWhenReady(selector: string, stale: Element | null = null): void {
  const started = performance.now();
  const tick = () => {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && el !== stale && el.isConnected) {
      el.focus({ preventScroll: false });
      return;
    }
    if (performance.now() - started < 2000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
