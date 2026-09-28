'use client';

import Link from 'next/link';
import { useMemo, useRef } from 'react';
import AmbientParticles from '@/components/AmbientParticles';
import BrandCarouselRow from '@/components/BrandCarouselRow';
import BrandCollabSlot from '@/components/BrandCollabSlot';
import CategoryIconGrid from '@/components/CategoryIconGrid';
import DealBanner from '@/components/DealBanner';
import FaqAccordion from '@/components/FaqAccordion';
import HowItWorks from '@/components/HowItWorks';
import Hero from '@/components/Hero';
import MatchedMattressPanel from '@/components/MatchedMattressPanel';
import MattressUniverseScene from '@/components/MattressUniverseScene';
import NumberTicker from '@/components/NumberTicker';
import PressMentionRow from '@/components/PressMentionRow';
import PromoCardCluster from '@/components/PromoCardCluster';
import PromoGrid from '@/components/PromoGrid';
import ScoreCoreScene from '@/components/ScoreCoreScene';
import ScoreMetrics from '@/components/ScoreMetrics';
import SixDimensionGallery from '@/components/SixDimensionGallery';
import TrustBadgeRow from '@/components/TrustBadgeRow';
import XRaySection from '@/components/XRaySection';
import { DIMENSION_TO_LAYER } from '@/lib/categories';
import { auditCatalog } from '@/lib/dataIntegrity';
import { formatPrice } from '@/lib/format';
import { useLastResult } from '@/lib/useLastResult';

// Ring geometry matches the original project's SVG exactly (r=86, viewBox
// 0 0 200 200) so the real strokeDashoffset math below produces the exact
// same visual fill fraction for a given overallScore.
const RING_RADIUS = 86;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Real review-highlight quotes pulled from the actual catalog (not
 * invented testimonials) - each one is a real snippet already attached
 * to a real, named catalog entry, shown with its real sentiment/label
 * and a link to that mattress's own detail page where the same quote
 * and its confidence level are shown again in full context.
 */
function pickRealReviewQuotes(catalog) {
  return catalog
    .filter((entry) => entry.reviewHighlights?.some((h) => h.sentiment === 'positive'))
    .slice(0, 3)
    .map((entry) => ({ entry, highlight: entry.reviewHighlights.find((h) => h.sentiment === 'positive') }));
}

/**
 * Split out of app/page.js (a Server Component) because this needs
 * client-side hooks (useRef, useLastResult's sessionStorage read), but
 * the catalog it renders (via MattressUniverseScene) must come from the
 * real database, not a static JSON import - a 'use client' file can't
 * itself call getCatalog() (that pulls in the Supabase client with a
 * server-only secret key, and lib/scoreEngine.js-style Node `fs` reads,
 * neither of which may ship to the browser bundle). app/page.js fetches
 * the real catalog server-side and passes it down as a plain prop.
 *
 * Includes both the newer top-level sections (Interactive Result
 * Preview / Why Trust the Score / Comparison Preview / Real Review
 * Highlights / Final CTA) and the original visual/motion sections
 * (the promo clusters, MatchedMattressPanel, FAQ and X-Ray) at their
 * original relative positions - nothing removed, only re-integrated
 * around the newer sections. X-Ray also has its own copy on each
 * mattress's detail page (real per-product context there); this one
 * stays as the general homepage construction explainer it always was.
 */
