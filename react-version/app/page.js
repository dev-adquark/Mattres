'use client';

import Link from 'next/link';
import { useRef } from 'react';
import AmbientParticles from '@/components/AmbientParticles';
import BrandCollabSlot from '@/components/BrandCollabSlot';
import BrandMarquee from '@/components/BrandMarquee';
import Hero from '@/components/Hero';
import MatchedMattressPanel from '@/components/MatchedMattressPanel';
import MattressUniverseScene from '@/components/MattressUniverseScene';
import NumberTicker from '@/components/NumberTicker';
import ScoreCoreScene from '@/components/ScoreCoreScene';
import ScoreMetrics from '@/components/ScoreMetrics';
import SixDimensionGallery from '@/components/SixDimensionGallery';
import SpotlightCard from '@/components/SpotlightCard';
import XRaySection from '@/components/XRaySection';
import catalog from '@/lib/data/mattress-catalog.json';
import { DIMENSION_TO_LAYER } from '@/lib/categories';
import { useLastResult } from '@/lib/useLastResult';

// Ring geometry matches the original project's SVG exactly (r=86, viewBox
// 0 0 200 200) so the real strokeDashoffset math below produces the exact
// same visual fill fraction for a given overallScore.
const RING_RADIUS = 86;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function HomePage() {
  const { payload, hydrated } = useLastResult();
  const top = payload?.top ?? null;
  const overallScore = top ? top.result.overallScore : null;
  const ringOffset = overallScore != null ? RING_CIRCUMFERENCE * (1 - overallScore / 100) : RING_CIRCUMFERENCE;
  // Real-data glow: intensity scales with the actual score (0-100 -> a
  // 0.15-0.55 opacity range), so a stronger match visibly glows more -
  // never a fixed decorative value, and never shown at all pre-quiz.
  const ringGlow = overallScore != null ? 0.15 + (overallScore / 100) * 0.4 : 0;
  const xrayRef = useRef(null);

  return (
    <div>
      <Hero />

      <section className="section universe-section" id="universe">
        <AmbientParticles className="ambient-canvas" />
        <div className="float-orb" style={{ width: 300, height: 300, left: '-4%', top: '10%', background: 'var(--electric-500)' }} aria-hidden="true" />
        <div className="float-orb" style={{ width: 260, height: 260, right: '-3%', bottom: '5%', background: 'var(--violet-500)', animationDelay: '-8s' }} aria-hidden="true" />
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow-dark" style={{ color: 'var(--cyan-400)' }}>
              Personalized matching
            </span>
            <h2 style={{ color: 'var(--ink)' }}>Explore the Mattress Universe</h2>
            <p style={{ color: 'var(--ink-dim)' }}>
              Our model compares your Sleep DNA against every mattress in the catalog to surface the best matches for
              you.
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

      <section className="section match-score-section" id="match-score">
        <AmbientParticles className="ambient-canvas" />
        <div className="wrap match-score-grid">
          <div className="score-ring-wrap">
            <span className="eyebrow-dark" style={{ color: 'var(--cyan-400)' }}>
              Your perfect match
            </span>
            <h2 style={{ color: 'var(--ink)', marginBottom: 22 }}>Match Score</h2>
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
              sub-score, not a fixed animation.
            </p>
          </div>
          <SixDimensionGallery subScores={top ? top.result.subScores : null} />
        </div>

        <div className="wrap" style={{ marginTop: 56 }}>
          <MatchedMattressPanel top={top} />
        </div>
      </section>

      <section className="section" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="wrap">
          <BrandCollabSlot />
          <div style={{ marginTop: 36 }}>
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 14, opacity: 0.7 }}>
              Mattress makers we work with
            </span>
            <BrandMarquee />
          </div>
        </div>
      </section>

      <XRaySection ref={xrayRef} />
    </div>
  );
}
