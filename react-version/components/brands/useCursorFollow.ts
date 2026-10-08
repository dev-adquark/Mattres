'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useReducedMotion } from '@/components/motion';

/** Where the still sits relative to the cursor: just above and right, so the hovered row stays readable. */
const OFFSET_X = 24;
const OFFSET_Y = -165;
const LERP = 0.16;
const FLOAT_QUERY = '(hover: hover) and (pointer: fine) and (min-width: 900px)';

interface Point {
  x: number;
  y: number;
}

export interface CursorFollow<T extends HTMLElement> {
  /** True on a fine hover pointer, >= 900px, with motion allowed. */
  enabled: boolean;
  /** Attach to the element that follows the cursor (transform is written imperatively per frame). */
  ref: RefObject<T | null>;
  /** Jump to the cursor without easing (call when the element first appears). */
  snapTo: (e: ReactPointerEvent) => void;
}

/**
 * A lerped cursor follower for a decorative element. Writes the transform
 * straight to the DOM node on animation frames (a runtime value, never
 * React state), and stops the loop once the element settles.
 */
export function useCursorFollow<T extends HTMLElement>(): CursorFollow<T> {
  const reduced = useReducedMotion();
  const [canFloat, setCanFloat] = useState(false);
  const ref = useRef<T | null>(null);
  const target = useRef<Point>({ x: 0, y: 0 });
  const pos = useRef<Point>({ x: 0, y: 0 });
  const raf = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia(FLOAT_QUERY);
    const update = () => setCanFloat(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const enabled = canFloat && !reduced;

  useEffect(() => {
    if (!enabled) return undefined;
    const tick = () => {
      const p = pos.current;
      const t = target.current;
      p.x += (t.x - p.x) * LERP;
      p.y += (t.y - p.y) * LERP;
      if (ref.current) ref.current.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      raf.current = Math.abs(t.x - p.x) + Math.abs(t.y - p.y) > 0.3 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      target.current = { x: e.clientX + OFFSET_X, y: e.clientY + OFFSET_Y };
      if (!raf.current) raf.current = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [enabled]);

  const snapTo = useCallback((e: ReactPointerEvent) => {
    pos.current = { x: e.clientX + OFFSET_X, y: e.clientY + OFFSET_Y };
    target.current = { ...pos.current };
    if (ref.current) ref.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
  }, []);

  return { enabled, ref, snapTo };
}
