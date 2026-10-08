import { FlaskConical } from 'lucide-react';
import { dimensionLabel } from '@/lib/scoreTiers';
import { DIMENSIONS as EXPLAIN_DIMENSIONS } from '@/lib/explain';
import type { DimensionProvenance, ScoreCategory } from '@/lib/types';
import { cx } from './cx';
import { scoreBars as s } from '@/components/ui/systemStyles';

export interface DimensionDef {
  key: ScoreCategory | string;
  label: string;
}

/**
 * Display order + names for the engine's six sub-scores. Labels come from
 * lib/explain so every page names a dimension the same way
 * (Pressure relief, Support & alignment, Cooling, Motion isolation,
 * Edge support, Durability).
 */
export const DIMENSIONS: DimensionDef[] = EXPLAIN_DIMENSIONS.map((d) => ({ key: d.id, label: d.label }));

/** v0.1 matchLogic dataProvenance (per-input source of truth). */
export interface LegacyDataProvenance {
  firmness?: string;
  heat?: string;
  edge?: string;
  durability?: string;
}

/**
 * Which sub-scores rest on a heuristic or fallback rather than stated or
 * independently measured data, derived from matchLogic's dataProvenance.
 */
export function estimatedDimensions(dataProvenance: LegacyDataProvenance | null | undefined): string[] {
  if (!dataProvenance) return [];
  const out: string[] = [];
  if (dataProvenance.firmness === 'unknown_neutral_fallback') out.push('pressureRelief', 'support');
  if (dataProvenance.heat && dataProvenance.heat !== 'independent_rating') out.push('heat');
  if (dataProvenance.edge && dataProvenance.edge !== 'independent_rating') out.push('edge');
  if (dataProvenance.durability === 'unknown') out.push('durability');
  return out;
}

interface ScoreBarsProps {
  /** Engine result.subScores (0-10). */
  subScores: Partial<Record<string, number>> | null | undefined;
  /** Explicit estimated keys (highest priority). */
  estimated?: string[] | null;
  /** v0.2 result.dimensionProvenance. */
  provenance?: Partial<Record<string, DimensionProvenance>> | null;
  /** v0.1 adapter output. */
  dataProvenance?: LegacyDataProvenance | null;
  dimensions?: DimensionDef[];
  showNote?: boolean;
  className?: string;
}

/**
 * Six-dimension breakdown from engine output. subScores are 0-10; bars
 * render them on a 0-100 scale with the dimensionLabel() word, so meaning
 * never depends on bar length or colour alone. Estimated dimensions get a
 * hatched bar plus an "Estimated" text marker.
 *
 * Hooks for parents: .score-bars (list), .score-bar__fill, .score-bars__note.
 */
export function ScoreBars({ subScores, estimated, provenance, dataProvenance, dimensions = DIMENSIONS, showNote = true, className }: ScoreBarsProps) {
  if (!subScores) return null;
  const fromProvenance = provenance ? Object.keys(provenance).filter((k) => provenance[k] === 'estimated') : null;
  const estimatedSet = new Set(estimated || fromProvenance || estimatedDimensions(dataProvenance));
  const rows = dimensions.filter((d) => typeof subScores[d.key] === 'number');
  return (
    <div className={className}>
      <ul className={cx('score-bars', s.bars)}>
        {rows.map((d) => {
          const sub = subScores[d.key] as number;
          const pct = Math.max(0, Math.min(100, Math.round(sub * 10)));
          const word = dimensionLabel(sub);
          const isEstimated = estimatedSet.has(d.key);
          return (
            <li key={d.key}>
              <div className={s.head}>
                <span className={s.label}>
                  {d.label}
                  {isEstimated ? (
                    <span className={s.estimated}>
                      <FlaskConical aria-hidden="true" />
                      Estimated
                    </span>
                  ) : null}
                </span>
                <span className={s.value}>
                  <strong>{pct}</strong>
                  <span aria-hidden="true">/100</span>
                  <span className="sr-only"> out of 100</span> · {word}
                </span>
              </div>
              <div className={s.track} aria-hidden="true">
                {/* Inline transform: the bar length IS the runtime score. */}
                <div className={cx('score-bar__fill', s.fill, isEstimated && s.fillEstimated)} style={{ transform: `scaleX(${pct / 100})` }} />
              </div>
            </li>
          );
        })}
      </ul>
      {showNote && estimatedSet.size > 0 ? (
        <p className={cx('score-bars__note', s.note)}>
          Estimated: no stated or independently measured value is on file for this dimension, so the model used a documented fallback. Treat it as less
          certain.
        </p>
      ) : null}
    </div>
  );
}
