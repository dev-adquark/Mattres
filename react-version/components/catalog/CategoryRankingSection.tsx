import Link from 'next/link';
import { cx } from '@/components/ui/cx';
import { RankRow } from './CategoryRankRows';
import { RANKING_RULE_CLAUSE, UNRANKED_TITLE } from '@/lib/categories';
import type { CategoryList, CategoryView } from './buildCategory';
import styles from './CategoryPage.module.css';

/**
 * The full ranking of a category page: each list (one by default, two for a
 * type split or the budget page), continuing after the podium, then the
 * entries without enough data to rank, alphabetically and unranked.
 */
export function CategoryRankingSection({ view }: { view: CategoryView }) {
  const { lists, podium } = view;
  const isRating = view.method === 'rating';
  return (
    <section className={cx('section--product', styles.rankingSection)} aria-labelledby="ranking-title">
      <div className="container container--wide">
        <div className={styles.sectionHead}>
          <h2 id="ranking-title" className={styles.sectionTitle}>
            {lists.length > 1 ? 'Every mattress on this page' : 'The full ranking'}
          </h2>
          <p className={styles.sectionAside}>
            {view.shown} {view.shown === 1 ? 'mattress' : 'mattresses'} · {view.rankedCount} ranked
          </p>
        </div>

        {lists.map((list) => (
          <RankingList key={list.id} list={list} podiumSize={view.podiumList === list.id ? podium.length : 0} isRating={isRating} />
        ))}

        {view.excluded ? (
          <p className={styles.excluded}>
            Not on this page: {view.excluded.ratedBelow} {view.excluded.ratedBelow === 1 ? 'mattress' : 'mattresses'} rated below the cooling
            threshold and {view.excluded.unrated} with no independent cooling rating yet.{' '}
            <Link href="/mattresses?sort=cooling" className="link">
              See every cooling rating in the catalog
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}

interface RankingListProps {
  list: CategoryList;
  /** How many of this list's first rows the podium already showed (0 when the podium came from elsewhere). */
  podiumSize: number;
  isRating: boolean;
}

function RankingList({ list, podiumSize, isRating }: RankingListProps) {
  const rows = list.ranked.slice(podiumSize);
  const startsAfterPodium = podiumSize > 0;
  const firstRow = rows[0];
  // One level below the list title when there is one, otherwise directly under the section's h2.
  const UnrankedHeading = list.title ? 'h4' : 'h3';
  return (
    <div className={styles.listBlock}>
      {list.title ? (
        <header className={styles.listHead}>
          <h3 className={styles.listTitle}>
            {list.title} <span className={styles.listCount}>{list.ranked.length + list.unranked.length}</span>
          </h3>
          {list.intro ? <p className={styles.listIntro}>{list.intro}</p> : null}
        </header>
      ) : null}
      {startsAfterPodium && rows.length ? <p className={styles.listResume}>Continuing from No. {podiumSize + 1}</p> : null}
      {startsAfterPodium && !rows.length && list.ranked.length ? <p className={styles.listResume}>The top three above are every ranked mattress in this group.</p> : null}
      {firstRow ? (
        <ol className={styles.rows} start={firstRow.rank}>
          {rows.map((row) => (
            <RankRow key={row.id} row={row} />
          ))}
        </ol>
      ) : null}
      {list.unranked.length ? (
        <div className={styles.unranked}>
          <UnrankedHeading className={styles.unrankedTitle}>
            {isRating ? 'No independent rating yet' : UNRANKED_TITLE} <span className={styles.listCount}>{list.unranked.length}</span>
          </UnrankedHeading>
          <p className={styles.unrankedNote}>
            {isRating
              ? 'Listed alphabetically. Without a third-party rating we would only be guessing where these belong.'
              : `${RANKING_RULE_CLAUSE.charAt(0).toUpperCase()}${RANKING_RULE_CLAUSE.slice(1)}, so the score leans on type-based estimates. Listed alphabetically, not ranked.`}
          </p>
          <ul className={styles.rows}>
            {list.unranked.map((row) => (
              <RankRow key={row.id} row={row} unranked />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
