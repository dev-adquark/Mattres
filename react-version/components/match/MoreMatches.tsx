'use client';

import { isSponsored } from './matchRanking';
import { useId, useState } from 'react';
import Link from 'next/link';
import { CompareToggle } from '@/components/compare/CompareToggle';
import { buttonClassName } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { PriceValue, DataValue } from '@/components/ui/DataValue';
import { firmnessCardText, MATTRESS_TYPE_LABEL } from '@/lib/firmness';
import { displayTitle } from '@/lib/format';
import { tierFor } from '@/lib/scoreTiers';
import type { RankedItem } from './matchRanking';
import { SponsoredTag } from '@/components/trust/SponsoredTag';
import styles from './Results.module.css';

const INITIAL = 6;
const TYPE_LABEL: Record<string, string> = MATTRESS_TYPE_LABEL;

interface MoreMatchesProps {
  /** Results with their engine rank (1-based), in engine order. */
  items: readonly RankedItem[];
}

/**
 * Every other scored mattress, highest first, as a compact ranked list.
 * No filters: the first few show, and one button expands the rest.
 */
export function MoreMatches({ items }: MoreMatchesProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  if (!items.length) return null;
  const shown = expanded ? items : items.slice(0, INITIAL);
  const hidden = items.length - INITIAL;

  return (
    <div>
      <ol className={styles.moreList} id={listId}>
        {shown.map(({ item, rank }) => {
          const { entry, result } = item;
          const title = displayTitle(entry);
          const tier = tierFor(result.overallScore);
          const firmness = firmnessCardText(entry);
          return (
            <li key={entry.id} value={rank} className={styles.moreRow}>
              <span className={styles.moreRank} aria-hidden="true">
                {String(rank).padStart(2, '0')}
              </span>
              <div className={styles.moreName}>
                <span className={styles.moreBrand}>
                  <span className="sr-only">Rank {rank}: </span>
                  {entry.brand}
                  <SponsoredTag sponsored={isSponsored(item)} className={styles.moreSponsored} />
                </span>
                <Link href={`/mattress/${encodeURIComponent(entry.id)}`} className={`link-quiet ${styles.moreLink}`}>
                  {entry.model || title}
                </Link>
              </div>
              <dl className={styles.moreFacts}>
                <div>
                  <dt>Type</dt>
                  <dd>{TYPE_LABEL[entry.type] || entry.type}</dd>
                </div>
                <div>
                  <dt>Firmness</dt>
                  <dd>
                    <DataValue value={firmness} />
                  </dd>
                </div>
                <div>
                  <dt>Queen</dt>
                  <dd>
                    <PriceValue entry={entry} />
                  </dd>
                </div>
              </dl>
              <p className={styles.moreScore} data-tier={tier.id}>
                <strong className="tabular">{result.overallScore}</strong>
                <span className="sr-only"> out of 100, </span>
                <span>{tier.label}</span>
              </p>
              <CompareToggle id={entry.id} name={title} source="match_list" className={styles.moreCompare} />
            </li>
          );
        })}
      </ol>
      {hidden > 0 ? (
        <button
          type="button"
          className={cx(buttonClassName({ variant: 'secondary', size: 'md' }), styles.moreToggle)}
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((v) => !v)}
        >
          <span>{expanded ? 'Show fewer' : `Show all ${items.length}`}</span>
        </button>
      ) : null}
    </div>
  );
}
