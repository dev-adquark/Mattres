'use client';

import { useRef, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { MattressType } from '@/lib/types';
import styles from './Hero.module.css';

export interface HeroBuild {
  type: MattressType;
  label: string;
}

interface HeroBuildSwitcherProps {
  builds: readonly HeroBuild[];
  index: number;
  /** Called with the wrapped target index and how it was reached; the parent owns analytics. */
  onChange: (index: number, action: BuildAction) => void;
}

export type BuildAction = 'next' | 'prev' | 'key' | 'dot' | 'swipe';
const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * The hero's visual slider: switches the illustration between the four
 * construction types (brief v3 s39). A radio group with roving focus
 * (Arrow keys / Home / End), labelled chips, prev/next buttons and a
 * counter; on the mobile still a horizontal swipe (HeroStage) steps too.
 * Purposeful, not decorative: the layers the scroll then
 * separates are the selected build's, and the teaser names it.
 */
export function HeroBuildSwitcher({ builds, index, onChange }: HeroBuildSwitcherProps) {
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const total = builds.length;
  const current = builds[index];

  const go = (next: number, action: BuildAction, focus = false) => {
    const i = ((next % total) + total) % total;
    if (i !== index) onChange(i, action);
    if (focus) chips.current[i]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = index + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = index - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = total - 1;
    if (next === null) return;
    e.preventDefault();
    go(next, 'key', true);
  };

  return (
    <div className={styles.builds}>
      <div className={styles.buildsRow}>
        <div role="radiogroup" aria-label="Mattress construction shown" className={styles.buildChips} onKeyDown={onKeyDown}>
          {builds.map((b, i) => (
            <button
              key={b.type}
              ref={(el) => {
                chips.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={i === index}
              tabIndex={i === index ? 0 : -1}
              className={styles.buildChip}
              onClick={() => go(i, 'dot')}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className={styles.buildNav}>
          <span className={styles.buildCount} aria-hidden="true">
            <strong>{pad(index + 1)}</strong> / {pad(total)}
          </span>
          <button type="button" className={styles.buildArrow} onClick={() => go(index - 1, 'prev')} aria-label="Previous construction">
            <ArrowLeft aria-hidden="true" />
          </button>
          <button type="button" className={styles.buildArrow} onClick={() => go(index + 1, 'next')} aria-label="Next construction">
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className={styles.buildCaption} aria-live="polite">
        Illustration of a typical {current ? current.label.toLowerCase() : 'mattress'} build, not a product photo.
      </p>
    </div>
  );
}
