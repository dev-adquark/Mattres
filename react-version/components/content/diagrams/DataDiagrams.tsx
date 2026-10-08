import type { ReactNode } from 'react';
import { cx } from '@/components/ui/cx';
import type { RangeRow } from '@/lib/content/types';
import type { MattressEntry, MattressType } from '@/lib/types';
import { cssVars } from '@/components/ui/cssVars';
import styles from '../Diagrams.module.css';
import { Frame, captionText, type DiagramCaption } from './DiagramPrimitives';

const TYPE_ORDER: MattressType[] = ['innerspring', 'hybrid', 'latex', 'foam'];
const TYPE_LABEL: Record<MattressType, string> = { innerspring: 'Innerspring', hybrid: 'Hybrid', latex: 'Latex', foam: 'All-foam' };
const AXIS_TICKS = [0, 2, 4, 6, 8, 10];

interface RatedEntry {
  id: string;
  rating: number;
}

interface CoolingGroup {
  type: MattressType;
  total: number;
  rated: RatedEntry[];
}

function coolingGroups(entries: readonly MattressEntry[]): CoolingGroup[] {
  return TYPE_ORDER.map((type) => {
    const all = entries.filter((e) => e.type === type);
    const rated: RatedEntry[] = [];
    for (const e of all) if (typeof e.coolingRatingOutOf10 === 'number') rated.push({ id: e.id, rating: e.coolingRatingOutOf10 });
    return { type, total: all.length, rated };
  }).filter((g) => g.total > 0);
}

/** Spoken summary of the plot: every rating, per type, plus the unrated count. */
function coolingLabel(groups: readonly CoolingGroup[], ratedCount: number, totalCount: number): string {
  const perType = groups
    .map((g) => {
      const values = g.rated.length ? g.rated.map((e) => e.rating).sort((a, b) => a - b).join(', ') : 'no ratings';
      const unrated = g.total - g.rated.length;
      return `${TYPE_LABEL[g.type]}: ${values}${unrated ? `, ${unrated} unrated` : ''}.`;
    })
    .join(' ');
  return `Independent cooling ratings on file for ${ratedCount} of ${totalCount} mattresses, grouped by type. ${perType}`;
}

/** Position of a 0-10 rating along the track, as a percentage. */
const pct = (v: number) => `${(v / 10) * 100}%`;

interface CoolingDotPlotProps {
  entries: readonly MattressEntry[];
  caption?: DiagramCaption;
  compact?: boolean;
}

/**
 * Dot plot of every independent cooling rating on file, one dot per
 * mattress, grouped by construction type. Unrated mattresses are counted,
 * not plotted. Data comes straight from the catalog at render time.
 */
export function CoolingDotPlot({ entries, caption = true, compact = false }: CoolingDotPlotProps) {
  const groups = coolingGroups(entries);
  const ratedCount = groups.reduce((n, g) => n + g.rated.length, 0);
  const totalCount = groups.reduce((n, g) => n + g.total, 0);
  const captionNode = captionText(
    caption,
    `Each dot is one mattress’s independent cooling rating (0–10). ${totalCount - ratedCount} of ${totalCount} mattresses in the catalog have no cooling rating on file and are not plotted.`,
  );

  return (
    <figure className={cx(styles.figure, styles.dotFigure, compact && styles.dotCompact)}>
      <div className={styles.dotPlot} role="img" aria-label={coolingLabel(groups, ratedCount, totalCount)}>
        {groups.map((g) => (
          <div key={g.type} className={styles.dotRow}>
            <span className={styles.dotLabel}>
              {TYPE_LABEL[g.type]}
              <span className={styles.dotSub}>
                {g.rated.length} of {g.total} rated
              </span>
            </span>
            <span className={styles.dotTrack}>
              {g.rated.map((e, i) => (
                <span
                  key={e.id}
                  className={styles.dot}
                  style={cssVars({ '--dot-x': pct(e.rating), '--dot-y': `${50 + ((i % 3) - 1) * 22}%` })}
                />
              ))}
            </span>
          </div>
        ))}
        <div className={styles.dotAxis} aria-hidden="true">
          <span />
          <span className={styles.dotAxisTrack}>
            {AXIS_TICKS.map((n) => (
              <span key={n} style={cssVars({ '--tick-x': pct(n) })}>
                {n}
              </span>
            ))}
          </span>
        </div>
      </div>
      {captionNode ? <figcaption className={styles.caption}>{captionNode}</figcaption> : null}
    </figure>
  );
}

interface BandsDiagramProps {
  rows: readonly RangeRow[];
  title: string;
  caption?: string | false;
}

/**
 * SVG version of the comfort-window chart for covers: one bar per row on
 * the engine's 1-10 scale. rows come from the rules file (see
 * lib/content/bands bandRowsForWeight / bandRowsForPosition). The values
 * are also spoken through the aria-label.
 */
