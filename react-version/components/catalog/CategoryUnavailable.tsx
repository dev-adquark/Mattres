import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from './CategoryState.module.css';

interface CategoryUnavailableProps {
  title?: string | null;
  /** Present only inside the segment error boundary (client). */
  onRetry?: (() => void) | null;
}

/**
 * Shown when a category ranking can't be computed (the scoring engine threw).
 * Says so plainly; never shows a stale or partial ranking as if it were whole.
 */
export function CategoryUnavailable({ title, onRetry }: CategoryUnavailableProps) {
  return (
    <section className={`section--linen ${styles.wrap}`} aria-labelledby="category-unavailable-title" data-nav-theme="light">
      <div className="container container--narrow">
        <p className={styles.kicker}>Ranking unavailable</p>
        <h1 id="category-unavailable-title" className={styles.title}>
          {title ? `${title}: ` : ''}
          <em>this ranking didn’t load.</em>
        </h1>
        <p className={styles.lead}>
          The scoring engine couldn’t finish ranking this list just now, so we’re not showing a partial one. The full catalog and your own
          Match Score are still available.
        </p>
        <div className={styles.actions}>
          {onRetry ? (
            <Button size="lg" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
          <Button href="/mattresses" size="lg" variant={onRetry ? 'ghost' : 'primary'}>
            Browse all mattresses
          </Button>
          <Button href="/find-match" size="lg" variant="ghost">
            Find My Match
          </Button>
        </div>
        <p className={styles.small}>
          Still stuck? The{' '}
          <Link href="/methodology" className="link">
            methodology
          </Link>{' '}
          explains how every ranking is built.
        </p>
      </div>
    </section>
  );
}
