'use client';

import { useEffect, useRef, useState } from 'react';
import { tierFor } from '@/lib/scoreTiers';
import { prefersReducedMotion } from '@/components/motion/useReducedMotion';
import { cx } from './cx';
import { scoreRing as s } from '@/components/ui/systemStyles';

export type ScoreRingSize = 'sm' | 'md' | 'lg' | 'xl';

const VIEWBOX = 100;
const STROKE: Record<ScoreRingSize, number> = { sm: 6, md: 5, lg: 3.5, xl: 3 };

interface ScoreRingProps {
  /** Engine overall score, 0-100. */
  score: number | string | null | undefined;
  size?: ScoreRingSize;
  /** Render the tier label beside the ring. */
  showTier?: boolean;
  showDescription?: boolean;
  animate?: boolean;
  label?: string;
  className?: string;
}

/**
 * Match score ring (0-100). The number counts up from 0 the first time the
 * ring scrolls into view; under prefers-reduced-motion (and on the server)
 * it renders the final value statically. The accessible name always carries
 * the real score and tier: "Match score 87 out of 100, Strong match".
 *
 * Hook for parents: `.score-ring[data-size='lg']`.
 */
export function ScoreRing({ score, size = 'md', showTier = false, showDescription = false, animate = true, label = 'Match score', className }: ScoreRingProps) {
  const value = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const tier = tierFor(value);
  const ref = useRef<HTMLSpanElement>(null);
  // Animation frame state. `null` means "not animating": the ring renders the
  // current `value` prop directly, so a changed score (e.g. switching sleeper
  // tabs under prefers-reduced-motion) is always reflected in the numeral.
  const [frame, setFrame] = useState<number | null>(null);
  const progress = frame ?? value;
  const display = frame === null ? value : Math.round(frame);

  useEffect(() => {
    const el = ref.current;
    if (!animate || !el || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return undefined;
    let raf = 0;
    let started = false;
    const duration = 1100;
    const run = () => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        if (t < 1) {
          setFrame(value * eased);
          raf = requestAnimationFrame(step);
        } else {
          setFrame(null);
        }
      };
      raf = requestAnimationFrame(step);
    };
    // Reset to zero in a frame callback (not synchronously in the effect body).
    raf = requestAnimationFrame(() => setFrame(0));
    const io = new IntersectionObserver(
      (entries) => {
        if (started || !entries.some((e) => e.isIntersecting)) return;
        started = true;
        io.disconnect();
        cancelAnimationFrame(raf);
        run();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      setFrame(null);
    };
  }, [value, animate]);

  const stroke = STROKE[size] ?? STROKE.md;
  const r = (VIEWBOX - stroke) / 2 - 1;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress / 100);
  const tickR = r - stroke / 2 - 4;
  const tickC = 2 * Math.PI * tickR;

  const ring = (
    <span
      ref={ref}
      className={cx('score-ring', s.ring, s[size], !showTier && className)}
      data-size={size}
      data-tier={tier.id}
      role="img"
      aria-label={`${label} ${value} out of 100, ${tier.label}`}
    >
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} aria-hidden="true" focusable="false">
        <circle className={s.track} cx="50" cy="50" r={r} fill="none" strokeWidth={stroke} />
        {size === 'lg' || size === 'xl' ? (
          <circle className={s.ticks} cx="50" cy="50" r={tickR} fill="none" strokeWidth="2.2" strokeDasharray={`0.35 ${(tickC / 50 - 0.35).toFixed(3)}`} />
        ) : null}
        <circle className={s.value} cx="50" cy="50" r={r} fill="none" strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <span className={s.center} aria-hidden="true">
        <span className={s.number}>{display}</span>
        <span className={s.unit}>/ 100</span>
      </span>
    </span>
  );

  if (!showTier) return ring;
  return (
    <span className={cx(s.block, className)}>
      {ring}
      <span>
        <span className={s.tier} aria-hidden="true">
          {tier.label}
        </span>
        {showDescription ? <span className={s.desc}>{tier.description}</span> : null}
      </span>
    </span>
  );
}
