import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { MattressEntry } from '@/lib/types';
import { PopularComparisons } from './PopularComparisons';
import { TopicList, type TopicListItem } from './TopicList';
import styles from './Compare.module.css';

interface ComparePopularProps {
  catalog: readonly MattressEntry[];
  topics: readonly TopicListItem[];
  /** A pair slug already featured higher on the page, left out of the slider. */
  exclude?: string | undefined;
}

/** /compare's lower band: the curated head-to-heads and the demo-profile shortlists. */
export function ComparePopular({ catalog, topics, exclude }: ComparePopularProps) {
  return (
    <section id="popular" className={`section section--linen ${styles.popular}`} aria-labelledby="popular-title">
      <div className="container container--wide">
        <header className={styles.topicsHead}>
          <p className="eyebrow">Popular comparisons</p>
          <h2 id="popular-title" className="h2">
            Head to head, <em>already scored.</em>
          </h2>
          <p className={styles.topicsIntro}>
            Curated pairs that answer a real shopping question, each scored by the engine for four disclosed reference sleepers.{' '}
            <span className={styles.nowrap}>
              <Link href="/methodology" className="link">
                How scoring works
              </Link>
              <ArrowRight aria-hidden="true" className={styles.inlineIcon} />
            </span>
          </p>
        </header>
        <PopularComparisons entries={catalog} label="Popular head-to-head comparisons" id="compare-popular" exclude={exclude} />

        <div className={styles.shortlists}>
          <h3 className={styles.sideTitle}>Profile shortlists</h3>
          <p className={styles.topicsIntro}>A disclosed demo profile, run through the same engine, with its top three side by side.</p>
          <TopicList topics={topics} headingLevel="h4" />
        </div>
      </div>
    </section>
  );
}
