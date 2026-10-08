'use client';

import { useEffect, useRef } from 'react';
import { cx } from '@/components/ui/cx';
import { progressFor } from './useScrollProgress';
import { prefersReducedMotion } from './useReducedMotion';
import { scrollProgress as s } from '@/components/ui/systemStyles';

/**
 * Reading-progress hairline (signal amber), pinned under the sticky header.
 * Tracks the whole page, or `targetId` (an element id, e.g. the article
 * body) when given. Transform-only (scaleX) via rAF; hidden from assistive
 * tech (decorative - the scrollbar already conveys position). Under reduced
 * motion it still updates (it is feedback, not animation) but never eases.
 *
 * Props: targetId?, className?, position: 'header' (default, sits under the
 * sticky header) | 'top' (viewport top edge).
 */
interface ScrollProgressProps {
  /** Element id to track (e.g. the article body); the whole page when omitted. */
  targetId?: string;
  className?: string;
  position?: 'header' | 'top';
}

export function ScrollProgress({ targetId, className, position = 'header' }: ScrollProgressProps) {
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      let p: number;
      const target = targetId ? document.getElementById(targetId) : null;
      if (target) {
        const rect = target.getBoundingClientRect();
        // 0 when the target's top reaches the header line, 1 when its bottom reaches the viewport bottom.
        p = progressFor({ top: rect.top - 72, height: rect.height }, window.innerHeight, 'pin');
      } else {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      }
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
      if (bar.parentElement) bar.parentElement.dataset.complete = p >= 0.999 ? 'true' : 'false';
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    if (prefersReducedMotion()) bar.style.transition = 'none';
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [targetId]);

  return (
    <div className={cx(s.root, s[position], className)} aria-hidden="true">
      <span ref={barRef} className={s.bar} />
    </div>
  );
}
