'use client';

import Link from 'next/link';
import { useState } from 'react';
import AuditBanner from './AuditBanner';
import ResultCard from './ResultCard';
import ComparisonTable from './ComparisonTable';

const MAX_SELECTED = 4;

// Pure display-layer grouping over the real, unaltered overallScore -
// scoring and filtering are untouched (see lib/matchLogic.js). Anything
// below the Possible tier is real-catalog data too, just hidden behind
// "Show all results" so a thin, low-scoring result set doesn't read as
// the site's best effort.
const TIERS = [
  { key: 'excellent', label: 'Excellent Match', min: 90, max: 100 },
  { key: 'strong', label: 'Strong Match', min: 80, max: 89 },
  { key: 'possible', label: 'Possible Match', min: 70, max: 79 },
];

function tierFor(score) {
  return TIERS.find((t) => score >= t.min && score <= t.max) ?? null;
}

export default function ResultsGrid({ results, catalogAudit }) {
  const [selectedIds, setSelectedIds] = useState(() => results.filter((r) => r.preselect).map((r) => r.entry.id));
  const [showComparison, setShowComparison] = useState(false);
  const [showAll, setShowAll] = useState(false);

  function toggleCompare(id) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTED) return prev; // at cap - ignored, same as the original's disabled-checkbox behavior
      return [...prev, id];
    });
  }

  const selectedItems = selectedIds.map((id) => results.find((r) => r.entry.id === id)).filter(Boolean);
  // The real cheapest priceUsd among the shown results - computed here,
  // not decorative, so the "Best Value" badge only ever lands on an
  // item that is actually the lowest real price in this set.
  const bestValueId = results.length
    ? results.reduce((min, r) => (r.entry.priceUsd < min.entry.priceUsd ? r : min), results[0]).entry.id
    : null;

  const grouped = TIERS.map((tier) => ({
    tier,
    items: results.filter((r) => tierFor(r.result.overallScore)?.key === tier.key),
  })).filter((g) => g.items.length > 0);
  const belowThreshold = results.filter((r) => !tierFor(r.result.overallScore));

  function renderCard(item, i) {
    return (
      <ResultCard
        key={item.entry.id}
        item={item}
        index={i}
        isBestValue={item.entry.id === bestValueId}
        compareChecked={selectedIds.includes(item.entry.id)}
        onCompareToggle={toggleCompare}
      />
    );
  }

  return (
    <>
      <AuditBanner audit={catalogAudit} />
      <div className="results-header">
        <div className="chips">
          <span className="chip">{results.length} matches</span>
        </div>
      </div>

      <div id="matchResultsGrid">
        {grouped.map(({ tier, items }, gi) => (
          <div key={tier.key} className="tier-group">
            <h3 className="tier-heading">
              <span className={`tier-badge tier-${tier.key}`}>{tier.label}</span>
              <span className="tier-count">{items.length} {items.length === 1 ? 'mattress' : 'mattresses'} · {tier.min}-{tier.max}</span>
            </h3>
            <div className="compare-grid">{items.map((item, i) => renderCard(item, gi * 100 + i))}</div>
          </div>
        ))}

        {belowThreshold.length > 0 && !showAll && (
          <button type="button" className="show-all-results-btn btn btn-ghost-dark" onClick={() => setShowAll(true)}>
            Show all results ({belowThreshold.length} more below 70)
          </button>
        )}

        {belowThreshold.length > 0 && showAll && (
          <div className="tier-group">
            <h3 className="tier-heading">
              <span className="tier-badge tier-below">Below 70</span>
              <span className="tier-count">{belowThreshold.length} {belowThreshold.length === 1 ? 'mattress' : 'mattresses'}</span>
            </h3>
            <div className="compare-grid">{belowThreshold.map((item, i) => renderCard(item, 900 + i))}</div>
          </div>
        )}
      </div>

      <p className="score-independence-note on-light">
        Scores can&apos;t be bought. Sponsored mattresses can pay for visibility, never for a higher Match Score.{' '}
        <Link href="/disclosures">How this works →</Link>
      </p>

      {selectedIds.length >= 2 && (
        <div className="comparison-tray-sticky">
          <span>{selectedIds.length} mattresses selected</span>
          <button type="button" className="btn btn-primary" onClick={() => setShowComparison(true)}>
            Compare
          </button>
        </div>
      )}

      {showComparison && <ComparisonTable items={selectedItems} onClose={() => setShowComparison(false)} />}
    </>
  );
}
