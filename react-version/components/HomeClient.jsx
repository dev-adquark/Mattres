'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import BrandCarouselRow from '@/components/BrandCarouselRow';
import HowItWorks from '@/components/HowItWorks';
import Hero from '@/components/Hero';
import InteractiveResultPreview from '@/components/InteractiveResultPreview';
import { CATEGORIES, CATEGORY_BLURB } from '@/lib/categories';
import { formatPrice } from '@/lib/format';

/**
 * Real review-highlight quotes pulled from the actual catalog (not
 * invented testimonials) - each one is a real snippet already attached
 * to a real, named catalog entry, shown with its real sentiment/label
 * and a link to that mattress's own detail page where the same quote is
 * shown again in full context.
 */
function pickRealReviewQuotes(catalog) {
  return catalog
    .filter((entry) => entry.reviewHighlights?.some((h) => h.sentiment === 'positive'))
    .slice(0, 3)
    .map((entry) => ({ entry, highlight: entry.reviewHighlights.find((h) => h.sentiment === 'positive') }));
}

/**
 * A static, illustrative two-mattress comparison built from two real
 * catalog entries (lowest and highest-priced, picked deterministically -
 * never a fabricated pair), highlighting only where they actually
 * differ. A teaser for the real /compare experience, not the real
 * ad-hoc compare tool itself.
 */
function ComparisonPreviewTeaser({ catalog }) {
  const priced = catalog.filter((e) => typeof e.priceUsd === 'number').slice().sort((a, b) => a.priceUsd - b.priceUsd);
  if (priced.length < 2) return null;
  const a = priced[0];
  const b = priced[priced.length - 1];
  const rows = [
    { label: 'Type', av: a.type, bv: b.type, comparable: false },
    { label: 'Price', av: formatPrice(a), bv: formatPrice(b), comparable: true, aWins: a.priceUsd < b.priceUsd },
    {
      label: 'Trial period',
      av: `${a.trialDays ?? '—'} nights`,
      bv: `${b.trialDays ?? '—'} nights`,
      comparable: typeof a.trialDays === 'number' && typeof b.trialDays === 'number',
      aWins: (a.trialDays ?? -1) > (b.trialDays ?? -1),
    },
  ];
  return (
    <div className="cmp-teaser reveal-up">
      <div className="cmp-teaser-head">
        <span>{a.brand} {a.model}</span>
        <span className="cmp-teaser-vs">vs</span>
        <span>{b.brand} {b.model}</span>
      </div>
      {rows.map((r) => (
        <div className="cmp-teaser-row" key={r.label}>
          <span className={r.comparable && r.aWins ? 'cmp-win' : ''}>{r.av}</span>
          <span className="cmp-teaser-label">{r.label}</span>
          <span className={r.comparable && !r.aWins ? 'cmp-win' : ''}>{r.bv}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Exactly seven top-level sections, per the funnel this homepage is
 * built around: Hero / How It Works / Interactive Result Preview / Why
 * Trust the Score / Comparison Preview / Testimonials / Final CTA.
 * Everything else (promo clusters, brand/category browse grids, the
 * X-Ray construction explainer, FAQ) lives on its own dedicated page
 * instead of competing for attention in this funnel.
 */
export default function HomeClient({ catalog, heroExample, previewExamples = [] }) {
  const brandCount = new Set(catalog.map((m) => m.brand)).size;
  const reviewQuotes = useMemo(() => pickRealReviewQuotes(catalog), [catalog]);

  return (
    <main className="home-short">
      <Hero catalogCount={catalog.length} brandCount={brandCount} heroExample={heroExample} />

      <section className="section home-simple-section" aria-labelledby="home-how-title">
        <div className="wrap">
          <div className="home-section-intro">
            <span className="eyebrow-dark">How it works</span>
            <h2 id="home-how-title">From answers to a real score, in four steps.</h2>
          </div>
          <HowItWorks />
        </div>
      </section>

      <section className="section home-simple-section" aria-labelledby="home-preview-title">
        <div className="wrap">
          <div className="home-section-intro">
            <span className="eyebrow-dark">Interactive result preview</span>
            <h2 id="home-preview-title">See how the score changes with you.</h2>
            <p>Pick a sample sleep profile below and watch a real match update instantly - no quiz required yet.</p>
          </div>
          <InteractiveResultPreview examples={previewExamples} />
        </div>
      </section>

      <section className="section home-simple-section home-trust-score-section" aria-labelledby="home-trust-score-title">
        <div className="wrap">
          <div className="home-section-intro">
            <span className="eyebrow-dark">Why trust the score</span>
            <h2 id="home-trust-score-title">Six real dimensions, never a guess.</h2>
          </div>
          <div className="dimension-grid">
            {CATEGORIES.map((cat) => (
              <div className="dimension-card reveal-up" key={cat.key}>
                <h3>{cat.label}</h3>
                <p>{CATEGORY_BLURB[cat.key]}</p>
              </div>
            ))}
          </div>
          <p className="score-independence-note on-light">
            Scores can&apos;t be bought. Sponsored mattresses can pay for visibility, never for a higher Match Score.{' '}
            <Link href="/disclosures">How this works →</Link>
          </p>
        </div>
      </section>

      <section className="section home-simple-section" aria-labelledby="home-compare-title">
        <div className="wrap">
          <div className="home-section-intro">
            <span className="eyebrow-dark">Comparison preview</span>
            <h2 id="home-compare-title">See exactly where mattresses differ.</h2>
            <p>Select any two or more results and we highlight the real differences - never what&apos;s identical.</p>
          </div>
          <ComparisonPreviewTeaser catalog={catalog} />
          <div className="home-centered-action">
            <Link href="/compare" className="btn btn-ghost-dark">
              Compare mattresses <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section home-simple-section" aria-labelledby="home-testimonials-title">
        <div className="wrap">
          <div className="home-section-intro">
            <span className="eyebrow-dark">Testimonials</span>
            <h2 id="home-testimonials-title">From sources we cite, not sales copy.</h2>
            <p>Every quote below is a real, sourced review snippet attached to a real catalog entry - see each mattress&apos;s page for its full source list.</p>
          </div>
          {reviewQuotes.length > 0 && (
            <div className="review-quote-grid">
              {reviewQuotes.map(({ entry, highlight }) => (
                <Link href={`/mattress/${entry.id}`} className="review-quote-card reveal-up" key={entry.id}>
                  <q>{highlight.snippet}</q>
                  <div className="rq-meta">
                    <b>{entry.brand} {entry.model}</b>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div style={{ marginTop: 36 }}>
            <BrandCarouselRow onLight />
          </div>
        </div>
      </section>

      <section className="home-final-cta" aria-labelledby="home-final-title">
        <div className="wrap">
          <h2 id="home-final-title">Ready to find your mattress?</h2>
          <p>60 seconds, six real questions, a personalized score across {catalog.length} mattresses.</p>
          <Link href="/find-match" className="btn btn-primary">Find My Mattress <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <div className="mobile-sticky-cta">
        <Link href="/find-match" className="btn btn-primary">Find My Mattress <span aria-hidden="true">→</span></Link>
      </div>
    </main>
  );
}
