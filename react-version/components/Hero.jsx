import Link from 'next/link';
import AmbientParticles from './AmbientParticles';
import DnaHelixScene from './DnaHelixScene';
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
 * by HeroResultPreview - a secondary, clearly-labeled supporting visual
 * shown below the DNA scene, alongside (not instead of) the original
 * Sleep DNA helix visualization and stat row.
 */
export default function Hero({ catalogCount, brandCount, heroExample }) {
  return (
    <header className="hero hero-tight dot-grid-bg on-dark hero-video-shell" id="top">
      <video
        className="hero-bedroom-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=2000&q=85"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="https://videos.pexels.com/video-files/8088572/8088572-hd_1920_1080_25fps.mp4" type="video/mp4" />
      </video>
      <div className="hero-video-shade" aria-hidden="true" />
      <AmbientParticles className="ambient-canvas" />
      <SleeperCharacter placement="hero" />
      <div className="wrap hero-grid">
        <div>
          <span className="eyebrow">
            <span className="dot" />
            {catalogCount} mattresses · {brandCount} brands, scored live
          </span>
          <h1>
            Find the mattress that <span>actually fits you</span>
          </h1>
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

        <div className="dna-scene-wrap">
          <DnaHelixScene scale={1} />
          <div className="dna-label dl-1">
            <span className="dl-dot" />
            <b>Sleep Position</b>
            <i>Side · Back · Stomach</i>
          </div>
          <div className="dna-label dl-2">
            <span className="dl-dot" />
            <b>Body Weight</b>
            <i>Under · Normal · Over</i>
          </div>
          <div className="dna-label dl-3">
            <span className="dl-dot" />
            <b>Temperature</b>
            <i>Hot · Neutral · Cool</i>
          </div>
          <div className="dna-label dl-4">
            <span className="dl-dot" />
            <b>Firmness Preference</b>
            <i>Soft · Medium · Firm</i>
          </div>
          <div className="dna-label dl-5">
            <span className="dl-dot" />
            <b>Motion Sensitivity</b>
            <i>Low · Medium · High</i>
          </div>
          <div className="dna-label dl-6">
            <span className="dl-dot" />
            <b>Budget</b>
            <i>Budget · Mid · Premium</i>
          </div>
          <div className="hero-preview-float">
            <HeroResultPreview example={heroExample} />
          </div>
        </div>
      </div>

      <div className="hero-stat-row" aria-label="Catalog stats">
        <div className="hero-stat-chip">
          <b>{catalogCount}</b>
          <span>mattresses scored live</span>
        </div>
        <div className="hero-stat-chip">
          <b>{brandCount}</b>
          <span>brands in the catalog</span>
        </div>
        <div className="hero-stat-chip">
          <b>6</b>
          <span>real scoring dimensions</span>
        </div>
      </div>
    </header>
  );
}
