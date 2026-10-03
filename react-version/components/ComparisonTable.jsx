'use client';

import { useEffect, useRef } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { displayTitle, formatPrice } from '@/lib/format';

// `numeric` extracts a real comparable number for a row (or null if the
// row isn't numeric, e.g. the mattress name); `higherIsBetter` says which
// direction wins. Both are used only to highlight the stronger real value
// per row - the underlying data shown is unchanged.
const ROWS = [
  { label: 'Mattress', get: (r) => displayTitle(r.entry), numeric: null },
  { label: 'Type', get: (r) => r.entry.type, numeric: null },
  { label: 'Price', get: (r) => formatPrice(r.entry), numeric: (r) => r.entry.priceUsd, higherIsBetter: false },
  { label: 'Overall score', get: (r) => `${r.result.overallScore}/100`, numeric: (r) => r.result.overallScore, higherIsBetter: true },
  ...CATEGORIES.map((cat) => ({
    label: cat.label,
    get: (r) => r.result.subScores[cat.key].toFixed(1),
    numeric: (r) => r.result.subScores[cat.key],
    higherIsBetter: true,
  })),
  {
    label: 'Risk flags',
    get: (r) => (r.result.riskFlags.length ? `${r.result.riskFlags.length} flag(s)` : 'None'),
    numeric: (r) => r.result.riskFlags.length,
    higherIsBetter: false,
  },
  { label: 'Trial period', get: (r) => `${r.entry.trialDays} nights`, numeric: (r) => r.entry.trialDays, higherIsBetter: true },
];

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
            const values = row.numeric ? items.map((r) => row.numeric(r)) : null;
            const allSame = values ? values.every((v) => v === values[0]) : false;
            const best = values && !allSame ? (row.higherIsBetter ? Math.max(...values) : Math.min(...values)) : null;
            return (
              <tr key={row.label} className={allSame ? 'cmp-row-same' : row.numeric ? 'cmp-row-diff' : ''}>
                <td className="metric-label">
                  {row.label}
                  {allSame && <span className="cmp-same-tag">Same</span>}
                </td>
                {items.map((r, i) => {
                  const isWinner = values && !allSame && values[i] === best;
                  return (
                    <td key={r.entry.id} className={isWinner ? 'cmp-cell-win' : ''}>
                      {row.get(r)}
                      {isWinner && (
                        <svg className="cmp-cell-win-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="m5 12 5 5L20 7" />
                        </svg>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
