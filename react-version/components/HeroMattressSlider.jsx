'use client';

import { useEffect, useState } from 'react';

/**
 * Small accessible product-example rotator for the hero.
 * Accepts catalog-derived examples and tolerates missing optional fields.
 */
export default function HeroMattressSlider({ examples = [] }) {
  const items = Array.isArray(examples) ? examples.filter(Boolean).slice(0, 4) : [];
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (items.length < 2) return undefined;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % items.length), 5200);
    return () => window.clearInterval(timer);
  }, [items.length]);

  if (!items.length) return null;
  const item = items[active] || items[0];
  const brand = item.brand || item.brandName || 'Mattress';
  const model = item.model || item.name || item.title || 'Personalized recommendation';
  const score = Number.isFinite(item.score) ? item.score : Number.isFinite(item.matchScore) ? item.matchScore : null;

  return (
    <div className="hero-mattress-slider" aria-live="polite" aria-label="Example mattress recommendations">
      <div className="hero-slider-product">
        <span className="hero-slider-eyebrow">MATCH PREVIEW</span>
        <strong>{brand} {model}</strong>
        <span className="hero-slider-description">A personalized recommendation based on your sleep profile.</span>
        {score !== null && <b className="hero-slider-score">{Math.round(score)}% match</b>}
      </div>
      {items.length > 1 && (
        <div className="hero-slider-dots" role="group" aria-label="Choose mattress preview">
          {items.map((entry, index) => (
            <button key={entry.id || entry.slug || index} type="button" className={`home-slider-dot${index === active ? ' active' : ''}`} aria-label={`Show recommendation ${index + 1}`} aria-pressed={index === active} onClick={() => setActive(index)} />
          ))}
        </div>
      )}
    </div>
  );
}
