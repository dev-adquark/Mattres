'use client';

import { useEffect, useRef, useState } from 'react';
import HeroResultPreview from './HeroResultPreview';

/**
 * `examples` are real result items from matchProfile() (see app/page.js's
 * HERO_EXAMPLE_PROFILE) - the top N real catalog entries scored by the
 * real scoreEngine against one disclosed demo profile, never invented
 * mattresses or scores. Cycles through them the same way
 * HomeOptionSlider does: autoplay paused on hover/focus/hidden-tab/
 * reduced-motion, real dot controls, an aria-live announcement.
 */
export default function HeroMattressSlider({ examples }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!examples || examples.length < 2) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      if (paused || document.hidden) return;
      setIndex((i) => (i + 1) % examples.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [examples, paused]);

  if (!examples || examples.length === 0) return null;
  const active = examples[index];

  return (
    <div
      className="hero-example-slot hero-mattress-slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false); }}
    >
      <HeroResultPreview example={active} />
      {examples.length > 1 && (
        <div className="hero-slider-dots" role="tablist" aria-label="Featured real matches">
          {examples.map((ex, i) => (
            <button
              key={ex.entry.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show ${ex.displayTitle}`}
              className={`home-slider-dot${i === index ? ' active' : ''}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
      <p className="visually-hidden" role="status" aria-live="polite">
        Showing {index + 1} of {examples.length}: {active.displayTitle}, {active.result.overallScore} match
      </p>
    </div>
  );
}