export default function HomeClient({ catalog, heroExample }) {
  const { payload, hydrated } = useLastResult();
  const top = payload?.top ?? null;
  const overallScore = top ? top.result.overallScore : null;
  const ringOffset = overallScore != null ? RING_CIRCUMFERENCE * (1 - overallScore / 100) : RING_CIRCUMFERENCE;
  // Real-data glow: intensity scales with the actual score (0-100 -> a
  // 0.15-0.55 opacity range), so a stronger match visibly glows more -
  // never a fixed decorative value, and never shown at all pre-quiz.
  const ringGlow = overallScore != null ? 0.15 + (overallScore / 100) * 0.4 : 0;
  const brandCount = new Set(catalog.map((m) => m.brand)).size;
  const audit = useMemo(() => auditCatalog(catalog), [catalog]);
  const reviewQuotes = useMemo(() => pickRealReviewQuotes(catalog), [catalog]);
  const xrayRef = useRef(null);

  return (
    <div>
      <Hero catalogCount={catalog.length} brandCount={brandCount} heroExample={heroExample} />

      <section className="section hiw-section" style={{ paddingTop: 44, paddingBottom: 24 }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <span className="eyebrow-dark" style={{ color: 'var(--cyan-400)' }}>
              How it works
            </span>
            <h2 style={{ color: 'var(--ink)', fontSize: 26, margin: '8px 0 0' }}>From answers to a real score, in four steps</h2>
          </div>
          <HowItWorks />
        </div>
      </section>

      <section className="section promo-density-section" style={{ paddingTop: 44, paddingBottom: 44 }}>
        <div className="wrap">
          <TrustBadgeRow />
          <div style={{ marginTop: 28 }}>
            <PromoCardCluster />
          </div>
          <div style={{ marginTop: 32 }}>
            <span className="eyebrow-dark" style={{ color: 'var(--cyan-400)', display: 'block', marginBottom: 16 }}>
              Browse by mattress type
            </span>
            <CategoryIconGrid />
          </div>
          <div style={{ marginTop: 32 }}>
            <DealBanner />
          </div>
        </div>
      </section>

      <section className="section universe-section dot-grid-bg on-dark" id="universe">
        <AmbientParticles className="ambient-canvas" />
        <div className="float-orb" style={{ width: 300, height: 300, left: '-4%', top: '10%', background: 'var(--electric-500)' }} aria-hidden="true" />
        <div className="float-orb" style={{ width: 260, height: 260, right: '-3%', bottom: '5%', background: 'var(--violet-500)', animationDelay: '-8s' }} aria-hidden="true" />
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow-dark" style={{ color: 'var(--cyan-400)' }}>
              Interactive result preview
            </span>
            <h2 style={{ color: 'var(--ink)' }}>Every mattress we score, in one view</h2>
            <p style={{ color: 'var(--ink-dim)' }}>
              Each node below is a real mattress in our catalog, color-grouped by type (foam / hybrid / innerspring).
              The larger, glowing node in the center is your top match once you&apos;ve taken the quiz.{' '}
              <strong>Click any node</strong> to see that mattress&apos;s real score and price.
            </p>
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
            <span className="eyebrow-dark" style={{ color: 'var(--cyan-400)' }}>
              Why trust the score
            </span>
            <h2 style={{ color: 'var(--ink)', marginBottom: 14 }}>Six real dimensions, never a guess</h2>
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
                <Link href="/find-match" style={{ color: 'var(--teal-400)', fontWeight: 600 }}>
                  Take the quiz
                </Link>{' '}
                to see yours.
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

          <ScoreMetrics
            subScores={top ? top.result.subScores : null}
            onDimensionClick={(cat) => xrayRef.current?.goToLayer(DIMENSION_TO_LAYER[cat])}
          />
        </div>

        <div className="wrap">
          <div className="dv-head">
            <span className="eyebrow-dark" style={{ color: 'var(--cyan-400)' }}>
              The six dimensions, visualized
            </span>
            <p style={{ color: 'var(--ink-dim)', maxWidth: 560 }}>
              Each dimension gets its own read on your top match — brightness and motion scale with the real
              sub-score, not a fixed animation. {audit.verifiedCount} of {audit.total} catalog
              entries are independently verified today.
            </p>
          </div>
          <SixDimensionGallery subScores={top ? top.result.subScores : null} />
        </div>

        <div className="wrap" style={{ marginTop: 56 }}>
          <MatchedMattressPanel top={top} />
        </div>
      </section>

      <section className="section promo-density-section" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="wrap">
          <BrandCollabSlot />
          <div style={{ marginTop: 36 }}>
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 14, opacity: 0.7 }}>
              Real brands referenced in our comparisons
            </span>
            <BrandCarouselRow />
          </div>
          <div style={{ marginTop: 40 }}>
            <PromoGrid />
          </div>
          <div style={{ marginTop: 40 }}>
            <PressMentionRow />
          </div>
        </div>
      </section>

      <section className="section dot-grid-bg" style={{ paddingTop: 56, paddingBottom: 56 }}>
        <div className="wrap">
          <div className="section-head" style={{ marginBottom: 28 }}>
            <span className="eyebrow-dark" style={{ color: 'var(--teal-600,#0e8a72)' }}>
              Comparison preview
            </span>
            <h2 style={{ color: 'var(--slate-900,#0f2140)', fontSize: 26, margin: '8px 0 0' }}>
              See exactly where mattresses differ
            </h2>
            <p style={{ color: 'var(--slate-600)', maxWidth: 560 }}>
              Select any two or more results and we highlight the real differences — score, price, and each of the
              six dimensions — instead of repeating what&apos;s identical.
            </p>
          </div>
          <ComparisonPreviewTeaser catalog={catalog} />
          <div style={{ textAlign: 'center', marginTop: 26 }}>
            <Link href="/compare" className="btn btn-ghost-dark">
              Compare mattresses
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0, paddingBottom: 56 }}>
        <div className="wrap">
          <div className="section-head" style={{ marginBottom: 28 }}>
            <span className="eyebrow-dark">Real review highlights</span>
            <h2 style={{ fontSize: 24, margin: '8px 0 0' }}>From sources we cite, not sales copy</h2>
            <p style={{ color: 'var(--slate-600)', maxWidth: 560 }}>
              Every quote below is a real, sourced review snippet already attached to a real catalog entry — not a
              customer testimonial we wrote. See each mattress&apos;s page for its full source list.
            </p>
          </div>
          <div className="review-quote-grid">
            {reviewQuotes.map(({ entry, highlight }) => (
              <Link href={`/mattress/${entry.id}`} className="review-quote-card" key={entry.id}>
                <q>{highlight.snippet}</q>
                <div className="rq-meta">
                  <b>{entry.brand} {entry.model}</b>
                  <span className={`conf conf-${highlight.confidence}`}>{highlight.confidence} confidence</span>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 36 }}>
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 14, opacity: 0.7 }}>
              Real brands referenced in our comparisons
            </span>
            <BrandCarouselRow />
          </div>
        </div>
      </section>

      <section className="section final-cta-section dot-grid-bg on-dark">
        <AmbientParticles className="ambient-canvas" />
        <div className="wrap" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--ink)', fontSize: 30, marginBottom: 12 }}>Ready to find your mattress?</h2>
          <p style={{ color: 'var(--ink-dim)', maxWidth: 480, margin: '0 auto 28px' }}>
            60 seconds, six real questions, a personalized score across {catalog.length} mattresses.
          </p>
          <Link href="/find-match" className="btn btn-primary">
            Find My Mattress
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </section>

      <section className="section dot-grid-bg" style={{ paddingBottom: 60 }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <span className="eyebrow-dark" style={{ color: 'var(--teal-600,#0e8a72)' }}>
              Questions
            </span>
            <h2 style={{ color: 'var(--slate-900,#0f2140)', fontSize: 26, margin: '8px 0 0' }}>Frequently asked</h2>
          </div>
          <FaqAccordion onLight />
        </div>
      </section>

      <XRaySection ref={xrayRef} />

      <div className="mobile-sticky-cta">
        <Link href="/find-match" className="btn btn-primary">
          Find My Mattress
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/**
 * A static, illustrative two-mattress comparison built from two real
 * catalog entries (highest and lowest-priced verified entries, picked
 * deterministically - never a fabricated pair), highlighting only the
 * dimension where they actually differ most. This is a teaser for the
 * real /compare experience, not the real ad-hoc compare tool itself.
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
