import Link from 'next/link';
import AmbientParticles from './AmbientParticles';
import DnaHelixScene from './DnaHelixScene';
import SleeperCharacter from './SleeperCharacter';
import catalog from '@/lib/data/mattress-catalog.json';

const brandCount = new Set(catalog.map((m) => m.brand)).size;

export default function Hero() {
  return (
    <header className="hero dot-grid-bg on-dark" id="top">
      <AmbientParticles className="ambient-canvas" />
      <SleeperCharacter placement="hero" />
      <div className="wrap hero-grid">
        <div>
          <span className="eyebrow">
            <span className="dot" />
            Personalized · data-driven
          </span>
          <h1>
            Your <span>Sleep DNA</span>
            <br />
            Finds the Perfect Mattress
          </h1>
          <p className="lead">
            Answer a few questions about your sleep position, body, firmness preference, temperature, motion
            sensitivity and budget — our model turns it into a personalized profile and scores real mattresses
            against it.
          </p>
          <div className="hero-ctas">
            <Link href="/find-match" className="btn btn-primary">
              Start Your Sleep Profile
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
          <div className="trust-row">
            <div className="trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m12 2 2.4 6.9L21 11l-6.6 2.1L12 20l-2.4-6.9L3 11l6.6-2.1z" />
              </svg>
              <span>
                <b>Personalized</b> recommendations
              </span>
            </div>
            <div className="trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
              </svg>
              <span>
                <b>Verified</b> reviews
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
                <b>Best prices</b> &amp; deals
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
        </div>
      </div>

      <div className="hero-stat-row" aria-label="Catalog stats">
        <div className="hero-stat-chip">
          <b>{catalog.length}</b>
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
