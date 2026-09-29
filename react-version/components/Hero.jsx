'use client';

import Link from 'next/link';
import MotionBedroomScene from './MotionBedroomScene';

export default function Hero({ catalogCount = 0 }) {
  return (
    <header className="hero hero-reference" id="top">
      <div className="hero-reference-bg" aria-hidden="true" />
      <div className="hero-reference-inner wrap">
        <div className="hero-reference-copy">
          <div className="hero-reference-kicker"><span>✦</span> AI-POWERED MATCHING</div>
          <h1>Find the Perfect<br/><em>Mattress for You</em></h1>
          <p>Answer a few simple questions and get personalized mattress recommendations based on your sleep style, body type &amp; preferences.</p>
          <Link href="/find-match" className="hero-reference-cta">Find My Mattress <span aria-hidden="true">⟶</span></Link>
          <div className="hero-reference-time"><span aria-hidden="true">◴</span> Takes less than 2 minutes</div>
        </div>
        <MotionBedroomScene />
      </div>
      <div className="hero-reference-benefits">
        <div className="hero-benefit"><span className="hero-benefit-icon blue">♙</span><strong>Personalized Match</strong><p>Get mattress suggestions<br/>based on your unique needs.</p></div>
        <div className="hero-benefit"><span className="hero-benefit-icon green">▤</span><strong>Compare Easily</strong><p>See side-by-side comparisons<br/>of top brands &amp; models.</p></div>
        <div className="hero-benefit"><span className="hero-benefit-icon purple">♧</span><strong>Trusted Reviews</strong><p>Real customer feedback<br/>for better decisions.</p></div>
        <div className="hero-benefit"><span className="hero-benefit-icon blue">☾</span><strong>Better Sleep</strong><p>Wake up refreshed,<br/>every day.</p></div>
      </div>
    </header>
  );
}
