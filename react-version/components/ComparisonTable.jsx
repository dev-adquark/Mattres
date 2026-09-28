'use client';

import { useEffect, useRef } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { displayTitle, formatPrice } from '@/lib/format';

// `value` extracts the real number a row's highlighting decision is
// based on (comparable rows only) - kept separate from `get` (the
// display string) so "lower is better" (price) and "higher is better"
// (everything else comparable) can both be handled by one real
// comparison, never a hardcoded/fabricated "winner" label.
const ROWS = [
  { label: 'Mattress', get: (r) => displayTitle(r.entry) },
  { label: 'Type', get: (r) => r.entry.type },
  { label: 'Price', get: (r) => formatPrice(r.entry), value: (r) => r.entry.priceUsd, higherIsBetter: false },
  { label: 'Overall score', get: (r) => `${r.result.overallScore}/100`, value: (r) => r.result.overallScore, higherIsBetter: true },
  ...CATEGORIES.map((cat) => ({
    label: cat.label,
    get: (r) => r.result.subScores[cat.key].toFixed(1),
    value: (r) => r.result.subScores[cat.key],
    higherIsBetter: true,
  })),
  { label: 'Risk flags', get: (r) => (r.result.riskFlags.length ? `${r.result.riskFlags.length} flag(s)` : 'None') },
  { label: 'Trial period', get: (r) => `${r.entry.trialDays} nights`, value: (r) => r.entry.trialDays, higherIsBetter: true },
];

/**
 * Focuses on real differences: a row only gets a "stronger value"
 * highlight when it has a real, directly-comparable numeric value for
 * every item AND those values actually differ - never on a tie, and
 * never on a row (Mattress name, Type, Risk flags) that isn't a plain
 * higher/lower-is-better comparison to begin with.
 */
function winnerIds(row, items) {
  if (typeof row.value !== 'function') return new Set();
  const pairs = items.map((r) => ({ id: r.entry.id, v: row.value(r) }));
  if (pairs.some((p) => typeof p.v !== 'number')) return new Set();
  const best = row.higherIsBetter ? Math.max(...pairs.map((p) => p.v)) : Math.min(...pairs.map((p) => p.v));
  const allEqual = pairs.every((p) => p.v === pairs[0].v);
  if (allEqual) return new Set();
  return new Set(pairs.filter((p) => p.v === best).map((p) => p.id));
}

/** Ported from the original project's viewComparisonBtn handler - same rows, same order, driven by real result data. */
export default function ComparisonTable({ items, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="comparison-section" id="comparisonSection" ref={ref}>
      <div className="comparison-head">
        <h3>Side-by-side comparison</h3>
        <button type="button" className="btn btn-ghost-dark" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Metric</th>
              {items.map((r) => (
                <th key={r.entry.id}>{displayTitle(r.entry)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const winners = winnerIds(row, items);
              return (
                <tr key={row.label}>
                  <td className="metric-label">{row.label}</td>
                  {items.map((r) => (
                    <td key={r.entry.id} className={winners.has(r.entry.id) ? 'cmp-cell-win' : undefined}>
                      {row.get(r)}
                      {winners.has(r.entry.id) && winners.size < items.length && (
                        <svg className="cmp-cell-win-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                          <path d="m5 12 5 5L20 7" />
                        </svg>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
