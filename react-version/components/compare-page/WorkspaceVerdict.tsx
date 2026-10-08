import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Verdict } from './Verdict';
import type { CompareColumn, CompareVerdict, ScoringState } from './types';
import styles from './Compare.module.css';

interface WorkspaceVerdictProps {
  columns: readonly CompareColumn[];
  verdict: CompareVerdict;
  scoring: ScoringState;
}

/** The workspace's "Best for you" band: loading, the verdict, or a prompt to add a second mattress. */
export function WorkspaceVerdict({ columns, verdict, scoring }: WorkspaceVerdictProps) {
  if (columns.length < 2) {
    return (
      <section className="section section--cinematic" aria-labelledby="verdict-title">
        <div className="container">
          <div className={styles.verdictLoading}>
            <p className="eyebrow">Best for you</p>
            <h2 id="verdict-title" className="h2">
              Add one more to see a winner.
            </h2>
            <p className="lead">A comparison needs at least two mattresses. Pick another from the catalog or from your match results.</p>
            <div className={styles.verdictActions}>
              <Button href="/mattresses" variant="onDark" arrow>
                Browse mattresses
              </Button>
              <Button href="/find-match" variant="ghost">
                Find My Match
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className={`section section--cinematic ${styles.verdictSection}`} aria-labelledby="verdict-title" aria-busy={scoring === 'loading'}>
      <div className="container container--wide">
        {scoring === 'loading' ? (
          <div className={styles.verdictLoading}>
            <p className="eyebrow">Best for you</p>
            <h2 id="verdict-title" className="h2">
              Scoring your finalists…
            </h2>
            <Skeleton lines={3} />
          </div>
        ) : (
          <Verdict columns={columns} verdict={verdict} audience="you" headingId="verdict-title" />
        )}
      </div>
    </section>
  );
}
