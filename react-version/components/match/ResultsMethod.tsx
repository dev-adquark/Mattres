import { Button } from '@/components/ui/Button';
import type { CatalogAudit } from '@/lib/useLastResult';
import styles from './Results.module.css';

interface ResultsMethodProps {
  modelVersion: string | null;
  scoreVersion: string | null;
  audit: CatalogAudit | null;
}

/** "How this was scored": model version, how dimensions are estimated, and the live verification count. */
export function ResultsMethod({ modelVersion, scoreVersion, audit }: ResultsMethodProps) {
  return (
    <section className={`section section--editorial section--tight ${styles.method}`} aria-labelledby="method-title">
      <div className={`container container--wide ${styles.methodGrid}`}>
        <h2 id="method-title" className={styles.methodTitle}>
          How this was scored
        </h2>
        <div className={styles.methodText}>
          <p>
            Scores come from Match Score model v{modelVersion || scoreVersion}: six dimensions (pressure relief,
            support, cooling, motion isolation, edge support and durability), weighted for your answers, minus a penalty
            when a mattress’s firmness is far from the feel you asked for. The same answers always give the same scores for
            the same catalog data.
          </p>
          <p>
            Where no independent rating is on file, a dimension is estimated from the construction type and marked
            “Estimated”.
            {audit && typeof audit.total === 'number'
              ? ` ${audit.verifiedCount} of ${audit.total} catalog entries are currently fully verified against a manufacturer source.`
              : ''}{' '}
            Results are ranked by Match Score alone.
          </p>
          <div className={styles.methodLinks}>
            <Button href="/methodology" variant="ghost" arrow>
              How the Match Score works
            </Button>
            <Button href="/mattresses" variant="ghost" arrow>
              Browse all mattresses
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
