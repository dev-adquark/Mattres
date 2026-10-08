'use client';

import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { LayoutGrid, Rows3, SearchX, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { cx } from '@/components/ui/cx';
import { CatalogCard } from '@/components/catalog/CatalogCard';
import type { CardMatchItem } from '@/components/catalog/CatalogCard';
import { CatalogRow } from '@/components/catalog/CatalogRow';
import type { CatalogListEntry } from '@/components/catalog/catalogData';
import type { BestFit, Facet, LimitingFilter, PositionScore, SortGroup } from './catalogQuery';
import styles from './Catalog.module.css';

/** How the results are laid out: a large-image gallery (default) or a score-led index of aligned rows. */
export type CatalogView = 'list' | 'gallery';

export const isCatalogView = (value: unknown): value is CatalogView => value === 'list' || value === 'gallery';

const VIEWS: readonly { id: CatalogView; label: string; Icon: typeof Rows3 }[] = [
  { id: 'gallery', label: 'Gallery', Icon: LayoutGrid },
  { id: 'list', label: 'List', Icon: Rows3 },
];

/** Two-state layout switch (aria-pressed buttons in a labelled group). */
export function ViewToggle({ view, onChange }: { view: CatalogView; onChange: (view: CatalogView) => void }) {
  return (
    <div role="group" aria-label="Layout" className={styles.viewToggle}>
      {VIEWS.map(({ id, label, Icon }) => (
        <button key={id} type="button" className={styles.viewButton} aria-pressed={view === id} onClick={() => onChange(id)}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

export interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/** "Showing n of m" plus the removable chips for every active filter. */
export function CatalogStatus({
  shown,
  total,
  chips,
  onClearAll,
  aside,
}: {
  shown: number;
  total: number;
  chips: readonly ActiveChip[];
  onClearAll: () => void;
  /** Controls shown at the end of the count line (the layout switch). */
  aside?: ReactNode;
}) {
  return (
    <div className={styles.status}>
      <div className={styles.statusLine}>
        <p className={styles.count} role="status" aria-live="polite">
          Showing <strong className="tabular">{shown}</strong> of <span className="tabular">{total}</span> mattresses
        </p>
        {aside}
      </div>
      {chips.length ? (
        <ul className={styles.chips} aria-label="Active filters">
          {chips.map((c) => (
            <li key={c.key}>
              <button type="button" className="chip" onClick={c.onRemove} aria-label={`Remove filter: ${c.label}`}>
                {c.label}
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
          <li>
            <button type="button" className={cx('link-quiet', styles.clear)} onClick={onClearAll}>
              Clear all
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

interface CatalogEmptyProps {
  /** Filters whose removal alone brings results back (catalogQuery#limitingFilters). */
  limits: readonly LimitingFilter[];
  /** The trimmed search text. */
  query: string;
  labelFor: (facet: Facet, value: string) => string;
  onRemove: (facet: Facet, value: string) => void;
  onReset: () => void;
  onSearchSite: (query: string) => void;
}

/** Zero results: names the filters to relax (with their real result counts) instead of a dead end. */
export function CatalogEmpty({ limits, query, labelFor, onRemove, onReset, onSearchSite }: CatalogEmptyProps) {
  return (
    <EmptyState
      icon={SearchX}
      headingLevel="h3"
      className={styles.empty}
      title={limits.length ? 'No mattress matches every filter at once.' : 'Try another mattress, brand or guide.'}
      description={
        limits.length
          ? `${limits.length === 1 ? 'Removing this filter' : 'Removing any one of these filters'} brings results back.`
          : query
            ? `Nothing in the catalog matches “${query}” with these filters.`
            : 'No mattress in the catalog matches every filter you picked.'
      }
      action={
        <div className={styles.emptyBody}>
          {limits.length ? (
            <ul className={styles.relax} aria-label="Filters you could remove">
              {limits.map((l) => (
                <li key={`${l.facet}-${l.value}`}>
                  <button type="button" className="chip" onClick={() => onRemove(l.facet, l.value)}>
                    Remove {labelFor(l.facet, l.value)}
                    <span className={styles.relaxCount}>
                      {l.results} {l.results === 1 ? 'result' : 'results'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className={styles.emptyActions}>
            <Button variant={limits.length ? 'ghost' : 'primary'} onClick={onReset}>
              Reset search and filters
            </Button>
            {query ? (
              <Button variant="ghost" onClick={() => onSearchSite(query)}>
                Search guides and brands instead
              </Button>
            ) : null}
          </div>
        </div>
      }
    />
  );
}

/**
 * The sorted result groups. List view: one index per group whose rows share
 * the column tracks (subgrid) under a single header. Gallery view: a uniform
 * card grid whose cards share row tracks (subgrid), so every row's titles,
 * facts and compare toggles line up.
 *
 * `interlude` (an editorial band) is placed across the full width of the
 * first untitled group, after INTERLUDE_AFTER cards or rows, when that group
 * is long enough for a break to help.
 */
const INTERLUDE_AFTER: Readonly<Record<CatalogView, number>> = { gallery: 6, list: 8 };
const INTERLUDE_MIN_ITEMS = 12;

export function CatalogGroups({
  groups,
  matchItemFor,
  view,
  fitFor,
  positionsFor,
  interlude,
}: {
  groups: readonly SortGroup<CatalogListEntry>[];
  matchItemFor: (id: string) => CardMatchItem | undefined;
  view: CatalogView;
  /** Engine positioning per mattress (catalogQuery#bestFitFor), when reference scores exist. */
  fitFor?: (id: string) => BestFit | null;
  /** Every reference position score per mattress (catalogQuery#positionScoresFor), revealed on gallery-card hover. */
  positionsFor?: (id: string) => PositionScore[] | null;
  /** Editorial band for long, unfiltered results (see INTERLUDE_AFTER). */
  interlude?: ReactNode;
}) {
  const interludeGroup = interlude ? groups.find((g) => !g.title && g.items.length >= INTERLUDE_MIN_ITEMS)?.id : undefined;
  return (
    <>
      {groups.map((group) => {
        const breakAt = group.id === interludeGroup ? INTERLUDE_AFTER[view] : -1;
        const band = (index: number) =>
          index === breakAt ? (
            <li key="interlude" className={styles.interludeItem}>
              {interlude}
            </li>
          ) : null;
        const scored = group.items.some((item) => item.headline);
        const headingLevel = group.title ? 'h4' : 'h3';
        return (
          <div key={group.id} className={styles.group}>
            {group.title ? (
              <header className={styles.groupHead}>
                <h3 className={styles.groupTitle}>
                  {group.title} <span className="tabular muted">({group.items.length})</span>
                </h3>
                {group.note ? <p className={styles.groupNote}>{group.note}</p> : null}
              </header>
            ) : null}
            {view === 'list' ? (
              <div className={styles.index} data-scored={scored ? 'true' : 'false'}>
                <div className={styles.indexHead} aria-hidden="true">
                  {scored ? <span>Score</span> : null}
                  <span>Illustration</span>
                  <span>Mattress</span>
                  <span>Firmness · Trial</span>
                  <span>Queen price</span>
                  <span>Data status</span>
                </div>
                <ul className={styles.indexRows}>
                  {group.items.map(({ entry, annotation, headline }, index) => (
                    <Fragment key={entry.id}>
                      {band(index)}
                      <li className={styles.indexItem}>
                        <CatalogRow entry={entry} matchItem={matchItemFor(entry.id)} line={annotation} headline={headline} fit={fitFor?.(entry.id)} headingLevel={headingLevel} slot={index} />
                      </li>
                    </Fragment>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className={styles.gallery}>
                {group.items.map(({ entry, annotation, headline }, index) => (
                  <Fragment key={entry.id}>
                    {band(index)}
                    <li className={styles.cell}>
                      <CatalogCard
                      entry={entry}
                      matchItem={matchItemFor(entry.id)}
                      line={annotation}
                      headline={headline}
                      fit={fitFor?.(entry.id)}
                      positions={positionsFor?.(entry.id)}
                        slot={index}
                        headingLevel={headingLevel}
                      />
                    </li>
                  </Fragment>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </>
  );
}
