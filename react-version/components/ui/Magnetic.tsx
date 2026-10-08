'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { REDUCED_MOTION_QUERY } from '@/components/motion/useReducedMotion';
import { cx } from './cx';
import { magnetic as s } from '@/components/ui/systemStyles';

interface MagneticProps {
  children: ReactNode;
  /** Fraction (< 1) of the pointer's offset from centre the child drifts by. */
  strength?: number;
  /** Maximum drift in px. */
  max?: number;
  /** Stretch the wrapper (and its child) to the full width of its container. */
  block?: boolean;
  className?: string;
}

/**
 * Subtle magnetic pull for primary CTAs.
 *
 * - Only for mouse pointers on hover-capable fine-pointer devices, never
 *   under prefers-reduced-motion. Touch and keyboard users get a normal button.
 * - The wrapper itself never moves, so hit-testing is stable (no edge
 *   jitter). Only the child drifts, TOWARD the pointer, by a fraction (< 1)
 *   of the pointer's offset from centre, capped at `max` px - so the pointer
 *   always stays inside the button and it is never harder to click.
 * - The button label (first direct <span>) drifts a little less, for depth.
 * - Focus/blur never move anything.
 */
export function Magnetic({ children, strength = 0.22, max = 7, block = false, className }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = ref.current;
    if (!wrap || typeof window === 'undefined' || !window.matchMedia) return undefined;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduce = window.matchMedia(REDUCED_MOTION_QUERY);

    let frame = 0;
    const target = () => wrap.firstElementChild as HTMLElement | null;
    const label = () => {
      const t = target();
      return t ? t.querySelector<HTMLElement>(':scope > span') : null;
    };

    const reset = () => {
      cancelAnimationFrame(frame);
      wrap.dataset.active = 'false';
      const t = target();
      const l = label();
      if (t) t.style.transform = '';
      if (l) l.style.transform = '';
    };

    const onMove = (event: PointerEvent) => {
      if (!fine.matches || reduce.matches || event.pointerType !== 'mouse') return;
      const rect = wrap.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const clamp = (v: number) => Math.max(-max, Math.min(max, v * strength));
      const tx = clamp(dx);
      const ty = clamp(dy);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        wrap.dataset.active = 'true';
        const t = target();
        const l = label();
        if (t) t.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
        if (l) l.style.transform = `translate3d(${(tx * 0.4).toFixed(2)}px, ${(ty * 0.4).toFixed(2)}px, 0)`;
      });
    };

    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerleave', reset);
    reduce.addEventListener?.('change', reset);
    return () => {
      reset();
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerleave', reset);
      reduce.removeEventListener?.('change', reset);
    };
  }, [strength, max]);

  return (
    <span ref={ref} className={cx(s.magnetic, block && s.block, className)}>
      {children}
    </span>
  );
}
