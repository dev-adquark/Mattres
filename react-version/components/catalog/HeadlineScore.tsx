import { tierFor } from '@/lib/scoreTiers';
import { cx } from '@/components/ui/cx';
import type { HeadlineScore as HeadlineScoreData } from '@/components/product/catalogQuery';
import styles from './HeadlineScore.module.css';

interface HeadlineScoreProps {
  score: HeadlineScoreData;
  /** 'row' = the list's lead column; 'inline' = one line inside a gallery card. */
  variant?: 'row' | 'inline';
  className?: string;
}

/**
 * One precision per score type, so a row never mixes "85" and "84.8":
 * decimals 1 -> "85.0" / "84.8" (the four-sleeper average), 0 -> "81".
 */
export function splitScore(value: number, decimals: 0 | 1): [string, string] {
  if (decimals === 0) return [String(Math.round(value)), ''];
  const [whole = '', decimal = ''] = (Math.round(value * 10) / 10).toFixed(1).split('.');
  return [whole, `.${decimal}`];
}

/**
 * The catalog's signature number: one engine score (components/product/catalogQuery#headlineScore)
 * set in Fraunces, with the tier word from lib/scoreTiers and who the score is for.
 * A null value (not in the visitor's results, or too little independent data
 * to rank) shows no number, only "Not ranked" and the reason, never a low score.
 */
export function HeadlineScore({ score, variant = 'row', className }: HeadlineScoreProps) {
  const { value, caption } = score;
  const tier = value === null ? null : tierFor(value);
  const [whole, decimal] = value === null ? ['', ''] : splitScore(value, score.decimals);
  const tierLabel = tier ? tier.label : 'Not ranked';
  const meter = value === null ? 0 : Math.max(0, Math.min(100, value));

  return (
    <div className={cx(styles.score, variant === 'inline' ? styles.inline : styles.row, className)} data-tier={tier?.id ?? 'none'} data-basis={score.basis}>
      {value === null ? (
        <span className="sr-only">{caption}: </span>
      ) : (
        <p className={styles.figure}>
          <span className="sr-only">{caption} score: </span>
          <span className={styles.num}>
            {whole}
            {decimal ? <span className={styles.decimal}>{decimal}</span> : null}
          </span>
          <span className="sr-only"> out of 100</span>
        </p>
      )}
      <div className={styles.words}>
        <p className={styles.tier}>{tierLabel}</p>
        <p className={styles.caption} aria-hidden="true">
          {caption}
        </p>
      </div>
      {variant === 'row' && value !== null ? (
        <span className={styles.meter} aria-hidden="true">
          <span className={styles.meterFill} style={{ inlineSize: `${meter}%` }} />
        </span>
      ) : null}
    </div>
  );
}
