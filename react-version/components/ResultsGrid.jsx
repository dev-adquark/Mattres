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
  const visible = showAll ? results : tiered;

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

      {results.length > 0 && (
        <section
          aria-label="Your top mattress match"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            padding: '20px clamp(16px, 4vw, 28px)',
            margin: '0 0 28px',
            border: '1px solid var(--slate-200, #e2e8f0)',
            borderRadius: 20,
            background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 75%)',
            boxShadow: '0 8px 28px rgba(15, 23, 42, 0.06)',
          }}
        >
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <p style={{ margin: '0 0 6px', color: '#0f766e', fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Your closest mattress match
            </p>
            <h2 style={{ margin: '0 0 6px', fontSize: 'clamp(19px, 3vw, 25px)', lineHeight: 1.2, color: '#0f172a' }}>
              {results[0].displayTitle}
            </h2>
            <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>
              Based on your answers. Compare the score and fit details below.
            </p>
            <Link href={`/mattress/${results[0].entry.id}`} className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 14 }}>
              See mattress details
            </Link>
          </div>
          <div style={{ flex: '0 0 auto', minWidth: 112, textAlign: 'center', padding: '12px 18px', borderRadius: 16, background: '#ffffff', border: '1px solid #ccfbf1' }}>
            <div style={{ fontSize: 'clamp(34px, 7vw, 46px)', fontWeight: 850, lineHeight: 1, letterSpacing: '-.05em', color: '#0f766e', fontVariantNumeric: 'tabular-nums' }}>
              {results[0].result.overallScore}
              <span style={{ fontSize: 15, fontWeight: 650, letterSpacing: 0, color: '#64748b' }}>/100</span>
            </div>
            <div style={{ marginTop: 7, fontSize: 11, fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>Match score</div>
          </div>
        </section>
      )}

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

      {!showAll && untiered.length > 0 && (
        <button type="button" className="btn btn-ghost-dark show-all-results-btn" onClick={() => setShowAll(true)}>
          Show all results ({untiered.length} more)
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
