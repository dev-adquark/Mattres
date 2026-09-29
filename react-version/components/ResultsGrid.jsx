'use client';

import Link from 'next/link';
import { useState } from 'react';
import AuditBanner from './AuditBanner';
import ResultCard from './ResultCard';
import ComparisonTable from './ComparisonTable';

const MAX_SELECTED = 4;
const TIER_ORDER = ['excellent', 'strong', 'possible'];

export default function ResultsGrid({ results, catalogAudit }) {
  const [selectedIds, setSelectedIds] = useState(() => results.filter((r) => r.preselect).map((r) => r.entry.id));
  const [showComparison, setShowComparison] = useState(false);
  // Results with no tier (overall score under 70) are a real, honest
  // "not really a fit" outcome - hidden by default rather than dressed
  // up in a tier that doesn't apply, but never dropped from the data.
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

  const tiered = results.filter((r) => r.tier);
  const untiered = results.filter((r) => !r.tier);
  // Top-scoring tiered matches first (results are already sorted by real
  // score); everything else - remaining tiered matches and below-70
  // results - is one "Show all" tap away rather than a 20,000px scroll
  // on mobile.
  const INITIAL_VISIBLE = 6;
  const visible = showAll ? results : tiered.slice(0, INITIAL_VISIBLE);
  const hiddenCount = results.length - visible.length;

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
      <p className="score-independence-note on-light" style={{ margin: '0 0 24px', maxWidth: 'none' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 2 3 6v6c0 5.5 3.8 9.7 9 10 5.2-.3 9-4.5 9-10V6Z" />
          <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Scores cannot be bought. Sponsored mattresses can pay for visibility, never for a higher Match Score. See our{' '}
        <Link href="/methodology">methodology</Link>.
      </p>

      {TIER_ORDER.map((tierKey) => {
        const items = visible.filter((r) => r.tier?.key === tierKey);
        if (!items.length) return null;
        return (
          <div key={tierKey}>
            <div className="tier-heading">
              <span className={`tier-badge tier-${tierKey}`}>{items[0].tier.label}</span>
              <span className="tier-count">
                {items.length} · {tierKey === 'excellent' ? '90–100' : tierKey === 'strong' ? '80–89' : '70–79'}
              </span>
            </div>
            <div className="compare-grid" id={tierKey === 'excellent' ? 'matchResultsGrid' : undefined}>
              {items.map((item, i) => renderCard(item, i))}
            </div>
          </div>
        );
      })}

      {showAll && untiered.length > 0 && (
        <div>
          <div className="tier-heading">
            <span className="tier-badge">Below 70</span>
            <span className="tier-count">{untiered.length} · not a strong fit for this profile</span>
          </div>
          <div className="compare-grid">{untiered.map((item, i) => renderCard(item, i))}</div>
        </div>
      )}

      {!showAll && tiered.length > 0 && hiddenCount > 0 && (
        <button type="button" className="btn btn-ghost-dark show-all-results-btn" onClick={() => setShowAll(true)}>
          Show all results ({hiddenCount} more)
        </button>
      )}

      {!tiered.length && !showAll && (
        <p style={{ textAlign: 'center', color: 'var(--slate-600)', fontSize: 13.5 }}>
          No result scored 70 or above for this profile.{' '}
          <button type="button" className="btn btn-ghost-dark show-all-results-btn" onClick={() => setShowAll(true)}>
            Show all results
          </button>
        </p>
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
