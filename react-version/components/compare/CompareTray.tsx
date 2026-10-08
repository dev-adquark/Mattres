'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useCompareIds } from '@/lib/compareStore';

// The tray UI only loads once something has been added to compare, so it is
// not part of every route's first-load JS.
const CompareTrayPanel = dynamic(() => import('./CompareTrayPanel').then((m) => m.CompareTrayPanel), { ssr: false });

/**
 * Global compare tray (mounted once in the root layout). Renders nothing
 * while the device-only compare selection is empty; see CompareTrayPanel.
 *
 * When the last item goes (its Remove button or Clear unmounts with the
 * panel), keyboard focus would fall to <body> (WCAG 2.4.3): it returns to the
 * page's own compare toggle for that mattress when there is one, else to the
 * main content, and the polite region below (which outlives the panel) says so.
 */
export function CompareTray() {
  const ids = useCompareIds();
  const previous = useRef(ids);
  const live = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = ids;
    if (ids.length) {
      if (live.current) live.current.textContent = '';
      return;
    }
    if (!before.length) return;
    const active = document.activeElement;
    if (active && active !== document.body) return; // focus is somewhere meaningful already
    const first = before[0];
    const esc = (v: string) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(v) : v);
    const toggle = first ? document.querySelector<HTMLElement>(`button[data-compare-id="${esc(first)}"]`) : null;
    const target = toggle || document.getElementById('main-content');
    target?.focus({ preventScroll: target.id === 'main-content' });
    if (live.current) live.current.textContent = 'The compare list is empty.';
  }, [ids]);

  return (
    <>
      <p ref={live} className="sr-only" role="status" aria-live="polite" />
      {ids.length > 0 ? <CompareTrayPanel /> : null}
    </>
  );
}
