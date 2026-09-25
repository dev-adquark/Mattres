'use client';

import { useEffect, useRef } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { displayTitle, formatPrice } from '@/lib/format';

const ROWS = [
  { label: 'Mattress', get: (r) => displayTitle(r.entry) },
  { label: 'Type', get: (r) => r.entry.type },
  { label: 'Price', get: (r) => formatPrice(r.entry) },
  { label: 'Overall score', get: (r) => `${r.result.overallScore}/100` },
  ...CATEGORIES.map((cat) => ({ label: cat.label, get: (r) => r.result.subScores[cat.key].toFixed(1) })),
  { label: 'Risk flags', get: (r) => (r.result.riskFlags.length ? `${r.result.riskFlags.length} flag(s)` : 'None') },
  { label: 'Trial period', get: (r) => `${r.entry.trialDays} nights` },
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
          {ROWS.map((row) => (
            <tr key={row.label}>
              <td className="metric-label">{row.label}</td>
              {items.map((r) => (
                <td key={r.entry.id}>{row.get(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
