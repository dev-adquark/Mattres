'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import AmbientParticles from '@/components/AmbientParticles';
import BrandCarouselRow from '@/components/BrandCarouselRow';
import HomeShowMore from '@/components/HomeShowMore';
import HowItWorks from '@/components/HowItWorks';
import Hero from '@/components/Hero';
import MatchedMattressPanel from '@/components/MatchedMattressPanel';
import MattressUniverseScene from '@/components/MattressUniverseScene';
import NumberTicker from '@/components/NumberTicker';
import ScoreCoreScene from '@/components/ScoreCoreScene';
import ScoreMetrics from '@/components/ScoreMetrics';
import SixDimensionGallery from '@/components/SixDimensionGallery';
import { auditCatalog } from '@/lib/dataIntegrity';
import { formatPrice } from '@/lib/format';
import { useLastResult } from '@/lib/useLastResult';

const RING_RADIUS = 86;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Real review-highlight quotes pulled from the actual catalog - each one
 * a real snippet already attached to a real, named catalog entry, not an
 * invented customer testimonial. Section 6 is still titled "Testimonials"
 * (the required homepage section name), but its own copy is explicit
 * that these are sourced review snippets, not something written here.
 */
function pickRealReviewQuotes(catalog) {
  return catalog
    .filter((entry) => entry.reviewHighlights?.some((h) => h.sentiment === 'positive'))
    .slice(0, 3)
    .map((entry) => ({ entry, highlight: entry.reviewHighlights.find((h) => h.sentiment === 'positive') }));
}

/**
 * A static, illustrative two-mattress comparison built from two real
 * catalog entries (lowest/highest priced, picked deterministically -
 * never a fabricated pair), highlighting only genuinely comparable
 * values. A teaser for the real /compare tool, not the tool itself.
 */
