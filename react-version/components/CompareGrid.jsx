'use client';

import { useState } from 'react';
import ResultCard from './ResultCard';
import ComparisonTable from './ComparisonTable';

const MAX_SELECTED = 4;
const INITIAL_VISIBLE = 4;

/**
 * The Compare page is a Server Component (it computes real scores at
 * request time via matchProfile()), but ResultCard is a Client Component
 * that expects an onCompareToggle function prop - and functions can't be
 * passed across the server/client boundary as props. This wrapper is the
 * client boundary: it receives only serializable data (results) from the
 * server and owns the real ad-hoc compare-selection state itself, so
 * every result card - on this fixed-topic page or the quiz results page
 * - offers the same real, working compare experience.
 */
export default function CompareGrid({ results }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  // Top few first (results are already sorted by real score), the rest
  // one tap away - keeps the page short on mobile without hiding data.
  const [showAll, setShowAll] = useState(false);

  function toggleCompare(id) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, id];
    });
  }

  const selectedItems = selectedIds.map((id) => results.find((r) => r.entry.id === id)).filter(Boolean);
  const bestValueId = results.length
    ? results.reduce((min, r) => (r.entry.priceUsd < min.entry.priceUsd ? r : min), results[0]).entry.id
    : null;

  return (
    <>
      <div className="compare-grid">
        {(showAll ? results : results.slice(0, INITIAL_VISIBLE)).map((item, i) => (
          <ResultCard
            key={item.entry.id}
            item={item}
            index={i}
            isBestValue={item.entry.id === bestValueId}
            compareChecked={selectedIds.includes(item.entry.id)}
            onCompareToggle={toggleCompare}
          />
        ))}
      </div>

      {!showAll && results.length > INITIAL_VISIBLE && (
        <button type="button" className="btn btn-ghost-dark show-all-results-btn" onClick={() => setShowAll(true)}>
          Show all {results.length} results
        </button>
      )}

      {selectedIds.length >= 1 && (
        <div className="comparison-tray-sticky">
          <span>
            {selectedIds.length} mattress{selectedIds.length === 1 ? '' : 'es'} selected
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={selectedIds.length < 2}
            onClick={() => setShowComparison(true)}
          >
            Compare
          </button>
        </div>
      )}

      {showComparison && <ComparisonTable items={selectedItems} onClose={() => setShowComparison(false)} />}
    </>
  );
}
