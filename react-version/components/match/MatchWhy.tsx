import { Check } from 'lucide-react';
import type { Explanation } from '@/lib/types';
import styles from './Reveal.module.css';

interface MatchWhyProps {
  explanation: Pick<Explanation, 'reasons' | 'watchOuts' | 'dataNotes'>;
}

/**
 * Below the reveal: "Why it matches" (explanation.reasons) and "Watch out
 * for" (explanation.watchOuts), plus data notes. All text comes from
 * lib/explain.ts; nothing here is written per product.
 */
export function MatchWhy({ explanation }: MatchWhyProps) {
  const reasons = explanation.reasons || [];
  const watchOuts = explanation.watchOuts || [];
  const dataNotes = explanation.dataNotes || [];
  return (
    <section className={`section section--deep ${styles.detail}`} aria-labelledby="why-title">
      <div className={`container container--wide ${styles.detailGrid}`}>
        <div className={styles.detailCol}>
          <p className="eyebrow">Why it matches</p>
          <h2 id="why-title" className={styles.detailTitle}>
            What works for you
          </h2>
          {reasons.length ? (
            <ol className={styles.reasons}>
              {reasons.map((r, i) => (
                <li key={`${r.dimension}-${i}`}>
                  <span className={`tabular ${styles.reasonIndex}`} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.reasonText}>{r.text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.muted}>
              None of its independently measured dimensions scores Good or better for your profile. The scores above show
              where it lands.
            </p>
          )}
        </div>

        <div className={styles.detailCol}>
          <p className="eyebrow">Watch out for</p>
          <h2 className={styles.detailTitle}>{watchOuts.length ? 'Worth knowing first' : 'Nothing flagged'}</h2>
          {watchOuts.length ? (
            <ul className={styles.watch}>
              {watchOuts.map((w, i) => (
                <li key={`${w.code}-${i}`}>
                  <span className={styles.watchDot} aria-hidden="true" />
                  <div>
                    <h3 className={styles.watchTitle}>{w.title}</h3>
                    {w.text ? <p className={styles.watchText}>{w.text}</p> : null}
                    {w.mitigation ? <p className={styles.watchMitigation}>{w.mitigation}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.calm}>
              <Check aria-hidden="true" />
              Nothing flagged for your profile.
            </p>
          )}
          {dataNotes.length ? (
            <ul className={styles.dataNotes} aria-label="Data notes">
              {dataNotes.map((n) => (
                <li key={n.id}>{n.text}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
