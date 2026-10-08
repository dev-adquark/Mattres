import { cx } from '@/components/ui/cx';
import { cssVars } from '@/components/ui/cssVars';
import type { BandLike } from './types';
import styles from './Home.module.css';

const frac = (v: number): number => (Math.min(10, Math.max(1, v)) - 1) / 9;
const pct = (v: number): string => `${frac(v) * 100}%`;
const AXIS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export interface FirmnessScaleRow {
  id: string;
  label?: string;
  band: BandLike | null;
  active?: boolean;
}

export interface FirmnessScaleMarker {
  id: string;
  value: number;
  label: string;
  kind?: string;
}

interface FirmnessScaleProps {
  rows?: FirmnessScaleRow[];
  /** Vertical markers drawn across every row. */
  markers?: FirmnessScaleMarker[];
  /** Accessible description; omit to make the figure decorative. */
  label?: string;
  compact?: boolean;
  className?: string;
}

function bandBounds(band: BandLike | null): [number, number] | null {
  if (!band) return null;
  if ('min' in band) return [band.min, band.max];
  return [band[0], band[1]];
}

/**
 * Horizontal 1-10 firmness scale. Server-safe, pure CSS positioning.
 * The visual is decorative support for text that already states the same
 * numbers, so it is aria-hidden unless `label` is given (then role=img).
 */
export function FirmnessScale({ rows = [], markers = [], label, compact = false, className }: FirmnessScaleProps) {
  const a11y = label ? ({ role: 'img', 'aria-label': label } as const) : ({ 'aria-hidden': true } as const);
  return (
    <div
      className={cx(styles.scale, compact && styles.scaleCompact, rows.some((r) => r.label) && styles.scaleLabelled, className)}
      {...a11y}
    >
      <div className={styles.scaleRows}>
        {rows.map((row) => {
          const bounds = bandBounds(row.band);
          return (
            <div key={row.id} className={styles.scaleRow} data-active={row.active ? 'true' : undefined}>
              {row.label ? <span className={styles.scaleLabel}>{row.label}</span> : null}
              <span className={styles.scaleTrack}>
                {bounds ? (
                  <span className={styles.scaleBand} style={cssVars({ '--from': pct(bounds[0]), '--to': pct(bounds[1]) })}>
                    <span className={styles.scaleBandText}>
                      {bounds[0]}–{bounds[1]}
                    </span>
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
        {markers.map((m) => (
          <span key={m.id} className={styles.scaleMarker} style={cssVars({ '--at': frac(m.value) })} data-kind={m.kind}>
            <span className={styles.scaleMarkerLabel}>{m.label}</span>
          </span>
        ))}
      </div>
      <div className={styles.scaleAxis}>
        {AXIS.map((n) => (
          <span key={n} style={cssVars({ '--at': frac(n) })}>
            {n}
          </span>
        ))}
      </div>
      <div className={styles.scaleEnds}>
        <span>Softer</span>
        <span>Firmer</span>
      </div>
    </div>
  );
}
