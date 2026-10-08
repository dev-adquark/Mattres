'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { Check, Equal } from 'lucide-react';
import { MattressRender } from '@/components/ui/MattressRender';
import { SliderControls } from '@/components/motion';
import { track, EVENTS } from '@/lib/analytics';
import type { ProfileLike } from '@/lib/compareTopics';
import { buildRowGroups, columnName } from './compareModel';
import { CellValue, ColumnHead } from './ComparisonCells';
import { useColumnPager, useStickyLineup } from './useColumnPager';
import type { CompareColumn, CompareRow, ScoringState } from './types';
import styles from './Compare.module.css';

interface ComparisonTableProps {
  /** Columns in display order; `item` is a slimmed matchProfile result item or null. */
  columns: readonly CompareColumn[];
  /** The sleep profile used for scoring (optional; adds budget notes). */
  profile?: ProfileLike | null;
  /** What the lineup shows where a score would be. Derived from the columns when omitted. */
  scoring?: ScoringState;
  /** Accessible table caption. */
  caption: string;
  /** Shows a Remove button per column (the /compare workspace). */
  onRemove?: (id: string) => void;
  /** Analytics source for the CompareToggle shown when onRemove is absent. */
  toggleSource?: string;
  /** Rendered in the toolbar (e.g. "Add a mattress"). */
  toolbarExtra?: ReactNode;
}

/**
 * Side-by-side comparison table.
 *  - Desktop (960px+): the whole table fits. The lineup row (thumbnail, full
 *    name, Match Score or "No profile", remove) sticks under the site header.
 *  - 640–959px: a 2-up carousel of columns with the row labels pinned on the
 *    left. Below 640px: still 2-up, with each row's label on its own line
 *    above the values (so the values get the width). Swipe, the prev/next controls or the keyboard
 *    move between mattresses; a compact copy of the lineup (decorative,
 *    aria-hidden) sticks under the header once the real one scrolls away.
 * Row leaders are marked with an amber tick AND a word ("Highest", "Lowest"),
 * never colour alone. "Show only differences" hides rows where every
 * mattress has the same value.
 */
