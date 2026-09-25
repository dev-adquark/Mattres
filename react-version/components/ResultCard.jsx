'use client';

import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';
import { primaryRetailerLink } from '@/lib/affiliateLinks';
import MattressThumb from './MattressThumb';
import SpotlightCard from './SpotlightCard';

/**
 * Renders one scored mattress. Every value here comes from the API
 * response (real scoreEngine output) - nothing is computed or guessed in
 * this component. Ported from the original project's compare-card
 * template, one field at a time, rather than reconstructed from memory.
 */
export default function ResultCard({ item, index = 0, isBestValue = false, compareChecked, onCompareToggle }) {
  const { entry, result, badge, displayTitle, whyThisMatch, preselect } = item;
  // Capped stagger: a 12-card grid shouldn't push the last card's reveal
  // delay out past what still feels responsive.
  const staggerMs = Math.min(index, 7) * 70;

  return (
    <SpotlightCard
      as="article"
      beam
      onLight
      className="compare-card reveal-up"
      data-mattress-id={entry.id}
      style={{ transitionDelay: `${staggerMs}ms` }}
    >
      <MattressThumb entry={entry} />
      <label className="result-select">
        <input
          type="checkbox"
          className="compare-checkbox"
          checked={compareChecked}
          onChange={() => onCompareToggle(entry.id)}
        />{' '}
        Compare
      </label>
      <span className={`listing-badge ${badge.className}`}>{badge.label}</span>
      {!item.verified && (
        <span
          className="unverified-badge"
          title={
            item.missingFields?.length
              ? `Real brand/model name. Specs, price, and score are placeholder values, not confirmed against the manufacturer or retailer. Also missing: ${item.missingFields.join(', ')}.`
              : 'Real brand/model name. Specs, price, and score are placeholder values, not confirmed against the manufacturer or retailer.'
          }
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
          Specs unverified
        </span>
      )}
      {isBestValue && (
        <span className="value-badge" title="Real lowest price among the results shown">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Best value
        </span>
      )}
      <h3>
        <Link href={`/mattress/${entry.id}`}>{displayTitle}</Link>
      </h3>
      <div className="cc-meta">
        {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)} · <strong>${entry.priceUsd.toLocaleString()}</strong> ·{' '}
        {entry.trialDays}-night trial
      </div>
      <div className="score-hero">
        <span className="score-num">{result.overallScore}</span>
        <span className="score-max">/100</span>
      </div>
      <div className="subscores">
        {CATEGORIES.map((cat) => {
          const val = result.subScores[cat.key];
          return (
            <div className="ss-row" key={cat.key}>
              <span>{cat.label}</span>
              <div className="ss-bar">
                <i style={{ width: `${(val / 10) * 100}%` }} />
              </div>
              <b>{val.toFixed(1)}</b>
            </div>
          );
        })}
      </div>
      <div className="flags">
        {result.riskFlags.length ? (
          result.riskFlags.map((f) => (
            <span className="flag flag-warn" title={f.mitigation} key={f.code}>
              ⚠ {f.rationale}
            </span>
          ))
        ) : (
          <span className="flag flag-ok">✓ No flags for your profile</span>
        )}
      </div>
      {entry.reviewHighlights && entry.reviewHighlights.length > 0 && (
        <div className="highlight">
          <q>{entry.reviewHighlights[0].snippet}</q>
          <div className="hl-tags">
            {entry.reviewHighlights.map((h) => (
              <span className={h.sentiment === 'positive' ? 'tag-pos' : 'tag-neg'} key={h.label}>
                {h.label.toLowerCase()} {h.sentiment === 'positive' ? '✓' : '✕'}
              </span>
            ))}
          </div>
        </div>
      )}
      <details className="why-match">
        <summary>Why this match?</summary>
        <ul>
          {whyThisMatch.length ? (
            whyThisMatch.map((b, i) => <li key={i}>{b}</li>)
          ) : (
            <li>Baseline score for this mattress type; no profile-specific adjustments applied.</li>
          )}
        </ul>
      </details>
      {(() => {
        const retailer = primaryRetailerLink(entry);
        return retailer ? (
          <a href={retailer.href} target="_blank" rel="noopener noreferrer sponsored" className="btn btn-primary cc-cta">
            View at {retailer.retailer}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        ) : (
          <span className="btn btn-ghost-dark cc-cta" style={{ pointerEvents: 'none', opacity: 0.6 }}>
            No retailer on file
          </span>
        );
      })()}
    </SpotlightCard>
  );
}
