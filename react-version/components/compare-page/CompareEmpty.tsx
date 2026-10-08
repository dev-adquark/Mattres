import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import type { MattressEntry, VsPage } from '@/lib/types';
import { PairCard } from './PairCard';
import { SelectionRedirect } from './SelectionRedirect';
import styles from './Compare.module.css';

interface CompareEmptyProps {
  /** Ids from the URL (all no longer in the catalog when non-empty). */
  urlIds: readonly string[];
  /** A head-to-head to start from, when one is available. */
  featured: { pair: VsPage; a: MattressEntry; b: MattressEntry } | null;
}

/** /compare without a (valid) selection: how comparing works, and where to start. Opens a stored selection when there is one. */
export function CompareEmpty({ urlIds, featured }: CompareEmptyProps) {
  const stale = urlIds.length > 0;
  return (
    <section className={`section section--editorial ${styles.wsSection}`} aria-labelledby="compare-title">
      <div className="container container--wide">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Compare', href: '/compare' },
          ]}
        />
        <SelectionRedirect mode={stale ? 'stale' : 'open'} urlIds={urlIds}>
          <div className={styles.empty}>
            <div className={styles.emptyCopy}>
              <h1 id="compare-title" className={`h-utility ${styles.wsTitle}`} tabIndex={-1}>
                {stale ? (
                  'Those mattresses are no longer listed.'
                ) : (
                  <>
                    {/* Two set lines: a font swap can't reflow the title and shift the page below it (CLS). */}
                    Compare your <em className={styles.titleLine}>finalists.</em>
                  </>
                )}
              </h1>
              <p className="lead">
                Up to three mattresses, line by line. With your sleep profile each gets a Match Score from the same engine as your match; without one you still
                get the facts, and we say what we haven&apos;t confirmed.
              </p>
              <ol className={styles.steps}>
                <li>
                  <span className={styles.stepNo} aria-hidden="true">
                    01
                  </span>
                  <span>
                    Open the{' '}
                    <Link href="/mattresses" className="link">
                      mattress catalog
                    </Link>{' '}
                    or your match results.
                  </span>
                </li>
                <li>
                  <span className={styles.stepNo} aria-hidden="true">
                    02
                  </span>
                  <span>
                    Press <strong>Compare</strong> on up to three mattresses. They wait in the tray at the bottom of the screen.
                  </span>
                </li>
                <li>
                  <span className={styles.stepNo} aria-hidden="true">
                    03
                  </span>
                  <span>
                    Or start from a{' '}
                    <a href="#popular" className="link">
                      popular head-to-head
                    </a>{' '}
                    below.
                  </span>
                </li>
              </ol>
              <div className={styles.emptyActions}>
                <Button href="/mattresses" arrow magnetic>
                  Browse mattresses
                </Button>
                <Button href="/find-match" variant="secondary">
                  Find My Match first
                </Button>
              </div>
            </div>
            {featured ? (
              <aside className={styles.emptyFeature} aria-label="A head-to-head to start from">
                <p className="eyebrow">Start here</p>
                <PairCard pair={featured.pair} a={featured.a} b={featured.b} headingLevel="h2" />
              </aside>
            ) : null}
          </div>
        </SelectionRedirect>
      </div>
    </section>
  );
}