function ComparisonPreviewTeaser({ catalog }) {
  const priced = catalog.filter((e) => typeof e.priceUsd === 'number').slice().sort((a, b) => a.priceUsd - b.priceUsd);
  if (priced.length < 2) return null;
  const a = priced[0];
  const b = priced[priced.length - 1];
  const rows = [
    { label: 'Type', av: a.type, bv: b.type, comparable: false },
    { label: 'Price', av: formatPrice(a), bv: formatPrice(b), comparable: true, aWins: a.priceUsd < b.priceUsd },
    { label: 'Trial period', av: `${a.trialDays ?? '—'} nights`, bv: `${b.trialDays ?? '—'} nights`, comparable: typeof a.trialDays === 'number' && typeof b.trialDays === 'number', aWins: (a.trialDays ?? -1) > (b.trialDays ?? -1) },
  ];
  return (
    <div className="cmp-teaser">
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
 * Homepage - exactly seven sections, per the project's information
 * architecture: Hero / How It Works / Interactive Result Preview / Why
 * Trust the Score / Comparison Preview / Testimonials / Final CTA.
 * Everything else (promo clusters, category grids, brand collab slots,
 * FAQ) has its own dedicated page/section elsewhere and doesn't need a
 * homepage copy too - kept deliberately short rather than turning into
 * a second catalog or documentation page.
 */
export default function HomeClient({ catalog, heroExamples }) {
  const router = useRouter();
  const { payload, hydrated } = useLastResult();
  const top = payload?.top ?? null;
  const overallScore = top ? top.result.overallScore : null;
  const ringOffset = overallScore != null ? RING_CIRCUMFERENCE * (1 - overallScore / 100) : RING_CIRCUMFERENCE;
  const ringGlow = overallScore != null ? 0.15 + (overallScore / 100) * 0.4 : 0;
  const brandCount = new Set(catalog.map((m) => m.brand)).size;
  const audit = useMemo(() => auditCatalog(catalog), [catalog]);
  const reviewQuotes = useMemo(() => pickRealReviewQuotes(catalog), [catalog]);

  // X-Ray isn't on the homepage (it lives on each mattress's own detail
  // page, where it has real per-product context) - a dimension click
  // here sends the visitor to their matched mattress's own X-Ray
  // section instead, or to the quiz if no match exists yet.
  function handleDimensionClick() {
    if (top) router.push(`/mattress/${top.entry.id}#construction`);
    else router.push('/find-match');
  }

  return (
    <main className="home-short">
      <Hero catalogCount={catalog.length} brandCount={brandCount} heroExamples={heroExamples} />

      <HomeShowMore>
      <section className="home-simple-section home-how-section" aria-labelledby="home-how-title">
        <div className="wrap">
          <div className="home-section-intro">
            <span className="eyebrow-dark">Simple by design</span>
            <h2 id="home-how-title">Your mattress, without the guesswork.</h2>
            <p>Tell us how you sleep. We compare real mattresses against what matters to you.</p>
          </div>
          <HowItWorks />
          <div className="home-centered-action">
            <Link href="/find-match" className="btn btn-primary">Find My Mattress <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      <section className="section universe-section dot-grid-bg on-dark" id="universe">
        <AmbientParticles className="ambient-canvas" />
        <div className="float-orb" style={{ width: 300, height: 300, left: '-4%', top: '10%', background: 'var(--electric-500)' }} aria-hidden="true" />
        <div className="float-orb" style={{ width: 260, height: 260, right: '-3%', bottom: '5%', background: 'var(--violet-500)', animationDelay: '-8s' }} aria-hidden="true" />
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow-dark" style={{ color: 'var(--cyan-400)' }}>Interactive result preview</span>
            <h2 className="section-h2" style={{ color: 'var(--ink)' }}>Every mattress we score, in one view</h2>
            <p style={{ color: 'var(--ink-dim)' }}>
              Each node below is a real mattress in our catalog, color-grouped by type (foam / hybrid / innerspring).
              The larger, glowing node in the center is your top match once you&apos;ve taken the quiz.{' '}
              <strong>Click any node</strong> to see that mattress&apos;s real score and price.
            </p>
            <div className="universe-legend" aria-hidden="true">
              <span className="universe-legend-item"><i className="ul-dot ul-foam" />Foam</span>
              <span className="universe-legend-item"><i className="ul-dot ul-hybrid" />Hybrid</span>
              <span className="universe-legend-item"><i className="ul-dot ul-innerspring" />Innerspring</span>
              <span className="universe-legend-item universe-legend-center"><i className="ul-dot ul-center" />Your top match</span>
            </div>
          </div>
          <div className="universe-wrap">
            {hydrated && (
              <MattressUniverseScene
                catalog={catalog}
                initialHighlightId={top ? top.entry.id : catalog[0].id}
                payload={payload}
              />
            )}
          </div>
        </div>
      </section>

      <section className="section match-score-section dot-grid-bg on-dark" id="match-score">
        <AmbientParticles className="ambient-canvas" />
        <div className="wrap match-score-grid">
          <div className="score-ring-wrap">
            <span className="eyebrow-dark" style={{ color: 'var(--cyan-400)' }}>Why trust the score</span>
            <h2 className="section-h2" style={{ color: 'var(--ink)', marginBottom: 14 }}>Six real dimensions, never a guess</h2>
            <div className="score-core-wrap">
              <ScoreCoreScene />
              <div className="score-ring-visual" style={{ '--ring-glow': ringGlow }}>
                <svg viewBox="0 0 200 200" className="score-ring-svg">
                  <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3fd4ff" />
                      <stop offset="100%" stopColor="#3b6cf6" />
                    </linearGradient>
                  </defs>
                  <circle cx="100" cy="100" r={RING_RADIUS} className="ring-track" />
                  <circle
                    cx="100"
                    cy="100"
                    r={RING_RADIUS}
                    className="ring-progress"
                    style={{
                      strokeDasharray: RING_CIRCUMFERENCE,
                      strokeDashoffset: ringOffset,
                      transition: 'stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)',
                    }}
                  />
                </svg>
                <div className="score-ring-center">
                  <span className="score-ring-num">
                    <NumberTicker value={overallScore} />
                  </span>
                  <span className="score-ring-label">
                    {top ? `MATCH · ${top.entry.brand.toUpperCase()}` : 'TAKE THE QUIZ'}
                  </span>
                </div>
              </div>
            </div>
            {top ? (
              <p className="score-ring-note">
                Your top match is the {top.displayTitle}, scored {top.result.overallScore}/100 with model{' '}
                {top.result.modelVersion}.
              </p>
            ) : (
              <p className="score-ring-note">
                Based on 6 real scoring dimensions, computed live from your answers — no fake numbers.{' '}
                <Link href="/find-match" style={{ color: 'var(--teal-400)', fontWeight: 600 }}>Take the quiz</Link> to see yours.
              </p>
            )}
            <div className="score-independence-note">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 2 3 6v6c0 5.5 3.8 9.7 9 10 5.2-.3 9-4.5 9-10V6Z" />
                <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Scores cannot be bought. Sponsored mattresses can pay for visibility, never for a higher Match Score.{' '}
              <Link href="/methodology">How scoring works</Link>
            </div>
          </div>

          <ScoreMetrics subScores={top ? top.result.subScores : null} onDimensionClick={handleDimensionClick} />
        </div>

        <div className="wrap">
          <div className="dv-head">
            <span className="eyebrow-dark" style={{ color: 'var(--cyan-400)' }}>The six dimensions, visualized</span>
            <p style={{ color: 'var(--ink-dim)', maxWidth: 560 }}>
              Each dimension gets its own read on your top match — brightness and motion scale with the real
              sub-score, not a fixed animation. {audit.verifiedCount} of {audit.total} catalog entries are
              independently verified today.
            </p>
          </div>
          <SixDimensionGallery subScores={top ? top.result.subScores : null} />
        </div>

        <div className="wrap" style={{ marginTop: 56 }}>
          <MatchedMattressPanel top={top} />
        </div>
      </section>

      <section className="home-simple-section" aria-labelledby="home-compare-title">
        <div className="wrap">
          <div className="home-section-intro">
            <span className="eyebrow-dark">Comparison preview</span>
            <h2 id="home-compare-title" className="section-h2">See exactly where mattresses differ</h2>
            <p>Select any two or more results and we highlight the real differences — score, price, and each of the six dimensions — instead of repeating what&apos;s identical.</p>
          </div>
          <ComparisonPreviewTeaser catalog={catalog} />
          <div className="home-centered-action">
            <Link href="/compare" className="btn btn-ghost-dark">Compare mattresses <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      <section className="home-simple-section" aria-labelledby="home-testimonials-title">
        <div className="wrap">
          <div className="home-section-intro">
            <span className="eyebrow-dark">Testimonials</span>
            <h2 id="home-testimonials-title" className="section-h2">From sources we cite, not sales copy</h2>
            <p>Every quote below is a real, sourced review snippet already attached to a real catalog entry — not a customer testimonial written for this page. See each mattress&apos;s page for its full source list.</p>
          </div>
          <div className="review-quote-grid">
            {reviewQuotes.map(({ entry, highlight }) => (
              <Link href={`/mattress/${entry.id}`} className="review-quote-card" key={entry.id}>
                <q>{highlight.snippet}</q>
                <div className="rq-meta">
                  <b className="cc-title-row">{entry.brand} {entry.model}</b>
                  <span className={`conf conf-${highlight.confidence}`}>{highlight.confidence} confidence</span>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 32 }}>
            <BrandCarouselRow />
          </div>
        </div>
      </section>

      <section className="home-final-cta" aria-labelledby="home-final-title">
        <div className="wrap">
          <span className="eyebrow-dark">Better sleep starts here</span>
          <h2 id="home-final-title">Find the mattress that fits your sleep.</h2>
          <p>A free, quick quiz. Personalized scores. No signup required.</p>
          <Link href="/find-match" className="btn btn-primary">Find My Mattress <span aria-hidden="true">→</span></Link>
        </div>
      </section>
      </HomeShowMore>

      <div className="mobile-sticky-cta">
        <Link href="/find-match" className="btn btn-primary">Find My Mattress <span aria-hidden="true">→</span></Link>
      </div>
    </main>
  );
}
