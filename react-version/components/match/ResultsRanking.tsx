'use client';

import { useCallback, type Ref } from 'react';
import { useRouter } from 'next/navigation';
import { Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/ui/ProductCard';
import { track, EVENTS } from '@/lib/analytics';
import { compareHref, getCompareIds, setCompareIds } from '@/lib/compareStore';
import { displayTitle } from '@/lib/format';
import type { WireMatchItem } from '@/lib/matchPayload';
import { isSponsored, type RankedItem } from './matchRanking';
import { MoreMatches } from './MoreMatches';
import { SponsoredTag } from '@/components/trust/SponsoredTag';
import styles from './Results.module.css';

/** Ranks shown as editorial cards under the reveal (#2 to #5); the rest are a compact list. */
const CARD_RANKS = 4;
const COUNT_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

interface ResultsRankingProps {
  /**
   * Every scored result except the revealed top match, in engine order,
   * each with its engine rank (sponsored placements keep their score rank
   * but are labeled and never take the reveal slot).
   */
  items: readonly RankedItem[];
  /** Number of scored results, including the reveal. */
  total: number;
  /** The revealed top match (null when every result is sponsored). */
  top?: WireMatchItem | null;
  headingRef?: Ref<HTMLHeadingElement>;
}

/** "Ranked for you": the next four as editorial cards, then the rest as a compact list, plus "Compare my top 3". */
export function ResultsRanking({ items, total, top = null, headingRef }: ResultsRankingProps) {
  const router = useRouter();
  // "My top 3" = the recommendation plus the next best NON-sponsored
  // matches: paid placements stay out of the recommendation set.
  const topThree = [top, ...items.map((r) => r.item).filter((i) => !isSponsored(i))]
    .filter((i): i is WireMatchItem => !!i)
    .slice(0, 3);
  const cards = items.slice(0, CARD_RANKS);
  const rest = items.slice(CARD_RANKS);
  const sponsoredCount = items.filter((r) => isSponsored(r.item)).length;
  // With no reveal above, this heading is the page's main heading.
  const Heading = top ? 'h2' : 'h1';

  const compareTopThree = useCallback(() => {
    const ids = topThree.map((i) => i.entry.id);
    const labels = Object.fromEntries(topThree.map((i) => [i.entry.id, displayTitle(i.entry)]));
    const before = getCompareIds();
    setCompareIds(ids, labels);
    ids.forEach((id, i) => {
      if (!before.includes(id)) track(EVENTS.COMPARE_ADDED, { mattress_id: id, count: i + 1, source: 'results_top3' });
    });
    before
      .filter((id) => !ids.includes(id))
      .forEach((id) => track(EVENTS.COMPARE_REMOVED, { mattress_id: id, count: ids.length, source: 'results_top3' }));
    track(EVENTS.COMPARISON_STARTED, { count: ids.length, source: 'results_top3' });
    router.push(compareHref(ids));
  }, [router, topThree]);

  return (
    <section className={`section section--product ${styles.ranking}`} id="ranking" aria-labelledby="ranking-title">
      <div className="container container--wide">
        <header className={styles.rankHead}>
          <div>
            <p className="eyebrow">Ranked for you</p>
            <Heading id="ranking-title" ref={headingRef} tabIndex={-1} className={styles.rankTitle}>
              {!top ? `All ${total} matches, by score` : total === 2 ? 'Your other match' : `The next ${cards.length}, then all ${total}`}
            </Heading>
          </div>
          <div className={styles.rankAside}>
            <p className={styles.sectionIntro}>
              Every mattress that fits your filters, ranked by Match Score alone. The same six dimensions, weighted for your
              answers.
              {sponsoredCount ? (
                <>
                  {' '}
                  {!top
                    ? 'Every match here is a sponsored placement, so none is shown as your top match.'
                    : `${sponsoredCount === 1 ? 'One is a sponsored placement' : `${COUNT_WORDS[sponsoredCount] || sponsoredCount} are sponsored placements`}, labeled and kept out of your top match.`}{' '}
                  Sponsorship never changes a score.
                </>
              ) : null}
            </p>
            {topThree.length >= 2 ? (
              <Button variant="primary" icon={<Columns3 aria-hidden="true" />} onClick={compareTopThree}>
                Compare my top {topThree.length}
              </Button>
            ) : null}
          </div>
        </header>

        <ol className={styles.cards} aria-label={top ? 'More matches, by Match Score' : 'Matches, by Match Score'}>
          {cards.map(({ item, rank }) => (
            <li key={item.entry.id} value={rank} className={styles.cardItem}>
              <ProductCard entry={item.entry} matchItem={item} rank={rank} showVerification={false} />
              <SponsoredTag sponsored={isSponsored(item)} className={styles.cardSponsored} />
            </li>
          ))}
        </ol>

        {rest.length ? (
          <div className={styles.restBlock}>
            <h3 className={styles.restTitle}>
              The rest of your ranking <span className="tabular">({rest.length})</span>
            </h3>
            <MoreMatches items={rest} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
