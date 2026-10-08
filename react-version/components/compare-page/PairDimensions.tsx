'use client';

import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { dimensionLabel } from '@/lib/scoreTiers';
import { track, EVENTS } from '@/lib/analytics';
import type { DimensionProvenance, ScoreCategory } from '@/lib/types';
import { dimensionBasisText } from '@/components/trust/provenanceCopy';
import { COMPARE_DIMENSIONS } from './compareModel';
import type { PairDimensionRow, PairNames, PairSideKey } from './types';
import styles from './Pair.module.css';

interface PairDimensionsProps {
  /** Computed on the server (pairModel.buildPairData) and passed in as plain values. */
  rows: readonly PairDimensionRow[];
  names: PairNames;
  pairSlug: string;
  /** Catalog firmnessSource per side, to name where support/pressure relief come from. */
  firmnessSources?: Partial<Record<PairSideKey, string | null | undefined>>;
}

/**
 * Six engine sub-scores side by side, per sleeper (tabs).
 * Sourced vs estimated is keyed once in the legend: an estimated value gets a
 * dashed bar and a visible "est." mark (shape and words, never colour alone),
 * and every value says which it is to screen readers.
 */
export function PairDimensions({ rows, names, pairSlug, firmnessSources }: PairDimensionsProps) {
  const [active, setActive] = useState(rows.length > 3 ? 3 : 0); // combination sleeper first: the neutral reference
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const row = rows[active];
  const anyEstimated = rows.some((r) => COMPARE_DIMENSIONS.some((d) => r.a.provenance[d.id] === 'estimated' || r.b.provenance[d.id] === 'estimated'));

  const select = (i: number, focus: boolean) => {
    const next = (i + rows.length) % rows.length;
    setActive(next);
    if (focus) tabRefs.current[next]?.focus();
    const target = rows[next];
    if (target) track(EVENTS.FILTER_USED, { filter: 'pair_sleeper', value: target.id, pair: pairSlug });
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const focused = tabRefs.current.indexOf(e.target as HTMLButtonElement);
    const from = focused >= 0 ? focused : active;
    if (e.key === 'ArrowRight') select(from + 1, true);
    else if (e.key === 'ArrowLeft') select(from - 1, true);
    else if (e.key === 'Home') select(0, true);
    else if (e.key === 'End') select(rows.length - 1, true);
    else return;
    e.preventDefault();
  };

  if (!row) return null;

  return (
    <div className={styles.dims}>
      <div className={styles.dimTabs} role="tablist" aria-label="Scored for which sleeper" onKeyDown={onKey}>
        {rows.map((r, i) => (
          <button
            key={r.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${r.id}`}
            aria-selected={i === active}
            aria-controls={`${baseId}-panel`}
            tabIndex={i === active ? 0 : -1}
            className={styles.dimTab}
            data-kind={r.kind}
            onClick={() => select(i, false)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className={styles.dimKey} aria-hidden="true">
        <div className={styles.dimLegend}>
          <span data-side="a">{names.a}</span>
          <span data-side="b">{names.b}</span>
        </div>
        <div className={styles.provKey}>
          {anyEstimated ? (
            <>
              <span data-prov="measured">Sourced: an independent rating or the firmness on file</span>
              <span data-prov="estimated">
                <abbr title="estimated">est.</abbr> Estimated from the construction type
              </span>
            </>
          ) : (
            <span data-prov="measured">Every value here comes from an independent rating or the firmness on file</span>
          )}
        </div>
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${row.id}`} className={styles.dimPanel}>
        <dl className={styles.dimList}>
          {COMPARE_DIMENSIONS.map((d) => {
            const a = row.a.subScores[d.id];
            const b = row.b.subScores[d.id];
            const pa = Math.round(a * 10);
            const pb = Math.round(b * 10);
            const gap = Math.abs(pa - pb);
            return (
              <div key={d.id} className={styles.dimRow} data-gap={gap >= 10 ? 'wide' : gap === 0 ? 'none' : 'narrow'}>
                <dt className={styles.dimName}>
                  <span>{d.label}</span>
                  <span className={styles.dimShort}>{d.short}</span>
                </dt>
                <dd className={styles.dimValues}>
                  <DimensionValue side="a" name={names.a} points={pa} sub={a} prov={row.a.provenance[d.id]} lead={pa > pb} dim={d.id} firmnessSource={firmnessSources?.a} />
                  <DimensionValue side="b" name={names.b} points={pb} sub={b} prov={row.b.provenance[d.id]} lead={pb > pa} dim={d.id} firmnessSource={firmnessSources?.b} />
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}

interface DimensionValueProps {
  side: PairSideKey;
  name: string;
  /** 0-100. */
  points: number;
  /** Engine sub-score, 0-10. */
  sub: number;
  prov: DimensionProvenance | undefined;
  lead: boolean;
  dim: ScoreCategory;
  firmnessSource: string | null | undefined;
}

function DimensionValue({ side, name, points, sub, prov, lead, dim, firmnessSource }: DimensionValueProps) {
  const estimated = prov === 'estimated';
  // Runtime bar fill, consumed by .dimBar > span in Pair.module.css.
  const fill = { '--fill': Math.max(0, Math.min(100, points)) / 100 } as CSSProperties;
  return (
    <div className={styles.dimValue} data-side={side} data-lead={lead ? 'true' : undefined}>
      <span className={styles.dimWho}>{name}</span>
      <span className={styles.dimBar} aria-hidden="true" data-estimated={estimated ? 'true' : undefined}>
        <span style={fill} />
      </span>
      <span className={styles.dimNum}>
        <strong>{points}</strong>
        <span className="sr-only">
          {' '}
          out of 100, {dimensionLabel(sub)}, {dimensionBasisText(dim, prov, firmnessSource)}
        </span>
      </span>
      <span className={styles.est} aria-hidden="true">
        {estimated ? 'est.' : ''}
      </span>
    </div>
  );
}
