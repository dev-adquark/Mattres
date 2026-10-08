import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getGuide } from '@/lib/content/guides';
import type { Guide, MattressEntry, VsPage } from '@/lib/types';
import { PairActions } from './PairActions';
import { PopularComparisons } from './PopularComparisons';
import type { PairEntries, PairNames } from './types';
import styles from './Pair.module.css';

interface PairNextProps {
  pair: Pick<VsPage, 'slug' | 'guides'>;
  entries: PairEntries;
  names: PairNames;
  /** All catalog entries, for the related head-to-heads. */
  catalog: readonly MattressEntry[];
}

/** "Keep going": open the pair in the workspace, related guides, and more head-to-heads. */
export function PairNext({ pair, entries, names, catalog }: PairNextProps) {
  const guides = (pair.guides || []).map((slug) => getGuide(slug)).filter((g): g is Guide => Boolean(g));
  return (
    <section className={`section section--linen ${styles.next}`} aria-labelledby="pair-next">
      <div className="container container--wide">
        <div className={styles.nextGrid}>
          <div>
            <p className="eyebrow">Keep going</p>
            <h2 id="pair-next" className="h2">
              Put them in your own comparison.
            </h2>
            <p className={styles.sectionIntro}>Add a third mattress, see every row, and score all of them for your sleep profile.</p>
            <PairActions pairSlug={pair.slug} a={entries.a.id} b={entries.b.id} names={names} />
          </div>
          {guides.length ? (
            <div>
              <h3 className={styles.sideTitle}>Related guides</h3>
              <ul className={styles.guideList}>
                {guides.map((g) => (
                  <li key={g.slug}>
                    <Link href={g.path} className={styles.guideLink}>
                      <span className={styles.guideTitle}>{g.title}</span>
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className={styles.more}>
          <PopularComparisons
            entries={catalog}
            exclude={pair.slug}
            label="More head-to-heads"
            id="pair-more"
            header={
              <h2 className={styles.sideTitle} id="pair-more-title">
                More head-to-heads
              </h2>
            }
          />
        </div>
      </div>
    </section>
  );
}
