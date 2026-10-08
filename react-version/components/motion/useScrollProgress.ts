'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { prefersReducedMotion } from './useReducedMotion';

export type ProgressMode = 'cross' | 'pin' | 'exit' | 'enter';

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Progress (0..1) of an element through the viewport for a mode:
 *  - 'cross' (default): 0 when its top meets the viewport bottom, 1 when its bottom leaves the top.
 *  - 'pin':  0 when its top reaches the viewport top, 1 when its bottom reaches the viewport bottom
 *            (use on a tall wrapper around a position: sticky stage).
 *  - 'exit': 0 while its top is at/below the viewport top, 1 when its bottom reaches the viewport top
 *            (hero scroll-out).
 *  - 'enter': 0 when its top meets the viewport bottom, 1 when its top reaches the viewport top.
 */
export function progressFor(rect: { top: number; height: number }, vh: number, mode: ProgressMode = 'cross'): number {
  if (mode === 'pin') return clamp01(-rect.top / Math.max(1, rect.height - vh));
  if (mode === 'exit') return clamp01(-rect.top / Math.max(1, rect.height));
  if (mode === 'enter') return clamp01((vh - rect.top) / Math.max(1, vh));
  return clamp01((vh - rect.top) / Math.max(1, vh + rect.height));
}

/**
 * Scroll-linked progress for a section, written as the CSS custom property
 * `--progress` (0..1, 4 decimals) on the element itself. One passive scroll
 * listener + rAF; no React re-renders, so children animate with
 * transform/opacity in CSS, e.g.
 *   transform: translate3d(0, calc(var(--progress) * -12vh), 0);
 *
 * Reduced motion: no listener; `--progress` is fixed at `reducedValue`
 * (default 0 = the resting, unscrolled state) and data-motion="reduced" is set.
 *
 * Returns a ref holding the latest progress (read in handlers; not reactive).
 */
export interface ScrollProgressOptions {
  mode?: ProgressMode;
  property?: string;
  reducedValue?: number;
  onProgress?: (p: number) => void;
  disabled?: boolean;
}

export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  { mode = 'cross', property = '--progress', reducedValue = 0, onProgress, disabled = false }: ScrollProgressOptions = {},
): RefObject<number> {
  const latest = useRef(0);
  const cb = useRef(onProgress);
  useEffect(() => {
    cb.current = onProgress;
  });

  useEffect(() => {
    const el = ref && ref.current;
    if (!el || disabled) return undefined;
    if (prefersReducedMotion()) {
      el.style.setProperty(property, String(reducedValue));
      el.setAttribute('data-motion', 'reduced');
      latest.current = reducedValue;
      if (cb.current) cb.current(reducedValue);
      return undefined;
    }
    el.setAttribute('data-motion', 'full');
    let frame = 0;
    let visible = true;
    const update = () => {
      frame = 0;
      const p = progressFor(el.getBoundingClientRect(), window.innerHeight, mode);
      if (Math.abs(p - latest.current) < 0.0005 && p !== 0 && p !== 1) return;
      latest.current = p;
      el.style.setProperty(property, p.toFixed(4));
      if (cb.current) cb.current(p);
    };
    const onScroll = () => {
      if (!visible || frame) return;
      frame = requestAnimationFrame(update);
    };
    // Only track while near the viewport.
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            ([entry]) => {
              visible = !!entry?.isIntersecting;
              // One last update on exit so the value settles at 0 or 1.
              if (!frame) frame = requestAnimationFrame(update);
            },
            { rootMargin: '25% 0px 25% 0px' },
          )
        : null;
    if (io) io.observe(el);
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (io) io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref, mode, property, reducedValue, disabled]);

  return latest;
}
