'use client';

import { useEffect, useState } from 'react';
import { prefersReducedMotion } from './motion';
import styles from './Reveal.module.css';

const COUNT_MS = 900;
const RING_R = 94;
const RING_C = 2 * Math.PI * RING_R;

interface RevealScoreProps {
  /** Engine overallScore (0-100). */
  score: number;
  /** Jump straight to the final value. */
  skipped: boolean;
}

/**
 * Beat 1 of the reveal: the score counts up while an amber ring draws
 * around it. One rAF loop drives both so the numeral and the arc always
 * agree. Final value at once under reduced motion or after "Skip intro".
 * Decorative (aria-hidden): the heading carries the score for assistive tech.
 */
export function RevealScore({ score, skipped }: RevealScoreProps) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? score : 0));
  useEffect(() => {
    if (skipped || prefersReducedMotion()) {
      const raf = requestAnimationFrame(() => setShown(score));
      return () => cancelAnimationFrame(raf);
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(score * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, skipped]);

  const offset = RING_C * (1 - shown / 100);
  // One fixed-width cell per digit of the final score: the count-up changes
  // glyphs inside stable boxes, so the numeral never resizes or re-centres
  // (Fraunces' figures are proportional; a growing span shifted every frame).
  const digits = String(shown).padStart(String(score).length, ' ').split('');
  return (
    <div className={styles.scoreStage} aria-hidden="true">
      <svg className={styles.ring} viewBox="0 0 200 200" focusable="false">
        <circle className={styles.ringTicks} cx="100" cy="100" r="85" fill="none" />
        <circle className={styles.ringTrack} cx="100" cy="100" r={RING_R} fill="none" />
        <circle
          className={styles.ringValue}
          cx="100"
          cy="100"
          r={RING_R}
          fill="none"
          strokeDasharray={RING_C.toFixed(2)}
          strokeDashoffset={offset.toFixed(2)}
        />
      </svg>
      <span className={`tabular ${styles.numeral}`}>
        {digits.map((d, i) => (
          <span key={i} className={styles.digit}>
            {d === ' ' ? '' : d}
          </span>
        ))}
      </span>
      <span className={styles.outOf}>of 100</span>
    </div>
  );
}