export function ComparisonTable({ columns, profile, scoring, caption, onRemove, toggleSource = 'compare_table', toolbarExtra = null }: ComparisonTableProps) {
  const groups = useMemo(() => buildRowGroups(columns, { profile }), [columns, profile]);
  const [diffOnly, setDiffOnly] = useState(false);
  // The pager's live status speaks only after someone has used the pager (not on load or every swipe before it).
  const [paged, setPaged] = useState(false);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);

  const n = columns.length;
  const { scrollerRef, trackRef, pos, go, measure } = useColumnPager(n);
  const barVisible = useStickyLineup(theadRef, blockRef);
  const scoreState: ScoringState = scoring || (columns.every((c) => c.item && c.item.result) ? 'ready' : 'none');
  const sameCount = groups.reduce((acc, g) => acc + g.rows.filter((r) => r.same).length, 0);

  // Keep the compact lineup's track aligned when it (re)appears.
  useEffect(() => {
    if (pos.overflow) measure();
  }, [pos.overflow, barVisible, measure]);

  const toggleDiff = () => {
    const next = !diffOnly;
    setDiffOnly(next);
    track(EVENTS.FILTER_USED, { filter: 'compare_differences_only', value: next ? 'on' : 'off' });
  };

  // Explicit table roles: below 640px the rows are CSS grids (Compare.module.css), which can drop native table semantics.
  // Column count drives the CSS grid/carousel widths in Compare.module.css.
  const blockStyle = { '--n': n } as CSSProperties;

  return (
    <div className={styles.tableBlock} ref={blockRef} style={blockStyle} data-cols={n}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.switch} aria-pressed={diffOnly} onClick={toggleDiff} disabled={n < 2}>
          <span className={styles.switchTrack} aria-hidden="true">
            <span className={styles.switchThumb} />
          </span>
          Show only differences
        </button>
        <p className={styles.toolbarNote} aria-live="polite">
          {toolbarNote(n, diffOnly, sameCount)}
        </p>
        {toolbarExtra}
        {/* Rendered whenever there is more than one column and hidden by CSS where the columns fit (Compare.module.css),
            so the toolbar never grows after hydration (CLS). The measured position only drives the disabled states. */}
        {n > 1 ? (
          <SliderControls
            className={styles.pager}
            onPrev={() => {
              setPaged(true);
              go(-1);
            }}
            onNext={() => {
              setPaged(true);
              go(1);
            }}
            canPrev={pos.canPrev}
            canNext={pos.canNext}
            index={pos.index}
            total={n}
            label="mattress column"
            status={paged ? pagerStatus(columns, pos.first, pos.last) : ''}
          />
        ) : null}
      </div>

      {pos.overflow ? <StickyLineup columns={columns} index={pos.index} visible={barVisible} trackRef={trackRef} /> : null}

      <div className={styles.scrollWrap} data-overflow={pos.overflow ? 'true' : 'false'} data-at-end={pos.canNext ? 'false' : 'true'}>
        <div ref={scrollerRef} className={styles.scroller} role="region" aria-label={`${caption}. Scrolls sideways on small screens.`} tabIndex={0}>
          <table className={styles.table} data-cols={n} role="table">
            <caption className="sr-only">{caption}</caption>
            <thead ref={theadRef} role="rowgroup">
              <tr role="row">
                <th scope="col" className={styles.corner} role="columnheader">
                  <span className={styles.cornerText}>{n === 1 ? '1 mattress' : `${n} mattresses`}</span>
                </th>
                {columns.map((col, i) => (
                  <th key={col.id} scope="col" className={styles.colHead} data-col={i} role="columnheader">
                    <ColumnHead col={col} scoreState={scoreState} onRemove={onRemove} toggleSource={toggleSource} />
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((group) => {
              const rows = diffOnly && n > 1 ? group.rows.filter((r) => !r.same) : group.rows;
              if (!rows.length) return null;
              return (
                <tbody key={group.id} className={styles.group} role="rowgroup">
                  <tr className={styles.groupRow} role="row">
                    <th scope="colgroup" colSpan={n + 1} role="columnheader" aria-colspan={n + 1}>
                      <span className={styles.groupLabel}>{group.label}</span>
                      {group.note ? <span className={styles.groupNote}>{group.note}</span> : null}
                    </th>
                  </tr>
                  {rows.map((row) => (
                    <TableRow key={row.id} row={row} columns={columns} />
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      </div>
    </div>
  );
}

/** "Showing columns 2–3 of 3: Purple Plus, Saatva Classic". */
function pagerStatus(columns: readonly CompareColumn[], first: number, last: number): string {
  const shown = columns.slice(first, last + 1).map((c) => columnName(c.entry));
  const range = first === last ? `column ${first + 1}` : `columns ${first + 1}–${last + 1}`;
  return `Showing ${range} of ${columns.length}: ${shown.join(', ')}`;
}

function toolbarNote(n: number, diffOnly: boolean, sameCount: number): string {
  if (n < 2) return 'Add a second mattress to see differences.';
  if (!sameCount) return 'Every row differs.';
  if (diffOnly) return `Hiding ${sameCount} ${sameCount === 1 ? 'row' : 'rows'} where they match.`;
  return `${sameCount} ${sameCount === 1 ? 'row is' : 'rows are'} identical.`;
}

function leaderText(row: CompareRow): string | undefined {
  const word = row.leaderWord;
  if (!row.tied || !word) return word;
  return word === 'Leads' ? 'Shares the lead' : `Tied ${word.toLowerCase()}`;
}

function TableRow({ row, columns }: { row: CompareRow; columns: readonly CompareColumn[] }) {
  const n = columns.length;
  return (
    <tr className={styles.row} role="row" data-same={row.same ? 'true' : 'false'} data-emphasis={row.emphasis ? 'true' : undefined}>
      <th scope="row" className={styles.rowHead} role="rowheader">
        <span className={styles.rowLabel}>{row.label}</span>
        {row.hint ? <span className={styles.rowHint}>{row.hint}</span> : null}
        {row.same && n > 1 ? (
          <span className={styles.sameTag}>
            <Equal aria-hidden="true" />
            Same for all
          </span>
        ) : null}
      </th>
      {row.cells.map((c, i) => {
        const leads = row.leaders.includes(i);
        return (
          <td key={columns[i]?.id ?? i} role="cell" className={styles.cell} data-leader={leads ? 'true' : undefined} data-long={row.long ? 'true' : undefined}>
            <CellValue cell={c} emphasis={row.emphasis} />
            {leads ? (
              <span className={styles.leader}>
                <Check aria-hidden="true" />
                {leaderText(row)}
              </span>
            ) : null}
          </td>
        );
      })}
    </tr>
  );
}

interface StickyLineupProps {
  columns: readonly CompareColumn[];
  index: number;
  visible: boolean;
  trackRef: RefObject<HTMLDivElement | null>;
}

/** Decorative compact copy of the lineup that sticks under the header on small screens. */
function StickyLineup({ columns, index, visible, trackRef }: StickyLineupProps) {
  return (
    <div className={styles.stickyBar} data-visible={visible ? 'true' : 'false'} aria-hidden="true">
      <div className={styles.stickyCorner}>
        <strong>{index + 1}</strong>/{columns.length}
      </div>
      <div className={styles.stickyViewport}>
        <div className={styles.stickyTrack} ref={trackRef}>
          {columns.map((col) => (
            <div key={col.id} className={styles.stickyCol}>
              <span className={styles.stickyThumb}>
                <MattressRender type={col.entry.type} seed={col.entry.id} aspect="card" fill objectPosition="50% 55%" sizes="48px" />
              </span>
              <span className={styles.stickyName}>{columnName(col.entry)}</span>
              {col.item && col.item.result ? <span className={styles.stickyScore}>{col.item.result.overallScore}</span> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
