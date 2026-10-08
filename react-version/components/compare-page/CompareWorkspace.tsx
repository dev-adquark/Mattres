'use client';

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { clearCompare, compareHref, getCompareIds, getCompareLabels, removeFromCompare, setCompareIds } from '@/lib/compareStore';
import { profileChips } from '@/lib/compareTopics';
import { track, EVENTS } from '@/lib/analytics';
import type { MattressEntry } from '@/lib/types';
import { MAX_COMPARE_COLUMNS, compareVerdict, columnName } from './compareModel';
import { useProfileScores } from './useProfileScores';
import { ComparisonTable } from './ComparisonTable';
import { ScoreStatus } from './ScoreStatus';
import { announceCompare, focusWhenReady } from './CompareAnnouncer';
import { WorkspaceVerdict } from './WorkspaceVerdict';
import type { CompareColumn, ScoringState } from './types';
import styles from './Compare.module.css';

interface CompareWorkspaceProps {
  /** Catalog records resolved on the server, in URL order. */
  entries: readonly MattressEntry[];
  /** How many ids in the URL are no longer in the catalog. */
  missingCount?: number;
}

const BREADCRUMBS = [
  { label: 'Home', href: '/' },
  { label: 'Compare', href: '/compare' },
];

/**
 * The visitor's own comparison (/compare?ids=a,b,c).
 * The URL is the source of truth; the global compare store is kept in sync
 * so the tray, the cards' toggles and this page always agree.
 */
export function CompareWorkspace({ entries, missingCount = 0 }: CompareWorkspaceProps) {
  const router = useRouter();
  const ids = useMemo(() => entries.map((e) => e.id), [entries]);
  const { status, items, profile, retry } = useProfileScores(ids);

  // Keep the store in sync with what's on screen (e.g. after following a shared link).
  useEffect(() => {
    const current = getCompareIds();
    const labels = getCompareLabels();
    // Also re-sync when a tray label is missing, so the tray never falls back to an id-derived name.
    if (current.length !== ids.length || current.some((id, i) => id !== ids[i]) || ids.some((id) => !labels[id])) {
      setCompareIds(ids, Object.fromEntries(entries.map((e) => [e.id, columnName(e)])));
    }
  }, [ids, entries]);

  const trackedKey = useRef<string | null>(null);
  useEffect(() => {
    if (ids.length < 2 || status === 'pending' || status === 'loading') return;
    const key = ids.join(',');
    if (trackedKey.current === key) return;
    trackedKey.current = key;
    track(EVENTS.COMPARISON_COMPLETED, { count: ids.length, source: 'compare_page', scored: status === 'ready' });
  }, [ids, status]);

  const columns = useMemo<CompareColumn[]>(
    () => entries.map((entry) => ({ id: entry.id, entry, item: status === 'ready' ? items[entry.id] || null : null })),
    [entries, items, status]
  );
  const verdict = useMemo(() => compareVerdict(columns), [columns]);

  const remove = (id: string) => {
    const index = ids.indexOf(id);
    const next = ids.filter((x) => x !== id);
    const entry = entries.find((e) => e.id === id);
    const name = entry ? columnName(entry) : 'Mattress';
    // Keep keyboard focus in the table (WCAG 2.4.3): the next column's Remove (its <th> is keyed, so the node survives
    // the re-render), the previous one if this was last, or the page heading when nothing is left.
    const focusId = next[index] ?? next[index - 1];
    const target = focusId ? document.querySelector<HTMLElement>(`[data-remove-id="${CSS.escape(focusId)}"]`) : null;
    if (target) target.focus();
    else focusWhenReady('#compare-title', document.getElementById('compare-title'));
    announceCompare(`${name} removed from comparison.${next.length ? '' : ' Nothing is selected now.'}`);
    removeFromCompare(id, 'compare_page');
    router.replace(next.length ? compareHref(next) : '/compare', { scroll: false });
  };
  const clearAll = () => {
    focusWhenReady('#compare-title', document.getElementById('compare-title'));
    announceCompare('Comparison cleared.');
    clearCompare('compare_page');
    router.replace('/compare', { scroll: false });
  };

  const scoringState: ScoringState = status === 'ready' ? 'ready' : status === 'loading' || status === 'pending' ? 'loading' : 'none';
  const chips = profile ? profileChips(profile) : [];

  return (
    <>
      <section className={`section section--editorial ${styles.wsSection}`} aria-labelledby="compare-title">
        <div className="container container--wide">
          <Breadcrumbs items={BREADCRUMBS} />
          <div className={styles.wsHead}>
            <h1 id="compare-title" className={`h-utility ${styles.wsTitle}`} tabIndex={-1}>
              {entries.length === 1 ? (
                <>
                  One mattress, <em>so far.</em>
                </>
              ) : (
                <>
                  Your {entries.length} <em>finalists.</em>
                </>
              )}
            </h1>
            <div className={styles.wsStatus}>
              <ScoreStatus status={status} chips={chips} onRetry={retry} />
              <button type="button" className={styles.textBtn} onClick={clearAll}>
                <Trash2 aria-hidden="true" />
                Clear all
              </button>
            </div>
          </div>
          {missingCount > 0 ? (
            <p className={styles.inlineNote} role="note">
              {missingCount === 1 ? 'One mattress in this link is' : `${missingCount} mattresses in this link are`} no longer in the catalog, so{' '}
              {missingCount === 1 ? 'it was' : 'they were'} left out.
            </p>
          ) : null}
          <ComparisonTable
            columns={columns}
            profile={status === 'ready' ? profile : null}
            scoring={scoringState}
            caption="Comparison of the selected mattresses"
            onRemove={remove}
            toolbarExtra={
              entries.length < MAX_COMPARE_COLUMNS ? (
                <Link href="/mattresses" className={styles.addLink}>
                  <Plus aria-hidden="true" />
                  Add a mattress
                  <span className={styles.addCount}>
                    {entries.length} of {MAX_COMPARE_COLUMNS}
                  </span>
                </Link>
              ) : null
            }
          />
          <p className={styles.tableFoot}>
            {status === 'ready'
              ? 'Scores come from the same engine as your match. Your budget and type filters aren’t applied here, so every mattress you picked is scored; prices above your budget are marked.'
              : 'Specs come from manufacturer sources and independent reviews on file. Anything we haven’t confirmed says so. Thumbnails are illustrations of each mattress type, not product photos.'}
          </p>
        </div>
      </section>

      <WorkspaceVerdict columns={columns} verdict={verdict} scoring={scoringState} />
    </>
  );
}
