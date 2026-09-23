import Link from 'next/link';
import { promoCards } from '@/lib/brandCollab';

const ICONS = {
  snow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2v20M4.9 6l14.2 12M4.9 18 19.1 6M2 12h20" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m12 2 2.9 6.9L22 10l-5.5 5.1L18 22l-6-3.5L6 22l1.5-6.9L2 10l7.1-1.1Z" />
    </svg>
  ),
  gift: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="8" width="18" height="13" rx="1.5" />
      <path d="M3 12h18M12 8v13M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 1 1 0 5" />
    </svg>
  ),
};

/**
 * Every card here is invented placeholder content (see lib/brandCollab
 * .js's promoCards) - none are real offers, brands, or partnerships.
 * Each card carries its own visible "Placeholder - demo content" label
 * rather than relying on surrounding page copy to make that clear.
 */
export default function PromoGrid({ onLight = false }) {
  return (
    <div className="promo-grid">
      {promoCards.map((card) => (
        <div className={`promo-card${onLight ? ' on-light' : ''}`} key={card.id}>
          <span className={`demo-label${onLight ? ' on-light' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 2 3 6v6c0 5.5 3.8 9.7 9 10 5.2-.3 9-4.5 9-10V6Z" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            Placeholder — demo content, not a real offer
          </span>
          <span
            className="promo-icon-wrap"
            style={{ background: `linear-gradient(140deg, ${card.accent.from}, ${card.accent.to})` }}
            aria-hidden="true"
          >
            {ICONS[card.icon]}
          </span>
          <span className="promo-kicker">{card.kicker}</span>
          <h4>{card.title}</h4>
          <p>{card.body}</p>
          <Link href={card.ctaHref} className="promo-cta">
            {card.ctaLabel}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      ))}
    </div>
  );
}
