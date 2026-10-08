import Link from 'next/link';
import { CompareToggle } from '@/components/compare/CompareToggle';
import { tierFor } from '@/lib/scoreTiers';
import type { MatchItem } from '@/lib/types';
import { columnName, typeLabel } from './compareModel';
import styles from './Compare.module.css';

interface TopicRankingProps {
  /** The engine's ranking, already cut to the number shown. */
  ranking: readonly MatchItem[];
  /** How many mattresses fit the profile in total. */
  total: number;
}

/** The engine's full ranking for a topic's demo profile, each row addable to the visitor's own comparison. */
export function TopicRanking({ ranking, total }: TopicRankingProps) {
  return (
    <section className="section section--product" aria-labelledby="ranking-title">
      <div className="container container--wide">
        <header className={styles.tableHead}>
          <p className="eyebrow">Full ranking</p>
          <h2 id="ranking-title" className="h2">
            {ranking.length < total ? `The top ${ranking.length} of ${total}.` : `All ${total}, ranked.`}
          </h2>
        </header>
        <ol className={styles.ranking}>
          {ranking.map((r, i) => {
            const name = columnName(r.entry);
            const score = r.result.overallScore;
            return (
              <li key={r.entry.id} className={styles.rankRow}>
                <span className={styles.rankNo}>
                  <span className="sr-only">Rank </span>
                  {i + 1}
                </span>
                <div className={styles.rankName}>
                  <Link href={`/mattress/${r.entry.id}`} className="link-quiet">
                    {name}
                  </Link>
                  <span className={styles.rankMeta}>
                    {typeLabel(r.entry.type)}
                    {r.entry.sponsored ? ' · Sponsored' : ''}
                  </span>
                </div>
                <span className={styles.rankScore}>
                  <strong>{score}</strong>
                  <span className="sr-only"> out of 100, </span>
                  <span className={styles.rankTier}>{tierFor(score).label}</span>
                </span>
                <span className={styles.rankToggle}>
                  <CompareToggle id={r.entry.id} name={name} source="topic_ranking" />
                </span>
              </li>
            );
          })}
        </ol>
        {ranking.length < total ? (
          <p className={styles.rankFoot}>{total - ranking.length} more fit this profile. Your own match ranks the whole catalog for you.</p>
        ) : null}
      </div>
    </section>
  );
}
