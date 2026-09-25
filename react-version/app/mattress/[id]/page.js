import Link from 'next/link';
import { notFound } from 'next/navigation';
import MattressThumb from '@/components/MattressThumb';
import YourRealScoreForThisMattress from '@/components/YourRealScoreForThisMattress';
import { buildRetailerLink } from '@/lib/affiliateLinks';
import catalog from '@/lib/data/mattress-catalog.json';
import { isRecordVerified, missingFields } from '@/lib/dataIntegrity';
import { displayTitle } from '@/lib/matchLogic';

export function generateStaticParams() {
  return catalog.map((entry) => ({ id: entry.id }));
}

function getEntry(id) {
  return catalog.find((e) => e.id === id) || null;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const entry = getEntry(id);
  if (!entry) return { title: 'Mattress not found — Mattress Match Score' };
  return { title: `${displayTitle(entry)} — real score, specs & reviews — Mattress Match Score` };
}

const SENTIMENT_ICON = { positive: '✓', negative: '✕', neutral: '•' };
const CONFIDENCE_LABEL = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' };

export default async function MattressDetailPage({ params }) {
  const { id } = await params;
  const entry = getEntry(id);
  if (!entry) notFound();

  const verified = isRecordVerified(entry);
  const gaps = missingFields(entry);

  return (
    <div>
      <header className="page-hero">
        <div className="aurora-bg" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="wrap">
          <span className="eyebrow">{entry.brand}</span>
          <h1 className="ph-title">{displayTitle(entry)}</h1>
          <p className="ph-sub">
            Real brand and product name. Specs and price below have not been independently verified against{' '}
            {entry.brand} — see the verification note further down this page.
          </p>
        </div>
      </header>

      <section className="section dot-grid-bg">
        <div className="wrap">
          <div className="md-layout">
            <div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ width: 140, flexShrink: 0 }}>
                  <MattressThumb entry={entry} />
                </div>
                <div>
                  <span className={`listing-badge ${verified ? 'badge-top' : 'badge-none'}`}>
                    {verified ? 'Verified' : 'Specs unverified'}
                  </span>
                  <p style={{ fontSize: 13, color: 'var(--slate-600)', marginTop: 8, maxWidth: 420 }}>
                    {verified
                      ? `Confirmed against ${entry.sourceUrl} on ${entry.lastVerified}.`
                      : `No source URL or verification date on file yet${gaps.length ? `, and missing: ${gaps.join(', ')}` : ''}. Treat every number on this page as a placeholder until verification is added.`}
                  </p>
                </div>
              </div>

              <div className="md-spec-grid">
                <div className="md-spec">
                  <b>{entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}</b>
                  <span>Type</span>
                </div>
                <div className="md-spec">
                  <b>
                    {entry.firmnessRange ? `${entry.firmnessRange.min}–${entry.firmnessRange.max}/10` : 'Unknown'}
                  </b>
                  <span>Firmness</span>
                </div>
                <div className="md-spec">
                  <b>{entry.heightIn != null ? `${entry.heightIn}"` : 'Unknown'}</b>
                  <span>Height</span>
                </div>
                <div className="md-spec">
                  <b>${entry.priceUsd?.toLocaleString() ?? 'Unknown'}</b>
                  <span>Price</span>
                </div>
                <div className="md-spec">
                  <b>{entry.trialDays != null ? `${entry.trialDays} nights` : 'Unknown'}</b>
                  <span>Trial period</span>
                </div>
                <div className="md-spec">
                  <b>{entry.warrantyLifetime ? 'Lifetime' : entry.warrantyYears != null ? `${entry.warrantyYears} yr` : 'Unknown'}</b>
                  <span>Warranty</span>
                </div>
              </div>

              <h2 style={{ fontSize: 20, margin: '32px 0 14px' }}>Review highlights</h2>
              {entry.reviewHighlights?.length ? (
                entry.reviewHighlights.map((h) => (
                  <div className="md-review-card" key={h.tag}>
                    <span>
                      {SENTIMENT_ICON[h.sentiment] || '•'} <strong>{h.label}</strong>
                      <span className={`conf conf-${h.confidence}`}>{CONFIDENCE_LABEL[h.confidence] || h.confidence}</span>
                    </span>
                    <p>&ldquo;{h.snippet}&rdquo;</p>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: 13.5, color: 'var(--slate-600)' }}>No review highlights on file for this mattress yet.</p>
              )}
            </div>

            <div>
              <YourRealScoreForThisMattress mattressId={entry.id} />

              <div className="md-side-card">
                <h5>Where to buy</h5>
                {entry.retailPartners?.map((r) => (
                  <div className="md-retailer-row" key={r}>
                    <span style={{ fontSize: 13.5 }}>{r}</span>
                    <a href={buildRetailerLink(entry.id, r)} target="_blank" rel="noopener noreferrer sponsored" className="btn btn-ghost-dark" style={{ padding: '6px 12px', fontSize: 12.5 }}>
                      View
                    </a>
                  </div>
                ))}
                <p style={{ fontSize: 11, color: 'var(--slate-600)', marginTop: 12 }}>
                  Retailer names shown are generic placeholders — this project has no real retailer or affiliate
                  accounts yet. Outbound links carry real UTM tracking parameters as a working example of the
                  mechanism. See our <Link href="/disclosures">disclosures</Link>.
                </p>
              </div>

              <div className="md-side-card">
                <h5>Compare this mattress</h5>
                <p style={{ fontSize: 13, color: 'var(--slate-600)', marginBottom: 12 }}>
                  See how {displayTitle(entry)} stacks up against other real brands for your own sleep profile.
                </p>
                <Link href="/compare" className="btn btn-ghost-dark" style={{ width: '100%', justifyContent: 'center' }}>
                  Open comparisons
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
