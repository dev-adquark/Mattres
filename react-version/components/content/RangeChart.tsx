import { cx } from '@/components/ui/cx';
import type { RangeRow } from '@/lib/content/types';
import { cssVars } from '@/components/ui/cssVars';
import styles from './Diagrams.module.css';

// The rules readers live in lib/content/bands; re-exported here because
// pages and articles import them alongside the chart.
export { bandRowsForPosition, bandRowsForWeight, weightBandLabel } from '@/lib/content/bands';

interface RangeChartProps {
  caption: string;
  rows: readonly RangeRow[];
  rowHeader?: string;
  valueHeader?: string;
  className?: string;
  captionHidden?: boolean;
}

const TICKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MAJOR_TICKS = new Set([1, 4, 7, 10]);
/** Position of a 1-10 value along the track, as a percentage. */
const pct = (v: number) => `${((v - 1) / 9) * 100}%`;

/**
 * Firmness range chart on the engine's 1-10 scale. Rendered as a real
 * <table> (row header + value cell) so screen readers get the numbers; the
 * bars are a visual layer on top of the same values, and every bar is also
 * printed as text ("3–6/10"), so nothing is conveyed by colour or length alone.
 */
export function RangeChart({ caption, rows, rowHeader = 'Group', valueHeader = 'Comfort window', className, captionHidden = false }: RangeChartProps) {
  return (
    <div className={cx(styles.range, className)}>
      <table className={styles.rangeTable}>
        <caption className={captionHidden ? 'sr-only' : styles.rangeCaption}>{caption}</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">{rowHeader}</th>
            <th scope="col">{valueHeader}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={cx(styles.rangeRow, row.highlight && styles.rangeRowHighlight)}>
              <th scope="row" className={styles.rangeLabel}>
                <span>{row.label}</span>
                {row.sub ? <span className={styles.rangeSub}>{row.sub}</span> : null}
              </th>
              <td className={styles.rangeCell}>
                <span className={styles.rangeTrack} aria-hidden="true">
                  <span className={styles.rangeBar} style={cssVars({ '--range-min': pct(row.min), '--range-max': pct(row.max) })} />
                </span>
                <span className={cx(styles.rangeValue, 'tabular')}>
                  {row.min}–{row.max}
                  <span className={styles.rangeUnit}>/10</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.rangeAxis} aria-hidden="true">
        <span className={styles.rangeAxisSpacer} />
        <span className={styles.rangeAxisTrack}>
          {TICKS.map((n) => (
            <span key={n} className={styles.rangeTick} data-minor={MAJOR_TICKS.has(n) ? undefined : true} style={cssVars({ '--tick-x': pct(n) })}>
              {n}
            </span>
          ))}
        </span>
        <span className={styles.rangeAxisSpacerEnd} />
        <span className={styles.rangeAxisSpacer} />
        <span className={styles.rangeEnds}>
          <span>← softer</span>
          <span>firmer →</span>
        </span>
      </div>
    </div>
  );
}
