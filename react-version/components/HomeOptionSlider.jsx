'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const options = [
  { eyebrow: 'Personalized', title: 'Find your match', copy: 'Answer 6 quick questions and get mattresses scored for your sleep.', href: '/find-match', action: 'Start the quiz', tone: 'match', image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=85', imageAlt: 'Bright bedroom for personalized sleep' },
  { eyebrow: 'Explore', title: 'Shop by mattress type', copy: 'Browse foam, hybrid and innerspring options in one place.', href: '/mattresses', action: 'Explore mattresses', tone: 'browse', image: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=900&q=85', imageAlt: 'Modern bedroom with layered bedding' },
  { eyebrow: 'Compare', title: 'Compare your shortlist', copy: 'See real differences in price, trial period and match scores.', href: '/compare', action: 'Compare mattresses', tone: 'compare', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85', imageAlt: 'Neutral bedroom interior' },
  { eyebrow: 'Transparent', title: 'How scores work', copy: 'Understand the six dimensions behind every recommendation.', href: '/methodology', action: 'See our method', tone: 'method', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=85', imageAlt: 'Thoughtfully designed restful bedroom' },
];

export default function HomeOptionSlider() {
  const trackRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const moveNext = () => {
      if (paused || reducedMotion.matches || track.matches(':hover') || track.contains(document.activeElement)) return;
      const cards = Array.from(track.querySelectorAll('.home-option-card'));
      if (!cards.length) return;
      const next = (activeIndex + 1) % cards.length;
      track.scrollTo({ left: cards[next].offsetLeft - cards[0].offsetLeft, behavior: 'smooth' });
      setActiveIndex(next);
    };
    const timer = window.setInterval(moveNext, 4200);
    return () => window.clearInterval(timer);
  }, [paused, activeIndex]);

  const move = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.querySelectorAll('.home-option-card'));
    const next = (activeIndex + direction + cards.length) % cards.length;
    track.scrollTo({ left: cards[next].offsetLeft - cards[0].offsetLeft, behavior: 'smooth' });
    setActiveIndex(next);
  };

  return (
    <section className="home-options" aria-label="Explore Mattress">
      <div className="home-options-heading">
        <div>
          <span className="eyebrow-dark">A simpler way to shop</span>
          <h2>Where would you like to start?</h2>
        </div>
        <div className="home-slider-controls"><span className="home-slider-hint">Auto-moving · pause by hovering · swipe anytime</span><button type="button" className="home-slider-button" aria-label="Previous options" onClick={() => move(-1)}>←</button><button type="button" className="home-slider-button" aria-label="Next options" onClick={() => move(1)}>→</button><button type="button" className="home-slider-button home-slider-pause" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>{paused ? "Play" : "Pause"}</button></div>
      </div>
      <div className="home-options-track" role="list" ref={trackRef} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
        {options.map((option, index) => (
          <article className={`home-option-card home-option-${option.tone}`} key={option.tone} role="listitem">
            <img className="home-option-image" src={option.image} alt={option.imageAlt} loading="lazy" />
            <span className="home-option-number">0{index + 1}</span>
            <span className="home-option-eyebrow">{option.eyebrow}</span>
            <h3>{option.title}</h3>
            <p>{option.copy}</p>
            <Link href={option.href} className="home-option-link">{option.action}<span aria-hidden="true">↗</span></Link>
          </article>
        ))}
      </div>
    </section>
  );
}
