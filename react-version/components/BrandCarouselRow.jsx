'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import BrandMarquee from './BrandMarquee';

export default function BrandCarouselRow({ onLight = false }) {
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);

  function togglePause() {
    setPaused((p) => !p);
  }

  return (
    <div className="marquee-row">
      <div className="marquee-bookend">
        <div>
          <b>Explore mattress types</b>
          <span>Find the right fit for your sleep style</span>
        </div>
        <Link href="/find-match" className="pc-cta" style={{ color: 'var(--cyan-400)' }}>
          Browse
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      <div>
        <div className="marquee-nav-wrap" style={{ marginBottom: 10, justifyContent: 'center' }}>
          <button
            type="button"
            className="marquee-nav-btn"
            onClick={togglePause}
            aria-label={paused ? 'Resume scrolling' : 'Pause scrolling'}
          >
            {paused ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7Z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" />
                <rect x="14" y="5" width="4" height="14" />
              </svg>
            )}
          </button>
        </div>
        <div ref={trackRef} style={{ animationPlayState: paused ? 'paused' : 'running' }}>
          <div className={paused ? 'marquee-paused' : ''}>
            <BrandMarquee onLight={onLight} />
          </div>
        </div>
      </div>

      <div className="marquee-bookend">
        <div>
          <b>Smart sleep technology</b>
          <span>Science-backed comfort, scored live</span>
        </div>
        <Link href="/methodology" className="pc-cta" style={{ color: 'var(--cyan-400)' }}>
          Learn more
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
