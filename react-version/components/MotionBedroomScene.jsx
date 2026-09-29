'use client';

import { useEffect, useState } from 'react';

/** Lightweight vector bedroom scene with independent CSS motion layers. */
export default function MotionBedroomScene() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  return (
    <div className={`motion-bedroom${reduced ? ' motion-static' : ''}`} aria-hidden="true">
      <div className="mb-room-light" />
      <div className="mb-window"><span /><span /><span /></div>
      <div className="mb-plant"><i/><i/><i/><i/><b/></div>
      <div className="mb-nightstand"><i/><i/><b/></div>
      <div className="mb-lamp"><i/><b/></div>
      <div className="mb-bed-shadow"/>
      <div className="mb-bed-frame"><i/></div>
      <div className="mb-mattress"><i/><i/><b/></div>
      <div className="mb-pillow mb-pillow-one"/><div className="mb-pillow mb-pillow-two"/>
      <div className="mb-sleeper">
        <div className="mb-hair"/>
        <div className="mb-head"><i/><b/></div>
        <div className="mb-neck"/>
        <div className="mb-shirt"><i/></div>
        <div className="mb-arm mb-arm-left"/>
        <div className="mb-arm mb-arm-right"/>
        <div className="mb-leg mb-leg-one"/><div className="mb-leg mb-leg-two"/>
      </div>
      <div className="mb-score-card">
        <div className="mb-score-title">Your Perfect Match <span>✓</span></div>
        <div className="mb-score-details"><span>☁ &nbsp;Medium Firm</span><span>↕ &nbsp;Back Support</span><span>✳ &nbsp;Cooling Fabric</span></div>
        <div className="mb-score-action">View Details <b>→</b></div>
      </div>
      <div className="mb-spark mb-spark-one">✳</div><div className="mb-spark mb-spark-two">✦</div>
      <div className="mb-scene-caption">A better night's sleep, matched to you</div>
    </div>
  );
}
