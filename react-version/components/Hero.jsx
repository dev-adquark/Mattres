import Link from 'next/link';
import AmbientParticles from './AmbientParticles';
import HeroResultPreview from './HeroResultPreview';
import SleeperCharacter from './SleeperCharacter';

/**
 * catalogCount/brandCount come from the real database via a prop chain
 * (app/page.js -> HomeClient -> here) rather than this file importing
 * the static JSON snapshot itself and computing them at module load -
 * Hero is bundled into the client (imported transitively from
 * HomeClient.jsx, a 'use client' file), so it can't call the
 * server-only getCatalog() directly, and a stale static import would
 * silently drift from the real catalog size once entries are added via
 * the database only (e.g. RTINGS auto-enrichment doesn't write back to
 * the JSON snapshot).
 *
 * heroExample is a real matchProfile() result (see app/page.js) rendered
 * by HeroResultPreview - kept out of this file's own markup so the
 * first-fold promise (headline, subhead, one CTA, compact reassurance
 * row) stays the primary content and the example card reads as a
 * secondary, clearly-labeled supporting visual next to it.
 */
export default function Hero({ catalogCount, brandCount, heroExample }) {
  return (
    <header className="hero hero-tight dot-grid-bg on-dark" id="top">
      <AmbientParticles className="ambient-canvas" />
      <SleeperCharacter placement="hero" />
      <div className="wrap hero-grid">
        <div>
          <span className="eyebrow">
            <span className="dot" />
            {catalogCount} mattresses · {brandCount} brands, scored live
          </span>
          <h1>Find the mattress that actually fits you</h1>
          <p className="lead">60-second sleep profile, personalised mattress scores.</p>
          <div className="hero-ctas">
            <Link href="/find-match" className="btn btn-primary">
              Find My Mattress
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
          <div className="trust-row trust-row-compact">
            <div className="trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m12 2 2.4 6.9L21 11l-6.6 2.1L12 20l-2.4-6.9L3 11l6.6-2.1z" />
              </svg>
              <span>
                <b>Personalized</b> to you
              </span>
            </div>
            <div className="trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
              </svg>
              <span>
                <b>Scores can&apos;t be bought</b>
              </span>
            </div>
            <div className="trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="8" width="15" height="9" rx="1.5" />
                <path d="M16 11h3.5L22 14.5V17h-6" />
                <circle cx="6" cy="19" r="1.6" />
                <circle cx="17.5" cy="19" r="1.6" />
              </svg>
              <span>
                <b>Free</b>, no signup
              </span>
            </div>
          </div>
        </div>

        <HeroResultPreview example={heroExample} />
      </div>
    </header>
  );
}
