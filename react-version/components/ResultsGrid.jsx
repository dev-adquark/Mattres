'use client';

import { useState } from 'react';
import ResultCard from './ResultCard';
import ComparisonTable from './ComparisonTable';

const MAX_SELECTED = 4;

export default function ResultsGrid({ results }) {
  const [selectedIds, setSelectedIds] = useState(() => results.filter((r) => r.preselect).map((r) => r.entry.id));
  const [showComparison, setShowComparison] = useState(false);

  function toggleCompare(id) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTED) return prev; // at cap - ignored, same as the original's disabled-checkbox behavior
      return [...prev, id];
    });
  }

  const selectedItems = selectedIds.map((id) => results.find((r) => r.entry.id === id)).filter(Boolean);

  return (
    <>
      <div className="results-header">
        <div>
          <div className="chips">
            <span className="chip">{results.length} matches</span>
          </div>
        </div>
        <div className="comparison-tray">
          <span>Comparing {selectedIds.length} selected</span>
          <button
            type="button"
            className="btn btn-ghost-dark"
            disabled={selectedIds.length < 2}
            onClick={() => setShowComparison(true)}
          >
            Compare selected
          </button>
        </div>
      </div>

      <div className="compare-grid" id="matchResultsGrid">
        {results.map((item, i) => (
          <ResultCard
            key={item.entry.id}
            item={item}
            index={i}
            compareChecked={selectedIds.includes(item.entry.id)}
            onCompareToggle={toggleCompare}
          />
        ))}
      </div>

      {showComparison && <ComparisonTable items={selectedItems} onClose={() => setShowComparison(false)} />}
    </>
  );
}