export function BandsDiagram({ rows, title, caption = false }: BandsDiagramProps) {
  const x0 = 130;
  const x1 = 420;
  const sx = (v: number) => x0 + ((v - 1) / 9) * (x1 - x0);
  const top = 70;
  const gap = Math.min(46, 170 / Math.max(1, rows.length));
  return (
    <Frame label={`${title}: ${rows.map((r) => `${r.label} ${r.min} to ${r.max} out of 10`).join('; ')}.`} caption={caption || null}>
      <text className={styles.kicker} x="20" y="34">{title}</text>
      {[1, 4, 7, 10].map((n) => (
        <g key={n}>
          <line className={styles.gridLine} x1={sx(n)} x2={sx(n)} y1={top - 18} y2={top + gap * rows.length - 10} />
          <text className={styles.label} x={sx(n)} y={top + gap * rows.length + 8} textAnchor="middle">{n}</text>
        </g>
      ))}
      {rows.map((r, i) => {
        const y = top + i * gap;
        return (
          <g key={r.key}>
            <text className={styles.label} x="20" y={y + 4}>{r.label}</text>
            <line className={styles.bandTrack} x1={x0} x2={x1} y1={y} y2={y} />
            <line className={styles.bandBar} x1={sx(r.min)} x2={sx(r.max)} y1={y} y2={y} />
          </g>
        );
      })}
      <text className={styles.note} x={x0} y="262">← softer</text>
      <text className={styles.note} x={x1} y="262" textAnchor="end">firmer →</text>
    </Frame>
  );
}

const TYPE_COLUMNS: { label: string; x: number; kind: MattressType }[] = [
  { label: 'All-foam', x: 20, kind: 'foam' },
  { label: 'Hybrid', x: 125, kind: 'hybrid' },
  { label: 'Innerspring', x: 230, kind: 'innerspring' },
  { label: 'Latex', x: 335, kind: 'latex' },
];
const COL_W = 85;
const COL_Y = 90;
const COL_H = 130;

/** A column of n coil springs inside a construction column. */
function coils(x: number, yTop: number, height: number, n = 4): ReactNode[] {
  return Array.from({ length: n }, (_, i) => {
    const cx0 = x + 12 + (i * (COL_W - 24)) / (n - 1);
    const steps = Math.floor(height / 8);
    let d = `M${cx0} ${yTop + 4}`;
    for (let k = 0; k < steps - 1; k += 1) d += ` q ${k % 2 ? -5 : 5} 4 0 8`;
    return <path key={i} className={styles.coil} d={d} />;
  });
}

/** The layers of one generic construction. */
function ConstructionLayers({ kind, x }: { kind: MattressType; x: number }) {
  const w = COL_W;
  const y = COL_Y;
  const h = COL_H;
  switch (kind) {
    case 'foam':
      return (
        <>
          <rect className={styles.layerComfort} x={x} y={y} width={w} height={h * 0.3} />
          <rect className={styles.layerCore} x={x} y={y + h * 0.3} width={w} height={h * 0.2} />
          <rect className={styles.layerDense} x={x} y={y + h * 0.5} width={w} height={h * 0.5} />
        </>
      );
    case 'hybrid':
      return (
        <>
          <rect className={styles.layerComfort} x={x} y={y} width={w} height={h * 0.28} />
          <rect className={styles.layerCore} x={x} y={y + h * 0.28} width={w} height={h * 0.08} />
          {coils(x, y + h * 0.36, h * 0.54)}
          <rect className={styles.layerDense} x={x} y={y + h * 0.9} width={w} height={h * 0.1} />
        </>
      );
    case 'innerspring':
      return (
        <>
          <rect className={styles.layerComfort} x={x} y={y} width={w} height={h * 0.12} />
          {coils(x, y + h * 0.12, h * 0.78, 5)}
          <rect className={styles.layerDense} x={x} y={y + h * 0.9} width={w} height={h * 0.1} />
        </>
      );
    case 'latex':
      return (
        <>
          <rect className={styles.layerLatex} x={x} y={y} width={w} height={h * 0.35} />
          <rect className={styles.layerLatexCore} x={x} y={y + h * 0.35} width={w} height={h * 0.65} />
          {[0.15, 0.55, 0.75].map((f) =>
            [0.25, 0.5, 0.75].map((g) => <circle key={`${f}-${g}`} className={styles.pinhole} cx={x + w * g} cy={y + h * f} r="2.2" />),
          )}
        </>
      );
  }
}

/** Four generic constructions side by side (conceptual, not any product). */
export function TypesDiagram({ caption = false }: { caption?: string | false }) {
  return (
    <Frame
      label="Conceptual cross-sections of four generic mattress constructions: all-foam layers, a hybrid with foam over pocketed coils, an innerspring with thin padding over a coil unit, and latex layers."
      caption={caption || null}
    >
      <text className={styles.kicker} x="20" y="34">Four constructions</text>
      {TYPE_COLUMNS.map((c) => (
        <g key={c.kind}>
          <ConstructionLayers kind={c.kind} x={c.x} />
          <rect className={styles.outline} x={c.x} y={COL_Y} width={COL_W} height={COL_H} rx="3" />
          <text className={styles.label} x={c.x + COL_W / 2} y={COL_Y + COL_H + 24} textAnchor="middle">{c.label}</text>
        </g>
      ))}
    </Frame>
  );
}
