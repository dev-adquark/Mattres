'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState } from 'react';

// Loaded only client-side, on demand - never part of the initial page
// bundle, and never blocks the hero's real content (headline/CTA) from
// rendering immediately, per the "never let a 3D scene block primary
// page content" requirement.
const LayeredMattressScene = dynamic(() => import('./LayeredMattressScene'), {
  ssr: false,
  loading: () => <div className="hero-3d-fallback" aria-hidden="true" />,
});

/**
 * Full-bleed cinematic hero. The video is decorative and muted by default;
 * the clear primary CTA and category shortcuts keep the first screen easy to use.
 */
export default function Hero({ catalogCount, brandCount }) {
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  return (
    <header className="hero hero-cinematic" id="top">
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
      <div className="hero-cinematic-grain" aria-hidden="true" />
      <div className="wrap hero-cinematic-inner">
        <div className="hero-copy-cinematic">
          <div className="hero-kicker"><span className="hero-live-dot" /> THE ART OF BETTER SLEEP</div>
          <h1>Meet your <em>perfect</em><br />mattress match.</h1>
          <p className="hero-cinematic-lead">Thoughtfully matched to the way you sleep. Discover comfort that feels like it was made just for you.</p>
          <div className="hero-ctas hero-cinematic-actions">
            <Link href="/find-match" className="btn hero-cream-btn">
              Find my mattress <span aria-hidden="true">↗</span>
            </Link>
            <a href="#home-categories" className="hero-text-link">Explore mattresses <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-proof-line">
            <span><b>{catalogCount}+</b> mattresses</span><i />
            <span><b>{brandCount}+</b> trusted brands</span><i />
            <span>Free · No signup</span>
          </div>
        </div>
        <a className="hero-scroll-cue" href="#home-categories" aria-label="Scroll to explore"><span /> Scroll to explore</a>
        <div className="hero-video-status"><span className="hero-live-dot" /> A calmer way to choose</div>

        {!webglUnavailable && (
          <div className="hero-3d-panel">
            <LayeredMattressScene onUnavailable={() => setWebglUnavailable(true)} />
            <span className="hero-3d-caption">Illustrative construction · not a specific product</span>
          </div>
        )}
      </div>
    </header>
  );
}
