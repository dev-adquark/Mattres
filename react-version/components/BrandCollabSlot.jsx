import Link from 'next/link';
import SpotlightCard from './SpotlightCard';
import { brandCollab as defaultCollab } from '@/lib/brandCollab';

export default function BrandCollabSlot({ collab = defaultCollab }) {
  if (!collab.active) return null;

  return (
    <SpotlightCard as="div" beam className="collab-card">
      <span className="collab-logo-wrap" aria-hidden="true">
        <span style={{ fontSize: 22, fontWeight: 800 }}>{collab.brandLogoInitial}</span>
      </span>

      <div>
        <span className="collab-eyebrow">
          <span className="dot" />
          {collab.brandName} · Collaboration
        </span>
        <h3>{collab.headline}</h3>
        <p>{collab.body}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <span
          className="collab-art-wrap"
          role="img"
          aria-label={collab.productImageAlt}
          style={{ background: `linear-gradient(140deg, ${collab.accent.from}, ${collab.accent.to})` }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="2" y="12" width="20" height="7" rx="2" />
            <path d="M2 12v-2a3 3 0 0 1 3-3h5" />
            <circle cx="6.5" cy="7" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <Link href={collab.ctaHref} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
          {collab.ctaLabel}
        </Link>
      </div>
    </SpotlightCard>
  );
}
