'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/threeUtils';

/**
 * Animates the visible number from 0 up to `value` - always the exact
 * real value passed in (a score, a count, a price), never generated or
 * approximated here. Re-triggers whenever `value` changes (e.g. a new
 * quiz result), not just on first mount. Under reduced-motion, renders
 * the final value immediately with no animation, same convention as
 * every other motion effect in this codebase.
 */
export default function NumberTicker({ value, duration = 1100, decimals = 0, suffix = '', className = 'num-ticker' }) {
  // Always starts at 0: `value` can be null on first mount (real data
  // hasn't hydrated from sessionStorage yet), and seeding state from a
  // possibly-null value was the actual earlier bug - it left `display`
  // permanently null, so a later render with real data would pass the
  // guard below but still call .toFixed() on a null display. The guard
  // already fully handles "no real value yet" by returning an em-dash
  // before display is ever read, so display itself only needs a safe
  // starting number.
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (value == null || Number.isNaN(value)) return undefined;

    // Reduced motion: intentionally does not call setDisplay here at all.
    // The JSX below reads `value` directly in this case instead of routing
    // through `display` state, so there's no setState-in-effect - only the
    // animated path (setDisplay inside the rAF callback further down) ever
    // updates that state, which is the accepted pattern React's own lint
    // rule asks for (state updates from a callback an effect subscribes to,
    // not synchronously in the effect body itself).
    if (prefersReducedMotion()) {
      fromRef.current = value;
      return undefined;
    }

    const start = performance.now();
    const from = fromRef.current;
    const delta = value - from;

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic, matching the timing feel of this site's other reveals
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + delta * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  if (value == null || Number.isNaN(value)) return <span className={className}>—</span>;

  const shown = prefersReducedMotion() ? value : display;

  return (
    <span className={className}>
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}
