'use client';

import Link from 'next/link';
import { useReveal, revealClassName } from '@/components/ui/Reveal';
import { cx } from '@/components/ui/cx';
import { cssVars } from '@/components/ui/cssVars';
import { ordinal } from './productDisplay';
import { useStory } from './ProductStoryContext';
import styles from './ProductStory.module.css';

/**
 * "Score by position": four horizontal bars from engine output, each with
 * the tier word, the engine's own sentence and the catalog rank. The bar
 * for the position shown in the hero is marked. Bars grow on reveal.
 */
export function PositionBars() {
  const { rows, selected, select } = useStory();
  const [ref, state] = useReveal<HTMLOListElement>();
  return (
    <ol ref={ref} data-reveal={state} data-reveal-variant="fade" className={cx(styles.bars, revealClassName)}>
      {rows.map((r, i) => {
        const has = typeof r.score === 'number';
        const active = selected === r.id;
        return (
          <li key={r.id} className={styles.bar} data-active={active || undefined} style={cssVars({ '--i': i })}>
            <div className={styles.barHead}>
              <h3 className={styles.barLabel}>
                {r.href ? (
                  <Link href={r.href} className="link-quiet">
                    {r.label}
                  </Link>
                ) : (
                  r.label
                )}
              </h3>
              <p className={styles.barScore}>
                {has ? (
                  <>
                    <strong>{r.score}</strong>
                    <span className={styles.barOf}>/100</span>
                  </>
                ) : (
                  <span className={styles.barOf}>Not scored</span>
                )}
              </p>
            </div>
            <div className={styles.barTrack} aria-hidden="true">
              <span className={styles.barFill} style={cssVars({ '--w': typeof r.score === 'number' ? r.score / 100 : 0 })} />
            </div>
            <div className={styles.barMeta}>
              {has ? (
                <p className={styles.barTier}>
                  {r.tier}
                  <span className={styles.barRank}>
                    {' '}
                    · {r.rank ? `${ordinal(r.rank)} of ${r.total} ranked for this sleeper` : 'Not ranked: too little data'}
                  </span>
                </p>
              ) : null}
              {r.headline ? <p className={styles.barLine}>{r.headline}</p> : null}
              <button type="button" className={styles.barShow} aria-pressed={active} onClick={() => select(r.id)}>
                {active ? 'Shown in the layers below' : 'Use for the layers below'}
                <span className="sr-only"> — {r.label}</span>
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
