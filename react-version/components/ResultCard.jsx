'use client';

import { CATEGORIES } from '@/lib/categories';
import MattressThumb from './MattressThumb';

/**
 * Renders one scored mattress. Every value here comes from the API
 * response (real scoreEngine output) - nothing is computed or guessed in
 * this component. Ported from the original project's compare-card
 * template, one field at a time, rather than reconstructed from memory.
 */
export default function ResultCard({ item, compareChecked, onCompareToggle }) {
  const { entry, result, badge, displayTitle, whyThisMatch, preselect } = item;

  return (
    <article className="compare-card" data-mattress-id={entry.id}>
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
      <h3>{displayTitle}</h3>
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
      <a href="/disclosures" className="btn btn-primary cc-cta">
        View at retailer
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </a>
    </article>
  );
}
