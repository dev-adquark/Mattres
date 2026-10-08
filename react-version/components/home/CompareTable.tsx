import Link from 'next/link';
import { PriceValue } from '@/components/ui/DataValue';
import { DIMENSIONS } from '@/lib/explain';
import type { ScoreCategory } from '@/lib/types';
import { cssVars } from '@/components/ui/cssVars';
import type { CompareFinalist } from './types';
import styles from './Home.module.css';

/** Ids of the finalists holding the row maximum; empty when fewer than two values exist or all tie. */
function bestIds(finalists: CompareFinalist[], get: (f: CompareFinalist) => number | null | undefined): Set<string> {
  const values = finalists.map(get).filter((v): v is number => typeof v === 'number');
  if (values.length < 2) return new Set();
  const max = Math.max(...values);
  if (values.every((v) => v === max)) return new Set();
  return new Set(finalists.filter((f) => get(f) === max).map((f) => f.id));
}

function DimensionCell({ finalist: f, dim, best }: { finalist: CompareFinalist; dim: ScoreCategory; best: boolean }) {
  const v = f.subScores?.[dim];
  const estimated = f.provenance?.[dim] === 'estimated';
  if (typeof v !== 'number') return <span className="muted">Data unavailable</span>;
  return (
    <span className={styles.compareDim} data-best={best ? 'true' : undefined}>
      <span className={styles.compareBar} style={cssVars({ '--v': v / 10 })} aria-hidden="true" data-estimated={estimated ? 'true' : undefined} />
      <span className="tabular">
        {v.toFixed(1)}
        {best ? (
          <span className={styles.compareBestMark}>
            {' '}
            ▲<span className="sr-only">highest</span>
          </span>
        ) : null}
      </span>
      {estimated ? <span className={styles.compareEst}>Estimated</span> : null}
    </span>
  );
}

interface CompareTableProps {
  finalists: CompareFinalist[];
  profileLine: string;
}

/** The demo three-way comparison table (snaps column by column on phones). Every cell is an engine output or "Data unavailable". */
export function CompareTable({ finalists, profileLine }: CompareTableProps) {
  const bestScore = bestIds(finalists, (f) => f.score);
  return (
    <div className={styles.compareTableWrap}>
      <p className={styles.compareSwipe} aria-hidden="true">
        Swipe the table to see all {finalists.length}.
      </p>
      <div className="table-scroll" role="region" aria-labelledby="compare-caption" tabIndex={0}>
        <table className={styles.compareTable}>
          <caption id="compare-caption" className="sr-only">
            Top three matches for the example profile ({profileLine}), compared by Match Score and the six scored dimensions.
          </caption>
          <thead>
            <tr>
              <th scope="col" className={styles.compareCorner}>
                For this profile
              </th>
              {finalists.map((f, i) => (
                <th key={f.id} scope="col" className={styles.compareCol}>
                  <span className={styles.compareRank}>No. {i + 1}</span>
                  <span className={styles.compareBrand}>{f.brand}</span>
                  <Link href={`/mattress/${encodeURIComponent(f.id)}`} className={`link-quiet ${styles.compareName}`}>
                    {f.title}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className={styles.compareScoreRow}>
              <th scope="row">Match Score</th>
              {finalists.map((f) => (
                <td key={f.id}>
                  <span className={styles.compareScore}>{f.score}</span>
                  <span className={styles.compareTier}>
                    {f.tier}
                    {bestScore.has(f.id) ? <span className={styles.compareBest}> · Highest</span> : null}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Build · feel</th>
              {finalists.map((f) => (
                <td key={f.id}>
                  {f.typeLabel}
                  {f.firmness ? ` · ${f.firmness.label}` : ''}
                </td>
              ))}
            </tr>
            {DIMENSIONS.map((d) => {
              const best = bestIds(finalists, (f) => f.subScores?.[d.id]);
              return (
                <tr key={d.id}>
                  <th scope="row">{d.label}</th>
                  {finalists.map((f) => (
                    <td key={f.id}>
                      <DimensionCell finalist={f} dim={d.id} best={best.has(f.id)} />
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr>
              <th scope="row">Queen price</th>
              {finalists.map((f) => (
                <td key={f.id}>
                  <PriceValue entry={{ priceUsd: f.priceUsd, priceFromUsd: f.priceFromUsd ?? undefined }} />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Fit flags</th>
              {finalists.map((f) => (
                <td key={f.id} className={styles.compareFlag}>
                  {f.watchOut ? <span data-severity={f.watchOut.severity}>{f.watchOut.title}</span> : <span className="muted">None for this profile</span>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.compareNote}>
        Sub-scores out of 10 from our v0.2 engine. ▲ marks the highest in a row; dashed bars are estimated from construction type rather
        than rated.
      </p>
    </div>
  );
}
