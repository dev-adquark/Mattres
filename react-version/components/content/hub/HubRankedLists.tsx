import { Rail } from '@/components/ui/Rail';
import Link from 'next/link';
import { cx } from '@/components/ui/cx';
import { CATEGORY_PAGES, categoryCounts, countLabel } from '@/lib/categoryPages';
import type { MattressEntry } from '@/lib/types';
import styles from '../Hub.module.css';

/** "From reading to ranking": every ranked category page with something in it today. */
export function HubRankedLists({ catalog }: { catalog: MattressEntry[] }) {
  const counts: Record<string, number | undefined> = categoryCounts(catalog);
  const rankedLists = CATEGORY_PAGES.filter((c) => (counts[c.slug] ?? 0) > 0);
  if (!rankedLists.length) return null;
  return (
    <section className="section section--editorial" aria-labelledby="ranked-lists-title">
      <div className={cx('container container--wide', styles.ranked)}>
        <div>
          <h2 id="ranked-lists-title" className="h2">
            From reading to ranking.
          </h2>
          <p className={styles.rankedIntro}>
            Each list is ranked live by the Match Score engine from the catalog. Counts are what is in the catalog today.
          </p>
        </div>
        <Rail as="ul" label="ranked lists" rows={5} column="80%" className={styles.rankedList}>
          {rankedLists.map((c) => (
            <li key={c.slug}>
              <Link href={c.href} className={styles.rankedItem}>
                <span className={styles.rankedName}>{c.title}</span>
                <span className={styles.rankedCount}>{countLabel(c, counts[c.slug] ?? 0)}</span>
              </Link>
            </li>
          ))}
        </Rail>
      </div>
    </section>
  );
}
