import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { PreviewTop, WeightOption } from './types';
import styles from './Match.module.css';

interface MatchResultProps {
  /** The engine's precomputed top organic match for this cell, or null when nothing scored. */
  top: PreviewTop | null | undefined;
  /** Re-mounts the live region when the selection changes. */
  cellKey: string;
  /** "155 lb side sleeper, medium feel, sleeps neutral, sleeps alone" - the profile this cell was scored for. */
  profileText: string;
  href: string;
  weight: WeightOption;
  /** 'loading' while a live score is in flight; 'error' when it failed. */
  status?: 'ready' | 'loading' | 'error';
  errorMessage?: string | null;
  /** The budget ceiling in the profile, if any (unpriced mattresses are left out of a budgeted run). */
  budgetMax?: number | null;
}

/** The top-match card beside the live surface. Presentational: every value comes from homeData.preview.grid. */
export function MatchResult({ top, cellKey, profileText, href, weight, status = 'ready', errorMessage = null, budgetMax = null }: MatchResultProps) {
  return (
    <div className={styles.result} aria-busy={status === 'loading' ? true : undefined}>
      <p className={styles.resultKicker}>
        Top match for a {profileText}
      </p>
      {status === 'loading' ? (
        <p className={`${styles.resultBody} ${styles.resultPending}`} role="status">
          Scoring this profile with the engine…
        </p>
      ) : status === 'error' ? (
        <p className={styles.resultBody} role="status">
          {errorMessage || 'This combination could not be scored right now.'}
        </p>
      ) : top ? (
        <div key={cellKey} className={styles.resultBody} aria-live="polite" aria-atomic="true">
          <p className={styles.resultNumber}>
            {top.score}
            <span className="sr-only"> out of 100,</span>
          </p>
          <div className={styles.resultText}>
            <p className={styles.resultTier}>{top.tier.label}</p>
            <h3 className={styles.resultName}>
              <Link href={`/mattress/${encodeURIComponent(top.id)}`} className="link-quiet">
                {top.title}
              </Link>
            </h3>
            <p className={styles.resultMeta}>
              {top.typeLabel}
              {typeof top.firmness === 'number' ? ` · about ${top.firmness}/10 firm` : ''}
            </p>
            {top.reasons.length ? (
              <ul className={styles.reasons}>
                {top.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : null}
            <p className={styles.resultCount}>
              <span className="tabular">{top.strongCount}</span> of <span className="tabular">{top.total}</span> mattresses
              {budgetMax !== null ? ' with a published price in budget' : ''} score a Strong match or better for this profile.
            </p>
          </div>
        </div>
      ) : (
        <p className={styles.resultBody} aria-live="polite">
          {budgetMax !== null
            ? 'No mattress with a published Queen price within this budget could be scored. Mattresses without a price on file are left out of a budgeted match.'
            : 'No mattress in the catalog could be scored for this combination yet.'}
        </p>
      )}
      <div className={styles.resultActions}>
        <Button href={href} size="lg" arrow>
          Get my full match
        </Button>
        <p className={styles.resultNote}>
          The {weight.label} band is scored at {weight.weightLb} lb, as in the full match. Your full match also asks about your
          exact weight and mattress type.
        </p>
      </div>
    </div>
  );
}
